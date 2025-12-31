<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { signOut } from '@auth/sveltekit/client';

	let { children, data }: { children: Snippet; data: { session: any } } = $props();

	const session = data.session;
	let mobileMenuOpen = $state(false);
	let userMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	function toggleUserMenu() {
		userMenuOpen = !userMenuOpen;
	}

	function closeUserMenu() {
		userMenuOpen = false;
	}

	async function handleSignOut() {
		await signOut({ callbackUrl: '/auth/signin' });
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
	{#if session?.user}
		<header>
			<nav>
				<div class="nav-left">
					<a href="/map" class="logo">
						<svg class="logo-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M3 7V5a2 2 0 0 1 2-2h2"/>
							<path d="M17 3h2a2 2 0 0 1 2 2v2"/>
							<path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
							<path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
							<circle cx="12" cy="12" r="3"/>
							<path d="m16 16-1.5-1.5"/>
						</svg>
						<span class="logo-text">ACD</span>
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
								<button type="button" class="dropdown-signout" onclick={handleSignOut}>
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
										<polyline points="16 17 21 12 16 7"/>
										<line x1="21" y1="12" x2="9" y2="12"/>
									</svg>
									Sign Out
								</button>
							</div>
						{/if}
					</div>
				</div>

				<button class="mobile-menu-btn mobile-only" onclick={toggleMobileMenu} aria-label="Toggle menu">
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
				<div class="mobile-menu">
					<div class="mobile-user-info">
						<div class="user-avatar mobile">
							{(session.user.name || session.user.email || 'U').charAt(0).toUpperCase()}
						</div>
						<div class="mobile-user-details">
							<span class="user-name">{session.user.name || session.user.email}</span>
							<span class="company-badge">{session.user.companyName}</span>
						</div>
					</div>
					<div class="mobile-nav-links">
						<a href="/map" class:active={$page.url.pathname === '/map'} onclick={closeMobileMenu}>
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
								<line x1="9" y1="3" x2="9" y2="18"/>
								<line x1="15" y1="6" x2="15" y2="21"/>
							</svg>
							Map
						</a>
						<a href="/analytics" class:active={$page.url.pathname === '/analytics'} onclick={closeMobileMenu}>
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M3 3v18h18"/>
								<path d="m19 9-5 5-4-4-3 3"/>
							</svg>
							Analytics
						</a>
					</div>
					<div class="mobile-signout">
						<button type="button" class="signout-btn-mobile" onclick={handleSignOut}>
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
								<polyline points="16 17 21 12 16 7"/>
								<line x1="21" y1="12" x2="9" y2="12"/>
							</svg>
							Sign Out
						</button>
					</div>
				</div>
			{/if}
		</header>
	{/if}

	<main class:has-header={!!session?.user}>
		{@render children()}
	</main>
</div>

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background-color: #0f0f1a;
		color: #f4f4f5;
		min-height: 100vh;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		background-color: #1e1e2e;
		border-bottom: 1px solid #3b3b50;
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
		color: #3b82f6;
	}

	.logo-icon {
		flex-shrink: 0;
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
		color: #71717a;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		padding: 0.5rem 0.875rem;
		border-radius: 0.5rem;
		transition: all 0.15s;
	}

	.nav-links a:hover {
		color: #f4f4f5;
		background-color: rgba(255, 255, 255, 0.05);
	}

	.nav-links a.active {
		color: #3b82f6;
		background-color: rgba(59, 130, 246, 0.1);
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
		border: 1px solid #3b3b50;
		padding: 0.375rem 0.625rem 0.375rem 0.375rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.user-btn:hover {
		background-color: rgba(255, 255, 255, 0.05);
		border-color: #52525b;
	}

	.user-avatar {
		width: 28px;
		height: 28px;
		background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
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
		color: #71717a;
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
		background-color: #1e1e2e;
		border: 1px solid #3b3b50;
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
		color: #f4f4f5;
	}

	.dropdown-email {
		font-size: 0.75rem;
		color: #71717a;
	}

	.dropdown-company {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #3b82f6;
		margin-top: 0.25rem;
	}

	.dropdown-divider {
		height: 1px;
		background-color: #3b3b50;
	}

	.dropdown-signout {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		color: #a1a1aa;
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
		color: #3b82f6;
		padding: 0.25rem 0.5rem;
		background-color: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.2);
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
		color: #a1a1aa;
		cursor: pointer;
		border-radius: 0.5rem;
		transition: all 0.15s;
	}

	.mobile-menu-btn:hover {
		background-color: rgba(255, 255, 255, 0.05);
		color: #f4f4f5;
	}

	/* Mobile menu */
	.mobile-menu {
		background-color: #1e1e2e;
		border-top: 1px solid #3b3b50;
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
		border-bottom: 1px solid #27273a;
	}

	.mobile-user-details {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.user-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: #f4f4f5;
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
		color: #a1a1aa;
		text-decoration: none;
		font-size: 0.9375rem;
		font-weight: 500;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		transition: all 0.15s;
	}

	.mobile-nav-links a:hover {
		color: #f4f4f5;
		background-color: rgba(255, 255, 255, 0.05);
	}

	.mobile-nav-links a.active {
		color: #3b82f6;
		background-color: rgba(59, 130, 246, 0.1);
	}

	.mobile-signout {
		padding-top: 0.5rem;
		border-top: 1px solid #27273a;
	}

	.signout-btn-mobile {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1rem;
		background: none;
		border: 1px solid #3b3b50;
		color: #a1a1aa;
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
