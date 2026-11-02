/**
 * Freight demand follows essential consumption, not only static deficits.
 * A fish-consuming inland town must post a fish contract when a fishing town
 * has stock, even though fish is not in its `deficitItems` list.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/core/database';
import { FreightService } from '../src/modules/market/freight.service';
import { SettlementMarketService } from '../src/modules/economy/settlement-market.service';
import { SETTLEMENT_PROFILES } from '../src/modules/economy/regional-market.service';
import { LOC_TO_NODE_MAP } from '../src/modules/ecology-logistics/spatial-registry';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-freight-demand-'));
const TEST_DB = path.join(TMP, 'session.db');
const ITEM = 'COM-FISH-FRESH';
const DATE = '185-06-01';

function seed(db: Database.Database): void {
  fs.copyFileSync(SOURCE_DB, TEST_DB);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${SOURCE_DB}${suffix}`)) fs.copyFileSync(`${SOURCE_DB}${suffix}`, `${TEST_DB}${suffix}`);
  }
  db.pragma('journal_mode = DELETE');
  db.prepare(`
    UPDATE campaign_meta
    SET status = 'ACTIVE', "current_date" = ?, active_turn = 16, current_phase = 0
    WHERE campaign_id = (SELECT campaign_id FROM campaign_meta LIMIT 1);
  `).run(DATE);
  db.prepare(`
    UPDATE player_state SET liquid_cash = 100000, safe_cash = 0, fatigue = 0, health = 100,
      current_location = 'LOC-0001'
    WHERE player_id = 'PLY-0001';
  `).run();
  db.prepare('DELETE FROM freight_contracts;').run();
  db.prepare('DELETE FROM freight_shipments;').run();
  db.prepare("DELETE FROM world_day_ledger WHERE system = 'freight';").run();
}

function run(): void {
  console.log('=== Freight demand from consumption ===');
  const rawDb = new Database(TEST_DB);
  seed(rawDb);

  const demandRows = rawDb.prepare(
    `SELECT settlement_id, monthly_demand FROM settlement_consumption
     WHERE item_code = ? AND monthly_demand > 0
     ORDER BY monthly_demand DESC;`
  ).all(ITEM) as Array<{ settlement_id: string; monthly_demand: number }>;
  const destination = demandRows.find(row => {
    if (!SETTLEMENT_PROFILES[row.settlement_id]) return false;
    return Object.values(LOC_TO_NODE_MAP).includes(row.settlement_id);
  });
  assert(destination, 'a fish-consuming settlement with a map node is required');

  const sourceRows = rawDb.prepare(
    `SELECT settlement_id, supply_score FROM settlement_item_endowment
     WHERE item_code = ? AND settlement_id <> ? AND supply_score > 0
     ORDER BY supply_score DESC;`
  ).all(ITEM, destination!.settlement_id) as Array<{ settlement_id: string }>;
  const source = sourceRows.find(row => Boolean(SETTLEMENT_PROFILES[row.settlement_id]));
  assert(source, 'a fish-rich source settlement is required');

  // Make fish the dominant demand so the contract generator reaches it first.
  rawDb.prepare(
    'UPDATE settlement_consumption SET monthly_demand = 0 WHERE settlement_id = ? AND item_code <> ?;'
  ).run(destination!.settlement_id, ITEM);
  rawDb.prepare(
    'UPDATE settlement_consumption SET monthly_demand = 9999 WHERE settlement_id = ? AND item_code = ?;'
  ).run(destination!.settlement_id, ITEM);

  const locations = Object.entries(LOC_TO_NODE_MAP)
    .filter(([, node]) => node === destination!.settlement_id)
    .map(([location]) => location);
  assert(locations.length > 0, 'destination must have a location');
  const placeholders = locations.map(() => '?').join(',');
  const issuer = rawDb.prepare(
    `SELECT npc_id FROM master_characters WHERE baseline_location IN (${placeholders}) LIMIT 1;`
  ).get(...locations) as { npc_id: string } | undefined;
  assert(issuer, 'destination must have an NPC issuer');
  rawDb.prepare(
    `INSERT INTO npc_personal_progression (npc_id, personal_cash)
     VALUES (?, 100000)
     ON CONFLICT(npc_id) DO UPDATE SET personal_cash = 100000;`
  ).run(issuer!.npc_id);
  rawDb.close();

  DatabaseService.resetInstance();
  const db = DatabaseService.getInstance(TEST_DB);
  const freight = FreightService.forDatabase(db);
  const market = SettlementMarketService.forDatabase(db);
  market.getState(source!.settlement_id, ITEM);
  db.execute(
    'UPDATE settlement_market_state SET stock = 200, demand = 100 WHERE settlement_id = ? AND item_code = ?;',
    [source!.settlement_id, ITEM]
  );

  const contracts = freight.listContracts(destination!.settlement_id, DATE);
  const fish = contracts.find(contract => contract.itemCode === ITEM);
  assert(fish, `a fish contract must be posted for ${destination!.settlement_id}`);
  assert.strictEqual(fish.fromSettlementId, source!.settlement_id);
  assert(fish.quantity >= 5);

  db.close();
  DatabaseService.resetInstance();
  console.log('  ✅ PASSED: consumption demand generates fish freight contracts.');
}

function cleanup(): void {
  try {
    DatabaseService.resetInstance();
  } catch { /* already closed */ }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

try {
  run();
  cleanup();
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
