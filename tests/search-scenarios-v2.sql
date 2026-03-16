-- ===========================================================
-- BATTERIE DE TESTS V2 - Recherche MojiraX
-- Stems 60% + city/country/sector dans concat
-- ===========================================================

-- Concat projets = name + pitch + description + looking_for_role + city + country + sector
-- Concat personnes = first_name + last_name + name + title + bio + location

\echo 'S1: je recherche un developpeur -> [develop]'
SELECT u.first_name || ' ' || u.last_name AS nom, cp.title FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
WHERE (unaccent(LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.name,'') || ' ' || COALESCE(cp.title,'') || ' ' || COALESCE(cp.bio,'') || ' ' || COALESCE(cp.location,''))) LIKE '%develop%'
OR EXISTS (SELECT 1 FROM unnest(COALESCE(cp.skills, ARRAY[]::text[])) AS skill WHERE unaccent(LOWER(skill)) LIKE '%develop%'))
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED') LIMIT 5;

\echo 'S2: designer UX -> [design]'
SELECT u.first_name || ' ' || u.last_name AS nom, cp.title FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
WHERE unaccent(LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.name,'') || ' ' || COALESCE(cp.title,'') || ' ' || COALESCE(cp.bio,'') || ' ' || COALESCE(cp.location,''))) LIKE '%design%'
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED') LIMIT 5;

\echo 'S3: ingenieur cloud -> [ingeni, cloud]'
SELECT u.first_name || ' ' || u.last_name AS nom, cp.title FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
WHERE unaccent(LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.name,'') || ' ' || COALESCE(cp.title,'') || ' ' || COALESCE(cp.bio,'') || ' ' || COALESCE(cp.location,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%ingeni%','%cloud%']::text[]))))
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED') LIMIT 5;

\echo 'S4: apps mobile -> [mobile] PERSONNES + PROJETS'
SELECT u.first_name || ' ' || u.last_name AS nom, cp.title FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
WHERE (unaccent(LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.name,'') || ' ' || COALESCE(cp.title,'') || ' ' || COALESCE(cp.bio,'') || ' ' || COALESCE(cp.location,''))) LIKE '%mobile%'
OR EXISTS (SELECT 1 FROM unnest(COALESCE(cp.skills, ARRAY[]::text[])) AS skill WHERE unaccent(LOWER(skill)) LIKE '%mobile%'))
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED') LIMIT 5;
SELECT name FROM projects WHERE status = 'PUBLISHED'
AND (unaccent(LOWER(name || ' ' || pitch || ' ' || COALESCE(description,'') || ' ' || COALESCE(looking_for_role,'') || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'') || ' ' || COALESCE(sector,''))) LIKE '%mobile%'
OR EXISTS (SELECT 1 FROM unnest(required_skills) AS skill WHERE unaccent(LOWER(skill)) LIKE '%mobile%')) LIMIT 5;

\echo 'S5: projet fintech paiement -> [paiem]'
SELECT name FROM projects WHERE status = 'PUBLISHED'
AND unaccent(LOWER(name || ' ' || pitch || ' ' || COALESCE(description,'') || ' ' || COALESCE(looking_for_role,'') || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'') || ' ' || COALESCE(sector,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%paiem%']::text[])))) LIMIT 5;

\echo 'S6: data scientist IA -> [data, scient]'
SELECT u.first_name || ' ' || u.last_name AS nom, cp.title FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
WHERE unaccent(LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.name,'') || ' ' || COALESCE(cp.title,'') || ' ' || COALESCE(cp.bio,'') || ' ' || COALESCE(cp.location,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%data%','%scient%']::text[]))))
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED') LIMIT 5;

\echo 'S7: CTO technique startup -> [techni, start] (SEMANTIQUE SEULEMENT)'
SELECT name FROM projects WHERE status = 'PUBLISHED'
AND unaccent(LOWER(name || ' ' || pitch || ' ' || COALESCE(description,'') || ' ' || COALESCE(looking_for_role,'') || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'') || ' ' || COALESCE(sector,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%techni%']::text[])))) LIMIT 5;

\echo 'S8: livraison logistique Douala -> [livrai, douala]'
SELECT name FROM projects WHERE status = 'PUBLISHED'
AND unaccent(LOWER(name || ' ' || pitch || ' ' || COALESCE(description,'') || ' ' || COALESCE(looking_for_role,'') || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'') || ' ' || COALESCE(sector,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%livrai%','%douala%']::text[])))) LIMIT 5;

\echo 'S9: devops kubernetes -> [devops]'
SELECT u.first_name || ' ' || u.last_name AS nom, cp.title FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
WHERE (unaccent(LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.name,'') || ' ' || COALESCE(cp.title,'') || ' ' || COALESCE(cp.bio,'') || ' ' || COALESCE(cp.location,'')))
LIKE '%devops%'
OR EXISTS (SELECT 1 FROM unnest(COALESCE(cp.skills, ARRAY[]::text[])) AS skill WHERE unaccent(LOWER(skill)) LIKE '%kubern%'))
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED') LIMIT 5;

\echo 'S10: sante telemedecine afrique -> [telemede, afriq]'
SELECT name FROM projects WHERE status = 'PUBLISHED'
AND unaccent(LOWER(name || ' ' || pitch || ' ' || COALESCE(description,'') || ' ' || COALESCE(looking_for_role,'') || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'') || ' ' || COALESCE(sector,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%telemede%','%afriq%']::text[])))) LIMIT 5;

\echo 'S11: editeur application iPhone -> [editeu, applic, iphon]'
SELECT u.first_name || ' ' || u.last_name AS nom, cp.title FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
WHERE (unaccent(LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.name,'') || ' ' || COALESCE(cp.title,'') || ' ' || COALESCE(cp.bio,'') || ' ' || COALESCE(cp.location,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%editeu%','%iphon%']::text[]))))
OR EXISTS (SELECT 1 FROM unnest(COALESCE(cp.skills, ARRAY[]::text[])) AS skill WHERE unaccent(LOWER(skill)) LIKE ANY(ARRAY['%iphon%','%ios%'])))
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED') LIMIT 5;

\echo 'S12: commerce en ligne marketplace -> [marketp]'
SELECT name FROM projects WHERE status = 'PUBLISHED'
AND unaccent(LOWER(name || ' ' || pitch || ' ' || COALESCE(description,'') || ' ' || COALESCE(looking_for_role,'') || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'') || ' ' || COALESCE(sector,'')))
LIKE '%marketp%' LIMIT 5;
