#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Anti-AI-Slop Lint (tools/anti-slop-lint.js)
 *
 * Enforces the project's AS laws on the web UI:
 *   AS-05  zero emoji in UI/payload source (Hanzi seals or words instead)
 *   AS-06  no gradients; flat fills on containers and bars
 *   AS-02  elevation only — no coloured glow shadows
 *   AS-02  at most two font families
 *   AS-02  font-size scale may only shrink (ratcheted)
 *
 * Hard rules must be zero. The size scale is compared with
 * tools/anti-slop-baseline.json and may only decrease.
 *
 * Usage: node tools/anti-slop-lint.js [--update-baseline]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(__dirname, 'anti-slop-baseline.json');
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;

function walk(dir, exts, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
      walk(abs, exts, files);
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      files.push(abs);
    }
  }
  return files;
}

function countEmoji() {
  const files = [...walk(path.join(ROOT, 'public'), ['.js', '.ts', '.html']),
                 ...walk(path.join(ROOT, 'src'), ['.js', '.ts']),
                 ...walk(path.join(ROOT, 'engine'), ['.js'])];
  let count = 0;
  const offenders = [];
  for (const file of files) {
    const matches = fs.readFileSync(file, 'utf8').match(EMOJI_RE) || [];
    if (matches.length > 0) {
      count += matches.length;
      offenders.push(`${path.relative(ROOT, file).split(path.sep).join('/')} (${matches.length})`);
    }
  }
  return { count, offenders };
}

/**
 * Currency unit law: Vietnamese uses "Quan", English uses "quan". The legacy
 * "N Tiền" / "N Qian" labels (and "Tiền/đơn vị") may not reappear.
 * Character names such as "Tao Qian" are safe because the pattern needs a digit.
 */
function countLegacyCurrency() {
  const files = [...walk(path.join(ROOT, 'public'), ['.js', '.ts', '.html']),
                 ...walk(path.join(ROOT, 'src'), ['.js', '.ts']),
                 ...walk(path.join(ROOT, 'engine'), ['.js']),
                 ...walk(path.join(ROOT, 'tools'), ['.js', '.ts'])]
    .filter(file => !file.endsWith('anti-slop-lint.js'));
  const re = /\d[\d.,]*\s*(?:Tiền|Qian)\b|Tiền\s*\/\s*đơn vị/;
  let count = 0;
  const offenders = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        count += 1;
        offenders.push(`${path.relative(ROOT, file).split(path.sep).join('/')}:${i + 1}`);
      }
    }
  }
  return { count, offenders };
}

function main() {
  const update = process.argv.includes('--update-baseline');
  const css = fs.readFileSync(path.join(ROOT, 'public', 'styles.css'), 'utf8');

  const emoji = countEmoji();
  const legacyCurrency = countLegacyCurrency();
  const gradients = (css.match(/(?:linear|radial)-gradient/g) || []).length;
  const coloredShadows = (css.match(/box-shadow:[^;]*(?:rgba?\(|#)[^;]*/g) || [])
    .filter(line => !/rgba\(\s*0\s*,\s*0\s*,\s*0/.test(line)).length;
  // Resolve the tokenised stacks; aliases (e.g. --font-serif folded onto sans)
  // must not count as a third family.
  const tokenStacks = ['--font-sans', '--font-serif', '--font-mono']
    .map(token => {
      const match = css.match(new RegExp(`${token}:\\s*([^;]+);`));
      return match ? match[1].replace(/\s+/g, ' ').trim().toLowerCase() : null;
    })
    .filter(Boolean);
  const literalFamilies = (css.match(/font-family:\s*([^;]+);/g) || [])
    .map(decl => decl.replace(/font-family:\s*/, '').replace(/;$/, '').trim().toLowerCase())
    .filter(value => value !== 'inherit' && !value.includes('var(--font-'));
  const families = [...new Set([...tokenStacks, ...literalFamilies])].sort();
  const sizes = [...new Set((css.match(/font-size:\s*([0-9.]+)px/g) || [])
    .map(decl => parseFloat(decl.replace(/[^0-9.]/g, ''))))].sort((a, b) => a - b);

  const counts = {
    emoji: emoji.count,
    legacyCurrency: legacyCurrency.count,
    gradients,
    coloredShadows,
    fontFamilies: families.length,
    fontSizes: sizes.length
  };

  console.log('====================================================');
  console.log(' 🧱 ANTI-AI-SLOP LINT');
  console.log('====================================================');

  const hardFailures = [];
  const print = (label, value, budget, hard) => {
    const ok = hard ? value === budget : value <= budget;
    console.log(` ${ok ? '✅' : '❌'} ${label.padEnd(18)} ${String(value).padStart(4)} / budget ${String(budget).padStart(4)}`);
    if (!ok) hardFailures.push(label);
  };

  if (update) {
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(counts, null, 2)}\n`);
    console.log('[slop] Baseline written → tools/anti-slop-baseline.json');
    for (const [key, value] of Object.entries(counts)) console.log(`  ${key}: ${value}`);
    return;
  }

  const baseline = fs.existsSync(BASELINE_PATH)
    ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
    : counts;

  print('emoji', counts.emoji, 0, true);
  print('legacyCurrency', counts.legacyCurrency, 0, true);
  print('gradients', counts.gradients, 0, true);
  print('coloredShadows', counts.coloredShadows, 0, true);
  print('fontFamilies', counts.fontFamilies, 2, true);
  print('fontSizes', counts.fontSizes, Number(baseline.fontSizes ?? counts.fontSizes), false);
  console.log(` ℹ️  families: ${families.join(' | ') || '—'}`);

  if (emoji.count > 0) {
    console.log('\n[slop] Emoji offenders:');
    for (const line of emoji.offenders) console.log(`   ${line}`);
  }

  if (legacyCurrency.count > 0) {
    console.log('\n[slop] Legacy currency unit (use "Quan"/"quan"):');
    for (const line of legacyCurrency.offenders.slice(0, 20)) console.log(`   ${line}`);
  }

  if (hardFailures.length > 0) {
    console.error(`\n[slop] FAILED: ${hardFailures.join(', ')}`);
    process.exit(1);
  }
  if (counts.fontSizes < Number(baseline.fontSizes ?? counts.fontSizes)) {
    console.log('\n[slop] Size scale shrank — run with --update-baseline to lock it in.');
  }
  console.log('[slop] PASSED: no anti-slop violations.');
}

main();
