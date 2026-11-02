/**
 * Lineage mutations follow the core contracts: aging and mentorship turns
 * change the child exactly once, and replaying with the same idempotency key
 * returns the stored result without another year or training session.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-lineage-contracts-'));
const TEST_DB = path.join(TMP, 'session.db');
const CHILD_ID = 'CHILD-TEST-HEIR-01';

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
        current_location = 'Tư Trạch'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare(`
    UPDATE family_children
    SET age = 18, mentor_npc_id = 'NPC-0002', mentorship_turns_completed = 0,
        war_attr = 85, war_exp = 0
    WHERE child_id = ?;
  `).run(CHILD_ID);
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-IDEM-LIN%';").run();
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
  console.log('=== Lineage contracts ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();
  const raw = new Database(TEST_DB);

  // 1. Aging: one year; replay does not age again.
  const agePayload = { childId: CHILD_ID, years: 1, idempotencyKey: 'TEST-IDEM-LIN-AGE' };
  const a1 = await request(router, 'POST', '/api/lineage/children/age', agePayload);
  assert.strictEqual(a1.status, 200, JSON.stringify(a1.data));
  assert.strictEqual(a1.data.idempotent, false);
  assert.strictEqual(Number(scalar(raw, 'SELECT age FROM family_children WHERE child_id = ?;', [CHILD_ID]).age), 19);

  const a2 = await request(router, 'POST', '/api/lineage/children/age', agePayload);
  assert.strictEqual(a2.status, 200);
  assert.strictEqual(a2.data.idempotent, true);
  assert.strictEqual(Number(scalar(raw, 'SELECT age FROM family_children WHERE child_id = ?;', [CHILD_ID]).age), 19);
  assert.strictEqual(Number(scalar(raw, "SELECT COUNT(*) AS c FROM action_log WHERE idempotency_key = 'TEST-IDEM-LIN-AGE';").c), 1);

  // 2. Mentorship turn: one session; replay does not train again.
  const mentorPayload = { childId: CHILD_ID, bypassSpatialGuard: true, idempotencyKey: 'TEST-IDEM-LIN-MENTOR' };
  const m1 = await request(router, 'POST', '/api/lineage/children/mentorship-turn', mentorPayload);
  assert.strictEqual(m1.status, 200, JSON.stringify(m1.data));
  assert.strictEqual(m1.data.idempotent, false);
  const turns = Number(scalar(raw, 'SELECT mentorship_turns_completed FROM family_children WHERE child_id = ?;', [CHILD_ID]).mentorship_turns_completed);
  const warAfter = Number(scalar(raw, 'SELECT war_attr FROM family_children WHERE child_id = ?;', [CHILD_ID]).war_attr);
  assert.strictEqual(turns, 1);

  const m2 = await request(router, 'POST', '/api/lineage/children/mentorship-turn', mentorPayload);
  assert.strictEqual(m2.status, 200);
  assert.strictEqual(m2.data.idempotent, true);
  assert.strictEqual(Number(scalar(raw, 'SELECT mentorship_turns_completed FROM family_children WHERE child_id = ?;', [CHILD_ID]).mentorship_turns_completed), turns);
  assert.strictEqual(Number(scalar(raw, 'SELECT war_attr FROM family_children WHERE child_id = ?;', [CHILD_ID]).war_attr), warAfter);

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: child aging and mentorship replay cleanly.');
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
