/**
 * Duel mutations follow the core contracts: initiating a duel spends one day,
 * a submitted round resolves exactly once, and replaying either with the same
 * idempotency key returns the stored state without another round or day.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-duel-contracts-'));
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
        "current_date" = '185-06-01', active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state
    SET liquid_cash = 100000, safe_cash = 0, fatigue = 0, health = 100,
        current_location = 'Diễn Võ Đài'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-IDEM-DUEL%';").run();
  db.close();
}

function request(router: any, method: string, url: string, body: any = null): Promise<{ status: number; data: any }> {
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
  console.log('=== Duel contracts ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();

  // 1. Initiate: one day, one duel; replay returns the same duel.
  const initiatePayload = {
    opponentId: 'NPC-0002',
    context: 'FRIENDLY_SPARRING',
    idempotencyKey: 'TEST-IDEM-DUEL-INIT'
  };
  const i1 = await request(router, 'POST', '/api/duel/initiate', initiatePayload);
  assert.strictEqual(i1.status, 200, JSON.stringify(i1.data));
  assert.strictEqual(i1.data.idempotent, false);
  assert.strictEqual(i1.data.time.advancedDays, 1);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-02');
  const duelId = i1.data.duel.duelId;
  assert(duelId, 'duel id must be returned');

  const i2 = await request(router, 'POST', '/api/duel/initiate', initiatePayload);
  assert.strictEqual(i2.status, 200);
  assert.strictEqual(i2.data.idempotent, true);
  assert.strictEqual(i2.data.duel.duelId, duelId);
  assert.strictEqual(getClock(TEST_DB).currentDate, '185-06-02', 'replay must not spend another day');

  // 2. Round: resolves once; replay returns the same round and duel state.
  const roundPayload = {
    duelId,
    command: 'ATTACK',
    forcedOpponentCommand: 'DEFEND',
    idempotencyKey: 'TEST-IDEM-DUEL-ROUND'
  };
  const r1 = await request(router, 'POST', '/api/duel/round', roundPayload);
  assert.strictEqual(r1.status, 200, JSON.stringify(r1.data));
  assert.strictEqual(r1.data.idempotent, false);
  const roundNumber = r1.data.round.roundNumber;
  const currentRound = r1.data.duel.currentRound;

  const r2 = await request(router, 'POST', '/api/duel/round', roundPayload);
  assert.strictEqual(r2.status, 200);
  assert.strictEqual(r2.data.idempotent, true);
  assert.strictEqual(r2.data.round.roundNumber, roundNumber, 'replay must not resolve another round');
  assert.strictEqual(r2.data.duel.currentRound, currentRound, 'duel state must be unchanged');

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: duel initiation and round resolution replay cleanly.');
}

function cleanup(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../src/core/database').DatabaseService.resetInstance();
  } catch { /* already closed */ }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

try {
  run().then(() => cleanup()).catch(error => {
    console.error(error);
    cleanup();
    process.exit(1);
  });
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
