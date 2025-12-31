<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { CompanyTower, Tower, TowerSite, Entity, EntityContact } from '$lib/types';
	import { normalizeCarrierName } from '$lib/carriers';
	import Spinner from './Spinner.svelte';
	import LoadingSkeleton from './LoadingSkeleton.svelte';

	interface Props {
		tower: CompanyTower | null;
		onClose: () => void;
		loading?: boolean;
	}

	let { tower, onClose, loading = false }: Props = $props();

	let activeTab = $state<'site' | 'entity' | 'contacts' | 'technical'>('site');

	function formatDate(dateStr: string | undefined): string {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatPhone(phone: string | undefined): string {
		if (!phone) return '';
		// Format as (XXX) XXX-XXXX if 10 digits
		const digits = phone.replace(/\D/g, '');
		if (digits.length === 10) {
			return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
		}
		return phone;
	}

	function getAccessStateInfo(state: string): { color: string; label: string } {
		switch (state) {
			case 'FULL':
				return { color: '#22c55e', label: 'Full Access' };
			case 'LICENSED':
				return { color: '#3b82f6', label: 'Licensed' };
			case 'TRIAL':
				return { color: '#f59e0b', label: 'Trial' };
			case 'SAMPLE':
				return { color: '#71717a', label: 'Sample' };
			default:
				return { color: '#71717a', label: state };
		}
	}

	const site = $derived(tower?.tower.tower_site);
	const entity = $derived(site?.entity);
	const contacts = $derived(entity?.entity_contacts || []);
	const providers = $derived(tower?.tower.tower_providers || []);
	const bands = $derived(tower?.tower.tower_bands || []);
	const accessInfo = $derived(tower ? getAccessStateInfo(tower.access_state) : null);
</script>

{#if tower}
	<div class="tower-detail">
		<div class="detail-header">
			<div class="header-main">
				<h2>Tower #{tower.tower.id}</h2>
				{#if accessInfo}
					<span class="access-badge" style="background-color: {accessInfo.color}">
						{accessInfo.label}
					</span>
				{/if}
			</div>
			<button class="close-btn" onclick={onClose} aria-label="Close details">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 6 6 18"/>
					<path d="m6 6 12 12"/>
				</svg>
			</button>
		</div>

		<div class="tabs">
			<button class:active={activeTab === 'site'} onclick={() => activeTab = 'site'}>
				Site Info
			</button>
			<button class:active={activeTab === 'entity'} onclick={() => activeTab = 'entity'}>
				Entity
			</button>
			<button class:active={activeTab === 'contacts'} onclick={() => activeTab = 'contacts'}>
				Contacts ({contacts.length})
			</button>
			<button class:active={activeTab === 'technical'} onclick={() => activeTab = 'technical'}>
				Technical
			</button>
		</div>

		<div class="detail-content">
			{#if activeTab === 'site'}
				<div class="info-section">
					<h3>Location</h3>
					<div class="info-grid">
						<div class="info-item">
							<label>Address</label>
							<span>{site?.address || 'N/A'}</span>
						</div>
						<div class="info-item">
							<label>City</label>
							<span>{site?.city || 'N/A'}</span>
						</div>
						<div class="info-item">
							<label>State</label>
							<span>{site?.state || 'N/A'}</span>
						</div>
						<div class="info-item">
							<label>ZIP Code</label>
							<span>{site?.zip_code || 'N/A'}</span>
						</div>
						<div class="info-item">
							<label>County</label>
							<span>{site?.county || 'N/A'}</span>
						</div>
						<div class="info-item">
							<label>Coordinates</label>
							<span>{tower.tower.latitude.toFixed(6)}, {tower.tower.longitude.toFixed(6)}</span>
						</div>
					</div>

					{#if site?.google_maps_url}
						<a href={site.google_maps_url} target="_blank" rel="noopener noreferrer" class="external-link">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
								<polyline points="15 3 21 3 21 9"/>
								<line x1="10" x2="21" y1="14" y2="3"/>
							</svg>
							Open in Google Maps
						</a>
					{/if}
				</div>

				<div class="info-section">
					<h3>Site Details</h3>
					<div class="info-grid">
						<div class="info-item">
							<label>Site ID</label>
							<span>{site?.site_id || 'N/A'}</span>
						</div>
						<div class="info-item">
							<label>Carrier</label>
							<span>{site?.carrier ? normalizeCarrierName(site.carrier) : 'N/A'}</span>
						</div>
						<div class="info-item">
							<label>Tower Type</label>
							<span>{site?.tower_type || tower.tower.tower_type || 'N/A'}</span>
						</div>
						<div class="info-item">
							<label>Status</label>
							<span>{site?.status || 'N/A'}</span>
						</div>
					</div>

					{#if site?.remarks}
						<div class="remarks">
							<label>Remarks</label>
							<p>{site.remarks}</p>
						</div>
					{/if}

					{#if site?.imagery_url}
						<a href={site.imagery_url} target="_blank" rel="noopener noreferrer" class="external-link">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
								<circle cx="9" cy="9" r="2"/>
								<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
							</svg>
							View Imagery
						</a>
					{/if}
				</div>

			{:else if activeTab === 'entity'}
				{#if entity}
					<div class="info-section">
						<h3>Owner / Entity</h3>
						<div class="info-grid">
							<div class="info-item full-width">
								<label>Entity Name</label>
								<span class="entity-name">{entity.name}</span>
							</div>
							<div class="info-item">
								<label>Type</label>
								<span>{entity.entity_type || 'N/A'}</span>
							</div>
						</div>
					</div>

					<div class="info-section">
						<h3>Mailing Address</h3>
						<div class="info-grid">
							<div class="info-item full-width">
								<label>Address</label>
								<span>{entity.mail_address || 'N/A'}</span>
							</div>
							<div class="info-item">
								<label>City</label>
								<span>{entity.mail_city || 'N/A'}</span>
							</div>
							<div class="info-item">
								<label>State</label>
								<span>{entity.mail_state || 'N/A'}</span>
							</div>
							<div class="info-item">
								<label>ZIP</label>
								<span>{entity.mail_zip || 'N/A'}</span>
							</div>
						</div>
					</div>
				{:else}
					<div class="empty-tab">
						<p>No entity information available</p>
					</div>
				{/if}

			{:else if activeTab === 'contacts'}
				{#if contacts.length > 0}
					{#each contacts as contact, i}
						<div class="contact-card">
							<div class="contact-header">
								<span class="contact-order">
									{contact.contact_order === 1 ? 'Primary' : `Contact ${contact.contact_order}`}
								</span>
								{#if contact.status && contact.status !== 'active'}
									<span class="contact-status" class:inactive={contact.status !== 'active'}>
										{contact.status}
									</span>
								{/if}
							</div>

							<div class="contact-name">
								{contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown'}
							</div>

							{#if contact.title}
								<div class="contact-title">{contact.title}</div>
							{/if}

							<div class="contact-details">
								{#if contact.phone_primary}
									<div class="contact-item">
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
										</svg>
										<a href="tel:{contact.phone_primary}">{formatPhone(contact.phone_primary)}</a>
										{#if contact.phone_primary_dnc}
											<span class="dnc-badge">DNC</span>
										{/if}
									</div>
								{/if}

								{#if contact.phone_secondary}
									<div class="contact-item">
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
										</svg>
										<a href="tel:{contact.phone_secondary}">{formatPhone(contact.phone_secondary)}</a>
										<span class="secondary-label">Secondary</span>
									</div>
								{/if}

								{#if contact.email_primary}
									<div class="contact-item">
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<rect width="20" height="16" x="2" y="4" rx="2"/>
											<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
										</svg>
										<a href="mailto:{contact.email_primary}">{contact.email_primary}</a>
										{#if contact.email_primary_verified}
											<span class="verified-badge">Verified</span>
										{/if}
									</div>
								{/if}

								{#if contact.email_secondary}
									<div class="contact-item">
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<rect width="20" height="16" x="2" y="4" rx="2"/>
											<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
										</svg>
										<a href="mailto:{contact.email_secondary}">{contact.email_secondary}</a>
										<span class="secondary-label">Secondary</span>
									</div>
								{/if}
							</div>

							{#if contact.notes}
								<div class="contact-notes">
									<label>Notes</label>
									<p>{contact.notes}</p>
								</div>
							{/if}
						</div>
					{/each}
				{:else}
					<div class="empty-tab">
						<p>No contacts available</p>
					</div>
				{/if}

			{:else if activeTab === 'technical'}
				<div class="info-section">
					<h3>Tower Data</h3>
					<div class="info-grid">
						<div class="info-item">
							<label>First Seen</label>
							<span>{formatDate(tower.tower.first_seen_at)}</span>
						</div>
						<div class="info-item">
							<label>Last Seen</label>
							<span>{formatDate(tower.tower.last_seen_at)}</span>
						</div>
						<div class="info-item">
							<label>EN-DC Available</label>
							<span>{tower.tower.endc_available ? 'Yes' : 'No'}</span>
						</div>
						<div class="info-item">
							<label>Provider Count</label>
							<span>{tower.tower.provider_count || providers.length}</span>
						</div>
					</div>
				</div>

				{#if providers.length > 0}
					<div class="info-section">
						<h3>Providers</h3>
						<div class="provider-list">
							{#each providers as tp}
								<div class="provider-item">
									<span class="provider-name">{tp.provider.name}</span>
									<span class="provider-rat">{tp.rat}</span>
									{#if tp.endc_available}
										<span class="endc-badge">EN-DC</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if bands.length > 0}
					<div class="info-section">
						<h3>Bands</h3>
						<div class="band-list">
							{#each bands as band}
								<div class="band-item">
									<span class="band-number">B{band.band_number}</span>
									{#if band.band_name}
										<span class="band-name">{band.band_name}</span>
									{/if}
									{#if band.bandwidth}
										<span class="band-bw">{band.bandwidth} MHz</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</div>
{:else if loading}
	<div class="tower-detail loading-skeleton">
		<div class="skeleton-header">
			<div class="skeleton-title">
				<LoadingSkeleton variant="text" width="180px" height="1.25rem" />
				<LoadingSkeleton variant="text" width="120px" height="0.875rem" />
			</div>
			<LoadingSkeleton variant="text" width="24px" height="24px" />
		</div>
		<div class="skeleton-tabs">
			<LoadingSkeleton variant="text" width="60px" height="0.875rem" />
			<LoadingSkeleton variant="text" width="60px" height="0.875rem" />
			<LoadingSkeleton variant="text" width="60px" height="0.875rem" />
			<LoadingSkeleton variant="text" width="60px" height="0.875rem" />
		</div>
		<div class="skeleton-content">
			<LoadingSkeleton variant="text" lines={4} />
		</div>
	</div>
{/if}

<style>
	.tower-detail {
		background-color: #253448;
		border-top: 1px solid #3d4f63;
		max-height: 400px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.loading-skeleton {
		padding: 1rem;
		animation: fadeIn 0.2s ease-out;
	}

	.skeleton-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #3d4f63;
	}

	.skeleton-title {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-tabs {
		display: flex;
		gap: 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid #3d4f63;
	}

	.skeleton-content {
		padding: 1rem 0;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.detail-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #3d4f63;
		background-color: #2d3e52;
	}

	.header-main {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.header-main h2 {
		font-size: 1rem;
		font-weight: 600;
		color: #f4f4f5;
		margin: 0;
	}

	.access-badge {
		font-size: 0.625rem;
		font-weight: 600;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		text-transform: uppercase;
	}

	.close-btn {
		background: none;
		border: none;
		color: #71717a;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
		transition: color 0.15s;
	}

	.close-btn:hover {
		color: #f4f4f5;
	}

	.tabs {
		display: flex;
		border-bottom: 1px solid #3d4f63;
		background-color: #2d3e52;
	}

	.tabs button {
		flex: 1;
		padding: 0.625rem 1rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: rgba(255, 255, 255, 0.65);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.tabs button:hover {
		color: rgba(255, 255, 255, 0.8);
	}

	.tabs button:focus-visible {
		outline: none;
		box-shadow: inset 0 0 0 2px rgba(94, 177, 247, 0.3);
	}

	.tabs button.active {
		color: #5EB1F7;
		border-bottom-color: #5EB1F7;
	}

	.detail-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.info-section {
		margin-bottom: 1.5rem;
	}

	.info-section:last-child {
		margin-bottom: 0;
	}

	.info-section h3 {
		font-size: 0.6875rem;
		font-weight: 600;
		color: #71717a;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.75rem 0;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.info-item.full-width {
		grid-column: span 2;
	}

	.info-item label {
		font-size: 0.6875rem;
		color: #71717a;
	}

	.info-item span {
		font-size: 0.8125rem;
		color: #f4f4f5;
	}

	.entity-name {
		font-weight: 600;
	}

	.external-link {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.75rem;
		font-size: 0.75rem;
		color: #5EB1F7;
		text-decoration: none;
		transition: color 0.15s;
	}

	.external-link:hover {
		color: #FFFFFF;
		text-decoration: underline;
	}

	.remarks {
		margin-top: 0.75rem;
	}

	.remarks label {
		display: block;
		font-size: 0.6875rem;
		color: #71717a;
		margin-bottom: 0.25rem;
	}

	.remarks p {
		font-size: 0.8125rem;
		color: #a1a1aa;
		margin: 0;
		line-height: 1.5;
	}

	.empty-tab {
		text-align: center;
		padding: 2rem;
		color: #71717a;
	}

	.empty-tab p {
		margin: 0;
		font-size: 0.875rem;
	}

	/* Contact Card Styles */
	.contact-card {
		background-color: #2d3e52;
		border: 1px solid #3d4f63;
		border-radius: 0.5rem;
		padding: 1rem;
		margin-bottom: 0.75rem;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.contact-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.contact-card:last-child {
		margin-bottom: 0;
	}

	.contact-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.contact-order {
		font-size: 0.625rem;
		font-weight: 600;
		color: #5EB1F7;
		text-transform: uppercase;
	}

	.contact-status {
		font-size: 0.625rem;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		background-color: #22c55e;
		color: white;
	}

	.contact-status.inactive {
		background-color: #71717a;
	}

	.contact-name {
		font-size: 0.9375rem;
		font-weight: 600;
		color: #f4f4f5;
		margin-bottom: 0.25rem;
	}

	.contact-title {
		font-size: 0.75rem;
		color: #a1a1aa;
		margin-bottom: 0.75rem;
	}

	.contact-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.contact-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
	}

	.contact-item svg {
		color: #71717a;
		flex-shrink: 0;
	}

	.contact-item a {
		color: #f4f4f5;
		text-decoration: none;
	}

	.contact-item a:hover {
		color: #3b82f6;
	}

	.dnc-badge {
		font-size: 0.5625rem;
		font-weight: 600;
		padding: 0.125rem 0.25rem;
		background-color: #ef4444;
		color: white;
		border-radius: 0.125rem;
	}

	.verified-badge {
		font-size: 0.5625rem;
		font-weight: 600;
		padding: 0.125rem 0.25rem;
		background-color: #22c55e;
		color: white;
		border-radius: 0.125rem;
	}

	.secondary-label {
		font-size: 0.625rem;
		color: #71717a;
	}

	.contact-notes {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #3b3b50;
	}

	.contact-notes label {
		display: block;
		font-size: 0.625rem;
		color: #71717a;
		margin-bottom: 0.25rem;
	}

	.contact-notes p {
		font-size: 0.75rem;
		color: #a1a1aa;
		margin: 0;
		line-height: 1.4;
	}

	/* Technical Tab Styles */
	.provider-list,
	.band-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.provider-item,
	.band-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		background-color: #27273a;
		border: 1px solid #3b3b50;
		border-radius: 0.375rem;
		font-size: 0.75rem;
	}

	.provider-name,
	.band-number {
		color: #f4f4f5;
		font-weight: 500;
	}

	.provider-rat,
	.band-name {
		color: #71717a;
	}

	.band-bw {
		color: #a1a1aa;
		font-size: 0.6875rem;
	}

	.endc-badge {
		font-size: 0.5625rem;
		font-weight: 600;
		padding: 0.125rem 0.25rem;
		background-color: #8b5cf6;
		color: white;
		border-radius: 0.125rem;
	}
</style>
