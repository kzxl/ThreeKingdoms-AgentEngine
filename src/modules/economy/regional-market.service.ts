/**
 * ThreeKingdoms-AgentEngine: Regional Market & Arbitrage Service
 * (src/modules/economy/regional-market.service.ts)
 *
 * Implements dynamic regional price determination, commodity specialization profiles,
 * ecological crisis price surges, and inter-city trade arbitrage computation.
 *
 * Adheres strictly to AgentOption Universe Architecture v4.0.
 */

import { DatabaseService } from '../../core/database';

export type SupplyState = 'SURPLUS' | 'NORMAL' | 'DEFICIT';

export interface SettlementSpecialization {
  surplusItems: string[];      // item_codes that are abundant (multiplier: 0.6 - 0.8)
  deficitItems: string[];      // item_codes that are scarce (multiplier: 1.3 - 1.8)
  surplusMultiplier?: number;  // Default 0.7
  deficitMultiplier?: number;  // Default 1.5
}

export interface SettlementProfile {
  settlementId: string;
  nameVi: string;
  provinceVi: string;
  coordX: number;
  coordY: number;
  specialization: SettlementSpecialization;
}

export interface SettlementMarketItem {
  itemCode: string;
  nameVi: string;
  category: string;
  basePrice: number;
  currentPrice: number;
  supplyState: SupplyState;
  crisisActive: boolean;
}

export interface ArbitrageOpportunity {
  itemCode: string;
  itemNameVi: string;
  buyPrice: number;
  bestDestination: string;
  bestDestinationNameVi: string;
  sellPrice: number;
  unitMargin: number;
  marginPercent: number;
  distanceLi: number;
}

/**
 * Static settlement geo-coordinates & specialization profiles for all 18 historical settlements.
 */
export const SETTLEMENT_PROFILES: Record<string, SettlementProfile> = {
  zhuo_xian: {
    settlementId: 'zhuo_xian',
    nameVi: 'Trác Huyện',
    provinceVi: 'U Châu',
    coordX: 330,
    coordY: 70,
    specialization: {
      surplusMultiplier: 0.70,
      deficitMultiplier: 1.50,
      surplusItems: ['COM-BAMBOO', 'RAW-BAMBOO-POLE', 'PROD-MAT', 'PROD-BASK', 'COM-WINE-ZHUO', 'FOOD-COOK-BAO'],
      deficitItems: ['COM-SILK', 'COM-TEA', 'COM-TEA-DRIED', 'COM-IRON', 'COM-SALT', 'COM-SALT-SEA']
    }
  },
  ji_cheng: {
    settlementId: 'ji_cheng',
    nameVi: 'Kế Thành & Bắc Bình',
    provinceVi: 'U Châu',
    coordX: 440,
    coordY: 55,
    specialization: {
      surplusMultiplier: 0.65,
      deficitMultiplier: 1.55,
      surplusItems: ['COM-HORSE-D', 'COM-HORSE-W', 'COM-LEATH', 'EQP-ARMOR-LEATHER', 'COM-MEAT'],
      deficitItems: ['COM-GRAIN', 'COM-TEA', 'COM-TEA-DRIED', 'COM-CERAMIC', 'COM-SILK']
    }
  },
  ye_cheng: {
    settlementId: 'ye_cheng',
    nameVi: 'Nghiệp Thành',
    provinceVi: 'Ký Châu',
    coordX: 320,
    coordY: 155,
    specialization: {
      surplusMultiplier: 0.75,
      deficitMultiplier: 1.45,
      surplusItems: ['COM-GRAIN', 'COM-IRON', 'RAW-IRON-ORE', 'COM-SWORD', 'COM-SPEAR'],
      deficitItems: ['COM-SALT', 'COM-SALT-SEA', 'COM-HORSE-W', 'COM-TEA', 'COM-CERAMIC']
    }
  },
  guang_zong: {
    settlementId: 'guang_zong',
    nameVi: 'Quảng Tông',
    provinceVi: 'Ký Châu',
    coordX: 375,
    coordY: 165,
    specialization: {
      surplusMultiplier: 0.75,
      deficitMultiplier: 1.65,
      surplusItems: ['RAW-HERB-WILD', 'MED-TRAUMA-SALVE', 'COM-TIMBER'],
      deficitItems: ['COM-GRAIN', 'COM-SWORD', 'COM-CROSSBOW', 'COM-IRON', 'COM-SALT', 'COM-SALT-SEA']
    }
  },
  ping_yuan: {
    settlementId: 'ping_yuan',
    nameVi: 'Bình Nguyên',
    provinceVi: 'Thanh Châu',
    coordX: 430,
    coordY: 195,
    specialization: {
      surplusMultiplier: 0.68,
      deficitMultiplier: 1.50,
      surplusItems: ['COM-SALT', 'COM-SALT-SEA', 'COM-GRAIN', 'COM-MEAT'],
      deficitItems: ['COM-TIMBER', 'COM-HORSE-W', 'COM-HERB', 'COM-IRON', 'RAW-IRON-ORE']
    }
  },
  luo_yang: {
    settlementId: 'luo_yang',
    nameVi: 'Lạc Dương',
    provinceVi: 'Tư Lệ',
    coordX: 250,
    coordY: 260,
    specialization: {
      surplusMultiplier: 0.75,
      deficitMultiplier: 1.70,
      surplusItems: ['COM-CERAMIC', 'COM-GOLD-INGOT', 'COM-WINE', 'BOOK-SUN-TZU', 'MED-REVIVE-PILL', 'FOOD-COOK-DUKANG'],
      deficitItems: ['COM-GRAIN', 'COM-TIMBER', 'COM-IRON', 'COM-HORSE-W', 'COM-LEATH', 'COM-SALT']
    }
  },
  xu_chang: {
    settlementId: 'xu_chang',
    nameVi: 'Hứa Xương',
    provinceVi: 'Dự Châu',
    coordX: 320,
    coordY: 300,
    specialization: {
      surplusMultiplier: 0.72,
      deficitMultiplier: 1.45,
      surplusItems: ['COM-GRAIN', 'EQP-SPEAR-IRON', 'COM-TIMBER', 'COM-SPEAR'],
      deficitItems: ['COM-SALT', 'COM-SALT-SEA', 'COM-TEA', 'COM-HERB', 'COM-HORSE-W']
    }
  },
  changan: {
    settlementId: 'changan',
    nameVi: 'Trường An',
    provinceVi: 'Kinh Triệu',
    coordX: 130,
    coordY: 285,
    specialization: {
      surplusMultiplier: 0.70,
      deficitMultiplier: 1.60,
      surplusItems: ['COM-HORSE-D', 'COM-SILK', 'COM-WINE', 'COM-LEATH', 'FOOD-COOK-DUKANG'],
      deficitItems: ['COM-GRAIN', 'COM-TIMBER', 'COM-SALT', 'COM-SALT-SEA', 'COM-TEA']
    }
  },
  cheng_du: {
    settlementId: 'cheng_du',
    nameVi: 'Thành Đô',
    provinceVi: 'Ích Châu',
    coordX: 70,
    coordY: 450,
    specialization: {
      surplusMultiplier: 0.60,
      deficitMultiplier: 1.65,
      surplusItems: ['COM-HERB', 'RAW-HERB-WILD', 'COM-SILK', 'COM-BAMBOO', 'MED-HEAL-SALVE'],
      deficitItems: ['COM-SALT', 'COM-SALT-SEA', 'COM-HORSE-W', 'COM-IRON', 'EQP-SPEAR-IRON']
    }
  },
  jian_ye: {
    settlementId: 'jian_ye',
    nameVi: 'Kiến Nghiệp',
    provinceVi: 'Dương Châu',
    coordX: 470,
    coordY: 410,
    specialization: {
      surplusMultiplier: 0.65,
      deficitMultiplier: 1.60,
      surplusItems: ['COM-TEA', 'COM-TEA-DRIED', 'COM-CERAMIC', 'COM-TIMBER'],
      deficitItems: ['COM-HORSE-W', 'COM-HORSE-D', 'COM-IRON', 'COM-LEATH']
    }
  },
  xiang_yang: {
    settlementId: 'xiang_yang',
    nameVi: 'Tương Dương',
    provinceVi: 'Kinh Châu',
    coordX: 250,
    coordY: 370,
    specialization: {
      surplusMultiplier: 0.70,
      deficitMultiplier: 1.45,
      surplusItems: ['COM-GRAIN', 'COM-WINE', 'BOOK-SUN-TZU', 'FOOD-COOK-DUKANG', 'COM-MEAT'],
      deficitItems: ['COM-HORSE-W', 'COM-SALT', 'COM-SALT-SEA', 'COM-TIMBER', 'COM-HERB']
    }
  },
  shou_chun: {
    settlementId: 'shou_chun',
    nameVi: 'Thọ Xuân',
    provinceVi: 'Hoài Nam',
    coordX: 390,
    coordY: 330,
    specialization: {
      surplusMultiplier: 0.72,
      deficitMultiplier: 1.45,
      surplusItems: ['COM-GRAIN', 'COM-IRON', 'RAW-IRON-ORE', 'COM-SPEAR'],
      deficitItems: ['COM-HORSE-W', 'COM-TEA', 'COM-HERB', 'COM-SILK']
    }
  },
  he_fei: {
    settlementId: 'he_fei',
    nameVi: 'Hợp Phì',
    provinceVi: 'Dương Châu',
    coordX: 420,
    coordY: 360,
    specialization: {
      surplusMultiplier: 0.70,
      deficitMultiplier: 1.50,
      surplusItems: ['COM-TIMBER', 'COM-LEATH', 'EQP-ARMOR-LEATHER', 'COM-BAMBOO'],
      deficitItems: ['COM-GRAIN', 'COM-SILK', 'COM-SALT', 'COM-HORSE-W']
    }
  },
  pu_yang: {
    settlementId: 'pu_yang',
    nameVi: 'Bộc Dương',
    provinceVi: 'Duyện Châu',
    coordX: 350,
    coordY: 220,
    specialization: {
      surplusMultiplier: 0.72,
      deficitMultiplier: 1.45,
      surplusItems: ['COM-IRON', 'COM-SPEAR', 'COM-SWORD', 'RAW-IRON-ORE'],
      deficitItems: ['COM-SALT', 'COM-SALT-SEA', 'COM-SILK', 'COM-TEA', 'COM-HORSE-W']
    }
  },
  wan_cheng: {
    settlementId: 'wan_cheng',
    nameVi: 'Uyển Thành',
    provinceVi: 'Nam Dương',
    coordX: 260,
    coordY: 330,
    specialization: {
      surplusMultiplier: 0.65,
      deficitMultiplier: 1.55,
      surplusItems: ['COM-IRON', 'RAW-IRON-ORE', 'EQP-SPEAR-IRON', 'COM-LEATH'],
      deficitItems: ['COM-SALT', 'COM-SALT-SEA', 'COM-TEA', 'COM-SILK', 'COM-HORSE-W']
    }
  },
  xia_pi: {
    settlementId: 'xia_pi',
    nameVi: 'Hạ Phì',
    provinceVi: 'Từ Châu',
    coordX: 450,
    coordY: 300,
    specialization: {
      surplusMultiplier: 0.70,
      deficitMultiplier: 1.45,
      surplusItems: ['COM-GRAIN', 'COM-SALT', 'COM-SALT-SEA', 'COM-MEAT'],
      deficitItems: ['COM-IRON', 'RAW-IRON-ORE', 'COM-TIMBER', 'COM-HERB', 'COM-TEA']
    }
  },
  han_zhong: {
    settlementId: 'han_zhong',
    nameVi: 'Hán Trung',
    provinceVi: 'Ích Châu Bắc',
    coordX: 110,
    coordY: 360,
    specialization: {
      surplusMultiplier: 0.65,
      deficitMultiplier: 1.60,
      surplusItems: ['COM-TIMBER', 'COM-HERB', 'RAW-HERB-WILD', 'RAW-SULFUR', 'RAW-CINNABAR'],
      deficitItems: ['COM-GRAIN', 'COM-SALT', 'COM-SALT-SEA', 'COM-SILK', 'COM-CERAMIC']
    }
  },
  wu_ling: {
    settlementId: 'wu_ling',
    nameVi: 'Vũ Lăng',
    provinceVi: 'Kinh Nam',
    coordX: 220,
    coordY: 480,
    specialization: {
      surplusMultiplier: 0.65,
      deficitMultiplier: 1.60,
      surplusItems: ['COM-TIMBER', 'RAW-HERB-WILD', 'COM-BAMBOO', 'COM-MEAT', 'RAW-BAMBOO-POLE'],
      deficitItems: ['COM-IRON', 'COM-SWORD', 'COM-CERAMIC', 'COM-SILK']
    }
  }
};

/**
 * Calculates inter-city march distance in ancient Li (dặm).
 * Uses scaled Euclidean metric based on historical Three Kingdoms coordinate projection.
 */
export function calculateDistanceLi(fromSettlementId: string, toSettlementId: string): number {
  if (fromSettlementId === toSettlementId) return 0;
  const p1 = SETTLEMENT_PROFILES[fromSettlementId];
  const p2 = SETTLEMENT_PROFILES[toSettlementId];
  if (!p1 || !p2) return 300; // safe default fallback

  const dx = p1.coordX - p2.coordX;
  const dy = p1.coordY - p2.coordY;
  const dist = Math.round(Math.sqrt(dx * dx + dy * dy) * 2.5);
  return Math.max(80, dist);
}

export class RegionalMarketService {
  private static instance: RegionalMarketService | null = null;
  private db: DatabaseService;

  public constructor(dbService?: DatabaseService) {
    this.db = dbService || DatabaseService.getInstance();
  }

  public static getInstance(dbService?: DatabaseService): RegionalMarketService {
    if (!RegionalMarketService.instance) {
      RegionalMarketService.instance = new RegionalMarketService(dbService);
    }
    return RegionalMarketService.instance;
  }

  public static resetInstance(): void {
    RegionalMarketService.instance = null;
  }

  /**
   * Retrieves full coordinate distance matrix between all 18 settlements.
   */
  public getDistanceMatrix(): Record<string, Record<string, number>> {
    const matrix: Record<string, Record<string, number>> = {};
    const ids = Object.keys(SETTLEMENT_PROFILES);
    for (const fromId of ids) {
      matrix[fromId] = {};
      for (const toId of ids) {
        matrix[fromId][toId] = calculateDistanceLi(fromId, toId);
      }
    }
    return matrix;
  }

  /**
   * Checks if an active crisis in the settlement affects a specific commodity,
   * returning the active crisis multiplier or 1.0 if not affected.
   */
  public getCrisisCommodityMultiplier(
    settlementId: string,
    itemCode: string,
    category: string
  ): { multiplier: number; crisisActive: boolean } {
    try {
      const activeCrises = this.db.query<any>(
        'SELECT * FROM regional_ecological_crises WHERE settlement_id = ? AND is_active = 1;',
        [settlementId]
      );

      if (!activeCrises || activeCrises.length === 0) {
        return { multiplier: 1.0, crisisActive: false };
      }

      let maxCrisisMult = 1.0;
      let hasApplicableCrisis = false;

      for (const crisis of activeCrises) {
        const crisisType = crisis.crisis_type;
        const grainMultiplier = Number(crisis.grain_price_multiplier) || 2.0;

        // 1. Food / Grain crisis impact (Drought, Locusts, etc.)
        if (crisisType === 'GREAT_DROUGHT' || crisisType === 'LOCUST_SWARM') {
          if (itemCode === 'COM-GRAIN' || category === 'FOOD_STUFF' || itemCode.startsWith('FOOD-')) {
            maxCrisisMult = Math.max(maxCrisisMult, grainMultiplier);
            hasApplicableCrisis = true;
          }
          // Special historical crisis requirement: CRISIS-184-YE in Yecheng multiplies grain AND shields by 2.5x
          if (
            (settlementId === 'ye_cheng' || crisis.crisis_id === 'CRISIS-184-YE') &&
            (itemCode === 'PROD-SHIELD-BAM' || itemCode === 'EQP-SHIELD-BAMBOO')
          ) {
            maxCrisisMult = Math.max(maxCrisisMult, 2.5);
            hasApplicableCrisis = true;
          }
        }

        // 2. Peasant Rebellion / War (Guangzong Yellow Turbans, etc.)
        if (crisisType === 'PEASANT_REBELLION') {
          if (itemCode === 'COM-GRAIN' || category === 'FOOD_STUFF') {
            maxCrisisMult = Math.max(maxCrisisMult, grainMultiplier);
            hasApplicableCrisis = true;
          }
          if (
            category === 'MILITARY_EQUIPMENT' ||
            itemCode.startsWith('EQP-') ||
            itemCode.startsWith('WPN-') ||
            itemCode.startsWith('COM-SPEAR') ||
            itemCode.startsWith('COM-SWORD') ||
            itemCode.startsWith('COM-CROSSBOW')
          ) {
            maxCrisisMult = Math.max(maxCrisisMult, 2.0);
            hasApplicableCrisis = true;
          }
        }

        // 3. Flood crisis: spikes timber and grain
        if (crisisType === 'YELLOW_RIVER_FLOOD') {
          if (itemCode === 'COM-GRAIN' || itemCode === 'COM-TIMBER' || itemCode === 'COM-BAMBOO') {
            maxCrisisMult = Math.max(maxCrisisMult, 2.0);
            hasApplicableCrisis = true;
          }
        }

        // 4. Pestilence / Plague: spikes medicine and herbs
        if (crisisType === 'PESTILENCE_PLAGUE') {
          if (itemCode === 'COM-HERB' || itemCode.startsWith('RAW-HERB') || itemCode.startsWith('MED-')) {
            maxCrisisMult = Math.max(maxCrisisMult, 2.5);
            hasApplicableCrisis = true;
          }
        }
      }

      return { multiplier: maxCrisisMult, crisisActive: hasApplicableCrisis };
    } catch {
      return { multiplier: 1.0, crisisActive: false };
    }
  }

  /**
   * Calculates the effective trading price of an item in a specific settlement.
   * Considers baseline price, settlement surplus/deficit specialization, and active ecological crises.
   */
  public calculateSettlementPrice(settlementId: string, itemCode: string): number {
    const item = this.db.queryOne<any>(
      'SELECT baseline_peace_price, current_market_price, category FROM master_items WHERE item_code = ?;',
      [itemCode]
    );

    if (!item) {
      return 50; // Fallback default
    }

    const basePrice = Number(item.current_market_price || item.baseline_peace_price || 50);
    const profile = SETTLEMENT_PROFILES[settlementId];
    let specializationMultiplier = 1.0;

    if (profile) {
      if (profile.specialization.surplusItems.includes(itemCode)) {
        specializationMultiplier = profile.specialization.surplusMultiplier ?? 0.70;
      } else if (profile.specialization.deficitItems.includes(itemCode)) {
        specializationMultiplier = profile.specialization.deficitMultiplier ?? 1.50;
      }
    }

    const { multiplier: crisisMult, crisisActive } = this.getCrisisCommodityMultiplier(
      settlementId,
      itemCode,
      item.category
    );

    let finalPrice: number;
    if (crisisActive) {
      // During active crisis, crisis demand overrides local abundance
      const effectiveBase = specializationMultiplier < 1.0 ? 1.0 : specializationMultiplier;
      finalPrice = Math.round(basePrice * effectiveBase * crisisMult);
    } else {
      finalPrice = Math.round(basePrice * specializationMultiplier);
    }

    return Math.max(1, finalPrice);
  }

  /**
   * Generates full market catalog for a settlement with dynamic pricing and supply state.
   */
  public getSettlementMarketCatalog(settlementId: string): SettlementMarketItem[] {
    const items = this.db.query<any>(
      `SELECT item_code, name_vi, category, baseline_peace_price, current_market_price
       FROM master_items
       ORDER BY category ASC, baseline_peace_price ASC;`
    );

    const profile = SETTLEMENT_PROFILES[settlementId];

    return items.map((item) => {
      const itemCode = item.item_code;
      const basePrice = Number(item.current_market_price || item.baseline_peace_price || 50);
      const currentPrice = this.calculateSettlementPrice(settlementId, itemCode);
      const { crisisActive } = this.getCrisisCommodityMultiplier(settlementId, itemCode, item.category);

      let supplyState: SupplyState = 'NORMAL';
      if (crisisActive) {
        supplyState = 'DEFICIT';
      } else if (profile) {
        if (profile.specialization.surplusItems.includes(itemCode)) {
          supplyState = 'SURPLUS';
        } else if (profile.specialization.deficitItems.includes(itemCode)) {
          supplyState = 'DEFICIT';
        }
      }

      return {
        itemCode,
        nameVi: item.name_vi,
        category: item.category,
        basePrice,
        currentPrice,
        supplyState,
        crisisActive
      };
    });
  }

  /**
   * Scans all 18 regional markets to compute optimal inter-city arbitrage trade routes.
   * Compares buy prices at fromSettlementId against the highest sell price across all destinations.
   */
  public getArbitrageOpportunities(fromSettlementId: string): ArbitrageOpportunity[] {
    const catalog = this.getSettlementMarketCatalog(fromSettlementId);
    const destinationIds = Object.keys(SETTLEMENT_PROFILES).filter((id) => id !== fromSettlementId);
    const opportunities: ArbitrageOpportunity[] = [];

    for (const item of catalog) {
      const buyPrice = item.currentPrice;
      let bestDestId = '';
      let bestDestNameVi = '';
      let bestSellPrice = 0;

      for (const destId of destinationIds) {
        const destPrice = this.calculateSettlementPrice(destId, item.itemCode);
        if (destPrice > bestSellPrice) {
          bestSellPrice = destPrice;
          bestDestId = destId;
          bestDestNameVi = SETTLEMENT_PROFILES[destId]?.nameVi || destId;
        }
      }

      const unitMargin = bestSellPrice - buyPrice;
      if (unitMargin > 0 && buyPrice > 0) {
        const marginPercent = Math.round((unitMargin / buyPrice) * 100);
        const distanceLi = calculateDistanceLi(fromSettlementId, bestDestId);

        opportunities.push({
          itemCode: item.itemCode,
          itemNameVi: item.nameVi,
          buyPrice,
          bestDestination: bestDestId,
          bestDestinationNameVi: bestDestNameVi,
          sellPrice: bestSellPrice,
          unitMargin,
          marginPercent,
          distanceLi
        });
      }
    }

    // Sort descending by unit margin
    opportunities.sort((a, b) => b.unitMargin - a.unitMargin);
    return opportunities;
  }
}
