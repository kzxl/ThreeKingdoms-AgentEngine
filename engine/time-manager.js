/**
 * Campaign clock helpers. Days advance through player actions; the month only
 * closes through the explicit month-close action in GameplayManager.
 *
 * This module is the single writer of `campaign_meta.current_date` and the
 * single publisher of `WORLD_DAY_TICK`. Every caller (actions, travel, explicit
 * day advance) goes through `advanceCampaignDays` so the calendar, fatigue,
 * grain upkeep, tasks and daily ticks cannot drift apart.
 */

const { runSqlJson, runSqlExec } = require('./db-adapter');
const { getActionTimeCost } = require('./action-policy');
const { progressTasks } = require('./task-manager');
const { parseGameDate, formatGameDate, addDaysToDate } = require('./date-utils');
const GAME_CONSTANTS = require('../config/game-constants.json');

const DAYS_PER_MONTH = GAME_CONSTANTS.calendar.daysPerMonth;
const GRAIN_PER_DAY = GAME_CONSTANTS.calendar.grainPerDay;
const DAILY_FATIGUE_RECOVERY = GAME_CONSTANTS.calendar.dailyFatigueRecovery;
const FATIGUE_MAX = GAME_CONSTANTS.fatigue.max;
const FALLBACK_DATE = GAME_CONSTANTS.calendar.fallbackDate;
const DATE_PATTERN = /^\d{3}-\d{2}-\d{2}$/;

// Thin adapters over engine/date-utils so there is one parser/formatter for the
// whole engine. They keep the local call signatures used below.
function parseDate(value) {
  return parseGameDate(value || FALLBACK_DATE);
}

function formatDate(year, month, day) {
  return formatGameDate(year, month, day);
}

/**
 * Calendar days are whole days. A partial day (0.5) still consumes a calendar
 * day, so normalize by ceil at the boundary instead of writing fractional
 * dates such as `184-05-2.5`.
 */
function normalizeDays(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.ceil(numeric);
}

function addDays(year, month, day, days) {
  const next = parseGameDate(addDaysToDate(formatGameDate(year, month, day), days));
  return { year: next.year, month: next.month, day: next.day };
}

function getEventBus() {
  const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
  return (gsm && ((gsm.registry && gsm.registry.ctx && gsm.registry.ctx.eventBus)
    || (gsm.utilityAi && gsm.utilityAi.ctx && gsm.utilityAi.ctx.eventBus))) || null;
}

/**
 * Publishes one WORLD_DAY_TICK per elapsed day, starting after `startDate`.
 * Returns the number of ticks published (0 when the modular engine is absent,
 * e.g. CLI/core-only runs).
 */
function publishDayTicks(startDate, days) {
  const count = normalizeDays(days);
  const eventBus = getEventBus();
  if (!eventBus || typeof eventBus.publish !== 'function' || count === 0) return 0;

  const start = parseDate(startDate);
  let published = 0;
  for (let i = 1; i <= count; i += 1) {
    const tick = addDays(start.year, start.month, start.day, i);
    try {
      eventBus.publish('WORLD_DAY_TICK', { day: tick.day, month: tick.month, year: tick.year });
      published += 1;
    } catch {
      // A subscriber failure must not abort the clock write.
    }
  }
  return published;
}

function getClock(dbPath) {
  const meta = runSqlJson(dbPath, `SELECT campaign_id, "current_date", active_turn FROM campaign_meta LIMIT 1;`)[0];
  const player = runSqlJson(dbPath, `SELECT fatigue, strategic_grain, health, morale FROM player_state LIMIT 1;`)[0] || {};
  const currentDate = meta ? meta.current_date : FALLBACK_DATE;
  const { year, month, day } = parseDate(currentDate);
  const season = month <= 3 ? 'Xuân' : (month <= 6 ? 'Hạ' : (month <= 9 ? 'Thu' : 'Đông'));
  return {
    campaignId: meta ? meta.campaign_id : null,
    currentDate,
    year,
    month,
    dayOfMonth: day,
    daysLeft: Math.max(0, DAYS_PER_MONTH - day),
    daysPerMonth: DAYS_PER_MONTH,
    season,
    activeTurn: meta ? Number(meta.active_turn || 1) : 1,
    fatigue: Number(player.fatigue || 0),
    grain: Number(player.strategic_grain || 0),
    health: Number(player.health || 100),
    morale: Number(player.morale || 100)
  };
}

function resolveActionCost(type, subType, daysOverride) {
  const baseCost = getActionTimeCost(type, subType);
  if (daysOverride === null || daysOverride === undefined) {
    return { ...baseCost, days: normalizeDays(baseCost.days) };
  }
  return { ...baseCost, days: Math.min(DAYS_PER_MONTH, normalizeDays(daysOverride)) };
}

function canSpendActionTime(dbPath, type, subType, daysOverride = null) {
  const clock = getClock(dbPath);
  const cost = resolveActionCost(type, subType, daysOverride);

  if (cost.days > 0 && clock.dayOfMonth >= DAYS_PER_MONTH) {
    return {
      allowed: false,
      code: 'MONTH_END',
      error: 'Đã hết ngày 30. Hãy bấm Qua Tháng để chốt tháng trước khi làm hành động tốn ngày.',
      clock,
      cost
    };
  }
  if (cost.fatigue > 0 && clock.fatigue >= FATIGUE_MAX) {
    return {
      allowed: false,
      code: 'FATIGUE',
      error: `Thể lực đã cạn (${FATIGUE_MAX}/${FATIGUE_MAX}). Hãy nghỉ ngơi trước khi tiếp tục.`,
      clock,
      cost
    };
  }
  return { allowed: true, clock, cost };
}

/**
 * Advances the campaign calendar by whole days.
 *
 * Options:
 * - clampToMonthEnd (default true): an action cannot roll into the next month;
 *   use false for explicit rest/advance operations.
 * - grainUpkeepPerDay: daily grain upkeep charged per elapsed day. Pass 0 when
 *   the caller already charged a lump-sum provision cost (march grain).
 * - fatigueDelta: extra fatigue for the action itself.
 * - fatigueRecoveryPerDay: daily recovery applied per elapsed day.
 * - publishTicks (default true): emit WORLD_DAY_TICK once per elapsed day.
 *
 * Caravans are advanced through CaravanLogisticsService.advanceByDays (the
 * single progression implementation) when the modular engine is registered.
 */
function advanceCampaignDays(dbPath, rawDays, options = {}) {
  const {
    clampToMonthEnd = true,
    grainUpkeepPerDay = GRAIN_PER_DAY,
    fatigueDelta = 0,
    fatigueRecoveryPerDay = DAILY_FATIGUE_RECOVERY,
    reason = '',
    publishTicks = true
  } = options;

  const clock = getClock(dbPath);
  if (!clock.campaignId) {
    return { success: false, error: 'Campaign metadata missing.' };
  }

  const requestedDays = normalizeDays(rawDays);
  const remainingDays = clampToMonthEnd
    ? Math.max(0, DAYS_PER_MONTH - clock.dayOfMonth)
    : Number.POSITIVE_INFINITY;
  const advancedDays = Math.min(requestedDays, remainingDays);
  const next = addDays(clock.year, clock.month, clock.dayOfMonth, advancedDays);
  const nextDate = formatDate(next.year, next.month, next.day);
  const grainCost = advancedDays * grainUpkeepPerDay;
  const missingGrain = grainCost > 0 && clock.grain < grainCost;
  const fatiguePenalty = missingGrain ? 5 : 0;
  const dailyRecovery = advancedDays * fatigueRecoveryPerDay;
  const nextFatigue = Math.max(
    0,
    Math.min(FATIGUE_MAX, clock.fatigue + Number(fatigueDelta || 0) + fatiguePenalty - dailyRecovery)
  );
  const nextGrain = Math.max(0, Number((clock.grain - grainCost).toFixed(2)));

  if (advancedDays > 0) {
    runSqlExec(
      dbPath,
      `UPDATE campaign_meta SET current_date = ? WHERE campaign_id = ?;`,
      [nextDate, clock.campaignId]
    );
    runSqlExec(
      dbPath,
      `UPDATE player_state SET fatigue = ?, strategic_grain = ? WHERE player_id = 'PLY-0001';`,
      [nextFatigue, nextGrain]
    );
  }

  let caravanResult = null;
  if (advancedDays > 0) {
    const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
    const caravanService = gsm && gsm.caravanLogistics;
    if (caravanService && typeof caravanService.advanceByDays === 'function') {
      try {
        caravanResult = caravanService.advanceByDays(advancedDays);
      } catch (error) {
        caravanResult = { error: error && error.message ? error.message : String(error) };
      }
    }
  }

  const tasks = advancedDays > 0 ? progressTasks(dbPath, advancedDays) : [];

  // Publish after the write so subscribers observe the new calendar day.
  const dayTicksPublished = publishTicks ? publishDayTicks(clock.currentDate, advancedDays) : 0;

  return {
    success: true,
    reason,
    requestedDays,
    advancedDays,
    partial: advancedDays < requestedDays,
    prevDate: clock.currentDate,
    nextDate,
    monthBlocked: next.day >= DAYS_PER_MONTH,
    fatigueBefore: clock.fatigue,
    fatigueAfter: nextFatigue,
    dailyRecovery,
    grainCost: Number(grainCost.toFixed(2)),
    grainAfter: nextGrain,
    missingGrain,
    dayTicksPublished,
    caravans: caravanResult,
    activeTasks: tasks.filter(task => task.status === 'IN_PROGRESS')
  };
}

function applyActionTime(dbPath, type, subType, reason = '', daysOverride = null) {
  const cost = resolveActionCost(type, subType, daysOverride);
  const result = advanceCampaignDays(dbPath, cost.days, {
    reason,
    fatigueDelta: cost.fatigue,
    clampToMonthEnd: true
  });
  if (!result.success) return result;
  return { ...result, actionType: type, subType: subType || null };
}

module.exports = {
  DAYS_PER_MONTH,
  GRAIN_PER_DAY,
  DAILY_FATIGUE_RECOVERY,
  DATE_PATTERN,
  normalizeDays,
  getClock,
  canSpendActionTime,
  applyActionTime,
  advanceCampaignDays,
  publishDayTicks
};
