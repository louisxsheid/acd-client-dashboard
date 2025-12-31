<script lang="ts">
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let companyCode = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		if (password.length < 8) {
			error = 'Password must be at least 8 characters';
			return;
		}

		loading = true;

		try {
			const response = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, password, companyCode })
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.message || 'Failed to create account';
				return;
			}

			// Redirect to sign in with success message
			goto('/auth/signin?registered=true');
		} catch (err) {
			error = 'An error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="auth-container">
	<div class="auth-card">
		<div class="logo">
			<div class="logo-square">
				<img src="/aerocell-icon.png" alt="AeroCell" class="logo-img" />
			</div>
			<span>AeroCell</span>
		</div>
		<div class="auth-header">
			<h1>Create Account</h1>
			<p>Join your company's AeroCell dashboard</p>
		</div>

		{#if error}
			<div class="error-message" transition:fly={{ y: -10, duration: 200 }}>
				{error}
			</div>
		{/if}

		<form onsubmit={handleSubmit}>
			<div class="form-group">
				<label for="name">Full Name</label>
				<input
					type="text"
					id="name"
					bind:value={name}
					placeholder="John Smith"
					required
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="email">Email</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					placeholder="you@company.com"
					required
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="companyCode">Company Code</label>
				<input
					type="text"
					id="companyCode"
					bind:value={companyCode}
					placeholder="Enter your company's invite code"
					required
					disabled={loading}
				/>
				<span class="hint">Contact your administrator for the company code</span>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					placeholder="At least 8 characters"
					required
					minlength="8"
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="confirmPassword">Confirm Password</label>
				<input
					type="password"
					id="confirmPassword"
					bind:value={confirmPassword}
					placeholder="Confirm your password"
					required
					disabled={loading}
				/>
			</div>

			<button type="submit" class="submit-btn" disabled={loading}>
				{#if loading}
					<span class="spinner"></span>
					Creating account...
				{:else}
					Create Account
				{/if}
			</button>
		</form>

		<div class="auth-footer">
			<span>Already have an account?</span>
			<a href="/auth/signin">Sign in</a>
		</div>
	</div>
</div>

<style>
	.auth-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: linear-gradient(135deg, #1D2C43 0%, #253448 100%);
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.auth-card {
		width: 100%;
		max-width: 400px;
		background-color: #253448;
		border: 1px solid #3d4f63;
		border-radius: 0.75rem;
		padding: 2rem;
	}

	.logo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		color: #FFFFFF;
		margin-bottom: 1.5rem;
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

	.auth-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.auth-header h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #FFFFFF;
		margin-bottom: 0.5rem;
	}

	.auth-header p {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.875rem;
	}

	.error-message {
		background-color: rgba(239, 68, 68, 0.1);
		border: 1px solid #ef4444;
		color: #ef4444;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		margin-bottom: 1.5rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
	}

	input {
		padding: 0.75rem 1rem;
		background-color: #1D2C43;
		border: 1px solid #3d4f63;
		border-radius: 0.5rem;
		color: #FFFFFF;
		font-size: 0.875rem;
		transition: border-color 0.2s;
	}

	input:focus {
		outline: none;
		border-color: #5EB1F7;
	}

	input::placeholder {
		color: rgba(255, 255, 255, 0.55);
	}

	input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.hint {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.65);
	}

	.submit-btn {
		padding: 0.75rem 1.5rem;
		background-color: #5EB1F7;
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.submit-btn:hover:not(:disabled) {
		background-color: #4A9DE0;
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.auth-footer {
		margin-top: 1.5rem;
		text-align: center;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.auth-footer a {
		color: #5EB1F7;
		text-decoration: none;
		margin-left: 0.5rem;
	}

	.auth-footer a:hover {
		text-decoration: underline;
	}
</style>
