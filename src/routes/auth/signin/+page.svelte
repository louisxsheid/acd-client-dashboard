<script lang="ts">
	import { fly } from 'svelte/transition';
	import { signIn } from '@auth/sveltekit/client';
	import { page } from '$app/stores';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	const redirectUrl = $derived($page.url.searchParams.get('redirect') || '/map');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const result = await signIn('credentials', {
				email,
				password,
				redirect: false,
				callbackUrl: redirectUrl
			}, {
				basePath: '/api/auth'
			});

			if (result?.error) {
				error = 'Invalid email or password';
			} else {
				window.location.href = redirectUrl;
			}
		} catch (err) {
			error = 'An error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="auth-page">
	<div class="auth-container">
		<div class="logo">
			<div class="logo-square">
				<img src="/aerocell-icon.png" alt="AeroCell" class="logo-img" />
			</div>
			<span>AeroCell</span>
		</div>

		<div class="auth-card">
			<h1>Welcome back</h1>
			<p class="subtitle">Sign in to your account</p>

			{#if error}
				<div class="error-message" transition:fly={{ y: -10, duration: 200 }}>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"/>
						<line x1="12" y1="8" x2="12" y2="12"/>
						<line x1="12" y1="16" x2="12.01" y2="16"/>
					</svg>
					{error}
				</div>
			{/if}

			<form onsubmit={handleSubmit}>
				<div class="form-group">
					<label for="email">Email</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						placeholder="you@company.com"
						required
						disabled={loading}
						autocomplete="email"
					/>
				</div>

				<div class="form-group">
					<label for="password">Password</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						placeholder="Enter your password"
						required
						disabled={loading}
						autocomplete="current-password"
					/>
				</div>

				<button type="submit" class="submit-btn" disabled={loading}>
					{#if loading}
						<span class="spinner"></span>
						Signing in...
					{:else}
						Sign In
					{/if}
				</button>
			</form>
		</div>

		<p class="footer-text">
			Don't have an account? <a href="/auth/signup">Create one</a>
		</p>
	</div>
</div>

<style>
	.auth-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #1D2C43;
		padding: 1.5rem;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.auth-container {
		width: 100%;
		max-width: 380px;
	}

	.logo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		color: #FFFFFF;
		margin-bottom: 2rem;
	}

	.logo-square {
		width: 40px;
		height: 40px;
		min-width: 40px;
		min-height: 40px;
		background-color: #5EB1F7;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
	}

	.logo-img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
	}

	.logo span {
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.025em;
	}

	.auth-card {
		background-color: #253448;
		border: 1px solid #3d4f63;
		border-radius: 12px;
		padding: 2rem;
	}

	h1 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #FFFFFF;
		margin: 0 0 0.25rem 0;
	}

	.subtitle {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.875rem;
		margin: 0 0 1.5rem 0;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background-color: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		color: #f87171;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-size: 0.875rem;
		margin-bottom: 1.5rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
	}

	input {
		padding: 0.625rem 0.875rem;
		background-color: #1D2C43;
		border: 1px solid #3d4f63;
		border-radius: 8px;
		color: #FFFFFF;
		font-size: 0.875rem;
		font-family: inherit;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	input:focus {
		outline: none;
		border-color: #5EB1F7;
		box-shadow: 0 0 0 3px rgba(94, 177, 247, 0.1);
	}

	input::placeholder {
		color: rgba(255, 255, 255, 0.55);
	}

	input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-btn {
		padding: 0.625rem 1rem;
		background-color: #5EB1F7;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: background-color 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.submit-btn:hover:not(:disabled) {
		background-color: #4A9DE0;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.footer-text {
		margin-top: 1.5rem;
		text-align: center;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.footer-text a {
		color: #5EB1F7;
		text-decoration: none;
		font-weight: 500;
	}

	.footer-text a:hover {
		text-decoration: underline;
	}
</style>
