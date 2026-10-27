/**
 * Feature Module: Strategic Military & Supply-Line Graph
 * Ported from GrandStrategy.Core (MilitarySystem.cs & Doc 20)
 * Implements graph-based operational logistics and BFS supply reachability.
 */

import { IFeatureModule, ModuleContext, ArmyState, SettlementId } from '../../core/types';

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

export class MilitaryModule implements IFeatureModule {
  public readonly id = 'module.military';
  public readonly name = 'Strategic Warfare & Operational Logistics';
  public readonly version = '1.0.0';

  private ctx!: ModuleContext;
  public readonly graph: SupplyGraphService = new SupplyGraphService();

  public init(ctx: ModuleContext): void {
    this.ctx = ctx;

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
}
