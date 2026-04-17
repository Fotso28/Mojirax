#!/usr/bin/env node
/**
 * i18n parity check — run in CI and before release.
 *
 * Verifies every locale (fr/en/es/pt/ar) exposes the exact same set of
 * flattened keys across every namespace JSON file in web/src/messages/.
 *
 * Exits 0 if aligned, 1 if any key is missing anywhere, and prints a
 * diff so the offending locale/namespace/key is obvious.
 */

const fs = require('fs');
const path = require('path');

const LOCALES = ['fr', 'en', 'es', 'pt', 'ar'];
const NAMESPACES = ['common', 'auth', 'dashboard', 'admin', 'project', 'landing'];
const MESSAGES_DIR = path.join(__dirname, '..', 'web', 'src', 'messages');

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function loadNamespace(locale, namespace) {
  const file = path.join(MESSAGES_DIR, locale, `${namespace}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return flatten(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch (err) {
    console.error(`✗ Invalid JSON: ${file}`);
    console.error(`  ${err.message}`);
    return null;
  }
}

let hasError = false;

for (const namespace of NAMESPACES) {
  const trees = {};
  let missingFile = false;
  for (const locale of LOCALES) {
    const tree = loadNamespace(locale, namespace);
    if (tree === null) {
      console.error(`✗ Missing or invalid: ${locale}/${namespace}.json`);
      hasError = true;
      missingFile = true;
    } else {
      trees[locale] = tree;
    }
  }
  if (missingFile) continue;

  const unionKeys = new Set();
  for (const tree of Object.values(trees)) {
    for (const k of Object.keys(tree)) unionKeys.add(k);
  }

  let namespaceOk = true;
  for (const locale of LOCALES) {
    const missing = [...unionKeys].filter(k => !(k in trees[locale]));
    if (missing.length) {
      namespaceOk = false;
      hasError = true;
      console.error(`✗ ${namespace}.json · ${locale}: ${missing.length} missing keys`);
      for (const k of missing.slice(0, 20)) console.error(`    - ${k}`);
      if (missing.length > 20) console.error(`    ... (+${missing.length - 20} more)`);
    }
  }
  if (namespaceOk) {
    console.log(`✓ ${namespace}.json · ${unionKeys.size} keys × ${LOCALES.length} locales`);
  }
}

process.exit(hasError ? 1 : 0);
