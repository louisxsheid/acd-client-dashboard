// Tower and related types

export interface Provider {
	id: number;
	name: string;
	country_id: number;
	provider_id: number;
}

export interface TowerProvider {
	id: number;
	rat: string;
	rat_subtype?: string;
	external_id?: string;
	site_id?: string;
	region_id?: string;
	first_seen_at?: string;
	last_seen_at?: string;
	endc_available?: boolean;
	has_bandwidth_data?: boolean;
	has_frequency_data?: boolean;
	provider: Provider;
}

export interface TowerBand {
	id: number;
	band_number: number;
	band_name?: string;
	channel?: number;
	bandwidth?: number;
	modulation?: string;
}

export interface Cell {
	id: number;
	cell_id: string;
	pci?: number;
	sector?: number;
	bearing?: number;
	bandwidth?: number;
	signal?: number;
	subsystem?: string;
	lte_snr_max?: number;
	lte_rsrq_max?: number;
	max_speed_down_mbps?: number;
	avg_speed_down_mbps?: number;
	max_speed_up_mbps?: number;
	avg_speed_up_mbps?: number;
}

export interface EntityContact {
	id: string;
	contact_order: number;
	first_name?: string;
	middle_name?: string;
	last_name?: string;
	full_name?: string;
	title?: string;
	phone_primary?: string;
	phone_primary_dnc?: boolean;
	phone_secondary?: string;
	phone_secondary_dnc?: boolean;
	email_primary?: string;
	email_primary_verified?: boolean;
	email_secondary?: string;
	email_secondary_verified?: boolean;
	preferred_contact_method?: string;
	best_time_to_contact?: string;
	status?: string;
	last_contacted_at?: string;
	notes?: string;
}

export interface Entity {
	id: string;
	name: string;
	entity_type?: string;
	mail_address?: string;
	mail_city?: string;
	mail_state?: string;
	mail_zip?: string;
	mail_country?: string;
	source?: string;
	entity_contacts: EntityContact[];
	tower_sites_aggregate?: {
		aggregate: {
			count: number;
		};
	};
}

export interface TowerSite {
	id: string;
	site_id?: string;
	google_maps_url?: string;
	address?: string;
	city?: string;
	state?: string;
	zip_code?: string;
	county?: string;
	country?: string;
	carrier?: string;
	status?: string;
	tower_type?: string;
	imagery_url?: string;
	remarks?: string;
	source?: string;
	source_updated_at?: string;
	entity?: Entity;
	// Zoning fields
	use_code?: string;
	zoning?: string;
	zoning_description?: string;
	zoning_type?: string;
	zoning_subtype?: string;
	zoning_code_link?: string;
	telecom_ordinance_link?: string;
	zoning_id?: string;
	// Property valuation fields
	improvement_value?: number;
	land_value?: number;
	parcel_value?: number;
	year_built?: number;
}

export interface Tower {
	id: number;
	latitude: number;
	longitude: number;
	tower_type?: string;
	first_seen_at?: string;
	last_seen_at?: string;
	endc_available?: boolean;
	provider_count?: number;
	has_bandwidth_data?: boolean;
	has_frequency_data?: boolean;
	tower_site?: TowerSite;
	tower_providers?: TowerProvider[];
	tower_bands?: TowerBand[];
	cells?: Cell[];
}

export type AccessState = 'SAMPLE' | 'TRIAL' | 'LICENSED' | 'FULL';

export interface CompanyTower {
	id: string;
	access_state: AccessState;
	granted_at?: string;
	expires_at?: string;
	notes?: string;
	tower: Tower;
}

// Search/filter types
export interface SearchFilters {
	query: string;
	entityId?: string;
	carrier?: string;
	state?: string;
	towerType?: string;
	accessState?: AccessState;
}

export interface PaginationState {
	page: number;
	pageSize: number;
	total: number;
}

// Map types
export interface MapBounds {
	minLat: number;
	maxLat: number;
	minLng: number;
	maxLng: number;
}

export interface MapViewState {
	latitude: number;
	longitude: number;
	zoom: number;
}

// For the tower list
export interface TowerListItem {
	id: number;
	latitude: number;
	longitude: number;
	address?: string;
	city?: string;
	state?: string;
	carrier?: string;
	entityName?: string;
	accessState: AccessState;
	towerType?: string;
}
