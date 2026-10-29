/**
 * Feature Module: Strategic Warfare & Operational Logistics
 * Ported from GrandStrategy.Core (MilitarySystem.cs & Doc 20)
 * Implements graph-based operational logistics and BFS supply reachability,
 * as well as multi-round tactical battle resolution and stronghold assaults.
 */

import { IFeatureModule, ModuleContext, ArmyState, SettlementId } from '../../core/types';
import { DatabaseService } from '../../core/database';
import { getPlayerCapital } from '../../shared/ledger';
import {
  TacticalBattleEngine,
  BattleResult,
  BattleSimulationInput,
  TerrainType,
  TroopUnitComposition
} from './tactical-battle';

export * from './tactical-battle';

export interface GraphEdge {
  fromNode: SettlementId;
  toNode: SettlementId;
  distanceKm: number;
  terrainType: 'PLAINS' | 'HILLS' | 'MOUNTAINS' | 'RIVER_CROSSING';
  isBlockedByHostile: boolean;
}

export class SupplyGraphService {
  private readonly adjacencyList: Map<SettlementId, Set<SettlementId>> = new Map();
  private readonly edges: Map<string, GraphEdge> = new Map();

  public addEdge(edge: GraphEdge): void {
    const keyForward = `${edge.fromNode}->${edge.toNode}`;
    const keyBackward = `${edge.toNode}->${edge.fromNode}`;
    this.edges.set(keyForward, edge);

    if (!this.adjacencyList.has(edge.fromNode)) this.adjacencyList.set(edge.fromNode, new Set());
    if (!this.adjacencyList.has(edge.toNode)) this.adjacencyList.set(edge.toNode, new Set());

    if (!edge.isBlockedByHostile) {
      this.adjacencyList.get(edge.fromNode)!.add(edge.toNode);
      this.adjacencyList.get(edge.toNode)!.add(edge.fromNode);
    }
  }

  public setEdgeBlocked(from: SettlementId, to: SettlementId, blocked: boolean): void {
    const key = `${from}->${to}`;
    const edge = this.edges.get(key);
    if (edge) {
      edge.isBlockedByHostile = blocked;
      if (blocked) {
        this.adjacencyList.get(from)?.delete(to);
        this.adjacencyList.get(to)?.delete(from);
      } else {
        this.adjacencyList.get(from)?.add(to);
        this.adjacencyList.get(to)?.add(from);
      }
    }
  }

  /**
   * Breadth-First Search (BFS) to determine if an army can trace an unbroken
   * friendly logistical route back to its designated Supply Hub.
   */
  public hasUnbrokenSupplyPath(armyLocation: SettlementId, supplyHub: SettlementId, maxHops = 10): boolean {
    if (armyLocation === supplyHub) return true;

    const visited = new Set<SettlementId>();
    const queue: Array<{ node: SettlementId; hops: number }> = [{ node: armyLocation, hops: 0 }];
    visited.add(armyLocation);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.node === supplyHub) return true;
      if (current.hops >= maxHops) continue;

      const neighbors = this.adjacencyList.get(current.node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push({ node: neighbor, hops: current.hops + 1 });
          }
        }
      }
    }

    return false;
  }
}

export interface TacticalAssaultOptions {
  characterId?: string;
  strongholdId: string;
  turnNumber?: number;
  gameDate?: string;
  terrain?: TerrainType;
  customAttackerTroops?: Partial<TroopUnitComposition> | number;
  commitDb?: boolean;
}

export interface TacticalAssaultResponse {
  success: boolean;
  battleResult: BattleResult;
  strongholdId: string;
  strongholdName: string;
  lootCash: number;
  bounty: number;
  totalReward: number;
  message: string;
}

export class MilitaryModule implements IFeatureModule {
  public readonly id = 'module.military';
  public readonly name = 'Strategic Warfare & Operational Logistics';
  public readonly version = '1.0.0';

  private ctx!: ModuleContext;
  private db?: DatabaseService;
  public readonly graph: SupplyGraphService = new SupplyGraphService();

  public init(ctx: ModuleContext): void {
    this.ctx = ctx;
    if (ctx.dbPath) {
      try {
        this.db = DatabaseService.getInstance(ctx.dbPath);
      } catch (e) {
        // Fallback or non-blocking if database is mocked/in-memory
      }
    }

    // Initialize baseline Three Kingdoms routes (e.g., Zhuo -> Julu -> Luoyang)
    this.initializeBaselineRoutes();

    this.ctx.eventBus.subscribe('WORLD_DAY_TICK', async () => {
      // Daily check of supply status
    });
  }

  private initializeBaselineRoutes(): void {
    this.graph.addEdge({
      fromNode: 'LOC-0001', // Zhuo County (Trác Quận)
      toNode: 'LOC-0003',   // Julu (Cự Lộc)
      distanceKm: 180,
      terrainType: 'PLAINS',
      isBlockedByHostile: false
    });
    this.graph.addEdge({
      fromNode: 'LOC-0003', // Julu
      toNode: 'LOC-0002',   // Luoyang (Lạc Dương)
      distanceKm: 420,
      terrainType: 'HILLS',
      isBlockedByHostile: false
    });
  }

  /**
   * Evaluates army operational status and updates morale accordingly
   */
  public evaluateArmySupply(army: ArmyState): { isSupplied: boolean; moraleDelta: number } {
    const isSupplied = this.graph.hasUnbrokenSupplyPath(army.currentLocationId, army.supplyHubId);
    let moraleDelta = 0;

    if (!isSupplied) {
      army.isOutOfSupply = true;
      // Severed supply line causes rapid panic (-15 morale per day)
      moraleDelta = -15;
      army.morale = Math.max(0, army.morale + moraleDelta);
    } else {
      army.isOutOfSupply = false;
      if (army.morale < 80) {
        // Natural recovery when well supplied
        moraleDelta = 5;
        army.morale = Math.min(100, army.morale + moraleDelta);
      }
    }

    return { isSupplied, moraleDelta };
  }

  /**
   * Executes tactical battle simulation between player forces and an enemy/stronghold force.
   * If commitDb is true, preserves SQLite double-entry journal and cashflow ledger invariants.
   */
  public executeTacticalAssault(options: TacticalAssaultOptions): TacticalAssaultResponse {
    const characterId = options.characterId || 'PLY-0001';
    const strongholdId = options.strongholdId;
    const turnNumber = options.turnNumber || 6;
    const gameDate = options.gameDate || '184-05-01';
    const commitDb = options.commitDb !== false;

    let stronghold: any = null;
    let player: any = null;
    let personalTroops = 120;

    if (this.db) {
      try {
        stronghold = this.db.queryOne<any>(
          `SELECT * FROM bandit_strongholds WHERE stronghold_id = ?;`,
          [strongholdId]
        );
        player = this.db.queryOne<any>(
          `SELECT name, war_attr, ldr_attr, int_attr, health, fatigue, liquid_cash, safe_cash, current_location FROM player_state WHERE player_id = ?;`,
          [characterId]
        );
        const prog = this.db.queryOne<any>(
          `SELECT personal_troops FROM npc_personal_progression WHERE npc_id = ?;`,
          [characterId]
        );
        if (prog && prog.personal_troops > 0) {
          personalTroops = prog.personal_troops;
        }
      } catch (err) {
        // Fallback to default entities if query fails
      }
    }

    if (!stronghold) {
      stronghold = {
        stronghold_id: strongholdId,
        name_vi: 'Hắc Sơn Phỉ Doanh',
        bandit_chief_name: 'Trương Yến (Hắc Sơn Quân)',
        bandit_power: 320,
        plundered_wealth: 1500,
        bounty_reward: 1200,
        status: 'ACTIVE',
        location_near: 'ye_cheng'
      };
    }

    if (stronghold.status === 'SUBDUED') {
      throw new Error(`Sơn trại ${stronghold.name_vi} (${strongholdId}) đã bị quân triều đình bình định từ trước!`);
    }

    if (!player) {
      player = {
        name: 'Lương Diễn',
        war_attr: 78,
        ldr_attr: 70,
        int_attr: 82,
        health: 100,
        fatigue: 10,
        liquid_cash: 20000,
        current_location: 'LOC-0001'
      };
    }

    // Verify logistical supply lines reachability back to strategic hub (LOC-0002 Luoyang)
    const playerLoc = player.current_location || 'LOC-0001';
    const isSupplied = this.graph.hasUnbrokenSupplyPath(playerLoc, 'LOC-0002');
    const attackerInitialMorale = isSupplied ? 95 : 70; // 25 morale penalty when supply lines are broken

    // Determine battlefield terrain based on stronghold location
    let battlefieldTerrain: TerrainType = options.terrain || 'MOUNTAINS';
    if (!options.terrain) {
      const loc = (stronghold.location_near || '').toLowerCase();
      if (loc.includes('ye_cheng') || loc.includes('taihang') || loc.includes('taishan')) {
        battlefieldTerrain = 'MOUNTAINS';
      } else if (loc.includes('ping_yuan') || loc.includes('marsh') || loc.includes('river')) {
        battlefieldTerrain = 'RIVER_MARSH';
      } else if (loc.includes('luo_yang') || loc.includes('plains') || loc.includes('zhuo')) {
        battlefieldTerrain = 'PLAINS';
      }
    }

    // Determine troop forces
    const totalAtkTroops = options.customAttackerTroops !== undefined
      ? options.customAttackerTroops
      : Math.max(150, personalTroops + 80);

    const totalDefTroops = stronghold.bandit_power || 300;

    const simInput: BattleSimulationInput = {
      terrain: battlefieldTerrain,
      attacker: {
        commander: {
          id: characterId,
          name: player.name || 'Lương Diễn (Chí Viễn)',
          war: player.war_attr || 75,
          leadership: player.ldr_attr || 70,
          intelligence: player.int_attr || 80
        },
        vanguardTroops: typeof totalAtkTroops === 'number' ? Math.round(totalAtkTroops * 0.35) : totalAtkTroops,
        centerTroops: typeof totalAtkTroops === 'number' ? Math.round(totalAtkTroops * 0.45) : undefined,
        rearguardTroops: typeof totalAtkTroops === 'number' ? Math.round(totalAtkTroops * 0.20) : undefined,
        initialMorale: attackerInitialMorale
      },
      defender: {
        commander: {
          id: stronghold.stronghold_id,
          name: stronghold.bandit_chief_name || 'Đạo Tặc Thống Lãnh',
          war: Math.min(90, Math.round(stronghold.bandit_power * 0.22) + 20),
          leadership: Math.min(85, Math.round(stronghold.bandit_power * 0.18) + 20),
          intelligence: 55
        },
        vanguardTroops: Math.round(totalDefTroops * 0.35),
        centerTroops: Math.round(totalDefTroops * 0.45),
        rearguardTroops: Math.round(totalDefTroops * 0.20),
        initialMorale: 85,
        strongholdPlunderedWealth: stronghold.plundered_wealth || 0,
        strongholdBounty: stronghold.bounty_reward || 0
      },
      maxRounds: 5
    };

    const battleResult = TacticalBattleEngine.simulate(simInput);
    const isVictory = battleResult.winner === 'ATTACKER';
    const lootCash = battleResult.spoils.lootCash;
    const bounty = battleResult.spoils.bountyReward;
    const totalReward = lootCash + bounty;

    // Preserve Database Invariants if victory and DB connected
    if (commitDb && this.db) {
      try {
        if (isVictory) {
          this.db.transaction(() => {
            // 1. Player liquid cash grows by the reward; ledger balance is
            //    total player capital (liquid + personal vault), never the
            //    previous ledger row (that double-counted safe_cash).
            const capitalBefore = getPlayerCapital(this.db!, characterId);
            const newLiquidCash = capitalBefore.liquid + totalReward;
            const newBalance = newLiquidCash + capitalBefore.safe;
            const txnId = `TXN-LOOT-${gameDate.replace(/-/g, '')}-${strongholdId}-${turnNumber}`;

            // 2. Insert cashflow ledger entry
            this.db!.execute(
              `INSERT INTO cashflow_ledger (txn_id, game_date, counterparty, category, inflow, outflow, balance, memo, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed');`,
              [
                txnId,
                gameDate,
                'Triều Đình Hán Tộc & Sơn Trại Phỉ Doanh',
                'Quân Công Tiễu Phỉ',
                totalReward,
                0,
                newBalance,
                `Đại thắng sơn trại ${stronghold.name_vi}: Thu hồi ${lootCash} quan của thương đoàn, thưởng quân công ${bounty} quan`
              ]
            );

            // 3. Double-entry journal records (Debit Cash, Credit Revenue)
            this.db!.execute(
              `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
               VALUES (?, 'CMP-184-ZHOU-01', ?, '1001_CASH_MOBILE', ?, 0, 'Nhập quỹ tiền tiễu phỉ & thu hồi chiến lợi phẩm');`,
              [txnId, gameDate, totalReward]
            );
            this.db!.execute(
              `INSERT INTO account_journal (txn_id, campaign_id, game_date, account_code, debit, credit, memo)
               VALUES (?, 'CMP-184-ZHOU-01', ?, '7001_BOUNTY_INCOME', 0, ?, 'Thu nhập quân công tiễu trừ phỉ tặc');`,
              [txnId, gameDate, totalReward]
            );

            // 4. Update player state (liquid cash grows by the reward)
            this.db!.execute(
              `UPDATE player_state
               SET liquid_cash = ?,
                   fatigue = MIN(100, fatigue + 25),
                   morale = MIN(100, morale + 10)
               WHERE player_id = ?;`,
              [newLiquidCash, characterId]
            );

            // 5. Update stronghold status
            this.db!.execute(
              `UPDATE bandit_strongholds
               SET status = 'SUBDUED', plundered_wealth = 0
               WHERE stronghold_id = ?;`,
              [strongholdId]
            );
          });
        } else {
          // Attacker Defeat / Tactical Retreat penalty
          this.db.execute(
            `UPDATE player_state
             SET health = MAX(25, health - 15),
                 fatigue = MIN(100, fatigue + 35),
                 morale = MAX(10, morale - 20)
             WHERE player_id = ?;`,
            [characterId]
          );
        }
      } catch (err) {
        console.error('Error committing tactical assault transaction to SQLite:', err);
      }
    }

    // Publish event
    if (this.ctx && this.ctx.eventBus) {
      this.ctx.eventBus.publish('TACTICAL_BATTLE_RESOLVED', {
        characterId,
        strongholdId,
        isVictory,
        battleResult
      });
    }

    return {
      success: isVictory,
      battleResult,
      strongholdId,
      strongholdName: stronghold.name_vi,
      lootCash,
      bounty,
      totalReward,
      message: battleResult.narrativeSummaryVi
    };
  }

  /**
   * Alias method for resolveStrongholdAssault
   */
  public resolveStrongholdAssault(options: TacticalAssaultOptions): TacticalAssaultResponse {
    return this.executeTacticalAssault(options);
  }
}
