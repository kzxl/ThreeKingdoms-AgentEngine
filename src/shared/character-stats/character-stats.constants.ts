/**
 * ThreeKingdoms-AgentEngine: Character Stats & Formulas Constants
 * (src/shared/character-stats/character-stats.constants.ts)
 *
 * Single Source of Truth for all attributes, vitals, modifiers, and formula caps.
 * Adheres strictly to AgentOption Universe Architecture v4.0.
 */

export const CANONICAL_STAT_KEYS = [
  'war',
  'ldr',
  'int',
  'pol',
  'dip',
  'com',
  'log',
  'cra'
] as const;

export type CanonicalStatType = (typeof CANONICAL_STAT_KEYS)[number];

export const STAT_DISPLAY_NAMES_VI: Record<CanonicalStatType, string> = {
  war: 'Võ Lực (WAR)',
  ldr: 'Thống Soái (LDR)',
  int: 'Trí Lực (INT)',
  pol: 'Chính Trị (POL)',
  dip: 'Khẩu Tài (DIP)',
  com: 'Thương Nghiệp (COM)',
  log: 'Hậu Cần (LOG)',
  cra: 'Kỹ Nghệ (CRA)'
};

export const STAT_LIMITS = {
  MIN_STAT: 1,
  DEFAULT_STAT: 50,
  STANDARD_CAP: 100,
  HEROIC_CAP: 120, // Golden Cap (Koei ROTK)
  EQUIPMENT_MODIFIER_MIN: 1,
  EQUIPMENT_MODIFIER_MAX: 5
} as const;

export const VITALS_RULES = {
  BASE_MAX_STAMINA: 100,
  WAR_SCALE_THRESHOLD: 50,
  WAR_SCALE_FACTOR: 1.5,
  VIGOR_HEALTH_DIVISOR: 10,
  MAX_FATIGUE_LIMIT: 100,
  EXHAUSTION_FATIGUE_GATE: 95,
  BASE_MAX_HP: 100,
  WAR_HP_MULTIPLIER: 1.5,
  PASSIVE_RECOVERY_BASE_SECONDS: 30,
  PASSIVE_RECOVERY_WAR_FACTOR: 0.4,
  PASSIVE_RECOVERY_MIN_SECONDS: 8
} as const;

export const EXP_PROGRESSION_RULES = {
  STANDARD_THRESHOLD: 100, // Stat <= 90
  VETERAN_THRESHOLD: 150,  // Stat 91 - 99
  HEROIC_THRESHOLD: 250,   // Stat >= 100
  SOFT_CAP: 120
} as const;
