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

  // 6. POST /api/action - Simulation Core Action Dispatcher
  if (req.method === 'POST' && pathname === '/api/action') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const core = new SimulationCore(DB_PATH);
        const result = core.executeAction(payload);
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
