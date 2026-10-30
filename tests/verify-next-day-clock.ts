/**
 * Next-day clock verification.
 *
 * Days are the only time unit. Advancing one day must:
 * - move the calendar exactly one day,
 * - charge daily grain and recover daily fatigue,
 * - close the month automatically when the calendar reaches the 1st,
 * - never close the same month twice.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
const { GameplayManager } = require('../engine/gameplay-manager');
const { getClock } = require('../engine/time-manager');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.next-day-clock');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seedDatabase() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  db.prepare(`
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, "current_date", active_turn)
    VALUES ('TEST-DAY', 'Next Day Clock', '184-02-01', '184-02-27', 1)
  `).run();
  db.prepare(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash, strategic_grain, fatigue)
    VALUES ('PLY-0001', 'Day Tester', 21, 1000, 0, 10.0, 10)
  `).run();
  db.close();
}

function run() {
  seedDatabase();
  const gm = new GameplayManager(TEST_DB);

  // 1. One day moves the clock by exactly one day and charges upkeep.
  const first = gm.advanceNextDay();
  assert.strictEqual(first.success, true);
  assert.strictEqual(first.daysAdvanced, 1);
  assert.strictEqual(first.nextDate, '184-02-28');
  assert.strictEqual(first.monthClosedCount, 0, 'day 28 must not close a month');
  assert.strictEqual(getClock(TEST_DB).fatigue, 9, 'daily recovery is 1');
  assert.strictEqual(Number((10 - first.grainCost).toFixed(2)), 9.98, 'daily grain upkeep is 0.02');

  // 2. Reaching the 1st closes the month automatically, exactly once.
  gm.advanceNextDay(); // 184-02-29
  gm.advanceNextDay(); // 184-02-30
  const boundary = gm.advanceNextDay(); // 184-02-30 -> 184-03-01
  assert.strictEqual(boundary.nextDate, '184-03-01');
  assert.strictEqual(getClock(TEST_DB).activeTurn, 2, 'month close advances active_turn');
  assert.strictEqual(boundary.monthClosedCount, 1, 'the boundary closes exactly one month');

  const db = new Database(TEST_DB);
  const closeRows = db.prepare(
    `SELECT COUNT(*) AS c FROM action_log WHERE action_type = 'MONTH_CLOSE' AND idempotency_key LIKE 'MONTH_CLOSE_%_2';`
  ).get() as any;
  assert.strictEqual(Number(closeRows.c), 1, 'one close marker per month');
  const turnRows = db.prepare('SELECT COUNT(*) AS c FROM turn_log WHERE turn_number = 2;').get() as any;
  assert.strictEqual(Number(turnRows.c), 1, 'one turn log row per closed month');
  db.close();

  // 3. Re-running the same close is a no-op (retry after a failed clock write).
  const retry = GameplayManager.closeMonthFor(TEST_DB, {
    endedDate: '184-02-30',
    nextDate: '184-03-01',
    turnOverride: 1
  });
  assert.strictEqual(retry.skipped, true, 'an already committed close must be skipped');
  assert.strictEqual(getClock(TEST_DB).activeTurn, 2, 'a skipped retry must not advance the turn again');

  // 4. The next day does not re-close the month.
  const after = gm.advanceNextDay();
  assert.strictEqual(after.nextDate, '184-03-02');
  assert.strictEqual(after.monthClosedCount, 0);
  assert.strictEqual(getClock(TEST_DB).activeTurn, 2);

  // 5. The legacy month-close entry point still lands on the next boundary.
  const legacy = gm.advanceTurn({ notes: 'legacy boundary' });
  assert.strictEqual(legacy.nextDate, '184-04-01');
  assert.strictEqual(legacy.monthClosedCount, 1);
  assert.strictEqual(getClock(TEST_DB).activeTurn, 3);

  console.log('✅ Next-day clock: day math, automatic month boundary, single close, legacy alias verified.');
}

run();
