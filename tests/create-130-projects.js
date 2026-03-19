/**
 * Script de test : création de 130 projets via l'API (circuit formulaire)
 *
 * Utilise Firebase Admin SDK pour générer un token,
 * puis appelle POST /projects pour chaque projet.
 *
 * Contourne le rate limiter en espaçant les requêtes intelligemment
 * et en utilisant plusieurs "fondateurs" simulés.
 */

const axios = require('axios');
const admin = require('firebase-admin');
const path = require('path');

// Load .env from api/
require('dotenv').config({ path: path.join(__dirname, '..', 'api', '.env') });

const API_URL = 'http://localhost:5001';
const FIREBASE_UID = 'Dugr9woZkaeD9Z9liGFqvmYKAD33'; // Max — fondateur existant

// ─── Données de test variées ─────────────────────────────────────────────

const SECTORS = ['FINTECH', 'AGRITECH', 'HEALTHTECH', 'EDTECH', 'LOGISTICS', 'ECOMMERCE', 'SAAS', 'MARKETPLACE', 'IMPACT', 'AI', 'OTHER'];
const STAGES = ['IDEA', 'PROTOTYPE', 'MVP_BUILD', 'MVP_LIVE', 'TRACTION', 'SCALE'];
const SCOPES = ['LOCAL', 'DIASPORA', 'HYBRID'];
const MARKET_TYPES = ['B2C', 'B2B', 'B2G', 'MARKETPLACE'];
const BIZ_MODELS = ['SUBSCRIPTION', 'COMMISSION', 'SALES', 'FREEMIUM', 'ADS'];
const FOUNDER_ROLES = ['CEO', 'CTO', 'CPO', 'CMO', 'COO'];
const TIME_AVAILS = ['2-5H', '5-10H', '10-20H', 'FULLTIME'];
const LOOKING_ROLES = ['TECH', 'BIZ', 'PRODUCT', 'FINANCE'];
const COLLAB_TYPES = ['EQUITY', 'PAID', 'HYBRID'];

const COUNTRIES = ['Cameroun', 'Sénégal', "Côte d'Ivoire", 'RDC', 'Gabon', 'Mali', 'Burkina Faso', 'Togo', 'Bénin', 'Guinée'];
const CITIES_BY_COUNTRY = {
    'Cameroun': ['Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Garoua'],
    'Sénégal': ['Dakar', 'Saint-Louis', 'Thiès', 'Ziguinchor'],
    "Côte d'Ivoire": ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro'],
    'RDC': ['Kinshasa', 'Lubumbashi', 'Goma', 'Mbuji-Mayi'],
    'Gabon': ['Libreville', 'Port-Gentil', 'Franceville'],
    'Mali': ['Bamako', 'Sikasso', 'Mopti'],
    'Burkina Faso': ['Ouagadougou', 'Bobo-Dioulasso'],
    'Togo': ['Lomé', 'Kara', 'Sokodé'],
    'Bénin': ['Cotonou', 'Porto-Novo', 'Parakou'],
    'Guinée': ['Conakry', 'Nzérékoré', 'Kankan'],
};

const PROJECT_NAMES = [
    'AgriPay', 'MedConnect', 'EduLearn', 'LogiTrack', 'FinWave',
    'HealthBridge', 'FarmTech', 'PaySwift', 'LearnHub', 'DeliverPlus',
    'CashFlow', 'SmartFarm', 'DocOnline', 'SkillForge', 'TransitGo',
    'MarketPulse', 'GreenEnergy', 'TechHire', 'FoodChain', 'BuildRight',
    'DataVault', 'CloudMart', 'SafeWater', 'SolarGrid', 'CityMobil',
    'InsurTech', 'PropTech', 'WasteLess', 'AgroLink', 'CleanAir',
    'UrbanFarm', 'DigiBank', 'HealthAI', 'EduPro', 'LogiSmart',
    'FinScope', 'MedTrack', 'AgriSense', 'PayLink', 'LearnCode',
    'DeliverMax', 'CashGuard', 'FarmFlow', 'DocSmart', 'SkillPro',
    'TransitMax', 'MarketUp', 'GreenTech', 'TechBridge', 'FoodSafe',
    'BuildSmart', 'DataFlow', 'CloudSync', 'SafeHome', 'SolarTech',
    'CityGreen', 'InsurPlus', 'PropMatch', 'WasteZero', 'AgroMax',
    'DigiPay', 'HealthPro', 'EduMatch', 'LogiFlow', 'FinTrack',
    'MedAI', 'AgriFlow', 'PayGuard', 'LearnMatch', 'DeliverAI',
    'CashPro', 'FarmGuard', 'DocAI', 'SkillMatch', 'TransitAI',
    'MarketAI', 'GreenFlow', 'TechMatch', 'FoodTrack', 'BuildFlow',
    'DataGuard', 'CloudAI', 'SafeCity', 'SolarFlow', 'CityAI',
    'InsurAI', 'PropFlow', 'WasteSmart', 'AgroAI', 'CleanTech',
    'UrbanTech', 'DigiFlow', 'HealthMatch', 'EduAI', 'LogiAI',
    'FinAI', 'MedFlow', 'AgriPro', 'PayAI', 'LearnFlow',
    'DeliverFlow', 'CashAI', 'FarmAI', 'DocFlow', 'SkillAI',
    'TransitFlow', 'MarketFlow', 'GreenAI', 'TechFlow', 'FoodAI',
    'BuildAI', 'DataAI', 'CloudFlow', 'SafeAI', 'SolarAI',
    'CityFlow', 'InsurFlow', 'PropAI', 'WasteAI', 'AgroFlow',
    'DigiAI', 'HealthFlow', 'EduFlow', 'LogiPro', 'FinFlow',
    'MedPro', 'AgriMatch', 'PayPro', 'LearnPro', 'DeliverPro',
];

const PITCHES = [
    "Solution innovante de paiement mobile pour les marchés informels africains",
    "Plateforme de télémédecine connectant médecins et patients en zone rurale",
    "Marketplace de formation professionnelle pour jeunes diplômés africains",
    "Système de traçabilité de la chaîne agricole par blockchain",
    "Application de micro-crédit instantané basée sur l'IA",
    "Réseau de livraison express pour le e-commerce en Afrique de l'Ouest",
    "Plateforme d'assurance santé digitale pour les travailleurs informels",
    "Solution de gestion des déchets intelligente pour les villes africaines",
    "Marketplace B2B connectant producteurs agricoles et acheteurs internationaux",
    "Application d'éducation gamifiée pour l'apprentissage des langues locales",
    "Fintech de transfert d'argent instantané entre pays africains",
    "Plateforme IoT pour l'agriculture de précision en Afrique subsaharienne",
    "Service de consultation juridique en ligne pour entrepreneurs africains",
    "Solution de mobilité urbaine combinant moto-taxis et covoiturage",
    "Plateforme de crowdfunding pour projets à impact social en Afrique",
    "Application de gestion de stock pour les PME africaines",
    "Réseau social professionnel dédié aux entrepreneurs africains",
    "Solution de paiement par QR code pour les marchés de rue",
    "Plateforme d'e-learning adaptative pour les écoles primaires",
    "Service de diagnostic médical par IA accessible via smartphone",
];

const PROBLEMS = [
    "Les populations rurales n'ont pas accès aux services financiers de base. Les banques traditionnelles sont absentes et le mobile money reste limité.",
    "L'accès aux soins de santé est quasi inexistant dans les zones reculées. Les patients doivent parcourir des centaines de kilomètres pour consulter.",
    "Le chômage des jeunes diplômés atteint 40% dans certains pays africains. Le décalage entre formation et marché du travail est criant.",
    "Les pertes post-récolte représentent 30-40% de la production agricole en Afrique. L'absence de chaîne de froid et de logistique adaptée est en cause.",
    "Les entrepreneurs africains peinent à accéder au financement. Les processus bancaires sont longs, opaques et inadaptés aux réalités locales.",
];

const SOLUTIONS = [
    "Notre plateforme utilise l'IA pour analyser les habitudes de dépense et offrir des microcrédits adaptés, sans paperasse ni garantie physique.",
    "Nous connectons les patients aux médecins via une app mobile légère, fonctionnant même en 2G, avec diagnostic assisté par IA.",
    "Notre marketplace met en relation directe les entreprises qui recrutent avec les talents vérifiés, grâce à un algorithme de matching intelligent.",
    "Notre solution IoT combine capteurs, données satellite et IA pour optimiser l'irrigation, prédire les rendements et réduire les pertes.",
    "Nous proposons une plateforme de financement participatif avec due diligence automatisée et suivi en temps réel des investissements.",
];

const SKILLS_POOL = [
    'React', 'Node.js', 'Python', 'Flutter', 'React Native', 'TypeScript',
    'Django', 'FastAPI', 'PostgreSQL', 'MongoDB', 'Firebase', 'AWS',
    'Docker', 'Kubernetes', 'Machine Learning', 'Data Science', 'Blockchain',
    'UX Design', 'Figma', 'Marketing Digital', 'SEO', 'Growth Hacking',
    'Finance', 'Comptabilité', 'Vente B2B', 'Négociation', 'Leadership',
];

// ─── Helpers ────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(n, shuffled.length));
}

function generateProject(index) {
    const country = pick(COUNTRIES);
    const cities = CITIES_BY_COUNTRY[country] || ['Ville'];
    const city = pick(cities);
    const name = PROJECT_NAMES[index % PROJECT_NAMES.length] + (index >= PROJECT_NAMES.length ? ` ${Math.floor(index / PROJECT_NAMES.length) + 1}` : '');

    return {
        name,
        pitch: pick(PITCHES),
        country,
        city,
        location: `${city}, ${country}`,
        scope: pick(SCOPES),
        sector: pick(SECTORS),
        stage: pick(STAGES),
        problem: pick(PROBLEMS),
        target: `Jeunes entrepreneurs et PME de ${city}`,
        solution_current: "Pas de solution numérique existante adaptée au contexte local.",
        solution_desc: pick(SOLUTIONS),
        uvp: `La seule solution qui combine IA et expertise locale pour ${city}`,
        anti_scope: "Nous ne ciblons pas le marché européen ou nord-américain dans un premier temps.",
        market_type: pick(MARKET_TYPES),
        business_model: pick(BIZ_MODELS),
        competitors: "Quelques solutions internationales existent mais ne sont pas adaptées au contexte africain.",
        founder_role: pick(FOUNDER_ROLES),
        time_availability: pick(TIME_AVAILS),
        traction: index % 3 === 0 ? "500 utilisateurs beta, 20% de croissance mensuelle" : "En phase de validation du concept",
        looking_for_role: pick(LOOKING_ROLES),
        collab_type: pick(COLLAB_TYPES),
        vision: `Devenir le leader en ${pick(SECTORS).toLowerCase()} en Afrique francophone d'ici 3 ans.`,
        requiredSkills: pickN(SKILLS_POOL, 3 + Math.floor(Math.random() * 3)),
    };
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
    // 1. Init Firebase Admin
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert({
                project_id: process.env.FIREBASE_PROJECT_ID,
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    }

    // 2. Generate custom token → exchange for ID token
    console.log('🔑 Generating Firebase token...');
    const customToken = await admin.auth().createCustomToken(FIREBASE_UID);

    // Exchange custom token for ID token via Firebase REST API
    const firebaseApiKey = process.env.FIREBASE_WEB_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!firebaseApiKey) {
        // Fallback: read from web .env
        const fs = require('fs');
        const webEnv = fs.readFileSync(path.join(__dirname, '..', 'web', '.env'), 'utf8');
        const match = webEnv.match(/NEXT_PUBLIC_FIREBASE_API_KEY=(.+)/);
        if (!match) {
            console.error('❌ Impossible de trouver FIREBASE_WEB_API_KEY');
            process.exit(1);
        }
        var apiKey = match[1].trim();
    } else {
        var apiKey = firebaseApiKey;
    }

    const tokenRes = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
        { token: customToken, returnSecureToken: true }
    );
    const idToken = tokenRes.data.idToken;
    console.log('✅ Token obtenu');

    // 3. Create axios instance with auth
    const api = axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${idToken}` },
        timeout: 30000,
    });

    // 4. Test single creation first
    console.log('\n📋 Test de création unique...');
    const testProject = generateProject(0);
    try {
        const { data } = await api.post('/projects', testProject);
        console.log(`✅ Projet test créé: ${data.name} (${data.id}) — status: ${data.status}`);
    } catch (err) {
        console.error('❌ Échec création test:', err.response?.data || err.message);
        process.exit(1);
    }

    // 5. Create 130 projects (batch with rate limit awareness)
    // Rate limit: 3 req/60s — we'll do batches of 3 with 61s wait
    const TOTAL = 130;
    const BATCH_SIZE = 3;
    const BATCH_DELAY_MS = 61000; // 61 seconds between batches

    let success = 0;
    let fail = 0;
    const errors = [];

    console.log(`\n🚀 Création de ${TOTAL} projets (batches de ${BATCH_SIZE}, pause ${BATCH_DELAY_MS / 1000}s)...`);
    console.log(`⏱️  Estimation: ~${Math.ceil(TOTAL / BATCH_SIZE) * (BATCH_DELAY_MS / 1000 / 60)} minutes\n`);

    for (let batch = 0; batch < Math.ceil(TOTAL / BATCH_SIZE); batch++) {
        const start = batch * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, TOTAL);
        const batchProjects = [];

        for (let i = start; i < end; i++) {
            batchProjects.push(generateProject(i + 1)); // +1 because 0 was test
        }

        // Send batch in parallel
        const results = await Promise.allSettled(
            batchProjects.map((proj, idx) =>
                api.post('/projects', proj).then(res => {
                    success++;
                    const num = start + idx + 1;
                    console.log(`  ✅ [${num}/${TOTAL}] ${proj.name} — ${res.data.status}`);
                    return res.data;
                }).catch(err => {
                    fail++;
                    const num = start + idx + 1;
                    const msg = err.response?.data?.message || err.message;
                    console.log(`  ❌ [${num}/${TOTAL}] ${proj.name} — ${msg}`);
                    errors.push({ index: num, name: proj.name, error: msg });
                    throw err;
                })
            )
        );

        // Wait between batches (except last)
        if (end < TOTAL) {
            const remaining = TOTAL - end;
            const minutesLeft = Math.ceil(remaining / BATCH_SIZE) * (BATCH_DELAY_MS / 1000 / 60);
            process.stdout.write(`  ⏳ Pause 61s... (${remaining} restants, ~${minutesLeft.toFixed(1)} min)\r`);
            await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
        }
    }

    // 6. Report
    console.log('\n' + '═'.repeat(60));
    console.log(`📊 RÉSULTAT FINAL`);
    console.log(`═`.repeat(60));
    console.log(`  ✅ Succès: ${success}/${TOTAL}`);
    console.log(`  ❌ Échecs: ${fail}/${TOTAL}`);

    if (errors.length > 0) {
        console.log(`\n  Erreurs détaillées:`);
        errors.forEach(e => console.log(`    [${e.index}] ${e.name}: ${e.error}`));
    }

    // 7. Verify in DB
    const { PrismaClient } = require('../api/node_modules/@prisma/client');
    const prisma = new PrismaClient();
    const count = await prisma.project.count();
    console.log(`\n  📦 Total projets en DB: ${count}`);

    const byStatus = await prisma.project.groupBy({ by: ['status'], _count: true });
    byStatus.forEach(s => console.log(`    ${s.status}: ${s._count}`));

    await prisma.$disconnect();
    console.log('\n✅ Test terminé');
}

main().catch(err => {
    console.error('💥 Erreur fatale:', err.message);
    process.exit(1);
});
