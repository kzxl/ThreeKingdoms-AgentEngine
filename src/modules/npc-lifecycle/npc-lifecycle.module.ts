/**
 * Feature Module: NPC Autonomous Lifecycle & Progression Journey
 * Implements a dynamic, living world where every NPC pursues their own ambitions,
 * accumulates personal wealth, masters skills, recruits personal troops, and generates historical milestones.
 */

import { DatabaseService } from '../../core/database';
import { nextId } from '../../shared/id-generator';
import { getGameDate } from '../../shared/game-clock';
import { isTurnModuleDone, markTurnModuleDone } from '../../shared/turn-ledger';
import { IFeatureModule, ModuleContext, CharacterId, UtilityActionCandidate } from '../../core/types';
import { ModuleRegistry } from '../../core/module-registry';
import { UtilityAiModule, UtilityCurveEvaluator } from '../utility-ai/utility-ai.module';

function getTurnDeterministicRoll(turnNumber: number, npcId: string, salt = 0): number {
  let hash = ((turnNumber * 10007) + (salt * 1337)) >>> 0;
  for (let i = 0; i < npcId.length; i++) {
    hash = ((hash << 5) - hash + npcId.charCodeAt(i)) >>> 0;
  }
  return (hash % 10000) / 10000;
}

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
  private db!: DatabaseService;
  private lastSimulatedTurn = -1;

  public init(ctx: ModuleContext): void {
    this.ctx = ctx;
    this.db = DatabaseService.getInstance(ctx.dbPath);
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
    const existing = this.db.query<{ npc_id: string }>(`SELECT npc_id FROM npc_personal_progression;`);
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
      { npcId: 'NPC-0001', ambition: 'HEGEMON_UNIFIER', focus: 'Chiêu tập nghĩa dũng', cash: 2500, prestige: 2500, troops: 120, title: 'Hán Thất Tông Thân' },
      { npcId: 'NPC-0002', ambition: 'RIGHTEOUS_VANGUARD', focus: 'Luyện đao & Nghiên cứu Xuân Thu', cash: 1200, prestige: 2100, troops: 50, title: 'Uy Chấn U Châu' },
      { npcId: 'NPC-0003', ambition: 'LOYAL_BROTHERHOOD', focus: 'Rèn đúc xà mâu & Tiễu phỉ', cash: 3000, prestige: 1900, troops: 80, title: 'Vạn Nhân Địch' },
      { npcId: 'NPC-0007', ambition: 'MASTER_ARTISAN', focus: 'Quy chuẩn hóa dây chuyền rèn', cash: 1800, prestige: 850, troops: 0, title: 'Lương Gia Chưởng Sự' },
      { npcId: 'NPC-0008', ambition: 'MASTER_ARTISAN', focus: 'Nghiên cứu nhiệt luyện lưỡi kiếm', cash: 900, prestige: 600, troops: 0, title: 'Đại Tượng Sư Rèn' },
      { npcId: 'NPC-0009', ambition: 'DEVOTED_RETAINER', focus: 'Tích lũy lương bạc gia đình', cash: 450, prestige: 350, troops: 0, title: 'Thợ Dệt Chăm Chỉ' },
      { npcId: 'NPC-0010', ambition: 'DEVOTED_RETAINER', focus: 'Luyện tập côn bổng phòng vệ', cash: 520, prestige: 400, troops: 0, title: 'Dũng Lực Mộc Tượng' }
    ];

    this.db.transaction(() => {
      for (const b of defaultNpcBaselines) {
        if (!existingIds.has(b.npcId)) {
          this.db.execute(`
            INSERT INTO npc_personal_progression (npc_id, life_ambition, current_focus, personal_cash, prestige, personal_troops, milestone_title)
            VALUES (?, ?, ?, ?, ?, ?, ?);
          `, [b.npcId, b.ambition, b.focus, b.cash, b.prestige, b.troops, b.title]);
        }
      }
    });
  }

  /**
   * Simulates a personal monthly action and growth cycle for a single NPC
   */
  public simulateNpcTurn(npcId: CharacterId, turnNumber: number, gameDate: string): NpcJourneyLog | null {
    // 1. Fetch current progression state
    let prog = this.db.queryOne<any>(`SELECT * FROM npc_personal_progression WHERE npc_id = ?;`, [npcId]);
    if (!prog) {
      this.ensureBaselineProgressions();
      prog = this.db.queryOne<any>(`SELECT * FROM npc_personal_progression WHERE npc_id = ?;`, [npcId]);
      if (!prog) return null;
    }

    // 2. Fetch NPC info
    const charRows = this.db.query<any>(`
      SELECT coalesce(n.name, m.name_vi, ?) as name,
             coalesce(n.war_attr, m.war_attr, 50) as war_attr,
             coalesce(n.int_attr, m.int_attr, 50) as int_attr,
             coalesce(n.cra_attr, m.cra_attr, 50) as cra_attr,
             coalesce(n.com_attr, m.com_attr, 50) as com_attr
      FROM (SELECT ? as target_id)
      LEFT JOIN npc_state n ON target_id = n.npc_id
      LEFT JOIN master_characters m ON target_id = m.npc_id;
    `, [npcId, npcId]);
    const npc = charRows[0] || { name: npcId, war_attr: 50, int_attr: 50, cra_attr: 50, com_attr: 50 };

    // 3. Evaluate candidate actions with Continuous Utility AI & BDI Priors
    const utilityAi = ModuleRegistry.getInstance().get<UtilityAiModule>('module.utility-ai') || new UtilityAiModule();

    // Check bandit plunder availability
    const topStronghold = this.db.queryOne<any>(`
      SELECT stronghold_id, name_vi, plundered_wealth, bounty_reward
      FROM bandit_strongholds
      WHERE status = 'ACTIVE' AND plundered_wealth > 0
      ORDER BY plundered_wealth DESC
      LIMIT 1;
    `);

    const martialAffinity = (prog.life_ambition === 'RIGHTEOUS_VANGUARD' || prog.life_ambition === 'LOYAL_BROTHERHOOD') ? 1.4 : 0.6;
    const craftAffinity = prog.life_ambition === 'MASTER_ARTISAN' ? 1.8 : 0.2;
    const scholarAffinity = (prog.life_ambition === 'HEGEMON_UNIFIER' || prog.life_ambition === 'SCHOLAR_STATESMAN') ? 1.6 : 0.4;
    const commerceAffinity = prog.life_ambition === 'COMMERCE_TYCOON' ? 1.7 : 0.8;

    const candidates: UtilityActionCandidate[] = [
      {
        id: 'MARTIAL_DRILL',
        actionType: 'PATROL',
        weight: 1.0,
        considerations: [
          { name: 'WarAptitude', rawInput: npc.war_attr, score: UtilityCurveEvaluator.evaluateLinear(npc.war_attr, 20, 100) },
          { name: 'AmbitionFit', rawInput: martialAffinity, score: martialAffinity }
        ],
        compositeScore: UtilityCurveEvaluator.computeCompositeScore([
          UtilityCurveEvaluator.evaluateLinear(npc.war_attr, 20, 100),
          martialAffinity
        ])
      },
      {
        id: 'BANDIT_EXPEDITION',
        actionType: 'MARCH',
        weight: 1.0,
        considerations: [
          { name: 'ExpeditionPower', rawInput: npc.war_attr + (prog.personal_troops || 0), score: UtilityCurveEvaluator.evaluateLinear(npc.war_attr + (prog.personal_troops || 0), 40, 150) },
          { name: 'PlunderOpportunity', rawInput: topStronghold?.plundered_wealth || 0, score: topStronghold ? 0.9 : 0.2 },
          { name: 'AmbitionFit', rawInput: martialAffinity, score: martialAffinity }
        ],
        compositeScore: UtilityCurveEvaluator.computeCompositeScore([
          UtilityCurveEvaluator.evaluateLinear(npc.war_attr + (prog.personal_troops || 0), 40, 150),
          topStronghold ? 0.9 : 0.2,
          martialAffinity
        ])
      },
      {
        id: 'CRAFT_BREAKTHROUGH',
        actionType: 'CRAFT',
        weight: 1.0,
        considerations: [
          { name: 'CraftAptitude', rawInput: npc.cra_attr, score: UtilityCurveEvaluator.evaluateLinear(npc.cra_attr, 20, 100) },
          { name: 'AmbitionFit', rawInput: craftAffinity, score: craftAffinity }
        ],
        compositeScore: UtilityCurveEvaluator.computeCompositeScore([
          UtilityCurveEvaluator.evaluateLinear(npc.cra_attr, 20, 100),
          craftAffinity
        ])
      },
      {
        id: 'STRATEGY_STUDY',
        actionType: 'STUDY',
        weight: 1.0,
        considerations: [
          { name: 'IntAptitude', rawInput: npc.int_attr, score: UtilityCurveEvaluator.evaluateLinear(npc.int_attr, 20, 100) },
          { name: 'AmbitionFit', rawInput: scholarAffinity, score: scholarAffinity }
        ],
        compositeScore: UtilityCurveEvaluator.computeCompositeScore([
          UtilityCurveEvaluator.evaluateLinear(npc.int_attr, 20, 100),
          scholarAffinity
        ])
      },
      {
        id: 'COMMERCE_ARBITRAGE',
        actionType: 'TRADE',
        weight: 1.0,
        considerations: [
          { name: 'ComAptitude', rawInput: npc.com_attr, score: UtilityCurveEvaluator.evaluateLinear(npc.com_attr, 20, 100) },
          { name: 'CashNeed', rawInput: prog.personal_cash, score: UtilityCurveEvaluator.evaluateLogistic(prog.personal_cash, 500, -0.005) },
          { name: 'AmbitionFit', rawInput: commerceAffinity, score: commerceAffinity }
        ],
        compositeScore: UtilityCurveEvaluator.computeCompositeScore([
          UtilityCurveEvaluator.evaluateLinear(npc.com_attr, 20, 100),
          UtilityCurveEvaluator.evaluateLogistic(prog.personal_cash, 500, -0.005),
          commerceAffinity
        ])
      }
    ];

    const chosenCandidate = utilityAi.selectBestAction(npcId, candidates, prog.current_focus) || candidates[0];
    const actionType: NpcActionType = chosenCandidate.id as NpcActionType;

    let titleVi = '';
    let narrativeVi = '';
    const statChanges: Record<string, number | string> = {};

    switch (actionType) {
      case 'MARTIAL_DRILL': {
        titleVi = `${npc.name} dốc lòng khổ luyện võ nghệ`;
        narrativeVi = `Tại bãi tập, ${npc.name} ngày đêm mài giũa thương pháp, khí thế bức người, uy lực chiêu thức gia tăng đáng kể.`;
        statChanges['war_exp'] = '+15 EXP';
        statChanges['morale'] = '+5';
        break;
      }

      case 'BANDIT_EXPEDITION': {
        const rollBounty = getTurnDeterministicRoll(turnNumber, npcId, 2);
        const rollTroops = getTurnDeterministicRoll(turnNumber, npcId, 3);
        let bounty = Math.floor(150 + rollBounty * 200);
        const recruited = Math.floor(5 + rollTroops * 10);

        if (topStronghold && topStronghold.plundered_wealth > 0) {
          bounty = Math.min(topStronghold.plundered_wealth, bounty);
          this.db.execute(`
            UPDATE bandit_strongholds 
            SET plundered_wealth = MAX(0, plundered_wealth - ?) 
            WHERE stronghold_id = ?;
          `, [bounty, topStronghold.stronghold_id]);
        }

        titleVi = `${npc.name} dẫn binh tiễu trừ sơn tặc phụ cận`;
        narrativeVi = `${npc.name} tự dẫn bộ hạ đột kích sào huyệt sơn tặc, trảm tướng cướp, thu được ${bounty} Quan chiến lợi phẩm và thu phục ${recruited} tráng đinh tình nguyện gia nhập.`;
        statChanges['personal_cash'] = `+${bounty} Quan`;
        statChanges['personal_troops'] = `+${recruited} Dũng sĩ`;
        statChanges['prestige'] = '+150 Danh vọng';
        prog.personal_cash += bounty;
        prog.personal_troops += recruited;
        prog.prestige += 150;
        break;
      }

      case 'CRAFT_BREAKTHROUGH': {
        titleVi = `${npc.name} cải tiến kỹ nghệ chế tác`;
        narrativeVi = `Sau nhiều đêm thử nghiệm, ${npc.name} tinh chỉnh thành công phương pháp trui rèn vật liệu, giúp nâng cao độ bền và giảm hao mòn sản phẩm.`;
        statChanges['craft_exp'] = '+20 EXP';
        statChanges['prestige'] = '+100 Danh vọng';
        prog.prestige += 100;
        break;
      }

      case 'STRATEGY_STUDY': {
        titleVi = `${npc.name} luận bàn thế cục & nghiên cứu binh pháp`;
        narrativeVi = `${npc.name} tiếp kiến các danh sĩ địa phương, phân tích cục diện khởi nghĩa Khăn Vàng, hoạch định phương lược cứu dân giúp nước.`;
        statChanges['int_exp'] = '+15 EXP';
        statChanges['prestige'] = '+200 Danh vọng';
        prog.prestige += 200;
        break;
      }

      case 'COMMERCE_ARBITRAGE':
      default: {
        const rollCash = getTurnDeterministicRoll(turnNumber, npcId, 4);
        const earned = Math.floor(80 + rollCash * 120);
        titleVi = `${npc.name} tham gia giao thương tích lũy`;
        narrativeVi = `Tận dụng ngày nghỉ tại thị trấn, ${npc.name} thực hiện giao lưu trao đổi hàng hóa vật phẩm, thu thêm ${earned} Quan vào tài sản riêng.`;
        statChanges['personal_cash'] = `+${earned} Quan`;
        prog.personal_cash += earned;
        break;
      }
    }

    // 4. Save Journey Log
    const logId = `JRN-${gameDate.replace(/-/g, '')}-${npcId}-${turnNumber}`;
    const log: NpcJourneyLog = {
      id: logId,
      npcId,
      turnNumber,
      gameDate,
      actionType,
      titleVi,
      narrativeVi,
      statChanges,
      createdAt: `${gameDate}T00:00:00.000Z`
    };

    this.db.transaction(() => {
      this.db.execute(`
        INSERT OR REPLACE INTO npc_journey_logs (id, npc_id, turn_number, game_date, action_type, title_vi, narrative_vi, stat_changes_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `, [log.id, log.npcId, log.turnNumber, log.gameDate, log.actionType, log.titleVi, log.narrativeVi, JSON.stringify(log.statChanges)]);

      this.db.execute(`
        UPDATE npc_personal_progression
        SET personal_cash = ?,
            prestige = ?,
            personal_troops = ?,
            current_focus = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE npc_id = ?;
      `, [prog.personal_cash, prog.prestige, prog.personal_troops, actionType, npcId]);
    });

    // 5. Publish to EventBus
    this.ctx.eventBus.publish('NPC_JOURNEY_STEP_COMPLETED', log);

    // 6. Check Career Paradigm Shift (Đột phá thân phận)
    this.checkAndExecuteCareerShift(npcId, turnNumber, gameDate, prog);

    // 7. Check Emergent Rival Workshop Founding
    this.checkAndFoundEmergentWorkshop(npcId, prog, npc, turnNumber, gameDate);

    return log;
  }

  /**
   * Checks and executes emergent workshop founding when an artisan/merchant accumulates wealth
   */
  public checkAndFoundEmergentWorkshop(
    npcId: CharacterId,
    prog: any,
    npc: any,
    turnNumber: number,
    gameDate: string
  ): any | null {
    if (prog.personal_cash >= 3000 && (prog.life_ambition === 'COMMERCE_TYCOON' || prog.life_ambition === 'MASTER_ARTISAN')) {
      const bizId = `BIZ-RIVAL-${npcId}`;
      const existing = this.db.queryOne<any>(`SELECT business_id FROM businesses WHERE business_id = ?;`, [bizId]);
      if (!existing) {
        const initialCapital = 1500;
        prog.personal_cash -= initialCapital;

        this.db.transaction(() => {
          this.db.execute(`UPDATE npc_personal_progression SET personal_cash = ? WHERE npc_id = ?;`, [prog.personal_cash, npcId]);

          this.db.execute(`
            INSERT OR REPLACE INTO businesses 
            (business_id, name, location_id, manager_npc_id, safe_cash, delegation_level, efficiency_multiplier, current_workforce, monthly_capacity_hours, monthly_rent, auto_procure, status)
            VALUES (?, ?, 'LOC-0001', ?, ?, 2, 1.0, 3, 600, 150, 1, 'ACTIVE');
          `, [bizId, `Thương Hào ${npc.name}`, npcId, initialCapital]);

          this.db.execute(`UPDATE npc_state SET assigned_business_id = ? WHERE npc_id = ?;`, [bizId, npcId]);
        });

        const bizData = { businessId: bizId, founderId: npcId, founderName: npc.name, initialCapital, turnNumber, gameDate };
        this.ctx.eventBus.publish('EMERGENT_WORKSHOP_FOUNDED', bizData);
        return bizData;
      }
    }
    return null;
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

    if (npcId === 'NPC-0007' && prog.prestige >= 900 && prog.personal_cash >= 1800 && prog.milestone_title !== 'U Châu Thần Tượng Sư') {
      shiftCategory = 'MASTERWORK_ELEVATION';
      oldRole = 'FOREMAN';
      newRole = 'CHIEF_ARTISAN_PARTNER';
      oldTier = 'Cấp Bậc: Quản Đốc';
      newTier = 'Cấp Bậc: Đại Tượng Sư Đối Tác';
      newMilestoneTitle = 'U Châu Thần Tượng Sư';
      titleVi = 'Trần Bảo đột phá thân phận: Thăng tọa Đại Tượng Sư U Châu';
      narrativeVi = 'Tích lũy đủ 1,800 Quan riêng và danh tiếng vang dội, Trần Bảo hoàn thiện phương pháp rèn bí truyền, chính thức được tôn vinh là Đại Tượng Sư bậc thầy của xưởng Lương Gia.';
      wageUpdate = 1000;
    } else if (npcId === 'NPC-0003' && prog.personal_troops >= 80 && prog.prestige >= 1900 && prog.milestone_title !== 'Biệt Đội Tư Mã') {
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
    } else if (npcId === 'NPC-0001' && prog.personal_troops >= 120 && prog.prestige >= 2500 && prog.milestone_title !== 'Nghĩa Quân Thống Soái') {
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

    const shiftId = nextId(this.db, 'career-shift', 'SFT', getGameDate(this.db));
    const consequences = { newRole, wageUpdate, newMilestoneTitle };

    this.db.transaction(() => {
      this.db.execute(`
        INSERT INTO npc_career_shifts (shift_id, npc_id, turn_number, game_date, shift_category, old_tier, new_tier, old_role, new_role, title_vi, narrative_vi, consequences_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `, [shiftId, npcId, turnNumber, gameDate, shiftCategory, oldTier, newTier, oldRole, newRole, titleVi, narrativeVi, JSON.stringify(consequences)]);

      this.db.execute(`
        UPDATE npc_personal_progression
        SET milestone_title = ?
        WHERE npc_id = ?;
      `, [newMilestoneTitle, npcId]);

      if (wageUpdate > 0) {
        this.db.execute(`
          UPDATE npc_state
          SET assigned_role = ?, monthly_wage = ?
          WHERE npc_id = ?;
        `, [newRole, wageUpdate, npcId]);
      }
    });

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

    const results: any[] = [];
    this.db.transaction(() => {
      for (const p of peerPairs) {
        const pairKey = p.idA < p.idB ? `${p.idA}:${p.idB}` : `${p.idB}:${p.idA}`;
        const id = `PEER-${pairKey}`;
        const history = JSON.stringify([{ turnNumber, gameDate, notes: p.notesVi }]);

        this.db.execute(`
          INSERT INTO npc_peer_relations (id, npc_id_a, npc_id_b, affinity, respect, relation_type, interaction_history_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(npc_id_a, npc_id_b) DO UPDATE SET
            affinity = excluded.affinity,
            respect = excluded.respect,
            relation_type = excluded.relation_type,
            interaction_history_json = excluded.interaction_history_json,
            updated_at = CURRENT_TIMESTAMP;
        `, [id, p.idA, p.idB, p.affinity, p.respect, p.relationType, history]);
        results.push({ id, ...p });
      }
    });

    this.ctx.eventBus.publish('CROSS_NPC_INTERACTIONS_SIMULATED', { turnNumber, gameDate, results });
    return results;
  }

  /**
   * Advances autonomous progression for all registered active NPCs
   */
  public simulateAllActiveNpcs(turnNumber: number, gameDate: string): NpcJourneyLog[] {
    if (isTurnModuleDone(this.db, turnNumber, this.id)) {
      return this.getJourneyLogs(undefined, 10);
    }

    const logs: NpcJourneyLog[] = [];
    // One transaction for the whole turn: if any NPC fails, no partial world
    // state is committed and the turn can be retried.
    this.db.transaction(() => {
      const list = this.db.query<{ npc_id: string }>(`SELECT npc_id FROM npc_personal_progression;`);

      for (const row of list) {
        const log = this.simulateNpcTurn(row.npc_id, turnNumber, gameDate);
        if (log) logs.push(log);
      }

      // Also simulate peer relationships between NPCs
      this.simulateCrossNpcInteractions(turnNumber, gameDate);
    });

    markTurnModuleDone(this.db, turnNumber, this.id);
    this.lastSimulatedTurn = turnNumber;

    return logs;
  }

  /**
   * Queries career paradigm shifts
   */
  public getCareerShifts(npcId?: CharacterId, limit = 20): any[] {
    const where = npcId ? `WHERE s.npc_id = ?` : '';
    const params = npcId ? [npcId, limit] : [limit];
    return this.db.query(`
      SELECT s.*, coalesce(n.name, m.name_vi, s.npc_id) as npc_name
      FROM npc_career_shifts s
      LEFT JOIN npc_state n ON s.npc_id = n.npc_id
      LEFT JOIN master_characters m ON s.npc_id = m.npc_id
      ${where}
      ORDER BY s.rowid DESC
      LIMIT ?;
    `, params);
  }

  /**
   * Queries cross-NPC peer relationships
   */
  public getPeerRelations(npcId?: CharacterId): any[] {
    const where = npcId ? `WHERE p.npc_id_a = ? OR p.npc_id_b = ?` : '';
    const params = npcId ? [npcId, npcId] : [];
    return this.db.query(`
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
    `, params);
  }

  /**
   * Queries journey history logs
   */
  public getJourneyLogs(npcId?: CharacterId, limit = 20): NpcJourneyLog[] {
    const where = npcId ? `WHERE j.npc_id = ?` : '';
    const params = npcId ? [npcId, limit] : [limit];
    const rows = this.db.query<any>(`
      SELECT j.*, coalesce(n.name, m.name_vi, j.npc_id) as npc_name
      FROM npc_journey_logs j
      LEFT JOIN npc_state n ON j.npc_id = n.npc_id
      LEFT JOIN master_characters m ON j.npc_id = m.npc_id
      ${where}
      ORDER BY j.rowid DESC
      LIMIT ?;
    `, params);

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
    return this.db.query(`
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
