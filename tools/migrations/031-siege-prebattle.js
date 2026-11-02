/**
 * Migration 031: siege pre-battle log.
 *
 * Stores the negotiation/champion-duel outcome that happened before the first
 * day of a siege, so the result is auditable after the siege resolves.
 */

module.exports = {
  id: '031-siege-prebattle',
  description: 'Add prebattle_json to session_sieges',
  up(db) {
    const table = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'session_sieges';`
    ).get();
    if (!table) {
      console.log('      session_sieges absent; column will be created on first use');
      return;
    }
    const columns = db.prepare('PRAGMA table_info(session_sieges)').all().map(column => column.name);
    if (!columns.includes('prebattle_json')) {
      db.exec('ALTER TABLE session_sieges ADD COLUMN prebattle_json TEXT;');
      console.log('      session_sieges.prebattle_json added');
    }
  }
};
