/**
 * Warehouse: rent or buy per settlement, capacity, deposit/withdraw and lease
 * expiry. Personal bag and warehouse stock must stay separate.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-warehouse-'));
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
    SET liquid_cash = 10000, safe_cash = 0, fatigue = 0, health = 100,
        current_location = 'LOC-0001'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare(`
    INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
    VALUES ('COM-GRAIN', 'FOOD_STUFF', 'Grain', 100, 100, 'Túi nhân')
    ON CONFLICT(item_code) DO UPDATE SET quantity = 100;
  `).run();
  db.prepare("DELETE FROM warehouses WHERE owner_id = 'PLY-0001';").run();
  db.prepare("DELETE FROM warehouse_stock;").run();
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-WH%';").run();
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
  console.log('=== Warehouse ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();
  const raw = new Database(TEST_DB);

  const rent = await request(router, 'POST', '/api/warehouses/rent', { idempotencyKey: 'TEST-WH-RENT' });
  assert.strictEqual(rent.status, 200, JSON.stringify(rent.data));
  const warehouseId = rent.data.result.warehouseId;
  assert.strictEqual(rent.data.result.ownershipType, 'RENTED');
  assert.strictEqual(Number(rent.data.result.capacity), 300);
  assert.strictEqual(rent.data.result.status, 'ACTIVE');
  assert.strictEqual(num(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';"), 9700);
  // Re-renting an active lease must extend from the existing end, not today.
  raw.prepare("UPDATE warehouses SET lease_until = '185-08-01' WHERE warehouse_id = ?;").run(warehouseId);
  const extend = await request(router, 'POST', '/api/warehouses/renew', {
    warehouseId,
    idempotencyKey: 'TEST-WH-RENEW-ACTIVE'
  });
  assert.strictEqual(extend.status, 200, JSON.stringify(extend.data));
  assert.strictEqual(extend.data.result.leaseUntil, '185-11-01');
  assert.notStrictEqual(extend.data.result.leaseUntil, '185-09-01');

  const deposit = await request(router, 'POST', '/api/warehouses/deposit', {
    warehouseId,
    itemCode: 'COM-GRAIN',
    quantity: 50,
    idempotencyKey: 'TEST-WH-DEPOSIT'
  });
  assert.strictEqual(deposit.status, 200, JSON.stringify(deposit.data));
  assert.strictEqual(num(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-GRAIN';"), 50);
  assert.strictEqual(num(raw, 'SELECT quantity FROM warehouse_stock WHERE warehouse_id = ? AND item_code = ?;', [warehouseId, 'COM-GRAIN']), 50);
  assert.strictEqual(num(raw, 'SELECT usedCapacity FROM (SELECT SUM(quantity) AS usedCapacity FROM warehouse_stock WHERE warehouse_id = ?);', [warehouseId]), 50);
  assert(raw.prepare("SELECT 1 AS ok FROM stock_movements WHERE movement_type = 'WAREHOUSE_DEPOSIT';").get());

  const replay = await request(router, 'POST', '/api/warehouses/deposit', {
    warehouseId,
    itemCode: 'COM-GRAIN',
    quantity: 50,
    idempotencyKey: 'TEST-WH-DEPOSIT'
  });
  assert.strictEqual(replay.data.idempotent, true);
  assert.strictEqual(num(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-GRAIN';"), 50);

  const withdraw = await request(router, 'POST', '/api/warehouses/withdraw', {
    warehouseId,
    itemCode: 'COM-GRAIN',
    quantity: 20,
    idempotencyKey: 'TEST-WH-WITHDRAW'
  });
  assert.strictEqual(withdraw.status, 200, JSON.stringify(withdraw.data));
  assert.strictEqual(num(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-GRAIN';"), 70);
  assert.strictEqual(num(raw, 'SELECT quantity FROM warehouse_stock WHERE warehouse_id = ? AND item_code = ?;', [warehouseId, 'COM-GRAIN']), 30);

  const overflow = await request(router, 'POST', '/api/warehouses/deposit', {
    warehouseId,
    itemCode: 'COM-GRAIN',
    quantity: 400,
    idempotencyKey: 'TEST-WH-OVERFLOW'
  });
  assert.strictEqual(overflow.status, 400);
  assert(/sức chứa/i.test(overflow.data.error));

  // Expired lease blocks deposit until renewed.
  raw.prepare("UPDATE warehouses SET lease_until = '185-05-01' WHERE warehouse_id = ?;").run(warehouseId);
  const expired = await request(router, 'POST', '/api/warehouses/deposit', {
    warehouseId,
    itemCode: 'COM-GRAIN',
    quantity: 1,
    idempotencyKey: 'TEST-WH-EXPIRED'
  });
  assert.strictEqual(expired.status, 400);
  assert(/hết hạn/i.test(expired.data.error));

  const renew = await request(router, 'POST', '/api/warehouses/renew', {
    warehouseId,
    idempotencyKey: 'TEST-WH-RENEW'
  });
  assert.strictEqual(renew.status, 200, JSON.stringify(renew.data));
  assert.strictEqual(renew.data.result.status, 'ACTIVE');

  const buy = await request(router, 'POST', '/api/warehouses/buy', {
    settlementId: 'zhuo_xian',
    idempotencyKey: 'TEST-WH-BUY'
  });
  assert.strictEqual(buy.status, 200, JSON.stringify(buy.data));
  assert.strictEqual(buy.data.result.ownershipType, 'OWNED');
  assert.strictEqual(buy.data.result.leaseUntil, null);

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: warehouse rent/buy, capacity, deposit/withdraw and expiry.');
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
