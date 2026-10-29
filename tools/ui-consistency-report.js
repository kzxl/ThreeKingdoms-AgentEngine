#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: UI Consistency Ratchet (tools/ui-consistency-report.js)
 *
 * The UI grew one class per screen (42 legacy button classes, ~970 inline style
 * attributes). This report counts the debt and compares it with
 * tools/ui-baseline.json: legacy metrics may only shrink. New surfaces should use
 * the shared primitives in src/client/core/ui (`npm run lint:ui` stays green).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(__dirname, 'ui-baseline.json');

function read(rel) {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

function walkJs(dir, files = []) {
  return walkByExt(dir, '.js', files);
}

function walkByExt(dir, ext, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walkByExt(abs, ext, files);
    else if (entry.name.endsWith(ext)) files.push(abs);
  }
  return files;
}

function countMatches(text, regex) {
  return (text.match(regex) || []).length;
}

function collect() {
  const styles = read('public/styles.css');
  const index = read('public/index.html');
  const clientFiles = walkJs(path.join(ROOT, 'public', 'js')).concat([path.join(ROOT, 'public', 'app.js')]);
  const clientSource = clientFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const publicSource = `${index}\n${clientSource}`;

  // Legacy classes still emitted by TypeScript feature modals.
  const tsSource = walkByExt(path.join(ROOT, 'src', 'client'), '.ts')
    .map(f => fs.readFileSync(f, 'utf8'))
    .join('\n');
  const legacyClientTsUsages = (() => {
    let count = 0;
    for (const match of tsSource.matchAll(/class="([^"]*)"/g)) {
      if (/\bbtn-/.test(match[1]) && !/ui-btn/.test(match[1])) count++;
    }
    return count;
  })();

  // Legacy button selectors still defined in CSS (tactical-btn and btn-* families).
  const legacyButtonSelectors = new Set();
  for (const match of styles.matchAll(/\.((?:tactical-)?btn[a-z0-9_-]*)/g)) {
    legacyButtonSelectors.add(match[1]);
  }

  return {
    legacyButtonClassesDefined: legacyButtonSelectors.size,
    legacyButtonClassUsages: countMatches(publicSource, /class="[^"]*\b(?:tactical-btn|btn-[a-z])/g),
    legacyButtonClassesInClientTs: Math.max(0, legacyClientTsUsages),
    inlineStyleAttributes: countMatches(publicSource, /style="/g),
    nativeConfirmCalls: countMatches(publicSource, /\bconfirm\(/g),
    uiPrimitiveUsages: countMatches(publicSource, /\bui-(?:btn|badge)\b/g) +
      countMatches(tsSource, /\bui-(?:btn|badge)/g)
  };
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const update = process.argv.includes('--update-baseline');
  const counts = collect();
  const baseline = loadBaseline();

  console.log('====================================================');
  console.log(' 🎛️  UI CONSISTENCY RATCHET');
  console.log('====================================================');

  if (update || !baseline) {
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(counts, null, 2)}\n`);
    console.log(`[ui] Baseline written → tools/ui-baseline.json`);
    for (const [key, value] of Object.entries(counts)) console.log(`  ${key}: ${value}`);
    return;
  }

  const regressions = [];
  for (const key of [
    'legacyButtonClassesDefined',
    'legacyButtonClassUsages',
    'legacyButtonClassesInClientTs',
    'inlineStyleAttributes',
    'nativeConfirmCalls'
  ]) {
    const allowed = Number(baseline[key] ?? 0);
    const actual = Number(counts[key] ?? 0);
    const mark = actual > allowed ? '❌' : actual < allowed ? '⬇️ ' : '✅';
    console.log(` ${mark} ${key.padEnd(28)} ${String(actual).padStart(5)} / budget ${String(allowed).padStart(5)}`);
    if (actual > allowed) regressions.push(`${key}: ${allowed} → ${actual}`);
  }
  console.log(` ℹ️  uiPrimitiveUsages             ${String(counts.uiPrimitiveUsages).padStart(5)} (grow this)`);

  if (regressions.length > 0) {
    console.error('\n[ui] FAILED: new legacy UI debt. Use src/client/core/ui primitives.');
    for (const line of regressions) console.error(`   ${line}`);
    process.exit(1);
  }

  if (Object.entries(counts).some(([k, v]) => k !== 'uiPrimitiveUsages' && v < Number(baseline[k] ?? 0))) {
    console.log('\n[ui] Debt reduced — run `node tools/ui-consistency-report.js --update-baseline` to lock it in.');
  }
  console.log('[ui] PASSED: no new legacy UI debt.');
}

main();
