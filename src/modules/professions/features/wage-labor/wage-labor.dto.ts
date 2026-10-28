/**
 * ThreeKingdoms-AgentEngine: Wage Labor Data Transfer Objects (DTOs)
 * (src/modules/professions/features/wage-labor/wage-labor.dto.ts)
 *
 * Scoped DTOs for the Wage Labor vertical slice adhering to
 * AgentOption Folder-per-Feature architecture.
 */

import { ShiftTemplate } from './wage-labor.constants';

export interface StaminaProfileDTO {
  maxStamina: number;
  currentStamina: number;
  fatigue: number;
  staminaPct: number;
  fatiguePct: number;
  health: number;
  warAttr: number;
}

export interface LaborShiftItemDTO extends ShiftTemplate {
  canPerform: boolean;
  canWork?: boolean;
  reasonCannotPerform?: string;
}

export interface WageLaborOverviewDTO {
  characterId: string;
  characterName: string;
  playerCash: number;
  playerSafeCash: number;
  stamina: StaminaProfileDTO;
  shifts: LaborShiftItemDTO[];
}

export interface WorkShiftExecutionDTO {
  success: boolean;
  shiftId: string;
  jobType: string;
  titleVi: string;
  wageEarned: number;
  wagePaid: number;
  staminaConsumed: number;
  fatigueCost: number;
  fatigueConsumed: number;
  remainingStamina: number;
  newFatigue: number;
  stamina: StaminaProfileDTO;
  newLiquidCash: number;
  newBalance: number;
  professionCode: string;
  professionExpGained: number;
  attributeTarget: string;
  attributeExpGained: number;
  messageVi: string;
  messageEn?: string;
}
