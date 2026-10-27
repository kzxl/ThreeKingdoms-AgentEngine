#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Master Markdown Ingestion & Restructuring Engine
 * (tools/ingest-markdown-master.js)
 * 
 * Ingests all static markdown lore, dossiers, catalogs, ROTK historical events,
 * and rule blueprints into the immutable master_* tables in SQLite
 * (saves/session.db AND saves/master.db).
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
console.log(' 🏯 Master Markdown & ROTK Lore Ingestion Engine');
console.log('====================================================');
console.log(` Target Session DB: ${DB_PATH}`);
console.log(` Target Master DB : ${MASTER_DB_PATH}`);

// Step 1: Ensure master schema exists in both DBs
console.log('\n[1/13] Applying Master Database Schema (schema-master.sql)...');
executeSqlFile(DB_PATH, SCHEMA_MASTER_PATH);
executeSqlFile(MASTER_DB_PATH, SCHEMA_MASTER_PATH);
console.log(' ✅ Master schema initialized in session.db and master.db.');

// Helper to run on both DBs
function runOnBoth(sql) {
  runSqlRaw(DB_PATH, sql);
  runSqlRaw(MASTER_DB_PATH, sql);
}

// Step 2: Seed Scenarios Catalog
console.log('\n[2/13] Ingesting Master Scenarios...');
const scenarios = [
  {
    id: 'SCN-184-ZHOU',
    nameVi: 'Khởi Nghĩa Khăn Vàng (184 SCN)',
    nameEn: 'The Yellow Turban Rebellion (184 AD)',
    startDate: '184-02-01',
    epoch: 'Cuối Thời Đông Hán • Khăn Vàng Loạn Lạc',
    descVi: 'Năm Quang Hòa thứ 7. Trương Giác lãnh đạo quân Hoàng Cân quấy động 8 châu thiên hạ. Trác Huyện dán cáo thị chiêu mộ nghĩa dũng quân.',
    descEn: 'The 7th Year of Guanghe. Zhang Jue leads the Yellow Turbans in open revolt across 8 provinces. Zhuo County issues draft recruitment.'
  },
  {
    id: 'SCN-190-DONG',
    nameVi: 'Chư Hầu Phạt Đổng (190 SCN)',
    nameEn: 'Coalition Against Dong Zhuo (190 AD)',
    startDate: '190-01-01',
    epoch: 'Đổng Trác Chuyên Quyền • Thập Bát Lộ Chư Hầu',
    descVi: 'Đổng Trác mang quân Tây Lương nhập kinh đô, phế lập hoàng đế, lộng quyền triều chính. Tào Tháo phát hịch chiêu tập 18 lộ chư hầu hội minh tại Toan Tảo.',
    descEn: 'Dong Zhuo enters Luoyang with Western Liang troops, deposing the young Emperor. Cao Cao issues a coalition summons gathering 18 warlords.'
  },
  {
    id: 'SCN-200-GUAN',
    nameVi: 'Quan Độ Chi Chiến (200 SCN)',
    nameEn: 'The Battle of Guandu (200 AD)',
    startDate: '200-02-01',
    epoch: 'Bắc Phương Hùng Bá • Viên Tào Quyết Đấu',
    descVi: 'Viên Thiệu chiếm cứ 4 châu phương Bắc, dẫn 10 vạn đại quân xuôi nam. Tào Tháo tử thủ bên bờ sông Hoàng Hà, chuẩn bị tập kích kho lương Ô Sào.',
    descEn: 'Yuan Shao mobilizes 100,000 northern troops southwards. Cao Cao holds the Guandu line, launching a daring strike on the Wuchao granary.'
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
console.log('\n[3/13] Ingesting Master Player Archetypes (player_template.md)...');
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

// Step 4: Ingest 80+ Master Characters (Comprehensive ROTK Roster)
console.log('\n[4/13] Ingesting 80+ Master Characters across 4 Factions...');
const charactersList = [
  // --- THỤC HÁN (SHU-HAN) ---
  { id: 'NPC-0001', nameVi: 'Lưu Bị (Huyền Đức)', nameEn: 'Liu Bei (Xuande)', han: '刘备', style: 'Huyền Đức', age: 23, loc: 'LOC-0001', pos: 'Chiêu Liệt Hoàng Đế • Nhân Nghĩa Chi Quân', int: 74, pol: 78, war: 68, ldr: 90, dip: 88, com: 45, log: 62, cra: 52 },
  { id: 'NPC-0002', nameVi: 'Trương Phi (Dực Đức)', nameEn: 'Zhang Fei (Yide)', han: '张飞', style: 'Dực Đức', age: 19, loc: 'LOC-0001', pos: 'Vạn Nhân Địch • Bản Sáp Đoạn Kiều', int: 42, pol: 30, war: 98, ldr: 84, dip: 38, com: 55, log: 48, cra: 45 },
  { id: 'NPC-0003', nameVi: 'Quan Vũ (Vân Trường)', nameEn: 'Guan Yu (Yunchang)', han: '关羽', style: 'Vân Trường', age: 24, loc: 'LOC-0001', pos: 'Võ Thánh • Oai Trấn Hoa Hạ', int: 75, pol: 62, war: 98, ldr: 94, dip: 65, com: 42, log: 68, cra: 48 },
  { id: 'NPC-0024', nameVi: 'Triệu Vân (Tử Long)', nameEn: 'Zhao Yun (Zilong)', han: '赵云', style: 'Tử Long', age: 20, loc: 'LOC-0008', pos: 'Thường Thắng Tướng Quân • Hổ Uy Đại Tướng', int: 76, pol: 65, war: 96, ldr: 91, dip: 72, com: 50, log: 78, cra: 50 },
  { id: 'NPC-0025', nameVi: 'Gia Cát Lượng (Khổng Minh)', nameEn: 'Zhuge Liang (Kongming)', han: '诸葛亮', style: 'Khổng Minh', age: 18, loc: 'LOC-0010', pos: 'Ngọa Long Thừa Tướng • Thần Cơ Diệu Toán', int: 100, pol: 98, war: 38, ldr: 95, dip: 95, com: 82, log: 98, cra: 85 },
  { id: 'NPC-0026', nameVi: 'Bàng Thống (Sĩ Nguyên)', nameEn: 'Pang Tong (Shiyuan)', han: '庞统', style: 'Sĩ Nguyên', age: 22, loc: 'LOC-0010', pos: 'Phượng Sồ Quân Sư • Liên Hoàn Tuyệt Mưu', int: 97, pol: 85, war: 34, ldr: 86, dip: 84, com: 60, log: 75, cra: 40 },
  { id: 'NPC-0027', nameVi: 'Pháp Chính (Hiếu Trực)', nameEn: 'Fa Zheng (Xiaozhi)', han: '法正', style: 'Hiếu Trực', age: 26, loc: 'LOC-0015', pos: 'Ích Châu Kỳ Mưu Sĩ • Thượng Thư Lệnh', int: 94, pol: 78, war: 45, ldr: 82, dip: 74, com: 65, log: 78, cra: 40 },
  { id: 'NPC-0028', nameVi: 'Hoàng Trung (Hán Thăng)', nameEn: 'Huang Zhong (Hansheng)', han: '黄忠', style: 'Hán Thăng', age: 42, loc: 'LOC-0010', pos: 'Thần Xạ Lão Tướng • Định Quân Sơn Trảm Địch', int: 60, pol: 52, war: 93, ldr: 86, dip: 55, com: 45, log: 65, cra: 55 },
  { id: 'NPC-0029', nameVi: 'Mã Siêu (Mạnh Khởi)', nameEn: 'Ma Chao (Mengqi)', han: '马超', style: 'Mạnh Khởi', age: 20, loc: 'LOC-0005', pos: 'Cẩm Mã Siêu • Thần Uy Thiên Tướng Quân', int: 45, pol: 32, war: 97, ldr: 88, dip: 42, com: 45, log: 55, cra: 38 },
  { id: 'NPC-0030', nameVi: 'Ngụy Diên (Văn Trường)', nameEn: 'Wei Yan (Wenchang)', han: '魏延', style: 'Văn Trường', age: 25, loc: 'LOC-0010', pos: 'Tiên Phong Trấn Viễn • Hán Trung Thái Thú', int: 69, pol: 48, war: 92, ldr: 85, dip: 40, com: 50, log: 70, cra: 45 },
  { id: 'NPC-0031', nameVi: 'Khương Duy (Bá Ước)', nameEn: 'Jiang Wei (Boyue)', han: '姜维', style: 'Bá Ước', age: 19, loc: 'LOC-0014', pos: 'Kỳ Lân Nhi • Đại Tướng Quân Cửu Phạt Trung Nguyên', int: 90, pol: 70, war: 89, ldr: 90, dip: 68, com: 55, log: 82, cra: 60 },
  { id: 'NPC-0032', nameVi: 'Mi Trúc (Tử Trọng)', nameEn: 'Mi Zhu (Zizhong)', han: '麋竺', style: 'Tử Trọng', age: 28, loc: 'LOC-0009', pos: 'Từ Châu Cự Phú • An Hán Tướng Quân', int: 72, pol: 76, war: 35, ldr: 50, dip: 82, com: 92, log: 85, cra: 55 },
  { id: 'NPC-0033', nameVi: 'Tôn Càn (Công Hựu)', nameEn: 'Sun Qian (Gongyou)', han: '孙乾', style: 'Công Hựu', age: 26, loc: 'LOC-0004', pos: 'Biện Thuyết Danh Sĩ • Lưu Bị Sứ Giả', int: 75, pol: 74, war: 30, ldr: 45, dip: 85, com: 60, log: 68, cra: 40 },
  { id: 'NPC-0034', nameVi: 'Giản Ung (Hiến Hòa)', nameEn: 'Jian Yong (Xianhe)', han: '简雍', style: 'Hiến Hòa', age: 24, loc: 'LOC-0001', pos: 'Hài Hước Du Thuyết • Chiêu Đức Tướng Quân', int: 74, pol: 72, war: 32, ldr: 42, dip: 86, com: 65, log: 60, cra: 40 },
  { id: 'NPC-0062', nameVi: 'Liêu Hóa (Nguyên Kiệm)', nameEn: 'Liao Hua (Yuanjian)', han: '廖化', style: 'Nguyên Kiệm', age: 25, loc: 'LOC-0010', pos: 'Hữu Xa Kỵ Tướng Quân • Thục Trung Lão Tướng Tiên Phong', int: 66, pol: 64, war: 76, ldr: 78, dip: 60, com: 50, log: 74, cra: 50 },
  { id: 'NPC-0063', nameVi: 'Quan Bình', nameEn: 'Guan Ping', han: '关平', style: 'Quan Bình', age: 19, loc: 'LOC-0010', pos: 'Võ Kiệt Hiếu Dũng • Quan Vũ Trưởng Tử', int: 72, pol: 60, war: 84, ldr: 82, dip: 62, com: 45, log: 70, cra: 45 },
  { id: 'NPC-0064', nameVi: 'Quan Hưng (An Quốc)', nameEn: 'Guan Xing (Anguo)', han: '关兴', style: 'An Quốc', age: 18, loc: 'LOC-0015', pos: 'Long Đao Kế Thừa • Long Tương Tướng Quân', int: 68, pol: 55, war: 86, ldr: 80, dip: 58, com: 45, log: 65, cra: 45 },
  { id: 'NPC-0065', nameVi: 'Trương Bào', nameEn: 'Zhang Bao', han: '张苞', style: 'Trương Bào', age: 18, loc: 'LOC-0015', pos: 'Hổ Tử Dực Đức • Bát Xà Mâu Hào Kiệt', int: 50, pol: 40, war: 88, ldr: 78, dip: 45, com: 45, log: 60, cra: 45 },
  { id: 'NPC-0066', nameVi: 'Mã Tắc (Ấu Thường)', nameEn: 'Ma Su (Youchang)', han: '马幼常', style: 'Ấu Thường', age: 21, loc: 'LOC-0010', pos: 'Thao Thao Binh Luận • Nhai Đình Tham Quân', int: 87, pol: 72, war: 65, ldr: 74, dip: 76, com: 55, log: 70, cra: 40 },
  { id: 'NPC-0067', nameVi: 'Nghiêm Nhan', nameEn: 'Yan Yan', han: '严颜', style: 'Nghiêm Nhan', age: 50, loc: 'LOC-0015', pos: 'Ba Quận Thái Thú • Thà Đoạt Đầu Không Đầu Hàng', int: 68, pol: 62, war: 84, ldr: 83, dip: 60, com: 50, log: 72, cra: 45 },
  { id: 'NPC-0068', nameVi: 'Chu Thương', nameEn: 'Zhou Cang', han: '周仓', style: 'Chu Thương', age: 26, loc: 'LOC-0004', pos: 'Ngọa Ngưu Sơn Hào Kiệt • Thiết Hộ Đao Dũng Tướng', int: 52, pol: 35, war: 84, ldr: 70, dip: 40, com: 40, log: 65, cra: 40 },
  { id: 'NPC-0069', nameVi: 'Từ Thứ (Nguyên Trực / Đơn Phúc)', nameEn: 'Xu Shu (Yuanzhi)', han: '徐庶', style: 'Nguyên Trực', age: 27, loc: 'LOC-0010', pos: 'Hiệp Khách Quân Sư • Bát Trận Phá Tào Nhân', int: 93, pol: 82, war: 64, ldr: 81, dip: 86, com: 60, log: 75, cra: 45 },
  { id: 'NPC-0070', nameVi: 'Mạnh Hoạch', nameEn: 'Meng Huo', han: '孟获', style: 'Nam Man Vương', age: 32, loc: 'LOC-0015', pos: 'Nam Man Hùng Trưởng • Thất Cầm Thất Tung Tâm Phục', int: 42, pol: 45, war: 87, ldr: 84, dip: 55, com: 50, log: 60, cra: 45 },
  { id: 'NPC-0071', nameVi: 'Chúc Dung Phu Nhân', nameEn: 'Lady Zhurong', han: '祝融夫人', style: 'Chúc Dung', age: 28, loc: 'LOC-0015', pos: 'Hỏa Thần Hậu Duệ • Phi Đao Tuyệt Kỹ', int: 48, pol: 40, war: 85, ldr: 78, dip: 52, com: 48, log: 58, cra: 50 },

  // --- TÀO NGỤY (CAO-WEI) ---
  { id: 'NPC-0022', nameVi: 'Tào Tháo (Mạnh Đức)', nameEn: 'Cao Cao (Mengde)', han: '曹操', style: 'Mạnh Đức', age: 30, loc: 'LOC-0007', pos: 'Ngụy Vũ Đế • Gian Hùng Thời Loạn', int: 94, pol: 95, war: 82, ldr: 98, dip: 90, com: 85, log: 92, cra: 60 },
  { id: 'NPC-0035', nameVi: 'Tuân Úc (Văn Nhược)', nameEn: 'Xun Yu (Wenruo)', han: '荀彧', style: 'Văn Nhược', age: 28, loc: 'LOC-0007', pos: 'Vương Tá Chi Tài • Ngụy Triều Thượng Thư Lệnh', int: 96, pol: 98, war: 25, ldr: 70, dip: 92, com: 75, log: 95, cra: 50 },
  { id: 'NPC-0036', nameVi: 'Tuân Du (Công Đạt)', nameEn: 'Xun You (Gongda)', han: '荀攸', style: 'Công Đạt', age: 27, loc: 'LOC-0007', pos: 'Quân Sự Mưu Chủ • Thập Nhị Kỳ Sách', int: 95, pol: 86, war: 28, ldr: 75, dip: 80, com: 65, log: 88, cra: 45 },
  { id: 'NPC-0037', nameVi: 'Quách Gia (Phụng Hiếu)', nameEn: 'Guo Jia (Fengxiao)', han: '郭嘉', style: 'Phụng Hiếu', age: 21, loc: 'LOC-0007', pos: 'Quỷ Tài Quân Sư • Thập Thắng Thập Bại Luận', int: 98, pol: 80, war: 20, ldr: 65, dip: 82, com: 60, log: 70, cra: 35 },
  { id: 'NPC-0038', nameVi: 'Giả Hủ (Văn Hòa)', nameEn: 'Jia Xu (Wenhe)', han: '贾诩', style: 'Văn Hòa', age: 37, loc: 'LOC-0005', pos: 'Độc Sĩ Toàn Thân • Mưu Kế Thâm Độc', int: 97, pol: 88, war: 48, ldr: 80, dip: 85, com: 65, log: 78, cra: 40 },
  { id: 'NPC-0039', nameVi: 'Tư Mã Ý (Trọng Đạt)', nameEn: 'Sima Yi (Zhongda)', han: '司马懿', style: 'Trọng Đạt', age: 20, loc: 'LOC-0002', pos: 'Tấn Cao Tổ • Lang Cố Chi Tướng Trấn Thủ Trung Nguyên', int: 98, pol: 94, war: 65, ldr: 96, dip: 88, com: 78, log: 94, cra: 65 },
  { id: 'NPC-0040', nameVi: 'Trương Liêu (Văn Viễn)', nameEn: 'Zhang Liao (Wenyuan)', han: '张辽', style: 'Văn Viễn', age: 23, loc: 'LOC-0006', pos: 'Hợp Phì Uy Chấn • Ngũ Tử Lương Tướng Chi Thủ', int: 78, pol: 60, war: 93, ldr: 94, dip: 68, com: 55, log: 78, cra: 48 },
  { id: 'NPC-0041', nameVi: 'Hứa Chử (Trọng Khang)', nameEn: 'Xu Chu (Zhongkang)', han: '许褚', style: 'Trọng Khang', age: 24, loc: 'LOC-0007', pos: 'Hổ Si Hộ Vệ • Lực Bạt Sơn Hề', int: 36, pol: 20, war: 97, ldr: 70, dip: 30, com: 40, log: 50, cra: 45 },
  { id: 'NPC-0042', nameVi: 'Điển Vi (Cổ Chi Ác Lai)', nameEn: 'Dian Wei', han: '典韦', style: 'Ác Lai', age: 26, loc: 'LOC-0007', pos: 'Thiết Kích Song Đao • Tào Doanh Đệ Nhất Dũng Tướng', int: 35, pol: 18, war: 98, ldr: 65, dip: 28, com: 35, log: 45, cra: 50 },
  { id: 'NPC-0043', nameVi: 'Hạ Hầu Đôn (Nguyên Nhượng)', nameEn: 'Xiahou Dun (Yuanrang)', han: '夏侯惇', style: 'Nguyên Nhượng', age: 28, loc: 'LOC-0007', pos: 'Bạt Nhãn Thôn Tinh • Đại Tướng Quân Khai Quốc', int: 60, pol: 75, war: 90, ldr: 88, dip: 65, com: 60, log: 85, cra: 52 },
  { id: 'NPC-0044', nameVi: 'Hạ Hầu Uyên (Diệu Tài)', nameEn: 'Xiahou Yuan (Miaocai)', han: '夏侯渊', style: 'Diệu Tài', age: 27, loc: 'LOC-0007', pos: 'Tam Nhật Ngũ Bách • Thần Tốc Đô Đốc', int: 55, pol: 50, war: 91, ldr: 87, dip: 50, com: 50, log: 80, cra: 45 },
  { id: 'NPC-0045', nameVi: 'Tào Nhân (Tử Hiếu)', nameEn: 'Cao Ren (Zixiao)', han: '曹仁', style: 'Tử Hiếu', age: 26, loc: 'LOC-0007', pos: 'Thiết Bích Phòng Ngự • Phàn Thành Trấn Khí', int: 68, pol: 60, war: 87, ldr: 90, dip: 55, com: 50, log: 82, cra: 55 },
  { id: 'NPC-0046', nameVi: 'Trương Cáp (Tuấn Nghệ)', nameEn: 'Zhang He (Junyi)', han: '张郃', style: 'Tuấn Nghệ', age: 25, loc: 'LOC-0006', pos: 'Xảo Biến Danh Tướng • Nhai Đình Phá Địch', int: 74, pol: 58, war: 89, ldr: 89, dip: 60, com: 52, log: 78, cra: 50 },
  { id: 'NPC-0047', nameVi: 'Từ Hoảng (Công Minh)', nameEn: 'Xu Huang (Gongming)', han: '徐晃', style: 'Công Minh', age: 26, loc: 'LOC-0005', pos: 'Chu Á Phu Phong Phạm • Khai Phủ Phá Vây Phàn Thành', int: 70, pol: 50, war: 90, ldr: 88, dip: 55, com: 48, log: 75, cra: 45 },
  { id: 'NPC-0072', nameVi: 'Tào Hồng (Tử Liêm)', nameEn: 'Cao Hong (Zilian)', han: '曹洪', style: 'Tử Liêm', age: 24, loc: 'LOC-0007', pos: 'Huỳnh Dương Đoạt Ngựa Cứu Chủ • Hậu Phúc Đại Tướng', int: 50, pol: 45, war: 82, ldr: 80, dip: 50, com: 75, log: 70, cra: 45 },
  { id: 'NPC-0073', nameVi: 'Tào Phi (Tử Hoàn)', nameEn: 'Cao Pi (Zihuan)', han: '曹丕', style: 'Tử Hoàn', age: 16, loc: 'LOC-0007', pos: 'Ngụy Văn Đế • Điển Luận Văn Học Thiên Tử', int: 83, pol: 86, war: 70, ldr: 78, dip: 82, com: 74, log: 76, cra: 55 },
  { id: 'NPC-0074', nameVi: 'Đặng Ngải (Sĩ Tái)', nameEn: 'Deng Ai (Shizai)', han: '邓艾', style: 'Sĩ Tái', age: 21, loc: 'LOC-0007', pos: 'Âm Bình Độc Kỵ Phá Thục • Đồn Điền Danh Tướng', int: 89, pol: 81, war: 87, ldr: 94, dip: 60, com: 70, log: 92, cra: 55 },
  { id: 'NPC-0075', nameVi: 'Chung Hội (Sĩ Quý)', nameEn: 'Zhong Hui (Shiji)', han: '钟会', style: 'Sĩ Quý', age: 20, loc: 'LOC-0007', pos: 'Kiếm Các Trấn Ép • Phạt Thục Đô Đốc', int: 91, pol: 79, war: 65, ldr: 82, dip: 72, com: 60, log: 78, cra: 45 },
  { id: 'NPC-0076', nameVi: 'Bàng Đức (Lệnh Minh)', nameEn: 'Pang De (Lingming)', han: '庞德', style: 'Lệnh Minh', age: 25, loc: 'LOC-0005', pos: 'Bạch Mã Kiêu Tướng • Mang Quan Tài Quyết Chiến Quan Vũ', int: 65, pol: 45, war: 94, ldr: 85, dip: 45, com: 40, log: 65, cra: 45 },
  { id: 'NPC-0077', nameVi: 'Quách Hoài (Bá Tế)', nameEn: 'Guo Huai (Boji)', han: '郭淮', style: 'Bá Tế', age: 23, loc: 'LOC-0005', pos: 'Ung Châu Thứ Sử • Ngăn Chặn Khương Duy Bắc Phạt', int: 82, pol: 76, war: 78, ldr: 86, dip: 68, com: 60, log: 84, cra: 50 },
  { id: 'NPC-0078', nameVi: 'Mãn Sủng (Bá Ninh)', nameEn: 'Man Chong (Boning)', han: '满宠', style: 'Bá Ninh', age: 28, loc: 'LOC-0007', pos: 'Hợp Phì Tân Thành Tử Thủ • Tư Pháp Nghiêm Cẩn', int: 84, pol: 86, war: 64, ldr: 85, dip: 74, com: 65, log: 82, cra: 55 },
  { id: 'NPC-0079', nameVi: 'Hác Chiêu (Bá Đạo)', nameEn: 'Hao Zhao (Badao)', han: '郝昭', style: 'Bá Đạo', age: 26, loc: 'LOC-0005', pos: 'Trần Thương Thần Thủ • Chặn Đứng Thục Binh Vạn Người', int: 78, pol: 70, war: 82, ldr: 89, dip: 55, com: 50, log: 80, cra: 65 },
  { id: 'NPC-0080', nameVi: 'Lý Điển (Mạn Thành)', nameEn: 'Li Dian (Mancheng)', han: '李典', style: 'Mạn Thành', age: 24, loc: 'LOC-0007', pos: 'Nho Tướng Đại Cục • Hậu Cần Quân Nhu Đắc Lực', int: 76, pol: 74, war: 77, ldr: 82, dip: 70, com: 65, log: 80, cra: 50 },
  { id: 'NPC-0081', nameVi: 'Chân Phu Nhân (Chân Mật)', nameEn: 'Lady Zhen (Zhen Ji)', han: '甄宓', style: 'Chân Cơ', age: 18, loc: 'LOC-0006', pos: 'Lạc Thần Tuyệt Sắc • Văn Chiêu Hoàng Hậu', int: 76, pol: 68, war: 25, ldr: 35, dip: 88, com: 65, log: 50, cra: 60 },

  // --- ĐÔNG NGÔ (EASTERN WU) ---
  { id: 'NPC-0014', nameVi: 'Tôn Kiên (Văn Đài)', nameEn: 'Sun Jian (Wendai)', han: '孙坚', style: 'Văn Đài', age: 29, loc: 'LOC-0012', pos: 'Vũ Liệt Hoàng Đế • Giang Đông Mãnh Hổ', int: 72, pol: 65, war: 94, ldr: 92, dip: 70, com: 55, log: 70, cra: 50 },
  { id: 'NPC-0048', nameVi: 'Tôn Sách (Bá Phù)', nameEn: 'Sun Ce (Bafu)', han: '孙策', style: 'Bá Phù', age: 20, loc: 'LOC-0013', pos: 'Trường Sa Hoàn Vương • Tiểu Bá Vương Khai Cơ', int: 70, pol: 68, war: 95, ldr: 93, dip: 72, com: 55, log: 72, cra: 45 },
  { id: 'NPC-0019', nameVi: 'Tôn Quyền (Trọng Mưu)', nameEn: 'Sun Quan (Zhongmou)', han: '孙权', style: 'Trọng Mưu', age: 18, loc: 'LOC-0013', pos: 'Đại Ngô Hoàng Đế • Sinh Tử Đương Như Tôn Trọng Mưu', int: 84, pol: 88, war: 68, ldr: 86, dip: 88, com: 82, log: 80, cra: 55 },
  { id: 'NPC-0017', nameVi: 'Chu Du (Công Cẩn)', nameEn: 'Zhou Yu (Gongjin)', han: '周瑜', style: 'Công Cẩn', age: 22, loc: 'LOC-0011', pos: 'Giang Đông Đại Đô Đốc • Xích Bích Hỏa Diễm Địch Vạn Quân', int: 96, pol: 86, war: 72, ldr: 97, dip: 88, com: 75, log: 88, cra: 65 },
  { id: 'NPC-0049', nameVi: 'Lỗ Túc (Tử Kính)', nameEn: 'Lu Su (Zijing)', han: '鲁肃', style: 'Tử Kính', age: 24, loc: 'LOC-0013', pos: 'Thao Lược Viễn Kiến • Tôn Lưu Liên Minh Định Cơ', int: 92, pol: 92, war: 56, ldr: 85, dip: 94, com: 86, log: 90, cra: 50 },
  { id: 'NPC-0050', nameVi: 'Lữ Mông (Tử Minh)', nameEn: 'Lu Meng (Ziming)', han: '吕蒙', style: 'Tử Minh', age: 21, loc: 'LOC-0013', pos: 'Bạch Y Độ Giang • Sĩ Biệt Tam Nhật Đương Quát Mục Tương Đãi', int: 89, pol: 78, war: 82, ldr: 92, dip: 75, com: 60, log: 84, cra: 55 },
  { id: 'NPC-0051', nameVi: 'Lục Tốn (Bá Ngôn)', nameEn: 'Lu Xun (Boyan)', han: '陆逊', style: 'Bá Ngôn', age: 19, loc: 'LOC-0013', pos: 'Nho Tướng Đô Đốc • Hỏa Thiêu Thất Bách Dặm Di Lăng', int: 95, pol: 90, war: 69, ldr: 95, dip: 84, com: 70, log: 88, cra: 55 },
  { id: 'NPC-0052', nameVi: 'Hoàng Cái (Công Phúc)', nameEn: 'Huang Gai (Gongfu)', han: '黄盖', style: 'Công Phúc', age: 40, loc: 'LOC-0011', pos: 'Khổ Nhục Kế Hỏa Thuyền • Tam Đại Lão Thành Dũng Tướng', int: 70, pol: 60, war: 84, ldr: 82, dip: 65, com: 50, log: 75, cra: 60 },
  { id: 'NPC-0053', nameVi: 'Cam Ninh (Hưng Bá)', nameEn: 'Gan Ning (Xingba)', han: '甘宁', style: 'Hưng Bá', age: 25, loc: 'LOC-0011', pos: 'Cẩm Phàm Dũng Sĩ • Bách Kỵ Kiếp Tào Doanh', int: 68, pol: 35, war: 94, ldr: 86, dip: 40, com: 55, log: 65, cra: 45 },
  { id: 'NPC-0054', nameVi: 'Thái Sử Từ (Tử Nghĩa)', nameEn: 'Taishi Ci (Ziyi)', han: '太史慈', style: 'Tử Nghĩa', age: 24, loc: 'LOC-0004', pos: 'Thần Xạ Song Kích • Đại Trượng Phu Đới Tam Xích Kiếm', int: 68, pol: 55, war: 93, ldr: 84, dip: 65, com: 45, log: 68, cra: 45 },
  { id: 'NPC-0055', nameVi: 'Trương Chiêu (Tử Bố)', nameEn: 'Zhang Zhao (Zibu)', han: '张昭', style: 'Tử Bố', age: 34, loc: 'LOC-0013', pos: 'Giang Đông Văn Thần Chi Thủ • Trọng Thần Trị Quốc', int: 85, pol: 94, war: 20, ldr: 40, dip: 80, com: 75, log: 88, cra: 40 },
  { id: 'NPC-0084', nameVi: 'Đinh Phụng (Thừa Uyên)', nameEn: 'Ding Feng (Chengyuan)', han: '丁奉', style: 'Thừa Uyên', age: 20, loc: 'LOC-0013', pos: 'Tuyết Dạ Đoạt Binh Đoàn • Đông Ngô Tứ Đại Lão Tướng', int: 70, pol: 62, war: 82, ldr: 83, dip: 58, com: 50, log: 70, cra: 50 },
  { id: 'NPC-0085', nameVi: 'Từ Thịnh (Văn Hướng)', nameEn: 'Xu Sheng (Wenxiang)', han: '徐盛', style: 'Văn Hướng', age: 22, loc: 'LOC-0013', pos: 'Nghi Binh Thiết Lập Trường Giang • Trấn Uy Đại Tướng', int: 78, pol: 68, war: 83, ldr: 86, dip: 62, com: 52, log: 76, cra: 55 },
  { id: 'NPC-0086', nameVi: 'Lăng Thống (Công Tích)', nameEn: 'Ling Tong (Gongji)', han: '凌统', style: 'Công Tích', age: 19, loc: 'LOC-0013', pos: 'Quốc Sĩ Phong Độ • Hợp Phì Cứu Tôn Quyền', int: 60, pol: 50, war: 89, ldr: 82, dip: 55, com: 45, log: 65, cra: 45 },
  { id: 'NPC-0087', nameVi: 'Tôn Thượng Hương (Cung Yêu Cơ)', nameEn: 'Sun Shangxiang', han: '孙尚香', style: 'Tôn Nhân', age: 18, loc: 'LOC-0013', pos: 'Kiêu Cơ Liệt Nữ • Cung Kiếm Nữ Binh Thống Lĩnh', int: 68, pol: 58, war: 86, ldr: 76, dip: 75, com: 55, log: 60, cra: 50 },
  { id: 'NPC-0088', nameVi: 'Đại Kiều', nameEn: 'Da Qiao', han: '大乔', style: 'Đại Kiều', age: 19, loc: 'LOC-0013', pos: 'Giang Đông Tuyệt Sắc • Tôn Sách Phu Nhân', int: 74, pol: 65, war: 20, ldr: 30, dip: 86, com: 60, log: 50, cra: 65 },
  { id: 'NPC-0089', nameVi: 'Tiểu Kiều', nameEn: 'Xiao Qiao', han: '小乔', style: 'Tiểu Kiều', age: 18, loc: 'LOC-0011', pos: 'Trường Giang Đệ Nhất Mỹ Giai Nhân • Chu Du Phu Nhân', int: 75, pol: 64, war: 22, ldr: 32, dip: 88, com: 62, log: 50, cra: 65 },
  { id: 'NPC-0090', nameVi: 'Chu Thái (Ấu Bình)', nameEn: 'Zhou Tai (Youping)', han: '周泰', style: 'Ấu Bình', age: 24, loc: 'LOC-0013', pos: 'Bách Vết Đao Thương • Huyết Chiến Hộ Chủ', int: 45, pol: 35, war: 91, ldr: 78, dip: 40, com: 40, log: 55, cra: 45 },
  { id: 'NPC-0091', nameVi: 'Trình Phổ (Đức Mưu)', nameEn: 'Cheng Pu (Demou)', han: '程普', style: 'Đức Mưu', age: 44, loc: 'LOC-0013', pos: 'Tam Triều Lão Tướng • Giang Đông Phó Đô Đốc', int: 76, pol: 70, war: 79, ldr: 84, dip: 72, com: 60, log: 78, cra: 50 },

  // --- QUẦN HÙNG, ĐÔNG HÁN, DANH SĨ & TIÊN NHÂN ---
  { id: 'NPC-0004', nameVi: 'Trương Giác (Thiên Công Tướng Quân)', nameEn: 'Zhang Jue', han: '张角', style: 'Đại Hiền Lương Sư', age: 44, loc: 'LOC-0003', pos: 'Thái Bình Đạo Giáo Tổ • Hoàng Cân Đại Khởi Nghĩa', int: 84, pol: 70, war: 38, ldr: 86, dip: 80, com: 60, log: 62, cra: 55 },
  { id: 'NPC-0012', nameVi: 'Lư Thực (Tử Cán)', nameEn: 'Lu Zhi (Zigan)', han: '卢植', style: 'Tử Cán', age: 45, loc: 'LOC-0003', pos: 'Bắc Quân Trung Lang Tướng • Lưu Bị Ân Sư', int: 88, pol: 82, war: 70, ldr: 89, dip: 78, com: 50, log: 85, cra: 55 },
  { id: 'NPC-0056', nameVi: 'Hoàng Phủ Tung (Nghĩa Chân)', nameEn: 'Huangfu Song', han: '皇甫嵩', style: 'Nghĩa Chân', age: 46, loc: 'LOC-0007', pos: 'Tả Trung Lang Tướng • Bình Định Khăn Vàng', int: 86, pol: 75, war: 78, ldr: 90, dip: 72, com: 50, log: 84, cra: 50 },
  { id: 'NPC-0057', nameVi: 'Lữ Bố (Phụng Tiên)', nameEn: 'Lu Bu (Fengxian)', han: '吕布', style: 'Phụng Tiên', age: 24, loc: 'LOC-0005', pos: 'Chiến Thần Vô Song • Nhân Trung Lữ Bố Mã Trung Xích Thố', int: 26, pol: 15, war: 100, ldr: 86, dip: 30, com: 35, log: 40, cra: 45 },
  { id: 'NPC-0023', nameVi: 'Đổng Trác (Trọng Dĩnh)', nameEn: 'Dong Zhuo', han: '董卓', style: 'Trọng Dĩnh', age: 45, loc: 'LOC-0005', pos: 'Thái Sư • Tây Lương Kiêu Hùng', int: 72, pol: 65, war: 86, ldr: 85, dip: 50, com: 65, log: 72, cra: 40 },
  { id: 'NPC-0015', nameVi: 'Vương Doãn (Tử Sư)', nameEn: 'Wang Yun (Zishi)', han: '王允', style: 'Tử Sư', age: 47, loc: 'LOC-0005', pos: 'Tư Đồ • Liên Hoàn Kế Diệt Gian Thần', int: 82, pol: 84, war: 40, ldr: 60, dip: 86, com: 60, log: 65, cra: 45 },
  { id: 'NPC-0058', nameVi: 'Trần Cung (Công Đài)', nameEn: 'Chen Gong (Gongtai)', han: '陈宫', style: 'Công Đài', age: 30, loc: 'LOC-0009', pos: 'Cương Trực Mưu Thần • Lữ Bố Quân Sư', int: 89, pol: 78, war: 52, ldr: 76, dip: 70, com: 55, log: 70, cra: 40 },
  { id: 'NPC-0018', nameVi: 'Viên Thiệu (Bản Sơ)', nameEn: 'Yuan Shao (Benchu)', han: '袁绍', style: 'Bản Sơ', age: 31, loc: 'LOC-0006', pos: 'Minh Chủ 18 Lộ Chư Hầu • Tứ Thế Tam Công', int: 70, pol: 76, war: 70, ldr: 82, dip: 80, com: 65, log: 75, cra: 45 },
  { id: 'NPC-0059', nameVi: 'Viên Thuật (Công Lộ)', nameEn: 'Yuan Shu (Gonglu)', han: '袁术', style: 'Công Lộ', age: 30, loc: 'LOC-0007', pos: 'Hoài Nam Quân Phiệt • Trọng Gia Hoàng Đế', int: 60, pol: 55, war: 62, ldr: 68, dip: 60, com: 75, log: 65, cra: 40 },
  { id: 'NPC-0060', nameVi: 'Công Tôn Toản (Bá Khuê)', nameEn: 'Gongsun Zan', han: '公孙瓒', style: 'Bá Khuê', age: 32, loc: 'LOC-0008', pos: 'Bạch Mã Nghĩa Tòng Thống Soái • U Châu Hùng Bá', int: 64, pol: 52, war: 86, ldr: 84, dip: 55, com: 50, log: 70, cra: 42 },
  { id: 'NPC-0016', nameVi: 'Lưu Biểu (Cảnh Thăng)', nameEn: 'Liu Biao', han: '刘表', style: 'Cảnh Thăng', age: 42, loc: 'LOC-0010', pos: 'Kinh Châu Thứ Sử • Bát Tuấn Danh Sĩ', int: 78, pol: 82, war: 52, ldr: 70, dip: 80, com: 68, log: 75, cra: 50 },
  { id: 'NPC-0020', nameVi: 'Trương Lỗ (Công Kỳ)', nameEn: 'Zhang Lu', han: '张鲁', style: 'Công Kỳ', age: 35, loc: 'LOC-0014', pos: 'Hán Trung Thái Thú • Ngũ Đấu Mễ Đạo Sư', int: 74, pol: 78, war: 62, ldr: 72, dip: 75, com: 70, log: 80, cra: 50 },
  { id: 'NPC-0021', nameVi: 'Lưu Chương (Quý Ngọc)', nameEn: 'Liu Zhang', han: '刘璋', style: 'Quý Ngọc', age: 26, loc: 'LOC-0015', pos: 'Ích Châu Mục • Thiên Phủ Chi Chủ', int: 60, pol: 66, war: 45, ldr: 55, dip: 68, com: 70, log: 70, cra: 40 },
  { id: 'NPC-0061', nameVi: 'Hoa Đà (Nguyên Hóa)', nameEn: 'Hua Tuo', han: '华佗', style: 'Nguyên Hóa', age: 40, loc: 'LOC-0007', pos: 'Thần Y Tam Quốc • Cạo Xương Chữa Thương', int: 92, pol: 40, war: 30, ldr: 30, dip: 65, com: 50, log: 75, cra: 96 },
  { id: 'NPC-0092', nameVi: 'Điền Phong (Nguyên Hạo)', nameEn: 'Tian Feng (Yuanhao)', han: '田丰', style: 'Nguyên Hạo', age: 36, loc: 'LOC-0006', pos: 'Ký Châu Đệ Nhất Mưu Sĩ • Cương Gián Trực Ngôn', int: 93, pol: 86, war: 30, ldr: 70, dip: 68, com: 55, log: 75, cra: 40 },
  { id: 'NPC-0093', nameVi: 'Thẩm Phối (Chính Nam)', nameEn: 'Shen Pei (Zhengnan)', han: '审配', style: 'Chính Nam', age: 35, loc: 'LOC-0006', pos: 'Nghiệp Thành Tử Thủ • Trung Liệt Ký Châu Thần', int: 82, pol: 78, war: 65, ldr: 80, dip: 55, com: 50, log: 76, cra: 45 },
  { id: 'NPC-0094', nameVi: 'Lý Nho (Văn Ưu)', nameEn: 'Li Ru (Wenyou)', han: '李儒', style: 'Văn Ưu', age: 32, loc: 'LOC-0005', pos: 'Tây Lương Độc Mưu • Đổng Trác Tâm Phúc Quân Sư', int: 93, pol: 74, war: 32, ldr: 65, dip: 78, com: 65, log: 70, cra: 40 },
  { id: 'NPC-0095', nameVi: 'Hoa Hùng', nameEn: 'Hua Xiong', han: '华雄', style: 'Hoa Hùng', age: 28, loc: 'LOC-0002', pos: 'Tây Lương Kiêu Tướng • Trảm Tướng Tị Thủy Quan', int: 50, pol: 35, war: 92, ldr: 82, dip: 40, com: 40, log: 60, cra: 40 },
  { id: 'NPC-0096', nameVi: 'Trương Nhiệm', nameEn: 'Zhang Ren', han: '张任', style: 'Trương Nhiệm', age: 32, loc: 'LOC-0015', pos: 'Xuyên Trung Danh Tướng • Lạc Phượng Pha Mai Phục Trảm Bàng Thống', int: 76, pol: 60, war: 84, ldr: 86, dip: 50, com: 45, log: 70, cra: 45 },
  { id: 'NPC-0097', nameVi: 'Thái Diễm (Thái Văn Cơ)', nameEn: 'Cai Wenji', han: '蔡文姬', style: 'Văn Cơ', age: 20, loc: 'LOC-0002', pos: 'Hồ Gia Thập Bát Phách • Tuyệt Đại Tài Nữ', int: 86, pol: 70, war: 20, ldr: 35, dip: 88, com: 50, log: 50, cra: 75 },
  { id: 'NPC-0098', nameVi: 'Tả Từ (Nguyên Phóng)', nameEn: 'Zuo Ci (Yuanfang)', han: '左慈', style: 'Ô Giác Tiên Sinh', age: 60, loc: 'LOC-0015', pos: 'Nga Mi Ảo Thuật Chân Tiên • Độn Giáp Thiên Thư', int: 96, pol: 50, war: 55, ldr: 60, dip: 85, com: 50, log: 65, cra: 92 },

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

// Step 5: Ingest 32 Master Skills across 8 Domains (Standard ROTK System)
console.log('\n[5/13] Ingesting 32 Master Skills across 8 Professional Domains...');
const skillsList = [
  // 1. COMMERCE & ENTERPRISE
  { code: 'SKL-COM-BOOK', nameVi: 'Kê Toán & Kiểm Toán Sổ Kép', nameEn: 'Bookkeeping & Double-Entry Audit', domain: 'COMMERCE', primary: 'INT', sec: 'COM', t1: 'Ngăn ngừa sai sót cơ bản trong sổ sách', t2: 'Mở khóa báo cáo tài chính P&L hàng tháng', t3: 'Giảm thất thoát kho xưởng 15%', t4: 'Kiểm toán chi nhánh từ xa qua thư tín', t5: 'Dự báo khủng hoảng thanh khoản trước 2 lượt' },
  { code: 'SKL-COM-APPRAISE', nameVi: 'Giám Định Hàng Hóa & Hóa Thực', nameEn: 'Appraisal & Market Arbitrage', domain: 'COMMERCE', primary: 'COM', sec: 'INT', t1: 'Nhận biết phẩm chất hàng loại B/C/A', t2: 'Phát hiện hàng giả, kim loại pha tạp', t3: 'Tăng 10% biên lợi nhuận buôn xa', t4: 'Chiết khấu 10% khi ký hợp đồng mua sỉ', t5: 'Độc quyền thao túng giá cả vùng' },
  { code: 'SKL-COM-CARAVAN', nameVi: 'Vận Tiêu & Hộ Thương Đường Dài', nameEn: 'Interstate Caravan Navigating', domain: 'COMMERCE', primary: 'COM', sec: 'LOG', t1: 'Giảm 10% phí bảo hiểm thương đoàn', t2: 'Mở rộng đoàn buôn lên 5 xe hàng', t3: 'Tránh né 30% thảo khấu dọc quan đạo', t4: 'Thiết lập trạm buôn tơ lụa liên châu', t5: 'Thương lộ ngàn dặm thông suốt Tây Vực' },
  { code: 'SKL-MGT-ENTERPRISE', nameVi: 'Quản Lý Doanh Nghiệp & Phân Quyền', nameEn: 'Enterprise Management & Delegation', domain: 'COMMERCE', primary: 'COM', sec: 'LDR', t1: 'Giảm 10% thời gian nhàn rỗi công nhân', t2: 'Phân quyền thợ cả vận hành 85% công suất', t3: 'Tăng 15% năng suất lao động', t4: 'Mở phân xưởng tại các châu phủ khác', t5: 'Đế chế sản xuất tự động quy mô vạn người' },
  { code: 'SKL-COM-SPECULATE', nameVi: 'Đầu Cơ Lương Thảo & Muối Sắt', nameEn: 'Commodity Speculation & Storage', domain: 'COMMERCE', primary: 'COM', sec: 'POL', t1: 'Dự đoán biến động giá lương trước mùa giáp hạt', t2: 'Tích trữ muối sắt không bị quan lại tịch thu', t3: 'Thu lợi nhuận 25% từ chênh lệch địa bàn', t4: 'Mua non mùa lúa vụ mùa giá rẻ 30%', t5: 'Lũng đoạn mạch cung ứng lương thực toàn quân khu' },

  // 2. CRAFT & ENGINEERING
  { code: 'SKL-CRA-WEAVE', nameVi: 'Biên Dệt Tre Trúc & Khiên Giáp', nameEn: 'Bamboo, Reed & Shield Weaving', domain: 'CRAFT', primary: 'CRA', sec: 'LOG', t1: 'Dệt chiếu và giỏ đan tỷ lệ phế phẩm 8%', t2: 'Giảm phế phẩm còn 4%, mở khóa giáp trúc', t3: 'Chế tác khiên trúc bọc da quân dụng', t4: 'Tăng 20% tốc độ đan dệt hàng loạt', t5: 'Tuyệt kỹ khiên trúc ngự tiễn trứ danh' },
  { code: 'SKL-CRA-SMITH', nameVi: 'Rèn Đúc Binh Khí & Nỏ Liên Châu', nameEn: 'Weapon Smithing & Metallurgy', domain: 'CRAFT', primary: 'CRA', sec: 'WAR', t1: 'Sửa chữa và mài bén đao thương', t2: 'Đúc mũi thương sắt tiêu chuẩn quân đội', t3: 'Rèn Hán Trực Đao bách luyện chống mẻ', t4: 'Chế tạo nỏ cứng bắn xa 120 bước', t5: 'Tuyệt tác thần binh bảo đao truyền thế' },
  { code: 'SKL-CRA-SHIP', nameVi: 'Đóng Thuyền Thủy Chiến & Mông Xung', nameEn: 'Naval Shipwright & Marine Craft', domain: 'CRAFT', primary: 'CRA', sec: 'LOG', t1: 'Đóng bè tre và thuyền nhỏ vận tải', t2: 'Đóng thuyền tuần tra Trường Giang', t3: 'Đóng thuyền chiến Mông Xung bọc da', t4: 'Đóng Lâu Thuyền 3 tầng chở 200 quân', t5: 'Hạm đội thủy chiến kiên cố kháng phong ba' },
  { code: 'SKL-MED-HEAL', nameVi: 'Diệu Thủ Hồi Xuân & Ma Phế Tán', nameEn: 'Battlefield Medicine & Surgery', domain: 'CRAFT', primary: 'CRA', sec: 'INT', t1: 'Băng bó cầm máu và sát trùng vết thương', t2: 'Bào chế thuốc thương hàn và nước khử độc', t3: 'Phẫu thuật rút mũi tên độc trên chiến trường', t4: 'Chế Ma Phế Tán gây mê mổ xương không đau', t5: 'Thần y cứu sống thương binh nặng tỷ lệ 90%' },

  // 3. MARTIAL & COMBAT
  { code: 'SKL-WAR-SPEAR', nameVi: 'Thương Thuật Thực Chiến', nameEn: 'Spear & Polearm Mastery', domain: 'MARTIAL', primary: 'WAR', sec: 'LDR', t1: 'Đỡ đòn kỵ binh xung kích (+5% phòng ngự)', t2: 'Mở khóa thế thủ cắm thương cản chiến mã', t3: 'Đấu thương đoạt mạng (Xà Mâu Thần Kỹ)', t4: 'Tuyệt kỹ đâm xuyên hộ tâm phiến', t5: 'Thương thần vô địch quét sạch vạn quân' },
  { code: 'SKL-WAR-BLADE', nameVi: 'Đao Pháp Mãnh Hổ & Đoản Binh', nameEn: 'Dao Blade & Close-Quarters Combat', domain: 'MARTIAL', primary: 'WAR', sec: 'WAR', t1: 'Chém đoản binh giáp lá cà cơ bản', t2: 'Trảm mã đao pháp chém đứt chân ngựa', t3: 'Bát Quái Đao Trận phá vòng vây', t4: 'Trảm tướng đoạt kỳ trong hỗn chiến', t5: 'Thanh Long Yển Nguyệt tuyệt sát vô song' },
  { code: 'SKL-WAR-ARCH', nameVi: 'Cung Thuật & Xạ Kích Bách Bộ', nameEn: 'Archery & Marksmanship', domain: 'MARTIAL', primary: 'WAR', sec: 'CRA', t1: 'Bắn trúng mục tiêu cự ly 50 bước', t2: 'Phối hợp mưa tên xạ kích đồng loạt', t3: 'Bắn tên lửa hỏa công trại địch', t4: 'Bách bộ xuyên dương bắn rơi tướng địch', t5: 'Cung thần xạ tiễn định đoạt chiến trường' },
  { code: 'SKL-WAR-RIDE', nameVi: 'Kỵ Xạ & Đột Kích Mã Tấu', nameEn: 'Horsemanship & Mounted Shock', domain: 'MARTIAL', primary: 'WAR', sec: 'LOG', t1: 'Cưỡi ngựa vượt địa hình đồi dốc', t2: 'Bắn cung trên lưng ngựa chính xác', t3: 'Đột kích kỵ binh phá tan đội hình bộ binh', t4: 'Thao diễn Hổ Báo Kỵ / Bạch Mã Nghĩa Tòng', t5: 'Thiết kỵ tung hoành thiên hạ vô địch' },
  { code: 'SKL-WAR-DUEL', nameVi: 'Đơn Đả Độc Đấu & Trảm Tướng', nameEn: 'Martial Duels & Officer Slaying', domain: 'MARTIAL', primary: 'WAR', sec: 'LDR', t1: 'Khiêu chiến võ tướng đơn đả độc đấu', t2: 'Tăng 15% cơ hội hạ gục đối thủ trên ngựa', t3: 'Trảm tướng địch khiến toàn quân địch giảm 20 sĩ khí', t4: 'Bắt sống võ tướng đối phương', t5: 'Một kích tất sát chém tướng định cục diện trận đánh' },
  { code: 'SKL-WAR-NAVAL', nameVi: 'Thủy Chiến Phong Ba Trường Giang', nameEn: 'Naval Combat & Boarding', domain: 'MARTIAL', primary: 'WAR', sec: 'LOG', t1: 'Giữ thăng bằng trên boong thuyền chòng chành', t2: 'Bắn cung từ chiến thuyền sang thuyền địch', t3: 'Đổ bộ móc xích áp sát giáp lá cà thủy quân', t4: 'Lợi dụng dòng nước xoáy và bãi cạn phục kích', t5: 'Thủy quân thần tốc chẻ sóng như đi trên đất liền' },
  { code: 'SKL-WAR-SIEGE', nameVi: 'Công Thành Đoạt Trại & Phách Sơn Xa', nameEn: 'Siegecraft & Sapping', domain: 'MARTIAL', primary: 'WAR', sec: 'CRA', t1: 'Bắc thang mây Vân Thê trèo tường thành', t2: 'Điều khiển xe đâm húc phá vỡ cổng thành', t3: 'Chế tạo máy bắn đá Phách Sơn Xa phá lũy', t4: 'Đào hầm địa đạo chui qua chân tường thành', t5: 'Công phá mọi thành trì kiên cố nhất trong 3 ngày' },

  // 4. LEADERSHIP & DRILL
  { code: 'SKL-LDR-DRILL', nameVi: 'Huấn Luyện & Thao Diễn Quân Đội', nameEn: 'Troop Drill & Formations', domain: 'LEADERSHIP', primary: 'LDR', sec: 'WAR', t1: 'Rút ngắn 10% thời gian tân binh luyện tập', t2: 'Hành quân không hao tổn sĩ khí', t3: 'Mở khóa trận pháp Hạc Dực và Nhạn Hành', t4: 'Binh sĩ kiên định khi bị tập kích đêm', t5: 'Quân đội thép trăm trận trăm thắng' },
  { code: 'SKL-LDR-INSP', nameVi: 'Cổ Vũ Tướng Sĩ & Dục Huyết Khích Lệ', nameEn: 'Battlefield Morale Inspiration', domain: 'LEADERSHIP', primary: 'LDR', sec: 'DIP', t1: 'Khôi phục 5% sĩ khí sau thất bại nhỏ', t2: 'Hò reo trợ chiến tăng 10% công kích', t3: 'Ngăn chặn đào ngũ khi thiếu lương 1 tháng', t4: 'Kích hoạt trạng thái tử chiến quên mình', t5: 'Một lời hiệu triệu vạn người xông pha' },
  { code: 'SKL-LDR-DISC', nameVi: 'Quân Kỷ Thiết Lập & Nghiêm Trị Binh Sĩ', nameEn: 'Iron Discipline & Anti-Plunder', domain: 'LEADERSHIP', primary: 'LDR', sec: 'POL', t1: 'Cấm binh lính cướp bóc dân cư', t2: 'Tăng 10 điểm trị an tại nơi đồn trú', t3: 'Quân lệnh như sơn, không dao động trước tiếng chiêng', t4: 'Chấp pháp nghiêm minh thu phục lòng quân', t5: 'Quân đội nhân nghĩa đi tới đâu dân hoan nghênh tới đó' },
  { code: 'SKL-LDR-CRACK', nameVi: 'Hãm Trận Tiên Phong Tử Sĩ', nameEn: 'Elite Vanguard Shock Troops', domain: 'LEADERSHIP', primary: 'LDR', sec: 'WAR', t1: 'Tuyển chọn quân cảm tử dẫn đầu công đồn', t2: 'Tăng 25% sát thương khi công phá cửa ải', t3: 'Kháng hoàn toàn trạng thái hỗn loạn trong 3 hiệp', t4: 'Đội quân Thiết Giáp phá tan mọi hàng rào phòng thủ', t5: 'Hãm Trận Doanh bách chiến bách thắng' },

  // 5. TACTICS & STRATAGEMS
  { code: 'SKL-TAC-STRAT', nameVi: 'Binh Pháp & Mưu Lược Quân Sự', nameEn: 'Tactical Stratagems & Deception', domain: 'TACTICS', primary: 'INT', sec: 'LDR', t1: 'Phát hiện bẫy địa hình và mai phục nhỏ', t2: 'Bày trận nghi binh, đèn đuốc giả doanh', t3: 'Dụ địch vào tử địa khe núi tiêu diệt', t4: 'Mưu lược liên hoàn kế lừa soái tướng địch', t5: 'Thần cơ xuất quỷ nhập thần quyết thắng' },
  { code: 'SKL-TAC-FIRE', nameVi: 'Hỏa Công & Thiên Thời Gió Lửa', nameEn: 'Naval & Field Fire Tactics', domain: 'TACTICS', primary: 'INT', sec: 'CRA', t1: 'Đốt trại cỏ khô mùa hanh hao', t2: 'Đoán hướng gió đông nam chuẩn xác', t3: 'Chế tạo thuyền mồi lửa gắn nhựa thông', t4: 'Hỏa thiêu liên hoàn chiến thuyền trăm dặm', t5: 'Hỏa thần thiêu rụi cự pháo và đại quân' },
  { code: 'SKL-TAC-WATER', nameVi: 'Thủy Ngập Thất Quân & Đắp Đập Xả Lũ', nameEn: 'Inundation & River Flooding', domain: 'TACTICS', primary: 'INT', sec: 'POL', t1: 'Nhận biết địa hình trũng thấp dễ ngập úng', t2: 'Đắp đập chặn thượng nguồn sông ngòi', t3: 'Xả lũ dìm ngập doanh trại thung lũng của địch', t4: 'Thủy ngập chân thành khiến tường thành sụp đổ', t5: 'Thủy Thần oai phong tiêu diệt 7 đạo quân trong biển nước' },
  { code: 'SKL-TAC-AMBUSH', nameVi: 'Mai Phục Sơn Lâm & Kỳ Binh Đột Kích', nameEn: 'Forest Ambush & Guerrilla Strike', domain: 'TACTICS', primary: 'INT', sec: 'LOG', t1: 'Ẩn náu quân ngũ trong khe núi rừng rậm', t2: 'Chặn đánh đuôi đoàn hậu cần của địch', t3: 'Phát động kỳ binh cắt đôi quân địch đang hành quân', t4: 'Bẫy lửa kết hợp đá lăn hẻm núi (Lạc Phượng Pha)', t5: 'Thiên la địa võng phục binh không lối thoát' },
  { code: 'SKL-TAC-CONFUSE', nameVi: 'Khẩu Tài Khiêu Khích & Hỗn Loạn', nameEn: 'Taunt, Confusion & Disruption', domain: 'TACTICS', primary: 'INT', sec: 'DIP', t1: 'Mắng chửi khiêu khích tướng phòng thủ ra ngoài', t2: 'Gieo rắc tin đồn quân lương bị cháy', t3: 'Làm rối loạn chỉ huy khiến các đạo quân tự giẫm đạp', t4: 'Kế Không Thành mê hoặc quân sư lão luyện', t5: 'Hỗn loạn hoàn toàn làm tan rã 10 vạn quân' },
  { code: 'SKL-TAC-SCOUT', nameVi: 'Thám Báo Địa Lý & Tình Báo Chiến Dịch', nameEn: 'Reconnaissance & Military Intel', domain: 'TACTICS', primary: 'INT', sec: 'LOG', t1: 'Nắm bắt lộ trình dịch trạm trong 100 dặm', t2: 'Phát hiện quân nhu và kho lương của địch', t3: 'Do thám chính xác binh lực thành trì địch', t4: 'Mua chuộc lính gác mở cổng thành', t5: 'Mạng lưới thiên nhãn thấu suốt Trung Nguyên' },

  // 6. POLITICS & GOVERNANCE
  { code: 'SKL-POL-ADMIN', nameVi: 'Hành Chính & Trị Lý Bang Quốc', nameEn: 'Civil Administration & Bureaucracy', domain: 'POLITICS', primary: 'POL', sec: 'INT', t1: 'Nắm vững luật lệ thuế má nha môn', t2: 'Giảm 15% tham nhũng thất thoát tô thuế', t3: 'Phục hồi trị an quận huyện (+5 điểm/tháng)', t4: 'Trị lý toàn diện quận thành phong túc', t5: 'Quốc sách an dân định thiên hạ thái bình' },
  { code: 'SKL-POL-TUNTIAN', nameVi: 'Đồn Điền Tích Cốc & Khuyến Nông', nameEn: 'Agricultural Military Tuntian', domain: 'POLITICS', primary: 'POL', sec: 'LOG', t1: 'Khai hoang đất trống tăng 10% vụ mùa', t2: 'Cho binh lính làm ruộng thời bình', t3: 'Xây kênh mương thủy lợi trữ nước', t4: 'Kho thóc đầy ắp 10 vạn thạch quân lương', t5: 'Đồn điền hưng thịnh cấp lương cho 30 vạn quân' },
  { code: 'SKL-POL-IRRIG', nameVi: 'Khơi Kênh Dẫn Nước & Trị Thủy', nameEn: 'Irrigation & River Engineering', domain: 'POLITICS', primary: 'POL', sec: 'CRA', t1: 'Nạo vét bùn đất lòng kênh mương nội đồng', t2: 'Xây đập đá ngăn mặn giữ ngọt', t3: 'Đưa nước vào ruộng cao nguyên hạn hán', t4: 'Chống lũ sông Hoàng Hà bảo vệ mùa màng', t5: 'Đô Giang Yển ngàn năm biến đất thục thành kho lúa' },
  { code: 'SKL-POL-BENEV', nameVi: 'Phủ Dụ Khoan Hòa & Chiêu Dân', nameEn: 'Benevolent Rule & Populace Relief', domain: 'POLITICS', primary: 'POL', sec: 'DIP', t1: 'Mở kho chẩn tế cứu đói mùa mất mùa', t2: 'Miễn giảm thuế thân thu hút lưu dân tị nạn', t3: 'Tăng dân số quận huyện 20% mỗi năm', t4: 'Dân chúng đồng lòng tự nguyện tòng quân', t5: 'Đắc nhân tâm thiên hạ, muôn dân hướng về' },
  { code: 'SKL-POL-FORT', nameVi: 'Tu Bổ Thành Trì & Gia Cố Hào Lũy', nameEn: 'City Fortification & Ramparts', domain: 'POLITICS', primary: 'POL', sec: 'CRA', t1: 'Đắp thêm đất đá vào mặt ngoài tường thành', t2: 'Đào sâu hào nước quanh thành', t3: 'Lắp nỏ máy liên châu trên mặt lũy', t4: 'Tăng 50% độ bền phòng thủ trước máy bắn đá', t5: 'Kim thành thang trì tuyệt đối bất khả xâm phạm' },

  // 7. DIPLOMACY & RHETORIC
  { code: 'SKL-DIP-RHET', nameVi: 'Biện Thuyết Du Thuyết & Bang Giao', nameEn: 'Diplomatic Rhetoric & Persuasion', domain: 'DIPLOMACY', primary: 'DIP', sec: 'INT', t1: 'Lễ nghi bang giao không phạm sai lầm', t2: 'Thương thảo mượn đường hành quân', t3: 'Thuyết phục chư hầu liên minh chống địch', t4: 'Đơn đao phó hội điều đình hòa ước', t5: 'Một tấc lưỡi mạnh hơn trăm vạn hùng binh' },
  { code: 'SKL-DIP-SCHEME', nameVi: 'Ly Gián Kế & Mật Đạo Phản Gián', nameEn: 'Subversion & Espionage Schemes', domain: 'DIPLOMACY', primary: 'DIP', sec: 'INT', t1: 'Gieo tin đồn làm lung lạc dân tâm', t2: 'Viết mật thư bôi xóa gây ngờ vực', t3: 'Ly gián quân thần khiến tướng bị triệu hồi', t4: 'Kích động nội loạn trong đại doanh địch', t5: 'Mỹ nhân kế / Diệt sát quyền thần phản loạn' },
  { code: 'SKL-DIP-TALENT', nameVi: 'Cầu Hiền Chiêu Mộ & Đãi Sĩ', nameEn: 'Talent Headhunting & Recruitment', domain: 'DIPLOMACY', primary: 'DIP', sec: 'POL', t1: 'Dò la tin tức danh sĩ ẩn dật trong vùng', t2: 'Thuyết phục kẻ sĩ hạ cấp quy phục', t3: 'Chiêu dụ tướng bại trận đầu quân', t4: 'Ban Cầu Hiền Lệnh thu hút nhân tài thiên hạ', t5: 'Tam cố thảo lư thỉnh được kỳ tài cái thế' },
  { code: 'SKL-DIP-ALLIANCE', nameVi: 'Hợp Tung Liên Minh Chư Hầu', nameEn: 'Coalition Building & Geopolitics', domain: 'DIPLOMACY', primary: 'DIP', sec: 'LDR', t1: 'Ký hiệp ước bất tương xâm phạm 6 tháng', t2: 'Liên kết 2 chư hầu cùng đánh kẻ thù chung', t3: 'Chia sẻ thông tin tình báo và quân nhu liên quân', t4: 'Duy trì liên minh Tôn-Lưu bền vững trước sóng gió', t5: 'Lãnh tụ liên minh hiệu triệu thiên hạ thảo phạt nghịch tặc' }
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

// Step 6: Ingest 12 Master Innate Talents
console.log('\n[6/13] Ingesting Master Innate Talents & Hero Traits (master_talents)...');
const talentsList = [
  { code: 'TLT-VOID-HERO', nameVi: 'Gian Hùng Thời Loạn', nameEn: 'Hero of Chaos', cat: 'LEADERSHIP', rarity: 'LEGENDARY', vi: 'Thà ta phụ người chứ không để người phụ ta. Tăng 15% sát thương khi chỉ huy và giảm 20% tổn thất khi rút lui.', en: 'Supreme ruthlessness and strategic brilliance in troubled times.', npc: 'NPC-0022' },
  { code: 'TLT-GOD-WAR', nameVi: 'Võ Thánh Oai Trấn', nameEn: 'God of War', cat: 'MARTIAL', rarity: 'LEGENDARY', vi: 'Võ nghệ tuyệt đỉnh, chém tướng đoạt kỳ trong chớp mắt. Đòn đầu tiên trong đơn đấu luôn gây sát thương chí mạng.', en: 'Unrivaled martial prowess that strikes terror into enemy commanders.', npc: 'NPC-0003' },
  { code: 'TLT-ROAR-FEI', nameVi: 'Dũng Quán Tam Quân', nameEn: 'Fearless Roar of Changban', cat: 'MARTIAL', rarity: 'LEGENDARY', vi: 'Tiếng thét vang dội cầu Bản Sáp làm kinh hồn vạn quân địch, hạ 30% sĩ khí đối phương ngay khi lâm trận.', en: 'Roar that echoes across the battlefield shattering enemy morale.', npc: 'NPC-0002' },
  { code: 'TLT-DRAGON-HEART', nameVi: 'Đơn Kỵ Cứu Chúa', nameEn: 'Sole Ride of Changban', cat: 'MARTIAL', rarity: 'LEGENDARY', vi: 'Bảy进bảy xuất trận Đương Dương Trường Bản. Kháng hoàn toàn khống chế và tăng 35% phòng ngự khi bị bao vây.', en: 'Invulnerable break-through capacity when surrounded by superior forces.', npc: 'NPC-0024' },
  { code: 'TLT-DRAGON-STRAT', nameVi: 'Ngọa Long Xuất Thế', nameEn: 'Sleeping Dragon Wisdom', cat: 'STRATEGY', rarity: 'LEGENDARY', vi: 'Thấu suốt thiên văn địa lý, dự báo mưa gió, giảm 30% chi phí nội chính và tăng gấp đôi tốc độ sản xuất công cụ chiến tranh.', en: 'Supreme intellect encompassing meteorology, governance, and tactics.', npc: 'NPC-0025' },
  { code: 'TLT-TIGER-GUARD', nameVi: 'Hổ Si Hộ Vệ', nameEn: 'Tiger Guard Devotion', cat: 'MARTIAL', rarity: 'EPIC', vi: 'Hộ vệ trung thành tuyệt đối, giảm 50% sát thương chí mạng giáng vào chủ tướng đứng cạnh.', en: 'Sacrificial loyalty shielding the sovereign from deadly strikes.', npc: 'NPC-0041' },
  { code: 'TLT-FIRE-GENIUS', nameVi: 'Giang Đông Hỏa Thần', nameEn: 'Yangtze Fire God', cat: 'STRATEGY', rarity: 'LEGENDARY', vi: 'Bậc thầy tác chiến trên sông và hỏa công, tăng 40% sát thương hỏa tiễn và tàu hỏa công trên thủy lộ.', en: 'Unrivaled mastery of wind, naval fireships, and waterborne war.', npc: 'NPC-0017' },
  { code: 'TLT-UNRIVALED-MIGHT', nameVi: 'Chiến Thần Vô Song', nameEn: 'Unrivaled God of Battle', cat: 'MARTIAL', rarity: 'LEGENDARY', vi: 'Nhân trung Lữ Bố, mã trung Xích Thố. Vô địch trong mọi cuộc tỉ võ đơn đấu.', en: 'The greatest individual combatant under heaven.', npc: 'NPC-0057' },
  { code: 'TLT-DIVINE-HEALER', nameVi: 'Khởi Tử Hồi Sinh', nameEn: 'Miracle Healer', cat: 'GOVERNANCE', rarity: 'LEGENDARY', vi: 'Thần y dùng châm cứu và Ma Phế Tán cứu sống người sắp chết, giảm 80% tỷ lệ thương binh tử vong.', en: 'Miraculous medical surgery reversing fatal poison and battle trauma.', npc: 'NPC-0061' },
  { code: 'TLT-MERCHANT-PRINCE', nameVi: 'Đào Chu Thương Thuật', nameEn: 'Merchant Prince Heritage', cat: 'COMMERCE', rarity: 'EPIC', vi: 'Kinh doanh phát tài, tích trữ hàng hóa liên châu, hưởng ưu đãi giảm thuế và tăng 25% lãi suất buôn bán.', en: 'Profound acumen in macro-trade, accumulation, and capital growth.', npc: 'NPC-0032' },
  { code: 'TLT-WOLF-PATIENCE', nameVi: 'Lang Cố Ẩn Nhẫn', nameEn: 'Wolf Gaze Endurance', cat: 'STRATEGY', rarity: 'LEGENDARY', vi: 'Tướng lang cố nhìn ngoái cổ, giỏi ẩn nhẫn chịu đựng đợi thời cơ, miễn nhiễm phản gián ly gián.', en: 'Immense strategic patience waiting decades for the decisive counter-strike.', npc: 'NPC-0039' },
  { code: 'TLT-SWORD-LOYALTY', nameVi: 'Chiêu Đức Nhân Tâm', nameEn: 'Benevolent Aura', cat: 'LEADERSHIP', rarity: 'LEGENDARY', vi: 'Lấy đức phục người, tăng 20 điểm thiện cảm cơ bản với mọi nhân sĩ và ngăn dân chúng bạo loạn.', en: 'Moral charisma inspiring unwavering loyalty from retainers and populace.', npc: 'NPC-0001' }
];

let sqlTalents = 'BEGIN TRANSACTION;\n';
for (const t of talentsList) {
  sqlTalents += `INSERT OR REPLACE INTO master_talents
    (talent_code, name_vi, name_en, category, rarity, effect_vi, effect_en, exclusive_to_npc_id)
    VALUES ('${t.code}', '${escapeSql(t.nameVi)}', '${escapeSql(t.nameEn)}', '${t.cat}', '${t.rarity}', '${escapeSql(t.vi)}', '${escapeSql(t.en)}', '${t.npc}');\n`;
}
sqlTalents += 'COMMIT;';
runOnBoth(sqlTalents);
console.log(` ✅ ${talentsList.length} Master Innate Talents cataloged.`);

// Step 7: Ingest 25 Master Items & Masterpieces
console.log('\n[7/13] Ingesting 25+ Master Items & Legendary Artifacts...');
const itemsList = [
  // Commercial & Raw Materials
  { code: 'COM-GRAIN', nameVi: 'Lương Thảo (Tiểu Mạch / Kê)', nameEn: 'Grain (Millet / Wheat)', cat: 'FOOD_STUFF', unitVi: 'Thạch', unitEn: 'Dan', peace: 100, curr: 175, vol: 'High', src: 'Trác Quận / Ký Châu' },
  { code: 'COM-WINE-ZHUO', nameVi: 'Rượu Hoa Đào Trác Quận', nameEn: 'Zhuo County Peach Blossom Wine', cat: 'FINISHED_GOOD', unitVi: 'Vò', unitEn: 'Jar', peace: 35, curr: 45, vol: 'Medium', src: 'Quán Rượu Huyện Trác' },
  { code: 'COM-TEA-DRIED', nameVi: 'Trà Khô Giang Nam', nameEn: 'Dried Southern Tea', cat: 'FOOD_STUFF', unitVi: 'Cân', unitEn: 'Catty', peace: 15, curr: 25, vol: 'Low', src: 'Giang Nam Vận Lương' },
  { code: 'RAW-BAMBOO-POLE', nameVi: 'Tre Trúc Rừng Phương Bắc', nameEn: 'Northern Forest Bamboo Poles', cat: 'RAW_MATERIAL', unitVi: 'Bó', unitEn: 'Bundle', peace: 12, curr: 18, vol: 'Low', src: 'Rừng Trúc Trác Châu' },
  { code: 'RAW-REED-FIBER', nameVi: 'Sợi Cỏ Lác / Đay Thô', nameEn: 'Dried Reed & Jute Fiber', cat: 'RAW_MATERIAL', unitVi: 'Bó', unitEn: 'Bundle', peace: 8, curr: 10, vol: 'Low', src: 'Đầm Lầy Bạch Dương Điệp' },
  { code: 'RAW-PIGSKIN-HIDE', nameVi: 'Da Heo Thuộc Thu Cọ', nameEn: 'Tanned Swine Leather', cat: 'RAW_MATERIAL', unitVi: 'Tấm', unitEn: 'Hide', peace: 25, curr: 35, vol: 'Medium', src: 'Lò Mổ Trương Gia' },
  { code: 'RAW-IRON-INGOT', nameVi: 'Thỏi Sắt Tinh Luyện (Ngũ Luyện)', nameEn: 'Refined Iron Ingot (5-Fold)', cat: 'RAW_MATERIAL', unitVi: 'Thỏi', unitEn: 'Ingot', peace: 45, curr: 85, vol: 'High', src: 'Lò Rèn Cự Lộc' },
  { code: 'RAW-SILK-BOLT', nameVi: 'Cuộn Tơ Lụa Thượng Hạng', nameEn: 'Superior Silk Bolt', cat: 'FINISHED_GOOD', unitVi: 'Cuộn', unitEn: 'Bolt', peace: 120, curr: 160, vol: 'Medium', src: 'Từ Châu Thổ Sản' },
  { code: 'RAW-TIMBER-OAK', nameVi: 'Gỗ Sồi Cổ Thụ Quân Nhu', nameEn: 'Military Oak Timber', cat: 'RAW_MATERIAL', unitVi: 'Khối', unitEn: 'Log', peace: 30, curr: 55, vol: 'Medium', src: 'Dãy Núi Thái Hàng' },
  { code: 'RAW-CHARCOAL-BAG', nameVi: 'Than Đen Lò Nung', nameEn: 'Kiln Charcoal Sacks', cat: 'RAW_MATERIAL', unitVi: 'Bao', unitEn: 'Sack', peace: 10, curr: 15, vol: 'Low', src: 'Lò Than Ký Châu' },
  { code: 'COM-SALT-SEA', nameVi: 'Muối Hạt Biển Từ Châu', nameEn: 'Coastal Sea Salt', cat: 'FOOD_STUFF', unitVi: 'Bao', unitEn: 'Sack', peace: 40, curr: 70, vol: 'High', src: 'Hải Phòng Từ Châu' },
  { code: 'COM-GOLD-INGOT', nameVi: 'Vàng Khối Quan Đúc (1 Lạng)', nameEn: 'Imperial Cast Gold Bar (1 Tael)', cat: 'FINISHED_GOOD', unitVi: 'Thỏi', unitEn: 'Bar', peace: 1000, curr: 1000, vol: 'Zero', src: 'Lạc Dương Ngân Khố' },

  // Weapons & Legendary Masterpieces
  { code: 'EQP-SPEAR-IRON', nameVi: 'Hán Trực Thương (Binh Khí Sắt)', nameEn: 'Standard Han Iron Spear', cat: 'MILITARY_EQUIPMENT', unitVi: 'Cây', unitEn: 'Piece', peace: 80, curr: 150, vol: 'High', src: 'Binh Xưởng Quân Đội' },
  { code: 'EQP-SHIELD-BAMBOO', nameVi: 'Khiên Trúc Bọc Da (Chống Tên)', nameEn: 'Reinforced Bamboo Shield', cat: 'MILITARY_EQUIPMENT', unitVi: 'Chiếc', unitEn: 'Piece', peace: 60, curr: 110, vol: 'High', src: 'Xưởng Đan Lương Gia' },
  { code: 'EQP-ARMOR-LEATHER', nameVi: 'Áo Giáp Da Khâu Đinh Tán', nameEn: 'Riveted Leather Lamellar Armor', cat: 'MILITARY_EQUIPMENT', unitVi: 'Bộ', unitEn: 'Suit', peace: 180, curr: 320, vol: 'High', src: 'Xưởng Giáp Quan Phủ' },
  { code: 'EQP-CROSSBOW-REPEATING', nameVi: 'Gia Cát Liên Nỗ (Bắn 10 Tên)', nameEn: 'Zhuge Repeating Crossbow', cat: 'MILITARY_EQUIPMENT', unitVi: 'Chiếc', unitEn: 'Piece', peace: 500, curr: 1200, vol: 'Extreme', src: 'Thục Hán Quân Khí Viện' },
  { code: 'WPN-GREEN-DRAGON', nameVi: 'Thanh Long Yển Nguyệt Đao (82 Cân)', nameEn: 'Green Dragon Crescent Blade (82 Jin)', cat: 'MILITARY_EQUIPMENT', unitVi: 'Thanh', unitEn: 'Blade', peace: 5000, curr: 25000, vol: 'Artifact', src: 'Thần Binh Rèn Bằng Thiết Bách Luyện' },
  { code: 'WPN-SERPENT-SPEAR', nameVi: 'Bát Trượng Xà Mâu (Trương Phi)', nameEn: 'Eight-Zhang Serpent Spear', cat: 'MILITARY_EQUIPMENT', unitVi: 'Cây', unitEn: 'Spear', peace: 4500, curr: 22000, vol: 'Artifact', src: 'Thần Binh Rèn Tại Trác Quận' },
  { code: 'WPN-SKY-PIERCER', nameVi: 'Phương Thiên Họa Kích (Lữ Bố)', nameEn: 'Sky Piercer Halberd', cat: 'MILITARY_EQUIPMENT', unitVi: 'Cây', unitEn: 'Halberd', peace: 6000, curr: 30000, vol: 'Artifact', src: 'Chiến Thần Độc Môn Binh Khí' },
  { code: 'WPN-HEAVEN-SWORD', nameVi: 'Ỷ Thiên Kiếm (Tào Tháo Bảo Kiếm)', nameEn: 'Heaven Sword (Cao Cao)', cat: 'MILITARY_EQUIPMENT', unitVi: 'Thanh', unitEn: 'Sword', peace: 4000, curr: 20000, vol: 'Artifact', src: 'Triều Đình Ngự Kiếm' },
  { code: 'WPN-ANCIENT-INGOT', nameVi: 'Cổ Đĩnh Đao (Tôn Kiên Gia Truyền)', nameEn: 'Ancient Ingot Blade (Sun Jian)', cat: 'MILITARY_EQUIPMENT', unitVi: 'Thanh', unitEn: 'Blade', peace: 3500, curr: 18000, vol: 'Artifact', src: 'Giang Đông Bảo Đao' },

  // Warhorses & Tomes
  { code: 'HRS-RED-HARE', nameVi: 'Xích Thố Thần Mã (Ngày Đi Ngàn Dặm)', nameEn: 'Red Hare (Thousand-Li Steed)', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'Horse', peace: 10000, curr: 50000, vol: 'Artifact', src: 'Tây Lương Thần Tuấn' },
  { code: 'HRS-SHADOW-RUNNER', nameVi: 'Tuyệt Ảnh Thần Tuấn (Tào Tháo)', nameEn: 'Shadow Runner Steed', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'Horse', peace: 4000, curr: 15000, vol: 'Artifact', src: 'Bảo Mã Chạy Không Thấy Bóng' },
  { code: 'HRS-DILU-STEED', nameVi: 'Đích Lô Mã (Nhảy Qua Sông Đàn Khê)', nameEn: 'Dilu Steed (Hex Mark Horse)', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'Horse', peace: 3500, curr: 14000, vol: 'Artifact', src: 'Bảo Mã Phúc Họa Tương Sinh' },
  { code: 'BOOK-SUN-TZU', nameVi: 'Tôn Tử Binh Pháp (13 Thiên Bí Bản)', nameEn: 'The Art of War by Sun Tzu', cat: 'FINISHED_GOOD', unitVi: 'Bộ', unitEn: 'Tome', peace: 2500, curr: 10000, vol: 'Artifact', src: 'Binh Thư Tuyệt Thế' }
];

let sqlItems = 'BEGIN TRANSACTION;\n';
for (const it of itemsList) {
  sqlItems += `INSERT OR REPLACE INTO master_items
    (item_code, name_vi, name_en, category, unit_vi, unit_en, baseline_peace_price, current_market_price, volatility_index, production_source_vi)
    VALUES ('${it.code}', '${escapeSql(it.nameVi)}', '${escapeSql(it.nameEn)}', '${it.cat}', '${it.unitVi}', '${it.unitEn}', ${it.peace}, ${it.curr}, '${it.vol}', '${escapeSql(it.src)}');\n`;
}
sqlItems += 'COMMIT;';
runOnBoth(sqlItems);
console.log(` ✅ ${itemsList.length} Master Commodity & Products cataloged.`);

// Step 8: Ingest Master Crafting Recipes
console.log('\n[8/13] Ingesting Master Crafting Recipes & BOM...');
const recipesList = [
  { code: 'REC-SHIELD-01', prod: 'EQP-SHIELD-BAMBOO', nameVi: 'Khiên Trúc Bọc Da', cat: 'MILITARY_EQUIPMENT', hours: 4.5, defect: 0.06, skill: 'SKL-CRA-WEAVE', tier: 2, bom: [{ item: 'RAW-BAMBOO-POLE', qty: 3, unit: 'Bó' }, { item: 'RAW-REED-FIBER', qty: 2, unit: 'Bó' }, { item: 'RAW-PIGSKIN-HIDE', qty: 1, unit: 'Tấm' }] },
  { code: 'REC-SPEAR-01', prod: 'EQP-SPEAR-IRON', nameVi: 'Hán Trực Thương Tiêu Chuẩn', cat: 'MILITARY_EQUIPMENT', hours: 6.0, defect: 0.05, skill: 'SKL-CRA-SMITH', tier: 2, bom: [{ item: 'RAW-IRON-INGOT', qty: 2, unit: 'Thỏi' }, { item: 'RAW-TIMBER-OAK', qty: 1, unit: 'Khối' }, { item: 'RAW-CHARCOAL-BAG', qty: 3, unit: 'Bao' }] },
  { code: 'REC-WINE-01', prod: 'COM-WINE-ZHUO', nameVi: 'Rượu Hoa Đào Trác Quận', cat: 'FINISHED_GOOD', hours: 12.0, defect: 0.08, skill: 'SKL-MGT-ENTERPRISE', tier: 1, bom: [{ item: 'COM-GRAIN', qty: 1, unit: 'Thạch' }] },
  { code: 'REC-ARMOR-01', prod: 'EQP-ARMOR-LEATHER', nameVi: 'Áo Giáp Da Khâu Đinh Tán', cat: 'MILITARY_EQUIPMENT', hours: 10.0, defect: 0.04, skill: 'SKL-CRA-WEAVE', tier: 3, bom: [{ item: 'RAW-PIGSKIN-HIDE', qty: 4, unit: 'Tấm' }, { item: 'RAW-IRON-INGOT', qty: 1, unit: 'Thỏi' }] },
  { code: 'REC-CROSSBOW-01', prod: 'EQP-CROSSBOW-REPEATING', nameVi: 'Gia Cát Liên Nỗ', cat: 'MILITARY_EQUIPMENT', hours: 24.0, defect: 0.03, skill: 'SKL-CRA-SMITH', tier: 4, bom: [{ item: 'RAW-TIMBER-OAK', qty: 2, unit: 'Khối' }, { item: 'RAW-IRON-INGOT', qty: 3, unit: 'Thỏi' }, { item: 'RAW-REED-FIBER', qty: 4, unit: 'Bó' }] },
  { code: 'REC-SERPENT-01', prod: 'WPN-SERPENT-SPEAR', nameVi: 'Bát Trượng Thiết Xà Mâu', cat: 'MILITARY_EQUIPMENT', hours: 48.0, defect: 0.01, skill: 'SKL-CRA-SMITH', tier: 5, bom: [{ item: 'RAW-IRON-INGOT', qty: 10, unit: 'Thỏi' }, { item: 'RAW-CHARCOAL-BAG', qty: 20, unit: 'Bao' }, { item: 'RAW-TIMBER-OAK', qty: 3, unit: 'Khối' }] }
];

let sqlRecipes = 'BEGIN TRANSACTION;\n';
for (const rc of recipesList) {
  sqlRecipes += `INSERT OR REPLACE INTO master_recipes
    (recipe_code, product_item_code, product_name_vi, product_name_en, category, standard_labor_hours, base_defect_rate, required_skill_code, required_skill_tier, bom_inputs)
    VALUES ('${rc.code}', '${rc.prod}', '${escapeSql(rc.nameVi)}', '${escapeSql(rc.nameVi)}', '${rc.cat}', ${rc.hours}, ${rc.defect}, '${rc.skill}', ${rc.tier}, '${escapeSql(JSON.stringify(rc.bom))}');\n`;
}
sqlRecipes += 'COMMIT;';
runOnBoth(sqlRecipes);
console.log(` ✅ ${recipesList.length} Master Crafting Recipes cataloged.`);

// Step 9: Ingest Master Locations & Citadels
console.log('\n[9/13] Ingesting Master Locations & Citadels...');
const locIdMap = {
  'zhuo-xian': 'LOC-0001',
  'luoyang': 'LOC-0002',
  'guangzong': 'LOC-0003',
  'pingyuan': 'LOC-0004',
  'changan': 'LOC-0005',
  'ye-cheng': 'LOC-0006',
  'xuchang': 'LOC-0007',
  'beiping': 'LOC-0008',
  'xiapi': 'LOC-0009',
  'xiangyang': 'LOC-0010',
  'chibi': 'LOC-0011',
  'jiangling': 'LOC-0012',
  'jianye': 'LOC-0013',
  'hanzhong': 'LOC-0014',
  'chengdu': 'LOC-0015'
};

const mapFilePath = path.join(ROOT_DIR, 'public', 'js', 'map-data.js');
let mapContent = '';
if (fs.existsSync(mapFilePath)) {
  mapContent = fs.readFileSync(mapFilePath, 'utf8');
}

const nodeRegex = /['"]?([a-zA-Z0-9_-]+)['"]?\s*:\s*\{([^}]+(?:\{[^}]+\}[^}]+)*)\}/g;
let match;
let sqlLocs = 'BEGIN TRANSACTION;\n';
let locCount = 0;

while ((match = nodeRegex.exec(mapContent)) !== null) {
  const nodeKey = match[1];
  const body = match[2];
  if (['zoom', 'pan', 'settings', 'config'].includes(nodeKey)) continue;

  const getProp = (key) => {
    const pMatch = body.match(new RegExp(`${key}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`));
    return pMatch ? pMatch[1] : null;
  };
  const getNum = (key, def = 0) => {
    const nMatch = body.match(new RegExp(`${key}\\s*:\\s*([0-9.]+)`));
    return nMatch ? parseFloat(nMatch[1]) : def;
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
console.log('\n[10/13] Ingesting 14 Master March & Trade Routes (master_routes)...');
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
console.log('\n[11/13] Ingesting Master Factions...');
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
console.log('\n[12/13] Ingesting Baseline Relationships...');
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

// Step 13: Ingest 40 Master ROTK Historical Events (master_events)
console.log('\n[13/13] Ingesting 40 Master Historical Events & ROTK Chronicles (master_events)...');
const eventsList = [
  {
    id: 'EVT-184-PEACH-GARDEN',
    nameVi: 'Đào Viên Kết Nghĩa',
    nameEn: 'Oath of the Peach Garden',
    year: 184,
    season: 'SPRING',
    loc: 'LOC-0001',
    pChar: 'NPC-0001',
    sChar: 'NPC-0003',
    factions: JSON.stringify(['FACTION-0004']),
    prereq: 'Năm 184 Khăn Vàng dấy binh, Trác Huyện dán bảng chiêu mộ hương dũng',
    sumVi: 'Lưu Bị, Quan Vũ và Trương Phi gặp gỡ tại Trác Huyện, chí đồng đạo hợp, kết nghĩa huynh đệ tại vườn đào Trương gia, thề cùng sinh tử cứu độ bách tính.',
    sumEn: 'Liu Bei, Guan Yu, and Zhang Fei meet in Zhuo County and swear an eternal oath of brotherhood in the peach garden, pledging to restore peace.',
    outVi: 'Thành lập nghĩa quân Trác Quận, tạo bước ngoặt khai sinh tập đoàn Thục Hán.',
    outEn: 'Birth of the Shu-Han brotherhood alliance and heroic militia.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ sentiment_boost: 50, item_reward: 'COM-WINE-ZHUO', rep_gain: 20 })
  },
  {
    id: 'EVT-184-YELLOW-TURBAN',
    nameVi: 'Hoàng Cân Khởi Nghĩa Bùng Nổ',
    nameEn: 'Outbreak of Yellow Turban Rebellion',
    year: 184,
    season: 'SPRING',
    loc: 'LOC-0003',
    pChar: 'NPC-0004',
    sChar: null,
    factions: JSON.stringify(['FACTION-0002', 'FACTION-0001']),
    prereq: 'Khẩu hiệu: Thương thiên dĩ tử, hoàng thiên đương lập, tuế tại giáp tý, thiên hạ đại cát',
    sumVi: 'Trương Giác cùng hai em Trương Bảo, Trương Lương phát động hàng chục vạn tín đồ Khăn Vàng nổi dậy khắp 8 châu, công phá nha môn thành quách triều đình.',
    sumEn: 'Zhang Jue launches a massive peasant revolt across eight provinces under the banner of the Yellow Sky.',
    outVi: 'Đông Hán lâm vào khủng hoảng toàn diện, triều đình buộc phải trao quyền tự chủ mộ binh cho các châu mục.',
    outEn: 'Decentralization of Han military command, empowering warlords.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ world_threat: 'EXTREME', price_multiplier: { grain: 1.75 } })
  },
  {
    id: 'EVT-184-CHANGSHE-FIRE',
    nameVi: 'Trường Xã Hỏa Công Phá Giặc',
    nameEn: 'Battle of Changshe Fire Strategy',
    year: 184,
    season: 'SUMMER',
    loc: 'LOC-0007',
    pChar: 'NPC-0056',
    sChar: 'NPC-0022',
    factions: JSON.stringify(['FACTION-0001', 'FACTION-0002']),
    prereq: 'Quân Khăn Vàng đóng trại sát bụi rậm cỏ khô tại Trường Xã',
    sumVi: 'Hoàng Phủ Tung lợi dụng đêm gió lớn, phóng hỏa thiêu rụi doanh trại giặc Khăn Vàng; Tào Tháo dẫn kỵ binh tiếp ứng tiêu diệt tàn quân.',
    sumEn: 'Huangfu Song employs fire tactics in high winds against dry grass encamped rebels, joined by Cao Cao cavalry.',
    outVi: 'Giải tỏa thế bao vây Dự Châu, Tào Tháo và Hoàng Phủ Tung lập đại công.',
    outEn: 'Rebel siege lifted; rise of Cao Cao and imperial prestige.',
    trigger: 'BATTLE_DUEL',
    effects: JSON.stringify({ exp: 300, rep_gain: 15 })
  },
  {
    id: 'EVT-184-GUANGZONG-FALL',
    nameVi: 'Đại Phá Quảng Tông Khăn Vàng Tan Rã',
    nameEn: 'Fall of Guangzong & Death of Zhang Jue',
    year: 184,
    season: 'WINTER',
    loc: 'LOC-0003',
    pChar: 'NPC-0056',
    sChar: 'NPC-0004',
    factions: JSON.stringify(['FACTION-0001', 'FACTION-0002']),
    prereq: 'Trương Giác lâm bệnh qua đời trong thành Quảng Tông',
    sumVi: 'Hoàng Phủ Tung công phá sào huyệt Quảng Tông, chém Trương Lương, quật mồ Trương Giác. Đại quân Khăn Vàng chính quy bị dẹp tan.',
    sumEn: 'Huangfu Song captures the rebel stronghold of Guangzong, crushing the main rebel army.',
    outVi: 'Khởi nghĩa Khăn Vàng về cơ bản chấm dứt, mở ra thời kỳ quân phiệt cát cứ xâu xé thiên hạ.',
    outEn: 'End of Yellow Turban cohesion; opening the Warlord Era.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ world_stability: 'FRAGILE', threat_reduced: 40 })
  },
  {
    id: 'EVT-189-HE-JIN-FALL',
    nameVi: 'Đại Loạn Lạc Dương & Thập Thường Thị',
    nameEn: 'Chaos of Luoyang & Fall of He Jin',
    year: 189,
    season: 'AUTUMN',
    loc: 'LOC-0002',
    pChar: 'NPC-0018',
    sChar: 'NPC-0022',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Hán Linh Đế băng hà, Đại Hà Tiến mưu sát hoạn quan thất bại bị trảm',
    sumVi: 'Viên Thiệu và Tào Tháo dẫn binh xông vào hoàng cung chém sạch hai ngàn hoạn quan; kinh sư Lạc Dương rơi vào biển lửa và hỗn loạn.',
    sumEn: 'Eunuchs murder Regent He Jin; Yuan Shao storms the forbidden city, massacring the palace attendants in chaos.',
    outVi: 'Tạo cơ hội ngàn vàng cho Đổng Trác dẫn binh Tây Lương chiếm giữ kinh kỳ.',
    outEn: 'Imperial power vacuum exploited by Dong Zhuo.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ order_drop: 50, panic_index: 'HIGH' })
  },
  {
    id: 'EVT-189-DONG-ZHUO-POWER',
    nameVi: 'Đổng Trác Nhập Kinh Phế Đế Lập Vương',
    nameEn: 'Dong Zhuo Seizes Power & Deposes Emperor',
    year: 189,
    season: 'AUTUMN',
    loc: 'LOC-0002',
    pChar: 'NPC-0023',
    sChar: 'NPC-0094',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Đổng Trác nhận mật chiếu của Hà Tiến mang quân Tây Lương vào Lạc Dương',
    sumVi: 'Đổng Trác nắm trọn quân quyền kinh sư, ngang ngược phế Thiếu Đế lập Trần Lưu Vương (Hiến Đế), tự phong Thái sư lộng hành triều chính.',
    sumEn: 'Dong Zhuo usurps imperial power, deposing Emperor Shao and installing Emperor Xian under his tyranny.',
    outVi: 'Triều đình Đông Hán hữu danh vô thực, chư hầu các nơi bất mãn chuẩn bị thảo phạt.',
    outEn: 'Total collapse of legitimate central governance.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ tyrant_active: true, sentiment_court: -60 })
  },
  {
    id: 'EVT-189-CAO-FLEE',
    nameVi: 'Tào Tháo Dâng Kiếm Thích Đổng Thất Bại',
    nameEn: 'Cao Cao Attempted Assassination of Dong Zhuo',
    year: 189,
    season: 'WINTER',
    loc: 'LOC-0002',
    pChar: 'NPC-0022',
    sChar: 'NPC-0023',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Vương Doãn trao Thất Tinh Bảo Đao cho Tào Tháo vào phủ thái sư',
    sumVi: 'Tào Tháo định đâm Đổng Trác nhưng bị phát hiện qua gương, bèn quỳ dâng bảo đao rồi phi ngựa trốn khỏi Lạc Dương về Trần Lưu phát hịch.',
    sumEn: 'Cao Cao attempts to assassinate Dong Zhuo with the Seven-Star Dagger, fails, and escapes to raise troops.',
    outVi: 'Tào Tháo phát chiếu chỉ giả mạo thiên tử kêu gọi chư hầu toàn quốc hội minh.',
    outEn: 'Cao Cao issues calls to arms gathering regional governors.',
    trigger: 'CHOICE_EVENT',
    effects: JSON.stringify({ rep_gain: 25, item_unlock: 'WPN-HEAVEN-SWORD' })
  },
  {
    id: 'EVT-190-ALLIANCE-FORM',
    nameVi: 'Thập Bát Lộ Chư Hầu Hội Minh Phạt Đổng',
    nameEn: '18-Warlord Coalition Formed Against Dong Zhuo',
    year: 190,
    season: 'SPRING',
    loc: 'LOC-0002',
    pChar: 'NPC-0018',
    sChar: 'NPC-0022',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Hịch văn của Tào Tháo truyền khắp các châu phủ',
    sumVi: '18 lộ chư hầu hội minh tại Toan Tảo, tôn Viên Thiệu làm minh chủ, Tôn Kiên làm tiên phong, thề cùng xua quân tiêu diệt nghịch tặc Đổng Trác.',
    sumEn: 'Eighteen provincial warlords unite under Yuan Shao to liberate the capital and eradicate Dong Zhuo.',
    outVi: 'Đại chiến chư hầu bùng nổ tại Hổ Lao Quan và Tị Thủy Quan.',
    outEn: 'Major warfare erupts at Hulao and Sishui passes.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ coalition_morale: 90, war_declared: true })
  },
  {
    id: 'EVT-190-WARM-WINE-HUA',
    nameVi: 'Ôn Tửu Trảm Hoa Hùng',
    nameEn: 'Guan Yu Slays Hua Xiong with Warm Wine',
    year: 190,
    season: 'SPRING',
    loc: 'LOC-0002',
    pChar: 'NPC-0003',
    sChar: 'NPC-0095',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Hoa Hùng chém liên tiếp các tướng chư hầu ngoài ải Tị Thủy',
    sumVi: 'Quan Vũ lúc bấy giờ chỉ là mã cung thủ vô danh, xin ra trận; Tào Tháo rót chén rượu nóng tiễn đưa. Quan Vũ ra trận chém đầu Hoa Hùng trở về chén rượu vẫn còn ấm.',
    sumEn: 'Guan Yu volunteers to duel the terrifying Hua Xiong; defeats him and returns before his cup of heated wine cools.',
    outVi: 'Quan Vân Trường dương danh thiên hạ, chư hầu kinh ngạc bái phục.',
    outEn: 'Guan Yu rises to legendary fame across China.',
    trigger: 'BATTLE_DUEL',
    effects: JSON.stringify({ guan_yu_fame: 100, morale_boost: 25 })
  },
  {
    id: 'EVT-190-HULAOPASS-DUEL',
    nameVi: 'Tam Anh Chiến Lữ Bố Tại Hổ Lao Quan',
    nameEn: 'Three Heroes Duel Lu Bu at Hulao Pass',
    year: 190,
    season: 'SPRING',
    loc: 'LOC-0002',
    pChar: 'NPC-0057',
    sChar: 'NPC-0002',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Lữ Bố cưỡi Xích Thố, cầm Phương Thiên Họa Kích chặn đứng 18 lộ quân',
    sumVi: 'Trương Phi xông ra đấu 50 hiệp, Quan Vũ tiếp ứng giằng co thêm 30 hiệp, Lưu Bị vung song kiếm trợ chiến, ba anh em vây đánh Lữ Bố lui quân.',
    sumEn: 'Zhang Fei, Guan Yu, and Liu Bei combine their prowess to battle the supreme warrior Lu Bu at Hulao Pass.',
    outVi: 'Phá vỡ huyền thoại bất khả chiến bại của Lữ Bố, mở toang cửa ải Lạc Dương.',
    outEn: 'Coalition breaches the outer defenses of Luoyang.',
    trigger: 'BATTLE_DUEL',
    effects: JSON.stringify({ heroic_fame: 150, lu_bu_retreat: true })
  },
  {
    id: 'EVT-190-BURNING-LUOYANG',
    nameVi: 'Đổng Trác Thiêu Rụi Lạc Dương Thiên Đô',
    nameEn: 'Burning of Luoyang & Imperial Seal Discovery',
    year: 190,
    season: 'SUMMER',
    loc: 'LOC-0002',
    pChar: 'NPC-0023',
    sChar: 'NPC-0014',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Quân chư hầu áp sát kinh sư Lạc Dương',
    sumVi: 'Đổng Trác cưỡng bức bách tính dời đô về Trường An, châm lửa thiêu rụi toàn bộ cung điện Lạc Dương. Tôn Kiên dẫn quân vào dập lửa, phát hiện Ngọc Tỷ Truyền Quốc dưới giếng ngọc.',
    sumEn: 'Dong Zhuo torches Luoyang and relocates to Changan. Sun Jian salvages the ruined capital and unearths the Imperial Jade Seal.',
    outVi: 'Lạc Dương thành đống tro tàn, liên minh chư hầu vì nghi kỵ Ngọc Tỷ mà tan rã.',
    outEn: 'Luoyang devastated; coalition splinters over the Jade Seal.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ luoyang_destroyed: true, seal_found: true })
  },
  {
    id: 'EVT-191-JIESHIAO-BATTLE',
    nameVi: 'Giới Kiều Đại Chiến & Triệu Vân Xuất Hiện',
    nameEn: 'Battle of Jieqiao & Debut of Zhao Yun',
    year: 191,
    season: 'AUTUMN',
    loc: 'LOC-0006',
    pChar: 'NPC-0024',
    sChar: 'NPC-0018',
    factions: JSON.stringify(['FACTION-0003']),
    prereq: 'Viên Thiệu đoạt Ký Châu, Công Tôn Toản hận khởi binh tranh chấp',
    sumVi: 'Bạch Mã Nghĩa Tòng của Công Tôn Toản bị Cúc Nghĩa mai phục đại bại. Giữa lúc nguy cấp, thiếu niên dũng tướng Triệu Tử Long một thương đâm chết đại tướng Văn Xú cứu thoát Công Tôn Toản.',
    sumEn: 'Zhao Yun bursts onto the historical stage, rescuing Gongsun Zan from Yuan Shao vanguard at Jie Bridge.',
    outVi: 'Triệu Vân kết duyên tương ngộ Lưu Bị, Viên Thiệu củng cố quyền thống trị Ký Châu.',
    outEn: 'Zhao Yun meets Liu Bei; Yuan Shao secures Jizhou.',
    trigger: 'BATTLE_DUEL',
    effects: JSON.stringify({ zhao_yun_unlocked: true, rep_gain: 20 })
  },
  {
    id: 'EVT-191-SUN-JIAN-FALL',
    nameVi: 'Tôn Kiên Trúng Kế Hiểm Tạ Thế Tại Hiện Sơn',
    nameEn: 'Death of Sun Jian at Mount Xianshan',
    year: 191,
    season: 'WINTER',
    loc: 'LOC-0010',
    pChar: 'NPC-0014',
    sChar: 'NPC-0016',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Viên Thuật xúi giục Tôn Kiên đánh Lưu Biểu cướp Kinh Châu',
    sumVi: 'Tôn Kiên truy kích bộ tướng Hoàng Tổ vào thung lũng Hiện Sơn, trúng tên độc và đá lăn tử trận. Tôn Sách khi ấy mới 17 tuổi nén đau thương thu nhận tàn quân.',
    sumEn: 'Sun Jian is ambushed and slain by arrows at Mount Xian; his young son Sun Ce inherits his battered remnants.',
    outVi: 'Giang Đông mất đi mãnh hổ, Tôn Sách tạm thời nương nhờ dưới trướng Viên Thuật.',
    outEn: 'Sun Ce temporarily serves Yuan Shu with the Imperial Seal.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ sun_jian_dead: true, sun_ce_leader: true })
  },
  {
    id: 'EVT-192-SERIAL-STRATAGEM',
    nameVi: 'Vương Doãn Thiết Lập Liên Hoàn Kế',
    nameEn: 'Wang Yun Serial Stratagem & Diaochan',
    year: 192,
    season: 'SPRING',
    loc: 'LOC-0005',
    pChar: 'NPC-0015',
    sChar: 'NPC-0057',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Đổng Trác lộng quyền tại Trường An, tàn sát lương dân',
    sumVi: 'Tư đồ Vương Doãn dùng dưỡng nữ Điêu Thuyền bày mỹ nhân kế và liên hoàn kế, vừa hứa gả cho Lữ Bố vừa dâng cho Đổng Trác, khoét sâu mâu thuẫn phụ tử.',
    sumEn: 'Wang Yun crafts the serial stratagem, using beautiful Diaochan to turn Lu Bu against his adoptive father Dong Zhuo.',
    outVi: 'Lữ Bố căm phẫn thấu xương Đổng Trác, bí mật mưu tính giết cha nuôi.',
    outEn: 'Irrevocable feud between Lu Bu and Dong Zhuo.',
    trigger: 'DIPLOMACY',
    effects: JSON.stringify({ scheme_success: true, betrayal_chance: 1.0 })
  },
  {
    id: 'EVT-192-DONG-ZHUO-SLAIN',
    nameVi: 'Lữ Bố Trảm Đổng Trác Tại Vị Ương Cung',
    nameEn: 'Assassination of Dong Zhuo at Palace Gate',
    year: 192,
    season: 'SUMMER',
    loc: 'LOC-0005',
    pChar: 'NPC-0057',
    sChar: 'NPC-0023',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Vương Doãn lừa Đổng Trác vào cung nhận chiếu nhường ngôi',
    sumVi: 'Trước cửa bắc cung Trường An, Lữ Bố rút Phương Thiên Họa Kích đâm chết Đổng Trác. Bách tính Trường An ca hát mừng rỡ, thây Đổng Trác bị thắp đèn dầu giữa chợ.',
    sumEn: 'Lu Bu executes Dong Zhuo at the palace gate. The tyrant is slain, plunging Changan into new power struggles.',
    outVi: 'Tây Lương phản tướng Lý Thôi, Quách Dĩ đánh úp Trường An, Vương Doãn tự sát, Lữ Bố đào thoát.',
    outEn: 'Li Jue and Guo Si counter-attack; Wang Yun dies; Lu Bu flees.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ tyrant_eliminated: true, changan_ruins: true })
  },
  {
    id: 'EVT-193-XUZHOU-SIEGE',
    nameVi: 'Tào Tháo Đánh Từ Châu Báo Thù Cha',
    nameEn: 'Cao Cao Invasion of Xuzhou',
    year: 193,
    season: 'AUTUMN',
    loc: 'LOC-0009',
    pChar: 'NPC-0022',
    sChar: 'NPC-0001',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Tào Tung bị hàng tướng Trương Khải của Đào Khiêm giết hại cướp của',
    sumVi: 'Tào Tháo lấy cớ rửa thù gia tộc dốc toàn quân tàn sát Từ Châu. Đào Khiêm cầu cứu tứ phương, Lưu Bị dẫn vài ngàn binh mã từ Bình Nguyên dũng cảm tới cứu viện.',
    sumEn: 'Cao Cao unleashes devastation upon Xuzhou avenging his father. Liu Bei marches from Pingyuan to defend the innocent.',
    outVi: 'Lưu Bị được nhân dân Từ Châu kính phục tôn kính như cha mẹ.',
    outEn: 'Liu Bei earns supreme moral prestige throughout Xuzhou.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ xuzhou_sentiment: 80, liu_bei_heroism: true })
  },
  {
    id: 'EVT-194-TAO-QIAN-CEDE',
    nameVi: 'Đào Khiêm Ba Lần Nhượng Từ Châu',
    nameEn: 'Tao Qian Cedes Xuzhou to Liu Bei',
    year: 194,
    season: 'WINTER',
    loc: 'LOC-0009',
    pChar: 'NPC-0001',
    sChar: 'NPC-0032',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Đào Khiêm lâm bệnh nặng qua đời tại Hạ Phì',
    sumVi: 'Đào Khiêm biết hai con mình bất tài, ba lần khẩn cầu trao ấn Từ Châu Mục cho Lưu Bị; Mi Trúc, Trần Đăng đồng lòng tôn phù Lưu Bị tiếp quản châu phủ.',
    sumEn: 'Tao Qian entrusts the governorship of prosperous Xuzhou to Liu Bei on his deathbed.',
    outVi: 'Lưu Bị lần đầu tiên chính thức sở hữu một châu phủ trù phú làm căn cứ.',
    outEn: 'Liu Bei acquires his first provincial territory.',
    trigger: 'CHOICE_EVENT',
    effects: JSON.stringify({ territory_gained: 'LOC-0009', treasury_boost: 50000 })
  },
  {
    id: 'EVT-195-SUN-CE-CONQUEST',
    nameVi: 'Tôn Sách Mượn Binh Khai Cơ Giang Đông',
    nameEn: 'Sun Ce Conquers Jiangdong & Little Conqueror',
    year: 195,
    season: 'SPRING',
    loc: 'LOC-0013',
    pChar: 'NPC-0048',
    sChar: 'NPC-0017',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Tôn Sách lấy Ngọc Tỷ thế chấp cho Viên Thuật đổi lấy 3,000 quân',
    sumVi: 'Tôn Sách cùng Chu Du qua sông đánh chiếm Khúc A, bình định Ngô Quận, Cối Kê; oai danh lẫy lừng được thiên hạ xưng tụng Tiểu Bá Vương.',
    sumEn: 'Sun Ce trades the Imperial Seal for troops, joining Zhou Yu to sweep across Jiangdong, establishing Wu dominance.',
    outVi: 'Đặt nền móng vững chắc cho sự ra đời của tập đoàn chính trị Đông Ngô.',
    outEn: 'Lays the geopolitical foundation of Eastern Wu.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ wu_faction_founded: true, territory_wu: 'LOC-0013' })
  },
  {
    id: 'EVT-196-CAO-EMPEROR',
    nameVi: 'Phụng Thiên Tử Dĩ Lệnh Chư Hầu',
    nameEn: 'Cao Cao Welcomes Emperor Xian to Xuchang',
    year: 196,
    season: 'AUTUMN',
    loc: 'LOC-0007',
    pChar: 'NPC-0022',
    sChar: 'NPC-0035',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Hiến Đế trốn khỏi tàn quân Tây Lương trở về Lạc Dương hoang tàn',
    sumVi: 'Nghe theo kế sách của Tuân Úc, Tào Tháo nghênh đón Hán Hiến Đế về Hứa Xương, nắm danh nghĩa thiên tử để phát hiệu lệnh cho mọi chư hầu trong thiên hạ.',
    sumEn: 'Acting on Xun Yu strategy, Cao Cao escorts Emperor Xian to Xuchang, securing supreme imperial legitimacy.',
    outVi: 'Tào Tháo nắm giữ ngọn cờ chính nghĩa, biến Hứa Xương thành trung tâm quyền lực.',
    outEn: 'Cao Cao achieves supreme political dominance over rival warlords.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ imperial_legitimacy: 100, xuchang_capital: true })
  },
  {
    id: 'EVT-197-YUAN-SHU-EMPEROR',
    nameVi: 'Viên Thuật Xưng Đế Trọng Gia Thiên Hạ Cùng Đánh',
    nameEn: 'Yuan Shu Declares Himself Emperor at Shouchun',
    year: 197,
    season: 'SPRING',
    loc: 'LOC-0007',
    pChar: 'NPC-0059',
    sChar: null,
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Viên Thuật nắm giữ Ngọc Tỷ do Tôn Sách thế chấp',
    sumVi: 'Viên Thuật mê tín sấm ngôn xưng đế tại Hoài Nam, quốc hiệu Trọng Gia; lập tức bị Tào Tháo, Lưu Bị, Tôn Sách và Lữ Bố đồng loạt xuất binh vây đánh.',
    sumEn: 'Yuan Shu commits political suicide by declaring himself Emperor, drawing combined punitive strikes.',
    outVi: 'Lực lượng Viên Thuật suy sụp nhanh chóng, cô lập tuyệt vọng.',
    outEn: 'Total military and economic isolation of Yuan Shu.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ yuan_shu_isolated: true, public_order_fall: 50 })
  },
  {
    id: 'EVT-197-WAN-CASTLE',
    nameVi: 'Uyển Thành Bi Hùng & Điển Vi Tử Trận',
    nameEn: 'Battle of Wancheng & Sacrificial Fall of Dian Wei',
    year: 197,
    season: 'SUMMER',
    loc: 'LOC-0007',
    pChar: 'NPC-0042',
    sChar: 'NPC-0022',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Tào Tháo nạp thím của Trương Tú khiến Trương Tú nổi giận làm phản',
    sumVi: 'Trương Tú dùng kế Giả Hủ nửa đêm tập kích trại Tào. Điển Vi bị trộm mất song kích, tay không chặn cửa trại giết hàng trăm quân giặc đến hơi thở cuối cùng để cứu Tào Tháo.',
    sumEn: 'Surprise night raid at Wancheng. Dian Wei defends the camp entrance unarmed until slain, saving Cao Cao life.',
    outVi: 'Tào Ngang, Tào An Dân và Điển Vi tử trận; Tào Tháo khóc thương Điển Vi hơn con ruột.',
    outEn: 'Cao Cao loses his eldest son and foremost champion Dian Wei.',
    trigger: 'BATTLE_DUEL',
    effects: JSON.stringify({ dian_wei_dead: true, cao_cao_sorrow: true })
  },
  {
    id: 'EVT-198-BAIMEN-TOWER',
    nameVi: 'Bạch Môn Lầu Tuyệt Mệnh Lữ Bố',
    nameEn: 'Fall of Lu Bu at Baimen Tower',
    year: 198,
    season: 'WINTER',
    loc: 'LOC-0009',
    pChar: 'NPC-0057',
    sChar: 'NPC-0058',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Tào Tháo dẫn nước sông Nghi Thủy và Dĩ Thủy dìm ngập thành Hạ Phì',
    sumVi: 'Bộ hạ làm phản trộm Xích Thố và Họa Kích, trói Lữ Bố nộp Tào Tháo. Tào Tháo theo lời can của Lưu Bị hạ lệnh thắt cổ Lữ Bố tại lầu Bạch Môn; Trần Cung hiên ngang chịu chém.',
    sumEn: 'Subordinates betray Lu Bu after flooding Xia Pi. Cao Cao executes Lu Bu and the unyielding strategist Chen Gong.',
    outVi: 'Xóa sổ mối đe dọa Lữ Bố, Trương Liêu đầu hàng Tào Tháo trở thành đại tướng.',
    outEn: 'Elimination of Lu Bu; Zhang Liao recruited into Cao Cao ranks.',
    trigger: 'CHOICE_EVENT',
    effects: JSON.stringify({ lu_bu_executed: true, zhang_liao_recruited: true })
  },
  {
    id: 'EVT-199-PLUM-WINE',
    nameVi: 'Thanh Mai Chử Tửu Luận Anh Hùng',
    nameEn: 'Cooking Green Plums & Discussing Heroes',
    year: 199,
    season: 'SUMMER',
    loc: 'LOC-0007',
    pChar: 'NPC-0022',
    sChar: 'NPC-0001',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Lưu Bị giấu mình trồng rau sau vườn Hứa Xương che giấu chí lớn',
    sumVi: 'Tào Tháo mời Lưu Bị uống rượu ngắm mận xanh, luận bàn nhân vật thiên hạ rồi chỉ tay phán: "Anh hùng thiên hạ nay chỉ có sứ quân cùng Thao này thôi!". Lưu Bị giật mình rơi đũa, khéo mượn tiếng sấm che đậy.',
    sumEn: 'Cao Cao declares to Liu Bei over plum wine: "The only heroes under heaven are you and me!" Liu Bei conceals his terror.',
    outVi: 'Lưu Bị tìm cớ đem quân đi đánh Viên Thuật để thoát khỏi miệng cọp Hứa Xương.',
    outEn: 'Liu Bei successfully secures an excuse to escape Cao Cao grasp.',
    trigger: 'DIPLOMACY',
    effects: JSON.stringify({ intelligence_test: 'PASSED', escape_token: true })
  },
  {
    id: 'EVT-200-GUAN-THREE-PROMISES',
    nameVi: 'Quan Vũ Ba Điều Ước Tạm Hàng Tào',
    nameEn: 'Guan Yu Three Conditions for Surrender',
    year: 200,
    season: 'SPRING',
    loc: 'LOC-0009',
    pChar: 'NPC-0003',
    sChar: 'NPC-0040',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Tào Tháo đánh úp Hạ Phì, Lưu Bị chạy sang Viên Thiệu, Trương Phi thất tán',
    sumVi: 'Bị vây trên núi Thổ Sơn, Quan Vũ vì bảo vệ hai phu nhân Lưu Bị nên đồng ý hàng Hán chứ không hàng Tào, hễ biết tin đại ca ở đâu sẽ lập tức ra đi.',
    sumEn: 'Guan Yu surrenders on three honorable conditions to safeguard Liu Bei wives, vowing to leave when his brother is found.',
    outVi: 'Tào Tháo ban tước phong hầu, tặng Xích Thố mong thu phục nhưng không đổi được lòng trung nghĩa.',
    outEn: 'Cao Cao bestows Red Hare upon Guan Yu, unable to shake his devotion.',
    trigger: 'DIPLOMACY',
    effects: JSON.stringify({ guan_yu_captive: true, item_awarded: 'HRS-RED-HARE' })
  },
  {
    id: 'EVT-200-GUANDU-BATTLE',
    nameVi: 'Quan Độ Đại Chiến & Hỏa Thiêu Ô Sào',
    nameEn: 'Battle of Guandu & Raid on Wuchao Granary',
    year: 200,
    season: 'AUTUMN',
    loc: 'LOC-0006',
    pChar: 'NPC-0022',
    sChar: 'NPC-0018',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Mưu sĩ Hứa Du bỏ Viên Thiệu sang đầu Tào hiến kế thiêu kho lương',
    sumVi: 'Tào Tháo thân chinh dẫn 5,000 tinh binh ngậm tăm nửa đêm đột kích đốt sạch toàn bộ kho lương Ô Sào; đại quân Viên Thiệu hoảng loạn tan rã.',
    sumEn: 'Cao Cao leads a midnight raid torching the grain stockpiles at Wuchao, devastating Yuan Shao hundred-thousand army.',
    outVi: 'Chiến thắng lấy ít địch nhiều kinh điển định đoạt quyền bá chủ toàn bộ phương Bắc.',
    outEn: 'Epochal victory securing northern China hegemony for Cao Cao.',
    trigger: 'BATTLE_DUEL',
    effects: JSON.stringify({ decisive_victory: true, northern_control: 95 })
  },
  {
    id: 'EVT-200-FIVE-PASSES',
    nameVi: 'Qua Năm Ải Chém Sáu Tướng',
    nameEn: 'Guan Yu Rides a Thousand Li Across 5 Passes',
    year: 200,
    season: 'SUMMER',
    loc: 'LOC-0002',
    pChar: 'NPC-0003',
    sChar: 'NPC-0022',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Quan Vũ trảm Nhan Lương, tru Văn Xú báo ơn Tào, nhận được thư của Lưu Bị',
    sumVi: 'Quan Vũ treo ấn gác vàng, hộ tống nhị tẩu ngàn dặm tìm anh. Dọc đường qua 5 cửa ải bị ngăn trở, một đao chém sạch 6 tướng cản đường.',
    sumEn: 'Guan Yu resigns his honors, escorting his sisters-in-law a thousand li and slaying six blocking commanders.',
    outVi: 'Lưu Quan Trương hội ngộ tại Cổ Thành, thu nạp thêm Triệu Vân và Châu Thương.',
    outEn: 'Triumphant reunion of the brothers and recruitment of Zhao Yun.',
    trigger: 'BATTLE_DUEL',
    effects: JSON.stringify({ brothers_reunited: true, martial_legend: 200 })
  },
  {
    id: 'EVT-207-THREE-VISITS',
    nameVi: 'Tam Cố Thảo Lư Thỉnh Ngọa Long',
    nameEn: 'Three Visits to the Thatched Cottage',
    year: 207,
    season: 'WINTER',
    loc: 'LOC-0010',
    pChar: 'NPC-0001',
    sChar: 'NPC-0025',
    factions: JSON.stringify(['FACTION-0004']),
    prereq: 'Từ Thứ tiến cử Ngọa Long trước khi bị mẹ ép về Tào',
    sumVi: 'Giữa mùa đông tuyết rơi, Lưu Bị ba lần lặn lội đến gò Ngọa Long bái phỏng; lòng thành kính cảm động Gia Cát Lượng 27 tuổi quyết định hạ sơn.',
    sumEn: 'Liu Bei makes three pilgrimages through winter snows to the thatched cottage, convincing Zhuge Liang to emerge.',
    outVi: 'Lưu Bị có được Khổng Minh như cá gặp nước, xoay chuyển vận mệnh Thục Hán.',
    outEn: 'Zhuge Liang enters the service of Liu Bei; destiny transformed.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ zhuge_recruited: true, faction_intellect: 100 })
  },
  {
    id: 'EVT-207-LONGZHONG-PLAN',
    nameVi: 'Long Trung Đối Sách Phân Ba Thiên Hạ',
    nameEn: 'The Longzhong Stratagem',
    year: 207,
    season: 'WINTER',
    loc: 'LOC-0010',
    pChar: 'NPC-0025',
    sChar: 'NPC-0001',
    factions: JSON.stringify(['FACTION-0004']),
    prereq: 'Gia Cát Lượng trải bản đồ phân tích đại cục thiên hạ cho Lưu Bị',
    sumVi: 'Khổng Minh vạch rõ: Chiếm Kinh Châu, lấy Ích Châu, liên kết Tôn Quyền, chờ thời thế biến chuyển hai đường bắc phạt phục hưng Hán thất.',
    sumEn: 'Zhuge Liang outlines the master plan: seize Jingzhou and Yizhou, ally with Sun Quan, and launch a two-pronged conquest of the north.',
    outVi: 'Trở thành kim chỉ nam chiến lược bất di bất dịch xuyên suốt lịch sử Thục Hán.',
    outEn: 'Foundational grand strategy of the Shu-Han dynasty.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ grand_strategy_unlocked: true, clarity: 100 })
  },
  {
    id: 'EVT-208-CHANG-BAN-PO',
    nameVi: 'Đương Dương Trường Bản Triệu Tử Long Cứu Chúa',
    nameEn: 'Zhao Yun Rescues A Dou at Changbanpo',
    year: 208,
    season: 'AUTUMN',
    loc: 'LOC-0012',
    pChar: 'NPC-0024',
    sChar: 'NPC-0022',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: '5,000 Hổ Báo Kỵ Tào Tháo đuổi kịp dân chúng tị nạn tại Đương Dương',
    sumVi: 'Triệu Vân một ngựa một thương xông pha 7 lần vào đại quân Tào, chém rơi hơn 50 chiến tướng, đoạt Thanh Cương Kiếm, ôm trọn ấu chúa A Đẩu bình an thoát hiểm.',
    sumEn: 'Zhao Yun charges through enemy lines seven times, slaying fifty officers and securing infant A Dou from slaughter.',
    outVi: 'Triệu Tử Long được Tào Tháo khen ngợi là hổ tướng đệ nhất trần gian.',
    outEn: 'Immortalized bravery celebrated throughout Three Kingdoms lore.',
    trigger: 'BATTLE_DUEL',
    effects: JSON.stringify({ a_dou_saved: true, weapon_obtained: 'WPN-HEAVEN-SWORD' })
  },
  {
    id: 'EVT-208-CHANG-BAN-BRIDGE',
    nameVi: 'Trương Phi Đoạn Cầu Hét Lui Tào Binh',
    nameEn: 'Zhang Fei at Changban Bridge',
    year: 208,
    season: 'AUTUMN',
    loc: 'LOC-0012',
    pChar: 'NPC-0002',
    sChar: 'NPC-0022',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Triệu Vân cứu ấu chúa vừa chạy qua cầu Bản Sáp',
    sumVi: 'Trương Dực Đức một mình một ngựa cầm Bát Xà Mâu đứng chắn đầu cầu, hét lớn ba tiếng chấn động trời đất khiến tướng Tào Hạ Hầu Kiệt vỡ mật chết tươi, quân Tào khiếp đảm tháo lui.',
    sumEn: 'Zhang Fei stands alone on the bridge, his fearsome roar terrifying the Cao vanguard and causing a deadly panic.',
    outVi: 'Chặn đứng mũi nhọn truy kích của Tào Tháo, bảo toàn lực lượng cho Lưu Bị.',
    outEn: 'Halts Cao Cao pursuit, allowing Liu Bei retreat to safety.',
    trigger: 'BATTLE_DUEL',
    effects: JSON.stringify({ morale_impact: 100, enemy_retreat: true })
  },
  {
    id: 'EVT-208-TONG-ARROWS',
    nameVi: 'Thuyền Cỏ Mượn Tên Trên Sông Trường Giang',
    nameEn: 'Borrowing Arrows with Thatched Boats',
    year: 208,
    season: 'WINTER',
    loc: 'LOC-0011',
    pChar: 'NPC-0025',
    sChar: 'NPC-0049',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Chu Du giao Khổng Minh trong 3 ngày phải nộp 10 vạn mũi tên',
    sumVi: 'Khổng Minh mượn 20 thuyền cỏ và Lỗ Túc, lợi dụng đêm sương mù dày đặc đánh trống áp sát thủy trại Tào. Tào Tháo bắn hơn 10 vạn mũi tên cắm đầy thuyền cỏ.',
    sumEn: 'Zhuge Liang deceives Cao Cao in thick river fog, collecting 100,000 arrows into thatched bales.',
    outVi: 'Chu Du kinh ngạc thán phục tài thần cơ diệu toán của Khổng Minh.',
    outEn: 'Zhou Yu admits Zhuge Liang supernatural intellect.',
    trigger: 'CHOICE_EVENT',
    effects: JSON.stringify({ arrows_acquired: 100000, zhou_yu_envy: true })
  },
  {
    id: 'EVT-208-CHIBI-INFERNO',
    nameVi: 'Hỏa Thiêu Xích Bích Định Chân Vạc',
    nameEn: 'Battle of Red Cliffs & The Grand Inferno',
    year: 208,
    season: 'WINTER',
    loc: 'LOC-0011',
    pChar: 'NPC-0017',
    sChar: 'NPC-0052',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Hoàng Cái trá hàng châm lửa, Khổng Minh cầu gió đông nam',
    sumVi: 'Gió đông nổi lên, Hoàng Cái dẫn đoàn hỏa thuyền đâm thẳng vào xích chiến hạm của Tào Tháo. Lửa cháy ngút trời thiêu rụi 83 vạn thủy lục đại quân.',
    sumEn: 'East wind rises; Huang Gai fireships ignite Cao Cao chained fleet. The catastrophic inferno shatters northern invasion hopes.',
    outVi: 'Tào Tháo thảm bại trốn chạy, cục diện Tam Quốc chính thức phân định.',
    outEn: 'Decisive destruction of Cao Cao naval power; Three Kingdoms divided.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ fleet_destroyed: true, three_kingdoms_forged: true })
  },
  {
    id: 'EVT-208-HUARONG-PASS',
    nameVi: 'Nghĩa Bạc Vân Thiên Tha Tào Tháo Tại Hoa Dung',
    nameEn: 'Guan Yu Spares Cao Cao at Huarong Pass',
    year: 208,
    season: 'WINTER',
    loc: 'LOC-0012',
    pChar: 'NPC-0003',
    sChar: 'NPC-0022',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Tào Tháo cùng tàn quân chạy vào đường hẻm lầy lội Hoa Dung',
    sumVi: 'Quan Vũ phục binh chặn đường cùng. Tào Tháo nhắc lại ân tình xưa tại Hứa Xương; Quan Vũ nhớ nghĩa tha cho Tào Tháo mở đường thoát thân.',
    sumEn: 'Guan Yu corners a broken Cao Cao at Huarong Pass, but spares him out of ancient honor and debt of gratitude.',
    outVi: 'Khổng Minh biết trước thiên mệnh chưa dứt nên dùng việc này để Quan Vũ đền trọn nghĩa xưa.',
    outEn: 'Guan Yu fulfills his moral debt; Cao Cao survives to reach the north.',
    trigger: 'CHOICE_EVENT',
    effects: JSON.stringify({ cao_cao_spared: true, debt_settled: true })
  },
  {
    id: 'EVT-211-TONG-PASS',
    nameVi: 'Đồng Quan Mã Siêu Báo Thù Cắt Râu Vứt Áo',
    nameEn: 'Battle of Tong Pass & Ma Chao Vengeance',
    year: 211,
    season: 'AUTUMN',
    loc: 'LOC-0005',
    pChar: 'NPC-0029',
    sChar: 'NPC-0022',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Mã Đằng bị Tào Tháo lừa vào kinh mưu sát',
    sumVi: 'Cẩm Mã Siêu dẫn kỵ binh Tây Lương báo thù cha, đánh tan đại quân Tào tại ải Đồng Quan, đuổi sát Tào Tháo khiến Tào Tháo phải cắt râu vứt áo để lẩn trốn.',
    sumEn: 'Ma Chao attacks to avenge his slaughtered father, humiliating Cao Cao who clips his beard to escape pursuit.',
    outVi: 'Giả Hủ hiến kế ly gián Mã Siêu và Hàn Toại, Tào Tháo mới dẹp yên Tây Lương.',
    outEn: 'Cao Cao uses Jia Xu alienation strategy to retake Liangzhou.',
    trigger: 'BATTLE_DUEL',
    effects: JSON.stringify({ ma_chao_fame: 100, cao_cao_humiliated: true })
  },
  {
    id: 'EVT-214-YIZHOU-FALL',
    nameVi: 'Lưu Bị Bình Định Ích Châu Lấy Thành Đô',
    nameEn: 'Liu Bei Conquers Yizhou & Enters Chengdu',
    year: 214,
    season: 'SUMMER',
    loc: 'LOC-0015',
    pChar: 'NPC-0001',
    sChar: 'NPC-0021',
    factions: JSON.stringify(['FACTION-0004']),
    prereq: 'Bàng Thống tử trận tại Lạc Phượng Pha, Khổng Minh dẫn quân vào Xuyên',
    sumVi: 'Mã Siêu quy thuận, quân Thục siết chặt vòng vây Thành Đô; Lưu Chương đầu hàng để tránh đổ máu dân lành. Lưu Bị chính thức làm chủ Ích Châu.',
    sumEn: 'Chengdu capitulates; Liu Zhang surrenders Yizhou to Liu Bei, completing the territorial base of Shu-Han.',
    outVi: 'Lưu Bị có trọn đất Ba Thục trù phú, hoàn thành hai phần ba kế sách Long Trung.',
    outEn: 'Completion of the major territorial step in the Longzhong Stratagem.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ capital_moved: 'LOC-0015', rich_treasury: true })
  },
  {
    id: 'EVT-219-DINGJUNSHAN',
    nameVi: 'Định Quân Sơn Hoàng Trung Trảm Hạ Hầu Uyên',
    nameEn: 'Battle of Mount Dingjun & Fall of Xiahou Yuan',
    year: 219,
    season: 'SPRING',
    loc: 'LOC-0014',
    pChar: 'NPC-0028',
    sChar: 'NPC-0044',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Pháp Chính hiến kế chiếm đỉnh núi quan sát đại doanh quân Ngụy',
    sumVi: 'Từ đỉnh Định Quân Sơn, lão tướng Hoàng Trung nghe hiệu lệnh trống rền phi ngựa chém chết đại đô đốc Hạ Hầu Uyên của Tào Ngụy.',
    sumEn: 'Elder warrior Huang Zhong charges downhill at Mount Dingjun, slaying Cao Cao chief general Xiahou Yuan.',
    outVi: 'Lưu Bị đoạt trọn Hán Trung, chính thức đăng cơ Hán Trung Vương.',
    outEn: 'Liu Bei claims Hanzhong and proclaims himself King of Hanzhong.',
    trigger: 'BATTLE_DUEL',
    effects: JSON.stringify({ king_of_hanzhong: true, xiahou_yuan_slain: true })
  },
  {
    id: 'EVT-219-FANCHENG-MAICHENG',
    nameVi: 'Oai Chấn Hoa Hạ & Mạch Thành Tuyệt Bi',
    nameEn: 'Flooding of Fancheng & Fall of Guan Yu at Maicheng',
    year: 219,
    season: 'WINTER',
    loc: 'LOC-0010',
    pChar: 'NPC-0003',
    sChar: 'NPC-0050',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Quan Vũ dìm ngập 7 đạo quân Vu Cấm, Tôn Quyền ngầm liên minh với Tào Tháo',
    sumVi: 'Lữ Mông mặc áo trắng qua sông đánh úp Kinh Châu; Quan Vũ bị kẹp giữa hai làn đạn, thất thủ Mạch Thành và anh dũng hy sinh cùng con trai Quan Bình.',
    sumEn: 'Lu Meng strikes Jingzhou in white disguised merchant boats. Trapped without supplies, Guan Yu falls in heroic tragedy.',
    outVi: 'Thục Hán mất đi Kinh Châu và danh tướng trụ cột, khối liên minh rạn nứt sâu sắc.',
    outEn: 'Shu loses Jingzhou and its martial god; alliance ruptured.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ guan_yu_dead: true, jingzhou_lost: true })
  },
  {
    id: 'EVT-221-YILING-FIRE',
    nameVi: 'Lục Tốn Hỏa Thiêu Thất Bách Dặm Di Lăng',
    nameEn: 'Battle of Yiling & The 700-Li Inferno',
    year: 221,
    season: 'SUMMER',
    loc: 'LOC-0012',
    pChar: 'NPC-0051',
    sChar: 'NPC-0001',
    factions: JSON.stringify(['FACTION-0001']),
    prereq: 'Lưu Bị xưng đế, dẫn 70 vạn đại quân phạt Ngô báo thù cho Quan Vũ',
    sumVi: 'Nho tướng Lục Tốn kiên nhẫn thủ vững đợi mùa hè oi ả, dùng hỏa công thiêu rụi liên trại 700 dặm của quân Thục. Lưu Bị đại bại chạy về Bạch Đế Thành.',
    sumEn: 'Young scholar Lu Xun burns Liu Bei 700-li line of connected camps at Yiling, shattering the Shu invasion.',
    outVi: 'Quân đội Thục Hán gần như bị hủy diệt hoàn toàn, thế lực Thục suy kiệt nặng nề.',
    outEn: 'Crippling defeat for Shu-Han; Liu Bei retreats to Baidi Castle.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ shu_military_crushed: true, yiling_fire: true })
  },
  {
    id: 'EVT-223-BAIDI-ENTRUST',
    nameVi: 'Lưu Bị Thác Cô Thành Bạch Đế',
    nameEn: 'Liu Bei Entrusts Orphans at Baidi Castle',
    year: 223,
    season: 'SPRING',
    loc: 'LOC-0015',
    pChar: 'NPC-0001',
    sChar: 'NPC-0025',
    factions: JSON.stringify(['FACTION-0004']),
    prereq: 'Lưu Bị lâm bệnh nguy kịch tại thành Bạch Đế',
    sumVi: 'Trước khi trút hơi thở cuối cùng, Lưu Bị nắm tay Khổng Minh dặn dò: "Nếu ấu chúa có tài thì phò tá, nếu bất tài quân sư có thể tự mình làm chủ". Khổng Minh dập đầu chảy máu thề tận trung báo quốc.',
    sumEn: 'On his deathbed, Liu Bei tearfully entrusts the realm and his son to Zhuge Liang, who pledges eternal loyalty.',
    outVi: 'Lưu Bị tạ thế, Hậu Chủ Lưu Thiền kế vị, Khổng Minh nắm toàn quyền nhiếp chính chấn hưng đất nước.',
    outEn: 'Liu Bei dies; Zhuge Liang assumes full premiership and regency.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ liu_bei_dead: true, regent_zhuge: true })
  },
  {
    id: 'EVT-228-CHUSHI-BIAO',
    nameVi: 'Gia Cát Lượng Dâng Xuất Sư Biểu Lục Xuất Kỳ Sơn',
    nameEn: 'Memorial on the Expedition & Northern Campaigns',
    year: 228,
    season: 'SPRING',
    loc: 'LOC-0014',
    pChar: 'NPC-0025',
    sChar: 'NPC-0031',
    factions: JSON.stringify(['FACTION-0004']),
    prereq: 'Khổng Minh dẹp yên Nam Man, chấn hưng kinh tế Thục Hán sẵn sàng bắc phạt',
    sumVi: 'Khổng Minh dâng thiên cổ danh văn "Xuất Sư Biểu", dẫn đại quân tiến ra Kỳ Sơn. Khương Duy đầu hàng quy Thục, trở thành truyền nhân đắc ý.',
    sumEn: 'Zhuge Liang submits the Memorial on the Northern Expedition, marching out of Qishan and discovering protégé Jiang Wei.',
    outVi: 'Mở màn chiến dịch Bắc phạt trường kỳ chấn động Ngụy quốc.',
    outEn: 'Inaugurates the legendary Northern Expeditions against Cao Wei.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ northern_march: true, jiang_wei_recruited: true })
  },
  {
    id: 'EVT-234-WUZHANG-PLAINS',
    nameVi: 'Tinh Lạc Ngũ Trượng Nguyên Bi Hùng',
    nameEn: 'Death of Zhuge Liang at Wuzhang Plains',
    year: 234,
    season: 'AUTUMN',
    loc: 'LOC-0005',
    pChar: 'NPC-0025',
    sChar: 'NPC-0039',
    factions: JSON.stringify(['FACTION-0004']),
    prereq: 'Khổng Minh bắc phạt lần thứ sáu đối đầu Tư Mã Ý tại gò Ngũ Trượng',
    sumVi: 'Tận tụy đến hơi thở cuối cùng vì phục hưng Hán thất, Gia Cát Lượng lâm bệnh mất giữa quân doanh trong gió thu Ngũ Trượng Nguyên. Tượng gỗ Khổng Minh vẫn dọa lùi Tư Mã Ý sống.',
    sumEn: 'Zhuge Liang exhausts his life at Wuzhang Plains opposing Sima Yi. Even in death, his wooden likeness repels the Wei host.',
    outVi: 'Ngôi sao lớn phương Nam vụt tắt, để lại niềm tiếc thương vô hạn ngàn năm cho hậu thế.',
    outEn: 'End of the Zhuge Liang era; Sima Yi secures enduring Wei dominance.',
    trigger: 'STORY_MILESTONE',
    effects: JSON.stringify({ zhuge_dead: true, star_fallen: true })
  }
];

let sqlEvents = 'BEGIN TRANSACTION;\n';
for (const ev of eventsList) {
  sqlEvents += `INSERT OR REPLACE INTO master_events
    (event_id, name_vi, name_en, historical_year, season, location_id, primary_character_id, secondary_character_id, involved_factions, prerequisites, summary_vi, summary_en, historical_outcome_vi, historical_outcome_en, gameplay_trigger_type, gameplay_effects)
    VALUES ('${ev.id}', '${escapeSql(ev.nameVi)}', '${escapeSql(ev.nameEn)}', ${ev.year}, '${ev.season}', '${ev.loc}', '${ev.pChar}', ${ev.sChar ? `'${ev.sChar}'` : 'NULL'}, '${escapeSql(ev.factions)}', '${escapeSql(ev.prereq)}', '${escapeSql(ev.sumVi)}', '${escapeSql(ev.sumEn)}', '${escapeSql(ev.outVi)}', '${escapeSql(ev.outEn)}', '${ev.trigger}', '${escapeSql(ev.effects)}');\n`;
}
sqlEvents += 'COMMIT;';
runOnBoth(sqlEvents);
console.log(` ✅ ${eventsList.length} Master Historical Events cataloged.`);

console.log('\n====================================================');
console.log(' 🟢 MASSIVE ROTK LORE & EVENT INGESTION COMPLETE!');
console.log(` Synchronized across session.db and master.db.`);
console.log('====================================================\n');
