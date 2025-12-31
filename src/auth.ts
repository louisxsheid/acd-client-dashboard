import { SvelteKitAuth } from '@auth/sveltekit';
import Credentials from '@auth/sveltekit/providers/credentials';
import bcrypt from 'bcrypt';
import { getUserByEmail, updateUserLastLogin, createSession, getSessionByToken, deleteSession } from '$lib/server/db';
import { AUTH_SECRET } from '$env/static/private';
import type { Handle } from '@sveltejs/kit';

export const { handle, signIn, signOut } = SvelteKitAuth({
	secret: AUTH_SECRET,
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

					// Update last login time
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
		maxAge: 30 * 24 * 60 * 60 // 30 days
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
	},
	pages: {
		signIn: '/auth/signin',
		error: '/auth/signin'
	}
}) satisfies { handle: Handle; signIn: typeof signIn; signOut: typeof signOut };
