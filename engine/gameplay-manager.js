/**
 * ThreeKingdoms-AgentEngine: Gameplay Session & Playthrough Lifecycle Manager
 * (engine/gameplay-manager.js)
 * 
 * Enforces strict decoupling between:
 * - Master Data Layer (master_* tables: Immutable rules, items, recipes, locations, characters)
 * - Session Runtime Layer (session_* / active tables: Player cashflow, inventory, journal, deltas, chronicle)
 * 
 * Supports seamless "New Game" (fresh initialization from master templates)
 * and "Continue Play" (resuming existing active session).
 */

const fs = require('fs');
const path = require('path');
const { runSqlJson, runSqlBatch, escapeSql } = require('./db-adapter');
const { advanceCalendarMonth, parseGameDate, formatGameDate, getSeasonInfo } = require('./date-utils');

const ROOT_DIR = path.resolve(__dirname, '..');
const SAVES_DIR = path.join(ROOT_DIR, 'saves');
const DB_PATH = process.env.SIM_DB_PATH || path.join(SAVES_DIR, 'session.db');

class GameplayManager {
  constructor(dbPath = DB_PATH) {
    this.dbPath = dbPath;
  }

  /**
   * Check if an active playthrough session exists and is playable
   */
  canContinuePlay() {
    try {
      const meta = runSqlJson(this.dbPath, `SELECT * FROM campaign_meta LIMIT 1;`);
      const player = runSqlJson(this.dbPath, `SELECT * FROM player_state LIMIT 1;`);
      return Boolean(meta && meta.length > 0 && player && player.length > 0);
    } catch (e) {
      return false;
    }
  }

  /**
   * Get active session summary for Continue Screen
   */
  getSessionSummary() {
    if (!this.canContinuePlay()) {
      return { canContinue: false };
    }
    const meta = runSqlJson(this.dbPath, `SELECT * FROM campaign_meta LIMIT 1;`)[0] || {};
    const player = runSqlJson(this.dbPath, `SELECT * FROM player_state LIMIT 1;`)[0] || {};
    const cash = runSqlJson(this.dbPath, `SELECT balance FROM cashflow_ledger ORDER BY rowid DESC LIMIT 1;`)[0] || {};
    const turnsCount = runSqlJson(this.dbPath, `SELECT COUNT(*) as count FROM turn_log;`)[0] || { count: 0 };
    const chatTurns = runSqlJson(this.dbPath, `SELECT COUNT(*) as count FROM chat_chronicle;`)[0] || { count: 0 };

    return {
      canContinue: true,
      campaignId: meta.campaign_id,
      campaignName: meta.campaign_name,
      currentDate: meta.current_date,
      activeTurn: meta.active_turn,
      playerName: player.name,
      playerStyle: player.style_name,
      location: player.current_location,
      liquidCash: cash.balance || player.liquid_cash || 0,
      strategicGrain: player.strategic_grain || 0,
      totalTurnsLogged: turnsCount.count,
      chatTurnsLogged: chatTurns.count
    };
  }

  /**
   * List available master scenarios for starting a New Game
   */
  getMasterScenarios() {
    return runSqlJson(this.dbPath, `SELECT * FROM master_scenarios WHERE is_active = 1 ORDER BY start_date ASC;`);
  }

  /**
   * List available player archetypes for character creation
   */
  getMasterArchetypes() {
    return runSqlJson(this.dbPath, `SELECT * FROM master_player_archetypes ORDER BY CASE WHEN archetype_id = 'ARCH-COMMONER-YOUTH' THEN 0 ELSE 1 END, archetype_id ASC;`);
  }

  /**
   * Initialize a Brand New Game Session from Master Data templates
   * Wipes runtime session tables clean and seeds deterministic baseline without touching master_* tables.
   */
  startNewGame({
    scenarioId = 'SCN-184-ZHOU',
    archetypeId = 'ARCH-COMMONER-YOUTH',
    customPlayerName = null,
    customStyleName = null,
    seed = 1840201
  } = {}) {
    // 1. Fetch Master Scenario & Archetype
    const scenario = runSqlJson(this.dbPath, `SELECT * FROM master_scenarios WHERE scenario_id = '${scenarioId}' LIMIT 1;`)[0];
    if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);

    const arch = runSqlJson(this.dbPath, `SELECT * FROM master_player_archetypes WHERE archetype_id = '${archetypeId}' LIMIT 1;`)[0];
    if (!arch) throw new Error(`Archetype not found: ${archetypeId}`);

    const playerName = customPlayerName || arch.default_player_name;
    const styleName = customStyleName || arch.default_style_name;
    const startDate = scenario.start_date || '184-02-01';
    const campaignId = `CMP-${Date.now().toString(36).toUpperCase()}`;
    const isCommoner = (arch.archetype_id === 'ARCH-COMMONER-YOUTH');
    const startFixedCapital = isCommoner ? 0 : 18000;
    const startGrain = isCommoner ? 1.0 : 5.0;

    // 2. Build Reset & Seeding SQL Script for Session Tables Only
    const sql = `
      BEGIN TRANSACTION;

      -- A. Clear Runtime Session Tables
      DELETE FROM campaign_meta;
      DELETE FROM player_state;
      DELETE FROM player_skills;
      DELETE FROM cashflow_ledger;
      DELETE FROM account_journal;
      DELETE FROM inventory_items;
      DELETE FROM stock_movements;
      DELETE FROM npc_state;
      DELETE FROM npc_skills;
      DELETE FROM npc_relationship_deltas;
      DELETE FROM businesses;
      DELETE FROM turn_log;
      DELETE FROM action_log;
      DELETE FROM chat_chronicle;

      -- B. Seed Campaign Metadata
      INSERT INTO campaign_meta (campaign_id, campaign_name, start_date, current_date, active_turn, rules_version, random_seed)
      VALUES ('${campaignId}', '${scenario.name_vi.replace(/'/g, "''")}', '${startDate}', '${startDate}', 1, '1.1.0', ${seed});

      -- C. Seed Player State from Archetype
      INSERT INTO player_state (
        player_id, name, style_name, age, current_location, permanent_base,
        int_attr, pol_attr, war_attr, ldr_attr, dip_attr, com_attr, log_attr, cra_attr,
        liquid_cash, safe_cash, strategic_grain, fixed_capital, special_licenses, health, fatigue, morale
      ) VALUES (
        'PLY-0001', '${playerName.replace(/'/g, "''")}', '${styleName.replace(/'/g, "''")}', ${arch.starting_age},
        'Vườn Đào', '${arch.starting_location}',
        ${arch.int_attr}, ${arch.pol_attr}, ${arch.war_attr}, ${arch.ldr_attr}, ${arch.dip_attr}, ${arch.com_attr}, ${arch.log_attr}, ${arch.cra_attr},
        ${arch.initial_liquid_cash}, 0, ${startGrain}, ${startFixedCapital}, '${arch.initial_perks ? arch.initial_perks.replace(/'/g, "''") : '[]'}', 100, 0, 100
      );

      -- D. Seed Baseline Cashflow & Double-Entry Accounting
      INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
      VALUES (
        'TXN-1840201-0000', '${startDate}', '${isCommoner ? 'Tự Tích Lũy Bản Thân' : 'Khởi Tạo Vốn Tộc Lương'}', 'Góp Vốn',
        ${arch.initial_liquid_cash}, 0, ${arch.initial_liquid_cash},
        '${isCommoner ? 'Vốn lận lưng khởi nghiệp tự thân ban đầu' : 'Khởi tạo vốn lưu động ban đầu theo định dạng sĩ tộc thương gia'}', 'Confirmed'
      );

      INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
      VALUES
        ('TXN-1840201-0000', '${campaignId}', '${startDate}', '101_TIEN_MAT', ${arch.initial_liquid_cash}, 0, 'Nợ Tiền mặt vốn lưu động ban đầu'),
        ('TXN-1840201-0000', '${campaignId}', '${startDate}', '301_VON_CHU_SO_HUU', 0, ${arch.initial_liquid_cash}, 'Có Vốn chủ sở hữu ban đầu');

      -- E. Seed Initial Warehouse Inventory from Master Catalog
      ${isCommoner ? `
      INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
      VALUES
        ('COM-BAMBOO', 'RAW_MATERIAL', 'Tre Trúc U Châu (Tự hái)', 5, 10, 'Zhuo County'),
        ('COM-GRAIN', 'FOOD_STUFF', 'Lương Thảo Mưu Sinh Ban Đầu', 1.0, 100, 'Zhuo County');
      ` : `
      INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
      VALUES
        ('COM-BAMBOO', 'RAW_MATERIAL', 'Tre Trúc U Châu (Nguyên liệu đan dệt)', 25, 12, 'Zhuo Workshop'),
        ('COM-LEATH', 'RAW_MATERIAL', 'Da Thuộc Gia Súc Trác Huyện', 8, 80, 'Zhuo Workshop'),
        ('COM-GRAIN', 'FOOD_STUFF', 'Lương Thảo Dự Trữ Xưởng Lương Thị', 5.0, 100, 'Zhuo Workshop'),
        ('PROD-MAT', 'FINISHED_GOOD', 'Chiếu Trúc Lương Gia Thành Phẩm', 12, 14, 'Zhuo Workshop');
      `}

      -- F. Seed Initial Workshop Business (Only for non-commoner)
      ${isCommoner ? '' : `
      INSERT INTO businesses (business_id, name, location_id, manager_npc_id, safe_cash, delegation_level, efficiency_multiplier, current_workforce, monthly_capacity_hours, monthly_rent, auto_procure, status)
      VALUES ('BIZ-0001', 'Lương Thị Chức Tác Phường', 'LOC-0001', 'NPC-0007', 3000, 2, 0.85, 4, 800, 200, 1, 'ACTIVE');
      `}

      -- G. Seed Core Retainer NPCs from Master Characters
      ${isCommoner ? `
      INSERT INTO npc_state (npc_id, name, loyalty, morale, fatigue, int_attr, pol_attr, war_attr, ldr_attr, dip_attr, com_attr, log_attr, cra_attr, personality, motivation, assigned_business_id, assigned_role, monthly_wage)
      VALUES
        ('NPC-0007', 'Trần Bảo (Thợ Cả Trác Huyện)', 65, 100, 0, 58, 52, 45, 60, 55, 62, 65, 75, 'PRAGMATIC', 'SECURITY', NULL, 'CRAFTSMAN', 0),
        ('NPC-0008', 'Triệu An (Thợ Mộc Trác Huyện)', 65, 95, 0, 50, 45, 42, 50, 48, 55, 60, 70, 'DILIGENT', 'SECURITY', NULL, 'CARPENTER', 0);
      ` : `
      INSERT INTO npc_state (npc_id, name, loyalty, morale, fatigue, int_attr, pol_attr, war_attr, ldr_attr, dip_attr, com_attr, log_attr, cra_attr, personality, motivation, assigned_business_id, assigned_role, monthly_wage)
      VALUES
        ('NPC-0007', 'Trần Bảo (Thợ Cả Lương Gia)', 85, 100, 0, 58, 52, 45, 60, 55, 62, 65, 75, 'PRAGMATIC', 'LOYALTY', 'BIZ-0001', 'FOREMAN', 750),
        ('NPC-0008', 'Triệu An (Thợ Mộc Kỳ Cựu)', 80, 95, 0, 50, 45, 42, 50, 48, 55, 60, 70, 'DILIGENT', 'SECURITY', 'BIZ-0001', 'CARPENTER', 600);
      `}

      -- H. Seed Initial Turn Log & Encounter Narrative
      INSERT INTO turn_log (turn_number, game_date, turn_title, location, summary, dilemma_choice)
      VALUES (
        1, '${startDate}', '${isCommoner ? 'Bố Y Khởi Thủy Tại Huyện Trác' : 'Khởi Sự Nghiệp Lớn Tại Huyện Trác'}', 'Trang Viên Vườn Đào',
        '${isCommoner ? 'Lương Diễn hai bàn tay trắng đến Huyện Trác tìm cơ hội lập thân, gặp gỡ hào kiệt Lưu Quan Trương, đứng trước 5 đại phẩm lộ tương lai.' : 'Lương Diễn khởi nghiệp buôn chiếu đan khiên tại Huyện Trác, kết giao cùng các hào kiệt Lưu Huyền Đức, Quan Vân Trường, Trương Dực Đức.'}',
        '${isCommoner ? 'Đi làm thuê công nhật tích lũy bạc vụn và năng lực, chuẩn bị cho bước rẽ tương lai' : 'Chọn chiến lược sản xuất thủ công kết hợp quân nhu bảo vệ quê hương'}'
      );

      -- I. Seed Initial Chat Chronicle Turn
      INSERT INTO chat_chronicle (id, turn_number, game_date, type, speaker, title, avatar, text, dice_badge, deltas, reasoning)
      VALUES (
        'turn_init_welcome', 1, '${startDate}', 'npc',
        'Trương Phi (Dực Đức)', 'Hào Kiệt Huyện Trác — WAR 97', '張',
        '${isCommoner ? 'Trương Phi xách vò rượu bước ra khỏi lò mổ, thấy Lương Diễn vai vác đòn gánh đứng nhìn bảng cáo thị, liền cười vang: "Tiểu huynh đệ! Thời loạn này, muốn lập thân thì trước tiên phải có cái ăn: nếu cần tiền thì tới lò mổ, lò rèn hoặc tửu quán phụ việc làm thuê kiếm tiền công nhật; nếu có chí thì rèn luyện võ nghệ tùng quân! Lão Trương ta nhìn ngươi có chí khí, mau tới uống chén rượu cùng ta!"' : 'Trương Phi đặt vò rượu Trác Thành Trán Nương xuống gốc đào, lau miệng cười vang: "Lương Chí Viễn, đệ dệt đường thương rất nhanh! Lò mổ của lão Trương hôm nay vừa lột được da bò hảo hạng. Chúng ta cùng nâng chén bàn tính đại sự cứu giúp lê dân chứ?"'}',
        NULL, '{"cash":"+${arch.initial_liquid_cash} Qian","location":"Vườn Đào"}', 'Khởi tạo bối cảnh Tân Du Hý từ Master Blueprint.'
      );

      COMMIT;
    `;

    const res = runSqlBatch(this.dbPath, sql);
    if (!res.success) {
      throw new Error(`Failed to start new game: ${res.error}`);
    }

    return {
      success: true,
      campaignId,
      scenarioId,
      archetypeId,
      playerName,
      startDate
    };
  }

  /**
   * Snapshot current active playthrough to a named save slot file
   */
  exportSaveSlot(slotName = 'slot_1') {
    const safeSlot = slotName.replace(/[^a-zA-Z0-9_-]/g, '');
    const slotPath = path.join(SAVES_DIR, `${safeSlot}.db`);
    try {
      execSync(`sqlite3 "${this.dbPath}" "VACUUM INTO '${slotPath.replace(/\\/g, '/')}'"`, { encoding: 'utf8' });
      return { success: true, slotPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Restore a playthrough from a named save slot file
   */
  loadSaveSlot(slotName = 'slot_1') {
    const safeSlot = slotName.replace(/[^a-zA-Z0-9_-]/g, '');
    const slotPath = path.join(SAVES_DIR, `${safeSlot}.db`);
    if (!fs.existsSync(slotPath)) {
      return { success: false, error: `Save slot not found: ${slotName}` };
    }
    try {
      fs.copyFileSync(slotPath, this.dbPath);
      return { success: true, slotPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Advance the campaign to the next strategic turn (Monthly Progression).
   * Increments active_turn, advances game date by 1 month, runs autonomous business operations,
   * restores player fatigue, executes living world simulations, writes turn_log and chronicle.
   */
  advanceTurn({ notes = '' } = {}) {
    // 1. Fetch active campaign metadata
    const meta = runSqlJson(this.dbPath, `SELECT * FROM campaign_meta LIMIT 1;`)[0];
    if (!meta) throw new Error('Campaign metadata missing in session database.');

    const prevTurn = Number(meta.active_turn || 1);
    const nextTurn = prevTurn + 1;
    const prevDate = meta.current_date || '184-05-02';

    // 2. Advance game date to the 1st of next month
    const nextDate = advanceCalendarMonth(prevDate, 1, true);

    // 3. Player State Fatigue Recovery & Morale Stabilization (Gradual Health Recovery, No Invincible Resets)
    const player = runSqlJson(this.dbPath, `SELECT * FROM player_state LIMIT 1;`)[0];
    let recoveredFatigue = 0;
    let playerUpdateSql = '';
    if (player) {
      const currentFatigue = Number(player.fatigue || 0);
      const newFatigue = Math.max(0, currentFatigue - 35);
      recoveredFatigue = currentFatigue - newFatigue;
      const currentMorale = Number(player.morale || 100);
      const newMorale = Math.min(100, currentMorale + 10);
      const currentHealth = Number(player.health !== undefined ? player.health : 100);
      // Natural health recovery of +15 if alive, capped at 100
      const newHealth = currentHealth > 0 ? Math.min(100, currentHealth + 15) : 0;
      playerUpdateSql = `UPDATE player_state SET fatigue = ${newFatigue}, morale = ${newMorale}, health = ${newHealth} WHERE player_id = '${player.player_id}';`;
    }

    // 4. Prepare campaign_meta update SQL
    const metaUpdateSql = `UPDATE campaign_meta SET active_turn = ${nextTurn}, current_date = '${nextDate}' WHERE campaign_id = '${meta.campaign_id}';`;

    // 5. Monthly Business / Enterprise Cycle & Retainer Wages
    const businesses = runSqlJson(this.dbPath, `SELECT * FROM businesses;`);
    const bizReports = [];
    const bizUpdates = [];
    for (const b of businesses) {
      const staff = runSqlJson(this.dbPath, `SELECT * FROM npc_state WHERE assigned_business_id = '${b.business_id}';`);
      let totalWages = 0;
      for (const s of staff) {
        totalWages += Number(s.monthly_wage || 0);
      }
      const tier = Number(b.tier || 1);
      const workforce = Number(b.current_workforce || 2);
      const eff = Number(b.efficiency_multiplier || 1.0);
      const grossIncome = Math.round(tier * 260 * eff + workforce * 25);
      const netProfit = grossIncome - totalWages;

      let currentSafe = Number(b.safe_cash || 0);
      let updatedSafe = Math.max(0, currentSafe + netProfit);
      bizUpdates.push(`UPDATE businesses SET safe_cash = ${updatedSafe} WHERE business_id = '${b.business_id}';`);

      bizReports.push({
        businessId: b.business_id,
        businessName: b.name,
        grossIncome,
        totalWages,
        netProfit,
        newSafeCash: updatedSafe,
        staffCount: staff.length
      });
    }

    // 6. Living World Simulation (NPCs, Politics, Logistics)
    const gsm = globalThis.__GRAND_STRATEGY_MODULES__;
    let npcLogs = [];
    let politicalEvents = [];
    let ecologyResults = null;

    if (gsm && gsm.npcLifecycle && typeof gsm.npcLifecycle.simulateAllActiveNpcs === 'function') {
      try { npcLogs = gsm.npcLifecycle.simulateAllActiveNpcs(nextTurn, nextDate); } catch (e) {}
    }
    if (gsm && gsm.factionPolitics && typeof gsm.factionPolitics.simulatePoliticalCycle === 'function') {
      try { politicalEvents = gsm.factionPolitics.simulatePoliticalCycle(nextTurn, nextDate); } catch (e) {}
    }
    if (gsm && gsm.ecologyLogistics && typeof gsm.ecologyLogistics.simulateEcologyAndLogisticsTurn === 'function') {
      try { ecologyResults = gsm.ecologyLogistics.simulateEcologyAndLogisticsTurn(nextTurn, nextDate); } catch (e) {}
    }

    // Wire WORLD_MONTH_TICK EventBus notification to cascade time advancement
    const eventBus = gsm?.registry?.ctx?.eventBus || gsm?.utilityAi?.ctx?.eventBus;
    if (eventBus && typeof eventBus.publish === 'function') {
      const [y, m] = nextDate.split('-').map(Number);
      try {
        eventBus.publish('WORLD_MONTH_TICK', { year: y, month: m, turn: nextTurn });
      } catch (e) {
        console.warn('[GameplayManager] WORLD_MONTH_TICK publish failed:', e.message);
      }
    }

    let proceduralNpcSql = '';
    // Procedural Fallback & Comprehensive Simulation Enrichment
    if (!npcLogs || npcLogs.length === 0) {
      proceduralNpcSql = `
        UPDATE npc_state 
        SET craft_exp = craft_exp + 15, 
            fatigue = MAX(0, fatigue - 3), 
            morale = MIN(100, morale + 4)
        WHERE assigned_business_id IS NOT NULL;
      `;

      npcLogs = [
        { npcId: 'NPC-0007', name: 'Trần Bao (Chen Bao)', action: 'Đôn đốc gia nhân xưởng chức tác hoàn thành định mức vật liệu mây tre, tích lũy +15 EXP Chế Tác.' },
        { npcId: 'NPC-0008', name: 'Triệu An (Zhao An)', action: 'Nổi lửa lò rèn tôi luyện phôi sắt mũi thương, nâng cao tay nghề rèn đúc vũ khí (+18 EXP).' },
        { npcId: 'NPC-0001', name: 'Lưu Bị (Huyền Đức)', action: 'Thăm hỏi phụ lão thôn hương Huyện Trác, ủy lạo gia quyến dân binh sau chiến dịch dẹp loạn.' },
        { npcId: 'NPC-0002', name: 'Trương Phi (Dực Đức)', action: 'Mở tiệc thết đãi hảo hán tráng đinh, luyện tập xà mâu cùng nghĩa dũng quân.' },
        { npcId: 'NPC-0003', name: 'Quan Vũ (Vân Trường)', action: 'Tuần tra an ninh cửa Đông, tôi luyện đao pháp Thanh Long và nghiên cứu Xuân Thu.' },
        { npcId: 'NPC-0005', name: 'Lư Thực (Tử Can)', action: 'Bố phòng quân đồn Ký Châu, chỉnh đốn hàng ngũ Bắc Quân sau thắng lợi đại phá Quảng Tông.' }
      ];
    }

    if (!politicalEvents || politicalEvents.length === 0) {
      politicalEvents = [
        {
          title: 'Chiếu Chỉ Triều Đình Lạc Dương',
          narrative: 'Hán Linh Đế hạ chiếu úy lạo quan binh dẹp loạn Khăn Vàng, ban thưởng lụa và rượu ngự cho chư tướng tiền tuyến Ký Châu và Dĩnh Xuyên.'
        },
        {
          title: 'Chiến Cục Dĩnh Xuyên & Hoàng Phủ Tung',
          narrative: 'Trung Lang Tướng Hoàng Phủ Tung và Kỵ Đô Úy Tào Tháo phối hợp hợp vây tàn quân Hoàng Cân tại Trường Xã, tình hình Trung Nguyên dần ổn định.'
        },
        {
          title: 'Giao Thương Mùa Hè Tại U Châu',
          narrative: 'Thương đoàn Kế Thành vận chuyển vải vóc và da thú đổ về chợ Đông Môn; nguồn cung muối biển từ Thanh Châu lưu thông trở lại.'
        }
      ];
    }

    if (!ecologyResults) {
      ecologyResults = {
        season: 'Hạ Khởi',
        weather: 'Quang đãng, đường sá khô ráo thuận tiện hành quân và tải thương',
        marketTrend: 'Giá lương thực ổn định, giá sắt và da thuộc tăng nhẹ do nhu cầu tái thiết'
      };
    }

    // 7. Write Turn Log SQL
    const turnTitle = `Lượt ${nextTurn} • Phong Vân Biến Động (${nextDate})`;
    const playerLoc = player?.current_location || 'LOC-0001';
    const turnSummary = `Chuyển sang tháng mới (${nextDate}). Vận hành ${bizReports.length} sản nghiệp; thể lực phục hồi +${recoveredFatigue}; thế cuộc quần hùng thiên hạ và nghĩa quân chuyển dịch.`;

    const turnLogSql = `
      INSERT INTO turn_log (turn_number, game_date, turn_title, location, summary, dilemma_choice)
      VALUES (${nextTurn}, '${nextDate}', '${turnTitle.replace(/'/g, "''")}', '${playerLoc}', '${turnSummary.replace(/'/g, "''")}', 'Tiếp tục phát triển sản nghiệp và bồi đắp uy vọng hào kiệt.');
    `;

    // 8. Record Chat Chronicle SQL
    const chronicleId = `turn_adv_${nextTurn}_${nextDate.replace(/-/g, '')}`;
    const chronicleText = `【KẾT THÚC LƯỢT ${prevTurn} ➔ BƯỚC VÀO LƯỢT ${nextTurn}】\n` +
      `Thời quang thấm thoát, chiến cuộc chuyển sang ngày **${nextDate}**.\n` +
      `• **Trạng thái cá nhân**: Thể lực hồi phục (${recoveredFatigue > 0 ? `+${recoveredFatigue}` : 'Tối đa'}), sĩ khí ổn định.\n` +
      `• **Vận hành sản nghiệp**: ${bizReports.length > 0 ? bizReports.map(br => `${br.businessName} (Lợi nhuận: ${br.netProfit >= 0 ? '+' : ''}${br.netProfit} Tiền)`).join(', ') : 'Chưa có xưởng trực thuộc, tiếp tục tự do hành hiệp.'}\n` +
      `• **Động thái thiên hạ**: Các chư hầu Bắc Cương và triều đình Lạc Dương tiếp tục điều động binh mã, giá cả thị trường biến động theo mùa.`;

    const chronicleSql = `
      INSERT INTO chat_chronicle (id, turn_number, game_date, type, speaker, title, avatar, text, deltas, reasoning)
      VALUES (
        '${chronicleId}', ${nextTurn}, '${nextDate}', 'system', 'Hệ Thống Chiến Lược', 'Báo Cáo Chuyển Lượt', '曆',
        '${chronicleText.replace(/'/g, "''")}',
        '{"activeTurn": ${nextTurn}, "gameDate": "${nextDate}", "recoveredFatigue": ${recoveredFatigue}}',
        'Cập nhật tiến trình thời gian và mô phỏng thế giới sống động.'
      );
    `;

    // Execute all core turn mutations inside an ACID transaction to prevent partial state corruption
    const atomicTurnBatch = [
      playerUpdateSql,
      metaUpdateSql,
      ...bizUpdates,
      proceduralNpcSql,
      turnLogSql,
      chronicleSql
    ].filter(Boolean).join('\n');

    const txResult = runSqlBatch(this.dbPath, atomicTurnBatch);
    if (!txResult.success) {
      throw new Error(`Failed to commit turn advance transaction: ${txResult.error}`);
    }

    // 9. Sync PROGRESS.md Header & Turn Section
    const progressPath = path.join(ROOT_DIR, 'game', 'PROGRESS.md');
    if (fs.existsSync(progressPath)) {
      try {
        let pContent = fs.readFileSync(progressPath, 'utf8');
        pContent = pContent.replace(/\|\s*\*\*Current In-Game Date\*\*\s*\|\s*\*\*([^*]+)\*\*/i, `| **Current In-Game Date** | **${nextDate}**`);
        pContent = pContent.replace(/\|\s*\*\*Active Turn\*\*\s*\|\s*\*\*([^*]+)\*\*/i, `| **Active Turn** | **Turn ${nextTurn} (${turnTitle})**`);

        // Insert new turn summary into Section 2
        const turnHeaderTag = '## 2. Rolling Turn History & Key Milestones';
        if (pContent.includes(turnHeaderTag)) {
          const newTurnBlock = `\n### [Turn ${nextTurn}] — ${nextDate}: ${turnTitle}\n- ${turnSummary}\n`;
          pContent = pContent.replace(turnHeaderTag, `${turnHeaderTag}\n${newTurnBlock}`);
        }
        fs.writeFileSync(progressPath, pContent, 'utf8');
      } catch (e) {}
    }

    return {
      success: true,
      prevTurn,
      nextTurn,
      prevDate,
      nextDate,
      recoveredFatigue,
      bizReports,
      npcLogs: npcLogs || [],
      politicalEvents: politicalEvents || [],
      ecologyResults,
      turnTitle,
      turnSummary
    };
  }
}

module.exports = {
  GameplayManager
};
