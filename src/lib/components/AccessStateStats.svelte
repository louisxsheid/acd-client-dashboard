<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Chart, registerables } from "chart.js";
  import { chartColors, chartFonts, tooltipConfig, gridConfig } from "$lib/chartConfig";
  import { getAccessStateColor, getCarrierColorByName } from "$lib/carriers";

  Chart.register(...registerables);

  interface AccessStateData {
    state: string;
    count: number;
  }

  interface CarrierData {
    carrier: string;
    count: number;
  }

  interface Props {
    accessStates: AccessStateData[];
    carriers: CarrierData[];
    totalTowers: number;
  }

  let { accessStates, carriers, totalTowers }: Props = $props();

  let accessCanvas: HTMLCanvasElement;
  let accessChart: Chart | null = null;
  let carrierCanvas: HTMLCanvasElement;
  let carrierChart: Chart | null = null;

  function pct(value: number, total: number): string {
    if (total === 0) return "0%";
    return ((value / total) * 100).toFixed(1) + "%";
  }

  function createAccessChart() {
    if (!accessCanvas || accessStates.length === 0) return;

    if (accessChart) {
      accessChart.destroy();
    }

    const ctx = accessCanvas.getContext("2d");
    if (!ctx) return;

    const data = accessStates.filter(s => s.count > 0);

    accessChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map(s => s.state),
        datasets: [{
          data: data.map(s => s.count),
          backgroundColor: data.map(s => getAccessStateColor(s.state)),
          borderColor: data.map(s => getAccessStateColor(s.state)),
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
                const value = context.parsed.x ?? 0;
                return value.toLocaleString() + " towers (" + pct(value, totalTowers) + ")";
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

  function createCarrierChart() {
    if (!carrierCanvas || carriers.length === 0) return;

    if (carrierChart) {
      carrierChart.destroy();
    }

    const ctx = carrierCanvas.getContext("2d");
    if (!ctx) return;

    const data = carriers.filter(c => c.count > 0).slice(0, 6);

    carrierChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map(c => c.carrier),
        datasets: [{
          data: data.map(c => c.count),
          backgroundColor: data.map(c => getCarrierColorByName(c.carrier)),
          borderColor: data.map(c => getCarrierColorByName(c.carrier)),
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
                const value = context.parsed.x ?? 0;
                return value.toLocaleString() + " towers (" + pct(value, totalTowers) + ")";
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
      createAccessChart();
      createCarrierChart();
    }, 50);
  });

  onDestroy(() => {
    if (accessChart) accessChart.destroy();
    if (carrierChart) carrierChart.destroy();
  });

  $effect(() => {
    if (accessStates && accessCanvas) createAccessChart();
  });

  $effect(() => {
    if (carriers && carrierCanvas) createCarrierChart();
  });
</script>

<div class="access-stats">
  <div class="section-header">
    <div class="header-title">
      <h3>Tower Access Statistics</h3>
      <p class="section-subtitle">Access levels and carrier distribution</p>
    </div>
    <div class="header-stats">
      <div class="header-stat">
        <span class="stat-value">{totalTowers.toLocaleString()}</span>
        <span class="stat-label">Total Towers</span>
      </div>
      {#each accessStates.slice(0, 3) as state}
        <div class="header-stat">
          <span class="stat-value" style="color: {getAccessStateColor(state.state)}">{state.count.toLocaleString()}</span>
          <span class="stat-label">{state.state}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="charts-row">
    <div class="chart-card">
      <div class="chart-header">
        <h4>Access State Distribution</h4>
        <p class="chart-desc">Towers by access level</p>
      </div>
      <div class="chart-body">
        <canvas bind:this={accessCanvas}></canvas>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-header">
        <h4>Carrier Distribution</h4>
        <p class="chart-desc">Towers by carrier</p>
      </div>
      <div class="chart-body">
        <canvas bind:this={carrierCanvas}></canvas>
      </div>
    </div>
  </div>

  <div class="stats-table-card">
    <div class="chart-header">
      <h4>Access State Details</h4>
      <p class="chart-desc">Breakdown by access level</p>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Access State</th>
            <th class="right">Tower Count</th>
            <th class="right">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {#each accessStates as state}
            <tr>
              <td class="state-cell">
                <span class="state-dot" style="background: {getAccessStateColor(state.state)}"></span>
                {state.state}
              </td>
              <td class="right num">{state.count.toLocaleString()}</td>
              <td class="right pct">{pct(state.count, totalTowers)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .access-stats {
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
    font-weight: 500;
  }

  td.pct {
    color: #71717a;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: #1e1e2e;
  }

  .state-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
  }

  .state-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
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
