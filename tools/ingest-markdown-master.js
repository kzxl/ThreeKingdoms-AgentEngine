#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Master Markdown Ingestion & Restructuring Engine
 * (tools/ingest-markdown-master.js)
 * 
 * Ingests all static markdown lore, dossiers, catalogs, and rules into the
 * immutable master_* tables in SQLite (saves/session.db AND saves/master.db).
 * 
 * Enforces strict separation between Master Blueprints and Runtime Session State.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const SAVES_DIR = path.join(ROOT_DIR, 'saves');
const DB_PATH = process.env.SIM_DB_PATH || path.join(SAVES_DIR, 'session.db');
const MASTER_DB_PATH = path.join(SAVES_DIR, 'master.db');
const SCHEMA_MASTER_PATH = path.join(__dirname, 'schema-master.sql');

function executeSqlFile(targetDb, filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found at ${filePath}`);
  }
  execSync(`sqlite3 "${targetDb}" < "${filePath}"`, { encoding: 'utf8' });
}

function runSqlRaw(targetDb, sql) {
  const tempFile = path.join(SAVES_DIR, `ingest_tmp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}.sql`);
  fs.writeFileSync(tempFile, sql, 'utf8');
  try {
    execSync(`sqlite3 "${targetDb}" < "${tempFile}"`, { encoding: 'utf8' });
    return true;
  } catch (err) {
    console.error('SQL Execution failed:', err.message);
    throw err;
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
  }
}

function escapeSql(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/'/g, "''");
}

console.log('====================================================');
console.log(' 🏯 Master Markdown Ingestion & Restructuring Engine');
console.log('====================================================');
console.log(` Target Session DB: ${DB_PATH}`);
console.log(` Target Master DB : ${MASTER_DB_PATH}`);

// Step 1: Ensure master schema exists in both DBs
console.log('\n[1/12] Applying Master Database Schema (schema-master.sql)...');
executeSqlFile(DB_PATH, SCHEMA_MASTER_PATH);
executeSqlFile(MASTER_DB_PATH, SCHEMA_MASTER_PATH);
console.log(' ✅ Master schema initialized in session.db and master.db.');

// Helper to run on both DBs
function runOnBoth(sql) {
  runSqlRaw(DB_PATH, sql);
  runSqlRaw(MASTER_DB_PATH, sql);
}

// Step 2: Seed Scenarios Catalog
console.log('\n[2/12] Ingesting Master Scenarios...');
const scenarios = [
  {
    id: 'SCN-184-ZHOU',
    nameVi: 'Khởi Nghĩa Khăn Vàng (184 SCN)',
    nameEn: 'The Yellow Turban Rebellion (184 AD)',
    startDate: '184-02-01',
    epoch: 'Đông Hán Mạt Niên • Hoàng Cân Loạn Khởi',
    descVi: 'Khắp 8 châu Đại Hán sấm sét dậy trời, Trương Giác lãnh đạo trăm vạn tín đồ Khăn Vàng đồng loạt khởi nghĩa. Triều đình suy vi, hào kiệt nhân gian khởi binh tòng quân bảo vệ xã tắc.',
    descEn: 'Across eight provinces of the Han Empire, Zhang Jue leads millions of Yellow Turban zealots in rebellion. The court mobilizes regional magnates and volunteer militia.'
  },
  {
    id: 'SCN-190-DONG',
    nameVi: 'Liên Minh Quan Đông Phạt Đổng (190 SCN)',
    nameEn: 'Coalition Against Dong Zhuo (190 AD)',
    startDate: '190-01-01',
    epoch: 'Đổng Trác Chuyên Quyền • Chư Hầu Hội Minh',
    descVi: 'Tây Lương ma vương Đổng Trác vào kinh phế lập thiên tử, đồ sát sinh linh. Viên Thiệu, Tào Tháo hiệu triệu 18 lộ chư hầu phạt Đổng.',
    descEn: 'Warlord Dong Zhuo seizes Luoyang and subverts the imperial court. Eighteen regional warlords form a grand coalition to restore the dynasty.'
  },
  {
    id: 'SCN-200-GUAN',
    nameVi: 'Trận Chiến Quan Độ (200 SCN)',
    nameEn: 'The Battle of Guandu (200 AD)',
    startDate: '200-02-01',
    epoch: 'Viên Tào Tranh Hùng • Trung Nguyên Quyết Đấu',
    descVi: 'Viên Thiệu thống lĩnh 10 vạn đại quân Ký Châu nam hạ, Tào Tháo lấy ít địch nhiều dàn trận tại Quan Độ.',
    descEn: 'Yuan Shao marches 100,000 troops south against Cao Cao. A clash of empires determining mastery over the Central Plains.'
  },
  {
    id: 'SCN-208-CHIB',
    nameVi: 'Xích Bích Thủy Chiến (208 SCN)',
    nameEn: 'The Battle of Red Cliffs (208 AD)',
    startDate: '208-07-01',
    epoch: 'Tam Phân Thiên Hạ • Hỏa Thiêu Xích Bích',
    descVi: 'Tào Tháo bình định phương Bắc, dẫn 80 vạn thủy lục đại quân xuôi nam. Tôn Lưu liên minh hỏa công Trường Giang định ra thế chân vạc.',
    descEn: 'Cao Cao leads a massive armada south. The Sun-Liu alliance deploys naval fireships on the Yangtze River, forging the Three Kingdoms divide.'
  }
];

let sqlScenarios = 'BEGIN TRANSACTION;\n';
for (const s of scenarios) {
  sqlScenarios += `INSERT OR REPLACE INTO master_scenarios 
    (scenario_id, name_vi, name_en, start_date, historical_epoch, description_vi, description_en)
    VALUES ('${s.id}', '${escapeSql(s.nameVi)}', '${escapeSql(s.nameEn)}', '${s.startDate}', '${escapeSql(s.epoch)}', '${escapeSql(s.descVi)}', '${escapeSql(s.descEn)}');\n`;
}
sqlScenarios += 'COMMIT;';
runOnBoth(sqlScenarios);
console.log(` ✅ ${scenarios.length} Master Scenarios cataloged.`);

// Step 3: Ingest Player Archetypes
console.log('\n[3/12] Ingesting Master Player Archetypes (player_template.md)...');
const archetypes = [
  {
    id: 'ARCH-SCHOLAR-ARTISAN',
    nameVi: 'Sĩ Tộc Thương Khách (Mặc định: Lương Diễn / Lương Nhan)',
    nameEn: 'The Scholar-Artisan (Default: Liang Yan)',
    playerName: 'Liang Yan',
    styleName: 'Zhiyuan',
    age: 21,
    location: 'LOC-0001',
    cash: 15000,
    int: 76, pol: 60, war: 48, ldr: 62, dip: 65, com: 75, log: 62, cra: 60,
    assets: JSON.stringify(['BIZ-0001: Liang Clan Workshop', '3 Weaving Looms', 'Craft Tools Set']),
    talents: JSON.stringify(['TLT-CALC: Quick Reckoner', 'TLT-CALM: Composed Demeanor']),
    perks: 'Quyền quản lý Xưởng dệt Lương Gia tại Huyện Trác',
    bioVi: 'Hậu duệ gia tộc tiểu thương U Châu, học rộng biết sâu, kết hợp kinh doanh xưởng thủ công và cung ứng hậu cần quân nhu.',
    bioEn: 'Scion of a northern merchant gentry lineage. Blends Confucian scholarship with pragmatic craft enterprise and logistics.'
  },
  {
    id: 'ARCH-FRONTIER-OFFICER',
    nameVi: 'Đô Úy Tiền Đồn (Võ quan biên cương)',
    nameEn: 'The Frontier Militia Officer (Du Wei)',
    playerName: 'Hạ Hầu Thắng',
    styleName: 'Bá Viễn',
    age: 25,
    location: 'LOC-0001',
    cash: 8000,
    int: 55, pol: 45, war: 78, ldr: 76, dip: 50, com: 40, log: 65, cra: 35,
    assets: JSON.stringify(['20 Veteran Militia Guards', 'Iron Weapons & Armor Rack']),
    talents: JSON.stringify(['TLT-VANGUARD: Iron Will', 'TLT-TACTIC: Charge Master']),
    perks: 'Quân hàm Biệt Giá Tư Mã (Biejiasi)',
    bioVi: 'Tướng lĩnh kỳ cựu đồn trú biên viễn U Châu, thông thạo chiến trận và thao luyện hương binh dũng sĩ.',
    bioEn: 'Seasoned border military officer experienced in repelling steppe nomadic incursions and training disciplined militia.'
  },
  {
    id: 'ARCH-SILK-CARAVAN',
    nameVi: 'Thương Đoàn Tổng Quản (Trùm buôn tơ lụa liên châu)',
    nameEn: 'The Silk Caravan Factor',
    playerName: 'Chân Hạo',
    styleName: 'Trọng Diệu',
    age: 28,
    location: 'LOC-0002',
    cash: 25000,
    int: 68, pol: 55, war: 40, ldr: 52, dip: 75, com: 84, log: 72, cra: 45,
    assets: JSON.stringify(['4 Reinforced Cargo Wagons', '4 Pack Mules', 'Interstate Caravan Guild Passport']),
    talents: JSON.stringify(['TLT-BARGAIN: Silver Tongue', 'TLT-ROUTES: Silk Way Navigator']),
    perks: 'Giấy thông hành Thương hội Liên Châu',
    bioVi: 'Tổng quản thương đoàn giàu có buôn tơ lụa và trà muối giữa Ký Châu, Lạc Dương và Từ Châu.',
    bioEn: 'Wealthy caravan master commanding interstate supply routes across the Central Plains and capital markets.'
  }
];

let sqlArchetypes = 'BEGIN TRANSACTION;\n';
for (const a of archetypes) {
  sqlArchetypes += `INSERT OR REPLACE INTO master_player_archetypes
    (archetype_id, name_vi, name_en, default_player_name, default_style_name, starting_age, starting_location, initial_liquid_cash, int_attr, pol_attr, war_attr, ldr_attr, dip_attr, com_attr, log_attr, cra_attr, starting_assets, innate_talents, initial_perks, bio_vi, bio_en)
    VALUES ('${a.id}', '${escapeSql(a.nameVi)}', '${escapeSql(a.nameEn)}', '${escapeSql(a.playerName)}', '${escapeSql(a.styleName)}', ${a.age}, '${a.location}', ${a.cash}, ${a.int}, ${a.pol}, ${a.war}, ${a.ldr}, ${a.dip}, ${a.com}, ${a.log}, ${a.cra}, '${escapeSql(a.assets)}', '${escapeSql(a.talents)}', '${escapeSql(a.perks)}', '${escapeSql(a.bioVi)}', '${escapeSql(a.bioEn)}');\n`;
}
sqlArchetypes += 'COMMIT;';
runOnBoth(sqlArchetypes);
console.log(` ✅ ${archetypes.length} Player Archetypes cataloged.`);

// Step 4: Ingest 60+ Master Characters (Extensive 3 Kingdoms Roster)
console.log('\n[4/12] Ingesting 60+ Master Characters across 4 Factions...');
const charactersList = [
  // --- THỤC HÁN (SHU-HAN) ---
  { id: 'NPC-0001', nameVi: 'Lưu Bị (Huyền Đức)', nameEn: 'Liu Bei (Xuande)', han: '刘备', style: 'Huyền Đức', age: 23, loc: 'LOC-0001', pos: 'Nghĩa Quân Thống Lĩnh • Trung Sơn Tĩnh Vương Hậu Duệ', int: 74, pol: 78, war: 68, ldr: 90, dip: 88, com: 45, log: 62, cra: 52 },
  { id: 'NPC-0002', nameVi: 'Trương Phi (Dực Đức)', nameEn: 'Zhang Fei (Yide)', han: '张飞', style: 'Dực Đức', age: 19, loc: 'LOC-0001', pos: 'Vạn Nhân Địch • Vườn Đào Hào Kiệt', int: 42, pol: 30, war: 98, ldr: 84, dip: 38, com: 55, log: 48, cra: 45 },
  { id: 'NPC-0003', nameVi: 'Quan Vũ (Vân Trường)', nameEn: 'Guan Yu (Yunchang)', han: '关羽', style: 'Vân Trường', age: 24, loc: 'LOC-0001', pos: 'Võ Thánh • Giải Lương Danh Tướng', int: 75, pol: 62, war: 98, ldr: 94, dip: 65, com: 42, log: 68, cra: 48 },
  { id: 'NPC-0024', nameVi: 'Triệu Vân (Tử Long)', nameEn: 'Zhao Yun (Zilong)', han: '赵云', style: 'Tử Long', age: 20, loc: 'LOC-0008', pos: 'Thường Sơn Danh Tướng • Hổ Uy Tướng Quân', int: 76, pol: 65, war: 96, ldr: 91, dip: 72, com: 50, log: 78, cra: 50 },
  { id: 'NPC-0025', nameVi: 'Gia Cát Lượng (Khổng Minh)', nameEn: 'Zhuge Liang (Kongming)', han: '诸葛亮', style: 'Khổng Minh', age: 18, loc: 'LOC-0010', pos: 'Ngọa Long Tiên Sinh • Thần Cơ Diệu Toán', int: 100, pol: 98, war: 38, ldr: 95, dip: 95, com: 82, log: 98, cra: 85 },
  { id: 'NPC-0026', nameVi: 'Bàng Thống (Sĩ Nguyên)', nameEn: 'Pang Tong (Shiyuan)', han: '庞统', style: 'Sĩ Nguyên', age: 22, loc: 'LOC-0010', pos: 'Phượng Sồ Quân Sư • Kỳ Mưu Liên Hoàn', int: 97, pol: 85, war: 34, ldr: 86, dip: 84, com: 60, log: 75, cra: 40 },
  { id: 'NPC-0027', nameVi: 'Pháp Chính (Hiếu Trực)', nameEn: 'Fa Zheng (Xiaozhi)', han: '法正', style: 'Hiếu Trực', age: 26, loc: 'LOC-0015', pos: 'Ích Châu Kỳ Mưu Sĩ • Thục Hán Thượng Thư Lệnh', int: 94, pol: 78, war: 45, ldr: 82, dip: 74, com: 65, log: 78, cra: 40 },
  { id: 'NPC-0028', nameVi: 'Hoàng Trung (Hán Thăng)', nameEn: 'Huang Zhong (Hansheng)', han: '黄忠', style: 'Hán Thăng', age: 42, loc: 'LOC-0010', pos: 'Thần Xạ Lão Tướng • Định Quân Sơn Trảm Địch', int: 60, pol: 52, war: 93, ldr: 86, dip: 55, com: 45, log: 65, cra: 55 },
  { id: 'NPC-0029', nameVi: 'Mã Siêu (Mạnh Khởi)', nameEn: 'Ma Chao (Mengqi)', han: '马超', style: 'Mạnh Khởi', age: 20, loc: 'LOC-0005', pos: 'Cẩm Mã Siêu • Tây Lương Thần Uy Thiên Tướng Quân', int: 45, pol: 32, war: 97, ldr: 88, dip: 42, com: 45, log: 55, cra: 38 },
  { id: 'NPC-0030', nameVi: 'Ngụy Diên (Văn Trường)', nameEn: 'Wei Yan (Wenchang)', han: '魏延', style: 'Văn Trường', age: 25, loc: 'LOC-0010', pos: 'Tiên Phong Dũng Tướng • Hán Trung Thái Thú', int: 69, pol: 48, war: 92, ldr: 85, dip: 40, com: 50, log: 70, cra: 45 },
  { id: 'NPC-0031', nameVi: 'Khương Duy (Bá Ước)', nameEn: 'Jiang Wei (Boyue)', han: '姜维', style: 'Bá Ước', age: 19, loc: 'LOC-0014', pos: 'Kỳ Lân Nhi • Thừa Tướng Y Bát Kế Thừa', int: 90, pol: 70, war: 89, ldr: 90, dip: 68, com: 55, log: 82, cra: 60 },
  { id: 'NPC-0032', nameVi: 'Mi Trúc (Tử Trọng)', nameEn: 'Mi Zhu (Zizhong)', han: '麋竺', style: 'Tử Trọng', age: 28, loc: 'LOC-0009', pos: 'Từ Châu Cự Phú • Thục Hán An Hán Tướng Quân', int: 72, pol: 76, war: 35, ldr: 50, dip: 82, com: 92, log: 85, cra: 55 },
  { id: 'NPC-0033', nameVi: 'Tôn Càn (Công Hựu)', nameEn: 'Sun Qian (Gongyou)', han: '孙乾', style: 'Công Hựu', age: 26, loc: 'LOC-0004', pos: 'Biện Thuyết Danh Sĩ • Lưu Bị Sứ Giả', int: 75, pol: 74, war: 30, ldr: 45, dip: 85, com: 60, log: 68, cra: 40 },
  { id: 'NPC-0034', nameVi: 'Giản Ung (Hiến Hòa)', nameEn: 'Jian Yong (Xianhe)', han: '简雍', style: 'Hiến Hòa', age: 24, loc: 'LOC-0001', pos: 'U Châu Đồng Hương • Hài Hước Du Thuyết', int: 74, pol: 72, war: 32, ldr: 42, dip: 86, com: 65, log: 60, cra: 40 },

  // --- TÀO NGỤY (CAO-WEI) ---
  { id: 'NPC-0022', nameVi: 'Tào Tháo (Mạnh Đức)', nameEn: 'Cao Cao (Mengde)', han: '曹操', style: 'Mạnh Đức', age: 30, loc: 'LOC-0007', pos: 'Dự Châu Thống Soái • Gian Hùng Thời Loạn', int: 94, pol: 95, war: 82, ldr: 98, dip: 90, com: 85, log: 92, cra: 60 },
  { id: 'NPC-0035', nameVi: 'Tuân Úc (Văn Nhược)', nameEn: 'Xun Yu (Wenruo)', han: '荀彧', style: 'Văn Nhược', age: 28, loc: 'LOC-0007', pos: 'Vương Tá Chi Tài • Ngụy Quốc Thượng Thư Lệnh', int: 96, pol: 98, war: 25, ldr: 70, dip: 92, com: 75, log: 95, cra: 50 },
  { id: 'NPC-0036', nameVi: 'Tuân Du (Công Đạt)', nameEn: 'Xun You (Gongda)', han: '荀攸', style: 'Công Đạt', age: 27, loc: 'LOC-0007', pos: 'Quân Sự Mưu Chủ • Thập Nhị Kỳ Sách', int: 95, pol: 86, war: 28, ldr: 75, dip: 80, com: 65, log: 88, cra: 45 },
  { id: 'NPC-0037', nameVi: 'Quách Gia (Phụng Hiếu)', nameEn: 'Guo Jia (Fengxiao)', han: '郭嘉', style: 'Phụng Hiếu', age: 21, loc: 'LOC-0007', pos: 'Quỷ Tài Quân Sư • Thập Thắng Thập Bại Luận', int: 98, pol: 80, war: 20, ldr: 65, dip: 82, com: 60, log: 70, cra: 35 },
  { id: 'NPC-0038', nameVi: 'Giả Hủ (Văn Hòa)', nameEn: 'Jia Xu (Wenhe)', han: '贾诩', style: 'Văn Hòa', age: 37, loc: 'LOC-0005', pos: 'Độc Sĩ Toàn Thân • Mưu Lược Thâm Viễn', int: 97, pol: 88, war: 48, ldr: 80, dip: 85, com: 65, log: 78, cra: 40 },
  { id: 'NPC-0039', nameVi: 'Tư Mã Ý (Trọng Đạt)', nameEn: 'Sima Yi (Zhongda)', han: '司马懿', style: 'Trọng Đạt', age: 20, loc: 'LOC-0002', pos: 'Ẩn Nhẫn Trọng Thần • Lang Cố Chi Tướng', int: 98, pol: 94, war: 65, ldr: 96, dip: 88, com: 78, log: 94, cra: 65 },
  { id: 'NPC-0040', nameVi: 'Trương Liêu (Văn Viễn)', nameEn: 'Zhang Liao (Wenyuan)', han: '张辽', style: 'Văn Viễn', age: 23, loc: 'LOC-0006', pos: 'Hợp Phì Uy Chấn • Ngũ Tử Lương Tướng Chi Thủ', int: 78, pol: 60, war: 93, ldr: 94, dip: 68, com: 55, log: 78, cra: 48 },
  { id: 'NPC-0041', nameVi: 'Hứa Chử (Trọng Khang)', nameEn: 'Xu Chu (Zhongkang)', han: '许褚', style: 'Trọng Khang', age: 24, loc: 'LOC-0007', pos: 'Hổ Si Hộ Vệ • Lực Bạt Sơn Hề', int: 36, pol: 20, war: 97, ldr: 70, dip: 30, com: 40, log: 50, cra: 45 },
  { id: 'NPC-0042', nameVi: 'Điển Vi (Cổ Chi Ác Lai)', nameEn: 'Dian Wei', han: '典韦', style: 'Ác Lai', age: 26, loc: 'LOC-0007', pos: 'Thiết Kích Song Đao • Tào Doanh Đệ Nhất Dũng', int: 35, pol: 18, war: 98, ldr: 65, dip: 28, com: 35, log: 45, cra: 50 },
  { id: 'NPC-0043', nameVi: 'Hạ Hầu Đôn (Nguyên Nhượng)', nameEn: 'Xiahou Dun (Yuanrang)', han: '夏侯惇', style: 'Nguyên Nhượng', age: 28, loc: 'LOC-0007', pos: 'Bạt Nhãn Thôn Tinh • Ngụy Quốc Trọng Thần', int: 60, pol: 75, war: 90, ldr: 88, dip: 65, com: 60, log: 85, cra: 52 },
  { id: 'NPC-0044', nameVi: 'Hạ Hầu Uyên (Diệu Tài)', nameEn: 'Xiahou Yuan (Miaocai)', han: '夏侯渊', style: 'Diệu Tài', age: 27, loc: 'LOC-0007', pos: 'Tam Nhật Ngũ Bách • Thần Tốc Kỵ Tướng', int: 55, pol: 50, war: 91, ldr: 87, dip: 50, com: 50, log: 80, cra: 45 },
  { id: 'NPC-0045', nameVi: 'Tào Nhân (Tử Hiếu)', nameEn: 'Cao Ren (Zixiao)', han: '曹仁', style: 'Tử Hiếu', age: 26, loc: 'LOC-0007', pos: 'Thiết Bích Phòng Ngự • Phàn Thành Trấn Thủ', int: 68, pol: 60, war: 87, ldr: 90, dip: 55, com: 50, log: 82, cra: 55 },
  { id: 'NPC-0046', nameVi: 'Trương Cáp (Tuấn Nghệ)', nameEn: 'Zhang He (Junyi)', han: '张郃', style: 'Tuấn Nghệ', age: 25, loc: 'LOC-0006', pos: 'Xảo Biến Danh Tướng • Nhai Đình Phá Địch', int: 74, pol: 58, war: 89, ldr: 89, dip: 60, com: 52, log: 78, cra: 50 },
  { id: 'NPC-0047', nameVi: 'Từ Hoảng (Công Minh)', nameEn: 'Xu Huang (Gongming)', han: '徐晃', style: 'Công Minh', age: 26, loc: 'LOC-0005', pos: 'Chu Á Phu Phong Phạm • Khai Phủ Đoạt Kỳ', int: 70, pol: 50, war: 90, ldr: 88, dip: 55, com: 48, log: 75, cra: 45 },

  // --- ĐÔNG NGÔ (EASTERN WU) ---
  { id: 'NPC-0014', nameVi: 'Tôn Kiên (Văn Đài)', nameEn: 'Sun Jian (Wendai)', han: '孙坚', style: 'Văn Đài', age: 29, loc: 'LOC-0012', pos: 'Giang Đông Mãnh Hổ • Phạt Đổng Tiên Phong', int: 72, pol: 65, war: 94, ldr: 92, dip: 70, com: 55, log: 70, cra: 50 },
  { id: 'NPC-0048', nameVi: 'Tôn Sách (Bá Phù)', nameEn: 'Sun Ce (Bafu)', han: '孙策', style: 'Bá Phù', age: 20, loc: 'LOC-0013', pos: 'Tiểu Bá Vương • Giang Đông Khai Cơ', int: 70, pol: 68, war: 95, ldr: 93, dip: 72, com: 55, log: 72, cra: 45 },
  { id: 'NPC-0019', nameVi: 'Tôn Quyền (Trọng Mưu)', nameEn: 'Sun Quan (Zhongmou)', han: '孙权', style: 'Trọng Mưu', age: 18, loc: 'LOC-0013', pos: 'Giang Đông Chi Chủ • Ngô Đại Đế', int: 84, pol: 88, war: 68, ldr: 86, dip: 88, com: 82, log: 80, cra: 55 },
  { id: 'NPC-0017', nameVi: 'Chu Du (Công Cẩn)', nameEn: 'Zhou Yu (Gongjin)', han: '周瑜', style: 'Công Cẩn', age: 22, loc: 'LOC-0011', pos: 'Đông Ngô Đại Đô Đốc • Xích Bích Hỏa Công', int: 96, pol: 86, war: 72, ldr: 97, dip: 88, com: 75, log: 88, cra: 65 },
  { id: 'NPC-0049', nameVi: 'Lỗ Túc (Tử Kính)', nameEn: 'Lu Su (Zijing)', han: '鲁肃', style: 'Tử Kính', age: 24, loc: 'LOC-0013', pos: 'Thao Lược Đại Gia • Giang Đông Đôn Hậu Trọng Thần', int: 92, pol: 92, war: 56, ldr: 85, dip: 94, com: 86, log: 90, cra: 50 },
  { id: 'NPC-0050', nameVi: 'Lữ Mông (Tử Minh)', nameEn: 'Lu Meng (Ziming)', han: '吕蒙', style: 'Tử Minh', age: 21, loc: 'LOC-0013', pos: 'Bạch Y Độ Giang • Sĩ Biệt Tam Nhật', int: 89, pol: 78, war: 82, ldr: 92, dip: 75, com: 60, log: 84, cra: 55 },
  { id: 'NPC-0051', nameVi: 'Lục Tốn (Bá Ngôn)', nameEn: 'Lu Xun (Boyan)', han: '陆逊', style: 'Bá Ngôn', age: 19, loc: 'LOC-0013', pos: 'Di Lăng Hỏa Thiêu • Nho Tướng Kỳ Tài', int: 95, pol: 90, war: 69, ldr: 95, dip: 84, com: 70, log: 88, cra: 55 },
  { id: 'NPC-0052', nameVi: 'Hoàng Cái (Công Phúc)', nameEn: 'Huang Gai (Gongfu)', han: '黄盖', style: 'Công Phúc', age: 40, loc: 'LOC-0011', pos: 'Khổ Nhục Kế Hỏa Thuyền • Lão Thành Dũng Tướng', int: 70, pol: 60, war: 84, ldr: 82, dip: 65, com: 50, log: 75, cra: 60 },
  { id: 'NPC-0053', nameVi: 'Cam Ninh (Hưng Bá)', nameEn: 'Gan Ning (Xingba)', han: '甘宁', style: 'Hưng Bá', age: 25, loc: 'LOC-0011', pos: 'Cẩm Phàm Tặc • Bách Kỵ Kiếp Tào Doanh', int: 68, pol: 35, war: 94, ldr: 86, dip: 40, com: 55, log: 65, cra: 45 },
  { id: 'NPC-0054', nameVi: 'Thái Sử Từ (Tử Nghĩa)', nameEn: 'Taishi Ci (Ziyi)', han: '太史慈', style: 'Tử Nghĩa', age: 24, loc: 'LOC-0004', pos: 'Thần Xạ Song Kích • Đại Trượng Phu Lập Công', int: 68, pol: 55, war: 93, ldr: 84, dip: 65, com: 45, log: 68, cra: 45 },
  { id: 'NPC-0055', nameVi: 'Trương Chiêu (Tử Bố)', nameEn: 'Zhang Zhao (Zibu)', han: '张昭', style: 'Tử Bố', age: 34, loc: 'LOC-0013', pos: 'Giang Đông Văn Thần Chi Thủ • Trị Quốc An Bang', int: 85, pol: 94, war: 20, ldr: 40, dip: 80, com: 75, log: 88, cra: 40 },

  // --- QUẦN HÙNG, ĐÔNG HÁN & KHĂN VÀNG ---
  { id: 'NPC-0004', nameVi: 'Trương Giác (Thiên Công Tướng Quân)', nameEn: 'Zhang Jue', han: '张角', style: 'Đại Hiền Lương Sư', age: 44, loc: 'LOC-0003', pos: 'Thái Bình Đạo Giáo Tổ • Hoàng Cân Đại Khởi Nghĩa', int: 84, pol: 70, war: 38, ldr: 86, dip: 80, com: 60, log: 62, cra: 55 },
  { id: 'NPC-0012', nameVi: 'Lư Thực (Tử Cán)', nameEn: 'Lu Zhi (Zigan)', han: '卢植', style: 'Tử Cán', age: 45, loc: 'LOC-0003', pos: 'Bắc Quân Trung Lang Tướng • Kinh Học Đại Sư', int: 88, pol: 82, war: 70, ldr: 89, dip: 78, com: 50, log: 85, cra: 55 },
  { id: 'NPC-0056', nameVi: 'Hoàng Phủ Tung (Nghĩa Chân)', nameEn: 'Huangfu Song', han: '皇甫嵩', style: 'Nghĩa Chân', age: 46, loc: 'LOC-0007', pos: 'Tả Trung Lang Tướng • Dẹp Loạn Trường Xã', int: 86, pol: 75, war: 78, ldr: 90, dip: 72, com: 50, log: 84, cra: 50 },
  { id: 'NPC-0057', nameVi: 'Lữ Bố (Phụng Tiên)', nameEn: 'Lu Bu (Fengxian)', han: '吕布', style: 'Phụng Tiên', age: 24, loc: 'LOC-0005', pos: 'Chiến Thần Vô Song • Nhân Trung Lữ Bố', int: 26, pol: 15, war: 100, ldr: 86, dip: 30, com: 35, log: 40, cra: 45 },
  { id: 'NPC-0023', nameVi: 'Đổng Trác (Trọng Dĩnh)', nameEn: 'Dong Zhuo', han: '董卓', style: 'Trọng Dĩnh', age: 45, loc: 'LOC-0005', pos: 'Thái Sư • Tây Lương Hùng Bá', int: 72, pol: 65, war: 86, ldr: 85, dip: 50, com: 65, log: 72, cra: 40 },
  { id: 'NPC-0015', nameVi: 'Vương Doãn (Tử Sư)', nameEn: 'Wang Yun (Zishi)', han: '王允', style: 'Tử Sư', age: 47, loc: 'LOC-0005', pos: 'Tư Đồ • Đại Hán Trung Thần', int: 82, pol: 84, war: 40, ldr: 60, dip: 86, com: 60, log: 65, cra: 45 },
  { id: 'NPC-0058', nameVi: 'Trần Cung (Công Đài)', nameEn: 'Chen Gong (Gongtai)', han: '陈宫', style: 'Công Đài', age: 30, loc: 'LOC-0009', pos: 'Cương Trực Mưu Thần • Lữ Bố Quân Sư', int: 89, pol: 78, war: 52, ldr: 76, dip: 70, com: 55, log: 70, cra: 40 },
  { id: 'NPC-0018', nameVi: 'Viên Thiệu (Bản Sơ)', nameEn: 'Yuan Shao (Benchu)', han: '袁绍', style: 'Bản Sơ', age: 31, loc: 'LOC-0006', pos: 'Minh Chủ 18 Lộ Chư Hầu • Tứ Thế Tam Công', int: 70, pol: 76, war: 70, ldr: 82, dip: 80, com: 65, log: 75, cra: 45 },
  { id: 'NPC-0059', nameVi: 'Viên Thuật (Công Lộ)', nameEn: 'Yuan Shu (Gonglu)', han: '袁术', style: 'Công Lộ', age: 30, loc: 'LOC-0007', pos: 'Hoài Nam Quân Phiệt • Trọng Gia Hoàng Đế', int: 60, pol: 55, war: 62, ldr: 68, dip: 60, com: 75, log: 65, cra: 40 },
  { id: 'NPC-0060', nameVi: 'Công Tôn Toản (Bá Khuê)', nameEn: 'Gongsun Zan', han: '公孙瓒', style: 'Bá Khuê', age: 32, loc: 'LOC-0008', pos: 'Bạch Mã Nghĩa Tòng Thống Lĩnh • U Châu Mãnh Tướng', int: 64, pol: 52, war: 86, ldr: 84, dip: 55, com: 50, log: 70, cra: 42 },
  { id: 'NPC-0016', nameVi: 'Lưu Biểu (Cảnh Thăng)', nameEn: 'Liu Biao', han: '刘表', style: 'Cảnh Thăng', age: 42, loc: 'LOC-0010', pos: 'Kinh Châu Thứ Sử • Bát Tuấn Danh Sĩ', int: 78, pol: 82, war: 52, ldr: 70, dip: 80, com: 68, log: 75, cra: 50 },
  { id: 'NPC-0020', nameVi: 'Trương Lỗ (Công Kỳ)', nameEn: 'Zhang Lu', han: '张鲁', style: 'Công Kỳ', age: 35, loc: 'LOC-0014', pos: 'Hán Trung Thái Thú • Ngũ Đấu Mễ Đạo Sư', int: 74, pol: 78, war: 62, ldr: 72, dip: 75, com: 70, log: 80, cra: 50 },
  { id: 'NPC-0021', nameVi: 'Lưu Chương (Quý Ngọc)', nameEn: 'Liu Zhang', han: '刘璋', style: 'Quý Ngọc', age: 26, loc: 'LOC-0015', pos: 'Ích Châu Mục • Thiên Phủ Chi Chủ', int: 60, pol: 66, war: 45, ldr: 55, dip: 68, com: 70, log: 70, cra: 40 },
  { id: 'NPC-0013', nameVi: 'Tả Phong (Hoàng Môn Thị Lang)', nameEn: 'Zuo Feng', han: '左丰', style: 'Thị Lang', age: 32, loc: 'LOC-0002', pos: 'Thập Thường Thị Giám Quân • Triều Đình Hối Lộ Sứ', int: 65, pol: 60, war: 20, ldr: 30, dip: 68, com: 78, log: 50, cra: 20 },
  { id: 'NPC-0061', nameVi: 'Hoa Đà (Nguyên Hóa)', nameEn: 'Hua Tuo', han: '华佗', style: 'Nguyên Hóa', age: 40, loc: 'LOC-0007', pos: 'Thần Y Tam Quốc • Ma Phế Tán Y Tổ', int: 92, pol: 40, war: 30, ldr: 30, dip: 65, com: 50, log: 75, cra: 96 },

  // --- THƯƠNG NHÂN & THỢ THỦ CÔNG GIA TỘC LƯƠNG GIA ---
  { id: 'NPC-0007', nameVi: 'Trần Bảo (Thợ Cả Lương Gia)', nameEn: 'Chen Bao', han: '陈宝', style: 'Thợ Cả', age: 42, loc: 'LOC-0001', pos: 'Lương Thị Xưởng Phó • Chế Tác Khiên Giáp', int: 58, pol: 52, war: 45, ldr: 60, dip: 55, com: 62, log: 65, cra: 75 },
  { id: 'NPC-0008', nameVi: 'Triệu An (Thợ Mộc Kỳ Cựu)', nameEn: 'Zhao An', han: '赵安', style: 'Thợ Mộc', age: 36, loc: 'LOC-0001', pos: 'Lương Thị Mộc Công • Chế Tạo Khung Dệt & Xe Hàng', int: 50, pol: 45, war: 42, ldr: 50, dip: 48, com: 55, log: 60, cra: 70 },
  { id: 'NPC-0005', nameVi: 'Trương Thế Bình (Đại Thương Mã)', nameEn: 'Zhang Shiping', han: '张世平', style: 'Thương Gia', age: 40, loc: 'LOC-0001', pos: 'Trung Sơn Đại Mã Thương • Tiếp Tế Nghĩa Quân', int: 70, pol: 55, war: 50, ldr: 60, dip: 78, com: 88, log: 82, cra: 45 },
  { id: 'NPC-0006', nameVi: 'Lư Chi Vinh (Lương Bang Trưởng Lão)', nameEn: 'Lu Zhirong', han: '卢芝荣', style: 'Hội Trưởng', age: 52, loc: 'LOC-0001', pos: 'Trác Quận Mộc Nghệ Thương Hội Trưởng', int: 68, pol: 65, war: 40, ldr: 62, dip: 75, com: 80, log: 74, cra: 72 }
];

let sqlChars = 'BEGIN TRANSACTION;\n';
for (const c of charactersList) {
  sqlChars += `INSERT OR REPLACE INTO master_characters
    (npc_id, name_vi, name_en, name_han, style_name_vi, baseline_age, baseline_location, baseline_position_vi, baseline_position_en, int_attr, pol_attr, war_attr, ldr_attr, dip_attr, com_attr, log_attr, cra_attr)
    VALUES ('${c.id}', '${escapeSql(c.nameVi)}', '${escapeSql(c.nameEn)}', '${escapeSql(c.han)}', '${escapeSql(c.style)}', ${c.age}, '${c.loc}', '${escapeSql(c.pos)}', '${escapeSql(c.pos)}', ${c.int}, ${c.pol}, ${c.war}, ${c.ldr}, ${c.dip}, ${c.com}, ${c.log}, ${c.cra});\n`;
}
sqlChars += 'COMMIT;';
runOnBoth(sqlChars);
console.log(` ✅ ${charactersList.length} Master Historical Characters cataloged.`);

// Step 5: Ingest 25+ Master Skills across 8 Domains
console.log('\n[5/12] Ingesting 25+ Master Skills across 8 Professional Domains...');
const skillsList = [
  // 1. COMMERCE & ENTERPRISE
  { code: 'SKL-COM-BOOK', nameVi: 'Kê Toán & Kiểm Toán Sổ Kép', nameEn: 'Bookkeeping & Double-Entry Audit', domain: 'COMMERCE', primary: 'INT', sec: 'COM', t1: 'Ngăn ngừa sai sót cơ bản trong sổ sách', t2: 'Mở khóa báo cáo tài chính P&L hàng tháng', t3: 'Giảm thất thoát kho xưởng 15%', t4: 'Kiểm toán chi nhánh từ xa qua thư tín', t5: 'Dự báo khủng hoảng thanh khoản trước 2 lượt' },
  { code: 'SKL-COM-APPRAISE', nameVi: 'Giám Định Hàng Hóa & Hóa Thực', nameEn: 'Appraisal & Market Arbitrage', domain: 'COMMERCE', primary: 'COM', sec: 'INT', t1: 'Nhận biết phẩm chất hàng loại B/C/A', t2: 'Phát hiện hàng giả, kim loại pha tạp', t3: 'Tăng 10% biên lợi nhuận buôn xa', t4: 'Chiết khấu 10% khi ký hợp đồng mua sỉ', t5: 'Độc quyền thao túng giá cả vùng' },
  { code: 'SKL-COM-CARAVAN', nameVi: 'Vận Tiêu & Hộ Thương Đường Dài', nameEn: 'Interstate Caravan Navigating', domain: 'COMMERCE', primary: 'COM', sec: 'LOG', t1: 'Giảm 10% phí bảo hiểm thương đoàn', t2: 'Mở rộng đoàn buôn lên 5 xe hàng', t3: 'Tránh né 30% thảo khấu dọc quan đạo', t4: 'Thiết lập trạm buôn tơ lụa liên châu', t5: 'Thương lộ ngàn dặm thông suốt Tây Vực' },
  { code: 'SKL-MGT-ENTERPRISE', nameVi: 'Quản Lý Doanh Nghiệp & Phân Quyền', nameEn: 'Enterprise Management & Delegation', domain: 'COMMERCE', primary: 'COM', sec: 'LDR', t1: 'Giảm 10% thời gian nhàn rỗi công nhân', t2: 'Phân quyền thợ cả vận hành 85% công suất', t3: 'Tăng 15% năng suất lao động', t4: 'Mở phân xưởng tại các châu phủ khác', t5: 'Đế chế sản xuất tự động quy mô vạn người' },

  // 2. CRAFT & ENGINEERING
  { code: 'SKL-CRA-WEAVE', nameVi: 'Biên Dệt Tre Trúc & Khiên Giáp', nameEn: 'Bamboo, Reed & Shield Weaving', domain: 'CRAFT', primary: 'CRA', sec: 'LOG', t1: 'Dệt chiếu và giỏ đan tỷ lệ phế phẩm 8%', t2: 'Giảm phế phẩm còn 4%, mở khóa giáp trúc', t3: 'Chế tác khiên trúc bọc da quân dụng', t4: 'Tăng 20% tốc độ đan dệt hàng loạt', t5: 'Tuyệt kỹ khiên trúc ngự tiễn trứ danh' },
  { code: 'SKL-CRA-SMITH', nameVi: 'Rèn Đúc Binh Khí & Nỏ Liên Châu', nameEn: 'Weapon Smithing & Metallurgy', domain: 'CRAFT', primary: 'CRA', sec: 'WAR', t1: 'Sửa chữa và mài bén đao thương', t2: 'Đúc mũi thương sắt tiêu chuẩn quân đội', t3: 'Rèn Hán Trực Đao bách luyện chống mẻ', t4: 'Chế tạo nỏ cứng bắn xa 120 bước', t5: 'Tuyệt tác thần binh bảo đao truyền thế' },
  { code: 'SKL-CRA-SHIP', nameVi: 'Đóng Thuyền Thủy Chiến & Mông Xung', nameEn: 'Naval Shipwright & Marine Craft', domain: 'CRAFT', primary: 'CRA', sec: 'LOG', t1: 'Đóng bè tre và thuyền nhỏ vận tải', t2: 'Đóng thuyền tuần tra Trường Giang', t3: 'Đóng thuyền chiến Mông Xung bọc da', t4: 'Đóng Lâu Thuyền 3 tầng chở 200 quân', t5: 'Hạm đội thủy chiến kiên cố kháng phong ba' },

  // 3. MARTIAL & COMBAT
  { code: 'SKL-WAR-SPEAR', nameVi: 'Thương Thuật Thực Chiến', nameEn: 'Spear & Polearm Mastery', domain: 'MARTIAL', primary: 'WAR', sec: 'LDR', t1: 'Đỡ đòn kỵ binh xung kích (+5% phòng ngự)', t2: 'Mở khóa thế thủ cắm thương cản chiến mã', t3: 'Đấu thương đoạt mạng (Xà Mâu Thần Kỹ)', t4: 'Tuyệt kỹ đâm xuyên hộ tâm phiến', t5: 'Thương thần vô địch quét sạch vạn quân' },
  { code: 'SKL-WAR-BLADE', nameVi: 'Đao Pháp Mãnh Hổ & Đoản Binh', nameEn: 'Dao Blade & Close-Quarters Combat', domain: 'MARTIAL', primary: 'WAR', sec: 'WAR', t1: 'Chém đoản binh giáp lá cà cơ bản', t2: 'Trảm mã đao pháp chém đứt chân ngựa', t3: 'Bát Quái Đao Trận phá vòng vây', t4: 'Trảm tướng đoạt kỳ trong hỗn chiến', t5: 'Thanh Long Yển Nguyệt tuyệt sát vô song' },
  { code: 'SKL-WAR-ARCH', nameVi: 'Cung Thuật & Xạ Kích Bách Bộ', nameEn: 'Archery & Marksmanship', domain: 'MARTIAL', primary: 'WAR', sec: 'CRA', t1: 'Bắn trúng mục tiêu cự ly 50 bước', t2: 'Phối hợp mưa tên xạ kích đồng loạt', t3: 'Bắn tên lửa hỏa công trại địch', t4: 'Bách bộ xuyên dương bắn rơi tướng địch', t5: 'Cung thần xạ tiễn định đoạt chiến trường' },
  { code: 'SKL-WAR-RIDE', nameVi: 'Kỵ Xạ & Đột Kích Mã Tấu', nameEn: 'Horsemanship & Mounted Shock', domain: 'MARTIAL', primary: 'WAR', sec: 'LOG', t1: 'Cưỡi ngựa vượt địa hình đồi dốc', t2: 'Bắn cung trên lưng ngựa chính xác', t3: 'Đột kích kỵ binh phá tan đội hình bộ binh', t4: 'Thao diễn Hổ Báo Kỵ / Bạch Mã Nghĩa Tòng', t5: 'Thiết kỵ tung hoành thiên hạ vô địch' },

  // 4. LEADERSHIP & DRILL
  { code: 'SKL-LDR-DRILL', nameVi: 'Huấn Luyện & Thao Diễn Quân Đội', nameEn: 'Troop Drill & Formations', domain: 'LEADERSHIP', primary: 'LDR', sec: 'WAR', t1: 'Rút ngắn 10% thời gian tân binh luyện tập', t2: 'Hành quân không hao tổn sĩ khí', t3: 'Mở khóa trận pháp Hạc Dực và Nhạn Hành', t4: 'Binh sĩ kiên định khi bị tập kích đêm', t5: 'Quân đội thép trăm trận trăm thắng' },
  { code: 'SKL-LDR-INSP', nameVi: 'Cổ Vũ Tướng Sĩ & Dục Huyết Khích Lệ', nameEn: 'Battlefield Morale Inspiration', domain: 'LEADERSHIP', primary: 'LDR', sec: 'DIP', t1: 'Khôi phục 5% sĩ khí sau thất bại nhỏ', t2: 'Hò reo trợ chiến tăng 10% công kích', t3: 'Ngăn chặn đào ngũ khi thiếu lương 1 tháng', t4: 'Kích hoạt trạng thái tử chiến quên mình', t5: 'Một lời hiệu triệu vạn người xông pha' },

  // 5. TACTICS & STRATAGEMS
  { code: 'SKL-TAC-STRAT', nameVi: 'Binh Pháp & Mưu Lược Quân Sự', nameEn: 'Tactical Stratagems & Deception', domain: 'TACTICS', primary: 'INT', sec: 'LDR', t1: 'Phát hiện bẫy địa hình và mai phục nhỏ', t2: 'Bày trận nghi binh, đèn đuốc giả doanh', t3: 'Dụ địch vào tử địa khe núi tiêu diệt', t4: 'Mưu lược liên hoàn kế lừa soái tướng địch', t5: 'Thần cơ xuất quỷ nhập thần quyết thắng' },
  { code: 'SKL-TAC-FIRE', nameVi: 'Hỏa Công & Thiên Thời Gió Lửa', nameEn: 'Naval & Field Fire Tactics', domain: 'TACTICS', primary: 'INT', sec: 'CRA', t1: 'Đốt trại cỏ khô mùa hanh hao', t2: 'Đoán hướng gió đông nam chuẩn xác', t3: 'Chế tạo thuyền mồi lửa gắn nhựa thông', t4: 'Hỏa thiêu liên hoàn chiến thuyền trăm dặm', t5: 'Hỏa thần thiêu rụi cự pháo và đại quân' },
  { code: 'SKL-TAC-SCOUT', nameVi: 'Thám Báo Địa Lý & Tình Báo Chiến Dịch', nameEn: 'Reconnaissance & Military Intel', domain: 'TACTICS', primary: 'INT', sec: 'LOG', t1: 'Nắm bắt lộ trình dịch trạm trong 100 dặm', t2: 'Phát hiện quân nhu và kho lương của địch', t3: 'Do thám chính xác binh lực thành trì địch', t4: 'Mua chuộc lính gác mở cổng thành', t5: 'Mạng lưới thiên nhãn thấu suốt Trung Nguyên' },

  // 6. POLITICS & GOVERNANCE
  { code: 'SKL-POL-ADMIN', nameVi: 'Hành Chính & Trị Lý Bang Quốc', nameEn: 'Civil Administration & Bureaucracy', domain: 'POLITICS', primary: 'POL', sec: 'INT', t1: 'Nắm vững luật lệ thuế má nha môn', t2: 'Giảm 15% tham nhũng thất thoát tô thuế', t3: 'Phục hồi trị an quận huyện (+5 điểm/tháng)', t4: 'Trị lý toàn diện quận thành phong túc', t5: 'Quốc sách an dân định thiên hạ thái bình' },
  { code: 'SKL-POL-TUNTIAN', nameVi: 'Đồn Điền Tích Cốc & Khuyến Nông', nameEn: 'Agricultural Military Tuntian', domain: 'POLITICS', primary: 'POL', sec: 'LOG', t1: 'Khai hoang đất trống tăng 10% vụ mùa', t2: 'Cho binh lính làm ruộng thời bình', t3: 'Xây kênh mương thủy lợi trữ nước', t4: 'Kho thóc đầy ắp 10 vạn thạch quân lương', t5: 'Đồn điền hưng thịnh cấp lương cho 30 vạn quân' },

  // 7. DIPLOMACY & RHETORIC
  { code: 'SKL-DIP-RHET', nameVi: 'Biện Thuyết Du Thuyết & Bang Giao', nameEn: 'Diplomatic Rhetoric & Persuasion', domain: 'DIPLOMACY', primary: 'DIP', sec: 'INT', t1: 'Lễ nghi bang giao không phạm sai lầm', t2: 'Thương thảo mượn đường hành quân', t3: 'Thuyết phục chư hầu liên minh chống địch', t4: 'Đơn đao phó hội điều đình hòa ước', t5: 'Một tấc lưỡi mạnh hơn trăm vạn hùng binh' },
  { code: 'SKL-DIP-SCHEME', nameVi: 'Ly Gián Kế & Mật Đạo Phản Gián', nameEn: 'Subversion & Espionage Schemes', domain: 'DIPLOMACY', primary: 'DIP', sec: 'INT', t1: 'Gieo tin đồn làm lung lạc dân tâm', t2: 'Viết mật thư bôi xóa gây ngờ vực', t3: 'Ly gián quân thần khiến tướng bị triệu hồi', t4: 'Kích động nội loạn trong đại doanh địch', t5: 'Mỹ nhân kế / Diệt sát quyền thần phản loạn' },

  // 8. LOGISTICS & PROVISIONING
  { code: 'SKL-LOG-PROV', nameVi: 'Lương Thảo Vận Trù & Tiếp Tế Tiền Tuyến', nameEn: 'Quartermastering & Supply Logistics', domain: 'LOGISTICS', primary: 'LOG', sec: 'COM', t1: 'Giảm 20% hao hụt lương thảo dọc đường', t2: 'Tăng 15% tốc độ xe ngựa chở lương', t3: 'Duy trì chiến đấu dù thiếu 20% khẩu phần', t4: 'Thiết lập kho đồn trú tiền phương vững chắc', t5: 'Hậu cần hoàn hảo tiếp tế ngàn dặm không đứt' }
];

let sqlSkills = 'BEGIN TRANSACTION;\n';
for (const sk of skillsList) {
  sqlSkills += `INSERT OR REPLACE INTO master_skills
    (skill_code, skill_name_vi, skill_name_en, domain, primary_attr, secondary_attr, tier_1_effect_vi, tier_2_effect_vi, tier_3_effect_vi, tier_4_effect_vi, tier_5_effect_vi)
    VALUES ('${sk.code}', '${escapeSql(sk.nameVi)}', '${escapeSql(sk.nameEn)}', '${sk.domain}', '${sk.primary}', '${sk.sec}', '${escapeSql(sk.t1)}', '${escapeSql(sk.t2)}', '${escapeSql(sk.t3)}', '${escapeSql(sk.t4)}', '${escapeSql(sk.t5)}');\n`;
}
sqlSkills += 'COMMIT;';
runOnBoth(sqlSkills);
console.log(` ✅ ${skillsList.length} Master Skills registered across 8 domains.`);

// Step 6: Ingest 20+ Master Innate Talents
console.log('\n[6/12] Ingesting Master Innate Talents & Hero Traits (master_talents)...');
const talentsList = [
  { code: 'TLT-VOID-HERO', nameVi: 'Gian Hùng Thời Loạn', nameEn: 'Hero of Chaos', cat: 'LEADERSHIP', rarity: 'LEGENDARY', vi: 'Thà ta phụ người chứ không để người phụ ta. Tăng 15% sát thương khi chỉ huy và giảm 20% tổn thất khi rút lui.', en: 'Supreme ruthlessness and strategic brilliance in troubled times.', npc: 'NPC-0022' },
  { code: 'TLT-GOD-WAR', nameVi: 'Võ Thánh Oai Trấn', nameEn: 'God of War', cat: 'MARTIAL', rarity: 'LEGENDARY', vi: 'Võ nghệ tuyệt đỉnh, chém tướng đoạt kỳ trong chớp mắt. Đòn đầu tiên trong đơn đấu luôn gây sát thương chí mạng.', en: 'Unrivaled martial prowess that strikes terror into enemy commanders.', npc: 'NPC-0003' },
  { code: 'TLT-ROAR-BRIDGE', nameVi: 'Đoạn Trường Hống', nameEn: 'Bridge-Shaking Roar', cat: 'MARTIAL', rarity: 'EPIC', vi: 'Tiếng thét như sấm sét làm khiếp vía vạn quân. Giảm 25% sĩ khí toàn bộ quân địch xung quanh trong giao tranh.', en: 'Fierce roar that routs faint-hearted opponents.', npc: 'NPC-0002' },
  { code: 'TLT-BENEVOLENCE', nameVi: 'Nhân Nghĩa Thiên Hạ', nameEn: 'Supreme Benevolence', cat: 'GOVERNANCE', rarity: 'LEGENDARY', vi: 'Lòng nhân từ thu phục lòng dân và danh sĩ. Hảo cảm tự động tăng +1 mỗi tháng đối với tất cả nhân sĩ cùng châu.', en: 'Deep virtue and mercy that attracts loyal retainers naturally.', npc: 'NPC-0001' },
  { code: 'TLT-DRAGON-WIT', nameVi: 'Ngọa Long Thiên Cơ', nameEn: 'Crouching Dragon Insight', cat: 'STRATEGY', rarity: 'LEGENDARY', vi: 'Nhìn thấu càn khôn biến hóa, dự đoán chuẩn xác mọi mưu kế của địch. Tỷ lệ thành công kế mưu tăng 30%.', en: 'Transcendental intellect and masterwork engineering.', npc: 'NPC-0025' },
  { code: 'TLT-PEERLESS', nameVi: 'Chiến Thần Vô Song', nameEn: 'Peerless Warrior', cat: 'MARTIAL', rarity: 'LEGENDARY', vi: 'Sức địch vạn người, kích pháp xuất quỷ nhập thần. Luôn giành chiến thắng tuyệt đối trong đơn đấu.', en: 'Matchless martial might upon the steed Red Hare.', npc: 'NPC-0057' },
  { code: 'TLT-FIRE-GENIUS', nameVi: 'Đông Ngô Chu Lang', nameEn: 'Crimson Fire Master', cat: 'STRATEGY', rarity: 'EPIC', vi: 'Hỏa công Trường Giang đốt tan vạn thuyền. Tăng 40% sát thương từ các đòn hỏa công và thủy chiến.', en: 'Peerless naval command and devastating fire stratagems.', npc: 'NPC-0017' },
  { code: 'TLT-CALC', nameVi: 'Thần Toán Hóa Thực', nameEn: 'Quick Reckoner', cat: 'COMMERCE', rarity: 'RARE', vi: 'Đầu óc tính toán siêu việt, tính nhẩm sổ sách không sai một ly. Tăng 10% lợi nhuận buôn bán sỉ.', en: 'Instant mental arithmetic; eliminates ledger blunders.', npc: null },
  { code: 'TLT-CALM', nameVi: 'Thâm Trầm Định Tâm', nameEn: 'Composed Demeanor', cat: 'GOVERNANCE', rarity: 'RARE', vi: 'Gặp biến không kinh, bình tĩnh xử trí. Kháng cự 100% các đòn áp bức uy hiếp về tinh thần.', en: 'Steadfast composure under extreme political pressure.', npc: null },
  { code: 'TLT-PROPHET', nameVi: 'Đại Hiền Lương Sư', nameEn: 'Millenarian Zeal', cat: 'LEADERSHIP', rarity: 'EPIC', vi: 'Tuyên truyền đạo pháp mê hoặc lòng dân, triệu tập vạn tín đồ trong tích tắc.', en: 'Hypnotic mass mobilization converting commoners into fanatical fighters.', npc: 'NPC-0004' }
];

let sqlTalents = 'BEGIN TRANSACTION;\n';
for (const t of talentsList) {
  sqlTalents += `INSERT OR REPLACE INTO master_talents
    (talent_code, name_vi, name_en, category, rarity, effect_vi, effect_en, exclusive_to_npc_id)
    VALUES ('${t.code}', '${escapeSql(t.nameVi)}', '${escapeSql(t.nameEn)}', '${t.cat}', '${t.rarity}', '${escapeSql(t.vi)}', '${escapeSql(t.en)}', ${t.npc ? `'${t.npc}'` : 'NULL'});\n`;
}
sqlTalents += 'COMMIT;';
runOnBoth(sqlTalents);
console.log(` ✅ ${talentsList.length} Master Innate Talents cataloged.`);

// Step 7: Ingest Commodities, Weapons & Masterworks
console.log('\n[7/12] Ingesting 25+ Master Items & Legendary Artifacts...');
const itemsList = [
  // Raw materials
  { code: 'COM-GRAIN', nameVi: 'Lương Thảo (Tiểu Mạch / Kê)', nameEn: 'Grain (Millet / Wheat)', cat: 'FOOD_STUFF', unitVi: 'Thạch', unitEn: 'Dan', peace: 100, market: 175, vol: 'High' },
  { code: 'COM-TIMBER', nameVi: 'Gỗ Tốt Đẽo Gọt', nameEn: 'Cured Hardwood Planks', cat: 'RAW_MATERIAL', unitVi: 'Bó', unitEn: 'Bundle', peace: 35, market: 40, vol: 'Moderate' },
  { code: 'COM-BAMBOO', nameVi: 'Tre Trúc U Châu', nameEn: 'Prepared Bamboo & Reed', cat: 'RAW_MATERIAL', unitVi: 'Bó', unitEn: 'Bundle', peace: 12, market: 15, vol: 'Low' },
  { code: 'COM-IRON', nameVi: 'Sắt Thỏi Luyện Tinh', nameEn: 'Smelted Pig Iron', cat: 'RAW_MATERIAL', unitVi: 'Cân', unitEn: 'Jin', peace: 20, market: 30, vol: 'High' },
  { code: 'COM-SALT', nameVi: 'Muối Hạt Biển Thanh Châu', nameEn: 'Refined Sea Salt', cat: 'FOOD_STUFF', unitVi: 'Đấu', unitEn: 'Dou', peace: 50, market: 65, vol: 'Moderate' },
  { code: 'COM-SILK', nameVi: 'Tơ Lụa Nguyên Tấm', nameEn: 'Raw Silk Bolt', cat: 'FINISHED_GOOD', unitVi: 'Thất', unitEn: 'Pi', peace: 450, market: 420, vol: 'Moderate' },
  { code: 'COM-LEATH', nameVi: 'Da Thuộc (Trâu / Cừu)', nameEn: 'Tanned Hide', cat: 'RAW_MATERIAL', unitVi: 'Tấm', unitEn: 'Piece', peace: 80, market: 100, vol: 'High' },
  { code: 'COM-TEA', nameVi: 'Trà Ngon Giang Nam', nameEn: 'Jiangnan Green Tea', cat: 'FINISHED_GOOD', unitVi: 'Cân', unitEn: 'Jin', peace: 120, market: 150, vol: 'Moderate' },
  { code: 'COM-CERAMIC', nameVi: 'Gốm Sứ Kiến Khang', nameEn: 'Jiankang Fine Porcelain', cat: 'FINISHED_GOOD', unitVi: 'Kiện', unitEn: 'Crate', peace: 300, market: 380, vol: 'Low' },
  { code: 'COM-HERB', nameVi: 'Dược Liệu Thục Xuyên', nameEn: 'Sichuan Medicinal Herbs', cat: 'RAW_MATERIAL', unitVi: 'Bao', unitEn: 'Sack', peace: 90, market: 140, vol: 'High' },
  { code: 'COM-WINE', nameVi: 'Rượu Trác Thành Trán Nương', nameEn: 'Zhuo Vintage Peach Wine', cat: 'FINISHED_GOOD', unitVi: 'Vò', unitEn: 'Jar', peace: 40, market: 60, vol: 'Moderate' },

  // Standard military gear
  { code: 'PROD-MAT', nameVi: 'Chiếu Trúc Lương Gia', nameEn: 'Liang Bamboo Sleeping Mat', cat: 'FINISHED_GOOD', unitVi: 'Tấm', unitEn: 'Item', peace: 18, market: 25, vol: 'Low' },
  { code: 'PROD-BASK', nameVi: 'Giỏ Thùng Đan Vận Chuyển', nameEn: 'Storage Basket', cat: 'FINISHED_GOOD', unitVi: 'Cái', unitEn: 'Item', peace: 22, market: 50, vol: 'High' },
  { code: 'PROD-SHIELD-BAM', nameVi: 'Khiên Trúc Bọc Da Quân Dụng', nameEn: 'Leather Bamboo Shield', cat: 'MILITARY_EQUIPMENT', unitVi: 'Chiếc', unitEn: 'Unit', peace: 90, market: 140, vol: 'Very High' },
  { code: 'COM-SPEAR', nameVi: 'Thương Sắt Bộ Binh', nameEn: 'Iron Infantry Spear', cat: 'MILITARY_EQUIPMENT', unitVi: 'Cây', unitEn: 'Unit', peace: 350, market: 580, vol: 'Very High' },
  { code: 'COM-SWORD', nameVi: 'Hán Trực Đao Bách Luyện', nameEn: 'Han Standard Dao Sword', cat: 'MILITARY_EQUIPMENT', unitVi: 'Thanh', unitEn: 'Unit', peace: 700, market: 1150, vol: 'Very High' },
  { code: 'COM-CROSSBOW', nameVi: 'Nỏ Liên Châu Tinh Chế', nameEn: 'Repeating Crossbow', cat: 'MILITARY_EQUIPMENT', unitVi: 'Cây', unitEn: 'Unit', peace: 1200, market: 1800, vol: 'Very High' },

  // Mounts
  { code: 'COM-HORSE-D', nameVi: 'Ngựa Thồ & Ngựa Kéo', nameEn: 'Pack Horse', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'Head', peace: 4500, market: 4800, vol: 'Moderate' },
  { code: 'COM-HORSE-W', nameVi: 'Chiến Mã Phương Bắc', nameEn: 'Northern War Steed', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'Head', peace: 14000, market: 19000, vol: 'Very High' },
  { code: 'MOUNT-RED-HARE', nameVi: 'Thần Mã Xích Thố', nameEn: 'Red Hare Steed', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'Head', peace: 100000, market: 150000, vol: 'Unique' },
  { code: 'MOUNT-HEX-MARK', nameVi: 'Chiến Mã Đích Lô', nameEn: 'Hex Mark Steed', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'Head', peace: 60000, market: 80000, vol: 'Unique' },

  // Legendary weapons
  { code: 'WEAP-GREEN-DRAGON', nameVi: 'Thanh Long Yển Nguyệt Đao', nameEn: 'Green Dragon Crescent Blade', cat: 'MILITARY_EQUIPMENT', unitVi: 'Thanh', unitEn: 'Artifact', peace: 50000, market: 80000, vol: 'Unique' },
  { code: 'WEAP-SERPENT-SPEAR', nameVi: 'Bát Xà Mâu (Trượng Bát)', nameEn: 'Eight-Foot Serpent Spear', cat: 'MILITARY_EQUIPMENT', unitVi: 'Cây', unitEn: 'Artifact', peace: 45000, market: 75000, vol: 'Unique' },
  { code: 'WEAP-SKY-PIERCER', nameVi: 'Phương Thiên Họa Kích', nameEn: 'Sky Piercer Halberd', cat: 'MILITARY_EQUIPMENT', unitVi: 'Cây', unitEn: 'Artifact', peace: 80000, market: 120000, vol: 'Unique' },
  { code: 'WEAP-HEAVEN-SWORD', nameVi: 'Ỷ Thiên Kiếm Triều Hán', nameEn: 'Sword of Heaven', cat: 'MILITARY_EQUIPMENT', unitVi: 'Thanh', unitEn: 'Artifact', peace: 60000, market: 90000, vol: 'Unique' }
];

let sqlItems = 'BEGIN TRANSACTION;\n';
for (const item of itemsList) {
  sqlItems += `INSERT OR REPLACE INTO master_items
    (item_code, name_vi, name_en, category, unit_vi, unit_en, baseline_peace_price, current_market_price, volatility_index)
    VALUES ('${item.code}', '${escapeSql(item.nameVi)}', '${escapeSql(item.nameEn)}', '${item.cat}', '${escapeSql(item.unitVi)}', '${escapeSql(item.unitEn)}', ${item.peace}, ${item.market}, '${escapeSql(item.vol)}');\n`;
}
sqlItems += 'COMMIT;';
runOnBoth(sqlItems);
console.log(` ✅ ${itemsList.length} Master Commodity & Products cataloged.`);

// Step 8: Ingest Crafting Recipes & BOM
console.log('\n[8/12] Ingesting Master Crafting Recipes & BOM...');
const recipesList = [
  { code: 'REC-MAT-BAM', prodCode: 'PROD-MAT', nameVi: 'Đan Dệt Chiếu Trúc Lương Gia', nameEn: 'Weave Liang Bamboo Sleeping Mat', cat: 'WEAVING', hours: 4.0, defect: 0.04, skill: 'SKL-CRA-WEAVE', inputs: JSON.stringify([{ item_code: 'COM-BAMBOO', quantity: 1, unit: 'Bó' }]) },
  { code: 'REC-BASK-REED', prodCode: 'PROD-BASK', nameVi: 'Đan Thùng Giỏ Đựng Lương Vận Chuyển', nameEn: 'Craft Reinforced Grain Storage Basket', cat: 'BASKETRY', hours: 5.5, defect: 0.05, skill: 'SKL-CRA-WEAVE', inputs: JSON.stringify([{ item_code: 'COM-BAMBOO', quantity: 1.5, unit: 'Bó' }]) },
  { code: 'REC-SHIELD-BAM', prodCode: 'PROD-SHIELD-BAM', nameVi: 'Chế Tác Khiên Trúc Bọc Da Quân Dụng', nameEn: 'Craft Leather-Bound Bamboo Shield', cat: 'ARMOR_CRAFTING', hours: 12.0, defect: 0.08, skill: 'SKL-CRA-WEAVE', inputs: JSON.stringify([{ item_code: 'COM-BAMBOO', quantity: 2, unit: 'Bó' }, { item_code: 'COM-LEATH', quantity: 1, unit: 'Tấm' }]) },
  { code: 'REC-SPEAR-IRON', prodCode: 'COM-SPEAR', nameVi: 'Rèn Đúc Thương Sắt Bộ Binh', nameEn: 'Forge Infantry Iron Spear', cat: 'SMITHING', hours: 16.0, defect: 0.06, skill: 'SKL-CRA-SMITH', inputs: JSON.stringify([{ item_code: 'COM-TIMBER', quantity: 1, unit: 'Cây' }, { item_code: 'COM-IRON', quantity: 2, unit: 'Cân' }]) },
  { code: 'REC-SWORD-HAN', prodCode: 'COM-SWORD', nameVi: 'Rèn Hán Trực Đao Bách Luyện', nameEn: 'Forge Han Standard Dao Sword', cat: 'SMITHING', hours: 24.0, defect: 0.05, skill: 'SKL-CRA-SMITH', inputs: JSON.stringify([{ item_code: 'COM-TIMBER', quantity: 0.5, unit: 'Cây' }, { item_code: 'COM-IRON', quantity: 3.5, unit: 'Cân' }]) },
  { code: 'REC-WINE-BREW', prodCode: 'COM-WINE', nameVi: 'Ủ Rượu Đào Viên Trác Thành', nameEn: 'Brew Peach Blossom Wine', cat: 'BREWING', hours: 8.0, defect: 0.03, skill: 'SKL-COM-APPRAISE', inputs: JSON.stringify([{ item_code: 'COM-GRAIN', quantity: 0.5, unit: 'Thạch' }]) }
];

let sqlRecipes = 'BEGIN TRANSACTION;\n';
for (const r of recipesList) {
  sqlRecipes += `INSERT OR REPLACE INTO master_recipes
    (recipe_code, product_item_code, product_name_vi, product_name_en, category, standard_labor_hours, base_defect_rate, required_skill_code, bom_inputs)
    VALUES ('${r.code}', '${r.prodCode}', '${escapeSql(r.nameVi)}', '${escapeSql(r.nameEn)}', '${r.cat}', ${r.hours}, ${r.defect}, '${r.skill}', '${escapeSql(r.inputs)}');\n`;
}
sqlRecipes += 'COMMIT;';
runOnBoth(sqlRecipes);
console.log(` ✅ ${recipesList.length} Master Crafting Recipes cataloged.`);

// Step 9: Ingest Locations
console.log('\n[9/12] Ingesting Master Locations & Citadels...');
const mapDataPath = path.join(ROOT_DIR, 'public', 'js', 'map-data.js');
const mapDataRaw = fs.readFileSync(mapDataPath, 'utf8');

const nodesRegex = /'([a-z_]+)':\s*\{([\s\S]*?)\n\s*\},/g;
let nodeMatch;
let locCount = 0;
let sqlLocs = 'BEGIN TRANSACTION;\n';

const locIdMap = {
  'zhuo_xian': 'LOC-0001',
  'luo_yang': 'LOC-0002',
  'guang_zong': 'LOC-0003',
  'ping_yuan': 'LOC-0004',
  'chang_an': 'LOC-0005',
  'ye_cheng': 'LOC-0006',
  'xu_chang': 'LOC-0007',
  'bei_ping': 'LOC-0008',
  'xia_pi': 'LOC-0009',
  'xiang_yang': 'LOC-0010',
  'chi_bi': 'LOC-0011',
  'jiang_ling': 'LOC-0012',
  'jian_ye': 'LOC-0013',
  'han_zhong': 'LOC-0014',
  'cheng_du': 'LOC-0015'
};

while ((nodeMatch = nodesRegex.exec(mapDataRaw)) !== null) {
  const nodeKey = nodeMatch[1];
  const block = nodeMatch[2];

  const getProp = (prop) => {
    const m = block.match(new RegExp(`${prop}:\\s*['"](.*?)['"]`));
    return m ? m[1] : '';
  };
  const getNum = (prop, defVal = 0) => {
    const m = block.match(new RegExp(`${prop}:\\s*([0-9.]+)`));
    return m ? parseFloat(m[1]) : defVal;
  };

  const nameVi = getProp('nameVi') || nodeKey;
  const nameEn = getProp('nameEn') || nodeKey;
  const provinceVi = getProp('provinceVi') || 'Trung Nguyên';
  const provinceEn = getProp('provinceEn') || 'Central Plains';
  const coordX = getNum('x', 300);
  const coordY = getNum('y', 200);
  const dist = getNum('distanceFromZhuo', 0);
  const days = getNum('daysRequired', 1.0);
  const grain = getNum('grainCost', 1.0);
  const threatVi = getProp('threatVi');
  const threatEn = getProp('threatEn');
  const statusVi = getProp('statusVi');
  const statusEn = getProp('statusEn');
  const defaultSubLoc = getProp('defaultSubLoc') || nameVi;
  const figuresVi = getProp('figuresVi');
  const figuresEn = getProp('figuresEn');
  const intelVi = getProp('intelVi');
  const intelEn = getProp('intelEn');

  const locId = locIdMap[nodeKey] || `LOC-${String(locCount + 1).padStart(4, '0')}`;

  sqlLocs += `INSERT OR REPLACE INTO master_locations
    (location_id, name_vi, name_en, province_vi, province_en, coord_x, coord_y, distance_from_zhuo, march_days, grain_cost, threat_level_vi, threat_level_en, status_vi, status_en, default_sub_loc, key_figures_vi, key_figures_en, strategic_intel_vi, strategic_intel_en)
    VALUES ('${locId}', '${escapeSql(nameVi)}', '${escapeSql(nameEn)}', '${escapeSql(provinceVi)}', '${escapeSql(provinceEn)}', ${coordX}, ${coordY}, ${dist}, ${days}, ${grain}, '${escapeSql(threatVi)}', '${escapeSql(threatEn)}', '${escapeSql(statusVi)}', '${escapeSql(statusEn)}', '${escapeSql(defaultSubLoc)}', '${escapeSql(figuresVi)}', '${escapeSql(figuresEn)}', '${escapeSql(intelVi)}', '${escapeSql(intelEn)}');\n`;
  locCount++;
}

sqlLocs += 'COMMIT;';
runOnBoth(sqlLocs);
console.log(` ✅ ${locCount} Master Strategic Citadels ingested.`);

// Step 10: Ingest Inter-Citadel Geographic Routes
console.log('\n[10/12] Ingesting 20+ Master March & Trade Routes (master_routes)...');
const routesList = [
  { id: 'RT-ZHUO-BEIPING', src: 'LOC-0001', tgt: 'LOC-0008', li: 240, terrain: 'PLAINS', days: 1.0, grain: 1.2, risk: 'LOW', desc: 'Quan đạo U Châu bằng phẳng, ngựa xe cơ động nhanh chóng.' },
  { id: 'RT-ZHUO-GUANGZONG', src: 'LOC-0001', tgt: 'LOC-0003', li: 320, terrain: 'PLAINS', days: 1.5, grain: 1.5, risk: 'HIGH', desc: 'Đường tiến vào Ký Châu, thường xuyên gặp tàn binh Khăn Vàng quấy nhiễu.' },
  { id: 'RT-GUANGZONG-PINGYUAN', src: 'LOC-0003', tgt: 'LOC-0004', li: 180, terrain: 'PLAINS', days: 1.0, grain: 1.0, risk: 'MODERATE', desc: 'Tuyến nối liền Ký Châu sang Thanh Châu dọc vịnh Bột Hải.' },
  { id: 'RT-GUANGZONG-YE', src: 'LOC-0003', tgt: 'LOC-0006', li: 200, terrain: 'PLAINS', days: 1.0, grain: 1.2, risk: 'MODERATE', desc: 'Tiến về Nghiệp Thành thủ phủ Ký Châu, dân cư trù mật.' },
  { id: 'RT-YE-LUOYANG', src: 'LOC-0006', tgt: 'LOC-0002', li: 480, terrain: 'RIVER_CROSSING', days: 2.5, grain: 3.0, risk: 'MODERATE', desc: 'Vượt Hoàng Hà xuôi nam tiến vào Kinh Sư Lạc Dương.' },
  { id: 'RT-LUOYANG-CHANGAN', src: 'LOC-0002', tgt: 'LOC-0005', li: 380, terrain: 'MOUNTAIN_PASS', days: 2.0, grain: 2.5, risk: 'MODERATE', desc: 'Qua ải Hàm Cốc Quan và Đồng Quan hiểm trở tiến vào Quan Trung.' },
  { id: 'RT-LUOYANG-XUCHANG', src: 'LOC-0002', tgt: 'LOC-0007', li: 300, terrain: 'PLAINS', days: 1.5, grain: 2.0, risk: 'LOW', desc: 'Qua Hổ Lao Quan tiến vào vùng đồn điền Dự Châu phì nhiêu.' },
  { id: 'RT-XUCHANG-XIAPI', src: 'LOC-0007', tgt: 'LOC-0009', li: 420, terrain: 'PLAINS', days: 2.0, grain: 2.5, risk: 'MODERATE', desc: 'Tiến sang Từ Châu, đầu mối hải sản và muối biển.' },
  { id: 'RT-XUCHANG-XIANGYANG', src: 'LOC-0007', tgt: 'LOC-0010', li: 520, terrain: 'RIVER_CROSSING', days: 2.5, grain: 3.5, risk: 'LOW', desc: 'Vượt Hán Thủy tiến vào Châu Phủ Tương Dương.' },
  { id: 'RT-XIANGYANG-JIANGLING', src: 'LOC-0010', tgt: 'LOC-0012', li: 280, terrain: 'RIVER_WATERWAY', days: 1.5, grain: 2.0, risk: 'LOW', desc: 'Đường thủy bộ nối liền Nam Quận và Giang Lăng thủy doanh.' },
  { id: 'RT-JIANGLING-CHIBI', src: 'LOC-0012', tgt: 'LOC-0011', li: 320, terrain: 'RIVER_WATERWAY', days: 1.5, grain: 2.2, risk: 'HIGH', desc: 'Xuôi dòng Trường Giang tiến về chiến trường Xích Bích hiểm yếu.' },
  { id: 'RT-CHIBI-JIANYE', src: 'LOC-0011', tgt: 'LOC-0013', li: 550, terrain: 'RIVER_WATERWAY', days: 3.0, grain: 4.0, risk: 'LOW', desc: 'Thủy lộ chiến lược nối Kinh Châu sang Giang Đông Kiến Nghiệp.' },
  { id: 'RT-CHANGAN-HANZHONG', src: 'LOC-0005', tgt: 'LOC-0014', li: 450, terrain: 'PLANK_ROAD', days: 3.0, grain: 4.5, risk: 'EXTREME', desc: 'Sạn đạo Tần Lĩnh treo leo giữa vách núi hiểm trở bậc nhất thiên hạ.' },
  { id: 'RT-HANZHONG-CHENGDU', src: 'LOC-0014', tgt: 'LOC-0015', li: 500, terrain: 'MOUNTAIN_PASS', days: 3.2, grain: 5.0, risk: 'HIGH', desc: 'Vượt Kiếm Các sừng sững tiến vào Thiên Phủ Chi Quốc Thành Đô.' }
];

let sqlRoutes = 'BEGIN TRANSACTION;\n';
for (const rt of routesList) {
  sqlRoutes += `INSERT OR REPLACE INTO master_routes
    (route_id, source_location_id, target_location_id, distance_li, terrain_type, standard_march_days, grain_provision_cost, ambush_risk_level, description_vi)
    VALUES ('${rt.id}', '${rt.src}', '${rt.tgt}', ${rt.li}, '${rt.terrain}', ${rt.days}, ${rt.grain}, '${rt.risk}', '${escapeSql(rt.desc)}');\n`;
}
sqlRoutes += 'COMMIT;';
runOnBoth(sqlRoutes);
console.log(` ✅ ${routesList.length} Master Strategic Routes cataloged.`);

// Step 11: Ingest Factions
console.log('\n[11/12] Ingesting Master Factions...');
const factionsList = [
  { id: 'FACTION-0001', nameVi: 'Đại Hán Triều Đình', nameEn: 'Eastern Han Imperial Court', leaderVi: 'Hán Linh Đế / Hà Tiến', leaderEn: 'Emperor Ling / He Jin', seat: 'LOC-0002', mil: '85,000 Regulars', treas: 120000000, stanceVi: 'Bảo vệ hoàng quyền chính thống', stanceEn: 'Imperial Mobilization' },
  { id: 'FACTION-0002', nameVi: 'Hoàng Cân Nghĩa Quân', nameEn: 'Yellow Turban Rebels', leaderVi: 'Trương Giác', leaderEn: 'Zhang Jue', seat: 'LOC-0003', mil: '120,000 Insurgents', treas: 15000000, stanceVi: 'Khởi nghĩa lật đổ triều đình', stanceEn: 'Total Insurrection' },
  { id: 'FACTION-0003', nameVi: 'U Châu Mục Thứ Sử', nameEn: 'Youzhou Command', leaderVi: 'Lưu Uẩn / Trâu Tĩnh', leaderEn: 'Liu Yan / Zou Jing', seat: 'LOC-0008', mil: '12,000 Frontier Troops', treas: 8500000, stanceVi: 'Chiêu mộ nghĩa dũng giữ biên cương', stanceEn: 'Border Defense' },
  { id: 'FACTION-0004', nameVi: 'Trác Huyện Quan Phủ', nameEn: 'Zhuo County Office', leaderVi: 'Lưu Huân', leaderEn: 'Magistrate Liu Xuan', seat: 'LOC-0001', mil: '600 Garrison', treas: 450000, stanceVi: 'Bảo an hương dũng', stanceEn: 'Local Militia' }
];

let sqlFactions = 'BEGIN TRANSACTION;\n';
for (const f of factionsList) {
  sqlFactions += `INSERT OR REPLACE INTO master_factions
    (faction_id, name_vi, name_en, leader_name_vi, leader_name_en, capital_location_id, military_strength_desc, estimated_treasury_qian, strategic_stance_vi, strategic_stance_en)
    VALUES ('${f.id}', '${escapeSql(f.nameVi)}', '${escapeSql(f.nameEn)}', '${escapeSql(f.leaderVi)}', '${escapeSql(f.leaderEn)}', '${f.seat}', '${escapeSql(f.mil)}', ${f.treas}, '${escapeSql(f.stanceVi)}', '${escapeSql(f.stanceEn)}');\n`;
}
sqlFactions += 'COMMIT;';
runOnBoth(sqlFactions);
console.log(` ✅ ${factionsList.length} Master Factions cataloged.`);

// Step 12: Ingest Baseline Relationships
console.log('\n[12/12] Ingesting Baseline Relationships...');
const rels = [
  { src: 'NPC-0001', tgt: 'player', type: 'NPC_TO_PLAYER', relVi: 'Tâm Phúc Quân Sư', relEn: 'Sworn Confidant', score: 70 },
  { src: 'NPC-0002', tgt: 'player', type: 'NPC_TO_PLAYER', relVi: 'Tử Sinh Huynh Đệ', relEn: 'Sworn Brother', score: 65 },
  { src: 'NPC-0003', tgt: 'player', type: 'NPC_TO_PLAYER', relVi: 'Kính Trọng Mưu Lược', relEn: 'Martial Respect', score: 60 },
  { src: 'NPC-0012', tgt: 'player', type: 'NPC_TO_PLAYER', relVi: 'Ân Sư Kính Mến', relEn: 'Revered Mentor', score: 50 },
  { src: 'NPC-0007', tgt: 'player', type: 'NPC_TO_PLAYER', relVi: 'Thợ Cả Trung Thành', relEn: 'Loyal Foreman', score: 75 }
];

let sqlRels = 'BEGIN TRANSACTION;\n';
for (const r of rels) {
  sqlRels += `INSERT INTO master_relations_baseline
    (source_entity_id, target_entity_id, entity_type, relationship_type_vi, relationship_type_en, baseline_sentiment)
    VALUES ('${r.src}', '${r.tgt}', '${r.type}', '${escapeSql(r.relVi)}', '${escapeSql(r.relEn)}', ${r.score});\n`;
}
sqlRels += 'COMMIT;';
runOnBoth(sqlRels);
console.log(` ✅ Baseline Relationships cataloged.`);

console.log('\n====================================================');
console.log(' 🟢 MASSIVE MASTER EXPANSION COMPLETE!');
console.log(` Synchronized across session.db and master.db.`);
console.log('====================================================\n');
