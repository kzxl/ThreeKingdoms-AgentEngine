/**
 * Feature Module: Faction Politics, Dynastic Lineage & Loyalty/Coup System
 * Implements Grand Strategy factional politics, governor appointments,
 * ambition vs loyalty tension, betrayal risk calculation, and emergent coups/secessions.
 *
 * Adheres to AgentOption Universe Modular Architecture v4.0.
 */

import { DatabaseService } from '../../core/database';
import {
  IFeatureModule,
  ModuleContext,
  FactionId,
  SettlementId,
  CharacterId,
  CourtRank,
  FactionIdeology,
  FactionState,
  FactionOfficerState,
  FactionPoliticalEvent
} from '../../core/types';

export class FactionPoliticsModule implements IFeatureModule {
  public readonly id = 'module.faction-politics';
  public readonly name = 'Faction Politics, Dynastic Lineage & Loyalty/Coup System';
  public readonly version = '1.0.0';

  private ctx!: ModuleContext;
  private db!: DatabaseService;

  public async init(ctx: ModuleContext): Promise<void> {
    this.ctx = ctx;
    this.db = DatabaseService.getInstance(ctx.dbPath);
    this.ensureTablesAndSeedData();

    // Subscribe to turn changes or world ticks
    this.ctx.eventBus.subscribe('TURN_ADVANCED', async (payload: any) => {
      const turnNumber = payload?.turnNumber || 1;
      const gameDate = payload?.gameDate || '184-02-15';
      this.simulatePoliticalCycle(turnNumber, gameDate);
    });
  }

  private ensureTablesAndSeedData(): void {
    // 1. Check factions count
    const factionCount = this.db.queryOne<{ count: number }>(`SELECT count(*) as count FROM session_factions;`)?.count || 0;
    if (factionCount === 0) {
      this.seedInitialFactions();
    }

    // 2. Check settlements count
    const settlementCount = this.db.queryOne<{ count: number }>(`SELECT count(*) as count FROM session_settlements;`)?.count || 0;
    if (settlementCount === 0) {
      this.seedInitialSettlements();
    }

    // 3. Check officers count
    const officerCount = this.db.queryOne<{ count: number }>(`SELECT count(*) as count FROM faction_officers;`)?.count || 0;
    if (officerCount === 0) {
      this.seedInitialOfficers();
    }
  }

  private seedInitialFactions(): void {
    const seedSql = `
      INSERT OR REPLACE INTO session_factions (faction_id, name_vi, name_en, leader_id, capital_settlement_id, treasury_cash, granary_grain, military_power, prestige, ideology, color_hex) VALUES
      ('FAC-LIANG-CLAN', 'Lương Thị Thương Bang', 'Liang Merchant League', 'PLY-0001', 'zhuo_xian', 25000, 800.0, 150, 120, 'MERCHANT_GUILD', '#10b981'),
      ('FAC-LIU-BEI', 'Trác Huyện Nghĩa Quân', 'Liu Bei Righteous Militia', 'NPC-0001', 'zhuo_xian', 6000, 450.0, 320, 140, 'ROYALIST', '#16a34a'),
      ('FAC-GONGSUN-ZAN', 'Bắc Bình Bạch Mã Quân', 'Gongsun Zan White Horse Host', 'NPC-0060', 'ji_cheng', 45000, 2500.0, 1800, 220, 'WARLORD', '#0284c7'),
      ('FAC-YUAN-SHAO', 'Hà Bắc Thế Tộc Viên Thị', 'Yuan Clan of Hebei', 'NPC-0018', 'ye_cheng', 120000, 6000.0, 3500, 320, 'WARLORD', '#7c3aed'),
      ('FAC-YELLOW-TURBAN', 'Thái Bình Đạo Khăn Vàng', 'Yellow Turban Host', 'NPC-0004', 'guang_zong', 35000, 4200.0, 8000, 190, 'REBEL', '#eab308'),
      ('FAC-HAN', 'Đại Hán Triều Đình', 'Eastern Han Imperial Court', 'NPC-0012', 'luo_yang', 250000, 15000.0, 12000, 450, 'ROYALIST', '#dc2626');
    `;
    this.db.execute(seedSql);
  }

  private seedInitialSettlements(): void {
    const seedSql = `
      INSERT OR REPLACE INTO session_settlements (settlement_id, name_vi, name_en, province_vi, province_en, ruler_faction_id, governor_id, public_order, garrison_troops, agriculture, commerce, defense) VALUES
      ('zhuo_xian', 'Trác Huyện', 'Zhuo County', 'U Châu', 'Youzhou', 'FAC-LIANG-CLAN', 'NPC-0001', 85, 300, 65, 75, 70),
      ('ji_cheng', 'Kế Thành & Bắc Bình', 'Jicheng & Beiping', 'U Châu', 'Youzhou', 'FAC-GONGSUN-ZAN', 'NPC-0060', 78, 1200, 60, 55, 80),
      ('ye_cheng', 'Nghiệp Thành', 'Yecheng', 'Ký Châu', 'Jizhou', 'FAC-YUAN-SHAO', 'NPC-0018', 80, 2500, 85, 80, 85),
      ('guang_zong', 'Quảng Tông', 'Guangzong', 'Ký Châu', 'Jizhou', 'FAC-YELLOW-TURBAN', 'NPC-0004', 45, 4500, 40, 30, 60),
      ('ping_yuan', 'Bình Nguyên', 'Pingyuan', 'Thanh Châu', 'Qingzhou', 'FAC-HAN', NULL, 60, 600, 65, 60, 65),
      ('luo_yang', 'Lạc Dương', 'Luoyang', 'Tư Lệ', 'Sili', 'FAC-HAN', 'NPC-0012', 85, 8000, 90, 95, 95),
      ('xu_chang', 'Hứa Xương', 'Xuchang', 'Dự Châu', 'Yuzhou', 'FAC-HAN', NULL, 75, 1500, 75, 70, 75),
      ('changan', 'Trường An', 'Changan', 'Kinh Triệu', 'Jingzhao', 'FAC-HAN', NULL, 70, 3000, 80, 85, 90),
      ('cheng_du', 'Thành Đô', 'Chengdu', 'Ích Châu', 'Yizhou', 'FAC-HAN', NULL, 80, 2000, 88, 75, 80),
      ('jian_ye', 'Kiến Nghiệp', 'Jianye', 'Dương Châu', 'Yangzhou', 'FAC-HAN', NULL, 82, 1800, 80, 80, 75),
      ('xiang_yang', 'Tương Dương', 'Xiangyang', 'Kinh Châu', 'Jingzhou', 'FAC-HAN', NULL, 80, 2200, 85, 82, 85),
      ('shou_chun', 'Thọ Xuân', 'Shouchun', 'Hoài Nam', 'Huainan', 'FAC-HAN', NULL, 65, 1400, 70, 68, 70),
      ('he_fei', 'Hợp Phì', 'Hefei', 'Dương Châu', 'Yangzhou', 'FAC-HAN', NULL, 70, 1100, 65, 60, 75),
      ('pu_yang', 'Bộc Dương', 'Puyang', 'Duyện Châu', 'Yanzhou', 'FAC-HAN', NULL, 68, 1300, 72, 70, 70),
      ('wan_cheng', 'Uyển Thành', 'Wancheng', 'Nam Dương', 'Nanyang', 'FAC-YELLOW-TURBAN', NULL, 50, 2000, 60, 55, 65),
      ('xia_pi', 'Hạ Phì', 'Xiapi', 'Từ Châu', 'Xuzhou', 'FAC-HAN', NULL, 75, 1600, 78, 72, 75),
      ('han_zhong', 'Hán Trung', 'Hanzhong', 'Ích Châu Bắc', 'North Yizhou', 'FAC-HAN', NULL, 72, 1200, 70, 60, 85),
      ('wu_ling', 'Vũ Lăng', 'Wuling', 'Kinh Nam', 'South Jingzhou', 'FAC-HAN', NULL, 65, 800, 55, 50, 60);
    `;
    this.db.execute(seedSql);
  }

  private seedInitialOfficers(): void {
    const seedSql = `
      INSERT OR REPLACE INTO faction_officers (officer_id, faction_id, court_rank, loyalty, ambition, appointed_settlement_id, betrayal_risk) VALUES
      ('PLY-0001', 'FAC-LIANG-CLAN', 'RULER', 100, 70, 'zhuo_xian', 0.0),
      ('NPC-0007', 'FAC-LIANG-CLAN', 'OFFICER', 95, 30, NULL, 0.05),
      ('NPC-0008', 'FAC-LIANG-CLAN', 'OFFICER', 90, 35, NULL, 0.08),
      ('NPC-0009', 'FAC-LIANG-CLAN', 'OFFICER', 85, 45, NULL, 0.12),
      ('NPC-0001', 'FAC-LIU-BEI', 'RULER', 100, 92, 'zhuo_xian', 0.0),
      ('NPC-0003', 'FAC-LIU-BEI', 'CHIEF_COMMANDER', 98, 60, NULL, 0.02),
      ('NPC-0002', 'FAC-LIU-BEI', 'GENERAL', 96, 55, NULL, 0.04),
      ('NPC-0060', 'FAC-GONGSUN-ZAN', 'RULER', 100, 85, 'ji_cheng', 0.0),
      ('NPC-0018', 'FAC-YUAN-SHAO', 'RULER', 100, 88, 'ye_cheng', 0.0),
      ('NPC-0004', 'FAC-YELLOW-TURBAN', 'RULER', 100, 95, 'guang_zong', 0.0),
      ('NPC-0012', 'FAC-HAN', 'CHIEF_COMMANDER', 92, 40, 'luo_yang', 0.05);
    `;
    this.db.execute(seedSql);
  }

  /**
   * Recalculates Betrayal Risk dynamically using Grand Strategy mathematical tension formula
   */
  public calculateBetrayalRisk(
    loyalty: number,
    ambition: number,
    factionPrestige: number,
    isGovernor: boolean,
    personalTroops = 0
  ): number {
    const governorBonus = isGovernor ? 25 : 0;
    const troopFactor = Math.min(30, Math.floor(personalTroops / 5));
    const loyaltyPenalty = (100 - loyalty) * 1.8;
    const ambitionFactor = ambition * 1.4;
    const prestigeResistance = factionPrestige * 0.2;

    const score = (ambitionFactor + loyaltyPenalty + governorBonus + troopFactor - prestigeResistance) / 200.0;
    return Math.max(0.0, Math.min(1.0, Math.round(score * 1000) / 1000));
  }

  /**
   * Evaluates all officers and updates betrayal risk in the database
   */
  public recalculateAllOfficerRisks(): void {
    const officers = this.db.query<any>(`
      SELECT 
        fo.officer_id,
        fo.faction_id,
        fo.court_rank,
        fo.loyalty,
        fo.ambition,
        fo.appointed_settlement_id,
        sf.prestige as faction_prestige,
        COALESCE(np.personal_troops, 0) as personal_troops
      FROM faction_officers fo
      JOIN session_factions sf ON fo.faction_id = sf.faction_id
      LEFT JOIN npc_personal_progression np ON fo.officer_id = np.npc_id;
    `);

    this.db.transaction(() => {
      for (const off of officers) {
        if (off.court_rank === 'RULER') {
          this.db.execute(
            `UPDATE faction_officers SET betrayal_risk = 0.0 WHERE officer_id = ? AND faction_id = ?;`,
            [off.officer_id, off.faction_id]
          );
          continue;
        }

        const isGovernor = !!off.appointed_settlement_id;
        const risk = this.calculateBetrayalRisk(
          off.loyalty,
          off.ambition,
          off.faction_prestige || 100,
          isGovernor,
          off.personal_troops || 0
        );

        this.db.execute(
          `UPDATE faction_officers SET betrayal_risk = ?, updated_at = CURRENT_TIMESTAMP WHERE officer_id = ? AND faction_id = ?;`,
          [risk, off.officer_id, off.faction_id]
        );
      }
    });
  }

  /**
   * Retrieves high-level overview of factions, territory and officer strength
   */
  public getFactionOverview(): FactionState[] {
    const factions = this.db.query<any>(`
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
        f.is_active as isActive,
        COUNT(DISTINCT s.settlement_id) as settlementCount,
        COUNT(DISTINCT o.officer_id) as officerCount
      FROM session_factions f
      LEFT JOIN session_settlements s ON f.faction_id = s.ruler_faction_id
      LEFT JOIN faction_officers o ON f.faction_id = o.faction_id
      GROUP BY f.faction_id
      ORDER BY f.prestige DESC;
    `);

    return factions.map(f => ({
      ...f,
      isActive: Boolean(f.isActive)
    }));
  }

  /**
   * Retrieves all officers with status and betrayal tension
   */
  public getOfficers(factionId?: string): any[] {
    const filter = factionId ? `WHERE fo.faction_id = ?` : '';
    const params = factionId ? [factionId] : [];
    const sql = `
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
        COALESCE(np.prestige, 50) as personalPrestige,
        COALESCE(np.personal_troops, 0) as personalTroops
      FROM faction_officers fo
      JOIN session_factions sf ON fo.faction_id = sf.faction_id
      LEFT JOIN session_settlements ss ON fo.appointed_settlement_id = ss.settlement_id
      LEFT JOIN npc_state ns ON fo.officer_id = ns.npc_id
      LEFT JOIN master_characters mc ON fo.officer_id = mc.npc_id
      LEFT JOIN npc_personal_progression np ON fo.officer_id = np.npc_id
      ${filter}
      ORDER BY fo.betrayal_risk DESC;
    `;
    return this.db.query(sql, params);
  }

  /**
   * Retrieves all settlements and control
   */
  public getSettlements(): any[] {
    const sql = `
      SELECT 
        s.settlement_id as settlementId,
        s.name_vi as nameVi,
        s.name_en as nameEn,
        s.province_vi as provinceVi,
        s.ruler_faction_id as rulerFactionId,
        f.name_vi as factionNameVi,
        f.color_hex as factionColor,
        s.governor_id as governorId,
        COALESCE(ns.name, 'Chưa bổ nhiệm') as governorName,
        s.public_order as publicOrder,
        s.garrison_troops as garrisonTroops,
        s.agriculture,
        s.commerce,
        s.defense
      FROM session_settlements s
      JOIN session_factions f ON s.ruler_faction_id = f.faction_id
      LEFT JOIN npc_state ns ON s.governor_id = ns.npc_id
      ORDER BY s.province_vi, s.name_vi;
    `;
    return this.db.query(sql);
  }

  /**
   * Retrieves political event chronicles
   */
  public getPoliticalEvents(limit = 15): FactionPoliticalEvent[] {
    const sql = `
      SELECT 
        event_id as eventId,
        turn_number as turnNumber,
        game_date as gameDate,
        event_type as eventType,
        source_faction_id as sourceFactionId,
        target_faction_id as targetFactionId,
        instigator_officer_id as instigatorOfficerId,
        title_vi as titleVi,
        narrative_vi as narrativeVi,
        consequences_json as consequences
      FROM faction_political_events
      ORDER BY created_at DESC
      LIMIT ?;
    `;
    const rows = this.db.query<any>(sql, [limit]);
    return rows.map(r => ({
      ...r,
      consequences: typeof r.consequences === 'string' ? JSON.parse(r.consequences || '{}') : r.consequences
    }));
  }

  /**
   * Simulates a political cycle: checks tensions, triggers coups/secessions, updates faction treasuries
   */
  public simulatePoliticalCycle(turnNumber: number, gameDate: string): FactionPoliticalEvent[] {
    this.recalculateAllOfficerRisks();

    const events: FactionPoliticalEvent[] = [];

    // Find high-risk officers (> 0.65)
    const disgruntledOfficers = this.db.query<any>(`
      SELECT 
        fo.officer_id,
        fo.faction_id,
        fo.court_rank,
        fo.loyalty,
        fo.ambition,
        fo.appointed_settlement_id,
        fo.betrayal_risk,
        sf.name_vi as faction_name,
        COALESCE(mc.name_vi, ns.name, fo.officer_id) as officer_name,
        COALESCE(ss.name_vi, 'Biên cương') as settlement_name
      FROM faction_officers fo
      JOIN session_factions sf ON fo.faction_id = sf.faction_id
      LEFT JOIN session_settlements ss ON fo.appointed_settlement_id = ss.settlement_id
      LEFT JOIN npc_state ns ON fo.officer_id = ns.npc_id
      LEFT JOIN master_characters mc ON fo.officer_id = mc.npc_id
      WHERE fo.court_rank != 'RULER' AND fo.betrayal_risk >= 0.65;
    `);

    for (const off of disgruntledOfficers) {
      if (off.appointed_settlement_id) {
        // Governor Secession Plot
        const eventId = `EVT-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        const titleVi = `Biến cố Thái thú: ${off.officer_name} Cát Cứ Tại ${off.settlement_name}!`;
        const narrativeVi = `Thái thú ${off.officer_name} nuôi dã tâm lớn, bất mãn với sự điều hành của chúa công ${off.faction_name}. Tận dụng sự kiểm soát tại ${off.settlement_name}, y đã đóng cửa thành trì, tự xưng Tiết Độ Sứ, từ chối nộp thuế khóa và tuyên bố độc lập!`;

        const consequences = {
          secedingOfficer: off.officer_id,
          settlementId: off.appointed_settlement_id,
          statusChange: 'SECESSION_DECLARED',
          loyaltyDrop: -20
        };

        this.db.transaction(() => {
          this.db.execute(
            `INSERT INTO faction_political_events (event_id, turn_number, game_date, event_type, source_faction_id, instigator_officer_id, title_vi, narrative_vi, consequences_json)
             VALUES (?, ?, ?, 'SECESSION_WARLORD', ?, ?, ?, ?, ?);`,
            [eventId, turnNumber, gameDate, off.faction_id, off.officer_id, titleVi, narrativeVi, JSON.stringify(consequences)]
          );

          // Lower loyalty further
          this.db.execute(
            `UPDATE faction_officers SET loyalty = MAX(10, loyalty - 15) WHERE officer_id = ? AND faction_id = ?;`,
            [off.officer_id, off.faction_id]
          );
        });

        events.push({
          eventId,
          turnNumber,
          gameDate,
          eventType: 'SECESSION_WARLORD',
          sourceFactionId: off.faction_id,
          instigatorOfficerId: off.officer_id,
          titleVi,
          narrativeVi,
          consequences
        });
      } else {
        // Dissatisfied Officer Defection Plot
        const eventId = `EVT-DEF-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        const titleVi = `Bất Mãn Nội Bộ: ${off.officer_name} Có Ý Định Đào Tẩu`;
        const narrativeVi = `Tướng lĩnh ${off.officer_name} cảm thấy không được trọng dụng tại ${off.faction_name}. Lòng trung thành sụt giảm nghiêm trọng, y đã bí mật phái sứ giả tiếp xúc với chư hầu lân cận mưu tìm đường đào tẩu.`;

        const consequences = {
          dissatisfiedOfficer: off.officer_id,
          statusChange: 'SECRET_DEFECTION_COURTING',
          betrayalRisk: off.betrayal_risk
        };

        this.db.execute(
          `INSERT INTO faction_political_events (event_id, turn_number, game_date, event_type, source_faction_id, instigator_officer_id, title_vi, narrative_vi, consequences_json)
           VALUES (?, ?, ?, 'OFFICER_DEFECT', ?, ?, ?, ?, ?);`,
          [eventId, turnNumber, gameDate, off.faction_id, off.officer_id, titleVi, narrativeVi, JSON.stringify(consequences)]
        );

        events.push({
          eventId,
          turnNumber,
          gameDate,
          eventType: 'OFFICER_DEFECT',
          sourceFactionId: off.faction_id,
          instigatorOfficerId: off.officer_id,
          titleVi,
          narrativeVi,
          consequences
        });
      }
    }

    // Faction economic pulse: collect tax from controlled cities
    this.db.execute(`
      UPDATE session_factions 
      SET 
        treasury_cash = treasury_cash + (
          SELECT COALESCE(SUM(s.commerce * 10), 500) 
          FROM session_settlements s 
          WHERE s.ruler_faction_id = session_factions.faction_id
        ),
        granary_grain = granary_grain + (
          SELECT COALESCE(SUM(s.agriculture * 0.5), 25.0) 
          FROM session_settlements s 
          WHERE s.ruler_faction_id = session_factions.faction_id
        ),
        updated_at = CURRENT_TIMESTAMP;
    `);

    return events;
  }

  /**
   * Action: Appoint Governor to a Settlement
   */
  public appointGovernor(settlementId: string, officerId: string, factionId: string, turnNumber = 1, gameDate = '184-02-15'): any {
    // 1. Verify officer belongs to faction
    const officer = this.db.queryOne<any>(`
      SELECT fo.*, COALESCE(mc.name_vi, ns.name, fo.officer_id) as officer_name 
      FROM faction_officers fo 
      LEFT JOIN npc_state ns ON fo.officer_id = ns.npc_id
      LEFT JOIN master_characters mc ON fo.officer_id = mc.npc_id
      WHERE fo.officer_id = ? AND fo.faction_id = ?;
    `, [officerId, factionId]);

    if (!officer) {
      throw new Error(`Officer ${officerId} not found in faction ${factionId}`);
    }

    const settlement = this.db.queryOne<any>(`SELECT * FROM session_settlements WHERE settlement_id = ?;`, [settlementId]);
    if (!settlement) {
      throw new Error(`Settlement ${settlementId} not found`);
    }

    const eventId = `EVT-APP-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const titleVi = `Bổ Nhiệm Thái Thú: ${officer.officer_name} Trấn Thủ ${settlement.name_vi}`;
    const narrativeVi = `Chúa công phái ${officer.officer_name} đảm nhiệm chức vị Thái thú ${settlement.name_vi}, ban cờ tiết chỉ huy toàn bộ quân dân trong hạt. Tướng lĩnh vô cùng cảm kích, lòng trung thành gia tăng.`;

    this.db.transaction(() => {
      // 2. Clear old settlement of this officer if any
      this.db.execute(`UPDATE faction_officers SET appointed_settlement_id = NULL WHERE officer_id = ?;`, [officerId]);

      // 3. Clear old governor of this settlement if any
      this.db.execute(
        `UPDATE session_settlements SET governor_id = ?, ruler_faction_id = ? WHERE settlement_id = ?;`,
        [officerId, factionId, settlementId]
      );

      // 4. Update officer
      this.db.execute(
        `UPDATE faction_officers 
         SET appointed_settlement_id = ?, court_rank = 'GOVERNOR', loyalty = MIN(100, loyalty + 15), updated_at = CURRENT_TIMESTAMP 
         WHERE officer_id = ? AND faction_id = ?;`,
        [settlementId, officerId, factionId]
      );

      // 5. Chronicle event
      this.db.execute(
        `INSERT INTO faction_political_events (event_id, turn_number, game_date, event_type, source_faction_id, instigator_officer_id, title_vi, narrative_vi, consequences_json)
         VALUES (?, ?, ?, 'GOVERNOR_APPOINTED', ?, ?, ?, ?, ?);`,
        [eventId, turnNumber, gameDate, factionId, officerId, titleVi, narrativeVi, JSON.stringify({ settlementId, loyaltyBoost: 15 })]
      );
    });

    this.recalculateAllOfficerRisks();

    return {
      success: true,
      officerId,
      settlementId,
      settlementName: settlement.name_vi,
      message: `Đã bổ nhiệm ${officer.officer_name} làm Thái thú trấn thủ ${settlement.name_vi} (+15 Trung thành).`
    };
  }

  /**
   * Action: Invest Title / Promote Rank
   */
  public investTitle(officerId: string, factionId: string, newRank: CourtRank, turnNumber = 1, gameDate = '184-02-15'): any {
    const officer = this.db.queryOne<any>(`
      SELECT fo.*, COALESCE(mc.name_vi, ns.name, fo.officer_id) as officer_name 
      FROM faction_officers fo 
      LEFT JOIN npc_state ns ON fo.officer_id = ns.npc_id
      LEFT JOIN master_characters mc ON fo.officer_id = mc.npc_id
      WHERE fo.officer_id = ? AND fo.faction_id = ?;
    `, [officerId, factionId]);

    if (!officer) {
      throw new Error(`Officer ${officerId} not found in faction ${factionId}`);
    }

    const rankTitlesVi: Record<string, string> = {
      RULER: 'Chúa Công / Lãnh Chúa',
      CHIEF_COMMANDER: 'Đại Đô Đốc / Thống Soái',
      CHIEF_ADVISOR: 'Quân Sư / Đại Quân Mưu',
      GOVERNOR: 'Thái Thú / Thứ Sử',
      GENERAL: 'Tiền Phong / Phá Lỗ Tướng Quân',
      OFFICER: 'Hiệu Úy / Trưởng Quản',
      RETAINER: 'Gia Thần / Môn Khách'
    };

    const titleViDesc = rankTitlesVi[newRank] || newRank;
    const eventId = `EVT-INV-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const titleVi = `Phong Quan Tiến Chức: ${officer.officer_name} Thụ Phong ${titleViDesc}`;
    const narrativeVi = `Nhận thấy tài năng và cống hiến vượt bậc, chúa công ban chiếu chỉ tấn phong ${officer.officer_name} lên hàng ${titleViDesc}. Cả phủ đệ hân hoan, lòng trung thành tăng thêm 20 điểm.`;

    this.db.transaction(() => {
      this.db.execute(
        `UPDATE faction_officers 
         SET court_rank = ?, loyalty = MIN(100, loyalty + 20), ambition = MAX(10, ambition - 10), updated_at = CURRENT_TIMESTAMP 
         WHERE officer_id = ? AND faction_id = ?;`,
        [newRank, officerId, factionId]
      );

      this.db.execute(
        `INSERT INTO faction_political_events (event_id, turn_number, game_date, event_type, source_faction_id, instigator_officer_id, title_vi, narrative_vi, consequences_json)
         VALUES (?, ?, ?, 'TITLE_INVESTED', ?, ?, ?, ?, ?);`,
        [eventId, turnNumber, gameDate, factionId, officerId, titleVi, narrativeVi, JSON.stringify({ newRank, loyaltyBoost: 20 })]
      );
    });

    this.recalculateAllOfficerRisks();

    return {
      success: true,
      officerId,
      newRank,
      titleVi: titleViDesc,
      message: `Đã ban chiếu sắc phong ${officer.officer_name} giữ chức ${titleViDesc} (+20 Trung thành).`
    };
  }

  /**
   * Action: Grant Reward / Gold Bonus from Faction Treasury
   */
  public grantReward(officerId: string, factionId: string, amount: number, turnNumber = 1, gameDate = '184-02-15'): any {
    const faction = this.db.queryOne<any>(`SELECT * FROM session_factions WHERE faction_id = ?;`, [factionId]);
    if (!faction || faction.treasury_cash < amount) {
      throw new Error(`Quân khố của thế lực không đủ ${amount} tiền.`);
    }

    const officer = this.db.queryOne<any>(`
      SELECT fo.*, COALESCE(mc.name_vi, ns.name, fo.officer_id) as officer_name 
      FROM faction_officers fo 
      LEFT JOIN npc_state ns ON fo.officer_id = ns.npc_id
      LEFT JOIN master_characters mc ON fo.officer_id = mc.npc_id
      WHERE fo.officer_id = ? AND fo.faction_id = ?;
    `, [officerId, factionId]);

    if (!officer) {
      throw new Error(`Officer ${officerId} not found in faction ${factionId}`);
    }

    const loyaltyBoost = Math.min(30, Math.floor(amount / 20));

    this.db.transaction(() => {
      // Deduct from faction treasury
      this.db.execute(`UPDATE session_factions SET treasury_cash = treasury_cash - ? WHERE faction_id = ?;`, [amount, factionId]);

      // Add to personal cash of officer
      this.db.execute(`
        INSERT INTO npc_personal_progression (npc_id, personal_cash) VALUES (?, ?)
        ON CONFLICT(npc_id) DO UPDATE SET personal_cash = personal_cash + excluded.personal_cash;
      `, [officerId, amount]);

      // Increase officer loyalty
      this.db.execute(`
        UPDATE faction_officers 
        SET loyalty = MIN(100, loyalty + ?), updated_at = CURRENT_TIMESTAMP 
        WHERE officer_id = ? AND faction_id = ?;
      `, [loyaltyBoost, officerId, factionId]);
    });

    this.recalculateAllOfficerRisks();

    return {
      success: true,
      officerId,
      amount,
      loyaltyBoost,
      message: `Đã xuất ${amount} tiền ban thưởng cho ${officer.officer_name} (+${loyaltyBoost} Trung thành).`
    };
  }
}
