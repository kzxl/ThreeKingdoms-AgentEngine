/**
 * ThreeKingdoms-AgentEngine: Lineage & Family Service
 * (src/client/features/lineage-family/lineage-family.service.ts)
 */

import { apiClient } from '../../core/api/client-api';
import { CourtshipCandidate, LineageOverview } from './lineage-family.types';

export class LineageFamilyService {
  private static instance: LineageFamilyService;

  public static getInstance(): LineageFamilyService {
    if (!LineageFamilyService.instance) {
      LineageFamilyService.instance = new LineageFamilyService();
    }
    return LineageFamilyService.instance;
  }

  public async getOverview(): Promise<LineageOverview> {
    const res = await apiClient.get('/api/lineage/status');
    return res.overview || res;
  }

  public async getCourtshipCandidates(): Promise<CourtshipCandidate[]> {
    const res = await apiClient.get('/api/lineage/courtship-candidates');
    return res.candidates || [];
  }

  public async proposeMarriage(candidateId: string): Promise<any> {
    return apiClient.post('/api/lineage/propose-marriage', { candidateId });
  }

  public async restAndCohabit(spouseId: string): Promise<any> {
    return apiClient.post('/api/lineage/rest-cohabit', { spouseId });
  }

  public async assignHouseholdRole(marriageId: string, role: string): Promise<any> {
    return apiClient.post('/api/lineage/assign-role', { marriageId, role });
  }

  public async getHeirs(): Promise<any> {
    return apiClient.get('/api/lineage/heirs');
  }

  public async assignMentor(childId: string, mentorId: string): Promise<any> {
    return apiClient.post('/api/lineage/assign-mentor', { childId, mentorId });
  }

  public async designateHeir(childId: string): Promise<any> {
    return apiClient.post('/api/lineage/designate-heir', { childId });
  }

  public async getSuccessionPreview(): Promise<any> {
    return apiClient.get('/api/lineage/succession-preview');
  }

  public async executeSuccession(): Promise<any> {
    return apiClient.post('/api/lineage/execute-succession', {});
  }
}

export const lineageFamilyService = LineageFamilyService.getInstance();
