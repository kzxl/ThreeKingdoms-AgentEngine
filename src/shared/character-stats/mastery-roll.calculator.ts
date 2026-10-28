/**
 * ThreeKingdoms-AgentEngine: Canonical Mastery Roll & S-Score Calculator
 * (src/shared/character-stats/mastery-roll.calculator.ts)
 *
 * Implements:
 * - S-Score calculation: S = (Attr - Threshold) - max(0, (Fatigue - 40) / 3)
 * - Anti-inflationary tiered probability roll distribution:
 *   [LEGENDARY, MASTERWORK, FINE, NORMAL] normalized strictly to 100%
 * - Unified across Crafting (Forge), Medicine (Apothecary), and Gastronomy (Cooking)
 */

import { CanonicalStatType } from './character-stats.constants';
import { MasteryRatesDTO, MasteryTierOdds } from './character-stats.dto';

export interface MasteryCalculationInput {
  statType: CanonicalStatType;
  baseStat: number;
  threshold?: number;
  fatigue: number;
  fatigueCost?: number;
  fatigueComfortGate?: number;
  craftsmanTier?: number;
}

/**
 * Calculates effective mastery score and normalized probability distribution.
 */
export function calculateMasteryRates(input: MasteryCalculationInput): MasteryRatesDTO {
  const threshold = input.threshold !== undefined ? input.threshold : 50;
  const fatigueComfortGate = input.fatigueComfortGate !== undefined ? input.fatigueComfortGate : 40;
  const fatigueCost = input.fatigueCost !== undefined ? input.fatigueCost : 25;
  const craftsmanTier = input.craftsmanTier !== undefined ? input.craftsmanTier : 1;

  const baseStat = Math.max(0, Number(input.baseStat || 50));
  const fatigue = Math.max(0, Math.min(100, Number(input.fatigue || 0)));

  // Fatigue Penalty
  const fatiguePenalty = Math.max(0, (fatigue - fatigueComfortGate) / 3);

  // Effective Mastery Score S
  const rawS = (baseStat - threshold) + (craftsmanTier - 1) * 5 - fatiguePenalty;
  const effectiveMasteryScore = Math.max(0, Math.round(rawS * 10) / 10);

  // Weight functions
  const S = effectiveMasteryScore;
  const wLegendary = 0.5 + 6.0 * Math.pow(S / 50, 2.2);
  const wMasterwork = 5.0 + 25.0 * Math.pow(S / 50, 1.4);
  const wFine = 30.0 + 30.0 * Math.pow(S / 50, 0.9);
  const wNormal = Math.max(15.0, 64.5 - 45.0 * (S / 50));
  const totalW = wLegendary + wMasterwork + wFine + wNormal;

  const pLegendary = Math.round((wLegendary / totalW) * 1000) / 10;
  const pMasterwork = Math.round((wMasterwork / totalW) * 1000) / 10;
  const pFine = Math.round((wFine / totalW) * 1000) / 10;
  const pNormal = Math.max(0, Math.round((100 - pLegendary - pMasterwork - pFine) * 10) / 10);

  const canExecute = baseStat >= threshold && fatigue + fatigueCost <= 100;
  let reasonCannotExecute: string | undefined;
  if (baseStat < threshold) {
    reasonCannotExecute = `Chỉ số ${input.statType.toUpperCase()} hiện tại (${baseStat}) chưa đạt ngưỡng tối thiểu ${threshold}.`;
  } else if (fatigue + fatigueCost > 100) {
    reasonCannotExecute = `Độ mệt mỏi quá cao (${fatigue}/100). Ca thao tác đòi hỏi ${fatigueCost} thể lực.`;
  }

  const tiers: MasteryTierOdds[] = [
    {
      tier: 'NORMAL',
      tierLabelVi: 'Phổ Thông',
      probabilityPercent: pNormal,
      warRange: '+1 ~ +2 WAR',
      ldrRange: '+0 LDR'
    },
    {
      tier: 'FINE',
      tierLabelVi: 'Thượng Phẩm (Tinh Luyện)',
      probabilityPercent: pFine,
      warRange: '+2 ~ +3 WAR',
      ldrRange: '+0 ~ +1 LDR'
    },
    {
      tier: 'MASTERWORK',
      tierLabelVi: 'Cực Phẩm (Bách Luyện)',
      probabilityPercent: pMasterwork,
      warRange: '+3 ~ +4 WAR',
      ldrRange: '+1 LDR'
    },
    {
      tier: 'LEGENDARY',
      tierLabelVi: 'Thần Phẩm (Tuyệt Thế Thần Binh)',
      probabilityPercent: pLegendary,
      warRange: '+4 ~ +5 WAR',
      ldrRange: '+1 ~ +2 LDR'
    }
  ];

  return {
    statType: input.statType,
    baseStat,
    fatigue,
    fatiguePenalty: Math.round(fatiguePenalty * 10) / 10,
    effectiveMasteryScore,
    canExecute,
    reasonCannotExecute,
    tiers
  };
}
