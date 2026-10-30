/**
 * ThreeKingdoms-AgentEngine: Simulation Core Engine (engine/sim-core.js)
 * Implements authoritative validation, condition checking, rule execution,
 * and atomic SQLite transactions with idempotency protection.
 */

const fs = require('fs');
const path = require('path');
const { getMarketItem, resolveMarketPrice } = require('./market-price-book');
const { quoteFromReference } = require('./market-quote');
const { worldPriceMultiplier } = require('./world-price');
const { getLocalMultiplier } = require('./settlement-market-bridge');
const { BILL_OF_MATERIALS, calculateDefectRate } = require('./rules');
const { renderProgressMarkdown } = require('./projector');

const ROOT_DIR = path.resolve(__dirname, '..');
const GAME_DIR = path.join(ROOT_DIR, 'game');
const DEFAULT_DB_PATH = path.join(ROOT_DIR, 'saves', 'session.db');

const { runSqlJson, runSqlBatch, escapeSql } = require('./db-adapter');
const { normalizeAction } = require('./action-validation');
const { canSpendActionTime, applyActionTime, getClock } = require('./time-manager');
const { startTask, cancelTask } = require('./task-manager');

/** Action types that append to cashflow_ledger and must stay chronologically ordered. */
const LEDGER_ACTIONS = new Set(['TRADE_BUY', 'TRADE_SELL', 'PAY_WAGES', 'RECORD_BOUNTY', 'REWARD_NPC']);

class SimulationCore {
  constructor(dbPath = DEFAULT_DB_PATH, progressPath = null) {
    this.dbPath = dbPath;
    this.progressPath = progressPath || (dbPath === DEFAULT_DB_PATH ? path.join(GAME_DIR, 'PROGRESS.md') : null);
  }

  _project() {
    if (this.progressPath) {
      renderProgressMarkdown(this.dbPath, this.progressPath);
    }
  }

  _getNextTxnId(gameDate) {
    const dateCompact = gameDate.replace(/-/g, '');
    const countRes = runSqlJson(this.dbPath, `SELECT COUNT(*) as c FROM cashflow_ledger;`)[0];
    const seq = String((countRes ? countRes.c : 0) + 1).padStart(4, '0');
    return `TXN-${dateCompact}-${seq}`;
  }

  _getLastBalance(defaultLiquid = 0) {
    const lastTxn = runSqlJson(this.dbPath, `SELECT balance FROM cashflow_ledger ORDER BY game_date DESC, rowid DESC LIMIT 1;`)[0];
    return lastTxn ? Number(lastTxn.balance) : defaultLiquid;
  }

  /**
   * Deterministic identifier from the row count of an internal table.
   * Wall-clock identifiers (Date.now) collided inside a single millisecond and
   * made replays non-reproducible; the table name is an internal constant.
   */
  _nextSequenceId(prefix, table, gameDate) {
    const dateCompact = String(gameDate || '184-05-02').replace(/-/g, '');
    const row = runSqlJson(this.dbPath, `SELECT COUNT(*) as c FROM ${table};`)[0];
    const seq = String(Number(row ? row.c : 0) + 1).padStart(6, '0');
    return `${prefix}-${dateCompact}-${seq}`;
  }

  _dateOrdinal(value) {
    const [year, month, day] = String(value || '').split('-').map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    return year * 360 + (month - 1) * 30 + (day - 1);
  }

  /**
   * Ledger rows are replayed chronologically by sim-audit, so writing a
   * back-dated financial entry corrupts every later balance in the chain.
   */
  _rejectBackdated(action) {
    if (!LEDGER_ACTIONS.has(action.type)) return null;
    const last = runSqlJson(this.dbPath, `SELECT MAX(game_date) as d FROM cashflow_ledger;`)[0];
    if (!last || !last.d) return null;
    const actionOrdinal = this._dateOrdinal(action.game_date);
    const lastOrdinal = this._dateOrdinal(last.d);
    if (actionOrdinal === null || lastOrdinal === null) return null;
    if (actionOrdinal < lastOrdinal) {
      return {
        success: false,
        code: 'INVALID_PARAMS',
        error: `game_date ${action.game_date} precedes the latest ledger entry (${last.d}).`
      };
    }
    return null;
  }

  // 1. Idempotency Check
  checkIdempotency(idempotencyKey) {
    if (!idempotencyKey) return null;
    const rows = runSqlJson(this.dbPath, `SELECT * FROM action_log WHERE idempotency_key = ? LIMIT 1;`, [idempotencyKey]);
    if (rows && rows.length > 0 && rows[0].status === 'SUCCESS') {
      return JSON.parse(rows[0].result);
    }
    return null;
  }

  // 2. Action Proposal Dispatcher
  executeAction(action) {
    if (!action || !action.type) {
      return { success: false, code: 'INVALID_SCHEMA', error: 'Action must specify an action type.' };
    }

    // Validate and normalize before any value can reach a composed SQL script.
    try {
      action = normalizeAction(action);
    } catch (err) {
      return { success: false, code: err.code || 'INVALID_PARAMS', error: err.message };
    }

    // Check for duplicate execution
    if (action.idempotency_key) {
      const cached = this.checkIdempotency(action.idempotency_key);
      if (cached) {
        return { success: true, idempotent: true, data: cached };
      }
    }

    // The campaign clock is authoritative. Client payload dates are often
    // stale (legacy modals still send 184-05-02), so normalize before any
    // ledger/action_log write.
    const clock = getClock(this.dbPath);
    if (clock.currentDate) {
      action = { ...action, game_date: clock.currentDate };
    }

    // Ledger writes must not be back-dated (chronological replay invariant).
    const backdated = this._rejectBackdated(action);
    if (backdated) return backdated;

    // Time is a precondition, not a side effect: a player at day 30 or 100
    // fatigue must close the month / rest before another day-consuming action.
    const timeCheck = canSpendActionTime(this.dbPath, action.type, action.sub_type);
    if (!timeCheck.allowed) {
      return { success: false, code: timeCheck.code, error: timeCheck.error };
    }

    let result;
    switch (action.type) {
      case 'TRADE_BUY':
        result = this._executeTradeBuy(action);
        break;
      case 'TRADE_SELL':
        result = this._executeTradeSell(action);
        break;
      case 'PRODUCTION_BATCH':
        result = this._executeProduction(action);
        break;
      case 'PAY_WAGES':
        result = this._executePayWages(action);
        break;
      case 'RECORD_BOUNTY':
        result = this._executeRecordBounty(action);
        break;
      case 'REWARD_NPC':
        result = this._executeRewardNpc(action);
        break;
      case 'MOVE_LOCATION':
        result = this._executeMoveLocation(action);
        break;
      case 'PERSONAL_GROWTH':
        result = this._executePersonalGrowth(action);
        break;
      case 'START_TASK':
        result = this._executeStartTask(action);
        break;
      case 'CANCEL_TASK':
        result = this._executeCancelTask(action);
        break;
      default:
        result = { success: false, code: 'UNKNOWN_ACTION', error: `Unknown action type: ${action.type}` };
    }

    if (result && result.success && !result.idempotent) {
      result.time = applyActionTime(this.dbPath, action.type, action.sub_type, action.memo || action.type);
    }
    return result;
  }

  _executeStartTask(action) {
    const clock = getClock(this.dbPath);
    const task = startTask(this.dbPath, {
      taskType: action.task_type || action.taskType || 'GENERIC_TASK',
      titleVi: action.title || action.titleVi || 'Công việc dài ngày',
      titleEn: action.titleEn || '',
      durationDays: action.duration_days || action.durationDays || 1,
      gameDate: clock.currentDate,
      payload: action.payload || {}
    });
    if (!task.success) return task;
    return { success: true, data: task };
  }

  _executeCancelTask(action) {
    const taskId = action.task_id || action.taskId;
    if (!taskId) {
      return { success: false, code: 'INVALID_PARAMS', error: 'task_id is required.' };
    }
    return cancelTask(this.dbPath, taskId);
  }

  // TRADE_BUY: Buy goods with cash
  _executeTradeBuy(action) {
    const { item_code, quantity, counterparty, game_date, idempotency_key } = action;

    if (!item_code || quantity <= 0) {
      return { success: false, code: 'INVALID_PARAMS', error: 'Invalid item_code or quantity.' };
    }

    // master_items is the only price source; a client-supplied price is ignored.
    const marketItem = getMarketItem(this.dbPath, item_code);
    if (!marketItem || marketItem.price <= 0) {
      return { success: false, code: 'ITEM_NOT_FOUND', error: `Item ${item_code} is not in the market catalog.` };
    }
    const fameRow = runSqlJson(this.dbPath, `SELECT fame, current_location FROM player_state LIMIT 1;`)[0];
    const worldMultiplier = worldPriceMultiplier(this.dbPath, item_code, game_date);
    const localMultiplier = getLocalMultiplier(this.dbPath, fameRow?.current_location || 'LOC-0001', item_code);
    const quote = quoteFromReference(marketItem.price, Number(fameRow?.fame || 0), item_code, worldMultiplier, localMultiplier);
    const unit_price = quote.buyPrice;
    const totalCost = Math.round(quantity * unit_price);

    // Condition check: cash availability
    const playerRows = runSqlJson(this.dbPath, `SELECT liquid_cash, safe_cash FROM player_state LIMIT 1;`);
    if (!playerRows || playerRows.length === 0) {
      return { success: false, code: 'NO_PLAYER', error: 'player_state not found.' };
    }

    const currentLiquid = Number(playerRows[0].liquid_cash);
    if (currentLiquid < totalCost) {
      return {
        success: false,
        code: 'INSUFFICIENT_FUNDS',
        error: `Insufficient liquid cash. Required: ${totalCost} quan, Available: ${currentLiquid} quan.`
      };
    }

    // Prepare transaction IDs
    const txnId = this._getNextTxnId(game_date);
    const movId = this._nextSequenceId('MOV', 'stock_movements', game_date);
    const actionId = this._nextSequenceId('ACT', 'action_log', game_date);

    // Get current inventory and cashflow balance
    const prevBal = this._getLastBalance(currentLiquid);
    const newBal = prevBal - totalCost;

    const itemRow = runSqlJson(this.dbPath, `SELECT quantity, unit_cost_basis FROM inventory_items WHERE item_code = '${item_code}' LIMIT 1;`)[0];
    const prevQty = itemRow ? Number(itemRow.quantity) : 0;
    const prevCost = itemRow ? Number(itemRow.unit_cost_basis) : unit_price;
    const newQty = prevQty + quantity;
    // Weighted average cost basis
    const newUnitCost = Math.round(((prevQty * prevCost) + (quantity * unit_price)) / newQty);

    const desc = marketItem.nameVi;
    const category = marketItem.category;

    // SQL Statements
    const sql = `
      -- 1. Deduct cash from player_state
      UPDATE player_state SET liquid_cash = liquid_cash - ${totalCost};

      -- 2. Insert cashflow ledger record
      INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
      VALUES ('${txnId}', '${game_date}', '${counterparty}', 'Procurement', 0, ${totalCost}, ${newBal}, 'Purchased ${quantity} of ${item_code} @ ${unit_price} quan', 'Confirmed');

      -- 3. Insert double-entry journal (Dr Inventory, Cr Cash)
      INSERT INTO account_journal (txn_id, game_date, account_code, debit, credit, memo)
      VALUES
        ('${txnId}', '${game_date}', '1201_INVENTORY', ${totalCost}, 0, 'Procurement of ${item_code}'),
        ('${txnId}', '${game_date}', '1001_CASH_MOBILE', 0, ${totalCost}, 'Cash payment for ${item_code}');

      -- 4. Update or insert inventory item
      INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
      VALUES ('${item_code}', '${category}', '${desc}', ${newQty}, ${newUnitCost}, 'Warehouse / Expedition')
      ON CONFLICT(item_code) DO UPDATE SET
        quantity = ${newQty},
        unit_cost_basis = ${newUnitCost};

      -- 5. Insert stock movement
      INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
      VALUES ('${movId}', '${game_date}', '${item_code}', 'Procurement', ${quantity}, ${unit_price}, ${newQty}, '${txnId}');

      -- 6. Record action log
      INSERT INTO action_log (action_id, idempotency_key, turn_number, game_date, action_type, payload, result, status)
      VALUES ('${actionId}', ${idempotency_key ? `'${idempotency_key}'` : 'NULL'}, (SELECT active_turn FROM campaign_meta LIMIT 1), '${game_date}', 'TRADE_BUY', '${JSON.stringify(action).replace(/'/g, "''")}', '{"txnId":"${txnId}","movId":"${movId}","totalCost":${totalCost},"newCashBalance":${newBal},"itemCode":"${item_code}","newQuantity":${newQty},"unitCostBasis":${newUnitCost}}', 'SUCCESS');
    `;

    const batchRes = runSqlBatch(this.dbPath, sql);
    if (!batchRes.success) {
      return { success: false, code: 'TRANSACTION_FAILED', error: batchRes.error };
    }

    this._project();

    return {
      success: true,
      data: {
        txnId,
        movId,
        totalCost,
        newCashBalance: newBal,
        itemCode: item_code,
        newQuantity: newQty,
        unitCostBasis: newUnitCost
      }
    };
  }

  // TRADE_SELL: Sell goods for cash
  _executeTradeSell(action) {
    const { item_code, quantity, counterparty, game_date, idempotency_key } = action;

    if (!item_code || quantity <= 0) {
      return { success: false, code: 'INVALID_PARAMS', error: 'Invalid item_code or quantity.' };
    }

    // master_items is the only price source; a client-supplied price is ignored.
    const marketItem = getMarketItem(this.dbPath, item_code);
    if (!marketItem || marketItem.price <= 0) {
      return { success: false, code: 'ITEM_NOT_FOUND', error: `Item ${item_code} is not in the market catalog.` };
    }
    const fameRow = runSqlJson(this.dbPath, `SELECT fame, current_location FROM player_state LIMIT 1;`)[0];
    const worldMultiplier = worldPriceMultiplier(this.dbPath, item_code, game_date);
    const localMultiplier = getLocalMultiplier(this.dbPath, fameRow?.current_location || 'LOC-0001', item_code);
    const quote = quoteFromReference(marketItem.price, Number(fameRow?.fame || 0), item_code, worldMultiplier, localMultiplier);
    const unit_price = quote.sellPrice;

    // Condition check: inventory availability
    const itemRow = runSqlJson(this.dbPath, `SELECT quantity, unit_cost_basis FROM inventory_items WHERE item_code = '${item_code}' LIMIT 1;`)[0];
    if (!itemRow) {
      return { success: false, code: 'ITEM_NOT_FOUND', error: `Item ${item_code} not found in inventory.` };
    }

    const currentQty = Number(itemRow.quantity);
    if (currentQty < quantity) {
      return {
        success: false,
        code: 'INSUFFICIENT_STOCK',
        error: `Insufficient stock for ${item_code}. Required: ${quantity}, In Stock: ${currentQty}.`
      };
    }

    const totalRevenue = Math.round(quantity * unit_price);
    const costBasis = Number(itemRow.unit_cost_basis);
    const totalCOGS = Math.round(quantity * costBasis);
    const netProfit = totalRevenue - totalCOGS;

    const txnId = this._getNextTxnId(game_date);
    const movId = this._nextSequenceId('MOV', 'stock_movements', game_date);
    const actionId = this._nextSequenceId('ACT', 'action_log', game_date);

    const playerRows = runSqlJson(this.dbPath, `SELECT liquid_cash FROM player_state LIMIT 1;`)[0];
    const prevBal = this._getLastBalance(Number(playerRows.liquid_cash));
    const newBal = prevBal + totalRevenue;
    const newQty = currentQty - quantity;

    const sql = `
      -- 1. Add cash to player_state
      UPDATE player_state SET liquid_cash = liquid_cash + ${totalRevenue};

      -- 2. Insert cashflow ledger record
      INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
      VALUES ('${txnId}', '${game_date}', '${counterparty}', 'Commercial Revenue', ${totalRevenue}, 0, ${newBal}, 'Sold ${quantity} of ${item_code} @ ${unit_price} quan', 'Confirmed');

      -- 3. Insert double-entry journal (Dr Cash, Cr Sales Revenue)
      INSERT INTO account_journal (txn_id, game_date, account_code, debit, credit, memo)
      VALUES
        ('${txnId}', '${game_date}', '1001_CASH_MOBILE', ${totalRevenue}, 0, 'Revenue from sale of ${item_code}'),
        ('${txnId}', '${game_date}', '4001_SALES_REVENUE', 0, ${totalRevenue}, 'Revenue from sale of ${item_code}');

      -- 4. Update inventory quantity
      UPDATE inventory_items SET quantity = ${newQty} WHERE item_code = '${item_code}';

      -- 5. Insert stock movement
      INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
      VALUES ('${movId}', '${game_date}', '${item_code}', 'Wholesale Sale', -${quantity}, ${unit_price}, ${newQty}, '${txnId}');

      -- 6. Record action log
      INSERT INTO action_log (action_id, idempotency_key, turn_number, game_date, action_type, payload, result, status)
      VALUES ('${actionId}', ${idempotency_key ? `'${idempotency_key}'` : 'NULL'}, (SELECT active_turn FROM campaign_meta LIMIT 1), '${game_date}', 'TRADE_SELL', '${JSON.stringify(action).replace(/'/g, "''")}', '{"txnId":"${txnId}","movId":"${movId}","totalRevenue":${totalRevenue},"newCashBalance":${newBal},"itemCode":"${item_code}","newQuantity":${newQty},"netProfit":${netProfit}}', 'SUCCESS');
    `;

    const batchRes = runSqlBatch(this.dbPath, sql);
    if (!batchRes.success) {
      return { success: false, code: 'TRANSACTION_FAILED', error: batchRes.error };
    }

    this._project();

    return {
      success: true,
      data: {
        txnId,
        movId,
        totalRevenue,
        newCashBalance: newBal,
        itemCode: item_code,
        newQuantity: newQty,
        netProfit
      }
    };
  }

  // PRODUCTION_BATCH: Manufacture goods from BOM materials
  _executeProduction(action) {
    const product_code = action.product_code || action.recipe;
    const { batch_size, craftsmanship = 60, fatigue = 0, game_date, idempotency_key } = action;

    const bom = BILL_OF_MATERIALS[product_code];
    if (!bom) {
      return { success: false, code: 'INVALID_BOM', error: `No Bill of Materials defined for ${product_code}.` };
    }

    // Condition check: check all required materials
    const requiredMaterials = {};
    for (const [matCode, perUnit] of Object.entries(bom.materials)) {
      requiredMaterials[matCode] = perUnit * batch_size;
    }

    for (const [matCode, reqQty] of Object.entries(requiredMaterials)) {
      const row = runSqlJson(this.dbPath, `SELECT quantity FROM inventory_items WHERE item_code = '${matCode}' LIMIT 1;`)[0];
      const available = row ? Number(row.quantity) : 0;
      if (available < reqQty) {
        return {
          success: false,
          code: 'INSUFFICIENT_MATERIALS',
          error: `Insufficient ${matCode}. Required: ${reqQty}, Available: ${available}.`
        };
      }
    }

    // Calculate defect rate and output units
    const defectRate = calculateDefectRate(bom.baseDefectRate, craftsmanship, fatigue);
    const usableUnits = Math.floor(batch_size * (1 - defectRate));
    const defectUnits = batch_size - usableUnits;

    const actionId = this._nextSequenceId('ACT', 'action_log', game_date);
    const basePrice = resolveMarketPrice(this.dbPath, product_code);
    if (basePrice === null) {
      return { success: false, code: 'MARKET_PRICE_MISSING', error: `No market price for ${product_code}.` };
    }

    let sql = '';

    // Deduct materials
    for (const [matCode, reqQty] of Object.entries(requiredMaterials)) {
      const curRow = runSqlJson(this.dbPath, `SELECT quantity, unit_cost_basis FROM inventory_items WHERE item_code = '${matCode}';`)[0];
      const newMatQty = Number(curRow.quantity) - reqQty;
      const movId = `${this._nextSequenceId('MOV', 'stock_movements', game_date)}-${matCode}`;
      sql += `
        UPDATE inventory_items SET quantity = ${newMatQty} WHERE item_code = '${matCode}';
        INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
        VALUES ('${movId}', '${game_date}', '${matCode}', 'Production Consumption', -${reqQty}, ${curRow.unit_cost_basis}, ${newMatQty}, '${actionId}');
      `;
    }

    // Add finished goods
    const prodRow = runSqlJson(this.dbPath, `SELECT quantity FROM inventory_items WHERE item_code = '${product_code}';`)[0];
    const prevProdQty = prodRow ? Number(prodRow.quantity) : 0;
    const newProdQty = prevProdQty + usableUnits;
    const movProdId = `${this._nextSequenceId('MOV', 'stock_movements', game_date)}-OUT`;

    sql += `
      INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
      VALUES ('${product_code}', 'Finished Good', '${product_code}', ${newProdQty}, ${basePrice}, 'Warehouse')
      ON CONFLICT(item_code) DO UPDATE SET quantity = ${newProdQty};

      INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
      VALUES ('${movProdId}', '${game_date}', '${product_code}', 'Finished Output', ${usableUnits}, ${basePrice}, ${newProdQty}, '${actionId}');

      INSERT INTO action_log (action_id, idempotency_key, turn_number, game_date, action_type, payload, result, status)
      VALUES ('${actionId}', ${idempotency_key ? `'${idempotency_key}'` : 'NULL'}, (SELECT active_turn FROM campaign_meta LIMIT 1), '${game_date}', 'PRODUCTION_BATCH', '${JSON.stringify(action).replace(/'/g, "''")}', '{"productCode":"${product_code}","batchSize":${batch_size},"usableUnits":${usableUnits},"defectUnits":${defectUnits},"defectRate":"${(defectRate * 100).toFixed(1)}%","newTotalStock":${newProdQty}}', 'SUCCESS');
    `;

    const batchRes = runSqlBatch(this.dbPath, sql);
    if (!batchRes.success) {
      return { success: false, code: 'PRODUCTION_FAILED', error: batchRes.error };
    }

    this._project();

    return {
      success: true,
      data: {
        productCode: product_code,
        batchSize: batch_size,
        usableUnits,
        defectUnits,
        defectRate: (defectRate * 100).toFixed(1) + '%',
        newTotalStock: newProdQty
      }
    };
  }

  // PAY_WAGES: Pay workshop or retainer payroll
  _executePayWages(action) {
    const { amount, recipient, memo, game_date, idempotency_key } = action;

    if (amount <= 0) {
      return { success: false, code: 'INVALID_AMOUNT', error: 'Payroll amount must be positive.' };
    }

    const playerRows = runSqlJson(this.dbPath, `SELECT liquid_cash FROM player_state LIMIT 1;`)[0];
    const currentLiquid = Number(playerRows.liquid_cash);
    if (currentLiquid < amount) {
      return { success: false, code: 'INSUFFICIENT_FUNDS', error: `Insufficient cash for payroll. Required: ${amount}, Available: ${currentLiquid}` };
    }

    const txnId = this._getNextTxnId(game_date);
    const actionId = this._nextSequenceId('ACT', 'action_log', game_date);
    const newBal = this._getLastBalance(currentLiquid) - amount;

    const sql = `
      UPDATE player_state SET liquid_cash = liquid_cash - ${amount};

      INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
      VALUES ('${txnId}', '${game_date}', '${recipient}', 'Operating Expense', 0, ${amount}, ${newBal}, '${memo}', 'Confirmed');

      INSERT INTO account_journal (txn_id, game_date, account_code, debit, credit, memo)
      VALUES
        ('${txnId}', '${game_date}', '6001_OPERATING_EXPENSE', ${amount}, 0, 'Payroll: ${recipient}'),
        ('${txnId}', '${game_date}', '1001_CASH_MOBILE', 0, ${amount}, 'Payroll disbursement');

      INSERT INTO action_log (action_id, idempotency_key, turn_number, game_date, action_type, payload, result, status)
      VALUES ('${actionId}', ${idempotency_key ? `'${idempotency_key}'` : 'NULL'}, (SELECT active_turn FROM campaign_meta LIMIT 1), '${game_date}', 'PAY_WAGES', '${JSON.stringify(action).replace(/'/g, "''")}', '{"txnId":"${txnId}","disbursedAmount":${amount},"newCashBalance":${newBal}}', 'SUCCESS');
    `;

    const batchRes = runSqlBatch(this.dbPath, sql);
    if (!batchRes.success) {
      return { success: false, code: 'PAYROLL_FAILED', error: batchRes.error };
    }

    this._project();

    return {
      success: true,
      data: {
        txnId,
        disbursedAmount: amount,
        newCashBalance: newBal
      }
    };
  }

  // RECORD_BOUNTY: Military bounty or gift
  _executeRecordBounty(action) {
    const { amount, source, memo, game_date, idempotency_key } = action;

    if (amount <= 0) {
      return { success: false, code: 'INVALID_AMOUNT', error: 'Bounty amount must be positive.' };
    }

    const playerRows = runSqlJson(this.dbPath, `SELECT liquid_cash FROM player_state LIMIT 1;`)[0];
    const txnId = this._getNextTxnId(game_date);
    const actionId = this._nextSequenceId('ACT', 'action_log', game_date);
    const newBal = this._getLastBalance(Number(playerRows.liquid_cash)) + amount;

    const sql = `
      UPDATE player_state SET liquid_cash = liquid_cash + ${amount};

      INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
      VALUES ('${txnId}', '${game_date}', '${source}', 'Imperial Bounty', ${amount}, 0, ${newBal}, '${memo}', 'Confirmed');

      INSERT INTO account_journal (txn_id, game_date, account_code, debit, credit, memo)
      VALUES
        ('${txnId}', '${game_date}', '1001_CASH_MOBILE', ${amount}, 0, 'Bounty received from ${source}'),
        ('${txnId}', '${game_date}', '7001_BOUNTY_INCOME', 0, ${amount}, 'Bounty: ${memo}');

      INSERT INTO action_log (action_id, idempotency_key, turn_number, game_date, action_type, payload, result, status)
      VALUES ('${actionId}', ${idempotency_key ? `'${idempotency_key}'` : 'NULL'}, (SELECT active_turn FROM campaign_meta LIMIT 1), '${game_date}', 'RECORD_BOUNTY', '${JSON.stringify(action).replace(/'/g, "''")}', '{"txnId":"${txnId}","bountyAmount":${amount},"newCashBalance":${newBal}}', 'SUCCESS');
    `;

    const batchRes = runSqlBatch(this.dbPath, sql);
    if (!batchRes.success) {
      return { success: false, code: 'BOUNTY_FAILED', error: batchRes.error };
    }

    this._project();

    return {
      success: true,
      data: {
        txnId,
        bountyAmount: amount,
        newCashBalance: newBal
      }
    };
  }

  // REWARD_NPC: Reward a retainer or artisan with cash, boosting loyalty and morale
  _executeRewardNpc(action) {
    const { npc_id, amount = 100, game_date = '184-05-02', idempotency_key } = action;

    if (!npc_id || amount <= 0) {
      return { success: false, code: 'INVALID_PARAMS', error: 'Invalid npc_id or amount.' };
    }

    const playerRows = runSqlJson(this.dbPath, `SELECT liquid_cash FROM player_state LIMIT 1;`)[0];
    if (!playerRows || Number(playerRows.liquid_cash) < amount) {
      return { success: false, code: 'INSUFFICIENT_FUNDS', error: `Insufficient cash to reward NPC.` };
    }

    const npcRows = runSqlJson(this.dbPath, `SELECT name, morale, loyalty FROM npc_state WHERE npc_id = '${npc_id}' LIMIT 1;`);
    if (!npcRows || npcRows.length === 0) {
      return { success: false, code: 'NPC_NOT_FOUND', error: `NPC ${npc_id} not found.` };
    }
    const npc = npcRows[0];

    const txnId = this._getNextTxnId(game_date);
    const actionId = this._nextSequenceId('ACT', 'action_log', game_date);
    const newBal = this._getLastBalance(Number(playerRows.liquid_cash)) - amount;

    const newMorale = Math.min(100, Number(npc.morale) + 10);
    const newLoyalty = Math.min(100, Number(npc.loyalty) + 5);

    const sql = `
      UPDATE player_state SET liquid_cash = liquid_cash - ${amount};

      UPDATE npc_state SET
        morale = ${newMorale},
        loyalty = ${newLoyalty}
      WHERE npc_id = '${npc_id}';

      INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
      VALUES ('${txnId}', '${game_date}', '${npc.name.replace(/'/g, "''")}', 'Retainer Reward', 0, ${amount}, ${newBal}, 'Rewarded ${amount} quan bonus to ${npc.name}', 'Confirmed');

      INSERT INTO account_journal (txn_id, game_date, account_code, debit, credit, memo)
      VALUES
        ('${txnId}', '${game_date}', '6001_OPERATING_EXPENSE', ${amount}, 0, 'Bonus reward to ${npc.name}'),
        ('${txnId}', '${game_date}', '1001_CASH_MOBILE', 0, ${amount}, 'Cash bonus disbursed');

      INSERT INTO action_log (action_id, idempotency_key, turn_number, game_date, action_type, payload, result, status)
      VALUES ('${actionId}', ${idempotency_key ? `'${idempotency_key}'` : 'NULL'}, (SELECT active_turn FROM campaign_meta LIMIT 1), '${game_date}', 'REWARD_NPC', '${JSON.stringify(action).replace(/'/g, "''")}', '{"npcId":"${npc_id}","name":"${escapeSql(npc.name || '')}","rewardAmount":${amount},"newMorale":${newMorale},"newLoyalty":${newLoyalty},"newCashBalance":${newBal}}', 'SUCCESS');
    `;

    const batchRes = runSqlBatch(this.dbPath, sql);
    if (!batchRes.success) {
      return { success: false, code: 'REWARD_FAILED', error: batchRes.error };
    }

    this._project();

    return {
      success: true,
      data: {
        npcId: npc_id,
        name: npc.name,
        rewardAmount: amount,
        newMorale,
        newLoyalty,
        newCashBalance: newBal
      }
    };
  }

  // MOVE_LOCATION: Advance to a new destination or camp
  _executeMoveLocation(action) {
    const { new_location, game_date = '184-05-02', idempotency_key } = action;

    if (!new_location) {
      return { success: false, code: 'INVALID_PARAMS', error: 'new_location is required.' };
    }

    const actionId = this._nextSequenceId('ACT', 'action_log', game_date);
    const sql = `
      UPDATE player_state SET current_location = '${new_location.replace(/'/g, "''")}';
      INSERT INTO action_log (action_id, idempotency_key, turn_number, game_date, action_type, payload, result, status)
      VALUES ('${actionId}', ${idempotency_key ? `'${idempotency_key}'` : 'NULL'}, (SELECT active_turn FROM campaign_meta LIMIT 1), '${game_date}', 'MOVE_LOCATION', '${JSON.stringify(action).replace(/'/g, "''")}', '{"newLocation":"${new_location}"}', 'SUCCESS');
    `;

    const batchRes = runSqlBatch(this.dbPath, sql);
    if (!batchRes.success) {
      return { success: false, code: 'MOVE_FAILED', error: batchRes.error };
    }

    this._project();

    return {
      success: true,
      data: {
        newLocation: new_location
      }
    };
  }

  // PERSONAL_GROWTH: Self-cultivation, training martial skills, studying tactics, or resting
  _executePersonalGrowth(action) {
    const { sub_type = 'TRAIN_MARTIAL', exp_skill, exp_amount = 10, fatigue_delta = 10, morale_delta = 5, memo = '', game_date = '184-05-02', idempotency_key } = action;

    const playerRows = runSqlJson(this.dbPath, `SELECT * FROM player_state LIMIT 1;`);
    if (!playerRows || playerRows.length === 0) {
      return { success: false, code: 'NO_PLAYER', error: 'player_state not found.' };
    }
    const player = playerRows[0];
    const currentFatigue = Number(player.fatigue || 0);
    const currentMorale = Number(player.morale || 100);

    let newFatigue = currentFatigue;
    let newMorale = currentMorale;

    if (sub_type === 'REST_RECOVERY') {
      newFatigue = Math.max(0, currentFatigue - Math.abs(fatigue_delta || 30));
      newMorale = Math.min(100, currentMorale + Math.abs(morale_delta || 15));
    } else {
      newFatigue = Math.min(100, currentFatigue + Math.abs(fatigue_delta || 10));
      newMorale = Math.min(100, currentMorale + (morale_delta || 5));
    }

    const actionId = this._nextSequenceId('ACT', 'action_log', game_date);
    let skillUpdateSql = '';

    if (exp_skill) {
      const skillRow = runSqlJson(this.dbPath, `SELECT * FROM player_skills WHERE skill_code = '${exp_skill}' LIMIT 1;`)[0];
      if (skillRow) {
        let newExp = Number(skillRow.current_exp) + Number(exp_amount);
        let newTier = Number(skillRow.tier);
        let maxExp = Number(skillRow.max_exp);
        if (newExp >= maxExp && newTier < 5) {
          newTier += 1;
          newExp = newExp - maxExp;
          maxExp = Math.round(maxExp * 1.5);
        }
        skillUpdateSql = `UPDATE player_skills SET current_exp = ${newExp}, tier = ${newTier}, max_exp = ${maxExp} WHERE skill_code = '${exp_skill}';`;
      }
    }

    const sql = `
      UPDATE player_state SET fatigue = ${newFatigue}, morale = ${newMorale};
      ${skillUpdateSql}
      INSERT INTO action_log (action_id, idempotency_key, turn_number, game_date, action_type, payload, result, status)
      VALUES ('${actionId}', ${idempotency_key ? `'${idempotency_key}'` : 'NULL'}, (SELECT active_turn FROM campaign_meta LIMIT 1), '${game_date}', 'PERSONAL_GROWTH', '${JSON.stringify(action).replace(/'/g, "''")}', '{"subType":"${sub_type}","fatigue":${newFatigue},"morale":${newMorale},"skillCode":${exp_skill ? `"${exp_skill}"` : 'null'},"expGained":${exp_amount || 0},"memo":"${memo || 'Tu thân dưỡng tính hoàn tất'}"}', 'SUCCESS');
    `;

    const batchRes = runSqlBatch(this.dbPath, sql);
    if (!batchRes.success) {
      return { success: false, code: 'GROWTH_FAILED', error: batchRes.error };
    }

    this._project();

    return {
      success: true,
      data: {
        subType: sub_type,
        fatigue: newFatigue,
        morale: newMorale,
        skillCode: exp_skill,
        expGained: exp_amount || 0,
        memo: memo || 'Tu thân dưỡng tính hoàn tất'
      }
    };
  }
}

module.exports = {
  SimulationCore
};
