/**
 * ThreeKingdoms-AgentEngine: Faction Politics Read Controller
 * (src/modules/faction-politics/faction.controller.ts)
 *
 * Read-only faction, officer, settlement and political-event endpoints. These
 * used to live in the legacy `tools/sim-web.js` if-chain with a SQL fallback;
 * the module is always bootstrapped by the composition root, so the controller
 * delegates to it directly.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import { ModuleRegistry } from '../../core/module-registry';
import { FactionPoliticsModule } from './faction-politics.module';
import { SpatialGuardService } from '../progression/spatial-guard.service';
import { DatabaseService } from '../../core/database';
import { chargePlayerAction } from '../../shared/action-time';
import { requestIdempotencyKey, findIdempotentResult, recordAction } from '../../shared/action-journal';

function getFactionModule(): FactionPoliticsModule | undefined {
  return ModuleRegistry.getInstance().get<FactionPoliticsModule>('module.faction-politics');
}

function unavailable(res: any): void {
  sendJson(res, 503, { success: false, error: 'FactionPoliticsModule not initialized.' });
}

export function registerFactionReadRoutes(router: Router): void {
  router.get('/api/factions', async (_req: any, res: any, _ctx: RouteContext) => {
    try {
      const mod = getFactionModule();
      if (!mod) return unavailable(res);
      sendJson(res, 200, { success: true, factions: mod.getFactionOverview() });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  router.get('/api/factions/officers', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const mod = getFactionModule();
      if (!mod) return unavailable(res);
      const factionId = ctx.query.factionId as string | undefined;
      sendJson(res, 200, { success: true, officers: mod.getOfficers(factionId) });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  router.get('/api/factions/settlements', async (_req: any, res: any, _ctx: RouteContext) => {
    try {
      const mod = getFactionModule();
      if (!mod) return unavailable(res);
      sendJson(res, 200, { success: true, settlements: mod.getSettlements() });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  router.get('/api/factions/events', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const mod = getFactionModule();
      if (!mod) return unavailable(res);
      const limit = parseInt((ctx.query.limit as string) || '15', 10);
      sendJson(res, 200, { success: true, events: mod.getPoliticalEvents(Number.isFinite(limit) ? limit : 15) });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  router.post('/api/factions/declare-war', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const mod = getFactionModule();
      if (!mod) return unavailable(res);
      const body = ctx.body || {};
      SpatialGuardService.getInstance().assertStage(
        body.playerId || 'PLY-0001',
        4,
        'Quân Cơ Xứ Tuyên Chiến',
        body.bypassProgressionGate || body.bypassSpatialGuard
      );
      const factionId = String(body.factionId || '');
      if (!factionId) {
        sendJson(res, 400, { success: false, error: 'factionId is required.' });
        return;
      }
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(DatabaseService.getInstance(), idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const time = chargePlayerAction(
        DatabaseService.getInstance().path,
        'POLITICAL_ACTION',
        null,
        `Declare war on ${factionId}`
      );
      const response = { ...mod.declareWar(factionId), time };
      recordAction(DatabaseService.getInstance(), {
        key: idempotencyKey,
        actionType: 'FACTION_DECLARE_WAR',
        payload: { factionId },
        result: response
      });
      sendJson(res, 200, { ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message });
    }
  });

  router.post('/api/factions/make-peace', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const mod = getFactionModule();
      if (!mod) return unavailable(res);
      const factionId = String((ctx.body || {}).factionId || '');
      if (!factionId) {
        sendJson(res, 400, { success: false, error: 'factionId is required.' });
        return;
      }
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(DatabaseService.getInstance(), idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const time = chargePlayerAction(
        DatabaseService.getInstance().path,
        'POLITICAL_ACTION',
        null,
        `Make peace with ${factionId}`
      );
      const response = { ...mod.makePeace(factionId), time };
      recordAction(DatabaseService.getInstance(), {
        key: idempotencyKey,
        actionType: 'FACTION_MAKE_PEACE',
        payload: { factionId },
        result: response
      });
      sendJson(res, 200, { ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  });
}
