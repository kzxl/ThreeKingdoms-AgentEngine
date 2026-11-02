/**
 * AI war verification: a strong AI faction dispatches one army per month,
 * the day clock marches it, and a won field battle captures the city.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
import { AiArmyService } from '../src/modules/military/ai-army.service';
const { advanceTime } = require('../engine/time-manager');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.ai-war');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seed() {
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
    CREATE TABLE IF NOT EXISTS master_characters (
      npc_id TEXT PRIMARY KEY,
      name_vi TEXT NOT NULL,
      war_attr INTEGER NOT NULL DEFAULT 60,
      ldr_attr INTEGER NOT NULL DEFAULT 60,
      int_attr INTEGER NOT NULL DEFAULT 60
    );
  `);
  db.prepare(`
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, "current_date", active_turn)
    VALUES ('TEST-AIWAR', 'AI War', '184-02-01', '184-06-01', 5)
  `).run();
  db.prepare(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash, strategic_grain,
      war_attr, ldr_attr, int_attr)
    VALUES ('PLY-0001', 'Player', 30, 5000, 0, 100, 60, 60, 60)
  `).run();

  const faction = db.prepare(`
    INSERT INTO session_factions
      (faction_id, name_vi, name_en, leader_id, capital_settlement_id,
       treasury_cash, granary_grain, military_power, prestige, ideology, color_hex)
    VALUES (?, ?, ?, ?, ?, 10000, 500, ?, 100, 'ROYALIST', '#3b82f6')
  `);
  faction.run('FAC-LIANG-CLAN', 'Lương', 'Liang', 'PLY-0001', 's0', 100);
  faction.run('FAC-YUAN-SHAO', 'Viên Thiệu', 'Yuan Shao', 'NPC-0018', 's1', 8000);
  faction.run('FAC-HAN', 'Hán', 'Han', 'NPC-0012', 's3', 300);
  db.prepare(`INSERT INTO master_characters VALUES ('NPC-0018', 'Viên Thiệu', 80, 80, 80)`).run();
  db.prepare(`INSERT INTO master_characters VALUES ('NPC-0012', 'Hoàng Phủ Tung', 70, 70, 70)`).run();

  const settlement = db.prepare(`
    INSERT INTO session_settlements
      (settlement_id, name_vi, name_en, province_vi, province_en, ruler_faction_id,
       garrison_troops, defense, public_order, granary_grain, treasury_cash)
    VALUES (?, ?, ?, 'P', 'P', ?, ?, 60, 70, 500, 5000)
  `);
  settlement.run('s0', 'Nhà', 'Home', 'FAC-LIANG-CLAN', 100);
  settlement.run('s1', 'Viên Căn', 'Yuan Base', 'FAC-YUAN-SHAO', 100);
  settlement.run('s2', 'Hán Yếu', 'Han Weak', 'FAC-HAN', 20);
  settlement.run('s3', 'Hán Căn', 'Han Base', 'FAC-HAN', 20);

  db.prepare(`
    INSERT INTO faction_diplomacy
      (id, faction_id_a, faction_id_b, relation_state, diplomatic_attitude, truce_turns_remaining, tribute_amount, updated_turn)
    VALUES ('DIP-AI', 'FAC-YUAN-SHAO', 'FAC-HAN', 'WAR', -100, 0, 0, 5);
  `).run();
  db.close();
}

function run() {
  seed();
  const service = AiArmyService.forDatabase(DatabaseService.getInstance(TEST_DB));
  const dispatched = service.simulateMonthly(5, '184-06-01');

  assert.strictEqual(dispatched.length, 1, 'only the strong AI faction dispatches');
  assert.strictEqual(dispatched[0].factionId, 'FAC-YUAN-SHAO');
  assert(dispatched[0].troops >= 150, 'AI army must carry troops');
  assert.strictEqual(dispatched[0].marchDays >= 1, true);

  // Busy faction cannot dispatch a second army in the same month.
  const again = service.simulateMonthly(5, '184-06-01');
  assert.strictEqual(again.length, 0, 'an active expedition blocks a second dispatch');

  // March the army: the weak Han garrison is beaten and the city changes hands.
  const tick = advanceTime(TEST_DB, 5, { reason: 'AI march' });
  assert.strictEqual(tick.success, true);
  const db = new Database(TEST_DB);
  const expedition = db.prepare(
    `SELECT status, troop_count FROM military_expeditions WHERE expedition_id = ?;`
  ).get(dispatched[0].expeditionId) as any;
  const captured = db.prepare(
    `SELECT COUNT(*) AS c FROM session_settlements WHERE ruler_faction_id = 'FAC-YUAN-SHAO';`
  ).get() as any;
  const event = db.prepare(
    `SELECT COUNT(*) AS c FROM faction_political_events WHERE event_type = 'AI_CONQUEST';`
  ).get() as any;
  assert.strictEqual(expedition.status, 'CONCLUDED', 'the AI expedition concludes after capture');
  assert(Number(captured.c) >= 2, 'the AI faction must own its capital plus the captured city');
  assert(Number(event.c) >= 1, 'the capture must be chronicled');
  db.close();

  console.log('✅ AI war: one army per faction, day-clock march, field battle and capture verified.');
}

run();
