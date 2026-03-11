# Recherche sémantique — Design Spec

## Objectif

Remplacer les filtres exacts (secteur, skills) par une recherche sémantique basée sur pgvector, et ajouter une barre de recherche universelle (projets, personnes, skills) avec compréhension du langage naturel FR/EN.

## Scope

### Phase 1 : Harmonisation + Skills sémantiques (feed)
- Unifier la liste des 11 secteurs dans un fichier constants partagé
- Migrer `HEALTH` → `HEALTHTECH` en base
- Endpoint `GET /filters/popular-skills` — top 20 skills dynamiques depuis la base
- Table `FilterEmbedding` pour stocker les embeddings pré-calculés des skills
- Modifier `getFeed()` : matching vectoriel sur skills (cosine > 0.65) + fallback exact
- Job de pré-calcul des embeddings skills au démarrage + toutes les 24h

### Phase 2 : Recherche universelle (barre header)
- Endpoint `GET /search/universal?q=...`
- 3 requêtes parallèles : projets (descriptionEmbedding), personnes (bioEmbedding), skills (FilterEmbedding)
- Supporte le langage naturel FR/EN ("je veux un développeur react à Douala")
- Frontend : dropdown résultats groupés, debounce 400ms
- Seuil similarité : 0.55

## Architecture

### Nouvelle table `FilterEmbedding`

```
id          String    @id @default(cuid())
type        String    ("SKILL")
value       String    (valeur brute, ex: "React Native")
label       String    (label affichage)
embedding   vector(1024)
usageCount  Int       (nombre d'occurrences en base)
updatedAt   DateTime
```

### Secteurs — liste unifiée (pas de vectoriel)

```
FINTECH, AGRITECH, HEALTHTECH, EDTECH, LOGISTICS, ECOMMERCE, SAAS, MARKETPLACE, IMPACT, AI, OTHER
```

Fichier partagé : `web/src/lib/constants/sectors.ts`
Matching exact car les valeurs sont choisies dans la même liste prédéfinie partout.

### Skills — matching sémantique

- Saisie : texte libre (création projet, onboarding, profil)
- Filtres feed : liste dynamique des top 20 skills depuis `GET /filters/popular-skills`
- Matching : embedding du skill filtre comparé au `descriptionEmbedding` du projet via pgvector

Query feed avec skills :
```sql
-- Projets avec embedding : similarité vectorielle
SELECT id FROM projects
WHERE status = 'PUBLISHED'
  AND description_embedding IS NOT NULL
  AND 1 - (description_embedding <=> filter_embedding) > 0.65

UNION

-- Fallback exact pour projets sans embedding
SELECT id FROM projects
WHERE status = 'PUBLISHED'
  AND description_embedding IS NULL
  AND required_skills && ARRAY['React Native']
```

### Recherche universelle

Endpoint : `GET /search/universal?q=...`

1. Génère embedding du query via `getEmbedding(q)`
2. Lance 3 requêtes en parallèle :
   - **Projets** : similarité `descriptionEmbedding <=> query` (top 5) + fallback ILIKE `name`, `pitch`
   - **Personnes** : similarité `bioEmbedding <=> query` (top 5) + fallback ILIKE `firstName`, `lastName`
   - **Skills** : match `FilterEmbedding` (top 3)
3. Retourne résultats groupés

Réponse :
```json
{
  "projects": [{ "id", "name", "slug", "pitch", "logoUrl", "sector", "similarity" }],
  "people": [{ "id", "firstName", "lastName", "image", "title", "similarity" }],
  "skills": [{ "value", "label", "count" }]
}
```

### Pré-calcul des embeddings

- `FiltersService.onModuleInit()` : agrège skills depuis `Project.requiredSkills` + `CandidateProfile.skills`, prend top 50, génère embeddings manquants
- Relance toutes les 24h (`setInterval`)

### Frontend

- **Feed filters** : secteurs depuis constants partagé, skills depuis `GET /filters/popular-skills`
- **Barre recherche header** : dropdown résultats groupés (projets, personnes, skills), debounce 400ms
- Clic projet → `/projects/:slug`, clic personne → `/founders/:id`, clic skill → filtre feed

## Sécurité

- Pas de données privées (email, phone) dans les résultats de recherche
- Select explicite sur toutes les requêtes Prisma publiques
- Seuils de similarité pour éviter les résultats aberrants (0.65 feed, 0.55 recherche)

## Fichiers impactés

### Nouveaux
- `web/src/lib/constants/sectors.ts`
- `api/src/filters/filters.module.ts`
- `api/src/filters/filters.service.ts`
- `api/src/filters/filters.controller.ts`
- Migration Prisma : table `FilterEmbedding` + migration données `HEALTH` → `HEALTHTECH`

### Modifiés
- `api/src/projects/projects.service.ts` — getFeed() avec vectoriel
- `api/src/search/search.service.ts` — endpoint universal
- `api/src/search/search.controller.ts` — route universal
- `web/src/components/feed/feed-filters.tsx` — secteurs unifiés + skills dynamiques
- `web/src/components/layout/header.tsx` — dropdown recherche universelle
- `web/src/app/onboarding/founder/steps/identity.tsx` — import secteurs partagés
- `web/src/app/create/project/steps/details.tsx` — import secteurs partagés
