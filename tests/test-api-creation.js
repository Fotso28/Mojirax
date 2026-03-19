/**
 * Test de création de projets via l'API HTTP (circuit formulaire réel)
 * Valide: auth Firebase, DTO validation, rate limiter, réponse API
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Firebase Admin from API
const admin = require('../api/node_modules/firebase-admin');
require('dotenv').config({ path: path.join(__dirname, '..', 'api', '.env') });

const API_URL = 'http://localhost:5001';
const FIREBASE_UID = 'Dugr9woZkaeD9Z9liGFqvmYKAD33';

async function getToken() {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert({
                project_id: process.env.FIREBASE_PROJECT_ID,
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    }

    const customToken = await admin.auth().createCustomToken(FIREBASE_UID);

    // Read web API key
    const webEnv = fs.readFileSync(path.join(__dirname, '..', 'web', '.env'), 'utf8');
    const match = webEnv.match(/NEXT_PUBLIC_FIREBASE_API_KEY=(.+)/);
    if (!match) throw new Error('FIREBASE_API_KEY not found in web/.env');

    const tokenRes = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${match[1].trim()}`,
        { token: customToken, returnSecureToken: true }
    );
    return tokenRes.data.idToken;
}

async function main() {
    console.log('🔑 Authentification Firebase...');
    const idToken = await getToken();
    console.log('✅ Token obtenu\n');

    const api = axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${idToken}` },
        timeout: 30000,
    });

    const tests = [
        {
            label: 'Cas 1: Champs minimum (name + pitch)',
            data: { name: 'API-Test-Minimum', pitch: 'Test avec seulement les champs obligatoires' },
            expect: 'success',
        },
        {
            label: 'Cas 2: Formulaire complet (tous les champs)',
            data: {
                name: 'API-Test-Complet', pitch: 'Test avec tous les champs du formulaire remplis',
                country: 'Cameroun', city: 'Douala', location: 'Douala, Cameroun',
                scope: 'LOCAL', sector: 'FINTECH', stage: 'MVP_BUILD',
                problem: 'Les entrepreneurs n\'ont pas accès au financement adapté',
                target: 'Jeunes entrepreneurs camerounais',
                solution_current: 'Banques traditionnelles inadaptées au contexte local',
                solution_desc: 'Plateforme de micro-crédit instantané basée sur l\'IA',
                uvp: 'Crédit en 5 minutes sans paperasse',
                anti_scope: 'Nous ne ciblons pas les grandes entreprises',
                market_type: 'B2C', business_model: 'FREEMIUM',
                competitors: 'Wave, Orange Money (mais pas de crédit)',
                founder_role: 'CEO', time_availability: 'FULLTIME',
                traction: '200 utilisateurs beta, 25% croissance mensuelle',
                looking_for_role: 'TECH', collab_type: 'EQUITY',
                vision: 'Leader du micro-crédit digital en Afrique francophone d\'ici 2029',
                requiredSkills: ['React Native', 'Node.js', 'Machine Learning', 'PostgreSQL'],
            },
            expect: 'success',
        },
        {
            label: 'Cas 3: Skills maximum (30)',
            data: {
                name: 'API-Test-Skills-Max', pitch: 'Test avec 30 compétences requises',
                sector: 'AI', stage: 'IDEA',
                requiredSkills: Array.from({ length: 30 }, (_, i) => `Skill${i + 1}`),
            },
            expect: 'success',
        },
        {
            label: 'Cas 4: Nom trop long (devrait échouer: 121 chars)',
            data: { name: 'A'.repeat(121), pitch: 'Test nom trop long' },
            expect: 'fail',
        },
        {
            label: 'Cas 5: Pitch manquant (devrait échouer)',
            data: { name: 'Test Sans Pitch' },
            expect: 'fail',
        },
        {
            label: 'Cas 6: Sector invalide (devrait échouer)',
            data: { name: 'Test Sector Invalide', pitch: 'Test', sector: 'INVALID_SECTOR' },
            expect: 'fail',
        },
        {
            label: 'Cas 7: Stage invalide (devrait échouer)',
            data: { name: 'Test Stage Invalide', pitch: 'Test', stage: 'INVALID_STAGE' },
            expect: 'fail',
        },
        {
            label: 'Cas 8: 31 skills (devrait échouer: max 30)',
            data: {
                name: 'Test Skills Over', pitch: 'Test trop de skills',
                requiredSkills: Array.from({ length: 31 }, (_, i) => `Skill${i + 1}`),
            },
            expect: 'fail',
        },
        {
            label: 'Cas 9: Champ inconnu (devrait être rejeté: forbidNonWhitelisted)',
            data: { name: 'Test Champ Inconnu', pitch: 'Test', unknownField: 'should fail' },
            expect: 'fail',
        },
    ];

    let passed = 0;
    let failed = 0;

    for (let i = 0; i < tests.length; i++) {
        const t = tests[i];
        console.log(`📋 ${t.label}`);

        try {
            const { data } = await api.post('/projects', t.data);
            if (t.expect === 'success') {
                console.log(`  ✅ PASS — id=${data.id}, status=${data.status}, slug=${data.slug}`);
                passed++;
            } else {
                console.log(`  ❌ FAIL — Devait échouer mais a réussi (id=${data.id})`);
                failed++;
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            const status = err.response?.status;
            if (t.expect === 'fail') {
                console.log(`  ✅ PASS — Rejeté comme prévu (${status}: ${Array.isArray(msg) ? msg.join(', ') : msg})`);
                passed++;
            } else if (status === 429) {
                console.log(`  ⚠️  RATE LIMITED — Pause 60s...`);
                await new Promise(r => setTimeout(r, 61000));
                // Retry
                try {
                    const { data } = await api.post('/projects', t.data);
                    console.log(`  ✅ PASS (retry) — id=${data.id}, status=${data.status}`);
                    passed++;
                } catch (retryErr) {
                    console.log(`  ❌ FAIL (retry) — ${retryErr.response?.data?.message || retryErr.message}`);
                    failed++;
                }
            } else {
                console.log(`  ❌ FAIL — ${status}: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
                failed++;
            }
        }

        // Rate limit awareness: pause after every 3 requests
        if ((i + 1) % 3 === 0 && i < tests.length - 1) {
            console.log('  ⏳ Pause 61s (rate limit 3 req/60s)...');
            await new Promise(r => setTimeout(r, 61000));
        }
    }

    console.log('\n' + '═'.repeat(50));
    console.log(`📊 RÉSULTAT: ${passed} passés, ${failed} échoués sur ${tests.length} tests`);
    console.log('═'.repeat(50));

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('💥', err.message);
    process.exit(1);
});
