/**
 * Migration 012: prestige scale (ROTK XIII-like).
 *
 * Fame becomes a 0–10,000 soft-capped social score. Legacy values were on a
 * roughly 0–1,000 scale, so a database that predates `player_state.fame` is
 * multiplied by 10 once. A fresh schema already ships the new scale and is
 * detected by the column existing before this migration.
 */

const LEGACY_MULTIPLIER = 10;
const STARTING_FAME = 500;

function hasColumn(db, table, column) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some(row => row.name === column);
}

function addColumnIfMissing(db, table, column, ddl) {
  if (!hasColumn(db, table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl};`);
}

module.exports = {
  id: '012-prestige-scale',
  description: 'Add player fame, rescale legacy prestige x10, and create the fame ledger/view',
  up(db) {
    const hasPlayer = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='player_state'")
      .get();
    if (!hasPlayer) {
      console.log('      (player_state absent — nothing to migrate)');
      return;
    }

    const legacyScale = !hasColumn(db, 'player_state', 'fame');
    addColumnIfMissing(db, 'player_state', 'fame', 'INTEGER NOT NULL DEFAULT 500');
    addColumnIfMissing(db, 'player_state', 'credibility', 'INTEGER NOT NULL DEFAULT 50');
    addColumnIfMissing(db, 'player_state', 'virtue', 'INTEGER NOT NULL DEFAULT 50');

    if (legacyScale) {
      const npc = db
        .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='npc_personal_progression'")
        .get();
      if (npc) {
        db.prepare('UPDATE npc_personal_progression SET prestige = prestige * ?;').run(LEGACY_MULTIPLIER);
      }
      const family = db
        .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='family_lineage'")
        .get();
      if (family) {
        db.prepare('UPDATE family_lineage SET family_prestige = family_prestige * ?;').run(LEGACY_MULTIPLIER);
      }
      db.prepare('UPDATE player_state SET fame = ? WHERE fame < ?;').run(STARTING_FAME, STARTING_FAME);
      console.log(`      rescaled legacy prestige x${LEGACY_MULTIPLIER}`);
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS prestige_events (
        event_id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        game_date TEXT NOT NULL,
        delta INTEGER NOT NULL,
        before_fame INTEGER NOT NULL,
        after_fame INTEGER NOT NULL,
        reason TEXT NOT NULL,
        source_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.exec(`
      CREATE VIEW IF NOT EXISTS character_prestige AS
        SELECT player_id AS character_id, fame, 'PLAYER' AS kind FROM player_state
        UNION ALL
        SELECT npc_id AS character_id, prestige AS fame, 'NPC' AS kind FROM npc_personal_progression;
    `);

    const maxFame = db.prepare('SELECT MAX(fame) AS m FROM player_state;').get();
    console.log(`      fame scale ready (player max ${Number(maxFame?.m || 0)})`);
  }
};
