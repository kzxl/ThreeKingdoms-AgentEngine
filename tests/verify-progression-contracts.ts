/**
 * Progression mutations follow the core contracts: moving spends one day,
 * accepting a quest spends one phase, and a quest step spends its own days.
 * Replaying any of them with the same idempotency key changes nothing.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-progression-contracts-'));
const TEST_DB = path.join(TMP, 'session.db');
const { getClock } = require('../engine/time-manager');
const QUEST_ID = 'Q-MARTIAL-01';

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
  db.prepare('DELETE FROM player_quests WHERE player_id = ? AND quest_id = ?;').run('PLY-0001', QUEST_ID);
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-IDEM-PROG%';").run();
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
  console.log('=== Progression contracts ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();
  const raw = new Database(TEST_DB);

  // 1. Movement: one day; replay does not move or spend again.
  const movePayload = { location: 'Chợ Đông Môn', idempotencyKey: 'TEST-IDEM-PROG-MOVE' };
  const m1 = await request(router, 'POST', '/api/location/switch', movePayload);
  assert.strictEqual(m1.status, 200, JSON.stringify(m1.data));
  assert.strictEqual(m1.data.idempotent, false);
  assert.strictEqual(m1.data.time.advancedDays, 1);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-02');
  assert.strictEqual(m1.data.currentLocation, 'Chợ Đông Môn');

  const m2 = await request(router, 'POST', '/api/location/switch', movePayload);
  assert.strictEqual(m2.status, 200);
  assert.strictEqual(m2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-02', 'replay must not spend another day');

  // 2. Quest accept: one phase; replay does not accept twice.
  const acceptPayload = { questId: QUEST_ID, idempotencyKey: 'TEST-IDEM-PROG-ACCEPT' };
  const q1 = await request(router, 'POST', '/api/quests/accept', acceptPayload);
  assert.strictEqual(q1.status, 200, JSON.stringify(q1.data));
  assert.strictEqual(q1.data.idempotent, false);
  assert.strictEqual(q1.data.time.phasesSpent, 1);
  assert.strictEqual(getClock(TEST_DB).phase, 1);
  assert.strictEqual(Number(scalar(raw, 'SELECT COUNT(*) AS c FROM player_quests WHERE player_id = ? AND quest_id = ?;', ['PLY-0001', QUEST_ID]).c), 1);

  const q2 = await request(router, 'POST', '/api/quests/accept', acceptPayload);
  assert.strictEqual(q2.status, 200);
  assert.strictEqual(q2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).phase, 1, 'replay must not spend another phase');
  assert.strictEqual(Number(scalar(raw, 'SELECT COUNT(*) AS c FROM player_quests WHERE player_id = ? AND quest_id = ?;', ['PLY-0001', QUEST_ID]).c), 1);

  // 3. Quest step: its own days; replay does not advance the step again.
  const cashBefore = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);
  const advancePayload = { questId: QUEST_ID, roll: 20, idempotencyKey: 'TEST-IDEM-PROG-ADVANCE' };
  const a1 = await request(router, 'POST', '/api/quests/advance', advancePayload);
  assert.strictEqual(a1.status, 200, JSON.stringify(a1.data));
  assert.strictEqual(a1.data.idempotent, false);
  assert(a1.data.result.success, 'a roll of 20 must pass the step');
  const dateAfterStep = getClock(TEST_DB).currentDate;
  const stepAfter = Number(scalar(raw, 'SELECT current_step FROM player_quests WHERE player_id = ? AND quest_id = ?;', ['PLY-0001', QUEST_ID]).current_step);
  const attemptsAfter = Number(scalar(raw, 'SELECT attempts FROM player_quests WHERE player_id = ? AND quest_id = ?;', ['PLY-0001', QUEST_ID]).attempts);
  const cashAfter = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);
  assert.notStrictEqual(dateAfterStep, '185-06-02', 'quest step must spend days');

  const a2 = await request(router, 'POST', '/api/quests/advance', advancePayload);
  assert.strictEqual(a2.status, 200);
  assert.strictEqual(a2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).currentDate, dateAfterStep, 'replay must not spend days again');
  assert.strictEqual(Number(scalar(raw, 'SELECT current_step FROM player_quests WHERE player_id = ? AND quest_id = ?;', ['PLY-0001', QUEST_ID]).current_step), stepAfter);
  assert.strictEqual(Number(scalar(raw, 'SELECT attempts FROM player_quests WHERE player_id = ? AND quest_id = ?;', ['PLY-0001', QUEST_ID]).attempts), attemptsAfter);
  assert.strictEqual(
    Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash),
    cashAfter
  );
  assert(cashAfter >= cashBefore);

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: move, quest accept and quest step charge once and replay cleanly.');
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
