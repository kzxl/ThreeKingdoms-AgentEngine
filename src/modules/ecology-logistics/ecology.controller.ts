/**
 * ThreeKingdoms-AgentEngine: Ecology & Logistics Controller (src/modules/ecology-logistics/ecology.controller.ts)
 * Exposes REST APIs for ecological crises, peasant famine relief, macro caravan transport,
 * bandit strongholds, and turn simulation ticks.
 *
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import { DatabaseService } from '../../core/database';
import { ModuleRegistry } from '../../core/module-registry';
import { EcologyLogisticsModule } from './ecology-logistics.module';
import { EconomyModule } from '../economy/economy.module';

function getEcologyModule(): EcologyLogisticsModule | undefined {
  const gsm = (globalThis as any).__GRAND_STRATEGY_MODULES__;
  if (gsm?.ecologyLogistics) return gsm.ecologyLogistics as EcologyLogisticsModule;
  return ModuleRegistry.getInstance().get<EcologyLogisticsModule>('module.ecology-logistics');
}

function getEconomyModule(): EconomyModule | undefined {
  const gsm = (globalThis as any).__GRAND_STRATEGY_MODULES__;
  if (gsm?.economy) return gsm.economy as EconomyModule;
  return ModuleRegistry.getInstance().get<EconomyModule>('module.economy');
}

function getDb(): DatabaseService {
  return DatabaseService.getInstance();
}

function getCampaignMeta(db: DatabaseService): { activeTurn: number; currentDate: string } {
  try {
    const row = db.queryOne<{ active_turn: number; current_date: string }>(
      'SELECT active_turn, current_date FROM campaign_meta LIMIT 1;'
    );
    if (row) return { activeTurn: row.active_turn, currentDate: row.current_date };
  } catch {
    // fallback
  }
  return { activeTurn: 6, currentDate: '184-05-01' };
}

/**
 * Registers all Ecology & Logistics module routes into the provided Router instance.
 */
export function registerEcologyRoutes(router: Router): void {
  const db = getDb();

  // -------------------------------------------------------------
  // 1. GET /api/ecology/crises
  // -------------------------------------------------------------
  const handleGetCrises = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const activeOnly = ctx.query.activeOnly !== 'false';
      const ecology = getEcologyModule();

      const crises = ecology
        ? ecology.getCrises(activeOnly)
        : db.query<any>(
            `SELECT 
              crisis_id as crisisId,
              settlement_id as settlementId,
              crisis_type as crisisType,
              severity_level as severityLevel,
              duration_turns_left as durationTurnsLeft,
              agriculture_penalty as agriculturePenalty,
              public_order_penalty as publicOrderPenalty,
              grain_price_multiplier as grainPriceMultiplier,
              is_active as isActive,
              title_vi as titleVi,
              narrative_vi as narrativeVi
            FROM regional_ecological_crises 
            ${activeOnly ? 'WHERE is_active = 1' : ''} 
            ORDER BY severity_level DESC;`
          );

      sendJson(res, 200, { success: true, count: crises.length, crises });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/ecology/crises', handleGetCrises);

  // -------------------------------------------------------------
  // 2. POST /api/ecology/relief
  // -------------------------------------------------------------
  const handleDispatchRelief = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const { settlementId, grainAmount = 5.0 } = ctx.body || {};

      if (!settlementId) {
        sendJson(res, 400, { success: false, error: 'settlementId is required.' });
        return;
      }

      const ecology = getEcologyModule();
      if (!ecology) {
        sendJson(res, 500, { success: false, error: 'EcologyLogisticsModule not initialized.' });
        return;
      }

      const meta = getCampaignMeta(db);
      const result = ecology.dispatchGrainRelief(settlementId, parseFloat(grainAmount), meta.activeTurn, meta.currentDate);

      sendJson(res, 200, { success: true, result });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/ecology/relief', handleDispatchRelief);

  // -------------------------------------------------------------
  // 3. GET & POST /api/ecology/transport
  // -------------------------------------------------------------
  const handleGetTransport = async (_req: any, res: any, _ctx: RouteContext) => {
    try {
      const ecology = getEcologyModule();
      const caravans = ecology ? ecology.getCaravans() : db.query<any>('SELECT * FROM trade_caravans;');
      const strongholds = ecology ? ecology.getBanditStrongholds() : db.query<any>('SELECT * FROM bandit_strongholds;');

      sendJson(res, 200, {
        success: true,
        caravanCount: caravans.length,
        strongholdCount: strongholds.length,
        caravans,
        strongholds
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  const handlePostTransport = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const {
        fromSettlementId,
        toSettlementId,
        cargoItemCode,
        cargoQuantity,
        guardTroops = 30,
        caravanName,
        ownerFactionId = 'FAC-LIANG-CLAN'
      } = ctx.body || {};

      if (!fromSettlementId || !toSettlementId || !cargoItemCode || !cargoQuantity) {
        sendJson(res, 400, {
          success: false,
          error: 'fromSettlementId, toSettlementId, cargoItemCode, and cargoQuantity are required.'
        });
        return;
      }

      const qty = parseFloat(cargoQuantity);
      if (isNaN(qty) || qty <= 0) {
        sendJson(res, 400, { success: false, error: 'cargoQuantity must be a positive number.' });
        return;
      }

      const item = db.queryOne<any>('SELECT item_code, name_vi, baseline_peace_price FROM master_items WHERE item_code = ?', [cargoItemCode]);
      if (!item) {
        sendJson(res, 404, { success: false, error: `Cargo commodity ${cargoItemCode} not found.` });
        return;
      }

      const cargoValue = Math.round(qty * item.baseline_peace_price);
      const generatedCaravanId = `CARAVAN-${Date.now().toString().slice(-6)}`;
      const name = caravanName || `Trù Vận Đội (${fromSettlementId} -> ${toSettlementId})`;
      const meta = getCampaignMeta(db);

      // Distance decay calculation if EconomyModule available
      const economy = getEconomyModule();
      const estimatedDecay = economy ? economy.calculateDistanceDecay(cargoValue, 250) : { deliveredCash: cargoValue, lostInTransit: 0 };

      db.execute(
        `INSERT INTO trade_caravans (
          caravan_id, caravan_name, owner_faction_id, from_settlement_id, to_settlement_id,
          cargo_item_code, cargo_quantity, cargo_value_qian, guard_troops, route_progress,
          status, created_turn
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 'EN_ROUTE', ?);`,
        [
          generatedCaravanId,
          name,
          ownerFactionId,
          fromSettlementId,
          toSettlementId,
          cargoItemCode,
          qty,
          cargoValue,
          parseInt(guardTroops, 10) || 30,
          meta.activeTurn
        ]
      );

      sendJson(res, 200, {
        success: true,
        caravanId: generatedCaravanId,
        caravanName: name,
        cargoItemCode,
        cargoItemName: item.name_vi,
        cargoQuantity: qty,
        cargoValueQian: cargoValue,
        estimatedDeliveredValue: estimatedDecay.deliveredCash,
        estimatedLossRate: `${Math.round((estimatedDecay.lostInTransit / cargoValue) * 100)}%`,
        message: `Đã xuất phát ${name} vận tải ${qty} ${item.name_vi} (Tổng giá trị ${cargoValue} Qian).`
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.get('/api/ecology/transport', handleGetTransport);
  router.get('/api/logistics/caravans', handleGetTransport);
  router.post('/api/ecology/transport', handlePostTransport);

  // -------------------------------------------------------------
  // 4. GET /api/logistics/strongholds
  // -------------------------------------------------------------
  router.get('/api/logistics/strongholds', async (_req: any, res: any, _ctx: RouteContext) => {
    try {
      const ecology = getEcologyModule();
      const strongholds = ecology ? ecology.getBanditStrongholds() : db.query<any>('SELECT * FROM bandit_strongholds;');
      sendJson(res, 200, { success: true, count: strongholds.length, strongholds });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // 5. POST /api/logistics/attack-stronghold
  // -------------------------------------------------------------
  router.post('/api/logistics/attack-stronghold', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const { strongholdId, characterId = 'PLY-0001' } = ctx.body || {};
      if (!strongholdId) {
        sendJson(res, 400, { success: false, error: 'strongholdId is required.' });
        return;
      }

      const ecology = getEcologyModule();
      if (!ecology) {
        sendJson(res, 500, { success: false, error: 'EcologyLogisticsModule not initialized.' });
        return;
      }

      const meta = getCampaignMeta(db);
      const result = ecology.attackBanditStronghold(characterId, strongholdId, meta.activeTurn, meta.currentDate);

      sendJson(res, 200, { success: true, result });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // 6. POST /api/ecology/simulate-turn
  // -------------------------------------------------------------
  router.post('/api/ecology/simulate-turn', async (_req: any, res: any, _ctx: RouteContext) => {
    try {
      const ecology = getEcologyModule();
      if (!ecology) {
        sendJson(res, 500, { success: false, error: 'EcologyLogisticsModule not initialized.' });
        return;
      }

      const meta = getCampaignMeta(db);
      const result = ecology.simulateEcologyAndLogisticsTurn(meta.activeTurn, meta.currentDate);

      sendJson(res, 200, { success: true, result });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });
}
