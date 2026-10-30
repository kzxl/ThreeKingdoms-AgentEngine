/**
 * ThreeKingdoms-AgentEngine: World Price Multiplier (engine/world-price.js)
 * CommonJS mirror of src/shared/world-price.ts. Season + active crises only;
 * regional specialisation stays in the TypeScript regional market service.
 */

const { runSqlJson } = require('./db-adapter');

const GRAIN_CODES = new Set(['COM-GRAIN', 'COM-RICE', 'COM-WHEAT']);
const HERB_CODES = new Set(['COM-HERB', 'RAW-HERB-WILD', 'MED-HERB']);
const TIMBER_CODES = new Set(['COM-TIMBER', 'COM-BAMBOO']);

function seasonMultiplier(itemCode, gameDate) {
  const month = Number(String(gameDate).split('-')[1]);
  if (!GRAIN_CODES.has(itemCode) || !Number.isFinite(month)) return 1;
  if (month >= 8 && month <= 9) return 0.85;
  if (month >= 3 && month <= 5) return 1.15;
  return 1;
}

function crisisMultiplier(dbPath, itemCode, settlementId) {
  let rows = [];
  try {
    rows = settlementId
      ? runSqlJson(
          dbPath,
          'SELECT crisis_type, grain_price_multiplier, settlement_id FROM regional_ecological_crises WHERE is_active = 1 AND (settlement_id = ? OR settlement_id IS NULL);',
          [settlementId]
        )
      : runSqlJson(
          dbPath,
          'SELECT crisis_type, grain_price_multiplier, settlement_id FROM regional_ecological_crises WHERE is_active = 1;'
        );
  } catch (error) {
    return 1;
  }
  if (!rows || rows.length === 0) return 1;

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

function worldPriceMultiplier(dbPath, itemCode, gameDate, settlementId) {
  const season = seasonMultiplier(itemCode, gameDate);
  const crisis = crisisMultiplier(dbPath, itemCode, settlementId);
  return Math.max(0.5, Math.min(3, season * crisis));
}

module.exports = { seasonMultiplier, crisisMultiplier, worldPriceMultiplier };
