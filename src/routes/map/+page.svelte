<script lang="ts">
	import { onMount } from 'svelte';
	import TowerList from '$lib/components/TowerList.svelte';
	import ClientDeckGLMap from '$lib/components/ClientDeckGLMap.svelte';
	import type { TowerSearchDocument } from '$lib/server/meilisearch';
	import type { CompanyTower } from '$lib/types';

	let { data } = $props();

	// State
	let searchQuery = $state('');
	let allTowers = $state<TowerSearchDocument[]>([]); // All towers for the map and list
	let selectedTower = $state<TowerSearchDocument | null>(null);
	let selectedTowerDetails = $state<CompanyTower | null>(null);
	let loading = $state(false);
	let listLoading = $state(false);
	let detailsLoading = $state(false);
	let total = $state(0);

	const companyId = data.session?.user?.companyId;

	// Initial view state
	let initialView = $state({ latitude: 39.8283, longitude: -98.5795, zoom: 4 });
	let initialBounds = $state<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);

	// Map component reference
	let mapComponent: ClientDeckGLMap;
	let hasFittedBounds = $state(false);

	// Fit map to all tower points once towers are loaded and map is ready
	$effect(() => {
		if (allTowers.length > 0 && mapComponent && !hasFittedBounds && !loading) {
			const bounds = calculateBounds(allTowers);
			initialBounds = bounds;
			setTimeout(() => {
				mapComponent.fitBounds(bounds, 60);
				hasFittedBounds = true;
			}, 100);
		}
	});

	async function handleSearch(query: string) {
		if (!companyId) return;

		searchQuery = query;
		listLoading = true;

		// Clear selection when searching
		selectedTower = null;
		selectedTowerDetails = null;

		try {
			// Load ALL matching towers for the map and list
			const response = await fetch('/api/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: query || '*',
					type: 'towers',
					limit: 10000, // Get all matching towers
					offset: 0
				})
			});

			const result = await response.json();
			allTowers = result.hits || [];
			total = result.total || 0;
		} catch (err) {
			console.error('Search failed:', err);
		} finally {
			listLoading = false;
		}
	}

	async function handleTowerSelect(tower: TowerSearchDocument) {
		// Toggle selection if clicking the same tower
		if (selectedTower?.id === tower.id) {
			selectedTower = null;
			selectedTowerDetails = null;
			// Zoom out to show all towers when deselecting
			zoomToAllTowers();
			return;
		}

		selectedTower = tower;

		// Load full details from GraphQL
		detailsLoading = true;
		try {
			const response = await fetch('/api/tower/' + tower.id);
			if (response.ok) {
				const result = await response.json();
				selectedTowerDetails = result.tower;
			}
		} catch (err) {
			console.error('Failed to load tower details:', err);
		} finally {
			detailsLoading = false;
		}
	}

	function handleDeselect() {
		selectedTower = null;
		selectedTowerDetails = null;
	}

	function zoomToAllTowers() {
		if (!mapComponent) return;

		// Use stored bounds or calculate from all towers
		const bounds = initialBounds || (allTowers.length > 0 ? calculateBounds(allTowers) : null);
		if (bounds) {
			mapComponent.fitBounds(bounds, 60);
		}
	}

	function handleResetZoom() {
		// Deselect any selected tower when zooming out
		handleDeselect();
		// Zoom to show all towers
		zoomToAllTowers();
	}

	function calculateBounds(towerList: TowerSearchDocument[]): {
		minLat: number;
		maxLat: number;
		minLng: number;
		maxLng: number;
	} {
		if (towerList.length === 0) {
			return { minLat: 25, maxLat: 50, minLng: -125, maxLng: -65 }; // Default US bounds
		}

		const lats = towerList.map((t) => t.latitude);
		const lngs = towerList.map((t) => t.longitude);

		return {
			minLat: Math.min(...lats),
			maxLat: Math.max(...lats),
			minLng: Math.min(...lngs),
			maxLng: Math.max(...lngs)
		};
	}

	async function loadInitialTowers() {
		if (!companyId) return;

		loading = true;
		try {
			// Load ALL towers for the map and list
			const allTowersResponse = await fetch('/api/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: '*',
					type: 'towers',
					limit: 10000, // Get all towers
					offset: 0
				})
			});

			const allResult = await allTowersResponse.json();
			allTowers = allResult.hits || [];
			total = allResult.total || 0;
		} catch (err) {
			console.error('Failed to load initial towers:', err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadInitialTowers();
	});
</script>

<div class="dashboard">
	<div class="main-content">
		<aside class="tower-sidebar">
			<TowerList
				towers={allTowers}
				selectedTowerId={selectedTower?.id ?? null}
				onSelect={handleTowerSelect}
				loading={listLoading || loading}
				{total}
				{searchQuery}
				onSearch={handleSearch}
				expandedTowerDetails={selectedTowerDetails}
				{detailsLoading}
			/>
		</aside>

		<main class="map-section">
			<ClientDeckGLMap
				bind:this={mapComponent}
				towers={allTowers}
				selectedTowerId={selectedTower?.id ?? null}
				onTowerSelect={handleTowerSelect}
				onDeselectRequest={handleDeselect}
				{initialView}
				{loading}
				totalTowers={total}
			/>

			<!-- Reset zoom button -->
			<button class="reset-zoom-btn" onclick={handleResetZoom} aria-label="Reset zoom to show all towers">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M3 7V5a2 2 0 0 1 2-2h2"/>
					<path d="M17 3h2a2 2 0 0 1 2 2v2"/>
					<path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
					<path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
					<circle cx="12" cy="12" r="3"/>
				</svg>
			</button>
		</main>
	</div>
</div>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		height: calc(100vh - 57px); /* Subtract header height */
		overflow: hidden;
	}

	.main-content {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	.tower-sidebar {
		width: 380px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.map-section {
		flex: 1;
		position: relative;
	}

	.reset-zoom-btn {
		position: absolute;
		top: 10px;
		left: 10px;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background-color: #1e1e2e;
		border: 1px solid #3b3b50;
		border-radius: 0.5rem;
		color: #a1a1aa;
		cursor: pointer;
		transition: all 0.15s;
	}

	.reset-zoom-btn:hover {
		background-color: #27273a;
		color: #f4f4f5;
		border-color: #f4f4f5;
	}

	/* Responsive adjustments */
	@media (max-width: 1024px) {
		.tower-sidebar {
			width: 320px;
		}
	}

	@media (max-width: 768px) {
		.main-content {
			flex-direction: column;
		}

		.tower-sidebar {
			width: 100%;
			height: 350px;
			order: 2;
		}

		.map-section {
			order: 1;
			min-height: 300px;
		}
	}
</style>
