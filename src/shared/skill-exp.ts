/**
 * Skill EXP curve shared by every skill writer.
 *
 * The curve lives in `config/game-constants.json` so the CommonJS engine
 * (`engine/skill-exp.js`) and the TypeScript services cannot drift. Higher
 * tiers need more EXP and convert incoming EXP more slowly, so a master
 * craftsman does not reach tier 5 at the same pace as a novice.
 */

import { GAME_CONSTANTS } from './constants';

export const SKILL_EXP_CURVE: readonly number[] = GAME_CONSTANTS.skillProgression.expCurve;
export const SKILL_GAIN_MULTIPLIERS: readonly number[] = GAME_CONSTANTS.skillProgression.gainMultiplier;
export const SKILL_MAX_TIER = GAME_CONSTANTS.skillProgression.maxTier;

export interface SkillExpResult {
  tier: number;
  currentExp: number;
  maxExp: number;
  gained: number;
}

export function expRequiredForTier(tier: number): number {
  const index = Math.min(Math.max(1, Math.floor(tier)), SKILL_MAX_TIER) - 1;
  return SKILL_EXP_CURVE[index] ?? SKILL_EXP_CURVE[SKILL_EXP_CURVE.length - 1];
}

export function gainMultiplierForTier(tier: number): number {
  const index = Math.min(Math.max(1, Math.floor(tier)), SKILL_MAX_TIER) - 1;
  return SKILL_GAIN_MULTIPLIERS[index] ?? SKILL_GAIN_MULTIPLIERS[SKILL_GAIN_MULTIPLIERS.length - 1];
}

/**
 * Applies one EXP award, rolling tier-ups and carrying the remainder. EXP is
 * clamped at the final tier so the progress bar cannot overflow.
 */
export function applySkillExpGain(
  tier: number,
  currentExp: number,
  amount: number
): SkillExpResult {
  let nextTier = Math.max(1, Math.floor(Number(tier) || 1));
  let nextExp = Math.max(0, Number(currentExp) || 0);
  const rawAmount = Math.max(0, Number(amount) || 0);
  const gained = Math.round(rawAmount * gainMultiplierForTier(nextTier));
  nextExp += gained;
  let maxExp = expRequiredForTier(nextTier);

  while (nextExp >= maxExp && nextTier < SKILL_MAX_TIER) {
    nextExp -= maxExp;
    nextTier += 1;
    maxExp = expRequiredForTier(nextTier);
  }
  if (nextTier >= SKILL_MAX_TIER) {
    nextExp = Math.min(nextExp, maxExp);
  }

  return { tier: nextTier, currentExp: nextExp, maxExp, gained };
}
