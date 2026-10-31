/**
 * Day phases: a day has three slots. Administrative actions spend one phase;
 * a whole-day action resets the phase. Three admin actions advance one day.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-phases-'));
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
        "current_date" = '185-06-01', current_phase = 0, active_turn = 16
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare("UPDATE player_state SET fatigue = 0, health = 100 WHERE player_id = 'PLY-0001';").run();
  db.prepare("DELETE FROM player_quests WHERE player_id = 'PLY-0001';").run();
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
  console.log('=== Day phases ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  const { DatabaseService } = require('../src/core/database');
  const { chargePlayerAction } = require('../src/shared/action-time');
  const { createGrandStrategyRouter } = require('../src/server/main');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  const router = createGrandStrategyRouter();

  // 1. Three admin phases fill one day.
  const first = chargePlayerAction(db.path, 'ADMIN_ACTION', null, 'admin 1');
  assert.strictEqual(first.phase, 1);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-01');
  chargePlayerAction(db.path, 'ADMIN_ACTION', null, 'admin 2');
  assert.strictEqual(getClock(TEST_DB).phase, 2);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-01');
  chargePlayerAction(db.path, 'ADMIN_ACTION', null, 'admin 3');
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-02');
  assert.strictEqual(getClock(TEST_DB).phase, 0);

  // 2. A whole-day action resets the phase.
  const raw = new Database(TEST_DB);
  raw.prepare('UPDATE campaign_meta SET current_phase = 2;').run();
  raw.close();
  const trade = chargePlayerAction(db.path, 'TRADE_BUY', null, 'trade');
  assert.strictEqual(trade.advancedDays, 2);
  assert.strictEqual(getClock(TEST_DB).phase, 0);

  // 3. The quest accept route spends one phase.
  const beforeDate = getClock(TEST_DB).currentDate;
  const accepted = await request(router, 'POST', '/api/quests/accept', { questId: 'Q-MARTIAL-01' });
  assert.strictEqual(accepted.status, 200, JSON.stringify(accepted.data));
  assert.strictEqual(accepted.data.time.phasesSpent, 1);
  assert.strictEqual(getClock(TEST_DB).currentDate, beforeDate);
  assert.strictEqual(getClock(TEST_DB).phase, 1);

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: three phases per day, day reset, and route wiring.');
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
