/**
 * ThreeKingdoms-AgentEngine: Family Lineage & Succession Type Contracts & DTOs
 * (src/modules/lineage-succession/lineage-types.ts)
 *
 * Strict interfaces, parameter contracts, and view DTOs for:
 * 1. Life-sim Courtship, Marriage, and Cohabitation
 * 2. Probabilistic Location Encounters & Dynamic Modifiers
 * 3. Conception, Gestation, and Genetic Attribute Inheritance
 * 4. Heir Upbringing, Developmental Stages, and Master Tutelage
 * 5. Dynastic Lineage Succession Protocol
 * 6. Autonomous World Simulation Marriages and Generational Deliveries
 */

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
  charityAmount?: number;
  childPayouts?: Array<{ childId: string; amount: number }>;
  assetBequests?: Array<{ assetType: string; assetId: string; childId: string }>;
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
