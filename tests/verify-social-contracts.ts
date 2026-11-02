/**
 * Social mutations follow the core contracts: a kizuna interaction and a
 * banquet each spend their calendar time once, consume stock once, and replay
 * with the same idempotency key without a second affinity or stock change.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-social-contracts-'));
const TEST_DB = path.join(TMP, 'session.db');
const { getClock } = require('../engine/time-manager');

const NPC_ID = 'NPC-0002';
const TAVERN_ID = 'BIZ-MVRXXHXA-426';

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
    SET liquid_cash = 100000, safe_cash = 0, fatigue = 0, health = 100,
        current_location = 'zhuo_xian'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare('DELETE FROM npc_relationship_deltas WHERE npc_id = ?;').run(NPC_ID);
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-IDEM-SOC%';").run();
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
  console.log('=== Social contracts ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();
  const raw = new Database(TEST_DB);

  // 1. Kizuna: two days, one relationship delta, replay is inert.
  const kizunaPayload = {
    npcId: NPC_ID,
    actionType: 'TEA_CONVERSE',
    idempotencyKey: 'TEST-IDEM-SOC-KIZUNA'
  };
  const k1 = await request(router, 'POST', '/api/kizuna/interact', kizunaPayload);
  assert.strictEqual(k1.status, 200, JSON.stringify(k1.data));
  assert.strictEqual(k1.data.idempotent, false);
  assert.strictEqual(k1.data.time.advancedDays, 2);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-03');
  const deltasAfter = Number(scalar(raw, 'SELECT COUNT(*) AS c FROM npc_relationship_deltas WHERE npc_id = ?;', [NPC_ID]).c);
  assert(deltasAfter > 0, 'interaction must record a relationship delta');

  const k2 = await request(router, 'POST', '/api/kizuna/interact', kizunaPayload);
  assert.strictEqual(k2.status, 200);
  assert.strictEqual(k2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-03', 'replay must not spend another two days');
  assert.strictEqual(
    Number(scalar(raw, 'SELECT COUNT(*) AS c FROM npc_relationship_deltas WHERE npc_id = ?;', [NPC_ID]).c),
    deltasAfter
  );

  // 2. Banquet: time, dish stock and cash move once, replay is inert.
  const cashBefore = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);
  const banquetPayload = {
    tavernEnterpriseId: TAVERN_ID,
    tier: 'TIET_KIEM',
    guestNpcIds: [NPC_ID],
    allowAutoProcure: true,
    bypassSpatialGuard: true,
    idempotencyKey: 'TEST-IDEM-SOC-BANQUET'
  };
  const b1 = await request(router, 'POST', '/api/banquet/host', banquetPayload);
  assert.strictEqual(b1.status, 200, JSON.stringify(b1.data));
  assert.strictEqual(b1.data.idempotent, false);
  assert.strictEqual(b1.data.time.advancedDays, 2);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-05');
  const dish = b1.data.result.dishesConsumed[0];
  assert(dish && dish.itemCode, 'banquet must consume at least one dish');
  const dishQty = Number(scalar(raw, 'SELECT quantity FROM inventory_items WHERE item_code = ?;', [dish.itemCode])?.quantity || 0);
  const cashAfter = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);

  const b2 = await request(router, 'POST', '/api/banquet/host', banquetPayload);
  assert.strictEqual(b2.status, 200);
  assert.strictEqual(b2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-05', 'replay must not spend another two days');
  assert.strictEqual(
    Number(scalar(raw, 'SELECT quantity FROM inventory_items WHERE item_code = ?;', [dish.itemCode])?.quantity || 0),
    dishQty
  );
  assert.strictEqual(
    Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash),
    cashAfter
  );
  assert(cashAfter <= cashBefore);

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: kizuna and banquet charge once and replay cleanly.');
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
