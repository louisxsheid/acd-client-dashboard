<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import type { TowerSearchDocument } from '$lib/server/meilisearch';

	interface Props {
		onSearch: (query: string) => void;
		onTowerSelect?: (tower: TowerSearchDocument) => void;
		onClear: () => void;
		suggestions?: TowerSearchDocument[];
		placeholder?: string;
		loading?: boolean;
		error?: string | null;
	}

	let {
		onSearch,
		onTowerSelect,
		onClear,
		suggestions = [],
		placeholder = 'Search towers, entities, contacts, addresses...',
		loading = false,
		error = null
	}: Props = $props();

	let query = $state('');
	let showDropdown = $state(false);
	let selectedIndex = $state(-1);
	let inputRef: HTMLInputElement;
	let searchTimeout: ReturnType<typeof setTimeout>;

	// Debounced search
	function handleInput() {
		clearTimeout(searchTimeout);
		selectedIndex = -1;

		if (query.trim().length >= 2) {
			showDropdown = true;
			searchTimeout = setTimeout(() => {
				onSearch(query.trim());
			}, 200);
		} else {
			showDropdown = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (suggestions.length > 0) {
				selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, -1);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (selectedIndex >= 0 && suggestions[selectedIndex]) {
				selectSuggestion(suggestions[selectedIndex]);
			} else if (query.trim()) {
				clearTimeout(searchTimeout);
				onSearch(query.trim());
				showDropdown = false;
			}
		} else if (e.key === 'Escape') {
			showDropdown = false;
			selectedIndex = -1;
		}
	}

	function selectSuggestion(tower: TowerSearchDocument) {
		query = tower.address || tower.entity_name || `Tower ${tower.id}`;
		showDropdown = false;
		selectedIndex = -1;
		onTowerSelect?.(tower);
	}

	function handleClear() {
		query = '';
		showDropdown = false;
		selectedIndex = -1;
		onClear();
	}

	function handleBlur() {
		// Delay to allow click on suggestion
		setTimeout(() => {
			showDropdown = false;
		}, 200);
	}

	function handleFocus() {
		if (query.trim().length >= 2 && suggestions.length > 0) {
			showDropdown = true;
		}
	}

	// Check if input looks like coordinates
	function isCoordinateSearch(q: string): boolean {
		const coordPattern = /^-?\d+\.?\d*[,\s]+-?\d+\.?\d*$/;
		return coordPattern.test(q.trim());
	}

	function formatSuggestion(tower: TowerSearchDocument): { primary: string; secondary: string; badge?: string } {
		const primary = tower.address || `Tower #${tower.id}`;
		const secondary = [tower.city, tower.state].filter(Boolean).join(', ');
		const badge = tower.carrier || undefined;
		return { primary, secondary, badge };
	}
</script>

<div class="search-container">
	<div class="search-input-wrapper">
		<svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="11" cy="11" r="8"/>
			<path d="m21 21-4.3-4.3"/>
		</svg>

		<input
			type="text"
			bind:this={inputRef}
			bind:value={query}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onfocus={handleFocus}
			onblur={handleBlur}
			{placeholder}
			disabled={loading}
			autocomplete="off"
			role="combobox"
			aria-expanded={showDropdown}
			aria-haspopup="listbox"
			aria-autocomplete="list"
		/>

		{#if loading}
			<div class="loading-spinner"></div>
		{:else if query}
			<button type="button" class="clear-btn" onclick={handleClear} aria-label="Clear search">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 6 6 18"/>
					<path d="m6 6 12 12"/>
				</svg>
			</button>
		{/if}

		{#if error}
			<div class="search-error" role="alert" transition:fade={{ duration: 150 }}>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"/>
					<line x1="12" y1="8" x2="12" y2="12"/>
					<line x1="12" y1="16" x2="12.01" y2="16"/>
				</svg>
				<span>{error}</span>
			</div>
		{:else if showDropdown && suggestions.length > 0}
			<ul class="suggestions-dropdown" role="listbox" transition:fly={{ y: -8, duration: 150 }}>
				{#each suggestions as suggestion, i}
					{@const { primary, secondary, badge } = formatSuggestion(suggestion)}
					<li
						role="option"
						aria-selected={i === selectedIndex}
						class:selected={i === selectedIndex}
						onclick={() => selectSuggestion(suggestion)}
						onmouseenter={() => selectedIndex = i}
					>
						<div class="suggestion-content">
							<span class="suggestion-primary">{primary}</span>
							{#if secondary}
								<span class="suggestion-secondary">{secondary}</span>
							{/if}
							{#if suggestion.entity_name}
								<span class="suggestion-entity">{suggestion.entity_name}</span>
							{/if}
						</div>
						{#if badge}
							<span class="suggestion-badge">{badge}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{:else if showDropdown && query.trim().length >= 2 && !loading}
			<div class="no-results" transition:fade={{ duration: 150 }}>
				<span>No results found</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.search-container {
		width: 100%;
		max-width: 600px;
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		color: rgba(255, 255, 255, 0.65);
		pointer-events: none;
		z-index: 1;
	}

	input {
		width: 100%;
		padding: 0.875rem 2.5rem 0.875rem 3rem;
		background-color: #253448;
		border: 1px solid #3d4f63;
		border-radius: 0.75rem;
		color: #FFFFFF;
		font-size: 0.9375rem;
		transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
	}

	input:focus {
		outline: none;
		border-color: #5EB1F7;
		background-color: #2d3e52;
		box-shadow: 0 0 0 3px rgba(94, 177, 247, 0.15);
	}

	input::placeholder {
		color: #52525b;
	}

	input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.clear-btn {
		position: absolute;
		right: 0.875rem;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.65);
		cursor: pointer;
		padding: 0.375rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.375rem;
		transition: color 0.2s, background-color 0.2s;
	}

	.clear-btn:hover {
		color: #FFFFFF;
		background-color: #3d4f63;
	}

	.loading-spinner {
		position: absolute;
		right: 0.875rem;
		width: 18px;
		height: 18px;
		border: 2px solid #3d4f63;
		border-top-color: #5EB1F7;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.suggestions-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		right: 0;
		background-color: #253448;
		border: 1px solid #3d4f63;
		border-radius: 0.75rem;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		list-style: none;
		max-height: 320px;
		overflow-y: auto;
		z-index: 100;
	}

	.suggestions-dropdown li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.875rem 1rem;
		cursor: pointer;
		transition: background-color 0.15s, border-left-color 0.15s, padding-left 0.15s;
		border-bottom: 1px solid #2d3e52;
		border-left: 3px solid transparent;
	}

	.suggestions-dropdown li:last-child {
		border-bottom: none;
	}

	.suggestions-dropdown li:hover,
	.suggestions-dropdown li.selected {
		background-color: #2d3e52;
		border-left-color: #5EB1F7;
	}

	.suggestion-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
		flex: 1;
	}

	.suggestion-primary {
		font-size: 0.875rem;
		font-weight: 500;
		color: #FFFFFF;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.suggestion-secondary {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.suggestion-entity {
		font-size: 0.75rem;
		color: #5EB1F7;
	}

	.suggestion-badge {
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.25rem 0.5rem;
		background-color: #2d3e52;
		color: rgba(255, 255, 255, 0.7);
		border-radius: 0.25rem;
		white-space: nowrap;
	}

	.no-results {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		right: 0;
		background-color: #253448;
		border: 1px solid #3d4f63;
		border-radius: 0.75rem;
		padding: 1rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.875rem;
		z-index: 100;
	}

	.search-error {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		right: 0;
		background-color: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 0.75rem;
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #ef4444;
		font-size: 0.875rem;
		z-index: 100;
	}

	.search-error svg {
		flex-shrink: 0;
	}

	/* Responsive */
	@media (max-width: 640px) {
		input {
			padding: 0.75rem 2.25rem 0.75rem 2.75rem;
			font-size: 1rem; /* Prevent zoom on iOS */
		}

		.suggestions-dropdown li {
			padding: 0.75rem;
		}
	}
</style>
