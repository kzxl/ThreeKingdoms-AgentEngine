/**
 * Migration 076: one day ledger for every world subsystem.
 *
 * Merchant routes already had `merchant_day_ledger`. Stalls, freight and
 * essential consumption now use the same `(system, game_date)` marker so a
 * repeated day cannot sell twice, spoil twice or consume twice.
 */

module.exports = {
  id: '076-world-day-ledger',
  description: 'Add one idempotent per-system campaign day ledger',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS world_day_ledger (
        system TEXT NOT NULL,
        game_date TEXT NOT NULL,
        result_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (system, game_date)
      );
    `);
    const merchantTable = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='merchant_day_ledger'"
    ).get();
    if (merchantTable) {
      db.exec(`
        INSERT OR IGNORE INTO world_day_ledger (system, game_date, result_json)
        SELECT 'merchant', game_date, result_json FROM merchant_day_ledger;
      `);
    }
  }
};
