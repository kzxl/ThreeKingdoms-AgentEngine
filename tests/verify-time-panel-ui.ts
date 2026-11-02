/**
 * Time panel UI: the campaign clock must show fatigue vs stamina separately,
 * phase/season, days-to-close, a readable action-budget grid and a real clock.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(ROOT, 'public/js/turn-advance.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'public/styles.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');

assert(html.includes('time-panel-modal'), 'time panel must keep its modal id');
assert(js.includes('time-kpi-grid'), 'time panel must render the KPI grid');
assert(js.includes("'Mệt mỏi'") && js.includes("'Thể lực còn'"), 'fatigue and remaining stamina must be separate');
assert(js.includes('time-clock-row'), 'real-world clock must have its own row');
assert(js.includes('time-cost-grid'), 'action costs must use the compact grid');
assert(js.includes('time-section-title'), 'sections must have clear titles');
assert(js.includes('clock.phaseLabel'), 'phase label must be surfaced');
assert(js.includes('daysLeft'), 'days until month close must be surfaced');
assert(js.includes("'TRADE_BUY'") && js.includes("'START_TASK'"), 'action budget must cover canonical action types');
assert(!js.includes('time-compare-grid'), 'old cramped two-column comparison must be gone');

assert(css.includes('.modal-card.time-panel-card'), 'time panel must override the shared modal width');
assert(css.includes('min(980px, 96vw)'), 'time panel must use the wide surface');
assert(css.includes('.time-cost-grid'), 'action cost grid styles must exist');
assert(css.includes('.time-kpi-grid'), 'KPI grid styles must exist');
assert(css.includes('.time-actions'), 'footer actions must be sticky');

console.log('  ✅ PASSED: time panel is wide, labelled clearly and uses the compact budget grid.');
