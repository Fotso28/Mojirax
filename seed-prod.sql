-- ==============================================
-- MojiraX — Seed Production Data
-- Tables: pricing_plans, faqs, testimonials
-- Generé le 2026-03-19
-- ==============================================

BEGIN;

-- ========== PRICING PLANS ==========
INSERT INTO pricing_plans (id, name, price, period, currency, description, features, is_popular, is_active, "order", cta_label, created_at, updated_at)
VALUES
  ('plan_free', 'Gratuit', 0, 'mois', 'EUR', 'Parfait pour découvrir MoJiraX et commencer à explorer.', ARRAY['Profil complet','Explorer & matcher','Ajouter des profils en favoris','Accès aux fonctionnalités de base','Découverte de la plateforme pendant 30 jours'], false, true, 0, 'Commencer gratuitement', '2026-03-13T14:55:30.984Z', '2026-03-13T14:55:30.984Z'),
  ('plan_plus', 'Plus', 4.99, 'mois', 'EUR', 'Idéal pour améliorer votre visibilité et augmenter vos chances.', ARRAY['Tout le plan Gratuit','Voir qui a consulté votre profil','Filtres avancés pour trouver des profils plus pertinents','Retour arrière sur le dernier swipe','Plus de visibilité dans les résultats'], false, true, 1, 'Passer au plan Plus', '2026-03-13T14:55:30.984Z', '2026-03-13T14:55:30.984Z'),
  ('plan_pro', 'Pro', 9.99, 'mois', 'EUR', 'Le plan le plus choisi pour multiplier les connexions.', ARRAY['Tout le plan Plus','Voir qui vous a aimé','Messages illimités','5 boosts de visibilité par mois','Accès prioritaire aux profils les plus actifs','Statistiques de profil (vues, matchs, activité)','Badge Pro visible sur votre profil'], true, true, 2, 'Choisir le plan Pro', '2026-03-13T14:55:30.984Z', '2026-03-13T14:55:30.984Z'),
  ('plan_elite', 'Elite', 19.99, 'mois', 'EUR', E'L''expérience MoJiraX la plus complète pour maximiser vos résultats.', ARRAY['Tout le plan Pro','Mise en avant prioritaire dans les recherches','Boosts supplémentaires pour plus de visibilité','Mode navigation privée (profil invisible)','Accès anticipé aux nouvelles fonctionnalités','Support prioritaire','Badge Elite exclusif'], false, true, 3, 'Choisir le plan Elite', '2026-03-13T14:55:30.984Z', '2026-03-13T14:55:30.984Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, period = EXCLUDED.period, currency = EXCLUDED.currency,
  description = EXCLUDED.description, features = EXCLUDED.features, is_popular = EXCLUDED.is_popular,
  is_active = EXCLUDED.is_active, "order" = EXCLUDED."order", cta_label = EXCLUDED.cta_label,
  updated_at = NOW();

-- ========== FAQS ==========
INSERT INTO faqs (id, question, answer, is_active, "order", created_at, updated_at)
VALUES
  ('faq_2', 'Comment garantissez-vous la sécurité des profils ?', E'Chaque profil est vérifié par notre équipe et notre système d''IA. Nous utilisons un processus de modération rigoureux pour garantir la qualité et la sécurité de notre communauté.', true, 1, '2026-03-13T08:28:43.350Z', '2026-03-14T06:34:45.251Z'),
  ('faq_1', E'Est-ce que MojiraX est ouvert à tout le monde ?', 'Oui, MojiraX est ouvert à tous les porteurs de projets et talents intéressés par l''écosystème africain, qu''ils soient sur le continent ou au sein de la diaspora mondiale.', true, 2, '2026-03-13T08:28:43.350Z', '2026-03-14T06:34:45.251Z'),
  ('faq_3', 'Comment fonctionne le matching ?', 'Notre algorithme analyse vos compétences, objectifs et disponibilité pour vous proposer des profils compatibles. Plus votre profil est complet, plus les suggestions sont pertinentes.', true, 3, '2026-03-13T08:28:43.350Z', '2026-03-14T06:34:45.251Z'),
  ('faq_4', 'Quels pays sont couverts ?', 'MojiraX couvre l''Afrique francophone (Cameroun, Sénégal, Côte d''Ivoire, Mali, Bénin...) ainsi que la diaspora (France, Canada, Belgique...).', true, 4, '2026-03-13T08:28:43.350Z', '2026-03-14T06:34:45.251Z'),
  ('faq_5', 'Le plan gratuit est-il vraiment gratuit ?', 'Oui, le plan gratuit est 100% gratuit et sans engagement. Vous pouvez créer votre profil, explorer la plateforme et recevoir 3 matchs par mois sans rien payer.', true, 5, '2026-03-13T08:28:43.350Z', '2026-03-14T06:34:45.251Z')
ON CONFLICT (id) DO UPDATE SET
  question = EXCLUDED.question, answer = EXCLUDED.answer, is_active = EXCLUDED.is_active,
  "order" = EXCLUDED."order", updated_at = NOW();

-- ========== TESTIMONIALS ==========
INSERT INTO testimonials (id, name, role, location, quote, image_url, is_active, "order", created_at, updated_at)
VALUES
  ('test_1', 'Moussa Diop', 'CEO & Founder', 'Sénégal', E'Grâce à MojiraX, j''ai rencontré mon CTO en moins de 3 semaines. Notre startup agritech applique les meilleurs pratiques du Fintech et nous passions à Dakar.', 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=400&h=400&fit=crop&crop=face', true, 1, '2026-03-13T08:28:43.351Z', '2026-03-13T08:28:43.351Z'),
  ('test_2', 'Ana K. Mensah', 'Product Manager', 'Ghana', E'MojiraX à Lomé, je cherchais un cofondateur dans un projet à Accra. Le matching est au niveau des meilleurs que des plateformes.', 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face', true, 2, '2026-03-13T08:28:43.351Z', '2026-03-13T08:28:43.351Z'),
  ('test_3', 'Samuel Chirac', 'Cofondateur', 'Kenya', E'La qualité des profils sur cette plateforme est exceptionnelle. C''est devenu mon outil principal pour sourcer des talents en Afrique de l''Ouest.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face', true, 3, '2026-03-13T08:28:43.351Z', '2026-03-13T08:28:43.351Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, location = EXCLUDED.location, quote = EXCLUDED.quote,
  image_url = EXCLUDED.image_url, is_active = EXCLUDED.is_active, "order" = EXCLUDED."order",
  updated_at = NOW();

COMMIT;
