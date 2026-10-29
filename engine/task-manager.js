/**
 * Active multi-day tasks. A task is created once and advances whenever the
 * campaign clock moves; it survives month closure.
 */

const { runSqlJson, runSqlExec } = require('./db-adapter');

function ensureTaskSchema(dbPath) {
  runSqlExec(dbPath, `
    CREATE TABLE IF NOT EXISTS active_tasks (
      task_id TEXT PRIMARY KEY,
      task_type TEXT NOT NULL,
      title_vi TEXT NOT NULL,
      title_en TEXT,
      start_date TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      elapsed_days INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      payload_json TEXT,
      result_json TEXT,
      last_tick_date TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    );
  `);
  // Older databases predate last_tick_date.
  const columns = runSqlJson(dbPath, `PRAGMA table_info(active_tasks);`).map(c => c.name);
  if (!columns.includes('last_tick_date')) {
    runSqlExec(dbPath, `ALTER TABLE active_tasks ADD COLUMN last_tick_date TEXT;`);
  }
}

function makeTaskId(dbPath, taskType, gameDate) {
  const row = runSqlJson(dbPath, `SELECT COUNT(*) AS count FROM active_tasks;`)[0] || { count: 0 };
  const seq = String(Number(row.count || 0) + 1).padStart(3, '0');
  return `TASK-${String(gameDate || '').replace(/-/g, '')}-${taskType}-${seq}`;
}

function startTask(dbPath, input) {
  ensureTaskSchema(dbPath);
  const {
    taskType,
    titleVi,
    titleEn = '',
    durationDays = 1,
    gameDate = '184-05-02',
    payload = {}
  } = input || {};

  if (!taskType || !titleVi) {
    return { success: false, error: 'Task type and title are required.' };
  }
  const duration = Math.max(1, Math.min(90, Number(durationDays) || 1));
  const taskId = makeTaskId(dbPath, taskType, gameDate);
  runSqlExec(
    dbPath,
    `INSERT INTO active_tasks
       (task_id, task_type, title_vi, title_en, start_date, duration_days, elapsed_days, status, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'IN_PROGRESS', ?);`,
    [taskId, taskType, titleVi, titleEn, gameDate, duration, JSON.stringify(payload || {})]
  );
  return {
    success: true,
    taskId,
    taskType,
    titleVi,
    titleEn,
    durationDays: duration,
    elapsedDays: 0,
    status: 'IN_PROGRESS'
  };
}

function progressTasks(dbPath, days, asOfDate = null) {
  ensureTaskSchema(dbPath);
  const amount = Math.max(0, Number(days) || 0);
  if (amount === 0) return [];

  const tasks = runSqlJson(dbPath, `SELECT * FROM active_tasks WHERE status = 'IN_PROGRESS';`);
  for (const task of tasks) {
    // Idempotent per campaign date: replaying the same close/advance must not
    // move a task twice.
    if (asOfDate && task.last_tick_date === asOfDate) continue;
    const duration = Math.max(1, Number(task.duration_days) || 1);
    const elapsed = Math.min(duration, Number(task.elapsed_days || 0) + amount);
    if (elapsed >= duration) {
      const reward = applyTaskReward(dbPath, task);
      runSqlExec(
        dbPath,
        `UPDATE active_tasks
           SET elapsed_days = ?, status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP,
               result_json = ?, last_tick_date = COALESCE(?, last_tick_date)
         WHERE task_id = ?;`,
        [elapsed, JSON.stringify(reward), asOfDate, task.task_id]
      );
    } else {
      runSqlExec(
        dbPath,
        `UPDATE active_tasks SET elapsed_days = ?, last_tick_date = COALESCE(?, last_tick_date)
         WHERE task_id = ?;`,
        [elapsed, asOfDate, task.task_id]
      );
    }
  }
  return listTasks(dbPath);
}

/**
 * Pure projection of what progressTasks would produce, for month-close reports
 * built before the atomic commit.
 */
function projectTaskProgress(tasks, days) {
  const amount = Math.max(0, Number(days) || 0);
  return tasks.map(task => {
    if (task.status !== 'IN_PROGRESS') return task;
    const duration = Math.max(1, Number(task.duration_days) || 1);
    const elapsed = Math.min(duration, Number(task.elapsed_days || 0) + amount);
    return { ...task, elapsed_days: elapsed, status: elapsed >= duration ? 'COMPLETED' : task.status };
  });
}

function applyTaskReward(dbPath, task) {
  const payload = safeJson(task.payload_json);
  const reward = { granted: false };
  if (payload.exp_skill && Number(payload.exp_amount) > 0) {
    const skill = runSqlJson(
      dbPath,
      `SELECT skill_code, tier, current_exp, max_exp FROM player_skills WHERE skill_code = ? LIMIT 1;`,
      [payload.exp_skill]
    )[0];
    if (skill) {
      let newExp = Number(skill.current_exp || 0) + Number(payload.exp_amount);
      let newTier = Number(skill.tier || 1);
      let maxExp = Number(skill.max_exp || 40);
      if (newExp >= maxExp && newTier < 5) {
        newTier += 1;
        newExp -= maxExp;
        maxExp = Math.round(maxExp * 1.5);
      }
      runSqlExec(
        dbPath,
        `UPDATE player_skills SET current_exp = ?, tier = ?, max_exp = ? WHERE skill_code = ?;`,
        [newExp, newTier, maxExp, payload.exp_skill]
      );
      reward.granted = true;
      reward.expSkill = payload.exp_skill;
      reward.expGained = Number(payload.exp_amount);
      reward.tier = newTier;
    }
  }
  return reward;
}

function listTasks(dbPath, status = null) {
  ensureTaskSchema(dbPath);
  const rows = status
    ? runSqlJson(dbPath, `SELECT * FROM active_tasks WHERE status = ? ORDER BY created_at DESC;`, [status])
    : runSqlJson(dbPath, `SELECT * FROM active_tasks ORDER BY created_at DESC;`);
  return rows.map(row => ({
    ...row,
    payload: safeJson(row.payload_json),
    result: safeJson(row.result_json),
    progress: row.duration_days > 0
      ? Math.min(1, Number(row.elapsed_days || 0) / Number(row.duration_days))
      : 0
  }));
}

function cancelTask(dbPath, taskId) {
  ensureTaskSchema(dbPath);
  const row = runSqlJson(dbPath, `SELECT status FROM active_tasks WHERE task_id = ?;`, [taskId])[0];
  if (!row) return { success: false, error: 'Task not found.' };
  if (row.status !== 'IN_PROGRESS') {
    return { success: false, error: `Task is already ${row.status}.` };
  }
  runSqlExec(dbPath, `UPDATE active_tasks SET status = 'CANCELLED' WHERE task_id = ?;`, [taskId]);
  return { success: true, taskId, status: 'CANCELLED' };
}

function safeJson(value) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch (err) {
    return { raw: value };
  }
}

module.exports = {
  ensureTaskSchema,
  startTask,
  progressTasks,
  projectTaskProgress,
  listTasks,
  cancelTask
};
