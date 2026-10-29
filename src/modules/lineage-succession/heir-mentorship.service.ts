/**
 * ThreeKingdoms-AgentEngine: Heir Upbringing & Master Mentorship Domain Service
 * (src/modules/lineage-succession/heir-mentorship.service.ts)
 *
 * Implements:
 * 1. Child development stages (INFANT, CHILD, YOUTH_APPRENTICE, ADULT_OFFICER, SUCCESSOR_RULER)
 * 2. Growth focus specialization (WARFARE, INTELLECT, COMMERCE, BALANCED)
 * 3. Tutelage under historical masters (Lu Zhi, Guan Yu, Zhang Fei, Zhang Shiping, Chen Bao)
 * 4. Emergent faction commission when children reach adulthood (ADULT_OFFICER)
 * 5. Detailed mentorship journal logs in family_mentorship_logs
 */

import { DatabaseService } from '../../core/database';
import { nextId } from '../../shared/id-generator';
import { getGameDate } from '../../shared/game-clock';
import {
  ChildGrowthFocus,
  ChildDevelopmentStage,
  AssignMentorParams,
  AssignMentorResult,
  MentorshipSessionResult
} from './lineage-types';

export class HeirMentorshipService {
  private db: DatabaseService;

  public constructor(db?: DatabaseService) {
    this.db = db || DatabaseService.getInstance();
  }

  private getCampaignMeta(): { activeTurn: number; currentDate: string; campaignId: string } {
    try {
      const row = this.db.queryOne<any>(
        'SELECT active_turn, "current_date", campaign_id FROM campaign_meta LIMIT 1;'
      );
      if (row) {
        return {
          activeTurn: Number(row.active_turn) || 6,
          currentDate: row.current_date || '184-05-02',
          campaignId: row.campaign_id || 'CMP-184-ZHOU-01'
        };
      }
    } catch {
      // Fallback
    }
    return { activeTurn: 6, currentDate: '184-05-02', campaignId: 'CMP-184-ZHOU-01' };
  }

  /**
   * Sets the educational and developmental growth focus for a child.
   */
  public setChildGrowthFocus(childId: string, focus: ChildGrowthFocus): void {
    const result = this.db.execute(
      'UPDATE family_children SET growth_focus = ?, updated_at = CURRENT_TIMESTAMP WHERE child_id = ?;',
      [focus, childId]
    );
    if (result.changes === 0) {
      throw new Error(`Không tìm thấy hài nhi ${childId} để thiết lập định hướng tu dưỡng!`);
    }
  }

  /**
   * Designates a child as the sole primary heir to the dynastic succession.
   */
  public designateHeir(childId: string): void {
    this.db.transaction(() => {
      const child = this.db.queryOne<any>(
        'SELECT name_vi FROM family_children WHERE child_id = ?;',
        [childId]
      );
      if (!child) {
        throw new Error(`Không tìm thấy hài nhi ${childId} để lập làm Thế Tử!`);
      }

      // Reset previous heirs
      this.db.execute('UPDATE family_children SET is_heir = 0 WHERE is_heir = 1;');

      // Set new designated heir
      this.db.execute(
        'UPDATE family_children SET is_heir = 1, updated_at = CURRENT_TIMESTAMP WHERE child_id = ?;',
        [childId]
      );
    });
  }

  /**
   * Advances the age of an individual child and updates their developmental status.
   * If age >= 18, commissions the child as an adult officer in faction_officers.
   */
  public ageChild(childId: string, years: number = 1): void {
    this.db.transaction(() => {
      const child = this.db.queryOne<any>(
        'SELECT * FROM family_children WHERE child_id = ?;',
        [childId]
      );
      if (!child) throw new Error(`Hài nhi ${childId} không tồn tại.`);

      const newAge = Number(child.age) + years;
      let status: ChildDevelopmentStage = 'INFANT';
      if (newAge >= 18) status = 'ADULT_OFFICER';
      else if (newAge >= 14) status = 'YOUTH_APPRENTICE';
      else if (newAge >= 6) status = 'CHILD';

      this.db.execute(
        'UPDATE family_children SET age = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE child_id = ?;',
        [newAge, status, childId]
      );

      // Emergent Lineage Commission: Adult heirs enter active duty as commissioned faction officers
      if (status === 'ADULT_OFFICER') {
        const existingOfficer = this.db.queryOne<any>(
          'SELECT officer_id FROM faction_officers WHERE officer_id = ?;',
          [childId]
        );
        if (!existingOfficer) {
          const fatherFaction = this.db.queryOne<any>(
            'SELECT faction_id FROM faction_officers WHERE officer_id = ? LIMIT 1;',
            [child.father_id || 'PLY-0001']
          )?.faction_id || 'FAC-LIANG-CLAN';

          this.db.execute(`
            INSERT OR IGNORE INTO faction_officers 
            (officer_id, faction_id, court_rank, loyalty, ambition, betrayal_risk)
            VALUES (?, ?, 'OFFICER', 100, 45, 0.0);
          `, [childId, fatherFaction]);

          this.db.execute(`
            INSERT OR REPLACE INTO npc_state 
            (npc_id, name, war_attr, int_attr, cra_attr, com_attr, ldr_attr, loyalty, morale, fatigue)
            VALUES (?, ?, ?, ?, ?, ?, ?, 100, 100, 0);
          `, [
            childId,
            child.name_vi || childId,
            child.war_attr || 50,
            child.int_attr || 50,
            child.cra_attr || 50,
            child.com_attr || 50,
            child.ldr_attr || 50
          ]);
        }
      }
    });
  }

  /**
   * Advances the age and developmental stages of all living children across the campaign.
   */
  public advanceAllChildrenAge(years = 1): number {
    const children = this.db.query<any>('SELECT child_id FROM family_children;');
    for (const c of children) {
      this.ageChild(c.child_id, years);
    }
    return children.length;
  }

  /**
   * Assigns a historical master mentor to guide a child's training.
   */
  public assignMasterMentor(params: AssignMentorParams): AssignMentorResult {
    const validMasters: Record<string, string> = {
      'NPC-0012': 'Lư Thực (Tử Cán)',
      'NPC-0003': 'Quan Vũ (Vân Trường)',
      'NPC-0002': 'Trương Phi (Dực Đức)',
      'NPC-0005': 'Trương Thế Bình (Đại Thương Mã)',
      'NPC-0007': 'Trần Bảo (Thợ Cả Lương Gia)'
    };

    const mentorName = validMasters[params.mentorNpcId];
    if (!mentorName) {
      throw new Error(
        `Nhân vật ${params.mentorNpcId} không thuộc danh sách Tông Sư lịch sử khả dụng (Lư Thực, Quan Vũ, Trương Phi, Trương Thế Bình, Trần Bảo)!`
      );
    }

    const child = this.db.queryOne<any>(
      'SELECT child_id, name_vi FROM family_children WHERE child_id = ?;',
      [params.childId]
    );
    if (!child) {
      throw new Error(`Không tìm thấy hồ sơ con cháu ${params.childId}!`);
    }

    this.db.execute(
      'UPDATE family_children SET mentor_npc_id = ?, updated_at = CURRENT_TIMESTAMP WHERE child_id = ?;',
      [params.mentorNpcId, params.childId]
    );

    const narrativeVi = `Đã đưa ${child.name_vi} bái đại sư ${mentorName} làm sư phụ! Danh sư xuất cao đồ, ngày đêm chuyên tâm thụ giáo.`;

    return {
      success: true,
      childId: params.childId,
      childNameVi: child.name_vi,
      mentorNpcId: params.mentorNpcId,
      mentorNameVi: mentorName,
      narrativeVi
    };
  }

  /**
   * Executes a mentorship turn for the child with their assigned master mentor.
   */
  public executeMentorshipTurn(childId: string): MentorshipSessionResult {
    const meta = this.getCampaignMeta();

    return this.db.transaction(() => {
      const child = this.db.queryOne<any>(
        'SELECT * FROM family_children WHERE child_id = ?;',
        [childId]
      );
      if (!child) {
        throw new Error(`Không tìm thấy hồ sơ con cháu ${childId}!`);
      }

      if (!child.mentor_npc_id) {
        throw new Error(`Hài tử ${child.name_vi} chưa được bái sư tông sư nào!`);
      }

      const mentorId = child.mentor_npc_id;

      // Master Mentorship Specs
      interface MentorSpec {
        mentorName: string;
        subject: string;
        statGained: 'WAR' | 'INT' | 'POL' | 'COM' | 'CRA';
        expDelta: number;
        statIncreases: Record<string, number>;
        narrativeVi: string;
      }

      const mentorSpecs: Record<string, MentorSpec> = {
        'NPC-0012': {
          mentorName: 'Lư Thực (Tử Cán)',
          subject: 'Kinh Thư & Đại Trực Trị Quốc',
          statGained: 'INT',
          expDelta: 10,
          statIncreases: { int: 8, pol: 6, ldr: 4 },
          narrativeVi: `Lư Thực giảng giải Xuân Thu, Kinh Dịch cùng mưu lược trị quốc an bang.`
        },
        'NPC-0003': {
          mentorName: 'Quan Vũ (Vân Trường)',
          subject: 'Thanh Long Yển Nguyệt Đao Pháp & Kỵ Xung',
          statGained: 'WAR',
          expDelta: 12,
          statIncreases: { war: 10, ldr: 6, int: 2 },
          narrativeVi: `Quan Vũ truyền thụ đao pháp trảm tướng đoạn kỳ và kỷ luật trọng kỵ binh.`
        },
        'NPC-0002': {
          mentorName: 'Trương Phi (Dực Đức)',
          subject: 'Bát Trượng Xà Mâu & Phá Trận Dũng Lực',
          statGained: 'WAR',
          expDelta: 12,
          statIncreases: { war: 12, ldr: 4 },
          narrativeVi: `Trương Phi truyền thụ thương pháp cương mãnh cùng khí thế vạn nhân địch.`
        },
        'NPC-0005': {
          mentorName: 'Trương Thế Bình (Đại Thương Mã)',
          subject: 'Giám Mã Thuật & Liên Thành Thương Lộ',
          statGained: 'COM',
          expDelta: 10,
          statIncreases: { com: 12, log: 4 },
          narrativeVi: `Trương Thế Bình truyền thụ thuật xem ngựa tốt và điều phối đoàn buôn đại ngàn.`
        },
        'NPC-0007': {
          mentorName: 'Trần Bảo (Thợ Cả Lương Gia)',
          subject: 'Luyện Thiết Tôi Thép & Bách Đoán Binh Khí',
          statGained: 'CRA',
          expDelta: 10,
          statIncreases: { cra: 10, com: 4 },
          narrativeVi: `Trần Bảo truyền thụ bí quyết đúc kiếm tôi thép nguội và bảo dưỡng binh bị.`
        }
      };

      const spec = mentorSpecs[mentorId] || {
        mentorName: 'Kỳ Túc Tông Sư',
        subject: 'Võ Học & Kinh Điển',
        statGained: 'WAR',
        expDelta: 8,
        statIncreases: { war: 5 },
        narrativeVi: 'Học tập chuyên cần cùng tông sư.'
      };

      // Check for Strategic Advisor household role synergy (+25% INT/POL gains)
      const advisor = this.db.queryOne<any>(
        "SELECT wife_name_vi FROM family_spouses WHERE household_role = 'STRATEGIC_ADVISOR' AND status = 'MARRIED' LIMIT 1;"
      );
      if (advisor && (spec.statGained === 'INT' || spec.statIncreases.pol)) {
        if (spec.statIncreases.int) spec.statIncreases.int = Math.round(spec.statIncreases.int * 1.25);
        if (spec.statIncreases.pol) spec.statIncreases.pol = Math.round(spec.statIncreases.pol * 1.25);
      }

      // Apply Stat Increments (strictly clamped <= 120)
      const warInc = spec.statIncreases.war || 0;
      const intInc = spec.statIncreases.int || 0;
      const comInc = spec.statIncreases.com || 0;
      const ldrInc = spec.statIncreases.ldr || 0;
      const polInc = spec.statIncreases.pol || 0;
      const craInc = spec.statIncreases.cra || 0;
      const logInc = spec.statIncreases.log || 0;

      this.db.execute(
        `UPDATE family_children
         SET war_attr = MIN(120, war_attr + ?),
             int_attr = MIN(120, int_attr + ?),
             com_attr = MIN(120, com_attr + ?),
             ldr_attr = MIN(120, ldr_attr + ?),
             pol_attr = MIN(120, pol_attr + ?),
             cra_attr = MIN(120, cra_attr + ?),
             log_attr = MIN(120, log_attr + ?),
             war_exp = war_exp + ?,
             int_exp = int_exp + ?,
             com_exp = com_exp + ?,
             mentorship_turns_completed = mentorship_turns_completed + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE child_id = ?;`,
        [
          warInc,
          intInc,
          comInc,
          ldrInc,
          polInc,
          craInc,
          logInc,
          warInc * 10,
          intInc * 10,
          comInc * 10,
          childId
        ]
      );

      // Record Mentorship Log
      const logId = nextId(this.db, 'mentorship-log', 'LOG-MENTOR', getGameDate(this.db));
      this.db.execute(
        `INSERT INTO family_mentorship_logs (
          log_id, child_id, mentor_npc_id, mentor_name_vi, turn_number, game_date, subject, narrative_vi, stat_gains_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          logId,
          childId,
          mentorId,
          spec.mentorName,
          meta.activeTurn,
          meta.currentDate,
          spec.subject,
          spec.narrativeVi,
          JSON.stringify(spec.statIncreases)
        ]
      );

      return {
        childId,
        mentorNpcId: mentorId,
        mentorNameVi: spec.mentorName,
        statGained: spec.statGained,
        expDelta: spec.expDelta,
        statIncreases: spec.statIncreases,
        totalMentorshipTurns: Number(child.mentorship_turns_completed || 0) + 1,
        narrativeVi: `[${child.name_vi}] thụ giáo ${spec.mentorName}: ${spec.narrativeVi}`
      };
    });
  }
}
