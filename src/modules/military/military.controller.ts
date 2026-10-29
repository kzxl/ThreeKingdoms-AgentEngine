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
import { recordFinancialTransaction } from '../../shared/financial-transaction';

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
      game_date TEXT NOT NULL
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

      // Active expeditions count
      const activeExpeditions = db.query<any>(`
        SELECT * FROM military_expeditions WHERE status = 'MARCHING' ORDER BY expedition_id DESC;
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

      const result = db.transaction(() => {
        const settlement = db.queryOne<any>('SELECT * FROM session_settlements WHERE settlement_id = ?', [settlementId]);
        if (!settlement) {
          throw new Error(`Settlement ${settlementId} not found.`);
        }

        const player = db.queryOne<any>('SELECT liquid_cash FROM player_state WHERE player_id = "PLY-0001"');
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

      sendJson(res, 200, {
        success: true,
        ...result,
        message: `Đã điều chỉnh đồn trú tại ${result.settlementName}: ${delta > 0 ? '+' : ''}${delta} binh sĩ (Đồn trú: ${result.newTroops}, Phòng ngự: ${result.newDefense}).`
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
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

      const military = getMilitaryModule();
      const hub = supplyHubId || originSettlementId;
      const isSupplied = military ? military.graph.hasUnbrokenSupplyPath(originSettlementId, hub) : true;

      const meta = getCampaignMeta(db);
      const grainRequirement = Math.round((Number(troopCount) * 0.02) * 5 * 10) / 10; // 5 days grain

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
          `INSERT INTO military_expeditions (expedition_id, commander_id, origin_settlement_id, target_settlement_id, troop_count, grain_supply_days, is_supplied, status, created_turn, game_date)
           VALUES (?, ?, ?, ?, ?, 5.0, ?, 'MARCHING', ?, ?);`,
          [expId, commanderId, originSettlementId, targetSettlementId, troopCount, isSupplied ? 1 : 0, meta.activeTurn, meta.currentDate]
        );

        return {
          expeditionId: expId,
          commanderId,
          originSettlementId,
          targetSettlementId,
          troopCount,
          grainCost: grainRequirement,
          isSupplied
        };
      });

      sendJson(res, 200, {
        success: true,
        ...expResult,
        message: `Phát động quân đoàn viễn chinh ${troopCount} binh sĩ từ ${originSettlementId} tới ${targetSettlementId} (Quân lương tiêu hao: ${grainRequirement} Thạch, Tuyến tiếp vận: ${isSupplied ? 'Thông suốt' : 'Bị đứt đoạn'}).`
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.get('/api/expeditions', handleGetExpeditions);
  router.get('/api/military/expeditions', handleGetExpeditions);
  router.post('/api/expeditions', handlePostExpedition);
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
        commanderId = 'PLY-0001'
      } = ctx.body || {};

      // If attacking a bandit stronghold, leverage ecology logistics
      if (strongholdId) {
        const ecology = getEcologyModule();
        if (ecology) {
          const meta = getCampaignMeta(db);
          const result = ecology.attackBanditStronghold(commanderId, strongholdId, meta.activeTurn, meta.currentDate);
          sendJson(res, 200, { success: true, type: 'BANDIT_STRONGHOLD_ASSAULT', ...result });
          return;
        }
      }

      if (!targetSettlementId) {
        sendJson(res, 400, { success: false, error: 'targetSettlementId or strongholdId is required.' });
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
          db.execute('UPDATE session_settlements SET garrison_troops = ?, defense = ?, treasury_cash = treasury_cash - ? WHERE settlement_id = ?', [
            remainingGarrison,
            newDefense,
            lootQian,
            targetSettlementId
          ]);
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

      sendJson(res, 200, { success: true, ...siegeResult });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/assault', handleAssault);
  router.post('/api/military/assault', handleAssault);

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

      const hasSupply = military.graph.hasUnbrokenSupplyPath(fromNode, supplyHub, parseInt(maxHops, 10));
      sendJson(res, 200, { success: true, fromNode, supplyHub, hasSupply });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  });
}
