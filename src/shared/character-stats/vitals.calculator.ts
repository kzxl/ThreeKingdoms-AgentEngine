/**
 * ThreeKingdoms-AgentEngine: Canonical Vitals & Stamina Calculator
 * (src/shared/character-stats/vitals.calculator.ts)
 *
 * Implements:
 * - Canonical Stamina calculation (100% Zero-drift across all features)
 * - Maximum Health (Max HP) calculation
 * - Dynamic Passive Stamina Recovery interval based on Martial Warfare (WAR)
 * - Overwork & Fatigue exhaustion validation
 */

import { VITALS_RULES } from './character-stats.constants';
import { VitalsProfileDTO } from './character-stats.dto';

export interface RawPlayerStateInput {
  war_attr?: number;
  war?: number;
  health?: number;
  fatigue?: number;
  morale?: number;
  [key: string]: any;
}

/**
 * Calculates a character's canonical vitals profile (Max Stamina, Current Stamina, Max HP, Fatigue).
 */
export function calculateVitals(player: RawPlayerStateInput | null | undefined): VitalsProfileDTO {
  const warAttr = Number(
    player?.war_attr !== undefined
      ? player.war_attr
      : player?.war !== undefined
      ? player.war
      : 50
  );
  const healthVal = Number(player?.health !== undefined ? player.health : 100);
  const fatigueVal = Number(player?.fatigue || 0);
  const moraleVal = Number(player?.morale !== undefined ? player.morale : 100);

  // 1. Max Stamina Calculation
  const maxStamina =
    VITALS_RULES.BASE_MAX_STAMINA +
    Math.max(
      0,
      Math.round(
        (warAttr - VITALS_RULES.WAR_SCALE_THRESHOLD) * VITALS_RULES.WAR_SCALE_FACTOR
      )
    ) +
    Math.floor(healthVal / VITALS_RULES.VIGOR_HEALTH_DIVISOR);

  // 2. Current Stamina & Percentages
  const currentStamina = Math.max(0, maxStamina - fatigueVal);
  const staminaPct = Math.min(
    100,
    Math.max(0, Math.round((currentStamina / maxStamina) * 100))
  );
  const fatiguePct = Math.min(
    100,
    Math.max(0, Math.round((fatigueVal / VITALS_RULES.MAX_FATIGUE_LIMIT) * 100))
  );

  // 3. Max Health Calculation
  const maxHp = Math.round(
    VITALS_RULES.BASE_MAX_HP +
    warAttr * VITALS_RULES.WAR_HP_MULTIPLIER +
    Math.max(0, healthVal - 100) * 0.5
  );

  // 4. Exhaustion Check
  const isExhausted = fatigueVal >= VITALS_RULES.EXHAUSTION_FATIGUE_GATE;

  return {
    maxStamina,
    currentStamina,
    fatigue: fatigueVal,
    staminaPct,
    fatiguePct,
    health: healthVal,
    maxHp,
    warAttr,
    morale: moraleVal,
    isExhausted
  };
}

/**
 * Computes passive stamina recovery ticker interval in seconds.
 * Higher WAR allows faster recovery (minimum 8s, base 30s).
 */
export function calculatePassiveRecoveryInterval(warAttr: number = 50): number {
  return Math.max(
    VITALS_RULES.PASSIVE_RECOVERY_MIN_SECONDS,
    VITALS_RULES.PASSIVE_RECOVERY_BASE_SECONDS -
      Math.floor((warAttr - VITALS_RULES.WAR_SCALE_THRESHOLD) * VITALS_RULES.PASSIVE_RECOVERY_WAR_FACTOR)
  );
}

/**
 * Alias maintaining 100% backward-compatibility with legacy wage-labor calls.
 */
export const calculatePlayerStamina = calculateVitals;
