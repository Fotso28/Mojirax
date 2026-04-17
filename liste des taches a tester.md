 1. Auth & Onboarding                                                                                                                   
                                                                                                                                         
  - 1.1 Login (Email, Google, LinkedIn) → /login                                                                                         
  - 1.2 Sync Firebase → POST /auth/sync                                                                                                  
  - 1.3 Choix de rôle (Founder/Candidate) → /onboarding/role                                                                             
  - 1.4 Onboarding Founder → /onboarding/founder
  - 1.5 Onboarding Candidate → /onboarding/candidate
  - 1.6 Upload avatar → POST /users/avatar

  2. Profil utilisateur

  - 2.1 Voir mon profil → /profile
  - 2.2 Modifier mon profil → PATCH /users/profile
  - 2.3 Profil candidat (créer/modifier) → POST/PATCH /users/candidate-profile
  - 2.4 Mode invisible → PATCH /users/invisible
  - 2.5 Vues de mon profil → GET /users/profile-views
  - 2.6 Statistiques profil → GET /users/stats
  - 2.7 Features utilisateur → GET /users/features

  3. Projets

  - 3.1 Créer un projet (wizard) → /create/project
  - 3.2 Créer depuis document (IA) → POST /projects/from-document
  - 3.3 Valider un projet (IA) → POST /projects/validate
  - 3.4 Régénérer un bloc (IA) → POST /projects/:id/regenerate-block
  - 3.5 Modifier un projet → /modify/project + PATCH /projects/:id
  - 3.6 Supprimer un projet → DELETE /projects/:id
  - 3.7 Publier un projet → POST /projects/:id/publish
  - 3.8 Upload logo projet → POST /projects/:id/logo
  - 3.9 Voir mes projets → /my-project
  - 3.10 Voir un projet (page publique) → /projects/[slug]
  - 3.11 Résumé projet → PATCH /projects/:id/summary
  - 3.12 Document projet → GET /projects/:id/document

  4. Feed & Découverte

  - 4.1 Feed projets (avec scoring IA) → /feed + GET /projects/feed
  - 4.2 Feed candidats → /feed/candidates + GET /users/candidates/feed
  - 4.3 Projets trending → GET /projects/trending
  - 4.4 Candidats trending → GET /users/candidates/trending
  - 4.5 Recherche universelle → /feed/search + GET /search/universal
  - 4.6 Historique de recherche → GET /search/history
  - 4.7 Filtres (skills populaires) → GET /filters/popular-skills

  5. Interactions & Matching

  - 5.1 Like/Skip/Save un projet → POST /interactions
  - 5.2 Projets sauvegardés → GET /interactions/saved
  - 5.3 Annuler dernier skip → POST /interactions/undo
  - 5.4 Voir qui a liké mon projet → GET /interactions/likes/:projectId
  - 5.5 Matching IA projet→candidats → GET /matching/project/:id
  - 5.6 Matching IA candidat→projets → GET /matching/candidate
  - 5.7 Recalculer matching → POST /matching/recalculate/project/:id

  6. Candidatures

  - 6.1 Postuler à un projet → POST /applications
  - 6.2 Vérifier si déjà postulé → GET /applications/check/:projectId
  - 6.3 Mes candidatures → /applications + GET /applications/mine
  - 6.4 Candidatures reçues (fondateur) → /my-project/[slug]/applications
  - 6.5 Accepter/Rejeter candidature → PATCH /applications/:id/status
  - 6.6 Review candidatures → /my-project/[slug]/review

  7. Notifications

  - 7.1 Liste notifications → GET /notifications
  - 7.2 Compteur non-lus → GET /notifications/unread-count
  - 7.3 Marquer comme lu → PATCH /notifications/:id/read
  - 7.4 Tout marquer comme lu → PATCH /notifications/read-all
  - 7.5 Push subscribe/unsubscribe → POST/DELETE /notifications/push/*

  8. Messagerie

  - 8.1 Créer conversation → POST /messages/conversations
  - 8.2 Liste conversations → GET /messages/conversations
  - 8.3 Compteur non-lus messages → GET /messages/conversations/unread-count
  - 8.4 Messages d'une conversation → GET /messages/:conversationId
  - 8.5 Upload fichier dans conversation → POST /messages/upload
  - 8.6 Page messages → /messages

  9. Paiement (Stripe)

  - 9.1 Checkout Stripe → POST /payment/checkout
  - 9.2 Webhook Stripe → POST /payment/webhook
  - 9.3 Portail client Stripe → POST /payment/portal
  - 9.4 Statut abonnement → GET /payment/status
  - 9.5 Historique facturation → GET /payment/billing
  - 9.6 Page billing → /settings/billing
  - 9.7 Pages success/cancel → /payment/success, /payment/cancel

  10. Privacy Wall & Unlock

  - 10.1 Vérifier unlock → GET /unlock/check/:targetId
  - 10.2 Mes unlocks → GET /unlock/mine

  11. Boost

  - 11.1 Booster un projet → POST /boost/:projectId
  - 11.2 Boosts restants → GET /boost/remaining

  12. Publicités (Ads)

  - 12.1 Ads feed/sidebar/banner/search → GET /ads/*
  - 12.2 Tracking événement pub → POST /ads/event

  13. Landing Page

  - 13.1 Plans tarifaires → GET /landing/plans
  - 13.2 FAQ → GET /landing/faq
  - 13.3 Témoignages → GET /landing/testimonials
  - 13.4 Page d'accueil → /

  14. Profils publics

  - 14.1 Profil public utilisateur → GET /users/:id/public
  - 14.2 Profil fondateur → /founders/[id]

  15. Admin Dashboard

  - 15.1 KPIs → /admin + GET /admin/kpis
  - 15.2 Gestion utilisateurs (list, ban, unban, rôle) → /admin/users
  - 15.3 Modération (list, modérer) → /admin/moderation
  - 15.4 Gestion projets (archive, restore) → /admin/projects
  - 15.5 Transactions → /admin/transactions
  - 15.6 Logs système → /admin/logs
  - 15.7 Gestion plans tarifaires (CRUD + reorder) → /admin/tarifs
  - 15.8 Gestion FAQ (CRUD + reorder) → /admin/faq
  - 15.9 Gestion témoignages (CRUD + reorder) → /admin/temoignages
  - 15.10 Gestion publicités (CRUD + stats) → /admin/ads
  - 15.11 Config push/email → GET/PATCH /admin/push-config, /admin/email-config
  - 15.12 Config IA (prompts, logs, analytics) → /admin/ai

  ---
  Total : 15 domaines, ~75 fonctionnalités implémentées.