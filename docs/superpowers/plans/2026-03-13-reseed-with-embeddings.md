# Reseed complet avec embeddings cohérents

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer toutes les données, créer un seed complet avec profils riches et générer des embeddings Jina AI cohérents pour que la recherche sémantique fonctionne.

**Architecture:** 3 étapes — (1) migration pour harmoniser les dimensions vector à 1024, (2) seed SQL complet avec tous les champs remplis, (3) script TypeScript de backfill qui appelle Jina AI pour générer les embeddings réels.

**Tech Stack:** PostgreSQL/pgvector, Prisma migrations, Jina AI (`jina-embeddings-v3`, 1024 dims), TypeScript/ts-node

---

## Chunk 1: Migration + Seed SQL

### Task 1: Migration — harmoniser les dimensions vector à 1024

**Files:**
- Create: `api/prisma/migrations/20260313010000_fix_vector_dimensions/migration.sql`

- [ ] **Step 1: Créer la migration SQL**

```sql
-- Harmoniser toutes les colonnes vector de 1536 vers 1024 (Jina v3)
-- Les données existantes seront supprimées par le reseed de toute façon

ALTER TABLE projects
  ALTER COLUMN description_embedding TYPE vector(1024)
  USING NULL;

ALTER TABLE candidate_profiles
  ALTER COLUMN bio_embedding TYPE vector(1024)
  USING NULL;

ALTER TABLE candidate_profiles
  ALTER COLUMN skills_embedding TYPE vector(1024)
  USING NULL;
```

- [ ] **Step 2: Appliquer la migration**

Run: `cd api && npx prisma migrate deploy`
Expected: Migration appliquée avec succès

- [ ] **Step 3: Vérifier les dimensions**

Run: `psql -c "SELECT attname, atttypmod FROM pg_attribute WHERE attrelid IN ('projects'::regclass, 'candidate_profiles'::regclass) AND attname IN ('description_embedding','bio_embedding','skills_embedding');"`
Expected: Toutes les colonnes à 1024

- [ ] **Step 4: Commit**

```bash
git add api/prisma/migrations/20260313010000_fix_vector_dimensions/
git commit -m "fix(db): harmonize vector dimensions to 1024 for Jina v3"
```

---

### Task 2: Réécrire le seed SQL complet

**Files:**
- Modify: `api/prisma/seed.sql`

Le seed doit contenir :
- **6 founders** avec `founderProfile` JSON rempli (title, bio, skills, experience, education, linkedinUrl, city, languages)
- **6 candidates** avec profils candidat complets (tous les champs: shortPitch, longPitch, vision, roleType, commitmentType, collabPref, locationPref, hasCofounded, desiredSectors, desiredStage, etc.)
- **8 projets** (6 PUBLISHED, 1 DRAFT, 1 PENDING_AI) avec TOUS les champs remplis
- **6 profils candidats** (5 PUBLISHED, 1 DRAFT) avec TOUS les champs remplis
- **Applications** cohérentes (candidat a les skills du projet)
- **Match scores** cohérents avec les skills réels
- **Conversations + Messages** pour les candidatures ACCEPTED
- **Notifications** variées
- **Moderation logs** pour les PUBLISHED
- **Interactions + Search logs**
- **Configs** (AI, Ads, Push, Email)

Le SQL commence par un `TRUNCATE CASCADE` de toutes les tables.

- [ ] **Step 1: Écrire le seed SQL complet**

Voir contenu complet dans le fichier seed.sql (trop long pour le plan).

Points clés du seed :
- Données réalistes camerounaises / africaines
- Emails réels des fondateurs (osw.fotso@gmail.com, etc.)
- Profils candidats avec experience JSON détaillée
- Projets avec tous les 7 steps du wizard remplis
- Conversations avec messages pour tester la messagerie

- [ ] **Step 2: Exécuter le seed**

Run: `PGPASSWORD=postgres psql -h localhost -U postgres -d co_founder_db -f api/prisma/seed.sql`
Expected: Toutes les insertions réussies

- [ ] **Step 3: Vérifier les données**

Run: `psql -c "SELECT 'users' as t, count(*) FROM users UNION ALL SELECT 'projects', count(*) FROM projects UNION ALL SELECT 'candidate_profiles', count(*) FROM candidate_profiles UNION ALL SELECT 'applications', count(*) FROM applications UNION ALL SELECT 'conversations', count(*) FROM conversations;"`
Expected: users=12, projects=8, candidate_profiles=6, applications=8, conversations≥2

- [ ] **Step 4: Commit**

```bash
git add api/prisma/seed.sql
git commit -m "feat(seed): comprehensive seed data with rich profiles"
```

---

## Chunk 2: Script de backfill embeddings

### Task 3: Créer le script de backfill embeddings

**Files:**
- Create: `api/scripts/backfill-embeddings.ts`

Le script doit :
1. Se connecter à PostgreSQL directement (via `pg` ou Prisma)
2. Lire la clé JINA_API_KEY depuis `.env`
3. Pour chaque projet PUBLISHED : concaténer `name + pitch + problem + solution_desc + description` → appeler Jina → UPDATE le vecteur
4. Pour chaque candidat PUBLISHED : concaténer `title + bio + shortPitch + longPitch` → appeler Jina → UPDATE bio_embedding ; concaténer `skills.join(' ')` → UPDATE skills_embedding
5. Pour les filter_embeddings sans embedding : appeler Jina → UPDATE
6. Respecter le rate limiting Jina (pause 200ms entre appels)
7. Logger la progression

- [ ] **Step 1: Écrire le script**

```typescript
// api/scripts/backfill-embeddings.ts
import { config } from 'dotenv';
import { resolve } from 'path';
import { Pool } from 'pg';
import OpenAI from 'openai';

config({ path: resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
const JINA_API_KEY = process.env.JINA_API_KEY;

if (!DATABASE_URL || !JINA_API_KEY) {
  console.error('Missing DATABASE_URL or JINA_API_KEY in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const jina = new OpenAI({ apiKey: JINA_API_KEY, baseURL: 'https://api.jina.ai/v1' });

async function getEmbedding(text: string): Promise<number[]> {
  const response = await jina.embeddings.create({
    model: 'jina-embeddings-v3',
    input: text.replace(/\n/g, ' ').substring(0, 8000),
    encoding_format: 'float',
  });
  return response.data[0].embedding;
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function backfillProjects() {
  const { rows } = await pool.query(
    `SELECT id, name, pitch, problem, solution_desc, description FROM projects WHERE status = 'PUBLISHED' AND description_embedding IS NULL`
  );
  console.log(`\n📦 ${rows.length} projets à embedder...`);
  for (const row of rows) {
    const text = [row.name, row.pitch, row.problem, row.solution_desc, row.description].filter(Boolean).join(' ');
    if (text.length < 10) continue;
    const embedding = await getEmbedding(text);
    const vectorStr = `[${embedding.join(',')}]`;
    await pool.query(
      `UPDATE projects SET description_embedding = $1::vector, embedding_model = 'jina-embeddings-v3', last_embedded_at = NOW() WHERE id = $2`,
      [vectorStr, row.id]
    );
    console.log(`  ✅ ${row.name}`);
    await sleep(200);
  }
}

async function backfillCandidates() {
  const { rows } = await pool.query(
    `SELECT id, title, bio, short_pitch, long_pitch, skills FROM candidate_profiles WHERE status = 'PUBLISHED' AND bio_embedding IS NULL`
  );
  console.log(`\n👤 ${rows.length} candidats à embedder...`);
  for (const row of rows) {
    // Bio embedding
    const bioText = [row.title, row.bio, row.short_pitch, row.long_pitch].filter(Boolean).join(' ');
    if (bioText.length >= 10) {
      const bioEmb = await getEmbedding(bioText);
      const bioVec = `[${bioEmb.join(',')}]`;
      await pool.query(
        `UPDATE candidate_profiles SET bio_embedding = $1::vector, embedding_model = 'jina-embeddings-v3', last_embedded_at = NOW() WHERE id = $2`,
        [bioVec, row.id]
      );
      await sleep(200);
    }
    // Skills embedding
    const skills = row.skills || [];
    if (skills.length > 0) {
      const skillsEmb = await getEmbedding(skills.join(', '));
      const skillsVec = `[${skillsEmb.join(',')}]`;
      await pool.query(
        `UPDATE candidate_profiles SET skills_embedding = $1::vector WHERE id = $2`,
        [skillsVec, row.id]
      );
      await sleep(200);
    }
    console.log(`  ✅ ${row.title}`);
  }
}

async function backfillFilterEmbeddings() {
  const { rows } = await pool.query(
    `SELECT id, value, label FROM filter_embeddings WHERE embedding IS NULL`
  );
  if (rows.length === 0) { console.log('\n🏷️  Tous les filter_embeddings ont déjà un vecteur.'); return; }
  console.log(`\n🏷️  ${rows.length} filter_embeddings à embedder...`);
  for (const row of rows) {
    const emb = await getEmbedding(row.value);
    const vec = `[${emb.join(',')}]`;
    await pool.query(
      `UPDATE filter_embeddings SET embedding = $1::vector WHERE id = $2`,
      [vec, row.id]
    );
    console.log(`  ✅ ${row.value}`);
    await sleep(200);
  }
}

async function main() {
  console.log('🚀 Backfill embeddings — Jina AI v3 (1024 dims)');
  await backfillProjects();
  await backfillCandidates();
  await backfillFilterEmbeddings();
  // Vérification
  const { rows } = await pool.query(`
    SELECT 'projects' as t, count(*) FILTER (WHERE description_embedding IS NOT NULL) as with_emb, count(*) as total FROM projects WHERE status='PUBLISHED'
    UNION ALL
    SELECT 'candidates', count(*) FILTER (WHERE bio_embedding IS NOT NULL), count(*) FROM candidate_profiles WHERE status='PUBLISHED'
    UNION ALL
    SELECT 'filters', count(*) FILTER (WHERE embedding IS NOT NULL), count(*) FROM filter_embeddings
  `);
  console.log('\n📊 Résultat:');
  rows.forEach(r => console.log(`  ${r.t}: ${r.with_emb}/${r.total} avec embedding`));
  await pool.end();
  console.log('\n✅ Backfill terminé !');
}

main().catch(e => { console.error('❌ Erreur:', e); process.exit(1); });
```

- [ ] **Step 2: Exécuter le script**

Run: `cd api && npx ts-node scripts/backfill-embeddings.ts`
Expected: Tous les projets et candidats PUBLISHED ont des embeddings

- [ ] **Step 3: Vérifier en base**

Run: `psql -c "SELECT id, name, CASE WHEN description_embedding IS NULL THEN 'NULL' ELSE 'OK' END FROM projects WHERE status='PUBLISHED';"`
Expected: Tous à 'OK'

- [ ] **Step 4: Tester la recherche sémantique**

Run: `curl 'http://localhost:3001/search?q=paiement%20mobile' | jq '.projects | length'`
Expected: ≥1 résultat (MoMo Pay devrait matcher)

Run: `curl 'http://localhost:3001/search?q=developpeur%20React%20Native' | jq '.candidates | length'`
Expected: ≥1 résultat (Patrick Tchoumi, Sophie Nguema)

- [ ] **Step 5: Commit**

```bash
git add api/scripts/backfill-embeddings.ts
git commit -m "feat(search): add backfill-embeddings script for Jina AI v3"
```

---

## Résumé d'exécution

1. `npx prisma migrate deploy` — harmoniser les vecteurs à 1024
2. `psql < seed.sql` — insérer les données complètes
3. `npx ts-node scripts/backfill-embeddings.ts` — générer les embeddings
4. Tester la recherche sémantique
