/**
 * Migration 008: Normalize archived grain units.
 *
 * The seed and ingest paths now write `unit_en = 'piculs'` (and `unit_vi =
 * 'Thạch'`), but existing databases still carry `Dan` on master_items. The
 * currency standard (docs/CURRENCY_UNIT_STANDARD.md) requires Thạch/piculs, so
 * rewrite the archived rows in place.
 */

module.exports = {
  id: '008-normalize-grain-unit',
  description: 'Rewrite master_items grain units from Dan to Thạch/piculs',
  up(db) {
    const table = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_items'")
      .get();
    if (!table) {
      console.log('      (master_items absent — nothing to normalize)');
      return;
    }

    const columns = db.prepare('PRAGMA table_info(master_items)').all().map(c => c.name);
    let changed = 0;
    if (columns.includes('unit_en')) {
      changed += db.prepare("UPDATE master_items SET unit_en = 'piculs' WHERE unit_en = 'Dan'").run().changes;
    }
    if (columns.includes('unit_vi')) {
      changed += db.prepare("UPDATE master_items SET unit_vi = 'Thạch' WHERE unit_vi = 'Dan'").run().changes;
    }
    console.log(`      normalized ${changed} master_items unit cell(s)`);
  }
};
