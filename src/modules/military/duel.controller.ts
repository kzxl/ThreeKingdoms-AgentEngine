/**
 * ThreeKingdoms-AgentEngine: ROTK Single Combat Duel Controller (src/modules/military/duel.controller.ts)
 * Exposes REST APIs for 1v1 tactical single combat duels, friendly martial sparring,
 * martial arena tournament challenges (Diễn Võ Đài), and caravan ambush defense.
 *
 * Adheres strictly to AgentOption Universe Architecture v4.0.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import {
  SingleCombatDuelService,
  TacticalCommand,
  DuelContext,
  ARENA_ROSTER
} from './single-combat-duel.service';
import { SpatialGuardService } from '../progression/spatial-guard.service';

/**
 * Registers all Single Combat Duel routes into the provided Router instance.
 */
export function registerDuelRoutes(router: Router): void {
  const duelService = SingleCombatDuelService.getInstance();
  const guard = SpatialGuardService.getInstance();

  // -------------------------------------------------------------
  // 1. POST /api/duel/initiate & /api/duels/initiate
  // Starts a new 1v1 tactical duel session
  // -------------------------------------------------------------
  const handleInitiateDuel = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const {
        playerId = 'PLY-0001',
        opponentId,
        context = 'FRIENDLY_SPARRING',
        maxRounds = 5,
        playerOverrides,
        opponentOverrides,
        metadata
      } = ctx.body || {};

      if (!opponentId) {
        sendJson(res, 400, {
          success: false,
          error: 'opponentId is required to initiate a 1v1 duel.'
        });
        return;
      }

      const activeDuel = duelService.initiateDuel({
        playerId,
        opponentId,
        context: context as DuelContext,
        maxRounds: Number(maxRounds) || 5,
        playerOverrides,
        opponentOverrides,
        metadata
      });

      sendJson(res, 200, {
        success: true,
        message: `Trận đấu võ 1v1 đã khởi tranh! Đối thủ: ${activeDuel.opponent.nameVi} (${activeDuel.opponent.effectiveWar} WAR).`,
        duel: activeDuel
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/duel/initiate', handleInitiateDuel);
  router.post('/api/duels/initiate', handleInitiateDuel);

  // -------------------------------------------------------------
  // 2. POST /api/duel/round & /api/duels/round
  // Submits a player command for the active round
  // -------------------------------------------------------------
  const handleDuelRound = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const {
        duelId,
        command,
        playerCommand,
        action,
        forcedOpponentCommand
      } = ctx.body || {};

      const targetDuelId = duelId;
      if (!targetDuelId) {
        sendJson(res, 400, { success: false, error: 'duelId is required.' });
        return;
      }

      const rawCommand = (command || playerCommand || action || '').toUpperCase();
      const validCommands: TacticalCommand[] = ['ATTACK', 'DEFEND', 'SPECIAL_STRIKE', 'FOCUS_SPIRIT'];

      if (!validCommands.includes(rawCommand as TacticalCommand)) {
        sendJson(res, 400, {
          success: false,
          error: `Invalid command "${rawCommand}". Allowed commands: ${validCommands.join(', ')}`
        });
        return;
      }

      const clash = duelService.resolveRound(
        targetDuelId,
        rawCommand as TacticalCommand,
        forcedOpponentCommand as TacticalCommand | undefined
      );

      const activeDuel = duelService.getActiveDuel(targetDuelId);

      sendJson(res, 200, {
        success: true,
        round: clash,
        duel: activeDuel,
        isConcluded: clash.isDuelConcluded || false,
        result: activeDuel?.result
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/duel/round', handleDuelRound);
  router.post('/api/duels/round', handleDuelRound);

  // -------------------------------------------------------------
  // 3. GET /api/duel/active & /api/duels/active & /api/duel/status
  // Retrieves status of active duel session(s)
  // -------------------------------------------------------------
  const handleGetActiveDuel = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const duelId = (ctx.query.duelId as string) || (ctx.params.duelId as string);
      if (duelId) {
        const duel = duelService.getActiveDuel(duelId);
        if (!duel) {
          sendJson(res, 404, { success: false, error: `Duel session "${duelId}" not found.` });
          return;
        }
        sendJson(res, 200, { success: true, duel });
      } else {
        const duels = duelService.getAllActiveDuels();
        sendJson(res, 200, { success: true, count: duels.length, duels });
      }
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/duel/active', handleGetActiveDuel);
  router.get('/api/duels/active', handleGetActiveDuel);
  router.get('/api/duel/status', handleGetActiveDuel);
  router.get('/api/duels/status', handleGetActiveDuel);
  router.get('/api/duel/active/:duelId', handleGetActiveDuel);
  router.get('/api/duels/active/:duelId', handleGetActiveDuel);

  // -------------------------------------------------------------
  // 4. POST /api/duel/spar & /api/duels/spar
  // Friendly martial sparring with Zhang Fei / Guan Yu
  // -------------------------------------------------------------
  const handleSparWithHero = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const {
        playerId = 'PLY-0001',
        heroNpcId,
        npcId,
        autoResolve = true,
        playerCommands,
        bypassSpatialGuard
      } = ctx.body || {};

      // Spatial Presence Guard
      guard.assertPresence(
        playerId,
        ['Lôi Đài', 'Giáo Trường', 'Võ Đài', 'Arena', 'Drill'],
        'Tỉ Võ Giao Lưu',
        bypassSpatialGuard
      );

      const targetHero = heroNpcId || npcId || 'NPC-0002'; // Default Zhang Fei

      const result = duelService.sparWithHero(
        playerId,
        targetHero,
        autoResolve !== false,
        playerCommands
      );

      sendJson(res, 200, {
        success: true,
        message: result.summaryNarrativeVi,
        result
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/duel/spar', handleSparWithHero);
  router.post('/api/duels/spar', handleSparWithHero);

  // -------------------------------------------------------------
  // 5. GET /api/duel/arena/roster & /api/duels/arena/roster
  // Returns tournament arena challenger roster
  // -------------------------------------------------------------
  const handleGetArenaRoster = async (_req: any, res: any, _ctx: RouteContext) => {
    try {
      const roster = duelService.getArenaRoster();
      sendJson(res, 200, {
        success: true,
        count: roster.length,
        roster
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/duel/arena/roster', handleGetArenaRoster);
  router.get('/api/duels/arena/roster', handleGetArenaRoster);

  // -------------------------------------------------------------
  // 6. POST /api/duel/arena/challenge & /api/duels/arena/challenge
  // Challenges an Arena Tournament tier (1: Local, 2: Frontier, 3: Lu Bu)
  // -------------------------------------------------------------
  const handleArenaChallenge = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const {
        playerId = 'PLY-0001',
        tier = 1,
        autoResolve = true,
        playerCommands,
        bypassSpatialGuard
      } = ctx.body || {};

      // Spatial Presence Guard
      guard.assertPresence(
        playerId,
        ['Lôi Đài', 'Giáo Trường', 'Võ Đài', 'Arena'],
        'Khiêu Chiến Lôi Đài',
        bypassSpatialGuard
      );

      const result = duelService.challengeArena(
        playerId,
        tier,
        autoResolve !== false,
        playerCommands
      );

      sendJson(res, 200, {
        success: true,
        message: result.summaryNarrativeVi,
        result
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/duel/arena/challenge', handleArenaChallenge);
  router.post('/api/duels/arena/challenge', handleArenaChallenge);

  // -------------------------------------------------------------
  // 7. POST /api/duel/caravan-ambush & /api/duels/caravan-ambush
  // Challenges bandit chieftain when caravan is ambushed
  // -------------------------------------------------------------
  const handleCaravanAmbushDefense = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const {
        playerId = 'PLY-0001',
        caravanId,
        strongholdId = 'STR-0001',
        autoResolve = true,
        playerCommands
      } = ctx.body || {};

      if (!caravanId) {
        sendJson(res, 400, { success: false, error: 'caravanId is required.' });
        return;
      }

      const result = duelService.defendCaravanAmbush(
        playerId,
        caravanId,
        strongholdId,
        autoResolve !== false,
        playerCommands
      );

      sendJson(res, 200, {
        success: true,
        message: result.summaryNarrativeVi,
        result
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/duel/caravan-ambush', handleCaravanAmbushDefense);
  router.post('/api/duels/caravan-ambush', handleCaravanAmbushDefense);
}
