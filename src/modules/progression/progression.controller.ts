/**
 * ThreeKingdoms-AgentEngine: Progression & Spatial Location REST Controller
 * (src/modules/progression/progression.controller.ts)
 *
 * Exposes REST APIs:
 * - GET  /api/progression/status
 * - POST /api/location/switch
 * - GET  /api/location/current
 *
 * Adheres strictly to AgentOption Universe Architecture v4.0.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import { SpatialGuardService } from './spatial-guard.service';

export function registerProgressionRoutes(router: Router): void {
  const guard = SpatialGuardService.getInstance();

  /**
   * 1. GET /api/progression/status & /api/progression/state
   */
  const handleGetStatus = (req: any, res: any, ctx: RouteContext) => {
    try {
      const playerId = (ctx.query.playerId as string) || (ctx.query.characterId as string) || 'PLY-0001';
      const status = guard.getProgressionStatus(playerId);
      sendJson(res, 200, { success: true, ...status });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/progression/status', handleGetStatus);
  router.get('/api/progression/state', handleGetStatus);

  /**
   * 2. POST /api/location/switch & /api/location/update
   */
  const handleSwitchLocation = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const playerId = body.playerId || body.characterId || 'PLY-0001';
      const newLocation = body.location || body.newLocation || body.subLocation;

      if (!newLocation) {
        sendJson(res, 400, { success: false, error: 'newLocation is required.' });
        return;
      }

      guard.setPlayerCurrentLocation(playerId, newLocation);
      const status = guard.getProgressionStatus(playerId);

      sendJson(res, 200, {
        success: true,
        message: `Đã di chuyển tới ${newLocation}.`,
        currentLocation: newLocation,
        progression: status
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/location/switch', handleSwitchLocation);
  router.post('/api/location/update', handleSwitchLocation);

  /**
   * 3. GET /api/location/current
   */
  router.get('/api/location/current', (req: any, res: any, ctx: RouteContext) => {
    try {
      const playerId = (ctx.query.playerId as string) || 'PLY-0001';
      const location = guard.getPlayerCurrentLocation(playerId);
      sendJson(res, 200, { success: true, playerId, currentLocation: location });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });
}
