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
    return log;
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

    return logs;
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
