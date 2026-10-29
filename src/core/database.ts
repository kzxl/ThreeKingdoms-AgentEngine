/**
 * ThreeKingdoms-AgentEngine: Core Database Service
 * Provides a robust, ACID-compliant SQLite service wrapping better-sqlite3.
 * Adheres to AgentOption Universe Architecture v4.0.
 *
 * One connection per database path is kept alive in a process-level registry.
 * This replaces the previous singleton, which closed and reopened the connection
 * whenever a different playthrough instance was addressed, and it lets several
 * campaigns stay open at once (needed by the HTTP layer's per-request instance
 * switching and by concurrent verification suites).
 */

import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

export class DatabaseQueryError extends Error {
  public readonly dbPath: string;
  public readonly sql: string;

  constructor(message: string, dbPath: string, sql: string, cause?: unknown) {
    super(`${message} [db=${path.basename(dbPath)}]: ${sql.replace(/\s+/g, ' ').trim().slice(0, 180)}`);
    this.name = 'DatabaseQueryError';
    this.dbPath = dbPath;
    this.sql = sql;
    (this as any).cause = cause;
  }
}

export class DatabaseService {
  private static readonly instances = new Map<string, DatabaseService>();

  private readonly dbPath: string;
  private db: Database.Database;

  private constructor(resolvedPath: string) {
    this.dbPath = resolvedPath;

    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
  }

  /**
   * Returns the service bound to the given database path, opening it on first use.
   * With no argument it resolves SIM_DB_PATH, then cwd/saves/session.db.
   */
  public static getInstance(customDbPath?: string): DatabaseService {
    const resolved = path.resolve(
      customDbPath || process.env.SIM_DB_PATH || path.join(process.cwd(), 'saves', 'session.db')
    );

    const existing = DatabaseService.instances.get(resolved);
    if (existing) return existing;

    const service = new DatabaseService(resolved);
    DatabaseService.instances.set(resolved, service);
    return service;
  }

  /** Alias that makes per-request instance switching explicit at call sites. */
  public static getForPath(dbPath: string): DatabaseService {
    return DatabaseService.getInstance(dbPath);
  }

  /** Absolute path of the SQLite file this service is bound to. */
  public get path(): string {
    return this.dbPath;
  }

  /** Absolute paths of every database currently open in this process. */
  public static getOpenPaths(): string[] {
    return [...DatabaseService.instances.keys()];
  }

  public static closePath(dbPath: string): void {
    const resolved = path.resolve(dbPath);
    const service = DatabaseService.instances.get(resolved);
    if (!service) return;
    service.close();
    DatabaseService.instances.delete(resolved);
  }

  public static closeAll(): void {
    for (const service of DatabaseService.instances.values()) service.close();
    DatabaseService.instances.clear();
  }

  /** Backwards-compatible reset used by tests: closes one path, or all when omitted. */
  public static resetInstance(customDbPath?: string): void {
    if (customDbPath) DatabaseService.closePath(customDbPath);
    else DatabaseService.closeAll();
  }

  public getDb(): Database.Database {
    return this.db;
  }

  public getDbPath(): string {
    return this.dbPath;
  }

  private prepare(sql: string): Database.Statement {
    try {
      return this.db.prepare(sql);
    } catch (err) {
      throw new DatabaseQueryError('Failed to prepare statement', this.dbPath, sql, err);
    }
  }

  /** Executes a SELECT returning all matched rows. */
  public query<T = any>(sql: string, params?: any[]): T[] {
    try {
      const stmt = this.prepare(sql);
      return (params && params.length > 0 ? stmt.all(...params) : stmt.all()) as T[];
    } catch (err) {
      if (err instanceof DatabaseQueryError) throw err;
      throw new DatabaseQueryError('Query failed', this.dbPath, sql, err);
    }
  }

  /** Executes a SELECT returning the first matched row, or undefined. */
  public queryOne<T = any>(sql: string, params?: any[]): T | undefined {
    try {
      const stmt = this.prepare(sql);
      return (params && params.length > 0 ? stmt.get(...params) : stmt.get()) as T | undefined;
    } catch (err) {
      if (err instanceof DatabaseQueryError) throw err;
      throw new DatabaseQueryError('Query failed', this.dbPath, sql, err);
    }
  }

  /** Executes an INSERT/UPDATE/DELETE and returns the driver result. */
  public execute(sql: string, params?: any[]): Database.RunResult {
    try {
      const stmt = this.prepare(sql);
      return params && params.length > 0 ? stmt.run(...params) : stmt.run();
    } catch (err) {
      if (err instanceof DatabaseQueryError) throw err;
      throw new DatabaseQueryError('Statement failed', this.dbPath, sql, err);
    }
  }

  /** Executes a multi-statement SQL script. */
  public exec(sql: string): void {
    try {
      this.db.exec(sql);
    } catch (err) {
      throw new DatabaseQueryError('Script failed', this.dbPath, sql, err);
    }
  }

  /** Runs the callback inside an ACID transaction; exceptions roll back. */
  public transaction<T>(fn: () => T): T {
    const tx = this.db.transaction(fn);
    return tx();
  }

  public close(): void {
    if (this.db && this.db.open) {
      this.db.close();
    }
  }
}
