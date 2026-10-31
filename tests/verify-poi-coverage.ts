/**
 * POI scene coverage: the five Zhuo County POIs and the five grand citadels
 * must reach a bespoke generator instead of the generic fallback.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const engine = fs.readFileSync(
  path.join(ROOT, 'src', 'modules', 'contextual-actions', 'context-action.engine.ts'),
  'utf8'
);
const web = fs.readFileSync(path.join(ROOT, 'tools', 'sim-web.js'), 'utf8');

const engineCases = [
  'Tư Trạch Vườn Đào',
  'Thiết Điếm Trác Huyện',
  'Tửu Quán Trác Huyện',
  'Mã Xa Dịch Trạm',
  'Lôi Đài Giáo Trường',
  'Uyển Thành Nha Môn',
  'Hoài Nam Ngụy Đế Cung',
  'Thượng Đảng Trọng Trấn',
  'Tây Lương Tướng Phủ',
  'Giao Châu Thái Thú Phủ'
];
for (const label of engineCases) {
  assert(engine.includes(`case '${label}'`), `ContextActionEngine must handle ${label}`);
}

const webMappings = ['uyển thành', 'hoài nam', 'thượng đảng', 'tây lương', 'giao châu'];
for (const keyword of webMappings) {
  assert(web.includes(`subLower.includes('${keyword}')`), `scene normalizer must map ${keyword}`);
}

// The five Zhuo POIs must not fall through to the universal generic branch.
const switchBlock = engine.slice(engine.indexOf('switch (subLocation)'), engine.indexOf('default:'));
for (const label of engineCases.slice(0, 5)) {
  assert(switchBlock.includes(`case '${label}'`), `${label} must be inside the scene switch`);
}

// Unknown POIs keep their own name instead of being relabelled as Vườn Đào.
assert(!web.includes("let currentLocKey = 'Vườn Đào';"), 'unknown POIs must not default to Vườn Đào');
assert(web.includes("currentLocKey = (subLocation || '').trim()"), 'unknown POIs must keep their own name');

console.log('✅ POI coverage: 5 Zhuo POIs, 5 citadels and unknown-POI fallback verified.');
