/**
 * Server-side action time authority (src/shared/action-time.ts).
 *
 * Every player-facing mutation that costs calendar time charges it here, once,
 * at the HTTP boundary. Services stay pure: unit tests and world simulation can
 * call them without advancing the clock, while an API client cannot skip the
 * cost by not calling `/api/time/spend`.
 *
 * The cost table lives in `engine/action-policy.js`; this module only enforces
 * it. A rejection throws `ActionTimeError` (HTTP 400) before the service runs,
 * so a failed action never half-charges time or mutates game state.
 */

export interface ActionTimeCharge {
  success: boolean;
  actionType: string;
  subType: string | null;
  prevDate: string;
  nextDate: string;
  advancedDays: number;
  fatigueBefore: number;
  fatigueAfter: number;
  grainCost: number;
  monthsClosed: unknown[];
  [key: string]: unknown;
}

export class ActionTimeError extends Error {
  public readonly code: string;
  public readonly statusCode = 400;

  constructor(message: string, code = 'ACTION_TIME_REJECTED') {
    super(message);
    this.name = 'ActionTimeError';
    this.code = code;
  }
}

/**
 * Checks and applies one action's time cost.
 *
 * `dbPath` is the campaign session database. The action must exist in
 * `ACTION_TIME_POLICY` (or a sub-type must); unknown actions fall back to the
 * one-day default, which is intentional: a new mutation is never free.
 */
export function chargePlayerAction(
  dbPath: string,
  actionType: string,
  subType: string | null = null,
  reason = '',
  daysOverride: number | null = null
): ActionTimeCharge {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { canSpendActionTime, applyActionTime } = require('../../engine/time-manager');

  const check = canSpendActionTime(dbPath, actionType, subType, daysOverride);
  if (!check || check.allowed !== true) {
    throw new ActionTimeError(
      check?.error || 'Không thể thực hiện hành động lúc này.',
      check?.code || 'ACTION_TIME_REJECTED'
    );
  }

  // Services own their stamina cost, so the policy row can be `fatigue: 0`.
  // A day-consuming action still needs headroom: an exhausted character cannot
  // spend a whole day duelling, working or socialising.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fatigueMax = Number(require('../../config/game-constants.json').fatigue.max || 100);
  if (Number(check.cost?.days || 0) > 0 && Number(check.clock?.fatigue || 0) >= fatigueMax) {
    throw new ActionTimeError(
      `Thể lực đã cạn (${fatigueMax}/${fatigueMax}). Hãy nghỉ ngơi trước khi tiếp tục.`,
      'FATIGUE'
    );
  }

  const result = applyActionTime(dbPath, actionType, subType, reason, daysOverride);
  if (!result || result.success === false) {
    throw new ActionTimeError(
      result?.error || 'Không thể tiêu tốn thời gian cho hành động.',
      result?.code || 'ACTION_TIME_FAILED'
    );
  }

  return result as ActionTimeCharge;
}

/** Payload shape used by controllers when a charge is rejected. */
export function actionTimeErrorPayload(error: unknown): { success: false; error: string; code: string } {
  const err = error as { message?: string; code?: string };
  return {
    success: false,
    error: err?.message || 'Không thể thực hiện hành động lúc này.',
    code: err?.code || 'ACTION_TIME_REJECTED'
  };
}
