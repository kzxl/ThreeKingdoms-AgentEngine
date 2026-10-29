/**
 * Migration 004: Durable identifier sequences.
 *
 * Domain identifiers used to be built from `Date.now()`, which collided inside a
 * millisecond and made replays non-reproducible. A single sequence table gives
 * every id scope a persistent, deterministic counter.
 */

module.exports = {
  id: '004-create-id-sequences',
  description: 'Create id_sequence for deterministic per-scope identifier counters',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS id_sequence (
        scope      TEXT PRIMARY KEY,
        next_value INTEGER NOT NULL DEFAULT 0
      );
    `);
    console.log('      • ensured id_sequence table');
  }
};
