#!/usr/bin/env node

/**
 * Test Suite: Autonomous Invariant Auditor (test-audit.js)
 * Tests positive reconciliation, negative defect detection, and SQLite constraint enforcement.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT_DIR, 'tests', 'sandbox');
const TEST_DB = path.join(TEST_DIR, 'test_session.db');
const TEST_PROGRESS = path.join(ROOT_DIR, 'game', 'PROGRESS.md');
const AUDIT_SCRIPT = path.join(ROOT_DIR, 'tools', 'sim-audit.js');

function setupSandbox() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

function runAuditWithEnv(customEnv = {}) {
  try {
    const output = execSync(`node "${AUDIT_SCRIPT}"`, {
      encoding: 'utf8',
      env: { ...process.env, ...customEnv },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { exitCode: 0, output };
  } catch (err) {
    return { exitCode: err.status || 1, output: (err.stdout || '') + (err.stderr || '') };
  }
}

function testCleanProductionDatabase() {
  console.log('[TEST 1] Testing production database audit...');
  const res = runAuditWithEnv();
  assert.strictEqual(res.exitCode, 0, `Expected audit to pass on clean DB, but got exit code ${res.exitCode}\nOutput: ${res.output}`);
  assert.ok(res.output.includes('AUDIT VERDICT: PASSED'), 'Output should contain PASSED verdict');
  console.log('  ✅ PASSED: Clean database verified with 0 discrepancies.');
}

function testMissingProgressFails() {
  console.log('[TEST 2] Testing missing PROGRESS.md detection (No false green!)...');
  const tempBackup = path.join(ROOT_DIR, 'game', 'PROGRESS.md.bak');
  if (fs.existsSync(TEST_PROGRESS)) {
    fs.renameSync(TEST_PROGRESS, tempBackup);
  }

  try {
    const res = runAuditWithEnv();
    assert.notStrictEqual(res.exitCode, 0, 'Audit must fail when PROGRESS.md is missing');
    assert.ok(res.output.includes('PROGRESS.md is missing'), 'Output must explicitly state PROGRESS.md is missing');
    console.log('  ✅ PASSED: Missing PROGRESS.md correctly caused audit failure.');
  } finally {
    if (fs.existsSync(tempBackup)) {
      fs.renameSync(tempBackup, TEST_PROGRESS);
    }
  }
}

function testCorruptedCashFails() {
  console.log('[TEST 3] Testing corrupted cash balance detection...');
  const liveDb = path.join(ROOT_DIR, 'saves', 'session.db');
  fs.copyFileSync(liveDb, TEST_DB);

  // Inject a 500 Qian mathematical discrepancy in sandbox DB
  execSync(`sqlite3 "${TEST_DB}" "UPDATE cashflow_ledger SET balance = balance + 500 WHERE txn_id = 'TXN-01840424-0013';"`);

  const res = runAuditWithEnv({ SIM_DB_PATH: TEST_DB });
  assert.notStrictEqual(res.exitCode, 0, 'Audit must fail on corrupted cashflow balance');
  assert.ok(res.output.includes('Cashflow mismatch') || res.output.includes('diff=500'), 'Output should pinpoint cash mismatch');
  console.log('  ✅ PASSED: Auditor successfully detected mathematical cash corruption.');
}

function testStockMovementMismatchFails() {
  console.log('[TEST 4] Testing stock movement vs inventory discrepancy detection...');
  const liveDb = path.join(ROOT_DIR, 'saves', 'session.db');
  fs.copyFileSync(liveDb, TEST_DB);

  // Alter balance_after in movement history so it contradicts current quantity
  execSync(`sqlite3 "${TEST_DB}" "UPDATE stock_movements SET balance_after = 999 WHERE mov_id = 'MOV-01840502-0048';"`);

  const res = runAuditWithEnv({ SIM_DB_PATH: TEST_DB });
  assert.notStrictEqual(res.exitCode, 0, 'Audit must fail when stock movements contradict inventory');
  assert.ok(res.output.includes('Inventory balance_after in last movement'), 'Output should report stock movement mismatch');
  console.log('  ✅ PASSED: Auditor successfully detected stock movement discrepancy.');
}

function testDbConstraintRejectsNegativeInventory() {
  console.log('[TEST 5] Testing SQLite constraint rejection for negative inventory...');
  const liveDb = path.join(ROOT_DIR, 'saves', 'session.db');
  fs.copyFileSync(liveDb, TEST_DB);

  let caughtError = false;
  try {
    execSync(`sqlite3 "${TEST_DB}" "UPDATE inventory_items SET quantity = -10 WHERE item_code = 'COM-GRAIN';"`, { stdio: 'pipe' });
  } catch (err) {
    caughtError = true;
    assert.ok(err.stderr.toString().includes('CHECK constraint failed'), 'Error should be a CHECK constraint failure');
  }

  assert.ok(caughtError, 'SQLite must prevent setting negative inventory at the database level');
  console.log('  ✅ PASSED: SQLite CHECK constraint actively blocks negative inventory.');
}

function main() {
  console.log('====================================================');
  console.log(' 🧪 RUNNING AUDITOR VALIDATION TEST SUITE');
  console.log('====================================================\n');

  setupSandbox();
  try {
    testCleanProductionDatabase();
    testMissingProgressFails();
    testCorruptedCashFails();
    testStockMovementMismatchFails();
    testDbConstraintRejectsNegativeInventory();

    console.log('\n====================================================');
    console.log(' 🟢 ALL AUDITOR TESTS PASSED (5/5)');
    console.log('====================================================\n');
  } finally {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  }
}

main();
