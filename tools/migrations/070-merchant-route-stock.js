/**
 * Migration 070: tag merchant-route cargo separately from other warehouse stock.
 *
 * Without this, a route could sell any matching item already sitting in the
 * destination warehouse. `merchant_route_stock` records only what that route
 * unloaded; sales consume from this tag, not the whole warehouse row.
 */

module.exports = {
  id: '070-merchant-route-stock',
  description: 'Track route-owned cargo inside destination warehouses',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS merchant_route_stock (
        route_id TEXT NOT NULL,
        warehouse_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (route_id, warehouse_id, item_code)
      );
    `);
  }
};
