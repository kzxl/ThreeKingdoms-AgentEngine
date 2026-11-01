/**
 * Migration 079: fishing boats as a durable tool.
 *
 * `SKL-FISH-BOAT` already existed but had no item. The boat is a durable
 * alternate for FISH nodes, so a fisher without a net can still work open water.
 */

module.exports = {
  id: '079-tool-boat',
  description: 'Add the durable fishing boat and its recipe',
  up(db) {
    const hasItems = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_items'"
    ).get();
    if (hasItems) {
      db.prepare(`
        INSERT OR IGNORE INTO master_items
          (item_code, name_vi, name_en, category, unit_vi, unit_en,
           baseline_peace_price, current_market_price, weight_kg, description_vi, description_en)
        VALUES ('TOOL-BOAT', 'Thuyền Câu Cá', 'Fishing Boat', 'TOOL', 'Chiếc', 'boat',
          180, 180, 8, 'Thuyền gỗ nhỏ cho ngư dân ra vùng nước gần bờ.', 'A small wooden boat for near-shore fishing.');
      `).run();
    }

    const hasToolRules = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='tool_rules'"
    ).get();
    if (hasToolRules) {
      db.prepare(`
        INSERT OR IGNORE INTO tool_rules
          (item_code, kind, max_uses, craft_skill_code, craft_skill_tier, notes_vi)
        VALUES ('TOOL-BOAT', 'DURABLE', 30, 'SKL-FISH-BOAT', 1, 'Thuyền mòn theo số chuyến ra khơi.');
      `).run();
    }

    const hasRecipes = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_recipes'"
    ).get();
    if (hasRecipes) {
      db.prepare(`
        INSERT OR IGNORE INTO master_recipes
          (recipe_code, product_item_code, product_name_vi, product_name_en, category,
           standard_labor_hours, base_defect_rate, required_skill_code, required_skill_tier,
           bom_inputs, description_vi)
        VALUES ('REC-TOOL-BOAT', 'TOOL-BOAT', 'Đóng Thuyền Câu', 'Build a Fishing Boat',
          'CRAFTING', 6, 0.06, 'SKL-FISH-BOAT', 1, ?, 'Ghép ván sồi và chèn chỉ gai làm thuyền nhỏ.');
      `).run(JSON.stringify([
        { item_code: 'RAW-TIMBER-OAK', quantity: 4, unit: 'phần' },
        { item_code: 'COM-TWINE', quantity: 3, unit: 'phần' }
      ]));
    }

    const hasNodeRules = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='resource_node_rules'"
    ).get();
    if (hasNodeRules) {
      db.prepare(
        "UPDATE resource_node_rules SET alternate_tool_code = 'TOOL-BOAT' WHERE resource_type = 'FISH' AND alternate_tool_code IS NULL;"
      ).run();
    }
  }
};
