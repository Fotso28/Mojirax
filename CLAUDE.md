# CLAUDE.md — Guide Contexte & Règles Développement MojiraX

> Ce fichier est lu automatiquement par Claude Code à chaque session.
> Toute génération de code DOIT respecter ces règles. Aucune exception sans validation explicite de l'utilisateur.
> **Mise à jour:** 2026-03-19

---

## 📋 CONTEXTE PROJET

### Vision
**MojiraX** est une plateforme web responsive + PWA facilitant la connexion entre **Porteurs de Projets** et **Candidats Co-founders** au Cameroun, via un modèle Freemium sécurisé par IA.

### Stack Technique
- **Frontend** : Next.js 16 (React 19, TypeScript, Tailwind CSS)
- **Backend API** : NestJS 11 (Node.js, TypeScript)
- **BD** : PostgreSQL + pgvector (embeddings IA)
- **Cache/Queue** : Redis
- **Storage** : MinIO (S3-compatible, hébergé VPS local)
- **Auth** : Firebase Auth (Email, Google, LinkedIn)
- **Paiement** : Stripe
- **AI** : Modération profils, suggestions matching
- **Infrastructure** : VPS Cameroun + Docker

### Structure Monorepo
```
mojirax/
├── api/                  # NestJS Backend
├── web/                  # Next.js Frontend
├── docs/                 # Documentation
├── tasks/                # Roadmap itérative
└── tests/                # Suites de test
```

### Modules Clés du Projet
1. **Auth & Profils** : Firebase, rôles (Founder/Candidate/Admin), upload MinIO
2. **Privacy Wall** : Core feature — masquage données sensibles pour utilisateurs gratuits
3. **Modération IA** : Statuts profils (PENDING_AI → PUBLISHED/REJECTED)
4. **Feed & Matching** : Découverte avec algo matching personnalisé
5. **Paiement** : Modèle Pay-to-Contact avec Stripe
6. **Admin Dashboard** : KPIs, gestion modération, transactions

### Configuration Développement (Hybride)
- **Docker** : PostgreSQL + Redis + API (NestJS) avec hot reload
- **Local** : Web (Next.js) sur http://localhost:3000
- **Démarrage** : `./start-dev.sh` ou `docker compose up -d && cd web && npm run dev`

---

## 0. Principes généraux

- **Stack** : Turborepo monorepo — Next.js 16 (`web/`) + NestJS 11 (`api/`) + PostgreSQL/pgvector + Redis
- **ORM** : Prisma uniquement — jamais de SQL brut
- **Auth** : Firebase Auth côté client, `FirebaseAuthGuard` côté API
- **Langue de communication** : Français
- **UI** : Toujours consulter `UI-STYLE-GUIDE.md` avant de coder du frontend
- **Base de données** : Consulter `DATABASE-SCHEMA-README.md` et `api/prisma/schema.prisma` pour le schéma
- **Backlog** : Consulter `TASKS.md` pour l'état d'avancement
- **Workflow** : Fonctionnalité par fonctionnalité (scope → validation → code → test → user test → next)
- **Structure** : Le code source est dans `api/` et `web/` (PAS dans `apps/api/` ou `apps/web/` — migration faite)

### Superpowers — OBLIGATOIRE

Les skills superpowers DOIVENT être utilisés systématiquement :

- **Nouvelle fonctionnalité / tâche ambiguë** → Invoquer le skill `brainstorming` AVANT tout code. Poser des questions, proposer des approches, valider le design avec l'utilisateur. Toujours considérer le contexte camerounais (devises, langues, UX mobile-first).
- **Implémentation validée** → Invoquer le skill `writing-plans` pour créer un plan étape par étape.
- **Étape majeure terminée** → Invoquer l'agent `code-reviewer` pour valider contre le plan.
- **Bug report** → Invoquer le skill `debugging` pour suivre une méthodologie structurée.
- **Privacy Wall update** → Toujours vérifier que l'intercepteur de sécurité (Privacy Wall) est respecté.
- **Ne JAMAIS foncer dans le code** sans avoir d'abord clarifié le besoin avec l'utilisateur via le workflow brainstorming.
- **Une question à la fois** — ne pas submerger l'utilisateur avec plusieurs questions simultanées.

---

## 🔐 RÈGLES DE SÉCURITÉ STRICTES

> La sécurité est NON-NÉGOCIABLE. Toute implémentation doit passer les vérifications ci-dessous.

### ⭐ PRIVACY WALL — Feature Core (À RESPECTER ABSOLUMENT)

**LA feature la plus critique du projet.** Masquage dynamique des données sensibles selon le statut premium.

**Principes :**
- Backend vérifie `is_premium` du demandeur
- Si NON premium: supprime Email, Phone, Links, SocialLinks du JSON AVANT envoi au frontend
- Si OUI premium: retourne tous les champs
- Frontend affiche "Information Masquée" (texte) pour les champs cachés

**Champs TOUJOURS masqués pour non-premium :**
- `email`
- `phoneNumber`
- `linkedinUrl`
- `twitterHandle`
- `personalWebsite`
- `socialLinks` (objet complet)

**Implémentation :**
1. **Backend Interceptor** : `/api/*` routes — filter via middleware ou decorator
2. **Service Layer** : Logique masquage centralisée (jamais dupliquée)
3. **Tests** : Toujours tester les 2 cas (premium = true/false)

```typescript
// CORRECT — masquage centralisé en service
private maskSensitiveFields(user: User, isPremium: boolean): PublicUserDTO {
  if (!isPremium) {
    const { email, phoneNumber, linkedinUrl, ...safeData } = user;
    return safeData;
  }
  return user;
}

// À la source en backend, jamais en frontend
```

---

## A01 — Broken Access Control

### Guards obligatoires
- **Tout endpoint mutant ou retournant des données privées** DOIT avoir `@UseGuards(FirebaseAuthGuard)`.
- Ne jamais créer d'endpoint PATCH/PUT/DELETE sans guard.

```typescript
// CORRECT
@UseGuards(FirebaseAuthGuard)
@Patch('profile')
async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) { ... }

// INTERDIT — pas de guard
@Patch('profile')
async updateProfile(@Body() dto: UpdateProfileDto) { ... }
```

### Vérification d'ownership
- Toujours vérifier que `req.user.uid` correspond à la ressource modifiée.
- Ne jamais se fier à un `userId` passé dans le body ou les query params.

```typescript
// CORRECT
const project = await this.prisma.project.findUnique({ where: { id } });
if (project.founderId !== req.user.uid) throw new ForbiddenException();

// INTERDIT — userId du body
const { userId, ...data } = body;
await this.prisma.project.update({ where: { founderId: userId }, data });
```

### Select explicites
- Les requêtes Prisma vers des endpoints publics DOIVENT utiliser `select` pour ne retourner que les champs nécessaires.
- Ne JAMAIS retourner `email`, `phone`, `firebaseUid` dans les endpoints publics (feed, search, profils publics).

```typescript
// CORRECT — endpoint public
const founders = await this.prisma.user.findMany({
  select: { id: true, displayName: true, avatarUrl: true, headline: true },
});

// INTERDIT — leak de données sensibles
const founders = await this.prisma.user.findMany();
```

---

## A02 — Cryptographic Failures

### Secrets et variables d'environnement
- **Jamais** de secret, clé API, ou mot de passe en dur dans le code.
- Utiliser `ConfigService` de NestJS ou `process.env` avec validation au démarrage.
- Les fichiers `.env` sont dans `.gitignore` — vérifier avant tout commit.

```typescript
// CORRECT
constructor(private config: ConfigService) {
  this.apiKey = this.config.getOrThrow<string>('STRIPE_SECRET_KEY');
}

// INTERDIT
const apiKey = 'sk-live-abc123...';
```

### Données sensibles
- Ne jamais logger de tokens, mots de passe, ou clés API.
- Ne jamais stocker de mots de passe en clair (Firebase gère l'auth).

---

## A03 — Injection

### ORM uniquement
- Utiliser **Prisma** pour toutes les requêtes base de données.
- **Interdit** : `$queryRawUnsafe`, `$executeRawUnsafe` avec des variables non-échappées.
- Si `$queryRaw` est nécessaire, utiliser les tagged template literals de Prisma (`Prisma.sql`).

```typescript
// CORRECT
const users = await this.prisma.user.findMany({ where: { city } });

// CORRECT si raw nécessaire
const result = await this.prisma.$queryRaw(Prisma.sql`SELECT * FROM "User" WHERE city = ${city}`);

// INTERDIT
const result = await this.prisma.$queryRawUnsafe(`SELECT * FROM "User" WHERE city = '${city}'`);
```

### Frontend — pas d'injection XSS
- **Interdit** : `dangerouslySetInnerHTML` sauf sur du contenu sanitisé avec DOMPurify.
- **Interdit** : `eval()`, `new Function()`, `innerHTML` direct.

---

## A04 — Insecure Design

### DTOs typés obligatoires
- **Tout** `@Body()` DOIT utiliser un DTO typé avec des décorateurs `class-validator`.
- `@Body() body: any` est **strictement interdit**.

```typescript
// CORRECT
@Patch('onboarding')
async saveOnboarding(@Request() req, @Body() dto: SaveOnboardingDto) { ... }

// INTERDIT
@Patch('onboarding')
async saveOnboarding(@Request() req, @Body() body: any) { ... }
```

### Rate limiting
- Tout endpoint public ou sensible (login, register, reset password) DOIT avoir un rate limiter.
- Utiliser `@nestjs/throttler` avec des limites raisonnables.

### Pagination bornée
- Les endpoints qui retournent des listes DOIVENT supporter la pagination.
- `take` ne doit JAMAIS dépasser 100. Valeur par défaut : 20.

```typescript
// CORRECT
const take = Math.min(dto.limit ?? 20, 100);
const projects = await this.prisma.project.findMany({ take, skip: dto.offset ?? 0 });

// INTERDIT — pas de limite
const projects = await this.prisma.project.findMany();
```

---

## A05 — Security Misconfiguration

### Helmet
- `helmet` DOIT être activé dans `main.ts` en production.

```typescript
import helmet from 'helmet';
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
}
```

### CORS strict
- L'origin CORS doit être configurée depuis `process.env.FRONTEND_URL`.
- En production, ne jamais utiliser `origin: true` ou `origin: '*'`.

### Swagger conditionnel
- Swagger ne DOIT être exposé qu'en développement.

```typescript
if (process.env.NODE_ENV !== 'production') {
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
```

### ValidationPipe strict
- `forbidNonWhitelisted: true` DOIT être activé pour rejeter les propriétés inconnues.

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

### Headers de sécurité frontend
- Configurer les headers de sécurité dans `next.config.js` :
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## A06 — Vulnerable and Outdated Components

### Audit des dépendances
- Avant d'ajouter un package, vérifier qu'il est maintenu (dernière release < 12 mois).
- Ne jamais installer de package deprecated.
- `package-lock.json` DOIT être commité.

### Mises à jour
- Préférer les packages avec 0 vulnérabilités connues.
- `npm audit` doit être propre sur les dépendances de production.

---

## A07 — Identification and Authentication Failures

### Firebase uniquement
- L'authentification se fait **exclusivement** via Firebase Auth.
- Le backend valide le token Firebase via `FirebaseAuthGuard` + `FirebaseStrategy`.
- Ne jamais implémenter de système d'auth custom (JWT maison, sessions, etc.).

### Identité utilisateur
- L'identité de l'utilisateur DOIT provenir de `req.user` (décodé du token Firebase).
- Ne JAMAIS faire confiance à un `userId`, `email`, ou `firebaseUid` passé dans le body ou les query params.

```typescript
// CORRECT
const userId = req.user.uid;

// INTERDIT
const { userId } = req.body;
```

---

## A08 — Software and Data Integrity Failures

### Uploads
- Valider le type MIME et la taille des fichiers uploadés côté serveur.
- Taille max : 5 MB pour les images, 10 MB pour les documents.
- Types autorisés : `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

### Webhooks
- Tout webhook entrant (Stripe, etc.) DOIT vérifier la signature.
- Ne jamais traiter un webhook sans validation de son authenticité.

### Migrations Prisma
- Les migrations doivent être relues avant application.
- Ne jamais utiliser `prisma db push` en production — uniquement `prisma migrate deploy`.

---

## A09 — Security Logging and Monitoring Failures

### Logger NestJS
- Utiliser le `Logger` de NestJS, **jamais** `console.log` / `console.error` / `console.warn`.

```typescript
// CORRECT
import { Logger } from '@nestjs/common';
private readonly logger = new Logger(ProjectsService.name);
this.logger.log('Project created', { projectId });

// INTERDIT
console.log('Project created');
```

### Logs d'accès
- Logger les tentatives d'accès refusées (ForbiddenException, UnauthorizedException).
- Logger les actions sensibles : création de projet, changement de rôle, paiement.
- Ne JAMAIS logger de données sensibles (tokens, mots de passe, données personnelles complètes).

---

## A10 — Server-Side Request Forgery (SSRF)

### Pas de fetch sur URL utilisateur
- Ne jamais faire de `fetch()` ou `axios.get()` sur une URL fournie par l'utilisateur.
- Si nécessaire, maintenir une allowlist de domaines autorisés.

### Bloquer les IPs privées
- Si un service doit faire des requêtes sortantes, bloquer les ranges privés :
  `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`.

---

## M01 — Contrôle d'accès messagerie

- Tout accès à une conversation doit vérifier que l'utilisateur est membre (founder ou candidate).
- Vérifier la membership via `Conversation.founderId` ou `Conversation.candidate.userId`.
- Ne jamais se fier à un `conversationId` passé sans vérification.

```typescript
// CORRECT
const conversation = await this.prisma.conversation.findUnique({
  where: { id: conversationId },
  include: { candidate: { select: { userId: true } } },
});
if (conversation.founderId !== userId && conversation.candidate.userId !== userId) {
  throw new ForbiddenException();
}

// INTERDIT — pas de vérification de membership
const messages = await this.prisma.message.findMany({ where: { conversationId } });
```

---

## M02 — Validation des messages

- Contenu texte : max 5000 caractères.
- Fichiers : max 5 MB, types autorisés PDF + DOCX uniquement.
- Valider côté DTO (`class-validator`) ET côté gateway.

```typescript
// DTO — SendMessageDto
@IsString()
@MaxLength(5000)
content: string;
```

---

## M03 — Rate limiting WebSocket

- Rate limiting Redis-based pour les événements WebSocket.
- `message:send` : 30 requêtes / 60 secondes.
- `typing:start` : 10 requêtes / 10 secondes.
- `reaction:add` / `reaction:remove` : 20 requêtes / 60 secondes.
- Logger les dépassements via le `Logger` NestJS.

---

## M04 — Auth WebSocket

- Vérification Firebase token à la connexion WebSocket (`handleConnection`).
- Re-vérification toutes les 50 minutes via événement `auth:refresh`.
- Déconnexion immédiate si token expiré ou invalide.

```typescript
// CORRECT — dans le gateway
async handleConnection(client: Socket) {
  const token = client.handshake.auth?.token;
  if (!token) { client.disconnect(); return; }
  const decoded = await this.firebaseAdmin.verifyIdToken(token);
  client.data.userId = decoded.uid;
}
```

---

## 🎯 WORKFLOWS CLÉS DU PROJET

### Workflow Inscription Candidat
1. Sign up email/Google/LinkedIn
2. Sélection rôle "Candidate"
3. Remplissage profil (Bio, Stack, Skills)
4. Upload photo → MinIO (Sharp resize 512x640)
5. Profil statut `PENDING_AI`
6. Tâche IA validate → `PUBLISHED` ou `REJECTED`
7. Accès au feed des projets (Privacy Wall actif pour gratuit)

### Workflow Déblocage Contact (Pay-to-Contact)
1. Utilisateur gratuit voit profil bloqué → "Information Masquée"
2. Clic "Débloquer Contact"
3. Redirection Stripe Checkout
4. Paiement confirmé → Webhook backend
5. `update user set is_premium = true`
6. Page success → Détails maintenant visibles

### Workflow Modération Admin
1. Accès dashboard `/admin` (AdminGuard)
2. Queue de profils `PENDING_AI`
3. Aperçu avec contenu + raison IA de rejection
4. Actions: Approve → `PUBLISHED`, Reject → `REJECTED`, Edit Prompt → test
5. KPIs mis à jour en temps réel (Redis cache si needed)

### Workflow Matching & Interaction
1. Candidat browse feed de projets (filtrable)
2. Candidat envoie "Interested" → notification Founder
3. Founder voit candidat (avec Privacy Wall si gratuit)
4. Founder clique "Débloquer Contact" → paiement
5. Après paiement: accès email/phone candidat

---

## 🛠️ COMMANDES UTILES

```bash
# Développement
npm run dev                    # Start tous les services
docker compose up -d          # Start postgres, redis, api
npm run build                  # Build tous les packages
npm run lint                   # Lint tout le projet
npm run format                 # Format avec Prettier

# Base de données
npx prisma migrate dev        # Créer & appliquer migration
npx prisma migrate deploy     # Déployer en production (jamais db push !)
npx prisma db seed           # Seed données initiales
npx prisma studio            # Interface graphique BD

# Testing
npm run test                  # Run tous les tests
npm run test:watch           # Mode watch
npm run test:e2e             # E2E tests (paiement, auth, etc.)

# Logs & Debugging
docker compose logs -f api   # Logs API en temps réel
docker compose logs -f db    # Logs PostgreSQL
docker ps                    # Vérifier containers actifs

# Audit
npm audit                     # Vérifier vulnérabilités
npm audit fix                 # Corriger auto si possible
```

---

## 📚 FICHIERS IMPORTANTS À CONSULTER

- [prd.md](./prd.md) — PRD détaillé, toutes les fonctionnalités
- [DEV-SETUP.md](./DEV-SETUP.md) — Notes setup hybride
- [product_context.md](./product_context.md) — Vision & spécifications initiales
- [DATABASE-SCHEMA-README.md](./DATABASE-SCHEMA-README.md) — Schéma DB détaillé
- [UI-STYLE-GUIDE.md](./UI-STYLE-GUIDE.md) — Design system Glassmorphic
- [TASKS.md](./TASKS.md) — Roadmap & tâches itératives
- [api/prisma/schema.prisma](./api/prisma/schema.prisma) — Schéma Prisma source

---

## 🌍 NOTES CONTEXTE CAMEROUN

MojiraX est un projet spécifique au Cameroun. Points clés:
- **Devises** : EUR — toujours afficher montants en EUR
- **Langues** : Support Français + Anglais
- **Connectivité** : Considérer réseau mobile 3G/4G (optimiser images, lazy-load)
- **UX Mobile-first** : ~80% trafic via mobile
- **Paiement** : Stripe intégré
---

## ✅ CHECKLIST AVANT CHAQUE PULL REQUEST

**Sécurité d'abord.** Avant de créer une PR, vérifier :

- [ ] **Privacy Wall** : Si endpoints retourne données utilisateur, vérifier masquage pour non-premium
- [ ] Tous les endpoints mutants ont `@UseGuards(FirebaseAuthGuard)`
- [ ] Ownership vérifié via `req.user.uid` (jamais trust userId du body)
- [ ] `@Body()` utilise un DTO typé (jamais `any`)
- [ ] `select` explicite sur les requêtes Prisma publiques (jamais retourner email/phone)
- [ ] Pas de `console.log` — utiliser `Logger` de NestJS
- [ ] Pas de secret/API key en dur dans le code
- [ ] Pagination bornée (max take = 100, default = 20)
- [ ] `forbidNonWhitelisted: true` dans ValidationPipe
- [ ] Swagger désactivé en production (vérifier `NODE_ENV` check)
- [ ] Uploads validés (type MIME + taille max)
- [ ] Aucune donnée sensible loggée (pas de tokens, mots de passe, emails complets)
- [ ] Webhooks (paiement) validés via signature
- [ ] Tests e2e pour features sensibles (auth, paiement, privacy)
- [ ] Code formaté (`npm run format`)
- [ ] Pas de vulnérabilités (`npm audit`)

---

## 📞 EN CAS DE DOUTE

- Consulter `prd.md` pour la logique métier complète
- Consulter `DATABASE-SCHEMA-README.md` si modifiant les modèles Prisma
- Consulter `UI-STYLE-GUIDE.md` si modifiant le frontend
- Consulter `TASKS.md` pour la phase actuelle
- **Utiliser Superpowers** : Ne jamais deviner la bonne approche sans `brainstorming`

---

**Dernière mise à jour:** 2026-03-19  
**Responsable Principal:** Oswald (Project Owner)  
**Statut:** EN COURS (Phase 3 - Optimisation & PWA)  
**Version Docs:** 2.0 (Enhanced Context + Security)
