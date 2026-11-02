/**
 * Endgame verification: the hegemony victory rule and its idempotency.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
const { applyVictoryIfEligible, evaluateVictory } = require('../src/shared/victory');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.endgame');
const TEST_DB = path.join(TEST_DIR, 'session.db');
process.env.SIM_LEGACY_PATH = path.join(TEST_DIR, 'legacy.json');

function seedDatabase() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  db.prepare(`
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, "current_date", active_turn, status)
    VALUES ('TEST-END', 'Endgame', '184-02-01', '184-06-01', 5, 'ACTIVE')
  `).run();
  db.prepare(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash, strategic_grain, ldr_attr, fame)
    VALUES ('PLY-0001', 'Hegemon', 30, 60000, 0, 100, 90, 6000)
  `).run();
  db.prepare(`
    INSERT INTO session_factions
      (faction_id, name_vi, name_en, leader_id, capital_settlement_id,
       treasury_cash, granary_grain, military_power, prestige, ideology, color_hex)
    VALUES ('FAC-LIANG-CLAN', 'Lương', 'Liang', 'PLY-0001', 's1', 10000, 500, 500, 100, 'MERCHANT_GUILD', '#10b981')
  `).run();
  const insert = db.prepare(`
    INSERT INTO session_settlements
      (settlement_id, name_vi, name_en, province_vi, province_en, ruler_faction_id,
       garrison_troops, defense, public_order, granary_grain, treasury_cash)
    VALUES (?, ?, ?, 'P', 'P', 'FAC-LIANG-CLAN', 100, 60, 70, 300, 5000)
  `);
  for (let i = 1; i <= 11; i += 1) insert.run(`s${i}`, `Thành ${i}`, `City ${i}`);
  db.close();
}

function addSettlement(id: string) {
  const db = new Database(TEST_DB);
  db.prepare(`
    INSERT INTO session_settlements
      (settlement_id, name_vi, name_en, province_vi, province_en, ruler_faction_id,
       garrison_troops, defense, public_order, granary_grain, treasury_cash)
    VALUES (?, ?, ?, 'P', 'P', 'FAC-LIANG-CLAN', 100, 60, 70, 300, 5000)
  `).run(id, id, id);
  db.close();
}

function run() {
  seedDatabase();
  const db = DatabaseService.getInstance(TEST_DB);

  // 1. Eleven settlements is not enough.
  const before = evaluateVictory(db);
  assert.strictEqual(before.victorious, false);
  assert.strictEqual(before.settlements, 11);

  // 2. The twelfth settlement plus fame completes the realm.
  addSettlement('s12');
  const check = applyVictoryIfEligible(db);
  assert.strictEqual(check.victorious, true);
  const meta = db.queryOne<any>('SELECT status, defeat_reason FROM campaign_meta LIMIT 1;');
  assert.strictEqual(meta.status, 'VICTORIOUS');
  assert(String(meta.defeat_reason).startsWith('UNIFIED_THE_REALM|12|'));

  // 3. Re-applying does not overwrite the ended campaign.
  db.execute(`UPDATE campaign_meta SET status = 'VICTORIOUS', defeat_reason = 'UNIFIED_THE_REALM|12|6000';`);
  applyVictoryIfEligible(db);
  const after = db.queryOne<any>('SELECT status, defeat_reason FROM campaign_meta LIMIT 1;');
  assert.strictEqual(after.status, 'VICTORIOUS');
  assert.strictEqual(after.defeat_reason, 'UNIFIED_THE_REALM|12|6000');

  console.log('✅ Endgame: 12 settlements + fame + stage 4 triggers VICTORIOUS exactly once.');
}

run();
