-- ===========================================================
-- BATTERIE DE TESTS - Recherche semantique MojiraX
-- Simule searchTextImmediate (unaccent + stem + mot par mot)
-- ===========================================================

\echo '=========================================='
\echo 'S1: je recherche un developpeur'
\echo 'Keywords: [developp]'
\echo 'Attendu PERSONNES: Sophie, Patrick, Fatou'
\echo '=========================================='
SELECT u.first_name || ' ' || u.last_name AS nom, cp.title
FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
WHERE (unaccent(LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.name,'') || ' ' || COALESCE(cp.title,'') || ' ' || COALESCE(cp.bio,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%developp%']::text[])))))
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED') LIMIT 5;

\echo '=========================================='
\echo 'S2: designer UX'
\echo 'Keywords: [design]'
\echo 'Attendu: Aminata'
\echo '=========================================='
SELECT u.first_name || ' ' || u.last_name AS nom, cp.title
FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
WHERE (unaccent(LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.name,'') || ' ' || COALESCE(cp.title,'') || ' ' || COALESCE(cp.bio,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%design%']::text[])))))
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED') LIMIT 5;

\echo '=========================================='
\echo 'S3: ingenieur cloud'
\echo 'Keywords: [ingenie, cloud]'
\echo 'Attendu: Jean-Pierre'
\echo '=========================================='
SELECT u.first_name || ' ' || u.last_name AS nom, cp.title
FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
WHERE (unaccent(LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.name,'') || ' ' || COALESCE(cp.title,'') || ' ' || COALESCE(cp.bio,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%ingenie%', '%cloud%']::text[])))))
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED') LIMIT 5;

\echo '=========================================='
\echo 'S4: apps mobile'
\echo 'Keywords: [mobile]'
\echo 'Attendu PERSONNES: Patrick | PROJETS: MoMo Pay, DeliverFast, MediLink'
\echo '=========================================='
SELECT u.first_name || ' ' || u.last_name AS nom, cp.title
FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
WHERE (unaccent(LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.name,'') || ' ' || COALESCE(cp.title,'') || ' ' || COALESCE(cp.bio,'')))
LIKE '%mobile%'
OR EXISTS (SELECT 1 FROM unnest(COALESCE(cp.skills, ARRAY[]::text[])) AS skill WHERE unaccent(LOWER(skill)) LIKE '%mobile%'))
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED') LIMIT 5;

SELECT name, required_skills[1:3] FROM projects
WHERE status = 'PUBLISHED'
AND (unaccent(LOWER(name || ' ' || pitch || ' ' || COALESCE(description,'') || ' ' || COALESCE(looking_for_role,''))) LIKE '%mobile%'
OR EXISTS (SELECT 1 FROM unnest(required_skills) AS skill WHERE unaccent(LOWER(skill)) LIKE '%mobile%'))
LIMIT 5;

\echo '=========================================='
\echo 'S5: projet fintech paiement'
\echo 'Keywords: [fintec, paiemen]'
\echo 'Attendu: MoMo Pay'
\echo '=========================================='
SELECT name, sector, LEFT(pitch, 60) FROM projects
WHERE status = 'PUBLISHED'
AND unaccent(LOWER(name || ' ' || pitch || ' ' || COALESCE(description,'') || ' ' || COALESCE(looking_for_role,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%fintec%', '%paiemen%']::text[]))))
LIMIT 5;

\echo '=========================================='
\echo 'S6: data scientist IA'
\echo 'Keywords: [data, scientist]'
\echo 'Attendu: Fatou'
\echo '=========================================='
SELECT u.first_name || ' ' || u.last_name AS nom, cp.title
FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
WHERE unaccent(LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.name,'') || ' ' || COALESCE(cp.title,'') || ' ' || COALESCE(cp.bio,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%data%', '%scientist%']::text[]))))
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED') LIMIT 5;

\echo '=========================================='
\echo 'S7: CTO technique startup'
\echo 'Keywords: [technique, startup]'
\echo 'Attendu: projets avec TECH (faible chance en ILIKE)'
\echo '=========================================='
SELECT name, looking_for_role, LEFT(pitch, 60) FROM projects
WHERE status = 'PUBLISHED'
AND unaccent(LOWER(name || ' ' || pitch || ' ' || COALESCE(description,'') || ' ' || COALESCE(looking_for_role,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%techniqu%', '%startup%']::text[]))))
LIMIT 5;

\echo '=========================================='
\echo 'S8: livraison logistique Douala'
\echo 'Keywords: [livrais, douala]'
\echo 'Attendu: DeliverFast'
\echo '=========================================='
SELECT name, sector, city FROM projects
WHERE status = 'PUBLISHED'
AND unaccent(LOWER(name || ' ' || pitch || ' ' || COALESCE(description,'') || ' ' || COALESCE(looking_for_role,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%livrais%', '%douala%']::text[]))))
LIMIT 5;

\echo '=========================================='
\echo 'S9: devops kubernetes'
\echo 'Keywords: [devops, kubernet]'
\echo 'Attendu: Jean-Pierre'
\echo '=========================================='
SELECT u.first_name || ' ' || u.last_name AS nom, cp.title
FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
WHERE (unaccent(LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.name,'') || ' ' || COALESCE(cp.title,'') || ' ' || COALESCE(cp.bio,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%devops%']::text[]))))
OR EXISTS (SELECT 1 FROM unnest(COALESCE(cp.skills, ARRAY[]::text[])) AS skill WHERE unaccent(LOWER(skill)) LIKE '%kubernetes%'))
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED') LIMIT 5;

\echo '=========================================='
\echo 'S10: sante telemedecine afrique'
\echo 'Keywords: [telemedi, afriqu]'
\echo 'Attendu: MediLink'
\echo '=========================================='
SELECT name, sector, LEFT(pitch, 60) FROM projects
WHERE status = 'PUBLISHED'
AND unaccent(LOWER(name || ' ' || pitch || ' ' || COALESCE(description,'') || ' ' || COALESCE(looking_for_role,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%telemedi%', '%afriqu%']::text[]))))
LIMIT 5;

\echo '=========================================='
\echo 'S11: editeur application iPhone (synonyme dev mobile)'
\echo 'Keywords: [editeur, applicat, iphone]'
\echo 'Attendu: Patrick via skills iOS (ILIKE seul = limite semantique)'
\echo '=========================================='
SELECT u.first_name || ' ' || u.last_name AS nom, cp.title
FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
WHERE (unaccent(LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') || ' ' || COALESCE(u.name,'') || ' ' || COALESCE(cp.title,'') || ' ' || COALESCE(cp.bio,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%editeur%', '%iphone%']::text[]))))
OR EXISTS (SELECT 1 FROM unnest(COALESCE(cp.skills, ARRAY[]::text[])) AS skill WHERE unaccent(LOWER(skill)) LIKE ANY(ARRAY['%iphone%', '%ios%'])))
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED') LIMIT 5;

\echo '=========================================='
\echo 'S12: commerce en ligne marketplace'
\echo 'Keywords: [marketplac]'
\echo 'Attendu: AgriConnect (marketplace B2B)'
\echo '=========================================='
SELECT name, sector, LEFT(pitch, 60) FROM projects
WHERE status = 'PUBLISHED'
AND unaccent(LOWER(name || ' ' || pitch || ' ' || COALESCE(description,'') || ' ' || COALESCE(looking_for_role,'')))
LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%marketplac%']::text[]))))
LIMIT 5;
