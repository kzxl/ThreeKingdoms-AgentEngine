/**
 * ThreeKingdoms-AgentEngine: Equipment & Forge Service
 * (src/client/features/equipment-forge/equipment-forge.service.ts)
 */

import { apiClient } from '../../core/api/client-api';
import { BespokeForgePayload, EquipmentOverview } from './equipment-forge.types';

export class EquipmentForgeService {
  private static instance: EquipmentForgeService;

  public static getInstance(): EquipmentForgeService {
    if (!EquipmentForgeService.instance) {
      EquipmentForgeService.instance = new EquipmentForgeService();
    }
    return EquipmentForgeService.instance;
  }

  public async getOverview(characterId = 'PLY-0001'): Promise<EquipmentOverview> {
    const res = await apiClient.get('/api/equipment/overview', { characterId });
    return res.overview || res;
  }

  public async equipItem(characterId: string, slot: string, itemCode: string): Promise<any> {
    return apiClient.post('/api/equipment/equip', { characterId, slot, itemCode });
  }

  public async unequipItem(characterId: string, slot: string): Promise<any> {
    return apiClient.post('/api/equipment/unequip', { characterId, slot });
  }

  public async forgeBespokeWeapon(payload: BespokeForgePayload): Promise<any> {
    return apiClient.post('/api/equipment/forge/bespoke', payload);
  }
}

export const equipmentForgeService = EquipmentForgeService.getInstance();
