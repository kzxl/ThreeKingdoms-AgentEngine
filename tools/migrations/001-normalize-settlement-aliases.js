/**
 * Migration 001: Normalize settlement identifier aliases.
 *
 * Historical ingestion (tools/ingest-markdown-master.js) emitted the legacy
 * alias `changan` next to the canonical `chang_an`, producing a duplicate
 * session_settlements row with zero granary that broke world-map invariant
 * verification and could silently shadow settlement lookups.
 *
 * This migration rewrites every alias reference to the canonical id and then
 * removes the duplicate settlement row, keeping the campaign seed data intact.
 */

const SETTLEMENT_ALIASES = {
  changan: 'chang_an'
};

function tableExists(db, name) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

function columnExists(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
}

module.exports = {
  id: '001-normalize-settlement-aliases',
  description: 'Fold legacy settlement aliases (changan) into canonical ids and drop duplicate rows',
  up(db) {
    const rewritten = [];

    for (const [alias, canonical] of Object.entries(SETTLEMENT_ALIASES)) {
      if (tableExists(db, 'bandit_strongholds') && columnExists(db, 'bandit_strongholds', 'location_near')) {
        const info = db
          .prepare('UPDATE bandit_strongholds SET location_near = ? WHERE location_near = ?')
          .run(canonical, alias);
        if (info.changes) rewritten.push(`bandit_strongholds.location_near x${info.changes}`);
      }

      if (tableExists(db, 'session_settlements')) {
        const canonicalRow = db
          .prepare('SELECT settlement_id FROM session_settlements WHERE settlement_id = ?')
          .get(canonical);
        const aliasRow = db
          .prepare('SELECT settlement_id FROM session_settlements WHERE settlement_id = ?')
          .get(alias);

        if (aliasRow && canonicalRow) {
          db.prepare('DELETE FROM session_settlements WHERE settlement_id = ?').run(alias);
          rewritten.push(`session_settlements duplicate '${alias}' removed`);
        } else if (aliasRow && !canonicalRow) {
          db.prepare('UPDATE session_settlements SET settlement_id = ? WHERE settlement_id = ?').run(
            canonical,
            alias
          );
          rewritten.push(`session_settlements '${alias}' renamed to '${canonical}'`);
        }
      }
    }

    if (rewritten.length === 0) {
      console.log('      (no settlement aliases needed normalization)');
    } else {
      for (const line of rewritten) console.log(`      • ${line}`);
    }
  }
};
