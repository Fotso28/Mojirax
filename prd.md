---
title: CoMatch PRD
status: IN_PROGRESS
author: Oswald (Project Owner)
date: 2026-01-27
last_audit: 2026-03-10
classification:
  domain: General
  projectType: web_app
  complexity: Medium
---

# Product Requirements Document (PRD) - CoMatch

## 1. Introduction
**Project Name:** CoMatch
**Version:** 1.4
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
- **Auth:** Email/Password, Google, LinkedIn (via NextAuth).
- **Roles:** Explicit selection (Founder or Candidate).
- **Security:** JWT in HttpOnly Cookies.
- **Profile Management:**
    - Candidates: Bio, Tech Stack, Experience.
    - Founders: Project Pitch, MVP Status, Needs.
    - Media: Photo upload to MinIO.

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
- **Dashboard:** KPIs (Signups, Revenue, Conversion).
- **Configuration:** Toggle hidden fields, Edit AI Prompt.
- **Finance:** Transaction logs, manual Premium override.

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

## 8. Implementation Status Matrix (Audit: 2026-03-09)

> Légende: ✅ Implémenté | 🔶 Partiel | ❌ Non commencé | 📋 Schema/DB only (table existe mais pas de code backend)

### Phase 1 — Core Platform

#### 1.1 Infrastructure & DevOps
- [x] Monorepo Turborepo (web/ + api/ + packages/types) ✅
- [x] Docker Compose (PostgreSQL + Redis + MinIO + API + Web) ✅
- [x] Prisma ORM + migrations (16 tables migrées en DB) ✅
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
- 📋 Tables DB créées : `transactions`, `payment_audit_logs`, `unlocks`
- [ ] Module NestJS `PaymentsModule` ❌
- [ ] Service de paiement (init, webhook, vérification) ❌
- [ ] Intégration API Lygos Pay ❌
- [ ] Modal de paiement frontend ❌
- [ ] Système unlock (débloquer un profil) ❌
- [ ] Logs d'audit paiement ❌

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
- [x] `GET /notifications` — Liste paginée des notifications ✅
- [x] `GET /notifications/unread-count` — Compteur non-lues ✅
- [x] `PATCH /notifications/:id/read` — Marquer comme lue ✅
- [x] `PATCH /notifications/read-all` — Marquer toutes comme lues ✅
- [x] Dropdown notifications dans le header ✅ `notification-dropdown.tsx`
- [x] Notifications créées automatiquement (candidature, modération, publication) ✅
- [ ] Notifications push (PWA / Web Push) ❌
- [ ] Notifications email ❌

#### 2.4 Administration
- 📋 Table DB créée : `admin_logs`
- [ ] Module NestJS `AdminModule` ❌
- [ ] Dashboard admin (KPIs, users, revenue) ❌
- [ ] File de modération (profils/projets PENDING_AI) ❌
- [ ] Configuration IA (prompts, seuils) ❌
- [ ] Gestion transactions manuelles ❌

#### 2.5 Recherche Avancée
- [x] Recherche sémantique via pgvector ✅ `search.service.ts`
- [x] Logging des recherches ✅ `search_logs` table
- [x] Historique des recherches utilisateur ✅ `GET /search/history`
- [x] Suppression de l'historique ✅ `DELETE /search/history`
- [x] Page de résultats de recherche ✅ `feed/search/page.tsx`

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
- [ ] Rate limiting API (@nestjs/throttler) ❌
- [x] Validation input (class-validator + DTOs typés) 🔶 (la plupart des endpoints, quelques `any` restants)
- [ ] CORS stricte en production ❌
- [ ] Helmet.js (headers de sécurité) ❌
- [ ] CSRF protection ❌
- [x] FirebaseAuthGuard sur tous les endpoints mutants ✅
- [x] Ownership vérifié via `req.user.uid` ✅
- [x] Swagger désactivé en production ✅

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
- [ ] Health check avancé (DB, MinIO, Firebase) ❌
- [ ] Analytics (Google Analytics / Mixpanel) ❌
- [ ] Error tracking (Sentry) ❌

---

### Résumé Statistique (Audit 2026-03-10)

| Métrique | Valeur |
|---|---|
| **Phase 1 complétude** | ~97% |
| **Phase 2 complétude** | ~55% |
| **Phase 3 complétude** | ~20% |
| **Complétude globale** | **~62%** |

### Modules NestJS actifs (13/16)

| Module | Statut |
|---|---|
| AuthModule | ✅ |
| FirebaseModule | ✅ |
| UsersModule | ✅ |
| ProjectsModule | ✅ |
| ApplicationsModule | ✅ |
| SearchModule | ✅ |
| InteractionsModule | ✅ |
| NotificationsModule | ✅ |
| DocumentsModule | ✅ |
| MatchingModule | ✅ |
| UnlockModule | ✅ |
| HealthModule | ✅ |
| PrismaModule | ✅ |
| PaymentsModule | ❌ |
| AdminModule | ❌ |
| MessagingModule | ❌ |

## 9. Priorités Immédiates

1. **PaymentsModule** — Intégration Lygos Pay pour le modèle freemium (Pay-to-Contact)
2. **AdminModule** — Dashboard admin avec file de modération et KPIs
3. ~~**Privacy Wall backend**~~ ✅ — Interceptor pour masquer les champs sensibles selon le statut premium
4. ~~**Matching IA**~~ ✅ — Calcul automatique des MatchScores (candidat ↔ projet)
5. **Tests** — Couverture unitaire et e2e minimale avant lancement
6. **Sécurité** — Rate limiting, Helmet, CORS stricte en production
7. **Messagerie** — Système de messages entre fondateurs et candidats acceptés
