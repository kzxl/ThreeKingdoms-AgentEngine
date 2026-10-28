/**
 * ThreeKingdoms-AgentEngine: Character Stats & Formulas DTOs
 * (src/shared/character-stats/character-stats.dto.ts)
 */

import { CanonicalStatType } from './character-stats.constants';

export interface VitalsProfileDTO {
  maxStamina: number;
  currentStamina: number;
  fatigue: number;
  staminaPct: number;
  fatiguePct: number;
  health: number;
  maxHp: number;
  warAttr: number;
  morale: number;
  isExhausted: boolean;
}

export type StatModifiersMap = Record<CanonicalStatType, number>;

export interface EffectiveAttributesDTO {
  base: Record<CanonicalStatType, number>;
  equipmentBuffs: Record<CanonicalStatType, number>;
  effective: Record<CanonicalStatType, number>;
  isOver100: Record<CanonicalStatType, boolean>;
}

export interface MasteryTierOdds {
  tier: 'LEGENDARY' | 'MASTERWORK' | 'FINE' | 'NORMAL';
  tierLabelVi: string;
  probabilityPercent: number;
  warRange: string;
  ldrRange: string;
}

export interface MasteryRatesDTO {
  statType: CanonicalStatType;
  baseStat: number;
  fatigue: number;
  fatiguePenalty: number;
  effectiveMasteryScore: number;
  canExecute: boolean;
  reasonCannotExecute?: string;
  tiers: MasteryTierOdds[];
}

export interface ExpAdvancementResultDTO {
  stat: CanonicalStatType;
  oldValue: number;
  newValue: number;
  currentExp: number;
  requiredExp: number;
  leveledUp: boolean;
  pointsGained: number;
}
