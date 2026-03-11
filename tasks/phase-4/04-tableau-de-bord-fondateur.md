# 04 — Tableau de Bord Fondateur

## Résumé

Créer un tableau de bord personnalisé pour les fondateurs avec les métriques de leur projet : vues, candidatures, matchs, et engagement.

## Contexte

**Ce qui existe :**
- Page "Mes Projets" avec liste et statut
- Table `Interaction` (VIEW, CLICK, SAVE, APPLY, DWELL, SCROLL_DEPTH)
- Table `Application` (candidatures reçues)
- Table `MatchScore` (matchs IA)

## Spécification

### A. Métriques du dashboard

```json
{
  "project": {
    "name": "MojiraX",
    "status": "PUBLISHED",
    "createdAt": "2026-03-01",
    "daysActive": 10
  },
  "engagement": {
    "views": 245,
    "clicks": 89,
    "saves": 12,
    "viewsThisWeek": 45,
    "trend": "+15%"
  },
  "applications": {
    "total": 8,
    "pending": 3,
    "accepted": 2,
    "rejected": 3
  },
  "matching": {
    "topMatchScore": 92,
    "avgMatchScore": 67,
    "matchesAbove70": 5
  },
  "topCandidates": [
    { "name": "Jean Dupont", "matchScore": 92, "skills": ["React", "Node.js"] }
  ]
}
```

### B. Graphiques

- **Vues par jour** (7 derniers jours) — courbe
- **Candidatures par statut** — donut chart
- **Top skills demandés vs offerts** — bar chart comparatif

### C. Frontend

**Route :** `/my-project/dashboard`

**Composants :**
- `stat-card.tsx` — carte avec métrique + trend
- `views-chart.tsx` — graphique de vues (recharts ou chart.js)
- `applications-donut.tsx` — répartition candidatures
- `top-matches-list.tsx` — liste des meilleurs matchs

## Fichiers à créer

| Fichier | Action |
|---------|--------|
| `api/src/projects/projects.controller.ts` | Ajouter `GET /projects/:id/dashboard` |
| `api/src/projects/projects.service.ts` | Méthode `getDashboard(projectId)` |
| `web/src/app/(dashboard)/my-project/dashboard/page.tsx` | **Créer** |
| `web/src/components/dashboard/stat-card.tsx` | **Créer** |
| `web/src/components/dashboard/views-chart.tsx` | **Créer** |

## Tests et validation

- [ ] `GET /projects/:id/dashboard` retourne les métriques correctes
- [ ] Seul le fondateur du projet peut voir son dashboard (ownership)
- [ ] Les graphiques s'affichent avec les données réelles
- [ ] Le trend est calculé correctement (semaine courante vs précédente)
