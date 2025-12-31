<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Chart, registerables } from "chart.js";
  import { getCarrierName, getCarrierColor, getCarrierColorByName } from "../carriers";
  import {
    chartColors,
    chartFonts,
    tooltipConfig,
    gridConfig,
    legendConfig,
  } from "../chartConfig";

  Chart.register(...registerables);

  interface CarrierCellData {
    country_id: number;
    provider_id: number;
    total_cells: number;
    cells_with_speed: number;
    avg_download: number | null;
    max_download: number | null;
    cells_with_snr: number;
    avg_snr: number | null;
  }

  interface BandData {
    band_number: number;
    band_name: string | null;
    count: number;
  }

  interface Props {
    carrierCells: CarrierCellData[];
    topBands: BandData[];
    totalCells: number;
    cellsWithSpeed: number;
    cellsWithSignal: number;
  }

  let { carrierCells, topBands, totalCells, cellsWithSpeed, cellsWithSignal }: Props = $props();

  // Chart refs
  let carrierBarCanvas: HTMLCanvasElement;
  let carrierBarChart: Chart | null = null;
  let bandsBarCanvas: HTMLCanvasElement;
  let bandsBarChart: Chart | null = null;

  // Aggregate carriers by display name (combines multiple MCC-MNC codes)
  function aggregateCarriers() {
    const carrierMap = new Map<string, {
      name: string;
      color: string;
      total_cells: number;
      cells_with_speed: number;
      cells_with_snr: number;
      avg_download_sum: number;
      avg_download_count: number;
      max_download: number;
      avg_snr_sum: number;
      avg_snr_count: number;
    }>();

    carrierCells.forEach((c) => {
      const name = getCarrierName(c.country_id, c.provider_id);
      const color = getCarrierColorByName(name);

      if (carrierMap.has(name)) {
        const existing = carrierMap.get(name)!;
        existing.total_cells += c.total_cells;
        existing.cells_with_speed += c.cells_with_speed;
        existing.cells_with_snr += c.cells_with_snr;
        if (c.avg_download !== null) {
          existing.avg_download_sum += c.avg_download * c.cells_with_speed;
          existing.avg_download_count += c.cells_with_speed;
        }
        if (c.max_download !== null && c.max_download > existing.max_download) {
          existing.max_download = c.max_download;
        }
        if (c.avg_snr !== null) {
          existing.avg_snr_sum += c.avg_snr * c.cells_with_snr;
          existing.avg_snr_count += c.cells_with_snr;
        }
      } else {
        carrierMap.set(name, {
          name,
          color,
          total_cells: c.total_cells,
          cells_with_speed: c.cells_with_speed,
          cells_with_snr: c.cells_with_snr,
          avg_download_sum: c.avg_download !== null ? c.avg_download * c.cells_with_speed : 0,
          avg_download_count: c.avg_download !== null ? c.cells_with_speed : 0,
          max_download: c.max_download || 0,
          avg_snr_sum: c.avg_snr !== null ? c.avg_snr * c.cells_with_snr : 0,
          avg_snr_count: c.avg_snr !== null ? c.cells_with_snr : 0,
        });
      }
    });

    return Array.from(carrierMap.values())
      .map((c) => ({
        name: c.name,
        color: c.color,
        total_cells: c.total_cells,
        cells_with_speed: c.cells_with_speed,
        avg_download: c.avg_download_count > 0 ? c.avg_download_sum / c.avg_download_count : null,
        max_download: c.max_download > 0 ? c.max_download : null,
        cells_with_snr: c.cells_with_snr,
        avg_snr: c.avg_snr_count > 0 ? c.avg_snr_sum / c.avg_snr_count : null,
        speedCoverage: c.total_cells > 0 ? (c.cells_with_speed / c.total_cells) * 100 : 0,
      }))
      .filter((c) => c.total_cells > 0)
      .sort((a, b) => b.total_cells - a.total_cells)
      .slice(0, 6);
  }

  let sortedCarriers = $derived(aggregateCarriers());

  function formatSpeed(speed: number | null): string {
    if (speed === null) return "—";
    return speed.toFixed(0) + " Mbps";
  }

  function getBandColor(bandNumber: number): string {
    // Low band (< 1GHz)
    if ([5, 12, 13, 14, 17, 26, 71].includes(bandNumber)) {
      return "#22c55e";
    }
    // Mid band
    if ([2, 4, 25, 30, 66].includes(bandNumber)) {
      return "#3b82f6";
    }
    // High band (mmWave, C-band)
    if ([41, 46, 48, 77, 258, 260, 261].includes(bandNumber)) {
      return "#8b5cf6";
    }
    return "#71717a";
  }

  function createCarrierBarChart() {
    if (!carrierBarCanvas || sortedCarriers.length === 0) return;

    if (carrierBarChart) {
      carrierBarChart.destroy();
    }

    const ctx = carrierBarCanvas.getContext("2d");
    if (!ctx) return;

    carrierBarChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sortedCarriers.map(c => c.name),
        datasets: [{
          data: sortedCarriers.map(c => c.total_cells),
          backgroundColor: sortedCarriers.map(c => c.color),
          borderColor: sortedCarriers.map(c => c.color),
          borderWidth: 0,
          borderRadius: 4,
          barThickness: 20,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipConfig,
            callbacks: {
              label: function(context) {
                const carrier = sortedCarriers[context.dataIndex];
                return [
                  `Cells: ${(context.parsed.x ?? 0).toLocaleString()}`,
                  `Speed coverage: ${carrier.speedCoverage.toFixed(0)}%`,
                ];
              }
            }
          },
        },
        scales: {
          x: {
            grid: gridConfig,
            ticks: {
              color: chartColors.text.muted,
              font: { size: chartFonts.size.xs },
              callback: function(value) {
                return (Number(value) / 1000).toFixed(0) + 'k';
              }
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: chartColors.text.secondary,
              font: { size: chartFonts.size.sm },
            },
          },
        },
      },
    });
  }

  function createBandsBarChart() {
    if (!bandsBarCanvas || topBands.length === 0) return;

    if (bandsBarChart) {
      bandsBarChart.destroy();
    }

    const ctx = bandsBarCanvas.getContext("2d");
    if (!ctx) return;

    const bands = topBands.slice(0, 6);

    bandsBarChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: bands.map(b => `B${b.band_number}`),
        datasets: [{
          data: bands.map(b => b.count),
          backgroundColor: bands.map(b => getBandColor(b.band_number)),
          borderColor: bands.map(b => getBandColor(b.band_number)),
          borderWidth: 0,
          borderRadius: 4,
          barThickness: 20,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipConfig,
            callbacks: {
              title: function(context) {
                const band = bands[context[0].dataIndex];
                return `Band ${band.band_number} - ${band.band_name || 'Unknown'}`;
              },
              label: function(context) {
                return `${(context.parsed.x ?? 0).toLocaleString()} cells`;
              }
            }
          },
        },
        scales: {
          x: {
            grid: gridConfig,
            ticks: {
              color: chartColors.text.muted,
              font: { size: chartFonts.size.xs },
              callback: function(value) {
                return (Number(value) / 1000).toFixed(0) + 'k';
              }
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: chartColors.text.secondary,
              font: { size: chartFonts.size.sm },
            },
          },
        },
      },
    });
  }

  onMount(() => {
    setTimeout(() => {
      createCarrierBarChart();
      createBandsBarChart();
    }, 50);
  });

  onDestroy(() => {
    if (carrierBarChart) carrierBarChart.destroy();
    if (bandsBarChart) bandsBarChart.destroy();
  });

  $effect(() => {
    if (sortedCarriers && carrierBarCanvas) createCarrierBarChart();
  });

  $effect(() => {
    if (topBands && bandsBarCanvas) createBandsBarChart();
  });
</script>

<div class="network-insights">
  <div class="section-header">
    <div class="header-title">
      <h3>Network Data Insights</h3>
      <p class="section-subtitle">Cell density and performance metrics by carrier</p>
    </div>
    <div class="header-stats">
      <div class="header-stat">
        <span class="stat-value">{totalCells.toLocaleString()}</span>
        <span class="stat-label">Total Cells</span>
      </div>
      <div class="header-stat">
        <span class="stat-value">{cellsWithSpeed.toLocaleString()}</span>
        <span class="stat-label">With Speed Data</span>
      </div>
      <div class="header-stat">
        <span class="stat-value">{((cellsWithSpeed / totalCells) * 100).toFixed(1)}%</span>
        <span class="stat-label">Speed Coverage</span>
      </div>
    </div>
  </div>

  <div class="charts-row">
    <div class="chart-card">
      <div class="chart-header">
        <h4>Cell Density by Carrier</h4>
        <p class="chart-desc">Total cells per carrier network</p>
      </div>
      <div class="chart-body">
        <canvas bind:this={carrierBarCanvas}></canvas>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-header">
        <h4>Top Spectrum Bands</h4>
        <p class="chart-desc">Most deployed LTE bands</p>
      </div>
      <div class="chart-body">
        <canvas bind:this={bandsBarCanvas}></canvas>
      </div>
      <div class="band-legend">
        <span class="legend-item"><span class="legend-dot low"></span>Low (&lt;1GHz)</span>
        <span class="legend-item"><span class="legend-dot mid"></span>Mid Band</span>
        <span class="legend-item"><span class="legend-dot high"></span>High Band</span>
      </div>
    </div>
  </div>

  <!-- Performance Table -->
  <div class="performance-section">
    <div class="chart-header">
      <h4>Network Performance by Carrier</h4>
      <p class="chart-desc">Speed and signal quality metrics</p>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Carrier</th>
            <th class="right">Cells</th>
            <th class="right">Avg DL</th>
            <th class="right">Max DL</th>
            <th class="right">Avg SNR</th>
            <th class="right">Coverage</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedCarriers.slice(0, 4) as carrier}
            <tr>
              <td class="carrier-cell">
                <span class="carrier-dot" style="background: {carrier.color}"></span>
                {carrier.name}
              </td>
              <td class="right num">{carrier.total_cells.toLocaleString()}</td>
              <td class="right speed">{formatSpeed(carrier.avg_download)}</td>
              <td class="right speed-max">{formatSpeed(carrier.max_download)}</td>
              <td class="right snr">{carrier.avg_snr ? carrier.avg_snr.toFixed(1) + " dB" : "—"}</td>
              <td class="right">
                <div class="coverage-cell">
                  <span class="coverage-bar">
                    <span class="coverage-fill" style="width: {carrier.speedCoverage}%"></span>
                  </span>
                  <span class="coverage-pct">{carrier.speedCoverage.toFixed(0)}%</span>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .network-insights {
    background: #1e1e2e;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .header-title {
    flex: 1;
    min-width: 200px;
  }

  h3 {
    margin: 0;
    font-size: 1rem;
    color: #f4f4f5;
    font-weight: 600;
  }

  .section-subtitle {
    margin: 0.25rem 0 0;
    font-size: 0.8rem;
    color: #71717a;
  }

  h4 {
    margin: 0;
    font-size: 0.875rem;
    color: #f4f4f5;
    font-weight: 600;
  }

  .header-stats {
    display: flex;
    gap: 2rem;
  }

  .header-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #f4f4f5;
    font-variant-numeric: tabular-nums;
  }

  .stat-label {
    font-size: 0.65rem;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .charts-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .chart-card {
    background: #27273a;
    border-radius: 10px;
    padding: 1.25rem;
  }

  .chart-header {
    margin-bottom: 1rem;
  }

  .chart-desc {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: #71717a;
  }

  .chart-body {
    height: 180px;
  }

  .band-legend {
    display: flex;
    gap: 1rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #1e1e2e;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    color: #71717a;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }

  .legend-dot.low { background: #22c55e; }
  .legend-dot.mid { background: #3b82f6; }
  .legend-dot.high { background: #8b5cf6; }

  .performance-section {
    background: #27273a;
    border-radius: 10px;
    padding: 1.25rem;
  }

  .table-container {
    overflow-x: auto;
    margin-top: 0.75rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    text-align: left;
    padding: 0.625rem 0.5rem;
    font-size: 0.65rem;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #1e1e2e;
    white-space: nowrap;
  }

  th.right {
    text-align: right;
  }

  td {
    padding: 0.625rem 0.5rem;
    font-size: 0.8rem;
    color: #e4e4e7;
    border-bottom: 1px solid #1e1e2e;
  }

  td.right {
    text-align: right;
  }

  td.num {
    font-variant-numeric: tabular-nums;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: #1e1e2e;
  }

  .carrier-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
  }

  .carrier-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .speed {
    color: #3b82f6;
  }

  .speed-max {
    color: #22c55e;
  }

  .snr {
    color: #f59e0b;
  }

  .coverage-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .coverage-bar {
    width: 40px;
    height: 6px;
    background: #1e1e2e;
    border-radius: 3px;
    overflow: hidden;
  }

  .coverage-fill {
    display: block;
    height: 100%;
    background: #8b5cf6;
    border-radius: 3px;
  }

  .coverage-pct {
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    min-width: 28px;
    text-align: right;
  }

  @media (max-width: 900px) {
    .charts-row {
      grid-template-columns: 1fr;
    }

    .section-header {
      flex-direction: column;
    }

    .header-stats {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
