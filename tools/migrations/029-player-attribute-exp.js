/**
 * Migration 029: player attribute EXP columns.
 *
 * Attribute progression and historical-event rewards write `int_exp` …
 * `cra_exp`. Older session schemas only had the base attributes, so align the
 * runtime table with the live model.
 */

const COLUMNS = ['int_exp', 'war_exp', 'ldr_exp', 'pol_exp', 'dip_exp', 'com_exp', 'log_exp', 'cra_exp'];

module.exports = {
  id: '029-player-attribute-exp',
  description: 'Add the eight player attribute EXP columns',
  up(db) {
    const table = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'player_state';`
    ).get();
    if (!table) {
      console.log('      player_state absent; nothing to add');
      return;
    }
    const columns = db.prepare('PRAGMA table_info(player_state)').all().map(column => column.name);
    for (const column of COLUMNS) {
      if (!columns.includes(column)) {
        db.exec(`ALTER TABLE player_state ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0;`);
        console.log(`      player_state.${column} added`);
      }
    }
  }
};
