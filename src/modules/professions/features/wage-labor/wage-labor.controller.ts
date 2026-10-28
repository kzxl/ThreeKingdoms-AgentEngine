/**
 * ThreeKingdoms-AgentEngine: Wage Labor Controller
 * (src/modules/professions/features/wage-labor/wage-labor.controller.ts)
 *
 * REST Controller for the Wage Labor vertical slice.
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { Router, sendJson, RouteContext } from '../../../../server/router';
import { WageLaborService } from './wage-labor.service';

export class WageLaborController {
  private service: WageLaborService;

  public constructor(service?: WageLaborService) {
    this.service = service || WageLaborService.getInstance();
  }

  /**
   * Registers REST endpoints into the micro-kernel router.
   */
  public registerRoutes(router: Router): void {
    // GET /api/labor/status
    router.get('/api/labor/status', async (_req, res, ctx: RouteContext) => {
      try {
        const characterId = (ctx.query.characterId as string) || 'PLY-0001';
        const data = this.service.getLaborOverview(characterId);
        sendJson(res, 200, { success: true, data });
      } catch (err: any) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });

    // POST /api/labor/work
    router.post('/api/labor/work', async (_req, res, ctx: RouteContext) => {
      try {
        const body = ctx.body || {};
        const characterId = (body.characterId as string) || 'PLY-0001';
        const shiftId = (body.shiftId || body.jobType) as string;

        if (!shiftId) {
          sendJson(res, 400, {
            success: false,
            error: 'Thiếu mã ca làm việc (shiftId hoặc jobType).'
          });
          return;
        }

        const result = this.service.executeShift(characterId, shiftId);
        sendJson(res, 200, { success: true, result });
      } catch (err: any) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    });
  }

  /**
   * Direct invocation handler for HTTP integration in tools/sim-web.js
   */
  public getStatus(characterId: string = 'PLY-0001') {
    return this.service.getLaborOverview(characterId);
  }

  public work(characterId: string = 'PLY-0001', shiftId: string) {
    return this.service.executeShift(characterId, shiftId);
  }
}
