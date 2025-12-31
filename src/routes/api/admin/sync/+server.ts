import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { fullSync } from '$lib/server/sync-meilisearch';

const ADMIN_SECRET = env.HASURA_GRAPHQL_ADMIN_SECRET || env.HASURA_ADMIN_SECRET;

if (!ADMIN_SECRET) {
	throw new Error('HASURA_ADMIN_SECRET environment variable is not configured');
}

export const POST: RequestHandler = async ({ request }) => {
	// Simple secret-based auth for admin endpoints
	const authHeader = request.headers.get('x-admin-secret');
	if (authHeader !== ADMIN_SECRET) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		console.log('Starting Meilisearch sync...');
		const result = await fullSync();
		console.log('Meilisearch sync complete:', result);

		return json({
			success: true,
			synced: result
		});
	} catch (error) {
		console.error('Meilisearch sync error:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
