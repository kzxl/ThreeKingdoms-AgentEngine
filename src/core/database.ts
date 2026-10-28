/**
 * ThreeKingdoms-AgentEngine: Core Database Service
 * Provides a robust, ACID-compliant SQLite service wrapping better-sqlite3.
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private db: Database.Database;
  private readonly dbPath: string;

  private constructor(customDbPath?: string) {
    this.dbPath =
      customDbPath ||
      process.env.SIM_DB_PATH ||
      path.resolve(process.cwd(), 'saves', 'session.db');

    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
  }

  /**
   * Retrieves or initializes the singleton DatabaseService instance.
   * If a custom path is provided that differs from current connection, the connection is reopened.
   */
  public static getInstance(customDbPath?: string): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(customDbPath);
    } else if (customDbPath && path.resolve(customDbPath) !== path.resolve(DatabaseService.instance.dbPath)) {
      DatabaseService.instance.close();
      DatabaseService.instance = new DatabaseService(customDbPath);
    }
    return DatabaseService.instance;
  }

  /**
   * Returns the underlying better-sqlite3 database instance.
   */
  public getDb(): Database.Database {
    return this.db;
  }

  /**
   * Returns the absolute path of the active SQLite database file.
   */
  public getDbPath(): string {
    return this.dbPath;
  }

  /**
   * Executes a SELECT query returning an array of matched rows.
   */
  public query<T = any>(sql: string, params?: any[]): T[] {
    const stmt = this.db.prepare(sql);
    return (params && params.length > 0 ? stmt.all(...params) : stmt.all()) as T[];
  }

  /**
   * Executes a SELECT query returning the first matching row or undefined.
   */
  public queryOne<T = any>(sql: string, params?: any[]): T | undefined {
    const stmt = this.db.prepare(sql);
    return (params && params.length > 0 ? stmt.get(...params) : stmt.get()) as T | undefined;
  }

  /**
   * Executes an INSERT, UPDATE, or DELETE query and returns the execution result.
   */
  public execute(sql: string, params?: any[]): Database.RunResult {
    const stmt = this.db.prepare(sql);
    return params && params.length > 0 ? stmt.run(...params) : stmt.run();
  }

  /**
   * Executes a multi-statement SQL script string directly.
   */
  public exec(sql: string): void {
    this.db.exec(sql);
  }

  /**
   * Wraps the given callback within an ACID database transaction.
   * If an exception occurs, the transaction is automatically rolled back.
   */
  public transaction<T>(fn: () => T): T {
    const tx = this.db.transaction(fn);
    return tx();
  }

  /**
   * Closes the SQLite connection cleanly.
   */
  public close(): void {
    if (this.db && this.db.open) {
      this.db.close();
    }
  }

  /**
   * Resets the singleton instance (mainly for testing or isolation).
   */
  public static resetInstance(): void {
    if (DatabaseService.instance) {
      DatabaseService.instance.close();
      DatabaseService.instance = null;
    }
  }
}
