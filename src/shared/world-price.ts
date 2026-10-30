/**
 * ThreeKingdoms-AgentEngine: World Price Multiplier
 * (src/shared/world-price.ts)
 *
 * The reference price is static; this layer adds the two world forces that are
 * already persisted: the agricultural season (grain) and active regional
 * crises. Local stock/specialisation stays in RegionalMarketService until it
 * gets a persisted settlement market state.
 */

import { DatabaseService } from '../core/database';

const GRAIN_CODES = new Set(['COM-GRAIN', 'COM-RICE', 'COM-WHEAT']);
const HERB_CODES = new Set(['COM-HERB', 'RAW-HERB-WILD', 'MED-HERB']);
const TIMBER_CODES = new Set(['COM-TIMBER', 'COM-BAMBOO']);

export function seasonMultiplier(itemCode: string, gameDate: string): number {
  const month = Number(String(gameDate).split('-')[1]);
  const isGrain = GRAIN_CODES.has(itemCode);
  if (!isGrain || !Number.isFinite(month)) return 1;
  if (month >= 8 && month <= 9) return 0.85;
  if (month >= 3 && month <= 5) return 1.15;
  return 1;
}

export function crisisMultiplier(db: DatabaseService, itemCode: string, settlementId?: string): number {
  let rows: Array<{ crisis_type: string; grain_price_multiplier: number; settlement_id: string }> = [];
  try {
    rows = db.query<{ crisis_type: string; grain_price_multiplier: number; settlement_id: string }>(
      settlementId
        ? 'SELECT crisis_type, grain_price_multiplier, settlement_id FROM regional_ecological_crises WHERE is_active = 1 AND (settlement_id = ? OR settlement_id IS NULL);'
        : 'SELECT crisis_type, grain_price_multiplier, settlement_id FROM regional_ecological_crises WHERE is_active = 1;',
      settlementId ? [settlementId] : []
    );
  } catch {
    return 1;
  }
  if (rows.length === 0) return 1;

  const isGrain = GRAIN_CODES.has(itemCode);
  const isHerb = HERB_CODES.has(itemCode);
  const isTimber = TIMBER_CODES.has(itemCode);
  let multiplier = 1;
  for (const row of rows) {
    const crisis = String(row.crisis_type || '').toUpperCase();
    const grain = Number(row.grain_price_multiplier) || 1;
    if (isGrain && ['GREAT_DROUGHT', 'LOCUST_SWARM', 'YELLOW_RIVER_FLOOD', 'PEASANT_REBELLION'].includes(crisis)) {
      multiplier = Math.max(multiplier, grain);
    } else if (isHerb && crisis === 'PESTILENCE_PLAGUE') {
      multiplier = Math.max(multiplier, Math.max(2.5, grain));
    } else if (isTimber && crisis === 'YELLOW_RIVER_FLOOD') {
      multiplier = Math.max(multiplier, 1.4);
    } else if (!isGrain && !isHerb && !isTimber && crisis === 'PEASANT_REBELLION') {
      multiplier = Math.max(multiplier, 1.15);
    }
  }
  return Math.max(0.5, Math.min(3, multiplier));
}

export function worldPriceMultiplier(
  db: DatabaseService,
  itemCode: string,
  gameDate: string,
  settlementId?: string
): number {
  return Math.max(0.5, Math.min(3, seasonMultiplier(itemCode, gameDate) * crisisMultiplier(db, itemCode, settlementId)));
}
