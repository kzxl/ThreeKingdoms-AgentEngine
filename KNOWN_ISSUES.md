# Known Issues & Technical Debt (KNOWN_ISSUES.md)

This document tracks identified bugs, security/correctness flaws, and technical debt in `ThreeKingdoms-AgentEngine`.

---

## High Priority Issues (P0)

### ISSUE-P0-01: Auditor Reads Markdown Instead of SQLite Primary Truth
- **Component**: `tools/sim-audit.js` (lines 13-15, 30-156)
- **Symptom**: Auditor parses regex from `game/ledger/cashflow.md` and `inventory.md`. If SQLite `saves/session.db` has different numbers, the auditor does not verify the database.
- **Impact**: False confidence. The database (single source of truth) can be completely corrupted while audit reports green.
- **Fix**: Re-engineer `sim-audit.js` to query SQLite directly, verifying SQLite table invariants, and checking that Markdown projections match SQLite.

### ISSUE-P0-02: Silent False Pass on Missing `PROGRESS.md`
- **Component**: `tools/sim-audit.js` (line 159)
- **Symptom**: `if (!fs.existsSync(PROGRESS_PATH)) return { hasDiscrepancy: false, errors: [] };`
- **Impact**: If `PROGRESS.md` is deleted or fails to generate, the audit returns success without error.
- **Fix**: Treat missing `PROGRESS.md` as a critical failure.

### ISSUE-P0-03: Hardcoded Success Message in Auditor
- **Component**: `tools/sim-audit.js` (line 227)
- **Symptom**: Hardcoded string `🟢 OVERALL AUDIT VERDICT: 100% RECONCILED / ZERO DEFECT`.
- **Impact**: Misleading logs and reports.
- **Fix**: Generate dynamic verification counts: number of transactions verified, conservation checks passed, balance checks passed.

### ISSUE-P0-04: Inventory Audit Does Not Verify Physical Conservation
- **Component**: `tools/sim-audit.js` (lines 135-146)
- **Symptom**: `auditInventory()` parses movement lines and counts them, but never calculates whether $\text{Current Stock} == \text{Initial} + \sum \text{Stock In} - \sum \text{Stock Out}$ per item code.
- **Impact**: Any item can experience inventory drift or negative balance without detection.
- **Fix**: Calculate mathematically for each SKU in SQLite that current stock equals initial plus net stock movements.

### ISSUE-P0-05: Hardcoded Machine Path in `sim-checkpoint.js`
- **Component**: `tools/sim-checkpoint.js` (line 160)
- **Symptom**: References `node E:\Tools\SemanticBrain\tools\git-safe-commit.js`.
- **Impact**: Crashes on any environment other than the original author's workstation.
- **Fix**: Remove external workstation paths. Use local git commands or standard cross-platform wrappers.

---

## Architecture & Transaction Issues (P1 & P2)

### ISSUE-P1-01: Single-Entry Cash Ledger Confused with Double-Entry Accounting
- **Component**: `tools/schema.sql` (table `cashflow_ledger`)
- **Symptom**: Only records inflow and outflow in a single row without corresponding debit and credit accounts.
- **Impact**: Cannot mathematically balance assets, liabilities, equity, revenue, and expenses.
- **Fix**: Introduce `account_journal` table with strict debit = credit constraint for every financial transaction.

### ISSUE-P1-02: No Idempotency Protection for Agent Retries
- **Component**: `tools/sim-db.js`
- **Symptom**: Calling transaction or trade actions multiple times creates duplicate records and inflates balances.
- **Impact**: Agent retry loops cause double-spending or ghost assets.
- **Fix**: Add `idempotency_key` checking in transaction handling.

### ISSUE-P2-01: Absence of Deterministic Simulation Core
- **Component**: `engine/` (currently nonexistent)
- **Symptom**: State mutations are done by ad-hoc SQL or scripts rather than passing through a unified rule validation and execution engine.
- **Impact**: The LLM can write arbitrary values without condition checks (e.g. buying goods without cash).
- **Fix**: Implement `engine/sim-core.js` with unified pipeline (`Validate -> Condition Check -> Rule Resolver -> Atomic SQLite -> Invariant Check`).
