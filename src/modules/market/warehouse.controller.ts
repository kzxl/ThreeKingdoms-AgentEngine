/**
 * Warehouse REST surface: rent/buy, renew, deposit and withdraw.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import { DatabaseService } from '../../core/database';
import { chargePlayerAction } from '../../shared/action-time';
import { requestIdempotencyKey, findIdempotentResult, recordAction } from '../../shared/action-journal';
import { LOC_TO_NODE_MAP } from '../ecology-logistics/spatial-registry';
import { WarehouseService } from './warehouse.service';

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

export function registerWarehouseRoutes(router: Router): void {
  const db = DatabaseService.getInstance();
  const service = WarehouseService.forDatabase(db);

  router.get('/api/warehouses', (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = String(ctx.query.characterId || 'PLY-0001');
      sendJson(res, 200, { success: true, warehouses: service.listWarehouses(characterId, currentDate(db)) });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  router.get('/api/warehouses/:warehouseId', (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = String(ctx.query.characterId || 'PLY-0001');
      sendJson(res, 200, { success: true, warehouse: service.getWarehouse(characterId, String(ctx.params.warehouseId), currentDate(db)) });
    } catch (err: any) {
      sendJson(res, 404, { success: false, error: err.message });
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

  router.post('/api/warehouses/rent', async (_req: any, res: any, ctx: RouteContext) => {
    const body = ctx.body || {};
    const settlementId = resolveSettlement(db, body.settlementId ? String(body.settlementId) : undefined);
    await mutate(res, ctx, 'WAREHOUSE_RENT', (characterId, date) =>
      service.rent(characterId, settlementId, date, Number(body.capacity) || undefined)
    );
  });

  router.post('/api/warehouses/buy', async (_req: any, res: any, ctx: RouteContext) => {
    const body = ctx.body || {};
    const settlementId = resolveSettlement(db, body.settlementId ? String(body.settlementId) : undefined);
    await mutate(res, ctx, 'WAREHOUSE_BUY', (characterId, date) =>
      service.buy(characterId, settlementId, date)
    );
  });

  router.post('/api/warehouses/renew', async (_req: any, res: any, ctx: RouteContext) => {
    const body = ctx.body || {};
    await mutate(res, ctx, 'WAREHOUSE_RENEW', (characterId, date) =>
      service.renew(characterId, String(body.warehouseId || ''), date)
    );
  });

  router.post('/api/warehouses/deposit', async (_req: any, res: any, ctx: RouteContext) => {
    const body = ctx.body || {};
    await mutate(res, ctx, 'WAREHOUSE_DEPOSIT', (characterId, date) =>
      service.deposit(characterId, String(body.warehouseId || ''), String(body.itemCode || ''), Number(body.quantity || 0), date)
    );
  });

  router.post('/api/warehouses/withdraw', async (_req: any, res: any, ctx: RouteContext) => {
    const body = ctx.body || {};
    await mutate(res, ctx, 'WAREHOUSE_WITHDRAW', (characterId, date) =>
      service.withdraw(characterId, String(body.warehouseId || ''), String(body.itemCode || ''), Number(body.quantity || 0), date)
    );
  });
}
