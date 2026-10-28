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

export type EquipmentSlotType = 'WEAPON' | 'ARMOR' | 'STEED' | 'TREASURE';
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
}

export interface BespokeWeaponForgeParams {
  characterId?: string;
  weaponType?: 'SWORD' | 'SPEAR' | 'HALBERD' | 'BLADE' | 'BOW';
  customName?: string;
  targetDestination: 'WAREHOUSE' | 'EQUIP_IMMEDIATELY' | 'GIFT_TO_NPC';
  giftTargetNpcId?: string;
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
          equipped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(character_id, slot_type)
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

      // 3. Roll Quality (Normal, Fine, Masterwork, Legendary)
      // Quality score formula: 1..60 (base) + (CRA - 60) * 1.25 + 1..20 (furnace luck)
      const baseRoll = Math.floor(Math.random() * 60) + 1;
      const craBonus = Math.floor((currentCra - 60) * 1.25);
      const luckRoll = Math.floor(Math.random() * 20) + 1;
      const totalScore = baseRoll + craBonus + luckRoll;

      let quality: EquipmentQuality = 'NORMAL';
      let qualityLabelVi = 'Phổ Thông (Hảo Binh)';
      let rawWarMod = 1;
      let rawLdrMod = 0;

      if (totalScore >= 90) {
        quality = 'LEGENDARY';
        qualityLabelVi = 'Tuyệt Thế Thần Binh';
        rawWarMod = 5;
        rawLdrMod = 2;
      } else if (totalScore >= 72) {
        quality = 'MASTERWORK';
        qualityLabelVi = 'Bách Luyện Tinh Cương';
        rawWarMod = 4;
        rawLdrMod = 1;
      } else if (totalScore >= 45) {
        quality = 'FINE';
        qualityLabelVi = 'Tinh Luyện Thượng Phẩm';
        rawWarMod = 3;
        rawLdrMod = 1;
      } else {
        quality = 'NORMAL';
        qualityLabelVi = 'Phổ Thông Hảo Binh';
        rawWarMod = 2;
        rawLdrMod = 0;
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
        // Unequip old weapon if present
        const oldGear = this.db.queryOne<any>(
          'SELECT item_code, custom_name FROM character_equipment WHERE character_id = ? AND slot_type = ?;',
          [characterId, 'WEAPON']
        );
        if (oldGear) {
          // Return old weapon to warehouse
          this.db.execute(
            `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
             VALUES (?, 'MILITARY_EQUIPMENT', ?, 1, 400, 'Zhuo Workshop')
             ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + 1;`,
            [oldGear.item_code, oldGear.custom_name || 'Binh Khí Hoán Đổi']
          );
        }

        // Equip new bespoke weapon
        this.db.execute(
          `INSERT INTO character_equipment (character_id, slot_type, item_code, custom_name, stat_modifiers, equipped_at)
           VALUES (?, 'WEAPON', ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(character_id, slot_type) DO UPDATE SET
             item_code = excluded.item_code,
             custom_name = excluded.custom_name,
             stat_modifiers = excluded.stat_modifiers,
             equipped_at = CURRENT_TIMESTAMP;`,
          [characterId, bespokeItemCode, finalName, JSON.stringify(statModifiers)]
        );
      } else if (destination === 'GIFT_TO_NPC' && params.giftTargetNpcId) {
        const npcId = params.giftTargetNpcId;
        const npc = this.db.queryOne<any>(
          'SELECT npc_id, name_vi, name_en FROM master_characters WHERE npc_id = ?;',
          [npcId]
        );
        const npcName = npc ? npc.name_vi : npcId;

        // Equip onto NPC weapon slot
        this.db.execute(
          `INSERT INTO character_equipment (character_id, slot_type, item_code, custom_name, stat_modifiers, equipped_at)
           VALUES (?, 'WEAPON', ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(character_id, slot_type) DO UPDATE SET
             item_code = excluded.item_code,
             custom_name = excluded.custom_name,
             stat_modifiers = excluded.stat_modifiers,
             equipped_at = CURRENT_TIMESTAMP;`,
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
   * Renders 4 slots: ⚔️ Weapon, 🛡️ Armor, 🐎 Steed, 📜 Treasure.
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
      WEAPON: { icon: '⚔️', vi: 'Binh Khí', en: 'Weapon' },
      ARMOR: { icon: '🛡️', vi: 'Khôi Giáp', en: 'Armor' },
      STEED: { icon: '🐎', vi: 'Chiến Mã', en: 'Steed' },
      TREASURE: { icon: '📜', vi: 'Bảo Vật & Binh Thư', en: 'Treasure' }
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

    for (const row of equippedRows) {
      const slotType = row.slot_type as EquipmentSlotType;
      if (!slots[slotType] && slotMetadata[slotType]) {
        let stats: Record<string, number> = {};
        try {
          stats = typeof row.stat_modifiers === 'string' ? JSON.parse(row.stat_modifiers) : row.stat_modifiers;
        } catch {
          stats = {};
        }

        // Clamp stat modifiers between +1 and +5
        const clampedStats: Record<string, number> = {};
        for (const [k, v] of Object.entries(stats)) {
          clampedStats[k] = BlacksmithForgeService.clampStatModifier(v);
          equipmentBuffs[k] = (equipmentBuffs[k] || 0) + clampedStats[k];
        }

        // Resolve item names from master_items if needed
        let itemNameVi = row.custom_name;
        let itemNameEn = row.custom_name;
        if (!itemNameVi) {
          const master = this.db.queryOne<any>(
            'SELECT name_vi, name_en FROM master_items WHERE item_code = ?;',
            [row.item_code]
          );
          if (master) {
            itemNameVi = master.name_vi;
            itemNameEn = master.name_en;
          } else {
            itemNameVi = row.item_code;
            itemNameEn = row.item_code;
          }
        }

        // Infer quality
        const maxBuff = Math.max(...Object.values(clampedStats), 1);
        const quality: EquipmentQuality =
          maxBuff >= 5 ? 'LEGENDARY' : maxBuff >= 4 ? 'MASTERWORK' : maxBuff >= 3 ? 'FINE' : 'NORMAL';

        slots[slotType] = {
          id: row.id,
          characterId: row.character_id,
          slotType,
          itemCode: row.item_code,
          customName: row.custom_name || itemNameVi,
          nameVi: itemNameVi,
          nameEn: itemNameEn,
          quality,
          statModifiers: clampedStats,
          slotIcon: slotMetadata[slotType].icon,
          slotLabelVi: slotMetadata[slotType].vi,
          slotLabelEn: slotMetadata[slotType].en,
          equippedAt: row.equipped_at
        };
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
      slots
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

      // 2. If slot already occupied, unequip existing item back to inventory
      const existing = this.db.queryOne<any>(
        'SELECT item_code, custom_name FROM character_equipment WHERE character_id = ? AND slot_type = ?;',
        [characterId, slotType]
      );
      if (existing) {
        this.db.execute(
          `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
           VALUES (?, 'MILITARY_EQUIPMENT', ?, 1, 400, 'Zhuo Workshop')
           ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + 1;`,
          [existing.item_code, existing.custom_name || existing.item_code]
        );
      }

      // 3. Deduct 1 from warehouse inventory
      this.db.execute(
        'UPDATE inventory_items SET quantity = quantity - 1 WHERE item_code = ?;',
        [itemCode]
      );

      // 4. Resolve default stat modifiers if not provided
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

      // 5. Insert/Update into character_equipment
      this.db.execute(
        `INSERT INTO character_equipment (character_id, slot_type, item_code, custom_name, stat_modifiers, equipped_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(character_id, slot_type) DO UPDATE SET
           item_code = excluded.item_code,
           custom_name = excluded.custom_name,
           stat_modifiers = excluded.stat_modifiers,
           equipped_at = CURRENT_TIMESTAMP;`,
        [characterId, slotType, itemCode, finalName, JSON.stringify(clampedStats)]
      );

      const overview = this.getCharacterEquipment(characterId);
      return {
        success: true,
        messageVi: `Trang bị thành công [${finalName}] vào ô ${slotType}!`,
        overview
      };
    });
  }

  /**
   * 1-Click Unequip an item from a slot back to warehouse inventory.
   */
  public unequipItem(
    characterId: string,
    slotType: EquipmentSlotType
  ): { success: boolean; messageVi: string; overview: CharacterEquipmentOverview } {
    return this.db.transaction(() => {
      const existing = this.db.queryOne<any>(
        'SELECT item_code, custom_name FROM character_equipment WHERE character_id = ? AND slot_type = ?;',
        [characterId, slotType]
      );

      if (!existing) {
        throw new Error(`Ô trang bị ${slotType} hiện đang trống, không thể tháo.`);
      }

      // Remove from character_equipment
      this.db.execute(
        'DELETE FROM character_equipment WHERE character_id = ? AND slot_type = ?;',
        [characterId, slotType]
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
        messageVi: `Đã tháo [${existing.custom_name || existing.item_code}] cất vào kho!`,
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
  // 4. FREE ENTERPRISE & LABOR ENGINE
  // =========================================================================

  /**
   * Retrieves enterprise status: owned businesses and available labor shifts.
   */
  public getEnterpriseStatus(characterId: string = 'PLY-0001') {
    // 1. Fetch owned businesses
    const businesses = this.db.query<any>(
      `SELECT business_id, name, location_id, manager_npc_id, safe_cash, delegation_level, 
              efficiency_multiplier, current_workforce, monthly_capacity_hours, monthly_rent, status 
       FROM businesses;`
    );

    // 2. Fetch player liquid cash and stamina
    const player = this.db.queryOne<any>(
      'SELECT liquid_cash, safe_cash, fatigue, cra_attr FROM player_state WHERE player_id = ?;',
      [characterId]
    );

    // 3. Define available business types that player can open
    const openableTypes: EnterpriseTypeDef[] = [
      {
        typeId: 'FORGE',
        titleVi: 'Lò Rèn Bách Nghệ & Quân Khí Phường',
        titleEn: 'Blacksmith Weaponry & Tool Forge',
        descriptionVi: 'Lò đúc binh khí, khiên giáp, nông cụ và móng ngựa. Phục vụ quân nhu chiến trận và dân sinh.',
        startupCash: 5000,
        requiredMaterials: [
          { itemCode: 'RAW-TIMBER-OAK', itemNameVi: 'Gỗ Sồi Quân Nhu', quantity: 6 },
          { itemCode: 'RAW-IRON-INGOT', itemNameVi: 'Sắt Thỏi Tinh Luyện', quantity: 6 }
        ],
        monthlyRent: 250,
        baseWorkforce: 4,
        projectedMonthlyRevenueMin: 900,
        projectedMonthlyRevenueMax: 1800,
        icon: '🔨'
      },
      {
        typeId: 'TAVERN',
        titleVi: 'Tửu Điếm Đào Viên Hào Kiệt Quán',
        titleEn: 'Peach Orchard Tavern & Inn',
        descriptionVi: 'Quán rượu điểm tâm hội tụ nghĩa sĩ giang hồ, nơi thu thập tin tức tình báo và kinh doanh rượu hoa đào.',
        startupCash: 4000,
        requiredMaterials: [
          { itemCode: 'RAW-TIMBER-OAK', itemNameVi: 'Gỗ Sồi Quân Nhu', quantity: 8 },
          { itemCode: 'COM-GRAIN', itemNameVi: 'Lương Thảo', quantity: 5 }
        ],
        monthlyRent: 200,
        baseWorkforce: 3,
        projectedMonthlyRevenueMin: 700,
        projectedMonthlyRevenueMax: 1400,
        icon: '🍶'
      },
      {
        typeId: 'APOTHECARY',
        titleVi: 'Hồi Xuân Dược Đường & Thảo Dược Quán',
        titleEn: 'Spring Rejuvenation Apothecary & Clinic',
        descriptionVi: 'Hiệu thuốc đông y bào chế cao dán kim sang, hoàn đan cứu thương và bán thảo dược sơn lâm quý hiếm.',
        startupCash: 4500,
        requiredMaterials: [
          { itemCode: 'RAW-TIMBER-OAK', itemNameVi: 'Gỗ Sồi Quân Nhu', quantity: 5 },
          { itemCode: 'RAW-HERB-WILD', itemNameVi: 'Thảo Dược Rừng Tươi', quantity: 8 }
        ],
        monthlyRent: 220,
        baseWorkforce: 3,
        projectedMonthlyRevenueMin: 800,
        projectedMonthlyRevenueMax: 1600,
        icon: '🌿'
      },
      {
        typeId: 'WORKSHOP',
        titleVi: 'Trác Quận Thợ Thủ Công Phường',
        titleEn: 'Zhuo County Artisan Workshop',
        descriptionVi: 'Xưởng dệt chiếu, bện sọt lương và làm đồ gia dụng mây tre đan cho các đoàn thương vận hành.',
        startupCash: 3500,
        requiredMaterials: [
          { itemCode: 'COM-BAMBOO', itemNameVi: 'Tre Trúc U Châu', quantity: 8 },
          { itemCode: 'COM-TWINE', itemNameVi: 'Dây Đay Bền Chắc', quantity: 5 }
        ],
        monthlyRent: 180,
        baseWorkforce: 4,
        projectedMonthlyRevenueMin: 600,
        projectedMonthlyRevenueMax: 1200,
        icon: '🧺'
      }
    ];

    // 4. Define labor shifts for wage earnings ("Đi Làm Thuê Kiếm Sống")
    const laborShifts: LaborShiftDef[] = [
      {
        shiftId: 'SHIFT_FORGE_HAND',
        titleVi: 'Thợ Phụ Kéo Bễ & Đập Búa Lò Rèn',
        titleEn: 'Blacksmith Forge Hand',
        workplaceVi: 'Lò Rèn Bách Nghệ Trác Quận',
        workplaceEn: 'Zhuo Artisan Blacksmith',
        wage: 140,
        fatigueCost: 20,
        professionCode: 'PROF_CRAFTSMAN',
        expGain: 40,
        narrativeVi: 'Kéo bễ lò lửa đỏ rực, cùng đại sư quai búa rèn phôi sắt tôi nước lạnh. Tăng cường thể lực và tay nghề luyện cương.',
        narrativeEn: 'Stoked furnace fires and struck glowing billets alongside master smiths.',
        icon: '⚒️'
      },
      {
        shiftId: 'SHIFT_CHEF_TAVERN',
        titleVi: 'Đầu Bếp & Điều Rượu Tại Tửu Điếm',
        titleEn: 'Tavern Chef & Cellar Master',
        workplaceVi: 'Tửu Điếm Đào Viên',
        workplaceEn: 'Peach Orchard Tavern',
        wage: 110,
        fatigueCost: 15,
        professionCode: 'PROF_MERCHANT',
        expGain: 30,
        narrativeVi: 'Bổ củi nổi lửa, nấu cỗ nhắm và phục vụ rượu hoa đào cho khách thương. Thu thập tin tức tình báo các chư hầu.',
        narrativeEn: 'Prepared banquets and served fragrant wines while eavesdropping on regional gossip.',
        icon: '🍲'
      },
      {
        shiftId: 'SHIFT_HERBALIST',
        titleVi: 'Dược Đồng Bào Chế Thuốc Tại Hiệu Dược',
        titleEn: 'Apothecary Herbalist & Salve Maker',
        workplaceVi: 'Hồi Xuân Dược Đường',
        workplaceEn: 'Spring Apothecary',
        wage: 120,
        fatigueCost: 15,
        professionCode: 'PROF_HERBALIST',
        expGain: 35,
        narrativeVi: 'Dùng cối đá nghiền nát thảo dược, sao chế cao dán kim sang và phân loại dược liệu cứu chữa bách tính.',
        narrativeEn: 'Ground wild roots and brewed soothing trauma balms for townspeople.',
        icon: '🌱'
      },
      {
        shiftId: 'SHIFT_WEAVER',
        titleVi: 'Thợ Thủ Công Đan Phên Tre & Bện Sọt',
        titleEn: 'Artisan Bamboo Basket Weaver',
        workplaceVi: 'Xưởng Thủ Công Lương Gia',
        workplaceEn: 'Liang Workshop',
        wage: 95,
        fatigueCost: 12,
        professionCode: 'PROF_CRAFTSMAN',
        expGain: 25,
        narrativeVi: 'Vót nan tre bện sọt vận lương cho Bắc Quân. Rèn luyện sự tỉ mỉ và nhanh nhạy của đôi bàn tay.',
        narrativeEn: 'Wove heavy-duty supply baskets for northern imperial expeditions.',
        icon: '🎋'
      }
    ];

    return {
      characterId,
      playerCash: player?.liquid_cash || 0,
      playerFatigue: player?.fatigue || 0,
      ownedBusinesses: businesses,
      openableTypes,
      laborShifts
    };
  }

  /**
   * Executes an instant work shift for wages, fatigue cost, and profession EXP.
   */
  public performLaborShift(
    characterId: string = 'PLY-0001',
    shiftId: string
  ): {
    success: boolean;
    wageEarned: number;
    fatigueCost: number;
    expGained: number;
    messageVi: string;
    status: ReturnType<BlacksmithForgeService['getEnterpriseStatus']>;
  } {
    const meta = this.getCampaignMeta();
    const statusData = this.getEnterpriseStatus(characterId);
    const shift = statusData.laborShifts.find(s => s.shiftId === shiftId);

    if (!shift) {
      throw new Error(`Công việc làm thuê [${shiftId}] không tồn tại trong danh sách ca làm.`);
    }

    return this.db.transaction(() => {
      const player = this.db.queryOne<any>(
        'SELECT liquid_cash, fatigue FROM player_state WHERE player_id = ?;',
        [characterId]
      );

      if (player && player.fatigue + shift.fatigueCost > 100) {
        throw new Error(
          `Khí lực kiệt quệ (${player.fatigue}/100)! Không đủ sức nhận ca làm [${shift.titleVi}] (cần ${shift.fatigueCost} Thể Lực).`
        );
      }

      // Add wages to liquid cash
      this.db.execute(
        'UPDATE player_state SET liquid_cash = liquid_cash + ?, fatigue = MIN(100, fatigue + ?) WHERE player_id = ?;',
        [shift.wage, shift.fatigueCost, characterId]
      );

      // Record cashflow ledger
      this.db.execute(
        `INSERT INTO cashflow_ledger (txn_id, game_date, txn_type, amount, balance_after, counterparty, description)
         VALUES (?, ?, 'WAGE_INCOME', ?, (SELECT liquid_cash FROM player_state WHERE player_id = ?), ?, ?);`,
        [
          `TXN-WAGE-${Date.now()}`,
          meta.currentDate,
          shift.wage,
          characterId,
          shift.workplaceVi,
          `Tiền công lao động: ${shift.titleVi}`
        ]
      );

      // Award Profession EXP
      this.db.execute(
        `UPDATE character_professions 
         SET current_exp = current_exp + ? 
         WHERE character_id = ? AND (profession_code = ? OR category = 'CRAFTING');`,
        [shift.expGain, characterId, shift.professionCode]
      );

      const messageVi = `Hoàn thành ca làm [${shift.titleVi}]! Nhận +${shift.wage} Tiền đồng, tiêu hao ${shift.fatigueCost} Thể Lực (+${shift.expGain} EXP Nghề nghiệp).`;

      return {
        success: true,
        wageEarned: shift.wage,
        fatigueCost: shift.fatigueCost,
        expGained: shift.expGain,
        messageVi,
        status: this.getEnterpriseStatus(characterId)
      };
    });
  }

  /**
   * Opens a new business enterprise.
   */
  public openBusiness(
    characterId: string = 'PLY-0001',
    businessTypeId: string,
    customName?: string
  ): { success: boolean; businessId: string; messageVi: string } {
    const meta = this.getCampaignMeta();
    const statusData = this.getEnterpriseStatus(characterId);
    const bizDef = statusData.openableTypes.find(t => t.typeId === businessTypeId);

    if (!bizDef) {
      throw new Error(`Loại hình sản nghiệp [${businessTypeId}] không hợp lệ.`);
    }

    return this.db.transaction(() => {
      const player = this.db.queryOne<any>(
        'SELECT liquid_cash FROM player_state WHERE player_id = ?;',
        [characterId]
      );

      if (!player || player.liquid_cash < bizDef.startupCash) {
        throw new Error(
          `Ngân lượng không đủ! Cần ${bizDef.startupCash} Tiền đồng (hiện có: ${player?.liquid_cash || 0}).`
        );
      }

      // Check materials
      for (const req of bizDef.requiredMaterials) {
        const stock = this.db.queryOne<{ quantity: number }>(
          'SELECT quantity FROM inventory_items WHERE item_code = ?;',
          [req.itemCode]
        );
        const available = stock ? stock.quantity : 0;
        if (available < req.quantity) {
          throw new Error(
            `Thiếu vật liệu xây dựng [${req.itemNameVi}]: cần ${req.quantity}, hiện có ${available}.`
          );
        }
      }

      // Deduct materials
      for (const req of bizDef.requiredMaterials) {
        this.db.execute(
          'UPDATE inventory_items SET quantity = quantity - ? WHERE item_code = ?;',
          [req.quantity, req.itemCode]
        );
        this.db.execute(
          `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
           VALUES (?, ?, ?, 'EXPENSE_ENTERPRISE', ?, 30, (SELECT quantity FROM inventory_items WHERE item_code = ?), 'OPEN_BIZ');`,
          [`MOV-BIZ-${Date.now()}-${req.itemCode}`, meta.currentDate, req.itemCode, req.quantity, req.itemCode]
        );
      }

      // Deduct startup cash
      this.db.execute(
        'UPDATE player_state SET liquid_cash = liquid_cash - ? WHERE player_id = ?;',
        [bizDef.startupCash, characterId]
      );

      this.db.execute(
        `INSERT INTO cashflow_ledger (txn_id, game_date, txn_type, amount, balance_after, counterparty, description)
         VALUES (?, ?, 'CAPITAL_INVESTMENT', ?, (SELECT liquid_cash FROM player_state WHERE player_id = ?), 'Quan Phủ Trác Quận', ?);`,
        [
          `TXN-BIZ-${Date.now()}`,
          meta.currentDate,
          -bizDef.startupCash,
          characterId,
          `Đầu tư khai trương sản nghiệp: ${customName || bizDef.titleVi}`
        ]
      );

      const newBizId = `BIZ-${Date.now().toString(36).toUpperCase()}`;
      const finalName = customName || bizDef.titleVi;

      this.db.execute(
        `INSERT INTO businesses (business_id, name, location_id, manager_npc_id, safe_cash, delegation_level, efficiency_multiplier, current_workforce, monthly_capacity_hours, monthly_rent, auto_procure, status)
         VALUES (?, ?, 'LOC-0001', 'NPC-0007', 1500, 2, 0.9, ?, 800, ?, 1, 'ACTIVE');`,
        [newBizId, finalName, bizDef.baseWorkforce, bizDef.monthlyRent]
      );

      return {
        success: true,
        businessId: newBizId,
        messageVi: `Khai trương thành công sản nghiệp [${finalName}] tại Trác Quận! Đã tuyển dụng ${bizDef.baseWorkforce} nhân công.`
      };
    });
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
      const { characterId = 'PLY-0001', slotType } = ctx.body || {};
      if (!slotType) {
        sendJson(res, 400, { success: false, error: 'slotType is required.' });
        return;
      }
      const result = service.unequipItem(characterId, slotType as EquipmentSlotType);
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
      const { characterId = 'PLY-0001', businessType, customName } = ctx.body || {};
      if (!businessType) {
        sendJson(res, 400, { success: false, error: 'businessType is required.' });
        return;
      }
      const result = service.openBusiness(characterId, businessType, customName);
      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  });
}

// Auto-register routes to global Grand Strategy router if present in memory
if (typeof (globalThis as any).__GRAND_STRATEGY_ROUTER__ !== 'undefined') {
  try {
    registerBlacksmithForgeRoutes((globalThis as any).__GRAND_STRATEGY_ROUTER__);
    console.log('[BlacksmithForgeService] 🛠️ Auto-attached routes to Grand Strategy Router.');
  } catch (err) {
    console.warn('[BlacksmithForgeService] Notice on auto-registering router:', err);
  }
}
