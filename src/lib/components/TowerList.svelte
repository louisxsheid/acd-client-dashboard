<script lang="ts">
	import type { TowerSearchDocument } from '$lib/server/meilisearch';
	import type { CompanyTower } from '$lib/types';

	interface Props {
		towers: TowerSearchDocument[];
		selectedTowerId: number | null;
		onSelect: (tower: TowerSearchDocument) => void;
		loading?: boolean;
		total?: number;
		searchQuery?: string;
		onSearch?: (query: string) => void;
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
		expandedTowerDetails = null,
		detailsLoading = false
	}: Props = $props();

	let localSearchQuery = $state(searchQuery);
	let searchTimeout: ReturnType<typeof setTimeout>;
	let showFilters = $state(false);
	let carrierFilter = $state<string>('');
	let entityFilter = $state<string>('');

	// Extract unique carriers and entities from towers for filter dropdowns
	const uniqueCarriers = $derived(() => {
		const carriers = new Set<string>();
		towers.forEach((t) => {
			const label = getCarrierLabel(t);
			if (label) carriers.add(label);
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

	// Filter towers based on selected filters
	const filteredTowers = $derived(() => {
		return towers.filter((tower) => {
			if (carrierFilter) {
				const label = getCarrierLabel(tower);
				if (label !== carrierFilter) return false;
			}
			if (entityFilter) {
				if (tower.entity_name !== entityFilter) return false;
			}
			return true;
		});
	});

	const activeFilterCount = $derived((carrierFilter ? 1 : 0) + (entityFilter ? 1 : 0));

	function clearFilters() {
		carrierFilter = '';
		entityFilter = '';
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
				return '#3b82f6';
			case 'TRIAL':
				return '#f59e0b';
			case 'Portfolio':
				return '#8b5cf6'; // Purple for portfolio
			case 'SAMPLE':
				return '#71717a';
			default:
				return '#71717a';
		}
	}

	function getAccessStateLabel(tower: TowerSearchDocument): string {
		const states = Object.values(tower.access_states || {});
		const state = states[0] || 'SAMPLE';
		// Show "Portfolio" instead of "Ghost Lead"
		if (state === 'Ghost Lead') {
			return 'Portfolio';
		}
		return state;
	}

	// Carrier colors for badges
	const CARRIER_COLORS: Record<string, { bg: string; text: string }> = {
		'AT&T': { bg: '#0077c8', text: 'white' },
		'Verizon': { bg: '#cd040b', text: 'white' },
		'T-Mobile': { bg: '#e20074', text: 'white' },
		'US Cellular': { bg: '#0057b8', text: 'white' },
		'Dish': { bg: '#ec1c24', text: 'white' },
		'FirstNet': { bg: '#0067ac', text: 'white' },
		'American Tower': { bg: '#d4a017', text: 'black' },
		'Crown Castle': { bg: '#6b46c1', text: 'white' },
		'Ghost Lead': { bg: '#52525b', text: 'white' }
	};

	function getCarrierStyle(carrier: string | undefined): { bg: string; text: string } {
		if (!carrier) return { bg: '#3f3f46', text: '#a1a1aa' };
		// Special case for Portfolio
		if (carrier === 'Portfolio') {
			return { bg: '#8b5cf6', text: 'white' }; // Purple for portfolio
		}
		for (const [key, style] of Object.entries(CARRIER_COLORS)) {
			if (carrier.toLowerCase().includes(key.toLowerCase())) {
				return style;
			}
		}
		return { bg: '#3f3f46', text: '#e4e4e7' };
	}

	// Get the display carrier label - shows "Portfolio" for Oncor entities
	function getCarrierLabel(tower: TowerSearchDocument): string | undefined {
		// If entity name is Oncor, show "Portfolio" instead of carrier
		if (tower.entity_name?.toLowerCase().includes('oncor')) {
			return 'Portfolio';
		}
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
			<div class="filter-panel">
				<div class="filter-row">
					<select bind:value={carrierFilter} class="filter-select">
						<option value="">All Carriers</option>
						{#each uniqueCarriers() as carrier}
							<option value={carrier}>{carrier}</option>
						{/each}
					</select>
					<select bind:value={entityFilter} class="filter-select">
						<option value="">All Entities</option>
						{#each uniqueEntities() as entity}
							<option value={entity}>{entity}</option>
						{/each}
					</select>
				</div>
				{#if activeFilterCount > 0}
					<button class="clear-filters-btn" onclick={clearFilters}>
						Clear filters
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

	<div class="list-content">
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
				<div class="tower-item-wrapper" class:expanded>
					<button
						class="tower-item"
						class:selected={expanded}
						onclick={() => onSelect(tower)}
					>
						<div class="tower-main">
							{#if getCarrierLabel(tower)}
								{@const carrierLabel = getCarrierLabel(tower)}
								{@const carrierStyle = getCarrierStyle(carrierLabel)}
								<span
									class="carrier-badge"
									style="background-color: {carrierStyle.bg}; color: {carrierStyle.text}"
								>
									{carrierLabel}
								</span>
							{/if}
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
								<span
									class="access-badge"
									style="background-color: {getAccessStateColor(getAccessStateLabel(tower))}"
								>
									{getAccessStateLabel(tower)}
								</span>
							{/if}
							<svg class="expand-icon" class:rotated={expanded} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="m6 9 6 6 6-6"/>
							</svg>
						</div>
					</button>

					<!-- Expanded details -->
					{#if expanded}
						<div class="tower-details">
							{#if detailsLoading}
								<div class="details-loading">
									<div class="spinner small"></div>
									<span>Loading details...</span>
								</div>
							{:else if details}
								{@const site = details.tower.tower_site}
								{@const entity = site?.entity}
								{@const contacts = entity?.entity_contacts || []}

								<!-- Location Section -->
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
									{#if site?.google_maps_url}
										<a href={site.google_maps_url} target="_blank" rel="noopener noreferrer" class="external-link">
											Open in Google Maps
										</a>
									{/if}
								</div>

								<!-- Site Info Section -->
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
									</div>
									{#if site?.remarks}
										<div class="remarks">
											<label>Remarks</label>
											<p>{site.remarks}</p>
										</div>
									{/if}
								</div>

								<!-- Entity Section -->
								{#if entity}
									<div class="detail-section">
										<h4>Owner / Entity</h4>
										<div class="detail-grid">
											<div class="detail-item full">
												<label>Name</label>
												<span class="entity-value">{entity.name}</span>
											</div>
											{#if entity.entity_type}
												<div class="detail-item">
													<label>Type</label>
													<span>{entity.entity_type}</span>
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
								{/if}

								<!-- Contacts Section -->
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
								{/if}

								<!-- Technical Section -->
								{#if details.tower.provider_count}
									<div class="detail-section">
										<h4>Technical</h4>
										<div class="detail-grid">
											<div class="detail-item">
												<label>Providers</label>
												<span>{details.tower.provider_count}</span>
											</div>
										</div>
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
			{/each}
		{/if}
	</div>

</div>

<style>
	.tower-list {
		display: flex;
		flex-direction: column;
		height: 100%;
		background-color: #1e1e2e;
		border-right: 1px solid #3b3b50;
	}

	.list-header {
		padding: 0.75rem;
		border-bottom: 1px solid #3b3b50;
		background-color: #27273a;
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
		background-color: #1e1e2e;
		border: 1px solid #3b3b50;
		border-radius: 0.5rem;
		color: #71717a;
		cursor: pointer;
		transition: all 0.15s;
		position: relative;
		flex-shrink: 0;
	}

	.filter-toggle:hover {
		border-color: #52525b;
		color: #a1a1aa;
	}

	.filter-toggle.active {
		background-color: rgba(59, 130, 246, 0.1);
		border-color: #3b82f6;
		color: #3b82f6;
	}

	.filter-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		background-color: #3b82f6;
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
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid #3b3b50;
		margin-top: 0.25rem;
	}

	.filter-row {
		display: flex;
		gap: 0.5rem;
	}

	.filter-select {
		flex: 1;
		padding: 0.5rem;
		background-color: #1e1e2e;
		border: 1px solid #3b3b50;
		border-radius: 0.375rem;
		color: #f4f4f5;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.filter-select:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.clear-filters-btn {
		padding: 0.375rem 0.75rem;
		background: none;
		border: none;
		color: #3b82f6;
		font-size: 0.75rem;
		cursor: pointer;
		align-self: flex-start;
	}

	.clear-filters-btn:hover {
		text-decoration: underline;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		color: #71717a;
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 2rem 0.5rem 2.25rem;
		background-color: #1e1e2e;
		border: 1px solid #3b3b50;
		border-radius: 0.5rem;
		color: #f4f4f5;
		font-size: 0.8125rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.search-input::placeholder {
		color: #52525b;
	}

	.clear-btn {
		position: absolute;
		right: 0.5rem;
		background: none;
		border: none;
		color: #71717a;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
	}

	.clear-btn:hover {
		color: #f4f4f5;
	}

	.count {
		font-size: 0.75rem;
		color: #a1a1aa;
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
		border-bottom: 1px solid #27273a;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-badge {
		width: 60px;
		height: 20px;
		background: linear-gradient(90deg, #27273a 25%, #3b3b50 50%, #27273a 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
		border-radius: 0.25rem;
	}

	.skeleton-line {
		height: 12px;
		background: linear-gradient(90deg, #27273a 25%, #3b3b50 50%, #27273a 75%);
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
		border: 2px solid #3b3b50;
		border-top-color: #3b82f6;
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
		border-bottom: 1px solid #27273a;
	}

	.tower-item-wrapper.expanded {
		background-color: rgba(59, 130, 246, 0.08);
		border-left: 3px solid #3b82f6;
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
		transition: background-color 0.15s;
	}

	.tower-item:hover {
		background-color: #27273a;
	}

	.tower-item.selected {
		background-color: transparent;
	}

	.tower-main {
		flex: 1;
		min-width: 0;
	}

	.carrier-badge {
		display: inline-block;
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		margin-bottom: 0.375rem;
		letter-spacing: 0.01em;
	}

	.tower-address {
		font-size: 0.8125rem;
		color: #f4f4f5;
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
		color: #a1a1aa;
		background-color: #27273a;
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
		color: #71717a;
		background-color: #1e1e2e;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		border: 1px solid #3b3b50;
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
		color: #71717a;
		transition: transform 0.2s;
	}

	.expand-icon.rotated {
		transform: rotate(180deg);
	}

	/* Expanded Details */
	.tower-details {
		padding: 0 1rem 1rem 1rem;
		border-top: 1px solid #3b3b50;
		background-color: rgba(39, 39, 58, 0.5);
	}

	.details-loading,
	.details-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1.5rem;
		color: #71717a;
		font-size: 0.75rem;
	}

	.detail-section {
		padding: 0.75rem 0;
		border-bottom: 1px solid #3b3b50;
	}

	.detail-section:last-child {
		border-bottom: none;
	}

	.detail-section h4 {
		font-size: 0.625rem;
		font-weight: 600;
		color: #71717a;
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
		color: #71717a;
	}

	.detail-item span {
		font-size: 0.75rem;
		color: #f4f4f5;
	}

	.entity-value {
		font-weight: 600;
	}

	.external-link {
		display: inline-block;
		margin-top: 0.5rem;
		font-size: 0.6875rem;
		color: #3b82f6;
		text-decoration: none;
	}

	.external-link:hover {
		text-decoration: underline;
	}

	.remarks {
		margin-top: 0.5rem;
	}

	.remarks label {
		display: block;
		font-size: 0.625rem;
		color: #71717a;
		margin-bottom: 0.125rem;
	}

	.remarks p {
		font-size: 0.75rem;
		color: #a1a1aa;
		margin: 0;
		line-height: 1.4;
	}

	/* Contact Card */
	.contact-card {
		background-color: #1e1e2e;
		border: 1px solid #3b3b50;
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
		color: #f4f4f5;
	}

	.primary-badge {
		font-size: 0.5rem;
		font-weight: 600;
		padding: 0.125rem 0.25rem;
		background-color: #3b82f6;
		color: white;
		border-radius: 0.125rem;
		text-transform: uppercase;
	}

	.contact-title {
		font-size: 0.6875rem;
		color: #a1a1aa;
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
		color: #f4f4f5;
		text-decoration: none;
	}

	.contact-link:hover {
		color: #3b82f6;
	}

	.contact-link svg {
		color: #71717a;
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
