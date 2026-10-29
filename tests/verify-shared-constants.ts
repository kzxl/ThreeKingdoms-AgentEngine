/**
 * Shared-constants drift guard.
 *
 * config/game-constants.json is the single source for unit labels and calendar
 * numbers. The TS surface (src/shared/constants.ts), the CommonJS engine and the
 * classic client copy must all agree; this suite fails as soon as one drifts.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { GAME_CONSTANTS, CURRENCY, GRAIN_UNIT, CALENDAR, FATIGUE_MAX } from '../src/shared/constants';

const { DAYS_PER_MONTH, GRAIN_PER_DAY, DAILY_FATIGUE_RECOVERY } = require('../engine/time-manager');
const { addDaysToDate, advanceCalendarMonth, parseGameDate } = require('../engine/date-utils');

const ROOT = path.resolve(__dirname, '..');
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'game-constants.json'), 'utf8'));
const clientConfig = fs.readFileSync(path.join(ROOT, 'public', 'js', 'config.js'), 'utf8');

function run(): void {
  console.log('=== Shared constants drift guard ===');

  // 1. One JSON source, one typed surface.
  assert.deepStrictEqual(GAME_CONSTANTS, raw, 'src/shared/constants.ts must re-export the JSON unchanged');
  assert.deepStrictEqual(CURRENCY, { vi: 'Quan', en: 'quan' }, 'currency unit must be Quan/quan');
  assert.deepStrictEqual(GRAIN_UNIT, { vi: 'Thạch', en: 'piculs' }, 'grain unit must be Thạch/piculs');
  assert.strictEqual(FATIGUE_MAX, 100, 'fatigue max must be 100');

  // 2. Engine numbers come from the same file.
  assert.strictEqual(DAYS_PER_MONTH, raw.calendar.daysPerMonth, 'engine daysPerMonth drifted');
  assert.strictEqual(GRAIN_PER_DAY, raw.calendar.grainPerDay, 'engine grainPerDay drifted');
  assert.strictEqual(DAILY_FATIGUE_RECOVERY, raw.calendar.dailyFatigueRecovery, 'engine recovery drifted');

  // 3. Calendar helpers keep 30-day months and roll the year.
  assert.strictEqual(addDaysToDate('184-05-30', 1), '184-06-01', 'day 30 must roll to the next month');
  assert.strictEqual(advanceCalendarMonth('184-12-15', 1), '185-01-01', 'December must roll into the next year');
  assert.deepStrictEqual(parseGameDate('bad-date'), parseGameDate(raw.calendar.fallbackDate), 'invalid dates must use the shared fallback');

  // 4. Classic client copy (cannot import JSON before the module bundle).
  assert(
    clientConfig.includes(`const CURRENCY_UNIT = { vi: '${raw.currency.vi}', en: '${raw.currency.en}' };`),
    'public/js/config.js CURRENCY_UNIT drifted from config/game-constants.json'
  );
  assert(
    clientConfig.includes(`const GRAIN_UNIT = { vi: '${raw.grain.vi}', en: '${raw.grain.en}' };`),
    'public/js/config.js GRAIN_UNIT drifted from config/game-constants.json'
  );

  console.log('   ✅ shared constants: JSON, TS, engine and client agree');
}

run();
