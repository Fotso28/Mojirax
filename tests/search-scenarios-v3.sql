-- ===========================================================
-- BATTERIE DE TESTS V3 - Avec synonymes secteur + role
-- ===========================================================

-- Sector labels SQL injecte dans la concatenation
-- HEALTHTECH -> 'healthtech sante medecine telemedecine hopital docteur medecin pharmacie'
-- FINTECH -> 'fintech finance paiement banque argent mobile money'
-- LOGISTICS -> 'logistique livraison transport expedition colis courier'
-- Role labels SQL:
-- TECH -> 'technique technologie developpeur cto programmeur ingenieur dev codeur'
-- BIZ -> 'business commercial vente marketing affaires coo cmo'

\echo '=== S1: sante ==='
\echo 'Attendu: MediLink (HEALTHTECH -> sante)'
SELECT name, sector FROM projects WHERE status = 'PUBLISHED'
AND unaccent(LOWER(
    name || ' ' || pitch || ' ' || COALESCE(description,'')
    || ' ' || CASE sector WHEN 'HEALTHTECH' THEN 'healthtech sante medecine telemedecine hopital docteur medecin pharmacie' WHEN 'FINTECH' THEN 'fintech finance paiement banque argent mobile money' WHEN 'LOGISTICS' THEN 'logistique livraison transport expedition colis courier' WHEN 'EDTECH' THEN 'edtech education formation enseignement ecole universite apprentissage cours' WHEN 'AGRITECH' THEN 'agritech agriculture ferme agricole culture elevage' WHEN 'ECOMMERCE' THEN 'ecommerce commerce boutique vente achat magasin' WHEN 'AI' THEN 'intelligence artificielle ia machine learning donnees data' ELSE COALESCE(sector,'') END
    || ' ' || CASE looking_for_role WHEN 'TECH' THEN 'technique technologie developpeur cto programmeur ingenieur dev codeur' WHEN 'BIZ' THEN 'business commercial vente marketing affaires coo cmo' ELSE COALESCE(looking_for_role,'') END
    || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'')
)) LIKE '%sante%' LIMIT 5;

\echo '=== S2: finance ==='
\echo 'Attendu: MoMo Pay (FINTECH -> finance)'
SELECT name, sector FROM projects WHERE status = 'PUBLISHED'
AND unaccent(LOWER(
    name || ' ' || pitch || ' ' || COALESCE(description,'')
    || ' ' || CASE sector WHEN 'HEALTHTECH' THEN 'healthtech sante medecine telemedecine hopital docteur medecin pharmacie' WHEN 'FINTECH' THEN 'fintech finance paiement banque argent mobile money' WHEN 'LOGISTICS' THEN 'logistique livraison transport expedition colis courier' WHEN 'EDTECH' THEN 'edtech education formation enseignement ecole universite apprentissage cours' WHEN 'AGRITECH' THEN 'agritech agriculture ferme agricole culture elevage' WHEN 'ECOMMERCE' THEN 'ecommerce commerce boutique vente achat magasin' WHEN 'AI' THEN 'intelligence artificielle ia machine learning donnees data' ELSE COALESCE(sector,'') END
    || ' ' || CASE looking_for_role WHEN 'TECH' THEN 'technique technologie developpeur cto programmeur ingenieur dev codeur' WHEN 'BIZ' THEN 'business commercial vente marketing affaires coo cmo' ELSE COALESCE(looking_for_role,'') END
    || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'')
)) LIKE '%financ%' LIMIT 5;

\echo '=== S3: CTO startup ==='
\echo 'Attendu: 5 projets TECH (TECH -> cto)'
SELECT name, looking_for_role FROM projects WHERE status = 'PUBLISHED'
AND unaccent(LOWER(
    name || ' ' || pitch || ' ' || COALESCE(description,'')
    || ' ' || CASE sector WHEN 'HEALTHTECH' THEN 'healthtech sante medecine telemedecine hopital docteur medecin pharmacie' WHEN 'FINTECH' THEN 'fintech finance paiement banque argent mobile money' WHEN 'LOGISTICS' THEN 'logistique livraison transport expedition colis courier' WHEN 'EDTECH' THEN 'edtech education formation enseignement ecole universite apprentissage cours' WHEN 'AGRITECH' THEN 'agritech agriculture ferme agricole culture elevage' WHEN 'ECOMMERCE' THEN 'ecommerce commerce boutique vente achat magasin' WHEN 'AI' THEN 'intelligence artificielle ia machine learning donnees data' ELSE COALESCE(sector,'') END
    || ' ' || CASE looking_for_role WHEN 'TECH' THEN 'technique technologie developpeur cto programmeur ingenieur dev codeur' WHEN 'BIZ' THEN 'business commercial vente marketing affaires coo cmo' ELSE COALESCE(looking_for_role,'') END
    || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'')
)) LIKE '%cto%' LIMIT 5;

\echo '=== S4: education formation ==='
\echo 'Attendu: LearnAfrica (EDTECH -> formation)'
SELECT name, sector FROM projects WHERE status = 'PUBLISHED'
AND unaccent(LOWER(
    name || ' ' || pitch || ' ' || COALESCE(description,'')
    || ' ' || CASE sector WHEN 'HEALTHTECH' THEN 'healthtech sante medecine telemedecine hopital docteur medecin pharmacie' WHEN 'FINTECH' THEN 'fintech finance paiement banque argent mobile money' WHEN 'LOGISTICS' THEN 'logistique livraison transport expedition colis courier' WHEN 'EDTECH' THEN 'edtech education formation enseignement ecole universite apprentissage cours' WHEN 'AGRITECH' THEN 'agritech agriculture ferme agricole culture elevage' WHEN 'ECOMMERCE' THEN 'ecommerce commerce boutique vente achat magasin' WHEN 'AI' THEN 'intelligence artificielle ia machine learning donnees data' ELSE COALESCE(sector,'') END
    || ' ' || CASE looking_for_role WHEN 'TECH' THEN 'technique technologie developpeur cto programmeur ingenieur dev codeur' WHEN 'BIZ' THEN 'business commercial vente marketing affaires coo cmo' ELSE COALESCE(looking_for_role,'') END
    || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'')
)) LIKE '%format%' LIMIT 5;

\echo '=== S5: transport livraison ==='
\echo 'Attendu: DeliverFast (LOGISTICS -> transport livraison)'
SELECT name, sector FROM projects WHERE status = 'PUBLISHED'
AND unaccent(LOWER(
    name || ' ' || pitch || ' ' || COALESCE(description,'')
    || ' ' || CASE sector WHEN 'HEALTHTECH' THEN 'healthtech sante medecine telemedecine hopital docteur medecin pharmacie' WHEN 'FINTECH' THEN 'fintech finance paiement banque argent mobile money' WHEN 'LOGISTICS' THEN 'logistique livraison transport expedition colis courier' WHEN 'EDTECH' THEN 'edtech education formation enseignement ecole universite apprentissage cours' WHEN 'AGRITECH' THEN 'agritech agriculture ferme agricole culture elevage' WHEN 'ECOMMERCE' THEN 'ecommerce commerce boutique vente achat magasin' WHEN 'AI' THEN 'intelligence artificielle ia machine learning donnees data' ELSE COALESCE(sector,'') END
    || ' ' || CASE looking_for_role WHEN 'TECH' THEN 'technique technologie developpeur cto programmeur ingenieur dev codeur' WHEN 'BIZ' THEN 'business commercial vente marketing affaires coo cmo' ELSE COALESCE(looking_for_role,'') END
    || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'')
)) LIKE '%transp%' LIMIT 5;

\echo '=== S6: agriculture Cameroun ==='
\echo 'Attendu: AgriConnect (AGRITECH + Cameroun)'
SELECT name, sector FROM projects WHERE status = 'PUBLISHED'
AND unaccent(LOWER(
    name || ' ' || pitch || ' ' || COALESCE(description,'')
    || ' ' || CASE sector WHEN 'HEALTHTECH' THEN 'healthtech sante medecine telemedecine hopital docteur medecin pharmacie' WHEN 'FINTECH' THEN 'fintech finance paiement banque argent mobile money' WHEN 'LOGISTICS' THEN 'logistique livraison transport expedition colis courier' WHEN 'EDTECH' THEN 'edtech education formation enseignement ecole universite apprentissage cours' WHEN 'AGRITECH' THEN 'agritech agriculture ferme agricole culture elevage' WHEN 'ECOMMERCE' THEN 'ecommerce commerce boutique vente achat magasin' WHEN 'AI' THEN 'intelligence artificielle ia machine learning donnees data' ELSE COALESCE(sector,'') END
    || ' ' || CASE looking_for_role WHEN 'TECH' THEN 'technique technologie developpeur cto programmeur ingenieur dev codeur' WHEN 'BIZ' THEN 'business commercial vente marketing affaires coo cmo' ELSE COALESCE(looking_for_role,'') END
    || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'')
)) LIKE ALL(SELECT unaccent(LOWER(unnest(ARRAY['%agricu%','%camer%']::text[])))) LIMIT 5;

\echo '=== S7: commercial vente emploi ==='
\echo 'Attendu: KmerJobs (BIZ -> commercial vente)'
SELECT name, looking_for_role FROM projects WHERE status = 'PUBLISHED'
AND unaccent(LOWER(
    name || ' ' || pitch || ' ' || COALESCE(description,'')
    || ' ' || CASE sector WHEN 'HEALTHTECH' THEN 'healthtech sante medecine telemedecine hopital docteur medecin pharmacie' WHEN 'FINTECH' THEN 'fintech finance paiement banque argent mobile money' WHEN 'LOGISTICS' THEN 'logistique livraison transport expedition colis courier' WHEN 'EDTECH' THEN 'edtech education formation enseignement ecole universite apprentissage cours' WHEN 'AGRITECH' THEN 'agritech agriculture ferme agricole culture elevage' WHEN 'ECOMMERCE' THEN 'ecommerce commerce boutique vente achat magasin' WHEN 'AI' THEN 'intelligence artificielle ia machine learning donnees data' ELSE COALESCE(sector,'') END
    || ' ' || CASE looking_for_role WHEN 'TECH' THEN 'technique technologie developpeur cto programmeur ingenieur dev codeur' WHEN 'BIZ' THEN 'business commercial vente marketing affaires coo cmo' ELSE COALESCE(looking_for_role,'') END
    || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'')
)) LIKE '%commer%' LIMIT 5;

\echo '=== S8: medecin docteur ==='
\echo 'Attendu: MediLink (HEALTHTECH -> medecin docteur)'
SELECT name, sector FROM projects WHERE status = 'PUBLISHED'
AND unaccent(LOWER(
    name || ' ' || pitch || ' ' || COALESCE(description,'')
    || ' ' || CASE sector WHEN 'HEALTHTECH' THEN 'healthtech sante medecine telemedecine hopital docteur medecin pharmacie' WHEN 'FINTECH' THEN 'fintech finance paiement banque argent mobile money' WHEN 'LOGISTICS' THEN 'logistique livraison transport expedition colis courier' WHEN 'EDTECH' THEN 'edtech education formation enseignement ecole universite apprentissage cours' WHEN 'AGRITECH' THEN 'agritech agriculture ferme agricole culture elevage' WHEN 'ECOMMERCE' THEN 'ecommerce commerce boutique vente achat magasin' WHEN 'AI' THEN 'intelligence artificielle ia machine learning donnees data' ELSE COALESCE(sector,'') END
    || ' ' || CASE looking_for_role WHEN 'TECH' THEN 'technique technologie developpeur cto programmeur ingenieur dev codeur' WHEN 'BIZ' THEN 'business commercial vente marketing affaires coo cmo' ELSE COALESCE(looking_for_role,'') END
    || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'')
)) LIKE '%docte%' LIMIT 5;

\echo '=== S9: programmeur codeur ==='
\echo 'Attendu: 5 projets TECH (TECH -> programmeur codeur)'
SELECT name, looking_for_role FROM projects WHERE status = 'PUBLISHED'
AND unaccent(LOWER(
    name || ' ' || pitch || ' ' || COALESCE(description,'')
    || ' ' || CASE sector WHEN 'HEALTHTECH' THEN 'healthtech sante medecine telemedecine hopital docteur medecin pharmacie' WHEN 'FINTECH' THEN 'fintech finance paiement banque argent mobile money' WHEN 'LOGISTICS' THEN 'logistique livraison transport expedition colis courier' WHEN 'EDTECH' THEN 'edtech education formation enseignement ecole universite apprentissage cours' WHEN 'AGRITECH' THEN 'agritech agriculture ferme agricole culture elevage' WHEN 'ECOMMERCE' THEN 'ecommerce commerce boutique vente achat magasin' WHEN 'AI' THEN 'intelligence artificielle ia machine learning donnees data' ELSE COALESCE(sector,'') END
    || ' ' || CASE looking_for_role WHEN 'TECH' THEN 'technique technologie developpeur cto programmeur ingenieur dev codeur' WHEN 'BIZ' THEN 'business commercial vente marketing affaires coo cmo' ELSE COALESCE(looking_for_role,'') END
    || ' ' || COALESCE(city,'') || ' ' || COALESCE(country,'')
)) LIKE '%progra%' LIMIT 5;
