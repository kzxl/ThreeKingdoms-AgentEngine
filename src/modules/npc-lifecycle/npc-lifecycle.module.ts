/**
 * Feature Module: NPC Autonomous Lifecycle & Progression Journey
 * Implements a dynamic, living world where every NPC pursues their own ambitions,
 * accumulates personal wealth, masters skills, recruits personal troops, and generates historical milestones.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { IFeatureModule, ModuleContext, CharacterId } from '../../core/types';

export type NpcAmbitionType =
  | 'HEGEMON_UNIFIER'
  | 'RIGHTEOUS_VANGUARD'
  | 'LOYAL_BROTHERHOOD'
  | 'MASTER_ARTISAN'
  | 'COMMERCE_TYCOON'
  | 'SCHOLAR_STATESMAN'
  | 'DEVOTED_RETAINER';

export type NpcActionType =
  | 'MARTIAL_DRILL'
  | 'STRATEGY_STUDY'
  | 'COMMERCE_ARBITRAGE'
  | 'BANDIT_EXPEDITION'
  | 'BANQUET_NETWORKING'
  | 'CRAFT_BREAKTHROUGH';

export interface NpcProgressionData {
  npcId: CharacterId;
  lifeAmbition: NpcAmbitionType;
  currentFocus: string;
  personalCash: number;
  prestige: number;
  personalTroops: number;
  milestoneTitle: string;
  growthStats: Record<string, number>;
}

export interface NpcJourneyLog {
  id: string;
  npcId: CharacterId;
  turnNumber: number;
  gameDate: string;
  actionType: NpcActionType;
  titleVi: string;
  narrativeVi: string;
  statChanges: Record<string, number | string>;
  createdAt: string;
}

export class NpcLifecycleModule implements IFeatureModule {
  public readonly id = 'module.npc-lifecycle';
  public readonly name = 'NPC Autonomous Lifecycle & Living World Progression';
  public readonly version = '1.0.0';

  private ctx!: ModuleContext;

  private runSql(sql: string): any[] {
    const tempFile = path.join(path.dirname(this.ctx.dbPath), `npc_life_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.sql`);
    fs.writeFileSync(tempFile, sql, 'utf8');
    try {
      const stdout = execSync(`sqlite3 -json "${this.ctx.dbPath}" < "${tempFile}"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return stdout && stdout.trim() ? JSON.parse(stdout) : [];
    } catch (err) {
      return [];
    } finally {
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
    }
  }

  private runSqlRaw(sql: string): boolean {
    const tempFile = path.join(path.dirname(this.ctx.dbPath), `npc_life_raw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.sql`);
    fs.writeFileSync(tempFile, sql, 'utf8');
    try {
      execSync(`sqlite3 "${this.ctx.dbPath}" < "${tempFile}"`, { stdio: ['pipe', 'pipe', 'pipe'] });
      return true;
    } catch (err) {
      return false;
    } finally {
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
    }
  }

  public init(ctx: ModuleContext): void {
    this.ctx = ctx;
    this.ensureBaselineProgressions();

    // Listen to world month tick to advance living NPC cycles
    this.ctx.eventBus.subscribe('WORLD_MONTH_TICK', async (event: { month: number; year: number; turn?: number }) => {
      const turn = event.turn || 6;
      const gameDate = `${event.year}-${String(event.month).padStart(2, '0')}-01`;
      this.simulateAllActiveNpcs(turn, gameDate);
    });
  }

  /**
   * Initializes baseline ambitions and progression stats for core NPCs
   */
  public ensureBaselineProgressions(): void {
    const existing = this.runSql(`SELECT npc_id FROM npc_personal_progression;`);
    const existingIds = new Set(existing.map(r => r.npc_id));

    const defaultNpcBaselines: Array<{
      npcId: string;
      ambition: NpcAmbitionType;
      focus: string;
      cash: number;
      prestige: number;
      troops: number;
      title: string;
    }> = [
      { npcId: 'NPC-0001', ambition: 'HEGEMON_UNIFIER', focus: 'Chiêu tập nghĩa dũng', cash: 2500, prestige: 250, troops: 120, title: 'Hán Thất Tông Thân' },
      { npcId: 'NPC-0002', ambition: 'RIGHTEOUS_VANGUARD', focus: 'Luyện đao & Nghiên cứu Xuân Thu', cash: 1200, prestige: 210, troops: 50, title: 'Uy Chấn U Châu' },
      { npcId: 'NPC-0003', ambition: 'LOYAL_BROTHERHOOD', focus: 'Rèn đúc xà mâu & Tiễu phỉ', cash: 3000, prestige: 190, troops: 80, title: 'Vạn Nhân Địch' },
      { npcId: 'NPC-0007', ambition: 'MASTER_ARTISAN', focus: 'Quy chuẩn hóa dây chuyền rèn', cash: 1800, prestige: 85, troops: 0, title: 'Lương Gia Chưởng Sự' },
      { npcId: 'NPC-0008', ambition: 'MASTER_ARTISAN', focus: 'Nghiên cứu nhiệt luyện lưỡi kiếm', cash: 900, prestige: 60, troops: 0, title: 'Đại Tượng Sư Rèn' },
      { npcId: 'NPC-0009', ambition: 'DEVOTED_RETAINER', focus: 'Tích lũy lương bạc gia đình', cash: 450, prestige: 35, troops: 0, title: 'Thợ Dệt Chăm Chỉ' },
      { npcId: 'NPC-0010', ambition: 'DEVOTED_RETAINER', focus: 'Luyện tập côn bổng phòng vệ', cash: 520, prestige: 40, troops: 0, title: 'Dũng Lực Mộc Tượng' }
    ];

    for (const b of defaultNpcBaselines) {
      if (!existingIds.has(b.npcId)) {
        this.runSqlRaw(`
          INSERT INTO npc_personal_progression (npc_id, life_ambition, current_focus, personal_cash, prestige, personal_troops, milestone_title)
          VALUES ('${b.npcId}', '${b.ambition}', '${b.focus}', ${b.cash}, ${b.prestige}, ${b.troops}, '${b.title}');
        `);
      }
    }
  }

  /**
   * Simulates a personal monthly action and growth cycle for a single NPC
   */
  public simulateNpcTurn(npcId: CharacterId, turnNumber: number, gameDate: string): NpcJourneyLog | null {
    // 1. Fetch current progression state
    const progRows = this.runSql(`SELECT * FROM npc_personal_progression WHERE npc_id = '${npcId}';`);
    let prog = progRows[0];
    if (!prog) {
      this.ensureBaselineProgressions();
      const refetched = this.runSql(`SELECT * FROM npc_personal_progression WHERE npc_id = '${npcId}';`);
      prog = refetched[0];
      if (!prog) return null;
    }

    // 2. Fetch NPC info
    const charRows = this.runSql(`
      SELECT coalesce(n.name, m.name_vi, '${npcId}') as name,
             coalesce(n.war_attr, m.war_attr, 50) as war_attr,
             coalesce(n.int_attr, m.int_attr, 50) as int_attr,
             coalesce(n.cra_attr, m.cra_attr, 50) as cra_attr,
             coalesce(n.com_attr, m.com_attr, 50) as com_attr
      FROM (SELECT '${npcId}' as target_id)
      LEFT JOIN npc_state n ON target_id = n.npc_id
      LEFT JOIN master_characters m ON target_id = m.npc_id;
    `);
    const npc = charRows[0] || { name: npcId, war_attr: 50, int_attr: 50, cra_attr: 50, com_attr: 50 };

    // 3. Determine autonomous action based on ambition and focus
    let actionType: NpcActionType = 'MARTIAL_DRILL';
    let titleVi = '';
    let narrativeVi = '';
    const statChanges: Record<string, number | string> = {};

    switch (prog.life_ambition) {
      case 'RIGHTEOUS_VANGUARD':
      case 'LOYAL_BROTHERHOOD': {
        const rand = Math.random();
        if (rand < 0.5) {
          actionType = 'MARTIAL_DRILL';
          titleVi = `${npc.name} dốc lòng khổ luyện võ nghệ`;
          narrativeVi = `Tại bãi tập, ${npc.name} ngày đêm mài giũa thương pháp, khí thế bức người, uy lực chiêu thức gia tăng đáng kể.`;
          statChanges['war_exp'] = '+15 EXP';
          statChanges['morale'] = '+5';
        } else {
          actionType = 'BANDIT_EXPEDITION';
          const bounty = Math.floor(150 + Math.random() * 200);
          const recruited = Math.floor(5 + Math.random() * 10);
          titleVi = `${npc.name} dẫn binh tiễu trừ sơn tặc phụ cận`;
          narrativeVi = `${npc.name} tự dẫn bộ hạ đột kích sào huyệt sơn tặc, trảm tướng cướp, thu được ${bounty} Tiền chiến lợi phẩm và thu phục ${recruited} tráng đinh tình nguyện gia nhập.`;
          statChanges['personal_cash'] = `+${bounty} Tiền`;
          statChanges['personal_troops'] = `+${recruited} Dũng sĩ`;
          statChanges['prestige'] = '+15 Danh vọng';
          prog.personal_cash += bounty;
          prog.personal_troops += recruited;
          prog.prestige += 15;
        }
        break;
      }

      case 'MASTER_ARTISAN': {
        actionType = 'CRAFT_BREAKTHROUGH';
        titleVi = `${npc.name} cải tiến kỹ nghệ chế tác`;
        narrativeVi = `Sau nhiều đêm thử nghiệm, ${npc.name} tinh chỉnh thành công phương pháp trui rèn vật liệu, giúp nâng cao độ bền và giảm hao mòn sản phẩm.`;
        statChanges['craft_exp'] = '+20 EXP';
        statChanges['prestige'] = '+10 Danh vọng';
        prog.prestige += 10;
        break;
      }

      case 'HEGEMON_UNIFIER':
      case 'SCHOLAR_STATESMAN': {
        actionType = 'STRATEGY_STUDY';
        titleVi = `${npc.name} luận bàn thế cục & nghiên cứu binh pháp`;
        narrativeVi = `${npc.name} tiếp kiến các danh sĩ địa phương, phân tích cục diện khởi nghĩa Khăn Vàng, hoạch định phương lược cứu dân giúp nước.`;
        statChanges['int_exp'] = '+15 EXP';
        statChanges['prestige'] = '+20 Danh vọng';
        prog.prestige += 20;
        break;
      }

      default: {
        actionType = 'COMMERCE_ARBITRAGE';
        const earned = Math.floor(80 + Math.random() * 120);
        titleVi = `${npc.name} tham gia giao thương tích lũy`;
        narrativeVi = `Tận dụng ngày nghỉ tại thị trấn, ${npc.name} thực hiện giao lưu trao đổi hàng hóa vật phẩm, thu thêm ${earned} Tiền vào tài sản riêng.`;
        statChanges['personal_cash'] = `+${earned} Tiền`;
        prog.personal_cash += earned;
        break;
      }
    }

    // 4. Save Journey Log
    const logId = `JRN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const log: NpcJourneyLog = {
      id: logId,
      npcId,
      turnNumber,
      gameDate,
      actionType,
      titleVi,
      narrativeVi,
      statChanges,
      createdAt: new Date().toISOString()
    };

    this.runSqlRaw(`
      INSERT INTO npc_journey_logs (id, npc_id, turn_number, game_date, action_type, title_vi, narrative_vi, stat_changes_json)
      VALUES ('${log.id}', '${log.npcId}', ${log.turnNumber}, '${log.gameDate}', '${log.actionType}',
              '${log.titleVi.replace(/'/g, "''")}', '${log.narrativeVi.replace(/'/g, "''")}',
              '${JSON.stringify(log.statChanges).replace(/'/g, "''")}');

      UPDATE npc_personal_progression
      SET personal_cash = ${prog.personal_cash},
          prestige = ${prog.prestige},
          personal_troops = ${prog.personal_troops},
          updated_at = CURRENT_TIMESTAMP
      WHERE npc_id = '${npcId}';
    `);

    // 5. Publish to EventBus
    this.ctx.eventBus.publish('NPC_JOURNEY_STEP_COMPLETED', log);

    // 6. Check Career Paradigm Shift (Đột phá thân phận)
    this.checkAndExecuteCareerShift(npcId, turnNumber, gameDate, prog);

    return log;
  }

  /**
   * Evaluates and executes a Career Paradigm Shift if thresholds are met
   */
  public checkAndExecuteCareerShift(
    npcId: CharacterId,
    turnNumber: number,
    gameDate: string,
    prog: any
  ): any | null {
    let shiftCategory = '';
    let oldTier = '';
    let newTier = '';
    let oldRole = '';
    let newRole = '';
    let titleVi = '';
    let narrativeVi = '';
    let newMilestoneTitle = '';
    let wageUpdate = 0;

    if (npcId === 'NPC-0007' && prog.prestige >= 90 && prog.personal_cash >= 1800 && prog.milestone_title !== 'U Châu Thần Tượng Sư') {
      shiftCategory = 'MASTERWORK_ELEVATION';
      oldRole = 'FOREMAN';
      newRole = 'CHIEF_ARTISAN_PARTNER';
      oldTier = 'Cấp Bậc: Quản Đốc';
      newTier = 'Cấp Bậc: Đại Tượng Sư Đối Tác';
      newMilestoneTitle = 'U Châu Thần Tượng Sư';
      titleVi = 'Trần Bảo đột phá thân phận: Thăng tọa Đại Tượng Sư U Châu';
      narrativeVi = 'Tích lũy đủ 1,800 Tiền riêng và danh tiếng vang dội, Trần Bảo hoàn thiện phương pháp rèn bí truyền, chính thức được tôn vinh là Đại Tượng Sư bậc thầy của xưởng Lương Gia.';
      wageUpdate = 1000;
    } else if (npcId === 'NPC-0003' && prog.personal_troops >= 80 && prog.prestige >= 190 && prog.milestone_title !== 'Biệt Đội Tư Mã') {
      shiftCategory = 'WARLORD_COMMISSION';
      oldRole = 'HISTORICAL';
      newRole = 'FRONTIER_MAJOR';
      oldTier = 'Cấp Bậc: Dân Binh Thủ Lĩnh';
      newTier = 'Cấp Bậc: Biệt Đội Tư Mã';
      newMilestoneTitle = 'Biệt Đội Tư Mã';
      titleVi = 'Trương Phi thăng quan: Thứ sử U Châu ban sắc phong Biệt Đội Tư Mã';
      narrativeVi = 'Với chiến tích tiễu trừ sơn tặc và 80 dũng sĩ tinh nhuệ thiện chiến, Trương Phi được triều đình sắc phong làm Biệt Đội Tư Mã, thống lĩnh tiền quân phòng thủ Trác Huyện.';
    } else if (npcId === 'NPC-0008' && prog.personal_cash >= 900 && prog.milestone_title !== 'Chưởng Quản Lò Luyện') {
      shiftCategory = 'PROMOTION';
      oldRole = 'SENIOR_ARTISAN';
      newRole = 'FOUNDRY_MASTER';
      oldTier = 'Cấp Bậc: Thợ Rèn Bậc Cao';
      newTier = 'Cấp Bậc: Chưởng Quản Lò Luyện';
      newMilestoneTitle = 'Chưởng Quản Lò Luyện';
      titleVi = 'Triệu An thăng tọa Chưởng Quản Lò Luyện Thép Lương Gia';
      narrativeVi = 'Nhờ làm chủ kỹ thuật tôi nguội và tích lũy uy tín vững vàng, Triệu An chính thức đảm nhiệm chức vụ Chưởng Quản phụ trách chất lượng phôi thép toàn xưởng.';
      wageUpdate = 850;
    } else if (npcId === 'NPC-0001' && prog.personal_troops >= 120 && prog.prestige >= 250 && prog.milestone_title !== 'Nghĩa Quân Thống Soái') {
      shiftCategory = 'WARLORD_COMMISSION';
      oldRole = 'HISTORICAL';
      newRole = 'HEGEMON_COMMANDER';
      oldTier = 'Cấp Bậc: Hào Kiệt Áo Vải';
      newTier = 'Cấp Bậc: Nghĩa Quân Thống Soái';
      newMilestoneTitle = 'Nghĩa Quân Thống Soái';
      titleVi = 'Lưu Bị đăng đàn thụ phong: Vạn dân suy tôn Nghĩa Quân Thống Soái';
      narrativeVi = 'Lưu Bị chiêu tập hơn trăm tráng sĩ dũng lược, lập nên quân đoàn nghĩa dũng thanh thế lừng lẫy, chuẩn bị xuất sư bình định giặc Khăn Vàng.';
    }

    if (!shiftCategory) return null;

    const shiftId = `SFT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const consequences = { newRole, wageUpdate, newMilestoneTitle };

    this.runSqlRaw(`
      INSERT INTO npc_career_shifts (shift_id, npc_id, turn_number, game_date, shift_category, old_tier, new_tier, old_role, new_role, title_vi, narrative_vi, consequences_json)
      VALUES ('${shiftId}', '${npcId}', ${turnNumber}, '${gameDate}', '${shiftCategory}', '${oldTier}', '${newTier}', '${oldRole}', '${newRole}',
              '${titleVi.replace(/'/g, "''")}', '${narrativeVi.replace(/'/g, "''")}', '${JSON.stringify(consequences).replace(/'/g, "''")}');

      UPDATE npc_personal_progression
      SET milestone_title = '${newMilestoneTitle}'
      WHERE npc_id = '${npcId}';
    `);

    if (wageUpdate > 0) {
      this.runSqlRaw(`
        UPDATE npc_state
        SET assigned_role = '${newRole}', monthly_wage = ${wageUpdate}
        WHERE npc_id = '${npcId}';
      `);
    }

    const shiftData = { shiftId, npcId, turnNumber, gameDate, shiftCategory, oldTier, newTier, titleVi, narrativeVi };
    this.ctx.eventBus.publish('NPC_CAREER_PARADIGM_SHIFT', shiftData);
    return shiftData;
  }

  /**
   * Simulates dynamic cross-NPC interactions (Peer-to-Peer Bonds, Synergy & Rivalry)
   */
  public simulateCrossNpcInteractions(turnNumber: number, gameDate: string): any[] {
    const peerPairs: Array<{
      idA: string;
      idB: string;
      affinity: number;
      respect: number;
      relationType: string;
      notesVi: string;
    }> = [
      {
        idA: 'NPC-0002',
        idB: 'NPC-0003',
        affinity: 98,
        respect: 96,
        relationType: 'SWORN_BROTHERS',
        notesVi: 'Quan Vũ và Trương Phi cùng giao lưu võ nghệ tại đào viên, đao mâu tung hoành, tâm ý tương thông, thề cùng sinh tử.'
      },
      {
        idA: 'NPC-0001',
        idB: 'NPC-0002',
        affinity: 95,
        respect: 98,
        relationType: 'SWORN_BROTHERS',
        notesVi: 'Lưu Bị đàm đạo đại nghĩa phục hưng Hán thất cùng Quan Vũ dưới đêm trăng, Quan Vũ chắp tay nguyện đem cả tính mạng phò tá.'
      },
      {
        idA: 'NPC-0007',
        idB: 'NPC-0008',
        affinity: 82,
        respect: 85,
        relationType: 'COMRADES',
        notesVi: 'Trần Bảo chia sẻ bí quyết trui phôi thép nguội cho Triệu An, hai người thức trắng đêm hoàn thiện dây chuyền rèn, kết làm tri kỷ thợ rèn.'
      },
      {
        idA: 'NPC-0009',
        idB: 'NPC-0010',
        affinity: 72,
        respect: 60,
        relationType: 'COMRADES',
        notesVi: 'Hà Đại giúp Thẩm Phúc khiêng gỗ vác củi tại kho dệt, Thẩm Phúc tặng Hà Đại tấm vải mây ấm áp, tình nghĩa xưởng thợ đậm đà.'
      }
    ];

    const results = [];
    for (const p of peerPairs) {
      const pairKey = p.idA < p.idB ? `${p.idA}:${p.idB}` : `${p.idB}:${p.idA}`;
      const id = `PEER-${pairKey}`;
      const history = JSON.stringify([{ turnNumber, gameDate, notes: p.notesVi }]);

      this.runSqlRaw(`
        INSERT INTO npc_peer_relations (id, npc_id_a, npc_id_b, affinity, respect, relation_type, interaction_history_json)
        VALUES ('${id}', '${p.idA}', '${p.idB}', ${p.affinity}, ${p.respect}, '${p.relationType}', '${history.replace(/'/g, "''")}')
        ON CONFLICT(npc_id_a, npc_id_b) DO UPDATE SET
          affinity = ${p.affinity},
          respect = ${p.respect},
          relation_type = '${p.relationType}',
          interaction_history_json = '${history.replace(/'/g, "''")}',
          updated_at = CURRENT_TIMESTAMP;
      `);
      results.push({ id, ...p });
    }

    this.ctx.eventBus.publish('CROSS_NPC_INTERACTIONS_SIMULATED', { turnNumber, gameDate, results });
    return results;
  }

  /**
   * Advances autonomous progression for all registered active NPCs
   */
  public simulateAllActiveNpcs(turnNumber: number, gameDate: string): NpcJourneyLog[] {
    const list = this.runSql(`SELECT npc_id FROM npc_personal_progression;`);
    const logs: NpcJourneyLog[] = [];

    for (const row of list) {
      const log = this.simulateNpcTurn(row.npc_id, turnNumber, gameDate);
      if (log) logs.push(log);
    }

    // Also simulate peer relationships between NPCs
    this.simulateCrossNpcInteractions(turnNumber, gameDate);

    return logs;
  }

  /**
   * Queries career paradigm shifts
   */
  public getCareerShifts(npcId?: CharacterId, limit = 20): any[] {
    const where = npcId ? `WHERE s.npc_id = '${npcId}'` : '';
    return this.runSql(`
      SELECT s.*, coalesce(n.name, m.name_vi, s.npc_id) as npc_name
      FROM npc_career_shifts s
      LEFT JOIN npc_state n ON s.npc_id = n.npc_id
      LEFT JOIN master_characters m ON s.npc_id = m.npc_id
      ${where}
      ORDER BY s.rowid DESC
      LIMIT ${limit};
    `);
  }

  /**
   * Queries cross-NPC peer relationships
   */
  public getPeerRelations(npcId?: CharacterId): any[] {
    const where = npcId ? `WHERE p.npc_id_a = '${npcId}' OR p.npc_id_b = '${npcId}'` : '';
    return this.runSql(`
      SELECT p.*,
             coalesce(na.name, ma.name_vi, p.npc_id_a) as name_a,
             coalesce(nb.name, mb.name_vi, p.npc_id_b) as name_b
      FROM npc_peer_relations p
      LEFT JOIN npc_state na ON p.npc_id_a = na.npc_id
      LEFT JOIN master_characters ma ON p.npc_id_a = ma.npc_id
      LEFT JOIN npc_state nb ON p.npc_id_b = nb.npc_id
      LEFT JOIN master_characters mb ON p.npc_id_b = mb.npc_id
      ${where}
      ORDER BY p.affinity DESC;
    `);
  }

  /**
   * Queries journey history logs
   */
  public getJourneyLogs(npcId?: CharacterId, limit = 20): NpcJourneyLog[] {
    const where = npcId ? `WHERE j.npc_id = '${npcId}'` : '';
    const rows = this.runSql(`
      SELECT j.*, coalesce(n.name, m.name_vi, j.npc_id) as npc_name
      FROM npc_journey_logs j
      LEFT JOIN npc_state n ON j.npc_id = n.npc_id
      LEFT JOIN master_characters m ON j.npc_id = m.npc_id
      ${where}
      ORDER BY j.rowid DESC
      LIMIT ${limit};
    `);

    return rows.map(r => ({
      id: r.id,
      npcId: r.npc_id,
      npcName: r.npc_name,
      turnNumber: r.turn_number,
      gameDate: r.game_date,
      actionType: r.action_type,
      titleVi: r.title_vi,
      narrativeVi: r.narrative_vi,
      statChanges: r.stat_changes_json ? JSON.parse(r.stat_changes_json) : {},
      createdAt: r.created_at
    }));
  }

  /**
   * Queries personal progression stats for all or a specific NPC
   */
  public getProgressionOverview(): any[] {
    return this.runSql(`
      SELECT p.*, coalesce(n.name, m.name_vi, p.npc_id) as npc_name,
             coalesce(n.assigned_role, 'HISTORICAL') as role,
             coalesce(n.war_attr, m.war_attr, 50) as war_attr,
             coalesce(n.int_attr, m.int_attr, 50) as int_attr
      FROM npc_personal_progression p
      LEFT JOIN npc_state n ON p.npc_id = n.npc_id
      LEFT JOIN master_characters m ON p.npc_id = m.npc_id
      ORDER BY p.prestige DESC;
    `);
  }
}
