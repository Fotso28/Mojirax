# Tâches Phase 1 — Complétion du Core MojiraX

> Toutes les tâches restantes pour terminer la Phase 1 (plateforme fonctionnelle).
> Chaque tâche : description, fichiers, critères d'acceptation.

---

## 1. Système de candidatures

> Le modèle `Application` existe en base (statuts PENDING/ACCEPTED/REJECTED/IGNORED) mais aucun module backend ni interface.

### Backend

- [x] **1.1** Créer `ApplicationsModule`
  - Fichier : `api/src/applications/applications.module.ts`
  - Importer dans `AppModule`

- [x] **1.2** Créer `CreateApplicationDto`
  - Fichier : `api/src/applications/dto/create-application.dto.ts`
  - `projectId: string` (required)
  - `message?: string` (optional, `@MaxLength(1000)`)
  - Validé avec `class-validator`

- [x] **1.3** Créer `UpdateApplicationStatusDto`
  - Fichier : `api/src/applications/dto/update-application-status.dto.ts`
  - `status: 'ACCEPTED' | 'REJECTED' | 'IGNORED'` — utiliser `@IsEnum()`
  - **Note** : `IGNORED` non inclus, utilise `@IsIn(['ACCEPTED', 'REJECTED'])` au lieu de `@IsEnum()`. Fonctionnellement OK.

- [x] **1.4** Créer `ApplicationsService`
  - Fichier : `api/src/applications/applications.service.ts`
  - Méthodes :
    - `apply(firebaseUid, dto)` — vérifie que l'utilisateur a un `CandidateProfile`, que le projet est `PUBLISHED`, et qu'il n'a pas déjà postulé (contrainte unique `[candidateId, projectId]`). Enregistre une `UserProjectInteraction` action `APPLY`. Crée une notification pour le fondateur.
    - `getMyApplications(firebaseUid, cursor?, limit?)` — candidatures du candidat connecté avec le projet associé. `select` explicite (pas d'email/phone). Paginé max 20.
    - `getProjectApplications(firebaseUid, projectId, cursor?, limit?)` — vérifie ownership (`project.founderId`). Retourne les candidatures avec profil candidat (`select` explicite). Paginé max 20.
    - `updateStatus(firebaseUid, applicationId, status)` — vérifie que le fondateur est owner du projet lié. Crée une notification pour le candidat.

- [x] **1.5** Créer `ApplicationsController`
  - Fichier : `api/src/applications/applications.controller.ts`
  - Tous les endpoints ont `@UseGuards(FirebaseAuthGuard)`
  - Routes :
    ```
    POST   /applications                    → apply()
    GET    /applications/mine               → getMyApplications()
    GET    /applications/project/:projectId → getProjectApplications()
    PATCH  /applications/:id/status         → updateStatus()
    ```

### Frontend

- [x] **1.6** Modal "Postuler"
  - Fichier : `web/src/components/applications/apply-modal.tsx` (placé dans `components/applications/` au lieu de `project-deck/`)
  - Textarea pour le message, bouton envoyer
  - Gestion erreurs : déjà postulé, pas de profil candidat, projet fermé
  - Appelle `POST /applications`
  - Toast de confirmation

- [x] **1.7** Brancher le bouton "Postuler" dans `project-deck.tsx`
  - Ouvre la modal au clic
  - Grisé + texte "Déjà postulé" si candidature existante
  - Caché si c'est le projet du user connecté

- [x] **1.8** Page "Mes candidatures"
  - Fichier : `web/src/app/(dashboard)/applications/page.tsx`
  - Liste avec : nom du projet, date, statut (badge vert/jaune/rouge)
  - Clic → page projet
  - Pagination

- [x] **1.9** Section "Candidatures reçues" sur la page projet fondateur
  - Fichier : `web/src/app/(dashboard)/my-project/[slug]/applications/page.tsx`
  - Liste des candidats avec nom, compétences, message
  - Boutons Accepter / Rejeter
  - Clic sur candidat → profil public
  - **Note** : Le clic vers le profil public du candidat n'est pas encore implémenté (pas de lien cliquable sur le nom).

- [x] **1.10** Lien "Candidatures" dans la sidebar
  - Fichier : `web/src/components/layout/sidebar-left.tsx`
  - Icône `Inbox` pour les candidats, `Users` pour les fondateurs
  - **Note** : Utilise `Rocket` pour les candidats et `FolderKanban` pour les fondateurs au lieu de `Inbox`/`Users`. Le lien fonctionne correctement.

---

## 2. Système de notifications

> Le modèle `Notification` existe en base (types SYSTEM, APPLICATION_RECEIVED/ACCEPTED/REJECTED, MODERATION_ALERT) mais aucun module.

### Backend

- [x] **2.1** Créer `NotificationsModule`
  - Fichier : `api/src/notifications/notifications.module.ts`
  - Exporter le service pour que les autres modules l'importent

- [x] **2.2** Créer `NotificationsService`
  - Fichier : `api/src/notifications/notifications.service.ts`
  - Méthodes :
    - `notify(userId, type, title, message, data?)` — crée une notification. Utilisée par les autres services.
    - `findAll(firebaseUid, unreadOnly?, cursor?, limit?)` — paginé max 20, trié `createdAt DESC`
    - `getUnreadCount(firebaseUid)` — retourne `{ count: number }`
    - `markAsRead(firebaseUid, notificationId)` — vérifie ownership
    - `markAllAsRead(firebaseUid)` — update toutes les notifs du user

- [x] **2.3** Créer `NotificationsController`
  - Fichier : `api/src/notifications/notifications.controller.ts`
  - Tous les endpoints ont `@UseGuards(FirebaseAuthGuard)`
  - Routes :
    ```
    GET    /notifications              → findAll(?unreadOnly, ?cursor, ?limit)
    GET    /notifications/unread-count → getUnreadCount()
    PATCH  /notifications/:id/read     → markAsRead()
    PATCH  /notifications/read-all     → markAllAsRead()
    ```

- [x] **2.4** Intégrer les triggers dans les autres services
  - `ApplicationsService.apply()` → notifie le fondateur (`APPLICATION_RECEIVED`)
  - `ApplicationsService.updateStatus()` → notifie le candidat (`APPLICATION_ACCEPTED` ou `APPLICATION_REJECTED`)
  - `ModerationService` (tâche 5) → notifie le fondateur/candidat (`MODERATION_ALERT`)

### Frontend

- [x] **2.5** Dropdown notifications dans le header
  - Fichier : `web/src/components/layout/notification-dropdown.tsx`
  - Clic sur l'icône cloche → dropdown avec les 10 dernières
  - Badge rouge avec compteur non-lus
  - Bouton "Tout marquer comme lu"
  - Clic sur une notif → navigation vers la ressource (projet, candidature)

- [x] **2.6** Polling du compteur non-lus
  - Fichier : `web/src/components/layout/header.tsx`
  - Appeler `GET /notifications/unread-count` toutes les 30s ou au `window.focus`

- [ ] **2.7** Page notifications complète (optionnel)
  - Fichier : `web/src/app/(dashboard)/notifications/page.tsx`
  - Liste paginée, filtre lu/non-lu

---

## 3. Édition et suppression de projet

> Aucun endpoint PATCH/DELETE sur les projets. Un fondateur ne peut pas modifier son projet après création.

### Backend

- [x] **3.1** Créer `UpdateProjectDto`
  - Fichier : `api/src/projects/dto/update-project.dto.ts`
  - `PartialType(CreateProjectDto)` — tous les champs optionnels
  - Exclure `founderId` (non modifiable)

- [x] **3.2** Endpoint `PATCH /projects/:id`
  - Fichier : `api/src/projects/projects.controller.ts` + service
  - `@UseGuards(FirebaseAuthGuard)`
  - Vérifie ownership (`project.founderId === req.user.uid`)
  - Si le `name` change → recalculer le slug
  - Si `description` ou `pitch` change → relancer l'embedding async
  - Si modification majeure (problem, solution, uvp) → repasser en `PENDING_AI`

- [x] **3.3** Endpoint `DELETE /projects/:id`
  - `@UseGuards(FirebaseAuthGuard)`
  - Vérifie ownership
  - Supprimer le logo de MinIO si existant
  - Supprimer les candidatures, interactions, match scores liés (cascade Prisma)

### Frontend

- [x] **3.4** Page édition de projet
  - Fichier : `web/src/app/(dashboard)/my-project/[slug]/edit/page.tsx`
  - Réutiliser les composants des steps du wizard création
  - Pré-remplir avec les données existantes
  - Bouton "Enregistrer les modifications"

- [x] **3.5** Boutons Modifier / Supprimer sur "Mes projets"
  - Fichier : `web/src/app/(dashboard)/my-project/page.tsx`
  - Bouton Modifier → navigate vers `/my-project/[slug]/edit`
  - Bouton Supprimer → modal de confirmation, puis `DELETE /projects/:id`

---

## 4. Rate Limiting

> Aucun rate limiting configuré. Requis par CLAUDE.md (règle A04).

- [ ] **4.1** Installer `@nestjs/throttler`
  - `cd api && npm install @nestjs/throttler`

- [ ] **4.2** Configurer `ThrottlerModule` globalement
  - Fichier : `api/src/app.module.ts`
  - Config par défaut : TTL 60s, limit 20 requêtes
  - Ajouter `ThrottlerGuard` en guard global dans `main.ts`

- [ ] **4.3** Limites strictes sur les endpoints sensibles
  - `POST /auth/sync` → 5 req/min
  - `POST /projects` → 3 req/min
  - `POST /applications` → 5 req/min
  - `POST /users/avatar` et `POST /projects/:id/logo` → 5 req/min
  - Utiliser `@Throttle({ default: { ttl: 60000, limit: 3 } })` sur chaque route

- [ ] **4.4** Vérifier manuellement
  - Tester qu'un 429 `Too Many Requests` est retourné avec un message explicite

---

## 5. Modération IA automatique

> Les projets/profils sont créés en DRAFT et passés manuellement en PUBLISHED. Aucun workflow automatisé.

### Backend

- [ ] **5.1** Créer `ModerationModule`
  - Fichier : `api/src/moderation/moderation.module.ts`
  - Importer `PrismaModule` et le `AiService` existant (de `ProjectsModule`)

- [ ] **5.2** Créer `ModerationService`
  - Fichier : `api/src/moderation/moderation.service.ts`
  - `moderateProject(projectId)` :
    - Récupère le projet (name, pitch, problem, solution, uvp)
    - Appelle l'IA (Claude ou GPT via `AiService`) avec un prompt de modération
    - Score 0-1 : > 0.7 → `PUBLISHED`, < 0.3 → `REJECTED`, entre → reste `PENDING_AI`
    - Crée un `ModerationLog` avec score, raison, payload IA
    - Crée une notification pour le fondateur avec le résultat
  - `moderateCandidate(candidateProfileId)` :
    - Même logique pour les profils candidats (title, bio, skills)

- [ ] **5.3** Intégrer à la création de projet
  - Fichier : `api/src/projects/projects.service.ts`
  - Dans `create()` : après insertion, appeler `moderationService.moderateProject()` de manière async (ne pas bloquer la réponse)

- [ ] **5.4** Intégrer à la complétion du profil candidat
  - Fichier : `api/src/users/users.service.ts`
  - Quand un candidat termine son onboarding (profil complet) → appeler `moderationService.moderateCandidate()` async

- [ ] **5.5** Extraire `AiService` dans un module partagé
  - Actuellement dans `ProjectsModule`, mais la modération en a besoin aussi
  - Créer `api/src/ai/ai.module.ts` (module global) et déplacer `ai.service.ts`
  - Mettre à jour les imports dans `ProjectsModule` et `ModerationModule`

### Frontend

- [ ] **5.6** Afficher le statut de modération sur "Mes projets"
  - Fichier : `web/src/app/(dashboard)/my-project/page.tsx`
  - Badge : 🟡 "En vérification" (PENDING_AI), 🟢 "Publié" (PUBLISHED), 🔴 "Rejeté" (REJECTED)
  - Si rejeté : afficher la raison de l'IA sous le badge

- [ ] **5.7** Banner sur la page projet si non publié
  - Fichier : `web/src/components/project-deck/project-deck.tsx`
  - Si DRAFT → "Ce projet n'est pas encore publié"
  - Si PENDING_AI → "Ce projet est en cours de vérification par notre IA"
  - Si REJECTED → "Ce projet a été rejeté : [raison]"

---

## 6. Privacy Wall (backend)

> Le composant frontend existe (blur + cadenas) mais aucune protection côté serveur. Les données sensibles sont actuellement retournées en clair.

- [ ] **6.1** Protéger les endpoints publics
  - Fichier : `api/src/users/users.service.ts`
  - Dans `findPublicProfile()` : ne jamais retourner `email`, `phone`, `linkedinUrl`, `resumeUrl`, `githubUrl`
  - Dans `getCandidatesFeed()` : idem, `select` explicite sans champs sensibles
  - Vérifier aussi `GET /projects` et `GET /projects/:id` : ne pas retourner l'email/phone du fondateur

- [ ] **6.2** Endpoint données privées avec vérification unlock
  - Route : `GET /users/:id/contact`
  - `@UseGuards(FirebaseAuthGuard)`
  - Vérifier dans la table `unlocks` : `WHERE userId = req.user.uid AND targetCandidateId = :id`
  - Si unlock trouvé → retourner `{ email, phone, linkedinUrl, githubUrl }`
  - Si pas d'unlock → `402 Payment Required` avec `{ message: "Débloque ce profil pour voir les coordonnées" }`

- [ ] **6.3** Même logique pour les projets
  - Route : `GET /projects/:id/contact`
  - Vérifie unlock sur `targetProjectId`
  - Retourne les coordonnées du fondateur

- [ ] **6.4** Composant frontend : état unlock
  - Fichier : `web/src/components/project-deck/privacy-wall.tsx`
  - Appeler `GET /users/:id/contact` au chargement
  - Si 200 → afficher les coordonnées
  - Si 402 → afficher le mur avec bouton "Débloquer" (préparation pour le module paiement Phase 2)

---

## 7. Feed candidats amélioré

> Le feed candidats existe (`GET /users/candidates/feed`) mais avec un scoring basique. Le feed projets a un algorithme 3 couches (explicit/implicit/quality) que les candidats n'ont pas.

- [ ] **7.1** Appliquer l'algorithme de scoring au feed candidats
  - Fichier : `api/src/users/users.service.ts` → `getCandidatesFeed()`
  - Scorer chaque candidat selon le projet actif du fondateur :
    - **Explicit (30%)** : intersection skills requis / skills candidat, match secteur, match ville
    - **Implicit (50%)** : signaux comportementaux du fondateur (profils vus, sauvegardés)
    - **Quality (20%)** : `profileCompleteness`, `qualityScore`, fraîcheur du profil
  - Pénalité -30% pour les candidats déjà vus

- [ ] **7.2** Ajouter les filtres manquants côté frontend
  - Fichier : `web/src/app/(dashboard)/feed/candidates/page.tsx`
  - Filtres : compétences (tag input), ville, disponibilité (IMMEDIATE/1_MONTH/3_MONTHS), secteur
  - Passer les filtres en query params à l'API

---

## Résumé — Endpoints à créer

```
POST   /applications                    Auth   Postuler à un projet
GET    /applications/mine               Auth   Mes candidatures
GET    /applications/project/:id        Auth   Candidatures reçues (fondateur)
PATCH  /applications/:id/status         Auth   Accepter/Rejeter

GET    /notifications                   Auth   Lister mes notifications
GET    /notifications/unread-count      Auth   Compteur non-lus
PATCH  /notifications/:id/read          Auth   Marquer comme lu
PATCH  /notifications/read-all          Auth   Tout marquer comme lu

PATCH  /projects/:id                    Auth   Modifier un projet
DELETE /projects/:id                    Auth   Supprimer un projet

GET    /users/:id/contact               Auth   Coordonnées (vérifie unlock)
GET    /projects/:id/contact            Auth   Coordonnées fondateur (vérifie unlock)
```

## Résumé — Pages frontend à créer

| Route | Rôle | Description |
|-------|------|-------------|
| `/applications` | Candidat | Mes candidatures envoyées |
| `/my-project/[slug]/applications` | Fondateur | Candidatures reçues |
| `/my-project/[slug]/edit` | Fondateur | Éditer un projet |
| `/notifications` | Tous | Liste complète des notifications |

## Résumé — Composants à créer

| Composant | Description |
|-----------|-------------|
| `apply-modal.tsx` | Modal de candidature |
| `notification-dropdown.tsx` | Dropdown notifications header |
| `moderation-banner.tsx` | Banner statut modération |

---

## Ordre de développement

```
Semaine 1 :  Tâches 1.1→1.5  (Candidatures backend)
             Tâches 2.1→2.3  (Notifications backend)
             Tâche  2.4      (Brancher notifs dans candidatures)

Semaine 2 :  Tâches 1.6→1.10 (Candidatures frontend)
             Tâches 2.5→2.7  (Notifications frontend)

Semaine 3 :  Tâches 3.1→3.3  (Édition/suppression projet backend)
             Tâches 3.4→3.5  (Édition/suppression projet frontend)
             Tâches 4.1→4.4  (Rate limiting)

Semaine 4 :  Tâches 5.1→5.5  (Modération IA backend)
             Tâches 5.6→5.7  (Modération IA frontend)
             Tâches 6.1→6.4  (Privacy wall backend + frontend)
             Tâches 7.1→7.2  (Feed candidats amélioré)
```

> **Total** : 40 tâches · 4 semaines · 2 devs (1 back + 1 front) ou 1 fullstack
