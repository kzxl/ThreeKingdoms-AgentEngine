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
import { ExplorationService } from './exploration.service';
import { QuestService } from './quest.service';
import { SkillService } from './skill.service';
import { DatabaseService } from '../../core/database';
import { computeCareerPaths } from '../../../engine/career-paths';
import { ConditionService } from '../military/condition.service';

export function registerProgressionRoutes(router: Router): void {
  const guard = SpatialGuardService.getInstance();
  const exploration = ExplorationService.getInstance();

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

  /** Active injuries/conditions and the combat penalty they impose. */
  router.get('/api/conditions', (req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = (ctx.query.characterId as string) || 'PLY-0001';
      const service = ConditionService.forDatabase(DatabaseService.getInstance());
      sendJson(res, 200, {
        success: true,
        characterId,
        penalty: service.getCombatPenalty(characterId),
        conditions: service.list(characterId)
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  /**
   * 5 career identities. Scores are derived from the 8-axis stats, wealth,
   * fame, professions and duel record; the highest score is the leading path.
   */
  router.get('/api/progression/career-paths', (req: any, res: any, ctx: RouteContext) => {
    try {
      const playerId = (ctx.query.playerId as string) || 'PLY-0001';
      const db = DatabaseService.getInstance();
      // One resolver: the API shows exactly the modifiers gameplay applies.
      const career = computeCareerPaths(db as any, playerId);
      sendJson(res, 200, {
        success: true,
        playerId,
        activePath: career.activePath,
        activeScore: career.activeScore,
        modifiers: career.modifiers,
        paths: career.paths
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  /**
   * Quest log: list DB-authored questlines and per-player progress.
   */
  const handleListQuests = (req: any, res: any, ctx: RouteContext) => {
    try {
      const playerId = (ctx.query.playerId as string) || (ctx.query.characterId as string) || 'PLY-0001';
      const service = QuestService.forDatabase(DatabaseService.getInstance());
      sendJson(res, 200, { success: true, playerId, quests: service.list(playerId) });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };
  router.get('/api/quests', handleListQuests);
  router.get('/api/quests/log', handleListQuests);

  const handleAcceptQuest = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      if (!body.questId) {
        sendJson(res, 400, { success: false, error: 'questId is required.' });
        return;
      }
      const service = QuestService.forDatabase(DatabaseService.getInstance());
      sendJson(res, 200, { success: true, quest: service.accept(String(body.questId), body.playerId || 'PLY-0001') });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };
  router.post('/api/quests/accept', handleAcceptQuest);

  const handleAdvanceQuest = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      if (!body.questId) {
        sendJson(res, 400, { success: false, error: 'questId is required.' });
        return;
      }
      const service = QuestService.forDatabase(DatabaseService.getInstance());
      const result = service.advance(String(body.questId), body.playerId || 'PLY-0001', {
        roll: body.roll
      });
      sendJson(res, 200, { success: true, result });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };
  router.post('/api/quests/advance', handleAdvanceQuest);

  /**
   * Player skill sheet with structured effects (migration 036).
   */
  router.get('/api/skills', (_req: any, res: any, _ctx: RouteContext) => {
    try {
      const service = SkillService.forDatabase(DatabaseService.getInstance());
      sendJson(res, 200, { success: true, skills: service.list(), talents: service.listTalents() });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  router.get('/api/perks', (req: any, res: any, ctx: RouteContext) => {
    try {
      const skillCode = String(ctx.query.skillCode || '');
      if (!skillCode) {
        sendJson(res, 400, { success: false, error: 'skillCode is required.' });
        return;
      }
      const service = SkillService.forDatabase(DatabaseService.getInstance());
      sendJson(res, 200, { success: true, skillCode, perks: service.availablePerks(skillCode) });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  router.post('/api/perks/choose', (req: any, res: any, ctx: RouteContext) => {
    try {
      const perkCode = String((ctx.body || {}).perkCode || '');
      if (!perkCode) {
        sendJson(res, 400, { success: false, error: 'perkCode is required.' });
        return;
      }
      const service = SkillService.forDatabase(DatabaseService.getInstance());
      sendJson(res, 200, { success: true, perk: service.choosePerk(perkCode) });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  });

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

  /**
   * 4. POST /api/explore — spend one day searching the current POI.
   */
  router.post('/api/explore', (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const result = exploration.explore({
        characterId: body.characterId || body.playerId || 'PLY-0001',
        location: body.location,
        poiName: body.poiName
      });
      sendJson(res, result.success ? 200 : 400, result);
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });
}
