/**
 * Life Layer: daily needs, phases, skill EXP, household upkeep and replay.
 * Every mutation must charge time once, award the matching LIFE skill, and
 * leave cash/stock unchanged when the same idempotency key is replayed.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-life-layer-'));
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
        "current_date" = '185-06-01', active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state
    SET liquid_cash = 10000, safe_cash = 0, strategic_grain = 5,
        fatigue = 10, morale = 50, health = 100, virtue = 50,
        current_location = 'Tư Trạch'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare(`
    UPDATE player_life_state
    SET stress = 20, last_meal_date = NULL, last_rest_date = NULL,
        last_upkeep_month = NULL, routine_streak = 0
    WHERE character_id = 'PLY-0001';
  `).run();
  db.prepare("DELETE FROM player_skills WHERE skill_code LIKE 'SKL-LIF-%';").run();
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-IDEM-LIFE%';").run();
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
  console.log('=== Life Layer ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();
  const raw = new Database(TEST_DB);

  // 1. Status exposes needs, phase and six actions.
  const status = await request(router, 'GET', '/api/life/status?characterId=PLY-0001');
  assert.strictEqual(status.status, 200, JSON.stringify(status.data));
  assert.strictEqual(status.data.status.needs.stress, 20);
  assert.strictEqual(status.data.status.actions.length, 6);
  assert(status.data.status.skills.length >= 0);

  // 2. Eat: one phase, 0.1 grain, morale up, COOK EXP, replay inert.
  const eatPayload = { actionCode: 'EAT_MEAL', idempotencyKey: 'TEST-IDEM-LIFE-EAT' };
  const e1 = await request(router, 'POST', '/api/life/act', eatPayload);
  assert.strictEqual(e1.status, 200, JSON.stringify(e1.data));
  assert.strictEqual(e1.data.idempotent, false);
  assert.strictEqual(e1.data.time.phasesSpent, 1);
  assert.strictEqual(getClock(TEST_DB).phase, 1);
  assert(Math.abs(Number(scalar(raw, "SELECT strategic_grain FROM player_state WHERE player_id = 'PLY-0001';").strategic_grain) - 4.9) < 0.001);
  assert(Number(scalar(raw, "SELECT morale FROM player_state WHERE player_id = 'PLY-0001';").morale) > 50);
  assert.strictEqual(Number(scalar(raw, "SELECT stress FROM player_life_state WHERE character_id = 'PLY-0001';").stress), 12);
  const cookExp = scalar(raw, "SELECT current_exp FROM player_skills WHERE skill_code = 'SKL-LIF-COOK';");
  assert(cookExp && Number(cookExp.current_exp) >= 8);

  const e2 = await request(router, 'POST', '/api/life/act', eatPayload);
  assert.strictEqual(e2.status, 200);
  assert.strictEqual(e2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).phase, 1, 'replay must not spend another phase');
  assert(Math.abs(Number(scalar(raw, "SELECT strategic_grain FROM player_state WHERE player_id = 'PLY-0001';").strategic_grain) - 4.9) < 0.001);

  // 3. Study: one phase, skill EXP moves once.
  const studyPayload = { actionCode: 'STUDY_TRAIN', skillCode: 'SKL-LIF-COOK', idempotencyKey: 'TEST-IDEM-LIFE-STUDY' };
  const s1 = await request(router, 'POST', '/api/life/act', studyPayload);
  assert.strictEqual(s1.status, 200, JSON.stringify(s1.data));
  assert.strictEqual(s1.data.time.phasesSpent, 1);
  const expAfterStudy = Number(scalar(raw, "SELECT current_exp FROM player_skills WHERE skill_code = 'SKL-LIF-COOK';").current_exp);
  assert(expAfterStudy >= 28);
  const s2 = await request(router, 'POST', '/api/life/act', studyPayload);
  assert.strictEqual(s2.data.idempotent, true);
  assert.strictEqual(Number(scalar(raw, "SELECT current_exp FROM player_skills WHERE skill_code = 'SKL-LIF-COOK';").current_exp), expAfterStudy);

  // 4. Household upkeep: one phase, real ledger pair, once per month.
  const cashBefore = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);
  const upkeepPayload = { actionCode: 'HOUSEHOLD_UPKEEP', idempotencyKey: 'TEST-IDEM-LIFE-UPKEEP' };
  const u1 = await request(router, 'POST', '/api/life/act', upkeepPayload);
  assert.strictEqual(u1.status, 200, JSON.stringify(u1.data));
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-02', 'third phase fills the day');
  const cashAfter = Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash);
  assert(cashAfter < cashBefore);
  const upkeepRow = scalar(raw, "SELECT txn_id FROM cashflow_ledger WHERE category = 'Life/HouseholdUpkeep' ORDER BY rowid DESC LIMIT 1;");
  assert(upkeepRow?.txn_id, 'upkeep must write a cashflow row');
  const journal = raw.prepare('SELECT debit, credit FROM account_journal WHERE txn_id = ?;').all(upkeepRow.txn_id) as any[];
  assert.strictEqual(journal.length, 2);
  assert.strictEqual(
    journal.reduce((sum, row) => sum + Number(row.debit), 0),
    journal.reduce((sum, row) => sum + Number(row.credit), 0)
  );
  const u2 = await request(router, 'POST', '/api/life/act', upkeepPayload);
  assert.strictEqual(u2.data.idempotent, true);
  assert.strictEqual(Number(scalar(raw, "SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';").liquid_cash), cashAfter);

  // 5. Sleep: one day, fatigue down, replay inert.
  const sleepPayload = { actionCode: 'SLEEP', idempotencyKey: 'TEST-IDEM-LIFE-SLEEP' };
  const z1 = await request(router, 'POST', '/api/life/act', sleepPayload);
  assert.strictEqual(z1.status, 200, JSON.stringify(z1.data));
  assert.strictEqual(z1.data.time.advancedDays, 1);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-03');
  const fatigueAfterSleep = Number(scalar(raw, "SELECT fatigue FROM player_state WHERE player_id = 'PLY-0001';").fatigue);
  assert(fatigueAfterSleep < 10);
  const z2 = await request(router, 'POST', '/api/life/act', sleepPayload);
  assert.strictEqual(z2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-03');

  // 6. Tea: one phase, relationship delta, TEA skill EXP, replay inert.
  const deltasBefore = Number(scalar(raw, "SELECT COUNT(*) AS c FROM npc_relationship_deltas WHERE npc_id = 'NPC-0002';").c);
  const teaPayload = { actionCode: 'TEA_WITH_NPC', npcId: 'NPC-0002', idempotencyKey: 'TEST-IDEM-LIFE-TEA' };
  const t1 = await request(router, 'POST', '/api/life/act', teaPayload);
  assert.strictEqual(t1.status, 200, JSON.stringify(t1.data));
  assert.strictEqual(t1.data.time.phasesSpent, 1);
  assert(Number(scalar(raw, "SELECT COUNT(*) AS c FROM npc_relationship_deltas WHERE npc_id = 'NPC-0002';").c) > deltasBefore);
  assert(scalar(raw, "SELECT 1 AS ok FROM player_skills WHERE skill_code = 'SKL-LIF-TEA';"));
  const t2 = await request(router, 'POST', '/api/life/act', teaPayload);
  assert.strictEqual(t2.data.idempotent, true);
  assert.strictEqual(getClock(TEST_DB).phase, 1);

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: daily needs, phases, skill EXP, upkeep ledger and replay.');
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
