// Test script for Task 04 - Unlock Service Verification
const http = require('http');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runTests() {
  let pass = 0, fail = 0;

  function check(name, condition) {
    if (condition) { console.log(`  ✅ ${name}`); pass++; }
    else { console.log(`  ❌ ${name}`); fail++; }
  }

  // TEST 1: GET /unlock/check/:targetId sans auth → 401
  console.log('\n=== TEST 1: /unlock/check sans auth → 401 ===');
  const t1 = await fetch('http://localhost:3001/unlock/check/some-id');
  check('401 Unauthorized', t1.status === 401);

  // TEST 2: GET /unlock/mine sans auth → 401
  console.log('\n=== TEST 2: /unlock/mine sans auth → 401 ===');
  const t2 = await fetch('http://localhost:3001/unlock/mine');
  check('401 Unauthorized', t2.status === 401);

  // TEST 3: Route /unlock/mine est bien enregistrée (pas 404)
  console.log('\n=== TEST 3: Route /unlock/mine existe (401, pas 404) ===');
  check('Route existe (401 et non 404)', t2.status === 401);

  // TEST 4: Privacy wall toujours fonctionnel après modifications
  console.log('\n=== TEST 4: Privacy wall intact (sans auth → masqué) ===');
  const t4 = await fetch('http://localhost:3001/projects/miracle-informatique-2yns');
  const f4 = t4.data.founder || {};
  check('_isLocked=true', f4._isLocked === true);
  check('email=null', f4.email === null);
  check('phone=null', f4.phone === null);

  // TEST 5: Vérifier les logs du serveur pour les routes enregistrées
  console.log('\n=== TEST 5: GET /users/:id/public → privacy intact ===');
  const t5 = await fetch('http://localhost:3001/users/cmmi0xzga000dudc4aq6tdsj3/public');
  check('_isLocked=true sur profil public', t5.data._isLocked === true);
  check('email masqué', t5.data.email === null);

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
