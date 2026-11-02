/**
 * Enterprise wage work: the modal must use the canonical SHIFT_* ids, the
 * server pays the canonical wage, replay is inert, and the old WOODCUT-style
 * ids are rejected.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-enterprise-work-'));
const TEST_DB = path.join(TMP, 'session.db');

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
  console.log('=== Enterprise wage work ===');
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  process.env.SIM_DB_PATH = TEST_DB;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGrandStrategyRouter } = require('../src/server/main');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseService } = require('../src/core/database');
  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  db.execute(`
    UPDATE campaign_meta SET status = 'ACTIVE', "current_date" = '185-06-01'
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `);
  db.execute(`
    UPDATE player_state SET liquid_cash = 1000, safe_cash = 3000, fatigue = 0
    WHERE player_id = 'PLY-0001';
  `);
  db.execute("DELETE FROM action_log WHERE idempotency_key LIKE 'TEST-ENT-WORK%';");
  const router = createGrandStrategyRouter();

  const status = await request(router, 'GET', '/api/enterprise/status?characterId=PLY-0001');
  assert.strictEqual(status.status, 200, JSON.stringify(status.data));
  const shifts = status.data.status?.laborShifts || [];
  assert(shifts.length >= 4, 'canonical labor shifts must be exposed to the modal');
  const weaver = shifts.find((shift: any) => shift.shiftId === 'SHIFT_WEAVER');
  assert(weaver, 'SHIFT_WEAVER must exist');
  assert.strictEqual(weaver.wage, 95);

  const statusData = status.data.status;
  assert(statusData.openableTypes.length >= 4, 'owner tab must receive the opening catalog');
  assert(statusData.ownedBusinesses.length >= 1, 'owner tab must list owned businesses');
  const firstBusiness = statusData.ownedBusinesses[0];
  assert(firstBusiness.manager_name, 'business must expose the manager name');
  assert(typeof firstBusiness.staff_count === 'number', 'business must expose assigned staff');
  assert(typeof firstBusiness.monthly_overhead === 'number', 'business must expose rent + wages');
  assert(firstBusiness.health, 'business must expose a health label');

  const work = await request(router, 'POST', '/api/enterprise/work', {
    characterId: 'PLY-0001',
    shiftId: 'SHIFT_WEAVER',
    idempotencyKey: 'TEST-ENT-WORK-WEAVER'
  });
  assert.strictEqual(work.status, 200, JSON.stringify(work.data));
  assert.strictEqual(work.data.wagePaid, 95);
  assert.strictEqual(work.data.newFatigue, 12);
  assert.strictEqual(Number(work.data.newLiquidCash), 1095);
  assert.strictEqual(Number(work.data.newBalance), 4095, 'ledger balance must include personal safe cash');
  const wageLedger = db.queryOne("SELECT balance FROM cashflow_ledger WHERE category = 'LABOR_WAGE' ORDER BY rowid DESC LIMIT 1;");
  assert.strictEqual(Number(wageLedger.balance), 4095, 'LABOR_WAGE ledger must record liquid + safe');

  const replay = await request(router, 'POST', '/api/enterprise/work', {
    characterId: 'PLY-0001',
    shiftId: 'SHIFT_WEAVER',
    idempotencyKey: 'TEST-ENT-WORK-WEAVER'
  });
  assert.strictEqual(replay.status, 200);
  assert.strictEqual(replay.data.idempotent, true);
  assert.strictEqual(Number(replay.data.newLiquidCash), 1095, 'replay must not pay twice');

  const safeBefore = Number(db.queryOne(
    "SELECT safe_cash FROM businesses WHERE business_id = 'BIZ-0001';"
  )?.safe_cash || 0);
  const deposit = await request(router, 'POST', '/api/enterprise/manage-safe-cash', {
    characterId: 'PLY-0001',
    businessId: 'BIZ-0001',
    action: 'DEPOSIT',
    amount: 100,
    idempotencyKey: 'TEST-SAFE-DEPOSIT'
  });
  assert.strictEqual(deposit.status, 200, JSON.stringify(deposit.data));
  assert.strictEqual(deposit.data.businessSafeCash, safeBefore + 100);
  assert.strictEqual(Number(deposit.data.ownerNewCash), 995);
  assert.strictEqual(Number(db.queryOne(
    "SELECT safe_cash FROM businesses WHERE business_id = 'BIZ-0001';"
  )?.safe_cash), safeBefore + 100);

  const depositReplay = await request(router, 'POST', '/api/enterprise/manage-safe-cash', {
    characterId: 'PLY-0001',
    businessId: 'BIZ-0001',
    action: 'DEPOSIT',
    amount: 100,
    idempotencyKey: 'TEST-SAFE-DEPOSIT'
  });
  assert.strictEqual(depositReplay.data.idempotent, true);
  assert.strictEqual(Number(depositReplay.data.ownerNewCash), 995, 'safe-cash replay must not move twice');

  const withdraw = await request(router, 'POST', '/api/enterprise/manage-safe-cash', {
    characterId: 'PLY-0001',
    businessId: 'BIZ-0001',
    action: 'WITHDRAW',
    amount: 50,
    idempotencyKey: 'TEST-SAFE-WITHDRAW'
  });
  assert.strictEqual(withdraw.status, 200, JSON.stringify(withdraw.data));
  assert.strictEqual(withdraw.data.businessSafeCash, safeBefore + 50);
  assert.strictEqual(Number(withdraw.data.ownerNewCash), 1045);

  const oversized = await request(router, 'POST', '/api/enterprise/manage-safe-cash', {
    characterId: 'PLY-0001',
    businessId: 'BIZ-0001',
    action: 'WITHDRAW',
    amount: 999999,
    idempotencyKey: 'TEST-SAFE-OVERSIZED'
  });
  assert.strictEqual(oversized.status, 400);
  assert(db.queryOne("SELECT 1 AS ok FROM cashflow_ledger WHERE category = 'ENTERPRISE_SAFE_DEPOSIT';"));
  assert(db.queryOne("SELECT 1 AS ok FROM cashflow_ledger WHERE category = 'ENTERPRISE_SAFE_WITHDRAW';"));
  const journal = db.queryOne(
    "SELECT COALESCE(SUM(debit), 0) AS deb, COALESCE(SUM(credit), 0) AS cred FROM account_journal WHERE txn_id LIKE 'TXN-SAFE-%';"
  );
  assert.strictEqual(Number(journal.deb), Number(journal.cred), 'safe-cash journal must balance');

  const legacyId = await request(router, 'POST', '/api/enterprise/work', {
    characterId: 'PLY-0001',
    shiftId: 'WOODCUT',
    idempotencyKey: 'TEST-ENT-WORK-LEGACY'
  });
  assert.strictEqual(legacyId.status, 400, 'the old UI id must not silently work');
  assert(/không tồn tại/i.test(legacyId.data.error));

  const modal = fs.readFileSync(path.join(ROOT, 'src/client/features/enterprise-workshop/enterprise-workshop.modal.ts'), 'utf8');
  assert(modal.includes('laborShifts'), 'modal must render the canonical shift list');
  assert(modal.includes('data-work-shift'), 'modal must bind canonical shift ids');
  assert(modal.includes('executeWork(shiftId)'), 'modal must call executeWork with the selected shift');
  assert(modal.includes('openableTypes'), 'owner tab must render the opening catalog');
  assert(modal.includes('enterprise-summary-grid'), 'owner tab must render portfolio summary cards');
  assert(modal.includes('enterprise-open-card'), 'owner tab must render openable business cards');
  assert(modal.includes('work-card'), 'work tab must render canonical shift cards');
  assert(modal.includes('collectProfits'), 'owner tab must expose profit collection');
  assert(!modal.includes('prompt('), 'cash actions must use inline inputs instead of prompt()');
  assert(!modal.includes("executeWork('WOODCUT')"), 'legacy WOODCUT must be removed');
  assert(!modal.includes("executeWork('WEAVE_MAT')"), 'legacy WEAVE_MAT must be removed');
  assert(!modal.includes("executeWork('SMITH_ASSIST')"), 'legacy SMITH_ASSIST must be removed');

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: canonical ids, wage/fatigue, idempotent replay and legacy rejection.');
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
