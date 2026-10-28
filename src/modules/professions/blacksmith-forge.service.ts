/**
 * ThreeKingdoms-AgentEngine: Blacksmith Forge & Master Crafting Service
 * (src/modules/professions/blacksmith-forge.service.ts)
 *
 * Implements:
 * 1. Master Blacksmith Forging Engine:
 *    - Standard Armament Forging: Han Sword, Iron Spear, Reinforced Shield, Leather Armor.
 *    - Bespoke God Weapon Forging (Đoán Tạo Thần Binh Tùy Biến):
 *      - Requires CRA >= 60, consumes 25 Fatigue (fatigue +25) + Materials (Iron, Coal, Timber, Leather).
 *      - Quality roll: Normal, Fine, Masterwork, Legendary.
 *      - Stat modifiers strictly clamped between +1 and +5 points! (e.g. +1 to +5 WAR, optional +1 to +2 LDR).
 *      - Custom naming support (e.g., "Xích Viêm Đao", "Phá Quân Thương", or custom player name).
 *      - Outputs item to warehouse inventory, equips immediately, or gifts to NPCs.
 * 2. Equipment Management Engine (4 slots: Weapon, Armor, Steed, Treasure):
 *    - Equipment inventory lookup, 1-click equip/unequip, and NPC gear inspection.
 *    - Effective attributes calculator with >100 golden cap highlights.
 * 3. Free Enterprise & Labor Engine:
 *    - Open business: Workshop, Tavern, Apothecary, Blacksmith Forge.
 *    - Labor shifts: Chef at Tavern, Herbalist at Apothecary, Forge hand at Blacksmith.
 *
 * Adheres strictly to Universe Architecture v4.0 & Anti-AI-Slop standards.
 */

import { DatabaseService } from '../../core/database';
import { Router, sendJson, RouteContext } from '../../server/router';
import { EnterpriseLaborService } from './enterprise-labor.service';

export type EquipmentSlotType = 'WEAPON' | 'ARMOR' | 'STEED' | 'TREASURE';
export const VALID_EQUIPMENT_SLOTS: readonly EquipmentSlotType[] = ['WEAPON', 'ARMOR', 'STEED', 'TREASURE'];
export type EquipmentQuality = 'NORMAL' | 'FINE' | 'MASTERWORK' | 'LEGENDARY';

export interface EquippedItem {
  id?: number;
  characterId: string;
  slotType: EquipmentSlotType;
  itemCode: string;
  customName: string;
  nameVi: string;
  nameEn: string;
  quality: EquipmentQuality;
  statModifiers: Record<string, number>;
  slotIcon: string;
  slotLabelVi: string;
  slotLabelEn: string;
  equippedAt?: string;
  descriptionVi?: string;
}

export interface CharacterEquipmentOverview {
  characterId: string;
  characterName: string;
  styleName?: string;
  isPlayer: boolean;
  baseAttributes: Record<string, number>;
  equipmentBuffs: Record<string, number>;
  effectiveAttributes: Record<string, number>;
  exceedsLimit: Record<string, boolean>; // True if effective attribute > 100
  slots: Record<EquipmentSlotType, EquippedItem | null>;
  equippedItems: EquippedItem[]; // All possessed items, no 4-slot limit!
  items: EquippedItem[]; // Alias for equippedItems
  possessedCount: number;
}

export interface BespokeWeaponForgeParams {
  characterId?: string;
  weaponType?: 'SWORD' | 'SPEAR' | 'HALBERD' | 'BLADE' | 'BOW';
  customName?: string;
  targetDestination: 'WAREHOUSE' | 'EQUIP_IMMEDIATELY' | 'GIFT_TO_NPC';
  giftTargetNpcId?: string;
}

export interface ForgeRateTierDistribution {
  tier: EquipmentQuality;
  tierLabelVi: string;
  probabilityPercent: number;
  warRange: string;
  ldrRange: string;
  warOdds: Array<{ value: number; chancePercent: number }>;
  ldrOdds: Array<{ value: number; chancePercent: number }>;
}

export interface ForgeRateAnalysis {
  effectiveMasteryScore: number;
  fatiguePenalty: number;
  craAttr: number;
  fatigue: number;
  craftsmanTier: number;
  tiers: ForgeRateTierDistribution[];
  formulaDescription: string;
}

export interface BespokeWeaponForgeResult {
  success: boolean;
  itemCode: string;
  customName: string;
  nameVi: string;
  nameEn: string;
  quality: EquipmentQuality;
  qualityLabelVi: string;
  statModifiers: Record<string, number>;
  fatigueConsumed: number;
  expGained: number;
  materialsConsumed: Array<{ itemCode: string; itemNameVi: string; quantity: number }>;
  destination: string;
  equippedSlot?: EquipmentSlotType;
  giftResult?: {
    npcId: string;
    npcName: string;
    affinityGained: number;
    messageVi: string;
  };
  messageVi: string;
  messageEn: string;
}

export interface StandardArmamentForgeParams {
  characterId?: string;
  armamentCode: 'COM-SWORD' | 'COM-SPEAR' | 'PROD-SHIELD-BAM' | 'EQP-ARMOR-LEATHER';
  quantity?: number;
  targetDestination?: 'WAREHOUSE' | 'EQUIP_IMMEDIATELY';
}

export interface StandardArmamentForgeResult {
  success: boolean;
  armamentCode: string;
  nameVi: string;
  nameEn: string;
  quantity: number;
  fatigueConsumed: number;
  expGained: number;
  materialsConsumed: Array<{ itemCode: string; itemNameVi: string; quantity: number }>;
  destination: string;
  messageVi: string;
}

export interface LaborShiftDef {
  shiftId: string;
  titleVi: string;
  titleEn: string;
  workplaceVi: string;
  workplaceEn: string;
  wage: number;
  fatigueCost: number;
  professionCode: string;
  expGain: number;
  narrativeVi: string;
  narrativeEn: string;
  icon: string;
}

export interface EnterpriseTypeDef {
  typeId: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  startupCash: number;
  requiredMaterials: Array<{ itemCode: string; itemNameVi: string; quantity: number }>;
  monthlyRent: number;
  baseWorkforce: number;
  projectedMonthlyRevenueMin: number;
  projectedMonthlyRevenueMax: number;
  icon: string;
}

/**
 * Master Blacksmith Forge Service
 */
export class BlacksmithForgeService {
  private static instance: BlacksmithForgeService | null = null;
  private db: DatabaseService;

  private constructor(customDbPath?: string) {
    this.db = DatabaseService.getInstance(customDbPath);
    this.ensureTables();
  }

  public static getInstance(customDbPath?: string): BlacksmithForgeService {
    if (!BlacksmithForgeService.instance) {
      BlacksmithForgeService.instance = new BlacksmithForgeService(customDbPath);
    }
    return BlacksmithForgeService.instance;
  }

  /**
   * Ensures that the character_equipment table exists in SQLite.
   */
  private ensureTables(): void {
    try {
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS character_equipment (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          character_id TEXT NOT NULL,
          slot_type TEXT NOT NULL,
          item_code TEXT NOT NULL,
          custom_name TEXT,
          stat_modifiers TEXT NOT NULL,
          equipped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (err) {
      console.warn('[BlacksmithForgeService] Table verification notice:', err);
    }
  }

  /**
   * Clamps stat modifiers strictly between +1 and +5 points.
   */
  public static clampStatModifier(value: number): number {
    return Math.min(5, Math.max(1, Math.round(value)));
  }

  /**
   * Calculates anti-inflationary odds for bespoke weapon forging tiers and stat rolls.
   * Ensures Legendary (Tuyệt Thế Thần Binh) is strictly rate-controlled (<= 8.5% at max mastery).
   *
   * Formulation:
   * S = max(0, (CRA - 60) + 5*(Tier - 1) - max(0, (Fatigue - 40)/3) + Bonus)
   * W_Legendary = 0.5 + 6.0 * (S / 50)^2.2
   * W_Masterwork = 5.0 + 25.0 * (S / 50)^1.4
   * W_Fine       = 30.0 + 30.0 * (S / 50)^0.9
   * W_Normal     = max(15.0, 64.5 - 45.0 * (S / 50))
   */
  public static calculateForgeOdds(
    craAttr: number,
    fatigue: number = 0,
    craftsmanTier: number = 1,
    furnaceBonus: number = 0
  ): ForgeRateAnalysis {
    const cra = Math.max(60, Number(craAttr) || 60);
    const f = Math.max(0, Math.min(100, Number(fatigue) || 0));
    const tier = Math.max(1, Number(craftsmanTier) || 1);
    const bonus = Math.max(0, Number(furnaceBonus) || 0);

    const fatiguePenalty = Math.max(0, (f - 40) / 3);
    const S = Math.max(0, (cra - 60) + 5 * (tier - 1) - fatiguePenalty + bonus);

    // Unnormalized weights
    const wLegendary = 0.5 + 6.0 * Math.pow(S / 50, 2.2);
    const wMasterwork = 5.0 + 25.0 * Math.pow(S / 50, 1.4);
    const wFine = 30.0 + 30.0 * Math.pow(S / 50, 0.9);
    const wNormal = Math.max(15.0, 64.5 - 45.0 * (S / 50));

    const totalWeight = wLegendary + wMasterwork + wFine + wNormal;

    const pLegendary = Math.round((wLegendary / totalWeight) * 1000) / 10;
    const pMasterwork = Math.round((wMasterwork / totalWeight) * 1000) / 10;
    const pFine = Math.round((wFine / totalWeight) * 1000) / 10;
    const pNormal = Math.max(0, Math.round((100 - pLegendary - pMasterwork - pFine) * 10) / 10);

    const tiers: ForgeRateTierDistribution[] = [
      {
        tier: 'NORMAL',
        tierLabelVi: 'Phổ Thông Hảo Binh',
        probabilityPercent: pNormal,
        warRange: '+1 ~ +2',
        ldrRange: '+0 ~ +1',
        warOdds: [
          { value: 1, chancePercent: 80 },
          { value: 2, chancePercent: 20 }
        ],
        ldrOdds: [
          { value: 0, chancePercent: 85 },
          { value: 1, chancePercent: 15 }
        ]
      },
      {
        tier: 'FINE',
        tierLabelVi: 'Tinh Luyện Thượng Phẩm',
        probabilityPercent: pFine,
        warRange: '+2 ~ +3',
        ldrRange: '+1 ~ +2',
        warOdds: [
          { value: 2, chancePercent: 65 },
          { value: 3, chancePercent: 35 }
        ],
        ldrOdds: [
          { value: 1, chancePercent: 80 },
          { value: 2, chancePercent: 20 }
        ]
      },
      {
        tier: 'MASTERWORK',
        tierLabelVi: 'Bách Luyện Tinh Cương',
        probabilityPercent: pMasterwork,
        warRange: '+3 ~ +4',
        ldrRange: '+1 ~ +3',
        warOdds: [
          { value: 3, chancePercent: 55 },
          { value: 4, chancePercent: 45 }
        ],
        ldrOdds: [
          { value: 1, chancePercent: 50 },
          { value: 2, chancePercent: 40 },
          { value: 3, chancePercent: 10 }
        ]
      },
      {
        tier: 'LEGENDARY',
        tierLabelVi: 'Tuyệt Thế Thần Binh',
        probabilityPercent: pLegendary,
        warRange: '+4 ~ +5',
        ldrRange: '+2 ~ +3',
        warOdds: [
          { value: 4, chancePercent: 40 },
          { value: 5, chancePercent: 60 }
        ],
        ldrOdds: [
          { value: 2, chancePercent: 60 },
          { value: 3, chancePercent: 40 }
        ]
      }
    ];

    return {
      effectiveMasteryScore: Math.round(S * 10) / 10,
      fatiguePenalty: Math.round(fatiguePenalty * 10) / 10,
      craAttr: cra,
      fatigue: f,
      craftsmanTier: tier,
      tiers,
      formulaDescription: 'S = (CRA - 60) + 5*(Tier - 1) - max(0, (Fatigue - 40)/3) + Bonus. P(k) = W_k / sum(W_j).'
    };
  }

  /**
   * Retrieves player smithing stats for rate calculations.
   */
  public getPlayerSmithingStats(characterId: string = 'PLY-0001'): {
    craAttr: number;
    fatigue: number;
    craftsmanTier: number;
    craftsmanExp: number;
    name: string;
  } {
    const player = this.db.queryOne<any>(
      'SELECT name, cra_attr, fatigue, cra_exp FROM player_state WHERE player_id = ?;',
      [characterId]
    ) || {};

    const prof = this.db.queryOne<any>(
      "SELECT tier, current_exp FROM character_professions WHERE character_id = ? AND category = 'CRAFTING' LIMIT 1;",
      [characterId]
    );

    return {
      name: player.name || 'Lương Diễn',
      craAttr: Number(player.cra_attr || 50),
      fatigue: Number(player.fatigue || 0),
      craftsmanTier: Number(prof?.tier || 1),
      craftsmanExp: Number(prof?.current_exp || player.cra_exp || 0)
    };
  }

  /**
   * Retrieves active campaign metadata.
   */
  private getCampaignMeta(): { activeTurn: number; currentDate: string } {
    try {
      const row = this.db.queryOne<{ active_turn: number; current_date: string }>(
        'SELECT active_turn, current_date FROM campaign_meta LIMIT 1;'
      );
      if (row) return { activeTurn: row.active_turn, currentDate: row.current_date };
    } catch {
      // fallback
    }
    return { activeTurn: 6, currentDate: '184-05-01' };
  }

  // =========================================================================
  // 1. BESPOKE GOD WEAPON FORGING ENGINE (Đoán Tạo Thần Binh Tùy Biến)
  // =========================================================================

  /**
   * Forges a bespoke god weapon with quality roll, clamped stats (+1 to +5),
   * fatigue consumption (25), and flexible destination.
   */
  public forgeBespokeGodWeapon(params: BespokeWeaponForgeParams): BespokeWeaponForgeResult {
    const characterId = params.characterId || 'PLY-0001';
    const meta = this.getCampaignMeta();

    return this.db.transaction(() => {
      // 1. Verify player attributes & stamina
      const player = this.db.queryOne<any>(
        'SELECT player_id, name, cra_attr, fatigue, health, war_attr, ldr_attr FROM player_state WHERE player_id = ?;',
        [characterId]
      );

      if (!player) {
        throw new Error(`Player ${characterId} not found in player_state.`);
      }

      // Requirement: CRA >= 60
      const currentCra = player.cra_attr || 50;
      if (currentCra < 60) {
        throw new Error(
          `Kỹ Nghệ (CRA) chưa đạt yêu cầu! Hiện tại: ${currentCra}/60. Cần rèn luyện tay nghề đạt tối thiểu 60 để đoán tạo Thần Binh.`
        );
      }

      // Requirement: Consumes 25 Thể Lực (fatigue +25)
      const currentFatigue = player.fatigue || 0;
      if (currentFatigue + 25 > 100) {
        throw new Error(
          `Khí lực kiệt quệ (${currentFatigue}/100)! Cần tối thiểu 25 Thể Lực rảnh rỗi để đứng lò luyện Thần Binh.`
        );
      }

      // 2. Resolve and verify material requirements:
      // Iron: 3, Coal: 3, Timber: 2, Leather: 2
      const materialRequirements = [
        {
          nameVi: 'Sắt Thỏi / Quặng Sắt Luyện',
          targetQuantity: 3,
          candidates: ['RAW-IRON-INGOT', 'COM-IRON', 'RAW-IRON-ORE']
        },
        {
          nameVi: 'Than Đen Lò Nung',
          targetQuantity: 3,
          candidates: ['RAW-CHARCOAL-BAG', 'COM-COAL']
        },
        {
          nameVi: 'Gỗ Tốt / Gỗ Sồi Quân Nhu',
          targetQuantity: 2,
          candidates: ['RAW-TIMBER-OAK', 'COM-TIMBER']
        },
        {
          nameVi: 'Da Thuộc / Da Heo Đóng Giáp',
          targetQuantity: 2,
          candidates: ['COM-LEATH', 'RAW-PIGSKIN-HIDE']
        }
      ];

      const consumedItems: Array<{ itemCode: string; itemNameVi: string; quantity: number }> = [];

      // Check stock sufficiency
      for (const req of materialRequirements) {
        let remainingNeeded = req.targetQuantity;
        let availableFound = 0;

        for (const code of req.candidates) {
          const row = this.db.queryOne<{ quantity: number }>(
            'SELECT quantity FROM inventory_items WHERE item_code = ?;',
            [code]
          );
          if (row && row.quantity > 0) {
            availableFound += row.quantity;
          }
        }

        if (availableFound < req.targetQuantity) {
          throw new Error(
            `Thiếu nguyên liệu đoán tạo [${req.nameVi}]: cần ${req.targetQuantity}, trong kho chỉ có ${availableFound.toFixed(1)}.`
          );
        }

        // Deduct materials from matching inventory items
        for (const code of req.candidates) {
          if (remainingNeeded <= 0) break;
          const row = this.db.queryOne<{ quantity: number }>(
            'SELECT quantity FROM inventory_items WHERE item_code = ?;',
            [code]
          );
          if (row && row.quantity > 0) {
            const deduct = Math.min(row.quantity, remainingNeeded);
            this.db.execute(
              'UPDATE inventory_items SET quantity = quantity - ? WHERE item_code = ?;',
              [deduct, code]
            );

            this.db.execute(
              `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
               VALUES (?, ?, ?, 'PRODUCTION_CONSUME', ?, 40, (SELECT quantity FROM inventory_items WHERE item_code = ?), 'BESPOKE_FORGE');`,
              [`MOV-FORGE-${Date.now()}-${code}`, meta.currentDate, code, deduct, code]
            );

            consumedItems.push({
              itemCode: code,
              itemNameVi: req.nameVi,
              quantity: deduct
            });

            remainingNeeded -= deduct;
          }
        }
      }

      // 3. Roll Quality using Anti-Inflationary Forge Rate Engine
      const prof = this.db.queryOne<any>(
        "SELECT tier FROM character_professions WHERE character_id = ? AND category = 'CRAFTING' LIMIT 1;",
        [characterId]
      );
      const craftsmanTier = prof?.tier || 1;

      const odds = BlacksmithForgeService.calculateForgeOdds(currentCra, currentFatigue, craftsmanTier);
      const roll100 = Math.random() * 100;

      let quality: EquipmentQuality = 'NORMAL';
      let qualityLabelVi = 'Phổ Thông Hảo Binh';
      let rawWarMod = 1;
      let rawLdrMod = 0;

      const pLegendary = odds.tiers.find(t => t.tier === 'LEGENDARY')?.probabilityPercent || 0.5;
      const pMasterwork = odds.tiers.find(t => t.tier === 'MASTERWORK')?.probabilityPercent || 5.0;
      const pFine = odds.tiers.find(t => t.tier === 'FINE')?.probabilityPercent || 30.0;

      if (roll100 < pLegendary) {
        // Tuyệt Thế Thần Binh (Legendary) - Divine Rarity!
        quality = 'LEGENDARY';
        qualityLabelVi = 'Tuyệt Thế Thần Binh';
        rawWarMod = Math.random() < 0.60 ? 5 : 4;
        rawLdrMod = Math.random() < 0.40 ? 3 : 2;
      } else if (roll100 < pLegendary + pMasterwork) {
        // Bách Luyện Tinh Cương (Masterwork)
        quality = 'MASTERWORK';
        qualityLabelVi = 'Bách Luyện Tinh Cương';
        rawWarMod = Math.random() < 0.45 ? 4 : 3;
        const ldrRoll = Math.random();
        rawLdrMod = ldrRoll < 0.10 ? 3 : ldrRoll < 0.50 ? 2 : 1;
      } else if (roll100 < pLegendary + pMasterwork + pFine) {
        // Tinh Luyện Thượng Phẩm (Fine)
        quality = 'FINE';
        qualityLabelVi = 'Tinh Luyện Thượng Phẩm';
        rawWarMod = Math.random() < 0.35 ? 3 : 2;
        rawLdrMod = Math.random() < 0.20 ? 2 : 1;
      } else {
        // Phổ Thông Hảo Binh (Normal)
        quality = 'NORMAL';
        qualityLabelVi = 'Phổ Thông Hảo Binh';
        rawWarMod = Math.random() < 0.20 ? 2 : 1;
        rawLdrMod = Math.random() < 0.15 ? 1 : 0;
      }

      // STRICT CLAMPING INVARIANT: All stat modifiers strictly clamped between +1 and +5 points!
      const statModifiers: Record<string, number> = {
        war: BlacksmithForgeService.clampStatModifier(rawWarMod)
      };
      if (rawLdrMod > 0) {
        statModifiers.ldr = BlacksmithForgeService.clampStatModifier(rawLdrMod);
      }

      // 4. Resolve Custom Name
      let finalName = (params.customName || '').trim();
      if (!finalName) {
        const weaponPool = [
          'Xích Viêm Đao',
          'Phá Quân Thần Thương',
          'Hàn Băng Thấu Giáp Kích',
          'Cửu Tiêu Trảm Nguyệt Đao',
          'Bách Luyện Đoạt Mệnh Kiếm',
          'Hắc Thiết Cuồng Long Mâu',
          'Xích Hỏa Phương Thiên Kích'
        ];
        finalName = weaponPool[Math.floor(Math.random() * weaponPool.length)];
      }

      const bespokeItemCode = `WPN-BESPOKE-${Date.now().toString(36).toUpperCase()}`;

      // 5. Deduct Fatigue & Award Profession EXP
      const fatigueConsumed = 25;
      this.db.execute(
        'UPDATE player_state SET fatigue = MIN(100, fatigue + ?) WHERE player_id = ?;',
        [fatigueConsumed, characterId]
      );

      const expGained = quality === 'LEGENDARY' ? 120 : quality === 'MASTERWORK' ? 80 : 50;
      this.db.execute(
        `UPDATE character_professions 
         SET current_exp = current_exp + ? 
         WHERE character_id = ? AND category = 'CRAFTING';`,
        [expGained, characterId]
      );

      // 6. Handle Target Destination: Warehouse vs Equip vs Gift
      const destination = params.targetDestination;
      let equippedSlot: EquipmentSlotType | undefined;
      let giftResult: BespokeWeaponForgeResult['giftResult'] | undefined;

      if (destination === 'EQUIP_IMMEDIATELY') {
        equippedSlot = 'WEAPON';
        // Add bespoke weapon directly to personal possessions (no slot limitation)
        this.db.execute(
          `INSERT INTO character_equipment (character_id, slot_type, item_code, custom_name, stat_modifiers, equipped_at)
           VALUES (?, 'WEAPON', ?, ?, ?, CURRENT_TIMESTAMP);`,
          [characterId, bespokeItemCode, finalName, JSON.stringify(statModifiers)]
        );
      } else if (destination === 'GIFT_TO_NPC' && params.giftTargetNpcId) {
        const npcId = params.giftTargetNpcId;
        const npc = this.db.queryOne<any>(
          'SELECT npc_id, name_vi, name_en FROM master_characters WHERE npc_id = ?;',
          [npcId]
        );
        const npcName = npc ? npc.name_vi : npcId;

        // Add to NPC personal possessions (no slot limitation)
        this.db.execute(
          `INSERT INTO character_equipment (character_id, slot_type, item_code, custom_name, stat_modifiers, equipped_at)
           VALUES (?, 'WEAPON', ?, ?, ?, CURRENT_TIMESTAMP);`,
          [npcId, bespokeItemCode, finalName, JSON.stringify(statModifiers)]
        );

        // Add relationship delta for gifting God Weapon
        const affinityBonus = quality === 'LEGENDARY' ? 35 : quality === 'MASTERWORK' ? 25 : 15;
        this.db.execute(
          `INSERT INTO npc_relationship_deltas (npc_id, turn_number, delta_points, sentiment_shift, reason_vi, reason_en)
           VALUES (?, ?, ?, 'DEVOTED', ?, ?);`,
          [
            npcId,
            meta.activeTurn,
            affinityBonus,
            `Được Lương Diễn tặng Thần Binh [${finalName}] (Phẩm cấp: ${qualityLabelVi})`,
            `Presented bespoke god weapon [${finalName}] by Liang Yan`
          ]
        );

        giftResult = {
          npcId,
          npcName,
          affinityGained: affinityBonus,
          messageVi: `Đã tặng [${finalName}] cho ${npcName}! Hảo cảm tăng thêm +${affinityBonus} điểm!`
        };
      } else {
        // Output into warehouse inventory
        this.db.execute(
          `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
           VALUES (?, 'MILITARY_EQUIPMENT', ?, 1, 1200, 'Zhuo Workshop')
           ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + 1;`,
          [bespokeItemCode, `${finalName} (${qualityLabelVi})`]
        );

        this.db.execute(
          `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
           VALUES (?, ?, ?, 'PRODUCTION_OUTPUT', 1, 1200, 1, 'BESPOKE_FORGE');`,
          [`MOV-FORGE-OUT-${Date.now()}`, meta.currentDate, bespokeItemCode]
        );
      }

      const warModText = `+${statModifiers.war} Võ Lực`;
      const ldrModText = statModifiers.ldr ? `, +${statModifiers.ldr} Thống Soái` : '';
      const messageVi = `Đoán tạo thành công [${finalName}]! Phẩm cấp: ${qualityLabelVi} (${warModText}${ldrModText}). Tiêu hao 25 Thể Lực (+${expGained} EXP Nghề rèn)!`;

      return {
        success: true,
        itemCode: bespokeItemCode,
        customName: finalName,
        nameVi: finalName,
        nameEn: finalName,
        quality,
        qualityLabelVi,
        statModifiers,
        fatigueConsumed,
        expGained,
        materialsConsumed: consumedItems,
        destination,
        equippedSlot,
        giftResult,
        messageVi,
        messageEn: `Successfully forged bespoke god weapon [${finalName}] (${quality})!`
      };
    });
  }

  // =========================================================================
  // 2. STANDARD ARMAMENT FORGING ENGINE
  // =========================================================================

  /**
   * Forges standard mass-produced armaments: Han Sword, Iron Spear, Reinforced Shield, Leather Armor.
   */
  public forgeStandardArmament(params: StandardArmamentForgeParams): StandardArmamentForgeResult {
    const characterId = params.characterId || 'PLY-0001';
    const quantity = Math.max(1, params.quantity || 1);
    const meta = this.getCampaignMeta();

    const standardCatalog: Record<
      string,
      {
        nameVi: string;
        nameEn: string;
        slot: EquipmentSlotType;
        fatiguePerUnit: number;
        expPerUnit: number;
        baseStats: Record<string, number>;
        bom: Array<{ itemCode: string; nameVi: string; qtyPerUnit: number }>;
      }
    > = {
      'COM-SWORD': {
        nameVi: 'Hán Trực Đao Bách Luyện',
        nameEn: 'Han Standard Dao Sword',
        slot: 'WEAPON',
        fatiguePerUnit: 12,
        expPerUnit: 25,
        baseStats: { war: 2 },
        bom: [
          { itemCode: 'RAW-IRON-INGOT', nameVi: 'Sắt Thỏi Tinh Luyện', qtyPerUnit: 2 },
          { itemCode: 'RAW-TIMBER-OAK', nameVi: 'Gỗ Sồi Quân Nhu', qtyPerUnit: 1 },
          { itemCode: 'RAW-CHARCOAL-BAG', nameVi: 'Than Đen Lò Nung', qtyPerUnit: 1 }
        ]
      },
      'COM-SPEAR': {
        nameVi: 'Thương Sắt Bộ Binh Tiêu Chuẩn',
        nameEn: 'Infantry Iron Spear',
        slot: 'WEAPON',
        fatiguePerUnit: 12,
        expPerUnit: 25,
        baseStats: { war: 2 },
        bom: [
          { itemCode: 'RAW-IRON-INGOT', nameVi: 'Sắt Thỏi Tinh Luyện', qtyPerUnit: 2 },
          { itemCode: 'RAW-TIMBER-OAK', nameVi: 'Gỗ Sồi Quân Nhu', qtyPerUnit: 2 },
          { itemCode: 'RAW-CHARCOAL-BAG', nameVi: 'Than Đen Lò Nung', qtyPerUnit: 1 }
        ]
      },
      'PROD-SHIELD-BAM': {
        nameVi: 'Khiên Trúc Bọc Da Quân Dụng',
        nameEn: 'Reinforced Bamboo Shield',
        slot: 'ARMOR',
        fatiguePerUnit: 10,
        expPerUnit: 20,
        baseStats: { war: 1, ldr: 1 },
        bom: [
          { itemCode: 'COM-BAMBOO', nameVi: 'Tre Trúc Phương Bắc', qtyPerUnit: 2 },
          { itemCode: 'COM-LEATH', nameVi: 'Da Thuộc Cắt Mảnh', qtyPerUnit: 1 }
        ]
      },
      'EQP-ARMOR-LEATHER': {
        nameVi: 'Áo Giáp Da Khâu Đinh Tán',
        nameEn: 'Riveted Leather Armor',
        slot: 'ARMOR',
        fatiguePerUnit: 15,
        expPerUnit: 30,
        baseStats: { war: 1, ldr: 2 },
        bom: [
          { itemCode: 'COM-LEATH', nameVi: 'Da Thuộc Cắt Mảnh', qtyPerUnit: 3 },
          { itemCode: 'RAW-IRON-INGOT', nameVi: 'Sắt Thỏi Tinh Luyện', qtyPerUnit: 1 }
        ]
      }
    };

    const def = standardCatalog[params.armamentCode];
    if (!def) {
      throw new Error(`Armament code ${params.armamentCode} is not in standard blacksmith catalog.`);
    }

    return this.db.transaction(() => {
      const player = this.db.queryOne<any>(
        'SELECT fatigue FROM player_state WHERE player_id = ?;',
        [characterId]
      );
      const totalFatigue = def.fatiguePerUnit * quantity;
      if (player && player.fatigue + totalFatigue > 100) {
        throw new Error(
          `Khí lực không đủ (${player.fatigue}/100)! Cần ${totalFatigue} Thể Lực để đúc ${quantity} đơn vị ${def.nameVi}.`
        );
      }

      // Check materials
      const consumedMaterials: Array<{ itemCode: string; itemNameVi: string; quantity: number }> = [];
      for (const item of def.bom) {
        const requiredTotal = item.qtyPerUnit * quantity;
        const stock = this.db.queryOne<{ quantity: number }>(
          'SELECT quantity FROM inventory_items WHERE item_code = ?;',
          [item.itemCode]
        );
        const available = stock ? stock.quantity : 0;
        if (available < requiredTotal) {
          throw new Error(
            `Thiếu nguyên liệu [${item.nameVi}]: cần ${requiredTotal}, hiện có ${available}.`
          );
        }
      }

      // Deduct materials
      for (const item of def.bom) {
        const requiredTotal = item.qtyPerUnit * quantity;
        this.db.execute(
          'UPDATE inventory_items SET quantity = quantity - ? WHERE item_code = ?;',
          [requiredTotal, item.itemCode]
        );
        this.db.execute(
          `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
           VALUES (?, ?, ?, 'PRODUCTION_CONSUME', ?, 30, (SELECT quantity FROM inventory_items WHERE item_code = ?), ?);`,
          [`MOV-STD-FORGE-${Date.now()}-${item.itemCode}`, meta.currentDate, item.itemCode, requiredTotal, item.itemCode, params.armamentCode]
        );
        consumedMaterials.push({
          itemCode: item.itemCode,
          itemNameVi: item.nameVi,
          quantity: requiredTotal
        });
      }

      // Add finished goods to warehouse
      this.db.execute(
        `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
         VALUES (?, 'MILITARY_EQUIPMENT', ?, ?, 350, 'Zhuo Workshop')
         ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + ?;`,
        [params.armamentCode, def.nameVi, quantity, quantity]
      );

      this.db.execute(
        `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
         VALUES (?, ?, ?, 'PRODUCTION_OUTPUT', ?, 350, (SELECT quantity FROM inventory_items WHERE item_code = ?), ?);`,
        [`MOV-STD-OUT-${Date.now()}`, meta.currentDate, params.armamentCode, quantity, params.armamentCode, params.armamentCode]
      );

      // Deduct stamina and award EXP
      this.db.execute('UPDATE player_state SET fatigue = MIN(100, fatigue + ?) WHERE player_id = ?;', [
        totalFatigue,
        characterId
      ]);

      const expGain = def.expPerUnit * quantity;
      this.db.execute(
        `UPDATE character_professions 
         SET current_exp = current_exp + ? 
         WHERE character_id = ? AND category = 'CRAFTING';`,
        [expGain, characterId]
      );

      return {
        success: true,
        armamentCode: params.armamentCode,
        nameVi: def.nameVi,
        nameEn: def.nameEn,
        quantity,
        fatigueConsumed: totalFatigue,
        expGained: expGain,
        materialsConsumed: consumedMaterials,
        destination: 'WAREHOUSE',
        messageVi: `Rèn thành công ${quantity}x [${def.nameVi}] nhập kho! Tiêu hao ${totalFatigue} Thể Lực (+${expGain} EXP Nghề rèn).`
      };
    });
  }

  // =========================================================================
  // 3. EQUIPMENT MANAGEMENT ENGINE (4 Slots: Weapon, Armor, Steed, Treasure)
  // =========================================================================

  /**
   * Retrieves complete equipment overview for a character (Player or NPC).
   * Renders 4 slots: [兵] Weapon, [甲] Armor, [馬] Steed, [策] Treasure.
   * Calculates individual buffs and effective attributes with golden highlight (>100).
   */
  public getCharacterEquipment(characterId: string = 'PLY-0001'): CharacterEquipmentOverview {
    const isPlayer = characterId.startsWith('PLY');

    // 1. Fetch character base attributes
    let baseAttrs: Record<string, number> = {
      war: 50,
      ldr: 50,
      int: 50,
      pol: 50,
      dip: 50,
      com: 50,
      cra: 50
    };
    let charName = characterId;
    let styleName = '';

    if (isPlayer) {
      const p = this.db.queryOne<any>(
        'SELECT name, style_name, war_attr, ldr_attr, int_attr, pol_attr, dip_attr, com_attr, cra_attr FROM player_state WHERE player_id = ?;',
        [characterId]
      );
      if (p) {
        charName = p.name || 'Lương Diễn';
        styleName = p.style_name || 'Chí Viễn';
        baseAttrs = {
          war: p.war_attr || 50,
          ldr: p.ldr_attr || 50,
          int: p.int_attr || 50,
          pol: p.pol_attr || 50,
          dip: p.dip_attr || 50,
          com: p.com_attr || 50,
          cra: p.cra_attr || 50
        };
      }
    } else {
      const npc = this.db.queryOne<any>(
        'SELECT name_vi, style_name_vi, war_attr, ldr_attr, int_attr, pol_attr, dip_attr, com_attr, cra_attr FROM master_characters WHERE npc_id = ?;',
        [characterId]
      );
      if (npc) {
        charName = npc.name_vi;
        styleName = npc.style_name_vi || '';
        baseAttrs = {
          war: npc.war_attr || 50,
          ldr: npc.ldr_attr || 50,
          int: npc.int_attr || 50,
          pol: npc.pol_attr || 50,
          dip: npc.dip_attr || 50,
          com: npc.com_attr || 50,
          cra: npc.cra_attr || 50
        };
      }
    }

    // 2. Fetch equipped gear from character_equipment
    const equippedRows = this.db.query<any>(
      'SELECT id, character_id, slot_type, item_code, custom_name, stat_modifiers, equipped_at FROM character_equipment WHERE character_id = ?;',
      [characterId]
    );

    const slotMetadata: Record<EquipmentSlotType, { icon: string; vi: string; en: string }> = {
      WEAPON: { icon: '', vi: 'Binh Khí', en: 'Weapon' },
      ARMOR: { icon: '', vi: 'Khôi Giáp', en: 'Armor' },
      STEED: { icon: '', vi: 'Chiến Mã', en: 'Steed' },
      TREASURE: { icon: '', vi: 'Bảo Vật & Binh Thư', en: 'Treasure' }
    };

    const slots: Record<EquipmentSlotType, EquippedItem | null> = {
      WEAPON: null,
      ARMOR: null,
      STEED: null,
      TREASURE: null
    };

    const equipmentBuffs: Record<string, number> = {
      war: 0,
      ldr: 0,
      int: 0,
      pol: 0,
      dip: 0,
      com: 0,
      cra: 0
    };

    const equippedItems: EquippedItem[] = [];

    for (const row of equippedRows) {
      const slotType = (row.slot_type as EquipmentSlotType) || 'TREASURE';
      const meta = slotMetadata[slotType] || { icon: '', vi: 'Bảo Vật', en: 'Treasure' };

      let stats: Record<string, number> = {};
      try {
        stats = typeof row.stat_modifiers === 'string' ? JSON.parse(row.stat_modifiers) : (row.stat_modifiers || {});
      } catch {
        stats = {};
      }

      // Clamp stat modifiers between +1 and +5
      const clampedStats: Record<string, number> = {};
      for (const [k, v] of Object.entries(stats)) {
        const normK = k.toLowerCase().replace(/_attr$|_exp$/, '').trim();
        const clampedVal = BlacksmithForgeService.clampStatModifier(v);
        clampedStats[normK] = clampedVal;
        if (equipmentBuffs.hasOwnProperty(normK)) {
          equipmentBuffs[normK] += clampedVal;
        }
      }

      // Resolve item names and descriptions from master_items if needed
      let itemNameVi = row.custom_name;
      let itemNameEn = row.custom_name;
      let descriptionVi = '';
      const master = this.db.queryOne<any>(
        'SELECT name_vi, name_en, description_vi FROM master_items WHERE item_code = ?;',
        [row.item_code]
      );
      if (master) {
        if (!itemNameVi) itemNameVi = master.name_vi;
        if (!itemNameEn) itemNameEn = master.name_en;
        descriptionVi = master.description_vi || '';
      } else {
        if (!itemNameVi) itemNameVi = row.item_code;
        if (!itemNameEn) itemNameEn = row.item_code;
      }

      // Infer quality
      const maxBuff = Math.max(...Object.values(clampedStats), 1);
      const quality: EquipmentQuality =
        maxBuff >= 5 ? 'LEGENDARY' : maxBuff >= 4 ? 'MASTERWORK' : maxBuff >= 3 ? 'FINE' : 'NORMAL';

      const itemObj: EquippedItem = {
        id: row.id,
        characterId: row.character_id,
        slotType,
        itemCode: row.item_code,
        customName: row.custom_name || itemNameVi,
        nameVi: itemNameVi,
        nameEn: itemNameEn,
        quality,
        statModifiers: clampedStats,
        slotIcon: meta.icon,
        slotLabelVi: meta.vi,
        slotLabelEn: meta.en,
        equippedAt: row.equipped_at,
        descriptionVi
      };

      equippedItems.push(itemObj);

      // Keep primary slot item for backward compatibility
      if (!slots[slotType] && VALID_EQUIPMENT_SLOTS.includes(slotType as any)) {
        slots[slotType] = itemObj;
      }
    }

    // 3. Compute effective attributes and >100 golden cap highlight
    const effectiveAttributes: Record<string, number> = {};
    const exceedsLimit: Record<string, boolean> = {};

    for (const [key, baseVal] of Object.entries(baseAttrs)) {
      const buffVal = equipmentBuffs[key] || 0;
      const total = baseVal + buffVal;
      effectiveAttributes[key] = total;
      exceedsLimit[key] = total > 100;
    }

    return {
      characterId,
      characterName: charName,
      styleName,
      isPlayer,
      baseAttributes: baseAttrs,
      equipmentBuffs,
      effectiveAttributes,
      exceedsLimit,
      slots,
      equippedItems,
      items: equippedItems,
      possessedCount: equippedItems.length
    };
  }

  /**
   * 1-Click Equip from warehouse inventory to a character slot.
   */
  public equipItem(
    characterId: string,
    slotType: EquipmentSlotType,
    itemCode: string,
    customName?: string,
    statModifiers?: Record<string, number>
  ): { success: boolean; messageVi: string; overview: CharacterEquipmentOverview } {
    return this.db.transaction(() => {
      // 1. Check stock in inventory
      const stock = this.db.queryOne<any>(
        'SELECT quantity, description FROM inventory_items WHERE item_code = ?;',
        [itemCode]
      );
      if (!stock || stock.quantity < 1) {
        throw new Error(`Vật phẩm [${itemCode}] không còn trong kho đồ!`);
      }

      // 2. Deduct 1 from warehouse inventory
      this.db.execute(
        'UPDATE inventory_items SET quantity = quantity - 1 WHERE item_code = ?;',
        [itemCode]
      );

      // 3. Resolve default stat modifiers if not provided
      let finalStats = statModifiers;
      if (!finalStats) {
        finalStats = this.getDefaultStatModifiersForItem(itemCode, slotType);
      }

      // Clamp all stat modifiers strictly between +1 and +5
      const clampedStats: Record<string, number> = {};
      for (const [k, v] of Object.entries(finalStats)) {
        clampedStats[k] = BlacksmithForgeService.clampStatModifier(v);
      }

      const finalName = customName || stock.description || itemCode;

      // 4. Insert into character_equipment (No 4-slot limit, characters can possess multiple items!)
      this.db.execute(
        `INSERT INTO character_equipment (character_id, slot_type, item_code, custom_name, stat_modifiers, equipped_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP);`,
        [characterId, slotType, itemCode, finalName, JSON.stringify(clampedStats)]
      );

      const buffText = Object.entries(clampedStats).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ');
      const overview = this.getCharacterEquipment(characterId);
      return {
        success: true,
        messageVi: `Đã mang theo [${finalName}] vào danh sách bảo vật sở hữu (${buffText})!`,
        overview
      };
    });
  }

  /**
   * 1-Click Unequip an item from personal possession back to warehouse inventory.
   */
  public unequipItem(
    characterId: string,
    slotTypeOrItemCode: string,
    equipmentId?: number
  ): { success: boolean; messageVi: string; overview: CharacterEquipmentOverview } {
    return this.db.transaction(() => {
      let existing: any = null;

      if (equipmentId) {
        existing = this.db.queryOne<any>(
          'SELECT id, item_code, custom_name, slot_type FROM character_equipment WHERE character_id = ? AND id = ?;',
          [characterId, equipmentId]
        );
      }

      if (!existing && slotTypeOrItemCode) {
        existing = this.db.queryOne<any>(
          'SELECT id, item_code, custom_name, slot_type FROM character_equipment WHERE character_id = ? AND item_code = ? ORDER BY id DESC LIMIT 1;',
          [characterId, slotTypeOrItemCode]
        );
      }

      if (!existing && slotTypeOrItemCode) {
        existing = this.db.queryOne<any>(
          'SELECT id, item_code, custom_name, slot_type FROM character_equipment WHERE character_id = ? AND slot_type = ? ORDER BY id DESC LIMIT 1;',
          [characterId, slotTypeOrItemCode]
        );
      }

      if (!existing) {
        throw new Error(`Không tìm thấy vật phẩm sở hữu để cất vào kho.`);
      }

      // Remove from character_equipment
      this.db.execute(
        'DELETE FROM character_equipment WHERE id = ?;',
        [existing.id]
      );

      // Return item to inventory
      this.db.execute(
        `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
         VALUES (?, 'MILITARY_EQUIPMENT', ?, 1, 400, 'Zhuo Workshop')
         ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + 1;`,
        [existing.item_code, existing.custom_name || existing.item_code]
      );

      const overview = this.getCharacterEquipment(characterId);
      return {
        success: true,
        messageVi: `Đã cất [${existing.custom_name || existing.item_code}] vào kho hàng!`,
        overview
      };
    });
  }

  /**
   * Resolves default stat modifiers based on item catalog heuristics.
   */
  private getDefaultStatModifiersForItem(itemCode: string, slotType: EquipmentSlotType): Record<string, number> {
    if (slotType === 'WEAPON') {
      if (itemCode.includes('GREEN-DRAGON') || itemCode.includes('SKY-PIERCER')) return { war: 5, ldr: 2 };
      if (itemCode.includes('SERPENT') || itemCode.includes('HEAVEN')) return { war: 5, ldr: 1 };
      if (itemCode.includes('SPEAR') || itemCode.includes('SWORD')) return { war: 3 };
      return { war: 2 };
    }
    if (slotType === 'ARMOR') {
      if (itemCode.includes('LEATHER')) return { war: 1, ldr: 2 };
      if (itemCode.includes('SHIELD')) return { war: 1, ldr: 1 };
      return { ldr: 2 };
    }
    if (slotType === 'STEED') {
      if (itemCode.includes('RED-HARE')) return { war: 5, ldr: 3 };
      if (itemCode.includes('SHADOW') || itemCode.includes('DILU')) return { war: 4, ldr: 2 };
      if (itemCode.includes('HORSE-W')) return { war: 2, ldr: 2 };
      return { ldr: 1 };
    }
    if (slotType === 'TREASURE') {
      if (itemCode.includes('SUN-TZU')) return { ldr: 5, int: 5 };
      if (itemCode.includes('BOOK')) return { int: 3, pol: 2 };
      return { int: 2 };
    }
    return { war: 1 };
  }

  /**
   * Retrieves warehouse items compatible with each of the 4 equipment slots.
   */
  public getCompatibleWarehouseItems(targetSlot?: EquipmentSlotType): Record<EquipmentSlotType, any[]> {
    const rows = this.db.query<any>(
      `SELECT item_code as itemCode, category, description, quantity, unit_cost_basis as unitCostBasis 
       FROM inventory_items 
       WHERE quantity >= 1 
       ORDER BY category, item_code;`
    );

    const result: Record<EquipmentSlotType, any[]> = {
      WEAPON: [],
      ARMOR: [],
      STEED: [],
      TREASURE: []
    };

    for (const r of rows) {
      const code = r.itemCode.toUpperCase();
      const cat = (r.category || '').toUpperCase();

      // Check WEAPON
      if (
        code.startsWith('WPN-') ||
        code.startsWith('WEAP-') ||
        code.includes('SWORD') ||
        code.includes('SPEAR') ||
        code.includes('CROSSBOW') ||
        cat === 'MILITARY SPOILS'
      ) {
        result.WEAPON.push({
          ...r,
          slotType: 'WEAPON',
          suggestedStats: this.getDefaultStatModifiersForItem(r.itemCode, 'WEAPON')
        });
      }

      // Check ARMOR
      if (code.includes('SHIELD') || code.includes('ARMOR') || code.includes('HELMET') || code.includes('CUIRASS')) {
        result.ARMOR.push({
          ...r,
          slotType: 'ARMOR',
          suggestedStats: this.getDefaultStatModifiersForItem(r.itemCode, 'ARMOR')
        });
      }

      // Check STEED
      if (code.startsWith('HRS-') || code.startsWith('MOUNT-') || code.includes('HORSE') || cat === 'LIVESTOCK') {
        result.STEED.push({
          ...r,
          slotType: 'STEED',
          suggestedStats: this.getDefaultStatModifiersForItem(r.itemCode, 'STEED')
        });
      }

      // Check TREASURE
      if (
        code.startsWith('BOOK-') ||
        code.includes('GOLD-INGOT') ||
        code.includes('SILK') ||
        code.includes('SEAL') ||
        code.includes('CERAMIC') ||
        code.includes('TEA')
      ) {
        result.TREASURE.push({
          ...r,
          slotType: 'TREASURE',
          suggestedStats: this.getDefaultStatModifiersForItem(r.itemCode, 'TREASURE')
        });
      }
    }

    if (targetSlot) {
      return { [targetSlot]: result[targetSlot] } as any;
    }
    return result;
  }

  // =========================================================================
  // 4. FREE ENTERPRISE & LABOR ENGINE (Unified via EnterpriseLaborService)
  // =========================================================================

  /**
   * Retrieves enterprise status: owned businesses and available labor shifts.
   */
  public getEnterpriseStatus(characterId: string = 'PLY-0001') {
    return EnterpriseLaborService.getInstance(this.db).getEnterpriseStatus(characterId);
  }

  /**
   * Executes an instant work shift for wages, fatigue cost, and profession EXP.
   */
  public performLaborShift(characterId: string = 'PLY-0001', shiftId: string) {
    return EnterpriseLaborService.getInstance(this.db).performLaborShift(characterId, shiftId);
  }

  /**
   * Opens a new business enterprise.
   */
  public openBusiness(
    characterId: string = 'PLY-0001',
    businessTypeId: string,
    customName?: string,
    turnkey: boolean = true
  ) {
    return EnterpriseLaborService.getInstance(this.db).openBusiness(characterId, businessTypeId, customName, turnkey);
  }

  /**
   * Collects accumulated profits from an enterprise into the player's personal cash.
   */
  public collectProfits(businessId: string, withdrawAmount?: number) {
    return EnterpriseLaborService.getInstance(this.db).collectProfits(businessId, withdrawAmount);
  }
}

// =========================================================================
// ROUTER REGISTRATION FOR MODULAR BACKEND
// =========================================================================

/**
 * Registers all Blacksmith, Equipment, and Enterprise routes into the provided Router instance.
 */
export function registerBlacksmithForgeRoutes(router: Router): void {
  const service = BlacksmithForgeService.getInstance();

  // 1. GET /api/equipment
  router.get('/api/equipment', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = (ctx.query.characterId as string) || 'PLY-0001';
      const overview = service.getCharacterEquipment(characterId);
      const compatible = service.getCompatibleWarehouseItems();
      sendJson(res, 200, { success: true, overview, compatibleWarehouseItems: compatible });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  // 2. POST /api/equipment/equip
  router.post('/api/equipment/equip', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const {
        characterId = 'PLY-0001',
        slotType,
        itemCode,
        customName,
        statModifiers
      } = ctx.body || {};

      if (!slotType || !itemCode) {
        sendJson(res, 400, { success: false, error: 'slotType and itemCode are required.' });
        return;
      }

      const result = service.equipItem(characterId, slotType as EquipmentSlotType, itemCode, customName, statModifiers);
      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  });

  // 3. POST /api/equipment/unequip
  router.post('/api/equipment/unequip', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const { characterId = 'PLY-0001', slotType, itemCode, equipmentId } = ctx.body || {};
      const target = equipmentId ? String(equipmentId) : (itemCode || slotType);
      if (!target && !equipmentId) {
        sendJson(res, 400, { success: false, error: 'itemCode, equipmentId, or slotType is required.' });
        return;
      }
      const result = service.unequipItem(characterId, target, equipmentId ? Number(equipmentId) : undefined);
      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  });

  // 4. POST /api/professions/forge/bespoke
  router.post('/api/professions/forge/bespoke', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const payload: BespokeWeaponForgeParams = ctx.body || {};
      const result = service.forgeBespokeGodWeapon(payload);
      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  });

  // 4b. GET /api/professions/forge/rates
  router.get('/api/professions/forge/rates', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = (ctx.query.characterId as string) || 'PLY-0001';
      const playerStats = service.getPlayerSmithingStats(characterId);
      const rates = BlacksmithForgeService.calculateForgeOdds(
        playerStats.craAttr,
        playerStats.fatigue,
        playerStats.craftsmanTier
      );
      sendJson(res, 200, { success: true, player: playerStats, rates });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  // 5. POST /api/professions/forge/standard
  router.post('/api/professions/forge/standard', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const payload: StandardArmamentForgeParams = ctx.body || {};
      const result = service.forgeStandardArmament(payload);
      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  });

  // 6. GET /api/enterprise/status
  router.get('/api/enterprise/status', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = (ctx.query.characterId as string) || 'PLY-0001';
      const status = service.getEnterpriseStatus(characterId);
      sendJson(res, 200, { success: true, status });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });

  // 7. POST /api/enterprise/work
  router.post('/api/enterprise/work', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const { characterId = 'PLY-0001', shiftId } = ctx.body || {};
      if (!shiftId) {
        sendJson(res, 400, { success: false, error: 'shiftId is required.' });
        return;
      }
      const result = service.performLaborShift(characterId, shiftId);
      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  });

  // 8. POST /api/enterprise/open
  router.post('/api/enterprise/open', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const { characterId = 'PLY-0001', businessType, customName, turnkey = true } = ctx.body || {};
      if (!businessType) {
        sendJson(res, 400, { success: false, error: 'businessType is required.' });
        return;
      }
      const result = service.openBusiness(characterId, businessType, customName, Boolean(turnkey));
      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  });

  // 9. POST /api/enterprise/collect - Collect accrued profits from owned enterprise
  router.post('/api/enterprise/collect', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const { characterId = 'PLY-0001', businessId, amount } = ctx.body || {};
      if (!businessId) {
        sendJson(res, 400, { success: false, error: 'businessId is required.' });
        return;
      }
      const result = service.collectProfits(businessId, amount ? Number(amount) : undefined);
      const status = service.getEnterpriseStatus(characterId);
      sendJson(res, 200, { ...result, status });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  });
}

// Auto-register routes to global Grand Strategy router if present in memory
if (typeof (globalThis as any).__GRAND_STRATEGY_ROUTER__ !== 'undefined') {
  try {
    registerBlacksmithForgeRoutes((globalThis as any).__GRAND_STRATEGY_ROUTER__);
    console.log('[BlacksmithForgeService] [ROUTER] Auto-attached routes to Grand Strategy Router.');
  } catch (err) {
    console.warn('[BlacksmithForgeService] Notice on auto-registering router:', err);
  }
}
