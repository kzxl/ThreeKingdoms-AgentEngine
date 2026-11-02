/**
 * Per-city personal bag: buying in one city cannot be sold in another until the
 * goods are physically moved. The aggregate inventory remains the conservation
 * store, while player_bag_by_location is the current-city slice.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-player-bag-'));
const TEST_DB = path.join(TMP, 'session.db');
const ITEM = 'COM-GRAIN';

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

function setLocation(db: any, locationId: string, subLocation: string): void {
  db.execute(
    "UPDATE player_state SET current_location = ?, current_sub_location = ? WHERE player_id = 'PLY-0001';",
    [locationId, subLocation]
  );
}

function bagQty(db: any, locationId: string, itemCode = ITEM): number {
  return Number(db.queryOne(
    'SELECT quantity FROM player_bag_by_location WHERE location_id = ? AND item_code = ?;',
    [locationId, itemCode]
  )?.quantity || 0);
}

async function run(): Promise<void> {
  console.log('=== Per-city personal bag ===');
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  db.execute(`
    UPDATE campaign_meta
    SET status = 'ACTIVE',
        "current_date" = COALESCE((SELECT MAX(game_date) FROM cashflow_ledger), '185-06-01'),
        active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `);
  db.execute("UPDATE player_state SET liquid_cash = 100000, safe_cash = 0 WHERE player_id = 'PLY-0001';");
  db.execute("DELETE FROM player_bag_by_location WHERE item_code = ?;", [ITEM]);
  db.execute("DELETE FROM inventory_items WHERE item_code = ?;", [ITEM]);
  setLocation(db, 'LOC-0001', 'Tư Trạch Vườn Đào');
  db.execute(
    `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
     VALUES (?, 'FOOD_STUFF', 'Test grain', 10, 40, 'Test');`,
    [ITEM]
  );
  assert.strictEqual(bagQty(db, 'LOC-0001'), 10, 'insert must mirror into the current city bag');
  assert.strictEqual(bagQty(db, 'LOC-0002'), 0);

  const router = createGrandStrategyRouter();

  setLocation(db, 'LOC-0002', 'Nam Cung Kim Loan Điện');
  const blocked = await request(router, 'POST', '/api/trade', {
    action: 'SELL',
    itemCode: ITEM,
    quantity: 3,
    counterparty: 'Test buyer',
    idempotencyKey: 'TEST-BAG-BLOCKED'
  });
  assert.strictEqual(blocked.status, 400, JSON.stringify(blocked.data));
  assert(/Túi tại|thành khác/i.test(blocked.data.error));

  const buy = await request(router, 'POST', '/api/trade', {
    action: 'BUY',
    itemCode: ITEM,
    quantity: 5,
    counterparty: 'Test seller',
    idempotencyKey: 'TEST-BAG-BUY'
  });
  assert.strictEqual(buy.status, 200, JSON.stringify(buy.data));
  assert.strictEqual(bagQty(db, 'LOC-0002'), 5);
  assert.strictEqual(bagQty(db, 'LOC-0001'), 10);

  setLocation(db, 'LOC-0001', 'Tư Trạch Vườn Đào');
  const sell = await request(router, 'POST', '/api/trade', {
    action: 'SELL',
    itemCode: ITEM,
    quantity: 3,
    counterparty: 'Test buyer',
    idempotencyKey: 'TEST-BAG-SELL'
  });
  assert.strictEqual(sell.status, 200, JSON.stringify(sell.data));
  assert.strictEqual(bagQty(db, 'LOC-0001'), 7);
  assert.strictEqual(bagQty(db, 'LOC-0002'), 5);

  const board = await request(router, 'GET', '/api/economy/market-board?settlementId=zhuo_xian');
  const boardItem = (board.data.items || []).find((row: any) => row.itemCode === ITEM);
  assert.strictEqual(boardItem.playerQuantity, 7, 'market board must show the bag in that city');
  const otherBoard = await request(router, 'GET', '/api/economy/market-board?settlementId=luo_yang');
  const otherItem = (otherBoard.data.items || []).find((row: any) => row.itemCode === ITEM);
  assert.strictEqual(otherItem.playerQuantity, 5, 'market board must show the other city bag separately');

  const inventory = db.queryOne(
    'SELECT quantity FROM inventory_items WHERE item_code = ?;',
    [ITEM]
  );
  assert.strictEqual(Number(inventory.quantity), 12, 'aggregate inventory must equal both cities combined');
  assert.strictEqual(bagQty(db, 'LOC-0001') + bagQty(db, 'LOC-0002'), 12);

  const overBag = await request(router, 'POST', '/api/trade', {
    action: 'SELL',
    itemCode: ITEM,
    quantity: 99,
    counterparty: 'Test buyer',
    idempotencyKey: 'TEST-BAG-OVER'
  });
  assert.strictEqual(overBag.status, 400);
  assert(/Túi tại/i.test(overBag.data.error));

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: city bag mirrors inventory, cross-city sale is blocked, market board is per city.');
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
