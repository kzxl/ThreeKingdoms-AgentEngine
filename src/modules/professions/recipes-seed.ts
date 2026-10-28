/**
 * ThreeKingdoms-AgentEngine: Master Recipes & Commodity Seed
 * Seeds recipes for ancient culinary arts (Cooking) and pharmaceutical medicine (Apothecary)
 * into master_recipes, ensuring all required commodities and products exist in master_items.
 *
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { DatabaseService } from '../../core/database';

export interface BomInputItem {
  item_code: string;
  item?: string;
  quantity: number;
  qty?: number;
  unit: string;
}

export interface RecipeSeedDefinition {
  recipeCode: string;
  productItemCode: string;
  productNameVi: string;
  productNameEn: string;
  category: string;
  standardLaborHours: number;
  baseDefectRate: number;
  requiredSkillCode: string;
  requiredSkillTier: number;
  bomInputs: BomInputItem[];
  descriptionVi: string;
}

export interface MasterItemSeedDefinition {
  itemCode: string;
  nameVi: string;
  nameEn: string;
  category: string;
  unitVi: string;
  unitEn: string;
  baselinePrice: number;
  currentPrice: number;
  weightKg: number;
  descriptionVi: string;
}

/**
 * Prerequisite commodities and finished items required for cooking and medicine recipes.
 */
export const RECIPE_COMMODITIES_SEED: MasterItemSeedDefinition[] = [
  {
    itemCode: 'COM-MEAT',
    nameVi: 'Thịt Tươi Săn Bắn & Gia Súc',
    nameEn: 'Fresh Game & Livestock Meat',
    category: 'FOOD_STUFF',
    unitVi: 'Cân',
    unitEn: 'Jin',
    baselinePrice: 20,
    currentPrice: 22,
    weightKg: 1.0,
    descriptionVi: 'Thịt nai thú rừng hoặc thịt lợn thả rông tươi sống, nguyên liệu căn bản cho các món ăn bồi bổ khí lực.'
  },
  {
    itemCode: 'FOOD-COOK-BAO',
    nameVi: 'Bánh Bao Thịt Trác Huyện',
    nameEn: 'Zhuo County Meat Bao',
    category: 'FOOD_STUFF',
    unitVi: 'Cái',
    unitEn: 'Piece',
    baselinePrice: 15,
    currentPrice: 18,
    weightKg: 0.3,
    descriptionVi: 'Bánh bao nhân thịt nóng hổi đậm vị xứ Trác, ăn vào ấm bụng, hồi phục 15 Điểm Thể Lực.'
  },
  {
    itemCode: 'FOOD-COOK-VENISON',
    nameVi: 'Thịt Rừng Nướng Ngũ Vị',
    nameEn: 'Five-Spice Roasted Wild Venison',
    category: 'FOOD_STUFF',
    unitVi: 'Đĩa',
    unitEn: 'Plate',
    baselinePrice: 35,
    currentPrice: 42,
    weightKg: 0.8,
    descriptionVi: 'Thịt thú rừng nướng than hoa tẩm ướp ngũ vị hương thảo mộc, hồi phục 25 Điểm Thể Lực và tăng 12 Sĩ Khí.'
  },
  {
    itemCode: 'FOOD-COOK-DUKANG',
    nameVi: 'Đỗ Khang Mỹ Tửu',
    nameEn: 'Dukang Fine Liquor',
    category: 'FINISHED_GOOD',
    unitVi: 'Vò',
    unitEn: 'Jar',
    baselinePrice: 60,
    currentPrice: 75,
    weightKg: 1.5,
    descriptionVi: 'Rượu Đỗ Khang trứ danh thiên cổ: Hà dĩ giải ưu, duy hữu Đỗ Khang. Hồi phục 35 Điểm Thể Lực và tăng 25 Sĩ Khí.'
  },
  {
    itemCode: 'MED-HEAL-SALVE',
    nameVi: 'Kim Sang Dược Cầm Máu',
    nameEn: 'Golden Wound Healing Salve',
    category: 'FINISHED_GOOD',
    unitVi: 'Hũ',
    unitEn: 'Vial',
    baselinePrice: 45,
    currentPrice: 50,
    weightKg: 0.2,
    descriptionVi: 'Dược cao thảo mộc tán bột gia truyền trị ngoại thương đao kiếm, bôi ngoài da tức thời hồi phục 25 HP.'
  },
  {
    itemCode: 'MED-VIGOR-DECOCTION',
    nameVi: 'Thang Dược Hồi Nguyên Bồi Bổ',
    nameEn: 'Primordial Vigor Restorative Decoction',
    category: 'FINISHED_GOOD',
    unitVi: 'Thang',
    unitEn: 'Dose',
    baselinePrice: 70,
    currentPrice: 85,
    weightKg: 0.5,
    descriptionVi: 'Thang thuốc sắc từ chu sa và thảo mộc sơn linh bồi bổ nguyên khí, hồi phục 35 Điểm Thể Lực và giải trừ bệnh tật mệt mỏi.'
  }
];

/**
 * Standard recipes for Cooking (Tavern / Culinary) and Medicine (Apothecary / Clinic).
 */
export const MASTER_RECIPES_SEED: RecipeSeedDefinition[] = [
  // 1. REC-COOK-BAO: 1 Grain + 1 Meat + 0.2 Salt -> Recover 15 Stamina
  {
    recipeCode: 'REC-COOK-BAO',
    productItemCode: 'FOOD-COOK-BAO',
    productNameVi: 'Bánh Bao Thịt Trác Huyện',
    productNameEn: 'Zhuo County Meat Bao',
    category: 'COOKING',
    standardLaborHours: 1.0,
    baseDefectRate: 0.05,
    requiredSkillCode: 'SKL_COOKING',
    requiredSkillTier: 1,
    bomInputs: [
      { item_code: 'COM-GRAIN', item: 'COM-GRAIN', quantity: 1, qty: 1, unit: 'Thạch' },
      { item_code: 'COM-MEAT', item: 'COM-MEAT', quantity: 1, qty: 1, unit: 'Cân' },
      { item_code: 'COM-SALT', item: 'COM-SALT', quantity: 0.2, qty: 0.2, unit: 'Cân' }
    ],
    descriptionVi: 'Bánh Bao Thịt Trác Huyện (1 Lương Thảo + 1 Thịt Tươi + 0.2 Muối Hạt -> Hồi phục 15 Thể Lực)'
  },
  // 2. REC-COOK-VENISON: 2 Meat + 1 Herb + 0.5 Salt -> Recover 25 Stamina, +12 Morale
  {
    recipeCode: 'REC-COOK-VENISON',
    productItemCode: 'FOOD-COOK-VENISON',
    productNameVi: 'Thịt Rừng Nướng Ngũ Vị',
    productNameEn: 'Five-Spice Roasted Wild Venison',
    category: 'COOKING',
    standardLaborHours: 1.5,
    baseDefectRate: 0.05,
    requiredSkillCode: 'SKL_COOKING',
    requiredSkillTier: 1,
    bomInputs: [
      { item_code: 'COM-MEAT', item: 'COM-MEAT', quantity: 2, qty: 2, unit: 'Cân' },
      { item_code: 'RAW-HERB-WILD', item: 'RAW-HERB-WILD', quantity: 1, qty: 1, unit: 'Bó' },
      { item_code: 'COM-SALT', item: 'COM-SALT', quantity: 0.5, qty: 0.5, unit: 'Cân' }
    ],
    descriptionVi: 'Thịt Rừng Nướng Ngũ Vị (2 Thịt Tươi + 1 Dược Thảo + 0.5 Muối Hạt -> Hồi phục 25 Thể Lực, +12 Sĩ Khí)'
  },
  // 3. REC-COOK-DUKANG: 2 Grain + 0.5 Herb -> Recover 35 Stamina, +25 Morale
  {
    recipeCode: 'REC-COOK-DUKANG',
    productItemCode: 'FOOD-COOK-DUKANG',
    productNameVi: 'Đỗ Khang Mỹ Tửu',
    productNameEn: 'Dukang Fine Liquor',
    category: 'COOKING',
    standardLaborHours: 2.0,
    baseDefectRate: 0.04,
    requiredSkillCode: 'SKL_COOKING',
    requiredSkillTier: 1,
    bomInputs: [
      { item_code: 'COM-GRAIN', item: 'COM-GRAIN', quantity: 2, qty: 2, unit: 'Thạch' },
      { item_code: 'RAW-HERB-WILD', item: 'RAW-HERB-WILD', quantity: 0.5, qty: 0.5, unit: 'Bó' }
    ],
    descriptionVi: 'Đỗ Khang Mỹ Tửu (2 Lương Thảo + 0.5 Dược Thảo -> Hồi phục 35 Thể Lực, +25 Sĩ Khí)'
  },
  // 4. REC-MED-HEAL-SALVE: 2 Wild Herb -> Restores 25 HP
  {
    recipeCode: 'REC-MED-HEAL-SALVE',
    productItemCode: 'MED-HEAL-SALVE',
    productNameVi: 'Kim Sang Dược Cầm Máu',
    productNameEn: 'Golden Wound Healing Salve',
    category: 'MEDICINE',
    standardLaborHours: 1.2,
    baseDefectRate: 0.04,
    requiredSkillCode: 'SKL_MEDICINE',
    requiredSkillTier: 1,
    bomInputs: [
      { item_code: 'RAW-HERB-WILD', item: 'RAW-HERB-WILD', quantity: 2, qty: 2, unit: 'Bó' }
    ],
    descriptionVi: 'Kim Sang Dược Cầm Máu (2 Dược Thảo Rừng Tươi -> Hồi phục 25 HP)'
  },
  // 5. REC-MED-VIGOR-DECOCTION: 2 Wild Herb + 1 Cinnabar -> Restores 35 Stamina, cures sickness
  {
    recipeCode: 'REC-MED-VIGOR-DECOCTION',
    productItemCode: 'MED-VIGOR-DECOCTION',
    productNameVi: 'Thang Dược Hồi Nguyên Bồi Bổ',
    productNameEn: 'Primordial Vigor Restorative Decoction',
    category: 'MEDICINE',
    standardLaborHours: 1.8,
    baseDefectRate: 0.04,
    requiredSkillCode: 'SKL_MEDICINE',
    requiredSkillTier: 1,
    bomInputs: [
      { item_code: 'RAW-HERB-WILD', item: 'RAW-HERB-WILD', quantity: 2, qty: 2, unit: 'Bó' },
      { item_code: 'RAW-CINNABAR', item: 'RAW-CINNABAR', quantity: 1, qty: 1, unit: 'Lạng' }
    ],
    descriptionVi: 'Thang Dược Hồi Nguyên Bồi Bổ (2 Dược Thảo Rừng Tươi + 1 Chu Sa Đỏ -> Hồi phục 35 Thể Lực, giải trừ tật bệnh)'
  }
];

/**
 * Seeds Cooking and Medicine recipes into master_recipes if not present.
 * Ensures all required commodity products and raw ingredients exist in master_items.
 */
export function seedMasterRecipes(dbInstance?: DatabaseService): { seededCount: number; recipes: RecipeSeedDefinition[] } {
  const db = dbInstance || DatabaseService.getInstance();

  // 1. Ensure master_items table exists
  db.execute(`
    CREATE TABLE IF NOT EXISTS master_items (
      item_code TEXT PRIMARY KEY,
      name_vi TEXT NOT NULL,
      name_en TEXT NOT NULL,
      category TEXT NOT NULL,
      unit_vi TEXT NOT NULL,
      unit_en TEXT NOT NULL,
      baseline_peace_price INTEGER NOT NULL,
      current_market_price INTEGER NOT NULL,
      volatility_index TEXT DEFAULT 'MEDIUM',
      weight_kg REAL DEFAULT 1.0,
      is_contraband INTEGER DEFAULT 0,
      production_source_vi TEXT,
      description_vi TEXT,
      description_en TEXT
    );
  `);

  // 2. Ensure master_recipes table exists
  db.execute(`
    CREATE TABLE IF NOT EXISTS master_recipes (
      recipe_code TEXT PRIMARY KEY,
      product_item_code TEXT NOT NULL,
      product_name_vi TEXT NOT NULL,
      product_name_en TEXT NOT NULL,
      category TEXT NOT NULL,
      standard_labor_hours REAL NOT NULL,
      base_defect_rate REAL NOT NULL DEFAULT 0.08,
      required_skill_code TEXT,
      required_skill_tier INTEGER DEFAULT 1,
      bom_inputs TEXT NOT NULL,
      description_vi TEXT,
      FOREIGN KEY (product_item_code) REFERENCES master_items(item_code)
    );
  `);

  let seededCount = 0;

  db.transaction(() => {
    // 3. Seed required items into master_items if missing
    for (const item of RECIPE_COMMODITIES_SEED) {
      const existing = db.queryOne<{ item_code: string }>(
        'SELECT item_code FROM master_items WHERE item_code = ?;',
        [item.itemCode]
      );
      if (!existing) {
        db.execute(`
          INSERT INTO master_items (
            item_code, name_vi, name_en, category, unit_vi, unit_en,
            baseline_peace_price, current_market_price, weight_kg, description_vi
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `, [
          item.itemCode,
          item.nameVi,
          item.nameEn,
          item.category,
          item.unitVi,
          item.unitEn,
          item.baselinePrice,
          item.currentPrice,
          item.weightKg,
          item.descriptionVi
        ]);
      }
    }

    // 4. Seed recipes into master_recipes
    for (const recipe of MASTER_RECIPES_SEED) {
      const existingRecipe = db.queryOne<{ recipe_code: string }>(
        'SELECT recipe_code FROM master_recipes WHERE recipe_code = ?;',
        [recipe.recipeCode]
      );

      if (!existingRecipe) {
        db.execute(`
          INSERT INTO master_recipes (
            recipe_code, product_item_code, product_name_vi, product_name_en,
            category, standard_labor_hours, base_defect_rate,
            required_skill_code, required_skill_tier, bom_inputs, description_vi
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `, [
          recipe.recipeCode,
          recipe.productItemCode,
          recipe.productNameVi,
          recipe.productNameEn,
          recipe.category,
          recipe.standardLaborHours,
          recipe.baseDefectRate,
          recipe.requiredSkillCode,
          recipe.requiredSkillTier,
          JSON.stringify(recipe.bomInputs),
          recipe.descriptionVi
        ]);
        seededCount++;
      }
    }
  });

  return { seededCount, recipes: MASTER_RECIPES_SEED };
}
