/**
 * Map registry REST surface: one payload for nodes, sub-locations, POIs and
 * resource nodes.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import { DatabaseService } from '../../core/database';
import { MapRegistryService } from './map-registry.service';
import { WildernessService } from './wilderness.service';
import { CityMapService } from './city-map.service';
import { chargePlayerAction } from '../../shared/action-time';
import { requestIdempotencyKey, findIdempotentResult, recordAction } from '../../shared/action-journal';
import { getGameDate } from '../../shared/game-clock';

export function registerMapRoutes(router: Router): void {
  const db = DatabaseService.getInstance();
  const service = MapRegistryService.forDatabase(db);
  const wilderness = WildernessService.forDatabase(db);
  const cityMap = CityMapService.forDatabase(db);

  router.get('/api/map/registry', (_req: any, res: any) => {
    try {
      const registry = service.getRegistry();
      sendJson(res, 200, {
        success: true,
        ...registry
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  router.get('/api/map/wilderness', (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = String(ctx.query.characterId || 'PLY-0001');
      const nodeId = ctx.query.nodeId ? String(ctx.query.nodeId) : undefined;
      sendJson(res, 200, { success: true, ...wilderness.list(characterId, nodeId) });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message });
    }
  });

  router.get('/api/map/city', (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = String(ctx.query.characterId || 'PLY-0001');
      const nodeId = ctx.query.nodeId ? String(ctx.query.nodeId) : undefined;
      sendJson(res, 200, { success: true, ...cityMap.list(characterId, nodeId) });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message });
    }
  });

  router.post('/api/map/city/enter', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const characterId = String(body.characterId || 'PLY-0001');
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const result = cityMap.enter(characterId, String(body.subLocationId || ''));
      const response = { result };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'CITY_ENTER',
        payload: { characterId, subLocationId: body.subLocationId },
        result: response
      });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
    }
  });

  router.post('/api/map/wilderness/travel', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const characterId = String(body.characterId || 'PLY-0001');
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const time = chargePlayerAction(db.path, 'MOVE_LOCATION', null, 'Wilderness travel');
      const result = wilderness.travel(characterId, String(body.subLocationId || ''), getGameDate(db));
      const response = { result, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'WILDERNESS_TRAVEL',
        payload: { characterId, subLocationId: body.subLocationId },
        result: response
      });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
    }
  });
}
