/**
 * Migration 023: settlement market history.
 *
 * One row per item per monthly drift. The market-pulse screen reads the last
 * twelve points to show whether local stock is tightening or loosening.
 */

module.exports = {
  id: '023-settlement-market-history',
  description: 'Add the settlement market history table',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settlement_market_history (
        history_id TEXT PRIMARY KEY,
        settlement_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        game_date TEXT NOT NULL,
        stock REAL NOT NULL,
        demand REAL NOT NULL,
        stock_multiplier REAL NOT NULL,
        local_multiplier REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_market_history_lookup
        ON settlement_market_history(settlement_id, item_code, game_date);
    `);
    console.log('      settlement market history ready');
  }
};
