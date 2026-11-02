/**
 * Migration 057: variant-specific recipes.
 *
 * The common outputs already feed dried fish, jerky, hide and planks. This
 * migration adds the rare-variant sinks so carp, sturgeon roe, venison, antler,
 * pine and ebony are not just expensive trade goods.
 */

const ITEMS = [
  { code: 'FOOD-FISH-DRIED-FINE', vi: 'Cá Chép Khô Thượng Hạng', en: 'Fine Dried Carp', cat: 'FOOD_STUFF', unitVi: 'Bó', unitEn: 'bundle', price: 120, weight: 0.5 },
  { code: 'FOOD-CAVIAR', vi: 'Trứng Cá Tầm Muối', en: 'Salted Sturgeon Caviar', cat: 'FOOD_STUFF', unitVi: 'Hộp', unitEn: 'box', price: 260, weight: 0.3 },
  { code: 'FOOD-VENISON-JERKY', vi: 'Thịt Nai Khô', en: 'Venison Jerky', cat: 'FOOD_STUFF', unitVi: 'Bó', unitEn: 'bundle', price: 150, weight: 0.5 },
  { code: 'MED-ANTLER-TONIC', vi: 'Nhung Hươu Bổ Hoàn', en: 'Antler Tonic', cat: 'MEDICINE', unitVi: 'Viên', unitEn: 'pill', price: 320, weight: 0.2 },
  { code: 'MAT-PINE-BOARD', vi: 'Ván Thông Dầu', en: 'Pine Board', cat: 'RAW_MATERIAL', unitVi: 'Tấm', unitEn: 'board', price: 90, weight: 4 },
  { code: 'MAT-EBONY-BOARD', vi: 'Ván Gỗ Mun', en: 'Ebony Board', cat: 'RAW_MATERIAL', unitVi: 'Tấm', unitEn: 'board', price: 420, weight: 5 },
  { code: 'FOOD-SHRIMP-PASTE', vi: 'Mắm Tép Sông', en: 'Fermented Shrimp Paste', cat: 'FOOD_STUFF', unitVi: 'Vò', unitEn: 'jar', price: 130, weight: 2 }
];

const RECIPES = [
  {
    code: 'REC-FISH-DRY-CARP', product: 'FOOD-FISH-DRIED-FINE', nameVi: 'Cá Chép Khô Thượng Hạng', nameEn: 'Fine Dried Carp',
    category: 'FOOD_PROCESSING', hours: 6, defect: 0.04, skill: 'SKL-FISH-NET', tier: 2,
    bom: [{ item: 'COM-FISH-CARP', qty: 2 }, { item: 'COM-SALT', qty: 0.2 }],
    desc: 'Cá chép sông ướp muối sấy khô, thịt chắc và ngọt.'
  },
  {
    code: 'REC-CAVIAR', product: 'FOOD-CAVIAR', nameVi: 'Trứng Cá Tầm Muối', nameEn: 'Salted Sturgeon Caviar',
    category: 'FOOD_PROCESSING', hours: 10, defect: 0.08, skill: 'SKL-FISH-NET', tier: 3,
    bom: [{ item: 'RAW-FISH-ROE', qty: 1 }, { item: 'COM-SALT', qty: 0.2 }],
    desc: 'Trứng cá tầm muối nhẹ, món quý dâng chư hầu.'
  },
  {
    code: 'REC-SHRIMP-PASTE', product: 'FOOD-SHRIMP-PASTE', nameVi: 'Mắm Tép Sông', nameEn: 'Fermented Shrimp Paste',
    category: 'FOOD_PROCESSING', hours: 8, defect: 0.07, skill: 'SKL-FISH-NET', tier: 2,
    bom: [{ item: 'COM-FISH-SHRIMP', qty: 3 }, { item: 'COM-SALT', qty: 1 }],
    desc: 'Tép sông ủ muối làm mắm, để được qua mùa đông.'
  },
  {
    code: 'REC-VENISON-JERKY', product: 'FOOD-VENISON-JERKY', nameVi: 'Thịt Nai Khô', nameEn: 'Venison Jerky',
    category: 'FOOD_PROCESSING', hours: 6, defect: 0.05, skill: 'SKL-HUNT-SKIN', tier: 2,
    bom: [{ item: 'COM-GAME-VENISON', qty: 2 }, { item: 'COM-SALT', qty: 0.3 }],
    desc: 'Thịt nai rừng ướp muối sấy khô, lương khô cho kỵ binh.'
  },
  {
    code: 'REC-ANTLER-TONIC', product: 'MED-ANTLER-TONIC', nameVi: 'Nhung Hươu Bổ Hoàn', nameEn: 'Antler Tonic',
    category: 'ALCHEMIST', hours: 8, defect: 0.08, skill: 'SKL-HERB-PREP', tier: 2,
    bom: [{ item: 'COM-GAME-ANTLER', qty: 1 }, { item: 'RAW-HERB-WILD', qty: 1 }],
    desc: 'Nhung hươu tán bột phối dược thảo, bồi bổ khí huyết.'
  },
  {
    code: 'REC-PINE-PLANK', product: 'MAT-PINE-BOARD', nameVi: 'Ván Thông Dầu', nameEn: 'Pine Board',
    category: 'WOODWORK', hours: 4, defect: 0.05, skill: 'SKL-WILD-SURVIVAL', tier: 1,
    bom: [{ item: 'RAW-TIMBER-PINE', qty: 2 }],
    desc: 'Xẻ gỗ thông thành ván nhẹ, dùng đóng thuyền và đồ gia dụng.'
  },
  {
    code: 'REC-EBONY-BOARD', product: 'MAT-EBONY-BOARD', nameVi: 'Ván Gỗ Mun', nameEn: 'Ebony Board',
    category: 'WOODWORK', hours: 8, defect: 0.06, skill: 'SKL-WILD-SURVIVAL', tier: 3,
    bom: [{ item: 'RAW-TIMBER-EBONY', qty: 2 }],
    desc: 'Gỗ mun đen xẻ ván, nguyên liệu cho đồ thờ và vũ khí quý.'
  }
];

module.exports = {
  id: '057-variant-recipes',
  description: 'Add rare-variant items and processing recipes',
  up(db) {
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
      for (const item of ITEMS) {
        insertItem.run(
          item.code, item.vi, item.en, item.cat, item.unitVi, item.unitEn,
          item.price, item.price, item.weight,
          `Sản phẩm chế biến: ${item.vi}.`,
          `Processed good: ${item.en}.`
        );
      }
    }

    const hasRecipes = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_recipes'"
    ).get();
    if (!hasRecipes) return;
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
    console.log(`      ${RECIPES.length} variant recipes seeded`);
  }
};
