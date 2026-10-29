# Architectural Decisions (DECISIONS.md)

This document records the architectural choices, rationale, and alternatives considered for `ThreeKingdoms-AgentEngine`.

---

## ADR-001: SQLite as Single Source of Truth, Markdown as Projection View (Hybrid CQRS)

- **Date**: 2026-10-27
- **Context**: The simulation engine originally stored all state across dozens of Markdown files. This caused $O(N)$ token context inflation, regex parsing fragility (e.g. `3,500` parsed as `3`), and risk of state drift.
- **Decision**: Adopt SQLite as the single transactional write store (`saves/session.db`). Markdown files (`game/PROGRESS.md`) are auto-generated read projections.
- **Consequences**:
  - Positive: Sub-millisecond queries, ACID guarantees, parameterized safety, zero regex drift, ~90% token reduction.
  - Negative: Requires SQLite CLI / library interface. Mitigated by using zero-dependency system `sqlite3` CLI.

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
  Chart of accounts:
  - `1001_CASH_MOBILE` (Asset)
  - `1002_CASH_SAFE` (Asset)
  - `1201_INVENTORY` (Asset)
  - `1501_FIXED_ASSETS` (Asset)
  - `2001_ACCOUNTS_PAYABLE` (Liability)
  - `3001_OWNER_EQUITY` (Equity)
  - `4001_SALES_REVENUE` (Revenue)
  - `5001_COST_OF_GOODS_SOLD` (Expense)
  - `6001_OPERATING_EXPENSE` (Expense)
  - `7001_BOUNTY_INCOME` (Other Income)
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
    1. Critical Liquidity Warning: Safe cash < 500 Qian.
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
