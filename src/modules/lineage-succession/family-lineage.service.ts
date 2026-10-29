/**
 * ThreeKingdoms-AgentEngine: Family Lineage & Succession Facade Service
 * (src/modules/lineage-succession/family-lineage.service.ts)
 *
 * Implements R1: Marriage, Childbirth & Lineage Succession (Life-Sim).
 * Modularized Architecture:
 * - CourtshipBetrothalService: Heroine & civilian maiden courtship, betrothal, and dowry double-entry accounting
 * - ReproductionGeneticsService: Cohabitation, gestation progression, Han naming, and genetic attribute inheritance
 * - HeirMentorshipService: Child growth focus, developmental aging, historical master mentorship
 * - DynastySuccessionService: Generational succession protocol, ancestor archive, net worth audit continuity
 * - AutonomousLifeService: Procedural NPC marriages and childbirth across the living simulation world
 *
 * Adheres to AgentOption Universe Architecture v4.0 & Anti-AI-Slop standards.
 */

import { DatabaseService } from '../../core/database';
import {
  HouseholdRole,
  ChildGrowthFocus,
  ChildDevelopmentStage,
  ProposeMarriageParams,
  ProposeMarriageResult,
  ActivityEncounterParams,
  ActivityEncounterResult,
  AutonomousMarriageResult,
  AutonomousChildbirthResult,
  RestWithSpouseResult,
  GeneticAttributeRoll,
  BirthChildParams,
  BirthChildResult,
  AssignMentorParams,
  AssignMentorResult,
  MentorshipSessionResult,
  SuccessionParams,
  SuccessionExecutionParams,
  SuccessionResult,
  CourtshipCandidateDTO,
  FamilyOverviewDTO,
  IFamilyLineageService
} from './lineage-types';

import { CourtshipBetrothalService } from './courtship-betrothal.service';
import { ReproductionGeneticsService } from './reproduction-genetics.service';
import { HeirMentorshipService } from './heir-mentorship.service';
import { DynastySuccessionService } from './dynasty-succession.service';
import { AutonomousLifeService } from './autonomous-life.service';

// Re-export contracts and sub-services for seamless consumer access
export * from './lineage-types';
export {
  CourtshipBetrothalService,
  ReproductionGeneticsService,
  HeirMentorshipService,
  DynastySuccessionService,
  AutonomousLifeService
};

export class FamilyLineageService implements IFamilyLineageService {
  private static instance: FamilyLineageService | null = null;
  private db: DatabaseService;

  private courtshipService: CourtshipBetrothalService;
  private reproductionService: ReproductionGeneticsService;
  private mentorshipService: HeirMentorshipService;
  private successionService: DynastySuccessionService;
  private autonomousService: AutonomousLifeService;

  public constructor(customDbPath?: string) {
    this.db = DatabaseService.getInstance(customDbPath);
    this.ensureTables();

    this.courtshipService = new CourtshipBetrothalService(this.db);
    this.reproductionService = new ReproductionGeneticsService(this.db);
    this.mentorshipService = new HeirMentorshipService(this.db);
    this.successionService = new DynastySuccessionService(this.db);
    this.autonomousService = new AutonomousLifeService(
      this.db,
      this.courtshipService,
      this.reproductionService
    );
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

  // =========================================================================
  // 1. FAMILY OVERVIEW
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
  // 2. COURTSHIP & BETROTHAL (Delegated to CourtshipBetrothalService)
  // =========================================================================

  public hasEncounteredNpc(npcId: string): boolean {
    return this.courtshipService.hasEncounteredNpc(npcId);
  }

  public isCharacterInActiveExpedition(characterId: string): boolean {
    return this.courtshipService.isCharacterInActiveExpedition(characterId);
  }

  public checkMarriageFeasibility(husbandId: string, wifeId: string): { allowed: boolean; reasonVi?: string } {
    return this.courtshipService.checkMarriageFeasibility(husbandId, wifeId);
  }

  public evaluateNpcMarriageReadiness(npcId: string): { ready: boolean; reasonVi: string } {
    return this.courtshipService.evaluateNpcMarriageReadiness(npcId);
  }

  public getCourtshipCandidates(): CourtshipCandidateDTO[] {
    return this.courtshipService.getCourtshipCandidates();
  }

  public triggerActivityEncounter(params: ActivityEncounterParams): ActivityEncounterResult {
    return this.courtshipService.triggerActivityEncounter(params);
  }

  public proposeMarriage(params: ProposeMarriageParams): ProposeMarriageResult {
    return this.courtshipService.proposeMarriage(params);
  }

  // =========================================================================
  // 3. REPRODUCTION & GENETICS (Delegated to ReproductionGeneticsService)
  // =========================================================================

  public assignHouseholdRole(marriageId: string, role: HouseholdRole): void {
    this.reproductionService.assignHouseholdRole(marriageId, role);
  }

  public restWithSpouse(marriageId: string): RestWithSpouseResult {
    return this.reproductionService.restWithSpouse(marriageId);
  }

  public advancePregnancyTick(turn?: number, gameDate?: string): void {
    this.reproductionService.advancePregnancyTick(turn, gameDate);
  }

  public calculateGenetics(
    fatherStats: Record<string, number>,
    motherStats: Record<string, number>,
    motherId: string
  ): {
    inheritedStats: Record<string, number>;
    statBreakdown: Record<string, GeneticAttributeRoll>;
    innateTalents: string[];
  } {
    return this.reproductionService.calculateGenetics(fatherStats, motherStats, motherId);
  }

  public extractAuthenticSurname(fullName: string): string {
    return this.reproductionService.extractAuthenticSurname(fullName);
  }

  public generateChildHanName(
    fatherName: string,
    gender: 'MALE' | 'FEMALE'
  ): { nameVi: string; nameEn: string; styleName: string } {
    return this.reproductionService.generateChildHanName(fatherName, gender);
  }

  public birthChild(params: BirthChildParams): BirthChildResult {
    return this.reproductionService.birthChild(params);
  }

  // =========================================================================
  // 4. HEIR UPBRINGING & MENTORSHIP (Delegated to HeirMentorshipService)
  // =========================================================================

  public setChildGrowthFocus(childId: string, focus: ChildGrowthFocus): void {
    this.mentorshipService.setChildGrowthFocus(childId, focus);
  }

  public designateHeir(childId: string): void {
    this.mentorshipService.designateHeir(childId);
  }

  public ageChild(childId: string, years: number = 1): void {
    this.mentorshipService.ageChild(childId, years);
  }

  public advanceAllChildrenAge(years: number = 1): number {
    return this.mentorshipService.advanceAllChildrenAge(years);
  }

  public assignMasterMentor(params: AssignMentorParams): AssignMentorResult {
    return this.mentorshipService.assignMasterMentor(params);
  }

  public executeMentorshipTurn(childId: string): MentorshipSessionResult {
    return this.mentorshipService.executeMentorshipTurn(childId);
  }

  // =========================================================================
  // 5. DYNASTIC SUCCESSION (Delegated to DynastySuccessionService)
  // =========================================================================

  public executeSuccession(params: SuccessionParams | SuccessionExecutionParams): SuccessionResult {
    return this.successionService.executeSuccession(params);
  }

  // =========================================================================
  // 6. AUTONOMOUS LIFE SIMULATION (Delegated to AutonomousLifeService)
  // =========================================================================

  public simulateAutonomousNpcMarriages(turnNumber: number, gameDate: string): AutonomousMarriageResult[] {
    return this.autonomousService.simulateAutonomousNpcMarriages(turnNumber, gameDate);
  }

  public simulateAutonomousNpcChildbirth(turnNumber: number, gameDate: string): {
    births: AutonomousChildbirthResult[];
    conceptions: string[];
  } {
    return this.autonomousService.simulateAutonomousNpcChildbirth(turnNumber, gameDate);
  }
}
