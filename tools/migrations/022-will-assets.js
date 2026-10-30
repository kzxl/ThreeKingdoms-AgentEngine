/**
 * Migration 022: asset bequests.
 *
 * Enterprises and equipment can be assigned to a child in the will. The asset
 * leaves the heir's estate when the chosen child is not the successor.
 */

module.exports = {
  id: '022-will-assets',
  description: 'Add enterprise/equipment bequests to the family will',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS family_will_assets (
        character_id TEXT NOT NULL,
        asset_type TEXT NOT NULL CHECK (asset_type IN ('BUSINESS', 'EQUIPMENT')),
        asset_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        PRIMARY KEY (character_id, asset_type, asset_id)
      );
    `);
    console.log('      will assets ready');
  }
};
