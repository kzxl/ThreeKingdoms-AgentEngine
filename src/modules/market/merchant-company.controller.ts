/**
 * Merchant company routes REST surface.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import { DatabaseService } from '../../core/database';
import { chargePlayerAction } from '../../shared/action-time';
import { requestIdempotencyKey, findIdempotentResult, recordAction } from '../../shared/action-journal';
import { MerchantCompanyService } from './merchant-company.service';

function currentDate(db: DatabaseService): string {
  return db.queryOne<{ d: string }>('SELECT "current_date" AS d FROM campaign_meta LIMIT 1;')?.d || '184-05-02';
}

export function registerMerchantCompanyRoutes(router: Router): void {
  const db = DatabaseService.getInstance();
  const service = MerchantCompanyService.forDatabase(db);

  router.get('/api/merchant/routes', (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = String(ctx.query.characterId || 'PLY-0001');
      sendJson(res, 200, { success: true, routes: service.listRoutes(characterId) });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  router.get('/api/merchant/events', (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = String(ctx.query.characterId || 'PLY-0001');
      const routeId = ctx.query.routeId ? String(ctx.query.routeId) : undefined;
      sendJson(res, 200, { success: true, events: service.listEvents(characterId, routeId) });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  router.post('/api/merchant/routes', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const characterId = String(body.characterId || 'PLY-0001');
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const time = chargePlayerAction(db.path, 'ADMIN_ACTION', null, 'Create merchant route');
      const result = service.createRoute(characterId, body, currentDate(db));
      const response = { route: result, time };
      recordAction(db, { key: idempotencyKey, actionType: 'MERCHANT_ROUTE_CREATE', payload: body, result: response });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
    }
  });

  router.post('/api/merchant/routes/:routeId/status', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const characterId = String(body.characterId || 'PLY-0001');
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const time = chargePlayerAction(db.path, 'ADMIN_ACTION', null, 'Toggle merchant route');
      const result = service.setStatus(characterId, String(ctx.params.routeId), String(body.status || 'PAUSED'));
      const response = { route: result, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'MERCHANT_ROUTE_STATUS',
        payload: { routeId: ctx.params.routeId, status: body.status },
        result: response
      });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
    }
  });
}
