/**
 * Import more-leads.csv with multi-carrier parsing
 *
 * This script:
 * 1. Parses the CSV file
 * 2. Creates/updates towers and tower_sites
 * 3. Splits comma-separated carriers into tower_providers
 * 4. Links to the company
 */

import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:hgUdhJAcvBFrUTZmYrfwrxZLLLPLHqrg@turntable.proxy.rlwy.net:11987/railway';
const COMPANY_ID = process.env.COMPANY_ID || 'f66e30c8-d3df-4c3e-a0e0-c03c00d7a890'; // Aerocell company ID

const pool = new Pool({ connectionString: DATABASE_URL });

// Provider name to ID mapping
const PROVIDER_MAP: Record<string, number> = {};

async function loadProviders() {
	const result = await pool.query('SELECT id, name FROM providers');
	for (const row of result.rows) {
		PROVIDER_MAP[row.name.toLowerCase()] = row.id;
		// Add common variations
		if (row.name === 'AT&T') {
			PROVIDER_MAP['at&t'] = row.id;
			PROVIDER_MAP['att'] = row.id;
		}
		if (row.name === 'AMT') {
			PROVIDER_MAP['amt'] = row.id;
			PROVIDER_MAP['american tower'] = row.id;
		}
	}
	console.log('Loaded providers:', PROVIDER_MAP);
}

function parseCarriers(carrierStr: string): string[] {
	if (!carrierStr || carrierStr === 'Multi' || carrierStr === 'Contact to unlock') {
		return [];
	}
	// Split by comma and trim
	return carrierStr.split(',').map(c => c.trim()).filter(c => c && c !== 'Multi');
}

function getProviderId(carrierName: string): number | null {
	const normalized = carrierName.toLowerCase().trim();
	return PROVIDER_MAP[normalized] || null;
}

interface CsvRow {
	'Sr#': string;
	Status: string;
	Address: string;
	City: string;
	State: string;
	Zip: string;
	'Tower Type': string;
	Carrier: string;
	Imagery?: string;
	'Entity Name': string;
	'Owner Name': string;
	Title: string;
	'Owner Contact #': string;
	'Secondary #'?: string;
	Email: string;
	'Google Maps URL': string;
	Remarks: string;
	Latitude: string;
	Longitude: string;
}

async function importRow(row: CsvRow) {
	const lat = parseFloat(row.Latitude);
	const lng = parseFloat(row.Longitude);

	// Skip rows with Multi or invalid coordinates
	if (isNaN(lat) || isNaN(lng) || row.Address === 'Multi') {
		console.log(`Skipping row ${row['Sr#']}: invalid data`);
		return null;
	}

	const client = await pool.connect();
	try {
		await client.query('BEGIN');

		// 1. Find or create entity
		let entityId: string | null = null;
		const entityName = row['Entity Name'];
		if (entityName && entityName !== 'Contact to unlock') {
			const entityResult = await client.query(
				'SELECT id FROM entities WHERE name = $1',
				[entityName]
			);
			if (entityResult.rows.length > 0) {
				entityId = entityResult.rows[0].id;
			} else {
				const newEntity = await client.query(
					`INSERT INTO entities (name, entity_type)
					 VALUES ($1, 'LEAD_SOURCE')
					 RETURNING id`,
					[entityName]
				);
				entityId = newEntity.rows[0].id;
				console.log(`Created entity: ${entityName}`);
			}
		}

		// 2. Create tower (check for existing by lat/lng proximity)
		const existingTower = await client.query(
			`SELECT id FROM towers
			 WHERE ABS(latitude - $1) < 0.0001 AND ABS(longitude - $2) < 0.0001`,
			[lat, lng]
		);

		let towerId: number;
		if (existingTower.rows.length > 0) {
			towerId = existingTower.rows[0].id;
			console.log(`Using existing tower ${towerId} at ${lat}, ${lng}`);
		} else {
			const newTower = await client.query(
				`INSERT INTO towers (latitude, longitude, tower_type)
				 VALUES ($1, $2, $3)
				 RETURNING id`,
				[lat, lng, row['Tower Type'] || 'MACRO']
			);
			towerId = newTower.rows[0].id;
			console.log(`Created tower ${towerId} at ${lat}, ${lng}`);
		}

		// 3. Create or update tower_site
		const carrierStr = row.Carrier;
		const carriers = parseCarriers(carrierStr);
		const primaryCarrier = carriers[0] || carrierStr;

		await client.query(
			`INSERT INTO tower_sites (tower_id, address, city, state, zip_code, carrier, tower_type, status, entity_id, remarks, google_maps_url)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			 ON CONFLICT (tower_id) DO UPDATE SET
			   address = EXCLUDED.address,
			   city = EXCLUDED.city,
			   state = EXCLUDED.state,
			   zip_code = EXCLUDED.zip_code,
			   carrier = EXCLUDED.carrier,
			   tower_type = EXCLUDED.tower_type,
			   status = EXCLUDED.status,
			   entity_id = EXCLUDED.entity_id,
			   remarks = EXCLUDED.remarks,
			   google_maps_url = EXCLUDED.google_maps_url`,
			[
				towerId,
				row.Address,
				row.City,
				row.State,
				row.Zip,
				primaryCarrier,
				row['Tower Type'] || 'MACRO',
				row.Status,
				entityId,
				row.Remarks,
				row['Google Maps URL']?.startsWith('http') ? row['Google Maps URL'] : null
			]
		);

		// 4. Create tower_providers for multi-carrier sites
		for (const carrier of carriers) {
			const providerId = getProviderId(carrier);
			if (providerId) {
				await client.query(
					`INSERT INTO tower_providers (tower_id, provider_id)
					 VALUES ($1, $2)
					 ON CONFLICT (tower_id, provider_id) DO NOTHING`,
					[towerId, providerId]
				);
				console.log(`  Added provider ${carrier} (${providerId}) to tower ${towerId}`);
			} else {
				console.log(`  Warning: Unknown carrier "${carrier}"`);
			}
		}

		// 5. Link tower to company
		await client.query(
			`INSERT INTO company_towers (company_id, tower_id, access_state)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (company_id, tower_id) DO NOTHING`,
			[COMPANY_ID, towerId, 'Ghost Lead']
		);

		// 6. Create entity contact if we have contact info
		if (entityId && row['Owner Name'] && row['Owner Name'] !== 'Contact to unlock') {
			const nameParts = row['Owner Name'].split(' ');
			const firstName = nameParts[0] || '';
			const lastName = nameParts.slice(1).join(' ') || '';

			await client.query(
				`INSERT INTO entity_contacts (entity_id, contact_order, first_name, last_name, full_name, title, phone_primary, email_primary)
				 VALUES ($1, 1, $2, $3, $4, $5, $6, $7)
				 ON CONFLICT DO NOTHING`,
				[
					entityId,
					firstName,
					lastName,
					row['Owner Name'],
					row.Title !== 'Contact to unlock' ? row.Title : null,
					row['Owner Contact #'] !== 'Contact to unlock' ? row['Owner Contact #'] : null,
					row.Email !== 'Contact to unlock' ? row.Email : null
				]
			);
		}

		await client.query('COMMIT');
		return towerId;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function main() {
	console.log('Loading providers...');
	await loadProviders();

	console.log('\nReading CSV file...');
	const csvPath = process.argv[2] || './more-leads.csv';
	const csvContent = readFileSync(csvPath, 'utf-8');

	const records = parse(csvContent, {
		columns: true,
		skip_empty_lines: true,
		trim: true
	}) as CsvRow[];

	console.log(`Found ${records.length} rows in CSV\n`);

	let imported = 0;
	let skipped = 0;
	let errors = 0;

	for (const row of records) {
		try {
			const result = await importRow(row);
			if (result) {
				imported++;
			} else {
				skipped++;
			}
		} catch (error) {
			console.error(`Error importing row ${row['Sr#']}:`, error);
			errors++;
		}
	}

	console.log('\n--- Import Summary ---');
	console.log(`Imported: ${imported}`);
	console.log(`Skipped: ${skipped}`);
	console.log(`Errors: ${errors}`);

	// Show multi-tenant stats
	const stats = await pool.query(`
		SELECT t.id, ts.address, COUNT(tp.id) as provider_count
		FROM towers t
		JOIN tower_sites ts ON ts.tower_id = t.id
		LEFT JOIN tower_providers tp ON tp.tower_id = t.id
		GROUP BY t.id, ts.address
		HAVING COUNT(tp.id) > 1
		ORDER BY provider_count DESC
	`);

	console.log('\n--- Multi-Tenant Towers ---');
	for (const row of stats.rows) {
		console.log(`Tower ${row.id}: ${row.address} - ${row.provider_count} carriers`);
	}

	await pool.end();
}

main().catch(console.error);
