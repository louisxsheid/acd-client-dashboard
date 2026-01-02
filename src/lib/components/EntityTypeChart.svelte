<script lang="ts">
	import DoughnutChart from './DoughnutChart.svelte';

	interface Props {
		data: { name: string; count: number; color: string }[];
	}

	let { data }: Props = $props();

	const total = $derived(data.reduce((sum, d) => sum + d.count, 0));
</script>

<div class="entity-type-chart">
	<div class="chart-header">
		<h3>Ownership Distribution</h3>
		<span class="total-badge">{total.toLocaleString()} entities</span>
	</div>
	{#if data.length > 0}
		<DoughnutChart {data} title="" />
	{:else}
		<div class="empty-state">No entity data available</div>
	{/if}
</div>

<style>
	.entity-type-chart {
		background: #253448;
		border-radius: 12px;
		padding: 1rem;
		overflow: hidden;
	}

	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	h3 {
		margin: 0;
		font-size: 0.9rem;
		color: #f4f4f5;
		font-weight: 600;
	}

	.total-badge {
		background: #2d3e52;
		color: rgba(255, 255, 255, 0.7);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: #71717a;
		font-size: 0.875rem;
	}

	:global(.entity-type-chart .doughnut-chart) {
		background: transparent;
		padding: 0;
	}
</style>
