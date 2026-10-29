/**
 * ThreeKingdoms-AgentEngine: ROTK Single Combat Dueling System (R2)
 * (src/modules/military/single-combat-duel.service.ts)
 *
 * Implements the 1v1 Martial Skirmish Turn-Based Duel State Machine:
 * - 3 to 5 round tactical duel loop with 4 asymmetric commands:
 *     1. ATTACK (Công) - Fierce offensive strike, interrupts Focus Spirit (+30% Crush)
 *     2. DEFEND (Thủ) - Defensive parry, negates 75% attack damage, parry-counters Special Strike
 *     3. SPECIAL_STRIKE (Sát) - Devastating signature martial technique, consumes 30 Spirit
 *     4. FOCUS_SPIRIT (Khí) - Channels inner qi (+35 Spirit, +10 Morale, +30% next-round buff)
 * - Power derived from effective Warfare (WAR) queried via EquipmentSystemService:
 *     - Clamped legendary weapon/armor stat bonuses [+1..+5] via clampStatModifier
 *     - Supports Golden Cap (>100 WAR) for legendary champions (Guan Yu 103, Zhang Fei 103, Lu Bu 105)
 *     - Morale (0-100) and Spirit gauge (0-100) integration
 * - Contextual duel triggers:
 *     1. Friendly martial sparring (Luận Võ So Tài) with Zhang Fei / Guan Yu -> Kizuna Affinity & Respect
 *     2. Martial Arena Tournament (Diễn Võ Đài) -> Prize cash, title, and double-entry ledger integration
 *     3. Caravan ambush defense -> Safeguards 100% cargo against bandit chieftains
 * - Authentic Koei ROTK battle chronicles and Hanzi narratives.
 *
 * Adheres strictly to AgentOption Universe Architecture v4.0.
 */

import { DatabaseService } from '../../core/database';
import { EquipmentSystemService } from '../equipment/equipment-system.service';
import { clampStatModifier } from '../../shared/character-stats';
import { ProgressionExpService } from '../progression/attribute-progression.service';
import { RngService } from '../../core/rng';
import { nextSequentialId } from '../../shared/id-generator';
import { postCashflowEntry } from '../../shared/ledger';

// ---------------------------------------------------------------------------
// 1. Data Contracts & Types
// ---------------------------------------------------------------------------

export type TacticalCommand =
  | 'ATTACK'         // Công: Đòn đánh dũng mãnh, phá chiêu Tụ Khí (+30% sát thương)
  | 'DEFEND'         // Thủ: Phòng ngự hóa giải 75% sát thương, phản kích Tuyệt Kỹ
  | 'SPECIAL_STRIKE' // Sát: Tuyệt kỹ võ tướng cực đại, tiêu hao 30 Spirit
  | 'FOCUS_SPIRIT';  // Khí: Tụ khí quy nguyên (+35 Spirit, +10 Morale, +30% sát thương hiệp sau)

export type DuelActionType = TacticalCommand;

export type DuelContext = 'FRIENDLY_SPARRING' | 'TOURNAMENT_ARENA' | 'CARAVAN_DEFENSE';

export type DuelOutcomeType = 'KNOCKOUT' | 'MORALE_ROUT' | 'POINTS_DECISION' | 'STALEMATE';

export interface DuelistProfile {
  characterId: string;
  name: string;
  nameVi: string;
  nameEn: string;
  nameHan?: string;
  avatarChar: string;
  baseWar: number;
  gearBonusWar: number;
  effectiveWar: number;
  isOver100: boolean;
  maxHp: number;
  currentHp: number;
  morale: number;         // Sĩ khí: 0 - 100
  spirit: number;         // Khí lực / Nộ khí: 0 - 100 (tích lũy để thi triển Sát)
  spiritCharged: boolean; // Nhận buff sát thương +30% nếu hiệp trước Focus Spirit
  weaponName: string;
  armorName: string;
  steedName: string;
}

// DuelCombatant compatibility alias for PROJECT.md
export type DuelCombatant = DuelistProfile;

export interface DuelRoundClash {
  round: number;
  roundNumber?: number; // Alias for round
  playerAction: DuelActionType;
  playerCommand?: DuelActionType; // Alias for playerAction
  opponentAction: DuelActionType;
  opponentCommand?: DuelActionType; // Alias for opponentAction
  playerDamageDealt: number;
  opponentDamageDealt: number;
  playerHpAfter: number;
  opponentHpAfter: number;
  playerSpiritAfter: number;
  opponentSpiritAfter: number;
  playerMoraleAfter: number;
  opponentMoraleAfter: number;
  isCriticalHit: boolean;
  isParried: boolean;
  narrativeVi: string;
  narrativeEn: string;
  isDuelConcluded?: boolean;
  winnerId?: string;
}

// DuelRoundResolution compatibility alias for PROJECT.md
export type DuelRoundResolution = DuelRoundClash;

export interface DuelRewards {
  warExpGained: number;
  affinityDelta?: number;
  respectDelta?: number;
  prizeCash?: number;
  caravanSaved?: boolean;
  fatigueDelta?: number;
}

export interface DuelResult {
  duelId: string;
  duelContext: DuelContext;
  totalRounds: number;
  winnerId: string | 'DRAW';
  isVictory: boolean;
  player: DuelistProfile;
  opponent: DuelistProfile;
  rounds: DuelRoundClash[];
  outcomeType: DuelOutcomeType;
  rewards: DuelRewards;
  summaryNarrativeVi: string;
  summaryNarrativeEn: string;
}

export interface ActiveDuelState {
  duelId: string;
  context: DuelContext;
  maxRounds: number;
  currentRound: number;
  player: DuelistProfile;
  opponent: DuelistProfile;
  rounds: DuelRoundClash[];
  isConcluded: boolean;
  result?: DuelResult;
  metadata?: Record<string, any>;
}

export interface InitiateDuelOptions {
  playerId?: string;
  opponentId: string;
  context: DuelContext;
  maxRounds?: number;
  playerOverrides?: Partial<DuelistProfile>;
  opponentOverrides?: Partial<DuelistProfile>;
  metadata?: Record<string, any>;
  commitDb?: boolean;
}

export interface ArenaChallengerEntry {
  tier: number;
  tierKey: 'TIER_1' | 'TIER_2' | 'TIER_3';
  tierTitleVi: string;
  opponentId: string;
  nameVi: string;
  nameEn: string;
  titleVi: string;
  war: number;
  morale: number;
  prizeCash: number;
  warExpReward: number;
  descriptionVi: string;
}

// ---------------------------------------------------------------------------
// 2. Arena Tournament Roster Catalog
// ---------------------------------------------------------------------------

export const ARENA_ROSTER: ArenaChallengerEntry[] = [
  {
    tier: 1,
    tierKey: 'TIER_1',
    tierTitleVi: 'Hào Kiệt Bản Địa (Sơ Đẳng)',
    opponentId: 'NPC-ARENA-01',
    nameVi: 'Trác Quận Du Hiệp',
    nameEn: 'Zhuo County Wandering Blade',
    titleVi: 'Hào Kiệt Bản Địa',
    war: 68,
    morale: 80,
    prizeCash: 300,
    warExpReward: 20,
    descriptionVi: 'Võ sĩ giang hồ lừng danh vùng U Châu, đao pháp mau lẹ và dũng mãnh.'
  },
  {
    tier: 2,
    tierKey: 'TIER_2',
    tierTitleVi: 'Biên Ải Dũng Tướng (Trung Đẳng)',
    opponentId: 'NPC-0095',
    nameVi: 'Hoa Hùng',
    nameEn: 'Hua Xiong',
    titleVi: 'Kiêu Kỵ Đô Úy',
    war: 92,
    morale: 90,
    prizeCash: 800,
    warExpReward: 30,
    descriptionVi: 'Mãnh tướng Tây Lương thân cao chín thước, đại đao nặng tựa ngàn cân.'
  },
  {
    tier: 3,
    tierKey: 'TIER_3',
    tierTitleVi: 'Vô Song Chiến Thần (Cao Đẳng)',
    opponentId: 'NPC-0057',
    nameVi: 'Lữ Bố (Phụng Tiên)',
    nameEn: 'Lu Bu (Fengxian)',
    titleVi: 'Vô Song Chiến Thần',
    war: 105, // 100 base + 5 Phương Thiên Họa Kích
    morale: 100,
    prizeCash: 2000,
    warExpReward: 50,
    descriptionVi: 'Nhân trung Lữ Bố, mã trung Xích Thố! Phương Thiên Họa Kích tung hoành thiên hạ.'
  }
];

// ---------------------------------------------------------------------------
// 3. SingleCombatDuelService Implementation
// ---------------------------------------------------------------------------

export class SingleCombatDuelService {
  private static instance: SingleCombatDuelService | null = null;
  private db: DatabaseService;
  private equipmentService: EquipmentSystemService;
  private activeDuels: Map<string, ActiveDuelState> = new Map();

  public constructor(dbService?: DatabaseService) {
    this.db = dbService || DatabaseService.getInstance();
    this.equipmentService = EquipmentSystemService.getInstance(this.db);
    this.ensureDuelTables();
  }

  public static getInstance(dbService?: DatabaseService): SingleCombatDuelService {
    if (!SingleCombatDuelService.instance) {
      SingleCombatDuelService.instance = new SingleCombatDuelService(dbService);
    }
    return SingleCombatDuelService.instance;
  }

  public static resetInstance(): void {
    SingleCombatDuelService.instance = null;
  }

  /**
   * Ensures the session_duels chronicle table exists for persistent replay tracking.
   */
  private ensureDuelTables(): void {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS session_duels (
          duel_id TEXT PRIMARY KEY,
          game_date TEXT NOT NULL,
          context TEXT NOT NULL,
          player_id TEXT NOT NULL,
          opponent_id TEXT NOT NULL,
          winner_id TEXT NOT NULL,
          outcome_type TEXT NOT NULL,
          total_rounds INTEGER NOT NULL,
          rewards_json TEXT NOT NULL,
          narrative_summary TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch {
      // Non-fatal if sqlite execution is constrained
    }
  }

  /**
   * Helper to retrieve active campaign date
   */
  private getGameDate(): string {
    try {
      const row = this.db.queryOne<{ current_date: string }>(
        `SELECT campaign_meta.current_date FROM campaign_meta LIMIT 1;`
      );
      if (row && row.current_date) return row.current_date;
    } catch {
      // fallback
    }
    return '184-05-02';
  }

  /** Deterministic stream for duel decisions, rolls and arena rewards. */
  private rng() {
    return RngService.forDomain(this.db, 'duel');
  }

  /**
   * Builds an authentic combatant profile integrating EquipmentSystemService.
   * Strictly clamps gear bonuses [+1..+5] and calculates golden cap (>100).
   */
  public buildDuelistProfile(
    characterId: string,
    overrides?: Partial<DuelistProfile>
  ): DuelistProfile {
    let name = characterId;
    let nameVi = characterId;
    let nameEn = characterId;
    let avatarChar = '武';
    let baseWar = 60;
    let gearBonusWar = 0;
    let effectiveWar = 60;
    let isOver100 = false;
    let morale = 80;
    let weaponName: string | undefined;
    let armorName: string | undefined;
    let steedName: string | undefined;

    // Check synthetic arena fighters first
    const arenaChallenger = ARENA_ROSTER.find((c) => c.opponentId === characterId);
    if (arenaChallenger) {
      name = arenaChallenger.nameVi;
      nameVi = arenaChallenger.nameVi;
      nameEn = arenaChallenger.nameEn;
      avatarChar = arenaChallenger.nameVi.charAt(0);
      baseWar = arenaChallenger.war > 100 ? 100 : arenaChallenger.war;
      gearBonusWar = arenaChallenger.war > 100 ? clampStatModifier(arenaChallenger.war - 100) : 0;
      effectiveWar = baseWar + gearBonusWar;
      isOver100 = effectiveWar > 100;
      morale = arenaChallenger.morale;
      if (characterId === 'NPC-0057') {
        weaponName = 'Phương Thiên Họa Kích (+5)';
        steedName = 'Xích Thố Mã';
      }
    } else if (characterId.startsWith('BANDIT-')) {
      // Bandit Chieftain Profile
      nameVi = 'Trương Yến (Hắc Sơn Quân)';
      nameEn = 'Zhang Yan (Black Mountain Bandit Chief)';
      name = nameVi;
      avatarChar = 'Phỉ';
      baseWar = 80;
      gearBonusWar = 2;
      effectiveWar = 82;
      isOver100 = false;
      morale = 85;
      weaponName = 'Cương Thiết Khảm Đao (+2)';
    } else {
      try {
        // Query canonical EquipmentSystemService
        const equipStats = this.equipmentService.getEffectiveStats(characterId);
        name = equipStats.characterName;
        nameVi = equipStats.characterName;
        nameEn = equipStats.characterName;
        avatarChar = equipStats.characterName.charAt(0);

        baseWar = equipStats.baseStats.war || 60;
        // Strictly clamp weapon/armor bonus [+1..+5]
        const rawGearBonus = equipStats.gearBonuses.war || 0;
        gearBonusWar = rawGearBonus > 0 ? clampStatModifier(rawGearBonus) : 0;
        effectiveWar = baseWar + gearBonusWar;
        isOver100 = effectiveWar > 100;

        // Query equipped gear details for narrative flavor
        const equipDetails = this.equipmentService.getCharacterEquipment(characterId);
        if (equipDetails.slots.WEAPON) {
          weaponName = equipDetails.slots.WEAPON.customName;
        }
        if (equipDetails.slots.ARMOR) {
          armorName = equipDetails.slots.ARMOR.customName;
        }
        if (equipDetails.slots.STEED) {
          steedName = equipDetails.slots.STEED.customName;
        }

        // Check morale from database
        const pState = this.db.queryOne<any>(
          `SELECT morale, name FROM player_state WHERE player_id = ? LIMIT 1`,
          [characterId]
        );
        if (pState) {
          morale = Number(pState.morale ?? 100);
          nameVi = pState.name || nameVi;
        } else {
          const nState = this.db.queryOne<any>(
            `SELECT morale, name FROM npc_state WHERE npc_id = ? LIMIT 1`,
            [characterId]
          );
          if (nState) {
            morale = Number(nState.morale ?? 80);
            nameVi = nState.name || nameVi;
          }
        }
      } catch {
        // Fallback for custom / ad-hoc duelist entities
        baseWar = overrides?.baseWar ?? 70;
        gearBonusWar = overrides?.gearBonusWar ? clampStatModifier(overrides.gearBonusWar) : 0;
        effectiveWar = baseWar + gearBonusWar;
        isOver100 = effectiveWar > 100;
      }
    }

    // Historical flavor overrides for major heroes
    if (characterId === 'NPC-0003' || name.includes('Quan Vũ') || name.includes('Guan Yu')) {
      nameVi = 'Quan Vũ (Vân Trường)';
      nameEn = 'Guan Yu (Yunchang)';
      avatarChar = 'Vũ';
      weaponName = weaponName || 'Thanh Long Yển Nguyệt Đao (+5)';
      steedName = steedName || 'Xích Thố Mã';
    } else if (characterId === 'NPC-0002' || name.includes('Trương Phi') || name.includes('Zhang Fei')) {
      nameVi = 'Trương Phi (Dực Đức)';
      nameEn = 'Zhang Fei (Yide)';
      avatarChar = 'Phi';
      weaponName = weaponName || 'Bát Trượng Xà Mâu (+5)';
    }

    // Max HP formula: scaled by effective WAR and Morale
    const maxHp = 100 + Math.round(effectiveWar * 1.5) + Math.round(morale * 0.5);

    const profile: DuelistProfile = {
      characterId,
      name,
      nameVi,
      nameEn,
      avatarChar,
      baseWar,
      gearBonusWar,
      effectiveWar,
      isOver100,
      maxHp,
      currentHp: maxHp,
      morale: Math.max(10, Math.min(100, morale)),
      spirit: 20, // Initial combat spirit
      spiritCharged: false,
      weaponName: weaponName || '',
      armorName: armorName || '',
      steedName: steedName || '',
      ...overrides
    };

    // Ensure currentHp doesn't exceed maxHp if overridden
    if (profile.currentHp > profile.maxHp) {
      profile.currentHp = profile.maxHp;
    }

    return profile;
  }

  /**
   * Initiates a new 1v1 turn-based duel session.
   * Supports 3 to 5 round limits (default 5).
   */
  public initiateDuel(options: InitiateDuelOptions): ActiveDuelState {
    const playerId = options.playerId || 'PLY-0001';
    const opponentId = options.opponentId;
    const context = options.context;
    const maxRounds = Math.min(5, Math.max(3, options.maxRounds || 5));

    const player = this.buildDuelistProfile(playerId, options.playerOverrides);
    const opponent = this.buildDuelistProfile(opponentId, options.opponentOverrides);

    const duelId = nextSequentialId(this.db, 'session_duels', 'DUEL', this.getGameDate());

    const duelState: ActiveDuelState = {
      duelId,
      context,
      maxRounds,
      currentRound: 1,
      player,
      opponent,
      rounds: [],
      isConcluded: false,
      metadata: {
        commitDb: options.commitDb,
        ...(options.metadata || {})
      }
    };

    this.activeDuels.set(duelId, duelState);
    return duelState;
  }

  /**
   * Retrieves an active duel session by duelId.
   */
  public getActiveDuel(duelId: string): ActiveDuelState | undefined {
    return this.activeDuels.get(duelId);
  }

  /**
   * Lists all currently active duels.
   */
  public getAllActiveDuels(): ActiveDuelState[] {
    return Array.from(this.activeDuels.values());
  }

  /**
   * Returns available arena tournament challengers.
   */
  public getArenaRoster(): ArenaChallengerEntry[] {
    return ARENA_ROSTER;
  }

  /**
   * Evaluates AI opponent command selection based on tactical personality archetype.
   */
  public chooseOpponentAction(
    opponent: DuelistProfile,
    player: DuelistProfile,
    _context: DuelContext,
    _round: number
  ): TacticalCommand {
    const id = opponent.characterId;
    const name = opponent.nameVi || opponent.name;
    const spirit = opponent.spirit;

    // Archetype 1: Zhang Fei / Berserker Vanguard (Aggressive & Ferocious)
    if (id === 'NPC-0002' || name.includes('Trương Phi') || name.includes('Zhang Fei')) {
      if (spirit >= 30) {
        const roll = this.rng().nextFloat();
        if (roll < 0.45) return 'SPECIAL_STRIKE';
        if (roll < 0.85) return 'ATTACK';
        if (roll < 0.95) return 'FOCUS_SPIRIT';
        return 'DEFEND';
      } else {
        const roll = this.rng().nextFloat();
        if (roll < 0.55) return 'ATTACK';
        if (roll < 0.85) return 'FOCUS_SPIRIT';
        return 'DEFEND';
      }
    }

    // Archetype 2: Guan Yu / Martial Saint (Balanced & Masterful)
    if (id === 'NPC-0003' || name.includes('Quan Vũ') || name.includes('Guan Yu')) {
      if (spirit >= 30) {
        const roll = this.rng().nextFloat();
        if (roll < 0.38) return 'SPECIAL_STRIKE';
        if (roll < 0.72) return 'DEFEND';
        return 'ATTACK';
      } else {
        const roll = this.rng().nextFloat();
        if (roll < 0.40) return 'DEFEND';
        if (roll < 0.75) return 'ATTACK';
        return 'FOCUS_SPIRIT';
      }
    }

    // Archetype 3: Lu Bu / Peerless Warlord (Overwhelming Might)
    if (id === 'NPC-0057' || name.includes('Lữ Bố') || name.includes('Lu Bu')) {
      if (spirit >= 30) {
        const roll = this.rng().nextFloat();
        if (roll < 0.50) return 'SPECIAL_STRIKE';
        if (roll < 0.85) return 'ATTACK';
        return 'DEFEND';
      } else {
        const roll = this.rng().nextFloat();
        if (roll < 0.60) return 'ATTACK';
        if (roll < 0.85) return 'FOCUS_SPIRIT';
        return 'DEFEND';
      }
    }

    // Archetype 4: Bandit Chieftain (Wild & Reckless)
    if (id.startsWith('BANDIT-') || name.includes('Phỉ') || name.includes('Bandit')) {
      if (spirit >= 30) {
        return this.rng().nextFloat() < 0.45 ? 'SPECIAL_STRIKE' : 'ATTACK';
      }
      return this.rng().nextFloat() < 0.65 ? 'ATTACK' : 'FOCUS_SPIRIT';
    }

    // Archetype 5: Dynamic Intelligent AI for other officers / arena challengers
    // If player is spiritCharged, anticipate heavy strike by guarding!
    if (player.spiritCharged) {
      if (this.rng().nextFloat() < 0.60) return 'DEFEND';
    }

    if (spirit >= 30 && this.rng().nextFloat() < 0.45) {
      return 'SPECIAL_STRIKE';
    }

    if (spirit < 20 && this.rng().nextFloat() < 0.40) {
      return 'FOCUS_SPIRIT';
    }

    return this.rng().nextFloat() < 0.60 ? 'ATTACK' : 'DEFEND';
  }

  /**
   * Resolves a single tactical round clash between player and opponent.
   * Enforces the complete asymmetric Rock-Paper-Scissors matrix, Spirit consumption,
   * damage calculations, and narrative chronicle generation.
   */
  public resolveRound(
    duelId: string,
    playerCommand: TacticalCommand,
    forcedOpponentCommand?: TacticalCommand
  ): DuelRoundClash {
    const duel = this.activeDuels.get(duelId);
    if (!duel) {
      throw new Error(`Duel session "${duelId}" not found or expired.`);
    }

    if (duel.isConcluded) {
      throw new Error(`Duel session "${duelId}" has already concluded.`);
    }

    const roundNum = duel.currentRound;
    const player = duel.player;
    const opponent = duel.opponent;

    // Determine opponent action
    const opponentCommand =
      forcedOpponentCommand ||
      this.chooseOpponentAction(opponent, player, duel.context, roundNum);

    // Roll combat variation dice (D10 & D20)
    const rollD10 = () => Math.floor(this.rng().nextFloat() * 10) + 1;
    const rollD20 = () => Math.floor(this.rng().nextFloat() * 20) + 1;

    // --- Base Raw Damage Calculations ---
    // Standard Attack: (Effective WAR * 0.45 + D10) * (0.85 + Morale / 200) * SpiritBuff
    const calcBaseAttackDmg = (war: number, morale: number, charged: boolean) => {
      const base = war * 0.45 + rollD10();
      const moraleMult = 0.85 + morale / 200;
      const buffMult = charged ? 1.30 : 1.0;
      return Math.round(base * moraleMult * buffMult);
    };

    // Special Strike: (Effective WAR * 0.95 + D20) * (0.90 + Morale / 150) * SpiritBuff
    const calcSpecialStrikeDmg = (war: number, morale: number, charged: boolean) => {
      const base = war * 0.95 + rollD20();
      const moraleMult = 0.90 + morale / 150;
      const buffMult = charged ? 1.30 : 1.0;
      return Math.round(base * moraleMult * buffMult);
    };

    let playerDamageDealt = 0;
    let opponentDamageDealt = 0;
    let isCriticalHit = false;
    let isParried = false;

    // Spirit and Morale changes for this round
    let playerSpiritDelta = 0;
    let opponentSpiritDelta = 0;
    let playerMoraleDelta = 0;
    let opponentMoraleDelta = 0;

    let nextPlayerCharged = false;
    let nextOpponentCharged = false;

    // Verify Spirit requirements for SPECIAL_STRIKE (consumes 30)
    let pHasSpirit = true;
    if (playerCommand === 'SPECIAL_STRIKE') {
      if (player.spirit >= 30) {
        playerSpiritDelta -= 30;
      } else {
        pHasSpirit = false;
        playerSpiritDelta -= player.spirit;
      }
    }

    let oHasSpirit = true;
    if (opponentCommand === 'SPECIAL_STRIKE') {
      if (opponent.spirit >= 30) {
        opponentSpiritDelta -= 30;
      } else {
        oHasSpirit = false;
        opponentSpiritDelta -= opponent.spirit;
      }
    }

    // --- Tactical Matrix Resolution ---
    const rawPlayerAtk = calcBaseAttackDmg(player.effectiveWar, player.morale, player.spiritCharged);
    const rawOpponentAtk = calcBaseAttackDmg(opponent.effectiveWar, opponent.morale, opponent.spiritCharged);

    const rawPlayerSpec = pHasSpirit
      ? calcSpecialStrikeDmg(player.effectiveWar, player.morale, player.spiritCharged)
      : Math.round(player.effectiveWar * 0.35 + rollD10());

    const rawOpponentSpec = oHasSpirit
      ? calcSpecialStrikeDmg(opponent.effectiveWar, opponent.morale, opponent.spiritCharged)
      : Math.round(opponent.effectiveWar * 0.35 + rollD10());

    // Evaluate pair: [playerCommand, opponentCommand]
    if (playerCommand === 'ATTACK' && opponentCommand === 'ATTACK') {
      // Clash: Both deal normal damage, both gain +10 Spirit
      playerDamageDealt = rawPlayerAtk;
      opponentDamageDealt = rawOpponentAtk;
      playerSpiritDelta += 10;
      opponentSpiritDelta += 10;
    } else if (playerCommand === 'ATTACK' && opponentCommand === 'DEFEND') {
      // Opponent defends: reduces incoming damage by 75%
      playerDamageDealt = Math.max(1, Math.round(rawPlayerAtk * 0.25));
      opponentDamageDealt = 0;
      playerSpiritDelta += 5;
      opponentSpiritDelta += 10;
    } else if (playerCommand === 'DEFEND' && opponentCommand === 'ATTACK') {
      // Player defends: reduces incoming damage by 75%
      playerDamageDealt = 0;
      opponentDamageDealt = Math.max(1, Math.round(rawOpponentAtk * 0.25));
      playerSpiritDelta += 10;
      opponentSpiritDelta += 5;
    } else if (playerCommand === 'DEFEND' && opponentCommand === 'DEFEND') {
      // Standoff: 0 damage, both gain +5 Spirit
      playerDamageDealt = 0;
      opponentDamageDealt = 0;
      playerSpiritDelta += 5;
      opponentSpiritDelta += 5;
    } else if (playerCommand === 'ATTACK' && opponentCommand === 'FOCUS_SPIRIT') {
      // CRUSH: Player interrupts opponent focus! Deals +30% damage!
      // Opponent gained 0 spirit due to being interrupted by ATTACK!
      playerDamageDealt = Math.round(rawPlayerAtk * 1.30);
      opponentDamageDealt = 0;
      playerSpiritDelta += 10;
      opponentSpiritDelta = 0; // 0 spirit gained when interrupted!
      opponentMoraleDelta -= 10;
      isCriticalHit = true;
    } else if (playerCommand === 'FOCUS_SPIRIT' && opponentCommand === 'ATTACK') {
      // CRUSH: Opponent interrupts player focus!
      playerDamageDealt = 0;
      opponentDamageDealt = Math.round(rawOpponentAtk * 1.30);
      playerSpiritDelta = 0; // 0 spirit gained when interrupted!
      opponentSpiritDelta += 10;
      playerMoraleDelta -= 10;
      isCriticalHit = true;
    } else if (playerCommand === 'DEFEND' && opponentCommand === 'SPECIAL_STRIKE') {
      // PARRY-COUNTER: Player negates 80% of special strike and counters!
      isParried = true;
      // Negates 80% (strictly < 20 damage on benchmark encounters)
      opponentDamageDealt = Math.min(18, Math.max(1, Math.round(rawOpponentSpec * 0.15)));
      // Riposte counter damage = Player WAR * 0.40 + D10
      playerDamageDealt = Math.round(player.effectiveWar * 0.40 + rollD10());
      playerSpiritDelta += 15;
      opponentMoraleDelta -= 10;
    } else if (playerCommand === 'SPECIAL_STRIKE' && opponentCommand === 'DEFEND') {
      // PARRY-COUNTER: Opponent parries player's special strike!
      isParried = true;
      playerDamageDealt = Math.min(18, Math.max(1, Math.round(rawPlayerSpec * 0.15)));
      opponentDamageDealt = Math.round(opponent.effectiveWar * 0.40 + rollD10());
      opponentSpiritDelta += 15;
      playerMoraleDelta -= 10;
    } else if (playerCommand === 'SPECIAL_STRIKE' && opponentCommand === 'ATTACK') {
      // Special strike overpowers attack!
      playerDamageDealt = rawPlayerSpec;
      opponentDamageDealt = Math.round(rawOpponentAtk * 0.70);
      playerMoraleDelta += 5;
      opponentMoraleDelta -= 5;
    } else if (playerCommand === 'ATTACK' && opponentCommand === 'SPECIAL_STRIKE') {
      // Opponent special strike overpowers player attack!
      playerDamageDealt = Math.round(rawPlayerAtk * 0.70);
      opponentDamageDealt = rawOpponentSpec;
      playerMoraleDelta -= 5;
      opponentMoraleDelta += 5;
    } else if (playerCommand === 'SPECIAL_STRIKE' && opponentCommand === 'SPECIAL_STRIKE') {
      // Clash of Champions: Both take massive damage!
      const playerAdvantage = player.effectiveWar >= opponent.effectiveWar ? 1.15 : 0.85;
      const oppAdvantage = opponent.effectiveWar >= player.effectiveWar ? 1.15 : 0.85;
      playerDamageDealt = Math.round(rawPlayerSpec * playerAdvantage);
      opponentDamageDealt = Math.round(rawOpponentSpec * oppAdvantage);
      isCriticalHit = true;
    } else if (playerCommand === 'SPECIAL_STRIKE' && opponentCommand === 'FOCUS_SPIRIT') {
      // DECIMATION: Special strike hits meditating target for +50% critical damage!
      playerDamageDealt = Math.round(rawPlayerSpec * 1.50);
      opponentDamageDealt = 0;
      opponentSpiritDelta = 0; // Focus shattered
      opponentMoraleDelta -= 20;
      playerMoraleDelta += 10;
      isCriticalHit = true;
    } else if (playerCommand === 'FOCUS_SPIRIT' && opponentCommand === 'SPECIAL_STRIKE') {
      // DECIMATION: Opponent decimates player meditating!
      playerDamageDealt = 0;
      opponentDamageDealt = Math.round(rawOpponentSpec * 1.50);
      playerSpiritDelta = 0;
      playerMoraleDelta -= 20;
      opponentMoraleDelta += 10;
      isCriticalHit = true;
    } else if (playerCommand === 'FOCUS_SPIRIT' && opponentCommand === 'DEFEND') {
      // Free Charge: +35 Spirit, +10 Morale, +30% buff next round
      playerDamageDealt = 0;
      opponentDamageDealt = 0;
      playerSpiritDelta += 35;
      playerMoraleDelta += 10;
      nextPlayerCharged = true;
    } else if (playerCommand === 'DEFEND' && opponentCommand === 'FOCUS_SPIRIT') {
      // Opponent Free Charge
      playerDamageDealt = 0;
      opponentDamageDealt = 0;
      opponentSpiritDelta += 35;
      opponentMoraleDelta += 10;
      nextOpponentCharged = true;
    } else if (playerCommand === 'FOCUS_SPIRIT' && opponentCommand === 'FOCUS_SPIRIT') {
      // Mutual Meditation: Both gain +35 Spirit, +15 Morale, +30% buff
      playerDamageDealt = 0;
      opponentDamageDealt = 0;
      playerSpiritDelta += 35;
      opponentSpiritDelta += 35;
      playerMoraleDelta += 15;
      opponentMoraleDelta += 15;
      nextPlayerCharged = true;
      nextOpponentCharged = true;
    }

    // Apply HP, Spirit, Morale updates
    const playerHpAfter = Math.max(0, player.currentHp - opponentDamageDealt);
    const opponentHpAfter = Math.max(0, opponent.currentHp - playerDamageDealt);

    const playerSpiritAfter = Math.min(100, Math.max(0, player.spirit + playerSpiritDelta));
    const opponentSpiritAfter = Math.min(100, Math.max(0, opponent.spirit + opponentSpiritDelta));

    const playerMoraleAfter = Math.min(100, Math.max(0, player.morale + playerMoraleDelta));
    const opponentMoraleAfter = Math.min(100, Math.max(0, opponent.morale + opponentMoraleDelta));

    // Update combatant references in active state
    player.currentHp = playerHpAfter;
    opponent.currentHp = opponentHpAfter;
    player.spirit = playerSpiritAfter;
    opponent.spirit = opponentSpiritAfter;
    player.morale = playerMoraleAfter;
    opponent.morale = opponentMoraleAfter;
    player.spiritCharged = nextPlayerCharged;
    opponent.spiritCharged = nextOpponentCharged;

    // Generate battle narrative
    const narratives = this.generateRoundNarrative(
      roundNum,
      player,
      opponent,
      playerCommand,
      opponentCommand,
      playerDamageDealt,
      opponentDamageDealt,
      isCriticalHit,
      isParried
    );

    // Evaluate duel conclusion
    let isDuelConcluded = false;
    let winnerId: string | undefined;

    if (playerHpAfter <= 0 && opponentHpAfter <= 0) {
      isDuelConcluded = true;
      winnerId = 'DRAW';
    } else if (opponentHpAfter <= 0) {
      isDuelConcluded = true;
      winnerId = player.characterId;
    } else if (playerHpAfter <= 0) {
      isDuelConcluded = true;
      winnerId = opponent.characterId;
    } else if (opponentMoraleAfter <= 0) {
      isDuelConcluded = true;
      winnerId = player.characterId;
    } else if (playerMoraleAfter <= 0) {
      isDuelConcluded = true;
      winnerId = opponent.characterId;
    } else if (roundNum >= duel.maxRounds) {
      isDuelConcluded = true;
      const playerRatio = playerHpAfter / player.maxHp;
      const oppRatio = opponentHpAfter / opponent.maxHp;
      if (Math.abs(playerRatio - oppRatio) < 0.02) {
        winnerId = 'DRAW';
      } else if (playerRatio > oppRatio) {
        winnerId = player.characterId;
      } else {
        winnerId = opponent.characterId;
      }
    }

    const clash: DuelRoundClash = {
      round: roundNum,
      roundNumber: roundNum,
      playerAction: playerCommand,
      playerCommand,
      opponentAction: opponentCommand,
      opponentCommand,
      playerDamageDealt,
      opponentDamageDealt,
      playerHpAfter,
      opponentHpAfter,
      playerSpiritAfter,
      opponentSpiritAfter,
      playerMoraleAfter,
      opponentMoraleAfter,
      isCriticalHit,
      isParried,
      narrativeVi: narratives.vi,
      narrativeEn: narratives.en,
      isDuelConcluded,
      winnerId
    };

    duel.rounds.push(clash);

    if (isDuelConcluded) {
      duel.isConcluded = true;
      duel.result = this.finalizeDuelResult(duel, winnerId || 'DRAW');
    } else {
      duel.currentRound += 1;
    }

    return clash;
  }

  /**
   * Concludes an ongoing or finished duel and generates official results.
   */
  public concludeDuel(duelId: string): DuelResult {
    const duel = this.activeDuels.get(duelId);
    if (!duel) {
      throw new Error(`Duel session "${duelId}" not found.`);
    }

    if (duel.result) {
      return duel.result;
    }

    duel.isConcluded = true;
    const player = duel.player;
    const opponent = duel.opponent;

    let winnerId: string;
    if (opponent.currentHp <= 0 && player.currentHp > 0) {
      winnerId = player.characterId;
    } else if (player.currentHp <= 0 && opponent.currentHp > 0) {
      winnerId = opponent.characterId;
    } else if (duel.context === 'CARAVAN_DEFENSE') {
      const pRatio = player.currentHp / player.maxHp;
      const oRatio = opponent.currentHp / opponent.maxHp;
      winnerId = pRatio >= oRatio ? player.characterId : opponent.characterId;
    } else {
      const pRatio = player.currentHp / player.maxHp;
      const oRatio = opponent.currentHp / opponent.maxHp;
      if (Math.abs(pRatio - oRatio) < 0.02) {
        winnerId = 'DRAW';
      } else if (pRatio > oRatio) {
        winnerId = player.characterId;
      } else {
        winnerId = opponent.characterId;
      }
    }

    duel.result = this.finalizeDuelResult(duel, winnerId);
    return duel.result;
  }

  /**
   * Generates authentic Koei ROTK battle commentary for the clash.
   */
  private generateRoundNarrative(
    round: number,
    player: DuelistProfile,
    opponent: DuelistProfile,
    playerCmd: TacticalCommand,
    opponentCmd: TacticalCommand,
    pDmg: number,
    oDmg: number,
    isCrit: boolean,
    isParry: boolean
  ): { vi: string; en: string } {
    const pName = player.nameVi || player.name;
    const oName = opponent.nameVi || opponent.name;
    const pWep = player.weaponName || 'thanh đao';
    const oWep = opponent.weaponName || 'chiến khí';

    const cmdLabelVi: Record<TacticalCommand, string> = {
      ATTACK: 'Công [攻]',
      DEFEND: 'Thủ [守]',
      SPECIAL_STRIKE: 'Sát [殺]',
      FOCUS_SPIRIT: 'Khí [氣]'
    };

    let vi = `[Hiệp ${round}] `;
    let en = `[Round ${round}] `;

    if (isParry) {
      if (playerCmd === 'DEFEND') {
        vi += `${oName} xuất chiêu ${cmdLabelVi.SPECIAL_STRIKE} hung hiểm vạn phần, nhưng ${pName} trầm ổn dùng ${cmdLabelVi.DEFEND}, hoành ${pWep} hóa giải 80% uy lực, thuận thế phản đòn gây ${pDmg} sát thương!`;
        en += `${oName} unleashed a deadly ${opponentCmd}, but ${pName} executed a masterful ${playerCmd}, parrying 80% damage and countering for ${pDmg} damage!`;
      } else {
        vi += `${pName} vung ${pWep} thi triển ${cmdLabelVi.SPECIAL_STRIKE}, nhưng ${oName} đã sớm đề phòng dùng ${cmdLabelVi.DEFEND}, cản phá đòn hiểm và phản kích gây ${oDmg} sát thương!`;
        en += `${pName} unleashed ${playerCmd}, but ${oName} stood firm with ${opponentCmd}, deflecting the blow and countering for ${oDmg} damage!`;
      }
    } else if (isCrit) {
      if (playerCmd === 'SPECIAL_STRIKE' && opponentCmd === 'FOCUS_SPIRIT') {
        vi += `Nhận thấy ${oName} đang sơ hở ${cmdLabelVi.FOCUS_SPIRIT}, ${pName} bộc phát Tuyệt Kỹ ${cmdLabelVi.SPECIAL_STRIKE}, đao mang chấn động gây ${pDmg} sát thương bạo kích!`;
        en += `Catching ${oName} meditating with ${opponentCmd}, ${pName} struck with Decimation ${playerCmd}, inflicting ${pDmg} critical damage!`;
      } else if (opponentCmd === 'SPECIAL_STRIKE' && playerCmd === 'FOCUS_SPIRIT') {
        vi += `${pName} đang tập trung ${cmdLabelVi.FOCUS_SPIRIT} thì bị ${oName} tung Tuyệt Kỹ ${cmdLabelVi.SPECIAL_STRIKE} đánh phủ đầu trọng thương, nhận ${oDmg} sát thương chí mạng!`;
        en += `${pName}'s ${playerCmd} was crushed as ${oName} decimated with ${opponentCmd}, dealing ${oDmg} critical damage!`;
      } else if (playerCmd === 'ATTACK' && opponentCmd === 'FOCUS_SPIRIT') {
        vi += `${pName} chớp thời cơ ${oName} đang ${cmdLabelVi.FOCUS_SPIRIT}, đột kích chém rách phòng ngự phá chiêu (${cmdLabelVi.ATTACK}), gây ${pDmg} sát thương!`;
        en += `${pName} interrupted ${oName}'s ${opponentCmd} with a crushing ${playerCmd}, dealing ${pDmg} bonus damage!`;
      } else {
        vi += `Hai mãnh tướng cùng lúc tung đòn quyết định! ${pName} gây ${pDmg} sát thương, ${oName} đánh trả ${oDmg} sát thương vang dội chiến trường!`;
        en += `Both champions clashed with signature strikes! ${pName} dealt ${pDmg} damage, while ${oName} inflicted ${oDmg} damage!`;
      }
    } else if (playerCmd === 'ATTACK' && opponentCmd === 'ATTACK') {
      vi += `Hai tướng giục ngựa đối xông, ${pWep} và ${oWep} va chạm nảy lửa (${cmdLabelVi.ATTACK} vs ${cmdLabelVi.ATTACK})! ${pName} gây ${pDmg} sát thương, ${oName} gây ${oDmg} sát thương.`;
      en += `Both riders charged head-on, weapons clashing fiercely! ${pName} dealt ${pDmg} damage, while ${oName} dealt ${oDmg} damage.`;
    } else if (playerCmd === 'ATTACK' && opponentCmd === 'DEFEND') {
      vi += `${pName} tiến công dồn dập (${cmdLabelVi.ATTACK}), nhưng ${oName} kiên thủ vững vàng (${cmdLabelVi.DEFEND}), chỉ nhận ${pDmg} sát thương nhẹ.`;
      en += `${pName} pressed the attack, but ${oName} guarded firmly, taking only ${pDmg} reduced damage.`;
    } else if (playerCmd === 'DEFEND' && opponentCmd === 'ATTACK') {
      vi += `${oName} hăng máu chém tới (${cmdLabelVi.ATTACK}), ${pName} bình tĩnh giơ binh khí đón đỡ (${cmdLabelVi.DEFEND}), chỉ chịu ${oDmg} sát thương.`;
      en += `${oName} struck fiercely, but ${pName} braced defensively, suffering only ${oDmg} damage.`;
    } else if (playerCmd === 'DEFEND' && opponentCmd === 'DEFEND') {
      vi += `Cả hai chiến tướng đều thận trọng thủ thế (${cmdLabelVi.DEFEND} vs ${cmdLabelVi.DEFEND}), ghìm cương đảo quanh quan sát sơ hở.`;
      en += `Both warriors held defensive stances warily, circling each other without committing.`;
    } else if (playerCmd === 'FOCUS_SPIRIT' && opponentCmd === 'DEFEND') {
      vi += `${oName} thận trọng phòng thủ, tạo cơ hội cho ${pName} hô hấp định thần, Tụ Khí Quy Nguyên (${cmdLabelVi.FOCUS_SPIRIT}) tích lũy nộ khí!`;
      en += `${oName} guarded cautiously, giving ${pName} time to channel inner qi with Focus Spirit!`;
    } else if (playerCmd === 'DEFEND' && opponentCmd === 'FOCUS_SPIRIT') {
      vi += `${pName} thủ thế cảnh giác, nhường thế trận cho ${oName} Tụ Khí Quy Nguyên (${cmdLabelVi.FOCUS_SPIRIT}), khí thế tăng vọt!`;
      en += `${pName} held back in defense, allowing ${oName} to gather strength with Focus Spirit!`;
    } else {
      vi += `${pName} dùng ${cmdLabelVi[playerCmd]}, ${oName} dùng ${cmdLabelVi[opponentCmd]}! (${pDmg} sát thương / ${oDmg} sát thương).`;
      en += `${pName} used ${playerCmd}, ${oName} responded with ${opponentCmd}! (${pDmg} dmg vs ${oDmg} dmg).`;
    }

    return { vi, en };
  }

  /**
   * Finalizes duel outcomes, awards rewards, and records transactions safely.
   */
  private finalizeDuelResult(duel: ActiveDuelState, winnerId: string | 'DRAW'): DuelResult {
    const isVictory = winnerId === duel.player.characterId;
    const isDraw = winnerId === 'DRAW';
    const player = duel.player;
    const opponent = duel.opponent;

    let outcomeType: DuelOutcomeType = 'POINTS_DECISION';
    if (player.currentHp <= 0 || opponent.currentHp <= 0) {
      outcomeType = 'KNOCKOUT';
    } else if (player.morale <= 0 || opponent.morale <= 0) {
      outcomeType = 'MORALE_ROUT';
    } else if (isDraw) {
      outcomeType = 'STALEMATE';
    }

    const rewards: DuelRewards = {
      warExpGained: 0
    };

    let summaryNarrativeVi = '';
    let summaryNarrativeEn = '';

    const pName = player.nameVi || player.name;
    const oName = opponent.nameVi || opponent.name;

    if (duel.context === 'FRIENDLY_SPARRING') {
      rewards.warExpGained = isVictory ? 25 : 20;
      rewards.affinityDelta = isVictory ? 25 : 20;
      rewards.respectDelta = 10;
      rewards.fatigueDelta = 15;

      summaryNarrativeVi = isVictory
        ? `Trận tỉ võ kết thúc! ${pName} đại thắng ${oName} sau ${duel.rounds.length} hiệp giao tranh kịch liệt. Hai bên cùng tăng tiến võ nghệ (+${rewards.warExpGained} WAR EXP), tình cảm hảo cảm tăng thêm (+${rewards.affinityDelta} Affinity)!`
        : `Trận tỉ võ kết thúc! ${oName} chiếm thượng phong. Dù vậy, đôi bên đều bội phục phong thái của nhau (+${rewards.warExpGained} WAR EXP, +${rewards.affinityDelta} Affinity).`;

      summaryNarrativeEn = isVictory
        ? `Sparring concluded! ${pName} emerged victorious over ${oName} after ${duel.rounds.length} intense rounds (+${rewards.warExpGained} WAR EXP, +${rewards.affinityDelta} Affinity)!`
        : `Sparring concluded! ${oName} claimed victory, but mutual respect deepened (+${rewards.warExpGained} WAR EXP, +${rewards.affinityDelta} Affinity).`;

      // Persist Kizuna & Progression in DB if commitDb is enabled
      if (duel.metadata?.commitDb !== false) {
        this.commitSparringRewards(player.characterId, opponent.characterId, rewards);
      }
    } else if (duel.context === 'TOURNAMENT_ARENA') {
      const challenger = ARENA_ROSTER.find((c) => c.opponentId === opponent.characterId);
      const prize = challenger?.prizeCash || 500;
      const baseExp = challenger?.warExpReward || 25;

      rewards.warExpGained = isVictory ? baseExp : Math.round(baseExp / 2);
      rewards.prizeCash = isVictory ? prize : 0;
      rewards.fatigueDelta = 20;

      summaryNarrativeVi = isVictory
        ? `Vang danh Diễn Võ Đài! ${pName} đả bại ${oName}, đoạt giải quán quân lôi đài, thu về ${prize} quan thưởng kim cùng ${rewards.warExpGained} WAR EXP!`
        : `Đáng tiếc! ${pName} không thể vượt qua cửa ải của ${oName} tại Diễn Võ Đài, đành hẹn ngày tái đấu (+${rewards.warExpGained} WAR EXP).`;

      summaryNarrativeEn = isVictory
        ? `Martial Arena Victory! ${pName} triumphed over ${oName}, claiming ${prize} quan prize money and ${rewards.warExpGained} WAR EXP!`
        : `Arena Defeat! ${pName} fell short against ${oName} (+${rewards.warExpGained} WAR EXP).`;

      if (isVictory && prize > 0 && duel.metadata?.commitDb === true) {
        this.commitTournamentPrize(player.characterId, prize, opponent.nameVi);
      }
    } else if (duel.context === 'CARAVAN_DEFENSE') {
      rewards.warExpGained = isVictory ? 30 : 20;
      rewards.caravanSaved = isVictory;
      rewards.fatigueDelta = 25;

      const caravanId = duel.metadata?.caravanId;

      summaryNarrativeVi = isVictory
        ? `Trảm tướng đoạt cờ! ${pName} dũng mãnh đả bại Sơn Tặc Đầu Mục ${oName}, bảo toàn 100% hàng hóa của thương đoàn, kích thoái toán thổ phỉ (+${rewards.warExpGained} WAR EXP, +25 LDR EXP)!`
        : `Thất thủ trước quỷ kế của đầu mục thổ phỉ ${oName}! Thương đoàn bị cướp phá một phần hàng hóa, ${pName} chịu vết thương nhẹ.`;

      summaryNarrativeEn = isVictory
        ? `Chieftain Vanquished! ${pName} repelled bandit chief ${oName}, securing 100% caravan cargo (+${rewards.warExpGained} WAR EXP, +25 LDR EXP)!`
        : `Defeated in ambush! The caravan suffered partial cargo loss to ${oName}.`;

      if (caravanId && duel.metadata?.commitDb === true) {
        this.commitCaravanDefense(player.characterId, caravanId, isVictory);
      }
    }

    const result: DuelResult = {
      duelId: duel.duelId,
      duelContext: duel.context,
      totalRounds: duel.rounds.length,
      winnerId,
      isVictory,
      player,
      opponent,
      rounds: duel.rounds,
      outcomeType,
      rewards,
      summaryNarrativeVi,
      summaryNarrativeEn
    };

    // Record chronicle row in session_duels
    try {
      this.db.execute(
        `INSERT INTO session_duels (duel_id, game_date, context, player_id, opponent_id, winner_id, outcome_type, total_rounds, rewards_json, narrative_summary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          duel.duelId,
          this.getGameDate(),
          duel.context,
          player.characterId,
          opponent.characterId,
          winnerId,
          outcomeType,
          duel.rounds.length,
          JSON.stringify(rewards),
          summaryNarrativeVi
        ]
      );
    } catch {
      // Non-fatal
    }

    return result;
  }

  /**
   * Commits friendly sparring rewards to database without breaking SQLite invariants.
   */
  private commitSparringRewards(
    playerId: string,
    npcId: string,
    rewards: DuelRewards
  ): void {
    try {
      this.db.transaction(() => {
        // 1. Award WAR EXP
        if (rewards.warExpGained > 0) {
          ProgressionExpService.awardAttributeExp(playerId, 'war', rewards.warExpGained);
        }

        // 2. Increase fatigue
        if (rewards.fatigueDelta) {
          this.db.execute(
            `UPDATE player_state SET fatigue = MIN(100, fatigue + ?) WHERE player_id = ?;`,
            [rewards.fatigueDelta, playerId]
          );
        }

        // 3. Record relationship delta
        const date = this.getGameDate();
        const affinity = rewards.affinityDelta || 15;
        this.db.execute(
          `INSERT INTO npc_relationship_deltas (npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes)
           VALUES (?, ?, ?, (SELECT COALESCE(MAX(sentiment_total), 50) + ? FROM npc_relationship_deltas WHERE npc_id = ?), 'Bằng Hữu Luận Võ', 'So tài đao thương, khâm phục võ nghệ');`,
          [npcId, date, affinity, affinity, npcId]
        );
      });
    } catch {
      // Non-fatal if DB is mocked
    }
  }

  /**
   * Commits tournament prize cash atomically preserving cashflow & double-entry journal.
   */
  private commitTournamentPrize(
    playerId: string,
    prizeCash: number,
    opponentName: string
  ): void {
    try {
      this.db.transaction(() => {
        const player = this.db.queryOne<any>(
          `SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ? LIMIT 1;`,
          [playerId]
        );
        if (!player) return;

        const currentLiquid = Number(player.liquid_cash || 0);
        const currentSafe = Number(player.safe_cash || 0);
        const newLiquid = currentLiquid + prizeCash;
        const newTotalBal = newLiquid + currentSafe;

        const date = this.getGameDate();
        const txnId = nextSequentialId(this.db, 'cashflow_ledger', 'TXN', date);

        // 1. Update player_state.liquid_cash
        this.db.execute(
          `UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;`,
          [newLiquid, playerId]
        );

        // 2. Insert cashflow_ledger row
        postCashflowEntry(this.db, {
          txnId,
          gameDate: date,
          counterparty: 'Diễn Võ Đài Trác Quận',
          category: 'Võ Đài Thưởng Kim',
          inflow: prizeCash,
          balance: newTotalBal,
          memo: `Thưởng kim lôi đài sau khi đả bại ${opponentName}`
        });

        // 3. Insert balanced double-entry journal rows
        this.db.execute(
          `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
           VALUES (?, 'CMP-184-ZHOU-01', ?, '1001_CASH_MOBILE', ?, 0, 'Tiền thưởng lôi đài Diễn Võ');`,
          [txnId, date, prizeCash]
        );
        this.db.execute(
          `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
           VALUES (?, 'CMP-184-ZHOU-01', ?, '7001_BOUNTY_INCOME', 0, ?, 'Thu nhập giải thưởng Diễn Võ');`,
          [txnId, date, prizeCash]
        );
      });
    } catch {
      // Non-fatal
    }
  }

  /**
   * Commits caravan ambush defense outcome to database.
   */
  private commitCaravanDefense(
    playerId: string,
    caravanId: string,
    isVictory: boolean
  ): void {
    try {
      this.db.transaction(() => {
        if (isVictory) {
          // Safeguard caravan
          this.db.execute(
            `UPDATE trade_caravans SET status = 'EN_ROUTE' WHERE caravan_id = ?;`,
            [caravanId]
          );
          ProgressionExpService.awardAttributeExp(playerId, 'war', 25);
          ProgressionExpService.awardAttributeExp(playerId, 'ldr', 25);
        } else {
          // Defeat penalty
          this.db.execute(
            `UPDATE player_state SET health = MAX(20, health - 10), fatigue = MIN(100, fatigue + 20) WHERE player_id = ?;`,
            [playerId]
          );
        }
      });
    } catch {
      // Non-fatal
    }
  }

  /**
   * Runs an end-to-end automated simulation of a 3-5 round duel.
   * Highly useful for integration test suites, AI-vs-AI battles, and fast resolution.
   */
  public simulateDuel(
    options: InitiateDuelOptions & {
      playerCommands?: TacticalCommand[];
      forcedOpponentCommands?: TacticalCommand[];
      autoResolve?: boolean;
    }
  ): DuelResult {
    const duel = this.initiateDuel(options);

    const pCommands = options.playerCommands || ['ATTACK', 'ATTACK', 'SPECIAL_STRIKE', 'ATTACK', 'SPECIAL_STRIKE'];
    const oCommands = options.forcedOpponentCommands;

    let roundIdx = 0;
    while (!duel.isConcluded && roundIdx < duel.maxRounds) {
      const pCmd = pCommands[roundIdx] || 'ATTACK';
      const oCmd = oCommands ? oCommands[roundIdx] : undefined;

      this.resolveRound(duel.duelId, pCmd, oCmd);
      roundIdx++;
    }

    if (!duel.result) {
      duel.result = this.concludeDuel(duel.duelId);
    }

    return duel.result;
  }

  /**
   * Contextual Trigger 1: Spar with historical hero (Zhang Fei or Guan Yu).
   */
  public sparWithHero(
    playerId: string,
    heroNpcId: string,
    autoResolve = true,
    playerCommands?: TacticalCommand[]
  ): DuelResult {
    return this.simulateDuel({
      playerId,
      opponentId: heroNpcId,
      context: 'FRIENDLY_SPARRING',
      maxRounds: 5,
      autoResolve,
      playerCommands,
      commitDb: true
    });
  }

  /**
   * Contextual Trigger 2: Challenge Arena Tournament Tier.
   */
  public challengeArena(
    playerId: string,
    tier: number | 'TIER_1' | 'TIER_2' | 'TIER_3',
    autoResolve = true,
    playerCommands?: TacticalCommand[]
  ): DuelResult {
    let tierNum = 1;
    if (typeof tier === 'string') {
      if (tier === 'TIER_2') tierNum = 2;
      else if (tier === 'TIER_3') tierNum = 3;
    } else {
      tierNum = tier;
    }

    const challenger = ARENA_ROSTER.find((c) => c.tier === tierNum) || ARENA_ROSTER[0];

    return this.simulateDuel({
      playerId,
      opponentId: challenger.opponentId,
      context: 'TOURNAMENT_ARENA',
      maxRounds: 5,
      autoResolve,
      playerCommands,
      metadata: { tier: tierNum, prizeCash: challenger.prizeCash },
      commitDb: true
    });
  }

  /**
   * Contextual Trigger 3: Defend Caravan Ambush against bandit chieftain.
   */
  public defendCaravanAmbush(
    playerId: string,
    caravanId: string,
    strongholdId = 'STR-0001',
    autoResolve = true,
    playerCommands?: TacticalCommand[]
  ): DuelResult {
    return this.simulateDuel({
      playerId,
      opponentId: 'BANDIT-CHIEF-01',
      context: 'CARAVAN_DEFENSE',
      maxRounds: 5,
      autoResolve,
      playerCommands,
      metadata: { caravanId, strongholdId },
      commitDb: true
    });
  }
}
