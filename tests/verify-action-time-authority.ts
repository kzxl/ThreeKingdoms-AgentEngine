/**
 * Server-side action time authority.
 *
 * Every player-facing mutation charges its calendar days at the HTTP boundary.
 * A client can no longer skip days by not calling `/api/time/spend`, and a
 * rejected action (fatigue, ended campaign) leaves the clock untouched.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-action-time-'));
const TEST_DB = path.join(TMP, 'session.db');
const { getClock } = require('../engine/time-manager');

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }

  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', defeat_reason = NULL, distress_months = 0,
        "current_date" = '184-05-02', active_turn = 2
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state
    SET fatigue = 20, health = 100, morale = 100, strategic_grain = 50,
        current_location = 'Lôi Đài Giáo Trường'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.close();
}

type MockResult = { status: number; data: any };

function request(router: any, method: string, url: string, body: any = null): Promise<MockResult> {
  return new Promise(resolve => {
    let sentStatus = 200;
    const req: any = {
      method,
      url,
      headers: { host: 'localhost:3300' },
      on: (event: string, callback: any) => {
        if (event === 'data' && body) callback(Buffer.from(JSON.stringify(body)));
        if (event === 'end') callback();
      }
    };
    const res: any = {
      writeHead: (status: number) => { sentStatus = status; },
      end: (data: string) => {
        let payload: any = data;
        try { payload = JSON.parse(data); } catch { /* keep raw */ }
        resolve({ status: sentStatus, data: payload });
      }
    };
    router.handle(req, res);
  });
}

async function run(): Promise<void> {
  console.log('=== Action time authority ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // Require after the env switch so DatabaseService resolves the temp campaign.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance?.();
  const router = createGrandStrategyRouter();

  const start = getClock(TEST_DB);
  assert.strictEqual(start.currentDate, '184-05-02');

  // 1. A duel costs five days on the server, once.
  const duel = await request(router, 'POST', '/api/duel/spar', {
    heroNpcId: 'NPC-0002',
    bypassSpatialGuard: true
  });
  assert.strictEqual(duel.status, 200, `duel must succeed: ${JSON.stringify(duel.data)}`);
  assert(duel.data.time, 'response must expose the time charge');
  const afterDuel = getClock(TEST_DB);
  assert.strictEqual(afterDuel.currentDate, '184-05-07', 'a spar must consume five calendar days');
  assert.strictEqual(duel.data.time.advancedDays, 5);

  // 2. The same endpoint rejects a fatigued player before spending any day.
  const raw = new Database(TEST_DB);
  raw.prepare("UPDATE player_state SET fatigue = 100 WHERE player_id = 'PLY-0001';").run();
  raw.close();
  const blocked = await request(router, 'POST', '/api/duel/spar', {
    heroNpcId: 'NPC-0002',
    bypassSpatialGuard: true
  });
  assert.strictEqual(blocked.status, 400, 'fatigued duel must be rejected');
  assert.strictEqual(blocked.data.code, 'FATIGUE');
  assert.strictEqual(getClock(TEST_DB).currentDate, '184-05-07', 'a rejected action must not advance time');

  // 3. Social interaction also charges time without the client calling /api/time/spend.
  const raw2 = new Database(TEST_DB);
  raw2.prepare("UPDATE player_state SET fatigue = 20 WHERE player_id = 'PLY-0001';").run();
  raw2.close();
  const social = await request(router, 'POST', '/api/kizuna/interact', {
    npcId: 'NPC-0002',
    actionType: 'TEA_CONVERSE'
  });
  assert.strictEqual(social.status, 200, `kizuna must succeed: ${JSON.stringify(social.data)}`);
  assert(social.data.time, 'social response must expose the time charge');
  assert.strictEqual(getClock(TEST_DB).currentDate, '184-05-09', 'a social interaction must consume two days');

  // 4. Charging is one-way: the clock never moves backwards and no second charge exists.
  const second = await request(router, 'POST', '/api/kizuna/interact', {
    npcId: 'NPC-0002',
    actionType: 'TEA_CONVERSE'
  });
  assert.strictEqual(second.status, 200);
  assert.strictEqual(getClock(TEST_DB).currentDate, '184-05-11');

  console.log('  ✅ PASSED: duel/social mutations charge days server-side; rejected actions cost nothing.\n');
}

function cleanup(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../src/core/database').DatabaseService.resetInstance();
  } catch { /* already closed */ }
  // The duel/social services refresh game/PROGRESS.md from whichever DB is
  // canonical. A direct run (outside tools/test-runner.js) would leave the live
  // projection rendered from this temp campaign, so restore it from the live DB.
  try {
    const liveDb = path.join(ROOT, 'saves', 'session.db');
    if (fs.existsSync(liveDb)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { renderProgressMarkdown } = require('../engine/projector');
      renderProgressMarkdown(liveDb, path.join(ROOT, 'game', 'PROGRESS.md'));
    }
  } catch { /* projection is a disposable read model */ }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly; the temp dir is disposable */ }
}

try {
  run().then(() => {
    cleanup();
  }).catch(error => {
    console.error(error);
    cleanup();
    process.exit(1);
  });
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
