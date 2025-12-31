<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Deck } from '@deck.gl/core';
	import { ScatterplotLayer, LineLayer } from '@deck.gl/layers';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { TowerSearchDocument } from '$lib/server/meilisearch';

	interface Props {
		towers: TowerSearchDocument[];
		selectedTowerId: number | null;
		onTowerSelect: (tower: TowerSearchDocument) => void;
		onBoundsChange?: (bounds: {
			minLat: number;
			maxLat: number;
			minLng: number;
			maxLng: number;
			zoom: number;
		}) => void;
		onDeselectRequest?: () => void;
		initialView?: {
			latitude: number;
			longitude: number;
			zoom: number;
		};
		loading?: boolean;
		totalTowers?: number;
	}

	let {
		towers,
		selectedTowerId,
		onTowerSelect,
		onBoundsChange,
		onDeselectRequest,
		initialView = { latitude: 39.8283, longitude: -98.5795, zoom: 4 },
		loading = false,
		totalTowers
	}: Props = $props();

	// Display count - use totalTowers if provided, otherwise use towers array length
	const displayCount = $derived(totalTowers ?? towers.length);

	// Track previous zoom to detect zoom out
	let previousZoom = $state(initialView.zoom);
	// Zoom threshold below which we request deselection
	const DESELECT_ZOOM_THRESHOLD = 10;

	let container: HTMLDivElement;
	let map: maplibregl.Map | null = null;
	let deck: Deck | null = null;
	let currentZoom = $state(initialView.zoom);
	let mapReady = $state(false);
	let hoveredTowerId = $state<number | null>(null);

	// Hover offset threshold - only offset at zoom levels >= this
	const HOVER_OFFSET_MIN_ZOOM = 14;
	const HOVER_OFFSET_PIXELS = 40; // How many pixels to offset the tooltip dot

	// Carrier colors - brighter for visibility on satellite imagery
	const CARRIER_COLORS: Record<string, [number, number, number]> = {
		'AT&T': [0, 190, 255],      // Bright cyan
		'Verizon': [255, 50, 50],    // Bright red
		'T-Mobile': [255, 0, 150],   // Magenta
		'US Cellular': [50, 130, 255], // Blue
		'Dish': [255, 100, 50],      // Orange
		'FirstNet': [50, 150, 255],  // Light blue
		'American Tower': [255, 200, 50], // Gold
		'Crown Castle': [150, 100, 255], // Purple
		'Ghost Lead': [180, 180, 180], // Gray for unconfirmed
		default: [255, 255, 100]     // Yellow default for visibility
	};

	function getCarrierColor(carrier: string | undefined): [number, number, number] {
		if (!carrier) return CARRIER_COLORS.default;
		for (const [key, color] of Object.entries(CARRIER_COLORS)) {
			if (carrier.toLowerCase().includes(key.toLowerCase())) {
				return color;
			}
		}
		return CARRIER_COLORS.default;
	}

	// Calculate offset position for active (selected or hovered) tower
	function getOffsetPosition(tower: TowerSearchDocument): [number, number] | null {
		if (!map || currentZoom < HOVER_OFFSET_MIN_ZOOM) {
			return null;
		}

		// Calculate pixel position offset (up and to the right)
		const point = map.project([tower.longitude, tower.latitude]);
		const offsetPoint = {
			x: point.x + HOVER_OFFSET_PIXELS,
			y: point.y - HOVER_OFFSET_PIXELS
		};
		const lngLat = map.unproject(offsetPoint);
		return [lngLat.lng, lngLat.lat];
	}

	function updateLayers() {
		if (!deck || !mapReady) return;

		// At close zoom, when SELECTED (not hovered), the main point moves out of the way
		// and a line points to the actual tower location
		const isCloseZoom = currentZoom >= HOVER_OFFSET_MIN_ZOOM;

		// Only the selected tower triggers the offset behavior, not hover
		const activeTowerId = selectedTowerId;
		const activeTower = activeTowerId ? towers.find(t => t.id === activeTowerId) : null;

		// Calculate line data for active tower at close zoom
		const lineData: { source: [number, number]; target: [number, number]; color: [number, number, number, number] }[] = [];

		if (activeTower && isCloseZoom) {
			const offsetPos = getOffsetPosition(activeTower);
			if (offsetPos) {
				lineData.push({
					source: [activeTower.longitude, activeTower.latitude],
					target: offsetPos,
					color: [255, 255, 255, 180]
				});
			}
		}

		const layers = [
			// Outer glow/border layer for better visibility
			new ScatterplotLayer<TowerSearchDocument>({
				id: 'towers-glow',
				data: towers,
				pickable: false,
				opacity: 0.6,
				stroked: false,
				filled: true,
				radiusScale: 1,
				radiusMinPixels: 14,
				radiusMaxPixels: 28,
				getPosition: (d) => {
					// If this tower is active (selected or hovered) at close zoom, move glow to offset position
					if (d.id === activeTowerId && isCloseZoom) {
						const offset = getOffsetPosition(d);
						if (offset) return offset;
					}
					return [d.longitude, d.latitude];
				},
				getRadius: (d) => (d.id === selectedTowerId ? 20 : 14),
				getFillColor: (d) => {
					if (d.id === selectedTowerId) {
						return [59, 130, 246, 150]; // Blue glow for selected
					}
					return [0, 0, 0, 120]; // Dark glow for contrast
				},
				updateTriggers: {
					getRadius: selectedTowerId,
					getFillColor: selectedTowerId,
					getPosition: [activeTowerId, currentZoom]
				}
			}),
			// Main tower points - these move when active (selected or hovered) at close zoom
			new ScatterplotLayer<TowerSearchDocument>({
				id: 'towers',
				data: towers,
				pickable: true,
				opacity: 1,
				stroked: true,
				filled: true,
				radiusScale: 1,
				radiusMinPixels: 8,
				radiusMaxPixels: 20,
				lineWidthMinPixels: 2,
				lineWidthMaxPixels: 4,
				getPosition: (d) => {
					// If this tower is active at close zoom, move it to offset position
					if (d.id === activeTowerId && isCloseZoom) {
						const offset = getOffsetPosition(d);
						if (offset) return offset;
					}
					return [d.longitude, d.latitude];
				},
				getRadius: (d) => (d.id === selectedTowerId ? 14 : 10),
				getFillColor: (d) => {
					if (d.id === selectedTowerId) {
						return [255, 255, 255, 255]; // White for selected
					}
					return [...getCarrierColor(d.carrier), 255];
				},
				getLineColor: (d) => {
					if (d.id === selectedTowerId) {
						return [59, 130, 246, 255]; // Blue border for selected
					}
					return [255, 255, 255, 200]; // White border for visibility
				},
				getLineWidth: (d) => (d.id === selectedTowerId ? 3 : 2),
				updateTriggers: {
					getRadius: selectedTowerId,
					getFillColor: selectedTowerId,
					getLineColor: selectedTowerId,
					getLineWidth: selectedTowerId,
					getPosition: [activeTowerId, currentZoom]
				}
			}),
			// Line from offset point back to actual tower location
			new LineLayer({
				id: 'hover-lines',
				data: lineData,
				pickable: false,
				getSourcePosition: (d: typeof lineData[0]) => d.source,
				getTargetPosition: (d: typeof lineData[0]) => d.target,
				getColor: (d: typeof lineData[0]) => d.color,
				getWidth: 2,
				widthUnits: 'pixels'
			}),
			// No marker at the actual tower location - just the line points to it
		];

		deck.setProps({ layers });
	}

	// React to data changes
	$effect(() => {
		towers;
		selectedTowerId;
		hoveredTowerId;
		currentZoom;
		updateLayers();
	});

	// Fly to selected tower with more zoom
	$effect(() => {
		if (selectedTowerId && map) {
			const tower = towers.find((t) => t.id === selectedTowerId);
			if (tower) {
				map.flyTo({
					center: [tower.longitude, tower.latitude],
					zoom: Math.max(currentZoom, 16), // Zoom to level 16 minimum
					duration: 400 // Faster animation
				});
			}
		}
	});

	function reportBounds() {
		if (!map || !onBoundsChange) return;

		const bounds = map.getBounds();
		onBoundsChange({
			minLat: bounds.getSouth(),
			maxLat: bounds.getNorth(),
			minLng: bounds.getWest(),
			maxLng: bounds.getEast(),
			zoom: map.getZoom()
		});
	}

	onMount(() => {
		// Initialize MapLibre with satellite imagery
		map = new maplibregl.Map({
			container,
			style: {
				version: 8,
				sources: {
					'esri-satellite': {
						type: 'raster',
						tiles: [
							'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
						],
						tileSize: 256,
						attribution: '&copy; Esri',
						maxzoom: 19
					}
				},
				layers: [
					{
						id: 'satellite-layer',
						type: 'raster',
						source: 'esri-satellite',
						minzoom: 0,
						maxzoom: 22
					}
				]
			},
			center: [initialView.longitude, initialView.latitude],
			zoom: initialView.zoom,
			maxZoom: 20
		});

		map.on('load', () => {
			mapReady = true;

			// Initialize deck.gl
			deck = new Deck({
				parent: container,
				style: { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', zIndex: '1', pointerEvents: 'none' },
				pickingRadius: 5,
				initialViewState: {
					longitude: initialView.longitude,
					latitude: initialView.latitude,
					zoom: initialView.zoom,
					pitch: 0,
					bearing: 0
				},
				controller: false,
				layers: [],
				onHover: (info: { object?: TowerSearchDocument }) => {
					if (info.object && 'id' in info.object) {
						hoveredTowerId = info.object.id;
					} else {
						hoveredTowerId = null;
					}
				},
				getTooltip: ({ object, x, y }: { object?: TowerSearchDocument; x?: number; y?: number }) => {
					if (!object) return null;

					// Get container dimensions to avoid tooltip going off-screen
					const containerWidth = container?.clientWidth || 800;
					const containerHeight = container?.clientHeight || 600;
					const tooltipWidth = 250;
					const tooltipHeight = 100;

					// Determine if tooltip should flip based on position
					const flipX = x && x > containerWidth - tooltipWidth - 50;
					const flipY = y && y < tooltipHeight + 50;

					return {
						html: `
							<div style="padding: 8px; max-width: 250px;">
								<div style="font-weight: 600; margin-bottom: 4px;">
									${object.address || 'No address'}
								</div>
								<div style="font-size: 12px; color: #a1a1aa;">
									${[object.city, object.state].filter(Boolean).join(', ')}
								</div>
								${object.entity_name ? `<div style="font-size: 12px; color: #71717a; margin-top: 4px;">${object.entity_name}</div>` : ''}
								${object.carrier ? `<div style="font-size: 11px; color: #3b82f6; margin-top: 4px;">${object.carrier}</div>` : ''}
							</div>
						`,
						style: {
							backgroundColor: '#1e1e2e',
							color: '#f4f4f5',
							border: '1px solid #3b3b50',
							borderRadius: '6px',
							boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
							transform: `translate(${flipX ? '-110%' : '10px'}, ${flipY ? '10px' : '-100%'})`
						}
					};
				}
			});

			updateLayers();
			reportBounds();
		});

		// Sync deck.gl view with MapLibre movements
		map.on('move', () => {
			if (!map || !deck) return;

			const { lng, lat } = map.getCenter();
			const zoom = map.getZoom();
			const pitch = map.getPitch();
			const bearing = map.getBearing();

			// Detect zoom out past threshold and request deselection
			if (selectedTowerId && zoom < DESELECT_ZOOM_THRESHOLD && previousZoom >= DESELECT_ZOOM_THRESHOLD) {
				onDeselectRequest?.();
			}
			previousZoom = zoom;
			currentZoom = zoom;

			deck.setProps({
				viewState: {
					longitude: lng,
					latitude: lat,
					zoom,
					pitch,
					bearing
				}
			});
		});

		map.on('moveend', reportBounds);

		// Cancel any ongoing animations when user starts interacting
		map.on('mousedown', () => {
			map?.stop();
		});
		map.on('touchstart', () => {
			map?.stop();
		});
		map.on('wheel', () => {
			map?.stop();
		});

		// Handle clicks - query deck.gl for picked objects
		map.on('click', (e) => {
			if (!deck) return;
			const picked = deck.pickObject({
				x: e.point.x,
				y: e.point.y,
				radius: 10
			});
			if (picked?.object && 'latitude' in picked.object && 'longitude' in picked.object) {
				onTowerSelect(picked.object as TowerSearchDocument);
			}
		});

		// Add navigation controls
		map.addControl(new maplibregl.NavigationControl(), 'top-right');
	});

	onDestroy(() => {
		deck?.finalize();
		map?.remove();
	});

	// Public method to fly to location
	export function flyTo(lat: number, lng: number, zoom: number = 16) {
		map?.flyTo({
			center: [lng, lat],
			zoom,
			duration: 400 // Faster
		});
	}

	// Public method to fit bounds
	export function fitBounds(
		bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
		padding: number = 50
	) {
		map?.fitBounds(
			[
				[bounds.minLng, bounds.minLat],
				[bounds.maxLng, bounds.maxLat]
			],
			{ padding, duration: 400 } // Faster
		);
	}
</script>

<div class="map-container" bind:this={container}>
	{#if loading}
		<div class="loading-overlay">
			<div class="spinner"></div>
			<span>Loading towers...</span>
		</div>
	{/if}

	<div class="map-stats">
		<span>{displayCount.toLocaleString()} towers</span>
	</div>
</div>

<style>
	.map-container {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 400px;
		background-color: #0f0f1a;
	}

	.map-container :global(.maplibregl-canvas) {
		outline: none;
	}

	.map-container :global(.maplibregl-ctrl-group) {
		background-color: #1e1e2e;
		border: 1px solid #3b3b50;
	}

	.map-container :global(.maplibregl-ctrl-group button) {
		background-color: #1e1e2e;
		border-color: #3b3b50;
	}

	.map-container :global(.maplibregl-ctrl-group button:hover) {
		background-color: #27273a;
	}

	.map-container :global(.maplibregl-ctrl-group button + button) {
		border-top-color: #3b3b50;
	}

	.map-container :global(.maplibregl-ctrl-icon) {
		filter: invert(1);
	}

	.loading-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(15, 15, 26, 0.8);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		z-index: 10;
		color: #a1a1aa;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #3b3b50;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.map-stats {
		position: absolute;
		bottom: 1rem;
		left: 1rem;
		background-color: rgba(30, 30, 46, 0.9);
		border: 1px solid #3b3b50;
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		color: #a1a1aa;
		z-index: 5;
	}
</style>
