/**
 * Life wiring: the life-sim systems that already existed must actually apply
 * their effects — mentorship EXP, child growth focus, household role bonuses
 * and the virtue reputation discount.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-life-wiring-'));
const TEST_DB = path.join(TMP, 'session.db');
const CHILD_ID = 'CHILD-TEST-HEIR-01';

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', defeat_reason = NULL, distress_months = 0,
        "current_date" = '185-06-01', active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state
    SET liquid_cash = 100000, safe_cash = 0, fatigue = 0, health = 100, morale = 100,
        virtue = 50, current_location = 'Tư Trạch'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare('DELETE FROM player_skills WHERE skill_code IN (?, ?);').run('SKL-WAR-DUEL', 'SKL-TAC-STRAT');
  db.prepare(`
    UPDATE family_children
    SET age = 16, mentor_npc_id = 'NPC-0002', mentorship_turns_completed = 0,
        war_attr = 50, int_attr = 50, ldr_attr = 50, pol_attr = 50,
        com_attr = 50, log_attr = 50, cra_attr = 50,
        growth_focus = 'WARFARE'
    WHERE child_id = ?;
  `).run(CHILD_ID);
  db.close();
}

function scalar(db: Database.Database, sql: string, params: any[] = []): any {
  return db.prepare(sql).get(...params) as any;
}

async function run(): Promise<void> {
  console.log('=== Life wiring ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const raw = new Database(TEST_DB);

  // 1. Kizuna mentorship awards real skill EXP.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DailyInteractionEngine } = require('../src/modules/social-kizuna/daily-interaction.engine');
  const engine = DailyInteractionEngine.getInstance();
  let expAwarded: any = null;
  for (let i = 0; i < 25 && !expAwarded; i += 1) {
    const result = engine.executeDailyInteraction('NPC-0002', 'LEARN_MENTOR');
    if (result.deltas?.expGained) expAwarded = result.deltas.expGained;
  }
  assert(expAwarded, 'a successful mentorship roll must return expGained');
  assert.strictEqual(expAwarded.skill, 'SKL-WAR-DUEL');
  const learned = raw.prepare('SELECT tier, current_exp FROM player_skills WHERE skill_code = ?;').get('SKL-WAR-DUEL') as any;
  assert(learned, 'mentorship must create the player skill row');
  assert(Number(learned.tier) >= 1);

  // 2. Growth focus biases the mentorship gain: WARFARE 12 -> 15 WAR.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { FamilyLineageService } = require('../src/modules/lineage-succession/family-lineage.service');
  const lineage = FamilyLineageService.getInstance(TEST_DB);
  const focused = lineage.executeMentorshipTurn(CHILD_ID);
  assert.strictEqual(focused.statIncreases.war, 15);
  assert.strictEqual(Number(scalar(raw, 'SELECT war_attr FROM family_children WHERE child_id = ?;', [CHILD_ID]).war_attr), 65);

  raw.prepare(`
    UPDATE family_children
    SET war_attr = 50, ldr_attr = 50, int_attr = 50, pol_attr = 50,
        com_attr = 50, log_attr = 50, cra_attr = 50, growth_focus = 'BALANCED'
    WHERE child_id = ?;
  `).run(CHILD_ID);
  const balanced = lineage.executeMentorshipTurn(CHILD_ID);
  assert.strictEqual(balanced.statIncreases.war, 12);

  // 3. Virtue lowers the specialist signing bonus.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { SpecialistWorkforceService } = require('../src/modules/professions/features/workforce/specialist-workforce.service');
  const workforce = SpecialistWorkforceService.getInstance(DatabaseService.getInstance());
  const listAt50 = workforce.getAvailableSpecialists(undefined, 'PLY-0001');
  const target = listAt50.find((row: any) => row.signingBonus > 1);
  assert(target, 'test database must expose a specialist candidate');
  const bonusAt50 = target.effectiveSigningBonus;
  raw.prepare("UPDATE player_state SET virtue = 100 WHERE player_id = 'PLY-0001';").run();
  const listAt100 = workforce.getAvailableSpecialists(undefined, 'PLY-0001');
  const targetAt100 = listAt100.find((row: any) => row.npcId === target.npcId);
  assert(bonusAt50 > targetAt100.effectiveSigningBonus, 'virtue must reduce the signing bonus');
  assert(targetAt100.virtueDiscount > 0);

  // 4. Enterprise supervisor bonus raises settlement income through the one
  // business-economics writer.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { settleBusinessMonth } = require('../engine/business-economics');
  const business = {
    tier: 1,
    efficiency_multiplier: 1,
    current_workforce: 2,
    safe_cash: 1000,
    monthly_rent: 0,
    debt: 0
  };
  const staff = [{ monthly_wage: 0 }, { monthly_wage: 0 }];
  const base = settleBusinessMonth({ ...business }, staff);
  const supervised = settleBusinessMonth({ ...business, household_efficiency_multiplier: 1.15 }, staff);
  assert(supervised.grossIncome > base.grossIncome, 'ENTERPRISE_SUPERVISOR must raise gross income');

  raw.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: mentorship EXP, growth focus, virtue discount and supervisor bonus are wired.');
}

function cleanup(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../src/core/database').DatabaseService.resetInstance();
  } catch { /* already closed */ }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

try {
  run().then(() => cleanup()).catch(error => {
    console.error(error);
    cleanup();
    process.exit(1);
  });
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
