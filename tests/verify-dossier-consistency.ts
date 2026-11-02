/**
 * Dossiers share one visual contract: both legacy renderers use `.dossier-*`
 * header/tab/footer classes, and no second ModalShell mounts the same ids.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function run(): void {
  console.log('=== Dossier consistency ===');
  const protagonist = read('public/js/protagonist-dossier-modal.js');
  const npc = read('public/js/npc-dossier-modal.js');
  const bridge = read('src/client/features/legacy-bridge.ts');
  const main = read('src/client/main.ts');

  for (const [name, source] of [['protagonist', protagonist], ['npc', npc]] as const) {
    assert(source.includes('dossier-header'), `${name} dossier must use the shared header`);
    assert(source.includes('dossier-tab-bar'), `${name} dossier must use the shared tab bar`);
    assert(source.includes('dossier-tab-btn'), `${name} dossier must use the shared tab buttons`);
    assert(source.includes('dossier-action-footer'), `${name} dossier must use the shared action footer`);
  }

  assert(protagonist.includes('dossier-radar-svg'), 'protagonist radar must use the shared class');
  assert(protagonist.includes('dossier-stats-layout'), 'protagonist stats must use the shared layout');
  assert(!protagonist.includes('grand-hub-subnav-btn'), 'protagonist dossier must not keep the old tab chrome');

  assert(!bridge.includes("from './dossiers'"), 'bridge must not import the duplicate TS dossier renderer');
  assert(!bridge.includes('dossiersModal.openProtagonist'), 'bridge must not override the legacy protagonist dossier');
  assert(!main.includes("features/dossiers"), 'client bundle must not export the removed duplicate renderer');
  assert(!fs.existsSync(path.join(ROOT, 'src/client/features/dossiers')), 'duplicate dossier feature folder must be gone');

  assert(protagonist.includes("id = 'protagonist-dossier-modal'"), 'protagonist modal id must be owned by one renderer');
  assert(!npc.includes("id = 'protagonist-dossier-modal'"), 'NPC renderer must not touch the protagonist id');
  assert(npc.includes("id = 'npc-dossier-modal'"), 'NPC modal id must be owned by one renderer');

  console.log('  ✅ PASSED: one shared dossier layout and one renderer per modal id.');
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}
