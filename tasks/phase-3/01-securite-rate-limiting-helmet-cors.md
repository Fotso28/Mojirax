# 01 — Sécurité : Rate Limiting, Helmet, CORS

## Résumé

Mettre en place les protections de sécurité essentielles pour la production : rate limiting sur les endpoints sensibles, headers de sécurité via Helmet, et CORS stricte.

## Contexte

**Ce qui existe :**
- `@nestjs/throttler` est installé mais **non configuré globalement**
- Un seul endpoint a un rate limit : `POST /projects` (3 req/min) et `POST /users/avatar` (5 req/min)
- Helmet **non installé**
- CORS configuré avec `origin: true` (accepte tout) en dev
- `ValidationPipe` actif avec `whitelist: true` et `forbidNonWhitelisted: true`

## Spécification

### A. Rate Limiting Global (`@nestjs/throttler`)

**Fichier :** `api/src/app.module.ts`

Configurer `ThrottlerModule.forRoot()` avec limites globales :

| Scope | TTL | Limit | Cible |
|-------|-----|-------|-------|
| Global | 60s | 100 | Tous les endpoints |
| Auth | 60s | 5 | `POST /auth/sync` |
| Upload | 60s | 5 | `POST */avatar`, `POST */logo`, `POST /projects/from-document` |
| Search | 10s | 10 | `GET /search/*` |

**Endpoints à protéger spécifiquement :**
- `POST /auth/sync` — 5 req/min (anti brute-force)
- `POST /applications` — 10 req/min (anti spam candidatures)
- `POST /projects` — 3 req/min (déjà en place)
- `POST /projects/from-document` — 3 req/min
- `GET /search/*` — 10 req/10s

### B. Helmet (Headers de sécurité)

**Fichier :** `api/src/main.ts`

```typescript
import helmet from 'helmet';

// En production seulement (ou toujours, avec config adaptée)
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
}
```

**Package :** `npm install helmet`

### C. CORS Stricte

**Fichier :** `api/src/main.ts`

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**En production :** `FRONTEND_URL` doit pointer vers le domaine réel (jamais `*`).

### D. Headers Sécurité Frontend (Next.js)

**Fichier :** `web/next.config.js` (ou `next.config.ts`)

```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
  ];
},
```

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `api/src/main.ts` | Ajouter Helmet + CORS stricte |
| `api/src/app.module.ts` | Configurer `ThrottlerModule` global |
| `api/src/auth/auth.controller.ts` | Ajouter `@Throttle()` sur `POST /auth/sync` |
| `api/src/applications/applications.controller.ts` | Ajouter `@Throttle()` sur `POST /applications` |
| `web/next.config.ts` | Ajouter headers de sécurité |
| `package.json` (api) | Installer `helmet` |

## Tests et validation

- [ ] `npm audit` propre (0 vulnérabilités critiques/hautes)
- [ ] Rate limiter actif : 6e requête en 60s sur `/auth/sync` → 429 Too Many Requests
- [ ] Headers Helmet présents en réponse (`X-Content-Type-Options`, etc.)
- [ ] CORS bloque les requêtes depuis un domaine non autorisé
- [ ] Les headers de sécurité frontend sont présents dans les réponses Next.js
- [ ] L'API fonctionne normalement avec toutes les protections activées

### Condition de validation finale

> En production, l'API est protégée par rate limiting, Helmet, et CORS stricte. Aucun endpoint sensible ne peut être spammé. Les headers de sécurité sont présents côté API et frontend.
