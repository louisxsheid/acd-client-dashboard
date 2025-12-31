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

  interface ModelVersion {
    model_version: string;
    run_id: string | null;
    created_at: string | null;
  }

  interface Stats {
    total: number;
    mean: number;
    std: number;
    min: number;
    max: number;
    above95: number;
    above99: number;
    run_id: string | null;
    created_at: string | null;
  }

  interface Props {
    stats: Stats;
    topAnomalies: AnomalyScore[];
    versions: ModelVersion[];
    selectedVersion: string;
    onVersionChange: (version: string) => void;
    onTowerClick?: (tower: AnomalyScore) => void;
  }

  let { stats, topAnomalies, versions, selectedVersion, onVersionChange, onTowerClick }: Props = $props();

  function formatScore(score: number): string {
    return (score * 100).toFixed(1) + "%";
  }

  function formatPercentile(percentile: number): string {
    return percentile.toFixed(1) + "th";
  }

  function getAnomalyColor(percentile: number): string {
    if (percentile >= 99) return "#ef4444"; // Red - Critical
    if (percentile >= 95) return "#f97316"; // Orange - High
    if (percentile >= 90) return "#f59e0b"; // Amber - Elevated
    return "#22c55e"; // Green - Normal
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

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Unknown";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
</script>

<div class="anomaly-container">
  <div class="header">
    <div class="title-section">
      <h3>GNN Anomaly Detection</h3>
      <p class="subtitle">Towers with unusual network topology patterns</p>
    </div>
    <div class="version-selector">
      <label for="model-version">Model Version:</label>
      <select
        id="model-version"
        value={selectedVersion}
        onchange={(e) => onVersionChange((e.target as HTMLSelectElement).value)}
      >
        {#each versions as v}
          <option value={v.model_version}>
            {v.model_version}
            {#if v.run_id}
              ({v.run_id})
            {/if}
          </option>
        {/each}
      </select>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">{stats.total.toLocaleString()}</div>
      <div class="stat-label">Towers Scored</div>
    </div>
    <div class="stat-card highlight-warning">
      <div class="stat-value">{stats.above95.toLocaleString()}</div>
      <div class="stat-label">Above 95th Percentile</div>
    </div>
    <div class="stat-card highlight-danger">
      <div class="stat-value">{stats.above99.toLocaleString()}</div>
      <div class="stat-label">Above 99th Percentile</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{formatScore(stats.mean)}</div>
      <div class="stat-label">Mean Score</div>
    </div>
  </div>

  <div class="run-info">
    <span class="run-label">Run ID:</span>
    <span class="run-value">{stats.run_id || "N/A"}</span>
    <span class="run-separator">|</span>
    <span class="run-label">Created:</span>
    <span class="run-value">{formatDate(stats.created_at)}</span>
  </div>

  <div class="top-anomalies">
    <h4>Top Anomalous Towers</h4>
    <p class="section-subtitle">
      These towers have unusual connectivity patterns that may indicate missing links or coverage gaps
    </p>

    <div class="anomaly-list">
      {#each topAnomalies.slice(0, 20) as anomaly, i}
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
            <div class="coords">
              {anomaly.tower.latitude.toFixed(4)}, {anomaly.tower.longitude.toFixed(4)}
            </div>
          </div>
          <div class="anomaly-scores">
            <div class="score-badge" style="background: {getAnomalyColor(anomaly.percentile)}">
              {getAnomalyLabel(anomaly.percentile)}
            </div>
            <div class="score-value">
              <span class="label">Score:</span>
              <span class="value">{formatScore(anomaly.anomaly_score)}</span>
            </div>
            <div class="score-value">
              <span class="label">Percentile:</span>
              <span class="value">{formatPercentile(anomaly.percentile)}</span>
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>

  <div class="interpretation">
    <h4>How to Interpret</h4>
    <div class="interpretation-content">
      <div class="metric">
        <span class="metric-name">Anomaly Score</span>
        <span class="metric-desc">Combined score (0-100%). Higher = more unusual topology.</span>
      </div>
      <div class="metric">
        <span class="metric-name">Link Pred Error</span>
        <span class="metric-desc">How poorly the GNN predicts this tower's connections.</span>
      </div>
      <div class="metric">
        <span class="metric-name">Neighbor Inconsistency</span>
        <span class="metric-desc">How different this tower is from nearby towers.</span>
      </div>
    </div>
    <p class="interpretation-note">
      High-scoring towers may indicate: missing tower data, unusual deployments, or potential coverage gaps.
      Click a tower to view it on the map.
    </p>
  </div>
</div>

<style>
  .anomaly-container {
    background: #1e1e2e;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #f4f4f5;
  }

  h4 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    font-weight: 600;
    color: #f4f4f5;
  }

  .subtitle {
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    color: #71717a;
  }

  .section-subtitle {
    margin: 0 0 1rem;
    font-size: 0.8125rem;
    color: #71717a;
  }

  .version-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .version-selector label {
    font-size: 0.875rem;
    color: #a1a1aa;
  }

  .version-selector select {
    background: #27273a;
    border: 1px solid #3f3f5a;
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    color: #f4f4f5;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .version-selector select:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .stat-card {
    background: #27273a;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
  }

  .stat-card.highlight-warning {
    border: 1px solid rgba(249, 115, 22, 0.3);
    background: rgba(249, 115, 22, 0.1);
  }

  .stat-card.highlight-danger {
    border: 1px solid rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.1);
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f4f4f5;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #71717a;
    margin-top: 0.25rem;
  }

  .run-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: #71717a;
    margin-bottom: 1.5rem;
    padding: 0.75rem;
    background: #27273a;
    border-radius: 6px;
  }

  .run-label {
    color: #a1a1aa;
  }

  .run-value {
    color: #f4f4f5;
    font-family: monospace;
  }

  .run-separator {
    color: #3f3f5a;
  }

  .top-anomalies {
    margin-bottom: 1.5rem;
  }

  .anomaly-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 500px;
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
    min-width: 2.5rem;
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

  .coords {
    font-size: 0.75rem;
    color: #71717a;
    font-family: monospace;
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

  .interpretation {
    background: #27273a;
    border-radius: 8px;
    padding: 1rem;
  }

  .interpretation-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .metric {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .metric-name {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #f4f4f5;
  }

  .metric-desc {
    font-size: 0.75rem;
    color: #71717a;
  }

  .interpretation-note {
    margin: 0;
    font-size: 0.75rem;
    color: #a1a1aa;
    font-style: italic;
  }
</style>
