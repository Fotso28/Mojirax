# Plan Features Enforcement — Design Spec

**Date :** 2026-04-15
**Auteur :** Claude (brainstorming avec Oswald)
**Statut :** Approuvé

---

## Contexte

L'audit des plans de paiement a révélé que certaines features promises ne sont pas enforced dans le code. Ce spec couvre 3 corrections :

1. **Pubs pour tous** — choix de design assumé, retrait de la promesse "sans pub" du plan PLUS
2. **Boost visibilité par plan** — gradation progressive dans les résultats de recherche
3. **Feed intelligent + section "Profils actifs" PRO** — tri composite pour tous + section exclusive PRO+

---

## 1. Pubs pour tous (modification doc design)

### Décision

Les publicités natives s'affichent pour **tous les plans**, y compris les plans payants. C'est un choix produit assumé : les pubs financent la plateforme et ne sont pas intrusives (format natif dans le feed).

### Changements

- **`api/prisma/seed.sql`** : Retirer la feature "Expérience sans contenu sponsorisé" de la liste features du plan PLUS
- **`seed-prod.sql`** (si existant) : Idem
- **Spec design pricing** (`docs/superpowers/specs/2026-03-13-pricing-plans-admin-design.md`) : Mettre à jour si cette feature y est mentionnée
- **Aucun changement de code** : Le comportement actuel (pubs pour tous) est déjà correct

---

## 2. Boost visibilité par plan dans la recherche

### Objectif

Les profils/projets des utilisateurs payants remontent plus haut dans les résultats de recherche des autres utilisateurs. Gradation progressive selon le plan.

### Valeurs de boost (similarity score, échelle 0-1)

| Plan  | Boost |
|-------|-------|
| FREE  | +0.00 |
| PLUS  | +0.03 |
| PRO   | +0.06 |
| ELITE | +0.10 (existant) |

### Fichier impacté

`api/src/search/search.service.ts` — 2 méthodes :
- `searchUniversal()` (lignes ~183-219)
- `search()` (lignes ~445-480)

### Design technique

Remplacer le bloc actuel qui ne cherche que les ELITE par un bloc générique qui :

1. Récupère le plan de chaque owner (founder pour projets, user pour candidats) en une seule requête Prisma
2. Applique le boost correspondant au plan via une constante `PLAN_SEARCH_BOOST`
3. Re-trie les résultats

```typescript
// Nouvelle constante dans plan-limits.config.ts
export const PLAN_SEARCH_BOOST: Record<UserPlan, number> = {
  FREE: 0,
  PLUS: 0.03,
  PRO: 0.06,
  ELITE: 0.10,
};
```

```typescript
// Dans search.service.ts — remplace le bloc "ELITE plan priority"
try {
  const projectIds = mergedProjects.map((p: any) => p.id);
  if (projectIds.length > 0) {
    const projectPlans = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, founder: { select: { plan: true } } },
    });
    const planMap = new Map(projectPlans.map(p => [p.id, p.founder.plan]));
    for (const result of mergedProjects) {
      const boost = PLAN_SEARCH_BOOST[planMap.get(result.id) ?? 'FREE'] ?? 0;
      if (boost > 0) {
        result.similarity = Math.min(1, (result.similarity || 0) + boost);
      }
    }
  }

  // Idem pour candidats
  const peopleIds = mergedPeople.map((p: any) => p.id);
  if (peopleIds.length > 0) {
    const candidatePlans = await this.prisma.candidateProfile.findMany({
      where: { id: { in: peopleIds } },
      select: { id: true, user: { select: { plan: true } } },
    });
    const planMap = new Map(candidatePlans.map(c => [c.id, c.user.plan]));
    for (const result of mergedPeople) {
      const boost = PLAN_SEARCH_BOOST[planMap.get(result.id) ?? 'FREE'] ?? 0;
      if (boost > 0) {
        result.similarity = Math.min(1, (result.similarity || 0) + boost);
      }
    }
  }

  mergedProjects.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  mergedPeople.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
} catch (e) {
  // Plan priority is non-critical
}
```

### Pourquoi pas de requête supplémentaire ?

On récupère déjà les IDs des résultats. La requête Prisma pour obtenir les plans est un simple `SELECT id, plan FROM users WHERE id IN (...)` via la relation — latence négligeable.

---

## 3. Feed intelligent + section "Profils actifs" PRO

### 3a. Feed intelligent pour tous

#### Objectif

Remplacer le tri par date (`createdAt desc`) dans `getCandidatesFeed` par un tri composite qui priorise la qualité et l'activité.

#### Score composite

```
feedScore = qualityScore * 0.6 + activityScore * 0.4
```

- **qualityScore** (0-100) : Déjà existant sur `CandidateProfile`, calculé par la modération IA
- **activityScore** (0-100) : Calculé à la volée basé sur les candidatures envoyées (30 derniers jours)
  - `min(applicationCount / 5, 1) * 100`
  - Note : les "vues reçues" ne sont pas trackées au niveau candidat dans le schéma actuel. Le nombre de candidatures envoyées est utilisé comme proxy d'activité.

#### Fichier impacté

`api/src/users/users.service.ts` — méthode `getCandidatesFeed()`

#### Design technique

1. Récupérer les candidats publiés avec pagination cursor (comme actuellement)
2. Pour chaque batch, calculer le `activityScore` via une requête groupée sur `Interaction` (30 derniers jours)
3. Calculer `feedScore` et trier en mémoire
4. Retourner le résultat trié

```typescript
// Après avoir récupéré les candidats
const candidateIds = candidates.map(c => c.id);
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

// Compter les interactions récentes groupées par candidateId
const [applicationCounts, viewCounts] = await Promise.all([
  this.prisma.application.groupBy({
    by: ['candidateId'],
    where: { candidateId: { in: candidateIds }, createdAt: { gte: thirtyDaysAgo } },
    _count: true,
  }),
  this.prisma.interaction.groupBy({
    by: ['targetUserId'],
    where: { targetUserId: { in: candidates.map(c => c.user.id) }, type: 'VIEW', createdAt: { gte: thirtyDaysAgo } },
    _count: true,
  }),
]);

// Calculer feedScore et trier
const scored = candidates.map(c => {
  const apps = applicationCounts.find(a => a.candidateId === c.id)?._count ?? 0;
  const views = viewCounts.find(v => v.targetUserId === c.user.id)?._count ?? 0;
  const activityScore = Math.min(apps / 5, 1) * 60 + Math.min(views / 20, 1) * 40;
  const feedScore = (c.qualityScore ?? 50) * 0.6 + activityScore * 0.4;
  return { ...c, _feedScore: feedScore };
});

scored.sort((a, b) => b._feedScore - a._feedScore);
```

#### Note sur la pagination

Le tri composite rend la pagination cursor classique moins fiable (l'ordre n'est plus déterministe par ID). Deux options :
- **Option retenue** : Garder la pagination cursor mais accepter que l'ordre puisse varier légèrement entre pages. C'est acceptable pour un feed de découverte.
- Alternative : Passer à offset/limit — mais plus lourd et risque de doublons. Pas nécessaire ici.

### 3b. Section "Profils les plus actifs" — PRO+ exclusif

#### Objectif

Un nouvel endpoint retourne les top 10 profils candidats les plus actifs de la semaine. Gated par `@RequiresPlan(UserPlan.PRO)`.

#### Endpoint

```
GET /users/top-active
```

- **Guard** : `FirebaseAuthGuard` + `PlanGuard` avec `@RequiresPlan(UserPlan.PRO)`
- **Réponse** : Liste de 10 candidats maximum, triés par activité de la semaine
- **Cache** : Redis, TTL 1 heure (les profils actifs ne changent pas à la seconde)

#### Score d'activité hebdomadaire

```
weeklyActivityScore = applications_7j * 3
```

> Note : Le schéma actuel ne tracke pas les vues reçues par candidat. Les candidatures envoyées sont le seul signal d'activité fiable.

#### Design technique

```typescript
// users.service.ts
async getTopActiveCandidates(limit = 10): Promise<TopActiveCandidate[]> {
  const take = Math.min(limit, 10);
  const cacheKey = 'top_active_candidates';

  // Check Redis cache
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Candidats publiés avec activité récente
  const applicationCounts = await this.prisma.application.groupBy({
    by: ['candidateId'],
    where: { createdAt: { gte: sevenDaysAgo } },
    _count: true,
    orderBy: { _count: { candidateId: 'desc' } },
    take: 50, // Pool large pour ensuite trier
  });

  const activeCandidateIds = applicationCounts.map(a => a.candidateId);

  const candidates = await this.prisma.candidateProfile.findMany({
    where: {
      status: 'PUBLISHED',
      id: { in: activeCandidateIds },
    },
    select: {
      id: true,
      shortPitch: true,
      roleType: true,
      qualityScore: true,
      user: {
        select: {
          id: true, firstName: true, lastName: true,
          name: true, image: true, title: true,
          skills: true, city: true,
        },
      },
    },
  });

  // Score et tri
  const appMap = new Map(applicationCounts.map(a => [a.candidateId, a._count]));
  const scored = candidates.map(c => ({
    ...c,
    weeklyActivity: (appMap.get(c.id) ?? 0) * 3,
  }));
  scored.sort((a, b) => b.weeklyActivity - a.weeklyActivity);

  const result = scored.slice(0, take);

  // Cache Redis 1 heure
  await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);

  return result;
}
```

#### Frontend

- Composant `TopActiveCandidates` affiché en haut du feed, avant la liste principale
- Affichage conditionnel : uniquement si `user.plan` est PRO ou ELITE
- Carrousel horizontal ou grille 2x5 selon le viewport
- Badge "Actif cette semaine" sur chaque profil
- Si l'appel API retourne 403 (plan insuffisant), le composant ne s'affiche pas (pas d'upsell ici — l'upsell est sur la page pricing)

---

## Fichiers impactés (résumé)

| Fichier | Changement |
|---------|-----------|
| `api/prisma/seed.sql` | Retirer "sans contenu sponsorisé" du PLUS |
| `seed-prod.sql` | Idem |
| `api/src/common/config/plan-limits.config.ts` | Ajouter `PLAN_SEARCH_BOOST` |
| `api/src/search/search.service.ts` | Remplacer bloc ELITE-only par boost progressif |
| `api/src/users/users.service.ts` | Feed intelligent + `getTopActiveCandidates()` |
| `api/src/users/users.controller.ts` | Nouvel endpoint `GET /users/top-active` |
| `web/src/components/feed/feed-stream.tsx` | Intégrer composant TopActiveCandidates |
| `web/src/components/feed/top-active-candidates.tsx` | Nouveau composant (PRO+ only) |

---

## Hors scope

- Système de support prioritaire ELITE (pas de système de tickets existant)
- Feature flags / accès anticipé ELITE (infrastructure prête mais vide — à traiter séparément)
- Modification du système de pubs (les pubs restent pour tous)
