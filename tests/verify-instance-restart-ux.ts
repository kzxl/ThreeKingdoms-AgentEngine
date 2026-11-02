/**
 * Instance restart UX guard.
 *
 * A non-startup instance cannot be served by the modular router until the
 * server is restarted with that database path. The title screen must stop
 * before `loadAllData` when `/api/instances/select` reports `restartRequired`,
 * and it must show the exact restart command instead of a 409 toast.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function run(): void {
  console.log('=== Instance restart UX ===');

  const client = read('public/js/title-screen-ui.js');
  assert(client.includes('data.restartRequired'), 'title screen must read restartRequired');
  assert(client.includes('pendingRestart'), 'title screen must hold the pending restart notice');
  assert(client.includes('buildRestartCommand'), 'title screen must build an explicit restart command');
  assert(client.includes('SIM_DB_PATH'), 'restart command must name SIM_DB_PATH');

  const selectStart = client.indexOf('async function selectInstance');
  assert(selectStart >= 0, 'selectInstance must exist');
  const selectEnd = client.indexOf('async function copyRestartCommand', selectStart);
  assert(selectEnd > selectStart, 'copyRestartCommand must follow selectInstance');
  const selectBlock = client.slice(selectStart, selectEnd);
  const restartIndex = selectBlock.indexOf('if (data.restartRequired)');
  const loadIndex = selectBlock.indexOf('window.loadAllData');
  assert(restartIndex >= 0, 'selectInstance must guard restartRequired');
  assert(loadIndex > restartIndex, 'restart guard must run before loadAllData');
  assert(
    selectBlock.slice(restartIndex, loadIndex).includes('return;'),
    'restart guard must return before loading campaign data'
  );

  const server = read('tools/sim-web.js');
  assert(
    server.includes('ensureInstanceWorker'),
    'server must be able to boot a per-instance worker'
  );
  assert(
    server.includes('proxyToInstanceWorker'),
    'server must proxy API requests to the selected instance worker'
  );
  assert(
    server.includes("type: 'server-ready'"),
    'instance workers must report their ephemeral port over IPC'
  );
  assert(
    server.includes('restartRequired: false'),
    'create/select must succeed without a manual restart when the worker starts'
  );
  assert(
    server.includes('path.resolve(currentActiveDbPath) === path.resolve(DB_PATH)'),
    'the main process must not open a non-startup database'
  );
  assert(
    server.includes('restartRequired: true'),
    'worker-start failure must keep the restart notice as a fallback'
  );

  console.log('   ✅ title screen stops on restartRequired and shows the SIM_DB_PATH command');
}

run();
