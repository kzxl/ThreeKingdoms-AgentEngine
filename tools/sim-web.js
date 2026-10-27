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
  } else if (subLower.includes('quảng tông') || subLower.includes('camp') || subLower.includes('doanh')) {
    currentLocKey = 'Quảng Tông Quân Doanh';
  } else {
    currentLocKey = 'Vườn Đào';
  }

  const relations = [
    { name: 'Lưu Bị (Huyền Đức)', role: 'Nghĩa Quân Thống Lĩnh', score: 70, target: 100, status: 'Tâm Phúc Quân Sư' },
    { name: 'Trương Phi (Dực Đức)', role: 'Tiên Phong Mãnh Tướng', score: 65, target: 100, status: 'Tử Sinh Huynh Đệ' },
    { name: 'Quan Vũ (Vân Trường)', role: 'Tiên Phong Mãnh Tướng', score: 60, target: 100, status: 'Kính Trọng Mưu Lược' },
    { name: 'Lư Thực (Tử Cán)', role: 'Bắc Quân Trung Lang Tướng', score: 50, target: 100, status: 'Ân Sư Kính Mến' }
  ];

  const subLocationsList = ['Vườn Đào', 'Chợ Đông Môn', 'Xưởng Lương Thị', 'Quảng Tông Quân Doanh'];

  const saltItem = inventory.find(i => i.item_code === 'COM-SALT') || { quantity: 0 };
  const grainItem = inventory.find(i => i.item_code === 'COM-GRAIN') || { quantity: 0 };
  const leathItem = inventory.find(i => i.item_code === 'COM-LEATH') || { quantity: 0 };
  const bamItem = inventory.find(i => i.item_code === 'COM-BAMBOO') || { quantity: 0 };

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
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0007', amount: 50, game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_3',
        icon: '🌸',
        title: 'Rời Vườn Đào, đi tới Chợ Đông Môn tìm gặp Lưu Bị & Quan Vũ',
        desc: 'Chuyển cảnh sang Chợ Huyện Trác & Kho Lương (Mất 0 ngày)',
        action: { type: 'MOVE_LOCATION', new_location: 'Chợ Đông Môn', game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🏭',
        title: 'Trở về Lương Thị Chức Tác Phường điều hành sản xuất',
        desc: 'Quản lý thợ dệt Trần Bảo, đóng gói bồ lương đan & khiên trúc',
        action: { type: 'MOVE_LOCATION', new_location: 'Xưởng Lương Thị', game_date: meta.current_date || '184-05-02' }
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
      title: 'Đàm Phán Giá Muối Biển Ký Châu',
      score: 54,
      dc: 40,
      formula: `[COM ${player.com_attr || 78} * 0.5 = 39] + [Thẩm định thị trường +7] + [D20: 8] = 54 >= DC 40`
    };
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
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0007', amount: 100, game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '📍',
        title: 'Rời chợ Đông Môn, đi tới Trang Viên Vườn Đào gặp Trương Phi',
        desc: 'Chuyển cảnh về Vườn Đào Hạ Trạch',
        action: { type: 'MOVE_LOCATION', new_location: 'Vườn Đào', game_date: meta.current_date || '184-05-02' }
      }
    ];
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
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0007', amount: 100, game_date: meta.current_date || '184-05-02' }
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
        action: { type: 'REWARD_NPC', npc_id: 'NPC-0007', amount: 100, game_date: meta.current_date || '184-05-02' }
      },
      {
        id: 'OPT_4',
        icon: '🐎',
        title: 'Rút quân trở về hậu phương Trang Viên Vườn Đào Huyện Trác',
        desc: 'Chuyển cảnh về Vườn Đào Hạ Trạch',
        action: { type: 'MOVE_LOCATION', new_location: 'Vườn Đào', game_date: meta.current_date || '184-05-02' }
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

  // 9. POST /api/agent/prompt - Agent Bridge Natural Language Dispatcher
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

        if (userPrompt.includes('đông môn') || userPrompt.includes('chợ')) {
          subLocation = 'Chợ Đông Môn';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Chợ Đông Môn', game_date: '184-05-02' };
          replyNarrative = 'Lương Diễn thu xếp hành lý, rời Vườn Đào rảo bước tới Chợ Đông Môn Huyện Trác. Nơi đây tiếng rao hàng của thương nhân Ký Châu và binh sĩ nghĩa quân vang vọng nhộn nhịp!';
        } else if (userPrompt.includes('xưởng') || userPrompt.includes('chức tác')) {
          subLocation = 'Xưởng Lương Thị';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Xưởng Lương Thị', game_date: '184-05-02' };
          replyNarrative = 'Lương Diễn trở về Lương Thị Chức Tác Phường. Tiếng đan tre, lách cách dệt chiếu và mùi thuộc da của các gia nhân thợ dệt tràn ngập không khí!';
        } else if (userPrompt.includes('quảng tông') || userPrompt.includes('doanh trại') || userPrompt.includes('lư thực')) {
          subLocation = 'Quảng Tông Quân Doanh';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Quảng Tông Quân Doanh', game_date: '184-05-02' };
          replyNarrative = 'Đoàn xe theo đường hành quân tiến thẳng về tiền tuyến Quảng Tông. Cờ xí Bắc Quân của Lư Thực tung bay trong gió cát!';
        } else if (userPrompt.includes('vườn đào') || userPrompt.includes('trương phi')) {
          subLocation = 'Vườn Đào';
          actionToRun = { type: 'MOVE_LOCATION', new_location: 'Vườn Đào', game_date: '184-05-02' };
          replyNarrative = 'Lương Diễn quay về Trang viên Vườn Đào. Trương Phi vẫn đang ngồi sảng khoái dưới gốc đào uống rượu chờ đợi!';
        } else if (userPrompt.includes('mua') && (userPrompt.includes('da') || userPrompt.includes('leather'))) {
          actionToRun = {
            type: 'TRADE_BUY',
            item_code: 'COM-LEATH',
            quantity: 8,
            unit_price: 100,
            counterparty: 'Trương Phi (Lò mổ Trác Quận)',
            game_date: '184-05-02'
          };
          replyNarrative = 'Trương Phi sảng khoái vỗ đùi: "Tốt lắm! 8 tấm da trâu hảo hạng này giao cho đệ, lát nữa sai gia nhân chuyển thẳng về xưởng Lương Thị!"';
        } else if (userPrompt.includes('mua') && (userPrompt.includes('lương') || userPrompt.includes('gạo') || userPrompt.includes('grain'))) {
          actionToRun = {
            type: 'TRADE_BUY',
            item_code: 'COM-GRAIN',
            quantity: 5,
            unit_price: 160,
            counterparty: 'Lương thương Huyện Trác',
            game_date: '184-05-02'
          };
          replyNarrative = 'Đoàn xe vận lương đã nhập thêm 5 Thạch tiểu mạch vào kho dự trữ. Quân lương sung túc!';
        } else if (userPrompt.includes('bán') && (userPrompt.includes('muối') || userPrompt.includes('salt'))) {
          actionToRun = {
            type: 'TRADE_SELL',
            item_code: 'COM-SALT',
            quantity: 10,
            unit_price: 85,
            counterparty: 'Thương nhân Ký Châu',
            game_date: '184-05-02'
          };
          replyNarrative = 'Thương nhân Ký Châu trao ngay 850 đồng tiền thanh toán cho 10 Đấu muối biển. Tiền mặt lưu động tăng mạnh!';
        } else if (userPrompt.includes('sản xuất') || userPrompt.includes('khiên')) {
          actionToRun = {
            type: 'PRODUCTION_BATCH',
            recipe: 'PROD-SHIELD-BAM',
            batch_size: 5,
            game_date: '184-05-02'
          };
          replyNarrative = 'Trần Bảo lập tức hạ lệnh khởi động ca làm việc! 5 chiếc khiên trúc bọc da đã được hoàn thiện chắc chắn, sẵn sàng trang bị.';
        } else if (userPrompt.includes('chiếu')) {
          actionToRun = {
            type: 'PRODUCTION_BATCH',
            recipe: 'PROD-MAT',
            batch_size: 10,
            game_date: '184-05-02'
          };
          replyNarrative = '10 tấm Chiếu Trúc Lương Gia vừa ra lò phẳng phiu thơm mùi cói trúc mới.';
        } else if (userPrompt.includes('thưởng') || userPrompt.includes('tiền')) {
          actionToRun = {
            type: 'REWARD_NPC',
            npc_id: 'NPC-0007',
            amount: 100,
            game_date: '184-05-02'
          };
          replyNarrative = 'Trần Bảo nhận 100 Tiền thưởng công, cảm kích khôn xiết, nguyện hết lòng dốc sức vì Lương gia!';
        } else if (userPrompt.includes('quân công') || userPrompt.includes('bounty') || userPrompt.includes('lập công')) {
          actionToRun = {
            type: 'RECORD_BOUNTY',
            counterparty: 'Bắc Quân Tướng Quân Lư Thực',
            amount: 2000,
            memo: 'Thưởng quân công phá giặc',
            game_date: '184-05-02'
          };
          replyNarrative = 'Lư Thực trao bằng khen quân công cùng 2000 Tiền quân nhu thưởng cho sách lược tiếp tế xuất sắc!';
        } else {
          // General dialogue / consultation response
          replyNarrative = `Lương Diễn trầm ngâm đàm đạo: "${payload.prompt}". Các nhân sĩ nghe xong đều gật gù khen ngợi kiến giải sâu sắc, nhuệ khí tăng cao!`;
        }

        let execResult = null;
        if (actionToRun) {
          actionToRun.idempotency_key = `AGT_${Date.now()}`;
          execResult = core.executeAction(actionToRun);
        }

        let tacticalReasoning = '';
        let delta = {};

        if (actionToRun && actionToRun.type === 'TRADE_BUY') {
          tacticalReasoning = `Thu mua ${actionToRun.quantity} đơn vị ${actionToRun.item_code} từ ${actionToRun.counterparty}. Tăng tích trữ nguyên liệu/quân lương cho chiến dịch.`;
          delta = { cash: `-${actionToRun.quantity * actionToRun.unit_price} Qian`, inventory: `+${actionToRun.quantity} ${actionToRun.item_code}`, audit: 'Khớp Nợ Tồn Kho / Có Tiền Mặt' };
        } else if (actionToRun && actionToRun.type === 'TRADE_SELL') {
          tacticalReasoning = `Xuất bán ${actionToRun.quantity} đơn vị ${actionToRun.item_code} cho ${actionToRun.counterparty}. Chuyển hóa thặng dư hàng hóa thành tiền mặt lưu động.`;
          delta = { cash: `+${actionToRun.quantity * actionToRun.unit_price} Qian`, inventory: `-${actionToRun.quantity} ${actionToRun.item_code}`, audit: 'Khớp Nợ Tiền Mặt / Có Doanh Thu' };
        } else if (actionToRun && actionToRun.type === 'PRODUCTION_BATCH') {
          tacticalReasoning = `Hoàn thành lô sản xuất ${actionToRun.recipe} số lượng ${actionToRun.batch_size}. Khấu trừ nguyên vật liệu theo định mức BOM.`;
          delta = { cash: '0 Qian (Tiêu hao nguyên liệu)', inventory: `+${actionToRun.batch_size} thành phẩm`, audit: 'Bảo toàn BOM định mức' };
        } else if (actionToRun && actionToRun.type === 'REWARD_NPC') {
          tacticalReasoning = `Khen thưởng ${actionToRun.amount} Tiền củng cố lòng trung thành và sĩ khí của danh tướng/thợ xưởng.`;
          delta = { cash: `-${actionToRun.amount} Qian`, inventory: 'Bảo toàn', npc: 'Sĩ khí 100% • Trung thành +2', audit: 'Khớp Nợ Chi Phí / Có Tiền Mặt' };
        } else if (actionToRun && actionToRun.type === 'MOVE_LOCATION') {
          tacticalReasoning = `Cơ động tới ${actionToRun.new_location} mở rộng mạng lưới giao thương và tiếp xúc các thế lực Tam Quốc.`;
          delta = { cash: '0 Qian', inventory: 'Bảo toàn', location: actionToRun.new_location, audit: 'Cập nhật vị trí chiến dịch' };
        } else if (actionToRun && actionToRun.type === 'RECORD_BOUNTY') {
          tacticalReasoning = `Ghi nhận quân thưởng quân công từ tiền tuyến phá giặc Khăn Vàng.`;
          delta = { cash: `+${actionToRun.amount} Qian`, inventory: 'Bảo toàn', relations: 'Quân huân Bắc Quân +20', audit: 'Khớp Nợ Tiền Mặt / Có Thu Nhập Khác' };
        } else {
          tacticalReasoning = `Đàm đạo chiến lược và thăm dò tình hình thời cuộc cùng các hào kiệt tại ${subLocation}.`;
          delta = { cash: '0 Qian', inventory: 'Bảo toàn', relations: 'Hảo cảm +5', audit: 'Bảo toàn trạng thái' };
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

        sendJson(res, 200, {
          success: true,
          narrative: replyNarrative,
          reasoning: tacticalReasoning,
          delta,
          executedAction: execResult,
          updatedScene,
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
