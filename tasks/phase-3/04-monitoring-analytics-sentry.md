# 04 — Monitoring, Analytics & Error Tracking

## Résumé

Mettre en place le suivi des erreurs (Sentry), des analytics utilisateurs (Google Analytics ou Mixpanel), et un health check avancé pour monitorer la santé de la plateforme.

## Contexte

**Ce qui existe :**
- Health check basique (`/health`) dans l'API
- NestJS Logger en place
- Aucun error tracking
- Aucun analytics

## Spécification

### A. Sentry (Error Tracking)

**Packages :**
- API : `@sentry/nestjs`
- Web : `@sentry/nextjs`

**Configuration API :** `api/src/main.ts`
- Initialiser Sentry avec le DSN depuis `process.env.SENTRY_DSN`
- Capturer les exceptions non gérées
- Ajouter le contexte utilisateur (userId, rôle) sur chaque requête

**Configuration Web :** `web/sentry.client.config.ts` + `web/sentry.server.config.ts`
- Capturer les erreurs JS côté client
- Source maps uploadées automatiquement

### B. Analytics (Google Analytics 4)

**Fichier :** `web/app/layout.tsx`

- Script GA4 conditionnel (uniquement en production)
- Tracking des pages vues automatique via App Router
- Events custom :
  - `project_created` — projet créé
  - `application_sent` — candidature envoyée
  - `profile_unlocked` — profil débloqué
  - `search_performed` — recherche effectuée

### C. Health Check Avancé

**Fichier :** `api/src/health/health.controller.ts`

Étendre le health check existant pour vérifier :
- PostgreSQL (connexion Prisma)
- Redis (ping)
- MinIO (bucket accessible)
- Firebase Admin SDK (vérification token)

```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "storage": "ok",
    "firebase": "ok"
  },
  "uptime": 3600,
  "version": "1.4.0"
}
```

## Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `api/src/main.ts` | Initialiser Sentry |
| `api/src/health/health.controller.ts` | Health check avancé |
| `web/sentry.client.config.ts` | **Créer** |
| `web/sentry.server.config.ts` | **Créer** |
| `web/app/layout.tsx` | Ajouter script GA4 |
| `.env` | Ajouter `SENTRY_DSN`, `GA_MEASUREMENT_ID` |

## Tests et validation

- [ ] Une erreur non catchée dans l'API apparaît dans Sentry
- [ ] Une erreur JS côté client apparaît dans Sentry
- [ ] Google Analytics reçoit les page views
- [ ] `GET /health` retourne le statut de chaque service
- [ ] Le health check retourne `"degraded"` si un service est down

### Condition de validation finale

> Les erreurs production sont capturées automatiquement dans Sentry avec contexte utilisateur. Les métriques d'usage sont trackées via GA4. Le health check permet de monitorer la santé de tous les services.
