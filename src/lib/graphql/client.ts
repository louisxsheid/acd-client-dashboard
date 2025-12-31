import { Client, cacheExchange, fetchExchange } from '@urql/svelte';
import { browser } from '$app/environment';

// Client-side GraphQL client for Hasura
// Connects to the remote API microservice
export function createClient(token?: string) {
	return new Client({
		url: import.meta.env.VITE_HASURA_GRAPHQL_ENDPOINT || 'http://localhost:8081/v1/graphql',
		exchanges: [cacheExchange, fetchExchange],
		preferGetMethod: false,
		requestPolicy: 'cache-and-network',
		fetchOptions: () => {
			const headers: Record<string, string> = {
				'Content-Type': 'application/json'
			};

			// Use JWT token for authorization (admin queries should go through server-side client)
			if (token) {
				headers['Authorization'] = `Bearer ${token}`;
			}

			return {
				method: 'POST',
				headers
			};
		}
	});
}

// Default client instance for browser-side queries
// Note: For server-side/admin queries, use serverClient from server-client.ts instead
export const client = browser
	? createClient()
	: new Client({
			url: 'http://localhost:8081/v1/graphql',
			exchanges: [cacheExchange, fetchExchange]
		});
