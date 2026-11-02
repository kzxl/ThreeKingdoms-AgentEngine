/**
 * Field battle verification: a marching army that reaches a hostile city is
 * intercepted by the garrison before it can be invested.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
import { FieldBattleService } from '../src/modules/military/field-battle.service';
const { advanceTime } = require('../engine/time-manager');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.field-battle');
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
    VALUES ('TEST-FIELD', 'Field Battle', '184-02-01', '184-06-01', 5)
  `).run();
  db.prepare(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash, strategic_grain,
      war_attr, ldr_attr, int_attr)
    VALUES ('PLY-0001', 'Field Marshal', 30, 5000, 0, 100, 90, 90, 80)
  `).run();
  const faction = db.prepare(`
    INSERT INTO session_factions
      (faction_id, name_vi, name_en, leader_id, capital_settlement_id,
       treasury_cash, granary_grain, military_power, prestige, ideology, color_hex)
    VALUES (?, ?, ?, ?, ?, 10000, 500, 500, 100, 'MERCHANT_GUILD', '#10b981')
  `);
  faction.run('FAC-LIANG-CLAN', 'Lương', 'Liang', 'PLY-0001', 's0');
  faction.run('FAC-HAN', 'Hán', 'Han', 'NPC-0012', 's2');
  db.prepare(`INSERT INTO master_characters VALUES ('NPC-0012', 'Hoàng Phủ Tung', 80, 80, 80)`).run();

  const settlement = db.prepare(`
    INSERT INTO session_settlements
      (settlement_id, name_vi, name_en, province_vi, province_en, ruler_faction_id,
       garrison_troops, defense, public_order, granary_grain, treasury_cash)
    VALUES (?, ?, ?, 'P', 'P', ?, ?, 60, 70, 500, 5000)
  `);
  settlement.run('s0', 'Nhà', 'Home', 'FAC-LIANG-CLAN', 100);
  settlement.run('s1', 'Yếu Thành', 'Weak City', 'FAC-HAN', 50);
  settlement.run('s2', 'Mạnh Thành', 'Strong City', 'FAC-HAN', 5000);

  db.prepare(`
    INSERT INTO faction_diplomacy
      (id, faction_id_a, faction_id_b, relation_state, diplomatic_attitude, truce_turns_remaining, tribute_amount, updated_turn)
    VALUES ('DIP-WAR', 'FAC-LIANG-CLAN', 'FAC-HAN', 'WAR', -100, 0, 0, 5);
  `).run();

  const expedition = db.prepare(`
    INSERT INTO military_expeditions
      (expedition_id, commander_id, origin_settlement_id, target_settlement_id,
       troop_count, grain_supply_days, status, created_turn, game_date, march_days, days_remaining)
    VALUES (?, 'PLY-0001', 's0', ?, ?, 5, 'MARCHING', 5, '184-06-01', 5, 0)
  `);
  expedition.run('EXP-WIN', 's1', 2000);
  expedition.run('EXP-LOSE', 's2', 50);
  expedition.run('EXP-FRIENDLY', 's0', 500);
  db.close();
}

function run() {
  seed();
  const service = FieldBattleService.forDatabase(DatabaseService.getInstance(TEST_DB));

  // 1. A strong army beats a weak garrison and proceeds to ARRIVED.
  const win = service.resolveArrival('EXP-WIN', '184-06-06');
  assert.strictEqual(win.battle, true);
  assert.strictEqual(win.expeditionStatus, 'ARRIVED');
  assert(win.result?.winner === 'ATTACKER', '2000 vs 50 must be an attacker victory');

  // 2. A weak army is destroyed by a strong garrison and is CONCLUDED.
  const lose = service.resolveArrival('EXP-LOSE', '184-06-06');
  assert.strictEqual(lose.battle, true);
  assert.strictEqual(lose.expeditionStatus, 'CONCLUDED');
  assert(lose.result?.winner === 'DEFENDER', '50 vs 5000 must be a defender victory');

  // 3. A friendly city is not a field battle.
  const friendly = service.resolveArrival('EXP-FRIENDLY', '184-06-06');
  assert.strictEqual(friendly.battle, false);
  assert.strictEqual(friendly.reason, 'friendly-city');

  const db = new Database(TEST_DB);
  const winRow = db.prepare(`SELECT status, troop_count FROM military_expeditions WHERE expedition_id = 'EXP-WIN';`).get() as any;
  const loseRow = db.prepare(`SELECT status, troop_count FROM military_expeditions WHERE expedition_id = 'EXP-LOSE';`).get() as any;
  assert.strictEqual(winRow.status, 'ARRIVED');
  assert(Number(winRow.troop_count) > 0 && Number(winRow.troop_count) < 2000, 'survivors must be written back');
  assert.strictEqual(loseRow.status, 'CONCLUDED');
  assert(Number(loseRow.troop_count) < 50, 'a routed army cannot keep its full strength');

  // 4. The day clock itself triggers the field battle on arrival.
  db.prepare(`
    INSERT INTO military_expeditions
      (expedition_id, commander_id, origin_settlement_id, target_settlement_id,
       troop_count, grain_supply_days, status, created_turn, game_date, march_days, days_remaining)
    VALUES ('EXP-BRIDGE', 'PLY-0001', 's0', 's1', 2000, 5, 'MARCHING', 5, '184-06-01', 1, 1)
  `).run();
  db.close();
  const tick = advanceTime(TEST_DB, 1, { reason: 'field arrival' });
  assert.strictEqual(tick.success, true);
  const bridgeRow = new Database(TEST_DB).prepare(
    `SELECT status FROM military_expeditions WHERE expedition_id = 'EXP-BRIDGE';`
  ).get() as any;
  assert.strictEqual(bridgeRow.status, 'ARRIVED', 'the clock bridge must resolve the field battle before arrival');
  const arrival = (tick.expeditions?.arrived || []).find((entry: any) => entry.expeditionId === 'EXP-BRIDGE');
  assert(arrival?.battle, 'the clock report must include the field battle outcome');
  db.close();

  console.log('✅ Field battle: hostile arrival resolves tactically, survivors return, friendly city bypasses.');
}

run();
