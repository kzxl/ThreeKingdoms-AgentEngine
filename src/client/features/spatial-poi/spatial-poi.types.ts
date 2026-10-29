/**
 * ThreeKingdoms-AgentEngine: Spatial POI Feature Types
 * (src/client/features/spatial-poi/spatial-poi.types.ts)
 */

export interface BanquetTier {
  id: string;
  nameVi: string;
  nameEn: string;
  costQian: number;
  wineItemCode: string;
  wineQty: number;
  durationDays: number;
  moraleBoost: number;
  affinityGain: number;
  prestigeGain: number;
  descriptionVi: string;
}

export interface ArenaOpponent {
  id: string;
  nameVi: string;
  titleVi: string;
  tier: 'NOVICE' | 'VETERAN' | 'CHAMPION';
  warAttr: number;
  weaponVi: string;
  rewardQian: number;
  rewardExp: number;
}

export interface DuelRoundState {
  round: number;
  playerHp: number;
  playerMorale: number;
  playerSpirit: number;
  oppHp: number;
  oppMorale: number;
  oppSpirit: number;
  isConcluded: boolean;
  outcome?: string;
  combatLogs: string[];
}
