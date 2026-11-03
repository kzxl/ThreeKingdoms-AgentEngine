/**
 * ThreeKingdoms-AgentEngine: Session Lock Registry
 * (src/core/session-registry.ts)
 *
 * One shared SQLite file (`saves/registry.db`) holds the exclusive lease for
 * every playable session. Campaign data stays in its own database file; this
 * registry only answers "who is allowed to write session X right now?".
 *
 * The lease is time based: a client heartbeats every 20s and the row expires
 * after 60s, so a closed tab or a crashed worker never strands a campaign.
 * Writes use BEGIN IMMEDIATE so two server processes cannot acquire the same
 * session concurrently.
 */

import path from 'path';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';

export interface SessionLock {
  sessionId: string;
  ownerId: string;
  token: string;
  acquiredAt: number;
  expiresAt: number;
  lastSeenAt: number;
  version: number;
  expired: boolean;
}

export type AcquireResult =
  | { ok: true; lock: SessionLock }
  | { ok: false; code: 'SESSION_LOCKED' | 'INVALID_SESSION'; holder?: SessionLock; message: string };

export type HeartbeatResult =
  | { ok: true; lock: SessionLock }
  | { ok: false; code: 'LOCK_LOST' | 'INVALID_SESSION'; message: string };

export interface SessionRegistryOptions {
  dbPath?: string;
  ttlMs?: number;
}

interface LockRow {
  session_id: string;
  owner_id: string;
  token: string;
  acquired_at: number;
  expires_at: number;
  last_seen_at: number;
  version: number;
}

const DEFAULT_TTL_MS = 60_000;

function normalizeSessionId(sessionId: unknown): string {
  return String(sessionId || '').trim();
}

function toLock(row: LockRow, now = Date.now()): SessionLock {
  return {
    sessionId: row.session_id,
    ownerId: row.owner_id,
    token: row.token,
    acquiredAt: Number(row.acquired_at),
    expiresAt: Number(row.expires_at),
    lastSeenAt: Number(row.last_seen_at),
    version: Number(row.version || 1),
    expired: Number(row.expires_at) <= now
  };
}

export class SessionRegistry {
  private static readonly instances = new Map<string, SessionRegistry>();

  private readonly dbPath: string;
  private readonly defaultTtlMs: number;
  private readonly db: Database.Database;

  private constructor(resolvedPath: string, ttlMs: number) {
    this.dbPath = resolvedPath;
    this.defaultTtlMs = ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS;
    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('foreign_keys = ON');
    this.ensureSchema();
  }

  public static getInstance(dbPath?: string, ttlMs = DEFAULT_TTL_MS): SessionRegistry {
    const resolved = path.resolve(
      dbPath || process.env.SIM_SESSION_REGISTRY || path.join(process.cwd(), 'saves', 'registry.db')
    );
    const existing = SessionRegistry.instances.get(resolved);
    if (existing) return existing;
    const registry = new SessionRegistry(resolved, ttlMs);
    SessionRegistry.instances.set(resolved, registry);
    return registry;
  }

  public static resetInstance(dbPath?: string): void {
    if (!dbPath) {
      for (const registry of SessionRegistry.instances.values()) registry.close();
      SessionRegistry.instances.clear();
      return;
    }
    const resolved = path.resolve(dbPath);
    const registry = SessionRegistry.instances.get(resolved);
    if (!registry) return;
    registry.close();
    SessionRegistry.instances.delete(resolved);
  }

  public get path(): string {
    return this.dbPath;
  }

  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_locks (
        session_id   TEXT PRIMARY KEY,
        owner_id     TEXT NOT NULL,
        token        TEXT NOT NULL,
        acquired_at  INTEGER NOT NULL,
        expires_at   INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        version      INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_session_locks_expires
        ON session_locks(expires_at);
    `);
    const columns = this.db.prepare('PRAGMA table_info(session_locks);').all() as Array<{ name: string }>;
    if (!columns.some(column => column.name === 'version')) {
      this.db.exec('ALTER TABLE session_locks ADD COLUMN version INTEGER NOT NULL DEFAULT 1;');
    }
  }

  private read(sessionId: string): LockRow | undefined {
    return this.db.prepare('SELECT * FROM session_locks WHERE session_id = ?;').get(sessionId) as LockRow | undefined;
  }

  private upsert(sessionId: string, ownerId: string, token: string, now: number, expiresAt: number): void {
    this.db.prepare(`
      INSERT INTO session_locks (session_id, owner_id, token, acquired_at, expires_at, last_seen_at, version)
      VALUES (?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(session_id) DO UPDATE SET
        owner_id = excluded.owner_id,
        token = excluded.token,
        acquired_at = excluded.acquired_at,
        expires_at = excluded.expires_at,
        last_seen_at = excluded.last_seen_at;
    `).run(sessionId, ownerId, token, now, expiresAt, now);
  }

  /**
   * Acquires or refreshes a session lease. A different owner gets the current
   * holder back so the UI can say who is playing instead of failing vaguely.
   * `force` is the explicit take-over path (no auth yet).
   */
  public acquire(
    sessionIdInput: string,
    ownerId: string,
    ttlMs = this.defaultTtlMs,
    force = false
  ): AcquireResult {
    const sessionId = normalizeSessionId(sessionIdInput);
    const owner = String(ownerId || '').trim();
    if (!sessionId || !owner) {
      return { ok: false, code: 'INVALID_SESSION', message: 'Thiếu mã phiên hoặc mã máy khách.' };
    }

    const run = this.db.transaction((): AcquireResult => {
      const now = Date.now();
      const current = this.read(sessionId);
      if (current && Number(current.expires_at) > now && current.owner_id !== owner && !force) {
        return {
          ok: false,
          code: 'SESSION_LOCKED',
          holder: toLock(current, now),
          message: `Phiên đang được chơi bởi một máy khác. Thử lại sau ${Math.max(1, Math.ceil((Number(current.expires_at) - now) / 1000))} giây.`
        };
      }
      const token = `${owner}:${now.toString(36)}:${randomUUID()}`;
      const expiresAt = now + Math.max(1_000, ttlMs);
      this.upsert(sessionId, owner, token, now, expiresAt);
      return { ok: true, lock: toLock(this.read(sessionId)!, now) };
    }).immediate;

    return run();
  }

  /** Increments the campaign version only while this exact lease is valid. */
  public bumpVersion(sessionIdInput: string, tokenInput: string): number | null {
    const sessionId = normalizeSessionId(sessionIdInput);
    const token = String(tokenInput || '').trim();
    if (!sessionId || !token) return null;
    const now = Date.now();
    const result = this.db.prepare(`
      UPDATE session_locks
         SET version = version + 1, last_seen_at = ?
       WHERE session_id = ? AND token = ? AND expires_at > ?;
    `).run(now, sessionId, token, now);
    if (result.changes === 0) return null;
    return Number((this.read(sessionId) || { version: 1 }).version || 1);
  }

  public heartbeat(sessionIdInput: string, tokenInput: string, ttlMs = this.defaultTtlMs): HeartbeatResult {
    const sessionId = normalizeSessionId(sessionIdInput);
    const token = String(tokenInput || '').trim();
    if (!sessionId || !token) {
      return { ok: false, code: 'INVALID_SESSION', message: 'Thiếu mã phiên hoặc mã khóa.' };
    }

    const now = Date.now();
    const expiresAt = now + Math.max(1_000, ttlMs);
    const result = this.db.prepare(`
      UPDATE session_locks
         SET expires_at = ?, last_seen_at = ?
       WHERE session_id = ? AND token = ?;
    `).run(expiresAt, now, sessionId, token);

    if (result.changes === 0) {
      return { ok: false, code: 'LOCK_LOST', message: 'Khóa phiên đã hết hạn hoặc thuộc về máy khác.' };
    }
    return { ok: true, lock: toLock(this.read(sessionId)!, now) };
  }

  public release(sessionIdInput: string, tokenInput: string): boolean {
    const sessionId = normalizeSessionId(sessionIdInput);
    const token = String(tokenInput || '').trim();
    if (!sessionId || !token) return false;
    const result = this.db.prepare('DELETE FROM session_locks WHERE session_id = ? AND token = ?;').run(sessionId, token);
    return result.changes > 0;
  }

  /** Administrative release used when a campaign is deleted. */
  public forceRelease(sessionIdInput: string): boolean {
    const sessionId = normalizeSessionId(sessionIdInput);
    if (!sessionId) return false;
    return this.db.prepare('DELETE FROM session_locks WHERE session_id = ?;').run(sessionId).changes > 0;
  }

  public status(sessionIdInput: string): SessionLock | null {
    const sessionId = normalizeSessionId(sessionIdInput);
    if (!sessionId) return null;
    const row = this.read(sessionId);
    return row ? toLock(row) : null;
  }

  public list(): SessionLock[] {
    const now = Date.now();
    const rows = this.db.prepare('SELECT * FROM session_locks ORDER BY session_id;').all() as LockRow[];
    return rows.map(row => toLock(row, now));
  }

  public purgeExpired(now = Date.now()): number {
    return this.db.prepare('DELETE FROM session_locks WHERE expires_at <= ?;').run(now).changes;
  }

  public close(): void {
    if (this.db.open) this.db.close();
  }
}
