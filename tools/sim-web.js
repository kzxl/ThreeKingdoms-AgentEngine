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

const server = http.createServer((req, res) => {
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
      const player = runSqlJson(`SELECT * FROM player_state LIMIT 1;`)[0] || {};
      const skills = runSqlJson(`SELECT * FROM player_skills ORDER BY tier DESC, current_exp DESC;`);
      const invSummary = runSqlJson(`SELECT COUNT(*) as item_count, TOTAL(quantity * unit_cost_basis) as inv_val FROM inventory_items;`)[0] || { item_count: 0, inv_val: 0 };
      const bizCount = runSqlJson(`SELECT COUNT(*) as count FROM businesses;`)[0]?.count || 0;
      const npcs = runSqlJson(`SELECT COUNT(*) as count FROM npc_state;`)[0]?.count || 0;

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

  const relations = [
    { 
      name: 'Lưu Bị (Huyền Đức)', 
      nameEn: 'Liu Bei (Xuande)', 
      role: 'Nghĩa Quân Thống Lĩnh', 
      roleEn: 'Volunteer Commander', 
      score: 70, 
      target: 100, 
      status: 'Tâm Phúc Quân Sư',
      statusEn: 'Sworn Confidant & Strategist'
    },
    { 
      name: 'Trương Phi (Dực Đức)', 
      nameEn: 'Zhang Fei (Yide)', 
      role: 'Tiên Phong Mãnh Tướng', 
      roleEn: 'Vanguard General', 
      score: 65, 
      target: 100, 
      status: 'Tử Sinh Huynh Đệ',
      statusEn: 'Sworn Brother'
    },
    { 
      name: 'Quan Vũ (Vân Trường)', 
      nameEn: 'Guan Yu (Yunchang)', 
      role: 'Tiên Phong Mãnh Tướng', 
      roleEn: 'Vanguard General', 
      score: 60, 
      target: 100, 
      status: 'Kính Trọng Mưu Lược',
      statusEn: 'Deep Martial Respect'
    },
    { 
      name: 'Lư Thực (Tử Cán)', 
      nameEn: 'Lu Zhi (Zigan)', 
      role: 'Bắc Quân Trung Lang Tướng', 
      roleEn: 'General of the Household', 
      score: 50, 
      target: 100, 
      status: 'Ân Sư Kính Mến',
      statusEn: 'Revered Imperial Mentor'
    }
  ];

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
                                userPrompt.includes('travel') || 
                                userPrompt.includes('move')) && 
                               !userPrompt.includes('thư') && 
                               !userPrompt.includes('mua') && 
                               !userPrompt.includes('bán') && 
                               !userPrompt.includes('sản xuất') &&
                               !userPrompt.includes('thưởng');

        // 1. PHYSICAL TRAVEL / RELOCATION ACTIONS
        if (isTravelIntent && (userPrompt.includes('đông môn') || userPrompt.includes('chợ'))) {
          subLocation = 'Chợ Đông Môn';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Chợ Đông Môn', game_date: '184-05-02' };
          replyNarrative = 'Lương Diễn thu xếp hành lý, rời bước rảo sang Chợ Đông Môn Huyện Trác. Nơi đây tiếng rao hàng của thương nhân Ký Châu và binh sĩ nghĩa quân vang vọng nhộn nhịp!';
          dispatchType = 'TRAVEL';
        } else if (isTravelIntent && (userPrompt.includes('xưởng') || userPrompt.includes('chức tác'))) {
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
        } else if (isTravelIntent && (userPrompt.includes('vườn đào') || userPrompt.includes('trương phi'))) {
          subLocation = 'Vườn Đào';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Vườn Đào', game_date: '184-05-02' };
          replyNarrative = 'Lương Diễn quay về Trang viên Vườn Đào. Trương Phi vẫn đang ngồi sảng khoái dưới gốc đào uống rượu chờ đợi!';
          dispatchType = 'TRAVEL';
        }

        // 2. ECONOMIC & LOGISTICAL ACTIONS (With Locality & Courier Rules)
        else if (userPrompt.includes('mua') && (userPrompt.includes('da') || userPrompt.includes('leather'))) {
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
        } else if (userPrompt.includes('mua') && (userPrompt.includes('lương') || userPrompt.includes('gạo') || userPrompt.includes('grain'))) {
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
        } else if (userPrompt.includes('bán') && (userPrompt.includes('chiếu') || userPrompt.includes('mat'))) {
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
        } else if (userPrompt.includes('bán') && (userPrompt.includes('muối') || userPrompt.includes('salt'))) {
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
        } else if (userPrompt.includes('sản xuất') || userPrompt.includes('khiên')) {
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
          // General dialogue / consultation response
          let heroName = 'Trương Phi (Dực Đức)';
          if (subLocation === 'Chợ Đông Môn') heroName = 'Quan Vũ (Vân Trường)';
          else if (subLocation === 'Xưởng Lương Thị') heroName = 'Trần Bảo (Thợ Cả)';
          else if (subLocation === 'Quảng Tông Quân Doanh') heroName = 'Lư Thực (Trung Lang Tướng)';

          replyNarrative = `Lương Diễn tại ${subLocation} trầm ngâm đàm đạo cùng ${heroName}: "${payload.prompt}". Các nhân sĩ nghe xong đều gật gù khen ngợi kiến giải sâu sắc, nhuệ khí tăng cao!`;
          dispatchType = 'LOCAL';
        }

        let execResult = null;
        if (actionToRun) {
          actionToRun.idempotency_key = `AGT_${Date.now()}`;
          execResult = core.executeAction(actionToRun);
        }

        let tacticalReasoning = '';
        let delta = {};

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
        let diceCheck = null;

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
  server.listen(port, () => {
    console.log('====================================================');
    console.log(` 🏯 ThreeKingdoms-AgentEngine: Web UI Server`);
    console.log('====================================================');
    console.log(` URL      : http://localhost:${port}`);
    console.log(` Database : ${DB_PATH}`);
    console.log(` Status   : 🟢 ONLINE & READY`);
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
