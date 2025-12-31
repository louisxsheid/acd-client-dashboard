<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Chart, registerables } from "chart.js";
  import { getCarrierName, getCarrierColor } from "../carriers";
  import {
    chartColors,
    chartFonts,
    tooltipConfig,
    legendConfig,
    gridConfig,
  } from "../chartConfig";

  Chart.register(...registerables);

  interface CarrierBandCount {
    country_id: number;
    provider_id: number;
    count: number;
  }

  interface BandPerTowerData {
    bands_count: number;
    tower_count: number;
    by_carrier: CarrierBandCount[];
  }

  interface BandComboData {
    band_combo: number[];
    carrier_id: number | null;
    country_id: number | null;
    provider_id: number | null;
    tower_count: number;
  }

  interface SpectrumTierData {
    tier: "low" | "mid" | "high";
    count: number;
  }

  interface BearingData {
    bearing_range: string;
    count: number;
  }

  interface CarrierBearingData {
    name: string;
    color: string;
    total: number;
    bearings: number[];
  }

  interface Props {
    bandsPerTower: BandPerTowerData[];
    topBandCombos: BandComboData[];
    spectrumTiers: SpectrumTierData[];
    bearingDistribution: BearingData[];
    carrierBearings: CarrierBearingData[];
    totalTowers: number;
    towersWithBands: number;
    towersWithBearing: number;
  }

  let {
    bandsPerTower,
    topBandCombos,
    spectrumTiers,
    bearingDistribution,
    carrierBearings,
    totalTowers,
    towersWithBands,
    towersWithBearing,
  }: Props = $props();

  // Chart references
  let bandsBarCanvas: HTMLCanvasElement;
  let bandsBarChart: Chart | null = null;
  let comboBarCanvas: HTMLCanvasElement;
  let comboBarChart: Chart | null = null;
  let tierDoughnutCanvas: HTMLCanvasElement;
  let tierDoughnutChart: Chart | null = null;

  // Individual radar charts for each carrier
  let radarCanvases: HTMLCanvasElement[] = [];
  let radarCharts: (Chart | null)[] = [];

  // Spectrum tier colors
  const tierColors: Record<string, string> = {
    low: "#22c55e",
    mid: "#3b82f6",
    high: "#8b5cf6",
  };

  const tierLabels: Record<string, string> = {
    low: "Low Band (<1 GHz)",
    mid: "Mid Band (1-6 GHz)",
    high: "High Band (>6 GHz)",
  };

  // Format band combo display
  function formatBandCombo(bands: number[]): string {
    return bands.map((b) => `B${b}`).join("+");
  }

  // Get color for band combo based on carrier
  function getComboColor(combo: BandComboData): string {
    if (combo.country_id && combo.provider_id) {
      return getCarrierColor(combo.country_id, combo.provider_id);
    }
    return "#71717a";
  }

  function getComboCarrier(combo: BandComboData): string {
    if (combo.country_id && combo.provider_id) {
      return getCarrierName(combo.country_id, combo.provider_id);
    }
    return "Mixed";
  }

  // Calculate spectrum tier percentages
  let tierTotal = $derived(spectrumTiers.reduce((sum, t) => sum + t.count, 0));

  // Bearing compass directions
  const compassLabels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

  // Top 3 carriers for radar charts
  let topCarriers = $derived(carrierBearings.slice(0, 3));

  // Create individual radar chart for a carrier
  function createCarrierRadarChart(index: number) {
    const canvas = radarCanvases[index];
    const carrier = topCarriers[index];

    if (!canvas || !carrier) return;

    // Destroy existing chart
    if (radarCharts[index]) {
      radarCharts[index]!.destroy();
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const color = carrier.color;
    const total = carrier.bearings.reduce((sum, b) => sum + b, 0);
    const data = carrier.bearings.map(b => total > 0 ? (b / total) * 100 : 0);

    // Calculate dynamic scale to emphasize differences
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    // Use a scale that starts slightly below min to show variation better
    const scaleMin = Math.max(0, minVal - 2);
    const scaleMax = maxVal + 2;

    radarCharts[index] = new Chart(ctx, {
      type: "radar",
      data: {
        labels: compassLabels,
        datasets: [{
          data,
          backgroundColor: color + "30",
          borderColor: color,
          borderWidth: 2,
          pointBackgroundColor: color,
          pointBorderColor: chartColors.surface,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipConfig,
            callbacks: {
              title: function(context) {
                return `${context[0].label}`;
              },
              label: function(context) {
                const count = carrier.bearings[context.dataIndex];
                const pct = context.parsed.r.toFixed(1);
                return `${count.toLocaleString()} cells (${pct}%)`;
              }
            }
          },
        },
        scales: {
          r: {
            angleLines: {
              color: chartColors.gridLight,
              lineWidth: 1,
            },
            grid: {
              color: chartColors.grid,
              lineWidth: 1,
              circular: true,
            },
            pointLabels: {
              color: chartColors.text.secondary,
              font: {
                size: 11,
                weight: "normal" as const,
                family: chartFonts.family,
              },
            },
            ticks: {
              display: false,
            },
            min: scaleMin,
            max: scaleMax,
          },
        },
      },
    });
  }

  function createAllRadarCharts() {
    for (let i = 0; i < topCarriers.length; i++) {
      createCarrierRadarChart(i);
    }
  }

  // Create horizontal stacked bar chart for bands per tower
  function createBandsBarChart() {
    if (!bandsBarCanvas || !bandsPerTower || bandsPerTower.length === 0) return;

    if (bandsBarChart) {
      bandsBarChart.destroy();
    }

    const ctx = bandsBarCanvas.getContext("2d");
    if (!ctx) return;

    // Aggregate carrier data by display name
    const carrierDataMap = new Map<string, { color: string; name: string; dataByBands: number[] }>();

    bandsPerTower.slice(0, 8).forEach((item, bandIndex) => {
      item.by_carrier?.forEach(c => {
        const name = getCarrierName(c.country_id, c.provider_id);
        const color = getCarrierColor(c.country_id, c.provider_id);

        if (!carrierDataMap.has(name)) {
          carrierDataMap.set(name, {
            name,
            color,
            dataByBands: new Array(8).fill(0),
          });
        }
        const existing = carrierDataMap.get(name)!;
        existing.dataByBands[bandIndex] += c.count;
      });
    });

    // Sort by total count
    const sortedCarriers = Array.from(carrierDataMap.values())
      .map(c => ({ ...c, total: c.dataByBands.reduce((sum, n) => sum + n, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);

    const datasets = sortedCarriers.map((carrier) => {
      const data = carrier.dataByBands;

      return {
        label: carrier.name,
        data,
        backgroundColor: carrier.color,
        borderColor: carrier.color,
        borderWidth: 0,
        borderRadius: 4,
        barPercentage: 0.85,
        categoryPercentage: 0.9,
      };
    });

    bandsBarChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: bandsPerTower.slice(0, 8).map(b => `${b.bands_count} bands`),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              ...legendConfig.labels,
              pointStyle: "rectRounded",
            },
          },
          tooltip: {
            ...tooltipConfig,
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${(context.parsed.x ?? 0).toLocaleString()} towers`;
              }
            }
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: gridConfig,
            ticks: {
              color: chartColors.text.muted,
              font: { size: chartFonts.size.xs },
              callback: function(value) {
                return Number(value).toLocaleString();
              }
            },
          },
          y: {
            stacked: true,
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

  // Create horizontal bar chart for band combinations
  function createComboBarChart() {
    if (!comboBarCanvas || !topBandCombos || topBandCombos.length === 0) return;

    if (comboBarChart) {
      comboBarChart.destroy();
    }

    const ctx = comboBarCanvas.getContext("2d");
    if (!ctx) return;

    const combos = topBandCombos.slice(0, 8);
    const labels = combos.map(c => `${formatBandCombo(c.band_combo)} (${getComboCarrier(c)})`);
    const colors = combos.map(c => getComboColor(c));

    comboBarChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: combos.map(c => c.tower_count),
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 0,
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.9,
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
                const combo = combos[context[0].dataIndex];
                return formatBandCombo(combo.band_combo);
              },
              label: function(context) {
                const combo = combos[context.dataIndex];
                return [
                  `Carrier: ${getComboCarrier(combo)}`,
                  `Towers: ${(context.parsed.x ?? 0).toLocaleString()}`,
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
                return Number(value).toLocaleString();
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

  // Create doughnut chart for spectrum tiers
  function createTierDoughnutChart() {
    if (!tierDoughnutCanvas || !spectrumTiers || spectrumTiers.length === 0) return;

    if (tierDoughnutChart) {
      tierDoughnutChart.destroy();
    }

    const ctx = tierDoughnutCanvas.getContext("2d");
    if (!ctx) return;

    tierDoughnutChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: spectrumTiers.map(t => tierLabels[t.tier]),
        datasets: [{
          data: spectrumTiers.map(t => t.count),
          backgroundColor: spectrumTiers.map(t => tierColors[t.tier]),
          borderColor: chartColors.surface,
          borderWidth: 3,
          hoverBorderColor: chartColors.text.primary,
          hoverBorderWidth: 2,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              ...legendConfig.labels,
              pointStyle: "rectRounded",
            },
          },
          tooltip: {
            ...tooltipConfig,
            callbacks: {
              label: function(context) {
                const pct = tierTotal > 0 ? ((context.parsed / tierTotal) * 100).toFixed(1) : "0";
                return `${context.parsed.toLocaleString()} bands (${pct}%)`;
              }
            }
          },
        },
      },
    });
  }

  onMount(() => {
    setTimeout(() => {
      createAllRadarCharts();
      createBandsBarChart();
      createComboBarChart();
      createTierDoughnutChart();
    }, 100);
  });

  onDestroy(() => {
    radarCharts.forEach(chart => chart?.destroy());
    if (bandsBarChart) bandsBarChart.destroy();
    if (comboBarChart) comboBarChart.destroy();
    if (tierDoughnutChart) tierDoughnutChart.destroy();
  });

  $effect(() => {
    if (carrierBearings && radarCanvases.length > 0) {
      createAllRadarCharts();
    }
  });

  $effect(() => {
    if (bandsPerTower && bandsBarCanvas) createBandsBarChart();
  });

  $effect(() => {
    if (topBandCombos && comboBarCanvas) createComboBarChart();
  });

  $effect(() => {
    if (spectrumTiers && tierDoughnutCanvas) createTierDoughnutChart();
  });
</script>

<div class="band-fingerprinting">
  <div class="section-header">
    <div class="header-title">
      <h3>Band Fingerprinting</h3>
      <p class="section-subtitle">Tower identification patterns for cell hunters</p>
    </div>
    <div class="header-stats">
      <div class="header-stat">
        <span class="stat-value">{towersWithBands.toLocaleString()}</span>
        <span class="stat-label">Towers with Band Data</span>
      </div>
      <div class="header-stat">
        <span class="stat-value">{towersWithBearing.toLocaleString()}</span>
        <span class="stat-label">Cells with Bearing</span>
      </div>
      <div class="header-stat">
        <span class="stat-value">{((towersWithBands / totalTowers) * 100).toFixed(1)}%</span>
        <span class="stat-label">Band Coverage</span>
      </div>
    </div>
  </div>

  <!-- Top row: Bands Per Tower + Spectrum Tiers -->
  <div class="chart-row two-col">
    <div class="chart-card">
      <div class="chart-header">
        <h4>Bands Per Tower</h4>
        <p class="chart-desc">Distribution of band count per tower, by carrier</p>
      </div>
      <div class="chart-body tall">
        <canvas bind:this={bandsBarCanvas}></canvas>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-header">
        <h4>Spectrum Tiers</h4>
        <p class="chart-desc">Band distribution by frequency tier</p>
      </div>
      <div class="chart-body doughnut">
        <canvas bind:this={tierDoughnutCanvas}></canvas>
        <div class="doughnut-center">
          <span class="doughnut-value">{tierTotal.toLocaleString()}</span>
          <span class="doughnut-label">Total Bands</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Band Combinations -->
  <div class="chart-row">
    <div class="chart-card full">
      <div class="chart-header">
        <h4>Carrier Band Signatures</h4>
        <p class="chart-desc">Most common band combinations by carrier - use these patterns to identify carrier towers in the field</p>
      </div>
      <div class="chart-body">
        <canvas bind:this={comboBarCanvas}></canvas>
      </div>
    </div>
  </div>

  <!-- Sector Bearings - 3 separate carrier charts -->
  <div class="chart-row">
    <div class="chart-card full">
      <div class="chart-header">
        <h4>Sector Bearing Patterns by Carrier</h4>
        <p class="chart-desc">Cell azimuth distribution showing sector orientation patterns - peaks indicate preferred directions aligned with roads or population centers</p>
      </div>

      <div class="radar-grid">
        {#each topCarriers as carrier, i}
          <div class="radar-card">
            <div class="radar-card-header">
              <span class="carrier-dot" style="background: {carrier.color}"></span>
              <span class="carrier-name">{carrier.name}</span>
              <span class="carrier-count">{carrier.total.toLocaleString()} cells</span>
            </div>
            <div class="radar-chart-container">
              <canvas bind:this={radarCanvases[i]}></canvas>
            </div>
          </div>
        {/each}
      </div>

      <div class="radar-footer">
        <div class="radar-legend">
          <span class="legend-note">Each chart shows the % distribution of cell sector orientations. A uniform distribution (12.5% per direction) indicates random placement.</span>
        </div>
        <div class="bearing-total">
          <span class="total-label">Total Cells with Bearing Data:</span>
          <span class="total-value">{towersWithBearing.toLocaleString()}</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .band-fingerprinting {
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

  /* Chart rows */
  .chart-row {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .chart-row:last-child {
    margin-bottom: 0;
  }

  .chart-row.two-col {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 1.5rem;
  }

  /* Chart cards */
  .chart-card {
    background: #27273a;
    border-radius: 10px;
    padding: 1.25rem;
    min-width: 0;
  }

  .chart-card.full {
    flex: 1;
  }

  .chart-header {
    margin-bottom: 1rem;
  }

  .chart-desc {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: #71717a;
    line-height: 1.4;
  }

  .chart-body {
    height: 220px;
    position: relative;
  }

  .chart-body.tall {
    height: 260px;
  }

  .chart-body.doughnut {
    height: 240px;
  }

  /* Doughnut center label */
  .doughnut-center {
    position: absolute;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
  }

  .doughnut-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 700;
    color: #f4f4f5;
    font-variant-numeric: tabular-nums;
  }

  .doughnut-label {
    display: block;
    font-size: 0.6rem;
    color: #71717a;
    text-transform: uppercase;
    margin-top: 0.125rem;
  }

  /* Radar grid - 3 carrier charts */
  .radar-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
    margin-bottom: 1rem;
  }

  .radar-card {
    background: #1e1e2e;
    border-radius: 8px;
    padding: 1rem;
  }

  .radar-card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #27273a;
  }

  .carrier-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .carrier-name {
    font-size: 0.85rem;
    color: #f4f4f5;
    font-weight: 600;
    flex: 1;
  }

  .carrier-count {
    font-size: 0.75rem;
    color: #71717a;
    font-variant-numeric: tabular-nums;
  }

  .radar-chart-container {
    aspect-ratio: 1;
    max-height: 200px;
  }

  .radar-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid #1e1e2e;
    gap: 1rem;
  }

  .radar-legend {
    flex: 1;
  }

  .legend-note {
    font-size: 0.75rem;
    color: #71717a;
    line-height: 1.4;
  }

  .bearing-total {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #1e1e2e;
    padding: 0.5rem 1rem;
    border-radius: 6px;
  }

  .total-label {
    font-size: 0.75rem;
    color: #a1a1aa;
  }

  .total-value {
    font-size: 0.9rem;
    font-weight: 700;
    color: #f4f4f5;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 1200px) {
    .radar-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 900px) {
    .chart-row {
      flex-direction: column;
    }

    .chart-row.two-col {
      grid-template-columns: 1fr;
    }

    .radar-grid {
      grid-template-columns: 1fr;
    }

    .section-header {
      flex-direction: column;
    }

    .header-stats {
      width: 100%;
      justify-content: space-between;
    }

    .radar-footer {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
