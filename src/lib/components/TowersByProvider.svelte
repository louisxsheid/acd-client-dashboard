<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Chart, registerables } from "chart.js";
  import { getCarrierName, getCarrierColorByName } from "../carriers";
  import {
    chartColors,
    chartFonts,
    tooltipConfig,
    gridConfig,
    legendConfig,
  } from "../chartConfig";

  Chart.register(...registerables);

  interface ProviderTowerData {
    country_id: number;
    provider_id: number;
    name: string | null;
    total: number;
    macro: number;
    micro: number;
    pico: number;
    das: number;
    cow: number;
    other: number;
  }

  interface Props {
    providers: ProviderTowerData[];
    totalTowers: number;
  }

  let { providers, totalTowers }: Props = $props();

  // Chart refs
  let stackedBarCanvas: HTMLCanvasElement;
  let stackedBarChart: Chart | null = null;

  // Site type colors
  const siteTypeColors: Record<string, string> = {
    macro: "#3b82f6",  // Blue
    micro: "#22c55e",  // Green
    pico: "#f59e0b",   // Amber
    das: "#8b5cf6",    // Purple
    cow: "#ec4899",    // Pink
    other: "#71717a",  // Gray
  };

  const siteTypeLabels: Record<string, string> = {
    macro: "Macro",
    micro: "Micro",
    pico: "Pico",
    das: "DAS",
    cow: "COW",
    other: "Other",
  };

  // Aggregate providers by display name
  function aggregateProviders() {
    const providerMap = new Map<string, {
      name: string;
      color: string;
      total: number;
      macro: number;
      micro: number;
      pico: number;
      das: number;
      cow: number;
      other: number;
    }>();

    providers.forEach((p) => {
      const name = getCarrierName(p.country_id, p.provider_id);
      const color = getCarrierColorByName(name);

      if (providerMap.has(name)) {
        const existing = providerMap.get(name)!;
        existing.total += p.total;
        existing.macro += p.macro;
        existing.micro += p.micro;
        existing.pico += p.pico;
        existing.das += p.das;
        existing.cow += p.cow;
        existing.other += p.other;
      } else {
        providerMap.set(name, {
          name,
          color,
          total: p.total,
          macro: p.macro,
          micro: p.micro,
          pico: p.pico,
          das: p.das,
          cow: p.cow,
          other: p.other,
        });
      }
    });

    return Array.from(providerMap.values())
      .filter((p) => p.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }

  let sortedProviders = $derived(aggregateProviders());

  function createStackedBarChart() {
    if (!stackedBarCanvas || sortedProviders.length === 0) return;

    if (stackedBarChart) {
      stackedBarChart.destroy();
    }

    const ctx = stackedBarCanvas.getContext("2d");
    if (!ctx) return;

    // Create datasets for each site type
    const siteTypes = ['macro', 'micro', 'pico', 'das', 'cow', 'other'] as const;

    const datasets = siteTypes
      .filter(type => sortedProviders.some(p => p[type] > 0))
      .map(type => ({
        label: siteTypeLabels[type],
        data: sortedProviders.map(p => p[type]),
        backgroundColor: siteTypeColors[type],
        borderColor: siteTypeColors[type],
        borderWidth: 0,
        borderRadius: 2,
      }));

    stackedBarChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sortedProviders.map(p => p.name),
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
              boxWidth: 12,
              boxHeight: 12,
            },
          },
          tooltip: {
            ...tooltipConfig,
            callbacks: {
              title: function(context) {
                return context[0].label;
              },
              label: function(context) {
                const provider = sortedProviders[context.dataIndex];
                const value = context.parsed.x ?? 0;
                const pct = provider.total > 0 ? ((value / provider.total) * 100).toFixed(1) : "0";
                return `${context.dataset.label}: ${value.toLocaleString()} (${pct}%)`;
              },
              afterBody: function(context) {
                const provider = sortedProviders[context[0].dataIndex];
                return [`Total: ${provider.total.toLocaleString()} towers`];
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
                return (Number(value) / 1000).toFixed(0) + 'k';
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

  onMount(() => {
    setTimeout(() => {
      createStackedBarChart();
    }, 50);
  });

  onDestroy(() => {
    if (stackedBarChart) stackedBarChart.destroy();
  });

  $effect(() => {
    if (sortedProviders && stackedBarCanvas) createStackedBarChart();
  });
</script>

<div class="towers-by-provider">
  <div class="section-header">
    <div class="header-title">
      <h3>Tower Distribution by Carrier</h3>
      <p class="section-subtitle">Total towers per carrier with site type breakdown</p>
    </div>
    <div class="header-stats">
      <div class="header-stat">
        <span class="stat-value">{totalTowers.toLocaleString()}</span>
        <span class="stat-label">Total Towers</span>
      </div>
      <div class="header-stat">
        <span class="stat-value">{sortedProviders.length}</span>
        <span class="stat-label">Carriers</span>
      </div>
    </div>
  </div>

  <div class="chart-card">
    <div class="chart-body">
      <canvas bind:this={stackedBarCanvas}></canvas>
    </div>
  </div>

  <!-- Summary table -->
  <div class="summary-table">
    <table>
      <thead>
        <tr>
          <th>Carrier</th>
          <th class="right">Total</th>
          <th class="right">Macro</th>
          <th class="right">Micro</th>
          <th class="right">Small Cell</th>
        </tr>
      </thead>
      <tbody>
        {#each sortedProviders as provider}
          <tr>
            <td class="carrier-cell">
              <span class="carrier-dot" style="background: {provider.color}"></span>
              {provider.name}
            </td>
            <td class="right num">{provider.total.toLocaleString()}</td>
            <td class="right macro">{provider.macro.toLocaleString()}</td>
            <td class="right micro">{provider.micro.toLocaleString()}</td>
            <td class="right small">{(provider.pico + provider.das + provider.cow).toLocaleString()}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .towers-by-provider {
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

  .chart-card {
    background: #27273a;
    border-radius: 10px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .chart-body {
    height: 180px;
  }

  .summary-table {
    background: #27273a;
    border-radius: 10px;
    padding: 1.25rem;
    overflow-x: auto;
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
    font-weight: 600;
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

  .macro {
    color: #3b82f6;
  }

  .micro {
    color: #22c55e;
  }

  .small {
    color: #f59e0b;
  }

  @media (max-width: 900px) {
    .section-header {
      flex-direction: column;
    }

    .header-stats {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
