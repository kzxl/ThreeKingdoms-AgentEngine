/**
 * ThreeKingdoms-AgentEngine: Specialist Workforce Controller
 * (src/modules/professions/features/workforce/specialist-workforce.controller.ts)
 *
 * Exposes REST APIs for specialist workforce recruitment and enterprise assignments.
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { Router, sendJson, RouteContext } from '../../../../server/router';
import { SpecialistWorkforceService } from './specialist-workforce.service';

export function registerSpecialistWorkforceRoutes(router: Router): void {
  const service = SpecialistWorkforceService.getInstance();

  // 1. GET /api/workforce/specialists
  router.get('/api/workforce/specialists', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const locationId = ctx.query.locationId as string | undefined;
      const characterId = (ctx.query.characterId as string) || 'PLY-0001';
      const specialists = service.getAvailableSpecialists(locationId, characterId);
      sendJson(res, 200, {
        success: true,
        count: specialists.length,
        specialists
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  // 1b. GET /api/workforce/businesses
  router.get('/api/workforce/businesses', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = (ctx.query.characterId as string) || 'PLY-0001';
      const businesses = service.getPlayerBusinesses(characterId);
      sendJson(res, 200, {
        success: true,
        count: businesses.length,
        businesses
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  // 2. POST /api/workforce/hire
  router.post('/api/workforce/hire', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      let { npcId, candidateName, businessId, role, characterId = 'PLY-0001' } = ctx.body || {};

      if (!npcId && candidateName) {
        // Resolve npcId by candidateName from master_characters
        const candidate = service.resolveCandidateByName(candidateName);
        if (candidate) {
          npcId = candidate.npcId;
        }
      }

      if (!npcId) {
        sendJson(res, 400, { success: false, error: 'npcId hoặc candidateName là bắt buộc.' });
        return;
      }

      if (!businessId) {
        const playerBiz = service.getPlayerBusinesses(characterId);
        if (playerBiz.length > 0) {
          businessId = playerBiz[0].businessId;
        } else {
          sendJson(res, 400, { success: false, error: 'Không tìm thấy sản nghiệp khả dụng để phân bổ nhân sự.' });
          return;
        }
      }

      const result = service.hireSpecialist({
        characterId,
        npcId,
        businessId,
        role
      });

      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  });
}
