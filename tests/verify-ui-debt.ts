/**
 * UI debt ratchet: no browser-native confirm(), a first-run onboarding card,
 * and a relationship-first right panel instead of the raw ledger.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function run(): void {
  console.log('=== UI debt ===');
  const publicJs = [
    'public/js/modals.js',
    'public/js/story.js',
    'public/js/title-screen-ui.js',
    'public/js/world-map.js'
  ].map(read).join('\n');
  assert(!/(?<!\.)\bconfirm\(/.test(publicJs), 'legacy scripts must use window.UI.confirm, not native confirm()');

  const modal = read('src/client/features/lineage-family/lineage-family.modal.ts');
  assert(modal.includes('confirmDialog'), 'lineage succession must use the shared confirm dialog');

  const onboarding = read('src/client/features/onboarding/onboarding.modal.ts');
  const index = read('public/index.html');
  assert(onboarding.includes('sim_onboarding_v1_done'), 'onboarding must persist its first-run flag');
  assert(onboarding.includes('Vòng ngày và tháng'), 'onboarding must explain the day loop');
  assert(onboarding.includes('Chi phí hành động'), 'onboarding must explain action cost');
  assert(onboarding.includes('Chợ địa phương'), 'onboarding must explain the local market');
  assert(onboarding.includes('Lưu và tải'), 'onboarding must explain save/load');
  assert(onboarding.includes("id: 'onboarding-modal'"), 'onboarding must use the modal shell');
  assert(index.includes('window.OnboardingUI'), 'index must expose a help button');
  assert(!index.includes('/js/onboarding.js'), 'onboarding must not add a frozen legacy script');

  assert(
    /data-subtab="subtab-npcs"[^>]*class="deck-tab-btn active"|class="deck-tab-btn active"[^>]*data-subtab="subtab-npcs"/.test(index),
    'right panel must default to the household/relations tab'
  );
  assert(!/class="deck-tab-btn active"[^>]*data-subtab="subtab-log"/.test(index), 'log must not be the default tab');
  assert(index.includes('id="subtab-npcs" class="deck-tab-pane active"'), 'household pane must be visible by default');
  assert(!index.includes('id="subtab-log" class="deck-tab-pane active"'), 'log pane must stay closed by default');

  // The card header opens the dossier; nested path buttons must not bubble and
  // open a second modal on top of it.
  const headerStart = index.indexOf('class="protagonist-header"');
  const headerEnd = index.indexOf('<!-- Vitals Bars', headerStart);
  const header = index.slice(headerStart, headerEnd);
  for (const id of [
    'protagonist-career-badge',
    'dot-path-artisan',
    'dot-path-merchant',
    'dot-path-martial',
    'dot-path-scholar',
    'dot-path-lineage'
  ]) {
    const start = header.indexOf(`id="${id}"`);
    assert(start >= 0, `${id} must exist in the protagonist header`);
    const tag = header.slice(start, header.indexOf('>', start) + 1);
    assert(tag.includes('event.stopPropagation()'), `${id} must stop click bubbling to the dossier header`);
  }

  const ratchet = JSON.parse(read('tools/ui-baseline.json'));
  assert.strictEqual(ratchet.nativeConfirmCalls, 0, 'native confirm budget must be locked at 0');

  console.log('  ✅ PASSED: shared confirms, onboarding card and relationship-first panel.');
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}
