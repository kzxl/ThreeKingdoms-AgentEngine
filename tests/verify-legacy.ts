/**
 * NG+ legacy verification.
 *
 * A victorious or finally defeated campaign leaves one campaign_legacy row;
 * the next instance bootstrapped from the same database line receives a 10%
 * net-worth cash bonus (capped) and the family legacy license.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
import { initializeInstanceDatabase } from '../src/modules/instances/instance-bootstrap';
import { ARCHETYPE_PRESETS } from '../src/modules/instances/instances.constants';
const { applyVictoryIfEligible, recordLegacy } = require('../src/shared/victory');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.legacy');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seedVictory() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  db.prepare(`
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, "current_date", active_turn, status)
    VALUES ('TEST-LEGACY', 'Legacy', '184-02-01', '185-06-01', 16, 'ACTIVE')
  `).run();
  db.prepare(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash, strategic_grain, ldr_attr, fame)
    VALUES ('PLY-0001', 'First Lord', 40, 80000, 0, 100, 90, 7000)
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
  for (let i = 1; i <= 12; i += 1) insert.run(`s${i}`, `Thành ${i}`, `City ${i}`);
  db.close();
}

function run() {
  seedVictory();
  const db = DatabaseService.getInstance(TEST_DB);
  applyVictoryIfEligible(db);

  const legacy = db.queryOne<any>('SELECT * FROM campaign_legacy LIMIT 1;');
  assert(legacy, 'victory must write a legacy row');
  assert.strictEqual(legacy.outcome, 'VICTORIOUS');
  assert.strictEqual(Number(legacy.settlements), 12);
  assert(Number(legacy.net_worth) >= 80000, 'legacy must record net worth');

  // A final defeat overwrites the same campaign legacy with DEFEATED.
  recordLegacy(db, 'DEFEATED', 'Tử Chiến');
  const defeated = db.queryOne<any>('SELECT outcome, title_vi FROM campaign_legacy LIMIT 1;');
  assert.strictEqual(defeated.outcome, 'DEFEATED');
  assert.strictEqual(defeated.title_vi, 'Tử Chiến');

  // The next campaign in the same line gets 10% of legacy net worth (capped).
  // Bootstrap clears campaign/history tables but deliberately keeps legacy.
  const next = new Database(TEST_DB);
  next.pragma('foreign_keys = OFF');
  initializeInstanceDatabase(next, {
    preset: ARCHETYPE_PRESETS['ARCH-COMMONER-YOUTH'],
    playerName: 'Heir Apparent',
    playerStyle: 'Kế Nghiệp'
  });
  next.pragma('foreign_keys = ON');
  const player = next.prepare(`SELECT liquid_cash, special_licenses FROM player_state WHERE player_id = 'PLY-0001';`).get() as any;
  assert.strictEqual(Number(player.liquid_cash), 100 + 8000, '10% legacy bonus must be added to starting cash');
  assert(String(player.special_licenses).includes('Di Sản Tổ Tiên'), 'legacy license must be granted');
  next.close();

  console.log('✅ Legacy/NG+: victory and defeat records, capped cash bonus and legacy license verified.');
}

run();
