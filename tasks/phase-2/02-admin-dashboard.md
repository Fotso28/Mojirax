# 02 — Admin Dashboard

## Résumé

Créer un module d'administration avec dashboard KPIs, file de modération, gestion des utilisateurs et des transactions.

## Contexte

**Ce qui existe :**
- Table `admin_logs` en base (non utilisée)
- Modération IA automatique (projets + candidats → PUBLISHED/REJECTED)
- Table `ModerationLog` avec les résultats IA
- NestJS Logger pour les événements importants
- Rôle `ADMIN` dans l'enum `Role` du schéma Prisma

**Ce qui manque :**
- Aucun endpoint admin
- Aucune page admin frontend
- Aucun guard admin

## Spécification

### A. Guard Admin

**Fichier :** `api/src/auth/admin.guard.ts`

```typescript
// Vérifie que l'utilisateur a le rôle ADMIN
// Combiné avec FirebaseAuthGuard
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return request.user?.role === 'ADMIN';
  }
}
```

### B. `AdminModule` — Backend

**Fichiers :**
- `api/src/admin/admin.module.ts`
- `api/src/admin/admin.service.ts`
- `api/src/admin/admin.controller.ts`

**Endpoints :**

| Endpoint | Description | Guard |
|----------|-------------|-------|
| `GET /admin/kpis` | KPIs globaux | Admin |
| `GET /admin/users` | Liste des utilisateurs (paginée, filtrable) | Admin |
| `GET /admin/users/:id` | Détail d'un utilisateur | Admin |
| `PATCH /admin/users/:id/role` | Changer le rôle d'un utilisateur | Admin |
| `GET /admin/moderation` | File de modération (profils/projets PENDING_AI) | Admin |
| `PATCH /admin/moderation/:id` | Approuver/rejeter manuellement | Admin |
| `GET /admin/transactions` | Liste des transactions (paginée) | Admin |
| `GET /admin/logs` | Logs d'administration | Admin |

### C. KPIs (`GET /admin/kpis`)

```json
{
  "users": {
    "total": 150,
    "founders": 80,
    "candidates": 70,
    "newThisWeek": 12
  },
  "projects": {
    "total": 60,
    "published": 45,
    "pendingAi": 5,
    "analyzingDoc": 3
  },
  "applications": {
    "total": 200,
    "pending": 30,
    "accepted": 50,
    "rejected": 120
  },
  "revenue": {
    "totalXAF": 500000,
    "thisMonthXAF": 80000,
    "transactionsCount": 250,
    "unlockCount": 200
  },
  "moderation": {
    "pendingProfiles": 3,
    "pendingProjects": 2,
    "rejectedToday": 1
  }
}
```

### D. File de modération

Afficher les profils/projets en `PENDING_AI` ou `REJECTED` :
- Bouton "Approuver" → passe à `PUBLISHED`
- Bouton "Rejeter" → passe à `REJECTED` avec raison
- Afficher les `ModerationLog` associés (résultats IA)

### E. Frontend Admin

**Pages :**

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin` | KPIs + graphiques |
| Utilisateurs | `/admin/users` | Tableau paginé |
| Modération | `/admin/moderation` | File de review |
| Transactions | `/admin/transactions` | Historique paiements |

**Layout :** Sidebar admin séparée avec navigation dédiée.

**Accès :** Vérifier `user.role === 'ADMIN'` côté frontend. Rediriger si non-admin.

## Fichiers à créer

| Fichier | Action |
|---------|--------|
| `api/src/auth/admin.guard.ts` | **Créer** |
| `api/src/admin/admin.module.ts` | **Créer** |
| `api/src/admin/admin.service.ts` | **Créer** |
| `api/src/admin/admin.controller.ts` | **Créer** |
| `api/src/app.module.ts` | Enregistrer `AdminModule` |
| `web/src/app/admin/page.tsx` | **Créer** (dashboard) |
| `web/src/app/admin/users/page.tsx` | **Créer** |
| `web/src/app/admin/moderation/page.tsx` | **Créer** |
| `web/src/app/admin/transactions/page.tsx` | **Créer** |
| `web/src/app/admin/layout.tsx` | **Créer** (layout admin) |

## Tests et validation

- [ ] `GET /admin/kpis` retourne les métriques correctes
- [ ] Un non-admin reçoit 403 sur tous les endpoints admin
- [ ] La file de modération affiche les profils/projets en attente
- [ ] Approuver un profil le passe en PUBLISHED + notification
- [ ] Le dashboard affiche les graphiques KPI
- [ ] La liste des utilisateurs est paginée et filtrable par rôle

### Condition de validation finale

> Un administrateur peut consulter les KPIs de la plateforme, modérer manuellement les profils/projets, gérer les utilisateurs et consulter l'historique des transactions. Les endpoints admin sont protégés par un guard dédié.
