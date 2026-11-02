/**
 * Siege pre-battle verification.
 *
 * Opening a siege runs the same negotiation/champion-duel layer as a
 * stronghold assault: negotiation is attempted for low-LDR/high-DIP commanders,
 * a champion duel can trigger when both sides are martial, and a player death
 * aborts the investment.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
import { SiegeService } from '../src/modules/military/siege.service';

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.siege-prebattle');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seed() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS master_characters (
      npc_id TEXT PRIMARY KEY,
      name_vi TEXT NOT NULL,
      war_attr INTEGER NOT NULL DEFAULT 60,
      ldr_attr INTEGER NOT NULL DEFAULT 60
    );
  `);
  db.prepare(`
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, "current_date", active_turn)
    VALUES ('TEST-PREB', 'Prebattle', '184-02-01', '184-06-01', 5)
  `).run();
  db.prepare(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash, strategic_grain,
      war_attr, ldr_attr, dip_attr, fatigue, health, morale, fame)
    VALUES ('PLY-0001', 'Duel Tester', 25, 5000, 0, 100, 80, 50, 80, 0, 100, 100, 500)
  `).run();
  db.prepare(`
    INSERT INTO session_factions
      (faction_id, name_vi, name_en, leader_id, capital_settlement_id,
       treasury_cash, granary_grain, military_power, prestige, ideology, color_hex)
    VALUES ('FAC-LIANG-CLAN', 'Lương', 'Liang', 'PLY-0001', 'zhuo_xian', 10000, 500, 100, 100, 'MERCHANT_GUILD', '#10b981')
  `).run();
  db.prepare(`
    INSERT INTO session_factions
      (faction_id, name_vi, name_en, leader_id, capital_settlement_id,
       treasury_cash, granary_grain, military_power, prestige, ideology, color_hex)
    VALUES ('FAC-HAN', 'Hán', 'Han', 'NPC-0012', 'luo_yang', 10000, 500, 500, 100, 'ROYALIST', '#3b82f6')
  `).run();
  db.prepare(`INSERT INTO master_characters VALUES ('NPC-0012', 'Hoàng Phủ Tung', 82, 80)`).run();
  const settlement = db.prepare(`
    INSERT INTO session_settlements
      (settlement_id, name_vi, name_en, province_vi, province_en, ruler_faction_id,
       garrison_troops, defense, public_order, granary_grain, treasury_cash)
    VALUES (?, ?, ?, 'P', 'P', 'FAC-HAN', 300, 60, 70, 500, 5000)
  `);
  for (let i = 1; i <= 10; i += 1) settlement.run(`s${i}`, `Thành ${i}`, `City ${i}`);
  db.close();
}

function run() {
  seed();
  const service = SiegeService.forDatabase(DatabaseService.getInstance(TEST_DB));

  // 1. Low leadership + high diplomacy attempts negotiation.
  const first = service.startSiege({
    settlementId: 's1',
    commanderId: 'PLY-0001',
    attackerTroops: 250,
    gameDate: '184-06-01',
    preBattle: true
  });
  assert(first.preBattle, 'a siege must return its pre-battle result');
  assert.strictEqual(first.preBattle.negotiationAttempted, true, 'LDR 50 / DIP 80 must attempt negotiation');

  let db = new Database(TEST_DB);
  const stored = db.prepare(`SELECT prebattle_json FROM session_sieges WHERE siege_id = ?;`).get(first.siegeId) as any;
  assert(stored?.prebattle_json, 'the pre-battle result must be stored on the siege');
  db.close();

  // 2. Both commanders martial: a champion duel must trigger across a run of
  //    deterministic battle ids.
  let duelSeen = false;
  for (let day = 1; day <= 30 && !duelSeen; day += 1) {
    const reset = new Database(TEST_DB);
    reset.prepare(`DELETE FROM session_sieges WHERE settlement_id = 's2';`).run();
    reset.close();
    const siege = service.startSiege({
      settlementId: 's2',
      commanderId: 'PLY-0001',
      attackerTroops: 250,
      gameDate: `184-06-${String(day).padStart(2, '0')}`,
      preBattle: true
    });
    if (siege.preBattle?.duelTriggered) duelSeen = true;
  }
  assert.strictEqual(duelSeen, true, 'a champion duel must be possible in the pre-battle layer');

  console.log('✅ Siege pre-battle: negotiation attempt, champion duel and persisted log verified.');
}

run();
