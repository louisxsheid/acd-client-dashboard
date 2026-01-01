<script lang="ts">
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import TopographicBackground from '$lib/components/TopographicBackground.svelte';

	let { children, data }: { children: Snippet; data: { session: any } } = $props();

	// Show topo background on analytics and export pages
	const showTopoBg = $derived(
		$page.url.pathname === '/analytics' || $page.url.pathname === '/export'
	);

	const session = $derived(data.session);
	let mobileMenuOpen = $state(false);
	let userMenuOpen = $state(false);
	let mobileMenuRef: HTMLDivElement | null = $state(null);
	let mobileMenuBtnRef: HTMLButtonElement | null = $state(null);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
		// Return focus to the toggle button
		mobileMenuBtnRef?.focus();
	}

	function toggleUserMenu() {
		userMenuOpen = !userMenuOpen;
	}

	function closeUserMenu() {
		userMenuOpen = false;
	}

	// Focus trap for mobile menu
	function handleMobileMenuKeydown(e: KeyboardEvent) {
		if (!mobileMenuOpen || !mobileMenuRef) return;

		if (e.key === 'Escape') {
			closeMobileMenu();
			return;
		}

		if (e.key === 'Tab') {
			const focusableElements = mobileMenuRef.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled])'
			);
			const firstEl = focusableElements[0];
			const lastEl = focusableElements[focusableElements.length - 1];

			if (e.shiftKey && document.activeElement === firstEl) {
				e.preventDefault();
				lastEl?.focus();
			} else if (!e.shiftKey && document.activeElement === lastEl) {
				e.preventDefault();
				firstEl?.focus();
			}
		}
	}

</script>

<svelte:head>
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!-- Close user menu when clicking outside -->
<svelte:window on:click={(e) => {
	const target = e.target as HTMLElement;
	if (!target.closest('.user-menu-container')) {
		userMenuOpen = false;
	}
}} />

<div class="app">
	<TopographicBackground visible={showTopoBg} />
	{#if session?.user}
		<header>
			<nav>
				<div class="nav-left">
					<a href="/map" class="logo">
						<div class="logo-square">
							<img src="/aerocell-icon.png" alt="AeroCell" class="logo-img" />
						</div>
						<span class="logo-text">AeroCell</span>
					</a>

					<div class="nav-links desktop-only">
						<a href="/map" class:active={$page.url.pathname === '/map'}>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
								<line x1="9" y1="3" x2="9" y2="18"/>
								<line x1="15" y1="6" x2="15" y2="21"/>
							</svg>
							Map
						</a>
						<a href="/analytics" class:active={$page.url.pathname === '/analytics'}>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M3 3v18h18"/>
								<path d="m19 9-5 5-4-4-3 3"/>
							</svg>
							Analytics
						</a>
						<a href="/export" class:active={$page.url.pathname === '/export'}>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
								<polyline points="7 10 12 15 17 10"/>
								<line x1="12" x2="12" y1="15" y2="3"/>
							</svg>
							Export
						</a>
					</div>
				</div>

				<div class="nav-right desktop-only">
					<div class="user-menu-container">
						<button class="user-btn" onclick={toggleUserMenu} aria-label="User menu">
							<div class="user-avatar">
								{(session.user.name || session.user.email || 'U').charAt(0).toUpperCase()}
							</div>
							<svg class="chevron" class:open={userMenuOpen} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="m6 9 6 6 6-6"/>
							</svg>
						</button>

						{#if userMenuOpen}
							<div class="user-dropdown">
								<div class="dropdown-header">
									<span class="dropdown-name">{session.user.name || 'User'}</span>
									<span class="dropdown-email">{session.user.email}</span>
									<span class="dropdown-company">{session.user.companyName}</span>
								</div>
								<div class="dropdown-divider"></div>
								<form method="POST" action="/api/signout">
									<button type="submit" class="dropdown-signout">
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
											<polyline points="16 17 21 12 16 7"/>
											<line x1="21" y1="12" x2="9" y2="12"/>
										</svg>
										Sign Out
									</button>
								</form>
							</div>
						{/if}
					</div>
				</div>

				<button bind:this={mobileMenuBtnRef} class="mobile-menu-btn mobile-only" onclick={toggleMobileMenu} aria-label="Toggle menu" aria-expanded={mobileMenuOpen}>
					{#if mobileMenuOpen}
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"/>
							<line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<line x1="4" y1="12" x2="20" y2="12"/>
							<line x1="4" y1="6" x2="20" y2="6"/>
							<line x1="4" y1="18" x2="20" y2="18"/>
						</svg>
					{/if}
				</button>
			</nav>

			{#if mobileMenuOpen}
				<div bind:this={mobileMenuRef} class="mobile-menu" transition:slide={{ duration: 200, easing: cubicOut }} onkeydown={handleMobileMenuKeydown} role="menu">
					<div class="mobile-user-info">
						<div class="user-avatar mobile">
							{(session.user.name || session.user.email || 'U').charAt(0).toUpperCase()}
						</div>
						<div class="mobile-user-details">
							<span class="user-name">{session.user.name || session.user.email}</span>
							<span class="company-badge">{session.user.companyName}</span>
						</div>
					</div>
					<div class="mobile-nav-links" role="group">
						<a href="/map" class:active={$page.url.pathname === '/map'} onclick={closeMobileMenu} role="menuitem">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
								<line x1="9" y1="3" x2="9" y2="18"/>
								<line x1="15" y1="6" x2="15" y2="21"/>
							</svg>
							Map
						</a>
						<a href="/analytics" class:active={$page.url.pathname === '/analytics'} onclick={closeMobileMenu} role="menuitem">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M3 3v18h18"/>
								<path d="m19 9-5 5-4-4-3 3"/>
							</svg>
							Analytics
						</a>
						<a href="/export" class:active={$page.url.pathname === '/export'} onclick={closeMobileMenu} role="menuitem">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
								<polyline points="7 10 12 15 17 10"/>
								<line x1="12" x2="12" y1="15" y2="3"/>
							</svg>
							Export
						</a>
					</div>
					<form method="POST" action="/api/signout" class="mobile-signout">
						<button type="submit" class="signout-btn-mobile">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
								<polyline points="16 17 21 12 16 7"/>
								<line x1="21" y1="12" x2="9" y2="12"/>
							</svg>
							Sign Out
						</button>
					</form>
				</div>
			{/if}
		</header>
	{/if}

	<main class:has-header={!!session?.user}>
		{@render children()}
	</main>
</div>

<style>
	/* AeroCell Brand Colors */
	:root {
		--aero-navy: #1D2C43;
		--aero-teal: #5EB1F7;
		--aero-white: #FFFFFF;
		--aero-navy-light: #253448;
		--aero-navy-lighter: #2d3e52;
		--aero-border: #3d4f63;
	}

	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background-color: var(--aero-navy);
		color: var(--aero-white);
		min-height: 100vh;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		background-color: var(--aero-navy-light);
		border-bottom: 1px solid var(--aero-border);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	nav {
		padding: 0 1rem;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.nav-left {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--aero-white);
	}

	.logo-square {
		width: 32px;
		height: 32px;
		min-width: 32px;
		min-height: 32px;
		background-color: #5EB1F7;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		transition: transform 0.15s;
	}

	.logo:hover .logo-square {
		transform: scale(1.05);
	}

	.logo-img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
	}

	.logo-text {
		font-size: 1.125rem;
		font-weight: 700;
		letter-spacing: -0.025em;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.nav-links a {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: rgba(255, 255, 255, 0.6);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		padding: 0.5rem 0.875rem;
		border-radius: 0.5rem;
		transition: all 0.15s;
	}

	.nav-links a:hover {
		color: var(--aero-white);
		background-color: rgba(255, 255, 255, 0.05);
	}

	.nav-links a:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px rgba(94, 177, 247, 0.3);
	}

	.nav-links a.active {
		color: var(--aero-teal);
		background-color: rgba(94, 177, 247, 0.1);
	}

	.nav-links a svg {
		flex-shrink: 0;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	/* User menu */
	.user-menu-container {
		position: relative;
	}

	.user-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: none;
		border: 1px solid var(--aero-border);
		padding: 0.375rem 0.625rem 0.375rem 0.375rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.user-btn:hover {
		background-color: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.user-avatar {
		width: 28px;
		height: 28px;
		background: linear-gradient(135deg, #5EB1F7 0%, #1D2C43 100%);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
	}

	.user-avatar.mobile {
		width: 36px;
		height: 36px;
		font-size: 0.875rem;
	}

	.chevron {
		color: rgba(255, 255, 255, 0.6);
		transition: transform 0.15s;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.user-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		width: 220px;
		background-color: var(--aero-navy-light);
		border: 1px solid var(--aero-border);
		border-radius: 0.75rem;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
		overflow: hidden;
		animation: dropdownFade 0.15s ease-out;
	}

	@keyframes dropdownFade {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.dropdown-header {
		padding: 0.875rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.dropdown-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--aero-white);
	}

	.dropdown-email {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.dropdown-company {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #5EB1F7;
		margin-top: 0.25rem;
	}

	.dropdown-divider {
		height: 1px;
		background-color: var(--aero-border);
	}

	.dropdown-signout {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
		text-align: left;
	}

	.dropdown-signout:hover {
		background-color: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.company-badge {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #5EB1F7;
		padding: 0.25rem 0.5rem;
		background-color: rgba(94, 177, 247, 0.1);
		border: 1px solid rgba(94, 177, 247, 0.2);
		border-radius: 0.375rem;
	}

	/* Mobile menu button */
	.mobile-menu-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		border-radius: 0.5rem;
		transition: all 0.15s;
	}

	.mobile-menu-btn:hover {
		background-color: rgba(255, 255, 255, 0.05);
		color: var(--aero-white);
	}

	/* Mobile menu */
	.mobile-menu {
		background-color: var(--aero-navy-light);
		border-top: 1px solid var(--aero-border);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.mobile-user-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--aero-navy-lighter);
	}

	.mobile-user-details {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.user-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--aero-white);
	}

	.mobile-nav-links {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.mobile-nav-links a {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		font-size: 0.9375rem;
		font-weight: 500;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		transition: all 0.15s;
	}

	.mobile-nav-links a:hover {
		color: var(--aero-white);
		background-color: rgba(255, 255, 255, 0.05);
	}

	.mobile-nav-links a.active {
		color: #5EB1F7;
		background-color: rgba(94, 177, 247, 0.1);
	}

	.mobile-signout {
		padding-top: 0.5rem;
		border-top: 1px solid var(--aero-navy-lighter);
	}

	.signout-btn-mobile {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1rem;
		background: none;
		border: 1px solid var(--aero-border);
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.9375rem;
		font-weight: 500;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.signout-btn-mobile:hover {
		background-color: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	/* Responsive visibility */
	.desktop-only {
		display: flex;
	}

	.mobile-only {
		display: none;
	}

	@media (max-width: 768px) {
		.desktop-only {
			display: none;
		}

		.mobile-only {
			display: flex;
		}

		nav {
			padding: 0 0.75rem;
		}
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	main.has-header {
		padding: 0;
	}
</style>
