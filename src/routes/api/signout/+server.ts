import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	// Clear all auth-related cookies
	cookies.delete('authjs.session-token', { path: '/' });
	cookies.delete('authjs.callback-url', { path: '/' });
	cookies.delete('authjs.csrf-token', { path: '/' });
	cookies.delete('__Secure-authjs.session-token', { path: '/' });
	cookies.delete('__Secure-authjs.callback-url', { path: '/' });
	cookies.delete('__Secure-authjs.csrf-token', { path: '/' });

	throw redirect(303, '/auth/signin');
};
