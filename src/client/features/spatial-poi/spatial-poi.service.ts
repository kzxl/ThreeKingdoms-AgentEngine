/**
 * ThreeKingdoms-AgentEngine: Spatial POI Service
 * (src/client/features/spatial-poi/spatial-poi.service.ts)
 *
 * Every path below is a route the runtime actually registers; keep this file
 * aligned with duel.controller / banquet.controller / life.controller.
 */

import { apiClient } from '../../core/api/client-api';
import { ArenaOpponent, DuelRoundState } from './spatial-poi.types';

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
    // The tavern has no drink route; a casual drink is the legacy
    // PERSONAL_GROWTH/REST_RECOVERY action, not a banquet host.
    return apiClient.post('/api/action', {
      type: 'PERSONAL_GROWTH',
      sub_type: 'REST_RECOVERY',
      fatigue_delta: 25,
      morale_delta: 5,
      memo: 'Thưởng thức rượu tại tửu quán',
      idempotencyKey: `tavern-drink-${Date.now()}`
    });
  }

  public async hostBanquet(tierId: string): Promise<any> {
    return apiClient.post('/api/banquet/host', {
      tier: tierId,
      idempotencyKey: `banquet-host-${tierId}-${Date.now()}`
    });
  }

  public async swearBrotherhood(targetNpcId: string): Promise<any> {
    return apiClient.post('/api/banquet/brotherhood', {
      npcId: targetNpcId,
      idempotencyKey: `banquet-brotherhood-${targetNpcId}-${Date.now()}`
    });
  }

  // --- Arena Endpoints ---
  public async getArenaRoster(): Promise<{ opponents: ArenaOpponent[] }> {
    const res = await apiClient.get('/api/duel/arena/roster');
    const roster = Array.isArray((res as any).roster) ? (res as any).roster : [];
    const opponents: ArenaOpponent[] = roster.map((entry: any) => ({
      id: String(entry.opponentId || entry.id),
      nameVi: String(entry.nameVi || entry.name || entry.opponentId),
      titleVi: String(entry.titleVi || entry.tierTitleVi || ''),
      tier: entry.tier === 3 || entry.tierKey === 'TIER_3'
        ? 'CHAMPION'
        : entry.tier === 2 || entry.tierKey === 'TIER_2'
          ? 'VETERAN'
          : 'NOVICE',
      warAttr: Number(entry.war || entry.warAttr || 50),
      weaponVi: String(entry.descriptionVi || entry.weaponVi || ''),
      rewardQian: Number(entry.prizeCash || entry.rewardQian || 0),
      rewardExp: Number(entry.warExpReward || entry.rewardExp || 0)
    }));
    return { opponents };
  }

  public async startDuel(opponentId: string): Promise<{ duelId: string; state: DuelRoundState }> {
    const res = await apiClient.post('/api/duel/initiate', {
      opponentId,
      context: 'TOURNAMENT_ARENA',
      maxRounds: 5,
      idempotencyKey: `duel-initiate-${opponentId}-${Date.now()}`
    });
    const duel = (res as any).duel || {};
    return {
      duelId: String(duel.duelId || ''),
      state: duel as DuelRoundState
    };
  }

  public async executeDuelRound(duelId: string, action: string): Promise<DuelRoundState> {
    const res = await apiClient.post('/api/duel/round', {
      duelId,
      action,
      idempotencyKey: `duel-round-${duelId}-${action}-${Date.now()}`
    });
    return ((res as any).duel || res) as DuelRoundState;
  }

  // --- Residence Endpoints ---
  public async restAtResidence(days = 1): Promise<any> {
    // SLEEP is the life-layer rest action; it charges one day at the boundary.
    return apiClient.post('/api/life/act', {
      actionCode: 'SLEEP',
      days,
      idempotencyKey: `residence-sleep-${Date.now()}`
    });
  }
}

export const spatialPoiService = SpatialPoiService.getInstance();
