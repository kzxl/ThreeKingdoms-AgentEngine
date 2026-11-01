/**
 * NPC freight contracts REST surface.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import { DatabaseService } from '../../core/database';
import { chargePlayerAction } from '../../shared/action-time';
import { requestIdempotencyKey, findIdempotentResult, recordAction } from '../../shared/action-journal';
import { LOC_TO_NODE_MAP } from '../ecology-logistics/spatial-registry';
import { FreightService } from './freight.service';

function currentDate(db: DatabaseService): string {
  return db.queryOne<{ d: string }>('SELECT "current_date" AS d FROM campaign_meta LIMIT 1;')?.d || '184-05-02';
}

function resolveSettlement(db: DatabaseService, settlementId?: string): string {
  if (settlementId) return settlementId;
  const location = db.queryOne<{ current_location: string }>(
    "SELECT current_location FROM player_state WHERE player_id = 'PLY-0001' LIMIT 1;"
  )?.current_location || 'LOC-0001';
  return LOC_TO_NODE_MAP[location] || location;
}

export function registerFreightRoutes(router: Router): void {
  const db = DatabaseService.getInstance();
  const service = FreightService.forDatabase(db);

  router.get('/api/freight/contracts', (_req: any, res: any, ctx: RouteContext) => {
    try {
      const settlementId = resolveSettlement(db, ctx.query.settlementId ? String(ctx.query.settlementId) : undefined);
      sendJson(res, 200, {
        success: true,
        settlementId,
        contracts: service.listContracts(settlementId, currentDate(db))
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  router.get('/api/freight/shipments', (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = String(ctx.query.characterId || 'PLY-0001');
      sendJson(res, 200, { success: true, shipments: service.listShipments(characterId) });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  const mutate = async (
    res: any,
    ctx: RouteContext,
    actionType: string,
    run: (characterId: string, date: string) => any
  ) => {
    try {
      const body = ctx.body || {};
      const characterId = String(body.characterId || 'PLY-0001');
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const time = chargePlayerAction(db.path, 'ADMIN_ACTION', null, actionType);
      const result = run(characterId, currentDate(db));
      const response = { result, time };
      recordAction(db, { key: idempotencyKey, actionType, payload: body, result: response });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
    }
  };

  router.post('/api/freight/accept', async (_req: any, res: any, ctx: RouteContext) => {
    const body = ctx.body || {};
    await mutate(res, ctx, 'FREIGHT_ACCEPT', (characterId, date) =>
      service.accept(characterId, String(body.contractId || ''), String(body.guardTier || 'VETERAN'), date)
    );
  });

  router.post('/api/freight/deliver', async (_req: any, res: any, ctx: RouteContext) => {
    const body = ctx.body || {};
    await mutate(res, ctx, 'FREIGHT_DELIVER', (characterId, date) =>
      service.deliver(characterId, String(body.shipmentId || ''), date)
    );
  });
}
