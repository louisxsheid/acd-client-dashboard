-- Migration: 001_base_schema.sql
-- Description: Base ACD schema (tables only, no data)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- PROVIDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.providers (
    id integer NOT NULL PRIMARY KEY,
    country_id integer NOT NULL,
    provider_id integer NOT NULL,
    name character varying(255),
    visible boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- TOWERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.towers (
    id SERIAL PRIMARY KEY,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    location public.geometry(Point,4326) GENERATED ALWAYS AS (public.st_setsrid(public.st_makepoint(longitude, latitude), 4326)) STORED,
    tower_type character varying(50),
    first_seen_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    generator character varying(50),
    generator_time bigint,
    tower_mover_id character varying(50),
    contributors integer[],
    has_bandwidth_data boolean DEFAULT false,
    has_frequency_data boolean DEFAULT false,
    endc_available boolean DEFAULT false,
    provider_count integer DEFAULT 1,
    visible boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_towers_location ON towers USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_towers_type ON towers(tower_type);

-- ============================================
-- TOWER_PROVIDERS TABLE (join between towers and providers)
-- ============================================
CREATE TABLE IF NOT EXISTS public.tower_providers (
    id SERIAL PRIMARY KEY,
    tower_id integer NOT NULL REFERENCES towers(id) ON DELETE CASCADE,
    provider_id integer NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    external_id character varying(50),
    rat character varying(20),
    rat_subtype character varying(20),
    site_id character varying(50),
    region_id character varying(50),
    first_seen_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    tower_mover integer,
    has_bandwidth_data boolean DEFAULT false,
    has_frequency_data boolean DEFAULT false,
    endc_available boolean DEFAULT false,
    visible boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tower_providers_tower_id ON tower_providers(tower_id);
CREATE INDEX IF NOT EXISTS idx_tower_providers_provider_id ON tower_providers(provider_id);

-- ============================================
-- CELLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.cells (
    id SERIAL PRIMARY KEY,
    tower_id integer NOT NULL REFERENCES towers(id) ON DELETE CASCADE,
    provider_id integer REFERENCES providers(id),
    cell_id character varying(50) NOT NULL,
    pci integer,
    sector integer,
    bearing integer,
    bandwidth integer,
    signal integer,
    subsystem character varying(20),
    first_seen_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    lte_snr_max numeric,
    lte_rsrq_max numeric,
    max_speed_down_mbps numeric,
    avg_speed_down_mbps numeric,
    max_speed_up_mbps numeric,
    avg_speed_up_mbps numeric,
    endc_available boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_cells_tower_id ON cells(tower_id);
CREATE INDEX IF NOT EXISTS idx_cells_provider_id ON cells(provider_id);

-- ============================================
-- TOWER_BANDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.tower_bands (
    id SERIAL PRIMARY KEY,
    tower_id integer NOT NULL REFERENCES towers(id) ON DELETE CASCADE,
    provider_id integer REFERENCES providers(id),
    band_number integer NOT NULL,
    band_name character varying(100),
    channel integer,
    bandwidth integer,
    modulation character varying(20)
);

CREATE INDEX IF NOT EXISTS idx_tower_bands_tower_id ON tower_bands(tower_id);
CREATE INDEX IF NOT EXISTS idx_tower_bands_provider_id ON tower_bands(provider_id);

-- ============================================
-- COVERAGE_GAP_CANDIDATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.coverage_gap_candidates (
    id SERIAL PRIMARY KEY,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    gap_confidence double precision NOT NULL,
    gap_distance_m double precision NOT NULL,
    tower_a_id integer REFERENCES towers(id),
    tower_b_id integer REFERENCES towers(id),
    tower_a_lat double precision,
    tower_a_lng double precision,
    tower_b_lat double precision,
    tower_b_lng double precision,
    model_version character varying(100) NOT NULL,
    run_id character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    dense_anomaly_score double precision,
    provider_id integer REFERENCES providers(id)
);

-- ============================================
-- PREDICTED_MISSING_LINKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.predicted_missing_links (
    id SERIAL PRIMARY KEY,
    src_tower_id integer REFERENCES towers(id),
    dst_tower_id integer REFERENCES towers(id),
    src_lat double precision NOT NULL,
    src_lng double precision NOT NULL,
    dst_lat double precision NOT NULL,
    dst_lng double precision NOT NULL,
    distance_m double precision NOT NULL,
    link_probability double precision NOT NULL,
    model_version character varying(100) NOT NULL,
    run_id character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    provider_id integer REFERENCES providers(id)
);

-- ============================================
-- TOWER_ANOMALY_SCORES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.tower_anomaly_scores (
    id SERIAL PRIMARY KEY,
    tower_id integer NOT NULL REFERENCES towers(id) ON DELETE CASCADE,
    anomaly_score double precision NOT NULL,
    model_version character varying(100) NOT NULL,
    run_id character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    provider_id integer REFERENCES providers(id)
);

CREATE INDEX IF NOT EXISTS idx_tower_anomaly_scores_tower_id ON tower_anomaly_scores(tower_id);

SELECT 'Base schema created successfully' as status;
