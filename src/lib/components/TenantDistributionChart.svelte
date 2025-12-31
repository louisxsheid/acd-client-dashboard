<script lang="ts">
	interface TenantDistribution {
		singleTenant: number;
		twoTenants: number;
		threeTenants: number;
		fourPlusTenants: number;
	}

	interface Props {
		data: TenantDistribution;
	}

	let { data }: Props = $props();

	const total = $derived(
		data.singleTenant + data.twoTenants + data.threeTenants + data.fourPlusTenants
	);

	const items = $derived([
		{ label: 'Single Tenant', count: data.singleTenant, color: '#3b82f6' },
		{ label: '2 Tenants', count: data.twoTenants, color: '#8b5cf6' },
		{ label: '3 Tenants', count: data.threeTenants, color: '#22c55e' },
		{ label: '4+ Tenants', count: data.fourPlusTenants, color: '#f59e0b' }
	].filter(item => item.count > 0));

	const multiTenant = $derived(data.twoTenants + data.threeTenants + data.fourPlusTenants);
	const multiTenantPct = $derived(total > 0 ? (multiTenant / total) * 100 : 0);

	function getPercentage(count: number): number {
		return total > 0 ? (count / total) * 100 : 0;
	}
</script>

<div class="tenant-distribution">
	<div class="header">
		<h3>Tenant Distribution</h3>
		<span class="subtitle">Towers by number of carriers</span>
	</div>

	<!-- Stacked bar -->
	<div class="stacked-bar-container">
		<div class="stacked-bar">
			{#each items as item}
				{@const pct = getPercentage(item.count)}
				{#if pct > 0}
					<div
						class="bar-segment"
						style="width: {pct}%; background-color: {item.color}"
						title="{item.label}: {item.count} ({pct.toFixed(1)}%)"
					></div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Legend & Stats -->
	<div class="stats-grid">
		{#each items as item}
			{@const pct = getPercentage(item.count)}
			<div class="stat-item">
				<div class="stat-header">
					<span class="color-dot" style="background-color: {item.color}"></span>
					<span class="stat-label">{item.label}</span>
				</div>
				<div class="stat-value">
					<span class="count">{item.count.toLocaleString()}</span>
					<span class="percentage">{pct.toFixed(1)}%</span>
				</div>
			</div>
		{/each}
	</div>

	<!-- Multi-tenant summary -->
	<div class="summary">
		<div class="summary-item">
			<span class="summary-label">Multi-Tenant Towers</span>
			<span class="summary-value">{multiTenant.toLocaleString()} ({multiTenantPct.toFixed(1)}%)</span>
		</div>
	</div>
</div>

<style>
	.tenant-distribution {
		background-color: #1e1e2e;
		border-radius: 12px;
		padding: 1.25rem;
	}

	.header {
		margin-bottom: 1.25rem;
	}

	.header h3 {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.subtitle {
		font-size: 0.75rem;
		color: #71717a;
		margin-top: 0.25rem;
		display: block;
	}

	.stacked-bar-container {
		margin-bottom: 1.25rem;
	}

	.stacked-bar {
		display: flex;
		height: 24px;
		border-radius: 6px;
		overflow: hidden;
		background-color: #27273a;
	}

	.bar-segment {
		transition: width 0.3s ease;
	}

	.bar-segment:first-child {
		border-top-left-radius: 6px;
		border-bottom-left-radius: 6px;
	}

	.bar-segment:last-child {
		border-top-right-radius: 6px;
		border-bottom-right-radius: 6px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.stat-item {
		background-color: #27273a;
		border-radius: 8px;
		padding: 0.75rem;
	}

	.stat-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.375rem;
	}

	.color-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #a1a1aa;
	}

	.stat-value {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.count {
		font-size: 1.25rem;
		font-weight: 600;
		color: #f4f4f5;
		font-variant-numeric: tabular-nums;
	}

	.percentage {
		font-size: 0.75rem;
		color: #71717a;
	}

	.summary {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #3b3b50;
	}

	.summary-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.summary-label {
		font-size: 0.8125rem;
		color: #a1a1aa;
	}

	.summary-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	@media (max-width: 480px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
