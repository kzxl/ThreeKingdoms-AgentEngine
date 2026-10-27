# Engineering Plan: ThreeKingdoms-AgentEngine Overhaul

## 1. Objective
Transform `ThreeKingdoms-AgentEngine` into an industrial-grade, deterministic, auditable simulation engine where:
- **SQLite** is the absolute single source of truth for all live execution state.
- **Markdown** serves strictly as human-readable documentation and auto-generated projection views.
- **Master Game Data** (`game/master/`) is 100% immutable and read-only.
- Every simulation action passes through a deterministic **Simulation Core** (`Validate -> Condition Check -> Rule Resolver -> Atomic SQLite -> Invariant Check`).
- An independent **Auditor Layer** verifies invariants without false successes.
- Code contains **zero hardcoded personal paths** and **zero uncontrolled git pushes**.

---

## 2. Work Breakdown Structure (Prioritized)

### [P0] Correctness of Data & Independent Auditor
- [ ] Refactor `tools/sim-audit.js` to audit **SQLite directly** rather than reading Markdown tables.
- [ ] Implement strict inventory conservation verification: $\text{Current Qty} = \text{Initial} + \sum \text{MOV}_{\text{in}} - \sum \text{MOV}_{\text{out}}$ per SKU.
- [ ] Eliminate silent false passes when `PROGRESS.md` is missing or when ledgers have unverified items.
- [ ] Remove hardcoded success verdicts ("100% Reconciled") and replace with exact count-based verification summaries.
- [ ] Remove hardcoded external machine paths (e.g. `E:\Tools\SemanticBrain\...`) from `tools/sim-checkpoint.js` and eliminate unprompted auto-push.

### [P1] Transaction Standardization & Accounting Engine
- [ ] Enhance SQLite schema (`tools/schema.sql`) to implement true double-entry bookkeeping (`account_journal` with Debit/Credit balance equality $\sum Dr = \sum Cr$).
- [ ] Distinguish cash balance, revenue, expense, inventory asset valuation, and accounts payable/receivable.
- [ ] Add `idempotency_key` and action journal to prevent duplicate execution upon agent retries.
- [ ] Ensure all multi-step state mutations execute inside atomic SQLite `BEGIN TRANSACTION ... COMMIT` blocks with rollback on error.

### [P2] Simulation Core Pipeline
- [ ] Create `engine/sim-core.js` and module hierarchy:
  - `engine/rules.js`: Mathematical formulas (Skill check DCs, BOM consumption, scrap/defect rates, military rations).
  - `engine/actions.js`: Deterministic action handlers (`trade_buy`, `trade_sell`, `production_batch`, `payroll`).
  - `engine/projector.js`: Auto-generates `game/PROGRESS.md` from SQLite state.
- [ ] Guarantee LLMs propose actions, but only the Simulation Core executes and mutates state.

### [P3] Deterministic Randomness & Automated Test Suite
- [ ] Implement seeded PRNG (`engine/random.js`) for deterministic replayability.
- [ ] Build test suite in `tests/`:
  - `tests/test-audit.js`: Negative tests proving audit fails when cash or stock is corrupted.
  - `tests/test-core-actions.js`: Unit tests for trade, production, insufficient funds, and idempotency.
  - `tests/test-reproducibility.js`: Replay test verifying identical seed + action stream yields identical state.

### [P4] NPC Systems & Enterprise Scaling
- [ ] Implement rule/utility based autonomous behavior for workshop staff (`NPC-0007` Chen Bao) without burning LLM inference tokens.
- [ ] Track workshop delegation, maintenance, and regional demand dynamics.

---

## 3. Definition of Done (DoD)
1. `node tools/sim-audit.js` audits SQLite directly and fails loudly if any discrepancy exists.
2. Negative tests prove auditor catches corrupted cash, negative inventory, or missing projection.
3. Every economy, production, and military action is executed atomically by `engine/sim-core.js`.
4. Idempotency guarantees repeated calls do not duplicate balance changes.
5. All tests pass with exit code 0.
6. Documentation (`PLAN.md`, `PROGRESS.md`, `DECISIONS.md`, `KNOWN_ISSUES.md`, `CHANGELOG.md`, `HANDOFF.md`) is up-to-date and accurate.
