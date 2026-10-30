/**
 * Multi-day siege verification.
 *
 * A siege must persist, grind the wall/garrison day by day, resolve exactly
 * once and pay war loot through the central ledger writer.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
const { advanceTime } = require('../engine/time-manager');
const { SiegeService } = require('../src/modules/military/siege.service');
const { DatabaseService } = require('../src/core/database');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.siege-clock');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seedDatabase() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  db.pragma('foreign_keys = OFF');
  db.prepare(`
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, "current_date", active_turn)
    VALUES ('TEST-SIEGE', 'Siege Clock', '184-02-01', '184-06-10', 5)
  `).run();
  db.prepare(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash, strategic_grain)
    VALUES ('PLY-0001', 'Siege Tester', 21, 1000, 0, 50)
  `).run();
  db.prepare(`
    INSERT INTO session_factions
      (faction_id, name_vi, name_en, leader_id, capital_settlement_id,
       treasury_cash, granary_grain, military_power, prestige, ideology, color_hex)
    VALUES ('FAC-LIANG-CLAN', 'Lương', 'Liang', 'PLY-0001', 'test_city', 1000, 100, 100, 100, 'MERCHANT_GUILD', '#10b981')
  `).run();
  db.prepare(`
    INSERT INTO session_factions
      (faction_id, name_vi, name_en, leader_id, capital_settlement_id,
       treasury_cash, granary_grain, military_power, prestige, ideology, color_hex)
    VALUES ('FAC-TEST', 'Thử Bang', 'Test Faction', 'NPC-TEST', 'test_city', 1000, 100, 100, 100, 'ROYALIST', '#3b82f6')
  `).run();
  db.prepare(`
    INSERT INTO session_settlements
      (settlement_id, name_vi, name_en, province_vi, province_en, ruler_faction_id,
       garrison_troops, defense, public_order, granary_grain, treasury_cash)
    VALUES ('test_city', 'Thử Thành', 'Test City', 'Test', 'Test', 'FAC-TEST',
            300, 30, 60, 500, 10000)
  `).run();
  db.close();
}

function run() {
  seedDatabase();

  const service = SiegeService.forDatabase(DatabaseService.getInstance(TEST_DB));
  const started = service.startSiege({
    settlementId: 'test_city',
    commanderId: 'PLY-0001',
    attackerTroops: 250,
    gameDate: '184-06-10'
  });
  assert.strictEqual(started.status, 'ACTIVE');
  assert.strictEqual(started.defense, 30);

  // Re-issuing the order joins the existing investment, not a second one.
  const joined = service.startSiege({
    settlementId: 'test_city',
    commanderId: 'PLY-0001',
    attackerTroops: 250,
    gameDate: '184-06-10'
  });
  assert.strictEqual(joined.siegeId, started.siegeId, 'a second order must join the active siege');

  // 1. One day reduces the wall.
  advanceTime(TEST_DB, 1, { reason: 'siege day' });
  let db = new Database(TEST_DB);
  let settlement = db.prepare(`SELECT defense, garrison_troops FROM session_settlements WHERE settlement_id = 'test_city';`).get() as any;
  assert(Number(settlement.defense) < 30, 'the wall must be worn down after a day');
  db.close();

  // 2. Two more days break the wall: resolved once, loot paid once.
  advanceTime(TEST_DB, 2, { reason: 'siege resolution' });
  db = new Database(TEST_DB);
  settlement = db.prepare(`SELECT defense, garrison_troops, treasury_cash FROM session_settlements WHERE settlement_id = 'test_city';`).get() as any;
  const siege = db.prepare(`SELECT status, last_loot FROM session_sieges WHERE siege_id = ?;`).get(started.siegeId) as any;
  const player = db.prepare(`SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';`).get() as any;
  assert.strictEqual(siege.status, 'WON', 'the siege must resolve as a victory');
  assert(Number(siege.last_loot) > 0, 'victory must record war loot');
  assert.strictEqual(Number(player.liquid_cash), 1000 + Number(siege.last_loot), 'loot must reach the player ledger');
  assert.strictEqual(Number(settlement.treasury_cash), 10000 - Number(siege.last_loot), 'loot must leave the settlement treasury');

  // 3. Later days never pay the same siege twice.
  const cashAfterWin = Number(player.liquid_cash);
  advanceTime(TEST_DB, 5, { reason: 'aftermath' });
  const playerAfter = db.prepare(`SELECT liquid_cash FROM player_state WHERE player_id = 'PLY-0001';`).get() as any;
  const siegeAfter = db.prepare(`SELECT status, last_loot FROM session_sieges WHERE siege_id = ?;`).get(started.siegeId) as any;
  assert.strictEqual(siegeAfter.status, 'WON');
  assert.strictEqual(Number(playerAfter.liquid_cash), cashAfterWin, 'a resolved siege must not loot again');
  db.close();

  console.log('✅ Siege clock: persistent investment, daily damage, single resolution and loot verified.');
}

run();
