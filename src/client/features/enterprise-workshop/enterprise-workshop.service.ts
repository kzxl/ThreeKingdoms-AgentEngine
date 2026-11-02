/**
 * ThreeKingdoms-AgentEngine: Enterprise & Workshop Service
 * (src/client/features/enterprise-workshop/enterprise-workshop.service.ts)
 */

import { apiClient } from '../../core/api/client-api';
import { EnterpriseStatus } from './enterprise-workshop.types';

export class EnterpriseWorkshopService {
  private static instance: EnterpriseWorkshopService;

  public static getInstance(): EnterpriseWorkshopService {
    if (!EnterpriseWorkshopService.instance) {
      EnterpriseWorkshopService.instance = new EnterpriseWorkshopService();
    }
    return EnterpriseWorkshopService.instance;
  }

  public async getStatus(characterId = 'PLY-0001'): Promise<EnterpriseStatus> {
    const res = await apiClient.get('/api/enterprise/status', { characterId });
    return (res.status || res) as EnterpriseStatus;
  }

  public async manageSafeCash(enterpriseId: string, action: 'DEPOSIT' | 'WITHDRAW', amount: number): Promise<any> {
    return apiClient.post('/api/enterprise/manage-safe-cash', {
      businessId: enterpriseId,
      action,
      amount,
      idempotencyKey: `enterprise-cash-${enterpriseId}-${action}-${Date.now()}`
    });
  }

  public async executeLaborShift(shiftType: string): Promise<any> {
    return apiClient.post('/api/enterprise/work', {
      shiftId: shiftType,
      idempotencyKey: `enterprise-work-${shiftType}-${Date.now()}`
    });
  }

  public async collectProfits(businessId: string, amount?: number): Promise<any> {
    return apiClient.post('/api/enterprise/collect', {
      businessId,
      amount,
      idempotencyKey: `enterprise-collect-${businessId}-${Date.now()}`
    });
  }

  public async openEnterprise(businessType: string, turnkey = true, customName?: string): Promise<any> {
    return apiClient.post('/api/enterprise/open', {
      businessType,
      turnkey,
      customName,
      idempotencyKey: `enterprise-open-${businessType}-${Date.now()}`
    });
  }
}

export const enterpriseWorkshopService = EnterpriseWorkshopService.getInstance();
