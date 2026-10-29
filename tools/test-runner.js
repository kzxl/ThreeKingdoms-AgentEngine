#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Unified Verification Runner (tools/test-runner.js)
 *
 * Executes every verification suite through a single entry point:
 *   - Legacy CommonJS suites (tests/test-*.js) already self-sandbox.
 *   - Modern TypeScript suites (tests/verify-*.ts) are run one at a time against
 *     an isolated copy of the live session database, selected via SIM_DB_PATH.
 *
 * Generated Markdown projections (game/PROGRESS.md, game/ledger/*.md) are
 * snapshotted and restored afterwards so a verification run never desyncs the
 * live campaign from its SQLite source of truth.
 *
 * Usage:
 *   node tools/test-runner.js                 # all suites
 *   node tools/test-runner.js --legacy        # legacy CommonJS suites only
 *   node tools/test-runner.js --modern        # TypeScript verify suites only
 *   node tools/test-runner.js --only=duel     # substring filter
 *   node tools/test-runner.js --keep          # keep sandbox databases
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TESTS_DIR = path.join(ROOT, 'tests');
const RUNS_DIR = path.join(TESTS_DIR, '.runs');
const LIVE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TSX_CLI = require.resolve('tsx/cli');
const SUITE_TIMEOUT_MS = 300000;

const LEGACY_SUITES = [
  'test-audit.js',
  'test-core-actions.js',
  'test-reproducibility.js',
  'test-npc-ai.js'
];

const PROJECTION_FILES = [
  'game/PROGRESS.md',
  'game/ledger/audit.md',
  'game/ledger/cashflow.md',
  'game/ledger/contracts.md',
  'game/ledger/inventory.md'
];

function parseArgs(argv) {
  const opts = { legacy: false, modern: false, only: '', keep: false };
  for (const arg of argv) {
    if (arg === '--legacy') opts.legacy = true;
    else if (arg === '--modern') opts.modern = true;
    else if (arg === '--keep') opts.keep = true;
    else if (arg.startsWith('--only=')) opts.only = arg.slice('--only='.length);
  }
  if (!opts.legacy && !opts.modern) {
    opts.legacy = true;
    opts.modern = true;
  }
  return opts;
}

function discoverModernSuites() {
  if (!fs.existsSync(TESTS_DIR)) return [];
  return fs
    .readdirSync(TESTS_DIR)
    .filter(name => /^verify-.*\.ts$/.test(name))
    .sort();
}

function snapshotProjections() {
  const snapshot = new Map();
  for (const rel of PROJECTION_FILES) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) snapshot.set(rel, fs.readFileSync(abs));
  }
  return snapshot;
}

function restoreProjections(snapshot) {
  for (const rel of PROJECTION_FILES) {
    const abs = path.join(ROOT, rel);
    if (snapshot.has(rel)) {
      fs.writeFileSync(abs, snapshot.get(rel));
    } else if (fs.existsSync(abs)) {
      fs.rmSync(abs, { force: true });
    }
  }
}

function prepareSandbox(suiteName) {
  const sandboxName = suiteName.replace(/\.ts$/, '');
  const sandboxDir = path.join(RUNS_DIR, sandboxName);
  fs.rmSync(sandboxDir, { recursive: true, force: true });
  fs.mkdirSync(sandboxDir, { recursive: true });

  const destDb = path.join(sandboxDir, 'session.db');
  if (!fs.existsSync(LIVE_DB)) return destDb;

  fs.copyFileSync(LIVE_DB, destDb);
  for (const suffix of ['-wal', '-shm']) {
    const src = `${LIVE_DB}${suffix}`;
    if (fs.existsSync(src)) fs.copyFileSync(src, `${destDb}${suffix}`);
  }
  return destDb;
}

function runSuite(label, command, args, env) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: 'pipe',
    encoding: 'utf8',
    timeout: SUITE_TIMEOUT_MS
  });
  const durationMs = Date.now() - startedAt;
  const output = `${result.stdout || ''}${result.stderr || ''}`;

  let status = 'PASS';
  if (result.error && result.error.code === 'ETIMEDOUT') status = 'TIMEOUT';
  else if (result.status !== 0) status = 'FAIL';

  return { label, status, durationMs, output, exitCode: result.status };
}

function tailOutput(output, maxLines = 40) {
  const lines = output.trimEnd().split(/\r?\n/);
  return lines.slice(Math.max(0, lines.length - maxLines)).join('\n');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const projections = snapshotProjections();
  const results = [];

  const modernSuites = discoverModernSuites().filter(name =>
    opts.only ? name.includes(opts.only) : true
  );
  const legacySuites = LEGACY_SUITES.filter(name =>
    opts.only ? name.includes(opts.only) : true
  );

  console.log('====================================================');
  console.log(' 🧪 THREE KINGDOMS ENGINE — UNIFIED VERIFICATION RUNNER');
  console.log('====================================================');
  if (opts.legacy) console.log(` Legacy suites : ${legacySuites.length}`);
  if (opts.modern) console.log(` Modern suites : ${modernSuites.length}`);
  if (fs.existsSync(LIVE_DB)) console.log(` Live DB       : ${path.relative(ROOT, LIVE_DB)}`);
  console.log('');

  try {
    if (opts.legacy) {
      for (const suite of legacySuites) {
        process.stdout.write(`>>> [legacy] ${suite} ... `);
        const res = runSuite(suite, process.execPath, [path.join(TESTS_DIR, suite)], {});
        results.push(res);
        console.log(`${res.status} (${(res.durationMs / 1000).toFixed(1)}s)`);
        if (res.status !== 'PASS') console.log(tailOutput(res.output));
      }
    }

    if (opts.modern) {
      for (const suite of modernSuites) {
        const sandboxDb = prepareSandbox(suite);
        process.stdout.write(`>>> [modern] ${suite} ... `);
        const res = runSuite(suite, process.execPath, [TSX_CLI, path.join(TESTS_DIR, suite)], {
          SIM_DB_PATH: sandboxDb
        });
        results.push(res);
        console.log(`${res.status} (${(res.durationMs / 1000).toFixed(1)}s)`);
        if (res.status !== 'PASS') console.log(tailOutput(res.output));
      }
    }
  } finally {
    restoreProjections(projections);
  }

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.length - passed;

  console.log('');
  console.log('----------------------------------------------------');
  console.log(` RESULT: ${passed}/${results.length} suites passed, ${failed} failed`);
  console.log('----------------------------------------------------');
  for (const res of results) {
    const mark = res.status === 'PASS' ? '✅' : '❌';
    console.log(` ${mark} ${res.status.padEnd(7)} ${(res.durationMs / 1000).toFixed(1).padStart(6)}s  ${res.label}`);
  }

  if (!opts.keep && !opts.only) {
    try {
      fs.rmSync(RUNS_DIR, { recursive: true, force: true });
    } catch (err) {
      console.warn(`[runner] Could not clean sandbox dir: ${err.message}`);
    }
  }

  if (failed > 0) process.exit(1);
}

main();
