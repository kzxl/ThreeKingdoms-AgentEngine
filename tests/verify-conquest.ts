/**
 * Conquest & Hegemon verification.
 *
 * Covers the "Con đường Chư Hầu" loop:
 * - an ARRIVED expedition invests a city and its troops man the siege;
 * - victory transfers ruler_faction_id/governor and leaves the survivors as
 *   the new garrison, while the expedition ends CONCLUDED;
 * - the player cannot siege their own city or use a marching army;
 * - war closes supply roads through enemy territory and peace reopens them;
 * - declare-war / make-peace write faction_diplomacy.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
const { advanceTime } = require('../engine/time-manager');
const { SiegeService } = require('../src/modules/military/siege.service');
const { DatabaseService } = require('../src/core/database');
const { MilitaryModule } = require('../src/modules/military/military.module');
const { FactionPoliticsModule } = require('../src/modules/faction-politics/faction-politics.module');
const { EventBus } = require('../src/core/event-bus');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.conquest');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seedDatabase() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS master_routes (
      route_id TEXT PRIMARY KEY,
      source_location_id TEXT NOT NULL,
      target_location_id TEXT NOT NULL,
      distance_li INTEGER NOT NULL,
      terrain_type TEXT NOT NULL,
      standard_march_days REAL NOT NULL,
      grain_provision_cost REAL NOT NULL,
      ambush_risk_level TEXT,
      description_vi TEXT,
      description_en TEXT
    );
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
    VALUES ('TEST-CONQUEST', 'Conquest', '184-02-01', '184-06-10', 5)
  `).run();
  db.prepare(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash, strategic_grain, war_attr)
    VALUES ('PLY-0001', 'Conqueror', 25, 1000, 0, 500, 80)
  `).run();
  db.prepare(`
    INSERT INTO session_factions
      (faction_id, name_vi, name_en, leader_id, capital_settlement_id,
       treasury_cash, granary_grain, military_power, prestige, ideology, color_hex)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'FAC-LIANG-CLAN', 'Lương Thị', 'Liang', 'PLY-0001', 'zhuo_xian',
    10000, 500, 150, 100, 'MERCHANT_GUILD', '#10b981'
  );
  db.prepare(`
    INSERT INTO session_factions
      (faction_id, name_vi, name_en, leader_id, capital_settlement_id,
       treasury_cash, granary_grain, military_power, prestige, ideology, color_hex)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'FAC-HAN', 'Đại Hán', 'Han', 'NPC-0012', 'luo_yang',
    20000, 1000, 800, 200, 'ROYALIST', '#3b82f6'
  );
  db.prepare(`
    INSERT INTO session_settlements
      (settlement_id, name_vi, name_en, province_vi, province_en, ruler_faction_id,
       governor_id, public_order, garrison_troops, defense, granary_grain, treasury_cash)
    VALUES ('zhuo_xian', 'Trác Huyện', 'Zhuo', 'U', 'You', 'FAC-LIANG-CLAN', 'PLY-0001', 80, 400, 60, 500, 5000)
  `).run();
  db.prepare(`
    INSERT INTO session_settlements
      (settlement_id, name_vi, name_en, province_vi, province_en, ruler_faction_id,
       public_order, garrison_troops, defense, granary_grain, treasury_cash)
    VALUES ('guang_zong', 'Quảng Tông', 'Guangzong', 'Ji', 'Ji', 'FAC-HAN', 60, 300, 30, 500, 10000)
  `).run();
  db.prepare(`
    INSERT INTO session_settlements
      (settlement_id, name_vi, name_en, province_vi, province_en, ruler_faction_id,
       public_order, garrison_troops, defense, granary_grain, treasury_cash)
    VALUES ('luo_yang', 'Lạc Dương', 'Luoyang', 'Si', 'Si', 'FAC-HAN', 70, 900, 90, 900, 20000)
  `).run();
  db.prepare(`
    INSERT INTO master_routes
      (route_id, source_location_id, target_location_id, distance_li, terrain_type, standard_march_days, grain_provision_cost)
    VALUES ('RT-1', 'LOC-0001', 'LOC-0003', 180, 'PLAINS', 4, 1.2),
           ('RT-2', 'LOC-0003', 'LOC-0002', 420, 'PLAINS', 7, 2.0)
  `).run();
  db.close();
}

function insertExpedition(status: string, target: string, troops: number) {
  const db = new Database(TEST_DB);
  db.prepare(`
    INSERT INTO military_expeditions
      (expedition_id, commander_id, origin_settlement_id, target_settlement_id,
       troop_count, grain_supply_days, status, created_turn, game_date,
       march_days, days_remaining, arrival_date)
    VALUES ('EXP-CONQUEST-1', 'PLY-0001', 'zhuo_xian', ?, ?, 5, ?, 5, '184-06-10', 5, 0, '184-06-10')
  `).run(target, troops, status);
  db.close();
}

function run() {
  seedDatabase();

  const service = SiegeService.forDatabase(DatabaseService.getInstance(TEST_DB));

  // 1. Own city cannot be besieged.
  assert.throws(
    () => service.startSiege({ settlementId: 'zhuo_xian', attackerTroops: 100, gameDate: '184-06-10' }),
    /chính phe mình/,
    'sieging your own settlement must be rejected'
  );

  // 2. A marching army cannot invest a city.
  insertExpedition('MARCHING', 'guang_zong', 250);
  assert.throws(
    () => service.startSiege({ settlementId: 'guang_zong', commanderId: 'PLY-0001', attackerTroops: 250, gameDate: '184-06-10', expeditionId: 'EXP-CONQUEST-1' }),
    /chưa tới nơi/,
    'a MARCHING expedition must not start a siege'
  );

  // 3. An arrived expedition binds its troops to the siege.
  let db = new Database(TEST_DB);
  db.prepare(`UPDATE military_expeditions SET status = 'ARRIVED', target_settlement_id = 'guang_zong' WHERE expedition_id = 'EXP-CONQUEST-1';`).run();
  db.close();

  const started = service.startSiege({
    settlementId: 'guang_zong',
    commanderId: 'PLY-0001',
    attackerTroops: 999,
    gameDate: '184-06-10',
    expeditionId: 'EXP-CONQUEST-1',
    preBattle: false
  });
  assert.strictEqual(started.attackerTroops, 250, 'siege troops must come from the expedition');
  db = new Database(TEST_DB);
  let expedition = db.prepare(`SELECT status FROM military_expeditions WHERE expedition_id = 'EXP-CONQUEST-1';`).get() as any;
  assert.strictEqual(expedition.status, 'BESIEGING', 'the expedition must be marked BESIEGING');
  db.close();

  // 4. Three days break the wall, transfer ownership and end the expedition.
  advanceTime(TEST_DB, 3, { reason: 'conquest' });
  db = new Database(TEST_DB);
  const settlement = db.prepare(`SELECT * FROM session_settlements WHERE settlement_id = 'guang_zong';`).get() as any;
  const siege = db.prepare(`SELECT * FROM session_sieges WHERE siege_id = ?;`).get(started.siegeId) as any;
  expedition = db.prepare(`SELECT status, troop_count FROM military_expeditions WHERE expedition_id = 'EXP-CONQUEST-1';`).get() as any;
  const event = db.prepare(`SELECT * FROM faction_political_events WHERE event_type = 'SETTLEMENT_CONQUERED';`).get() as any;
  assert.strictEqual(siege.status, 'WON', 'the siege must resolve as a victory');
  assert.strictEqual(settlement.ruler_faction_id, 'FAC-LIANG-CLAN', 'the city must change hands');
  assert.strictEqual(settlement.governor_id, 'PLY-0001', 'the player must govern the captured city');
  assert.strictEqual(Number(settlement.defense), 30, 'captured walls reset to a defensible baseline');
  assert.strictEqual(Number(settlement.garrison_troops), Number(expedition.troop_count), 'surviving attackers garrison the city');
  assert.strictEqual(expedition.status, 'CONCLUDED', 'the expedition must conclude');
  assert(event, 'a SETTLEMENT_CONQUERED chronicle event must be written');
  db.close();

  // 5. War blocks the road through enemy territory; peace reopens it.
  const military = new MilitaryModule();
  military.init({ dbPath: TEST_DB, eventBus: EventBus.getInstance() });
  assert.strictEqual(military.hasUnbrokenSupplyPath('LOC-0001', 'LOC-0002'), true, 'peace must keep the baseline road open');

  db = new Database(TEST_DB);
  db.prepare(`
    INSERT INTO faction_diplomacy
      (id, faction_id_a, faction_id_b, relation_state, diplomatic_attitude, truce_turns_remaining, tribute_amount, updated_turn)
    VALUES ('DIP-WAR', 'FAC-LIANG-CLAN', 'FAC-HAN', 'WAR', -100, 0, 0, 5);
  `).run();
  db.close();
  assert.strictEqual(military.hasUnbrokenSupplyPath('LOC-0001', 'LOC-0002'), false, 'war must sever the enemy-held road');

  db = new Database(TEST_DB);
  db.prepare(`UPDATE faction_diplomacy SET relation_state = 'TRUCE' WHERE id = 'DIP-WAR';`).run();
  db.close();
  assert.strictEqual(military.hasUnbrokenSupplyPath('LOC-0001', 'LOC-0002'), true, 'peace must reopen the road');

  // 6. Player diplomacy writes diplomacy state and chronicle.
  const politics = new FactionPoliticsModule();
  // Bind the module to this test database without running the full seeding
  // bootstrap (the fixture only owns two factions).
  (politics as any).db = DatabaseService.getInstance(TEST_DB);
  const war = politics.declareWar('FAC-HAN');
  assert.strictEqual(war.relationState, 'WAR');
  db = new Database(TEST_DB);
  let diplomacy = db.prepare(`SELECT relation_state FROM faction_diplomacy WHERE id = 'DIP-WAR';`).get() as any;
  assert.strictEqual(diplomacy.relation_state, 'WAR');
  db.close();

  const peace = politics.makePeace('FAC-HAN');
  assert.strictEqual(peace.relationState, 'TRUCE');
  db = new Database(TEST_DB);
  diplomacy = db.prepare(`SELECT relation_state, truce_turns_remaining FROM faction_diplomacy WHERE id = 'DIP-WAR';`).get() as any;
  assert.strictEqual(diplomacy.relation_state, 'TRUCE');
  assert.strictEqual(Number(diplomacy.truce_turns_remaining), 12);
  const warEvent = db.prepare(`SELECT COUNT(*) AS c FROM faction_political_events WHERE event_type IN ('WAR_DECLARED','PEACE_SIGNED');`).get() as any;
  assert(Number(warEvent.c) >= 2, 'war and peace must be chronicled');
  db.close();

  console.log('✅ Conquest: expedition-bound siege, ownership transfer, war supply blocking and peace verified.');
}

run();
