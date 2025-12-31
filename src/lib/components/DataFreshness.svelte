<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Chart, registerables } from "chart.js";
  import {
    chartColors,
    chartFonts,
    tooltipConfig,
    legendConfig,
  } from "../chartConfig";

  Chart.register(...registerables);

  interface FreshnessData {
    label: string;
    count: number;
    color: string;
  }

  interface Props {
    data: FreshnessData[];
  }

  let { data }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  let total = $derived(data.reduce((sum, d) => sum + d.count, 0));
  let freshCount = $derived(data.slice(0, 3).reduce((sum, d) => sum + d.count, 0));
  let staleCount = $derived(data.slice(3).reduce((sum, d) => sum + d.count, 0));

  function createChart() {
    if (!canvas || data.length === 0) return;

    if (chart) {
      chart.destroy();
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.count),
            backgroundColor: data.map((d) => d.color),
            borderColor: chartColors.background,
            borderWidth: 2,
            hoverBorderColor: chartColors.text.primary,
            hoverBorderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: chartColors.text.secondary,
              padding: 12,
              usePointStyle: true,
              pointStyle: "circle",
              font: {
                size: chartFonts.size.sm,
              },
            },
          },
          tooltip: {
            ...tooltipConfig,
            callbacks: {
              label: function (context) {
                const value = context.parsed;
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                return `${value.toLocaleString()} towers (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  onMount(() => {
    setTimeout(() => {
      createChart();
    }, 50);
  });

  onDestroy(() => {
    if (chart) chart.destroy();
  });

  $effect(() => {
    if (data && canvas) {
      createChart();
    }
  });
</script>

<div class="data-freshness">
  <div class="chart-header">
    <div>
      <h3>Data Freshness</h3>
      <p class="description">When towers were last observed</p>
    </div>
    <span class="chart-total">{total.toLocaleString()} total</span>
  </div>

  <div class="chart-container">
    <canvas bind:this={canvas}></canvas>
    <div class="center-stat">
      <span class="center-value">{total.toLocaleString()}</span>
      <span class="center-label">Towers</span>
    </div>
  </div>

  <div class="freshness-summary">
    <div class="summary-item good">
      <span class="summary-label">Fresh (last 30 days)</span>
      <span class="summary-value">{freshCount.toLocaleString()}</span>
    </div>
    <div class="summary-item stale">
      <span class="summary-label">Stale (30+ days)</span>
      <span class="summary-value">{staleCount.toLocaleString()}</span>
    </div>
  </div>
</div>

<style>
  .data-freshness {
    background: #1e1e2e;
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    min-height: 280px;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  h3 {
    margin: 0;
    font-size: 0.9rem;
    color: #f4f4f5;
    font-weight: 600;
  }

  .description {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: #71717a;
  }

  .chart-total {
    font-size: 0.75rem;
    color: #71717a;
    font-variant-numeric: tabular-nums;
  }

  .chart-container {
    flex: 1;
    min-height: 160px;
    position: relative;
  }

  .center-stat {
    position: absolute;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
  }

  .center-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #f4f4f5;
    font-variant-numeric: tabular-nums;
  }

  .center-label {
    font-size: 0.65rem;
    color: #71717a;
    text-transform: uppercase;
  }

  .freshness-summary {
    display: flex;
    gap: 1rem;
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid #27273a;
  }

  .summary-item {
    flex: 1;
    background: #27273a;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .summary-label {
    font-size: 0.75rem;
    color: #a1a1aa;
  }

  .summary-value {
    font-size: 0.9rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .good .summary-value {
    color: #22c55e;
  }

  .stale .summary-value {
    color: #f59e0b;
  }
</style>
