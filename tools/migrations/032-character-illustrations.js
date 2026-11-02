/**
 * Migration 032: character illustration slots.
 *
 * The dossier is DB-driven; portrait and illustration URLs live on the master
 * roster and on the runtime NPC/player rows, so a future art pipeline only has
 * to fill columns, not patch UI code.
 */

const TABLES = ['master_characters', 'npc_state', 'player_state'];
const COLUMNS = [
  ['portrait_url', 'TEXT'],
  ['illustration_url', 'TEXT']
];

module.exports = {
  id: '032-character-illustrations',
  description: 'Add portrait_url and illustration_url to character tables',
  up(db) {
    for (const table of TABLES) {
      const exists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?;`
      ).get(table);
      if (!exists) continue;
      const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name);
      for (const [name, definition] of COLUMNS) {
        if (!columns.includes(name)) {
          db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition};`);
          console.log(`      ${table}.${name} added`);
        }
      }
    }
  }
};
