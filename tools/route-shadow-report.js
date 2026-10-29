#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Route Shadow Report (tools/route-shadow-report.js)
 *
 * `tools/sim-web.js` dispatches the modular Router before its own if-chain, so a
 * handler that exists in both layers is dead code. This report lists those
 * shadows (and, with --strict, fails when any exist) so the gateway can be
 * slimmed safely.
 *
 * Usage:
 *   node tools/route-shadow-report.js
 *   node tools/route-shadow-report.js --strict
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GATEWAY = path.join(ROOT, 'tools', 'sim-web.js');
const MODULES_DIR = path.join(ROOT, 'src', 'modules');

function collectRouterRoutes(dir, found = new Set()) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectRouterRoutes(abs, found);
    } else if (entry.name.endsWith('.ts')) {
      const source = fs.readFileSync(abs, 'utf8');
      for (const match of source.matchAll(/router\.(get|post|delete|put)\(\s*'([^']+)'/g)) {
        found.add(`${match[1].toUpperCase()} ${match[2]}`);
      }
    }
  }
  return found;
}

function collectLegacyRoutes() {
  const lines = fs.readFileSync(GATEWAY, 'utf8').split('\n');
  const routes = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/req\.method === '(\w+)' && pathname === '([^']+)'/);
    if (match) routes.push({ method: match[1], route: match[2], line: i + 1 });
  }
  return routes;
}

function main() {
  const strict = process.argv.includes('--strict');
  const routerRoutes = collectRouterRoutes(MODULES_DIR);
  const legacyRoutes = collectLegacyRoutes();

  const shadowed = legacyRoutes.filter(r => routerRoutes.has(`${r.method} ${r.route}`));
  const live = legacyRoutes.filter(r => !routerRoutes.has(`${r.method} ${r.route}`));

  console.log('====================================================');
  console.log(' 🔀 ROUTE SHADOW REPORT');
  console.log('====================================================');
  console.log(` Legacy handlers : ${legacyRoutes.length}`);
  console.log(` Router handlers : ${routerRoutes.size}`);
  console.log(` Shadowed (dead) : ${shadowed.length}`);
  console.log(` Live legacy     : ${live.length}`);

  if (shadowed.length > 0) {
    console.log('\nShadowed handlers (safe to delete):');
    for (const r of shadowed) console.log(`  ${r.method} ${r.route}  (sim-web.js:${r.line})`);
  }

  if (strict && shadowed.length > 0) {
    console.error('\n[route-shadow] FAILED: remove the shadowed handlers above.');
    process.exit(1);
  }
  console.log('\n[route-shadow] OK');
}

main();
