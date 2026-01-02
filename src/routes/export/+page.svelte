<script lang="ts">
	import ContactSalesModal from '$lib/components/ContactSalesModal.svelte';

	let { data } = $props();

	let showContactModal = $state(false);
	let exportFormat = $state<'csv' | 'xlsx'>('xlsx');
	let isExporting = $state(false);
	let exportError = $state<string | null>(null);

	// Export sections - user can toggle which to include
	const exportSections = $state({
		location: { enabled: true, label: 'Location', desc: 'Address, City, State, Zip, Lat/Lng, Google Maps' },
		tower: { enabled: true, label: 'Tower Details', desc: 'Tower Type, Carrier, Status, Remarks' },
		owner: { enabled: true, label: 'Owner Info', desc: 'Entity Name, Owner Name, Title, Phone, Email' },
		seller: { enabled: true, label: 'Seller Intelligence', desc: 'Age 65+, Life Events, Seller Readiness Score' },
		fiveG: { enabled: false, label: '5G Capable', desc: '5G/EN-DC Status, NR Bands, Upgrade Potential' },
		rf: { enabled: false, label: 'RF & Technical', desc: 'Spectrum Bands, Antenna Config, Signal Coverage' },
		zoning: { enabled: false, label: 'Zoning Data', desc: 'Zoning codes, types, descriptions, links' },
		property: { enabled: false, label: 'Property Data', desc: 'Structure, Year Built, Parcel Values' }
	});

	const selectedSections = $derived(
		Object.entries(exportSections)
			.filter(([_, v]) => v.enabled)
			.map(([k, _]) => k)
	);

	const canExport = $derived(selectedSections.length > 0);

	function handleUnlock() {
		showContactModal = true;
	}

	function toggleSection(key: keyof typeof exportSections) {
		exportSections[key].enabled = !exportSections[key].enabled;
	}

	async function handleExport() {
		if (data.accessTier === 'SAMPLE') {
			showContactModal = true;
			return;
		}

		if (!canExport) {
			exportError = 'Please select at least one section to export';
			return;
		}

		isExporting = true;
		exportError = null;

		try {
			const params = new URLSearchParams({
				format: exportFormat,
				sections: selectedSections.join(',')
			});

			const response = await fetch(`/api/export?${params}`);
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Export failed');
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `tower-leads-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (err) {
			exportError = err instanceof Error ? err.message : 'Export failed';
		} finally {
			isExporting = false;
		}
	}
</script>

<svelte:head>
	<title>Export - Tower Portfolio</title>
</svelte:head>

<div class="page-title-bar">
	<div class="page-title-content">
		<h1>Export Data</h1>
		<p class="subtitle">Download your tower portfolio data</p>
	</div>
</div>

<div class="export-page">
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

	<!-- Export Options -->
	<section class="export-section fade-in-up">
		<div class="export-card">
			<div class="export-header">
				<div class="export-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
						<polyline points="7 10 12 15 17 10"/>
						<line x1="12" x2="12" y1="15" y2="3"/>
					</svg>
				</div>
				<div>
					<h2>Tower Leads Export</h2>
					<p class="export-desc">Select the data sections you want to include</p>
				</div>
			</div>

			<!-- Section Selection -->
			<div class="section-selection">
				<h3>Choose Sections</h3>
				<div class="section-grid">
					{#each Object.entries(exportSections) as [key, section]}
						<button
							type="button"
							class="section-toggle"
							class:active={section.enabled}
							onclick={() => toggleSection(key as keyof typeof exportSections)}
						>
							<div class="section-check">
								{#if section.enabled}
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
										<polyline points="20 6 9 17 4 12"/>
									</svg>
								{/if}
							</div>
							<div class="section-info">
								<span class="section-label">{section.label}</span>
								<span class="section-desc">{section.desc}</span>
							</div>
						</button>
					{/each}
				</div>
			</div>

			{#if data.accessTier === 'SAMPLE'}
				<div class="locked-export">
					<div class="locked-icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#exportGradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<defs>
								<linearGradient id="exportGradient" x1="0%" y1="0%" x2="100%" y2="0%">
									<stop offset="0%" stop-color="#B0BEC5" />
									<stop offset="50%" stop-color="#7CCFEE" />
									<stop offset="100%" stop-color="#5EB1F7" />
								</linearGradient>
							</defs>
							<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
							<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
						</svg>
					</div>
					<div class="locked-text">
						<span class="locked-title">Export Locked</span>
						<span class="locked-desc">Upgrade to download full tower leads data</span>
					</div>
					<button class="unlock-btn" type="button" onclick={handleUnlock}>
						Contact Sales
					</button>
				</div>
			{:else}
				<div class="export-actions">
					<div class="format-select">
						<label>
							<input type="radio" bind:group={exportFormat} value="xlsx" />
							<span class="format-option">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
									<polyline points="14 2 14 8 20 8"/>
									<path d="M8 13h2"/>
									<path d="M8 17h2"/>
									<path d="M14 13h2"/>
									<path d="M14 17h2"/>
								</svg>
								Excel (.xlsx)
							</span>
						</label>
						<label>
							<input type="radio" bind:group={exportFormat} value="csv" />
							<span class="format-option">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
									<polyline points="14 2 14 8 20 8"/>
									<line x1="16" x2="8" y1="13" y2="13"/>
									<line x1="16" x2="8" y1="17" y2="17"/>
									<line x1="10" x2="8" y1="9" y2="9"/>
								</svg>
								CSV (.csv)
							</span>
						</label>
					</div>

					{#if exportError}
						<div class="export-error">{exportError}</div>
					{/if}

					<button
						class="export-btn"
						type="button"
						onclick={handleExport}
						disabled={isExporting || !canExport}
					>
						{#if isExporting}
							<span class="spinner"></span>
							Exporting...
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
								<polyline points="7 10 12 15 17 10"/>
								<line x1="12" x2="12" y1="15" y2="3"/>
							</svg>
							Download {exportFormat.toUpperCase()} ({selectedSections.length} sections)
						{/if}
					</button>
				</div>
			{/if}
		</div>
	</section>

	<!-- Export History -->
	<section class="history-section fade-in-up delay-1">
		<div class="history-card">
			<div class="history-header">
				<h3>Export History</h3>
				<span class="history-count">0 exports</span>
			</div>
			<div class="history-table">
				<div class="history-table-header">
					<span class="col-date">Date</span>
					<span class="col-format">Format</span>
					<span class="col-sections">Sections</span>
					<span class="col-records">Records</span>
					<span class="col-action"></span>
				</div>
				<div class="history-empty">
					<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
						<polyline points="14 2 14 8 20 8"/>
						<path d="M12 18v-6"/>
						<path d="M9 15l3 3 3-3"/>
					</svg>
					<p>No exports yet</p>
					<span>Your export history will appear here</span>
				</div>
			</div>
		</div>
	</section>
</div>

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

	.export-page {
		padding: 2rem;
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		position: relative;
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

	.fade-in-up {
		animation: fadeInUp 0.5s ease-out forwards;
		opacity: 0;
	}

	.fade-in-up.delay-1 { animation-delay: 0.1s; }

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

	.export-section {
		width: 100%;
	}

	.export-card {
		background: #253448;
		border-radius: 12px;
		padding: 1.5rem;
	}

	.export-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.export-icon {
		width: 56px;
		height: 56px;
		background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		flex-shrink: 0;
	}

	.export-header h2 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.export-desc {
		margin: 0.25rem 0 0;
		font-size: 0.875rem;
		color: #71717a;
	}

	/* Section Selection */
	.section-selection {
		margin-bottom: 1.5rem;
	}

	.section-selection h3 {
		margin: 0 0 1rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.6);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.section-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	.section-toggle {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.875rem;
		background: #1d2c43;
		border: 2px solid #3d4f63;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
		transition: all 0.15s;
	}

	.section-toggle:hover {
		border-color: rgba(94, 177, 247, 0.4);
	}

	.section-toggle.active {
		border-color: #5EB1F7;
		background: rgba(94, 177, 247, 0.1);
	}

	.section-check {
		width: 20px;
		height: 20px;
		border: 2px solid #3d4f63;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 2px;
		transition: all 0.15s;
	}

	.section-toggle.active .section-check {
		background: #5EB1F7;
		border-color: #5EB1F7;
		color: white;
	}

	.section-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.section-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.section-desc {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.4;
	}

	.locked-export {
		background: linear-gradient(135deg, #1a1a2e 0%, #253448 100%);
		border: 1px solid #3d4f63;
		border-radius: 8px;
		padding: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.locked-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.locked-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.locked-title {
		font-size: 0.9rem;
		font-weight: 600;
		background: linear-gradient(90deg, #B0BEC5 0%, #7CCFEE 50%, #5EB1F7 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.locked-desc {
		font-size: 0.8rem;
		color: rgba(176, 190, 197, 0.6);
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
		white-space: nowrap;
	}

	.unlock-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(94, 177, 247, 0.3);
	}

	.export-actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.format-select {
		display: flex;
		gap: 1rem;
	}

	.format-select label {
		cursor: pointer;
	}

	.format-select input {
		display: none;
	}

	.format-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: #1d2c43;
		border: 2px solid #3d4f63;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
		transition: all 0.15s;
	}

	.format-select input:checked + .format-option {
		border-color: #5EB1F7;
		background: rgba(94, 177, 247, 0.1);
		color: #f4f4f5;
	}

	.format-option:hover {
		border-color: rgba(94, 177, 247, 0.5);
	}

	.export-error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 6px;
		padding: 0.75rem 1rem;
		color: #ef4444;
		font-size: 0.8rem;
	}

	.export-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 1rem;
		background: linear-gradient(90deg, #22c55e, #16a34a);
		border: none;
		border-radius: 8px;
		color: white;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.export-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
	}

	.export-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		width: 18px;
		height: 18px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.history-section {
		width: 100%;
	}

	.history-card {
		background: #253448;
		border-radius: 12px;
		overflow: hidden;
	}

	.history-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #3d4f63;
	}

	.history-card h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.history-count {
		font-size: 0.75rem;
		color: #71717a;
		background: #1d2c43;
		padding: 0.25rem 0.625rem;
		border-radius: 1rem;
	}

	.history-table {
		width: 100%;
	}

	.history-table-header {
		display: grid;
		grid-template-columns: 1.5fr 0.75fr 1.5fr 0.75fr 0.5fr;
		gap: 1rem;
		padding: 0.75rem 1.5rem;
		background: #1d2c43;
		border-bottom: 1px solid #3d4f63;
	}

	.history-table-header span {
		font-size: 0.6875rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.history-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		text-align: center;
	}

	.history-empty svg {
		color: #3d4f63;
		margin-bottom: 1rem;
	}

	.history-empty p {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
	}

	.history-empty span {
		margin-top: 0.25rem;
		font-size: 0.8125rem;
		color: #71717a;
	}

	@media (max-width: 768px) {
		.page-title-bar {
			padding: 1rem;
		}

		.export-page {
			padding: 1rem;
		}

		.locked-export {
			flex-direction: column;
			text-align: center;
		}

		.format-select {
			flex-direction: column;
		}

		.section-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
