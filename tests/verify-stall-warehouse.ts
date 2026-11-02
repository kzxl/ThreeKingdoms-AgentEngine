/**
 * Stall sourced from a warehouse: the listing leaves the warehouse (not the
 * personal bag) and closing the stall returns it to the warehouse.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-stall-warehouse-'));
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
    UPDATE player_state
    SET liquid_cash = 10000, safe_cash = 0, fatigue = 0, health = 100, current_location = 'LOC-0001'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare(`
    INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
    VALUES ('COM-GRAIN', 'FOOD_STUFF', 'Grain', 100, 100, 'Túi nhân')
    ON CONFLICT(item_code) DO UPDATE SET quantity = 100;
  `).run();
  db.prepare("DELETE FROM player_stalls WHERE owner_id = 'PLY-0001';").run();
  db.prepare('DELETE FROM stall_listings;').run();
  db.prepare("DELETE FROM warehouses WHERE owner_id = 'PLY-0001';").run();
  db.prepare('DELETE FROM warehouse_stock;').run();
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-STALL-WH%';").run();
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
  console.log('=== Stall from warehouse ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();
  const raw = new Database(TEST_DB);

  const rent = await request(router, 'POST', '/api/warehouses/rent', { idempotencyKey: 'TEST-STALL-WH-RENT' });
  assert.strictEqual(rent.status, 200, JSON.stringify(rent.data));
  const warehouseId = rent.data.result.warehouseId;

  const deposit = await request(router, 'POST', '/api/warehouses/deposit', {
    warehouseId,
    itemCode: 'COM-GRAIN',
    quantity: 30,
    idempotencyKey: 'TEST-STALL-WH-DEPOSIT'
  });
  assert.strictEqual(deposit.status, 200, JSON.stringify(deposit.data));

  const open = await request(router, 'POST', '/api/stall/open', { idempotencyKey: 'TEST-STALL-WH-OPEN' });
  assert.strictEqual(open.status, 200, JSON.stringify(open.data));

  const list = await request(router, 'POST', '/api/stall/list', {
    itemCode: 'COM-GRAIN',
    quantity: 10,
    unitPrice: 50,
    source: 'WAREHOUSE',
    warehouseId,
    idempotencyKey: 'TEST-STALL-WH-LIST'
  });
  assert.strictEqual(list.status, 200, JSON.stringify(list.data));
  const listing = list.data.stall.listings.find((row: any) => row.itemCode === 'COM-GRAIN');
  assert.strictEqual(listing.sourceType, 'WAREHOUSE');
  assert.strictEqual(listing.warehouseId, warehouseId);
  assert.strictEqual(num(raw, 'SELECT quantity FROM warehouse_stock WHERE warehouse_id = ? AND item_code = ?;', [warehouseId, 'COM-GRAIN']), 20);
  assert.strictEqual(num(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-GRAIN';"), 70);

  const close = await request(router, 'POST', '/api/stall/close', { idempotencyKey: 'TEST-STALL-WH-CLOSE' });
  assert.strictEqual(close.status, 200, JSON.stringify(close.data));
  assert.strictEqual(num(raw, 'SELECT quantity FROM warehouse_stock WHERE warehouse_id = ? AND item_code = ?;', [warehouseId, 'COM-GRAIN']), 30);
  assert.strictEqual(num(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-GRAIN';"), 70);

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: stall listings source from warehouse and return there.');
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
