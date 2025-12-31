<script lang="ts">
	import { getCarrierColorByName } from '$lib/carriers';

	interface FilterOptions {
		carriers: string[];
		entities: { id: string; name: string; siteCount: number }[];
		contacts: { id: string; name: string; entityId: string; entityName: string }[];
		states: string[];
		counties: string[];
	}

	interface Props {
		filterOptions: FilterOptions;
		selectedCarriers: string[];
		selectedEntityId: string | null;
		selectedContactId: string | null;
		selectedState: string | null;
		selectedCounty: string | null;
		onCarrierToggle: (carrier: string) => void;
		onEntityChange: (entityId: string | null) => void;
		onContactChange: (contactId: string | null) => void;
		onStateChange: (state: string | null) => void;
		onCountyChange: (county: string | null) => void;
		onClearAll: () => void;
	}

	let {
		filterOptions,
		selectedCarriers,
		selectedEntityId,
		selectedContactId,
		selectedState,
		selectedCounty,
		onCarrierToggle,
		onEntityChange,
		onContactChange,
		onStateChange,
		onCountyChange,
		onClearAll
	}: Props = $props();

	let showCarrierDropdown = $state(false);
	let entitySearch = $state('');
	let contactSearch = $state('');

	const hasActiveFilters = $derived(
		selectedCarriers.length > 0 ||
		selectedEntityId !== null ||
		selectedContactId !== null ||
		selectedState !== null ||
		selectedCounty !== null
	);

	const filteredEntities = $derived(
		filterOptions.entities.filter(e =>
			e.name.toLowerCase().includes(entitySearch.toLowerCase())
		)
	);

	const filteredContacts = $derived(
		filterOptions.contacts.filter(c =>
			c.name.toLowerCase().includes(contactSearch.toLowerCase())
		)
	);

	function toggleCarrier(carrier: string) {
		onCarrierToggle(carrier);
	}
</script>

<div class="filter-bar">
	<div class="filter-header">
		<h3>Filters</h3>
		{#if hasActiveFilters}
			<button class="clear-all" onclick={onClearAll}>
				Clear all
			</button>
		{/if}
	</div>

	<div class="filter-sections">
		<!-- Carrier Toggles -->
		<div class="filter-section">
			<label class="section-label">Carriers</label>
			<div class="carrier-toggles">
				{#each filterOptions.carriers as carrier}
					{@const isSelected = selectedCarriers.includes(carrier)}
					{@const color = getCarrierColorByName(carrier) || '#6b7280'}
					<button
						class="carrier-toggle"
						class:selected={isSelected}
						style="--carrier-color: {color}"
						onclick={() => toggleCarrier(carrier)}
					>
						<span class="carrier-dot" style="background-color: {color}"></span>
						{carrier}
					</button>
				{/each}
			</div>
		</div>

		<!-- State Dropdown -->
		<div class="filter-section">
			<label class="section-label" for="state-select">State</label>
			<select
				id="state-select"
				class="filter-select"
				value={selectedState || ''}
				onchange={(e) => onStateChange(e.currentTarget.value || null)}
			>
				<option value="">All States</option>
				{#each filterOptions.states as state}
					<option value={state}>{state}</option>
				{/each}
			</select>
		</div>

		<!-- County Dropdown -->
		{#if filterOptions.counties.length > 0}
			<div class="filter-section">
				<label class="section-label" for="county-select">County</label>
				<select
					id="county-select"
					class="filter-select"
					value={selectedCounty || ''}
					onchange={(e) => onCountyChange(e.currentTarget.value || null)}
				>
					<option value="">All Counties</option>
					{#each filterOptions.counties as county}
						<option value={county}>{county}</option>
					{/each}
				</select>
			</div>
		{/if}

		<!-- Entity (Portfolio) Dropdown -->
		<div class="filter-section">
			<label class="section-label" for="entity-select">Portfolio / Entity</label>
			<div class="searchable-select">
				<input
					type="text"
					placeholder="Search entities..."
					bind:value={entitySearch}
					class="search-input"
				/>
				<select
					id="entity-select"
					class="filter-select"
					value={selectedEntityId || ''}
					onchange={(e) => onEntityChange(e.currentTarget.value || null)}
				>
					<option value="">All Entities</option>
					{#each filteredEntities as entity}
						<option value={entity.id}>
							{entity.name} ({entity.siteCount} sites)
						</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Contact Dropdown -->
		<div class="filter-section">
			<label class="section-label" for="contact-select">Contact</label>
			<div class="searchable-select">
				<input
					type="text"
					placeholder="Search contacts..."
					bind:value={contactSearch}
					class="search-input"
				/>
				<select
					id="contact-select"
					class="filter-select"
					value={selectedContactId || ''}
					onchange={(e) => onContactChange(e.currentTarget.value || null)}
				>
					<option value="">All Contacts</option>
					{#each filteredContacts as contact}
						<option value={contact.id}>
							{contact.name} - {contact.entityName}
						</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<!-- Active Filters Summary -->
	{#if hasActiveFilters}
		<div class="active-filters">
			<span class="active-label">Active:</span>
			{#if selectedCarriers.length > 0}
				{#each selectedCarriers as carrier}
					<span class="filter-chip carrier">
						{carrier}
						<button onclick={() => toggleCarrier(carrier)}>×</button>
					</span>
				{/each}
			{/if}
			{#if selectedState}
				<span class="filter-chip state">
					{selectedState}
					<button onclick={() => onStateChange(null)}>×</button>
				</span>
			{/if}
			{#if selectedCounty}
				<span class="filter-chip county">
					{selectedCounty}
					<button onclick={() => onCountyChange(null)}>×</button>
				</span>
			{/if}
			{#if selectedEntityId}
				{@const entity = filterOptions.entities.find(e => e.id === selectedEntityId)}
				<span class="filter-chip entity">
					{entity?.name || 'Entity'}
					<button onclick={() => onEntityChange(null)}>×</button>
				</span>
			{/if}
			{#if selectedContactId}
				{@const contact = filterOptions.contacts.find(c => c.id === selectedContactId)}
				<span class="filter-chip contact">
					{contact?.name || 'Contact'}
					<button onclick={() => onContactChange(null)}>×</button>
				</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.filter-bar {
		background-color: #1e1e2e;
		border-radius: 12px;
		padding: 1.25rem;
	}

	.filter-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.filter-header h3 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.clear-all {
		background: none;
		border: none;
		color: #3b82f6;
		font-size: 0.75rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}

	.clear-all:hover {
		background-color: rgba(59, 130, 246, 0.1);
	}

	.filter-sections {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.section-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: #71717a;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Carrier Toggles */
	.carrier-toggles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.carrier-toggle {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		background-color: #27273a;
		border: 1px solid #3b3b50;
		border-radius: 9999px;
		font-size: 0.75rem;
		color: #a1a1aa;
		cursor: pointer;
		transition: all 0.15s;
	}

	.carrier-toggle:hover {
		border-color: var(--carrier-color);
		color: #f4f4f5;
	}

	.carrier-toggle.selected {
		background-color: color-mix(in srgb, var(--carrier-color) 15%, transparent);
		border-color: var(--carrier-color);
		color: #f4f4f5;
	}

	.carrier-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	/* Select Dropdowns */
	.filter-select {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background-color: #27273a;
		border: 1px solid #3b3b50;
		border-radius: 0.5rem;
		font-size: 0.8125rem;
		color: #f4f4f5;
		cursor: pointer;
	}

	.filter-select:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.filter-select option {
		background-color: #27273a;
		color: #f4f4f5;
	}

	/* Searchable Select */
	.searchable-select {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.search-input {
		width: 100%;
		padding: 0.375rem 0.625rem;
		background-color: #1e1e2e;
		border: 1px solid #3b3b50;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		color: #f4f4f5;
	}

	.search-input:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.search-input::placeholder {
		color: #52525b;
	}

	/* Active Filters */
	.active-filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #3b3b50;
	}

	.active-label {
		font-size: 0.6875rem;
		color: #71717a;
		font-weight: 500;
	}

	.filter-chip {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.5rem;
		background-color: rgba(59, 130, 246, 0.15);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 0.375rem;
		font-size: 0.6875rem;
		color: #93c5fd;
	}

	.filter-chip.carrier {
		background-color: rgba(139, 92, 246, 0.15);
		border-color: rgba(139, 92, 246, 0.3);
		color: #c4b5fd;
	}

	.filter-chip.state {
		background-color: rgba(34, 197, 94, 0.15);
		border-color: rgba(34, 197, 94, 0.3);
		color: #86efac;
	}

	.filter-chip.county {
		background-color: rgba(245, 158, 11, 0.15);
		border-color: rgba(245, 158, 11, 0.3);
		color: #fcd34d;
	}

	.filter-chip.entity {
		background-color: rgba(236, 72, 153, 0.15);
		border-color: rgba(236, 72, 153, 0.3);
		color: #f9a8d4;
	}

	.filter-chip.contact {
		background-color: rgba(6, 182, 212, 0.15);
		border-color: rgba(6, 182, 212, 0.3);
		color: #67e8f9;
	}

	.filter-chip button {
		background: none;
		border: none;
		color: inherit;
		font-size: 0.875rem;
		cursor: pointer;
		padding: 0;
		line-height: 1;
		opacity: 0.7;
	}

	.filter-chip button:hover {
		opacity: 1;
	}

	@media (max-width: 768px) {
		.filter-sections {
			grid-template-columns: 1fr;
		}

		.carrier-toggles {
			overflow-x: auto;
			flex-wrap: nowrap;
			padding-bottom: 0.5rem;
		}

		.carrier-toggle {
			white-space: nowrap;
		}
	}
</style>
