/**
 * Migration 015: defeat states and battle-duel log.
 *
 * A campaign can end by duel death or sustained bankruptcy; both are explicit
 * statuses so the UI and action gate can stop cleanly instead of silently
 * continuing. NPC death is tracked with `npc_state.is_alive`.
 */

module.exports = {
  id: '015-defeat-states',
  description: 'Add campaign defeat status, distress counter, battle duel log and NPC alive flag',
  up(db) {
    const hasMeta = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='campaign_meta'")
      .get();
    if (hasMeta) {
      const metaColumns = db.prepare('PRAGMA table_info(campaign_meta)').all().map(row => row.name);
      if (!metaColumns.includes('status')) {
        db.exec("ALTER TABLE campaign_meta ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';");
      }
      if (!metaColumns.includes('defeat_reason')) {
        db.exec('ALTER TABLE campaign_meta ADD COLUMN defeat_reason TEXT;');
      }
      if (!metaColumns.includes('distress_months')) {
        db.exec('ALTER TABLE campaign_meta ADD COLUMN distress_months INTEGER NOT NULL DEFAULT 0;');
      }
    }

    const hasNpc = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='npc_state'")
      .get();
    if (hasNpc) {
      const npcColumns = db.prepare('PRAGMA table_info(npc_state)').all().map(row => row.name);
      if (!npcColumns.includes('is_alive')) {
        db.exec('ALTER TABLE npc_state ADD COLUMN is_alive INTEGER NOT NULL DEFAULT 1;');
      }
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS battle_duels (
        duel_id TEXT PRIMARY KEY,
        battle_id TEXT,
        game_date TEXT NOT NULL,
        context TEXT NOT NULL,
        player_id TEXT NOT NULL,
        player_name TEXT,
        enemy_name TEXT,
        negotiation_result TEXT,
        negotiation_roll REAL,
        duel_triggered INTEGER NOT NULL DEFAULT 0,
        duel_winner TEXT,
        death_chance REAL,
        death_roll REAL,
        death_applied INTEGER NOT NULL DEFAULT 0,
        narrative_vi TEXT,
        narrative_en TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('      defeat states and battle duel log ready');
  }
};
