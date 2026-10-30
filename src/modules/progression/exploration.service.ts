/**
 * ThreeKingdoms-AgentEngine: Exploration & Rare Item Discovery
 * (src/modules/progression/exploration.service.ts)
 *
 * One day of searching a POI. The success chance is fame-driven
 * (`3% + fameRatio × 20%`), the item is chosen from a weighted, fame-gated
 * table, and every roll is written to `exploration_log`. Ten consecutive
 * failures trigger a guaranteed tier-1 find.
 */

import { DatabaseService } from '../../core/database';
import { RngService } from '../../core/rng';
import { nextSequentialId } from '../../shared/id-generator';
import { fameEffects } from '../../shared/prestige';
import { PrestigeService } from './prestige.service';

export interface ExploreInput {
  characterId?: string;
  location?: string;
  poiName?: string;
}

export interface ExploreResult {
  success: boolean;
  discovered: boolean;
  characterId: string;
  gameDate: string;
  fame: number;
  chance: number;
  roll: number;
  pityTriggered: boolean;
  item?: {
    itemCode: string;
    nameVi: string;
    tier: number;
    quantity: number;
  };
  time?: any;
  narrativeVi: string;
  narrativeEn: string;
  error?: string;
  code?: string;
}

interface DiscoveryRow {
  item_code: string;
  tier: number;
  min_fame: number;
  weight: number;
}

export class ExplorationService {
  private static instance: ExplorationService | null = null;

  private constructor(private readonly db: DatabaseService) {}

  public static getInstance(): ExplorationService {
    if (!ExplorationService.instance) {
      ExplorationService.instance = new ExplorationService(DatabaseService.getInstance());
    }
    return ExplorationService.instance;
  }

  public static forDatabase(db: DatabaseService): ExplorationService {
    return new ExplorationService(db);
  }

  public explore(input: ExploreInput = {}): ExploreResult {
    const characterId = input.characterId || 'PLY-0001';
    const player = this.db.queryOne<any>('SELECT * FROM player_state WHERE player_id = ?;', [characterId]);
    if (!player) {
      return this.failure(characterId, 'NO_PLAYER', 'Không tìm thấy nhân vật chính.');
    }

    // Time is a precondition: day 30 must close the month first.
    const { canSpendActionTime, applyActionTime } = require('../../../engine/time-manager');
    const timeCheck = canSpendActionTime(this.db.path, 'EXPLORE_POI');
    if (!timeCheck.allowed) {
      return this.failure(characterId, timeCheck.code, timeCheck.error);
    }

    const time = applyActionTime(this.db.path, 'EXPLORE_POI', null, 'explore-poi', 1);
    if (!time.success) {
      return this.failure(characterId, time.code || 'TIME_FAILED', time.error || 'Không thể tiêu tốn thời gian.');
    }

    const gameDate = time.nextDate;
    const location = input.location || player.current_location || 'LOC-0001';
    const poiName = input.poiName || null;
    const fame = PrestigeService.forDatabase(this.db).getFame(characterId);
    const chance = Math.min(0.35, fameEffects(fame).discoveryChance);

    const rng = RngService.forDomain(this.db, 'explore');
    const roll = rng.nextFloat();
    const pityTriggered = this.isPityReady(characterId);
    const discovered = roll < chance || pityTriggered;

    let picked: DiscoveryRow | undefined;
    if (discovered) {
      picked = this.pickItem(rng, fame);
    }

    const exploreId = nextSequentialId(this.db, 'exploration_log', 'EXP', gameDate);
    if (!picked) {
      this.db.execute(
        `INSERT INTO exploration_log
          (explore_id, character_id, location, poi_name, game_date, fame_at_roll, chance, roll, success, item_code, item_tier, pity_triggered)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?);`,
        [exploreId, characterId, location, poiName, gameDate, fame, Number(chance.toFixed(4)), Number(roll.toFixed(4)), pityTriggered ? 1 : 0]
      );
      this.logAction(characterId, gameDate, exploreId, false, null);
      return {
        success: true,
        discovered: false,
        characterId,
        gameDate,
        fame,
        chance,
        roll,
        pityTriggered,
        time,
        narrativeVi: `${poiName || location}: sau một ngày khảo sát, không có phát hiện đáng kể. Danh vọng hiện tại ${fame}.`,
        narrativeEn: `${poiName || location}: a full day of searching turned up nothing notable. Current fame ${fame}.`
      };
    }

    const item = this.db.queryOne<any>(
      'SELECT item_code, name_vi, category, current_market_price FROM master_items WHERE item_code = ?;',
      [picked.item_code]
    );
    if (!item) {
      return this.failure(characterId, 'ITEM_MISSING', `Vật phẩm ${picked.item_code} không có trong catalog.`);
    }

    const quantity = 1;
    this.db.transaction(() => {
      this.db.execute(
        `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
         VALUES (?, ?, ?, ?, 0, ?)
         ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + ?;`,
        [item.item_code, item.category, item.name_vi, quantity, location, quantity]
      );
      const stock = this.db.queryOne<any>('SELECT quantity FROM inventory_items WHERE item_code = ?;', [item.item_code]);
      const movId = nextSequentialId(this.db, 'stock_movements', 'MOV', gameDate);
      this.db.execute(
        `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
         VALUES (?, ?, ?, 'Discovery', ?, 0, ?, ?);`,
        [movId, gameDate, item.item_code, quantity, Number(stock?.quantity || 0), exploreId]
      );
      this.db.execute(
        `INSERT INTO exploration_log
          (explore_id, character_id, location, poi_name, game_date, fame_at_roll, chance, roll, success, item_code, item_tier, pity_triggered)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?);`,
        [exploreId, characterId, location, poiName, gameDate, fame, Number(chance.toFixed(4)), Number(roll.toFixed(4)), item.item_code, picked.tier, pityTriggered ? 1 : 0]
      );
    });
    this.logAction(characterId, gameDate, exploreId, true, item.item_code);

    return {
      success: true,
      discovered: true,
      characterId,
      gameDate,
      fame,
      chance,
      roll,
      pityTriggered,
      item: { itemCode: item.item_code, nameVi: item.name_vi, tier: picked.tier, quantity },
      time,
      narrativeVi: `${poiName || location}: phát hiện ${item.name_vi} (cấp ${picked.tier})! Danh vọng ${fame} đã dẫn lối tới vật phẩm này.`,
      narrativeEn: `${poiName || location}: discovered ${item.name_vi} (tier ${picked.tier})! Fame ${fame} led you to it.`
    };
  }

  private isPityReady(characterId: string): boolean {
    const recent = this.db.query<{ success: number }>(
      'SELECT success FROM exploration_log WHERE character_id = ? ORDER BY rowid DESC LIMIT 10;',
      [characterId]
    );
    return recent.length === 10 && recent.every(row => Number(row.success) === 0);
  }

  private pickItem(rng: ReturnType<typeof RngService.forDomain>, fame: number): DiscoveryRow | undefined {
    const rows = this.db.query<DiscoveryRow>(
      'SELECT item_code, tier, min_fame, weight FROM discovery_items WHERE min_fame <= ? ORDER BY tier ASC, item_code ASC;',
      [fame]
    );
    if (rows.length === 0) return undefined;
    const total = rows.reduce((sum, row) => sum + Math.max(0, Number(row.weight)), 0);
    if (total <= 0) return rows[0];
    let cursor = rng.nextFloat() * total;
    for (const row of rows) {
      cursor -= Math.max(0, Number(row.weight));
      if (cursor <= 0) return row;
    }
    return rows[rows.length - 1];
  }

  private logAction(characterId: string, gameDate: string, exploreId: string, discovered: boolean, itemCode: string | null): void {
    const actionId = nextSequentialId(this.db, 'action_log', 'ACT', gameDate);
    const payload = JSON.stringify({ characterId, exploreId });
    const result = JSON.stringify({ discovered, itemCode });
    this.db.execute(
      `INSERT INTO action_log (action_id, idempotency_key, turn_number, game_date, action_type, payload, result, status)
       VALUES (?, NULL, (SELECT active_turn FROM campaign_meta LIMIT 1), ?, 'EXPLORE_POI', ?, ?, 'SUCCESS');`,
      [actionId, gameDate, payload, result]
    );
  }

  private failure(characterId: string, code: string, error: string): ExploreResult {
    return {
      success: false,
      discovered: false,
      characterId,
      gameDate: '',
      fame: 0,
      chance: 0,
      roll: 0,
      pityTriggered: false,
      code,
      error,
      narrativeVi: error,
      narrativeEn: error
    };
  }
}
