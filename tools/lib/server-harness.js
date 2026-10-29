/**
 * ThreeKingdoms-AgentEngine: Server Harness (tools/lib/server-harness.js)
 *
 * Shared plumbing for tools that need to boot the real composition root against
 * an isolated database copy: sandbox preparation, readiness polling, JSON
 * requests and teardown. Used by tools/api-golden.js and tools/perf-probe.js so
 * both gates measure the same runtime.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..', '..');
const TSX_CLI = require.resolve('tsx/cli');

/**
 * Copies the session database (plus WAL sidecars) into a fresh run directory.
 * Returns the sandbox database path.
 */
function prepareSandbox(runDir, sourceDb) {
  const source = sourceDb || process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
  fs.rmSync(runDir, { recursive: true, force: true });
  fs.mkdirSync(runDir, { recursive: true });

  const dest = path.join(runDir, 'session.db');
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    for (const suffix of ['-wal', '-shm']) {
      if (fs.existsSync(`${source}${suffix}`)) fs.copyFileSync(`${source}${suffix}`, `${dest}${suffix}`);
    }
  }
  return dest;
}

/**
 * Boots src/server/main.ts (the real composition root) with modules initialized.
 * Returns { child, logText }.
 */
function bootServer({ port, dbPath, cwd = ROOT, env = {} }) {
  const child = spawn(process.execPath, [TSX_CLI, path.join(ROOT, 'src', 'server', 'main.ts')], {
    cwd,
    env: { ...process.env, ...env, PORT: String(port), SIM_DB_PATH: dbPath, RUN_MAIN: 'true' },
    stdio: 'pipe'
  });

  const log = [];
  child.stdout.on('data', chunk => log.push(chunk.toString()));
  child.stderr.on('data', chunk => log.push(chunk.toString()));

  return { child, logText: () => log.join('') };
}

/** Performs one JSON GET against the local harness server. */
function httpJson(port, urlPath, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: urlPath, timeout: timeoutMs },
      res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = body ? JSON.parse(body) : null;
          } catch {
            parsed = { __nonJson: body.slice(0, 200) };
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error(`timeout ${urlPath}`)));
    req.on('error', reject);
  });
}

/** Polls /api/status until the server answers or the deadline expires. */
function waitForReady(port, timeoutMs = 45000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      httpJson(port, '/api/status', 2000)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() - started > timeoutMs) reject(new Error('server did not become ready'));
          else setTimeout(attempt, 400);
        });
    };
    attempt();
  });
}

function stopServer(child) {
  try {
    child.kill();
  } catch {}
}

function removeDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

module.exports = {
  ROOT,
  TSX_CLI,
  prepareSandbox,
  bootServer,
  httpJson,
  waitForReady,
  stopServer,
  removeDir
};
