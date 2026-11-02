/**
 * Lifecycle clock verification.
 *
 * The monthly close owns the family clock:
 * - every 12 closed months the protagonist, named NPCs and children age by 1;
 * - player pregnancy advances one stage per month;
 * - a retried close never advances the same month twice.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
const { GameplayManager } = require('../engine/gameplay-manager');
const { getClock } = require('../engine/time-manager');
const { getFamilyLineageService } = require('../engine/lineage-bridge');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.lifecycle-clock');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seedDatabase() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  db.prepare(`
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, "current_date", active_turn)
    VALUES ('TEST-LIFE', 'Lifecycle Clock', '184-02-01', '184-02-01', 1)
  `).run();
  db.prepare(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash, strategic_grain)
    VALUES ('PLY-0001', 'Life Tester', 20, 5000, 0, 20)
  `).run();
  db.prepare(`
    INSERT INTO npc_state (npc_id, name, age) VALUES ('NPC-0007', 'Old Foreman', 40)
  `).run();
  db.close();
}

function run() {
  seedDatabase();

  // Family tables are created by the lineage service, not schema.sql.
  const lineage = getFamilyLineageService(TEST_DB);
  assert(lineage, 'lineage service must load under tsx');
  const db = new Database(TEST_DB);
  db.prepare(`
    INSERT INTO family_spouses
      (marriage_id, husband_id, wife_id, wife_name_vi, wife_name_en, marriage_date, marriage_turn, pregnancy_stage)
    VALUES ('MAR-001', 'PLY-0001', 'NPC-WIFE', 'Hiền Thê', 'Wife', '184-02-01', 1, 1)
  `).run();
  db.prepare(`
    INSERT INTO family_children
      (child_id, father_id, mother_id, mother_name_vi, name_vi, name_en, gender, birth_date, birth_turn, age)
    VALUES ('CHD-001', 'PLY-0001', 'NPC-WIFE', 'Hiền Thê', 'Lương Tử', 'Liang Child', 'MALE', '184-02-01', 1, 10)
  `).run();
  db.close();

  const gm = new GameplayManager(TEST_DB);

  // 1. The first two closes advance the player's pregnancy 1 -> 2 -> 3.
  gm.advanceTurn({ notes: 'month 1' });
  let row = new Database(TEST_DB).prepare(`SELECT pregnancy_stage FROM family_spouses WHERE marriage_id = 'MAR-001';`).get() as any;
  assert.strictEqual(Number(row.pregnancy_stage), 2, 'pregnancy must advance to stage 2');
  gm.advanceTurn({ notes: 'month 2' });
  row = new Database(TEST_DB).prepare(`SELECT pregnancy_stage FROM family_spouses WHERE marriage_id = 'MAR-001';`).get() as any;
  assert.strictEqual(Number(row.pregnancy_stage), 3, 'pregnancy must advance to stage 3');

  // 2. Ten more closes reach the campaign anniversary: everyone ages one year.
  for (let month = 3; month <= 12; month += 1) {
    gm.advanceTurn({ notes: `month ${month}` });
  }
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-02-01', 'twelve closes must reach 185-02-01');
  const ages = new Database(TEST_DB).prepare(`
    SELECT (SELECT age FROM player_state LIMIT 1) AS playerAge,
           (SELECT age FROM npc_state WHERE npc_id = 'NPC-0007') AS npcAge,
           (SELECT age FROM family_children WHERE child_id = 'CHD-001') AS childAge;
  `).get() as any;
  assert.strictEqual(Number(ages.playerAge), 21, 'player must age one year');
  assert.strictEqual(Number(ages.npcAge), 41, 'named NPC must age one year');
  assert.strictEqual(Number(ages.childAge), 11, 'child must age one year');

  // 3. Retrying the same close is a no-op: no second pregnancy or age bump.
  const retry = GameplayManager.closeMonthFor(TEST_DB, {
    endedDate: '185-01-30',
    nextDate: '185-02-01',
    turnOverride: 11
  });
  assert.strictEqual(retry.skipped, true, 'committed month close must be skipped on retry');
  const afterRetry = new Database(TEST_DB).prepare(`
    SELECT pregnancy_stage FROM family_spouses WHERE marriage_id = 'MAR-001';
  `).get() as any;
  assert.strictEqual(Number(afterRetry.pregnancy_stage), 3, 'retry must not advance pregnancy again');

  console.log('✅ Lifecycle clock: yearly aging, monthly pregnancy, idempotent close verified.');
}

run();
