# Architectural Decisions (DECISIONS.md)

This document records the architectural choices, rationale, and alternatives considered for `ThreeKingdoms-AgentEngine`.

---

## ADR-001: SQLite as Single Source of Truth, Markdown as Projection View (Hybrid CQRS)

- **Date**: 2026-10-27
- **Context**: The simulation engine originally stored all state across dozens of Markdown files. This caused $O(N)$ token context inflation, regex parsing fragility (e.g. `3,500` parsed as `3`), and risk of state drift.
- **Decision**: Adopt SQLite as the single transactional write store (`saves/session.db`). Markdown files (`game/PROGRESS.md`) are auto-generated read projections.
- **Consequences**:
  - Positive: Sub-millisecond queries, ACID guarantees, parameterized safety, zero regex drift, ~90% token reduction.
  - Negative: Requires a SQLite binding. Runtime code uses `better-sqlite3` in-process (`DatabaseService` / `engine/db-adapter.js`); the `sqlite3` CLI is only used by the one-off markdown ingest bootstrap.

---

## ADR-002: Repository Framework vs. Local Playthrough Decoupling

- **Date**: 2026-10-27
- **Context**: Git tracking session progress files mutated base entity dossiers, preventing clean game restarts or parallel campaigns.
- **Decision**:
  - The Git repository tracks **only the engine skeleton**: rules (`RULES.md`, `ECONOMY.md`, `TECHNIQUES.md`), master seed world data (`game/master/`), and tools (`tools/`).
  - Active playthrough files (`saves/`, `*.db`, `game/PROGRESS.md`, `game/ledger/`) are isolated locally and ignored by `.gitignore`.
- **Consequences**:
  - Positive: Clean, reproducible repository. Anyone can clone and start turn 0 immediately without stale campaign baggage.

---

## ADR-003: Pure Double-Entry Accounting Journal

- **Date**: 2026-10-27
- **Context**: The original ledger only tracked single-entry cash inflows/outflows, creating ambiguity between cash balances, inventory assets, revenues, and operating expenses.
- **Decision**: Implement a double-entry `account_journal` in SQLite where every transaction records balanced debits and credits:
  $$\sum \text{Debit} = \sum \text{Credit}$$
  Canonical chart of accounts (`src/shared/account-codes.ts`):
  - `1001_CASH_MOBILE` (Asset)
  - `1002_CASH_SAFE` (Asset)
  - `1003_ACCOUNTS_RECEIVABLE` (Asset)
  - `1201_INVENTORY` (Asset)
  - `2001_ACCOUNTS_PAYABLE` (Liability)
  - `3001_OWNER_EQUITY` (Equity)
  - `4001_SALES_REVENUE` (Revenue)
  - `4002_FINANCIAL_INCOME` (Revenue)
  - `5002_FINANCIAL_EXPENSE` (Expense)
  - `6001_OPERATING_EXPENSE` (Expense)
  - `7001_BOUNTY_INCOME` (Other Income)

  Legacy codes (`CASH-ON-HAND`, `REV-SALES`, `101_TIEN_MAT`, …) are mapped by
  `ACCOUNT_ALIASES`; migration 009 rewrote existing rows.
- **Consequences**:
  - Positive: Mathematically impossible to create "phantom wealth" or unbalanced ledger books.

---

## ADR-004: Unified Simulation Core Pipeline

- **Date**: 2026-10-27
- **Context**: LLM agents must not directly alter financial, inventory, or military balances without rule checks.
- **Decision**: Implement `engine/sim-core.js` enforcing the pipeline:
  `Action Proposal -> Validate Schema -> Condition Check -> Rule Resolver -> Atomic SQLite -> Invariant Check -> Event Log`
- **Consequences**:
  - Positive: Deterministic simulation rules are authoritatively enforced. Invalid actions are rejected with clear error codes.

---

## ADR-005: Zero-Token Autonomous NPC & Enterprise Utility Engine with Strategic Escalation

- **Date**: 2026-10-27
- **Context**: In a long-running campaign, background workshops, artisan retainers, and apprentice staff perform repetitive monthly operations (purchasing bamboo/twine, manufacturing mats/baskets/shields, disbursing wages, paying rent). Invoking LLM inference prompts for routine administrative operations wastes tokens, introduces non-deterministic variance, and creates latency.
- **Decision**:
  - Implement a deterministic utility AI scoring engine (`engine/workshop-engine.js`) to handle monthly background enterprise operations with zero LLM token cost.
  - Product mix targets are calculated based on labor capacity, hourly margin yields, warehouse inventory levels, and foreman artisan traits (`Master Artisan`, `Meticulous`, `Frugal`).
  - Differentiate routine operations from strategic dilemmas: the engine autonomously runs routine cycles, but escalates to the player/LLM via a dilemma event if critical thresholds are met:
    1. Critical Liquidity Warning: safe cash below 500 quan (or outstanding debt).
    2. Labor Discontent: Workforce morale < 55%.
    3. Rare Strategic Requisitions: Garrison military procurement contracts.
- **Consequences**:
  - Positive: High-speed, 100% reproducible background simulation. Zero token waste for routine workshop cycles.
  - Positive: High-agency gameplay where the player only intervenes when meaningful strategic decisions are required.

---

## ADR-006: Vanilla Shared UI Primitives Instead of Ant Design

- **Date**: 2026-10-29
- **Context**: Components drifted across screens: 47 legacy button classes, ~1,000 inline `style` attributes, four modal implementations, and nine native `confirm()` calls. The client is vanilla TypeScript + Vite with ~20k lines of legacy DOM scripts and no React runtime.
- **Decision**:
  - Build `src/client/core/ui/` (button, badge, toast, confirm-on-modal-shell) on the existing `:root` design tokens, and expose the same contract to legacy scripts as `window.UI`.
  - Do **not** adopt Ant Design for now. antd requires React plus roughly 1 MB of bundle, and every screen would have to be rewritten before it paid off.
  - Ratchet the debt with `npm run lint:ui`: legacy button classes, legacy class usages, inline styles and native confirms may only shrink; shared primitive usage is reported to grow.
- **Consequences**:
  - Positive: One visual contract for both UI layers without a new framework; migration can proceed screen by screen.
  - Positive: The ratchet prevents new per-screen one-off styles.
  - Negative: Ant Design's form/table/data-grid components are not available; if the client later moves to React, ADR-006 should be revisited and the primitive API maps cleanly onto antd equivalents.

---

## ADR-007: Server-Authoritative Action Time (2026-10-31)

- **Context**: `SimulationCore` and quest/exploration charged calendar days, but duels, social interactions, banquets, crafting, caravans and enterprise actions only charged fatigue. Their days came from a best-effort client call to `/api/time/spend`, so a direct API call could farm fame or production without the calendar moving.
- **Decision**: Add `src/shared/action-time.ts` and charge every player mutation at the HTTP boundary before its service runs. `engine/action-policy.js` remains the only cost table. `/api/time/spend` and `apiSpendActionTime` become clock-refresh shims.
- **Consequences**:
  - Positive: One authoritative clock; rejected actions cost nothing; a new endpoint that forgets the charge fails review.
  - Negative: Controllers own one extra precondition call, and service-level unit tests do not advance the calendar unless they call the charge explicitly.

---

## ADR-008: Enterprise Monthly P&L with Debt (2026-10-31)

- **Context**: The month close computed `tier * 260 * efficiency + workforce * 25` against a `businesses` table with no `tier` column, ignored rent, and clamped a loss to zero. A staffed workshop with 3,900 in wages could never go into debt, and an unstaffed business produced revenue for free.
- **Decision**: Migration 042 adds `tier` and `debt`. `engine/business-economics.js` is the pure settlement: staffing scales output, wages and rent are costs, profit repays debt, a loss consumes safe cash and then becomes debt. Owner withdrawals are blocked while debt is outstanding.
- **Consequences**:
  - Positive: Enterprise play has real risk and a recoverable failure state; the monthly report is an auditable P&L.
  - Negative: Existing saves may show a workshop in debt at the next close. Content must tune tier, wages or headcount instead of relying on the old clamp.

---

## ADR-009: One Career-Path Resolver (2026-10-31)

- **Context**: The progression API computed five career scores and advertised bonuses inline, but no service read them. `spatial-guard` also counted `session_duels.outcome`, a column that does not exist (the schema uses `outcome_type`), so duel wins were always zero.
- **Decision**: `engine/career-paths.js` owns scores and modifiers; the API and gameplay call it. Only the highest-scoring path applies, and its modifiers are wired into attribute EXP, training, quest rewards, trade margin, crafting defect and lineage prestige.
- **Consequences**:
  - Positive: The screen cannot promise a bonus the simulation does not apply; changing a path is one file.
  - Negative: The active path is derived, not chosen; a player can drift between paths as stats change. An explicit path commitment remains a later design option.

---

## ADR-010: Data Repairs Belong in Migrations (2026-10-31)

- **Context**: Six player skill names and two medicine items carried a broken code page, and old narrative rows still used numeric `Tiền`/`Qian` labels. Source lint cannot see database rows, so these defects survived normal verification.
- **Decision**: Fix them with an idempotent migration (043) that resyncs display names from `master_skills`, rewrites the two item records, and normalises numeric currency labels across the narrative tables. A verification suite seeds dirty rows and runs the migration twice.
- **Consequences**:
  - Positive: Existing saves are repaired without a manual SQL session, and the repair is replayable.
  - Negative: A new content defect needs a new numbered migration; editing the database by hand remains out of policy.

---

## ADR-011: Local Market Has a Write Side (2026-10-31)

- **Context**: `settlement_market_state` was read by trade quotes and drifted monthly, but no trade wrote to it. Buying 100 grain left the local price unchanged, so arbitrage and scarcity were decorative.
- **Decision**: `SettlementMarketService.applyTrade` books every fill (buy = negative stock delta, sell = positive). `SimulationCore`, `/api/trade` and caravan claim call it; the monthly drift remains the slow mean-reversion layer. The CJS bridge caches one context per database path.
- **Consequences**:
  - Positive: Player trades move the next quote and create real local scarcity/glut; cross-settlement arbitrage has a cost on both ends.
  - Negative: A large single trade can move a price sharply; content must seed enough stock to keep small trades sane.

---

## ADR-012: Obligations Are Player Decisions, Not Hidden Deductions (2026-10-31)

- **Context**: Enterprise rent and wages were automatic, but the player had no recurring personal cost. Hiding a tax deduction in month close would add a number without adding a decision.
- **Decision**: Migration 044 adds `obligations`. Month close issues the next month's tax bill (due day 15); the player pays explicitly through the API/UI. An unpaid bill becomes `OVERDUE` with a 10% late fee and a 5-point credibility loss.
- **Consequences**:
  - Positive: Every month has a "pay, defer or raise cash" decision with a visible consequence; payments go through the single ledger writer.
  - Negative: A player who ignores the modal accumulates overdue bills and credibility loss; the UI must surface the section prominently.

---

## ADR-013: Contract Board for Repeatable Content (2026-10-31)

- **Context**: Five questlines × three steps exhausted all authored quest content. The game needed a repeatable loop that consumed real inventory and paid real rewards without hand-authoring every month.
- **Decision**: Migration 045 adds rotating `contract_offers` and `player_contracts`. Each settlement posts three deterministic offers per month; delivery consumes stock through `consumeInventoryItem`, pays through the ledger and awards fame. Expiry creates a `CONTRACT_PENALTY` obligation.
- **Consequences**:
  - Positive: The game has infinite low-authoring content tied to the local economy; delivery and expiry both have real consequences.
  - Negative: Offers are generated, not hand-written, so narrative variety is limited until a content pass adds templates.

---

## ADR-014: Combat Leaves Permanent Marks (2026-10-31)

- **Context**: Single combat floored health at 20 and pre-battle enemy death was only a sentence. A duel had no lasting cost beyond fatigue, and a named officer could "die" and remain in the roster.
- **Decision**: Migration 046 adds `conditions`. Injuries reduce `effectiveWar` until the next month close; NPC death sets `is_alive = 0`, clears the business assignment and removes the faction officer row. Death chances are context-specific (sparring 0, arena 0, caravan/pre-battle small).
- **Consequences**:
  - Positive: ROTK officers become a scarce, mortal resource; wounds create a reason to rest or avoid a fight.
  - Negative: A seeded campaign can lose a favourite officer permanently; tests and saves must read `is_alive` rather than assume the roster is static.

---

## ADR-015: Scenario Seeds Carry War and Alliance (2026-10-31)

- **Context**: 184 and 190 used the same seed, and 208 opened at war with the Han court regardless of the historical coalition. Choosing a scenario changed the date and little else.
- **Decision**: `config/scenario-seeds.json` gains `allies` next to `wars`; both appliers write `WAR`/`ALLY` diplomacy rows. The four dates now have distinct holdings, enemies and allies.
- **Consequences**:
  - Positive: The start date changes the strategic problem, not only the calendar.
  - Negative: The seed file is now balance data; changing it affects every new campaign and needs a test update (`verify-scenario-seed`).

---

## ADR-016: Intel Is a Report, Not a Database Read (2026-10-31)

- **Context**: The UI could read exact prices and garrisons, so scouting had no value and every market was transparent.
- **Decision**: Migration 047 adds `intel_reports`. Monthly claims carry confidence and error; `POST /api/intel/verify` costs two exploration days and reveals the truth, with a 20% error threshold marking a claim false.
- **Consequences**:
  - Positive: Information becomes a resource and a reason to spend days; false reports create real planning risk.
  - Negative: Players who ignore the intel board are not blocked, just less informed; the UI must keep the section visible.

---

## ADR-017: Farming Is Land, Not a Gathering Node (2026-10-31)

- **Context**: The `FARM` gathering node only paid the player as a hired labourer. There was no land to rent, no crop choice, no season and no harvest cycle, so the agricultural half of the economy was missing.
- **Decision**: Migration 048 adds `master_crops` and four rentable parcels per settlement. The player pays rent (to the ruling faction), plants an in-season crop, waits 20–60 days, and harvests grain through the inventory writer. Yield depends on area, soil, crisis penalty, lateness and a crop-risk roll.
- **Consequences**:
  - Positive: Land, season and crop choice create a real mid-term plan; rent is a second recurring cash sink after tax.
  - Negative: A parcel can sit idle if the player misses the season; the UI must show the current season and the harvest date clearly.

---

## ADR-018: A Cashflow Row Without a Journal Pair Is a Bug (2026-10-31)

- **Context**: Wage, dividend and capital paths wrote `cashflow_ledger` without `account_journal`, and the auditor only checked Dr/Cr parity for rows that happened to exist. Eleven live rows were already unexplained.
- **Decision**: `postDoubleEntry` writes both sides under one transaction; migration 049 backfills historical orphans; the audit fails on any cashflow row without a pair, any pair without cashflow, or a missing journal table.
- **Consequences**:
  - Positive: The player ledger is now complete in both directions; the audit can prove it.
  - Negative: A new money path that forgets journal accounts fails the gate, so adding a transaction takes one more explicit decision.

---

## ADR-019: Time and Idempotency Are HTTP-Boundary Contracts (2026-10-31)

- **Context**: Trade, reinforcement, military, politics and household actions were free of calendar cost, and service-level mutations had no retry protection. SimCore had both; the newer modules did not.
- **Decision**: Every time-consuming player mutation calls `chargePlayerAction` at the HTTP boundary. Financial actions accept an `idempotencyKey` and replay the stored result; every successful mutation records in `action_log`.
- **Consequences**:
  - Positive: The calendar cannot be skipped from the UI or a direct API call, and a retried request cannot double-charge.
  - Negative: Controllers carry the charge and journal calls explicitly; a forgotten call is a review finding, covered by the core time/idempotency tests for the main paths.

---

## ADR-020: Runtime Schema Is Migration-Owned (2026-10-31)

- **Context**: Services created family, loan, equipment, expedition, intel and duel tables on first use, so a fresh database had 68 tables while the live campaign had 94. A service could run before its table existed and silently fall back.
- **Decision**: Migration 050 creates the runtime tables and columns; a fresh `schema.sql + migrations` database is the complete contract. Services may keep `IF NOT EXISTS` as a defensive no-op, but they no longer own schema creation.
- **Consequences**:
  - Positive: Fresh checkout, tests and live campaigns share one runtime schema; missing tables are caught by `verify-schema-contract` instead of a first request.
  - Negative: Schema changes now require a numbered migration, even for a small service-owned table.

---

## ADR-021: No Silent Catch (2026-10-31)

- **Context**: Nineteen empty catch blocks hid optional-schema probes, JSON fallbacks and projection writes; one of them masked a double-quoted SQL literal that silently returned zero.
- **Decision**: Every catch either handles the failure or carries a comment explaining the best-effort fallback. The `silent-catch` ratchet is locked at 0.
- **Consequences**:
  - Positive: A reader can distinguish a deliberate fallback from a hidden failure; a new empty catch fails lint.
  - Negative: Best-effort paths still do not surface a user-facing warning; the comment is the contract, not a runtime log.

---

## ADR-022: The World Has a Treasury Ledger Too (2026-10-31)

- **Context**: The player ledger was closed, but faction treasuries were updated directly in eight places. The auditor only checked that a treasury was non-negative, so world money could appear or vanish.
- **Decision**: Migration 051 adds `faction_ledger` with an `OPENING` row per faction. `postFactionEntry` owns every treasury change; the audit proves `opening + inflow − outflow = treasury_cash`.
- **Consequences**:
  - Positive: The world economy is now auditable; tax, tribute, caravan settlement and rent cannot drift silently.
  - Negative: Every new faction or treasury mutation must create/use the ledger; a direct SQL update is reported as drift.

---

## ADR-023: Idempotency Covers Every Key Mutation (2026-10-31)

- **Context**: The first idempotency pass covered trade, caravans, obligations, contracts, intel and farm. Politics, lineage, wage labor, expeditions, sieges and caravan claims could still double-apply on retry.
- **Decision**: The same `action-journal` contract now covers those paths: accept an optional key, replay the stored result, record every success.
- **Consequences**:
  - Positive: A retried request cannot move troops twice, declare the same war twice or settle a caravan twice.
  - Negative: Callers that want a deliberate repeat must omit the key; the journal records the repeat with a null key.

---

## ADR-024: Settlement Treasuries Join the World Ledger (2026-10-31)

- **Context**: Faction treasuries had a ledger after 051, but settlement treasuries could still be looted or seeded without a counterpart. The auditor only checked that they were non-negative.
- **Decision**: Migration 052 adds `settlement_ledger`; `postSettlementEntry` owns every settlement treasury change; the audit proves `opening + inflow − outflow = treasury_cash`.
- **Consequences**:
  - Positive: Loot, local revenue and seeded cash are auditable end to end.
  - Negative: A new settlement or treasury mutation must seed/use the ledger; a direct update is reported as drift.

---

## ADR-025: Month Close Is Atomic per World Module (2026-10-31)

- **Context**: World modules ran outside the core batch; a module failure aborted the close by design, but writes made before the throw were not rolled back as one unit, and AI war failure was only logged.
- **Decision**: `engine/world-transaction.js` wraps NPC lifecycle, politics, ecology and AI war each in one DatabaseService transaction. A throw rolls back that module; AI war errors now abort the close instead of being skipped.
- **Consequences**:
  - Positive: A failed module leaves no partial writes; retry is safe and `world_turn_ledger` skips completed modules.
  - Negative: This is per-module atomicity, not one transaction across the core batch and every module; the retry ledger remains the cross-module contract.

---

## ADR-026: Day Phases Are an Administrative Resource (2026-10-31)

- **Context**: Every action spent whole days, so bookkeeping actions (accepting a quest, paying a bill, accepting a contract) were free and could be repeated without any calendar cost.
- **Decision**: A day has three phases (morning/afternoon/evening). `ADMIN_ACTION` costs one phase; field actions keep whole-day costs and reset the phase. `campaign_meta.current_phase` is persisted by migration 053.
- **Consequences**:
  - Positive: Administrative work has a small, real time cost and three such actions fill a day; field actions remain chunky by design.
  - Negative: Only administrative actions use phases for now; a future pass can move social or market actions to phases if balance supports it.
