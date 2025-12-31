<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { getCarrierName, getCarrierColorByName } from "../carriers";

  export interface Filters {
    rat: string[];
    endc: boolean | null;
    carriers: number[];
    towerTypes: string[];
    providerCount: "all" | "single" | "multi";
  }

  interface Provider {
    id: number;
    country_id: number;
    provider_id: number;
    name: string;
  }

  interface Props {
    filters: Filters;
    onFilterChange: (filters: Filters) => void;
    totalCount: number;
    filteredCount: number;
    providers?: Provider[];
    showGNNLayers?: boolean;
    onGNNLayersChange?: (show: boolean) => void;
    gnnGapCount?: number;
    gnnLinkCount?: number;
    showGrid?: boolean;
    onGridChange?: (show: boolean) => void;
  }

  let { filters, onFilterChange, totalCount, filteredCount, providers = [], showGNNLayers = true, onGNNLayersChange, gnnGapCount = 0, gnnLinkCount = 0, showGrid = false, onGridChange }: Props = $props();

  const RAT_OPTIONS = [
    { value: "LTE", label: "LTE", color: "#3b82f6" },
    { value: "NR", label: "5G NR", color: "#8b5cf6" },
    { value: "UMTS", label: "UMTS", color: "#ec4899" },
    { value: "CDMA", label: "CDMA", color: "#f59e0b" },
    { value: "GSM", label: "GSM", color: "#22c55e" },
  ];

  const ENDC_OPTIONS: { value: boolean | null; label: string }[] = [
    { value: null, label: "All" },
    { value: true, label: "EN-DC Only" },
    { value: false, label: "Non EN-DC" },
  ];

  const TOWER_TYPE_OPTIONS = [
    { value: "MACRO", label: "Macro", color: "#3b82f6" },
    { value: "MICRO", label: "Micro", color: "#8b5cf6" },
    { value: "PICO", label: "Pico", color: "#22c55e" },
    { value: "DAS", label: "DAS", color: "#f59e0b" },
    { value: "COW", label: "COW", color: "#ef4444" },
  ];

  const PROVIDER_COUNT_OPTIONS: { value: "all" | "single" | "multi"; label: string }[] = [
    { value: "all", label: "All Sites" },
    { value: "single", label: "Single Carrier" },
    { value: "multi", label: "Shared Sites" },
  ];

  // Aggregate providers by carrier name for the filter
  let carrierOptions = $derived(() => {
    const carrierMap = new Map<string, { ids: number[]; color: string }>();

    for (const p of providers) {
      const name = getCarrierName(p.country_id, p.provider_id);
      const color = getCarrierColorByName(name);

      if (carrierMap.has(name)) {
        carrierMap.get(name)!.ids.push(p.id);
      } else {
        carrierMap.set(name, { ids: [p.id], color });
      }
    }

    return Array.from(carrierMap.entries())
      .map(([name, { ids, color }]) => ({ name, ids, color }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  function toggleRAT(rat: string) {
    const newRAT = filters.rat.includes(rat)
      ? filters.rat.filter(r => r !== rat)
      : [...filters.rat, rat];
    onFilterChange({ ...filters, rat: newRAT });
  }

  function setENDC(value: boolean | null) {
    onFilterChange({ ...filters, endc: value });
  }

  function toggleCarrier(carrierIds: number[]) {
    // Check if ALL ids of this carrier are currently selected
    const allSelected = carrierIds.every(id => filters.carriers.includes(id));

    let newCarriers: number[];
    if (allSelected) {
      // Remove all ids for this carrier
      newCarriers = filters.carriers.filter(id => !carrierIds.includes(id));
    } else {
      // Add all ids for this carrier that aren't already there
      newCarriers = [...filters.carriers, ...carrierIds.filter(id => !filters.carriers.includes(id))];
    }
    onFilterChange({ ...filters, carriers: newCarriers });
  }

  function toggleTowerType(type: string) {
    const newTypes = filters.towerTypes.includes(type)
      ? filters.towerTypes.filter(t => t !== type)
      : [...filters.towerTypes, type];
    onFilterChange({ ...filters, towerTypes: newTypes });
  }

  function setProviderCount(value: "all" | "single" | "multi") {
    onFilterChange({ ...filters, providerCount: value });
  }

  function clearFilters() {
    onFilterChange({ rat: [], endc: null, carriers: [], towerTypes: [], providerCount: "all" });
  }

  let hasFilters = $derived(
    filters.rat.length > 0 ||
    filters.endc !== null ||
    filters.carriers.length > 0 ||
    filters.towerTypes.length > 0 ||
    filters.providerCount !== "all"
  );

  // Check if a carrier is selected (any of its provider IDs)
  function isCarrierSelected(carrierIds: number[]): boolean {
    return carrierIds.some(id => filters.carriers.includes(id));
  }

  // Collapsed state for filter sections
  let showCarriers = $state(false);
  let showTowerTypes = $state(false);

  // Count of selected carriers (not IDs)
  let selectedCarrierCount = $derived(() => {
    const options = carrierOptions();
    return options.filter(c => isCarrierSelected(c.ids)).length;
  });
</script>

<div class="filters">
  <div class="filter-row">
    <div class="filter-section">
      <div class="filter-label">Technology</div>
      <div class="filter-chips">
        {#each RAT_OPTIONS as opt}
          <button
            class="chip"
            class:active={filters.rat.length === 0 || filters.rat.includes(opt.value)}
            class:inactive={filters.rat.length > 0 && !filters.rat.includes(opt.value)}
            style="--chip-color: {opt.color}"
            onclick={() => toggleRAT(opt.value)}
          >
            <span class="chip-dot" style="background: {opt.color}"></span>
            {opt.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-label">EN-DC</div>
      <div class="filter-chips">
        {#each ENDC_OPTIONS as opt}
          <button
            class="chip"
            class:active={filters.endc === opt.value}
            onclick={() => setENDC(opt.value)}
          >
            {opt.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-label">Site Type</div>
      <div class="filter-chips">
        {#each PROVIDER_COUNT_OPTIONS as opt}
          <button
            class="chip"
            class:active={filters.providerCount === opt.value}
            onclick={() => setProviderCount(opt.value)}
          >
            {opt.label}
          </button>
        {/each}
      </div>
    </div>

    {#if onGNNLayersChange}
      <div class="filter-section gnn-section">
        <div class="filter-label">GNN Analysis</div>
        <div class="gnn-toggle-row">
          <button
            class="chip gnn-chip"
            class:active={showGNNLayers}
            onclick={() => onGNNLayersChange(!showGNNLayers)}
          >
            <span class="chip-dot" style="background: {showGNNLayers ? '#8b5cf6' : '#52525b'}"></span>
            {showGNNLayers ? 'On' : 'Off'}
          </button>
          {#if showGNNLayers && (gnnGapCount > 0 || gnnLinkCount > 0)}
            <span class="gnn-stats">
              {gnnGapCount} gaps, {gnnLinkCount} links
            </span>
          {/if}
        </div>
      </div>
    {/if}

    {#if onGridChange}
      <div class="filter-section grid-section">
        <div class="filter-label">H3 Grid</div>
        <div class="grid-toggle-row">
          <button
            class="chip grid-chip"
            class:active={showGrid}
            onclick={() => onGridChange(!showGrid)}
          >
            <span class="chip-dot" style="background: {showGrid ? '#22c55e' : '#52525b'}"></span>
            {showGrid ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div class="filter-row">
    <div class="filter-section expandable">
      <button
        class="filter-label-btn"
        onclick={() => showCarriers = !showCarriers}
      >
        <span class="filter-label">Carrier</span>
        {#if selectedCarrierCount() > 0}
          <span class="filter-badge">{selectedCarrierCount()}</span>
        {/if}
        <span class="chevron" class:open={showCarriers}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          </svg>
        </span>
      </button>
      {#if showCarriers}
        <div class="filter-chips carrier-chips" transition:slide={{ duration: 150, easing: cubicOut }}>
          {#each carrierOptions() as carrier}
            <button
              class="chip"
              class:active={isCarrierSelected(carrier.ids)}
              style="--chip-color: {carrier.color}"
              onclick={() => toggleCarrier(carrier.ids)}
            >
              <span class="chip-dot" style="background: {carrier.color}"></span>
              {carrier.name}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="filter-section expandable">
      <button
        class="filter-label-btn"
        onclick={() => showTowerTypes = !showTowerTypes}
      >
        <span class="filter-label">Tower Type</span>
        {#if filters.towerTypes.length > 0}
          <span class="filter-badge">{filters.towerTypes.length}</span>
        {/if}
        <span class="chevron" class:open={showTowerTypes}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          </svg>
        </span>
      </button>
      {#if showTowerTypes}
        <div class="filter-chips" transition:slide={{ duration: 150, easing: cubicOut }}>
          {#each TOWER_TYPE_OPTIONS as opt}
            <button
              class="chip"
              class:active={filters.towerTypes.length === 0 || filters.towerTypes.includes(opt.value)}
              class:inactive={filters.towerTypes.length > 0 && !filters.towerTypes.includes(opt.value)}
              style="--chip-color: {opt.color}"
              onclick={() => toggleTowerType(opt.value)}
            >
              <span class="chip-dot" style="background: {opt.color}"></span>
              {opt.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    {#if hasFilters}
      <div class="filter-actions">
        <button class="clear-btn" onclick={clearFilters}>
          Clear all
        </button>
        <span class="filter-count">
          {filteredCount.toLocaleString()} / {totalCount.toLocaleString()}
        </span>
      </div>
    {/if}
  </div>
</div>

<style>
  .filters {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: #253448;
    border-radius: 12px;
  }

  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: flex-start;
  }

  .filter-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-section.expandable {
    min-width: 120px;
  }

  .filter-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #71717a;
  }

  .filter-label-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    color: inherit;
  }

  .filter-label-btn:hover .filter-label {
    color: #a1a1aa;
  }

  .filter-badge {
    background: #5EB1F7;
    color: white;
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    min-width: 1.25rem;
    text-align: center;
    animation: badgeAppear 0.2s ease-out;
  }

  @keyframes badgeAppear {
    from {
      transform: scale(0.8);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .chevron {
    color: #52525b;
    transition: transform 0.2s ease;
    display: flex;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .carrier-chips {
    max-width: 500px;
  }

  .chip {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    border: 1px solid #3d4f63;
    border-radius: 6px;
    background: #2d3e52;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease, transform 0.1s ease;
  }

  .chip:hover {
    border-color: #5EB1F7;
    color: #FFFFFF;
  }

  .chip:active {
    transform: scale(0.95);
  }

  .chip.active {
    background: rgba(94, 177, 247, 0.15);
    border-color: #5EB1F7;
    color: #FFFFFF;
  }

  .chip.inactive {
    opacity: 0.5;
  }

  .chip-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .filter-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-left: auto;
    align-self: center;
  }

  .clear-btn {
    padding: 0.375rem 0.75rem;
    border: 1px solid #ef4444;
    border-radius: 6px;
    background: transparent;
    color: #ef4444;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .clear-btn:hover {
    background: rgba(239, 68, 68, 0.15);
  }

  .filter-count {
    font-size: 0.75rem;
    color: #71717a;
    font-variant-numeric: tabular-nums;
  }

  .gnn-section {
    border-left: 2px solid #8b5cf6;
    padding-left: 0.75rem;
  }

  .gnn-toggle-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .gnn-chip.active {
    background: rgba(139, 92, 246, 0.15);
    border-color: #8b5cf6;
  }

  .gnn-stats {
    font-size: 0.7rem;
    color: #a1a1aa;
    font-variant-numeric: tabular-nums;
  }

  .grid-section {
    border-left: 2px solid #22c55e;
    padding-left: 0.75rem;
  }

  .grid-toggle-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .grid-chip.active {
    background: rgba(34, 197, 94, 0.15);
    border-color: #22c55e;
  }
</style>
