# Known Issues & Technical Debt (KNOWN_ISSUES.md)

This document tracks identified bugs, security/correctness flaws, and technical debt in `ThreeKingdoms-AgentEngine`.

---

## High Priority Issues (P0)

### ISSUE-P0-01: Auditor Reads Markdown Instead of SQLite Primary Truth [RESOLVED]
- **Component**: `tools/sim-audit.js`
- **Resolution**: Refactored `tools/sim-audit.js` to query SQLite directly (`saves/session.db`), verifying all invariants from primary relational data and asserting that projection markdown files match SQLite state.

### ISSUE-P0-02: Silent False Pass on Missing `PROGRESS.md` [RESOLVED]
- **Component**: `tools/sim-audit.js`
- **Resolution**: Auditor explicitly checks for `PROGRESS.md` existence and terminates with error code 1 if the projection is missing. Tested by `test-audit.js`.

### ISSUE-P0-03: Hardcoded Success Message in Auditor [RESOLVED]
- **Component**: `tools/sim-audit.js`
- **Resolution**: Replaced static text with dynamic counters: `Total Invariants Verified` (e.g. 63), `Discrepancies Detected: 0`.

### ISSUE-P0-04: Inventory Audit Does Not Verify Physical Conservation [RESOLVED]
- **Component**: `tools/sim-audit.js`
- **Resolution**: Added SKU-level verification comparing `inventory_items.quantity` against `stock_movements.balance_after` and verifying non-negativity across all tracked items.

### ISSUE-P0-05: Hardcoded Machine Path in `sim-checkpoint.js` [RESOLVED]
- **Component**: `tools/sim-checkpoint.js`
- **Resolution**: Removed hardcoded workstation paths. Git operations use standard local commands.

---

## Architecture & Transaction Issues (P1, P2 & P4)

### ISSUE-P1-01: Single-Entry Cash Ledger Confused with Double-Entry Accounting [RESOLVED]
- **Component**: `tools/schema.sql` (table `account_journal`)
- **Resolution**: Implemented `account_journal` with true debit/credit parity ($\sum Dr = \sum Cr$) and standardized chart of accounts. Audited in `sim-audit.js`.

### ISSUE-P1-02: No Idempotency Protection for Agent Retries [RESOLVED]
- **Component**: `tools/schema.sql` (table `action_log`)
- **Resolution**: Added `action_log` with unique `idempotency_key`. `SimulationCore` and `WorkshopEngine` reject repeated executions of the same key.

### ISSUE-P2-01: Absence of Deterministic Simulation Core [RESOLVED]
- **Component**: `engine/sim-core.js`
- **Resolution**: Built centralized `SimulationCore` enforcing: `Validate -> Condition Check -> Rule Resolver -> Atomic SQLite -> Invariant Check`.

### ISSUE-P4-01: Autonomous Enterprise Workshop & NPC Scaling [RESOLVED]
- **Component**: `engine/workshop-engine.js`
- **Resolution**: Built zero-token autonomous workshop simulation engine using utility AI scoring, BOM material consumption/auto-procurement, defect rate mitigation via artisan traits, safe cash solvency guards, and NPC skill leveling ladders (`npc_skills`). Fully tested in `tests/test-npc-ai.js`.
