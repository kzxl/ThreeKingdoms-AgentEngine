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

function getEconomyModule(): EconomyModule | undefined {
  const gsm = (globalThis as any).__GRAND_STRATEGY_MODULES__;
  if (gsm?.economy) return gsm.economy as EconomyModule;
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

function getCampaignMeta(db: DatabaseService): { activeTurn: number; currentDate: string } {
  try {
    const row = db.queryOne<{ active_turn: number; current_date: string }>(
      'SELECT active_turn, current_date FROM campaign_meta LIMIT 1;'
    );
    if (row) return { activeTurn: row.active_turn, currentDate: row.current_date };
  } catch {
    // default fallback
  }
  return { activeTurn: 6, currentDate: '184-05-01' };
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
        unitPrice,
        counterparty = 'Thương Khách Huyện Trác',
        gameDate
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

      const itemInfo = db.queryOne<{
        item_code: string;
        name_vi: string;
        category: string;
        current_market_price: number;
      }>('SELECT item_code, name_vi, category, current_market_price FROM master_items WHERE item_code = ?', [itemCode]);

      if (!itemInfo) {
        sendJson(res, 404, { success: false, error: `Commodity ${itemCode} not found in master catalog.` });
        return;
      }

      const effectiveUnitPrice = typeof unitPrice === 'number' && unitPrice > 0 ? unitPrice : itemInfo.current_market_price;
      const totalAmount = Math.round(qty * effectiveUnitPrice);
      const meta = getCampaignMeta(db);
      const effectiveDate = gameDate || meta.currentDate;

      const tradeResult = db.transaction(() => {
        const player = db.queryOne<{ liquid_cash: number }>('SELECT liquid_cash FROM player_state WHERE player_id = ?', ['PLY-0001']);
        if (!player) throw new Error('Player state PLY-0001 not found.');

        const txnId = `TXN-${effectiveDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
        let newBalance = player.liquid_cash;

        if (tradeAction === 'BUY') {
          if (player.liquid_cash < totalAmount) {
            throw new Error(`Insufficient funds: requires ${totalAmount} Qian, available ${player.liquid_cash} Qian.`);
          }
          newBalance = player.liquid_cash - totalAmount;

          // Deduct player cash
          db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?', [newBalance, 'PLY-0001']);

          // Upsert inventory
          db.execute(
            `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
             VALUES (?, ?, ?, ?, ?, 'Zhuo Warehouse')
             ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + ?;`,
            [itemCode, itemInfo.category, itemInfo.name_vi, qty, effectiveUnitPrice, qty]
          );

          // Append double-entry ledger & journal
          db.execute(
            `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
             VALUES (?, ?, ?, 'Trade/Purchase', 0, ?, ?, ?, 'Confirmed');`,
            [txnId, effectiveDate, counterparty, totalAmount, newBalance, `Mua ${qty} ${itemInfo.name_vi} đơn giá ${effectiveUnitPrice} Qian`]
          );

          db.execute(
            `INSERT INTO account_journal (game_date, debit_account, credit_account, amount, description, ref_txn)
             VALUES (?, '152_INVENTORY', '101_CASH', ?, ?, ?);`,
            [effectiveDate, totalAmount, `Nhập kho ${qty} ${itemInfo.name_vi}`, txnId]
          );

          // Stock movement
          db.execute(
            `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
             VALUES (?, ?, ?, 'PURCHASE_RECEIPT', ?, ?, (SELECT quantity FROM inventory_items WHERE item_code = ?), ?);`,
            [`MOV-${Date.now()}`, effectiveDate, itemCode, qty, effectiveUnitPrice, itemCode, txnId]
          );
        } else {
          // Action SELL
          const stock = db.queryOne<{ quantity: number }>('SELECT quantity FROM inventory_items WHERE item_code = ?', [itemCode]);
          if (!stock || stock.quantity < qty) {
            throw new Error(`Insufficient inventory: have ${stock?.quantity || 0}, requested ${qty}.`);
          }

          newBalance = player.liquid_cash + totalAmount;

          // Add player cash
          db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?', [newBalance, 'PLY-0001']);

          // Deduct inventory
          db.execute('UPDATE inventory_items SET quantity = quantity - ? WHERE item_code = ?', [qty, itemCode]);

          // Append double-entry ledger & journal
          db.execute(
            `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
             VALUES (?, ?, ?, 'Trade/Sale', ?, 0, ?, ?, 'Confirmed');`,
            [txnId, effectiveDate, counterparty, totalAmount, newBalance, `Bán ${qty} ${itemInfo.name_vi} đơn giá ${effectiveUnitPrice} Qian`]
          );

          db.execute(
            `INSERT INTO account_journal (game_date, debit_account, credit_account, amount, description, ref_txn)
             VALUES (?, '101_CASH', '511_REVENUE', ?, ?, ?);`,
            [effectiveDate, totalAmount, `Xuất bán ${qty} ${itemInfo.name_vi}`, txnId]
          );

          // Stock movement
          db.execute(
            `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
             VALUES (?, ?, ?, 'SALE_DISPATCH', ?, ?, (SELECT quantity FROM inventory_items WHERE item_code = ?), ?);`,
            [`MOV-${Date.now()}`, effectiveDate, itemCode, qty, effectiveUnitPrice, itemCode, txnId]
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
          newCashBalance: newBalance
        };
      });

      sendJson(res, 200, {
        success: true,
        ...tradeResult,
        message: `Thực hiện lệnh ${tradeAction} thành công: ${qty} ${tradeResult.itemName} tổng trị giá ${totalAmount} Qian.`
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
        const player = db.queryOne<{ liquid_cash: number }>('SELECT liquid_cash FROM player_state WHERE player_id = ?', ['PLY-0001']);
        if (!player) throw new Error('Player state not found.');

        if (loanAction === 'BORROW') {
          const generatedId = `LOAN-${Date.now()}`;
          const interestRate = 0.05;
          const outstanding = Math.round(numAmount * (1 + interestRate));
          const newCash = player.liquid_cash + numAmount;

          db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?', [newCash, 'PLY-0001']);

          db.execute(
            `INSERT INTO financial_loans (loan_id, borrower_id, lender_name, principal, interest_rate, outstanding_balance, created_date, due_date, status)
             VALUES (?, 'PLY-0001', ?, ?, ?, ?, ?, '184-12-30', 'ACTIVE');`,
            [generatedId, lenderName, numAmount, interestRate, outstanding, effectiveDate]
          );

          const txnId = `TXN-LOAN-${Date.now().toString().slice(-4)}`;
          db.execute(
            `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
             VALUES (?, ?, ?, 'Financing/Loan', ?, 0, ?, ?, 'Confirmed');`,
            [txnId, effectiveDate, lenderName, numAmount, newCash, `Vay vốn kinh doanh từ ${lenderName}`]
          );

          db.execute(
            `INSERT INTO account_journal (game_date, debit_account, credit_account, amount, description, ref_txn)
             VALUES (?, '101_CASH', '311_SHORT_TERM_LOANS', ?, ?, ?);`,
            [effectiveDate, numAmount, `Vay vốn lưu động ${lenderName}`, txnId]
          );

          return {
            loanId: generatedId,
            action: 'BORROW',
            principal: numAmount,
            outstandingBalance: outstanding,
            newLiquidCash: newCash,
            message: `Vay thành công ${numAmount} Qian từ ${lenderName} (Lãi suất 5%, hoàn trả ${outstanding} Qian).`
          };
        } else if (loanAction === 'REPAY') {
          if (!loanId) throw new Error('loanId is required to repay a specific debt.');
          const targetLoan = db.queryOne<any>('SELECT * FROM financial_loans WHERE loan_id = ? AND status = "ACTIVE"', [loanId]);
          if (!targetLoan) throw new Error(`Active loan ${loanId} not found.`);

          const payAmount = Math.min(numAmount, targetLoan.outstanding_balance);
          if (player.liquid_cash < payAmount) {
            throw new Error(`Insufficient funds: require ${payAmount} Qian, available ${player.liquid_cash} Qian.`);
          }

          const newCash = player.liquid_cash - payAmount;
          const remainingDebt = targetLoan.outstanding_balance - payAmount;
          const newStatus = remainingDebt <= 0 ? 'REPAID' : 'ACTIVE';

          db.execute('UPDATE player_state SET liquid_cash = ? WHERE player_id = ?', [newCash, 'PLY-0001']);
          db.execute('UPDATE financial_loans SET outstanding_balance = ?, status = ? WHERE loan_id = ?', [remainingDebt, newStatus, loanId]);

          const txnId = `TXN-REPAY-${Date.now().toString().slice(-4)}`;
          db.execute(
            `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
             VALUES (?, ?, ?, 'Financing/Repayment', 0, ?, ?, ?, 'Confirmed');`,
            [txnId, effectiveDate, targetLoan.lender_name, payAmount, newCash, `Trả nợ khoản vay ${loanId}`]
          );

          db.execute(
            `INSERT INTO account_journal (game_date, debit_account, credit_account, amount, description, ref_txn)
             VALUES (?, '311_SHORT_TERM_LOANS', '101_CASH', ?, ?, ?);`,
            [effectiveDate, payAmount, `Hoàn trả nợ vay ${loanId}`, txnId]
          );

          return {
            loanId,
            action: 'REPAY',
            paidAmount: payAmount,
            remainingDebt,
            newStatus,
            newLiquidCash: newCash,
            message: `Hoàn trả ${payAmount} Qian cho ${targetLoan.lender_name}. Nợ còn lại: ${remainingDebt} Qian.`
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
}
