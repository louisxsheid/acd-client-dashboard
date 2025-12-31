<script lang="ts">
	interface GeographicDistribution {
		byState: { state: string; count: number }[];
		byCounty: { county: string; count: number }[];
	}

	interface Props {
		data: GeographicDistribution;
	}

	let { data }: Props = $props();

	let viewMode = $state<'state' | 'county'>('state');

	const items = $derived(
		viewMode === 'state'
			? data.byState.slice(0, 10)
			: data.byCounty.slice(0, 10)
	);

	const maxCount = $derived(
		items.length > 0 ? Math.max(...items.map(i => i.count)) : 0
	);

	const totalLocations = $derived(
		viewMode === 'state' ? data.byState.length : data.byCounty.length
	);
</script>

<div class="geographic-distribution">
	<div class="header">
		<div class="title-area">
			<h3>Geographic Distribution</h3>
			<span class="subtitle">Sites by location ({totalLocations} {viewMode === 'state' ? 'states' : 'counties'})</span>
		</div>
		<div class="view-toggle">
			<button
				class="toggle-btn"
				class:active={viewMode === 'state'}
				onclick={() => viewMode = 'state'}
			>
				State
			</button>
			<button
				class="toggle-btn"
				class:active={viewMode === 'county'}
				onclick={() => viewMode = 'county'}
			>
				County
			</button>
		</div>
	</div>

	<div class="bar-list">
		{#each items as item, i}
			{@const name = viewMode === 'state' ? (item as { state: string; count: number }).state : (item as { county: string; count: number }).county}
			{@const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0}
			<div class="bar-item">
				<div class="bar-label">
					<span class="rank">{i + 1}</span>
					<span class="name">{name}</span>
				</div>
				<div class="bar-container">
					<div
						class="bar-fill"
						style="width: {pct}%"
					></div>
					<span class="bar-value">{item.count.toLocaleString()}</span>
				</div>
			</div>
		{/each}
	</div>

	{#if (viewMode === 'state' && data.byState.length > 10) || (viewMode === 'county' && data.byCounty.length > 10)}
		<div class="more-info">
			+ {(viewMode === 'state' ? data.byState.length : data.byCounty.length) - 10} more
		</div>
	{/if}
</div>

<style>
	.geographic-distribution {
		background-color: #1e1e2e;
		border-radius: 12px;
		padding: 1.25rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.25rem;
		gap: 1rem;
	}

	.title-area h3 {
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

	.view-toggle {
		display: flex;
		background-color: #27273a;
		border-radius: 6px;
		padding: 2px;
	}

	.toggle-btn {
		padding: 0.375rem 0.75rem;
		background: none;
		border: none;
		border-radius: 4px;
		font-size: 0.75rem;
		color: #71717a;
		cursor: pointer;
		transition: all 0.15s;
	}

	.toggle-btn:hover {
		color: #a1a1aa;
	}

	.toggle-btn.active {
		background-color: #3b82f6;
		color: white;
	}

	.bar-list {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.bar-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.bar-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100px;
		flex-shrink: 0;
	}

	.rank {
		font-size: 0.6875rem;
		color: #52525b;
		width: 16px;
		text-align: right;
	}

	.name {
		font-size: 0.8125rem;
		color: #f4f4f5;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bar-container {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		height: 24px;
	}

	.bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #3b82f6, #8b5cf6);
		border-radius: 4px;
		min-width: 4px;
		transition: width 0.3s ease;
	}

	.bar-value {
		font-size: 0.75rem;
		font-weight: 600;
		color: #a1a1aa;
		font-variant-numeric: tabular-nums;
		min-width: 40px;
		text-align: right;
	}

	.more-info {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #3b3b50;
		font-size: 0.75rem;
		color: #71717a;
		text-align: center;
	}

	@media (max-width: 480px) {
		.header {
			flex-direction: column;
		}

		.bar-label {
			width: 80px;
		}
	}
</style>
