/**
 * Campaign clock helpers. The day is the only time unit: every action and every
 * explicit pause advances whole calendar days through `advanceTime`, which is
 * the single writer of `campaign_meta.current_date`.
 *
 * Crossing into day 1 of a new month is a boundary event: `advanceTime` closes
 * the month that just ended (enterprise settlement, world simulation, fame,
 * bankruptcy) before moving the clock, so there is no separate month-jump path.
 *
 * Every caller (actions, travel, explicit day advance) goes through
 * `advanceTime` so the calendar, fatigue, grain upkeep, tasks, daily ticks and
 * month boundaries cannot drift apart.
 */

const { runSqlJson, runSqlExec } = require('./db-adapter');
const { getActionTimeCost } = require('./action-policy');
const { progressTasks } = require('./task-manager');
const { parseGameDate, formatGameDate, addDaysToDate } = require('./date-utils');
const GAME_CONSTANTS = require('../config/game-constants.json');

const DAYS_PER_MONTH = GAME_CONSTANTS.calendar.daysPerMonth;
const PHASES_PER_DAY = Number(GAME_CONSTANTS.calendar.phasesPerDay || 3);
const GRAIN_PER_DAY = GAME_CONSTANTS.calendar.grainPerDay;
const DAILY_FATIGUE_RECOVERY = GAME_CONSTANTS.calendar.dailyFatigueRecovery;
const FATIGUE_MAX = GAME_CONSTANTS.fatigue.max;
const FALLBACK_DATE = GAME_CONSTANTS.calendar.fallbackDate;
const DATE_PATTERN = /^\d{3}-\d{2}-\d{2}$/;
const PHASE_LABELS = ['Sáng', 'Chiều', 'Tối'];

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
  const meta = runSqlJson(
    dbPath,
    `SELECT campaign_id, "current_date", active_turn, current_phase FROM campaign_meta LIMIT 1;`
  )[0];
  const player = runSqlJson(dbPath, `SELECT fatigue, strategic_grain, health, morale FROM player_state LIMIT 1;`)[0] || {};
  const currentDate = meta ? meta.current_date : FALLBACK_DATE;
  const { year, month, day } = parseDate(currentDate);
  const season = month <= 3 ? 'Xuân' : (month <= 6 ? 'Hạ' : (month <= 9 ? 'Thu' : 'Đông'));
  const phase = Math.max(0, Math.min(PHASES_PER_DAY - 1, Number(meta?.current_phase || 0)));
  return {
    campaignId: meta ? meta.campaign_id : null,
    currentDate,
    year,
    month,
    dayOfMonth: day,
    daysLeft: Math.max(0, DAYS_PER_MONTH - day),
    daysPerMonth: DAYS_PER_MONTH,
    phase,
    phasesPerDay: PHASES_PER_DAY,
    phaseLabel: PHASE_LABELS[phase] || PHASE_LABELS[0],
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
  const phases = Math.max(0, Math.round(Number(baseCost.phases || 0)));
  if (daysOverride === null || daysOverride === undefined) {
    return { ...baseCost, days: normalizeDays(baseCost.days), phases };
  }
  return { ...baseCost, days: Math.min(DAYS_PER_MONTH, normalizeDays(daysOverride)), phases };
}

function canSpendActionTime(dbPath, type, subType, daysOverride = null) {
  const clock = getClock(dbPath);
  const cost = resolveActionCost(type, subType, daysOverride);
  const campaign = runSqlJson(dbPath, 'SELECT status FROM campaign_meta LIMIT 1;')[0];
  if (campaign && campaign.status && campaign.status !== 'ACTIVE') {
    return {
      allowed: false,
      code: 'CAMPAIGN_OVER',
      error: `Chiến dịch đã kết thúc (${campaign.status}). Không thể thực hiện thêm hành động.`,
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
      `UPDATE campaign_meta SET current_date = ?, current_phase = 0 WHERE campaign_id = ?;`,
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

  let expeditionResult = null;
  if (advancedDays > 0) {
    try {
      const { advanceExpeditionsByDays } = require('./expedition-bridge');
      expeditionResult = advanceExpeditionsByDays(dbPath, advancedDays, nextDate);
    } catch (error) {
      expeditionResult = { advanced: 0, arrived: [], error: error.message };
    }
  }

  let siegeResult = null;
  if (advancedDays > 0) {
    try {
      const { advanceSiegesByDays } = require('./siege-bridge');
      siegeResult = advanceSiegesByDays(dbPath, advancedDays, nextDate);
    } catch (error) {
      siegeResult = { active: 0, resolved: [], error: error.message };
    }
  }

  let stallResult = null;
  if (advancedDays > 0) {
    try {
      const { advanceByDays: advanceStallsByDays } = require('./stall-bridge');
      stallResult = advanceStallsByDays(dbPath, advancedDays, nextDate);
    } catch (error) {
      stallResult = { sales: [], totalCash: 0, error: error.message };
    }
  }

  const tasks = advancedDays > 0 ? progressTasks(dbPath, advancedDays, nextDate) : [];

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
    expeditions: expeditionResult,
    sieges: siegeResult,
    stalls: stallResult,
    activeTasks: tasks.filter(task => task.status === 'IN_PROGRESS')
  };
}

/**
 * Advances the calendar by N whole days and closes every month boundary it
 * crosses. This is the only public time-advance entry point.
 *
 * A month is 30 days. Leaving day 30 lands on day 1 of the next month; that is
 * the boundary where `GameplayManager.closeMonth` runs. The close happens
 * before the clock write so a failed close leaves the clock untouched and the
 * same days can be retried safely.
 */
function advanceTime(dbPath, rawDays, options = {}) {
  const requestedDays = normalizeDays(rawDays);
  const startClock = getClock(dbPath);
  if (!startClock.campaignId) {
    return { success: false, error: 'Campaign metadata missing.' };
  }

  const grainUpkeepPerDay = options.grainUpkeepPerDay === undefined
    ? GRAIN_PER_DAY
    : Number(options.grainUpkeepPerDay);
  const fatigueRecoveryPerDay = options.fatigueRecoveryPerDay === undefined
    ? DAILY_FATIGUE_RECOVERY
    : Number(options.fatigueRecoveryPerDay);

  const monthsClosed = [];
  let remaining = requestedDays;
  let advancedDays = 0;
  let fatigueDelta = Number(options.fatigueDelta || 0);
  let last = null;
  let grainCost = 0;
  let dailyRecovery = 0;
  let dayTicksPublished = 0;

  while (remaining > 0) {
    const clock = getClock(dbPath);
    const toBoundary = DAYS_PER_MONTH - clock.dayOfMonth + 1;
    const segment = Math.min(remaining, toBoundary);
    const crossesBoundary = segment === toBoundary;

    if (crossesBoundary) {
      const boundary = addDays(clock.year, clock.month, clock.dayOfMonth, segment);
      const nextMonthDate = formatDate(boundary.year, boundary.month, boundary.day);
      let GameplayManager = null;
      try {
        ({ GameplayManager } = require('./gameplay-manager'));
      } catch {
        GameplayManager = null;
      }
      if (GameplayManager && typeof GameplayManager.closeMonthFor === 'function') {
        try {
          const report = GameplayManager.closeMonthFor(dbPath, {
            endedDate: clock.currentDate,
            nextDate: nextMonthDate,
            prevTurn: clock.activeTurn,
            recoveredFatigue: segment * fatigueRecoveryPerDay
          });
          if (report) monthsClosed.push(report);
        } catch (error) {
          return {
            success: false,
            code: 'MONTH_CLOSE_FAILED',
            error: error && error.message ? error.message : String(error),
            requestedDays,
            advancedDays,
            prevDate: startClock.currentDate,
            nextDate: getClock(dbPath).currentDate,
            monthsClosed,
            partial: true
          };
        }
      }
    }

    const segmentResult = advanceCampaignDays(dbPath, segment, {
      reason: options.reason || '',
      clampToMonthEnd: false,
      grainUpkeepPerDay,
      fatigueDelta,
      fatigueRecoveryPerDay,
      publishTicks: options.publishTicks !== false
    });
    if (!segmentResult.success) {
      // A close commits before the clock write. If the write then fails, roll
      // the turn counter back so the retry hits the same close marker and
      // skips the settlement instead of closing the next month.
      if (crossesBoundary) {
        try {
          runSqlExec(
            dbPath,
            `UPDATE campaign_meta SET active_turn = ? WHERE campaign_id = ?;`,
            [clock.activeTurn, clock.campaignId]
          );
        } catch {
          // Leave the counter as-is; the marker still prevents a double close.
        }
      }
      return {
        ...segmentResult,
        requestedDays,
        advancedDays,
        prevDate: startClock.currentDate,
        nextDate: last ? last.nextDate : startClock.currentDate,
        monthsClosed,
        partial: true
      };
    }

    fatigueDelta = 0;
    last = segmentResult;
    advancedDays += segment;
    remaining -= segment;
    grainCost += segmentResult.grainCost;
    dailyRecovery += segmentResult.dailyRecovery;
    dayTicksPublished += segmentResult.dayTicksPublished;

    const meta = runSqlJson(dbPath, 'SELECT status FROM campaign_meta LIMIT 1;')[0];
    if (meta && meta.status && meta.status !== 'ACTIVE') break;
  }

  return {
    success: true,
    requestedDays,
    advancedDays,
    partial: advancedDays < requestedDays,
    prevDate: startClock.currentDate,
    nextDate: last ? last.nextDate : startClock.currentDate,
    monthsClosed,
    grainCost: Number(grainCost.toFixed(2)),
    grainAfter: last ? last.grainAfter : startClock.grain,
    fatigueBefore: startClock.fatigue,
    fatigueAfter: last ? last.fatigueAfter : startClock.fatigue,
    dailyRecovery,
    dayTicksPublished,
    caravans: last ? last.caravans : null,
    expeditions: last ? last.expeditions : null,
    sieges: last ? last.sieges : null,
    activeTasks: last ? last.activeTasks : []
  };
}

/**
 * Spends phase slots inside the current day. Reaching the end of the day
 * advances one calendar day (and resets the phase to morning).
 */
function advancePhase(dbPath, rawPhases = 1, options = {}) {
  const requested = Math.max(0, Math.round(Number(rawPhases) || 0));
  const startClock = getClock(dbPath);
  if (!startClock.campaignId) {
    return { success: false, error: 'Campaign metadata missing.' };
  }
  let remaining = requested;
  let daysAdvanced = 0;
  const monthsClosed = [];
  let last = null;

  while (remaining > 0) {
    const clock = getClock(dbPath);
    const toEnd = PHASES_PER_DAY - clock.phase;
    if (remaining >= toEnd) {
      const result = advanceTime(dbPath, 1, {
        reason: options.reason || 'phase advance',
        fatigueDelta: Number(options.fatigueDelta || 0),
        grainUpkeepPerDay: GRAIN_PER_DAY,
        fatigueRecoveryPerDay: DAILY_FATIGUE_RECOVERY,
        publishTicks: options.publishTicks !== false
      });
      if (!result.success) return { ...result, partial: true };
      daysAdvanced += result.advancedDays;
      monthsClosed.push(...(result.monthsClosed || []));
      last = result;
      remaining -= toEnd;
    } else {
      runSqlExec(
        dbPath,
        'UPDATE campaign_meta SET current_phase = ? WHERE campaign_id = ?;',
        [clock.phase + remaining, clock.campaignId]
      );
      remaining = 0;
    }
  }

  const clock = getClock(dbPath);
  return {
    success: true,
    requestedPhases: requested,
    phasesSpent: requested,
    daysAdvanced,
    monthsClosed,
    prevDate: startClock.currentDate,
    nextDate: clock.currentDate,
    phase: clock.phase,
    phaseLabel: clock.phaseLabel,
    grainCost: last ? last.grainCost : 0,
    grainAfter: last ? last.grainAfter : clock.grain,
    fatigueBefore: startClock.fatigue,
    fatigueAfter: clock.fatigue
  };
}

function applyActionTime(dbPath, type, subType, reason = '', daysOverride = null) {
  const cost = resolveActionCost(type, subType, daysOverride);
  let result;
  if (cost.days > 0) {
    result = advanceTime(dbPath, cost.days, {
      reason,
      fatigueDelta: cost.fatigue,
      grainUpkeepPerDay: GRAIN_PER_DAY,
      fatigueRecoveryPerDay: DAILY_FATIGUE_RECOVERY
    });
  } else if (cost.phases > 0) {
    result = advancePhase(dbPath, cost.phases, { reason });
  } else {
    result = advanceTime(dbPath, 0, {
      reason,
      fatigueDelta: cost.fatigue,
      grainUpkeepPerDay: GRAIN_PER_DAY,
      fatigueRecoveryPerDay: DAILY_FATIGUE_RECOVERY
    });
  }
  if (!result.success) return result;
  return { ...result, actionType: type, subType: subType || null };
}

module.exports = {
  DAYS_PER_MONTH,
  PHASES_PER_DAY,
  GRAIN_PER_DAY,
  DAILY_FATIGUE_RECOVERY,
  DATE_PATTERN,
  normalizeDays,
  getClock,
  canSpendActionTime,
  applyActionTime,
  advancePhase,
  advanceCampaignDays,
  advanceTime,
  publishDayTicks
};
