import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverClient } from '$lib/graphql/server-client';
import { gql } from '@urql/core';

// GraphQL queries for search
const SEARCH_COMPANY_TOWERS = gql`
	query SearchCompanyTowers($companyId: uuid!, $search: String, $limit: Int!, $offset: Int!) {
		company_towers(
			where: {
				company_id: { _eq: $companyId }
				_or: [
					{ tower: { tower_site: { address: { _ilike: $search } } } }
					{ tower: { tower_site: { city: { _ilike: $search } } } }
					{ tower: { tower_site: { state: { _ilike: $search } } } }
					{ tower: { tower_site: { zip_code: { _ilike: $search } } } }
					{ tower: { tower_site: { carrier: { _ilike: $search } } } }
					{ tower: { tower_site: { entity: { name: { _ilike: $search } } } } }
				]
			}
			limit: $limit
			offset: $offset
			order_by: { tower: { id: asc } }
		) {
			id
			access_state
			tower {
				id
				latitude
				longitude
				tower_type
				endc_available
				tower_providers {
					provider {
						name
					}
				}
				tower_site {
					address
					city
					state
					zip_code
					carrier
					entity {
						name
					}
				}
			}
		}
		company_towers_aggregate(
			where: {
				company_id: { _eq: $companyId }
				_or: [
					{ tower: { tower_site: { address: { _ilike: $search } } } }
					{ tower: { tower_site: { city: { _ilike: $search } } } }
					{ tower: { tower_site: { state: { _ilike: $search } } } }
					{ tower: { tower_site: { zip_code: { _ilike: $search } } } }
					{ tower: { tower_site: { carrier: { _ilike: $search } } } }
					{ tower: { tower_site: { entity: { name: { _ilike: $search } } } } }
				]
			}
		) {
			aggregate {
				count
			}
		}
	}
`;

const GET_ALL_COMPANY_TOWERS = gql`
	query GetAllCompanyTowers($companyId: uuid!, $limit: Int!, $offset: Int!) {
		company_towers(
			where: { company_id: { _eq: $companyId } }
			limit: $limit
			offset: $offset
			order_by: { tower: { id: asc } }
		) {
			id
			access_state
			tower {
				id
				latitude
				longitude
				tower_type
				endc_available
				tower_providers {
					provider {
						name
					}
				}
				tower_site {
					address
					city
					state
					zip_code
					carrier
					entity {
						name
					}
				}
			}
		}
		company_towers_aggregate(where: { company_id: { _eq: $companyId } }) {
			aggregate {
				count
			}
		}
	}
`;

interface TowerHit {
	id: number;
	latitude: number;
	longitude: number;
	tower_type: string;
	endc_available: boolean;
	access_states: Record<string, string>;
	address: string | null;
	city: string | null;
	state: string | null;
	zip_code: string | null;
	carrier: string | null;
	entity_name: string | null;
	provider_names: string[];
	provider_count: number;
}

function transformTowerHits(companyTowers: any[], companyId: string): TowerHit[] {
	return companyTowers.map((ct) => {
		const providerNames = (ct.tower.tower_providers || [])
			.map((tp: any) => tp.provider?.name)
			.filter(Boolean) as string[];

		return {
			id: ct.tower.id,
			latitude: ct.tower.latitude,
			longitude: ct.tower.longitude,
			tower_type: ct.tower.tower_type || 'MACRO',
			endc_available: ct.tower.endc_available || false,
			access_states: { [companyId]: ct.access_state },
			address: ct.tower.tower_site?.address || null,
			city: ct.tower.tower_site?.city || null,
			state: ct.tower.tower_site?.state || null,
			zip_code: ct.tower.tower_site?.zip_code || null,
			carrier: ct.tower.tower_site?.carrier || null,
			entity_name: ct.tower.tower_site?.entity?.name || null,
			provider_names: providerNames,
			provider_count: providerNames.length
		};
	});
}

export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	const session = await locals.auth?.();
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	const companyId = (session.user as any).companyId;
	if (!companyId) {
		throw error(400, 'No company associated with user');
	}

	const body = await request.json();
	const { query, limit = 20, offset = 0 } = body;

	try {
		const startTime = Date.now();

		// If query is "*" or empty, get all towers
		const isWildcard = !query || query === '*' || query.trim() === '';

		let result;
		if (isWildcard) {
			result = await serverClient
				.query(GET_ALL_COMPANY_TOWERS, {
					companyId,
					limit,
					offset
				})
				.toPromise();
		} else {
			// Add wildcards for ILIKE search
			const searchPattern = `%${query}%`;
			result = await serverClient
				.query(SEARCH_COMPANY_TOWERS, {
					companyId,
					search: searchPattern,
					limit,
					offset
				})
				.toPromise();
		}

		if (result.error) {
			console.error('GraphQL error:', result.error);
			throw error(500, 'Search failed');
		}

		const companyTowers = result.data?.company_towers || [];
		const total = result.data?.company_towers_aggregate?.aggregate?.count || 0;

		const hits = transformTowerHits(companyTowers, companyId);
		const processingTimeMs = Date.now() - startTime;

		return json({
			hits,
			total,
			processingTimeMs,
			offset,
			limit,
			type: 'towers'
		});
	} catch (err) {
		console.error('Search error:', err);
		throw error(500, 'Search failed');
	}
};
