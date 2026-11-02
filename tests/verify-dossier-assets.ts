/**
 * Dossier assets tab: the NPC dossier payload carries the latest npc_ledger
 * entries and the assigned business/manager, and the panel renders both.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-dossier-assets-'));
const TEST_DB = path.join(TMP, 'session.db');

function request(router: any, method: string, url: string): Promise<{ status: number; data: any }> {
  return new Promise(resolve => {
    let sentStatus = 200;
    const req: any = {
      method,
      url,
      headers: { host: 'localhost:3300' },
      on: (event: string, callback: any) => {
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
  console.log('=== Dossier assets ===');
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
  const router = createGrandStrategyRouter();

  const res = await request(router, 'GET', '/api/kizuna/dossier/NPC-0008');
  assert.strictEqual(res.status, 200, JSON.stringify(res.data));
  const assets = res.data.dossier?.assets;
  assert(assets, 'dossier must expose an assets block');
  assert(Array.isArray(assets.ledger), 'assets.ledger must be an array');
  assert(assets.ledger.length > 0, 'NPC-0008 must have ledger entries');
  assert(assets.ledger.length <= 5, 'the dossier must cap the ledger at 5 entries');
  assert(assets.business, 'NPC-0008 must expose an assigned business');
  assert.strictEqual(assets.business.businessId, 'BIZ-RIVAL-NPC-0008');
  assert(assets.business.assignedRole, 'business must expose the assigned role');

  const modal = fs.readFileSync(path.join(ROOT, 'public/js/npc-dossier-modal.js'), 'utf8');
  const stall = fs.readFileSync(path.join(ROOT, 'src/client/features/market-stall/market-stall.modal.ts'), 'utf8');
  const stallService = fs.readFileSync(path.join(ROOT, 'src/client/features/market-stall/market-stall.service.ts'), 'utf8');
  assert(modal.includes("switchDossierTab('assets')"), 'dossier must add the assets tab');
  assert(modal.includes('dossier-ledger-row'), 'dossier must render ledger rows');
  assert(modal.includes('dossier-asset-card'), 'dossier must render the business card');
  assert(stall.includes('getMerchantEvents'), 'logistics tab must read merchant events');
  assert(stallService.includes('/api/merchant/events'), 'merchant event client must call the API');
  assert(stall.includes('slice(0, 5)'), 'logistics event feed must be capped at 5');

  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: dossier ledger, business succession and merchant event feed.');
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
