# 02 — Matching V2 + Recommandations Feed

## Résumé

Améliorer le matching IA et intégrer les MatchScores dans le feed pour afficher des badges de compatibilité et trier par pertinence.

## Contexte

**Ce qui existe :**
- `MatchingService` avec `calculateScore()` (4 dimensions : skills 40%, experience 20%, location 15%, cultural fit 25%)
- Table `MatchScore` avec `overallScore`, `skillsMatch`, etc.
- Embeddings candidat (`bioEmbedding`, `skillsEmbedding`) et projet (`descriptionEmbedding`)
- Feed avec algorithme 3 couches (explicite/implicite/qualité)

**Ce qui manque :**
- Badge "Match 85%" sur les cartes projet dans le feed
- Tri du feed par MatchScore pour les candidats connectés
- Page "Mes meilleurs matchs" pour les fondateurs
- Recalcul automatique périodique des scores

## Spécification

### A. Intégration MatchScore dans le feed candidat

Dans `ProjectsService.getFeed()` :
1. Si le candidat a un `CandidateProfile` avec des `MatchScore` calculés
2. Récupérer les scores depuis la table `MatchScore`
3. Booster le score de tri : `score += matchScore.overallScore * 0.3`
4. Ajouter `_matchScore` à chaque projet dans la réponse

### B. Badge "Match X%" sur les cartes

Dans `project-card.tsx` :
- Si `_matchScore` est présent et > 50, afficher un badge coloré
- > 80% → badge vert "Excellent Match"
- > 60% → badge bleu "Bon Match"
- > 50% → badge gris "Match"

### C. Page "Mes Meilleurs Matchs" (Fondateur)

**Route :** `/my-project/matches`

Affiche les candidats triés par `overallScore` avec :
- Avatar, nom, titre, compétences
- Score global + breakdown (skills, experience, location, cultural fit)
- Bouton "Voir le profil" + bouton "Inviter à postuler"

### D. Cron de recalcul

Toutes les 24h, recalculer les scores pour :
- Les projets publiés dans les 7 derniers jours
- Les candidats publiés dans les 7 derniers jours

Utiliser un cron NestJS (`@Cron('0 3 * * *')`) ou BullMQ.

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `api/src/projects/projects.service.ts` | Intégrer MatchScore dans `getFeed()` |
| `api/src/matching/matching.service.ts` | Ajouter cron de recalcul |
| `web/src/components/project-card.tsx` | Badge match score |
| `web/src/app/(dashboard)/my-project/matches/page.tsx` | **Créer** |

## Tests et validation

- [ ] Le feed affiche `_matchScore` pour un candidat connecté avec un profil
- [ ] Le badge "Match X%" est visible sur les cartes projet
- [ ] La page "Mes Meilleurs Matchs" affiche les candidats triés par score
- [ ] Le cron recalcule les scores toutes les 24h
