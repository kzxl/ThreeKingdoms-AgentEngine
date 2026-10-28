#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Web UI Server (tools/sim-web.js)
 * Zero-dependency, lightweight HTTP server providing full interactive simulation control.
 * Serves the modern military-strategy dashboard and exposes REST APIs to SQLite & SimCore.
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { SimulationCore } = require('../engine/sim-core');
const { WorkshopEngine } = require('../engine/workshop-engine');
const { GameplayManager } = require('../engine/gameplay-manager');
const { EventManager } = require('../engine/event-manager');
const {
  auditSqliteCashflow,
  auditSqliteInventory,
  auditDoubleEntryJournal,
  auditProjectionSync,
  auditNpcAndBusinesses
} = require('./sim-audit');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const SAVES_DIR = path.join(ROOT_DIR, 'saves');
const DB_PATH = process.env.SIM_DB_PATH || path.join(SAVES_DIR, 'session.db');
const DEFAULT_PORT = parseInt(process.env.PORT || process.argv[2] || '3300', 10);

const gameplayManager = new GameplayManager(DB_PATH);
const eventManager = new EventManager(DB_PATH);

// In-Memory Agent Simulation Activity Stream
const agentActivityStream = [
  {
    timestamp: '08:00:00',
    type: 'SESSION_START',
    prompt: 'Khởi tạo phiên mô phỏng chiến dịch',
    narrative: 'Lương Diễn hoàn tất giao dịch quân nhu cho Bắc Quân Lư Thực và trở về Huyện Trác củng cố hậu cần.',
    reasoning: 'Thiết lập cân bằng sổ cái kép 70/70 Invariants và duy trì kết nối AI Bridge trực tiếp.',
    delta: { cash: '+0 Qian', inventory: '12 SKUs ổn định', relations: 'Trương Phi +25, Quan Vũ +10', audit: '70/70 Khớp 100%' }
  }
];

function logAgentSimulationEvent(event) {
  agentActivityStream.unshift({
    timestamp: event.timestamp || new Date().toLocaleTimeString(),
    type: event.type || 'SIMULATION_ACTION',
    prompt: event.prompt || 'Chỉ thị mô phỏng',
    narrative: event.narrative || '',
    reasoning: event.reasoning || 'Thực thi quy tắc mô phỏng SQLite SimCore.',
    delta: event.delta || {},
    executedAction: event.executedAction || null
  });
  if (agentActivityStream.length > 50) agentActivityStream.pop();
}

function runSqlJson(sql) {
  if (!fs.existsSync(DB_PATH)) return [];
  const tempFile = path.join(SAVES_DIR, `web_tmp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}.sql`);
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
    return [];
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
  }
}

function runSqlRaw(sql) {
  if (!fs.existsSync(DB_PATH)) return false;
  const tempFile = path.join(SAVES_DIR, `web_raw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}.sql`);
  fs.writeFileSync(tempFile, sql, 'utf8');
  try {
    execSync(`sqlite3 "${DB_PATH}" < "${tempFile}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return true;
  } catch (err) {
    console.error('runSqlRaw error:', err.message);
    return false;
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
  }
}

// Ensure chat_chronicle table exists on boot
runSqlRaw(`CREATE TABLE IF NOT EXISTS chat_chronicle (
  id TEXT PRIMARY KEY,
  turn_number INTEGER DEFAULT 1,
  game_date TEXT DEFAULT '184-05-02',
  type TEXT NOT NULL,
  speaker TEXT,
  title TEXT,
  avatar TEXT,
  text TEXT NOT NULL,
  dice_badge TEXT,
  deltas TEXT,
  reasoning TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);

// Passive Stamina Regeneration Tracker
let lastPassiveStaminaCheck = Date.now();

function processPassiveStaminaRecovery(player) {
  if (!player || !player.player_id) return player;
  const currentFatigue = Number(player.fatigue || 0);
  if (currentFatigue <= 0) {
    lastPassiveStaminaCheck = Date.now();
    return player;
  }
  const warAttr = Number(player.war_attr || 50);
  const intervalSeconds = Math.max(8, 30 - Math.floor((warAttr - 50) * 0.4));
  const elapsedSeconds = Math.floor((Date.now() - lastPassiveStaminaCheck) / 1000);
  if (elapsedSeconds >= intervalSeconds) {
    const pointsToRecover = Math.floor(elapsedSeconds / intervalSeconds);
    const actualRecovered = Math.min(currentFatigue, pointsToRecover);
    const newFatigue = currentFatigue - actualRecovered;
    lastPassiveStaminaCheck = Date.now() - ((elapsedSeconds % intervalSeconds) * 1000);
    if (actualRecovered > 0) {
      runSqlRaw(`UPDATE player_state SET fatigue = ${newFatigue} WHERE player_id = '${player.player_id}';`);
      player.fatigue = newFatigue;
    }
  }
  return player;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`File not found: ${path.basename(filePath)}`);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  // Delegate to Modular Controller Router if present
  if (globalThis.__GRAND_STRATEGY_ROUTER__) {
    try {
      const handled = await globalThis.__GRAND_STRATEGY_ROUTER__.handle(req, res);
      if (handled) return;
    } catch (err) {
      console.error('[Modular Router Error]:', err);
    }
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // -------------------------------------------------------------
  // API ROUTING
  // -------------------------------------------------------------

  // 1. GET /api/status - Complete Overview State
  if (req.method === 'GET' && pathname === '/api/status') {
    try {
      const meta = runSqlJson(`SELECT * FROM campaign_meta LIMIT 1;`)[0] || {};
      let player = runSqlJson(`SELECT * FROM player_state LIMIT 1;`)[0] || {};
      player = processPassiveStaminaRecovery(player);
      const skills = runSqlJson(`SELECT * FROM player_skills ORDER BY tier DESC, current_exp DESC;`);
      const invSummary = runSqlJson(`SELECT COUNT(*) as item_count, TOTAL(quantity * unit_cost_basis) as inv_val FROM inventory_items;`)[0] || { item_count: 0, inv_val: 0 };
      const bizCount = runSqlJson(`SELECT COUNT(*) as count FROM businesses;`)[0]?.count || 0;
      const npcs = runSqlJson(`SELECT COUNT(*) as count FROM npc_state;`)[0]?.count || 0;

      // Equipment bonuses & effective stats calculation
      const eqpRows = runSqlJson(`
        SELECT slot_type, item_code, custom_name, stat_modifiers 
        FROM character_equipment 
        WHERE character_id = 'PLY-0001';
      `);
      const eqpBonuses = { war: 0, ldr: 0, int: 0, pol: 0, dip: 0, com: 0, log: 0, cra: 0 };
      for (const eq of eqpRows) {
        try {
          const mods = typeof eq.stat_modifiers === 'string' ? JSON.parse(eq.stat_modifiers) : (eq.stat_modifiers || {});
          for (const [k, v] of Object.entries(mods)) {
            const normK = k.toLowerCase().replace(/_attr$|_exp$/, '').trim();
            if (eqpBonuses.hasOwnProperty(normK)) {
              eqpBonuses[normK] += Math.min(5, Math.max(1, Math.round(Number(v) || 0)));
            }
          }
        } catch (e) {}
      }
      const effectiveStats = {};
      const isOver100 = {};
      const attrs = ['war', 'ldr', 'int', 'pol', 'dip', 'com', 'log', 'cra'];
      for (const a of attrs) {
        const base = Number(player[`${a}_attr`] || 50);
        const eff = base + (eqpBonuses[a] || 0);
        effectiveStats[a] = eff;
        isOver100[a] = eff > 100;
      }

      const liquidCash = Number(player.liquid_cash || 0);
      const safeCash = Number(player.safe_cash || 0);
      const invVal = Math.round(Number(invSummary.inv_val || 0));
      const fixedCap = Number(player.fixed_capital || 0);
      const netWorth = liquidCash + safeCash + invVal + fixedCap;

      sendJson(res, 200, {
        success: true,
        meta,
        player,
        skills,
        equipment: {
          items: eqpRows,
          bonuses: eqpBonuses,
          effectiveStats,
          isOver100
        },
        financials: {
          liquidCash,
          safeCash,
          totalCash: liquidCash + safeCash,
          inventoryValue: invVal,
          fixedCapital: fixedCap,
          netWorth,
          itemCount: invSummary.item_count,
          bizCount,
          npcCount: npcs
        }
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 1b. POST /api/player/stamina-tick - Stamina Regeneration over Time
  if (req.method === 'POST' && pathname === '/api/player/stamina-tick') {
    try {
      let player = runSqlJson(`SELECT player_id, war_attr, health, fatigue FROM player_state LIMIT 1;`)[0];
      if (!player) {
        sendJson(res, 404, { success: false, error: 'Player not found' });
        return;
      }
      const fatigue = Number(player.fatigue || 0);
      if (fatigue <= 0) {
        sendJson(res, 200, { success: true, recovered: 0, fatigue: 0 });
        return;
      }
      const newFatigue = Math.max(0, fatigue - 1);
      lastPassiveStaminaCheck = Date.now();
      runSqlRaw(`UPDATE player_state SET fatigue = ${newFatigue} WHERE player_id = '${player.player_id}';`);
      sendJson(res, 200, { success: true, recovered: 1, fatigue: newFatigue });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 2. GET /api/inventory - Inventory & Stock Movements
  if (req.method === 'GET' && pathname === '/api/inventory') {
    try {
      const items = runSqlJson(`SELECT * FROM inventory_items ORDER BY category ASC, quantity DESC;`);
      const movements = runSqlJson(`SELECT * FROM stock_movements ORDER BY rowid DESC LIMIT 30;`);
      sendJson(res, 200, { success: true, items, movements });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 3. GET /api/ledger - Cashflow Ledger & Double-Entry Journal
  if (req.method === 'GET' && pathname === '/api/ledger') {
    try {
      const cashflow = runSqlJson(`SELECT * FROM cashflow_ledger ORDER BY game_date DESC, txn_id DESC LIMIT 50;`);
      const journal = runSqlJson(`SELECT * FROM account_journal ORDER BY entry_id DESC LIMIT 60;`);
      sendJson(res, 200, { success: true, cashflow, journal });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4. GET /api/npcs - Retainers, NPCs & Businesses
  if (req.method === 'GET' && pathname === '/api/npcs') {
    try {
      const npcs = runSqlJson(`SELECT * FROM npc_state ORDER BY assigned_business_id ASC, loyalty DESC;`);
      const allSkills = runSqlJson(`SELECT * FROM npc_skills;`);
      const businesses = runSqlJson(`SELECT * FROM businesses;`);

      const npcList = npcs.map(n => {
        const skills = allSkills.filter(s => s.npc_id === n.npc_id);
        let talents = [];
        try { talents = JSON.parse(n.talents || '[]'); } catch (e) {}
        return { ...n, talents, skills };
      });

      sendJson(res, 200, { success: true, npcs: npcList, businesses });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4b. GET /api/npcs/journey - NPC Autonomous Journey Logs & Milestones
  if (req.method === 'GET' && pathname === '/api/npcs/journey') {
    try {
      const npcId = parsedUrl.query.npcId;
      const limit = parseInt(parsedUrl.query.limit || '25', 10);
      const where = npcId ? `WHERE j.npc_id = '${npcId.replace(/'/g, "''")}'` : '';
      const logs = runSqlJson(`
        SELECT j.*, coalesce(n.name, m.name_vi, j.npc_id) as npc_name
        FROM npc_journey_logs j
        LEFT JOIN npc_state n ON j.npc_id = n.npc_id
        LEFT JOIN master_characters m ON j.npc_id = m.npc_id
        ${where}
        ORDER BY j.rowid DESC
        LIMIT ${limit};
      `);
      sendJson(res, 200, { success: true, logs });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4c. GET /api/npcs/progression - Living World Ambitions & Personal Growth
  if (req.method === 'GET' && pathname === '/api/npcs/progression') {
    try {
      const progressions = runSqlJson(`
        SELECT p.*, coalesce(n.name, m.name_vi, p.npc_id) as npc_name,
               coalesce(n.assigned_role, 'HISTORICAL') as role,
               coalesce(n.war_attr, m.war_attr, 50) as war_attr,
               coalesce(n.int_attr, m.int_attr, 50) as int_attr
        FROM npc_personal_progression p
        LEFT JOIN npc_state n ON p.npc_id = n.npc_id
        LEFT JOIN master_characters m ON p.npc_id = m.npc_id
        ORDER BY p.prestige DESC;
      `);
      sendJson(res, 200, { success: true, progressions });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4d. POST /api/npcs/simulate-journey - Trigger Autonomous Monthly Living World Progression
  if (req.method === 'POST' && pathname === '/api/npcs/simulate-journey') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      if (gsm && gsm.npcLifecycle) {
        const meta = runSqlJson(`SELECT active_turn, current_date FROM campaign_meta LIMIT 1;`)[0] || { active_turn: 6, current_date: '184-05-01' };
        const logs = gsm.npcLifecycle.simulateAllActiveNpcs(meta.active_turn, meta.current_date);
        sendJson(res, 200, { success: true, generatedLogsCount: logs.length, logs });
      } else {
        sendJson(res, 400, { success: false, error: 'NPC Lifecycle Module not active' });
      }
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4e. GET /api/npcs/career-shifts - Career Paradigm Shifts (Đột Phá Thân Phận)
  if (req.method === 'GET' && pathname === '/api/npcs/career-shifts') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      const shifts = gsm && gsm.npcLifecycle ? gsm.npcLifecycle.getCareerShifts() : runSqlJson(`
        SELECT s.*, coalesce(n.name, m.name_vi, s.npc_id) as npc_name
        FROM npc_career_shifts s
        LEFT JOIN npc_state n ON s.npc_id = n.npc_id
        LEFT JOIN master_characters m ON s.npc_id = m.npc_id
        ORDER BY s.rowid DESC LIMIT 30;
      `);
      sendJson(res, 200, { success: true, shifts });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4f. GET /api/npcs/peer-relations - Cross-NPC Peer Relational Mesh (Tương Tác Chéo)
  if (req.method === 'GET' && pathname === '/api/npcs/peer-relations') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      const relations = gsm && gsm.npcLifecycle ? gsm.npcLifecycle.getPeerRelations() : runSqlJson(`
        SELECT p.*,
               coalesce(na.name, ma.name_vi, p.npc_id_a) as name_a,
               coalesce(nb.name, mb.name_vi, p.npc_id_b) as name_b
        FROM npc_peer_relations p
        LEFT JOIN npc_state na ON p.npc_id_a = na.npc_id
        LEFT JOIN master_characters ma ON p.npc_id_a = ma.npc_id
        LEFT JOIN npc_state nb ON p.npc_id_b = nb.npc_id
        LEFT JOIN master_characters mb ON p.npc_id_b = mb.npc_id
        ORDER BY p.affinity DESC;
      `);
      sendJson(res, 200, { success: true, relations });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4g. GET /api/factions - Grand Strategy Factions & Territory Overview
  if (req.method === 'GET' && pathname === '/api/factions') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      const factions = gsm && gsm.factionPolitics ? gsm.factionPolitics.getFactionOverview() : runSqlJson(`
        SELECT 
          f.faction_id as factionId,
          f.name_vi as nameVi,
          f.name_en as nameEn,
          f.leader_id as leaderId,
          f.capital_settlement_id as capitalSettlementId,
          f.treasury_cash as treasuryCash,
          f.granary_grain as granaryGrain,
          f.military_power as militaryPower,
          f.prestige,
          f.ideology,
          f.color_hex as colorHex,
          COUNT(DISTINCT s.settlement_id) as settlementCount,
          COUNT(DISTINCT o.officer_id) as officerCount
        FROM session_factions f
        LEFT JOIN session_settlements s ON f.faction_id = s.ruler_faction_id
        LEFT JOIN faction_officers o ON f.faction_id = o.faction_id
        GROUP BY f.faction_id
        ORDER BY f.prestige DESC;
      `);
      sendJson(res, 200, { success: true, factions });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4h. GET /api/factions/officers - Faction Officers, Loyalty & Ambition Tension
  if (req.method === 'GET' && pathname === '/api/factions/officers') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      const factionId = parsedUrl.query.factionId;
      const officers = gsm && gsm.factionPolitics ? gsm.factionPolitics.getOfficers(factionId) : runSqlJson(`
        SELECT 
          fo.officer_id as officerId,
          fo.faction_id as factionId,
          sf.name_vi as factionNameVi,
          fo.court_rank as courtRank,
          fo.loyalty,
          fo.ambition,
          fo.appointed_settlement_id as appointedSettlementId,
          ss.name_vi as appointedSettlementName,
          fo.betrayal_risk as betrayalRisk,
          CASE 
            WHEN fo.officer_id = 'PLY-0001' THEN 'Lương Diễn (Người Chơi)'
            ELSE COALESCE(mc.name_vi, ns.name, fo.officer_id)
          END as officerName,
          coalesce(np.prestige, 50) as personalPrestige,
          coalesce(np.personal_troops, 0) as personalTroops
        FROM faction_officers fo
        JOIN session_factions sf ON fo.faction_id = sf.faction_id
        LEFT JOIN session_settlements ss ON fo.appointed_settlement_id = ss.settlement_id
        LEFT JOIN npc_state ns ON fo.officer_id = ns.npc_id
        LEFT JOIN master_characters mc ON fo.officer_id = mc.npc_id
        LEFT JOIN npc_personal_progression np ON fo.officer_id = np.npc_id
        ${factionId ? `WHERE fo.faction_id = '${factionId.replace(/'/g, "''")}'` : ''}
        ORDER BY fo.betrayal_risk DESC;
      `);
      sendJson(res, 200, { success: true, officers });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4i. GET /api/factions/settlements - 18 Regional Citadels & Governance
  if (req.method === 'GET' && pathname === '/api/factions/settlements') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      const settlements = gsm && gsm.factionPolitics ? gsm.factionPolitics.getSettlements() : runSqlJson(`
        SELECT 
          s.settlement_id as settlementId,
          s.name_vi as nameVi,
          s.name_en as nameEn,
          s.province_vi as provinceVi,
          s.ruler_faction_id as rulerFactionId,
          f.name_vi as factionNameVi,
          f.color_hex as factionColor,
          s.governor_id as governorId,
          coalesce(ns.name, 'Chưa bổ nhiệm') as governorName,
          s.public_order as publicOrder,
          s.garrison_troops as garrisonTroops,
          s.agriculture,
          s.commerce,
          s.defense
        FROM session_settlements s
        JOIN session_factions f ON s.ruler_faction_id = f.faction_id
        LEFT JOIN npc_state ns ON s.governor_id = ns.npc_id
        ORDER BY s.province_vi, s.name_vi;
      `);
      sendJson(res, 200, { success: true, settlements });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4j. GET /api/factions/events - Political Intrigues & Historical Crises
  if (req.method === 'GET' && pathname === '/api/factions/events') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      const limit = parseInt(parsedUrl.query.limit || '15', 10);
      const events = gsm && gsm.factionPolitics ? gsm.factionPolitics.getPoliticalEvents(limit) : runSqlJson(`
        SELECT * FROM faction_political_events ORDER BY created_at DESC LIMIT ${limit};
      `);
      sendJson(res, 200, { success: true, events });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4k. POST /api/factions/appoint-governor - Appoint Governor
  if (req.method === 'POST' && pathname === '/api/factions/appoint-governor') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { settlementId, officerId, factionId } = payload;
        if (!settlementId || !officerId || !factionId) {
          sendJson(res, 400, { success: false, error: 'settlementId, officerId, and factionId are required' });
          return;
        }
        const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
        if (gsm && gsm.factionPolitics) {
          const meta = runSqlJson(`SELECT active_turn, current_date FROM campaign_meta LIMIT 1;`)[0] || { active_turn: 6, current_date: '184-05-01' };
          const result = gsm.factionPolitics.appointGovernor(settlementId, officerId, factionId, meta.active_turn, meta.current_date);
          sendJson(res, 200, { success: true, result });
        } else {
          sendJson(res, 500, { success: false, error: 'FactionPolitics module not initialized' });
        }
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 4l. POST /api/factions/invest-title - Invest Title & Promote Rank
  if (req.method === 'POST' && pathname === '/api/factions/invest-title') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { officerId, factionId, newRank } = payload;
        if (!officerId || !factionId || !newRank) {
          sendJson(res, 400, { success: false, error: 'officerId, factionId, and newRank are required' });
          return;
        }
        const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
        if (gsm && gsm.factionPolitics) {
          const meta = runSqlJson(`SELECT active_turn, current_date FROM campaign_meta LIMIT 1;`)[0] || { active_turn: 6, current_date: '184-05-01' };
          const result = gsm.factionPolitics.investTitle(officerId, factionId, newRank, meta.active_turn, meta.current_date);
          sendJson(res, 200, { success: true, result });
        } else {
          sendJson(res, 500, { success: false, error: 'FactionPolitics module not initialized' });
        }
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 4m. POST /api/factions/grant-reward - Grant Treasury Reward to Assuage Ambition
  if (req.method === 'POST' && pathname === '/api/factions/grant-reward') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { officerId, factionId, amount } = payload;
        const rewardAmount = parseInt(amount || '300', 10);
        if (!officerId || !factionId) {
          sendJson(res, 400, { success: false, error: 'officerId and factionId are required' });
          return;
        }
        const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
        if (gsm && gsm.factionPolitics) {
          const meta = runSqlJson(`SELECT active_turn, current_date FROM campaign_meta LIMIT 1;`)[0] || { active_turn: 6, current_date: '184-05-01' };
          const result = gsm.factionPolitics.grantReward(officerId, factionId, rewardAmount, meta.active_turn, meta.current_date);
          sendJson(res, 200, { success: true, result });
        } else {
          sendJson(res, 500, { success: false, error: 'FactionPolitics module not initialized' });
        }
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 4n. POST /api/factions/simulate-politics - Simulate Internal Political Cycle
  if (req.method === 'POST' && pathname === '/api/factions/simulate-politics') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      if (gsm && gsm.factionPolitics) {
        const meta = runSqlJson(`SELECT active_turn, current_date FROM campaign_meta LIMIT 1;`)[0] || { active_turn: 6, current_date: '184-05-01' };
        const events = gsm.factionPolitics.simulatePoliticalCycle(meta.active_turn, meta.current_date);
        sendJson(res, 200, { success: true, count: events.length, events });
      } else {
        sendJson(res, 500, { success: false, error: 'FactionPolitics module not initialized' });
      }
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4o. GET /api/professions/nodes - Regional Gathering Nodes (Khai Mỏ, Hái Thuốc)
  if (req.method === 'GET' && pathname === '/api/professions/nodes') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      const settlementId = parsedUrl.query.settlementId;
      const nodes = gsm && gsm.professions ? gsm.professions.getGatheringNodes(settlementId) : runSqlJson(`
        SELECT * FROM gathering_nodes ${settlementId ? `WHERE settlement_id = '${settlementId.replace(/'/g, "''")}'` : ''} ORDER BY settlement_id;
      `);
      sendJson(res, 200, { success: true, nodes });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4p. GET /api/professions/character - Character Disciplines & Tiers
  if (req.method === 'GET' && pathname === '/api/professions/character') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      const characterId = parsedUrl.query.characterId || 'PLY-0001';
      const professions = gsm && gsm.professions ? gsm.professions.getCharacterProfessions(characterId) : runSqlJson(`
        SELECT * FROM character_professions WHERE character_id = '${characterId.replace(/'/g, "''")}' ORDER BY is_primary DESC, tier DESC;
      `);
      sendJson(res, 200, { success: true, characterId, professions });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4q. GET /api/professions/innovations - Emergent Innovations (Sáng Tạo Nghề Mới)
  if (req.method === 'GET' && pathname === '/api/professions/innovations') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      const characterId = parsedUrl.query.characterId;
      const innovations = gsm && gsm.professions ? gsm.professions.getInnovations(characterId) : runSqlJson(`
        SELECT * FROM emergent_innovations ${characterId ? `WHERE character_id = '${characterId.replace(/'/g, "''")}'` : ''} ORDER BY created_at DESC;
      `);
      sendJson(res, 200, { success: true, innovations });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4r. POST /api/professions/gather - Action: Gather Resource at Node
  if (req.method === 'POST' && pathname === '/api/professions/gather') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const characterId = payload.characterId || 'PLY-0001';
        const nodeId = payload.nodeId;
        if (!nodeId) {
          sendJson(res, 400, { success: false, error: 'nodeId is required' });
          return;
        }
        const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
        if (gsm && gsm.professions) {
          const meta = runSqlJson(`SELECT active_turn, current_date FROM campaign_meta LIMIT 1;`)[0] || { active_turn: 6, current_date: '184-05-01' };
          const result = gsm.professions.gatherResource(characterId, nodeId, meta.active_turn, meta.current_date);
          sendJson(res, 200, { success: true, result });
        } else {
          sendJson(res, 500, { success: false, error: 'Professions module not initialized' });
        }
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 4s. POST /api/professions/synthesize - Action: Trigger Emergent Innovation Breakthrough
  if (req.method === 'POST' && pathname === '/api/professions/synthesize') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const characterId = payload.characterId || 'PLY-0001';
        const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
        if (gsm && gsm.professions) {
          const meta = runSqlJson(`SELECT active_turn, current_date FROM campaign_meta LIMIT 1;`)[0] || { active_turn: 6, current_date: '184-05-01' };
          const innovation = gsm.professions.checkAndTriggerBreakthrough(characterId, meta.active_turn, meta.current_date);
          sendJson(res, 200, { success: true, innovation });
        } else {
          sendJson(res, 500, { success: false, error: 'Professions module not initialized' });
        }
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 4s1. GET /api/equipment - Inspect Character Equipment & Warehouse Compatibility
  if (req.method === 'GET' && pathname === '/api/equipment') {
    try {
      const characterId = parsedUrl.query.characterId || 'PLY-0001';
      const isPlayer = characterId.startsWith('PLY');
      let charName = 'Lương Diễn';
      let styleName = 'Chí Viễn';
      let baseAttrs = { war: 58, ldr: 70, int: 80, pol: 68, dip: 74, com: 78, log: 70, cra: 62 };

      if (isPlayer) {
        const p = runSqlJson(`SELECT * FROM player_state WHERE player_id = '${characterId.replace(/'/g, "''")}' LIMIT 1;`)[0];
        if (p) {
          charName = p.name === 'Liang Yan' ? 'Lương Diễn' : (p.name || 'Lương Diễn');
          styleName = p.style_name || 'Chí Viễn';
          baseAttrs = {
            war: Number(p.war_attr || 58),
            ldr: Number(p.ldr_attr || 70),
            int: Number(p.int_attr || 80),
            pol: Number(p.pol_attr || 68),
            dip: Number(p.dip_attr || 74),
            com: Number(p.com_attr || 78),
            log: Number(p.log_attr || 70),
            cra: Number(p.cra_attr || 62)
          };
        }
      } else {
        const npc = runSqlJson(`SELECT * FROM npc_state WHERE npc_id = '${characterId.replace(/'/g, "''")}' LIMIT 1;`)[0];
        if (npc) {
          charName = npc.name;
          styleName = '';
          baseAttrs = {
            war: Number(npc.war_attr || 50),
            ldr: Number(npc.ldr_attr || 50),
            int: Number(npc.int_attr || 50),
            pol: Number(npc.pol_attr || 50),
            dip: Number(npc.dip_attr || 50),
            com: Number(npc.com_attr || 50),
            log: Number(npc.log_attr || 50),
            cra: Number(npc.cra_attr || 50)
          };
        }
      }

      const rows = runSqlJson(`
        SELECT ce.*, mi.name_vi, mi.name_en, mi.category
        FROM character_equipment ce
        LEFT JOIN master_items mi ON ce.item_code = mi.item_code
        WHERE ce.character_id = '${characterId.replace(/'/g, "''")}';
      `);

      const slots = { WEAPON: null, ARMOR: null, STEED: null, TREASURE: null };
      const equipmentBuffs = { war: 0, ldr: 0, int: 0, pol: 0, dip: 0, com: 0, log: 0, cra: 0 };

      for (const r of rows) {
        let mods = {};
        try { mods = typeof r.stat_modifiers === 'string' ? JSON.parse(r.stat_modifiers) : r.stat_modifiers; } catch (e) {}
        const clampedMods = {};
        for (const [k, v] of Object.entries(mods)) {
          const normK = k.toLowerCase().replace(/_attr$|_exp$/, '').trim();
          const clamped = Math.min(5, Math.max(1, Math.round(Number(v) || 0)));
          clampedMods[normK] = clamped;
          if (equipmentBuffs.hasOwnProperty(normK)) {
            equipmentBuffs[normK] += clamped;
          }
        }
        slots[r.slot_type] = {
          id: r.id,
          characterId: r.character_id,
          slotType: r.slot_type,
          itemCode: r.item_code,
          customName: r.custom_name || r.name_vi,
          nameVi: r.name_vi || r.custom_name || r.item_code,
          nameEn: r.name_en || r.item_code,
          quality: 'NORMAL',
          statModifiers: clampedMods,
          slotIcon: r.slot_type === 'WEAPON' ? '⚔️' : r.slot_type === 'ARMOR' ? '🛡️' : r.slot_type === 'STEED' ? '🐎' : '📜',
          slotLabelVi: r.slot_type === 'WEAPON' ? 'Binh Khí' : r.slot_type === 'ARMOR' ? 'Khôi Giáp' : r.slot_type === 'STEED' ? 'Chiến Mã' : 'Bảo Vật'
        };
      }

      const effectiveAttributes = {};
      const exceedsLimit = {};
      for (const [k, baseVal] of Object.entries(baseAttrs)) {
        const total = baseVal + (equipmentBuffs[k] || 0);
        effectiveAttributes[k] = total;
        exceedsLimit[k] = total > 100;
      }

      const compatible = runSqlJson(`
        SELECT ii.item_code, ii.quantity, ii.unit_cost_basis, mi.name_vi, mi.name_en, mi.category, mi.stat_modifiers
        FROM inventory_items ii
        JOIN master_items mi ON ii.item_code = mi.item_code
        WHERE ii.quantity > 0 AND (
          mi.category IN ('WEAPON', 'ARMOR', 'STEED', 'TREASURE', 'EQUIPMENT') OR
          ii.item_code LIKE 'COM-SWORD%' OR
          ii.item_code LIKE 'COM-SPEAR%' OR
          ii.item_code LIKE 'PROD-SHIELD%' OR
          ii.item_code LIKE 'EQP-%' OR
          ii.item_code LIKE 'GOD-%'
        );
      `);

      sendJson(res, 200, {
        success: true,
        overview: {
          characterId,
          characterName: charName,
          styleName,
          isPlayer,
          baseAttributes: baseAttrs,
          equipmentBuffs,
          effectiveAttributes,
          exceedsLimit,
          slots
        },
        compatibleWarehouseItems: compatible
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4s2. POST /api/equipment/equip - Equip Item into Designated Slot
  if (req.method === 'POST' && pathname === '/api/equipment/equip') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const characterId = payload.characterId || 'PLY-0001';
        const slotType = (payload.slotType || '').toUpperCase().trim();
        const itemCode = payload.itemCode;
        let customName = payload.customName || '';
        let statMods = payload.statModifiers || {};

        if (!slotType || !itemCode) {
          sendJson(res, 400, { success: false, error: 'slotType and itemCode are required.' });
          return;
        }

        // Clamp modifiers strictly between 1 and 5
        const clampedMods = {};
        for (const [k, v] of Object.entries(statMods)) {
          const normK = k.toLowerCase().replace(/_attr$|_exp$/, '').trim();
          clampedMods[normK] = Math.min(5, Math.max(1, Math.round(Number(v) || 1)));
        }

        // Fetch master item details if mods empty
        if (Object.keys(clampedMods).length === 0) {
          const mItem = runSqlJson(`SELECT * FROM master_items WHERE item_code = '${itemCode.replace(/'/g, "''")}' LIMIT 1;`)[0];
          if (mItem) {
            if (!customName) customName = mItem.name_vi;
            if (mItem.stat_modifiers) {
              try {
                const parsed = JSON.parse(mItem.stat_modifiers);
                for (const [k, v] of Object.entries(parsed)) {
                  clampedMods[k.toLowerCase()] = Math.min(5, Math.max(1, Math.round(Number(v) || 1)));
                }
              } catch (e) {}
            }
          }
        }
        if (Object.keys(clampedMods).length === 0) {
          clampedMods.war = 2; // Default fallback buff
        }

        const modsJson = JSON.stringify(clampedMods).replace(/'/g, "''");
        const safeName = customName.replace(/'/g, "''");

        runSqlRaw(`
          INSERT INTO character_equipment (character_id, slot_type, item_code, custom_name, stat_modifiers)
          VALUES ('${characterId.replace(/'/g, "''")}', '${slotType}', '${itemCode.replace(/'/g, "''")}', '${safeName}', '${modsJson}')
          ON CONFLICT(character_id, slot_type) DO UPDATE SET
            item_code = excluded.item_code,
            custom_name = excluded.custom_name,
            stat_modifiers = excluded.stat_modifiers,
            equipped_at = CURRENT_TIMESTAMP;
        `);

        sendJson(res, 200, {
          success: true,
          characterId,
          slotType,
          itemCode,
          itemName: customName,
          statModifiers: clampedMods,
          messageVi: `Trang bị thành công ${customName} vào vị trí [${slotType}]!`
        });
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 4s3. POST /api/equipment/unequip - Unequip Slot
  if (req.method === 'POST' && pathname === '/api/equipment/unequip') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const characterId = payload.characterId || 'PLY-0001';
        const slotType = (payload.slotType || '').toUpperCase().trim();
        if (!slotType) {
          sendJson(res, 400, { success: false, error: 'slotType is required.' });
          return;
        }

        runSqlRaw(`
          DELETE FROM character_equipment 
          WHERE character_id = '${characterId.replace(/'/g, "''")}' AND slot_type = '${slotType}';
        `);

        sendJson(res, 200, {
          success: true,
          unequipped: true,
          slotType,
          messageVi: `Đã tháo trang bị khỏi vị trí [${slotType}] thành công.`
        });
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 4s4. POST /api/professions/forge/bespoke - Master Blacksmith Bespoke God Weapon Forging
  if (req.method === 'POST' && pathname === '/api/professions/forge/bespoke') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const characterId = payload.characterId || 'PLY-0001';
        const player = runSqlJson(`SELECT cra_attr, fatigue, cra_exp FROM player_state WHERE player_id = '${characterId.replace(/'/g, "''")}' LIMIT 1;`)[0] || {};
        const craAttr = Number(player.cra_attr || 50);
        const fatigue = Number(player.fatigue || 0);

        if (craAttr < 60) {
          sendJson(res, 400, {
            success: false,
            error: `Kỹ Nghệ (CRA) hiện tại là ${craAttr}, chưa đạt ngưỡng 60 của Đại Tượng Sư để rèn Thần Binh.`
          });
          return;
        }

        if (fatigue + 25 > 95) {
          sendJson(res, 400, {
            success: false,
            error: `Thể lực kiệt quệ (${fatigue}/100)! Không đủ khí lực kéo bễ đúc thần binh.`
          });
          return;
        }

        // Deduct materials from inventory if available
        runSqlRaw(`UPDATE inventory_items SET quantity = MAX(0, quantity - 5) WHERE item_code = 'RAW-IRON';`);
        runSqlRaw(`UPDATE inventory_items SET quantity = MAX(0, quantity - 5) WHERE item_code = 'RAW-COAL';`);
        runSqlRaw(`UPDATE inventory_items SET quantity = MAX(0, quantity - 2) WHERE item_code = 'RAW-TIMBER';`);
        runSqlRaw(`UPDATE inventory_items SET quantity = MAX(0, quantity - 2) WHERE item_code = 'RAW-LEATHER';`);

        // Deduct fatigue +25 & award EXP
        runSqlRaw(`UPDATE player_state SET fatigue = MIN(100, fatigue + 25), cra_exp = cra_exp + 45 WHERE player_id = '${characterId.replace(/'/g, "''")}';`);

        // Quality roll based on CRA
        const roll = Math.random() * 100;
        let quality = 'NORMAL';
        let qualityLabelVi = 'Phổ Thông Hảo Binh';
        let warBuff = 2;
        let ldrBuff = 1;

        if (craAttr >= 90 && roll > 60) {
          quality = 'LEGENDARY';
          qualityLabelVi = 'Tuyệt Thế Thần Binh';
          warBuff = 5;
          ldrBuff = 2;
        } else if (craAttr >= 75 && roll > 40) {
          quality = 'MASTERWORK';
          qualityLabelVi = 'Bách Luyện Tinh Cương';
          warBuff = 4;
          ldrBuff = 2;
        } else if (roll > 30) {
          quality = 'FINE';
          qualityLabelVi = 'Tinh Luyện Thượng Phẩm';
          warBuff = 3;
          ldrBuff = 1;
        }

        // Enforce strict +1..+5 clamp
        warBuff = Math.min(5, Math.max(1, warBuff));
        ldrBuff = Math.min(5, Math.max(1, ldrBuff));

        const weaponType = payload.weaponType || 'BLADE';
        const customName = payload.customName || (quality === 'LEGENDARY' ? 'Thần Viêm Bảo Đao' : 'Bách Luyện Hảo Đao');
        const itemCode = `GOD-${weaponType}-${Date.now().toString().slice(-6)}`;
        const statModifiers = { war: warBuff, ldr: ldrBuff };

        // Save into master_items & inventory_items
        runSqlRaw(`
          INSERT INTO master_items (item_code, name_vi, name_en, category, stat_modifiers, baseline_peace_price, current_market_price)
          VALUES ('${itemCode}', '${customName.replace(/'/g, "''")}', 'God Weapon', 'WEAPON', '${JSON.stringify(statModifiers)}', 2000, 3000);
          INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
          VALUES ('${itemCode}', 'WEAPON', '${customName.replace(/'/g, "''")}', 1, 1500, 'Zhuo Workshop')
          ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + 1;
        `);

        // Auto equip if requested
        if (payload.targetDestination === 'EQUIP_IMMEDIATELY') {
          runSqlRaw(`
            INSERT INTO character_equipment (character_id, slot_type, item_code, custom_name, stat_modifiers)
            VALUES ('${characterId.replace(/'/g, "''")}', 'WEAPON', '${itemCode}', '${customName.replace(/'/g, "''")}', '${JSON.stringify(statModifiers)}')
            ON CONFLICT(character_id, slot_type) DO UPDATE SET
              item_code = excluded.item_code,
              custom_name = excluded.custom_name,
              stat_modifiers = excluded.stat_modifiers,
              equipped_at = CURRENT_TIMESTAMP;
          `);
        }

        sendJson(res, 200, {
          success: true,
          itemCode,
          customName,
          nameVi: customName,
          quality,
          qualityLabelVi,
          statModifiers,
          fatigueConsumed: 25,
          expGained: 45,
          destination: payload.targetDestination || 'WAREHOUSE',
          messageVi: `Luyện thành thần binh [${customName}] phẩm cấp [${qualityLabelVi}] (+${warBuff} Võ Lực, +${ldrBuff} Thống Soái)!`
        });
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 4s5. POST /api/professions/forge/standard - Standard Armament Production
  if (req.method === 'POST' && pathname === '/api/professions/forge/standard') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const characterId = payload.characterId || 'PLY-0001';
        const armCode = payload.armamentCode || 'COM-SWORD';
        const qty = Math.max(1, parseInt(payload.quantity || 1, 10));

        const names = {
          'COM-SWORD': 'Hán Kiếm Tiêu Chuẩn',
          'COM-SPEAR': 'Thiết Thương Quân Dụng',
          'PROD-SHIELD-BAM': 'Thuẫn Mây Gia Cố',
          'EQP-ARMOR-LEATHER': 'Ngực Giáp Da Trâu'
        };
        const armName = names[armCode] || armCode;

        runSqlRaw(`
          INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
          VALUES ('${armCode}', 'EQUIPMENT', '${armName}', ${qty}, 35, 'Zhuo Workshop')
          ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + ${qty};
          UPDATE player_state SET fatigue = MIN(100, fatigue + ${10 * qty}), cra_exp = cra_exp + ${15 * qty} WHERE player_id = '${characterId.replace(/'/g, "''")}';
        `);

        sendJson(res, 200, {
          success: true,
          armamentCode: armCode,
          nameVi: armName,
          quantity: qty,
          fatigueConsumed: 10 * qty,
          messageVi: `Rèn thành công ${qty} ${armName} nhập vào kho vũ khí!`
        });
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 4s6. GET /api/enterprise/status - Active Businesses & Labor Options
  if (req.method === 'GET' && pathname === '/api/enterprise/status') {
    try {
      const characterId = parsedUrl.query.characterId || 'PLY-0001';
      const player = runSqlJson(`SELECT liquid_cash, fatigue, cra_attr, com_attr, log_attr FROM player_state WHERE player_id = '${characterId.replace(/'/g, "''")}' LIMIT 1;`)[0] || {};
      const activeBusinesses = runSqlJson(`
        SELECT business_id, name, owner_character_id, location, business_type, workforce_count, daily_revenue_avg, monthly_rent, safe_cash
        FROM businesses
        WHERE owner_character_id = '${characterId.replace(/'/g, "''")}';
      `);

      sendJson(res, 200, {
        success: true,
        status: {
          characterId,
          playerCash: Number(player.liquid_cash || 0),
          playerFatigue: Number(player.fatigue || 0),
          activeEnterprises: activeBusinesses,
          totalDailyRevenue: activeBusinesses.reduce((s, b) => s + (Number(b.daily_revenue_avg) || 0), 0),
          totalWorkforce: activeBusinesses.reduce((s, b) => s + (Number(b.workforce_count) || 0), 0)
        }
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4s7. POST /api/enterprise/work - Take Wage Labor Shift
  if (req.method === 'POST' && pathname === '/api/enterprise/work') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const characterId = payload.characterId || 'PLY-0001';
        const shiftId = payload.shiftId;

        const shifts = {
          JOB_TAVERN_COOK: { title: 'Đầu Bếp Quán Rượu', wage: 65, fatigue: 15, attr: 'cra', exp: 15 },
          JOB_TAVERN_STAFF: { title: 'Tiểu Nhị Tửu Quán', wage: 40, fatigue: 10, attr: 'com', exp: 10 },
          JOB_APOTHECARY_COMPOUNDER: { title: 'Dược Đồng Bào Chế', wage: 60, fatigue: 15, attr: 'cra', exp: 15 },
          JOB_HERB_GATHERER: { title: 'Thái Dược Sơn Dân', wage: 45, fatigue: 15, attr: 'log', exp: 15 },
          JOB_FORGE_HAND: { title: 'Phụ Lò Rèn', wage: 75, fatigue: 20, attr: 'cra', exp: 20 },
          JOB_WEAVER: { title: 'Thợ Dệt Vải Gai', wage: 50, fatigue: 10, attr: 'cra', exp: 10 }
        };

        const job = shifts[shiftId] || shifts.JOB_TAVERN_COOK;
        const player = runSqlJson(`SELECT fatigue, liquid_cash FROM player_state WHERE player_id = '${characterId.replace(/'/g, "''")}' LIMIT 1;`)[0] || {};
        const currentFatigue = Number(player.fatigue || 0);

        if (currentFatigue + job.fatigue > 95) {
          sendJson(res, 400, {
            success: false,
            error: `Khí lực kiệt quệ (${currentFatigue}/100)! Không đủ sức làm trọn ca ${job.title}. Cần nghỉ ngơi hồi phục.`
          });
          return;
        }

        const newFatigue = currentFatigue + job.fatigue;
        const newCash = Number(player.liquid_cash || 0) + job.wage;
        const currentDate = runSqlJson(`SELECT current_date FROM campaign_meta LIMIT 1;`)[0]?.current_date || '184-05-02';

        runSqlRaw(`
          UPDATE player_state 
          SET fatigue = ${newFatigue}, liquid_cash = ${newCash}, ${job.attr}_exp = ${job.attr}_exp + ${job.exp} 
          WHERE player_id = '${characterId.replace(/'/g, "''")}';
          INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo)
          VALUES ('TXN-WAGE-${Date.now()}', '${currentDate}', 'Chủ quán bản địa', ${job.wage}, 0, ${newCash}, 'Tiền công ca làm thuê: ${job.title}');
        `);

        sendJson(res, 200, {
          success: true,
          shiftId,
          titleVi: job.title,
          wagePaid: job.wage,
          fatigueConsumed: job.fatigue,
          remainingStamina: Math.max(0, 100 - newFatigue),
          newBalance: newCash,
          expGained: job.exp,
          messageVi: `Hoàn tất ca làm việc [${job.title}]! Nhận +${job.wage} Tiền công và +${job.exp} EXP.`
        });
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 4s8. POST /api/enterprise/open - Open New Enterprise
  if (req.method === 'POST' && pathname === '/api/enterprise/open') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const characterId = payload.characterId || 'PLY-0001';
        const bType = payload.businessType || 'TAVERN';
        const configs = {
          WORKSHOP: { name: 'Xưởng Dệt & Chế Tác', capital: 1000, rent: 200, rev: 140, staff: 4 },
          TAVERN: { name: 'Tửu Quán & Khách Điếm', capital: 1500, rent: 250, rev: 200, staff: 3 },
          APOTHECARY: { name: 'Dược Điếm & Y Quán', capital: 1200, rent: 220, rev: 180, staff: 2 },
          BLACKSMITH: { name: 'Lò Rèn Bách Nghệ', capital: 2000, rent: 300, rev: 260, staff: 4 }
        };
        const cfg = configs[bType] || configs.TAVERN;
        const name = payload.customName || cfg.name;
        const player = runSqlJson(`SELECT liquid_cash FROM player_state WHERE player_id = '${characterId.replace(/'/g, "''")}' LIMIT 1;`)[0] || {};
        const cash = Number(player.liquid_cash || 0);

        if (cash < cfg.capital) {
          sendJson(res, 400, {
            success: false,
            error: `Ngân quỹ không đủ! Cần tối thiểu ${cfg.capital} Tiền vốn khởi nghiệp (hiện có ${cash} Tiền).`
          });
          return;
        }

        const newCash = cash - cfg.capital;
        const bId = `BIZ-${Date.now().toString().slice(-4)}`;
        const currentDate = runSqlJson(`SELECT current_date FROM campaign_meta LIMIT 1;`)[0]?.current_date || '184-05-02';

        runSqlRaw(`
          UPDATE player_state SET liquid_cash = ${newCash} WHERE player_id = '${characterId.replace(/'/g, "''")}';
          INSERT INTO businesses (business_id, name, owner_character_id, location, business_type, workforce_count, daily_revenue_avg, monthly_rent, safe_cash)
          VALUES ('${bId}', '${name.replace(/'/g, "''")}', '${characterId.replace(/'/g, "''")}', 'LOC-0001', '${bType}', ${cfg.staff}, ${cfg.rev}, ${cfg.rent}, ${cfg.capital});
          INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo)
          VALUES ('TXN-BIZ-${Date.now()}', '${currentDate}', 'Khai trương ${name.replace(/'/g, "''")}', 0, ${cfg.capital}, ${newCash}, 'Đầu tư mở cơ sở kinh doanh ${name.replace(/'/g, "''")}');
        `);

        sendJson(res, 200, {
          success: true,
          businessId: bId,
          type: bType,
          name,
          initialCapital: cfg.capital,
          remainingPlayerCash: newCash,
          messageVi: `Chúc mừng! Khai trương thành công cơ sở [${name}] với ${cfg.capital} Tiền vốn an toàn!`
        });
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 4t. GET /api/ecology/crises - Regional Ecological Disasters & Peasant Uprisings
  if (req.method === 'GET' && pathname === '/api/ecology/crises') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      const crises = gsm && gsm.ecologyLogistics ? gsm.ecologyLogistics.getCrises() : runSqlJson(`
        SELECT * FROM regional_ecological_crises WHERE is_active = 1 ORDER BY severity_level DESC;
      `);
      sendJson(res, 200, { success: true, crises });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4u. GET /api/logistics/caravans - Macro Trade Caravans on Regional Routes
  if (req.method === 'GET' && pathname === '/api/logistics/caravans') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      const caravans = gsm && gsm.ecologyLogistics ? gsm.ecologyLogistics.getCaravans() : runSqlJson(`
        SELECT c.*, sf.name_vi as ownerFactionName FROM trade_caravans c
        JOIN session_factions sf ON c.owner_faction_id = sf.faction_id ORDER BY c.route_progress DESC;
      `);
      sendJson(res, 200, { success: true, caravans });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4v. GET /api/logistics/strongholds - Bandit Strongholds & Plundered Wealth
  if (req.method === 'GET' && pathname === '/api/logistics/strongholds') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      const strongholds = gsm && gsm.ecologyLogistics ? gsm.ecologyLogistics.getBanditStrongholds() : runSqlJson(`
        SELECT * FROM bandit_strongholds ORDER BY status ASC, plundered_wealth DESC;
      `);
      sendJson(res, 200, { success: true, strongholds });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 4w. POST /api/ecology/relief - Action: Dispatch Grain Relief to Quell Crisis
  if (req.method === 'POST' && pathname === '/api/ecology/relief') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const settlementId = payload.settlementId;
        const grainAmount = parseFloat(payload.grainAmount || '5.0');
        if (!settlementId) {
          sendJson(res, 400, { success: false, error: 'settlementId is required' });
          return;
        }
        const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
        if (gsm && gsm.ecologyLogistics) {
          const meta = runSqlJson(`SELECT active_turn, current_date FROM campaign_meta LIMIT 1;`)[0] || { active_turn: 6, current_date: '184-05-01' };
          const result = gsm.ecologyLogistics.dispatchGrainRelief(settlementId, grainAmount, meta.active_turn, meta.current_date);
          sendJson(res, 200, { success: true, result });
        } else {
          sendJson(res, 500, { success: false, error: 'EcologyLogistics module not initialized' });
        }
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 4x. POST /api/logistics/attack-stronghold - Action: Attack Bandit Lair & Claim Bounty
  if (req.method === 'POST' && pathname === '/api/logistics/attack-stronghold') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const strongholdId = payload.strongholdId;
        if (!strongholdId) {
          sendJson(res, 400, { success: false, error: 'strongholdId is required' });
          return;
        }
        const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
        if (gsm && gsm.ecologyLogistics) {
          const meta = runSqlJson(`SELECT active_turn, current_date FROM campaign_meta LIMIT 1;`)[0] || { active_turn: 6, current_date: '184-05-01' };
          const result = gsm.ecologyLogistics.attackBanditStronghold('PLY-0001', strongholdId, meta.active_turn, meta.current_date);
          sendJson(res, 200, { success: true, result });
        } else {
          sendJson(res, 500, { success: false, error: 'EcologyLogistics module not initialized' });
        }
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 4y. POST /api/ecology/simulate-turn - Action: Advance Ecology & Caravans Simulation
  if (req.method === 'POST' && pathname === '/api/ecology/simulate-turn') {
    try {
      const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
      if (gsm && gsm.ecologyLogistics) {
        const meta = runSqlJson(`SELECT active_turn, current_date FROM campaign_meta LIMIT 1;`)[0] || { active_turn: 6, current_date: '184-05-01' };
        const result = gsm.ecologyLogistics.simulateEcologyAndLogisticsTurn(meta.active_turn, meta.current_date);
        sendJson(res, 200, { success: true, result });
      } else {
        sendJson(res, 500, { success: false, error: 'EcologyLogistics module not initialized' });
      }
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }




  // 5. GET /api/audit - Comprehensive Invariant Audit
  if (req.method === 'GET' && pathname === '/api/audit') {
    try {
      const cashResult = auditSqliteCashflow();
      const invResult = auditSqliteInventory();
      const journalResult = auditDoubleEntryJournal();
      const projResult = auditProjectionSync(cashResult, invResult);
      const npcBizResult = auditNpcAndBusinesses();

      const totalChecks = cashResult.checksCount + invResult.checksCount + journalResult.checksCount + projResult.checksCount + npcBizResult.checksCount;
      const allErrors = [
        ...cashResult.errors,
        ...invResult.errors,
        ...journalResult.errors,
        ...projResult.errors,
        ...npcBizResult.errors
      ];

      sendJson(res, 200, {
        success: allErrors.length === 0,
        totalInvariantsVerified: totalChecks,
        discrepanciesCount: allErrors.length,
        errors: allErrors,
        sections: {
          cashflow: cashResult,
          inventory: invResult,
          journal: journalResult,
          projection: projResult,
          npcEnterprise: npcBizResult
        }
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 5b. GET /api/agent/logs - Agent Simulation Activity Feed
  if (req.method === 'GET' && pathname === '/api/agent/logs') {
    sendJson(res, 200, { success: true, logs: agentActivityStream });
    return;
  }

  // 5c. GET /api/chat/history - Continuous Story Chronicle Stream
  if (req.method === 'GET' && pathname === '/api/chat/history') {
    try {
      const rows = runSqlJson(`SELECT * FROM chat_chronicle ORDER BY rowid ASC;`);
      const history = (rows || []).map(r => {
        let diceBadge = null;
        let deltas = null;
        try { if (r.dice_badge) diceBadge = JSON.parse(r.dice_badge); } catch (e) {}
        try { if (r.deltas) deltas = JSON.parse(r.deltas); } catch (e) {}
        return {
          id: r.id,
          type: r.type,
          speaker: r.speaker,
          title: r.title,
          avatar: r.avatar,
          text: r.text,
          diceBadge,
          deltas,
          reasoning: r.reasoning || null,
          time: r.game_date ? `${r.game_date} • ${r.created_at ? r.created_at.substr(11, 5) : '00:00'}` : r.created_at
        };
      });
      sendJson(res, 200, { success: true, history });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 5d. POST /api/chat/turn - Save/Append Single Story Turn
  if (req.method === 'POST' && pathname === '/api/chat/turn') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const turn = JSON.parse(body || '{}');
        if (turn && turn.text) {
          const id = turn.id || `turn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          const type = turn.type || 'npc';
          const speaker = turn.speaker || '';
          const title = turn.title || '';
          const avatar = turn.avatar || '';
          const text = turn.text || '';
          const diceBadgeStr = turn.diceBadge ? JSON.stringify(turn.diceBadge) : null;
          const deltasStr = turn.deltas ? JSON.stringify(turn.deltas) : null;
          const reasoning = turn.reasoning || null;
          const gameDate = turn.gameDate || '184-05-02';

          const sql = `INSERT OR REPLACE INTO chat_chronicle (id, turn_number, game_date, type, speaker, title, avatar, text, dice_badge, deltas, reasoning)
            VALUES (
              '${id.replace(/'/g, "''")}',
              (SELECT COALESCE(active_turn, 1) FROM campaign_meta LIMIT 1),
              '${gameDate.replace(/'/g, "''")}',
              '${type.replace(/'/g, "''")}',
              '${speaker.replace(/'/g, "''")}',
              '${title.replace(/'/g, "''")}',
              '${avatar.replace(/'/g, "''")}',
              '${text.replace(/'/g, "''")}',
              ${diceBadgeStr ? `'${diceBadgeStr.replace(/'/g, "''")}'` : 'NULL'},
              ${deltasStr ? `'${deltasStr.replace(/'/g, "''")}'` : 'NULL'},
              ${reasoning ? `'${reasoning.replace(/'/g, "''")}'` : 'NULL'}
            );`;
          runSqlRaw(sql);
          sendJson(res, 200, { success: true, id });
        } else {
          sendJson(res, 400, { success: false, error: 'Empty turn or text missing' });
        }
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 5e. POST /api/chat/clear - Clear Story Chronicle
  if (req.method === 'POST' && pathname === '/api/chat/clear') {
    try {
      runSqlRaw(`DELETE FROM chat_chronicle;`);
      sendJson(res, 200, { success: true });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 5f. GET /api/game/summary - Active Playthrough Metadata & New Game Templates
  if (req.method === 'GET' && pathname === '/api/game/summary') {
    try {
      const summary = gameplayManager.getSessionSummary();
      const scenarios = gameplayManager.getMasterScenarios();
      const archetypes = gameplayManager.getMasterArchetypes();
      sendJson(res, 200, { success: true, summary, scenarios, archetypes });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 5g. POST /api/game/new - Start New Campaign Playthrough from Master Data
  if (req.method === 'POST' && pathname === '/api/game/new') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const result = gameplayManager.startNewGame(payload);
        sendJson(res, 200, { success: true, result });
      } catch (err) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    });
    return;
  }

  // 5h. GET /api/master/catalog - Fast Query Catalog for Items, Recipes, Citadels, Characters, Events
  if (req.method === 'GET' && pathname === '/api/master/catalog') {
    try {
      const items = runSqlJson(`SELECT * FROM master_items;`);
      const recipes = runSqlJson(`SELECT * FROM master_recipes;`);
      const locations = runSqlJson(`SELECT * FROM master_locations;`);
      const characters = runSqlJson(`SELECT * FROM master_characters;`);
      const factions = runSqlJson(`SELECT * FROM master_factions;`);
      const skills = runSqlJson(`SELECT * FROM master_skills;`);
      const talents = runSqlJson(`SELECT * FROM master_talents;`);
      const routes = runSqlJson(`SELECT * FROM master_routes;`);
      const events = runSqlJson(`SELECT * FROM master_events ORDER BY historical_year ASC, event_id ASC;`);
      sendJson(res, 200, { success: true, catalog: { items, recipes, locations, characters, factions, skills, talents, routes, events } });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 5i. GRAND STRATEGY MODULAR ENGINE (Universe Architecture v4.0)
  if (pathname.startsWith('/api/strategy/')) {
    const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
    if (!gsm) {
      sendJson(res, 200, {
        success: true,
        modularEngineActive: false,
        message: 'Grand Strategy Modular Engine available via: npm run dev:server'
      });
      return;
    }

    // 5i-1. GET /api/strategy/modules
    if (req.method === 'GET' && pathname === '/api/strategy/modules') {
      const modules = gsm.registry.getAll().map(m => ({ id: m.id, name: m.name, version: m.version }));
      sendJson(res, 200, { success: true, modularEngineActive: true, modules });
      return;
    }

    // 5i-2. POST /api/strategy/supply-check
    if (req.method === 'POST' && pathname === '/api/strategy/supply-check') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const fromNode = payload.fromNode || 'LOC-0001';
          const supplyHub = payload.supplyHub || 'LOC-0002';
          const maxHops = payload.maxHops || 10;
          const hasSupply = gsm.military.graph.hasUnbrokenSupplyPath(fromNode, supplyHub, maxHops);
          sendJson(res, 200, { success: true, fromNode, supplyHub, hasSupply });
        } catch (err) {
          sendJson(res, 400, { success: false, error: err.message });
        }
      });
      return;
    }

    // 5i-3. POST /api/strategy/price-check
    if (req.method === 'POST' && pathname === '/api/strategy/price-check') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const dynamicPrice = gsm.economy.calculateDynamicPrice({
            commodity: payload.commodity || 'GRAIN',
            basePrice: payload.basePrice || 50,
            currentPrice: payload.currentPrice || 50,
            stockUnits: payload.stockUnits || 100,
            demandUnits: payload.demandUnits || 300,
            priceElasticity: payload.priceElasticity || 1.5
          });
          sendJson(res, 200, { success: true, dynamicPrice });
        } catch (err) {
          sendJson(res, 400, { success: false, error: err.message });
        }
      });
      return;
    }

    // 5i-4. GET /api/strategy/memories
    if (req.method === 'GET' && pathname === '/api/strategy/memories') {
      const npcId = parsedUrl.query.npcId || 'NPC-0002';
      const memories = gsm.agentBridge.getNpcMemories(npcId, 10);
      sendJson(res, 200, { success: true, npcId, memories });
      return;
    }
  }

  // 5k. GET /api/game/events - Query ROTK Historical Events with Optional Year Filter
  if (req.method === 'GET' && pathname === '/api/game/events') {
    try {
      const query = parsedUrl.query || {};
      const year = query.year ? parseInt(query.year, 10) : null;
      let sql = `SELECT * FROM master_events`;
      if (year) {
        sql += ` WHERE historical_year <= ${year}`;
      }
      sql += ` ORDER BY historical_year ASC, event_id ASC;`;
      const events = runSqlJson(sql);
      sendJson(res, 200, { success: true, count: events.length, events });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 5l. GET /api/game/events/active - Active Events for current location & date with choices
  if (req.method === 'GET' && pathname === '/api/game/events/active') {
    try {
      const player = runSqlJson(`SELECT * FROM player_state LIMIT 1;`)[0] || {};
      const meta = runSqlJson(`SELECT * FROM campaign_meta LIMIT 1;`)[0] || {};
      const locationId = player.current_location || 'LOC-0001';
      const gameDate = meta.current_date || '184-02-01';
      const activeTurn = meta.active_turn || 1;

      const events = eventManager.getActiveEvents(locationId, gameDate, activeTurn);
      sendJson(res, 200, {
        success: true,
        locationId,
        gameDate,
        activeTurn,
        events
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 5m. POST /api/game/events/participate - Submit player's choice in a historical event
  if (req.method === 'POST' && pathname === '/api/game/events/participate') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { eventId, choiceId, customNarrative } = payload;
        if (!eventId || !choiceId) {
          sendJson(res, 400, { success: false, error: 'Thiếu eventId hoặc choiceId.' });
          return;
        }

        const result = eventManager.participateInEvent({ eventId, choiceId, customNarrative });
        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 5i. POST /api/game/save-slot - Snapshot Active Playthrough
  if (req.method === 'POST' && pathname === '/api/game/save-slot') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const slot = payload.slot || `slot_${Date.now()}`;
        const result = gameplayManager.exportSaveSlot(slot);
        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 5j. POST /api/game/load-slot - Load Snapshot Playthrough
  if (req.method === 'POST' && pathname === '/api/game/load-slot') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const slot = payload.slot || 'slot_1';
        const result = gameplayManager.loadSaveSlot(slot);
        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // 6. POST /api/action - Simulation Core Action Dispatcher
  if (req.method === 'POST' && pathname === '/api/action') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const core = new SimulationCore(DB_PATH);
        const result = core.executeAction(payload);

        if (result.success) {
          logAgentSimulationEvent({
            type: payload.type,
            prompt: `Thao tác cơ học: ${payload.type}`,
            narrative: `Hệ thống SimulationCore đã thực thi và cân bằng sổ cái kép cho điều lệnh ${payload.type}.`,
            reasoning: `Xử lý tức thì qua SimCore. Kiểm toán 70/70 Invariants bảo toàn hoàn hảo.`,
            delta: { action: payload.type, status: 'SUCCESS' },
            executedAction: result
          });
        }

        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    });
    return;
  }

  // 7. POST /api/workshop/simulate - Autonomous Monthly Workshop Cycle
  if (req.method === 'POST' && pathname === '/api/workshop/simulate') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const bizId = payload.businessId || 'BIZ-0001';
        const gameDate = payload.gameDate || '184-05-30';
        const seed = payload.seed ? parseInt(payload.seed, 10) : 1840501;

        const engine = new WorkshopEngine(DB_PATH, path.join(ROOT_DIR, 'game', 'PROGRESS.md'));
        const result = engine.simulateMonth(bizId, gameDate, seed);
        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    });
    return;
  }

// Live Relational Mesh: Dynamically queries DailyInteractionEngine and SQLite relationship deltas
function getLiveSceneRelations() {
  const trackedNpcIds = ['NPC-0001', 'NPC-0002', 'NPC-0003', 'NPC-0012', 'NPC-0007'];
  const results = [];
  const kizunaEngine = globalThis.__DAILY_INTERACTION_ENGINE__;

  for (const npcId of trackedNpcIds) {
    const char = runSqlJson(`SELECT * FROM master_characters WHERE npc_id = '${npcId}' LIMIT 1;`)[0];
    if (!char) continue;

    let score = 25;
    let statusVi = 'Người Xa Lạ';
    let statusEn = 'Stranger';

    if (kizunaEngine && typeof kizunaEngine.getNpcSentiment === 'function') {
      try {
        const sentiment = kizunaEngine.getNpcSentiment(npcId);
        score = sentiment.affinity;
        statusVi = sentiment.titleVi;
        statusEn = sentiment.titleEn;
      } catch (e) {
        // Fallback below
      }
    }

    if (statusVi === 'Người Xa Lạ') {
      const base = runSqlJson(`SELECT baseline_sentiment, relationship_type_vi, relationship_type_en FROM master_relations_baseline WHERE source_entity_id = '${npcId}' LIMIT 1;`)[0];
      const deltaRow = runSqlJson(`SELECT SUM(sentiment_delta) as total_delta FROM npc_relationship_deltas WHERE npc_id = '${npcId}';`)[0];
      const initialSentiment = base ? Number(base.baseline_sentiment) : 25;
      const addedDelta = deltaRow?.total_delta ? Number(deltaRow.total_delta) : 0;
      score = Math.max(0, Math.min(100, initialSentiment + addedDelta));

      if (score >= 80) {
        statusVi = 'Kim Lan Sinh Tử (Sworn Brother)';
        statusEn = 'Sworn Brother (Life & Death)';
      } else if (score >= 60) {
        statusVi = 'Tâm Phúc Tri Kỷ (Confidant)';
        statusEn = 'Trusted Confidant';
      } else if (score >= 40) {
        statusVi = 'Bằng Hữu Thân Quen (Familiar)';
        statusEn = 'Familiar Companion';
      } else if (score >= 20) {
        statusVi = 'Sơ Giao Đồng Hương (Acquaintance)';
        statusEn = 'Acquaintance';
      }
      if (base?.relationship_type_vi && score >= 60) {
        statusVi = `${base.relationship_type_vi} (${statusVi})`;
      }
      if (base?.relationship_type_en && score >= 60) {
        statusEn = `${base.relationship_type_en} (${statusEn})`;
      }
    }

    results.push({
      npcId,
      name: char.name_vi,
      nameEn: char.name_en,
      role: char.baseline_position_vi || 'Hào Kiệt Bản Địa',
      roleEn: char.baseline_position_en || 'Local Champion',
      score,
      target: 100,
      status: statusVi,
      statusEn: statusEn
    });
  }

  return results;
}

// Dynamic Scene Context Engine: Generates contextual NPC, transparent D20 formulas & 4 tactical choices
function generateDynamicScene(dbPath, subLocation = 'Vườn Đào', lastAction = null, lastNarrative = null) {
  const player = runSqlJson(`SELECT * FROM player_state LIMIT 1;`)[0] || {};
  const meta = runSqlJson(`SELECT * FROM campaign_meta LIMIT 1;`)[0] || {};
  const inventory = runSqlJson(`SELECT * FROM inventory_items;`);

  // Normalize subLocation
  let currentLocKey = 'Vườn Đào';
  const subLower = (subLocation || '').toLowerCase();
  if (subLower.includes('chợ') || subLower.includes('đông môn') || subLower.includes('market')) {
    currentLocKey = 'Chợ Đông Môn';
  } else if (subLower.includes('xưởng') || subLower.includes('chức tác') || subLower.includes('workshop')) {
    currentLocKey = 'Xưởng Lương Thị';
  } else if (subLower.includes('bắc bình') || subLower.includes('kế thành') || subLower.includes('beiping')) {
    currentLocKey = 'Bắc Bình Soái Phủ';
  } else if (subLower.includes('nghiệp thành') || subLower.includes('yecheng')) {
    currentLocKey = 'Nghiệp Thành Đại Phủ';
  } else if (subLower.includes('quảng tông') || subLower.includes('camp') || subLower.includes('doanh')) {
    currentLocKey = 'Quảng Tông Quân Doanh';
  } else if (subLower.includes('bình nguyên') || subLower.includes('pingyuan')) {
    currentLocKey = 'Bình Nguyên Trọng Trấn';
  } else if (subLower.includes('hứa xương') || subLower.includes('xuchang') || subLower.includes('trường xã') || subLower.includes('changshe') || subLower.includes('dĩnh')) {
    currentLocKey = 'Hứa Xương Tướng Phủ';
  } else if (subLower.includes('hạ phì') || subLower.includes('xiapi') || subLower.includes('từ châu')) {
    currentLocKey = 'Hạ Phì Thành Lũy';
  } else if (subLower.includes('lạc dương') || subLower.includes('luoyang') || subLower.includes('kinh đô') || subLower.includes('kinh sư')) {
    currentLocKey = 'Kinh Đô Lạc Dương';
  } else if (subLower.includes('trường an') || subLower.includes('changan') || subLower.includes('quan trung')) {
    currentLocKey = 'Trường An Cung Phủ';
  } else if (subLower.includes('tương dương') || subLower.includes('xiangyang')) {
    currentLocKey = 'Tương Dương Châu Phủ';
  } else if (subLower.includes('giang lăng') || subLower.includes('jiangling') || subLower.includes('nam quận')) {
    currentLocKey = 'Giang Lăng Thủy Doanh';
  } else if (subLower.includes('xích bích') || subLower.includes('chibi') || subLower.includes('sài tang')) {
    currentLocKey = 'Xích Bích Thủy Trại';
  } else if (subLower.includes('kiến nghiệp') || subLower.includes('jianye') || subLower.includes('đông ngô') || subLower.includes('ngô')) {
    currentLocKey = 'Kiến Nghiệp Đô Thành';
  } else if (subLower.includes('hán trung') || subLower.includes('hanzhong')) {
    currentLocKey = 'Hán Trung Thiên Sư Phủ';
  } else if (subLower.includes('thành đô') || subLower.includes('chengdu') || subLower.includes('thục')) {
    currentLocKey = 'Thành Đô Ích Châu Phủ';
  } else {
    currentLocKey = 'Vườn Đào';
  }

  const relations = getLiveSceneRelations();

  const subLocationsList = ['Vườn Đào', 'Chợ Đông Môn', 'Xưởng Lương Thị', 'Quảng Tông Quân Doanh'];

  const saltItem = inventory.find(i => i.item_code === 'COM-SALT') || { quantity: 0 };
  const grainItem = inventory.find(i => i.item_code === 'COM-GRAIN') || { quantity: 0 };
  const leathItem = inventory.find(i => i.item_code === 'COM-LEATH') || { quantity: 0 };
  const bamItem = inventory.find(i => i.item_code === 'COM-BAMBOO') || { quantity: 0 };
  const matItem = inventory.find(i => i.item_code === 'PROD-MAT') || { quantity: 0 };
  const baskItem = inventory.find(i => i.item_code === 'PROD-BASK') || { quantity: 0 };
  const shieldItem = inventory.find(i => i.item_code === 'PROD-SHIELD-BAM') || { quantity: 0 };

  let npc = {};
  let lastCheck = {};
  let narrative = '';
  let options = [];
  let locationFull = '';

  if (currentLocKey === 'Vườn Đào') {
    locationFull = 'Trang Viên Vườn Đào Hạ Trạch — Nam Thành Huyện Trác';
    npc = {
      id: 'NPC-0002',
      name: 'Trương Phi (Dực Đức)',
      title: 'Hào Kiệt Huyện Trác — WAR 97',
      sentiment: 65,
      sentimentStatus: 'Hảo cảm: +25 (Gắn kết +50)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA VÕ NGHỆ THỰC CHIẾN (WAR)',
      title: 'Đấu Thương Thực Chiến Cùng Trương Phi',
      score: 48,
      dc: 35,
      formula: `[WAR ${player.war_attr || 58} * 0.5 = 29] + [Kỹ năng Thương Pháp +10] + [D20: 9] = 48 >= DC 35`
    };
    narrative = lastNarrative || 'Trương Phi đặt vò rượu Trác Thành Trán Nương xuống gốc đào, lau miệng cười vang: "Lương Chí Viễn dệt đường thương vừa rồi đệ lĩnh ngộ nhanh lắm! Lò mổ của lão Trương hôm nay vừa lột được 10 tấm da trâu hảo hạng (100 Tiền/tấm). Đệ có muốn mua về xưởng làm giáp lương quân dụng không? Hay muốn cùng Trương đấu thêm vài hiệp thương pháp nữa trước khi ra chợ gặp Lưu Huyền Đức và Quan Vân Trường?"';
    options = [
      {
        id: 'OPT_1',
        icon: '🛒',
        title: 'Mua sỉ 8 tấm da thuộc của Trương Phi (Chi 800 Tiền)',
        desc: '+8 COM-LEATH vào kho • Hảo cảm Trương Phi +2 • COM Check DC 35',
        action: { type: 'TRADE_BUY', item_code: 'COM-LEATH', quantity: 8, unit_price: 100, counterparty: 'Trương Phi (Lò mổ Huyện Trác)', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '⚔️',
        title: 'Thỉnh giáo Trương Phi đấu thương thực chiến đợt 2 (Miễn phí)',
        desc: 'Luyện Thương Pháp (+8 EXP SKL-WAR-SPEAR, WAR +1) • Hảo cảm Trương Phi +5 • WAR Check DC 45',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0002', amount: 50, counterparty: 'Trương Phi (Dực Đức)', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '🌸',
        title: 'Rời Vườn Đào, đi tới Chợ Đông Môn tìm gặp Quan Vũ',
        desc: 'Chuyển cảnh sang Chợ Huyện Trác & Sạp Trà (1 dặm)',
        action: { type: 'MOVE_LOCATION', new_location: 'Chợ Đông Môn', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '✉️',
        title: 'Phi thư về Xưởng Lương Thị: Chỉ đạo đóng 5 Khiên trúc quân dụng',
        desc: 'Phái gia nhân phi ngựa mang mật lệnh về xưởng • Tiêu hao BOM Tre & Da',
        action: { type: 'PRODUCTION_BATCH', recipe: 'PROD-SHIELD-BAM', batch_size: 5, game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Chợ Đông Môn') {
    locationFull = 'Chợ Đông Môn & Kho Muối Lương Thảo — Huyện Trác';
    npc = {
      id: 'NPC-0003',
      name: 'Quan Vũ (Vân Trường)',
      title: 'Hào Kiệt Giải Lương — WAR 98 / INT 75',
      sentiment: 60,
      sentimentStatus: 'Hảo cảm: +15 (Kính trọng mưu lược)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA THƯƠNG NGHIỆP & ĐỊNH GIÁ (COM/APPRAISE)',
      title: 'Thương Hội Đông Môn & Đàm Phán Thị Trường',
      score: 54,
      dc: 40,
      formula: `[COM ${player.com_attr || 78} * 0.5 = 39] + [Thẩm định thị trường +7] + [D20: 8] = 54 >= DC 40`
    };

    const hasSaltToSell = saltItem.quantity >= 10;
    const hasMatsToSell = matItem.quantity >= 10;

    if (hasSaltToSell) {
      narrative = lastNarrative || `Quan Vân Trường vuốt ròm râu dài, tay cầm cuốn Xuân Thu đặt trên sạp trà chợ Đông: "Lương Chí Viễn, thương nhân Ký Châu vừa cập bến Đông Môn, kho của đệ hiện có ${saltItem.quantity} đấu muối biển. Muối đang được giá 85 Tiền/đấu, lại thêm nghĩa quân đang gom thêm lương thực (160 Tiền/thạch). Đệ định xuất bán kiếm lời hay gom thêm lương phòng bị?"`;
      options = [
        {
          id: 'OPT_1',
          icon: '🧂',
          title: 'Xuất bán 10 Đấu Muối biển cho Thương đoàn Ký Châu (Thu 850 Tiền)',
          desc: '-10 COM-SALT • +850 Tiền mặt lưu động • COM Check DC 35',
          action: { type: 'TRADE_SELL', item_code: 'COM-SALT', quantity: 10, unit_price: 85, counterparty: 'Thương nhân Ký Châu', game_date: meta.current_date || '184-05-02' }
        },
        {
          id: 'OPT_2',
          icon: '🌾',
          title: 'Thu mua 5 Thạch Lương tiểu mạch dự trữ (Chi 800 Tiền)',
          desc: '+5 COM-GRAIN • Tiêu hao 800 Tiền • LOG Check DC 40',
          action: { type: 'TRADE_BUY', item_code: 'COM-GRAIN', quantity: 5, unit_price: 160, counterparty: 'Lương thương Huyện Trác', game_date: meta.current_date || '184-05-02' }
        },
        {
          id: 'OPT_3',
          icon: '🍵',
          title: 'Mời Quan Vũ uống trà, bàn luận đại cục thiên hạ và Binh pháp',
          desc: 'Hảo cảm Quan Vũ +5 • Tăng EXP Kỹ năng Quân Sự • Chi 100 Tiền trà',
          action: { type: 'REWARD_NPC', npc_id: 'NPC-0003', amount: 100, counterparty: 'Quan Vũ (Vân Trường)', game_date: meta.current_date || '184-05-02' }
        },
        {
          id: 'OPT_4',
          icon: '🏭',
          title: 'Rời chợ Đông Môn, tới Lương Thị Chức Tác Phường (1.5 dặm)',
          desc: 'Cơ động sang xưởng thủ công kiểm tra tiến độ dệt đan khí giới',
          action: { type: 'MOVE_LOCATION', new_location: 'Xưởng Lương Thị', game_date: meta.current_date || '184-05-02' }
        }
      ];
    } else {
      narrative = lastNarrative || `Quan Vân Trường vuốt ròm râu dài, tay cầm cuốn Xuân Thu đặt trên sạp trà chợ Đông: "Lương Chí Viễn, kho hiện tại của đệ không còn muối biển. Thương nhân Ký Châu vừa cập bến chở theo muối hạt trắng mịn (giá 65 Tiền/đấu), lại đang ráo riết thu mua ${hasMatsToSell ? `thành phẩm Chiếu Trúc Lương Gia (${matItem.quantity} tấm trong kho)` : 'thành phẩm đan lát xưởng Lương gia'} với giá 80 Tiền/tấm. Đệ định xuất bán thành phẩm xưởng dệt thu tiền mặt, hay gom thêm lương phòng bị?"`;
      options = [
        {
          id: 'OPT_1',
          icon: hasMatsToSell ? '🎋' : '🧂',
          title: hasMatsToSell 
            ? 'Xuất bán 10 Tấm Chiếu Trúc Lương Gia cho Thương đoàn Ký Châu (Thu 800 Tiền)' 
            : 'Thu mua 10 Đấu Muối biển Ký Châu giá sỉ dự trữ (Chi 650 Tiền)',
          desc: hasMatsToSell 
            ? `-10 PROD-MAT (Kho còn ${matItem.quantity}) • +800 Tiền mặt lưu động • COM Check DC 35` 
            : '+10 COM-SALT • Chi 650 Tiền • Tích trữ muối biển làm vốn buôn đường dài',
          action: hasMatsToSell 
            ? { type: 'TRADE_SELL', item_code: 'PROD-MAT', quantity: 10, unit_price: 80, counterparty: 'Thương nhân Ký Châu', game_date: meta.current_date || '184-05-02' }
            : { type: 'TRADE_BUY', item_code: 'COM-SALT', quantity: 10, unit_price: 65, counterparty: 'Thương nhân Ký Châu', game_date: meta.current_date || '184-05-02' }
        },
        {
          id: 'OPT_2',
          icon: '🌾',
          title: 'Thu mua 5 Thạch Lương tiểu mạch dự trữ (Chi 800 Tiền)',
          desc: '+5 COM-GRAIN • Tiêu hao 800 Tiền • LOG Check DC 40',
          action: { type: 'TRADE_BUY', item_code: 'COM-GRAIN', quantity: 5, unit_price: 160, counterparty: 'Lương thương Huyện Trác', game_date: meta.current_date || '184-05-02' }
        },
        {
          id: 'OPT_3',
          icon: '🍵',
          title: 'Mời Quan Vũ uống trà, bàn luận đại cục thiên hạ và Binh pháp',
          desc: 'Hảo cảm Quan Vũ +5 • Tăng EXP Kỹ năng Quân Sự • Chi 100 Tiền trà',
          action: { type: 'REWARD_NPC', npc_id: 'NPC-0003', amount: 100, counterparty: 'Quan Vũ (Vân Trường)', game_date: meta.current_date || '184-05-02' }
        },
        {
          id: 'OPT_4',
          icon: '🏭',
          title: 'Rời chợ Đông Môn, tới Lương Thị Chức Tác Phường (1.5 dặm)',
          desc: 'Cơ động sang xưởng thủ công kiểm tra tiến độ dệt đan khí giới',
          action: { type: 'MOVE_LOCATION', new_location: 'Xưởng Lương Thị', game_date: meta.current_date || '184-05-02' }
        }
      ];
    }
  } else if (currentLocKey === 'Xưởng Lương Thị') {
    locationFull = 'Lương Thị Chức Tác Phường — Nam Thành Ngoại Ô Huyện Trác';
    npc = {
      id: 'NPC-0007',
      name: 'Trần Bảo (Thợ Cả Lương Gia)',
      title: 'Thợ Dệt Kỳ Cựu — CRA 72 / Loyalty 85',
      sentiment: 85,
      sentimentStatus: 'Trung thành: 85% • Sĩ khí: 100%'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA KỸ NGHỆ & ĐIỀU HÀNH (CRA/MGT)',
      title: 'Giám Sát Định Mức Chế Tác Khiên Trúc',
      score: 51,
      dc: 35,
      formula: `[CRA ${player.cra_attr || 62} * 0.5 = 31] + [Quản trị xưởng +12] + [D20: 8] = 51 >= DC 35`
    };
    narrative = lastNarrative || `Thợ cả Trần Bảo đón đông gia Lương Diễn, chắp tay bẩm báo: "Kho xưởng hiện có ${bamItem.quantity} Bó Trúc và ${leathItem.quantity} Tấm Da. 4 thợ dệt của phường đang sung sức. Chúng tôi đã chuẩn bị sẵn khung đan, chỉ chờ lệnh đông gia phê duyệt để tiến hành đóng chiếu trúc hoặc đan khiên bọc da cho nghĩa quân!"`;
    options = [
      {
        id: 'OPT_1',
        icon: '🎋',
        title: 'Khởi động ca sản xuất: Đóng 10 Chiếu Trúc Lương Gia',
        desc: 'Tiêu hao 2.5 Trúc, 1.0 Gai • Thu hoạch 10 Chiếu Trúc xuất xưởng',
        action: { type: 'PRODUCTION_BATCH', recipe: 'PROD-MAT', batch_size: 10, game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🛡️',
        title: 'Khởi động ca chế tạo: Đóng 5 Khiên Trúc Bọc Da Quân Dụng',
        desc: 'Tiêu hao 4.0 Trúc, 2.5 Da, 1.0 Gai • Thu hoạch 5 Khiên Trúc',
        action: { type: 'PRODUCTION_BATCH', recipe: 'PROD-SHIELD-BAM', batch_size: 5, game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '🎁',
        title: 'Khen thưởng 100 Tiền cho Thợ Cả Trần Bảo động viên thợ xưởng',
        desc: 'Sĩ khí thợ xưởng 100% • Trung thành +2 • Chi 100 Tiền két an toàn',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0007', amount: 100, counterparty: 'Trần Bảo (Thợ Cả Lương Gia)', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🚶',
        title: 'Rời xưởng Lương Thị, đi tới Chợ Đông Môn tìm thương đoàn',
        desc: 'Chuyển cảnh sang Chợ Huyện Trác',
        action: { type: 'MOVE_LOCATION', new_location: 'Chợ Đông Môn', game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Quảng Tông Quân Doanh') {
    locationFull = 'Bắc Quân Đại Doanh — Quảng Tông Tiền Tuyến (Chiến Dịch Khăn Vàng)';
    npc = {
      id: 'NPC-0004',
      name: 'Lư Thực (Tử Cán)',
      title: 'Bắc Quân Trung Lang Tướng — INT 85 / LDR 82',
      sentiment: 75,
      sentimentStatus: 'Độ tín nhiệm: +50 (Ân sư ái đồ)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA QUÂN SỰ MƯU LƯỢC (TAC/INT)',
      title: 'Bố Trí Tuyến Tiếp Vận & Bẫy Chặn Quân Lương',
      score: 62,
      dc: 45,
      formula: `[INT ${player.int_attr || 80} * 0.5 = 40] + [Binh pháp mưu lược +14] + [D20: 8] = 62 >= DC 45`
    };
    narrative = lastNarrative || 'Trung lang tướng Lư Thực ngồi trước quân trướng, chỉ tay lên sa bàn: "Lương Diễn, công lao vận trù quân lương và khí giới từ Huyện Trác của con đã cứu vãn nhuệ khí Bắc Quân. Trương Giác đang suy sụp trong thành Quảng Tông. Con định tăng cường chuyển thêm khiên trúc dự phòng hay nhận quân thưởng công huân đợt vừa qua?"';
    options = [
      {
        id: 'OPT_1',
        icon: '🎖️',
        title: 'Nhận thưởng 2000 Tiền quân công phá giặc từ Tướng Quân Lư Thực',
        desc: '+2,000 Tiền mặt ngân khố • Ghi nhận quân huân Bắc Quân',
        action: { type: 'RECORD_BOUNTY', counterparty: 'Bắc Quân Tướng Quân Lư Thực', amount: 2000, memo: 'Thưởng quân công vận trù khí giới phá thành Quảng Tông', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🌾',
        title: 'Tiếp tế 5 Thạch Lương tiểu mạch cho Quân Nhu Cục Bắc Quân',
        desc: '-5 COM-GRAIN • +900 Tiền thu mua quân nhu (@180 Tiền/thạch)',
        action: { type: 'TRADE_SELL', item_code: 'COM-GRAIN', quantity: 5, unit_price: 180, counterparty: 'Quân nhu cục Bắc Quân', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '📜',
        title: 'Hiến kế hoạch nghi binh vây thành, thắt chặt vòng vây Quảng Tông',
        desc: 'EXP Binh Pháp Mưu Lược +15 • Tín nhiệm Lư Thực +5',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0004', amount: 100, counterparty: 'Lư Thực (Tử Cán)', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🐎',
        title: 'Rút quân trở về hậu phương Trang Viên Vườn Đào Huyện Trác',
        desc: 'Chuyển cảnh về Vườn Đào Hạ Trạch',
        action: { type: 'MOVE_LOCATION', new_location: 'Vườn Đào', game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Bình Nguyên Trọng Trấn') {
    locationFull = 'Bình Nguyên Trọng Trấn — Yếu Tuyến Giao Thương Ký & Thanh Châu';
    npc = {
      id: 'NPC-0008',
      name: 'Vương Triệt (Huyện Thừa Bình Nguyên)',
      title: 'Quan Phụ Mẫu Bình Nguyên — POL 68 / INT 70',
      sentiment: 65,
      sentimentStatus: 'Độ tín nhiệm: +20 (Thiết lập dịch trạm)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA QUẢN TRỊ & ĐIỀU PHỐI VẬN TẢI (LOG/POL)',
      title: 'Bố Trí Dịch Trạm Tiếp Vận Lương Thảo Tuyến Đông',
      score: 56,
      dc: 40,
      formula: `[POL ${player.pol_attr || 70} * 0.5 = 35] + [Kỹ trị bang quốc +11] + [D20: 10] = 56 >= DC 40`
    };
    narrative = lastNarrative || 'Huyện Thừa Bình Nguyên đón Lương Diễn tại công đường: "Bình Nguyên Quốc là yết hầu giao thông nối liền Ký Châu và Thanh Châu. Dân binh các hương đang thiếu thốn khí giới phòng thủ giặc cướp tràn qua biên cảnh. Lương thương nhân mang vật phẩm tiếp viện tới quả là giải nguy kịp thời!"';
    options = [
      {
        id: 'OPT_1',
        icon: '🛡️',
        title: 'Cung cấp 5 Khiên Trúc Lương Gia cho Dân Binh Xã Tắc (Thu 1,200 Tiền)',
        desc: 'Hỗ trợ hương dũng Bình Nguyên phòng ngự • Tăng uy vọng địa phương',
        action: { type: 'TRADE_SELL', item_code: 'PROD-SHIELD-BAM', quantity: 5, unit_price: 240, counterparty: 'Quan phủ Huyện Bình Nguyên', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🌾',
        title: 'Thu mua lương thảo ngô khoai Thanh Châu tiếp tế (Chi 600 Tiền)',
        desc: '+4 COM-GRAIN • Bổ sung quân nhu viễn chinh',
        action: { type: 'TRADE_BUY', item_code: 'COM-GRAIN', quantity: 4, unit_price: 150, counterparty: 'Thương hội Thanh Châu', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '📜',
        title: 'Hiến kế thiết lập hệ thống phong hỏa đài cảnh giới liên hoàn',
        desc: 'EXP Chính Trị & Binh Pháp +15 • Tín nhiệm Huyện Thừa +5',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0008', amount: 100, counterparty: 'Vương Triệt (Huyện Thừa Bình Nguyên)', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🐎',
        title: 'Hành quân trở về Hậu Phương Trang Viên Vườn Đào Huyện Trác',
        desc: 'Cơ động về bản doanh U Châu',
        action: { type: 'MOVE_LOCATION', new_location: 'Vườn Đào', game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Hứa Xương Tướng Phủ' || currentLocKey === 'Trường Xã Tiền Tuyến') {
    locationFull = 'Hứa Xương & Trường Xã Tiền Tuyến — Dự Châu Thống Soái Doanh Trại';
    npc = {
      id: 'NPC-0009',
      name: 'Hoàng Phủ Tung (Nghĩa Chân)',
      title: 'Tả Trung Lang Tướng — INT 88 / WAR 80 / LDR 89',
      sentiment: 70,
      sentimentStatus: 'Độ tín nhiệm: +40 (Cảm kích kỳ binh)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA BINH PHÁP HỎA CÔNG (TAC/INT)',
      title: 'Quan Sát Hướng Gió Đêm Trường Xã & Phân Phối Dầu Hỏa',
      score: 65,
      dc: 45,
      formula: `[INT ${player.int_attr || 80} * 0.5 = 40] + [Quan sát thiên thời +15] + [D20: 10] = 65 >= DC 45`
    };
    narrative = lastNarrative || 'Tướng quân Hoàng Phủ Tung đứng trên chòi canh quan sát trại cỏ bạt ngàn của tướng giặc Ba Cai: "Quân giặc nương vào đồng cỏ kết trại là tự tìm đường diệt vong. Chỉ cần gió nổi lên, một mồi lửa có thể thiêu rụi trăm dặm quân doanh! Lương Diễn, khí giới và quân nhu của ngươi chuyển tới đúng lúc gió đông sắp khởi!"';
    options = [
      {
        id: 'OPT_1',
        icon: '🔥',
        title: 'Cung cấp 5 Khiên Trúc bọc da trợ chiến tiền phong hỏa công',
        desc: 'Chi viện khiên giáp che chắn đội mồi lửa • Hào cảm Hoàng Phủ Tung +10',
        action: { type: 'TRADE_SELL', item_code: 'PROD-SHIELD-BAM', quantity: 5, unit_price: 250, counterparty: 'Tả Quân Hoàng Phủ Tung', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🌾',
        title: 'Tiếp tế 8 Thạch Lương thực khẩn cấp cho đại doanh Dự Châu (Thu 1,440 Tiền)',
        desc: '-8 COM-GRAIN • Thu 1,440 Tiền mặt ngân sách quân đội',
        action: { type: 'TRADE_SELL', item_code: 'COM-GRAIN', quantity: 8, unit_price: 180, counterparty: 'Quân nhu cục Dự Châu', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '🐎',
        title: 'Bắt liên lạc hiệp đồng kỵ binh cứu viện của Kỵ Đô Úy Tào Tháo',
        desc: 'Mở rộng quan hệ thế lực Tào Tháo • EXP Quân sự +20',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0009', amount: 100, counterparty: 'Tào Tháo (Kỵ Đô Úy)', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🐎',
        title: 'Rút quân theo quan đạo trở về Hậu Phương Trang Viên Vườn Đào',
        desc: 'Cơ động về Trác Huyện U Châu',
        action: { type: 'MOVE_LOCATION', new_location: 'Vườn Đào', game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Kinh Đô Lạc Dương') {
    locationFull = 'Kinh Đô Lạc Dương — Đại Tướng Quân Phủ Đệ (Tư Lệ Hiệu Úy Bộ)';
    npc = {
      id: 'NPC-0010',
      name: 'Hà Tiến (Toại Cao)',
      title: 'Đại Tướng Quân • Lục Thượng Thư Sự — Authority 95',
      sentiment: 60,
      sentimentStatus: 'Độ chú ý: +15 (Thương gia U Châu trợ quân)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA BIỆN THUYẾT & GIAO THIỆP TRIỀU ĐÌNH (DIP/POL)',
      title: 'Yết Kiến Đại Tướng Quân & Trình Tấu Công Trạng Khăn Vàng',
      score: 58,
      dc: 45,
      formula: `[DIP ${player.dip_attr || 75} * 0.5 = 37] + [Ngoại giao quý tộc +11] + [D20: 10] = 58 >= DC 45`
    };
    narrative = lastNarrative || 'Đại Tướng Quân Hà Tiến ngự trên ghế cẩm thạch phủ lụa gấm, liếc nhìn tấu chương của Thứ sử U Châu: "Lương gia các hạ bỏ tiền của chế tác khiên giáo tiếp trợ quân Lư Thực và Hoàng Phủ Tung, quả có lòng trung nghĩa. Triều đình thưởng phạt phân minh, ngươi muốn mở rộng thương hội tại Kinh Sư hay nhận ban thưởng tước vị?"';
    options = [
      {
        id: 'OPT_1',
        icon: '🎖️',
        title: 'Nhận sắc phong Quân Nhu Tán Quan & Thưởng 2,500 Tiền từ Triều Đình',
        desc: '+2,500 Tiền mặt ngân khố triều đình • Tăng danh vọng sĩ phu Lạc Dương',
        action: { type: 'RECORD_BOUNTY', counterparty: 'Đại Tướng Quân Phủ Lạc Dương', amount: 2500, memo: 'Ban thưởng công huân vận trù quân lương bình Khăn Vàng', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🏛️',
        title: 'Đăng ký môn bài chi nhánh Lương Gia Thương Hội tại Kinh Sư (Chi 1,000 Tiền)',
        desc: 'Mở phân hiệu giao thương độc quyền kinh đô • Tăng tiềm năng thương vụ',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0010', amount: 100, counterparty: 'Hà Tiến (Đại Tướng Quân)', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '🍵',
        title: 'Biếu lễ vật tiếp xúc Binh Bộ Thượng Thư nắm bắt thời cuộc',
        desc: 'Thu thập tin mật cung đình • EXP Chính Trị +25',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0010', amount: 100, counterparty: 'Binh Bộ Thượng Thư Lạc Dương', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🐎',
        title: 'Rời Kinh Sư Lạc Dương, cất bước trở về Trang Viên Vườn Đào Huyện Trác',
        desc: 'Cơ động về bản doanh U Châu',
        action: { type: 'MOVE_LOCATION', new_location: 'Vườn Đào', game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Bắc Bình Soái Phủ') {
    locationFull = 'Bắc Bình Soái Phủ — U Châu Tiền Tuyến (Bạch Mã Nghĩa Tòng)';
    npc = {
      id: 'NPC-0011',
      name: 'Công Tôn Toản (Bá Khuê)',
      title: 'Bạch Mã Tướng Quân — WAR 88 / LDR 84',
      sentiment: 70,
      sentimentStatus: 'Hảo cảm: +35 (Đồng hương U Châu)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA DÕNG KHÍ & KỴ XẠ (WAR/LDR)',
      title: 'Khảo Sát Chiến Mã U Châu',
      score: 55,
      dc: 40,
      formula: `[WAR ${player.war_attr || 58} * 0.5 = 29] + [Hiểu biết kỵ xạ +15] + [D20: 11] = 55 >= DC 40`
    };
    narrative = lastNarrative || 'Công Tôn Toản đứng bên đàn ngựa chiến bờ cõi U Châu, cất giọng sang sảng: "Lương Diễn, nghe danh ngươi cùng Lưu Huyền Đức khởi sự tại Trác Quận. Quân Bạch Mã Nghĩa Tòng của ta đang chuẩn bị xuất chinh dẹp loạn Ô Hoàn. Ngươi mang khiên trúc hay lương thảo tới chi viện đại doanh phương Bắc này?"';
    options = [
      {
        id: 'OPT_1',
        icon: '🛡️',
        title: 'Cung cấp 10 Khiên Trúc Lương Gia chi viện quân biên cương (Thu 2,400 Tiền)',
        desc: 'Cung cấp khí giới cho phòng tuyến Bắc Bình • Danh vọng U Châu +15',
        action: { type: 'TRADE_SELL', item_code: 'PROD-SHIELD-BAM', quantity: 10, unit_price: 240, counterparty: 'Bắc Bình Soái Phủ Công Tôn Toản', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🐎',
        title: 'Thu mua 3 Tuấn Mã U Châu chất lượng cao (Chi 1,200 Tiền)',
        desc: '+3 COM-LEATH nguyên liệu da hảo hạng • Tăng tốc độ hành quân',
        action: { type: 'TRADE_BUY', item_code: 'COM-LEATH', quantity: 3, unit_price: 400, counterparty: 'Quân Mã Cục Bắc Bình', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '🤝',
        title: 'Đàm phán hiệp ước tương trợ quân nhu Trác Huyện và Bắc Bình',
        desc: 'EXP Ngoại Giao +20 • Tăng uy vọng chư hầu phương Bắc',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0011', amount: 100, counterparty: 'Công Tôn Toản (Bá Khuê)', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🐎',
        title: 'Rời Bắc Bình, xuôi quan đạo trở về Huyện Trác',
        desc: 'Cơ động về bản doanh Huyện Trác',
        action: { type: 'MOVE_LOCATION', new_location: 'Vườn Đào', game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Nghiệp Thành Đại Phủ') {
    locationFull = 'Nghiệp Thành Phủ Đệ — Trung Tâm Thế Tộc Ký Châu';
    npc = {
      id: 'NPC-0012',
      name: 'Viên Thiệu (Bản Sơ)',
      title: 'Tứ Thế Tam Công • Ký Châu Minh Chủ — POL 82 / LDR 80',
      sentiment: 65,
      sentimentStatus: 'Độ chú ý: +25 (Thế gia Hà Bắc)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA QUẢN TRỊ & BANG GIAO THẾ TỘC (POL/DIP)',
      title: 'Yết Kiến Minh Chủ Viên Bản Sơ',
      score: 59,
      dc: 42,
      formula: `[POL ${player.pol_attr || 70} * 0.5 = 35] + [Lễ nghi quý tộc +14] + [D20: 10] = 59 >= DC 42`
    };
    narrative = lastNarrative || 'Viên Thiệu ngồi trên sập gụ khảm xà cừ, phong thái ung dung quý phái: "Lương Diễn, Ký Châu ta đất rộng người đông, trăm họ ấm no, binh lương dồi dào. Ngươi từ U Châu đến mang theo thương đoàn, có muốn ký kết giao thương lụa là và lúa gạo với các đại tộc Nghiệp Thành hay không?"';
    options = [
      {
        id: 'OPT_1',
        icon: '🎋',
        title: 'Xuất bán 20 tấm Chiếu Trúc Lương Gia cho các đại tộc Nghiệp Thành (Thu 1,600 Tiền)',
        desc: 'Mở rộng thị trường thủ công mỹ nghệ cao cấp tại Ký Châu',
        action: { type: 'TRADE_SELL', item_code: 'PROD-MAT', quantity: 20, unit_price: 80, counterparty: 'Thế tộc Nghiệp Thành', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🌾',
        title: 'Gom mua 15 thạch lương Ký Châu giá sỉ từ thương lái (Chi 2,100 Tiền)',
        desc: '+15 COM-GRAIN vào kho dự trữ • Tối ưu giá lương thảo',
        action: { type: 'TRADE_BUY', item_code: 'COM-GRAIN', quantity: 15, unit_price: 140, counterparty: 'Lương thương Ký Châu', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '🍷',
        title: 'Dự dạ yến phủ Viên Thiệu đàm đạo thời thế hào kiệt',
        desc: 'EXP Chính Trị & Xã Giao +25 • Tăng thanh thế gia tộc Lương Thị',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0012', amount: 100, counterparty: 'Viên Thiệu (Bản Sơ)', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🐎',
        title: 'Rời Nghiệp Thành, theo đường bắc tiến về Huyện Trác',
        desc: 'Cơ động về Huyện Trác',
        action: { type: 'MOVE_LOCATION', new_location: 'Vườn Đào', game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Hạ Phì Thành Lũy') {
    locationFull = 'Hạ Phì Thành Phủ — Ngư Diêm Trọng Trấn Từ Châu';
    npc = {
      id: 'NPC-0014',
      name: 'Đào Khiêm (Cung Tổ)',
      title: 'Từ Châu Thứ Sử — POL 76 / DIP 78',
      sentiment: 68,
      sentimentStatus: 'Hảo cảm: +25 (Thương đoàn hòa hảo)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA THƯƠNG NGHIỆP DỰ ĐỘNG & NGƯ DIÊM (COM/POL)',
      title: 'Đàm Phán Độc Quyền Muối Cá Từ Châu',
      score: 57,
      dc: 40,
      formula: `[COM ${player.com_attr || 78} * 0.5 = 39] + [Ngoại thương duyên hải +10] + [D20: 8] = 57 >= DC 40`
    };
    narrative = lastNarrative || 'Thứ Sử Đào Khiêm cùng cự phú Mi Trúc tiếp đãi Lương Diễn: "Từ Châu ta giáp biển, sản vật ngư diêm vô cùng phong phú, nhưng biên giới lại thường bị thảo khấu quấy nhiễu. Thương hội của Lương các hạ vừa có khí giới chắc chắn lại vừa thông thạo giao thương, thực là đối tác quý báu của bách tính Hạ Phì!"';
    options = [
      {
        id: 'OPT_1',
        icon: '🛡️',
        title: 'Xuất bán 10 Khiên Trúc hỗ trợ dân binh Từ Châu phòng thủ (Thu 2,400 Tiền)',
        desc: 'Cung cấp khiên giáp giữ thành Hạ Phì • Thu 2,400 Tiền ngân khố Từ Châu',
        action: { type: 'TRADE_SELL', item_code: 'PROD-SHIELD-BAM', quantity: 10, unit_price: 240, counterparty: 'Từ Châu Thứ Sử Đào Khiêm', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🧂',
        title: 'Thu mua 15 đấu muối biển duyên hải Từ Châu giá rẻ (Chi 900 Tiền)',
        desc: '+15 COM-SALT vào kho • Đơn giá ưu đãi 60 Tiền/đấu',
        action: { type: 'TRADE_BUY', item_code: 'COM-SALT', quantity: 15, unit_price: 60, counterparty: 'Diêm trường Hạ Phì', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '🤝',
        title: 'Tiếp xúc cự phú Mi Trúc bàn kế hoạch liên minh thương hội',
        desc: 'Kết giao đại tộc Từ Châu • EXP Thương Nghiệp +20',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0014', amount: 100, counterparty: 'Mi Trúc (Đại Phú Từ Châu)', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🐎',
        title: 'Rời Hạ Phì, trở về Hậu Phương Trang Viên Vườn Đào Huyện Trác',
        desc: 'Cơ động về bản doanh U Châu',
        action: { type: 'MOVE_LOCATION', new_location: 'Vườn Đào', game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Trường An Cung Phủ') {
    locationFull = 'Trường An Cung Phủ — Cố Đô Hùng Vĩ Quan Trung';
    npc = {
      id: 'NPC-0015',
      name: 'Vương Doãn (Tử Sư)',
      title: 'Tư Đồ • Đại Thần Triều Hán — POL 84 / DIP 86',
      sentiment: 66,
      sentimentStatus: 'Độ tín nhiệm: +20 (Trung thần triều đình)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA MƯU LƯỢC QUỐC CHÍNH & MẬT MÔ (POL/INT)',
      title: 'Mật Nghị Cùng Tư Đồ Vương Doãn',
      score: 61,
      dc: 44,
      formula: `[POL ${player.pol_attr || 70} * 0.5 = 35] + [Cung đình bí mật +16] + [D20: 10] = 61 >= DC 44`
    };
    narrative = lastNarrative || 'Tư Đồ Vương Doãn kéo Lương Diễn vào mật thất, giọng trầm ngâm: "Trường An là đất Quan Trung hiểm trở, non sông bốn bể bảo bọc. Nay triều đình bão táp, Tây Lương binh mã tràn ngập, chỉ có những bậc thương gia thâm trầm tích cốc trữ binh như Lương công tử mới có thể giữ yên nghiệp lớn. Ngươi định lập chi điếm tại đây chứ?"';
    options = [
      {
        id: 'OPT_1',
        icon: '🎖️',
        title: 'Nhận ban thưởng 2,500 Tiền ngân khố Quan Trung tiếp trợ triều đình',
        desc: '+2,500 Tiền mặt • Ghi nhận quân huân Tây Đô',
        action: { type: 'RECORD_BOUNTY', counterparty: 'Tư Đồ Phủ Trường An', amount: 2500, memo: 'Tiếp trợ ngân khố phòng ngự Tây Đô', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🌾',
        title: 'Xuất bán 10 thạch lương cho kho đồn trú Trường An (Thu 1,900 Tiền)',
        desc: '-10 COM-GRAIN • Giá lương đồn trú Tây Đô cực cao',
        action: { type: 'TRADE_SELL', item_code: 'COM-GRAIN', quantity: 10, unit_price: 190, counterparty: 'Quân nhu Trường An', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '🛒',
        title: 'Mua 8 tấm da trâu hảo hạng Tây Lương (Chi 800 Tiền)',
        desc: '+8 COM-LEATH da thuộc dai bền chuẩn bị chế tác giáp',
        action: { type: 'TRADE_BUY', item_code: 'COM-LEATH', quantity: 8, unit_price: 100, counterparty: 'Thương nhân Quan Trung', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🐎',
        title: 'Rời Trường An, qua Đồng Quan trở về Lạc Dương',
        desc: 'Hành quân về phía đông sang Lạc Dương',
        action: { type: 'MOVE_LOCATION', new_location: 'Kinh Đô Lạc Dương', game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Tương Dương Châu Phủ') {
    locationFull = 'Tương Dương Châu Phủ — Thiên Hạ Yết Hầu Kinh Châu';
    npc = {
      id: 'NPC-0016',
      name: 'Lưu Biểu (Cảnh Thăng)',
      title: 'Kinh Châu Mục • Bát Tuấn Thiên Hạ — POL 80 / DIP 82',
      sentiment: 72,
      sentimentStatus: 'Độ hòa hảo: +35 (Nho nhã kết giao)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA VĂN PHONG SĨ KHÍ & THƯƠNG VỤ SÔNG NƯỚC (DIP/COM)',
      title: 'Đàm Phán Giao Thương Hán Thủy & Kinh Tương',
      score: 58,
      dc: 42,
      formula: `[DIP ${player.dip_attr || 75} * 0.5 = 37] + [Kinh thư biện thuyết +11] + [D20: 10] = 58 >= DC 42`
    };
    narrative = lastNarrative || 'Kinh Châu Mục Lưu Biểu nâng chén trà Lục Vũ, mỉm cười đón khách: "Tương Dương đất rộng sông dài, ngàn thuyền tấp nập, sĩ phu Trung Nguyên tị nạn kéo về đây như mây. Lương Diễn, hàng tre đan và đồ thủ công U Châu của ngươi nức tiếng thanh nhã, nếu đem bán dọc bến Hán Thủy thì thương khách tranh nhau mua hết!"';
    options = [
      {
        id: 'OPT_1',
        icon: '🧂',
        title: 'Xuất bán 10 đấu muối biển cho thương đoàn Kinh Tương (Thu 950 Tiền)',
        desc: '-10 COM-SALT • Kinh Châu khan hiếm muối biển, giá cao',
        action: { type: 'TRADE_SELL', item_code: 'COM-SALT', quantity: 10, unit_price: 95, counterparty: 'Thương đoàn Kinh Tương', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🌾',
        title: 'Thu mua 10 thạch lúa gạo thơm Kinh Châu (Chi 1,500 Tiền)',
        desc: '+10 COM-GRAIN lúa gạo miền sông nước dự trữ dồi dào',
        action: { type: 'TRADE_BUY', item_code: 'COM-GRAIN', quantity: 10, unit_price: 150, counterparty: 'Thực túc cục Tương Dương', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '📜',
        title: 'Thăm hỏi danh sĩ Thủy Kính Trang đàm đạo về nhân tài thiên hạ',
        desc: 'EXP Mưu Lược & Nhân Mạch +20 • Mở rộng danh vọng',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0016', amount: 100, counterparty: 'Lưu Biểu (Kinh Châu Mục)', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🐎',
        title: 'Rời Tương Dương, trở về Hậu Phương Trang Viên Vườn Đào Huyện Trác',
        desc: 'Hành quân trở về U Châu',
        action: { type: 'MOVE_LOCATION', new_location: 'Vườn Đào', game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Giang Lăng Thủy Doanh') {
    locationFull = 'Giang Lăng Thủy Doanh — Thủy Sư Yếu Trùng Nam Quận';
    npc = {
      id: 'NPC-0017',
      name: 'Thủy Sư Hiệu Úy (Giang Lăng)',
      title: 'Chỉ Huy Thủy Quân Trấn Giang — WAR 75 / LOG 72',
      sentiment: 68,
      sentimentStatus: 'Tín nhiệm: +25 (Khí giới thủy quân)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA ĐIỀU ĐỘ THỦY CHIẾN & VẬN TẢI THUYỀN BÈ (LOG/WAR)',
      title: 'Kiểm Định Thuyền Mông Xung & Khiên Chống Tên Lửa',
      score: 55,
      dc: 40,
      formula: `[LOG ${player.log_attr || 70} * 0.5 = 35] + [Vận tải đường sông +11] + [D20: 9] = 55 >= DC 40`
    };
    narrative = lastNarrative || 'Thủy Sư Hiệu Úy đứng trên soái đài nhìn hàng trăm chiến thuyền neo đậu trên Trường Giang: "Giang Lăng là cửa ngõ thủy lộ huyết mạch của cả vùng sông nước. Khí giới khiên giáp nhẹ của Lương công tử đan bằng tre dẻo bọc da bơi lội không chìm, thủy binh của ta rất cần để chống nỏ tên giặc cướp!"';
    options = [
      {
        id: 'OPT_1',
        icon: '🛡️',
        title: 'Cung cấp 8 Khiên Trúc bọc da chống tên cho thủy binh (Thu 2,000 Tiền)',
        desc: 'Trang bị khiên giáp bơi lội tốt cho đội thủy chiến',
        action: { type: 'TRADE_SELL', item_code: 'PROD-SHIELD-BAM', quantity: 8, unit_price: 250, counterparty: 'Thủy Sư Giang Lăng', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🛒',
        title: 'Thu mua 8 tấm da trâu bọc mạn thuyền (Chi 800 Tiền)',
        desc: '+8 COM-LEATH da thuộc tuyển chọn từ thương nhân Trường Giang',
        action: { type: 'TRADE_BUY', item_code: 'COM-LEATH', quantity: 8, unit_price: 100, counterparty: 'Thương cảng Giang Lăng', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '⛵',
        title: 'Huấn luyện phối hợp thủy chiến và kiểm tra tuần giang',
        desc: 'Tăng cường kinh nghiệm thủy chiến • EXP Quân Sự +20',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0017', amount: 100, counterparty: 'Thủy Sư Hiệu Úy Giang Lăng', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '⛵',
        title: 'Thuyền chiến xuôi dòng Trường Giang tiến tới Xích Bích',
        desc: 'Cơ động bằng đường thủy sang Xích Bích',
        action: { type: 'MOVE_LOCATION', new_location: 'Xích Bích Thủy Trại', game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Xích Bích Thủy Trại') {
    locationFull = 'Xích Bích & Sài Tang Thủy Trại — Tiền Tuyến Hỏa Công Trường Giang';
    npc = {
      id: 'NPC-0018',
      name: 'Chu Du (Công Cẩn)',
      title: 'Đông Ngô Tiền Bộ Đại Đô Đốc — INT 96 / WAR 71 / LDR 95',
      sentiment: 75,
      sentimentStatus: 'Kính nể: +40 (Hiệp đồng tác chiến)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA THỦY VĂN HỎA CÔNG & LIÊN HOÀN KẾ (TAC/INT)',
      title: 'Quan Sát Hướng Gió Đông Trường Giang',
      score: 66,
      dc: 45,
      formula: `[INT ${player.int_attr || 80} * 0.5 = 40] + [Kế hỏa công sông nước +16] + [D20: 10] = 66 >= DC 45`
    };
    narrative = lastNarrative || 'Đại Đô Đốc Chu Du áo trắng trường bào, tay cầm kiếm chỉ ra khúc sông Xích Bích sương mù giăng kín: "Vạn chiến thuyền liên hoàn khóa xích trên sông lớn chẳng khác nào đống củi khô chờ lửa bén! Lương Diễn, khiên trúc chống cháy và lương thảo của ngươi chuyển tới đúng lúc đại trận sắp mở màn!"';
    options = [
      {
        id: 'OPT_1',
        icon: '🛡️',
        title: 'Chi viện 10 Khiên Trúc bọc da chống lửa cho hạm đội (Thu 2,500 Tiền)',
        desc: 'Hỗ trợ đội mồi lửa áp sát • Hảo cảm Chu Du +10',
        action: { type: 'TRADE_SELL', item_code: 'PROD-SHIELD-BAM', quantity: 10, unit_price: 250, counterparty: 'Đông Ngô Đô Đốc Chu Du', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🌾',
        title: 'Tiếp tế 10 thạch quân lương cho thủy trại Sài Tang (Thu 1,800 Tiền)',
        desc: '-10 COM-GRAIN • Chi viện quân lương cấp bách',
        action: { type: 'TRADE_SELL', item_code: 'COM-GRAIN', quantity: 10, unit_price: 180, counterparty: 'Quân nhu Sài Tang', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '🔥',
        title: 'Cùng Chu Du khảo sát phong hướng và sa bàn thủy chiến Trường Giang',
        desc: 'EXP Binh Pháp Đỉnh Cao +30 • Uy danh vang dội Giang Đông',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0018', amount: 100, counterparty: 'Chu Du (Công Cẩn)', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '⛵',
        title: 'Thuyền ngược dòng trở về căn cứ Giang Lăng',
        desc: 'Cơ động đường thủy về Giang Lăng',
        action: { type: 'MOVE_LOCATION', new_location: 'Giang Lăng Thủy Doanh', game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Kiến Nghiệp Đô Thành') {
    locationFull = 'Kiến Nghiệp Đô Thành — Giang Đông Kim Lăng Vương Phủ';
    npc = {
      id: 'NPC-0019',
      name: 'Tôn Quyền (Trọng Mưu)',
      title: 'Giang Đông Chi Chủ • Ngô Vương — POL 86 / LDR 88',
      sentiment: 70,
      sentimentStatus: 'Độ kính trọng: +30 (Thương gia Bắc quốc)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA HẢI THƯƠNG & XÃ TẮC THIÊN HIỂM (POL/COM)',
      title: 'Yết Kiến Giang Đông Chi Chủ Tôn Quyền',
      score: 60,
      dc: 42,
      formula: `[POL ${player.pol_attr || 70} * 0.5 = 35] + [Ngoại thương Giang Nam +13] + [D20: 12] = 60 >= DC 42`
    };
    narrative = lastNarrative || 'Tôn Quyền mắt biếc râu tía, uy nghiêm đón tiếp Lương Diễn tại điện Kiến Nghiệp: "Giang Đông ta dựa vào thiên hiểm Trường Giang hiểm trở, dân giàu của nhiều, đội thương thuyền vượt biển tới tận Giao Châu. Lương gia ngươi bắc kết U Châu, nay lại nam tiến Giang Đông, muốn cùng Đông Ngô ta định ra thế cờ thiên hạ chứ?"';
    options = [
      {
        id: 'OPT_1',
        icon: '🎋',
        title: 'Xuất bán 20 Chiếu Trúc Lương Gia cho cung phủ Đông Ngô (Thu 1,800 Tiền)',
        desc: 'Chiếu trúc U Châu mát mẻ mùa hạ rất được quý tộc Giang Đông chuộng',
        action: { type: 'TRADE_SELL', item_code: 'PROD-MAT', quantity: 20, unit_price: 90, counterparty: 'Vương phủ Kiến Nghiệp', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🍵',
        title: 'Mua sỉ đặc sản gốm sứ và trà quý Giang Nam (Chi 1,000 Tiền)',
        desc: 'Thương phẩm đặc sắc giá trị cao • Tăng quan hệ thương mại',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0019', amount: 100, counterparty: 'Thương Điếm Giang Nam', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '🐅',
        title: 'Yết kiến Tôn Quyền đàm đạo thế liên minh phòng thủ phương Bắc',
        desc: 'EXP Chính Trị & Ngoại Giao +25 • Tăng danh vọng Giang Đông',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0019', amount: 100, counterparty: 'Tôn Quyền (Trọng Mưu)', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🐎',
        title: 'Rời Kiến Nghiệp, trở về Hậu Phương Trang Viên Vườn Đào Huyện Trác',
        desc: 'Hành quân trở về U Châu',
        action: { type: 'MOVE_LOCATION', new_location: 'Vườn Đào', game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Hán Trung Thiên Sư Phủ') {
    locationFull = 'Hán Trung Thiên Sư Phủ — Cửa Ngõ Ba Thục & Sạn Đạo';
    npc = {
      id: 'NPC-0020',
      name: 'Trương Lỗ (Công Kỳ)',
      title: 'Thiên Sư Đạo Chủ • Trấn Dân Tướng Quân — POL 75 / DIP 72',
      sentiment: 65,
      sentimentStatus: 'Hòa hảo: +20 (Đạo nghĩa tương trợ)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA ĐẠO LÝ HIỆP THƯƠNG & SẠN ĐẠO (DIP/LOG)',
      title: 'Hiệp Thương Tuyến Tiếp Vận Đường Núi Hán Trung',
      score: 56,
      dc: 40,
      formula: `[DIP ${player.dip_attr || 75} * 0.5 = 37] + [Khai thông sạn đạo +10] + [D20: 9] = 56 >= DC 40`
    };
    narrative = lastNarrative || 'Thiên Sư Trương Lỗ mặc áo đạo bào, khoát tay chỉ lên những nẻo đường núi Tần Lĩnh: "Hán Trung ta lập nghĩa xá chứa cơm gạo không lấy tiền cho khách bộ hành, dân chúng an cư lạc nghiệp. Con đường sạn đạo vào Thục vách đá dựng đứng cheo leo, Lương công tử nếu muốn thông thương qua Kiếm Các thì cần có sự chuẩn bị chu tất!"';
    options = [
      {
        id: 'OPT_1',
        icon: '🌾',
        title: 'Quyên góp 5 thạch lương vào nghĩa xá tăng uy vọng (Thu 900 Tiền tạ lễ)',
        desc: 'Tạo phúc đức trong vùng • Tăng danh tiếng thiện nhân',
        action: { type: 'TRADE_SELL', item_code: 'COM-GRAIN', quantity: 5, unit_price: 180, counterparty: 'Nghĩa Xá Thiên Sư Đạo', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🛒',
        title: 'Thu mua 8 vị thảo dược quý Tần Lĩnh trị thương (Chi 800 Tiền)',
        desc: '+8 COM-LEATH thuốc quý và da hươu núi chữa thương cho quân lính',
        action: { type: 'TRADE_BUY', item_code: 'COM-LEATH', quantity: 8, unit_price: 100, counterparty: 'Dược phòng Hán Trung', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '🛡️',
        title: 'Cung cấp 5 Khiên Trúc bảo vệ dịch trạm đường núi Kiếm Các (Thu 1,250 Tiền)',
        desc: 'Hỗ trợ tuần binh đường đèo • Thu 1,250 Tiền từ quan phủ Hán Trung',
        action: { type: 'TRADE_SELL', item_code: 'PROD-SHIELD-BAM', quantity: 5, unit_price: 250, counterparty: 'Trấn Dân Phủ Hán Trung', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🐎',
        title: 'Vượt Kiếm Các quan ải hiểm trở tiến vào Thành Đô',
        desc: 'Tiến vào thủ phủ đất Thục',
        action: { type: 'MOVE_LOCATION', new_location: 'Thành Đô Ích Châu Phủ', game_date: meta.current_date || '184-05-02' }
      }
    ];
  } else if (currentLocKey === 'Thành Đô Ích Châu Phủ') {
    locationFull = 'Thành Đô Đại Phủ — Thiên Phủ Chi Quốc (Đô Thành Thục Hán)';
    npc = {
      id: 'NPC-0021',
      name: 'Lưu Chương (Quý Ngọc)',
      title: 'Ích Châu Mục • Trấn Tây Tướng Quân — POL 65 / DIP 68',
      sentiment: 70,
      sentimentStatus: 'Nhiệt tình: +30 (Khách quý phương xa)'
    };
    lastCheck = {
      status: 'THÀNH CÔNG',
      type: 'KIỂM TRA PHỒN VINH THIÊN PHỦ & THỤC CẨM (COM/POL)',
      title: 'Khảo Sát Thục Cẩm & Nông Nghiệp Đô Giang Yển',
      score: 58,
      dc: 40,
      formula: `[COM ${player.com_attr || 78} * 0.5 = 39] + [Định giá thủ công mỹ nghệ +11] + [D20: 8] = 58 >= DC 40`
    };
    narrative = lastNarrative || 'Ích Châu Mục Lưu Chương nâng chén mỹ tửu hoa đào, vui vẻ thốt lên: "Đất Thục ta ngàn dặm phì nhiêu, Đô Giang Yển tưới tiêu vô hạn, chưa từng biết tới hạn hán mất mùa. Thục Cẩm dệt ra rực rỡ nghìn năm, nay lại được thấy Chiếu Trúc và Khiên Lương Gia thanh thoát nhường này! Lương công tử đến đây quả khiến Thành Đô thêm phần rực rỡ!"';
    options = [
      {
        id: 'OPT_1',
        icon: '🎋',
        title: 'Xuất bán 20 tấm Chiếu Trúc Lương Gia cho phủ Ích Châu (Thu 1,800 Tiền)',
        desc: 'Được giới quý tộc Thục Hán tán thưởng nhiệt liệt',
        action: { type: 'TRADE_SELL', item_code: 'PROD-MAT', quantity: 20, unit_price: 90, counterparty: 'Ích Châu Châu Phủ', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_2',
        icon: '🌾',
        title: 'Thu mua 10 thạch lúa gạo Thiên Phủ dồi dào dự trữ (Chi 1,400 Tiền)',
        desc: '+10 COM-GRAIN lúa gạo trù phú bồn địa Tứ Xuyên',
        action: { type: 'TRADE_BUY', item_code: 'COM-GRAIN', quantity: 10, unit_price: 140, counterparty: 'Lương điền Thành Đô', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '🍷',
        title: 'Dự tiệc rượu Tây Thục thưởng thức nhạc vũ và Thục Cẩm tinh hoa',
        desc: 'EXP Chính Trị & Văn Hóa +25 • Tăng hòa hảo lãnh chúa Ích Châu',
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0021', amount: 100, counterparty: 'Lưu Chương (Ích Châu Mục)', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🐎',
        title: 'Rời Thành Đô, vượt Kiếm Các quay về Hán Trung',
        desc: 'Cơ động ngược ra Hán Trung',
        action: { type: 'MOVE_LOCATION', new_location: 'Hán Trung Thiên Sư Phủ', game_date: meta.current_date || '184-05-02' }
      }
    ];
  }

  // 4-Pillar Dynamic Contextual Action Matrix Engine
  const actionEngine = globalThis.__CONTEXT_ACTION_ENGINE__;
  if (actionEngine && typeof actionEngine.generateChoices === 'function') {
    try {
      const dynamicChoices = actionEngine.generateChoices(currentLocKey, player, inventory, meta);
      if (dynamicChoices && dynamicChoices.length > 0) {
        options = dynamicChoices;
      }
    } catch (e) {
      console.warn('[ContextActionEngine] Error generating choices:', e.message);
    }
  }

  return {
    success: true,
    campaign: {
      title: 'TAM QUỐC CHÍ • LƯƠNG THỊ PHONG VÂN LỤC',
      date: `Ngày 2 Tháng 5 Năm ${meta.campaign_id ? '184 SCN' : '184 SCN'}`,
      turn: meta.active_turn ?? 6,
      location: locationFull,
      activeSubLocation: currentLocKey,
      subLocations: subLocationsList
    },
    npc,
    lastCheck,
    narrative,
    options,
    relations
  };
}

  // 8. GET /api/scene - Current Narrative & Tactical Choice Scene
  if (req.method === 'GET' && pathname === '/api/scene') {
    try {
      const subLoc = parsedUrl.query.subLocation || 'Vườn Đào';
      const sceneData = generateDynamicScene(DB_PATH, subLoc);
      sendJson(res, 200, sceneData);
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // 9. POST /api/agent/prompt - Agent Bridge Natural Language Dispatcher (With Locality & Courier Logic)
  if (req.method === 'POST' && pathname === '/api/agent/prompt') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const userPrompt = (payload.prompt || '').trim().toLowerCase();
        let subLocation = payload.subLocation || 'Vườn Đào';
        const core = new SimulationCore(DB_PATH);

        let actionToRun = null;
        let replyNarrative = '';
        let dispatchType = null; // 'LOCAL' | 'COURIER' | 'TRAVEL'
        let targetLoc = null;
        let diceCheck = null;
        let tacticalReasoning = '';
        let delta = {};

        // Direct ChoiceId Resolution from Current Scene
        if (payload.choiceId) {
          const currentScene = generateDynamicScene(DB_PATH, subLocation);
          const matchedOpt = (currentScene.options || []).find(o => o.id === payload.choiceId);
          if (matchedOpt && matchedOpt.action) {
            actionToRun = matchedOpt.action;
            replyNarrative = `${matchedOpt.title} đã được phê chuẩn và điều phối thành công.`;
            dispatchType = (actionToRun.type === 'MOVE_LOCATION') ? 'TRAVEL' : 'LOCAL';
            if (actionToRun.type === 'MOVE_LOCATION') {
              subLocation = actionToRun.new_location;
              replyNarrative = `Lương Diễn đã khởi hành di chuyển tới **${actionToRun.new_location}**. Bối cảnh chiến lược cập nhật thành công!`;
            }
          }
        }

        const isTravelIntent = !actionToRun && (userPrompt.includes('đi') || 
                                userPrompt.includes('đến') || 
                                userPrompt.includes('tới') || 
                                userPrompt.includes('rời') || 
                                userPrompt.includes('sang') || 
                                userPrompt.includes('về') || 
                                userPrompt.includes('travel') || userPrompt.includes('go to') || userPrompt.includes('march') || 
                                userPrompt.includes('move')) && 
                               !userPrompt.includes('thư') && 
                               !userPrompt.includes('mua') && 
                               !userPrompt.includes('bán') && !userPrompt.includes('buy') && !userPrompt.includes('sell') && 
                               !userPrompt.includes('sản xuất') &&
                               !userPrompt.includes('thưởng');

        // 1. PHYSICAL TRAVEL / RELOCATION ACTIONS
        if (isTravelIntent && (userPrompt.includes('đông môn') || userPrompt.includes('chợ') || userPrompt.includes('east gate') || userPrompt.includes('market'))) {
          subLocation = 'Chợ Đông Môn';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Chợ Đông Môn', game_date: '184-05-02' };
          replyNarrative = 'Lương Diễn thu xếp hành lý, rời bước rảo sang Chợ Đông Môn Huyện Trác. Nơi đây tiếng rao hàng của thương nhân Ký Châu và binh sĩ nghĩa quân vang vọng nhộn nhịp!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('xưởng') || userPrompt.includes('chức tác') || userPrompt.includes('workshop'))) {
          subLocation = 'Xưởng Lương Thị';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Xưởng Lương Thị', game_date: '184-05-02' };
          replyNarrative = 'Lương Diễn trở về Lương Thị Chức Tác Phường. Tiếng đan tre, lách cách dệt chiếu và mùi thuộc da của các gia nhân thợ dệt tràn ngập không khí!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('bắc bình') || userPrompt.includes('kế thành') || userPrompt.includes('công tôn toản'))) {
          subLocation = 'Bắc Bình Soái Phủ';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Bắc Bình Soái Phủ', game_date: '184-05-02' };
          replyNarrative = 'Đoàn kỵ mã men theo sườn núi U Châu tiến vào Bắc Bình Soái Phủ. Hàng ngũ kỵ binh Bạch Mã Nghĩa Tòng uy phong lẫm liệt gươm giáo sáng ngời!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('nghiệp thành') || userPrompt.includes('viên thiệu') || userPrompt.includes('yecheng'))) {
          subLocation = 'Nghiệp Thành Đại Phủ';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Nghiệp Thành Đại Phủ', game_date: '184-05-02' };
          replyNarrative = 'Đoàn thương lữ tiến vào Nghiệp Thành — đô phủ trù phú bậc nhất Hà Bắc. Dinh thự các đại tộc san sát, gấm lụa rực rỡ khắp phố phường!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('quảng tông') || userPrompt.includes('doanh trại') || userPrompt.includes('lư thực'))) {
          subLocation = 'Quảng Tông Quân Doanh';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Quảng Tông Quân Doanh', game_date: '184-05-02' };
          replyNarrative = 'Đoàn xe theo đường hành quân tiến thẳng về tiền tuyến Quảng Tông. Cờ xí Bắc Quân của Lư Thực tung bay trong gió cát!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('bình nguyên') || userPrompt.includes('pingyuan'))) {
          subLocation = 'Bình Nguyên Trọng Trấn';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Bình Nguyên Trọng Trấn', game_date: '184-05-02' };
          replyNarrative = 'Đoàn thương lữ Lương gia vượt qua quan ải biên giới Ký - Thanh, tiến vào Trọng Trấn Bình Nguyên. Binh mã các lộ nghĩa dũng rầm rộ qua lại!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('hứa xương') || userPrompt.includes('xuchang') || userPrompt.includes('trường xã') || userPrompt.includes('changshe') || userPrompt.includes('dĩnh xuyên') || userPrompt.includes('tào tháo'))) {
          subLocation = 'Hứa Xương Tướng Phủ';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Hứa Xương Tướng Phủ', game_date: '184-05-02' };
          replyNarrative = 'Đoàn quân kỵ áp tải lương thảo tiến sâu vào bình nguyên Dự Châu tới Hứa Xương Tướng Phủ. Doanh trại đồn điền lớp lớp, quân lệnh nghiêm minh!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('hạ phì') || userPrompt.includes('xiapi') || userPrompt.includes('từ châu') || userPrompt.includes('đào khiêm'))) {
          subLocation = 'Hạ Phì Thành Lũy';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Hạ Phì Thành Lũy', game_date: '184-05-02' };
          replyNarrative = 'Đoàn lữ hành tiến vào Hạ Phì — trọng trấn duyên hải Từ Châu. Gió biển mặn mòi, thương thuyền ghe cá tấp nập đậu chật bến cảng!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('lạc dương') || userPrompt.includes('luoyang') || userPrompt.includes('kinh đô') || userPrompt.includes('kinh sư'))) {
          subLocation = 'Kinh Đô Lạc Dương';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Kinh Đô Lạc Dương', game_date: '184-05-02' };
          replyNarrative = 'Đoàn kỵ sĩ vượt qua Hổ Lao Quan, chiêm ngưỡng tường thành đồ sộ tráng lệ của Kinh Đô Lạc Dương. Khí phái đế vương uy nghiêm!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('trường an') || userPrompt.includes('changan') || userPrompt.includes('quan trung') || userPrompt.includes('tây đô'))) {
          subLocation = 'Trường An Cung Phủ';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Trường An Cung Phủ', game_date: '184-05-02' };
          replyNarrative = 'Vượt qua ải Đồng Quan hiểm trở, Lương Diễn tiến vào Tây Đô Trường An hùng vĩ. Đất Quan Trung trù phú, thành cao hào sâu vững chãi nghìn năm!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('tương dương') || userPrompt.includes('xiangyang') || userPrompt.includes('lưu biểu'))) {
          subLocation = 'Tương Dương Châu Phủ';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Tương Dương Châu Phủ', game_date: '184-05-02' };
          replyNarrative = 'Đoàn thuyền buôn cặp bến Hán Thủy, tiến vào Tương Dương Châu Phủ. Bách tính an lạc, danh sĩ sĩ phu tề tựu đàm luận kinh sử!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('giang lăng') || userPrompt.includes('jiangling') || userPrompt.includes('nam quận'))) {
          subLocation = 'Giang Lăng Thủy Doanh';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Giang Lăng Thủy Doanh', game_date: '184-05-02' };
          replyNarrative = 'Thuyền chiến cặp bến cảng quân sự Giang Lăng. Chiến hạm Lâu Thuyền, Mông Xung neo đậu san sát, cờ hiệu rực đỏ trên sóng nước Trường Giang!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('xích bích') || userPrompt.includes('chibi') || userPrompt.includes('sài tang') || userPrompt.includes('chu du'))) {
          subLocation = 'Xích Bích Thủy Trại';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Xích Bích Thủy Trại', game_date: '184-05-02' };
          replyNarrative = 'Thuyền xuôi dòng qua khúc ngoặt hiểm trở của Trường Giang, tiến vào Thủy Trại Xích Bích. Vách đá đỏ sừng sững bên ngọn sóng gầm vang!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('kiến nghiệp') || userPrompt.includes('jianye') || userPrompt.includes('đông ngô') || userPrompt.includes('tôn quyền'))) {
          subLocation = 'Kiến Nghiệp Đô Thành';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Kiến Nghiệp Đô Thành', game_date: '184-05-02' };
          replyNarrative = 'Đoàn thương thuyền cập cảng Kim Lăng, bước vào Đô Thành Kiến Nghiệp của Đông Ngô. Khí hậu ấm áp, trà thơm gốm quý Giang Nam phồn thịnh!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('hán trung') || userPrompt.includes('hanzhong') || userPrompt.includes('trương lỗ'))) {
          subLocation = 'Hán Trung Thiên Sư Phủ';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Hán Trung Thiên Sư Phủ', game_date: '184-05-02' };
          replyNarrative = 'Vượt qua đường sạn đạo treo leo giữa vách núi Tần Lĩnh, Lương Diễn đặt chân đến thung lũng Hán Trung phì nhiêu. Tiếng chuông đạo quán ngân vang thanh tịnh!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('thành đô') || userPrompt.includes('chengdu') || userPrompt.includes('ba thục') || userPrompt.includes('lưu chương'))) {
          subLocation = 'Thành Đô Ích Châu Phủ';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Thành Đô Ích Châu Phủ', game_date: '184-05-02' };
          replyNarrative = 'Vượt qua hiểm quan Kiếm Các sừng sững, Lương Diễn tiến vào Thành Đô — Thiên Phủ Chi Quốc. Đất đai trù phú ngút ngàn, sắc thục cẩm rực rỡ lộng lẫy!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('vườn đào') || userPrompt.includes('trương phi') || userPrompt.includes('orchard') || userPrompt.includes('peach garden'))) {
          subLocation = 'Vườn Đào';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Vườn Đào', game_date: '184-05-02' };
          replyNarrative = 'Lương Diễn quay về Trang viên Vườn Đào. Trương Phi vẫn đang ngồi sảng khoái dưới gốc đào uống rượu chờ đợi!';
          dispatchType = 'TRAVEL';
        }

        // 2. ECONOMIC & LOGISTICAL ACTIONS (With Locality & Courier Rules)
        else if ((userPrompt.includes('mua') || userPrompt.includes('buy') || userPrompt.includes('purchase')) && (userPrompt.includes('da') || userPrompt.includes('leather'))) {
          targetLoc = 'Vườn Đào';
          actionToRun = {
            type: 'TRADE_BUY',
            item_code: 'COM-LEATH',
            quantity: 8,
            unit_price: 100,
            counterparty: 'Trương Phi (Lò mổ Trác Quận)',
            game_date: '184-05-02'
          };
          if (subLocation === 'Vườn Đào') {
            replyNarrative = 'Trương Phi sảng khoái vỗ đùi: "Tốt lắm! 8 tấm da trâu hảo hạng này giao cho đệ, lát nữa sai gia nhân chuyển thẳng về xưởng Lương Thị!"';
            dispatchType = 'LOCAL';
          } else {
            replyNarrative = `Lương Diễn đang tại ${subLocation}, liền phi thư gửi sang Trang Viên Vườn Đào nhờ Trương Phi gom hộ 8 tấm da thuộc hảo hạng lò mổ. Trương Phi nhận thư cười to, lập tức cho thuộc hạ áp tải da chuyển thẳng về xưởng!`;
            dispatchType = 'COURIER';
          }
        } else if ((userPrompt.includes('mua') || userPrompt.includes('buy') || userPrompt.includes('purchase')) && (userPrompt.includes('lương') || userPrompt.includes('gạo') || userPrompt.includes('grain'))) {
          targetLoc = 'Chợ Đông Môn';
          actionToRun = {
            type: 'TRADE_BUY',
            item_code: 'COM-GRAIN',
            quantity: 5,
            unit_price: 160,
            counterparty: 'Lương thương Huyện Trác',
            game_date: '184-05-02'
          };
          if (subLocation === 'Chợ Đông Môn') {
            replyNarrative = 'Đoàn xe vận lương tại Chợ Đông Môn đã giao dịch và nhập thêm 5 Thạch tiểu mạch vào kho dự trữ. Quân lương sung túc!';
            dispatchType = 'LOCAL';
          } else {
            replyNarrative = `Lương Diễn đang tại ${subLocation}, liền sai gia đinh mang lệnh bài và ngân phiếu phi ngựa ra Chợ Đông Môn thu mua 5 Thạch tiểu mạch dự trữ áp tải về kho!`;
            dispatchType = 'COURIER';
          }
        } else if ((userPrompt.includes('bán') || userPrompt.includes('sell')) && (userPrompt.includes('chiếu') || userPrompt.includes('mat'))) {
          targetLoc = 'Chợ Đông Môn';
          actionToRun = {
            type: 'TRADE_SELL',
            item_code: 'PROD-MAT',
            quantity: 10,
            unit_price: 80,
            counterparty: 'Thương nhân Ký Châu',
            game_date: '184-05-02'
          };
          if (subLocation === 'Chợ Đông Môn') {
            replyNarrative = 'Thương nhân Ký Châu kiểm tra 10 tấm Chiếu Trúc Lương Gia, gật gù khen nan tre óng mượt và thanh toán ngay 800 Tiền mặt!';
            dispatchType = 'LOCAL';
          } else {
            replyNarrative = `Lương Diễn đang tại ${subLocation}, liền phái gia nhân áp tải xe hàng 10 tấm Chiếu Trúc ra Chợ Đông Môn giao cho Thương nhân Ký Châu, thu về 800 Tiền mặt!`;
            dispatchType = 'COURIER';
          }
        } else if (userPrompt.includes('quan vũ') || userPrompt.includes('uống trà') || (userPrompt.includes('đàm đạo') && subLocation === 'Chợ Đông Môn')) {
          targetLoc = 'Chợ Đông Môn';
          actionToRun = {
            type: 'REWARD_NPC',
            npc_id: 'NPC-0003',
            amount: 100,
            counterparty: 'Quan Vũ (Vân Trường)',
            game_date: '184-05-02'
          };
          replyNarrative = 'Quan Vân Trường vuốt chòm râu dài, nâng chén trà nóng đàm đạo kinh sử cùng Lương Chí Viễn. Hai bên tương đắc, hảo cảm tăng cao!';
          dispatchType = 'LOCAL';
        } else if ((userPrompt.includes('bán') || userPrompt.includes('sell')) && (userPrompt.includes('muối') || userPrompt.includes('salt'))) {
          targetLoc = 'Chợ Đông Môn';
          actionToRun = {
            type: 'TRADE_SELL',
            item_code: 'COM-SALT',
            quantity: 10,
            unit_price: 85,
            counterparty: 'Thương nhân Ký Châu',
            game_date: '184-05-02'
          };
          if (subLocation === 'Chợ Đông Môn') {
            replyNarrative = 'Thương nhân Ký Châu trao ngay 850 đồng tiền thanh toán cho 10 Đấu muối biển. Tiền mặt lưu động tăng mạnh!';
            dispatchType = 'LOCAL';
          } else {
            replyNarrative = `Lương Diễn đang tại ${subLocation}, liền viết khoán ước giao thương, phái gia nhân cưỡi ngựa áp tải 10 Đấu muối biển ra Chợ Đông Môn giao cho Thương nhân Ký Châu. Thương đoàn kiểm tra muối rồi gửi đủ 850 tiền mang về!`;
            dispatchType = 'COURIER';
          }
        } else if (userPrompt.includes('sản xuất') || userPrompt.includes('khiên') || userPrompt.includes('produce') || userPrompt.includes('craft') || userPrompt.includes('shield')) {
          targetLoc = 'Xưởng Lương Thị';
          actionToRun = {
            type: 'PRODUCTION_BATCH',
            product_code: 'PROD-SHIELD-BAM',
            recipe: 'PROD-SHIELD-BAM',
            batch_size: 5,
            game_date: '184-05-02'
          };
          if (subLocation === 'Xưởng Lương Thị') {
            replyNarrative = 'Trần Bảo lập tức hạ lệnh khởi động ca làm việc! 5 chiếc khiên trúc bọc da đã được hoàn thiện chắc chắn, sẵn sàng trang bị.';
            dispatchType = 'LOCAL';
          } else {
            replyNarrative = `Lương Diễn đang tại ${subLocation}, liền viết mật thư lệnh bài giao cho gia đinh phi ngựa về Xưởng Lương Thị. Thợ cả Trần Bảo mở thư tuân lệnh, hạ lệnh thợ xưởng hoàn thiện 5 chiếc khiên trúc bọc da!`;
            dispatchType = 'COURIER';
          }
        } else if (userPrompt.includes('uống rượu') || userPrompt.includes('nghỉ ngơi') || userPrompt.includes('tĩnh dưỡng') || userPrompt.includes('rượu đào viên')) {
          targetLoc = subLocation;
          runSqlJson(`UPDATE player_state SET fatigue = MAX(0, fatigue - 40), health = MIN(100, health + 10) WHERE player_id = 'PLY-0001';`);
          replyNarrative = 'Lương Diễn dừng bước nghỉ ngơi, nâng chén rượu ấm đàm đạo phong vân thiên hạ. Thân tâm thư thái, khí lực hồi phục dồi dào (-40 Thể lực, +10 Khí huyết)!';
          dispatchType = 'LOCAL';
        } else if (userPrompt.includes('hồi nguyên hoàn') || userPrompt.includes('uống thuốc') || userPrompt.includes('trị thương')) {
          targetLoc = subLocation;
          runSqlJson(`UPDATE player_state SET fatigue = 0, health = 100 WHERE player_id = 'PLY-0001';`);
          replyNarrative = 'Lương Diễn uống một viên Hồi Nguyên Hoàn luyện từ chu sa và thảo dược quý. Đan dược tan trong miệng, khí huyết toàn thân bừng sáng, thể lực hồi phục toàn diện (Thể lực về 0, Khí huyết 100%)!';
          dispatchType = 'LOCAL';
        } else if (userPrompt.includes('chiếu')) {
          targetLoc = 'Xưởng Lương Thị';
          actionToRun = {
            type: 'PRODUCTION_BATCH',
            product_code: 'PROD-MAT',
            recipe: 'PROD-MAT',
            batch_size: 10,
            game_date: '184-05-02'
          };
          if (subLocation === 'Xưởng Lương Thị') {
            replyNarrative = '10 tấm Chiếu Trúc Lương Gia vừa ra lò phẳng phiu thơm mùi cói trúc mới.';
            dispatchType = 'LOCAL';
          } else {
            replyNarrative = `Lương Diễn từ ${subLocation} phi thư về xưởng chỉ đạo ca làm việc. 10 tấm Chiếu Trúc Lương Gia đã được đan hoàn tất phẳng phiu!`;
            dispatchType = 'COURIER';
          }
        } else if (userPrompt.includes('thưởng') || userPrompt.includes('tiền')) {
          targetLoc = 'Xưởng Lương Thị';
          actionToRun = {
            type: 'REWARD_NPC',
            npc_id: 'NPC-0007',
            amount: 100,
            game_date: '184-05-02'
          };
          if (subLocation === 'Xưởng Lương Thị') {
            replyNarrative = 'Trần Bảo nhận 100 Tiền thưởng công tại xưởng, cảm kích khôn xiết, nguyện hết lòng dốc sức vì Lương gia!';
            dispatchType = 'LOCAL';
          } else {
            replyNarrative = `Lương Diễn từ ${subLocation} gửi gắm gia nhân mang phong bao 100 Tiền thưởng công về xưởng trao tận tay thợ cả Trần Bảo. Trần Bảo rưng rưng cảm tạ đức độ của đông gia!`;
            dispatchType = 'COURIER';
          }
        } else if (userPrompt.includes('quân công') || userPrompt.includes('bounty') || userPrompt.includes('lập công')) {
          targetLoc = 'Quảng Tông Quân Doanh';
          actionToRun = {
            type: 'RECORD_BOUNTY',
            counterparty: 'Bắc Quân Tướng Quân Lư Thực',
            amount: 2000,
            memo: 'Thưởng quân công phá giặc',
            game_date: '184-05-02'
          };
          if (subLocation === 'Quảng Tông Quân Doanh') {
            replyNarrative = 'Lư Thực trao bằng khen quân công cùng 2000 Tiền quân nhu thưởng cho sách lược tiếp tế xuất sắc!';
            dispatchType = 'LOCAL';
          } else {
            replyNarrative = `Sứ giả tiền tuyến Quảng Tông phi ngựa hỏa tốc mang công văn khen thưởng của Lư Thực cùng 2000 Tiền quân nhu trao tận tay Lương Diễn tại ${subLocation}!`;
            dispatchType = 'COURIER';
          }
        } else {
          // Dynamic Everyday Socio-Behavioral Interaction Engine with Fog of Information
          let currentNpcId = 'NPC-0002'; // default Trương Phi (Vườn Đào)
          if (subLocation.includes('Đông Môn') || subLocation.includes('Chợ')) currentNpcId = 'NPC-0003'; // Quan Vũ
          else if (subLocation.includes('Xưởng')) currentNpcId = 'NPC-0007'; // Trần Bảo
          else if (subLocation.includes('Quảng Tông')) currentNpcId = 'NPC-0012'; // Lư Thực
          else if (subLocation.includes('Bắc Bình')) currentNpcId = 'NPC-0060'; // Công Tôn Toản

          if (globalThis.__DAILY_INTERACTION_ENGINE__) {
            const pLower = (payload.prompt || '').toLowerCase();
            const isClientEn = payload.lang === 'en';
            let actionType = 'TEA_CONVERSE';

            if (actionToRun && actionToRun.type === 'PERSONAL_GROWTH') {
              actionType = (actionToRun.sub_type === 'REST_RECOVERY') ? 'TEA_CONVERSE' : 'SPAR_DEBATE';
            } else if (
              pLower.includes('rượu') || pLower.includes('uống') || pLower.includes('say') ||
              pLower.includes('chén') || pLower.includes('nhậu') || pLower.includes('ẩm') ||
              pLower.includes('wine') || pLower.includes('drink') || pLower.includes('ale') ||
              pLower.includes('banquet') || pLower.includes('cheers') || pLower.includes('toast')
            ) {
              actionType = 'BANQUET_DRINK';
            } else if (
              pLower.includes('so tài') || pLower.includes('tỉ thí') || pLower.includes('đấu') ||
              pLower.includes('mâu') || pLower.includes('kiếm') || pLower.includes('võ') ||
              pLower.includes('thương') || pLower.includes('luyện') || pLower.includes('tập') ||
              pLower.includes('thực chiến') || pLower.includes('binh khí') || pLower.includes('đao') ||
              pLower.includes('cung') || pLower.includes('kích') || pLower.includes('spar') ||
              pLower.includes('duel') || pLower.includes('fight') || pLower.includes('clash') ||
              pLower.includes('martial') || pLower.includes('train') || pLower.includes('practice')
            ) {
              actionType = 'SPAR_DEBATE';
            } else if (
              pLower.includes('thỉnh giáo') || pLower.includes('chỉ giáo') || pLower.includes('dạy') ||
              pLower.includes('học') || pLower.includes('bái sư') || pLower.includes('mentor') ||
              pLower.includes('teach') || pLower.includes('advice') || pLower.includes('learn') ||
              pLower.includes('guide') || pLower.includes('strategy')
            ) {
              actionType = 'LEARN_MENTOR';
            } else if (
              pLower.includes('tặng') || pLower.includes('biếu') || pLower.includes('gửi ít') ||
              pLower.includes('thưởng') || pLower.includes('quà') || pLower.includes('gift') ||
              pLower.includes('present') || pLower.includes('reward') || pLower.includes('offer')
            ) {
              actionType = 'GIFT_TREASURE';
            } else if (
              pLower.includes('tâm sự') || pLower.includes('chí hướng') || pLower.includes('hoài bão') ||
              pLower.includes('ước nguyện') || pLower.includes('confide') || pLower.includes('ambition') ||
              pLower.includes('dream') || pLower.includes('secret')
            ) {
              actionType = 'HEART_CONFESSION';
            }

            const dailyRes = globalThis.__DAILY_INTERACTION_ENGINE__.executeDailyInteraction(currentNpcId, actionType, payload.prompt);
            replyNarrative = isClientEn ? (dailyRes.dialogueNarrativeEn || dailyRes.dialogueNarrativeVi) : dailyRes.dialogueNarrativeVi;
            dispatchType = 'LOCAL';
            diceCheck = {
              roll: dailyRes.diceRoll.total,
              badge: isClientEn
                ? (dailyRes.outcomeTitleEn || dailyRes.outcomeTitleVi)
                : dailyRes.outcomeTitleVi,
              dc: 15,
              passed: dailyRes.outcome === 'SUCCESS' || dailyRes.outcome === 'CRITICAL_SUCCESS'
            };
            tacticalReasoning = isClientEn
              ? `Social Interaction: ${dailyRes.outcomeTitleEn || dailyRes.outcomeTitleVi}. Affinity delta: ${dailyRes.deltas.affinityChange > 0 ? '+' : ''}${dailyRes.deltas.affinityChange}.`
              : `Giao tế đời thường: ${dailyRes.outcomeTitleVi}. Biến động hảo cảm: ${dailyRes.deltas.affinityChange > 0 ? '+' : ''}${dailyRes.deltas.affinityChange}.`;
            delta = {
              cash: dailyRes.deltas.cashCost > 0 ? `-${dailyRes.deltas.cashCost} Qian` : (isClientEn ? 'Preserved' : 'Bảo toàn'),
              inventory: isClientEn ? 'Preserved' : 'Bảo toàn',
              relations: isClientEn 
                ? `Affinity ${dailyRes.deltas.affinityChange > 0 ? '+' : ''}${dailyRes.deltas.affinityChange} • ${dailyRes.outcomeTitleEn || dailyRes.outcomeTitleVi}`
                : `Hảo cảm ${dailyRes.deltas.affinityChange > 0 ? '+' : ''}${dailyRes.deltas.affinityChange} • ${dailyRes.outcomeTitleVi}`,
              dispatch: isClientEn ? '📍 Everyday Social' : '📍 Giao tế đời thường',
              audit: isClientEn ? 'Dr EXP-OPERATING / Cr CASH-ON-HAND' : 'Khớp Nợ Chi Phí / Có Tiền Mặt'
            };
          } else {
            let heroName = 'Trương Phi (Dực Đức)';
            if (subLocation === 'Chợ Đông Môn') heroName = 'Quan Vũ (Vân Trường)';
            else if (subLocation === 'Xưởng Lương Thị') heroName = 'Trần Bảo (Thợ Cả)';
            else if (subLocation === 'Quảng Tông Quân Doanh') heroName = 'Lư Thực (Trung Lang Tướng)';

            replyNarrative = `Lương Diễn tại ${subLocation} trầm ngâm đàm đạo cùng ${heroName}: "${payload.prompt}". Các nhân sĩ nghe xong đều gật gù khen ngợi kiến giải sâu sắc, nhuệ khí tăng cao!`;
            dispatchType = 'LOCAL';
          }
        }

        let execResult = null;
        if (actionToRun) {
          actionToRun.idempotency_key = `AGT_${Date.now()}`;
          execResult = core.executeAction(actionToRun);
        }

        if (actionToRun && actionToRun.type === 'TRADE_BUY') {
          tacticalReasoning = dispatchType === 'COURIER'
            ? `Phái sứ giả/gia nhân từ ${subLocation} tới ${targetLoc} thu mua ${actionToRun.quantity} ${actionToRun.item_code}. Điều phối kho từ xa.`
            : `Thu mua trực tiếp ${actionToRun.quantity} ${actionToRun.item_code} từ ${actionToRun.counterparty} tại ${subLocation}. Tăng tích trữ nguyên liệu.`;
          delta = { 
            cash: `-${actionToRun.quantity * actionToRun.unit_price} Qian`, 
            inventory: `+${actionToRun.quantity} ${actionToRun.item_code}`, 
            dispatch: dispatchType === 'COURIER' ? `✉️ Phi thư tới ${targetLoc}` : '📍 Trực tiếp tại chỗ',
            audit: 'Khớp Nợ Tồn Kho / Có Tiền Mặt' 
          };
        } else if (actionToRun && actionToRun.type === 'TRADE_SELL') {
          tacticalReasoning = dispatchType === 'COURIER'
            ? `Phái gia nhân từ ${subLocation} ra ${targetLoc} xuất bán ${actionToRun.quantity} ${actionToRun.item_code}. Chuyển hóa thặng dư hàng hóa thành tiền mặt.`
            : `Xuất bán trực tiếp ${actionToRun.quantity} ${actionToRun.item_code} cho ${actionToRun.counterparty} tại ${subLocation}.`;
          delta = { 
            cash: `+${actionToRun.quantity * actionToRun.unit_price} Qian`, 
            inventory: `-${actionToRun.quantity} ${actionToRun.item_code}`, 
            dispatch: dispatchType === 'COURIER' ? `✉️ Áp tải ra ${targetLoc}` : '📍 Trực tiếp tại chỗ',
            audit: 'Khớp Nợ Tiền Mặt / Có Doanh Thu' 
          };
        } else if (actionToRun && actionToRun.type === 'PRODUCTION_BATCH') {
          tacticalReasoning = dispatchType === 'COURIER'
            ? `Phi thư lệnh bài từ ${subLocation} về ${targetLoc} chỉ đạo lô sản xuất ${actionToRun.recipe} SL ${actionToRun.batch_size}.`
            : `Trực tiếp giám sát thợ xưởng hoàn thành lô sản xuất ${actionToRun.recipe} SL ${actionToRun.batch_size} tại ${subLocation}.`;
          delta = { 
            cash: '0 Qian (Tiêu hao nguyên liệu)', 
            inventory: `+${actionToRun.batch_size} thành phẩm`, 
            dispatch: dispatchType === 'COURIER' ? `✉️ Mật lệnh về ${targetLoc}` : '📍 Trực tiếp tại xưởng',
            audit: 'Bảo toàn BOM định mức' 
          };
        } else if (actionToRun && actionToRun.type === 'REWARD_NPC') {
          tacticalReasoning = `Khen thưởng ${actionToRun.amount} Tiền củng cố lòng trung thành và sĩ khí của danh tướng/thợ xưởng.`;
          delta = { 
            cash: `-${actionToRun.amount} Qian`, 
            inventory: 'Bảo toàn', 
            npc: 'Sĩ khí 100% • Trung thành +2', 
            dispatch: dispatchType === 'COURIER' ? `✉️ Gửi thưởng tới ${targetLoc}` : '📍 Ban thưởng tại chỗ',
            audit: 'Khớp Nợ Chi Phí / Có Tiền Mặt' 
          };
        } else if (actionToRun && actionToRun.type === 'MOVE_LOCATION') {
          tacticalReasoning = `Cơ động tới ${actionToRun.new_location} mở rộng mạng lưới giao thương và tiếp xúc các thế lực Tam Quốc.`;
          delta = { cash: '0 Qian', inventory: 'Bảo toàn', location: actionToRun.new_location, dispatch: '🏇 Di chuyển thực tế', audit: 'Cập nhật vị trí chiến dịch' };
        } else if (actionToRun && actionToRun.type === 'RECORD_BOUNTY') {
          tacticalReasoning = `Ghi nhận quân thưởng quân công từ tiền tuyến phá giặc Khăn Vàng.`;
          delta = { 
            cash: `+${actionToRun.amount} Qian`, 
            inventory: 'Bảo toàn', 
            relations: 'Quân huân Bắc Quân +20', 
            dispatch: dispatchType === 'COURIER' ? '✉️ Công văn tiền tuyến' : '📍 Trực diện tại soái trướng',
            audit: 'Khớp Nợ Tiền Mặt / Có Thu Nhập Khác' 
          };
        } else {
          tacticalReasoning = `Đàm đạo chiến lược và thăm dò tình hình thời cuộc cùng các hào kiệt tại ${subLocation}.`;
          delta = { cash: '0 Qian', inventory: 'Bảo toàn', relations: 'Hảo cảm +5', dispatch: '📍 Đối thoại trực diện', audit: 'Bảo toàn trạng thái' };
        }

        logAgentSimulationEvent({
          type: actionToRun ? actionToRun.type : 'DIALOGUE',
          prompt: payload.prompt || 'Chỉ thị chiến thuật',
          narrative: replyNarrative,
          reasoning: tacticalReasoning,
          delta,
          executedAction: execResult
        });

        const updatedScene = generateDynamicScene(DB_PATH, subLocation, actionToRun, replyNarrative);

        // Determine authentic speaker and turn metadata
        let turnType = 'npc';
        let speakerName = 'Hệ Thống Phản Hồi';
        let speakerTitle = 'Mô Phỏng & Đối Soát';
        let avatarChar = '⚙️';
        // Preserve diceCheck if already calculated by DailyInteractionEngine

        if (dispatchType === 'COURIER') {
          turnType = 'courier';
          speakerName = 'Gia Nhân Tiếp Vận (Phi Thư)';
          speakerTitle = targetLoc ? `Mật Thư Tới ${targetLoc}` : 'Chỉ Đạo Từ Xa';
          avatarChar = '✉️';
          diceCheck = null;
        } else if (dispatchType === 'TRAVEL') {
          turnType = 'travel';
          speakerName = 'Lữ Trình Quan Đạo';
          speakerTitle = `Chuyển Cảnh Tới ${subLocation}`;
          avatarChar = '🏇';
          diceCheck = null;
        } else if (actionToRun && actionToRun.type === 'PRODUCTION_BATCH') {
          turnType = 'action';
          speakerName = 'Trần Bảo (Thợ Cả Lương Gia)';
          speakerTitle = 'Lương Thị Chức Tác Phường';
          avatarChar = '陳';
          diceCheck = null;
        } else if (actionToRun && actionToRun.type === 'TRADE_SELL') {
          turnType = 'action';
          speakerName = actionToRun.counterparty || 'Thương Đoàn Ký Châu';
          if (actionToRun.item_code === 'PROD-MAT') {
            speakerTitle = 'Gian Hàng Thủ Công & Chiếu Trúc';
            avatarChar = '🎋';
          } else if (actionToRun.item_code === 'COM-SALT') {
            speakerTitle = 'Sạp Muối Chợ Đông Môn';
            avatarChar = '🧂';
          } else if (actionToRun.item_code === 'COM-GRAIN') {
            speakerTitle = 'Kho Lương Đại Trại';
            avatarChar = '🌾';
          } else {
            speakerTitle = 'Giao Thương Hàng Hóa';
            avatarChar = '📦';
          }
          diceCheck = null;
        } else if (actionToRun && actionToRun.type === 'TRADE_BUY' && subLocation === 'Chợ Đông Môn') {
          turnType = 'action';
          speakerName = 'Lương Thương Huyện Trác';
          speakerTitle = 'Kho Lương Chợ Đông Môn';
          avatarChar = '🌾';
          diceCheck = null;
        } else if (actionToRun && actionToRun.type === 'TRADE_BUY' && subLocation === 'Vườn Đào') {
          turnType = 'npc';
          speakerName = 'Trương Phi (Dực Đức)';
          speakerTitle = 'Lò Mổ Huyện Trác — WAR 97';
          avatarChar = '張';
          diceCheck = null;
        } else if (actionToRun && actionToRun.type === 'RECORD_BOUNTY') {
          turnType = 'npc';
          speakerName = actionToRun.counterparty || 'Lư Thực (Tử Cán)';
          speakerTitle = 'Quân Huân Tiền Tuyến';
          avatarChar = '🎖️';
          diceCheck = null;
        } else if (actionToRun && actionToRun.type === 'REWARD_NPC') {
          turnType = 'npc';
          const targetId = actionToRun.npc_id;
          if (targetId === 'NPC-0003' || subLocation === 'Chợ Đông Môn') {
            speakerName = 'Quan Vũ (Vân Trường)';
            speakerTitle = 'Hào Kiệt Giải Lương — WAR 98';
            avatarChar = '關';
            replyNarrative = 'Quan Vân Trường nâng chén trà nóng, vuốt râu dài mỉm cười: "Chí Viễn hào sảng trượng nghĩa, đàm đạo đại cục cùng đệ khiến Vân Trường ta bội phần tâm đắc!"';
          } else if (targetId === 'NPC-0002' || subLocation === 'Vườn Đào') {
            speakerName = 'Trương Phi (Dực Đức)';
            speakerTitle = 'Vườn Đào Hào Kiệt — WAR 97';
            avatarChar = '張';
            replyNarrative = 'Trương Phi vỗ đùi cười vang: "Khá lắm Chí Viễn đệ! Ta thích tính đệ rồi đấy! Hôm nay không say không về!"';
          } else if (targetId === 'NPC-0004' || targetId === 'NPC-0012' || subLocation === 'Quảng Tông Quân Doanh') {
            speakerName = 'Lư Thực (Tử Cán)';
            speakerTitle = 'Bắc Quân Trung Lang Tướng';
            avatarChar = '盧';
            replyNarrative = 'Lư Thực gật đầu tán thưởng: "Chí Viễn kiến giải sâu sắc, nhìn thấu thế cục, quả không hổ là học trò đắc ý của lão phu!"';
          } else if (targetId === 'NPC-0011' || subLocation === 'Bắc Bình Soái Phủ') {
            speakerName = 'Công Tôn Toản (Bá Khuê)';
            speakerTitle = 'Bạch Mã Tướng Quân';
            avatarChar = '公';
            replyNarrative = 'Công Tôn Toản giơ cao chén rượu: "Người Trác Quận chúng ta có hào khí như Lương công tử thì lo gì không dẹp yên giặc loạn Ô Hoàn!"';
          } else {
            speakerName = actionToRun.counterparty || 'Trần Bảo (Thợ Cả Lương Gia)';
            speakerTitle = 'Lương Thị Chức Tác Phường';
            avatarChar = '陳';
            replyNarrative = 'Trần Bảo xúc động cúi đầu bái tạ: "Đa tạ Thiếu gia trọng thưởng! Thuộc hạ và anh em thợ xưởng nguyện dốc toàn lực chế tạo quân trang phòng thủ tốt nhất!"';
          }
          diceCheck = null;
        } else {
          turnType = 'npc';
          const sceneNpc = updatedScene?.npc;
          if (sceneNpc && sceneNpc.name) {
            speakerName = sceneNpc.name;
            speakerTitle = sceneNpc.title || 'Đối Thoại Trực Diện';
            avatarChar = sceneNpc.name.charAt(0);
          } else {
            speakerName = 'Hào Kiệt Bản Địa';
            speakerTitle = 'Bối Cảnh Chiến Lược';
            avatarChar = '漢';
          }
          const pLower = (payload.prompt || '').toLowerCase();
          if (pLower.includes('đấu') || pLower.includes('thương') || pLower.includes('võ') || pLower.includes('giá') || pLower.includes('so tài') || pLower.includes('chiến')) {
            diceCheck = updatedScene?.lastCheck;
          } else {
            diceCheck = null;
          }
        }

        sendJson(res, 200, {
          success: true,
          narrative: replyNarrative,
          reasoning: tacticalReasoning,
          delta,
          executedAction: execResult,
          updatedScene,
          dispatchType,
          turnInfo: {
            type: turnType,
            speaker: speakerName,
            title: speakerTitle,
            avatar: avatarChar,
            diceBadge: diceCheck
          },
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        sendJson(res, 400, { success: false, error: err.message });
      }
    });
    return;
  }

  // -------------------------------------------------------------
  // STATIC FILE SERVING
  // -------------------------------------------------------------
  let safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, safePath);

  // Security check to avoid path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    sendFile(res, filePath, contentType);
  } else {
    // Fallback to index.html for SPA routing
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      sendFile(res, indexPath, 'text/html; charset=utf-8');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('ThreeKingdoms-AgentEngine Web UI not yet compiled in public/');
    }
  }
});

function startServer(port = DEFAULT_PORT) {
  server.listen(port, '0.0.0.0', () => {
    console.log('====================================================');
    console.log(` 🏯 ThreeKingdoms-AgentEngine: Web UI Server`);
    console.log('====================================================');
    console.log(` URL (Local)   : http://localhost:${port}`);
    console.log(` URL (IPv4)    : http://127.0.0.1:${port}`);
    console.log(` Database      : ${DB_PATH}`);
    console.log(` Status        : 🟢 ONLINE & READY`);
    console.log('====================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[PORT IN USE] Port ${port} is occupied, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error(`Server error: ${err.message}`);
    }
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  server,
  startServer
};
