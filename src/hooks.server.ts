import { SvelteKitAuth } from '@auth/sveltekit';
import Credentials from '@auth/sveltekit/providers/credentials';
import bcrypt from 'bcrypt';
import { getUserByEmail, updateUserLastLogin } from '$lib/server/db';
import { env } from '$env/dynamic/private';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

// Auth.js configuration with explicit basePath
const { handle: authHandle } = SvelteKitAuth({
	basePath: '/api/auth',
	secret: env.AUTH_SECRET,
	trustHost: true,
	providers: [
		Credentials({
			name: 'credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' }
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) {
					return null;
				}

				const email = credentials.email as string;
				const password = credentials.password as string;

				try {
					const user = await getUserByEmail(email);

					if (!user) {
						return null;
					}

					const isValidPassword = await bcrypt.compare(password, user.password_hash);

					if (!isValidPassword) {
						return null;
					}

					await updateUserLastLogin(user.id);

					return {
						id: user.id,
						email: user.email,
						name: user.name,
						role: user.role,
						companyId: user.company_id,
						companyName: user.company_name
					};
				} catch (error) {
					console.error('Auth error:', error);
					return null;
				}
			}
		})
	],
	session: {
		strategy: 'jwt',
		maxAge: 7 * 24 * 60 * 60 // 7 days (reduced from 30 for security)
	},
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
				token.email = user.email;
				token.name = user.name;
				token.role = (user as any).role;
				token.companyId = (user as any).companyId;
				token.companyName = (user as any).companyName;
			}
			return token;
		},
		async session({ session, token }) {
			if (token && session.user) {
				session.user.id = token.id as string;
				session.user.email = token.email as string;
				session.user.name = token.name as string | null;
				(session.user as any).role = token.role;
				(session.user as any).companyId = token.companyId;
				(session.user as any).companyName = token.companyName;
			}
			return session;
		}
	}
});

// Routes that require authentication
const protectedRoutes = ['/map', '/analytics', '/settings', '/api-keys'];

// Custom pages that should NOT be handled by Auth.js
const customAuthPages = ['/auth/signin', '/auth/signup'];

// Wrapper to skip Auth.js for our custom auth pages
const wrappedAuthHandle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

	// Skip Auth.js for our custom signin/signup pages - let SvelteKit render them
	if (customAuthPages.includes(pathname)) {
		return resolve(event);
	}

	// Let Auth.js handle everything else (including /api/auth/*)
	return authHandle({ event, resolve });
};

const protectionHandle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

	// Skip protection logic for Auth.js API routes
	if (pathname.startsWith('/api/auth')) {
		return resolve(event);
	}

	const session = await event.locals.auth?.();

	// Check if trying to access protected route without auth
	if (protectedRoutes.some((route) => pathname.startsWith(route))) {
		if (!session?.user) {
			const redirectUrl = encodeURIComponent(pathname);
			throw redirect(303, `/auth/signin?redirect=${redirectUrl}`);
		}

		// Add user to locals for easy access
		event.locals.user = {
			id: session.user.id as string,
			email: session.user.email as string,
			name: session.user.name ?? null,
			role: (session.user as any).role,
			companyId: (session.user as any).companyId,
			companyName: (session.user as any).companyName
		};
	}

	// Redirect authenticated users away from signin/signup pages
	if (customAuthPages.includes(pathname)) {
		if (session?.user) {
			throw redirect(303, '/map');
		}
	}

	return resolve(event);
};

export const handle = sequence(wrappedAuthHandle, protectionHandle);
