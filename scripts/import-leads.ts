/**
 * CSV Lead Import Script
 *
 * This script processes lead/portfolio CSV files and imports them into the database.
 *
 * Usage: npx tsx scripts/import-leads.ts
 *
 * CSV file formats:
 * 1. rare-leads.csv: Sr#,Status,Address,City,State,Zip,Tower Type,Carrier,Entity Name,Owner Name,Title,Owner Contact #,Email,Google Maps URL,Remarks,Latitude,Longitude
 * 2. more-leads.csv: Sr#,Status,Address,City,State,Zip,Tower Type,Carrier,Imagery,Entity Name,Owner Name,Title,Owner Contact #,Secondary #,Email,Google Maps URL,Remarks,Latitude,Longitude
 * 3. Oncorelectricportfolio.csv: Status,Tower Type,Carrier,Owner Name,Owner Contact #,Google Maps URL,Latitude,Longitude
 */

import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/acd_client';

interface NormalizedLead {
  // Tower info
  latitude: number;
  longitude: number;
  tower_type: string;

  // Site info
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  carrier?: string;
  status?: string;
  google_maps_url?: string;
  imagery_url?: string;
  remarks?: string;

  // Entity info
  entity_name?: string;

  // Contact info
  owner_name?: string;
  title?: string;
  phone_primary?: string;
  phone_secondary?: string;
  email?: string;

  // Source tracking
  source: string;
}

// Normalize tower type to standard values
function normalizeTowerType(type: string | undefined): string {
  if (!type) return 'MACRO';
  const upper = type.toUpperCase();
  if (upper.includes('MACRO') || upper.includes('MONOPOLE')) return 'MACRO';
  if (upper.includes('MICRO')) return 'MICRO';
  if (upper.includes('PICO')) return 'PICO';
  if (upper.includes('DAS')) return 'DAS';
  if (upper.includes('COW')) return 'COW';
  return 'MACRO';
}

// Normalize carrier name
function normalizeCarrier(carrier: string | undefined): string {
  if (!carrier) return 'Unknown';
  const lower = carrier.toLowerCase();

  // Handle "Ghost Lead" which means no confirmed carrier yet
  if (lower.includes('ghost')) return 'Ghost Lead';

  // Handle multi-carrier (just return first for the tower_sites carrier field)
  if (lower.includes(',')) {
    const first = carrier.split(',')[0].trim();
    return normalizeCarrier(first);
  }

  if (lower.includes('verizon')) return 'Verizon';
  if (lower.includes('at&t') || lower.includes('att')) return 'AT&T';
  if (lower.includes('t-mobile') || lower.includes('tmobile')) return 'T-Mobile';
  if (lower.includes('sprint')) return 'Sprint (T-Mobile)';
  if (lower.includes('us cellular')) return 'US Cellular';
  if (lower.includes('dish')) return 'Dish Network';
  if (lower.includes('amt') || lower.includes('american tower')) return 'American Tower';
  if (lower.includes('cci') || lower.includes('crown castle')) return 'Crown Castle';
  if (lower.includes('cellular one')) return 'Cellular One';

  return carrier;
}

// Parse phone number to a consistent format
function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone || phone.toLowerCase().includes('contact to unlock')) return undefined;
  // Remove all non-digit characters except + for international
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.length < 7) return undefined;
  return phone.trim();
}

// Parse email
function normalizeEmail(email: string | undefined): string | undefined {
  if (!email || email.toLowerCase().includes('contact to unlock')) return undefined;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes('@')) return undefined;
  return trimmed;
}

// Parse owner name into first/last
function parseOwnerName(name: string | undefined): { firstName?: string; lastName?: string; fullName?: string } {
  if (!name || name.toLowerCase().includes('contact to unlock')) {
    return {};
  }

  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length === 1) {
    return { fullName: trimmed, lastName: trimmed };
  }

  // Handle suffixes like Jr., Sr., etc.
  const suffixes = ['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv'];
  const lastPart = parts[parts.length - 1].toLowerCase();

  if (suffixes.includes(lastPart) && parts.length > 2) {
    return {
      fullName: trimmed,
      firstName: parts[0],
      lastName: parts.slice(1, -1).join(' ') + ' ' + parts[parts.length - 1]
    };
  }

  return {
    fullName: trimmed,
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

// Parse rare-leads.csv format
function parseRareLeads(data: any[]): NormalizedLead[] {
  return data.filter(row => row.Latitude && row.Longitude).map(row => ({
    latitude: parseFloat(row.Latitude),
    longitude: parseFloat(row.Longitude),
    tower_type: normalizeTowerType(row['Tower Type']),
    address: row.Address,
    city: row.City,
    state: row.State,
    zip_code: row.Zip,
    carrier: normalizeCarrier(row.Carrier),
    status: row.Status?.toUpperCase() || 'ACTIVE',
    google_maps_url: row['Google Maps URL']?.toLowerCase() === 'url' ? undefined : row['Google Maps URL'],
    remarks: row.Remarks,
    entity_name: row['Entity Name'],
    owner_name: row['Owner Name'],
    title: row.Title,
    phone_primary: normalizePhone(row['Owner Contact #']),
    email: normalizeEmail(row.Email),
    source: 'rare-leads.csv'
  }));
}

// Parse more-leads.csv format
function parseMoreLeads(data: any[]): NormalizedLead[] {
  return data.filter(row => {
    const lat = parseFloat(row.Latitude);
    const lng = parseFloat(row.Longitude);
    // Filter out "Multi" entries and invalid coordinates
    return !isNaN(lat) && !isNaN(lng) && row.Address !== 'Multi';
  }).map(row => ({
    latitude: parseFloat(row.Latitude),
    longitude: parseFloat(row.Longitude),
    tower_type: normalizeTowerType(row['Tower Type']),
    address: row.Address,
    city: row.City,
    state: row.State,
    zip_code: row.Zip,
    carrier: normalizeCarrier(row.Carrier),
    status: row.Status?.toUpperCase() || 'ACTIVE',
    google_maps_url: row['Google Maps URL']?.includes('View in Google Maps') ? undefined : row['Google Maps URL'],
    imagery_url: row.Imagery?.includes('drive.google.com') ? row.Imagery : undefined,
    remarks: row.Remarks,
    entity_name: row['Entity Name']?.toLowerCase().includes('contact to unlock') ? undefined : row['Entity Name'],
    owner_name: row['Owner Name']?.toLowerCase().includes('contact to unlock') ? undefined : row['Owner Name'],
    title: row.Title?.toLowerCase().includes('contact to unlock') ? undefined : row.Title,
    phone_primary: normalizePhone(row['Owner Contact #']),
    phone_secondary: normalizePhone(row['Secondary #']),
    email: normalizeEmail(row.Email),
    source: 'more-leads.csv'
  }));
}

// Parse Oncorelectricportfolio.csv format
function parseOncorPortfolio(data: any[]): NormalizedLead[] {
  return data.filter(row => row.Latitude && row.Longitude).map(row => ({
    latitude: parseFloat(row.Latitude),
    longitude: parseFloat(row.Longitude),
    tower_type: normalizeTowerType(row['Tower Type']),
    carrier: normalizeCarrier(row.Carrier),
    status: row.Status?.toUpperCase() || 'ACTIVE',
    entity_name: row['Owner Name'],
    owner_name: row['Owner Name'],
    phone_primary: normalizePhone(row['Owner Contact #']),
    google_maps_url: row['Google Maps URL']?.includes('View in Google Maps') ? undefined : row['Google Maps URL'],
    source: 'Oncorelectricportfolio.csv'
  }));
}

async function importLeads() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    // Read and parse CSV files
    const baseDir = path.join(process.cwd());

    const csvFiles = [
      { file: 'rare-leads.csv', parser: parseRareLeads },
      { file: 'more-leads.csv', parser: parseMoreLeads },
      { file: 'Oncorelectricportfolio.csv', parser: parseOncorPortfolio }
    ];

    let allLeads: NormalizedLead[] = [];

    for (const { file, parser } of csvFiles) {
      const filePath = path.join(baseDir, file);
      if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${file} - not found`);
        continue;
      }

      console.log(`Reading ${file}...`);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = parse(content, { columns: true, skip_empty_lines: true });
      const leads = parser(data);
      console.log(`  Found ${leads.length} valid leads`);
      allLeads = allLeads.concat(leads);
    }

    console.log(`\nTotal leads to import: ${allLeads.length}`);

    // Start transaction
    await client.query('BEGIN');

    // Get company ID for test company
    const companyResult = await client.query(
      `SELECT id FROM companies WHERE slug = 'test-company'`
    );

    if (companyResult.rows.length === 0) {
      throw new Error('Test company not found. Please run migrations first.');
    }

    const companyId = companyResult.rows[0].id;
    console.log(`Importing to company: ${companyId}`);

    let imported = 0;
    let skipped = 0;

    // Entity cache to avoid duplicates
    const entityCache = new Map<string, string>(); // name -> id

    for (const lead of allLeads) {
      try {
        // Check for duplicate tower at same location (within ~10m)
        const existingTower = await client.query(
          `SELECT id FROM towers
           WHERE ABS(latitude - $1) < 0.0001 AND ABS(longitude - $2) < 0.0001`,
          [lead.latitude, lead.longitude]
        );

        let towerId: number;

        if (existingTower.rows.length > 0) {
          towerId = existingTower.rows[0].id;
          console.log(`  Tower exists at (${lead.latitude}, ${lead.longitude}), updating...`);
        } else {
          // Insert new tower
          const towerResult = await client.query(
            `INSERT INTO towers (latitude, longitude, tower_type, first_seen_at, last_seen_at)
             VALUES ($1, $2, $3, NOW(), NOW())
             RETURNING id`,
            [lead.latitude, lead.longitude, lead.tower_type]
          );
          towerId = towerResult.rows[0].id;
        }

        // Get or create entity if we have entity_name
        let entityId: string | null = null;

        if (lead.entity_name) {
          const normalizedEntityName = lead.entity_name.trim().toUpperCase();

          if (entityCache.has(normalizedEntityName)) {
            entityId = entityCache.get(normalizedEntityName)!;
          } else {
            // Check if entity exists
            const existingEntity = await client.query(
              `SELECT id FROM entities WHERE UPPER(name) = $1`,
              [normalizedEntityName]
            );

            if (existingEntity.rows.length > 0) {
              entityId = existingEntity.rows[0].id;
            } else {
              // Create new entity
              const entityResult = await client.query(
                `INSERT INTO entities (name, entity_type, source)
                 VALUES ($1, 'LEAD_SOURCE', $2)
                 RETURNING id`,
                [lead.entity_name, lead.source]
              );
              entityId = entityResult.rows[0].id;
            }

            entityCache.set(normalizedEntityName, entityId);
          }

          // Add contact if we have owner info
          if (lead.owner_name || lead.email || lead.phone_primary) {
            const parsed = parseOwnerName(lead.owner_name);

            // Check if contact already exists for this entity
            const existingContact = await client.query(
              `SELECT id FROM entity_contacts
               WHERE entity_id = $1
               AND (
                 (full_name IS NOT NULL AND full_name = $2) OR
                 (email_primary IS NOT NULL AND email_primary = $3)
               )`,
              [entityId, parsed.fullName, lead.email]
            );

            if (existingContact.rows.length === 0) {
              await client.query(
                `INSERT INTO entity_contacts
                 (entity_id, first_name, last_name, full_name, title, phone_primary, phone_secondary, email_primary, source)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                  entityId,
                  parsed.firstName,
                  parsed.lastName,
                  parsed.fullName,
                  lead.title,
                  lead.phone_primary,
                  lead.phone_secondary,
                  lead.email,
                  lead.source
                ]
              );
            }
          }
        }

        // Create or update tower_site
        await client.query(
          `INSERT INTO tower_sites
           (tower_id, entity_id, address, city, state, zip_code, carrier, status, google_maps_url, imagery_url, remarks, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (tower_id) DO UPDATE SET
             entity_id = COALESCE(EXCLUDED.entity_id, tower_sites.entity_id),
             address = COALESCE(EXCLUDED.address, tower_sites.address),
             city = COALESCE(EXCLUDED.city, tower_sites.city),
             state = COALESCE(EXCLUDED.state, tower_sites.state),
             zip_code = COALESCE(EXCLUDED.zip_code, tower_sites.zip_code),
             carrier = COALESCE(EXCLUDED.carrier, tower_sites.carrier),
             status = COALESCE(EXCLUDED.status, tower_sites.status),
             google_maps_url = COALESCE(EXCLUDED.google_maps_url, tower_sites.google_maps_url),
             imagery_url = COALESCE(EXCLUDED.imagery_url, tower_sites.imagery_url),
             remarks = COALESCE(EXCLUDED.remarks, tower_sites.remarks),
             updated_at = NOW()`,
          [
            towerId,
            entityId,
            lead.address,
            lead.city,
            lead.state,
            lead.zip_code,
            lead.carrier,
            lead.status,
            lead.google_maps_url,
            lead.imagery_url,
            lead.remarks,
            lead.source
          ]
        );

        // Link to company with SAMPLE access (can be upgraded later)
        await client.query(
          `INSERT INTO company_towers (company_id, tower_id, access_state)
           VALUES ($1, $2, 'SAMPLE')
           ON CONFLICT (company_id, tower_id) DO NOTHING`,
          [companyId, towerId]
        );

        imported++;

      } catch (err) {
        console.error(`  Error importing lead at (${lead.latitude}, ${lead.longitude}):`, err);
        skipped++;
      }
    }

    await client.query('COMMIT');

    console.log(`\nImport complete!`);
    console.log(`  Imported: ${imported}`);
    console.log(`  Skipped: ${skipped}`);

    // Show summary
    const summaryResult = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM towers) as towers,
        (SELECT COUNT(*) FROM entities) as entities,
        (SELECT COUNT(*) FROM entity_contacts) as contacts,
        (SELECT COUNT(*) FROM tower_sites) as sites,
        (SELECT COUNT(*) FROM company_towers WHERE company_id = $1) as company_towers
    `, [companyId]);

    console.log('\nDatabase summary:');
    console.log(`  Towers: ${summaryResult.rows[0].towers}`);
    console.log(`  Entities: ${summaryResult.rows[0].entities}`);
    console.log(`  Contacts: ${summaryResult.rows[0].contacts}`);
    console.log(`  Tower Sites: ${summaryResult.rows[0].sites}`);
    console.log(`  Company Towers: ${summaryResult.rows[0].company_towers}`);

    client.release();

  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importLeads();
