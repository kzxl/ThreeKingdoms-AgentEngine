/**
 * Migration 056: resource variants and processing chains.
 *
 * A resource type is no longer one item. `resource_yield_variants` picks a
 * weighted item by skill tier and season, optionally with a byproduct:
 *
 *   FISH   -> carp, river shrimp, sturgeon (+ roe)
 *   GAME   -> wild meat, venison, antler
 *   TIMBER -> oak, pine, ebony
 *
 * The processing recipes turn the common outputs into dried fish, fish sauce,
 * jerky, cured hide and sawn planks. Add a new variant or recipe as data; the
 * gather/craft services read the tables.
 */

const EXTRA_ITEMS = [
  { code: 'COM-FISH-CARP', vi: 'Cá Chép Sông', en: 'River Carp', cat: 'FOOD_STUFF', unitVi: 'Con', unitEn: 'fish', price: 38, weight: 1 },
  { code: 'COM-FISH-SHRIMP', vi: 'Tép Sông Tươi', en: 'Fresh River Shrimp', cat: 'FOOD_STUFF', unitVi: 'Cân', unitEn: 'jin', price: 45, weight: 1 },
  { code: 'COM-FISH-STURGEON', vi: 'Cá Tầm Trường Giang', en: 'Yangtze Sturgeon', cat: 'FOOD_STUFF', unitVi: 'Con', unitEn: 'fish', price: 160, weight: 4 },
  { code: 'RAW-FISH-ROE', vi: 'Trứng Cá Tầm', en: 'Sturgeon Roe', cat: 'RAW_MATERIAL', unitVi: 'Lạng', unitEn: 'tael', price: 140, weight: 0.2 },
  { code: 'FOOD-FISH-DRIED', vi: 'Cá Khô Sấy', en: 'Dried Fish', cat: 'FOOD_STUFF', unitVi: 'Bó', unitEn: 'bundle', price: 80, weight: 0.5 },
  { code: 'FOOD-FISH-SAUCE', vi: 'Nước Mắm Ủ', en: 'Fermented Fish Sauce', cat: 'FOOD_STUFF', unitVi: 'Vò', unitEn: 'jar', price: 110, weight: 2 },
  { code: 'COM-GAME-VENISON', vi: 'Thịt Nai Rừng', en: 'Forest Venison', cat: 'FOOD_STUFF', unitVi: 'Cân', unitEn: 'jin', price: 75, weight: 1 },
  { code: 'COM-GAME-ANTLER', vi: 'Nhung Hươu Sao', en: 'Deer Antler', cat: 'RAW_MATERIAL', unitVi: 'Cặp', unitEn: 'pair', price: 220, weight: 0.8 },
  { code: 'FOOD-GAME-JERKY', vi: 'Thịt Thú Khô', en: 'Game Jerky', cat: 'FOOD_STUFF', unitVi: 'Bó', unitEn: 'bundle', price: 90, weight: 0.5 },
  { code: 'RAW-HIDE-CURED', vi: 'Da Thuộc Sơ Chế', en: 'Cured Hide', cat: 'RAW_MATERIAL', unitVi: 'Tấm', unitEn: 'hide', price: 65, weight: 1.5 },
  { code: 'RAW-TIMBER-PINE', vi: 'Gỗ Thông Dầu', en: 'Pine Timber', cat: 'RAW_MATERIAL', unitVi: 'Khối', unitEn: 'block', price: 45, weight: 8 },
  { code: 'RAW-TIMBER-EBONY', vi: 'Gỗ Mun Đen', en: 'Ebony Timber', cat: 'RAW_MATERIAL', unitVi: 'Khối', unitEn: 'block', price: 320, weight: 10 },
  { code: 'MAT-TIMBER-PLANK', vi: 'Ván Gỗ Bào Nhẵn', en: 'Sawn Plank', cat: 'RAW_MATERIAL', unitVi: 'Tấm', unitEn: 'plank', price: 85, weight: 4 }
];

const VARIANTS = [
  { id: 'VAR-FISH-BASE', type: 'FISH', item: 'COM-FISH-FRESH', weight: 100, tier: 0, season: 'ALL', quality: 'COMMON', qty: 1, byproduct: null, byQty: 0 },
  { id: 'VAR-FISH-CARP', type: 'FISH', item: 'COM-FISH-CARP', weight: 35, tier: 1, season: 'ALL', quality: 'FINE', qty: 1.2, byproduct: null, byQty: 0 },
  { id: 'VAR-FISH-SHRIMP', type: 'FISH', item: 'COM-FISH-SHRIMP', weight: 25, tier: 1, season: 'SUMMER', quality: 'COMMON', qty: 0.8, byproduct: null, byQty: 0 },
  { id: 'VAR-FISH-STURGEON', type: 'FISH', item: 'COM-FISH-STURGEON', weight: 6, tier: 3, season: 'AUTUMN', quality: 'RARE', qty: 1.4, byproduct: 'RAW-FISH-ROE', byQty: 1 },
  { id: 'VAR-GAME-BASE', type: 'GAME', item: 'COM-GAME-MEAT', weight: 100, tier: 0, season: 'ALL', quality: 'COMMON', qty: 1, byproduct: 'RAW-HIDE', byQty: 1 },
  { id: 'VAR-GAME-VENISON', type: 'GAME', item: 'COM-GAME-VENISON', weight: 30, tier: 2, season: 'ALL', quality: 'FINE', qty: 1.2, byproduct: 'RAW-HIDE', byQty: 1 },
  { id: 'VAR-GAME-ANTLER', type: 'GAME', item: 'COM-GAME-MEAT', weight: 4, tier: 4, season: 'AUTUMN', quality: 'RARE', qty: 1, byproduct: 'COM-GAME-ANTLER', byQty: 1 },
  { id: 'VAR-TIMBER-BASE', type: 'TIMBER', item: 'RAW-TIMBER-OAK', weight: 100, tier: 0, season: 'ALL', quality: 'COMMON', qty: 1, byproduct: null, byQty: 0 },
  { id: 'VAR-TIMBER-PINE', type: 'TIMBER', item: 'RAW-TIMBER-PINE', weight: 30, tier: 1, season: 'ALL', quality: 'COMMON', qty: 1.3, byproduct: null, byQty: 0 },
  { id: 'VAR-TIMBER-EBONY', type: 'TIMBER', item: 'RAW-TIMBER-EBONY', weight: 5, tier: 4, season: 'ALL', quality: 'RARE', qty: 0.8, byproduct: null, byQty: 0 }
];

const RECIPES = [
  {
    code: 'REC-FISH-DRY', product: 'FOOD-FISH-DRIED', nameVi: 'Cá Khô Sấy Muối', nameEn: 'Salted Dried Fish',
    category: 'FOOD_PROCESSING', hours: 4, defect: 0.05, skill: 'SKL-FISH-NET', tier: 1,
    bom: [{ item: 'COM-FISH-FRESH', qty: 2 }, { item: 'COM-SALT', qty: 0.2 }],
    desc: 'Sấy khô cá tươi với muối để giữ được lâu ngày.'
  },
  {
    code: 'REC-FISH-SAUCE', product: 'FOOD-FISH-SAUCE', nameVi: 'Nước Mắm Ủ Cá', nameEn: 'Fermented Fish Sauce',
    category: 'FOOD_PROCESSING', hours: 8, defect: 0.08, skill: 'SKL-FISH-NET', tier: 2,
    bom: [{ item: 'COM-FISH-FRESH', qty: 3 }, { item: 'COM-SALT', qty: 1 }],
    desc: 'Ủ cá với muối trong vò, lấy nước mắm đậm đà.'
  },
  {
    code: 'REC-GAME-JERKY', product: 'FOOD-GAME-JERKY', nameVi: 'Thịt Thú Khô Sấy', nameEn: 'Smoked Game Jerky',
    category: 'FOOD_PROCESSING', hours: 5, defect: 0.05, skill: 'SKL-HUNT-SKIN', tier: 1,
    bom: [{ item: 'COM-GAME-MEAT', qty: 2 }, { item: 'COM-SALT', qty: 0.3 }],
    desc: 'Thịt thú rừng ướp muối sấy khô làm lương khô hành quân.'
  },
  {
    code: 'REC-HIDE-CURED', product: 'RAW-HIDE-CURED', nameVi: 'Da Thú Thuộc Sơ', nameEn: 'Cured Hide',
    category: 'LEATHERWORK', hours: 6, defect: 0.06, skill: 'SKL-HUNT-SKIN', tier: 2,
    bom: [{ item: 'RAW-HIDE', qty: 2 }, { item: 'COM-SALT', qty: 0.2 }],
    desc: 'Thuộc da thú bằng muối, giữ được độ dai và mềm.'
  },
  {
    code: 'REC-TIMBER-PLANK', product: 'MAT-TIMBER-PLANK', nameVi: 'Xẻ Gỗ Thành Ván', nameEn: 'Saw Timber into Planks',
    category: 'WOODWORK', hours: 5, defect: 0.06, skill: 'SKL-WILD-SURVIVAL', tier: 1,
    bom: [{ item: 'RAW-TIMBER-OAK', qty: 2 }],
    desc: 'Xẻ gỗ sồi thành ván phẳng dùng cho đóng thuyền và xe.'
  }
];

module.exports = {
  id: '056-resource-variants',
  description: 'Add weighted resource variants, byproducts and processing recipes',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS resource_yield_variants (
        variant_id TEXT PRIMARY KEY,
        resource_type TEXT NOT NULL,
        item_code TEXT NOT NULL,
        weight REAL NOT NULL DEFAULT 1 CHECK (weight > 0),
        min_skill_tier INTEGER NOT NULL DEFAULT 0 CHECK (min_skill_tier >= 0 AND min_skill_tier <= 5),
        season TEXT NOT NULL DEFAULT 'ALL',
        quality TEXT NOT NULL DEFAULT 'COMMON',
        quantity_multiplier REAL NOT NULL DEFAULT 1 CHECK (quantity_multiplier > 0),
        byproduct_item_code TEXT,
        byproduct_quantity REAL NOT NULL DEFAULT 0,
        notes_vi TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_resource_variants_type
        ON resource_yield_variants(resource_type, min_skill_tier, season);
    `);

    const hasItems = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_items'"
    ).get();
    if (hasItems) {
      const insertItem = db.prepare(`
        INSERT OR IGNORE INTO master_items
          (item_code, name_vi, name_en, category, unit_vi, unit_en,
           baseline_peace_price, current_market_price, weight_kg, description_vi, description_en)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const item of EXTRA_ITEMS) {
        insertItem.run(
          item.code, item.vi, item.en, item.cat, item.unitVi, item.unitEn,
          item.price, item.price, item.weight,
          `Sản vật ${item.vi}.`,
          `Resource: ${item.en}.`
        );
      }
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

    const insertVariant = db.prepare(`
      INSERT OR IGNORE INTO resource_yield_variants
        (variant_id, resource_type, item_code, weight, min_skill_tier, season, quality,
         quantity_multiplier, byproduct_item_code, byproduct_quantity, notes_vi)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    for (const variant of VARIANTS) {
      insertVariant.run(
        variant.id, variant.type, variant.item, variant.weight, variant.tier,
        variant.season, variant.quality, variant.qty, variant.byproduct, variant.byQty,
        `${variant.type} ${variant.quality.toLowerCase()}`
      );
    }

    console.log(`      ${VARIANTS.length} resource variants, ${RECIPES.length} processing recipes seeded`);
  }
};
