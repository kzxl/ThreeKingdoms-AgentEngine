/**
 * ThreeKingdoms-AgentEngine: Dynamic Contextual Action Matrix Engine
 * (src/modules/contextual-actions/context-action.engine.ts)
 *
 * Implements the 4-Pillar Contextual RPG Action Taxonomy:
 * 1. KIZUNA_SOCIAL: Direct Hero interaction via Kizuna Engine (Drink, Converse, Spar, Mentor)
 * 2. FACILITY_OPERATION: True local economic/military/artisan business operations
 * 3. OPPORTUNITY_INCIDENT: Situational regional dilemmas, arbitrage, schemes, or local affairs
 * 4. PERSONAL_GROWTH: Self-cultivation (Martial training, Tactics study, Crafting practice, Stroll, Rest)
 *
 * ZERO MOVE_LOCATION: Navigation is handled exclusively by Local POIs and World Map.
 * STRICT PRECONDITION GUARDS: Evaluates liquid cash, inventory BOM, and fatigue feasibility.
 *
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { DatabaseService } from '../../core/database';
import { DailyInteractionEngine, EverydayActionType } from '../social-kizuna/daily-interaction.engine';
import { MarketCatalog, loadMarketCatalog } from '../../shared/market-price-book';
import { quoteFromReference } from '../../shared/market-quote';

export type ActionPillar =
  | 'KIZUNA_SOCIAL'
  | 'FACILITY_OPERATION'
  | 'OPPORTUNITY_INCIDENT'
  | 'PERSONAL_GROWTH';

export interface ContextualChoice {
  id: string; // 'OPT_1', 'OPT_2', 'OPT_3', 'OPT_4'
  pillar: ActionPillar;
  pillarLabelVi: string;
  pillarLabelEn: string;
  badgeClass: string;
  icon: string;
  title: string;
  titleEn: string;
  desc: string;
  descEn: string;
  disabled?: boolean;
  disabledReasonVi?: string;
  disabledReasonEn?: string;
  action: {
    type: string;
    [key: string]: any;
  };
}

export interface LocationSceneContext {
  subLocation: string;
  locationFullVi: string;
  locationFullEn: string;
  npc: {
    id: string;
    name: string;
    nameEn: string;
    title: string;
    titleEn: string;
    avatarChar: string;
    sentiment: number;
    sentimentStatus: string;
  };
  lastCheck: {
    status: string;
    type: string;
    title: string;
    score: number;
    dc: number;
    formula: string;
  };
  narrativeVi: string;
  narrativeEn: string;
}

export class ContextActionEngine {
  private static instance: ContextActionEngine | null = null;
  private db: DatabaseService;
  private kizunaEngine: DailyInteractionEngine;
  private market: MarketCatalog = new Map();
  private fame = 0;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.kizunaEngine = DailyInteractionEngine.getInstance();
  }

  public static getInstance(): ContextActionEngine {
    if (!ContextActionEngine.instance) {
      ContextActionEngine.instance = new ContextActionEngine();
    }
    return ContextActionEngine.instance;
  }

  /**
   * Generates 4 strictly standardized contextual choices for the given location,
   * dynamically evaluating player resources, inventory, NPC state, and location amenities.
   */
  public generateChoices(
    subLocation: string,
    playerState: any,
    inventory: any[] = [],
    campaignMeta: any = {}
  ): ContextualChoice[] {
    const liquidCash = Number(playerState?.liquid_cash || 0);
    const fatigue = Number(playerState?.fatigue || 0);
    const morale = Number(playerState?.morale || 100);
    const gameDate = campaignMeta?.current_date || '184-05-02';

    // Quote from the same catalog the trade executor settles against, so the
    // displayed price and the charged price cannot drift apart.
    this.market = loadMarketCatalog(this.db);
    this.fame = Number(playerState?.fame || 0);

    // Helper map for inventory lookup
    const invMap = new Map<string, number>();
    for (const item of inventory) {
      invMap.set(item.item_code, Number(item.quantity || 0));
    }

    const saltQty = invMap.get('COM-SALT') || 0;
    const grainQty = invMap.get('COM-GRAIN') || 0;
    const leathQty = invMap.get('COM-LEATH') || 0;
    const bamQty = invMap.get('COM-BAMBOO') || 0;
    const matQty = invMap.get('PROD-MAT') || 0;
    const baskQty = invMap.get('PROD-BASK') || 0;
    const shieldQty = invMap.get('PROD-SHIELD-BAM') || 0;

    switch (subLocation) {
      case 'Vườn Đào':
        return this.generatePeachGardenChoices(liquidCash, fatigue, leathQty, bamQty, gameDate);

      case 'Chợ Đông Môn':
        return this.generateMarketplaceChoices(liquidCash, fatigue, saltQty, grainQty, matQty, gameDate);

      case 'Xưởng Lương Thị':
        return this.generateWorkshopChoices(liquidCash, fatigue, bamQty, leathQty, matQty, shieldQty, gameDate);

      case 'Quảng Tông Quân Doanh':
        return this.generateMilitaryCampChoices(liquidCash, fatigue, grainQty, shieldQty, gameDate);

      case 'Bình Nguyên Trọng Trấn':
        return this.generatePingyuanChoices(liquidCash, fatigue, grainQty, shieldQty, gameDate);

      case 'Hứa Xương Tướng Phủ':
      case 'Trường Xã Tiền Tuyến':
        return this.generateXuchangChoices(liquidCash, fatigue, gameDate);

      case 'Kinh Đô Lạc Dương':
        return this.generateLuoyangChoices(liquidCash, fatigue, gameDate);

      case 'Bắc Bình Soái Phủ':
        return this.generateBeipingChoices(liquidCash, fatigue, gameDate);

      case 'Nghiệp Thành Đại Phủ':
        return this.generateYechengChoices(liquidCash, fatigue, gameDate);

      case 'Hạ Phì Thành Lũy':
        return this.generateXiapiChoices(liquidCash, fatigue, gameDate);

      case 'Trường An Cung Phủ':
        return this.generateChanganChoices(liquidCash, fatigue, gameDate);

      case 'Tương Dương Châu Phủ':
        return this.generateXiangyangChoices(liquidCash, fatigue, gameDate);

      case 'Giang Lăng Thủy Doanh':
      case 'Xích Bích Thủy Trại':
        return this.generateNavalCampChoices(liquidCash, fatigue, gameDate);

      case 'Kiến Nghiệp Đô Thành':
        return this.generateJianyeChoices(liquidCash, fatigue, gameDate);

      case 'Hán Trung Thiên Sư Phủ':
        return this.generateHanzhongChoices(liquidCash, fatigue, gameDate);

      case 'Thành Đô Ích Châu Phủ':
        return this.generateChengduChoices(liquidCash, fatigue, gameDate);

      default:
        return this.generateGenericChoices(subLocation, liquidCash, fatigue, gameDate);
    }
  }

  private quoteFor(itemCode: string, side: 'buyPrice' | 'sellPrice'): number {
    const item = this.market.get(itemCode);
    if (!item || item.price <= 0) {
      throw new Error(`No market price for ${itemCode}; add it to master_items.`);
    }
    return quoteFromReference(item.price, this.fame, itemCode)[side];
  }

  private buyPrice(itemCode: string): number {
    return this.quoteFor(itemCode, 'buyPrice');
  }

  private sellPrice(itemCode: string): number {
    return this.quoteFor(itemCode, 'sellPrice');
  }

  // =========================================================================
  // LOCATION-SPECIFIC 4-PILLAR ACTION GENERATORS
  // =========================================================================

  /**
   * Vườn Đào (Peach Garden): Estate & Sworn Oath Grounds
   * Host: Zhang Fei (NPC-0002) / Liu Bei (NPC-0001)
   */
  private generatePeachGardenChoices(
    liquidCash: number,
    fatigue: number,
    leathQty: number,
    bamQty: number,
    gameDate: string
  ): ContextualChoice[] {
    const leathPrice = this.buyPrice('COM-LEATH');
    const buyLeathBatch = liquidCash >= leathPrice * 8 ? 8 : (liquidCash >= leathPrice * 4 ? 4 : (liquidCash >= leathPrice ? 1 : 0));
    const buyLeathCost = buyLeathBatch * leathPrice;
    const canBuyLeath = buyLeathBatch > 0;

    return [
      // Pillar 1: Kizuna Social (Zhang Fei)
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '酒',
        title: 'Cùng Trương Phi nâng chén Trác Thành Trán Nương, đàm luận anh hùng',
        titleEn: 'Feast and drink Zhuocheng wine with Zhang Fei, discussing heroes',
        desc: 'Đàm luận khí phách hào kiệt • Tăng Hảo cảm & Kính trọng Trương Phi • Khai mở Sương mù tình báo',
        descEn: 'Converse over wine • Boost Zhang Fei Affinity & Respect • Dispel Fog of Information',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0002',
          npc_name: 'Trương Phi (Dực Đức)',
          action_type: 'BANQUET_DRINK',
          prompt: 'Cùng Trương Phi nâng chén rượu Trác Thành Trán Nương, bàn luận thế cục loạn thế'
        }
      },
      // Pillar 2: Facility Operation (Leather Procurement)
      {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '肉',
        title: canBuyLeath
          ? `Thu mua ${buyLeathBatch} Tấm Da Trâu lò mổ Trác Huyện (Chi ${buyLeathCost} Quan)`
          : 'Thu mua da trâu lò mổ Trác Huyện (Cạn vốn lưu động)',
        titleEn: canBuyLeath
          ? `Procure ${buyLeathBatch} Ox Leather hides from slaughterhouse (Cost ${buyLeathCost} quan)`
          : 'Procure Ox Leather hides (Insufficient Liquid Cash)',
        desc: canBuyLeath
          ? `+${buyLeathBatch} COM-LEATH vào kho xưởng • Giá thị trường ${leathPrice} Quan/tấm • Sổ cái bảo toàn`
          : `Cần tối thiểu ${leathPrice} Quan tiền mặt • Hiện có ${liquidCash} Quan`,
        descEn: canBuyLeath
          ? `+${buyLeathBatch} COM-LEATH to workshop warehouse • Market price ${leathPrice} quan/hide • Invariant ledger preserved`
          : `Requires at least ${leathPrice} quan • Currently have ${liquidCash} quan`,
        disabled: !canBuyLeath,
        disabledReasonVi: `Ngân khố không đủ: Cần tối thiểu ${leathPrice} Quan (Hiện có ${liquidCash} Quan)`,
        disabledReasonEn: `Insufficient cash: Need at least ${leathPrice} quan (Available: ${liquidCash})`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'COM-LEATH',
          quantity: buyLeathBatch || 1,
          unit_price: leathPrice,
          counterparty: 'Trương Phi (Lò mổ Huyện Trác)',
          game_date: gameDate
        }
      },
      // Pillar 3: Opportunity / Incident (Militia Preparation)
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '馬',
        title: 'Bàn thảo kế hoạch chuẩn bị quân bị & tuyển mộ nghĩa dũng Huyện Trác',
        titleEn: 'Confer on militia armaments and volunteer recruitment in Zhuo County',
        desc: 'Hội ý mưu lược cùng Lưu Bị & Trương Phi • Xây dựng danh vọng và uy thế địa phương',
        descEn: 'Confer strategic plans with Liu Bei & Zhang Fei • Build regional renown and prestige',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0001',
          npc_name: 'Lưu Bị (Huyền Đức)',
          action_type: 'TEA_CONVERSE',
          prompt: 'Bàn bạc kế sách tiếp tế trang bị và chiêu mộ dũng sĩ cho nghĩa quân Huyện Trác'
        }
      },
      // Pillar 4: Personal Growth (Martial Training or Rest)
      fatigue >= 80 ? {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '息',
        title: 'Nghỉ ngơi tĩnh dưỡng trong sương phòng Vườn Đào, hồi phục thể lực',
        titleEn: 'Rest and recuperate in Peach Garden guest chamber',
        desc: 'Thể lực -35 (Hiện tại mệt mỏi) • Sĩ khí +15 • Hồi phục tinh thần trước khi vi hành',
        descEn: 'Fatigue -35 • Morale +15 • Recover vital energy',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'REST_RECOVERY',
          fatigue_delta: 35,
          morale_delta: 15,
          memo: 'Nghỉ ngơi tại sương phòng Vườn Đào',
          game_date: gameDate
        }
      } : {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '武',
        title: 'Luyện tập Thương Pháp thực chiến dưới gốc đào hạ trạch',
        titleEn: 'Practice Spear Combat drills beneath peach blossoms',
        desc: 'Tăng EXP Thương Pháp (+10 EXP SKL-WAR-SPEAR) • Sĩ khí +5 • Tiêu hao 10 Thể lực',
        descEn: 'Gain Spear EXP (+10 EXP SKL-WAR-SPEAR) • Morale +5 • Costs 10 Fatigue',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'TRAIN_MARTIAL',
          exp_skill: 'SKL-WAR-SPEAR',
          exp_amount: 10,
          fatigue_delta: 10,
          morale_delta: 5,
          memo: 'Khổ luyện thương pháp tại Vườn Đào',
          game_date: gameDate
        }
      },
      // Pillar 5: multi-day task. Starting it consumes one day; the task then
      // advances whenever the campaign clock moves and survives month closure.
      {
        id: 'OPT_5',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BẾ QUAN',
        pillarLabelEn: 'SELF CULTIVATION / RETREAT',
        badgeClass: 'pillar-growth',
        icon: '曆',
        title: 'Bế quan khổ luyện thương pháp 7 ngày dưới gốc đào',
        titleEn: 'Seven-day secluded spear training beneath the peach garden',
        desc: 'Tiến trình 7 ngày • +70 EXP Thương Pháp khi hoàn tất • Có thể tiếp tục qua tháng',
        descEn: '7-day progress • +70 Spear EXP on completion • Continues across months',
        disabled: fatigue >= 90,
        disabledReasonVi: 'Thể lực quá kiệt (≥90), hãy nghỉ ngơi trước khi bế quan.',
        disabledReasonEn: 'Fatigue is too high (≥90); rest before starting the retreat.',
        action: {
          type: 'START_TASK',
          task_type: 'TRAIN_SPEAR_7D',
          title: 'Bế quan khổ luyện thương pháp',
          titleEn: 'Secluded spear training',
          duration_days: 7,
          memo: 'Bế quan khổ luyện thương pháp 7 ngày',
          payload: {
            exp_skill: 'SKL-WAR-SPEAR',
            exp_amount: 70
          }
        }
      }
    ];
  }

  /**
   * Chợ Đông Môn (East Gate Market): Commercial Hub & Teahouse
   * Host: Guan Yu (NPC-0003)
   */
  private generateMarketplaceChoices(
    liquidCash: number,
    fatigue: number,
    saltQty: number,
    grainQty: number,
    matQty: number,
    gameDate: string
  ): ContextualChoice[] {
    const matPrice = this.sellPrice('PROD-MAT');
    const saltPrice = this.sellPrice('COM-SALT');
    const grainPrice = this.buyPrice('COM-GRAIN');
    const hasMatsToSell = matQty >= 5;
    const sellMatBatch = Math.min(matQty, 10);
    const hasSaltToSell = saltQty >= 5;

    // Determine trade action based on warehouse assets
    let facilityChoice: ContextualChoice;
    if (hasMatsToSell) {
      facilityChoice = {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '工',
        title: `Xuất bán ${sellMatBatch} Tấm Chiếu Trúc Lương Gia cho Thương đoàn Ký Châu`,
        titleEn: `Sell ${sellMatBatch} Liang Family Bamboo Mats to Jizhou Merchants`,
        desc: `-${sellMatBatch} PROD-MAT • Thu về +${sellMatBatch * matPrice} Quan tiền mặt lưu động (@${matPrice} Quan/tấm) • COM Check DC 35`,
        descEn: `-${sellMatBatch} PROD-MAT • Receive +${sellMatBatch * matPrice} quan (@${matPrice} quan/ea) • Double-entry balanced`,
        action: {
          type: 'TRADE_SELL',
          item_code: 'PROD-MAT',
          quantity: sellMatBatch,
          unit_price: matPrice,
          counterparty: 'Thương nhân Ký Châu',
          game_date: gameDate
        }
      };
    } else if (hasSaltToSell) {
      const sellSaltBatch = Math.min(saltQty, 10);
      facilityChoice = {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '商',
        title: `Xuất bán ${sellSaltBatch} Đấu Muối Biển cho tiệm buôn Đông Môn`,
        titleEn: `Sell ${sellSaltBatch} Dou of Sea Salt to East Market Merchant`,
        desc: `-${sellSaltBatch} COM-SALT • Thu về +${sellSaltBatch * saltPrice} Quan tiền mặt (@${saltPrice} Quan/đấu)`,
        descEn: `-${sellSaltBatch} COM-SALT • Receive +${sellSaltBatch * saltPrice} quan (@${saltPrice} quan/ea)`,
        action: {
          type: 'TRADE_SELL',
          item_code: 'COM-SALT',
          quantity: sellSaltBatch,
          unit_price: saltPrice,
          counterparty: 'Thương nhân Ký Châu',
          game_date: gameDate
        }
      };
    } else {
      // Procure grain if funds allow
      const grainBatch = liquidCash >= grainPrice * 5 ? 5 : (liquidCash >= grainPrice * 2 ? 2 : 1);
      const grainCost = grainBatch * grainPrice;
      const canBuyGrain = liquidCash >= grainPrice;
      facilityChoice = {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '農',
        title: canBuyGrain
          ? `Thu mua ${grainBatch} Thạch Lương tiểu mạch dự trữ (Chi ${grainCost} Quan)`
          : 'Thu mua lương thảo dự trữ (Cạn vốn lưu động)',
        titleEn: canBuyGrain
          ? `Procure ${grainBatch} piculs of Wheat Rations (Cost ${grainCost} quan)`
          : 'Procure Wheat Rations (Insufficient Cash)',
        desc: canBuyGrain
          ? `+${grainBatch} COM-GRAIN • Giá chuẩn ${grainPrice} Quan/thạch • Bảo đảm an ninh lương thực`
          : `Cần tối thiểu ${grainPrice} Quan • Hiện có ${liquidCash} Quan`,
        descEn: canBuyGrain
          ? `+${grainBatch} COM-GRAIN • Unit price ${grainPrice} quan/picul`
          : `Requires ${grainPrice} quan • Available: ${liquidCash} quan`,
        disabled: !canBuyGrain,
        disabledReasonVi: `Ngân khố không đủ: Cần tối thiểu ${grainPrice} Quan (Hiện có ${liquidCash} Quan)`,
        disabledReasonEn: `Insufficient cash: Need at least ${grainPrice} quan (Available: ${liquidCash})`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'COM-GRAIN',
          quantity: grainBatch,
          unit_price: grainPrice,
          counterparty: 'Lương thương Huyện Trác',
          game_date: gameDate
        }
      };
    }

    return [
      // Pillar 1: Kizuna Social (Guan Yu)
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '茶',
        title: 'Mời Quan Vũ dùng trà thơm, đàm luận Binh Pháp Tôn Tử & Xuân Thu',
        titleEn: 'Invite Guan Yu for tea, discussing Sun Tzu Art of War & Spring Autumn Annals',
        desc: 'Đàm luận binh pháp Xuân Thu • Tăng Hảo cảm & Kính trọng Quan Vũ • Mở rộng nhãn quan mưu lược',
        descEn: 'Converse on Spring Autumn tactics • Boost Guan Yu Affinity & Respect • Expand tactical vision',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0003',
          npc_name: 'Quan Vũ (Vân Trường)',
          action_type: 'TEA_CONVERSE',
          prompt: 'Mời Quan Vũ uống trà tại sạp chợ Đông, đàm luận binh pháp và đại cục thiên hạ'
        }
      },
      // Pillar 2: Facility Operation
      facilityChoice,
      // Pillar 3: Opportunity / Incident (Market Intelligence)
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '策',
        title: 'Khảo sát thương lộ, thu thập thông tin thị giá muối & lúa các quận lân cận',
        titleEn: 'Survey trade routes, gathering commodity price intelligence across commanderies',
        desc: 'EXP Giám định & Hóa thực +15 (SKL-COM-APPRAISE) • Bắt sóng chênh lệch giá U Châu - Ký Châu',
        descEn: 'Appraisal EXP +15 (SKL-COM-APPRAISE) • Uncover arbitrage opportunities',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_skill: 'SKL-COM-APPRAISE',
          exp_amount: 15,
          fatigue_delta: 5,
          morale_delta: 5,
          memo: 'Khảo sát thông tin giá cả tại Chợ Đông Môn',
          game_date: gameDate
        }
      },
      // Pillar 4: Personal Growth (Scout Talent / Stroll)
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '行',
        title: 'Vi hành dạo phố chợ Đông Môn, tìm kiếm nhân tài & nguồn cung đặc sản',
        titleEn: 'Stroll through East Gate Market, seeking hidden talent and unique supplies',
        desc: 'Tìm kiếm cơ hội chiêu mộ gia thần • Sĩ khí +5 • Tiêu hao 8 Thể lực',
        descEn: 'Scout prospective retainers • Morale +5 • Costs 8 Fatigue',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'TRAIN_MARTIAL',
          exp_amount: 5,
          fatigue_delta: 8,
          morale_delta: 5,
          memo: 'Vi hành quan sát chợ Đông Môn',
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Xưởng Lương Thị (Liang Workshop): Artisan Manufacturing & Retainers
   * Host: Chen Bao (NPC-0007)
   */
  private generateWorkshopChoices(
    liquidCash: number,
    fatigue: number,
    bamQty: number,
    leathQty: number,
    matQty: number,
    shieldQty: number,
    gameDate: string
  ): ContextualChoice[] {
    const canCraftShields = bamQty >= 4.0 && leathQty >= 2.5;
    const canCraftMats = bamQty >= 2.5;

    let craftChoice: ContextualChoice;
    if (canCraftShields) {
      craftChoice = {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '甲',
        title: 'Phê duyệt ca chế tạo: Đóng 5 Khiên Trúc Bọc Da Quân Dụng',
        titleEn: 'Approve production batch: Craft 5 Leather-Faced Bamboo Shields',
        desc: 'Tiêu hao 4.0 Trúc, 2.5 Da, 1.0 Gai • Thu hoạch +5 PROD-SHIELD-BAM vào kho',
        descEn: 'Consumes 4.0 Bamboo, 2.5 Leather, 1.0 Hemp • Yields +5 PROD-SHIELD-BAM',
        action: {
          type: 'PRODUCTION_BATCH',
          recipe: 'PROD-SHIELD-BAM',
          batch_size: 5,
          game_date: gameDate
        }
      };
    } else if (canCraftMats) {
      craftChoice = {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '工',
        title: 'Khởi động ca dệt: Đóng 10 Chiếu Trúc Lương Gia Thành Phẩm',
        titleEn: 'Launch weaving shift: Produce 10 Finished Bamboo Mats',
        desc: 'Tiêu hao 2.5 Trúc, 1.0 Gai • Thu hoạch +10 PROD-MAT thương phẩm',
        descEn: 'Consumes 2.5 Bamboo, 1.0 Hemp • Yields +10 PROD-MAT finished goods',
        action: {
          type: 'PRODUCTION_BATCH',
          recipe: 'PROD-MAT',
          batch_size: 10,
          game_date: gameDate
        }
      };
    } else {
      craftChoice = {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '警',
        title: 'Tạm dừng ca sản xuất: Kho xưởng cạn phôi liệu Tre & Da',
        titleEn: 'Halt production shift: Workshop depleted of Bamboo & Leather',
        desc: `Kho hiện có: ${bamQty} Trúc, ${leathQty} Da • Cần bổ sung vật tư từ Chợ hoặc Vườn Đào`,
        descEn: `Current stock: ${bamQty} Bamboo, ${leathQty} Leather • Replenish raw materials`,
        disabled: true,
        disabledReasonVi: `Thiếu nguyên liệu BOM: Cần tối thiểu 2.5 Trúc (Kho có ${bamQty})`,
        disabledReasonEn: `Insufficient BOM materials: Need 2.5 Bamboo (Stock: ${bamQty})`,
        action: {
          type: 'PRODUCTION_BATCH',
          recipe: 'PROD-MAT',
          batch_size: 1,
          game_date: gameDate
        }
      };
    }

    return [
      // Pillar 1: Kizuna Social (Chen Bao)
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '匠',
        title: 'Thảo luận cùng Thợ Cả Trần Bảo về quy chuẩn kỹ thuật giáp khiên',
        titleEn: 'Consult Master Craftsman Chen Bao on shield armor technical specs',
        desc: 'Khảo sát kỹ nghệ rèn đúc • Tăng Kính trọng Trần Bảo • Tăng EXP Kỹ nghệ Chế tác',
        descEn: 'Inspect blacksmithing technique • Boost Chen Bao Respect • Gain Crafting EXP',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0007',
          npc_name: 'Trần Bảo (Thợ Cả Lương Gia)',
          action_type: 'LEARN_MENTOR',
          prompt: 'Thảo luận cùng thợ cả Trần Bảo về việc nâng cấp độ bền khiên bọc da cho nghĩa quân'
        }
      },
      // Pillar 2: Facility Operation
      craftChoice,
      // Pillar 3: Opportunity / Incident (Incentive Reward)
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '賞',
        title: 'Trích thưởng 100 Quan két an toàn động viên sĩ khí thợ xưởng Lương Gia',
        titleEn: 'Disburse 100 quan safe-cash incentive to boost artisan workforce morale',
        desc: 'Sĩ khí thợ xưởng 100% • Trung thành Trần Bảo +2 • Chi 100 Quan sổ cái kép',
        descEn: 'Workforce Morale 100% • Loyalty +2 • Disburse 100 quan ledger expense',
        disabled: liquidCash < 100,
        disabledReasonVi: `Két an toàn không đủ 100 Quan (Hiện có ${liquidCash} Quan)`,
        disabledReasonEn: `Insufficient cash for bonus (Have ${liquidCash} quan)`,
        action: {
          type: 'REWARD_NPC',
          npc_id: 'NPC-0007',
          amount: 100,
          counterparty: 'Trần Bảo (Thợ Cả Lương Gia)',
          game_date: gameDate
        }
      },
      // Pillar 4: Personal Growth (Crafting Hands-On)
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '工',
        title: 'Trực tiếp ngồi vào khung cửi đan thử nghiệm mẫu khiên trúc mới',
        titleEn: 'Sit at workbench testing experimental woven bamboo shield prototype',
        desc: 'EXP Biên dệt Khí giới +15 (SKL-CRA-WEAVE) • Thấu hiểu kỹ thuật • Tiêu hao 10 Thể lực',
        descEn: 'Artisan EXP +15 (SKL-CRA-WEAVE) • Deepen craft expertise • Costs 10 Fatigue',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'PRACTICE_CRAFT',
          exp_skill: 'SKL-CRA-WEAVE',
          exp_amount: 15,
          fatigue_delta: 10,
          morale_delta: 5,
          memo: 'Tự tay đan thử nghiệm mẫu khiên tại Xưởng Lương Thị',
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Quảng Tông Quân Doanh (Guangzong Camp): Forward Frontline Encampment
   * Host: Lu Zhi (NPC-0012)
   */
  private generateMilitaryCampChoices(
    liquidCash: number,
    fatigue: number,
    grainQty: number,
    shieldQty: number,
    gameDate: string
  ): ContextualChoice[] {
    const hasGrainToSupply = grainQty >= 5;
    const grainPrice = this.sellPrice('COM-GRAIN');

    return [
      // Pillar 1: Kizuna Social (Lu Zhi)
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '策',
        title: 'Yết kiến Trung Lang Tướng Lư Thực, thỉnh giáo trận đồ vây hãm Quảng Tông',
        titleEn: 'Audience with General Lu Zhi, seeking counsel on Guangzong siege tactics',
        desc: 'Thỉnh giáo sách lược trận đồ • Tăng Hảo cảm Ân sư Lư Thực • Tăng EXP Quân Sự',
        descEn: 'Consult on siege doctrine • Boost Mentor Lu Zhi Affinity • Gain Military EXP',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0012',
          npc_name: 'Lư Thực (Tử Cán)',
          action_type: 'LEARN_MENTOR',
          prompt: 'Thỉnh giáo tướng quân Lư Thực về phương lược phá trận giặc Khăn Vàng'
        }
      },
      // Pillar 2: Facility Operation (Supply Rations or Collect Bounty)
      hasGrainToSupply ? {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '農',
        title: 'Tiếp tế 5 Thạch Lương tiểu mạch cho Quân Nhu Cục Bắc Quân',
        titleEn: 'Deliver 5 piculs of Wheat Rations to Northern Army Quartermaster',
        desc: `-5 COM-GRAIN • Thu mua quân nhu +${5 * grainPrice} Quan (@${grainPrice} Quan/thạch) • Ghi sổ kép`,
        descEn: `-5 COM-GRAIN • Receive +${5 * grainPrice} quan military procurement (@${grainPrice}/picul)`,
        action: {
          type: 'TRADE_SELL',
          item_code: 'COM-GRAIN',
          quantity: 5,
          unit_price: grainPrice,
          counterparty: 'Quân nhu cục Bắc Quân',
          game_date: gameDate
        }
      } : {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '功',
        title: 'Lĩnh thưởng 2,000 Quan quân công phá giặc từ Bộ Chỉ Huy Bắc Quân',
        titleEn: 'Collect 2,000 quan military meritorious bounty from Northern Command',
        desc: '+2,000 Quan tiền mặt ngân khố • Ghi nhận quân huân vận trù khí giới • Sổ cái bảo toàn',
        descEn: '+2,000 quan treasury bounty • Record quartermaster merits',
        action: {
          type: 'RECORD_BOUNTY',
          amount: 2000,
          counterparty: 'Bắc Quân Tướng Quân Lư Thực',
          memo: 'Thưởng quân công vận trù khí giới phá thành Quảng Tông',
          game_date: gameDate
        }
      },
      // Pillar 3: Opportunity / Incident (Tactical Scheme)
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '圖',
        title: 'Hiến kế hoạch nghi binh vây thành, cắt đứt đường vận lương Trương Giác',
        titleEn: 'Propose siege deception stratagem, severing Zhang Jiao supply lines',
        desc: 'EXP Binh Pháp Kế Mưu +15 (SKL-TAC-STRAT) • Tín nhiệm quân đội tăng cao',
        descEn: 'Stratagem EXP +15 (SKL-TAC-STRAT) • Elevate army standing',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_skill: 'SKL-TAC-STRAT',
          exp_amount: 15,
          fatigue_delta: 8,
          morale_delta: 10,
          memo: 'Hiến kế nghi binh vây thành tại Quảng Tông',
          game_date: gameDate
        }
      },
      // Pillar 4: Personal Growth (Tactical Map Study)
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '謀',
        title: 'Nghiên cứu sa bàn trận địa và bố phòng tiền tuyến trong trướng chỉ huy',
        titleEn: 'Examine frontline sand-table terrain and defenses inside command tent',
        desc: 'EXP Binh Pháp Mưu Lược +10 • Sĩ khí +5 • Tiêu hao 8 Thể lực',
        descEn: 'Gain Tactical EXP +10 • Morale +5 • Costs 8 Fatigue',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_skill: 'SKL-TAC-STRAT',
          exp_amount: 10,
          fatigue_delta: 8,
          morale_delta: 5,
          memo: 'Nghiên cứu sa bàn quân sự tại Quảng Tông',
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Pingyuan Town (Bình Nguyên Trọng Trấn)
   */
  private generatePingyuanChoices(liquidCash: number, fatigue: number, grainQty: number, shieldQty: number, gameDate: string): ContextualChoice[] {
    const shieldPrice = this.sellPrice('PROD-SHIELD-BAM');
    const grainPrice = this.buyPrice('COM-GRAIN');
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '府',
        title: 'Yết kiến Huyện Thừa Bình Nguyên Vương Triệt, bàn việc ổn định biên cảnh',
        titleEn: 'Audience with Pingyuan Magistrate Wang Che, discussing border stability',
        desc: 'Vận động chính trị quan phương • Mở rộng mạng lưới quan hệ',
        descEn: 'Engage local bureaucratic leaders • Elevate political standing',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0008',
          npc_name: 'Vương Triệt (Huyện Thừa)',
          action_type: 'TEA_CONVERSE',
          prompt: 'Bàn thảo cùng Huyện Thừa Bình Nguyên về an ninh giao thương biên cảnh'
        }
      },
      {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '甲',
        title: `Cung cấp 5 Khiên Trúc Lương Gia cho Dân Binh Xã Tắc (Thu ${5 * shieldPrice} Quan)`,
        titleEn: `Supply 5 Liang Family Bamboo Shields to local militia (Earn ${5 * shieldPrice} quan)`,
        desc: `-5 PROD-SHIELD-BAM • +${5 * shieldPrice} Quan ngân khố huyện phủ (@${shieldPrice} Quan/khiên)`,
        descEn: `-5 PROD-SHIELD-BAM • +${5 * shieldPrice} quan procurement cash`,
        action: {
          type: 'TRADE_SELL',
          item_code: 'PROD-SHIELD-BAM',
          quantity: 5,
          unit_price: shieldPrice,
          counterparty: 'Quan phủ Huyện Bình Nguyên',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '農',
        title: `Thu mua lương thảo ngô khoai Thanh Châu tiếp tế (Chi ${4 * grainPrice} Quan)`,
        titleEn: `Procure Qingzhou grain supplies (Cost ${4 * grainPrice} quan)`,
        desc: `+4 COM-GRAIN • Chi ${4 * grainPrice} Quan (@${grainPrice} Quan/thạch) • Bổ sung quân nhu viễn chinh`,
        descEn: `+4 COM-GRAIN • Cost ${4 * grainPrice} quan (@${grainPrice}/picul)`,
        disabled: liquidCash < 4 * grainPrice,
        disabledReasonVi: `Không đủ ${4 * grainPrice} Quan (Hiện có ${liquidCash})`,
        disabledReasonEn: `Insufficient funds (Have ${liquidCash} quan)`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'COM-GRAIN',
          quantity: 4,
          unit_price: grainPrice,
          counterparty: 'Thương hội Thanh Châu',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '策',
        title: 'Khảo sát dịch trạm và thiết kế phương án phong hỏa đài liên hoàn',
        titleEn: 'Inspect relay stations and design beacon tower defense network',
        desc: 'EXP Chính Trị & Binh Pháp +15 • Tăng tầm ảnh hưởng quản trị địa phương',
        descEn: 'Governance & Tactics EXP +15',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_amount: 15,
          fatigue_delta: 8,
          morale_delta: 5,
          memo: 'Khảo sát hệ thống dịch trạm Bình Nguyên',
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Xuchang General's Headquarters (Hứa Xương Tướng Phủ)
   * Host: Cao Cao (NPC-0009 / NPC-0061)
   */
  private generateXuchangChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    const horsePrice = this.buyPrice('COM-HORSE-W');
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '獵',
        title: 'Cùng Tào Tháo đối ẩm, luận đàm anh hùng thiên hạ và sách lược dẹp loạn',
        titleEn: 'Drink with Cao Cao, discussing heroes of the realm and pacification strategies',
        desc: 'Đàm đạo mưu lược thế cuộc • Tăng Hảo cảm Tào Tháo • Khí chất kiêu hùng',
        descEn: 'Discuss statecraft and grand strategy • Boost Cao Cao Affinity',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0009',
          npc_name: 'Tào Tháo (Mạnh Đức)',
          action_type: 'BANQUET_DRINK',
          prompt: 'Uống rượu luận anh hùng cùng Kỵ Đô Úy Tào Tháo'
        }
      },
      {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '馬',
        title: `Thu mua 2 Chiến mã Dĩnh Xuyên trang bị cho đội kỵ binh (Chi ${2 * horsePrice} Quan)`,
        titleEn: `Procure 2 Yingchuan Warhorses for cavalry squad (Cost ${2 * horsePrice} quan)`,
        desc: `Tăng cường sức mạnh cơ động hành quân • Chi ${2 * horsePrice} Quan ngân khố`,
        descEn: `Enhance expedition movement speed • Cost ${2 * horsePrice} quan`,
        disabled: liquidCash < 2 * horsePrice,
        disabledReasonVi: `Không đủ ${2 * horsePrice} Quan (Hiện có ${liquidCash})`,
        disabledReasonEn: `Insufficient funds (Have ${liquidCash} quan)`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'COM-HORSE-W',
          quantity: 2,
          unit_price: horsePrice,
          counterparty: 'Doanh trại Kỵ Đô Úy Tào Tháo',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '策',
        title: 'Hiến kế hoạch đồn điền tích cốc: Biến đất hoang thành vựa lúa quân doanh',
        titleEn: 'Propose agro-military colonisation scheme: Turn wasteland into garrison granary',
        desc: 'EXP Quản trị Doanh nghiệp & Chính trị +20 • Tào Tháo hết lời khen ngợi',
        descEn: 'Management & Politics EXP +20',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_skill: 'SKL-MGT-ENTERPRISE',
          exp_amount: 20,
          fatigue_delta: 8,
          morale_delta: 10,
          memo: 'Hiến kế đồn điền nông nghiệp tại Hứa Xương',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '武',
        title: 'Quan sát diễn võ trường Tào quân, học tập kỷ luật hành quân thiết giáp',
        titleEn: 'Observe Cao Army drill grounds, studying armored drill disciplines',
        desc: 'EXP Binh Pháp +10 • Sĩ khí +5 • Tiêu hao 8 Thể lực',
        descEn: 'Gain Tactics EXP +10 • Morale +5',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'TRAIN_MARTIAL',
          exp_amount: 10,
          fatigue_delta: 8,
          morale_delta: 5,
          memo: 'Quan sát thao diễn quân đội tại Hứa Xương',
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Imperial Capital Luoyang (Kinh Đô Lạc Dương)
   * Host: He Jin (NPC-0010) / Imperial Court
   */
  private generateLuoyangChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    const licensePrice = this.buyPrice('LIC-LUOYANG');
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '王',
        title: 'Yết kiến Đại Tướng Quân Hà Tiến, trình tấu công trạng vận trù tiền tuyến',
        titleEn: 'Audience with General-in-Chief He Jin, reporting frontline quartermaster achievements',
        desc: 'Giao tế sĩ phu kinh kỳ • Nâng cao danh vọng triều đình • Mở rộng địa vị sĩ tộc',
        descEn: 'Audience with imperial nobility • Elevate imperial court standing',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0010',
          npc_name: 'Hà Tiến (Đại Tướng Quân)',
          action_type: 'TEA_CONVERSE',
          prompt: 'Yết kiến Đại Tướng Quân Hà Tiến, trình bày quân công tiếp tế'
        }
      },
      {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '功',
        title: 'Nhận sắc phong Quân Nhu Tán Quan & Thưởng 2,500 Quan từ Triều Đình',
        titleEn: 'Accept Imperial honorary title & 2,500 quan bounty from Imperial Court',
        desc: '+2,500 Quan tiền mặt ngân khố triều đình • Tăng danh vọng sĩ phu Lạc Dương',
        descEn: '+2,500 quan treasury disbursement • Boost imperial renown',
        action: {
          type: 'RECORD_BOUNTY',
          amount: 2500,
          counterparty: 'Đại Tướng Quân Phủ Lạc Dương',
          memo: 'Ban thưởng công huân vận trù quân lương bình Khăn Vàng',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '府',
        title: `Đăng ký môn bài chi nhánh Lương Gia Thương Hội tại Kinh Sư (Chi ${licensePrice} Quan)`,
        titleEn: `Register Liang Merchant Guild capital branch license (Cost ${licensePrice} quan)`,
        desc: 'Mở phân hiệu giao thương kinh đô • Tăng tiềm năng thương vụ đường dài',
        descEn: 'Establish imperial trade presence • Expand long-distance commerce',
        disabled: liquidCash < licensePrice,
        disabledReasonVi: `Không đủ ${licensePrice} Quan môn bài (Hiện có ${liquidCash})`,
        disabledReasonEn: `Insufficient funds for license (Have ${liquidCash} quan)`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'LIC-LUOYANG',
          quantity: 1,
          unit_price: licensePrice,
          counterparty: 'Thị lệnh nha môn Lạc Dương',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '書',
        title: 'Thăm viếng Thái Học Viện Lạc Dương, đàm đạo kinh điển cùng danh sĩ',
        titleEn: 'Visit Luoyang Imperial Academy, conferring on classics with eminent scholars',
        desc: 'EXP Chính Trị & Binh Pháp +20 • Mở rộng nhãn quan chính trị triều đình',
        descEn: 'Politics & Philosophy EXP +20',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_amount: 20,
          fatigue_delta: 8,
          morale_delta: 10,
          memo: 'Đàm đạo tại Thái Học Viện Lạc Dương',
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Beiping General's Headquarters (Bắc Bình Soái Phủ)
   * Host: Gongsun Zan (NPC-0060)
   */
  private generateBeipingChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    const shieldPrice = this.sellPrice('PROD-SHIELD-BAM');
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '馬',
        title: 'Yết kiến Bạch Mã Tướng Quân Công Tôn Toản, đàm luận chiến thuật Bạch Mã Nghĩa Tòng',
        titleEn: 'Audience with White Horse General Gongsun Zan, discussing White Horse Cavalry tactics',
        desc: 'Bàn thảo phòng tuyến thảo nguyên • Tăng Hảo cảm Công Tôn Toản • Nhuệ khí biên ải',
        descEn: 'Confer on frontier defense lines • Boost Gongsun Zan Affinity',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0060',
          npc_name: 'Công Tôn Toản (Bá Khuê)',
          action_type: 'SPAR_DEBATE',
          prompt: 'Đàm đạo chiến thuật kỵ xạ thảo nguyên cùng Công Tôn Toản'
        }
      },
      {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '甲',
        title: `Giao dịch 8 Khiên Trúc Bọc Da cho Đội Quân Biên Cảnh (Thu ${8 * shieldPrice} Quan)`,
        titleEn: `Trade 8 Leather-Faced Bamboo Shields to Border Legion (Earn ${8 * shieldPrice} quan)`,
        desc: `-8 PROD-SHIELD-BAM • +${8 * shieldPrice} Quan ngân khố Bắc Bình (@${shieldPrice} Quan/khiên)`,
        descEn: `-8 PROD-SHIELD-BAM • +${8 * shieldPrice} quan procurement revenue`,
        action: {
          type: 'TRADE_SELL',
          item_code: 'PROD-SHIELD-BAM',
          quantity: 8,
          unit_price: shieldPrice,
          counterparty: 'Bắc Bình Quân Nhu Khố',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '弓',
        title: 'Tài trợ 1,000 Quan hỗ trợ huấn luyện đội kỵ xạ phòng ngự bộ lạc Ô Hoàn',
        titleEn: 'Sponsor 1,000 quan to support cavalry archer training against Wuhuan raiders',
        desc: 'Tăng uy danh toàn cõi U Châu • Nhận được sự kính trọng của tướng sĩ biên ải',
        descEn: 'Boost northern frontier prestige',
        disabled: liquidCash < 1000,
        disabledReasonVi: `Không đủ 1,000 Quan tài trợ (Hiện có ${liquidCash})`,
        disabledReasonEn: `Insufficient funds (Have ${liquidCash} quan)`,
        action: {
          type: 'REWARD_NPC',
          npc_id: 'NPC-0060',
          amount: 1000,
          counterparty: 'Bắc Bình Biên Quân',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '馬',
        title: 'Luyện tập Kỵ Xạ trên thảo nguyên tuyết trắng ngoại thành Bắc Bình',
        titleEn: 'Practice Horseback Archery drills on snowy steppes outside Beiping',
        desc: 'EXP Kỵ Xạ & Võ Nghệ +15 • Sĩ khí +10 • Tiêu hao 12 Thể lực',
        descEn: 'Gain Archery & Martial EXP +15 • Morale +10 • Costs 12 Fatigue',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'TRAIN_MARTIAL',
          exp_amount: 15,
          fatigue_delta: 12,
          morale_delta: 10,
          memo: 'Luyện tập kỵ xạ tại Bắc Bình',
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Generic Procedural Generator for other commanderies / castles
   */
  private generateGenericChoices(
    subLocation: string,
    liquidCash: number,
    fatigue: number,
    gameDate: string
  ): ContextualChoice[] {
    const grainPrice = this.buyPrice('COM-GRAIN');
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '茶',
        title: `Thăm hỏi hào kiệt và danh sĩ địa phương tại ${subLocation}`,
        titleEn: `Visit local champions and scholars in ${subLocation}`,
        desc: 'Kết giao danh sĩ • Nâng cao thiện cảm và danh vọng địa phương',
        descEn: 'Befriend local luminaries • Boost local goodwill and prestige',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0002',
          npc_name: 'Hào Kiệt Bản Địa',
          action_type: 'TEA_CONVERSE',
          prompt: `Giao lưu đàm đạo thế cuộc tại ${subLocation}`
        }
      },
      {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '商',
        title: `Khảo sát hoạt động kinh thương và nguồn cung sản vật tại ${subLocation}`,
        titleEn: `Inspect commerce and regional goods supply in ${subLocation}`,
        desc: 'Giao thương định mức • Cân đối sổ cái kép SimCore',
        descEn: 'Standard commerce operations • Preserves ledger balance',
        action: {
          type: 'TRADE_BUY',
          item_code: 'COM-GRAIN',
          quantity: 2,
          unit_price: grainPrice,
          counterparty: `Thương cục ${subLocation}`,
          game_date: gameDate
        }
      },
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '策',
        title: `Tìm hiểu tình hình an ninh và phong thổ nhân tình tại ${subLocation}`,
        titleEn: `Investigate regional security and local customs in ${subLocation}`,
        desc: 'Tăng hiểu biết địa phương • Mở khóa cơ hội thương vụ mới',
        descEn: 'Gain regional knowledge • Unlock commercial opportunities',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_amount: 10,
          fatigue_delta: 5,
          morale_delta: 5,
          memo: `Khảo sát địa bàn ${subLocation}`,
          game_date: gameDate
        }
      },
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '修',
        title: `Tĩnh tâm tu dưỡng và rèn luyện kỹ năng tại lữ quán ${subLocation}`,
        titleEn: `Meditate and cultivate core skills at local inn in ${subLocation}`,
        desc: 'Sĩ khí +10 • Giảm bớt mỏi mệt • Chuẩn bị cho hành trình tiếp theo',
        descEn: 'Morale +10 • Reduce fatigue • Prepare for next expedition',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'REST_RECOVERY',
          fatigue_delta: 25,
          morale_delta: 10,
          memo: `Tĩnh dưỡng tại ${subLocation}`,
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Yecheng Grand Estate (Nghiệp Thành Đại Phủ)
   * Host: Yuan Shao (NPC-0018)
   */
  private generateYechengChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    const matPrice = this.sellPrice('PROD-MAT');
    const grainPrice = this.buyPrice('COM-GRAIN');
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '王',
        title: 'Yết kiến Ký Châu Mục Viên Thiệu, đàm luận danh vọng Tứ Thế Tam Công',
        titleEn: 'Audience with Lord Yuan Shao, discussing Four Generations of Ducal glory',
        desc: 'Giao hảo thế gia Ký Châu • Tăng Hảo cảm Viên Thiệu • Gia thế hiển hách',
        descEn: 'Foster ties with Jizhou nobility • Boost Yuan Shao Affinity',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0018',
          npc_name: 'Viên Thiệu (Bản Sơ)',
          action_type: 'TEA_CONVERSE',
          prompt: 'Yết kiến Ký Châu Mục Viên Thiệu tại đại phủ Nghiệp Thành'
        }
      },
      {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '工',
        title: 'Xuất bán 15 Tấm Chiếu Trúc Lương Gia cho các danh gia vọng tộc Nghiệp Thành',
        titleEn: 'Sell 15 Liang Bamboo Mats to prominent Jizhou patrician clans',
        desc: `-15 PROD-MAT • Thu về +${15 * matPrice} Quan tiền mặt (@${matPrice} Quan/tấm) • Ghi sổ kép`,
        descEn: `-15 PROD-MAT • Receive +${15 * matPrice} quan (@${matPrice}/ea)`,
        action: {
          type: 'TRADE_SELL',
          item_code: 'PROD-MAT',
          quantity: 15,
          unit_price: matPrice,
          counterparty: 'Vọng tộc Nghiệp Thành',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '農',
        title: `Thu mua 10 Thạch Lương Ký Châu giá sỉ dự trữ chiến lược (Chi ${10 * grainPrice} Quan)`,
        titleEn: `Procure 10 piculs of Jizhou strategic grain reserve (Cost ${10 * grainPrice} quan)`,
        desc: `+10 COM-GRAIN • Giá thị trường ${grainPrice} Quan/thạch • Tích trữ lương thảo`,
        descEn: `+10 COM-GRAIN • Market price ${grainPrice} quan/picul`,
        disabled: liquidCash < 10 * grainPrice,
        disabledReasonVi: `Không đủ ${10 * grainPrice} Quan (Hiện có ${liquidCash})`,
        disabledReasonEn: `Insufficient funds (Have ${liquidCash} quan)`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'COM-GRAIN',
          quantity: 10,
          unit_price: grainPrice,
          counterparty: 'Lương thương Ký Châu',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '策',
        title: 'Nghiên cứu gia phả và mạng lưới liên minh sĩ tộc thế gia Hà Bắc',
        titleEn: 'Study patrician genealogies and gentry alliance networks of Hebei',
        desc: 'EXP Chính Trị & Binh Pháp +15 • Tăng hiểu biết về thế lực chư hầu',
        descEn: 'Politics & Stratagem EXP +15',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_amount: 15,
          fatigue_delta: 8,
          morale_delta: 5,
          memo: 'Nghiên cứu mạng lưới sĩ tộc tại Nghiệp Thành',
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Xiapi Fortress (Hạ Phì Thành Lũy)
   * Host: Lu Bu (NPC-0057) / Chen Gong (NPC-0058)
   */
  private generateXiapiChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    const shieldPrice = this.sellPrice('PROD-SHIELD-BAM');
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '雷',
        title: 'Yết kiến Ôn Hầu Lữ Bố, thỉnh giáo thuật kích pháp Phương Thiên Họa Kích',
        titleEn: 'Audience with Marquis Lu Bu, seeking counsel on Halberd martial mastery',
        desc: 'Đàm đạo võ dũng sa trường • Tăng Hảo cảm Lữ Bố • Khí phách Chiến Thần',
        descEn: 'Converse on battlefield martial prowess • Boost Lu Bu Affinity',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0057',
          npc_name: 'Lữ Bố (Phụng Tiên)',
          action_type: 'SPAR_DEBATE',
          prompt: 'Thỉnh giáo kích pháp và cung thuật cự ly xa cùng Lữ Bố'
        }
      },
      {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '甲',
        title: `Cung cấp 10 Khiên Trúc Bọc Da cho Thiết Kỵ Binh Từ Châu (Thu ${10 * shieldPrice} Quan)`,
        titleEn: `Supply 10 Leather-Faced Bamboo Shields to Xuzhou Cavalry (Earn ${10 * shieldPrice} quan)`,
        desc: `-10 PROD-SHIELD-BAM • +${10 * shieldPrice} Quan quân phí Hạ Phì (@${shieldPrice} Quan/khiên)`,
        descEn: `-10 PROD-SHIELD-BAM • +${10 * shieldPrice} quan revenue`,
        action: {
          type: 'TRADE_SELL',
          item_code: 'PROD-SHIELD-BAM',
          quantity: 10,
          unit_price: shieldPrice,
          counterparty: 'Hạ Phì Quân Khố',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '策',
        title: 'Mật đàm cùng mưu thần Trần Cung phân tích thế cục chư hầu Trung Nguyên',
        titleEn: 'Private counsel with strategist Chen Gong on Central Plains rivalries',
        desc: 'EXP Binh Pháp Kế Mưu +20 • Thấu triệt điểm yếu phòng thủ Từ Châu',
        descEn: 'Stratagem EXP +20',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0058',
          npc_name: 'Trần Cung (Công Đài)',
          action_type: 'TEA_CONVERSE',
          prompt: 'Đàm đạo cùng quân sư Trần Cung về kế hoạch giữ vững Từ Châu'
        }
      },
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '江',
        title: 'Khảo sát địa hình hào lũy sông Nghi Thủy và điểm yếu thủy công Hạ Phì',
        titleEn: 'Inspect Yi River moats and hydraulic engineering vulnerabilities of Xiapi',
        desc: 'EXP Địa Hình & Binh Pháp +15 • Sĩ khí +5 • Tiêu hao 8 Thể lực',
        descEn: 'Terrain & Tactics EXP +15',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_amount: 15,
          fatigue_delta: 8,
          morale_delta: 5,
          memo: 'Khảo sát hào lũy sông Nghi Thủy tại Hạ Phì',
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Chang'an Palace & Stronghold (Trường An Cung Phủ)
   * Host: Dong Zhuo (NPC-0023) / Wang Yun (NPC-0015)
   */
  private generateChanganChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    const leathPrice = this.buyPrice('COM-LEATH');
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '虎',
        title: 'Yết kiến Thái Sư Đổng Trác tại My Ổ, thận trọng ứng đối giữ hòa khí',
        titleEn: 'Audience with Grand Preceptor Dong Zhuo at Mei Citadel, diplomatic tact',
        desc: 'Ứng biến ngoại giao mềm mỏng • Tránh va chạm kiêu hùng Tây Lương • Tăng uy vọng',
        descEn: 'Navigate West Liang court tensions with diplomatic tact',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0023',
          npc_name: 'Đổng Trác (Trọng Dĩnh)',
          action_type: 'TEA_CONVERSE',
          prompt: 'Yết kiến Thái Sư Đổng Trác tại My Ổ trình diện thương gia U Châu'
        }
      },
      {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '錦',
        title: `Thu mua da thú Tây Vực và len dạ Lương Châu giá sỉ (Chi ${10 * leathPrice} Quan)`,
        titleEn: `Procure Western Region pelts and Liangzhou wool in bulk (Cost ${10 * leathPrice} quan)`,
        desc: '+10 COM-LEATH đặc chủng Tây Vực • Bổ sung nguyên liệu chế tạo cao cấp',
        descEn: '+10 COM-LEATH exotic pelts • High-tier craft materials',
        disabled: liquidCash < 10 * leathPrice,
        disabledReasonVi: `Không đủ ${10 * leathPrice} Quan (Hiện có ${liquidCash})`,
        disabledReasonEn: `Insufficient funds (Have ${liquidCash} quan)`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'COM-LEATH',
          quantity: 10,
          unit_price: leathPrice,
          counterparty: 'Tây Lương Mã Đội',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '策',
        title: 'Mật kiến Tư Đồ Vương Doãn tại tư gia, bàn việc an nguy giang sơn xã tắc',
        titleEn: 'Secret audience with Minister Wang Yun on empire restoration',
        desc: 'EXP Chính Trị Triều Đình +20 • Thiết lập mạng lưới ngầm sĩ phu Hán thất',
        descEn: 'Imperial Politics EXP +20',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0015',
          npc_name: 'Vương Doãn (Tử Sư)',
          action_type: 'TEA_CONVERSE',
          prompt: 'Đàm đạo cơ mật cùng Tư Đồ Vương Doãn tại Trường An'
        }
      },
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '山',
        title: 'Khảo sát hiểm trở Hàm Cốc Quan và thế núi Đồng Quan phòng vệ Quan Trung',
        titleEn: 'Survey rugged terrain of Hangu Pass and Tong Pass defending Guanzhong',
        desc: 'EXP Địa lý Quân sự +15 • Nắm vững yết hầu phòng thủ ngàn dặm',
        descEn: 'Military Geography EXP +15',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_amount: 15,
          fatigue_delta: 8,
          morale_delta: 5,
          memo: 'Khảo sát địa hình hiểm trở Quan Trung tại Trường An',
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Xiangyang Commandery (Tương Dương Châu Phủ)
   * Host: Liu Biao (NPC-0016)
   */
  private generateXiangyangChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    const grainPrice = this.buyPrice('COM-GRAIN');
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '策',
        title: 'Yết kiến Kinh Châu Thứ Sử Lưu Biểu, thưởng ngoạn thư họa đàm đạo điển tịch',
        titleEn: 'Audience with Governor Liu Biao, appreciating calligraphy and classical texts',
        desc: 'Đàm đạo thi phú thế sự • Tăng Hảo cảm Lưu Biểu • Phong thái Bát Tuấn danh sĩ',
        descEn: 'Discuss classical poetry and statecraft • Boost Liu Biao Affinity',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0016',
          npc_name: 'Lưu Biểu (Cảnh Thăng)',
          action_type: 'TEA_CONVERSE',
          prompt: 'Đàm đạo văn chương điển tích cùng Kinh Châu Thứ Sử Lưu Biểu'
        }
      },
      {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '農',
        title: `Thu mua 10 Thạch Lương gạo thơm Hán Thủy dự trữ (Chi ${10 * grainPrice} Quan)`,
        titleEn: `Procure 10 piculs of Han River fragrant rice rations (Cost ${10 * grainPrice} quan)`,
        desc: `+10 COM-GRAIN • Giá thị trường ${grainPrice} Quan/thạch • Lương thảo phì nhiêu Kinh Tương`,
        descEn: `+10 COM-GRAIN • Market price ${grainPrice} quan/picul`,
        disabled: liquidCash < 10 * grainPrice,
        disabledReasonVi: `Không đủ ${10 * grainPrice} Quan (Hiện có ${liquidCash})`,
        disabledReasonEn: `Insufficient funds (Have ${liquidCash} quan)`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'COM-GRAIN',
          quantity: 10,
          unit_price: grainPrice,
          counterparty: 'Nông thương Kinh Châu',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '茶',
        title: 'Thăm viếng Thủy Kính Trang tại Long Trung, dò hỏi tung tích hiền tài ẩn dật',
        titleEn: 'Visit Water Mirror Manor at Longzhong, inquiring on recluse masterminds',
        desc: 'EXP Trinh sát & Nhận diện Nhân tài +20 • Mở rộng manh mối Ngọa Long - Phượng Sồ',
        descEn: 'Talent Recon EXP +20 • Clues on Crouching Dragon & Fledgling Phoenix',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_amount: 20,
          fatigue_delta: 8,
          morale_delta: 10,
          memo: 'Thăm Thủy Kính Trang tại Long Trung Tương Dương',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '書',
        title: 'Đọc sách tại Tương Dương Học Viện, đàm đạo kinh sử cùng các danh sĩ Kinh Tương',
        titleEn: 'Study at Xiangyang Academy, debating history and statecraft with scholars',
        desc: 'EXP Chính Trị & Binh Pháp +15 • Tĩnh tâm trau dồi học thuật',
        descEn: 'Politics & Philosophy EXP +15',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_amount: 15,
          fatigue_delta: 8,
          morale_delta: 5,
          memo: 'Trau dồi học thuật tại Tương Dương Học Viện',
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Naval Stronghold & Fleet Camps (Giang Lăng & Xích Bích Thủy Doanh)
   * Host: Zhou Yu (NPC-0017) / Huang Gai (NPC-0052)
   */
  private generateNavalCampChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    const shieldPrice = this.sellPrice('PROD-SHIELD-BAM');
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '舟',
        title: 'Yết kiến Giang Đông Đại Đô Đốc Chu Du, đàm luận thủy chiến trận đồ & âm nhạc',
        titleEn: 'Audience with Grand Commander Zhou Yu, discussing naval stratagems & music',
        desc: 'Đàm luận âm luật mưu lược • Tăng Hảo cảm Chu Du • Khúc hữu ngộ Chu Lang cố',
        descEn: 'Converse on naval tactics and classical music • Boost Zhou Yu Affinity',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0017',
          npc_name: 'Chu Du (Công Cẩn)',
          action_type: 'TEA_CONVERSE',
          prompt: 'Đàm luận thủy chiến trận pháp và phong thổ Trường Giang cùng Chu Du'
        }
      },
      {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '甲',
        title: `Tiếp tế 10 Khiên Trúc Bọc Da chống tên lửa cho Thủy Sư Giang Đông (Thu ${10 * shieldPrice} Quan)`,
        titleEn: `Supply 10 Fire-resistant Bamboo Shields to Dongwu Navy (Earn ${10 * shieldPrice} quan)`,
        desc: `-10 PROD-SHIELD-BAM • +${10 * shieldPrice} Quan quân nhu thủy trại (@${shieldPrice} Quan/khiên)`,
        descEn: `-10 PROD-SHIELD-BAM • +${10 * shieldPrice} quan revenue`,
        action: {
          type: 'TRADE_SELL',
          item_code: 'PROD-SHIELD-BAM',
          quantity: 10,
          unit_price: shieldPrice,
          counterparty: 'Thủy Sư Quân Nhu Khố',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '火',
        title: 'Khảo sát quy luật gió đông nam và luồng thủy triều Trường Giang chuẩn bị hỏa công',
        titleEn: 'Survey southeast wind patterns and Yangtze tidal currents for fire attacks',
        desc: 'EXP Khí tượng & Thủy chiến +20 • Thấu triệt chiến trường Xích Bích',
        descEn: 'Naval Tactics & Meteorology EXP +20',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_amount: 20,
          fatigue_delta: 8,
          morale_delta: 10,
          memo: 'Khảo sát khí tượng gió nước Trường Giang',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '江',
        title: 'Luyện tập điều khiển thuyền bè và chiến đấu trên sóng nước Trường Giang',
        titleEn: 'Drill in boat navigation and aquatic combat upon turbulent Yangtze waves',
        desc: 'EXP Thủy chiến +15 • Tăng cường thể lực và thăng bằng • Tiêu hao 10 Thể lực',
        descEn: 'Naval Combat EXP +15 • Morale +5 • Costs 10 Fatigue',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'TRAIN_MARTIAL',
          exp_amount: 15,
          fatigue_delta: 10,
          morale_delta: 5,
          memo: 'Luyện tập thủy chiến trên sông Trường Giang',
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Jianye Capital (Kiến Nghiệp Đô Thành)
   * Host: Sun Quan (NPC-0019)
   */
  private generateJianyeChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    const matPrice = this.sellPrice('PROD-MAT');
    const licensePrice = this.buyPrice('LIC-JIANYE');
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '虎',
        title: 'Yết kiến Ngô Chủ Tôn Quyền, đàm luận chính sách an dân và khai khẩn Giang Đông',
        titleEn: 'Audience with Lord Sun Quan, conferring on settlement and Jiangnan development',
        desc: 'Giao hảo hào kiệt Giang Đông • Tăng Hảo cảm Tôn Quyền • Khí phách thiếu niên anh chúa',
        descEn: 'Confer with Jiangnan leaders • Boost Sun Quan Affinity',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0019',
          npc_name: 'Tôn Quyền (Trọng Mưu)',
          action_type: 'TEA_CONVERSE',
          prompt: 'Đàm luận cùng Ngô Chủ Tôn Quyền về định hướng phát triển Giang Nam'
        }
      },
      {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '工',
        title: `Xuất bán 20 Tấm Chiếu Trúc Lương Gia sang thương cảng Giang Nam (Thu ${20 * matPrice} Quan)`,
        titleEn: `Export 20 Liang Bamboo Mats to Jiangnan seaport market (Earn ${20 * matPrice} quan)`,
        desc: `-20 PROD-MAT • +${20 * matPrice} Quan thương cảng (@${matPrice} Quan/tấm) • Ghi sổ kép`,
        descEn: `-20 PROD-MAT • +${20 * matPrice} quan trade revenue`,
        action: {
          type: 'TRADE_SELL',
          item_code: 'PROD-MAT',
          quantity: 20,
          unit_price: matPrice,
          counterparty: 'Thương hội Giang Nam',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '津',
        title: `Đăng ký giấy phép mậu dịch đường biển và khai thác quặng đồng Đan Dương (Chi ${licensePrice} Quan)`,
        titleEn: `Register maritime trade permit & Danyang copper mining license (Cost ${licensePrice} quan)`,
        desc: 'Mở rộng tiềm năng khoáng sản • Tăng uy vọng kinh thương toàn cõi Giang Đông',
        descEn: 'Expand mineral procurement • Boost Wu prestige',
        disabled: liquidCash < licensePrice,
        disabledReasonVi: `Không đủ ${licensePrice} Quan giấy phép (Hiện có ${liquidCash})`,
        disabledReasonEn: `Insufficient funds (Have ${liquidCash} quan)`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'LIC-JIANYE',
          quantity: 1,
          unit_price: licensePrice,
          counterparty: 'Ngô Đô Thị Lệnh',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '城',
        title: 'Khảo sát kiến trúc thành trì và hệ thống âu thuyền chiến lược Kiến Nghiệp',
        titleEn: 'Inspect citadel fortifications and strategic drydocks of Jianye',
        desc: 'EXP Quản trị Đô thị +15 • Nắm vững cấu trúc phòng thủ thủ phủ Giang Đông',
        descEn: 'Urban Governance EXP +15',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_amount: 15,
          fatigue_delta: 8,
          morale_delta: 5,
          memo: 'Khảo sát thành trì Kiến Nghiệp',
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Hanzhong Celestial Master Hold (Hán Trung Thiên Sư Phủ)
   * Host: Zhang Lu (NPC-0020)
   */
  private generateHanzhongChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    const herbPrice = this.buyPrice('COM-HERB');
    const passPrice = this.buyPrice('LIC-JIANGE');
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '道',
        title: 'Yết kiến Thiên Sư Trương Lỗ, đàm đạo giáo lý Ngũ Đấu Mễ Đạo và nghĩa xá từ thiện',
        titleEn: 'Audience with Master Zhang Lu, discussing Five Pecks of Rice doctrines & charity',
        desc: 'Đàm đạo giáo lý thanh tịnh • Tăng Hảo cảm Trương Lỗ • Phong thái đạo gia',
        descEn: 'Discuss Taoist doctrine and welfare • Boost Zhang Lu Affinity',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0020',
          npc_name: 'Trương Lỗ (Công Kỳ)',
          action_type: 'TEA_CONVERSE',
          prompt: 'Đàm luận triết lý đạo giáo và mô hình nghĩa xá an dân cùng Trương Lỗ'
        }
      },
      {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '草',
        title: `Thu mua dược liệu quý núi Tần Lĩnh và quế chi Hán Xuyên (Chi ${8 * herbPrice} Quan)`,
        titleEn: `Procure rare Qinling herbal medicines and Hanzhong cassia (Cost ${8 * herbPrice} quan)`,
        desc: '+8 Dược liệu quý • Bổ sung vật phẩm bồi bổ thể lực và giao thương viễn xứ',
        descEn: '+8 Rare herbs • Medicinal and trade reserves',
        disabled: liquidCash < 8 * herbPrice,
        disabledReasonVi: `Không đủ ${8 * herbPrice} Quan (Hiện có ${liquidCash})`,
        disabledReasonEn: `Insufficient funds (Have ${liquidCash} quan)`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'COM-HERB',
          quantity: 8,
          unit_price: herbPrice,
          counterparty: 'Dược phòng Hán Trung',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '策',
        title: `Đàm phán thông hành lộ bài bảo đảm an toàn qua Kiếm Các vào Ba Thục (Chi ${passPrice} Quan)`,
        titleEn: `Negotiate safe-passage transit pact through Jiange Pass into Shu (Cost ${passPrice} quan)`,
        desc: 'Đảm bảo thương đội di chuyển không bị ngăn trở • Tăng quan hệ với Hán Trung',
        descEn: 'Ensure unimpeded expedition transit into Shu',
        disabled: liquidCash < passPrice,
        disabledReasonVi: `Không đủ ${passPrice} Quan (Hiện có ${liquidCash})`,
        disabledReasonEn: `Insufficient funds (Have ${liquidCash} quan)`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'LIC-JIANGE',
          quantity: 1,
          unit_price: passPrice,
          counterparty: 'Quan ải Hán Trung',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '修',
        title: 'Tĩnh tọa tu tâm tại Đạo Quán núi Dương Lỗ, hồi phục hoàn toàn khí huyết',
        titleEn: 'Meditate and cleanse spirit at Yanglu Mountain Taoist retreat',
        desc: 'Thể lực -35 • Sĩ khí +20 • Tẩy trừ mệt mỏi hành quân hiểm trở',
        descEn: 'Fatigue -35 • Morale +20 • Full recovery',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'REST_RECOVERY',
          fatigue_delta: 35,
          morale_delta: 20,
          memo: 'Tĩnh tọa dưỡng sinh tại Đạo quán Hán Trung',
          game_date: gameDate
        }
      }
    ];
  }

  /**
   * Chengdu Capital (Thành Đô Ích Châu Phủ)
   * Host: Liu Zhang (NPC-0021) / Fa Zheng (NPC-0027)
   */
  private generateChengduChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    const matPrice = this.sellPrice('PROD-MAT');
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '宴',
        title: 'Yết kiến Ích Châu Mục Lưu Chương, tham gia tiệc rượu Thục Đô thưởng thức nhạc vũ',
        titleEn: 'Audience with Governor Liu Zhang, attending grand Chengdu banquet',
        desc: 'Giao hảo tông thất Tây Thục • Tăng Hảo cảm Lưu Chương • Thưởng lãm Ba Thục',
        descEn: 'Attend court feast with Yizhou nobility • Boost Liu Zhang Affinity',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0021',
          npc_name: 'Lưu Chương (Quý Ngọc)',
          action_type: 'BANQUET_DRINK',
          prompt: 'Dự yến tiệc phủ Ích Châu Mục thưởng thức Thục Cẩm và rượu Tây Thục'
        }
      },
      {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '工',
        title: `Xuất bán 20 Tấm Chiếu Trúc Lương Gia sang Chợ Gấm Thành Đô (Thu ${20 * matPrice} Quan)`,
        titleEn: `Export 20 Liang Bamboo Mats to Chengdu Brocade Market (Earn ${20 * matPrice} quan)`,
        desc: `-20 PROD-MAT • +${20 * matPrice} Quan giá thị trường (@${matPrice} Quan/tấm)`,
        descEn: `-20 PROD-MAT • +${20 * matPrice} quan trade revenue`,
        action: {
          type: 'TRADE_SELL',
          item_code: 'PROD-MAT',
          quantity: 20,
          unit_price: matPrice,
          counterparty: 'Thục Cẩm Thương Hội',
          game_date: gameDate
        }
      },
      {
        id: 'OPT_3',
        pillar: 'OPPORTUNITY_INCIDENT',
        pillarLabelVi: 'CƠ HỘI / SỰ VỤ',
        pillarLabelEn: 'LOCAL INCIDENT',
        badgeClass: 'pillar-opportunity',
        icon: '策',
        title: 'Bí mật kết giao cùng kỳ mưu sĩ Pháp Chính, phân tích tiền đồ và cơ hội tại Tây Thục',
        titleEn: 'Secret counsel with mastermind Fa Zheng, analyzing future prospects in Shu',
        desc: 'EXP Binh Pháp Kế Mưu +20 • Mở khóa liên kết mật với mưu sĩ đắc lực',
        descEn: 'Stratagem EXP +20 • Form confidential bond with Fa Zheng',
        action: {
          type: 'KIZUNA_INTERACT',
          npc_id: 'NPC-0027',
          npc_name: 'Pháp Chính (Hiếu Trực)',
          action_type: 'TEA_CONVERSE',
          prompt: 'Mật đàm cùng kỳ mưu sĩ Pháp Chính tại Thành Đô về tương lai Tây Thục'
        }
      },
      {
        id: 'OPT_4',
        pillar: 'PERSONAL_GROWTH',
        pillarLabelVi: 'TU THÂN / BỒI DƯỠNG',
        pillarLabelEn: 'SELF CULTIVATION',
        badgeClass: 'pillar-growth',
        icon: '江',
        title: 'Khảo sát công trình thủy lợi Đô Giang Yển và đất đai trù phú Thiên Phủ Chi Quốc',
        titleEn: 'Inspect Dujiangyan irrigation engineering and Land of Abundance granaries',
        desc: 'EXP Thủy lợi & Quản trị Nông nghiệp +20 • Sĩ khí +10 • Tiêu hao 8 Thể lực',
        descEn: 'Irrigation & Agricultural Management EXP +20',
        action: {
          type: 'PERSONAL_GROWTH',
          sub_type: 'STUDY_TACTICS',
          exp_amount: 20,
          fatigue_delta: 8,
          morale_delta: 10,
          memo: 'Khảo sát thủy lợi Đô Giang Yển tại Thành Đô',
          game_date: gameDate
        }
      }
    ];
  }
}
