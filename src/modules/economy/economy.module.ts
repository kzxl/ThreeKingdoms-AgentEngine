/**
 * Feature Module: Thermodynamic Economy & Regional Markets
 * Ported from GrandStrategy.Core (EconomySystem.cs & MarketSystem.cs)
 * Implements price elasticity, distance decay, and seasonal agricultural cycles.
 */

import { IFeatureModule, ModuleContext, MarketCommodityState, SettlementState } from '../../core/types';
import {
  MarketElasticityEngine,
  MarketQuoteInput,
  MarketQuoteResult,
  SettlementMarketQuote,
  CommodityElasticityConfig,
  calculateSettlementMarketQuotes,
  calculateElasticPrice
} from './market-elasticity';

export * from './market-elasticity';

export class EconomyModule implements IFeatureModule {
  public readonly id = 'module.economy';
  public readonly name = 'Regional Economics & Market Elasticity';
  public readonly version = '1.0.0';

  private ctx!: ModuleContext;

  public init(ctx: ModuleContext): void {
    this.ctx = ctx;

    // Listen to monthly tax tick
    this.ctx.eventBus.subscribe('WORLD_MONTH_TICK', async (event: { month: number; year: number }) => {
      // Seasonal Autumn Harvest (Month 8 or 9)
      if (event.month === 8 || event.month === 9) {
        this.ctx.eventBus.publish('AUTUMN_HARVEST_CYCLE', event);
      }
    });
  }

  /**
   * Calculates dynamic market price given current inventory stock and demand.
   * Formula:
   *   P_dynamic = P_base * (1 + ElasticityFactor * (TargetStock - CurrentStock) / Math.max(1, TargetStock)) * CrisisMultiplier
   * Clamped between 0.4 * P_base and 3.5 * P_base to prevent runaway hyperinflation or deflation.
   */
  public calculateDynamicPrice(item: MarketCommodityState, crisisMultiplier = 1.0): number {
    return MarketElasticityEngine.calculateFromState(item, crisisMultiplier);
  }

  /**
   * Calculates complete market quote for an item with full diagnostic breakdown
   */
  public getMarketQuote(input: MarketQuoteInput): MarketQuoteResult {
    return calculateElasticPrice(input);
  }

  /**
   * Generates a comprehensive market catalog quote for all standard commodities in a settlement
   */
  public calculateSettlementQuotes(
    settlement: SettlementState,
    stockMap?: Record<string, number>,
    activeCrises?: string[]
  ): SettlementMarketQuote {
    return calculateSettlementMarketQuotes(settlement, stockMap, activeCrises);
  }

  /**
   * Retrieves configuration parameters for a commodity
   */
  public getCommodityConfig(commodityCode: string): CommodityElasticityConfig | undefined {
    return MarketElasticityEngine.getConfig(commodityCode);
  }

  /**
   * Retrieves all supported commodity configurations
   */
  public getAllCommodityConfigs(): CommodityElasticityConfig[] {
    return MarketElasticityEngine.getAllConfigs();
  }

  /**
   * Distance Decay: Tax shipments or trade caravans travelling across multiple
   * provinces suffer transport overhead, rations consumption, and bandit leakage.
   * Formula: EffectiveCash = SentCash * (1 - DistanceKm * 0.0005)
   */
  public calculateDistanceDecay(sentCash: number, distanceKm: number): { deliveredCash: number; lostInTransit: number } {
    const lossRate = Math.min(0.50, distanceKm * 0.0005); // Maximum 50% decay
    const lostInTransit = Math.round(sentCash * lossRate);
    const deliveredCash = sentCash - lostInTransit;
    return { deliveredCash, lostInTransit };
  }

  /**
   * Calculates seasonal agricultural grain yield for a settlement
   */
  public calculateAutumnHarvest(settlement: SettlementState): number {
    // Standard yield: Population * Agriculture rating * seasonal multiplier
    const baseDan = Math.round((settlement.population * 0.05) * (settlement.agriculture / 100));
    return Math.max(100, baseDan);
  }
}
