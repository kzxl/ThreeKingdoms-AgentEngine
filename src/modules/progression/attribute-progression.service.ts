/**
 * ThreeKingdoms-AgentEngine: Attribute Progression Service
 * (src/modules/progression/attribute-progression.service.ts)
 *
 * Implements the 8-Attribute EXP & Progression Mechanics:
 * - Handles 'int_exp', 'war_exp', 'ldr_exp', 'pol_exp', 'dip_exp', 'com_exp', 'log_exp', 'cra_exp'
 *   on both 'player_state' and 'npc_state'.
 * - Diminishing Returns Scaling:
 *   - Base threshold: 100 EXP for +1 stat (stat <= 90)
 *   - Veteran threshold: 150 EXP for +1 stat (stat 91 - 99)
 *   - Heroic threshold: 250 EXP for +1 stat (stat >= 100, soft cap 120)
 *
 * Adheres strictly to AgentOption Universe Architecture v4.0.
 */

import { DatabaseService } from '../../core/database';

export type AttributeType =
  | 'int'
  | 'war'
  | 'ldr'
  | 'pol'
  | 'dip'
  | 'com'
  | 'log'
  | 'cra';

export const VALID_ATTRIBUTES: readonly AttributeType[] = [
  'int',
  'war',
  'ldr',
  'pol',
  'dip',
  'com',
  'log',
  'cra'
];

export interface AwardExpResult {
  leveledUp: boolean;
  oldVal: number;
  newVal: number;
  currentExp: number;
  maxExp: number;
}

export interface AttributeProgress {
  statValue: number;
  currentExp: number;
  maxExp: number;
  progressPercent: number;
}

export interface CharacterAttributesProgress {
  characterId: string;
  characterName: string;
  characterType: 'PLAYER' | 'NPC';
  attributes: Record<AttributeType, AttributeProgress>;
}

export class AttributeProgressionService {
  private static instance: AttributeProgressionService | null = null;
  private db: DatabaseService;

  public constructor(dbService?: DatabaseService) {
    this.db = dbService || DatabaseService.getInstance();
  }

  public static getInstance(dbService?: DatabaseService): AttributeProgressionService {
    if (!AttributeProgressionService.instance) {
      AttributeProgressionService.instance = new AttributeProgressionService(dbService);
    }
    return AttributeProgressionService.instance;
  }

  /**
   * Resets the singleton instance (useful in isolated tests).
   */
  public static resetInstance(): void {
    AttributeProgressionService.instance = null;
  }

  /**
   * Static helper shortcut to award EXP directly.
   */
  public static awardAttributeExp(
    characterId: string,
    attrKey: string,
    amount: number
  ): AwardExpResult {
    return AttributeProgressionService.getInstance().awardAttributeExp(characterId, attrKey, amount);
  }

  /**
   * Normalizes an attribute key string (e.g. 'war', 'WAR', 'war_attr', 'war_exp')
   * into a canonical AttributeType.
   */
  public normalizeAttributeKey(attrKey: string): AttributeType {
    const cleaned = attrKey.toLowerCase().replace(/_attr$|_exp$/, '').trim();
    if (!VALID_ATTRIBUTES.includes(cleaned as AttributeType)) {
      throw new Error(
        `Invalid attribute key: "${attrKey}". Supported attributes are: ${VALID_ATTRIBUTES.join(', ')}`
      );
    }
    return cleaned as AttributeType;
  }

  /**
   * Computes the required EXP to advance from currentStatValue to (currentStatValue + 1).
   * Scaling rules:
   * - Stat <= 90: 100 EXP
   * - Stat 91 - 99: 150 EXP
   * - Stat >= 100: 250 EXP (soft cap 120)
   */
  public getRequiredExp(currentStatValue: number): number {
    if (currentStatValue <= 90) {
      return 100;
    }
    if (currentStatValue <= 99) {
      return 150;
    }
    return 250;
  }

  /**
   * Awards attribute EXP to a Player or NPC and handles leveling up, diminishing returns,
   * and soft-cap constraint (max 120).
   *
   * @param characterId Player ID (e.g. 'PLY-0001') or NPC ID (e.g. 'NPC-0003')
   * @param attrKey Attribute name ('war', 'int', 'ldr', etc.)
   * @param amount Positive integer amount of EXP to grant
   */
  public awardAttributeExp(
    characterId: string,
    attrKey: string,
    amount: number
  ): AwardExpResult {
    const normalizedKey = this.normalizeAttributeKey(attrKey);
    const attrCol = `${normalizedKey}_attr`;
    const expCol = `${normalizedKey}_exp`;

    const charRecord = this.resolveCharacterRecord(characterId, [attrCol, expCol]);

    const oldVal = Number(charRecord.row[attrCol] ?? 50);
    const startingExp = Number(charRecord.row[expCol] ?? 0);
    const safeAmount = Math.max(0, Math.floor(amount));

    let currentExp = startingExp + safeAmount;
    let newVal = oldVal;
    let leveledUp = false;

    // Soft cap is 120
    const SOFT_CAP = 120;
    while (newVal < SOFT_CAP) {
      const requiredExp = this.getRequiredExp(newVal);
      if (currentExp >= requiredExp) {
        currentExp -= requiredExp;
        newVal += 1;
        leveledUp = true;
      } else {
        break;
      }
    }

    if (newVal >= SOFT_CAP) {
      newVal = SOFT_CAP;
    }

    const maxExp = this.getRequiredExp(newVal);

    // Persist changes to database if EXP changed or level-up occurred
    if (safeAmount > 0) {
      if (charRecord.table === 'player_state') {
        this.db.execute(
          `UPDATE player_state SET ${attrCol} = ?, ${expCol} = ? WHERE player_id = ?`,
          [newVal, currentExp, characterId]
        );
      } else {
        this.db.execute(
          `UPDATE npc_state SET ${attrCol} = ?, ${expCol} = ?, updated_at = CURRENT_TIMESTAMP WHERE npc_id = ?`,
          [newVal, currentExp, characterId]
        );
      }
    }

    return {
      leveledUp,
      oldVal,
      newVal,
      currentExp,
      maxExp
    };
  }

  /**
   * Retrieves the current progression state for a single attribute of a character.
   */
  public getAttributeProgress(characterId: string, attrKey: string): AttributeProgress {
    const normalizedKey = this.normalizeAttributeKey(attrKey);
    const attrCol = `${normalizedKey}_attr`;
    const expCol = `${normalizedKey}_exp`;

    const charRecord = this.resolveCharacterRecord(characterId, [attrCol, expCol]);
    const statValue = Number(charRecord.row[attrCol] ?? 50);
    const currentExp = Number(charRecord.row[expCol] ?? 0);
    const maxExp = this.getRequiredExp(statValue);
    const progressPercent = Math.min(100, Math.round((currentExp / maxExp) * 100));

    return {
      statValue,
      currentExp,
      maxExp,
      progressPercent
    };
  }

  /**
   * Retrieves full progression state across all 8 attributes for a character.
   */
  public getAllAttributesProgress(characterId: string): CharacterAttributesProgress {
    const cols = VALID_ATTRIBUTES.flatMap(a => [`${a}_attr`, `${a}_exp`]);
    const charRecord = this.resolveCharacterRecord(characterId, cols);

    const attributes: Record<AttributeType, AttributeProgress> = {} as any;
    for (const attr of VALID_ATTRIBUTES) {
      const statValue = Number(charRecord.row[`${attr}_attr`] ?? 50);
      const currentExp = Number(charRecord.row[`${attr}_exp`] ?? 0);
      const maxExp = this.getRequiredExp(statValue);
      const progressPercent = Math.min(100, Math.round((currentExp / maxExp) * 100));
      attributes[attr] = {
        statValue,
        currentExp,
        maxExp,
        progressPercent
      };
    }

    return {
      characterId,
      characterName: charRecord.name,
      characterType: charRecord.table === 'player_state' ? 'PLAYER' : 'NPC',
      attributes
    };
  }

  /**
   * Directly sets an attribute value and current exp (useful for GM/testing commands).
   */
  public setAttribute(
    characterId: string,
    attrKey: string,
    value: number,
    exp: number = 0
  ): void {
    const normalizedKey = this.normalizeAttributeKey(attrKey);
    const attrCol = `${normalizedKey}_attr`;
    const expCol = `${normalizedKey}_exp`;
    const charRecord = this.resolveCharacterRecord(characterId, [attrCol, expCol]);

    const clampedVal = Math.min(120, Math.max(1, Math.round(value)));
    const clampedExp = Math.max(0, Math.round(exp));

    if (charRecord.table === 'player_state') {
      this.db.execute(
        `UPDATE player_state SET ${attrCol} = ?, ${expCol} = ? WHERE player_id = ?`,
        [clampedVal, clampedExp, characterId]
      );
    } else {
      this.db.execute(
        `UPDATE npc_state SET ${attrCol} = ?, ${expCol} = ?, updated_at = CURRENT_TIMESTAMP WHERE npc_id = ?`,
        [clampedVal, clampedExp, characterId]
      );
    }
  }

  /**
   * Resolves character row from player_state, npc_state, or master_characters.
   * If an NPC exists only in master_characters, it is seeded into npc_state.
   */
  private resolveCharacterRecord(
    characterId: string,
    columns: string[]
  ): { table: 'player_state' | 'npc_state'; name: string; row: any } {
    // 1. Check player_state
    const player = this.db.queryOne<any>(
      `SELECT player_id, name, ${columns.join(', ')} FROM player_state WHERE player_id = ? LIMIT 1`,
      [characterId]
    );
    if (player) {
      return { table: 'player_state', name: player.name, row: player };
    }

    // 2. Check npc_state
    let npc = this.db.queryOne<any>(
      `SELECT npc_id, name, ${columns.join(', ')} FROM npc_state WHERE npc_id = ? LIMIT 1`,
      [characterId]
    );
    if (npc) {
      return { table: 'npc_state', name: npc.name, row: npc };
    }

    // 3. Fallback: Check master_characters and seed into npc_state
    const masterChar = this.db.queryOne<any>(
      `SELECT * FROM master_characters WHERE npc_id = ? LIMIT 1`,
      [characterId]
    );

    if (masterChar) {
      const charName = masterChar.name_en || masterChar.name_vi || characterId;
      this.db.execute(
        `INSERT INTO npc_state (
          npc_id, name, loyalty, morale, fatigue,
          int_attr, pol_attr, war_attr, ldr_attr, dip_attr, com_attr, log_attr, cra_attr,
          assigned_role, monthly_wage, talents, personality, motivation,
          int_exp, war_exp, ldr_exp, pol_exp, dip_exp, com_exp, log_exp, cra_exp
        ) VALUES (
          ?, ?, 75, 80, 0,
          ?, ?, ?, ?, ?, ?, ?, ?,
          'UNASSIGNED', 750, ?, ?, ?,
          0, 0, 0, 0, 0, 0, 0, 0
        )`,
        [
          masterChar.npc_id,
          charName,
          masterChar.int_attr ?? 50,
          masterChar.pol_attr ?? 50,
          masterChar.war_attr ?? 50,
          masterChar.ldr_attr ?? 50,
          masterChar.dip_attr ?? 50,
          masterChar.com_attr ?? 50,
          masterChar.log_attr ?? 50,
          masterChar.cra_attr ?? 50,
          masterChar.talents || '[]',
          masterChar.personality || 'PRAGMATIC',
          masterChar.motivation || 'SECURITY'
        ]
      );

      npc = this.db.queryOne<any>(
        `SELECT npc_id, name, ${columns.join(', ')} FROM npc_state WHERE npc_id = ? LIMIT 1`,
        [characterId]
      );
      if (npc) {
        return { table: 'npc_state', name: npc.name, row: npc };
      }
    }

    throw new Error(
      `Character "${characterId}" not found in player_state, npc_state, or master_characters.`
    );
  }
}

export const ProgressionExpService = AttributeProgressionService;
