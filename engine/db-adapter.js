/**
 * ThreeKingdoms-AgentEngine: Shared Database Adapter (engine/db-adapter.js)
 *
 * Provides a unified, high-performance SQLite adapter for engine scripts:
 * - Native in-process queries via better-sqlite3 (sub-millisecond latency, zero disk I/O churn)
 * - Safe transaction boundaries and foreign-key pragma enforcement
 * - Clean lifecycle management to avoid Windows file-lock conflicts during test sandboxing
 * - Graceful fallback to sqlite3 CLI execution if native driver encounters an unexpected environment issue
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let BetterSqlite3 = null;
try {
  BetterSqlite3 = require('better-sqlite3');
} catch {
  BetterSqlite3 = null;
}

const ROOT_DIR = path.resolve(__dirname, '..');
const SAVES_DIR = path.join(ROOT_DIR, 'saves');

/**
 * Escapes single quotes for raw SQL literals.
 * @param {string|number|null|undefined} str
 * @returns {string}
 */
function escapeSql(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/'/g, "''");
}

/**
 * Executes a SQL query returning an array of matched rows as plain JavaScript objects.
 * Uses better-sqlite3 with instant connection disposal for Windows file unlinking safety.
 *
 * @param {string} dbPath - Path to the SQLite database file
 * @param {string} sql - SQL SELECT statement
 * @param {Array<any>} [params] - Optional query parameters
 * @returns {Array<Record<string, any>>}
 */
function runSqlJson(dbPath, sql, params = []) {
  if (!fs.existsSync(dbPath)) return [];

  if (BetterSqlite3) {
    let db = null;
    try {
      db = new BetterSqlite3(dbPath, { readonly: true, fileMustExist: true });
      const stmt = db.prepare(sql);
      const rows = params && params.length > 0 ? stmt.all(...params) : stmt.all();
      return rows;
    } catch {
      // Fallback to CLI execution on prepare/syntax discrepancy
    } finally {
      if (db && db.open) {
        try { db.close(); } catch {}
      }
    }
  }

  // CLI Fallback (sqlite3 -json)
  const tempDir = path.dirname(dbPath);
  const tempFile = path.join(tempDir, `json_${Date.now()}_${Math.random().toString(36).substr(2, 4)}.sql`);
  try {
    fs.writeFileSync(tempFile, sql, 'utf8');
    const raw = execSync(`sqlite3 -json "${dbPath}" < "${tempFile}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    if (err.stdout) {
      try {
        const parsed = JSON.parse(err.stdout.toString().trim());
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
  }
}

/**
 * Executes a multi-statement SQL script or DDL/DML batch inside an ACID transaction.
 *
 * @param {string} dbPath - Path to the SQLite database file
 * @param {string} sqlStatements - SQL statements string to execute
 * @returns {{ success: boolean, error?: string }}
 */
function runSqlBatch(dbPath, sqlStatements) {
  if (!fs.existsSync(dbPath)) {
    return { success: false, error: 'Database file missing' };
  }

  if (BetterSqlite3) {
    let db = null;
    try {
      db = new BetterSqlite3(dbPath, { fileMustExist: true });
      db.pragma('foreign_keys = ON');

      const hasExplicitTx = /\bBEGIN(\s+TRANSACTION)?\b/i.test(sqlStatements);
      if (hasExplicitTx) {
        db.exec(sqlStatements);
      } else {
        db.exec(`BEGIN TRANSACTION;\n${sqlStatements}\nCOMMIT;`);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      if (db && db.open) {
        try { db.close(); } catch {}
      }
    }
  }

  // CLI Fallback (sqlite3 < script.sql)
  const tempDir = path.dirname(dbPath);
  const tempFile = path.join(tempDir, `batch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}.sql`);
  const hasExplicitTx = /\bBEGIN(\s+TRANSACTION)?\b/i.test(sqlStatements);
  const fullSql = hasExplicitTx
    ? `PRAGMA foreign_keys = ON;\n${sqlStatements}`
    : `PRAGMA foreign_keys = ON;\nBEGIN TRANSACTION;\n${sqlStatements}\nCOMMIT;\n`;

  try {
    fs.writeFileSync(tempFile, fullSql, 'utf8');
    execSync(`sqlite3 "${dbPath}" < "${tempFile}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true };
  } catch (err) {
    const errorMsg = err.stderr ? err.stderr.toString().trim() : err.message;
    return { success: false, error: errorMsg };
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
  }
}

module.exports = {
  runSqlJson,
  runSqlBatch,
  escapeSql
};
