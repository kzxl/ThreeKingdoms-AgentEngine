/**
 * ThreeKingdoms-AgentEngine: Spatial POI Service
 * (src/client/features/spatial-poi/spatial-poi.service.ts)
 */

import { apiClient } from '../../core/api/client-api';
import { ArenaOpponent, BanquetTier, DuelRoundState } from './spatial-poi.types';

export class SpatialPoiService {
  private static instance: SpatialPoiService;

  public static getInstance(): SpatialPoiService {
    if (!SpatialPoiService.instance) {
      SpatialPoiService.instance = new SpatialPoiService();
    }
    return SpatialPoiService.instance;
  }

  // --- Tavern Endpoints ---
  public async getBanquetStatus(): Promise<any> {
    return apiClient.get('/api/banquet/status');
  }

  public async drinkWine(): Promise<any> {
    return apiClient.post('/api/banquet/drink', {});
  }

  public async hostBanquet(tierId: string): Promise<any> {
    return apiClient.post('/api/banquet/host', { tierId });
  }

  public async swearBrotherhood(targetNpcId: string): Promise<any> {
    return apiClient.post('/api/banquet/brotherhood', { targetNpcId });
  }

  // --- Arena Endpoints ---
  public async getArenaRoster(): Promise<{ opponents: ArenaOpponent[] }> {
    return apiClient.get('/api/arena/roster');
  }

  public async startDuel(opponentId: string): Promise<{ duelId: string; state: DuelRoundState }> {
    return apiClient.post('/api/arena/duel/start', { opponentId });
  }

  public async executeDuelRound(duelId: string, action: string): Promise<DuelRoundState> {
    return apiClient.post('/api/arena/duel/round', { duelId, action });
  }

  // --- Residence Endpoints ---
  public async restAtResidence(days = 1): Promise<any> {
    return apiClient.post('/api/character/rest', { days });
  }
}

export const spatialPoiService = SpatialPoiService.getInstance();
