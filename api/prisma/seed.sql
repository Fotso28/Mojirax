-- ============================================
-- SEED DATA - MojiraX Platform
-- Projet Firebase: mojirax-49d46
-- ============================================
-- Reseed complet 2026-03-13
-- Profils riches, tous les champs remplis
-- Embeddings générés séparément via backfill-embeddings.ts
-- ============================================

-- ============================================
-- 0. NETTOYAGE COMPLET
-- ============================================
TRUNCATE TABLE
  message_reactions,
  messages,
  conversations,
  notifications,
  search_logs,
  user_project_interactions,
  user_visits,
  ad_events,
  ads,
  moderation_logs,
  match_scores,
  unlocks,
  payment_audit_logs,
  transactions,
  applications,
  candidate_profiles,
  projects,
  fcm_tokens,
  email_logs,
  ai_call_logs,
  sessions,
  accounts,
  users,
  filter_embeddings,
  ai_config,
  ai_prompts,
  ad_config,
  push_config,
  email_configs,
  pricing_plans,
  faqs,
  testimonials
CASCADE;

-- ============================================
-- 1. UTILISATEURS (12 users: 6 founders, 6 candidates)
-- ============================================

INSERT INTO users (id, first_name, last_name, name, email, phone, role, image, founder_profile, preferred_lang, created_at, updated_at) VALUES
-- Founders
('user_founder_01', 'Oswaldo', 'Fotso', 'Oswaldo Fotso', 'osw.fotso@gmail.com', '+237690000001', 'FOUNDER', NULL,
  '{"title": "CEO & Serial Entrepreneur", "bio": "Entrepreneur tech avec 12 ans d''expérience dans les fintechs africaines. Ex-directeur technique chez Lygos Pay. Passionné par l''inclusion financière et les paiements mobiles en Afrique centrale.", "skills": ["Product Management", "Fintech", "Mobile Money", "Levée de fonds", "Business Strategy"], "experience": [{"company": "Lygos Pay", "role": "Directeur Technique", "duration": "4 ans"}, {"company": "Orange Money Cameroun", "role": "Chef de Projet Digital", "duration": "3 ans"}, {"company": "MTN Cameroun", "role": "Ingénieur Telecom", "duration": "5 ans"}], "education": [{"school": "ESSEC Douala", "degree": "MBA Entrepreneuriat", "year": 2018}, {"school": "ENSPY Yaoundé", "degree": "Ingénieur Télécommunications", "year": 2014}], "linkedinUrl": "https://linkedin.com/in/oswaldo-fotso", "city": "Douala", "languages": ["Français", "Anglais", "Bamiléké"]}'::jsonb,
  'fr', NOW() - INTERVAL '90 days', NOW() - INTERVAL '2 days'),

('user_founder_02', 'Aïcha', 'Mbarga', 'Aïcha Mbarga', 'aicha.mbarga@gmail.com', '+237690000002', 'FOUNDER', NULL,
  '{"title": "Agronome & Entrepreneure", "bio": "Ingénieure agronome de formation, 8 ans dans la chaîne d''approvisionnement agricole au Cameroun. J''ai géré un réseau de 500 agriculteurs dans la région de l''Ouest. Convaincue que la tech peut nourrir l''Afrique.", "skills": ["Agronomie", "Supply Chain", "Gestion de projet", "Relations agriculteurs", "USSD/Mobile"], "experience": [{"company": "GIC Agri-Ouest", "role": "Directrice Opérations", "duration": "4 ans"}, {"company": "IRAD Cameroun", "role": "Chercheuse Agronome", "duration": "3 ans"}], "education": [{"school": "Université de Dschang", "degree": "Ingénieur Agronome", "year": 2018}], "linkedinUrl": "https://linkedin.com/in/aicha-mbarga", "city": "Douala", "languages": ["Français", "Anglais", "Bamiléké"]}'::jsonb,
  'fr', NOW() - INTERVAL '60 days', NOW() - INTERVAL '5 days'),

('user_founder_03', 'Dr. Fabrice', 'Nganou', 'Dr. Fabrice Nganou', 'fabrice.nganou@gmail.com', '+237690000003', 'FOUNDER', NULL,
  '{"title": "Médecin & Fondateur HealthTech", "bio": "Médecin urgentiste au CHU de Yaoundé pendant 6 ans. Témoin quotidien du manque d''accès aux spécialistes en zone rurale. J''ai décidé de créer la solution technologique qui manque au système de santé camerounais.", "skills": ["Médecine", "Télémédecine", "Gestion hospitalière", "Santé publique", "Fundraising"], "experience": [{"company": "CHU Yaoundé", "role": "Médecin Urgentiste", "duration": "6 ans"}, {"company": "MSF", "role": "Médecin de terrain", "duration": "2 ans"}], "education": [{"school": "Faculté de Médecine Yaoundé I", "degree": "Doctorat en Médecine", "year": 2018}, {"school": "Institut de Santé Publique", "degree": "Master Santé Publique", "year": 2020}], "linkedinUrl": "https://linkedin.com/in/fabrice-nganou", "city": "Yaoundé", "languages": ["Français", "Anglais"]}'::jsonb,
  'fr', NOW() - INTERVAL '75 days', NOW() - INTERVAL '1 day'),

('user_founder_04', 'Serge', 'Kamga', 'Serge Kamga', 'serge.kamga@gmail.com', '+237690000004', 'FOUNDER', NULL,
  '{"title": "EdTech Visionary & Ex-Google", "bio": "10 ans dans la tech dont 4 chez Google (Zurich) en tant que Senior Engineer. De retour au Cameroun pour révolutionner l''éducation professionnelle. Convaincu que les talents africains méritent une formation de classe mondiale.", "skills": ["Software Engineering", "EdTech", "Product Strategy", "Team Building", "Google Cloud"], "experience": [{"company": "Google (Zurich)", "role": "Senior Software Engineer", "duration": "4 ans"}, {"company": "Andela", "role": "Engineering Manager", "duration": "3 ans"}, {"company": "Orange Digital Center", "role": "Formateur Tech", "duration": "2 ans"}], "education": [{"school": "ETH Zurich", "degree": "MSc Computer Science", "year": 2016}, {"school": "Polytechnique Yaoundé", "degree": "Ingénieur Informatique", "year": 2013}], "linkedinUrl": "https://linkedin.com/in/serge-kamga", "city": "Douala", "languages": ["Français", "Anglais", "Allemand"]}'::jsonb,
  'fr', NOW() - INTERVAL '100 days', NOW() - INTERVAL '3 days'),

('user_founder_05', 'Nadège', 'Talla', 'Nadège Talla', 'nadege.talla@gmail.com', '+237690000005', 'FOUNDER', NULL,
  '{"title": "COO & Logistics Expert", "bio": "Experte logistique avec 9 ans d''expérience. Ex-DHL Cameroun. J''ai optimisé des réseaux de livraison dans 5 villes africaines. Le dernier kilomètre en Afrique est un problème que je connais intimement.", "skills": ["Logistique", "Operations Management", "Fleet Management", "Data Analytics", "P&L Management"], "experience": [{"company": "DHL Cameroun", "role": "Directrice Opérations", "duration": "5 ans"}, {"company": "Jumia Logistics", "role": "Responsable Livraison Douala", "duration": "3 ans"}], "education": [{"school": "ESSEC Douala", "degree": "Master Supply Chain Management", "year": 2017}], "linkedinUrl": "https://linkedin.com/in/nadege-talla", "city": "Douala", "languages": ["Français", "Anglais"]}'::jsonb,
  'fr', NOW() - INTERVAL '50 days', NOW() - INTERVAL '1 day'),

('user_founder_06', 'Yves', 'Tchoupo', 'Yves Tchoupo', 'yves.tchoupo@gmail.com', '+237690000006', 'FOUNDER', NULL,
  '{"title": "CTO & AI Enthusiast", "bio": "Ingénieur IA de formation, 6 ans d''expérience en machine learning et NLP. J''ai construit des modèles de scoring crédit pour les populations non-bancarisées. Je veux résoudre le chômage des jeunes par l''IA.", "skills": ["Machine Learning", "NLP", "Python", "Data Science", "Product Management"], "experience": [{"company": "BGFI Bank", "role": "Lead Data Scientist", "duration": "3 ans"}, {"company": "Freelance", "role": "Consultant IA", "duration": "2 ans"}], "education": [{"school": "Polytechnique Yaoundé", "degree": "Ingénieur Statistique & Informatique", "year": 2020}], "linkedinUrl": "https://linkedin.com/in/yves-tchoupo", "city": "Yaoundé", "languages": ["Français", "Anglais"]}'::jsonb,
  'fr', NOW() - INTERVAL '40 days', NOW() - INTERVAL '7 days'),

-- Candidates
('user_cand_01', 'Sophie', 'Nguema', 'Sophie Nguema', 'sophie.nguema@gmail.com', '+237691000001', 'CANDIDATE', NULL, NULL, 'fr', NOW() - INTERVAL '55 days', NOW() - INTERVAL '3 days'),
('user_cand_02', 'Jean-Pierre', 'Mbarga', 'Jean-Pierre Mbarga', 'jp.mbarga@gmail.com', '+237691000002', 'CANDIDATE', NULL, NULL, 'fr', NOW() - INTERVAL '50 days', NOW() - INTERVAL '2 days'),
('user_cand_03', 'Aminata', 'Diallo', 'Aminata Diallo', 'aminata.diallo@gmail.com', '+237691000003', 'CANDIDATE', NULL, NULL, 'fr', NOW() - INTERVAL '40 days', NOW() - INTERVAL '4 days'),
('user_cand_04', 'Patrick', 'Tchoumi', 'Patrick Tchoumi', 'patrick.tchoumi@gmail.com', '+237691000004', 'CANDIDATE', NULL, NULL, 'fr', NOW() - INTERVAL '35 days', NOW() - INTERVAL '6 days'),
('user_cand_05', 'Fatou', 'Bello', 'Fatou Bello', 'fatou.bello@gmail.com', '+237691000005', 'CANDIDATE', NULL, NULL, 'fr', NOW() - INTERVAL '45 days', NOW() - INTERVAL '1 day'),
('user_cand_06', 'Emmanuel', 'Nkeng', 'Emmanuel Nkeng', 'emmanuel.nkeng@gmail.com', '+237691000006', 'CANDIDATE', NULL, NULL, 'fr', NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days');


-- ============================================
-- 2. PROJETS (8 projets réalistes, tous les champs)
-- ============================================

-- Projet 1: MoMo Pay (Fintech) - PUBLISHED
INSERT INTO projects (id, founder_id, slug, name, pitch, description, sector, stage, country, city, location, scope, problem, target, solution_current, solution_desc, uvp, anti_scope, market_type, business_model, competitors, founder_role, time_availability, traction, looking_for_role, collab_type, vision, team_size, funding_status, tech_stack, required_skills, nice_to_have_skills, commitment, is_remote, status, urgency, quality_score, created_at, updated_at)
VALUES (
  'proj_momo_pay_001', 'user_founder_01', 'momo-pay-cameroun',
  'MoMo Pay',
  'La super-app de paiement mobile qui unifie MTN MoMo, Orange Money et Express Union en un seul QR code',
  'MoMo Pay est une application mobile qui résout le problème de fragmentation des paiements mobiles au Cameroun. Aujourd''hui, un commerçant doit afficher 3-4 numéros différents (MTN MoMo, Orange Money, Express Union) et gérer manuellement la réconciliation. Notre solution : un QR code unique par commerçant qui route automatiquement le paiement vers l''opérateur du client. Nous avons déjà 250 commerçants beta-testeurs à Douala avec 15 000 transactions mensuelles.',
  'FINTECH', 'MVP',
  'Cameroun', 'Douala', 'Douala, Cameroun', 'LOCAL',
  'Les commerçants camerounais doivent gérer 3-4 comptes mobile money différents (MTN MoMo, Orange Money, Express Union). La réconciliation est manuelle, les frais de transfert inter-opérateurs sont de 2-3%, et 30% des clients partent quand le commerçant n''accepte pas leur opérateur.',
  'Commerçants urbains (boutiques, restaurants, taxis) et jeunes professionnels 25-40 ans à Douala et Yaoundé. Marché adressable : 200 000 commerçants à Douala.',
  'Les commerçants affichent manuellement leurs numéros MoMo et Orange Money sur des pancartes. Ils notent les transactions dans un cahier.',
  'Application mobile unifiée avec un QR code unique par commerçant. Le paiement est routé automatiquement vers le bon opérateur via notre API d''agrégation. Dashboard web pour la réconciliation en temps réel. SDK pour l''intégration e-commerce.',
  'Un seul QR code, tous les opérateurs. Zéro friction pour le client, réconciliation automatique pour le commerçant.',
  'Pas de crypto, pas de banque traditionnelle, pas de prêt. On se concentre exclusivement sur le paiement quotidien et la réconciliation.',
  'B2B', 'COMMISSION',
  'Lygos Pay (agrégateur mais pas de QR), Maviance (API uniquement, pas d''app commerçant), PayUnit (orienté e-commerce)',
  'CEO', 'FULLTIME',
  '250 commerçants beta-testeurs à Douala. 15 000 transactions/mois. CA : 500 000 FCFA/mois en commissions. Taux de rétention : 85%. Partenariat en cours avec MTN Cameroun.',
  'TECH', 'EQUITY',
  'Devenir le Stripe de l''Afrique centrale. Un co-fondateur technique passionné par les systèmes de paiement, capable de construire une architecture scalable pour 1M+ de transactions/jour.',
  2, 'SEED',
  ARRAY['React Native', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes'],
  ARRAY['React Native', 'Node.js', 'API REST', 'Mobile Money API', 'Architecture microservices'],
  ARRAY['Kubernetes', 'Terraform', 'CI/CD', 'Monitoring'],
  'FULL_TIME', false, 'PUBLISHED', 9, 85.5,
  NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days'
);

-- Projet 2: AgriConnect (Agritech) - PUBLISHED
INSERT INTO projects (id, founder_id, slug, name, pitch, description, sector, stage, country, city, location, scope, problem, target, solution_current, solution_desc, uvp, anti_scope, market_type, business_model, competitors, founder_role, time_availability, traction, looking_for_role, collab_type, vision, team_size, funding_status, tech_stack, required_skills, nice_to_have_skills, commitment, is_remote, status, urgency, quality_score, created_at, updated_at)
VALUES (
  'proj_agri_002', 'user_founder_02', 'agriconnect-cameroun',
  'AgriConnect',
  'La marketplace B2B qui connecte agriculteurs camerounais et acheteurs professionnels sans intermédiaires',
  'AgriConnect digitalise la chaîne d''approvisionnement agricole au Cameroun. Notre plateforme connecte directement les petits agriculteurs avec les restaurants, hôtels et supermarchés. Nous éliminons les 3-4 intermédiaires (buyam-sellam) qui captent 50% de la marge. L''app fonctionne via USSD pour les agriculteurs sans smartphone et via WhatsApp Bot pour les plus connectés.',
  'AGRITECH', 'Idea',
  'Cameroun', 'Bafoussam', 'Bafoussam, Cameroun', 'LOCAL',
  'Les agriculteurs camerounais perdent 30-40% de leur récolte faute d''acheteurs à temps. Les buyam-sellam (intermédiaires) captent 50% de la marge. Aucune transparence sur les prix. Pertes post-récolte massives par manque de logistique froide.',
  'Petits agriculteurs (1-5 hectares) dans les régions de l''Ouest et du Littoral. Côté acheteurs : restaurants, hôtels, cantines scolaires, supermarchés de Douala et Yaoundé.',
  'Les buyam-sellam achètent au village à bas prix et revendent en ville avec 50-80% de marge. Les agriculteurs n''ont aucun pouvoir de négociation.',
  'App mobile simple (USSD + WhatsApp bot pour agriculteurs, web app pour acheteurs). Marketplace avec prix transparents. Logistique intégrée via un réseau de transporteurs partenaires. Paiement mobile money escrow.',
  'Prix transparents, zéro intermédiaire, livraison garantie en 24h depuis le champ jusqu''à la ville.',
  'Pas de transformation alimentaire, pas d''export, pas de produits non-périssables. Focus uniquement sur les fruits, légumes et tubercules frais.',
  'MARKETPLACE', 'COMMISSION',
  'Afrik Market (Côte d''Ivoire, pas au Cameroun), Twiga Foods (Kenya, modèle similaire), aucun concurrent direct au Cameroun',
  'CEO', '10-20H',
  'Étude de marché auprès de 100 agriculteurs. Lettres d''intention de 5 restaurants à Douala. Prototype USSD fonctionnel. Réseau de 50 agriculteurs pré-inscrits.',
  'TECH', 'HYBRID',
  'Nourrir l''Afrique centrale en connectant producteurs et consommateurs. Cherche un CTO capable de construire un système USSD + WhatsApp bot + marketplace web.',
  1, 'BOOTSTRAPPED',
  ARRAY['Next.js', 'Node.js', 'PostgreSQL', 'WhatsApp Business API', 'USSD Gateway'],
  ARRAY['Full Stack', 'Next.js', 'Node.js', 'UX Mobile', 'WhatsApp API'],
  ARRAY['USSD Development', 'Logistique', 'Cartographie'],
  'PART_TIME', true, 'PUBLISHED', 7, 72.0,
  NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days'
);

-- Projet 3: MediLink (HealthTech) - PUBLISHED
INSERT INTO projects (id, founder_id, slug, name, pitch, description, sector, stage, country, city, location, scope, problem, target, solution_current, solution_desc, uvp, anti_scope, market_type, business_model, competitors, founder_role, time_availability, traction, looking_for_role, collab_type, vision, team_size, funding_status, tech_stack, required_skills, nice_to_have_skills, commitment, is_remote, status, urgency, quality_score, created_at, updated_at)
VALUES (
  'proj_medilink_003', 'user_founder_03', 'medilink-sante-afrique',
  'MediLink',
  'La télémédecine accessible pour l''Afrique francophone : consultez un spécialiste en 15 minutes depuis votre téléphone',
  'MediLink connecte les patients africains avec des médecins spécialistes via vidéo consultation optimisée pour les connexions bas débit. Notre algorithme de compression vidéo propriétaire fonctionne même en 2G. Le paiement se fait en mobile money. Nous ciblons d''abord les patients en zones rurales camerounaises et la diaspora qui consulte pour leurs familles restées au pays.',
  'HEALTHTECH', 'MVP',
  'Cameroun', 'Yaoundé', 'Yaoundé, Cameroun', 'DIASPORA',
  'Le Cameroun compte 1 médecin pour 10 000 habitants. Les spécialistes sont concentrés à Douala et Yaoundé. Un patient rural doit voyager 4-8h et dépenser 50 000+ FCFA pour consulter un spécialiste. 60% abandonnent le traitement.',
  'Patients en zones rurales camerounaises. Diaspora camerounaise (France, USA, Canada) consultant pour leurs familles. Entreprises cherchant une couverture santé digitale pour leurs employés.',
  'Les patients voyagent à leurs frais vers les grandes villes. La diaspora envoie de l''argent sans suivi médical. Les médecins ruraux réfèrent par téléphone sans dossier médical.',
  'App de téléconsultation avec vidéo HD optimisée pour connexions lentes (compression propriétaire). Dossier médical digital partagé entre médecins. Paiement mobile money intégré. Ordonnance digitale envoyée à la pharmacie la plus proche.',
  'Consultation spécialisée en 15 min, depuis n''importe où, pour 2 000 FCFA. Vidéo qui fonctionne même en 2G.',
  'Pas de vente de médicaments, pas de diagnostic IA, pas de remplacement du médecin. Nous facilitons l''accès, pas le diagnostic.',
  'B2C', 'SUBSCRIPTION',
  'Docta (Cameroun, mais généralistes seulement), Babyl (Rwanda, anglophone), mDoc (Nigeria, anglophone)',
  'CEO', 'FULLTIME',
  '50 médecins inscrits dont 12 spécialistes. 200 consultations en beta. Note 4.7/5. Partenariat Hôpital Central de Yaoundé. 3 entreprises pilotes.',
  'TECH', 'EQUITY',
  'Devenir le DoctoLib de l''Afrique francophone. Cherche un CTO expert WebRTC et applications temps réel, passionné par l''impact social.',
  3, 'SEED',
  ARRAY['React Native', 'NestJS', 'PostgreSQL', 'WebRTC', 'Redis', 'AWS'],
  ARRAY['React Native', 'WebRTC', 'NestJS', 'Cloud Architecture', 'Video Streaming'],
  ARRAY['IA/ML', 'FHIR/HL7', 'Sécurité données santé'],
  'FULL_TIME', false, 'PUBLISHED', 8, 90.0,
  NOW() - INTERVAL '45 days', NOW() - INTERVAL '1 day'
);

-- Projet 4: LearnAfrica (EdTech) - PUBLISHED
INSERT INTO projects (id, founder_id, slug, name, pitch, description, sector, stage, country, city, location, scope, problem, target, solution_current, solution_desc, uvp, anti_scope, market_type, business_model, competitors, founder_role, time_availability, traction, looking_for_role, collab_type, vision, team_size, funding_status, tech_stack, required_skills, nice_to_have_skills, commitment, is_remote, status, urgency, quality_score, created_at, updated_at)
VALUES (
  'proj_learn_004', 'user_founder_04', 'learn-africa-edtech',
  'LearnAfrica',
  'Formations professionnelles courtes (2-8 semaines) en tech et digital par des mentors africains qui ont réussi',
  'LearnAfrica propose des formations professionnelles intensives (2-8 semaines) en développement web, data science, marketing digital et product management. Tous les formateurs sont des professionnels africains en poste dans des entreprises tech (Google, Meta, Andela). Le contenu est 100% en français, adapté au contexte africain, avec des projets pratiques basés sur des cas réels (mobile money, agritech, etc.).',
  'EDTECH', 'Growth',
  'Cameroun', 'Douala', 'Douala, Cameroun', 'HYBRID',
  'Coursera et Udemy ne sont pas adaptés : contenu en anglais, prix en dollars, pas de mentorat, pas de contexte africain. Le taux de completion sur ces plateformes est de 5% en Afrique. Les formations locales sont trop chères (500 000+ FCFA) et théoriques.',
  'Jeunes diplômés 18-30 ans cherchant leur premier emploi tech. Professionnels 25-40 ans en reconversion digitale. Entreprises formant leurs équipes.',
  'Les jeunes s''inscrivent sur Coursera/Udemy mais abandonnent à 95%. Les formations présentielles coûtent 500 000+ FCFA. Les bootcamps sont quasi inexistants en Afrique francophone.',
  'Micro-learning avec vidéos courtes (5-10 min), quiz interactifs, projets pratiques notés par des pairs. Mentorat hebdomadaire en visio avec un professionnel en poste. Communauté Discord active. Certificat reconnu par les entreprises partenaires.',
  'Apprends un métier digital en 4 semaines avec des mentors africains qui ont réussi chez Google, Andela et Meta. 10x moins cher que les bootcamps.',
  'Pas de diplôme universitaire, pas de formation longue (> 3 mois), pas de présentiel obligatoire.',
  'B2C', 'FREEMIUM',
  'Gomycode (Tunisie, plus cher), Openclassrooms (France, pas adapté Afrique), Moringa School (Kenya, anglophone)',
  'CPO', 'FULLTIME',
  '3 500 apprenants actifs. 12 formations disponibles. Taux de completion : 45% (vs 5% sur Coursera). Partenariats Orange Digital Center et Andela. CA : 2M FCFA/mois.',
  'TECH', 'EQUITY',
  'Passer de 3 500 à 50 000 apprenants en 12 mois. Cherche un CTO fullstack passionné par l''éducation et le video streaming.',
  5, 'SEED',
  ARRAY['Next.js', 'NestJS', 'PostgreSQL', 'AWS S3', 'FFmpeg', 'Redis', 'Stripe'],
  ARRAY['Next.js', 'NestJS', 'Video Streaming', 'AWS', 'PostgreSQL'],
  ARRAY['FFmpeg', 'CDN', 'Analytics', 'Gamification'],
  'FULL_TIME', true, 'PUBLISHED', 6, 88.0,
  NOW() - INTERVAL '60 days', NOW() - INTERVAL '3 days'
);

-- Projet 5: DeliverFast (Logistique) - PUBLISHED
INSERT INTO projects (id, founder_id, slug, name, pitch, description, sector, stage, country, city, location, scope, problem, target, solution_current, solution_desc, uvp, anti_scope, market_type, business_model, competitors, founder_role, time_availability, traction, looking_for_role, collab_type, vision, team_size, funding_status, tech_stack, required_skills, nice_to_have_skills, commitment, is_remote, status, urgency, quality_score, created_at, updated_at)
VALUES (
  'proj_deliver_005', 'user_founder_05', 'deliverfast-livraison',
  'DeliverFast',
  'Livraison express en 2h pour le e-commerce africain via un réseau de moto-taxis certifiés et géolocalisés',
  'DeliverFast est un réseau de livreurs moto-taxis équipés d''une app mobile avec GPS temps réel. Nous offrons la livraison le jour même pour les e-commerçants Instagram/Facebook, restaurants et pharmacies. Notre algorithme d''optimisation de tournée réduit les coûts de 40% par rapport aux services existants.',
  'LOGISTICS', 'MVP',
  'Cameroun', 'Douala', 'Douala, Cameroun', 'LOCAL',
  'La livraison au Cameroun est lente (3-7 jours), chère (2 000-5 000 FCFA) et peu fiable. 40% des commandes e-commerce sont perdues ou retournées à cause de la livraison. Aucun suivi en temps réel. Les livreurs ne sont pas certifiés.',
  'E-commerçants Instagram/Facebook (15 000+ vendeurs actifs à Douala), restaurants, pharmacies. Côté livreurs : moto-taxis cherchant un revenu stable.',
  'Les vendeurs Instagram utilisent des contacts personnels de livreurs. Pas de suivi, pas de garantie, pas de tarif fixe. Le client attend sans information.',
  'App livreur avec GPS temps réel et optimisation de tournée. API d''intégration pour e-commerçants. Suivi SMS/WhatsApp pour le client final. Réseau de 200 moto-taxis certifiés et assurés. Paiement mobile money à la livraison.',
  'Livré en 2h ou remboursé. Le Glovo africain fait par des Africains, adapté aux réalités locales.',
  'Pas de livraison inter-villes (seulement intra-urbain), pas de stockage/entreposage, pas de livraison de colis lourds (> 20kg).',
  'MARKETPLACE', 'COMMISSION',
  'Yango Delivery (limité), Glovo (pas au Cameroun), courriers informels',
  'COO', 'FULLTIME',
  '180 livreurs actifs. 500 livraisons/jour. 15 partenaires e-commerce. CA : 2M FCFA/mois. Temps moyen de livraison : 1h45.',
  'TECH', 'HYBRID',
  'Lancer Yaoundé et Libreville dans 6 mois. Cherche un CTO pour construire l''app livreur, l''algo d''optimisation et l''API e-commerce.',
  4, 'BOOTSTRAPPED',
  ARRAY['React Native', 'Node.js', 'PostgreSQL', 'Redis', 'Google Maps API', 'Socket.io'],
  ARRAY['React Native', 'Node.js', 'Géolocalisation', 'Systèmes temps réel', 'Google Maps API'],
  ARRAY['Algorithmes d''optimisation', 'Kubernetes', 'Analytics'],
  'FULL_TIME', false, 'PUBLISHED', 8, 82.0,
  NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 day'
);

-- Projet 6: KmerJobs (RH/Emploi) - PUBLISHED
INSERT INTO projects (id, founder_id, slug, name, pitch, description, sector, stage, country, city, location, scope, problem, target, solution_current, solution_desc, uvp, anti_scope, market_type, business_model, competitors, founder_role, time_availability, traction, looking_for_role, collab_type, vision, team_size, funding_status, tech_stack, required_skills, nice_to_have_skills, commitment, is_remote, status, urgency, quality_score, created_at, updated_at)
VALUES (
  'proj_kmerjobs_006', 'user_founder_06', 'kmerjobs-emploi',
  'KmerJobs',
  'La plateforme d''emploi intelligente qui matche candidats et entreprises camerounaises par IA et analyse sémantique de CV',
  'KmerJobs utilise l''intelligence artificielle pour matcher automatiquement les candidats avec les offres d''emploi au Cameroun. Notre NLP analyse les CV en français africain (avec les particularités linguistiques locales), suggère des formations complémentaires, et recommande les meilleurs profils aux recruteurs. Nous ciblons le gap entre les 60% de jeunes au chômage et les entreprises qui peinent à recruter.',
  'OTHER', 'Idea',
  'Cameroun', 'Yaoundé', 'Yaoundé, Cameroun', 'HYBRID',
  'Taux de chômage des jeunes > 60% au Cameroun. Les plateformes existantes (Emploi.cm, Kerawa) sont basiques : pas de matching intelligent, pas d''analyse de CV, pas de suggestion de formation. Les recruteurs passent 20h/semaine à trier des CV.',
  'Jeunes diplômés camerounais 20-35 ans en recherche d''emploi. Entreprises locales et multinationales recrutant au Cameroun. Cabinets de recrutement.',
  'Les candidats postulent en masse sur Emploi.cm (100+ candidatures/offre). Les recruteurs trient manuellement. Pas de matching, pas de recommandation, pas de suivi.',
  'Plateforme IA qui analyse sémantiquement les CV (OCR + NLP français africain), extrait les compétences, matche automatiquement avec les offres. Score de compatibilité candidat-offre. Suggestions de formations pour combler les gaps. Dashboard recruteur avec filtres intelligents.',
  'L''IA qui trouve ton emploi idéal en 48h. Matching intelligent, pas du spam de CV.',
  'Pas de portail d''annonces classique. Pas de formation directe (on redirige vers nos partenaires). Pas de freelancing.',
  'MARKETPLACE', 'FREEMIUM',
  'Emploi.cm (basique), Kerawa (généraliste), LinkedIn (peu utilisé au Cameroun)',
  'CTO', '5-10H',
  'Prototype Figma validé. Enquête auprès de 200 jeunes diplômés. 3 entreprises partenaires prêtes à tester. POC NLP fonctionnel sur 500 CV.',
  'BIZ', 'EQUITY',
  'Cherche un co-fondateur business/sales pour la stratégie commerciale, les partenariats entreprises et la levée de fonds.',
  1, 'BOOTSTRAPPED',
  ARRAY['Next.js', 'Python', 'FastAPI', 'PostgreSQL', 'OpenAI API', 'Redis'],
  ARRAY['Business Development', 'Sales B2B', 'Marketing Digital', 'Partenariats'],
  ARRAY['Fundraising', 'Growth Hacking', 'RH/Recrutement'],
  'PART_TIME', true, 'PUBLISHED', 5, 65.0,
  NOW() - INTERVAL '10 days', NOW() - INTERVAL '7 days'
);

-- Projet 7: SafeRide (Transport) - DRAFT
INSERT INTO projects (id, founder_id, slug, name, pitch, description, sector, stage, country, city, location, scope, problem, target, founder_role, time_availability, looking_for_role, collab_type, status, urgency, quality_score, tech_stack, required_skills, created_at, updated_at)
VALUES (
  'proj_saferide_007', 'user_founder_01', 'saferide-transport',
  'SafeRide',
  'Covoiturage sécurisé pour les trajets interurbains au Cameroun avec vérification d''identité et suivi GPS',
  'Service de covoiturage interurbain sécurisé. Vérification d''identité des conducteurs, suivi GPS en temps réel, partage de trajet avec proches. Focus sur l''axe Douala-Yaoundé (2M+ voyageurs/an).',
  'LOGISTICS', 'Idea',
  'Cameroun', 'Douala', 'Douala, Cameroun', 'LOCAL',
  'Les bus interurbains sont dangereux (accidents fréquents). Les véhicules personnels roulent souvent à moitié vides. Aucune solution de covoiturage structurée au Cameroun.',
  'Voyageurs interurbains, professionnels navette Douala-Yaoundé, étudiants.',
  'CEO', '2-5H', 'TECH', 'EQUITY',
  'DRAFT', 3, 30.0,
  ARRAY[]::text[], ARRAY[]::text[],
  NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
);

-- Projet 8: CashFlow (Fintech) - PENDING_AI
INSERT INTO projects (id, founder_id, slug, name, pitch, description, sector, stage, country, city, location, scope, problem, target, solution_desc, uvp, market_type, business_model, founder_role, time_availability, looking_for_role, collab_type, status, urgency, quality_score, tech_stack, required_skills, created_at, updated_at)
VALUES (
  'proj_cashflow_008', 'user_founder_02', 'cashflow-comptabilite',
  'CashFlow',
  'La comptabilité simplifiée pour les PME camerounaises : photo de reçu = écriture comptable par IA',
  'CashFlow transforme la comptabilité des PME camerounaises. L''app mobile permet de photographier un reçu qui est automatiquement converti en écriture comptable par OCR + IA. Conforme au plan comptable OHADA. Export PDF pour le comptable.',
  'FINTECH', 'Idea',
  'Cameroun', 'Douala', 'Douala, Cameroun', 'LOCAL',
  '90% des PME camerounaises n''ont pas de comptabilité formelle. Risque d''amendes fiscales. Les comptables sont chers (100 000+ FCFA/mois).',
  'PME et micro-entreprises (CA < 100M FCFA/an). Artisans, commerçants, restaurateurs.',
  'App mobile de comptabilité simplifiée. Photo de reçu = écriture comptable automatique par OCR + IA. Tableau de bord financier temps réel. Export conforme plan comptable OHADA.',
  'Ta comptabilité en 5 minutes par jour, depuis ton téléphone. Conforme OHADA.',
  'B2B', 'SUBSCRIPTION',
  'CEO', '10-20H', 'TECH', 'HYBRID',
  'PENDING_AI', 4, 55.0,
  ARRAY['React Native', 'NestJS', 'PostgreSQL', 'Tesseract OCR']::text[],
  ARRAY['React Native', 'NestJS', 'OCR', 'Comptabilité OHADA']::text[],
  NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'
);


-- ============================================
-- 3. PROFILS CANDIDATS (6 candidats, tous les champs)
-- ============================================

-- Sophie Nguema - Full Stack Senior
INSERT INTO candidate_profiles (id, user_id, title, bio, location, linkedin_url, portfolio_url, github_url, skills, experience, education, years_of_experience, languages, certifications, short_pitch, long_pitch, vision, role_type, commitment_type, collab_pref, location_pref, has_cofounded, desired_sectors, desired_stage, desired_location, min_salary, max_salary, availability, willing_to_relocate, remote_only, is_contact_visible, status, profile_completeness, quality_score, created_at, updated_at) VALUES
('cand_sophie_001', 'user_cand_01',
  'Développeuse Full Stack Senior — React, Node.js, Python',
  'Développeuse passionnée avec 7 ans d''expérience en développement web et mobile. Ex-Jumia Tech où j''ai construit le système de paiement qui traite 50 000 transactions/jour. Spécialisée dans les architectures microservices, les systèmes de paiement et le scaling d''applications à forte charge. Je cherche un projet à fort impact social en Afrique, idéalement dans la fintech ou la healthtech.',
  'Douala, Cameroun',
  'https://linkedin.com/in/sophie-nguema',
  'https://sophie-nguema.dev',
  'https://github.com/sophie-nguema',
  ARRAY['React', 'React Native', 'Node.js', 'Python', 'PostgreSQL', 'Docker', 'AWS', 'TypeScript', 'Redis', 'GraphQL', 'NestJS', 'MongoDB'],
  '[{"company": "Jumia Tech", "role": "Senior Full Stack Developer", "duration": "3 ans", "description": "Développement du système de paiement (50K transactions/jour). Migration microservices. Équipe de 8 devs."}, {"company": "Freelance", "role": "Développeuse Full Stack", "duration": "2 ans", "description": "Clients : 3 fintechs camerounaises. Apps React Native + backend Node.js."}, {"company": "Orange Cameroun", "role": "Développeuse Backend", "duration": "2 ans", "description": "API Orange Money. Intégration partenaires."}]'::jsonb,
  '[{"school": "Université de Douala", "degree": "Master Informatique", "year": 2019}, {"school": "Udacity", "degree": "Nanodegree React", "year": 2020}]'::jsonb,
  7,
  ARRAY['Français', 'Anglais'],
  ARRAY['AWS Certified Solutions Architect', 'Meta React Native Certification'],
  'Développeuse full stack senior avec 7 ans d''expérience et un track record dans les systèmes de paiement à haute charge.',
  'Après 3 ans chez Jumia Tech où j''ai construit et scalé le système de paiement à 50 000 transactions/jour, je cherche maintenant un projet early-stage ambitieux où je peux avoir un vrai impact en tant que cofondatrice technique. Mon expertise couvre le full stack (React/Node.js/Python), les architectures microservices, et les systèmes de paiement mobile money. J''ai aussi une solide expérience DevOps (Docker, AWS, CI/CD). Je suis motivée par les projets à impact social en Afrique.',
  'Je veux contribuer à construire l''infrastructure tech qui va permettre l''inclusion financière de millions d''Africains.',
  'TECH', 'FULLTIME', 'EQUITY', 'HYBRID', 'NO',
  ARRAY['FINTECH', 'HEALTHTECH', 'EDTECH'],
  ARRAY['MVP', 'Growth'],
  ARRAY['Douala', 'Remote'],
  500000, 1500000,
  'IMMEDIATE', false, false, true, 'PUBLISHED', 95.0, 88.5,
  NOW() - INTERVAL '25 days', NOW() - INTERVAL '3 days'
);

-- Jean-Pierre Mbarga - Cloud & DevOps
INSERT INTO candidate_profiles (id, user_id, title, bio, location, linkedin_url, github_url, skills, experience, education, years_of_experience, languages, certifications, short_pitch, long_pitch, vision, role_type, commitment_type, collab_pref, location_pref, has_cofounded, desired_sectors, desired_stage, desired_location, availability, willing_to_relocate, remote_only, is_contact_visible, status, profile_completeness, quality_score, created_at, updated_at) VALUES
('cand_jp_002', 'user_cand_02',
  'Architecte Cloud & DevOps — Kubernetes, Terraform, AWS/GCP',
  'Ingénieur DevOps avec 10 ans d''expérience dans les infrastructures critiques. J''ai scalé les systèmes d''Afriland First Bank de 100K à 1M+ utilisateurs. Expert Kubernetes (CKA certifié), Terraform et CI/CD. Passionné par l''infrastructure cloud en Afrique où la fiabilité est un vrai défi (coupures réseau, latence, coûts cloud élevés). Je cherche un projet tech ambitieux qui a besoin d''une infrastructure solide.',
  'Yaoundé, Cameroun',
  'https://linkedin.com/in/jp-mbarga',
  'https://github.com/jp-mbarga',
  ARRAY['Kubernetes', 'Terraform', 'AWS', 'GCP', 'Docker', 'CI/CD', 'Python', 'Go', 'Monitoring', 'Prometheus', 'Grafana', 'Linux', 'Ansible'],
  '[{"company": "Afriland First Bank", "role": "Lead DevOps Engineer", "duration": "5 ans", "description": "Migration cloud complète. Kubernetes en production. 99.9% uptime. Équipe de 4."}, {"company": "Orange Cameroun", "role": "Administrateur Systèmes Senior", "duration": "3 ans", "description": "Gestion infrastructure télécom. 500+ serveurs. Monitoring 24/7."}, {"company": "Freelance", "role": "Consultant Cloud", "duration": "2 ans", "description": "Clients : 5 startups africaines. Migration AWS/GCP."}]'::jsonb,
  '[{"school": "ENSPY Yaoundé", "degree": "Ingénieur Informatique", "year": 2016}, {"school": "Linux Foundation", "degree": "CKA - Certified Kubernetes Administrator", "year": 2022}]'::jsonb,
  10,
  ARRAY['Français', 'Anglais'],
  ARRAY['AWS Certified DevOps Engineer Professional', 'CKA - Certified Kubernetes Administrator', 'Terraform Associate'],
  'Architecte cloud/DevOps senior avec 10 ans d''expérience. J''ai scalé Afriland First Bank à 1M+ utilisateurs.',
  'Mon parcours de 10 ans dans les infrastructures critiques (banque, télécom) m''a appris à construire des systèmes résilients dans le contexte africain. Chez Afriland, j''ai migré toute l''infrastructure vers Kubernetes, atteignant 99.9% de uptime. Je maîtrise l''ensemble de la stack DevOps (Terraform, Ansible, CI/CD, monitoring) et je suis capable de construire une infrastructure production-ready depuis zéro. Je cherche un projet ambitieux qui a besoin de scaler rapidement.',
  'Rendre l''infrastructure cloud accessible et fiable pour les startups africaines.',
  'TECH', 'SERIOUS', 'EQUITY', 'HYBRID', 'NO',
  ARRAY['FINTECH', 'LOGISTICS', 'HEALTHTECH'],
  ARRAY['MVP', 'Growth'],
  ARRAY['Yaoundé', 'Douala', 'Remote'],
  '1_MONTH', true, false, false, 'PUBLISHED', 96.0, 92.0,
  NOW() - INTERVAL '35 days', NOW() - INTERVAL '2 days'
);

-- Aminata Diallo - Product Designer
INSERT INTO candidate_profiles (id, user_id, title, bio, location, linkedin_url, portfolio_url, skills, experience, education, years_of_experience, languages, certifications, short_pitch, long_pitch, vision, role_type, commitment_type, collab_pref, location_pref, has_cofounded, desired_sectors, desired_stage, desired_location, availability, willing_to_relocate, remote_only, is_contact_visible, status, profile_completeness, quality_score, created_at, updated_at) VALUES
('cand_aminata_003', 'user_cand_03',
  'Product Designer & UX Researcher — Design inclusif pour marchés émergents',
  'Designer UX/UI avec 5 ans d''expérience spécialisée dans le design inclusif pour les marchés émergents africains. Chez Wave (Sénégal), j''ai redesigné le parcours d''envoi d''argent qui est passé de 5 étapes à 2, augmentant les conversions de 35%. Chez Andela, j''ai créé le design system utilisé par 500K+ utilisateurs. Je comprends les contraintes des utilisateurs africains : petits écrans, connexions lentes, faible alphabétisation digitale.',
  'Douala, Cameroun',
  'https://linkedin.com/in/aminata-diallo',
  'https://aminata-design.com',
  ARRAY['Figma', 'UX Research', 'UI Design', 'Design System', 'Prototyping', 'User Testing', 'Adobe XD', 'Framer', 'Design Thinking', 'Accessibilité'],
  '[{"company": "Wave (Sénégal)", "role": "Product Designer", "duration": "2 ans", "description": "Redesign parcours paiement. +35% conversion. Design system mobile-first."}, {"company": "Andela", "role": "UX Designer", "duration": "3 ans", "description": "Design system pour 500K+ utilisateurs. User research dans 4 pays africains."}]'::jsonb,
  '[{"school": "ISM Dakar", "degree": "Master Design Digital & Innovation", "year": 2021}, {"school": "Google", "degree": "UX Design Professional Certificate", "year": 2022}]'::jsonb,
  5,
  ARRAY['Français', 'Anglais', 'Wolof'],
  ARRAY['Google UX Design Certificate', 'Nielsen Norman Group UX Certification'],
  'Product designer spécialisée dans le design inclusif pour l''Afrique. Ex-Wave, ex-Andela.',
  'Mon expérience chez Wave et Andela m''a donné une compréhension profonde des utilisateurs africains. Je sais designer pour les contraintes réelles : petits écrans Android, connexions 2G/3G, utilisateurs pas toujours à l''aise avec le digital. Chez Wave, j''ai réduit le parcours d''envoi d''argent de 5 à 2 étapes, augmentant les conversions de 35%. Je cherche un projet early-stage où le design peut faire la différence entre adoption et abandon.',
  'Rendre la technologie accessible à tous les Africains, pas seulement aux 10% les plus connectés.',
  'PRODUCT', 'SERIOUS', 'EQUITY', 'REMOTE', 'NO',
  ARRAY['FINTECH', 'EDTECH', 'HEALTHTECH'],
  ARRAY['Idea', 'MVP'],
  ARRAY['Douala', 'Remote'],
  'IMMEDIATE', false, true, true, 'PUBLISHED', 92.0, 85.0,
  NOW() - INTERVAL '18 days', NOW() - INTERVAL '4 days'
);

-- Patrick Tchoumi - Mobile Developer
INSERT INTO candidate_profiles (id, user_id, title, bio, location, linkedin_url, github_url, skills, experience, education, years_of_experience, languages, certifications, short_pitch, long_pitch, vision, role_type, commitment_type, collab_pref, location_pref, has_cofounded, desired_sectors, desired_stage, desired_location, min_salary, max_salary, availability, willing_to_relocate, remote_only, is_contact_visible, status, profile_completeness, quality_score, created_at, updated_at) VALUES
('cand_patrick_004', 'user_cand_04',
  'Développeur Mobile Senior — React Native, Flutter, iOS/Android',
  'Développeur mobile spécialisé React Native et Flutter avec 4 ans d''expérience dans les apps de paiement et e-commerce. Chez MTN Mobile Money, j''ai développé le module de paiement QR code utilisé par 2M+ de personnes. Contributeur open source actif (3 packages npm publiés). Je cherche un projet mobile-first ambitieux, idéalement dans la fintech ou la logistique.',
  'Douala, Cameroun',
  'https://linkedin.com/in/patrick-tchoumi',
  'https://github.com/patrick-tchoumi',
  ARRAY['React Native', 'Flutter', 'TypeScript', 'Firebase', 'REST API', 'GraphQL', 'iOS', 'Android', 'Redux', 'MobX', 'Jest', 'Detox'],
  '[{"company": "MTN Mobile Money", "role": "Senior Mobile Developer", "duration": "2 ans", "description": "Module QR code paiement (2M+ utilisateurs). Performance optimization. CI/CD mobile."}, {"company": "Freelance", "role": "Développeur Mobile", "duration": "2 ans", "description": "5 apps publiées sur Play Store. Clients : e-commerce, fintech, logistique."}]'::jsonb,
  '[{"school": "IUT Douala", "degree": "DUT Génie Informatique", "year": 2022}, {"school": "Meta", "degree": "React Native Certification", "year": 2023}]'::jsonb,
  4,
  ARRAY['Français', 'Anglais'],
  ARRAY['Google Associate Android Developer', 'Meta React Native Certification'],
  'Développeur mobile React Native/Flutter avec 4 ans d''expérience. Ex-MTN Mobile Money.',
  'Après 2 ans chez MTN Mobile Money où j''ai développé le module QR code utilisé par 2M+ personnes, je cherche un projet early-stage mobile-first. Ma force : je suis capable de livrer une app production-ready en 6-8 semaines, de l''UI au déploiement. J''ai publié 5 apps sur Play Store et 3 packages npm open source. Je suis passionné par la performance mobile et l''UX sur les appareils Android bas de gamme.',
  'Créer des apps mobiles qui fonctionnent parfaitement sur tous les téléphones africains, même les entrée de gamme.',
  'TECH', 'FULLTIME', 'HYBRID', 'HYBRID', 'NO',
  ARRAY['FINTECH', 'LOGISTICS', 'ECOMMERCE'],
  ARRAY['MVP', 'Growth'],
  ARRAY['Douala'],
  400000, 1000000,
  'IMMEDIATE', false, false, true, 'PUBLISHED', 85.0, 78.0,
  NOW() - INTERVAL '12 days', NOW() - INTERVAL '6 days'
);

-- Fatou Bello - Data Scientist
INSERT INTO candidate_profiles (id, user_id, title, bio, location, linkedin_url, github_url, skills, experience, education, years_of_experience, languages, certifications, short_pitch, long_pitch, vision, role_type, commitment_type, collab_pref, location_pref, has_cofounded, desired_sectors, desired_stage, desired_location, availability, willing_to_relocate, remote_only, is_contact_visible, status, profile_completeness, quality_score, created_at, updated_at) VALUES
('cand_fatou_005', 'user_cand_05',
  'Data Scientist & ML Engineer — NLP, Computer Vision, MLOps',
  'Data scientist avec 6 ans d''expérience en machine learning appliqué. Chez BGFI Bank, j''ai développé un modèle de scoring crédit pour les populations non-bancarisées qui a permis d''accorder 10 000+ micro-crédits. Chez Orange Labs, j''ai travaillé sur la détection de fraude en temps réel (NLP + anomaly detection). Experte en NLP français/langues africaines et computer vision. Je cherche un projet où l''IA peut avoir un impact social massif.',
  'Yaoundé, Cameroun',
  'https://linkedin.com/in/fatou-bello',
  'https://github.com/fatou-bello',
  ARRAY['Python', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision', 'SQL', 'Spark', 'MLOps', 'Scikit-learn', 'Pandas', 'Docker', 'FastAPI'],
  '[{"company": "BGFI Bank", "role": "Senior Data Scientist", "duration": "3 ans", "description": "Scoring crédit non-bancarisés (10K+ micro-crédits). Détection fraude NLP. Équipe de 3 data scientists."}, {"company": "Orange Labs Cameroun", "role": "ML Engineer", "duration": "3 ans", "description": "Détection fraude temps réel. NLP français africain. Pipeline MLOps."}]'::jsonb,
  '[{"school": "Polytechnique Yaoundé", "degree": "Ingénieur Statistique & Informatique", "year": 2020}, {"school": "Coursera/Stanford", "degree": "Deep Learning Specialization", "year": 2021}]'::jsonb,
  6,
  ARRAY['Français', 'Anglais', 'Peul'],
  ARRAY['AWS Machine Learning Specialty', 'TensorFlow Developer Certificate', 'Deep Learning Specialization (Stanford/Coursera)'],
  'Data scientist senior spécialisée NLP et scoring crédit. Ex-BGFI Bank, ex-Orange Labs.',
  'Mon parcours de 6 ans en data science appliquée m''a permis de développer des modèles ML qui ont un vrai impact : le scoring crédit chez BGFI a permis 10 000+ micro-crédits pour des personnes non-bancarisées. Chez Orange Labs, j''ai construit un système de détection de fraude en temps réel. Ma spécialité : le NLP adapté au français africain et aux langues locales. Je cherche un projet ambitieux où l''IA peut transformer un secteur entier.',
  'Utiliser l''IA pour résoudre les grands problèmes africains : accès au crédit, emploi, agriculture.',
  'TECH', 'SERIOUS', 'EQUITY', 'REMOTE', 'YES',
  ARRAY['FINTECH', 'AGRITECH', 'OTHER'],
  ARRAY['Idea', 'MVP', 'Growth'],
  ARRAY['Yaoundé', 'Remote'],
  '1_MONTH', true, true, false, 'PUBLISHED', 93.0, 91.0,
  NOW() - INTERVAL '40 days', NOW() - INTERVAL '1 day'
);

-- Emmanuel Nkeng - Business Developer Junior (DRAFT)
INSERT INTO candidate_profiles (id, user_id, title, bio, location, skills, experience, education, years_of_experience, languages, short_pitch, role_type, commitment_type, desired_sectors, desired_location, availability, status, profile_completeness, quality_score, created_at, updated_at) VALUES
('cand_emmanuel_006', 'user_cand_06',
  'Business Developer Junior',
  'Jeune diplômé en commerce international avec un stage de 6 mois chez TotalEnergies Cameroun au département commercial. Motivé, dynamique et prêt à apprendre. Je cherche un projet startup où je peux développer mes compétences en vente et marketing digital.',
  'Douala, Cameroun',
  ARRAY['Sales', 'Marketing Digital', 'CRM', 'Excel', 'PowerPoint', 'Négociation'],
  '[{"company": "TotalEnergies Cameroun", "role": "Stagiaire Commercial", "duration": "6 mois", "description": "Prospection B2B. Gestion portefeuille de 20 stations-service. Reporting commercial."}]'::jsonb,
  '[{"school": "Université de Douala", "degree": "Licence Commerce International", "year": 2025}]'::jsonb,
  1,
  ARRAY['Français', 'Anglais'],
  'Jeune diplômé motivé en commerce, stage chez TotalEnergies.',
  'BIZ', 'SIDE',
  ARRAY['ECOMMERCE', 'LOGISTICS'],
  ARRAY['Douala'],
  'IMMEDIATE', 'DRAFT', 45.0, 40.0,
  NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
);


-- ============================================
-- 4. CANDIDATURES (Applications)
-- ============================================

INSERT INTO applications (id, candidate_id, project_id, status, message, created_at, updated_at) VALUES
('app_001', 'cand_sophie_001', 'proj_momo_pay_001', 'ACCEPTED',
  'Bonjour Oswaldo ! Avec mes 3 ans chez Jumia Tech où j''ai construit le système de paiement à 50K transactions/jour, et ma maîtrise de React Native et Node.js, je suis convaincue de pouvoir être la CTO que MoMo Pay mérite. J''ai aussi travaillé sur l''API Orange Money pendant 2 ans.',
  NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days'),

('app_002', 'cand_jp_002', 'proj_momo_pay_001', 'PENDING',
  'Mon expertise DevOps et ma connaissance du secteur bancaire camerounais (5 ans chez Afriland First Bank, migration Kubernetes, 99.9% uptime) seraient un atout majeur pour scaler l''infrastructure de MoMo Pay quand vous passerez de 15K à 1M+ de transactions.',
  NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

('app_003', 'cand_patrick_004', 'proj_deliver_005', 'ACCEPTED',
  'Le concept DeliverFast me parle énormément ! Chez MTN Mobile Money, j''ai développé le module QR code avec géolocalisation temps réel pour 2M+ utilisateurs. Je maîtrise React Native, Google Maps API et les systèmes temps réel — exactement votre stack.',
  NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days'),

('app_004', 'cand_aminata_003', 'proj_learn_004', 'PENDING',
  'En tant que designer ayant travaillé 3 ans chez Andela (design system pour 500K+ users) et 2 ans chez Wave, je connais intimement les challenges UX de l''edtech en Afrique. Mon expertise en design inclusif peut augmenter votre taux de completion de 45% à 70%.',
  NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

('app_005', 'cand_fatou_005', 'proj_kmerjobs_006', 'PENDING',
  'Le matching IA candidat-emploi est exactement mon domaine d''expertise ! Chez BGFI Bank, j''ai développé des modèles NLP pour l''analyse de CV en français africain. Mon scoring crédit a permis 10K+ micro-crédits. Je peux construire le cœur IA de KmerJobs.',
  NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

('app_006', 'cand_sophie_001', 'proj_medilink_003', 'PENDING',
  'La télémédecine est un sujet qui me tient à cœur. Mon expérience en architecture cloud (AWS, Docker, microservices) et en systèmes temps réel serait pertinente pour le WebRTC de MediLink. J''ai aussi de l''expérience avec NestJS.',
  NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),

('app_007', 'cand_patrick_004', 'proj_momo_pay_001', 'REJECTED',
  'Développeur mobile React Native avec expérience Mobile Money chez MTN. Intéressé par le projet MoMo Pay pour le développement de l''app mobile.',
  NOW() - INTERVAL '18 days', NOW() - INTERVAL '14 days'),

('app_008', 'cand_fatou_005', 'proj_agri_002', 'PENDING',
  'L''agritech + l''IA = un combo parfait. Avec mon expérience en ML chez Orange Labs et BGFI, je peux développer des modèles de prédiction de prix agricoles et d''optimisation des récoltes. Le NLP peut aussi servir pour le chatbot WhatsApp d''AgriConnect.',
  NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days');


-- ============================================
-- 5. CONVERSATIONS & MESSAGES (pour les candidatures ACCEPTED)
-- ============================================

-- Conversation 1: Sophie <-> Oswaldo (MoMo Pay) - candidature app_001 ACCEPTED
INSERT INTO conversations (id, application_id, founder_id, candidate_id, last_message_at, last_message_preview, created_at, updated_at) VALUES
('conv_001', 'app_001', 'user_founder_01', 'user_cand_01',
  NOW() - INTERVAL '2 days',
  'Super, on se voit lundi à 10h au Hilton Douala ?',
  NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days');

INSERT INTO messages (id, conversation_id, sender_id, content, status, delivered_at, read_at, created_at) VALUES
('msg_001', 'conv_001', 'user_founder_01', 'Bonjour Sophie ! Merci pour ta candidature. Ton profil est exactement ce qu''on cherche pour MoMo Pay. Ton expérience chez Jumia Tech sur le système de paiement est très pertinente. Es-tu disponible pour un call cette semaine ?', 'READ', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days' + INTERVAL '2 hours', NOW() - INTERVAL '15 days'),
('msg_002', 'conv_001', 'user_cand_01', 'Bonjour Oswaldo ! Merci beaucoup, le projet MoMo Pay m''enthousiasme vraiment. Le problème de fragmentation des paiements mobiles, je le vis au quotidien. Je suis disponible mercredi ou jeudi, à l''heure qui t''arrange.', 'READ', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days' + INTERVAL '4 hours', NOW() - INTERVAL '14 days'),
('msg_003', 'conv_001', 'user_founder_01', 'Parfait ! Mercredi 14h ça te va ? Je te propose un appel Google Meet de 45 min. Je t''enverrai le lien.', 'READ', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days' + INTERVAL '1 hour', NOW() - INTERVAL '13 days'),
('msg_004', 'conv_001', 'user_cand_01', 'Mercredi 14h c''est noté ! J''ai préparé quelques questions sur l''architecture technique et le partenariat avec MTN. À mercredi !', 'READ', NOW() - INTERVAL '13 days' + INTERVAL '2 hours', NOW() - INTERVAL '12 days', NOW() - INTERVAL '13 days' + INTERVAL '2 hours'),
('msg_005', 'conv_001', 'user_founder_01', 'L''appel était top Sophie ! J''ai adoré tes idées sur l''architecture event-driven et le cache Redis pour les transactions. On aimerait te proposer le poste de CTO avec 25% d''equity. On en discute en personne ?', 'READ', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '3 hours', NOW() - INTERVAL '10 days'),
('msg_006', 'conv_001', 'user_cand_01', 'Wow, je suis très honorée ! 25% d''equity c''est sérieux. J''aimerais qu''on discute aussi du vesting schedule et de la roadmap technique sur les 6 prochains mois. Quand est-ce qu''on peut se voir ?', 'READ', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days' + INTERVAL '2 hours', NOW() - INTERVAL '9 days'),
('msg_007', 'conv_001', 'user_founder_01', 'Super, on se voit lundi à 10h au Hilton Douala ?', 'DELIVERED', NOW() - INTERVAL '2 days', NULL, NOW() - INTERVAL '2 days');

-- Conversation 2: Patrick <-> Nadège (DeliverFast) - candidature app_003 ACCEPTED
INSERT INTO conversations (id, application_id, founder_id, candidate_id, last_message_at, last_message_preview, created_at, updated_at) VALUES
('conv_002', 'app_003', 'user_founder_05', 'user_cand_04',
  NOW() - INTERVAL '3 days',
  'J''ai hâte de commencer ! Je vais déjà regarder l''API Google Maps pour le routing.',
  NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 days');

INSERT INTO messages (id, conversation_id, sender_id, content, status, delivered_at, read_at, created_at) VALUES
('msg_008', 'conv_002', 'user_founder_05', 'Salut Patrick ! Ta candidature pour DeliverFast m''a beaucoup plu. Ton expérience avec le QR code et la géolocalisation chez MTN MoMo est exactement ce dont on a besoin. Tu es dispo pour un échange ?', 'READ', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '1 hour', NOW() - INTERVAL '8 days'),
('msg_009', 'conv_002', 'user_cand_04', 'Salut Nadège ! Merci, DeliverFast me passionne. La livraison dernier kilomètre en Afrique c''est un problème que j''aimerais résoudre. Je suis dispo tous les jours cette semaine.', 'READ', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '2 hours', NOW() - INTERVAL '7 days'),
('msg_010', 'conv_002', 'user_founder_05', 'Génial ! On s''est vus hier et j''ai été impressionnée. Tes idées sur l''algo d''optimisation de tournée sont pertinentes. Je te propose de rejoindre l''équipe en tant que Lead Mobile Developer. On commence par l''app livreur.', 'READ', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '3 hours', NOW() - INTERVAL '5 days'),
('msg_011', 'conv_002', 'user_cand_04', 'J''accepte avec plaisir ! L''app livreur c''est le cœur du produit. J''ai hâte de commencer ! Je vais déjà regarder l''API Google Maps pour le routing.', 'READ', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '1 hour', NOW() - INTERVAL '3 days');


-- ============================================
-- 6. MATCH SCORES (scores IA pré-calculés)
-- ============================================

INSERT INTO match_scores (id, candidate_id, project_id, overall_score, skills_match, experience_match, location_match, cultural_fit, "aiReason", ai_confidence, model_version, calculated_at) VALUES
('ms_001', 'cand_sophie_001', 'proj_momo_pay_001', 94.5, 96.0, 93.0, 100.0, 89.0,
  'Excellente correspondance technique : React Native, Node.js, PostgreSQL, Redis, Docker — tous dans le stack MoMo Pay. Expérience directe dans les systèmes de paiement chez Jumia (50K transactions/jour). Localisation parfaite (Douala). Motivation forte pour la fintech.', 0.96, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '20 days'),

('ms_002', 'cand_jp_002', 'proj_momo_pay_001', 78.0, 65.0, 88.0, 90.0, 75.0,
  'Profil DevOps/infra solide mais le projet cherche d''abord un développeur full stack. Excellente expérience bancaire (Afriland, 1M+ users). Utile en phase de scaling. Les compétences Kubernetes et Terraform seront critiques plus tard.', 0.82, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '15 days'),

('ms_003', 'cand_patrick_004', 'proj_deliver_005', 91.0, 95.0, 84.0, 100.0, 87.0,
  'Expert React Native avec expérience directe en géolocalisation temps réel (MTN MoMo, 2M+ users). Stack parfaitement aligné. Compétences Firebase et Socket.io pertinentes pour le temps réel. Localisation idéale (Douala).', 0.93, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '12 days'),

('ms_004', 'cand_aminata_003', 'proj_learn_004', 86.0, 90.0, 83.0, 100.0, 92.0,
  'Expérience UX chez Andela (500K+ users) directement pertinente pour une plateforme edtech. Design inclusif = atout majeur pour des apprenants avec des niveaux de littératie digitale variés. Expérience Wave montre capacité à simplifier des parcours complexes.', 0.89, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '5 days'),

('ms_005', 'cand_fatou_005', 'proj_kmerjobs_006', 96.0, 98.0, 94.0, 90.0, 92.0,
  'Match quasi parfait : expertise NLP français africain + scoring crédit + ML appliqué. A déjà construit exactement ce type de système chez BGFI (analyse CV, scoring). Python, FastAPI, PostgreSQL dans le stack du projet. La meilleure candidate possible pour ce projet.', 0.97, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '7 days'),

('ms_006', 'cand_sophie_001', 'proj_medilink_003', 75.0, 78.0, 72.0, 85.0, 72.0,
  'Bonne développeuse full stack mais pas d''expérience WebRTC spécifique. Compétences NestJS et cloud pertinentes. Moins de fit culturel que pour la fintech (sa passion principale).', 0.78, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '15 days'),

('ms_007', 'cand_fatou_005', 'proj_agri_002', 82.0, 78.0, 85.0, 80.0, 88.0,
  'Compétences ML très pertinentes pour la prédiction de prix agricoles et l''optimisation logistique. Expertise NLP utile pour le chatbot WhatsApp. Pas dans le stack principal (Next.js, Node.js) mais compétences transférables.', 0.85, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '8 days'),

('ms_008', 'cand_jp_002', 'proj_deliver_005', 70.0, 60.0, 78.0, 90.0, 72.0,
  'Profil infra/DevOps utile à terme mais DeliverFast a d''abord besoin d''un dev mobile. Kubernetes et monitoring seront critiques en phase de scaling (500+ livreurs). Bon plan B.', 0.75, 'gpt-4-turbo-2024-01', NOW() - INTERVAL '10 days');


-- ============================================
-- 7. NOTIFICATIONS
-- ============================================

INSERT INTO notifications (id, user_id, type, title, message, is_read, data, created_at) VALUES
('notif_001', 'user_founder_01', 'APPLICATION_RECEIVED', 'Nouvelle candidature reçue', 'Sophie Nguema a postulé à votre projet MoMo Pay', true, '{"applicationId": "app_001", "projectId": "proj_momo_pay_001"}'::jsonb, NOW() - INTERVAL '20 days'),
('notif_002', 'user_founder_01', 'APPLICATION_RECEIVED', 'Nouvelle candidature reçue', 'Jean-Pierre Mbarga a postulé à votre projet MoMo Pay', false, '{"applicationId": "app_002", "projectId": "proj_momo_pay_001"}'::jsonb, NOW() - INTERVAL '10 days'),
('notif_003', 'user_founder_05', 'APPLICATION_RECEIVED', 'Nouvelle candidature reçue', 'Patrick Tchoumi a postulé à votre projet DeliverFast', true, '{"applicationId": "app_003", "projectId": "proj_deliver_005"}'::jsonb, NOW() - INTERVAL '12 days'),
('notif_004', 'user_cand_01', 'APPLICATION_ACCEPTED', 'Candidature acceptée !', 'Votre candidature à MoMo Pay a été acceptée. Le fondateur souhaite vous contacter.', true, '{"applicationId": "app_001", "projectId": "proj_momo_pay_001"}'::jsonb, NOW() - INTERVAL '15 days'),
('notif_005', 'user_cand_04', 'APPLICATION_ACCEPTED', 'Candidature acceptée !', 'Votre candidature à DeliverFast a été acceptée par Nadège Talla.', true, '{"applicationId": "app_003", "projectId": "proj_deliver_005"}'::jsonb, NOW() - INTERVAL '8 days'),
('notif_006', 'user_cand_06', 'WELCOME', 'Bienvenue sur MojiraX !', 'Complétez votre profil pour augmenter vos chances de matcher avec les meilleurs projets africains.', false, NULL, NOW() - INTERVAL '3 days'),
('notif_007', 'user_founder_02', 'MODERATION_ALERT', 'Projet en attente de validation', 'Votre projet CashFlow est en cours de vérification par notre IA.', false, '{"projectId": "proj_cashflow_008"}'::jsonb, NOW() - INTERVAL '8 days'),
('notif_008', 'user_founder_04', 'APPLICATION_RECEIVED', 'Nouvelle candidature reçue', 'Aminata Diallo a postulé à votre projet LearnAfrica', false, '{"applicationId": "app_004", "projectId": "proj_learn_004"}'::jsonb, NOW() - INTERVAL '5 days'),
('notif_009', 'user_founder_06', 'APPLICATION_RECEIVED', 'Nouvelle candidature reçue', 'Fatou Bello a postulé à votre projet KmerJobs', false, '{"applicationId": "app_005", "projectId": "proj_kmerjobs_006"}'::jsonb, NOW() - INTERVAL '7 days'),
('notif_010', 'user_cand_01', 'MESSAGE_RECEIVED', 'Nouveau message', 'Oswaldo Fotso vous a envoyé un message à propos de MoMo Pay', true, '{"conversationId": "conv_001"}'::jsonb, NOW() - INTERVAL '10 days'),
('notif_011', 'user_cand_04', 'MESSAGE_RECEIVED', 'Nouveau message', 'Nadège Talla vous a envoyé un message à propos de DeliverFast', true, '{"conversationId": "conv_002"}'::jsonb, NOW() - INTERVAL '5 days');


-- ============================================
-- 8. MODERATION LOGS
-- ============================================

INSERT INTO moderation_logs (id, project_id, ai_score, ai_reason, ai_payload, status, reviewed_at) VALUES
('mod_001', 'proj_momo_pay_001', 0.95, 'Projet fintech légitime avec traction démontrée (250 commerçants, 15K transactions/mois). Pitch clair, problème bien défini, solution réaliste. Fondateur crédible (ex-Lygos Pay, ex-Orange Money).', '{"category": "FINTECH", "risk": "LOW", "flags": [], "strengths": ["traction", "founder_experience", "clear_pitch"]}'::jsonb, 'PUBLISHED', NOW() - INTERVAL '28 days'),
('mod_002', 'proj_agri_002', 0.88, 'Concept agritech solide adressant un problème réel (pertes post-récolte). Fondatrice avec expérience agricole pertinente. Manque quelques détails sur le modèle logistique et la cold chain.', '{"category": "AGRITECH", "risk": "LOW", "flags": ["incomplete_logistics"], "strengths": ["founder_domain_expertise", "real_problem"]}'::jsonb, 'PUBLISHED', NOW() - INTERVAL '18 days'),
('mod_003', 'proj_medilink_003', 0.92, 'Projet HealthTech avec fondateur médecin (crédibilité forte). MVP fonctionnel. Attention à la conformité réglementaire médicale au Cameroun. Partenariat hospitalier existant.', '{"category": "HEALTHTECH", "risk": "MEDIUM", "flags": ["medical_compliance_needed"], "strengths": ["founder_is_doctor", "hospital_partnership", "working_mvp"]}'::jsonb, 'PUBLISHED', NOW() - INTERVAL '43 days'),
('mod_004', 'proj_learn_004', 0.94, 'Plateforme edtech avec traction significative (3500 apprenants, 45% completion). Fondateur ex-Google avec réseau. Partenariats Orange Digital Center et Andela. Business model freemium cohérent.', '{"category": "EDTECH", "risk": "LOW", "flags": [], "strengths": ["strong_traction", "founder_google", "strategic_partnerships"]}'::jsonb, 'PUBLISHED', NOW() - INTERVAL '58 days'),
('mod_005', 'proj_deliver_005', 0.90, 'Logistique dernier kilomètre avec traction opérationnelle (180 livreurs, 500 livraisons/jour). Fondatrice ex-DHL/Jumia Logistics crédible. Modèle éprouvé dans d''autres marchés (Glovo, Bolt Food).', '{"category": "LOGISTICS", "risk": "LOW", "flags": ["competition_risk"], "strengths": ["operational_traction", "founder_logistics_expert"]}'::jsonb, 'PUBLISHED', NOW() - INTERVAL '13 days'),
('mod_006', 'proj_kmerjobs_006', 0.80, 'Concept IA emploi intéressant mais au stade idée. POC NLP fonctionnel encourageant. Fondateur technique crédible. Risque : marché emploi très compétitif. Besoin d''un co-fondateur business.', '{"category": "HR_TECH", "risk": "MEDIUM", "flags": ["idea_stage", "needs_business_cofounder"], "strengths": ["technical_founder", "working_poc"]}'::jsonb, 'PUBLISHED', NOW() - INTERVAL '9 days'),
('mod_007', 'proj_cashflow_008', 0.72, 'En attente de vérification supplémentaire. Pitch comptabilité PME intéressant mais trop vague sur la monétisation et la conformité OHADA. Besoin de précisions techniques sur l''OCR.', '{"category": "FINTECH", "risk": "MEDIUM", "flags": ["vague_monetization", "ohada_compliance_unclear", "ocr_feasibility"], "strengths": ["real_pain_point"]}'::jsonb, 'PENDING_AI', NOW() - INTERVAL '8 days');

INSERT INTO moderation_logs (id, candidate_profile_id, ai_score, ai_reason, status, reviewed_at) VALUES
('mod_008', 'cand_sophie_001', 0.96, 'Profil complet et crédible. Expérience Jumia Tech vérifiable. Compétences techniques solides et diversifiées. Certifications AWS et Meta.', 'PUBLISHED', NOW() - INTERVAL '23 days'),
('mod_009', 'cand_jp_002', 0.94, 'Profil senior très crédible. 10 ans d''expérience vérifiable (Afriland, Orange). Certifications CKA et AWS DevOps Professional. Expertise infrastructure rare en Afrique.', 'PUBLISHED', NOW() - INTERVAL '33 days'),
('mod_010', 'cand_aminata_003', 0.92, 'Portfolio design solide. Expérience Wave et Andela vérifiable. Spécialisation design inclusif pertinente pour le marché africain. Certifications Google et Nielsen Norman.', 'PUBLISHED', NOW() - INTERVAL '16 days'),
('mod_011', 'cand_patrick_004', 0.88, 'Développeur mobile avec expérience MTN Mobile Money vérifiable. Packages npm publiés. Profil junior-senior en croissance.', 'PUBLISHED', NOW() - INTERVAL '10 days'),
('mod_012', 'cand_fatou_005', 0.95, 'Profil data science exceptionnel. Expérience BGFI Bank et Orange Labs vérifiable. Certifications AWS ML et TensorFlow. Expertise NLP français africain rare et précieuse.', 'PUBLISHED', NOW() - INTERVAL '38 days');


-- ============================================
-- 9. INTERACTIONS UTILISATEUR-PROJET
-- ============================================

INSERT INTO user_project_interactions (id, user_id, project_id, action, dwell_time_ms, scroll_depth, source, "position", created_at) VALUES
('upi_01', 'user_cand_01', 'proj_momo_pay_001', 'VIEW', 25000, 0.98, 'FEED', 1, NOW() - INTERVAL '25 days'),
('upi_02', 'user_cand_01', 'proj_momo_pay_001', 'CLICK', 8000, 0.80, 'FEED', 1, NOW() - INTERVAL '24 days'),
('upi_03', 'user_cand_01', 'proj_momo_pay_001', 'APPLY', 3000, 1.0, 'DIRECT', NULL, NOW() - INTERVAL '20 days'),
('upi_04', 'user_cand_01', 'proj_medilink_003', 'VIEW', 18000, 0.75, 'SEARCH', 2, NOW() - INTERVAL '20 days'),
('upi_05', 'user_cand_01', 'proj_medilink_003', 'SAVE', 1500, 0.80, 'SEARCH', 2, NOW() - INTERVAL '19 days'),
('upi_06', 'user_cand_02', 'proj_momo_pay_001', 'VIEW', 22000, 0.92, 'FEED', 1, NOW() - INTERVAL '15 days'),
('upi_07', 'user_cand_02', 'proj_momo_pay_001', 'APPLY', 2000, 1.0, 'DIRECT', NULL, NOW() - INTERVAL '10 days'),
('upi_08', 'user_cand_02', 'proj_deliver_005', 'VIEW', 5000, 0.40, 'FEED', 3, NOW() - INTERVAL '14 days'),
('upi_09', 'user_cand_03', 'proj_learn_004', 'VIEW', 20000, 0.90, 'SEARCH', 1, NOW() - INTERVAL '10 days'),
('upi_10', 'user_cand_03', 'proj_learn_004', 'SAVE', 2000, 0.95, 'DIRECT', 1, NOW() - INTERVAL '9 days'),
('upi_11', 'user_cand_03', 'proj_learn_004', 'APPLY', 3500, 1.0, 'DIRECT', NULL, NOW() - INTERVAL '5 days'),
('upi_12', 'user_cand_04', 'proj_deliver_005', 'VIEW', 28000, 0.98, 'FEED', 2, NOW() - INTERVAL '13 days'),
('upi_13', 'user_cand_04', 'proj_deliver_005', 'APPLY', 2500, 1.0, 'DIRECT', NULL, NOW() - INTERVAL '12 days'),
('upi_14', 'user_cand_04', 'proj_momo_pay_001', 'VIEW', 10000, 0.60, 'FEED', 1, NOW() - INTERVAL '19 days'),
('upi_15', 'user_cand_05', 'proj_kmerjobs_006', 'VIEW', 30000, 0.99, 'SEARCH', 1, NOW() - INTERVAL '8 days'),
('upi_16', 'user_cand_05', 'proj_kmerjobs_006', 'APPLY', 4000, 1.0, 'DIRECT', NULL, NOW() - INTERVAL '7 days'),
('upi_17', 'user_cand_05', 'proj_agri_002', 'VIEW', 15000, 0.78, 'FEED', 4, NOW() - INTERVAL '9 days'),
('upi_18', 'user_cand_05', 'proj_agri_002', 'SAVE', 1500, 0.85, 'DIRECT', 1, NOW() - INTERVAL '8 days');


-- ============================================
-- 10. SEARCH LOGS
-- ============================================

INSERT INTO search_logs (id, user_id, query, filters, search_type, results_count, top_result_ids, clicked_result_id, click_position, time_to_click, created_at) VALUES
('sl_001', 'user_founder_01', 'développeur React Native fintech paiement mobile', '{"sector": "FINTECH", "location": "Douala"}'::jsonb, 'SEMANTIC_HYBRID', 3, ARRAY['cand_sophie_001', 'cand_patrick_004', 'cand_jp_002'], 'cand_sophie_001', 1, 2500, NOW() - INTERVAL '20 days'),
('sl_002', 'user_cand_01', 'projet fintech paiement mobile Cameroun', '{"sector": "FINTECH", "stage": "MVP"}'::jsonb, 'SEMANTIC_HYBRID', 2, ARRAY['proj_momo_pay_001', 'proj_cashflow_008'], 'proj_momo_pay_001', 1, 1800, NOW() - INTERVAL '15 days'),
('sl_003', 'user_founder_06', 'data scientist intelligence artificielle NLP machine learning', '{"skills": ["Python", "ML", "NLP"]}'::jsonb, 'SEMANTIC_HYBRID', 1, ARRAY['cand_fatou_005'], 'cand_fatou_005', 1, 3000, NOW() - INTERVAL '7 days'),
('sl_004', 'user_cand_03', 'startup edtech formation en ligne Afrique', '{"sector": "EDTECH"}'::jsonb, 'SEMANTIC_HYBRID', 1, ARRAY['proj_learn_004'], 'proj_learn_004', 1, 3200, NOW() - INTERVAL '5 days'),
('sl_005', 'user_cand_05', 'projet agriculture technologie IA', '{"sector": "AGRITECH"}'::jsonb, 'SEMANTIC_HYBRID', 1, ARRAY['proj_agri_002'], 'proj_agri_002', 1, 2800, NOW() - INTERVAL '9 days'),
('sl_006', 'user_founder_05', 'développeur mobile géolocalisation temps réel livraison', NULL, 'UNIVERSAL', 2, ARRAY['cand_patrick_004', 'cand_sophie_001'], 'cand_patrick_004', 1, 2100, NOW() - INTERVAL '13 days');


-- ============================================
-- 11. CONFIGS (AI + Ads + Push + Email)
-- ============================================

INSERT INTO ai_config (id, default_provider, embedding_provider, provider_per_action, models, max_tokens, moderation_thresholds, matching_weights, updated_at)
VALUES ('singleton', 'DEEPSEEK', 'JINA', '{}', '{}', 4096,
  '{"publishMin": 0.7, "rejectMax": 0.3}'::jsonb,
  '{"skills": 40, "experience": 20, "location": 15, "culture": 25}'::jsonb,
  NOW());

INSERT INTO ad_config (id, feed_insert_every, feed_randomize, sidebar_max_ads, banner_enabled, search_insert_position, updated_at)
VALUES ('singleton', 8, true, 2, true, 1, NOW());

INSERT INTO push_config (id, enabled, enabled_types, updated_at)
VALUES ('singleton', true,
  ARRAY['SYSTEM', 'APPLICATION_RECEIVED', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED', 'MODERATION_ALERT', 'DOCUMENT_ANALYZED', 'DOCUMENT_ANALYSIS_FAILED', 'PROFILE_PUBLISHED', 'PROFILE_REVIEW', 'PROFILE_UNLOCKED', 'MESSAGE_RECEIVED'],
  NOW());

INSERT INTO email_configs (id, enabled, enabled_types, from_name, from_email, updated_at)
VALUES ('singleton', true,
  ARRAY['SYSTEM', 'APPLICATION_RECEIVED', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED', 'MODERATION_ALERT', 'DOCUMENT_ANALYZED', 'DOCUMENT_ANALYSIS_FAILED', 'PROFILE_PUBLISHED', 'PROFILE_REVIEW', 'PROFILE_UNLOCKED', 'WELCOME', 'ONBOARDING_REMINDER', 'MESSAGE_RECEIVED'],
  'MojiraX', 'noreply@mojirax.com', NOW());


-- ============================================
-- 12. FILTER EMBEDDINGS (Skills sémantiques)
-- Les embeddings seront générés par backfill-embeddings.ts
-- ============================================

INSERT INTO filter_embeddings (id, type, value, label, usage_count, updated_at) VALUES
-- Tech skills
('fe_001', 'SKILL', 'React', 'React', 45, NOW()),
('fe_002', 'SKILL', 'React Native', 'React Native', 38, NOW()),
('fe_003', 'SKILL', 'Node.js', 'Node.js', 42, NOW()),
('fe_004', 'SKILL', 'Python', 'Python', 35, NOW()),
('fe_005', 'SKILL', 'TypeScript', 'TypeScript', 30, NOW()),
('fe_006', 'SKILL', 'PostgreSQL', 'PostgreSQL', 28, NOW()),
('fe_007', 'SKILL', 'Docker', 'Docker', 25, NOW()),
('fe_008', 'SKILL', 'AWS', 'AWS', 22, NOW()),
('fe_009', 'SKILL', 'Kubernetes', 'Kubernetes', 15, NOW()),
('fe_010', 'SKILL', 'Terraform', 'Terraform', 12, NOW()),
('fe_011', 'SKILL', 'Redis', 'Redis', 20, NOW()),
('fe_012', 'SKILL', 'NestJS', 'NestJS', 18, NOW()),
('fe_013', 'SKILL', 'Next.js', 'Next.js', 25, NOW()),
('fe_014', 'SKILL', 'Flutter', 'Flutter', 15, NOW()),
('fe_015', 'SKILL', 'Firebase', 'Firebase', 20, NOW()),
('fe_016', 'SKILL', 'GraphQL', 'GraphQL', 14, NOW()),
('fe_017', 'SKILL', 'MongoDB', 'MongoDB', 12, NOW()),
('fe_018', 'SKILL', 'Go', 'Go', 8, NOW()),
('fe_019', 'SKILL', 'Figma', 'Figma', 22, NOW()),
('fe_020', 'SKILL', 'UX Design', 'UX Design', 18, NOW()),
('fe_021', 'SKILL', 'UI Design', 'UI Design', 16, NOW()),
('fe_022', 'SKILL', 'WebRTC', 'WebRTC', 5, NOW()),
('fe_023', 'SKILL', 'CI/CD', 'CI/CD', 20, NOW()),
('fe_024', 'SKILL', 'TensorFlow', 'TensorFlow', 10, NOW()),
('fe_025', 'SKILL', 'PyTorch', 'PyTorch', 8, NOW()),
('fe_026', 'SKILL', 'NLP', 'NLP (Traitement du langage)', 7, NOW()),
('fe_027', 'SKILL', 'Computer Vision', 'Computer Vision', 5, NOW()),
('fe_028', 'SKILL', 'MLOps', 'MLOps', 6, NOW()),
('fe_029', 'SKILL', 'FastAPI', 'FastAPI', 10, NOW()),
('fe_030', 'SKILL', 'SQL', 'SQL', 30, NOW()),
-- Business skills
('fe_031', 'SKILL', 'Business Development', 'Business Development', 20, NOW()),
('fe_032', 'SKILL', 'Sales', 'Ventes / Sales', 18, NOW()),
('fe_033', 'SKILL', 'Marketing Digital', 'Marketing Digital', 22, NOW()),
('fe_034', 'SKILL', 'Product Management', 'Product Management', 15, NOW()),
('fe_035', 'SKILL', 'Fundraising', 'Levée de fonds', 8, NOW()),
('fe_036', 'SKILL', 'Growth Hacking', 'Growth Hacking', 10, NOW()),
-- Domain skills
('fe_037', 'SKILL', 'Mobile Money API', 'Mobile Money API', 12, NOW()),
('fe_038', 'SKILL', 'Géolocalisation', 'Géolocalisation / GPS', 8, NOW()),
('fe_039', 'SKILL', 'Video Streaming', 'Video Streaming', 6, NOW()),
('fe_040', 'SKILL', 'USSD Development', 'Développement USSD', 4, NOW()),
('fe_041', 'SKILL', 'WhatsApp API', 'WhatsApp Business API', 7, NOW()),
('fe_042', 'SKILL', 'OCR', 'OCR (Reconnaissance optique)', 5, NOW()),
('fe_043', 'SKILL', 'Design System', 'Design System', 12, NOW()),
('fe_044', 'SKILL', 'User Testing', 'User Testing / Tests utilisateurs', 10, NOW()),
('fe_045', 'SKILL', 'Prototyping', 'Prototypage', 14, NOW()),
('fe_046', 'SKILL', 'Spark', 'Apache Spark', 4, NOW()),
('fe_047', 'SKILL', 'Monitoring', 'Monitoring / Observabilité', 10, NOW()),
('fe_048', 'SKILL', 'Linux', 'Linux / Administration système', 15, NOW()),
('fe_049', 'SKILL', 'REST API', 'API REST', 35, NOW());

-- ============================================
-- LANDING PAGE CONTENT
-- ============================================

INSERT INTO pricing_plans (id, name, price, period, currency, description, features, is_popular, is_active, "order", cta_label, created_at, updated_at) VALUES

('plan_free', 'Gratuit', 0, 'mois', 'EUR',
 'Parfait pour découvrir MoJiraX et commencer à explorer.',
 ARRAY['Profil complet', 'Explorer & matcher', 'Ajouter des profils en favoris', 'Accès aux fonctionnalités de base', 'Découverte de la plateforme pendant 30 jours'],
 false, true, 0, 'Commencer gratuitement', NOW(), NOW()),

('plan_plus', 'Plus', 4.99, 'mois', 'EUR',
 'Idéal pour améliorer votre visibilité et augmenter vos chances.',
 ARRAY['Tout le plan Gratuit', 'Voir qui a consulté votre profil', 'Filtres avancés pour trouver des profils plus pertinents', 'Retour arrière sur le dernier swipe', 'Plus de visibilité dans les résultats'],
 false, true, 1, 'Passer au plan Plus', NOW(), NOW()),

('plan_pro', 'Pro', 9.99, 'mois', 'EUR',
 'Le plan le plus choisi pour multiplier les connexions.',
 ARRAY['Tout le plan Plus', 'Voir qui vous a aimé', 'Messages illimités', '5 boosts de visibilité par mois', 'Accès prioritaire aux profils les plus actifs', 'Statistiques de profil (vues, matchs, activité)', 'Badge Pro visible sur votre profil'],
 true, true, 2, 'Choisir le plan Pro', NOW(), NOW()),

('plan_elite', 'Elite', 19.99, 'mois', 'EUR',
 'L''expérience MoJiraX la plus complète pour maximiser vos résultats.',
 ARRAY['Tout le plan Pro', 'Mise en avant prioritaire dans les recherches', 'Boosts supplémentaires pour plus de visibilité', 'Mode navigation privée (profil invisible)', 'Accès anticipé aux nouvelles fonctionnalités', 'Support prioritaire', 'Badge Elite exclusif'],
 false, true, 3, 'Choisir le plan Elite', NOW(), NOW());

INSERT INTO faqs (id, question, answer, is_active, "order", created_at, updated_at) VALUES
('faq_1', 'Est-ce que MojiraX est ouvert à tout le monde ?', 'Oui, MojiraX est ouvert à tous les porteurs de projets et talents intéressés par l''écosystème africain, qu''ils soient sur le continent ou au sein de la diaspora mondiale.', true, 1, NOW(), NOW()),
('faq_2', 'Comment garantissez-vous la sécurité des profils ?', 'Chaque profil est vérifié par notre équipe et notre système d''IA. Nous utilisons un processus de modération rigoureux pour garantir la qualité et la sécurité de notre communauté.', true, 2, NOW(), NOW()),
('faq_3', 'Comment fonctionne le matching ?', 'Notre algorithme analyse vos compétences, objectifs et disponibilité pour vous proposer des profils compatibles. Plus votre profil est complet, plus les suggestions sont pertinentes.', true, 3, NOW(), NOW()),
('faq_4', 'Quels pays sont couverts ?', 'MojiraX couvre l''Afrique francophone (Cameroun, Sénégal, Côte d''Ivoire, Mali, Bénin...) ainsi que la diaspora (France, Canada, Belgique...).', true, 4, NOW(), NOW()),
('faq_5', 'Le plan gratuit est-il vraiment gratuit ?', 'Oui, le plan gratuit est 100%% gratuit et sans engagement. Vous pouvez créer votre profil, explorer la plateforme et recevoir 3 matchs par mois sans rien payer.', true, 5, NOW(), NOW());

INSERT INTO testimonials (id, name, role, location, quote, image_url, is_active, "order", created_at, updated_at) VALUES
('test_1', 'Moussa Diop', 'CEO & Founder', 'Sénégal', 'Grâce à MojiraX, j''ai rencontré mon CTO en moins de 3 semaines. Notre startup agritech applique les meilleurs pratiques du Fintech et nous passions à Dakar.', 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=400&h=400&fit=crop&crop=face', true, 1, NOW(), NOW()),
('test_2', 'Ana K. Mensah', 'Product Manager', 'Ghana', 'MojiraX à Lomé, je cherchais un cofondateur dans un projet à Accra. Le matching est au niveau des meilleurs que des plateformes.', 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face', true, 2, NOW(), NOW()),
('test_3', 'Samuel Chirac', 'Cofondateur', 'Kenya', 'La qualité des profils sur cette plateforme est exceptionnelle. C''est devenu mon outil principal pour sourcer des talents en Afrique de l''Ouest.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face', true, 3, NOW(), NOW());
