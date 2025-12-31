import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverClient } from '$lib/graphql/server-client';
import { GET_TOWER_DETAILS } from '$lib/graphql/queries';

export const GET: RequestHandler = async ({ params, locals }) => {
	// Check authentication
	const session = await locals.auth?.();
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	const companyId = (session.user as any).companyId;
	console.log('[Tower API] Session user:', session.user);
	console.log('[Tower API] Company ID:', companyId);

	if (!companyId) {
		throw error(400, 'No company associated with user');
	}

	const towerId = parseInt(params.id, 10);
	console.log('[Tower API] Tower ID:', towerId);

	if (isNaN(towerId)) {
		throw error(400, 'Invalid tower ID');
	}

	try {
		console.log('[Tower API] Querying with:', { towerId, companyId });
		const result = await serverClient
			.query(GET_TOWER_DETAILS, {
				towerId,
				companyId
			})
			.toPromise();

		console.log('[Tower API] Result:', JSON.stringify(result, null, 2));

		if (result.error) {
			console.error('[Tower API] GraphQL error:', result.error);
			throw error(500, 'Failed to fetch tower details');
		}

		const companyTowers = result.data?.company_towers || [];
		console.log('[Tower API] Company towers count:', companyTowers.length);

		if (companyTowers.length === 0) {
			throw error(404, 'Tower not found or access denied');
		}

		return json({
			tower: companyTowers[0]
		});
	} catch (err) {
		console.error('[Tower API] Tower fetch error:', err);
		throw error(500, 'Failed to fetch tower details');
	}
};
