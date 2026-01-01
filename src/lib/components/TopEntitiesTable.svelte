<script lang="ts">
	interface TopEntity {
		id: string;
		name: string;
		entityType: string | null;
		state: string | null;
		towerCount: number;
	}

	interface Props {
		entities: TopEntity[];
		totalCount: number;
		isLocked: boolean;
		onUnlock?: () => void;
	}

	let { entities, totalCount, isLocked, onUnlock }: Props = $props();

	const hiddenCount = $derived(totalCount - entities.length);

	function getTypeColor(type: string | null): string {
		switch (type) {
			case 'LLC': return '#3b82f6';
			case 'Trust': return '#8b5cf6';
			case 'Corporation': return '#22c55e';
			case 'Partnership': return '#f59e0b';
			case 'Individual': return '#ef4444';
			default: return '#71717a';
		}
	}
</script>

<div class="top-entities">
	<div class="table-header">
		<h3>Top Owners by Tower Count</h3>
		<span class="count-badge">{totalCount.toLocaleString()} total</span>
	</div>

	{#if entities.length > 0}
		<div class="table-container">
			<table>
				<thead>
					<tr>
						<th class="rank">#</th>
						<th class="name">Entity Name</th>
						<th class="type">Type</th>
						<th class="state">State</th>
						<th class="count">Towers</th>
					</tr>
				</thead>
				<tbody>
					{#each entities as entity, i}
						<tr>
							<td class="rank">{i + 1}</td>
							<td class="name">{entity.name}</td>
							<td class="type">
								<span class="type-badge" style="background: {getTypeColor(entity.entityType)}20; color: {getTypeColor(entity.entityType)}; border: 1px solid {getTypeColor(entity.entityType)}40;">
									{entity.entityType || 'Unknown'}
								</span>
							</td>
							<td class="state">{entity.state || '-'}</td>
							<td class="count">{entity.towerCount.toLocaleString()}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if isLocked && hiddenCount > 0}
			<button class="unlock-banner" type="button" onclick={onUnlock}>
				<div class="blur-overlay"></div>
				<div class="unlock-content">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
						<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
					</svg>
					<span>Unlock {hiddenCount.toLocaleString()} more entities</span>
				</div>
			</button>
		{/if}
	{:else}
		<div class="empty-state">No entity data available</div>
	{/if}
</div>

<style>
	.top-entities {
		background: #253448;
		border-radius: 12px;
		padding: 1.5rem;
	}

	.table-header {
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

	.count-badge {
		background: #2d3e52;
		color: rgba(255, 255, 255, 0.7);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
	}

	.table-container {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th, td {
		padding: 0.75rem 0.5rem;
		text-align: left;
		border-bottom: 1px solid #3d4f63;
	}

	th {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	td {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.rank {
		width: 40px;
		color: #71717a;
	}

	.name {
		min-width: 200px;
	}

	.type {
		width: 120px;
	}

	.type-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 500;
	}

	.state {
		width: 60px;
		color: rgba(255, 255, 255, 0.7);
	}

	.count {
		width: 80px;
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		color: #5EB1F7;
	}

	tbody tr:hover {
		background: rgba(94, 177, 247, 0.05);
	}

	.unlock-banner {
		position: relative;
		width: 100%;
		margin-top: 0.5rem;
		padding: 1rem;
		background: linear-gradient(180deg, transparent 0%, #0a1628 50%);
		border: 1px solid #3d4f63;
		border-radius: 8px;
		cursor: pointer;
		overflow: hidden;
	}

	.blur-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(37, 52, 72, 0) 0%, rgba(10, 22, 40, 0.95) 100%);
	}

	.unlock-content {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		color: #5EB1F7;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.unlock-banner:hover {
		border-color: #5EB1F7;
	}

	.unlock-banner:hover .unlock-content {
		color: #7CCFEE;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: #71717a;
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.name {
			min-width: 150px;
		}

		.type, .state {
			display: none;
		}
	}
</style>
