/**
 * ThreeKingdoms-AgentEngine: Economy Feature Controller (src/modules/economy/economy.controller.ts)
 * Exposes REST APIs for dynamic market pricing, commodity trading, cashflow ledgers,
 * credit/loan management, and merchant caravan tracking.
 *
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import { DatabaseService } from '../../core/database';
import { ModuleRegistry } from '../../core/module-registry';
import { EconomyModule } from './economy.module';
import { RegionalMarketService, SETTLEMENT_PROFILES } from './regional-market.service';
import { LOC_TO_NODE_MAP } from '../ecology-logistics/spatial-registry';
import { SettlementMarketService } from './settlement-market.service';
import { CaravanLogisticsService } from '../ecology-logistics/caravan-logistics.service';
import { postCashflowEntry, postDoubleEntry } from '../../shared/ledger';
import { ACCOUNT_CODES } from '../../shared/account-codes';
import { getMarketItem } from '../../shared/market-price-book';
import { quoteFromReference } from '../../shared/market-quote';
import { worldPriceMultiplier } from '../../shared/world-price';
import { SpatialGuardService } from '../progression/spatial-guard.service';
import { SkillService } from '../progression/skill.service';
import { getCareerModifiers } from '../../../engine/career-paths';
import { ObligationService } from './obligation.service';
import { ContractBoardService } from './contract-board.service';
import { IntelService } from './intel.service';
import { chargePlayerAction } from '../../shared/action-time';
import { requestIdempotencyKey, findIdempotentResult, recordAction } from '../../shared/action-journal';

function getEconomyModule(): EconomyModule | undefined {
  return ModuleRegistry.getInstance().get<EconomyModule>('module.economy');
}

function getDb(): DatabaseService {
  return DatabaseService.getInstance();
}

function getCampaignMeta(db: DatabaseService): { campaignId: string; activeTurn: number; currentDate: string } {
  try {
    const row = db.queryOne<{ campaign_id: string; active_turn: number; current_date: string }>(
      'SELECT campaign_id, active_turn, "current_date" FROM campaign_meta LIMIT 1;'
    );
    if (row) {
      return { campaignId: row.campaign_id, activeTurn: row.active_turn, currentDate: row.current_date };
    }
  } catch {
    // default fallback
  }
  return { campaignId: 'CMP-184-ZHOU-01', activeTurn: 6, currentDate: '184-05-01' };
}

/** Deterministic identifier from the row count of an internal table. */
function nextSequentialId(db: DatabaseService, table: string, prefix: string, gameDate: string): string {
  const compact = String(gameDate || '184-05-01').replace(/-/g, '');
  const row = db.queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM ${table};`);
  const seq = String(Number(row?.c || 0) + 1).padStart(6, '0');
  return `${prefix}-${compact}-${seq}`;
}

/**
 * Writes one balanced double-entry pair (Dr == Cr) using the canonical
 * account_journal schema. Centralised so controllers cannot drift from the
 * column names again.
 */
function insertJournalPair(
  db: DatabaseService,
  entry: {
    txnId: string;
    campaignId: string;
    gameDate: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    memo: string;
  }
): void {
  db.execute(
    `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
     VALUES (?, ?, ?, ?, ?, 0, ?);`,
    [entry.txnId, entry.campaignId, entry.gameDate, entry.debitAccount, entry.amount, entry.memo]
  );
  db.execute(
    `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
     VALUES (?, ?, ?, ?, 0, ?, ?);`,
    [entry.txnId, entry.campaignId, entry.gameDate, entry.creditAccount, entry.amount, entry.memo]
  );
}

/** Adds one calendar year to a game date, clamping the day to 30. */
function oneYearLater(gameDate: string): string {
  const [year, month, day] = String(gameDate).split('-').map(Number);
  return `${year + 1}-${String(month || 1).padStart(2, '0')}-${String(Math.min(day || 1, 30)).padStart(2, '0')}`;
}

/**
 * Registers all Economy module routes into the provided Router instance.
 */
export function registerEconomyRoutes(router: Router): void {
  const db = getDb();

  // -------------------------------------------------------------
  // 1. GET /api/market & /api/economy/market
  // -------------------------------------------------------------
  const handleGetMarket = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const category = ctx.query.category as string | undefined;
      const search = ctx.query.search as string | undefined;
      const economy = getEconomyModule();

      let sql = `
        SELECT 
          m.item_code as itemCode,
          m.name_vi as nameVi,
          m.name_en as nameEn,
          m.category,
          m.unit_vi as unitVi,
          m.unit_en as unitEn,
          m.baseline_peace_price as baselinePeacePrice,
          m.current_market_price as currentMarketPrice,
          m.volatility_index as volatilityIndex,
          m.weight_kg as weightKg,
          COALESCE(i.quantity, 0) as localStock
        FROM master_items m
        LEFT JOIN inventory_items i ON m.item_code = i.item_code
        WHERE 1=1
      `;
      const params: any[] = [];

      if (category) {
        sql += ` AND m.category = ?`;
        params.push(category);
      }
      if (search) {
        sql += ` AND (m.name_vi LIKE ? OR m.name_en LIKE ? OR m.item_code LIKE ?)`;
        const wild = `%${search}%`;
        params.push(wild, wild, wild);
      }
      sql += ` ORDER BY m.category ASC, m.baseline_peace_price DESC;`;

      const items = db.query<any>(sql, params);

      // Enhance items with dynamic elasticity prices
      const market = items.map((item) => {
        let dynamicPrice = item.currentMarketPrice;
        if (economy) {
          dynamicPrice = economy.calculateDynamicPrice({
            commodity: item.itemCode,
            basePrice: item.baselinePeacePrice,
            currentPrice: item.currentMarketPrice,
            stockUnits: Math.max(10, Number(item.localStock) || 50),
            demandUnits: 150,
            priceElasticity: 1.2
          });
        }
        return {
          ...item,
          dynamicPrice
        };
      });

      sendJson(res, 200, { success: true, count: market.length, market });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/market', handleGetMarket);
  router.get('/api/economy/market', handleGetMarket);

  // Market pulse: local stock/demand and the last 12 monthly points.
  router.get('/api/economy/settlement-market', (_req: any, res: any, ctx: RouteContext) => {
    try {
      const player = db.queryOne<{ current_location: string }>(
        'SELECT current_location FROM player_state WHERE player_id = ?;',
        ['PLY-0001']
      );
      const requested = (ctx.query.settlementId as string) || player?.current_location || 'LOC-0001';
      const settlementId = LOC_TO_NODE_MAP[requested] || requested;
      const market = SettlementMarketService.forDatabase(db);
      const rows = market.getMarketPulse(settlementId, Number(ctx.query.limit));
      const names = new Map(
        db.query<{ item_code: string; name_vi: string }>(
          'SELECT item_code, name_vi FROM master_items;'
        ).map(item => [item.item_code, item.name_vi])
      );
      sendJson(res, 200, {
        success: true,
        settlementId,
        items: rows.map(row => ({ ...row, nameVi: names.get(row.itemCode) || row.itemCode }))
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // 2. POST /api/market/quote & /api/strategy/price-check
  // -------------------------------------------------------------
  const handlePriceQuote = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const { commodity, basePrice, currentPrice, stockUnits, demandUnits, priceElasticity } = ctx.body || {};
      const economy = getEconomyModule();
      if (!economy) {
        sendJson(res, 500, { success: false, error: 'EconomyModule not loaded' });
        return;
      }

      const dynamicPrice = economy.calculateDynamicPrice({
        commodity: commodity || 'GRAIN',
        basePrice: Number(basePrice) || 50,
        currentPrice: Number(currentPrice) || 50,
        stockUnits: Number(stockUnits) || 100,
        demandUnits: Number(demandUnits) || 200,
        priceElasticity: Number(priceElasticity) || 1.5
      });

      sendJson(res, 200, { success: true, dynamicPrice });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/market/quote', handlePriceQuote);
  router.post('/api/strategy/price-check', handlePriceQuote);

  // -------------------------------------------------------------
  // 3. POST /api/trade & /api/economy/trade
  // -------------------------------------------------------------
  const handleTrade = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const {
        action,
        itemCode,
        quantity,
        counterparty = 'Thương Khách Huyện Trác'
      } = ctx.body || {};

      const tradeAction = (action || '').toUpperCase();
      if (tradeAction !== 'BUY' && tradeAction !== 'SELL') {
        sendJson(res, 400, {
          success: false,
          error: 'Trade action must be either "BUY" or "SELL".'
        });
        return;
      }

      const qty = parseFloat(quantity);
      if (!itemCode || isNaN(qty) || qty <= 0) {
        sendJson(res, 400, {
          success: false,
          error: 'Valid itemCode and positive quantity are required.'
        });
        return;
      }

      // master_items is the only price source; a client-supplied price is ignored
      // so the UI cannot buy or sell off-catalog.
      const marketItem = getMarketItem(db, itemCode);
      if (!marketItem || marketItem.price <= 0) {
        sendJson(res, 404, { success: false, error: `Commodity ${itemCode} has no market price.` });
        return;
      }

      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }

      // A market session costs two days; charge before the clock-derived quote.
      const time = chargePlayerAction(
        db.path,
        tradeAction === 'BUY' ? 'TRADE_BUY' : 'TRADE_SELL',
        null,
        `Trade ${tradeAction} ${qty} ${itemCode}`
      );

      const meta = getCampaignMeta(db);
      const effectiveDate = meta.currentDate;
      const fameRow = db.queryOne<{ fame: number; current_location: string }>(
        'SELECT fame, current_location FROM player_state WHERE player_id = ?;',
        ['PLY-0001']
      );
      const worldMultiplier = worldPriceMultiplier(db, itemCode, effectiveDate);
      const settlementNode = LOC_TO_NODE_MAP[fameRow?.current_location || ''] || (fameRow?.current_location || '');
      const localMultiplier = settlementNode
        ? SettlementMarketService.forDatabase(db).getLocalMultiplier(settlementNode, itemCode)
        : 1;
      const quote = quoteFromReference(marketItem.price, Number(fameRow?.fame || 0), itemCode, worldMultiplier, localMultiplier);
      const career = getCareerModifiers(db as any, 'PLY-0001').modifiers;
      const tradeMargin = Math.min(0.2, SkillService.forDatabase(db).getEffectTotal(
        'TRADE_MARGIN',
        ['SKL-COM-APPRAISE', 'SKL-COM-SPECULATE', 'SKL-COM-CARAVAN', 'SKL-MGT-ENTERPRISE']
      ) + Number(career.tradeMargin || 0));
      const effectiveUnitPrice = tradeAction === 'BUY'
        ? Math.max(1, Math.round(quote.buyPrice * (1 - tradeMargin)))
        : Math.max(1, Math.round(quote.sellPrice * (1 + tradeMargin)));
      const itemInfo = {
        item_code: marketItem.itemCode,
        name_vi: marketItem.nameVi,
        category: marketItem.category
      };
      const totalAmount = Math.round(qty * effectiveUnitPrice);

      const tradeResult = db.transaction(() => {
        const player = db.queryOne<{ liquid_cash: number; safe_cash: number }>(
          'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ?',
          ['PLY-0001']
        );
        if (!player) throw new Error('Player state PLY-0001 not found.');

        const txnId = nextSequentialId(db, 'cashflow_ledger', 'TXN', effectiveDate);
        const safeCash = Number(player.safe_cash || 0);
        // The immutable ledger tracks total liquid cash; player_state holds the spendable slice.
        let newLiquid = Number(player.liquid_cash);
        let newLedgerBalance = newLiquid + safeCash;

        if (tradeAction === 'BUY') {
          if (player.liquid_cash < totalAmount) {
            throw new Error(`Insufficient funds: requires ${totalAmount} quan, available ${player.liquid_cash} quan.`);
          }
          newLiquid = player.liquid_cash - totalAmount;
          newLedgerBalance = newLiquid + safeCash;

          // Deduct player cash
          db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?', [newLiquid, 'PLY-0001']);

          // Upsert inventory
          db.execute(
            `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
             VALUES (?, ?, ?, ?, ?, 'Zhuo Warehouse')
             ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + ?;`,
            [itemCode, itemInfo.category, itemInfo.name_vi, qty, effectiveUnitPrice, qty]
          );

          // Append double-entry ledger & journal
          postCashflowEntry(db, {
            txnId,
            gameDate: effectiveDate,
            counterparty,
            category: 'Trade/Purchase',
            outflow: totalAmount,
            balance: newLedgerBalance,
            memo: `Mua ${qty} ${itemInfo.name_vi} đơn giá ${effectiveUnitPrice} quan`
          });

          insertJournalPair(db, {
            txnId,
            campaignId: meta.campaignId,
            gameDate: effectiveDate,
            debitAccount: ACCOUNT_CODES.inventory,
            creditAccount: ACCOUNT_CODES.cashMobile,
            amount: totalAmount,
            memo: `Nhập kho ${qty} ${itemInfo.name_vi}`
          });

          // Stock movement
          db.execute(
            `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
             VALUES (?, ?, ?, 'PURCHASE_RECEIPT', ?, ?, (SELECT quantity FROM inventory_items WHERE item_code = ?), ?);`,
            [nextSequentialId(db, 'stock_movements', 'MOV', effectiveDate), effectiveDate, itemCode, qty, effectiveUnitPrice, itemCode, txnId]
          );
        } else {
          // Action SELL
          const stock = db.queryOne<{ quantity: number }>('SELECT quantity FROM inventory_items WHERE item_code = ?', [itemCode]);
          if (!stock || stock.quantity < qty) {
            throw new Error(`Insufficient inventory: have ${stock?.quantity || 0}, requested ${qty}.`);
          }

          newLiquid = player.liquid_cash + totalAmount;
          newLedgerBalance = newLiquid + safeCash;

          // Add player cash
          db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?', [newLiquid, 'PLY-0001']);

          // Deduct inventory
          db.execute('UPDATE inventory_items SET quantity = quantity - ? WHERE item_code = ?', [qty, itemCode]);

          // Append double-entry ledger & journal
          postCashflowEntry(db, {
            txnId,
            gameDate: effectiveDate,
            counterparty,
            category: 'Trade/Sale',
            inflow: totalAmount,
            balance: newLedgerBalance,
            memo: `Bán ${qty} ${itemInfo.name_vi} đơn giá ${effectiveUnitPrice} quan`
          });

          insertJournalPair(db, {
            txnId,
            campaignId: meta.campaignId,
            gameDate: effectiveDate,
            debitAccount: ACCOUNT_CODES.cashMobile,
            creditAccount: ACCOUNT_CODES.salesRevenue,
            amount: totalAmount,
            memo: `Xuất bán ${qty} ${itemInfo.name_vi}`
          });

          // Stock movement
          db.execute(
            `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
             VALUES (?, ?, ?, 'SALE_DISPATCH', ?, ?, (SELECT quantity FROM inventory_items WHERE item_code = ?), ?);`,
            [nextSequentialId(db, 'stock_movements', 'MOV', effectiveDate), effectiveDate, itemCode, qty, effectiveUnitPrice, itemCode, txnId]
          );
        }

        return {
          txnId,
          action: tradeAction,
          itemCode,
          itemName: itemInfo.name_vi,
          quantity: qty,
          unitPrice: effectiveUnitPrice,
          totalAmount,
          newCashBalance: newLiquid
        };
      });

      // The local market state is the same source its quote read; book the fill.
      const market = settlementNode
        ? SettlementMarketService.forDatabase(db).applyTrade(
          settlementNode,
          itemCode,
          tradeAction === 'BUY' ? -qty : qty
        )
        : null;

      const response = { ...tradeResult, market, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: `TRADE_${tradeAction}`,
        payload: { action: tradeAction, itemCode, quantity: qty },
        result: response
      });

      sendJson(res, 200, {
        success: true,
        ...response,
        idempotent: false,
        message: `Thực hiện lệnh ${tradeAction} thành công: ${qty} ${tradeResult.itemName} tổng trị giá ${totalAmount} quan.`
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/trade', handleTrade);
  router.post('/api/economy/trade', handleTrade);

  // -------------------------------------------------------------
  // 3b. GET /api/obligations & POST /api/obligations/pay
  // -------------------------------------------------------------
  const handleGetObligations = (req: any, res: any, ctx: RouteContext) => {
    try {
      const playerId = (ctx.query.playerId as string) || 'PLY-0001';
      const service = ObligationService.forDatabase(db);
      sendJson(res, 200, {
        success: true,
        playerId,
        obligations: service.list(playerId),
        summary: service.summary(playerId)
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };
  router.get('/api/obligations', handleGetObligations);
  router.get('/api/economy/obligations', handleGetObligations);

  const handlePayObligation = (req: any, res: any, ctx: RouteContext) => {
    try {
      const { obligationId, playerId = 'PLY-0001' } = ctx.body || {};
      if (!obligationId) {
        sendJson(res, 400, { success: false, error: 'obligationId is required.' });
        return;
      }
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const time = chargePlayerAction(db.path, 'ADMIN_ACTION', null, `Pay obligation ${obligationId}`);
      const service = ObligationService.forDatabase(db);
      const obligation = service.pay(obligationId, playerId);
      const response = { obligation, summary: service.summary(playerId), time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'OBLIGATION_PAY',
        payload: { obligationId, playerId },
        result: response
      });
      sendJson(res, 200, {
        success: true,
        ...response,
        idempotent: false
      });
    } catch (err: any) {
      const status = err.code === 'INSUFFICIENT_FUNDS' || err.code === 'INSUFFICIENT_GRAIN' ? 409 : 400;
      sendJson(res, status, { success: false, error: err.message, code: err.code });
    }
  };
  router.post('/api/obligations/pay', handlePayObligation);
  router.post('/api/economy/obligations/pay', handlePayObligation);

  // -------------------------------------------------------------
  // 3c. Contract board: list, accept, deliver
  // -------------------------------------------------------------
  const handleGetContracts = (req: any, res: any, ctx: RouteContext) => {
    try {
      const playerId = (ctx.query.playerId as string) || 'PLY-0001';
      const settlementId = ctx.query.settlementId as string | undefined;
      const board = ContractBoardService.forDatabase(db).list(playerId, settlementId);
      sendJson(res, 200, { success: true, playerId, ...board });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };
  router.get('/api/contracts', handleGetContracts);
  router.get('/api/economy/contracts', handleGetContracts);

  const handleAcceptContract = (req: any, res: any, ctx: RouteContext) => {
    try {
      const { offerId, playerId = 'PLY-0001' } = ctx.body || {};
      if (!offerId) {
        sendJson(res, 400, { success: false, error: 'offerId is required.' });
        return;
      }
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const time = chargePlayerAction(db.path, 'ADMIN_ACTION', null, `Accept contract ${offerId}`);
      const service = ContractBoardService.forDatabase(db);
      const contract = service.accept(offerId, playerId);
      const response = { contract, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'CONTRACT_ACCEPT',
        payload: { offerId, playerId },
        result: response
      });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message, code: err.code });
    }
  };
  router.post('/api/contracts/accept', handleAcceptContract);
  router.post('/api/economy/contracts/accept', handleAcceptContract);

  const handleDeliverContract = (req: any, res: any, ctx: RouteContext) => {
    try {
      const { contractId, playerId = 'PLY-0001' } = ctx.body || {};
      if (!contractId) {
        sendJson(res, 400, { success: false, error: 'contractId is required.' });
        return;
      }
      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const service = ContractBoardService.forDatabase(db);
      const contract = service.deliver(contractId, playerId);
      const response = { contract, summary: service.list(playerId).summary };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'CONTRACT_DELIVER',
        payload: { contractId, playerId },
        result: response
      });
      sendJson(res, 200, {
        success: true,
        ...response,
        idempotent: false
      });
    } catch (err: any) {
      const status = err.message?.includes('không còn trong kho') ? 409 : 400;
      sendJson(res, status, { success: false, error: err.message, code: err.code });
    }
  };
  router.post('/api/contracts/deliver', handleDeliverContract);
  router.post('/api/economy/contracts/deliver', handleDeliverContract);

  // -------------------------------------------------------------
  // 3d. Intel board: list rumors and verify one (costs days)
  // -------------------------------------------------------------
  const handleGetIntel = (req: any, res: any, ctx: RouteContext) => {
    try {
      const settlementId = ctx.query.settlementId as string | undefined;
      const service = IntelService.forDatabase(db);
      const settlement = service.resolveSettlement(settlementId);
      sendJson(res, 200, {
        success: true,
        settlementId: settlement,
        reports: service.list(settlementId)
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };
  router.get('/api/intel', handleGetIntel);
  router.get('/api/economy/intel', handleGetIntel);

  const handleVerifyIntel = (req: any, res: any, ctx: RouteContext) => {
    try {
      const { reportId } = ctx.body || {};
      if (!reportId) {
        sendJson(res, 400, { success: false, error: 'reportId is required.' });
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
        'EXPLORE_POI',
        null,
        `Verify intel ${reportId}`
      );
      const result = IntelService.forDatabase(db).verify(reportId);
      const response = { ...result, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'INTEL_VERIFY',
        payload: { reportId },
        result: response
      });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message, code: err.code });
    }
  };
  router.post('/api/intel/verify', handleVerifyIntel);
  router.post('/api/economy/intel/verify', handleVerifyIntel);

  // -------------------------------------------------------------
  // 4. GET /api/ledger & /api/economy/ledger
  // -------------------------------------------------------------
  const handleGetLedger = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const limit = Math.min(200, parseInt((ctx.query.limit as string) || '50', 10));
      const offset = Math.max(0, parseInt((ctx.query.offset as string) || '0', 10));

      const cashflow = db.query<any>(
        'SELECT * FROM cashflow_ledger ORDER BY game_date DESC, rowid DESC LIMIT ? OFFSET ?;',
        [limit, offset]
      );
      const journal = db.query<any>(
        'SELECT * FROM account_journal ORDER BY entry_id DESC LIMIT ? OFFSET ?;',
        [limit, offset]
      );

      const summary = db.queryOne<{ totalInflow: number; totalOutflow: number; balance: number }>(`
        SELECT 
          COALESCE(SUM(inflow), 0) as totalInflow,
          COALESCE(SUM(outflow), 0) as totalOutflow,
          COALESCE((SELECT balance FROM cashflow_ledger ORDER BY game_date DESC, rowid DESC LIMIT 1), 0) as balance
        FROM cashflow_ledger;
      `) || { totalInflow: 0, totalOutflow: 0, balance: 0 };

      sendJson(res, 200, { success: true, summary, cashflow, journal });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/ledger', handleGetLedger);
  router.get('/api/economy/ledger', handleGetLedger);

  // -------------------------------------------------------------
  // 5. GET & POST /api/loans & /api/economy/loans
  // -------------------------------------------------------------
  const handleGetLoans = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const borrowerId = (ctx.query.borrowerId as string) || 'PLY-0001';
      const loans = db.query<any>(
        'SELECT * FROM financial_loans WHERE borrower_id = ? ORDER BY created_date DESC;',
        [borrowerId]
      );

      const player = db.queryOne<{ liquid_cash: number; fixed_capital: number }>(
        'SELECT liquid_cash, fixed_capital FROM player_state WHERE player_id = ?',
        [borrowerId]
      );

      const totalDebt = loans
        .filter((l) => l.status === 'ACTIVE')
        .reduce((sum, l) => sum + (Number(l.outstanding_balance) || 0), 0);

      // Max credit based on player liquid cash and workshop fixed assets
      const creditCapacity = Math.max(5000, ((player?.liquid_cash || 0) + (player?.fixed_capital || 0)) * 2);
      const availableCredit = Math.max(0, creditCapacity - totalDebt);

      sendJson(res, 200, {
        success: true,
        borrowerId,
        creditLimit: creditCapacity,
        totalDebt,
        availableCredit,
        loans
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  const handlePostLoans = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const {
        action,
        amount,
        lenderName = 'Huyện Trác Tiền Trang',
        loanId
      } = ctx.body || {};

      const loanAction = (action || '').toUpperCase();
      const numAmount = parseInt(amount, 10);

      if (isNaN(numAmount) || numAmount <= 0) {
        sendJson(res, 400, { success: false, error: 'Positive loan amount is required.' });
        return;
      }
      if (loanAction !== 'BORROW' && loanAction !== 'REPAY') {
        sendJson(res, 400, { success: false, error: 'Action must be BORROW or REPAY.' });
        return;
      }
      if (loanAction === 'REPAY' && !loanId) {
        sendJson(res, 400, { success: false, error: 'loanId is required to repay a specific debt.' });
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
        'ADMIN_ACTION',
        null,
        `Loan ${loanAction} ${numAmount}`
      );
      const meta = getCampaignMeta(db);
      const effectiveDate = meta.currentDate;

      const result = db.transaction(() => {
        const player = db.queryOne<{ liquid_cash: number; safe_cash: number }>(
          'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ?',
          ['PLY-0001']
        );
        if (!player) throw new Error('Player state not found.');
        const safeCash = Number(player.safe_cash || 0);

        if (loanAction === 'BORROW') {
          const generatedId = nextSequentialId(db, 'financial_loans', 'LOAN', effectiveDate);
          const interestRate = 0.05;
          const outstanding = Math.round(numAmount * (1 + interestRate));
          const newCash = player.liquid_cash + numAmount;

          db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?', [newCash, 'PLY-0001']);

          db.execute(
            `INSERT INTO financial_loans (loan_id, borrower_id, lender_name, principal, interest_rate, outstanding_balance, created_date, due_date, status)
             VALUES (?, 'PLY-0001', ?, ?, ?, ?, ?, ?, 'ACTIVE');`,
            [generatedId, lenderName, numAmount, interestRate, outstanding, effectiveDate, oneYearLater(effectiveDate)]
          );

          const txnId = nextSequentialId(db, 'cashflow_ledger', 'TXN', effectiveDate);
          postDoubleEntry(db, {
            txnId,
            gameDate: effectiveDate,
            counterparty: lenderName,
            category: 'Financing/Loan',
            inflow: numAmount,
            balance: newCash + safeCash,
            memo: `Vay vốn kinh doanh từ ${lenderName}`,
            debitAccount: ACCOUNT_CODES.cashMobile,
            creditAccount: ACCOUNT_CODES.accountsPayable
          });

          return {
            loanId: generatedId,
            action: 'BORROW',
            principal: numAmount,
            outstandingBalance: outstanding,
            newLiquidCash: newCash,
            message: `Vay thành công ${numAmount} quan từ ${lenderName} (Lãi suất 5%, hoàn trả ${outstanding} quan).`
          };
        }

        const targetLoan = db.queryOne<any>('SELECT * FROM financial_loans WHERE loan_id = ? AND status = ?', [loanId, 'ACTIVE']);
        if (!targetLoan) throw new Error(`Active loan ${loanId} not found.`);

        const payAmount = Math.min(numAmount, targetLoan.outstanding_balance);
        if (player.liquid_cash < payAmount) {
          throw new Error(`Insufficient funds: require ${payAmount} quan, available ${player.liquid_cash} quan.`);
        }

        const newCash = player.liquid_cash - payAmount;
        const remainingDebt = targetLoan.outstanding_balance - payAmount;
        const newStatus = remainingDebt <= 0 ? 'REPAID' : 'ACTIVE';

        db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?', [newCash, 'PLY-0001']);
        db.execute('UPDATE financial_loans SET outstanding_balance = ?, status = ? WHERE loan_id = ?', [remainingDebt, newStatus, loanId]);

        const txnId = nextSequentialId(db, 'cashflow_ledger', 'TXN', effectiveDate);
        postDoubleEntry(db, {
          txnId,
          gameDate: effectiveDate,
          counterparty: targetLoan.lender_name,
          category: 'Financing/Repayment',
          outflow: payAmount,
          balance: newCash + safeCash,
          memo: `Trả nợ khoản vay ${loanId}`,
          debitAccount: ACCOUNT_CODES.accountsPayable,
          creditAccount: ACCOUNT_CODES.cashMobile
        });

        return {
          loanId,
          action: 'REPAY',
          paidAmount: payAmount,
          remainingDebt,
          newStatus,
          newLiquidCash: newCash,
          message: `Hoàn trả ${payAmount} quan cho ${targetLoan.lender_name}. Nợ còn lại: ${remainingDebt} quan.`
        };
      });

      const response = { ...result, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: `LOAN_${loanAction}`,
        payload: { action: loanAction, amount: numAmount, lenderName, loanId },
        result: response
      });
      sendJson(res, 200, { success: true, ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.get('/api/loans', handleGetLoans);
  router.get('/api/economy/loans', handleGetLoans);
  router.post('/api/loans', handlePostLoans);
  router.post('/api/economy/loans', handlePostLoans);

  // -------------------------------------------------------------
  // 6. GET /api/caravans & /api/economy/caravans
  // -------------------------------------------------------------
  const handleGetCaravans = async (_req: any, res: any, _ctx: RouteContext) => {
    try {
      const sql = `
        SELECT 
          c.caravan_id as caravanId,
          c.caravan_name as caravanName,
          c.owner_faction_id as ownerFactionId,
          sf.name_vi as ownerFactionName,
          c.from_settlement_id as fromSettlementId,
          sf_from.name_vi as fromSettlementName,
          c.to_settlement_id as toSettlementId,
          sf_to.name_vi as toSettlementName,
          c.cargo_item_code as cargoItemCode,
          mi.name_vi as cargoItemName,
          c.cargo_quantity as cargoQuantity,
          c.cargo_value_qian as cargoValueQian,
          c.guard_troops as guardTroops,
          c.route_progress as routeProgress,
          c.status,
          c.created_turn as createdTurn
        FROM trade_caravans c
        LEFT JOIN session_factions sf ON c.owner_faction_id = sf.faction_id
        LEFT JOIN session_settlements sf_from ON c.from_settlement_id = sf_from.settlement_id
        LEFT JOIN session_settlements sf_to ON c.to_settlement_id = sf_to.settlement_id
        LEFT JOIN master_items mi ON c.cargo_item_code = mi.item_code
        ORDER BY c.status ASC, c.route_progress DESC;
      `;
      const caravans = db.query<any>(sql);
      sendJson(res, 200, { success: true, count: caravans.length, caravans });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/caravans', handleGetCaravans);
  router.get('/api/economy/caravans', handleGetCaravans);

  // -------------------------------------------------------------
  // 7. GET /api/economy/regional-prices?settlement=<id>&itemCode=<item>
  // -------------------------------------------------------------
  const handleGetRegionalPrices = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const settlementId =
        (ctx.query.settlement as string) || (ctx.query.settlementId as string) || 'zhuo_xian';
      const itemCode = (ctx.query.itemCode as string) || (ctx.query.item as string) || undefined;
      const marketService = RegionalMarketService.getInstance();
      const catalog = marketService.getSettlementMarketCatalog(settlementId);
      const price = itemCode ? marketService.calculateSettlementPrice(settlementId, itemCode) : undefined;
      sendJson(res, 200, {
        success: true,
        settlementId,
        itemCode,
        price,
        count: catalog.length,
        catalog
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/economy/regional-prices', handleGetRegionalPrices);

  // -------------------------------------------------------------
  // 8. GET /api/economy/arbitrage?from=<id>
  // -------------------------------------------------------------
  const handleGetArbitrage = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const fromSettlementId =
        (ctx.query.from as string) || (ctx.query.fromSettlementId as string) || 'zhuo_xian';
      const marketService = RegionalMarketService.getInstance();
      const opportunities = marketService.getArbitrageOpportunities(fromSettlementId);
      const settlements = Object.values(SETTLEMENT_PROFILES).map((p) => ({
        settlementId: p.settlementId,
        nameVi: p.nameVi,
        provinceVi: p.provinceVi
      }));
      sendJson(res, 200, {
        success: true,
        fromSettlementId,
        settlements,
        count: opportunities.length,
        opportunities
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/economy/arbitrage', handleGetArbitrage);

  // -------------------------------------------------------------
  // 9. POST /api/caravans/dispatch & /api/economy/caravans/dispatch
  // -------------------------------------------------------------
  const handleDispatchCaravan = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const {
        cargoItemCode,
        cargoQuantity,
        fromSettlementId,
        toSettlementId,
        guardTier = 'VETERAN',
        playerId = 'PLY-0001'
      } = ctx.body || {};

      if (!cargoItemCode || !cargoQuantity || !fromSettlementId || !toSettlementId) {
        sendJson(res, 400, {
          success: false,
          error: 'cargoItemCode, cargoQuantity, fromSettlementId, và toSettlementId là các tham số bắt buộc.'
        });
        return;
      }

      SpatialGuardService.getInstance().assertStage(
        playerId,
        3,
        'Thương Đoàn Liên Châu',
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
        'ENTERPRISE_MANAGE',
        null,
        `Dispatch caravan ${fromSettlementId} -> ${toSettlementId}`
      );

      const logisticsService = CaravanLogisticsService.getInstance();
      const result = logisticsService.dispatchCaravan(
        {
          cargoItemCode,
          cargoQuantity: parseFloat(cargoQuantity),
          fromSettlementId,
          toSettlementId,
          guardTier
        },
        playerId
      );

      const response = { ...result, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'CARAVAN_DISPATCH',
        payload: { cargoItemCode, cargoQuantity, fromSettlementId, toSettlementId, guardTier },
        result: response
      });
      sendJson(res, 200, {
        success: true,
        ...response,
        idempotent: false
      });
    } catch (err: any) {
      sendJson(res, err.statusCode || 400, { success: false, error: err.message });
    }
  };

  router.post('/api/caravans/dispatch', handleDispatchCaravan);
  router.post('/api/economy/caravans/dispatch', handleDispatchCaravan);

  // -------------------------------------------------------------
  // 10. POST /api/caravans/tick-progress & /api/economy/caravans/tick-progress
  // -------------------------------------------------------------
  // A "let time pass" request spends one campaign day. The day clock is what
  // advances caravans (CaravanLogisticsService.advanceByDays), so this endpoint
  // can never move them for free.
  const handleTickCaravans = async (_req: any, res: any, _ctx: RouteContext) => {
    try {
      const { advanceTime } = require('../../../engine/time-manager');
      const time = advanceTime(getDb().path, 1, {
        reason: 'Thương đoàn lên đường',
        grainUpkeepPerDay: 0.02,
        fatigueRecoveryPerDay: 1
      });
      if (!time.success) {
        sendJson(res, 409, { success: false, error: time.error || 'Không thể cho thời gian trôi qua.' });
        return;
      }
      const caravans = time.caravans || {
        tickedCaravansCount: 0,
        arrivedCaravansCount: 0,
        encounters: [],
        updatedCaravans: []
      };
      sendJson(res, 200, {
        success: true,
        ...caravans,
        time
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.post('/api/caravans/tick-progress', handleTickCaravans);
  router.post('/api/economy/caravans/tick-progress', handleTickCaravans);

  // -------------------------------------------------------------
  // 11. POST /api/caravans/claim & /api/economy/caravans/claim
  // -------------------------------------------------------------
  const handleClaimCaravan = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const { caravanId, playerId = 'PLY-0001' } = ctx.body || {};
      if (!caravanId) {
        sendJson(res, 400, {
          success: false,
          error: 'caravanId là tham số bắt buộc.'
        });
        return;
      }

      const idempotencyKey = requestIdempotencyKey(ctx);
      const prior = findIdempotentResult(db, idempotencyKey);
      if (prior) {
        sendJson(res, 200, { success: true, ...prior, idempotent: true });
        return;
      }
      const time = chargePlayerAction(db.path, 'ADMIN_ACTION', null, `Claim caravan ${caravanId}`);
      const logisticsService = CaravanLogisticsService.getInstance();
      const result = logisticsService.claimCaravan(caravanId, playerId);
      const response = { ...result, time };
      recordAction(db, {
        key: idempotencyKey,
        actionType: 'CARAVAN_CLAIM',
        payload: { caravanId, playerId },
        result: response
      });
      sendJson(res, 200, { ...response, idempotent: false });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/caravans/claim', handleClaimCaravan);
  router.post('/api/economy/caravans/claim', handleClaimCaravan);

  // -------------------------------------------------------------
  // 12. GET /api/caravans/player & /api/economy/caravans/player
  // -------------------------------------------------------------
  const handleGetPlayerCaravans = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const playerId = (ctx.query.playerId as string) || 'PLY-0001';
      const logisticsService = CaravanLogisticsService.getInstance();
      const caravans = logisticsService.getPlayerCaravans(playerId);
      sendJson(res, 200, {
        success: true,
        playerId,
        count: caravans.length,
        caravans
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/caravans/player', handleGetPlayerCaravans);
  router.get('/api/economy/caravans/player', handleGetPlayerCaravans);
}
