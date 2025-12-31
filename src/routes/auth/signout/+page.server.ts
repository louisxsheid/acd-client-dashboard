import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ cookies }) => {
		// Clear the auth session cookies
		cookies.delete('authjs.session-token', { path: '/' });
		cookies.delete('authjs.callback-url', { path: '/' });
		cookies.delete('authjs.csrf-token', { path: '/' });
		cookies.delete('__Secure-authjs.session-token', { path: '/' });
		cookies.delete('__Secure-authjs.callback-url', { path: '/' });
		cookies.delete('__Secure-authjs.csrf-token', { path: '/' });

		throw redirect(303, '/auth/signin');
	}
};

export async function load() {
	throw redirect(303, '/auth/signin');
}
