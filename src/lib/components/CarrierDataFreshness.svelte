<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { Chart, registerables } from "chart.js";
	import { getCarrierName, getCarrierColorByName } from "$lib/carriers";
	import { chartColors, chartFonts, tooltipConfig } from "$lib/chartConfig";

	Chart.register(...registerables);

	interface CarrierFreshness {
		country_id: number;
		provider_id: number;
		name: string;
		total: number;
		fresh: number;
		recent: number;
		aging: number;
		stale: number;
		latestDate: string | null;
	}

	interface Props {
		carriers: CarrierFreshness[];
	}

	let { carriers }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	// Aggregate carriers by display name
	let aggregatedCarriers = $derived(() => {
		const carrierMap = new Map<string, CarrierFreshness>();

		carriers.forEach((c) => {
			const name = getCarrierName(c.country_id, c.provider_id);

			if (carrierMap.has(name)) {
				const existing = carrierMap.get(name)!;
				existing.total += c.total;
				existing.fresh += c.fresh;
				existing.recent += c.recent;
				existing.aging += c.aging;
				existing.stale += c.stale;
				// Keep the most recent date
				if (c.latestDate && (!existing.latestDate || c.latestDate > existing.latestDate)) {
					existing.latestDate = c.latestDate;
				}
			} else {
				carrierMap.set(name, {
					country_id: c.country_id,
					provider_id: c.provider_id,
					name,
					total: c.total,
					fresh: c.fresh,
					recent: c.recent,
					aging: c.aging,
					stale: c.stale,
					latestDate: c.latestDate,
				});
			}
		});

		// Sort by total descending and filter out carriers with no data
		return Array.from(carrierMap.values())
			.filter((c) => c.total > 0)
			.sort((a, b) => b.total - a.total)
			.slice(0, 8); // Top 8 carriers
	});

	// Calculate overall freshness score
	let overallStats = $derived(() => {
		const data = aggregatedCarriers();
		const totalAll = data.reduce((sum, c) => sum + c.total, 0);
		const freshAll = data.reduce((sum, c) => sum + c.fresh, 0);
		const staleAll = data.reduce((sum, c) => sum + c.stale, 0);
		return {
			total: totalAll,
			fresh: freshAll,
			stale: staleAll,
			freshPercent: totalAll > 0 ? Math.round((freshAll / totalAll) * 100) : 0,
		};
	});

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return "Unknown";
		const date = new Date(dateStr);
		const now = new Date();
		const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return "Today";
		if (diffDays === 1) return "Yesterday";
		if (diffDays < 7) return `${diffDays} days ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
		if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
		return `${Math.floor(diffDays / 365)}+ years ago`;
	}

	function getFreshnessColor(carrier: CarrierFreshness): string {
		const freshPct = carrier.total > 0 ? (carrier.fresh / carrier.total) * 100 : 0;
		if (freshPct >= 50) return "#22c55e"; // Green - mostly fresh
		if (freshPct >= 25) return "#f59e0b"; // Yellow - mixed
		return "#ef4444"; // Red - mostly stale
	}

	function createChart() {
		const data = aggregatedCarriers();
		if (!canvas || data.length === 0) return;

		if (chart) {
			chart.destroy();
		}

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const labels = data.map((c) => c.name);
		const colors = {
			fresh: "#22c55e",
			recent: "#3b82f6",
			aging: "#f59e0b",
			stale: "#71717a",
		};

		chart = new Chart(ctx, {
			type: "bar",
			data: {
				labels,
				datasets: [
					{
						label: "Fresh (<30d)",
						data: data.map((c) => c.fresh),
						backgroundColor: colors.fresh,
						borderRadius: 2,
					},
					{
						label: "Recent (30-90d)",
						data: data.map((c) => c.recent),
						backgroundColor: colors.recent,
						borderRadius: 2,
					},
					{
						label: "Aging (90d-1y)",
						data: data.map((c) => c.aging),
						backgroundColor: colors.aging,
						borderRadius: 2,
					},
					{
						label: "Stale (>1y)",
						data: data.map((c) => c.stale),
						backgroundColor: colors.stale,
						borderRadius: 2,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				indexAxis: "y",
				plugins: {
					legend: {
						position: "bottom",
						labels: {
							color: chartColors.text.secondary,
							padding: 16,
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
								const value = context.parsed.x ?? 0;
								const carrier = data[context.dataIndex];
								const total = carrier.total;
								const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
								return `${context.dataset.label}: ${value.toLocaleString()} (${pct}%)`;
							},
							afterBody: function (contexts) {
								const idx = contexts[0]?.dataIndex;
								if (idx === undefined) return [];
								const carrier = data[idx];
								return [`Total: ${carrier.total.toLocaleString()} sites`];
							},
						},
					},
				},
				scales: {
					x: {
						stacked: true,
						grid: {
							color: chartColors.grid,
						},
						ticks: {
							color: chartColors.text.muted,
							font: { size: chartFonts.size.xs },
							callback: function (value) {
								return Number(value).toLocaleString();
							},
						},
					},
					y: {
						stacked: true,
						grid: {
							display: false,
						},
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
			createChart();
		}, 50);
	});

	onDestroy(() => {
		if (chart) chart.destroy();
	});

	$effect(() => {
		if (carriers && canvas) {
			createChart();
		}
	});
</script>

<div class="carrier-freshness">
	<div class="section-header">
		<div>
			<h3>Data Freshness by Carrier</h3>
			<p class="description">When each carrier's tower data was last observed</p>
		</div>
		<div class="header-stats">
			<div class="stat fresh">
				<span class="stat-value">{overallStats().freshPercent}%</span>
				<span class="stat-label">Fresh Data</span>
			</div>
		</div>
	</div>

	<div class="content-grid">
		<div class="chart-section">
			<div class="chart-container">
				<canvas bind:this={canvas}></canvas>
			</div>
		</div>

		<div class="stats-section">
			<div class="carrier-list">
				{#each aggregatedCarriers() as carrier}
					{@const freshPct = carrier.total > 0 ? Math.round((carrier.fresh / carrier.total) * 100) : 0}
					{@const carrierColor = getCarrierColorByName(carrier.name)}
					<div class="carrier-item">
						<div class="carrier-info">
							<div class="carrier-name" style="--carrier-color: {carrierColor}">
								{carrier.name}
							</div>
							<div class="carrier-meta">
								<span class="latest-update">{formatDate(carrier.latestDate)}</span>
							</div>
						</div>
						<div class="carrier-bar-container">
							<div class="carrier-bar">
								<div
									class="bar-segment fresh"
									style="width: {carrier.total > 0 ? (carrier.fresh / carrier.total) * 100 : 0}%"
								></div>
								<div
									class="bar-segment recent"
									style="width: {carrier.total > 0 ? (carrier.recent / carrier.total) * 100 : 0}%"
								></div>
								<div
									class="bar-segment aging"
									style="width: {carrier.total > 0 ? (carrier.aging / carrier.total) * 100 : 0}%"
								></div>
								<div
									class="bar-segment stale"
									style="width: {carrier.total > 0 ? (carrier.stale / carrier.total) * 100 : 0}%"
								></div>
							</div>
							<span class="fresh-pct" class:good={freshPct >= 50} class:warning={freshPct >= 25 && freshPct < 50} class:poor={freshPct < 25}>
								{freshPct}%
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="freshness-legend">
		<div class="legend-item">
			<span class="legend-dot fresh"></span>
			<span class="legend-label">Fresh (&lt;30 days)</span>
		</div>
		<div class="legend-item">
			<span class="legend-dot recent"></span>
			<span class="legend-label">Recent (30-90 days)</span>
		</div>
		<div class="legend-item">
			<span class="legend-dot aging"></span>
			<span class="legend-label">Aging (90d-1yr)</span>
		</div>
		<div class="legend-item">
			<span class="legend-dot stale"></span>
			<span class="legend-label">Stale (&gt;1 year)</span>
		</div>
	</div>
</div>

<style>
	.carrier-freshness {
		background: #1e1e2e;
		border-radius: 12px;
		padding: 1.5rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}

	h3 {
		margin: 0;
		font-size: 1rem;
		color: #f4f4f5;
		font-weight: 600;
	}

	.description {
		margin: 0.25rem 0 0;
		font-size: 0.8rem;
		color: #71717a;
	}

	.header-stats {
		display: flex;
		gap: 1rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		padding: 0.5rem 1rem;
		background: #27273a;
		border-radius: 8px;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.stat.fresh .stat-value {
		color: #22c55e;
	}

	.stat-label {
		font-size: 0.7rem;
		color: #71717a;
		text-transform: uppercase;
	}

	.content-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	.chart-section {
		min-height: 300px;
	}

	.chart-container {
		height: 300px;
	}

	.stats-section {
		display: flex;
		flex-direction: column;
	}

	.carrier-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.carrier-item {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid #27273a;
	}

	.carrier-item:last-child {
		border-bottom: none;
	}

	.carrier-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.carrier-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: #f4f4f5;
		padding-left: 0.5rem;
		border-left: 3px solid var(--carrier-color, #71717a);
	}

	.carrier-meta {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.latest-update {
		font-size: 0.7rem;
		color: #71717a;
	}

	.carrier-bar-container {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.carrier-bar {
		flex: 1;
		height: 8px;
		background: #27273a;
		border-radius: 4px;
		display: flex;
		overflow: hidden;
	}

	.bar-segment {
		height: 100%;
		transition: width 0.3s ease;
	}

	.bar-segment.fresh {
		background: #22c55e;
	}

	.bar-segment.recent {
		background: #3b82f6;
	}

	.bar-segment.aging {
		background: #f59e0b;
	}

	.bar-segment.stale {
		background: #71717a;
	}

	.fresh-pct {
		font-size: 0.75rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		min-width: 40px;
		text-align: right;
	}

	.fresh-pct.good {
		color: #22c55e;
	}

	.fresh-pct.warning {
		color: #f59e0b;
	}

	.fresh-pct.poor {
		color: #ef4444;
	}

	.freshness-legend {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid #27273a;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.legend-dot.fresh {
		background: #22c55e;
	}

	.legend-dot.recent {
		background: #3b82f6;
	}

	.legend-dot.aging {
		background: #f59e0b;
	}

	.legend-dot.stale {
		background: #71717a;
	}

	.legend-label {
		font-size: 0.75rem;
		color: #a1a1aa;
	}

	@media (max-width: 900px) {
		.content-grid {
			grid-template-columns: 1fr;
		}

		.chart-section {
			order: 2;
		}

		.stats-section {
			order: 1;
		}
	}

	@media (max-width: 640px) {
		.freshness-legend {
			flex-wrap: wrap;
			gap: 0.75rem;
		}
	}
</style>
