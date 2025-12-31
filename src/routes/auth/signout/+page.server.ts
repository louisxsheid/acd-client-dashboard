import { redirect } from '@sveltejs/kit';
import { signOut } from '../../../auth';
import type { Actions } from './$types';

export const actions: Actions = {
	default: signOut
};

export async function load() {
	// Redirect to signin if someone navigates here directly via GET
	throw redirect(303, '/auth/signin');
}
