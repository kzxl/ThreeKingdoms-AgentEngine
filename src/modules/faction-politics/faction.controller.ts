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
}
