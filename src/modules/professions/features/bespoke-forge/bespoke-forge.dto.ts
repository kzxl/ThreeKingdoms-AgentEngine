/**
 * ThreeKingdoms-AgentEngine: Bespoke Forge Data Transfer Objects
 * (src/modules/professions/features/bespoke-forge/bespoke-forge.dto.ts)
 */

import { BespokeWeaponType } from './bespoke-forge.constants';

export type EquipmentQuality = 'NORMAL' | 'FINE' | 'MASTERWORK' | 'LEGENDARY';

export interface BespokeForgeRequestDTO {
  characterId?: string;
  weaponType?: BespokeWeaponType;
  customName?: string;
  targetDestination?: 'WAREHOUSE' | 'EQUIP_IMMEDIATELY' | 'GIFT_TO_NPC';
  giftTargetNpcId?: string;
}

export interface ForgeRateTierDTO {
  tier: EquipmentQuality;
  tierLabelVi: string;
  probabilityPercent: number;
  warRange: string;
  ldrRange: string;
}

export interface BespokeForgeRatesDTO {
  craAttr: number;
  fatigue: number;
  craftsmanTier: number;
  effectiveMasteryScore: number;
  tiers: ForgeRateTierDTO[];
  canForge: boolean;
  reasonCannotForge?: string;
}

export interface BespokeForgeResultDTO {
  success: boolean;
  itemCode: string;
  customName: string;
  nameVi: string;
  nameEn: string;
  quality: EquipmentQuality;
  qualityLabelVi: string;
  statModifiers: Record<string, number>;
  fatigueConsumed: number;
  expGained: number;
  materialsConsumed: Array<{ itemCode: string; itemNameVi: string; quantity: number }>;
  destination: string;
  messageVi: string;
  messageEn: string;
}
