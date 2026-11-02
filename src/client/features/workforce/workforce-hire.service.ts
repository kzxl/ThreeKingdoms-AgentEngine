/**
 * Specialist hire client: server-owned quote and contract execution.
 */

import { apiClient } from '../../core/api/client-api';

export interface HireQuote {
  npcId: string;
  candidateName: string;
  businessId: string;
  businessName: string;
  recommendedRole: string;
  signingBonus: number;
  baseSigningBonus: number;
  fameDiscount: number;
  virtueDiscount: number;
  monthlyWage: number;
  efficiencyBonus: number;
  minFame: number;
  fame: number;
  virtue: number;
  affinity: number;
  canHire: boolean;
  refusalReasonVi: string;
  retryAfterDate: string | null;
  alreadyHired: boolean;
  assignedBusinessName: string | null;
}

export class WorkforceHireService {
  private static instance: WorkforceHireService;

  public static getInstance(): WorkforceHireService {
    if (!WorkforceHireService.instance) WorkforceHireService.instance = new WorkforceHireService();
    return WorkforceHireService.instance;
  }

  public async quote(candidateName: string, characterId = 'PLY-0001'): Promise<HireQuote> {
    const res = await apiClient.get('/api/workforce/quote', { candidateName, characterId });
    return (res as any).quote;
  }

  public async hire(candidateName: string, characterId = 'PLY-0001'): Promise<any> {
    return apiClient.post('/api/workforce/hire', {
      candidateName,
      characterId,
      idempotencyKey: `workforce-hire-${candidateName}-${Date.now()}`
    });
  }
}

export const workforceHireService = WorkforceHireService.getInstance();
