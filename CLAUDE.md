# CLAUDE.md — Règles de développement MojiraX

> Ce fichier est lu automatiquement par Claude Code à chaque session.
> Toute génération de code DOIT respecter ces règles. Aucune exception sans validation explicite de l'utilisateur.

---

## 0. Principes généraux

- **Stack** : Turborepo monorepo — Next.js 16 (`web/`) + NestJS 11 (`api/`) + PostgreSQL/pgvector + Redis
- **ORM** : Prisma uniquement — jamais de SQL brut
- **Auth** : Firebase Auth côté client, `FirebaseAuthGuard` côté API
- **Langue de communication** : Français
- **UI** : Toujours consulter `UI-STYLE-GUIDE.md` avant de coder du frontend
- **Base de données** : Consulter `DATABASE-SCHEMA-README.md` et `api/prisma/schema.prisma` pour le schéma
- **Backlog** : Consulter `TASKS.md` pour l'état d'avancement Phase 1
- **Workflow** : Fonctionnalité par fonctionnalité (scope → validation → code → test → user test → next)
- **Structure** : Le code source est dans `api/` et `web/` (PAS dans `apps/api/` ou `apps/web/` — migration faite)

### Superpowers — OBLIGATOIRE

Les skills superpowers DOIVENT être utilisés systématiquement :

- **Nouvelle fonctionnalité / tâche ambiguë** → Invoquer le skill `brainstorming` AVANT tout code. Poser des questions, proposer des approches, valider le design avec l'utilisateur.
- **Implémentation validée** → Invoquer le skill `writing-plans` pour créer un plan étape par étape.
- **Étape majeure terminée** → Invoquer l'agent `code-reviewer` pour valider contre le plan.
- **Bug report** → Invoquer le skill `debugging` pour suivre une méthodologie structurée.
- **Ne JAMAIS foncer dans le code** sans avoir d'abord clarifié le besoin avec l'utilisateur via le workflow brainstorming.
- **Une question à la fois** — ne pas submerger l'utilisateur avec plusieurs questions simultanées.

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
  this.apiKey = this.config.getOrThrow<string>('LYGOS_API_KEY');
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
- Types autorisés : `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.

### Webhooks
- Tout webhook entrant (Lygos Pay, etc.) DOIT vérifier la signature.
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

## Checklist rapide pour chaque PR

Avant de valider du code, vérifier :

- [ ] Tous les endpoints mutants ont `@UseGuards(FirebaseAuthGuard)`
- [ ] Ownership vérifié via `req.user.uid`
- [ ] `@Body()` utilise un DTO typé (jamais `any`)
- [ ] `select` explicite sur les requêtes Prisma publiques
- [ ] Pas de `console.log` — utiliser `Logger`
- [ ] Pas de secret en dur
- [ ] Pagination bornée (max 20)
- [ ] `forbidNonWhitelisted: true` dans ValidationPipe
- [ ] Swagger désactivé en production
- [ ] Uploads validés (type + taille)
