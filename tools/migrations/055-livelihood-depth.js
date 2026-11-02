/**
 * Migration 055: Livelihood depth foundation.
 *
 * This is the data-driven layer behind agriculture, forestry, fishing and
 * hunting:
 *
 * - 12 livelihood skills (AGRICULTURE/FISHING/FORAGING/SURVIVAL/COMMERCE/
 *   LEADERSHIP) with tiered effects and perks.
 * - `resource_node_rules`: per resource type skill, tool, stock and respawn.
 * - `gathering_node_state`: per-session stock, so nodes can deplete and refill.
 * - `master_crops` gains skill/rotation/soil rules and `land_parcels` remembers
 *   the previous crop for rotation.
 *
 * Adding a new resource later means adding a rule row and a node, not editing
 * GatherService.
 */

const LIVELIHOOD_SKILLS = [
  {
    code: 'SKL-AGR-PLANT', nameVi: 'Canh Tác & Chọn Giống', nameEn: 'Cultivation & Seed Selection',
    domain: 'AGRICULTURE', primary: 'POL', secondary: 'LOG',
    effects: [['CHECK_BONUS', 1], ['CROP_YIELD', 4]],
    tiers: [
      'Chọn giống đúng mùa, giảm hao hạt',
      'Hiểu đất và nước, cây khỏe hơn',
      'Canh tác đúng thời vụ, năng suất tăng',
      'Luân canh và chăm bón thành thạo',
      'Nông pháp tinh thông, một mẫu thu gấp đôi'
    ]
  },
  {
    code: 'SKL-AGR-IRRIG', nameVi: 'Dẫn Thủy & Đắp Bờ', nameEn: 'Irrigation & Embankment',
    domain: 'AGRICULTURE', primary: 'LOG', secondary: 'POL',
    effects: [['CHECK_BONUS', 1], ['CROP_RISK_REDUCTION', 4]],
    tiers: [
      'Đắp bờ giữ nước cho ruộng thấp',
      'Khai mương dẫn nước theo thửa',
      'Điều tiết nước mùa mưa và mùa khô',
      'Hệ thống tưới tiêu liên thửa',
      'Trị thủy một vùng, hạn lũ khó hại'
    ]
  },
  {
    code: 'SKL-AGR-SOIL', nameVi: 'Luân Canh & Phì Nhiêu', nameEn: 'Crop Rotation & Soil Fertility',
    domain: 'AGRICULTURE', primary: 'INT', secondary: 'POL',
    effects: [['CHECK_BONUS', 1], ['SOIL_RECOVERY', 4]],
    tiers: [
      'Biết đất nào hợp lúa, đất nào hợp đậu',
      'Trồng cây cải tạo đất sau vụ chính',
      'Luân canh hai vụ, đất không bạc màu',
      'Ủ phân xanh và giữ ẩm đất',
      'Địa lực bền vững qua nhiều thế hệ'
    ]
  },
  {
    code: 'SKL-FISH-NET', nameVi: 'Giăng Lưới & Đặt Lờ', nameEn: 'Netting & Trap Setting',
    domain: 'FISHING', primary: 'CRA', secondary: 'LOG',
    effects: [['CHECK_BONUS', 1], ['GATHER_YIELD', 4]],
    tiers: [
      'Giăng lưới ven bờ, bắt cá nhỏ',
      'Đặt lờ đúng luồng cá đi',
      'Chọn mắt lưới, tránh bắt cá non',
      'Đánh bắt theo con nước và mùa',
      'Ngư pháp tinh thông, mẻ lưới đầy khoang'
    ]
  },
  {
    code: 'SKL-FISH-BOAT', nameVi: 'Chèo Thuyền & Ra Khơi', nameEn: 'Boating & Open Water',
    domain: 'FISHING', primary: 'LOG', secondary: 'LDR',
    effects: [['CHECK_BONUS', 1], ['GATHER_YIELD', 2], ['TRAVEL_SPEED', 0.02]],
    tiers: [
      'Chèo thuyền nhỏ ven sông',
      'Điều khiển thuyền trước gió ngược',
      'Ra khơi gần bờ, đọc sóng nước',
      'Dong thuyền nhiều ngày, tránh bão',
      'Thủy thủ lão luyện, biển cả là nhà'
    ]
  },
  {
    code: 'SKL-HERB-FORAGE', nameVi: 'Nhận Diện Dược Thảo', nameEn: 'Herb Identification',
    domain: 'FORAGING', primary: 'INT', secondary: 'CRA',
    effects: [['CHECK_BONUS', 1], ['GATHER_YIELD', 2], ['QUALITY_BONUS', 2]],
    tiers: [
      'Phân biệt dược thảo thường gặp',
      'Biết thời điểm hái thuốc tốt nhất',
      'Tìm được dược liệu quý hiếm',
      'Bảo tồn gốc cây, hái đúng cách',
      'Thông hiểu dược tính đất trời'
    ]
  },
  {
    code: 'SKL-HERB-PREP', nameVi: 'Bào Chế Dược Liệu', nameEn: 'Herbal Preparation',
    domain: 'FORAGING', primary: 'CRA', secondary: 'INT',
    effects: [['CHECK_BONUS', 1], ['DEFECT_REDUCTION', 0.01]],
    tiers: [
      'Sao khô dược liệu đơn giản',
      'Bào chế cao dán cầm máu',
      'Phối hợp vị thuốc theo bệnh',
      'Chưng cất và bảo quản dược liệu',
      'Y dược song toàn, phương thuốc cứu người'
    ]
  },
  {
    code: 'SKL-HUNT-TRACK', nameVi: 'Lần Dấu & Bẫy Thú', nameEn: 'Tracking & Trapping',
    domain: 'SURVIVAL', primary: 'WAR', secondary: 'INT',
    effects: [['CHECK_BONUS', 1], ['GATHER_YIELD', 2]],
    tiers: [
      'Đọc dấu chân thú trên đất mềm',
      'Đặt bẫy đúng đường đi của thú',
      'Lần theo đàn thú nhiều ngày',
      'Chọn điểm phục kích, tránh thú dữ',
      'Sơn lâm săn pháp, thú rừng khó thoát'
    ]
  },
  {
    code: 'SKL-HUNT-SKIN', nameVi: 'Lột Da & Thuộc Da', nameEn: 'Skinning & Leatherwork',
    domain: 'SURVIVAL', primary: 'CRA', secondary: 'WAR',
    effects: [['CHECK_BONUS', 1], ['BYPRODUCT_BONUS', 5]],
    tiers: [
      'Lột da nguyên tấm, không rách',
      'Sơ chế da thú đơn giản',
      'Thuộc da mềm, giữ độ bền',
      'Phân loại da quý và da thường',
      'Da thú thành giáp, thợ cả một vùng'
    ]
  },
  {
    code: 'SKL-LAND-LEASE', nameVi: 'Điền Sản & Khế Ước', nameEn: 'Land Tenure & Contracts',
    domain: 'COMMERCE', primary: 'COM', secondary: 'POL',
    effects: [['CHECK_BONUS', 1], ['RENT_DISCOUNT', 2]],
    tiers: [
      'Đọc được khế ước thuê đất cơ bản',
      'Thương lượng giảm tô với địa chủ',
      'Hiểu luật ruộng đất và thuế khóa',
      'Lập khế ước dài hạn, tránh bị đòi đất',
      'Điền sản liên vùng, tô ruộng thấp nhất'
    ]
  },
  {
    code: 'SKL-FARM-LABOR', nameVi: 'Quản Lý Tá Điền', nameEn: 'Tenant Farm Management',
    domain: 'LEADERSHIP', primary: 'LDR', secondary: 'LOG',
    effects: [['CHECK_BONUS', 1], ['CROP_YIELD', 2], ['FATIGUE_REDUCTION', 2]],
    tiers: [
      'Giao việc cho tá điền rõ ràng',
      'Theo dõi mùa vụ, tránh bỏ hoang',
      'Chia công hợp lý, tăng năng suất',
      'Quản lý nhiều thửa ruộng cùng lúc',
      'Điền trang trù phú, tá điền hết lòng'
    ]
  },
  {
    code: 'SKL-WILD-SURVIVAL', nameVi: 'Sinh Tồn Dã Ngoại', nameEn: 'Wilderness Survival',
    domain: 'SURVIVAL', primary: 'LOG', secondary: 'WAR',
    effects: [['CHECK_BONUS', 1], ['FATIGUE_REDUCTION', 4], ['TRAVEL_SPEED', 0.02]],
    tiers: [
      'Dựng lều và tìm nước sạch',
      'Nhóm lửa, giữ ấm qua đêm',
      'Tìm thức ăn và tránh thú dữ',
      'Đi rừng nhiều ngày, định hướng tốt',
      'Sơn lâm biến thành nhà, không gì cản bước'
    ]
  }
];

const RESOURCE_RULES = [
  { type: 'MINERAL', skill: 'SKL-LOG-PROV', tool: 'TOOL-PICK', max: 60, respawn: 2, minTier: 0 },
  { type: 'HERB', skill: 'SKL-HERB-FORAGE', tool: null, max: 40, respawn: 3, minTier: 0 },
  { type: 'TIMBER', skill: 'SKL-WILD-SURVIVAL', tool: 'TOOL-AXE', max: 50, respawn: 1.5, minTier: 0 },
  { type: 'FARM', skill: 'SKL-AGR-PLANT', tool: 'TOOL-HOE', max: 80, respawn: 4, minTier: 0 },
  { type: 'FISH', skill: 'SKL-FISH-NET', tool: 'TOOL-NET', max: 60, respawn: 3, minTier: 0 },
  { type: 'GAME', skill: 'SKL-HUNT-TRACK', tool: 'TOOL-BOW', max: 30, respawn: 1, minTier: 0 },
  { type: 'SALT_WELL', skill: 'SKL-LOG-PROV', tool: null, max: 90, respawn: 5, minTier: 0 }
];

const TOOLS = [
  { code: 'TOOL-PICK', vi: 'Cuốc Chim Khai Mỏ', en: 'Mining Pick', price: 60, weight: 3 },
  { code: 'TOOL-AXE', vi: 'Rìu Tiều Phu', en: 'Woodcutter Axe', price: 50, weight: 2.5 },
  { code: 'TOOL-NET', vi: 'Lưới Đánh Cá', en: 'Fishing Net', price: 45, weight: 2 },
  { code: 'TOOL-BOW', vi: 'Cung Săn', en: 'Hunting Bow', price: 70, weight: 1.5 },
  { code: 'TOOL-HOE', vi: 'Cuốc Nông Cụ', en: 'Farming Hoe', price: 35, weight: 2 }
];

const CROP_RULES = {
  'CROP-RICE': { skill: 'SKL-AGR-PLANT', group: 'GRAIN', soil: 0.02 },
  'CROP-WHEAT': { skill: 'SKL-AGR-PLANT', group: 'GRAIN', soil: 0.02 },
  'CROP-BEANS': { skill: 'SKL-AGR-SOIL', group: 'LEGUME', soil: -0.02 },
  'CROP-VEG': { skill: 'SKL-AGR-PLANT', group: 'VEGETABLE', soil: 0.01 }
};

module.exports = {
  id: '055-livelihood-depth',
  description: 'Add livelihood skills, resource node rules/state, tools and crop rotation',
  up(db) {
    const has = name => db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?"
    ).get(name);

    // 1. Resource node rules + per-session stock.
    db.exec(`
      CREATE TABLE IF NOT EXISTS resource_node_rules (
        resource_type TEXT PRIMARY KEY,
        skill_code TEXT NOT NULL,
        required_tool_code TEXT,
        max_stock REAL NOT NULL DEFAULT 50 CHECK (max_stock > 0),
        respawn_per_day REAL NOT NULL DEFAULT 2 CHECK (respawn_per_day >= 0),
        min_skill_tier INTEGER NOT NULL DEFAULT 0 CHECK (min_skill_tier >= 0 AND min_skill_tier <= 5),
        quality_grades TEXT,
        notes_vi TEXT
      );

      CREATE TABLE IF NOT EXISTS gathering_node_state (
        node_id TEXT PRIMARY KEY,
        stock REAL NOT NULL DEFAULT 0 CHECK (stock >= 0),
        last_respawn_date TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const insertRule = db.prepare(`
      INSERT OR IGNORE INTO resource_node_rules
        (resource_type, skill_code, required_tool_code, max_stock, respawn_per_day, min_skill_tier)
      VALUES (?, ?, ?, ?, ?, ?);
    `);
    for (const rule of RESOURCE_RULES) {
      insertRule.run(rule.type, rule.skill, rule.tool, rule.max, rule.respawn, rule.minTier);
    }

    const hasNodes = has('gathering_nodes');
    if (hasNodes) {
      const date = db.prepare('SELECT "current_date" AS d FROM campaign_meta LIMIT 1;').get()?.d || '184-05-02';
      const nodes = db.prepare('SELECT node_id, resource_type FROM gathering_nodes;').all();
      const rules = new Map(db.prepare('SELECT * FROM resource_node_rules;').all().map(row => [row.resource_type, row]));
      const insertState = db.prepare(`
        INSERT OR IGNORE INTO gathering_node_state (node_id, stock, last_respawn_date)
        VALUES (?, ?, ?);
      `);
      for (const node of nodes) {
        const rule = rules.get(node.resource_type);
        insertState.run(node.node_id, Number(rule?.max_stock || 50), date);
      }
    }

    // 2. Tools are ordinary market items; a missing tool lowers yield, it does
    // not hard-block a basic node.
    if (has('master_items')) {
      const insertItem = db.prepare(`
        INSERT OR IGNORE INTO master_items
          (item_code, name_vi, name_en, category, unit_vi, unit_en,
           baseline_peace_price, current_market_price, weight_kg, description_vi, description_en)
        VALUES (?, ?, ?, 'TOOL', 'Cái', 'piece', ?, ?, ?, ?, ?);
      `);
      for (const tool of TOOLS) {
        insertItem.run(
          tool.code, tool.vi, tool.en,
          tool.price, tool.price, tool.weight,
          `Công cụ lao động: ${tool.vi}.`,
          `Work tool: ${tool.en}.`
        );
      }
    }

    // 3. Crop rules and previous-crop memory.
    if (has('master_crops')) {
      const columns = db.prepare('PRAGMA table_info(master_crops);').all().map(c => c.name);
      if (!columns.includes('skill_code')) db.exec('ALTER TABLE master_crops ADD COLUMN skill_code TEXT;');
      if (!columns.includes('rotation_group')) db.exec('ALTER TABLE master_crops ADD COLUMN rotation_group TEXT;');
      if (!columns.includes('soil_impact')) db.exec('ALTER TABLE master_crops ADD COLUMN soil_impact REAL NOT NULL DEFAULT 0.02;');
      const updateCrop = db.prepare(
        'UPDATE master_crops SET skill_code = ?, rotation_group = ?, soil_impact = ? WHERE crop_code = ?;'
      );
      for (const [code, rule] of Object.entries(CROP_RULES)) {
        updateCrop.run(rule.skill, rule.group, rule.soil, code);
      }
    }

    if (has('land_parcels')) {
      const columns = db.prepare('PRAGMA table_info(land_parcels);').all().map(c => c.name);
      if (!columns.includes('last_crop_code')) db.exec('ALTER TABLE land_parcels ADD COLUMN last_crop_code TEXT;');
    }

    // 4. Skills, effects, perks.
    if (!has('master_skills')) return;
    const insertSkill = db.prepare(`
      INSERT OR IGNORE INTO master_skills
        (skill_code, skill_name_vi, skill_name_en, domain, primary_attr, secondary_attr,
         tier_1_effect_vi, tier_2_effect_vi, tier_3_effect_vi, tier_4_effect_vi, tier_5_effect_vi)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
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
    const hasEffects = has('master_skill_effects');
    const hasPerks = has('master_perks');

    for (const skill of LIVELIHOOD_SKILLS) {
      insertSkill.run(
        skill.code, skill.nameVi, skill.nameEn, skill.domain, skill.primary, skill.secondary,
        skill.tiers[0], skill.tiers[1], skill.tiers[2], skill.tiers[3], skill.tiers[4]
      );
      if (hasEffects) {
        for (let tier = 1; tier <= 5; tier += 1) {
          insertEffect.run(skill.code, tier, 'CHECK_BONUS', tier);
          for (const [effectType, baseValue] of skill.effects) {
            if (effectType === 'CHECK_BONUS') continue;
            insertEffect.run(skill.code, tier, effectType, Number((baseValue * tier).toFixed(4)));
          }
        }
      }
      if (hasPerks) {
        const primary = skill.effects.filter(([type]) => type !== 'CHECK_BONUS').slice(-1)[0];
        const [primaryType, baseValue] = primary || ['CHECK_BONUS', 1];
        insertPerk.run(
          `PRK-${skill.code.replace('SKL-', '')}-3`, skill.code, 3,
          `${skill.nameVi} — Tinh Thông`, `${skill.nameEn} — Mastery`,
          `Tăng hiệu ứng ${primaryType} của ${skill.nameVi}.`,
          `Improves the ${primaryType} effect of ${skill.nameEn}.`,
          primaryType, Number((baseValue * 3).toFixed(2))
        );
        insertPerk.run(
          `PRK-${skill.code.replace('SKL-', '')}-5`, skill.code, 5,
          `${skill.nameVi} — Tông Sư`, `${skill.nameEn} — Grandmaster`,
          `Đạt cảnh giới tông sư ${skill.nameVi}.`,
          `Reaches grandmaster ${skill.nameEn}.`,
          primaryType, Number((baseValue * 5).toFixed(2))
        );
      }
    }

    console.log(`      ${LIVELIHOOD_SKILLS.length} livelihood skills seeded`);
  }
};
