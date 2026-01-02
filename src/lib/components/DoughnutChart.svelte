<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Chart, registerables } from "chart.js";
  import { chartColors, chartFonts, tooltipConfig } from "$lib/chartConfig";

  Chart.register(...registerables);

  interface ChartData {
    name: string;
    count: number;
    color: string;
  }

  interface Props {
    title: string;
    data: ChartData[];
  }

  let { title, data }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  let total = $derived(data.reduce((sum, d) => sum + d.count, 0));
  let filteredData = $derived(data.filter((d) => d.count > 0));

  function createChart() {
    if (!canvas || filteredData.length === 0) return;

    if (chart) {
      chart.destroy();
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: filteredData.map((d) => d.name),
        datasets: [
          {
            data: filteredData.map((d) => d.count),
            backgroundColor: filteredData.map((d) => d.color),
            borderColor: "#253448",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            ...tooltipConfig,
            callbacks: {
              label: function (context) {
                const value = context.parsed;
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                return context.label + ": " + value.toLocaleString() + " (" + pct + "%)";
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
    if (filteredData && canvas) {
      createChart();
    }
  });
</script>

<div class="doughnut-chart">
  <div class="chart-header">
    <h3>{title}</h3>
  </div>
  <div class="chart-content">
    {#if filteredData.length === 0}
      <p class="no-data">No data available</p>
    {:else}
      <div class="chart-wrapper">
        <div class="chart-container">
          <canvas bind:this={canvas}></canvas>
          <div class="chart-center">
            <span class="center-value">{total.toLocaleString()}</span>
            <span class="center-label">Total</span>
          </div>
        </div>
        <div class="chart-legend">
          {#each filteredData as item}
            <div class="legend-item">
              <span class="legend-dot" style="background: {item.color}"></span>
              <span class="legend-name">{item.name}</span>
              <span class="legend-value">{item.count.toLocaleString()}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .doughnut-chart {
    background: #253448;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .chart-header {
    margin-bottom: 1.25rem;
  }

  h3 {
    margin: 0;
    font-size: 0.9rem;
    color: #f4f4f5;
    font-weight: 600;
  }

  .chart-content {
    min-height: 200px;
  }

  .no-data {
    color: #71717a;
    font-size: 0.875rem;
    text-align: center;
    padding: 2rem 0;
  }

  .chart-wrapper {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .chart-container {
    position: relative;
    width: 140px;
    height: 140px;
    flex-shrink: 0;
  }

  .chart-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
  }

  .center-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: #f4f4f5;
    font-variant-numeric: tabular-nums;
  }

  .center-label {
    display: block;
    font-size: 0.65rem;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .chart-legend {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .legend-name {
    font-size: 0.75rem;
    color: #a1a1aa;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .legend-value {
    font-size: 0.75rem;
    font-weight: 600;
    color: #f4f4f5;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  @media (max-width: 480px) {
    .chart-wrapper {
      flex-direction: column;
    }
  }
</style>
