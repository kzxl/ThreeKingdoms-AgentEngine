/**
 * Scenario seed verification: the scenario changes the calendar, the player's
 * starting holdings, the faction capital and the opening war.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { initializeInstanceDatabase } from '../src/modules/instances/instance-bootstrap';
import { ARCHETYPE_PRESETS } from '../src/modules/instances/instances.constants';

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.scenario-seed');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seed() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS master_scenarios (
      scenario_id TEXT PRIMARY KEY,
      name_vi TEXT NOT NULL,
      start_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );
  `);
  db.prepare(`INSERT INTO master_scenarios VALUES ('SCN-208-CHIB', 'Xích Bích Thủy Chiến', '208-07-01', 1)`).run();

  const faction = db.prepare(`
    INSERT INTO session_factions
      (faction_id, name_vi, name_en, leader_id, capital_settlement_id,
       treasury_cash, granary_grain, military_power, prestige, ideology, color_hex)
    VALUES (?, ?, ?, ?, ?, 10000, 500, 100, 100, 'MERCHANT_GUILD', '#10b981')
  `);
  faction.run('FAC-LIANG-CLAN', 'Lương', 'Liang', 'PLY-0001', 'zhuo_xian');
  faction.run('FAC-HAN', 'Hán', 'Han', 'NPC-0012', 'luo_yang');
  faction.run('FAC-YUAN-SHAO', 'Viên Thiệu', 'Yuan Shao', 'NPC-0018', 'ye_cheng');
  faction.run('FAC-CAO-CAO', 'Tào Tháo', 'Cao Cao', 'NPC-0014', 'xu_chang');
  faction.run('FAC-SUN-JIAN', 'Tôn Kiên', 'Sun Jian', 'NPC-0020', 'zhuo_xian');
  faction.run('FAC-DONG-ZHUO', 'Đổng Trác', 'Dong Zhuo', 'NPC-0005', 'luo_yang');

  const settlement = db.prepare(`
    INSERT INTO session_settlements
      (settlement_id, name_vi, name_en, province_vi, province_en, ruler_faction_id,
       garrison_troops, defense, public_order, granary_grain, treasury_cash)
    VALUES (?, ?, ?, 'P', 'P', ?, 300, 60, 70, 500, 5000)
  `);
  settlement.run('zhuo_xian', 'Trác Huyện', 'Zhuo', 'FAC-LIANG-CLAN');
  settlement.run('ping_yuan', 'Bình Nguyên', 'Pingyuan', 'FAC-HAN');
  settlement.run('xu_chang', 'Hứa Xương', 'Xuchang', 'FAC-HAN');
  settlement.run('ye_cheng', 'Nghiệp Thành', 'Yecheng', 'FAC-YUAN-SHAO');
  db.close();
}

function run() {
  // The four scenarios must not be cosmetic copies of each other.
  const seeds = require('../config/scenario-seeds.json');
  assert.notDeepStrictEqual(seeds['SCN-184-ZHOU'], seeds['SCN-190-DONG']);
  assert(seeds['SCN-190-DONG'].wars.includes('FAC-DONG-ZHUO'), '190 must fight Dong Zhuo');
  assert(seeds['SCN-190-DONG'].allies.includes('FAC-CAO-CAO'), '190 coalition includes Cao Cao');
  assert(seeds['SCN-200-GUAN'].wars.includes('FAC-YUAN-SHAO'), '200 must fight Yuan Shao');
  assert(seeds['SCN-208-CHIB'].wars.includes('FAC-CAO-CAO'), '208 must fight Cao Cao');
  assert(seeds['SCN-208-CHIB'].allies.includes('FAC-SUN-JIAN'), '208 includes the Sun alliance');

  seed();
  const db = new Database(TEST_DB);
  db.pragma('foreign_keys = OFF');
  initializeInstanceDatabase(db, {
    preset: ARCHETYPE_PRESETS['ARCH-COMMONER-YOUTH'],
    playerName: 'Scenario Heir',
    playerStyle: 'Thời Thế',
    scenarioId: 'SCN-208-CHIB'
  });
  db.pragma('foreign_keys = ON');

  const meta = db.prepare('SELECT "current_date" AS current_date, campaign_name FROM campaign_meta LIMIT 1;').get() as any;
  assert.strictEqual(meta.current_date, '208-07-01', 'scenario start date must be used');
  assert.strictEqual(meta.campaign_name, 'Xích Bích Thủy Chiến');

  const owned = db.prepare(
    `SELECT settlement_id FROM session_settlements WHERE ruler_faction_id = 'FAC-LIANG-CLAN' ORDER BY settlement_id;`
  ).all().map((row: any) => row.settlement_id);
  assert.deepStrictEqual(owned, ['ping_yuan', 'xu_chang', 'zhuo_xian'], '208 must start with three holdings');

  const capital = db.prepare(`SELECT capital_settlement_id FROM session_factions WHERE faction_id = 'FAC-LIANG-CLAN';`).get() as any;
  assert.strictEqual(capital.capital_settlement_id, 'zhuo_xian');

  const war = db.prepare(
    `SELECT relation_state FROM faction_diplomacy
     WHERE (faction_id_a = 'FAC-LIANG-CLAN' AND faction_id_b = 'FAC-CAO-CAO')
        OR (faction_id_a = 'FAC-CAO-CAO' AND faction_id_b = 'FAC-LIANG-CLAN') LIMIT 1;`
  ).get() as any;
  assert.strictEqual(war?.relation_state, 'WAR', '208 must open at war with Cao Cao');

  const ally = db.prepare(
    `SELECT relation_state FROM faction_diplomacy
     WHERE (faction_id_a = 'FAC-LIANG-CLAN' AND faction_id_b = 'FAC-SUN-JIAN')
        OR (faction_id_a = 'FAC-SUN-JIAN' AND faction_id_b = 'FAC-LIANG-CLAN') LIMIT 1;`
  ).get() as any;
  assert.strictEqual(ally?.relation_state, 'ALLY', '208 must open allied with Sun Jian');
  db.close();

  console.log('✅ Scenario seed: calendar, holdings, capital, war and alliance verified.');
}

run();
