<script lang="ts">
	interface ContactStats {
		totalContacts: number;
		totalEntities: number;
		entitiesWithContacts: number;
		verifiedEmails: number;
		activePhones: number;
		coveragePercent: number;
	}

	interface Props {
		stats: ContactStats | null;
		isLocked: boolean;
		onUnlock?: () => void;
	}

	let { stats, isLocked, onUnlock }: Props = $props();

	const verifiedEmailPercent = $derived(
		stats && stats.totalContacts > 0
			? Math.round((stats.verifiedEmails / stats.totalContacts) * 100)
			: 0
	);

	const activePhonePercent = $derived(
		stats && stats.totalContacts > 0
			? Math.round((stats.activePhones / stats.totalContacts) * 100)
			: 0
	);
</script>

<div class="contact-coverage">
	<div class="card-header">
		<h3>Contact Intelligence</h3>
	</div>

	{#if isLocked || !stats}
		<button class="locked-state" type="button" onclick={onUnlock}>
			<div class="locked-content">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#contactGradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<defs>
						<linearGradient id="contactGradient" x1="0%" y1="0%" x2="100%" y2="0%">
							<stop offset="0%" stop-color="#B0BEC5" />
							<stop offset="50%" stop-color="#7CCFEE" />
							<stop offset="100%" stop-color="#5EB1F7" />
						</linearGradient>
					</defs>
					<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
					<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
				</svg>
				<span class="locked-title">Decision-Maker Intelligence</span>
				<span class="locked-desc">Unlock verified contacts for tower owners</span>
				<span class="unlock-cta">Click to Unlock</span>
			</div>
		</button>
	{:else}
		<div class="stats-grid">
			<div class="stat-item main">
				<span class="stat-value">{stats.coveragePercent}%</span>
				<span class="stat-label">Contact Coverage</span>
				<div class="progress-bar">
					<div class="progress-fill" style="width: {stats.coveragePercent}%"></div>
				</div>
			</div>

			<div class="stat-item">
				<span class="stat-value">{stats.totalContacts.toLocaleString()}</span>
				<span class="stat-label">Total Contacts</span>
			</div>

			<div class="stat-item">
				<span class="stat-value">{stats.entitiesWithContacts.toLocaleString()}</span>
				<span class="stat-label">Entities with Contacts</span>
			</div>

			<div class="stat-item verified">
				<span class="stat-value">{verifiedEmailPercent}%</span>
				<span class="stat-label">Verified Emails</span>
				<span class="stat-count">({stats.verifiedEmails.toLocaleString()})</span>
			</div>

			<div class="stat-item active">
				<span class="stat-value">{activePhonePercent}%</span>
				<span class="stat-label">Active Phones</span>
				<span class="stat-count">({stats.activePhones.toLocaleString()})</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.contact-coverage {
		background: #253448;
		border-radius: 12px;
		padding: 1.5rem;
	}

	.card-header {
		margin-bottom: 1rem;
	}

	h3 {
		margin: 0;
		font-size: 0.9rem;
		color: #f4f4f5;
		font-weight: 600;
	}

	.locked-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 2rem;
		background: linear-gradient(135deg, #0a1628 0%, #1a1a2e 100%);
		border: 1px solid #3d4f63;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.locked-state:hover {
		border-color: #5EB1F7;
		transform: translateY(-2px);
	}

	.locked-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		text-align: center;
	}

	.locked-title {
		font-size: 0.875rem;
		font-weight: 600;
		background: linear-gradient(90deg, #B0BEC5 0%, #7CCFEE 50%, #5EB1F7 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.locked-desc {
		font-size: 0.75rem;
		color: rgba(176, 190, 197, 0.6);
	}

	.unlock-cta {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #5EB1F7;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		padding: 0.75rem;
		background: #2d3e52;
		border-radius: 8px;
	}

	.stat-item.main {
		grid-column: span 2;
		padding: 1rem;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #f4f4f5;
		font-variant-numeric: tabular-nums;
	}

	.stat-item.main .stat-value {
		font-size: 2rem;
		color: #5EB1F7;
	}

	.stat-label {
		font-size: 0.7rem;
		color: #71717a;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-count {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.stat-item.verified .stat-value {
		color: #22c55e;
	}

	.stat-item.active .stat-value {
		color: #3b82f6;
	}

	.progress-bar {
		width: 100%;
		height: 6px;
		background: #1D2C43;
		border-radius: 3px;
		margin-top: 0.5rem;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #5EB1F7, #7CCFEE);
		border-radius: 3px;
		transition: width 0.5s ease;
	}

	@media (max-width: 480px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.stat-item.main {
			grid-column: span 1;
		}
	}
</style>
