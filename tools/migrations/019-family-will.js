/**
 * Migration 019: family will.
 *
 * The player can leave a share of liquid capital to charity; the heir keeps the
 * rest and all enterprises/equipment. Shares are basis points (0–5000 = 0–50%).
 */

module.exports = {
  id: '019-family-will',
  description: 'Add the inheritance will (charity share) table',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS family_will (
        character_id TEXT PRIMARY KEY,
        heir_id TEXT,
        charity_share_bps INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('      family will ready');
  }
};
