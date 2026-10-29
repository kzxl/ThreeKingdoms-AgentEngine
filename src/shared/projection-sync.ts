/**
 * ThreeKingdoms-AgentEngine: Projection Synchronization
 * (src/shared/projection-sync.ts)
 *
 * `game/PROGRESS.md` is a read projection of the session database. Every write
 * path that changes cash, inventory or net worth must refresh it, otherwise the
 * auditor reports projection drift.
 *
 * This is the single in-process entry point. It replaces six copies of
 * `execSync('node tools/sim-db.js export-progress')`, which spawned a process
 * and re-opened the database on every write.
 */

import path from 'path';
import { DatabaseService } from '../core/database';

const PROJECTION_PATH = path.resolve(__dirname, '../../game/PROGRESS.md');
const PROJECTOR_PATH = path.resolve(__dirname, '../../engine/projector');

/**
 * Re-renders game/PROGRESS.md from the given database.
 * Never throws: projection failure must not roll back a committed transaction.
 */
export function syncProgressProjection(db: DatabaseService): void {
  try {
    const { renderProgressMarkdown } = require(PROJECTOR_PATH);
    renderProgressMarkdown(db.getDbPath(), PROJECTION_PATH);
  } catch (err: any) {
    console.warn('[Projection] sync warning:', err.message);
  }
}
