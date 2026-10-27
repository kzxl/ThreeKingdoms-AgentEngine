#!/usr/bin/env node

/**
 * Test Suite: Deterministic Reproducibility & Seed Replay (test-reproducibility.js)
 * Verifies that identical seeds and identical action streams yield bit-for-bit identical results.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { SeededRandom } = require('../engine/random');
const { resolveSkillCheck } = require('../engine/rules');
const { SimulationCore } = require('../engine/sim-core');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT_DIR, 'tests', 'sandbox');
const DB_A = path.join(TEST_DIR, 'db_a.db');
const DB_B = path.join(TEST_DIR, 'db_b.db');
const SCHEMA_FILE = path.join(ROOT_DIR, 'tools', 'schema.sql');

function setupSandbox() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

function initDb(dbPath) {
  execSync(`sqlite3 "${dbPath}" < "${SCHEMA_FILE}"`);
  const seedSql = `
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, current_date, active_turn, random_seed)
    VALUES ('REPLAY-TEST', 'Replay Campaign', '184-02-01', '184-02-01', 0, 1840201);

    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash)
    VALUES ('PLY-0001', 'Test Player', 21, 10000, 0);

    INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo)
    VALUES ('TXN-0000', '184-02-01', 'Seed', 'Capital', 10000, 0, 10000, 'Baseline float');

    INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis)
    VALUES
      ('COM-BAMBOO', 'Material', 'Bamboo', 50, 15),
      ('COM-TWINE', 'Material', 'Twine', 30, 20);
  `;
  const seedSqlFile = path.join(TEST_DIR, `seed_${path.basename(dbPath)}.sql`);
  fs.writeFileSync(seedSqlFile, seedSql, 'utf8');
  execSync(`sqlite3 "${dbPath}" < "${seedSqlFile}"`);
}

function testSeededRandomDeterminism() {
  console.log('[TEST 1] Testing Seeded PRNG Determinism over 100 rolls...');
  const seed = 1840201;

  const rng1 = new SeededRandom(seed);
  const stream1 = [];
  for (let i = 0; i < 100; i++) {
    stream1.push(rng1.d20());
  }

  const rng2 = new SeededRandom(seed);
  const stream2 = [];
  for (let i = 0; i < 100; i++) {
    stream2.push(rng2.d20());
  }

  assert.deepStrictEqual(stream1, stream2, 'Seeded PRNG must produce bit-for-bit identical stream for same seed');
  console.log('  ✅ PASSED: 100 random rolls were 100% identical between runs.');
}

function testSkillCheckReplayConsistency() {
  console.log('[TEST 2] Testing Skill Check Determinism with fixed seeds...');
  const seed = 999999;
  const rng1 = new SeededRandom(seed);
  const rng2 = new SeededRandom(seed);

  const outcomes1 = [];
  const outcomes2 = [];

  for (let i = 0; i < 10; i++) {
    const roll1 = rng1.d20();
    const check1 = resolveSkillCheck(76, 50, 5, roll1);
    outcomes1.push({ roll: roll1, score: check1.totalScore, pass: check1.isSuccess(60) });

    const roll2 = rng2.d20();
    const check2 = resolveSkillCheck(76, 50, 5, roll2);
    outcomes2.push({ roll: roll2, score: check2.totalScore, pass: check2.isSuccess(60) });
  }

  assert.deepStrictEqual(outcomes1, outcomes2, 'Skill check outcomes must match exactly given identical seed');
  console.log('  ✅ PASSED: Skill check scores and DC outcomes matched 100% across separate runs.');
}

function testActionStreamReplayAcrossDatabases() {
  console.log('[TEST 3] Testing Multi-Action Replay across separate databases (DB_A vs DB_B)...');
  initDb(DB_A);
  initDb(DB_B);

  const actionSequence = [
    {
      type: 'TRADE_BUY',
      item_code: 'COM-BAMBOO',
      quantity: 10,
      unit_price: 15,
      counterparty: 'Forest Supplier',
      game_date: '184-02-05',
      idempotency_key: 'ACTION-01'
    },
    {
      type: 'PRODUCTION_BATCH',
      product_code: 'PROD-MAT',
      batch_size: 20,
      craftsmanship: 65,
      fatigue: 0,
      game_date: '184-02-10',
      idempotency_key: 'ACTION-02'
    },
    {
      type: 'TRADE_SELL',
      item_code: 'PROD-MAT',
      quantity: 15,
      unit_price: 25,
      counterparty: 'Village Elder',
      game_date: '184-02-15',
      idempotency_key: 'ACTION-03'
    }
  ];

  // Execute sequence on DB_A
  const coreA = new SimulationCore(DB_A);
  for (const act of actionSequence) {
    const resA = coreA.executeAction(act);
    assert.strictEqual(resA.success, true, 'Action on DB_A must succeed');
  }

  // Execute sequence on DB_B
  const coreB = new SimulationCore(DB_B);
  for (const act of actionSequence) {
    const resB = coreB.executeAction(act);
    assert.strictEqual(resB.success, true, 'Action on DB_B must succeed');
  }

  // Compare final states
  const stateA = execSync(`sqlite3 -json "${DB_A}" "SELECT liquid_cash FROM player_state;"`, { encoding: 'utf8' });
  const stateB = execSync(`sqlite3 -json "${DB_B}" "SELECT liquid_cash FROM player_state;"`, { encoding: 'utf8' });
  assert.strictEqual(stateA, stateB, 'Final liquid cash must be identical across replays');

  const invA = execSync(`sqlite3 -json "${DB_A}" "SELECT item_code, quantity FROM inventory_items ORDER BY item_code;"`, { encoding: 'utf8' });
  const invB = execSync(`sqlite3 -json "${DB_B}" "SELECT item_code, quantity FROM inventory_items ORDER BY item_code;"`, { encoding: 'utf8' });
  assert.strictEqual(invA, invB, 'Final inventory quantities must be identical across replays');

  const journalA = execSync(`sqlite3 -json "${DB_A}" "SELECT account_code, debit, credit FROM account_journal ORDER BY entry_id;"`, { encoding: 'utf8' });
  const journalB = execSync(`sqlite3 -json "${DB_B}" "SELECT account_code, debit, credit FROM account_journal ORDER BY entry_id;"`, { encoding: 'utf8' });
  assert.strictEqual(journalA, journalB, 'Full double-entry journal entries must match bit-for-bit');

  console.log('  ✅ PASSED: Replay across independent databases yielded 100% identical states and double-entry journals.');
}

function main() {
  console.log('====================================================');
  console.log(' 🧪 RUNNING DETERMINISTIC REPRODUCIBILITY TEST SUITE');
  console.log('====================================================\n');

  setupSandbox();
  try {
    testSeededRandomDeterminism();
    testSkillCheckReplayConsistency();
    testActionStreamReplayAcrossDatabases();

    console.log('\n====================================================');
    console.log(' 🟢 ALL REPRODUCIBILITY TESTS PASSED (3/3)');
    console.log('====================================================\n');
  } finally {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  }
}

main();
