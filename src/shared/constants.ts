/**
 * ThreeKingdoms-AgentEngine: Shared Game Constants (TS surface)
 * (src/shared/constants.ts)
 *
 * Single source of truth: config/game-constants.json.
 * The CommonJS engine reads the same JSON directly
 * (`require('../config/game-constants.json')`) and the classic client keeps a
 * literal copy in public/js/config.js that tests/verify-shared-constants.ts
 * checks for drift.
 */

import gameConstants from '../../config/game-constants.json';

export const GAME_CONSTANTS = gameConstants;
export const CURRENCY = gameConstants.currency;
export const GRAIN_UNIT = gameConstants.grain;
export const CALENDAR = gameConstants.calendar;
export const FATIGUE_MAX = gameConstants.fatigue.max;
