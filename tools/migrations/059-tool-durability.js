/**
 * Migration 059: tool durability and crafting.
 *
 * Nets and traps are consumables (one use). Axes, picks, hoes and bows have
 * durability. `character_tool_uses` stores the remaining uses of durable tools;
 * consumables simply decrement inventory quantity.
 *
 * Recipes let the player make every tool from timber, fibre, twine and iron.
 */

const ITEMS = [
  { code: 'TOOL-TRAP', vi: 'Bẫy Thú Sơn Lâm', en: 'Hunting Trap', price: 40, weight: 2 }
];

const TOOL_RULES = [
  { code: 'TOOL-NET', kind: 'CONSUMABLE', uses: 1, skill: 'SKL-CRA-WEAVE', tier: 1, notes: 'Lưới rách sau một mẻ.' },
  { code: 'TOOL-TRAP', kind: 'CONSUMABLE', uses: 1, skill: 'SKL-WILD-SURVIVAL', tier: 1, notes: 'Bẫy hỏng sau khi bắt thú.' },
  { code: 'TOOL-AXE', kind: 'DURABLE', uses: 20, skill: 'SKL-CRA-SMITH', tier: 1, notes: 'Rìu mòn dần theo số lần đốn.' },
  { code: 'TOOL-PICK', kind: 'DURABLE', uses: 20, skill: 'SKL-CRA-SMITH', tier: 1, notes: 'Cuốc chim mòn theo quặng.' },
  { code: 'TOOL-HOE', kind: 'DURABLE', uses: 15, skill: 'SKL-CRA-SMITH', tier: 1, notes: 'Cuốc nông cụ mòn theo vụ.' },
  { code: 'TOOL-BOW', kind: 'DURABLE', uses: 25, skill: 'SKL-CRA-WEAVE', tier: 1, notes: 'Cung mất dây sau nhiều phát.' }
];

const RECIPES = [
  {
    code: 'REC-TOOL-NET', product: 'TOOL-NET', nameVi: 'Đan Lưới Đánh Cá', nameEn: 'Weave a Fishing Net',
    category: 'CRAFTING', hours: 3, defect: 0.04, skill: 'SKL-CRA-WEAVE', tier: 1,
    bom: [{ item: 'RAW-REED-FIBER', qty: 2 }, { item: 'COM-TWINE', qty: 1 }],
    desc: 'Bện sợi lác và chỉ gai thành lưới đánh cá.'
  },
  {
    code: 'REC-TOOL-TRAP', product: 'TOOL-TRAP', nameVi: 'Đóng Bẫy Thú', nameEn: 'Build a Hunting Trap',
    category: 'CRAFTING', hours: 3, defect: 0.05, skill: 'SKL-WILD-SURVIVAL', tier: 1,
    bom: [{ item: 'RAW-TIMBER-OAK', qty: 1 }, { item: 'COM-TWINE', qty: 1 }],
    desc: 'Đóng bẫy gỗ và dây gai để bắt thú rừng.'
  },
  {
    code: 'REC-TOOL-AXE', product: 'TOOL-AXE', nameVi: 'Rèn Rìu Tiều Phu', nameEn: 'Forge a Woodcutter Axe',
    category: 'SMITHING', hours: 4, defect: 0.05, skill: 'SKL-CRA-SMITH', tier: 1,
    bom: [{ item: 'COM-IRON', qty: 1 }, { item: 'RAW-TIMBER-OAK', qty: 1 }],
    desc: 'Rèn lưỡi rìu sắt, tra cán gỗ sồi.'
  },
  {
    code: 'REC-TOOL-PICK', product: 'TOOL-PICK', nameVi: 'Rèn Cuốc Chim Khai Mỏ', nameEn: 'Forge a Mining Pick',
    category: 'SMITHING', hours: 4, defect: 0.05, skill: 'SKL-CRA-SMITH', tier: 1,
    bom: [{ item: 'COM-IRON', qty: 2 }, { item: 'RAW-TIMBER-OAK', qty: 1 }],
    desc: 'Rèn đầu cuốc chim hai lưỡi, tra cán dài.'
  },
  {
    code: 'REC-TOOL-HOE', product: 'TOOL-HOE', nameVi: 'Rèn Cuốc Nông Cụ', nameEn: 'Forge a Farming Hoe',
    category: 'SMITHING', hours: 3, defect: 0.04, skill: 'SKL-CRA-SMITH', tier: 1,
    bom: [{ item: 'COM-IRON', qty: 1 }, { item: 'RAW-TIMBER-OAK', qty: 1 }],
    desc: 'Rèn lưỡi cuốc nhỏ, tra cán ngắn cho nhà nông.'
  },
  {
    code: 'REC-TOOL-BOW', product: 'TOOL-BOW', nameVi: 'Làm Cung Săn', nameEn: 'Make a Hunting Bow',
    category: 'CRAFTING', hours: 4, defect: 0.05, skill: 'SKL-CRA-WEAVE', tier: 1,
    bom: [{ item: 'RAW-TIMBER-OAK', qty: 2 }, { item: 'RAW-REED-FIBER', qty: 2 }],
    desc: 'Uốn cung gỗ sồi, bện dây gân và sợi gai.'
  }
];

module.exports = {
  id: '059-tool-durability',
  description: 'Add consumable nets/traps, durable tools and tool recipes',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tool_rules (
        item_code TEXT PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('CONSUMABLE','DURABLE')),
        max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
        craft_skill_code TEXT,
        craft_skill_tier INTEGER NOT NULL DEFAULT 1,
        notes_vi TEXT
      );

      CREATE TABLE IF NOT EXISTS character_tool_uses (
        character_id TEXT NOT NULL,
        item_code TEXT NOT NULL,
        uses_left INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (character_id, item_code)
      );
    `);

    const hasItems = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_items'"
    ).get();
    if (hasItems) {
      const insertItem = db.prepare(`
        INSERT OR IGNORE INTO master_items
          (item_code, name_vi, name_en, category, unit_vi, unit_en,
           baseline_peace_price, current_market_price, weight_kg, description_vi, description_en)
        VALUES (?, ?, ?, 'TOOL', 'Cái', 'piece', ?, ?, ?, ?, ?);
      `);
      for (const item of ITEMS) {
        insertItem.run(
          item.code, item.vi, item.en, item.price, item.price, item.weight,
          `Công cụ lao động: ${item.vi}.`,
          `Work tool: ${item.en}.`
        );
      }
    }

    const insertTool = db.prepare(`
      INSERT OR IGNORE INTO tool_rules
        (item_code, kind, max_uses, craft_skill_code, craft_skill_tier, notes_vi)
      VALUES (?, ?, ?, ?, ?, ?);
    `);
    for (const rule of TOOL_RULES) {
      insertTool.run(rule.code, rule.kind, rule.uses, rule.skill, rule.tier, rule.notes);
    }

    // Hunting now needs a trap; the bow remains a durable future weapon tool.
    const hasNodeRules = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='resource_node_rules'"
    ).get();
    if (hasNodeRules) {
      db.prepare("UPDATE resource_node_rules SET required_tool_code = 'TOOL-TRAP' WHERE resource_type = 'GAME';").run();
    }

    const hasRecipes = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_recipes'"
    ).get();
    if (hasRecipes) {
      const insertRecipe = db.prepare(`
        INSERT OR IGNORE INTO master_recipes
          (recipe_code, product_item_code, product_name_vi, product_name_en, category,
           standard_labor_hours, base_defect_rate, required_skill_code, required_skill_tier,
           bom_inputs, description_vi)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const recipe of RECIPES) {
        insertRecipe.run(
          recipe.code, recipe.product, recipe.nameVi, recipe.nameEn, recipe.category,
          recipe.hours, recipe.defect, recipe.skill, recipe.tier,
          JSON.stringify(recipe.bom.map(row => ({ item_code: row.item, quantity: row.qty, unit: 'phần' }))),
          recipe.desc
        );
      }
    }

    console.log(`      ${TOOL_RULES.length} tool rules and ${RECIPES.length} tool recipes seeded`);
  }
};
