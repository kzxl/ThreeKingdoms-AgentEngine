/**
 * In-place reset verification.
 *
 * Multi-session is the product default, but `POST /api/game/new-session` still
 * resets the startup database in place after a backup. This suite keeps that
 * endpoint honest while the title screen now creates separate campaign files.
 */

import assert from 'assert';
import fs from 'fs';
import http from 'http';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const PORT = 35000 + (process.pid % 1000);
const RUN_DIR = path.join(ROOT, 'tests', '.single-session');
const {
  prepareSandbox,
  bootServer,
  httpJson,
  waitForReady,
  stopServer,
  removeDir
} = require('../tools/lib/server-harness');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function postJson(urlPath: string, body: unknown): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {});
    const req = http.request({
      host: '127.0.0.1',
      port: PORT,
      path: urlPath,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 60000
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let parsed: any = null;
        try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = { raw: raw.slice(0, 400) }; }
        resolve({ status: res.statusCode || 0, body: parsed });
      });
    });
    req.on('timeout', () => req.destroy(new Error(`timeout ${urlPath}`)));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run(): Promise<void> {
  console.log('=== In-place reset (compatibility endpoint) ===');

  const client = read('public/js/title-screen-ui.js');
  assert(client.includes('/api/sessions'), 'title screen must list playable sessions');
  assert(client.includes('/api/instances/new'), 'title screen must create a separate campaign file');
  assert(client.includes('SessionClient'), 'title screen must acquire a session lease');
  assert(client.includes('window.UI.confirm'), 'delete campaign must use the shared confirm dialog');
  assert(client.includes('window.location.reload'), 'entering a campaign must reload the browser, not the server');
  assert(client.includes('enterSession'), 'title screen must enter a selected session');

  const server = read('tools/sim-web.js');
  assert(server.includes('/api/game/new-session'), 'server must keep the in-place reset endpoint');
  assert(server.includes('initializeInstanceDatabase'), 'reset must use the instance bootstrap');
  assert(server.includes('session-pre-reset-'), 'reset must back up the previous database');
  assert(server.includes('foreign_key_check'), 'reset must verify the foreign-key graph');
  assert(server.includes('checkSessionLock'), 'session requests must require a lease');
  assert(server.includes('ensureInstanceWorker'), 'non-startup campaigns must run in their own worker');

  const index = read('public/index.html');
  assert(index.includes('Phiên Chơi'), 'header must open the session launcher');

  prepareSandbox(RUN_DIR, path.join(ROOT, 'saves', 'session.db'));
  const sandboxDb = path.join(RUN_DIR, 'session.db');
  const { child } = bootServer({
    port: PORT,
    dbPath: sandboxDb,
    env: { SIM_SAVES_DIR: RUN_DIR, SIM_SESSION_REGISTRY: path.join(RUN_DIR, 'registry.db') }
  });
  let backupPath = '';

  try {
    await waitForReady(PORT);

    const created = await postJson('/api/game/new-session', {
      name: 'Single Session Test',
      styleName: 'Test',
      archetypeId: 'ARCH-COMMONER-YOUTH'
    });
    assert.strictEqual(created.body?.success, true, `reset failed: ${created.body?.error}`);
    backupPath = created.body.backupPath || '';
    assert(backupPath && fs.existsSync(backupPath), 'reset must create a backup before wiping the session');

    const status = await httpJson(PORT, '/api/status');
    assert.strictEqual(status.status, 200, `status returned HTTP ${status.status}`);
    assert.strictEqual(status.body?.success, true, 'status must succeed after the in-place reset');
    assert.strictEqual(status.body?.player?.name, 'Single Session Test', 'status must read the reset session');
    assert.strictEqual(Number(status.body?.meta?.active_turn), 1, 'reset session must start at turn 1');

    const modular = await httpJson(PORT, '/api/labor/status');
    assert.strictEqual(modular.status, 200, `modular route returned HTTP ${modular.status}`);
    assert.strictEqual(modular.body?.success, true, 'modular route must work without a restart');

    // Player-owned runtime tables must not leak into the new campaign.
    const db = new Database(sandboxDb, { readonly: true });
    try {
      for (const table of ['obligations', 'land_parcels', 'player_quests', 'conditions', 'contract_offers', 'player_contracts']) {
        try {
          const row = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number };
          assert.strictEqual(Number(row.c), 0, `${table} must be empty after a new campaign`);
        } catch (error: any) {
          if (!/no such table/i.test(String(error.message))) throw error;
        }
      }
    } finally {
      db.close();
    }

    console.log('   ✅ reset in place, backup written, old runtime state cleared; no restart');
  } finally {
    stopServer(child);
    removeDir(RUN_DIR);
    if (backupPath) {
      try { fs.rmSync(backupPath, { force: true }); } catch { /* best effort */ }
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
