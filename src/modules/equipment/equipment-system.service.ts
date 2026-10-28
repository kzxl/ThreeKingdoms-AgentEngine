/**
 * ThreeKingdoms-AgentEngine: Equipment System Service
 * (src/modules/equipment/equipment-system.service.ts)
 *
 * Implements ROTK Item Possession & Equipment Buff Mechanics:
 * - Manages 'character_equipment' table and 'master_items.stat_modifiers'.
 * - STRICT USER CONSTRAINT: Stat modifier cap for any item is STRICTLY clamped
 *   between +1 and +5 points per attribute!
 * - Calculates effective attributes for Player and NPCs:
 *   effective_stat = base_stat + equipment_stat_bonus
 * - Supports Player ('PLY-0001') and legendary NPCs (e.g. NPC-0003 Guan Yu with
 *   Green Dragon Crescent Blade, NPC-0002 Zhang Fei with Serpent Spear).
 *
 * Adheres strictly to AgentOption Universe Architecture v4.0.
 */

import { DatabaseService } from '../../core/database';
import { AttributeType, VALID_ATTRIBUTES } from '../progression/attribute-progression.service';

export type EquipmentSlot = 'WEAPON' | 'ARMOR' | 'STEED' | 'TREASURE';

export const VALID_EQUIPMENT_SLOTS: readonly EquipmentSlot[] = [
  'WEAPON',
  'ARMOR',
  'STEED',
  'TREASURE'
];

/**
 * STRICT USER CONSTRAINT:
 * Clamps a single attribute stat bonus to strictly between +1 and +5 points.
 */
export function clampStatModifier(value: number): number {
  const rounded = Math.round(Number(value));
  if (isNaN(rounded)) return 0;
  return Math.min(5, Math.max(1, rounded));
}

/**
 * Parses and strictly clamps all attribute modifiers between +1 and +5.
 */
export function clampStatModifiers(
  raw: string | Record<string, any> | null | undefined
): Record<AttributeType, number> {
  const result: Record<AttributeType, number> = {
    int: 0,
    war: 0,
    ldr: 0,
    pol: 0,
    dip: 0,
    com: 0,
    log: 0,
    cra: 0
  };

  if (!raw) return result;

  let parsed: Record<string, any> = {};
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return result;
    }
  } else if (typeof raw === 'object') {
    parsed = raw;
  }

  for (const [key, val] of Object.entries(parsed)) {
    const normKey = key.toLowerCase().replace(/_attr$|_exp$/, '').trim() as AttributeType;
    if (VALID_ATTRIBUTES.includes(normKey)) {
      const numVal = Number(val);
      if (!isNaN(numVal) && numVal !== 0) {
        result[normKey] = clampStatModifier(numVal);
      }
    }
  }

  return result;
}

export interface EquippedItemDetail {
  id: number;
  characterId: string;
  slotType: EquipmentSlot;
  itemCode: string;
  customName: string;
  category?: string;
  statModifiers: Record<AttributeType, number>;
  equippedAt: string;
}

export interface CharacterEquipmentResult {
  characterId: string;
  items: EquippedItemDetail[];
  equipment: EquippedItemDetail[]; // Alias for items
  slots: Record<EquipmentSlot, EquippedItemDetail | null>;
  totalBonuses: Record<AttributeType, number>;
  totalModifiers: Record<AttributeType, number>; // Alias for totalBonuses
}

export interface EquipResult {
  success: boolean;
  characterId: string;
  slotType: EquipmentSlot;
  itemCode: string;
  itemName: string;
  statModifiers: Record<AttributeType, number>;
}

export interface UnequipResult {
  success: boolean;
  unequipped: boolean;
  slotType: EquipmentSlot;
  itemCode?: string;
}

export interface AttributeStatDetail {
  base: number;
  gearBonus: number;
  effective: number;
  isOver100: boolean;
}

export interface EffectiveStatsResult {
  characterId: string;
  characterName: string;
  characterType: 'PLAYER' | 'NPC';
  baseStats: Record<AttributeType, number>;
  gearBonuses: Record<AttributeType, number>;
  effectiveStats: Record<AttributeType, number>;
  isOver100: Record<AttributeType, boolean>;
  stats: Record<AttributeType, AttributeStatDetail>;
}

export class EquipmentSystemService {
  private static instance: EquipmentSystemService | null = null;
  private db: DatabaseService;

  public constructor(dbService?: DatabaseService) {
    this.db = dbService || DatabaseService.getInstance();
    this.ensureTableExists();
  }

  public static getInstance(dbService?: DatabaseService): EquipmentSystemService {
    if (!EquipmentSystemService.instance) {
      EquipmentSystemService.instance = new EquipmentSystemService(dbService);
    }
    return EquipmentSystemService.instance;
  }

  /**
   * Resets the singleton instance (useful in isolated tests).
   */
  public static resetInstance(): void {
    EquipmentSystemService.instance = null;
  }

  /**
   * Ensures the character_equipment table exists in the active database.
   */
  private ensureTableExists(): void {
    this.db.exec(`
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
  }

  /**
   * Normalizes and validates slot type.
   */
  public normalizeSlotType(slotType: string): EquipmentSlot {
    const upper = slotType.toUpperCase().trim() as EquipmentSlot;
    if (!VALID_EQUIPMENT_SLOTS.includes(upper)) {
      throw new Error(
        `Invalid equipment slot: "${slotType}". Allowed slots are: ${VALID_EQUIPMENT_SLOTS.join(', ')}`
      );
    }
    return upper;
  }

  /**
   * Equips an item to a character's designated slot.
   * - Validates itemCode against master_items.
   * - Parses stat_modifiers and STRICTLY clamps each bonus between +1 and +5.
   * - Replaces any existing item in that slot (preserving UNIQUE constraint).
   */
  public equipItem(
    characterId: string,
    slotType: EquipmentSlot | string,
    itemCode: string,
    customName?: string,
    overrideModifiers?: Record<string, number>
  ): EquipResult {
    const slot = this.normalizeSlotType(slotType);

    // 1. Validate item existence in master_items
    const masterItem = this.db.queryOne<any>(
      `SELECT item_code, name_vi, name_en, category, stat_modifiers FROM master_items WHERE item_code = ? LIMIT 1`,
      [itemCode]
    );

    if (!masterItem) {
      throw new Error(`Item code "${itemCode}" not found in master_items.`);
    }

    // 2. Resolve and clamp stat modifiers strictly between +1 and +5
    let rawModifiers = masterItem.stat_modifiers;
    if (overrideModifiers && Object.keys(overrideModifiers).length > 0) {
      rawModifiers = overrideModifiers;
    }

    const clampedModifiers = clampStatModifiers(rawModifiers);

    // Filter to only non-zero modifiers for clean JSON storage
    const storageModifiers: Record<string, number> = {};
    for (const [attr, val] of Object.entries(clampedModifiers)) {
      if (val > 0) {
        storageModifiers[attr] = val;
      }
    }

    const finalName = customName || masterItem.name_en || masterItem.name_vi || itemCode;

    // 3. Insert or Replace into character_equipment
    this.db.execute(
      `INSERT INTO character_equipment (character_id, slot_type, item_code, custom_name, stat_modifiers, equipped_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(character_id, slot_type) DO UPDATE SET
         item_code = excluded.item_code,
         custom_name = excluded.custom_name,
         stat_modifiers = excluded.stat_modifiers,
         equipped_at = CURRENT_TIMESTAMP`,
      [characterId, slot, itemCode, finalName, JSON.stringify(storageModifiers)]
    );

    return {
      success: true,
      characterId,
      slotType: slot,
      itemCode,
      itemName: finalName,
      statModifiers: clampedModifiers
    };
  }

  /**
   * Unequips an item from the specified slot for a character.
   */
  public unequipItem(characterId: string, slotType: string): UnequipResult {
    const slot = this.normalizeSlotType(slotType);

    const existing = this.db.queryOne<any>(
      `SELECT item_code FROM character_equipment WHERE character_id = ? AND slot_type = ? LIMIT 1`,
      [characterId, slot]
    );

    if (!existing) {
      return {
        success: true,
        unequipped: false,
        slotType: slot
      };
    }

    this.db.execute(
      `DELETE FROM character_equipment WHERE character_id = ? AND slot_type = ?`,
      [characterId, slot]
    );

    return {
      success: true,
      unequipped: true,
      slotType: slot,
      itemCode: existing.item_code
    };
  }

  /**
   * Retrieves all currently equipped items and aggregates total stat bonuses.
   */
  public getCharacterEquipment(characterId: string): CharacterEquipmentResult {
    const rows = this.db.query<any>(
      `SELECT ce.*, mi.category, mi.name_en, mi.name_vi
       FROM character_equipment ce
       LEFT JOIN master_items mi ON ce.item_code = mi.item_code
       WHERE ce.character_id = ?
       ORDER BY ce.slot_type ASC`,
      [characterId]
    );

    const items: EquippedItemDetail[] = [];
    const slots: Record<EquipmentSlot, EquippedItemDetail | null> = {
      WEAPON: null,
      ARMOR: null,
      STEED: null,
      TREASURE: null
    };

    const totalBonuses: Record<AttributeType, number> = {
      int: 0,
      war: 0,
      ldr: 0,
      pol: 0,
      dip: 0,
      com: 0,
      log: 0,
      cra: 0
    };

    for (const row of rows) {
      const slot = row.slot_type as EquipmentSlot;
      // Clamp stat modifiers to strictly enforce the +1 to +5 rule on reading as well
      const clamped = clampStatModifiers(row.stat_modifiers);

      const detail: EquippedItemDetail = {
        id: row.id,
        characterId: row.character_id,
        slotType: slot,
        itemCode: row.item_code,
        customName: row.custom_name || row.name_en || row.name_vi || row.item_code,
        category: row.category,
        statModifiers: clamped,
        equippedAt: row.equipped_at
      };

      items.push(detail);
      if (VALID_EQUIPMENT_SLOTS.includes(slot)) {
        slots[slot] = detail;
      }

      for (const attr of VALID_ATTRIBUTES) {
        totalBonuses[attr] += clamped[attr] || 0;
      }
    }

    return {
      characterId,
      items,
      equipment: items,
      slots,
      totalBonuses,
      totalModifiers: totalBonuses
    };
  }

  /**
   * Calculates effective stats for Player or NPC:
   * effective_stat = base_stat + equipment_stat_bonus
   *
   * Also flags whether each effective stat exceeds 100 (isOver100).
   */
  public getEffectiveStats(characterId: string): EffectiveStatsResult {
    // 1. Resolve character base stats
    const characterProfile = this.resolveCharacterProfile(characterId);

    // 2. Resolve equipment bonuses
    const equipmentSummary = this.getCharacterEquipment(characterId);
    const gearBonuses = equipmentSummary.totalBonuses;

    // 3. Compute effective stats and over-100 flags
    const effectiveStats: Record<AttributeType, number> = {} as any;
    const isOver100: Record<AttributeType, boolean> = {} as any;
    const stats: Record<AttributeType, AttributeStatDetail> = {} as any;

    for (const attr of VALID_ATTRIBUTES) {
      const base = characterProfile.baseStats[attr] ?? 50;
      const gearBonus = gearBonuses[attr] ?? 0;
      const effective = base + gearBonus;
      const over100 = effective > 100;

      effectiveStats[attr] = effective;
      isOver100[attr] = over100;
      stats[attr] = {
        base,
        gearBonus,
        effective,
        isOver100: over100
      };
    }

    return {
      characterId,
      characterName: characterProfile.name,
      characterType: characterProfile.type,
      baseStats: characterProfile.baseStats,
      gearBonuses,
      effectiveStats,
      isOver100,
      stats
    };
  }

  /**
   * Helper to retrieve base stats from player_state, npc_state, or master_characters.
   */
  private resolveCharacterProfile(characterId: string): {
    name: string;
    type: 'PLAYER' | 'NPC';
    baseStats: Record<AttributeType, number>;
  } {
    // 1. Check player_state
    const player = this.db.queryOne<any>(
      `SELECT * FROM player_state WHERE player_id = ? LIMIT 1`,
      [characterId]
    );
    if (player) {
      return {
        name: player.name,
        type: 'PLAYER',
        baseStats: this.extractBaseStats(player)
      };
    }

    // 2. Check npc_state
    const npc = this.db.queryOne<any>(
      `SELECT * FROM npc_state WHERE npc_id = ? LIMIT 1`,
      [characterId]
    );
    if (npc) {
      return {
        name: npc.name,
        type: 'NPC',
        baseStats: this.extractBaseStats(npc)
      };
    }

    // 3. Check master_characters
    const masterChar = this.db.queryOne<any>(
      `SELECT * FROM master_characters WHERE npc_id = ? LIMIT 1`,
      [characterId]
    );
    if (masterChar) {
      return {
        name: masterChar.name_en || masterChar.name_vi || characterId,
        type: 'NPC',
        baseStats: this.extractBaseStats(masterChar)
      };
    }

    throw new Error(
      `Character "${characterId}" not found in player_state, npc_state, or master_characters.`
    );
  }

  /**
   * Extracts the 8 base attribute values from a database record row.
   */
  private extractBaseStats(row: any): Record<AttributeType, number> {
    return {
      int: Number(row.int_attr ?? 50),
      war: Number(row.war_attr ?? 50),
      ldr: Number(row.ldr_attr ?? 50),
      pol: Number(row.pol_attr ?? 50),
      dip: Number(row.dip_attr ?? 50),
      com: Number(row.com_attr ?? 50),
      log: Number(row.log_attr ?? 50),
      cra: Number(row.cra_attr ?? 50)
    };
  }
}
