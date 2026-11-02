/**
 * Runtime schema contract: a fresh `schema.sql + all migrations` database must
 * contain the tables and columns the services actually use, not create them
 * lazily on first request.
 */

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-schema-contract-'));
const TEST_DB = path.join(TMP, 'session.db');

const REQUIRED_TABLES = [
  'character_equipment',
  'family_lineage',
  'family_spouses',
  'family_children',
  'family_genealogy_tree',
  'family_mentorship_logs',
  'family_ancestors_archive',
  'financial_loans',
  'military_expeditions',
  'npc_intel_fog',
  'session_duels',
  'conditions',
  'obligations',
  'contract_offers',
  'player_contracts',
  'intel_reports',
  'master_crops',
  'land_parcels',
  'location_sublocations',
  'faction_ledger',
  'settlement_ledger',
  'player_life_state',
  'resource_node_rules',
  'gathering_node_state',
  'resource_yield_variants',
  'tool_rules',
  'character_tool_uses',
  'player_stalls',
  'stall_listings',
  'stall_sales',
  'npc_market_offers',
  'npc_market_sales',
  'npc_trade_preferences',
  'warehouses',
  'warehouse_stock',
  'freight_contracts',
  'freight_shipments',
  'merchant_routes',
  'merchant_shipments',
  'merchant_events',
  'merchant_day_ledger',
  'world_day_ledger',
  'npc_ledger',
  'merchant_route_stock',
  'settlement_item_endowment',
  'settlement_consumption',
  'settlement_consumption_log'
];

const REQUIRED_COLUMNS: Record<string, string[]> = {
  businesses: ['tier', 'debt', 'business_type', 'owner_character_id', 'daily_revenue', 'accumulated_profit'],
  npc_state: ['int_exp', 'war_exp', 'ldr_exp', 'pol_exp', 'dip_exp', 'com_exp', 'log_exp', 'cra_exp'],
  player_life_state: ['stress', 'last_meal_date', 'last_rest_date', 'last_upkeep_month', 'routine_streak'],
  player_state: ['current_sub_location'],
  location_sublocations: ['map_scope', 'local_x', 'local_y', 'icon_key', 'scene_key'],
  master_crops: ['skill_code', 'rotation_group', 'soil_impact'],
  land_parcels: ['last_crop_code'],
  resource_node_rules: ['restore_item_code', 'restore_cash', 'restore_stock', 'restore_skill_code', 'alternate_tool_code'],
  tool_rules: ['repair_cash', 'repair_skill_code', 'repair_min_tier'],
  stall_listings: ['source_type', 'warehouse_id', 'market_effect'],
  master_items: ['shelf_life_days', 'spoil_rate_per_day', 'preserve_skill_code', 'preserve_min_tier'],
  freight_shipments: ['initial_quantity', 'total_days', 'spoiled_quantity', 'source_reserved_quantity', 'insured', 'insurance_premium', 'insurance_claim', 'ambush_loss_quantity', 'ambush_resolved'],
  merchant_shipments: ['initial_quantity', 'total_days', 'spoiled_quantity', 'ambush_loss_quantity', 'ambush_resolved'],
  merchant_route_stock: ['route_id', 'warehouse_id', 'item_code', 'quantity']
};

function buildFresh(): Database.Database {
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = DELETE');
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema.sql'), 'utf8'));
  db.exec(fs.readFileSync(path.join(ROOT, 'tools', 'schema-master.sql'), 'utf8'));
  const migrationsDir = path.join(ROOT, 'tools', 'migrations');
  for (const file of fs.readdirSync(migrationsDir).filter(name => /^\d{3}-.+\.js$/.test(name)).sort()) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(path.join(migrationsDir, file)).up(db);
  }
  return db;
}

function run(): void {
  console.log('=== Runtime schema contract ===');
  const db = buildFresh();

  const tables = new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table';").all().map((row: any) => row.name)
  );
  for (const table of REQUIRED_TABLES) {
    assert(tables.has(table), `fresh schema is missing runtime table ${table}`);
  }

  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const actual = new Set(
      db.prepare(`PRAGMA table_info(${table});`).all().map((row: any) => row.name)
    );
    for (const column of columns) {
      assert(actual.has(column), `fresh schema is missing ${table}.${column}`);
    }
  }

  db.close();
  console.log(`  ✅ PASSED: ${REQUIRED_TABLES.length} runtime tables and required columns exist after schema + migrations.`);
}

function cleanup(): void {
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch { /* Windows keeps the handle briefly */ }
}

try {
  run();
  cleanup();
  console.log('✅ Runtime schema contract verified.');
} catch (error) {
  console.error(error);
  cleanup();
  process.exit(1);
}
