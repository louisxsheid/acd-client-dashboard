<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Chart, registerables } from "chart.js";
  import {
    chartColors,
    chartFonts,
    tooltipConfig,
    gridConfig,
  } from "../chartConfig";

  Chart.register(...registerables);

  interface BarData {
    name: string;
    count: number;
    color: string;
  }

  interface Props {
    title: string;
    data: BarData[];
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
      type: "bar",
      data: {
        labels: filteredData.map((d) => d.name),
        datasets: [
          {
            data: filteredData.map((d) => d.count),
            backgroundColor: filteredData.map((d) => d.color),
            borderColor: filteredData.map((d) => d.color),
            borderWidth: 0,
            borderRadius: 4,
            barThickness: 24,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            ...tooltipConfig,
            callbacks: {
              label: function (context) {
                const value = context.parsed.x ?? 0;
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                return `${value.toLocaleString()} (${pct}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: gridConfig,
            ticks: {
              color: chartColors.text.muted,
              font: {
                size: chartFonts.size.xs,
              },
              callback: function (value) {
                return Number(value).toLocaleString();
              },
            },
          },
          y: {
            grid: {
              display: false,
            },
            ticks: {
              color: chartColors.text.secondary,
              font: {
                size: chartFonts.size.sm,
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

<div class="bar-chart">
  <div class="chart-header">
    <h3>{title}</h3>
    <span class="chart-total">{total.toLocaleString()} total</span>
  </div>
  {#if filteredData.length === 0}
    <p class="no-data">No data available</p>
  {:else}
    <div class="chart-container">
      <canvas bind:this={canvas}></canvas>
    </div>
  {/if}
</div>

<style>
  .bar-chart {
    background: #1e1e2e;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  h3 {
    margin: 0;
    font-size: 0.9rem;
    color: #f4f4f5;
    font-weight: 600;
  }

  .chart-total {
    font-size: 0.75rem;
    color: #71717a;
    font-variant-numeric: tabular-nums;
  }

  .no-data {
    color: #71717a;
    font-size: 0.875rem;
    text-align: center;
    padding: 2rem 0;
  }

  .chart-container {
    height: 200px;
    position: relative;
  }
</style>
