import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getCarrierColorByName } from '$lib/carriers';

type AccessTier = 'SAMPLE' | 'TRIAL' | 'LICENSED' | 'FULL';

interface EntityTypeData {
	name: string;
	count: number;
	color: string;
}

interface TopEntity {
	id: string;
	name: string;
	entityType: string | null;
	state: string | null;
	towerCount: number;
}

interface ContactStats {
	totalContacts: number;
	totalEntities: number;
	entitiesWithContacts: number;
	verifiedEmails: number;
	activePhones: number;
	coveragePercent: number;
}

interface CarrierStats {
	name: string;
	color: string;
	towerCount: number;
	endcCount: number;
	endcPercent: number;
}

function getEndpoint() {
	const base = env.HASURA_GRAPHQL_ENDPOINT || 'http://localhost:8081';
	return base.endsWith('/v1/graphql') ? base : `${base}/v1/graphql`;
}

function getAdminSecret() {
	const secret = env.HASURA_GRAPHQL_ADMIN_SECRET || env.HASURA_ADMIN_SECRET;
	if (!secret) {
		throw new Error('HASURA_ADMIN_SECRET environment variable is not configured');
	}
	return secret;
}

async function query(gql: string, variables: Record<string, unknown> = {}) {
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

// Entity type color mapping
const ENTITY_TYPE_COLORS: Record<string, string> = {
	'Business Entity': '#3b82f6',
	Municipality: '#06b6d4',
	'Non-Profit': '#ec4899',
	LLC: '#8b5cf6',
	Trust: '#22c55e',
	Corporation: '#f59e0b',
	Partnership: '#ef4444',
	Individual: '#a855f7',
	Government: '#0ea5e9',
	Church: '#71717a',
	Other: '#64748b'
};

// Normalize entity type for display - use actual database values
function normalizeEntityType(type: string | null): string {
	if (!type) return 'Other';
	const upper = type.toUpperCase();

	// Match actual database values first
	if (upper === 'BUSINESS ENTITY' || upper.includes('BUSINESS')) return 'Business Entity';
	if (upper === 'MUNICIPAL' || upper.includes('MUNICIPAL') || upper.includes('CITY') || upper.includes('COUNTY') || upper.includes('TOWN')) return 'Municipality';
	if (upper === 'NON-PROFIT' || upper.includes('NON-PROFIT') || upper.includes('NONPROFIT') || upper.includes('501') || upper.includes('FOUNDATION') || upper.includes('ASSOCIATION')) return 'Non-Profit';

	// Legacy patterns
	if (upper.includes('LLC')) return 'LLC';
	if (upper.includes('TRUST')) return 'Trust';
	if (upper.includes('CORP') || upper.includes('INC')) return 'Corporation';
	if (upper.includes('LP') || upper.includes('PARTNER')) return 'Partnership';
	if (upper.includes('INDIVIDUAL') || upper.includes('PERSON')) return 'Individual';
	if (upper.includes('GOVERNMENT') || upper.includes('STATE') || upper.includes('FEDERAL') || upper.includes('PUBLIC')) return 'Government';
	if (upper.includes('CHURCH') || upper.includes('RELIGIOUS') || upper.includes('MINISTRY')) return 'Church';

	return 'Other';
}

// Limit data based on access tier
function getEntityLimit(tier: AccessTier): number {
	switch (tier) {
		case 'SAMPLE': return 3;
		case 'TRIAL': return 10;
		default: return 100;
	}
}

function getCarrierLimit(tier: AccessTier): number {
	switch (tier) {
		case 'SAMPLE': return 3;
		default: return 100;
	}
}

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth?.();

	if (!session?.user) {
		throw redirect(302, '/auth/signin');
	}

	try {
		// Determine access tier - default to SAMPLE for demo purposes
		const accessTier: AccessTier = 'SAMPLE';

		// Main stats query
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

				# Multi-tenant (provider_count > 1)
				multiTenant: towers_aggregate(where: {provider_count: {_gt: 1}}) { aggregate { count } }

				# Access states
				sample: company_towers_aggregate(where: {access_state: {_eq: "SAMPLE"}}) { aggregate { count } }
				trial: company_towers_aggregate(where: {access_state: {_eq: "TRIAL"}}) { aggregate { count } }
				licensed: company_towers_aggregate(where: {access_state: {_eq: "LICENSED"}}) { aggregate { count } }
				full: company_towers_aggregate(where: {access_state: {_eq: "FULL"}}) { aggregate { count } }
			}
		`;

		// Get entity data via tower_sites (which has entity relationship)
		const entityDataQuery = `
			query EntityData {
				tower_sites {
					entity_id
					entity {
						id
						name
						entity_type
						mail_state
					}
				}
			}
		`;

		// Contact coverage query - count entities that have at least one contact
		const contactsQuery = `
			query ContactCoverage {
				total_entities: entities_aggregate { aggregate { count } }
				total_contacts: entity_contacts_aggregate { aggregate { count } }
				entities_with_contacts: entities_aggregate(where: {entity_contacts: {}}) { aggregate { count } }
			}
		`;

		// Carrier stats with EN-DC breakdown
		const carrierStatsQuery = `
			query CarrierStats {
				tower_providers {
					tower_id
					provider {
						name
					}
					tower {
						endc_available
					}
				}
			}
		`;

		// Geographic distribution
		const geoQuery = `
			query GeoStats {
				states: tower_sites(distinct_on: state, where: {state: {_is_null: false}}) {
					state
				}
			}
		`;

		// Execute all queries in parallel
		const [stats, entityData, contactsData, carrierStatsData, geo] = await Promise.all([
			query(statsQuery),
			query(entityDataQuery),
			query(contactsQuery),
			query(carrierStatsQuery),
			query(geoQuery)
		]);

		// Calculate total towers
		const totalTowers = stats.towers_aggregate?.aggregate?.count || 0;
		const totalEntities = stats.entities_aggregate?.aggregate?.count || 0;
		const endcCount = stats.endc?.aggregate?.count || 0;

		// Process tower type data
		const typeData = [
			{ name: 'Macro', count: stats.macro?.aggregate?.count || 0, color: '#3b82f6' },
			{ name: 'Small Cell', count: stats.micro?.aggregate?.count || 0, color: '#8b5cf6' },
			{ name: 'Micro Cell', count: stats.pico?.aggregate?.count || 0, color: '#22c55e' },
			{ name: 'DAS', count: stats.das?.aggregate?.count || 0, color: '#f59e0b' },
			{ name: 'COW', count: stats.cow?.aggregate?.count || 0, color: '#ef4444' }
		].filter(d => d.count > 0);

		// Process access state data
		const accessStateData = [
			{ name: 'Trial', count: stats.trial?.aggregate?.count || 0, color: '#f59e0b' },
			{ name: 'Licensed', count: stats.licensed?.aggregate?.count || 0, color: '#3b82f6' },
			{ name: 'Full', count: stats.full?.aggregate?.count || 0, color: '#22c55e' }
		].filter(d => d.count > 0);

		// Process entity data from tower_sites
		const entityTypeCounts = new Map<string, number>();
		const entityTowerCounts = new Map<string, { id: string; name: string; entityType: string; state: string | null; count: number }>();
		const portfolioCounts = new Map<string, { name: string; count: number }>();

		entityData.tower_sites?.forEach((site: { entity_id: string; entity: { id: string; name: string; entity_type: string | null; mail_state: string | null } | null }) => {
			const entity = site.entity;
			if (entity) {
				// Count entity types
				const normalized = normalizeEntityType(entity.entity_type);
				entityTypeCounts.set(normalized, (entityTypeCounts.get(normalized) || 0) + 1);

				// Count towers per entity
				const existing = entityTowerCounts.get(entity.id);
				if (existing) {
					existing.count++;
				} else {
					entityTowerCounts.set(entity.id, {
						id: entity.id,
						name: entity.name,
						entityType: normalized,
						state: entity.mail_state,
						count: 1
					});
				}

				// Portfolio counts
				const portfolioName = entity.name || 'Unknown';
				const portfolioExisting = portfolioCounts.get(portfolioName);
				if (portfolioExisting) {
					portfolioExisting.count++;
				} else {
					portfolioCounts.set(portfolioName, { name: portfolioName, count: 1 });
				}
			}
		});

		// Create entity type chart data
		const entityTypeData: EntityTypeData[] = Array.from(entityTypeCounts.entries())
			.map(([name, count]) => ({
				name,
				count,
				color: ENTITY_TYPE_COLORS[name] || '#71717a'
			}))
			.sort((a, b) => b.count - a.count);

		// Create top entities list
		const entityLimit = getEntityLimit(accessTier);
		const allTopEntities: TopEntity[] = Array.from(entityTowerCounts.values())
			.map(e => ({
				id: e.id,
				name: e.name,
				entityType: e.entityType,
				state: e.state,
				towerCount: e.count
			}))
			.sort((a, b) => b.towerCount - a.towerCount);

		const topEntities = allTopEntities.slice(0, entityLimit);
		const topEntitiesTotal = allTopEntities.length;

		// Portfolio distribution
		const portfolioData = Array.from(portfolioCounts.values())
			.sort((a, b) => b.count - a.count);

		// Contact stats
		const totalContactEntities = contactsData.total_entities?.aggregate?.count || 0;
		const entitiesWithContacts = contactsData.entities_with_contacts?.aggregate?.count || 0;
		const contactCoveragePercent = totalContactEntities > 0
			? Math.round((entitiesWithContacts / totalContactEntities) * 100)
			: 0;

		const contactStats: ContactStats = {
			totalContacts: contactsData.total_contacts?.aggregate?.count || 0,
			totalEntities: totalContactEntities,
			entitiesWithContacts,
			verifiedEmails: 0,
			activePhones: 0,
			coveragePercent: contactCoveragePercent
		};

		// Process carrier stats with EN-DC and calculate multi-tenant
		const carrierMap = new Map<string, { total: number; endc: number }>();
		const towerProviderCount = new Map<number, number>();

		carrierStatsData.tower_providers?.forEach((tp: { tower_id?: number; provider: { name: string }; tower: { endc_available: boolean } }) => {
			const name = tp.provider?.name;
			if (name) {
				const existing = carrierMap.get(name) || { total: 0, endc: 0 };
				existing.total++;
				if (tp.tower?.endc_available) existing.endc++;
				carrierMap.set(name, existing);
			}
			// Count providers per tower for multi-tenant calculation
			if (tp.tower_id) {
				towerProviderCount.set(tp.tower_id, (towerProviderCount.get(tp.tower_id) || 0) + 1);
			}
		});

		// Calculate multi-tenant: towers with more than one provider
		const towersWithProviders = towerProviderCount.size;
		const multiTenantTowers = Array.from(towerProviderCount.values()).filter(count => count > 1).length;

		const carrierLimit = getCarrierLimit(accessTier);
		const allCarrierData: CarrierStats[] = Array.from(carrierMap.entries())
			.map(([name, data]) => ({
				name,
				color: getCarrierColorByName(name) || '#6b7280',
				towerCount: data.total,
				endcCount: data.endc,
				endcPercent: data.total > 0 ? Math.round((data.endc / data.total) * 100) : 0
			}))
			.sort((a, b) => b.towerCount - a.towerCount);

		const carrierData = allCarrierData.slice(0, carrierLimit);
		const carrierDataTotal = allCarrierData.length;

		// Simple carrier data for charts - filter out Ghost Lead, show top 4 + Other
		const filteredCarriers = allCarrierData.filter(c => c.name !== 'Ghost Lead');
		const topCarriers = filteredCarriers.slice(0, 4);
		const otherCarriers = filteredCarriers.slice(4);
		const otherCount = otherCarriers.reduce((sum, c) => sum + c.towerCount, 0);

		const simpleCarrierData = topCarriers.map(c => ({
			name: c.name,
			count: c.towerCount,
			color: c.color
		}));

		if (otherCount > 0) {
			simpleCarrierData.push({
				name: 'Other',
				count: otherCount,
				color: '#64748b'
			});
		}

		// Process state data
		const stateList = geo.states?.map((s: { state: string }) => s.state).filter(Boolean) || [];

		// Calculate KPI values
		const endcRate = totalTowers > 0 ? Math.round((endcCount / totalTowers) * 100) : 0;
		const multiTenantRate = towersWithProviders > 0 ? Math.round((multiTenantTowers / towersWithProviders) * 100) : 0;

		return {
			// Access tier
			accessTier,

			// KPI stats
			totalTowers,
			totalSites: stats.tower_sites_aggregate?.aggregate?.count || 0,
			totalEntities,
			endcCapable: endcCount,
			endcRate,
			multiTenantCount: multiTenantTowers,
			multiTenantRate,
			contactCoveragePercent,

			// Entity intelligence
			entityTypeData,
			topEntities,
			topEntitiesTotal,
			contactStats: accessTier !== 'SAMPLE' ? contactStats : null,

			// Network quality
			carrierData,
			carrierDataTotal,
			simpleCarrierData,

			// Existing chart data
			typeData,
			accessStateData,
			portfolioData,

			// Lists
			uniqueCarriers: carrierData.map(c => c.name),
			states: stateList,

			// For backwards compatibility
			tenantData: portfolioData,
			stats: {
				towers: totalTowers,
				sites: stats.tower_sites_aggregate?.aggregate?.count || 0,
				entities: totalEntities,
				endc: endcCount
			}
		};
	} catch (err) {
		console.error('Analytics fetch error:', err);
		return {
			error: err instanceof Error ? err.message : 'Failed to fetch analytics data',
			accessTier: 'SAMPLE' as AccessTier,
			totalTowers: 0,
			totalSites: 0,
			totalEntities: 0,
			endcCapable: 0,
			endcRate: 0,
			multiTenantCount: 0,
			multiTenantRate: 0,
			contactCoveragePercent: 0,
			entityTypeData: [],
			topEntities: [],
			topEntitiesTotal: 0,
			contactStats: null,
			carrierData: [],
			carrierDataTotal: 0,
			simpleCarrierData: [],
			typeData: [],
			accessStateData: [],
			portfolioData: [],
			uniqueCarriers: [],
			states: [],
			tenantData: [],
			stats: null
		};
	}
};
