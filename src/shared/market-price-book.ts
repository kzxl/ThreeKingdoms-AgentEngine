/**
 * ThreeKingdoms-AgentEngine: Market Price Book (src/shared/market-price-book.ts)
 *
 * `master_items` is the only market-price source. Server services read prices and
 * display names from this book; no module keeps its own commodity price table.
 */

import { DatabaseService } from '../core/database';

export interface MarketItem {
  itemCode: string;
  nameVi: string;
  unitVi: string;
  category: string;
  price: number;
  baselinePrice: number;
}

export type MarketCatalog = ReadonlyMap<string, MarketItem>;

const MARKET_ITEM_COLUMNS = `
  item_code, name_vi, unit_vi, category, current_market_price, baseline_peace_price
`;

export function normalizeMarketItem(row: any): MarketItem | undefined {
  if (!row) return undefined;
  const current = Number(row.current_market_price);
  const baseline = Number(row.baseline_peace_price);
  const price = Number.isFinite(current) && current > 0
    ? current
    : (Number.isFinite(baseline) && baseline > 0 ? baseline : 0);
  return {
    itemCode: String(row.item_code),
    nameVi: String(row.name_vi || row.item_code),
    unitVi: String(row.unit_vi || 'đơn vị'),
    category: String(row.category || 'Misc'),
    price: Math.round(price),
    baselinePrice: Math.round(Number.isFinite(baseline) ? baseline : price)
  };
}

export function loadMarketCatalog(db: DatabaseService): MarketCatalog {
  const rows = db.query<any>('SELECT ' + MARKET_ITEM_COLUMNS + ' FROM master_items;');
  const catalog = new Map<string, MarketItem>();
  for (const row of rows) {
    const item = normalizeMarketItem(row);
    if (item && item.price > 0) catalog.set(item.itemCode, item);
  }
  return catalog;
}

export function getMarketItem(db: DatabaseService, itemCode: string): MarketItem | undefined {
  const row = db.queryOne<any>(
    'SELECT ' + MARKET_ITEM_COLUMNS + ' FROM master_items WHERE item_code = ? LIMIT 1;',
    [itemCode]
  );
  return normalizeMarketItem(row);
}

/** Throws when the catalog has no usable price; callers must not invent one. */
export function requireMarketPrice(db: DatabaseService, itemCode: string): number {
  const item = getMarketItem(db, itemCode);
  if (!item || item.price <= 0) {
    throw new Error(`No market price for item ${itemCode} in master_items.`);
  }
  return item.price;
}
