<script lang="ts">
	interface Props {
		variant?: 'text' | 'card' | 'avatar' | 'thumbnail';
		width?: string;
		height?: string;
		lines?: number;
	}

	let {
		variant = 'text',
		width = '100%',
		height,
		lines = 1
	}: Props = $props();

	const defaultHeights = {
		text: '1rem',
		card: '120px',
		avatar: '40px',
		thumbnail: '80px'
	};

	const computedHeight = height || defaultHeights[variant];
</script>

{#if variant === 'text' && lines > 1}
	<div class="skeleton-lines" style="width: {width};">
		{#each Array(lines) as _, i}
			<div
				class="skeleton skeleton-text"
				style="width: {i === lines - 1 ? '70%' : '100%'}; height: {computedHeight};"
			></div>
		{/each}
	</div>
{:else}
	<div
		class="skeleton skeleton-{variant}"
		class:skeleton-round={variant === 'avatar'}
		style="width: {variant === 'avatar' ? computedHeight : width}; height: {computedHeight};"
	></div>
{/if}

<style>
	.skeleton {
		background: linear-gradient(
			90deg,
			#253448 25%,
			#2d3e52 50%,
			#253448 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
		border-radius: 0.375rem;
	}

	.skeleton-round {
		border-radius: 50%;
	}

	.skeleton-lines {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-text {
		border-radius: 0.25rem;
	}

	.skeleton-card {
		border-radius: 0.5rem;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
