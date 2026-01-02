import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { serverClient } from '$lib/graphql/server-client';
import { gql } from '@urql/core';

const GET_ZONING_ORDINANCE = gql`
	query GetZoningOrdinance($slug: String!) {
		zoning_ordinances(where: { slug: { _eq: $slug } }) {
			id
			city
			state
			slug
			title
			ordinance_text
			source_url
			last_updated
		}
	}
`;

interface ZoningOrdinance {
	id: string;
	city: string;
	state: string;
	slug: string;
	title: string;
	ordinance_text: string;
	source_url: string;
	last_updated: string;
}

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;

	const result = await serverClient
		.query<{ zoning_ordinances: ZoningOrdinance[] }>(GET_ZONING_ORDINANCE, { slug })
		.toPromise();

	if (result.error) {
		console.error('Error fetching zoning ordinance:', result.error);
		throw error(500, 'Failed to load zoning ordinance');
	}

	const ordinance = result.data?.zoning_ordinances?.[0];

	if (!ordinance) {
		throw error(404, `Zoning ordinance not found for: ${slug}`);
	}

	return {
		ordinance
	};
};
