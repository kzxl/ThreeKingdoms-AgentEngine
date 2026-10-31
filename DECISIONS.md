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
