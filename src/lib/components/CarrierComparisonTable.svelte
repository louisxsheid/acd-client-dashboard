<script lang="ts">
	interface CarrierStats {
		name: string;
		color: string;
		towerCount: number;
		endcCount: number;
		endcPercent: number;
	}

	interface Props {
		carriers: CarrierStats[];
		totalCarriers: number;
		isLocked: boolean;
		onUnlock?: () => void;
	}

	let { carriers, totalCarriers, isLocked, onUnlock }: Props = $props();

	const hiddenCount = $derived(totalCarriers - carriers.length);
	const maxTowers = $derived(Math.max(...carriers.map(c => c.towerCount), 1));
</script>

<div class="carrier-comparison">
	<div class="table-header">
		<h3>Carrier Comparison</h3>
		<span class="count-badge">{totalCarriers} carriers</span>
	</div>

	{#if carriers.length > 0}
		<div class="table-container">
			<table>
				<thead>
					<tr>
						<th class="carrier">Carrier</th>
						<th class="towers">Sites</th>
						<th class="bar"></th>
						<th class="endc">5G Rate</th>
					</tr>
				</thead>
				<tbody>
					{#each carriers as carrier}
						<tr>
							<td class="carrier">
								<span class="carrier-dot" style="background: {carrier.color};"></span>
								<span class="carrier-name">{carrier.name}</span>
							</td>
							<td class="towers">{carrier.towerCount.toLocaleString()}</td>
							<td class="bar">
								<div class="bar-container">
									<div
										class="bar-fill"
										style="width: {(carrier.towerCount / maxTowers) * 100}%; background: {carrier.color};"
									></div>
								</div>
							</td>
							<td class="endc">
								<span class="endc-badge" class:high={carrier.endcPercent >= 50} class:medium={carrier.endcPercent >= 25 && carrier.endcPercent < 50} class:low={carrier.endcPercent < 25}>
									{carrier.endcPercent}%
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if isLocked && hiddenCount > 0}
			<button class="unlock-banner" type="button" onclick={onUnlock}>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
					<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
				</svg>
				<span>Unlock {hiddenCount} more carriers</span>
			</button>
		{/if}
	{:else}
		<div class="empty-state">No carrier data available</div>
	{/if}
</div>

<style>
	.carrier-comparison {
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

	.carrier {
		width: 150px;
	}

	.carrier td {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.carrier-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.carrier-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.towers {
		width: 70px;
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: rgba(255, 255, 255, 0.7);
	}

	.bar {
		width: 120px;
		padding: 0 0.5rem;
	}

	.bar-container {
		width: 100%;
		height: 8px;
		background: #1D2C43;
		border-radius: 4px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.5s ease;
		min-width: 4px;
	}

	.endc {
		width: 80px;
		text-align: right;
	}

	.endc-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.endc-badge.high {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
	}

	.endc-badge.medium {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.endc-badge.low {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	tbody tr:hover {
		background: rgba(94, 177, 247, 0.05);
	}

	.unlock-banner {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.75rem;
		background: #0a1628;
		border: 1px solid #3d4f63;
		border-radius: 8px;
		color: #5EB1F7;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.unlock-banner:hover {
		border-color: #5EB1F7;
		background: #0f1e32;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: #71717a;
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.bar {
			display: none;
		}
	}
</style>
