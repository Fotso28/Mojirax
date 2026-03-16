---
title: MojiraX PRD
status: IN_PROGRESS
author: Oswald (Project Owner)
date: 2026-01-27
last_audit: 2026-03-11
classification:
  domain: General
  projectType: web_app
  complexity: Medium-High
---

# Product Requirements Document (PRD) - MojiraX

## 1. Introduction
**Project Name:** MojiraX (anciennement CoMatch)
**Version:** 1.5
**Vision:** A responsive web platform and PWA to facilitate connections between Project Founders and Candidate Co-founders in Cameroon, using a Freemium model secured by AI moderation and local infrastructure.

## 2. Goals & Objectives
- **Connect Ecosystem:** Bridge the gap between idea holders and skilled technical/business co-founders.
- **Monetization:** Generate revenue through a "Pay-to-Contact" freemium model.
- **Trust & Quality:** Ensure profile quality via AI validation and secure local data hosting.
- **Accessibility:** Mobile-first PWA approach for broad access.

## 3. User Personas
### 3.1 Project Founder ("Porteur de Projet")
- **Goal:** Find a team to execute an idea.
- **Needs:** Create a project pitch, define needs, search for candidates.

### 3.2 Candidate ("Candidat")
- **Goal:** Find a project to join.
- **Needs:** Showcase skills (Tech Stack, Soft Skills), browse projects.

### 3.3 System Administrator ("Admin")
- **Goal:** Maintain platform integrity and monitor business health.
- **Needs:** Access dashboard KPIs, manage content moderation rules, oversee financial transactions (Lygos Pay logs), and configure AI prompts.

## 3.1 User Journeys (Premium UI/UX Flow)

**Design Philosophy:** "Glassmorphic Professionalism" - Use frosted glass effects, smooth micro-interactions (staggered animations), and distinct vibrant gradients for "Founder" (Blue/Purple) vs "Candidate" (Teal/Green) modes.

### Journey 1: The Visionary (Founder) - From Idea to Match
1.  **Landing:** User lands on a high-energy hero section. "Find your Co-Founder."
2.  **Onboarding (The Pitch):** Instead of a static form, a conversational UI asks: "What are you building?"
    *   *UI Magic:* As they type, AI suggest tags (Fintech, AgriTech) floating in 3D space.
3.  **The Result (The Hook):** Instant "Blur" view of potential matching candidates. "3 Developers match your idea."
    *   *Interaction:* Hovering over a card reveals non-sensitive skills with a "shimmer" effect.
4.  **Conversion:** Clicking "Connect" triggers a sleek Payment Modal (Lygos Pay).
5.  **Success:** Payment confirmed -> Confetti animation -> Contact Details Unlocked.

### Journey 2: The Builder (Candidate) - From Skill to Opportunity
1.  **Import:** "Connect with LinkedIn" (One-click).
    *   *UI Magic:* Profile fills automatically with a "downloading data" visualization.
2.  **Enhancement:** User tweaks their "Ideal Stack".
3.  **Discovery (The Stack):** A Swipe-able (Tinder-style or Grid) feed of Projects.
    *   *Interaction:* Cards flip on click to show "Tech Requirements".
4.  **Application:** "Interested" button sends a standardized, professional notification to the Founder.

### Journey 3: The Guardian (Admin) - Management
1.  **Dashboard:** Dark-mode analytics hub. Real-time counters for "New Users" and "Revenue".
2.  **Moderation Queue:** Grid of "Pending AI" profiles.
    *   *Action:* One-click "Approve" (Green Fade) or "Edit Prompt" (Slide-over panel).

## 4. Functional Requirements

### 4.1 Authentication & User Management
- **Auth:** Email/Password, Google (via Firebase Auth). LinkedIn non implémenté.
- **Roles:** Explicit selection (Founder, Candidate, Admin).
- **Security:** Firebase JWT Bearer Token, validé par `FirebaseAuthGuard`.
- **Profile Management:**
    - Candidates: Bio, Tech Stack, Experience, Skills, Pitch, Availability, Location preferences.
    - Founders: Project Pitch, MVP Status, Needs, founderProfile (JSON).
    - Admin: Full access via `AdminGuard` (role check en DB).
    - Media: Photo upload to MinIO (Sharp resize 512x640).

### 4.2 AI Moderation System
- **Workflow:** New/Edited profiles -> `PENDING_AI` status.
- **Validation:** Background task sends text to LLM/AI.
    - **Approved:** -> `PUBLISHED`.
    - **Rejected:** -> `REJECTED` with reason displayed to user.

### 4.3 Discovery & Privacy (The Feed)
- **Feed:** filterable card grid (City, Skill, Sector).
- **Privacy Wall (Core Feature):**
    - Non-Premium users see masked contact info.
    - **Backend Interceptor:** Removes sensitive fields (Email, Phone, Links) *before* sending to frontend.
    - Frontend displays "Information Hidden".

### 4.4 Payments & Monetization
- **Model:** Pay to unlock contact details.
- **Flow:**
    1. User clicks "See Contact Details".
    2. If Free: Prompt Payment Modale.
    3. Payment via Aggregator (e.g., Lygos Pay).
    4. Webhook confirms payment -> Updates user to `Premium`.
    5. User can now see unmasked details.

### 4.5 Administration
- **Dashboard:** KPIs (Users, Projects, Applications, Revenue, Engagement, Modération).
- **User Management:** Liste paginée, détail utilisateur, changement de rôle.
- **Moderation Queue:** File de modération (profils/projets PENDING_AI), override admin.
- **AI Configuration:** Provider par action, prompt versioning avec rollback, logs de coûts IA.
- **Push Notifications Config:** Activation/désactivation par type de notification.
- **Finance:** Transaction logs, admin action logs.
- **Frontend:** Dashboard multi-onglets (Overview, Engagement, Revenue, Charts, Notifications).

### 4.6 Publicités (Ads System)
- **Placements:** Feed (interleaved), Sidebar, Banner (full width), Search results.
- **Targeting:** Par rôle, secteur, ville, skills.
- **Frequency Capping:** Max impressions par utilisateur par jour.
- **Tracking:** Impressions et clics avec viewport duration.
- **Admin:** Configuration (fréquence insertion feed, randomisation, max sidebar ads).
- **Frontend:** Composants dédiés (`ad-banner`, `ad-feed-card`, `ad-sidebar`, `ad-search-card`).

### 4.7 Notifications Push (FCM)
- **Backend:** `PushService` avec Firebase Cloud Messaging.
- **Token Management:** Enregistrement/désenregistrement tokens FCM par device.
- **Delivery:** Push automatique à chaque notification créée (fire & forget).
- **Frontend:** Service worker (`firebase-messaging-sw.js`), permission request, foreground listener.
- **Config Admin:** Activation/désactivation globale et par type via `/admin/push-config`.

## 5. Non-Functional Requirements
- **Architecture:** Next.js (Front), NestJS (Back), PostgreSQL, Docker.
- **Hosting:** VPS hostinger.
- **Performance:** Optimized for mobile (PWA).
- **SEO & Social:** Server-Side Rendering (SSR) for indexability.

## 6. UI/UX Design References
- **Inspiration 1:** [DeepLearning.AI Dev](https://ai-dev.deeplearning.ai/?_gl=1*1vs1zwp*_gcl_au*MTE5NzIxNzA3NC4xNzY5NTIxNjk2*_ga*MTMzODA2NjkxNS4xNzY5NTIxNjk1*_ga_PZF1GBS1R1*czE3Njk1MjE2OTQkbzEkZzAkdDE3Njk1MjE2OTgkajU2JGwwJGgw) - Modern, clean, tech-focused aesthetic.
- **Inspiration 2:** [LinkedIn (Cameroon)](https://cm.linkedin.com/) - Professional networking features, feed layout, and clarity.

## 7. Roadmap Strategy
- **Phase 1 (Month 1):** Valid Core. Auth, Profiles, AI Validation, Feed + Privacy Wall.
- **Phase 2 (Month 2):** Monetization. Payment integration, Admin Dashboard, PWA polish.
- **Phase 3 (Month 3):** Stabilization. Testing, Security audit, Beta, Launch.

---

## 8. Implementation Status Matrix (Audit: 2026-03-11)

> Légende: ✅ Implémenté | 🔶 Partiel | ❌ Non commencé | 📋 Schema/DB only (table existe mais pas de code backend)

### Phase 1 — Core Platform

#### 1.1 Infrastructure & DevOps
- [x] Monorepo Turborepo (web/ + api/ + packages/types) ✅
- [x] Docker Compose (PostgreSQL + Redis + MinIO + API + Web) ✅
- [x] Prisma ORM + migrations (26 modèles en DB) ✅
- [x] PostgreSQL avec extension `pgvector` pour embedding ✅
- [x] MinIO (S3) pour le stockage fichiers (avatars, logos, documents) ✅
- [x] Redis configuré (cache, futures queues BullMQ) ✅
- [x] Package `@co-founder/types` partagé (API_VERSION) ✅
- [x] Hosting VPS Hostinger — Node.js runtime ready ✅
- [ ] PWA (manifest.json, service worker, offline) ❌
- [ ] CI/CD pipeline (GitHub Actions / Docker deploy) ❌

#### 1.2 Authentification & Utilisateurs
- [x] Firebase Auth (Google Sign-In + Email/Password) ✅ `auth.service.ts`, `firebase.strategy.ts`
- [x] Sync Firebase ↔ PostgreSQL via `POST /auth/sync` ✅
- [x] Guard Firebase JWT (`FirebaseAuthGuard`) ✅
- [x] Sélection de rôle (Founder / Candidate) ✅ `onboarding/role/page.tsx`
- [x] Page de login avec Google Sign-In + Email ✅ `login/page.tsx`
- [ ] Auth LinkedIn ❌
- [ ] JWT HttpOnly Cookies (actuellement Bearer Token) ❌

#### 1.3 Profil Utilisateur
- [x] Get/Update profil (`GET/PATCH /users/profile`) ✅
- [x] Upload avatar (MinIO, resize 512x640 via Sharp) ✅ `upload.service.ts`
- [x] Modal de crop avatar côté frontend ✅ `avatar-crop-modal.tsx`
- [x] Profil public fondateur (`GET /users/:id/public`) ✅
- [x] Page profil public richement designée ✅ `founders/[id]/page.tsx` (412 lignes)
- [x] Formulaire d'édition profil ✅ `profile-form.tsx`
- [x] Listes expérience + éducation ✅ `experience-list.tsx`, `education-list.tsx`
- [x] Sauvegarde onboarding (GET/PATCH /users/onboarding) ✅

#### 1.4 Onboarding
- [x] Choix de rôle (Founder vs Candidate) ✅ `onboarding/role/page.tsx`
- [x] Onboarding Founder — 4 étapes conversationnelles ✅ `onboarding/founder/page.tsx`
- [x] Onboarding Candidate — 5 étapes wizard ✅ `onboarding/candidate/`
  - [x] Vision ✅
  - [x] Expertise ✅
  - [x] Conditions ✅
  - [x] Disponibilité ✅
  - [x] Pitch ✅

#### 1.5 Création de Projet (Wizard complet)
- [x] Choix de méthode (Formulaire vs Upload Document) ✅ `method-choice.tsx`
- [x] Upload document (PDF/Word) + extraction IA ✅ `document-upload.tsx`
- [x] Polling automatique du statut après upload (stepper animé 4 étapes, mise à jour temps réel) ✅
- [x] Step Identité (nom, pays, ville, logo) ✅ `identity.tsx`
- [x] Step Détails (secteur, scope, stage) ✅ `details.tsx`
- [x] Step Problème (problème, cible, solutions actuelles) ✅ `problem.tsx`
- [x] Step Solution (description, UVP, anti-scope) ✅ `solution.tsx`
- [x] Step Marché (type, modèle éco, concurrents) ✅ `market.tsx`
- [x] Step Traction (rôle fondateur, dispo, preuves) ✅ `traction.tsx`
- [x] Step Co-fondateur (profil recherché, type collab, vision) ✅ `cofounder.tsx`
- [x] Step AI Review (validation avec score + suggestions) ✅ `ai-review.tsx`
- [x] Brouillon auto-save (GET/PATCH /users/creating-projet) ✅
- [x] Upload logo projet (MinIO, 400x400) ✅ `upload.service.ts`
- [x] Modification de projet existant ✅ `modify/project/page.tsx`

#### 1.6 Service IA (Multi-Provider)
- [x] Extraction de document PDF (pdf-parse v1.1.1) + DOCX (Mammoth) ✅ `ai.service.ts`
- [x] Génération de blocs synthèse (problem, solution, market, traction, team, cofounder) ✅
- [x] Validation projet avec score + feedback ✅
- [x] Fallback automatique DeepSeek → Claude → GPT ✅
- [x] Support natif PDF Claude + extraction texte pdf-parse pour les autres providers ✅
- [x] Vérification de légalité automatique (`checkLegality`) ✅ `ai.service.ts`
- [x] Auto-publication si légal (confidence ≥ 0.7 → PUBLISHED) ✅ `document-analysis.service.ts`
- [x] Signalement pour revue manuelle si illégal → PENDING_AI ✅
- [x] Calcul des embeddings vectoriels (pgvector) ✅ `ai.service.ts` (getEmbedding)
- [x] Régénération individuelle d'un bloc synthèse ✅ `POST /projects/:id/regenerate-block`
- [x] Modération automatique profils candidats (PENDING_AI → PUBLISHED/REJECTED) ✅ `candidate-moderation.service.ts`, multi-provider IA, notifications, fire-and-forget
- [x] Formulaire profil candidat complet (page /profile) ✅ `candidate-profile-form.tsx`, round-trip wizard ↔ profil
- [x] Matching IA candidat ↔ projet (MatchScore) ✅ `matching.service.ts`, 4 dimensions (skills 40%, experience 20%, location 15%, cultural fit 25%), pgvector cosine similarity, triggers auto publication

#### 1.7 Feed & Découverte
- [x] Feed de projets avec scroll infini ✅ `feed-stream.tsx`
- [x] Feed de candidats pour les fondateurs ✅ `feed/candidates/page.tsx`, `candidate-stream.tsx`, `candidate-card.tsx`
- [x] Carte projet riche (secteur, stage, location, rôle, bouton postuler) ✅ `project-card.tsx`
- [x] Algorithme de recommandation 3 couches (explicite/implicite/qualité) ✅
- [x] Tracking comportemental (VIEW, CLICK, SAVE, APPLY, dwell, scroll) ✅
- [x] Pénalité -30% projets déjà vus ✅
- [x] Native ads dans le feed ✅ `native-ad.tsx`
- [x] Page projet détaillée (4 onglets : Vision, Expertise, Conditions, Synthèse) ✅ `project-deck.tsx`
- [x] Onglet Synthèse document (blocs IA + téléchargement) ✅ `document-view.tsx`
- [x] Sidebar fondateur sur la page projet ✅ `founder-sidebar.tsx`
- [x] URL SEO-friendly avec slugs ✅ `GET /projects/:idOrSlug`
- [x] Rafraîchissement feed sur navigation et focus fenêtre ✅
- [x] Filtres feed (UI + backend) ✅ `feed-filters.tsx`
- [x] Recherche textuelle / sémantique ✅ `search.service.ts`, `feed/search/page.tsx`
- [x] Historique des recherches ✅ `GET /search/history`

#### 1.8 Privacy Wall
- [x] Composant Privacy Wall (blur + cadenas + props onUnlock/lockedFieldsCount) ✅ `privacy-wall.tsx`
- [x] Backend Interceptor (strip email, phone, linkedinUrl, websiteUrl avant envoi) ✅ `privacy.interceptor.ts`
- [x] Service Unlock avec cache in-memory (TTL 5min) ✅ `unlock.service.ts`, `unlock.controller.ts`
- [x] Guard optionnel Firebase (endpoints publics avec privacy) ✅ `firebase-auth-optional.guard.ts`
- [x] Endpoint `GET /unlock/check/:targetId` ✅
- [x] Endpoint `GET /unlock/mine` (liste paginée des profils débloqués) ✅
- [x] Intercepteur appliqué sur 4 endpoints (projects/:idOrSlug, users/:id/public, applications/project/:id, matching/project/:id) ✅
- [x] Frontend founder-sidebar conditionné par `_isLocked` ✅
- [x] `createUnlockFromTransaction()` — vérification transaction PAID + ownership + anti-doublon + anti-self-unlock ✅
- [x] `revokeUnlockOnRefund()` — suppression unlock après remboursement ✅
- [x] `GET /projects/:id/document` protégé par FirebaseAuthGuard + ownership ✅
- [x] Select explicite sur candidateProfile (exclut embeddings lourds) ✅
- [ ] Intégration avec le système de paiement (createUnlock après webhook Lygos) ❌

#### 1.9 Layout & UX
- [x] Dashboard 3 colonnes (sidebar gauche + feed + sidebar droite) ✅
- [x] Header responsive avec menu mobile ✅ `header.tsx`
- [x] Sidebar gauche (navigation dynamique selon rôle) ✅ `sidebar-left.tsx`
- [x] Sidebar droite (widgets) ✅ `sidebar-right.tsx`
- [x] Drawer mobile navigation ✅ `mobile-nav-drawer.tsx`
- [x] Drawer mobile widgets ✅ `mobile-widget-drawer.tsx`
- [x] Système de toast/notifications UI ✅ `toast-context.tsx`
- [x] Sidebar context (hide/show) ✅ `sidebar-context.tsx`
- [x] Page "Mes Projets" (liste, statut, actions) ✅ `my-project/page.tsx`
- [x] Centre de notifications (dropdown dans header) ✅ `notification-dropdown.tsx`
- [x] Composants UI réutilisables (Button, Input, Select, Textarea, Modal, TagInput, CountrySelect, Divider, ImageUploader, ImageCropModal, DeleteBottomSheet) ✅

---

### Phase 2 — Monétisation & Administration

#### 2.1 Paiements (Lygos Pay)
- [x] Tables DB créées : `Transaction`, `PaymentAuditLog`, `Unlock` ✅
- [x] Système unlock backend (createUnlockFromTransaction, revokeOnRefund, check, list) ✅ `unlock.service.ts`
- [ ] Module NestJS `PaymentsModule` ❌
- [ ] Service de paiement (init transaction, webhook callback) ❌
- [ ] Intégration API Lygos Pay ❌
- [ ] Modal de paiement frontend ❌
- [ ] Webhook Lygos → createUnlock automatique ❌
- [ ] Logs d'audit paiement (écriture) ❌

#### 2.2 Candidatures / Applications
- [x] Module NestJS `ApplicationsModule` ✅ `applications.module.ts`
- [x] `POST /applications` — Postuler à un projet ✅
- [x] `GET /applications/mine` — Mes candidatures (candidat) ✅
- [x] `GET /applications/project/:projectId` — Candidatures reçues (fondateur) ✅
- [x] `PATCH /applications/:id/status` — Accepter/Rejeter (fondateur) ✅
- [x] `GET /applications/check/:projectId` — Vérifier si déjà postulé ✅
- [x] Page "Mes Candidatures" (candidat + fondateur) ✅ `applications/page.tsx`
- [x] Page gestion candidatures reçues ✅ `my-project/[slug]/applications/page.tsx`
- [x] Modal de candidature (bouton postuler + message) ✅ `apply-modal.tsx`
- [x] Noms candidats cliquables → profil public ✅
- [x] Confirmation avant rejet ✅
- [x] Navigation "Mes Candidatures" dans sidebar pour tous les utilisateurs ✅

#### 2.3 Notifications
- [x] Module NestJS `NotificationsModule` ✅ `notifications.module.ts`
- [x] `GET /notifications` — Liste paginée des notifications (cursor-based) ✅
- [x] `GET /notifications/unread-count` — Compteur non-lues ✅
- [x] `PATCH /notifications/:id/read` — Marquer comme lue ✅
- [x] `PATCH /notifications/read-all` — Marquer toutes comme lues ✅
- [x] Dropdown notifications dans le header ✅ `notification-dropdown.tsx`
- [x] Notifications créées automatiquement (candidature, modération, publication) ✅
- [x] Notifications push FCM (Firebase Cloud Messaging) ✅ `push.service.ts`
- [x] `POST /notifications/push/subscribe` — Enregistrer token FCM ✅
- [x] `DELETE /notifications/push/unsubscribe` — Supprimer token FCM ✅
- [x] Service worker frontend (`firebase-messaging-sw.js`) ✅
- [x] Gestion tokens par device/browser (table `FcmToken`) ✅
- [x] Config admin push (activation/désactivation par type) ✅ `PushConfig` singleton
- [ ] Notifications email ❌

#### 2.4 Administration
- [x] Module NestJS `AdminModule` ✅ `admin.module.ts`, `admin.controller.ts`, `admin.service.ts`
- [x] `AdminGuard` — Vérifie `role === ADMIN` en DB ✅ `admin.guard.ts`
- [x] `GET /admin/kpis` — Dashboard KPIs (users, projets, candidatures, transactions, engagement, visites) ✅
- [x] `GET /admin/users` — Liste paginée + filtres ✅
- [x] `GET /admin/users/:id` — Détail utilisateur ✅
- [x] `PATCH /admin/users/:id/role` — Changement de rôle + log ✅
- [x] `GET /admin/moderation` — File de modération (PENDING_AI) ✅
- [x] `PATCH /admin/moderation/:id` — Override modération (approuver/rejeter) + log ✅
- [x] `GET /admin/transactions` — Historique transactions avec filtres ✅
- [x] `GET /admin/logs` — Logs d'actions admin ✅
- [x] `GET /admin/projects` — Liste projets avec filtres ✅
- [x] `GET/PATCH /admin/push-config` — Configuration notifications push ✅
- [x] Frontend admin complet ✅ `/admin` (KPIs), `/admin/users`, `/admin/projects`, `/admin/moderation`, `/admin/logs`, `/admin/ai`, `/admin/ads`, `/admin/transactions`
- [x] Charts et visualisations (Recharts) ✅ Pie charts, bar charts

#### 2.5 Configuration IA (AiConfigModule)
- [x] Module NestJS `AiConfigModule` ✅ `ai-config.module.ts`
- [x] Singleton `AiConfig` — provider par action, modèles, seuils de modération ✅
- [x] CRUD prompts IA avec versioning et rollback ✅ `AiPrompt` table
- [x] Logging appels IA (provider, modèle, durée, tokens, coût estimé) ✅ `AiCallLog` table
- [x] Frontend monitoring IA ✅ `/admin/ai`

#### 2.6 Système Publicitaire (AdsModule)
- [x] Module NestJS `AdsModule` ✅ `ads.module.ts`, `ads.controller.ts`, `ads-admin.controller.ts`, `ads.service.ts`
- [x] Modèles DB : `Ad`, `AdEvent`, `AdConfig` ✅
- [x] `GET /ads/feed|sidebar|banner|search` — Récupérer ads par placement ✅
- [x] `POST /ads/event` — Tracker impression/clic ✅
- [x] Scoring et targeting (rôle, secteurs, villes, skills) ✅
- [x] Frequency capping (max impressions/user/jour) ✅
- [x] Frontend composants : `ad-banner`, `ad-feed-card`, `ad-sidebar`, `ad-search-card` ✅
- [x] Admin ads : `/admin/ads`, `/admin/ads/[id]/stats` ✅

#### 2.7 Recherche Avancée
- [x] Recherche sémantique via pgvector ✅ `search.service.ts`
- [x] Recherche universelle (projets + personnes + skills en une requête) ✅ `GET /search/universal`
- [x] Recherche avec filtres (secteur, ville) ✅ `GET /search`
- [x] Logging des recherches ✅ `SearchLog` table
- [x] Historique des recherches utilisateur ✅ `GET /search/history`
- [x] Suppression de l'historique ✅ `DELETE /search/history`
- [x] Page de résultats de recherche ✅ `feed/search/page.tsx`
- [x] Composant recherche dans le header ✅ `universal-search.tsx`

#### 2.8 Filtres & Skills (FiltersModule)
- [x] Module NestJS `FiltersModule` ✅ `filters.module.ts`
- [x] `GET /filters/popular-skills` — Top N skills par usage ✅
- [x] Cache embeddings sémantiques par skill ✅ `FilterEmbedding` table
- [x] Rafraîchissement automatique des embeddings (scheduled 24h) ✅

---

### Phase 3 — Stabilisation & Lancement

#### 3.1 Tests & Qualité
- [x] Configuration Jest (API) ✅
- [ ] Tests unitaires services ❌ (1 fichier `app.controller.spec.ts` uniquement)
- [ ] Tests e2e (Playwright / Cypress) ❌
- [ ] Tests frontend (React Testing Library) ❌
- [ ] Couverture de code > 70% ❌

#### 3.2 Sécurité
- [ ] Audit npm complet ❌
- [x] Rate limiting API (`@nestjs/throttler`) ✅ Global 20 req/60s, overrides par endpoint (auth/sync: 30/60s, feed: 10/60s)
- [x] Validation input (class-validator + DTOs typés) ✅ `forbidNonWhitelisted: true`, tous les `@Body()` typés
- [x] CORS stricte en production ✅ Configurée depuis `FRONTEND_URL`
- [x] Helmet.js (headers de sécurité) ✅ Activé en production uniquement
- [ ] CSRF protection ❌
- [x] FirebaseAuthGuard sur tous les endpoints mutants ✅
- [x] FirebaseAuthOptionalGuard pour endpoints publics avec privacy ✅
- [x] AdminGuard pour endpoints admin (vérifie role ADMIN en DB) ✅
- [x] Ownership vérifié via `req.user.uid` ✅
- [x] Swagger désactivé en production ✅
- [x] PrivacyInterceptor (masque email, phone, linkedinUrl, etc.) ✅
- [x] Select explicites sur requêtes publiques (pas de leak de données) ✅

#### 3.3 Performance & SEO
- [x] URLs SEO-friendly (slugs projet) ✅
- [ ] Server-Side Rendering (SSR) pour les pages publiques ❌
- [ ] Sitemap.xml + robots.txt ❌
- [ ] Meta tags SEO dynamiques ❌
- [ ] Lazy loading images + code splitting ❌
- [ ] CDN pour les assets statiques ❌

#### 3.4 Monitoring & Observabilité
- [x] Logger NestJS (pas de console.log) ✅
- [x] Health check basique (`/health`) ✅
- [x] Tracking comportemental utilisateur (interactions, visites, recherches) ✅ `UserProjectInteraction`, `UserVisit`, `SearchLog`
- [x] Logs appels IA (provider, modèle, coût, durée) ✅ `AiCallLog`
- [x] Logs admin (actions, cibles, détails) ✅ `AdminLog`
- [x] Logs modération (score IA, raison, payload) ✅ `ModerationLog`
- [x] Tracking publicitaire (impressions, clics, viewport) ✅ `AdEvent`
- [ ] Health check avancé (DB, MinIO, Firebase) ❌
- [ ] Analytics (Google Analytics / Mixpanel) ❌
- [ ] Error tracking (Sentry) ❌

---

### Résumé Statistique (Audit 2026-03-11)

| Métrique | Valeur |
|---|---|
| **Phase 1 complétude** | ~98% |
| **Phase 2 complétude** | ~90% |
| **Phase 3 complétude** | ~40% |
| **Complétude globale** | **~80%** |
| **Modèles Prisma** | 26 |
| **Endpoints API** | ~70 (25 publics, 30 protégés, 15 admin) |
| **Guards** | 3 (Firebase, FirebaseOptional, Admin) |
| **Interceptors** | 1 (Privacy) |

### Modules NestJS actifs (20/21)

| Module | Statut | Description |
|---|---|---|
| AuthModule | ✅ | Firebase JWT, sync, visits |
| FirebaseModule | ✅ | Firebase Admin SDK (global) |
| UsersModule | ✅ | Profils, candidats, onboarding |
| ProjectsModule | ✅ | CRUD projets, feed, trending |
| ApplicationsModule | ✅ | Candidatures, acceptation/rejet |
| SearchModule | ✅ | Recherche sémantique + universelle |
| InteractionsModule | ✅ | Tracking VIEW, CLICK, SAVE, etc. |
| NotificationsModule | ✅ | In-app + FCM push |
| DocumentsModule | ✅ | Upload/analyse documents |
| MatchingModule | ✅ | Scores compatibilité IA |
| ModerationModule | ✅ | Modération IA projets/candidats |
| UnlockModule | ✅ | Privacy wall unlock |
| AdsModule | ✅ | Publicités ciblées + tracking |
| AiModule | ✅ | Service IA multi-provider (global) |
| AiConfigModule | ✅ | Config IA, prompts, logs coûts |
| FiltersModule | ✅ | Skills populaires, embeddings |
| UploadModule | ✅ | Upload S3/MinIO + resize |
| HealthModule | ✅ | Health check |
| PrismaModule | ✅ | ORM wrapper (global) |
| AdminModule | ✅ | Dashboard, modération, KPIs |
| PaymentsModule | ❌ | Intégration Lygos Pay |

## 9. Priorités Immédiates

1. **PaymentsModule** — Intégration Lygos Pay pour le modèle freemium (Pay-to-Contact)
2. ~~**AdminModule**~~ ✅ — Dashboard admin complet (KPIs, users, modération, transactions, logs, push config, AI monitoring)
3. ~~**Privacy Wall backend**~~ ✅ — Interceptor pour masquer les champs sensibles selon le statut premium
4. ~~**Matching IA**~~ ✅ — Calcul automatique des MatchScores (candidat ↔ projet)
5. ~~**Sécurité**~~ ✅ — Rate limiting, Helmet, CORS stricte implémentés
6. ~~**Notifications push**~~ ✅ — FCM push + service worker + config admin
7. **Tests** — Couverture unitaire et e2e minimale avant lancement
8. **Messagerie** — Système de messages entre fondateurs et candidats acceptés
9. **PWA** — manifest.json, service worker offline, installabilité
10. **SEO** — SSR pages publiques, sitemap.xml, meta tags dynamiques
11. **Notifications email** — Emails transactionnels (candidature, modération, etc.)

## 10. Architecture Technique (Résumé)

### Backend (NestJS 11)
- **20 modules** NestJS actifs, ~70 endpoints
- **3 guards** : FirebaseAuthGuard, FirebaseAuthOptionalGuard, AdminGuard
- **1 interceptor** : PrivacyInterceptor (masquage champs sensibles)
- **Rate limiting** : ThrottlerModule global (20/60s) + overrides par endpoint
- **IA Multi-Provider** : DeepSeek (primaire) → Claude → GPT, Jina embeddings
- **Embeddings** : pgvector 1024 dimensions (bio, skills, description, filtres)
- **Modération** : Score 0-100, légalité automatique, fire-and-forget async

### Frontend (Next.js 16)
- **~20 pages** (dashboard, admin, onboarding, feed, profils, projet, recherche)
- **4 contexts** React : Auth, Onboarding, Sidebar, Toast
- **Composants UI** : Tailwind CSS, Framer Motion, Lucide React, Recharts
- **Auth** : Firebase SDK + intercepteur Axios (auto-refresh tokens)
- **Push** : FCM service worker + foreground listener

### Data (PostgreSQL + pgvector)
- **26 modèles** Prisma
- **Embeddings vectoriels** : CandidateProfile (bio, skills), Project (description), FilterEmbedding
- **Tracking** : Interactions (6 types), Visites, Recherches, Events publicitaires, Logs IA
