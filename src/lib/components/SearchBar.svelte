<script lang="ts">
	import type { TowerSearchDocument } from '$lib/server/meilisearch';

	interface Props {
		onSearch: (query: string) => void;
		onTowerSelect?: (tower: TowerSearchDocument) => void;
		onClear: () => void;
		suggestions?: TowerSearchDocument[];
		placeholder?: string;
		loading?: boolean;
	}

	let {
		onSearch,
		onTowerSelect,
		onClear,
		suggestions = [],
		placeholder = 'Search towers, entities, contacts, addresses...',
		loading = false
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

		{#if showDropdown && suggestions.length > 0}
			<ul class="suggestions-dropdown" role="listbox">
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
			<div class="no-results">
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
		color: #71717a;
		pointer-events: none;
		z-index: 1;
	}

	input {
		width: 100%;
		padding: 0.875rem 2.5rem 0.875rem 3rem;
		background-color: #1e1e2e;
		border: 1px solid #3b3b50;
		border-radius: 0.75rem;
		color: #f4f4f5;
		font-size: 0.9375rem;
		transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
	}

	input:focus {
		outline: none;
		border-color: #3b82f6;
		background-color: #27273a;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
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
		color: #71717a;
		cursor: pointer;
		padding: 0.375rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.375rem;
		transition: color 0.2s, background-color 0.2s;
	}

	.clear-btn:hover {
		color: #f4f4f5;
		background-color: #3b3b50;
	}

	.loading-spinner {
		position: absolute;
		right: 0.875rem;
		width: 18px;
		height: 18px;
		border: 2px solid #3b3b50;
		border-top-color: #3b82f6;
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
		background-color: #1e1e2e;
		border: 1px solid #3b3b50;
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
		transition: background-color 0.15s;
		border-bottom: 1px solid #27273a;
	}

	.suggestions-dropdown li:last-child {
		border-bottom: none;
	}

	.suggestions-dropdown li:hover,
	.suggestions-dropdown li.selected {
		background-color: #27273a;
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
		color: #f4f4f5;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.suggestion-secondary {
		font-size: 0.75rem;
		color: #71717a;
	}

	.suggestion-entity {
		font-size: 0.75rem;
		color: #3b82f6;
	}

	.suggestion-badge {
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.25rem 0.5rem;
		background-color: #27273a;
		color: #a1a1aa;
		border-radius: 0.25rem;
		white-space: nowrap;
	}

	.no-results {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		right: 0;
		background-color: #1e1e2e;
		border: 1px solid #3b3b50;
		border-radius: 0.75rem;
		padding: 1rem;
		text-align: center;
		color: #71717a;
		font-size: 0.875rem;
		z-index: 100;
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
