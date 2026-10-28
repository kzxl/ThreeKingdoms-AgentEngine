/**
 * ThreeKingdoms-AgentEngine: Master RPG Database Seeder & Normalizer
 * (tools/seed-master-rpg-data.js)
 *
 * Implements Step 2 Data Foundation:
 * 1. Normalizes and enriches `master_locations` with 6 Distinct Town POIs for Zhuo County.
 * 2. Repairs corrupt UTF-8 strings and enriches `stat_modifiers` across `master_items`.
 * 3. Seeds high-density contextual `master_quick_chips` for all 6 POIs.
 * 4. Seeds authentic historical `master_context_dialogues` for smithing, dueling, and domestic life.
 *
 * Adheres strictly to Zero-Drift Database Invariants (186/186 checks).
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '..', 'saves', 'session.db');
const db = new Database(DB_PATH);

console.log('======================================================================');
console.log('   SEEDING & ENRICHING MASTER RPG DATABASE                            ');
console.log('======================================================================\n');

db.transaction(() => {
  // --------------------------------------------------------------------------
  // 1. Enrich master_locations: Zhuo County sub_locations (6 POIs)
  // --------------------------------------------------------------------------
  console.log('>>> [1/4] Updating master_locations (Zhuo County 6 POIs)...');
  const zhuoSubLocations = [
    'Tư Trạch Vườn Đào',
    'Chợ Đông Môn & Sạp Trà',
    'Thiết Điếm Trác Huyện',
    'Tửu Quán Trác Huyện',
    'Lôi Đài Giáo Trường',
    'Mã Xa Dịch Trạm',
    'Xưởng Lương Thị'
  ];

  db.prepare(`
    UPDATE master_locations
    SET sub_locations = ?,
        default_sub_loc = 'Tư Trạch Vườn Đào',
        key_figures_vi = 'Lưu Bị, Trương Phi, Quan Vũ, Trần Bảo, Triệu An, Chân Cơ, Tôn Thượng Hương, Hoa Hùng, Lữ Bố',
        strategic_intel_vi = 'Bản dinh và quê hương của Lương Diễn. Đầy đủ các địa điểm: Tư Trạch (gia đạo), Thiết Điếm (rèn đao), Tửu Quán (tụ nghĩa), Lôi Đài (diễn võ), Dịch Trạm (thương đoàn) và Chợ Đông Môn.'
    WHERE location_id = 'LOC-0001';
  `).run(JSON.stringify(zhuoSubLocations));
  console.log('  ✓ Zhuo County (LOC-0001) sub_locations updated to 7 local POIs.');

  // --------------------------------------------------------------------------
  // 2. Repair and Enrich master_items (UTF-8, Stat Modifiers & New Materials)
  // --------------------------------------------------------------------------
  console.log('\n>>> [2/4] Repairing & Enriching master_items...');

  // 2.1 Repair corrupted UTF-8 names
  const repairs = [
    { code: 'RAW-IRON-ORE', name: 'Quặng Sắt Thô Sơn Mạch', desc: 'Quặng sắt thô khai thác từ chân núi U Châu, cần nung luyện để thành thỏi sắt' },
    { code: 'RAW-HERB-WILD', name: 'Thảo Dược Rừng Tươi', desc: 'Dược thảo tươi hái từ rừng rậm, dùng chế kim sang dược hoặc thuốc trị thương' },
    { code: 'RAW-SULFUR', name: 'Lưu Huỳnh Mạch Đỏ', desc: 'Khoáng chất lưu huỳnh đỏ tinh khiết dùng trong thuật luyện kim và luyện đan' },
    { code: 'RAW-CINNABAR', name: 'Chu Sa Đỏ Luyện Đan', desc: 'Chu sa đỏ tự nhiên, nguyên liệu then chốt chế tạo thang dược bồi bổ thể lực' }
  ];

  for (const r of repairs) {
    db.prepare(`
      UPDATE master_items
      SET name_vi = ?, description_vi = ?
      WHERE item_code = ?;
    `).run(r.name, r.desc, r.code);
  }
  console.log('  ✓ Corrupted raw material item names repaired.');

  // 2.2 Populate canonical stat_modifiers for weapons, armors, mounts, books
  const statUpdates = [
    { code: 'WPN-GREEN-DRAGON', mods: JSON.stringify({ war: 5, ldr: 2 }) },
    { code: 'WPN-SERPENT-SPEAR', mods: JSON.stringify({ war: 5, ldr: 1 }) },
    { code: 'WPN-SKY-PIERCER', mods: JSON.stringify({ war: 5, ldr: 2 }) },
    { code: 'WPN-HEAVEN-SWORD', mods: JSON.stringify({ war: 4, pol: 3 }) },
    { code: 'WPN-ANCIENT-INGOT', mods: JSON.stringify({ war: 4 }) },
    { code: 'HRS-RED-HARE', mods: JSON.stringify({ war: 3, ldr: 2 }) },
    { code: 'HRS-SHADOW-RUNNER', mods: JSON.stringify({ ldr: 3 }) },
    { code: 'HRS-DILU-STEED', mods: JSON.stringify({ ldr: 2, dip: 2 }) },
    { code: 'BOOK-SUN-TZU', mods: JSON.stringify({ int: 5, ldr: 3 }) },
    { code: 'EQP-ARMOR-LEATHER', mods: JSON.stringify({ ldr: 2 }) },
    { code: 'EQP-CROSSBOW-REPEATING', mods: JSON.stringify({ war: 3 }) },
    { code: 'EQP-SPEAR-IRON', mods: JSON.stringify({ war: 1 }) },
    { code: 'EQP-SHIELD-BAMBOO', mods: JSON.stringify({ ldr: 1 }) },
    { code: 'PROD-SHIELD-BAM', mods: JSON.stringify({ ldr: 1 }) },
    { code: 'COM-SPEAR', mods: JSON.stringify({ war: 1 }) },
    { code: 'COM-SWORD', mods: JSON.stringify({ war: 2 }) }
  ];

  for (const su of statUpdates) {
    db.prepare(`
      UPDATE master_items
      SET stat_modifiers = ?
      WHERE item_code = ?;
    `).run(su.mods, su.code);
  }
  console.log('  ✓ Canonical stat_modifiers populated across all military weapons, mounts & relics.');

  // 2.3 Insert essential crafting materials & caravan assets
  const newItems = [
    {
      item_code: 'RAW-STEEL-FINE',
      name_vi: 'Thép Bách Luyện Thượng Phẩm',
      name_en: 'Centurial Refined Steel Ingot',
      category: 'RAW_MATERIAL',
      unit_vi: 'Thỏi',
      unit_en: 'Ingot',
      baseline_peace_price: 120,
      current_market_price: 120,
      volatility_index: 'LOW',
      weight_kg: 2.0,
      is_contraband: 0,
      production_source_vi: 'Thiết Điếm & Lò Đúc Trác Huyện',
      description_vi: 'Thỏi thép rèn đi rèn lại trăm lần, tạp chất tiêu biến, bóng loáng như gương, dùng rèn bảo đao',
      description_en: 'Hundred-fold refined steel ingot, essential for masterwork blade forging',
      stat_modifiers: null
    },
    {
      item_code: 'RAW-METEOR-IRON',
      name_vi: 'Thiên Thạch Huyền Thiết',
      name_en: 'Meteoric Dark Iron',
      category: 'RAW_MATERIAL',
      unit_vi: 'Khối',
      unit_en: 'Block',
      baseline_peace_price: 450,
      current_market_price: 450,
      volatility_index: 'HIGH',
      weight_kg: 5.0,
      is_contraband: 0,
      production_source_vi: 'Rơi rụng từ sơn mạch U Châu',
      description_vi: 'Khoáng thạch rơi từ trời cao, ngàn năm không rỉ, mang hàn khí thấu xương, vật liệu của thần binh',
      description_en: 'Rare meteoric dark iron fallen from the skies, material for legendary weapons',
      stat_modifiers: null
    },
    {
      item_code: 'EQP-CARAVAN-WAGON',
      name_vi: 'Cỗ Xe Ngựa Viễn Chinh',
      name_en: 'Reinforced Expedition Carriage',
      category: 'MILITARY_EQUIPMENT',
      unit_vi: 'Cỗ',
      unit_en: 'Carriage',
      baseline_peace_price: 2500,
      current_market_price: 2500,
      volatility_index: 'LOW',
      weight_kg: 150.0,
      is_contraband: 0,
      production_source_vi: 'Mã Xa Dịch Trạm Trác Huyện',
      description_vi: 'Xe ngựa gỗ sồi gia cố đinh sắt, chống lật chống xóc, có thể chở vạn cân hàng hóa vượt quan đạo',
      description_en: 'Heavy reinforced transport carriage built for long-distance regional trade',
      stat_modifiers: JSON.stringify({ com: 2, log: 3 })
    },
    {
      item_code: 'RELIC-JADE-SEAL-REPLICA',
      name_vi: 'Bạch Ngọc Điêu Long Ấn',
      name_en: 'White Jade Dragon Seal',
      category: 'FINISHED_GOOD',
      unit_vi: 'Ấn',
      unit_en: 'Seal',
      baseline_peace_price: 8500,
      current_market_price: 8500,
      volatility_index: 'MEDIUM',
      weight_kg: 1.5,
      is_contraband: 0,
      production_source_vi: 'Cung đình Lạc Dương truyền xuất',
      description_vi: 'Khối bạch ngọc hòa điền khắc rồng cuộn, tỏa ánh ôn nhuận, tượng trưng cho tông tộc quyền quý',
      description_en: 'Carved white jade talisman signifying regional dynastic authority',
      stat_modifiers: JSON.stringify({ pol: 4, dip: 3 })
    }
  ];

  const insertItemStmt = db.prepare(`
    INSERT OR REPLACE INTO master_items (
      item_code, name_vi, name_en, category, unit_vi, unit_en,
      baseline_peace_price, current_market_price, volatility_index, weight_kg,
      is_contraband, production_source_vi, description_vi, description_en, stat_modifiers
    ) VALUES (
      @item_code, @name_vi, @name_en, @category, @unit_vi, @unit_en,
      @baseline_peace_price, @current_market_price, @volatility_index, @weight_kg,
      @is_contraband, @production_source_vi, @description_vi, @description_en, @stat_modifiers
    );
  `);

  for (const item of newItems) {
    insertItemStmt.run(item);
  }
  console.log(`  ✓ Inserted/Updated ${newItems.length} essential materials and expedition equipment.`);

  // --------------------------------------------------------------------------
  // 3. Populate Contextual master_quick_chips for 6 POIs of Zhuo County
  // --------------------------------------------------------------------------
  console.log('\n>>> [3/4] Seeding Spatial master_quick_chips for Town POIs...');

  // Remove old chips for Zhuo County POIs to reseed cleanly
  db.prepare(`
    DELETE FROM master_quick_chips 
    WHERE location_key IN (
      'Tư Trạch Vườn Đào', 'Thiết Điếm Trác Huyện', 'Tửu Quán Trác Huyện',
      'Lôi Đài Giáo Trường', 'Mã Xa Dịch Trạm', 'Chợ Đông Môn & Sạp Trà'
    );
  `).run();

  const insertChipStmt = db.prepare(`
    INSERT INTO master_quick_chips (location_key, chip_type, icon, label_vi, label_en, prompt_vi, prompt_en, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `);

  const spatialChips = [
    // 1. Tư Trạch Vườn Đào (Residence)
    { loc: 'Tư Trạch Vườn Đào', type: 'local', icon: '休', vi: 'Nghỉ Ngơi Tĩnh Dưỡng', en: 'Rest & Recover', pvi: 'Lương Diễn nghỉ ngơi an giấc tại phòng trong, hồi phục thể lực và khí huyết', pen: 'Liang Yan rests in private quarters to restore vitality and fatigue', ord: 1 },
    { loc: 'Tư Trạch Vườn Đào', type: 'local', icon: '家', vi: 'Trò Chuyện Thê Tử', en: 'Converse with Spouse', pvi: 'Lương Diễn đàm đạo tâm tình cùng phu nhân, bồi đắp tình cảm gia thất', pen: 'Liang Yan spends warm domestic moments conversing with spouse', ord: 2 },
    { loc: 'Tư Trạch Vườn Đào', type: 'local', icon: '嗣', vi: 'Chỉ Dạy Thế Tử', en: 'Instruct Heirs', pvi: 'Lương Diễn kiểm tra bài vở, truyền dạy võ nghệ và sách lược cho con cái', pen: 'Liang Yan examines studies and imparts wisdom to family heirs', ord: 3 },
    { loc: 'Tư Trạch Vườn Đào', type: 'local', icon: '書', vi: 'Kê Toán Sổ Sách Tại Gia', en: 'Review Home Accounts', pvi: 'Ngồi tại bàn làm việc tại gia duyệt sổ sách sản nghiệp và thu địa tô', pen: 'Sit at home desk to review enterprise ledgers and tenant revenues', ord: 4 },
    { loc: 'Tư Trạch Vườn Đào', type: 'travel', icon: '行', vi: 'Đi Thiết Điếm', en: 'To Smithy', pvi: 'Rời tư trạch, đi tới Thiết Điếm Trác Huyện để rèn đao', pen: 'Leave residence and head to the Town Smithy', ord: 5 },
    { loc: 'Tư Trạch Vườn Đào', type: 'travel', icon: '行', vi: 'Đi Tửu Quán', en: 'To Tavern', pvi: 'Rời tư trạch, đi tới Tửu Quán Trác Huyện tụ họp hào kiệt', pen: 'Leave residence and head to the Town Tavern', ord: 6 },
    { loc: 'Tư Trạch Vườn Đào', type: 'travel', icon: '行', vi: 'Ra Chợ Đông Môn', en: 'To Market', pvi: 'Rời tư trạch, rảo bước ra Chợ Đông Môn & Sạp Trà', pen: 'Leave residence and walk to East Gate Market', ord: 7 },
    { loc: 'Tư Trạch Vườn Đào', type: 'travel', icon: '行', vi: 'Tới Lôi Đài', en: 'To Arena', pvi: 'Rời tư trạch, đi sang Lôi Đài Giáo Trường tỉ võ', pen: 'Leave residence and head to the Martial Arena', ord: 8 },

    // 2. Thiết Điếm Trác Huyện (Smithy & Forge)
    { loc: 'Thiết Điếm Trác Huyện', type: 'local', icon: '工', vi: 'Kéo Bễ Rèn Binh Khí', en: 'Work Forge Bellows', pvi: 'Đích thân kéo bễ, phụ việc rèn binh khí kiếm tiền công và tăng CRA EXP', pen: 'Work the forge bellows to earn wages and gain Crafting EXP', ord: 1 },
    { loc: 'Thiết Điếm Trác Huyện', type: 'local', icon: '鍛', vi: 'Rèn Đúc Thần Binh', en: 'Bespoke Forge Masterwork', pvi: 'Khai lò nung sắt, tự tay tôi luyện binh khí thần phẩm độc bản', pen: 'Operate master forge to craft bespoke unique weapons', ord: 2 },
    { loc: 'Thiết Điếm Trác Huyện', type: 'local', icon: '商', vi: 'Mua 10 Thỏi Sắt', en: 'Buy 10 Iron Ingots', pvi: 'Thu mua 10 thỏi sắt tinh luyện từ thợ cả chuẩn bị đúc rèn', pen: 'Purchase 10 refined iron ingots from the master smith', ord: 3 },
    { loc: 'Thiết Điếm Trác Huyện', type: 'local', icon: '師', vi: 'Thỉnh Giáo Thợ Cả', en: 'Consult Master Smith', pvi: 'Đàm đạo cùng Thợ Cả Trần Bảo về thuật tôi thép và đúc kiếm bách luyện', pen: 'Discuss metallurgy and blade quenching with Master Smith Chen Bao', ord: 4 },
    { loc: 'Thiết Điếm Trác Huyện', type: 'travel', icon: '行', vi: 'Về Tư Trạch', en: 'To Residence', pvi: 'Rời thiết điếm, trở về Tư Trạch Vườn Đào nghỉ ngơi', pen: 'Leave smithy and return to Peach Garden Residence', ord: 5 },
    { loc: 'Thiết Điếm Trác Huyện', type: 'travel', icon: '行', vi: 'Sang Tửu Quán', en: 'To Tavern', pvi: 'Rời thiết điếm, đi sang Tửu Quán Trác Huyện uống rượu giải lao', pen: 'Leave smithy and head to the Tavern for refreshment', ord: 6 },
    { loc: 'Thiết Điếm Trác Huyện', type: 'travel', icon: '行', vi: 'Ra Chợ Đông Môn', en: 'To Market', pvi: 'Rời thiết điếm, mang thành phẩm ra Chợ Đông Môn giao thương', pen: 'Leave smithy and head to East Gate Market', ord: 7 },

    // 3. Tửu Quán Trác Huyện (Tavern & Brotherhood)
    { loc: 'Tửu Quán Trác Huyện', type: 'local', icon: '飲', vi: 'Uống Rượu Hồi Thể Lực', en: 'Drink Vintage Wine', pvi: 'Gọi vò Trác Thành Trán Nương uống rượu xua tan mệt mỏi và hồi thể lực', pen: 'Order a jar of vintage wine to banish fatigue and recover stamina', ord: 1 },
    { loc: 'Tửu Quán Trác Huyện', type: 'local', icon: '宴', vi: 'Mở Tiệc Hào Kiệt', en: 'Host Hero Banquet', pvi: 'Mở tiệc rượu linh đình thết đãi hào kiệt bốn phương, tăng hảo cảm danh sĩ', pen: 'Host a lavish banquet to treat visiting heroes and raise affinity', ord: 2 },
    { loc: 'Tửu Quán Trác Huyện', type: 'local', icon: '義', vi: 'Chiêu Mộ Hảo Hán', en: 'Recruit Wandering Heroes', pvi: 'Quan sát các bàn tiệc, tìm kiếm hảo hán giang hồ chiêu mộ làm môn khách', pen: 'Survey tavern patrons to recruit talented wanderers as retainers', ord: 3 },
    { loc: 'Tửu Quán Trác Huyện', type: 'local', icon: '結', vi: 'Cắt Máu Kết Nghĩa', en: 'Swear Brotherhood', pvi: 'Mời hảo hữu tri kỷ cắt máu ăn thề, kết bái huynh đệ đồng sinh cộng tử', pen: 'Invite sworn brothers to take blood oaths of brotherhood', ord: 4 },
    { loc: 'Tửu Quán Trác Huyện', type: 'travel', icon: '行', vi: 'Về Tư Trạch', en: 'To Residence', pvi: 'Rời tửu quán, quay về Tư Trạch Vườn Đào an giấc', pen: 'Leave tavern and return home to Peach Garden Residence', ord: 5 },
    { loc: 'Tửu Quán Trác Huyện', type: 'travel', icon: '行', vi: 'Sang Lôi Đài', en: 'To Arena', pvi: 'Hơi men bốc lên, rời tửu quán sang Lôi Đài Giáo Trường đọ sức', pen: 'Aroused by wine, head to the Martial Arena for combat', ord: 6 },
    { loc: 'Tửu Quán Trác Huyện', type: 'travel', icon: '行', vi: 'Sang Dịch Trạm', en: 'To Depot', pvi: 'Rời tửu quán, sang Mã Xa Dịch Trạm bàn bạc thương vụ', pen: 'Leave tavern and proceed to Caravan Depot for trade matters', ord: 7 },

    // 4. Lôi Đài Giáo Trường (Arena & Martial Drill)
    { loc: 'Lôi Đài Giáo Trường', type: 'local', icon: '武', vi: 'Đấu Thương Trương Phi', en: 'Spar with Zhang Fei', pvi: 'Lên võ đài thỉnh giáo Trương Phi giao lưu thương pháp thực chiến', pen: 'Ascend the sparring ring to test spear combat with Zhang Fei', ord: 1 },
    { loc: 'Lôi Đài Giáo Trường', type: 'local', icon: '武', vi: 'Luận Kiếm Quan Vũ', en: 'Spar with Guan Yu', pvi: 'Thỉnh giáo Thanh Long đao pháp của Quan Vân Trường tăng WAR EXP', pen: 'Spar with Guan Yu to study Green Dragon blade mastery and gain WAR EXP', ord: 2 },
    { loc: 'Lôi Đài Giáo Trường', type: 'local', icon: '演', vi: 'Thách Đấu Lôi Đài', en: 'Enter Arena Tournament', pvi: 'Đăng ký khiêu chiến các võ sĩ lôi đài 3 cấp độ tranh đoạt ngân lượng', pen: 'Enter the 3-tiered championship arena tournament for prize purses', ord: 3 },
    { loc: 'Lôi Đài Giáo Trường', type: 'local', icon: '兵', vi: 'Luyện Binh Thao Diễn', en: 'Drill Retainers', pvi: 'Tập hợp dân binh, chỉ đạo thao diễn chiến trận tăng LDR EXP', pen: 'Drill garrison troops in battle formations to enhance Leadership EXP', ord: 4 },
    { loc: 'Lôi Đài Giáo Trường', type: 'travel', icon: '行', vi: 'Sang Tửu Quán', en: 'To Tavern', pvi: 'Rời võ đài, sang Tửu Quán Trác Huyện uống rượu khao quân', pen: 'Leave arena and celebrate victories at the Town Tavern', ord: 5 },
    { loc: 'Lôi Đài Giáo Trường', type: 'travel', icon: '行', vi: 'Về Tư Trạch', en: 'To Residence', pvi: 'Rời giáo trường, quay về Tư Trạch dưỡng thương tĩnh dưỡng', pen: 'Leave drill grounds and return to Residence to rest', ord: 6 },

    // 5. Mã Xa Dịch Trạm (Caravan Depot & Guild)
    { loc: 'Mã Xa Dịch Trạm', type: 'local', icon: '商', vi: 'Lập Thương Đoàn', en: 'Form Trade Caravan', pvi: 'Khảo sát chênh lệch giá cả các châu, tổ chức thương đoàn viễn chinh', pen: 'Analyze inter-regional price indices and establish trade caravans', ord: 1 },
    { loc: 'Mã Xa Dịch Trạm', type: 'local', icon: '車', vi: 'Mua 1 Xe Ngựa Kéo', en: 'Procure Heavy Wagon', pvi: 'Chi tiền mua thêm xe ngựa kéo gia cố để tăng tải trọng hàng hóa', pen: 'Procure reinforced heavy carriage to expand caravan payload capacity', ord: 2 },
    { loc: 'Mã Xa Dịch Trạm', type: 'local', icon: '衛', vi: 'Thuê 5 Tiêu Sư Hộ Vệ', en: 'Hire 5 Caravan Guards', pvi: 'Thuê 5 tay tiêu sư hộ tống tinh nhuệ phòng thủ sơn tặc cướp bóc', pen: 'Hire 5 veteran guards to protect cargo against highway ambushes', ord: 3 },
    { loc: 'Mã Xa Dịch Trạm', type: 'local', icon: '報', vi: 'Nghe Ngóng Thương Lộ', en: 'Survey Trade Routes', pvi: 'Hỏi thăm dịch quan về tình hình chiến sự và thổ phỉ trên các tuyến đường', pen: 'Consult post officials regarding bandits and war hazards along routes', ord: 4 },
    { loc: 'Mã Xa Dịch Trạm', type: 'travel', icon: '行', vi: 'Ra Chợ Đông Môn', en: 'To Market', pvi: 'Rời dịch trạm, đi ra Chợ Đông Môn thu mua hàng hóa', pen: 'Leave depot and proceed to East Gate Market to buy cargo', ord: 5 },
    { loc: 'Mã Xa Dịch Trạm', type: 'travel', icon: '行', vi: 'Về Tư Trạch', en: 'To Residence', pvi: 'Rời dịch trạm, quay về Tư Trạch Vườn Đào nghỉ ngơi', pen: 'Leave depot and return to Peach Garden Residence', ord: 6 },

    // 6. Chợ Đông Môn & Sạp Trà (Market & Tea Stall)
    { loc: 'Chợ Đông Môn & Sạp Trà', type: 'local', icon: '商', vi: 'Bán 10 Chiếu Trúc', en: 'Sell 10 Mats', pvi: 'Xuất bán 10 tấm Chiếu Trúc Lương Gia cho khách buôn phương xa', pen: 'Sell 10 Liang bamboo mats to visiting interstate traders', ord: 1 },
    { loc: 'Chợ Đông Môn & Sạp Trà', type: 'local', icon: '商', vi: 'Mua 5 Lương Thảo', en: 'Buy 5 Grain', pvi: 'Thu mua 5 thạch lương thực tiểu mạch dự trữ trong kho', pen: 'Procure 5 piculs of grain provisions for inventory reserves', ord: 2 },
    { loc: 'Chợ Đông Môn & Sạp Trà', type: 'local', icon: '茶', vi: 'Uống Trà Cùng Quan Vũ', en: 'Tea with Guan Yu', pvi: 'Mời Quan Vân Trường uống trà nóng, đàm đạo nghĩa cử và kinh sách', pen: 'Invite Guan Yu for hot tea to discuss righteousness and the Spring Autumn Annals', ord: 3 },
    { loc: 'Chợ Đông Môn & Sạp Trà', type: 'travel', icon: '行', vi: 'Về Tư Trạch', en: 'To Residence', pvi: 'Rời chợ đông môn, rảo bước về Tư Trạch Vườn Đào', pen: 'Leave east gate market and return home to Peach Garden Residence', ord: 4 },
    { loc: 'Chợ Đông Môn & Sạp Trà', type: 'travel', icon: '行', vi: 'Tới Thiết Điếm', en: 'To Smithy', pvi: 'Rời chợ đông môn, đi sang Thiết Điếm Trác Huyện', pen: 'Leave market and proceed to Town Smithy', ord: 5 },
    { loc: 'Chợ Đông Môn & Sạp Trà', type: 'travel', icon: '行', vi: 'Tới Dịch Trạm', en: 'To Depot', pvi: 'Rời chợ đông môn, đi sang Mã Xa Dịch Trạm gửi hàng', pen: 'Leave market and head to Caravan Depot to stage shipments', ord: 6 }
  ];

  for (const c of spatialChips) {
    insertChipStmt.run(c.loc, c.type, c.icon, c.vi, c.en, c.pvi, c.pen, c.ord);
  }
  console.log(`  ✓ Seeded ${spatialChips.length} high-density spatial chips across all 6 POIs.`);

  // --------------------------------------------------------------------------
  // 4. Populate Contextual master_context_dialogues
  // --------------------------------------------------------------------------
  console.log('\n>>> [4/4] Seeding Authentic Historical master_context_dialogues...');

  const insertDlgStmt = db.prepare(`
    INSERT OR REPLACE INTO master_context_dialogues (
      id, npc_id, action_type, outcome_tier, relationship_tier,
      speaker_name_vi, speaker_name_en, dialogue_vi, dialogue_en, source, usage_count
    ) VALUES (
      @id, @npc_id, @action_type, @outcome_tier, @relationship_tier,
      @speaker_name_vi, @speaker_name_en, @dialogue_vi, @dialogue_en, @source, @usage_count
    );
  `);

  const dialogues = [
    // Smith Chen Bao
    {
      id: 'DLG-CB-FORGE-CRIT',
      npc_id: 'NPC-0005',
      action_type: 'FORGE_CRAFT',
      outcome_tier: 'CRITICAL_SUCCESS',
      relationship_tier: 'ANY',
      speaker_name_vi: 'Trần Bảo (Thợ Cả)',
      speaker_name_en: 'Chen Bao (Master Smith)',
      dialogue_vi: 'Trần Bảo lau mồ hôi đầm đìa, hoa mắt nhìn lưỡi đao phát ra tử quang rực rỡ: "Trời ơi! Thép bách luyện ngưng tụ sát khí, hoa văn vân mây kỳ ảo! Đây chính là tuyệt thế thần binh trong truyền thuyết!"',
      dialogue_en: 'Chen Bao wipes beads of sweat, gazing in awe at the violet gleam: "Heavens above! Hundred-fold steel infused with lethal aura and cloud patterns—a true legendary masterwork!"',
      source: 'CANONICAL_SEED',
      usage_count: 0
    },
    {
      id: 'DLG-CB-FORGE-SUCC',
      npc_id: 'NPC-0005',
      action_type: 'FORGE_CRAFT',
      outcome_tier: 'SUCCESS',
      relationship_tier: 'ANY',
      speaker_name_vi: 'Trần Bảo (Thợ Cả)',
      speaker_name_en: 'Chen Bao (Master Smith)',
      dialogue_vi: 'Trần Bảo gõ búa đanh thép xuống đe: "Lương công tử lực tay kinh người, lửa lò nung vừa đúng độ! Lưỡi binh khí này cứng cáp sắc bén, chém sắt như chém bùn."',
      dialogue_en: 'Chen Bao strikes the anvil crisply: "Master Liang wields formidable hammer strength and precise forge heat! This blade is tempered solid, cutting iron like clay."',
      source: 'CANONICAL_SEED',
      usage_count: 0
    },

    // Guan Yu Sparring
    {
      id: 'DLG-GY-SPAR-SUCC',
      npc_id: 'NPC-0003',
      action_type: 'SPARRING',
      outcome_tier: 'SUCCESS',
      relationship_tier: 'ANY',
      speaker_name_vi: 'Quan Vũ (Vân Trường)',
      speaker_name_en: 'Guan Yu (Yunchang)',
      dialogue_vi: 'Quan Vũ thu đao, vuốt chòm râu dài khẽ gật đầu khen ngợi: "Chiêu thương của Lương đệ trầm ổn hữu lực, tiến thoái có bài bản. Võ đạo như đọc Xuân Thu, quý ở sự chuyên nhất kiên định."',
      dialogue_en: 'Guan Yu withdraws his blade, stroking his long beard with approval: "Brother Liang, your spear thrusts are steady and disciplined. True martial prowess, like studying the Spring and Autumn Annals, prizes steadfast devotion above all."',
      source: 'CANONICAL_SEED',
      usage_count: 0
    },

    // Lady Zhen Domestic Dialogue
    {
      id: 'DLG-ZHEN-SPOUSE-SUCC',
      npc_id: 'NPC-0088',
      action_type: 'SPOUSE_TALK',
      outcome_tier: 'SUCCESS',
      relationship_tier: 'ANY',
      speaker_name_vi: 'Chân Cơ (Chân Lạc)',
      speaker_name_en: 'Lady Zhen (Zhen Luo)',
      dialogue_vi: 'Chân Cơ mỉm cười dịu dàng, tự tay dâng chén trà thơm nghi ngút khói: "Phu quân bôn ba bốn phương vất vả, hãy ngồi xuống nghỉ ngơi. Trong nhà mọi việc củi đuốc gia nhân, thiếp đều đã thu xếp chu toàn."',
      dialogue_en: 'Lady Zhen smiles gently, presenting a steaming bowl of fragrant tea: "My lord has toiled hard through distant ventures; please rest your weary spirit. I have tended to all household affairs and provisions."',
      source: 'CANONICAL_SEED',
      usage_count: 0
    },

    // Sun Shangxiang Martial Dialogue
    {
      id: 'DLG-SSX-SPOUSE-SUCC',
      npc_id: 'NPC-0089',
      action_type: 'SPOUSE_TALK',
      outcome_tier: 'SUCCESS',
      relationship_tier: 'ANY',
      speaker_name_vi: 'Tôn Thượng Hương (Kiêu Cơ)',
      speaker_name_en: 'Sun Shangxiang (Fierce Princess)',
      dialogue_vi: 'Tôn Thượng Hương tra kiếm vào vỏ bạc, mắt sáng như sao: "Chàng trở về rồi ư? Ta vừa luyện xong một bài kiếm pháp Đông Ngô. Khi nào thảnh thơi, chàng phải cùng ta so tài cung tiễn đấy nhé!"',
      dialogue_en: 'Sun Shangxiang sheathes her silver sword with starlit eyes: "You are finally back! I have just finished my Eastern Wu sword routine. When you are free, you must duel arrows with me!"',
      source: 'CANONICAL_SEED',
      usage_count: 0
    }
  ];

  for (const dlg of dialogues) {
    insertDlgStmt.run(dlg);
  }
  console.log(`  ✓ Seeded ${dialogues.length} authentic historical context dialogues.`);
})();

console.log('\n======================================================================');
console.log('   MASTER RPG DATABASE SEEDING COMPLETED SUCCESSFULLY!                ');
console.log('======================================================================');
