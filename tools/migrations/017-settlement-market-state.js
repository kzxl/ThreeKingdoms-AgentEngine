/**
 * Migration 017: persisted settlement stock and demand.
 *
 * Specialisation is static; stock/demand is the volatile layer. Rows are
 * created lazily for the item a trade asks about, so the table stays small.
 */

module.exports = {
  id: '017-settlement-market-state',
  description: 'Persist settlement stock/demand for local price quotes',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settlement_market_state (
        settlement_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        stock REAL NOT NULL DEFAULT 100,
        demand REAL NOT NULL DEFAULT 100,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (settlement_id, item_code)
      );
    `);
    console.log('      settlement market state ready');
  }
};
