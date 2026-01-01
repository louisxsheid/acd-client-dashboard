import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

type AccessTier = 'SAMPLE' | 'TRIAL' | 'LICENSED' | 'FULL';

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

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth?.();

	if (!session?.user) {
		throw redirect(302, '/auth/signin');
	}

	try {
		// Get counts for export summary
		const statsQuery = `
			query ExportStats {
				towers_aggregate { aggregate { count } }
				entities_aggregate { aggregate { count } }
				tower_sites_aggregate { aggregate { count } }
			}
		`;

		const stats = await query(statsQuery);

		// Determine access tier - default to SAMPLE for demo
		const accessTier: AccessTier = 'SAMPLE';

		return {
			accessTier,
			towerCount: stats.towers_aggregate?.aggregate?.count || 0,
			entityCount: stats.entities_aggregate?.aggregate?.count || 0,
			siteCount: stats.tower_sites_aggregate?.aggregate?.count || 0
		};
	} catch (err) {
		console.error('Export page load error:', err);
		return {
			error: err instanceof Error ? err.message : 'Failed to load export data',
			accessTier: 'SAMPLE' as AccessTier,
			towerCount: 0,
			entityCount: 0,
			siteCount: 0
		};
	}
};
