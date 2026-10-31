/**
 * Migration 053: day phases.
 *
 * A day has three phases (morning/afternoon/evening). Administrative actions
 * spend one phase; a day-consuming action resets the phase. Existing saves
 * start at phase 0.
 */

module.exports = {
  id: '053-day-phases',
  description: 'Add campaign_meta.current_phase for three-phase days',
  up(db) {
    const hasMeta = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='campaign_meta'"
    ).get();
    if (!hasMeta) return;
    const columns = db.prepare('PRAGMA table_info(campaign_meta);').all().map(row => row.name);
    if (!columns.includes('current_phase')) {
      db.exec('ALTER TABLE campaign_meta ADD COLUMN current_phase INTEGER NOT NULL DEFAULT 0;');
    }
    db.exec('UPDATE campaign_meta SET current_phase = 0 WHERE current_phase IS NULL OR current_phase < 0 OR current_phase > 2;');
  }
};
