/**
 * Migration 064: settlement warehouses.
 *
 * The personal bag (`inventory_items`) is global. A warehouse is per settlement:
 * the player rents or owns capacity there, deposits goods and withdraws them.
 * This is the foundation for stall sourcing, freight and automatic trade routes.
 */

module.exports = {
  id: '064-warehouses',
  description: 'Add settlement warehouses and per-warehouse stock',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS warehouses (
        warehouse_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        settlement_id TEXT NOT NULL,
        name_vi TEXT NOT NULL,
        ownership_type TEXT NOT NULL DEFAULT 'RENTED' CHECK (ownership_type IN ('RENTED','OWNED')),
        capacity REAL NOT NULL DEFAULT 300 CHECK (capacity > 0),
        rent_cash INTEGER NOT NULL DEFAULT 300,
        purchase_price INTEGER NOT NULL DEFAULT 2000,
        lease_until TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED')),
        created_date TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(owner_id, settlement_id)
      );

      CREATE TABLE IF NOT EXISTS warehouse_stock (
        warehouse_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
        unit_cost_basis INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (warehouse_id, item_code)
      );

      CREATE INDEX IF NOT EXISTS idx_warehouse_stock_item
        ON warehouse_stock(item_code);
    `);
  }
};
