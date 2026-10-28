/**
 * ThreeKingdoms-AgentEngine: Bespoke Forge REST Controller
 * (src/modules/professions/features/bespoke-forge/bespoke-forge.controller.ts)
 */

import { Router, sendJson, RouteContext } from '../../../../server/router';
import { BespokeForgeService } from './bespoke-forge.service';

export function registerBespokeForgeRoutes(router: Router): void {
  const service = BespokeForgeService.getInstance();

  /**
   * GET /api/forge/rates
   * Retrieves forging success rate distribution and mastery analysis.
   */
  router.get('/api/forge/rates', (req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = (ctx.query.characterId as string) || 'PLY-0001';
      const rates = service.calculateRates(characterId);
      sendJson(res, 200, { success: true, rates });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  /**
   * POST /api/forge/bespoke
   * Crafts a bespoke god weapon with quality roll and clamped stat modifiers.
   */
  router.post('/api/forge/bespoke', (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const result = service.forgeWeapon(body);
      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  });
}
