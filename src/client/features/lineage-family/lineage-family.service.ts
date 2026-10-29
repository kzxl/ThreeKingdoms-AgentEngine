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
    return apiClient.post('/api/lineage/courtship/propose', { spouseNpcId: candidateId });
  }

  public async restAndCohabit(marriageId: string): Promise<any> {
    return apiClient.post('/api/lineage/household/rest', { marriageId });
  }

  public async assignHouseholdRole(marriageId: string, role: string): Promise<any> {
    return apiClient.post('/api/lineage/household/set-role', { marriageId, role });
  }


  public async assignMentor(childId: string, mentorId: string): Promise<any> {
    return apiClient.post('/api/lineage/children/assign-mentor', { childId, mentorNpcId: mentorId });
  }

  public async designateHeir(childId: string): Promise<any> {
    return apiClient.post('/api/lineage/children/designate-heir', { childId });
  }


  public async executeSuccession(heirChildId: string): Promise<any> {
    return apiClient.post('/api/lineage/succession/execute', { heirChildId });
  }
}

export const lineageFamilyService = LineageFamilyService.getInstance();
