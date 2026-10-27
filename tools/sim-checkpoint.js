#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Autonomous Checkpoint & State Archiver
 * Verifies integrity via sim-audit.js, generates SNAP-xxxx snapshot, updates latest.md, and creates git safe commit.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const GAME_DIR = path.join(ROOT_DIR, 'game');
const SAVES_DIR = path.join(GAME_DIR, 'saves');
const SNAPSHOTS_DIR = path.join(SAVES_DIR, 'snapshots');
const LATEST_PATH = path.join(SAVES_DIR, 'latest.md');
const PROGRESS_PATH = path.join(GAME_DIR, 'PROGRESS.md');

function runAudit() {
  console.log('[CHECKPOINT] Running pre-save integrity audit...');
  try {
    execSync(`node "${path.join(__dirname, 'sim-audit.js')}"`, { stdio: 'inherit' });
    return true;
  } catch (err) {
    console.error('[CHECKPOINT] Audit failed! Aborting checkpoint.');
    return false;
  }
}

function getNextSnapshotId() {
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SNAPSHOTS_DIR);
  let maxIdx = 0;
  for (const f of files) {
    const match = f.match(/^SNAP-([0-9]{4})\.md$/i);
    if (match) {
      const idx = parseInt(match[1], 10);
      if (idx > maxIdx) maxIdx = idx;
    }
  }

  const nextIdx = maxIdx + 1;
  return `SNAP-${String(nextIdx).padStart(4, '0')}`;
}

function parseProgressHeader() {
  if (!fs.existsSync(PROGRESS_PATH)) {
    throw new Error(`PROGRESS.md not found at ${PROGRESS_PATH}`);
  }

  const content = fs.readFileSync(PROGRESS_PATH, 'utf8');

  const dateMatch = content.match(/\*\*Current In-Game Date\*\*\s*\|\s*\*\*([^*]+)\*\*/i);
  const turnMatch = content.match(/\*\*Active Turn\*\*\s*\|\s*\*\*([^*]+)\*\*/i);
  const locationMatch = content.match(/\*\*Current Location\*\*\s*\|\s*([^\r\n|]+)/i) ||
                        content.match(/\*\*Location\*\*\s*\|\s*([^\r\n|]+)/i);
  const cashMatch = content.match(/\*\*Liquid Capital\*\*\s*\|\s*\*\*([0-9,]+)\s*Qian\*\*/i);
  const netWorthMatch = content.match(/\*\*Total Net Worth\*\*\s*\|\s*\*\*([0-9,]+)\s*Qian\*\*/i);

  return {
    gameDate: dateMatch ? dateMatch[1].trim() : 'Year 184 AD',
    turnDesc: turnMatch ? turnMatch[1].trim() : 'Active Turn',
    location: locationMatch ? locationMatch[1].trim() : 'Zhuo County',
    liquidCash: cashMatch ? cashMatch[1].trim() : '0',
    netWorth: netWorthMatch ? netWorthMatch[1].trim() : '0'
  };
}

function createSnapshot(snapshotId, metadata, note) {
  const snapPath = path.join(SNAPSHOTS_DIR, `${snapshotId}.md`);
  const now = new Date().toISOString().split('T')[0];

  const content = `# State Snapshot: ${snapshotId} (saves/snapshots/${snapshotId}.md)

## Snapshot Metadata
- **Snapshot ID**: \`${snapshotId}\`
- **Game Time**: ${metadata.gameDate}
- **Real-Time Timestamp**: ${now}
- **Engine Rules Version**: v1.0.2 (Optimized 3-Tier Architecture)
- **Turn Context**: ${metadata.turnDesc}
- **Checkpoint Note**: ${note || 'Automated verified state snapshot'}

---

## Verified Register State
- **Protagonist**: Liang Yan (\`player\`), Age 21
- **Current Location**: ${metadata.location}
- **Liquid Capital**: **${metadata.liquidCash} Qian**
- **Total Net Worth**: **${metadata.netWorth} Qian**
- **Audit Verification**: Passed via \`tools/sim-audit.js\` (0 discrepancy)

---

## State References
- Primary Hot Buffer: \`game/PROGRESS.md\`
- Financial Ledger: \`game/ledger/cashflow.md\`
- Physical Inventory: \`game/ledger/inventory.md\`
- Enterprise Sheet: \`game/businesses/BIZ-0001.md\`
`;

  fs.writeFileSync(snapPath, content, 'utf8');
  console.log(`[CHECKPOINT] Created snapshot: ${snapPath}`);

  // Update latest.md
  const latestContent = `# Simulation Checkpoint: Latest (saves/latest.md)

## Checkpoint Metadata
- **Snapshot ID**: \`${snapshotId}\`
- **Game Time**: ${metadata.gameDate}
- **Real-Time Timestamp**: ${now}
- **Engine Rules Version**: v1.0.2 (Optimized 3-Tier Architecture)
- **Turn Context**: ${metadata.turnDesc}

---

## State Summary
- **Protagonist**: Liang Yan (\`player\`), Age 21
- **Current Location**: ${metadata.location}
- **Liquid Capital**: **${metadata.liquidCash} Qian**
- **Total Net Worth**: **${metadata.netWorth} Qian**
- **Primary Business**: Liang Clan Workshop (\`BIZ-0001\`)

---

## Data Integrity Status
- Audit Status: **PASSED** (Reconciled via \`tools/sim-audit.js\`)
- Pending Transactions: 0
- Unresolved Discrepancies: 0
`;

  fs.writeFileSync(LATEST_PATH, latestContent, 'utf8');
  console.log(`[CHECKPOINT] Updated latest checkpoint: ${LATEST_PATH}`);

  return snapPath;
}

function main() {
  const args = process.argv.slice(2);
  const note = args.find(a => !a.startsWith('--')) || 'Turn state snapshot';
  const shouldCommit = args.includes('--commit');
  const shouldPush = args.includes('--push');

  if (!runAudit()) {
    process.exit(1);
  }

  const metadata = parseProgressHeader();
  const snapshotId = getNextSnapshotId();
  const snapPath = createSnapshot(snapshotId, metadata, note);

  console.log(`\n✅ State checkpoint completed successfully: [${snapshotId}]`);

  if (shouldCommit) {
    const commitMsg = `checkpoint(${snapshotId}): ${metadata.gameDate} - ${note}`;
    console.log(`\n[GIT] Creating local git commit: "${commitMsg}"...`);
    try {
      execSync(`git add "${snapPath}" "${LATEST_PATH}" && git commit -m "${commitMsg}"`, { stdio: 'inherit' });
      if (shouldPush) {
        console.log(`[GIT] Push requested: Pushing to origin main...`);
        execSync(`git push origin main`, { stdio: 'inherit' });
      }
    } catch (e) {
      console.error(`[GIT] Commit error: ${e.message}`);
    }
  }
}

main();
