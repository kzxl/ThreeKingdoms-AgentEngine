#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Feature Performance & Logic Probe (tools/perf-probe.js)
 *
 * Measures the two things a refactor can silently break:
 *   1. Latency — p50/p95 of read-only endpoints against a fixed database fixture.
 *   2. Logic   — a stable SHA-256 fingerprint of each normalised JSON body.
 *
 * Both record and compare run against the same captured fixture
 * (tests/perf/fixture.db), so a fingerprint mismatch means behaviour changed,
 * not campaign data. Works for any single feature by passing --endpoints.
 *
 * Usage:
 *   node tools/perf-probe.js --record
 *   node tools/perf-probe.js --compare
 *   node tools/perf-probe.js --compare --report-only
 *   node tools/perf-probe.js --record --endpoints=/api/enterprise/status,/api/inventory
 *   node tools/perf-probe.js --record --iterations=15 --tolerance=0.25
 */

const crypto = require('crypto');
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

const PERF_DIR = path.join(ROOT, 'tests', 'perf');
const RUN_DIR = path.join(PERF_DIR, '.run');
const FIXTURE_DB = path.join(PERF_DIR, 'fixture.db');
const BASELINE_PATH = path.join(PERF_DIR, 'baseline.json');
const PORT = parseInt(process.env.PERF_PORT || '3397', 10);

const DEFAULT_ENDPOINTS = [
  '/api/status',
  '/api/inventory',
  '/api/ledger',
  '/api/npcs',
  '/api/military',
  '/api/garrisons',
  '/api/market',
  '/api/enterprise/status',
  '/api/lineage/overview',
  '/api/master/catalog',
  '/api/audit'
];

const VOLATILE_KEY = /^(generatedAt|serverTime|uptime|pid|timestamp|created_at|updated_at|createdAt|updatedAt)$/i;

function parseArgs(argv) {
  const opts = {
    record: false,
    compare: false,
    reportOnly: false,
    endpoints: DEFAULT_ENDPOINTS,
    iterations: 12,
    warmup: 3,
    // Sub-10 ms endpoints jitter by milliseconds on a loaded desktop; the gate
    // targets real regressions, not timer noise.
    tolerance: 0.5,
    floorMs: 8
  };
  for (const arg of argv) {
    if (arg === '--record') opts.record = true;
    else if (arg === '--compare') opts.compare = true;
    else if (arg === '--report-only') opts.reportOnly = true;
    else if (arg.startsWith('--endpoints=')) {
      opts.endpoints = arg.slice('--endpoints='.length).split(',').map(s => s.trim()).filter(Boolean);
    } else if (arg.startsWith('--iterations=')) opts.iterations = Math.max(1, parseInt(arg.split('=')[1], 10) || 8);
    else if (arg.startsWith('--warmup=')) opts.warmup = Math.max(0, parseInt(arg.split('=')[1], 10) || 0);
    else if (arg.startsWith('--tolerance=')) opts.tolerance = parseFloat(arg.split('=')[1]) || 0.3;
    else if (arg.startsWith('--floor-ms=')) opts.floorMs = parseFloat(arg.split('=')[1]) || 0;
  }
  if (!opts.record && !opts.compare) opts.compare = true;
  return opts;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (VOLATILE_KEY.test(key)) continue;
      out[key] = stableValue(value[key]);
    }
    return out;
  }
  return value;
}

function fingerprint(body) {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(body))).digest('hex').slice(0, 16);
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[index];
}

function summarise(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, v) => sum + v, 0) / samples.length;
  return {
    p50: Number(percentile(sorted, 0.5).toFixed(2)),
    p95: Number(percentile(sorted, 0.95).toFixed(2)),
    mean: Number(mean.toFixed(2))
  };
}

async function measure(endpoints, iterations, warmup) {
  const results = {};
  for (const endpoint of endpoints) {
    for (let i = 0; i < warmup; i++) await httpJson(PORT, endpoint);
    const samples = [];
    let last = null;
    for (let i = 0; i < iterations; i++) {
      const started = process.hrtime.bigint();
      last = await httpJson(PORT, endpoint);
      samples.push(Number(process.hrtime.bigint() - started) / 1e6);
    }
    results[endpoint] = {
      status: last.status,
      ...summarise(samples),
      fingerprint: fingerprint(last.body)
    };
  }
  return results;
}

function sourceDb(forCompare) {
  if (forCompare && fs.existsSync(FIXTURE_DB)) return FIXTURE_DB;
  return process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
}

async function runProbe({ source, iterations, warmup, endpoints }) {
  const sandboxDb = prepareSandbox(RUN_DIR, source);
  const { child, logText } = bootServer({ port: PORT, dbPath: sandboxDb });

  try {
    await waitForReady(PORT);
    return await measure(endpoints, iterations, warmup);
  } catch (err) {
    console.error(`[perf] Probe failed: ${err.message}`);
    console.error(logText().split(/\r?\n/).slice(-25).join('\n'));
    process.exitCode = 2;
    return null;
  } finally {
    stopServer(child);
    removeDir(RUN_DIR);
  }
}

function printTable(rows) {
  console.log(' endpoint                        p95 before   p95 after    delta   logic');
  console.log(' ------------------------------  ----------   ---------   ------   -----');
  for (const row of rows) {
    const before = row.before ? `${row.before.p95.toFixed(1)}ms`.padStart(10) : '         —';
    const after = `${row.after.p95.toFixed(1)}ms`.padStart(11);
    const delta = row.deltaPct === null ? '     —' : `${(row.deltaPct * 100).toFixed(0)}%`.padStart(6);
    const logic = row.logic === 'same' ? 'ok' : row.logic === 'drift' ? 'DRIFT' : 'n/a';
    console.log(` ${row.endpoint.padEnd(30)}  ${before}   ${after}   ${delta}   ${logic}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  fs.mkdirSync(PERF_DIR, { recursive: true });

  if (opts.record) {
    const source = sourceDb(false);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, FIXTURE_DB);
      for (const suffix of ['-wal', '-shm']) {
        if (fs.existsSync(`${source}${suffix}`)) fs.copyFileSync(`${source}${suffix}`, `${FIXTURE_DB}${suffix}`);
        else fs.rmSync(`${FIXTURE_DB}${suffix}`, { force: true });
      }
    }
    const results = await runProbe({
      source: FIXTURE_DB,
      iterations: opts.iterations,
      warmup: opts.warmup,
      endpoints: opts.endpoints
    });
    if (!results) process.exit(2);

    fs.writeFileSync(
      BASELINE_PATH,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          iterations: opts.iterations,
          endpoints: results
        },
        null,
        2
      )}\n`
    );
    console.log(`[perf] Recorded ${Object.keys(results).length} endpoints (${opts.iterations} iterations) → tests/perf/baseline.json`);
    console.log(`[perf] Fixture captured at tests/perf/fixture.db (gitignored, required for --compare logic checks)`);
    return;
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    console.error('[perf] No baseline found. Run `node tools/perf-probe.js --record` first.');
    process.exit(2);
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  const endpoints = opts.endpoints.length > 0 ? opts.endpoints : Object.keys(baseline.endpoints);
  const hasFixture = fs.existsSync(FIXTURE_DB);

  const current = await runProbe({
    source: sourceDb(true),
    iterations: opts.iterations,
    warmup: opts.warmup,
    endpoints
  });
  if (!current) process.exit(2);

  const rows = [];
  const regressions = [];
  const drifts = [];

  for (const endpoint of endpoints) {
    const before = baseline.endpoints[endpoint];
    const after = current[endpoint];
    if (!before || !after) continue;

    const deltaPct = before.p95 > 0 ? (after.p95 - before.p95) / before.p95 : null;
    const logic = hasFixture && before.fingerprint ? (before.fingerprint === after.fingerprint ? 'same' : 'drift') : 'n/a';

    rows.push({ endpoint, before, after, deltaPct, logic });

    if (logic === 'drift') drifts.push(endpoint);
    const regressed =
      deltaPct !== null &&
      deltaPct > opts.tolerance &&
      after.p95 - before.p95 > opts.floorMs;
    if (regressed) regressions.push({ endpoint, before, after, deltaPct });
  }

  console.log('');
  printTable(rows);
  console.log('');

  if (!hasFixture) {
    console.warn('[perf] Fixture missing — logic fingerprints are not comparable. Re-record to restore the guard.');
  }

  if (drifts.length > 0) {
    console.error(`[perf] LOGIC DRIFT on ${drifts.length} endpoint(s): ${drifts.join(', ')}`);
    console.error('[perf] The response body changed for an unchanged database. Inspect before accepting.');
  }
  if (regressions.length > 0) {
    console.error(`[perf] LATENCY REGRESSION (>${(opts.tolerance * 100).toFixed(0)}% and >${opts.floorMs}ms on p95):`);
    for (const r of regressions) {
      console.error(`   ${r.endpoint}: ${r.before.p95}ms → ${r.after.p95}ms`);
    }
  }

  if (opts.reportOnly) {
    console.log('[perf] Report-only mode: no failure raised.');
    return;
  }
  if (drifts.length > 0 || regressions.length > 0) process.exit(1);

  console.log(`[perf] PASSED: ${rows.length} endpoints, latency within tolerance, logic unchanged.`);
}

main();
