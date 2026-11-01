/**
 * Migration 077: stall listings track their effect on local market stock.
 *
 * A listing takes goods out of the player's bag/warehouse and puts them on the
 * local market; a sale consumes them; closing returns unsold goods and removes
 * them from the market. `market_effect` is the net stock delta still held by
 * the listing, so the audit can prove the three steps reconcile.
 */

module.exports = {
  id: '077-stall-market-effect',
  description: 'Track the local market stock effect of each stall listing',
  up(db) {
    const hasListings = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='stall_listings'"
    ).get();
    if (!hasListings) return;
    const columns = db.prepare('PRAGMA table_info(stall_listings)').all();
    if (!columns.some(column => column.name === 'market_effect')) {
      db.exec('ALTER TABLE stall_listings ADD COLUMN market_effect REAL NOT NULL DEFAULT 0;');
    }

    // Bring pre-077 active listings into the new model: their goods were never
    // added to the municipal stock, so add them once and remember the effect.
    const hasMarketState = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='settlement_market_state'"
    ).get();
    if (hasMarketState) {
      db.exec(`
        INSERT INTO settlement_market_state (settlement_id, item_code, stock, demand)
        SELECT ps.settlement_id, l.item_code, SUM(l.quantity), 100
        FROM stall_listings l
        JOIN player_stalls ps ON ps.stall_id = l.stall_id
        WHERE l.status = 'ACTIVE' AND l.quantity > 0
        GROUP BY ps.settlement_id, l.item_code
        ON CONFLICT(settlement_id, item_code)
        DO UPDATE SET stock = stock + excluded.stock, updated_at = CURRENT_TIMESTAMP;
      `);
    }
    db.exec(`
      UPDATE stall_listings
      SET market_effect = CASE WHEN status = 'ACTIVE' THEN quantity ELSE 0 END;
    `);
  }
};
