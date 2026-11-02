/**
 * Migration 027: tie a siege to the expedition that invested it.
 *
 * When present, the siege draws its troops from the arrived expedition and
 * writes surviving strength back to it; the expedition ends CONCLUDED when the
 * siege resolves.
 */

module.exports = {
  id: '027-siege-expedition',
  description: 'Add expedition_id to session_sieges',
  up(db) {
    const table = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'session_sieges';`
    ).get();
    if (!table) {
      console.log('      session_sieges absent; column will be created on first use');
      return;
    }

    const columns = db.prepare('PRAGMA table_info(session_sieges)').all().map(column => column.name);
    if (!columns.includes('expedition_id')) {
      db.exec('ALTER TABLE session_sieges ADD COLUMN expedition_id TEXT;');
      console.log('      session_sieges.expedition_id added');
    }
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sieges_active
        ON session_sieges(status, settlement_id);
    `);
  }
};
