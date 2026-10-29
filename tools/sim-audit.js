#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Autonomous Mathematical & Invariant Auditor (sim-audit.js)
 * Audits the primary source of truth (SQLite: saves/session.db) and verifies projection consistency.
 * Enforces zero-drift accounting, physical inventory conservation, and non-negativity.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const GAME_DIR = path.join(ROOT_DIR, 'game');
const SAVES_DIR = path.join(ROOT_DIR, 'saves');
const DB_PATH = process.env.SIM_DB_PATH || path.join(SAVES_DIR, 'session.db');
const PROGRESS_PATH = path.join(GAME_DIR, 'PROGRESS.md');
const CASHFLOW_MD_PATH = path.join(GAME_DIR, 'ledger', 'cashflow.md');
const INVENTORY_MD_PATH = path.join(GAME_DIR, 'ledger', 'inventory.md');

const { runSqlJson: runAdapterQuery } = require('../engine/db-adapter');

function runSqlJson(sql) {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Session database not found at ${DB_PATH}. Primary truth is missing!`);
  }
  try {
    return runAdapterQuery(DB_PATH, sql);
  } catch (err) {
    throw new Error(`Database query failed: ${err.message}`);
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
  const txns = runSqlJson(`SELECT * FROM cashflow_ledger ORDER BY game_date ASC, rowid ASC;`);
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

function auditNpcAndBusinesses() {
  const errors = [];
  let checksCount = 0;

  const bizTable = runSqlJson(`SELECT name FROM sqlite_master WHERE type='table' AND name='businesses';`);
  if (!bizTable || bizTable.length === 0) {
    return { passed: true, checksCount: 0, errors: [], installed: false, bizCount: 0, npcCount: 0 };
  }

  const businesses = runSqlJson(`SELECT * FROM businesses;`);
  const npcs = runSqlJson(`SELECT * FROM npc_state;`);
  const npcMap = {};
  for (const n of npcs) {
    npcMap[n.npc_id] = n;
  }

  for (const b of businesses) {
    checksCount++;
    if (Number(b.safe_cash) < 0) {
      errors.push(`Business ${b.business_id} has negative safe cash: ${b.safe_cash}`);
    }
    if (b.manager_npc_id && !npcMap[b.manager_npc_id]) {
      errors.push(`Business ${b.business_id} has non-existent manager: ${b.manager_npc_id}`);
    }
    if (Number(b.efficiency_multiplier) <= 0) {
      errors.push(`Business ${b.business_id} has non-positive efficiency: ${b.efficiency_multiplier}`);
    }
    if (Number(b.current_workforce) < 0) {
      errors.push(`Business ${b.business_id} has negative workforce count: ${b.current_workforce}`);
    }
  }

  for (const n of npcs) {
    checksCount++;
    if (n.loyalty < 0 || n.loyalty > 100) errors.push(`NPC ${n.npc_id} loyalty out of bounds: ${n.loyalty}`);
    if (n.morale < 0 || n.morale > 100) errors.push(`NPC ${n.npc_id} morale out of bounds: ${n.morale}`);
    if (n.fatigue < 0 || n.fatigue > 100) errors.push(`NPC ${n.npc_id} fatigue out of bounds: ${n.fatigue}`);
    if (n.monthly_wage < 0) errors.push(`NPC ${n.npc_id} monthly wage negative: ${n.monthly_wage}`);
    if (n.assigned_business_id && !businesses.some(b => b.business_id === n.assigned_business_id)) {
      errors.push(`NPC ${n.npc_id} assigned to non-existent business: ${n.assigned_business_id}`);
    }
  }

  const skillTable = runSqlJson(`SELECT name FROM sqlite_master WHERE type='table' AND name='npc_skills';`);
  if (skillTable && skillTable.length > 0) {
    const skills = runSqlJson(`SELECT * FROM npc_skills;`);
    for (const s of skills) {
      checksCount++;
      if (s.tier < 1 || s.tier > 5) errors.push(`NPC ${s.npc_id} skill ${s.skill_code} tier out of bounds: ${s.tier}`);
      if (s.current_exp < 0) errors.push(`NPC ${s.npc_id} skill ${s.skill_code} exp negative: ${s.current_exp}`);
      if (s.max_exp <= 0) errors.push(`NPC ${s.npc_id} skill ${s.skill_code} max_exp non-positive: ${s.max_exp}`);
      if (!npcMap[s.npc_id]) errors.push(`NPC skill refers to missing NPC: ${s.npc_id}`);
    }
  }

  return {
    passed: errors.length === 0,
    checksCount,
    errors,
    installed: true,
    bizCount: businesses.length,
    npcCount: npcs.length
  };
}

function auditSqliteFactionsAndSettlements() {
  const errors = [];
  let checksCount = 0;

  // Check if session_factions and session_settlements exist in sqlite_master
  let tableCheck = [];
  try {
    tableCheck = runSqlJson(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('session_factions', 'session_settlements', 'npc_personal_progression', 'merchant_promissory_notes', 'faction_diplomacy');`);
  } catch (e) {
    return { passed: true, checksCount: 0, errors: [], installed: false, factionCount: 0, settlementCount: 0, progCount: 0, noteCount: 0, diploCount: 0 };
  }

  const existingTables = new Set(tableCheck.map(t => t.name));
  if (!existingTables.has('session_factions') || !existingTables.has('session_settlements')) {
    return { passed: true, checksCount: 0, errors: [], installed: false, factionCount: 0, settlementCount: 0, progCount: 0, noteCount: 0, diploCount: 0 };
  }

  // 1. Audit Factions
  const factions = runSqlJson(`SELECT faction_id, treasury_cash, granary_grain FROM session_factions;`);
  for (const f of factions) {
    checksCount++;
    if (f.treasury_cash < 0) {
      errors.push(`Faction ${f.faction_id} has negative treasury cash: ${f.treasury_cash}`);
    }
    checksCount++;
    if (f.granary_grain < 0) {
      errors.push(`Faction ${f.faction_id} has negative granary grain: ${f.granary_grain}`);
    }
  }

  // 2. Audit Settlements
  const settlements = runSqlJson(`SELECT settlement_id, garrison_troops, defense, granary_grain FROM session_settlements;`);
  for (const s of settlements) {
    checksCount++;
    if (s.garrison_troops < 0) {
      errors.push(`Settlement ${s.settlement_id} has negative garrison troops: ${s.garrison_troops}`);
    }
    checksCount++;
    if (s.defense < 10 || s.defense > 100) {
      errors.push(`Settlement ${s.settlement_id} defense out of bounds (10-100): ${s.defense}`);
    }
    checksCount++;
    if (Number(s.granary_grain) < 0) {
      errors.push(`Settlement ${s.settlement_id} has negative granary grain: ${s.granary_grain}`);
    }
  }

  // 3. Audit NPC Personal Progression if table exists
  let progCount = 0;
  if (existingTables.has('npc_personal_progression')) {
    const progressions = runSqlJson(`SELECT npc_id, personal_cash FROM npc_personal_progression;`);
    progCount = progressions.length;
    for (const p of progressions) {
      checksCount++;
      if (p.personal_cash < 0) {
        errors.push(`NPC ${p.npc_id} has negative personal cash: ${p.personal_cash}`);
      }
    }
  }

  // 4. Audit Promissory Notes if table exists
  let noteCount = 0;
  if (existingTables.has('merchant_promissory_notes')) {
    const notes = runSqlJson(`SELECT note_id, principal_amount, accrued_interest FROM merchant_promissory_notes;`);
    noteCount = notes.length;
    for (const n of notes) {
      checksCount++;
      if (n.principal_amount <= 0) errors.push(`Promissory note ${n.note_id} has non-positive principal: ${n.principal_amount}`);
      checksCount++;
      if (n.accrued_interest < 0) errors.push(`Promissory note ${n.note_id} has negative accrued interest: ${n.accrued_interest}`);
    }
  }

  // 5. Audit Faction Diplomacy if table exists
  let diploCount = 0;
  if (existingTables.has('faction_diplomacy')) {
    const treaties = runSqlJson(`SELECT id, diplomatic_attitude, truce_turns_remaining, tribute_amount FROM faction_diplomacy;`);
    diploCount = treaties.length;
    for (const tr of treaties) {
      checksCount++;
      if (tr.diplomatic_attitude < -100 || tr.diplomatic_attitude > 100) {
        errors.push(`Diplomatic treaty ${tr.id} attitude out of bounds: ${tr.diplomatic_attitude}`);
      }
      checksCount++;
      if (tr.truce_turns_remaining < 0) errors.push(`Diplomatic treaty ${tr.id} negative truce turns: ${tr.truce_turns_remaining}`);
      checksCount++;
      if (tr.tribute_amount < 0) errors.push(`Diplomatic treaty ${tr.id} negative tribute: ${tr.tribute_amount}`);
    }
  }

  return {
    passed: errors.length === 0,
    checksCount,
    errors,
    installed: true,
    factionCount: factions.length,
    settlementCount: settlements.length,
    progCount,
    noteCount,
    diploCount
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
  const cashMatch = content.match(/\*\*Liquid Capital\*\*\s*\|\s*\*\*([0-9,]+)\s*(?:Qian|quan)\*\*/i);
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
  const invMatch = content.match(/\*\*Inventory Valuation\*\*\s*\|\s*\*\*([0-9,]+)\s*(?:Qian|quan)\*\*/i);
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
  const netWorthMatch = content.match(/\*\*Total Net Worth\*\*\s*\|\s*\*\*([0-9,]+)\s*(?:Qian|quan)\*\*/i);
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

function auditCivilianMaidensAndLifeSim() {
  const errors = [];
  let checksCount = 0;

  const tableRows = runSqlJson(`SELECT name FROM sqlite_master WHERE type='table';`);
  const existingTables = new Set(tableRows.map(r => r.name));

  let maidenCount = 0;
  if (existingTables.has('civilian_maidens')) {
    const maidens = runSqlJson('SELECT maiden_id, dowry_cash, social_stratum, war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr, is_married FROM civilian_maidens;');
    maidenCount = maidens.length;
    for (const m of maidens) {
      checksCount++;
      const dowry = Number(m.dowry_cash);
      if (dowry < 0) {
        errors.push(`Civilian maiden ${m.maiden_id} has negative dowry: ${dowry}`);
      }
      checksCount++;
      if (!['PEASANT', 'ARTISAN_SHOP', 'GENTRY_CLAN'].includes(m.social_stratum)) {
        errors.push(`Civilian maiden ${m.maiden_id} has invalid stratum: ${m.social_stratum}`);
      }
      checksCount++;
      if (![0, 1].includes(Number(m.is_married))) {
        errors.push(`Civilian maiden ${m.maiden_id} has invalid is_married flag: ${m.is_married}`);
      }
      const attrs = ['war_attr', 'int_attr', 'com_attr', 'ldr_attr', 'pol_attr', 'dip_attr', 'cra_attr', 'log_attr'];
      for (const a of attrs) {
        checksCount++;
        const val = Number(m[a]);
        if (val < 0 || val > 120) {
          errors.push(`Civilian maiden ${m.maiden_id} attribute ${a} out of range [0, 120]: ${val}`);
        }
      }
    }
  }

  let rateCount = 0;
  if (existingTables.has('location_encounter_rates')) {
    const rates = runSqlJson('SELECT rate_id, base_probability, cooldown_days, min_player_prestige FROM location_encounter_rates;');
    rateCount = rates.length;
    for (const r of rates) {
      checksCount++;
      const prob = Number(r.base_probability);
      if (prob < 0.0 || prob > 1.0) {
        errors.push(`Encounter rate ${r.rate_id} has invalid probability: ${prob}`);
      }
      checksCount++;
      if (Number(r.cooldown_days) < 0) {
        errors.push(`Encounter rate ${r.rate_id} has negative cooldown: ${r.cooldown_days}`);
      }
      checksCount++;
      if (Number(r.min_player_prestige) < 0) {
        errors.push(`Encounter rate ${r.rate_id} has negative min_player_prestige: ${r.min_player_prestige}`);
      }
    }
  }

  let spouseCount = 0;
  if (existingTables.has('family_spouses')) {
    const spouses = runSqlJson('SELECT marriage_id, intimacy, pregnancy_stage, dowry_cash FROM family_spouses;');
    spouseCount = spouses.length;
    for (const s of spouses) {
      checksCount++;
      const intimacy = Number(s.intimacy);
      if (intimacy < 0 || intimacy > 100) {
        errors.push(`Spouse ${s.marriage_id} intimacy out of range [0, 100]: ${intimacy}`);
      }
      checksCount++;
      const preg = Number(s.pregnancy_stage);
      if (preg < 0 || preg > 3) {
        errors.push(`Spouse ${s.marriage_id} pregnancy stage out of range [0, 3]: ${preg}`);
      }
      checksCount++;
      if (Number(s.dowry_cash) < 0) {
        errors.push(`Spouse ${s.marriage_id} has negative dowry: ${s.dowry_cash}`);
      }
    }
  }

  return {
    passed: errors.length === 0,
    checksCount,
    errors,
    installed: existingTables.has('civilian_maidens') || existingTables.has('location_encounter_rates'),
    maidenCount,
    rateCount,
    spouseCount
  };
}

/**
 * Verifies that the campaign clock is a plausible game date and that it has not
 * fallen behind the last completed turn. A wall-clock timestamp (e.g. 2026-10-29)
 * or a date earlier than the newest turn breaks travel, aging and turn math.
 */
function auditCampaignClock() {
  const errors = [];
  let checksCount = 0;

  const meta = runSqlJson('SELECT campaign_id, "current_date", active_turn FROM campaign_meta LIMIT 1;')[0];
  if (!meta) {
    return { passed: false, checksCount: 1, errors: ['campaign_meta record missing.'], currentDate: null, lastTurnDate: null };
  }

  const toOrdinal = dateStr => {
    const [y, m, d] = String(dateStr || '').split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    return y * 360 + (m - 1) * 30 + (d - 1);
  };

  checksCount++;
  const currentOrdinal = toOrdinal(meta.current_date);
  let plausible = currentOrdinal !== null;
  if (currentOrdinal === null) {
    errors.push(`campaign_meta.current_date is not a game date: ${meta.current_date}`);
  } else {
    const year = Number(String(meta.current_date).split('-')[0]);
    if (year < 180 || year > 300) {
      plausible = false;
      errors.push(`campaign_meta.current_date ${meta.current_date} is outside the historical era (180-300).`);
    }
    // Calendar days are whole days; a fractional day (184-05-2.5) breaks every
    // downstream parse, ledger sort and month report.
    checksCount++;
    if (!/^\d{3}-\d{2}-\d{2}$/.test(String(meta.current_date))) {
      plausible = false;
      errors.push(`campaign_meta.current_date must match YYYY-MM-DD with whole days, got ${meta.current_date}.`);
    } else {
      const [, month, day] = String(meta.current_date).split('-').map(Number);
      if (month < 1 || month > 12 || day < 1 || day > 30) {
        plausible = false;
        errors.push(`campaign_meta.current_date has an out-of-range month/day: ${meta.current_date}.`);
      }
    }
  }

  const lastTurn = runSqlJson('SELECT turn_number, game_date FROM turn_log ORDER BY turn_number DESC LIMIT 1;')[0];
  if (lastTurn && plausible) {
    checksCount++;
    const lastOrdinal = toOrdinal(lastTurn.game_date);
    if (currentOrdinal !== null && lastOrdinal !== null) {
      if (currentOrdinal < lastOrdinal) {
        errors.push(
          `campaign clock ${meta.current_date} is earlier than the latest turn ${lastTurn.turn_number} (${lastTurn.game_date}).`
        );
      } else if (currentOrdinal - lastOrdinal > 45) {
        errors.push(
          `campaign clock ${meta.current_date} drifted more than 45 days past turn ${lastTurn.turn_number} (${lastTurn.game_date}).`
        );
      }
    }

    // `active_turn` is the month index; it must track the turn log.
    checksCount++;
    const activeTurn = Number(meta.active_turn || 0);
    const lastTurnNumber = Number(lastTurn.turn_number || 0);
    if (activeTurn < lastTurnNumber) {
      errors.push(
        `campaign_meta.active_turn ${activeTurn} is behind the latest turn_log (${lastTurnNumber}).`
      );
    } else if (activeTurn > lastTurnNumber + 1) {
      errors.push(
        `campaign_meta.active_turn ${activeTurn} is ahead of the latest turn_log (${lastTurnNumber}) by more than one month.`
      );
    }
  }

  return {
    passed: errors.length === 0,
    checksCount,
    errors,
    currentDate: meta.current_date,
    lastTurnDate: lastTurn ? lastTurn.game_date : null
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
    console.log(`    Closing Cash Balance  : ${cashResult.finalBalance.toLocaleString()} quan`);
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
    console.log(`    Total Inventory Value : ${invResult.totalValue.toLocaleString()} quan`);
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

    // 5. NPC & Business Enterprise Audit
    const npcBizResult = auditNpcAndBusinesses();
    totalChecks += npcBizResult.checksCount;
    if (npcBizResult.installed) {
      console.log(`\n[${journalResult.installed ? 5 : 4}] NPC & ENTERPRISE STATE (P4 Integrity):`);
      console.log(`    Enterprises Verified  : ${npcBizResult.bizCount}`);
      console.log(`    Active NPCs Verified  : ${npcBizResult.npcCount}`);
      if (!npcBizResult.passed) {
        allPassed = false;
        npcBizResult.errors.forEach(e => { console.error(`    ❌ ${e}`); allErrors.push(e); });
      } else {
        console.log(`    ✅ Passed: NPC attributes, skills, and business safe cash verified.`);
      }
    }

    // 6. Factions & Settlements State Audit
    const factionResult = auditSqliteFactionsAndSettlements();
    totalChecks += factionResult.checksCount;
    if (factionResult.installed && (factionResult.factionCount > 0 || factionResult.settlementCount > 0)) {
      console.log(`\n[${journalResult.installed ? 6 : 5}] GRAND STRATEGY INVARIANTS (Factions & Settlements):`);
      console.log(`    Factions Verified     : ${factionResult.factionCount}`);
      console.log(`    Settlements Verified  : ${factionResult.settlementCount}`);
      if (factionResult.progCount > 0) {
        console.log(`    Personal Assets Checked: ${factionResult.progCount}`);
      }
      if (factionResult.noteCount > 0) {
        console.log(`    Credit Notes Checked  : ${factionResult.noteCount}`);
      }
      if (factionResult.diploCount > 0) {
        console.log(`    Diplomatic Pacts Checked: ${factionResult.diploCount}`);
      }
      if (!factionResult.passed) {
        allPassed = false;
        factionResult.errors.forEach(e => { console.error(`    ❌ ${e}`); allErrors.push(e); });
      } else {
        console.log(`    ✅ Passed: Non-negative treasuries, garrisons, and bounded defense verified.`);
      }
    }

    // 7. Life-Sim & Civilian Maidens Audit
    const maidenResult = auditCivilianMaidensAndLifeSim();
    totalChecks += maidenResult.checksCount;
    if (maidenResult.installed && (maidenResult.maidenCount > 0 || maidenResult.rateCount > 0)) {
      console.log(`\n[${journalResult.installed ? 7 : 6}] LIFE-SIM & CIVILIAN MAIDENS INVARIANTS:`);
      console.log(`    Civilian Maidens Checked: ${maidenResult.maidenCount}`);
      console.log(`    Encounter Rates Checked : ${maidenResult.rateCount}`);
      console.log(`    Spouses State Checked   : ${maidenResult.spouseCount}`);
      if (!maidenResult.passed) {
        allPassed = false;
        maidenResult.errors.forEach(e => { console.error(`    ❌ ${e}`); allErrors.push(e); });
      } else {
        console.log(`    ✅ Passed: Non-negative dowries, valid strata, and bounded encounter rates.`);
      }
    }

    // 8. Campaign Clock Consistency Audit
    const clockResult = auditCampaignClock();
    totalChecks += clockResult.checksCount;
    console.log(`\n[${journalResult.installed ? 8 : 7}] CAMPAIGN CLOCK INTEGRITY:`);
    console.log(`    Current Game Date     : ${clockResult.currentDate}`);
    if (clockResult.lastTurnDate) console.log(`    Last Completed Turn   : ${clockResult.lastTurnDate}`);
    if (!clockResult.passed) {
      allPassed = false;
      clockResult.errors.forEach(e => { console.error(`    ❌ ${e}`); allErrors.push(e); });
    } else {
      console.log(`    ✅ Passed: Game date is plausible and aligned with turn history.`);
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
  auditNpcAndBusinesses,
  auditSqliteFactionsAndSettlements,
  auditCivilianMaidensAndLifeSim,
  auditCampaignClock,
  runAudit
};
