/**
 * ThreeKingdoms-AgentEngine: Instance Management DTOs
 * (src/modules/instances/instances.dto.ts)
 */

export interface InstanceSummaryDTO {
  id: string; // 'default' or 'inst_1730...'
  filename: string;
  filepath: string;
  name: string;
  styleName: string;
  archetypeId: string;
  archetypeNameVi: string;
  age: number;
  turnNumber: number;
  gameDate: string;
  location: string;
  liquidCash: number;
  safeCash: number;
  netWorth: number;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
  isCurrent?: boolean;
}

export interface CreateInstanceDTO {
  name?: string;
  styleName?: string;
  archetypeId?: string; // defaults to 'ARCH-COMMONER-YOUTH'
}

export interface CloneInstanceDTO {
  sourceId: string;
  newLabel?: string;
}

export interface SelectInstanceResponseDTO {
  success: boolean;
  instanceId: string;
  instance?: InstanceSummaryDTO;
  messageVi: string;
}
