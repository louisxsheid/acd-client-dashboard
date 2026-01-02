-- Populate entity_type based on entity name patterns
-- Run this in your PostgreSQL database

-- LLC
UPDATE entities SET entity_type = 'LLC'
WHERE entity_type IS NULL AND UPPER(name) LIKE '%LLC%';

-- Trust
UPDATE entities SET entity_type = 'Trust'
WHERE entity_type IS NULL AND UPPER(name) LIKE '%TRUST%';

-- Corporation (check for INC, CORP, CO.)
UPDATE entities SET entity_type = 'Corporation'
WHERE entity_type IS NULL AND (
    UPPER(name) LIKE '%CORP%' OR
    UPPER(name) LIKE '%INC%' OR
    UPPER(name) LIKE '% CO.%' OR
    UPPER(name) LIKE '%INCORPORATED%'
);

-- Partnership (LP, LLP, Partners)
UPDATE entities SET entity_type = 'Partnership'
WHERE entity_type IS NULL AND (
    UPPER(name) LIKE '% LP%' OR
    UPPER(name) LIKE '%LLP%' OR
    UPPER(name) LIKE '%PARTNER%'
);

-- Municipality (City of, County of, Town of, ISDs - public school districts)
UPDATE entities SET entity_type = 'Municipality'
WHERE entity_type IS NULL AND (
    UPPER(name) LIKE 'CITY OF%' OR
    UPPER(name) LIKE 'COUNTY OF%' OR
    UPPER(name) LIKE 'TOWN OF%' OR
    UPPER(name) LIKE 'VILLAGE OF%' OR
    UPPER(name) LIKE '%MUNICIPAL%' OR
    UPPER(name) LIKE '%ISD%'
);

-- Church/Religious
UPDATE entities SET entity_type = 'Church'
WHERE entity_type IS NULL AND (
    UPPER(name) LIKE '%CHURCH%' OR
    UPPER(name) LIKE '%BAPTIST%' OR
    UPPER(name) LIKE '%METHODIST%' OR
    UPPER(name) LIKE '%CATHOLIC%' OR
    UPPER(name) LIKE '%LUTHERAN%' OR
    UPPER(name) LIKE '%PRESBYTERIAN%' OR
    UPPER(name) LIKE '%EPISCOPAL%' OR
    UPPER(name) LIKE '%SYNAGOGUE%' OR
    UPPER(name) LIKE '%MOSQUE%' OR
    UPPER(name) LIKE '%TEMPLE%' OR
    UPPER(name) LIKE '%MINISTRY%' OR
    UPPER(name) LIKE '%CONGREGATION%'
);

-- Education (private schools, universities, colleges - not ISDs which are public)
UPDATE entities SET entity_type = 'Education'
WHERE entity_type IS NULL AND (
    UPPER(name) LIKE '%SCHOOL%' OR
    UPPER(name) LIKE '%UNIVERSITY%' OR
    UPPER(name) LIKE '%COLLEGE%' OR
    UPPER(name) LIKE '%ACADEMY%' OR
    UPPER(name) LIKE '%EDUCATION%'
);

-- Healthcare
UPDATE entities SET entity_type = 'Healthcare'
WHERE entity_type IS NULL AND (
    UPPER(name) LIKE '%HOSPITAL%' OR
    UPPER(name) LIKE '%MEDICAL%' OR
    UPPER(name) LIKE '%HEALTH%' OR
    UPPER(name) LIKE '%CLINIC%'
);

-- Government (state, federal, public entities)
UPDATE entities SET entity_type = 'Government'
WHERE entity_type IS NULL AND (
    UPPER(name) LIKE 'STATE OF%' OR
    UPPER(name) LIKE '%STATE GOVERNMENT%' OR
    UPPER(name) LIKE '%FEDERAL%' OR
    UPPER(name) LIKE '%PUBLIC%' OR
    UPPER(name) LIKE 'US %' OR
    UPPER(name) LIKE 'UNITED STATES%'
);

-- Set remaining to 'Business Entity' as default
UPDATE entities SET entity_type = 'Business Entity'
WHERE entity_type IS NULL;

-- Show results
SELECT entity_type, COUNT(*) as count
FROM entities
GROUP BY entity_type
ORDER BY count DESC;
