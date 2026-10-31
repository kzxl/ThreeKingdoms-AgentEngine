/**
 * Profession mutations follow the core contracts: gather and craft spend their
 * calendar days once, collect profits moves cash once, and replaying any of them
 * with the same idempotency key returns the stored result without side effects.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-profession-contracts-'));
const TEST_DB = path.join(TMP, 'session.db');
const { getClock } = require('../engine/time-manager');

const BUSINESS_ID = 'BIZ-MVRXXHXA-426';

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', defeat_reason = NULL, distress_months = 0,
        "current_date" = '185-06-01', active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state
    SET liquid_cash = 10000, safe_cash = 0, fatigue = 0, health = 100,
        current_location = 'zhuo_xian'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare(`
    UPDATE inventory_items SET quantity = 20 WHERE item_code = 'COM-BAMBOO';
  `).run();
  db.prepare(`
    UPDATE businesses
    SET accumulated_profit = 1000, safe_cash = 1000, debt = 0
    WHERE business_id = ?;
  `).run(BUSINESS_ID);
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-IDEM-PROF%';").run();
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

function scalar(db: Database.Database, sql: string, params: any[] = []): any {
  return db.prepare(sql).get(...params) as any;
}

async function run(): Promise<void> {
  console.log('=== Profession contracts ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter, bootstrapGrandStrategy } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const modules = await bootstrapGrandStrategy();
  (globalThis as any).__GRAND_STRATEGY_MODULES__ = modules;
  const router = createGrandStrategyRouter();
  const raw = new Database(TEST_DB);

  // 1. Gather: one day and one fatigue cost, replay is inert.
  const gatherPayload = { nodeId: 'NODE-ZHUO-MINE', idempotencyKey: 'TEST-IDEM-PROF-GATHER' };
  const g1 = await request(router, 'POST', '/api/professions/gather', gatherPayload);
  assert.strictEqual(g1.status, 200, JSON.stringify(g1.data));
  assert.strictEqual(g1.data.idempotent, false);
  assert.strictEqual(g1.data.time.advancedDays, 1);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-02');
  const oreAfterGather = Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'RAW-IRON-ORE';")?.quantity || 0);
  const fatigueAfterGather = Number(scalar(raw, "SELECT fatigue FROM player_state WHERE player_id = 'PLY-0001';").fatigue);

  const g2 = await request(router, 'POST', '/api/professions/gather', gatherPayload);
  assert.strictEqual(g2.status, 200);
  assert.strictEqual(g2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-02', 'replay must not spend another day');
  assert.strictEqual(
    Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'RAW-IRON-ORE';")?.quantity || 0),
    oreAfterGather
  );
  assert.strictEqual(Number(scalar(raw, "SELECT fatigue FROM player_state WHERE player_id = 'PLY-0001';").fatigue), fatigueAfterGather);

  // 2. Craft: two days, materials consumed once, replay is inert.
  const craftPayload = { recipeCode: 'REC-MAT-BAM', quantity: 1, idempotencyKey: 'TEST-IDEM-PROF-CRAFT' };
  const c1 = await request(router, 'POST', '/api/professions/craft', craftPayload);
  assert.strictEqual(c1.status, 200, JSON.stringify(c1.data));
  assert.strictEqual(c1.data.idempotent, false);
  assert.strictEqual(c1.data.time.advancedDays, 2);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-04');
  const bambooAfterCraft = Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-BAMBOO';").quantity);
  const productAfterCraft = Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'PROD-MAT';")?.quantity || 0);
  assert.strictEqual(bambooAfterCraft, 19);

  const c2 = await request(router, 'POST', '/api/professions/craft', craftPayload);
  assert.strictEqual(c2.status, 200);
  assert.strictEqual(c2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-04', 'replay must not spend another day');
  assert.strictEqual(Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-BAMBOO';").quantity), bambooAfterCraft);
  assert.strictEqual(Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'PROD-MAT';")?.quantity || 0), productAfterCraft);

  // 3. Collect profits: cash moves once, replay is inert.
  const cashBeforeCollect = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);
  const collectPayload = { businessId: BUSINESS_ID, amount: 100, idempotencyKey: 'TEST-IDEM-PROF-COLLECT' };
  const p1 = await request(router, 'POST', '/api/enterprise/collect', collectPayload);
  assert.strictEqual(p1.status, 200, JSON.stringify(p1.data));
  assert.strictEqual(p1.data.idempotent, false);
  assert.strictEqual(p1.data.collectedAmount, 100);
  assert.strictEqual(
    Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash),
    cashBeforeCollect + 100
  );

  const p2 = await request(router, 'POST', '/api/enterprise/collect', collectPayload);
  assert.strictEqual(p2.status, 200);
  assert.strictEqual(p2.data.idempotent, true);
  assert.strictEqual(
    Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash),
    cashBeforeCollect + 100
  );
  assert.strictEqual(Number(scalar(raw, 'SELECT accumulated_profit FROM businesses WHERE business_id = ?;', [BUSINESS_ID]).accumulated_profit), 900);

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: gather, craft and dividend collection charge once and replay cleanly.');
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
