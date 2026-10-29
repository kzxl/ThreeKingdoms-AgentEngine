# Refactor Wave 1 — Data & Runtime Consolidation (2026-10-29)

This document records the first executed refactor wave of `ThreeKingdoms-AgentEngine`:
what was changed, why, how it was verified, and what remains. It is the companion to
`docs/audit/DEEP_ARCHITECTURE_AUDIT.md` (assessment) and supersedes its remediation
status where the two disagree.

---

## 1. Objective

Turn a working but split runtime (four database access paths, two routing layers,
two startup modes, silent-failure data access) into a single, measured, ratcheted
foundation that can be extended without regressions.

---

## 2. What Changed

### 2.1 Verification infrastructure (new)

| Artifact | Purpose |
| :--- | :--- |
| `tools/test-runner.js` | Runs all 19 suites (4 legacy CommonJS + 15 `verify-*.ts`) with an isolated DB copy per modern suite, and restores `game/PROGRESS.md` / `game/ledger/*.md` afterwards so verification never desyncs the live campaign. |
| `tools/arch-guard.js` + `tools/arch-baseline.json` | Zero-dependency ratcheting linter. Eight rules (SQLite-CLI spawns, `child_process` in `src/`, SQL `${}` interpolation, unseeded `Math.random`, wall-clock IDs, empty `catch`, `globalThis` service locator, legacy UI file count). Debt may only shrink. |
| `tools/api-golden.js` + `tests/golden/api-shape.json` | Boots the real composition root on `:3399` against a sandbox DB and diffs 28 read-only endpoint contracts (status code + response shape + two behavioural assertions). |
| `tools/migrations/run.js` + `001-normalize-settlement-aliases.js` | Versioned, idempotent data migrations recorded in `schema_migrations`. |
| `npm run verify` | Single gate: typecheck → arch guard → 19 suites → API contract. |

### 2.2 Database access (consolidated)

- `src/core/database.ts` now holds a **path-keyed registry** instead of a
  close-and-reopen singleton. Multiple playthrough instances can stay open at once,
  which the HTTP layer's per-request `x-instance-id` switching requires.
- `engine/db-adapter.js` was rewritten as the CommonJS binding over the same
  `better-sqlite3` driver: **cached connections**, bound-parameter support, and
  **throwing errors with DB + statement context**. The `sqlite3` CLI fallback,
  the temp `.sql` file per query, and the silent `return []` policy are gone.
- `tools/sim-web.js` no longer spawns the `sqlite3` CLI. Its `runSqlJson` /
  `runSqlRaw` delegate to the adapter over the active instance path.
- `src/mcp/tools.ts` uses `DatabaseService` instead of its own CLI helper.
- `src/core/database.ts` exposes `DatabaseQueryError` and sets
  `busy_timeout = 5000` so concurrent handles on one file degrade gracefully.

Result: **one driver, four call sites, zero process spawns per query.**

### 2.3 Input validation at the kernel boundary (new)

`engine/action-validation.js` normalizes every agent/API action before it can reach
a composed SQL script:

- identifiers restricted to `^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$`
- numeric fields coerced and range-bounded
- game dates shape-checked
- free text length-capped and quote-escaped

`SimulationCore.executeAction()` validates before the idempotency lookup and converts
violations into `{ success: false, code: 'INVALID_PARAMS' }`. The previous
`'${idempotencyKey}'` lookup is now a bound parameter.

### 2.4 Deterministic identifiers

`SimulationCore` no longer builds `ACT-<Date.now()>` / `MOV-<Date.now()>` identifiers.
Wall-clock IDs collided inside a single millisecond (the refactor's faster in-process
writes exposed this as a `UNIQUE constraint failed: action_log.action_id`) and made
replay comparisons unstable. IDs now derive from the target table's row count
(`_nextSequenceId`), which is deterministic and collision-free for the single-writer
model.

### 2.5 Projection sync without subprocess

`src/shared/financial-transaction.ts` previously spawned
`node tools/sim-db.js export-progress` on **every** financial transaction, blocking
the event loop. It now calls `renderProgressMarkdown()` in-process.

### 2.6 Routing and startup (started)

- `npm start` now runs the real composition root (`tsx src/server/main.ts`) instead of
  `node tools/sim-web.js`. Previously the plain-node path attached the router **without
  bootstrapping modules**, so router-owned endpoints returned degraded responses.
- Removed **537 lines** of legacy handlers from `tools/sim-web.js` that the modular
  Router already shadowed: `/api/ledger`, `/api/professions/nodes`,
  `/api/professions/character`, `/api/equipment` (GET), `/api/equipment/equip`,
  `/api/enterprise/status`, `/api/strategy/supply-check`, `/api/strategy/price-check`.
  Verified neutral by the API contract check before and after removal.

### 2.7 Test isolation fixes

- `verify-holistic-enhancements.ts`, `verify-audit-recommendations.ts` and
  `verify-strategic-world-map.ts` hardcoded `saves/session.db`, ignoring `SIM_DB_PATH`;
  they now honour the sandbox path.
- Legacy suites release cached handles (`closeConnections`) and delete `-wal`/`-shm`
  sidecars before removing sandbox directories (Windows file locks + WAL corruption).
- `verify-strategic-world-map.ts` now asserts live-state invariants (non-negative,
  bounded, unique ids) instead of immutable seed constants that sieges legitimately
  change; it also asserts at least 20 settlements remain stocked.

### 2.8 Data repair

Migration `001` folded the legacy alias `changan` into canonical `chang_an`
(updating `bandit_strongholds.location_near`), removing a duplicate
`session_settlements` row with zero granary. This was the pre-existing cause of a
failing verification suite.

---

## 3. Measured Outcome

| Metric | Before | After |
| :--- | ---: | ---: |
| DB access stacks | 4 | 1 driver (2 thin bindings) |
| Process spawns per DB query | 1–2 | 0 |
| `sqlite3` CLI spawns in `src/` | 1 | **0** |
| `sim-web.js` lines | 4,475 | 3,916 |
| Shadowed duplicate routes | 8 handlers | 0 |
| Suites executed by one command | 4 | **19** |
| API contracts under check | 0 | 28 |
| Verification result | 14/15 modern (1 fail) | **19/19 pass** |
| `tsc --noEmit` | pass | pass |
| Audit invariants | 1,355 pass | 1,354 pass (1 duplicate row removed), 0 discrepancies |
| Silent `catch {}` | 39 | 35 |
| SQL `${}` interpolation sites | 86 | 84 |
| `child_process` imports in `src/` | 6 | 4 |

Remaining declared debt (locked in the ratchet, may only decrease): 78 unseeded
`Math.random()` and 59 `Date.now()` sites in domain modules, 12 `globalThis` service
lookups, 22 legacy UI scripts.

---

## 4. How to Verify

```bash
npm run verify        # typecheck → arch guard → 19 suites → API contract
npm run audit         # 1,356 SQLite invariants
npm run perf:record   # baseline p95 + body fingerprint (captures fixture)
npm run perf:compare  # same probes after a change; fails on drift/regression
npm run migrate       # apply pending data migrations (idempotent)
npm run golden:record # re-capture the API contract after an intentional API change
```

`npm run verify` is the gate that must stay green for every subsequent wave.
`perf:record` / `perf:compare` are the per-feature gate: both boot the real
composition root through `tools/lib/server-harness.js` against the same database
fixture, so a fingerprint mismatch means behaviour changed rather than campaign data.

The reusable procedure for refactoring a single feature is packaged as the
`refactor-feature-gate` skill (user-level, `~/.zcode/skills/refactor-feature-gate`):
baseline the four gates, edit one slice, re-run the identical probes, accept or roll
back on measured evidence.

---

## 5. Wave 1.1 — Gameplay Write-Path Repairs

Playtests through the HTTP API (not just service calls) exposed defects that the
existing suites could not see. All are fixed and now gated.

### 5.1 `current_date` was read as the SQLite keyword

`CURRENT_DATE` is a reserved keyword. Any unqualified read such as
`SELECT active_turn, current_date FROM campaign_meta` returned the **real-world
date** instead of the in-game column. Eight services (economy, ecology, military,
professions, lineage ×4, instances) stamped `2026-10-29` into trades, loans,
equipment and lineage records; the auditor's own new clock check hit the same trap.

Fix: every read uses a quoted identifier (`"current_date"`). Regression is now a
**hard** architecture rule (`unquoted-current-date`, budget 0).

### 5.2 Trade and loan endpoints were dead

Four `account_journal` inserts used columns that no longer exist
(`debit_account`, `credit_account`, `amount`, `description`, `ref_txn`), so
`POST /api/trade` and `POST /api/economy/loans` failed to prepare and rolled back.
They now go through one `insertJournalPair` helper writing the canonical schema,
and the ledger balance is computed as liquid + safe cash (matching
`financial-transaction.ts`). `REPAY` also used `status = "ACTIVE"` (an identifier,
not a string) and is now parameterized.

### 5.3 Idempotent replay returned a different shape

`action_log.result` was hand-built with different keys than the handler return
(`newBalance` vs `newCashBalance`, `amount` vs `disbursedAmount`, …), so a retried
action produced a payload the first call never returned. Every stored result now
mirrors the returned `data` object.

### 5.4 Equip/unequip broke inventory conservation

The active route deducted warehouse stock without a `stock_movements` row, so
`npm run audit` failed immediately after equipping (balance_after mismatch plus a
stale projection). Both directions now use `src/shared/inventory-movement.ts`,
which records the movement at the resulting balance, and refresh `PROGRESS.md`.

### 5.5 Chronological ledger invariant

Financial actions whose `game_date` precedes the newest ledger row are rejected
with `INVALID_PARAMS`. Out-of-order rows break the auditor's balance replay, and
they were the visible symptom whenever a client sent a stale date.

### 5.6 Campaign clock invariant and repair

`sim-audit` section 8 asserts the clock is inside 180–300, is not earlier than the
newest turn, and has not drifted more than 45 days past it. Migration
`002-repair-campaign-clock` snaps an implausible clock to the latest turn date.
`GET /api/audit` now runs all eight sections (270 → ~1,367 checks), matching the CLI.

### 5.7 New gate: write-path smoke

`npm run smoke:write` boots the real composition root on a sandbox DB and asserts:
buy, sell, borrow, repay, equip, unequip, idempotent replay, injected-input
rejection, and a clean audit afterwards. It is part of `npm run verify`. This is
the gate that would have caught 5.1–5.4.

### 5.8 Measured after Wave 1.1

| Metric | Wave 1 | Wave 1.1 |
| :--- | ---: | ---: |
| Write paths proven over HTTP | 0 | 8 |
| Audit sections via API | 5 (270 checks) | 8 (~1,367 checks) |
| Dead economy endpoints | 2 (`/api/trade`, `/api/economy/loans`) | 0 |
| Inventory conservation after equip | fail | pass |
| `Date.now()` in domain modules | 59 | 53 |
| Architecture rules | 8 | 9 |
| `npm run verify` | pass | pass |

Known debt left open: `equipment-system.service.ts` still carries a second
`equipItem`/`unequipItem` pair used only by the standalone equipment tool; it is
conservation-neutral (it does not touch stock) but should be folded into the
authoritative path in P6.

---

## 6. Wave 1.2 — Determinism and Projection Consolidation

### 6.1 One projection path, zero subprocesses

Six modules still shelled out to `node tools/sim-db.js export-progress` on every
write (ecology ×2, caravan ×2, professions, daily interaction), and
`financial-transaction.ts` / `blacksmith-forge.service.ts` each carried their own
copy of the projector call. All of them now use
`src/shared/projection-sync.ts`, which renders in-process. `child_process` in
`src/` is now **0** and the ratchet forbids reintroduction.

### 6.2 Seeded randomness

`src/core/rng.ts` provides a Mulberry32 stream per (database, domain), seeded from
`hash(random_seed, active_turn, domain)` and reset when the turn advances.
`src/shared/id-generator.ts` replaces wall-clock identifiers with count-based
sequences. Migration 003 adds the `random_seed` column to older playthroughs.

Migrated this wave:

| Module | Randomness | IDs |
| :--- | :--- | :--- |
| `single-combat-duel.service.ts` | 14 rolls | duel, arena txn |
| `tactical-battle.ts` | 4 rolls | battle id |
| `blacksmith-forge.service.ts` | 10 rolls | bespoke item, 4 stock movements |
| `reproduction-genetics.service.ts` | 4 rolls | child id |
| `enterprise-labor.service.ts` | — | business + 5 txn ids |

### 6.3 Measured

| Metric | Wave 1.1 | Wave 1.2 |
| :--- | ---: | ---: |
| `Math.random()` in domain modules | 78 | **0** |
| `Date.now()` in domain modules | 53 | **0** |
| `child_process` imports in `src/` | 4 | **0** |
| Projection implementations | 8 | **1** |
| `npm run verify` | pass | pass |

### 6.4 Completion

The remaining 35 `Math.random()` and 37 `Date.now()` sites were migrated in the same
wave. Two new pieces made that mechanical:

- `id_sequence` (migration 004, added to `tools/schema.sql`) backs `nextId()` /
  `nextSequenceValue()`, so an id needs only a scope name — the owning table does
  not have to be known.
- `src/shared/game-clock.ts` centralises the quoted `"current_date"` read.

Instance folder ids use `randomUUID` instead of a sequence: they name filesystem
artifacts, not simulation state.

Budgets now read `Math.random() = 0` and `Date.now() = 0` in `src/modules` and
`src/shared`, so any new occurrence fails the gate.

---

## 7. Wave 1.3 — Gateway Slimming

### 7.1 Shadow report before deletion

A route registered by both the modular Router and the legacy if-chain is dead
code: `sim-web.js` dispatches the Router first. The report is now a tool:

```bash
node tools/route-shadow-report.js --strict
```

This wave removed 16 shadowed handlers (618 lines): professions
gather/synthesize/innovations/forge, equipment unequip, enterprise work/open/collect,
ecology crises/relief/simulate-turn, logistics caravans/strongholds/attack-stronghold.

### 7.2 Faction reads moved to their module

`/api/factions`, `/officers`, `/settlements`, `/events` now live in
`src/modules/faction-politics/faction.controller.ts`, delegating to the module
instead of a SQL fallback in the gateway. `golden:verify` confirms the contract is
shape-identical.

### 7.3 Service locator removed

Controllers resolved modules from `globalThis.__GRAND_STRATEGY_MODULES__` before
falling back to `ModuleRegistry`; the global branch was redundant (the Registry is
always populated by the composition root) and is gone. `global-service-locator`
ratchet **12 → 4**; the remaining four are the composition root publishing
modules/router for the legacy gateway, which disappears with P7.

### 7.4 Measured

| Metric | Wave 1.2 | Wave 1.3 |
| :--- | ---: | ---: |
| `tools/sim-web.js` lines | 3,916 | **3,205** |
| Dead legacy handlers | 16 | **0** |
| Live legacy handlers | 62 | **42** |
| `globalThis as any` in `src/` | 12 | **4** |
| `npm run verify` | pass | pass |

---

## 8. Wave 1.4 — Client Boot Repair & Audit Latency

### 8.1 The UI was executing nothing

`public/app.js` declared `const isEn` twice inside `loadStatus` (lines 231 and
389). In a classic script that is a SyntaxError, so **the whole file never ran**:
`window.loadAllData` was undefined, the date chip stayed at its placeholder, and
the page showed only static HTML. The browser check (`new Function(source)`)
surfaced it; `node --check` pinned the line.

### 8.2 Two title screens collided

- `src/client` mounts `ModalShell` DOM **at import**, so it created
  `#title-screen-modal` before the legacy gate ran.
- `legacy-bridge.ts` overwrote `window.TitleScreenUI`, replacing the legacy
  instance manager (which owns the `current_instance_id` storage gate) with a
  scenario-selector facade.
- The legacy gate then found the TS shell, removed `hidden`, and tried to render
  into `#title-screen-body` — which the shell does not have.

Net behaviour before the fix: the gate opened empty, `current_instance_id` was never persisted, and
**every visit returned to the title screen** but could not proceed. Fix: the bridge no longer
overrides `TitleScreenUI`, the TS shell uses `#title-screen-scenario-modal`, and the gate renders.

**Product default (2026-10-29):** the instance chooser is now intentionally shown on
**every load** of the game address (`ALWAYS_SHOW_INSTANCE_GATE` in `title-screen-ui.js`),
non-dismissible, so the player explicitly picks which playthrough to enter. The stored
`current_instance_id` only highlights/preselects the last-played instance.

### 8.3 Data left by the keyword bug

Migration 005 normalized 43 out-of-era records (chat chronicle 9, NPC journeys
21, career shifts 4, political events 2, innovations 1, relationship deltas 3,
stock movements 3) to the campaign/turn date.

### 8.4 Audit endpoint

`tools/sim-audit.js` still shelled out to the `sqlite3` CLI for every query, and
`GET /api/audit` runs all eight sections in-process — so one request spawned
dozens of processes. Switching the auditor to `engine/db-adapter` took the
endpoint from **1.1–2.7 s to ~6 ms**, and the CLI audit from ~1,150 ms to ~16 ms.

### 8.5 Gate calibration

`perf:compare` now defaults to 12 iterations, 3 warm-up, 50% p95 tolerance and an
8 ms absolute floor. Sub-10 ms endpoints jittered by more than 100% between
adjacent runs (2.1 ms → 4.5 ms) while a real regression is still caught on
endpoints above the floor. New gate: `npm run lint:client` parses all 23 classic
client scripts.

### 8.6 Measured

| Metric | Before | After |
| :--- | ---: | ---: |
| `GET /api/audit` p95 | 1,115–2,770 ms | **6 ms** |
| `npm run audit` wall time | ~1,150 ms | **~16 ms** |
| Client scripts that execute | app.js dead | **23/23 parse** |
| Returning visit shows title | always | **no** |
| 2026-dated session rows | 43 | **0** |

### 8.7 Shared primitives and the migration

`src/client/core/ui` (button/badge/toast/confirm, exposed as `window.UI`) is now the
only sanctioned control layer. The first migration pass:

- 190 `tactical-btn` usages in the legacy UI → `ui-btn` variants, plus 13 close
  buttons → `ui-btn--icon`; both dead CSS blocks removed.
- 48 `btn btn-xs btn-*` usages in TypeScript feature modals → `ui-btn`. Those
  classes had no CSS, so the lineage/enterprise/equipment screens were rendering
  unstyled native buttons. `w-full` / `flex-1` (also undefined) became
  `ui-btn--block` / `ui-btn--grow`.
- The lineage modal's `dowryCash.toLocaleString()` crash exposed a client/server
  DTO mismatch: the server sends `recommendedDowryCash`. Fixed on the client.

| Metric | Before | After |
| :--- | ---: | ---: |
| Legacy button classes defined in CSS | 47 | **42** |
| Legacy class usages (public UI) | 179 | **94** |
| Legacy button classes in TS client | 48 | **0** |
| Shared primitive usages | 18 | **400** |

`npm run lint:ui` enforces that the first three only shrink. Remaining debt:
1,018 inline `style` attributes (mostly generated markup), 9 native confirms, and
the `gm-tab-btn` / `grand-hub-tab-btn` / `deck-tab-btn` tab families.

---

## 9. UI Review — Main Screen Hierarchy

### 9.1 What the review found

| Symptom | Evidence | Cause |
| :--- | :--- | :--- |
| Header looked cramped and overlapped | children measured 70 px / 58 px inside a 52 px bar | brand and date chip wrapped; metrics used inline label+value |
| Placeholder banner always visible | "Đang quét sự kiện lịch sử..." with no active event | no generic `.hidden` rule (only modal/toast-specific ones) |
| Chronicle effectively invisible | `.story-chronicle` measured 19 px tall | choice dock grew and `flex-shrink: 0` pushed the story out |
| Text hard to scan | 11–13 px, muted `#64748b` | density defaults from the first layout pass |
| No clear primary action | five equally loud dock buttons | each had its own colour |
| Chips clipped at the right edge | last POI button cut off | non-wrapping flex row |

### 9.2 What changed

- Header 68 px; one-line brand with a tooltip, one-line date pill, stacked metric
  labels, compact badges; redundant header turn button hidden ≤1400 px.
- `.hidden` restored globally; event banner hides when no local event is pending.
- Typography and spacing pass: base 13.5 px, story 14 px/1.62, choice title 13.5 px,
  note 12 px, lighter muted colour, larger card padding/radius.
- Command dock: neutral secondary actions, single amber primary turn action,
  duplicate location pill removed, labels shortened, one-row layout.
- Layout: chronicle floor 160 px; choices scroll inside a 48 vh dock; POI chips wrap.
- Responsive: ≤1180 px stacks the right deck and lets the header wrap.

### 9.3 Remaining UI debt

The TypeScript modals were authored with Tailwind-style utilities while the project
has no Tailwind build; a token-mapped compatibility layer now covers the ~100 used
classes (layout, spacing, type scale, surfaces, borders, progress height). Any new
utility class must be added there or it will silently do nothing.

Still open: 1,018 inline `style` attributes, 9 native `confirm()` calls, the three
legacy tab families (`gm-tab-btn`, `grand-hub-tab-btn`, `deck-tab-btn`), and the
right deck still renders relations as dense text. The next passes should convert
tabs to a `ui-tab` primitive, replace inline layout styles with utility classes,
and collapse the relation network into a summary row that opens a detail view.

---

## 10. Remaining Roadmap

**P3 — Determinism.** Complete: `RngService`, `nextId`/`nextSequenceValue`,
`id_sequence`, zero unseeded randomness and zero wall-clock ids in domain code.
A five-turn replay-hash test is still worth adding.

**P4 — Tick pipeline.** `WORLD_DAY_TICK` / `WORLD_MONTH_TICK` are published and the
turn advance is one transaction; projection is synchronous in-process. Optional
follow-up: fixed phase ordering and a debounced projection for burst writes.

**P5 — Client consolidation.** Migrate the 22 legacy `public/js` scripts into the
existing TypeScript feature slices, delete `legacy-bridge.ts` when its last consumer
disappears, and reduce `index.html` to one module script. The legacy-script-count
rule already prevents growth.

**P6 — Domain hygiene.** Split the four services above 1,300 lines
(`context-action`, `blacksmith-forge`, `enterprise-labor`, `single-combat-duel`),
remove hardcoded `'PLY-0001'` defaults in favour of an injected `ExecutionContext`,
and route NPC/faction treasuries through the double-entry ledger so `sim-audit`
covers the world economy symmetrically.

**P7 — Gateway remainder.** 42 live legacy handlers remain in `sim-web.js`
(instances, status/inventory/NPC reads, faction writes, chat/agent, game slots,
travel, events, action/workshop). Extract them cluster by cluster like the faction
reads, with `route-shadow-report` keeping the file honest after each step.

**P7 — Server monolith remainder.** Extract the remaining `sim-web.js` handlers into
`src/modules/*/controller.ts` services, then reduce `sim-web.js` to static file serving
and a `listen()` call.
