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

  /**
   * 5 career identities. Scores are derived from the 8-axis stats, wealth,
   * fame, professions and duel record; the highest score is the leading path.
   */
  router.get('/api/progression/career-paths', (req: any, res: any, ctx: RouteContext) => {
    try {
      const playerId = (ctx.query.playerId as string) || 'PLY-0001';
      const db = DatabaseService.getInstance();
      const player = db.queryOne<any>(
        `SELECT war_attr, int_attr, pol_attr, dip_attr, com_attr, cra_attr, liquid_cash, fame
         FROM player_state WHERE player_id = ? LIMIT 1;`,
        [playerId]
      ) || {};
      let duelWins = 0;
      try {
        duelWins = Number(db.queryOne<{ c: number }>(
          `SELECT COUNT(*) AS c FROM session_duels WHERE player_id = ? AND winner_id = ?;`,
          [playerId, playerId]
        )?.c || 0);
      } catch { /* older schema */ }

      let craftTier = 1;
      try {
        const craft = db.queryOne<{ tier: number }>(
          `SELECT MAX(tier) AS tier FROM character_professions
           WHERE character_id = ? AND category IN ('CRAFTING', 'EMERGENCY');`,
          [playerId]
        );
        craftTier = Number(craft?.tier || 1);
      } catch { /* professions absent */ }

      let familyScore = 0;
      try {
        const spouse = db.queryOne<{ c: number }>(
          `SELECT COUNT(*) AS c FROM family_spouses WHERE husband_id = ? OR wife_id = ?;`,
          [playerId, playerId]
        );
        const children = db.queryOne<{ c: number }>(
          `SELECT COUNT(*) AS c FROM family_children WHERE father_id = ?;`,
          [playerId]
        );
        familyScore = (Number(spouse?.c || 0) > 0 ? 30 : 0)
          + Math.min(40, Number(children?.c || 0) * 10)
          + Math.min(30, Number(player.fame || 0) / 200);
      } catch { /* family tables absent */ }

      const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
      const paths = [
        {
          code: 'MARTIAL',
          nameVi: 'Võ Lộ', nameEn: 'Martial Path', seal: '武',
          score: clamp(Number(player.war_attr || 50) * 0.75 + Math.min(30, duelWins * 8)),
          effectVi: '+10% WAR EXP khi luyện võ và đơn đả', effectEn: '+10% WAR EXP from training and duels'
        },
        {
          code: 'MERCHANT',
          nameVi: 'Thương Lộ', nameEn: 'Merchant Path', seal: '商',
          score: clamp(Number(player.com_attr || 50) * 0.65 + Math.min(40, Number(player.liquid_cash || 0) / 500)),
          effectVi: '+5% lợi nhuận thương đoàn và giảm 5% giá thuê hộ vệ', effectEn: '+5% caravan profit, -5% guard cost'
        },
        {
          code: 'SCHOLAR',
          nameVi: 'Sĩ Lộ', nameEn: 'Scholar Path', seal: '士',
          score: clamp((Number(player.int_attr || 50) + Number(player.pol_attr || 50)) / 2),
          effectVi: '+10% INT/POL EXP khi nghiên cứu và triều đàm', effectEn: '+10% INT/POL EXP from study and court talks'
        },
        {
          code: 'ARTISAN',
          nameVi: 'Công Lộ', nameEn: 'Artisan Path', seal: '工',
          score: clamp(Number(player.cra_attr || 50) * 0.7 + craftTier * 6),
          effectVi: 'Giảm 2% tỷ lệ phế phẩm mỗi bậc nghề', effectEn: '-2% defect chance per profession tier'
        },
        {
          code: 'LINEAGE',
          nameVi: 'Tông Tộc Lộ', nameEn: 'Dynastic Clan Path', seal: '家',
          score: clamp(familyScore),
          effectVi: '+10% uy tín gia tộc và tốc độ trưởng thành của thế tử', effectEn: '+10% clan prestige and heir growth'
        }
      ].sort((a, b) => b.score - a.score);

      sendJson(res, 200, {
        success: true,
        playerId,
        activePath: paths[0].code,
        paths
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
