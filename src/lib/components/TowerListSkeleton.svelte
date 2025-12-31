<script lang="ts">
	import LoadingSkeleton from './LoadingSkeleton.svelte';

	interface Props {
		count?: number;
	}

	let { count = 5 }: Props = $props();
</script>

<div class="skeleton-list">
	{#each Array(count) as _}
		<div class="skeleton-item">
			<div class="skeleton-main">
				<div class="skeleton-info">
					<LoadingSkeleton variant="text" width="60%" height="0.875rem" />
					<LoadingSkeleton variant="text" width="40%" height="0.75rem" />
					<LoadingSkeleton variant="text" width="30%" height="0.625rem" />
				</div>
				<div class="skeleton-side">
					<LoadingSkeleton variant="text" width="50px" height="1.25rem" />
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
	.skeleton-list {
		display: flex;
		flex-direction: column;
	}

	.skeleton-item {
		padding: 0.875rem 1rem 0.875rem 1.25rem;
		border-bottom: 1px solid #3d4f63;
	}

	.skeleton-main {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.skeleton-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.skeleton-side {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}
</style>
