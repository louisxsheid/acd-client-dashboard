<script lang="ts">
  interface Props {
    signalAvg: number | null;
    signalMin: number | null;
    signalMax: number | null;
    avgDownload: number | null;
    maxDownload: number | null;
    avgUpload: number | null;
    maxUpload: number | null;
    avgSnr: number | null;
    avgRsrq: number | null;
  }

  let {
    signalAvg,
    signalMin,
    signalMax,
    avgDownload,
    maxDownload,
    avgUpload,
    maxUpload,
    avgSnr,
    avgRsrq,
  }: Props = $props();

  function formatNum(val: number | null, decimals = 1): string {
    if (val === null) return "—";
    return val.toFixed(decimals);
  }
</script>

<div class="signal-stats">
  <h3>Network Quality Metrics</h3>

  <div class="stats-grid">
    <div class="stat-group">
      <div class="group-title">Signal Strength (dBm)</div>
      <div class="stat-row">
        <span class="stat-label">Average</span>
        <span class="stat-value">{formatNum(signalAvg, 0)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Range</span>
        <span class="stat-value">{formatNum(signalMin, 0)} to {formatNum(signalMax, 0)}</span>
      </div>
    </div>

    <div class="stat-group">
      <div class="group-title">Download Speed (Mbps)</div>
      <div class="stat-row">
        <span class="stat-label">Average</span>
        <span class="stat-value highlight-blue">{formatNum(avgDownload)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Max Recorded</span>
        <span class="stat-value">{formatNum(maxDownload)}</span>
      </div>
    </div>

    <div class="stat-group">
      <div class="group-title">Upload Speed (Mbps)</div>
      <div class="stat-row">
        <span class="stat-label">Average</span>
        <span class="stat-value highlight-purple">{formatNum(avgUpload)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Max Recorded</span>
        <span class="stat-value">{formatNum(maxUpload)}</span>
      </div>
    </div>

    <div class="stat-group">
      <div class="group-title">LTE Quality</div>
      <div class="stat-row">
        <span class="stat-label">Avg SNR</span>
        <span class="stat-value">{formatNum(avgSnr)} dB</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Avg RSRQ</span>
        <span class="stat-value">{formatNum(avgRsrq)} dB</span>
      </div>
    </div>
  </div>
</div>

<style>
  .signal-stats {
    background: #1e1e2e;
    border-radius: 12px;
    padding: 1.5rem;
  }

  h3 {
    margin: 0 0 1.25rem;
    font-size: 1rem;
    color: #f4f4f5;
    font-weight: 600;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1.5rem;
  }

  .stat-group {
    background: #27273a;
    border-radius: 8px;
    padding: 1rem;
  }

  .group-title {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #71717a;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.375rem 0;
  }

  .stat-row:not(:last-child) {
    border-bottom: 1px solid #1e1e2e;
  }

  .stat-label {
    font-size: 0.8rem;
    color: #a1a1aa;
  }

  .stat-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #f4f4f5;
    font-variant-numeric: tabular-nums;
  }

  .highlight-blue {
    color: #3b82f6;
  }

  .highlight-purple {
    color: #8b5cf6;
  }
</style>
