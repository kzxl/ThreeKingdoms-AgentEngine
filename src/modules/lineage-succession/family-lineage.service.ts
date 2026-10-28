/**
 * ThreeKingdoms-AgentEngine: Family Lineage & Succession Service
 * (src/modules/lineage-succession/family-lineage.service.ts)
 *
 * Implements R1: Marriage, Childbirth & Lineage Succession (Life-Sim):
 * 1. Courtship & Betrothal:
 *    - Propose marriage to prominent heroines (Zhen Ji, Sun Shangxiang, Da Qiao, Xiao Qiao, Cai Wenji)
 *    - Strict Affinity >= 80 threshold check
 *    - Customary dowry gifting with full cashflow ledger and double-entry journal audit trail
 *    - Physical inventory movements tracking for gifted dowry items
 * 2. Marriage Ceremony & Household Cohabitation:
 *    - Marriage state registry in `family_spouses`
 *    - Household roles (Housekeeper, Enterprise Supervisor, Strategic Advisor, Military Defender)
 *    - Cohabitation rest turn with fatigue healing and conception probability roll
 * 3. Conception, Gestation & Childbirth:
 *    - 3-stage gestation progression
 *    - Childbirth event generating heir profiles in `family_children`
 *    - Genetic attribute inheritance combining parental averages with [-3, +5] mutation delta
 *    - Unique maternal trait perks (Sun Shangxiang Martial, Cai Wenji Intellect, Lady Zhen Commerce, etc.)
 * 4. Heir Upbringing & Historical Master Mentorship:
 *    - Childhood developmental stages (Infant, Child, Youth Apprentice, Adult Officer)
 *    - Tutelage under historical masters (Lu Zhi, Guan Yu, Zhang Fei, Zhang Shiping, Chen Bao)
 *    - Detailed mentorship journal logs in `family_mentorship_logs`
 * 5. Dynastic Lineage Succession Protocol:
 *    - Flawless identity transfer to designated heir in `player_state` upon protagonist retirement
 *    - 100% preservation of Treasury, Enterprises (`businesses`), Warehouses (`inventory_items`), and Legendary Gear (`character_equipment`)
 *    - Strict conservation of PLY-0001 FK constraints and 140/140 SQLite audit invariants
 *    - Predecessor memorial archived in `family_ancestors_archive`
 *
 * Adheres to AgentOption Universe Architecture v4.0 & Anti-AI-Slop standards.
 */

import { DatabaseService } from '../../core/database';
import { DailyInteractionEngine } from '../social-kizuna/daily-interaction.engine';

// ============================================================================
// INTERFACE CONTRACTS & DTOs
// ============================================================================

export type HouseholdRole =
  | 'HOUSEKEEPER'
  | 'ENTERPRISE_SUPERVISOR'
  | 'STRATEGIC_ADVISOR'
  | 'MILITARY_DEFENDER';

export type ChildGrowthFocus = 'WARFARE' | 'INTELLECT' | 'COMMERCE' | 'BALANCED';

export type ChildDevelopmentStage =
  | 'INFANT'
  | 'CHILD'
  | 'YOUTH_APPRENTICE'
  | 'ADULT_OFFICER'
  | 'SUCCESSOR_RULER';

export interface ProposeMarriageParams {
  playerId?: string;
  spouseNpcId?: string;
  wifeNpcId?: string;
  dowryCash: number;
  dowryItems?: Array<{ itemCode: string; quantity: number }>;
}

export interface ProposeMarriageResult {
  success: boolean;
  marriageId: string;
  wifeId: string;
  wifeNameVi: string;
  wifeNameEn: string;
  dowryCashDeducted: number;
  dowryItemsDeducted: Array<{ itemCode: string; quantity: number }>;
  intimacy: number;
  narrativeVi: string;
}

export interface RestWithSpouseResult {
  success: boolean;
  spouseName: string;
  fatigueRecovered: number;
  newFatigue: number;
  moraleBoost: number;
  conceived: boolean;
  pregnancyStage: number;
  narrativeVi: string;
}

export interface GeneticAttributeRoll {
  fatherStat: number;
  motherStat: number;
  mutationDelta: number; // clamped [-3, +5]
  maternalTraitBonus?: number;
  finalStat: number;
}

export interface BirthChildParams {
  motherId: string;
  customName?: string;
  gender?: 'MALE' | 'FEMALE';
}

export interface BirthChildResult {
  childId: string;
  fatherId: string;
  motherId: string;
  motherNameVi: string;
  nameVi: string;
  nameEn: string;
  gender: 'MALE' | 'FEMALE';
  styleName: string;
  inheritedStats: Record<string, number>;
  innateTalents: string[];
  narrativeVi: string;
}

export interface AssignMentorParams {
  childId: string;
  mentorNpcId: string;
}

export interface AssignMentorResult {
  success: boolean;
  childId: string;
  childNameVi: string;
  mentorNpcId: string;
  mentorNameVi: string;
  narrativeVi: string;
}

export interface MentorshipSessionResult {
  childId: string;
  mentorNpcId: string;
  mentorNameVi: string;
  statGained: 'WAR' | 'INT' | 'POL' | 'COM' | 'CRA';
  expDelta: number;
  statIncreases: Record<string, number>;
  totalMentorshipTurns: number;
  narrativeVi: string;
}

export interface SuccessionParams {
  heirId?: string;
  heirChildId?: string;
  reason?: 'VOLUNTARY_RETIREMENT' | 'ADVANCED_AGE' | 'MORTAL_WOUND' | 'AGE' | 'INJURY' | 'VOLUNTARY';
}

export interface SuccessionExecutionParams {
  heirChildId: string;
  retirementReason?: 'AGE' | 'INJURY' | 'VOLUNTARY';
}

export interface SuccessionResult {
  success: boolean;
  predecessorName: string;
  newProtagonistName: string;
  generation: number;
  inheritedCash: number;
  inheritedEnterprisesCount: number;
  inheritedInventoryValuation: number;
  inheritedGearCount: number;
  narrativeVi: string;
}

export interface CourtshipCandidateDTO {
  npcId: string;
  nameVi: string;
  nameEn: string;
  baselineLocation: string;
  locationNameVi?: string;
  locationNameEn?: string;
  clueVi?: string;
  clueEn?: string;
  keyStats: {
    war: number;
    int: number;
    com: number;
    ldr: number;
    pol: number;
    dip: number;
    cra: number;
  };
  isEncountered: boolean;
  affinity: number;
  respect: number;
  relationshipTitleVi: string;
  relationshipTitleEn?: string;
  canPropose: boolean;
  recommendedDowryCash: number;
  recommendedDowryItems: Array<{ itemCode: string; itemNameVi: string; quantity: number }>;
  maternalTraitPerk: {
    traitCode: string;
    traitNameVi: string;
    descriptionVi: string;
  };
}

export interface FamilyOverviewDTO {
  family: {
    familyId: string;
    familyNameVi: string;
    familyNameEn: string;
    foundingYear: number;
    currentGeneration: number;
    familyPrestige: number;
    familyMottoVi: string;
    familyMottoEn: string;
    residenceLocation: string;
  };
  protagonist: {
    playerId: string;
    name: string;
    styleName: string;
    age: number;
    health: number;
    fatigue: number;
    morale: number;
    totalCash: number;
  };
  spouses: Array<{
    marriageId: string;
    wifeId: string;
    wifeNameVi: string;
    wifeNameEn: string;
    marriageDate: string;
    marriageTurn: number;
    dowryCash: number;
    intimacy: number;
    status: string;
    pregnancyStage: number;
    householdRole: string;
    roleEffectDescVi: string;
  }>;
  children: Array<{
    childId: string;
    nameVi: string;
    nameEn: string;
    gender: string;
    styleName: string;
    age: number;
    status: string;
    isHeir: boolean;
    growthFocus: string;
    mentorNpcId: string | null;
    mentorshipTurnsCompleted: number;
    stats: Record<string, number>;
    innateTalents: string[];
  }>;
  genealogyTree: Array<{
    id: number;
    ancestorId: string;
    descendantId: string;
    relationType: string;
    generation: number;
    notes: string;
  }>;
  ancestors: Array<{
    ancestorId: string;
    name: string;
    styleName: string;
    generation: number;
    reignStartDate: string;
    reignEndDate: string;
    reignTurns: number;
    retirementAge: number;
    finalNetWorth: number;
    posthumousTitle: string;
    achievements: string[];
  }>;
}

export interface IFamilyLineageService {
  getFamilyOverview(): FamilyOverviewDTO;
  getCourtshipCandidates(): CourtshipCandidateDTO[];
  proposeMarriage(params: ProposeMarriageParams): ProposeMarriageResult;
  assignHouseholdRole(marriageId: string, role: HouseholdRole): void;
  restWithSpouse(marriageId: string): RestWithSpouseResult;
  advancePregnancyTick(turn?: number, gameDate?: string): void;
  birthChild(params: BirthChildParams): BirthChildResult;
  setChildGrowthFocus(childId: string, focus: ChildGrowthFocus): void;
  assignMasterMentor(params: AssignMentorParams): AssignMentorResult;
  executeMentorshipTurn(childId: string): MentorshipSessionResult;
  designateHeir(childId: string): void;
  executeSuccession(params: SuccessionParams | SuccessionExecutionParams): SuccessionResult;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class FamilyLineageService implements IFamilyLineageService {
  private static instance: FamilyLineageService | null = null;
  private db: DatabaseService;

  private constructor(customDbPath?: string) {
    this.db = DatabaseService.getInstance(customDbPath);
    this.ensureTables();
  }

  public static getInstance(customDbPath?: string): FamilyLineageService {
    if (!FamilyLineageService.instance) {
      FamilyLineageService.instance = new FamilyLineageService(customDbPath);
    }
    return FamilyLineageService.instance;
  }

  /**
   * Auto-migrates and ensures all life-sim SQLite tables and indices exist.
   */
  public ensureTables(): void {
    try {
      this.db.exec(`
        -- 1. Dynasty Heritage & Lineage Profile
        CREATE TABLE IF NOT EXISTS family_lineage (
            family_id TEXT PRIMARY KEY DEFAULT 'FAM-LIANG',
            family_name_vi TEXT NOT NULL DEFAULT 'Lương Thị Gia Tộc',
            family_name_en TEXT NOT NULL DEFAULT 'Liang Clan Dynasty',
            founding_year INTEGER NOT NULL DEFAULT 184,
            current_generation INTEGER NOT NULL DEFAULT 1,
            family_prestige INTEGER NOT NULL DEFAULT 100 CHECK (family_prestige >= 0),
            family_motto_vi TEXT DEFAULT 'Đôn Bản Khởi Gia • Trạch Bị Thiên Hạ',
            family_motto_en TEXT DEFAULT 'Cultivate Foundations • Extend Prosperity Under Heaven',
            residence_location TEXT NOT NULL DEFAULT 'LOC-0001',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 2. Spouses & Marriage Registry
        CREATE TABLE IF NOT EXISTS family_spouses (
            marriage_id TEXT PRIMARY KEY,
            husband_id TEXT NOT NULL DEFAULT 'PLY-0001',
            wife_id TEXT NOT NULL,
            wife_name_vi TEXT NOT NULL,
            wife_name_en TEXT NOT NULL,
            marriage_date TEXT NOT NULL,
            marriage_turn INTEGER NOT NULL,
            dowry_cash INTEGER NOT NULL DEFAULT 0 CHECK (dowry_cash >= 0),
            dowry_items_json TEXT DEFAULT '[]',
            intimacy INTEGER NOT NULL DEFAULT 80 CHECK (intimacy >= 0 AND intimacy <= 100),
            status TEXT NOT NULL DEFAULT 'MARRIED',
            pregnancy_stage INTEGER NOT NULL DEFAULT 0 CHECK (pregnancy_stage >= 0 AND pregnancy_stage <= 3),
            conception_turn INTEGER DEFAULT NULL,
            household_role TEXT NOT NULL DEFAULT 'HOUSEKEEPER',
            role_effect_desc_vi TEXT DEFAULT 'Tăng 30% tốc độ hồi phục thể lực khi nghỉ ngơi.',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 3. Children, Heirs & Upbringing Tracker
        CREATE TABLE IF NOT EXISTS family_children (
            child_id TEXT PRIMARY KEY,
            father_id TEXT NOT NULL DEFAULT 'PLY-0001',
            mother_id TEXT NOT NULL,
            mother_name_vi TEXT NOT NULL,
            name_vi TEXT NOT NULL,
            name_en TEXT NOT NULL,
            style_name TEXT,
            gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
            birth_date TEXT NOT NULL,
            birth_turn INTEGER NOT NULL,
            age INTEGER NOT NULL DEFAULT 0 CHECK (age >= 0),
            war_attr INTEGER NOT NULL DEFAULT 25 CHECK (war_attr >= 0 AND war_attr <= 120),
            int_attr INTEGER NOT NULL DEFAULT 25 CHECK (int_attr >= 0 AND int_attr <= 120),
            com_attr INTEGER NOT NULL DEFAULT 25 CHECK (com_attr >= 0 AND com_attr <= 120),
            ldr_attr INTEGER NOT NULL DEFAULT 25 CHECK (ldr_attr >= 0 AND ldr_attr <= 120),
            pol_attr INTEGER NOT NULL DEFAULT 25 CHECK (pol_attr >= 0 AND pol_attr <= 120),
            dip_attr INTEGER NOT NULL DEFAULT 25 CHECK (dip_attr >= 0 AND dip_attr <= 120),
            cra_attr INTEGER NOT NULL DEFAULT 25 CHECK (cra_attr >= 0 AND cra_attr <= 120),
            log_attr INTEGER NOT NULL DEFAULT 25 CHECK (log_attr >= 0 AND log_attr <= 120),
            war_exp INTEGER NOT NULL DEFAULT 0,
            int_exp INTEGER NOT NULL DEFAULT 0,
            com_exp INTEGER NOT NULL DEFAULT 0,
            innate_talents_json TEXT DEFAULT '[]',
            growth_focus TEXT NOT NULL DEFAULT 'BALANCED',
            mentor_npc_id TEXT DEFAULT NULL,
            mentorship_turns_completed INTEGER NOT NULL DEFAULT 0 CHECK (mentorship_turns_completed >= 0),
            is_heir INTEGER NOT NULL DEFAULT 0 CHECK (is_heir IN (0, 1)),
            status TEXT NOT NULL DEFAULT 'INFANT',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 4. Genealogical Tree Graph Edge List
        CREATE TABLE IF NOT EXISTS family_genealogy_tree (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ancestor_id TEXT NOT NULL,
            descendant_id TEXT NOT NULL,
            relation_type TEXT NOT NULL,
            generation INTEGER NOT NULL DEFAULT 1,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 5. Mentorship Journal Logs
        CREATE TABLE IF NOT EXISTS family_mentorship_logs (
            log_id TEXT PRIMARY KEY,
            child_id TEXT NOT NULL,
            mentor_npc_id TEXT NOT NULL,
            mentor_name_vi TEXT NOT NULL,
            turn_number INTEGER NOT NULL,
            game_date TEXT NOT NULL,
            subject TEXT NOT NULL,
            narrative_vi TEXT NOT NULL,
            stat_gains_json TEXT DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 6. Patriarchs & Ancestors Historical Archive (Post-Succession Memorial)
        CREATE TABLE IF NOT EXISTS family_ancestors_archive (
            ancestor_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            style_name TEXT,
            generation INTEGER NOT NULL,
            reign_start_date TEXT NOT NULL,
            reign_end_date TEXT NOT NULL,
            reign_turns INTEGER NOT NULL,
            retirement_age INTEGER NOT NULL,
            final_net_worth INTEGER NOT NULL,
            posthumous_title TEXT,
            achievements_json TEXT DEFAULT '[]',
            archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Indices for rapid querying
        CREATE INDEX IF NOT EXISTS idx_spouses_husband ON family_spouses(husband_id);
        CREATE INDEX IF NOT EXISTS idx_spouses_status ON family_spouses(status);
        CREATE INDEX IF NOT EXISTS idx_children_father ON family_children(father_id);
        CREATE INDEX IF NOT EXISTS idx_children_status ON family_children(status);
        CREATE INDEX IF NOT EXISTS idx_children_heir ON family_children(is_heir);
        CREATE INDEX IF NOT EXISTS idx_genealogy_anc ON family_genealogy_tree(ancestor_id);
        CREATE INDEX IF NOT EXISTS idx_genealogy_desc ON family_genealogy_tree(descendant_id);
        CREATE INDEX IF NOT EXISTS idx_mentorship_child ON family_mentorship_logs(child_id);
      `);

      // Seed default Liang Clan row if absent
      const existing = this.db.queryOne('SELECT family_id FROM family_lineage WHERE family_id = ?;', [
        'FAM-LIANG'
      ]);
      if (!existing) {
        this.db.execute(`
          INSERT INTO family_lineage (
            family_id, family_name_vi, family_name_en, founding_year,
            current_generation, family_prestige, family_motto_vi, family_motto_en, residence_location
          ) VALUES (
            'FAM-LIANG', 'Lương Thị Gia Tộc', 'Liang Clan Dynasty', 184,
            1, 100, 'Đôn Bản Khởi Gia • Trạch Bị Thiên Hạ', 'Cultivate Foundations • Extend Prosperity Under Heaven', 'LOC-0001'
          );
        `);
      }
    } catch (err) {
      console.warn('[FamilyLineageService] Table initialization notice:', err);
    }
  }

  /**
   * Retrieves active campaign metadata.
   */
  private getCampaignMeta(): { activeTurn: number; currentDate: string; campaignId: string } {
    try {
      const row = this.db.queryOne<any>(
        'SELECT active_turn, current_date, campaign_id FROM campaign_meta LIMIT 1;'
      );
      if (row) {
        return {
          activeTurn: Number(row.active_turn) || 6,
          currentDate: row.current_date || '184-05-02',
          campaignId: row.campaign_id || 'CMP-184-ZHOU-01'
        };
      }
    } catch {
      // Fallback defaults
    }
    return { activeTurn: 6, currentDate: '184-05-02', campaignId: 'CMP-184-ZHOU-01' };
  }

  // =========================================================================
  // 1. FAMILY OVERVIEW & STATUS QUERIES
  // =========================================================================

  public getFamilyOverview(): FamilyOverviewDTO {
    const familyRow = this.db.queryOne<any>(
      'SELECT * FROM family_lineage WHERE family_id = ? LIMIT 1;',
      ['FAM-LIANG']
    ) || {
      family_id: 'FAM-LIANG',
      family_name_vi: 'Lương Thị Gia Tộc',
      family_name_en: 'Liang Clan Dynasty',
      founding_year: 184,
      current_generation: 1,
      family_prestige: 100,
      family_motto_vi: 'Đôn Bản Khởi Gia • Trạch Bị Thiên Hạ',
      family_motto_en: 'Cultivate Foundations • Extend Prosperity Under Heaven',
      residence_location: 'LOC-0001'
    };

    const playerRow = this.db.queryOne<any>(
      'SELECT player_id, name, style_name, age, health, fatigue, morale, liquid_cash, safe_cash FROM player_state WHERE player_id = ?;',
      ['PLY-0001']
    ) || {
      player_id: 'PLY-0001',
      name: 'Lương Diễn',
      style_name: 'Chí Viễn',
      age: 21,
      health: 100,
      fatigue: 0,
      morale: 100,
      liquid_cash: 15438,
      safe_cash: 3000
    };

    const spouses = this.db.query<any>(
      'SELECT * FROM family_spouses WHERE husband_id = ? ORDER BY marriage_turn ASC;',
      ['PLY-0001']
    ).map(s => ({
      marriageId: s.marriage_id,
      wifeId: s.wife_id,
      wifeNameVi: s.wife_name_vi,
      wifeNameEn: s.wife_name_en,
      marriageDate: s.marriage_date,
      marriageTurn: Number(s.marriage_turn),
      dowryCash: Number(s.dowry_cash),
      intimacy: Number(s.intimacy),
      status: s.status,
      pregnancyStage: Number(s.pregnancy_stage),
      householdRole: s.household_role,
      roleEffectDescVi: s.role_effect_desc_vi
    }));

    const children = this.db.query<any>(
      'SELECT * FROM family_children WHERE father_id = ? ORDER BY is_heir DESC, birth_turn ASC;',
      ['PLY-0001']
    ).map(c => ({
      childId: c.child_id,
      nameVi: c.name_vi,
      nameEn: c.name_en,
      gender: c.gender,
      styleName: c.style_name || '',
      age: Number(c.age),
      status: c.status,
      isHeir: Number(c.is_heir) === 1,
      growthFocus: c.growth_focus,
      mentorNpcId: c.mentor_npc_id,
      mentorshipTurnsCompleted: Number(c.mentorship_turns_completed || 0),
      stats: {
        war: Number(c.war_attr),
        int: Number(c.int_attr),
        com: Number(c.com_attr),
        ldr: Number(c.ldr_attr),
        pol: Number(c.pol_attr),
        dip: Number(c.dip_attr),
        cra: Number(c.cra_attr),
        log: Number(c.log_attr)
      },
      innateTalents: c.innate_talents_json ? JSON.parse(c.innate_talents_json) : []
    }));

    const genealogyTree = this.db.query<any>(
      'SELECT * FROM family_genealogy_tree ORDER BY id ASC;'
    ).map(g => ({
      id: Number(g.id),
      ancestorId: g.ancestor_id,
      descendantId: g.descendant_id,
      relationType: g.relation_type,
      generation: Number(g.generation),
      notes: g.notes || ''
    }));

    const ancestors = this.db.query<any>(
      'SELECT * FROM family_ancestors_archive ORDER BY generation ASC;'
    ).map(a => ({
      ancestorId: a.ancestor_id,
      name: a.name,
      styleName: a.style_name || '',
      generation: Number(a.generation),
      reignStartDate: a.reign_start_date,
      reignEndDate: a.reign_end_date,
      reignTurns: Number(a.reign_turns),
      retirementAge: Number(a.retirement_age),
      finalNetWorth: Number(a.final_net_worth),
      posthumousTitle: a.posthumous_title || '',
      achievements: a.achievements_json ? JSON.parse(a.achievements_json) : []
    }));

    return {
      family: {
        familyId: familyRow.family_id,
        familyNameVi: familyRow.family_name_vi,
        familyNameEn: familyRow.family_name_en,
        foundingYear: Number(familyRow.founding_year),
        currentGeneration: Number(familyRow.current_generation),
        familyPrestige: Number(familyRow.family_prestige),
        familyMottoVi: familyRow.family_motto_vi,
        familyMottoEn: familyRow.family_motto_en,
        residenceLocation: familyRow.residence_location
      },
      protagonist: {
        playerId: playerRow.player_id,
        name: playerRow.name,
        styleName: playerRow.style_name || 'Chí Viễn',
        age: Number(playerRow.age),
        health: Number(playerRow.health),
        fatigue: Number(playerRow.fatigue),
        morale: Number(playerRow.morale),
        totalCash: Number(playerRow.liquid_cash || 0) + Number(playerRow.safe_cash || 0)
      },
      spouses,
      children,
      genealogyTree,
      ancestors
    };
  }

  // =========================================================================
  // 2. COURTSHIP & BETROTHAL
  // =========================================================================

  /**
   * Determines whether the protagonist has encountered / met an NPC.
   * Requirement: Player must have actually met/interacted with the character,
   * established relationship deltas, or unlocked intelligence fog interaction,
   * or already have married them.
   */
  public hasEncounteredNpc(npcId: string): boolean {
    try {
      // 1. Check if relation deltas exist (banquet, conversation, gift, spar)
      const delta = this.db.queryOne<any>(
        'SELECT 1 FROM npc_relationship_deltas WHERE npc_id = ? LIMIT 1;',
        [npcId]
      );
      if (delta) return true;

      // 2. Check if intel fog has recorded interactions
      const fog = this.db.queryOne<any>(
        'SELECT interaction_count FROM npc_intel_fog WHERE npc_id = ? LIMIT 1;',
        [npcId]
      );
      if (fog && Number(fog.interaction_count) > 0) {
        return true;
      }

      // 3. Check if already spouse
      const spouse = this.db.queryOne<any>(
        'SELECT 1 FROM family_spouses WHERE wife_id = ? LIMIT 1;',
        [npcId]
      );
      if (spouse) return true;

      return false;
    } catch {
      return false;
    }
  }

  public getCourtshipCandidates(): CourtshipCandidateDTO[] {
    const prominentHeroines = [
      {
        npcId: 'NPC-0081',
        nameVi: 'Chân Phu Nhân (Chân Mật)',
        nameEn: 'Lady Zhen (Zhen Ji)',
        baselineLocation: 'LOC-0006',
        dowryCash: 6000,
        dowryItems: [{ itemCode: 'COM-SILK', itemNameVi: 'Tơ Lụa Thượng Phẩm', quantity: 5 }],
        clueVi: 'Danh môn khuê tú Ký Châu Chân thị, tài sắc quán tuyệt, thường ngụ tại Nghiệp Thành phủ đệ.',
        clueEn: 'Noble lady of the Zhen clan in Jizhou, often residing at Yecheng manor.',
        maternalTrait: {
          traitCode: 'TLT-SILK-ACUMEN',
          traitNameVi: 'Lạc Thần Thương Trí',
          descriptionVi: '+25% EXP Thương Nghiệp cho con cái, +2 Base COM.'
        }
      },
      {
        npcId: 'NPC-0087',
        nameVi: 'Tôn Thượng Hương (Cung Yêu Cơ)',
        nameEn: 'Sun Shangxiang',
        baselineLocation: 'LOC-0013',
        dowryCash: 8000,
        dowryItems: [{ itemCode: 'COM-HORSE-W', itemNameVi: 'Chiến Mã Thuần Chủng', quantity: 2 }],
        clueVi: 'Giang Đông Kiêu Cơ, ái muội đao cung võ bị, thường cùng nữ binh luyện võ tại Kiến Nghiệp doanh đài.',
        clueEn: 'Fierce martial maiden of Jiangdong, often training with archers at Jianye parade grounds.',
        maternalTrait: {
          traitCode: 'TLT-TIGER-HERITAGE',
          traitNameVi: 'Kiêu Cơ Vũ Huyết',
          descriptionVi: '+25% EXP Võ Lực cho con cái, +2 Base WAR.'
        }
      },
      {
        npcId: 'NPC-0088',
        nameVi: 'Đại Kiều',
        nameEn: 'Da Qiao',
        baselineLocation: 'LOC-0013',
        dowryCash: 5000,
        dowryItems: [{ itemCode: 'COM-SILK', itemNameVi: 'Tơ Lụa Thượng Phẩm', quantity: 3 }],
        clueVi: 'Kiều gia trưởng nữ tại Hoàn Thành - Giang Đông, cầm kỳ thi họa, trang nhã ôn nhu, ẩn cư khuê các.',
        clueEn: 'Elder Qiao maiden of Jiangdong, poised and graceful, practicing guqin at Wan County.',
        maternalTrait: {
          traitCode: 'TLT-MASTER-ARTISAN',
          traitNameVi: 'Quỳnh Hoa Xảo Thủ',
          descriptionVi: '+25% EXP Kỹ Nghệ cho con cái, +2 Base CRA.'
        }
      },
      {
        npcId: 'NPC-0089',
        nameVi: 'Tiểu Kiều',
        nameEn: 'Xiao Qiao',
        baselineLocation: 'LOC-0011',
        dowryCash: 5000,
        dowryItems: [{ itemCode: 'COM-WINE', itemNameVi: 'Đỗ Khang Mỹ Tửu', quantity: 5 }],
        clueVi: 'Kiều gia thứ nữ tuyệt sắc khuynh thành, tinh thông âm luật, thường dạo chơi ngắm cảnh vùng Sài Tang & Xích Bích.',
        clueEn: 'Younger Qiao maiden of celestial beauty, fond of melodious arts near Saitang and Chibi.',
        maternalTrait: {
          traitCode: 'TLT-HARMONIOUS-AESTHETIC',
          traitNameVi: 'Quốc Sắc Thiên Hương',
          descriptionVi: '+20% Gia Tộc Sĩ Khí, +2 Base DIP.'
        }
      },
      {
        npcId: 'NPC-0097',
        nameVi: 'Thái Diễm (Thái Văn Cơ)',
        nameEn: 'Cai Wenji',
        baselineLocation: 'LOC-0002',
        dowryCash: 6000,
        dowryItems: [{ itemCode: 'COM-SILK', itemNameVi: 'Tơ Lụa Thượng Phẩm', quantity: 4 }],
        clueVi: 'Ái nữ Thái Ung đại phu, học rộng thi thư, tinh thông Hồ Gia Thập Bát Phách tại Kinh Đô Lạc Dương.',
        clueEn: 'Daughter of Master Cai Yong, famous poet and musician residing in Imperial Capital Luoyang.',
        maternalTrait: {
          traitCode: 'TLT-POETIC-GENIUS',
          traitNameVi: 'Hồ Gia Thi Vận',
          descriptionVi: '+25% EXP Mưu Lược / Điển Tịch cho con cái, +2 Base INT.'
        }
      }
    ];

    const kizunaEngine = DailyInteractionEngine.getInstance();
    const activeSpouseIds = new Set(
      this.db.query<any>("SELECT wife_id FROM family_spouses WHERE status = 'MARRIED';").map(r => r.wife_id)
    );

    return prominentHeroines.map(h => {
      const char = this.db.queryOne<any>(
        'SELECT * FROM master_characters WHERE npc_id = ?;',
        [h.npcId]
      ) || {};

      const locRow = this.db.queryOne<any>(
        'SELECT name_vi, name_en FROM master_locations WHERE location_id = ?;',
        [char.baseline_location || h.baselineLocation]
      );
      const locationNameVi = locRow?.name_vi || 'Phương xa';
      const locationNameEn = locRow?.name_en || 'Distant Province';

      const isEncountered = this.hasEncounteredNpc(h.npcId);

      let affinity = 0;
      let respect = 0;
      let relationshipTitleVi = 'Chưa Tương Ngộ (Chưa Gặp)';
      let relationshipTitleEn = 'Unencountered (Unknown)';

      if (isEncountered) {
        try {
          const sentiment = kizunaEngine.getNpcSentiment(h.npcId);
          affinity = sentiment.affinity;
          respect = sentiment.respect;
          relationshipTitleVi = sentiment.titleVi;
          relationshipTitleEn = sentiment.titleEn;
        } catch {
          affinity = 25;
          respect = 25;
          relationshipTitleVi = 'Sơ Giao';
          relationshipTitleEn = 'Acquaintance';
        }
      }

      const isAlreadyMarried = activeSpouseIds.has(h.npcId);
      const canPropose = isEncountered && affinity >= 80 && !isAlreadyMarried;

      return {
        npcId: h.npcId,
        nameVi: char.name_vi || h.nameVi,
        nameEn: char.name_en || h.nameEn,
        baselineLocation: char.baseline_location || h.baselineLocation,
        locationNameVi,
        locationNameEn,
        clueVi: h.clueVi,
        clueEn: h.clueEn,
        keyStats: {
          war: Number(char.war_attr || 30),
          int: Number(char.int_attr || 70),
          com: Number(char.com_attr || 60),
          ldr: Number(char.ldr_attr || 50),
          pol: Number(char.pol_attr || 60),
          dip: Number(char.dip_attr || 70),
          cra: Number(char.cra_attr || 50)
        },
        isEncountered,
        affinity,
        respect,
        relationshipTitleVi,
        relationshipTitleEn,
        canPropose,
        recommendedDowryCash: h.dowryCash,
        recommendedDowryItems: h.dowryItems,
        maternalTraitPerk: h.maternalTrait
      };
    });
  }

  /**
   * Proposes marriage to a candidate maiden with double-entry cashflow accounting.
   * Requirement: Affinity >= 80 and sufficient cash/items.
   */
  public proposeMarriage(params: ProposeMarriageParams): ProposeMarriageResult {
    const targetWifeId = params.wifeNpcId || params.spouseNpcId;
    if (!targetWifeId) {
      throw new Error('Chưa chỉ định đối tượng cầu hôn (wifeNpcId / spouseNpcId)!');
    }

    const playerId = params.playerId || 'PLY-0001';
    const dowryCash = Math.max(0, Number(params.dowryCash) || 0);
    const dowryItems = params.dowryItems || [];
    const meta = this.getCampaignMeta();

    return this.db.transaction(() => {
      // 1. Check existing marriage
      const existingMarriage = this.db.queryOne<any>(
        "SELECT marriage_id FROM family_spouses WHERE wife_id = ? AND status = 'MARRIED';",
        [targetWifeId]
      );
      if (existingMarriage) {
        throw new Error(`Nhân vật ${targetWifeId} đã kết tóc se duyên, không thể tái giá!`);
      }

      // 2. Check candidate existence
      const character = this.db.queryOne<any>(
        'SELECT npc_id, name_vi, name_en FROM master_characters WHERE npc_id = ?;',
        [targetWifeId]
      );
      if (!character) {
        throw new Error(`Không tìm thấy hồ sơ mỹ nhân ${targetWifeId} trong thiên hạ lục!`);
      }

      // 3. Check Encounter Prerequisite (Must have met before proposing)
      if (!this.hasEncounteredNpc(targetWifeId)) {
        throw new Error(
          `Bạn chưa từng diện kiến hay tương ngộ ${character.name_vi}! Phải diện kiến tương ngộ và bồi đắp hảo cảm (≥ 80) mới có thể nạp sính lễ cầu hôn.`
        );
      }

      // 4. Check Affinity >= 80
      const kizunaEngine = DailyInteractionEngine.getInstance();
      const sentiment = kizunaEngine.getNpcSentiment(targetWifeId);
      if (sentiment.affinity < 80) {
        throw new Error(
          `Hảo cảm chưa đủ sâu sắc (${sentiment.affinity}/100)! Cần tối thiểu 80 điểm hảo cảm để kết tóc se duyên.`
        );
      }

      // 4. Verify Treasury Cash
      const player = this.db.queryOne<any>(
        'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ?;',
        [playerId]
      );
      if (!player) {
        throw new Error(`Player ${playerId} not found in player_state.`);
      }

      const liquidCash = Number(player.liquid_cash || 0);
      const safeCash = Number(player.safe_cash || 0);
      if (liquidCash < dowryCash) {
        throw new Error(
          `Ngân khố không đủ tiền mặt chi trả sính lễ! Cần ${dowryCash.toLocaleString()} Tiền, hiện có ${liquidCash.toLocaleString()} Tiền.`
        );
      }

      // 5. Verify and deduct Dowry Items (if any)
      const deductedItems: Array<{ itemCode: string; quantity: number }> = [];
      for (const item of dowryItems) {
        const itemRow = this.db.queryOne<any>(
          'SELECT quantity, unit_cost_basis FROM inventory_items WHERE item_code = ?;',
          [item.itemCode]
        );
        const available = itemRow ? Number(itemRow.quantity) : 0;
        if (available < item.quantity) {
          throw new Error(
            `Kho hàng không đủ lễ vật [${item.itemCode}]: cần ${item.quantity}, hiện có ${available}.`
          );
        }

        const newQty = available - item.quantity;
        this.db.execute(
          'UPDATE inventory_items SET quantity = ? WHERE item_code = ?;',
          [newQty, item.itemCode]
        );

        const movId = `MOV-DOWRY-${Date.now()}-${item.itemCode}`;
        this.db.execute(
          `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
           VALUES (?, ?, ?, 'OUTBOUND_DOWRY_GIFT', ?, ?, ?, ?);`,
          [
            movId,
            meta.currentDate,
            item.itemCode,
            item.quantity,
            itemRow.unit_cost_basis || 0,
            newQty,
            `TXN-MARR-${targetWifeId}`
          ]
        );

        deductedItems.push({ itemCode: item.itemCode, quantity: item.quantity });
      }

      // 6. Deduct Cash & Log Double-Entry Accounting
      const newLiquid = liquidCash - dowryCash;
      const newTotalCash = newLiquid + safeCash;

      this.db.execute(
        'UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;',
        [newLiquid, playerId]
      );

      const txnId = `TXN-MARR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Insert into cashflow_ledger
      this.db.execute(
        `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
         VALUES (?, ?, ?, 'MARRIAGE_DOWRY', 0, ?, ?, ?, 'Confirmed');`,
        [
          txnId,
          meta.currentDate,
          character.name_vi,
          dowryCash,
          newTotalCash,
          `Nạp sính lễ thành hôn cùng ${character.name_vi}`
        ]
      );

      // Insert balanced double-entry into account_journal
      this.db.execute(
        `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
         VALUES (?, ?, ?, '6001_OPERATING_EXPENSE', ?, 0, ?);`,
        [txnId, meta.campaignId, meta.currentDate, dowryCash, `Chi phí sính lễ thành thân [${character.name_vi}]`]
      );

      this.db.execute(
        `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
         VALUES (?, ?, ?, '1001_CASH_MOBILE', 0, ?, ?);`,
        [txnId, meta.campaignId, meta.currentDate, dowryCash, `Xuất quỹ tiền mặt ngân khố sính lễ`]
      );

      // 7. Register Marriage
      const marriageId = `MARR-${Date.now().toString(36).toUpperCase()}`;
      this.db.execute(
        `INSERT INTO family_spouses (
          marriage_id, husband_id, wife_id, wife_name_vi, wife_name_en,
          marriage_date, marriage_turn, dowry_cash, dowry_items_json,
          intimacy, status, pregnancy_stage, household_role, role_effect_desc_vi
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, 'MARRIED', 0, 'HOUSEKEEPER', 'Tăng 30% tốc độ hồi phục thể lực khi nghỉ ngơi.'
        );`,
        [
          marriageId,
          playerId,
          targetWifeId,
          character.name_vi,
          character.name_en,
          meta.currentDate,
          meta.activeTurn,
          dowryCash,
          JSON.stringify(deductedItems),
          sentiment.affinity
        ]
      );

      // 8. Register Genealogy Tree Edge
      const lineage = this.db.queryOne<any>('SELECT current_generation FROM family_lineage LIMIT 1;') || {
        current_generation: 1
      };
      this.db.execute(
        `INSERT INTO family_genealogy_tree (ancestor_id, descendant_id, relation_type, generation, notes)
         VALUES (?, ?, 'SPOUSE', ?, ?);`,
        [playerId, targetWifeId, lineage.current_generation, `Hôn phối chính thê [${character.name_vi}]`]
      );

      // 9. Increase Family Prestige & NPC devotion
      this.db.execute(
        'UPDATE family_lineage SET family_prestige = family_prestige + 25 WHERE family_id = ?;',
        ['FAM-LIANG']
      );

      const newSentimentTotal = Math.max(0, Math.min(100, sentiment.affinity + 10));
      this.db.execute(
        `INSERT INTO npc_relationship_deltas (
          npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes
        ) VALUES (?, ?, 10, ?, 'DEVOTED', ?);`,
        [
          targetWifeId,
          meta.currentDate,
          newSentimentTotal,
          `Thành thân đại hỷ, kết tóc se duyên cùng Lương Diễn`
        ]
      );

      const narrativeVi = `Cử hành hôn lễ đại hỷ cùng ${character.name_vi}! Trống gõ rợp trời, tiệc rượu ba ngày ba đêm. Sính lễ ${dowryCash.toLocaleString()} Tiền đã giao nạp. Danh vọng gia tộc tăng thêm 25 điểm!`;

      return {
        success: true,
        marriageId,
        wifeId: targetWifeId,
        wifeNameVi: character.name_vi,
        wifeNameEn: character.name_en,
        dowryCashDeducted: dowryCash,
        dowryItemsDeducted: deductedItems,
        intimacy: sentiment.affinity,
        narrativeVi
      };
    });
  }

  // =========================================================================
  // 3. HOUSEHOLD MANAGEMENT & COHABITATION REST
  // =========================================================================

  public assignHouseholdRole(marriageId: string, role: HouseholdRole): void {
    const roleDescriptions: Record<HouseholdRole, string> = {
      HOUSEKEEPER: 'Tăng 30% tốc độ hồi phục thể lực khi nghỉ ngơi, duy trì hòa khí gia thất.',
      ENTERPRISE_SUPERVISOR: 'Gia tăng 15% hiệu suất sản nghiệp và triệt tiêu tỷ lệ hao hụt nguyên liệu.',
      STRATEGIC_ADVISOR: 'Gia tăng 25% điểm EXP Mưu Lược và Chính Trị cho con cái khi thụ giáo đại sư.',
      MILITARY_DEFENDER: 'Thân chinh áp tải tiêu xa thương đoàn, giảm trừ nguy cơ bị thảo khấu phục kích.'
    };

    const desc = roleDescriptions[role] || 'Trông nom gia thất.';
    const result = this.db.execute(
      'UPDATE family_spouses SET household_role = ?, role_effect_desc_vi = ?, updated_at = CURRENT_TIMESTAMP WHERE marriage_id = ?;',
      [role, desc, marriageId]
    );

    if (result.changes === 0) {
      throw new Error(`Không tìm thấy hôn ước ${marriageId} để phân công nội vụ!`);
    }
  }

  public restWithSpouse(marriageId: string): RestWithSpouseResult {
    const meta = this.getCampaignMeta();

    return this.db.transaction(() => {
      const spouse = this.db.queryOne<any>(
        "SELECT * FROM family_spouses WHERE marriage_id = ? AND status = 'MARRIED';",
        [marriageId]
      );
      if (!spouse) {
        throw new Error(`Không tìm thấy thê thất ${marriageId} đang chung sống!`);
      }

      const player = this.db.queryOne<any>(
        'SELECT fatigue, health, morale FROM player_state WHERE player_id = ?;',
        [spouse.husband_id]
      );
      if (!player) {
        throw new Error('Không tìm thấy trạng thái chủ nhân gia tộc!');
      }

      // Calculate Fatigue Recovery (boosted if HOUSEKEEPER)
      const isHousekeeper = spouse.household_role === 'HOUSEKEEPER';
      const fatigueRecovery = isHousekeeper ? 45 : 30;
      const moraleBoost = 5;

      const newFatigue = Math.max(0, Number(player.fatigue || 0) - fatigueRecovery);
      const newMorale = Math.min(100, Number(player.morale || 100) + moraleBoost);

      this.db.execute(
        'UPDATE player_state SET fatigue = ?, morale = ? WHERE player_id = ?;',
        [newFatigue, newMorale, spouse.husband_id]
      );

      // Pregnancy Roll (if not currently pregnant and health is high)
      let conceived = false;
      let pregnancyStage = Number(spouse.pregnancy_stage || 0);

      if (pregnancyStage === 0 && Number(player.health || 100) >= 70) {
        // 45% base conception chance
        const roll = Math.random();
        if (roll < 0.45) {
          conceived = true;
          pregnancyStage = 1;
          this.db.execute(
            'UPDATE family_spouses SET pregnancy_stage = 1, conception_turn = ? WHERE marriage_id = ?;',
            [meta.activeTurn, marriageId]
          );
        }
      }

      const narrativeVi = conceived
        ? `Đồng phòng cùng ${spouse.wife_name_vi}. Hồi phục ${fatigueRecovery} Thể Lực. Nương tử hỉ mạch hiển lộ, đã mang cốt nhục Lương thị!`
        : `An tĩnh nghỉ ngơi bên ${spouse.wife_name_vi}. Hồi phục ${fatigueRecovery} Thể Lực, tâm cảnh thư thái.`;

      return {
        success: true,
        spouseName: spouse.wife_name_vi,
        fatigueRecovered: fatigueRecovery,
        newFatigue,
        moraleBoost,
        conceived,
        pregnancyStage,
        narrativeVi
      };
    });
  }

  // =========================================================================
  // 4. PREGNANCY TICK & CHILDBIRTH
  // =========================================================================

  public advancePregnancyTick(turn?: number, gameDate?: string): void {
    const meta = this.getCampaignMeta();
    const activeTurn = turn || meta.activeTurn;

    this.db.transaction(() => {
      const pregnantSpouses = this.db.query<any>(
        "SELECT marriage_id, pregnancy_stage FROM family_spouses WHERE status = 'MARRIED' AND pregnancy_stage > 0 AND pregnancy_stage < 3;"
      );

      for (const s of pregnantSpouses) {
        const nextStage = Number(s.pregnancy_stage) + 1;
        this.db.execute(
          'UPDATE family_spouses SET pregnancy_stage = ?, updated_at = CURRENT_TIMESTAMP WHERE marriage_id = ?;',
          [nextStage, s.marriage_id]
        );
      }
    });
  }

  /**
   * Generates genetic attributes based on parental averages with [-3, +5] mutation and maternal perks.
   */
  public calculateGenetics(
    fatherStats: Record<string, number>,
    motherStats: Record<string, number>,
    motherId: string
  ): {
    inheritedStats: Record<string, number>;
    statBreakdown: Record<string, GeneticAttributeRoll>;
    innateTalents: string[];
  } {
    const attrKeys = ['war', 'int', 'com', 'ldr', 'pol', 'dip', 'cra', 'log'];
    const inheritedStats: Record<string, number> = {};
    const statBreakdown: Record<string, GeneticAttributeRoll> = {};
    const innateTalents: string[] = [];

    // Maternal trait perks mapping
    const maternalTraitMap: Record<string, { trait: string; bonusStat: string; bonusVal: number }> = {
      'NPC-0087': { trait: 'TLT-TIGER-HERITAGE', bonusStat: 'war', bonusVal: 2 },
      'NPC-0097': { trait: 'TLT-POETIC-GENIUS', bonusStat: 'int', bonusVal: 2 },
      'NPC-0081': { trait: 'TLT-SILK-ACUMEN', bonusStat: 'com', bonusVal: 2 },
      'NPC-0088': { trait: 'TLT-MASTER-ARTISAN', bonusStat: 'cra', bonusVal: 2 },
      'NPC-0089': { trait: 'TLT-HARMONIOUS-AESTHETIC', bonusStat: 'dip', bonusVal: 2 }
    };

    const traitConfig = maternalTraitMap[motherId];
    if (traitConfig) {
      innateTalents.push(traitConfig.trait);
    }

    for (const key of attrKeys) {
      const fStat = Number(fatherStats[key] || 50);
      const mStat = Number(motherStats[key] || 50);
      const parentMean = Math.floor((fStat + mStat) / 2);

      // Random mutation delta strictly clamped between -3 and +5
      const mutationDelta = Math.floor(Math.random() * 9) - 3; // -3 to +5

      let traitBonus = 0;
      if (traitConfig && traitConfig.bonusStat === key) {
        traitBonus = traitConfig.bonusVal;
      }

      // In childhood (age 0), attribute potential is scaled by 0.45 + mutation
      const finalStat = Math.max(15, Math.min(90, Math.floor(parentMean * 0.45) + mutationDelta + traitBonus));

      inheritedStats[key] = finalStat;
      statBreakdown[key] = {
        fatherStat: fStat,
        motherStat: mStat,
        mutationDelta,
        maternalTraitBonus: traitBonus > 0 ? traitBonus : undefined,
        finalStat
      };
    }

    return { inheritedStats, statBreakdown, innateTalents };
  }

  public birthChild(params: BirthChildParams): BirthChildResult {
    const meta = this.getCampaignMeta();

    return this.db.transaction(() => {
      // 1. Locate Mother
      const spouse = this.db.queryOne<any>(
        'SELECT * FROM family_spouses WHERE wife_id = ? LIMIT 1;',
        [params.motherId]
      );
      if (!spouse) {
        throw new Error(`Không tìm thấy hồ sơ người mẹ ${params.motherId} trong gia thất!`);
      }

      // 2. Fetch Father & Mother Stats
      const father = this.db.queryOne<any>(
        'SELECT war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM player_state WHERE player_id = ?;',
        [spouse.husband_id]
      ) || {};

      const motherChar = this.db.queryOne<any>(
        'SELECT war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM master_characters WHERE npc_id = ?;',
        [params.motherId]
      ) || {};

      const fatherStats: Record<string, number> = {
        war: Number(father.war_attr || 58),
        int: Number(father.int_attr || 61),
        com: Number(father.com_attr || 80),
        ldr: Number(father.ldr_attr || 71),
        pol: Number(father.pol_attr || 68),
        dip: Number(father.dip_attr || 74),
        cra: Number(father.cra_attr || 62),
        log: Number(father.log_attr || 70)
      };

      const motherStats: Record<string, number> = {
        war: Number(motherChar.war_attr || 30),
        int: Number(motherChar.int_attr || 75),
        com: Number(motherChar.com_attr || 65),
        ldr: Number(motherChar.ldr_attr || 50),
        pol: Number(motherChar.pol_attr || 60),
        dip: Number(motherChar.dip_attr || 70),
        cra: Number(motherChar.cra_attr || 60),
        log: Number(motherChar.log_attr || 50)
      };

      // 3. Roll Genetics
      const { inheritedStats, innateTalents } = this.calculateGenetics(fatherStats, motherStats, params.motherId);

      // 4. Gender & Authentic Han Naming
      const gender = params.gender || (Math.random() < 0.5 ? 'MALE' : 'FEMALE');

      let nameVi = (params.customName || '').trim();
      let nameEn = nameVi;
      let styleName = '';

      if (!nameVi) {
        const maleNames = ['Lương Vũ', 'Lương Chiêu', 'Lương Ninh', 'Lương Hạo', 'Lương Tĩnh', 'Lương Sách', 'Lương Quân'];
        const femaleNames = ['Lương Sương', 'Lương Uyển', 'Lương Dung', 'Lương Châu', 'Lương Nguyệt', 'Lương Diễm', 'Lương Thư'];
        nameVi = gender === 'MALE'
          ? maleNames[Math.floor(Math.random() * maleNames.length)]
          : femaleNames[Math.floor(Math.random() * femaleNames.length)];
        nameEn = nameVi;
      }

      styleName = gender === 'MALE' ? 'Tử Viễn' : 'Uyển Khanh';

      // 5. Insert Child Record
      const childId = `CHD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      this.db.execute(
        `INSERT INTO family_children (
          child_id, father_id, mother_id, mother_name_vi, name_vi, name_en, style_name,
          gender, birth_date, birth_turn, age,
          war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr,
          innate_talents_json, growth_focus, is_heir, status
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, 0,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, 'BALANCED', 0, 'INFANT'
        );`,
        [
          childId,
          spouse.husband_id,
          params.motherId,
          spouse.wife_name_vi,
          nameVi,
          nameEn,
          styleName,
          gender,
          meta.currentDate,
          meta.activeTurn,
          inheritedStats.war,
          inheritedStats.int,
          inheritedStats.com,
          inheritedStats.ldr,
          inheritedStats.pol,
          inheritedStats.dip,
          inheritedStats.cra,
          inheritedStats.log,
          JSON.stringify(innateTalents)
        ]
      );

      // 6. Register Genealogical Links
      const lineage = this.db.queryOne<any>('SELECT current_generation FROM family_lineage LIMIT 1;') || {
        current_generation: 1
      };

      this.db.execute(
        `INSERT INTO family_genealogy_tree (ancestor_id, descendant_id, relation_type, generation, notes)
         VALUES (?, ?, 'FATHER_CHILD', ?, ?);`,
        [spouse.husband_id, childId, lineage.current_generation, `Phụ tử huyết mạch (${nameVi})`]
      );

      this.db.execute(
        `INSERT INTO family_genealogy_tree (ancestor_id, descendant_id, relation_type, generation, notes)
         VALUES (?, ?, 'MOTHER_CHILD', ?, ?);`,
        [params.motherId, childId, lineage.current_generation, `Mẫu tử huyết mạch (${nameVi})`]
      );

      // 7. Reset Mother's Pregnancy Stage
      this.db.execute(
        'UPDATE family_spouses SET pregnancy_stage = 0, conception_turn = NULL WHERE wife_id = ?;',
        [params.motherId]
      );

      // 8. Increase Family Prestige
      this.db.execute(
        'UPDATE family_lineage SET family_prestige = family_prestige + 15 WHERE family_id = ?;',
        ['FAM-LIANG']
      );

      const narrativeVi = `Chúc mừng Lương thị thêm đinh! ${spouse.wife_name_vi} hạ sinh ${gender === 'MALE' ? 'quý tử' : 'ái nữ'} [${nameVi}]. Kế thừa trọn vẹn huyết mạch anh kiệt phụ mẫu!`;

      return {
        childId,
        fatherId: spouse.husband_id,
        motherId: params.motherId,
        motherNameVi: spouse.wife_name_vi,
        nameVi,
        nameEn,
        gender,
        styleName,
        inheritedStats,
        innateTalents,
        narrativeVi
      };
    });
  }

  // =========================================================================
  // 5. HEIR UPBRINGING & HISTORICAL MASTER MENTORSHIP
  // =========================================================================

  public setChildGrowthFocus(childId: string, focus: ChildGrowthFocus): void {
    const result = this.db.execute(
      'UPDATE family_children SET growth_focus = ?, updated_at = CURRENT_TIMESTAMP WHERE child_id = ?;',
      [focus, childId]
    );
    if (result.changes === 0) {
      throw new Error(`Không tìm thấy hài nhi ${childId} để thiết lập định hướng tu dưỡng!`);
    }
  }

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

  public ageChild(childId: string, years: number = 1): void {
    this.db.transaction(() => {
      const child = this.db.queryOne<any>(
        'SELECT age FROM family_children WHERE child_id = ?;',
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
    });
  }

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
      const logId = `LOG-MENTOR-${Date.now().toString(36).toUpperCase()}`;
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

  // =========================================================================
  // 6. DYNASTIC LINEAGE SUCCESSION PROTOCOL
  // =========================================================================

  /**
   * Seamlessly executes dynastic succession to chosen heir.
   * Transfers protagonist identity in player_state while preserving all treasury,
   * enterprises, warehouses, and gear without violating FK constraints or audit invariants.
   */
  public executeSuccession(params: SuccessionParams | SuccessionExecutionParams): SuccessionResult {
    const heirChildId = (params as SuccessionParams).heirId || params.heirChildId;
    if (!heirChildId) {
      throw new Error('Chưa chỉ định Thế Tử kế nghiệp (heirId / heirChildId)!');
    }

    const meta = this.getCampaignMeta();

    return this.db.transaction(() => {
      // 1. Locate Heir
      const heir = this.db.queryOne<any>(
        'SELECT * FROM family_children WHERE child_id = ?;',
        [heirChildId]
      );
      if (!heir) {
        throw new Error(`Không tìm thấy hồ sơ người kế nghiệp ${heirChildId}!`);
      }

      // 2. Locate Predecessor Protagonist
      const predecessor = this.db.queryOne<any>(
        'SELECT * FROM player_state WHERE player_id = ?;',
        ['PLY-0001']
      );
      if (!predecessor) {
        throw new Error('Không tìm thấy dữ liệu nhân vật PLY-0001 trong player_state!');
      }

      // 3. Compute Net Worth for Ancestor Memorial
      const liquidCash = Number(predecessor.liquid_cash || 0);
      const safeCash = Number(predecessor.safe_cash || 0);
      const totalCash = liquidCash + safeCash;

      const invRow = this.db.queryOne<any>(
        'SELECT SUM(quantity * unit_cost_basis) as total_val FROM inventory_items;'
      );
      const inventoryValuation = Number(invRow?.total_val || 0);
      const fixedCapital = Number(predecessor.fixed_capital || 0);
      const finalNetWorth = Math.round(totalCash + inventoryValuation + fixedCapital);

      const lineage = this.db.queryOne<any>(
        'SELECT current_generation FROM family_lineage LIMIT 1;'
      ) || { current_generation: 1 };
      const currentGen = Number(lineage.current_generation);

      // 4. Archive Predecessor into family_ancestors_archive
      const ancestorId = `ANC-GEN${currentGen}-${Date.now().toString(36).toUpperCase()}`;
      const posthumousTitle =
        currentGen === 1 ? 'Lương Thị Khởi Nghiệp Thái Tổ' : `Lương Thị Thế Tông Hoàng Khảo`;

      this.db.execute(
        `INSERT INTO family_ancestors_archive (
          ancestor_id, name, style_name, generation, reign_start_date, reign_end_date,
          reign_turns, retirement_age, final_net_worth, posthumous_title, achievements_json
        ) VALUES (
          ?, ?, ?, ?, '184-02-01', ?,
          ?, ?, ?, ?, ?
        );`,
        [
          ancestorId,
          predecessor.name,
          predecessor.style_name || 'Chí Viễn',
          currentGen,
          meta.currentDate,
          meta.activeTurn,
          Number(predecessor.age),
          finalNetWorth,
          posthumousTitle,
          JSON.stringify([
            'Sáng lập Lương thị cơ nghiệp',
            `Tích lũy ${totalCash.toLocaleString()} Tiền ngân khố`,
            `Gia sản định giá ${finalNetWorth.toLocaleString()} Tiền`
          ])
        ]
      );

      // 5. Transfer Identity in player_state (Zero FK breakage!)
      const heirAdultAge = Math.max(18, Number(heir.age || 18));
      this.db.execute(
        `UPDATE player_state
         SET name = ?,
             style_name = ?,
             age = ?,
             war_attr = ?,
             int_attr = ?,
             com_attr = ?,
             ldr_attr = ?,
             pol_attr = ?,
             dip_attr = ?,
             cra_attr = ?,
             log_attr = ?,
             health = 100,
             fatigue = 0,
             morale = 100
         WHERE player_id = 'PLY-0001';`,
        [
          heir.name_vi,
          heir.style_name || 'Kế Nghiệp',
          heirAdultAge,
          Math.min(120, Number(heir.war_attr)),
          Math.min(120, Number(heir.int_attr)),
          Math.min(120, Number(heir.com_attr)),
          Math.min(120, Number(heir.ldr_attr)),
          Math.min(120, Number(heir.pol_attr)),
          Math.min(120, Number(heir.dip_attr)),
          Math.min(120, Number(heir.cra_attr)),
          Math.min(120, Number(heir.log_attr))
        ]
      );

      // 6. Succession Ledger Continuity (Maintains 140/140 audit invariants!)
      const txnId = `TXN-SUCC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      this.db.execute(
        `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
         VALUES (?, ?, ?, 'DYNASTY_SUCCESSION', 0, 0, ?, ?, 'Confirmed');`,
        [
          txnId,
          meta.currentDate,
          `Thế Tử Kế Vị (${heir.name_vi})`,
          totalCash,
          `Truyền thừa gia nghiệp ngân khố thế hệ ${currentGen + 1}`
        ]
      );

      this.db.execute(
        `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
         VALUES (?, ?, ?, '3001_OWNER_EQUITY', 0, 0, 'Truyền thừa gia sản thế hệ mới');`,
        [txnId, meta.campaignId, meta.currentDate]
      );

      this.db.execute(
        `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
         VALUES (?, ?, ?, '3001_OWNER_EQUITY', 0, 0, 'Tiếp nhận ấn tín gia tộc');`,
        [txnId, meta.campaignId, meta.currentDate]
      );

      // 7. Advance Generation & Update Lineage Records
      this.db.execute(
        'UPDATE family_lineage SET current_generation = current_generation + 1, family_prestige = family_prestige + 50 WHERE family_id = ?;',
        ['FAM-LIANG']
      );

      this.db.execute(
        "UPDATE family_children SET status = 'SUCCESSOR_RULER', is_heir = 1 WHERE child_id = ?;",
        [heirChildId]
      );

      // Count verified assets preserved
      const enterprises = this.db.query<any>(
        "SELECT COUNT(*) as count FROM businesses WHERE owner_character_id = 'PLY-0001';"
      );
      const enterpriseCount = Number(enterprises[0]?.count || 0);

      const gear = this.db.query<any>(
        "SELECT COUNT(*) as count FROM character_equipment WHERE character_id = 'PLY-0001';"
      );
      const gearCount = Number(gear[0]?.count || 0);

      const narrativeVi = `Đại lễ truyền thừa gia nghiệp hoàn tất! ${predecessor.name} cáo lão thoái ẩn, thụ phong [${posthumousTitle}]. Thế tử ${heir.name_vi} tiếp nhận gia chủ đời thứ ${currentGen + 1}! Toàn bộ ngân khố ${totalCash.toLocaleString()} Tiền, ${enterpriseCount} sản nghiệp và thần binh được bảo tồn vẹn nguyên!`;

      return {
        success: true,
        predecessorName: predecessor.name,
        newProtagonistName: heir.name_vi,
        generation: currentGen + 1,
        inheritedCash: totalCash,
        inheritedEnterprisesCount: enterpriseCount,
        inheritedInventoryValuation: inventoryValuation,
        inheritedGearCount: gearCount,
        narrativeVi
      };
    });
  }
}
