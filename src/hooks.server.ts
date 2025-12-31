import { handle as authHandle } from './auth';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

// Routes that require authentication
const protectedRoutes = ['/map', '/analytics', '/settings', '/api-keys'];

// Routes that should redirect to /map if already authenticated (exact matches only)
const authPages = ['/auth/signin', '/auth/signup'];

const protectionHandle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

	// Skip Auth.js internal routes - let authHandle process them
	if (pathname.startsWith('/auth/') && !authPages.includes(pathname)) {
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
	if (authPages.includes(pathname)) {
		if (session?.user) {
			throw redirect(303, '/map');
		}
	}

	return resolve(event);
};

export const handle = sequence(authHandle, protectionHandle);
