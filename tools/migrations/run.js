#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Versioned Data Migration Runner (tools/migrations/run.js)
 *
 * Applies idempotent, versioned data migrations to a session database and
 * records them in the `schema_migrations` ledger. This replaces ad-hoc SQL
 * patching so every playthrough instance can be brought to a known state.
 *
 * Usage:
 *   node tools/migrations/run.js              # apply pending migrations
 *   node tools/migrations/run.js --status     # list applied / pending
 *   node tools/migrations/run.js --dry-run    # report without writing
 *
 * Target database: SIM_DB_PATH or saves/session.db.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.resolve(__dirname, '../..');
const DB_PATH = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');

function loadMigrations() {
  return fs
    .readdirSync(__dirname)
    .filter(name => /^\d{3}-.+\.js$/.test(name))
    .sort()
    .map(name => {
      const mod = require(path.join(__dirname, name));
      if (!mod.id || typeof mod.up !== 'function') {
        throw new Error(`Migration ${name} must export { id, up(db) }`);
      }
      return mod;
    });
}

function ensureLedger(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_id TEXT PRIMARY KEY,
      description  TEXT NOT NULL,
      applied_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function appliedIds(db) {
  return new Set(db.prepare('SELECT migration_id FROM schema_migrations').all().map(r => r.migration_id));
}

function applyPending(db, migrations, pending, { dryRun = false, log = console.log } = {}) {
  const appliedNow = [];
  for (const migration of pending) {
    if (dryRun) {
      log(`  [dry-run] would apply ${migration.id} — ${migration.description}`);
      continue;
    }
    const apply = db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO schema_migrations (migration_id, description) VALUES (?, ?)').run(
        migration.id,
        migration.description
      );
    });
    apply();
    appliedNow.push(migration.id);
    log(`  ✅ applied ${migration.id} — ${migration.description}`);
  }
  return appliedNow;
}

/**
 * Applies every pending migration to a database path. Used by the CLI and by
 * `tools/sim-db.js init` so a freshly initialized database is never behind.
 */
function applyMigrations(dbPath = DB_PATH, { log = console.log } = {}) {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database not found: ${dbPath}`);
  }
  const db = new Database(dbPath);
  try {
    db.pragma('foreign_keys = ON');
    ensureLedger(db);
    const migrations = loadMigrations();
    const applied = appliedIds(db);
    const pending = migrations.filter(m => !applied.has(m.id));
    return applyPending(db, migrations, pending, { log });
  } finally {
    db.close();
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const statusOnly = args.includes('--status');

  if (!fs.existsSync(DB_PATH)) {
    console.error(`[migrate] Database not found: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  ensureLedger(db);

  const migrations = loadMigrations();
  const applied = appliedIds(db);
  const pending = migrations.filter(m => !applied.has(m.id));

  console.log(`[migrate] Target: ${path.relative(ROOT, DB_PATH)}`);
  console.log(`[migrate] Applied: ${applied.size} | Pending: ${pending.length}`);

  if (statusOnly) {
    for (const m of migrations) {
      console.log(`  ${applied.has(m.id) ? '✅ applied' : '⏳ pending'}  ${m.id} — ${m.description}`);
    }
    db.close();
    return;
  }

  try {
    applyPending(db, migrations, pending, { dryRun });
  } catch (err) {
    console.error(`  ❌ migration failed: ${err.message}`);
    db.close();
    process.exit(1);
  }

  db.close();
  console.log('[migrate] Done.');
}

if (require.main === module) {
  main();
}

module.exports = {
  applyMigrations,
  loadMigrations
};
