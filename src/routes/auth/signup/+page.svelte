<script lang="ts">
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
		<div class="auth-header">
			<h1>Create Account</h1>
			<p>Join your company's ACD dashboard</p>
		</div>

		{#if error}
			<div class="error-message">
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
		background: linear-gradient(135deg, #0f0f1a 0%, #1e1e2e 100%);
	}

	.auth-card {
		width: 100%;
		max-width: 400px;
		background-color: #1e1e2e;
		border: 1px solid #3b3b50;
		border-radius: 0.75rem;
		padding: 2rem;
	}

	.auth-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.auth-header h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #f4f4f5;
		margin-bottom: 0.5rem;
	}

	.auth-header p {
		color: #71717a;
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
		color: #a1a1aa;
	}

	input {
		padding: 0.75rem 1rem;
		background-color: #27273a;
		border: 1px solid #3b3b50;
		border-radius: 0.5rem;
		color: #f4f4f5;
		font-size: 0.875rem;
		transition: border-color 0.2s;
	}

	input:focus {
		outline: none;
		border-color: #3b82f6;
	}

	input::placeholder {
		color: #71717a;
	}

	input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.hint {
		font-size: 0.75rem;
		color: #71717a;
	}

	.submit-btn {
		padding: 0.75rem 1.5rem;
		background-color: #3b82f6;
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
		background-color: #2563eb;
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
		color: #71717a;
	}

	.auth-footer a {
		color: #3b82f6;
		text-decoration: none;
		margin-left: 0.5rem;
	}

	.auth-footer a:hover {
		text-decoration: underline;
	}
</style>
