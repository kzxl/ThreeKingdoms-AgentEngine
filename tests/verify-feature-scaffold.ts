/**
 * Feature scaffold: the standard folder must generate a typecheckable module,
 * service, controller, types, public index and smoke suite.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'tools', 'scaffold-feature.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-scaffold-'));

function run(): void {
  console.log('=== Feature scaffold ===');
  const feature = 'sample-ledger';
  const domain = 'economy';
  execFileSync(process.execPath, [SCRIPT, feature, `--domain=${domain}`, `--root=${TMP}`], {
    stdio: 'pipe'
  });

  const dir = path.join(TMP, 'src', 'modules', domain, feature);
  const expected = [
    path.join(dir, `${feature}.module.ts`),
    path.join(dir, `${feature}.service.ts`),
    path.join(dir, `${feature}.controller.ts`),
    path.join(dir, `${feature}.types.ts`),
    path.join(dir, 'index.ts'),
    path.join(TMP, 'tests', `verify-${feature}.ts`)
  ];
  for (const file of expected) {
    assert(fs.existsSync(file), `scaffold must create ${path.relative(TMP, file)}`);
  }

  const moduleSource = fs.readFileSync(path.join(dir, `${feature}.module.ts`), 'utf8');
  assert(moduleSource.includes("readonly id = 'sample-ledger'"));
  assert(moduleSource.includes('registerSampleLedgerRoutes'));

  const controllerSource = fs.readFileSync(path.join(dir, `${feature}.controller.ts`), 'utf8');
  assert(controllerSource.includes("'/api/economy/sample-ledger/ping'"));

  // A second run must refuse to overwrite without --force.
  let refused = false;
  try {
    execFileSync(process.execPath, [SCRIPT, feature, `--domain=${domain}`, `--root=${TMP}`], {
      stdio: 'pipe'
    });
  } catch {
    refused = true;
  }
  assert(refused, 'scaffold must refuse to overwrite an existing feature');

  // --dry-run must not write.
  const dryFeature = 'dry-run-feature';
  execFileSync(process.execPath, [SCRIPT, dryFeature, `--domain=${domain}`, `--root=${TMP}`, '--dry-run'], {
    stdio: 'pipe'
  });
  assert(
    !fs.existsSync(path.join(TMP, 'src', 'modules', domain, dryFeature)),
    'dry-run must not create files'
  );

  console.log('  ✅ PASSED: feature scaffold creates the standard folder and refuses overwrite.');
}

function cleanup(): void {
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

try {
  run();
  cleanup();
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
