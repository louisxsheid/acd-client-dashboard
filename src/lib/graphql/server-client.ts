import { env } from '$env/dynamic/private';
import { print, type DocumentNode } from 'graphql';

function getEndpoint() {
	const base = env.HASURA_GRAPHQL_ENDPOINT || 'http://localhost:8081';
	return base.endsWith('/v1/graphql') ? base : `${base}/v1/graphql`;
}

function getAdminSecret() {
	return env.HASURA_GRAPHQL_ADMIN_SECRET || env.HASURA_ADMIN_SECRET || 'devsecret';
}

interface GraphQLResponse<T = any> {
	data?: T;
	errors?: Array<{ message: string; extensions?: any }>;
}

interface QueryResult<T = any> {
	data?: T;
	error?: Error & { graphQLErrors?: any[] };
}

// Simple GraphQL client using fetch - guaranteed POST requests
async function executeQuery<T = any>(
	query: string,
	variables?: Record<string, any>
): Promise<QueryResult<T>> {
	try {
		const response = await fetch(getEndpoint(), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-hasura-admin-secret': getAdminSecret()
			},
			body: JSON.stringify({
				query,
				variables
			})
		});

		const result: GraphQLResponse<T> = await response.json();

		if (result.errors && result.errors.length > 0) {
			const error = new Error(result.errors[0].message) as Error & { graphQLErrors: any[] };
			error.graphQLErrors = result.errors;
			return { error };
		}

		return { data: result.data };
	} catch (err) {
		return { error: err as Error };
	}
}

// Wrapper to match urql's Client interface for compatibility
export const serverClient = {
	query<T = any>(queryDoc: DocumentNode | string, variables?: Record<string, any>) {
		// Extract query string from gql tagged template (DocumentNode) or use string directly
		const queryString = typeof queryDoc === 'string'
			? queryDoc
			: print(queryDoc);

		return {
			toPromise: () => executeQuery<T>(queryString, variables)
		};
	}
};
