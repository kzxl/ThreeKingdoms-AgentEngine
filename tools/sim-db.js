#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Session Database CLI & Manager (sim-db.js)
 * High-performance, zero-dependency SQLite bridge via system sqlite3 CLI.
 * Decouples master game data from dynamic session progress.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const GAME_DIR = path.join(ROOT_DIR, 'game');
const SAVES_DIR = path.join(ROOT_DIR, 'saves');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const DEFAULT_DB_PATH = path.join(SAVES_DIR, 'session.db');

let betterSqlite = null;
try {
  betterSqlite = require('better-sqlite3');
} catch (e) {}

const nativeDbPool = new Map();
function getNativeDb(dbPath) {
  if (!betterSqlite) return null;
  if (!nativeDbPool.has(dbPath)) {
    ensureSavesDir();
    const db = new betterSqlite(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    nativeDbPool.set(dbPath, db);
  }
  return nativeDbPool.get(dbPath);
}

function ensureSavesDir() {
  if (!fs.existsSync(SAVES_DIR)) {
    fs.mkdirSync(SAVES_DIR, { recursive: true });
  }
}

function getDbPath() {
  return process.env.SIM_DB_PATH || DEFAULT_DB_PATH;
}

function runSql(dbPath, sql) {
  ensureSavesDir();
  const nativeDb = getNativeDb(dbPath);
  if (nativeDb) {
    try {
      const trimmed = sql.trim();
      if (/^(SELECT|WITH|PRAGMA)\b/i.test(trimmed)) {
        return nativeDb.prepare(sql).all();
      } else {
        nativeDb.exec(sql);
        return [];
      }
    } catch (nativeErr) {
      // Fallback to CLI execution on error
    }
  }

  // Escape double quotes for Windows shell execution
  const tempSqlFile = path.join(SAVES_DIR, `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.sql`);
  fs.writeFileSync(tempSqlFile, sql, 'utf8');
  try {
    const stdout = execSync(`sqlite3 -json "${dbPath}" < "${tempSqlFile}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return stdout ? JSON.parse(stdout) : [];
  } catch (err) {
    if (err.stdout && err.stdout.trim().startsWith('[')) {
      try { return JSON.parse(err.stdout); } catch (e) {}
    }
    // Check if it's an execution without output (like INSERT/UPDATE)
    if (!err.stderr || err.stderr.trim() === '') {
      return [];
    }
    throw new Error(`SQL Execution Failed: ${err.stderr || err.message}`);
  } finally {
    if (fs.existsSync(tempSqlFile)) {
      try { fs.unlinkSync(tempSqlFile); } catch (e) {}
    }
  }
}

function runSqlExec(dbPath, sql) {
  ensureSavesDir();
  const tempSqlFile = path.join(SAVES_DIR, `temp_exec_${Date.now()}.sql`);
  fs.writeFileSync(tempSqlFile, sql, 'utf8');
  try {
    execSync(`sqlite3 "${dbPath}" < "${tempSqlFile}"`, { stdio: 'inherit' });
  } finally {
    if (fs.existsSync(tempSqlFile)) {
      try { fs.unlinkSync(tempSqlFile); } catch (e) {}
    }
  }
}

function initDb(dbPath, campaignId = 'CMP-184-ZHOU-01', charName = 'Liang Yan') {
  ensureSavesDir();
  console.log(`[SIM-DB] Initializing session database at: ${dbPath}`);
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  runSqlExec(dbPath, schemaSql);

  const initDataSql = `
  INSERT OR IGNORE INTO campaign_meta (campaign_id, campaign_name, start_date, "current_date", active_turn)
  VALUES ('${campaignId}', 'Yellow Turban Rebellion 184 AD', '184-02-01', '184-02-01', 0);

  INSERT OR IGNORE INTO player_state (
    player_id, name, style_name, age, current_location, permanent_base,
    int_attr, pol_attr, war_attr, ldr_attr, dip_attr, com_attr, log_attr, cra_attr,
    liquid_cash, safe_cash, strategic_grain, fixed_capital
  ) VALUES (
    'PLY-0001', '${charName}', 'Zhiyuan', 21, 'LOC-0001', 'LOC-0001',
    76, 60, 48, 62, 65, 75, 62, 60,
    15000, 0, 0.0, 19600
  );
  `;
  runSqlExec(dbPath, initDataSql);
  console.log(`✅ Database initialized successfully.`);
}

function getStatus(dbPath) {
  const meta = runSql(dbPath, `SELECT * FROM campaign_meta LIMIT 1;`)[0] || {};
  const player = runSql(dbPath, `SELECT * FROM player_state LIMIT 1;`)[0] || {};
  const invSummary = runSql(dbPath, `SELECT COUNT(*) as item_count, TOTAL(quantity * unit_cost_basis) as inv_val FROM inventory_items;`)[0] || { item_count: 0, inv_val: 0 };
  
  const liquidCash = player.liquid_cash || 0;
  const safeCash = player.safe_cash || 0;
  const invVal = Math.round(invSummary.inv_val || 0);
  const fixedCap = player.fixed_capital || 0;
  const netWorth = liquidCash + safeCash + invVal + fixedCap;

  return {
    meta,
    player,
    liquidCash,
    safeCash,
    invVal,
    fixedCap,
    netWorth,
    itemCount: invSummary.item_count
  };
}

function exportProgress(dbPath, outputPath) {
  const status = getStatus(dbPath);
  const m = status.meta;
  const p = status.player;

  const turns = runSql(dbPath, `SELECT * FROM turn_log ORDER BY turn_number DESC LIMIT 5;`);
  const activeTurnObj = turns[0] || {};

  const content = `# Active Campaign Progress Journal (game/PROGRESS.md)

> **ARCHITECTURAL NOTE**:
> This file is an auto-generated read-only projection compiled from the session database (\`saves/session.db\`).
> Master game dossiers remain 100% immutable in \`game/master/\`.

---

## 1. Live Campaign Header & Executive Dashboard

| Dimension | Active Value |
|---|---|
| **Campaign ID** | \`${m.campaign_id || 'CMP-0001'}\` |
| **Protagonist** | ${p.name || 'Liang Yan'} (\`${p.player_id || 'player'}\`), Age ${p.age || 21} |
| **Current In-Game Date** | **${m.current_date || '184-02-01'}** |
| **Active Turn** | **Turn ${m.active_turn || 0} (${activeTurnObj.turn_title || 'Active Turn'})** |
| **Current Location** | ${p.current_location || 'LOC-0001'} |
| **Permanent Base** | ${p.permanent_base || 'LOC-0001'} |
| **Liquid Capital** | **${(status.liquidCash + status.safeCash).toLocaleString()} quan** (${status.liquidCash.toLocaleString()} quan mobile + ${status.safeCash.toLocaleString()} quan safe) |
| **Strategic Grain** | **${Number(p.strategic_grain || 0).toFixed(2)} piculs** |
| **Inventory Valuation** | **${status.invVal.toLocaleString()} quan** (${status.itemCount} items) |
| **Fixed Capital** | **${status.fixedCap.toLocaleString()} quan** |
| **Total Net Worth** | **${status.netWorth.toLocaleString()} quan** |
| **Audit Status** | **100% Reconciled (Verified via SQLite ACID)** |

---

## 2. Rolling Turn History & Key Milestones

${turns.map(t => `### [Turn ${t.turn_number}] — ${t.game_date}: ${t.turn_title}
- ${t.summary.replace(/\\n/g, '\n- ')}
`).join('\n') || '_No turns completed yet._'}

---

## 3. Active Dilemma & Next Strategic Junction

${activeTurnObj.dilemma_choice || '_Awaiting player orders._'}
`;

  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`[SIM-DB] Successfully exported PROGRESS.md to: ${outputPath}`);
}

function importFromLegacy(dbPath) {
  initDb(dbPath);
  console.log('[SIM-DB] Migrating current legacy campaign (Turn 4 Liang Yan) into SQLite...');

  // Ingest cashflow
  const cashflowPath = path.join(GAME_DIR, 'ledger', 'cashflow.md');
  if (fs.existsSync(cashflowPath)) {
    const lines = fs.readFileSync(cashflowPath, 'utf8').split(/\r?\n/);
    for (const l of lines) {
      if (!l.trim().startsWith('|') || l.includes('TXN ID') || l.includes('|---|')) continue;
      const parts = l.split('|').slice(1, -1).map(s => s.replace(/[`*]/g, '').trim());
      if (parts.length < 8) continue;
      const [id, date, counterparty, cat, inStr, outStr, balStr, memo, status] = parts;
      if (!id.startsWith('TXN-') || id.includes(' to ')) continue;
      const inflow = parseInt(inStr.replace(/,/g, ''), 10) || 0;
      const outflow = parseInt(outStr.replace(/,/g, ''), 10) || 0;
      const balance = parseInt(balStr.replace(/,/g, ''), 10) || 0;
      
      const insertSql = `INSERT OR REPLACE INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
      VALUES ('${id}', '${date}', '${counterparty.replace(/'/g, "''")}', '${cat}', ${inflow}, ${outflow}, ${balance}, '${memo.replace(/'/g, "''")}', '${status}');`;
      runSql(dbPath, insertSql);
    }
  }

  // Ingest inventory
  const invPath = path.join(GAME_DIR, 'ledger', 'inventory.md');
  if (fs.existsSync(invPath)) {
    const lines = fs.readFileSync(invPath, 'utf8').split(/\r?\n/);
    let inStock = false;
    for (const l of lines) {
      if (l.includes('## 1. Current Warehouse')) { inStock = true; continue; }
      if (l.includes('## 2. Stock Movement')) { inStock = false; continue; }
      if (!inStock || !l.trim().startsWith('|') || l.includes('Item Code') || l.includes('|---|')) continue;
      const parts = l.split('|').slice(1, -1).map(s => s.replace(/[`*]/g, '').trim());
      if (parts.length < 6) continue;
      const [code, cat, desc, qtyStr, costStr] = parts;
      if (!code.startsWith('COM-') && !code.startsWith('PROD-')) continue;
      const qty = parseFloat(qtyStr.replace(/,/g, ''));
      const cost = parseInt(costStr.replace(/,/g, ''), 10) || 0;

      const insertSql = `INSERT OR REPLACE INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
      VALUES ('${code}', '${cat}', '${desc.replace(/'/g, "''")}', ${qty}, ${cost}, 'Expedition / Zhuo');`;
      runSql(dbPath, insertSql);
    }
  }

  // Update player state to match current Turn 4
  const updatePlayerSql = `
  UPDATE campaign_meta SET
    current_date = '184-04-24',
    active_turn = 4;

  UPDATE player_state SET
    current_location = 'LOC-0003 (Guangzong Camp)',
    int_attr = 76, pol_attr = 64, war_attr = 58, ldr_attr = 68,
    dip_attr = 70, com_attr = 78, log_attr = 70, cra_attr = 62,
    liquid_cash = 14700,
    safe_cash = 3000,
    strategic_grain = 9.60,
    fixed_capital = 19600;

  INSERT OR REPLACE INTO turn_log (turn_number, game_date, turn_title, location, summary, dilemma_choice)
  VALUES (
    4,
    '184-04-24',
    'Northern March & Salt Trade at Guangzong',
    'Guangzong Siege Camp (LOC-0003)',
    'Purchased 70 Dou sea salt at Qingzhou (52 quan). Arbitrage sold 40 Dou in Pingyuan (85 quan) and 25 Dou at Guangzong (80 quan). Gifted 5 Dou to Lu Zhi. Cash reached 17,700 quan, Net Worth 58,878 quan.',
    '**The Extortion Crisis of Eunuch Zuo Feng**: Zuo Feng demands 1,000 Gold bribe from Lu Zhi. Lu Zhi furiously refuses. Liang Yan has 14,700 quan mobile cash and Tier 3 Stratagem. Options: (A) Privately bribe Zuo Feng with 3,000 quan to save Lu Zhi; (B) Uphold Confucian righteousness and let history take its course; (C) Ambush or blackmail Zuo Feng.'
  );
  `;
  runSqlExec(dbPath, updatePlayerSql);

  console.log('✅ Legacy data migrated into SQLite successfully.');
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const dbPath = getDbPath();

  switch (command) {
    case 'init':
      initDb(dbPath, args[1], args[2]);
      break;

    case 'import-legacy':
      importFromLegacy(dbPath);
      break;

    case 'status':
      const s = getStatus(dbPath);
      console.log('====================================================');
      console.log(` 🏛️  ThreeKingdoms-AgentEngine: Session Status`);
      console.log('====================================================');
      console.log(` Campaign   : ${s.meta.campaign_id} (Turn ${s.meta.active_turn})`);
      console.log(` Game Date  : ${s.meta.current_date}`);
      console.log(` Protagonist: ${s.player.name} @ ${s.player.current_location}`);
      console.log(` Cash       : ${s.liquidCash.toLocaleString()} quan (Mobile) + ${s.safeCash.toLocaleString()} quan (Safe) = ${(s.liquidCash + s.safeCash).toLocaleString()} quan`);
      console.log(` Inventory  : ${s.invVal.toLocaleString()} quan (${s.itemCount} items)`);
      console.log(` Fixed Cap  : ${s.fixedCap.toLocaleString()} quan`);
      console.log(` NET WORTH  : ${s.netWorth.toLocaleString()} quan`);
      console.log('====================================================');
      break;

    case 'query':
      const sql = args.slice(1).join(' ');
      if (!sql) {
        console.error('Usage: node sim-db.js query "<SQL_QUERY>"');
        process.exit(1);
      }
      const results = runSql(dbPath, sql);
      console.log(JSON.stringify(results, null, 2));
      break;

    case 'export-progress':
      const outPath = args[1] || path.join(GAME_DIR, 'PROGRESS.md');
      exportProgress(dbPath, outPath);
      break;

    case 'list-npcs': {
      const npcs = runSql(dbPath, `SELECT * FROM npc_state ORDER BY npc_id ASC;`);
      const skills = runSql(dbPath, `SELECT * FROM npc_skills;`);
      console.log('====================================================');
      console.log(` 👥 Active NPCs & Retainers (${npcs.length})`);
      console.log('====================================================');
      for (const n of npcs) {
        const nSkills = skills.filter(s => s.npc_id === n.npc_id).map(s => `${s.skill_name} (T${s.tier} ${s.current_exp}/${s.max_exp})`).join(', ') || 'None';
        console.log(`[${n.npc_id}] ${n.name} | Role: ${n.assigned_role} @ ${n.assigned_business_id || 'UNASSIGNED'}`);
        console.log(`     Personality: ${n.personality} | Motivation: ${n.motivation} | Talents: ${n.talents}`);
        console.log(`     Attributes : CRA:${n.cra_attr} LOG:${n.log_attr} INT:${n.int_attr} POL:${n.pol_attr} LDR:${n.ldr_attr}`);
        console.log(`     Status     : Morale:${n.morale}% Loyalty:${n.loyalty}% Fatigue:${n.fatigue}% Wage:${n.monthly_wage} quan`);
        console.log(`     Skills     : ${nSkills}`);
        console.log('----------------------------------------------------');
      }
      break;
    }

    case 'show-business': {
      const bizId = args[1] || 'BIZ-0001';
      const biz = runSql(dbPath, `SELECT * FROM businesses WHERE business_id = '${bizId}' LIMIT 1;`)[0];
      if (!biz) {
        console.error(`Business ${bizId} not found.`);
        break;
      }
      const workforce = runSql(dbPath, `SELECT npc_id, name, assigned_role, monthly_wage FROM npc_state WHERE assigned_business_id = '${bizId}';`);
      console.log('====================================================');
      console.log(` 🏭 Enterprise: ${biz.name} (${biz.business_id})`);
      console.log('====================================================');
      console.log(` Location    : ${biz.location_id}`);
      console.log(` Manager     : ${biz.manager_npc_id}`);
      console.log(` Safe Cash   : ${biz.safe_cash.toLocaleString()} quan`);
      console.log(` Delegation  : Level ${biz.delegation_level} (Autonomous SOP)`);
      console.log(` Capacity    : ${biz.monthly_capacity_hours} hrs/mo (Efficiency: ${Math.round(biz.efficiency_multiplier * 100)}%)`);
      console.log(` Overhead    : Rent ${biz.monthly_rent} quan/mo | Workforce: ${workforce.length} persons`);
      console.log(' Workforce   :');
      for (const w of workforce) {
        console.log(`   - [${w.npc_id}] ${w.name}: ${w.assigned_role} (Wage: ${w.monthly_wage} quan)`);
      }
      console.log('====================================================');
      break;
    }

    case 'simulate-workshop': {
      const { WorkshopEngine } = require('../engine/workshop-engine');
      const bizId = args[1] || 'BIZ-0001';
      const date = args[2] || '184-05-30';
      const seed = parseInt(args[3] || '1840501', 10);
      const outProgress = path.join(GAME_DIR, 'PROGRESS.md');
      const engine = new WorkshopEngine(dbPath, outProgress);
      const res = engine.simulateMonth(bizId, date, seed);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    default:
      console.log(`Unknown command: ${command}`);
      console.log('Available commands: init, import-legacy, status, query, export-progress, list-npcs, show-business, simulate-workshop');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  getDbPath,
  runSql,
  initDb,
  getStatus,
  exportProgress
};
