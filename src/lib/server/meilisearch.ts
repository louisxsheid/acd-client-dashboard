import { env } from '$env/dynamic/private';

// Meilisearch client for blazing fast search
function getMeiliUrl() {
	return env.MEILISEARCH_HOST || 'http://localhost:7700';
}

function getMeiliKey() {
	return env.MEILISEARCH_API_KEY || '';
}

interface MeiliSearchParams {
	q: string;
	limit?: number;
	offset?: number;
	filter?: string | string[];
	attributesToRetrieve?: string[];
	attributesToHighlight?: string[];
	sort?: string[];
}

interface MeiliSearchResponse<T> {
	hits: T[];
	query: string;
	processingTimeMs: number;
	limit: number;
	offset: number;
	estimatedTotalHits: number;
}

interface MeiliDocument {
	[key: string]: unknown;
}

async function meiliRequest<T>(
	endpoint: string,
	options: RequestInit = {}
): Promise<T> {
	const url = `${getMeiliUrl()}${endpoint}`;
	const apiKey = getMeiliKey();

	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
			...options.headers
		}
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Meilisearch error: ${response.status} - ${error}`);
	}

	return response.json();
}

// ============================================
// SEARCH FUNCTIONS
// ============================================

export async function searchTowers(
	query: string,
	companyId: string,
	options: {
		limit?: number;
		offset?: number;
		filters?: {
			state?: string;
			city?: string;
			carrier?: string;
			accessState?: string;
		};
	} = {}
): Promise<MeiliSearchResponse<TowerSearchDocument>> {
	const { limit = 20, offset = 0, filters = {} } = options;

	// Build filter string for company access + optional filters
	const filterParts: string[] = [`company_ids = "${companyId}"`];

	if (filters.state) {
		filterParts.push(`state = "${filters.state}"`);
	}
	if (filters.city) {
		filterParts.push(`city = "${filters.city}"`);
	}
	if (filters.carrier) {
		filterParts.push(`carrier = "${filters.carrier}"`);
	}

	const searchParams: MeiliSearchParams = {
		q: query,
		limit,
		offset,
		filter: filterParts,
		attributesToHighlight: ['entity_name', 'contact_names', 'address', 'city'],
		sort: ['_geo:asc'] // Can be customized
	};

	return meiliRequest<MeiliSearchResponse<TowerSearchDocument>>(
		'/indexes/towers/search',
		{
			method: 'POST',
			body: JSON.stringify(searchParams)
		}
	);
}

export async function searchEntities(
	query: string,
	companyId: string,
	limit: number = 10
): Promise<MeiliSearchResponse<EntitySearchDocument>> {
	const searchParams: MeiliSearchParams = {
		q: query,
		limit,
		filter: [`company_ids = "${companyId}"`],
		attributesToHighlight: ['name', 'contact_names']
	};

	return meiliRequest<MeiliSearchResponse<EntitySearchDocument>>(
		'/indexes/entities/search',
		{
			method: 'POST',
			body: JSON.stringify(searchParams)
		}
	);
}

// Geo search - find towers near a point
export async function searchTowersNearPoint(
	lat: number,
	lng: number,
	companyId: string,
	radiusKm: number = 50,
	limit: number = 50
): Promise<MeiliSearchResponse<TowerSearchDocument>> {
	const searchParams = {
		q: '*',
		limit,
		filter: [
			`company_ids = "${companyId}"`,
			`_geoRadius(${lat}, ${lng}, ${radiusKm * 1000})` // radius in meters
		],
		sort: [`_geoPoint(${lat}, ${lng}):asc`]
	};

	return meiliRequest<MeiliSearchResponse<TowerSearchDocument>>(
		'/indexes/towers/search',
		{
			method: 'POST',
			body: JSON.stringify(searchParams)
		}
	);
}

// ============================================
// INDEX MANAGEMENT (for syncing from Postgres)
// ============================================

export async function indexTower(tower: TowerSearchDocument): Promise<void> {
	await meiliRequest('/indexes/towers/documents', {
		method: 'POST',
		body: JSON.stringify([tower])
	});
}

export async function indexTowers(towers: TowerSearchDocument[]): Promise<void> {
	await meiliRequest('/indexes/towers/documents', {
		method: 'POST',
		body: JSON.stringify(towers)
	});
}

export async function indexEntity(entity: EntitySearchDocument): Promise<void> {
	await meiliRequest('/indexes/entities/documents', {
		method: 'POST',
		body: JSON.stringify([entity])
	});
}

export async function indexEntities(entities: EntitySearchDocument[]): Promise<void> {
	await meiliRequest('/indexes/entities/documents', {
		method: 'POST',
		body: JSON.stringify(entities)
	});
}

export async function deleteTowerFromIndex(towerId: number): Promise<void> {
	await meiliRequest(`/indexes/towers/documents/${towerId}`, {
		method: 'DELETE'
	});
}

// ============================================
// INDEX SETUP (run once on deployment)
// ============================================

export async function setupIndexes(): Promise<void> {
	// Create towers index with settings
	try {
		await meiliRequest('/indexes', {
			method: 'POST',
			body: JSON.stringify({
				uid: 'towers',
				primaryKey: 'id'
			})
		});
	} catch (e) {
		// Index may already exist
	}

	// Configure towers index
	await meiliRequest('/indexes/towers/settings', {
		method: 'PATCH',
		body: JSON.stringify({
			searchableAttributes: [
				'entity_name',
				'contact_names',
				'address',
				'city',
				'state',
				'zip_code',
				'carrier',
				'site_id'
			],
			filterableAttributes: [
				'company_ids',
				'state',
				'city',
				'carrier',
				'tower_type',
				'access_state',
				'entity_id'
			],
			sortableAttributes: [
				'city',
				'state',
				'entity_name',
				'created_at'
			],
			// Enable geo search
			displayedAttributes: ['*']
		})
	});

	// Create entities index
	try {
		await meiliRequest('/indexes', {
			method: 'POST',
			body: JSON.stringify({
				uid: 'entities',
				primaryKey: 'id'
			})
		});
	} catch (e) {
		// Index may already exist
	}

	// Configure entities index
	await meiliRequest('/indexes/entities/settings', {
		method: 'PATCH',
		body: JSON.stringify({
			searchableAttributes: [
				'name',
				'contact_names',
				'mail_city',
				'mail_state'
			],
			filterableAttributes: [
				'company_ids',
				'entity_type',
				'mail_state'
			],
			sortableAttributes: [
				'name',
				'tower_count'
			]
		})
	});
}

// ============================================
// DOCUMENT TYPES (what we store in Meilisearch)
// ============================================

export interface TowerSearchDocument {
	id: number;                      // tower.id (primary key)
	latitude: number;
	longitude: number;
	_geo: { lat: number; lng: number }; // For geo search

	// Site info (denormalized for search)
	site_id?: string;
	address?: string;
	city?: string;
	state?: string;
	zip_code?: string;
	carrier?: string;
	tower_type?: string;
	status?: string;
	google_maps_url?: string;

	// Entity info (denormalized)
	entity_id?: string;
	entity_name?: string;
	entity_type?: string;

	// Contacts (flattened for search)
	contact_names: string[];         // ["John Smith", "Jane Doe"]
	contact_emails: string[];
	contact_phones: string[];
	primary_contact_name?: string;
	primary_contact_title?: string;
	primary_contact_phone?: string;
	primary_contact_email?: string;

	// Access control
	company_ids: string[];           // Which companies have access
	access_states: Record<string, string>; // { "company-uuid": "LICENSED" }

	// Multi-tenant info
	provider_count?: number;         // Number of carriers/tenants on tower

	// Metadata
	created_at?: string;
	updated_at?: string;
}

export interface EntitySearchDocument {
	id: string;                      // entity.id (primary key)
	name: string;
	entity_type?: string;
	mail_city?: string;
	mail_state?: string;

	// Contacts (flattened)
	contact_names: string[];
	primary_contact_name?: string;
	primary_contact_title?: string;

	// Stats
	tower_count: number;

	// Access control
	company_ids: string[];           // Which companies have access to this entity's towers
}
