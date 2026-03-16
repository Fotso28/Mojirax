/**
 * Backfill embeddings pour les projets, candidats et filter_embeddings
 * Utilise Jina AI v3 (1024 dimensions)
 *
 * Usage: cd api && npx ts-node scripts/backfill-embeddings.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

config({ path: resolve(__dirname, '../.env') });

const JINA_API_KEY = process.env.JINA_API_KEY;

if (!JINA_API_KEY) {
    console.error('❌ JINA_API_KEY manquant dans .env');
    process.exit(1);
}

const prisma = new PrismaClient();
const jina = new OpenAI({ apiKey: JINA_API_KEY, baseURL: 'https://api.jina.ai/v1' });

async function getEmbedding(text: string): Promise<number[]> {
    const clean = text.replace(/\n/g, ' ').substring(0, 8000);
    const response = await jina.embeddings.create({
        model: 'jina-embeddings-v3',
        input: clean,
        encoding_format: 'float',
    });
    return response.data[0].embedding;
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

async function backfillProjects() {
    const projects: any[] = await prisma.$queryRaw`
        SELECT id, name, pitch, problem, solution_desc, description
        FROM projects
        WHERE status = 'PUBLISHED' AND description_embedding IS NULL
    `;
    console.log(`\n📦 ${projects.length} projets à embedder...`);

    for (const p of projects) {
        const text = [p.name, p.pitch, p.problem, p.solution_desc, p.description]
            .filter(Boolean)
            .join(' ');
        if (text.length < 10) continue;

        try {
            const embedding = await getEmbedding(text);
            const vec = `[${embedding.join(',')}]`;
            await prisma.$executeRaw`
                UPDATE projects
                SET description_embedding = ${vec}::vector,
                    embedding_model = 'jina-embeddings-v3',
                    embedding_version = '1024',
                    last_embedded_at = NOW()
                WHERE id = ${p.id}
            `;
            console.log(`  ✅ ${p.name}`);
        } catch (e: any) {
            console.error(`  ❌ ${p.name}: ${e.message}`);
        }
        await sleep(250);
    }
}

async function backfillCandidates() {
    const candidates: any[] = await prisma.$queryRaw`
        SELECT id, title, bio, short_pitch, long_pitch, skills
        FROM candidate_profiles
        WHERE status = 'PUBLISHED' AND bio_embedding IS NULL
    `;
    console.log(`\n👤 ${candidates.length} candidats à embedder...`);

    for (const c of candidates) {
        // Bio embedding
        const bioText = [c.title, c.bio, c.short_pitch, c.long_pitch]
            .filter(Boolean)
            .join(' ');
        if (bioText.length >= 10) {
            try {
                const bioEmb = await getEmbedding(bioText);
                const bioVec = `[${bioEmb.join(',')}]`;
                await prisma.$executeRaw`
                    UPDATE candidate_profiles
                    SET bio_embedding = ${bioVec}::vector,
                        embedding_model = 'jina-embeddings-v3',
                        embedding_version = '1024',
                        last_embedded_at = NOW()
                    WHERE id = ${c.id}
                `;
                await sleep(250);
            } catch (e: any) {
                console.error(`  ❌ Bio ${c.title}: ${e.message}`);
            }
        }

        // Skills embedding
        const skills: string[] = c.skills || [];
        if (skills.length > 0) {
            try {
                const skillsEmb = await getEmbedding(skills.join(', '));
                const skillsVec = `[${skillsEmb.join(',')}]`;
                await prisma.$executeRaw`
                    UPDATE candidate_profiles
                    SET skills_embedding = ${skillsVec}::vector
                    WHERE id = ${c.id}
                `;
                await sleep(250);
            } catch (e: any) {
                console.error(`  ❌ Skills ${c.title}: ${e.message}`);
            }
        }

        console.log(`  ✅ ${c.title}`);
    }
}

async function backfillFilterEmbeddings() {
    const filters: any[] = await prisma.$queryRaw`
        SELECT id, value, label
        FROM filter_embeddings
        WHERE embedding IS NULL
    `;
    if (filters.length === 0) {
        console.log('\n🏷️  Tous les filter_embeddings ont déjà un vecteur.');
        return;
    }
    console.log(`\n🏷️  ${filters.length} filter_embeddings à embedder...`);

    for (const f of filters) {
        try {
            const emb = await getEmbedding(f.value);
            const vec = `[${emb.join(',')}]`;
            await prisma.$executeRaw`
                UPDATE filter_embeddings
                SET embedding = ${vec}::vector
                WHERE id = ${f.id}
            `;
            console.log(`  ✅ ${f.value}`);
        } catch (e: any) {
            console.error(`  ❌ ${f.value}: ${e.message}`);
        }
        await sleep(200);
    }
}

async function verify() {
    const stats: any[] = await prisma.$queryRaw`
        SELECT 'projects' as t,
               count(*) FILTER (WHERE description_embedding IS NOT NULL) as with_emb,
               count(*) as total
        FROM projects WHERE status='PUBLISHED'
        UNION ALL
        SELECT 'candidates',
               count(*) FILTER (WHERE bio_embedding IS NOT NULL),
               count(*)
        FROM candidate_profiles WHERE status='PUBLISHED'
        UNION ALL
        SELECT 'filters',
               count(*) FILTER (WHERE embedding IS NOT NULL),
               count(*)
        FROM filter_embeddings
    `;
    console.log('\n📊 Résultat:');
    stats.forEach((r) =>
        console.log(`  ${r.t}: ${r.with_emb}/${r.total} avec embedding`),
    );
}

async function main() {
    console.log('🚀 Backfill embeddings — Jina AI v3 (1024 dims)\n');

    await backfillProjects();
    await backfillCandidates();
    await backfillFilterEmbeddings();
    await verify();

    await prisma.$disconnect();
    console.log('\n✅ Backfill terminé !');
}

main().catch(async (e) => {
    console.error('❌ Erreur:', e);
    await prisma.$disconnect();
    process.exit(1);
});
