<script lang="ts">
	interface Props {
		size?: 'small' | 'medium' | 'large';
		color?: string;
	}

	let { size = 'medium', color = '#5EB1F7' }: Props = $props();

	const sizes = {
		small: 16,
		medium: 24,
		large: 32
	};
</script>

<div
	class="spinner"
	style="
		width: {sizes[size]}px;
		height: {sizes[size]}px;
		border-top-color: {color};
	"
	role="status"
	aria-label="Loading"
></div>

<style>
	.spinner {
		border: 2px solid #3d4f63;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
