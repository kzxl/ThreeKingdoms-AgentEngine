/**
 * Migration 067: merchant company routes.
 *
 * A route connects two player warehouses. The daily tick procures from NPC
 * offers below `max_buy_price`, ships on schedule, unloads into the destination
 * warehouse and sells above `min_sell_price`.
 */

module.exports = {
  id: '067-merchant-routes',
  description: 'Add automated merchant routes and company shipments',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS merchant_routes (
        route_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        name_vi TEXT NOT NULL,
        from_warehouse_id TEXT NOT NULL,
        to_warehouse_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        max_buy_price INTEGER NOT NULL CHECK (max_buy_price > 0),
        min_sell_price INTEGER NOT NULL CHECK (min_sell_price > 0),
        quantity_per_run REAL NOT NULL CHECK (quantity_per_run > 0),
        frequency_days INTEGER NOT NULL DEFAULT 7 CHECK (frequency_days >= 1),
        guard_tier TEXT NOT NULL DEFAULT 'VETERAN',
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED')),
        next_run_date TEXT NOT NULL,
        created_date TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS merchant_shipments (
        shipment_id TEXT PRIMARY KEY,
        route_id TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        from_warehouse_id TEXT NOT NULL,
        to_warehouse_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity > 0),
        days_remaining INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'EN_ROUTE' CHECK (status IN ('EN_ROUTE','ARRIVED','DELIVERED')),
        cargo_value INTEGER NOT NULL DEFAULT 0,
        guard_fee INTEGER NOT NULL DEFAULT 0,
        created_date TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS merchant_events (
        event_id TEXT PRIMARY KEY,
        route_id TEXT NOT NULL,
        game_date TEXT NOT NULL,
        event_type TEXT NOT NULL,
        item_code TEXT,
        quantity REAL,
        total_cash INTEGER,
        message_vi TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_merchant_routes_owner
        ON merchant_routes(owner_id, status);
      CREATE INDEX IF NOT EXISTS idx_merchant_shipments_route
        ON merchant_shipments(route_id, status);
    `);
  }
};
