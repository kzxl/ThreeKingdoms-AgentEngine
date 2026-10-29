#!/usr/bin/env node

/**
 * Test Suite: Simulation Core Action Pipeline (test-core-actions.js)
 * Tests deterministic action resolution, condition checking, rollback, and idempotency.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { SimulationCore } = require('../engine/sim-core');
const { closeConnections } = require('../engine/db-adapter');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT_DIR, 'tests', 'sandbox');
const TEST_DB = path.join(TEST_DIR, 'test_actions.db');
const SCHEMA_FILE = path.join(ROOT_DIR, 'tools', 'schema.sql');

function setupTestDatabase() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  // Apply schema
  const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
  execSync(`sqlite3 "${TEST_DB}" < "${SCHEMA_FILE}"`);

  // Seed baseline player with 10,000 Qian and some raw materials
  const seedSql = `
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, current_date, active_turn)
    VALUES ('TEST-CAMP', 'Test Campaign', '184-02-01', '184-02-01', 1);

    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash)
    VALUES ('PLY-0001', 'Test Player', 21, 10000, 0);

    INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo)
    VALUES ('TXN-1840201-0000', '184-02-01', 'Initial', 'Capital', 10000, 0, 10000, 'Baseline float');

    INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis)
    VALUES
      ('COM-BAMBOO', 'Material', 'Cured Bamboo', 20, 15),
      ('COM-TWINE', 'Material', 'Hemp Twine', 10, 20),
      ('COM-SALT', 'Commodity', 'Refined Salt', 5, 50);
  `;
  const seedSqlFile = path.join(TEST_DIR, 'seed.sql');
  fs.writeFileSync(seedSqlFile, seedSql, 'utf8');
  execSync(`sqlite3 "${TEST_DB}" < "${seedSqlFile}"`);
}

function runSqlJson(sql) {
  const stdout = execSync(`sqlite3 -json "${TEST_DB}" "${sql}"`, { encoding: 'utf8' });
  return stdout && stdout.trim() ? JSON.parse(stdout) : [];
}

function testTradeBuySuccess() {
  console.log('[TEST 1] Testing TRADE_BUY with sufficient funds...');
  const core = new SimulationCore(TEST_DB);

  const res = core.executeAction({
    type: 'TRADE_BUY',
    item_code: 'COM-TIMBER',
    quantity: 10,
    unit_price: 40,
    counterparty: 'Lumber Merchant',
    game_date: '184-02-05',
    idempotency_key: 'BUY-TIMBER-01'
  });

  assert.strictEqual(res.success, true, 'Trade buy should succeed');
  assert.strictEqual(res.data.totalCost, 400, 'Total cost should be 400');
  assert.strictEqual(res.data.newCashBalance, 9600, 'New balance should be 9600');

  // Verify in SQLite
  const player = runSqlJson(`SELECT liquid_cash FROM player_state;`)[0];
  assert.strictEqual(player.liquid_cash, 9600, 'Player cash in DB must be 9600');

  const timber = runSqlJson(`SELECT quantity, unit_cost_basis FROM inventory_items WHERE item_code = 'COM-TIMBER';`)[0];
  assert.strictEqual(timber.quantity, 10, 'Timber quantity must be 10');
  assert.strictEqual(timber.unit_cost_basis, 40, 'Timber cost basis must be 40');

  // Verify Double-Entry Journal
  const journal = runSqlJson(`SELECT * FROM account_journal WHERE txn_id = '${res.data.txnId}';`);
  assert.strictEqual(journal.length, 2, 'Should create 2 journal lines');
  const dr = journal.find(j => j.account_code === '1201_INVENTORY');
  const cr = journal.find(j => j.account_code === '1001_CASH_MOBILE');
  assert.strictEqual(dr.debit, 400, 'Inventory debit must equal 400');
  assert.strictEqual(cr.credit, 400, 'Cash credit must equal 400');

  console.log('  ✅ PASSED: Buy trade succeeded with balanced double-entry accounting.');
}

function testTradeBuyInsufficientFunds() {
  console.log('[TEST 2] Testing TRADE_BUY rejection on insufficient funds...');
  const core = new SimulationCore(TEST_DB);

  // Try to buy 1,000 horses @ 5,000 Qian each (5,000,000 Qian vs 9,600 available)
  const res = core.executeAction({
    type: 'TRADE_BUY',
    item_code: 'COM-HORSE-W',
    quantity: 1000,
    unit_price: 5000,
    counterparty: 'Horse Trader',
    game_date: '184-02-06'
  });

  assert.strictEqual(res.success, false, 'Trade buy must fail');
  assert.strictEqual(res.code, 'INSUFFICIENT_FUNDS', 'Error code must be INSUFFICIENT_FUNDS');

  // Verify that cash was NOT altered
  const player = runSqlJson(`SELECT liquid_cash FROM player_state;`)[0];
  assert.strictEqual(player.liquid_cash, 9600, 'Player cash must remain intact at 9600');

  console.log('  ✅ PASSED: Insufficient funds rejected cleanly with zero state mutation.');
}

function testTradeSellSuccess() {
  console.log('[TEST 3] Testing TRADE_SELL with available stock...');
  const core = new SimulationCore(TEST_DB);

  // Sell 3 units of salt @ 80 Qian (cost basis was 50)
  const res = core.executeAction({
    type: 'TRADE_SELL',
    item_code: 'COM-SALT',
    quantity: 3,
    unit_price: 80,
    counterparty: 'Town Merchant',
    game_date: '184-02-08',
    idempotency_key: 'SELL-SALT-01'
  });

  assert.strictEqual(res.success, true, 'Trade sell should succeed');
  assert.strictEqual(res.data.totalRevenue, 240, 'Revenue should be 240');
  assert.strictEqual(res.data.newCashBalance, 9840, 'New balance should be 9840');
  assert.strictEqual(res.data.newQuantity, 2, 'Remaining salt should be 2');

  const player = runSqlJson(`SELECT liquid_cash FROM player_state;`)[0];
  assert.strictEqual(player.liquid_cash, 9840, 'Player cash must be 9840');

  const salt = runSqlJson(`SELECT quantity FROM inventory_items WHERE item_code = 'COM-SALT';`)[0];
  assert.strictEqual(salt.quantity, 2, 'Salt stock must be 2');

  console.log('  ✅ PASSED: Sell trade succeeded and updated cash & inventory atomically.');
}

function testTradeSellInsufficientStock() {
  console.log('[TEST 4] Testing TRADE_SELL rejection on insufficient stock...');
  const core = new SimulationCore(TEST_DB);

  // Try to sell 50 units of salt (only 2 left)
  const res = core.executeAction({
    type: 'TRADE_SELL',
    item_code: 'COM-SALT',
    quantity: 50,
    unit_price: 80,
    counterparty: 'Town Merchant',
    game_date: '184-02-09'
  });

  assert.strictEqual(res.success, false, 'Trade sell must fail');
  assert.strictEqual(res.code, 'INSUFFICIENT_STOCK', 'Error code must be INSUFFICIENT_STOCK');

  const player = runSqlJson(`SELECT liquid_cash FROM player_state;`)[0];
  assert.strictEqual(player.liquid_cash, 9840, 'Cash must not change on failed sell');

  console.log('  ✅ PASSED: Insufficient stock rejected cleanly.');
}

function testProductionBatchWithBOM() {
  console.log('[TEST 5] Testing PRODUCTION_BATCH with Bill of Materials and defect rate...');
  const core = new SimulationCore(TEST_DB);

  // Produce 10 Woven Mats (PROD-MAT)
  // BOM per unit: 0.25 COM-BAMBOO, 0.10 COM-TWINE
  // For 10 units: 2.5 Bamboo, 1.0 Twine
  // In stock: 20 Bamboo, 10 Twine -> Sufficient!
  const res = core.executeAction({
    type: 'PRODUCTION_BATCH',
    product_code: 'PROD-MAT',
    batch_size: 10,
    craftsmanship: 60,
    fatigue: 0,
    game_date: '184-02-10',
    idempotency_key: 'PROD-MAT-BATCH-01'
  });

  assert.strictEqual(res.success, true, 'Production batch should succeed');
  assert.ok(res.data.usableUnits > 0, 'Usable units should be greater than 0');

  // Verify materials deducted
  const bamboo = runSqlJson(`SELECT quantity FROM inventory_items WHERE item_code = 'COM-BAMBOO';`)[0];
  assert.strictEqual(bamboo.quantity, 17.5, 'Bamboo should be 20 - 2.5 = 17.5');

  const twine = runSqlJson(`SELECT quantity FROM inventory_items WHERE item_code = 'COM-TWINE';`)[0];
  assert.strictEqual(twine.quantity, 9.0, 'Twine should be 10 - 1.0 = 9.0');

  // Verify finished goods added
  const mats = runSqlJson(`SELECT quantity FROM inventory_items WHERE item_code = 'PROD-MAT';`)[0];
  assert.strictEqual(mats.quantity, res.data.usableUnits, 'Finished mats should match usable units');

  console.log(`  ✅ PASSED: Produced ${res.data.usableUnits} mats (Defect: ${res.data.defectRate}), materials deducted per BOM.`);
}

function testIdempotencyPreventsDuplicateExecution() {
  console.log('[TEST 6] Testing Idempotency: replaying same action does NOT duplicate cash deduction...');
  const core = new SimulationCore(TEST_DB);

  const initialPlayer = runSqlJson(`SELECT liquid_cash FROM player_state;`)[0];
  const initialCash = initialPlayer.liquid_cash;

  // Execute buy action with idempotency key
  const action = {
    type: 'TRADE_BUY',
    item_code: 'COM-TWINE',
    quantity: 2,
    unit_price: 20, // 40 Qian
    counterparty: 'Twine Guild',
    game_date: '184-02-12',
    idempotency_key: 'IDEMPOTENT-BUY-01'
  };

  const firstCall = core.executeAction(action);
  assert.strictEqual(firstCall.success, true, 'First execution should succeed');
  const cashAfterFirst = runSqlJson(`SELECT liquid_cash FROM player_state;`)[0].liquid_cash;
  assert.strictEqual(cashAfterFirst, initialCash - 40, 'Cash should be deducted by 40');

  // Retry the EXACT same action with the same idempotency_key
  const secondCall = core.executeAction(action);
  assert.strictEqual(secondCall.success, true, 'Second execution should return success');
  assert.strictEqual(secondCall.idempotent, true, 'Second execution must be flagged as idempotent');

  // Cash in DB MUST NOT be deducted a second time!
  const cashAfterSecond = runSqlJson(`SELECT liquid_cash FROM player_state;`)[0].liquid_cash;
  assert.strictEqual(cashAfterSecond, cashAfterFirst, 'Cash MUST NOT be deducted twice upon retry!');

  console.log('  ✅ PASSED: Idempotency strictly blocked duplicate state modification.');
}

function main() {
  console.log('====================================================');
  console.log(' 🧪 RUNNING SIMULATION CORE ACTION TEST SUITE');
  console.log('====================================================\n');

  setupTestDatabase();
  try {
    testTradeBuySuccess();
    testTradeBuyInsufficientFunds();
    testTradeSellSuccess();
    testTradeSellInsufficientStock();
    testProductionBatchWithBOM();
    testIdempotencyPreventsDuplicateExecution();

    console.log('\n====================================================');
    console.log(' 🟢 ALL CORE ACTION TESTS PASSED (6/6)');
    console.log('====================================================\n');
  } finally {
    // Cached SQLite connections must be released before the sandbox is deleted (Windows file locks).
    closeConnections();
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  }
}

main();
