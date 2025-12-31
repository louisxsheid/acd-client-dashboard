<script lang="ts">
	interface Props {
		title: string;
		description: string;
		isPremium?: boolean;
		onUnlock: () => void;
	}

	let { title, description, isPremium = false, onUnlock }: Props = $props();
</script>

<button
	class="locked-section"
	class:premium={isPremium}
	onclick={onUnlock}
	type="button"
>
	<div class="section-header">
		<div class="title-row">
			<svg class="lock-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="url(#lockGradient)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<defs>
					<linearGradient id="lockGradient" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color="#B0BEC5" />
						<stop offset="50%" stop-color="#7CCFEE" />
						<stop offset="100%" stop-color="#5EB1F7" />
					</linearGradient>
				</defs>
				<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
				<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
			</svg>
			<span class="title-text">{title}</span>
		</div>
		<span class="unlock-btn">Click to Unlock</span>
	</div>
	<p class="description">{description}</p>
</button>

<style>
	.locked-section {
		display: block;
		width: 100%;
		padding: 0.75rem;
		margin: 0;
		background-color: #0a1628;
		border: 1px solid #3d4f63;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
		transition: all 0.2s ease;
	}

	.locked-section:hover {
		background-color: #0f1e32;
		border-color: #5EB1F7;
		transform: translateY(-1px);
	}

	.locked-section.premium {
		background: linear-gradient(135deg, #0a1628 0%, #1a1a2e 100%);
	}

	.locked-section.premium:hover {
		background: linear-gradient(135deg, #0f1e32 0%, #1f1f3a 100%);
		border-color: #5EB1F7;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.375rem;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.lock-icon {
		flex-shrink: 0;
	}

	.title-text {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: linear-gradient(
			90deg,
			#B0BEC5 0%,
			#A3C2CF 11%,
			#96C6D9 22%,
			#89CAE3 33%,
			#7CCFEE 44%,
			#6FD3F8 55%,
			#62D7FF 66%,
			#55DBFF 77%,
			#48E0FF 88%,
			#5EB1F7 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.unlock-btn {
		font-size: 0.625rem;
		font-weight: 600;
		background: linear-gradient(
			90deg,
			#7CCFEE 0%,
			#5EB1F7 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		opacity: 0.8;
		transition: opacity 0.15s;
	}

	.locked-section:hover .unlock-btn {
		opacity: 1;
	}

	.description {
		margin: 0;
		font-size: 0.6875rem;
		color: rgba(176, 190, 197, 0.6);
		line-height: 1.4;
	}

	.locked-section:hover .description {
		color: rgba(176, 190, 197, 0.8);
	}
</style>
