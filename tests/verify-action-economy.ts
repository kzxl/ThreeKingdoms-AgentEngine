/**
 * Action economy verification: day clock, day-30 guard, multi-day task progress.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
const { SimulationCore } = require('../engine/sim-core');
const { getClock, canSpendActionTime, applyActionTime } = require('../engine/time-manager');
const { startTask, progressTasks } = require('../engine/task-manager');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.action-economy');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seedDatabase() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  db.prepare(`
    INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, "current_date", active_turn)
    VALUES ('TEST-ECON', 'Action Economy', '184-02-01', '184-02-01', 1);
  `).run();
  db.prepare(`
    INSERT INTO player_state (player_id, name, age, liquid_cash, safe_cash, strategic_grain)
    VALUES ('PLY-0001', 'Test Player', 21, 10000, 0, 9.6);
  `).run();
  db.prepare(`
    INSERT INTO player_skills (skill_code, skill_name, tier, current_exp, max_exp)
    VALUES ('SKL-WAR-SPEAR', 'Spear', 1, 0, 40);
  `).run();
  db.close();
}

function run() {
  seedDatabase();
  const core = new SimulationCore(TEST_DB);

  // 1. A successful action consumes one day and adds fatigue.
  const trade = core.executeAction({
    type: 'TRADE_BUY',
    item_code: 'COM-BAMBOO',
    quantity: 1,
    unit_price: 10,
    counterparty: 'Test Market',
    game_date: '184-02-01',
    idempotency_key: 'ECON-TRADE-1'
  });
  assert.strictEqual(trade.success, true);
  assert.strictEqual(trade.time.advancedDays, 1);
  assert.strictEqual(getClock(TEST_DB).currentDate, '184-02-02');
  assert.strictEqual(getClock(TEST_DB).fatigue, 1); // +2 action cost, -1 daily recovery

  // 2. Day 30 blocks day-consuming actions until the month is closed.
  const db = new Database(TEST_DB);
  db.prepare(`UPDATE campaign_meta SET "current_date" = ?`).run('184-02-30');
  db.close();
  const blocked = canSpendActionTime(TEST_DB, 'TRADE_BUY');
  assert.strictEqual(blocked.allowed, false);
  assert.strictEqual(blocked.code, 'MONTH_END');

  // 3. A multi-day task progresses with the clock and rewards EXP once.
  const task = startTask(TEST_DB, {
    taskType: 'TRAIN_SPEAR',
    titleVi: 'Luyện thương 2 ngày',
    durationDays: 2,
    gameDate: '184-02-02',
    payload: { exp_skill: 'SKL-WAR-SPEAR', exp_amount: 20 }
  });
  assert.strictEqual(task.success, true);
  let tasks = progressTasks(TEST_DB, 1);
  assert.strictEqual(tasks[0].status, 'IN_PROGRESS');
  assert.strictEqual(tasks[0].elapsed_days, 1);
  tasks = progressTasks(TEST_DB, 1);
  assert.strictEqual(tasks[0].status, 'COMPLETED');

  const db2 = new Database(TEST_DB);
  const skill = db2.prepare(`SELECT current_exp FROM player_skills WHERE skill_code = 'SKL-WAR-SPEAR';`).get() as any;
  db2.close();
  assert.strictEqual(skill.current_exp, 20);

  // 4. Month close progresses tasks through the remaining days.
  const clock = getClock(TEST_DB);
  assert.strictEqual(clock.currentDate, '184-02-30');
  assert.strictEqual(applyActionTime(TEST_DB, 'PAY_WAGES').advancedDays, 0);

  console.log('✅ Action economy: day clock, day-30 guard, task progress all verified.');
}

run();
