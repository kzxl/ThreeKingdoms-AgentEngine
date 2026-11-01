/**
 * Freight conservation: accepting a contract reserves stock at the source,
 * delivery moves that stock to the destination, and a failed shipment returns
 * the unspoiled cargo. No path may create goods.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
import { FreightService } from '../src/modules/market/freight.service';
import { SettlementMarketService } from '../src/modules/economy/settlement-market.service';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-freight-conservation-'));
const TEST_DB = path.join(TMP, 'session.db');

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', "current_date" = '185-06-01', active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state SET liquid_cash = 100000, safe_cash = 0, fatigue = 0, health = 100,
      current_location = 'LOC-0001'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare('DELETE FROM freight_contracts;').run();
  db.prepare('DELETE FROM freight_shipments;').run();
  db.prepare("DELETE FROM world_day_ledger WHERE system = 'freight';").run();
  db.close();
}

function stock(market: SettlementMarketService, settlementId: string, itemCode: string): number {
  return Number(market.getState(settlementId, itemCode).stock);
}

function totalStock(
  db: DatabaseService,
  market: SettlementMarketService,
  from: string,
  to: string,
  itemCode: string
): number {
  const transit = db.queryOne<{ qty: number }>(
    `SELECT COALESCE(SUM(quantity), 0) AS qty FROM freight_shipments
     WHERE item_code = ? AND status IN ('EN_ROUTE','ARRIVED');`,
    [itemCode]
  )?.qty || 0;
  return stock(market, from, itemCode) + stock(market, to, itemCode) + Number(transit);
}

function run(): void {
  console.log('=== Freight stock conservation ===');
  seed();
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  const freight = FreightService.forDatabase(db);
  const market = SettlementMarketService.forDatabase(db);
  const date = '185-06-01';

  const contracts = freight.listContracts('zhuo_xian', date);
  assert(contracts.length > 0, 'zhuo_xian must post at least one freight contract');
  const contract = contracts[0];
  const quantity = Number(contract.quantity);
  const from = contract.fromSettlementId;
  const to = contract.toSettlementId;
  const itemCode = contract.itemCode;

  market.getState(from, itemCode);
  db.execute(
    'UPDATE settlement_market_state SET stock = ?, demand = 100 WHERE settlement_id = ? AND item_code = ?;',
    [quantity + 20, from, itemCode]
  );

  const before = totalStock(db, market, from, to, itemCode);
  const sourceBefore = stock(market, from, itemCode);
  const destinationBefore = stock(market, to, itemCode);

  const shipment = freight.accept('PLY-0001', contract.contractId, 'MILITIA', date);
  assert.strictEqual(
    stock(market, from, itemCode),
    sourceBefore - quantity,
    'accept must debit the source market'
  );
  assert.strictEqual(
    totalStock(db, market, from, to, itemCode),
    before,
    'accept must move stock into transit, not create it'
  );
  const reserved = db.queryOne<{ source_reserved_quantity: number }>(
    'SELECT source_reserved_quantity FROM freight_shipments WHERE shipment_id = ?;',
    [shipment.shipmentId]
  );
  assert.strictEqual(Number(reserved?.source_reserved_quantity), quantity);

  // A parallel contract cannot reserve stock that is no longer there.
  const parallelId = 'FRT-TEST-PARALLEL';
  db.execute(
    `INSERT INTO freight_contracts
      (contract_id, issuer_npc_id, issuer_name_vi, from_settlement_id, to_settlement_id,
       item_code, quantity, reward_cash, penalty_cash, deadline, status, created_date)
     VALUES (?, 'NPC-0001', 'Test Issuer', ?, ?, ?, 10, 100, 40, '185-06-20', 'OPEN', ?);`,
    [parallelId, from, to, itemCode, date]
  );
  const current = stock(market, from, itemCode);
  market.applyTrade(from, itemCode, 3 - current);
  assert.throws(
    () => freight.accept('PLY-0001', parallelId, 'MILITIA', date),
    /không đủ/,
    'accept must reject when the source market cannot cover the contract'
  );
  // Restore the stock drained only to prove the rejection path.
  market.applyTrade(from, itemCode, current - stock(market, from, itemCode));

  // Delivery credits the destination with exactly the reserved cargo.
  db.execute(
    "UPDATE freight_shipments SET status = 'ARRIVED', days_remaining = 0 WHERE shipment_id = ?;",
    [shipment.shipmentId]
  );
  freight.deliver('PLY-0001', shipment.shipmentId, date);
  assert.strictEqual(
    stock(market, to, itemCode),
    destinationBefore + quantity,
    'delivery must credit the destination once'
  );
  assert.strictEqual(
    totalStock(db, market, from, to, itemCode),
    before,
    'delivery must conserve total stock'
  );

  // A failed shipment returns its unspoiled cargo to the source.
  const secondContracts = freight.listContracts('zhuo_xian', date);
  assert(secondContracts.length > 0, 'a second contract must be available');
  const second = secondContracts[0];
  market.applyTrade(from, itemCode, Number(second.quantity) + 5);
  const sourceBeforeSecond = stock(market, from, itemCode);
  const secondShipment = freight.accept('PLY-0001', second.contractId, 'MILITIA', date);
  db.execute(
    "UPDATE freight_shipments SET status = 'ARRIVED', days_remaining = 0 WHERE shipment_id = ?;",
    [secondShipment.shipmentId]
  );
  assert.throws(
    () => freight.deliver('PLY-0001', secondShipment.shipmentId, '999-01-01'),
    /quá hạn/,
    'delivery after the deadline must fail the contract'
  );
  assert.strictEqual(
    stock(market, from, itemCode),
    sourceBeforeSecond,
    'a failed contract must return reserved cargo to the source'
  );
  const returned = db.queryOne<{ source_reserved_quantity: number; status: string }>(
    'SELECT source_reserved_quantity, status FROM freight_shipments WHERE shipment_id = ?;',
    [secondShipment.shipmentId]
  );
  assert.strictEqual(returned?.status, 'FAILED');
  assert.strictEqual(Number(returned?.source_reserved_quantity), 0);

  db.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: freight source reservation, delivery and failure conservation.');
}

function cleanup(): void {
  try {
    DatabaseService.resetInstance();
  } catch { /* already closed */ }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

try {
  run();
  cleanup();
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
