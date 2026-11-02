/**
 * Modal priority: legacy dossiers opened from the shell-owned world map must
 * sit above it and own Escape, instead of rendering below the map backdrop.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(file: string): string {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function run(): void {
  console.log('=== Modal priority ===');
  const config = read('public/js/config.js');
  const match = config.match(/function nextModalZIndex[\s\S]*?\n}\n/);
  assert(match, 'config.js must define nextModalZIndex');

  const fakeElements = [
    { id: 'world-map-modal', classList: { contains: () => false }, style: { zIndex: '1010' } },
    { id: 'other-modal', classList: { contains: () => false }, style: { zIndex: '' } },
    { id: 'hidden-modal', classList: { contains: (name: string) => name === 'hidden' }, style: { zIndex: '9999' } }
  ];
  const fakeDocument = {
    querySelectorAll: () => fakeElements
  };
  const fakeWindow = {
    getComputedStyle: (element: { id: string }) => ({ zIndex: element.id === 'other-modal' ? '1001' : 'auto' })
  };
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const factory = new Function('document', 'window', `${match![0]}\nreturn nextModalZIndex;`);
  const nextModalZIndex = factory(fakeDocument, fakeWindow) as (base?: number) => number;
  assert.strictEqual(nextModalZIndex(1000), 1020, 'next z-index must be above the highest visible modal');
  assert.strictEqual(nextModalZIndex(1100), 1110, 'explicit base above the stack must win');

  for (const file of ['public/js/npc-dossier-modal.js', 'public/js/protagonist-dossier-modal.js']) {
    const source = read(file);
    assert(source.includes('nextModalZIndex()'), `${file} must raise itself above the map`);
    assert(source.includes('stopImmediatePropagation()'), `${file} must own Escape while open`);
    assert(source.includes("classList.contains('hidden')"), `${file} must only claim Escape when visible`);
  }

  console.log('  ✅ PASSED: legacy dossiers stack above the map and own Escape.');
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}
