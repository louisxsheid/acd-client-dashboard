-- Migration: 001_client_system.sql
-- Description: Add client system tables for multi-tenant access and tower contact information
-- Note: This assumes base ACD schema (towers, providers, cells, etc.) is already loaded

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- ENTITIES TABLE (Normalized Owner/Company Information)
-- ============================================
CREATE TABLE IF NOT EXISTS public.entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    entity_type VARCHAR(100),
    mail_address VARCHAR(500),
    mail_city VARCHAR(100),
    mail_state VARCHAR(50),
    mail_zip VARCHAR(20),
    mail_country VARCHAR(100) DEFAULT 'USA',
    source VARCHAR(100),
    external_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_name_trgm ON entities USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_external_id ON entities(external_id);

COMMENT ON TABLE entities IS 'Normalized table of property owners/entities';

-- ============================================
-- ENTITY CONTACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.entity_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    contact_order INTEGER DEFAULT 1,
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(300),
    title VARCHAR(200),
    phone_primary VARCHAR(50),
    phone_primary_dnc BOOLEAN DEFAULT FALSE,
    phone_secondary VARCHAR(50),
    phone_secondary_dnc BOOLEAN DEFAULT FALSE,
    email_primary VARCHAR(255),
    email_primary_verified BOOLEAN,
    email_secondary VARCHAR(255),
    email_secondary_verified BOOLEAN,
    preferred_contact_method VARCHAR(50),
    best_time_to_contact VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    source VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_contacts_entity_id ON entity_contacts(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_contacts_email ON entity_contacts(email_primary);
CREATE INDEX IF NOT EXISTS idx_entity_contacts_name ON entity_contacts(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_entity_contacts_order ON entity_contacts(entity_id, contact_order);
CREATE INDEX IF NOT EXISTS idx_entity_contacts_fullname_trgm ON entity_contacts USING GIN (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_entity_contacts_email_trgm ON entity_contacts USING GIN (email_primary gin_trgm_ops);

COMMENT ON TABLE entity_contacts IS 'Contact information for entity owners/managers';

-- ============================================
-- TOWER SITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.tower_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tower_id INTEGER NOT NULL REFERENCES towers(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    site_id VARCHAR(100),
    google_maps_url TEXT,
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    county VARCHAR(100),
    country VARCHAR(100) DEFAULT 'USA',
    tower_type VARCHAR(100),
    status VARCHAR(50),
    carrier VARCHAR(100),
    imagery_url TEXT,
    remarks TEXT,
    source VARCHAR(100),
    source_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tower_id)
);

CREATE INDEX IF NOT EXISTS idx_tower_sites_tower_id ON tower_sites(tower_id);
CREATE INDEX IF NOT EXISTS idx_tower_sites_entity_id ON tower_sites(entity_id);
CREATE INDEX IF NOT EXISTS idx_tower_sites_site_id ON tower_sites(site_id);
CREATE INDEX IF NOT EXISTS idx_tower_sites_city_state ON tower_sites(city, state);
CREATE INDEX IF NOT EXISTS idx_tower_sites_zip ON tower_sites(zip_code);
CREATE INDEX IF NOT EXISTS idx_tower_sites_carrier ON tower_sites(carrier);
CREATE INDEX IF NOT EXISTS idx_tower_sites_address_trgm ON tower_sites USING GIN (address gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tower_sites_city_trgm ON tower_sites USING GIN (city gin_trgm_ops);

COMMENT ON TABLE tower_sites IS 'Site/location information linking towers to addresses and owners';

-- ============================================
-- COMPANIES TABLE (Client Companies)
-- ============================================
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    logo_url VARCHAR(500),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

COMMENT ON TABLE companies IS 'Client companies that have access to tower data';

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'viewer',
    avatar_url VARCHAR(500),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

COMMENT ON TABLE users IS 'Client users belonging to companies';

-- ============================================
-- API KEYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '{}',
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER DEFAULT 10000,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_company_id ON api_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

COMMENT ON TABLE api_keys IS 'API keys for programmatic access';

-- ============================================
-- COMPANY TOWERS JOIN TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_towers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tower_id INTEGER NOT NULL REFERENCES towers(id) ON DELETE CASCADE,
    access_state VARCHAR(50) NOT NULL DEFAULT 'SAMPLE',
    granted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, tower_id)
);

CREATE INDEX IF NOT EXISTS idx_company_towers_company_id ON company_towers(company_id);
CREATE INDEX IF NOT EXISTS idx_company_towers_tower_id ON company_towers(tower_id);
CREATE INDEX IF NOT EXISTS idx_company_towers_access_state ON company_towers(access_state);
CREATE INDEX IF NOT EXISTS idx_company_towers_expires_at ON company_towers(expires_at);

COMMENT ON TABLE company_towers IS 'Join table controlling which towers each company can access';
COMMENT ON COLUMN company_towers.access_state IS 'SAMPLE, TRIAL, LICENSED, FULL';

-- ============================================
-- AUTH SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(session_token);

-- ============================================
-- AUTH VERIFICATION TOKENS
-- ============================================
CREATE TABLE IF NOT EXISTS public.auth_verification_tokens (
    identifier VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- ============================================
-- HELPER FUNCTION: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at on new client tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'entities', 'entity_contacts', 'tower_sites',
        'companies', 'users', 'api_keys', 'company_towers'
    ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at
                BEFORE UPDATE ON %s
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- ============================================
-- SEED DATA: Test Company and User
-- ============================================
-- Password: test123 (bcrypt hash with 12 rounds)
INSERT INTO companies (id, name, slug, contact_email, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Company', 'test-company', 'contact@testcompany.com', 'active')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (id, company_id, email, password_hash, name, role, email_verified, status)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'test@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G9bhnqMQZCHqXi',  -- test123
    'Test User',
    'admin',
    true,
    'active'
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name;

-- ============================================
-- SEED DATA: Sample Entities and Contacts
-- ============================================
INSERT INTO entities (id, name, entity_type, mail_city, mail_state) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Crown Castle International', 'REIT', 'Houston', 'TX'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'American Tower Corporation', 'REIT', 'Boston', 'MA'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'SBA Communications', 'REIT', 'Boca Raton', 'FL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO entity_contacts (entity_id, contact_order, first_name, last_name, full_name, title, phone_primary, email_primary) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 'John', 'Smith', 'John Smith', 'Property Manager', '555-123-4567', 'jsmith@crowncastle.com'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, 'Jane', 'Doe', 'Jane Doe', 'Leasing Coordinator', '555-234-5678', 'jdoe@crowncastle.com'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 'Bob', 'Johnson', 'Bob Johnson', 'Site Manager', '555-345-6789', 'bjohnson@americantower.com')
ON CONFLICT DO NOTHING;

-- Note: No seed tower data - database starts empty
-- Tower sites and company_towers will be populated when data is imported

SELECT 'Client system migration complete! Test user: test@example.com / test123' as status;
