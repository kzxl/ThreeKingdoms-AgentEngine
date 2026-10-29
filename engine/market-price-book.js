/**
 * ThreeKingdoms-AgentEngine: Market Price Book (engine/market-price-book.js)
 *
 * `master_items` is the only market-price source. Every server path that quotes or
 * settles a trade reads this book instead of keeping its own price table.
 */

const { runSqlJson } = require('./db-adapter');

const MARKET_ITEM_COLUMNS = `
  item_code, name_vi, unit_vi, category, current_market_price, baseline_peace_price
`;

function normalizeMarketItem(row) {
  if (!row) return undefined;
  const current = Number(row.current_market_price);
  const baseline = Number(row.baseline_peace_price);
  const price = Number.isFinite(current) && current > 0
    ? current
    : (Number.isFinite(baseline) && baseline > 0 ? baseline : 0);
  return {
    itemCode: row.item_code,
    nameVi: row.name_vi || row.item_code,
    unitVi: row.unit_vi || 'đơn vị',
    category: row.category || 'Misc',
    price: Math.round(price),
    baselinePrice: Math.round(Number.isFinite(baseline) ? baseline : price)
  };
}

function loadMarketCatalog(dbPath) {
  const rows = runSqlJson(dbPath, 'SELECT ' + MARKET_ITEM_COLUMNS + ' FROM master_items;');
  const catalog = new Map();
  for (const row of rows) {
    const item = normalizeMarketItem(row);
    if (item && item.price > 0) catalog.set(item.itemCode, item);
  }
  return catalog;
}

function getMarketItem(dbPath, itemCode) {
  if (!itemCode) return undefined;
  const rows = runSqlJson(
    dbPath,
    'SELECT ' + MARKET_ITEM_COLUMNS + ' FROM master_items WHERE item_code = ? LIMIT 1;',
    [String(itemCode)]
  );
  return normalizeMarketItem(rows[0]);
}

function resolveMarketPrice(dbPath, itemCode) {
  const item = getMarketItem(dbPath, itemCode);
  return item && item.price > 0 ? item.price : null;
}

module.exports = {
  loadMarketCatalog,
  getMarketItem,
  resolveMarketPrice
};
