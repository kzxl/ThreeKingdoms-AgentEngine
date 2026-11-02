/**
 * Migration 068: perishables and transport skills.
 *
 * Fresh fish/meat spoil over travel days; dried/salted goods keep. The new
 * `SKL-LOG-COLD` reduces spoilage and `SKL-LOG-FREIGHT` cuts escort fees.
 */

const SKILLS = [
  {
    code: 'SKL-LOG-COLD', nameVi: 'Bảo Quản & Ướp Lạnh', nameEn: 'Preservation & Cold Chain',
    primary: 'LOG', secondary: 'INT', effect: 'SPOIL_REDUCTION', values: [10, 20, 30, 40, 50],
    tiers: [
      'Ướp muối và phơi khô cá qua đêm',
      'Dùng hầm mát và lá chuối giữ cá tươi',
      'Đóng thùng đá tuyết cho chuyến ngắn',
      'Bảo quản cá tươi nhiều ngày đường',
      'Dây chuyền lạnh liên thành, cá tươi như mới đánh'
    ]
  },
  {
    code: 'SKL-LOG-FREIGHT', nameVi: 'Điều Vận & Xếp Hàng', nameEn: 'Freight & Cargo Handling',
    primary: 'LOG', secondary: 'LDR', effect: 'FREIGHT_DISCOUNT', values: [2, 4, 6, 8, 10],
    tiers: [
      'Xếp hàng gọn, giảm hao phí thuê xe',
      'Thương lượng giá hộ vệ tốt hơn',
      'Chia chuyến hợp lý, giảm chi phí',
      'Điều phối nhiều xe, giảm phí đáng kể',
      'Mạng lưới vận tải riêng, chi phí thấp nhất'
    ]
  }
];

const PERISHABLES = [
  ['COM-FISH-FRESH', 3, 0.15],
  ['COM-FISH-CARP', 3, 0.14],
  ['COM-FISH-SHRIMP', 2, 0.18],
  ['COM-FISH-STURGEON', 4, 0.12],
  ['COM-GAME-MEAT', 4, 0.12],
  ['COM-GAME-VENISON', 4, 0.11],
  ['COM-MEAT', 4, 0.12],
  ['FOOD-FISH-DRIED', 90, 0.002],
  ['FOOD-FISH-DRIED-FINE', 90, 0.002],
  ['FOOD-FISH-SAUCE', 120, 0.001],
  ['FOOD-GAME-JERKY', 90, 0.002],
  ['FOOD-VENISON-JERKY', 90, 0.002],
  ['RAW-HIDE', 30, 0.01],
  ['RAW-HIDE-CURED', 90, 0.002]
];

module.exports = {
  id: '068-perishables',
  description: 'Add spoilage rates, cold chain/freight skills and shipment loss fields',
  up(db) {
    const hasItems = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_items'"
    ).get();
    if (hasItems) {
      const columns = db.prepare('PRAGMA table_info(master_items);').all().map(row => row.name);
      for (const [name, type] of [
        ['shelf_life_days', 'INTEGER NOT NULL DEFAULT 180'],
        ['spoil_rate_per_day', 'REAL NOT NULL DEFAULT 0'],
        ['preserve_skill_code', 'TEXT'],
        ['preserve_min_tier', 'INTEGER NOT NULL DEFAULT 0']
      ]) {
        if (!columns.includes(name)) db.exec(`ALTER TABLE master_items ADD COLUMN ${name} ${type};`);
      }
      const update = db.prepare(
        `UPDATE master_items
         SET shelf_life_days = ?, spoil_rate_per_day = ?
         WHERE item_code = ?;`
      );
      for (const [code, shelf, rate] of PERISHABLES) {
        update.run(shelf, rate, code);
      }
    }

    const hasSkills = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_skills'"
    ).get();
    if (hasSkills) {
      const insertSkill = db.prepare(`
        INSERT OR IGNORE INTO master_skills
          (skill_code, skill_name_vi, skill_name_en, domain, primary_attr, secondary_attr,
           tier_1_effect_vi, tier_2_effect_vi, tier_3_effect_vi, tier_4_effect_vi, tier_5_effect_vi)
        VALUES (?, ?, ?, 'LOGISTICS', ?, ?, ?, ?, ?, ?, ?);
      `);
      const insertEffect = db.prepare(`
        INSERT OR IGNORE INTO master_skill_effects (skill_code, tier, effect_type, value)
        VALUES (?, ?, ?, ?);
      `);
      const insertPerk = db.prepare(`
        INSERT OR IGNORE INTO master_perks
          (perk_code, skill_code, tier, name_vi, name_en, description_vi, description_en, effect_type, value)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      const hasEffects = db.prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_skill_effects'"
      ).get();
      const hasPerks = db.prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_perks'"
      ).get();
      for (const skill of SKILLS) {
        insertSkill.run(
          skill.code, skill.nameVi, skill.nameEn, skill.primary, skill.secondary,
          skill.tiers[0], skill.tiers[1], skill.tiers[2], skill.tiers[3], skill.tiers[4]
        );
        if (hasEffects) {
          for (let tier = 1; tier <= 5; tier += 1) {
            insertEffect.run(skill.code, tier, 'CHECK_BONUS', tier);
            insertEffect.run(skill.code, tier, skill.effect, skill.values[tier - 1]);
          }
        }
        if (hasPerks) {
          insertPerk.run(
            `PRK-${skill.code.replace('SKL-', '')}-3`, skill.code, 3,
            `${skill.nameVi} — Tinh Thông`, `${skill.nameEn} — Mastery`,
            `Tăng hiệu ứng ${skill.effect}.`, `Improves ${skill.effect}.`,
            skill.effect, skill.values[2]
          );
          insertPerk.run(
            `PRK-${skill.code.replace('SKL-', '')}-5`, skill.code, 5,
            `${skill.nameVi} — Tông Sư`, `${skill.nameEn} — Grandmaster`,
            `Đạt cảnh giới tông sư ${skill.nameVi}.`, `Grandmaster ${skill.nameEn}.`,
            skill.effect, skill.values[4]
          );
        }
      }
    }

    for (const table of ['freight_shipments', 'merchant_shipments']) {
      const exists = db.prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?"
      ).get(table);
      if (!exists) continue;
      const columns = db.prepare(`PRAGMA table_info(${table});`).all().map(row => row.name);
      if (!columns.includes('initial_quantity')) db.exec(`ALTER TABLE ${table} ADD COLUMN initial_quantity REAL NOT NULL DEFAULT 0;`);
      if (!columns.includes('total_days')) db.exec(`ALTER TABLE ${table} ADD COLUMN total_days INTEGER NOT NULL DEFAULT 0;`);
      if (!columns.includes('spoiled_quantity')) db.exec(`ALTER TABLE ${table} ADD COLUMN spoiled_quantity REAL NOT NULL DEFAULT 0;`);
      db.exec(`UPDATE ${table} SET initial_quantity = quantity WHERE initial_quantity = 0;`);
      if (columns.includes('days_remaining')) {
        db.exec(`UPDATE ${table} SET total_days = days_remaining WHERE total_days = 0;`);
      }
    }

    console.log(`      ${SKILLS.length} logistics skills and ${PERISHABLES.length} perishable items seeded`);
  }
};
