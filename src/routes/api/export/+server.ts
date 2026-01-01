import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import * as XLSX from 'xlsx';

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

// Column definitions by section
const COLUMNS = {
	location: [
		{ key: 'address', header: 'Address' },
		{ key: 'city', header: 'City' },
		{ key: 'state', header: 'State' },
		{ key: 'zip', header: 'Zip' },
		{ key: 'latitude', header: 'Latitude' },
		{ key: 'longitude', header: 'Longitude' },
		{ key: 'google_maps_url', header: 'Google Maps URL' }
	],
	tower: [
		{ key: 'status', header: 'Status' },
		{ key: 'tower_type', header: 'Tower Type' },
		{ key: 'carrier', header: 'Carrier' },
		{ key: 'remarks', header: 'Remarks' }
	],
	owner: [
		{ key: 'entity_name', header: 'Entity Name' },
		{ key: 'owner_name', header: 'Owner Name' },
		{ key: 'title', header: 'Title' },
		{ key: 'phone', header: 'Owner Contact #' },
		{ key: 'email', header: 'Email' }
	],
	seller: [
		{ key: 'owner_age_65_plus', header: 'Age 65+' },
		{ key: 'life_events', header: 'Life Events' },
		{ key: 'seller_readiness', header: 'Seller Readiness Score' },
		{ key: 'ownership_duration', header: 'Years Owned' },
		{ key: 'legal_flags', header: 'Legal Flags' }
	],
	fiveG: [
		{ key: 'endc_available', header: '5G/EN-DC Capable' },
		{ key: 'nr_bands', header: 'NR Bands' },
		{ key: 'upgrade_potential', header: 'Upgrade Potential' },
		{ key: 'lte_bands', header: 'LTE Bands' }
	],
	rf: [
		{ key: 'spectrum_bands', header: 'Spectrum Bands' },
		{ key: 'antenna_config', header: 'Antenna Config' },
		{ key: 'signal_coverage', header: 'Signal Coverage' },
		{ key: 'sector_count', header: 'Sectors' },
		{ key: 'power_output', header: 'Power Output' }
	],
	zoning: [
		{ key: 'use_code', header: 'Use Code' },
		{ key: 'zoning', header: 'Zoning' },
		{ key: 'zoning_description', header: 'Zoning Description' },
		{ key: 'zoning_type', header: 'Zoning Type' },
		{ key: 'zoning_subtype', header: 'Zoning Subtype' },
		{ key: 'zoning_code_link', header: 'Zoning Code Link' },
		{ key: 'zoning_id', header: 'Zoning ID' }
	],
	property: [
		{ key: 'structure', header: 'Structure' },
		{ key: 'year_built', header: 'Year Built' },
		{ key: 'parcel_value_type', header: 'Parcel Value Type' },
		{ key: 'improvement_value', header: 'Improvement Value' },
		{ key: 'land_value', header: 'Land Value' },
		{ key: 'parcel_value', header: 'Parcel Value' },
		{ key: 'ag_value', header: 'Ag Value' },
		{ key: 'sale_date', header: 'Sale Date' },
		{ key: 'tax_year', header: 'Tax Year' }
	]
};

type Section = keyof typeof COLUMNS;

export const GET: RequestHandler = async ({ url, locals }) => {
	const session = await locals.auth?.();

	if (!session?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const format = url.searchParams.get('format') || 'xlsx';
	const sectionsParam = url.searchParams.get('sections') || 'location,tower,owner';
	const sections = sectionsParam.split(',').filter((s): s is Section => s in COLUMNS);

	if (sections.length === 0) {
		return json({ error: 'No valid sections selected' }, { status: 400 });
	}

	try {
		// Query tower data with related info
		const exportQuery = `
			query ExportData {
				tower_sites {
					id
					site_id
					address
					city
					state
					zip_code
					county
					google_maps_url
					carrier
					status
					tower_type
					remarks
					entity {
						id
						name
						entity_type
						entity_contacts(limit: 1, order_by: {contact_order: asc}) {
							full_name
							title
							phone_primary
							email_primary
						}
					}
				}
				towers {
					id
					latitude
					longitude
					tower_type
					endc_available
					tower_site {
						id
					}
				}
			}
		`;

		const data = await query(exportQuery);

		// Create a map of towers by site_id for lat/lng lookup
		const towersBySiteId = new Map<string, { latitude: number; longitude: number; endc_available?: boolean }>();
		data.towers?.forEach((t: { latitude: number; longitude: number; endc_available?: boolean; tower_site?: { id: string } }) => {
			if (t.tower_site?.id) {
				towersBySiteId.set(t.tower_site.id, { latitude: t.latitude, longitude: t.longitude, endc_available: t.endc_available });
			}
		});

		// Build rows based on selected sections
		const selectedColumns = sections.flatMap(s => COLUMNS[s]);
		const headers = ['Sr#', ...selectedColumns.map(c => c.header)];

		const rows = data.tower_sites?.map((site: {
			id: string;
			address?: string;
			city?: string;
			state?: string;
			zip_code?: string;
			google_maps_url?: string;
			carrier?: string;
			status?: string;
			tower_type?: string;
			remarks?: string;
			entity?: {
				name?: string;
				entity_contacts?: Array<{
					full_name?: string;
					title?: string;
					phone_primary?: string;
					email_primary?: string;
				}>;
			};
		}, index: number) => {
			const tower = towersBySiteId.get(site.id);
			const contact = site.entity?.entity_contacts?.[0];

			const rowData: Record<string, string | number | boolean | null> = {
				// Location
				address: site.address || '',
				city: site.city || '',
				state: site.state || '',
				zip: site.zip_code || '',
				latitude: tower?.latitude || '',
				longitude: tower?.longitude || '',
				google_maps_url: site.google_maps_url || '',

				// Tower
				status: site.status || 'ACTIVE',
				tower_type: site.tower_type || '',
				carrier: site.carrier || '',
				remarks: site.remarks || '',

				// Owner
				entity_name: site.entity?.name || '',
				owner_name: contact?.full_name || '',
				title: contact?.title || '',
				phone: contact?.phone_primary || '',
				email: contact?.email_primary || '',

				// Seller Intelligence (placeholder - premium data)
				owner_age_65_plus: '',
				life_events: '',
				seller_readiness: '',
				ownership_duration: '',
				legal_flags: '',

				// 5G Capable (from tower data)
				endc_available: tower?.endc_available ? 'Yes' : 'No',
				nr_bands: '',
				upgrade_potential: '',
				lte_bands: '',

				// RF & Technical (placeholder - premium data)
				spectrum_bands: '',
				antenna_config: '',
				signal_coverage: '',
				sector_count: '',
				power_output: '',

				// Zoning (placeholder - not yet in DB)
				use_code: '',
				zoning: '',
				zoning_description: '',
				zoning_type: '',
				zoning_subtype: '',
				zoning_code_link: '',
				zoning_id: '',

				// Property (placeholder - not yet in DB)
				structure: '',
				year_built: '',
				parcel_value_type: '',
				improvement_value: '',
				land_value: '',
				parcel_value: '',
				ag_value: '',
				sale_date: '',
				tax_year: ''
			};

			return [index + 1, ...selectedColumns.map(c => rowData[c.key] ?? '')];
		}) || [];

		if (format === 'csv') {
			// Generate CSV
			const csvContent = [
				headers.join(','),
				...rows.map((row: (string | number | null)[]) =>
					row.map(cell => {
						const str = String(cell ?? '');
						// Escape quotes and wrap in quotes if contains comma/quote/newline
						if (str.includes(',') || str.includes('"') || str.includes('\n')) {
							return `"${str.replace(/"/g, '""')}"`;
						}
						return str;
					}).join(',')
				)
			].join('\n');

			return new Response(csvContent, {
				headers: {
					'Content-Type': 'text/csv',
					'Content-Disposition': `attachment; filename="tower-leads-${new Date().toISOString().split('T')[0]}.csv"`
				}
			});
		} else {
			// Generate XLSX using SheetJS
			const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

			// Set column widths
			worksheet['!cols'] = headers.map((h) => ({
				wch: Math.max(h.length, 15)
			}));

			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Tower Leads');

			const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

			return new Response(buffer, {
				headers: {
					'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
					'Content-Disposition': `attachment; filename="tower-leads-${new Date().toISOString().split('T')[0]}.xlsx"`
				}
			});
		}
	} catch (err) {
		console.error('Export error:', err);
		return json(
			{ error: err instanceof Error ? err.message : 'Export failed' },
			{ status: 500 }
		);
	}
};
