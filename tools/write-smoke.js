#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Write-Path Smoke Gate (tools/write-smoke.js)
 *
 * The read-only golden/perf probes cannot catch a broken write endpoint, and the
 * feature suites call services directly instead of the HTTP controllers. This
 * gate closes that hole: it boots the real composition root on an isolated
 * database copy, exercises the core write paths over HTTP, and asserts that the
 * ledger still reconciles afterwards.
 *
 * Covered: commodity buy/sell, loan borrow/repay, simulation-core action dispatch
 * (including idempotent replay and input rejection), and the post-write audit.
 *
 * Usage:
 *   node tools/write-smoke.js
 *   node tools/write-smoke.js --verbose
 */

const { execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
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

const PORT = parseInt(process.env.SMOKE_PORT || '3395', 10);
const RUN_DIR = path.join(ROOT, 'tests', '.smoke');
const PROJECTION_FILES = [
  'game/PROGRESS.md',
  'game/ledger/audit.md',
  'game/ledger/cashflow.md',
  'game/ledger/contracts.md',
  'game/ledger/inventory.md'
];

function post(urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {});
    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        path: urlPath,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        timeout: 30000
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = { raw: raw.slice(0, 300) };
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error(`timeout ${urlPath}`)));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
    if (snapshot.has(rel)) fs.writeFileSync(abs, snapshot.get(rel));
    else if (fs.existsSync(abs)) fs.rmSync(abs, { force: true });
  }
}

function itemQuantity(inventoryBody, itemCode) {
  const items = inventoryBody?.items || [];
  const row = items.find(item => item.item_code === itemCode);
  return row ? Number(row.quantity) : 0;
}

async function main() {
  const verbose = process.argv.includes('--verbose');
  const projections = snapshotProjections();
  const sandboxDb = prepareSandbox(RUN_DIR);
  const { child, logText } = bootServer({ port: PORT, dbPath: sandboxDb });
  const results = [];

  const step = async (name, fn) => {
    try {
      const detail = await fn();
      results.push({ name, status: 'PASS', detail });
      console.log(` ✅ ${name}${verbose && detail ? ` — ${detail}` : ''}`);
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
      console.log(` ❌ ${name} — ${err.message}`);
    }
  };

  try {
    await waitForReady(PORT);

    // Use the campaign's own clock so ledger rows stay chronologically ordered.
    const status = await httpJson(PORT, '/api/status');
    const meta = status.body?.meta || {};
    const gameDate = meta.current_date || meta.currentDate || '184-11-01';

    const invBefore = await httpJson(PORT, '/api/inventory');
    const bambooBefore = itemQuantity(invBefore.body, 'COM-BAMBOO');
    const basketBefore = itemQuantity(invBefore.body, 'PROD-BASK');

    await step('trade BUY commodity', async () => {
      const res = await post('/api/trade', { action: 'BUY', itemCode: 'COM-BAMBOO', quantity: 5 });
      assert(res.status === 200, `HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 160)}`);
      assert(res.body.success === true, `success=false: ${res.body.error}`);
      assert(res.body.totalAmount === 75, `expected totalAmount 75, got ${res.body.totalAmount}`);
      assert(String(res.body.txnId).startsWith('TXN-'), `bad txnId ${res.body.txnId}`);

      const invAfter = await httpJson(PORT, '/api/inventory');
      const delta = itemQuantity(invAfter.body, 'COM-BAMBOO') - bambooBefore;
      assert(delta === 5, `inventory delta expected +5, got ${delta}`);
      return `txn ${res.body.txnId}`;
    });

    await step('trade SELL commodity', async () => {
      const res = await post('/api/trade', { action: 'SELL', itemCode: 'PROD-BASK', quantity: 2 });
      assert(res.status === 200, `HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 160)}`);
      assert(res.body.success === true, `success=false: ${res.body.error}`);

      const invAfter = await httpJson(PORT, '/api/inventory');
      const delta = itemQuantity(invAfter.body, 'PROD-BASK') - basketBefore;
      assert(delta === -2, `inventory delta expected -2, got ${delta}`);
      return `credited ${res.body.totalAmount}`;
    });

    await step('loan BORROW then REPAY', async () => {
      const borrow = await post('/api/economy/loans', { action: 'BORROW', amount: 500, lenderName: 'Smoke Test Creditor' });
      assert(borrow.status === 200 && borrow.body.success === true, `borrow failed: ${JSON.stringify(borrow.body).slice(0, 160)}`);
      assert(!!borrow.body.loanId, 'borrow did not return a loanId');

      const repay = await post('/api/economy/loans', {
        action: 'REPAY',
        loanId: borrow.body.loanId,
        amount: borrow.body.outstandingBalance
      });
      assert(repay.status === 200 && repay.body.success === true, `repay failed: ${JSON.stringify(repay.body).slice(0, 160)}`);
      assert(repay.body.newStatus === 'REPAID', `expected REPAID, got ${repay.body.newStatus}`);
      return `${borrow.body.loanId} closed`;
    });

    await step('equip conserves inventory', async () => {
      const before = itemQuantity((await httpJson(PORT, '/api/inventory')).body, 'COM-SWORD');
      const res = await post('/api/equipment/equip', { slotType: 'WEAPON', itemCode: 'COM-SWORD' });
      assert(res.status === 200 && res.body.success === true, `equip failed: ${JSON.stringify(res.body).slice(0, 160)}`);

      const after = itemQuantity((await httpJson(PORT, '/api/inventory')).body, 'COM-SWORD');
      assert(after === before - 1, `equip inventory delta expected -1, got ${after - before}`);

      const audit = await httpJson(PORT, '/api/audit');
      assert(
        audit.body.discrepanciesCount === 0,
        `audit after equip: ${(audit.body.errors || []).join(' | ')}`
      );
      return `warehouse ${before} → ${after}`;
    });

    await step('unequip restores inventory', async () => {
      const before = itemQuantity((await httpJson(PORT, '/api/inventory')).body, 'COM-SWORD');
      const res = await post('/api/equipment/unequip', { slotType: 'WEAPON', itemCode: 'COM-SWORD' });
      assert(res.status === 200 && res.body.success === true, `unequip failed: ${JSON.stringify(res.body).slice(0, 160)}`);

      const after = itemQuantity((await httpJson(PORT, '/api/inventory')).body, 'COM-SWORD');
      assert(after === before + 1, `unequip inventory delta expected +1, got ${after - before}`);

      const audit = await httpJson(PORT, '/api/audit');
      assert(
        audit.body.discrepanciesCount === 0,
        `audit after unequip: ${(audit.body.errors || []).join(' | ')}`
      );
      return `warehouse ${before} → ${after}`;
    });

    await step('action TRADE_BUY + idempotent replay', async () => {
      const action = {
        type: 'TRADE_BUY',
        item_code: 'COM-BAMBOO',
        quantity: 3,
        unit_price: 15,
        counterparty: 'Smoke Test Supplier',
        game_date: gameDate,
        idempotency_key: 'smoke-trade-buy-1'
      };
      const first = await post('/api/action', action);
      assert(first.body.success === true, `first call failed: ${first.body.error}`);
      const replay = await post('/api/action', action);
      assert(replay.body.success === true && replay.body.idempotent === true, 'replay was not idempotent');
      assert(
        replay.body.data.newBalance === first.body.data.newBalance,
        'replay changed the cash balance'
      );
      return first.body.data.txnId;
    });

    await step('action rejects injected input', async () => {
      const res = await post('/api/action', {
        type: 'TRADE_BUY',
        item_code: 'COM-BAMBOO',
        quantity: '5; DROP TABLE player_state;--',
        unit_price: 15,
        idempotency_key: 'smoke-injection-1'
      });
      assert(res.body.success === false, 'injection payload was accepted');
      assert(res.body.code === 'INVALID_PARAMS', `expected INVALID_PARAMS, got ${res.body.code}`);
      return 'rejected';
    });

    await step('ledger reconciles after writes', async () => {
      execSync(`node "${path.join(ROOT, 'tools', 'sim-db.js')}" export-progress`, {
        env: { ...process.env, SIM_DB_PATH: sandboxDb },
        stdio: 'pipe'
      });
      const audit = await httpJson(PORT, '/api/audit');
      assert(audit.body.success === true, `audit failed: ${(audit.body.errors || []).join(' | ')}`);
      assert(audit.body.discrepanciesCount === 0, `discrepancies: ${(audit.body.errors || []).join(' | ')}`);
      return `${audit.body.totalInvariantsVerified} invariants`;
    });
  } catch (err) {
    results.push({ name: 'bootstrap', status: 'FAIL', error: err.message });
    console.log(` ❌ bootstrap — ${err.message}`);
    console.log(logText().split(/\r?\n/).slice(-20).join('\n'));
  } finally {
    stopServer(child);
    removeDir(RUN_DIR);
    restoreProjections(projections);
  }

  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log('');
  console.log(`[smoke] ${results.length - failed}/${results.length} write paths passed`);
  if (failed > 0) process.exit(1);
}

main();
