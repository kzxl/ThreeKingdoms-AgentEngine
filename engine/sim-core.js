/**
 * ThreeKingdoms-AgentEngine: Simulation Core Engine (engine/sim-core.js)
 * Implements authoritative validation, condition checking, rule execution,
 * and atomic SQLite transactions with idempotency protection.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { COMMODITY_PRICE_INDEX, BILL_OF_MATERIALS, calculateDefectRate } = require('./rules');
const { renderProgressMarkdown } = require('./projector');

const ROOT_DIR = path.resolve(__dirname, '..');
const GAME_DIR = path.join(ROOT_DIR, 'game');
const DEFAULT_DB_PATH = path.join(ROOT_DIR, 'saves', 'session.db');

function runSqlJson(dbPath, sql) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tempFile = path.join(dir, `core_tmp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}.sql`);
  fs.writeFileSync(tempFile, sql, 'utf8');
  try {
    const stdout = execSync(`sqlite3 -json "${dbPath}" < "${tempFile}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return stdout && stdout.trim() ? JSON.parse(stdout) : [];
  } catch (err) {
    if (err.stdout && err.stdout.trim().startsWith('[')) {
      try { return JSON.parse(err.stdout); } catch (e) {}
    }
    return [];
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
  }
}

function runSqlBatch(dbPath, sqlStatements) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tempFile = path.join(dir, `batch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}.sql`);
  const fullSql = `PRAGMA foreign_keys = ON;\nBEGIN TRANSACTION;\n${sqlStatements}\nCOMMIT;\n`;
  fs.writeFileSync(tempFile, fullSql, 'utf8');
  try {
    execSync(`sqlite3 "${dbPath}" < "${tempFile}"`, { stdio: ['pipe', 'pipe', 'pipe'] });
    return { success: true };
  } catch (err) {
    const errorMsg = err.stderr ? err.stderr.toString() : err.message;
    return { success: false, error: errorMsg };
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
  }
}

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

  // 1. Idempotency Check
  checkIdempotency(idempotencyKey) {
    if (!idempotencyKey) return null;
    const rows = runSqlJson(this.dbPath, `SELECT * FROM action_log WHERE idempotency_key = '${idempotencyKey}' LIMIT 1;`);
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

    // Check for duplicate execution
    if (action.idempotency_key) {
      const cached = this.checkIdempotency(action.idempotency_key);
      if (cached) {
        return { success: true, idempotent: true, data: cached };
      }
    }

    switch (action.type) {
      case 'TRADE_BUY':
        return this._executeTradeBuy(action);
      case 'TRADE_SELL':
        return this._executeTradeSell(action);
      case 'PRODUCTION_BATCH':
        return this._executeProduction(action);
      case 'PAY_WAGES':
        return this._executePayWages(action);
      case 'RECORD_BOUNTY':
        return this._executeRecordBounty(action);
      default:
        return { success: false, code: 'UNKNOWN_ACTION', error: `Unknown action type: ${action.type}` };
    }
  }

  // TRADE_BUY: Buy goods with cash
  _executeTradeBuy(action) {
    const { item_code, quantity, unit_price, counterparty, game_date, idempotency_key } = action;

    if (!item_code || quantity <= 0 || unit_price <= 0) {
      return { success: false, code: 'INVALID_PARAMS', error: 'Invalid item_code, quantity, or unit_price.' };
    }

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
        error: `Insufficient liquid cash. Required: ${totalCost} Qian, Available: ${currentLiquid} Qian.`
      };
    }

    // Prepare transaction IDs
    const txnId = `TXN-${game_date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const movId = `MOV-${game_date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const actionId = `ACT-${Date.now()}`;

    // Get current inventory and cashflow balance
    const lastTxn = runSqlJson(this.dbPath, `SELECT balance FROM cashflow_ledger ORDER BY game_date DESC, txn_id DESC LIMIT 1;`)[0];
    const prevBal = lastTxn ? Number(lastTxn.balance) : currentLiquid;
    const newBal = prevBal - totalCost;

    const itemRow = runSqlJson(this.dbPath, `SELECT quantity, unit_cost_basis FROM inventory_items WHERE item_code = '${item_code}' LIMIT 1;`)[0];
    const prevQty = itemRow ? Number(itemRow.quantity) : 0;
    const prevCost = itemRow ? Number(itemRow.unit_cost_basis) : unit_price;
    const newQty = prevQty + quantity;
    // Weighted average cost basis
    const newUnitCost = Math.round(((prevQty * prevCost) + (quantity * unit_price)) / newQty);

    const desc = COMMODITY_PRICE_INDEX[item_code] ? COMMODITY_PRICE_INDEX[item_code].name : item_code;
    const category = COMMODITY_PRICE_INDEX[item_code] ? 'Procured Commodity' : 'Material';

    // SQL Statements
    const sql = `
      -- 1. Deduct cash from player_state
      UPDATE player_state SET liquid_cash = liquid_cash - ${totalCost};

      -- 2. Insert cashflow ledger record
      INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
      VALUES ('${txnId}', '${game_date}', '${counterparty.replace(/'/g, "''")}', 'Procurement', 0, ${totalCost}, ${newBal}, 'Purchased ${quantity} of ${item_code} @ ${unit_price} Qian', 'Confirmed');

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
      VALUES ('${actionId}', ${idempotency_key ? `'${idempotency_key}'` : 'NULL'}, (SELECT active_turn FROM campaign_meta LIMIT 1), '${game_date}', 'TRADE_BUY', '${JSON.stringify(action).replace(/'/g, "''")}', '{"totalCost": ${totalCost}, "newBalance": ${newBal}, "newQuantity": ${newQty}}', 'SUCCESS');
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
    const { item_code, quantity, unit_price, counterparty, game_date, idempotency_key } = action;

    if (!item_code || quantity <= 0 || unit_price <= 0) {
      return { success: false, code: 'INVALID_PARAMS', error: 'Invalid item_code, quantity, or unit_price.' };
    }

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

    const txnId = `TXN-${game_date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const movId = `MOV-${game_date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const actionId = `ACT-${Date.now()}`;

    const lastTxn = runSqlJson(this.dbPath, `SELECT balance FROM cashflow_ledger ORDER BY game_date DESC, txn_id DESC LIMIT 1;`)[0];
    const playerRows = runSqlJson(this.dbPath, `SELECT liquid_cash FROM player_state LIMIT 1;`)[0];
    const prevBal = lastTxn ? Number(lastTxn.balance) : Number(playerRows.liquid_cash);
    const newBal = prevBal + totalRevenue;
    const newQty = currentQty - quantity;

    const sql = `
      -- 1. Add cash to player_state
      UPDATE player_state SET liquid_cash = liquid_cash + ${totalRevenue};

      -- 2. Insert cashflow ledger record
      INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
      VALUES ('${txnId}', '${game_date}', '${counterparty.replace(/'/g, "''")}', 'Commercial Revenue', ${totalRevenue}, 0, ${newBal}, 'Sold ${quantity} of ${item_code} @ ${unit_price} Qian', 'Confirmed');

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
      VALUES ('${actionId}', ${idempotency_key ? `'${idempotency_key}'` : 'NULL'}, (SELECT active_turn FROM campaign_meta LIMIT 1), '${game_date}', 'TRADE_SELL', '${JSON.stringify(action).replace(/'/g, "''")}', '{"totalRevenue": ${totalRevenue}, "newBalance": ${newBal}, "newQuantity": ${newQty}, "profit": ${netProfit}}', 'SUCCESS');
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
    const { product_code, batch_size, craftsmanship = 60, fatigue = 0, game_date, idempotency_key } = action;

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

    const actionId = `ACT-${Date.now()}`;
    const basePrice = COMMODITY_PRICE_INDEX[product_code] ? COMMODITY_PRICE_INDEX[product_code].basePrice : 30;

    let sql = '';

    // Deduct materials
    for (const [matCode, reqQty] of Object.entries(requiredMaterials)) {
      const curRow = runSqlJson(this.dbPath, `SELECT quantity, unit_cost_basis FROM inventory_items WHERE item_code = '${matCode}';`)[0];
      const newMatQty = Number(curRow.quantity) - reqQty;
      const movId = `MOV-${game_date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}_${matCode.slice(-4)}`;
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
    const movProdId = `MOV-${game_date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}_OUT`;

    sql += `
      INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
      VALUES ('${product_code}', 'Finished Good', '${product_code}', ${newProdQty}, ${basePrice}, 'Warehouse')
      ON CONFLICT(item_code) DO UPDATE SET quantity = ${newProdQty};

      INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
      VALUES ('${movProdId}', '${game_date}', '${product_code}', 'Finished Output', ${usableUnits}, ${basePrice}, ${newProdQty}, '${actionId}');

      INSERT INTO action_log (action_id, idempotency_key, turn_number, game_date, action_type, payload, result, status)
      VALUES ('${actionId}', ${idempotency_key ? `'${idempotency_key}'` : 'NULL'}, (SELECT active_turn FROM campaign_meta LIMIT 1), '${game_date}', 'PRODUCTION_BATCH', '${JSON.stringify(action).replace(/'/g, "''")}', '{"usableUnits": ${usableUnits}, "defectUnits": ${defectUnits}, "defectRate": ${defectRate}}', 'SUCCESS');
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

    const txnId = `TXN-${game_date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const actionId = `ACT-${Date.now()}`;
    const lastTxn = runSqlJson(this.dbPath, `SELECT balance FROM cashflow_ledger ORDER BY game_date DESC, txn_id DESC LIMIT 1;`)[0];
    const newBal = (lastTxn ? Number(lastTxn.balance) : currentLiquid) - amount;

    const sql = `
      UPDATE player_state SET liquid_cash = liquid_cash - ${amount};

      INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
      VALUES ('${txnId}', '${game_date}', '${recipient.replace(/'/g, "''")}', 'Operating Expense', 0, ${amount}, ${newBal}, '${memo.replace(/'/g, "''")}', 'Confirmed');

      INSERT INTO account_journal (txn_id, game_date, account_code, debit, credit, memo)
      VALUES
        ('${txnId}', '${game_date}', '6001_OPERATING_EXPENSE', ${amount}, 0, 'Payroll: ${recipient}'),
        ('${txnId}', '${game_date}', '1001_CASH_MOBILE', 0, ${amount}, 'Payroll disbursement');

      INSERT INTO action_log (action_id, idempotency_key, turn_number, game_date, action_type, payload, result, status)
      VALUES ('${actionId}', ${idempotency_key ? `'${idempotency_key}'` : 'NULL'}, (SELECT active_turn FROM campaign_meta LIMIT 1), '${game_date}', 'PAY_WAGES', '${JSON.stringify(action).replace(/'/g, "''")}', '{"amount": ${amount}, "newBalance": ${newBal}}', 'SUCCESS');
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
    const txnId = `TXN-${game_date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const actionId = `ACT-${Date.now()}`;
    const lastTxn = runSqlJson(this.dbPath, `SELECT balance FROM cashflow_ledger ORDER BY game_date DESC, txn_id DESC LIMIT 1;`)[0];
    const newBal = (lastTxn ? Number(lastTxn.balance) : Number(playerRows.liquid_cash)) + amount;

    const sql = `
      UPDATE player_state SET liquid_cash = liquid_cash + ${amount};

      INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
      VALUES ('${txnId}', '${game_date}', '${source.replace(/'/g, "''")}', 'Imperial Bounty', ${amount}, 0, ${newBal}, '${memo.replace(/'/g, "''")}', 'Confirmed');

      INSERT INTO account_journal (txn_id, game_date, account_code, debit, credit, memo)
      VALUES
        ('${txnId}', '${game_date}', '1001_CASH_MOBILE', ${amount}, 0, 'Bounty received from ${source}'),
        ('${txnId}', '${game_date}', '7001_BOUNTY_INCOME', 0, ${amount}, 'Bounty: ${memo}');

      INSERT INTO action_log (action_id, idempotency_key, turn_number, game_date, action_type, payload, result, status)
      VALUES ('${actionId}', ${idempotency_key ? `'${idempotency_key}'` : 'NULL'}, (SELECT active_turn FROM campaign_meta LIMIT 1), '${game_date}', 'RECORD_BOUNTY', '${JSON.stringify(action).replace(/'/g, "''")}', '{"amount": ${amount}, "newBalance": ${newBal}}', 'SUCCESS');
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
}

module.exports = {
  SimulationCore
};
