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

export interface ActivityEncounterParams {
  characterId?: string;
  actionType: string;
  facilityType: string;
  settlementId: string;
  gameDate?: string;
}

export interface ActivityEncounterResult {
  encountered: boolean;
  rateApplied?: {
    rateId: string;
    baseProbability: number;
    modifierProsperity: number;
    modifierCharm: number;
    finalProbability: number;
    roll: number;
  };
  maiden?: {
    maidenId: string;
    nameVi: string;
    nameEn: string;
    socialStratum: string;
    personality: string;
    maternalTraitNameVi: string;
    clueVi: string;
    dowryCash: number;
  };
  narrativeVi: string;
}

export interface AutonomousMarriageResult {
  husbandId: string;
  husbandNameVi: string;
  wifeId: string;
  wifeNameVi: string;
  socialStratum: string;
  marriageTurn: number;
  dowryCash: number;
  narrativeVi: string;
}

export interface AutonomousChildbirthResult {
  childId: string;
  fatherId: string;
  fatherNameVi: string;
  motherId: string;
  motherNameVi: string;
  nameVi: string;
  gender: 'MALE' | 'FEMALE';
  inheritedStats: Record<string, number>;
  narrativeVi: string;
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
  socialStratum?: string;
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
  isCharacterInActiveExpedition(characterId: string): boolean;
  evaluateNpcMarriageReadiness(npcId: string): { ready: boolean; reasonVi: string };
  triggerActivityEncounter(params: ActivityEncounterParams): ActivityEncounterResult;
  simulateAutonomousNpcMarriages(turnNumber: number, gameDate: string): AutonomousMarriageResult[];
  simulateAutonomousNpcChildbirth(turnNumber: number, gameDate: string): {
    births: AutonomousChildbirthResult[];
    conceptions: string[];
  };
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

        -- 7. Civilian Maidens & Stratum Registry
        CREATE TABLE IF NOT EXISTS civilian_maidens (
            maiden_id TEXT PRIMARY KEY,
            name_vi TEXT NOT NULL,
            name_en TEXT NOT NULL,
            settlement_id TEXT NOT NULL,
            social_stratum TEXT NOT NULL,
            father_profession_vi TEXT NOT NULL,
            dowry_cash INTEGER NOT NULL CHECK (dowry_cash >= 0),
            dowry_item_code TEXT,
            dowry_item_qty INTEGER DEFAULT 0,
            maternal_trait_code TEXT NOT NULL,
            maternal_trait_name_vi TEXT NOT NULL,
            maternal_trait_desc_vi TEXT NOT NULL,
            bonus_stat TEXT NOT NULL,
            bonus_val INTEGER DEFAULT 2,
            clue_vi TEXT NOT NULL,
            clue_en TEXT NOT NULL,
            is_married INTEGER DEFAULT 0 CHECK (is_married IN (0, 1)),
            husband_id TEXT,
            personality TEXT NOT NULL DEFAULT 'PRAGMATIC',
            motivation TEXT NOT NULL DEFAULT 'FAMILY_SECURITY',
            war_attr INTEGER NOT NULL DEFAULT 30,
            int_attr INTEGER NOT NULL DEFAULT 50,
            com_attr INTEGER NOT NULL DEFAULT 50,
            ldr_attr INTEGER NOT NULL DEFAULT 40,
            pol_attr INTEGER NOT NULL DEFAULT 40,
            dip_attr INTEGER NOT NULL DEFAULT 50,
            cra_attr INTEGER NOT NULL DEFAULT 50,
            log_attr INTEGER NOT NULL DEFAULT 40,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_maidens_settlement ON civilian_maidens(settlement_id);
        CREATE INDEX IF NOT EXISTS idx_maidens_married ON civilian_maidens(is_married);
        CREATE INDEX IF NOT EXISTS idx_maidens_stratum ON civilian_maidens(social_stratum);

        -- 8. Activity Location Probabilistic Encounter Rates
        CREATE TABLE IF NOT EXISTS location_encounter_rates (
            rate_id TEXT PRIMARY KEY,
            settlement_id TEXT NOT NULL DEFAULT 'ALL',
            facility_type TEXT NOT NULL,
            action_type TEXT NOT NULL,
            social_stratum TEXT NOT NULL,
            base_probability REAL NOT NULL CHECK (base_probability >= 0.0 AND base_probability <= 1.0),
            min_player_prestige INTEGER DEFAULT 0,
            cooldown_days INTEGER DEFAULT 7,
            notes TEXT,
            UNIQUE(settlement_id, facility_type, action_type, social_stratum)
        );
        CREATE INDEX IF NOT EXISTS idx_encounter_lookup ON location_encounter_rates(settlement_id, facility_type, action_type);
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

  /**
   * Checks whether a character (player or NPC) is actively commanding a military expedition in the field.
   * Hard constraint: Warfare strictly blocks marriage, cohabitation, and conception!
   */
  public isCharacterInActiveExpedition(characterId: string): boolean {
    try {
      const active = this.db.queryOne<any>(
        "SELECT expedition_id FROM military_expeditions WHERE commander_id = ? AND status != 'CONCLUDED' LIMIT 1;",
        [characterId]
      );
      return !!active;
    } catch {
      return false;
    }
  }

  /**
   * Evaluates procedural marriage feasibility between two individuals.
   */
  public checkMarriageFeasibility(husbandId: string, wifeId: string): { allowed: boolean; reasonVi?: string } {
    if (this.isCharacterInActiveExpedition(husbandId)) {
      return {
        allowed: false,
        reasonVi: 'Đang thân chinh thống lĩnh quân vụ sa trường, quân lệnh như sơn, không thể cử hành hôn lễ lúc này!'
      };
    }
    if (this.isCharacterInActiveExpedition(wifeId)) {
      return {
        allowed: false,
        reasonVi: 'Đối phương đang thống lĩnh quân vụ nơi tiền tuyến, không thể kết tóc se duyên!'
      };
    }
    const existing = this.db.queryOne<any>(
      "SELECT marriage_id FROM family_spouses WHERE (wife_id = ? OR husband_id = ?) AND status = 'MARRIED' LIMIT 1;",
      [wifeId, husbandId]
    );
    if (existing) {
      return {
        allowed: false,
        reasonVi: 'Một trong hai bên đã kết tóc se duyên, không thể tái giá hoặc trùng hôn!'
      };
    }
    return { allowed: true };
  }

  /**
   * Evaluates autonomous psychological & situational readiness of an officer to form a family.
   */
  public evaluateNpcMarriageReadiness(npcId: string): { ready: boolean; reasonVi: string } {
    if (this.isCharacterInActiveExpedition(npcId)) {
      return {
        ready: false,
        reasonVi: 'Đang thân chinh nơi tiền tuyến sa trường, toàn tâm vì quân vụ.'
      };
    }

    const char = this.db.queryOne<any>('SELECT * FROM master_characters WHERE npc_id = ?;', [npcId]);
    const age = char ? Number(char.baseline_age || 20) : 20;
    const personality = (char?.personality || 'PRAGMATIC').toUpperCase();

    const officer = this.db.queryOne<any>('SELECT court_rank FROM faction_officers WHERE officer_id = ? LIMIT 1;', [npcId]);
    const courtRank = officer?.court_rank || 'OFFICER';

    const prog = this.db.queryOne<any>('SELECT prestige FROM npc_personal_progression WHERE npc_id = ?;', [npcId]);
    const prestige = prog ? Number(prog.prestige) : 50;

    const martialPersonalities = ['VALIANT', 'FIERCE', 'AMBITIOUS'];
    if (martialPersonalities.includes(personality)) {
      const hasHighRank = ['RULER', 'CHIEF_COMMANDER', 'GENERAL', 'GOVERNOR'].includes(courtRank);
      if (age < 30 && !hasHighRank && prestige < 150) {
        return {
          ready: false,
          reasonVi: 'Chí lớn chưa thành, giặc loạn chưa yên, há có thể bận lòng chuyện nhi nữ thường tình!'
        };
      }
    } else if (personality === 'SCHOLARLY' || personality === 'HONORABLE') {
      if (age < 22) {
        return {
          ready: false,
          reasonVi: 'Tu dưỡng lễ nghi, dùi mài kinh sử chưa tròn, chưa đến thời điểm hợp lễ.'
        };
      }
    } else {
      if (age < 18) {
        return {
          ready: false,
          reasonVi: 'Chưa đủ tuổi thành niên (dưới 18).'
        };
      }
    }

    return { ready: true, reasonVi: 'Tâm nguyện an cư lạc nghiệp, sẵn sàng thành gia lập thất.' };
  }

  /**
   * Extracts authentic Chinese single or compound surname from full Vietnamese transcription.
   */
  public extractAuthenticSurname(fullName: string): string {
    if (!fullName) return 'Lương';
    const trimmed = fullName.trim();
    const compoundSurnames = [
      'Gia Cát',
      'Hạ Hầu',
      'Tư Mã',
      'Âu Dương',
      'Độc Cô',
      'Hoàng Phủ',
      'Thượng Quan',
      'Chư Cát',
      'Công Tôn'
    ];
    for (const comp of compoundSurnames) {
      if (trimmed.startsWith(comp)) {
        return comp;
      }
    }
    const parts = trimmed.split(/\s+/);
    return parts[0] || 'Lương';
  }

  /**
   * Procedurally generates culturally authentic Han names incorporating father's authentic surname.
   */
  public generateChildHanName(fatherName: string, gender: 'MALE' | 'FEMALE'): { nameVi: string; nameEn: string; styleName: string } {
    const surname = this.extractAuthenticSurname(fatherName);
    const maleGiven = ['Hưng', 'Bào', 'Thống', 'Bình', 'Hạo', 'Minh', 'Kế', 'Tùng', 'Đạt', 'Vũ', 'Ninh', 'Sách'];
    const femaleGiven = ['Uyển', 'Nguyệt', 'Hương', 'Lan', 'Dung', 'Châu', 'Trâm', 'Khanh', 'Sương', 'Diễm', 'Thư'];
    const givenList = gender === 'MALE' ? maleGiven : femaleGiven;
    const given = givenList[Math.floor(Math.random() * givenList.length)];
    const fullName = `${surname} ${given}`;
    const styleName = gender === 'MALE' ? 'Tử Viễn' : 'Uyển Khanh';
    return { nameVi: fullName, nameEn: fullName, styleName };
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

    const candidates: CourtshipCandidateDTO[] = prominentHeroines.map(h => {
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
        socialStratum: 'HISTORICAL_HEROINE',
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

    // Append unmarried civilian maidens across all social strata
    try {
      const maidens = this.db.query<any>(
        'SELECT * FROM civilian_maidens WHERE is_married = 0;'
      );

      for (const m of maidens) {
        const locRow = this.db.queryOne<any>(
          'SELECT name_vi, name_en FROM session_settlements WHERE settlement_id = ?;',
          [m.settlement_id]
        ) || this.db.queryOne<any>(
          'SELECT name_vi, name_en FROM master_locations WHERE location_id = ?;',
          [m.settlement_id]
        );
        const locationNameVi = locRow?.name_vi || m.settlement_id;
        const locationNameEn = locRow?.name_en || m.settlement_id;

        const isEncountered = this.hasEncounteredNpc(m.maiden_id);
        let affinity = 0;
        let respect = 0;
        let relationshipTitleVi = 'Chưa Tương Ngộ (Chưa Gặp)';
        let relationshipTitleEn = 'Unencountered (Unknown)';

        if (isEncountered) {
          try {
            const sentiment = kizunaEngine.getNpcSentiment(m.maiden_id);
            affinity = sentiment.affinity;
            respect = sentiment.respect;
            relationshipTitleVi = sentiment.titleVi;
            relationshipTitleEn = sentiment.titleEn;
          } catch {
            affinity = 35;
            respect = 30;
            relationshipTitleVi = 'Sơ Giao';
            relationshipTitleEn = 'Acquaintance';
          }
        }

        const isAlreadyMarried = activeSpouseIds.has(m.maiden_id);
        const canPropose = isEncountered && affinity >= 80 && !isAlreadyMarried;

        candidates.push({
          npcId: m.maiden_id,
          nameVi: m.name_vi,
          nameEn: m.name_en,
          socialStratum: m.social_stratum,
          baselineLocation: m.settlement_id,
          locationNameVi,
          locationNameEn,
          clueVi: m.clue_vi,
          clueEn: m.clue_en,
          keyStats: {
            war: Number(m.war_attr || 30),
            int: Number(m.int_attr || 50),
            com: Number(m.com_attr || 50),
            ldr: Number(m.ldr_attr || 40),
            pol: Number(m.pol_attr || 40),
            dip: Number(m.dip_attr || 50),
            cra: Number(m.cra_attr || 50)
          },
          isEncountered,
          affinity,
          respect,
          relationshipTitleVi,
          relationshipTitleEn,
          canPropose,
          recommendedDowryCash: Number(m.dowry_cash || 500),
          recommendedDowryItems: m.dowry_item_code
            ? [{ itemCode: m.dowry_item_code, itemNameVi: m.dowry_item_code, quantity: Number(m.dowry_item_qty || 1) }]
            : [],
          maternalTraitPerk: {
            traitCode: m.maternal_trait_code,
            traitNameVi: m.maternal_trait_name_vi,
            descriptionVi: m.maternal_trait_desc_vi
          }
        });
      }
    } catch {
      // Table might not exist yet in early boot
    }

    return candidates;
  }

  /**
   * Evaluates and triggers activity-driven probabilistic encounters with civilian maidens
   * across social strata (PEASANT, ARTISAN_SHOP, GENTRY_CLAN) based on location rates.
   */
  public triggerActivityEncounter(params: ActivityEncounterParams): ActivityEncounterResult {
    const characterId = params.characterId || 'PLY-0001';
    const meta = this.getCampaignMeta();
    const gameDate = params.gameDate || meta.currentDate;

    // 1. Look up encounter rate from location_encounter_rates
    const rateRow = this.db.queryOne<any>(
      `SELECT * FROM location_encounter_rates 
       WHERE facility_type = ? 
         AND (action_type = ? OR action_type = 'ANY')
         AND (settlement_id = ? OR settlement_id = 'ALL')
       ORDER BY (settlement_id = ?) DESC, RANDOM() LIMIT 1;`,
      [params.facilityType, params.actionType, params.settlementId, params.settlementId]
    );

    if (!rateRow) {
      return {
        encountered: false,
        narrativeVi: `Tại ${params.facilityType} vùng ${params.settlementId}, phố phường thanh bình, không có biến cố tương ngộ đặc biệt nào.`
      };
    }

    // 2. Prestige Check
    const minPrestige = Number(rateRow.min_player_prestige || 0);
    if (minPrestige > 0) {
      let currentPrestige = 100;
      if (characterId === 'PLY-0001') {
        const fam = this.db.queryOne<any>('SELECT family_prestige FROM family_lineage LIMIT 1;');
        currentPrestige = Number(fam?.family_prestige || 100);
      } else {
        const prog = this.db.queryOne<any>('SELECT prestige FROM npc_personal_progression WHERE npc_id = ?;', [characterId]);
        currentPrestige = Number(prog?.prestige || 50);
      }
      if (currentPrestige < minPrestige) {
        return {
          encountered: false,
          narrativeVi: `Thân phận chưa đủ hiển đạt (Uy vọng hiện tại: ${currentPrestige}, yêu cầu: ${minPrestige}) để tiếp cận giai tầng ${rateRow.social_stratum}.`
        };
      }
    }

    // 3. Dynamic Modifiers Calculation
    let modProsperity = 1.0;
    try {
      const settRow = this.db.queryOne<any>(
        'SELECT public_order, agriculture, commerce, treasury_cash FROM session_settlements WHERE settlement_id = ?;',
        [params.settlementId]
      );
      if (settRow) {
        const pubOrderRatio = Number(settRow.public_order || 80) / 80.0;
        if (rateRow.social_stratum === 'PEASANT') {
          const agriRatio = Number(settRow.agriculture || 60) / 60.0;
          modProsperity = Math.max(0.7, Math.min(1.3, agriRatio * pubOrderRatio));
        } else if (rateRow.social_stratum === 'ARTISAN_SHOP') {
          const comRatio = Number(settRow.commerce || 60) / 60.0;
          modProsperity = Math.max(0.7, Math.min(1.3, comRatio * pubOrderRatio));
        } else {
          const gentryRatio = Math.min(1.3, Number(settRow.treasury_cash || 10000) / 10000.0);
          modProsperity = Math.max(0.7, Math.min(1.3, gentryRatio * pubOrderRatio));
        }
      }
    } catch {
      // Tolerate missing settlement tables in isolated unit tests
    }

    let charDip = 70;
    try {
      if (characterId === 'PLY-0001') {
        const player = this.db.queryOne<any>('SELECT dip_attr FROM player_state WHERE player_id = ?;', [characterId]);
        charDip = Number(player?.dip_attr || 70);
      } else {
        const char = this.db.queryOne<any>('SELECT dip_attr FROM master_characters WHERE npc_id = ?;', [characterId]);
        charDip = Number(char?.dip_attr || 50);
      }
    } catch {
      // Fallback
    }
    const modCharm = Math.max(0.8, Math.min(1.3, 1.0 + (charDip - 50) * 0.005));

    const baseProb = Number(rateRow.base_probability);
    const finalProb = Math.min(0.95, Math.max(0.01, baseProb * modProsperity * modCharm));
    const roll = Math.random();

    if (roll > finalProb) {
      return {
        encountered: false,
        rateApplied: {
          rateId: rateRow.rate_id,
          baseProbability: baseProb,
          modifierProsperity: Number(modProsperity.toFixed(3)),
          modifierCharm: Number(modCharm.toFixed(3)),
          finalProbability: Number(finalProb.toFixed(3)),
          roll: Number(roll.toFixed(3))
        },
        narrativeVi: `Hoạt động ${params.actionType} tại ${params.facilityType} diễn ra bình ổn, không tương ngộ giai nhân nào.`
      };
    }

    // 4. Locate an unmarried maiden in this stratum and settlement
    const maiden = this.db.queryOne<any>(
      `SELECT * FROM civilian_maidens 
       WHERE is_married = 0 
         AND social_stratum = ? 
         AND (settlement_id = ? OR settlement_id IS NOT NULL)
       ORDER BY (settlement_id = ?) DESC, RANDOM() 
       LIMIT 1;`,
      [rateRow.social_stratum, params.settlementId, params.settlementId]
    );

    if (!maiden) {
      return {
        encountered: false,
        rateApplied: {
          rateId: rateRow.rate_id,
          baseProbability: baseProb,
          modifierProsperity: Number(modProsperity.toFixed(3)),
          modifierCharm: Number(modCharm.toFixed(3)),
          finalProbability: Number(finalProb.toFixed(3)),
          roll: Number(roll.toFixed(3))
        },
        narrativeVi: `Giai tầng ${rateRow.social_stratum} tại địa phương hiện không có khuê nữ nào chưa xuất giá.`
      };
    }

    // 5. Unlock maiden in intel fog and relationship deltas
    try {
      this.db.execute(`
        INSERT INTO npc_intel_fog (npc_id, intel_level, interaction_count, current_mood)
        VALUES (?, 2, 1, 'CHEERFUL')
        ON CONFLICT(npc_id) DO UPDATE SET interaction_count = interaction_count + 1;
      `, [maiden.maiden_id]);

      this.db.execute(`
        INSERT INTO npc_relationship_deltas (
          npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes
        ) VALUES (?, ?, 35, 35, 'ACQUAINTANCE', ?);
      `, [
        maiden.maiden_id,
        gameDate,
        `Tương ngộ ngẫu nhiên khi tham gia ${params.actionType} tại ${params.facilityType} (${params.settlementId})`
      ]);
    } catch {
      // Table update error tolerance
    }

    const narrativeVi = `Duyên định tương ngộ! Tại ${params.facilityType} (${params.settlementId}), bạn tình cờ gặp gỡ ${maiden.name_vi} (${maiden.father_profession_vi}). Tính tình ${maiden.personality}, khí sắc đoan trang!`;

    return {
      encountered: true,
      rateApplied: {
        rateId: rateRow.rate_id,
        baseProbability: baseProb,
        modifierProsperity: Number(modProsperity.toFixed(3)),
        modifierCharm: Number(modCharm.toFixed(3)),
        finalProbability: Number(finalProb.toFixed(3)),
        roll: Number(roll.toFixed(3))
      },
      maiden: {
        maidenId: maiden.maiden_id,
        nameVi: maiden.name_vi,
        nameEn: maiden.name_en,
        socialStratum: maiden.social_stratum,
        personality: maiden.personality,
        maternalTraitNameVi: maiden.maternal_trait_name_vi,
        clueVi: maiden.clue_vi,
        dowryCash: Number(maiden.dowry_cash)
      },
      narrativeVi
    };
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
      // 1. Check existing marriage & active military expedition blockers
      const feas = this.checkMarriageFeasibility(playerId, targetWifeId);
      if (!feas.allowed) {
        throw new Error(feas.reasonVi || 'Không thể thành hôn vào lúc này!');
      }

      // 2. Check candidate existence (historical heroine or civilian maiden)
      let character = this.db.queryOne<any>(
        'SELECT npc_id, name_vi, name_en, personality FROM master_characters WHERE npc_id = ?;',
        [targetWifeId]
      );

      let isCivilianMaiden = false;
      let maidenRow: any = null;

      if (!character) {
        maidenRow = this.db.queryOne<any>(
          'SELECT maiden_id, name_vi, name_en, dowry_cash, personality, father_profession_vi, is_married FROM civilian_maidens WHERE maiden_id = ?;',
          [targetWifeId]
        );
        if (maidenRow) {
          isCivilianMaiden = true;
          character = {
            npc_id: maidenRow.maiden_id,
            name_vi: maidenRow.name_vi,
            name_en: maidenRow.name_en,
            personality: maidenRow.personality
          };
          if (Number(maidenRow.is_married) === 1) {
            throw new Error(`Khuê nữ ${maidenRow.name_vi} đã xuất giá, không thể cầu hôn!`);
          }
        } else {
          throw new Error(`Không tìm thấy hồ sơ mỹ nhân ${targetWifeId} trong thiên hạ lục!`);
        }
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

      // 5. Check Candidate Personality Requirements
      if (character.personality === 'VALIANT' && targetWifeId === 'NPC-0087') {
        const playerStats = this.db.queryOne<any>('SELECT war_attr FROM player_state WHERE player_id = ?;', [playerId]);
        const fam = this.db.queryOne<any>('SELECT family_prestige FROM family_lineage LIMIT 1;');
        const warVal = Number(playerStats?.war_attr || 50);
        const prestigeVal = Number(fam?.family_prestige || 50);
        if (warVal < 60 && prestigeVal < 100) {
          throw new Error('Tôn Thượng Hương tính tình kiêu dũng, yêu thích đao cung võ bị, yêu cầu phu quân phải có danh vọng võ huân hiển hách (Võ Lực ≥ 60 hoặc Uy Vọng Gia Tộc ≥ 100)!');
        }
      }

      // 6. Verify Treasury Cash
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

      // 7. Verify and deduct Dowry Items (if any)
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

      // 8. Deduct Cash & Log Double-Entry Accounting
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

      // 9. Update Civilian Maiden Registry if applicable
      if (isCivilianMaiden) {
        this.db.execute(
          'UPDATE civilian_maidens SET is_married = 1, husband_id = ? WHERE maiden_id = ?;',
          [playerId, targetWifeId]
        );
      }

      // 10. Register Marriage
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

      // Check active military expedition blocker
      if (this.isCharacterInActiveExpedition(spouse.husband_id)) {
        throw new Error('Không thể đồng phòng nghỉ ngơi vì phu quân đang thống lĩnh binh mã tại chiến trường sa trường!');
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

    let traitConfig = maternalTraitMap[motherId];
    if (!traitConfig && motherId) {
      try {
        const maidenRow = this.db.queryOne<any>(
          'SELECT maternal_trait_code, bonus_stat, bonus_val FROM civilian_maidens WHERE maiden_id = ?;',
          [motherId]
        );
        if (maidenRow) {
          traitConfig = {
            trait: maidenRow.maternal_trait_code,
            bonusStat: maidenRow.bonus_stat,
            bonusVal: Number(maidenRow.bonus_val || 2)
          };
        }
      } catch {
        // Table might not exist in isolated unit mocks
      }
    }

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
      let fatherStats: Record<string, number> = {
        war: 58, int: 61, com: 80, ldr: 71, pol: 68, dip: 74, cra: 62, log: 70
      };

      if (spouse.husband_id === 'PLY-0001') {
        const father = this.db.queryOne<any>(
          'SELECT war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM player_state WHERE player_id = ?;',
          [spouse.husband_id]
        );
        if (father) {
          fatherStats = {
            war: Number(father.war_attr || 58),
            int: Number(father.int_attr || 61),
            com: Number(father.com_attr || 80),
            ldr: Number(father.ldr_attr || 71),
            pol: Number(father.pol_attr || 68),
            dip: Number(father.dip_attr || 74),
            cra: Number(father.cra_attr || 62),
            log: Number(father.log_attr || 70)
          };
        }
      } else {
        const father = this.db.queryOne<any>(
          'SELECT war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM master_characters WHERE npc_id = ?;',
          [spouse.husband_id]
        ) || this.db.queryOne<any>(
          'SELECT war_attr, int_attr, com_attr, ldr_attr, pol_attr, cra_attr FROM npc_state WHERE npc_id = ?;',
          [spouse.husband_id]
        );
        if (father) {
          fatherStats = {
            war: Number(father.war_attr || 50),
            int: Number(father.int_attr || 50),
            com: Number(father.com_attr || 50),
            ldr: Number(father.ldr_attr || 50),
            pol: Number(father.pol_attr || 50),
            dip: Number(father.dip_attr || 50),
            cra: Number(father.cra_attr || 50),
            log: Number(father.log_attr || 50)
          };
        }
      }

      let motherChar = this.db.queryOne<any>(
        'SELECT war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM master_characters WHERE npc_id = ?;',
        [params.motherId]
      );
      if (!motherChar) {
        motherChar = this.db.queryOne<any>(
          'SELECT war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM civilian_maidens WHERE maiden_id = ?;',
          [params.motherId]
        );
      }

      const motherStats: Record<string, number> = {
        war: Number(motherChar?.war_attr || 30),
        int: Number(motherChar?.int_attr || 50),
        com: Number(motherChar?.com_attr || 50),
        ldr: Number(motherChar?.ldr_attr || 40),
        pol: Number(motherChar?.pol_attr || 40),
        dip: Number(motherChar?.dip_attr || 50),
        cra: Number(motherChar?.cra_attr || 50),
        log: Number(motherChar?.log_attr || 40)
      };

      // 3. Roll Genetics
      const { inheritedStats, innateTalents } = this.calculateGenetics(fatherStats, motherStats, params.motherId);

      // 4. Gender & Authentic Han Naming
      const gender = params.gender || (Math.random() < 0.5 ? 'MALE' : 'FEMALE');

      let nameVi = (params.customName || '').trim();
      let nameEn = nameVi;
      let styleName = '';

      if (!nameVi) {
        let fatherName = 'Lương Diễn';
        if (spouse.husband_id === 'PLY-0001') {
          const p = this.db.queryOne<any>('SELECT name FROM player_state WHERE player_id = ?;', [spouse.husband_id]);
          if (p?.name) fatherName = p.name;
        } else {
          const n = this.db.queryOne<any>('SELECT name_vi FROM master_characters WHERE npc_id = ?;', [spouse.husband_id]);
          if (n?.name_vi) fatherName = n.name_vi;
        }
        const naming = this.generateChildHanName(fatherName, gender);
        nameVi = naming.nameVi;
        nameEn = naming.nameEn;
        styleName = naming.styleName;
      } else {
        styleName = gender === 'MALE' ? 'Tử Viễn' : 'Uyển Khanh';
      }

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

      // 8. Increase Family Prestige (only for Liang protagonist dynasty)
      if (spouse.husband_id === 'PLY-0001') {
        this.db.execute(
          'UPDATE family_lineage SET family_prestige = family_prestige + 15 WHERE family_id = ?;',
          ['FAM-LIANG']
        );
      }

      const narrativeVi = `Chúc mừng thêm đinh! ${spouse.wife_name_vi} hạ sinh ${gender === 'MALE' ? 'quý tử' : 'ái nữ'} [${nameVi}]. Kế thừa trọn vẹn huyết mạch anh kiệt phụ mẫu!`;

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

  /**
   * Autonomous NPC Marriage Simulation:
   * Non-player officers evaluate their psychological readiness, active military campaign status,
   * rank, age, personal wealth, and court civilian maidens across settlements.
   */
  public simulateAutonomousNpcMarriages(turnNumber: number, gameDate: string): AutonomousMarriageResult[] {
    const results: AutonomousMarriageResult[] = [];

    return this.db.transaction(() => {
      const marriedHusbands = new Set(
        this.db.query<any>("SELECT husband_id FROM family_spouses WHERE status = 'MARRIED';").map(r => r.husband_id)
      );

      // Query eligible officers across factions who are not the player
      const candidateNpcs = this.db.query<any>(
        `SELECT DISTINCT mc.npc_id, mc.name_vi, mc.personality, mc.baseline_age
         FROM master_characters mc
         WHERE mc.npc_id NOT LIKE 'MDN-%'
           AND mc.npc_id NOT IN ('NPC-0081', 'NPC-0087', 'NPC-0088', 'NPC-0089', 'NPC-0097');`
      );

      for (const char of candidateNpcs) {
        const npcId = char.npc_id;
        if (marriedHusbands.has(npcId)) continue;

        // Psychological & military expedition readiness evaluation
        const readiness = this.evaluateNpcMarriageReadiness(npcId);
        if (!readiness.ready) continue;

        // Financial capacity check from npc_personal_progression
        let prog = this.db.queryOne<any>('SELECT personal_cash FROM npc_personal_progression WHERE npc_id = ?;', [npcId]);
        let personalCash = prog ? Number(prog.personal_cash) : 600;

        // Find an unmarried maiden whose dowry_cash <= personalCash
        const maiden = this.db.queryOne<any>(
          'SELECT * FROM civilian_maidens WHERE is_married = 0 AND dowry_cash <= ? ORDER BY dowry_cash ASC LIMIT 1;',
          [personalCash]
        );
        if (!maiden) continue;

        // Verify procedural feasibility
        const feas = this.checkMarriageFeasibility(npcId, maiden.maiden_id);
        if (!feas.allowed) continue;

        // Execute autonomous marriage
        const dowryCash = Number(maiden.dowry_cash);
        if (prog) {
          this.db.execute(
            'UPDATE npc_personal_progression SET personal_cash = personal_cash - ? WHERE npc_id = ?;',
            [dowryCash, npcId]
          );
        }

        this.db.execute(
          'UPDATE civilian_maidens SET is_married = 1, husband_id = ? WHERE maiden_id = ?;',
          [npcId, maiden.maiden_id]
        );

        const marriageId = `MARR-${npcId}-${Date.now().toString(36).toUpperCase()}`;
        this.db.execute(
          `INSERT INTO family_spouses (
            marriage_id, husband_id, wife_id, wife_name_vi, wife_name_en,
            marriage_date, marriage_turn, dowry_cash, dowry_items_json,
            intimacy, status, pregnancy_stage, household_role, role_effect_desc_vi
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', 85, 'MARRIED', 0, 'HOUSEKEEPER', 'Trông nom gia thất thuận hòa.');`,
          [
            marriageId,
            npcId,
            maiden.maiden_id,
            maiden.name_vi,
            maiden.name_en,
            gameDate,
            turnNumber,
            dowryCash
          ]
        );

        marriedHusbands.add(npcId);

        const narrativeVi = `${char.name_vi} thành gia lập thất cùng ${maiden.name_vi} (${maiden.father_profession_vi}). Sính lễ ${dowryCash.toLocaleString()} Tiền. Gia đạo hòa hợp.`;
        results.push({
          husbandId: npcId,
          husbandNameVi: char.name_vi,
          wifeId: maiden.maiden_id,
          wifeNameVi: maiden.name_vi,
          socialStratum: maiden.social_stratum,
          marriageTurn: turnNumber,
          dowryCash,
          narrativeVi
        });
      }

      return results;
    });
  }

  /**
   * Autonomous NPC Childbirth Simulation:
   * Progresses gestation for all married NPC couples, checks military deployment constraints,
   * and delivers healthy heirs bearing their father's authentic Han surname.
   */
  public simulateAutonomousNpcChildbirth(turnNumber: number, gameDate: string): {
    births: AutonomousChildbirthResult[];
    conceptions: string[];
  } {
    const births: AutonomousChildbirthResult[] = [];
    const conceptions: string[] = [];

    return this.db.transaction(() => {
      const couples = this.db.query<any>(
        "SELECT * FROM family_spouses WHERE husband_id != 'PLY-0001' AND status = 'MARRIED';"
      );

      for (const couple of couples) {
        const husbandId = couple.husband_id;
        const wifeId = couple.wife_id;
        const pregnancyStage = Number(couple.pregnancy_stage || 0);

        if (pregnancyStage === 0) {
          // If husband is deployed on frontlines, conception is strictly blocked
          if (this.isCharacterInActiveExpedition(husbandId)) {
            continue;
          }

          // 35% conception chance per turn for non-deployed couples
          if (Math.random() < 0.35) {
            this.db.execute(
              'UPDATE family_spouses SET pregnancy_stage = 1, conception_turn = ? WHERE marriage_id = ?;',
              [turnNumber, couple.marriage_id]
            );
            conceptions.push(couple.marriage_id);
          }
        } else if (pregnancyStage > 0 && pregnancyStage < 3) {
          this.db.execute(
            'UPDATE family_spouses SET pregnancy_stage = ?, updated_at = CURRENT_TIMESTAMP WHERE marriage_id = ?;',
            [pregnancyStage + 1, couple.marriage_id]
          );
        } else if (pregnancyStage >= 3) {
          // Delivery!
          const fatherChar = this.db.queryOne<any>(
            'SELECT name_vi, war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM master_characters WHERE npc_id = ?;',
            [husbandId]
          ) || { name_vi: 'Tướng Lĩnh', war_attr: 60, int_attr: 50, com_attr: 50, ldr_attr: 60, pol_attr: 50, dip_attr: 50, cra_attr: 50, log_attr: 50 };

          let motherChar = this.db.queryOne<any>(
            'SELECT name_vi, war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM civilian_maidens WHERE maiden_id = ?;',
            [wifeId]
          );
          if (!motherChar) {
            motherChar = this.db.queryOne<any>(
              'SELECT name_vi, war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr FROM master_characters WHERE npc_id = ?;',
              [wifeId]
            ) || { name_vi: couple.wife_name_vi, war_attr: 35, int_attr: 50, com_attr: 50, ldr_attr: 40, pol_attr: 40, dip_attr: 50, cra_attr: 50, log_attr: 40 };
          }

          const fatherStats: Record<string, number> = {
            war: Number(fatherChar.war_attr || 50),
            int: Number(fatherChar.int_attr || 50),
            com: Number(fatherChar.com_attr || 50),
            ldr: Number(fatherChar.ldr_attr || 50),
            pol: Number(fatherChar.pol_attr || 50),
            dip: Number(fatherChar.dip_attr || 50),
            cra: Number(fatherChar.cra_attr || 50),
            log: Number(fatherChar.log_attr || 50)
          };

          const motherStats: Record<string, number> = {
            war: Number(motherChar.war_attr || 35),
            int: Number(motherChar.int_attr || 50),
            com: Number(motherChar.com_attr || 50),
            ldr: Number(motherChar.ldr_attr || 40),
            pol: Number(motherChar.pol_attr || 40),
            dip: Number(motherChar.dip_attr || 50),
            cra: Number(motherChar.cra_attr || 50),
            log: Number(motherChar.log_attr || 40)
          };

          const { inheritedStats, innateTalents } = this.calculateGenetics(fatherStats, motherStats, wifeId);
          const gender: 'MALE' | 'FEMALE' = Math.random() < 0.5 ? 'MALE' : 'FEMALE';
          const naming = this.generateChildHanName(fatherChar.name_vi, gender);

          const childId = `CHD-NPC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

          this.db.execute(
            `INSERT INTO family_children (
              child_id, father_id, mother_id, mother_name_vi, name_vi, name_en, style_name,
              gender, birth_date, birth_turn, age,
              war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr,
              innate_talents_json, growth_focus, is_heir, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BALANCED', 0, 'INFANT');`,
            [
              childId,
              husbandId,
              wifeId,
              couple.wife_name_vi,
              naming.nameVi,
              naming.nameEn,
              naming.styleName,
              gender,
              gameDate,
              turnNumber,
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

          // Reset pregnancy
          this.db.execute(
            'UPDATE family_spouses SET pregnancy_stage = 0, conception_turn = NULL WHERE marriage_id = ?;',
            [couple.marriage_id]
          );

          const narrativeVi = `${fatherChar.name_vi} và ${couple.wife_name_vi} đón mừng đinh trưởng! Hạ sinh ${gender === 'MALE' ? 'quý tử' : 'ái nữ'} [${naming.nameVi}]. Kế thừa huyết mạch gia phong.`;
          births.push({
            childId,
            fatherId: husbandId,
            fatherNameVi: fatherChar.name_vi,
            motherId: wifeId,
            motherNameVi: couple.wife_name_vi,
            nameVi: naming.nameVi,
            gender,
            inheritedStats,
            narrativeVi
          });
        }
      }

      return { births, conceptions };
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
   * Advances the age and developmental stages of all living children across the campaign
   */
  public advanceAllChildrenAge(years = 1): number {
    const children = this.db.query<any>('SELECT child_id FROM family_children;');
    for (const c of children) {
      this.ageChild(c.child_id, years);
    }
    return children.length;
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
