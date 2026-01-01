-- Migration: 003_zoning_links.sql
-- Description: Add telecom ordinance links and fix zoning code links
-- Date: 2026-01-01

-- ============================================
-- STEP 1: Add telecom_ordinance_link column
-- ============================================
ALTER TABLE tower_sites
ADD COLUMN IF NOT EXISTS telecom_ordinance_link TEXT;

COMMENT ON COLUMN tower_sites.telecom_ordinance_link IS
    'Direct link to wireless/telecommunications ordinance section (primary link)';

-- ============================================
-- STEP 2: Populate telecom ordinance links (curated by city)
-- ============================================

-- Fort Worth (23 sites) - Zoning Ordinance § 5.137 Telecommunications Tower
UPDATE tower_sites
SET telecom_ordinance_link = 'https://codelibrary.amlegal.com/codes/ftworth/latest/ftworth_tx/0-0-0-37312'
WHERE LOWER(city) = 'fort worth' AND state = 'TX';

-- Arlington (14 sites) - City UDC (full PDF document)
UPDATE tower_sites
SET telecom_ordinance_link = 'https://www.arlingtontx.gov/files/assets/city/v/5/city-secretary/documents/city-code-of-ordinances/unified-development-code-chapter.pdf'
WHERE LOWER(city) = 'arlington' AND state = 'TX';

-- North Richland Hills (2 sites) - Municode
UPDATE tower_sites
SET telecom_ordinance_link = 'https://library.municode.com/tx/north_richland_hills/codes/code_of_ordinances'
WHERE LOWER(city) = 'north richland hills' AND state = 'TX';

-- Watauga (2 sites) - Municode
UPDATE tower_sites
SET telecom_ordinance_link = 'https://library.municode.com/tx/watauga/codes/code_of_ordinances'
WHERE LOWER(city) = 'watauga' AND state = 'TX';

-- Colleyville (1 site) - Municode
UPDATE tower_sites
SET telecom_ordinance_link = 'https://library.municode.com/tx/colleyville/codes/code_of_ordinances'
WHERE LOWER(city) = 'colleyville' AND state = 'TX';

-- Kennedale (1 site) - Municode
UPDATE tower_sites
SET telecom_ordinance_link = 'https://library.municode.com/tx/kennedale/codes/code_of_ordinances'
WHERE LOWER(city) = 'kennedale' AND state = 'TX';

-- Mansfield (1 site) - Municode
UPDATE tower_sites
SET telecom_ordinance_link = 'https://library.municode.com/tx/mansfield/codes/code_of_ordinances'
WHERE LOWER(city) = 'mansfield' AND state = 'TX';

-- Haltom City (1 site) - Municode
UPDATE tower_sites
SET telecom_ordinance_link = 'https://library.municode.com/tx/haltom_city/codes/code_of_ordinances'
WHERE LOWER(city) = 'haltom city' AND state = 'TX';

-- Richland Hills (1 site) - Municode
UPDATE tower_sites
SET telecom_ordinance_link = 'https://library.municode.com/tx/richland_hills/codes/code_of_ordinances'
WHERE LOWER(city) = 'richland hills' AND state = 'TX';

-- Burleson (1 site) - Municode
UPDATE tower_sites
SET telecom_ordinance_link = 'https://library.municode.com/tx/burleson/codes/code_of_ordinances'
WHERE LOWER(city) = 'burleson' AND state = 'TX';

-- ============================================
-- STEP 3: Fix/Generate Zoneomics backup links
-- ============================================

-- Fix incorrect city references and generate missing links
-- Uses Zoneomics URL pattern: https://www.zoneomics.com/code/{city-slug}-{state}
UPDATE tower_sites
SET zoning_code_link = CONCAT(
    'https://www.zoneomics.com/code/',
    LOWER(REPLACE(TRIM(city), ' ', '-')),
    '-',
    state
)
WHERE city IS NOT NULL
    AND TRIM(city) != ''
    AND state IS NOT NULL
    AND TRIM(state) != '';

-- ============================================
-- VERIFICATION QUERIES (for manual review)
-- ============================================
-- Run these to verify the updates:
--
-- SELECT city, state, COUNT(*) as sites,
--        MAX(telecom_ordinance_link) as telecom_link,
--        MAX(zoning_code_link) as zoning_link
-- FROM tower_sites
-- WHERE city IS NOT NULL AND city != ''
-- GROUP BY city, state
-- ORDER BY COUNT(*) DESC;
