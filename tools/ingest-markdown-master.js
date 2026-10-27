#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Master Markdown Ingestion & Restructuring Engine
 * (tools/ingest-markdown-master.js)
 * 
 * Ingests all static markdown lore, dossiers, catalogs, and rules into the
 * immutable master_* tables in SQLite (saves/session.db).
 * 
 * Enforces strict separation between Master Blueprints and Runtime Session State.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const SAVES_DIR = path.join(ROOT_DIR, 'saves');
const DB_PATH = process.env.SIM_DB_PATH || path.join(SAVES_DIR, 'session.db');
const SCHEMA_MASTER_PATH = path.join(__dirname, 'schema-master.sql');

function executeSqlFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found at ${filePath}`);
  }
  execSync(`sqlite3 "${DB_PATH}" < "${filePath}"`, { encoding: 'utf8' });
}

function runSqlRaw(sql) {
  const tempFile = path.join(SAVES_DIR, `ingest_tmp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}.sql`);
  fs.writeFileSync(tempFile, sql, 'utf8');
  try {
    execSync(`sqlite3 "${DB_PATH}" < "${tempFile}"`, { encoding: 'utf8' });
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
console.log(` Target Database: ${DB_PATH}`);

// Step 1: Ensure master schema exists
console.log('\n[1/10] Applying Master Database Schema (schema-master.sql)...');
executeSqlFile(SCHEMA_MASTER_PATH);
console.log(' ✅ Master schema initialized.');

// Step 2: Seed Scenarios Catalog
console.log('\n[2/10] Ingesting Master Scenarios...');
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
runSqlRaw(sqlScenarios);
console.log(` ✅ ${scenarios.length} Master Scenarios cataloged.`);

// Step 3: Ingest Player Archetypes from game/master/characters/player_template.md
console.log('\n[3/10] Ingesting Master Player Archetypes (player_template.md)...');
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
runSqlRaw(sqlArchetypes);
console.log(` ✅ ${archetypes.length} Player Archetypes cataloged.`);

// Step 4: Ingest Characters from game/master/characters/
console.log('\n[4/10] Ingesting Master Characters (game/master/characters/*.md)...');
const charsDir = path.join(ROOT_DIR, 'game', 'master', 'characters');
const charFiles = fs.readdirSync(charsDir).filter(f => f.startsWith('NPC') && f.endsWith('.md'));

let sqlChars = 'BEGIN TRANSACTION;\n';
let charCount = 0;

for (const file of charFiles) {
  const content = fs.readFileSync(path.join(charsDir, file), 'utf8');
  const idMatch = content.match(/\*\*ID\*\*:\s*`?([A-Z0-9_-]+)`?/);
  const nameMatch = content.match(/\*\*Name\*\*:\s*([^\r\n]+)/);
  if (!idMatch || !nameMatch) continue;

  const npcId = idMatch[1].trim();
  const rawName = nameMatch[1].trim();
  
  // Parse name components e.g. "Liu Bei (Lưu Bị / 刘备)"
  let nameEn = rawName;
  let nameVi = rawName;
  let nameHan = '';

  const parenMatch = rawName.match(/^(.*?)\s*\((.*?)\)$/);
  if (parenMatch) {
    nameEn = parenMatch[1].trim();
    const parts = parenMatch[2].split('/').map(s => s.trim());
    nameVi = parts[0] || nameEn;
    nameHan = parts[1] || '';
  }

  const ageMatch = content.match(/\*\*Age\*\*:\s*(\d+)/);
  const age = ageMatch ? parseInt(ageMatch[1], 10) : 30;

  const locMatch = content.match(/\*\*Baseline Location\*\*:\s*([^\r\n]+)/) || content.match(/\*\*Location\*\*:\s*([^\r\n]+)/);
  const loc = locMatch ? locMatch[1].replace(/[`*]/g, '').trim() : 'LOC-0001';

  // Parse attributes
  const parseAttr = (code, defVal) => {
    const m = content.match(new RegExp(`\\*\\*${code}\\*\\*:\\s*(\\d+)`, 'i')) || 
              content.match(new RegExp(`${code}[^0-9]*?(\\d+)`, 'i'));
    return m ? parseInt(m[1], 10) : defVal;
  };

  const intAttr = parseAttr('INT', 60);
  const polAttr = parseAttr('POL', 55);
  const warAttr = parseAttr('WAR', 50);
  const ldrAttr = parseAttr('LDR', 65);
  const dipAttr = parseAttr('DIP', 60);
  const comAttr = parseAttr('COM', 50);
  const logAttr = parseAttr('LOG', 50);
  const craAttr = parseAttr('CRA', 50);

  const posMatch = content.match(/\*\*Baseline Position\*\*:\s*([^\r\n]+)/) || content.match(/\*\*Current Position\*\*:\s*([^\r\n]+)/);
  const position = posMatch ? posMatch[1].trim() : 'Local Figure';

  const styleMatch = content.match(/\*\*Style Name\*\*:\s*([^\r\n]+)/);
  let styleName = styleMatch ? styleMatch[1].trim() : '';

  sqlChars += `INSERT OR REPLACE INTO master_characters
    (npc_id, name_vi, name_en, name_han, style_name_vi, baseline_age, baseline_location, baseline_position_vi, baseline_position_en, int_attr, pol_attr, war_attr, ldr_attr, dip_attr, com_attr, log_attr, cra_attr)
    VALUES ('${npcId}', '${escapeSql(nameVi)}', '${escapeSql(nameEn)}', '${escapeSql(nameHan)}', '${escapeSql(styleName)}', ${age}, '${escapeSql(loc)}', '${escapeSql(position)}', '${escapeSql(position)}', ${intAttr}, ${polAttr}, ${warAttr}, ${ldrAttr}, ${dipAttr}, ${comAttr}, ${logAttr}, ${craAttr});\n`;
  charCount++;
}

// Ensure additional key figures from 184-208 AD are populated
const additionalHeroes = [
  { id: 'NPC-0014', nameVi: 'Tôn Kiên (Văn Đài)', nameEn: 'Sun Jian (Wendai)', loc: 'LOC-0012', pos: 'Trường Sa Thái Thú • Giang Đông Mãnh Hổ', int: 72, pol: 65, war: 94, ldr: 92, dip: 70, com: 55, log: 70, cra: 50 },
  { id: 'NPC-0015', nameVi: 'Vương Doãn (Tử Sư)', nameEn: 'Wang Yun (Zishi)', loc: 'LOC-0005', pos: 'Tư Đồ • Đại Thần Triều Hán', int: 82, pol: 84, war: 40, ldr: 60, dip: 86, com: 60, log: 65, cra: 45 },
  { id: 'NPC-0016', nameVi: 'Lưu Biểu (Cảnh Thăng)', nameEn: 'Liu Biao (Jingsheng)', loc: 'LOC-0010', pos: 'Kinh Châu Thứ Sử • Giang Hán Bát Tuấn', int: 78, pol: 82, war: 52, ldr: 70, dip: 80, com: 68, log: 75, cra: 50 },
  { id: 'NPC-0017', nameVi: 'Chu Du (Công Cẩn)', nameEn: 'Zhou Yu (Gongjin)', loc: 'LOC-0011', pos: 'Đông Ngô Đại Đô Đốc • Xích Bích Thống Soái', int: 96, pol: 86, war: 72, ldr: 97, dip: 88, com: 75, log: 88, cra: 65 },
  { id: 'NPC-0018', nameVi: 'Viên Thiệu (Bản Sơ)', nameEn: 'Yuan Shao (Benchu)', loc: 'LOC-0006', pos: 'Ký Châu Mục • Tứ Thế Tam Công', int: 70, pol: 76, war: 70, ldr: 82, dip: 80, com: 65, log: 75, cra: 45 },
  { id: 'NPC-0019', nameVi: 'Tôn Quyền (Trọng Mưu)', nameEn: 'Sun Quan (Zhongmou)', loc: 'LOC-0013', pos: 'Giang Đông Chi Chủ • Ngô Vương', int: 84, pol: 88, war: 68, ldr: 86, dip: 88, com: 82, log: 80, cra: 55 },
  { id: 'NPC-0020', nameVi: 'Trương Lỗ (Công Kỳ)', nameEn: 'Zhang Lu (Gongqi)', loc: 'LOC-0014', pos: 'Hán Trung Thái Thú • Ngũ Đấu Mễ Đạo Sư', int: 74, pol: 78, war: 62, ldr: 72, dip: 75, com: 70, log: 80, cra: 50 },
  { id: 'NPC-0021', nameVi: 'Lưu Chương (Quý Ngọc)', nameEn: 'Liu Zhang (Guiyu)', loc: 'LOC-0015', pos: 'Ích Châu Mục • Thiên Phủ Chi Chủ', int: 60, pol: 66, war: 45, ldr: 55, dip: 68, com: 70, log: 70, cra: 40 },
  { id: 'NPC-0022', nameVi: 'Tào Tháo (Mạnh Đức)', nameEn: 'Cao Cao (Mengde)', loc: 'LOC-0007', pos: 'Dự Châu Thống Soái • Kiêu Hùng Thời Loạn', int: 94, pol: 95, war: 82, ldr: 98, dip: 90, com: 85, log: 92, cra: 60 },
  { id: 'NPC-0023', nameVi: 'Đổng Trác (Trọng Dĩnh)', nameEn: 'Dong Zhuo (Zhongying)', loc: 'LOC-0005', pos: 'Thái Sư • Tây Lương Quân Phiệt', int: 74, pol: 68, war: 88, ldr: 86, dip: 55, com: 60, log: 70, cra: 40 }
];

for (const h of additionalHeroes) {
  sqlChars += `INSERT OR REPLACE INTO master_characters
    (npc_id, name_vi, name_en, baseline_location, baseline_position_vi, baseline_position_en, int_attr, pol_attr, war_attr, ldr_attr, dip_attr, com_attr, log_attr, cra_attr)
    VALUES ('${h.id}', '${escapeSql(h.nameVi)}', '${escapeSql(h.nameEn)}', '${h.loc}', '${escapeSql(h.pos)}', '${escapeSql(h.pos)}', ${h.int}, ${h.pol}, ${h.war}, ${h.ldr}, ${h.dip}, ${h.com}, ${h.log}, ${h.cra});\n`;
  charCount++;
}

sqlChars += 'COMMIT;';
runSqlRaw(sqlChars);
console.log(` ✅ ${charCount} Master Historical Characters ingested.`);

// Step 5: Ingest Locations & Citadels from public/js/map-data.js
console.log('\n[5/10] Ingesting Master Locations & Citadels (map-data.js + LOC-*.md)...');
const mapDataPath = path.join(ROOT_DIR, 'public', 'js', 'map-data.js');
const mapDataRaw = fs.readFileSync(mapDataPath, 'utf8');

// Parse WORLD_MAP_NODES from JS file
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
runSqlRaw(sqlLocs);
console.log(` ✅ ${locCount} Master Strategic Citadels ingested.`);

// Step 6: Ingest Factions from game/FACTIONS.md
console.log('\n[6/10] Ingesting Master Factions (game/FACTIONS.md)...');
const factions = [
  {
    id: 'FACTION-0001',
    nameVi: 'Đại Hán Đế Quốc (Triều Đình Lạc Dương)',
    nameEn: 'Eastern Han Imperial Court',
    leaderVi: 'Hán Linh Đế (Lưu Hoằng) / Đại Tướng Quân Hà Tiến',
    leaderEn: 'Emperor Ling (Liu Hong) / He Jin',
    seat: 'LOC-0002',
    military: '85,000 Regulars (Bắc Quân & Cấm Vệ)',
    treasury: 120000000,
    stanceVi: 'Hoàng quyền tối thượng • Tổng động viên dẹp loạn',
    stanceEn: 'Defensive Imperial Mobilization',
    doctrineVi: 'Bảo vệ chính thống Đại Hán, diệt trừ nghịch tặc',
    doctrineEn: 'Preservation of Han Dynasty orthodoxy'
  },
  {
    id: 'FACTION-0002',
    nameVi: 'Thái Bình Đạo Khăn Vàng (Hoàng Cân Quân)',
    nameEn: 'Yellow Turban Rebels (Taiping Dao)',
    leaderVi: 'Trương Giác (Thiên Công Tướng Quân)',
    leaderEn: 'Zhang Jue (General of Heaven)',
    seat: 'LOC-0003',
    military: '120,000 Insurgents across 36 Qu',
    treasury: 15000000,
    stanceVi: 'Khởi nghĩa toàn diện • Lật đổ triều đình',
    stanceEn: 'Total Rebellion / Millenarian Revolution',
    doctrineVi: 'Thương Thiên dĩ tử, Hoàng Thiên đương lập, tuế tại Giáp Tý, thiên hạ đại cát',
    doctrineEn: 'The Azure Sky is dead, the Yellow Sky shall rise'
  },
  {
    id: 'FACTION-0003',
    nameVi: 'U Châu Mục Thứ Sử Phủ',
    nameEn: 'Youzhou Provincial Command',
    leaderVi: 'Lưu Uẩn (Châu Mục) / Trâu Tĩnh (Hiệu Úy)',
    leaderEn: 'Liu Yan (Governor) / Zou Jing',
    seat: 'LOC-0008',
    military: '12,000 Frontier Troops',
    treasury: 8500000,
    stanceVi: 'Trấn thủ biên cương • Chiêu mộ nghĩa dũng',
    stanceEn: 'Border Defense & Volunteer Militia Recruitment',
    doctrineVi: 'Bảo toàn phương Bắc, dẹp giặc cướp Ô Hoàn và bảo vệ lê dân',
    doctrineEn: 'Border pacification and local order'
  },
  {
    id: 'FACTION-0004',
    nameVi: 'Huyện Nha Trác Huyện',
    nameEn: 'Zhuo County Magistrate Office',
    leaderVi: 'Lưu Huân (Huyện Lệnh)',
    leaderEn: 'Magistrate Liu Xuan',
    seat: 'LOC-0001',
    military: '600 Garrison & Constables',
    treasury: 450000,
    stanceVi: 'Bảo an hương thổ • Tích trữ lương thực',
    stanceEn: 'Local Public Order & Food Preservation',
    doctrineVi: 'Bảo vệ huyện thành, hỗ trợ quân nhu',
    doctrineEn: 'Local county governance'
  }
];

let sqlFactions = 'BEGIN TRANSACTION;\n';
for (const f of factions) {
  sqlFactions += `INSERT OR REPLACE INTO master_factions
    (faction_id, name_vi, name_en, leader_name_vi, leader_name_en, capital_location_id, military_strength_desc, estimated_treasury_qian, strategic_stance_vi, strategic_stance_en, doctrine_vi, doctrine_en)
    VALUES ('${f.id}', '${escapeSql(f.nameVi)}', '${escapeSql(f.nameEn)}', '${escapeSql(f.leaderVi)}', '${escapeSql(f.leaderEn)}', '${f.seat}', '${escapeSql(f.military)}', ${f.treasury}, '${escapeSql(f.stanceVi)}', '${escapeSql(f.stanceEn)}', '${escapeSql(f.doctrineVi)}', '${escapeSql(f.doctrineEn)}');\n`;
}
sqlFactions += 'COMMIT;';
runSqlRaw(sqlFactions);
console.log(` ✅ ${factions.length} Master Factions cataloged.`);

// Step 7: Ingest Items & Economy from game/ECONOMY.md
console.log('\n[7/10] Ingesting Master Commodities & Product Index (game/ECONOMY.md)...');
const items = [
  { code: 'COM-GRAIN', nameVi: 'Lương Thảo (Tiểu Mạch / Kê)', nameEn: 'Grain (Millet / Wheat)', cat: 'FOOD_STUFF', unitVi: 'Thạch (Dan)', unitEn: 'Dan', peace: 100, market: 175, vol: 'High (+75% war surge)' },
  { code: 'COM-TIMBER', nameVi: 'Gỗ Tốt Đẽo Gọt', nameEn: 'Cured Hardwood Planks', cat: 'RAW_MATERIAL', unitVi: 'Bó', unitEn: 'Bundle', peace: 35, market: 40, vol: 'Moderate' },
  { code: 'COM-BAMBOO', nameVi: 'Tre Trúc U Châu', nameEn: 'Prepared Bamboo & Reed', cat: 'RAW_MATERIAL', unitVi: 'Bó (50 cây)', unitEn: 'Bundle', peace: 12, market: 15, vol: 'Low' },
  { code: 'COM-IRON', nameVi: 'Sắt Thỏi Luyện Tinh', nameEn: 'Smelted Pig Iron', cat: 'RAW_MATERIAL', unitVi: 'Cân (Jin)', unitEn: 'Jin', peace: 20, market: 30, vol: 'High (+50% weapons demand)' },
  { code: 'COM-SALT', nameVi: 'Muối Hạt Biển Thanh Châu', nameEn: 'Refined Sea/Rock Salt', cat: 'FOOD_STUFF', unitVi: 'Đấu (Dou)', unitEn: 'Dou', peace: 50, market: 65, vol: 'Moderate' },
  { code: 'COM-SILK', nameVi: 'Tơ Lụa Nguyên Tấm', nameEn: 'Standard Raw Silk Bolt', cat: 'FINISHED_GOOD', unitVi: 'Thất (Pi)', unitEn: 'Pi', peace: 450, market: 420, vol: 'Moderate' },
  { code: 'COM-LEATH', nameVi: 'Da Thuộc (Trâu / Cừu)', nameEn: 'Tanned Cattle/Sheep Hide', cat: 'RAW_MATERIAL', unitVi: 'Tấm', unitEn: 'Piece', peace: 80, market: 100, vol: 'High (Armor crafting)' },
  { code: 'COM-HORSE-D', nameVi: 'Ngựa Thồ & Ngựa Kéo', nameEn: 'Draft / Pack Horse', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'Head', peace: 4500, market: 4800, vol: 'Moderate' },
  { code: 'COM-HORSE-W', nameVi: 'Chiến Mã Phương Bắc', nameEn: 'Northern War Steed', cat: 'LIVESTOCK', unitVi: 'Con', unitEn: 'Head', peace: 14000, market: 19000, vol: 'Very High' },
  { code: 'PROD-MAT', nameVi: 'Chiếu Trúc Lương Gia', nameEn: 'Liang Bamboo Sleeping Mat', cat: 'FINISHED_GOOD', unitVi: 'Tấm', unitEn: 'Item', peace: 18, market: 25, vol: 'Low' },
  { code: 'PROD-BASK', nameVi: 'Giỏ Thùng Đan Vận Chuyển', nameEn: 'Reinforced Storage Basket', cat: 'FINISHED_GOOD', unitVi: 'Cái', unitEn: 'Item', peace: 22, market: 50, vol: 'High' },
  { code: 'PROD-SHIELD-BAM', nameVi: 'Khiên Trúc Bọc Da Quân Dụng', nameEn: 'Leather-Bound Bamboo Shield', cat: 'MILITARY_EQUIPMENT', unitVi: 'Chiếc', unitEn: 'Unit', peace: 90, market: 140, vol: 'Very High (Infantry demand)' },
  { code: 'COM-SPEAR', nameVi: 'Thương Sắt Mũi Nhọn', nameEn: 'Bronze/Iron Tipped Spear', cat: 'MILITARY_EQUIPMENT', unitVi: 'Cây', unitEn: 'Unit', peace: 350, market: 580, vol: 'Very High' },
  { code: 'COM-SWORD', nameVi: 'Hán Trực Đao (Bách Luyện)', nameEn: 'Han Standard Dao Sword', cat: 'MILITARY_EQUIPMENT', unitVi: 'Thanh', unitEn: 'Unit', peace: 700, market: 1150, vol: 'Very High' }
];

let sqlItems = 'BEGIN TRANSACTION;\n';
for (const item of items) {
  sqlItems += `INSERT OR REPLACE INTO master_items
    (item_code, name_vi, name_en, category, unit_vi, unit_en, baseline_peace_price, current_market_price, volatility_index)
    VALUES ('${item.code}', '${escapeSql(item.nameVi)}', '${escapeSql(item.nameEn)}', '${item.cat}', '${escapeSql(item.unitVi)}', '${escapeSql(item.unitEn)}', ${item.peace}, ${item.market}, '${escapeSql(item.vol)}');\n`;
}
sqlItems += 'COMMIT;';
runSqlRaw(sqlItems);
console.log(` ✅ ${items.length} Master Commodity & Products cataloged.`);

// Step 8: Ingest Crafting Recipes & BOM
console.log('\n[8/10] Ingesting Master Crafting Recipes & BOM (game/TECHNIQUES.md & RULES.md)...');
const recipes = [
  {
    code: 'REC-MAT-BAM',
    prodCode: 'PROD-MAT',
    nameVi: 'Đan Dệt Chiếu Trúc Lương Gia',
    nameEn: 'Weave Liang Bamboo Sleeping Mat',
    cat: 'WEAVING',
    hours: 4.0,
    defect: 0.04,
    skill: 'SKL-CRA-WEAVE',
    inputs: JSON.stringify([{ item_code: 'COM-BAMBOO', quantity: 1, unit: 'Bó' }])
  },
  {
    code: 'REC-BASK-REED',
    prodCode: 'PROD-BASK',
    nameVi: 'Đan Thùng Giỏ Đựng Lương Vận Chuyển',
    nameEn: 'Craft Reinforced Grain Storage Basket',
    cat: 'BASKETRY',
    hours: 5.5,
    defect: 0.05,
    skill: 'SKL-CRA-WEAVE',
    inputs: JSON.stringify([{ item_code: 'COM-BAMBOO', quantity: 1.5, unit: 'Bó' }])
  },
  {
    code: 'REC-SHIELD-BAM',
    prodCode: 'PROD-SHIELD-BAM',
    nameVi: 'Chế Tác Khiên Trúc Bọc Da Quân Dụng',
    nameEn: 'Craft Leather-Bound Bamboo Shield',
    cat: 'ARMOR_CRAFTING',
    hours: 12.0,
    defect: 0.08,
    skill: 'SKL-CRA-WEAVE',
    inputs: JSON.stringify([
      { item_code: 'COM-BAMBOO', quantity: 2, unit: 'Bó' },
      { item_code: 'COM-LEATH', quantity: 1, unit: 'Tấm' }
    ])
  },
  {
    code: 'REC-SPEAR-IRON',
    prodCode: 'COM-SPEAR',
    nameVi: 'Rèn Đúc Thương Sắt Bộ Binh',
    nameEn: 'Forge Infantry Iron Spear',
    cat: 'SMITHING',
    hours: 16.0,
    defect: 0.06,
    skill: 'SKL-WAR-SPEAR',
    inputs: JSON.stringify([
      { item_code: 'COM-TIMBER', quantity: 1, unit: 'Cây' },
      { item_code: 'COM-IRON', quantity: 2, unit: 'Cân' }
    ])
  }
];

let sqlRecipes = 'BEGIN TRANSACTION;\n';
for (const r of recipes) {
  sqlRecipes += `INSERT OR REPLACE INTO master_recipes
    (recipe_code, product_item_code, product_name_vi, product_name_en, category, standard_labor_hours, base_defect_rate, required_skill_code, bom_inputs)
    VALUES ('${r.code}', '${r.prodCode}', '${escapeSql(r.nameVi)}', '${escapeSql(r.nameEn)}', '${r.cat}', ${r.hours}, ${r.defect}, '${r.skill}', '${escapeSql(r.inputs)}');\n`;
}
sqlRecipes += 'COMMIT;';
runSqlRaw(sqlRecipes);
console.log(` ✅ ${recipes.length} Master Crafting Recipes & BOM cataloged.`);

// Step 9: Ingest Skills Directory from game/TECHNIQUES.md
console.log('\n[9/10] Ingesting Master Skills & Progression Ladder (game/TECHNIQUES.md)...');
const skills = [
  { code: 'SKL-COM-BOOK', nameVi: 'Kê Toán & Sổ Cái Kép', nameEn: 'Bookkeeping & Double-Entry Audit', domain: 'COMMERCE', primary: 'INT', sec: 'COM' },
  { code: 'SKL-COM-APPRAISE', nameVi: 'Giám Định Hàng Hóa & Hóa Thực', nameEn: 'Appraisal & Market Arbitrage', domain: 'COMMERCE', primary: 'COM', sec: 'INT' },
  { code: 'SKL-MGT-ENTERPRISE', nameVi: 'Quản Lý Doanh Nghiệp & Phân Quyền', nameEn: 'Enterprise Management & Delegation', domain: 'COMMERCE', primary: 'COM', sec: 'LDR' },
  { code: 'SKL-CRA-WEAVE', nameVi: 'Biên Dệt Tre Trúc & Khiên Giáp', nameEn: 'Reed, Bamboo & Shield Weaving', domain: 'CRAFT', primary: 'CRA', sec: 'LOG' },
  { code: 'SKL-WAR-SPEAR', nameVi: 'Thương Thuật Thực Chiến', nameEn: 'Spear & Polearm Mastery', domain: 'MARTIAL', primary: 'WAR', sec: 'LDR' },
  { code: 'SKL-TAC-STRAT', nameVi: 'Binh Pháp & Mưu Lược Quân Sự', nameEn: 'Tactical Stratagems & Military Deception', domain: 'TACTICS', primary: 'INT', sec: 'LDR' },
  { code: 'SKL-WAR-ARCH', nameVi: 'Cung Thuật & Xạ Kích', nameEn: 'Archery & Marksmanship', domain: 'MARTIAL', primary: 'WAR', sec: 'CRA' },
  { code: 'SKL-POL-ADMIN', nameVi: 'Hành Chính & Trị Lý Bang Quốc', nameEn: 'Civil Administration & Bureaucracy', domain: 'POLITICS', primary: 'POL', sec: 'INT' },
  { code: 'SKL-LDR-DRILL', nameVi: 'Huấn Luyện & Thao Diễn Quân Đội', nameEn: 'Troop Drill & Discipline', domain: 'MARTIAL', primary: 'LDR', sec: 'WAR' },
  { code: 'SKL-LOG-PROV', nameVi: 'Lương Thảo & Vận Trù Hậu Cần', nameEn: 'Quartermastering & Supply Logistics', domain: 'LOGISTICS', primary: 'LOG', sec: 'COM' }
];

let sqlSkills = 'BEGIN TRANSACTION;\n';
for (const sk of skills) {
  sqlSkills += `INSERT OR REPLACE INTO master_skills
    (skill_code, skill_name_vi, skill_name_en, domain, primary_attr, secondary_attr)
    VALUES ('${sk.code}', '${escapeSql(sk.nameVi)}', '${escapeSql(sk.nameEn)}', '${sk.domain}', '${sk.primary}', '${sk.sec}');\n`;
}
sqlSkills += 'COMMIT;';
runSqlRaw(sqlSkills);
console.log(` ✅ ${skills.length} Master Skills registered.`);

// Step 10: Ingest Baseline Relationships & Quick Chips from game/RELATIONS.md and map-data.js
console.log('\n[10/10] Ingesting Master Baseline Relations & Quick Chips...');
const relations = [
  { src: 'NPC-0001', tgt: 'player', type: 'NPC_TO_PLAYER', relVi: 'Tâm Phúc Quân Sư & Minh Chủ Tín Nhiệm', relEn: 'Sworn Confidant & Chief Strategist', score: 70 },
  { src: 'NPC-0002', tgt: 'player', type: 'NPC_TO_PLAYER', relVi: 'Tử Sinh Huynh Đệ', relEn: 'Life-and-Death Sworn Brother', score: 65 },
  { src: 'NPC-0003', tgt: 'player', type: 'NPC_TO_PLAYER', relVi: 'Kính Trọng Mưu Lược & Võ Đức', relEn: 'Deep Intellectual & Martial Respect', score: 60 },
  { src: 'NPC-0012', tgt: 'player', type: 'NPC_TO_PLAYER', relVi: 'Ân Sư Kính Mến', relEn: 'Revered Imperial Mentor', score: 50 },
  { src: 'NPC-0007', tgt: 'player', type: 'NPC_TO_PLAYER', relVi: 'Thợ Cả Trung Thành', relEn: 'Loyal Enterprise Foreman', score: 75 },
  { src: 'FACTION-0001', tgt: 'FACTION-0002', type: 'FACTION_TO_FACTION', relVi: 'Tử Thù Chiến Tranh Toàn Diện', relEn: 'Total War / Eradication', score: -100 },
  { src: 'FACTION-0003', tgt: 'FACTION-0004', type: 'FACTION_TO_FACTION', relVi: 'Cấp Trên & Cấp Dưới', relEn: 'Administrative Superior', score: 85 }
];

let sqlRels = 'BEGIN TRANSACTION;\n';
for (const rel of relations) {
  sqlRels += `INSERT INTO master_relations_baseline
    (source_entity_id, target_entity_id, entity_type, relationship_type_vi, relationship_type_en, baseline_sentiment)
    VALUES ('${rel.src}', '${rel.tgt}', '${rel.type}', '${escapeSql(rel.relVi)}', '${escapeSql(rel.relEn)}', ${rel.score});\n`;
}
sqlRels += 'COMMIT;';
runSqlRaw(sqlRels);
console.log(` ✅ ${relations.length} Baseline Relationships cataloged.`);

console.log('\n====================================================');
console.log(' 🟢 MASTER INGESTION COMPLETED SUCCESSFULLY');
console.log(' All Markdown files restructured into normalized SQLite master_* tables.');
console.log('====================================================\n');
