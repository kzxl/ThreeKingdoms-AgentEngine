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
import { CaravanLogisticsService, GUARD_TIER_CONFIGS } from './caravan-logistics.service';
import { chargePlayerAction } from '../../shared/action-time';
import { requestIdempotencyKey, findIdempotentResult, recordAction } from '../../shared/action-journal';

function getEcologyModule(): EcologyLogisticsModule | undefined {
  return ModuleRegistry.getInstance().get<EcologyLogisticsModule>('module.ecology-logistics');
}

function getDb(): DatabaseService {
  return DatabaseService.getInstance();
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

      const grain = parseFloat(String(grainAmount));
      if (isNaN(grain) || grain <= 0) {
        sendJson(res, 400, { success: false, error: 'grainAmount must be a positive number.' });
        return;
      }

      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }

      const ecology = getEcologyModule();
      if (!ecology) {
        sendJson(res, 500, { success: false, error: 'EcologyLogisticsModule not initialized.' });
        return;
      }

      const time = chargePlayerAction(
        db.path,
        'ADMIN_ACTION',
        null,
        `Grain relief ${settlementId}`
      );
      const meta = getCampaignMeta(db);
      const result = ecology.dispatchGrainRelief(settlementId, grain, meta.activeTurn, meta.currentDate);

      const response = { result, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'ECOLOGY_RELIEF',
        payload: { settlementId, grainAmount: grain },
        result: response
      });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
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
        guardTier = 'VETERAN',
        playerId = 'PLY-0001'
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

      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }

      const time = chargePlayerAction(
        db.path,
        'ENTERPRISE_MANAGE',
        null,
        `Dispatch caravan ${fromSettlementId} -> ${toSettlementId}`
      );

      // Delegate to the one caravan writer: it checks stock, deducts the cargo,
      // charges the guard fee through the ledger and marks the caravan as
      // player-dispatched so it can be claimed on arrival.
      const result = CaravanLogisticsService.getInstance().dispatchCaravan(
        {
          cargoItemCode,
          cargoQuantity: qty,
          fromSettlementId,
          toSettlementId,
          guardTier
        },
        playerId
      );

      const response = {
        ...result,
        cargoValueQian: result.cargoCostBasis,
        time
      };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'ECOLOGY_TRANSPORT',
        payload: { fromSettlementId, toSettlementId, cargoItemCode, cargoQuantity: qty, guardTier, playerId },
        result: response
      });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
    }
  };

  router.get('/api/ecology/transport', handleGetTransport);
  router.get('/api/logistics/caravans', handleGetTransport);

  // Guard tiers are the real dispatch cost/capacity contract for the map UI.
  router.get('/api/caravans/guard-tiers', (_req: any, res: any, _ctx: RouteContext) => {
    const tiers = Object.values(GUARD_TIER_CONFIGS).map(tier => ({
      tier: tier.tier,
      nameVi: tier.nameVi,
      troops: tier.troops,
      costQian: tier.costQian
    }));
    sendJson(res, 200, { success: true, count: tiers.length, tiers });
  });

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

      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }

      const ecology = getEcologyModule();
      if (!ecology) {
        sendJson(res, 500, { success: false, error: 'EcologyLogisticsModule not initialized.' });
        return;
      }

      const time = chargePlayerAction(
        db.path,
        'COMBAT_ENCOUNTER',
        null,
        `Attack stronghold ${strongholdId}`
      );
      const meta = getCampaignMeta(db);
      const result = ecology.attackBanditStronghold(characterId, strongholdId, meta.activeTurn, meta.currentDate);

      const response = { result, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'BANDIT_STRONGHOLD_ASSAULT',
        payload: { strongholdId, characterId },
        result: response
      });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
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
