/**
 * Per-NPC pricing for the two-sided market.
 *
 * The local quote is settlement-wide; these helpers make the same good worth
 * different amounts to different named NPCs:
 *
 * - affinity from `npc_relationship_deltas` + baseline sentiment;
 * - category preference derived from the NPC's attributes on first use and then
 *   stored in `npc_trade_preferences`, so later balance work is data-only.
 */

import { DatabaseService } from '../../core/database';

export interface TradePreference {
  bidMultiplier: number;
  askMultiplier: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function npcAffinity(db: DatabaseService, npcId: string): number {
  const baseline = Number(db.queryOne<{ v: number }>(
    'SELECT baseline_sentiment AS v FROM master_relations_baseline WHERE source_entity_id = ? LIMIT 1;',
    [npcId]
  )?.v ?? 25);
  const delta = Number(db.queryOne<{ v: number }>(
    'SELECT COALESCE(SUM(sentiment_delta), 0) AS v FROM npc_relationship_deltas WHERE npc_id = ?;',
    [npcId]
  )?.v || 0);
  return clamp(baseline + delta, 0, 100);
}

/** 0.90 at affinity 0, 1.00 at 50, 1.10 at 100. */
export function relationshipMultiplier(affinity: number): number {
  return Number(clamp(0.9 + affinity / 500, 0.9, 1.1).toFixed(4));
}

function derivePreference(stats: any, category: string): TradePreference {
  const cat = String(category || '').toUpperCase();
  const war = Number(stats?.war_attr || 50);
  const int = Number(stats?.int_attr || 50);
  const com = Number(stats?.com_attr || 50);
  const cra = Number(stats?.cra_attr || 50);
  const ldr = Number(stats?.ldr_attr || 50);

  if (war >= 70 && /WEAPON|ARMOR|MILITARY|TOOL/.test(cat)) {
    return { bidMultiplier: 1.08, askMultiplier: 0.96 };
  }
  if (int >= 70 && /MEDICINE|RAW_MATERIAL|BOOK|GOOD/.test(cat)) {
    return { bidMultiplier: 1.06, askMultiplier: 0.97 };
  }
  if (com >= 70 && /FOOD|RAW_MATERIAL|GOOD/.test(cat)) {
    return { bidMultiplier: 1.05, askMultiplier: 0.98 };
  }
  if (cra >= 70 && /TOOL|CRAFT|ARMOR/.test(cat)) {
    return { bidMultiplier: 1.05, askMultiplier: 0.97 };
  }
  if (ldr >= 70 && /FOOD|RAW_MATERIAL/.test(cat)) {
    return { bidMultiplier: 1.03, askMultiplier: 0.99 };
  }
  return { bidMultiplier: 1, askMultiplier: 1 };
}

export function npcTradePreference(db: DatabaseService, npcId: string, category: string): TradePreference {
  const cat = String(category || 'GOOD').toUpperCase();
  const existing = db.queryOne<any>(
    'SELECT bid_multiplier, ask_multiplier FROM npc_trade_preferences WHERE npc_id = ? AND item_category = ? LIMIT 1;',
    [npcId, cat]
  );
  if (existing) {
    return {
      bidMultiplier: Number(existing.bid_multiplier),
      askMultiplier: Number(existing.ask_multiplier)
    };
  }

  const stats = db.queryOne<any>(
    'SELECT war_attr, int_attr, com_attr, cra_attr, ldr_attr FROM master_characters WHERE npc_id = ? LIMIT 1;',
    [npcId]
  );
  const preference = derivePreference(stats, cat);
  db.execute(
    `INSERT OR IGNORE INTO npc_trade_preferences
      (npc_id, item_category, bid_multiplier, ask_multiplier, notes_vi)
     VALUES (?, ?, ?, ?, 'Tự sinh từ thuộc tính NPC');`,
    [npcId, cat, preference.bidMultiplier, preference.askMultiplier]
  );
  return preference;
}

/** Maximum price a buyer will pay, as a multiple of the local quote. */
export function npcBidMultiplier(db: DatabaseService, npcId: string, category: string): number {
  const affinity = npcAffinity(db, npcId);
  const preference = npcTradePreference(db, npcId, category);
  return Number(clamp(1.15 * relationshipMultiplier(affinity) * preference.bidMultiplier, 0.95, 1.30).toFixed(4));
}

/** Ask multiplier for an NPC offer: high affinity lowers the ask. */
export function npcAskMultiplier(db: DatabaseService, npcId: string, category: string): number {
  const affinity = npcAffinity(db, npcId);
  const preference = npcTradePreference(db, npcId, category);
  const relation = 1 / relationshipMultiplier(affinity);
  return Number(clamp(relation * preference.askMultiplier, 0.75, 1.35).toFixed(4));
}
