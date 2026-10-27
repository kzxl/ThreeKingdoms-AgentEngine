/**
 * Feature Module: Thermodynamic Economy & Regional Markets
 * Ported from GrandStrategy.Core (EconomySystem.cs & MarketSystem.cs)
 * Implements price elasticity, distance decay, and seasonal agricultural cycles.
 */

import { IFeatureModule, ModuleContext, MarketCommodityState, SettlementState } from '../../core/types';

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
   * Calculates dynamic market price given current inventory stock and demand
   * Formula: Price = BasePrice * (1 + Elasticity * ((Demand - Stock) / Max(1, Demand)))
   * Clamped between 0.3 * BasePrice and 4.0 * BasePrice
   */
  public calculateDynamicPrice(item: MarketCommodityState): number {
    const deficitRatio = (item.demandUnits - item.stockUnits) / Math.max(1, item.demandUnits);
    const rawPrice = item.basePrice * (1 + item.priceElasticity * deficitRatio);

    const minFloor = item.basePrice * 0.35;
    const maxCeiling = item.basePrice * 4.0;

    return Math.round(Math.max(minFloor, Math.min(maxCeiling, rawPrice)) * 10) / 10;
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
