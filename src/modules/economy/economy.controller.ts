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
import { CaravanLogisticsService } from '../ecology-logistics/caravan-logistics.service';
import { postCashflowEntry } from '../../shared/ledger';
import { ACCOUNT_CODES } from '../../shared/account-codes';
import { getMarketItem } from '../../shared/market-price-book';
import { quoteFromReference } from '../../shared/market-quote';
import { worldPriceMultiplier } from '../../shared/world-price';

function getEconomyModule(): EconomyModule | undefined {
  return ModuleRegistry.getInstance().get<EconomyModule>('module.economy');
}

function getDb(): DatabaseService {
  return DatabaseService.getInstance();
}

function ensureLoansTable(db: DatabaseService): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_loans (
      loan_id TEXT PRIMARY KEY,
      borrower_id TEXT NOT NULL,
      lender_name TEXT NOT NULL,
      principal INTEGER NOT NULL,
      interest_rate REAL NOT NULL DEFAULT 0.05,
      outstanding_balance INTEGER NOT NULL,
      created_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );
  `);
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
  ensureLoansTable(db);

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

      const meta = getCampaignMeta(db);
      const effectiveDate = meta.currentDate;
      const fameRow = db.queryOne<{ fame: number }>('SELECT fame FROM player_state WHERE player_id = ?;', ['PLY-0001']);
      const worldMultiplier = worldPriceMultiplier(db, itemCode, effectiveDate);
      const quote = quoteFromReference(marketItem.price, Number(fameRow?.fame || 0), itemCode, worldMultiplier);
      const effectiveUnitPrice = tradeAction === 'BUY' ? quote.buyPrice : quote.sellPrice;
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

      sendJson(res, 200, {
        success: true,
        ...tradeResult,
        message: `Thực hiện lệnh ${tradeAction} thành công: ${qty} ${tradeResult.itemName} tổng trị giá ${totalAmount} quan.`
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/trade', handleTrade);
  router.post('/api/economy/trade', handleTrade);

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
          postCashflowEntry(db, {
            txnId,
            gameDate: effectiveDate,
            counterparty: lenderName,
            category: 'Financing/Loan',
            inflow: numAmount,
            balance: newCash + safeCash,
            memo: `Vay vốn kinh doanh từ ${lenderName}`
          });

          insertJournalPair(db, {
            txnId,
            campaignId: meta.campaignId,
            gameDate: effectiveDate,
            debitAccount: ACCOUNT_CODES.cashMobile,
            creditAccount: ACCOUNT_CODES.accountsPayable,
            amount: numAmount,
            memo: `Vay vốn lưu động ${lenderName}`
          });

          return {
            loanId: generatedId,
            action: 'BORROW',
            principal: numAmount,
            outstandingBalance: outstanding,
            newLiquidCash: newCash,
            message: `Vay thành công ${numAmount} quan từ ${lenderName} (Lãi suất 5%, hoàn trả ${outstanding} quan).`
          };
        } else if (loanAction === 'REPAY') {
          if (!loanId) throw new Error('loanId is required to repay a specific debt.');
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
          postCashflowEntry(db, {
            txnId,
            gameDate: effectiveDate,
            counterparty: targetLoan.lender_name,
            category: 'Financing/Repayment',
            outflow: payAmount,
            balance: newCash + safeCash,
            memo: `Trả nợ khoản vay ${loanId}`
          });

          insertJournalPair(db, {
            txnId,
            campaignId: meta.campaignId,
            gameDate: effectiveDate,
            debitAccount: ACCOUNT_CODES.accountsPayable,
            creditAccount: ACCOUNT_CODES.cashMobile,
            amount: payAmount,
            memo: `Hoàn trả nợ vay ${loanId}`
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
        } else {
          throw new Error('Action must be BORROW or REPAY.');
        }
      });

      sendJson(res, 200, { success: true, ...result });
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

      sendJson(res, 200, {
        success: true,
        ...result
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
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
      const { advanceCampaignDays } = require('../../../engine/time-manager');
      const time = advanceCampaignDays(getDb().path, 1, {
        reason: 'Thương đoàn lên đường',
        clampToMonthEnd: true,
        grainUpkeepPerDay: 0.02,
        fatigueRecoveryPerDay: 1
      });
      if (!time.success) {
        sendJson(res, 409, { success: false, error: time.error || 'Không thể cho thời gian trôi qua.' });
        return;
      }
      if (!time.advancedDays) {
        // Day 30: the month must be closed explicitly; do not report a day
        // that never passed.
        sendJson(res, 409, {
          success: false,
          code: 'MONTH_END',
          error: 'Đã hết ngày 30. Hãy bấm Qua Tháng trước khi tiếp tục.',
          clock: time
        });
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

      const logisticsService = CaravanLogisticsService.getInstance();
      const result = logisticsService.claimCaravan(caravanId, playerId);
      sendJson(res, 200, result);
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
