/**
 * Life Layer REST controller.
 *
 * Time is charged at the boundary (one phase for routine actions, one day for
 * sleep), idempotency is enforced through the shared action journal, and the
 * service is the only writer of life state.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import { DatabaseService } from '../../core/database';
import { chargePlayerAction } from '../../shared/action-time';
import { requestIdempotencyKey, findIdempotentResult, recordAction } from '../../shared/action-journal';
import { LifeService, LifeActionCode } from './life.service';

const VALID_ACTIONS: ReadonlySet<string> = new Set<LifeActionCode>([
  'EAT_MEAL',
  'SLEEP',
  'TEA_WITH_NPC',
  'HOUSEHOLD_UPKEEP',
  'STUDY_TRAIN',
  'LEISURE'
]);

export function registerLifeRoutes(router: Router): void {
  const service = LifeService.forDatabase(DatabaseService.getInstance());

  router.get('/api/life/status', (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = String(ctx.query.characterId || 'PLY-0001');
      sendJson(res, 200, { success: true, status: service.getStatus(characterId) });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  router.post('/api/life/act', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const actionCode = String(body.actionCode || '').toUpperCase();
      if (!VALID_ACTIONS.has(actionCode)) {
        sendJson(res, 400, { success: false, error: `Unknown life action "${actionCode}".` });
        return;
      }

      const characterId = String(body.characterId || 'PLY-0001');
      const db = DatabaseService.getInstance();
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }

      const actionType = actionCode === 'SLEEP' ? 'REST_RECOVERY' : 'ADMIN_ACTION';
      const time = chargePlayerAction(
        db.path,
        actionType,
        null,
        `Life action ${actionCode}`
      );

      const result = service.act(characterId, {
        actionCode: actionCode as LifeActionCode,
        npcId: body.npcId ? String(body.npcId) : undefined,
        skillCode: body.skillCode ? String(body.skillCode) : undefined,
        leisureType: body.leisureType ? String(body.leisureType) : undefined
      });

      const response = { result, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: `LIFE_${actionCode}`,
        payload: {
          characterId,
          actionCode,
          npcId: body.npcId || null,
          skillCode: body.skillCode || null,
          leisureType: body.leisureType || null
        },
        result: response
      });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
    }
  });
}
