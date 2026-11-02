/**
 * Content-depth verification:
 * - authored event choices now pay fame, attribute EXP, sentiment and items;
 * - required stats block participation;
 * - migration 028 adds location keywords and regional discovery loot.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
const { EventManager } = require('../engine/event-manager');
const migration028 = require('../tools/migrations/028-discovery-location-loot');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.content-depth');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seedDatabase() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS master_events (
      event_id TEXT PRIMARY KEY,
      name_vi TEXT NOT NULL,
      name_en TEXT NOT NULL,
      historical_year INTEGER,
      season TEXT,
      location_id TEXT,
      primary_character_id TEXT,
      secondary_character_id TEXT,
      gameplay_trigger_type TEXT,
      summary_vi TEXT,
      summary_en TEXT,
      choices_json TEXT
    );
    CREATE TABLE IF NOT EXISTS master_items (
      item_code TEXT PRIMARY KEY,
      name_vi TEXT,
      name_en TEXT,
      category TEXT,
      current_market_price INTEGER
    );
    CREATE TABLE IF NOT EXISTS discovery_items (
      item_code TEXT PRIMARY KEY,
      tier INTEGER NOT NULL,
      min_fame INTEGER NOT NULL DEFAULT 0,
      weight REAL NOT NULL
    );
  `);
  db.prepare(`
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, "current_date", active_turn, status)
    VALUES ('TEST-CONTENT', 'Content', '184-02-01', '184-05-10', 4, 'ACTIVE')
  `).run();
  db.prepare(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash, strategic_grain,
      war_attr, int_attr, int_exp, fame)
    VALUES ('PLY-0001', 'Content Tester', 21, 5000, 0, 50, 50, 50, 0, 0)
  `).run();
  db.prepare(`INSERT INTO master_items (item_code, name_vi, name_en, category, current_market_price) VALUES ('COM-TEA-DRIED', 'Trà', 'Tea', 'GOOD', 60)`).run();
  db.prepare(`INSERT INTO master_items (item_code, name_vi, name_en, category, current_market_price) VALUES ('COM-WINE-ZHUO', 'Rượu', 'Wine', 'GOOD', 80)`).run();
  const itemInsert = db.prepare(
    `INSERT OR IGNORE INTO master_items (item_code, name_vi, name_en, category, current_market_price) VALUES (?, ?, ?, 'GOOD', 100)`
  );
  for (const code of [
    'RAW-TIMBER-OAK', 'COM-FISH-FRESH', 'RAW-IRON-ORE', 'COM-GAME-MEAT', 'COM-SALT-SEA',
    'COM-GOLD-INGOT', 'WPN-SKY-PIERCER', 'STEED-WHITE-DRAGON', 'STEED-SHADOW-RUNNER'
  ]) {
    itemInsert.run(code, code, code);
  }

  const choices = JSON.stringify([{
    choice_id: 'TEST_CHOICE',
    title_vi: 'Thử thách nội dung',
    title_en: 'Content challenge',
    outcome_type: 'CANON',
    required_stat: { war: 40 },
    rewards: {
      rep_gain: 40,
      sentiment_all: 10,
      exp_int: 30,
      items: [{ code: 'COM-TEA-DRIED', qty: 1 }]
    },
    narrative_vi: 'Bạn vượt qua thử thách và nhận phần thưởng.',
    narrative_en: 'You pass the trial and claim the reward.'
  }]);
  const blocked = JSON.stringify([{
    choice_id: 'BLOCKED',
    title_vi: 'Không đủ sức',
    title_en: 'Too weak',
    outcome_type: 'CANON',
    required_stat: { war: 99 },
    rewards: { rep_gain: 10 },
    narrative_vi: 'x', narrative_en: 'x'
  }]);

  const insert = db.prepare(`
    INSERT INTO master_events
      (event_id, name_vi, name_en, historical_year, season, location_id,
       primary_character_id, secondary_character_id, gameplay_trigger_type,
       summary_vi, summary_en, choices_json)
    VALUES (?, ?, ?, 184, 'SUMMER', 'LOC-0001', 'NPC-0001', 'NPC-0002',
            'CHOICE_EVENT', ?, ?, ?)
  `);
  insert.run('EVT-TEST-REWARD', 'Biến cố thử', 'Test Event', 'thử', 'test', choices);
  insert.run('EVT-TEST-BLOCKED', 'Biến cố khóa', 'Blocked Event', 'khóa', 'blocked', blocked);
  db.close();
}

function run() {
  seedDatabase();
  const manager = new EventManager(TEST_DB);

  // 1. Authored choice pays fame, INT EXP, sentiment and an item.
  const result = manager.participateInEvent({ eventId: 'EVT-TEST-REWARD', choiceId: 'TEST_CHOICE' });
  assert.strictEqual(result.success, true);
  assert(result.fameGained > 0, 'rep_gain must award fame');

  const db = new Database(TEST_DB);
  const player = db.prepare(`SELECT int_exp, fame FROM player_state WHERE player_id = 'PLY-0001';`).get() as any;
  assert.strictEqual(Number(player.int_exp), 30, 'exp_int must be applied');
  assert(Number(player.fame) > 0, 'fame must be persisted');
  const item = db.prepare(`SELECT quantity FROM inventory_items WHERE item_code = 'COM-TEA-DRIED';`).get() as any;
  assert.strictEqual(Number(item?.quantity), 1, 'item reward must enter the warehouse');
  const movement = db.prepare(`SELECT * FROM stock_movements WHERE movement_type = 'EVENT_REWARD';`).get() as any;
  assert(movement, 'item rewards must write a stock movement');
  const sentiment = db.prepare(`SELECT COUNT(*) AS c FROM npc_relationship_deltas;`).get() as any;
  assert(Number(sentiment.c) >= 2, 'sentiment_all must reach the event characters');

  // 2. A required stat below the threshold blocks participation.
  let blocked = false;
  try {
    manager.participateInEvent({ eventId: 'EVT-TEST-BLOCKED', choiceId: 'BLOCKED' });
  } catch (error: any) {
    blocked = /Chưa đủ điều kiện/.test(error.message);
  }
  assert.strictEqual(blocked, true, 'required_stat must block the choice');

  // 3. Migration 028 adds keywords and regional loot.
  migration028.up(db);
  const columns = db.prepare('PRAGMA table_info(discovery_items)').all().map((c: any) => c.name);
  assert(columns.includes('location_keyword'), 'discovery_items.location_keyword must exist');
  assert(columns.includes('poi_keyword'), 'discovery_items.poi_keyword must exist');
  const regional = db.prepare(
    `SELECT COUNT(*) AS c FROM discovery_items WHERE location_keyword IS NOT NULL AND location_keyword != '';`
  ).get() as any;
  assert(Number(regional.c) >= 5, 'regional discovery loot must be seeded');
  db.close();

  console.log('✅ Content depth: event rewards/stat gates and location-aware discovery verified.');
}

run();
