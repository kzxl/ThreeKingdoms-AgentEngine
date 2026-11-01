/**
 * Migration 078: logistics ambush and freight insurance.
 *
 * Freight shipments record an optional premium/claim and the quantity lost to
 * an ambush; the resolved flag keeps the risk check idempotent. Company route
 * shipments record the same loss fields (without insurance).
 */

module.exports = {
  id: '078-logistics-risk',
  description: 'Track ambush losses and freight insurance',
  up(db) {
    const addColumns = (table, columns) => {
      const exists = db.prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?"
      ).get(table);
      if (!exists) return;
      const current = db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name);
      for (const [name, ddl] of columns) {
        if (!current.includes(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl};`);
      }
    };

    addColumns('freight_shipments', [
      ['insured', 'INTEGER NOT NULL DEFAULT 0'],
      ['insurance_premium', 'INTEGER NOT NULL DEFAULT 0'],
      ['insurance_claim', 'INTEGER NOT NULL DEFAULT 0'],
      ['ambush_loss_quantity', 'REAL NOT NULL DEFAULT 0'],
      ['ambush_resolved', 'INTEGER NOT NULL DEFAULT 0']
    ]);
    addColumns('merchant_shipments', [
      ['ambush_loss_quantity', 'REAL NOT NULL DEFAULT 0'],
      ['ambush_resolved', 'INTEGER NOT NULL DEFAULT 0']
    ]);
  }
};
