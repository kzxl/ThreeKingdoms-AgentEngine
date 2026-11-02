/**
 * Migration 030: campaign legacy for NG+.
 *
 * A finished campaign (victory or final defeat without an heir) leaves one
 * legacy row. The next campaign in the same database line reads it and applies
 * a small starting bonus.
 */

module.exports = {
  id: '030-campaign-legacy',
  description: 'Add the campaign legacy table for NG+ carry-over',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS campaign_legacy (
        legacy_id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        generation INTEGER NOT NULL DEFAULT 1,
        fame INTEGER NOT NULL DEFAULT 0,
        net_worth INTEGER NOT NULL DEFAULT 0,
        settlements INTEGER NOT NULL DEFAULT 0,
        outcome TEXT NOT NULL DEFAULT 'VICTORIOUS',
        title_vi TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('      campaign_legacy ready');
  }
};
