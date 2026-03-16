# Recherche Sémantique — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter la recherche sémantique (skills vectoriels dans le feed, recherche universelle dans le header) et harmoniser les secteurs sur tout le site.

**Architecture:** Fichier constants partagé pour les secteurs. Nouvelle table `FilterEmbedding` + module `filters` pour pré-calculer les embeddings des skills populaires. Le feed query utilise pgvector pour le matching skills. La recherche universelle enrichit `search.service.ts` avec un endpoint groupé (projets + personnes + skills).

**Tech Stack:** PostgreSQL/pgvector, Prisma (raw SQL pour vector ops), NestJS, Next.js, OpenAI/Jina embeddings

---

## Chunk 1: Harmonisation des secteurs

### Task 1: Créer le fichier constants partagé des secteurs

**Files:**
- Create: `web/src/lib/constants/sectors.ts`

- [ ] **Step 1: Créer le fichier constants**

```typescript
// web/src/lib/constants/sectors.ts
export const SECTORS = [
    { value: 'FINTECH', label: 'Fintech' },
    { value: 'AGRITECH', label: 'Agritech' },
    { value: 'HEALTHTECH', label: 'Santé / HealthTech' },
    { value: 'EDTECH', label: 'EdTech' },
    { value: 'LOGISTICS', label: 'Logistique' },
    { value: 'ECOMMERCE', label: 'E-commerce' },
    { value: 'SAAS', label: 'SaaS / B2B' },
    { value: 'MARKETPLACE', label: 'Marketplace' },
    { value: 'IMPACT', label: 'Impact Social' },
    { value: 'AI', label: 'IA / Data' },
    { value: 'OTHER', label: 'Autre' },
] as const;

export type SectorValue = typeof SECTORS[number]['value'];

export const SECTOR_VALUES = SECTORS.map(s => s.value);
```

- [ ] **Step 2: Commit**

```bash
git add web/src/lib/constants/sectors.ts
git commit -m "feat: add shared sectors constants file"
```

### Task 2: Migrer tous les formulaires vers la constante partagée

**Files:**
- Modify: `web/src/components/feed/feed-filters.tsx`
- Modify: `web/src/app/create/project/steps/details.tsx`
- Modify: `web/src/app/onboarding/founder/steps/identity.tsx`

- [ ] **Step 1: Mettre à jour feed-filters.tsx**

Remplacer les lignes 10-11 :
```typescript
// AVANT
const SECTORS = ['FINTECH', 'AGRITECH', 'HEALTH', 'EDTECH', 'LOGISTICS', 'ECOMMERCE', 'OTHER'];
const SKILLS = ['React', 'Node.js', 'Python', 'Marketing', 'Design', 'Sales', 'Finance'];

// APRÈS
import { SECTORS } from '@/lib/constants/sectors';
```

Mettre à jour le `<select>` secteur (ligne 99-102) pour utiliser `SECTORS` avec les labels :
```tsx
<option value="">Tous les secteurs</option>
{SECTORS.map(s => (
    <option key={s.value} value={s.value}>{s.label}</option>
))}
```

Retirer la constante `SKILLS` locale (sera remplacée par les skills dynamiques dans Task 6).

- [ ] **Step 2: Mettre à jour details.tsx (création projet)**

Remplacer la liste inline des secteurs (lignes 37-44) par l'import :
```typescript
import { SECTORS } from '@/lib/constants/sectors';
```
```tsx
<Select
    label="Secteur"
    value={data.sector || ''}
    onChange={(value) => updateData('sector', value)}
    options={SECTORS.map(s => ({ value: s.value, label: s.label }))}
/>
```

- [ ] **Step 3: Mettre à jour identity.tsx (onboarding fondateur)**

Remplacer la constante locale `SECTORS` (lignes 6-16) par l'import :
```typescript
import { SECTORS } from '@/lib/constants/sectors';
```

Adapter le `<select>` pour utiliser `SECTORS` avec les labels.

- [ ] **Step 4: Vérifier la compilation**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add web/src/components/feed/feed-filters.tsx web/src/app/create/project/steps/details.tsx web/src/app/onboarding/founder/steps/identity.tsx
git commit -m "refactor: unify sector lists from shared constants"
```

### Task 3: Migration base de données HEALTH → HEALTHTECH

**Files:**
- Create: migration Prisma

- [ ] **Step 1: Créer et appliquer la migration SQL**

```bash
cd api
npx prisma migrate dev --name rename_health_to_healthtech --create-only
```

Éditer le fichier SQL généré pour ajouter :
```sql
UPDATE projects SET sector = 'HEALTHTECH' WHERE sector = 'HEALTH';
```

Puis appliquer :
```bash
npx prisma migrate dev
```

- [ ] **Step 2: Commit**

```bash
git add api/prisma/migrations/
git commit -m "migrate: rename HEALTH sector to HEALTHTECH"
```

---

## Chunk 2: Table FilterEmbedding + module Filters

### Task 4: Ajouter le modèle FilterEmbedding au schema Prisma

**Files:**
- Modify: `api/prisma/schema.prisma`

- [ ] **Step 1: Ajouter le modèle**

Ajouter dans le schema Prisma :
```prisma
model FilterEmbedding {
    id         String   @id @default(cuid())
    type       String   // "SKILL"
    value      String   // valeur brute ex: "React Native"
    label      String   // label affichage
    embedding  Unsupported("vector(1024)")? @map("embedding")
    usageCount Int      @default(0) @map("usage_count")
    updatedAt  DateTime @updatedAt @map("updated_at")

    @@unique([type, value])
    @@map("filter_embeddings")
}
```

- [ ] **Step 2: Créer la migration**

```bash
cd api && npx prisma migrate dev --name add_filter_embeddings
```

- [ ] **Step 3: Commit**

```bash
git add api/prisma/
git commit -m "feat: add FilterEmbedding table for semantic skill matching"
```

### Task 5: Créer le module Filters (service + controller)

**Files:**
- Create: `api/src/filters/filters.module.ts`
- Create: `api/src/filters/filters.service.ts`
- Create: `api/src/filters/filters.controller.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Créer filters.service.ts**

```typescript
// api/src/filters/filters.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class FiltersService implements OnModuleInit {
    private readonly logger = new Logger(FiltersService.name);
    private refreshTimer: NodeJS.Timeout | null = null;

    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
    ) {}

    async onModuleInit() {
        // Pré-calcul au démarrage (non bloquant)
        this.refreshSkillEmbeddings().catch(err =>
            this.logger.warn(`Initial skill embedding refresh failed: ${err.message}`)
        );

        // Rafraîchir toutes les 24h
        this.refreshTimer = setInterval(
            () => this.refreshSkillEmbeddings().catch(err =>
                this.logger.warn(`Scheduled skill embedding refresh failed: ${err.message}`)
            ),
            24 * 60 * 60 * 1000,
        );
    }

    /**
     * Retourne les top N skills les plus utilisés
     */
    async getPopularSkills(limit = 20): Promise<{ value: string; label: string; count: number }[]> {
        const skills = await this.prisma.filterEmbedding.findMany({
            where: { type: 'SKILL' },
            orderBy: { usageCount: 'desc' },
            take: limit,
            select: { value: true, label: true, usageCount: true },
        });

        return skills.map(s => ({ value: s.value, label: s.label, count: s.usageCount }));
    }

    /**
     * Récupère l'embedding d'un skill depuis le cache FilterEmbedding
     */
    async getSkillEmbedding(skillValue: string): Promise<number[] | null> {
        const rows: any[] = await this.prisma.$queryRaw`
            SELECT embedding::text
            FROM filter_embeddings
            WHERE type = 'SKILL' AND value = ${skillValue}
            AND embedding IS NOT NULL
            LIMIT 1;
        `;
        if (rows.length === 0) return null;

        const raw = rows[0].embedding; // "[0.1,0.2,...]"
        return JSON.parse(raw);
    }

    /**
     * Agrège les skills depuis projets + candidats, calcule les embeddings manquants
     */
    async refreshSkillEmbeddings(): Promise<void> {
        this.logger.log('Refreshing skill embeddings...');

        // 1. Agrèger tous les skills depuis les projets publiés
        const projects = await this.prisma.project.findMany({
            where: { status: 'PUBLISHED', requiredSkills: { isEmpty: false } },
            select: { requiredSkills: true },
        });

        // 2. Agrèger depuis les candidats publiés
        const candidates = await this.prisma.candidateProfile.findMany({
            where: { status: 'PUBLISHED' },
            select: { skills: true },
        });

        // 3. Compter les occurrences
        const counts = new Map<string, number>();
        for (const p of projects) {
            for (const skill of p.requiredSkills) {
                const normalized = skill.trim();
                if (normalized) counts.set(normalized, (counts.get(normalized) || 0) + 1);
            }
        }
        for (const c of candidates) {
            for (const skill of (c.skills || [])) {
                const normalized = skill.trim();
                if (normalized) counts.set(normalized, (counts.get(normalized) || 0) + 1);
            }
        }

        // 4. Prendre le top 50
        const sorted = [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50);

        this.logger.log(`Found ${sorted.length} unique skills to process`);

        // 5. Upsert chaque skill + générer l'embedding si manquant
        for (const [skillValue, count] of sorted) {
            // Upsert le record
            await this.prisma.filterEmbedding.upsert({
                where: { type_value: { type: 'SKILL', value: skillValue } },
                create: { type: 'SKILL', value: skillValue, label: skillValue, usageCount: count },
                update: { usageCount: count },
            });

            // Vérifier si l'embedding existe déjà
            const existing = await this.getSkillEmbedding(skillValue);
            if (existing) continue;

            // Générer l'embedding
            try {
                const embedding = await this.aiService.getEmbedding(skillValue);
                const vectorString = `[${embedding.join(',')}]`;
                await this.prisma.$executeRaw`
                    UPDATE filter_embeddings
                    SET embedding = ${vectorString}::vector
                    WHERE type = 'SKILL' AND value = ${skillValue};
                `;
                this.logger.log(`Generated embedding for skill: ${skillValue}`);
            } catch (err) {
                this.logger.warn(`Failed to generate embedding for "${skillValue}": ${err.message}`);
            }
        }

        this.logger.log('Skill embeddings refresh complete');
    }
}
```

- [ ] **Step 2: Créer filters.controller.ts**

```typescript
// api/src/filters/filters.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { FiltersService } from './filters.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('filters')
@Controller('filters')
export class FiltersController {
    constructor(private readonly filtersService: FiltersService) {}

    @Get('popular-skills')
    @ApiOperation({ summary: 'Get top popular skills for feed filters' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of skills (default 20)' })
    async getPopularSkills(@Query('limit') limit?: string) {
        const n = Math.min(parseInt(limit || '20', 10) || 20, 50);
        return this.filtersService.getPopularSkills(n);
    }
}
```

- [ ] **Step 3: Créer filters.module.ts**

```typescript
// api/src/filters/filters.module.ts
import { Module } from '@nestjs/common';
import { FiltersService } from './filters.service';
import { FiltersController } from './filters.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [FiltersController],
    providers: [FiltersService],
    exports: [FiltersService],
})
export class FiltersModule {}
```

- [ ] **Step 4: Enregistrer dans app.module.ts**

Ajouter `FiltersModule` aux imports de `AppModule`.

- [ ] **Step 5: Vérifier la compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add api/src/filters/ api/src/app.module.ts
git commit -m "feat: add filters module with skill embeddings pre-computation"
```

---

## Chunk 3: Skills sémantiques dans le feed

### Task 6: Modifier getFeed() pour le matching vectoriel des skills

**Files:**
- Modify: `api/src/projects/projects.service.ts`
- Modify: `api/src/projects/projects.module.ts`

- [ ] **Step 1: Injecter FiltersService dans ProjectsModule**

Dans `api/src/projects/projects.module.ts`, ajouter `FiltersModule` aux imports.

- [ ] **Step 2: Injecter FiltersService dans ProjectsService**

Ajouter dans le constructeur :
```typescript
constructor(
    private prisma: PrismaService,
    private interactionsService: InteractionsService,
    private filtersService: FiltersService,  // NOUVEAU
    // ... autres
) {}
```

- [ ] **Step 3: Modifier le bloc de filtrage skills dans getFeed()**

Remplacer le filtre exact skills (lignes ~90-98) par un matching hybride :

```typescript
// Dans getFeed(), avant le Prisma findMany principal :

let semanticProjectIds: string[] | null = null;

if (filters?.skills && filters.skills.length > 0) {
    // Tenter le matching sémantique pour chaque skill
    const allSemanticIds = new Set<string>();
    let hasSemanticMatch = false;

    for (const skill of filters.skills) {
        const skillEmbedding = await this.filtersService.getSkillEmbedding(skill);
        if (!skillEmbedding) continue;

        hasSemanticMatch = true;
        const vectorString = `[${skillEmbedding.join(',')}]`;
        const matches: any[] = await this.prisma.$queryRaw`
            SELECT id FROM projects
            WHERE status = 'PUBLISHED'
              AND description_embedding IS NOT NULL
              AND 1 - (description_embedding <=> ${vectorString}::vector) > 0.65
        `;
        for (const m of matches) allSemanticIds.add(m.id);
    }

    if (hasSemanticMatch) {
        // Ajouter aussi les projets sans embedding via fallback exact
        const exactMatches = await this.prisma.project.findMany({
            where: {
                status: 'PUBLISHED',
                descriptionEmbedding: null, // pas d'embedding
                requiredSkills: { hasSome: filters.skills },
            },
            select: { id: true },
        });
        for (const m of exactMatches) allSemanticIds.add(m.id);
        semanticProjectIds = [...allSemanticIds];
    }
}

// Modifier le where du findMany principal :
const projects = await this.prisma.project.findMany({
    where: {
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
        status: 'PUBLISHED',
        ...(filters?.sector ? { sector: filters.sector } : {}),
        ...(filters?.city ? { city: { contains: filters.city, mode: 'insensitive' as Prisma.QueryMode } } : {}),
        // Skills : sémantique si dispo, sinon exact
        ...(semanticProjectIds !== null
            ? { id: { in: semanticProjectIds } }
            : filters?.skills && filters.skills.length > 0
                ? { requiredSkills: { hasSome: filters.skills } }
                : {}
        ),
    },
    // ... reste identique
});
```

**Note :** Si `semanticProjectIds` est défini, on filtre par IDs (résultat de la recherche vectorielle). Sinon fallback sur `hasSome` exact. Le filtre `excludeIds` et les filtres `sector`/`city` s'appliquent toujours normalement.

- [ ] **Step 4: Vérifier la compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add api/src/projects/projects.service.ts api/src/projects/projects.module.ts
git commit -m "feat: semantic skill matching in feed via pgvector"
```

### Task 7: Frontend — Skills dynamiques dans les filtres

**Files:**
- Modify: `web/src/components/feed/feed-filters.tsx`

- [ ] **Step 1: Charger les skills depuis l'API**

Remplacer la constante `SKILLS` par un fetch dynamique :

```typescript
import { useState, useEffect } from 'react';
import { Filter, X, ChevronDown, MapPin, Briefcase, Code } from 'lucide-react';
import { SECTORS } from '@/lib/constants/sectors';
import { AXIOS_INSTANCE } from '@/api/axios-instance';

interface FeedFiltersProps {
    onFilterChange: (filters: { city?: string; sector?: string; skills?: string[] }) => void;
}

interface PopularSkill {
    value: string;
    label: string;
    count: number;
}

export function FeedFilters({ onFilterChange }: FeedFiltersProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [city, setCity] = useState('');
    const [sector, setSector] = useState('');
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [popularSkills, setPopularSkills] = useState<PopularSkill[]>([]);

    // Charger les skills populaires
    useEffect(() => {
        AXIOS_INSTANCE.get('/filters/popular-skills')
            .then(({ data }) => setPopularSkills(data))
            .catch(() => {});
    }, []);

    // ... handleApply, handleReset, toggleSkill restent identiques

    // Dans le JSX, remplacer les pills skills :
    // AVANT: {SKILLS.map(skill => ...)}
    // APRÈS:
    // {popularSkills.map(skill => (
    //     <button
    //         key={skill.value}
    //         onClick={() => toggleSkill(skill.value)}
    //         className={`px-3 py-1 rounded-full text-xs transition-all ${
    //             selectedSkills.includes(skill.value)
    //                 ? 'bg-kezak-primary text-white'
    //                 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    //         }`}
    //     >
    //         {skill.label}
    //     </button>
    // ))}
```

- [ ] **Step 2: Vérifier la compilation**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/feed/feed-filters.tsx
git commit -m "feat: dynamic skills from API + unified sectors in feed filters"
```

---

## Chunk 4: Recherche universelle

### Task 8: Endpoint search/universal dans le backend

**Files:**
- Modify: `api/src/search/search.service.ts`
- Modify: `api/src/search/search.controller.ts`
- Modify: `api/src/search/search.module.ts`

- [ ] **Step 1: Ajouter la méthode searchUniversal dans search.service.ts**

```typescript
async searchUniversal(query: string, userId?: string) {
    this.logger.log(`Universal search: "${query}"`);

    const queryEmbedding = await this.aiService.getEmbedding(query);
    const vectorString = `[${queryEmbedding.join(',')}]`;

    // 3 requêtes en parallèle
    const [projects, people, skills] = await Promise.all([
        // Projets : sémantique + fallback ILIKE
        this.prisma.$queryRaw`
            (
                SELECT id, name, slug, pitch, sector, logo_url AS "logoUrl",
                       1 - (description_embedding <=> ${vectorString}::vector) AS similarity,
                       'semantic' AS match_type
                FROM projects
                WHERE status = 'PUBLISHED'
                  AND description_embedding IS NOT NULL
                  AND 1 - (description_embedding <=> ${vectorString}::vector) > 0.55
                ORDER BY description_embedding <=> ${vectorString}::vector ASC
                LIMIT 5
            )
            UNION ALL
            (
                SELECT id, name, slug, pitch, sector, logo_url AS "logoUrl",
                       0.5 AS similarity,
                       'text' AS match_type
                FROM projects
                WHERE status = 'PUBLISHED'
                  AND (
                      LOWER(name) LIKE LOWER(${'%' + query + '%'})
                      OR LOWER(pitch) LIKE LOWER(${'%' + query + '%'})
                  )
                  AND id NOT IN (
                      SELECT id FROM projects
                      WHERE description_embedding IS NOT NULL
                        AND 1 - (description_embedding <=> ${vectorString}::vector) > 0.55
                  )
                LIMIT 3
            )
            ORDER BY similarity DESC
            LIMIT 5;
        `,

        // Personnes : sémantique bio + fallback ILIKE nom
        this.prisma.$queryRaw`
            (
                SELECT u.id, u.first_name AS "firstName", u.last_name AS "lastName",
                       u.name, u.image, cp.title,
                       1 - (cp.bio_embedding <=> ${vectorString}::vector) AS similarity,
                       'semantic' AS match_type
                FROM candidate_profiles cp
                JOIN users u ON u.id = cp.user_id
                WHERE cp.status = 'PUBLISHED'
                  AND cp.bio_embedding IS NOT NULL
                  AND 1 - (cp.bio_embedding <=> ${vectorString}::vector) > 0.55
                ORDER BY cp.bio_embedding <=> ${vectorString}::vector ASC
                LIMIT 5
            )
            UNION ALL
            (
                SELECT u.id, u.first_name AS "firstName", u.last_name AS "lastName",
                       u.name, u.image, cp.title,
                       0.5 AS similarity,
                       'text' AS match_type
                FROM users u
                LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
                WHERE (
                    LOWER(u.first_name) LIKE LOWER(${'%' + query + '%'})
                    OR LOWER(u.last_name) LIKE LOWER(${'%' + query + '%'})
                    OR LOWER(u.name) LIKE LOWER(${'%' + query + '%'})
                )
                AND u.id NOT IN (
                    SELECT u2.id FROM users u2
                    JOIN candidate_profiles cp2 ON cp2.user_id = u2.id
                    WHERE cp2.bio_embedding IS NOT NULL
                      AND 1 - (cp2.bio_embedding <=> ${vectorString}::vector) > 0.55
                )
                LIMIT 3
            )
            ORDER BY similarity DESC
            LIMIT 5;
        `,

        // Skills : match FilterEmbedding
        this.prisma.$queryRaw`
            SELECT value, label, usage_count AS "count",
                   1 - (embedding <=> ${vectorString}::vector) AS similarity
            FROM filter_embeddings
            WHERE type = 'SKILL'
              AND embedding IS NOT NULL
              AND 1 - (embedding <=> ${vectorString}::vector) > 0.55
            ORDER BY embedding <=> ${vectorString}::vector ASC
            LIMIT 3;
        `,
    ]);

    // Log
    await this.prisma.searchLog.create({
        data: {
            query,
            userId,
            searchType: 'UNIVERSAL',
            resultsCount: (projects as any[]).length + (people as any[]).length,
            topResultIds: [
                ...(projects as any[]).map((p: any) => p.id),
                ...(people as any[]).map((p: any) => p.id),
            ],
        },
    });

    return { projects, people, skills };
}
```

- [ ] **Step 2: Ajouter la route dans search.controller.ts**

```typescript
@Get('universal')
@ApiOperation({ summary: 'Recherche universelle (projets, personnes, skills)' })
@ApiQuery({ name: 'q', description: 'Requête de recherche' })
async searchUniversal(
    @Query('q') query: string,
    @Request() req?: any,
) {
    if (!query || query.length < 2) return { projects: [], people: [], skills: [] };
    const userId = req?.user?.uid;
    return this.searchService.searchUniversal(query, userId);
}
```

**Important :** Placer cette route AVANT la route `@Get()` existante pour éviter les conflits de routing NestJS (`universal` doit matcher avant le paramètre implicite).

- [ ] **Step 3: Ajouter AiModule et FiltersModule dans SearchModule**

```typescript
// api/src/search/search.module.ts
import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [SearchController],
    providers: [SearchService],
})
export class SearchModule {}
```

- [ ] **Step 4: Vérifier la compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add api/src/search/
git commit -m "feat: add universal search endpoint (projects, people, skills)"
```

### Task 9: Frontend — Recherche universelle dans le header

**Files:**
- Create: `web/src/components/search/universal-search.tsx`
- Modify: `web/src/components/layout/header.tsx`

- [ ] **Step 1: Créer le composant UniversalSearch**

```typescript
// web/src/components/search/universal-search.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Briefcase, User, Tag, Loader2 } from 'lucide-react';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useRouter } from 'next/navigation';

interface UniversalResults {
    projects: { id: string; name: string; slug: string; pitch: string; sector: string; logoUrl?: string; similarity: number }[];
    people: { id: string; firstName: string; lastName: string; name?: string; image?: string; title?: string; similarity: number }[];
    skills: { value: string; label: string; count: number; similarity: number }[];
}

export function UniversalSearch({ onClose }: { onClose: () => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UniversalResults | null>(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (query.length < 2) {
            setResults(null);
            return;
        }
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await AXIOS_INSTANCE.get(`/search/universal?q=${encodeURIComponent(query)}`);
                setResults(data);
            } catch {
                setResults(null);
            } finally {
                setLoading(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [query]);

    const navigate = useCallback((path: string) => {
        onClose();
        router.push(path);
    }, [onClose, router]);

    const hasResults = results && (results.projects.length > 0 || results.people.length > 0 || results.skills.length > 0);

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="max-w-2xl mx-auto mt-20 px-4" onClick={e => e.stopPropagation()}>
                {/* Search input */}
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                        <Search className="w-5 h-5 text-gray-400 shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Rechercher un projet, une personne, une compétence..."
                            className="flex-1 text-base outline-none placeholder:text-gray-400"
                        />
                        {loading && <Loader2 className="w-4 h-4 text-kezak-primary animate-spin" />}
                        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Results */}
                    {hasResults && (
                        <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-50">
                            {/* Projets */}
                            {results.projects.length > 0 && (
                                <div className="p-3">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                                        <Briefcase className="w-3 h-3" /> Projets
                                    </p>
                                    {results.projects.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => navigate(`/projects/${p.slug || p.id}`)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-kezak-light flex items-center justify-center shrink-0 overflow-hidden">
                                                {p.logoUrl ? (
                                                    <img src={p.logoUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-sm font-bold text-kezak-primary">{p.name?.[0]}</span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{p.sector} · {p.pitch?.slice(0, 60)}...</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Personnes */}
                            {results.people.length > 0 && (
                                <div className="p-3">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                                        <User className="w-3 h-3" /> Personnes
                                    </p>
                                    {results.people.map(p => {
                                        const displayName = p.name || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Utilisateur';
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => navigate(`/founders/${p.id}`)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-kezak-light flex items-center justify-center shrink-0 overflow-hidden">
                                                    {p.image ? (
                                                        <img src={p.image} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-sm font-bold text-kezak-primary">{displayName[0]}</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                                                    {p.title && <p className="text-xs text-gray-500 truncate">{p.title}</p>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Skills */}
                            {results.skills.length > 0 && (
                                <div className="p-3">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                                        <Tag className="w-3 h-3" /> Compétences
                                    </p>
                                    <div className="flex flex-wrap gap-2 px-2">
                                        {results.skills.map(s => (
                                            <button
                                                key={s.value}
                                                onClick={() => navigate(`/feed?skill=${encodeURIComponent(s.value)}`)}
                                                className="px-3 py-1.5 bg-kezak-light text-kezak-primary rounded-full text-xs font-semibold hover:bg-kezak-primary hover:text-white transition-colors"
                                            >
                                                {s.label} ({s.count})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Empty state */}
                    {query.length >= 2 && !loading && !hasResults && (
                        <div className="py-8 text-center text-gray-400 text-sm">
                            Aucun résultat pour « {query} »
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Intégrer dans header.tsx**

Remplacer la barre de recherche statique par un trigger qui ouvre le modal `UniversalSearch` :

```typescript
// Ajouter les imports :
import { useState } from 'react';
import dynamic from 'next/dynamic';
const UniversalSearch = dynamic(() =>
    import('@/components/search/universal-search').then(m => ({ default: m.UniversalSearch })),
    { ssr: false }
);

// Dans le composant Header, ajouter :
const [showSearch, setShowSearch] = useState(false);

// Remplacer le <input readOnly onClick={() => router.push('/feed/search')} /> par :
<input
    type="text"
    placeholder="Rechercher un projet, un talent, une idée..."
    className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all cursor-pointer"
    readOnly
    onClick={() => setShowSearch(true)}
/>

// Remplacer le bouton Search mobile par :
<button
    onClick={() => setShowSearch(true)}
    className="lg:hidden p-2 text-gray-400 hover:text-kezak-primary hover:bg-gray-50 rounded-full transition-colors"
>
    <Search className="w-6 h-6" />
</button>

// Ajouter avant le </header> :
{showSearch && <UniversalSearch onClose={() => setShowSearch(false)} />}
```

- [ ] **Step 3: Vérifier la compilation**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/search/ web/src/components/layout/header.tsx
git commit -m "feat: universal search modal in header (projects, people, skills)"
```

---

## Chunk 5: Sécurité, validation, tests

### Task 10: Sécurité — Rate limiting + validation des entrées

**Files:**
- Modify: `api/src/search/search.controller.ts`
- Modify: `api/src/filters/filters.controller.ts`

- [ ] **Step 1: Ajouter le Throttle sur les endpoints coûteux**

`search/universal` appelle `getEmbedding()` à chaque requête (coût API). Il faut limiter.

```typescript
// Dans search.controller.ts, ajouter :
import { Throttle } from '@nestjs/throttler';

// Sur la méthode searchUniversal :
@Throttle({ default: { limit: 15, ttl: 60000 } }) // 15 requêtes/min max
@Get('universal')
async searchUniversal(...)
```

```typescript
// Sur la méthode search existante :
@Throttle({ default: { limit: 15, ttl: 60000 } })
@Get()
async search(...)
```

- [ ] **Step 2: Tronquer le query pour éviter les abus**

Dans `search.service.ts`, au début de `searchUniversal()` :
```typescript
async searchUniversal(query: string, userId?: string) {
    // Sécurité : tronquer les queries trop longues (max 200 chars)
    const safeQuery = query.slice(0, 200).trim();
    if (safeQuery.length < 2) return { projects: [], people: [], skills: [] };

    this.logger.log(`Universal search: "${safeQuery}"`);
    const queryEmbedding = await this.aiService.getEmbedding(safeQuery);
    // ...
```

Faire la même chose dans `search()` existant.

- [ ] **Step 3: Valider que les raw queries utilisent les tagged templates Prisma**

Vérifier que TOUTES les requêtes raw utilisent `this.prisma.$queryRaw` avec tagged template literals (jamais `$queryRawUnsafe`). Les variables sont passées via `${variable}` dans le template — Prisma les échappe automatiquement.

**Points à vérifier :**
- `searchUniversal()` : `${vectorString}::vector` et `${'%' + safeQuery + '%'}` — OK, template literals Prisma
- `getSkillEmbedding()` : `${skillValue}` — OK
- `refreshSkillEmbeddings()` : `${vectorString}::vector` — OK

- [ ] **Step 4: Vérifier qu'aucune donnée privée ne fuite**

Dans la requête `people` de `searchUniversal` :
- **Exposé** : `id`, `firstName`, `lastName`, `name`, `image`, `title` — OK (public)
- **Non exposé** : `email`, `phone`, `firebaseUid`, `address` — Correct
- **Vérifier** : La requête ILIKE sur `name` ne doit pas retourner des users non-publiés → Ajouter un filtre dans le fallback texte :

```sql
-- Dans le UNION ALL people (fallback texte), ajouter :
AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED')
```

- [ ] **Step 5: Commit**

```bash
git add api/src/search/ api/src/filters/
git commit -m "security: add rate limiting, query truncation, and data exposure checks"
```

### Task 11: Validation — DTO et edge cases

**Files:**
- Modify: `api/src/search/search.controller.ts`
- Modify: `api/src/filters/filters.controller.ts`

- [ ] **Step 1: Gérer les edge cases du controller**

```typescript
// search.controller.ts — searchUniversal
@Get('universal')
@Throttle({ default: { limit: 15, ttl: 60000 } })
async searchUniversal(
    @Query('q') query: string,
    @Request() req?: any,
) {
    // Validation : query requise, min 2 chars, max 200
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return { projects: [], people: [], skills: [] };
    }
    const userId = req?.user?.uid;
    return this.searchService.searchUniversal(query.trim(), userId);
}
```

```typescript
// filters.controller.ts — getPopularSkills
@Get('popular-skills')
async getPopularSkills(@Query('limit') limit?: string) {
    const parsed = parseInt(limit || '20', 10);
    const n = Number.isNaN(parsed) ? 20 : Math.min(Math.max(parsed, 1), 50);
    return this.filtersService.getPopularSkills(n);
}
```

- [ ] **Step 2: Gérer le cas embedding service indisponible**

Dans `searchUniversal()`, si `getEmbedding()` échoue (API down), fallback sur le texte uniquement :

```typescript
async searchUniversal(query: string, userId?: string) {
    const safeQuery = query.slice(0, 200).trim();
    if (safeQuery.length < 2) return { projects: [], people: [], skills: [] };

    let vectorString: string | null = null;
    try {
        const queryEmbedding = await this.aiService.getEmbedding(safeQuery);
        vectorString = `[${queryEmbedding.join(',')}]`;
    } catch (err) {
        this.logger.warn(`Embedding generation failed, falling back to text search: ${err.message}`);
    }

    // Si pas de vector, faire uniquement le fallback ILIKE
    if (!vectorString) {
        return this.searchTextOnly(safeQuery, userId);
    }

    // ... reste du code vectoriel
}

// Méthode fallback texte uniquement
private async searchTextOnly(query: string, userId?: string) {
    const [projects, people] = await Promise.all([
        this.prisma.$queryRaw`
            SELECT id, name, slug, pitch, sector, logo_url AS "logoUrl", 0.5 AS similarity
            FROM projects
            WHERE status = 'PUBLISHED'
              AND (LOWER(name) LIKE LOWER(${'%' + query + '%'}) OR LOWER(pitch) LIKE LOWER(${'%' + query + '%'}))
            LIMIT 5;
        `,
        this.prisma.$queryRaw`
            SELECT u.id, u.first_name AS "firstName", u.last_name AS "lastName",
                   u.name, u.image, cp.title, 0.5 AS similarity
            FROM users u
            LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
            WHERE (LOWER(u.first_name) LIKE LOWER(${'%' + query + '%'})
                OR LOWER(u.last_name) LIKE LOWER(${'%' + query + '%'})
                OR LOWER(u.name) LIKE LOWER(${'%' + query + '%'}))
              AND (u.role = 'FOUNDER' OR cp.status = 'PUBLISHED')
            LIMIT 5;
        `,
    ]);

    await this.prisma.searchLog.create({
        data: { query, userId, searchType: 'TEXT_FALLBACK', resultsCount: (projects as any[]).length + (people as any[]).length, topResultIds: [...(projects as any[]).map((p: any) => p.id), ...(people as any[]).map((p: any) => p.id)] },
    });

    return { projects, people, skills: [] };
}
```

- [ ] **Step 3: Gérer le cas feed skills sans embedding disponible**

Dans `getFeed()` de `projects.service.ts`, si `getSkillEmbedding()` retourne null pour tous les skills (embeddings pas encore générés), fallback automatique sur le `hasSome` exact — déjà géré par le `hasSemanticMatch` boolean. Vérifier que c'est le cas.

- [ ] **Step 4: Commit**

```bash
git add api/src/search/ api/src/filters/ api/src/projects/
git commit -m "feat: add validation, edge case handling, and embedding fallback"
```

### Task 12: Tests fonctionnels

- [ ] **Step 1: Vérifier la compilation complète**

```bash
cd api && npx tsc --noEmit
cd ../web && npx tsc --noEmit
```

- [ ] **Step 2: Tests manuels API**

1. **Démarrage** : Lancer l'API, vérifier les logs `Refreshing skill embeddings...`
2. **Popular skills** : `GET /filters/popular-skills` → retourne un tableau de skills avec count
3. **Popular skills vide** : Si aucun projet/candidat n'a de skills, retourne `[]`
4. **Feed sans filtre** : `GET /projects/feed` → fonctionne comme avant
5. **Feed avec skill** : `GET /projects/feed?skills=React` → retourne les projets pertinents (matching sémantique si embedding dispo, exact sinon)
6. **Recherche universelle** : `GET /search/universal?q=développeur react` → retourne projets + personnes + skills
7. **Recherche par nom** : `GET /search/universal?q=Christian` → retourne la personne "Christian Fotso"
8. **Recherche vide** : `GET /search/universal?q=a` → retourne `{ projects: [], people: [], skills: [] }`
9. **Recherche trop longue** : `GET /search/universal?q=aaa...200+chars` → fonctionne (tronqué)
10. **Secteurs cohérents** : Vérifier que le feed, la création projet, et l'onboarding affichent les mêmes 11 secteurs

- [ ] **Step 3: Tests manuels Frontend**

1. **Filtres feed** : ouvrir les filtres, vérifier que les skills viennent de l'API (pas hardcodés)
2. **Filtres secteur** : vérifier les 11 secteurs avec labels
3. **Recherche header desktop** : cliquer sur la barre → modal s'ouvre → taper "fintech" → résultats groupés
4. **Recherche header mobile** : cliquer l'icône loupe → même modal
5. **Navigation** : cliquer un résultat projet → navigue vers la page projet
6. **Navigation personne** : cliquer un résultat personne → navigue vers le profil
7. **Fermeture** : cliquer hors du modal ou sur X → ferme la recherche

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat: semantic search — skills vectoriel, recherche universelle, secteurs unifiés"
```
