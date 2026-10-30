# Refactor Review

Date: 2026-10-29. Scope: the whole `E:\15. Other\Simulation` repo after waves 1–3 of
`docs/LOGIC_DUPLICATION_AUDIT_2026-10-29.md` and waves 1–1.5 of the refactor plan.
Every number below was measured at the working HEAD, not copied from older docs.

## 0. Executive summary

The **"overlapping ownership"** class of bugs — the one that produced empty modals, wrong dates
and double payouts — is closed. Of the audit's 16 findings: **14 fixed (2 with small caveats),
1 partial (#8 ledger), 1 open (#10 map)**. The open item is cleanup, not data corruption.

The remaining risk has shifted from **correctness** to **game design** (no losing state, the world
does not run itself) and **structural debt** (4 god services, a 3.3k-line gateway, ~16k lines of
legacy JS).

| Axis | Score (subjective) | Note |
|---|---|---|
| Correctness / ownership | 9/10 | One writer for the date, caravans, business month, world turn, balance, modal ids, hub |
| Data integrity | 9/10 | Ledger matches `liquid + safe`; chronicle 15 rows / 14 texts; 1,358 invariants green |
| Architecture / maintainability | 7.5/10 | God services and gateway still large; legacy client not migrated; cashflow writers unified |
| Tests & observability | 9/10 | 26 suites, 28 contracts, 8 write smokes, 10 arch rules + UI + API + route ratchets |
| Game design | 4/10 | Cannot lose; world frozen unless the player clicks; NPC economy not conserved |
| UI/UX | 6.5/10 | Dev telemetry, dual clocks and duplicate chronicle gone; typography and right panel still heavy |

## 1. Current measurements

**Gates**

- `npm run verify`: 26/26 suites (4 legacy + 22 `verify-*.ts`), 28/28 contracts, 8/8 write smokes.
- `npm run audit`: **1,358 invariants, 0 discrepancies**; `GET /api/audit` reports the same.
- `tsc --noEmit`: 0 errors.

**Architecture ratchet** (`tools/arch-guard.js`, 10 rules)

| Rule | Current / budget |
|---|---|
| `sql-interpolation` | 83 / 85 (down 2) |
| `silent-catch` | 26 / 29 (down 3) |
| `cashflow-direct-insert` | **18 / 18** (new; 5 writers moved to `postCashflowEntry`) |
| `legacy-ui-script-count` | **21 / 21** (7-tab hub deleted) |
| `math-random-in-domain`, `wallclock-id-in-domain`, `child-process-in-src`, `unquoted-current-date`, `sqlite-cli-spawn` | 0 / 0 |
| `global-service-locator` | 4 / 4 |

**UI ratchet** (`tools/ui-consistency-report.js`)

- 42 legacy button classes defined (budget full), **89**/92 usages, 0 in TS client.
- **790** inline styles (budget 790), **8** native `confirm`, **289** shared-primitive usages.
- 170 `font-size` declarations at 10.5px or below in `public/styles.css` (regex count, includes
  media-query duplicates) — still the main readability issue.

**API & routes**

- 31 client paths vs 186 routes; 9 reasoned gaps in `tools/client-api-allowlist.json`.
- 142 router handlers, **47 live legacy handlers**, 0 shadowed/dead.

**Performance** (`npm run perf:compare`)

- p95 improved on **9/11** endpoints (−2% to −41%); worst is +29% on `/api/garrisons` (under the
  tolerance).
- 3 fingerprint "DRIFT" flags: `/api/audit` is **expected** (2 new invariants); `/api/market` and
  `/api/master/catalog` are a **stale baseline** (recorded 13:41, before the previous session's
  last edits). Both returned identical bodies across two calls, so they are deterministic. Re-record
  the baseline after accepting the current state.

**Live data** (`saves/session.db`)

- `current_date 185-01-03`, `active_turn 14`, latest `turn_log` turn 14.
- `chat_chronicle`: 15 rows / 14 texts (before migration 006: 39 / 14).
- Final `cashflow_ledger` balance **9,586** = liquid 6,586 + safe 3,000 (new definition holds).
- `businesses.safe_cash` totals 4,442 — separate from player capital by design.
- Caravans: 3 faction `ARRIVED` (not claimable), 9 player `ARRIVED` (claimable), 6
  `SUCCESS_TRADED` already settled to a faction (terminal).

**Code size**

| Area | Lines |
|---|---|
| `src/` (TypeScript) | 33,233 |
| `engine/` (CommonJS) | 4,211 |
| `public/js/` (legacy, 21 scripts) | 16,598 |
| Total | 54,042 |

Remaining god services: `context-action.engine.ts` 1,970, `blacksmith-forge.service.ts` 1,486,
`enterprise-labor.service.ts` 1,290, `single-combat-duel.service.ts` 1,356, `tools/sim-web.js` 3,344.

## 2. The audit's 16 findings — status at HEAD

| # | Finding | Status | Evidence |
|---|---|---|---|
| 1 | Empty POI modals | ✅ | The bundle no longer contains the POI manager; the shell refuses legacy ids; `ensure*ModalDom` rebuilds its body (DOM repro: 2,215 / 2,742 / 1,485 chars) |
| 2 | Fractional days + double grain | ✅ | `completeMarch` advances the clock and charges grain once; E2E 1.4 days → +2 days, grain 9.56 → 7.56 |
| 3 | Missing `WORLD_DAY_TICK` | ✅ | `time-manager` is the only writer of `current_date`, one tick/day; `advanceDays` uses the same helper |
| 4 | Caravan two state machines | ✅ | One `advanceByDays`; claim only for `ARRIVED` + `dispatched_by_player = 1`; E2E claim 105 Quan once |
| 5 | Three business formulas | ✅ | Shared `BIZ_CYCLE_<biz>_<YYYYMM>` key; the workshop no longer writes `player_state.safe_cash` |
| 6 | World sim outside a transaction | ✅ (different mechanism) | `world_turn_ledger` is written after each module transaction; a module failure blocks the month close, retry is safe |
| 7 | Double stamina deduction | ✅ | `KIZUNA_INTERACT`, `WORK_SHIFT`, `PRODUCTION_BATCH` are 0 fatigue in the policy |
| 8 | Many ledger balance definitions | ✅ | Every cashflow write goes through `postCashflowEntry`/`postCashflowEntryRaw`; `cashflow-direct-insert` is 0. Migration 009 rewrites 124 historical journal codes to the numeric chart; new postings use `ACCOUNT_CODES` |
| 9 | Hub/Journal global collision | ✅ | The 4-tab journal owns the modal; the 7-tab hub file was deleted |
| 10 | Map has 4 data sources | ❌ Open | `map-data.js`, `spatial-registry.ts`, `map-live.service.ts` and the DB still coexist |
| 11 | Client mirrors the cost table | ✅ | `getActionDayCost` prefers the `policy` from `/api/time/clock`; the local table is an offline fallback |
| 12 | Hardcoded `game_date` payloads | ✅ | Removed from 4 client payloads; `/api/trade` ignores the client date; `npc_relationship_deltas` uses the campaign date |
| 13 | Two trade modals | ✅ | `openQuickTrade` delegates to the TS `QuickTradeModal` (payload fixed to the SimCore contract); legacy markup is an offline fallback only |
| 14 | Dead event wiring | ✅ | `TURN_ADVANCED` is published after commit; `AUTUMN_HARVEST_CYCLE` and `LOD1_WEEKLY_TICK` were removed |
| 15 | Multiple date helpers | ✅ | `engine/time-manager.js` delegates to `engine/date-utils.js`; `game-clock.ts` only reads the DB |
| 16 | Duplicate wages/prices | ✅ | Duplicate shift tables merged into `CANONICAL_LABOR_SHIFTS`; `JOB_FORGE_HAND` 75 is a **hire cost**, `SHIFT_FORGE_HAND` 140 is **player income**. Market prices come only from `master_items` (1.6.6); the engine, workshop, contextual actions and `/api/trade` all read it |

## 3. Architecture assessment

**Achieved:** "one writer per concept" is now enforceable:

- Clock: `engine/time-manager.js` (`advanceCampaignDays`) is the only writer of `current_date` and
  the publisher of `WORLD_DAY_TICK`.
- Caravans: `CaravanLogisticsService.advanceByDays` (line 341) is the only progression; faction
  settlement in `settleFactionCaravanOnArrival` (496); claim in `claimCaravan` (520).
- Business month: `BIZ_CYCLE_<id>_<YYYYMM>` shared by `advanceTurn` and the workshop
  (`engine/gameplay-manager.js:316`, `engine/workshop-engine.js`).
- World turn: `src/shared/turn-ledger.ts`; a module failure blocks the close
  (`engine/gameplay-manager.js:410`).
- Balance: `src/shared/ledger.ts` (`liquid + safe`); `postCashflowEntry` is the standard writer,
  5 writers migrated, the rest frozen by the `cashflow-direct-insert` ratchet (18).
- Modals: `LEGACY_OWNED_MODAL_IDS` + lazy singleton.
- Hub: one owner (4-tab journal); the 7-tab file was deleted.
- Trade: `openQuickTrade` delegates to the TS `QuickTradeModal` (one `/api/action` payload).
- Dates: `time-manager` delegates to `date-utils`.
- Travel: `SeededRandom` from `random_seed + month + route/event/choice`; no `Math.random`.
- Equipment: `equipment-system` delegates to `BlacksmithForgeService` (one mutation path).
- Labor shifts: one shared `CANONICAL_LABOR_SHIFTS` table.
- Units and calendar: `config/game-constants.json` (Quan/quan, Thạch/piculs, 30-day calendar,
  fatigue cap) with a drift test across TS, engine and the classic client.
- Market price: `master_items` only; `engine/market-price-book.js` and
  `src/shared/market-price-book.ts` are the read paths, and the trade executor ignores a
  client-supplied price.

**Structural debt, by impact:**

1. **God services:** 4 files of 1,290–1,970 lines plus a 3,344-line gateway. P6/P7 of the blueprint
   remain.
2. **Account-code history:** new postings and historical rows now use the numeric chart
   (migration 009); `canonicalAccountCode()` remains only for external/legacy inputs.
3. **Legacy client:** 21 scripts, ~16.6k lines, one `legacy-bridge.ts`; no automated browser test,
   so legacy edits still need a manual check.
4. **Map with 4 data sources** (finding 10): `map-data.js`, `spatial-registry.ts`,
   `map-live.service.ts` and the DB. This is the largest remaining item.
5. ~~**Four market-price sources** (`rules.js`, `master_items`, `market-elasticity`, hardcoded
   workshop prices).~~ Fixed in 1.6.6: `master_items` is the only price source;
   `market-elasticity` is a scenario model that never settles a trade.
6. **`engine/gameplay-manager.js:106`** still uses `Date.now()` for the campaign id at new-game
   genesis (does not affect replay within one DB).

## 4. New trade-offs introduced by the refactor

1. **One business settlement per month.** If the workshop already ran in a month, the month-close
   button skips that business's passive income (and vice versa). Intentional, but the player needs
   a note in the monthly report.
2. **Business books are no longer double-entry.** The workshop does not write
   `cashflow_ledger`/`account_journal` for internal business revenue and expense (the player ledger
   tracks player cash only). The trail lives in `businesses.safe_cash` and `action_log.result`; a
   business subledger would be needed for full business auditing.
3. **Fail-loud month close.** A world-module failure blocks the month close instead of silently
   losing that module's work. Correct for data, but a persistent failure would trap the player;
   the UI must surface the error, not just a generic toast.
4. **Caravans are slower than armies.** 120 li/day (caravan) vs 240 li/day (army): a 240-li route
   takes 2 caravan days vs 1 march day. Reasonable for cargo, but a balance change from the old
   0.2–0.67 progress per tick.
5. **The "Wait 1 Day" button costs a real day.** Repeated clicks advance the calendar and charge
   0.02 Thạch/day; it used to move caravans for free. This is a fix, but the player should be told.
6. ~~**Skipped days at month close do not emit day ticks or charge grain upkeep.**~~ Fixed in
   1.6.7: skipped days are `31 - day`, charge grain upkeep, emit day ticks (except the new
   month's first day) and advance tasks/caravans by the same count.

## 5. Game design assessment

The five playtest gaps are unchanged:

- **No losing state.** No `is_dead`, no game over; health floors at 20–25, bankruptcy only freezes
  actions, the player is `RULER` with `betrayal_risk = 0`. This is the biggest "game" gap.
- **The world does not run itself.** No scheduler; time stands still unless the player clicks.
  Caravans now move per day, but days still need a player action.
- **NPC economy is not conserved.** `npc-lifecycle` adds straight to `personal_cash`/`personal_troops`.
- **Macro-agency is blocked.** No defection, no secession, no settlement sovereignty change except
  scripted events.
- **No onboarding/tutorial.** Progression pressure is flat (cap 120, spar +25 EXP).

New positive: the economy now has one source of truth, so every balance change is **measurable**
(invariants + audit + smoke). Designing win/lose is no longer blocked by data noise.

## 6. UI/UX assessment

Closed: duplicate chronicle, two clocks, dev telemetry in the header, `undefined` caravan fields,
wrong claim ids, and the claim button for foreign caravans.

Still open, measured:

- **Typography:** 170 `font-size` declarations at 10.5px or below; the right panel is 8.5–10px.
  The largest readability issue, not a functional bug.
- **Navigation density:** 5 header buttons (Hành Dinh, Đổi Phiên, Thời Gian, Ngôn Ngữ, Nhật Ký)
  plus 7 entry points elsewhere (Quân Cơ, Sổ Tay, Nội Thành, Dư Đồ, Phi Thư…), with 3 overlapping
  vocabularies.
- **Inline styles:** 790 declarations; 8 native `confirm` (after deleting the 7-tab hub file).
- **Right panel** still defaults to the raw ledger (`MILITARY_REINFORCE`, `WORKFORCE_HIRE`).
- **4-tab journal** won; the 7-tab roadmap (enterprise/caravan/duel/banquet) was deleted from the
  repo — restoring it means rebuilding it in TS.

## 7. Next priorities

**P0 — do now (half a day)**

1. ~~Re-record the perf baseline after confirming the two old drifts (`npm run perf:record`).~~
   Done in 1.6.7.
2. ~~Surface the "world simulation failed" error in the month-close modal (currently a generic
   toast).~~ Done in 1.6.7 (error panel + retry).
3. ~~Note in the monthly report whether a business settled through the workshop or passive
   income.~~ Done in 1.6.7 (`settlementMethod`).

**P1 — 2–5 days**

4. ~~Move the remaining 18 cashflow INSERTs to `postCashflowEntry`~~ — done in 1.6.4
   (`cashflow-direct-insert` budget 0); chart-of-accounts history rewritten in 1.6.5.
5. One map source: DB `master_locations`/`master_routes` → the client keeps aliases only.
6. ~~Collapse the four market-price sources into `master_items` + `market-elasticity`.~~ — done in
   1.6.6 (`market-price-book` read path, migration 010 completed the catalog).

**P2 — 1–3 weeks**

7. Split the 4 god services (P6) and extract the 47 gateway handlers (P7).
8. Migrate the 21 legacy scripts to TS (P5), with automated browser tests for modals/POIs.
9. Typography and inline-style burn-down. **Typography done in 1.6.7** (all ≤10.5px raised to
   11px, ratchet at 0); 790 inline styles remain.
10. **Design the losing state** (death/bankruptcy/betrayal) — the only item that needs a product
    decision before touching balance.

## 8. How to re-verify

```bash
npm run verify        # 26 suites, 28 contracts, 8 write smokes
npm run audit         # 1,358 invariants
npm run perf:compare  # p95 + fingerprint
node tools/sim-audit.js
node tools/route-shadow-report.js --strict
```

For legacy UI changes: run `npm run build:client`, restart the server (an old server keeps serving
the old bundle), then open the real page — the gate does not open modals or assert that a
`.modal-body` is non-empty.

## 9. Post-review fixes (1.6.3, same day)

A second pass over the data flows (not covered by the first gate) found and fixed:

- **New-game isolation.** `src/modules/instances/instance-bootstrap.ts` clears every history and
  runtime table (turn log, action log, chronicle, tasks, caravans, duels, loans, family, equipment,
  NPC progression/journeys/relations, world-turn markers, player/ledger/stock) and reseeds the
  player, starting stock, workshop, NPC assignments, opening ledger and first turn. A commoner does
  not own the workshop (NPC-0007 does). `verify-instance-bootstrap.ts` proves both archetypes pass
  the clock/cash/inventory/journal audits with zero foreign-key violations.
- **Fresh schema and migrations.** `tools/schema.sql` now declares
  `trade_caravans.dispatched_by_player`, `chat_chronicle` plus its dedupe trigger, `active_tasks
  .last_tick_date` and `world_turn_ledger`; `tools/sim-db.js init` applies all 10 migrations after
  seeding, so a schema-initialized database is never behind.
- **Task progress.** `last_tick_date` makes `progressTasks` idempotent per campaign date, and
  `advanceTurn` writes task progress after the core turn batch commits (the report uses a pure
  projection), removing the double-progress path on a retried month close.
- **Instance routing guard.** The gateway no longer keeps the previous request's instance sticky
  and returns **409 `INSTANCE_NOT_ACTIVE`** for a modular route when the selected database is not
  the startup campaign. True per-request multi-campaign switching still requires rebinding the
  module registry, which is a separate architectural decision; the guard prevents silent
  cross-database writes in the meantime.
- **Day-30 tick.** `POST /api/caravans/tick-progress` returns **409 `MONTH_END`** instead of a
  success response that advanced nothing.
- **Data migration.** Migration `008-normalize-grain-unit` rewrites archived `master_items` grain
  units from `Dan` to `Thạch`/`piculs` (1 row on the live DB).
- **One cashflow writer.** All 18 remaining direct `INSERT INTO cashflow_ledger` sites migrated to
  `postCashflowEntry` (or `postCashflowEntryRaw` for the instance bootstrap); the
  `cashflow-direct-insert` ratchet is now **0**. `src/shared/account-codes.ts` provides
  `ACCOUNT_CODES` and `canonicalAccountCode()` for new postings and report-side aliasing.
- **Fresh-clone bootstrap.** The instance bootstrap seeds the two core retainers when `npc_state`
  is empty and adapts to optional columns, so it also works on a `sim-db init` schema. README now
  documents `ingest-markdown-master.js` + `sim-db init`.
- **Small fixes.** `startNewGame` uses a deterministic campaign id; the caravan wait button surfaces
  the day-30 409; suite breakdown corrected to 4 legacy + 22 modern.

