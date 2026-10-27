#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Autonomous Mathematical & Invariant Auditor (sim-audit.js)
 * Audits the primary source of truth (SQLite: saves/session.db) and verifies projection consistency.
 * Enforces zero-drift accounting, physical inventory conservation, and non-negativity.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const GAME_DIR = path.join(ROOT_DIR, 'game');
const SAVES_DIR = path.join(ROOT_DIR, 'saves');
const DB_PATH = process.env.SIM_DB_PATH || path.join(SAVES_DIR, 'session.db');
const PROGRESS_PATH = path.join(GAME_DIR, 'PROGRESS.md');
const CASHFLOW_MD_PATH = path.join(GAME_DIR, 'ledger', 'cashflow.md');
const INVENTORY_MD_PATH = path.join(GAME_DIR, 'ledger', 'inventory.md');

function runSqlJson(sql) {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Session database not found at ${DB_PATH}. Primary truth is missing!`);
  }
  const tempFile = path.join(SAVES_DIR, `audit_tmp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}.sql`);
  fs.writeFileSync(tempFile, sql, 'utf8');
  try {
    const stdout = execSync(`sqlite3 -json "${DB_PATH}" < "${tempFile}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return stdout && stdout.trim() ? JSON.parse(stdout) : [];
  } catch (err) {
    if (err.stdout && err.stdout.trim().startsWith('[')) {
      try { return JSON.parse(err.stdout); } catch (e) {}
    }
    throw new Error(`Database query failed: ${err.stderr || err.message}`);
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
  }
}

function cleanCell(str) {
  return str ? str.replace(/[`*]/g, '').trim() : '';
}

function parseNumber(str) {
  if (!str) return 0;
  const cleaned = cleanCell(str).replace(/[+,\s]/g, '');
  if (cleaned === '—' || cleaned === '-' || cleaned === '') return 0;
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function auditSqliteCashflow() {
  const errors = [];
  let checksCount = 0;

  // 1. Fetch transactions in chronological order
  const txns = runSqlJson(`SELECT * FROM cashflow_ledger ORDER BY game_date ASC, txn_id ASC;`);
  if (!txns || txns.length === 0) {
    errors.push('No cashflow transactions found in SQLite database!');
    return { passed: false, checksCount, errors, finalBalance: 0 };
  }

  let runningCalc = 0;
  for (let i = 0; i < txns.length; i++) {
    const t = txns[i];
    checksCount++;

    const inflow = Number(t.inflow || 0);
    const outflow = Number(t.outflow || 0);
    const recordedBal = Number(t.balance);

    if (inflow < 0 || outflow < 0) {
      errors.push(`Transaction ${t.txn_id} has negative inflow/outflow: in=${inflow}, out=${outflow}`);
    }

    if (i === 0 && t.txn_id.endsWith('-0000')) {
      runningCalc = inflow;
    } else {
      runningCalc = runningCalc + inflow - outflow;
    }

    const diff = Math.abs(runningCalc - recordedBal);
    if (diff > 0.001) {
      errors.push(`Cashflow mismatch at ${t.txn_id}: expected=${runningCalc}, recorded=${recordedBal}, diff=${diff}`);
    }

    if (recordedBal < 0) {
      errors.push(`Cash balance dipped negative at ${t.txn_id}: balance=${recordedBal}`);
    }
  }

  // 2. Cross-verify with player_state table
  const playerRows = runSqlJson(`SELECT liquid_cash, safe_cash FROM player_state LIMIT 1;`);
  checksCount++;
  if (!playerRows || playerRows.length === 0) {
    errors.push('player_state record missing in SQLite database!');
  } else {
    const playerCash = Number(playerRows[0].liquid_cash || 0) + Number(playerRows[0].safe_cash || 0);
    if (Math.abs(playerCash - runningCalc) > 0.001) {
      errors.push(`player_state total cash (${playerCash}) does not match latest cashflow balance (${runningCalc})`);
    }
  }

  return {
    passed: errors.length === 0,
    checksCount,
    errors,
    txnCount: txns.length,
    finalBalance: runningCalc
  };
}

function auditSqliteInventory() {
  const errors = [];
  let checksCount = 0;

  const items = runSqlJson(`SELECT * FROM inventory_items;`);
  if (!items || items.length === 0) {
    errors.push('No inventory items found in SQLite database!');
    return { passed: false, checksCount, errors, totalValue: 0 };
  }

  const movements = runSqlJson(`SELECT * FROM stock_movements ORDER BY rowid ASC;`);
  let calculatedVal = 0;

  for (const item of items) {
    checksCount++;
    const code = item.item_code;
    const qty = Number(item.quantity);
    const cost = Number(item.unit_cost_basis);

    // Non-negativity invariant
    if (qty < 0) {
      errors.push(`Item ${code} has negative quantity: ${qty}`);
    }
    if (cost < 0) {
      errors.push(`Item ${code} has negative unit cost basis: ${cost}`);
    }

    calculatedVal += qty * cost;

    // Movement tracking verification
    const itemMovs = movements.filter(m => m.item_code === code);
    if (itemMovs.length > 0) {
      checksCount++;
      const lastMov = itemMovs[itemMovs.length - 1];
      const movBalAfter = Number(lastMov.balance_after);
      if (Math.abs(qty - movBalAfter) > 0.001) {
        errors.push(`Inventory balance_after in last movement for ${code} (${movBalAfter}) does not match current quantity (${qty})`);
      }
    }
  }

  return {
    passed: errors.length === 0,
    checksCount,
    errors,
    itemCount: items.length,
    movementCount: movements.length,
    totalValue: calculatedVal
  };
}

function auditDoubleEntryJournal() {
  const errors = [];
  let checksCount = 0;

  // Check if account_journal table exists
  const tableCheck = runSqlJson(`SELECT name FROM sqlite_master WHERE type='table' AND name='account_journal';`);
  if (!tableCheck || tableCheck.length === 0) {
    // Journal table not yet installed (optional during P0, required in P1)
    return { passed: true, checksCount: 0, errors: [], entriesCount: 0, installed: false };
  }

  const entries = runSqlJson(`
    SELECT txn_id, TOTAL(debit) as total_debit, TOTAL(credit) as total_credit
    FROM account_journal
    GROUP BY txn_id;
  `);

  for (const row of entries) {
    checksCount++;
    const dr = Number(row.total_debit || 0);
    const cr = Number(row.total_credit || 0);
    if (Math.abs(dr - cr) > 0.001) {
      errors.push(`Unbalanced journal entry for TXN ${row.txn_id}: Debit=${dr}, Credit=${cr}, Diff=${Math.abs(dr - cr)}`);
    }
  }

  return {
    passed: errors.length === 0,
    checksCount,
    errors,
    entriesCount: entries.length,
    installed: true
  };
}

function auditProjectionSync(cashResult, invResult) {
  const errors = [];
  let checksCount = 0;

  // P0 Rule: DO NOT silently pass if PROGRESS.md is missing!
  if (!fs.existsSync(PROGRESS_PATH)) {
    errors.push(`CRITICAL: Projection file PROGRESS.md is missing at ${PROGRESS_PATH}!`);
    return { passed: false, checksCount, errors };
  }

  const content = fs.readFileSync(PROGRESS_PATH, 'utf8');

  // Verify Liquid Capital
  checksCount++;
  const cashMatch = content.match(/\*\*Liquid Capital\*\*\s*\|\s*\*\*([0-9,]+)\s*Qian\*\*/i);
  if (!cashMatch) {
    errors.push('PROGRESS.md missing Liquid Capital field in Executive Dashboard!');
  } else {
    const progressCash = parseNumber(cashMatch[1]);
    if (Math.abs(progressCash - cashResult.finalBalance) > 0.001) {
      errors.push(`PROGRESS.md Cash (${progressCash}) differs from SQLite single source of truth (${cashResult.finalBalance})`);
    }
  }

  // Verify Inventory Valuation
  checksCount++;
  const invMatch = content.match(/\*\*Inventory Valuation\*\*\s*\|\s*\*\*([0-9,]+)\s*Qian\*\*/i);
  if (!invMatch) {
    errors.push('PROGRESS.md missing Inventory Valuation field in Executive Dashboard!');
  } else {
    const progressInv = parseNumber(invMatch[1]);
    const roundedInv = Math.round(invResult.totalValue);
    if (Math.abs(progressInv - roundedInv) > 0.001) {
      errors.push(`PROGRESS.md Inventory (${progressInv}) differs from SQLite calculated inventory (${roundedInv})`);
    }
  }

  // Verify Total Net Worth
  checksCount++;
  const netWorthMatch = content.match(/\*\*Total Net Worth\*\*\s*\|\s*\*\*([0-9,]+)\s*Qian\*\*/i);
  if (!netWorthMatch) {
    errors.push('PROGRESS.md missing Total Net Worth field in Executive Dashboard!');
  } else {
    const progressNetWorth = parseNumber(netWorthMatch[1]);
    const playerRows = runSqlJson(`SELECT fixed_capital FROM player_state LIMIT 1;`);
    const fixedCap = playerRows.length > 0 ? Number(playerRows[0].fixed_capital || 0) : 0;
    const expectedNetWorth = Math.round(cashResult.finalBalance + invResult.totalValue + fixedCap);
    if (Math.abs(progressNetWorth - expectedNetWorth) > 0.001) {
      errors.push(`PROGRESS.md Net Worth (${progressNetWorth}) does not match Expected Net Worth (${expectedNetWorth})`);
    }
  }

  return {
    passed: errors.length === 0,
    checksCount,
    errors
  };
}

function runAudit() {
  console.log('====================================================');
  console.log(' ⚡ ThreeKingdoms-AgentEngine: Invariant & State Auditor');
  console.log('====================================================');

  let allPassed = true;
  let totalChecks = 0;
  const allErrors = [];

  try {
    // 1. Cashflow Audit
    const cashResult = auditSqliteCashflow();
    totalChecks += cashResult.checksCount;
    console.log(`\n[1] CASHFLOW LEDGER (SQLite Primary Truth):`);
    console.log(`    Transactions Verified : ${cashResult.txnCount}`);
    console.log(`    Closing Cash Balance  : ${cashResult.finalBalance.toLocaleString()} Qian`);
    if (!cashResult.passed) {
      allPassed = false;
      cashResult.errors.forEach(e => { console.error(`    ❌ ${e}`); allErrors.push(e); });
    } else {
      console.log(`    ✅ Passed: Inflow/Outflow sequence balances exactly.`);
    }

    // 2. Inventory Audit
    const invResult = auditSqliteInventory();
    totalChecks += invResult.checksCount;
    console.log(`\n[2] PHYSICAL INVENTORY (SQLite Conservation):`);
    console.log(`    Tracked Items in Store: ${invResult.itemCount} SKUs`);
    console.log(`    Movement Records      : ${invResult.movementCount} entries`);
    console.log(`    Total Inventory Value : ${invResult.totalValue.toLocaleString()} Qian`);
    if (!invResult.passed) {
      allPassed = false;
      invResult.errors.forEach(e => { console.error(`    ❌ ${e}`); allErrors.push(e); });
    } else {
      console.log(`    ✅ Passed: Quantity non-negativity and movement balances verified.`);
    }

    // 3. Double-Entry Journal Audit (if installed)
    const journalResult = auditDoubleEntryJournal();
    totalChecks += journalResult.checksCount;
    if (journalResult.installed) {
      console.log(`\n[3] DOUBLE-ENTRY JOURNAL (Dr/Cr Parity):`);
      console.log(`    Journal Sets Checked  : ${journalResult.entriesCount}`);
      if (!journalResult.passed) {
        allPassed = false;
        journalResult.errors.forEach(e => { console.error(`    ❌ ${e}`); allErrors.push(e); });
      } else {
        console.log(`    ✅ Passed: Every transaction debits == credits exactly.`);
      }
    }

    // 4. Projection Synchronization Audit
    const projResult = auditProjectionSync(cashResult, invResult);
    totalChecks += projResult.checksCount;
    console.log(`\n[${journalResult.installed ? 4 : 3}] PROJECTION SYNCHRONIZATION (game/PROGRESS.md):`);
    if (!projResult.passed) {
      allPassed = false;
      projResult.errors.forEach(e => { console.error(`    ❌ ${e}`); allErrors.push(e); });
    } else {
      console.log(`    ✅ Passed: PROGRESS.md matches SQLite state across all metrics.`);
    }

    console.log('\n====================================================');
    if (allPassed) {
      console.log(` 🟢 AUDIT VERDICT: PASSED`);
      console.log(`    Total Invariants Verified: ${totalChecks}`);
      console.log(`    Discrepancies Detected   : 0`);
      console.log('====================================================\n');
      process.exit(0);
    } else {
      console.error(` 🔴 AUDIT VERDICT: FAILED`);
      console.error(`    Total Invariants Checked : ${totalChecks}`);
      console.error(`    Violations Found         : ${allErrors.length}`);
      console.log('====================================================\n');
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n❌ FATAL AUDIT ERROR: ${err.message}`);
    process.exit(2);
  }
}

if (require.main === module) {
  runAudit();
}

module.exports = {
  auditSqliteCashflow,
  auditSqliteInventory,
  auditDoubleEntryJournal,
  auditProjectionSync,
  runAudit
};
