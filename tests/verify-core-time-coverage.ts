/**
 * Core time coverage: trade, garrison reinforcement and location movement now
 * charge calendar days on the server, like duels and crafting already did.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-core-time-'));
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
  // Guarantee the player faction owns the test settlement for reinforcement.
  const faction = db.prepare(
    "SELECT faction_id FROM session_factions WHERE leader_id = 'PLY-0001' AND is_active = 1 LIMIT 1;"
  ).get() as any;
  if (faction?.faction_id) {
    db.prepare("UPDATE session_settlements SET ruler_faction_id = ? WHERE settlement_id = 'zhuo_xian';")
      .run(faction.faction_id);
  }
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

async function run(): Promise<void> {
  console.log('=== Core time coverage ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();

  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-01');

  // 1. A market session costs two days (previously free through /api/trade).
  const trade = await request(router, 'POST', '/api/trade', {
    action: 'BUY',
    itemCode: 'COM-GRAIN',
    quantity: 1
  });
  assert.strictEqual(trade.status, 200, `trade must succeed: ${JSON.stringify(trade.data)}`);
  assert.strictEqual(trade.data.time.advancedDays, 2);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-03');

  // 2. Reinforcing a garrison costs one day (previously instant).
  const reinforce = await request(router, 'POST', '/api/garrisons/reinforce', {
    settlementId: 'zhuo_xian',
    troopsDelta: 1
  });
  assert.strictEqual(reinforce.status, 200, `reinforce must succeed: ${JSON.stringify(reinforce.data)}`);
  assert.strictEqual(reinforce.data.time.advancedDays, 1);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-04');

  // 3. Moving to another location costs one day.
  const move = await request(router, 'POST', '/api/location/switch', {
    location: 'Chợ Đông Môn'
  });
  assert.strictEqual(move.status, 200, `move must succeed: ${JSON.stringify(move.data)}`);
  assert.strictEqual(move.data.time.advancedDays, 1);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-05');

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: trade, reinforcement and movement charge days server-side.');
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
