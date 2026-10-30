/**
 * Migration 021: per-child inheritance shares.
 *
 * The will can now assign a basis-point share to each child. Shares are paid
 * into family_children.inheritance_cash; the chosen heir keeps their share in
 * the player treasury, and any remainder goes to the heir.
 */

module.exports = {
  id: '021-will-allocations',
  description: 'Add per-child inheritance allocations',
  up(db) {
    const hasChildren = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='family_children'")
      .get();
    if (hasChildren) {
      const columns = db.prepare('PRAGMA table_info(family_children)').all().map(row => row.name);
      if (!columns.includes('inheritance_cash')) {
        db.exec('ALTER TABLE family_children ADD COLUMN inheritance_cash INTEGER NOT NULL DEFAULT 0;');
      }
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS family_will_allocations (
        character_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        share_bps INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (character_id, child_id)
      );
    `);
    console.log('      will allocations ready');
  }
};
