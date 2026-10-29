#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Client Syntax Gate (tools/client-syntax-check.js)
 *
 * The browser executes public/app.js and public/js/*.js as classic scripts: one
 * parse error disables the whole file, and the UI silently falls back to static
 * HTML. This gate parses every client script with the same rules (V8 classic
 * script) so a duplicate declaration cannot reach the page again.
 *
 * Usage: node tools/client-syntax-check.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const FILES = [];

function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(abs);
    else if (entry.name.endsWith('.js')) FILES.push(abs);
  }
}

function main() {
  collect(path.join(ROOT, 'public', 'js'));
  FILES.push(path.join(ROOT, 'public', 'app.js'));

  let failures = 0;
  for (const file of FILES) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    try {
      new vm.Script(fs.readFileSync(file, 'utf8'), { filename: rel });
    } catch (err) {
      failures++;
      console.error(` ❌ ${rel}: ${err.message}`);
    }
  }

  const total = FILES.length;
  if (failures > 0) {
    console.error(`\n[client-syntax] FAILED: ${failures}/${total} script(s) do not parse.`);
    process.exit(1);
  }
  console.log(`[client-syntax] OK: ${total} client scripts parse cleanly.`);
}

main();
