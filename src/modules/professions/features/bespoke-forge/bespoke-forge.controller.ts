/**
 * ThreeKingdoms-AgentEngine: Bespoke Forge REST Controller
 * (src/modules/professions/features/bespoke-forge/bespoke-forge.controller.ts)
 */

import { Router, sendJson, RouteContext } from '../../../../server/router';
import { BespokeForgeService } from './bespoke-forge.service';
import { SpatialGuardService } from '../../../progression/spatial-guard.service';
import { DatabaseService } from '../../../../core/database';
import { chargePlayerAction } from '../../../../shared/action-time';
import { requestIdempotencyKey, findIdempotentResult, recordAction } from '../../../../shared/action-journal';

export function registerBespokeForgeRoutes(router: Router): void {
  const service = BespokeForgeService.getInstance();
  const guard = SpatialGuardService.getInstance();

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
   * Spatial Guard: Requires presence at a Smithy / Forge.
   */
  router.post('/api/forge/bespoke', (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const charId = body.characterId || 'PLY-0001';

      // Spatial Presence Verification Guard
      guard.assertPresence(
        charId,
        ['Thiết Điếm', 'Lò Rèn', 'Smithy', 'Forge'],
        'Rèn Đúc Thần Binh',
        body.bypassSpatialGuard
      );

      const db = DatabaseService.getInstance();
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { ...prior, idempotent: true });
        return;
      }

      const time = chargePlayerAction(
        db.path,
        'PRODUCTION_BATCH',
        null,
        `Bespoke forge ${body.customName || ''}`.trim()
      );

      const result = service.forgeWeapon(body);
      const response = { ...result, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'FORGE_BESPOKE_WEAPON',
        payload: body,
        result: response
      });
      sendJson(res, 200, { ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
    }
  });
}
