<script lang="ts">
  import { getCarrierName } from "../carriers";

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
    versions: ModelVersion[];
    selectedVersion: string;
    onVersionChange: (version: string) => void;
  }

  let { stats, versions, selectedVersion, onVersionChange }: Props = $props();

  function formatScore(score: number): string {
    return (score * 100).toFixed(1) + "%";
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

<div class="anomaly-stats">
  <div class="header">
    <div class="title-section">
      <h3>GNN Anomaly Detection</h3>
      <p class="subtitle">Towers with unusual network topology patterns</p>
    </div>
    <div class="version-selector">
      <label for="model-version">Model:</label>
      <select
        id="model-version"
        value={selectedVersion}
        onchange={(e) => onVersionChange((e.target as HTMLSelectElement).value)}
      >
        {#each versions as v}
          <option value={v.model_version}>
            {v.model_version}
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
</div>

<style>
  .anomaly-stats {
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

  .subtitle {
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
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
</style>
