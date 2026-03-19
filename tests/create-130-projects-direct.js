/**
 * Test : création de 130 projets directement via Prisma (bypass rate limiter)
 * Simule le circuit formulaire complet (tous les champs du DTO)
 * Vérifie que chaque projet est créé avec succès et que les données sont cohérentes.
 */

const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', 'api', '.env') }); } catch {}
// Set DATABASE_URL manually if dotenv not available
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/co_founder_db';
}

const { PrismaClient } = require('../api/node_modules/@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// ─── Enum values (identiques au DTO) ────────────────────────────────────

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
const CITIES = {
    'Cameroun': ['Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Garoua', 'Maroua', 'Kribi', 'Limbé'],
    'Sénégal': ['Dakar', 'Saint-Louis', 'Thiès', 'Ziguinchor', 'Kaolack'],
    "Côte d'Ivoire": ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Korhogo'],
    'RDC': ['Kinshasa', 'Lubumbashi', 'Goma', 'Mbuji-Mayi', 'Bukavu'],
    'Gabon': ['Libreville', 'Port-Gentil', 'Franceville', 'Oyem'],
    'Mali': ['Bamako', 'Sikasso', 'Mopti', 'Ségou'],
    'Burkina Faso': ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou'],
    'Togo': ['Lomé', 'Kara', 'Sokodé', 'Atakpamé'],
    'Bénin': ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey'],
    'Guinée': ['Conakry', 'Nzérékoré', 'Kankan', 'Kindia'],
};

const NAMES = [
    'AgriPay', 'MedConnect', 'EduLearn', 'LogiTrack', 'FinWave', 'HealthBridge', 'FarmTech', 'PaySwift',
    'LearnHub', 'DeliverPlus', 'CashFlow', 'SmartFarm', 'DocOnline', 'SkillForge', 'TransitGo',
    'MarketPulse', 'GreenEnergy', 'TechHire', 'FoodChain', 'BuildRight', 'DataVault', 'CloudMart',
    'SafeWater', 'SolarGrid', 'CityMobil', 'InsurTech', 'PropTech', 'WasteLess', 'AgroLink', 'CleanAir',
    'UrbanFarm', 'DigiBank', 'HealthAI', 'EduPro', 'LogiSmart', 'FinScope', 'MedTrack', 'AgriSense',
    'PayLink', 'LearnCode', 'DeliverMax', 'CashGuard', 'FarmFlow', 'DocSmart', 'SkillPro', 'TransitMax',
    'MarketUp', 'GreenTech', 'TechBridge', 'FoodSafe', 'BuildSmart', 'DataFlow', 'CloudSync', 'SafeHome',
    'SolarTech', 'CityGreen', 'InsurPlus', 'PropMatch', 'WasteZero', 'AgroMax', 'DigiPay', 'HealthPro',
    'EduMatch', 'LogiFlow', 'FinTrack', 'MedAI', 'AgriFlow', 'PayGuard', 'LearnMatch', 'DeliverAI',
    'CashPro', 'FarmGuard', 'DocAI', 'SkillMatch', 'TransitAI', 'MarketAI', 'GreenFlow', 'TechMatch',
    'FoodTrack', 'BuildFlow', 'DataGuard', 'CloudAI', 'SafeCity', 'SolarFlow', 'CityAI', 'InsurAI',
    'PropFlow', 'WasteSmart', 'AgroAI', 'CleanTech', 'UrbanTech', 'DigiFlow', 'HealthMatch', 'EduAI',
    'LogiAI', 'FinAI', 'MedFlow', 'AgriPro', 'PayAI', 'LearnFlow', 'DeliverFlow', 'CashAI', 'FarmAI',
    'DocFlow', 'SkillAI', 'TransitFlow', 'MarketFlow', 'GreenAI', 'TechFlow', 'FoodAI', 'BuildAI',
    'DataAI', 'CloudFlow', 'SafeAI', 'SolarAI', 'CityFlow', 'InsurFlow', 'PropAI', 'WasteAI', 'AgroFlw',
    'DigiAI', 'HealthFlw', 'EduFlow', 'LogiPro', 'FinFlow', 'MedPro', 'AgriMatch', 'PayPro', 'LearnPr',
    'DeliverPr', 'CshFlow2',
];

const PITCHES = [
    "Solution innovante de paiement mobile pour les marchés informels africains",
    "Plateforme de télémédecine connectant médecins et patients en zone rurale",
    "Marketplace de formation professionnelle pour jeunes diplômés africains",
    "Système de traçabilité de la chaîne agricole par blockchain et IoT",
    "Application de micro-crédit instantané basée sur l'intelligence artificielle",
    "Réseau de livraison express pour le e-commerce en Afrique de l'Ouest",
    "Plateforme d'assurance santé digitale pour les travailleurs informels",
    "Solution de gestion des déchets intelligente pour les villes africaines",
    "Marketplace B2B connectant producteurs agricoles et acheteurs internationaux",
    "Application d'éducation gamifiée pour l'apprentissage des langues locales",
    "Fintech de transfert d'argent instantané entre pays africains francophones",
    "Plateforme IoT pour l'agriculture de précision en Afrique subsaharienne",
    "Service de consultation juridique en ligne accessible à tous les entrepreneurs",
    "Solution de mobilité urbaine combinant moto-taxis et covoiturage intelligent",
    "Plateforme de crowdfunding pour projets à impact social en Afrique",
    "Application de gestion de stock et comptabilité pour les PME africaines",
    "Réseau social professionnel dédié aux entrepreneurs du continent africain",
    "Solution de paiement par QR code pour les marchés de rue et commerces",
    "Plateforme e-learning adaptative pour les écoles primaires et secondaires",
    "Service de diagnostic médical par IA accessible via smartphone basique",
];

const PROBLEMS = [
    "Les populations rurales n'ont pas accès aux services financiers de base. Les banques traditionnelles sont absentes des zones rurales et le mobile money reste limité en fonctionnalités.",
    "L'accès aux soins de santé est quasi inexistant dans les zones reculées. Les patients doivent parcourir des centaines de kilomètres pour une simple consultation.",
    "Le chômage des jeunes diplômés atteint 40% dans certains pays africains. Le décalage entre la formation académique et les besoins réels du marché est criant.",
    "Les pertes post-récolte représentent 30-40% de la production agricole. L'absence de chaîne de froid et de logistique adaptée cause des pertes massives.",
    "Les entrepreneurs africains peinent à accéder au financement. Les processus bancaires sont longs, opaques et inadaptés aux réalités du terrain.",
    "La mobilité urbaine est un cauchemar dans les grandes villes africaines. Embouteillages, manque de transports en commun, pollution croissante.",
    "L'éducation de qualité reste un privilège en Afrique. Les enseignants sont surchargés et les ressources pédagogiques insuffisantes.",
    "La gestion des déchets est un défi majeur dans les villes en croissance rapide. Moins de 40% des déchets sont collectés formellement.",
];

const SOLUTIONS = [
    "Notre plateforme utilise l'IA pour analyser les habitudes de dépense et offrir des microcrédits adaptés, sans paperasse ni garantie physique.",
    "Nous connectons les patients aux médecins via une app mobile légère, fonctionnant même en 2G, avec diagnostic assisté par intelligence artificielle.",
    "Notre marketplace met en relation directe les entreprises qui recrutent avec les talents vérifiés, grâce à un algorithme de matching intelligent.",
    "Notre solution IoT combine capteurs, données satellite et IA pour optimiser l'irrigation, prédire les rendements et réduire les pertes post-récolte.",
    "Nous proposons une plateforme de financement participatif avec due diligence automatisée et suivi en temps réel des investissements.",
    "Notre app combine covoiturage, moto-taxi à la demande et paiement mobile pour une mobilité urbaine fluide et abordable.",
    "Notre plateforme e-learning utilise l'IA pour adapter le contenu au niveau de chaque élève et offrir un suivi personnalisé aux enseignants.",
    "Notre système connecte les ménages, les collecteurs et les recycleurs via une app mobile avec traçabilité et récompenses pour le tri.",
];

const SKILLS = [
    'React', 'Node.js', 'Python', 'Flutter', 'React Native', 'TypeScript', 'Django', 'FastAPI',
    'PostgreSQL', 'MongoDB', 'Firebase', 'AWS', 'Docker', 'Kubernetes', 'Machine Learning',
    'Data Science', 'Blockchain', 'UX Design', 'Figma', 'Marketing Digital', 'SEO',
    'Growth Hacking', 'Finance', 'Comptabilité', 'Vente B2B', 'Négociation', 'Leadership',
    'Java', 'Go', 'Rust', 'Vue.js', 'Angular', 'Swift', 'Kotlin',
];

// ─── Helpers ────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(n, arr.length));
}
function slug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + crypto.randomBytes(2).toString('hex');
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
    const FOUNDER_ID = 'cmmp26hnd0023udo8vhwjdwbh'; // Max
    const TOTAL = 130;

    // Verify founder exists
    const founder = await prisma.user.findUnique({ where: { id: FOUNDER_ID }, select: { id: true, firstName: true } });
    if (!founder) {
        console.error('❌ Fondateur introuvable');
        process.exit(1);
    }
    console.log(`👤 Fondateur: ${founder.firstName} (${founder.id})`);

    // Count existing projects
    const existingCount = await prisma.project.count();
    console.log(`📦 Projets existants en DB: ${existingCount}`);

    // Validate all enum values match Prisma schema
    console.log('\n🔍 Validation des enums...');
    const testData = {
        name: 'Test Validation', pitch: 'Test', slug: slug('test-validation'),
        founderId: FOUNDER_ID, status: 'DRAFT',
        sector: 'FINTECH', stage: 'IDEA', scope: 'LOCAL',
        marketType: 'B2C', businessModel: 'SUBSCRIPTION',
        founderRole: 'CEO', timeAvailability: 'FULLTIME',
        lookingForRole: 'TECH', collabType: 'EQUITY',
    };
    try {
        const test = await prisma.project.create({ data: testData });
        await prisma.project.delete({ where: { id: test.id } });
        console.log('✅ Enums validés');
    } catch (err) {
        console.error('❌ Erreur enum:', err.message);
        process.exit(1);
    }

    // Create 130 projects
    console.log(`\n🚀 Création de ${TOTAL} projets...\n`);

    let success = 0;
    let fail = 0;
    const errors = [];
    const startTime = Date.now();

    // Batch insert for performance (10 at a time)
    const BATCH = 10;
    for (let b = 0; b < Math.ceil(TOTAL / BATCH); b++) {
        const start = b * BATCH;
        const end = Math.min(start + BATCH, TOTAL);
        const batch = [];

        for (let i = start; i < end; i++) {
            const country = pick(COUNTRIES);
            const city = pick(CITIES[country] || ['Ville']);
            const name = NAMES[i] || `Projet-${i + 1}`;

            batch.push({
                name,
                pitch: pick(PITCHES),
                slug: slug(name),
                founderId: FOUNDER_ID,
                status: 'PUBLISHED', // Direct publish for test
                country,
                city,
                location: `${city}, ${country}`,
                scope: pick(SCOPES),
                sector: pick(SECTORS),
                stage: pick(STAGES),
                problem: pick(PROBLEMS),
                target: `Entrepreneurs et PME de ${city}, ${country}`,
                solutionCurrent: "Pas de solution numérique existante adaptée au contexte local africain.",
                solutionDesc: pick(SOLUTIONS),
                uvp: `La seule plateforme combinant IA et expertise locale pour ${country}`,
                antiScope: "Nous ne ciblons pas les marchés non-africains dans cette première phase.",
                marketType: pick(MARKET_TYPES),
                businessModel: pick(BIZ_MODELS),
                competitors: "Quelques solutions internationales existent mais ne sont pas adaptées au contexte africain francophone.",
                founderRole: pick(FOUNDER_ROLES),
                timeAvailability: pick(TIME_AVAILS),
                traction: i % 3 === 0
                    ? `${100 + Math.floor(Math.random() * 900)} utilisateurs beta, ${10 + Math.floor(Math.random() * 30)}% de croissance mensuelle`
                    : "En phase de validation du concept avec des retours positifs",
                lookingForRole: pick(LOOKING_ROLES),
                collabType: pick(COLLAB_TYPES),
                vision: `Devenir le leader du ${pick(SECTORS).toLowerCase()} en Afrique francophone d'ici 3 ans avec une présence dans 5+ pays.`,
                requiredSkills: pickN(SKILLS, 3 + Math.floor(Math.random() * 4)),
            });
        }

        // Create batch
        for (const proj of batch) {
            try {
                await prisma.project.create({ data: proj });
                success++;
                if (success % 10 === 0 || success === TOTAL) {
                    process.stdout.write(`  ✅ ${success}/${TOTAL} créés\r`);
                }
            } catch (err) {
                fail++;
                errors.push({ name: proj.name, error: err.message.slice(0, 100) });
            }
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n');

    // ─── Rapport ────────────────────────────────────────────────────────

    console.log('═'.repeat(60));
    console.log('📊 RÉSULTAT FINAL');
    console.log('═'.repeat(60));
    console.log(`  ✅ Succès:  ${success}/${TOTAL}`);
    console.log(`  ❌ Échecs:  ${fail}/${TOTAL}`);
    console.log(`  ⏱️  Durée:   ${elapsed}s`);

    if (errors.length > 0) {
        console.log('\n  Erreurs:');
        errors.forEach(e => console.log(`    ❌ ${e.name}: ${e.error}`));
    }

    // Vérifications post-création
    console.log('\n📋 Vérifications post-création:');

    const totalProjects = await prisma.project.count();
    console.log(`  Total projets en DB: ${totalProjects}`);

    const byStatus = await prisma.project.groupBy({ by: ['status'], _count: { _all: true } });
    byStatus.forEach(s => console.log(`    ${s.status}: ${s._count._all}`));

    const bySector = await prisma.project.groupBy({ by: ['sector'], _count: { _all: true }, orderBy: { _count: { sector: 'desc' } } });
    console.log('\n  Par secteur:');
    bySector.forEach(s => console.log(`    ${s.sector || 'NULL'}: ${s._count._all}`));

    const byCountry = await prisma.project.groupBy({ by: ['country'], _count: { _all: true }, orderBy: { _count: { country: 'desc' } } });
    console.log('\n  Par pays:');
    byCountry.forEach(s => console.log(`    ${s.country || 'NULL'}: ${s._count._all}`));

    // Validate field completeness (sample 10 random projects)
    console.log('\n  Validation champs (10 projets aléatoires):');
    const sample = await prisma.project.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
            name: true, pitch: true, sector: true, stage: true, scope: true,
            country: true, city: true, location: true, problem: true, target: true,
            solutionDesc: true, uvp: true, marketType: true, businessModel: true,
            founderRole: true, timeAvailability: true, lookingForRole: true,
            collabType: true, vision: true, requiredSkills: true,
        },
    });

    const requiredFields = [
        'name', 'pitch', 'sector', 'stage', 'scope', 'country', 'city',
        'problem', 'target', 'solutionDesc', 'uvp', 'marketType', 'businessModel',
        'founderRole', 'timeAvailability', 'lookingForRole', 'collabType', 'vision',
    ];

    let allComplete = true;
    sample.forEach((proj, i) => {
        const missing = requiredFields.filter(f => !proj[f]);
        if (missing.length > 0) {
            console.log(`    ❌ ${proj.name}: manque [${missing.join(', ')}]`);
            allComplete = false;
        }
        if (!proj.requiredSkills || proj.requiredSkills.length === 0) {
            console.log(`    ⚠️  ${proj.name}: pas de skills`);
            allComplete = false;
        }
    });
    if (allComplete) {
        console.log('    ✅ Tous les champs remplis correctement');
    }

    // Check slugs are unique
    const slugs = await prisma.project.groupBy({
        by: ['slug'],
        _count: { _all: true },
        having: { slug: { _count: { gt: 1 } } },
    });
    if (slugs.length > 0) {
        console.log(`\n  ❌ ${slugs.length} slugs en doublon !`);
    } else {
        console.log('\n  ✅ Tous les slugs sont uniques');
    }

    await prisma.$disconnect();
    console.log('\n✅ Test terminé');
}

main().catch(err => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
});
