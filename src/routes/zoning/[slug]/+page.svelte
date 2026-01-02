<script lang="ts">
	import { marked } from 'marked';

	interface ZoningOrdinance {
		id: string;
		city: string;
		state: string;
		slug: string;
		title: string;
		ordinance_text: string;
		source_url: string;
		last_updated: string;
	}

	interface Props {
		data: {
			ordinance: ZoningOrdinance;
		};
	}

	let { data }: Props = $props();
	const { ordinance } = data;

	// Parse markdown to HTML
	const htmlContent = $derived(marked(ordinance.ordinance_text));

	// Format date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{ordinance.title} | {ordinance.city}, {ordinance.state} - AeroCell</title>
</svelte:head>

<div class="ordinance-page">
	<nav class="breadcrumb">
		<a href="/map">Map</a>
		<span class="separator">/</span>
		<span>Zoning</span>
		<span class="separator">/</span>
		<span>{ordinance.city}</span>
	</nav>

	<header class="ordinance-header">
		<div class="location">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
				<circle cx="12" cy="10" r="3"/>
			</svg>
			<span>{ordinance.city}, {ordinance.state}</span>
		</div>
		<h1>{ordinance.title}</h1>
	</header>

	<article class="ordinance-content">
		{@html htmlContent}
	</article>

	<footer class="ordinance-footer">
		<div class="meta">
			<div class="source">
				<span class="label">Original Source:</span>
				<a href={ordinance.source_url} target="_blank" rel="noopener noreferrer">
					{ordinance.source_url}
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
						<polyline points="15 3 21 3 21 9"/>
						<line x1="10" x2="21" y1="14" y2="3"/>
					</svg>
				</a>
			</div>
			<div class="updated">
				<span class="label">Last Updated:</span>
				<span>{formatDate(ordinance.last_updated)}</span>
			</div>
		</div>
		<p class="disclaimer">
			This information is provided for reference only. Always verify with official sources for legal purposes.
		</p>
	</footer>
</div>

<style>
	.ordinance-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		min-height: 100vh;
		background: #0a1628;
		color: #f4f4f5;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 2rem;
		font-size: 0.875rem;
		color: #71717a;
	}

	.breadcrumb a {
		color: #5EB1F7;
		text-decoration: none;
	}

	.breadcrumb a:hover {
		text-decoration: underline;
	}

	.breadcrumb .separator {
		color: #3d4f63;
	}

	.ordinance-header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #253448;
	}

	.location {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #5EB1F7;
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}

	h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.ordinance-content {
		line-height: 1.7;
		font-size: 1rem;
	}

	.ordinance-content :global(h2) {
		font-size: 1.375rem;
		font-weight: 600;
		margin: 2rem 0 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #253448;
	}

	.ordinance-content :global(h3) {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 1.5rem 0 0.75rem;
		color: #5EB1F7;
	}

	.ordinance-content :global(p) {
		margin: 1rem 0;
		color: rgba(244, 244, 245, 0.9);
	}

	.ordinance-content :global(ul),
	.ordinance-content :global(ol) {
		margin: 1rem 0;
		padding-left: 1.5rem;
	}

	.ordinance-content :global(li) {
		margin: 0.5rem 0;
	}

	.ordinance-content :global(hr) {
		border: none;
		border-top: 1px solid #253448;
		margin: 2rem 0;
	}

	.ordinance-content :global(em) {
		color: #71717a;
	}

	.ordinance-footer {
		margin-top: 3rem;
		padding-top: 1.5rem;
		border-top: 1px solid #253448;
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.source,
	.updated {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.label {
		color: #71717a;
	}

	.source a {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		color: #5EB1F7;
		text-decoration: none;
		word-break: break-all;
	}

	.source a:hover {
		text-decoration: underline;
	}

	.disclaimer {
		font-size: 0.75rem;
		color: #71717a;
		background: #1D2C43;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin: 0;
	}

	@media (max-width: 768px) {
		.ordinance-page {
			padding: 1rem;
		}

		h1 {
			font-size: 1.375rem;
		}

		.ordinance-content :global(h2) {
			font-size: 1.125rem;
		}
	}
</style>
