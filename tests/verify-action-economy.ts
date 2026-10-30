/**
 * Action economy verification: day clock, automatic month boundary, multi-day task progress.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
const { SimulationCore } = require('../engine/sim-core');
const { getClock, canSpendActionTime, applyActionTime } = require('../engine/time-manager');
const { startTask, progressTasks, listTasks } = require('../engine/task-manager');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'tests', '.action-economy');
const TEST_DB = path.join(TEST_DIR, 'session.db');

function seedDatabase() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS master_items (
      item_code TEXT PRIMARY KEY,
      name_vi TEXT NOT NULL,
      name_en TEXT NOT NULL,
      category TEXT NOT NULL,
      unit_vi TEXT NOT NULL,
      unit_en TEXT NOT NULL,
      baseline_peace_price INTEGER NOT NULL,
      current_market_price INTEGER NOT NULL
    );
    INSERT INTO master_items VALUES ('COM-BAMBOO', 'Tre Khô', 'Cured Bamboo', 'Raw Material', 'Bó', 'Bundle', 15, 15);
  `);
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

  // 1. A market action commits two days and adds fatigue.
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
  assert.strictEqual(trade.time.advancedDays, 2);
  assert.strictEqual(getClock(TEST_DB).currentDate, '184-02-03');
  assert.strictEqual(getClock(TEST_DB).fatigue, 2); // +4 action cost, -2 daily recovery

  // 2. Day 30 no longer blocks: the action rolls into the next month and the
  //    month close runs automatically at the boundary.
  const db = new Database(TEST_DB);
  db.prepare(`UPDATE campaign_meta SET "current_date" = ?`).run('184-02-30');
  db.close();
  const allowed = canSpendActionTime(TEST_DB, 'TRADE_BUY');
  assert.strictEqual(allowed.allowed, true, 'day 30 must allow day-consuming actions');
  const crossed = applyActionTime(TEST_DB, 'TRADE_BUY', null, 'rollover');
  assert.strictEqual(crossed.success, true);
  assert.strictEqual(crossed.advancedDays, 2);
  assert.strictEqual(crossed.monthsClosed.length, 1, 'crossing day 30 must close the month');
  assert.strictEqual(getClock(TEST_DB).currentDate, '184-03-02');
  assert.strictEqual(getClock(TEST_DB).activeTurn, 2, 'month close must advance active_turn');

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

  // 3b. Replaying the same campaign date must not advance a task twice
  //     (advanceTurn retries and duplicate time-spend requests).
  const replayTask = startTask(TEST_DB, {
    taskType: 'TRAIN_REPLAY',
    titleVi: 'Kiểm tra idempotency',
    durationDays: 3,
    gameDate: '184-02-03',
    payload: {}
  });
  progressTasks(TEST_DB, 1, '184-02-04');
  progressTasks(TEST_DB, 1, '184-02-04');
  const replay = listTasks(TEST_DB).find((task: any) => task.task_id === replayTask.taskId);
  assert.strictEqual(replay.elapsed_days, 1, 'same-date replay must not double task progress');

  // 4. A zero-day action neither moves the clock nor closes a month.
  const clock = getClock(TEST_DB);
  assert.strictEqual(clock.currentDate, '184-03-02');
  const noDay = applyActionTime(TEST_DB, 'PAY_WAGES');
  assert.strictEqual(noDay.advancedDays, 0);
  assert.strictEqual(noDay.monthsClosed.length, 0);
  assert.strictEqual(getClock(TEST_DB).currentDate, clock.currentDate);

  console.log('✅ Action economy: day clock, automatic month boundary, task progress all verified.');
}

run();
