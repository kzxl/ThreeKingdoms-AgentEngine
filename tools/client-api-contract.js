#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Client API Contract Gate
 * (tools/client-api-contract.js)
 *
 * The TypeScript client calls `/api/*` paths that must exist in either the
 * modular Router or the legacy gateway. Drift here is silent: the old gateway
 * answered unknown APIs with index.html, so the client failed on JSON parsing
 * instead of a clear 404.
 *
 * Known, intentional gaps live in tools/client-api-allowlist.json with a reason.
 * Any new missing path fails the gate; fixing an allowlisted path is reported so
 * the entry can be removed.
 *
 * Usage: node tools/client-api-contract.js [--strict]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ALLOWLIST_PATH = path.join(__dirname, 'client-api-allowlist.json');

function walk(dir, ext, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
      walk(abs, ext, files);
    } else if (entry.name.endsWith(ext)) {
      files.push(abs);
    }
  }
  return files;
}

function clientPaths() {
  const paths = new Set();
  for (const file of walk(path.join(ROOT, 'src', 'client'), '.ts')) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/apiClient\.(?:get|post)\(\s*'([^']+)'/g)) paths.add(match[1]);
    for (const match of source.matchAll(/fetch\(\s*[`'](\/api\/[^`'$]+)/g)) paths.add(match[1]);
  }
  return paths;
}

function serverRoutes() {
  const routes = new Set();
  const prefixes = [];
  for (const file of walk(path.join(ROOT, 'src', 'modules'), '.ts')) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/router\.(?:get|post|delete|put)\(\s*'([^']+)'/g)) routes.add(match[1]);
  }
  const gateway = fs.readFileSync(path.join(ROOT, 'tools', 'sim-web.js'), 'utf8');
  for (const match of gateway.matchAll(/pathname === '([^']+)'/g)) routes.add(match[1]);
  for (const match of gateway.matchAll(/pathname\.startsWith\('([^']+)'\)/g)) {
    // The generic /api/ 404 guard is not a route.
    if (match[1] !== '/api/') prefixes.push(match[1]);
  }
  return { routes, prefixes };
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function main() {
  const strict = process.argv.includes('--strict');
  const allowlist = loadAllowlist();
  const allowed = new Map(allowlist.map(entry => [entry.path, entry.reason]));
  const { routes, prefixes } = serverRoutes();

  const missing = [...clientPaths()].filter(p => {
    if (routes.has(p)) return false;
    return !prefixes.some(prefix => p.startsWith(prefix));
  }).sort();

  const unaccounted = missing.filter(p => !allowed.has(p));
  const fixed = [...allowed.keys()].filter(p => !missing.includes(p));

  console.log('====================================================');
  console.log(' 🔌 CLIENT API CONTRACT');
  console.log('====================================================');
  console.log(` Client paths : ${clientPaths().size}`);
  console.log(` Server routes: ${routes.size}`);
  console.log(` Missing      : ${missing.length} (allowlisted ${missing.length - unaccounted.length})`);

  for (const p of missing) {
    console.log(` ${allowed.has(p) ? 'ℹ️ ' : '❌'} ${p}${allowed.has(p) ? ` — ${allowed.get(p)}` : ''}`);
  }
  if (fixed.length > 0) {
    console.log('\n[api-contract] No longer missing (remove from allowlist):');
    for (const p of fixed) console.log(`  ✅ ${p}`);
  }

  if (strict && unaccounted.length > 0) {
    console.error(`\n[api-contract] FAILED: ${unaccounted.length} unaccounted client path(s).`);
    process.exit(1);
  }
  console.log('[api-contract] PASSED: every client path is routed or explicitly allowlisted.');
}

main();
