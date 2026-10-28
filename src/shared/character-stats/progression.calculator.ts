/**
 * ThreeKingdoms-AgentEngine: Canonical EXP & Progression Calculator
 * (src/shared/character-stats/progression.calculator.ts)
 *
 * Implements:
 * - Diminishing Returns EXP progression curve (100 -> 150 -> 250)
 * - Stat Advancement with Soft-Cap enforcement (Max 120)
 */

import { CanonicalStatType, EXP_PROGRESSION_RULES } from './character-stats.constants';
import { ExpAdvancementResultDTO } from './character-stats.dto';

/**
 * Calculates the required EXP to advance a stat by +1 point.
 */
export function getRequiredExpForStat(currentStatValue: number): number {
  if (currentStatValue <= 90) {
    return EXP_PROGRESSION_RULES.STANDARD_THRESHOLD; // 100
  }
  if (currentStatValue <= 99) {
    return EXP_PROGRESSION_RULES.VETERAN_THRESHOLD; // 150
  }
  return EXP_PROGRESSION_RULES.HEROIC_THRESHOLD; // 250
}

/**
 * Calculates stat and EXP advancement when gaining an arbitrary amount of EXP.
 */
export function calculateExpAdvancement(
  stat: CanonicalStatType,
  currentStat: number,
  currentExp: number,
  expGained: number,
  cap: number = EXP_PROGRESSION_RULES.SOFT_CAP
): ExpAdvancementResultDTO {
  let statVal = Math.max(1, Math.round(Number(currentStat) || 50));
  let expVal = Math.max(0, Math.round(Number(currentExp) || 0)) + Math.max(0, Math.round(expGained));
  const startingStat = statVal;
  let leveledUp = false;

  while (statVal < cap) {
    const needed = getRequiredExpForStat(statVal);
    if (expVal >= needed) {
      statVal += 1;
      expVal -= needed;
      leveledUp = true;
    } else {
      break;
    }
  }

  // If at cap, discard excess exp
  if (statVal >= cap) {
    expVal = 0;
  }

  return {
    stat,
    oldValue: startingStat,
    newValue: statVal,
    currentExp: expVal,
    requiredExp: getRequiredExpForStat(statVal),
    leveledUp,
    pointsGained: statVal - startingStat
  };
}
