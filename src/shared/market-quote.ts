/**
 * ThreeKingdoms-AgentEngine: Market Quote (src/shared/market-quote.ts)
 *
 * `master_items.current_market_price` is the reference price. The quote adds a
 * merchant spread and a small fame modifier; the buy price is always at least
 * the sell price, so a player cannot buy and sell in the same settlement for
 * a profit.
 *
 * World/regional modifiers (crisis, season, local stock) are not part of the
 * formula yet; they will be passed as optional multipliers once the
 * settlement market state lands.
 */

import MARKET_PRICING from '../../config/market-pricing.json';
import { fameRatio } from './prestige';

export interface MarketQuote {
  itemCode: string;
  referencePrice: number;
  effectiveReference: number;
  worldMultiplier: number;
  buyPrice: number;
  sellPrice: number;
  fameRatio: number;
  merchantSpread: number;
}

export const MARKET_PRICING_CONFIG = MARKET_PRICING;

export function quoteFromReference(
  referencePrice: number,
  fame: number,
  itemCode = '',
  worldMultiplier = 1
): MarketQuote {
  const reference = Math.max(1, Math.round(Number(referencePrice) || 0));
  const ratio = fameRatio(fame);
  const spread = MARKET_PRICING.merchantSpread;
  const world = Math.max(0.5, Math.min(3, Number(worldMultiplier) || 1));
  const effectiveReference = Math.max(1, Math.round(reference * world));

  const rawBuy = effectiveReference * (1 + spread - ratio * MARKET_PRICING.fameBuyDiscountMax);
  const rawSell = effectiveReference * (1 - spread + ratio * MARKET_PRICING.fameSellBonusMax);
  const buyPrice = Math.max(MARKET_PRICING.minPrice, Math.round(rawBuy));
  const sellPrice = Math.max(
    MARKET_PRICING.minPrice,
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
