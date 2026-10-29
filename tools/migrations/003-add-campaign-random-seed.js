/**
 * Migration 003: Ensure campaign_meta carries a deterministic random seed.
 *
 * `tools/schema.sql` has declared `random_seed` for a while, but playthroughs
 * created before that change lack the column, so new campaigns cannot insert it
 * and the simulation has no reproducible entropy source.
 */

module.exports = {
  id: '003-add-campaign-random-seed',
  description: 'Add campaign_meta.random_seed (default 1840201) when the column is missing',
  up(db) {
    const hasTable = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='campaign_meta'")
      .get();
    if (!hasTable) {
      console.log('      (campaign_meta table absent — nothing to add)');
      return;
    }

    const columns = db.prepare('PRAGMA table_info(campaign_meta)').all().map(c => c.name);
    if (columns.includes('random_seed')) {
      console.log('      (random_seed already present)');
      return;
    }

    db.exec('ALTER TABLE campaign_meta ADD COLUMN random_seed INTEGER NOT NULL DEFAULT 1840201;');
    db.exec('UPDATE campaign_meta SET random_seed = 1840201 WHERE random_seed IS NULL;');
    console.log('      • added campaign_meta.random_seed (default 1840201)');
  }
};
