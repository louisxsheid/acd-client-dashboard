/**
 * Sync PostgreSQL data to Meilisearch
 *
 * Run: npx tsx scripts/sync-meilisearch.ts
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string
 *   MEILISEARCH_HOST - Meilisearch URL (e.g., http://localhost:7700)
 *   MEILISEARCH_API_KEY - Meilisearch admin API key
 */

import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is required');
}
const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || 'masterkey';

const pool = new Pool({ connectionString: DATABASE_URL });

// ============================================
// Meilisearch Client
// ============================================

async function meiliRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
	const url = `${MEILISEARCH_HOST}${endpoint}`;

	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...(MEILISEARCH_API_KEY ? { Authorization: `Bearer ${MEILISEARCH_API_KEY}` } : {}),
			...options.headers
		}
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Meilisearch error: ${response.status} - ${error}`);
	}

	return response.json();
}

async function setupIndexes(): Promise<void> {
	// Create towers index
	try {
		await meiliRequest('/indexes', {
			method: 'POST',
			body: JSON.stringify({ uid: 'towers', primaryKey: 'id' })
		});
	} catch {
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
				'site_id',
				'provider_names'
			],
			filterableAttributes: [
				'company_ids',
				'state',
				'city',
				'carrier',
				'tower_type',
				'access_state',
				'entity_id',
				'provider_names'
			],
			sortableAttributes: ['city', 'state', 'entity_name', 'created_at'],
			displayedAttributes: ['*']
		})
	});

	// Create entities index
	try {
		await meiliRequest('/indexes', {
			method: 'POST',
			body: JSON.stringify({ uid: 'entities', primaryKey: 'id' })
		});
	} catch {
		// Index may already exist
	}

	// Configure entities index
	await meiliRequest('/indexes/entities/settings', {
		method: 'PATCH',
		body: JSON.stringify({
			searchableAttributes: ['name', 'contact_names', 'mail_city', 'mail_state'],
			filterableAttributes: ['company_ids', 'entity_type', 'mail_state'],
			sortableAttributes: ['name', 'tower_count']
		})
	});
}

// ============================================
// Data Types
// ============================================

interface TowerRow {
	id: number;
	latitude: number;
	longitude: number;
	tower_tower_type: string | null;
	created_at: string;
	site_id: string | null;
	address: string | null;
	city: string | null;
	state: string | null;
	zip_code: string | null;
	carrier: string | null;
	site_tower_type: string | null;
	status: string | null;
	google_maps_url: string | null;
	entity_id: string | null;
	entity_name: string | null;
	entity_type: string | null;
	contacts: Array<{
		order: number;
		full_name: string | null;
		first_name: string | null;
		last_name: string | null;
		title: string | null;
		phone: string | null;
		email: string | null;
	}> | null;
	company_access: Array<{
		company_id: string;
		access_state: string;
	}> | null;
	provider_count: number;
	provider_names: string[] | null;
}

interface TowerSearchDocument {
	id: number;
	latitude: number;
	longitude: number;
	_geo: { lat: number; lng: number };
	site_id?: string;
	address?: string;
	city?: string;
	state?: string;
	zip_code?: string;
	carrier?: string;
	tower_type?: string;
	status?: string;
	google_maps_url?: string;
	entity_id?: string;
	entity_name?: string;
	entity_type?: string;
	contact_names: string[];
	contact_emails: string[];
	contact_phones: string[];
	primary_contact_name?: string;
	primary_contact_title?: string;
	primary_contact_phone?: string;
	primary_contact_email?: string;
	company_ids: string[];
	access_states: Record<string, string>;
	provider_count?: number;
	provider_names?: string[];
	created_at?: string;
	updated_at?: string;
}

interface EntityRow {
	id: string;
	name: string;
	entity_type: string | null;
	mail_city: string | null;
	mail_state: string | null;
	tower_count: number;
	contacts: Array<{
		order: number;
		full_name: string | null;
		title: string | null;
	}> | null;
	company_ids: string[] | null;
}

interface EntitySearchDocument {
	id: string;
	name: string;
	entity_type?: string;
	mail_city?: string;
	mail_state?: string;
	contact_names: string[];
	primary_contact_name?: string;
	primary_contact_title?: string;
	tower_count: number;
	company_ids: string[];
}

// ============================================
// Sync Functions
// ============================================

function rowToTowerDocument(row: TowerRow): TowerSearchDocument {
	const contacts = row.contacts || [];
	const companyAccess = row.company_access || [];

	const contactNames = contacts
		.map((c) => c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim())
		.filter(Boolean) as string[];

	const contactEmails = contacts.map((c) => c.email).filter(Boolean) as string[];
	const contactPhones = contacts.map((c) => c.phone).filter(Boolean) as string[];

	const primaryContact = contacts.find((c) => c.order === 1);

	const companyIds = companyAccess.map((ca) => ca.company_id);
	const accessStates: Record<string, string> = {};
	companyAccess.forEach((ca) => {
		accessStates[ca.company_id] = ca.access_state;
	});

	return {
		id: row.id,
		latitude: row.latitude,
		longitude: row.longitude,
		_geo: { lat: row.latitude, lng: row.longitude },

		site_id: row.site_id || undefined,
		address: row.address || undefined,
		city: row.city || undefined,
		state: row.state || undefined,
		zip_code: row.zip_code || undefined,
		carrier: row.carrier || undefined,
		tower_type: row.site_tower_type || row.tower_tower_type || undefined,
		status: row.status || undefined,
		google_maps_url: row.google_maps_url || undefined,

		entity_id: row.entity_id || undefined,
		entity_name: row.entity_name || undefined,
		entity_type: row.entity_type || undefined,

		contact_names: contactNames,
		contact_emails: contactEmails,
		contact_phones: contactPhones,
		primary_contact_name: primaryContact?.full_name || undefined,
		primary_contact_title: primaryContact?.title || undefined,
		primary_contact_phone: primaryContact?.phone || undefined,
		primary_contact_email: primaryContact?.email || undefined,

		company_ids: companyIds,
		access_states: accessStates,

		provider_count: row.provider_count || 0,
		provider_names: row.provider_names || [],

		created_at: row.created_at
	};
}

function rowToEntityDocument(row: EntityRow): EntitySearchDocument {
	const contacts = row.contacts || [];
	const contactNames = contacts.map((c) => c.full_name).filter(Boolean) as string[];
	const primaryContact = contacts.find((c) => c.order === 1);

	return {
		id: row.id,
		name: row.name,
		entity_type: row.entity_type || undefined,
		mail_city: row.mail_city || undefined,
		mail_state: row.mail_state || undefined,

		contact_names: contactNames,
		primary_contact_name: primaryContact?.full_name || undefined,
		primary_contact_title: primaryContact?.title || undefined,

		tower_count: row.tower_count,
		company_ids: row.company_ids || []
	};
}

async function syncAllTowers(): Promise<number> {
	const batchSize = 1000;
	let offset = 0;
	let totalSynced = 0;

	while (true) {
		const result = await pool.query<TowerRow>(
			`
			SELECT
				t.id,
				t.latitude,
				t.longitude,
				t.tower_type as tower_tower_type,
				t.created_at,
				ts.site_id,
				ts.address,
				ts.city,
				ts.state,
				ts.zip_code,
				ts.carrier,
				ts.tower_type as site_tower_type,
				ts.status,
				ts.google_maps_url,
				e.id as entity_id,
				e.name as entity_name,
				e.entity_type,
				(
					SELECT json_agg(json_build_object(
						'order', ec.contact_order,
						'full_name', ec.full_name,
						'first_name', ec.first_name,
						'last_name', ec.last_name,
						'title', ec.title,
						'phone', ec.phone_primary,
						'email', ec.email_primary
					) ORDER BY ec.contact_order)
					FROM entity_contacts ec
					WHERE ec.entity_id = e.id
				) as contacts,
				(
					SELECT json_agg(json_build_object(
						'company_id', ct.company_id,
						'access_state', ct.access_state
					))
					FROM company_towers ct
					WHERE ct.tower_id = t.id
				) as company_access,
				(
					SELECT COUNT(*)::int
					FROM tower_providers tp
					WHERE tp.tower_id = t.id
				) as provider_count,
				(
					SELECT array_agg(p.name ORDER BY p.name)
					FROM tower_providers tp
					JOIN providers p ON p.id = tp.provider_id
					WHERE tp.tower_id = t.id
				) as provider_names
			FROM towers t
			LEFT JOIN tower_sites ts ON ts.tower_id = t.id
			LEFT JOIN entities e ON ts.entity_id = e.id
			ORDER BY t.id
			LIMIT $1 OFFSET $2
			`,
			[batchSize, offset]
		);

		if (result.rows.length === 0) break;

		const documents = result.rows.map(rowToTowerDocument);
		await meiliRequest('/indexes/towers/documents', {
			method: 'POST',
			body: JSON.stringify(documents)
		});

		totalSynced += result.rows.length;
		offset += batchSize;

		console.log(`Synced ${totalSynced} towers...`);
	}

	return totalSynced;
}

async function syncAllEntities(): Promise<number> {
	const batchSize = 1000;
	let offset = 0;
	let totalSynced = 0;

	while (true) {
		const result = await pool.query<EntityRow>(
			`
			SELECT
				e.id,
				e.name,
				e.entity_type,
				e.mail_city,
				e.mail_state,
				(
					SELECT COUNT(*)::int
					FROM tower_sites ts
					WHERE ts.entity_id = e.id
				) as tower_count,
				(
					SELECT json_agg(json_build_object(
						'order', ec.contact_order,
						'full_name', ec.full_name,
						'title', ec.title
					) ORDER BY ec.contact_order)
					FROM entity_contacts ec
					WHERE ec.entity_id = e.id
				) as contacts,
				(
					SELECT array_agg(DISTINCT ct.company_id)
					FROM tower_sites ts
					JOIN company_towers ct ON ct.tower_id = ts.tower_id
					WHERE ts.entity_id = e.id
				) as company_ids
			FROM entities e
			ORDER BY e.id
			LIMIT $1 OFFSET $2
			`,
			[batchSize, offset]
		);

		if (result.rows.length === 0) break;

		const documents = result.rows.map(rowToEntityDocument);
		await meiliRequest('/indexes/entities/documents', {
			method: 'POST',
			body: JSON.stringify(documents)
		});

		totalSynced += result.rows.length;
		offset += batchSize;

		console.log(`Synced ${totalSynced} entities...`);
	}

	return totalSynced;
}

async function main() {
	console.log('Meilisearch Full Sync');
	console.log('=====================');
	console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
	console.log(`Meilisearch: ${MEILISEARCH_HOST}`);
	console.log('');

	// Setup indexes
	console.log('Setting up indexes...');
	await setupIndexes();
	console.log('Indexes configured.');
	console.log('');

	// Sync entities
	console.log('Syncing entities...');
	const entityCount = await syncAllEntities();
	console.log(`Synced ${entityCount} entities.`);
	console.log('');

	// Sync towers
	console.log('Syncing towers...');
	const towerCount = await syncAllTowers();
	console.log(`Synced ${towerCount} towers.`);
	console.log('');

	// Show multi-tenant stats
	const multiTenant = await pool.query(`
		SELECT t.id, ts.address,
			   array_agg(p.name ORDER BY p.name) as providers,
			   COUNT(tp.id) as provider_count
		FROM towers t
		JOIN tower_sites ts ON ts.tower_id = t.id
		JOIN tower_providers tp ON tp.tower_id = t.id
		JOIN providers p ON p.id = tp.provider_id
		GROUP BY t.id, ts.address
		HAVING COUNT(tp.id) > 1
		ORDER BY COUNT(tp.id) DESC
	`);

	console.log('Multi-Tenant Towers:');
	for (const row of multiTenant.rows) {
		console.log(`  Tower ${row.id}: ${row.address} - ${row.providers.join(', ')}`);
	}

	console.log('');
	console.log('Sync complete!');

	await pool.end();
}

main().catch(console.error);
