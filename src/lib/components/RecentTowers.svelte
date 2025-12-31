<script lang="ts">
  import { getCarrierName, getCarrierColor } from "../carriers";

  interface TowerProvider {
    id: number;
    external_id: string | null;
    rat: string | null;
    rat_subtype: string | null;
    site_id: string | null;
    region_id: string | null;
    first_seen_at: string | null;
    last_seen_at: string | null;
    endc_available: boolean;
    provider: {
      id: number;
      country_id: number;
      provider_id: number;
      name: string | null;
    };
  }

  interface Tower {
    id: number;
    tower_type: string | null;
    latitude: number;
    longitude: number;
    first_seen_at: string | null;
    last_seen_at: string | null;
    endc_available: boolean;
    provider_count: number;
    tower_providers: TowerProvider[];
    cells_aggregate: {
      aggregate: {
        count: number;
      };
    };
  }

  interface Props {
    towers: Tower[];
    title?: string;
  }

  let { towers, title = "Newest Towers" }: Props = $props();

  // Get primary provider (first in list, sorted by last_seen_at desc)
  function getPrimaryProvider(tower: Tower): TowerProvider | null {
    return tower.tower_providers?.[0] ?? null;
  }

  // Get primary RAT from tower_providers
  function getPrimaryRAT(tower: Tower): string | null {
    return getPrimaryProvider(tower)?.rat ?? null;
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function timeAgo(dateStr: string | null): string {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  }

  function getRATColor(rat: string | null): string {
    switch (rat) {
      case "LTE":
        return "#3b82f6";
      case "NR":
        return "#8b5cf6";
      case "GSM":
        return "#22c55e";
      case "CDMA":
        return "#f59e0b";
      case "UMTS":
        return "#ec4899";
      default:
        return "#71717a";
    }
  }

  function getTowerTypeIcon(type: string | null): string {
    switch (type) {
      case "MACRO":
        return "📡";
      case "MICRO":
        return "📶";
      case "PICO":
        return "📱";
      case "DAS":
        return "🏢";
      case "COW":
        return "🚚";
      case "DECOMMISSIONED":
        return "🚫";
      default:
        return "📍";
    }
  }
</script>

<div class="recent-towers">
  <h3>{title}</h3>
  <div class="towers-list">
    {#each towers as tower}
      {@const primaryProvider = getPrimaryProvider(tower)}
      {@const primaryRAT = getPrimaryRAT(tower)}
      {@const carrierName = primaryProvider
        ? getCarrierName(primaryProvider.provider.country_id, primaryProvider.provider.provider_id)
        : "Unknown"}
      {@const carrierColor = primaryProvider
        ? getCarrierColor(primaryProvider.provider.country_id, primaryProvider.provider.provider_id)
        : "#6b7280"}
      <div class="tower-item">
        <div class="tower-main">
          <span class="tower-icon">{getTowerTypeIcon(tower.tower_type)}</span>
          <div class="tower-info">
            <div class="tower-header">
              <span class="rat-badge" style="background: {getRATColor(primaryRAT)}"
                >{primaryRAT || "?"}</span
              >
              <span class="tower-id">#{tower.id}</span>
              {#if tower.endc_available}
                <span class="endc-badge">EN-DC</span>
              {/if}
              {#if tower.provider_count > 1}
                <span class="multi-provider-badge">{tower.provider_count} carriers</span>
              {/if}
            </div>
            <div class="tower-details">
              <span class="tower-type">{tower.tower_type || "Unknown"}</span>
              <span class="separator">•</span>
              <span class="cells">{tower.cells_aggregate.aggregate.count} cells</span>
            </div>
          </div>
        </div>
        <div class="tower-meta">
          <div class="carrier" style="color: {carrierColor}">{carrierName}</div>
          <div class="location">
            {tower.latitude.toFixed(4)}, {tower.longitude.toFixed(4)}
          </div>
          <div class="dates">
            <span class="date-label">First seen:</span>
            <span class="date-value">{formatDate(tower.first_seen_at)}</span>
            <span class="time-ago">({timeAgo(tower.first_seen_at)})</span>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .recent-towers {
    background: #1e1e2e;
    border-radius: 12px;
    padding: 1.5rem;
  }

  h3 {
    margin: 0 0 1rem;
    font-size: 1rem;
    color: #f4f4f5;
    font-weight: 600;
  }

  .towers-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .tower-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1rem;
    background: #27273a;
    border-radius: 8px;
    transition: background 0.2s;
    gap: 1rem;
  }

  .tower-item:hover {
    background: #323248;
  }

  .tower-main {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .tower-icon {
    font-size: 1.25rem;
    line-height: 1;
  }

  .tower-info {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .tower-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .rat-badge {
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    color: white;
  }

  .tower-id {
    font-size: 0.875rem;
    font-weight: 600;
    color: #f4f4f5;
  }

  .endc-badge {
    padding: 0.15rem 0.35rem;
    border-radius: 3px;
    font-size: 0.65rem;
    font-weight: 600;
    background: rgba(139, 92, 246, 0.2);
    color: #a78bfa;
  }

  .multi-provider-badge {
    padding: 0.15rem 0.35rem;
    border-radius: 3px;
    font-size: 0.65rem;
    font-weight: 600;
    background: rgba(251, 191, 36, 0.2);
    color: #fbbf24;
  }

  .tower-details {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    color: #a1a1aa;
  }

  .separator {
    color: #52525b;
  }

  .tower-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    font-size: 0.75rem;
    text-align: right;
  }

  .carrier {
    font-weight: 500;
  }

  .location {
    font-family: monospace;
    color: #71717a;
    font-size: 0.7rem;
  }

  .dates {
    display: flex;
    gap: 0.25rem;
    color: #52525b;
    font-size: 0.7rem;
  }

  .date-label {
    color: #52525b;
  }

  .date-value {
    color: #a1a1aa;
  }

  .time-ago {
    color: #71717a;
  }
</style>
