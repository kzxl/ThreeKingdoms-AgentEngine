/**
 * Migration 058: active resource restoration.
 *
 * Node stock already regrows passively. This migration adds an explicit
 * player action: buy fry/saplings/salt licks/seedlings, spend a day and restore
 * a depleted fishing ground, forest, hunting ground or herb patch.
 */

const ITEMS = [
  { code: 'STOCK-FISH-FRY', vi: 'Cá Giống Thả Sông', en: 'Fish Fry', price: 15, weight: 0.5 },
  { code: 'STOCK-SAPLING', vi: 'Cây Giống Lâm Sinh', en: 'Sapling', price: 12, weight: 1 },
  { code: 'STOCK-SALT-LICK', vi: 'Muối Khoáng Dẫn Thú', en: 'Salt Lick', price: 20, weight: 2 },
  { code: 'STOCK-SEEDLING', vi: 'Hạt Giống Dược Thảo', en: 'Herb Seedling', price: 10, weight: 0.2 }
];

const RULES = [
  { type: 'FISH', item: 'STOCK-FISH-FRY', cash: 10, stock: 20, days: 1, skill: 'SKL-FISH-NET', tier: 1 },
  { type: 'TIMBER', item: 'STOCK-SAPLING', cash: 5, stock: 15, days: 1, skill: 'SKL-WILD-SURVIVAL', tier: 1 },
  { type: 'GAME', item: 'STOCK-SALT-LICK', cash: 15, stock: 8, days: 1, skill: 'SKL-HUNT-TRACK', tier: 1 },
  { type: 'HERB', item: 'STOCK-SEEDLING', cash: 8, stock: 15, days: 1, skill: 'SKL-HERB-FORAGE', tier: 1 }
];

module.exports = {
  id: '058-node-restoration',
  description: 'Add restoration rules and stock items for depleted nodes',
  up(db) {
    const hasRules = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='resource_node_rules'"
    ).get();
    if (!hasRules) return;

    const columns = db.prepare('PRAGMA table_info(resource_node_rules);').all().map(row => row.name);
    const additions = [
      ['restore_item_code', 'TEXT'],
      ['restore_cash', 'INTEGER NOT NULL DEFAULT 0'],
      ['restore_stock', 'REAL NOT NULL DEFAULT 0'],
      ['restore_days', 'INTEGER NOT NULL DEFAULT 1'],
      ['restore_skill_code', 'TEXT'],
      ['restore_min_tier', 'INTEGER NOT NULL DEFAULT 0']
    ];
    for (const [name, type] of additions) {
      if (!columns.includes(name)) db.exec(`ALTER TABLE resource_node_rules ADD COLUMN ${name} ${type};`);
    }

    const update = db.prepare(`
      UPDATE resource_node_rules
      SET restore_item_code = ?, restore_cash = ?, restore_stock = ?,
          restore_days = ?, restore_skill_code = ?, restore_min_tier = ?
      WHERE resource_type = ?;
    `);
    for (const rule of RULES) {
      update.run(rule.item, rule.cash, rule.stock, rule.days, rule.skill, rule.tier, rule.type);
    }

    const hasItems = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_items'"
    ).get();
    if (hasItems) {
      const insertItem = db.prepare(`
        INSERT OR IGNORE INTO master_items
          (item_code, name_vi, name_en, category, unit_vi, unit_en,
           baseline_peace_price, current_market_price, weight_kg, description_vi, description_en)
        VALUES (?, ?, ?, 'STOCK', 'Phần', 'unit', ?, ?, ?, ?, ?);
      `);
      for (const item of ITEMS) {
        insertItem.run(
          item.code, item.vi, item.en, item.price, item.price, item.weight,
          `Vật tư phục hồi tài nguyên: ${item.vi}.`,
          `Resource restoration input: ${item.en}.`
        );
      }
    }

    console.log(`      ${RULES.length} restoration rules seeded`);
  }
};
