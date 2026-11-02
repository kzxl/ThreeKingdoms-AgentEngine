/**
 * Repeatable contract board: rotating offers, accept, deliver, expiry penalty.
 *
 * The board is the first infinitely repeatable content loop: three offers per
 * month per settlement, a delivery that consumes real stock and pays through
 * the ledger, and an expired contract that becomes a penalty obligation.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const migration044 = require('../tools/migrations/044-obligations');
const migration045 = require('../tools/migrations/045-contract-board');
const { processMonthClose, close: closeBridge } = require('../engine/contract-board-bridge');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-contracts-'));
const TEST_DB = path.join(TMP, 'session.db');
const SETTLEMENT = 'zhuo_xian';

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  migration044.up(db);
  migration045.up(db);
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', defeat_reason = NULL, distress_months = 0,
        "current_date" = '185-06-01', active_turn = 16
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state
    SET liquid_cash = 10000, safe_cash = 0, strategic_grain = 50, credibility = 80,
        current_location = ?
    WHERE player_id = 'PLY-0001';
  `).run(SETTLEMENT);
  db.prepare("DELETE FROM contract_offers WHERE settlement_id = ?;").run(SETTLEMENT);
  db.prepare("DELETE FROM player_contracts WHERE player_id = 'PLY-0001';").run();
  db.prepare("DELETE FROM obligations WHERE obligation_type = 'CONTRACT_PENALTY';").run();
  db.close();
}

function setStock(db: Database.Database, itemCode: string, quantity: number): void {
  db.prepare(`
    INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
    VALUES (?, 'FOOD_STUFF', 'Contract test stock', ?, 10, 'Warehouse')
    ON CONFLICT(item_code) DO UPDATE SET quantity = ?;
  `).run(itemCode, quantity, quantity);
}

function run(): void {
  console.log('=== Contract board ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ContractBoardService } = require('../src/modules/economy/contract-board.service');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  const service = ContractBoardService.forDatabase(db);

  // 1. Three deterministic offers per settlement per month, no duplicates.
  const first = service.list('PLY-0001', SETTLEMENT, '185-06-01');
  assert.strictEqual(first.offers.length, 3, 'three offers must be posted');
  const ids = first.offers.map((offer: any) => offer.offerId).sort();
  const again = service.list('PLY-0001', SETTLEMENT, '185-06-01');
  assert.deepStrictEqual(again.offers.map((offer: any) => offer.offerId).sort(), ids, 'offers must be idempotent');
  assert(first.offers.every((offer: any) => offer.rewardCash > 0 && offer.quantity > 0));

  // 2. Accept the first offer and deliver the goods.
  const offer = first.offers[0];
  const raw = new Database(TEST_DB);
  setStock(raw, offer.itemCode, offer.quantity + 10);
  raw.close();
  const accepted = service.accept(offer.offerId, 'PLY-0001', '185-06-01');
  assert.strictEqual(accepted.status, 'ACTIVE');
  assert(accepted.dueDate > '185-06-01', 'due date must be in the future');

  const cashBefore = Number(db.queryOne('SELECT liquid_cash FROM player_state WHERE player_id = \'PLY-0001\';')?.liquid_cash);
  const delivered = service.deliver(accepted.contractId, 'PLY-0001', '185-06-05');
  assert.strictEqual(delivered.status, 'DELIVERED');
  const cashAfter = Number(db.queryOne('SELECT liquid_cash FROM player_state WHERE player_id = \'PLY-0001\';')?.liquid_cash);
  assert.strictEqual(cashAfter, cashBefore + offer.rewardCash, 'delivery must pay the reward');
  const ledger = db.queryOne(
    "SELECT COUNT(*) AS c FROM cashflow_ledger WHERE category = 'CONTRACT_REWARD';"
  );
  assert(Number(ledger?.c) >= 1, 'delivery must write a CONTRACT_REWARD ledger row');
  const stock = db.queryOne('SELECT quantity FROM inventory_items WHERE item_code = ?;', [offer.itemCode]);
  assert.strictEqual(Number(stock?.quantity), 10, 'delivery must consume exactly the contract quantity');

  // 3. An accepted contract that misses its deadline expires and creates a penalty.
  const secondOffer = first.offers[1];
  const secondContract = service.accept(secondOffer.offerId, 'PLY-0001', '185-06-01');
  const expired = service.expire('PLY-0001', '185-08-01');
  const expiredContract = expired.find((row: any) => row.contractId === secondContract.contractId);
  assert(expiredContract, 'the second contract must expire');
  assert.strictEqual(expiredContract.status, 'EXPIRED');
  const penalty = db.queryOne(
    "SELECT * FROM obligations WHERE obligation_id = ?;",
    [`OBL-CTR-${secondContract.contractId}`]
  );
  assert(penalty, 'an expired contract must create a penalty obligation');
  assert.strictEqual(Number(penalty.amount_cash), secondOffer.penaltyCash);
  assert.strictEqual(penalty.obligation_type, 'CONTRACT_PENALTY');

  // 4. Delivering without stock is rejected.
  const thirdOffer = first.offers[2];
  const thirdContract = service.accept(thirdOffer.offerId, 'PLY-0001', '185-06-01');
  const empty = new Database(TEST_DB);
  setStock(empty, thirdOffer.itemCode, 0);
  empty.close();
  let rejected = false;
  try {
    service.deliver(thirdContract.contractId, 'PLY-0001', '185-06-06');
  } catch (error: any) {
    rejected = /không còn trong kho|Insufficient/i.test(error.message);
  }
  assert.strictEqual(rejected, true, 'delivery without stock must fail');

  // 5. Month close expires missed contracts and posts next month's offers.
  const closeResult = processMonthClose(TEST_DB, 'PLY-0001', '185-08-30', '185-09-01');
  assert(closeResult, 'contract month-close bridge must run');
  assert.strictEqual(closeResult.offersIssued, 3, 'next month must post three offers');

  console.log('  ✅ PASSED: offers, accept, delivery, expiry penalty and month-close rotation.');
}

function cleanup(): void {
  try { closeBridge(); } catch { /* bridge not loaded */ }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../src/core/database').DatabaseService.resetInstance();
  } catch { /* already closed */ }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

try {
  run();
  cleanup();
  console.log('✅ Contract board verified.');
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
