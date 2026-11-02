/**
 * Workforce hire quote: the server exposes the signing price/standing gates
 * before hire, the confirmed price matches the quote, and a refusal returns the
 * retry date used by the hire modal.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-workforce-quote-'));
const TEST_DB = path.join(TMP, 'session.db');

function seed(): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', "current_date" = '185-06-01', active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run();
  db.prepare(`
    UPDATE player_state SET liquid_cash = 5000, safe_cash = 0, fatigue = 0, fame = 794, virtue = 50
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare("DELETE FROM npc_state WHERE npc_id IN ('NPC-0011');").run();
  db.prepare("UPDATE master_characters SET baseline_sentiment_player = 0 WHERE npc_id = 'NPC-0001';").run();
  db.prepare("DELETE FROM npc_relationship_deltas WHERE npc_id = 'NPC-0001';").run();
  db.prepare("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-HIRE%';").run();
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
  console.log('=== Workforce hire quote ===');
  seed();
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const router = createGrandStrategyRouter();

  const quoteRes = await request(router, 'GET', '/api/workforce/quote?candidateName=Cung%20C%E1%BA%A3nh');
  assert.strictEqual(quoteRes.status, 200, JSON.stringify(quoteRes.data));
  const quote = quoteRes.data.quote;
  assert.strictEqual(quote.canHire, true);
  assert.strictEqual(quote.candidateName, 'Cung Cảnh');
  assert(quote.signingBonus > 0);
  assert.strictEqual(quote.fame, 794);
  assert.strictEqual(quote.virtue, 50);

  const hireRes = await request(router, 'POST', '/api/workforce/hire', {
    candidateName: 'Cung Cảnh',
    signingBonus: 1,
    characterId: 'PLY-0001',
    idempotencyKey: 'TEST-HIRE-CUNG-CANH'
  });
  assert.strictEqual(hireRes.status, 200, JSON.stringify(hireRes.data));
  assert.strictEqual(hireRes.data.signingBonusPaid, quote.signingBonus, 'paid price must match the quote');
  assert.strictEqual(hireRes.data.businessId || hireRes.data.assignedBusinessId, quote.businessId);

  const refusedRes = await request(router, 'GET', '/api/workforce/quote?candidateName=L%C6%B0u%20B%E1%BB%8B');
  assert.strictEqual(refusedRes.status, 200, JSON.stringify(refusedRes.data));
  const refused = refusedRes.data.quote;
  assert.strictEqual(refused.canHire, false);
  assert(refused.retryAfterDate, 'refusal must expose a retry date');
  assert(/từ chối|danh vọng/i.test(refused.refusalReasonVi));

  const refuseHire = await request(router, 'POST', '/api/workforce/hire', {
    candidateName: 'Lưu Bị',
    characterId: 'PLY-0001',
    idempotencyKey: 'TEST-HIRE-LUU-BI'
  });
  assert.strictEqual(refuseHire.status, 400);
  assert.strictEqual(refuseHire.data.code, 'NPC_REFUSED');
  assert(refuseHire.data.retryAfterDate, 'hire refusal must return a retry date');
  assert(refuseHire.data.retryAfterDate >= refused.retryAfterDate, 'retry date must not move earlier after the time charge');

  const modal = fs.readFileSync(path.join(ROOT, 'src/client/features/workforce/workforce-hire.modal.ts'), 'utf8');
  const service = fs.readFileSync(path.join(ROOT, 'src/client/features/workforce/workforce-hire.service.ts'), 'utf8');
  const worldMap = fs.readFileSync(path.join(ROOT, 'public/js/world-map.js'), 'utf8');
  assert(modal.includes('data-hire-confirm'), 'hire modal must render a confirm action');
  assert(modal.includes('retryAfterDate'), 'hire modal must show the refusal retry date');
  assert(service.includes('/api/workforce/quote'), 'client must read the server quote');
  assert(worldMap.includes('WorkforceHireUI'), 'legacy recruit button must open the TS modal');
  assert(!worldMap.includes('signingBonus: 250'), 'legacy hardcoded price must be gone');

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: quote price, standing gates, refusal retry date and single UI renderer.');
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
