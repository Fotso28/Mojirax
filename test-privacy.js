const http = require('http');

const BASE = 'http://localhost:3001';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyBkjSGpL8r8XOdSmOOPyR2a8I8G-jxvHsE';

let passed = 0;
let failed = 0;

function assert(label, condition) {
    if (condition) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.log(`  ❌ ${label}`);
        failed++;
    }
}

function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const opts = {
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + parsed.search,
            method: options.method || 'GET',
            headers: options.headers || {},
        };

        const req = http.request(opts, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function getFirebaseToken(email, password) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            email,
            password,
            returnSecureToken: true,
        });

        const opts = {
            hostname: 'identitytoolkit.googleapis.com',
            path: `/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        };

        const req = require('https').request(opts, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                const parsed = JSON.parse(body);
                if (parsed.idToken) {
                    resolve(parsed.idToken);
                } else {
                    reject(new Error('Firebase login failed: ' + body));
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function run() {
    const PROJECT_SLUG = 'medilink-sante-afrique';
    const FOUNDER_ID = 'cmmi0xzfg0009udc41mxxed3o';

    console.log('\n=== TEST 1: GET /projects/:slug SANS AUTH ===');
    const res1 = await fetch(`${BASE}/projects/${PROJECT_SLUG}`);
    assert('Status 200', res1.status === 200);
    assert('founder exists', !!res1.data.founder);
    assert('founder.email is null (masked)', res1.data.founder.email === null);
    assert('founder.phone is null (masked)', res1.data.founder.phone === null);
    assert('founder._isLocked is true', res1.data.founder._isLocked === true);
    const fp1 = res1.data.founder.founderProfile || {};
    assert('founderProfile.linkedinUrl is null', fp1.linkedinUrl === null || fp1.linkedinUrl === undefined);
    assert('founderProfile.websiteUrl is null', fp1.websiteUrl === null || fp1.websiteUrl === undefined);

    console.log('\n=== TEST 2: GET /projects/:slug AVEC AUTH (propriétaire) ===');
    let founderToken;
    try {
        founderToken = await getFirebaseToken('lux.kmer1@gmail.com', 'Test123456');
    } catch (e) {
        console.log('  ⚠️ Could not get founder token:', e.message);
        founderToken = null;
    }

    if (founderToken) {
        const res2 = await fetch(`${BASE}/projects/${PROJECT_SLUG}`, {
            headers: { Authorization: `Bearer ${founderToken}` },
        });
        assert('Status 200', res2.status === 200);
        assert('founder._isLocked is false (owner)', res2.data.founder._isLocked === false);
        // Owner should see their own email
        assert('founder.email is visible (owner)', res2.data.founder.email !== null);
    }

    console.log('\n=== TEST 3: GET /projects/:slug AVEC AUTH (non-propriétaire, pas d\'unlock) ===');
    let otherToken;
    try {
        otherToken = await getFirebaseToken('toto@gmail.com', 'Test123456');
    } catch (e) {
        console.log('  ⚠️ Could not get other user token:', e.message);
        otherToken = null;
    }

    if (otherToken) {
        const res3 = await fetch(`${BASE}/projects/${PROJECT_SLUG}`, {
            headers: { Authorization: `Bearer ${otherToken}` },
        });
        assert('Status 200', res3.status === 200);
        assert('founder._isLocked is true', res3.data.founder._isLocked === true);
        assert('founder.email is null (masked)', res3.data.founder.email === null);
        assert('founder.phone is null (masked)', res3.data.founder.phone === null);
    }

    console.log('\n=== TEST 4: GET /users/:id/public SANS AUTH ===');
    const res4 = await fetch(`${BASE}/users/${FOUNDER_ID}/public`);
    assert('Status 200', res4.status === 200);
    assert('email is null (masked)', res4.data.email === null);
    assert('phone is null (masked)', res4.data.phone === null);
    assert('_isLocked is true', res4.data._isLocked === true);

    console.log('\n=== TEST 5: GET /users/:id/public AVEC AUTH (propriétaire) ===');
    if (founderToken) {
        const res5 = await fetch(`${BASE}/users/${FOUNDER_ID}/public`, {
            headers: { Authorization: `Bearer ${founderToken}` },
        });
        assert('Status 200', res5.status === 200);
        assert('_isLocked is false (owner)', res5.data._isLocked === false);
        assert('email is visible (owner)', res5.data.email !== null);
    }

    console.log('\n=== TEST 6: GET /unlock/check/:targetId SANS AUTH ===');
    const res6 = await fetch(`${BASE}/unlock/check/${FOUNDER_ID}`);
    assert('Status 401 (guard required)', res6.status === 401);

    console.log('\n=== TEST 7: GET /unlock/check/:targetId AVEC AUTH ===');
    if (otherToken) {
        const res7 = await fetch(`${BASE}/unlock/check/${FOUNDER_ID}`, {
            headers: { Authorization: `Bearer ${otherToken}` },
        });
        assert('Status 200', res7.status === 200);
        assert('unlocked is false (no unlock)', res7.data.unlocked === false);
    }

    console.log(`\n=============================`);
    console.log(`TOTAL: ${passed} passed, ${failed} failed`);
    console.log(`=============================\n`);

    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
});
