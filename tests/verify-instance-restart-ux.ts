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
    server.includes('const startupDbPath = path.resolve(DB_PATH)'),
    'instance list must derive the current marker from the startup database'
  );
  assert(
    server.includes('restartRequired: path.resolve(newInst.filepath) !== path.resolve(DB_PATH)'),
    'instance creation must report restartRequired'
  );
  assert(
    server.includes('dbPath,'),
    'select response must include the target database path'
  );

  console.log('   ✅ title screen stops on restartRequired and shows the SIM_DB_PATH command');
}

run();
