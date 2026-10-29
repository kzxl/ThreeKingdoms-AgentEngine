/**
 * ThreeKingdoms-AgentEngine: Historical Event Participation & RPG Resolution Manager
 * (engine/event-manager.js)
 * 
 * Manages player interaction with ROTK historical chronicles, allowing:
 * 1. Historical Canon participation (Sponsorship, Military Alliance, Supply Lines)
 * 2. Alternate History branching ("What-If" outcomes)
 * 3. Zero-drift atomic state mutation (Double-Entry Dr == Cr, Cashflow, Inventory, NPC Sentiments)
 */

const fs = require('fs');
const path = require('path');
const { runSqlJson, runSqlBatch, escapeSql } = require('./db-adapter');

const ROOT_DIR = path.resolve(__dirname, '..');
const SAVES_DIR = path.join(ROOT_DIR, 'saves');
const DB_PATH = process.env.SIM_DB_PATH || path.join(SAVES_DIR, 'session.db');

function syncProgressLiquidCash(totalClosing, liquidCash, safeCash) {
  const progressPath = path.join(ROOT_DIR, 'game', 'PROGRESS.md');
  if (!fs.existsSync(progressPath)) return;
  try {
    let content = fs.readFileSync(progressPath, 'utf8');
    const fmtTotal = Number(totalClosing).toLocaleString('en-US');
    const fmtLiquid = Number(liquidCash).toLocaleString('en-US');
    const fmtSafe = Number(safeCash).toLocaleString('en-US');
    content = content.replace(
      /(\|\s*\*\*Liquid Capital\*\*\s*\|\s*\*\*)[0-9,]+(\s*(?:Qian|quan)\*\*\s*\()[^)]+(\)\s*\|)/i,
      (match, p1, p2, p3) => `${p1}${fmtTotal} quan** (${fmtLiquid} quan mobile + ${fmtSafe} quan safe)${p3}`
    );

    // Also update Total Net Worth in PROGRESS.md
    const invMatch = content.match(/\*\*Inventory Valuation\*\*\s*\|\s*\*\*([0-9,]+)\s*(?:Qian|quan)\*\*/i);
    const invVal = invMatch ? Number(invMatch[1].replace(/,/g, '')) : 47918;
    const fixedCap = 19600;
    const expectedNetWorth = Math.round(Number(totalClosing) + invVal + fixedCap);
    const fmtNetWorth = expectedNetWorth.toLocaleString('en-US');
    content = content.replace(
      /(\|\s*\*\*Total Net Worth\*\*\s*\|\s*\*\*)[0-9,]+(\s*(?:Qian|quan)\*\*\s*\|)/i,
      (match, p1, p2) => `${p1}${fmtNetWorth}${p2}`
    );

    fs.writeFileSync(progressPath, content, 'utf8');
  } catch (e) {}
}

class EventManager {
  constructor(dbPath = DB_PATH) {
    this.dbPath = dbPath;
    this.ensureSessionEventsTable();
  }

  ensureSessionEventsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS session_events (
        event_id TEXT PRIMARY KEY,
        triggered_turn INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'AVAILABLE',
        player_choice TEXT,
        outcome_type TEXT DEFAULT 'CANON',
        choice_narrative TEXT,
        resolution_narrative TEXT,
        rewards_claimed TEXT,
        resolved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_session_events_status ON session_events(status);
    `;
    runSqlBatch(this.dbPath, sql);
  }

  /**
   * Get all active & relevant historical events for player's current location & campaign date
   */
  getActiveEvents(locationId = 'LOC-0001', gameDate = '184-02-01', activeTurn = 1) {
    const yearMatch = gameDate.match(/^(\d{3,4})/);
    const currentYear = yearMatch ? parseInt(yearMatch[1], 10) : 184;

    // Fetch master events matching location or major story milestones in current or past years
    const masterEvents = runSqlJson(this.dbPath, `
      SELECT * FROM master_events 
      WHERE historical_year <= ${currentYear}
      ORDER BY historical_year ASC, event_id ASC;
    `);

    // Fetch session events (already resolved)
    const sessionEvents = runSqlJson(this.dbPath, `SELECT * FROM session_events;`);
    const sessionMap = {};
    for (const se of sessionEvents) {
      sessionMap[se.event_id] = se;
    }

    const result = [];
    for (const me of masterEvents) {
      const isResolved = Boolean(sessionMap[me.event_id]);
      const sessionData = sessionMap[me.event_id] || null;

      // Event is currently geographically present if it matches location, or if player is near
      let isLocal = me.location_id === locationId;
      if (!isLocal && locationId) {
        const locLower = String(locationId).toLowerCase();
        if (me.location_id === 'LOC-0001' && (locLower.includes('trác') || locLower.includes('vườn đào') || locLower.includes('đào viên') || locLower.includes('zhuo'))) {
          isLocal = true;
        } else if (me.location_id === 'LOC-0002' && (locLower.includes('lạc dương') || locLower.includes('luoyang') || locLower.includes('toan tảo'))) {
          isLocal = true;
        } else if (me.location_id === 'LOC-0003' && (locLower.includes('quảng tông') || locLower.includes('guangzong') || locLower.includes('cự lộc'))) {
          isLocal = true;
        } else if (me.location_id === 'LOC-0005' && (locLower.includes('trường an') || locLower.includes('changan') || locLower.includes('đồng quan'))) {
          isLocal = true;
        } else if (me.location_id === 'LOC-0006' && (locLower.includes('nghiệp') || locLower.includes('ye') || locLower.includes('quan độ'))) {
          isLocal = true;
        } else if (me.location_id === 'LOC-0007' && (locLower.includes('hứa xương') || locLower.includes('xuchang') || locLower.includes('trường xã'))) {
          isLocal = true;
        } else if (me.location_id === 'LOC-0010' && (locLower.includes('tương dương') || locLower.includes('long trung') || locLower.includes('xiangyang'))) {
          isLocal = true;
        } else if (me.location_id === 'LOC-0011' && (locLower.includes('xích bích') || locLower.includes('chibi'))) {
          isLocal = true;
        } else if (me.location_id === 'LOC-0012' && (locLower.includes('giang lăng') || locLower.includes('đương dương') || locLower.includes('trường bản') || locLower.includes('di lăng'))) {
          isLocal = true;
        } else if (me.location_id === 'LOC-0013' && (locLower.includes('kiến nghiệp') || locLower.includes('giang đông') || locLower.includes('jianye'))) {
          isLocal = true;
        } else if (me.location_id === 'LOC-0014' && (locLower.includes('hán trung') || locLower.includes('định quân sơn') || locLower.includes('kỳ sơn') || locLower.includes('hanzhong'))) {
          isLocal = true;
        } else if (me.location_id === 'LOC-0015' && (locLower.includes('thành đô') || locLower.includes('bạch đế') || locLower.includes('ích châu') || locLower.includes('chengdu'))) {
          isLocal = true;
        }
      }
      const isCurrentYear = me.historical_year === currentYear;

      // Parse or generate choices
      const choices = this.resolveEventChoices(me);

      result.push({
        ...me,
        isLocal,
        isCurrentYear,
        isResolved,
        sessionStatus: sessionData ? sessionData.status : 'AVAILABLE',
        playerChoice: sessionData ? sessionData.player_choice : null,
        outcomeType: sessionData ? sessionData.outcome_type : null,
        resolutionNarrative: sessionData ? sessionData.resolution_narrative : null,
        resolvedAt: sessionData ? sessionData.resolved_at : null,
        choices
      });
    }

    return result;
  }

  /**
   * Parse authored choices or provide standard RPG archetypal choices
   */
  resolveEventChoices(event) {
    if (event.choices_json) {
      try {
        const parsed = JSON.parse(event.choices_json);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }

    // Default choices based on specific famous event IDs
    if (event.event_id === 'EVT-184-PEACH-GARDEN') {
      return [
        {
          choice_id: 'SPONSOR_MILITIA',
          title_vi: 'Tài Trợ Binh Khí & Giáp Trụ Cho Nghĩa Quân',
          title_en: 'Sponsor Weapons & Armor for the Peach Garden Militia',
          outcome_type: 'CANON',
          required_cost: { cash: 1500 },
          required_stat: { com: 40 },
          rewards: {
            rep_gain: 25,
            cash_cost: 1500,
            sentiment: { 'NPC-0001': 35, 'NPC-0002': 45, 'NPC-0003': 40 },
            items: [{ code: 'COM-WINE-ZHUO', qty: 2 }]
          },
          narrative_vi: 'Bạn xuất 1,500 Quan điều phối xưởng Lương Gia cung cấp quặng sắt và giáp nhẹ cho đoàn hương dũng. Lưu Bị nắm tay bạn cảm kích khôn xiết, Trương Phi reo hò uống cạn ba vò rượu đào.',
          narrative_en: 'You sponsor 1,500 quan in weapons and light shields. Liu Bei grasps your hands in profound gratitude.'
        },
        {
          choice_id: 'JOIN_BROTHERHOOD',
          title_vi: 'Cùng Cắt Máu Ăn Thề (Tứ Nghĩa Đào Viên — Dị Bản)',
          title_en: 'Swear the Oath of Brotherhood (Four Brothers of Peach Garden — Alternate)',
          outcome_type: 'ALTERNATE',
          required_stat: { war: 45, dip: 50 },
          rewards: {
            rep_gain: 50,
            sentiment: { 'NPC-0001': 50, 'NPC-0002': 50, 'NPC-0003': 50 },
            perk: 'Tứ Huynh Đệ Đào Viên'
          },
          narrative_vi: 'Trước bàn hương án giữa vườn đào rực rỡ, bốn chén rượu hòa máu tươi. Bạn chính thức trở thành đệ tứ huynh đệ cùng Lưu, Quan, Trương thề đồng sinh cộng tử!',
          narrative_en: 'You swear the sacred oath alongside Liu Bei, Guan Yu, and Zhang Fei, becoming the fourth sworn brother!'
        },
        {
          choice_id: 'TRADE_LOGISTICS',
          title_vi: 'Ký Kết Thương Ước Hậu Cần Quân Nhu Độc Quyền',
          title_en: 'Sign Exclusive Supply Contract for Rebel Defense',
          outcome_type: 'CANON',
          required_stat: { com: 60 },
          rewards: {
            cash_gain: 2000,
            rep_gain: 15,
            sentiment: { 'NPC-0001': 20, 'NPC-0005': 25 }
          },
          narrative_vi: 'Bạn liên kết với Đại thương mã Trương Thế Bình, nắm giữ huyết mạch cung ứng lương thực và giáp trúc cho nghĩa quân tại U Châu.',
          narrative_en: 'You partner with merchant Zhang Shiping to secure the exclusive logistics contract for northern militia.'
        }
      ];
    }

    if (event.event_id === 'EVT-184-YELLOW-TURBAN') {
      return [
        {
          choice_id: 'DEFEND_CITY',
          title_vi: 'Tổ Chức Hương Dũng Tự Vệ Chống Giặc',
          title_en: 'Organize Local Militia Defense against Yellow Turbans',
          outcome_type: 'CANON',
          required_stat: { ldr: 50 },
          rewards: { rep_gain: 30, sentiment: { 'NPC-0001': 20 } },
          narrative_vi: 'Bạn phối hợp nha môn Trác Huyện lập phòng tuyến cọc gỗ cản phá giặc cướp, bảo an dân cư toàn vùng.',
          narrative_en: 'You mobilize local defense barriers protecting townsfolk from rebel raiders.'
        },
        {
          choice_id: 'GRAIN_RELIEF',
          title_vi: 'Mở Kho Lương Bán Giá Bình Ổn Trợ Dân',
          title_en: 'Release Granary Reserves at Fair Prices',
          outcome_type: 'CANON',
          required_cost: { cash: 800 },
          rewards: { rep_gain: 40, cash_cost: 800, sentiment: { 'NPC-0001': 30 } },
          narrative_vi: 'Bạn bán lương thực giá bình ổn ngăn chặn nạn đói, ngàn vạn lưu dân đội ơn sâu sắc.',
          narrative_en: 'You distribute grain reserves preventing famine and stabilizing regional peace.'
        }
      ];
    }

    // Universal Fallback Choices for any other historical event
    return [
      {
        choice_id: 'CANON_ALLIANCE',
        title_vi: 'Đồng Hành & Hỗ Trợ Theo Diễn Biến Chính Sử',
        title_en: 'Support the Historical Canon Path',
        outcome_type: 'CANON',
        rewards: { rep_gain: 20, sentiment_all: 15 },
        narrative_vi: `Bạn hòa mình vào dòng chảy lịch sử của biến cố "${event.name_vi}", giữ vững tiết tháo và trợ lực đại nghĩa.`,
        narrative_en: `You align with the historical progression of "${event.name_en}", upholding integrity and righteous effort.`
      },
      {
        choice_id: 'COMMERCE_OPPORTUNITY',
        title_vi: 'Khai Thác Cơ Hội Giao Thương & Quân Nhu',
        title_en: 'Seize Commercial & Supply Opportunism',
        outcome_type: 'CANON',
        required_stat: { com: 50 },
        rewards: { cash_gain: 1500, rep_gain: 10 },
        narrative_vi: `Bạn nắm bắt biến động giá cả do chiến cuộc đem lại, thu về 1,500 Quan lợi nhuận thương vận.`,
        narrative_en: `You leverage market arbitrage created by the crisis, netting 1,500 quan in commercial trade.`
      },
      {
        choice_id: 'STRATEGIC_MEDITATION',
        title_vi: 'Quan Sát Thế Cục & Ghi Chép Binh Thư',
        title_en: 'Observe Battlefield Tactics & Chronicle Lore',
        outcome_type: 'CANON',
        rewards: { exp_int: 30, rep_gain: 10 },
        narrative_vi: `Bạn đứng trên đài cao quan sát thế trận, đúc rút bài học binh pháp quý giá cho tương lai.`,
        narrative_en: `You keenly observe military dispositions from vantage points, deepening tactical acumen.`
      }
    ];
  }

  /**
   * Execute player participation in an event with full Double-Entry Accounting
   */
  participateInEvent({ eventId, choiceId, customNarrative = null }) {
    // 1. Fetch Event
    const event = runSqlJson(this.dbPath, `SELECT * FROM master_events WHERE event_id = '${eventId}' LIMIT 1;`)[0];
    if (!event) throw new Error(`Event not found: ${eventId}`);

    // 2. Check if already resolved
    const existing = runSqlJson(this.dbPath, `SELECT * FROM session_events WHERE event_id = '${eventId}' LIMIT 1;`)[0];
    if (existing && existing.status === 'RESOLVED') {
      throw new Error(`Sự kiện này đã được hoàn tất trước đó (Lựa chọn: ${existing.player_choice}).`);
    }

    // 3. Find Choice
    const choices = this.resolveEventChoices(event);
    const choice = choices.find(c => c.choice_id === choiceId) || choices[0];

    // 4. Fetch Current Player & Campaign State
    const player = runSqlJson(this.dbPath, `SELECT * FROM player_state LIMIT 1;`)[0] || {};
    const meta = runSqlJson(this.dbPath, `SELECT * FROM campaign_meta LIMIT 1;`)[0] || {};
    const gameDate = meta.current_date || '184-02-01';
    const activeTurn = meta.active_turn || 1;

    // 5. Validate Requirements
    const reqCost = choice.required_cost || {};
    if (reqCost.cash && (player.liquid_cash || 0) < reqCost.cash) {
      throw new Error(`Không đủ ngân lượng mặt! Yêu cầu: ${reqCost.cash} Quan (Hiện có: ${player.liquid_cash || 0} Quan).`);
    }

    // 6. Build Atomic State Mutation Script
    const rewards = choice.rewards || {};
    const cashCost = rewards.cash_cost || reqCost.cash || 0;
    const cashGain = rewards.cash_gain || 0;
    const netCashDelta = cashGain - cashCost;

    const repGain = rewards.rep_gain || 0;
    const outcomeType = choice.outcome_type || 'CANON';
    const resolutionNarrative = customNarrative || choice.narrative_vi || event.summary_vi;

    // Deterministic ids: replaying the same event choice must not create a
    // second ledger row or chronicle entry (the primary key rejects a duplicate).
    const txnId = `TXN-EVT-${eventId}-${choiceId}`;

    let sql = 'BEGIN TRANSACTION;\n';

    // A. Update Cashflow & Journal if cash changes
    if (netCashDelta !== 0) {
      const currentLiquid = Number(player.liquid_cash || 0);
      const safeCash = Number(player.safe_cash || 0);
      const totalCurrentCash = currentLiquid + safeCash;
      const totalClosingBalance = totalCurrentCash + netCashDelta;
      const newLiquidCash = currentLiquid + netCashDelta;
      const campaignId = meta.campaign_id || 'CMP-184-ZHOU-01';

      if (netCashDelta < 0) {
        // Cash outflow
        sql += `INSERT INTO cashflow_ledger 
          (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
          VALUES ('${txnId}', '${gameDate}', '${escapeSql(event.name_vi)}', 'EVENT_PARTICIPATION', 0, ${Math.abs(netCashDelta)}, ${totalClosingBalance}, 'Chi phí tham gia sự kiện lịch sử: ${escapeSql(choice.title_vi)}', 'Confirmed');\n`;

        // Double-entry Journal (Dr: Operating Expense, Cr: Cash on Hand)
        sql += `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
          VALUES ('${txnId}', '${campaignId}', '${gameDate}', '6001_OPERATING_EXPENSE', ${Math.abs(netCashDelta)}, 0, 'Chi phí tài trợ sự kiện ${escapeSql(event.name_vi)}');\n`;
        sql += `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
          VALUES ('${txnId}', '${campaignId}', '${gameDate}', '1001_CASH_MOBILE', 0, ${Math.abs(netCashDelta)}, 'Xuất quỹ tiền mặt tài trợ sự kiện');\n`;
      } else {
        // Cash inflow
        sql += `INSERT INTO cashflow_ledger 
          (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
          VALUES ('${txnId}', '${gameDate}', '${escapeSql(event.name_vi)}', 'EVENT_PARTICIPATION', ${netCashDelta}, 0, ${totalClosingBalance}, 'Thu nhập từ sự kiện lịch sử: ${escapeSql(choice.title_vi)}', 'Confirmed');\n`;

        // Double-entry Journal (Dr: Cash on Hand, Cr: Trading Revenue)
        sql += `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
          VALUES ('${txnId}', '${campaignId}', '${gameDate}', '1001_CASH_MOBILE', ${netCashDelta}, 0, 'Thu tiền thưởng sự kiện ${escapeSql(event.name_vi)}');\n`;
        sql += `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
          VALUES ('${txnId}', '${campaignId}', '${gameDate}', '4001_SALES_REVENUE', 0, ${netCashDelta}, 'Doanh thu thương vận sự kiện');\n`;
      }

      // Update player cash
      sql += `UPDATE player_state SET liquid_cash = ${newLiquidCash} WHERE player_id = '${player.player_id}';\n`;
    }

    // B. Update NPC Sentiments
    if (rewards.sentiment && typeof rewards.sentiment === 'object') {
      for (const [npcId, delta] of Object.entries(rewards.sentiment)) {
        const lastDelta = runSqlJson(this.dbPath, `SELECT sentiment_total, relationship_type FROM npc_relationship_deltas WHERE npc_id = '${npcId}' ORDER BY rowid DESC LIMIT 1;`)[0];
        const prevTotal = lastDelta ? Number(lastDelta.sentiment_total) : 50;
        const newTotal = prevTotal + delta;
        const relType = (lastDelta && lastDelta.relationship_type) ? lastDelta.relationship_type : 'Nghĩa Khách';

        sql += `INSERT INTO npc_relationship_deltas
          (npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes)
          VALUES ('${npcId}', '${gameDate}', ${delta}, ${newTotal}, '${relType}', 'Tham gia sự kiện lịch sử: ${escapeSql(choice.title_vi)}');\n`;
      }
    }

    // C. Record into session_events
    sql += `INSERT OR REPLACE INTO session_events
      (event_id, triggered_turn, status, player_choice, outcome_type, choice_narrative, resolution_narrative, rewards_claimed, resolved_at)
      VALUES ('${eventId}', ${activeTurn}, 'RESOLVED', '${choiceId}', '${outcomeType}', '${escapeSql(choice.title_vi)}', '${escapeSql(resolutionNarrative)}', '${escapeSql(JSON.stringify(rewards))}', CURRENT_TIMESTAMP);\n`;

    // D. Record Narrative into chat_chronicle
    const chronicleId = `CHRON-EVT-${eventId}-${choiceId}`;
    const chronicleNarrative = `卷 [BIẾN CỐ LỊCH SỬ] ${event.name_vi} (${event.historical_year} SCN):\n• Quyết định: ${choice.title_vi}\n• Diễn biến: ${resolutionNarrative}`;
    sql += `INSERT INTO chat_chronicle
      (id, turn_number, game_date, type, speaker, title, text, reasoning)
      VALUES ('${chronicleId}', ${activeTurn}, '${gameDate}', 'EVENT_CHRONICLE', 'Sử Quan Ghi Chép', '卷 ${escapeSql(event.name_vi)}', '${escapeSql(chronicleNarrative)}', 'Người chơi tham gia sự kiện lịch sử.');\n`;

    sql += 'COMMIT;';

    const batchResult = runSqlBatch(this.dbPath, sql);
    if (!batchResult.success) {
      throw new Error(`Giao dịch tham gia sự kiện thất bại: ${batchResult.error}`);
    }

    if (netCashDelta !== 0) {
      const currentLiquid = Number(player.liquid_cash || 0);
      const safeCash = Number(player.safe_cash || 0);
      const newLiquid = currentLiquid + netCashDelta;
      syncProgressLiquidCash(currentLiquid + safeCash + netCashDelta, newLiquid, safeCash);
    }

    return {
      success: true,
      eventId,
      choiceId,
      eventTitleVi: event.name_vi,
      choiceTitleVi: choice.title_vi,
      outcomeType,
      resolutionNarrative,
      rewards,
      netCashDelta
    };
  }
}

module.exports = {
  EventManager
};
