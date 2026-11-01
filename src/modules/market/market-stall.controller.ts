/**
 * Market stall and NPC offer REST surface.
 *
 * Player stall: open, list goods, close. NPC offers: browse the settlement and
 * buy named NPC surplus. All player mutations use time + idempotency.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import { DatabaseService } from '../../core/database';
import { chargePlayerAction } from '../../shared/action-time';
import { requestIdempotencyKey, findIdempotentResult, recordAction } from '../../shared/action-journal';
import { LOC_TO_NODE_MAP } from '../ecology-logistics/spatial-registry';
import { StallService } from './stall.service';
import { NpcMarketService } from './npc-market.service';

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

export function registerMarketStallRoutes(router: Router): void {
  const db = DatabaseService.getInstance();
  const stallService = StallService.forDatabase(db);
  const npcMarket = NpcMarketService.forDatabase(db);

  router.get('/api/stall', (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = String(ctx.query.characterId || 'PLY-0001');
      sendJson(res, 200, { success: true, stall: stallService.getStall(characterId) });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  router.post('/api/stall/open', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const characterId = String(body.characterId || 'PLY-0001');
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const time = chargePlayerAction(db.path, 'ADMIN_ACTION', null, 'Open market stall');
      const date = currentDate(db);
      const result = stallService.openStall(characterId, body.settlementId, body.name, date);
      const response = { stall: result, time };
      recordAction(db, { key: idempotencyKey, actionType: 'STALL_OPEN', payload: body, result: response });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
    }
  });

  router.post('/api/stall/list', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const characterId = String(body.characterId || 'PLY-0001');
      const itemCode = String(body.itemCode || '');
      const quantity = Number(body.quantity || 0);
      const unitPrice = Number(body.unitPrice || 0);
      if (!itemCode || quantity <= 0 || unitPrice <= 0) {
        sendJson(res, 400, { success: false, error: 'itemCode, quantity > 0 and unitPrice > 0 are required.' });
        return;
      }
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const time = chargePlayerAction(db.path, 'ADMIN_ACTION', null, `List ${itemCode} at stall`);
      const result = stallService.listItem(characterId, itemCode, quantity, unitPrice, currentDate(db));
      const response = { stall: result, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'STALL_LIST',
        payload: { characterId, itemCode, quantity, unitPrice },
        result: response
      });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
    }
  });

  router.post('/api/stall/close', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const characterId = String(body.characterId || 'PLY-0001');
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const time = chargePlayerAction(db.path, 'ADMIN_ACTION', null, 'Close market stall');
      const result = stallService.closeStall(characterId, currentDate(db));
      const response = { result, time };
      recordAction(db, { key: idempotencyKey, actionType: 'STALL_CLOSE', payload: { characterId }, result: response });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
    }
  });

  router.get('/api/market/npc-offers', (_req: any, res: any, ctx: RouteContext) => {
    try {
      const settlementId = resolveSettlement(db, ctx.query.settlementId ? String(ctx.query.settlementId) : undefined);
      sendJson(res, 200, {
        success: true,
        settlementId,
        date: currentDate(db),
        offers: npcMarket.listOffers(settlementId, currentDate(db))
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  router.post('/api/market/npc-offers/buy', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const characterId = String(body.characterId || 'PLY-0001');
      const offerId = String(body.offerId || '');
      const quantity = Number(body.quantity || 0);
      if (!offerId || quantity <= 0) {
        sendJson(res, 400, { success: false, error: 'offerId and positive quantity are required.' });
        return;
      }
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const time = chargePlayerAction(db.path, 'ADMIN_ACTION', null, `Buy NPC offer ${offerId}`);
      const result = npcMarket.buyOffer(characterId, offerId, quantity, currentDate(db));
      const response = { result, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'NPC_MARKET_BUY',
        payload: { characterId, offerId, quantity },
        result: response
      });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
    }
  });
}
