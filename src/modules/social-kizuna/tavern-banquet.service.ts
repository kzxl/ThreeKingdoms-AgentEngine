/**
 * ThreeKingdoms-AgentEngine: Tavern Banquets & Hero Recruitment Service
 * (src/modules/social-kizuna/tavern-banquet.service.ts)
 *
 * Implements R3:
 * - Multi-tier Tavern Banquet Hosting (Tiểu Yến / Tiết Kiệm, Hào Hiệp Yến, Đào Viên Anh Hùng Yến)
 * - Gourmet dishes (FOOD-COOK-BAO, FOOD-COOK-VENISON) & Dukang wine (FOOD-COOK-DUKANG) consumption
 * - Strict Physical Inventory Conservation & Stock Movements balance tracking
 * - Massive Affinity & Respect Acceleration with visiting historical heroes and scholars
 * - Peach Garden Sworn Brotherhood Oath (Affinity >= 80, Tier 5 fog unlock)
 * - Retainer & Commander Recruitment into FAC-LIANG-CLAN (faction_officers)
 *
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { nextId } from '../../shared/id-generator';
import { getGameDate } from '../../shared/game-clock';
import { postCashflowEntry } from '../../shared/ledger';
import { DailyInteractionEngine, FogTier } from './daily-interaction.engine';

export type BanquetTier =
  | 'TIET_KIEM'
  | 'HAO_HIEP'
  | 'DAO_VIEN'
  | 'TIEU_YEN'
  | 'HAO_HIEP_YEN'
  | 'DAO_VIEN_ANH_HUNG_YEN';

export interface BanquetRecipeItem {
  itemCode: string;
  nameVi: string;
  quantity: number;
}

export interface BanquetRecipeCost {
  tier: BanquetTier;
  titleVi: string;
  titleEn: string;
  requiredDishes: BanquetRecipeItem[];
  requiredWine: BanquetRecipeItem[];
  fallbackCashCost: number;
  capacity: number;
  staminaRecovery: number;
  moraleBoost: number;
  affinityBonusMin: number;
  affinityBonusMax: number;
  respectBonusMin: number;
  respectBonusMax: number;
}

export const BANQUET_TIER_CONFIGS: Record<string, BanquetRecipeCost> = {
  TIET_KIEM: {
    tier: 'TIET_KIEM',
    titleVi: 'Tiểu Yến Tri Kỷ',
    titleEn: 'Intimate Confidant Gathering',
    requiredDishes: [
      { itemCode: 'FOOD-COOK-BAO', nameVi: 'Bánh Bao Thịt Trác Huyện', quantity: 1 }
    ],
    requiredWine: [
      { itemCode: 'FOOD-COOK-DUKANG', nameVi: 'Đỗ Khang Mỹ Tửu', quantity: 1 }
    ],
    fallbackCashCost: 95,
    capacity: 2,
    staminaRecovery: 25,
    moraleBoost: 10,
    affinityBonusMin: 12,
    affinityBonusMax: 18,
    respectBonusMin: 6,
    respectBonusMax: 10
  },
  HAO_HIEP: {
    tier: 'HAO_HIEP',
    titleVi: 'Hào Hiệp Yến Khách',
    titleEn: 'Heroes & Scholars Gathering',
    requiredDishes: [
      { itemCode: 'FOOD-COOK-VENISON', nameVi: 'Thịt Rừng Nướng Ngũ Vị', quantity: 2 },
      { itemCode: 'FOOD-COOK-BAO', nameVi: 'Bánh Bao Thịt Trác Huyện', quantity: 2 }
    ],
    requiredWine: [
      { itemCode: 'FOOD-COOK-DUKANG', nameVi: 'Đỗ Khang Mỹ Tửu', quantity: 2 }
    ],
    fallbackCashCost: 320,
    capacity: 4,
    staminaRecovery: 45,
    moraleBoost: 20,
    affinityBonusMin: 20,
    affinityBonusMax: 28,
    respectBonusMin: 12,
    respectBonusMax: 18
  },
  DAO_VIEN: {
    tier: 'DAO_VIEN',
    titleVi: 'Đào Viên Anh Hùng Yến',
    titleEn: 'Peach Orchard Grand Hero Feast',
    requiredDishes: [
      { itemCode: 'FOOD-COOK-VENISON', nameVi: 'Thịt Rừng Nướng Ngũ Vị', quantity: 4 },
      { itemCode: 'FOOD-COOK-BAO', nameVi: 'Bánh Bao Thịt Trác Huyện', quantity: 4 }
    ],
    requiredWine: [
      { itemCode: 'FOOD-COOK-DUKANG', nameVi: 'Đỗ Khang Mỹ Tửu', quantity: 5 }
    ],
    fallbackCashCost: 580,
    capacity: 8,
    staminaRecovery: 70,
    moraleBoost: 35,
    affinityBonusMin: 35,
    affinityBonusMax: 45,
    respectBonusMin: 20,
    respectBonusMax: 30
  }
};

// Aliases for alternate naming conventions
BANQUET_TIER_CONFIGS['TIEU_YEN'] = BANQUET_TIER_CONFIGS['TIET_KIEM'];
BANQUET_TIER_CONFIGS['HAO_HIEP_YEN'] = BANQUET_TIER_CONFIGS['HAO_HIEP'];
BANQUET_TIER_CONFIGS['DAO_VIEN_ANH_HUNG_YEN'] = BANQUET_TIER_CONFIGS['DAO_VIEN'];

export interface HostBanquetParams {
  playerId?: string;
  tavernEnterpriseId?: string;
  tier: BanquetTier;
  guestNpcIds: string[];
  allowAutoProcure?: boolean;
}

export interface BanquetGuestResult {
  npcId: string;
  nameVi: string;
  nameEn: string;
  affinityBefore: number;
  affinityAfter: number;
  affinityGained: number;
  respectBefore: number;
  respectAfter: number;
  respectGained: number;
  reactionVi: string;
  eligibleForBrotherhood: boolean;
  eligibleForRecruitment: boolean;
  unlockedFogTier: number;
}

export interface ConsumedItemRecord {
  itemCode: string;
  nameVi: string;
  quantity: number;
  unitCost: number;
  balanceAfter?: number;
}

export interface BanquetResult {
  success: boolean;
  banquetId: string;
  tier: BanquetTier;
  titleVi: string;
  titleEn: string;
  settlementId: string;
  tavernNameVi: string;
  dishesConsumed: ConsumedItemRecord[];
  wineConsumed: ConsumedItemRecord[];
  itemsConsumed: ConsumedItemRecord[];
  cashSpent: number;
  staminaRecovered: number;
  moraleGained: number;
  affinityGainPerGuest: number;
  respectGainPerGuest: number;
  unlockedBrotherhoodNpcIds: string[];
  guests: BanquetGuestResult[];
  narrativeVi: string;
  toastDialogueVi: string;
}

export interface SwornBrotherhoodResult {
  success: boolean;
  npcId: string;
  npcNameVi: string;
  npcNameEn: string;
  oathTitleVi: string;
  oathTitleEn: string;
  oathDate: string;
  ceremonyNarrativeVi: string;
  unlockedFogTier: number;
  affinityAfter: number;
  respectAfter: number;
}

export interface RecruitRetainerParams {
  playerId?: string;
  heroNpcId?: string;
  npcId?: string;
  assignedRole?: 'COMMANDER' | 'COMMERCIAL_AGENT' | 'ESTATE_GUARDIAN' | 'GENERAL' | 'OFFICER' | 'CHIEF_ADVISOR' | 'RETAINER' | string;
  courtRank?: string;
}

export interface RetainerRecruitResult {
  success: boolean;
  npcId: string;
  npcNameVi: string;
  npcNameEn: string;
  factionId: string;
  appointedRank: string;
  startingLoyalty: number;
  monthlyWage: number;
  ambition: number;
  betrayalRisk: number;
  narrativeVi: string;
}

export class TavernBanquetService {
  private static instance: TavernBanquetService | null = null;
  private db: DatabaseService;
  private dailyEngine: DailyInteractionEngine;

  private constructor(customDb?: DatabaseService) {
    this.db = customDb || DatabaseService.getInstance();
    this.dailyEngine = DailyInteractionEngine.getInstance();
  }

  public static getInstance(customDb?: DatabaseService): TavernBanquetService {
    if (!TavernBanquetService.instance) {
      TavernBanquetService.instance = new TavernBanquetService(customDb);
    }
    return TavernBanquetService.instance;
  }

  /**
   * Normalize banquet tier string to canonical form
   */
  public normalizeTier(tier: string): BanquetTier {
    const upper = (tier || '').toUpperCase().trim();
    if (upper === 'TIEU_YEN' || upper === 'TIET_KIEM') return 'TIET_KIEM';
    if (upper === 'HAO_HIEP_YEN' || upper === 'HAO_HIEP') return 'HAO_HIEP';
    if (upper === 'DAO_VIEN_ANH_HUNG_YEN' || upper === 'DAO_VIEN') return 'DAO_VIEN';
    return 'TIET_KIEM';
  }

  /**
   * Retrieves all available banquet tier recipes
   */
  public getBanquetTiers(): Record<string, BanquetRecipeCost> {
    return { ...BANQUET_TIER_CONFIGS };
  }

  /**
   * Host a banquet at the player's tavern enterprise.
   * Consumes dishes and wine from inventory, updates stock movements,
   * boosts guest affinity/respect, and unlocks sworn brotherhood eligibility.
   */
  public hostBanquet(
    paramsOrTier: HostBanquetParams | BanquetTier,
    guestNpcIdsParam?: string[],
    tavernEnterpriseIdParam?: string,
    playerIdParam?: string
  ): BanquetResult {
    let params: HostBanquetParams;
    if (typeof paramsOrTier === 'object' && paramsOrTier !== null) {
      params = paramsOrTier;
    } else {
      params = {
        tier: paramsOrTier,
        guestNpcIds: guestNpcIdsParam || [],
        tavernEnterpriseId: tavernEnterpriseIdParam,
        playerId: playerIdParam
      };
    }

    const playerId = params.playerId || 'PLY-0001';
    const rawTier = params.tier || 'TIET_KIEM';
    const canonicalTier = this.normalizeTier(rawTier);
    const config = BANQUET_TIER_CONFIGS[canonicalTier] || BANQUET_TIER_CONFIGS['TIET_KIEM'];

    const guestIds = Array.isArray(params.guestNpcIds) && params.guestNpcIds.length > 0
      ? params.guestNpcIds
      : ['NPC-0002']; // Default Zhang Fei

    if (guestIds.length === 0) {
      throw new Error('Vui lòng chọn ít nhất một vị hào kiệt làm khách mời dự yến.');
    }

    if (guestIds.length > config.capacity) {
      throw new Error(`Số lượng khách mời (${guestIds.length}) vượt quá sức chứa tối đa của ${config.titleVi} (${config.capacity} vị).`);
    }

    // Resolve active game date
    const meta = this.db.queryOne<any>('SELECT campaign_meta.current_date FROM campaign_meta LIMIT 1;');
    const gameDate = meta?.current_date || '184-05-02';

    // Resolve tavern business information
    const tavernId = params.tavernEnterpriseId || 'BIZ-0001';
    const bizRow = this.db.queryOne<any>(
      'SELECT business_id, name, location_id, auto_procure FROM businesses WHERE business_id = ? LIMIT 1;',
      [tavernId]
    ) || {
      business_id: 'BIZ-0001',
      name: 'Tửu Quán Đào Viên Trác Huyện',
      location_id: 'LOC-0001',
      auto_procure: 1
    };

    const banquetId = nextId(this.db, 'banquet', 'BNQ', getGameDate(this.db));

    // Execute within atomic database transaction
    return this.db.transaction(() => {
      // 1. Determine items to consume
      const requiredList: Array<{ itemCode: string; nameVi: string; quantity: number }> = [];

      // Add required dishes
      for (const d of config.requiredDishes) {
        requiredList.push({ ...d });
      }

      // Add required wine
      for (const w of config.requiredWine) {
        // For TIET_KIEM tier, wine is only consumed if available in inventory
        if (canonicalTier === 'TIET_KIEM') {
          const invItem = this.db.queryOne<any>(
            'SELECT quantity FROM inventory_items WHERE item_code = ? LIMIT 1;',
            [w.itemCode]
          );
          if (invItem && Number(invItem.quantity) >= w.quantity) {
            requiredList.push({ ...w });
          }
        } else {
          requiredList.push({ ...w });
        }
      }

      let cashSpent = 0;
      const consumedDishes: ConsumedItemRecord[] = [];
      const consumedWine: ConsumedItemRecord[] = [];
      const allConsumed: ConsumedItemRecord[] = [];

      // 2. Verify and consume physical inventory
      for (const req of requiredList) {
        const itemRow = this.db.queryOne<any>(
          'SELECT quantity, unit_cost_basis, location FROM inventory_items WHERE item_code = ? LIMIT 1;',
          [req.itemCode]
        );

        let currentQty = itemRow ? Number(itemRow.quantity) : 0;
        let costBasis = itemRow ? Number(itemRow.unit_cost_basis) : 0;

        if (costBasis <= 0) {
          const masterItem = this.db.queryOne<any>(
            'SELECT baseline_peace_price FROM master_items WHERE item_code = ? LIMIT 1;',
            [req.itemCode]
          );
          costBasis = masterItem ? Number(masterItem.baseline_peace_price) : 30;
        }

        // Handle auto-procure if inventory insufficient
        if (currentQty < req.quantity) {
          const missingQty = req.quantity - currentQty;
          const masterItem = this.db.queryOne<any>(
            'SELECT baseline_peace_price, name_vi FROM master_items WHERE item_code = ? LIMIT 1;',
            [req.itemCode]
          );
          const unitPrice = masterItem ? Number(masterItem.baseline_peace_price) : costBasis;
          const procureCost = Math.round(missingQty * unitPrice);

          const player = this.db.queryOne<any>(
            'SELECT liquid_cash, safe_cash FROM player_state WHERE player_id = ? LIMIT 1;',
            [playerId]
          );
          const currentLiquid = player ? Number(player.liquid_cash) : 0;

          if (currentLiquid < procureCost) {
            throw new Error(
              `Kho hàng không đủ [${req.nameVi}] (cần ${req.quantity}, hiện có ${currentQty}) và ngân quỹ không đủ để tự động mua bổ sung (${procureCost} quan)!`
            );
          }

          // Legally procure missing goods: update cash, ledger, and journal
          const newLiquid = currentLiquid - procureCost;
          const totalCashAfter = newLiquid + Number(player?.safe_cash || 0);

          this.db.execute(
            'UPDATE player_state SET liquid_cash = ? WHERE player_id = ?;',
            [newLiquid, playerId]
          );

          const procureTxnId = nextId(this.db, 'cashflow', 'TXN-BNQ-BUY', getGameDate(this.db));

          postCashflowEntry(this.db, {
            txnId: procureTxnId,
            gameDate,
            counterparty: 'Chợ Trác Huyện',
            category: 'ENTERTAINMENT_LIVING',
            outflow: procureCost,
            balance: totalCashAfter,
            memo: `Mua khẩn cấp ${missingQty} ${req.nameVi} phục vụ yến tiệc`
          });

          this.db.execute(
            `INSERT INTO account_journal (
              txn_id, campaign_id, game_date, account_code, debit, credit, memo
            ) VALUES (?, 'CMP-184-ZHOU-01', ?, '6001_OPERATING_EXPENSE', ?, 0, ?);`,
            [procureTxnId, gameDate, procureCost, `Chi phí thu mua ẩm thực yến tiệc ${req.nameVi}`]
          );

          this.db.execute(
            `INSERT INTO account_journal (
              txn_id, campaign_id, game_date, account_code, debit, credit, memo
            ) VALUES (?, 'CMP-184-ZHOU-01', ?, '1001_CASH_MOBILE', 0, ?, ?);`,
            [procureTxnId, gameDate, procureCost, `Xuất tiền mặt thu mua ${req.nameVi}`]
          );

          cashSpent += procureCost;

          // Increase inventory by missingQty before consumption
          if (itemRow) {
            this.db.execute(
              'UPDATE inventory_items SET quantity = quantity + ? WHERE item_code = ?;',
              [missingQty, req.itemCode]
            );
          } else {
            this.db.execute(
              `INSERT INTO inventory_items (
                item_code, category, description, quantity, unit_cost_basis, location
              ) VALUES (?, 'FOOD_STUFF', ?, ?, ?, 'Warehouse');`,
              [req.itemCode, req.nameVi, missingQty, unitPrice]
            );
          }

          // Record procurement stock movement
          const procureMovId = nextId(this.db, 'stock-movements', 'MOV-BUY', getGameDate(this.db));
          this.db.execute(
            `INSERT INTO stock_movements (
              mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn
            ) VALUES (?, ?, ?, 'PURCHASE', ?, ?, ?, ?);`,
            [procureMovId, gameDate, req.itemCode, missingQty, unitPrice, req.quantity, procureTxnId]
          );

          currentQty = req.quantity;
          costBasis = unitPrice;
        }

        // Deduct inventory
        const balanceAfter = currentQty - req.quantity;
        this.db.execute(
          'UPDATE inventory_items SET quantity = ? WHERE item_code = ?;',
          [balanceAfter, req.itemCode]
        );

        // Record stock movement (ensuring balance_after matches inventory_items)
        const movId = nextId(this.db, 'stock-movements', 'MOV-BNQ', getGameDate(this.db));
        this.db.execute(
          `INSERT INTO stock_movements (
            mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn
          ) VALUES (?, ?, ?, 'BANQUET_CONSUME', ?, ?, ?, ?);`,
          [movId, gameDate, req.itemCode, req.quantity, costBasis, balanceAfter, banquetId]
        );

        const record: ConsumedItemRecord = {
          itemCode: req.itemCode,
          nameVi: req.nameVi,
          quantity: req.quantity,
          unitCost: costBasis,
          balanceAfter
        };

        if (req.itemCode === 'FOOD-COOK-DUKANG') {
          consumedWine.push(record);
        } else {
          consumedDishes.push(record);
        }
        allConsumed.push(record);
      }

      // 3. Resolve Guest Affinity, Respect & Fog Acceleration
      const guestsResult: BanquetGuestResult[] = [];
      const unlockedBrotherhoodNpcIds: string[] = [];

      let totalAffinityGain = 0;
      let totalRespectGain = 0;

      for (const guestId of guestIds) {
        const charRow = this.db.queryOne<any>(
          'SELECT npc_id, name_vi, name_en, war_attr, int_attr FROM master_characters WHERE npc_id = ? LIMIT 1;',
          [guestId]
        );
        const nameVi = charRow?.name_vi || guestId;
        const nameEn = charRow?.name_en || guestId;

        const currentSentiment = this.dailyEngine.getNpcSentiment(guestId);
        const affinityBefore = currentSentiment.affinity;
        const respectBefore = currentSentiment.respect;

        // Calculate gains scaled by tier config
        const affSpread = config.affinityBonusMax - config.affinityBonusMin;
        const affGained = config.affinityBonusMin + RngService.forDomain(this.db, 'banquet').nextInt(0, affSpread);

        const respSpread = config.respectBonusMax - config.respectBonusMin;
        const respGained = config.respectBonusMin + RngService.forDomain(this.db, 'banquet').nextInt(0, respSpread);

        totalAffinityGain += affGained;
        totalRespectGain += respGained;

        const affinityAfter = Math.min(100, Math.max(0, affinityBefore + affGained));
        const respectAfter = Math.min(100, Math.max(0, respectBefore + respGained));

        const eligibleForBrotherhood = affinityAfter >= 80;
        const eligibleForRecruitment = affinityAfter >= 70;

        if (eligibleForBrotherhood) {
          unlockedBrotherhoodNpcIds.push(guestId);
        }

        // Determine relationship title
        let relTitleVi = 'Sơ Giao Đồng Hương';
        if (affinityAfter >= 80) relTitleVi = 'Kim Lan Sinh Tử';
        else if (affinityAfter >= 60) relTitleVi = 'Tâm Phúc Tri Kỷ';
        else if (affinityAfter >= 40) relTitleVi = 'Bằng Hữu Thân Quen';

        // Insert into npc_relationship_deltas
        this.db.execute(
          `INSERT INTO npc_relationship_deltas (
            npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes
          ) VALUES (?, ?, ?, ?, ?, ?);`,
          [
            guestId,
            gameDate,
            affGained,
            affinityAfter,
            relTitleVi,
            `Dự tiệc ${config.titleVi} tại ${bizRow.name}: tương phùng đàm đạo, nâng chén Đỗ Khang kết tình bằng hữu (+${affGained} Cảm tình, +${respGained} Kính trọng)`
          ]
        );

        // Update npc_intel_fog
        const targetFogTier = this.dailyEngine.calculateFogTier(affinityAfter) as FogTier;
        const existingFog = this.db.queryOne<any>(
          'SELECT intel_level, interaction_count FROM npc_intel_fog WHERE npc_id = ? LIMIT 1;',
          [guestId]
        );

        const newInteractions = existingFog ? Number(existingFog.interaction_count || 0) + 1 : 1;
        const newFogTier = existingFog ? Math.max(Number(existingFog.intel_level || 1), targetFogTier) : targetFogTier;

        if (existingFog) {
          this.db.execute(
            `UPDATE npc_intel_fog
            SET intel_level = ?,
                interaction_count = ?,
                last_topic = 'TAVERN_BANQUET',
                last_outcome = 'SUCCESS',
                current_mood = 'JOYFUL',
                updated_at = CURRENT_TIMESTAMP
            WHERE npc_id = ?;`,
            [newFogTier, newInteractions, guestId]
          );
        } else {
          this.db.execute(
            `INSERT INTO npc_intel_fog (
              npc_id, intel_level, current_mood, interaction_count, last_topic, last_outcome
            ) VALUES (?, ?, 'JOYFUL', 1, 'TAVERN_BANQUET', 'SUCCESS');`,
            [guestId, newFogTier]
          );
        }

        // Generate contextual reaction
        let reactionVi = `${nameVi} nâng chén cảm kích: "Mỹ vị giai hào, tri kỷ tương phùng, hôm nay không say không về!"`;
        if (canonicalTier === 'DAO_VIEN') {
          reactionVi = `${nameVi} nhiệt huyết dâng trào: "Đào Viên thịnh yến lưu danh thiên cổ! Có được tri kỷ như các hạ, đời này nguyện đồng sinh cộng tử!"`;
        }

        guestsResult.push({
          npcId: guestId,
          nameVi,
          nameEn,
          affinityBefore,
          affinityAfter,
          affinityGained: affGained,
          respectBefore,
          respectAfter,
          respectGained: respGained,
          reactionVi,
          eligibleForBrotherhood,
          eligibleForRecruitment,
          unlockedFogTier: newFogTier
        });
      }

      // 4. Update Player Morale and Stamina/Fatigue
      const playerRow = this.db.queryOne<any>(
        'SELECT fatigue, morale FROM player_state WHERE player_id = ? LIMIT 1;',
        [playerId]
      );
      if (playerRow) {
        const newFatigue = Math.max(0, Number(playerRow.fatigue || 0) - config.staminaRecovery);
        const newMorale = Math.min(100, Number(playerRow.morale || 100) + config.moraleBoost);

        this.db.execute(
          'UPDATE player_state SET fatigue = ?, morale = ? WHERE player_id = ?;',
          [newFatigue, newMorale, playerId]
        );
      }

      const avgAffinity = Math.round(totalAffinityGain / guestIds.length);
      const avgRespect = Math.round(totalRespectGain / guestIds.length);

      const toastDialogueVi =
        canonicalTier === 'DAO_VIEN'
          ? 'Đỗ Khang mỹ tửu đượm hương hoa đào! Lương Diễn nâng chén hướng về quần hùng: "Giai hào tương ngộ, thiên hạ giai huynh đệ! Nguyện vì giang sơn xã tắc đồng tâm hiệp lực!"'
          : `Rượu nồng hương thịt ngập tràn tửu quán, chủ khách cùng nâng chén tương giao hữu hảo!`;

      const narrativeVi = `Yến tiệc [${config.titleVi}] được tổ chức long trọng tại ${bizRow.name}. Hào kiệt dự yến vô cùng hoan hỷ, tình bằng hữu gắn kết keo sơn.`;

      return {
        success: true,
        banquetId,
        tier: canonicalTier,
        titleVi: config.titleVi,
        titleEn: config.titleEn,
        settlementId: bizRow.location_id || 'LOC-0001',
        tavernNameVi: bizRow.name,
        dishesConsumed: consumedDishes,
        wineConsumed: consumedWine,
        itemsConsumed: allConsumed,
        cashSpent,
        staminaRecovered: config.staminaRecovery,
        moraleGained: config.moraleBoost,
        affinityGainPerGuest: avgAffinity,
        respectGainPerGuest: avgRespect,
        unlockedBrotherhoodNpcIds,
        guests: guestsResult,
        narrativeVi,
        toastDialogueVi
      };
    });
  }

  /**
   * Swear Peach Garden Brotherhood with a hero.
   * Condition: Affinity >= 80.
   * Unlocks Tier 5 Fog of Information (100% full dossier visibility).
   */
  public swearBrotherhood(
    npcIdOrParams: string | { npcId: string; playerId?: string },
    playerIdParam?: string
  ): SwornBrotherhoodResult {
    let npcId: string;
    let playerId: string;

    if (typeof npcIdOrParams === 'object' && npcIdOrParams !== null) {
      npcId = npcIdOrParams.npcId;
      playerId = npcIdOrParams.playerId || 'PLY-0001';
    } else {
      npcId = npcIdOrParams;
      playerId = playerIdParam || 'PLY-0001';
    }

    if (!npcId) {
      throw new Error('Missing npcId for sworn brotherhood oath');
    }

    const charRow = this.db.queryOne<any>(
      'SELECT npc_id, name_vi, name_en FROM master_characters WHERE npc_id = ? LIMIT 1;',
      [npcId]
    );

    if (!charRow) {
      throw new Error(`Nhân vật ${npcId} không tồn tại trong Tam Quốc chí!`);
    }

    const nameVi = charRow.name_vi;
    const nameEn = charRow.name_en;

    const sentiment = this.dailyEngine.getNpcSentiment(npcId);
    if (sentiment.affinity < 80) {
      throw new Error(
        `Cảm tình với ${nameVi} chưa đạt mức Đào Viên Kết Nghĩa (yêu cầu >= 80, hiện tại: ${sentiment.affinity})!`
      );
    }

    const meta = this.db.queryOne<any>('SELECT campaign_meta.current_date FROM campaign_meta LIMIT 1;');
    const gameDate = meta?.current_date || '184-05-02';

    return this.db.transaction(() => {
      // 1. Record in npc_relationship_deltas
      const newAffinity = Math.min(100, sentiment.affinity + 10);
      const newRespect = Math.min(100, sentiment.respect + 15);

      this.db.execute(
        `INSERT INTO npc_relationship_deltas (
          npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes
        ) VALUES (?, ?, 10, ?, 'Tử Sinh Huynh Đệ', ?);`,
        [
          npcId,
          gameDate,
          newAffinity,
          `Đào Viên Kết Nghĩa: Cùng ${nameVi} lập lời thề đồng sinh cộng tử, họa phúc tương tùy, vĩnh kết kim lan!`
        ]
      );

      // 2. Update master_relations_baseline
      const baselineRow = this.db.queryOne<any>(
        'SELECT id FROM master_relations_baseline WHERE source_entity_id = ? LIMIT 1;',
        [npcId]
      );

      if (baselineRow) {
        this.db.execute(
          `UPDATE master_relations_baseline
          SET relationship_type_vi = 'Tử Sinh Huynh Đệ',
              relationship_type_en = 'Life-and-Death Sworn Brother',
              baseline_sentiment = 100,
              notes_vi = 'Đào Viên Kết Nghĩa: thề cùng sinh cùng tử, họa phúc tương tùy'
          WHERE id = ?;`,
          [baselineRow.id]
        );
      } else {
        this.db.execute(
          `INSERT INTO master_relations_baseline (
            source_entity_id, target_entity_id, entity_type, relationship_type_vi, relationship_type_en,
            baseline_sentiment, notes_vi, notes_en
          ) VALUES (?, 'player', 'NPC_TO_PLAYER', 'Tử Sinh Huynh Đệ', 'Life-and-Death Sworn Brother', 100,
            'Đào Viên Kết Nghĩa: thề cùng sinh cùng tử', 'Peach Garden Oath of Brotherhood');`,
          [npcId]
        );
      }

      // 3. Unlock Tier 5 Fog of Information (Full Dossier Visibility)
      const existingFog = this.db.queryOne<any>(
        'SELECT npc_id FROM npc_intel_fog WHERE npc_id = ? LIMIT 1;',
        [npcId]
      );

      if (existingFog) {
        this.db.execute(
          `UPDATE npc_intel_fog
          SET intel_level = 5,
              revealed_ambition = 1,
              revealed_secrets = 1,
              last_topic = 'PEACH_ORCHARD_OATH',
              last_outcome = 'SWORN_BROTHERHOOD',
              current_mood = 'INSPIRED',
              updated_at = CURRENT_TIMESTAMP
          WHERE npc_id = ?;`,
          [npcId]
        );
      } else {
        this.db.execute(
          `INSERT INTO npc_intel_fog (
            npc_id, intel_level, revealed_ambition, revealed_secrets, interaction_count,
            current_mood, last_topic, last_outcome
          ) VALUES (?, 5, 1, 1, 1, 'INSPIRED', 'PEACH_ORCHARD_OATH', 'SWORN_BROTHERHOOD');`,
          [npcId]
        );
      }

      const ceremonyNarrativeVi =
        `Tại hoa viên Đào Viên ngát hương, trước bàn thờ trời đất, Lương Diễn cùng ${nameVi} cắt máu ăn thề: ` +
        `"Tuy không cùng năm cùng tháng cùng ngày sinh, nhưng nguyện cùng năm cùng tháng cùng ngày chết. Hoàng thiên hậu thổ chứng giám tấm lòng này!"`;

      return {
        success: true,
        npcId,
        npcNameVi: nameVi,
        npcNameEn: nameEn,
        oathTitleVi: 'Tử Sinh Huynh Đệ (Kim Lan Chi Giao)',
        oathTitleEn: 'Life-and-Death Sworn Brother',
        oathDate: gameDate,
        ceremonyNarrativeVi,
        unlockedFogTier: 5,
        affinityAfter: newAffinity,
        respectAfter: newRespect
      };
    });
  }

  /**
   * Recruit a hero or scholar as a loyal retainer or commander into FAC-LIANG-CLAN.
   * Condition: Affinity >= 70 OR is Sworn Brother.
   */
  public recruitRetainer(
    paramsOrHeroId: RecruitRetainerParams | string,
    assignedRoleParam?: string,
    playerIdParam?: string
  ): RetainerRecruitResult {
    let heroId: string;
    let assignedRole: string;
    let playerId: string;

    if (typeof paramsOrHeroId === 'object' && paramsOrHeroId !== null) {
      heroId = paramsOrHeroId.heroNpcId || paramsOrHeroId.npcId || '';
      assignedRole = paramsOrHeroId.courtRank || paramsOrHeroId.assignedRole || 'OFFICER';
      playerId = paramsOrHeroId.playerId || 'PLY-0001';
    } else {
      heroId = paramsOrHeroId;
      assignedRole = assignedRoleParam || 'OFFICER';
      playerId = playerIdParam || 'PLY-0001';
    }

    if (!heroId) {
      throw new Error('Missing heroNpcId for retainer recruitment');
    }

    const charRow = this.db.queryOne<any>(
      'SELECT npc_id, name_vi, name_en, war_attr, int_attr, ldr_attr, pol_attr FROM master_characters WHERE npc_id = ? LIMIT 1;',
      [heroId]
    );

    if (!charRow) {
      throw new Error(`Nhân vật ${heroId} không tồn tại trong cơ sở dữ liệu!`);
    }

    const nameVi = charRow.name_vi;
    const nameEn = charRow.name_en;

    const sentiment = this.dailyEngine.getNpcSentiment(heroId);

    // Check sworn brother baseline status
    const baseline = this.db.queryOne<any>(
      "SELECT relationship_type_vi FROM master_relations_baseline WHERE source_entity_id = ? AND relationship_type_vi LIKE '%Huynh Đệ%' LIMIT 1;",
      [heroId]
    );
    const isSwornBrother = sentiment.affinity >= 80 || !!baseline;

    if (sentiment.affinity < 70 && !isSwornBrother) {
      throw new Error(
        `Độ thân mật với ${nameVi} chưa đủ để chiêu mộ (yêu cầu >= 70 hoặc Kết Nghĩa Huynh Đệ, hiện tại: ${sentiment.affinity})!`
      );
    }

    // Normalize court rank
    let courtRank = assignedRole.toUpperCase().trim();
    if (courtRank === 'COMMANDER') courtRank = 'GENERAL';
    else if (courtRank === 'COMMERCIAL_AGENT') courtRank = 'OFFICER';
    else if (courtRank === 'ESTATE_GUARDIAN') courtRank = 'RETAINER';

    const VALID_RANKS = ['CHIEF_COMMANDER', 'CHIEF_ADVISOR', 'GENERAL', 'OFFICER', 'RETAINER', 'GOVERNOR'];
    if (!VALID_RANKS.includes(courtRank)) {
      courtRank = 'OFFICER';
    }

    // Calculate starting loyalty (75 - 100)
    const baseLoyalty = Math.floor((sentiment.affinity + sentiment.respect) / 2);
    const startingLoyalty = Math.min(100, Math.max(75, baseLoyalty + (isSwornBrother ? 15 : 5)));

    // Calculate monthly wage
    const WAGE_MAP: Record<string, number> = {
      CHIEF_COMMANDER: 1500,
      GENERAL: 1200,
      CHIEF_ADVISOR: 1000,
      OFFICER: 600,
      RETAINER: 400,
      GOVERNOR: 1000
    };
    const monthlyWage = WAGE_MAP[courtRank] || 500;

    // Ambition and betrayal risk
    const ambition = Math.max(10, Math.min(95, Math.floor((charRow.war_attr + charRow.int_attr) / 2) - 10));
    const betrayalRisk = Number(Math.max(0.005, (100 - startingLoyalty) / 200).toFixed(3));

    const meta = this.db.queryOne<any>('SELECT campaign_meta.current_date FROM campaign_meta LIMIT 1;');
    const gameDate = meta?.current_date || '184-05-02';

    return this.db.transaction(() => {
      // 1. Remove any previous faction appointment
      this.db.execute('DELETE FROM faction_officers WHERE officer_id = ?;', [heroId]);

      // 2. Insert into faction_officers under FAC-LIANG-CLAN
      this.db.execute(
        `INSERT INTO faction_officers (
          officer_id, faction_id, court_rank, loyalty, ambition, appointed_settlement_id, betrayal_risk, secret_faction_sympathy, updated_at
        ) VALUES (?, 'FAC-LIANG-CLAN', ?, ?, ?, 'zhuo_xian', ?, NULL, CURRENT_TIMESTAMP);`,
        [heroId, courtRank, startingLoyalty, ambition, betrayalRisk]
      );

      // 3. Record relationship delta
      this.db.execute(
        `INSERT INTO npc_relationship_deltas (
          npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes
        ) VALUES (?, ?, 5, ?, 'Gia Thần Trung Thành', ?);`,
        [
          heroId,
          gameDate,
          Math.min(100, sentiment.affinity + 5),
          `Quy thuận gia nhập Lương Thị Thương Bang, thụ phong chức vụ [${courtRank}] (Trung thành: ${startingLoyalty})`
        ]
      );

      const narrativeVi =
        `${nameVi} bái phục ơn tri ngộ của Lương Diễn, chính thức gia nhập Lương Thị Thương Bang với chức vụ [${courtRank}]. ` +
        `Lời thề cúc cung tận tụy, đồng lòng xây dựng cơ nghiệp hùng bá!`;

      return {
        success: true,
        npcId: heroId,
        npcNameVi: nameVi,
        npcNameEn: nameEn,
        factionId: 'FAC-LIANG-CLAN',
        appointedRank: courtRank,
        startingLoyalty,
        monthlyWage,
        ambition,
        betrayalRisk,
        narrativeVi
      };
    });
  }

  /**
   * Status overview for the Grand Command Hub (Tụ Nghĩa tab)
   */
  public getBanquetStatus(playerId = 'PLY-0001'): any {
    const player = this.db.queryOne<any>(
      'SELECT liquid_cash, fatigue, morale FROM player_state WHERE player_id = ? LIMIT 1;',
      [playerId]
    );

    const baoItem = this.db.queryOne<any>(
      "SELECT quantity FROM inventory_items WHERE item_code = 'FOOD-COOK-BAO' LIMIT 1;"
    );
    const venisonItem = this.db.queryOne<any>(
      "SELECT quantity FROM inventory_items WHERE item_code = 'FOOD-COOK-VENISON' LIMIT 1;"
    );
    const dukangItem = this.db.queryOne<any>(
      "SELECT quantity FROM inventory_items WHERE item_code = 'FOOD-COOK-DUKANG' LIMIT 1;"
    );

    const pantry = {
      bao: Number(baoItem?.quantity || 0),
      venison: Number(venisonItem?.quantity || 0),
      dukang: Number(dukangItem?.quantity || 0)
    };

    const characters = this.db.query<any>(`
      SELECT 
        mc.npc_id as npcId,
        mc.name_vi as nameVi,
        mc.name_en as nameEn,
        mc.war_attr as war,
        mc.int_attr as int,
        mc.ldr_attr as ldr,
        COALESCE(mrb.baseline_sentiment, 25) as baseSentiment
      FROM master_characters mc
      LEFT JOIN master_relations_baseline mrb ON mc.npc_id = mrb.source_entity_id
      ORDER BY baseSentiment DESC, mc.war_attr DESC
      LIMIT 12;
    `);

    const guests = characters.map((c: any) => {
      const sent = this.dailyEngine.getNpcSentiment(c.npcId);
      const isSworn = sent.affinity >= 80;
      const canRecruit = sent.affinity >= 70;
      return {
        npcId: c.npcId,
        nameVi: c.nameVi,
        nameEn: c.nameEn,
        affinity: sent.affinity,
        respect: sent.respect,
        relationshipTitleVi: sent.titleVi,
        eligibleForBrotherhood: isSworn,
        eligibleForRecruitment: canRecruit
      };
    });

    const officers = this.db.query<any>(`
      SELECT 
        fo.officer_id as officerId,
        mc.name_vi as nameVi,
        fo.court_rank as courtRank,
        fo.loyalty,
        fo.ambition
      FROM faction_officers fo
      JOIN master_characters mc ON fo.officer_id = mc.npc_id
      WHERE fo.faction_id = 'FAC-LIANG-CLAN'
      ORDER BY fo.loyalty DESC;
    `);

    return {
      playerId,
      playerCash: Number(player?.liquid_cash || 0),
      playerFatigue: Number(player?.fatigue || 0),
      playerMorale: Number(player?.morale || 100),
      pantry,
      availableTiers: Object.keys(BANQUET_TIER_CONFIGS),
      guests,
      currentOfficers: officers
    };
  }
}
