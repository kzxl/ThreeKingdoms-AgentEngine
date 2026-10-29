/**
 * ThreeKingdoms-AgentEngine: Enterprise & Workshop Service
 * (src/client/features/enterprise-workshop/enterprise-workshop.service.ts)
 */

import { apiClient } from '../../core/api/client-api';
import { EnterpriseRecord } from './enterprise-workshop.types';

export class EnterpriseWorkshopService {
  private static instance: EnterpriseWorkshopService;

  public static getInstance(): EnterpriseWorkshopService {
    if (!EnterpriseWorkshopService.instance) {
      EnterpriseWorkshopService.instance = new EnterpriseWorkshopService();
    }
    return EnterpriseWorkshopService.instance;
  }

  public async getStatus(characterId = 'PLY-0001'): Promise<{
    activeEnterprises: EnterpriseRecord[];
    laborOptions: any[];
  }> {
    const res = await apiClient.get('/api/enterprise/status', { characterId });
    return res.status || res;
  }

  public async manageSafeCash(enterpriseId: string, action: 'DEPOSIT' | 'WITHDRAW', amount: number): Promise<any> {
    return apiClient.post('/api/enterprise/manage-safe-cash', { enterpriseId, action, amount });
  }

  public async executeLaborShift(shiftType: string, targetEnterpriseId?: string): Promise<any> {
    return apiClient.post('/api/enterprise/labor-shift', { shiftType, targetEnterpriseId });
  }
}

export const enterpriseWorkshopService = EnterpriseWorkshopService.getInstance();
