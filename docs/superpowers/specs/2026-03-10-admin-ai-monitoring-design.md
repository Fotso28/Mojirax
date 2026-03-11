# Admin AI Monitoring — Design Spec

**Date** : 2026-03-10
**Scope** : Monitoring + Configuration + Analytics pour l'IA de MojiraX

---

## Contexte

MojiraX utilise 3 providers IA (DeepSeek, Claude, GPT) + embeddings (Jina AI, OpenAI) pour 6 actions distinctes. Aujourd'hui tout est hardcodé (prompts, modèles, seuils, providers). Pas de visibilité sur les appels, coûts ou erreurs.

## Objectif

Créer une page admin `/admin/ai` avec 4 onglets permettant de :
1. **Monitorer** les appels IA (volume, coûts, erreurs)
2. **Configurer** les providers, modèles, seuils et poids
3. **Éditer les prompts** avec versioning et rollback
4. **Analyser** les tendances et coûts

---

## 1. Modèles Prisma

### AiConfig (singleton)

```prisma
model AiConfig {
  id                    String   @id @default("singleton")
  defaultProvider       String   @default("DEEPSEEK") @map("default_provider")
  embeddingProvider     String   @default("JINA") @map("embedding_provider")
  providerPerAction     Json     @default("{}") @map("provider_per_action") @db.JsonB
  models                Json     @default("{}") @db.JsonB
  maxTokens             Int      @default(4096) @map("max_tokens")
  temperature           Float?
  moderationThresholds  Json     @default("{\"publishMin\":0.7,\"rejectMax\":0.3}") @map("moderation_thresholds") @db.JsonB
  matchingWeights       Json     @default("{\"skills\":40,\"experience\":20,\"location\":15,\"culture\":25}") @map("matching_weights") @db.JsonB
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@map("ai_config")
}
```

**providerPerAction** (valeurs par défaut) :
```json
{
  "EXTRACTION": "DEEPSEEK",
  "SUMMARY": "DEEPSEEK",
  "REGENERATION": "DEEPSEEK",
  "LEGALITY": "DEEPSEEK",
  "PROJECT_VALIDATION": "DEEPSEEK",
  "CANDIDATE_VALIDATION": "DEEPSEEK"
}
```

**models** (valeurs par défaut) :
```json
{
  "DEEPSEEK": "deepseek-chat",
  "CLAUDE": "claude-sonnet-4-5-20250929",
  "GPT": "gpt-4o",
  "JINA": "jina-embeddings-v3",
  "OPENAI_EMBEDDING": "text-embedding-3-small"
}
```

### AiPrompt (6 lignes)

```prisma
model AiPrompt {
  id               String   @id @default(cuid())
  action           String   @unique
  content          String   @db.Text
  version          Int      @default(1)
  previousVersions Json     @default("[]") @map("previous_versions") @db.JsonB
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@map("ai_prompts")
}
```

**Actions** : `EXTRACTION`, `SUMMARY`, `REGENERATION`, `LEGALITY`, `PROJECT_VALIDATION`, `CANDIDATE_VALIDATION`

### AiCallLog

```prisma
model AiCallLog {
  id              String   @id @default(cuid())
  action          String
  provider        String
  model           String
  success         Boolean
  durationMs      Int      @map("duration_ms")
  inputTokens     Int?     @map("input_tokens")
  outputTokens    Int?     @map("output_tokens")
  estimatedCostUsd Float?  @map("estimated_cost_usd")
  error           String?  @db.Text
  resourceType    String?  @map("resource_type")
  resourceId      String?  @map("resource_id")
  createdAt       DateTime @default(now()) @map("created_at")

  @@map("ai_call_logs")
  @@index([action])
  @@index([provider])
  @@index([createdAt])
  @@index([success])
}
```

---

## 2. Backend

### AiConfigService

| Méthode | Description |
|---------|-------------|
| `getConfig()` | Retourne singleton AiConfig (crée avec défauts si absent) |
| `updateConfig(dto)` | Met à jour providers, modèles, seuils, poids |
| `getPrompts()` | Liste les 6 prompts |
| `getPrompt(action)` | Un prompt par action (fallback constante si absent en DB) |
| `updatePrompt(action, content)` | Sauvegarde + push ancien dans previousVersions + version++ |
| `rollbackPrompt(action, version)` | Restaure une version depuis previousVersions |
| `logCall(data)` | Crée une entrée AiCallLog avec calcul coût estimé |
| `getCallLogs(dto)` | Liste paginée avec filtres (action, provider, success, dateRange) |
| `getAnalytics(period)` | Agrégations : appels/jour, coût total, taux échec, durée moyenne, par provider/action |

### Modification AiService

- Lire les prompts via `aiConfigService.getPrompt(action)` au lieu des constantes
- Lire le provider par action via `aiConfigService.getConfig().providerPerAction`
- Après chaque appel : `aiConfigService.logCall({ action, provider, model, success, durationMs, inputTokens, outputTokens, error, resourceType, resourceId })`
- Les constantes actuelles restent comme valeurs par défaut (seed)

### AiAdminController (`/admin/ai/...`)

Tous protégés par `@UseGuards(FirebaseAuthGuard, AdminGuard)`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/ai/config` | Config actuelle |
| PATCH | `/admin/ai/config` | Modifier config |
| GET | `/admin/ai/prompts` | Liste des 6 prompts |
| GET | `/admin/ai/prompts/:action` | Détail prompt + historique |
| PATCH | `/admin/ai/prompts/:action` | Modifier un prompt |
| POST | `/admin/ai/prompts/:action/rollback` | Rollback à une version |
| GET | `/admin/ai/logs` | Logs paginés + filtres |
| GET | `/admin/ai/analytics` | KPIs agrégés |

### Coûts estimés (hardcodés)

```typescript
const COST_PER_MILLION_TOKENS = {
  'deepseek-chat': { input: 0.27, output: 1.10 },
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
  'gpt-4o': { input: 2.50, output: 10.0 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'jina-embeddings-v3': { input: 0.02, output: 0 },
};
```

---

## 3. Frontend — `/admin/ai`

### Onglet Dashboard
- 4 KPI cards : Appels aujourd'hui, Coût estimé (mois), Taux de succès (%), Durée moyenne (ms)
- Bar chart (Recharts) : Appels par jour (7j) groupés par provider
- Pie chart : Répartition par action
- Table : 5 derniers appels en erreur

### Onglet Configuration
- Section Providers : select par action (DEEPSEEK/CLAUDE/GPT) + select embedding (JINA/OPENAI)
- Section Modèles : input par provider pour le nom du modèle
- Section Paramètres : max_tokens, temperature
- Section Seuils : publishMin, rejectMax (inputs number)
- Section Poids matching : 4 inputs (total = 100)
- Bouton sauvegarder

### Onglet Prompts
- 6 accordéons (un par action)
- Chaque accordéon : nom, version, date
- Ouvert : textarea + bouton sauvegarder
- Historique : liste versions précédentes avec bouton restaurer

### Onglet Logs
- Filtres : action, provider, succès/échec, date range
- Tableau paginé : action, provider, modèle, succès (badge), durée, tokens, coût, ressource, date

---

## 4. Sidebar admin

Ajout d'un lien "IA" dans la navigation admin avec l'icône `Brain` de Lucide, positionné après "Publicités".

---

## Décisions

- **Providers par défaut** : DeepSeek pour tout sauf embeddings (Jina AI)
- **Versioning prompts** : previousVersions en JSON array, pas de table séparée
- **Coûts** : hardcodés dans le code, pas configurables
- **Fallback** : si prompt absent en DB, utilise la constante originale du code
- **Pas de playground** : pas de bouton "tester un prompt" (YAGNI)
