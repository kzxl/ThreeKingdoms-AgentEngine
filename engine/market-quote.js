/**
 * ThreeKingdoms-AgentEngine: Market Quote (engine/market-quote.js)
 *
 * CommonJS mirror of src/shared/market-quote.ts. The reference price still
 * comes from master_items; this module only applies the merchant spread and
 * the fame modifier. A parity test keeps both implementations in sync.
 */

const PRICING = require('../config/market-pricing.json');

const FAME_NORMALIZER = 2000;

function fameRatio(fame) {
  const value = Math.max(0, Number(fame) || 0);
  return value / (value + FAME_NORMALIZER);
}

function quoteFromReference(referencePrice, fame, itemCode = '', worldMultiplier = 1) {
  const reference = Math.max(1, Math.round(Number(referencePrice) || 0));
  const ratio = fameRatio(fame);
  const spread = Number(PRICING.merchantSpread);
  const world = Math.max(0.5, Math.min(3, Number(worldMultiplier) || 1));
  const effectiveReference = Math.max(1, Math.round(reference * world));

  const rawBuy = effectiveReference * (1 + spread - ratio * Number(PRICING.fameBuyDiscountMax));
  const rawSell = effectiveReference * (1 - spread + ratio * Number(PRICING.fameSellBonusMax));
  const buyPrice = Math.max(Number(PRICING.minPrice), Math.round(rawBuy));
  const sellPrice = Math.max(
    Number(PRICING.minPrice),
    Math.min(buyPrice, Math.round(rawSell))
  );

  return {
    itemCode,
    referencePrice: reference,
    effectiveReference,
    worldMultiplier: world,
    buyPrice,
    sellPrice,
    fameRatio: ratio,
    merchantSpread: spread
  };
}

module.exports = { quoteFromReference, fameRatio };
