/**
 * Migration 075: freight source-stock reservation.
 *
 * A freight contract used to debit nothing at the source and credit the
 * destination on delivery, creating goods. The shipment now records how many
 * units were reserved from the source market at accept time so the audit and a
 * failed shipment can return the cargo.
 */

module.exports = {
  id: '075-freight-stock-reservation',
  description: 'Reserve source settlement stock when a freight contract is accepted',
  up(db) {
    const hasTable = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='freight_shipments'"
    ).get();
    if (!hasTable) return;
    const columns = db.prepare('PRAGMA table_info(freight_shipments)').all();
    if (!columns.some(column => column.name === 'source_reserved_quantity')) {
      db.exec(
        'ALTER TABLE freight_shipments ADD COLUMN source_reserved_quantity REAL NOT NULL DEFAULT 0;'
      );
    }
  }
};
