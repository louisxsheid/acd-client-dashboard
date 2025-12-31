/**
 * Meilisearch Sync Service
 *
 * This module syncs data from PostgreSQL to Meilisearch for fast search.
 * Run this:
 * - On initial deployment (full sync)
 * - Periodically (incremental sync based on updated_at)
 * - On data changes via Hasura event triggers
 */

import { pool as getPool } from './db';
const pool = getPool();
import {
	indexTowers,
	indexEntities,
	setupIndexes,
	type TowerSearchDocument,
	type EntitySearchDocument
} from './meilisearch';

// ============================================
// FULL SYNC (initial deployment)
// ============================================

export async function fullSync(): Promise<{ towers: number; entities: number }> {
	console.log('Starting full Meilisearch sync...');

	// Setup indexes first
	await setupIndexes();

	// Sync entities
	const entityCount = await syncAllEntities();
	console.log(`Synced ${entityCount} entities`);

	// Sync towers
	const towerCount = await syncAllTowers();
	console.log(`Synced ${towerCount} towers`);

	return { towers: towerCount, entities: entityCount };
}

// ============================================
// TOWER SYNC
// ============================================

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
				t.updated_at,
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
				-- Aggregate contacts
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
				-- Aggregate company access
				(
					SELECT json_agg(json_build_object(
						'company_id', ct.company_id,
						'access_state', ct.access_state
					))
					FROM company_towers ct
					WHERE ct.tower_id = t.id
				) as company_access,
				-- Count providers/carriers on tower
				(
					SELECT COUNT(*)::int
					FROM tower_providers tp
					WHERE tp.tower_id = t.id
				) as provider_count,
				-- Get provider names
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
		await indexTowers(documents);

		totalSynced += result.rows.length;
		offset += batchSize;

		console.log(`Synced ${totalSynced} towers...`);
	}

	return totalSynced;
}

interface TowerRow {
	id: number;
	latitude: number;
	longitude: number;
	tower_tower_type: string | null;
	created_at: string;
	updated_at: string;
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

function rowToTowerDocument(row: TowerRow): TowerSearchDocument {
	const contacts = row.contacts || [];
	const companyAccess = row.company_access || [];

	const contactNames = contacts
		.map((c) => c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim())
		.filter(Boolean);

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

		created_at: row.created_at,
		updated_at: row.updated_at
	};
}

// ============================================
// ENTITY SYNC
// ============================================

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
				-- Count towers for this entity
				(
					SELECT COUNT(*)::int
					FROM tower_sites ts
					WHERE ts.entity_id = e.id
				) as tower_count,
				-- Aggregate contacts
				(
					SELECT json_agg(json_build_object(
						'order', ec.contact_order,
						'full_name', ec.full_name,
						'title', ec.title
					) ORDER BY ec.contact_order)
					FROM entity_contacts ec
					WHERE ec.entity_id = e.id
				) as contacts,
				-- Aggregate company access (via tower_sites -> company_towers)
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
		await indexEntities(documents);

		totalSynced += result.rows.length;
		offset += batchSize;
	}

	return totalSynced;
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

// ============================================
// INCREMENTAL SYNC (for updates)
// ============================================

export async function incrementalSync(since: Date): Promise<{ towers: number; entities: number }> {
	console.log(`Incremental sync since ${since.toISOString()}`);

	// Find updated towers
	const towerResult = await pool.query<{ id: number }>(
		`
		SELECT DISTINCT t.id
		FROM towers t
		LEFT JOIN tower_sites ts ON ts.tower_id = t.id
		LEFT JOIN entities e ON ts.entity_id = e.id
		LEFT JOIN entity_contacts ec ON ec.entity_id = e.id
		WHERE t.updated_at > $1
		   OR ts.updated_at > $1
		   OR e.updated_at > $1
		   OR ec.updated_at > $1
		`,
		[since]
	);

	// Re-sync each updated tower
	for (const { id } of towerResult.rows) {
		await syncSingleTower(id);
	}

	// Find updated entities
	const entityResult = await pool.query<{ id: string }>(
		`
		SELECT DISTINCT e.id
		FROM entities e
		LEFT JOIN entity_contacts ec ON ec.entity_id = e.id
		WHERE e.updated_at > $1 OR ec.updated_at > $1
		`,
		[since]
	);

	// Re-sync each updated entity
	for (const { id } of entityResult.rows) {
		await syncSingleEntity(id);
	}

	return {
		towers: towerResult.rows.length,
		entities: entityResult.rows.length
	};
}

async function syncSingleTower(towerId: number): Promise<void> {
	const result = await pool.query<TowerRow>(
		`
		SELECT
			t.id, t.latitude, t.longitude, t.tower_type as tower_tower_type,
			t.created_at, t.updated_at,
			ts.site_id, ts.address, ts.city, ts.state, ts.zip_code,
			ts.carrier, ts.tower_type as site_tower_type, ts.status, ts.google_maps_url,
			e.id as entity_id, e.name as entity_name, e.entity_type,
			(SELECT json_agg(json_build_object(
				'order', ec.contact_order, 'full_name', ec.full_name,
				'first_name', ec.first_name, 'last_name', ec.last_name,
				'title', ec.title, 'phone', ec.phone_primary, 'email', ec.email_primary
			) ORDER BY ec.contact_order)
			FROM entity_contacts ec WHERE ec.entity_id = e.id) as contacts,
			(SELECT json_agg(json_build_object('company_id', ct.company_id, 'access_state', ct.access_state))
			FROM company_towers ct WHERE ct.tower_id = t.id) as company_access,
			(SELECT COUNT(*)::int FROM tower_providers tp WHERE tp.tower_id = t.id) as provider_count,
			(SELECT array_agg(p.name ORDER BY p.name) FROM tower_providers tp
			 JOIN providers p ON p.id = tp.provider_id WHERE tp.tower_id = t.id) as provider_names
		FROM towers t
		LEFT JOIN tower_sites ts ON ts.tower_id = t.id
		LEFT JOIN entities e ON ts.entity_id = e.id
		WHERE t.id = $1
		`,
		[towerId]
	);

	if (result.rows.length > 0) {
		const doc = rowToTowerDocument(result.rows[0]);
		await indexTowers([doc]);
	}
}

async function syncSingleEntity(entityId: string): Promise<void> {
	const result = await pool.query<EntityRow>(
		`
		SELECT
			e.id, e.name, e.entity_type, e.mail_city, e.mail_state,
			(SELECT COUNT(*)::int FROM tower_sites ts WHERE ts.entity_id = e.id) as tower_count,
			(SELECT json_agg(json_build_object('order', ec.contact_order, 'full_name', ec.full_name, 'title', ec.title)
			 ORDER BY ec.contact_order) FROM entity_contacts ec WHERE ec.entity_id = e.id) as contacts,
			(SELECT array_agg(DISTINCT ct.company_id) FROM tower_sites ts
			 JOIN company_towers ct ON ct.tower_id = ts.tower_id WHERE ts.entity_id = e.id) as company_ids
		FROM entities e WHERE e.id = $1
		`,
		[entityId]
	);

	if (result.rows.length > 0) {
		const doc = rowToEntityDocument(result.rows[0]);
		await indexEntities([doc]);
	}
}
