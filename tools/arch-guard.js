#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Architecture Guard (tools/arch-guard.js)
 *
 * Zero-dependency, ratcheting architecture linter. It counts violations of the
 * engine's non-negotiable rules and compares them against a checked-in baseline
 * (tools/arch-baseline.json). A rule may only shrink: any increase fails the
 * build, so refactors cannot silently reintroduce the patterns they removed.
 *
 * Usage:
 *   node tools/arch-guard.js                  # verify against baseline
 *   node tools/arch-guard.js --update-baseline
 *   node tools/arch-guard.js --verbose
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(__dirname, 'arch-baseline.json');
const SCAN_EXTENSIONS = new Set(['.ts', '.js']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'public/dist', '.runs', '.git', 'saves', '.agents']);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || SKIP_DIRS.has(rel)) continue;
      walk(abs, files);
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      files.push({ abs, rel, source: fs.readFileSync(abs, 'utf8') });
    }
  }
  return files;
}

const SRC = walk(path.join(ROOT, 'src'));
const ENGINE = walk(path.join(ROOT, 'engine'));
const PUBLIC_JS = fs.existsSync(path.join(ROOT, 'public', 'js'))
  ? fs.readdirSync(path.join(ROOT, 'public', 'js')).filter(n => n.endsWith('.js'))
  : [];

function underSrc(rel) {
  return rel.startsWith('src/');
}

function countLines(files, predicate) {
  const hits = [];
  for (const file of files) {
    const lines = file.source.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (predicate(lines[i], file)) hits.push(`${file.rel}:${i + 1}`);
    }
  }
  return hits;
}

function extractTemplateLiterals(source) {
  const literals = [];
  const re = /`[^`\\]*(?:\\[\s\S][^`\\]*)*`/g;
  let match;
  while ((match = re.exec(source)) !== null) literals.push(match[0]);
  return literals;
}

const SQL_KEYWORD = /\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/i;

/**
 * Each rule returns an array of "file:line" evidence strings.
 * `budget` rules are compared against the baseline; `hard` rules must be zero.
 */
const RULES = [
  {
    id: 'sqlite-cli-spawn',
    description: 'No shelling out to the sqlite3 CLI from application code — use the in-process DatabaseService',
    severity: 'hard',
    run: () => countLines(SRC, line => /exec(Sync)?\(\s*`?\s*sqlite3\b/.test(line))
  },
  {
    id: 'child-process-in-src',
    description: 'src/ must not spawn child processes (projection sync belongs in an async scheduler)',
    severity: 'budget',
    run: () =>
      countLines(SRC, line => /(?:require\(|from\s+)['"]child_process['"]/.test(line))
  },
  {
    id: 'sql-interpolation',
    description: 'No ${} interpolation inside SQL statement literals — use bound parameters',
    severity: 'budget',
    run: () => {
      const hits = [];
      for (const file of ENGINE.concat(SRC)) {
        const lines = file.source.split(/\r?\n/);
        for (const literal of extractTemplateLiterals(file.source)) {
          if (SQL_KEYWORD.test(literal) && literal.includes('${')) {
            const anchor = file.source.slice(0, file.source.indexOf(literal)).split(/\r?\n/).length;
            // Allow an explicit, reviewed exemption on or just above the statement.
            const context = lines.slice(Math.max(0, anchor - 3), anchor).join('\n');
            if (context.includes('arch-guard:allow-sql-interpolation')) continue;
            hits.push(`${file.rel}:${anchor}`);
          }
        }
      }
      return hits.sort();
    }
  },
  {
    id: 'math-random-in-domain',
    description: 'Domain modules must use the seeded RNG, not Math.random()',
    severity: 'budget',
    run: () => countLines(SRC.filter(f => /^src\/(modules|shared)\//.test(f.rel)), line => /Math\.random\(/.test(line))
  },
  {
    id: 'wallclock-id-in-domain',
    description: 'Domain modules must use the ID generator, not Date.now() for persisted identifiers',
    severity: 'budget',
    run: () =>
      countLines(
        SRC.filter(f => /^src\/(modules|shared)\//.test(f.rel)),
        line => /Date\.now\(\)/.test(line)
      )
  },
  {
    id: 'silent-catch',
    description: 'Empty catch blocks hide state-corruption bugs',
    severity: 'budget',
    run: () => countLines(ENGINE.concat(SRC), line => /catch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(line))
  },
  {
    id: 'cashflow-direct-insert',
    description: 'Player cashflow must be posted through src/shared/ledger postCashflowEntry; direct INSERTs may only shrink',
    severity: 'budget',
    run: () =>
      countLines(
        SRC.filter(f => !/^src\/shared\/(ledger|financial-transaction)\.ts$/.test(f.rel)),
        line => /INSERT INTO cashflow_ledger/.test(line)
      )
  },
  {
    id: 'global-service-locator',
    description: 'Controllers must receive modules by injection, not via globalThis service locator',
    severity: 'budget',
    run: () => countLines(SRC, line => /globalThis\s+as\s+any/.test(line))
  },
  {
    id: 'unquoted-current-date',
    description: 'current_date is a SQLite keyword: reading the column must be quoted or table-qualified',
    severity: 'hard',
    run: () => {
      const hits = [];
      const skip = /SET\s+current_date|"current_date"|\.current_date|current_date\s*[:=]|current_date\s*\?:/;
      for (const file of ENGINE.concat(SRC)) {
        const lines = file.source.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line.includes('current_date')) continue;
          if (skip.test(line)) continue;
          if (!/SELECT|WHERE|campaign_meta/.test(line)) continue;
          hits.push(`${file.rel}:${i + 1}`);
        }
      }
      return hits;
    }
  },
  {
    id: 'legacy-ui-script-count',
    description: 'public/js is frozen: features migrate to TypeScript, the legacy file count may only shrink',
    severity: 'budget',
    run: () => PUBLIC_JS.map(name => `public/js/${name}`)
  }
];

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch (err) {
    console.error(`[arch-guard] Cannot parse baseline: ${err.message}`);
    process.exit(2);
  }
}

function writeBaseline(counts) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(counts, null, 2)}\n`, 'utf8');
}

function main() {
  const args = process.argv.slice(2);
  const update = args.includes('--update-baseline');
  const verbose = args.includes('--verbose');
  const baseline = loadBaseline();

  const counts = {};
  const failures = [];
  const improvements = [];
  let checked = 0;

  console.log('====================================================');
  console.log(' 🛡️  ARCHITECTURE GUARD — RATCHET VERIFICATION');
  console.log('====================================================\n');

  for (const rule of RULES) {
    const hits = rule.run();
    counts[rule.id] = hits.length;
    checked++;
    const allowed = baseline[rule.id] ?? 0;
    const delta = hits.length - allowed;

    let mark = '✅';
    if (rule.severity === 'hard' && hits.length > allowed) {
      mark = '❌';
      failures.push({ rule, hits, allowed });
    } else if (delta > 0) {
      mark = '❌';
      failures.push({ rule, hits, allowed });
    } else if (delta < 0) {
      mark = '⬇️ ';
      improvements.push({ rule, hits: hits.length, allowed });
    }

    console.log(
      ` ${mark} ${rule.id.padEnd(28)} ${String(hits.length).padStart(4)} / budget ${String(allowed).padStart(4)}`
    );
    if (verbose || mark === '❌') {
      for (const hit of hits.slice(0, verbose ? hits.length : 12)) console.log(`      ${hit}`);
      if (!verbose && hits.length > 12) console.log(`      … ${hits.length - 12} more`);
    }
  }

  console.log('');
  if (update) {
    writeBaseline(counts);
    console.log(`[arch-guard] Baseline updated (${Object.keys(counts).length} rules) → tools/arch-baseline.json`);
    return;
  }

  if (improvements.length > 0) {
    console.log('[arch-guard] Debt reduced — run `node tools/arch-guard.js --update-baseline` to lock it in:');
    for (const imp of improvements) {
      console.log(`   ${imp.rule.id}: ${imp.allowed} → ${imp.hits}`);
    }
  }

  if (failures.length > 0) {
    console.error(`\n[arch-guard] FAILED: ${failures.length} rule(s) exceeded budget.`);
    process.exit(1);
  }

  console.log(`[arch-guard] PASSED: ${checked} architecture rules within budget.`);
}

main();
