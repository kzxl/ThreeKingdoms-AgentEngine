# Shared Constants

Date: 2026-10-29. Goal: every cross-cutting definition (currency unit, grain unit, calendar,
fatigue cap) lives in **one data file**, not scattered literals.

## 1. Single source

`config/game-constants.json`:

```json
{
  "currency": { "vi": "Quan", "en": "quan" },
  "grain": { "vi": "Thạch", "en": "piculs" },
  "calendar": {
    "daysPerMonth": 30,
    "monthsPerYear": 12,
    "grainPerDay": 0.02,
    "dailyFatigueRecovery": 1,
    "fallbackDate": "184-05-02"
  },
  "fatigue": { "max": 100 }
}
```

Three runtimes read the same file:

| Runtime | How | Files |
|---|---|---|
| TypeScript (`src/`) | `import` JSON, typed re-export | `src/shared/constants.ts` |
| Engine CommonJS (`engine/`) | `require('../config/game-constants.json')` | `engine/time-manager.js`, `engine/date-utils.js` |
| Classic client (`public/js/`) | literal copy (cannot import JSON before the bundle) | `public/js/config.js` |

The client copy is **drift-tested** by `tests/verify-shared-constants.ts`: changing the JSON
without the client (or vice versa) fails `npm run verify`.

## 2. Current consumers

- `engine/time-manager.js`: `DAYS_PER_MONTH`, `GRAIN_PER_DAY`, `DAILY_FATIGUE_RECOVERY`,
  `FATIGUE_MAX`, `FALLBACK_DATE`.
- `engine/date-utils.js`: 30-day months, 12 months/year, fallback date, day clamping.
- `src/shared/game-clock.ts`: default fallback date.
- `public/js/config.js`: `CURRENCY_UNIT`, `GRAIN_UNIT`, `formatMoney()`, `formatGrain()`; the
  header uses the helpers (`6.586 Quan` / `9,60 Thạch` in VI, `6,586 quan` / `9.60 piculs` in EN).

## 3. Adding a constant

1. Add it to `config/game-constants.json` under a topic (`currency`, `calendar`, `combat`, …).
2. TS: re-export it from `src/shared/constants.ts` and use it.
3. Engine: read `GAME_CONSTANTS.<topic>.<key>`.
4. Classic client: add the literal in `public/js/config.js`, then an assertion in
   `tests/verify-shared-constants.ts`.
5. Run `npm run verify`.

Do **not** move feature-owned tables here: `engine/action-policy.js` (action costs),
`CANONICAL_LABOR_SHIFTS` (labor shifts), `GUARD_TIER_CONFIGS` (caravan guards),
`SETTLEMENT_PROFILES` (regional market). They each have a single owner but belong to their domain,
not to global constants.

## 4. Why not `.env`

These are game-design constants that must match between client and server, not deployment
configuration. A JSON file in the repo makes diffs reviewable, supports the drift test and does
not depend on the environment.
