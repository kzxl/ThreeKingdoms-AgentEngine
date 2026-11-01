/**
 * Fishing boat: the durable TOOL-BOAT item, its tool rule, recipe and the FISH
 * alternate-tool binding must exist after migrations.
 */

import assert from 'assert';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DB = process.env.SIM_DB_PATH || path.join(ROOT, 'saves', 'session.db');

function run(): void {
  console.log('=== Fishing boat tool ===');
  const db = new Database(SOURCE_DB, { readonly: true });

  const item = db.prepare(
    "SELECT item_code, category, baseline_peace_price FROM master_items WHERE item_code = 'TOOL-BOAT';"
  ).get() as any;
  assert(item, 'TOOL-BOAT must exist in master_items');
  assert.strictEqual(item.category, 'TOOL');

  const rule = db.prepare(
    "SELECT kind, max_uses, craft_skill_code FROM tool_rules WHERE item_code = 'TOOL-BOAT';"
  ).get() as any;
  assert(rule, 'TOOL-BOAT must have a tool rule');
  assert.strictEqual(rule.kind, 'DURABLE');
  assert(Number(rule.max_uses) > 1);
  assert.strictEqual(rule.craft_skill_code, 'SKL-FISH-BOAT');

  const recipe = db.prepare(
    "SELECT product_item_code, required_skill_code, bom_inputs FROM master_recipes WHERE recipe_code = 'REC-TOOL-BOAT';"
  ).get() as any;
  assert(recipe, 'REC-TOOL-BOAT must exist');
  assert.strictEqual(recipe.product_item_code, 'TOOL-BOAT');
  assert.strictEqual(recipe.required_skill_code, 'SKL-FISH-BOAT');
  assert(JSON.parse(recipe.bom_inputs).length >= 2);

  const fishRule = db.prepare(
    "SELECT required_tool_code, alternate_tool_code FROM resource_node_rules WHERE resource_type = 'FISH';"
  ).get() as any;
  assert(fishRule, 'FISH node rule must exist');
  assert.strictEqual(fishRule.required_tool_code, 'TOOL-NET');
  assert.strictEqual(fishRule.alternate_tool_code, 'TOOL-BOAT');

  db.close();
  console.log('  ✅ PASSED: boat item, durability rule, recipe and FISH alternate.');
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}
