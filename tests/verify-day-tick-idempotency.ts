/**
 * Day-tick idempotency: replaying the same campaign day must not sell a stall
 * listing twice, advance a freight shipment twice or consume essentials twice.
 * `world_day_ledger` is the shared marker.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
import { StallService } from '../src/modules/market/stall.service';
import { FreightService } from '../src/modules/market/freight.service';
import { SettlementMarketService } from '../src/modules/economy/settlement-market.service';
import { LOC_TO_NODE_MAP } from '../src/modules/ecology-logistics/spatial-registry';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-day-tick-'));
const TEST_DB = path.join(TMP, 'session.db');
const DATE = '185-06-01';

function seed(db: Database.Database): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  db.pragma('journal_mode = DELETE');
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', "current_date" = ?, active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run(DATE);
  db.prepare(`
    UPDATE player_state SET liquid_cash = 100000, safe_cash = 0, fatigue = 0, health = 100,
      current_location = 'LOC-0001'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare('DELETE FROM player_stalls;').run();
  db.prepare('DELETE FROM stall_listings;').run();
  db.prepare('DELETE FROM stall_sales;').run();
  db.prepare('DELETE FROM freight_contracts;').run();
  db.prepare('DELETE FROM freight_shipments;').run();
  db.prepare('DELETE FROM settlement_consumption_log;').run();
  db.prepare('DELETE FROM world_day_ledger;').run();
}

function cash(db: DatabaseService): number {
  return Number(db.queryOne<{ c: number }>(
    "SELECT liquid_cash AS c FROM player_state WHERE player_id = 'PLY-0001';"
  )?.c || 0);
}

function run(): void {
  console.log('=== Day tick idempotency ===');
  const raw = new Database(TEST_DB);
  seed(raw);

  // Seed one buyer in the stall's settlement so the first day really sells.
  const locations = Object.entries(LOC_TO_NODE_MAP)
    .filter(([, node]) => node === 'zhuo_xian')
    .map(([location]) => location);
  assert(locations.length > 0, 'zhuo_xian must have a mapped location');
  const placeholders = locations.map(() => '?').join(',');
  const buyer = raw.prepare(
    `SELECT npc_id FROM master_characters WHERE baseline_location IN (${placeholders}) LIMIT 1;`
  ).get(...locations) as { npc_id: string } | undefined;
  assert(buyer, 'zhuo_xian must have an NPC resident');
  raw.prepare(
    `INSERT INTO npc_personal_progression (npc_id, personal_cash)
     VALUES (?, 100000)
     ON CONFLICT(npc_id) DO UPDATE SET personal_cash = 100000;`
  ).run(buyer.npc_id);
  raw.close();

  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  const stalls = StallService.forDatabase(db);
  const freight = FreightService.forDatabase(db);
  const market = SettlementMarketService.forDatabase(db);

  // 1. Stall: one day sells once.
  stalls.openStall('PLY-0001', 'zhuo_xian', 'Test Stall', DATE);
  const stall = db.queryOne<{ stall_id: string }>(
    "SELECT stall_id FROM player_stalls WHERE owner_id = 'PLY-0001' AND status = 'OPEN' LIMIT 1;"
  );
  assert(stall, 'stall must be open');
  db.execute(
    `INSERT INTO stall_listings (listing_id, stall_id, item_code, quantity, unit_price, status, source_type)
     VALUES ('LST-TEST-IDEMP', ?, 'COM-GRAIN', 10, 1, 'ACTIVE', 'BAG');`,
    [stall!.stall_id]
  );
  const first = stalls.advanceByDays(1, DATE);
  assert(first.sales.length > 0, 'the first day must produce at least one sale');
  const cashAfterFirst = cash(db);
  const listingAfterFirst = Number(db.queryOne<{ q: number }>(
    "SELECT quantity AS q FROM stall_listings WHERE listing_id = 'LST-TEST-IDEMP';"
  )?.q);
  const second = stalls.advanceByDays(1, DATE);
  assert.strictEqual(second.sales.length, 0, 'replaying the stall day must not sell again');
  assert.strictEqual(cash(db), cashAfterFirst, 'replaying the stall day must not add cash');
  assert.strictEqual(
    Number(db.queryOne<{ q: number }>("SELECT quantity AS q FROM stall_listings WHERE listing_id = 'LST-TEST-IDEMP';")?.q),
    listingAfterFirst,
    'replaying the stall day must not reduce the listing again'
  );
  assert.strictEqual(
    Number(db.queryOne<{ c: number }>(
      "SELECT COUNT(*) AS c FROM world_day_ledger WHERE system = 'stall' AND game_date = ?;",
      [DATE]
    )?.c),
    1
  );

  // 2. Freight: one day advances once.
  const contracts = freight.listContracts('zhuo_xian', DATE);
  assert(contracts.length > 0, 'a freight contract must be available');
  const contract = contracts[0];
  market.getState(contract.fromSettlementId, contract.itemCode);
  db.execute(
    'UPDATE settlement_market_state SET stock = ? WHERE settlement_id = ? AND item_code = ?;',
    [Number(contract.quantity) + 20, contract.fromSettlementId, contract.itemCode]
  );
  const shipment = freight.accept('PLY-0001', contract.contractId, 'MILITIA', DATE);
  const shipmentDate = '185-06-02';
  freight.advanceByDays(1, shipmentDate);
  const afterFirst = db.queryOne<{ days_remaining: number; status: string; quantity: number }>(
    'SELECT days_remaining, status, quantity FROM freight_shipments WHERE shipment_id = ?;',
    [shipment.shipmentId]
  );
  const cashAfterFreight = cash(db);
  freight.advanceByDays(1, shipmentDate);
  const afterSecond = db.queryOne<{ days_remaining: number; status: string; quantity: number }>(
    'SELECT days_remaining, status, quantity FROM freight_shipments WHERE shipment_id = ?;',
    [shipment.shipmentId]
  );
  assert.strictEqual(afterSecond?.days_remaining, afterFirst?.days_remaining);
  assert.strictEqual(afterSecond?.status, afterFirst?.status);
  assert.strictEqual(afterSecond?.quantity, afterFirst?.quantity);
  assert.strictEqual(cash(db), cashAfterFreight, 'replaying the freight day must not move cash');
  assert.strictEqual(
    Number(db.queryOne<{ c: number }>(
      "SELECT COUNT(*) AS c FROM world_day_ledger WHERE system = 'freight' AND game_date = ?;",
      [shipmentDate]
    )?.c),
    1
  );

  // 3. Consumption: one date consumes once.
  const consumption = db.queryOne<{ settlement_id: string; item_code: string }>(
    'SELECT settlement_id, item_code FROM settlement_consumption WHERE monthly_demand > 0 LIMIT 1;'
  );
  assert(consumption, 'consumption rows must exist');
  market.getState(consumption!.settlement_id, consumption!.item_code);
  db.execute(
    'UPDATE settlement_market_state SET stock = 500 WHERE settlement_id = ? AND item_code = ?;',
    [consumption!.settlement_id, consumption!.item_code]
  );
  const consumptionDate = '185-06-03';
  market.consumeEssentials(consumptionDate);
  const stockAfterFirst = Number(market.getState(consumption!.settlement_id, consumption!.item_code).stock);
  const logsAfterFirst = Number(db.queryOne<{ c: number }>(
    'SELECT COUNT(*) AS c FROM settlement_consumption_log WHERE game_date = ?;',
    [consumptionDate]
  )?.c);
  assert(logsAfterFirst > 0, 'the first consumption pass must write logs');
  market.consumeEssentials(consumptionDate);
  assert.strictEqual(
    Number(market.getState(consumption!.settlement_id, consumption!.item_code).stock),
    stockAfterFirst,
    'replaying consumption must not draw stock again'
  );
  assert.strictEqual(
    Number(db.queryOne<{ c: number }>(
      'SELECT COUNT(*) AS c FROM settlement_consumption_log WHERE game_date = ?;',
      [consumptionDate]
    )?.c),
    logsAfterFirst,
    'replaying consumption must not write a second log set'
  );

  db.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: stall, freight and consumption days are idempotent.');
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
