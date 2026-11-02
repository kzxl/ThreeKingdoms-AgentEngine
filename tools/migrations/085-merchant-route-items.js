/**
 * Migration 085: multi-item merchant routes.
 *
 * `merchant_routes` keeps its first item columns for backward compatibility;
 * the full manifest lives in `merchant_route_items`, one row per item with its
 * own quantity and buy/sell band. Existing routes are backfilled as one-item
 * manifests.
 */

module.exports = {
  id: '085-merchant-route-items',
  description: 'Add multi-item merchant route manifests',
  up(db) {
    const hasRoutes = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='merchant_routes'"
    ).get();
    if (!hasRoutes) return;

    db.exec(`
      CREATE TABLE IF NOT EXISTS merchant_route_items (
        route_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        max_buy_price INTEGER NOT NULL CHECK (max_buy_price > 0),
        min_sell_price INTEGER NOT NULL CHECK (min_sell_price > 0),
        quantity_per_run REAL NOT NULL CHECK (quantity_per_run > 0),
        created_date TEXT NOT NULL,
        PRIMARY KEY (route_id, item_code)
      );
      CREATE INDEX IF NOT EXISTS idx_merchant_route_items_route
        ON merchant_route_items(route_id);
    `);

    db.exec(`
      INSERT OR IGNORE INTO merchant_route_items
        (route_id, item_code, max_buy_price, min_sell_price, quantity_per_run, created_date)
      SELECT route_id, item_code, max_buy_price, min_sell_price, quantity_per_run, created_date
      FROM merchant_routes;
    `);
  }
};
