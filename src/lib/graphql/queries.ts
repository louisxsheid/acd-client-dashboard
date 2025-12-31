import { gql } from "@urql/svelte";

export const DASHBOARD_STATS = gql`
  query DashboardStats {
    towers_aggregate {
      aggregate {
        count
      }
    }
    cells_aggregate {
      aggregate {
        count
      }
    }
    providers_aggregate {
      aggregate {
        count
      }
    }
    tower_bands_aggregate {
      aggregate {
        count
      }
    }
    tower_providers_aggregate {
      aggregate {
        count
      }
    }
    endc_towers: tower_providers_aggregate(where: { endc_available: { _eq: true } }) {
      aggregate {
        count
      }
    }
    multi_provider_towers: towers_aggregate(where: { provider_count: { _gt: 1 } }) {
      aggregate {
        count
      }
    }
  }
`;

// RAT counts now come from tower_providers (one tower can have multiple RATs)
export const TOWERS_BY_RAT = gql`
  query TowersByRAT {
    lte: tower_providers_aggregate(where: { rat: { _eq: "LTE" } }) {
      aggregate {
        count
      }
    }
    nr: tower_providers_aggregate(where: { rat: { _eq: "NR" } }) {
      aggregate {
        count
      }
    }
    gsm: tower_providers_aggregate(where: { rat: { _eq: "GSM" } }) {
      aggregate {
        count
      }
    }
    cdma: tower_providers_aggregate(where: { rat: { _eq: "CDMA" } }) {
      aggregate {
        count
      }
    }
    umts: tower_providers_aggregate(where: { rat: { _eq: "UMTS" } }) {
      aggregate {
        count
      }
    }
  }
`;

export const TOWERS_BY_TYPE = gql`
  query TowersByType {
    macro: towers_aggregate(where: { tower_type: { _eq: "MACRO" } }) {
      aggregate {
        count
      }
    }
    micro: towers_aggregate(where: { tower_type: { _eq: "MICRO" } }) {
      aggregate {
        count
      }
    }
    pico: towers_aggregate(where: { tower_type: { _eq: "PICO" } }) {
      aggregate {
        count
      }
    }
    das: towers_aggregate(where: { tower_type: { _eq: "DAS" } }) {
      aggregate {
        count
      }
    }
    cow: towers_aggregate(where: { tower_type: { _eq: "COW" } }) {
      aggregate {
        count
      }
    }
    decommissioned: towers_aggregate(where: { tower_type: { _eq: "DECOMMISSIONED" } }) {
      aggregate {
        count
      }
    }
  }
`;

// Recent towers with all their providers
export const RECENT_TOWERS = gql`
  query RecentTowers($limit: Int!) {
    towers(
      order_by: { first_seen_at: desc_nulls_last }
      limit: $limit
      where: { first_seen_at: { _is_null: false } }
    ) {
      id
      tower_type
      latitude
      longitude
      first_seen_at
      last_seen_at
      endc_available
      provider_count
      tower_providers(order_by: { last_seen_at: desc_nulls_last }) {
        id
        external_id
        rat
        rat_subtype
        site_id
        region_id
        first_seen_at
        last_seen_at
        endc_available
        provider {
          id
          country_id
          provider_id
          name
        }
      }
      cells_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

// Simple providers list for map filters
export const PROVIDERS_LIST = gql`
  query ProvidersList {
    providers(order_by: { name: asc }) {
      id
      country_id
      provider_id
      name
    }
  }
`;

// Providers with tower stats via tower_providers junction table
export const PROVIDERS_WITH_STATS = gql`
  query ProvidersWithStats {
    providers(order_by: { id: asc }) {
      id
      country_id
      provider_id
      name
      visible
      tower_providers_aggregate {
        aggregate {
          count
        }
      }
      lte_tower_providers: tower_providers_aggregate(where: { rat: { _eq: "LTE" } }) {
        aggregate {
          count
        }
      }
      nr_tower_providers: tower_providers_aggregate(where: { rat: { _eq: "NR" } }) {
        aggregate {
          count
        }
      }
    }
  }
`;

// Providers with tower counts by site type
export const PROVIDERS_TOWER_TYPES = gql`
  query ProvidersTowerTypes {
    providers(order_by: { id: asc }) {
      id
      country_id
      provider_id
      name
      # Total towers for this provider
      tower_providers_aggregate {
        aggregate {
          count
        }
      }
      # Tower types - need to join through tower_providers to towers
      macro_towers: tower_providers_aggregate(where: { tower: { tower_type: { _eq: "MACRO" } } }) {
        aggregate {
          count
        }
      }
      micro_towers: tower_providers_aggregate(where: { tower: { tower_type: { _eq: "MICRO" } } }) {
        aggregate {
          count
        }
      }
      pico_towers: tower_providers_aggregate(where: { tower: { tower_type: { _eq: "PICO" } } }) {
        aggregate {
          count
        }
      }
      das_towers: tower_providers_aggregate(where: { tower: { tower_type: { _eq: "DAS" } } }) {
        aggregate {
          count
        }
      }
      cow_towers: tower_providers_aggregate(where: { tower: { tower_type: { _eq: "COW" } } }) {
        aggregate {
          count
        }
      }
      other_towers: tower_providers_aggregate(where: { tower: { tower_type: { _is_null: true } } }) {
        aggregate {
          count
        }
      }
    }
  }
`;

export const BAND_DISTRIBUTION = gql`
  query BandDistribution {
    b2: tower_bands_aggregate(where: { band_number: { _eq: 2 } }) {
      aggregate {
        count
      }
    }
    b4: tower_bands_aggregate(where: { band_number: { _eq: 4 } }) {
      aggregate {
        count
      }
    }
    b5: tower_bands_aggregate(where: { band_number: { _eq: 5 } }) {
      aggregate {
        count
      }
    }
    b12: tower_bands_aggregate(where: { band_number: { _eq: 12 } }) {
      aggregate {
        count
      }
    }
    b13: tower_bands_aggregate(where: { band_number: { _eq: 13 } }) {
      aggregate {
        count
      }
    }
    b14: tower_bands_aggregate(where: { band_number: { _eq: 14 } }) {
      aggregate {
        count
      }
    }
    b30: tower_bands_aggregate(where: { band_number: { _eq: 30 } }) {
      aggregate {
        count
      }
    }
  }
`;

// Map query - loads towers within viewport bounds with all their providers
export const TOWERS_IN_BOUNDS = gql`
  query TowersInBounds(
    $minLat: float8!
    $maxLat: float8!
    $minLng: float8!
    $maxLng: float8!
    $limit: Int!
  ) {
    towers(
      where: {
        latitude: { _gte: $minLat, _lte: $maxLat }
        longitude: { _gte: $minLng, _lte: $maxLng }
      }
      limit: $limit
      order_by: { id: asc }
    ) {
      id
      latitude
      longitude
      tower_type
      endc_available
      provider_count
      tower_providers {
        id
        rat
        endc_available
        provider_id
        provider {
          id
          country_id
          provider_id
        }
      }
    }
    towers_aggregate(
      where: {
        latitude: { _gte: $minLat, _lte: $maxLat }
        longitude: { _gte: $minLng, _lte: $maxLng }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// Pre-computed cluster queries using PostGIS ST_SnapToGrid
// Coarse clusters (~100km grid) - for zoom < 6
export const TOWER_CLUSTERS_COARSE = gql`
  query TowerClustersCoarse(
    $minLat: numeric!
    $maxLat: numeric!
    $minLng: numeric!
    $maxLng: numeric!
  ) {
    tower_clusters_coarse(
      where: {
        lat: { _gte: $minLat, _lte: $maxLat }
        lng: { _gte: $minLng, _lte: $maxLng }
      }
    ) {
      lat
      lng
      tower_count
      lte_count
      nr_count
      endc_count
    }
    tower_clusters_coarse_aggregate(
      where: {
        lat: { _gte: $minLat, _lte: $maxLat }
        lng: { _gte: $minLng, _lte: $maxLng }
      }
    ) {
      aggregate {
        sum {
          tower_count
        }
      }
    }
  }
`;

// Medium clusters (~10km grid) - for zoom 6-10
export const TOWER_CLUSTERS_MEDIUM = gql`
  query TowerClustersMedium(
    $minLat: numeric!
    $maxLat: numeric!
    $minLng: numeric!
    $maxLng: numeric!
  ) {
    tower_clusters_medium(
      where: {
        lat: { _gte: $minLat, _lte: $maxLat }
        lng: { _gte: $minLng, _lte: $maxLng }
      }
    ) {
      lat
      lng
      tower_count
      lte_count
      nr_count
      endc_count
    }
    tower_clusters_medium_aggregate(
      where: {
        lat: { _gte: $minLat, _lte: $maxLat }
        lng: { _gte: $minLng, _lte: $maxLng }
      }
    ) {
      aggregate {
        sum {
          tower_count
        }
      }
    }
  }
`;

// Fine clusters (~1km grid) - for zoom 10-13
export const TOWER_CLUSTERS_FINE = gql`
  query TowersClustersFine(
    $minLat: numeric!
    $maxLat: numeric!
    $minLng: numeric!
    $maxLng: numeric!
  ) {
    tower_clusters_fine(
      where: {
        lat: { _gte: $minLat, _lte: $maxLat }
        lng: { _gte: $minLng, _lte: $maxLng }
      }
    ) {
      lat
      lng
      tower_count
      lte_count
      nr_count
      endc_count
    }
    tower_clusters_fine_aggregate(
      where: {
        lat: { _gte: $minLat, _lte: $maxLat }
        lng: { _gte: $minLng, _lte: $maxLng }
      }
    ) {
      aggregate {
        sum {
          tower_count
        }
      }
    }
  }
`;

// Tower growth over time - monthly aggregates
export const TOWER_GROWTH = gql`
  query TowerGrowth {
    y2020: towers_aggregate(where: { first_seen_at: { _gte: "2020-01-01", _lt: "2021-01-01" } }) {
      aggregate { count }
    }
    y2021: towers_aggregate(where: { first_seen_at: { _gte: "2021-01-01", _lt: "2022-01-01" } }) {
      aggregate { count }
    }
    y2022: towers_aggregate(where: { first_seen_at: { _gte: "2022-01-01", _lt: "2023-01-01" } }) {
      aggregate { count }
    }
    y2023: towers_aggregate(where: { first_seen_at: { _gte: "2023-01-01", _lt: "2024-01-01" } }) {
      aggregate { count }
    }
    y2024: towers_aggregate(where: { first_seen_at: { _gte: "2024-01-01", _lt: "2025-01-01" } }) {
      aggregate { count }
    }
    y2025: towers_aggregate(where: { first_seen_at: { _gte: "2025-01-01", _lt: "2026-01-01" } }) {
      aggregate { count }
    }
    before2020: towers_aggregate(where: { first_seen_at: { _lt: "2020-01-01" } }) {
      aggregate { count }
    }
    unknown: towers_aggregate(where: { first_seen_at: { _is_null: true } }) {
      aggregate { count }
    }
  }
`;

// Data freshness - last seen distribution
export const DATA_FRESHNESS = gql`
  query DataFreshness {
    last_24h: towers_aggregate(
      where: { last_seen_at: { _gte: "2025-04-01" } }
    ) {
      aggregate { count }
    }
    last_7d: towers_aggregate(
      where: { last_seen_at: { _gte: "2025-03-25", _lt: "2025-04-01" } }
    ) {
      aggregate { count }
    }
    last_30d: towers_aggregate(
      where: { last_seen_at: { _gte: "2025-03-01", _lt: "2025-03-25" } }
    ) {
      aggregate { count }
    }
    last_90d: towers_aggregate(
      where: { last_seen_at: { _gte: "2025-01-01", _lt: "2025-03-01" } }
    ) {
      aggregate { count }
    }
    last_year: towers_aggregate(
      where: { last_seen_at: { _gte: "2024-04-01", _lt: "2025-01-01" } }
    ) {
      aggregate { count }
    }
    older: towers_aggregate(
      where: { last_seen_at: { _lt: "2024-04-01" } }
    ) {
      aggregate { count }
    }
  }
`;

// Data freshness per carrier - shows when each carrier's data was last updated
export const CARRIER_DATA_FRESHNESS = gql`
  query CarrierDataFreshness {
    providers {
      id
      country_id
      provider_id
      name
      # Total tower_providers for this carrier
      total: tower_providers_aggregate {
        aggregate { count }
      }
      # Fresh: last 30 days
      fresh: tower_providers_aggregate(
        where: { last_seen_at: { _gte: "2024-11-23" } }
      ) {
        aggregate { count }
      }
      # Recent: 30-90 days
      recent: tower_providers_aggregate(
        where: { last_seen_at: { _gte: "2024-09-24", _lt: "2024-11-23" } }
      ) {
        aggregate { count }
      }
      # Aging: 90 days - 1 year
      aging: tower_providers_aggregate(
        where: { last_seen_at: { _gte: "2023-12-23", _lt: "2024-09-24" } }
      ) {
        aggregate { count }
      }
      # Stale: older than 1 year
      stale: tower_providers_aggregate(
        where: { last_seen_at: { _lt: "2023-12-23" } }
      ) {
        aggregate { count }
      }
      # Most recent observation for this carrier
      latest: tower_providers(
        order_by: { last_seen_at: desc_nulls_last }
        limit: 1
        where: { last_seen_at: { _is_null: false } }
      ) {
        last_seen_at
      }
    }
  }
`;

// Carrier band comparison - now uses tower_providers to find bands by provider
export const CARRIER_BANDS = gql`
  query CarrierBands {
    providers {
      id
      country_id
      provider_id
      name
      b2: tower_bands_aggregate(
        where: { band_number: { _eq: 2 } }
      ) {
        aggregate { count }
      }
      b4: tower_bands_aggregate(
        where: { band_number: { _eq: 4 } }
      ) {
        aggregate { count }
      }
      b12: tower_bands_aggregate(
        where: { band_number: { _eq: 12 } }
      ) {
        aggregate { count }
      }
      b13: tower_bands_aggregate(
        where: { band_number: { _eq: 13 } }
      ) {
        aggregate { count }
      }
      b14: tower_bands_aggregate(
        where: { band_number: { _eq: 14 } }
      ) {
        aggregate { count }
      }
    }
  }
`;

// Signal quality stats
export const SIGNAL_STATS = gql`
  query SignalStats {
    cells_aggregate(where: { signal: { _is_null: false } }) {
      aggregate {
        avg {
          signal
        }
        min {
          signal
        }
        max {
          signal
        }
      }
    }
    speed_stats: cells_aggregate(where: { max_speed_down_mbps: { _is_null: false } }) {
      aggregate {
        avg {
          max_speed_down_mbps
          avg_speed_down_mbps
          max_speed_up_mbps
          avg_speed_up_mbps
        }
        max {
          max_speed_down_mbps
          max_speed_up_mbps
        }
      }
    }
    snr_stats: cells_aggregate(where: {
      lte_snr_max: { _is_null: false, _lt: 100 },
      lte_rsrq_max: { _is_null: false, _gt: -50 }
    }) {
      aggregate {
        avg {
          lte_snr_max
          lte_rsrq_max
        }
      }
    }
  }
`;

// Cells per tower distribution
export const CELLS_PER_TOWER = gql`
  query CellsPerTower {
    single: towers_aggregate(where: { cells_aggregate: { count: { predicate: { _eq: 1 } } } }) {
      aggregate { count }
    }
    two_to_four: towers_aggregate(where: { cells_aggregate: { count: { predicate: { _gte: 2, _lte: 4 } } } }) {
      aggregate { count }
    }
    five_to_ten: towers_aggregate(where: { cells_aggregate: { count: { predicate: { _gte: 5, _lte: 10 } } } }) {
      aggregate { count }
    }
    many: towers_aggregate(where: { cells_aggregate: { count: { predicate: { _gt: 10 } } } }) {
      aggregate { count }
    }
  }
`;

// Get full tower details with all providers, cells, and bands
export const TOWER_DETAILS = gql`
  query TowerDetails($id: Int!) {
    towers_by_pk(id: $id) {
      id
      location_hash
      latitude
      longitude
      tower_type
      first_seen_at
      last_seen_at
      generator
      generator_time
      tower_mover_id
      contributors
      has_bandwidth_data
      has_frequency_data
      endc_available
      provider_count
      visible
      created_at
      tower_providers(order_by: { last_seen_at: desc_nulls_last }) {
        id
        external_id
        rat
        rat_subtype
        site_id
        region_id
        first_seen_at
        last_seen_at
        tower_mover
        has_bandwidth_data
        has_frequency_data
        endc_available
        visible
        provider {
          id
          country_id
          provider_id
          name
        }
      }
      cells(order_by: { last_seen_at: desc_nulls_last }) {
        id
        cell_id
        pci
        sector
        bearing
        bandwidth
        signal
        subsystem
        first_seen_at
        last_seen_at
        lte_snr_max
        lte_rsrq_max
        max_speed_down_mbps
        avg_speed_down_mbps
        max_speed_up_mbps
        avg_speed_up_mbps
        endc_available
        provider {
          id
          country_id
          provider_id
          name
        }
      }
      tower_bands(order_by: { band_number: asc }) {
        id
        band_number
        band_name
        channel
        bandwidth
        modulation
        provider {
          id
          country_id
          provider_id
          name
        }
      }
    }
  }
`;

// Providers per tower distribution
export const PROVIDERS_PER_TOWER = gql`
  query ProvidersPerTower {
    single: towers_aggregate(where: { provider_count: { _eq: 1 } }) {
      aggregate { count }
    }
    two: towers_aggregate(where: { provider_count: { _eq: 2 } }) {
      aggregate { count }
    }
    three: towers_aggregate(where: { provider_count: { _eq: 3 } }) {
      aggregate { count }
    }
    four_plus: towers_aggregate(where: { provider_count: { _gte: 4 } }) {
      aggregate { count }
    }
  }
`;

// Carrier stats with EN-DC and overlap counts
export const CARRIER_STATS = gql`
  query CarrierStats {
    providers {
      id
      country_id
      provider_id
      name
      # Total sites (including decommissioned)
      tower_providers_aggregate {
        aggregate {
          count
        }
      }
      # Active sites only (excludes decommissioned towers)
      active_tower_providers: tower_providers_aggregate(
        where: { tower: { tower_type: { _neq: "DECOMMISSIONED" } } }
      ) {
        aggregate {
          count
        }
      }
      endc_tower_providers: tower_providers_aggregate(
        where: {
          endc_available: { _eq: true }
          tower: { tower_type: { _neq: "DECOMMISSIONED" } }
        }
      ) {
        aggregate {
          count
        }
      }
      lte_tower_providers: tower_providers_aggregate(
        where: {
          rat: { _eq: "LTE" }
          tower: { tower_type: { _neq: "DECOMMISSIONED" } }
        }
      ) {
        aggregate {
          count
        }
      }
      nr_tower_providers: tower_providers_aggregate(
        where: {
          rat: { _eq: "NR" }
          tower: { tower_type: { _neq: "DECOMMISSIONED" } }
        }
      ) {
        aggregate {
          count
        }
      }
    }
    carrier_combination_counts(order_by: { tower_count: desc }) {
      combination
      tower_count
    }
    towers_aggregate {
      aggregate {
        count
      }
    }
    active_towers: towers_aggregate(where: { tower_type: { _neq: "DECOMMISSIONED" } }) {
      aggregate {
        count
      }
    }
    multi_provider_towers: towers_aggregate(where: { provider_count: { _gt: 1 } }) {
      aggregate {
        count
      }
    }
  }
`;

// Network insights - cell density and performance data
export const NETWORK_INSIGHTS = gql`
  query NetworkInsights {
    providers {
      id
      country_id
      provider_id
      name
      cells_aggregate {
        aggregate {
          count
        }
      }
      cells_with_speed: cells_aggregate(where: { max_speed_down_mbps: { _is_null: false, _gt: 0 } }) {
        aggregate {
          count
          avg {
            max_speed_down_mbps
          }
          max {
            max_speed_down_mbps
          }
        }
      }
      cells_with_snr: cells_aggregate(where: { lte_snr_max: { _is_null: false, _lt: 100 } }) {
        aggregate {
          count
          avg {
            lte_snr_max
          }
        }
      }
    }
    cells_aggregate {
      aggregate {
        count
      }
    }
    cells_with_speed_total: cells_aggregate(where: { max_speed_down_mbps: { _is_null: false, _gt: 0 } }) {
      aggregate {
        count
      }
    }
    cells_with_signal_total: cells_aggregate(where: { lte_snr_max: { _is_null: false } }) {
      aggregate {
        count
      }
    }
    # Top bands by deployment count
    b2: tower_bands_aggregate(where: { band_number: { _eq: 2 } }) { aggregate { count } }
    b4: tower_bands_aggregate(where: { band_number: { _eq: 4 } }) { aggregate { count } }
    b5: tower_bands_aggregate(where: { band_number: { _eq: 5 } }) { aggregate { count } }
    b12: tower_bands_aggregate(where: { band_number: { _eq: 12 } }) { aggregate { count } }
    b13: tower_bands_aggregate(where: { band_number: { _eq: 13 } }) { aggregate { count } }
    b14: tower_bands_aggregate(where: { band_number: { _eq: 14 } }) { aggregate { count } }
    b30: tower_bands_aggregate(where: { band_number: { _eq: 30 } }) { aggregate { count } }
    b41: tower_bands_aggregate(where: { band_number: { _eq: 41 } }) { aggregate { count } }
    b66: tower_bands_aggregate(where: { band_number: { _eq: 66 } }) { aggregate { count } }
    b71: tower_bands_aggregate(where: { band_number: { _eq: 71 } }) { aggregate { count } }
  }
`;

// Multi-provider towers - towers with more than one carrier
export const MULTI_PROVIDER_TOWERS = gql`
  query MultiProviderTowers($limit: Int!) {
    towers(
      where: { provider_count: { _gt: 1 } }
      order_by: { provider_count: desc }
      limit: $limit
    ) {
      id
      latitude
      longitude
      tower_type
      provider_count
      endc_available
      first_seen_at
      last_seen_at
      tower_providers {
        id
        rat
        provider {
          id
          country_id
          provider_id
          name
        }
      }
    }
  }
`;

// Band fingerprinting data - for tower hunters
export const BAND_FINGERPRINTING = gql`
  query BandFingerprinting {
    # Total towers for percentages
    towers_aggregate {
      aggregate {
        count
      }
    }
    # Towers with band data
    towers_with_bands: towers_aggregate(
      where: { tower_bands_aggregate: { count: { predicate: { _gt: 0 } } } }
    ) {
      aggregate {
        count
      }
    }
    # Cells with bearing data (for sector directions)
    cells_with_bearing: cells_aggregate(
      where: { bearing: { _is_null: false } }
    ) {
      aggregate {
        count
      }
    }
    # Spectrum tier counts - Low band (<1GHz): B5, B12, B13, B14, B17, B26, B71
    low_band_b5: tower_bands_aggregate(where: { band_number: { _eq: 5 } }) { aggregate { count } }
    low_band_b12: tower_bands_aggregate(where: { band_number: { _eq: 12 } }) { aggregate { count } }
    low_band_b13: tower_bands_aggregate(where: { band_number: { _eq: 13 } }) { aggregate { count } }
    low_band_b14: tower_bands_aggregate(where: { band_number: { _eq: 14 } }) { aggregate { count } }
    low_band_b17: tower_bands_aggregate(where: { band_number: { _eq: 17 } }) { aggregate { count } }
    low_band_b26: tower_bands_aggregate(where: { band_number: { _eq: 26 } }) { aggregate { count } }
    low_band_b71: tower_bands_aggregate(where: { band_number: { _eq: 71 } }) { aggregate { count } }
    # Mid band (1-6GHz): B2, B4, B25, B30, B66, B41, B48
    mid_band_b2: tower_bands_aggregate(where: { band_number: { _eq: 2 } }) { aggregate { count } }
    mid_band_b4: tower_bands_aggregate(where: { band_number: { _eq: 4 } }) { aggregate { count } }
    mid_band_b25: tower_bands_aggregate(where: { band_number: { _eq: 25 } }) { aggregate { count } }
    mid_band_b30: tower_bands_aggregate(where: { band_number: { _eq: 30 } }) { aggregate { count } }
    mid_band_b66: tower_bands_aggregate(where: { band_number: { _eq: 66 } }) { aggregate { count } }
    mid_band_b41: tower_bands_aggregate(where: { band_number: { _eq: 41 } }) { aggregate { count } }
    mid_band_b48: tower_bands_aggregate(where: { band_number: { _eq: 48 } }) { aggregate { count } }
    # High band (mmWave): B77, B258, B260, B261
    high_band_b77: tower_bands_aggregate(where: { band_number: { _eq: 77 } }) { aggregate { count } }
    high_band_b258: tower_bands_aggregate(where: { band_number: { _eq: 258 } }) { aggregate { count } }
    high_band_b260: tower_bands_aggregate(where: { band_number: { _eq: 260 } }) { aggregate { count } }
    high_band_b261: tower_bands_aggregate(where: { band_number: { _eq: 261 } }) { aggregate { count } }
    # Bearing distribution by octant (8 directions, 45 degrees each)
    bearing_n: cells_aggregate(where: { _or: [{ bearing: { _gte: 337 } }, { bearing: { _lt: 23 } }] }) { aggregate { count } }
    bearing_ne: cells_aggregate(where: { bearing: { _gte: 23, _lt: 68 } }) { aggregate { count } }
    bearing_e: cells_aggregate(where: { bearing: { _gte: 68, _lt: 113 } }) { aggregate { count } }
    bearing_se: cells_aggregate(where: { bearing: { _gte: 113, _lt: 158 } }) { aggregate { count } }
    bearing_s: cells_aggregate(where: { bearing: { _gte: 158, _lt: 203 } }) { aggregate { count } }
    bearing_sw: cells_aggregate(where: { bearing: { _gte: 203, _lt: 248 } }) { aggregate { count } }
    bearing_w: cells_aggregate(where: { bearing: { _gte: 248, _lt: 293 } }) { aggregate { count } }
    bearing_nw: cells_aggregate(where: { bearing: { _gte: 293, _lt: 337 } }) { aggregate { count } }
    # Band combinations by carrier - use tower_band_combos view if available
    # For now, get top bands per carrier for fingerprinting
    providers {
      id
      country_id
      provider_id
      name
      tower_bands_aggregate {
        aggregate {
          count
        }
      }
      b2: tower_bands_aggregate(where: { band_number: { _eq: 2 } }) { aggregate { count } }
      b4: tower_bands_aggregate(where: { band_number: { _eq: 4 } }) { aggregate { count } }
      b5: tower_bands_aggregate(where: { band_number: { _eq: 5 } }) { aggregate { count } }
      b12: tower_bands_aggregate(where: { band_number: { _eq: 12 } }) { aggregate { count } }
      b13: tower_bands_aggregate(where: { band_number: { _eq: 13 } }) { aggregate { count } }
      b14: tower_bands_aggregate(where: { band_number: { _eq: 14 } }) { aggregate { count } }
      b30: tower_bands_aggregate(where: { band_number: { _eq: 30 } }) { aggregate { count } }
      b41: tower_bands_aggregate(where: { band_number: { _eq: 41 } }) { aggregate { count } }
      b66: tower_bands_aggregate(where: { band_number: { _eq: 66 } }) { aggregate { count } }
      b71: tower_bands_aggregate(where: { band_number: { _eq: 71 } }) { aggregate { count } }
      # Bearing data per carrier
      bearing_n: cells_aggregate(where: { _or: [{ bearing: { _gte: 337 } }, { bearing: { _lt: 23 } }] }) { aggregate { count } }
      bearing_ne: cells_aggregate(where: { bearing: { _gte: 23, _lt: 68 } }) { aggregate { count } }
      bearing_e: cells_aggregate(where: { bearing: { _gte: 68, _lt: 113 } }) { aggregate { count } }
      bearing_se: cells_aggregate(where: { bearing: { _gte: 113, _lt: 158 } }) { aggregate { count } }
      bearing_s: cells_aggregate(where: { bearing: { _gte: 158, _lt: 203 } }) { aggregate { count } }
      bearing_sw: cells_aggregate(where: { bearing: { _gte: 203, _lt: 248 } }) { aggregate { count } }
      bearing_w: cells_aggregate(where: { bearing: { _gte: 248, _lt: 293 } }) { aggregate { count } }
      bearing_nw: cells_aggregate(where: { bearing: { _gte: 293, _lt: 337 } }) { aggregate { count } }
      cells_with_bearing: cells_aggregate(where: { bearing: { _is_null: false } }) { aggregate { count } }
    }
  }
`;

// GNN Anomaly Detection queries
export const ANOMALY_STATS = gql`
  query AnomalyStats($model_version: String!) {
    tower_anomaly_scores_aggregate(where: { model_version: { _eq: $model_version } }) {
      aggregate {
        count
        avg { anomaly_score }
        stddev { anomaly_score }
        min { anomaly_score }
        max { anomaly_score }
      }
    }
    above_95: tower_anomaly_scores_aggregate(where: {
      model_version: { _eq: $model_version }
      percentile: { _gt: 95 }
    }) {
      aggregate { count }
    }
    above_99: tower_anomaly_scores_aggregate(where: {
      model_version: { _eq: $model_version }
      percentile: { _gt: 99 }
    }) {
      aggregate { count }
    }
    tower_anomaly_scores(where: { model_version: { _eq: $model_version } }, limit: 1) {
      run_id
      created_at
    }
  }
`;

export const ANOMALY_VERSIONS = gql`
  query AnomalyVersions {
    tower_anomaly_scores(
      distinct_on: [model_version]
      order_by: [{ model_version: desc }, { created_at: desc }]
    ) {
      model_version
      run_id
      created_at
    }
  }
`;

export const TOP_ANOMALIES = gql`
  query TopAnomalies($model_version: String!, $limit: Int!, $min_percentile: Float!) {
    tower_anomaly_scores(
      where: {
        model_version: { _eq: $model_version }
        percentile: { _gte: $min_percentile }
      }
      order_by: { anomaly_score: desc }
      limit: $limit
    ) {
      tower_id
      anomaly_score
      percentile
      link_pred_error
      neighbor_inconsistency
      tower {
        latitude
        longitude
        tower_type
        provider_count
        tower_providers {
          rat
          provider {
            country_id
            provider_id
          }
        }
      }
    }
  }
`;

export const ANOMALIES_IN_BOUNDS = gql`
  query AnomaliesInBounds(
    $model_version: String!
    $min_lat: Float!
    $max_lat: Float!
    $min_lng: Float!
    $max_lng: Float!
    $min_percentile: Float!
    $limit: Int!
  ) {
    tower_anomaly_scores(
      where: {
        model_version: { _eq: $model_version }
        percentile: { _gte: $min_percentile }
        tower: {
          latitude: { _gte: $min_lat, _lte: $max_lat }
          longitude: { _gte: $min_lng, _lte: $max_lng }
        }
      }
      order_by: { anomaly_score: desc }
      limit: $limit
    ) {
      tower_id
      anomaly_score
      percentile
      link_pred_error
      neighbor_inconsistency
      tower {
        latitude
        longitude
        tower_type
        provider_count
      }
    }
  }
`;

// Coverage Gap Detection queries
export const COVERAGE_GAP_STATS = gql`
  query CoverageGapStats($model_version: String!) {
    coverage_gap_candidates_aggregate(where: { model_version: { _eq: $model_version } }) {
      aggregate {
        count
        avg { gap_confidence gap_distance_m }
        max { gap_confidence gap_distance_m }
        min { gap_confidence gap_distance_m }
      }
    }
    high_confidence: coverage_gap_candidates_aggregate(where: {
      model_version: { _eq: $model_version }
      gap_confidence: { _gte: 0.95 }
    }) {
      aggregate { count }
    }
    predicted_missing_links_aggregate(where: { model_version: { _eq: $model_version } }) {
      aggregate {
        count
        avg { link_probability distance_m }
      }
    }
    coverage_gap_candidates(where: { model_version: { _eq: $model_version } }, limit: 1) {
      run_id
      created_at
    }
  }
`;

export const COVERAGE_GAP_VERSIONS = gql`
  query CoverageGapVersions {
    coverage_gap_candidates(
      distinct_on: [model_version]
      where: { model_version: { _like: "gnn-%" } }
      order_by: [{ model_version: desc }, { created_at: desc }]
    ) {
      model_version
      run_id
      created_at
    }
  }
`;

export const TOP_COVERAGE_GAPS = gql`
  query TopCoverageGaps($model_version: String!, $limit: Int!, $min_confidence: float8!) {
    coverage_gap_candidates(
      where: {
        model_version: { _eq: $model_version }
        gap_confidence: { _gte: $min_confidence }
      }
      order_by: { dense_anomaly_score: desc_nulls_last }
      limit: $limit
    ) {
      id
      latitude
      longitude
      gap_confidence
      gap_distance_m
      dense_anomaly_score
      tower_a_id
      tower_b_id
      tower_a_lat
      tower_a_lng
      tower_b_lat
      tower_b_lng
    }
  }
`;

export const COVERAGE_GAPS_IN_BOUNDS = gql`
  query CoverageGapsInBounds(
    $model_version: String!
    $min_lat: float8!
    $max_lat: float8!
    $min_lng: float8!
    $max_lng: float8!
    $min_confidence: float8!
    $limit: Int!
  ) {
    coverage_gap_candidates(
      where: {
        model_version: { _eq: $model_version }
        gap_confidence: { _gte: $min_confidence }
        latitude: { _gte: $min_lat, _lte: $max_lat }
        longitude: { _gte: $min_lng, _lte: $max_lng }
      }
      order_by: { gap_confidence: desc }
      limit: $limit
    ) {
      id
      latitude
      longitude
      gap_confidence
      gap_distance_m
      tower_a_id
      tower_b_id
      tower_a_lat
      tower_a_lng
      tower_b_lat
      tower_b_lng
    }
  }
`;

export const MISSING_LINKS_IN_BOUNDS = gql`
  query MissingLinksInBounds(
    $model_version: String!
    $min_lat: float8!
    $max_lat: float8!
    $min_lng: float8!
    $max_lng: float8!
    $min_probability: float8!
    $limit: Int!
  ) {
    predicted_missing_links(
      where: {
        model_version: { _eq: $model_version }
        link_probability: { _gte: $min_probability }
        _or: [
          {
            src_lat: { _gte: $min_lat, _lte: $max_lat }
            src_lng: { _gte: $min_lng, _lte: $max_lng }
          }
          {
            dst_lat: { _gte: $min_lat, _lte: $max_lat }
            dst_lng: { _gte: $min_lng, _lte: $max_lng }
          }
        ]
      }
      order_by: { link_probability: desc }
      limit: $limit
    ) {
      id
      src_tower_id
      dst_tower_id
      src_lat
      src_lng
      dst_lat
      dst_lng
      distance_m
      link_probability
    }
  }
`;

// ============================================================
// GNN Lead Generation Queries (EXP-002+)
// ============================================================

// Get lead statistics summary
export const LEAD_STATS = gql`
  query LeadStats($carrier: String, $run_id: String) {
    gnn_leads_aggregate(where: {
      _and: [
        { carrier: { _eq: $carrier } },
        { run_id: { _eq: $run_id } }
      ]
    }) {
      aggregate {
        count
        sum { population estimated_users }
        avg { confidence priority_score nearest_tower_distance_m }
      }
    }
    critical: gnn_leads_aggregate(where: {
      priority: { _eq: "CRITICAL" }
      carrier: { _eq: $carrier }
      run_id: { _eq: $run_id }
    }) {
      aggregate { count }
    }
    high: gnn_leads_aggregate(where: {
      priority: { _eq: "HIGH" }
      carrier: { _eq: $carrier }
      run_id: { _eq: $run_id }
    }) {
      aggregate { count }
    }
    new_leads: gnn_leads_aggregate(where: {
      status: { _eq: "new" }
      carrier: { _eq: $carrier }
      run_id: { _eq: $run_id }
    }) {
      aggregate { count }
    }
    approved: gnn_leads_aggregate(where: {
      status: { _eq: "approved" }
      carrier: { _eq: $carrier }
      run_id: { _eq: $run_id }
    }) {
      aggregate { count }
    }
  }
`;

// Get lead counts by type
export const LEAD_STATS_BY_TYPE = gql`
  query LeadStatsByType($carrier: String, $run_id: String) {
    coverage_gap: gnn_leads_aggregate(where: {
      lead_type: { _eq: "coverage_gap" }
      carrier: { _eq: $carrier }
      run_id: { _eq: $run_id }
    }) {
      aggregate { count sum { population } avg { confidence } }
    }
    competitor_gap: gnn_leads_aggregate(where: {
      lead_type: { _eq: "competitor_gap" }
      carrier: { _eq: $carrier }
      run_id: { _eq: $run_id }
    }) {
      aggregate { count sum { population } avg { confidence } }
    }
    technology_gap: gnn_leads_aggregate(where: {
      lead_type: { _eq: "technology_gap" }
      carrier: { _eq: $carrier }
      run_id: { _eq: $run_id }
    }) {
      aggregate { count avg { confidence } }
    }
    densification: gnn_leads_aggregate(where: {
      lead_type: { _eq: "densification" }
      carrier: { _eq: $carrier }
      run_id: { _eq: $run_id }
    }) {
      aggregate { count sum { population } avg { confidence } }
    }
    backhaul_upgrade: gnn_leads_aggregate(where: {
      lead_type: { _eq: "backhaul_upgrade" }
      carrier: { _eq: $carrier }
      run_id: { _eq: $run_id }
    }) {
      aggregate { count avg { confidence } }
    }
    gnn_anomaly: gnn_leads_aggregate(where: {
      lead_type: { _eq: "gnn_anomaly" }
      carrier: { _eq: $carrier }
      run_id: { _eq: $run_id }
    }) {
      aggregate { count avg { confidence } }
    }
  }
`;

// Get available lead run versions
export const LEAD_VERSIONS = gql`
  query LeadVersions {
    gnn_leads(
      distinct_on: [run_id, carrier]
      order_by: [{ run_id: desc }, { carrier: asc }, { created_at: desc }]
      where: { run_id: { _is_null: false } }
    ) {
      run_id
      carrier
      model_version
      created_at
    }
  }
`;

// Get model runs
export const MODEL_RUNS = gql`
  query ModelRuns($carrier: String, $limit: Int = 20) {
    gnn_model_runs(
      where: { carrier: { _eq: $carrier } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      run_id
      experiment_name
      model_version
      carrier
      val_loss
      val_accuracy
      best_epoch
      num_nodes
      num_edges
      status
      created_at
    }
  }
`;

// Get top leads by priority score
export const TOP_LEADS = gql`
  query TopLeads(
    $carrier: String
    $run_id: String
    $lead_type: String
    $min_priority: String = "LOW"
    $limit: Int = 50
  ) {
    gnn_leads(
      where: {
        carrier: { _eq: $carrier }
        run_id: { _eq: $run_id }
        lead_type: { _eq: $lead_type }
        priority: { _in: ["CRITICAL", "HIGH", "MEDIUM"] }
      }
      order_by: { priority_score: desc }
      limit: $limit
    ) {
      id
      lead_id
      lead_type
      priority
      priority_score
      carrier
      latitude
      longitude
      h3_index
      population
      population_density
      area_type
      estimated_users
      nearest_tower_distance_m
      coverage_score
      confidence
      competitor_towers
      tower_id
      recommendation
      status
      created_at
    }
  }
`;

// Get leads within map bounds
export const LEADS_IN_BOUNDS = gql`
  query LeadsInBounds(
    $min_lat: Float!
    $max_lat: Float!
    $min_lng: Float!
    $max_lng: Float!
    $carrier: String
    $run_id: String
    $lead_type: String
    $min_confidence: Float = 0.5
    $limit: Int = 500
  ) {
    gnn_leads(
      where: {
        latitude: { _gte: $min_lat, _lte: $max_lat }
        longitude: { _gte: $min_lng, _lte: $max_lng }
        carrier: { _eq: $carrier }
        run_id: { _eq: $run_id }
        lead_type: { _eq: $lead_type }
        confidence: { _gte: $min_confidence }
      }
      order_by: { priority_score: desc }
      limit: $limit
    ) {
      id
      lead_id
      lead_type
      priority
      priority_score
      carrier
      latitude
      longitude
      population
      confidence
      recommendation
      status
      tower_id
    }
  }
`;

// Get a single lead with full details
export const LEAD_DETAILS = gql`
  query LeadDetails($lead_id: String!) {
    gnn_leads(where: { lead_id: { _eq: $lead_id } }) {
      id
      lead_id
      lead_type
      priority
      priority_score
      carrier
      latitude
      longitude
      h3_index
      population
      population_density
      area_type
      estimated_users
      nearest_tower_distance_m
      coverage_score
      confidence
      competitor_towers
      tower_id
      nearby_tower_ids
      recommendation
      model_version
      run_id
      status
      assigned_to
      reviewed_at
      reviewed_by
      review_notes
      created_at
      updated_at
      tower {
        id
        latitude
        longitude
        tower_type
        provider_count
        endc_available
        tower_providers {
          rat
          provider {
            name
          }
        }
      }
    }
    gnn_lead_comments(
      where: { lead_id: { _eq: $lead_id } }
      order_by: { created_at: desc }
    ) {
      id
      comment_text
      comment_type
      created_by
      created_at
    }
    gnn_lead_history(
      where: { lead_id: { _eq: $lead_id } }
      order_by: { changed_at: desc }
    ) {
      id
      field_name
      old_value
      new_value
      changed_by
      changed_at
      change_reason
    }
  }
`;

// Get leads by status (for workflow management)
export const LEADS_BY_STATUS = gql`
  query LeadsByStatus($status: String!, $carrier: String, $limit: Int = 100) {
    gnn_leads(
      where: {
        status: { _eq: $status }
        carrier: { _eq: $carrier }
      }
      order_by: { priority_score: desc }
      limit: $limit
    ) {
      id
      lead_id
      lead_type
      priority
      priority_score
      carrier
      latitude
      longitude
      population
      confidence
      recommendation
      assigned_to
      created_at
    }
  }
`;

// Lead type summary (for dashboard cards)
export const LEAD_TYPE_SUMMARY = gql`
  query LeadTypeSummary($carrier: String, $run_id: String) {
    gnn_lead_type_summary(
      where: {
        carrier: { _eq: $carrier }
      }
      order_by: { total_leads: desc }
    ) {
      lead_type
      carrier
      total_leads
      critical_count
      high_count
      medium_count
      low_count
      new_count
      approved_count
      avg_confidence
      max_priority_score
    }
  }
`;

// Lead clusters for map visualization at low zoom
export const LEAD_CLUSTERS = gql`
  query LeadClusters($carrier: String) {
    gnn_lead_clusters(
      where: { carrier: { _eq: $carrier } }
      order_by: { lead_count: desc }
    ) {
      lat_bucket
      lng_bucket
      carrier
      lead_count
      high_priority_count
      lead_types
      center_lat
      center_lng
      total_population
    }
  }
`;

// Enhanced anomaly query with EXP-002 features
export const ENHANCED_ANOMALY_STATS = gql`
  query EnhancedAnomalyStats($model_version: String!, $carrier: String) {
    tower_anomaly_scores_aggregate(where: {
      model_version: { _eq: $model_version }
    }) {
      aggregate {
        count
        avg { anomaly_score band_coverage_score sector_per_band_ratio }
      }
    }
    single_band: tower_anomaly_scores_aggregate(where: {
      model_version: { _eq: $model_version }
      is_single_band: { _eq: true }
    }) {
      aggregate { count }
    }
    low_sector: tower_anomaly_scores_aggregate(where: {
      model_version: { _eq: $model_version }
      is_low_sector_macro: { _eq: true }
    }) {
      aggregate { count }
    }
    omni_pattern: tower_anomaly_scores_aggregate(where: {
      model_version: { _eq: $model_version }
      is_omni_pattern: { _eq: true }
    }) {
      aggregate { count }
    }
    missing_primary: tower_anomaly_scores_aggregate(where: {
      model_version: { _eq: $model_version }
      is_missing_carrier_primary: { _eq: true }
    }) {
      aggregate { count }
    }
    high_band_only: tower_anomaly_scores_aggregate(where: {
      model_version: { _eq: $model_version }
      is_high_band_only: { _eq: true }
    }) {
      aggregate { count }
    }
  }
`;

// Mutation to update lead status
export const UPDATE_LEAD_STATUS = gql`
  mutation UpdateLeadStatus($lead_id: String!, $status: String!) {
    update_gnn_leads(
      where: { lead_id: { _eq: $lead_id } }
      _set: { status: $status, updated_at: "now()" }
    ) {
      affected_rows
      returning {
        lead_id
        status
        updated_at
      }
    }
  }
`;

// Mutation to assign lead
export const ASSIGN_LEAD = gql`
  mutation AssignLead($lead_id: String!, $assigned_to: String!) {
    update_gnn_leads(
      where: { lead_id: { _eq: $lead_id } }
      _set: { assigned_to: $assigned_to, updated_at: "now()" }
    ) {
      affected_rows
      returning {
        lead_id
        assigned_to
      }
    }
  }
`;

// Mutation to add lead comment
export const ADD_LEAD_COMMENT = gql`
  mutation AddLeadComment(
    $lead_id: String!
    $comment_text: String!
    $comment_type: String!
    $created_by: String!
  ) {
    insert_gnn_lead_comments_one(object: {
      lead_id: $lead_id
      comment_text: $comment_text
      comment_type: $comment_type
      created_by: $created_by
    }) {
      id
      lead_id
      comment_text
      created_at
    }
  }
`;

// ============================================================
// H3 Grid Queries (Precomputed Tower Density)
// ============================================================

// H3 resolution 4 (~22km hexagons) - for zoom 4-6
export const H3_GRID_RES4 = gql`
  query H3GridRes4($min_lat: float8!, $max_lat: float8!, $min_lng: float8!, $max_lng: float8!) {
    tower_h3_res4(
      where: {
        center_lat: { _gte: $min_lat, _lte: $max_lat }
        center_lng: { _gte: $min_lng, _lte: $max_lng }
      }
    ) {
      h3_index
      tower_count
      lte_count
      nr_count
      endc_count
      center_lat
      center_lng
    }
  }
`;

// H3 resolution 5 (~8km hexagons) - for zoom 6-8
export const H3_GRID_RES5 = gql`
  query H3GridRes5($min_lat: float8!, $max_lat: float8!, $min_lng: float8!, $max_lng: float8!) {
    tower_h3_res5(
      where: {
        center_lat: { _gte: $min_lat, _lte: $max_lat }
        center_lng: { _gte: $min_lng, _lte: $max_lng }
      }
    ) {
      h3_index
      tower_count
      lte_count
      nr_count
      endc_count
      center_lat
      center_lng
    }
  }
`;

// H3 resolution 6 (~3.2km hexagons) - for zoom 8-10
export const H3_GRID_RES6 = gql`
  query H3GridRes6($min_lat: float8!, $max_lat: float8!, $min_lng: float8!, $max_lng: float8!) {
    tower_h3_res6(
      where: {
        center_lat: { _gte: $min_lat, _lte: $max_lat }
        center_lng: { _gte: $min_lng, _lte: $max_lng }
      }
    ) {
      h3_index
      tower_count
      lte_count
      nr_count
      endc_count
      center_lat
      center_lng
    }
  }
`;

// H3 resolution 7 (~1.2km hexagons) - for zoom 10+
export const H3_GRID_RES7 = gql`
  query H3GridRes7($min_lat: float8!, $max_lat: float8!, $min_lng: float8!, $max_lng: float8!) {
    tower_h3_res7(
      where: {
        center_lat: { _gte: $min_lat, _lte: $max_lat }
        center_lng: { _gte: $min_lng, _lte: $max_lng }
      }
    ) {
      h3_index
      tower_count
      lte_count
      nr_count
      endc_count
      center_lat
      center_lng
    }
  }
`;

// =============================================================================
// COMPANY-SPECIFIC QUERIES (for acd-client-dashboard multi-tenant access)
// =============================================================================

// Get tower details by ID, filtered by company
export const GET_TOWER_DETAILS = gql`
  query GetTowerDetails($towerId: Int!, $companyId: uuid!) {
    company_towers(
      where: {
        tower_id: { _eq: $towerId }
        company_id: { _eq: $companyId }
      }
    ) {
      id
      tower_id
      access_state
      tower {
        id
        latitude
        longitude
        tower_type
        first_seen_at
        last_seen_at
        tower_site {
          id
          address
          city
          state
          county
          zip_code
          carrier
          status
          remarks
          google_maps_url
          entity {
            id
            name
            entity_type
            mail_address
            mail_city
            mail_state
            mail_zip
          }
        }
        tower_providers {
          id
          rat
          endc_available
          provider {
            id
            name
            country_id
            provider_id
          }
        }
      }
    }
  }
`;

// Get entity contacts by entity ID
export const GET_ENTITY_CONTACTS = gql`
  query GetEntityContacts($entityId: uuid!) {
    entity_contacts(
      where: { entity_id: { _eq: $entityId } }
      order_by: { contact_order: asc }
    ) {
      id
      contact_order
      first_name
      last_name
      full_name
      title
      phone_primary
      phone_primary_dnc
      phone_secondary
      email_primary
      email_secondary
    }
  }
`;

// Company analytics data
export const COMPANY_ANALYTICS_DATA = gql`
  query CompanyAnalyticsData($companyId: uuid!) {
    company_towers(where: { company_id: { _eq: $companyId } }) {
      id
      access_state
      tower {
        id
        tower_type
        tower_site {
          carrier
        }
      }
    }
  }
`;

// Company dashboard stats
export const COMPANY_DASHBOARD_STATS = gql`
  query CompanyDashboardStats($companyId: uuid!) {
    towers: company_towers_aggregate(where: { company_id: { _eq: $companyId } }) {
      aggregate {
        count
      }
    }
    lte: company_towers_aggregate(
      where: {
        company_id: { _eq: $companyId }
        tower: { tower_providers: { rat: { _eq: "LTE" } } }
      }
    ) {
      aggregate {
        count
      }
    }
    nr: company_towers_aggregate(
      where: {
        company_id: { _eq: $companyId }
        tower: { tower_providers: { rat: { _eq: "NR" } } }
      }
    ) {
      aggregate {
        count
      }
    }
    endc: company_towers_aggregate(
      where: {
        company_id: { _eq: $companyId }
        tower: { tower_providers: { endc_available: { _eq: true } } }
      }
    ) {
      aggregate {
        count
      }
    }
    entities: entities_aggregate(where: { company_id: { _eq: $companyId } }) {
      aggregate {
        count
      }
    }
  }
`;

// Company towers by type
export const COMPANY_TOWERS_BY_TYPE = gql`
  query CompanyTowersByType($companyId: uuid!) {
    macro: company_towers_aggregate(
      where: {
        company_id: { _eq: $companyId }
        tower: { tower_type: { _eq: "MACRO" } }
      }
    ) {
      aggregate {
        count
      }
    }
    micro: company_towers_aggregate(
      where: {
        company_id: { _eq: $companyId }
        tower: { tower_type: { _eq: "MICRO" } }
      }
    ) {
      aggregate {
        count
      }
    }
    pico: company_towers_aggregate(
      where: {
        company_id: { _eq: $companyId }
        tower: { tower_type: { _eq: "PICO" } }
      }
    ) {
      aggregate {
        count
      }
    }
    das: company_towers_aggregate(
      where: {
        company_id: { _eq: $companyId }
        tower: { tower_type: { _eq: "DAS" } }
      }
    ) {
      aggregate {
        count
      }
    }
    cow: company_towers_aggregate(
      where: {
        company_id: { _eq: $companyId }
        tower: { tower_type: { _eq: "COW" } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// Company provider stats
export const COMPANY_PROVIDER_STATS = gql`
  query CompanyProviderStats($companyId: uuid!) {
    providers {
      id
      country_id
      provider_id
      name
      tower_providers_aggregate(
        where: { tower: { company_towers: { company_id: { _eq: $companyId } } } }
      ) {
        aggregate {
          count
        }
      }
      macro_towers: tower_providers_aggregate(
        where: {
          tower: {
            company_towers: { company_id: { _eq: $companyId } }
            tower_type: { _eq: "MACRO" }
          }
        }
      ) {
        aggregate {
          count
        }
      }
      micro_towers: tower_providers_aggregate(
        where: {
          tower: {
            company_towers: { company_id: { _eq: $companyId } }
            tower_type: { _eq: "MICRO" }
          }
        }
      ) {
        aggregate {
          count
        }
      }
      pico_towers: tower_providers_aggregate(
        where: {
          tower: {
            company_towers: { company_id: { _eq: $companyId } }
            tower_type: { _eq: "PICO" }
          }
        }
      ) {
        aggregate {
          count
        }
      }
      das_towers: tower_providers_aggregate(
        where: {
          tower: {
            company_towers: { company_id: { _eq: $companyId } }
            tower_type: { _eq: "DAS" }
          }
        }
      ) {
        aggregate {
          count
        }
      }
      cow_towers: tower_providers_aggregate(
        where: {
          tower: {
            company_towers: { company_id: { _eq: $companyId } }
            tower_type: { _eq: "COW" }
          }
        }
      ) {
        aggregate {
          count
        }
      }
    }
  }
`;

// Filter options for the company
export const GET_FILTER_OPTIONS = gql`
  query GetFilterOptions($companyId: uuid!) {
    carriers: company_towers(
      where: { company_id: { _eq: $companyId } }
      distinct_on: [tower_id]
    ) {
      tower {
        tower_site {
          carrier
        }
      }
    }
    entities(where: { company_id: { _eq: $companyId } }) {
      id
      name
      tower_sites_aggregate {
        aggregate {
          count
        }
      }
    }
    entity_contacts(where: { entity: { company_id: { _eq: $companyId } } }) {
      id
      first_name
      last_name
      full_name
      entity {
        id
        name
      }
    }
    states: company_towers(
      where: { company_id: { _eq: $companyId } }
      distinct_on: [tower_id]
    ) {
      tower {
        tower_site {
          state
        }
      }
    }
    counties: company_towers(
      where: { company_id: { _eq: $companyId } }
      distinct_on: [tower_id]
    ) {
      tower {
        tower_site {
          county
        }
      }
    }
  }
`;

// Tenant distribution (towers by number of carriers)
export const TENANT_DISTRIBUTION = gql`
  query TenantDistribution($companyId: uuid!) {
    single_tenant: company_towers_aggregate(
      where: {
        company_id: { _eq: $companyId }
        tower: { provider_count: { _eq: 1 } }
      }
    ) {
      aggregate {
        count
      }
    }
    two_tenants: company_towers_aggregate(
      where: {
        company_id: { _eq: $companyId }
        tower: { provider_count: { _eq: 2 } }
      }
    ) {
      aggregate {
        count
      }
    }
    three_tenants: company_towers_aggregate(
      where: {
        company_id: { _eq: $companyId }
        tower: { provider_count: { _eq: 3 } }
      }
    ) {
      aggregate {
        count
      }
    }
    four_plus_tenants: company_towers_aggregate(
      where: {
        company_id: { _eq: $companyId }
        tower: { provider_count: { _gte: 4 } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// Geographic distribution
export const GEOGRAPHIC_DISTRIBUTION = gql`
  query GeographicDistribution($companyId: uuid!) {
    company_towers(where: { company_id: { _eq: $companyId } }) {
      tower {
        tower_site {
          state
          county
        }
      }
    }
  }
`;
