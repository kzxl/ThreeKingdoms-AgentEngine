/**
 * Migration 069: idempotent merchant day ledger.
 *
 * A merchant day is atomic: all routes either complete the day's
 * advance/unload/sell/procure/dispatch sequence, or none of it commits.
 * The ledger makes a repeated tick for the same campaign day a no-op.
 */

module.exports = {
  id: '069-merchant-day-ledger',
  description: 'Add atomic per-day merchant tick ledger',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS merchant_day_ledger (
        game_date TEXT PRIMARY KEY,
        routes_processed INTEGER NOT NULL DEFAULT 0,
        events_written INTEGER NOT NULL DEFAULT 0,
        result_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
};
