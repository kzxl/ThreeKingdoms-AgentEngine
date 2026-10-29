/**
 * Feature Module: Continuous Utility AI & LOD Scheduling
 * Ported from GrandStrategy.Core (AutonomousNpcSystem.cs & Doc 22)
 * Pure deterministic mathematics: response curves, hysteresis, round-robin LOD.
 */

import { IFeatureModule, ModuleContext, UtilityActionCandidate } from '../../core/types';

export interface UtilityCurveParams {
  type: 'LOGISTIC' | 'LINEAR' | 'EXPONENTIAL';
  midpoint?: number;
  steepness?: number;
  minVal?: number;
  maxVal?: number;
  exponent?: number;
}

export class UtilityCurveEvaluator {
  /**
   * Logistic/Sigmoid Response Curve: C(x) = 1 / (1 + e^(-k(x - x0)))
   * Models tipping points (e.g. panic on food shortage, greed on high profit margin)
   */
  public static evaluateLogistic(x: number, midpoint: number, steepness: number): number {
    const exponent = -steepness * (x - midpoint);
    // Clamp exponent to avoid floating point overflow
    const clamped = Math.max(-50, Math.min(50, exponent));
    return 1 / (1 + Math.exp(clamped));
  }

  /**
   * Normalized Linear Response Curve: C(x) = (x - min) / (max - min)
   */
  public static evaluateLinear(x: number, minVal: number, maxVal: number): number {
    if (maxVal <= minVal) return 0.5;
    const norm = (x - minVal) / (maxVal - minVal);
    return Math.max(0, Math.min(1, norm));
  }

  /**
   * Exponential Response Curve: C(x) = ((x - min)/(max - min))^p
   */
  public static evaluateExponential(x: number, minVal: number, maxVal: number, exponent: number): number {
    const linear = this.evaluateLinear(x, minVal, maxVal);
    return Math.pow(linear, exponent);
  }

  /**
   * Evaluates composite utility score from multiple considerations using geometric product
   */
  public static computeCompositeScore(considerations: number[], traitMultiplier = 1.0): number {
    if (considerations.length === 0) return 0;
    // Geometric mean prevents actions with one fatal flaw from being selected
    const product = considerations.reduce((acc, val) => acc * Math.max(0.01, val), 1.0);
    return product * traitMultiplier;
  }
}

/**
 * 4-Tier LOD Scheduler for NPC simulation
 * Staggered round-robin processing prevents frame/tick spikes
 */
export class LodScheduler {
  /**
   * Evaluates if a given NPC with index should be updated on current day
   */
  public static shouldProcessLOD2(npcIndex: number, currentDay: number): boolean {
    // 30 buckets corresponding to 30 days in a month
    const bucket = npcIndex % 30;
    return bucket === (currentDay - 1) % 30;
  }

  public static shouldProcessLOD1(currentDay: number): boolean {
    // Weekly tick (days 7, 14, 21, 28)
    return currentDay % 7 === 0;
  }
}

export class UtilityAiModule implements IFeatureModule {
  public readonly id = 'module.utility-ai';
  public readonly name = 'Continuous Utility AI & LOD Scheduler';
  public readonly version = '1.0.0';

  public init(_ctx: ModuleContext): void {
    // LOD progression is driven by the monthly world turn (NPC lifecycle), not
    // by a weekly event with no subscriber. LodScheduler remains available for
    // a future explicit LOD pass.
  }

  /**
   * Evaluates best action for an autonomous NPC given current state
   */
  public selectBestAction(
    npcId: string,
    candidates: UtilityActionCandidate[],
    currentActionId?: string,
    hysteresisBonus = 0.15
  ): UtilityActionCandidate | null {
    if (candidates.length === 0) return null;

    let bestCandidate: UtilityActionCandidate | null = null;
    let highestScore = -1;

    for (const c of candidates) {
      let score = c.compositeScore;
      // Hysteresis: Give current action a bonus to prevent rapid erratic switching
      if (currentActionId && c.id === currentActionId) {
        score += hysteresisBonus;
      }
      if (score > highestScore) {
        highestScore = score;
        bestCandidate = c;
      }
    }

    return bestCandidate;
  }
}
