<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Deck } from '@deck.gl/core';
	import { IconLayer, LineLayer, ScatterplotLayer } from '@deck.gl/layers';
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

	// Track previous zoom to detect zoom out - initialized lazily on mount
	let previousZoom = $state(4);
	// Zoom threshold below which we request deselection
	const DESELECT_ZOOM_THRESHOLD = 10;

	let container: HTMLDivElement;
	let map: maplibregl.Map | null = null;
	let deck: Deck | null = null;
	let currentZoom = $state(4);
	let mapReady = $state(false);
	let hoveredTowerId = $state<number | null>(null);
	let hoveredTower = $state<TowerSearchDocument | null>(null);
	let tooltipPos = $state<{ x: number; y: number } | null>(null);

	// Pin spreading state - for separating overlapping pins on hover
	let spreadPins = $state<Map<number, [number, number]>>(new Map());
	let spreadCenterId = $state<number | null>(null);
	let spreadDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let spreadCollapseTimer: ReturnType<typeof setTimeout> | null = null;

	const SPREAD_RADIUS_PX = 40; // Spread radius in screen pixels
	const OVERLAP_THRESHOLD_PX = 30; // Distance threshold to consider pins overlapping
	const SPREAD_DEBOUNCE_MS = 80; // Debounce delay for spread calculation
	const SPREAD_COLLAPSE_DELAY_MS = 5000; // Delay before collapsing spread (allows clicking)

	// Hover offset threshold - only offset at zoom levels >= this
	const HOVER_OFFSET_MIN_ZOOM = 14;
	const HOVER_OFFSET_PIXELS = 40; // How many pixels to offset the tooltip dot

	// Two-part pin icon URLs
	const PIN_TOP_URL = '/icons/pin-top.svg';
	const PIN_BOTTOM_URL = '/icons/pin-bottom.svg';

	// Carrier colors - matching carriers.ts for consistency
	const CARRIER_COLORS: Record<string, [number, number, number]> = {
		'AT&T': [0, 168, 224],       // #00a8e0 - Teal/Cyan
		'Verizon': [205, 4, 11],     // #cd040b - Red
		'T-Mobile': [226, 0, 116],   // #e20074 - Magenta
		'US Cellular': [0, 87, 184], // #0057b8 - Blue
		'Dish': [236, 28, 36],       // #ec1c24 - Red
		'FirstNet': [0, 51, 102],    // #003366 - Dark blue
		'Sprint': [255, 225, 0],     // #ffe100 - Yellow
		'Portfolio': [94, 177, 247], // #5EB1F7 - AeroCell Teal
		'Lead': [29, 44, 67],        // #1D2C43 - AeroCell Navy
		default: [107, 114, 128]     // #6b7280 - Gray
	};

	// Transform "Ghost Lead" carrier to appropriate display type
	function getDisplayCarrier(carrier: string | undefined, entityName?: string): string | undefined {
		if (carrier === 'Ghost Lead') {
			// Oncor entities show "Portfolio", others show "Lead"
			if (entityName?.toLowerCase().includes('oncor')) {
				return 'Portfolio';
			}
			return 'Lead';
		}
		return carrier;
	}

	function getCarrierColor(carrier: string | undefined, entityName?: string): [number, number, number] {
		const displayCarrier = getDisplayCarrier(carrier, entityName);
		if (!displayCarrier) return CARRIER_COLORS.default;
		for (const [key, color] of Object.entries(CARRIER_COLORS)) {
			if (displayCarrier.toLowerCase().includes(key.toLowerCase())) {
				return color;
			}
		}
		return CARRIER_COLORS.default;
	}

	// Find pins that overlap with the hovered pin (within screen pixel distance)
	function findOverlappingPins(hoveredId: number): number[] {
		if (!map) return [];

		const hovered = towers.find((t) => t.id === hoveredId);
		if (!hovered) return [];

		const hoveredPoint = map.project([hovered.longitude, hovered.latitude]);
		const overlapping: number[] = [];

		for (const tower of towers) {
			if (tower.id === hoveredId) continue;
			const point = map.project([tower.longitude, tower.latitude]);
			const dx = point.x - hoveredPoint.x;
			const dy = point.y - hoveredPoint.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist < OVERLAP_THRESHOLD_PX) {
				overlapping.push(tower.id);
			}
		}

		return overlapping;
	}

	// Calculate spread positions for overlapping pins in a circular pattern
	function calculateSpreadPositions(
		centerId: number,
		overlappingIds: number[]
	): Map<number, [number, number]> {
		if (!map) return new Map();

		const center = towers.find((t) => t.id === centerId);
		if (!center) return new Map();

		const allIds = [centerId, ...overlappingIds];
		const n = allIds.length;
		const positions = new Map<number, [number, number]>();
		const centerPoint = map.project([center.longitude, center.latitude]);

		for (let i = 0; i < n; i++) {
			const angle = (2 * Math.PI * i) / n - Math.PI / 2; // Start from top
			const offsetX = SPREAD_RADIUS_PX * Math.cos(angle);
			const offsetY = SPREAD_RADIUS_PX * Math.sin(angle);
			const newPoint = map.unproject([centerPoint.x + offsetX, centerPoint.y + offsetY]);
			positions.set(allIds[i], [newPoint.lng, newPoint.lat]);
		}

		return positions;
	}

	// Calculate offset position for active (selected or hovered) tower
	function getOffsetPosition(tower: TowerSearchDocument): [number, number] | null {
		if (!map || currentZoom < HOVER_OFFSET_MIN_ZOOM) {
			return null;
		}

		// Calculate pixel position offset (up and to the right)
		const point = map.project([tower.longitude, tower.latitude]);
		const lngLat = map.unproject([
			point.x + HOVER_OFFSET_PIXELS,
			point.y - HOVER_OFFSET_PIXELS
		]);
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
			// Bottom arc - colored by carrier (hidden when close zoom)
			new IconLayer<TowerSearchDocument>({
				id: 'pin-bottom',
				data: isCloseZoom ? [] : towers,
				pickable: false,
				getIcon: () => ({
					url: PIN_BOTTOM_URL,
					width: 128,
					height: 128,
					anchorY: 112,
					mask: true
				}),
				getPosition: (d) => {
					// Use spread position if this pin is part of a spread cluster
					const spreadPos = spreadPins.get(d.id);
					if (spreadPos) return spreadPos;
					return [d.longitude, d.latitude];
				},
				getSize: (d) => (d.id === hoveredTowerId ? 48 : 40),
				sizeUnits: 'pixels',
				sizeMinPixels: 28,
				sizeMaxPixels: 60,
				getColor: (d) => [...getCarrierColor(d.carrier, d.entity_name), 255],
				billboard: true,
				alphaCutoff: 0.01,
				transitions: {
					getPosition: { duration: 200, easing: (t: number) => t * (2 - t) },
					getSize: { duration: 150, easing: (t: number) => t }
				},
				updateTriggers: {
					getPosition: [spreadCenterId, spreadPins.size],
					getSize: hoveredTowerId
				}
			}),
			// Top part - white circle and stem (hidden when close zoom)
			new IconLayer<TowerSearchDocument>({
				id: 'pin-top',
				data: isCloseZoom ? [] : towers,
				pickable: !isCloseZoom,
				getIcon: () => ({
					url: PIN_TOP_URL,
					width: 128,
					height: 128,
					anchorY: 112,
					mask: false
				}),
				getPosition: (d) => {
					// Use spread position if this pin is part of a spread cluster
					const spreadPos = spreadPins.get(d.id);
					if (spreadPos) return spreadPos;
					return [d.longitude, d.latitude];
				},
				getSize: (d) => (d.id === hoveredTowerId ? 48 : 40),
				sizeUnits: 'pixels',
				sizeMinPixels: 28,
				sizeMaxPixels: 60,
				billboard: true,
				alphaCutoff: 0.01,
				transitions: {
					getPosition: { duration: 200, easing: (t: number) => t * (2 - t) },
					getSize: { duration: 150, easing: (t: number) => t }
				},
				updateTriggers: {
					getPosition: [spreadCenterId, spreadPins.size],
					getSize: hoveredTowerId
				}
			}),
			// White circle markers - shown when zoomed in close
			new ScatterplotLayer<TowerSearchDocument>({
				id: 'towers',
				data: isCloseZoom ? towers : [],
				pickable: isCloseZoom,
				opacity: 1,
				stroked: true,
				filled: true,
				radiusMinPixels: 8,
				radiusMaxPixels: 20,
				lineWidthMinPixels: 2,
				lineWidthMaxPixels: 4,
				getPosition: (d) => {
					if (d.id === activeTowerId) {
						const offset = getOffsetPosition(d);
						if (offset) return offset;
					}
					return [d.longitude, d.latitude];
				},
				getRadius: (d) => (d.id === selectedTowerId ? 14 : 10),
				getFillColor: (d) => {
					if (d.id === selectedTowerId) return [255, 255, 255, 255];
					return [...getCarrierColor(d.carrier, d.entity_name), 255];
				},
				getLineColor: (d) => {
					if (d.id === selectedTowerId) return [59, 130, 246, 255];
					return [255, 255, 255, 200];
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
			// Line from offset point to actual tower location
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
		];

		deck.setProps({ layers });
	}

	// React to data changes - create a unique key from tower IDs to detect array changes
	$effect(() => {
		// Create a fingerprint of the towers array to detect changes
		const towersKey = towers.map((t) => t.id).join(',');
		const _selectedId = selectedTowerId;
		const _hoveredId = hoveredTowerId;
		const _zoom = currentZoom;
		const _spreadCenter = spreadCenterId;
		const _spreadSize = spreadPins.size;
		// Use towersKey in closure to ensure effect re-runs when towers change
		if (towersKey !== undefined) {
			updateLayers();
		}
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
			// Initialize zoom tracking with actual map zoom
			currentZoom = map!.getZoom();
			previousZoom = currentZoom;

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
				onHover: (info: { object?: TowerSearchDocument; x?: number; y?: number }) => {
					if (info.object && 'id' in info.object) {
						hoveredTowerId = info.object.id;
						hoveredTower = info.object;
						tooltipPos = { x: info.x ?? 0, y: info.y ?? 0 };

						// Cancel any pending collapse - we're still on pins
						if (spreadCollapseTimer) {
							clearTimeout(spreadCollapseTimer);
							spreadCollapseTimer = null;
						}

						// Skip recalculation if this pin is already part of current spread
						if (spreadPins.has(info.object.id)) {
							return;
						}

						// Clear any pending spread calculation
						if (spreadDebounceTimer) {
							clearTimeout(spreadDebounceTimer);
						}

						// Debounce spread calculation
						const hoveredId = info.object.id;
						spreadDebounceTimer = setTimeout(() => {
							const overlapping = findOverlappingPins(hoveredId);
							if (overlapping.length > 0) {
								spreadCenterId = hoveredId;
								spreadPins = calculateSpreadPositions(hoveredId, overlapping);
							} else if (spreadPins.size > 0) {
								spreadPins = new Map();
								spreadCenterId = null;
							}
						}, SPREAD_DEBOUNCE_MS);
					} else {
						hoveredTowerId = null;
						hoveredTower = null;
						tooltipPos = null;
						if (spreadDebounceTimer) {
							clearTimeout(spreadDebounceTimer);
							spreadDebounceTimer = null;
						}
						// Delay collapse so user can move between spread pins
						if (spreadPins.size > 0 && !spreadCollapseTimer) {
							spreadCollapseTimer = setTimeout(() => {
								spreadPins = new Map();
								spreadCenterId = null;
								spreadCollapseTimer = null;
							}, SPREAD_COLLAPSE_DELAY_MS);
						}
					}
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
		if (spreadDebounceTimer) clearTimeout(spreadDebounceTimer);
		if (spreadCollapseTimer) clearTimeout(spreadCollapseTimer);
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

	{#if hoveredTower && tooltipPos}
		{@const w = container?.clientWidth || 800}
		{@const h = container?.clientHeight || 600}
		{@const tooltipW = 250}
		{@const tooltipH = 100}
		{@const nearRight = tooltipPos.x > w - tooltipW - 50}
		{@const nearBottom = tooltipPos.y > h - tooltipH - 30}
		{@const left = nearRight ? tooltipPos.x - tooltipW - 30 : tooltipPos.x + 30}
		{@const top = nearBottom ? tooltipPos.y - tooltipH - 20 : tooltipPos.y + 20}
		<div
			class="custom-tooltip"
			style="left: {Math.max(10, Math.min(left, w - tooltipW - 10))}px; top: {Math.max(10, Math.min(top, h - tooltipH - 10))}px;"
		>
			<div class="tooltip-address">{hoveredTower.address || 'No address'}</div>
			<div class="tooltip-location">{[hoveredTower.city, hoveredTower.state].filter(Boolean).join(', ')}</div>
			{#if hoveredTower.entity_name}
				<div class="tooltip-entity">{hoveredTower.entity_name}</div>
			{/if}
			{#if hoveredTower.carrier}
				<div class="tooltip-carrier">{hoveredTower.carrier}</div>
			{/if}
		</div>
	{/if}
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
		background-color: #1a2636;
		border: 1px solid #3d4f63;
	}

	.map-container :global(.maplibregl-ctrl-group button) {
		background-color: #1a2636;
		border-color: #3d4f63;
	}

	.map-container :global(.maplibregl-ctrl-group button:hover) {
		background-color: #2d3e52;
	}

	.map-container :global(.maplibregl-ctrl-group button + button) {
		border-top-color: #3d4f63;
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
		background-color: rgba(26, 38, 54, 0.95);
		border: 1px solid #3d4f63;
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		color: #e2e8f0;
		z-index: 5;
	}

	.custom-tooltip {
		position: absolute;
		background-color: #1e1e2e;
		color: #f4f4f5;
		border: 1px solid #3b3b50;
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		padding: 10px;
		z-index: 1000;
		pointer-events: none;
		min-width: 180px;
		max-width: 250px;
	}

	.tooltip-address {
		font-weight: 600;
		margin-bottom: 4px;
	}

	.tooltip-location {
		font-size: 12px;
		color: #a1a1aa;
	}

	.tooltip-entity {
		font-size: 12px;
		color: #71717a;
		margin-top: 4px;
	}

	.tooltip-carrier {
		font-size: 11px;
		color: #3b82f6;
		margin-top: 4px;
	}
</style>
