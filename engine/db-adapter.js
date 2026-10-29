/**
 * ThreeKingdoms-AgentEngine: Shared Database Adapter (engine/db-adapter.js)
 *
 * CommonJS binding over the single SQLite driver (better-sqlite3) used by the
 * legacy engine, CLI tools and the HTTP gateway. It is the CJS counterpart of
 * src/core/database.ts and follows the same policy:
 *   - one cached connection per database path (no open/close per query)
 *   - bound parameters are supported on every read
 *   - any failure throws with database + statement context (no silent [])
 *
 * The former sqlite3-CLI fallback has been removed: it spawned a process and
 * wrote a temp .sql file for every query, which dominated request latency.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT_DIR = path.resolve(__dirname, '..');
const SAVES_DIR = path.join(ROOT_DIR, 'saves');

/** @type {Map<string, import('better-sqlite3').Database>} */
const connections = new Map();

function resolveDbPath(dbPath) {
  return path.resolve(dbPath || path.join(SAVES_DIR, 'session.db'));
}

function describeError(err, dbPath, sql) {
  const compact = String(sql || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  return new Error(`[db-adapter] ${err.message} (db=${path.basename(dbPath)}) :: ${compact}`);
}

/**
 * Returns the cached read/write connection for a database path.
 * Opens it with the same pragmas as DatabaseService so both bindings behave alike.
 */
function getConnection(dbPath) {
  const resolved = resolveDbPath(dbPath);
  const cached = connections.get(resolved);
  if (cached && cached.open) return cached;

  if (!fs.existsSync(resolved)) {
    throw new Error(`[db-adapter] SQLite database not found: ${resolved}`);
  }

  const db = new Database(resolved);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  connections.set(resolved, db);
  return db;
}

/**
 * Executes a SELECT returning rows as plain objects.
 * @param {string} dbPath
 * @param {string} sql
 * @param {Array<any>} [params]
 * @returns {Array<Record<string, any>>}
 */
function runSqlJson(dbPath, sql, params = []) {
  const resolved = resolveDbPath(dbPath);
  try {
    const stmt = getConnection(resolved).prepare(sql);
    return params && params.length > 0 ? stmt.all(...params) : stmt.all();
  } catch (err) {
    throw describeError(err, resolved, sql);
  }
}

/**
 * Executes a single INSERT/UPDATE/DELETE with bound parameters.
 * @returns {{ changes: number, lastInsertRowid: number|bigint }}
 */
function runSqlExec(dbPath, sql, params = []) {
  const resolved = resolveDbPath(dbPath);
  try {
    const stmt = getConnection(resolved).prepare(sql);
    return params && params.length > 0 ? stmt.run(...params) : stmt.run();
  } catch (err) {
    throw describeError(err, resolved, sql);
  }
}

/**
 * Executes a multi-statement SQL script inside an ACID transaction.
 * @param {string} dbPath
 * @param {string} sqlStatements
 * @returns {{ success: boolean, error?: string }}
 */
function runSqlBatch(dbPath, sqlStatements) {
  const resolved = resolveDbPath(dbPath);
  if (!fs.existsSync(resolved)) {
    return { success: false, error: `SQLite database not found: ${resolved}` };
  }

  let db = null;
  try {
    db = getConnection(resolved);
    const hasExplicitTx = /\bBEGIN(\s+TRANSACTION)?\b/i.test(sqlStatements);
    if (hasExplicitTx) {
      db.exec(sqlStatements);
    } else {
      db.exec(`BEGIN TRANSACTION;\n${sqlStatements}\nCOMMIT;`);
    }
    return { success: true };
  } catch (err) {
    try {
      if (db && db.open && db.inTransaction) db.exec('ROLLBACK;');
    } catch {}
    return { success: false, error: err.message };
  }
}

/**
 * Executes a raw multi-statement script without wrapping it in a transaction.
 */
function execSql(dbPath, sql) {
  const resolved = resolveDbPath(dbPath);
  try {
    getConnection(resolved).exec(sql);
    return true;
  } catch (err) {
    throw describeError(err, resolved, sql);
  }
}

/**
 * Escapes single quotes for raw SQL literals.
 * @deprecated Prefer bound parameters; retained for legacy narrative strings.
 */
function escapeSql(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/'/g, "''");
}

/** Closes one cached connection, or every connection when the path is omitted. */
function closeConnections(dbPath) {
  if (dbPath) {
    const resolved = resolveDbPath(dbPath);
    const db = connections.get(resolved);
    if (db && db.open) db.close();
    connections.delete(resolved);
    return;
  }
  for (const db of connections.values()) {
    try {
      if (db.open) db.close();
    } catch {}
  }
  connections.clear();
}

module.exports = {
  runSqlJson,
  runSqlExec,
  runSqlBatch,
  execSql,
  escapeSql,
  closeConnections,
  getConnection,
  resolveDbPath
};
