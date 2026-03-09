-- ============================================
-- SEED DATA - Co-Founder Platform
-- Données réalistes pour la plateforme MojiraX
-- ============================================

-- ============================================
-- 2. PROJETS (8 projets réalistes)
-- ============================================

-- Projet 1: MoMo Pay (Fintech)
INSERT INTO projects (id, founder_id, slug, name, pitch, description, sector, stage, country, city, location, scope, problem, target, solution_current, solution_desc, uvp, anti_scope, market_type, business_model, competitors, founder_role, time_availability, traction, looking_for_role, collab_type, vision, team_size, funding_status, tech_stack, required_skills, nice_to_have_skills, commitment, is_remote, status, urgency, quality_score, created_at, updated_at)
SELECT
  'proj_momo_pay_001', id, 'momo-pay-cameroun',
  'MoMo Pay',
  'La super-app de paiement mobile pour l''Afrique centrale',
  'MoMo Pay unifie tous les portefeuilles mobiles (MTN MoMo, Orange Money, Express Union) en une seule application.',
  'Fintech', 'MVP',
  'Cameroun', 'Douala', 'Douala, Cameroun', 'LOCAL',
  'Les commerçants camerounais doivent gérer 3-4 comptes mobile money différents. Les frais de transfert inter-opérateurs sont excessifs.',
  'Commerçants urbains (boutiques, restaurants, taxis) et jeunes professionnels 25-40 ans à Douala et Yaoundé',
  'Les commerçants affichent manuellement leurs numéros MoMo et Orange Money.',
  'Application mobile unifiée avec un QR code unique par commerçant. Le paiement est routé automatiquement vers le bon opérateur.',
  'Un seul QR code, tous les opérateurs. Zéro friction pour le client.',
  'Pas de crypto, pas de banque traditionnelle. On se concentre sur le paiement quotidien.',
  'B2B', 'COMMISSION',
  'Lygos Pay, Maviance, PayUnit',
  'CEO', 'FULLTIME',
  '250 commerçants beta testeurs à Douala. 15 000 transactions/mois.',
  'TECH', 'EQUITY',
  'Construire le Stripe africain. Cherche un CTO passionné.',
  2, 'SEED',
  ARRAY['React Native', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'],
  ARRAY['React Native', 'Node.js', 'API REST', 'Mobile Money API'],
  ARRAY['Kubernetes', 'Terraform'],
  'FULL_TIME', false, 'PUBLISHED', 9, 85.5,
  NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days'
FROM users WHERE email = 'osw.fotso@gmail.com';

-- Projet 2: AgriConnect (Agritech)
INSERT INTO projects (id, founder_id, slug, name, pitch, description, sector, stage, country, city, location, scope, problem, target, solution_current, solution_desc, uvp, market_type, business_model, founder_role, time_availability, traction, looking_for_role, collab_type, vision, team_size, funding_status, tech_stack, required_skills, commitment, is_remote, status, urgency, quality_score, created_at, updated_at)
SELECT
  'proj_agri_002', id, 'agriconnect-cameroun',
  'AgriConnect',
  'La marketplace B2B qui connecte agriculteurs et acheteurs sans intermédiaires',
  'AgriConnect digitalise la chaîne d''approvisionnement agricole au Cameroun.',
  'Agritech', 'Idea',
  'Cameroun', 'Douala', 'Douala, Cameroun', 'LOCAL',
  'Les agriculteurs camerounais perdent 30-40% de leur récolte faute d''acheteurs. Les buyam-sellam captent 50% de la marge.',
  'Petits agriculteurs (1-5 hectares) dans les régions de l''Ouest et du Littoral.',
  'Les buyam-sellam achètent au village à bas prix et revendent en ville.',
  'App mobile simple (USSD + WhatsApp bot). Marketplace web pour les acheteurs. Logistique intégrée.',
  'Prix transparents, zéro intermédiaire, livraison garantie en 24h.',
  'MARKETPLACE', 'COMMISSION',
  'CEO', '10-20H',
  'Étude de marché auprès de 100 agriculteurs. Lettre d''intention de 5 restaurants.',
  'TECH', 'HYBRID',
  'Nourrir l''Afrique en connectant producteurs et consommateurs.',
  1, 'BOOTSTRAPPED',
  ARRAY['Next.js', 'Node.js', 'PostgreSQL', 'WhatsApp API'],
  ARRAY['Full Stack', 'Next.js', 'Node.js', 'UX Mobile'],
  'PART_TIME', true, 'PUBLISHED', 7, 72.0,
  NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days'
FROM users WHERE email = 'maxpayner237@gmail.com';

-- Projet 3: MediLink (HealthTech)
INSERT INTO projects (id, founder_id, slug, name, pitch, description, sector, stage, country, city, location, scope, problem, target, solution_desc, uvp, market_type, business_model, founder_role, time_availability, traction, looking_for_role, collab_type, vision, team_size, funding_status, tech_stack, required_skills, commitment, is_remote, status, urgency, quality_score, created_at, updated_at)
SELECT
  'proj_medilink_003', id, 'medilink-sante-afrique',
  'MediLink',
  'La télémédecine accessible pour l''Afrique francophone',
  'MediLink connecte les patients africains avec des médecins spécialistes via vidéo consultation.',
  'HealthTech', 'MVP',
  'Cameroun', 'Yaoundé', 'Yaoundé, Cameroun', 'DIASPORA',
  'Le Cameroun compte 1 médecin pour 10 000 habitants. Les spécialistes sont concentrés dans 2 villes.',
  'Patients en zones rurales. Diaspora camerounaise consultant pour leurs familles.',
  'App de téléconsultation avec vidéo HD optimisée pour connexions lentes. Paiement mobile money.',
  'Consultation spécialisée en 15 min, depuis n''importe où, pour 2000 FCFA.',
  'B2C', 'SUBSCRIPTION',
  'CEO', 'FULLTIME',
  '50 médecins inscrits dont 12 spécialistes. 200 consultations en beta. Note 4.7/5.',
  'TECH', 'EQUITY',
  'Devenir le DoctoLib de l''Afrique francophone.',
  3, 'SEED',
  ARRAY['React Native', 'NestJS', 'PostgreSQL', 'WebRTC', 'Redis'],
  ARRAY['React Native', 'WebRTC', 'NestJS', 'Cloud Architecture'],
  'FULL_TIME', false, 'PUBLISHED', 8, 90.0,
  NOW() - INTERVAL '45 days', NOW() - INTERVAL '1 day'
FROM users WHERE email = 'lux.kmer1@gmail.com';

-- Projet 4: LearnAfrica (EdTech)
INSERT INTO projects (id, founder_id, slug, name, pitch, description, sector, stage, country, city, location, scope, problem, target, solution_desc, uvp, market_type, business_model, founder_role, time_availability, traction, looking_for_role, collab_type, vision, team_size, funding_status, tech_stack, required_skills, commitment, is_remote, status, urgency, quality_score, created_at, updated_at)
SELECT
  'proj_learn_004', id, 'learn-africa-edtech',
  'LearnAfrica',
  'Formation professionnelle en ligne adaptée au marché africain',
  'Formations courtes (2-8 semaines) en tech, business et digital marketing par des formateurs africains.',
  'EdTech', 'Growth',
  'Cameroun', 'Douala', 'Douala, Cameroun', 'HYBRID',
  'Coursera et Udemy ne sont pas adaptés au contexte africain. Contenu en anglais, prix en dollars.',
  'Jeunes diplômés 18-30 ans. Professionnels cherchant à upgrader leurs compétences digitales.',
  'Micro-learning avec vidéos courtes, quiz interactifs, projets pratiques. Mentorat par des pros.',
  'Apprends un métier digital en 4 semaines avec des mentors africains.',
  'B2C', 'FREEMIUM',
  'CPO', 'FULLTIME',
  '3 500 apprenants actifs. 12 formations. Partenariats Orange Digital Center et Andela. Completion 45%.',
  'TECH', 'EQUITY',
  'Passer de 3 500 à 50 000 apprenants en 12 mois.',
  5, 'SEED',
  ARRAY['Next.js', 'NestJS', 'PostgreSQL', 'AWS S3', 'FFmpeg'],
  ARRAY['Next.js', 'NestJS', 'Video Streaming', 'AWS'],
  'FULL_TIME', true, 'PUBLISHED', 6, 88.0,
  NOW() - INTERVAL '60 days', NOW() - INTERVAL '3 days'
FROM users WHERE email = 'lux.kmer@gmail.com';

-- Projet 5: DeliverFast (Logistique)
INSERT INTO projects (id, founder_id, slug, name, pitch, description, sector, stage, country, city, location, scope, problem, target, solution_desc, uvp, market_type, business_model, founder_role, time_availability, traction, looking_for_role, collab_type, vision, team_size, funding_status, tech_stack, required_skills, commitment, is_remote, status, urgency, quality_score, created_at, updated_at)
SELECT
  'proj_deliver_005', id, 'deliverfast-livraison',
  'DeliverFast',
  'Livraison express en 2h pour le e-commerce africain',
  'Réseau de livreurs moto-taxis équipés d''une app. Livraison le jour même pour e-commerçants et restaurants.',
  'Logistique', 'MVP',
  'Cameroun', 'Douala', 'Douala, Cameroun', 'LOCAL',
  'La livraison au Cameroun est lente (3-7 jours), chère et peu fiable. 40% de commandes perdues.',
  'E-commerçants Instagram/Facebook, restaurants, pharmacies.',
  'App livreur avec GPS temps réel. API d''intégration e-commerce. Suivi SMS client. 200 moto-taxis certifiés.',
  'Livré en 2h ou remboursé. Le Glovo africain fait par des Africains.',
  'MARKETPLACE', 'COMMISSION',
  'COO', 'FULLTIME',
  '180 livreurs actifs. 500 livraisons/jour. 15 partenaires e-commerce. CA: 2M FCFA/mois.',
  'TECH', 'HYBRID',
  'Lancer Yaoundé et Libreville dans 6 mois.',
  4, 'BOOTSTRAPPED',
  ARRAY['React Native', 'Node.js', 'PostgreSQL', 'Redis', 'Google Maps API'],
  ARRAY['React Native', 'Node.js', 'Geolocation', 'Real-time Systems'],
  'FULL_TIME', false, 'PUBLISHED', 8, 82.0,
  NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 day'
FROM users WHERE email = 'lux.kmer2@gmail.com';

-- Projet 6: KmerJobs (RH/Emploi)
INSERT INTO projects (id, founder_id, slug, name, pitch, description, sector, stage, country, city, location, scope, problem, target, solution_desc, uvp, market_type, business_model, founder_role, time_availability, traction, looking_for_role, collab_type, vision, team_size, funding_status, tech_stack, required_skills, commitment, is_remote, status, urgency, quality_score, created_at, updated_at)
SELECT
  'proj_kmerjobs_006', id, 'kmerjobs-emploi',
  'KmerJobs',
  'La plateforme d''emploi intelligente qui matche candidats et entreprises par IA',
  'IA pour matcher candidats et offres d''emploi. Analyse de CV automatique, suggestions personnalisées.',
  'RH/Emploi', 'Idea',
  'Cameroun', 'Yaoundé', 'Yaoundé, Cameroun', 'HYBRID',
  'Taux de chômage des jeunes > 60%. Plateformes existantes basiques, pas de matching intelligent.',
  'Jeunes diplômés camerounais 20-35 ans. Entreprises locales et multinationales.',
  'Plateforme IA analysant les CV, suggérant des formations, matchant automatiquement avec les offres.',
  'L''IA qui trouve ton emploi idéal en 48h.',
  'MARKETPLACE', 'FREEMIUM',
  'CTO', '5-10H',
  'Prototype Figma validé. Enquête 200 jeunes diplômés. 3 entreprises partenaires prêtes.',
  'BIZ', 'EQUITY',
  'Cherche un co-fondateur business pour stratégie commerciale et levée de fonds.',
  1, 'BOOTSTRAPPED',
  ARRAY['Next.js', 'Python', 'FastAPI', 'PostgreSQL', 'OpenAI API'],
  ARRAY['Business Development', 'Sales', 'Marketing Digital'],
  'PART_TIME', true, 'PUBLISHED', 5, 65.0,
  NOW() - INTERVAL '10 days', NOW() - INTERVAL '7 days'
FROM users WHERE email = 'osw.fotso8@gmail.com';

-- Projet 7: SafeRide (Transport) - DRAFT
INSERT INTO projects (id, founder_id, slug, name, pitch, sector, stage, country, city, location, scope, problem, target, founder_role, time_availability, looking_for_role, collab_type, status, urgency, quality_score, tech_stack, required_skills, created_at, updated_at)
SELECT
  'proj_saferide_007', id, 'saferide-transport',
  'SafeRide',
  'Covoiturage sécurisé pour les trajets interurbains au Cameroun',
  'Transport', 'Idea',
  'Cameroun', 'Douala', 'Douala, Cameroun', 'LOCAL',
  'Les bus interurbains sont dangereux. Les véhicules personnels roulent souvent à moitié vides.',
  'Voyageurs interurbains, professionnels navette Douala-Yaoundé.',
  'CEO', '2-5H', 'TECH', 'EQUITY',
  'DRAFT', 3, 30.0,
  ARRAY[]::text[], ARRAY[]::text[],
  NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
FROM users WHERE email = 'osw.fotso@gmail.com';

-- Projet 8: CashFlow (Fintech) - PENDING_AI
INSERT INTO projects (id, founder_id, slug, name, pitch, sector, stage, country, city, location, scope, problem, target, solution_desc, uvp, market_type, business_model, founder_role, time_availability, looking_for_role, collab_type, status, urgency, quality_score, tech_stack, required_skills, created_at, updated_at)
SELECT
  'proj_cashflow_008', id, 'cashflow-comptabilite',
  'CashFlow',
  'La comptabilité simplifiée pour les PME camerounaises',
  'Fintech', 'Idea',
  'Cameroun', 'Douala', 'Douala, Cameroun', 'LOCAL',
  '90% des PME camerounaises n''ont pas de comptabilité formelle. Risque d''amendes fiscales.',
  'PME et micro-entreprises (CA < 100M FCFA/an).',
  'App mobile de comptabilité. Photo de reçu = écriture comptable automatique par IA.',
  'Ta comptabilité en 5 minutes par jour, depuis ton téléphone.',
  'B2B', 'SUBSCRIPTION',
  'CEO', '10-20H', 'TECH', 'HYBRID',
  'PENDING_AI', 4, 55.0,
  ARRAY['React Native', 'NestJS', 'PostgreSQL']::text[],
  ARRAY['React Native', 'NestJS', 'OCR']::text[],
  NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'
FROM users WHERE email = 'maxpayner237@gmail.com';


-- ============================================
-- 3. PROFILS CANDIDATS (6 candidats)
-- ============================================

INSERT INTO candidate_profiles (id, user_id, title, bio, location, linkedin_url, skills, experience, education, years_of_experience, languages, certifications, desired_sectors, desired_stage, desired_location, availability, willing_to_relocate, remote_only, is_contact_visible, status, profile_completeness, quality_score, created_at, updated_at)
SELECT
  'cand_sophie_001', id,
  'Développeuse Full Stack Senior',
  'Développeuse passionnée avec 7 ans d''expérience en React, Node.js et Python. Ex-Jumia Tech. Je cherche un projet à fort impact social en Afrique. Spécialisée dans les systèmes de paiement et les architectures scalables.',
  'Douala, Cameroun',
  'https://linkedin.com/in/sophie-nguema',
  ARRAY['React', 'Node.js', 'Python', 'PostgreSQL', 'Docker', 'AWS', 'TypeScript', 'Redis'],
  '[{"company": "Jumia", "role": "Senior Developer", "duration": "3 ans"}, {"company": "Freelance", "role": "Full Stack Developer", "duration": "4 ans"}]'::jsonb,
  '[{"school": "Université de Douala", "degree": "Master Informatique", "year": 2019}]'::jsonb,
  7,
  ARRAY['Français', 'Anglais'],
  ARRAY['AWS Certified Solutions Architect'],
  ARRAY['Fintech', 'HealthTech', 'EdTech'],
  ARRAY['MVP', 'Growth'],
  ARRAY['Douala', 'Remote'],
  'IMMEDIATE',
  false, false, true, 'PUBLISHED', 92.0, 88.5,
  NOW() - INTERVAL '25 days', NOW() - INTERVAL '3 days'
FROM users WHERE email = 'toto@gmail.com';

INSERT INTO candidate_profiles (id, user_id, title, bio, location, linkedin_url, skills, experience, education, years_of_experience, languages, certifications, desired_sectors, desired_stage, desired_location, availability, willing_to_relocate, remote_only, is_contact_visible, status, profile_completeness, quality_score, created_at, updated_at)
SELECT
  'cand_jp_002', id,
  'Architecte Cloud & DevOps',
  'Ingénieur DevOps avec 10 ans d''expérience. Expert Kubernetes, Terraform et CI/CD. J''ai scalé des systèmes à 1M+ utilisateurs chez Afriland First Bank. Passionné par l''infrastructure cloud en Afrique.',
  'Yaoundé, Cameroun',
  'https://linkedin.com/in/jp-mbarga',
  ARRAY['Kubernetes', 'Terraform', 'AWS', 'GCP', 'Docker', 'CI/CD', 'Python', 'Go', 'Monitoring'],
  '[{"company": "Afriland First Bank", "role": "Lead DevOps", "duration": "5 ans"}, {"company": "Orange Cameroun", "role": "Sys Admin", "duration": "3 ans"}]'::jsonb,
  '[{"school": "ENSPY Yaoundé", "degree": "Ingénieur Informatique", "year": 2016}]'::jsonb,
  10,
  ARRAY['Français', 'Anglais'],
  ARRAY['AWS Certified DevOps Engineer', 'CKA Kubernetes'],
  ARRAY['Fintech', 'Logistique'],
  ARRAY['MVP', 'Growth'],
  ARRAY['Yaoundé', 'Douala', 'Remote'],
  '1_MONTH',
  true, false, false, 'PUBLISHED', 95.0, 92.0,
  NOW() - INTERVAL '35 days', NOW() - INTERVAL '2 days'
FROM users WHERE email = 'toto1@gmail.com';

INSERT INTO candidate_profiles (id, user_id, title, bio, location, linkedin_url, skills, experience, education, years_of_experience, languages, desired_sectors, desired_stage, desired_location, availability, willing_to_relocate, remote_only, is_contact_visible, status, profile_completeness, quality_score, created_at, updated_at)
SELECT
  'cand_aminata_003', id,
  'Product Designer & UX Researcher',
  'Designer UX/UI avec 5 ans d''expérience. Spécialisée dans le design inclusif pour les marchés émergents. J''ai designé des apps utilisées par 500K+ personnes en Afrique de l''Ouest.',
  'Douala, Cameroun',
  'https://linkedin.com/in/aminata-diallo',
  ARRAY['Figma', 'UX Research', 'UI Design', 'Design System', 'Prototyping', 'User Testing', 'Adobe XD'],
  '[{"company": "Wave", "role": "Product Designer", "duration": "2 ans"}, {"company": "Andela", "role": "UX Designer", "duration": "3 ans"}]'::jsonb,
  '[{"school": "ISM Dakar", "degree": "Master Design Digital", "year": 2021}]'::jsonb,
  5,
  ARRAY['Français', 'Anglais', 'Wolof'],
  ARRAY['Fintech', 'EdTech', 'HealthTech'],
  ARRAY['Idea', 'MVP'],
  ARRAY['Douala', 'Remote'],
  'IMMEDIATE',
  false, true, true, 'PUBLISHED', 88.0, 85.0,
  NOW() - INTERVAL '18 days', NOW() - INTERVAL '4 days'
FROM users WHERE email = 'toto2@gmail.com';

INSERT INTO candidate_profiles (id, user_id, title, bio, location, linkedin_url, skills, experience, education, years_of_experience, languages, certifications, desired_sectors, desired_stage, desired_location, availability, willing_to_relocate, remote_only, is_contact_visible, status, profile_completeness, quality_score, created_at, updated_at)
SELECT
  'cand_patrick_004', id,
  'Développeur Mobile React Native',
  'Développeur mobile spécialisé React Native et Flutter. 4 ans d''expérience dans les apps de paiement et e-commerce. Contributeur open source.',
  'Douala, Cameroun',
  'https://linkedin.com/in/patrick-tchoumi',
  ARRAY['React Native', 'Flutter', 'TypeScript', 'Firebase', 'REST API', 'GraphQL', 'iOS', 'Android'],
  '[{"company": "MTN Mobile Money", "role": "Mobile Developer", "duration": "2 ans"}, {"company": "Freelance", "role": "Mobile Developer", "duration": "2 ans"}]'::jsonb,
  '[{"school": "IUT Douala", "degree": "DUT Informatique", "year": 2022}]'::jsonb,
  4,
  ARRAY['Français', 'Anglais'],
  ARRAY['Google Mobile Web Specialist'],
  ARRAY['Fintech', 'Logistique', 'E-commerce'],
  ARRAY['MVP', 'Growth'],
  ARRAY['Douala'],
  'IMMEDIATE',
  false, false, true, 'PUBLISHED', 80.0, 78.0,
  NOW() - INTERVAL '12 days', NOW() - INTERVAL '6 days'
FROM users WHERE email = 'toto4@gmail.com';

INSERT INTO candidate_profiles (id, user_id, title, bio, location, linkedin_url, skills, experience, education, years_of_experience, languages, desired_sectors, desired_stage, desired_location, availability, willing_to_relocate, remote_only, is_contact_visible, status, profile_completeness, quality_score, created_at, updated_at)
SELECT
  'cand_fatou_005', id,
  'Data Scientist & ML Engineer',
  'Data scientist avec 6 ans d''expérience. Experte en NLP et computer vision. J''ai développé des modèles de scoring crédit pour les populations non-bancarisées en Afrique.',
  'Yaoundé, Cameroun',
  'https://linkedin.com/in/fatou-bello',
  ARRAY['Python', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision', 'SQL', 'Spark', 'MLOps'],
  '[{"company": "BGFI Bank", "role": "Data Scientist", "duration": "3 ans"}, {"company": "Orange Labs", "role": "ML Engineer", "duration": "3 ans"}]'::jsonb,
  '[{"school": "Polytechnique Yaoundé", "degree": "Ingénieur Statistique", "year": 2020}]'::jsonb,
  6,
  ARRAY['Français', 'Anglais', 'Peul'],
  ARRAY['Fintech', 'Agritech', 'RH/Emploi'],
  ARRAY['Idea', 'MVP', 'Growth'],
  ARRAY['Yaoundé', 'Remote'],
  '1_MONTH',
  true, true, false, 'PUBLISHED', 90.0, 91.0,
  NOW() - INTERVAL '40 days', NOW() - INTERVAL '1 day'
FROM users WHERE email = 'toto5@gmail.com';

INSERT INTO candidate_profiles (id, user_id, title, bio, location, skills, experience, years_of_experience, languages, desired_sectors, desired_location, availability, status, profile_completeness, quality_score, created_at, updated_at)
SELECT
  'cand_emmanuel_006', id,
  'Business Developer Junior',
  'Jeune diplômé en commerce international. Stage de 6 mois chez Total Energies Cameroun. Motivé et prêt à apprendre.',
  'Douala, Cameroun',
  ARRAY['Sales', 'Marketing Digital', 'CRM', 'Excel', 'PowerPoint'],
  '[{"company": "Total Energies", "role": "Stagiaire Commercial", "duration": "6 mois"}]'::jsonb,
  1,
  ARRAY['Français', 'Anglais'],
  ARRAY['E-commerce', 'Logistique'],
  ARRAY['Douala'],
  'IMMEDIATE',
  'DRAFT', 45.0, 40.0,
  NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
FROM users WHERE email = 'toto6@gmail.com';


-- ============================================
-- 4. CANDIDATURES (Applications)
-- ============================================

-- Sophie postule à MoMo Pay
INSERT INTO applications (id, candidate_id, project_id, status, message, created_at, updated_at)
VALUES (
  'app_001', 'cand_sophie_001', 'proj_momo_pay_001', 'ACCEPTED',
  'Bonjour ! Avec mon expérience chez Jumia et ma maîtrise de React Native et des systèmes de paiement, je suis convaincue de pouvoir apporter une contribution significative à MoMo Pay. Le concept de QR code unifié est brillant.',
  NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days'
);

-- Jean-Pierre postule à MoMo Pay
INSERT INTO applications (id, candidate_id, project_id, status, message, created_at, updated_at)
VALUES (
  'app_002', 'cand_jp_002', 'proj_momo_pay_001', 'PENDING',
  'Mon expertise DevOps et ma connaissance du secteur bancaire camerounais (5 ans chez Afriland) seraient un atout pour scaler MoMo Pay. Je peux mettre en place une infrastructure robuste et sécurisée.',
  NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'
);

-- Patrick postule à DeliverFast
INSERT INTO applications (id, candidate_id, project_id, status, message, created_at, updated_at)
VALUES (
  'app_003', 'cand_patrick_004', 'proj_deliver_005', 'ACCEPTED',
  'Le concept DeliverFast me parle ! J''ai développé l''app MTN MoMo qui gère la géolocalisation en temps réel. Je connais bien les défis techniques du tracking GPS à Douala.',
  NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days'
);

-- Aminata postule à LearnAfrica
INSERT INTO applications (id, candidate_id, project_id, status, message, created_at, updated_at)
VALUES (
  'app_004', 'cand_aminata_003', 'proj_learn_004', 'PENDING',
  'En tant que designer ayant travaillé chez Andela, je connais bien les challenges UX de l''edtech en Afrique. J''aimerais designer l''expérience d''apprentissage mobile de LearnAfrica.',
  NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
);

-- Fatou postule à KmerJobs
INSERT INTO applications (id, candidate_id, project_id, status, message, created_at, updated_at)
VALUES (
  'app_005', 'cand_fatou_005', 'proj_kmerjobs_006', 'PENDING',
  'Le matching IA candidat-emploi est exactement mon domaine d''expertise ! J''ai développé des modèles NLP pour l''analyse de CV en français africain. Ce projet a un potentiel énorme.',
  NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'
);

-- Sophie postule aussi à MediLink
INSERT INTO applications (id, candidate_id, project_id, status, message, created_at, updated_at)
VALUES (
  'app_006', 'cand_sophie_001', 'proj_medilink_003', 'PENDING',
  'La télémédecine est un sujet qui me tient à cœur. Mon expérience en architecture cloud et en systèmes temps réel serait pertinente pour le WebRTC de MediLink.',
  NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'
);

-- Patrick postule à MoMo Pay
INSERT INTO applications (id, candidate_id, project_id, status, message, created_at, updated_at)
VALUES (
  'app_007', 'cand_patrick_004', 'proj_momo_pay_001', 'REJECTED',
  'Développeur mobile React Native avec expérience Mobile Money. Intéressé par le projet MoMo Pay.',
  NOW() - INTERVAL '18 days', NOW() - INTERVAL '14 days'
);

-- Fatou postule à AgriConnect
INSERT INTO applications (id, candidate_id, project_id, status, message, created_at, updated_at)
VALUES (
  'app_008', 'cand_fatou_005', 'proj_agri_002', 'PENDING',
  'L''agritech + l''IA = un combo parfait. Je peux développer des modèles de prédiction des prix agricoles et d''optimisation logistique pour AgriConnect.',
  NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'
);


-- ============================================
-- 5. INTERACTIONS UTILISATEUR-PROJET
-- ============================================

-- Vues sur les projets (simuler du trafic réaliste)
INSERT INTO user_project_interactions (id, user_id, project_id, action, dwell_time_ms, scroll_depth, source, "position", created_at)
SELECT 'upi_' || gen.n, u.id, p.id,
  CASE WHEN gen.n % 5 = 0 THEN 'SAVE'
       WHEN gen.n % 7 = 0 THEN 'SHARE'
       WHEN gen.n % 3 = 0 THEN 'CLICK'
       ELSE 'VIEW' END,
  (random() * 30000 + 2000)::int,
  round((random() * 0.8 + 0.2)::numeric, 2)::float,
  CASE WHEN gen.n % 3 = 0 THEN 'FEED'
       WHEN gen.n % 3 = 1 THEN 'SEARCH'
       ELSE 'DIRECT' END,
  (random() * 20 + 1)::int,
  NOW() - (random() * INTERVAL '30 days')
FROM users u
CROSS JOIN projects p
CROSS JOIN generate_series(1, 3) AS gen(n)
WHERE u.role IN ('CANDIDATE', 'USER')
  AND p.status = 'PUBLISHED'
LIMIT 80;


-- ============================================
-- 6. NOTIFICATIONS
-- ============================================

-- Notifications pour les fondateurs
INSERT INTO notifications (id, user_id, type, title, message, is_read, data, created_at)
SELECT 'notif_001', id, 'APPLICATION_RECEIVED',
  'Nouvelle candidature reçue',
  'Sophie Nguema a postulé à votre projet MoMo Pay',
  true, '{"applicationId": "app_001", "projectId": "proj_momo_pay_001"}'::jsonb,
  NOW() - INTERVAL '20 days'
FROM users WHERE email = 'osw.fotso@gmail.com';

INSERT INTO notifications (id, user_id, type, title, message, is_read, data, created_at)
SELECT 'notif_002', id, 'APPLICATION_RECEIVED',
  'Nouvelle candidature reçue',
  'Jean-Pierre Mbarga a postulé à votre projet MoMo Pay',
  false, '{"applicationId": "app_002", "projectId": "proj_momo_pay_001"}'::jsonb,
  NOW() - INTERVAL '10 days'
FROM users WHERE email = 'osw.fotso@gmail.com';

INSERT INTO notifications (id, user_id, type, title, message, is_read, data, created_at)
SELECT 'notif_003', id, 'APPLICATION_RECEIVED',
  'Nouvelle candidature reçue',
  'Patrick Tchoumi a postulé à votre projet DeliverFast',
  true, '{"applicationId": "app_003", "projectId": "proj_deliver_005"}'::jsonb,
  NOW() - INTERVAL '12 days'
FROM users WHERE email = 'lux.kmer2@gmail.com';

-- Notifications pour les candidats
INSERT INTO notifications (id, user_id, type, title, message, is_read, data, created_at)
SELECT 'notif_004', id, 'APPLICATION_ACCEPTED',
  'Candidature acceptée !',
  'Votre candidature à MoMo Pay a été acceptée. Le fondateur souhaite vous contacter.',
  true, '{"applicationId": "app_001", "projectId": "proj_momo_pay_001"}'::jsonb,
  NOW() - INTERVAL '15 days'
FROM users WHERE email = 'toto@gmail.com';

INSERT INTO notifications (id, user_id, type, title, message, is_read, data, created_at)
SELECT 'notif_005', id, 'APPLICATION_ACCEPTED',
  'Candidature acceptée !',
  'Votre candidature à DeliverFast a été acceptée.',
  false, '{"applicationId": "app_003", "projectId": "proj_deliver_005"}'::jsonb,
  NOW() - INTERVAL '8 days'
FROM users WHERE email = 'toto4@gmail.com';

INSERT INTO notifications (id, user_id, type, title, message, is_read, data, created_at)
SELECT 'notif_006', id, 'SYSTEM',
  'Bienvenue sur MojiraX !',
  'Complétez votre profil pour augmenter vos chances de matcher avec les meilleurs projets.',
  false, NULL,
  NOW() - INTERVAL '3 days'
FROM users WHERE email = 'toto6@gmail.com';

-- Notification de modération
INSERT INTO notifications (id, user_id, type, title, message, is_read, data, created_at)
SELECT 'notif_007', id, 'MODERATION_ALERT',
  'Projet en attente de validation',
  'Votre projet CashFlow est en cours de vérification par notre IA.',
  false, '{"projectId": "proj_cashflow_008"}'::jsonb,
  NOW() - INTERVAL '8 days'
FROM users WHERE email = 'maxpayner237@gmail.com';


-- ============================================
-- 7. MATCH SCORES (scores IA pré-calculés)
-- ============================================

INSERT INTO match_scores (id, candidate_id, project_id, overall_score, skills_match, experience_match, location_match, cultural_fit, ai_reason, ai_confidence, model_version, calculated_at) VALUES
('ms_001', 'cand_sophie_001', 'proj_momo_pay_001', 92.5, 95.0, 90.0, 100.0, 85.0, 'Excellente correspondance technique (React Native, Node.js, PostgreSQL). Expérience directe dans les paiements chez Jumia. Localisation Douala = parfait.', 0.95, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '20 days'),
('ms_002', 'cand_jp_002', 'proj_momo_pay_001', 78.0, 70.0, 85.0, 90.0, 75.0, 'Profil DevOps solide mais le projet cherche d''abord un développeur. Expérience bancaire très pertinente. Bonne synergie potentielle.', 0.82, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '15 days'),
('ms_003', 'cand_patrick_004', 'proj_deliver_005', 88.0, 92.0, 80.0, 100.0, 82.0, 'Expert React Native avec expérience géolocalisation (MTN MoMo). Profil idéal pour le développement mobile de DeliverFast.', 0.91, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '12 days'),
('ms_004', 'cand_aminata_003', 'proj_learn_004', 85.0, 88.0, 82.0, 100.0, 90.0, 'Expérience UX chez Andela (edtech) directement pertinente. Design inclusif = atout majeur pour LearnAfrica.', 0.88, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '5 days'),
('ms_005', 'cand_fatou_005', 'proj_kmerjobs_006', 94.0, 96.0, 92.0, 90.0, 88.0, 'Expertise NLP et scoring crédit directement transférable au matching CV-offres. Meilleur match possible pour ce projet.', 0.97, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '7 days'),
('ms_006', 'cand_sophie_001', 'proj_medilink_003', 75.0, 80.0, 70.0, 85.0, 72.0, 'Bonne développeuse full stack mais pas d''expérience WebRTC spécifique. Potentiel d''apprentissage rapide.', 0.78, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '15 days'),
('ms_007', 'cand_fatou_005', 'proj_agri_002', 82.0, 78.0, 85.0, 80.0, 88.0, 'Compétences ML pertinentes pour la prédiction de prix agricoles. Bonne compréhension du marché africain.', 0.85, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '8 days'),
('ms_008', 'cand_jp_002', 'proj_deliver_005', 70.0, 65.0, 75.0, 90.0, 72.0, 'Profil infra/DevOps utile à terme mais le projet a d''abord besoin d''un dev mobile. Surqualifié pour le stade actuel.', 0.75, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '10 days');


-- ============================================
-- 8. MODERATION LOGS
-- ============================================

INSERT INTO moderation_logs (id, project_id, ai_score, ai_reason, ai_payload, status, reviewed_at) VALUES
('mod_001', 'proj_momo_pay_001', 0.95, 'Projet légitime avec traction démontrable. Pitch clair et réaliste.', '{"category": "FINTECH", "risk": "LOW", "flags": []}'::jsonb, 'PUBLISHED', NOW() - INTERVAL '28 days'),
('mod_002', 'proj_agri_002', 0.88, 'Concept solide. Manque quelques détails sur le modèle logistique.', '{"category": "AGRITECH", "risk": "LOW", "flags": ["incomplete_logistics"]}'::jsonb, 'PUBLISHED', NOW() - INTERVAL '18 days'),
('mod_003', 'proj_medilink_003', 0.92, 'Projet HealthTech avec équipe crédible. Attention à la conformité médicale.', '{"category": "HEALTHTECH", "risk": "MEDIUM", "flags": ["medical_compliance"]}'::jsonb, 'PUBLISHED', NOW() - INTERVAL '43 days'),
('mod_004', 'proj_cashflow_008', 0.72, 'En attente de vérification supplémentaire. Pitch trop vague sur la monétisation.', '{"category": "FINTECH", "risk": "MEDIUM", "flags": ["vague_monetization"]}'::jsonb, 'PENDING_AI', NOW() - INTERVAL '8 days');

INSERT INTO moderation_logs (id, candidate_profile_id, ai_score, ai_reason, status, reviewed_at) VALUES
('mod_005', 'cand_sophie_001', 0.96, 'Profil complet et vérifié. Expérience Jumia confirmable.', 'PUBLISHED', NOW() - INTERVAL '23 days'),
('mod_006', 'cand_jp_002', 0.94, 'Profil senior crédible. Certifications vérifiables.', 'PUBLISHED', NOW() - INTERVAL '33 days'),
('mod_007', 'cand_aminata_003', 0.91, 'Portfolio solide. Expérience Wave et Andela vérifiable.', 'PUBLISHED', NOW() - INTERVAL '16 days');


-- ============================================
-- 9. SEARCH LOGS (historique de recherches)
-- ============================================

INSERT INTO search_logs (id, user_id, query, filters, search_type, results_count, top_result_ids, clicked_result_id, click_position, time_to_click, created_at)
SELECT 'sl_001', id, 'développeur React Native fintech', '{"sector": "Fintech", "location": "Douala"}'::jsonb, 'CANDIDATE', 3, ARRAY['cand_sophie_001', 'cand_patrick_004', 'cand_jp_002'], 'cand_sophie_001', 1, 2500, NOW() - INTERVAL '20 days'
FROM users WHERE email = 'osw.fotso@gmail.com';

INSERT INTO search_logs (id, user_id, query, filters, search_type, results_count, top_result_ids, clicked_result_id, click_position, time_to_click, created_at)
SELECT 'sl_002', id, 'projet fintech cameroun', '{"sector": "Fintech", "stage": "MVP"}'::jsonb, 'PROJECT', 2, ARRAY['proj_momo_pay_001', 'proj_cashflow_008'], 'proj_momo_pay_001', 1, 1800, NOW() - INTERVAL '15 days'
FROM users WHERE email = 'toto@gmail.com';

INSERT INTO search_logs (id, user_id, query, filters, search_type, results_count, top_result_ids, created_at)
SELECT 'sl_003', id, 'data scientist IA', '{"skills": ["Python", "ML"]}'::jsonb, 'CANDIDATE', 1, ARRAY['cand_fatou_005'], NOW() - INTERVAL '7 days'
FROM users WHERE email = 'osw.fotso8@gmail.com';

INSERT INTO search_logs (id, user_id, query, filters, search_type, results_count, top_result_ids, clicked_result_id, click_position, time_to_click, created_at)
SELECT 'sl_004', id, 'startup edtech formation', '{"sector": "EdTech"}'::jsonb, 'PROJECT', 1, ARRAY['proj_learn_004'], 'proj_learn_004', 1, 3200, NOW() - INTERVAL '5 days'
FROM users WHERE email = 'toto2@gmail.com';

INSERT INTO search_logs (id, query, search_type, results_count, top_result_ids, created_at)
VALUES ('sl_005', 'livraison douala', 'PROJECT', 1, ARRAY['proj_deliver_005'], NOW() - INTERVAL '2 days');
