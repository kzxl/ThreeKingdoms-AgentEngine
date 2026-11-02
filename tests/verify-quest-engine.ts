/**
 * Quest engine verification: DB-authored quests, accept, d20 step checks, day
 * cost, per-step and completion rewards, and failure staying on the step.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
import { QuestService } from '../src/modules/progression/quest.service';
const migration034 = require('../tools/migrations/034-quest-engine');
const { getClock } = require('../engine/time-manager');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.quest-engine');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seed() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  migration034.up(db);
  db.prepare(`
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, "current_date", active_turn)
    VALUES ('TEST-QUEST', 'Quest', '184-02-01', '184-05-01', 4)
  `).run();
  db.prepare(`
    INSERT INTO player_state
      (player_id, name, age, liquid_cash, safe_cash, strategic_grain, fame,
       war_attr, int_attr, pol_attr, dip_attr, com_attr, cra_attr, ldr_attr)
    VALUES ('PLY-0001', 'Quest Tester', 21, 2000, 0, 50, 500,
            80, 80, 80, 80, 80, 80, 80)
  `).run();
  db.close();
}

function run() {
  seed();
  const service = QuestService.forDatabase(DatabaseService.getInstance(TEST_DB));

  const quests = service.list();
  assert.strictEqual(quests.length, 5, 'five path questlines must be seeded');
  assert(quests.every(quest => quest.steps.length === 3), 'each quest must have three steps');
  assert(quests.some(quest => quest.pathCode === 'MARTIAL'));

  const accepted = service.accept('Q-MARTIAL-01');
  assert.strictEqual(accepted.status, 'ACTIVE');

  const before = getClock(TEST_DB);
  const step1 = service.advance('Q-MARTIAL-01', 'PLY-0001', { roll: 20 });
  assert.strictEqual(step1.success, true);
  assert.strictEqual(step1.status, 'ACTIVE');
  assert.strictEqual(step1.nextStep, 1);
  assert(step1.rewards.fame > 0, 'step must award fame');
  assert(getClock(TEST_DB).currentDate !== before.currentDate, 'a quest step must consume days');

  service.advance('Q-MARTIAL-01', 'PLY-0001', { roll: 20 });
  const final = service.advance('Q-MARTIAL-01', 'PLY-0001', { roll: 20 });
  assert.strictEqual(final.status, 'COMPLETED');
  assert(final.rewards.quest && final.rewards.quest.cash > 0, 'completion must pay the quest reward');

  const db = new Database(TEST_DB);
  const row = db.prepare(`SELECT status, current_step FROM player_quests WHERE quest_id = 'Q-MARTIAL-01';`).get() as any;
  const player = db.prepare(`SELECT liquid_cash, war_exp FROM player_state WHERE player_id = 'PLY-0001';`).get() as any;
  assert.strictEqual(row.status, 'COMPLETED');
  assert.strictEqual(Number(row.current_step), 3);
  assert(Number(player.liquid_cash) > 2000, 'quest cash must reach the player ledger');
  assert(Number(player.war_exp) > 0, 'quest EXP must be written');
  db.close();

  // A failed check stays on the same step and charges fatigue.
  service.accept('Q-MERCHANT-01');
  const failed = service.advance('Q-MERCHANT-01', 'PLY-0001', { roll: 1 });
  assert.strictEqual(failed.success, false);
  assert.strictEqual(failed.status, 'ACTIVE');
  const check = new Database(TEST_DB);
  const merchant = check.prepare(`SELECT status, current_step, attempts FROM player_quests WHERE quest_id = 'Q-MERCHANT-01';`).get() as any;
  const fatigued = check.prepare(`SELECT fatigue FROM player_state WHERE player_id = 'PLY-0001';`).get() as any;
  assert.strictEqual(Number(merchant.current_step), 0, 'a failure must not advance the step');
  assert.strictEqual(Number(merchant.attempts), 1);
  assert(Number(fatigued.fatigue) >= 8, 'a failure must cost fatigue');
  check.close();

  console.log('✅ Quest engine: 5 questlines, day cost, step checks, rewards and failure path verified.');
}

run();
