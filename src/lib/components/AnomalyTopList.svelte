<script lang="ts">
  import { getCarrierName, getCarrierColorByName } from "../carriers";

  interface AnomalyScore {
    tower_id: number;
    anomaly_score: number;
    percentile: number;
    link_pred_error: number | null;
    neighbor_inconsistency: number | null;
    tower: {
      latitude: number;
      longitude: number;
      tower_type: string | null;
      provider_count: number;
      tower_providers?: Array<{
        rat: string | null;
        provider: { country_id: number; provider_id: number };
      }>;
    };
  }

  interface Props {
    anomalies: AnomalyScore[];
    onTowerClick?: (anomaly: AnomalyScore) => void;
  }

  let { anomalies, onTowerClick }: Props = $props();

  function formatScore(score: number): string {
    return (score * 100).toFixed(1) + "%";
  }

  function formatPercentile(percentile: number): string {
    return percentile.toFixed(1) + "th";
  }

  function getAnomalyColor(percentile: number): string {
    if (percentile >= 99) return "#ef4444";
    if (percentile >= 95) return "#f97316";
    if (percentile >= 90) return "#f59e0b";
    return "#22c55e";
  }

  function getAnomalyLabel(percentile: number): string {
    if (percentile >= 99) return "Critical";
    if (percentile >= 95) return "High";
    if (percentile >= 90) return "Elevated";
    return "Normal";
  }

  function getTowerCarrier(tower: AnomalyScore["tower"]): string {
    if (!tower.tower_providers || tower.tower_providers.length === 0) {
      return "Unknown";
    }
    const primary = tower.tower_providers[0].provider;
    return getCarrierName(primary.country_id, primary.provider_id);
  }
</script>

<div class="top-anomalies">
  <div class="header">
    <h3>Top Anomalous Towers</h3>
    <p class="subtitle">
      Click to view on map - these may indicate missing links or coverage gaps
    </p>
  </div>

  <div class="anomaly-list">
    {#each anomalies.slice(0, 15) as anomaly, i}
      <button
        class="anomaly-item"
        onclick={() => onTowerClick?.(anomaly)}
        style="--severity-color: {getAnomalyColor(anomaly.percentile)}"
      >
        <div class="rank">#{i + 1}</div>
        <div class="anomaly-details">
          <div class="tower-id">
            Tower #{anomaly.tower_id}
            <span class="tower-type">{anomaly.tower.tower_type || "Unknown"}</span>
          </div>
          <div class="carrier">{getTowerCarrier(anomaly.tower)}</div>
        </div>
        <div class="anomaly-scores">
          <div class="score-badge" style="background: {getAnomalyColor(anomaly.percentile)}">
            {getAnomalyLabel(anomaly.percentile)}
          </div>
          <div class="score-value">
            <span class="label">Score:</span>
            <span class="value">{formatScore(anomaly.anomaly_score)}</span>
          </div>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .top-anomalies {
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

  .anomaly-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 400px;
    overflow-y: auto;
  }

  .anomaly-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background: #27273a;
    border: 1px solid transparent;
    border-left: 3px solid var(--severity-color);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
    color: inherit;
    font: inherit;
  }

  .anomaly-item:hover {
    background: #2f2f42;
    border-color: var(--severity-color);
  }

  .rank {
    font-size: 0.875rem;
    font-weight: 600;
    color: #71717a;
    min-width: 2rem;
  }

  .anomaly-details {
    flex: 1;
    min-width: 0;
  }

  .tower-id {
    font-weight: 500;
    color: #f4f4f5;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .tower-type {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    background: #3f3f5a;
    border-radius: 4px;
    color: #a1a1aa;
  }

  .carrier {
    font-size: 0.8125rem;
    color: #a1a1aa;
  }

  .anomaly-scores {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .score-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    color: white;
    text-transform: uppercase;
  }

  .score-value {
    font-size: 0.75rem;
    color: #71717a;
  }

  .score-value .label {
    margin-right: 0.25rem;
  }

  .score-value .value {
    color: #f4f4f5;
    font-weight: 500;
  }
</style>
