<script lang="ts">
	import { slide, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { TowerSearchDocument } from '$lib/server/meilisearch';
	import type { CompanyTower } from '$lib/types';
	import { normalizeCarrierName } from '$lib/carriers';
	import ContactSalesModal from './ContactSalesModal.svelte';
	import LockedSection from './LockedSection.svelte';

	interface Props {
		towers: TowerSearchDocument[];
		selectedTowerId: number | null;
		onSelect: (tower: TowerSearchDocument) => void;
		loading?: boolean;
		total?: number;
		searchQuery?: string;
		onSearch?: (query: string) => void;
		onFilterChange?: (filteredTowers: TowerSearchDocument[]) => void;
		expandedTowerDetails?: CompanyTower | null;
		detailsLoading?: boolean;
	}

	let {
		towers,
		selectedTowerId,
		onSelect,
		loading = false,
		total = 0,
		searchQuery = '',
		onSearch,
		onFilterChange,
		expandedTowerDetails = null,
		detailsLoading = false
	}: Props = $props();

	let localSearchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout>;
	let showFilters = $state(false);
	let carrierFilter = $state<string>('');
	let entityFilter = $state<string>('');
	let listContentRef: HTMLDivElement;
	let showContactModal = $state(false);

	function openContactModal() {
		showContactModal = true;
	}

	function closeContactModal() {
		showContactModal = false;
	}

	// Custom smooth scroll with controllable duration
	function smoothScrollTo(element: Element, duration: number = 600) {
		const container = listContentRef;
		if (!container) return;

		const targetTop = element.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
		const startTop = container.scrollTop;
		const distance = targetTop - startTop;
		const startTime = performance.now();

		function step(currentTime: number) {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			// Ease-out cubic for smooth deceleration
			const easeOut = 1 - Math.pow(1 - progress, 3);
			container.scrollTop = startTop + distance * easeOut;
			if (progress < 1) requestAnimationFrame(step);
		}
		requestAnimationFrame(step);
	}

	// Handle tower selection and scroll into view
	function handleTowerClick(tower: TowerSearchDocument) {
		const wasExpanded = isExpanded(tower);
		onSelect(tower);

		// Only scroll if we're expanding (not collapsing)
		// Wait for expand animation to fully complete, then scroll
		if (!wasExpanded) {
			setTimeout(() => {
				const wrapper = listContentRef?.querySelector(`[data-tower-id="${tower.id}"]`);
				if (wrapper) {
					smoothScrollTo(wrapper, 600);
				}
			}, 550);
		}
	}

	// Extract unique carriers and entities from towers for filter dropdowns
	const uniqueCarriers = $derived(() => {
		const carriers = new Set<string>();
		towers.forEach((t) => {
			// Add all provider names if available
			if (t.provider_names && t.provider_names.length > 0) {
				t.provider_names.forEach((name) => carriers.add(name));
			} else {
				// Fall back to carrier label
				const label = getCarrierLabel(t);
				if (label) carriers.add(label);
			}
		});
		return Array.from(carriers).sort();
	});

	const uniqueEntities = $derived(() => {
		const entities = new Set<string>();
		towers.forEach((t) => {
			if (t.entity_name) entities.add(t.entity_name);
		});
		return Array.from(entities).sort();
	});

	// Check if tower has a specific carrier
	function towerHasCarrier(tower: TowerSearchDocument, carrier: string): boolean {
		if (tower.provider_names && tower.provider_names.length > 0) {
			return tower.provider_names.includes(carrier);
		}
		// Fall back to carrier label
		return getCarrierLabel(tower) === carrier;
	}

	// Filter towers based on selected filters
	const filteredTowers = $derived(() => {
		return towers.filter((tower) => {
			if (carrierFilter) {
				if (!towerHasCarrier(tower, carrierFilter)) return false;
			}
			if (entityFilter) {
				if (tower.entity_name !== entityFilter) return false;
			}
			return true;
		});
	});

	const activeFilterCount = $derived((carrierFilter ? 1 : 0) + (entityFilter ? 1 : 0));

	// Notify parent when filters change so map can update
	$effect(() => {
		const filtered = filteredTowers();
		onFilterChange?.(filtered);
	});

	function clearFilters() {
		carrierFilter = '';
		entityFilter = '';
	}

	function handleCarrierChange(e: Event) {
		carrierFilter = (e.target as HTMLSelectElement).value;
	}

	function handleEntityChange(e: Event) {
		entityFilter = (e.target as HTMLSelectElement).value;
	}

	// Debounced search
	function handleSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			onSearch?.(localSearchQuery.trim());
		}, 250);
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			clearTimeout(searchTimeout);
			onSearch?.(localSearchQuery.trim());
		} else if (e.key === 'Escape') {
			localSearchQuery = '';
			onSearch?.('');
		}
	}

	function clearSearch() {
		localSearchQuery = '';
		onSearch?.('');
	}

	function formatAddress(tower: TowerSearchDocument): string {
		const parts = [tower.address, tower.city, tower.state, tower.zip_code].filter(Boolean);
		if (parts.length > 0) {
			return parts.join(', ');
		}
		// Fall back to nicely formatted lat/long
		const lat = tower.latitude?.toFixed(5);
		const lng = tower.longitude?.toFixed(5);
		if (lat && lng) {
			return `${lat}°, ${lng}°`;
		}
		return 'Unknown location';
	}

	function getAccessStateColor(state: string): string {
		switch (state) {
			case 'FULL':
				return '#22c55e';
			case 'LICENSED':
				return '#5EB1F7';
			case 'TRIAL':
				return '#f59e0b';
			case 'Portfolio':
				return '#5EB1F7'; // Teal for portfolio
			case 'Ghost Lead':
				return '#0a1628'; // AeroCell navy for ghost leads
			case 'SAMPLE':
				return 'rgba(255, 255, 255, 0.5)';
			default:
				return 'rgba(255, 255, 255, 0.5)';
		}
	}

	function getAccessStateLabel(tower: TowerSearchDocument): string {
		const states = Object.values(tower.access_states || {});
		const state = states[0] || 'SAMPLE';
		// Show "Portfolio" for Ghost Lead towers only if entity is Oncor
		if (state === 'Ghost Lead') {
			if (tower.entity_name?.toLowerCase().includes('oncor')) {
				return 'Portfolio';
			}
			return 'Ghost Lead';
		}
		return state;
	}

	// Carrier colors for badges
	const CARRIER_COLORS: Record<string, { bg: string; text: string }> = {
		'AT&T': { bg: '#0077c8', text: 'white' },
		'Verizon': { bg: '#cd040b', text: 'white' },
		'T-Mobile': { bg: '#e20074', text: 'white' },
		'Sprint': { bg: '#ffe100', text: 'black' },
		'US Cellular': { bg: '#0057b8', text: 'white' },
		'Dish': { bg: '#ec1c24', text: 'white' },
		'FirstNet': { bg: '#0067ac', text: 'white' },
		'American Tower': { bg: '#000000', text: 'white' },
		'Crown Castle': { bg: '#5EB1F7', text: 'white' },
		'Portfolio': { bg: '#5EB1F7', text: 'white' },
		'Ghost Lead': { bg: '#0a1628', text: 'white' }
	};

	function getCarrierStyle(carrier: string | undefined): { bg: string; text: string } {
		if (!carrier) return { bg: '#3d4f63', text: 'rgba(255, 255, 255, 0.7)' };
		// Normalize carrier name (e.g., "AMT" -> "American Tower")
		const normalized = normalizeCarrierName(carrier);
		// Special case for Portfolio
		if (normalized === 'Portfolio') {
			return { bg: '#5EB1F7', text: 'white' }; // Teal for portfolio
		}
		for (const [key, style] of Object.entries(CARRIER_COLORS)) {
			if (normalized.toLowerCase().includes(key.toLowerCase())) {
				return style;
			}
		}
		return { bg: '#3d4f63', text: '#FFFFFF' };
	}

	// Transform provider/carrier name for display
	// - "Ghost Lead" becomes "Portfolio" for Oncor entities
	// - "AMT" becomes "American Tower"
	function getDisplayProviderName(providerName: string, entityName?: string): string {
		if (providerName === 'Ghost Lead') {
			// Oncor entities show "Portfolio", others show "Ghost Lead"
			if (entityName?.toLowerCase().includes('oncor')) {
				return 'Portfolio';
			}
			return 'Ghost Lead';
		}
		return normalizeCarrierName(providerName);
	}

	// Get the display carrier label - shows "Portfolio" for Oncor entities, "Ghost Lead" for other Ghost Leads
	function getCarrierLabel(tower: TowerSearchDocument): string | undefined {
		// If entity name is Oncor, show "Portfolio" instead of carrier
		if (tower.entity_name?.toLowerCase().includes('oncor')) {
			return 'Portfolio';
		}
		// Keep "Ghost Lead" as is
		return tower.carrier;
	}

	function formatPhone(phone: string | undefined): string {
		if (!phone) return '';
		const digits = phone.replace(/\D/g, '');
		if (digits.length === 10) {
			return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
		}
		return phone;
	}

	// Check if this tower is expanded (selected)
	function isExpanded(tower: TowerSearchDocument): boolean {
		return selectedTowerId === tower.id;
	}

	// Scroll to selected tower when selectedTowerId changes
	$effect(() => {
		if (selectedTowerId !== null) {
			// Small delay to ensure DOM is updated
			setTimeout(() => {
				const element = document.querySelector(`[data-tower-id="${selectedTowerId}"]`);
				if (element) {
					// Scroll to top of list area so full expanded content is visible
					element.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}
			}, 50);
		}
	});
</script>

<div class="tower-list">
	<!-- Search in list header -->
	<div class="list-header">
		<div class="search-row">
			<div class="search-wrapper">
				<svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8"/>
					<path d="m21 21-4.3-4.3"/>
				</svg>
				<input
					type="text"
					bind:value={localSearchQuery}
					oninput={handleSearchInput}
					onkeydown={handleSearchKeydown}
					placeholder="Search..."
					class="search-input"
				/>
				{#if localSearchQuery}
					<button class="clear-btn" onclick={clearSearch} aria-label="Clear search">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M18 6 6 18"/>
							<path d="m6 6 12 12"/>
						</svg>
					</button>
				{/if}
			</div>
			<button
				class="filter-toggle"
				class:active={showFilters || activeFilterCount > 0}
				onclick={() => showFilters = !showFilters}
				aria-label="Toggle filters"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
				</svg>
				{#if activeFilterCount > 0}
					<span class="filter-badge">{activeFilterCount}</span>
				{/if}
			</button>
		</div>

		{#if showFilters}
			<div class="filter-panel" transition:slide={{ duration: 150 }}>
				<div class="filter-group">
					<span class="filter-label">Carrier</span>
					<div class="select-wrapper">
						<select value={carrierFilter} onchange={handleCarrierChange} class="filter-select">
							<option value="">All</option>
							{#each uniqueCarriers() as carrier}
								<option value={carrier}>{carrier}</option>
							{/each}
						</select>
						<svg class="select-chevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="m6 9 6 6 6-6"/>
						</svg>
					</div>
				</div>
				<div class="filter-group">
					<span class="filter-label">Entity</span>
					<div class="select-wrapper">
						<select value={entityFilter} onchange={handleEntityChange} class="filter-select">
							<option value="">All</option>
							{#each uniqueEntities() as entity}
								<option value={entity}>{entity}</option>
							{/each}
						</select>
						<svg class="select-chevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="m6 9 6 6 6-6"/>
						</svg>
					</div>
				</div>
				{#if activeFilterCount > 0}
					<button class="clear-filters-btn" onclick={clearFilters}>
						<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M18 6 6 18"/>
							<path d="m6 6 12 12"/>
						</svg>
						Clear
					</button>
				{/if}
			</div>
		{/if}

		<span class="count">
			{#if loading}
				Searching...
			{:else if activeFilterCount > 0}
				{filteredTowers().length.toLocaleString()} of {total.toLocaleString()} tower{total !== 1 ? 's' : ''}
			{:else}
				{total.toLocaleString()} tower{total !== 1 ? 's' : ''}
			{/if}
		</span>
	</div>

	<div class="list-content" bind:this={listContentRef}>
		{#if loading}
			<div class="loading-state">
				<div class="loading-spinner-wrapper">
					<div class="spinner"></div>
				</div>
				<span class="loading-text">Loading towers...</span>
				<div class="loading-skeleton">
					{#each Array(5) as _}
						<div class="skeleton-item">
							<div class="skeleton-badge"></div>
							<div class="skeleton-line wide"></div>
							<div class="skeleton-line narrow"></div>
						</div>
					{/each}
				</div>
			</div>
		{:else if filteredTowers().length === 0}
			<div class="empty-state">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8"/>
					<path d="m21 21-4.3-4.3"/>
				</svg>
				<p>No towers found</p>
				<span>{activeFilterCount > 0 ? 'Try adjusting your filters' : 'Try adjusting your search'}</span>
			</div>
		{:else}
			{#each filteredTowers() as tower (tower.id)}
				{@const expanded = isExpanded(tower)}
				{@const details = expanded ? expandedTowerDetails : null}
				<div class="tower-item-wrapper" class:expanded data-tower-id={tower.id}>
					<button
						class="tower-item"
						class:selected={expanded}
						onclick={() => handleTowerClick(tower)}
					>
						<div class="tower-main">
							<div class="carrier-badges">
								{#if tower.provider_names && tower.provider_names.length > 0}
									{#each tower.provider_names as providerName}
										{@const displayName = getDisplayProviderName(providerName, tower.entity_name)}
										{@const carrierStyle = getCarrierStyle(displayName)}
										{#if displayName === 'Ghost Lead'}
											<span class="carrier-badge ghost-lead-badge" style="background-color: {carrierStyle.bg}">
												<span class="ghost-lead-text">Ghost Lead</span>
											</span>
										{:else}
											<span
												class="carrier-badge"
												style="background-color: {carrierStyle.bg}; color: {carrierStyle.text}"
											>
												{displayName}
											</span>
										{/if}
									{/each}
								{:else if getCarrierLabel(tower)}
									{@const carrierLabel = getCarrierLabel(tower)}
									{@const carrierStyle = getCarrierStyle(carrierLabel)}
									{#if carrierLabel === 'Ghost Lead'}
										<span class="carrier-badge ghost-lead-badge" style="background-color: {carrierStyle.bg}">
											<span class="ghost-lead-text">Ghost Lead</span>
										</span>
									{:else}
										<span
											class="carrier-badge"
											style="background-color: {carrierStyle.bg}; color: {carrierStyle.text}"
										>
											{carrierLabel}
										</span>
									{/if}
								{/if}
							</div>
							<div class="tower-address">{formatAddress(tower)}</div>
							<div class="tower-meta">
								{#if tower.entity_name}
									<span class="entity-name">{tower.entity_name}</span>
								{/if}
								{#if tower.tower_type}
									<span class="tower-type">{tower.tower_type}</span>
								{/if}
							</div>
						</div>
						<div class="tower-side">
							{#if getAccessStateLabel(tower) !== 'SAMPLE'}
								{#if getAccessStateLabel(tower) === 'Ghost Lead'}
									<span class="access-badge ghost-lead-badge" style="background-color: {getAccessStateColor('Ghost Lead')}">
										<span class="ghost-lead-text">Ghost Lead</span>
									</span>
								{:else}
									<span
										class="access-badge"
										style="background-color: {getAccessStateColor(getAccessStateLabel(tower))}"
									>
										{getAccessStateLabel(tower)}
									</span>
								{/if}
							{/if}
							<svg class="expand-icon" class:rotated={expanded} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="m6 9 6 6 6-6"/>
							</svg>
						</div>
					</button>

					<!-- Expanded details -->
					<div class="tower-details-wrapper">
						<div class="tower-details">
							{#if expanded}
								<div class="tower-details-content">
									{#if detailsLoading}
										<div class="details-loading">
											<div class="spinner small"></div>
											<span>Loading details...</span>
										</div>
									{:else if details}
								{@const site = details.tower.tower_site}
								{@const entity = site?.entity}
								{@const contacts = entity?.entity_contacts || []}
								{@const hasZoningData = site?.zoning || site?.zoning_type || site?.use_code}
								{@const hasPropertyData = site?.parcel_value || site?.land_value || site?.improvement_value}
								{@const hasPropertyZoning = hasZoningData || hasPropertyData}

								<!-- 1. Location Section (Always Visible) -->
								<div class="detail-section">
									<h4>Location</h4>
									<div class="detail-grid">
										<div class="detail-item">
											<label>Address</label>
											<span>{site?.address || 'N/A'}</span>
										</div>
										<div class="detail-item">
											<label>City, State</label>
											<span>{[site?.city, site?.state].filter(Boolean).join(', ') || 'N/A'}</span>
										</div>
										<div class="detail-item">
											<label>ZIP</label>
											<span>{site?.zip_code || 'N/A'}</span>
										</div>
										<div class="detail-item">
											<label>Coordinates</label>
											<span>{tower.latitude.toFixed(6)}, {tower.longitude.toFixed(6)}</span>
										</div>
									</div>
									<a href="https://www.google.com/maps?q={tower.latitude},{tower.longitude}" target="_blank" rel="noopener noreferrer" class="map-link">
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
											<polyline points="15 3 21 3 21 9"/>
											<line x1="10" x2="21" y1="14" y2="3"/>
										</svg>
										View in Google Maps
									</a>
								</div>

								<!-- 2. Site Details Section (Always Visible) -->
								<div class="detail-section">
									<h4>Site Details</h4>
									<div class="detail-grid">
										<div class="detail-item">
											<label>Carrier</label>
											<span>{site?.carrier || 'N/A'}</span>
										</div>
										<div class="detail-item">
											<label>Tower Type</label>
											<span>{site?.tower_type || details.tower.tower_type || 'N/A'}</span>
										</div>
										<div class="detail-item">
											<label>Status</label>
											<span>{site?.status || 'N/A'}</span>
										</div>
										<div class="detail-item">
											<label>County</label>
											<span>{site?.county || 'N/A'}</span>
										</div>
										{#if site?.year_built}
											<div class="detail-item">
												<label>Year Built</label>
												<span>{site.year_built}</span>
											</div>
										{/if}
									</div>
									{#if site?.remarks}
										<div class="remarks">
											<label>Remarks</label>
											<p>{site.remarks}</p>
										</div>
									{/if}
								</div>

								<!-- 3. Seller Intelligence Section (Always Locked) -->
								<div class="detail-section">
									<LockedSection
										title="Seller Intelligence"
										description="Background information on the seller including owner age, business health indicators, judgments, liens, and more."
										isPremium={true}
										onUnlock={openContactModal}
									/>
								</div>

								<!-- 4. RF / Technical Section (Always Locked - RF data not yet populated) -->
								<div class="detail-section">
									<LockedSection
										title="RF / Technical"
										description="Technical site data including spectrum allocation, radio technology, band details, and more."
										onUnlock={openContactModal}
									/>
								</div>

								<!-- 5. Property & Zoning Section (Lockable) -->
								{#if hasPropertyZoning}
									<div class="detail-section">
										<h4>Property & Zoning</h4>
										<div class="detail-grid">
											{#if site?.use_code}
												<div class="detail-item">
													<label>Use Code</label>
													<span>{site.use_code}</span>
												</div>
											{/if}
											{#if site?.zoning}
												<div class="detail-item">
													<label>Zoning</label>
													<span>{site.zoning}</span>
												</div>
											{/if}
											{#if site?.zoning_type}
												<div class="detail-item">
													<label>Type</label>
													<span>{site.zoning_type}</span>
												</div>
											{/if}
											{#if site?.zoning_subtype}
												<div class="detail-item">
													<label>Subtype</label>
													<span>{site.zoning_subtype}</span>
												</div>
											{/if}
											{#if site?.parcel_value}
												<div class="detail-item">
													<label>Parcel Value</label>
													<span class="value-highlight">${site.parcel_value.toLocaleString()}</span>
												</div>
											{/if}
											{#if site?.land_value}
												<div class="detail-item">
													<label>Land Value</label>
													<span>${site.land_value.toLocaleString()}</span>
												</div>
											{/if}
											{#if site?.improvement_value}
												<div class="detail-item">
													<label>Improvement Value</label>
													<span>${site.improvement_value.toLocaleString()}</span>
												</div>
											{/if}
											{#if site?.zoning_description}
												<div class="detail-item full">
													<label>Description</label>
													<span>{site.zoning_description}</span>
												</div>
											{/if}
										</div>
										{#if site?.zoning_code_link}
											<a href={site.zoning_code_link} target="_blank" rel="noopener noreferrer" class="external-link">
												View Zoning Code
											</a>
										{/if}
									</div>
								{:else}
									<div class="detail-section">
										<LockedSection
											title="Property & Zoning"
											description="Property details including zoning classification, land use codes, valuations, and more."
											onUnlock={openContactModal}
										/>
									</div>
								{/if}

								<!-- 6. Ownership / Entity Section (Lockable) -->
								{#if entity}
									<div class="detail-section">
										<h4>Ownership / Entity</h4>
										<div class="detail-grid">
											<div class="detail-item full">
												<label>Name</label>
												<span class="entity-value">{entity.name}</span>
											</div>
											{#if entity.entity_type}
												<div class="detail-item">
													<label>Entity Type</label>
													<span class="entity-type-badge">{entity.entity_type}</span>
												</div>
											{/if}
											{#if entity.mail_address}
												<div class="detail-item full">
													<label>Mailing Address</label>
													<span>{[entity.mail_address, entity.mail_city, entity.mail_state, entity.mail_zip].filter(Boolean).join(', ')}</span>
												</div>
											{/if}
										</div>
									</div>
								{:else}
									<div class="detail-section">
										<LockedSection
											title="Ownership / Entity"
											description="Ownership information including property owner details, entity type, mailing address, and more."
											onUnlock={openContactModal}
										/>
									</div>
								{/if}

								<!-- 7. Contacts Section (Lockable) -->
								{#if contacts.length > 0}
									<div class="detail-section">
										<h4>Contacts ({contacts.length})</h4>
										{#each contacts as contact}
											<div class="contact-card">
												<div class="contact-header">
													<span class="contact-name">
														{contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown'}
													</span>
													{#if contact.contact_order === 1}
														<span class="primary-badge">Primary</span>
													{/if}
												</div>
												{#if contact.title}
													<div class="contact-title">{contact.title}</div>
												{/if}
												<div class="contact-info">
													{#if contact.phone_primary}
														<a href="tel:{contact.phone_primary}" class="contact-link">
															<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
																<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
															</svg>
															{formatPhone(contact.phone_primary)}
														</a>
														{#if contact.phone_primary_dnc}
															<span class="dnc-badge">DNC</span>
														{/if}
													{/if}
													{#if contact.email_primary}
														<a href="mailto:{contact.email_primary}" class="contact-link">
															<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
																<rect width="20" height="16" x="2" y="4" rx="2"/>
																<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
															</svg>
															{contact.email_primary}
														</a>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<div class="detail-section">
										<LockedSection
											title="Contacts"
											description="Decision-maker contact information including phone numbers, email addresses, and more."
											onUnlock={openContactModal}
										/>
									</div>
								{/if}
									{:else}
										<div class="details-empty">
											<span>No additional details available</span>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>

</div>

<ContactSalesModal open={showContactModal} onClose={closeContactModal} />

<style>
	.tower-list {
		display: flex;
		flex-direction: column;
		height: 100%;
		background-color: #253448;
		border-right: 1px solid #3d4f63;
	}

	.list-header {
		padding: 0.75rem;
		border-bottom: 1px solid #3d4f63;
		background-color: #2d3e52;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.search-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.search-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		flex: 1;
	}

	.filter-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background-color: #253448;
		border: 1px solid #3d4f63;
		border-radius: 0.5rem;
		color: rgba(255, 255, 255, 0.65);
		cursor: pointer;
		transition: all 0.15s;
		position: relative;
		flex-shrink: 0;
	}

	.filter-toggle:hover {
		border-color: rgba(255, 255, 255, 0.3);
		color: rgba(255, 255, 255, 0.7);
	}

	.filter-toggle.active {
		background-color: rgba(94, 177, 247, 0.1);
		border-color: #5EB1F7;
		color: #5EB1F7;
	}

	.filter-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		background-color: #5EB1F7;
		color: white;
		font-size: 0.625rem;
		font-weight: 600;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.filter-panel {
		display: flex;
		gap: 0.5rem;
		padding-top: 0.5rem;
		align-items: flex-end;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.filter-label {
		font-size: 0.625rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.65);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.select-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.filter-select {
		width: 100%;
		padding: 0.5rem 1.75rem 0.5rem 0.625rem;
		background-color: #253448;
		border: 1px solid #3d4f63;
		border-radius: 0.375rem;
		color: #FFFFFF;
		font-size: 0.75rem;
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
	}

	.filter-select:focus {
		outline: none;
		border-color: #5EB1F7;
		box-shadow: 0 0 0 3px rgba(94, 177, 247, 0.2);
	}

	.filter-select:hover {
		border-color: rgba(255, 255, 255, 0.3);
	}

	.select-chevron {
		position: absolute;
		right: 0.5rem;
		color: rgba(255, 255, 255, 0.65);
		pointer-events: none;
	}

	.clear-filters-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 0.625rem;
		background-color: transparent;
		border: 1px solid #3d4f63;
		border-radius: 0.375rem;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.75rem;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s;
	}

	.clear-filters-btn:hover {
		background-color: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		color: rgba(255, 255, 255, 0.65);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 2rem 0.5rem 2.25rem;
		background-color: #253448;
		border: 1px solid #3d4f63;
		border-radius: 0.5rem;
		color: #FFFFFF;
		font-size: 0.8125rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #5EB1F7;
	}

	.search-input::placeholder {
		color: rgba(255, 255, 255, 0.55);
	}

	.clear-btn {
		position: absolute;
		right: 0.5rem;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.65);
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
	}

	.clear-btn:hover {
		color: #FFFFFF;
	}

	.count {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.7);
		font-weight: 500;
	}

	.list-content {
		flex: 1;
		overflow-y: auto;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1.5rem 1rem;
		color: #71717a;
		gap: 0.75rem;
	}

	.loading-spinner-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
	}

	.loading-text {
		font-size: 0.8125rem;
		color: #a1a1aa;
		font-weight: 500;
	}

	.loading-skeleton {
		width: 100%;
		display: flex;
		flex-direction: column;
	}

	.skeleton-item {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #3d4f63;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-badge {
		width: 60px;
		height: 20px;
		background: linear-gradient(90deg, #253448 25%, #2d3e52 50%, #253448 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
		border-radius: 0.25rem;
	}

	.skeleton-line {
		height: 12px;
		background: linear-gradient(90deg, #253448 25%, #2d3e52 50%, #253448 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
		border-radius: 0.25rem;
	}

	.skeleton-line.wide {
		width: 80%;
	}

	.skeleton-line.narrow {
		width: 50%;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		color: #71717a;
		gap: 0.75rem;
	}

	.empty-state svg {
		opacity: 0.5;
	}

	.empty-state p {
		font-size: 0.875rem;
		color: #a1a1aa;
		margin: 0;
	}

	.empty-state span {
		font-size: 0.75rem;
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid #3d4f63;
		border-top-color: #5EB1F7;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.spinner.small {
		width: 16px;
		height: 16px;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.tower-item-wrapper {
		border-bottom: 1px solid #2d3e52;
	}

	.tower-item-wrapper.expanded {
		background-color: rgba(94, 177, 247, 0.08);
		border-left: 3px solid #5EB1F7;
	}

	.tower-item {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		width: 100%;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: transform 0.15s ease, background-color 0.15s ease;
	}

	.tower-item:hover {
		background-color: #2d3e52;
		transform: translateY(-1px);
	}

	.tower-item.selected {
		background-color: transparent;
	}

	.tower-main {
		flex: 1;
		min-width: 0;
	}

	.carrier-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-bottom: 0.375rem;
	}

	.carrier-badge {
		display: inline-block;
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		letter-spacing: 0.01em;
	}

	.ghost-lead-badge {
		border: 1px solid #3d4f63;
	}

	.ghost-lead-text {
		background: linear-gradient(
			90deg,
			#B0BEC5 0%,
			#A3C2CF 11%,
			#96C6D9 22%,
			#89CAE3 33%,
			#7CCFEE 44%,
			#6FD3F8 55%,
			#62D7FF 66%,
			#55DBFF 77%,
			#48E0FF 88%,
			#5EB1F7 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		font-weight: 700;
	}

	.tower-address {
		font-size: 0.8125rem;
		color: #FFFFFF;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-bottom: 0.25rem;
	}

	.tower-meta {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.entity-name {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.7);
		background-color: #2d3e52;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		max-width: 180px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tower-type {
		font-size: 0.625rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
		background-color: #253448;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		border: 1px solid #3d4f63;
	}


	.tower-side {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.375rem;
		margin-left: 0.75rem;
	}

	.access-badge {
		font-size: 0.625rem;
		font-weight: 600;
		color: white;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.expand-icon {
		color: rgba(255, 255, 255, 0.65);
		transition: transform 0.2s;
	}

	.expand-icon.rotated {
		transform: rotate(180deg);
	}

	/* Expanded Details - CSS Grid animation for smooth expand */
	.tower-details-wrapper {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.tower-item-wrapper.expanded .tower-details-wrapper {
		grid-template-rows: 1fr;
	}

	.tower-details {
		overflow: hidden;
		min-height: 0;
	}

	.tower-details-content {
		padding: 1rem 1rem 1rem 1.25rem;
		border-top: 1px solid #3d4f63;
		background-color: rgba(45, 62, 82, 0.5);
		min-height: 120px;
		opacity: 0;
		transition: opacity 0.35s ease-out 0.15s;
	}

	.tower-item-wrapper.expanded .tower-details-content {
		opacity: 1;
	}

	.details-loading,
	.details-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1.5rem;
		color: rgba(255, 255, 255, 0.65);
		font-size: 0.75rem;
	}

	.detail-section {
		padding: 0.75rem 0;
		border-bottom: 1px solid #3d4f63;
	}

	.detail-section:last-child {
		border-bottom: none;
	}

	.detail-section h4 {
		font-size: 0.625rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.7);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.5rem 0;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.detail-item.full {
		grid-column: span 2;
	}

	.detail-item label {
		font-size: 0.625rem;
		color: rgba(255, 255, 255, 0.65);
	}

	.detail-item span {
		font-size: 0.75rem;
		color: #FFFFFF;
	}

	.entity-value {
		font-weight: 600;
	}

	.value-highlight {
		font-weight: 600;
		color: #5EB1F7;
	}

	.external-link {
		display: inline-block;
		margin-top: 0.5rem;
		font-size: 0.6875rem;
		color: #5EB1F7;
		text-decoration: none;
	}

	.external-link:hover {
		text-decoration: underline;
	}

	.map-link {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.75rem;
		padding: 0.5rem 0.75rem;
		background-color: rgba(94, 177, 247, 0.1);
		border: 1px solid rgba(94, 177, 247, 0.3);
		border-radius: 0.375rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: #5EB1F7;
		text-decoration: none;
		transition: all 0.15s;
	}

	.map-link:hover {
		background-color: rgba(94, 177, 247, 0.2);
		border-color: #5EB1F7;
	}

	.map-link svg {
		flex-shrink: 0;
	}

	.entity-type-badge {
		display: inline-block;
		padding: 0.125rem 0.375rem;
		background-color: #2d3e52;
		border: 1px solid #3d4f63;
		border-radius: 0.25rem;
		font-size: 0.6875rem;
		text-transform: capitalize;
	}

	.remarks {
		margin-top: 0.5rem;
	}

	.remarks label {
		display: block;
		font-size: 0.625rem;
		color: rgba(255, 255, 255, 0.65);
		margin-bottom: 0.125rem;
	}

	.remarks p {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
		line-height: 1.4;
	}

	/* Contact Card */
	.contact-card {
		background-color: #253448;
		border: 1px solid #3d4f63;
		border-radius: 0.375rem;
		padding: 0.625rem;
		margin-bottom: 0.5rem;
	}

	.contact-card:last-child {
		margin-bottom: 0;
	}

	.contact-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.contact-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #FFFFFF;
	}

	.primary-badge {
		font-size: 0.5rem;
		font-weight: 600;
		padding: 0.125rem 0.25rem;
		background-color: #5EB1F7;
		color: white;
		border-radius: 0.125rem;
		text-transform: uppercase;
	}

	.contact-title {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 0.375rem;
	}

	.contact-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.contact-link {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.6875rem;
		color: #FFFFFF;
		text-decoration: none;
	}

	.contact-link:hover {
		color: #5EB1F7;
	}

	.contact-link svg {
		color: rgba(255, 255, 255, 0.65);
	}

	.dnc-badge {
		font-size: 0.5rem;
		font-weight: 600;
		padding: 0.0625rem 0.1875rem;
		background-color: #ef4444;
		color: white;
		border-radius: 0.125rem;
		margin-left: 0.25rem;
	}

</style>
