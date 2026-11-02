/**
 * Living-world clock verification.
 *
 * Two systems must move with the day clock without double-advancing:
 * - expeditions: MARCHING -> ARRIVED after their route march days;
 * - historical events: only due in their own year and season.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
const { advanceTime, getClock } = require('../engine/time-manager');
const { EventManager } = require('../engine/event-manager');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.living-world');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seedDatabase() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS military_expeditions (
      expedition_id TEXT PRIMARY KEY,
      commander_id TEXT NOT NULL,
      origin_settlement_id TEXT NOT NULL,
      target_settlement_id TEXT NOT NULL,
      troop_count INTEGER NOT NULL,
      grain_supply_days REAL NOT NULL,
      is_supplied INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'MARCHING',
      created_turn INTEGER NOT NULL,
      game_date TEXT NOT NULL,
      route_id TEXT,
      march_days INTEGER NOT NULL DEFAULT 5,
      days_remaining INTEGER NOT NULL DEFAULT 0,
      arrival_date TEXT
    );
  `);
  db.prepare(`
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, "current_date", active_turn)
    VALUES ('TEST-WORLD', 'Living World', '184-02-01', '184-05-15', 4)
  `).run();
  db.prepare(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash, strategic_grain)
    VALUES ('PLY-0001', 'World Tester', 21, 5000, 0, 100)
  `).run();
  db.prepare(`
    INSERT INTO military_expeditions
      (expedition_id, commander_id, origin_settlement_id, target_settlement_id,
       troop_count, grain_supply_days, status, created_turn, game_date,
       march_days, days_remaining, arrival_date)
    VALUES ('EXP-TEST-1', 'PLY-0001', 'zhuo_xian', 'ye_cheng', 300, 5, 'MARCHING', 4, '184-05-15', 5, 5, '184-05-20')
  `).run();
  db.close();
}

function seedEvents() {
  const db = new Database(TEST_DB);
  db.exec(`
    CREATE TABLE IF NOT EXISTS master_events (
      event_id TEXT PRIMARY KEY,
      name_vi TEXT NOT NULL,
      name_en TEXT NOT NULL,
      historical_year INTEGER,
      season TEXT,
      location_id TEXT,
      summary_vi TEXT,
      summary_en TEXT,
      choices_json TEXT
    );
  `);
  db.prepare(`INSERT INTO master_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`).run(
    'EVT-184-SUMMER', 'Biến Cố Mùa Hạ', 'Summer Event', 184, 'SUMMER', 'LOC-0001', 'hạ', 'summer'
  );
  db.prepare(`INSERT INTO master_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`).run(
    'EVT-184-SPRING', 'Biến Cố Mùa Xuân', 'Spring Event', 184, 'SPRING', 'LOC-0001', 'xuân', 'spring'
  );
  db.prepare(`INSERT INTO master_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`).run(
    'EVT-190-SUMMER', 'Biến Cố Năm 190', 'Event of 190', 190, 'SUMMER', 'LOC-0001', 'sau', 'later'
  );
  db.close();
}

function run() {
  seedDatabase();
  seedEvents();

  // 1. One day decrements the march counter; five days arrive exactly once.
  const first = advanceTime(TEST_DB, 1, { reason: 'march day' });
  assert.strictEqual(first.success, true);
  let row = new Database(TEST_DB).prepare(
    `SELECT status, days_remaining FROM military_expeditions WHERE expedition_id = 'EXP-TEST-1';`
  ).get() as any;
  assert.strictEqual(Number(row.days_remaining), 4, 'one day must leave four march days');
  assert.strictEqual(row.status, 'MARCHING');

  const second = advanceTime(TEST_DB, 4, { reason: 'arrival' });
  assert.strictEqual(second.success, true);
  row = new Database(TEST_DB).prepare(
    `SELECT status, days_remaining, arrival_date FROM military_expeditions WHERE expedition_id = 'EXP-TEST-1';`
  ).get() as any;
  assert.strictEqual(row.status, 'ARRIVED', 'five march days must arrive');
  assert.strictEqual(Number(row.days_remaining), 0);
  assert.strictEqual(row.arrival_date, '184-05-20', 'arrival date must be the route ETA');

  // 2. Later days never re-open or double-advance an arrived expedition.
  const third = advanceTime(TEST_DB, 7, { reason: 'occupation' });
  assert.strictEqual(third.success, true);
  row = new Database(TEST_DB).prepare(
    `SELECT status, days_remaining FROM military_expeditions WHERE expedition_id = 'EXP-TEST-1';`
  ).get() as any;
  assert.strictEqual(row.status, 'ARRIVED');
  assert.strictEqual(Number(row.days_remaining), 0);
  assert.strictEqual(getClock(TEST_DB).currentDate, '184-05-27');

  // 3. Events are due only in their own year and season.
  const manager = new EventManager(TEST_DB);
  const events = manager.getActiveEvents('LOC-0001', '184-05-20', 4);
  const dueIds = events.filter((event: any) => event.isDue).map((event: any) => event.event_id);
  assert.deepStrictEqual(dueIds.sort(), ['EVT-184-SUMMER'], 'only the 184 summer event is due');
  const spring = events.find((event: any) => event.event_id === 'EVT-184-SPRING');
  assert.strictEqual(spring.isDue, false, 'a spring event is not due in summer');
  const later = events.find((event: any) => event.event_id === 'EVT-190-SUMMER');
  assert.strictEqual(later, undefined, 'a future-year event must not be listed in 184');

  console.log('✅ Living world: expedition march/arrival and date-gated events verified.');
}

run();
