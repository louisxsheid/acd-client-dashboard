<script lang="ts">
	interface Props {
		rate: number;
		totalTowers: number;
		endcTowers: number;
	}

	let { rate, totalTowers, endcTowers }: Props = $props();

	// SVG arc calculations
	const radius = 80;
	const strokeWidth = 12;
	const circumference = Math.PI * radius; // Half circle
	const offset = $derived(circumference - (rate / 100) * circumference);

	// Color based on rate
	const gaugeColor = $derived(
		rate >= 50 ? '#22c55e' : rate >= 25 ? '#f59e0b' : '#ef4444'
	);
</script>

<div class="endc-gauge">
	<div class="gauge-header">
		<h3>5G/EN-DC Adoption</h3>
	</div>

	<div class="gauge-container">
		<svg viewBox="0 0 200 120" class="gauge-svg">
			<!-- Background arc -->
			<path
				d="M 20 100 A 80 80 0 0 1 180 100"
				fill="none"
				stroke="#2d3e52"
				stroke-width={strokeWidth}
				stroke-linecap="round"
			/>
			<!-- Progress arc -->
			<path
				d="M 20 100 A 80 80 0 0 1 180 100"
				fill="none"
				stroke={gaugeColor}
				stroke-width={strokeWidth}
				stroke-linecap="round"
				stroke-dasharray={circumference}
				stroke-dashoffset={offset}
				class="progress-arc"
			/>
		</svg>

		<div class="gauge-center">
			<span class="gauge-value">{rate}%</span>
			<span class="gauge-label">EN-DC Ready</span>
		</div>
	</div>

	<div class="gauge-stats">
		<div class="stat">
			<span class="stat-value">{endcTowers.toLocaleString()}</span>
			<span class="stat-label">5G Towers</span>
		</div>
		<div class="stat-divider"></div>
		<div class="stat">
			<span class="stat-value">{totalTowers.toLocaleString()}</span>
			<span class="stat-label">Total Towers</span>
		</div>
	</div>

	<div class="gauge-legend">
		<div class="legend-item">
			<span class="legend-dot" style="background: #22c55e;"></span>
			<span>50%+ High</span>
		</div>
		<div class="legend-item">
			<span class="legend-dot" style="background: #f59e0b;"></span>
			<span>25-49% Medium</span>
		</div>
		<div class="legend-item">
			<span class="legend-dot" style="background: #ef4444;"></span>
			<span>&lt;25% Low</span>
		</div>
	</div>
</div>

<style>
	.endc-gauge {
		background: #253448;
		border-radius: 12px;
		padding: 1.5rem;
	}

	.gauge-header {
		margin-bottom: 0.5rem;
	}

	h3 {
		margin: 0;
		font-size: 0.9rem;
		color: #f4f4f5;
		font-weight: 600;
	}

	.gauge-container {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		height: 140px;
	}

	.gauge-svg {
		width: 200px;
		height: 120px;
	}

	.progress-arc {
		transition: stroke-dashoffset 0.8s ease-out;
	}

	.gauge-center {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		bottom: 10px;
	}

	.gauge-value {
		font-size: 2rem;
		font-weight: 700;
		color: #f4f4f5;
		font-variant-numeric: tabular-nums;
	}

	.gauge-label {
		font-size: 0.75rem;
		color: #71717a;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.gauge-stats {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1.5rem;
		margin-top: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid #3d4f63;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: #5EB1F7;
		font-variant-numeric: tabular-nums;
	}

	.stat-label {
		font-size: 0.7rem;
		color: #71717a;
	}

	.stat-divider {
		width: 1px;
		height: 30px;
		background: #3d4f63;
	}

	.gauge-legend {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-top: 1rem;
		flex-wrap: wrap;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.7rem;
		color: #71717a;
	}

	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	@media (max-width: 480px) {
		.gauge-legend {
			gap: 0.5rem;
		}

		.legend-item {
			font-size: 0.65rem;
		}
	}
</style>
