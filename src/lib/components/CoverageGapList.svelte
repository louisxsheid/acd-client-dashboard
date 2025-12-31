<script lang="ts">
  interface CoverageGap {
    id: number;
    latitude: number;
    longitude: number;
    gap_confidence: number;
    gap_distance_m: number;
    tower_a_id: number | null;
    tower_b_id: number | null;
    tower_a_lat: number | null;
    tower_a_lng: number | null;
    tower_b_lat: number | null;
    tower_b_lng: number | null;
  }

  interface Props {
    gaps: CoverageGap[];
    onGapClick?: (gap: CoverageGap) => void;
  }

  let { gaps, onGapClick }: Props = $props();

  function formatPercent(val: number): string {
    return (val * 100).toFixed(1) + "%";
  }

  function formatDistance(meters: number): string {
    if (meters >= 1000) {
      return (meters / 1000).toFixed(1) + " km";
    }
    return meters.toFixed(0) + " m";
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.99) return "#ef4444";
    if (confidence >= 0.95) return "#f97316";
    if (confidence >= 0.90) return "#f59e0b";
    return "#22c55e";
  }

  function getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.99) return "Critical";
    if (confidence >= 0.95) return "High";
    if (confidence >= 0.90) return "Medium";
    return "Low";
  }
</script>

<div class="coverage-gap-list">
  <div class="header">
    <h3>Top Coverage Gap Candidates</h3>
    <p class="subtitle">Click to view on map - predicted locations where towers should exist</p>
  </div>

  <div class="gap-list">
    {#each gaps.slice(0, 20) as gap, i}
      <button
        class="gap-item"
        onclick={() => onGapClick?.(gap)}
        style="--confidence-color: {getConfidenceColor(gap.gap_confidence)}"
      >
        <div class="rank">#{i + 1}</div>
        <div class="gap-details">
          <div class="gap-location">
            <span class="coords">
              {gap.latitude.toFixed(4)}, {gap.longitude.toFixed(4)}
            </span>
          </div>
          <div class="gap-meta">
            <span class="distance">{formatDistance(gap.gap_distance_m)} gap</span>
            {#if gap.tower_a_id && gap.tower_b_id}
              <span class="towers">Tower #{gap.tower_a_id} ↔ #{gap.tower_b_id}</span>
            {/if}
          </div>
        </div>
        <div class="gap-scores">
          <div class="confidence-badge" style="background: {getConfidenceColor(gap.gap_confidence)}">
            {getConfidenceLabel(gap.gap_confidence)}
          </div>
          <div class="confidence-value">
            <span class="label">Conf:</span>
            <span class="value">{formatPercent(gap.gap_confidence)}</span>
          </div>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .coverage-gap-list {
    background: #1e1e2e;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .header {
    margin-bottom: 1rem;
  }

  h3 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    font-weight: 600;
    color: #f4f4f5;
  }

  .subtitle {
    margin: 0;
    font-size: 0.8125rem;
    color: #71717a;
  }

  .gap-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 400px;
    overflow-y: auto;
  }

  .gap-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background: #27273a;
    border: 1px solid transparent;
    border-left: 3px solid var(--confidence-color);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
    color: inherit;
    font: inherit;
  }

  .gap-item:hover {
    background: #2f2f42;
    border-color: var(--confidence-color);
  }

  .rank {
    font-size: 0.875rem;
    font-weight: 600;
    color: #71717a;
    min-width: 2rem;
  }

  .gap-details {
    flex: 1;
    min-width: 0;
  }

  .gap-location {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .coords {
    font-weight: 500;
    color: #f4f4f5;
    font-family: monospace;
    font-size: 0.875rem;
  }

  .gap-meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.8125rem;
    color: #a1a1aa;
    margin-top: 0.25rem;
  }

  .distance {
    color: #8b5cf6;
    font-weight: 500;
  }

  .towers {
    color: #71717a;
  }

  .gap-scores {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .confidence-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    color: white;
    text-transform: uppercase;
  }

  .confidence-value {
    font-size: 0.75rem;
    color: #71717a;
  }

  .confidence-value .label {
    margin-right: 0.25rem;
  }

  .confidence-value .value {
    color: #f4f4f5;
    font-weight: 500;
  }
</style>
