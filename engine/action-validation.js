/**
 * ThreeKingdoms-AgentEngine: Action Input Validation (engine/action-validation.js)
 *
 * The simulation core composes multi-statement SQL scripts, so every value that
 * reaches those scripts must be provably safe before interpolation. This module
 * is the single gate for agent/API supplied action payloads:
 *   - identifiers are restricted to a strict token alphabet
 *   - numeric fields are coerced and range-checked
 *   - dates are shape-checked
 *   - free text is length-capped and quote-escaped for SQL literals
 *
 * Any violation throws ActionValidationError, which executeAction() converts into
 * a structured INVALID_PARAMS rejection.
 */

const TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
const DATE_RE = /^\d{3,4}-\d{1,2}-\d{1,2}$/;

class ActionValidationError extends Error {
  constructor(field, message) {
    super(`${field}: ${message}`);
    this.name = 'ActionValidationError';
    this.code = 'INVALID_PARAMS';
    this.field = field;
  }
}

/** Strict identifier: commodity codes, npc ids, location ids, skill codes, keys. */
function token(value, field, { optional = false } = {}) {
  if (value === null || value === undefined || value === '') {
    if (optional) return null;
    throw new ActionValidationError(field, 'is required');
  }
  const text = String(value);
  if (!TOKEN_RE.test(text)) {
    throw new ActionValidationError(field, `must match ${TOKEN_RE} (got "${text.slice(0, 40)}")`);
  }
  return text;
}

/** Numeric field with coercion and inclusive bounds. */
function number(value, field, { min = -Infinity, max = Infinity, integer = false, fallback } = {}) {
  const raw = value === null || value === undefined || value === '' ? fallback : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new ActionValidationError(field, `must be a finite number (got "${String(value).slice(0, 40)}")`);
  }
  const bounded = Math.min(max, Math.max(min, parsed));
  return integer ? Math.round(bounded) : bounded;
}

/** Game calendar date shaped as YYYY-MM-DD. */
function date(value, field, fallback = '184-05-02') {
  const candidate = value === null || value === undefined || value === '' ? fallback : String(value);
  if (!DATE_RE.test(candidate)) {
    throw new ActionValidationError(field, `must be a game date (YYYY-MM-DD), got "${candidate.slice(0, 40)}"`);
  }
  return candidate;
}

/** Free text destined for a quoted SQL literal; escaped and length-capped. */
function text(value, field, { maxLength = 300, fallback = '' } = {}) {
  const raw = value === null || value === undefined ? fallback : String(value);
  return raw.slice(0, maxLength).replace(/'/g, "''");
}

function baseFields(action) {
  return {
    ...action,
    game_date: date(action.game_date, 'game_date'),
    idempotency_key: token(action.idempotency_key, 'idempotency_key', { optional: true })
  };
}

/**
 * Returns a normalized, injection-safe copy of an action payload.
 * Unknown action types are passed through untouched so the dispatcher can reject them.
 */
function normalizeAction(action) {
  if (!action || typeof action !== 'object') {
    throw new ActionValidationError('action', 'must be an object');
  }

  const type = token(action.type, 'type', { optional: false });
  const base = baseFields(action);

  switch (type) {
    case 'TRADE_BUY':
    case 'TRADE_SELL':
      return {
        ...base,
        type,
        item_code: token(action.item_code, 'item_code'),
        quantity: number(action.quantity, 'quantity', { min: 1, max: 1000000, integer: true }),
        unit_price: number(action.unit_price, 'unit_price', { min: 1, max: 10000000 }),
        counterparty: text(action.counterparty, 'counterparty', { maxLength: 120, fallback: 'Unknown Counterparty' })
      };

    case 'PRODUCTION_BATCH':
      return {
        ...base,
        type,
        product_code: token(action.product_code || action.recipe, 'product_code'),
        batch_size: number(action.batch_size, 'batch_size', { min: 1, max: 100000, integer: true }),
        craftsmanship: number(action.craftsmanship, 'craftsmanship', { min: 0, max: 100, integer: true, fallback: 60 }),
        fatigue: number(action.fatigue, 'fatigue', { min: 0, max: 100, integer: true, fallback: 0 })
      };

    case 'PAY_WAGES':
      return {
        ...base,
        type,
        amount: number(action.amount, 'amount', { min: 1, max: 1000000000, integer: true }),
        recipient: text(action.recipient, 'recipient', { maxLength: 120, fallback: 'Retainers' }),
        memo: text(action.memo, 'memo', { maxLength: 300 })
      };

    case 'RECORD_BOUNTY':
      return {
        ...base,
        type,
        amount: number(action.amount, 'amount', { min: 1, max: 1000000000, integer: true }),
        source: text(action.source, 'source', { maxLength: 120, fallback: 'Bounty' }),
        memo: text(action.memo, 'memo', { maxLength: 300 })
      };

    case 'REWARD_NPC':
      return {
        ...base,
        type,
        npc_id: token(action.npc_id, 'npc_id'),
        amount: number(action.amount, 'amount', { min: 1, max: 1000000000, integer: true, fallback: 100 })
      };

    case 'MOVE_LOCATION':
      return { ...base, type, new_location: token(action.new_location, 'new_location') };

    case 'PERSONAL_GROWTH':
      return {
        ...base,
        type,
        sub_type: token(action.sub_type, 'sub_type', { optional: true }) || 'TRAIN_MARTIAL',
        exp_skill: token(action.exp_skill, 'exp_skill', { optional: true }),
        exp_amount: number(action.exp_amount, 'exp_amount', { min: 0, max: 100000, integer: true, fallback: 10 }),
        fatigue_delta: number(action.fatigue_delta, 'fatigue_delta', { min: -100, max: 100, integer: true, fallback: 10 }),
        morale_delta: number(action.morale_delta, 'morale_delta', { min: -100, max: 100, integer: true, fallback: 5 }),
        memo: text(action.memo, 'memo', { maxLength: 300 })
      };

    default:
      return { ...base, type };
  }
}

module.exports = {
  ActionValidationError,
  normalizeAction,
  token,
  number,
  date,
  text
};
