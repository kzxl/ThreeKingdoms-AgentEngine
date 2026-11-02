/**
 * Migration 065: stall stock source.
 *
 * A listing can now come from the personal bag or from a warehouse in the same
 * settlement. Closing the stall returns unsold goods to the original source,
 * keeping stall storage separate from both.
 */

module.exports = {
  id: '065-stall-source',
  description: 'Track whether stall listings came from bag or warehouse',
  up(db) {
    const hasListings = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='stall_listings'"
    ).get();
    if (!hasListings) return;
    const columns = db.prepare('PRAGMA table_info(stall_listings);').all().map(row => row.name);
    if (!columns.includes('source_type')) {
      db.exec("ALTER TABLE stall_listings ADD COLUMN source_type TEXT NOT NULL DEFAULT 'BAG';");
    }
    if (!columns.includes('warehouse_id')) {
      db.exec('ALTER TABLE stall_listings ADD COLUMN warehouse_id TEXT;');
    }
  }
};
