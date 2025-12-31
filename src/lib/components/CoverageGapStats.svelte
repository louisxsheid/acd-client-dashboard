<script lang="ts">
  interface Stats {
    total: number;
    highConfidence: number;
    avgConfidence: number;
    avgDistance: number;
    missingLinks: number;
    avgLinkProbability: number;
    run_id: string | null;
    created_at: string | null;
  }

  interface ModelVersion {
    model_version: string;
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

  function formatPercent(val: number): string {
    return (val * 100).toFixed(1) + "%";
  }

  function formatDistance(meters: number): string {
    if (meters >= 1000) {
      return (meters / 1000).toFixed(1) + " km";
    }
    return meters.toFixed(0) + " m";
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

<div class="coverage-gap-stats">
  <div class="header">
    <div class="title-section">
      <h3>Coverage Gap Detection</h3>
      <p class="subtitle">Predicted locations where towers should exist but don't</p>
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
    <div class="stat-card highlight-primary">
      <div class="stat-value">{stats.total.toLocaleString()}</div>
      <div class="stat-label">Gap Candidates</div>
    </div>
    <div class="stat-card highlight-warning">
      <div class="stat-value">{stats.highConfidence.toLocaleString()}</div>
      <div class="stat-label">High Confidence (95%+)</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{formatPercent(stats.avgConfidence)}</div>
      <div class="stat-label">Avg Confidence</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{formatDistance(stats.avgDistance)}</div>
      <div class="stat-label">Avg Gap Distance</div>
    </div>
  </div>

  <div class="missing-links-section">
    <div class="section-header">
      <span class="section-icon">--</span>
      <span class="section-title">Missing Links</span>
    </div>
    <div class="links-stats">
      <div class="link-stat">
        <span class="link-value">{stats.missingLinks.toLocaleString()}</span>
        <span class="link-label">Predicted Missing</span>
      </div>
      <div class="link-stat">
        <span class="link-value">{formatPercent(stats.avgLinkProbability)}</span>
        <span class="link-label">Avg Probability</span>
      </div>
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
  .coverage-gap-stats {
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
    border-color: #8b5cf6;
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

  .stat-card.highlight-primary {
    border: 1px solid rgba(139, 92, 246, 0.3);
    background: rgba(139, 92, 246, 0.1);
  }

  .stat-card.highlight-warning {
    border: 1px solid rgba(249, 115, 22, 0.3);
    background: rgba(249, 115, 22, 0.1);
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

  .missing-links-section {
    background: #27273a;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .section-icon {
    color: #8b5cf6;
    font-weight: bold;
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: #f4f4f5;
  }

  .links-stats {
    display: flex;
    gap: 2rem;
  }

  .link-stat {
    display: flex;
    flex-direction: column;
  }

  .link-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f4f4f5;
  }

  .link-label {
    font-size: 0.75rem;
    color: #71717a;
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
