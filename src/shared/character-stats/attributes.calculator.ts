/**
 * ThreeKingdoms-AgentEngine: Canonical Attributes & Equipment Stacking Calculator
 * (src/shared/character-stats/attributes.calculator.ts)
 *
 * Implements:
 * - Strict Clamping [+1..+5] for all Equipment Stat Modifiers
 * - 8-Axis Base Attribute Extraction & Normalization
 * - Aggregate Effective Attributes: effective = base + sum(equipment_buffs)
 * - Golden Cap (>100) status flag detection
 */

import {
  CANONICAL_STAT_KEYS,
  CanonicalStatType,
  STAT_LIMITS
} from './character-stats.constants';
import {
  StatModifiersMap,
  EffectiveAttributesDTO
} from './character-stats.dto';

/**
 * STRICT USER RULE: Clamps any single equipment stat modifier between +1 and +5.
 */
export function clampStatModifier(value: number): number {
  const rounded = Math.round(Number(value));
  if (isNaN(rounded)) return 0;
  return Math.min(
    STAT_LIMITS.EQUIPMENT_MODIFIER_MAX,
    Math.max(STAT_LIMITS.EQUIPMENT_MODIFIER_MIN, rounded)
  );
}

/**
 * Creates an empty zero-initialized stat map.
 */
export function createEmptyStatMap(): StatModifiersMap {
  return {
    war: 0,
    ldr: 0,
    int: 0,
    pol: 0,
    dip: 0,
    com: 0,
    log: 0,
    cra: 0
  };
}

/**
 * Parses and clamps a JSON string or object of stat modifiers into a typed map.
 */
export function parseAndClampModifiers(
  raw: string | Record<string, any> | null | undefined
): StatModifiersMap {
  const map = createEmptyStatMap();
  if (!raw) return map;

  let parsed: Record<string, any> = {};
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return map;
    }
  } else if (typeof raw === 'object') {
    parsed = raw;
  }

  for (const [k, v] of Object.entries(parsed)) {
    const normKey = k.toLowerCase().replace(/_attr$|_exp$/, '').trim() as CanonicalStatType;
    if (CANONICAL_STAT_KEYS.includes(normKey)) {
      const numVal = Number(v);
      if (!isNaN(numVal) && numVal !== 0) {
        map[normKey] = clampStatModifier(numVal);
      }
    }
  }

  return map;
}

/**
 * Computes base, equipment buffs, and effective attributes for a character.
 */
export function calculateEffectiveAttributes(
  rawBaseStats: Record<string, any> | null | undefined,
  equipmentList?: Array<{ stat_modifiers?: any; [key: string]: any }>
): EffectiveAttributesDTO {
  const base = createEmptyStatMap();
  const equipmentBuffs = createEmptyStatMap();
  const effective = createEmptyStatMap();
  const isOver100: Record<CanonicalStatType, boolean> = {
    war: false,
    ldr: false,
    int: false,
    pol: false,
    dip: false,
    com: false,
    log: false,
    cra: false
  };

  // 1. Extract base attributes
  for (const key of CANONICAL_STAT_KEYS) {
    const val = rawBaseStats
      ? rawBaseStats[`${key}_attr`] !== undefined
        ? rawBaseStats[`${key}_attr`]
        : rawBaseStats[key] !== undefined
        ? rawBaseStats[key]
        : STAT_LIMITS.DEFAULT_STAT
      : STAT_LIMITS.DEFAULT_STAT;
    base[key] = Math.max(STAT_LIMITS.MIN_STAT, Math.round(Number(val) || STAT_LIMITS.DEFAULT_STAT));
  }

  // 2. Sum up equipment buffs
  if (equipmentList && Array.isArray(equipmentList)) {
    for (const eq of equipmentList) {
      const clamped = parseAndClampModifiers(eq.stat_modifiers);
      for (const key of CANONICAL_STAT_KEYS) {
        equipmentBuffs[key] += clamped[key];
      }
    }
  }

  // 3. Compute effective attributes and golden cap
  for (const key of CANONICAL_STAT_KEYS) {
    const total = base[key] + equipmentBuffs[key];
    effective[key] = total;
    isOver100[key] = total > STAT_LIMITS.STANDARD_CAP;
  }

  return {
    base,
    equipmentBuffs,
    effective,
    isOver100
  };
}
