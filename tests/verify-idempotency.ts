/**
 * Service-level idempotency: a retried financial action with the same key must
 * not double-charge cash, inventory, troops or days, and the replay must return
 * the original result.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-idempotency-'));
const TEST_DB = path.join(TMP, 'session.db');
const { getClock } = require('../engine/time-manager');

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
        "current_date" = '185-06-01', active_turn = 16
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state
    SET liquid_cash = 1000000, safe_cash = 0, fatigue = 0, health = 100,
        current_location = 'zhuo_xian'
    WHERE player_id = 'PLY-0001';
  `).run();
  const faction = db.prepare(
    "SELECT faction_id FROM session_factions WHERE leader_id = 'PLY-0001' AND is_active = 1 LIMIT 1;"
  ).get() as any;
  if (faction?.faction_id) {
    db.prepare("UPDATE session_settlements SET ruler_faction_id = ? WHERE settlement_id = 'zhuo_xian';")
      .run(faction.faction_id);
  }
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-IDEM-%';").run();
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
  return (db.prepare(sql).get(...params) as any);
}

async function run(): Promise<void> {
  console.log('=== Service idempotency ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();
  const raw = new Database(TEST_DB);

  // 1. Trade replay: cash/inventory/action row only once.
  const cash0 = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);
  const grain0 = Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-GRAIN';")?.quantity || 0);
  const tradePayload = {
    action: 'BUY',
    itemCode: 'COM-GRAIN',
    quantity: 1,
    idempotencyKey: 'TEST-IDEM-TRADE'
  };
  const t1 = await request(router, 'POST', '/api/trade', tradePayload);
  assert.strictEqual(t1.status, 200, JSON.stringify(t1.data));
  assert.strictEqual(t1.data.idempotent, false);
  const dateAfterFirst = getClock(TEST_DB).currentDate;
  const cash1 = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);
  const grain1 = Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-GRAIN';").quantity);
  assert(cash1 < cash0 && grain1 === grain0 + 1);

  const t2 = await request(router, 'POST', '/api/trade', tradePayload);
  assert.strictEqual(t2.status, 200);
  assert.strictEqual(t2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).currentDate, dateAfterFirst, 'replay must not advance time');
  assert.strictEqual(Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash), cash1);
  assert.strictEqual(Number(scalar(raw, "SELECT quantity FROM inventory_items WHERE item_code = 'COM-GRAIN';").quantity), grain1);
  assert.strictEqual(Number(scalar(raw, "SELECT COUNT(*) AS c FROM action_log WHERE idempotency_key = 'TEST-IDEM-TRADE';").c), 1);

  // 2. Reinforcement replay: troops and days only once.
  const troops0 = Number(scalar(raw, "SELECT garrison_troops FROM session_settlements WHERE settlement_id = 'zhuo_xian';").garrison_troops);
  const reinforcePayload = {
    settlementId: 'zhuo_xian',
    troopsDelta: 1,
    idempotencyKey: 'TEST-IDEM-REINFORCE'
  };
  const r1 = await request(router, 'POST', '/api/garrisons/reinforce', reinforcePayload);
  assert.strictEqual(r1.status, 200, JSON.stringify(r1.data));
  const troops1 = Number(scalar(raw, "SELECT garrison_troops FROM session_settlements WHERE settlement_id = 'zhuo_xian';").garrison_troops);
  assert.strictEqual(troops1, troops0 + 1);
  const dateAfterReinforce = getClock(TEST_DB).currentDate;

  const r2 = await request(router, 'POST', '/api/garrisons/reinforce', reinforcePayload);
  assert.strictEqual(r2.status, 200);
  assert.strictEqual(r2.data.idempotent, true);
  assert.strictEqual(Number(scalar(raw, "SELECT garrison_troops FROM session_settlements WHERE settlement_id = 'zhuo_xian';").garrison_troops), troops1);
  assert.strictEqual(getClock(TEST_DB).currentDate, dateAfterReinforce);

  // 3. Farm rent replay: rent and lease only once.
  const board = await request(router, 'GET', '/api/farm/parcels');
  assert.strictEqual(board.status, 200, JSON.stringify(board.data));
  const parcelId = board.data.parcels[0].parcelId;
  const rentPayload = { parcelId, idempotencyKey: 'TEST-IDEM-FARM' };
  const f1 = await request(router, 'POST', '/api/farm/rent', rentPayload);
  assert.strictEqual(f1.status, 200, JSON.stringify(f1.data));
  const cashAfterRent = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);
  const lease1 = scalar(raw, 'SELECT status, leased_by FROM land_parcels WHERE parcel_id = ?;', [parcelId]);
  const f2 = await request(router, 'POST', '/api/farm/rent', rentPayload);
  assert.strictEqual(f2.status, 200);
  assert.strictEqual(f2.data.idempotent, true);
  assert.strictEqual(Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash), cashAfterRent);
  assert.deepStrictEqual(
    scalar(raw, 'SELECT status, leased_by FROM land_parcels WHERE parcel_id = ?;', [parcelId]),
    lease1
  );

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: trade, reinforcement and farm rent replay without double effects.');
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
