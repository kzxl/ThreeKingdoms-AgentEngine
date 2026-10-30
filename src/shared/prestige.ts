/**
 * ThreeKingdoms-AgentEngine: Prestige Scale (src/shared/prestige.ts)
 *
 * `config/prestige.json` is the single source for fame tiers and balance
 * numbers. Fame is a social score (0..99999, soft cap 10000), never a health
 * bar: reaching 0 removes the bonuses, it does not end the campaign.
 */

import PRESTIGE_CONFIG from '../../config/prestige.json';

export interface FameTier {
  code: string;
  minFame: number;
  nameVi: string;
  nameEn: string;
}

export const PRESTIGE = PRESTIGE_CONFIG;
export const FAME_TIERS: readonly FameTier[] = PRESTIGE_CONFIG.tiers;
export const FAME_SOFT_CAP = PRESTIGE_CONFIG.scale.softCap;
export const FAME_HARD_CEILING = PRESTIGE_CONFIG.scale.hardCeiling;

export function normalizeFame(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.min(FAME_HARD_CEILING, Math.round(numeric));
}

export function getFameTier(fame: unknown): FameTier {
  const value = normalizeFame(fame);
  let current = FAME_TIERS[0];
  for (const tier of FAME_TIERS) {
    if (value >= tier.minFame) current = tier;
    else break;
  }
  return current;
}

export function getNextFameTier(fame: unknown): FameTier | null {
  const value = normalizeFame(fame);
  return FAME_TIERS.find(tier => tier.minFame > value) || null;
}

/** 0 at fame 0, approaching 1 but never reaching it; 5,000 fame is ~0.71. */
export function fameRatio(fame: unknown): number {
  const value = normalizeFame(fame);
  return value / (value + PRESTIGE_CONFIG.effects.fameNormalizer);
}

/** Diminishing returns: a +600 deed is worth 600 at 0 and ~342 at 5,000. */
export function effectiveFameGain(rawGain: unknown, currentFame: unknown): number {
  const raw = Math.round(Number(rawGain) || 0);
  if (raw <= 0) return 0;
  const fame = normalizeFame(currentFame);
  const normalized = raw / (1 + fame / PRESTIGE_CONFIG.effects.gainNormalizer);
  return Math.max(1, Math.round(normalized));
}

/** Percentage decay after N inactive months; never below zero. */
export function applyFameDecay(fame: unknown, inactiveMonths: number): number {
  const value = normalizeFame(fame);
  const months = Math.max(0, Math.floor(Number(inactiveMonths) || 0));
  const grace = PRESTIGE_CONFIG.decay.inactiveMonths;
  if (months <= grace || value <= PRESTIGE_CONFIG.decay.thresholdHigh) return value;

  const rate = value >= PRESTIGE_CONFIG.decay.thresholdTop
    ? PRESTIGE_CONFIG.decay.rateTop
    : PRESTIGE_CONFIG.decay.rateHigh;
  const decayed = value * Math.pow(1 - rate, months - grace);
  return normalizeFame(decayed);
}

export function fameEffects(fame: unknown): {
  ratio: number;
  discoveryChance: number;
  hireDiscount: number;
  sellBonus: number;
} {
  const ratio = fameRatio(fame);
  const effects = PRESTIGE_CONFIG.effects;
  return {
    ratio,
    discoveryChance: (effects.discoveryBaseBasisPoints + ratio * effects.discoveryFameBasisPoints) / 10000,
    hireDiscount: (ratio * effects.hireDiscountBasisPoints) / 10000,
    sellBonus: (ratio * effects.sellBonusBasisPoints) / 10000
  };
}
