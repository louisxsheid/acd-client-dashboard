-- Migration: 004_zoning_ordinances.sql
-- Description: Create zoning_ordinances table for internal hosting of legal text
-- Date: 2026-01-01

-- ============================================
-- STEP 1: Create zoning_ordinances table
-- ============================================
CREATE TABLE IF NOT EXISTS zoning_ordinances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(500),
    ordinance_text TEXT NOT NULL,
    source_url TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(city, state)
);

CREATE INDEX IF NOT EXISTS idx_zoning_ordinances_slug ON zoning_ordinances(slug);
CREATE INDEX IF NOT EXISTS idx_zoning_ordinances_city_state ON zoning_ordinances(city, state);

COMMENT ON TABLE zoning_ordinances IS 'Telecommunications zoning ordinance text for internal display';

-- ============================================
-- STEP 2: Seed initial data
-- ============================================

-- Fort Worth, TX - § 5.137 Telecommunications Tower
INSERT INTO zoning_ordinances (city, state, slug, title, ordinance_text, source_url)
VALUES (
    'Fort Worth', 'TX', 'fort-worth-tx',
    '§ 5.137 Telecommunications Tower and Stealth Telecommunication Tower',
    E'## § 5.137 TELECOMMUNICATIONS TOWER AND STEALTH TELECOMMUNICATION TOWER

### (A) Construction Requirements
All new telecommunication towers must be constructed to support at least two separate antenna arrays.

In addition, any new telecommunication tower must be able to support at least one additional antenna for every 15 feet (or fraction thereof) above 60 feet in height and provide the ground space for any equipment necessary for the operation of additional antenna.

### (B) Lighting Requirements
Any lighting shall be shielded or directed so as not to project directly onto property zoned residential or any residential use.

When incorporated into the approved design, light fixtures used to illuminate ball fields, parking lots or other similar areas may be attached to a telecommunication tower.

### (C) Screening, Fencing and Landscaping Requirements
All telecommunications towers and support facilities shall have a six-foot solid screening fence constructed of wood, brick, stone or reinforced concrete products per the specifications of § 5.305, Fences of the zoning ordinance.

Telecommunications towers and support facilities shall be surrounded by a security fence.

### (D) Abandonment/Removal Requirements
The person who constructed the facility, the person who operates the facility or owner of record must notify the planning and development department of any change in the status of the telecommunication tower.

If the use of the antennas on the telecommunication tower has not been restored within the one year period from the time the facilities have ceased being used to transmit, receive or relay voice and data signals to or from wireless communication devices, the telecommunication tower must be removed and the telecommunication tower site restored to its original condition to a depth of two feet, at the owner''s expense.

### (E) Application Fees
Notwithstanding any other provision of this ordinance, the city may require, as part of any application fees for a telecommunication facility, an amount sufficient to recover all of the city''s costs in retaining consultants to verify statements made in conjunction with the permit application.

---

*Source: City of Fort Worth Zoning Ordinance, Appendix A*',
    'https://codelibrary.amlegal.com/codes/ftworth/latest/ftworth_tx/0-0-0-37312'
) ON CONFLICT (city, state) DO UPDATE SET
    title = EXCLUDED.title,
    ordinance_text = EXCLUDED.ordinance_text,
    source_url = EXCLUDED.source_url,
    last_updated = NOW();

-- Arlington, TX - Unified Development Code excerpt
INSERT INTO zoning_ordinances (city, state, slug, title, ordinance_text, source_url)
VALUES (
    'Arlington', 'TX', 'arlington-tx',
    'Unified Development Code - Telecommunications Facilities',
    E'## Arlington Unified Development Code

### Telecommunications Facilities

The City of Arlington regulates telecommunications facilities through its Unified Development Code (UDC). The UDC consolidates all development-related regulations including zoning and land use, subdivisions, design and development standards, and review procedures.

For specific regulations regarding wireless facilities, antenna towers, and telecommunications infrastructure, please consult the full UDC document.

### Contact Information
- Planning & Development Services: 817-459-6502
- Email: udc@arlingtontx.gov

---

*Source: City of Arlington Unified Development Code*',
    'https://www.arlingtontx.gov/files/assets/city/v/5/city-secretary/documents/city-code-of-ordinances/unified-development-code-chapter.pdf'
) ON CONFLICT (city, state) DO UPDATE SET
    title = EXCLUDED.title,
    ordinance_text = EXCLUDED.ordinance_text,
    source_url = EXCLUDED.source_url,
    last_updated = NOW();

-- Placeholder entries for other cities (to be populated with full text)
INSERT INTO zoning_ordinances (city, state, slug, title, ordinance_text, source_url)
VALUES
    ('North Richland Hills', 'TX', 'north-richland-hills-tx',
     'Code of Ordinances - Telecommunications',
     'Telecommunications regulations for North Richland Hills. Full text pending.',
     'https://library.municode.com/tx/north_richland_hills/codes/code_of_ordinances'),
    ('Watauga', 'TX', 'watauga-tx',
     'Code of Ordinances - Telecommunications',
     'Telecommunications regulations for Watauga. Full text pending.',
     'https://library.municode.com/tx/watauga/codes/code_of_ordinances'),
    ('Colleyville', 'TX', 'colleyville-tx',
     'Code of Ordinances - Telecommunications',
     'Telecommunications regulations for Colleyville. Full text pending.',
     'https://library.municode.com/tx/colleyville/codes/code_of_ordinances'),
    ('Kennedale', 'TX', 'kennedale-tx',
     'Code of Ordinances - Telecommunications',
     'Telecommunications regulations for Kennedale. Full text pending.',
     'https://library.municode.com/tx/kennedale/codes/code_of_ordinances'),
    ('Mansfield', 'TX', 'mansfield-tx',
     'Code of Ordinances - Telecommunications',
     'Telecommunications regulations for Mansfield. Full text pending.',
     'https://library.municode.com/tx/mansfield/codes/code_of_ordinances'),
    ('Haltom City', 'TX', 'haltom-city-tx',
     'Code of Ordinances - Telecommunications',
     'Telecommunications regulations for Haltom City. Full text pending.',
     'https://library.municode.com/tx/haltom_city/codes/code_of_ordinances'),
    ('Richland Hills', 'TX', 'richland-hills-tx',
     'Code of Ordinances - Telecommunications',
     'Telecommunications regulations for Richland Hills. Full text pending.',
     'https://library.municode.com/tx/richland_hills/codes/code_of_ordinances'),
    ('Burleson', 'TX', 'burleson-tx',
     'Code of Ordinances - Telecommunications',
     'Telecommunications regulations for Burleson. Full text pending.',
     'https://library.municode.com/tx/burleson/codes/code_of_ordinances')
ON CONFLICT (city, state) DO NOTHING;
