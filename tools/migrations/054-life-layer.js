/**
 * Migration 054: Life Layer.
 *
 * Life-sim content existed (kizuna, lineage, banquets, farmland) but had no
 * skill domain and no daily needs. This migration adds:
 *
 * - `player_life_state`: stress, last meal/rest, monthly household upkeep.
 * - Nine LIFE skills in `master_skills`, their tiered effects and perks.
 *
 * Runtime writes still go through `LifeService`, `SkillService`, the ledger and
 * the action journal; this migration only creates the catalog.
 */

const LIFE_SKILLS = [
  {
    code: 'SKL-LIF-COOK',
    nameVi: 'Trù Phòng & Gia Yến',
    nameEn: 'Kitchen & Household Feasts',
    primary: 'CRA',
    secondary: 'INT',
    effect: 'MORALE_RECOVERY',
    values: [1, 2, 3, 4, 5],
    tiers: [
      'Nấu bữa cơm gia đình ấm cúng, hồi phục tinh thần nhẹ',
      'Pha chế món ăn theo mùa, giảm hao phí lương thực',
      'Mở tiệc nhỏ chiêu đãi bằng hữu, tăng thiện cảm',
      'Bày biện yến tiệc thể diện, nâng uy tín gia tộc',
      'Tổ chức đại yến quốc sắc, quy tụ hào kiệt'
    ]
  },
  {
    code: 'SKL-LIF-TEA',
    nameVi: 'Trà Đạo & Tiếp Khách',
    nameEn: 'Tea Ceremony & Hospitality',
    primary: 'DIP',
    secondary: 'POL',
    effect: 'SOCIAL_GAIN',
    values: [1, 2, 3, 4, 5],
    tiers: [
      'Pha trà đúng cách, câu chuyện dễ mở lòng',
      'Biết chọn trà theo khách, giảm lời nói lạc quẻ',
      'Tiếp khách khéo léo, tăng thiện cảm rõ rệt',
      'Chủ trì trà hội, mở rộng quan hệ nhiều phe',
      'Trà đạo thông thiên hạ, nhất ngôn định giao tình'
    ]
  },
  {
    code: 'SKL-LIF-ETIQ',
    nameVi: 'Lễ Nghi & Gia Quy',
    nameEn: 'Etiquette & Household Rules',
    primary: 'POL',
    secondary: 'DIP',
    effect: 'CREDIBILITY_GAIN',
    values: [1, 2, 3, 4, 5],
    tiers: [
      'Nắm lễ nghi cơ bản khi gặp trưởng bối',
      'Thuộc gia quy, tránh thất lễ trong hôn lễ',
      'Ứng xử chuẩn mực, tăng tín nhiệm với quan lại',
      'Chủ trì nghi lễ gia tộc, củng cố chính danh',
      'Lễ nghi bang giao, đại diện gia tộc trước chư hầu'
    ]
  },
  {
    code: 'SKL-LIF-HOUSE',
    nameVi: 'Trị Gia & Nội Vụ',
    nameEn: 'Household Stewardship',
    primary: 'POL',
    secondary: 'LOG',
    effect: 'UPKEEP_DISCOUNT',
    values: [2, 4, 6, 8, 10],
    tiers: [
      'Sắp xếp việc nhà gọn gàng, giảm thất thoát nhỏ',
      'Lập sổ chi tiêu gia đình, tránh mua sắm trùng',
      'Điều phối người hầu và bếp núc hiệu quả',
      'Quản lý trang viên nhiều hộ, giảm hao hụt',
      'Trị gia như trị quốc, tiết kiệm tối đa mà không khắc bạc'
    ]
  },
  {
    code: 'SKL-LIF-PARENT',
    nameVi: 'Gia Huấn & Giáo Dưỡng',
    nameEn: 'Family Instruction & Upbringing',
    primary: 'INT',
    secondary: 'POL',
    effect: 'CHILD_GROWTH',
    values: [2, 4, 6, 8, 10],
    tiers: [
      'Dạy con lễ phép và thói quen đọc sách',
      'Chọn sách phù hợp lứa tuổi, uốn nắn tính tình',
      'Kèm cặp học tập, tăng trưởng thuộc tính rõ rệt',
      'Mời thầy giỏi, định hướng theo sở trường',
      'Gia huấn truyền đời, con cháu thành tài'
    ]
  },
  {
    code: 'SKL-LIF-MED',
    nameVi: 'Y Dược & Điều Dưỡng',
    nameEn: 'Medicine & Convalescence',
    primary: 'CRA',
    secondary: 'INT',
    effect: 'HEAL_RATE',
    values: [2, 4, 6, 8, 10],
    tiers: [
      'Băng bó vết thương nhỏ, pha trà thuốc cơ bản',
      'Nhận biết dược liệu thường, giảm đau hiệu quả',
      'Điều trị thương tích chiến trận, rút ngắn hồi phục',
      'Bào chế thuốc cao, cứu người nguy kịch',
      'Y đạo thông huyền, hồi sinh trong gang tấc'
    ]
  },
  {
    code: 'SKL-LIF-MUSIC',
    nameVi: 'Cầm Kỳ Thi Họa',
    nameEn: 'Music, Chess & Letters',
    primary: 'CRA',
    secondary: 'INT',
    effect: 'LEISURE_GAIN',
    values: [1, 2, 3, 4, 5],
    tiers: [
      'Đàn một khúc nhỏ, thư giãn tinh thần',
      'Chơi cờ và ngâm thơ, giảm căng thẳng',
      'Sáng tác thi phú, được người đời khen ngợi',
      'Danh tiếng văn nhã lan xa, mở cửa giao du',
      'Cầm kỳ thi họa tuyệt luân, lưu danh sử sách'
    ]
  },
  {
    code: 'SKL-LIF-AUSTERE',
    nameVi: 'Dưỡng Sinh & Tiết Dục',
    nameEn: 'Restraint & Vitality',
    primary: 'LOG',
    secondary: 'INT',
    effect: 'FATIGUE_RECOVERY',
    values: [2, 4, 6, 8, 10],
    tiers: [
      'Ngủ đúng giấc, tỉnh dậy nhẹ nhõm',
      'Biết tiết chế rượu thịt, giảm mệt mỏi',
      'Điều tức thở sâu, hồi phục thể lực nhanh',
      'Dưỡng sinh theo mùa, ít ốm đau',
      'Tâm tĩnh như nước, thân nhẹ như mây'
    ]
  },
  {
    code: 'SKL-LIF-CIVIC',
    nameVi: 'Hương Lý & Công Ích',
    nameEn: 'Civic Duty & Local Standing',
    primary: 'POL',
    secondary: 'LDR',
    effect: 'VIRTUE_GAIN',
    values: [1, 2, 3, 4, 5],
    tiers: [
      'Giúp hàng xóm việc nhỏ, được lòng dân',
      'Tham gia việc làng, giữ hòa khí',
      'Đứng ra hòa giải, tăng uy tín địa phương',
      'Mở kho cứu tế, tiếng lành đồn xa',
      'Công ích một vùng, dân chúng kính phục'
    ]
  }
];

module.exports = {
  id: '054-life-layer',
  description: 'Add life state, LIFE skills, effects and perks',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_life_state (
        character_id TEXT PRIMARY KEY,
        stress INTEGER NOT NULL DEFAULT 20 CHECK (stress >= 0 AND stress <= 100),
        last_meal_date TEXT,
        last_rest_date TEXT,
        last_upkeep_month TEXT,
        routine_streak INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const hasPlayers = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='player_state'"
    ).get();
    if (hasPlayers) {
      const players = db.prepare('SELECT player_id FROM player_state;').all();
      const insertState = db.prepare(
        'INSERT OR IGNORE INTO player_life_state (character_id) VALUES (?);'
      );
      for (const player of players) insertState.run(player.player_id);
    }

    const hasSkills = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='master_skills'"
    ).get();
    if (!hasSkills) return;

    const insertSkill = db.prepare(`
      INSERT OR IGNORE INTO master_skills
        (skill_code, skill_name_vi, skill_name_en, domain, primary_attr, secondary_attr,
         tier_1_effect_vi, tier_2_effect_vi, tier_3_effect_vi, tier_4_effect_vi, tier_5_effect_vi)
      VALUES (?, ?, ?, 'LIFE', ?, ?, ?, ?, ?, ?, ?);
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

    for (const skill of LIFE_SKILLS) {
      insertSkill.run(
        skill.code,
        skill.nameVi,
        skill.nameEn,
        skill.primary,
        skill.secondary,
        skill.tiers[0],
        skill.tiers[1],
        skill.tiers[2],
        skill.tiers[3],
        skill.tiers[4]
      );

      if (hasEffects) {
        for (let tier = 1; tier <= 5; tier += 1) {
          insertEffect.run(skill.code, tier, skill.effect, skill.values[tier - 1]);
        }
      }

      if (hasPerks) {
        insertPerk.run(
          `PRK-${skill.code.replace('SKL-', '')}-3`,
          skill.code,
          3,
          `${skill.nameVi} — Tinh Thông`,
          `${skill.nameEn} — Mastery`,
          `Nâng cao hiệu ứng ${skill.effect} của ${skill.nameVi}.`,
          `Improves the ${skill.effect} effect of ${skill.nameEn}.`,
          skill.effect,
          2
        );
        insertPerk.run(
          `PRK-${skill.code.replace('SKL-', '')}-5`,
          skill.code,
          5,
          `${skill.nameVi} — Tông Sư`,
          `${skill.nameEn} — Grandmaster`,
          `Đạt cảnh giới tông sư ${skill.nameVi}, hiệu ứng mạnh nhất.`,
          `Reaches grandmaster ${skill.nameEn}; strongest effect.`,
          skill.effect,
          4
        );
      }
    }

    console.log(`      ${LIFE_SKILLS.length} LIFE skills seeded`);
  }
};
