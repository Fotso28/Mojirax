// Test script for Task 03 - Privacy Wall Backend Interceptor
const fs = require('fs');
const http = require('http');

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  let pass = 0, fail = 0;

  // TEST 1: GET /projects/:slug sans auth → contact masqué
  console.log('\n=== TEST 1: GET /projects/:slug sans auth ===');
  const t1 = await fetch('http://localhost:3001/projects/miracle-informatique-2yns');
  const f1 = t1.data.founder || {};
  const fp1 = f1.founderProfile || {};

  if (f1._isLocked === true && f1.email === null && f1.phone === null
      && fp1.linkedinUrl === null && fp1.websiteUrl === null) {
    console.log('  ✅ PASS - Contact masqué, _isLocked=true');
    pass++;
  } else {
    console.log('  ❌ FAIL');
    console.log('  _isLocked:', f1._isLocked, 'email:', f1.email, 'phone:', f1.phone);
    fail++;
  }

  // TEST 2: Les champs non-sensibles restent visibles
  console.log('\n=== TEST 2: Champs non-sensibles visibles ===');
  if (f1.id && f1.name !== undefined) {
    console.log('  ✅ PASS - id et name présents');
    pass++;
  } else {
    console.log('  ❌ FAIL - champs manquants');
    fail++;
  }

  // TEST 3: GET /unlock/check sans auth → 401
  console.log('\n=== TEST 3: GET /unlock/check sans auth → 401 ===');
  const t3 = await fetch('http://localhost:3001/unlock/check/some-id');
  if (t3.status === 401) {
    console.log('  ✅ PASS - 401 Unauthorized');
    pass++;
  } else {
    console.log('  ❌ FAIL - HTTP', t3.status);
    fail++;
  }

  // TEST 4: Feed /projects ne leak pas email/phone
  console.log('\n=== TEST 4: Feed /projects - pas de leak ===');
  const t4 = await fetch('http://localhost:3001/projects?limit=1');
  const feedFounder = t4.data[0]?.founder || {};
  const feedKeys = Object.keys(feedFounder);
  if (!feedKeys.includes('email') && !feedKeys.includes('phone')) {
    console.log('  ✅ PASS - Pas de leak (fields:', feedKeys.join(', ') + ')');
    pass++;
  } else {
    console.log('  ❌ FAIL - email ou phone dans le feed');
    fail++;
  }

  // TEST 5: GET /users/:id/public sans auth → masqué
  console.log('\n=== TEST 5: GET /users/:id/public sans auth ===');
  const t5 = await fetch('http://localhost:3001/users/cmmi0xzga000dudc4aq6tdsj3/public');
  if (t5.data._isLocked === true && t5.data.email === null && t5.data.phone === null) {
    console.log('  ✅ PASS - Profil public masqué');
    pass++;
  } else if (t5.data.statusCode) {
    console.log('  ⚠️  Endpoint retourne erreur', t5.data.statusCode, t5.data.message);
    fail++;
  } else {
    console.log('  ❌ FAIL - _isLocked:', t5.data._isLocked, 'email:', t5.data.email);
    fail++;
  }

  // TEST 6: Autre projet sans auth → aussi masqué
  console.log('\n=== TEST 6: Autre projet (ecopay) sans auth ===');
  const t6 = await fetch('http://localhost:3001/projects/ecopay-5cru');
  const f6 = t6.data.founder || {};
  if (f6._isLocked === true && f6.email === null) {
    console.log('  ✅ PASS - Contact masqué');
    pass++;
  } else {
    console.log('  ❌ FAIL');
    fail++;
  }

  // TEST 7: Vérifier que le projet retourne bien des données (pas juste null partout)
  console.log('\n=== TEST 7: Données projet accessibles (non-sensibles) ===');
  if (t1.data.id && t1.data.name && t1.data.description && t1.data.sector) {
    console.log('  ✅ PASS - Données projet présentes (name, description, sector)');
    pass++;
  } else {
    console.log('  ❌ FAIL - Données projet manquantes');
    fail++;
  }

  // RÉSUMÉ
  console.log('\n========================================');
  console.log(`  Résultat: ${pass}/${pass + fail} tests passés`);
  if (fail === 0) {
    console.log('  🎉 Tous les tests passent!');
  } else {
    console.log(`  ⚠️  ${fail} test(s) échoué(s)`);
  }
  console.log('========================================\n');
}

runTests().catch(console.error);
