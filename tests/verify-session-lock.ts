/**
 * Multi-session lease verification.
 *
 * The shared registry (`registry.db`) must admit exactly one client per
 * campaign, rotate the token for the same client, expire a dead lease, and
 * refuse HTTP writes from a second client with 423.
 */

import assert from 'assert';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { SessionRegistry } from '../src/core/session-registry';

const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'tests', '.session-lock');
const PORT = 36000 + (process.pid % 1000);
const {
  prepareSandbox,
  bootServer,
  httpJson,
  waitForReady,
  stopServer,
  removeDir
} = require('../tools/lib/server-harness');

function requestJson(
  port: number,
  urlPath: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = options.body === undefined ? null : JSON.stringify(options.body);
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: urlPath,
      method: options.method || 'GET',
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(options.headers || {})
      },
      timeout: 20000
    }, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        let parsed: any = null;
        try { parsed = body ? JSON.parse(body) : null; } catch { parsed = { __nonJson: body.slice(0, 200) }; }
        resolve({ status: res.statusCode || 0, body: parsed });
      });
    });
    req.on('timeout', () => req.destroy(new Error(`timeout ${urlPath}`)));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function verifyRegistryUnit(): void {
  fs.rmSync(RUN_DIR, { recursive: true, force: true });
  fs.mkdirSync(RUN_DIR, { recursive: true });
  const registryPath = path.join(RUN_DIR, 'unit-registry.db');

  const registry = SessionRegistry.getInstance(registryPath);
  try {
    const first = registry.acquire('sess-a', 'client-a', 60_000);
    assert.strictEqual(first.ok, true, 'first acquire must succeed');
    assert.ok(first.ok && first.lock.token, 'first acquire must return a token');
    const firstToken = first.ok ? first.lock.token : '';
    assert.strictEqual(first.ok ? first.lock.version : 0, 1, 'new lease starts at version 1');

    assert.strictEqual(registry.bumpVersion('sess-a', firstToken), 2, 'a successful write bumps the version');
    assert.strictEqual(registry.bumpVersion('sess-a', 'wrong-token'), null, 'a stale token cannot bump the version');

    const second = registry.acquire('sess-a', 'client-b', 60_000);
    assert.strictEqual(second.ok, false, 'second owner must be refused');
    assert.strictEqual(!second.ok && second.code, 'SESSION_LOCKED', 'refusal must be SESSION_LOCKED');

    const refreshed = registry.acquire('sess-a', 'client-a', 60_000);
    assert.strictEqual(refreshed.ok, true, 'same owner may refresh');
    const rotatedToken = refreshed.ok ? refreshed.lock.token : '';
    assert.notStrictEqual(rotatedToken, first.ok ? first.lock.token : '', 'refresh must rotate the token');
    assert.strictEqual(refreshed.ok ? refreshed.lock.version : 0, 2, 'refresh must keep the campaign version');

    const oldHeartbeat = registry.heartbeat('sess-a', first.ok ? first.lock.token : '');
    assert.strictEqual(oldHeartbeat.ok, false, 'the previous token must no longer work');

    const currentHeartbeat = registry.heartbeat('sess-a', rotatedToken);
    assert.strictEqual(currentHeartbeat.ok, true, 'current token must heartbeat');

    assert.strictEqual(registry.release('sess-a', 'wrong-token'), false, 'wrong release must be ignored');
    assert.strictEqual(registry.release('sess-a', rotatedToken), true, 'current token must release');
    assert.strictEqual(registry.status('sess-a'), null, 'released session must have no lock');

    const shortLease = registry.acquire('sess-b', 'client-c', 1_000);
    assert.strictEqual(shortLease.ok, true, 'short lease must acquire');
    assert.strictEqual(registry.acquire('sess-b', 'client-d', 60_000).ok, false, 'live short lease must block');

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_150);
    const afterExpiry = registry.acquire('sess-b', 'client-d', 60_000);
    assert.strictEqual(afterExpiry.ok, true, 'expired lease must be takeover-able');

    console.log('   ✅ registry: exclusive lease, token rotation, heartbeat, release, expiry takeover');
  } finally {
    registry.close();
    SessionRegistry.resetInstance(registryPath);
  }
}

async function verifyHttpLock(): Promise<void> {
  const savesDir = path.join(RUN_DIR, 'saves');
  const dbPath = prepareSandbox(savesDir, process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db'));
  const registryPath = path.join(savesDir, 'registry.db');
  const { child, logText } = bootServer({
    port: PORT,
    dbPath,
    env: { SIM_SESSION_REGISTRY: registryPath, SIM_SAVES_DIR: savesDir }
  });

  try {
    await waitForReady(PORT);

    const list = await httpJson(PORT, '/api/sessions');
    assert.strictEqual(list.status, 200, 'session list must answer');
    assert.strictEqual(list.body.success, true, 'session list must succeed');

    const first = await requestJson(PORT, '/api/sessions/acquire', {
      method: 'POST',
      body: { sessionId: 'default', ownerId: 'browser-a' }
    });
    assert.strictEqual(first.status, 200, `first acquire HTTP 200, got ${first.status}: ${logText().slice(-400)}`);
    const token = String(first.body.token || '');
    assert.ok(token, 'acquire must return a token');

    const locked = await requestJson(PORT, '/api/sessions/acquire', {
      method: 'POST',
      body: { sessionId: 'default', ownerId: 'browser-b' }
    });
    assert.strictEqual(locked.status, 423, 'second browser acquire must be 423');
    assert.strictEqual(locked.body.code, 'SESSION_LOCKED', 'second browser code must be SESSION_LOCKED');

    const noToken = await requestJson(PORT, '/api/status', {
      headers: { 'x-session-id': 'default' }
    });
    assert.strictEqual(noToken.status, 423, 'session request without a token must be 423');

    const withToken = await requestJson(PORT, '/api/status', {
      headers: { 'x-session-id': 'default', 'x-session-token': token }
    });
    assert.strictEqual(withToken.status, 200, 'holder request must pass');

    const wrongToken = await requestJson(PORT, '/api/status', {
      headers: { 'x-session-id': 'default', 'x-session-token': 'not-the-token' }
    });
    assert.strictEqual(wrongToken.status, 423, 'wrong token must be refused');

    const heartbeat = await requestJson(PORT, '/api/sessions/heartbeat', {
      method: 'POST',
      body: { sessionId: 'default', token }
    });
    assert.strictEqual(heartbeat.status, 200, 'heartbeat must pass for the holder');

    const release = await requestJson(PORT, '/api/sessions/release', {
      method: 'POST',
      body: { sessionId: 'default', token }
    });
    assert.strictEqual(release.status, 200, 'release must answer');
    assert.strictEqual(release.body.released, true, 'release must delete the lock');

    const second = await requestJson(PORT, '/api/sessions/acquire', {
      method: 'POST',
      body: { sessionId: 'default', ownerId: 'browser-b' }
    });
    assert.strictEqual(second.status, 200, 'after release the next browser may enter');

    // A second campaign must run in its own worker, not in the broker's DB.
    const created = await requestJson(PORT, '/api/instances/new', {
      method: 'POST',
      body: { name: 'Lease Test Campaign', archetypeId: 'ARCH-COMMONER-YOUTH' }
    });
    assert.strictEqual(created.status, 200, `create session HTTP 200, got ${created.status}: ${logText().slice(-400)}`);
    const newSessionId = String(created.body.instanceId || '');
    assert.ok(newSessionId, 'create session must return an id');

    const newAcquire = await requestJson(PORT, '/api/sessions/acquire', {
      method: 'POST',
      body: { sessionId: newSessionId, ownerId: 'browser-c' }
    });
    assert.strictEqual(newAcquire.status, 200, 'new session acquire must succeed');
    const newToken = String(newAcquire.body.token || '');

    const newStatus = await requestJson(PORT, '/api/status', {
      headers: { 'x-session-id': newSessionId, 'x-session-token': newToken }
    });
    assert.strictEqual(newStatus.status, 200, `worker must serve the new session: ${logText().slice(-600)}`);

    const newBlocked = await requestJson(PORT, '/api/sessions/acquire', {
      method: 'POST',
      body: { sessionId: newSessionId, ownerId: 'browser-d' }
    });
    assert.strictEqual(newBlocked.status, 423, 'second browser on the new session must be blocked');

    const newWrongToken = await requestJson(PORT, '/api/status', {
      headers: { 'x-session-id': newSessionId, 'x-session-token': 'wrong' }
    });
    assert.strictEqual(newWrongToken.status, 423, 'worker request with a wrong token must be refused');

    await requestJson(PORT, '/api/sessions/release', {
      method: 'POST',
      body: { sessionId: newSessionId, token: newToken }
    });
    const deleted = await requestJson(PORT, '/api/instances/delete', {
      method: 'POST',
      body: { instanceId: newSessionId }
    });
    assert.strictEqual(deleted.status, 200, 'created session must be deletable');
    assert.strictEqual(deleted.body.success, true, 'delete must succeed after releasing the lease');

    console.log('   ✅ HTTP: second campaign runs in its own worker; locks and release isolate both sessions');
    console.log('   ✅ HTTP: 423 for the second client, 200 for the holder, release hands over cleanly');
  } finally {
    stopServer(child);
    removeDir(RUN_DIR);
  }
}

async function run(): Promise<void> {
  console.log('====================================================');
  console.log(' 🔐 VERIFYING MULTI-SESSION LEASES');
  console.log('====================================================\n');
  verifyRegistryUnit();
  await verifyHttpLock();
  console.log('\n✅ session lease verification passed');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
