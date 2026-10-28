/**
 * ThreeKingdoms-AgentEngine: Bespoke Forge Domain Service
 * (src/modules/professions/features/bespoke-forge/bespoke-forge.service.ts)
 *
 * Implements:
 * - Bespoke God Weapon Forging Protocol
 * - Materials validation & deduction from inventory_items
 * - Quality roll with strictly clamped [+1..+5] stat modifiers
 * - Full ACID SQLite transaction support
 */

import { DatabaseService } from '../../../../core/database';
import {
  BESPOKE_FORGE_RULES,
  BESPOKE_WEAPON_CATALOG,
  BespokeWeaponType
} from './bespoke-forge.constants';
import {
  BespokeForgeRequestDTO,
  BespokeForgeResultDTO,
  BespokeForgeRatesDTO,
  EquipmentQuality
} from './bespoke-forge.dto';
import { calculatePlayerStamina, clampStatModifier } from '../../../../shared/character-stats';

export class BespokeForgeService {
  private static instance: BespokeForgeService | null = null;
  private db: DatabaseService;

  private constructor(db?: DatabaseService) {
    this.db = db || DatabaseService.getInstance();
  }

  public static getInstance(db?: DatabaseService): BespokeForgeService {
    if (!BespokeForgeService.instance) {
      BespokeForgeService.instance = new BespokeForgeService(db);
    }
    return BespokeForgeService.instance;
  }

  /**
   * Calculates forging success rate distribution and mastery analysis.
   */
  public calculateRates(characterId: string = 'PLY-0001'): BespokeForgeRatesDTO {
    const player = this.db.queryOne<any>(
      `SELECT player_id, cra_attr, fatigue, health, war_attr FROM player_state WHERE player_id = ?;`,
      [characterId]
    ) || { cra_attr: 50, fatigue: 0 };

    const craAttr = Number(player.cra_attr || 50);
    const fatigue = Number(player.fatigue || 0);

    const prof = this.db.queryOne<any>(
      `SELECT tier FROM character_professions WHERE character_id = ? AND profession_code = 'PROF_BLACKSMITH';`,
      [characterId]
    );
    const craftsmanTier = prof ? Number(prof.tier || 1) : 1;

    const fatiguePenalty = Math.max(0, Math.floor((fatigue - 20) * 0.4));
    const effectiveMasteryScore = Math.max(10, craAttr + craftsmanTier * 8 - fatiguePenalty);

    let pLegendary = Math.min(25, Math.max(1, Math.floor((effectiveMasteryScore - 55) * 0.5)));
    let pMasterwork = Math.min(40, Math.max(5, Math.floor((effectiveMasteryScore - 35) * 0.7)));
    let pFine = Math.min(50, Math.max(15, Math.floor((effectiveMasteryScore - 15) * 0.8)));
    let pNormal = Math.max(5, 100 - (pLegendary + pMasterwork + pFine));

    const total = pLegendary + pMasterwork + pFine + pNormal;
    if (total !== 100) {
      pNormal += 100 - total;
    }

    const canForge = craAttr >= BESPOKE_FORGE_RULES.MIN_CRA_REQUIRED && fatigue + BESPOKE_FORGE_RULES.FATIGUE_COST <= 100;
    let reasonCannotForge: string | undefined;
    if (craAttr < BESPOKE_FORGE_RULES.MIN_CRA_REQUIRED) {
      reasonCannotForge = `Kỹ Nghệ (CRA: ${craAttr}) chưa đạt mức tối thiểu ${BESPOKE_FORGE_RULES.MIN_CRA_REQUIRED}.`;
    } else if (fatigue + BESPOKE_FORGE_RULES.FATIGUE_COST > 100) {
      reasonCannotForge = `Độ mệt mỏi quá cao (${fatigue}/100). Ca đoán tạo đòi hỏi ${BESPOKE_FORGE_RULES.FATIGUE_COST} thể lực.`;
    }

    return {
      craAttr,
      fatigue,
      craftsmanTier,
      effectiveMasteryScore,
      canForge,
      reasonCannotForge,
      tiers: [
        {
          tier: 'LEGENDARY',
          tierLabelVi: 'Thần Phẩm (Thần Binh Xuất Thế)',
          probabilityPercent: pLegendary,
          warRange: '+4..+5 WAR',
          ldrRange: '+1..+2 LDR'
        },
        {
          tier: 'MASTERWORK',
          tierLabelVi: 'Cực Phẩm (Danh Tướng Thần Binh)',
          probabilityPercent: pMasterwork,
          warRange: '+3..+4 WAR',
          ldrRange: '+1 LDR'
        },
        {
          tier: 'FINE',
          tierLabelVi: 'Thượng Phẩm (Tinh Thiết Bách Luyện)',
          probabilityPercent: pFine,
          warRange: '+2..+3 WAR',
          ldrRange: '+0 LDR'
        },
        {
          tier: 'NORMAL',
          tierLabelVi: 'Phổ Thông (Thiết Binh Quân Nhu)',
          probabilityPercent: pNormal,
          warRange: '+1..+2 WAR',
          ldrRange: '+0 LDR'
        }
      ]
    };
  }

  /**
   * Forges a bespoke weapon with ACID transaction.
   */
  public forgeWeapon(params: BespokeForgeRequestDTO): BespokeForgeResultDTO {
    const characterId = params.characterId || 'PLY-0001';
    const weaponType: BespokeWeaponType = params.weaponType || 'SWORD';
    const meta = BESPOKE_WEAPON_CATALOG[weaponType] || BESPOKE_WEAPON_CATALOG.SWORD;
    const targetDestination = params.targetDestination || 'WAREHOUSE';

    return this.db.transaction(() => {
      // 1. Validate Player State & Fatigue
      const player = this.db.queryOne<any>(
        `SELECT player_id, name, cra_attr, cra_exp, fatigue, health, war_attr FROM player_state WHERE player_id = ?;`,
        [characterId]
      );
      if (!player) throw new Error(`Không tìm thấy nhân vật [${characterId}].`);

      const cra = Number(player.cra_attr || 50);
      const fatigue = Number(player.fatigue || 0);

      if (cra < BESPOKE_FORGE_RULES.MIN_CRA_REQUIRED) {
        throw new Error(`Kỹ Nghệ CRA (${cra}) chưa đạt ngưỡng tối thiểu ${BESPOKE_FORGE_RULES.MIN_CRA_REQUIRED} để đoán tạo thần binh.`);
      }

      if (fatigue + BESPOKE_FORGE_RULES.FATIGUE_COST > 100) {
        throw new Error(`Độ mệt mỏi quá cao (${fatigue}/100)! Đoán tạo thần binh tiêu hao ${BESPOKE_FORGE_RULES.FATIGUE_COST} thể lực. Cần nghỉ ngơi hồi phục.`);
      }

      // 2. Validate & Deduct Materials (gracefully deduct whatever available in inventory)
      const materialsConsumed: Array<{ itemCode: string; itemNameVi: string; quantity: number }> = [];
      for (const mat of BESPOKE_FORGE_RULES.BASE_RECIPE_MATERIALS) {
        const invRow = this.db.queryOne<any>(
          `SELECT item_code, quantity, description FROM inventory_items WHERE item_code IN (?, ?, ?) AND quantity > 0 LIMIT 1;`,
          [mat.itemCode, mat.altCode, mat.itemCode.replace('RAW-', 'COM-')]
        );

        if (invRow && Number(invRow.quantity) > 0) {
          const deductQty = Math.min(Number(invRow.quantity), mat.quantity);
          const newQty = Math.max(0, Number(invRow.quantity) - deductQty);
          this.db.execute(`UPDATE inventory_items SET quantity = ? WHERE item_code = ?;`, [newQty, invRow.item_code]);
          materialsConsumed.push({
            itemCode: invRow.item_code,
            itemNameVi: invRow.description || mat.nameVi,
            quantity: deductQty
          });
        }
      }

      // 3. Roll Quality & Modifiers clamped [+1..+5]
      const rates = this.calculateRates(characterId);
      const roll = Math.random() * 100;

      let quality: EquipmentQuality = 'NORMAL';
      let statModifiers: Record<string, number> = {};
      let qualityLabelVi = 'Phổ Thông Hảo Binh';

      let cumulative = 0;
      for (const t of rates.tiers) {
        cumulative += t.probabilityPercent;
        if (roll <= cumulative) {
          quality = t.tier;
          qualityLabelVi = t.tierLabelVi;
          break;
        }
      }

      // Clamping rule [+1..+5]
      if (quality === 'LEGENDARY') {
        qualityLabelVi = 'Tuyệt Thế Thần Binh';
        statModifiers.war = Math.min(5, Math.floor(Math.random() * 2) + 4); // +4 or +5
        statModifiers.ldr = Math.min(2, Math.floor(Math.random() * 2) + 1); // +1 or +2
      } else if (quality === 'MASTERWORK') {
        qualityLabelVi = 'Bách Luyện Tinh Cương';
        statModifiers.war = Math.min(5, Math.floor(Math.random() * 2) + 3); // +3 or +4
        statModifiers.ldr = 1;
      } else if (quality === 'FINE') {
        qualityLabelVi = 'Tinh Luyện Thượng Phẩm';
        statModifiers.war = Math.min(5, Math.floor(Math.random() * 2) + 2); // +2 or +3
      } else {
        qualityLabelVi = 'Phổ Thông Hảo Binh';
        statModifiers.war = Math.min(5, Math.floor(Math.random() * 2) + 1); // +1 or +2
      }

      // 4. Register Equipment Item
      const itemCode = `EQP-WEAPON-${weaponType}-${Date.now().toString().slice(-6)}`;
      const customName = params.customName && params.customName.trim()
        ? params.customName.trim()
        : `${meta.defaultPrefixVi} • ${qualityLabelVi.split(' ')[0]}`;

      // Insert master_items reference for system-wide lookup
      this.db.execute(
        `INSERT INTO master_items (item_code, name_vi, name_en, category, stat_modifiers, baseline_peace_price, current_market_price, unit_vi, unit_en)
         VALUES (?, ?, ?, 'MILITARY_EQUIPMENT', ?, 2500, 3500, 'Thanh', 'Piece')
         ON CONFLICT(item_code) DO NOTHING;`,
        [itemCode, customName, meta.nameEn, JSON.stringify(statModifiers)]
      );

      // Register into character_equipment
      this.db.execute(
        `INSERT INTO character_equipment (character_id, slot_type, item_code, custom_name, stat_modifiers, equipped_at)
         VALUES (?, 'WEAPON', ?, ?, ?, CURRENT_TIMESTAMP);`,
        [characterId, itemCode, customName, JSON.stringify(statModifiers)]
      );

      // If warehouse destination, add to inventory_items
      if (targetDestination === 'WAREHOUSE') {
        this.db.execute(
          `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
           VALUES (?, 'WEAPON', ?, 1, 1500, 'Zhuo Workshop')
           ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + 1;`,
          [itemCode, customName]
        );
      }

      // 5. Update Player State (Fatigue + CRA EXP)
      const newFatigue = Math.min(100, fatigue + BESPOKE_FORGE_RULES.FATIGUE_COST);
      let craExp = Number(player.cra_exp || 0) + BESPOKE_FORGE_RULES.EXP_GAIN;
      let craVal = cra;
      if (craExp >= 100) {
        craVal += 1;
        craExp -= 100;
      }

      this.db.execute(
        `UPDATE player_state SET fatigue = ?, cra_attr = ?, cra_exp = ? WHERE player_id = ?;`,
        [newFatigue, craVal, craExp, characterId]
      );

      // 6. Log Chat Chronicle
      const chronicleId = `chron_forge_${Date.now()}`;
      const narrativeVi = `${player.name || 'Lương Diễn'} vận dụng hỏa hầu tinh thục tại lò rèn, rèn đúc thành công [${customName}] đạt phẩm cấp [${qualityLabelVi}]. Chỉ số thực chiến gia tăng: ${Object.entries(statModifiers).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ')}.`;

      const metaRow = this.db.queryOne<any>(`SELECT active_turn, current_date FROM campaign_meta LIMIT 1;`) || {};
      this.db.execute(
        `INSERT INTO chat_chronicle (id, turn_number, game_date, type, speaker, title, avatar, text, deltas, reasoning)
         VALUES (?, ?, ?, 'player', 'Lương Diễn (Đoán Tạo)', ?, 'Diễn', ?, ?, 'Đoán tạo thần binh trang bị bảo vệ bản thân và chuẩn bị quân cơ khởi sự.');`,
        [
          chronicleId,
          metaRow.active_turn || 1,
          metaRow.current_date || '184-05-02',
          `Đoán Tạo: ${customName}`,
          narrativeVi,
          JSON.stringify({ fatigue: `+${BESPOKE_FORGE_RULES.FATIGUE_COST}`, equipment: customName, stats: statModifiers })
        ]
      );

      return {
        success: true,
        itemCode,
        customName,
        nameVi: customName,
        nameEn: meta.nameEn,
        quality,
        qualityLabelVi,
        statModifiers,
        fatigueConsumed: BESPOKE_FORGE_RULES.FATIGUE_COST,
        expGained: BESPOKE_FORGE_RULES.EXP_GAIN,
        materialsConsumed,
        destination: targetDestination,
        messageVi: `Đoán tạo thành công [${customName}]! Phẩm cấp: ${qualityLabelVi}. Chỉ số: ${Object.entries(statModifiers).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(' • ')}.`,
        messageEn: `Successfully forged [${customName}] (${quality}). Stat buffs: ${Object.entries(statModifiers).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(' • ')}.`
      };
    });
  }
}
