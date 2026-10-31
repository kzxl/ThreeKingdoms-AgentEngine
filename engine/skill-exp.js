/**
 * CommonJS mirror of `src/shared/skill-exp.ts`.
 *
 * Both read `config/game-constants.json`; tests/verify-skill-system.ts compares
 * their results so the two runtimes cannot drift.
 */

const { skillProgression } = require('../config/game-constants.json');

const SKILL_EXP_CURVE = skillProgression.expCurve;
const SKILL_GAIN_MULTIPLIERS = skillProgression.gainMultiplier;
const SKILL_MAX_TIER = skillProgression.maxTier;

function expRequiredForTier(tier) {
  const index = Math.min(Math.max(1, Math.floor(Number(tier) || 1)), SKILL_MAX_TIER) - 1;
  return SKILL_EXP_CURVE[index] ?? SKILL_EXP_CURVE[SKILL_EXP_CURVE.length - 1];
}

function gainMultiplierForTier(tier) {
  const index = Math.min(Math.max(1, Math.floor(Number(tier) || 1)), SKILL_MAX_TIER) - 1;
  return SKILL_GAIN_MULTIPLIERS[index]
    ?? SKILL_GAIN_MULTIPLIERS[SKILL_GAIN_MULTIPLIERS.length - 1];
}

function applySkillExpGain(tier, currentExp, amount) {
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

module.exports = {
  SKILL_EXP_CURVE,
  SKILL_GAIN_MULTIPLIERS,
  SKILL_MAX_TIER,
  expRequiredForTier,
  gainMultiplierForTier,
  applySkillExpGain
};
