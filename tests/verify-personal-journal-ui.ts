/**
 * ThreeKingdoms-AgentEngine: Personal Journal & Ambition UI Verification Suite
 * (tests/verify-personal-journal-ui.ts)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

function runJournalVerification() {
  console.log('======================================================================');
  console.log('   PERSONAL JOURNAL & AMBITION UI [J]: VERIFICATION SUITE             ');
  console.log('======================================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const journalJsPath = path.join(rootDir, 'public', 'js', 'personal-journal-ui.js');
  const indexHtmlPath = path.join(rootDir, 'public', 'index.html');
  const stylesCssPath = path.join(rootDir, 'public', 'styles.css');

  // 1. File existence
  assert(fs.existsSync(journalJsPath), 'personal-journal-ui.js must exist in public/js/');
  assert(fs.existsSync(indexHtmlPath), 'index.html must exist in public/');
  assert(fs.existsSync(stylesCssPath), 'styles.css must exist in public/');
  console.log('  [PASS] 1. File existence verified.');

  // 2. Syntax & Exports in personal-journal-ui.js
  const journalCode = fs.readFileSync(journalJsPath, 'utf8');
  assert(journalCode.includes('window.PersonalJournalUI = PersonalJournalUI;'), 'Must export window.PersonalJournalUI');
  assert(journalCode.includes('window.GrandCommandHubUI = PersonalJournalUI;'), 'Must alias window.GrandCommandHubUI for backward compatibility');
  assert(journalCode.includes("renderCareerTab"), 'Must implement Career / Ambition tab');
  assert(journalCode.includes("renderGearTab"), 'Must implement Personal Gear tab');
  assert(journalCode.includes("renderFamilyTab"), 'Must implement Family Lineage tab');
  assert(journalCode.includes("renderChronicleTab"), 'Must implement Chronicle & Ledger tab');
  assert(journalCode.includes("e.key === 'j' || e.key === 'J'"), 'Must implement Hotkey J toggle');
  console.log('  [PASS] 2. 4 Introspective Tabs & Hotkey [J] verified.');

  // 3. Grounding checks in Personal Journal
  assert(journalCode.includes('QUY TẮC HIỆN DIỆN KHÔNG GIAN'), 'Must embed Spatial Grounding Principle notice');
  assert(journalCode.includes('Thiết Điếm [LOC-0003]'), 'Must provide physical POI guidance to smithy');
  assert(journalCode.includes('Tư Trạch [LOC-0001]'), 'Must provide physical POI guidance to residence');
  assert(!journalCode.includes('Bespoke Blacksmith Mini-Workbench'), 'Must NOT contain remote mini-workbench in journal');
  console.log('  [PASS] 3. Spatial grounding notices and removal of remote command slop verified.');

  // 4. index.html integration
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  assert(indexHtml.includes('personal-journal-ui.js'), 'index.html must include personal-journal-ui.js script');
  assert(indexHtml.includes('btn-personal-journal'), 'index.html must feature btn-personal-journal class');
  assert(indexHtml.includes('Sổ Tay [J]'), 'index.html must display Sổ Tay [J] label');
  assert(indexHtml.includes('data-tab="chronicle"'), 'index.html modal must include chronicle tab');
  assert(!indexHtml.includes('data-tab="tavern"'), 'index.html modal must NOT include remote tavern tab');
  assert(!indexHtml.includes('data-tab="duel"'), 'index.html modal must NOT include remote duel tab');
  console.log('  [PASS] 4. index.html HUD & modal tab alignment verified.');

  // 5. CSS styling check
  const stylesCss = fs.readFileSync(stylesCssPath, 'utf8');
  assert(stylesCss.includes('.btn-personal-journal'), 'styles.css must style .btn-personal-journal');
  console.log('  [PASS] 5. CSS styling verified.');

  console.log('\n======================================================================');
  console.log('   STEP 1 VERIFICATION COMPLETE: ALL 5 CHECKS PASSED (100%)           ');
  console.log('======================================================================');
}

runJournalVerification();
