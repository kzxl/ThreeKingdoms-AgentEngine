/**
 * ThreeKingdoms-AgentEngine: Strategic Military Controller (src/modules/military/military.controller.ts)
 * Exposes REST APIs for military posture, garrison deployments, tactical expeditions,
 * battlefield assaults, and graph-based logistical reachability verification.
 *
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { nextId } from '../../shared/id-generator';
import { getGameDate } from '../../shared/game-clock';
import { ModuleRegistry } from '../../core/module-registry';
import { MilitaryModule } from './military.module';
import { EcologyLogisticsModule } from '../ecology-logistics/ecology-logistics.module';
import { NODE_TO_LOC_MAP } from '../ecology-logistics/spatial-registry';
import { SiegeService } from './siege.service';
import { SpatialGuardService } from '../progression/spatial-guard.service';
import { recordFinancialTransaction } from '../../shared/financial-transaction';
import { chargePlayerAction } from '../../shared/action-time';
import { requestIdempotencyKey, findIdempotentResult, recordAction } from '../../shared/action-journal';
import { postSettlementEntry } from '../../shared/settlement-ledger';

function getMilitaryModule(): MilitaryModule | undefined {
  return ModuleRegistry.getInstance().get<MilitaryModule>('module.military');
}

function getEcologyModule(): EcologyLogisticsModule | undefined {
  return ModuleRegistry.getInstance().get<EcologyLogisticsModule>('module.ecology-logistics');
}

function getDb(): DatabaseService {
  return DatabaseService.getInstance();
}

function ensureMilitaryTables(db: DatabaseService): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS military_expeditions (
      expedition_id TEXT PRIMARY KEY,
      commander_id TEXT NOT NULL,
      origin_settlement_id TEXT NOT NULL,
      target_settlement_id TEXT NOT NULL,
      troop_count INTEGER NOT NULL,
      grain_supply_days REAL NOT NULL,
      is_supplied INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'MARCHING',
      created_turn INTEGER NOT NULL,
      game_date TEXT NOT NULL,
      route_id TEXT,
      march_days INTEGER NOT NULL DEFAULT 5,
      days_remaining INTEGER NOT NULL DEFAULT 0,
      arrival_date TEXT
    );
    CREATE TABLE IF NOT EXISTS session_sieges (
      siege_id TEXT PRIMARY KEY,
      settlement_id TEXT NOT NULL,
      commander_id TEXT NOT NULL,
      attacker_troops INTEGER NOT NULL,
      daily_damage INTEGER NOT NULL,
      started_date TEXT NOT NULL,
      days_elapsed INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      last_loot INTEGER NOT NULL DEFAULT 0,
      expedition_id TEXT,
      prebattle_json TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function getCampaignMeta(db: DatabaseService): { activeTurn: number; currentDate: string } {
  try {
    const row = db.queryOne<{ active_turn: number; current_date: string }>(
      'SELECT active_turn, "current_date" FROM campaign_meta LIMIT 1;'
    );
    if (row) return { activeTurn: row.active_turn, currentDate: row.current_date };
  } catch {
    // fallback
  }
  return { activeTurn: 6, currentDate: '184-05-01' };
}

/**
 * Registers all Military module routes into the provided Router instance.
 */
export function registerMilitaryRoutes(router: Router): void {
  const db = getDb();
  ensureMilitaryTables(db);

  // -------------------------------------------------------------
  // 1. GET /api/military & /api/military/status
  // -------------------------------------------------------------
  const handleGetMilitary = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const factionId = ctx.query.factionId as string | undefined;

      // Faction military summary
      let factionSql = `
        SELECT 
          f.faction_id as factionId,
          f.name_vi as nameVi,
          f.name_en as nameEn,
          f.military_power as militaryPower,
          f.treasury_cash as treasuryCash,
          f.granary_grain as granaryGrain,
          COALESCE(SUM(s.garrison_troops), 0) as totalGarrisonTroops,
          COUNT(s.settlement_id) as settlementCount
        FROM session_factions f
        LEFT JOIN session_settlements s ON f.faction_id = s.ruler_faction_id
      `;
      const params: any[] = [];
      if (factionId) {
        factionSql += ` WHERE f.faction_id = ?`;
        params.push(factionId);
      }
      factionSql += ` GROUP BY f.faction_id ORDER BY f.military_power DESC;`;

      const factions = db.query<any>(factionSql, params);

      // Player personal military readiness
      const player = db.queryOne<any>(`
        SELECT 
          player_id as playerId,
          name,
          current_location as currentLocation,
          war_attr as warAttr,
          ldr_attr as ldrAttr,
          morale,
          health,
          fatigue,
          strategic_grain as strategicGrain
        FROM player_state 
        WHERE player_id = 'PLY-0001';
      `);

      // Active expeditions (marching or waiting at the gates)
      const activeExpeditions = db.query<any>(`
        SELECT * FROM military_expeditions
        WHERE status IN ('MARCHING', 'ARRIVED')
        ORDER BY expedition_id DESC;
      `);

      sendJson(res, 200, {
        success: true,
        commander: player,
        factions,
        activeExpeditionsCount: activeExpeditions.length,
        activeExpeditions
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/military', handleGetMilitary);
  router.get('/api/military/status', handleGetMilitary);

  // -------------------------------------------------------------
  // 2. GET /api/garrisons & /api/garrisons/:settlementId
  // -------------------------------------------------------------
  const handleGetGarrisons = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const settlementId = ctx.params.settlementId || (ctx.query.settlementId as string);
      const province = ctx.query.province as string;

      let sql = `
        SELECT 
          s.settlement_id as settlementId,
          s.name_vi as nameVi,
          s.name_en as nameEn,
          s.province_vi as provinceVi,
          s.ruler_faction_id as rulerFactionId,
          sf.name_vi as rulerFactionName,
          s.governor_id as governorId,
          s.garrison_troops as garrisonTroops,
          s.defense,
          s.public_order as publicOrder,
          s.granary_grain as granaryGrain,
          s.treasury_cash as treasuryCash
        FROM session_settlements s
        LEFT JOIN session_factions sf ON s.ruler_faction_id = sf.faction_id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (settlementId) {
        sql += ` AND s.settlement_id = ?`;
        params.push(settlementId);
      }
      if (province) {
        sql += ` AND s.province_vi LIKE ?`;
        params.push(`%${province}%`);
      }
      sql += ` ORDER BY s.garrison_troops DESC;`;

      const garrisons = db.query<any>(sql, params);

      if (settlementId && garrisons.length > 0) {
        sendJson(res, 200, { success: true, garrison: garrisons[0] });
      } else {
        sendJson(res, 200, { success: true, count: garrisons.length, garrisons });
      }
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/garrisons', handleGetGarrisons);
  router.get('/api/military/garrisons', handleGetGarrisons);
  router.get('/api/garrisons/:settlementId', handleGetGarrisons);
  router.get('/api/military/garrisons/:settlementId', handleGetGarrisons);

  // -------------------------------------------------------------
  // 2b. GET /api/military/routes & /api/routes
  // -------------------------------------------------------------
  const handleGetRoutes = async (_req: any, res: any, _ctx: RouteContext) => {
    try {
      const routes = db.query<any>(`
        SELECT 
          route_id as routeId,
          source_location_id as sourceLocationId,
          target_location_id as targetLocationId,
          distance_li as distanceLi,
          terrain_type as terrainType,
          standard_march_days as standardMarchDays,
          grain_provision_cost as grainProvisionCost,
          ambush_risk_level as ambushRiskLevel,
          description_vi as descriptionVi,
          description_en as descriptionEn
        FROM master_routes
        ORDER BY route_id ASC;
      `);
      sendJson(res, 200, { success: true, count: routes.length, routes });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/military/routes', handleGetRoutes);
  router.get('/api/routes', handleGetRoutes);

  // Canonical LOC ids used by master_routes → names/coords for the map bridge.
  router.get('/api/locations', async (_req: any, res: any, _ctx: RouteContext) => {
    try {
      const rows = db.query<any>(`
        SELECT
          location_id as locationId,
          name_vi as nameVi,
          name_en as nameEn,
          coord_x as coordX,
          coord_y as coordY,
          location_type as locationType,
          sub_locations as subLocationsJson
        FROM master_locations
        ORDER BY location_id ASC;
      `);
      sendJson(res, 200, { success: true, count: rows.length, locations: rows });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // 3. POST /api/garrisons & /api/garrisons/reinforce
  // -------------------------------------------------------------
  const handleReinforceGarrison = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const { settlementId, troopsDelta, costPerTroop = 8 } = ctx.body || {};

      if (!settlementId) {
        sendJson(res, 400, { success: false, error: 'settlementId is required.' });
        return;
      }

      const delta = parseInt(troopsDelta, 10);
      if (isNaN(delta) || delta === 0) {
        sendJson(res, 400, { success: false, error: 'Non-zero integer troopsDelta is required.' });
        return;
      }

      const totalCost = delta > 0 ? Math.round(delta * Number(costPerTroop)) : 0;

      const playerFaction = db.queryOne<{ faction_id: string }>(
        `SELECT faction_id FROM session_factions WHERE leader_id = 'PLY-0001' AND is_active = 1 LIMIT 1;`
      );
      const settlementOwner = db.queryOne<{ ruler_faction_id: string }>(
        'SELECT ruler_faction_id FROM session_settlements WHERE settlement_id = ?;', [settlementId]
      );
      if (playerFaction && settlementOwner && settlementOwner.ruler_faction_id !== playerFaction.faction_id) {
        sendJson(res, 403, {
          success: false,
          error: `Chỉ có thể điều động đồn trú tại thành của phe mình (${playerFaction.faction_id}).`
        });
        return;
      }

      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }

      const time = chargePlayerAction(
        db.path,
        'MILITARY_MUSTER',
        null,
        `Reinforce garrison ${settlementId} by ${delta}`
      );

      const result = db.transaction(() => {
        const settlement = db.queryOne<any>('SELECT * FROM session_settlements WHERE settlement_id = ?', [settlementId]);
        if (!settlement) {
          throw new Error(`Settlement ${settlementId} not found.`);
        }

        const player = db.queryOne<any>(
          'SELECT liquid_cash FROM player_state WHERE player_id = ?;',
          ['PLY-0001']
        );
        if (delta > 0 && player.liquid_cash < totalCost) {
          throw new Error(`Insufficient funds: requires ${totalCost} quan, available ${player.liquid_cash} quan.`);
        }

        const newTroops = Math.max(0, settlement.garrison_troops + delta);
        // Defense rating dynamically boosted or depleted by troop changes
        const defenseDelta = Math.round(delta / 25);
        const newDefense = Math.min(100, Math.max(10, settlement.defense + defenseDelta));

        if (delta > 0) {
          recordFinancialTransaction(db, {
            category: 'MILITARY_REINFORCE',
            counterparty: settlement.name_vi,
            memo: `Điều phối tăng cường ${delta} binh sĩ đồn trú tại ${settlement.name_vi}`,
            outflow: totalCost,
            debitAccount: '6001_OPERATING_EXPENSE',
            creditAccount: '1001_CASH_MOBILE'
          });
        }

        db.execute(
          'UPDATE session_settlements SET garrison_troops = ?, defense = ? WHERE settlement_id = ?',
          [newTroops, newDefense, settlementId]
        );

        return {
          settlementId,
          settlementName: settlement.name_vi,
          troopsDelta: delta,
          newTroops,
          newDefense,
          costPaid: totalCost
        };
      });

      const response = { ...result, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'GARRISON_REINFORCE',
        payload: { settlementId, troopsDelta: delta },
        result: response
      });
      sendJson(res, 200, {
        success: true,
        ...response,
        idempotent: false,
        message: `Đã điều chỉnh đồn trú tại ${result.settlementName}: ${result.troopsDelta > 0 ? '+' : ''}${result.troopsDelta} binh sĩ (Đồn trú: ${result.newTroops}, Phòng ngự: ${result.newDefense}).`
      });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message });
    }
  };

  router.post('/api/garrisons', handleReinforceGarrison);
  router.post('/api/garrisons/reinforce', handleReinforceGarrison);
  router.post('/api/military/garrisons/reinforce', handleReinforceGarrison);

  // -------------------------------------------------------------
  // 4. GET & POST /api/expeditions & /api/military/expeditions
  // -------------------------------------------------------------
  const handleGetExpeditions = async (_req: any, res: any, _ctx: RouteContext) => {
    try {
      const expeditions = db.query<any>('SELECT * FROM military_expeditions ORDER BY expedition_id DESC LIMIT 50;');
      sendJson(res, 200, { success: true, count: expeditions.length, expeditions });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  const handlePostExpedition = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const {
        commanderId = 'PLY-0001',
        originSettlementId,
        targetSettlementId,
        troopCount = 200,
        supplyHubId
      } = ctx.body || {};

      if (!originSettlementId || !targetSettlementId) {
        sendJson(res, 400, { success: false, error: 'originSettlementId and targetSettlementId are required.' });
        return;
      }

      SpatialGuardService.getInstance().assertStage(
        commanderId,
        3,
        'Viễn Chinh Liên Châu',
        (ctx.body || {}).bypassProgressionGate || (ctx.body || {}).bypassSpatialGuard
      );

      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }

      const time = chargePlayerAction(
        db.path,
        'EXPEDITION_START',
        null,
        `Expedition ${originSettlementId} -> ${targetSettlementId}`
      );

      const military = getMilitaryModule();
      const playerFaction = db.queryOne<{ capital_settlement_id: string }>(
        `SELECT capital_settlement_id FROM session_factions WHERE leader_id = 'PLY-0001' AND is_active = 1 LIMIT 1;`
      );
      const hub = supplyHubId || playerFaction?.capital_settlement_id || originSettlementId;
      const isSupplied = military ? military.hasUnbrokenSupplyPath(originSettlementId, hub) : true;

      const meta = getCampaignMeta(db);
      const originLoc = NODE_TO_LOC_MAP[originSettlementId] || originSettlementId;
      const targetLoc = NODE_TO_LOC_MAP[targetSettlementId] || targetSettlementId;
      const route = db.queryOne<any>(
        `SELECT route_id, standard_march_days
         FROM master_routes
         WHERE (source_location_id = ? AND target_location_id = ?)
            OR (source_location_id = ? AND target_location_id = ?)
         LIMIT 1;`,
        [originLoc, targetLoc, targetLoc, originLoc]
      );
      const marchDays = Math.max(1, Math.round(Number(route?.standard_march_days) || 5));
      const arrivalDate = (() => {
        const { addDaysToDate } = require('../../../engine/date-utils');
        return addDaysToDate(meta.currentDate, marchDays);
      })();
      const grainRequirement = Math.round((Number(troopCount) * 0.02) * marchDays * 10) / 10;

      const expResult = db.transaction(() => {
        const player = db.queryOne<any>('SELECT strategic_grain, fatigue FROM player_state WHERE player_id = ?', [commanderId]);
        if (!player) throw new Error(`Commander ${commanderId} not found.`);

        if (player.strategic_grain < grainRequirement) {
          throw new Error(`Insufficient strategic grain: requires ${grainRequirement} piculs, available ${player.strategic_grain} piculs.`);
        }

        const expId = nextId(db, 'expedition', 'EXP', getGameDate(db));
        db.execute('UPDATE player_state SET strategic_grain = strategic_grain - ?, fatigue = MIN(100, fatigue + 15) WHERE player_id = ?', [
          grainRequirement,
          commanderId
        ]);

        db.execute(
          `INSERT INTO military_expeditions (
             expedition_id, commander_id, origin_settlement_id, target_settlement_id,
             troop_count, grain_supply_days, is_supplied, status, created_turn, game_date,
             route_id, march_days, days_remaining, arrival_date
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 'MARCHING', ?, ?, ?, ?, ?, ?);`,
          [
            expId, commanderId, originSettlementId, targetSettlementId,
            troopCount, marchDays, isSupplied ? 1 : 0, meta.activeTurn, meta.currentDate,
            route?.route_id || null, marchDays, marchDays, arrivalDate
          ]
        );

        return {
          expeditionId: expId,
          commanderId,
          originSettlementId,
          targetSettlementId,
          troopCount,
          marchDays,
          daysRemaining: marchDays,
          arrivalDate,
          grainCost: grainRequirement,
          isSupplied
        };
      });

      const response = { ...expResult, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'EXPEDITION_START',
        payload: { originSettlementId, targetSettlementId, troopCount },
        result: response
      });
      sendJson(res, 200, {
        success: true,
        ...response,
        idempotent: false,
        message: `Phát động quân đoàn viễn chinh ${troopCount} binh sĩ từ ${originSettlementId} tới ${targetSettlementId} (${marchDays} ngày đường, dự kiến tới ${arrivalDate}; Quân lương tiêu hao: ${grainRequirement} Thạch, Tuyến tiếp vận: ${isSupplied ? 'Thông suốt' : 'Bị đứt đoạn'}).`
      });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message });
    }
  };

  router.get('/api/expeditions', handleGetExpeditions);
  router.get('/api/military/expeditions', handleGetExpeditions);
  router.post('/api/expeditions', handlePostExpedition);

  // Withdraw or disband an expedition that has arrived (or is still marching).
  const handleConcludeExpedition = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const { expeditionId, commanderId = 'PLY-0001' } = ctx.body || {};
      if (!expeditionId) {
        sendJson(res, 400, { success: false, error: 'expeditionId is required.' });
        return;
      }
      const current = db.queryOne<any>(
        'SELECT status FROM military_expeditions WHERE expedition_id = ? AND commander_id = ?;',
        [expeditionId, commanderId]
      );
      if (current?.status === 'BESIEGING') {
        sendJson(res, 400, {
          success: false,
          error: 'Không thể thu quân khi đang bao vây; hãy hạ thành hoặc để bao vây kết thúc.'
        });
        return;
      }
      const result = db.execute(
        `UPDATE military_expeditions
         SET status = 'CONCLUDED'
         WHERE expedition_id = ? AND commander_id = ? AND status IN ('MARCHING', 'ARRIVED');`,
        [expeditionId, commanderId]
      );
      const changed = Number((result as any)?.changes || 0);
      if (!changed) {
        sendJson(res, 404, { success: false, error: 'No active expedition found for this commander.' });
        return;
      }
      sendJson(res, 200, {
        success: true,
        expeditionId,
        status: 'CONCLUDED',
        message: `Đã thu quân viễn chinh ${expeditionId}.`
      });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message });
    }
  };

  router.post('/api/expeditions/conclude', handleConcludeExpedition);
  router.post('/api/military/expeditions/conclude', handleConcludeExpedition);
  router.post('/api/military/expeditions', handlePostExpedition);

  // -------------------------------------------------------------
  // 5. POST /api/assault & /api/military/assault
  // -------------------------------------------------------------
  const handleAssault = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const {
        targetSettlementId,
        strongholdId,
        attackerTroops = 250,
        commanderId = 'PLY-0001',
        mode = 'INSTANT',
        expeditionId
      } = ctx.body || {};

      if (!strongholdId && !targetSettlementId) {
        sendJson(res, 400, { success: false, error: 'targetSettlementId or strongholdId is required.' });
        return;
      }

      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }

      const time = chargePlayerAction(
        db.path,
        'SIEGE_PREP',
        null,
        `Assault ${targetSettlementId || strongholdId}`
      );

      // If attacking a bandit stronghold, leverage ecology logistics
      if (strongholdId) {
        const ecology = getEcologyModule();
        if (ecology) {
          const meta = getCampaignMeta(db);
          const result = ecology.attackBanditStronghold(commanderId, strongholdId, meta.activeTurn, meta.currentDate);
          const response = { type: 'BANDIT_STRONGHOLD_ASSAULT', ...result, time };
          recordAction(db, {
            key: idempotencyKey,
            actionType: 'BANDIT_STRONGHOLD_ASSAULT',
            payload: { commanderId, strongholdId },
            result: response
          });
          sendJson(res, 200, { success: true, ...response, idempotent: false });
          return;
        }
      }

      if (!targetSettlementId) {
        sendJson(res, 400, { success: false, error: 'targetSettlementId or strongholdId is required.' });
        return;
      }

      SpatialGuardService.getInstance().assertStage(
        commanderId,
        3,
        'Điều Binh Công Thành',
        (ctx.body || {}).bypassProgressionGate || (ctx.body || {}).bypassSpatialGuard
      );

      // Multi-day siege: persist the investment and let the day clock grind the
      // walls down. The instant resolution below stays available for old
      // callers that explicitly pass mode: 'INSTANT'.
      if (String(mode).toUpperCase() === 'SIEGE') {
        const meta = getCampaignMeta(db);
        const siege = SiegeService.forDatabase(db).startSiege({
          settlementId: targetSettlementId,
          commanderId,
          attackerTroops,
          gameDate: meta.currentDate,
          expeditionId
        });
        const response = {
          siege,
          time,
          message: siege.aborted
            ? 'Tiền trận bất lợi: chủ tướng tử trận, bao vây bị hủy.'
            : siege.status === 'ACTIVE'
              ? `Đã bao vây ${targetSettlementId}: ${siege.attackerTroops} quân, mỗi ngày giảm phòng thủ. Hạ thành khi tường vỡ hoặc đồn trú tan rã.`
              : `Công thành ${targetSettlementId} đã kết thúc.`
        };
        recordAction(db, {
          key: idempotencyKey,
          actionType: 'SIEGE_START',
          payload: { targetSettlementId, attackerTroops, commanderId, expeditionId },
          result: response
        });
        sendJson(res, 200, { success: true, ...response, idempotent: false });
        return;
      }

      // City / Citadel siege assault resolution
      const siegeResult = db.transaction(() => {
        const target = db.queryOne<any>('SELECT * FROM session_settlements WHERE settlement_id = ?', [targetSettlementId]);
        if (!target) throw new Error(`Target settlement ${targetSettlementId} not found.`);

        const commander = db.queryOne<any>('SELECT war_attr, ldr_attr, fatigue, health FROM player_state WHERE player_id = ?', [commanderId]);
        if (commander && commander.fatigue > 85) {
          throw new Error('Khí lực tướng soái kiệt quệ, không thể đốc thúc ba quân công thành!');
        }

        const commanderWar = commander?.war_attr || 60;
        const commanderLdr = commander?.ldr_attr || 60;

        const attackerRoll = RngService.forDomain(db, 'military').d20();
        const defenderRoll = RngService.forDomain(db, 'military').d20();

        const attackerPower = attackerTroops * (commanderWar / 50) + attackerRoll * 10;
        const defenderPower = target.garrison_troops * (target.defense / 50) + defenderRoll * 10;

        const isVictory = attackerPower >= defenderPower;

        const attackerLossRatio = isVictory ? 0.15 : 0.40;
        const defenderLossRatio = isVictory ? 0.60 : 0.25;

        const attackerCasualties = Math.round(attackerTroops * attackerLossRatio);
        const defenderCasualties = Math.round(target.garrison_troops * defenderLossRatio);

        const remainingGarrison = Math.max(0, target.garrison_troops - defenderCasualties);
        const defenseDamage = isVictory ? 25 : 10;
        const newDefense = Math.max(10, target.defense - defenseDamage);

        let lootQian = 0;
        if (isVictory) {
          lootQian = Math.round(target.treasury_cash * 0.3);
          db.execute('UPDATE session_settlements SET garrison_troops = ?, defense = ? WHERE settlement_id = ?', [
            remainingGarrison,
            newDefense,
            targetSettlementId
          ]);
          if (lootQian > 0) {
            postSettlementEntry(db, {
              settlementId: targetSettlementId,
              category: 'WAR_LOOT',
              counterparty: 'Chiến lợi phẩm',
              outflow: lootQian,
              memo: `Cướp phá thành trì ${targetSettlementId}`
            });
          }
          if (lootQian > 0) {
            recordFinancialTransaction(db, {
              category: 'WAR_LOOT',
              counterparty: target.name_vi,
              memo: `Công phá đại thắng ${target.name_vi}, thu giữ ${lootQian} quan chiến phí`,
              inflow: lootQian,
              debitAccount: '1001_CASH_MOBILE',
              creditAccount: '4001_SALES_REVENUE'
            });
          }
          db.execute('UPDATE player_state SET fatigue = MIN(100, fatigue + 35) WHERE player_id = ?', [
            commanderId
          ]);
        } else {
          db.execute('UPDATE session_settlements SET garrison_troops = ?, defense = ? WHERE settlement_id = ?', [
            remainingGarrison,
            newDefense,
            targetSettlementId
          ]);
          db.execute('UPDATE player_state SET health = MAX(20, health - 15), fatigue = MIN(100, fatigue + 40) WHERE player_id = ?', [
            commanderId
          ]);
        }

        return {
          targetSettlementId,
          settlementName: target.name_vi,
          victory: isVictory,
          outcome: isVictory ? 'VICTORY' : 'DEFEAT',
          attackerPower: Math.round(attackerPower),
          defenderPower: Math.round(defenderPower),
          attackerCasualties,
          defenderCasualties,
          remainingGarrison,
          newDefense,
          lootQian,
          reportVi: isVictory
            ? `Công phá đại thắng ${target.name_vi}! Tiêu diệt ${defenderCasualties} quân phòng thủ, tước đoạt ${lootQian} quan chiến phí.`
            : `Công thành thất bại tại ${target.name_vi}! Tường cao lũy dày phòng ngự kiên cố, quân ta chịu tổn thất ${attackerCasualties} binh mã phải lui quân.`
        };
      });

      const response = { ...siegeResult, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'SIEGE_ASSAULT',
        payload: { targetSettlementId, attackerTroops, commanderId },
        result: response
      });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message });
    }
  };

  router.post('/api/assault', handleAssault);
  router.post('/api/military/assault', handleAssault);

  // Active sieges for the map/status surfaces.
  router.get('/api/sieges', async (_req: any, res: any, _ctx: RouteContext) => {
    try {
      const sieges = SiegeService.forDatabase(db).listActive();
      sendJson(res, 200, { success: true, count: sieges.length, sieges });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // 6. POST /api/strategy/supply-check
  // -------------------------------------------------------------
  router.post('/api/strategy/supply-check', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const { fromNode = 'LOC-0001', supplyHub = 'LOC-0002', maxHops = 10 } = ctx.body || {};
      const military = getMilitaryModule();
      if (!military) {
        sendJson(res, 500, { success: false, error: 'MilitaryModule not loaded' });
        return;
      }

      const hasSupply = military.hasUnbrokenSupplyPath(fromNode, supplyHub, parseInt(maxHops, 10));
      sendJson(res, 200, { success: true, fromNode, supplyHub, hasSupply });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message });
    }
  });
}
