/**
 * ThreeKingdoms-AgentEngine: Live Map Contract Verification
 * (tests/verify-map-live-contracts.ts)
 *
 * Ensures every dynamic campaign entity can be placed on the 20-node map.
 * A caravan, expedition, bandit lair or active crisis that points at an
 * unmapped settlement would silently disappear from the map; this gate fails
 * the build instead.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { mapLiveService } from '../src/client/features/world-map/map-live.service';

const ROOT_DIR = path.resolve(__dirname, '..');
const SESSION_DB_PATH = process.env.SIM_DB_PATH || path.join(ROOT_DIR, 'saves', 'session.db');

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function readMapNodeIds(): Set<string> {
  const source = fs.readFileSync(path.join(ROOT_DIR, 'public', 'js', 'map-data.js'), 'utf8');
  const block = source.match(/const SETTLEMENT_LABELS = \{([\s\S]*?)\n\};/);
  assert(!!block, 'SETTLEMENT_LABELS block must exist in map-data.js');

  const ids = [...block![1].matchAll(/^\s{2}([a-z_]+):\s*\{/gm)].map(match => match[1]);
  assert(ids.length >= 20, `Expected at least 20 settlement labels, found ${ids.length}`);

  // wu_wei is a database alias, not a rendered node.
  return new Set(ids.filter(id => id !== 'wu_wei'));
}

async function runMapLiveContractVerification(): Promise<void> {
  console.log('====================================================');
  console.log(' 🗺️  VERIFYING LIVE MAP CONTRACTS');
  console.log('====================================================\n');

  const mapNodeIds = readMapNodeIds();
  console.log(`Rendered map nodes: ${mapNodeIds.size}`);

  const db = new Database(SESSION_DB_PATH, { readonly: true });
  const checks: Array<{ label: string; ids: string[] }> = [];

  const settlements = db.prepare('SELECT settlement_id FROM session_settlements;').all() as Array<{ settlement_id: string }>;
  checks.push({ label: 'session_settlements', ids: settlements.map(row => row.settlement_id) });

  const caravans = db.prepare('SELECT from_settlement_id, to_settlement_id FROM trade_caravans;').all() as Array<{
    from_settlement_id: string;
    to_settlement_id: string;
  }>;
  checks.push({
    label: 'trade_caravans',
    ids: caravans.flatMap(row => [row.from_settlement_id, row.to_settlement_id]).filter(Boolean)
  });

  const expeditions = db.prepare('SELECT origin_settlement_id, target_settlement_id FROM military_expeditions;').all() as Array<{
    origin_settlement_id: string;
    target_settlement_id: string;
  }>;
  checks.push({
    label: 'military_expeditions',
    ids: expeditions.flatMap(row => [row.origin_settlement_id, row.target_settlement_id]).filter(Boolean)
  });

  const strongholds = db.prepare("SELECT location_near FROM bandit_strongholds WHERE status = 'ACTIVE';").all() as Array<{
    location_near: string;
  }>;
  checks.push({
    label: 'bandit_strongholds',
    ids: strongholds.map(row => row.location_near).filter(Boolean)
  });

  const crises = db.prepare('SELECT settlement_id FROM regional_ecological_crises WHERE is_active = 1;').all() as Array<{
    settlement_id: string;
  }>;
  checks.push({
    label: 'regional_ecological_crises',
    ids: crises.map(row => row.settlement_id).filter(Boolean)
  });

  const gatheringNodes = db.prepare('SELECT settlement_id FROM gathering_nodes;').all() as Array<{
    settlement_id: string;
  }>;
  checks.push({
    label: 'gathering_nodes',
    ids: gatheringNodes.map(row => row.settlement_id).filter(Boolean)
  });

  // A7 prerequisite: every master_route endpoint must exist in master_locations
  // before LOC ids can be bridged to settlement/map node ids.
  const locationRows = db.prepare('SELECT location_id FROM master_locations;').all() as Array<{ location_id: string }>;
  const locationIds = new Set(locationRows.map(row => row.location_id));
  const routeRows = db.prepare('SELECT source_location_id, target_location_id FROM master_routes;').all() as Array<{
    source_location_id: string;
    target_location_id: string;
  }>;
  const orphanRoutes = routeRows.filter(
    row => !locationIds.has(row.source_location_id) || !locationIds.has(row.target_location_id)
  );
  console.log(`  master_locations: ${locationIds.size} LOC ids`);
  console.log(`  master_routes: ${routeRows.length} references, ${orphanRoutes.length} orphan LOC(s)`);
  assert(orphanRoutes.length === 0, 'Every master_route endpoint must exist in master_locations.');

  const orphans: string[] = [];
  for (const check of checks) {
    const unresolved = [...new Set(check.ids)]
      .map(id => ({ id, mapped: mapLiveService.resolveMapNodeId(id) }))
      .filter(entry => !mapNodeIds.has(entry.mapped));

    console.log(`  ${check.label}: ${check.ids.length} references, ${unresolved.length} orphan(s)`);
    unresolved.forEach(entry => {
      console.log(`    ❌ ${entry.id} → ${entry.mapped}`);
      orphans.push(`${check.label}:${entry.id}→${entry.mapped}`);
    });
  }

  assert(orphans.length === 0, `Dynamic map entities must resolve to a rendered node: ${orphans.join(', ')}`);

  console.log('\n  ✅ All dynamic entities resolve to a rendered map node.');
}

runMapLiveContractVerification().catch(error => {
  console.error('[map-live-contracts] FAILED:', error.message);
  process.exit(1);
});
