/**
 * Multi-Round Tactical Skirmish & Battle Engine
 * Three Kingdoms Military Simulation
 *
 * Implements tactical combat simulations featuring:
 * - 3 Echelons: Vanguard (Tiền phong), Center (Trung quân), Rearguard (Hậu quân)
 * - Terrain bonuses: Plains, Mountains, River/Marsh, Hills, Fortress
 * - Multi-round tactical loop (Up to 5 rounds) with morale routs & cohesion collapse
 * - Deterministic / Seedable tactical resolution
 *
 * Standards: AgentOption Universe Modular Architecture & Anti-AI-Slop standard.
 */

export type TerrainType = 'PLAINS' | 'MOUNTAINS' | 'RIVER_MARSH' | 'HILLS' | 'FORTRESS';
export type EchelonPosition = 'VANGUARD' | 'CENTER' | 'REARGUARD';
export type BattleSide = 'ATTACKER' | 'DEFENDER';
export type BattleOutcomeType =
  | 'DECISIVE_VICTORY'
  | 'TACTICAL_VICTORY'
  | 'MARGINAL_VICTORY'
  | 'STALEMATE'
  | 'TACTICAL_DEFEAT'
  | 'CRUSHING_DEFEAT';

export interface TroopUnitComposition {
  infantry: number;
  cavalry: number;
  archers: number;
}

export interface CommanderProfile {
  id: string;
  name: string;
  titleVi?: string;
  war: number;        // Martial prowess (combat damage & duel capability: 30-100)
  leadership: number; // Command & cohesion (defense & morale stability: 30-100)
  intelligence: number;// Tactics & stratagem trigger chance (30-100)
}

export interface EchelonState {
  position: EchelonPosition;
  nameVi: string;
  troops: TroopUnitComposition;
  initialTotalTroops: number;
  currentTotalTroops: number;
  morale: number; // 0 - 100
  isRouted: boolean;
  casualties: number;
  attackRating: number;
  defenseRating: number;
}

export interface ArmyTacticalFormation {
  side: BattleSide;
  name: string;
  commander: CommanderProfile;
  vanguard: EchelonState;
  center: EchelonState;
  rearguard: EchelonState;
  cohesionMorale: number; // 0 - 100
  isDefeated: boolean;
  defeatReason?: 'CENTER_COLLAPSE' | 'TWO_ECHELONS_ROUTED' | 'TOTAL_ANNIHILATION' | 'TIME_EXHAUSTION';
}

export interface RoundEchelonClash {
  echelon: EchelonPosition;
  attackerCasualties: number;
  defenderCasualties: number;
  attackerMoraleDelta: number;
  defenderMoraleDelta: number;
  attackerRoutedNow: boolean;
  defenderRoutedNow: boolean;
  logVi: string;
}

export interface BattleRoundSummary {
  roundNumber: number;
  roundTitleVi: string;
  attackerTacticTriggered?: string;
  defenderTacticTriggered?: string;
  clashes: RoundEchelonClash[];
  attackerRoundLosses: number;
  defenderRoundLosses: number;
  attackerRemainingTroops: number;
  defenderRemainingTroops: number;
  attackerMoraleAvg: number;
  defenderMoraleAvg: number;
  logVi: string;
}

export interface SpoilsOfWar {
  lootCash: number;
  bountyReward: number;
  capturedGrain: number;
  capturedIron: number;
  capturedEquipment: string[];
  prestigeEarned: number;
}

export interface BattleResult {
  battleId: string;
  timestamp: string;
  terrain: TerrainType;
  terrainNameVi: string;
  winner: 'ATTACKER' | 'DEFENDER' | 'DRAW';
  outcome: BattleOutcomeType;
  outcomeTitleVi: string;
  totalRounds: number;
  attackerInitialTroops: number;
  attackerFinalTroops: number;
  attackerCasualties: number;
  defenderInitialTroops: number;
  defenderFinalTroops: number;
  defenderCasualties: number;
  attackerMoraleFinal: number;
  defenderMoraleFinal: number;
  attackerArmy: ArmyTacticalFormation;
  defenderArmy: ArmyTacticalFormation;
  rounds: BattleRoundSummary[];
  generalActions: string[];
  spoils: SpoilsOfWar;
  narrativeSummaryVi: string;
}

export interface BattleSimulationInput {
  battleId?: string;
  terrain: TerrainType;
  attacker: {
    commander: CommanderProfile;
    vanguardTroops?: Partial<TroopUnitComposition> | number;
    centerTroops?: Partial<TroopUnitComposition> | number;
    rearguardTroops?: Partial<TroopUnitComposition> | number;
    initialMorale?: number;
  };
  defender: {
    commander: CommanderProfile;
    vanguardTroops?: Partial<TroopUnitComposition> | number;
    centerTroops?: Partial<TroopUnitComposition> | number;
    rearguardTroops?: Partial<TroopUnitComposition> | number;
    initialMorale?: number;
    strongholdPlunderedWealth?: number;
    strongholdBounty?: number;
  };
  maxRounds?: number;
  randomSeed?: number;
}

/**
 * Normalizes input troop numbers into structured unit compositions.
 */
function normalizeTroopComposition(
  input?: Partial<TroopUnitComposition> | number,
  defaultRatio: { inf: number; cav: number; arc: number } = { inf: 0.6, cav: 0.2, arc: 0.2 }
): TroopUnitComposition {
  if (typeof input === 'number') {
    const total = Math.max(0, Math.round(input));
    const infantry = Math.round(total * defaultRatio.inf);
    const cavalry = Math.round(total * defaultRatio.cav);
    const archers = Math.max(0, total - infantry - cavalry);
    return { infantry, cavalry, archers };
  }

  if (input && typeof input === 'object') {
    return {
      infantry: Math.max(0, Math.round(input.infantry || 0)),
      cavalry: Math.max(0, Math.round(input.cavalry || 0)),
      archers: Math.max(0, Math.round(input.archers || 0))
    };
  }

  return { infantry: 10, cavalry: 5, archers: 5 };
}

function calculateTotalTroops(comp: TroopUnitComposition): number {
  return comp.infantry + comp.cavalry + comp.archers;
}

/**
 * Creates an echelon instance with base ratings
 */
function createEchelon(
  position: EchelonPosition,
  nameVi: string,
  troops: TroopUnitComposition,
  initialMorale = 90
): EchelonState {
  const total = calculateTotalTroops(troops);
  let attackMod = 1.0;
  let defenseMod = 1.0;

  switch (position) {
    case 'VANGUARD':
      attackMod = 1.35; // Vanguard strikes with high offensive momentum
      defenseMod = 0.90; // Vanguard is vulnerable to counter-charges
      break;
    case 'CENTER':
      attackMod = 1.00;
      defenseMod = 1.25; // Center forms fortified defensive line
      break;
    case 'REARGUARD':
      attackMod = 1.15; // Archers loose supportive volleys
      defenseMod = 1.00;
      break;
  }

  const rawAtk = (troops.infantry * 1.0 + troops.cavalry * 1.45 + troops.archers * 1.2) * attackMod;
  const rawDef = (troops.infantry * 1.2 + troops.cavalry * 1.05 + troops.archers * 0.85) * defenseMod;

  return {
    position,
    nameVi,
    troops: { ...troops },
    initialTotalTroops: total,
    currentTotalTroops: total,
    morale: initialMorale,
    isRouted: false,
    casualties: 0,
    attackRating: Math.round(rawAtk),
    defenseRating: Math.round(rawDef)
  };
}

export class TacticalBattleEngine {
  /**
   * Translates terrain to Vietnamese display name
   */
  public static getTerrainNameVi(terrain: TerrainType): string {
    switch (terrain) {
      case 'PLAINS':
        return 'Bình Nguyên Khoáng Dã';
      case 'MOUNTAINS':
        return 'Sơn Đạo Hiểm Cốc';
      case 'RIVER_MARSH':
        return 'Đầm Lầy Thủy Nhược';
      case 'HILLS':
        return 'Gò Đồi Cao Điểm';
      case 'FORTRESS':
        return 'Tường Thành Cứ Điểm';
      default:
        return 'Chiến Địa Hỗn Hợp';
    }
  }

  /**
   * Calculates terrain multipliers for unit types
   */
  public static getTerrainMultipliers(terrain: TerrainType): {
    infantryAtk: number;
    infantryDef: number;
    cavalryAtk: number;
    cavalryDef: number;
    archersAtk: number;
    archersDef: number;
    ambushBonus: number;
  } {
    switch (terrain) {
      case 'PLAINS':
        // Cavalry +25%
        return {
          infantryAtk: 1.0,
          infantryDef: 1.0,
          cavalryAtk: 1.25,
          cavalryDef: 1.25,
          archersAtk: 1.0,
          archersDef: 0.95,
          ambushBonus: 0.9
        };
      case 'MOUNTAINS':
        // Infantry & Archers +30%, Cavalry -30%
        return {
          infantryAtk: 1.30,
          infantryDef: 1.30,
          cavalryAtk: 0.70,
          cavalryDef: 0.70,
          archersAtk: 1.30,
          archersDef: 1.20,
          ambushBonus: 1.25
        };
      case 'RIVER_MARSH':
        // Cavalry -20%, Ambush chance +25%
        return {
          infantryAtk: 0.95,
          infantryDef: 0.95,
          cavalryAtk: 0.80,
          cavalryDef: 0.80,
          archersAtk: 1.05,
          archersDef: 1.0,
          ambushBonus: 1.25
        };
      case 'HILLS':
        return {
          infantryAtk: 1.15,
          infantryDef: 1.15,
          cavalryAtk: 0.90,
          cavalryDef: 0.90,
          archersAtk: 1.20,
          archersDef: 1.10,
          ambushBonus: 1.15
        };
      case 'FORTRESS':
        return {
          infantryAtk: 1.1,
          infantryDef: 1.4,
          cavalryAtk: 0.6,
          cavalryDef: 0.7,
          archersAtk: 1.25,
          archersDef: 1.3,
          ambushBonus: 0.8
        };
      default:
        return {
          infantryAtk: 1.0,
          infantryDef: 1.0,
          cavalryAtk: 1.0,
          cavalryDef: 1.0,
          archersAtk: 1.0,
          archersDef: 1.0,
          ambushBonus: 1.0
        };
    }
  }

  /**
   * Main tactical battle simulation execution
   */
  public static simulate(input: BattleSimulationInput): BattleResult {
    const battleId = input.battleId || `BAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const terrain = input.terrain;
    const terrainNameVi = TacticalBattleEngine.getTerrainNameVi(terrain);
    const terrainMods = TacticalBattleEngine.getTerrainMultipliers(terrain);
    const maxRounds = Math.min(5, Math.max(1, input.maxRounds || 5));

    // Initialize Attacker Formation
    const atkAtkMorale = input.attacker.initialMorale || 95;
    const attackerArmy: ArmyTacticalFormation = {
      side: 'ATTACKER',
      name: input.attacker.commander.name,
      commander: input.attacker.commander,
      vanguard: createEchelon(
        'VANGUARD',
        'Tiền phong Đột kích',
        normalizeTroopComposition(input.attacker.vanguardTroops, { inf: 0.4, cav: 0.4, arc: 0.2 }),
        atkAtkMorale
      ),
      center: createEchelon(
        'CENTER',
        'Trung quân Trung kiên',
        normalizeTroopComposition(input.attacker.centerTroops, { inf: 0.7, cav: 0.1, arc: 0.2 }),
        atkAtkMorale
      ),
      rearguard: createEchelon(
        'REARGUARD',
        'Hậu quân Tiễn trận',
        normalizeTroopComposition(input.attacker.rearguardTroops, { inf: 0.3, cav: 0.1, arc: 0.6 }),
        atkAtkMorale
      ),
      cohesionMorale: atkAtkMorale,
      isDefeated: false
    };

    // Initialize Defender Formation
    const defMorale = input.defender.initialMorale || 85;
    const defenderArmy: ArmyTacticalFormation = {
      side: 'DEFENDER',
      name: input.defender.commander.name,
      commander: input.defender.commander,
      vanguard: createEchelon(
        'VANGUARD',
        'Tiền tiêu Phỉ lũy',
        normalizeTroopComposition(input.defender.vanguardTroops, { inf: 0.5, cav: 0.3, arc: 0.2 }),
        defMorale
      ),
      center: createEchelon(
        'CENTER',
        'Trung sào Đại trại',
        normalizeTroopComposition(input.defender.centerTroops, { inf: 0.7, cav: 0.1, arc: 0.2 }),
        defMorale
      ),
      rearguard: createEchelon(
        'REARGUARD',
        'Hậu doanh Cung nỏ',
        normalizeTroopComposition(input.defender.rearguardTroops, { inf: 0.4, cav: 0.1, arc: 0.5 }),
        defMorale
      ),
      cohesionMorale: defMorale,
      isDefeated: false
    };

    const initialAtkTroops =
      attackerArmy.vanguard.initialTotalTroops +
      attackerArmy.center.initialTotalTroops +
      attackerArmy.rearguard.initialTotalTroops;

    const initialDefTroops =
      defenderArmy.vanguard.initialTotalTroops +
      defenderArmy.center.initialTotalTroops +
      defenderArmy.rearguard.initialTotalTroops;

    const rounds: BattleRoundSummary[] = [];
    const generalActions: string[] = [];

    // General Pre-battle Speech
    generalActions.push(
      `Thống soái ${attackerArmy.commander.name} hiệu triệu tam quân tại ${terrainNameVi}, bày bố thế trận Tiền - Trung - Hậu vững như bàn thạch.`
    );
    generalActions.push(
      `Tướng giặc ${defenderArmy.commander.name} ỷ dốc hiểm địa, thúc thủ cố thủ cự địch.`
    );

    // Round by round skirmish loop
    let currentRound = 1;
    while (currentRound <= maxRounds) {
      const roundSummary = TacticalBattleEngine.executeBattleRound(
        currentRound,
        attackerArmy,
        defenderArmy,
        terrain,
        terrainMods,
        generalActions
      );

      rounds.push(roundSummary);

      // Check Army Rout conditions
      TacticalBattleEngine.evaluateArmyCohesion(attackerArmy);
      TacticalBattleEngine.evaluateArmyCohesion(defenderArmy);

      if (attackerArmy.isDefeated || defenderArmy.isDefeated) {
        break;
      }

      currentRound++;
    }

    // Determine final battle outcome
    let winner: 'ATTACKER' | 'DEFENDER' | 'DRAW' = 'DRAW';
    let outcome: BattleOutcomeType = 'STALEMATE';
    let outcomeTitleVi = '[HÒA HOÃN] Hai Bên Bất Phân Thắng Bại';

    if (defenderArmy.isDefeated && !attackerArmy.isDefeated) {
      winner = 'ATTACKER';
      if (
        defenderArmy.defeatReason === 'CENTER_COLLAPSE' ||
        defenderArmy.defeatReason === 'TOTAL_ANNIHILATION'
      ) {
        outcome = 'DECISIVE_VICTORY';
        outcomeTitleVi = '[ĐẠI THẮNG] Phá Tan Quân Địch';
      } else {
        outcome = 'TACTICAL_VICTORY';
        outcomeTitleVi = '[THẮNG LỢI] Địch Quân Vỡ Trận';
      }
    } else if (attackerArmy.isDefeated && !defenderArmy.isDefeated) {
      winner = 'DEFENDER';
      if (
        attackerArmy.defeatReason === 'CENTER_COLLAPSE' ||
        attackerArmy.defeatReason === 'TOTAL_ANNIHILATION'
      ) {
        outcome = 'CRUSHING_DEFEAT';
        outcomeTitleVi = '[THẢM BẠI] Toàn Quân Tan Vỡ';
      } else {
        outcome = 'TACTICAL_DEFEAT';
        outcomeTitleVi = '[BẠI TRẬN] Lực Lượng Triệt Thoái';
      }
    } else {
      // Comparison by casualty differential
      const atkLossRatio = (initialAtkTroops - attackerArmy.vanguard.currentTotalTroops - attackerArmy.center.currentTotalTroops - attackerArmy.rearguard.currentTotalTroops) / Math.max(1, initialAtkTroops);
      const defLossRatio = (initialDefTroops - defenderArmy.vanguard.currentTotalTroops - defenderArmy.center.currentTotalTroops - defenderArmy.rearguard.currentTotalTroops) / Math.max(1, initialDefTroops);

      if (defLossRatio - atkLossRatio > 0.15) {
        winner = 'ATTACKER';
        outcome = 'MARGINAL_VICTORY';
        outcomeTitleVi = '[TIỂU THẮNG] Đẩy Lui Địch Trận';
      } else if (atkLossRatio - defLossRatio > 0.15) {
        winner = 'DEFENDER';
        outcome = 'TACTICAL_DEFEAT';
        outcomeTitleVi = '[BẠI TRẬN] Tổn Thất Trọng Yếu';
      } else {
        winner = 'DRAW';
        outcome = 'STALEMATE';
        outcomeTitleVi = '[HÒA HOÃN] Cầm Cự Bất Phân Thắng Bại';
      }
    }

    const finalAtkTroops =
      attackerArmy.vanguard.currentTotalTroops +
      attackerArmy.center.currentTotalTroops +
      attackerArmy.rearguard.currentTotalTroops;
    const finalDefTroops =
      defenderArmy.vanguard.currentTotalTroops +
      defenderArmy.center.currentTotalTroops +
      defenderArmy.rearguard.currentTotalTroops;

    const atkCasualties = initialAtkTroops - finalAtkTroops;
    const defCasualties = initialDefTroops - finalDefTroops;

    // Compute Spoils of War
    const spoils: SpoilsOfWar = {
      lootCash: 0,
      bountyReward: 0,
      capturedGrain: 0,
      capturedIron: 0,
      capturedEquipment: [],
      prestigeEarned: 0
    };

    if (winner === 'ATTACKER') {
      const plundered = input.defender.strongholdPlunderedWealth || 0;
      const bounty = input.defender.strongholdBounty || 0;
      spoils.lootCash = plundered;
      spoils.bountyReward = bounty;
      spoils.capturedGrain = Math.round(initialDefTroops * 0.45);
      spoils.capturedIron = Math.round(defCasualties * 0.25);
      spoils.capturedEquipment = ['WEAPON_SWORD', 'ARMOR_SHIELD'];
      spoils.prestigeEarned = outcome === 'DECISIVE_VICTORY' ? 45 : 25;
    }

    // Build Narrative Summary
    let narrativeSummaryVi = '';
    if (winner === 'ATTACKER') {
      narrativeSummaryVi = `Trận chiến tại ${terrainNameVi} khép lại sau ${rounds.length} hiệp kịch chiến. Quân ta dưới sự chỉ huy của ${attackerArmy.commander.name} đã đánh tan ${defenderArmy.name}, tiêu diệt ${defCasualties} địch binh. Thu hồi ${spoils.lootCash} tiền chiến lợi phẩm và lĩnh thưởng ${spoils.bountyReward} tiền quân công triều đình!`;
    } else if (winner === 'DEFENDER') {
      narrativeSummaryVi = `Tại ${terrainNameVi}, quân ta vấp phải thế trận phòng thủ hiểm trở của ${defenderArmy.commander.name}. Trải qua ${rounds.length} hiệp giằng co, tuyến trận chịu tổn thất ${atkCasualties} dũng sĩ, toàn quân phải lui về tái lập doanh trại.`;
    } else {
      narrativeSummaryVi = `Hai bên giằng co ác liệt tại ${terrainNameVi} suốt ${rounds.length} hiệp mà không phân thắng bại. Hai cánh quân tạm thời lui binh bảo toàn lực lượng.`;
    }

    return {
      battleId,
      timestamp: new Date().toISOString(),
      terrain,
      terrainNameVi,
      winner,
      outcome,
      outcomeTitleVi,
      totalRounds: rounds.length,
      attackerInitialTroops: initialAtkTroops,
      attackerFinalTroops: finalAtkTroops,
      attackerCasualties: atkCasualties,
      defenderInitialTroops: initialDefTroops,
      defenderFinalTroops: finalDefTroops,
      defenderCasualties: defCasualties,
      attackerMoraleFinal: Math.round(attackerArmy.cohesionMorale),
      defenderMoraleFinal: Math.round(defenderArmy.cohesionMorale),
      attackerArmy,
      defenderArmy,
      rounds,
      generalActions,
      spoils,
      narrativeSummaryVi
    };
  }

  /**
   * Executes a single round of tactical clash between echelons
   */
  private static executeBattleRound(
    roundNumber: number,
    attacker: ArmyTacticalFormation,
    defender: ArmyTacticalFormation,
    terrain: TerrainType,
    terrainMods: ReturnType<typeof TacticalBattleEngine.getTerrainMultipliers>,
    generalActions: string[]
  ): BattleRoundSummary {
    const roundTitleVi = `Hiệp ${roundNumber}: Giao Tranh Quyết Liệt`;

    // 1. Tactic Phase
    let attackerTacticTriggered: string | undefined;
    let defenderTacticTriggered: string | undefined;

    let atkTacticAtkBonus = 1.0;
    let atkTacticDefBonus = 1.0;
    let defTacticAtkBonus = 1.0;
    let defTacticDefBonus = 1.0;

    // Check Attacker Commander Tactic Trigger (Intelligence & War check)
    const atkRoll = Math.random() * 100;
    if (atkRoll < attacker.commander.intelligence * 0.45) {
      if (terrain === 'PLAINS' && attacker.vanguard.troops.cavalry > 10) {
        attackerTacticTriggered = 'Kỵ Binh Đột Kích Bình Nguyên (Cavalry Surge)';
        atkTacticAtkBonus = 1.35;
        generalActions.push(
          `Hiệp ${roundNumber}: ${attacker.commander.name} phất cờ lệnh, kỵ binh tiền phong xông thẳng phá vỡ trận tuyến giặc!`
        );
      } else if (terrain === 'MOUNTAINS') {
        attackerTacticTriggered = 'Cao Điểm Cung Nỏ Liên Xạ (Highland Volley)';
        atkTacticAtkBonus = 1.30;
        generalActions.push(
          `Hiệp ${roundNumber}: ${attacker.commander.name} chiếm cứ điểm cao, dồn tên bắn xối xả xuống trận địa địch!`
        );
      } else {
        attackerTacticTriggered = 'Mãnh Tướng Trảm Trận (Heroic Vanguard Assault)';
        atkTacticAtkBonus = 1.25;
        generalActions.push(
          `Hiệp ${roundNumber}: ${attacker.commander.name} đích thân xông pha, khích lệ sĩ khí ba quân dâng cao!`
        );
      }
    }

    // Check Defender Commander Tactic Trigger
    const defRoll = Math.random() * 100;
    if (defRoll < defender.commander.intelligence * 0.4) {
      if (terrain === 'RIVER_MARSH') {
        defenderTacticTriggered = 'Thủy Thảo Mai Phục Kích (Marsh Ambush)';
        defTacticAtkBonus = 1.30;
        generalActions.push(
          `Hiệp ${roundNumber}: ${defender.commander.name} tận dụng lau sậy đầm lầy, bất ngờ đánh tạt sườn quân ta!`
        );
      } else {
        defenderTacticTriggered = 'Cố Thủ Đóng Cọc Doanh Trại (Iron Palisade)';
        defTacticDefBonus = 1.35;
        generalActions.push(
          `Hiệp ${roundNumber}: ${defender.commander.name} hạ lệnh đắp lũy giữ thế thủ, chống trả mãnh liệt!`
        );
      }
    }

    // 2. Echelon Clash Resolution
    const clashes: RoundEchelonClash[] = [];
    let roundAtkLosses = 0;
    let roundDefLosses = 0;

    // Clash 1: Vanguard (Tiền phong) vs Vanguard
    const vanguardClash = TacticalBattleEngine.resolveEchelonClash(
      'VANGUARD',
      attacker.vanguard,
      defender.vanguard,
      attacker.commander,
      defender.commander,
      terrainMods,
      atkTacticAtkBonus,
      atkTacticDefBonus,
      defTacticAtkBonus,
      defTacticDefBonus,
      // If enemy vanguard is routed, surviving vanguard presses enemy center
      defender.vanguard.isRouted ? defender.center : undefined
    );
    clashes.push(vanguardClash);
    roundAtkLosses += vanguardClash.attackerCasualties;
    roundDefLosses += vanguardClash.defenderCasualties;

    // Clash 2: Rearguard (Hậu quân) Support Volley
    const rearguardClash = TacticalBattleEngine.resolveEchelonClash(
      'REARGUARD',
      attacker.rearguard,
      defender.rearguard,
      attacker.commander,
      defender.commander,
      terrainMods,
      atkTacticAtkBonus,
      atkTacticDefBonus,
      defTacticAtkBonus,
      defTacticDefBonus
    );
    clashes.push(rearguardClash);
    roundAtkLosses += rearguardClash.attackerCasualties;
    roundDefLosses += rearguardClash.defenderCasualties;

    // Clash 3: Center (Trung quân) Engagement
    const centerClash = TacticalBattleEngine.resolveEchelonClash(
      'CENTER',
      attacker.center,
      defender.center,
      attacker.commander,
      defender.commander,
      terrainMods,
      atkTacticAtkBonus,
      atkTacticDefBonus,
      defTacticAtkBonus,
      defTacticDefBonus
    );
    clashes.push(centerClash);
    roundAtkLosses += centerClash.attackerCasualties;
    roundDefLosses += centerClash.defenderCasualties;

    const atkRemaining =
      attacker.vanguard.currentTotalTroops +
      attacker.center.currentTotalTroops +
      attacker.rearguard.currentTotalTroops;

    const defRemaining =
      defender.vanguard.currentTotalTroops +
      defender.center.currentTotalTroops +
      defender.rearguard.currentTotalTroops;

    const atkMoraleAvg = Math.round(
      (attacker.vanguard.morale + attacker.center.morale + attacker.rearguard.morale) / 3
    );
    const defMoraleAvg = Math.round(
      (defender.vanguard.morale + defender.center.morale + defender.rearguard.morale) / 3
    );

    attacker.cohesionMorale = atkMoraleAvg;
    defender.cohesionMorale = defMoraleAvg;

    const logVi = `Hiệp ${roundNumber}: Quân ta tổn thất ${roundAtkLosses} dũng sĩ, tiêu diệt ${roundDefLosses} quân giặc. Sĩ khí phe ta: ${atkMoraleAvg}%, sĩ khí phe địch: ${defMoraleAvg}%.`;

    return {
      roundNumber,
      roundTitleVi,
      attackerTacticTriggered,
      defenderTacticTriggered,
      clashes,
      attackerRoundLosses: roundAtkLosses,
      defenderRoundLosses: roundDefLosses,
      attackerRemainingTroops: atkRemaining,
      defenderRemainingTroops: defRemaining,
      attackerMoraleAvg: atkMoraleAvg,
      defenderMoraleAvg: defMoraleAvg,
      logVi
    };
  }

  /**
   * Resolves clash between opposing echelons
   */
  private static resolveEchelonClash(
    position: EchelonPosition,
    atkEchelon: EchelonState,
    defEchelon: EchelonState,
    atkCmd: CommanderProfile,
    defCmd: CommanderProfile,
    terrainMods: ReturnType<typeof TacticalBattleEngine.getTerrainMultipliers>,
    atkTacticAtkBonus: number,
    atkTacticDefBonus: number,
    defTacticAtkBonus: number,
    defTacticDefBonus: number,
    flankTarget?: EchelonState
  ): RoundEchelonClash {
    // If both routed or no troops, minimal engagement
    if (atkEchelon.currentTotalTroops <= 0 && defEchelon.currentTotalTroops <= 0) {
      return {
        echelon: position,
        attackerCasualties: 0,
        defenderCasualties: 0,
        attackerMoraleDelta: 0,
        defenderMoraleDelta: 0,
        attackerRoutedNow: false,
        defenderRoutedNow: false,
        logVi: `[${position}] Không có giao chiến (Cả hai phân đội đều không còn binh lực).`
      };
    }

    const targetDefEchelon = flankTarget && !flankTarget.isRouted ? flankTarget : defEchelon;

    // Attacker attack power calculation
    const atkInf = atkEchelon.troops.infantry * terrainMods.infantryAtk;
    const atkCav = atkEchelon.troops.cavalry * terrainMods.cavalryAtk;
    const atkArc = atkEchelon.troops.archers * terrainMods.archersAtk;
    const atkWarMult = 1.0 + (atkCmd.war - 50) * 0.008;
    const atkEffectiveness = atkEchelon.isRouted ? 0.35 : 1.0;
    const atkRawAtk = (atkInf * 1.0 + atkCav * 1.45 + atkArc * 1.15) * atkWarMult * atkTacticAtkBonus * atkEffectiveness;

    // Defender defense power calculation
    const defInfDef = targetDefEchelon.troops.infantry * terrainMods.infantryDef;
    const defCavDef = targetDefEchelon.troops.cavalry * terrainMods.cavalryDef;
    const defArcDef = targetDefEchelon.troops.archers * terrainMods.archersDef;
    const defLdrMult = 1.0 + (defCmd.leadership - 50) * 0.008;
    const defDefEffectiveness = targetDefEchelon.isRouted ? 0.45 : 1.0;
    const defRawDef = (defInfDef * 1.25 + defCavDef * 1.05 + defArcDef * 0.85) * defLdrMult * defTacticDefBonus * defDefEffectiveness;

    // Defender counter-attack power
    const defInfAtk = defEchelon.troops.infantry * terrainMods.infantryAtk;
    const defCavAtk = defEchelon.troops.cavalry * terrainMods.cavalryAtk;
    const defArcAtk = defEchelon.troops.archers * terrainMods.archersAtk;
    const defWarMult = 1.0 + (defCmd.war - 50) * 0.007;
    const defEffectiveness = defEchelon.isRouted ? 0.30 : 1.0;
    const defRawAtk = (defInfAtk * 1.0 + defCavAtk * 1.4 + defArcAtk * 1.15) * defWarMult * defTacticAtkBonus * defEffectiveness;

    // Attacker defense power
    const atkInfDef = atkEchelon.troops.infantry * terrainMods.infantryDef;
    const atkCavDef = atkEchelon.troops.cavalry * terrainMods.cavalryDef;
    const atkArcDef = atkEchelon.troops.archers * terrainMods.archersDef;
    const atkLdrMult = 1.0 + (atkCmd.leadership - 50) * 0.008;
    const atkDefEffectiveness = atkEchelon.isRouted ? 0.45 : 1.0;
    const atkRawDef = (atkInfDef * 1.25 + atkCavDef * 1.05 + atkArcDef * 0.85) * atkLdrMult * atkTacticDefBonus * atkDefEffectiveness;

    // Base casualty calculation
    const baseCasualtyRate = 0.09; // ~9% base clash casualty rate per round
    const defLossCalc = Math.round(
      targetDefEchelon.currentTotalTroops *
        baseCasualtyRate *
        (atkRawAtk / Math.max(10, defRawDef)) *
        (0.85 + Math.random() * 0.3)
    );
    const defLosses = Math.min(targetDefEchelon.currentTotalTroops, Math.max(1, defLossCalc));

    const atkLossCalc = Math.round(
      atkEchelon.currentTotalTroops *
        baseCasualtyRate *
        (defRawAtk / Math.max(10, atkRawDef)) *
        (0.85 + Math.random() * 0.3)
    );
    const atkLosses = Math.min(atkEchelon.currentTotalTroops, Math.max(0, atkLossCalc));

    // Deduct casualties from unit composition
    TacticalBattleEngine.deductCasualties(targetDefEchelon, defLosses);
    TacticalBattleEngine.deductCasualties(atkEchelon, atkLosses);

    // Morale depletion calculation
    const atkLossRatio = atkLosses / Math.max(1, atkEchelon.initialTotalTroops);
    const defLossRatio = defLosses / Math.max(1, targetDefEchelon.initialTotalTroops);

    const atkLdrProtection = Math.max(0.4, 1.0 - (atkCmd.leadership - 50) * 0.007);
    const defLdrProtection = Math.max(0.4, 1.0 - (defCmd.leadership - 50) * 0.007);

    const atkMoraleDelta = -Math.round(atkLossRatio * 60 * atkLdrProtection + (atkEchelon.isRouted ? 10 : 2));
    const defMoraleDelta = -Math.round(defLossRatio * 60 * defLdrProtection + (targetDefEchelon.isRouted ? 10 : 2));

    atkEchelon.morale = Math.max(0, atkEchelon.morale + atkMoraleDelta);
    targetDefEchelon.morale = Math.max(0, targetDefEchelon.morale + defMoraleDelta);

    let attackerRoutedNow = false;
    let defenderRoutedNow = false;

    // Rout Threshold Check: < 20% morale causes echelon rout
    if (!atkEchelon.isRouted && (atkEchelon.morale < 20 || atkEchelon.currentTotalTroops <= 0)) {
      atkEchelon.isRouted = true;
      attackerRoutedNow = true;
    }

    if (!targetDefEchelon.isRouted && (targetDefEchelon.morale < 20 || targetDefEchelon.currentTotalTroops <= 0)) {
      targetDefEchelon.isRouted = true;
      defenderRoutedNow = true;
    }

    const badgeLabel =
      position === 'VANGUARD'
        ? '[TIỀN PHONG]'
        : position === 'CENTER'
        ? '[TRUNG QUÂN]'
        : '[HẬU QUÂN]';

    let statusText = '';
    if (attackerRoutedNow && defenderRoutedNow) {
      statusText = ` (Cả hai phân đội đều vỡ trận!)`;
    } else if (attackerRoutedNow) {
      statusText = ` (${badgeLabel} quân ta vỡ trận, sĩ khí sụp đổ!)`;
    } else if (defenderRoutedNow) {
      statusText = ` (${badgeLabel} địch quân tan vỡ tháo chạy!)`;
    }

    const logVi = `${badgeLabel} Giao phong ác liệt: Ta diệt ${defLosses} địch (Mất ${atkLosses} quân). Sĩ khí ta: ${atkEchelon.morale}%, địch: ${targetDefEchelon.morale}%${statusText}.`;

    return {
      echelon: position,
      attackerCasualties: atkLosses,
      defenderCasualties: defLosses,
      attackerMoraleDelta: atkMoraleDelta,
      defenderMoraleDelta: defMoraleDelta,
      attackerRoutedNow,
      defenderRoutedNow,
      logVi
    };
  }

  /**
   * Deducts casualties proportionally across unit types
   */
  private static deductCasualties(echelon: EchelonState, totalLosses: number): void {
    if (totalLosses <= 0 || echelon.currentTotalTroops <= 0) return;

    const initial = echelon.currentTotalTroops;
    const ratio = Math.min(1.0, totalLosses / initial);

    const infLoss = Math.min(echelon.troops.infantry, Math.round(echelon.troops.infantry * ratio));
    const cavLoss = Math.min(echelon.troops.cavalry, Math.round(echelon.troops.cavalry * ratio));
    const remainingLoss = totalLosses - (infLoss + cavLoss);
    const arcLoss = Math.min(echelon.troops.archers, Math.max(0, remainingLoss));

    echelon.troops.infantry -= infLoss;
    echelon.troops.cavalry -= cavLoss;
    echelon.troops.archers -= arcLoss;

    echelon.casualties += totalLosses;
    echelon.currentTotalTroops = calculateTotalTroops(echelon.troops);
  }

  /**
   * Evaluates army cohesion: routs army if center collapses or 2 out of 3 echelons rout
   */
  public static evaluateArmyCohesion(army: ArmyTacticalFormation): void {
    const totalRemaining =
      army.vanguard.currentTotalTroops +
      army.center.currentTotalTroops +
      army.rearguard.currentTotalTroops;

    if (totalRemaining <= 0) {
      army.isDefeated = true;
      army.defeatReason = 'TOTAL_ANNIHILATION';
      return;
    }

    // Condition 1: Center collapses (Army cohesion disintegrates)
    if (army.center.isRouted || army.center.currentTotalTroops <= 0) {
      army.isDefeated = true;
      army.defeatReason = 'CENTER_COLLAPSE';
      return;
    }

    // Condition 2: 2 out of 3 echelons routed
    let routedCount = 0;
    if (army.vanguard.isRouted) routedCount++;
    if (army.center.isRouted) routedCount++;
    if (army.rearguard.isRouted) routedCount++;

    if (routedCount >= 2) {
      army.isDefeated = true;
      army.defeatReason = 'TWO_ECHELONS_ROUTED';
    }
  }
}
