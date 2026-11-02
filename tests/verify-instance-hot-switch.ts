/**
 * True hot-switch verification.
 *
 * Boots the real composition root on a temporary startup instance, creates a
 * second playthrough over HTTP, activates it (the server spawns a per-instance
 * worker), hits both a legacy route and a modular route, switches back to the
 * startup campaign, and deletes the worker-owned instance.
 */

import assert from 'assert';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import http from 'http';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const TSX_CLI = require.resolve('tsx/cli');
const STARTUP_ID = `inst_hotswitch_test_${process.pid}`;
const STARTUP_PATH = path.join(ROOT, 'saves', 'instances', `${STARTUP_ID}.db`);
const PORT_TIMEOUT_MS = 60000;

function httpRequest(
  port: number,
  method: string,
  urlPath: string,
  instanceId: string,
  body?: unknown
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: {
          'x-instance-id': instanceId,
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {})
        },
        timeout: 90000
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          let parsed: any = null;
          try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = { raw: raw.slice(0, 400) }; }
          resolve({ status: res.statusCode || 0, body: parsed });
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error(`timeout ${method} ${urlPath}`)));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function waitForServer(child: ChildProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    const log: string[] = [];
    const timer = setTimeout(() => reject(new Error(`server did not report a port: ${log.join('').slice(-1200)}`)), PORT_TIMEOUT_MS);
    child.stdout?.on('data', (chunk) => log.push(chunk.toString()));
    child.stderr?.on('data', (chunk) => log.push(chunk.toString()));
    child.on('message', (message: any) => {
      if (message && message.type === 'server-ready' && message.port) {
        clearTimeout(timer);
        resolve(Number(message.port));
      }
    });
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`server exited before ready (${code ?? signal}): ${log.join('').slice(-1200)}`));
    });
  });
}

function copyWithSidecars(source: string, target: string): void {
  fs.copyFileSync(source, target);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${source}${suffix}`)) fs.copyFileSync(`${source}${suffix}`, `${target}${suffix}`);
  }
}

function removeWithSidecars(target: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.rmSync(`${target}${suffix}`, { force: true }); } catch { /* best effort */ }
  }
}

async function run(): Promise<void> {
  console.log('=== Instance hot switch ===');

  const instancesDir = path.join(ROOT, 'saves', 'instances');
  fs.mkdirSync(instancesDir, { recursive: true });
  const sourceDb = path.join(ROOT, 'saves', 'session.db');
  copyWithSidecars(sourceDb, STARTUP_PATH);

  let createdInstanceId = '';
  let mainChild: ChildProcess | null = null;

  try {
    mainChild = spawn(process.execPath, [TSX_CLI, path.join(ROOT, 'src', 'server', 'main.ts')], {
      cwd: ROOT,
      env: {
        ...process.env,
        SIM_DB_PATH: STARTUP_PATH,
        PORT: '0',
        RUN_MAIN: 'true'
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    const port = await waitForServer(mainChild);

    const initialList = await httpRequest(port, 'GET', '/api/instances', STARTUP_ID);
    assert.strictEqual(initialList.body?.currentInstanceId, STARTUP_ID, 'temporary startup instance must be current');

    const created = await httpRequest(port, 'POST', '/api/instances/new', STARTUP_ID, {
      name: 'Hot Switch Test',
      styleName: 'Test',
      archetypeId: 'ARCH-COMMONER-YOUTH'
    });
    assert.strictEqual(created.body?.success, true, `create failed: ${created.body?.error}`);
    assert.strictEqual(created.body?.restartRequired, false, 'create must not ask for a restart');
    createdInstanceId = created.body.instanceId;
    assert(createdInstanceId.startsWith('inst_'), 'created instance id must be inst_*');

    const selected = await httpRequest(port, 'POST', '/api/instances/select', STARTUP_ID, {
      instanceId: createdInstanceId
    });
    assert.strictEqual(selected.body?.success, true, `select failed: ${selected.body?.error}`);
    assert.strictEqual(selected.body?.restartRequired, false, 'select must hot-switch without restart');

    const status = await httpRequest(port, 'GET', '/api/status', createdInstanceId);
    assert.strictEqual(status.status, 200, `proxied status returned HTTP ${status.status}`);
    assert.strictEqual(status.body?.success, true, 'proxied status must succeed');
    assert.strictEqual(status.body?.player?.name, 'Hot Switch Test', 'status must read the new instance');
    assert.strictEqual(Number(status.body?.meta?.active_turn), 1, 'new instance must start at turn 1');

    const modular = await httpRequest(port, 'GET', '/api/labor/status', createdInstanceId);
    assert.strictEqual(modular.status, 200, `modular route must be proxied, got HTTP ${modular.status}`);
    assert.strictEqual(modular.body?.success, true, 'modular route must succeed on the worker');

    const back = await httpRequest(port, 'POST', '/api/instances/select', createdInstanceId, {
      instanceId: STARTUP_ID
    });
    assert.strictEqual(back.body?.success, true, `switch-back failed: ${back.body?.error}`);
    assert.strictEqual(back.body?.restartRequired, false, 'switch-back must not ask for a restart');

    const startupModular = await httpRequest(port, 'GET', '/api/labor/status', STARTUP_ID);
    assert.strictEqual(startupModular.status, 200, `startup modular route returned HTTP ${startupModular.status}`);
    assert.strictEqual(startupModular.body?.success, true, 'startup modular route must succeed');

    const deleted = await httpRequest(port, 'DELETE', `/api/instances/${createdInstanceId}`, STARTUP_ID);
    assert.strictEqual(deleted.body?.success, true, `delete failed: ${deleted.body?.error}`);
    assert(!fs.existsSync(path.join(instancesDir, `${createdInstanceId}.db`)), 'delete must remove the instance file');

    console.log('   ✅ create, switch, proxy legacy/modular routes, switch back and delete without a restart');
  } finally {
    if (createdInstanceId) removeWithSidecars(path.join(instancesDir, `${createdInstanceId}.db`));
    removeWithSidecars(STARTUP_PATH);
    if (mainChild) {
      mainChild.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!mainChild.killed) {
        try { mainChild.kill('SIGKILL'); } catch { /* best effort */ }
      }
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
