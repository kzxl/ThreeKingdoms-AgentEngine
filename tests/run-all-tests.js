#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Central Test Runner (tests/run-all-tests.js)
 * Executes the complete validation suite across all modules.
 */

const { execSync } = require('child_process');
const path = require('path');

const testFiles = [
  'test-audit.js',
  'test-core-actions.js',
  'test-reproducibility.js',
  'test-npc-ai.js'
];

console.log('====================================================');
console.log(' 🚀 RUNNING FULL THREE-KINGDOMS ENGINE TEST SUITE');
console.log('====================================================\n');

let passedCount = 0;

for (const tf of testFiles) {
  const filePath = path.join(__dirname, tf);
  console.log(`>>> Executing: ${tf}...`);
  try {
    execSync(`node "${filePath}"`, { stdio: 'inherit' });
    passedCount++;
  } catch (err) {
    console.error(`\n❌ TEST SUITE FAILED AT: ${tf}`);
    process.exit(1);
  }
}

console.log('\n====================================================');
console.log(` 🏆 ALL TEST SUITES PASSED (${passedCount}/${testFiles.length})`);
console.log('====================================================\n');
