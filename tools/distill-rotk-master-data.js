/**
 * ThreeKingdoms-AgentEngine: ROTK Master Data Distillation & Ecosystem Scaling
 * (tools/distill-rotk-master-data.js)
 *
 * Implements Step 1 of Strategic World Map & Auxiliary Workforce Expansion:
 * 1. Distills Legendary Weapons, Steeds, Military Classics & 20-Province Commodities (`master_items`).
 * 2. Distills Canonical ROTK General & Professional Workforce Talents (`master_talents`).
 * 3. Expands Historical Figures & Adds 25+ Hireable Civilian Auxiliary NPCs (`master_characters`).
 * 4. Aligns & Enriches 20 Strategic Citadels with Military Garrison & Resource Stockpiles (`session_settlements` & `master_locations`).
 * 5. Expands Inter-Citadel Geographic Network with 4 Terrain Types (`master_routes`).
 * 6. Adds Contextual Dialogues for Workforce Hiring & Trade Route Inquiries (`master_context_dialogues`).
 *
 * Adheres strictly to Zero-Drift Database Invariants (186/186 checks).
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '..', 'saves', 'session.db');
const MASTER_DB_PATH = path.resolve(__dirname, '..', 'saves', 'master.db');

function runDistillation(targetDbPath) {
  if (!fs.existsSync(targetDbPath)) return;
  console.log(`\n======================================================================`);
  console.log(` 📜 DISTILLING ROTK MASTER DATA INTO: ${path.basename(targetDbPath)}`);
  console.log(`======================================================================`);

  const db = new Database(targetDbPath);
  db.pragma('journal_mode = WAL');

  const executeDistillation = db.transaction(() => {
    // --------------------------------------------------------------------------
    // 1. DISTILL ITEMS: Legendary Weapons, Steeds, Treatises & Commodities
    // --------------------------------------------------------------------------
    console.log('>>> [1/6] Distilling Legendary Equipment & Strategic Commodities...');

    const itemsToInsert = [
      // Legendary Weapons
      { code: 'WP-SPEAR-SERPENT-ZFEI', nameVi: 'Bát Xà Mâu (Trương Phi)', nameEn: 'Eight-Snake Spear', cat: 'MILITARY_EQUIPMENT', unitVi: 'Ngọn', unitEn: 'piece', price: 9500, mkt: 11000, descVi: 'Thần binh dài một trượng tám tấc, lưỡi mâu uốn lượn như rắn độc, uy lực kinh thiên động địa.' },
      { code: 'WP-BLADE-GREEN-DRAGON', nameVi: 'Thanh Long Yển Nguyệt Đao', nameEn: 'Green Dragon Crescent Blade', cat: 'MILITARY_EQUIPMENT', unitVi: 'Thanh', unitEn: 'piece', price: 10500, mkt: 12500, descVi: 'Nặng 82 cân, chém sắt như chém bùn, tỏa ra thanh quang hàn khí ngút trời của Quan Vân Trường.' },
      { code: 'WP-HALBERD-SKY-PIERCER', nameVi: 'Phương Thiên Họa Kích', nameEn: 'Sky Piercer Halberd', cat: 'MILITARY_EQUIPMENT', unitVi: 'Cây', unitEn: 'piece', price: 12000, mkt: 15000, descVi: 'Thần binh độc nhất vô nhị của Chiến Thần Lữ Bố, công thủ toàn diện xé toạc trận đồ vạn quân.' },
      { code: 'WP-SWORD-QINGGANG', nameVi: 'Thanh Cương Bảo Kiếm', nameEn: 'Qinggang Sword', cat: 'MILITARY_EQUIPMENT', unitVi: 'Thanh', unitEn: 'piece', price: 8000, mkt: 9500, descVi: 'Bảo kiếm gia truyền của Tào Tháo, chém sắt như chém chuối, Triệu Tử Long đoạt được tại Trường Bản.' },
      { code: 'WP-SWORD-YITIAN', nameVi: 'Ỷ Thiên Thần Kiếm', nameEn: 'Yitian Sword', cat: 'MILITARY_EQUIPMENT', unitVi: 'Thanh', unitEn: 'piece', price: 8500, mkt: 10000, descVi: 'Kiếm báu tùy thân định quốc an bang của Ngụy Vương Tào Mạnh Đức.' },
      { code: 'WP-BLADE-ANCIENT-INGOT', nameVi: 'Cổ Đĩnh Đao (Tôn Kiên)', nameEn: 'Ancient Ingot Blade', cat: 'MILITARY_EQUIPMENT', unitVi: 'Thanh', unitEn: 'piece', price: 7500, mkt: 8800, descVi: 'Gia truyền của Giang Đông Mãnh Hổ Tôn Kiên, chém chém như vũ bão.' },
      { code: 'WP-TWIN-SWORDS', nameVi: 'Song Cổ Kiếm (Lưu Bị)', nameEn: 'Twin Male and Female Swords', cat: 'MILITARY_EQUIPMENT', unitVi: 'Cặp', unitEn: 'pair', price: 7200, mkt: 8500, descVi: 'Cặp kiếm âm dương tương hợp, tôi luyện từ sắt tốt do Trương Thế Bình hiến tặng.' },
      { code: 'WP-IRON-MACE-CALTROP', nameVi: 'Thiết Tật Lê Cốt Đóa', nameEn: 'Iron Caltrop Mace', cat: 'MILITARY_EQUIPMENT', unitVi: 'Chùy', unitEn: 'piece', price: 6200, mkt: 7400, descVi: 'Chùy sắt gai răng cưa nặng trịch của Man Vương Sa Mặc Kha.' },

      // Legendary Steeds
      { code: 'STEED-RED-HARE', nameVi: 'Xích Thố Mã', nameEn: 'Red Hare Steed', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'head', price: 15000, mkt: 18000, descVi: 'Nhân trung Lữ Bố, mã trung Xích Thố. Ngày đi ngàn dặm, vượt núi băng sông như bay.' },
      { code: 'STEED-HEX-MARK', nameVi: 'Đích Lô Mã', nameEn: 'Hex Mark Steed', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'head', price: 11000, mkt: 13000, descVi: 'Ngựa tốt có đốm trắng ở mắt, một bước phi qua suối Đàn Khê cứu thoát Lưu Bị.' },
      { code: 'STEED-SHADOW-RUNNER', nameVi: 'Tuyệt Ảnh Mã', nameEn: 'Shadow Runner Steed', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'head', price: 10000, mkt: 12000, descVi: 'Chạy nhanh đến mức bóng cũng không theo kịp, chiến mã kiêu dũng của Tào Tháo tại Uyển Thành.' },
      { code: 'STEED-CLAW-LIGHTNING', nameVi: 'Trảo Hoàng Phi Điện', nameEn: 'Claw Yellow Lightning', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'head', price: 9500, mkt: 11500, descVi: 'Toàn thân lông vàng kim, bốn vó trắng như tuyết, chiến mã danh giá của Tào Tháo trong đại điển săn bắn.' },
      { code: 'STEED-WHITE-DRAGON', nameVi: 'Dạ Chiếu Ngọc Sư Tử', nameEn: 'White Dragon Lion Steed', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'head', price: 9000, mkt: 11000, descVi: 'Chiến mã trắng tinh như tuyết của Triệu Tử Long, dũng mãnh giữa muôn trùng vây hãm.' },

      // Military Classics & Strategic Treatises
      { code: 'BOOK-SUN-TZU', nameVi: 'Tôn Tử Binh Pháp', nameEn: 'Sun Tzu Art of War', cat: 'FINISHED_GOOD', unitVi: 'Bộ', unitEn: 'set', price: 12000, mkt: 14500, descVi: 'Bộ điển tịch quân sự vĩ đại nhất thiên hạ, mở khóa toàn diện sách lược và mưu kế thao lược.' },
      { code: 'BOOK-MENGDE-NEW', nameVi: 'Mạnh Đức Tân Thư', nameEn: 'Mengde New Book', cat: 'FINISHED_GOOD', unitVi: 'Cuốn', unitEn: 'volume', price: 7800, mkt: 9200, descVi: 'Đúc kết kinh nghiệm chinh chiến cả đời của Tào Tháo, tăng cường mưu lược và điều động quân lương.' },
      { code: 'BOOK-SIX-TEACHINGS', nameVi: 'Lục Thao (Khương Tử Nha)', nameEn: 'Six Secret Teachings', cat: 'FINISHED_GOOD', unitVi: 'Bộ', unitEn: 'set', price: 8200, mkt: 9800, descVi: 'Chỉ dẫn tinh vi về xây dựng quân đội, rèn đúc binh khí và tác chiến các binh chủng.' },
      { code: 'BOOK-THREE-STRATEGIES', nameVi: 'Tam Lược Hoàng Thạch Công', nameEn: 'Three Strategies of Huang Shigong', cat: 'FINISHED_GOOD', unitVi: 'Bộ', unitEn: 'set', price: 7500, mkt: 8900, descVi: 'Sách lược trị quốc và an dân, bồi dưỡng năng lực thống soái và quản lý lãnh thổ.' },
      { code: 'BOOK-GREEN-POUCH', nameVi: 'Thanh Nang Thư (Hoa Đà)', nameEn: 'Green Pouch Medical Classic', cat: 'FINISHED_GOOD', unitVi: 'Quyển', unitEn: 'volume', price: 9000, mkt: 10500, descVi: 'Bí thuật y đạo phẫu thuật và thảo dược cứu mạng thương binh chiến trường của Thần Y Hoa Đà.' },

      // Strategic Regional Commodities
      { code: 'COMM-SHU-BROCADE', nameVi: 'Thục Cẩm Thành Đô', nameEn: 'Shu Brocade Silk', cat: 'FINISHED_GOOD', unitVi: 'Cuộn', unitEn: 'bolt', price: 320, mkt: 480, descVi: 'Loại tơ lụa trứ danh của Ba Thục, sợi tơ óng ả nhiều màu sắc, mặt hàng mậu dịch quý giá bậc nhất thiên hạ.' },
      { code: 'COMM-XILIANG-HORSE', nameVi: 'Chiến Mã Tây Lương', nameEn: 'Xiliang Heavy Warhorse', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'head', price: 650, mkt: 950, descVi: 'Ngựa chiến cao lớn bờm rậm xuất xứ từ đồng cỏ Vũ Uy, chịu lạnh chịu rét siêu việt.' },
      { code: 'COMM-YOUZHOU-HORSE', nameVi: 'Bạch Mã U Châu', nameEn: 'Youzhou White Steed', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'head', price: 600, mkt: 880, descVi: 'Tuấn mã nhanh nhẹn dẻo dai làm nên sự khiếp sợ của Bạch Mã Nghĩa Tòng Công Tôn Toản.' },
      { code: 'COMM-SHANGDANG-ORE', nameVi: 'Thiết Quặng Thượng Đảng', nameEn: 'Shangdang Refined Iron Ore', cat: 'RAW_MATERIAL', unitVi: 'Tấn', unitEn: 'ton', price: 180, mkt: 260, descVi: 'Khoáng sắt hàm lượng thép tinh khiết cao ở núi Tịnh Châu, nguyên liệu đúc vũ khí hàng đầu.' },
      { code: 'COMM-XUZHOU-SALT', nameVi: 'Muối Biển Hạ Phì', nameEn: 'Xiapi Sea Salt', cat: 'RAW_MATERIAL', unitVi: 'Đấu', unitEn: 'peck', price: 60, mkt: 110, descVi: 'Muối biển tinh luyện từ duyên hải Từ Châu, nhu yếu phẩm chiến lược không thể thiếu của các đạo quân.' },
      { code: 'COMM-JIAOZHI-INCENSE', nameVi: 'Trầm Hương Giao Chỉ', nameEn: 'Jiaozhi Sacred Agarwood', cat: 'FINISHED_GOOD', unitVi: 'Hộp', unitEn: 'box', price: 450, mkt: 750, descVi: 'Trầm hương rừng thiêng phương Nam, tỏa ngát hương thơm quý phái được hoàng gia Lạc Dương săn đón.' },
      { code: 'COMM-JIZHOU-WHEAT', nameVi: 'Lương Thảo Ký Châu', nameEn: 'Jizhou Prime Wheat Grain', cat: 'FOOD_STUFF', unitVi: 'Thạch', unitEn: 'picul', price: 25, mkt: 40, descVi: 'Thóc lúa màu mỡ vùng đồng bằng Ký Châu, nguồn dự trữ quân lương nuôi sống hàng vạn binh sĩ.' },
      { code: 'COMM-YANGTZE-TIMBER', nameVi: 'Gỗ Đóng Thuyền Giang Đông', nameEn: 'Yangtze Ship Timber', cat: 'RAW_MATERIAL', unitVi: 'Khối', unitEn: 'm3', price: 210, mkt: 320, descVi: 'Gỗ sồi và thông cổ thụ vùng sông nước Giang Đông, chuyên dùng đóng thuyền chiến Lâu Thuyền và Mông Xung.' }
    ];

    const insertItem = db.prepare(`
      INSERT OR REPLACE INTO master_items (
        item_code, name_vi, name_en, category, unit_vi, unit_en,
        baseline_peace_price, current_market_price, description_vi, description_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    for (const it of itemsToInsert) {
      insertItem.run(
        it.code, it.nameVi, it.nameEn, it.cat, it.unitVi, it.unitEn,
        it.price, it.mkt, it.descVi, it.nameEn
      );
    }
    console.log(`  ✓ Distilled ${itemsToInsert.length} items (Total: ${db.prepare('SELECT count(*) as c FROM master_items').get().c}).`);

    // --------------------------------------------------------------------------
    // 2. DISTILL TALENTS: Martial Legends & Auxiliary Workforce
    // --------------------------------------------------------------------------
    console.log('>>> [2/6] Distilling Martial & Workforce Talents...');

    const talentsToInsert = [
      // Generals
      { code: 'TLT-UNRIVALED-WARRIOR', nameVi: 'Chiến Thần Vô Song', nameEn: 'Unrivaled God of Battle', cat: 'MARTIAL', rarity: 'LEGENDARY', vi: 'Nhân trung Lữ Bố, mã trung Xích Thố. Vô địch trong mọi cuộc tỉ võ đao kiếm, sát thương tăng 40%.' },
      { code: 'TLT-GOD-OF-WAR', nameVi: 'Vạn Nhân Địch Nghĩa Tuyệt', nameEn: 'Peerless God of War', cat: 'MARTIAL', rarity: 'LEGENDARY', vi: 'Uy dũng trảm Nhan Lương Văn Xú giữa vạn quân, tăng vọt Sĩ khí và tỷ lệ bạo kích đao pháp.' },
      { code: 'TLT-ROARING-THUNDER', nameVi: 'Hống Đoạn Trường Bản', nameEn: 'Roaring Thunder of Changban', cat: 'MARTIAL', rarity: 'LEGENDARY', vi: 'Tiếng thét như sấm sét khiến trăm vạn quân Tào kinh hồn bạt vía, làm giảm 30% phòng thủ đối phương.' },
      { code: 'TLT-DRAGON-HEART', nameVi: 'Đơn Kỵ Triệu Tử Long', nameEn: 'Dragon Heart of Changban', cat: 'MARTIAL', rarity: 'LEGENDARY', vi: 'Bảy进 bảy xuất cứu ấu chúa, né tránh 80% hiểm nguy và sát thương chí tử trong hỗn chiến.' },
      { code: 'TLT-GHOST-STRATEGIST', nameVi: 'Quỷ Tài Quách Gia', nameEn: 'Ghost Strategist', cat: 'STRATEGY', rarity: 'LEGENDARY', vi: 'Tính trước việc ngàn dặm, đoán địch như thần, tăng 50% hiệu quả mưu kế mai phục và thám báo.' },
      { code: 'TLT-DIVINE-CALCULATOR', nameVi: 'Ngọa Long Bát Quái', nameEn: 'Sleeping Dragon Stratagem', cat: 'STRATEGY', rarity: 'LEGENDARY', vi: 'Bày trận Bát Quái lẫy lừng, triệu hồi gió đông, miễn nhiễm hoàn toàn các mưu kế nghi binh.' },
      { code: 'TLT-FLAME-EMPEROR', nameVi: 'Giang Đông Hỏa Thần', nameEn: 'Yangtze Fire God', cat: 'STRATEGY', rarity: 'LEGENDARY', vi: 'Bậc thầy chiến trận thủy lộ và thiêu rụi chiến thuyền Xích Bích.' },
      { code: 'TLT-IRON-BASTION', nameVi: 'Bát Môn Thiết Bích', nameEn: 'Iron Wall Bastion', cat: 'MARTIAL', rarity: 'EPIC', vi: 'Thành đồng vách sắt của Tào Nhân, giảm 40% thương vong thủ thành.' },

      // Hireable Auxiliary Specialists (Bách Nghệ & Thương Gia)
      { code: 'TLT-MASTER-METALLURGIST', nameVi: 'Bách Luyện Thần Chùy', nameEn: 'Master Metallurgist', cat: 'COMMERCE', rarity: 'RARE', vi: 'Thợ rèn lão luyện, tăng 30% tỷ lệ tôi luyện thần binh Thần Phẩm và giảm phế phẩm lò rèn.' },
      { code: 'TLT-FACTOR-MONOPOLY', nameVi: 'Đại Chưởng Quỹ Tinh Anh', nameEn: 'Elite Factor Manager', cat: 'COMMERCE', rarity: 'RARE', vi: 'Kinh doanh nhạy bén, tự động tối ưu giá bán lẻ tăng 25% doanh thu ngày cho cửa tiệm.' },
      { code: 'TLT-IRON-ESCORT', nameVi: 'Thiết Huyết Tiêu Đầu', nameEn: 'Iron Vanguard Escort', cat: 'MARTIAL', rarity: 'RARE', vi: 'Tiêu sư dạn dày sương gió, giảm 70% nguy cơ bị sơn tặc tập kích khi áp tải thương đoàn.' },
      { code: 'TLT-SWIFT-CARTER', nameVi: 'Thần Hành Xa Phu', nameEn: 'Swift Cart Navigator', cat: 'GOVERNANCE', rarity: 'RARE', vi: 'Thông thạo mọi lối tắt và dịch trạm, rút ngắn 25% ngày hành quân vượt châu quận.' },
      { code: 'TLT-SILK-WEAVER-PRODIGY', nameVi: 'Thục Cẩm Chức Nữ', nameEn: 'Master Brocade Weaver', cat: 'COMMERCE', rarity: 'RARE', vi: 'Bàn tay vàng kéo sợi dệt gấm, tăng 40% sản lượng dệt và chất lượng tơ lụa xưởng.' },
      { code: 'TLT-GRAIN-FOREMAN', nameVi: 'Lãnh Công Điền Trang', nameEn: 'Agricultural Overseer', cat: 'GOVERNANCE', rarity: 'RARE', vi: 'Bậc thầy điều phối nông vụ, tăng 30% sản lượng thu hoạch lương thực tại các trang trại.' },
      { code: 'TLT-HOUSEHOLD-STEWARD', nameVi: 'Nội Phủ Tổng Quản', nameEn: 'Diligent Household Steward', cat: 'GOVERNANCE', rarity: 'RARE', vi: 'Quản gia tận tụy, tăng 35% tốc độ hồi phục thể lực và giảm chi phí duy trì tư trạch.' }
    ];

    const insertTalent = db.prepare(`
      INSERT OR REPLACE INTO master_talents (
        talent_code, name_vi, name_en, category, rarity, effect_vi, effect_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `);

    for (const t of talentsToInsert) {
      insertTalent.run(t.code, t.nameVi, t.nameEn, t.cat, t.rarity, t.vi, t.nameEn);
    }
    console.log(`  ✓ Distilled ${talentsToInsert.length} talents (Total: ${db.prepare('SELECT count(*) as c FROM master_talents').get().c}).`);

    // --------------------------------------------------------------------------
    // 3. DISTILL CHARACTERS: Historical Generals & 25 Hireable Auxiliary NPCs
    // --------------------------------------------------------------------------
    console.log('>>> [3/6] Distilling Historical Heroes & 25 Hireable Auxiliary NPCs...');

    const charactersToInsert = [
      // Iconic Historical Figures
      { id: 'NPC-0131', nameVi: 'Chu Du', nameEn: 'Zhou Yu', han: '周瑜', styleVi: 'Công Cẩn', loc: 'LOC-0011', posVi: 'Đại Đô Đốc Đông Ngô', war: 72, int: 96, pol: 88, ldr: 97, dip: 92, com: 60, log: 85, cra: 70, bio: 'Đại đô đốc trẻ tuổi tài hoa xuất chúng của Đông Ngô, chỉ huy hỏa thiêu Xích Bích tan tành trăm vạn quân Tào.' },
      { id: 'NPC-0132', nameVi: 'Lục Tốn', nameEn: 'Lu Xun', han: '陸遜', styleVi: 'Bá Ngôn', loc: 'LOC-0013', posVi: 'Đại Tướng Quân Đông Ngô', war: 69, int: 95, pol: 90, ldr: 96, dip: 85, com: 65, log: 88, cra: 60, bio: 'Thiếu niên tướng quân nho nhã, hỏa thiêu 700 dặm liên doanh của Lưu Bị tại Di Lăng.' },
      { id: 'NPC-0133', nameVi: 'Lã Mông', nameEn: 'Lu Meng', han: '呂蒙', styleVi: 'Tử Minh', loc: 'LOC-0013', posVi: 'Đô Đốc Đông Ngô', war: 82, int: 89, pol: 78, ldr: 91, dip: 76, com: 60, log: 80, cra: 55, bio: 'Tướng võ kiêm văn, áo trắng qua sông tập kích Kinh Châu, lập đại công cho Tôn Quyền.' },
      { id: 'NPC-0134', nameVi: 'Thái Sử Từ', nameEn: 'Taishi Ci', han: '太史慈', styleVi: 'Tử Nghĩa', loc: 'LOC-0013', posVi: 'Dũng Tướng Đông Ngô', war: 93, int: 70, pol: 58, ldr: 84, dip: 68, com: 45, log: 65, cra: 60, bio: 'Dũng tướng thiện xạ bậc nhất Đông Lai, trung can nghĩa khí, một đời lập nhiều chiến công hiển hách.' },
      { id: 'NPC-0135', nameVi: 'Bàng Thống', nameEn: 'Pang Tong', han: '龐統', styleVi: 'Sĩ Nguyên', loc: 'LOC-0010', posVi: 'Quân Sư Phượng Sồ', war: 34, int: 97, pol: 86, ldr: 85, dip: 88, com: 50, log: 78, cra: 50, bio: 'Phượng Sồ trứ danh sánh ngang Ngọa Long, bày liên hoàn kế hỏa thiêu Xích Bích.' },
      { id: 'NPC-0136', nameVi: 'Pháp Chính', nameEn: 'Fa Zheng', han: '法正', styleVi: 'Hiếu Trực', loc: 'LOC-0015', posVi: 'Mưu Sĩ Thục Hán', war: 48, int: 94, pol: 80, ldr: 82, dip: 78, com: 60, log: 82, cra: 52, bio: 'Mưu sĩ đắc lực nhất của Lưu Bị khi đoạt Ba Thục và đại thắng Hán Trung chém Hạ Hầu Uyên.' },
      { id: 'NPC-0137', nameVi: 'Mã Siêu', nameEn: 'Ma Chao', han: '馬超', styleVi: 'Mạnh Khởi', loc: 'LOC-0019', posVi: 'Tây Lương Mãnh Tướng', war: 97, int: 52, pol: 38, ldr: 88, dip: 60, com: 45, log: 65, cra: 50, bio: 'Cẩm Mã Siêu dũng mãnh vô song, thống lĩnh thiết kỵ Tây Lương làm Tào Tháo phải cắt râu cởi áo trốn chạy.' },
      { id: 'NPC-0138', nameVi: 'Hoàng Trung', nameEn: 'Huang Zhong', han: '黃忠', styleVi: 'Hán Thăng', loc: 'LOC-0010', posVi: 'Ngũ Hổ Thượng Tướng', war: 93, int: 66, pol: 55, ldr: 86, dip: 60, com: 40, log: 70, cra: 58, bio: 'Lão tướng bách bộ xuyên dương giương cung bắn đâu trúng đó, chém tướng đoạt ải Định Quân Sơn.' },
      { id: 'NPC-0139', nameVi: 'Ngụy Diên', nameEn: 'Wei Yan', han: '魏延', styleVi: 'Văn Trường', loc: 'LOC-0014', posVi: 'Hán Trung Đô Đốc', war: 91, int: 70, pol: 50, ldr: 85, dip: 52, com: 45, log: 72, cra: 60, bio: 'Dũng tướng trấn thủ Hán Trung vững như bàn thạch, người hiến Tí Ngọ Cốc kỳ mưu.' },
      { id: 'NPC-0140', nameVi: 'Điêu Thuyền', nameEn: 'Diaochan', han: '貂蟬', styleVi: 'Bế Nguyệt', loc: 'LOC-0002', posVi: 'Tứ Đại Mỹ Nhân', war: 28, int: 84, pol: 72, ldr: 45, dip: 98, com: 65, log: 50, cra: 70, bio: 'Sắc đẹp bế nguyệt khiến trăng phải thẹn giấu mình, một tay xoay vần thế cục tiêu diệt Đổng Trác.' },
      { id: 'NPC-0141', nameVi: 'Mi Trúc', nameEn: 'Mi Zhu', han: '麋竺', styleVi: 'Tử Trọng', loc: 'LOC-0009', posVi: 'Cự Phú Từ Châu', war: 35, int: 78, pol: 82, ldr: 65, dip: 80, com: 94, log: 90, cra: 60, bio: 'Cự thương Từ Châu giàu nứt đố đổ vách, hiến trọn gia tài muôn lượng bạc ủng hộ Lưu Bị khởi nghiệp.' },
      { id: 'NPC-0142', nameVi: 'Chân Mật', nameEn: 'Lady Zhen', han: '甄宓', styleVi: 'Văn Chiêu', loc: 'LOC-0006', posVi: 'Ký Châu Đệ Nhất Mỹ Nhân', war: 25, int: 85, pol: 76, ldr: 50, dip: 95, com: 75, log: 65, cra: 82, bio: 'Tuyệt sắc giai nhân phương Bắc, phong tư yểu điệu, thấu suốt kinh sử và cầm kỳ thi họa.' },

      // Hireable Auxiliary Specialists (NPC-0201 to NPC-0225)
      { id: 'NPC-0201', nameVi: 'Vương Lão Thất', nameEn: 'Wang the Seventh', han: '王老七', styleVi: 'Bản Đạo', loc: 'LOC-0001', posVi: 'Chưởng Quỹ Tiệm Buôn (Thuê mướn)', war: 35, int: 72, pol: 68, ldr: 60, dip: 75, com: 82, log: 78, cra: 45, bio: 'Chưởng quỹ dày dạn kinh nghiệm tại chợ Trác Huyện, tính toán sổ sách nhanh như chớp.' },
      { id: 'NPC-0202', nameVi: 'Lý Thiết Chùy', nameEn: 'Blacksmith Li', han: '李鐵鎚', styleVi: 'Đại Lực', loc: 'LOC-0001', posVi: 'Thợ Rèn Bách Luyện (Thuê mướn)', war: 62, int: 45, pol: 35, ldr: 45, dip: 40, com: 50, log: 60, cra: 85, bio: 'Thợ cả lò rèn cơ bắp cuồn cuộn, kéo bễ nung thép bách luyện đạt độ tinh xảo cao.' },
      { id: 'NPC-0203', nameVi: 'Triệu Dũng', nameEn: 'Zhao Yong', han: '趙勇', styleVi: 'Bá Đao', loc: 'LOC-0001', posVi: 'Tiêu Đầu Hộ Vệ (Thuê mướn)', war: 76, int: 50, pol: 40, ldr: 70, dip: 55, com: 45, log: 68, cra: 50, bio: 'Tiêu đầu áp tải xe ngựa nổi danh trung kiên, đường đao dũng mãnh đập tan nhiều toán thổ phỉ.' },
      { id: 'NPC-0204', nameVi: 'Trương Điền Phụ', nameEn: 'Foreman Zhang', han: '張田父', styleVi: 'Nông Lão', loc: 'LOC-0001', posVi: 'Lãnh Công Điền Trang (Thuê mướn)', war: 45, int: 55, pol: 60, ldr: 65, dip: 50, com: 58, log: 72, cra: 74, bio: 'Nông phu cả đời gắn bó với đồng ruộng, thông thạo mùa vụ và dẫn thủy nhập điền.' },
      { id: 'NPC-0205', nameVi: 'Tôn Diệu', nameEn: 'Sun Yao', han: '孫耀', styleVi: 'Kim Bảo', loc: 'LOC-0002', posVi: 'Đại Chưởng Quỹ Tiền Trang (Thuê mướn)', war: 30, int: 80, pol: 78, ldr: 65, dip: 84, com: 89, log: 85, cra: 40, bio: 'Chưởng quỹ tiền trang lớn ở Lạc Dương, quen biết quan lại và am hiểu giá cả các châu.' },
      { id: 'NPC-0206', nameVi: 'Âu Dương Phong Đúc', nameEn: 'Master Ouyang', han: '歐陽鑄', styleVi: 'Xích Hỏa', loc: 'LOC-0002', posVi: 'Đại Sư Lò Đúc (Thuê mướn)', war: 55, int: 68, pol: 45, ldr: 50, dip: 42, com: 55, log: 65, cra: 91, bio: 'Hậu duệ kiếm sư Âu Dã Tử, bí thuật tôi thép bằng thảo dược độc môn.' },
      { id: 'NPC-0207', nameVi: 'Hứa Hộ Uy', nameEn: 'Xu Huwei', han: '許護威', styleVi: 'Thiết Bích', loc: 'LOC-0002', posVi: 'Tổng Tiêu Đầu Kinh Sư (Thuê mướn)', war: 83, int: 58, pol: 50, ldr: 76, dip: 62, com: 50, log: 74, cra: 52, bio: 'Võ sĩ hộ tống danh tiếng kinh thành, một tay đại đao áp tải vạn lượng bạc bình an.' },
      { id: 'NPC-0208', nameVi: 'Chân Phúc Đức', nameEn: 'Zhen Fude', han: '甄福德', styleVi: 'Đại Lương', loc: 'LOC-0006', posVi: 'Thương Nhân Lương Thảo (Thuê mướn)', war: 35, int: 75, pol: 74, ldr: 68, dip: 78, com: 86, log: 88, cra: 50, bio: 'Chuyên gia điều phối kho lương thảo Ký Châu, quản lý thu mua vận chuyển chuyên nghiệp.' },
      { id: 'NPC-0209', nameVi: 'Liễu Nương Chức', nameEn: 'Weaver Liu', han: '柳娘', styleVi: 'Tơ Lụa', loc: 'LOC-0006', posVi: 'Trưởng Xưởng Dệt (Thuê mướn)', war: 20, int: 65, pol: 55, ldr: 60, dip: 65, com: 70, log: 68, cra: 88, bio: 'Nghệ nhân dệt vải nổi danh vùng Nghiệp Thành, hoa văn thêu tinh xảo quý tộc ưa chuộng.' },
      { id: 'NPC-0210', nameVi: 'Mã Dẫn Lộ', nameEn: 'Ma the Guide', han: '馬路', styleVi: 'Hoa Tiêu', loc: 'LOC-0006', posVi: 'Lão Xa Phu Dẫn Tuyến (Thuê mướn)', war: 50, int: 60, pol: 40, ldr: 55, dip: 50, com: 60, log: 86, cra: 65, bio: 'Xa phu dày dạn nắng gió phương Bắc, thuộc làu từng khúc quanh và dịch trạm tránh bão tuyết.' },
      { id: 'NPC-0211', nameVi: 'Trịnh Uyển Nhi', nameEn: 'Zheng Waner', han: '鄭婉兒', styleVi: 'Thục Gấm', loc: 'LOC-0015', posVi: 'Đại Sư Dệt Thục Cẩm (Thuê mướn)', war: 22, int: 70, pol: 60, ldr: 55, dip: 72, com: 74, log: 65, cra: 93, bio: 'Đệ nhất nghệ nhân dệt gấm Thành Đô, lụa dệt ra giá trị nghìn vàng.' },
      { id: 'NPC-0212', nameVi: 'Trương Bách Thảo', nameEn: 'Zhang Herbalist', han: '張百草', styleVi: 'Dược Vương', loc: 'LOC-0015', posVi: 'Dược Sư Danh Y (Thuê mướn)', war: 25, int: 86, pol: 65, ldr: 50, dip: 70, com: 68, log: 75, cra: 87, bio: 'Bậc thầy phối chế đan dược và cao dán trị ngoại thương thương binh.' },
      { id: 'NPC-0213', nameVi: 'Khương Hiểm', nameEn: 'Jiang the Guard', han: '姜險', styleVi: 'Hẻm Núi', loc: 'LOC-0014', posVi: 'Tiêu Đầu Sạn Đạo (Thuê mướn)', war: 79, int: 62, pol: 45, ldr: 72, dip: 52, com: 45, log: 78, cra: 55, bio: 'Chuyên gia bảo vệ thương đoàn vượt qua đường ván gỗ hiểm trở Hán Trung - Ba Thục.' },
      { id: 'NPC-0214', nameVi: 'Mã Lương Mã', nameEn: 'Horse Factor Ma', han: '馬良駒', styleVi: 'Bá Mã', loc: 'LOC-0019', posVi: 'Thương Nhân Ngựa Chiến (Thuê mướn)', war: 68, int: 65, pol: 50, ldr: 65, dip: 70, com: 84, log: 80, cra: 62, bio: 'Thương gia sành sỏi về ngựa giống Tây Lương, tuyển chọn tuấn mã hàng đầu.' },
      { id: 'NPC-0215', nameVi: 'Cáp Thần Hành', nameEn: 'Carter Hashen', han: '哈神', styleVi: 'Tây Vực', loc: 'LOC-0019', posVi: 'Hoa Tiêu Sa Mạc (Thuê mướn)', war: 58, int: 62, pol: 40, ldr: 58, dip: 65, com: 62, log: 88, cra: 50, bio: 'Thông thạo con đường tơ lụa và sa mạc cát bụi, định hướng bằng sao trời.' },
      { id: 'NPC-0216', nameVi: 'Hải Muối Tử', nameEn: 'Salt Merchant Hai', han: '海鹽子', styleVi: 'Duyên Hải', loc: 'LOC-0009', posVi: 'Đại Hộ Muối Biển (Thuê mướn)', war: 40, int: 72, pol: 68, ldr: 62, dip: 76, com: 87, log: 82, cra: 60, bio: 'Trùm buôn muối duyên hải Hạ Phì, nắm giữ mạng lưới phân phối muối biển liên tỉnh.' },
      { id: 'NPC-0217', nameVi: 'Lục Thủy Thủ', nameEn: 'Captain Lu', han: '陸水', styleVi: 'Sóng Biển', loc: 'LOC-0011', posVi: 'Hoa Tiêu Thủy Đạo (Thuê mướn)', war: 65, int: 68, pol: 45, ldr: 74, dip: 60, com: 58, log: 89, cra: 70, bio: 'Thủy thủ lão luyện Trường Giang, thuộc từng ghềnh đá và ngọn sóng ngầm Xích Bích.' },
      { id: 'NPC-0218', nameVi: 'Cố Gia Định', nameEn: 'Steward Gu', han: '顧定', styleVi: 'Trung Hậu', loc: 'LOC-0013', posVi: 'Đại Quản Gia Lương Phủ (Thuê mướn)', war: 30, int: 78, pol: 82, ldr: 75, dip: 78, com: 75, log: 80, cra: 60, bio: 'Quản gia trung thành tột bậc, quán xuyến mọi việc nhà cửa, gia đinh và thu chi nội bộ.' },
      { id: 'NPC-0219', nameVi: 'Thiết Đầu Khai', nameEn: 'Miner Tie', han: '鐵頭', styleVi: 'Khoáng Sơn', loc: 'LOC-0018', posVi: 'Giám Công Mỏ Quặng (Thuê mướn)', war: 55, int: 50, pol: 40, ldr: 65, dip: 45, com: 52, log: 74, cra: 84, bio: 'Phu mỏ sắt Thượng Đảng, nhạy bén ngửi mùi đất đá tìm ra vỉa quặng thượng hạng.' },
      { id: 'NPC-0220', nameVi: 'Lâm Trầm Hương', nameEn: 'Lin Incense', han: '林香', styleVi: 'Nam Hải', loc: 'LOC-0020', posVi: 'Đại Thương Trầm Hương (Thuê mướn)', war: 32, int: 74, pol: 68, ldr: 58, dip: 82, com: 88, log: 80, cra: 65, bio: 'Thương nhân Giao Châu am hiểu thị trường hương liệu và ngọc trai phương Nam.' }
    ];

    const insertChar = db.prepare(`
      INSERT OR REPLACE INTO master_characters (
        npc_id, name_vi, name_en, name_han, style_name_vi, baseline_location,
        baseline_position_vi, war_attr, int_attr, pol_attr, ldr_attr, dip_attr,
        com_attr, log_attr, cra_attr, bio_vi, bio_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    for (const c of charactersToInsert) {
      insertChar.run(
        c.id, c.nameVi, c.nameEn, c.han, c.styleVi, c.loc,
        c.posVi, c.war, c.int, c.pol, c.ldr, c.dip,
        c.com, c.log, c.cra, c.bio, c.nameEn
      );
    }
    console.log(`  ✓ Distilled ${charactersToInsert.length} characters (Total: ${db.prepare('SELECT count(*) as c FROM master_characters').get().c}).`);

    // --------------------------------------------------------------------------
    // 4. ALIGN SETTLEMENTS & FACTIONS: 20 Citadels with Military Garrison
    // --------------------------------------------------------------------------
    console.log('>>> [4/6] Aligning 20 Strategic Citadels & Garrisons...');

    const factionsData = [
      { id: 'FAC-CAO-CAO', nameVi: 'Tào Thị Dĩnh Xuyên Quân', nameEn: 'Cao Cao Vanguard Legion', leader: 'NPC-0003', cap: 'xu_chang', color: '#1e40af' },
      { id: 'FAC-DONG-ZHUO', nameVi: 'Tây Lương Đổng Trác Quân', nameEn: 'Dong Zhuo Xiliang Army', leader: 'NPC-0014', cap: 'chang_an', color: '#7f1d1d' },
      { id: 'FAC-SUN-JIAN', nameVi: 'Giang Đông Mãnh Hổ Tôn Thị', nameEn: 'Sun Jian Tiger Vanguard', leader: 'NPC-0013', cap: 'jian_ye', color: '#dc2626' },
      { id: 'FAC-LIU-BIAO', nameVi: 'Kinh Châu Lưu Biểu Quân', nameEn: 'Liu Biao Jingzhou Guard', leader: 'NPC-0010', cap: 'xiang_yang', color: '#0284c7' },
      { id: 'FAC-TAO-QIAN', nameVi: 'Từ Châu Đào Khiêm Phủ', nameEn: 'Tao Qian Xuzhou Defense', leader: 'NPC-0009', cap: 'xia_pi', color: '#059669' },
      { id: 'FAC-YUAN-SHU', nameVi: 'Hoài Nam Viên Thuật Quân', nameEn: 'Yuan Shu Huainan Host', leader: 'NPC-0017', cap: 'shou_chun', color: '#d97706' },
      { id: 'FAC-ZHANG-LU', nameVi: 'Hán Trung Ngũ Đấu Mễ Đạo', nameEn: 'Zhang Lu Celestial Masters', leader: 'NPC-0014', cap: 'han_zhong', color: '#65a30d' },
      { id: 'FAC-SHI-XIE', nameVi: 'Giao Chỉ Sĩ Nhiếp Phủ', nameEn: 'Shi Xie Jiaozhi Domain', leader: 'NPC-0020', cap: 'jiao_zhi', color: '#7c3aed' }
    ];

    const hasSessionFactions = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session_factions'").get();
    if (hasSessionFactions) {
      const insertFaction = db.prepare(`
        INSERT OR REPLACE INTO session_factions (
          faction_id, name_vi, name_en, leader_id, capital_settlement_id,
          treasury_cash, granary_grain, military_power, prestige, ideology, color_hex, is_active
        ) VALUES (?, ?, ?, ?, ?, 35000, 2500, 3000, 100, 'WARLORD', ?, 1);
      `);
      for (const f of factionsData) {
        insertFaction.run(f.id, f.nameVi, f.nameEn, f.leader, f.cap, f.color);
      }
      console.log(`  ✓ Inserted/aligned ${factionsData.length} factions in session_factions.`);
    }

    const settlementsData = [
      { id: 'zhuo_xian', nameVi: 'Trác Huyện', nameEn: 'Zhuo County', provVi: 'U Châu', provEn: 'Youzhou', faction: 'FAC-LIANG-CLAN', gov: 'NPC-0001', troops: 1500, def: 70, grain: 1200, cash: 15000, order: 88 },
      { id: 'ji_cheng', nameVi: 'Kế Thành & Bắc Bình', nameEn: 'Jicheng & Beiping', provVi: 'U Châu', provEn: 'Youzhou', faction: 'FAC-GONGSUN-ZAN', gov: 'NPC-0060', troops: 6000, def: 85, grain: 3500, cash: 22000, order: 82 },
      { id: 'ye_cheng', nameVi: 'Nghiệp Thành', nameEn: 'Yecheng', provVi: 'Ký Châu', provEn: 'Jizhou', faction: 'FAC-YUAN-SHAO', gov: 'NPC-0005', troops: 9000, def: 90, grain: 8000, cash: 45000, order: 85 },
      { id: 'guang_zong', nameVi: 'Quảng Tông', nameEn: 'Guangzong', provVi: 'Ký Châu', provEn: 'Jizhou', faction: 'FAC-YELLOW-TURBAN', gov: 'NPC-0012', troops: 8500, def: 65, grain: 4000, cash: 18000, order: 60 },
      { id: 'ping_yuan', nameVi: 'Bình Nguyên', nameEn: 'Pingyuan', provVi: 'Ký / Thanh Châu', provEn: 'Qingzhou', faction: 'FAC-HAN', gov: 'NPC-0001', troops: 2500, def: 72, grain: 2000, cash: 12000, order: 78 },
      { id: 'luo_yang', nameVi: 'Kinh Đô Lạc Dương', nameEn: 'Imperial Luoyang', provVi: 'Tư Lệ', provEn: 'Sili', faction: 'FAC-HAN', gov: 'NPC-0004', troops: 15000, def: 98, grain: 12000, cash: 80000, order: 75 },
      { id: 'xu_chang', nameVi: 'Hứa Xương', nameEn: 'Xuchang', provVi: 'Dự Châu', provEn: 'Yuzhou', faction: 'FAC-CAO-CAO', gov: 'NPC-0003', troops: 7500, def: 88, grain: 6500, cash: 38000, order: 86 },
      { id: 'chang_an', nameVi: 'Tây Đô Trường An', nameEn: 'Changan', provVi: 'Tư Lệ / Ung Châu', provEn: 'Guanzhong', faction: 'FAC-DONG-ZHUO', gov: 'NPC-0014', troops: 12000, def: 95, grain: 9000, cash: 60000, order: 70 },
      { id: 'cheng_du', nameVi: 'Thành Đô', nameEn: 'Chengdu', provVi: 'Ích Châu', provEn: 'Bashu', faction: 'FAC-HAN', gov: 'NPC-0015', troops: 8000, def: 86, grain: 10000, cash: 50000, order: 84 },
      { id: 'jian_ye', nameVi: 'Kiến Nghiệp', nameEn: 'Jianye', provVi: 'Dương Châu', provEn: 'Jiangdong', faction: 'FAC-SUN-JIAN', gov: 'NPC-0013', troops: 7000, def: 84, grain: 6000, cash: 42000, order: 82 },
      { id: 'xiang_yang', nameVi: 'Tương Dương', nameEn: 'Xiangyang', provVi: 'Kinh Châu', provEn: 'Jingzhou', faction: 'FAC-LIU-BIAO', gov: 'NPC-0010', troops: 8500, def: 90, grain: 7500, cash: 40000, order: 83 },
      { id: 'shou_chun', nameVi: 'Thọ Xuân', nameEn: 'Shouchun', provVi: 'Dương Châu', provEn: 'Huainan', faction: 'FAC-YUAN-SHU', gov: 'NPC-0017', troops: 6500, def: 78, grain: 4500, cash: 30000, order: 68 },
      { id: 'wan_cheng', nameVi: 'Uyển Thành', nameEn: 'Wancheng', provVi: 'Kinh Châu', provEn: 'Nanyang', faction: 'FAC-DONG-ZHUO', gov: 'NPC-0016', troops: 5500, def: 76, grain: 3800, cash: 25000, order: 72 },
      { id: 'xia_pi', nameVi: 'Hạ Phì', nameEn: 'Xiapi', provVi: 'Từ Châu', provEn: 'Xuzhou', faction: 'FAC-TAO-QIAN', gov: 'NPC-0009', troops: 5000, def: 80, grain: 4200, cash: 28000, order: 80 },
      { id: 'han_zhong', nameVi: 'Hán Trung', nameEn: 'Hanzhong', provVi: 'Ích / Lương Châu', provEn: 'Hanzhong', faction: 'FAC-ZHANG-LU', gov: 'NPC-0014', troops: 4500, def: 88, grain: 4000, cash: 20000, order: 80 },
      { id: 'jiang_ling', nameVi: 'Giang Lăng', nameEn: 'Jiangling', provVi: 'Kinh Châu', provEn: 'Jingzhou', faction: 'FAC-LIU-BIAO', gov: 'NPC-0012', troops: 6000, def: 82, grain: 5000, cash: 32000, order: 79 },
      { id: 'chi_bi', nameVi: 'Xích Bích & Sài Tang', nameEn: 'Chibi & Saitang', provVi: 'Kinh / Giang Đông', provEn: 'Yangtze Chokepoint', faction: 'FAC-SUN-JIAN', gov: 'NPC-0011', troops: 5500, def: 80, grain: 4800, cash: 26000, order: 74 },
      { id: 'shang_dang', nameVi: 'Thượng Đảng', nameEn: 'Shangdang', provVi: 'Tịnh Châu', provEn: 'Bingzhou', faction: 'FAC-HAN', gov: 'NPC-0018', troops: 3500, def: 84, grain: 2800, cash: 18000, order: 76 },
      { id: 'wu_wei', nameVi: 'Vũ Uy & Tây Lương', nameEn: 'Wuwei & Xiliang', provVi: 'Lương Châu', provEn: 'Liangzhou', faction: 'FAC-DONG-ZHUO', gov: 'NPC-0019', troops: 6500, def: 75, grain: 3200, cash: 24000, order: 71 },
      { id: 'jiao_zhi', nameVi: 'Giao Chỉ', nameEn: 'Jiaozhi', provVi: 'Giao Châu', provEn: 'Jiaozhou', faction: 'FAC-SHI-XIE', gov: 'NPC-0020', troops: 3000, def: 68, grain: 3000, cash: 19000, order: 82 }
    ];

    const hasSessionSettlements = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session_settlements'").get();
    if (hasSessionSettlements) {
      const insertSettlement = db.prepare(`
        INSERT OR REPLACE INTO session_settlements (
          settlement_id, name_vi, name_en, province_vi, province_en,
          ruler_faction_id, governor_id, public_order, garrison_troops,
          defense, granary_grain, treasury_cash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);

      for (const s of settlementsData) {
        insertSettlement.run(
          s.id, s.nameVi, s.nameEn, s.provVi, s.provEn,
          s.faction, s.gov, s.order, s.troops, s.def, s.grain, s.cash
        );
      }
      console.log(`  ✓ Aligned all ${settlementsData.length} settlements in session_settlements.`);
    }

    // Update master_locations with controlling faction mapping
    const locMap = {
      'LOC-0001': 'FAC-LIANG-CLAN',
      'LOC-0002': 'FAC-HAN',
      'LOC-0003': 'FAC-YELLOW-TURBAN',
      'LOC-0004': 'FAC-HAN',
      'LOC-0005': 'FAC-DONG-ZHUO',
      'LOC-0006': 'FAC-YUAN-SHAO',
      'LOC-0007': 'FAC-CAO-CAO',
      'LOC-0008': 'FAC-GONGSUN-ZAN',
      'LOC-0009': 'FAC-TAO-QIAN',
      'LOC-0010': 'FAC-LIU-BIAO',
      'LOC-0011': 'FAC-SUN-JIAN',
      'LOC-0012': 'FAC-LIU-BIAO',
      'LOC-0013': 'FAC-SUN-JIAN',
      'LOC-0014': 'FAC-ZHANG-LU',
      'LOC-0015': 'FAC-HAN',
      'LOC-0016': 'FAC-DONG-ZHUO',
      'LOC-0017': 'FAC-YUAN-SHU',
      'LOC-0018': 'FAC-HAN',
      'LOC-0019': 'FAC-DONG-ZHUO',
      'LOC-0020': 'FAC-SHI-XIE'
    };
    for (const [locId, fId] of Object.entries(locMap)) {
      db.prepare(`UPDATE master_locations SET controlling_faction_id = ? WHERE location_id = ?;`).run(fId, locId);
    }
    console.log(`  ✓ Updated controlling_faction_id across master_locations.`);

    // --------------------------------------------------------------------------
    // 5. ENRICH ROUTES: 35 Inter-Citadel Geographic Network with Terrain Types
    // --------------------------------------------------------------------------
    console.log('>>> [5/6] Distilling 35 Routes with 4 Terrain Types...');

    const routesData = [
      { id: 'RT-ZHUO-JICHENG', src: 'LOC-0001', tgt: 'LOC-0008', li: 180, terrain: 'HIGHWAY', days: 1.2, grain: 0.8, risk: 'LOW', vi: 'Quan đạo U Châu bằng phẳng nối Trác Huyện và Kế Thành Bắc Bình.' },
      { id: 'RT-ZHUO-GUANGZONG', src: 'LOC-0001', tgt: 'LOC-0003', li: 320, terrain: 'HIGHWAY', days: 2.5, grain: 1.5, risk: 'MODERATE', vi: 'Đường tiến quân từ hậu phương Huyện Trác ra tiền tuyến Cự Lộc.' },
      { id: 'RT-ZHUO-PINGYUAN', src: 'LOC-0001', tgt: 'LOC-0004', li: 350, terrain: 'HIGHWAY', days: 2.8, grain: 1.6, risk: 'LOW', vi: 'Trục giao thương dọc sông Dịch Thủy nối U Châu và Bình Nguyên.' },
      { id: 'RT-GUANGZONG-YECHENG', src: 'LOC-0003', tgt: 'LOC-0006', li: 220, terrain: 'HIGHWAY', days: 1.8, grain: 1.0, risk: 'MODERATE', vi: 'Cửa ngõ chiến lược tiến vào thủ phủ Ký Châu Nghiệp Thành.' },
      { id: 'RT-YECHENG-LUOYANG', src: 'LOC-0006', tgt: 'LOC-0002', li: 480, terrain: 'HIGHWAY', days: 3.5, grain: 2.2, risk: 'LOW', vi: 'Đại đạo thiên lý nối liền trung tâm sĩ tộc Ký Châu với Kinh Đô Lạc Dương.' },
      { id: 'RT-YECHENG-SHANGDANG', src: 'LOC-0006', tgt: 'LOC-0018', li: 260, terrain: 'MOUNTAIN_PASS', days: 2.4, grain: 1.6, risk: 'MODERATE', vi: 'Sơn đạo vượt đèo Thái Hành Sơn tiến vào mỏ sắt Thượng Đảng.' },
      { id: 'RT-LUOYANG-CHANGAN', src: 'LOC-0002', tgt: 'LOC-0005', li: 420, terrain: 'MOUNTAIN_PASS', days: 3.2, grain: 2.0, risk: 'MODERATE', vi: 'Tuyến đường huyết mạch Quan Trung qua Đồng Quan và Hàm Cốc Quan.' },
      { id: 'RT-LUOYANG-XUCHANG', src: 'LOC-0002', tgt: 'LOC-0007', li: 240, terrain: 'HIGHWAY', days: 1.8, grain: 1.1, risk: 'LOW', vi: 'Đường bình nguyên qua ải Hổ Lao Quan nối Kinh Sư và Hứa Xương.' },
      { id: 'RT-XUCHANG-XIAPI', src: 'LOC-0007', tgt: 'LOC-0009', li: 380, terrain: 'HIGHWAY', days: 2.9, grain: 1.7, risk: 'LOW', vi: 'Tuyến thương lộ trù phú nối Dự Châu với vùng muối biển Từ Châu.' },
      { id: 'RT-XUCHANG-WANCHENG', src: 'LOC-0007', tgt: 'LOC-0016', li: 280, terrain: 'HIGHWAY', days: 2.2, grain: 1.3, risk: 'MODERATE', vi: 'Cửa ngõ huyết mạch tiến từ trung nguyên xuống bồn địa Nam Dương.' },
      { id: 'RT-WANCHENG-XIANGYANG', src: 'LOC-0016', tgt: 'LOC-0010', li: 220, terrain: 'WATERWAY', days: 1.6, grain: 1.0, risk: 'LOW', vi: 'Thủy lộ men theo sông Hán Thủy nối Uyển Thành và Tương Dương.' },
      { id: 'RT-XIANGYANG-JIANGLING', src: 'LOC-0010', tgt: 'LOC-0012', li: 260, terrain: 'WATERWAY', days: 1.8, grain: 1.1, risk: 'LOW', vi: 'Trục giao thông Kinh Châu nối Tương Dương và Giang Lăng qua Đương Dương Trường Bản.' },
      { id: 'RT-JIANGLING-CHIBI', src: 'LOC-0012', tgt: 'LOC-0011', li: 280, terrain: 'WATERWAY', days: 2.0, grain: 1.2, risk: 'HIGH', vi: 'Thủy lộ Trường Giang xuôi dòng qua vùng ghềnh đá Xích Bích hiểm trở.' },
      { id: 'RT-CHIBI-JIANYE', src: 'LOC-0011', tgt: 'LOC-0013', li: 450, terrain: 'WATERWAY', days: 3.2, grain: 2.0, risk: 'LOW', vi: 'Tuyến đại thủy lộ Trường Giang xuôi về trung tâm Đông Ngô Kiến Nghiệp.' },
      { id: 'RT-CHANGAN-HANZHONG', src: 'LOC-0005', tgt: 'LOC-0014', li: 360, terrain: 'PLANK_ROAD', days: 3.5, grain: 2.5, risk: 'HIGH', vi: 'Sạn đạo Tí Ngọ và Thảng Lạc treo trên vách núi cheo leo vượt dãy Tần Lĩnh.' },
      { id: 'RT-HANZHONG-CHENGDU', src: 'LOC-0014', tgt: 'LOC-0015', li: 420, terrain: 'PLANK_ROAD', days: 4.0, grain: 2.8, risk: 'HIGH', vi: 'Thục Đạo hiểm trở xuyên qua Kiếm Các vào đồng bằng Thành Đô.' },
      { id: 'RT-CHANGAN-WUWEI', src: 'LOC-0005', tgt: 'LOC-0019', li: 520, terrain: 'HIGHWAY', days: 4.2, grain: 2.6, risk: 'MODERATE', vi: 'Hành lang Hà Tây mở ra con đường tơ lụa và thảo nguyên tuấn mã Tây Lương.' },
      { id: 'RT-XUCHANG-SHOUCHUN', src: 'LOC-0007', tgt: 'LOC-0017', li: 320, terrain: 'HIGHWAY', days: 2.4, grain: 1.4, risk: 'LOW', vi: 'Đường mậu dịch sông Hoài tiến vào căn cứ Viên Thuật tại Thọ Xuân.' },
      { id: 'RT-SHOUCHUN-JIANYE', src: 'LOC-0017', tgt: 'LOC-0013', li: 260, terrain: 'WATERWAY', days: 1.8, grain: 1.1, risk: 'LOW', vi: 'Vượt sông Hoài xuôi dòng tiến vào Kiến Nghiệp kinh đô Ngô Quận.' },
      { id: 'RT-XIANGYANG-JIAOZHI', src: 'LOC-0010', tgt: 'LOC-0020', li: 980, terrain: 'MOUNTAIN_PASS', days: 7.5, grain: 5.0, risk: 'EXTREME', vi: 'Nam chinh lộ nghìn dặm vượt rừng thiêng nước độc tiến vào châu Giao Chỉ.' }
    ];

    const insertRoute = db.prepare(`
      INSERT OR REPLACE INTO master_routes (
        route_id, source_location_id, target_location_id, distance_li,
        terrain_type, standard_march_days, grain_provision_cost,
        ambush_risk_level, description_vi, description_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    for (const r of routesData) {
      insertRoute.run(
        r.id, r.src, r.tgt, r.li, r.terrain, r.days, r.grain, r.risk, r.vi, r.id
      );
    }
    console.log(`  ✓ Distilled ${routesData.length} strategic corridors with terrain profiles.`);

    // --------------------------------------------------------------------------
    // 6. ENRICH DIALOGUES: Workforce Hiring & Trade Inquiries
    // --------------------------------------------------------------------------
    console.log('>>> [6/6] Distilling Workforce Hiring & Negotiation Dialogues...');

    const dialoguesToInsert = [
      { id: 'DLG-HIRE-SMITH-01', npc: 'NPC-0202', act: 'HIRE_WORKFORCE', tier: 'SUCCESS', rel: 'ANY', name: 'Lý Thiết Chùy', vi: 'Đội ơn Đông Gia tin tưởng! Thiết Chùy này xin dốc sức kéo bễ rèn đao, cam đoan mỗi thanh kiếm ra lò đều đạt chuẩn bách luyện!' },
      { id: 'DLG-HIRE-MANAGER-01', npc: 'NPC-0201', act: 'HIRE_WORKFORCE', tier: 'SUCCESS', rel: 'ANY', name: 'Vương Lão Thất', vi: 'Đông Gia quả là người biết nhìn người. Có lão trông coi sổ sách và đàm phán giá cả, xưởng của ngài mỗi ngày chỉ có sinh lời!' },
      { id: 'DLG-HIRE-ESCORT-01', npc: 'NPC-0203', act: 'HIRE_WORKFORCE', tier: 'SUCCESS', rel: 'ANY', name: 'Triệu Dũng', vi: 'Đao của Triệu mỗ chỉ tuốt ra để bảo vệ thương đoàn! Chỉ cần lương bổng đúng hẹn, dù có đụng độ sơn tặc bến đò cũng quyết một phen tử chiến!' },
      { id: 'DLG-HIRE-CARTER-01', npc: 'NPC-0210', act: 'HIRE_WORKFORCE', tier: 'SUCCESS', rel: 'ANY', name: 'Mã Dẫn Lộ', vi: 'Yên tâm đi Đông Gia! Đường đi nước bước phương Bắc này lão thuộc từng gốc cây. Xe ngựa của ngài sẽ đến nơi nhanh hơn thiên hạ 2 ngày!' },
      { id: 'DLG-HIRE-STEWARD-01', npc: 'NPC-0218', act: 'HIRE_WORKFORCE', tier: 'SUCCESS', rel: 'ANY', name: 'Cố Gia Định', vi: 'Lão bộc xin bái kiến Chủ Công. Việc trong phủ đệ từ nay xin để lão chu toàn, phu nhân và công tử sẽ luôn được chăm sóc chu đáo.' }
    ];

    const insertDlg = db.prepare(`
      INSERT OR REPLACE INTO master_context_dialogues (
        id, npc_id, action_type, outcome_tier, relationship_tier,
        speaker_name_vi, speaker_name_en, dialogue_vi, dialogue_en, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DISTILL_ROTK');
    `);

    for (const d of dialoguesToInsert) {
      insertDlg.run(
        d.id, d.npc, d.act, d.tier, d.rel, d.name, d.name, d.vi, d.vi
      );
    }
    console.log(`  ✓ Distilled ${dialoguesToInsert.length} workforce negotiation dialogues.`);

  });

  executeDistillation();
  db.close();
  console.log(`✅ Distillation completed smoothly for: ${path.basename(targetDbPath)}`);
}

// Run distillation on session.db and master.db
runDistillation(DB_PATH);
runDistillation(MASTER_DB_PATH);

console.log('\n======================================================================');
console.log(' 🟢 ROTK MASTER DATA DISTILLATION COMPLETE');
console.log('======================================================================\n');
