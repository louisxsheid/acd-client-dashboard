import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverClient } from '$lib/graphql/server-client';
import { GET_TOWER_DETAILS, GET_ENTITY_CONTACTS } from '$lib/graphql/queries';

export const GET: RequestHandler = async ({ params, locals }) => {
	// Check authentication
	const session = await locals.auth?.();
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	const companyId = (session.user as any).companyId;

	if (!companyId) {
		throw error(400, 'No company associated with user');
	}

	const towerId = parseInt(params.id, 10);

	if (isNaN(towerId)) {
		throw error(400, 'Invalid tower ID');
	}

	try {
		const result = await serverClient
			.query(GET_TOWER_DETAILS, {
				towerId,
				companyId
			})
			.toPromise();

		if (result.error) {
			console.error('[Tower API] GraphQL error:', result.error);
			throw error(500, 'Failed to fetch tower details');
		}

		const companyTowers = result.data?.company_towers || [];

		if (companyTowers.length === 0) {
			throw error(404, 'Tower not found or access denied');
		}

		const towerData = companyTowers[0];

		// Fetch entity contacts separately if entity exists
		const entityId = towerData.tower?.tower_site?.entity?.id;
		if (entityId) {
			try {
				const contactsResult = await serverClient
					.query(GET_ENTITY_CONTACTS, { entityId })
					.toPromise();

				if (!contactsResult.error && contactsResult.data?.entity_contacts) {
					// Add contacts to the entity object
					towerData.tower.tower_site.entity.entity_contacts = contactsResult.data.entity_contacts;
				}
			} catch (contactErr) {
				// Contacts fetch failed, continue without them
				console.error('[Tower API] Failed to fetch contacts:', contactErr);
			}
		}

		return json({
			tower: towerData
		});
	} catch (err) {
		console.error('[Tower API] Tower fetch error:', err);
		throw error(500, 'Failed to fetch tower details');
	}
};
