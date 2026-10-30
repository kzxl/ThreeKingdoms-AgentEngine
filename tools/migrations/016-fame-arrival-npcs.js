/**
 * Migration 016: named guests.
 *
 * A fame arrival can now be an actual specialist from master_characters. The
 * guest is inserted into npc_state with role GUEST, so the existing workforce
 * hire flow can turn them into staff without paying the arrival twice.
 */

module.exports = {
  id: '016-fame-arrival-npcs',
  description: 'Link fame arrivals to master character ids',
  up(db) {
    const table = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='fame_arrivals'")
      .get();
    if (!table) {
      console.log('      (fame_arrivals absent — nothing to migrate)');
      return;
    }
    const columns = db.prepare('PRAGMA table_info(fame_arrivals)').all().map(row => row.name);
    if (!columns.includes('npc_id')) {
      db.exec('ALTER TABLE fame_arrivals ADD COLUMN npc_id TEXT;');
    }
    console.log('      fame_arrivals.npc_id ready');
  }
};
