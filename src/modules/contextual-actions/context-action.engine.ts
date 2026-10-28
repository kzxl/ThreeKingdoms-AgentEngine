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
    const buyLeathBatch = liquidCash >= 800 ? 8 : (liquidCash >= 400 ? 4 : (liquidCash >= 100 ? 1 : 0));
    const buyLeathCost = buyLeathBatch * 100;
    const canBuyLeath = buyLeathBatch > 0;

    return [
      // Pillar 1: Kizuna Social (Zhang Fei)
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '🍶',
        title: 'Cùng Trương Phi nâng chén Trác Thành Trán Nương, đàm luận anh hùng',
        titleEn: 'Feast and drink Zhuocheng wine with Zhang Fei, discussing heroes',
        desc: 'Đổ D20 [WAR/CHA Check] • Tăng Hảo cảm & Kính trọng Trương Phi • Mở khóa Sương mù',
        descEn: 'Roll D20 [WAR/CHA Check] • Boost Zhang Fei Affinity & Respect • Dispel Fog',
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
        icon: '🥩',
        title: canBuyLeath
          ? `Thu mua ${buyLeathBatch} Tấm Da Trâu lò mổ Trác Huyện (Chi ${buyLeathCost} Tiền)`
          : 'Thu mua da trâu lò mổ Trác Huyện (Cạn vốn lưu động)',
        titleEn: canBuyLeath
          ? `Procure ${buyLeathBatch} Ox Leather hides from slaughterhouse (Cost ${buyLeathCost} Qian)`
          : 'Procure Ox Leather hides (Insufficient Liquid Cash)',
        desc: canBuyLeath
          ? `+${buyLeathBatch} COM-LEATH vào kho xưởng • Giá sỉ ưu đãi 100 Tiền/tấm • Sổ cái bảo toàn`
          : `Cần tối thiểu 100 Tiền mặt • Hiện có ${liquidCash} Tiền`,
        descEn: canBuyLeath
          ? `+${buyLeathBatch} COM-LEATH to workshop warehouse • Invariant ledger preserved`
          : `Requires at least 100 Qian • Currently have ${liquidCash} Qian`,
        disabled: !canBuyLeath,
        disabledReasonVi: `Ngân khố không đủ: Cần tối thiểu 100 Tiền (Hiện có ${liquidCash} Tiền)`,
        disabledReasonEn: `Insufficient cash: Need at least 100 Qian (Available: ${liquidCash})`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'COM-LEATH',
          quantity: buyLeathBatch || 1,
          unit_price: 100,
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
        icon: '🐎',
        title: 'Bàn thảo kế hoạch chuẩn bị quân bị & tuyển mộ nghĩa dũng Huyện Trác',
        titleEn: 'Confer on militia armaments and volunteer recruitment in Zhuo County',
        desc: 'Hội ý cùng Lưu Bị & Trương Phi • Đổ D20 [LDR/INT Check] • Xây dựng danh vọng địa phương',
        descEn: 'Confer with Liu Bei & Zhang Fei • Roll D20 [LDR/INT Check] • Build regional prestige',
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
        icon: '🛏️',
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
        icon: '⚔️',
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
        icon: '🎋',
        title: `Xuất bán ${sellMatBatch} Tấm Chiếu Trúc Lương Gia cho Thương đoàn Ký Châu`,
        titleEn: `Sell ${sellMatBatch} Liang Family Bamboo Mats to Jizhou Merchants`,
        desc: `-${sellMatBatch} PROD-MAT • Thu về +${sellMatBatch * 80} Tiền mặt lưu động (@80 Tiền/tấm) • COM Check DC 35`,
        descEn: `-${sellMatBatch} PROD-MAT • Receive +${sellMatBatch * 80} Qian (@80 Qian/ea) • Double-entry balanced`,
        action: {
          type: 'TRADE_SELL',
          item_code: 'PROD-MAT',
          quantity: sellMatBatch,
          unit_price: 80,
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
        icon: '🧂',
        title: `Xuất bán ${sellSaltBatch} Đấu Muối Biển cho tiệm buôn Đông Môn`,
        titleEn: `Sell ${sellSaltBatch} Dou of Sea Salt to East Market Merchant`,
        desc: `-${sellSaltBatch} COM-SALT • Thu về +${sellSaltBatch * 85} Tiền mặt (@85 Tiền/đấu)`,
        descEn: `-${sellSaltBatch} COM-SALT • Receive +${sellSaltBatch * 85} Qian (@85 Qian/ea)`,
        action: {
          type: 'TRADE_SELL',
          item_code: 'COM-SALT',
          quantity: sellSaltBatch,
          unit_price: 85,
          counterparty: 'Thương nhân Ký Châu',
          game_date: gameDate
        }
      };
    } else {
      // Procure grain if funds allow
      const grainBatch = liquidCash >= 800 ? 5 : (liquidCash >= 320 ? 2 : 1);
      const grainCost = grainBatch * 160;
      const canBuyGrain = liquidCash >= 160;
      facilityChoice = {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '🌾',
        title: canBuyGrain
          ? `Thu mua ${grainBatch} Thạch Lương tiểu mạch dự trữ (Chi ${grainCost} Tiền)`
          : 'Thu mua lương thảo dự trữ (Cạn vốn lưu động)',
        titleEn: canBuyGrain
          ? `Procure ${grainBatch} Dan of Wheat Rations (Cost ${grainCost} Qian)`
          : 'Procure Wheat Rations (Insufficient Cash)',
        desc: canBuyGrain
          ? `+${grainBatch} COM-GRAIN • Giá chuẩn 160 Tiền/thạch • Bảo đảm an ninh lương thực`
          : `Cần tối thiểu 160 Tiền • Hiện có ${liquidCash} Tiền`,
        descEn: canBuyGrain
          ? `+${grainBatch} COM-GRAIN • Unit price 160 Qian/dan`
          : `Requires 160 Qian • Available: ${liquidCash} Qian`,
        disabled: !canBuyGrain,
        disabledReasonVi: `Ngân khố không đủ: Cần tối thiểu 160 Tiền (Hiện có ${liquidCash} Tiền)`,
        disabledReasonEn: `Insufficient cash: Need at least 160 Qian (Available: ${liquidCash})`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'COM-GRAIN',
          quantity: grainBatch,
          unit_price: 160,
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
        icon: '🍵',
        title: 'Mời Quan Vũ dùng trà thơm, đàm luận Binh Pháp Tôn Tử & Xuân Thu',
        titleEn: 'Invite Guan Yu for tea, discussing Sun Tzu Art of War & Spring Autumn Annals',
        desc: 'Đổ D20 [INT/POL Check] • Hảo cảm Quan Vũ +5 • Tăng Kính trọng Mưu lược',
        descEn: 'Roll D20 [INT/POL Check] • Guan Yu Affinity +5 • Deepen Martial Respect',
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
        icon: '📜',
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
        icon: '🚶',
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
        icon: '🛡️',
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
        icon: '🎋',
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
        icon: '⚠️',
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
        icon: '🪓',
        title: 'Thảo luận cùng Thợ Cả Trần Bảo về quy chuẩn kỹ thuật giáp khiên',
        titleEn: 'Consult Master Craftsman Chen Bao on shield armor technical specs',
        desc: 'Đổ D20 [CRA/INT Check] • Kính trọng +5 • Tăng EXP Kỹ nghệ Chế tác Khí giới',
        descEn: 'Roll D20 [CRA/INT Check] • Respect +5 • Boost Artisan Crafting EXP',
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
        icon: '🎁',
        title: 'Trích thưởng 100 Tiền két an toàn động viên sĩ khí thợ xưởng Lương Gia',
        titleEn: 'Disburse 100 Qian safe-cash incentive to boost artisan workforce morale',
        desc: 'Sĩ khí thợ xưởng 100% • Trung thành Trần Bảo +2 • Chi 100 Tiền sổ cái kép',
        descEn: 'Workforce Morale 100% • Loyalty +2 • Disburse 100 Qian ledger expense',
        disabled: liquidCash < 100,
        disabledReasonVi: `Két an toàn không đủ 100 Tiền (Hiện có ${liquidCash} Tiền)`,
        disabledReasonEn: `Insufficient cash for bonus (Have ${liquidCash} Qian)`,
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
        icon: '🎋',
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

    return [
      // Pillar 1: Kizuna Social (Lu Zhi)
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '📜',
        title: 'Yết kiến Trung Lang Tướng Lư Thực, thỉnh giáo trận đồ vây hãm Quảng Tông',
        titleEn: 'Audience with General Lu Zhi, seeking counsel on Guangzong siege tactics',
        desc: 'Đổ D20 [INT/LDR Check] • Hảo cảm Ân sư Lư Thực +5 • Tăng EXP Quân Sự',
        descEn: 'Roll D20 [INT/LDR Check] • Mentor Lu Zhi Affinity +5 • Boost Military EXP',
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
        icon: '🌾',
        title: 'Tiếp tế 5 Thạch Lương tiểu mạch cho Quân Nhu Cục Bắc Quân',
        titleEn: 'Deliver 5 Dan of Wheat Rations to Northern Army Quartermaster',
        desc: '-5 COM-GRAIN • Thu mua quân nhu giá cao +900 Tiền (@180 Tiền/thạch) • Ghi sổ kép',
        descEn: '-5 COM-GRAIN • Receive +900 Qian military procurement (@180/dan)',
        action: {
          type: 'TRADE_SELL',
          item_code: 'COM-GRAIN',
          quantity: 5,
          unit_price: 180,
          counterparty: 'Quân nhu cục Bắc Quân',
          game_date: gameDate
        }
      } : {
        id: 'OPT_2',
        pillar: 'FACILITY_OPERATION',
        pillarLabelVi: 'CHUYÊN MÔN CƠ SỞ',
        pillarLabelEn: 'FACILITY OPERATION',
        badgeClass: 'pillar-facility',
        icon: '🎖️',
        title: 'Lĩnh thưởng 2,000 Tiền quân công phá giặc từ Bộ Chỉ Huy Bắc Quân',
        titleEn: 'Collect 2,000 Qian military meritorious bounty from Northern Command',
        desc: '+2,000 Tiền mặt ngân khố • Ghi nhận quân huân vận trù khí giới • Sổ cái bảo toàn',
        descEn: '+2,000 Qian treasury bounty • Record quartermaster merits',
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
        icon: '🗺️',
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
        icon: '♟️',
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
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '🏛️',
        title: 'Yết kiến Huyện Thừa Bình Nguyên Vương Triệt, bàn việc ổn định biên cảnh',
        titleEn: 'Audience with Pingyuan Magistrate Wang Che, discussing border stability',
        desc: 'Đổ D20 [POL/DIP Check] • Tăng uy vọng quan phương • Mở rộng mạng lưới',
        descEn: 'Roll D20 [POL/DIP Check] • Elevate bureaucratic standing',
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
        icon: '🛡️',
        title: 'Cung cấp 5 Khiên Trúc Lương Gia cho Dân Binh Xã Tắc (Thu 1,200 Tiền)',
        titleEn: 'Supply 5 Liang Family Bamboo Shields to local militia (Earn 1,200 Qian)',
        desc: '-5 PROD-SHIELD-BAM • +1,200 Tiền ngân khố huyện phủ (@240 Tiền/khiên)',
        descEn: '-5 PROD-SHIELD-BAM • +1,200 Qian procurement cash',
        action: {
          type: 'TRADE_SELL',
          item_code: 'PROD-SHIELD-BAM',
          quantity: 5,
          unit_price: 240,
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
        icon: '🌾',
        title: 'Thu mua lương thảo ngô khoai Thanh Châu tiếp tế (Chi 600 Tiền)',
        titleEn: 'Procure Qingzhou grain supplies (Cost 600 Qian)',
        desc: '+4 COM-GRAIN • Chi 600 Tiền (@150 Tiền/thạch) • Bổ sung quân nhu viễn chinh',
        descEn: '+4 COM-GRAIN • Cost 600 Qian (@150/dan)',
        disabled: liquidCash < 600,
        disabledReasonVi: `Không đủ 600 Tiền (Hiện có ${liquidCash})`,
        disabledReasonEn: `Insufficient funds (Have ${liquidCash} Qian)`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'COM-GRAIN',
          quantity: 4,
          unit_price: 150,
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
        icon: '📜',
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
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '🦅',
        title: 'Cùng Tào Tháo đối ẩm, luận đàm anh hùng thiên hạ và sách lược dẹp loạn',
        titleEn: 'Drink with Cao Cao, discussing heroes of the realm and pacification strategies',
        desc: 'Đổ D20 [INT/POL Check] • Hảo cảm Tào Tháo +5 • Khí chất kiêu hùng',
        descEn: 'Roll D20 [INT/POL Check] • Cao Cao Affinity +5',
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
        icon: '🐎',
        title: 'Thu mua 2 Chiến mã Dĩnh Xuyên trang bị cho đội kỵ binh (Chi 1,200 Tiền)',
        titleEn: 'Procure 2 Yingchuan Warhorses for cavalry squad (Cost 1,200 Qian)',
        desc: 'Tăng cường sức mạnh cơ động hành quân • Chi 1,200 Tiền ngân khố',
        descEn: 'Enhance expedition movement speed • Cost 1,200 Qian',
        disabled: liquidCash < 1200,
        disabledReasonVi: `Không đủ 1,200 Tiền (Hiện có ${liquidCash})`,
        disabledReasonEn: `Insufficient funds (Have ${liquidCash} Qian)`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'COM-HORSE',
          quantity: 2,
          unit_price: 600,
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
        icon: '📜',
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
        icon: '⚔️',
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
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '👑',
        title: 'Yết kiến Đại Tướng Quân Hà Tiến, trình tấu công trạng vận trù tiền tuyến',
        titleEn: 'Audience with General-in-Chief He Jin, reporting frontline quartermaster achievements',
        desc: 'Đổ D20 [DIP/POL Check] • Tăng uy vọng triều đình • Mở rộng địa vị sĩ tộc',
        descEn: 'Roll D20 [DIP/POL Check] • Elevate court standing',
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
        icon: '🎖️',
        title: 'Nhận sắc phong Quân Nhu Tán Quan & Thưởng 2,500 Tiền từ Triều Đình',
        titleEn: 'Accept Imperial honorary title & 2,500 Qian bounty from Imperial Court',
        desc: '+2,500 Tiền mặt ngân khố triều đình • Tăng danh vọng sĩ phu Lạc Dương',
        descEn: '+2,500 Qian treasury disbursement • Boost imperial renown',
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
        icon: '🏛️',
        title: 'Đăng ký môn bài chi nhánh Lương Gia Thương Hội tại Kinh Sư (Chi 1,000 Tiền)',
        titleEn: 'Register Liang Merchant Guild capital branch license (Cost 1,000 Qian)',
        desc: 'Mở phân hiệu giao thương kinh đô • Tăng tiềm năng thương vụ đường dài',
        descEn: 'Establish imperial trade presence • Expand long-distance commerce',
        disabled: liquidCash < 1000,
        disabledReasonVi: `Không đủ 1,000 Tiền môn bài (Hiện có ${liquidCash})`,
        disabledReasonEn: `Insufficient funds for license (Have ${liquidCash} Qian)`,
        action: {
          type: 'TRADE_BUY',
          item_code: 'LIC-LUOYANG',
          quantity: 1,
          unit_price: 1000,
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
        icon: '📚',
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
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '🐎',
        title: 'Yết kiến Bạch Mã Tướng Quân Công Tôn Toản, đàm luận chiến thuật Bạch Mã Nghĩa Tòng',
        titleEn: 'Audience with White Horse General Gongsun Zan, discussing White Horse Cavalry tactics',
        desc: 'Đổ D20 [WAR/LDR Check] • Hảo cảm Công Tôn Toản +5 • Khí phách biên ải',
        descEn: 'Roll D20 [WAR/LDR Check] • Gongsun Zan Affinity +5',
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
        icon: '🛡️',
        title: 'Giao dịch 8 Khiên Trúc Bọc Da cho Đội Quân Biên Cảnh (Thu 1,920 Tiền)',
        titleEn: 'Trade 8 Leather-Faced Bamboo Shields to Border Legion (Earn 1,920 Qian)',
        desc: '-8 PROD-SHIELD-BAM • +1,920 Tiền ngân khố Bắc Bình (@240 Tiền/khiên)',
        descEn: '-8 PROD-SHIELD-BAM • +1,920 Qian procurement revenue',
        action: {
          type: 'TRADE_SELL',
          item_code: 'PROD-SHIELD-BAM',
          quantity: 8,
          unit_price: 240,
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
        icon: '🏹',
        title: 'Tài trợ 1,000 Tiền hỗ trợ huấn luyện đội kỵ xạ phòng ngự bộ lạc Ô Hoàn',
        titleEn: 'Sponsor 1,000 Qian to support cavalry archer training against Wuhuan raiders',
        desc: 'Tăng uy danh toàn cõi U Châu • Nhận được sự kính trọng của tướng sĩ biên ải',
        descEn: 'Boost northern frontier prestige',
        disabled: liquidCash < 1000,
        disabledReasonVi: `Không đủ 1,000 Tiền tài trợ (Hiện có ${liquidCash})`,
        disabledReasonEn: `Insufficient funds (Have ${liquidCash} Qian)`,
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
        icon: '🐎',
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
    return [
      {
        id: 'OPT_1',
        pillar: 'KIZUNA_SOCIAL',
        pillarLabelVi: 'XÃ GIAO HÀO KIỆT',
        pillarLabelEn: 'HERO KIZUNA',
        badgeClass: 'pillar-kizuna',
        icon: '🍵',
        title: `Thăm hỏi hào kiệt và danh sĩ địa phương tại ${subLocation}`,
        titleEn: `Visit local champions and scholars in ${subLocation}`,
        desc: 'Đổ D20 [DIP/POL Check] • Tăng hảo cảm hào kiệt địa phương',
        descEn: 'Roll D20 [DIP/POL Check] • Boost local hero affinity',
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
        icon: '⚖️',
        title: `Khảo sát hoạt động kinh thương và nguồn cung sản vật tại ${subLocation}`,
        titleEn: `Inspect commerce and regional goods supply in ${subLocation}`,
        desc: 'Giao thương định mức • Cân đối sổ cái kép SimCore',
        descEn: 'Standard commerce operations • Preserves ledger balance',
        action: {
          type: 'TRADE_BUY',
          item_code: 'COM-GRAIN',
          quantity: 2,
          unit_price: 150,
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
        icon: '📜',
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
        icon: '🧘',
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

  // Placeholder methods for other specific castles:
  private generateYechengChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    return this.generateGenericChoices('Nghiệp Thành Đại Phủ', liquidCash, fatigue, gameDate);
  }
  private generateXiapiChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    return this.generateGenericChoices('Hạ Phì Thành Lũy', liquidCash, fatigue, gameDate);
  }
  private generateChanganChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    return this.generateGenericChoices('Trường An Cung Phủ', liquidCash, fatigue, gameDate);
  }
  private generateXiangyangChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    return this.generateGenericChoices('Tương Dương Châu Phủ', liquidCash, fatigue, gameDate);
  }
  private generateNavalCampChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    return this.generateGenericChoices('Thủy Trại Tiền Tuyến', liquidCash, fatigue, gameDate);
  }
  private generateJianyeChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    return this.generateGenericChoices('Kiến Nghiệp Đô Thành', liquidCash, fatigue, gameDate);
  }
  private generateHanzhongChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    return this.generateGenericChoices('Hán Trung Thiên Sư Phủ', liquidCash, fatigue, gameDate);
  }
  private generateChengduChoices(liquidCash: number, fatigue: number, gameDate: string): ContextualChoice[] {
    return this.generateGenericChoices('Thành Đô Ích Châu Phủ', liquidCash, fatigue, gameDate);
  }
}
