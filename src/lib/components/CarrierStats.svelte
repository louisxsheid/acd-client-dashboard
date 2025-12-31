<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Chart, registerables } from "chart.js";
  import { getCarrierName, getCarrierColor, getCarrierColorByName } from "../carriers";
  import {
    chartColors,
    chartFonts,
    tooltipConfig,
    gridConfig,
  } from "../chartConfig";

  Chart.register(...registerables);

  interface CarrierData {
    id: number;
    country_id: number;
    provider_id: number;
    name: string | null;
    tower_providers_aggregate: {
      aggregate: {
        count: number;
      };
    };
    active_tower_providers: {
      aggregate: {
        count: number;
      };
    };
    endc_tower_providers: {
      aggregate: {
        count: number;
      };
    };
    lte_tower_providers: {
      aggregate: {
        count: number;
      };
    };
    nr_tower_providers: {
      aggregate: {
        count: number;
      };
    };
  }

  interface CombinationData {
    combination: string;
    tower_count: number;
  }

  interface Props {
    carriers: CarrierData[];
    combinations: CombinationData[];
    totalTowers: number;
    activeTowers: number;
    sharedTowers: number;
  }

  let { carriers, combinations, totalTowers, activeTowers, sharedTowers }: Props = $props();

  // Chart refs
  let endcCanvas: HTMLCanvasElement;
  let endcChart: Chart | null = null;
  let comboCanvas: HTMLCanvasElement;
  let comboChart: Chart | null = null;

  // Aggregate carriers by display name (combines multiple MCC-MNC codes)
  function aggregateCarriers() {
    const carrierMap = new Map<string, {
      name: string;
      color: string;
      total: number;
      active: number;
      endc: number;
      lte: number;
      nr: number;
    }>();

    carriers.forEach((c) => {
      const name = getCarrierName(c.country_id, c.provider_id);
      const color = getCarrierColorByName(name);
      const total = c.tower_providers_aggregate.aggregate.count;
      const active = c.active_tower_providers?.aggregate?.count ?? total;
      const endc = c.endc_tower_providers.aggregate.count;
      const lte = c.lte_tower_providers.aggregate.count;
      const nr = c.nr_tower_providers.aggregate.count;

      if (carrierMap.has(name)) {
        const existing = carrierMap.get(name)!;
        existing.total += total;
        existing.active += active;
        existing.endc += endc;
        existing.lte += lte;
        existing.nr += nr;
      } else {
        carrierMap.set(name, { name, color, total, active, endc, lte, nr });
      }
    });

    return Array.from(carrierMap.values())
      .filter((c) => c.total > 0)
      .sort((a, b) => b.endc - a.endc)
      .slice(0, 4);
  }

  let sortedCarriers = $derived(aggregateCarriers());

  function pct(value: number, total: number): string {
    if (total === 0) return "0%";
    return ((value / total) * 100).toFixed(1) + "%";
  }

  function getComboColor(combination: string): string {
    if (combination.includes("T-Mobile") && combination.includes("AT&T") && combination.includes("Verizon")) {
      return "#8b5cf6"; // Purple for all three
    }
    if (combination.includes("T-Mobile") && combination.includes("AT&T")) {
      return "#ec4899"; // Pink
    }
    if (combination.includes("T-Mobile") && combination.includes("Verizon")) {
      return "#f59e0b"; // Orange
    }
    if (combination.includes("AT&T") && combination.includes("Verizon")) {
      return "#3b82f6"; // Blue
    }
    return "#71717a"; // Gray default
  }

  function createEndcChart() {
    if (!endcCanvas || sortedCarriers.length === 0) return;

    if (endcChart) {
      endcChart.destroy();
    }

    const ctx = endcCanvas.getContext("2d");
    if (!ctx) return;

    endcChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sortedCarriers.map(c => c.name),
        datasets: [{
          data: sortedCarriers.map(c => c.endc),
          backgroundColor: sortedCarriers.map(c => c.color),
          borderColor: sortedCarriers.map(c => c.color),
          borderWidth: 0,
          borderRadius: 4,
          barThickness: 18,
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
                const endcPct = carrier.total > 0 ? ((carrier.endc / carrier.total) * 100).toFixed(1) : "0";
                return [
                  `EN-DC Sites: ${(context.parsed.x ?? 0).toLocaleString()}`,
                  `${endcPct}% of carrier sites`,
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

  function createComboChart() {
    if (!comboCanvas || combinations.length === 0) return;

    if (comboChart) {
      comboChart.destroy();
    }

    const ctx = comboCanvas.getContext("2d");
    if (!ctx) return;

    const combos = combinations.slice(0, 4);

    comboChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: combos.map(c => c.combination),
        datasets: [{
          data: combos.map(c => c.tower_count),
          backgroundColor: combos.map(c => getComboColor(c.combination)),
          borderColor: combos.map(c => getComboColor(c.combination)),
          borderWidth: 0,
          borderRadius: 4,
          barThickness: 18,
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
                const combo = combos[context.dataIndex];
                const pctVal = sharedTowers > 0 ? ((combo.tower_count / sharedTowers) * 100).toFixed(1) : "0";
                return [
                  `Shared Sites: ${(context.parsed.x ?? 0).toLocaleString()}`,
                  `${pctVal}% of shared sites`,
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
              font: { size: chartFonts.size.xs },
            },
          },
        },
      },
    });
  }

  onMount(() => {
    setTimeout(() => {
      createEndcChart();
      createComboChart();
    }, 50);
  });

  onDestroy(() => {
    if (endcChart) endcChart.destroy();
    if (comboChart) comboChart.destroy();
  });

  $effect(() => {
    if (sortedCarriers && endcCanvas) createEndcChart();
  });

  $effect(() => {
    if (combinations && comboCanvas) createComboChart();
  });
</script>

<div class="carrier-stats">
  <div class="section-header">
    <div class="header-title">
      <h3>Carrier Network Statistics</h3>
      <p class="section-subtitle">EN-DC capability and site sharing analysis</p>
    </div>
    <div class="header-stats">
      <div class="header-stat">
        <span class="stat-value">{activeTowers.toLocaleString()}</span>
        <span class="stat-label">Active Towers</span>
      </div>
      <div class="header-stat">
        <span class="stat-value">{(totalTowers - activeTowers).toLocaleString()}</span>
        <span class="stat-label">Decommissioned</span>
      </div>
      <div class="header-stat">
        <span class="stat-value">{sharedTowers.toLocaleString()}</span>
        <span class="stat-label">Shared Sites</span>
      </div>
      <div class="header-stat">
        <span class="stat-value">{pct(sharedTowers, activeTowers)}</span>
        <span class="stat-label">Shared %</span>
      </div>
    </div>
  </div>

  <div class="charts-row">
    <div class="chart-card">
      <div class="chart-header">
        <h4>EN-DC Capability by Carrier</h4>
        <p class="chart-desc">Sites with 5G NSA (EN-DC) support</p>
      </div>
      <div class="chart-body">
        <canvas bind:this={endcCanvas}></canvas>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-header">
        <h4>Shared Site Combinations</h4>
        <p class="chart-desc">Multi-carrier tower configurations</p>
      </div>
      <div class="chart-body">
        <canvas bind:this={comboCanvas}></canvas>
      </div>
    </div>
  </div>

  <!-- Quick Stats Table -->
  <div class="stats-table-card">
    <div class="chart-header">
      <h4>Carrier Breakdown</h4>
      <p class="chart-desc">Site counts by technology type (active sites exclude decommissioned towers)</p>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Carrier</th>
            <th class="right">Active</th>
            <th class="right">Total</th>
            <th class="right">EN-DC</th>
            <th class="right">LTE</th>
            <th class="right">5G NR</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedCarriers as carrier}
            <tr>
              <td class="carrier-cell">
                <span class="carrier-dot" style="background: {carrier.color}"></span>
                {carrier.name}
              </td>
              <td class="right num active">{carrier.active.toLocaleString()}</td>
              <td class="right num muted">{carrier.total.toLocaleString()}</td>
              <td class="right endc">{carrier.endc.toLocaleString()}</td>
              <td class="right lte">{carrier.lte.toLocaleString()}</td>
              <td class="right nr">{carrier.nr.toLocaleString()}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .carrier-stats {
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
    height: 140px;
  }

  .stats-table-card {
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

  .active {
    color: #22c55e;
    font-weight: 600;
  }

  .muted {
    color: #71717a;
    font-size: 0.75rem;
  }

  .endc {
    color: #8b5cf6;
  }

  .lte {
    color: #3b82f6;
  }

  .nr {
    color: #a78bfa;
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
