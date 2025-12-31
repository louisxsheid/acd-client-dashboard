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

  interface TimelineData {
    label: string;
    count: number;
    color: string;
  }

  interface Props {
    title: string;
    data: TimelineData[];
  }

  let { title, data }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  let total = $derived(data.reduce((sum, d) => sum + d.count, 0));

  function createChart() {
    if (!canvas || data.length === 0) return;

    if (chart) {
      chart.destroy();
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.count),
            backgroundColor: data.map((d) => d.color),
            borderColor: data.map((d) => d.color),
            borderWidth: 0,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            ...tooltipConfig,
            callbacks: {
              label: function (context) {
                const value = context.parsed.y ?? 0;
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                return `${value.toLocaleString()} towers (${pct}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: chartColors.text.muted,
              font: {
                size: chartFonts.size.sm,
              },
            },
          },
          y: {
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

<div class="timeline-chart">
  <div class="chart-header">
    <h3>{title}</h3>
    <span class="chart-total">{total.toLocaleString()} total</span>
  </div>
  <div class="chart-container">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .timeline-chart {
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
    align-items: center;
    margin-bottom: 1rem;
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

  .chart-container {
    flex: 1;
    min-height: 220px;
    position: relative;
  }
</style>
