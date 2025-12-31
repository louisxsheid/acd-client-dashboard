<script lang="ts">
	import StatCard from '$lib/components/StatCard.svelte';
	import BarChart from '$lib/components/BarChart.svelte';
	import DoughnutChart from '$lib/components/DoughnutChart.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Analytics - Tower Portfolio</title>
</svelte:head>

<div class="analytics-page">
	<header class="page-header">
		<h1>Analytics</h1>
		<p class="subtitle">Tower portfolio statistics and insights</p>
	</header>

	{#if data.error}
		<div class="error-banner">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"/>
				<line x1="12" x2="12" y1="8" y2="12"/>
				<line x1="12" x2="12.01" y1="16" y2="16"/>
			</svg>
			<span>{data.error}</span>
		</div>
	{/if}

	<!-- Stats Cards -->
	<section class="stats-grid fade-in-up">
		<StatCard
			title="Total Towers"
			value={data.totalTowers}
			icon="📡"
			color="#3b82f6"
		/>
		<StatCard
			title="Tower Sites"
			value={data.totalSites}
			icon="📍"
			color="#8b5cf6"
		/>
		<StatCard
			title="Portfolios"
			value={data.totalEntities}
			icon="🏢"
			color="#22c55e"
		/>
		<StatCard
			title="Carriers"
			value={data.uniqueCarriers?.length || 0}
			icon="📱"
			color="#f59e0b"
		/>
		<StatCard
			title="States"
			value={data.states?.length || 0}
			icon="🗺️"
			color="#ec4899"
		/>
	</section>

	<!-- Distribution Charts -->
	<section class="charts-grid fade-in-up delay-1">
		{#if data.typeData && data.typeData.length > 0}
			<BarChart title="Towers by Type" data={data.typeData} />
		{/if}

		{#if data.carrierData && data.carrierData.length > 0}
			<BarChart title="Sites by Carrier" data={data.carrierData} />
		{/if}

		{#if data.accessStateData && data.accessStateData.length > 0}
			<BarChart title="Access Level Distribution" data={data.accessStateData} />
		{/if}
	</section>

	<!-- Entity/Tenant Distribution -->
	{#if data.tenantData && data.tenantData.length > 0}
		<section class="full-width-section fade-in-up delay-2">
			<div class="chart-card">
				<h3>Portfolio Distribution</h3>
				<div class="tenant-list">
					{#each data.tenantData as tenant}
						<div class="tenant-row">
							<span class="tenant-name">{tenant.name}</span>
							<div class="tenant-bar-container">
								<div
									class="tenant-bar"
									style="width: {(tenant.count / data.totalSites) * 100}%"
								></div>
							</div>
							<span class="tenant-count">{tenant.count}</span>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- Geographic Summary -->
	{#if data.states && data.states.length > 0}
		<section class="summary-card fade-in-up delay-3">
			<div class="summary-header">
				<h2>Geographic Coverage</h2>
				<p class="summary-desc">States with tower presence</p>
			</div>
			<div class="states-grid">
				{#each data.states as state}
					<div class="state-chip">{state}</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Carrier List -->
	{#if data.uniqueCarriers && data.uniqueCarriers.length > 0}
		<section class="summary-card fade-in-up delay-3">
			<div class="summary-header">
				<h2>Carriers in Portfolio</h2>
				<p class="summary-desc">All carriers across tower sites</p>
			</div>
			<div class="carriers-grid">
				{#each data.uniqueCarriers as carrier}
					<div class="carrier-chip">{carrier}</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Quick Links -->
	<section class="quick-links fade-in-up delay-4">
		<div class="link-card">
			<a href="/map">
				<h3>Tower Map</h3>
				<p>Explore your tower portfolio geographically</p>
			</a>
		</div>
		<div class="link-card">
			<a href="/">
				<h3>Dashboard</h3>
				<p>Return to main dashboard overview</p>
			</a>
		</div>
	</section>
</div>

<style>
	.analytics-page {
		padding: 2rem;
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.page-header {
		margin-bottom: 0.5rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #f4f4f5;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		font-size: 0.875rem;
		color: #71717a;
		margin: 0;
	}

	.error-banner {
		background-color: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 0.5rem;
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: #ef4444;
		font-size: 0.875rem;
	}

	/* Fade-in animations */
	.fade-in-up {
		animation: fadeInUp 0.5s ease-out forwards;
		opacity: 0;
	}

	.fade-in-up.delay-1 { animation-delay: 0.1s; }
	.fade-in-up.delay-2 { animation-delay: 0.2s; }
	.fade-in-up.delay-3 { animation-delay: 0.3s; }
	.fade-in-up.delay-4 { animation-delay: 0.4s; }

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1.25rem;
	}

	.charts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.full-width-section {
		/* Full width */
	}

	.chart-card {
		background: #1e1e2e;
		border-radius: 12px;
		padding: 1.5rem;
	}

	.chart-card h3 {
		margin: 0 0 1.25rem;
		font-size: 0.9rem;
		color: #f4f4f5;
		font-weight: 600;
	}

	.tenant-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.tenant-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.tenant-name {
		width: 180px;
		font-size: 0.875rem;
		color: #a1a1aa;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tenant-bar-container {
		flex: 1;
		height: 8px;
		background: #27273a;
		border-radius: 4px;
		overflow: hidden;
	}

	.tenant-bar {
		height: 100%;
		background: linear-gradient(90deg, #3b82f6, #8b5cf6);
		border-radius: 4px;
		min-width: 4px;
	}

	.tenant-count {
		width: 50px;
		text-align: right;
		font-size: 0.875rem;
		color: #f4f4f5;
		font-variant-numeric: tabular-nums;
	}

	.summary-card {
		background-color: #1e1e2e;
		border-radius: 12px;
		padding: 1.5rem;
	}

	.summary-header {
		margin-bottom: 1.25rem;
	}

	.summary-header h2 {
		margin: 0;
		font-size: 1rem;
		color: #f4f4f5;
		font-weight: 600;
	}

	.summary-desc {
		margin: 0.25rem 0 0;
		font-size: 0.8rem;
		color: #71717a;
	}

	.states-grid, .carriers-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.state-chip, .carrier-chip {
		background: #27273a;
		color: #a1a1aa;
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.carrier-chip {
		background: #3b82f620;
		color: #60a5fa;
		border: 1px solid #3b82f640;
	}

	.quick-links {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
		margin-top: 1rem;
	}

	.link-card {
		background: #1e1e2e;
		border-radius: 12px;
		transition: all 0.2s ease;
	}

	.link-card:hover {
		background: #27273a;
		transform: translateY(-2px);
	}

	.link-card a {
		display: block;
		padding: 1.5rem;
		text-decoration: none;
		color: inherit;
	}

	.link-card h3 {
		margin: 0 0 0.5rem;
		font-size: 1.125rem;
		color: #f4f4f5;
	}

	.link-card p {
		margin: 0;
		color: #71717a;
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.analytics-page {
			padding: 1rem;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.charts-grid {
			grid-template-columns: 1fr;
		}

		.tenant-name {
			width: 120px;
		}
	}

	@media (max-width: 480px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
