<script lang="ts">
	import StatCard from '$lib/components/StatCard.svelte';
	import EntityTypeChart from '$lib/components/EntityTypeChart.svelte';
	import TowerTypeChart from '$lib/components/TowerTypeChart.svelte';
	import CarrierChart from '$lib/components/CarrierChart.svelte';
	import ENDCGauge from '$lib/components/ENDCGauge.svelte';
	import ContactSalesModal from '$lib/components/ContactSalesModal.svelte';

	let { data } = $props();

	let showContactModal = $state(false);

	function handleUnlock() {
		showContactModal = true;
	}
</script>

<svelte:head>
	<title>Analytics - Tower Portfolio</title>
</svelte:head>

<div class="page-title-bar">
	<div class="page-title-content">
		<h1>Analytics</h1>
		<p class="subtitle">Tower portfolio intelligence and insights</p>
	</div>
</div>

<div class="analytics-page">
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

	<!-- KPI Row -->
	<section class="stats-grid fade-in-up">
		<StatCard
			title="Total Towers"
			value={data.totalTowers}
			icon="📡"
			color="#3b82f6"
		/>
		<StatCard
			title="Total Entities"
			value={data.totalEntities}
			icon="🏢"
			color="#8b5cf6"
		/>
		<StatCard
			title="Contacts Unlocked"
			value="{data.contactCoveragePercent}%"
			icon="📧"
			color="#22c55e"
		/>
		<StatCard
			title="5G Capable"
			value={data.endcRate > 0 ? `${data.endcRate}%` : "🔒"}
			icon="📶"
			color="#f59e0b"
		/>
		<StatCard
			title="Multi-Tenant"
			value="{data.multiTenantRate}%"
			icon="🔗"
			color="#ef4444"
		/>
	</section>

	<!-- Charts Row -->
	<section class="charts-row fade-in-up delay-1">
		{#if data.entityTypeData && data.entityTypeData.length > 0}
			<EntityTypeChart data={data.entityTypeData} />
		{/if}
		{#if data.typeData && data.typeData.length > 0}
			<TowerTypeChart data={data.typeData} />
		{/if}
		{#if data.simpleCarrierData && data.simpleCarrierData.length > 0}
			<CarrierChart data={data.simpleCarrierData} />
		{/if}
	</section>

	<section class="two-column-grid fade-in-up delay-2">
		{#if data.accessTier === 'SAMPLE'}
			<div class="locked-gauge">
				<div class="locked-header">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#gaugeGradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<defs>
							<linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
								<stop offset="0%" stop-color="#B0BEC5" />
								<stop offset="50%" stop-color="#7CCFEE" />
								<stop offset="100%" stop-color="#5EB1F7" />
							</linearGradient>
						</defs>
						<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
						<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
					</svg>
					<span class="locked-title">5G Capable Leads</span>
				</div>
				<p class="locked-desc">Unlock to see detailed 5G network adoption metrics</p>
				<button class="unlock-btn" type="button" onclick={handleUnlock}>Click to Unlock</button>
			</div>
		{:else}
			<ENDCGauge
				rate={data.endcRate}
				totalTowers={data.totalTowers}
				endcTowers={data.endcCapable}
			/>
		{/if}
		<div class="locked-gauge">
			<div class="locked-header">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#rfGradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<defs>
						<linearGradient id="rfGradient" x1="0%" y1="0%" x2="100%" y2="0%">
							<stop offset="0%" stop-color="#B0BEC5" />
							<stop offset="50%" stop-color="#7CCFEE" />
							<stop offset="100%" stop-color="#5EB1F7" />
						</linearGradient>
					</defs>
					<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
					<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
				</svg>
				<span class="locked-title">RF & Technical Data</span>
			</div>
			<p class="locked-desc">Unlock spectrum bands, antenna configs, and signal coverage analysis</p>
			<button class="unlock-btn" type="button" onclick={handleUnlock}>Click to Unlock</button>
		</div>
	</section>

	</div>

<!-- Contact Sales Modal -->
<ContactSalesModal open={showContactModal} onClose={() => showContactModal = false} />

<style>
	.page-title-bar {
		background-color: #253448;
		border-bottom: 1px solid #3d4f63;
		padding: 1.5rem 2rem;
		position: sticky;
		top: 56px; /* Below nav header */
		z-index: 50;
	}

	.page-title-content {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.75rem;
	}

	.page-title-bar h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #f4f4f5;
		margin: 0;
	}

	.page-title-bar .subtitle {
		font-size: 0.875rem;
		color: #71717a;
		margin: 0;
	}

	.analytics-page {
		padding: 2rem;
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		position: relative;
		overflow-x: hidden;
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
		grid-template-columns: repeat(5, 1fr);
		gap: 1rem;
	}

	.charts-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.two-column-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
	}

	.locked-gauge {
		background: linear-gradient(135deg, #253448 0%, #1a1a2e 100%);
		border: 1px solid #3d4f63;
		border-radius: 12px;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		min-height: 280px;
	}

	.locked-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.locked-title {
		font-size: 1rem;
		font-weight: 600;
		background: linear-gradient(90deg, #B0BEC5 0%, #7CCFEE 50%, #5EB1F7 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.locked-desc {
		color: rgba(176, 190, 197, 0.6);
		font-size: 0.875rem;
		margin: 0 0 1.5rem 0;
		max-width: 250px;
	}

	.unlock-btn {
		background: linear-gradient(90deg, #5EB1F7, #3b82f6);
		border: none;
		border-radius: 8px;
		padding: 0.75rem 1.5rem;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.unlock-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(94, 177, 247, 0.3);
	}

	@media (max-width: 1100px) {
		.stats-grid {
			grid-template-columns: repeat(3, 1fr);
		}

		.charts-row {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 900px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.charts-row {
			grid-template-columns: 1fr;
		}

		.two-column-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.page-title-bar {
			padding: 1rem;
		}

		.analytics-page {
			padding: 1rem;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
