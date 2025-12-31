import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getCarrierColorByName } from '$lib/carriers';

function getEndpoint() {
	const base = env.HASURA_GRAPHQL_ENDPOINT || 'http://localhost:8081';
	return base.endsWith('/v1/graphql') ? base : `${base}/v1/graphql`;
}

function getAdminSecret() {
	return env.HASURA_GRAPHQL_ADMIN_SECRET || env.HASURA_ADMIN_SECRET || 'devsecret';
}

async function query(gql: string, variables: Record<string, any> = {}) {
	const response = await fetch(getEndpoint(), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-hasura-admin-secret': getAdminSecret()
		},
		body: JSON.stringify({ query: gql, variables })
	});
	const result = await response.json();
	if (result.errors) {
		console.error('GraphQL errors:', result.errors);
		throw new Error(result.errors[0].message);
	}
	return result.data;
}

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth?.();

	if (!session?.user) {
		throw redirect(302, '/auth/signin');
	}

	try {
		// Stats query - basic counts
		const statsQuery = `
			query DashboardStats {
				towers_aggregate { aggregate { count } }
				tower_sites_aggregate { aggregate { count } }
				entities_aggregate { aggregate { count } }
				company_towers_aggregate { aggregate { count } }

				# Tower types
				macro: towers_aggregate(where: {tower_type: {_eq: "MACRO"}}) { aggregate { count } }
				micro: towers_aggregate(where: {tower_type: {_eq: "MICRO"}}) { aggregate { count } }
				pico: towers_aggregate(where: {tower_type: {_eq: "PICO"}}) { aggregate { count } }
				das: towers_aggregate(where: {tower_type: {_eq: "DAS"}}) { aggregate { count } }
				cow: towers_aggregate(where: {tower_type: {_eq: "COW"}}) { aggregate { count } }

				# EN-DC capable
				endc: towers_aggregate(where: {endc_available: {_eq: true}}) { aggregate { count } }

				# Access states
				sample: company_towers_aggregate(where: {access_state: {_eq: "SAMPLE"}}) { aggregate { count } }
				trial: company_towers_aggregate(where: {access_state: {_eq: "TRIAL"}}) { aggregate { count } }
				licensed: company_towers_aggregate(where: {access_state: {_eq: "LICENSED"}}) { aggregate { count } }
				full: company_towers_aggregate(where: {access_state: {_eq: "FULL"}}) { aggregate { count } }
			}
		`;

		// Carriers from tower_sites
		const carriersQuery = `
			query CarrierStats {
				tower_sites(distinct_on: carrier) { carrier }
				verizon: tower_sites_aggregate(where: {carrier: {_ilike: "%verizon%"}}) { aggregate { count } }
				att: tower_sites_aggregate(where: {carrier: {_ilike: "%at&t%"}}) { aggregate { count } }
				tmobile: tower_sites_aggregate(where: {carrier: {_ilike: "%t-mobile%"}}) { aggregate { count } }
				american_tower: tower_sites_aggregate(where: {carrier: {_ilike: "%american tower%"}}) { aggregate { count } }
				crown_castle: tower_sites_aggregate(where: {carrier: {_ilike: "%crown castle%"}}) { aggregate { count } }
				ghost_lead: tower_sites_aggregate(where: {carrier: {_ilike: "%ghost lead%"}}) { aggregate { count } }
			}
		`;

		// Geographic distribution
		const geoQuery = `
			query GeoStats {
				states: tower_sites(distinct_on: state, where: {state: {_is_null: false}}) {
					state
				}
				by_state: tower_sites_aggregate(where: {state: {_is_null: false}}) {
					nodes {
						state
					}
				}
			}
		`;

		// Entities breakdown - get tower_sites with entity info
		const entitiesQuery = `
			query EntityStats {
				entities {
					id
					name
				}
				tower_sites {
					entity_id
					entity {
						name
					}
				}
			}
		`;

		// Execute all queries in parallel
		const [stats, carriers, geo, entitiesData] = await Promise.all([
			query(statsQuery),
			query(carriersQuery),
			query(geoQuery),
			query(entitiesQuery)
		]);

		// Process tower type data
		const typeData = [
			{ name: 'Macro', count: stats.macro?.aggregate?.count || 0, color: '#3b82f6' },
			{ name: 'Micro', count: stats.micro?.aggregate?.count || 0, color: '#8b5cf6' },
			{ name: 'Pico', count: stats.pico?.aggregate?.count || 0, color: '#22c55e' },
			{ name: 'DAS', count: stats.das?.aggregate?.count || 0, color: '#f59e0b' },
			{ name: 'COW', count: stats.cow?.aggregate?.count || 0, color: '#ef4444' }
		].filter(d => d.count > 0);

		// Process access state data (excluding SAMPLE)
		const accessStateData = [
			{ name: 'Trial', count: stats.trial?.aggregate?.count || 0, color: '#f59e0b' },
			{ name: 'Licensed', count: stats.licensed?.aggregate?.count || 0, color: '#3b82f6' },
			{ name: 'Full', count: stats.full?.aggregate?.count || 0, color: '#22c55e' }
		].filter(d => d.count > 0);

		// Process carrier data from tower_sites
		const carrierData = [
			{ name: 'Verizon', count: carriers.verizon?.aggregate?.count || 0 },
			{ name: 'AT&T', count: carriers.att?.aggregate?.count || 0 },
			{ name: 'T-Mobile', count: carriers.tmobile?.aggregate?.count || 0 },
			{ name: 'American Tower', count: carriers.american_tower?.aggregate?.count || 0 },
			{ name: 'Crown Castle', count: carriers.crown_castle?.aggregate?.count || 0 },
			{ name: 'Portfolio', count: carriers.ghost_lead?.aggregate?.count || 0 }
		].filter(d => d.count > 0)
		.sort((a, b) => b.count - a.count)
		.map(d => ({ ...d, color: getCarrierColorByName(d.name) || '#6b7280' }));

		// Process entity data for tenant distribution by counting tower_sites per entity
		const entityCounts = new Map<string, { name: string; count: number }>();
		entitiesData.tower_sites?.forEach((site: any) => {
			const entityName = site.entity?.name || 'Unknown';
			const existing = entityCounts.get(entityName);
			if (existing) {
				existing.count++;
			} else {
				entityCounts.set(entityName, { name: entityName, count: 1 });
			}
		});
		const tenantData = Array.from(entityCounts.values())
			.filter((e: any) => e.count > 0)
			.sort((a: any, b: any) => b.count - a.count);

		// Process state data
		const stateList = geo.states?.map((s: any) => s.state).filter(Boolean) || [];

		return {
			// Basic stats
			totalTowers: stats.towers_aggregate?.aggregate?.count || 0,
			totalSites: stats.tower_sites_aggregate?.aggregate?.count || 0,
			totalEntities: stats.entities_aggregate?.aggregate?.count || 0,
			endcCapable: stats.endc?.aggregate?.count || 0,

			// Chart data
			typeData,
			accessStateData,
			carrierData,
			tenantData,

			// Lists
			uniqueCarriers: carriers.tower_sites?.map((c: any) => c.carrier).filter(Boolean) || [],
			states: stateList,

			// For backwards compatibility with existing components
			stats: {
				towers: stats.towers_aggregate?.aggregate?.count || 0,
				sites: stats.tower_sites_aggregate?.aggregate?.count || 0,
				entities: stats.entities_aggregate?.aggregate?.count || 0,
				endc: stats.endc?.aggregate?.count || 0
			}
		};
	} catch (err) {
		console.error('Analytics fetch error:', err);
		return {
			error: err instanceof Error ? err.message : 'Failed to fetch analytics data',
			totalTowers: 0,
			totalSites: 0,
			totalEntities: 0,
			endcCapable: 0,
			typeData: [],
			accessStateData: [],
			carrierData: [],
			tenantData: [],
			uniqueCarriers: [],
			states: [],
			stats: null
		};
	}
};
