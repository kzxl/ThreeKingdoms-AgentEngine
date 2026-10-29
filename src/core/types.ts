/**
 * ThreeKingdoms-AgentEngine: Core Domain Types & Contracts
 * Pure strongly-typed domain definitions matching Universe Architecture & Grand Strategy models.
 */

// Strongly Typed Identifiers
export type SettlementId = `LOC-${string}` | string;
export type CharacterId = `NPC-${string}` | `PLY-${string}` | string;
export type ArmyId = `ARMY-${string}` | string;
export type FactionId = `FAC-${string}` | string;
export type CommodityId = string;

// Universal Commodities
export type StandardCommodity =
  | 'GRAIN'
  | 'RAW_IRON'
  | 'COAL'
  | 'TIMBER'
  | 'SALT'
  | 'LEATHER'
  | 'SILK'
  | 'WEAPON_SWORD'
  | 'WEAPON_SPEAR'
  | 'ARMOR_SHIELD'
  | 'MEDICINE_HERB'
  | 'WAR_HORSE';

// Character Competency Attributes (ROTK 5-8 dimensions)
export interface CharacterCompetency {
  war: number;           // Martial & combat prowesses
  intelligence: number;  // Strategy, tactics, deceit detection
  politics: number;      // Civil administration, tax efficiency
  leadership: number;    // Command authority, troop morale
  diplomacy: number;     // Negotiation, alliance persuasion
  commerce: number;      // Trade margins, market acumen
  craft: number;         // Production throughput, quality control
}

// 2-Axis Social Bond & Kizuna Network
export interface KizunaRelation {
  characterIdA: CharacterId;
  characterIdB: CharacterId;
  affinity: number;       // Axis 1: -100 (Bitter Enmity) to +100 (Sworn Brotherhood)
  respect: number;        // Axis 2: 0 (Contempt) to 100 (Unquestioned Reverence)
  isSwornBrother: boolean;
  hooks: Array<{
    hookId: string;
    type: 'DEBT_FAVOR' | 'SECRET_BLACKMAIL' | 'LIFE_SAVED';
    expirationTurn: number;
    description: string;
  }>;
}

// Settlement / Citadel Entity
export interface SettlementState {
  id: SettlementId;
  name: string;
  province: string;
  rulerFactionId: FactionId;
  population: number;
  publicOrder: number;    // 0 - 100
  agriculture: number;    // Agricultural development rating
  commerce: number;       // Commercial prosperity rating
  defense: number;        // Fortification durability rating
  granaryGrain: number;   // Food reserves in Thạch (piculs)
  treasuryCash: number;   // Silver/Copper reserve in quan
  garrisonTroops: number; // Defending militia/soldiers
}

// Operational Army Entity on Strategic Graph
export interface ArmyState {
  id: ArmyId;
  commanderId: CharacterId;
  factionId: FactionId;
  currentLocationId: SettlementId;
  targetLocationId: SettlementId | null;
  troopCount: number;
  morale: number;         // 0 - 100
  grainSupplyDays: number;// Food carried in days
  supplyHubId: SettlementId;
  isOutOfSupply: boolean;
  marchingProgress: number;// 0.0 to 1.0 along current route edge
}

// Dynamic Market Commodity State
export interface MarketCommodityState {
  commodity: StandardCommodity;
  basePrice: number;
  currentPrice: number;
  stockUnits: number;
  demandUnits: number;
  priceElasticity: number; // 0.5 to 4.0
}

// Utility AI Action Candidate
export interface UtilityActionCandidate {
  id: string;
  actionType: 'TRADE' | 'PATROL' | 'RECRUIT' | 'CRAFT' | 'STUDY' | 'REST' | 'MARCH' | 'CONSPIRE';
  targetEntityId?: string;
  weight: number;
  considerations: Array<{
    name: string;
    rawInput: number;
    score: number; // Normalized 0.0 to 1.0
  }>;
  compositeScore: number;
}

// AgentOption Universe Architecture: IFeatureModule Contract
export interface ModuleContext {
  dbPath: string;
  eventBus: import('./event-bus').EventBus;
}

export interface IFeatureModule {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  init(ctx: ModuleContext): Promise<void> | void;
  destroy?(): Promise<void> | void;
}

// -------------------------------------------------------------
// Faction Politics & Dynastic Lineage Interfaces (Phase 1)
// -------------------------------------------------------------
export type CourtRank =
  | 'RULER'
  | 'CHIEF_COMMANDER'
  | 'CHIEF_ADVISOR'
  | 'GOVERNOR'
  | 'GENERAL'
  | 'OFFICER'
  | 'RETAINER';

export type FactionIdeology =
  | 'ROYALIST'
  | 'REBEL'
  | 'WARLORD'
  | 'MERCHANT_GUILD';

export interface FactionState {
  factionId: FactionId;
  nameVi: string;
  nameEn: string;
  leaderId: CharacterId;
  capitalSettlementId: SettlementId;
  treasuryCash: number;
  granaryGrain: number;
  militaryPower: number;
  prestige: number;
  ideology: FactionIdeology;
  colorHex: string;
  isActive: boolean;
  controlledSettlements?: SettlementState[];
  officers?: FactionOfficerState[];
}

export interface FactionOfficerState {
  officerId: CharacterId;
  factionId: FactionId;
  courtRank: CourtRank;
  loyalty: number;        // 0 - 100
  ambition: number;       // 0 - 100
  appointedSettlementId?: SettlementId | null;
  betrayalRisk: number;   // 0.0 - 1.0
  secretFactionSympathy?: FactionId | null;
}

export interface FactionPoliticalEvent {
  eventId: string;
  turnNumber: number;
  gameDate: string;
  eventType:
    | 'COUP_ATTEMPT'
    | 'SECESSION_WARLORD'
    | 'OFFICER_DEFECT'
    | 'GOVERNOR_APPOINTED'
    | 'TITLE_INVESTED'
    | 'ASSASSINATION_PLOT'
    | 'FACTION_FOUNDED'
    | 'DIPLOMATIC_ALLIANCE'
    | 'WAR_DECLARATION';
  sourceFactionId: FactionId;
  targetFactionId?: FactionId | null;
  instigatorOfficerId?: CharacterId;
  titleVi: string;
  narrativeVi: string;
  consequences: Record<string, any>;
}

// -------------------------------------------------------------
// Ancient Professions, Gathering & Emergent Innovations
// -------------------------------------------------------------
export type ProfessionCategory =
  | 'GATHERING'
  | 'CRAFTING'
  | 'MEDICINE'
  | 'AGRONOMY'
  | 'COMMERCE'
  | 'EMERGENT_INNOVATION';

export interface CharacterProfessionState {
  characterId: CharacterId;
  professionCode: string;
  professionNameVi: string;
  professionNameEn: string;
  category: ProfessionCategory;
  tier: number; // 1 - 5
  currentExp: number;
  maxExp: number;
  isPrimary: boolean;
  unlockedAt?: string;
}

export interface GatheringNode {
  nodeId: string;
  settlementId: SettlementId;
  nameVi: string;
  nameEn: string;
  resourceType: 'MINERAL' | 'HERB' | 'TIMBER' | 'SALT_WELL';
  yieldItemCode: string;
  yieldItemNameVi: string;
  yieldQuantityMin: number;
  yieldQuantityMax: number;
  fatigueCost: number;
  requiredSkillCode?: string;
  descriptionVi?: string;
}

export interface EmergentInnovation {
  innovationId: string;
  characterId: CharacterId;
  turnNumber: number;
  gameDate: string;
  professionCode: string;
  titleVi: string;
  narrativeVi: string;
  unlockedRecipes: string[];
  statBoosts: Record<string, number>;
}

// -------------------------------------------------------------
// Ecological Crises & Macro Logistics Caravans (Phase 3 & 4)
// -------------------------------------------------------------
export type EcologicalCrisisType =
  | 'GREAT_DROUGHT'
  | 'LOCUST_SWARM'
  | 'YELLOW_RIVER_FLOOD'
  | 'PESTILENCE_PLAGUE'
  | 'PEASANT_REBELLION';

export interface EcologicalCrisis {
  crisisId: string;
  settlementId: SettlementId;
  crisisType: EcologicalCrisisType;
  severityLevel: number; // 0.5 to 3.0
  durationTurnsLeft: number;
  agriculturePenalty: number;
  publicOrderPenalty: number;
  grainPriceMultiplier: number;
  isActive: boolean;
  titleVi: string;
  narrativeVi: string;
}

export type CaravanStatus =
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'AMBUSHED_FIGHTING'
  | 'PLUNDERED'
  | 'SUCCESS_TRADED'
  | 'COMPLETED';

export interface TradeCaravan {
  caravanId: string;
  caravanName: string;
  ownerFactionId: FactionId;
  fromSettlementId: SettlementId;
  toSettlementId: SettlementId;
  cargoItemCode: string;
  cargoQuantity: number;
  cargoValueQian: number;
  guardTroops: number;
  routeProgress: number; // 0.0 to 1.0
  status: CaravanStatus;
  createdTurn: number;
}

export interface BanditStronghold {
  strongholdId: string;
  nameVi: string;
  locationNear: string;
  banditChiefName: string;
  banditPower: number;
  plunderedWealth: number;
  bountyReward: number;
  status: 'ACTIVE' | 'SUBDUED';
}



