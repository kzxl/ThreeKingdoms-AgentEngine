/**
 * ThreeKingdoms-AgentEngine: Extended Female Characters Seeder
 * (tools/seed-extended-females.js)
 *
 * Seeds:
 * 1. 10 Historical Heroines into master_characters
 * 2. 30 Civilian Maidens across 10 strategic settlements into civilian_maidens
 * 3. Idempotent: uses INSERT OR REPLACE
 *
 * Adheres to AgentOption Universe Architecture v4.0 & Anti-AI-Slop standards.
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../saves/session.db');
const db = new Database(dbPath);

console.log('Seeding extended female characters into SQLite ACID database...');

// 1. Seed Historical Heroines into master_characters
const historicalHeroines = [
  {
    npc_id: 'NPC-0151',
    name_vi: 'Vương Nguyên Cơ',
    name_en: 'Wang Yuanji',
    name_han: '王元姬',
    style_name_vi: 'Văn Minh',
    style_name_en: 'Wenming',
    birth_year: 217,
    baseline_age: 20,
    baseline_location: 'LOC-0005',
    baseline_position_vi: 'Danh Môn Khuê Tú',
    baseline_position_en: 'Highborn Noblewoman',
    int_attr: 84, pol_attr: 88, war_attr: 35, ldr_attr: 55, dip_attr: 76, com_attr: 65, log_attr: 72, cra_attr: 60,
    personality: 'HONORABLE',
    motivation: 'FAMILY_SECURITY',
    baseline_sentiment_player: 20,
    core_associates: '["NPC-0012"]',
    talents: '["TLT-VIRTUOUS-FORESIGHT", "CLASSICAL_SCHOLAR"]',
    bio_vi: 'Vương Nguyên Cơ là con gái Vương Túc, cháu nội danh sĩ Vương Lãng. Nổi tiếng thông tuệ đoan nghiêm, nhìn xa trông rộng, có tài thấu triệt lòng người.',
    bio_en: 'Wang Yuanji, daughter of Wang Su and granddaughter of Wang Lang, famous for her intellect, virtue, and political foresight.'
  },
  {
    npc_id: 'NPC-0152',
    name_vi: 'Lữ Linh Khởi',
    name_en: 'Lu Lingqi',
    name_han: '吕玲绮',
    style_name_vi: 'Chiến Cơ',
    style_name_en: 'Zhanji',
    birth_year: 180,
    baseline_age: 19,
    baseline_location: 'LOC-0012',
    baseline_position_vi: 'Hổ Nữ Sa Trường',
    baseline_position_en: 'Fierce Martial Maiden',
    int_attr: 52, pol_attr: 38, war_attr: 88, ldr_attr: 78, dip_attr: 45, com_attr: 40, log_attr: 55, cra_attr: 50,
    personality: 'VALIANT',
    motivation: 'MARTIAL_GLORY',
    baseline_sentiment_player: 15,
    core_associates: '["NPC-0002"]',
    talents: '["TLT-WAR-HERITAGE", "HALBERD_MASTERY"]',
    bio_vi: 'Con gái Chiến thần Lữ Bố, kế thừa dũng lực kinh người và tuyệt kỹ Phương Thiên Họa Kích, kiêu dũng quả cảm nơi sa trường.',
    bio_en: 'Daughter of Lu Bu, inherited her fathers immense physical might and halberd prowess, fearless in battlefield engagements.'
  },
  {
    npc_id: 'NPC-0153',
    name_vi: 'Bộ Luyện Sư',
    name_en: 'Bu Lianshi',
    name_han: '步练师',
    style_name_vi: 'Khang Hòa',
    style_name_en: 'Kanghe',
    birth_year: 185,
    baseline_age: 21,
    baseline_location: 'LOC-0013',
    baseline_position_vi: 'Giang Đông Đệ Nhất Hiền',
    baseline_position_en: 'Virtuous Lady of Jiangdong',
    int_attr: 75, pol_attr: 76, war_attr: 30, ldr_attr: 50, dip_attr: 85, com_attr: 68, log_attr: 60, cra_attr: 55,
    personality: 'BENEVOLENT',
    motivation: 'HARMONY',
    baseline_sentiment_player: 25,
    core_associates: '["NPC-0087", "NPC-0088"]',
    talents: '["TLT-SERENE-BENEVOLENCE", "DIPLOMATIC_GRACE"]',
    bio_vi: 'Ái thê của Ngô Đại Đế Tôn Quyền, tính tình khoan dung hòa nhã, chưa từng đố kỵ, được lục cung và quần thần tôn kính.',
    bio_en: 'Beloved consort of Sun Quan, renowned throughout Jiangdong for her modesty, benevolence, and serene disposition.'
  },
  {
    npc_id: 'NPC-0154',
    name_vi: 'Mã Vân Lục',
    name_en: 'Ma Yunlu',
    name_han: '马云禄',
    style_name_vi: 'Tây Lương Kiêu Cơ',
    style_name_en: 'Xiliang Maiden',
    birth_year: 186,
    baseline_age: 19,
    baseline_location: 'LOC-0023',
    baseline_position_vi: 'Tây Lương Hổ Nữ',
    baseline_position_en: 'Frontier Warrior Maiden',
    int_attr: 60, pol_attr: 42, war_attr: 85, ldr_attr: 75, dip_attr: 55, com_attr: 48, log_attr: 62, cra_attr: 52,
    personality: 'VALIANT',
    motivation: 'JUSTICE',
    baseline_sentiment_player: 20,
    core_associates: '["NPC-0005"]',
    talents: '["TLT-CAVALRY-PROWESS", "SPEAR_DANCE"]',
    bio_vi: 'Ái nữ Tây Lương Thái thú Mã Đằng, muội muội Mã Siêu. Sinh ra nơi biên ải phong tuyết, tinh thông cưỡi ngựa bắn cung và thương pháp linh diệu.',
    bio_en: 'Daughter of Ma Teng and sister of Ma Chao, raised on the rugged frontier with elite equestrian archery and martial mastery.'
  },
  {
    npc_id: 'NPC-0155',
    name_vi: 'Quan Ngân Bình',
    name_en: 'Guan Yinping',
    name_han: '关银屏',
    style_name_vi: 'Quan Tam Nương',
    style_name_en: 'Sanniang',
    birth_year: 190,
    baseline_age: 18,
    baseline_location: 'LOC-0014',
    baseline_position_vi: 'Kinh Châu Hổ Nữ',
    baseline_position_en: 'Tiger Maiden of Jingzhou',
    int_attr: 65, pol_attr: 50, war_attr: 82, ldr_attr: 74, dip_attr: 58, com_attr: 45, log_attr: 58, cra_attr: 48,
    personality: 'HONORABLE',
    motivation: 'FAMILY_HONOR',
    baseline_sentiment_player: 25,
    core_associates: '["NPC-0003"]',
    talents: '["TLT-AZURE-WILL", "BLADE_MASTERY"]',
    bio_vi: 'Tam ái nữ của Hán Thọ Đình Hầu Quan Vũ, kế thừa thần khí kiên định và đao pháp Thanh Long, tính cách bất khuất hào sảng.',
    bio_en: 'Third daughter of Guan Yu, inheritor of the Azure Dragon blade tradition, famous for her uncompromising spirit and filial valor.'
  },
  {
    npc_id: 'NPC-0156',
    name_vi: 'Tân Hiến Anh',
    name_en: 'Xin Xianying',
    name_han: '辛宪英',
    style_name_vi: 'Minh Giám',
    style_name_en: 'Mingjian',
    birth_year: 191,
    baseline_age: 22,
    baseline_location: 'LOC-0005',
    baseline_position_vi: 'Đệ Nhất Minh Tuệ Nữ Sĩ',
    baseline_position_en: 'Foremost Scholar Strategist',
    int_attr: 88, pol_attr: 86, war_attr: 28, ldr_attr: 52, dip_attr: 82, com_attr: 60, log_attr: 70, cra_attr: 54,
    personality: 'SCHOLARLY',
    motivation: 'WISDOM',
    baseline_sentiment_player: 20,
    core_associates: '["NPC-0012"]',
    talents: '["TLT-ASTUTE-PERCEPTION", "FORESIGHT"]',
    bio_vi: 'Con gái mưu sĩ Tân Bình, nức danh là đệ nhất nữ trí giả Tào Ngụy. Từng nhiều lần đoán định chuẩn xác cục diện chính biến và chiến trường.',
    bio_en: 'Daughter of Xin Ping, widely acclaimed as the sharpest female intellect of Cao Wei, renowned for uncanny strategic predictions.'
  },
  {
    npc_id: 'NPC-0157',
    name_vi: 'Trâu Thị',
    name_en: 'Lady Zou',
    name_han: '邹氏',
    style_name_vi: 'Khuynh Thành',
    style_name_en: 'Qingcheng',
    birth_year: 175,
    baseline_age: 25,
    baseline_location: 'LOC-0015',
    baseline_position_vi: 'Nam Dương Quả Phụ',
    baseline_position_en: 'Noble Widow of Nanyang',
    int_attr: 70, pol_attr: 55, war_attr: 25, ldr_attr: 40, dip_attr: 88, com_attr: 72, log_attr: 50, cra_attr: 58,
    personality: 'PRAGMATIC',
    motivation: 'SURVIVAL',
    baseline_sentiment_player: 15,
    core_associates: '[]',
    talents: '["TLT-CAPTIVATING-GRACE", "SEDUCTION"]',
    bio_vi: 'Tuyệt sắc phu nhân góa phụ của Trương Tế tại Uyển Thành, dung mạo diễm lệ khuynh thành, am hiểu giao tiếp dạ yến.',
    bio_en: 'Widow of Zhang Ji in Wancheng, blessed with peerless elegance and social charm that captivated commanders across the realm.'
  },
  {
    npc_id: 'NPC-0158',
    name_vi: 'Phàn Thị',
    name_en: 'Lady Fan',
    name_han: '樊氏',
    style_name_vi: 'Tiết Phụ',
    style_name_en: 'Xiefu',
    birth_year: 178,
    baseline_age: 24,
    baseline_location: 'LOC-0020',
    baseline_position_vi: 'Quế Dương Quốc Sắc',
    baseline_position_en: 'Belle of Guiyang',
    int_attr: 72, pol_attr: 62, war_attr: 30, ldr_attr: 45, dip_attr: 78, com_attr: 66, log_attr: 54, cra_attr: 60,
    personality: 'HONORABLE',
    motivation: 'FAMILY_SECURITY',
    baseline_sentiment_player: 20,
    core_associates: '[]',
    talents: '["TLT-PURE-INTEGRITY", "VIRTUE"]',
    bio_vi: 'Quả phụ Triệu Phạm tại Quế Dương Kinh Nam, quốc sắc thiên hương nhưng trọng nghĩa khinh lợi, giữ tiết tháo kiên trinh.',
    bio_en: 'Sister-in-law of Zhao Fan in southern Jingzhou, famed for her resplendent beauty and unyielding moral dignity.'
  },
  {
    npc_id: 'NPC-0159',
    name_vi: 'Mi Phu Nhân',
    name_en: 'Lady Mi',
    name_han: '麋氏',
    style_name_vi: 'Liệt Nữ',
    style_name_en: 'Lienu',
    birth_year: 182,
    baseline_age: 23,
    baseline_location: 'LOC-0014',
    baseline_position_vi: 'Từ Châu Danh Viện',
    baseline_position_en: 'Consort of Xu Province Lineage',
    int_attr: 68, pol_attr: 60, war_attr: 32, ldr_attr: 54, dip_attr: 72, com_attr: 75, log_attr: 65, cra_attr: 55,
    personality: 'HONORABLE',
    motivation: 'FAMILY_LOYALTY',
    baseline_sentiment_player: 25,
    core_associates: '["NPC-0141"]',
    talents: '["TLT-SACRIFICIAL-LOYALTY", "MERCHANT_LINEAGE"]',
    bio_vi: 'Muội muội của đại cự thương Mi Trúc Từ Châu, thứ thê của Lưu Bị. Khí chất đoan trang dũng liệt, trọng đại cục gia tộc.',
    bio_en: 'Sister of grand merchant Mi Zhu and consort to Liu Bei, combining commercial magnate heritage with resolute self-sacrifice.'
  },
  {
    npc_id: 'NPC-0160',
    name_vi: 'Cam Phu Nhân',
    name_en: 'Lady Gan',
    name_han: '甘氏',
    style_name_vi: 'Chiêu Liệt',
    style_name_en: 'Zhaolie',
    birth_year: 184,
    baseline_age: 22,
    baseline_location: 'LOC-0010',
    baseline_position_vi: 'Ngọc Khiết Phu Nhân',
    baseline_position_en: 'Virtuous Consort of Han',
    int_attr: 65, pol_attr: 64, war_attr: 22, ldr_attr: 48, dip_attr: 76, com_attr: 60, log_attr: 58, cra_attr: 58,
    personality: 'BENEVOLENT',
    motivation: 'PEACE',
    baseline_sentiment_player: 25,
    core_associates: '[]',
    talents: '["TLT-EMPRESS-GRACE", "JADE_PURITY"]',
    bio_vi: 'Thê thất Lưu Bị, thân mẫu Lưu Thiện (A Đẩu). Da thịt trắng ngần như ngọc, tính tình dịu dàng từ ái, chủ trì nội trạch thuận hòa.',
    bio_en: 'Consort to Liu Bei and mother of Liu Shan, praised for her porcelain grace, gentle nature, and harmonious domestic leadership.'
  }
];

const insertHeroine = db.prepare(`
  INSERT OR REPLACE INTO master_characters (
    npc_id, name_vi, name_en, name_han, style_name_vi, style_name_en,
    birth_year, baseline_age, baseline_location, baseline_position_vi, baseline_position_en,
    int_attr, pol_attr, war_attr, ldr_attr, dip_attr, com_attr, log_attr, cra_attr,
    personality, motivation, baseline_sentiment_player, core_associates, talents, bio_vi, bio_en
  ) VALUES (
    @npc_id, @name_vi, @name_en, @name_han, @style_name_vi, @style_name_en,
    @birth_year, @baseline_age, @baseline_location, @baseline_position_vi, @baseline_position_en,
    @int_attr, @pol_attr, @war_attr, @ldr_attr, @dip_attr, @com_attr, @log_attr, @cra_attr,
    @personality, @motivation, @baseline_sentiment_player, @core_associates, @talents, @bio_vi, @bio_en
  );
`);

db.transaction(() => {
  for (const h of historicalHeroines) {
    insertHeroine.run(h);
  }
})();
console.log(`Seeded ${historicalHeroines.length} historical heroines into master_characters.`);

// 2. Seed 30 Extended Civilian Maidens across 10 strategic settlements
const extendedCivilianMaidens = [
  // --- 1. Tương Dương (Xiang Yang) ---
  {
    maiden_id: 'MAIDEN-XY-AGRI', name_vi: 'Lưu Lan Nương', name_en: 'Liu Lanniang',
    settlement_id: 'xiang_yang', social_stratum: 'PEASANT', father_profession_vi: 'Trang chủ điền trang Hán Thủy',
    dowry_cash: 420, dowry_item_code: 'COM-GRAIN', dowry_item_qty: 6,
    maternal_trait_code: 'TLT-AGRI-VIRTUE', maternal_trait_name_vi: 'Điền Viên Cần Kiệm',
    maternal_trait_desc_vi: '+25% Tốc độ hồi phục thể lực, +2 Base COM cho con cái', bonus_stat: 'com', bonus_val: 2,
    clue_vi: 'Thôn nữ đảm đang bên bờ sông Hán Thủy vùng Tương Dương, giỏi trồng trọt nông tang.', clue_en: 'Devoted farming maiden by the Han River in Xiangyang.',
    is_married: 0, personality: 'PRAGMATIC', motivation: 'FAMILY_SECURITY',
    war_attr: 26, int_attr: 46, com_attr: 56, ldr_attr: 38, pol_attr: 40, dip_attr: 52, cra_attr: 48, log_attr: 54
  },
  {
    maiden_id: 'MAIDEN-XY-CRAFT', name_vi: 'Mã Thục Phượng', name_en: 'Ma Shufeng',
    settlement_id: 'xiang_yang', social_stratum: 'ARTISAN_SHOP', father_profession_vi: 'Chưởng quỹ phường dệt tơ lụa sông Hán',
    dowry_cash: 1400, dowry_item_code: 'COM-SILK', dowry_item_qty: 3,
    maternal_trait_code: 'TLT-SILK-LOOM', maternal_trait_name_vi: 'Hán Thủy Thục Chức',
    maternal_trait_desc_vi: '+20% EXP Thương Nghiệp, +2 Base COM cho con cái', bonus_stat: 'com', bonus_val: 2,
    clue_vi: 'Ái nữ phường dệt tơ lụa Tương Dương, đôi tay thoăn thoắt dệt lụa ngàn hoa.', clue_en: 'Skilled silk weaver daughter in Xiangyang river market.',
    is_married: 0, personality: 'DILIGENT', motivation: 'CRAFT_MASTERY',
    war_attr: 22, int_attr: 54, com_attr: 65, ldr_attr: 40, pol_attr: 44, dip_attr: 60, cra_attr: 68, log_attr: 52
  },
  {
    maiden_id: 'MAIDEN-XY-GENTRY', name_vi: 'Khoái Uyển Thanh', name_en: 'Kuai Wanqing',
    settlement_id: 'xiang_yang', social_stratum: 'GENTRY_CLAN', father_profession_vi: 'Khoái Thị Thế Tộc Kinh Châu',
    dowry_cash: 4600, dowry_item_code: 'COM-SILK', dowry_item_qty: 4,
    maternal_trait_code: 'TLT-SCHOLAR-LEGACY', maternal_trait_name_vi: 'Kinh Tương Thi Thư',
    maternal_trait_desc_vi: '+25% EXP Chính Trị & Mưu Lược, +2 Base POL cho con cái', bonus_stat: 'pol', bonus_val: 2,
    clue_vi: 'Thiên kim Khoái thị danh môn Kinh Châu, đoan trang nho nhã, tinh thông điển tịch.', clue_en: 'Highborn maiden of the prestigious Kuai clan in Jingzhou.',
    is_married: 0, personality: 'SCHOLARLY', motivation: 'STABILITY',
    war_attr: 20, int_attr: 76, com_attr: 60, ldr_attr: 48, pol_attr: 74, dip_attr: 72, cra_attr: 42, log_attr: 48
  },

  // --- 2. Giang Lăng (Jiang Ling) ---
  {
    maiden_id: 'MAIDEN-JL-AGRI', name_vi: 'Phùng Thủy Liên', name_en: 'Feng Shuilian',
    settlement_id: 'jiang_ling', social_stratum: 'PEASANT', father_profession_vi: 'Ngư hộ nuôi trai lấy ngọc Giang Lăng',
    dowry_cash: 440, dowry_item_code: 'COM-GRAIN', dowry_item_qty: 5,
    maternal_trait_code: 'TLT-LOTUS-SERENITY', maternal_trait_name_vi: 'Hồ Đầm Thanh Khiết',
    maternal_trait_desc_vi: '+20% Sĩ Khí Gia Tộc, +2 Base DIP cho con cái', bonus_stat: 'dip', bonus_val: 2,
    clue_vi: 'Thôn nữ hái sen đầm hồ Giang Lăng, dung nhan thanh tú, bơi lội thuần thục.', clue_en: 'Lotus-gathering river maiden of the Jiangling marshlands.',
    is_married: 0, personality: 'CALM', motivation: 'FAMILY_SECURITY',
    war_attr: 28, int_attr: 45, com_attr: 52, ldr_attr: 38, pol_attr: 38, dip_attr: 58, cra_attr: 48, log_attr: 50
  },
  {
    maiden_id: 'MAIDEN-JL-CRAFT', name_vi: 'Tống Bích Hà', name_en: 'Song Bihe',
    settlement_id: 'jiang_ling', social_stratum: 'ARTISAN_SHOP', father_profession_vi: 'Chưởng quỹ xưởng đóng thuyền Giang Lăng',
    dowry_cash: 1550, dowry_item_code: 'COM-TIMBER', dowry_item_qty: 8,
    maternal_trait_code: 'TLT-CRAFT-INGENUITY', maternal_trait_name_vi: 'Xảo Xưởng Tuệ Tâm',
    maternal_trait_desc_vi: '+15% Hiệu suất sản nghiệp, +2 Base CRA cho con cái', bonus_stat: 'cra', bonus_val: 2,
    clue_vi: 'Ái nữ xưởng đóng chiến thuyền Nam Quận, tinh thông kỹ nghệ mộc và thủy vận.', clue_en: 'Shipwright maiden in Jiangling naval docks.',
    is_married: 0, personality: 'DILIGENT', motivation: 'CRAFT_MASTERY',
    war_attr: 26, int_attr: 52, com_attr: 62, ldr_attr: 42, pol_attr: 42, dip_attr: 55, cra_attr: 70, log_attr: 55
  },
  {
    maiden_id: 'MAIDEN-JL-GENTRY', name_vi: 'Bàng Tố Trinh', name_en: 'Pang Suzhen',
    settlement_id: 'jiang_ling', social_stratum: 'GENTRY_CLAN', father_profession_vi: 'Bàng Thị Danh Gia Lộc Môn',
    dowry_cash: 4800, dowry_item_code: 'COM-SILK', dowry_item_qty: 4,
    maternal_trait_code: 'TLT-POETIC-GENIUS', maternal_trait_name_vi: 'Lộc Môn Nhã Vận',
    maternal_trait_desc_vi: '+25% EXP Mưu Lược, +2 Base INT cho con cái', bonus_stat: 'int', bonus_val: 2,
    clue_vi: 'Khuê tú Bàng thị Lộc Môn Sơn (tộc nhân Bàng Thống), am hiểu binh thư mưu lược.', clue_en: 'Scholarly daughter of the renowned Pang clan near Mount Lumen.',
    is_married: 0, personality: 'SCHOLARLY', motivation: 'STABILITY',
    war_attr: 22, int_attr: 78, com_attr: 58, ldr_attr: 50, pol_attr: 72, dip_attr: 70, cra_attr: 44, log_attr: 48
  },

  // --- 3. Tây Đô Trường An (Chang An) ---
  {
    maiden_id: 'MAIDEN-CA-AGRI', name_vi: 'Triệu Tú Quyên', name_en: 'Zhao Xiuquan',
    settlement_id: 'chang_an', social_stratum: 'PEASANT', father_profession_vi: 'Trực canh đồn điền Vị Thủy',
    dowry_cash: 480, dowry_item_code: 'COM-GRAIN', dowry_item_qty: 6,
    maternal_trait_code: 'TLT-AGRI-VIRTUE', maternal_trait_name_vi: 'Điền Viên Cần Kiệm',
    maternal_trait_desc_vi: '+25% Tốc độ hồi phục thể lực, +2 Base COM cho con cái', bonus_stat: 'com', bonus_val: 2,
    clue_vi: 'Thôn nữ đồn điền ven bờ sông Vị Thủy vùng Quan Trung, cần cù chất phác.', clue_en: 'Hardworking peasant maiden tending the Wei River state granary.',
    is_married: 0, personality: 'DILIGENT', motivation: 'FAMILY_SECURITY',
    war_attr: 26, int_attr: 46, com_attr: 55, ldr_attr: 36, pol_attr: 40, dip_attr: 50, cra_attr: 48, log_attr: 52
  },
  {
    maiden_id: 'MAIDEN-CA-CRAFT', name_vi: 'Lữ Tố Cầm', name_en: 'Lu Suqin',
    settlement_id: 'chang_an', social_stratum: 'ARTISAN_SHOP', father_profession_vi: 'Đại sư điêu khắc ngọc bích Trường An',
    dowry_cash: 1800, dowry_item_code: 'COM-SILK', dowry_item_qty: 2,
    maternal_trait_code: 'TLT-JADE-CARVING', maternal_trait_name_vi: 'Bạch Ngọc Xảo Thủ',
    maternal_trait_desc_vi: '+20% EXP Kỹ Nghệ & Điêu Khắc, +2 Base CRA cho con cái', bonus_stat: 'cra', bonus_val: 2,
    clue_vi: 'Con gái nghệ nhân khắc ngọc cự phách đất Trường An, am hiểu châu báu và ngọc tỷ.', clue_en: 'Master jade carver daughter in the historic west capital Chang\'an.',
    is_married: 0, personality: 'CALM', motivation: 'CRAFT_MASTERY',
    war_attr: 20, int_attr: 58, com_attr: 66, ldr_attr: 40, pol_attr: 46, dip_attr: 62, cra_attr: 72, log_attr: 50
  },
  {
    maiden_id: 'MAIDEN-CA-GENTRY', name_vi: 'Đỗ Nhược Hoa', name_en: 'Du Ruohua',
    settlement_id: 'chang_an', social_stratum: 'GENTRY_CLAN', father_profession_vi: 'Kinh Triệu Đỗ Thị Vọng Tộc',
    dowry_cash: 5200, dowry_item_code: 'COM-SILK', dowry_item_qty: 5,
    maternal_trait_code: 'TLT-NOBLE-DECORUM', maternal_trait_name_vi: 'Hào Môn Lễ Giáo',
    maternal_trait_desc_vi: '+25 Danh vọng gia tộc, +2 Base POL cho con cái', bonus_stat: 'pol', bonus_val: 2,
    clue_vi: 'Thiên kim Đỗ thị vọng tộc Kinh Triệu, gia phong nghiêm cẩn bậc nhất Quan Trung.', clue_en: 'Aristocratic daughter of the eminent Du lineage in the capital region.',
    is_married: 0, personality: 'HONORABLE', motivation: 'STABILITY',
    war_attr: 22, int_attr: 76, com_attr: 62, ldr_attr: 50, pol_attr: 75, dip_attr: 74, cra_attr: 40, log_attr: 46
  },

  // --- 4. Hạ Phì (Xia Pi) ---
  {
    maiden_id: 'MAIDEN-XP-AGRI', name_vi: 'Trần Mộng Thu', name_en: 'Chen Mengqiu',
    settlement_id: 'xia_pi', social_stratum: 'PEASANT', father_profession_vi: 'Nông hộ trồng dâu nuôi tằm Nghi Thủy',
    dowry_cash: 410, dowry_item_code: 'COM-GRAIN', dowry_item_qty: 5,
    maternal_trait_code: 'TLT-SERICULTURE', maternal_trait_name_vi: 'Tang Điền Tơ Lụa',
    maternal_trait_desc_vi: '+20% EXP Thương Nghiệp, +2 Base COM cho con cái', bonus_stat: 'com', bonus_val: 2,
    clue_vi: 'Thôn nữ đồng dâu ven sông Nghi Thủy đất Từ Châu, hiền lành thục đức.', clue_en: 'Silk farming maiden by the Yi River in Xu Province.',
    is_married: 0, personality: 'PRAGMATIC', motivation: 'FAMILY_SECURITY',
    war_attr: 24, int_attr: 48, com_attr: 56, ldr_attr: 36, pol_attr: 42, dip_attr: 52, cra_attr: 50, log_attr: 50
  },
  {
    maiden_id: 'MAIDEN-XP-CRAFT', name_vi: 'Đào Bích Ngọc', name_en: 'Tao Biyu',
    settlement_id: 'xia_pi', social_stratum: 'ARTISAN_SHOP', father_profession_vi: 'Chủ lò gốm tráng men Hạ Phì',
    dowry_cash: 1450, dowry_item_code: 'PROD-BASK', dowry_item_qty: 6,
    maternal_trait_code: 'TLT-POTTERY-ART', maternal_trait_name_vi: 'Đào Sứ Mỹ Nghệ',
    maternal_trait_desc_vi: '+15% Hiệu suất sản phẩm xưởng, +2 Base CRA cho con cái', bonus_stat: 'cra', bonus_val: 2,
    clue_vi: 'Khuê nữ xưởng gốm sứ tráng men Từ Châu, nức danh khéo tay tài hoa.', clue_en: 'Ceramist maiden acclaimed for decorative pottery in Xiapi.',
    is_married: 0, personality: 'DILIGENT', motivation: 'CRAFT_MASTERY',
    war_attr: 22, int_attr: 52, com_attr: 60, ldr_attr: 40, pol_attr: 44, dip_attr: 58, cra_attr: 70, log_attr: 52
  },
  {
    maiden_id: 'MAIDEN-XP-GENTRY', name_vi: 'Mi Linh Tố', name_en: 'Mi Lingsu',
    settlement_id: 'xia_pi', social_stratum: 'GENTRY_CLAN', father_profession_vi: 'Phân chi cự phú Mi Thị Từ Châu',
    dowry_cash: 5000, dowry_item_code: 'COM-SILK', dowry_item_qty: 5,
    maternal_trait_code: 'TLT-SILK-ACUMEN', maternal_trait_name_vi: 'Cự Thương Trí Tuệ',
    maternal_trait_desc_vi: '+25% EXP Thương Nghiệp, +2 Base COM cho con cái', bonus_stat: 'com', bonus_val: 2,
    clue_vi: 'Ái nữ chi tộc Mi gia cự phú Từ Châu, am tường sổ sách kinh thương ngàn dặm.', clue_en: 'Daughter of the wealthy commercial Mi lineage branch in Xiapi.',
    is_married: 0, personality: 'PRAGMATIC', motivation: 'WEALTH',
    war_attr: 20, int_attr: 72, com_attr: 75, ldr_attr: 45, pol_attr: 68, dip_attr: 74, cra_attr: 48, log_attr: 58
  },

  // --- 5. Hán Trung (Han Zhong) ---
  {
    maiden_id: 'MAIDEN-HZ-AGRI', name_vi: 'Trương Lộ Dao', name_en: 'Zhang Luyao',
    settlement_id: 'han_zhong', social_stratum: 'PEASANT', father_profession_vi: 'Nông gia hái thuốc núi Tần Lĩnh',
    dowry_cash: 390, dowry_item_code: 'COM-GRAIN', dowry_item_qty: 5,
    maternal_trait_code: 'TLT-HERBAL-WISDOM', maternal_trait_name_vi: 'Dược Sơn Tuệ Tâm',
    maternal_trait_desc_vi: '+20% EXP Trí Lực & Hồi Phục Thể Lực, +2 Base INT cho con cái', bonus_stat: 'int', bonus_val: 2,
    clue_vi: 'Thôn nữ thung lũng Hán Thủy, am tường cây thuốc thảo dược núi Tần Lĩnh.', clue_en: 'Herbal gatherer maiden in the valleys of Mount Qinling.',
    is_married: 0, personality: 'CALM', motivation: 'FAMILY_SECURITY',
    war_attr: 28, int_attr: 54, com_attr: 50, ldr_attr: 36, pol_attr: 42, dip_attr: 54, cra_attr: 52, log_attr: 48
  },
  {
    maiden_id: 'MAIDEN-HZ-CRAFT', name_vi: 'Nghiêm Tú Trâm', name_en: 'Yan Xiuzhen',
    settlement_id: 'han_zhong', social_stratum: 'ARTISAN_SHOP', father_profession_vi: 'Thợ chế tạo cung nỏ nỏ máy Hán Trung',
    dowry_cash: 1350, dowry_item_code: 'COM-TIMBER', dowry_item_qty: 6,
    maternal_trait_code: 'TLT-CRAFT-INGENUITY', maternal_trait_name_vi: 'Xảo Xưởng Tuệ Tâm',
    maternal_trait_desc_vi: '+15% Hiệu suất sản nghiệp, +2 Base CRA cho con cái', bonus_stat: 'cra', bonus_val: 2,
    clue_vi: 'Khuê nữ xưởng cơ mộc Hán Trung, chế tạo dây cung và khóa nỏ điêu luyện.', clue_en: 'Crossbow mechanical craft maiden in Hanzhong armory.',
    is_married: 0, personality: 'DILIGENT', motivation: 'CRAFT_MASTERY',
    war_attr: 32, int_attr: 50, com_attr: 58, ldr_attr: 42, pol_attr: 40, dip_attr: 50, cra_attr: 70, log_attr: 50
  },
  {
    maiden_id: 'MAIDEN-HZ-GENTRY', name_vi: 'Diêm Nhã Phương', name_en: 'Yan Yafang',
    settlement_id: 'han_zhong', social_stratum: 'GENTRY_CLAN', father_profession_vi: 'Diêm Thị Danh Môn Ba Thục',
    dowry_cash: 4200, dowry_item_code: 'COM-SILK', dowry_item_qty: 3,
    maternal_trait_code: 'TLT-NOBLE-DECORUM', maternal_trait_name_vi: 'Hào Môn Lễ Giáo',
    maternal_trait_desc_vi: '+25 Danh vọng gia tộc, +2 Base POL cho con cái', bonus_stat: 'pol', bonus_val: 2,
    clue_vi: 'Thiên kim Diêm gia Hán Trung, gia giáo nề nếp, khí chất thâm trầm đoan trang.', clue_en: 'Noble lady of the scholarly Yan lineage in Hanzhong commandery.',
    is_married: 0, personality: 'HONORABLE', motivation: 'STABILITY',
    war_attr: 20, int_attr: 74, com_attr: 58, ldr_attr: 46, pol_attr: 72, dip_attr: 68, cra_attr: 44, log_attr: 48
  },

  // --- 6. Vũ Uy & Tây Lương (Wu Wei) ---
  {
    maiden_id: 'MAIDEN-WW-AGRI', name_vi: 'Khương Thảo Nương', name_en: 'Jiang Caoniang',
    settlement_id: 'wu_wei', social_stratum: 'PEASANT', father_profession_vi: 'Mục dân chăn thả ngựa cừu Lương Châu',
    dowry_cash: 380, dowry_item_code: 'COM-HORSE-W', dowry_item_qty: 1,
    maternal_trait_code: 'TLT-NOMADIC-VIGOR', maternal_trait_name_vi: 'Biên Thảo Kiên Cường',
    maternal_trait_desc_vi: '+20% EXP Võ Lực & Kháng Mệt Mỏi, +2 Base WAR cho con cái', bonus_stat: 'war', bonus_val: 2,
    clue_vi: 'Mục nữ thảo nguyên Tây Lương, cưỡi ngựa như bay, tính tình bộc trực hào phóng.', clue_en: 'Spirited nomadic herder maiden on the wind-swept Xiliang plains.',
    is_married: 0, personality: 'VALIANT', motivation: 'FAMILY_SECURITY',
    war_attr: 42, int_attr: 40, com_attr: 50, ldr_attr: 45, pol_attr: 32, dip_attr: 46, cra_attr: 46, log_attr: 58
  },
  {
    maiden_id: 'MAIDEN-WW-CRAFT', name_vi: 'Diệp Thục Trinh', name_en: 'Ye Shuzhen',
    settlement_id: 'wu_wei', social_stratum: 'ARTISAN_SHOP', father_profession_vi: 'Chưởng quỹ xưởng thuộc da thú Tây Vực',
    dowry_cash: 1300, dowry_item_code: 'COM-LEATH', dowry_item_qty: 8,
    maternal_trait_code: 'TLT-LEATHER-CRAFT', maternal_trait_name_vi: 'Tây Vực Da Thuộc',
    maternal_trait_desc_vi: '+15% Hiệu suất giáp da xưởng, +2 Base CRA cho con cái', bonus_stat: 'cra', bonus_val: 2,
    clue_vi: 'Khuê nữ xưởng may giáp da chiến mã Vũ Uy, tay nghề khâu vá giáp trụ tinh vi.', clue_en: 'Skilled leather armor artisan maiden in frontier Wuwei.',
    is_married: 0, personality: 'DILIGENT', motivation: 'CRAFT_MASTERY',
    war_attr: 30, int_attr: 48, com_attr: 62, ldr_attr: 40, pol_attr: 38, dip_attr: 52, cra_attr: 70, log_attr: 54
  },
  {
    maiden_id: 'MAIDEN-WW-GENTRY', name_vi: 'Lương Nguyệt Kiều', name_en: 'Liang Yueqiao',
    settlement_id: 'wu_wei', social_stratum: 'GENTRY_CLAN', father_profession_vi: 'Lương Châu Hào Tộc Lương Thị',
    dowry_cash: 4300, dowry_item_code: 'COM-HORSE-W', dowry_item_qty: 2,
    maternal_trait_code: 'TLT-FRONTIER-NOBLE', maternal_trait_name_vi: 'Biên Cương Danh Môn',
    maternal_trait_desc_vi: '+20% EXP Thống Soái & Võ Lực, +2 Base LDR cho con cái', bonus_stat: 'ldr', bonus_val: 2,
    clue_vi: 'Thiên kim Lương thị vọng tộc đất Lương Châu, cốt cách anh hào, am tường tài chính biên giới.', clue_en: 'Frontier noble maiden of the prominent Liang family in Liangzhou.',
    is_married: 0, personality: 'HONORABLE', motivation: 'HEGEMONY',
    war_attr: 35, int_attr: 70, com_attr: 64, ldr_attr: 60, pol_attr: 65, dip_attr: 68, cra_attr: 42, log_attr: 56
  },

  // --- 7. Uyển Thành (Wan Cheng) ---
  {
    maiden_id: 'MAIDEN-WC-AGRI', name_vi: 'Hoàng Thu Dung', name_en: 'Huang Qiurong',
    settlement_id: 'wan_cheng', social_stratum: 'PEASANT', father_profession_vi: 'Nông gia bãi bồi sông Dục Thủy Nam Dương',
    dowry_cash: 420, dowry_item_code: 'COM-GRAIN', dowry_item_qty: 6,
    maternal_trait_code: 'TLT-AGRI-VIRTUE', maternal_trait_name_vi: 'Điền Viên Cần Kiệm',
    maternal_trait_desc_vi: '+25% Tốc độ hồi phục thể lực, +2 Base COM cho con cái', bonus_stat: 'com', bonus_val: 2,
    clue_vi: 'Thôn nữ bãi bồi ven sông Dục Thủy, chăm chỉ đồng áng tích trữ lương thực.', clue_en: 'Farming maiden on the fertile river flats near Wancheng.',
    is_married: 0, personality: 'DILIGENT', motivation: 'FAMILY_SECURITY',
    war_attr: 25, int_attr: 46, com_attr: 55, ldr_attr: 36, pol_attr: 40, dip_attr: 50, cra_attr: 48, log_attr: 52
  },
  {
    maiden_id: 'MAIDEN-WC-CRAFT', name_vi: 'Ân Mỹ Linh', name_en: 'Yin Meiling',
    settlement_id: 'wan_cheng', social_stratum: 'ARTISAN_SHOP', father_profession_vi: 'Chưởng phường lò rèn đúc sắt Nam Dương',
    dowry_cash: 1480, dowry_item_code: 'COM-IRON', dowry_item_qty: 8,
    maternal_trait_code: 'TLT-IRON-SMITH', maternal_trait_name_vi: 'Nam Dương Thiết Đúc',
    maternal_trait_desc_vi: '+15% Hiệu suất xưởng rèn, +2 Base CRA cho con cái', bonus_stat: 'cra', bonus_val: 2,
    clue_vi: 'Ái nữ chưởng phường đúc sắt Nam Dương lừng danh, am hiểu các loại quặng sắt luyện kim.', clue_en: 'Ironsmith craft maiden in Nanyang historic foundry center.',
    is_married: 0, personality: 'DILIGENT', motivation: 'CRAFT_MASTERY',
    war_attr: 32, int_attr: 50, com_attr: 62, ldr_attr: 40, pol_attr: 40, dip_attr: 54, cra_attr: 72, log_attr: 50
  },
  {
    maiden_id: 'MAIDEN-WC-GENTRY', name_vi: 'Đặng Du Khanh', name_en: 'Deng Youqing',
    settlement_id: 'wan_cheng', social_stratum: 'GENTRY_CLAN', father_profession_vi: 'Nam Dương Đặng Thị Thế Tộc',
    dowry_cash: 4700, dowry_item_code: 'COM-SILK', dowry_item_qty: 4,
    maternal_trait_code: 'TLT-NOBLE-DECORUM', maternal_trait_name_vi: 'Hào Môn Lễ Giáo',
    maternal_trait_desc_vi: '+25 Danh vọng gia tộc, +2 Base POL cho con cái', bonus_stat: 'pol', bonus_val: 2,
    clue_vi: 'Thiên kim Đặng thị Nam Dương (dòng dõi Đặng Vũ khai quốc khai cơ), đoan trang lễ nghi.', clue_en: 'Aristocratic daughter of the Deng clan in Nanyang.',
    is_married: 0, personality: 'HONORABLE', motivation: 'STABILITY',
    war_attr: 22, int_attr: 75, com_attr: 60, ldr_attr: 48, pol_attr: 74, dip_attr: 72, cra_attr: 42, log_attr: 48
  },

  // --- 8. Kế Thành & Bắc Bình (Ji Cheng) ---
  {
    maiden_id: 'MAIDEN-JC-AGRI', name_vi: 'Hàn Tố Nương', name_en: 'Han Suniang',
    settlement_id: 'ji_cheng', social_stratum: 'PEASANT', father_profession_vi: 'Nông gia trồng lúa mạch vùng hàn bắc',
    dowry_cash: 400, dowry_item_code: 'COM-GRAIN', dowry_item_qty: 5,
    maternal_trait_code: 'TLT-FROST-RESILIENCE', maternal_trait_name_vi: 'Phong Tuyết Can Trường',
    maternal_trait_desc_vi: '+20% EXP Võ Lực & Sức Bền, +2 Base WAR cho con cái', bonus_stat: 'war', bonus_val: 2,
    clue_vi: 'Thôn nữ vùng giá buốt Kế Thành U Châu, chịu đựng gió rét dẻo dai kiên cường.', clue_en: 'Peasant maiden resilient against northern frost near Jicheng.',
    is_married: 0, personality: 'DILIGENT', motivation: 'FAMILY_SECURITY',
    war_attr: 35, int_attr: 44, com_attr: 52, ldr_attr: 40, pol_attr: 35, dip_attr: 48, cra_attr: 46, log_attr: 54
  },
  {
    maiden_id: 'MAIDEN-JC-CRAFT', name_vi: 'Liễu Tú Anh', name_en: 'Liu Xiuying',
    settlement_id: 'ji_cheng', social_stratum: 'ARTISAN_SHOP', father_profession_vi: 'Thợ chế tạo yên cương chiến mã Bắc Bình',
    dowry_cash: 1380, dowry_item_code: 'COM-LEATH', dowry_item_qty: 5,
    maternal_trait_code: 'TLT-HARNESS-MAKER', maternal_trait_name_vi: 'Bắc Bình Mã Cụ',
    maternal_trait_desc_vi: '+15% Hiệu suất chế tạo trang bị, +2 Base CRA cho con cái', bonus_stat: 'cra', bonus_val: 2,
    clue_vi: 'Khuê nữ xưởng yên cương ngựa chiến Bắc Bình, rành rẽ da thuộc và thiết giáp kỵ binh.', clue_en: 'Saddlery craft maiden serving northern cavalry regiments.',
    is_married: 0, personality: 'PRAGMATIC', motivation: 'CRAFT_MASTERY',
    war_attr: 28, int_attr: 52, com_attr: 60, ldr_attr: 44, pol_attr: 38, dip_attr: 54, cra_attr: 68, log_attr: 52
  },
  {
    maiden_id: 'MAIDEN-JC-GENTRY', name_vi: 'Công Tôn Nhược Yến', name_en: 'Gongsun Ruoyan',
    settlement_id: 'ji_cheng', social_stratum: 'GENTRY_CLAN', father_profession_vi: 'Công Tôn Thị Chi Tộc Bắc Bình',
    dowry_cash: 4500, dowry_item_code: 'COM-HORSE-W', dowry_item_qty: 2,
    maternal_trait_code: 'TLT-WHITE-HORSE-HERITAGE', maternal_trait_name_vi: 'Bạch Mã Khí Phách',
    maternal_trait_desc_vi: '+25% EXP Kỵ Binh & Thống Soái, +2 Base LDR cho con cái', bonus_stat: 'ldr', bonus_val: 2,
    clue_vi: 'Khuê tú chi tộc Công Tôn thị, am hiểu chiến mã thảo nguyên và thuật bắn cung trên lưng ngựa.', clue_en: 'Noble maiden of the Gongsun clan famous for White Horse cavalry.',
    is_married: 0, personality: 'VALIANT', motivation: 'HEGEMONY',
    war_attr: 38, int_attr: 68, com_attr: 58, ldr_attr: 62, pol_attr: 60, dip_attr: 65, cra_attr: 44, log_attr: 55
  },

  // --- 9. Xích Bích & Sài Tang (Chi Bi) ---
  {
    maiden_id: 'MAIDEN-CB-AGRI', name_vi: 'Sở Tiêu Tiêu', name_en: 'Chu Xiaoxiao',
    settlement_id: 'chi_bi', social_stratum: 'PEASANT', father_profession_vi: 'Nông gia hái dâu nuôi tằm ven hồ Bà Dương',
    dowry_cash: 410, dowry_item_code: 'COM-GRAIN', dowry_item_qty: 5,
    maternal_trait_code: 'TLT-SERICULTURE', maternal_trait_name_vi: 'Bà Dương Tang Ma',
    maternal_trait_desc_vi: '+20% EXP Thương Nghiệp, +2 Base COM cho con cái', bonus_stat: 'com', bonus_val: 2,
    clue_vi: 'Nữ tử hiền dịu ven hồ Bà Dương, hái dâu nuôi tằm, chất phác thuần hậu.', clue_en: 'Sericulture peasant maiden beside Poyang Lake.',
    is_married: 0, personality: 'CALM', motivation: 'FAMILY_SECURITY',
    war_attr: 22, int_attr: 45, com_attr: 55, ldr_attr: 35, pol_attr: 38, dip_attr: 54, cra_attr: 50, log_attr: 50
  },
  {
    maiden_id: 'MAIDEN-CB-CRAFT', name_vi: 'Tần Diễm Nương', name_en: 'Qin Yannian',
    settlement_id: 'chi_bi', social_stratum: 'ARTISAN_SHOP', father_profession_vi: 'Đại sư đúc đồng và chuông đồng Sài Tang',
    dowry_cash: 1500, dowry_item_code: 'COM-IRON', dowry_item_qty: 6,
    maternal_trait_code: 'TLT-BRONZE-ART', maternal_trait_name_vi: 'Sài Tang Đồng Đúc',
    maternal_trait_desc_vi: '+15% Hiệu suất sản nghiệp, +2 Base CRA cho con cái', bonus_stat: 'cra', bonus_val: 2,
    clue_vi: 'Ái nữ nghệ nhân đúc đồng Sài Tang, rành rẽ kim khí và phối trộn đồng thiếc.', clue_en: 'Bronze foundry craft maiden in Saitang lakeside port.',
    is_married: 0, personality: 'DILIGENT', motivation: 'CRAFT_MASTERY',
    war_attr: 24, int_attr: 52, com_attr: 62, ldr_attr: 40, pol_attr: 42, dip_attr: 56, cra_attr: 70, log_attr: 52
  },
  {
    maiden_id: 'MAIDEN-CB-GENTRY', name_vi: 'Lục Giai Tuệ', name_en: 'Lu Jiahui',
    settlement_id: 'chi_bi', social_stratum: 'GENTRY_CLAN', father_profession_vi: 'Ngô Quận Lục Thị Vọng Tộc',
    dowry_cash: 4900, dowry_item_code: 'COM-SILK', dowry_item_qty: 4,
    maternal_trait_code: 'TLT-HARMONIOUS-AESTHETIC', maternal_trait_name_vi: 'Giang Nam Cầm Vận',
    maternal_trait_desc_vi: '+20% Sĩ Khí Gia Tộc, +2 Base DIP cho con cái', bonus_stat: 'dip', bonus_val: 2,
    clue_vi: 'Danh viện Lục gia Giang Nam, dung mạo tú nhã, ngón đàn cổ tranh nức tiếng ven hồ.', clue_en: 'Graceful aristocrat of the prominent Lu clan in Jiangnan.',
    is_married: 0, personality: 'BENEVOLENT', motivation: 'PEACE',
    war_attr: 20, int_attr: 75, com_attr: 60, ldr_attr: 48, pol_attr: 70, dip_attr: 76, cra_attr: 44, log_attr: 46
  },

  // --- 10. Thọ Xuân (Shou Chun) ---
  {
    maiden_id: 'MAIDEN-SC-AGRI', name_vi: 'Diệp Thải Vi', name_en: 'Ye Caiwei',
    settlement_id: 'shou_chun', social_stratum: 'PEASANT', father_profession_vi: 'Nông hộ trồng lúa nước đầm lầy Hoài Nam',
    dowry_cash: 430, dowry_item_code: 'COM-GRAIN', dowry_item_qty: 6,
    maternal_trait_code: 'TLT-LOTUS-SERENITY', maternal_trait_name_vi: 'Hoài Nam Thủy Hương',
    maternal_trait_desc_vi: '+20% Sĩ Khí Gia Tộc, +2 Base DIP cho con cái', bonus_stat: 'dip', bonus_val: 2,
    clue_vi: 'Thôn nữ hái củ ấu đầm nước Hoài Nam, tính cách nhu mì đôn hậu.', clue_en: 'Water chestnut harvester maiden in fertile Huainan marshes.',
    is_married: 0, personality: 'CALM', motivation: 'FAMILY_SECURITY',
    war_attr: 24, int_attr: 46, com_attr: 54, ldr_attr: 36, pol_attr: 40, dip_attr: 56, cra_attr: 48, log_attr: 50
  },
  {
    maiden_id: 'MAIDEN-SC-CRAFT', name_vi: 'Trịnh Mỹ Châu', name_en: 'Zheng Meizhou',
    settlement_id: 'shou_chun', social_stratum: 'ARTISAN_SHOP', father_profession_vi: 'Chủ phường ủ rượu hoa cúc Thọ Xuân',
    dowry_cash: 1520, dowry_item_code: 'COM-WINE', dowry_item_qty: 4,
    maternal_trait_code: 'TLT-BREWING-ART', maternal_trait_name_vi: 'Cúc Hoa Rượu Nghệ',
    maternal_trait_desc_vi: '+15% Hiệu suất sản nghiệp, +2 Base CRA cho con cái', bonus_stat: 'cra', bonus_val: 2,
    clue_vi: 'Khuê nữ xưởng nấu mỹ tửu Thọ Xuân, nắm giữ bí thuật ủ men rượu cúc thơm ngát.', clue_en: 'Brewmaster maiden crafting prized chrysanthemum wine in Shouchun.',
    is_married: 0, personality: 'PRAGMATIC', motivation: 'WEALTH',
    war_attr: 22, int_attr: 54, com_attr: 66, ldr_attr: 40, pol_attr: 42, dip_attr: 60, cra_attr: 70, log_attr: 52
  },
  {
    maiden_id: 'MAIDEN-SC-GENTRY', name_vi: 'Viên Tố Đình', name_en: 'Yuan Suding',
    settlement_id: 'shou_chun', social_stratum: 'GENTRY_CLAN', father_profession_vi: 'Hoài Nam Viên Thị Chi Tộc',
    dowry_cash: 5100, dowry_item_code: 'COM-SILK', dowry_item_qty: 4,
    maternal_trait_code: 'TLT-NOBLE-DECORUM', maternal_trait_name_vi: 'Hào Môn Lễ Giáo',
    maternal_trait_desc_vi: '+25 Danh vọng gia tộc, +2 Base POL cho con cái', bonus_stat: 'pol', bonus_val: 2,
    clue_vi: 'Tiểu thư Viên thị Hoài Nam (chi tộc Viên Thuật), phong tư cao nhã, cẩm y ngọc thực.', clue_en: 'Highborn lady of the Yuan clan branch in Shouchun.',
    is_married: 0, personality: 'HONORABLE', motivation: 'HEGEMONY',
    war_attr: 20, int_attr: 74, com_attr: 64, ldr_attr: 48, pol_attr: 72, dip_attr: 74, cra_attr: 42, log_attr: 46
  }
];

const insertMaiden = db.prepare(`
  INSERT OR REPLACE INTO civilian_maidens (
    maiden_id, name_vi, name_en, settlement_id, social_stratum, father_profession_vi,
    dowry_cash, dowry_item_code, dowry_item_qty,
    maternal_trait_code, maternal_trait_name_vi, maternal_trait_desc_vi,
    bonus_stat, bonus_val, clue_vi, clue_en, is_married, personality, motivation,
    war_attr, int_attr, com_attr, ldr_attr, pol_attr, dip_attr, cra_attr, log_attr
  ) VALUES (
    @maiden_id, @name_vi, @name_en, @settlement_id, @social_stratum, @father_profession_vi,
    @dowry_cash, @dowry_item_code, @dowry_item_qty,
    @maternal_trait_code, @maternal_trait_name_vi, @maternal_trait_desc_vi,
    @bonus_stat, @bonus_val, @clue_vi, @clue_en, @is_married, @personality, @motivation,
    @war_attr, @int_attr, @com_attr, @ldr_attr, @pol_attr, @dip_attr, @cra_attr, @log_attr
  );
`);

db.transaction(() => {
  for (const m of extendedCivilianMaidens) {
    insertMaiden.run(m);
  }
})();
console.log(`Seeded ${extendedCivilianMaidens.length} extended civilian maidens across 10 strategic settlements.`);

const totalMaidens = db.prepare('SELECT count(*) as cnt FROM civilian_maidens').get().cnt;
console.log(`Total civilian_maidens in database now: ${totalMaidens}`);

db.close();
console.log('Seeding completed successfully!');
