/**
 * ThreeKingdoms-AgentEngine: Tavern Banquets & Hero Recruitment Controller
 * (src/modules/social-kizuna/banquet.controller.ts)
 *
 * Exposes REST APIs for Grand Command Hub (Tụ Nghĩa Tab) & Game Clients:
 * - POST /api/banquet/host (and /api/banquets/host)
 * - POST /api/banquet/brotherhood (and /api/banquets/swear-brotherhood)
 * - POST /api/banquet/recruit (and /api/banquets/recruit-retainer)
 * - GET  /api/banquet/tiers (and /api/banquets/tiers)
 * - GET  /api/banquet/status (and /api/banquets/status)
 * - GET  /api/banquet/guests (and /api/banquets/guests)
 *
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import {
  TavernBanquetService,
  BanquetTier,
  HostBanquetParams,
  RecruitRetainerParams
} from './tavern-banquet.service';

export function registerBanquetRoutes(router: Router): void {
  const banquetService = TavernBanquetService.getInstance();

  /**
   * 1. POST /api/banquet/host & /api/banquets/host
   * Hosts a banquet consuming gourmet dishes & wine, accelerating affinity/respect
   */
  const handleHostBanquet = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const tier = (body.tier || 'TIET_KIEM') as BanquetTier;
      const guestNpcIds = Array.isArray(body.guestNpcIds) ? body.guestNpcIds : (body.guestId ? [body.guestId] : []);
      const tavernEnterpriseId = body.tavernEnterpriseId || body.businessId;
      const playerId = body.playerId || 'PLY-0001';
      const allowAutoProcure = body.allowAutoProcure !== false;

      const params: HostBanquetParams = {
        playerId,
        tavernEnterpriseId,
        tier,
        guestNpcIds,
        allowAutoProcure
      };

      const result = banquetService.hostBanquet(params);
      sendJson(res, 200, { success: true, result });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/banquet/host', handleHostBanquet);
  router.post('/api/banquets/host', handleHostBanquet);

  /**
   * 2. POST /api/banquet/brotherhood & /api/banquets/swear-brotherhood
   * Swears Peach Garden Brotherhood with a hero having Affinity >= 80
   */
  const handleSwearBrotherhood = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const npcId = body.npcId || body.heroNpcId;
      const playerId = body.playerId || 'PLY-0001';

      if (!npcId) {
        sendJson(res, 400, { success: false, error: 'Missing npcId in request body' });
        return;
      }

      const result = banquetService.swearBrotherhood(npcId, playerId);
      sendJson(res, 200, { success: true, result });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/banquet/brotherhood', handleSwearBrotherhood);
  router.post('/api/banquets/swear-brotherhood', handleSwearBrotherhood);
  router.post('/api/banquet/swear-brotherhood', handleSwearBrotherhood);

  /**
   * 3. POST /api/banquet/recruit & /api/banquets/recruit-retainer
   * Recruits a hero with Affinity >= 70 or sworn brotherhood into FAC-LIANG-CLAN
   */
  const handleRecruitRetainer = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const heroNpcId = body.heroNpcId || body.npcId;
      const assignedRole = body.assignedRole || body.courtRank || 'OFFICER';
      const playerId = body.playerId || 'PLY-0001';

      if (!heroNpcId) {
        sendJson(res, 400, { success: false, error: 'Missing heroNpcId in request body' });
        return;
      }

      const params: RecruitRetainerParams = {
        playerId,
        heroNpcId,
        assignedRole
      };

      const result = banquetService.recruitRetainer(params);
      sendJson(res, 200, { success: true, result });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/banquet/recruit', handleRecruitRetainer);
  router.post('/api/banquets/recruit-retainer', handleRecruitRetainer);
  router.post('/api/banquet/recruit-retainer', handleRecruitRetainer);

  /**
   * 4. GET /api/banquet/tiers & /api/banquets/tiers
   * Returns recipes, capacities, and cost thresholds for all banquet tiers
   */
  const handleGetTiers = (req: any, res: any) => {
    try {
      const tiers = banquetService.getBanquetTiers();
      sendJson(res, 200, { success: true, tiers });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/banquet/tiers', handleGetTiers);
  router.get('/api/banquets/tiers', handleGetTiers);

  /**
   * 5. GET /api/banquet/status & /api/banquets/status
   * Telemetry and executive dashboard for Tụ Nghĩa (Tavern & Hero Recruitment)
   */
  const handleGetStatus = (req: any, res: any, ctx: RouteContext) => {
    try {
      const rawPlayerId = ctx.query?.playerId;
      const playerId = (Array.isArray(rawPlayerId) ? rawPlayerId[0] : rawPlayerId) || 'PLY-0001';
      const status = banquetService.getBanquetStatus(playerId);
      sendJson(res, 200, { success: true, status });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/banquet/status', handleGetStatus);
  router.get('/api/banquets/status', handleGetStatus);

  /**
   * 6. GET /api/banquet/guests & /api/banquets/guests
   * Lists visiting heroes eligible for banquets and recruitment
   */
  const handleGetGuests = (req: any, res: any) => {
    try {
      const status = banquetService.getBanquetStatus('PLY-0001');
      sendJson(res, 200, { success: true, guests: status.guests });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/banquet/guests', handleGetGuests);
  router.get('/api/banquets/guests', handleGetGuests);
}
