/**
 * Dynamic Market Pricing & Elasticity Engine
 * Three Kingdoms Economic Simulation
 *
 * Implements realistic supply-demand pricing logic for regional markets.
 * Follows the AgentOption Universe Modular Architecture standard.
 */

import { StandardCommodity, SettlementState, MarketCommodityState } from '../../core/types';

export type CommodityCategory =
  | 'GRAIN'
  | 'RAW_MATERIALS'
  | 'EQUIPMENT'
  | 'LUXURY'
  | 'MEDICINE'
  | 'LIVESTOCK'
  | 'CONSUMABLES';

export interface CommodityElasticityConfig {
  commodity: StandardCommodity | string;
  nameVi: string;
  nameEn: string;
  category: CommodityCategory;
  basePrice: number;
  elasticityFactor: number;
  defaultTargetPerCapita: number; // Target units per 1,000 population
  crisisSensitivities: Record<string, number>; // Crisis type -> multiplier
}

export interface MarketQuoteInput {
  commodity: StandardCommodity | string;
  basePrice: number;
  currentStock: number;
  targetStock: number;
  elasticityFactor?: number;
  crisisMultiplier?: number;
}

export interface MarketQuoteResult {
  commodity: string;
  basePrice: number;
  currentStock: number;
  targetStock: number;
  stockDeficitRatio: number;
  rawPrice: number;
  clampedPrice: number;
  finalPrice: number;
  elasticityFactor: number;
  crisisMultiplier: number;
  priceDeltaPercentage: number;
  trend: 'SURPLUS_CHEAP' | 'EQUILIBRIUM' | 'DEFICIT_EXPENSIVE' | 'CRISIS_SPIKE';
}

export interface SettlementMarketQuote {
  settlementId: string;
  settlementName?: string;
  population: number;
  activeCrises: string[];
  quotes: Record<string, MarketQuoteResult>;
  calculatedAt: string;
}

/**
 * Baseline commodity configurations for the ancient Three Kingdoms economy.
 * Grain & salt have inelastic demand; weapons surge during wartime;
 * luxury silk declines in severe famine.
 */
export const COMMODITY_CONFIGS: Record<string, CommodityElasticityConfig> = {
  GRAIN: {
    commodity: 'GRAIN',
    nameVi: 'Lương Thảo (Thạch)',
    nameEn: 'Strategic Grain',
    category: 'GRAIN',
    basePrice: 25,
    elasticityFactor: 1.8,
    defaultTargetPerCapita: 120, // 120 dan per 1,000 pop
    crisisSensitivities: {
      GREAT_DROUGHT: 2.2,
      LOCUST_SWARM: 2.5,
      YELLOW_RIVER_FLOOD: 2.0,
      PESTILENCE_PLAGUE: 1.6,
      PEASANT_REBELLION: 2.1
    }
  },
  RAW_IRON: {
    commodity: 'RAW_IRON',
    nameVi: 'Quặng Sắt Thô (Cân)',
    nameEn: 'Raw Iron Ore',
    category: 'RAW_MATERIALS',
    basePrice: 40,
    elasticityFactor: 1.4,
    defaultTargetPerCapita: 40,
    crisisSensitivities: {
      PEASANT_REBELLION: 1.5,
      WAR: 1.6
    }
  },
  COAL: {
    commodity: 'COAL',
    nameVi: 'Than Đá (Cân)',
    nameEn: 'Coal & Fuel',
    category: 'RAW_MATERIALS',
    basePrice: 18,
    elasticityFactor: 1.2,
    defaultTargetPerCapita: 50,
    crisisSensitivities: {
      GREAT_DROUGHT: 1.1
    }
  },
  TIMBER: {
    commodity: 'TIMBER',
    nameVi: 'Gỗ Tốt (Khối)',
    nameEn: 'Lumber & Timber',
    category: 'RAW_MATERIALS',
    basePrice: 20,
    elasticityFactor: 1.1,
    defaultTargetPerCapita: 60,
    crisisSensitivities: {
      YELLOW_RIVER_FLOOD: 1.4
    }
  },
  SALT: {
    commodity: 'SALT',
    nameVi: 'Muối Ăn (Đấu)',
    nameEn: 'Refined Salt',
    category: 'CONSUMABLES',
    basePrice: 50,
    elasticityFactor: 1.6,
    defaultTargetPerCapita: 30,
    crisisSensitivities: {
      PESTILENCE_PLAGUE: 1.4,
      PEASANT_REBELLION: 1.5
    }
  },
  LEATHER: {
    commodity: 'LEATHER',
    nameVi: 'Thuộc Da (Tấm)',
    nameEn: 'Tanned Leather',
    category: 'RAW_MATERIALS',
    basePrice: 35,
    elasticityFactor: 1.3,
    defaultTargetPerCapita: 25,
    crisisSensitivities: {
      PEASANT_REBELLION: 1.3
    }
  },
  SILK: {
    commodity: 'SILK',
    nameVi: 'Tơ Lụa (Xấp)',
    nameEn: 'Embroidered Silk',
    category: 'LUXURY',
    basePrice: 120,
    elasticityFactor: 0.9,
    defaultTargetPerCapita: 15,
    crisisSensitivities: {
      GREAT_DROUGHT: 0.6, // Luxury prices plummet during starvation
      LOCUST_SWARM: 0.6,
      PEASANT_REBELLION: 0.7
    }
  },
  WEAPON_SWORD: {
    commodity: 'WEAPON_SWORD',
    nameVi: 'Bội Kiếm & Đao (Thanh)',
    nameEn: 'Iron Blades',
    category: 'EQUIPMENT',
    basePrice: 150,
    elasticityFactor: 1.5,
    defaultTargetPerCapita: 20,
    crisisSensitivities: {
      PEASANT_REBELLION: 1.6,
      WAR: 1.7
    }
  },
  WEAPON_SPEAR: {
    commodity: 'WEAPON_SPEAR',
    nameVi: 'Trường Thương (Cán)',
    nameEn: 'Spears & Pikes',
    category: 'EQUIPMENT',
    basePrice: 110,
    elasticityFactor: 1.5,
    defaultTargetPerCapita: 35,
    crisisSensitivities: {
      PEASANT_REBELLION: 1.5,
      WAR: 1.6
    }
  },
  ARMOR_SHIELD: {
    commodity: 'ARMOR_SHIELD',
    nameVi: 'Mộc Bài Khiên (Chiếc)',
    nameEn: 'Shields & Armor',
    category: 'EQUIPMENT',
    basePrice: 180,
    elasticityFactor: 1.4,
    defaultTargetPerCapita: 20,
    crisisSensitivities: {
      PEASANT_REBELLION: 1.5,
      WAR: 1.6
    }
  },
  MEDICINE_HERB: {
    commodity: 'MEDICINE_HERB',
    nameVi: 'Dược Thảo (Bó)',
    nameEn: 'Medicinal Herbs',
    category: 'MEDICINE',
    basePrice: 60,
    elasticityFactor: 1.7,
    defaultTargetPerCapita: 20,
    crisisSensitivities: {
      PESTILENCE_PLAGUE: 2.4,
      GREAT_DROUGHT: 1.3
    }
  },
  WAR_HORSE: {
    commodity: 'WAR_HORSE',
    nameVi: 'Chiến Mã (Con)',
    nameEn: 'War Horses',
    category: 'LIVESTOCK',
    basePrice: 450,
    elasticityFactor: 1.6,
    defaultTargetPerCapita: 5,
    crisisSensitivities: {
      PEASANT_REBELLION: 1.8,
      WAR: 1.9
    }
  }
};

/**
 * Calculates dynamic market price given supply, demand, elasticity, and crisis factor.
 * Formula:
 *   P_dynamic = P_base * (1 + ElasticityFactor * (TargetStock - CurrentStock) / Math.max(1, TargetStock)) * CrisisMultiplier
 * Clamps:
 *   Math.max(0.4 * P_base, Math.min(3.5 * P_base, P_dynamic))
 */
export function calculateElasticPrice(input: MarketQuoteInput): MarketQuoteResult {
  const safeTarget = Math.max(1, input.targetStock);
  const elasticity = input.elasticityFactor !== undefined ? input.elasticityFactor : 1.5;
  const crisis = Math.max(0.1, input.crisisMultiplier !== undefined ? input.crisisMultiplier : 1.0);

  const deficitRatio = (safeTarget - input.currentStock) / safeTarget;
  const rawPrice = input.basePrice * (1 + elasticity * deficitRatio) * crisis;

  // Bounded clamps between 0.4x and 3.5x base price to prevent runaway inflation/deflation
  const minFloor = 0.4 * input.basePrice;
  const maxCeiling = 3.5 * input.basePrice;
  const clampedPrice = Math.max(minFloor, Math.min(maxCeiling, rawPrice));
  const finalPrice = Math.round(clampedPrice * 10) / 10;

  const priceDeltaPercentage = Math.round(((finalPrice - input.basePrice) / input.basePrice) * 1000) / 10;

  let trend: MarketQuoteResult['trend'] = 'EQUILIBRIUM';
  if (crisis > 1.25) {
    trend = 'CRISIS_SPIKE';
  } else if (deficitRatio > 0.3) {
    trend = 'DEFICIT_EXPENSIVE';
  } else if (deficitRatio < -0.3) {
    trend = 'SURPLUS_CHEAP';
  }

  return {
    commodity: String(input.commodity),
    basePrice: input.basePrice,
    currentStock: input.currentStock,
    targetStock: input.targetStock,
    stockDeficitRatio: Math.round(deficitRatio * 1000) / 1000,
    rawPrice: Math.round(rawPrice * 100) / 100,
    clampedPrice: Math.round(clampedPrice * 100) / 100,
    finalPrice,
    elasticityFactor: elasticity,
    crisisMultiplier: crisis,
    priceDeltaPercentage,
    trend
  };
}

/**
 * Resolves composite crisis multiplier for a commodity given active ecological/social crises.
 */
export function resolveCrisisMultiplier(
  commodityCode: string,
  activeCrises: string[] = []
): number {
  if (!activeCrises || activeCrises.length === 0) return 1.0;

  const cfg = COMMODITY_CONFIGS[commodityCode];
  if (!cfg || !cfg.crisisSensitivities) return 1.0;

  let maxMultiplier = 1.0;
  for (const crisis of activeCrises) {
    const mult = cfg.crisisSensitivities[crisis];
    if (mult && mult > maxMultiplier) {
      maxMultiplier = mult;
    }
  }

  return maxMultiplier;
}

/**
 * Calculates market quotes for all tracked commodities within a regional settlement.
 */
export function calculateSettlementMarketQuotes(
  settlement: SettlementState,
  stockMap: Record<string, number> = {},
  activeCrises: string[] = []
): SettlementMarketQuote {
  const popK = Math.max(1, settlement.population / 1000);
  const quotes: Record<string, MarketQuoteResult> = {};

  for (const [code, cfg] of Object.entries(COMMODITY_CONFIGS)) {
    const targetStock = Math.round(cfg.defaultTargetPerCapita * popK);
    const currentStock = stockMap[code] !== undefined ? stockMap[code] : Math.round(targetStock * 0.9);
    const crisisMult = resolveCrisisMultiplier(code, activeCrises);

    quotes[code] = calculateElasticPrice({
      commodity: code,
      basePrice: cfg.basePrice,
      currentStock,
      targetStock,
      elasticityFactor: cfg.elasticityFactor,
      crisisMultiplier: crisisMult
    });
  }

  return {
    settlementId: settlement.id,
    settlementName: settlement.name,
    population: settlement.population,
    activeCrises,
    quotes,
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Dynamic Market Elasticity Engine Class
 */
export class MarketElasticityEngine {
  /**
   * Evaluates pricing for a single commodity
   */
  public static calculatePrice(input: MarketQuoteInput): MarketQuoteResult {
    return calculateElasticPrice(input);
  }

  /**
   * Adapts legacy MarketCommodityState to dynamic elastic price
   */
  public static calculateFromState(
    item: MarketCommodityState,
    crisisMultiplier = 1.0
  ): number {
    const quote = calculateElasticPrice({
      commodity: item.commodity,
      basePrice: item.basePrice,
      currentStock: item.stockUnits,
      targetStock: item.demandUnits,
      elasticityFactor: item.priceElasticity,
      crisisMultiplier
    });
    return quote.finalPrice;
  }

  /**
   * Returns commodity configuration
   */
  public static getConfig(commodityCode: string): CommodityElasticityConfig | undefined {
    return COMMODITY_CONFIGS[commodityCode];
  }

  /**
   * Returns all supported commodity configurations
   */
  public static getAllConfigs(): CommodityElasticityConfig[] {
    return Object.values(COMMODITY_CONFIGS);
  }
}
