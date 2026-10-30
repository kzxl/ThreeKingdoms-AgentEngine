/**
 * Migration 024: NPC age.
 *
 * `npc_state` had no age column, so named NPCs could never grow older while
 * the campaign clock advanced. The baseline age comes from the master roster;
 * the yearly month-close hook increments it from there.
 */

module.exports = {
  id: '024-npc-age',
  description: 'Add npc_state.age and backfill from master_characters.baseline_age',
  up(db) {
    const columns = db.prepare('PRAGMA table_info(npc_state)').all().map(column => column.name);
    if (!columns.includes('age')) {
      db.exec('ALTER TABLE npc_state ADD COLUMN age INTEGER NOT NULL DEFAULT 30;');
      console.log('      npc_state.age added');
    }

    const masterAges = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'master_characters';`
    ).get();
    if (masterAges) {
      db.exec(`
        UPDATE npc_state
        SET age = COALESCE(
          (SELECT baseline_age FROM master_characters mc WHERE mc.npc_id = npc_state.npc_id),
          age
        )
        WHERE age IS NULL OR age = 30;
      `);
      console.log('      npc ages backfilled from the master roster');
    }
  }
};
