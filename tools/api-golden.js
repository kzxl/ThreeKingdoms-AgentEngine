#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: API Golden-Master Contract Guard (tools/api-golden.js)
 *
 * Boots the real composition root (src/server/main.ts) against an isolated copy
 * of the session database, calls every read-only endpoint, and records the
 * response *shape* (status code, key paths, value types) into
 * tests/golden/api-shape.json.
 *
 * Shapes are deliberately used instead of raw values so the contract stays
 * comparable as campaign data evolves, while still catching what refactors
 * actually break: removed handlers, renamed fields, changed status codes and
 * changed response nesting.
 *
 * Usage:
 *   node tools/api-golden.js --record     # capture the current contract
 *   node tools/api-golden.js              # verify against the recorded contract
 *   node tools/api-golden.js --verbose
 */

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  prepareSandbox,
  bootServer,
  httpJson,
  waitForReady,
  stopServer,
  removeDir
} = require('./lib/server-harness');

const GOLDEN_PATH = path.join(ROOT, 'tests', 'golden', 'api-shape.json');
const RUNS_DIR = path.join(ROOT, 'tests', '.golden-run');
const PORT = parseInt(process.env.GOLDEN_PORT || '3399', 10);

const ENDPOINTS = [
  '/api/status',
  '/api/instances',
  '/api/game/summary',
  '/api/inventory',
  '/api/ledger',
  '/api/npcs',
  '/api/factions',
  '/api/factions/officers',
  '/api/factions/settlements',
  '/api/market',
  '/api/economy/regional-prices',
  '/api/economy/arbitrage',
  '/api/military',
  '/api/garrisons',
  '/api/military/routes',
  '/api/equipment',
  '/api/professions/nodes',
  '/api/professions/character',
  '/api/enterprise/status',
  '/api/ecology/crises',
  '/api/logistics/caravans',
  '/api/logistics/strongholds',
  '/api/lineage/overview',
  '/api/progression/status',
  '/api/location/current',
  '/api/strategy/modules',
  '/api/master/catalog',
  '/api/audit'
];

function shapeOf(value, depth = 0) {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'array', items: 'empty' };
    return { type: 'array', items: mergeShapes(value.slice(0, 5).map(v => shapeOf(v, depth + 1))) };
  }
  if (typeof value === 'object') {
    if (depth > 6) return 'object';
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = shapeOf(value[key], depth + 1);
    return out;
  }
  return typeof value;
}

function mergeShapes(shapes) {
  const primitives = new Set();
  const objects = [];
  let arrays = null;

  for (const shape of shapes) {
    if (typeof shape === 'string') primitives.add(shape);
    else if (shape && shape.type === 'array') {
      arrays = arrays || [];
      if (shape.items && shape.items !== 'empty') arrays.push(shape.items);
    } else if (shape && typeof shape === 'object') objects.push(shape);
  }

  if (objects.length > 0 && primitives.size === 0) {
    const merged = {};
    const allKeys = new Set(objects.flatMap(o => Object.keys(o)));
    for (const key of [...allKeys].sort()) {
      const values = objects.filter(o => key in o).map(o => o[key]);
      merged[key] = values.length === 1 ? values[0] : mergeShapes(values);
    }
    return merged;
  }
  if (arrays) return { type: 'array', items: arrays.length ? mergeShapes(arrays) : 'empty' };
  if (primitives.size === 1) return [...primitives][0];
  return 'mixed';
}

function diffShapes(expected, actual, trail, issues, strict) {
  const pathLabel = trail || '<root>';
  if (typeof expected === 'string') {
    if (typeof actual === 'string') {
      if (expected !== actual && expected !== 'mixed' && actual !== 'mixed') {
        issues.push(`${pathLabel}: type changed ${expected} → ${actual}`);
      }
      return;
    }
    if (expected === 'null' && actual === null) return;
    issues.push(`${pathLabel}: type changed ${expected} → ${JSON.stringify(actual).slice(0, 60)}`);
    return;
  }

  if (expected === null) return;
  if (actual === null || typeof actual !== 'object') {
    issues.push(`${pathLabel}: expected object, got ${JSON.stringify(actual).slice(0, 60)}`);
    return;
  }

  if (expected.type === 'array') {
    if (actual.type !== 'array') {
      issues.push(`${pathLabel}: expected array, got ${actual.type}`);
      return;
    }
    if (expected.items && expected.items !== 'empty' && actual.items) {
      diffShapes(expected.items, actual.items, `${pathLabel}[]`, issues, strict);
    }
    return;
  }

  for (const key of Object.keys(expected)) {
    if (!(key in actual)) {
      issues.push(`${pathLabel}.${key}: missing field`);
      continue;
    }
    diffShapes(expected[key], actual[key], `${pathLabel}.${key}`, issues, strict);
  }

  if (strict) {
    for (const key of Object.keys(actual)) {
      if (!(key in expected)) issues.push(`${pathLabel}.${key}: unexpected new field (strict mode)`);
    }
  }
}

/**
 * Value-level assertions for endpoints whose contract includes a behavioural
 * guarantee, not just a shape. Shape comparison alone would not notice the
 * modular engine silently falling back to inactive.
 */
const VALUE_ASSERTIONS = {
  '/api/strategy/modules': body => body && body.modularEngineActive === true,
  '/api/audit': body => body && body.discrepanciesCount === 0
};

async function collect() {
  const results = {};
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await httpJson(PORT, endpoint);
      const assertion = VALUE_ASSERTIONS[endpoint];
      results[endpoint] = {
        status: res.status,
        shape: shapeOf(res.body),
        valueOk: assertion ? assertion(res.body) : undefined
      };
    } catch (err) {
      results[endpoint] = { status: 0, error: err.message };
    }
  }
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const record = args.includes('--record');
  const verbose = args.includes('--verbose');
  const strict = args.includes('--strict');

  const sandboxDb = prepareSandbox(RUNS_DIR);
  console.log(`[golden] Booting composition root on :${PORT} against ${path.relative(ROOT, sandboxDb)}`);

  const { child, logText } = bootServer({ port: PORT, dbPath: sandboxDb });

  let results;
  try {
    await waitForReady(PORT);
    results = await collect();
  } catch (err) {
    console.error(`[golden] Boot/collect failed: ${err.message}`);
    console.error(logText().split(/\r?\n/).slice(-25).join('\n'));
    stopServer(child);
    process.exit(2);
  }

  stopServer(child);
  removeDir(RUNS_DIR);

  if (record) {
    fs.mkdirSync(path.dirname(GOLDEN_PATH), { recursive: true });
    fs.writeFileSync(
      GOLDEN_PATH,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), endpoints: results }, null, 2)}\n`
    );
    console.log(`[golden] Recorded ${Object.keys(results).length} endpoint shapes → ${path.relative(ROOT, GOLDEN_PATH)}`);
    const behaviourFailures = Object.entries(results).filter(([, r]) => r.valueOk === false);
    if (behaviourFailures.length > 0) {
      console.error(`[golden] Behaviour assertions failed at record time: ${behaviourFailures.map(([e]) => e).join(', ')}`);
      process.exit(1);
    }
    return;
  }

  if (!fs.existsSync(GOLDEN_PATH)) {
    console.error('[golden] No recorded contract found. Run with --record first.');
    process.exit(2);
  }

  const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8')).endpoints;
  let failures = 0;

  for (const endpoint of Object.keys(golden)) {
    const expected = golden[endpoint];
    const actual = results[endpoint];
    const issues = [];

    if (!actual) {
      issues.push('endpoint not probed');
    } else if (expected.status !== actual.status) {
      issues.push(`status changed ${expected.status} → ${actual.status}`);
    } else if (expected.error || actual.error) {
      if (expected.error !== actual.error) issues.push(`error changed: ${expected.error} → ${actual.error}`);
    } else {
      diffShapes(expected.shape, actual.shape, '', issues, strict);
      if (expected.valueOk !== undefined && expected.valueOk !== actual.valueOk) {
        issues.push(`behaviour changed: ${endpoint} assertion ${expected.valueOk} → ${actual.valueOk}`);
      }
    }

    if (issues.length > 0) {
      failures++;
      console.log(` ❌ ${endpoint}`);
      for (const issue of issues.slice(0, verbose ? issues.length : 8)) console.log(`      ${issue}`);
      if (!verbose && issues.length > 8) console.log(`      … ${issues.length - 8} more`);
    } else if (verbose) {
      console.log(` ✅ ${endpoint}`);
    }
  }

  console.log('');
  if (failures > 0) {
    console.error(`[golden] FAILED: ${failures}/${Object.keys(golden).length} endpoint contracts changed.`);
    process.exit(1);
  }
  console.log(`[golden] PASSED: ${Object.keys(golden).length} endpoint contracts intact.`);
}

main();
