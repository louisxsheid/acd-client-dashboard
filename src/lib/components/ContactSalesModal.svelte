<script lang="ts">
	interface Props {
		open: boolean;
		onClose: () => void;
	}

	let { open, onClose }: Props = $props();

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="modal-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true" tabindex="0">
		<div class="modal-content">
			<button class="close-btn" onclick={onClose} aria-label="Close">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 6 6 18"/>
					<path d="m6 6 12 12"/>
				</svg>
			</button>

			<div class="modal-header">
				<div class="icon-wrapper">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
						<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
					</svg>
				</div>
				<h2>Unlock Premium Data</h2>
			</div>

			<p class="modal-description">
				Contact AeroCell to unlock premium intelligence including seller signals, property valuations, and decision-maker contacts.
			</p>

			<div class="contact-options">
				<a href="tel:+18584445416" class="contact-item">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
					</svg>
					<span>(858) 444-5416</span>
				</a>

				<a href="mailto:spratt@aerocell.org" class="contact-item">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect width="20" height="16" x="2" y="4" rx="2"/>
						<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
					</svg>
					<span>spratt@aerocell.org</span>
				</a>
			</div>

			<button class="close-button" onclick={onClose}>
				Close
			</button>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fadeIn 0.15s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.modal-content {
		background-color: #253448;
		border: 1px solid #3d4f63;
		border-radius: 12px;
		padding: 2rem;
		max-width: 400px;
		width: 90%;
		position: relative;
		animation: slideIn 0.2s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.65);
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		transition: color 0.15s;
	}

	.close-btn:hover {
		color: #FFFFFF;
	}

	.modal-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.icon-wrapper {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: linear-gradient(135deg, #5EB1F7 0%, #3b82f6 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #FFFFFF;
		text-align: center;
	}

	.modal-description {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
		text-align: center;
		margin: 0 0 1.5rem 0;
		line-height: 1.5;
	}

	.contact-options {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.contact-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background-color: #2d3e52;
		border: 1px solid #3d4f63;
		border-radius: 8px;
		color: #FFFFFF;
		text-decoration: none;
		font-size: 0.9375rem;
		transition: all 0.15s;
	}

	.contact-item:hover {
		background-color: #3d4f63;
		border-color: #5EB1F7;
	}

	.contact-item svg {
		color: #5EB1F7;
		flex-shrink: 0;
	}

	.close-button {
		width: 100%;
		padding: 0.75rem;
		background-color: transparent;
		border: 1px solid #3d4f63;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.close-button:hover {
		background-color: #2d3e52;
		color: #FFFFFF;
	}
</style>
