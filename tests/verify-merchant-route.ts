/**
 * Merchant company: a route buys NPC surplus below a ceiling, stores it in the
 * source warehouse, ships on schedule, unloads into the destination warehouse
 * and sells above the floor.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-merchant-route-'));
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
    SET status = 'ACTIVE', "current_date" = COALESCE((SELECT MAX(game_date) FROM cashflow_ledger), '185-06-01'), active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state SET liquid_cash = 100000, safe_cash = 0, fatigue = 0, health = 100,
      current_location = 'LOC-0001'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare("DELETE FROM merchant_routes WHERE owner_id = 'PLY-0001';").run();
  db.prepare('DELETE FROM merchant_shipments;').run();
  db.prepare('DELETE FROM merchant_events;').run();
  db.prepare("DELETE FROM warehouses WHERE owner_id = 'PLY-0001';").run();
  db.prepare('DELETE FROM warehouse_stock;').run();
  db.prepare(`
    INSERT INTO warehouses (warehouse_id, owner_id, settlement_id, name_vi, ownership_type, capacity,
      rent_cash, purchase_price, status, created_date)
    VALUES ('WH-TEST-SRC', 'PLY-0001', 'zhuo_xian', 'Kho nguồn', 'OWNED', 300, 300, 2000, 'ACTIVE', '185-06-01'),
           ('WH-TEST-DST', 'PLY-0001', 'ji_cheng', 'Kho đích', 'OWNED', 300, 300, 2000, 'ACTIVE', '185-06-01');
  `).run();
  db.prepare(`
    INSERT INTO npc_market_offers (offer_id, settlement_id, npc_id, npc_name_vi, item_code,
      quantity, unit_price, status, created_date, expires_date)
    VALUES ('OFFER-TEST-GRAIN', 'zhuo_xian', 'NPC-0001', 'Lưu Bị', 'COM-GRAIN',
      30, 50, 'ACTIVE', '185-06-01', '185-09-01'),
           ('OFFER-TEST-BAMBOO', 'zhuo_xian', 'NPC-0005', 'Trần Bảo', 'COM-BAMBOO',
      30, 20, 'ACTIVE', '185-06-01', '185-09-01');
  `).run();
  db.prepare('DELETE FROM world_day_ledger;').run();
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-MERCHANT%';").run();
  db.close();
}

function request(router: any, method: string, url: string, body: any = null): Promise<{ status: number; data: any }> {
  return new Promise(resolve => {
    let sentStatus = 200;
    const req: any = {
      method,
      url,
      headers: { host: 'localhost:3300' },
      on: (event: string, callback: any) => {
        if (event === 'data' && body) callback(Buffer.from(JSON.stringify(body)));
        if (event === 'end') callback();
      }
    };
    const res: any = {
      writeHead: (status: number) => { sentStatus = status; },
      end: (data: string) => {
        let payload: any = data;
        try { payload = JSON.parse(data); } catch { /* keep raw */ }
        resolve({ status: sentStatus, data: payload });
      }
    };
    router.handle(req, res);
  });
}

function num(db: any, sql: string, params: any[] = []): number {
  const row = db.prepare(sql).get(...params) as any;
  return Number(row ? Object.values(row)[0] : 0);
}

async function run(): Promise<void> {
  console.log('=== Merchant company route ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  const timeManager = require('../engine/time-manager');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();
  const raw = new Database(TEST_DB);

  const created = await request(router, 'POST', '/api/merchant/routes', {
    fromWarehouseId: 'WH-TEST-SRC',
    toWarehouseId: 'WH-TEST-DST',
    frequencyDays: 1,
    guardTier: 'MILITIA',
    nameVi: 'Tuyến Trác → Kế',
    items: [
      { itemCode: 'COM-GRAIN', maxBuyPrice: 50, minSellPrice: 100, quantityPerRun: 10 },
      { itemCode: 'COM-BAMBOO', maxBuyPrice: 30, minSellPrice: 40, quantityPerRun: 5 }
    ],
    idempotencyKey: 'TEST-MERCHANT-CREATE'
  });
  assert.strictEqual(created.status, 200, JSON.stringify(created.data));
  const routeId = created.data.route.routeId;
  assert(routeId);
  assert.strictEqual(created.data.route.status, 'ACTIVE');
  assert.strictEqual(created.data.route.items.length, 2, 'route must expose the full item manifest');

  const cashBefore = num(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';");
  timeManager.advanceCampaignDays(TEST_DB, 6, { clampToMonthEnd: false });

  const events = raw.prepare('SELECT event_type, item_code, COUNT(*) AS c FROM merchant_events WHERE route_id = ? GROUP BY event_type, item_code;').all(routeId) as any[];
  const types = new Set(events.map(row => row.event_type));
  const eventItems = new Set(events.map(row => row.item_code));
  assert(types.has('PURCHASE'), 'route must procure from NPC offers');
  assert(eventItems.has('COM-GRAIN') && eventItems.has('COM-BAMBOO'), 'both route items must move');
  assert(types.has('DISPATCH'), 'route must dispatch a shipment');
  assert(types.has('UNLOAD') || types.has('SALE'), 'arrived cargo must reach the destination');

  const cashAfter = num(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';");
  assert(cashAfter !== cashBefore, 'route must move cash');
  const stocks = raw.prepare(
    "SELECT warehouse_id, quantity FROM warehouse_stock WHERE item_code = 'COM-GRAIN';"
  ).all() as any[];
  assert(stocks.length > 0, 'procurement or destination stock must exist');

  // Same campaign day must be a no-op on replay.
  const { MerchantCompanyService } = require('../src/modules/market/merchant-company.service');
  const company = MerchantCompanyService.forDatabase(DatabaseService.getInstance(TEST_DB));
  const eventCount = num(raw, 'SELECT COUNT(*) FROM merchant_events;');
  const currentDate = String((raw.prepare('SELECT "current_date" AS d FROM campaign_meta LIMIT 1').get() as any)?.d || '185-06-06');
  const replay = company.advanceByDays(1, currentDate);
  assert.strictEqual(replay.daysProcessed, 0, 'same-day merchant tick must be idempotent');
  assert.strictEqual(num(raw, 'SELECT COUNT(*) FROM merchant_events;'), eventCount);

  const toggled = await request(router, 'POST', `/api/merchant/routes/${routeId}/status`, {
    status: 'PAUSED',
    idempotencyKey: 'TEST-MERCHANT-PAUSE'
  });
  assert.strictEqual(toggled.status, 200, JSON.stringify(toggled.data));
  assert.strictEqual(toggled.data.route.status, 'PAUSED');

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: merchant route procures, ships, unloads and sells.');
}

function cleanup(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../src/core/database').DatabaseService.resetInstance();
  } catch { /* already closed */ }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

try {
  run().then(() => cleanup()).catch(error => {
    console.error(error);
    cleanup();
    process.exit(1);
  });
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
