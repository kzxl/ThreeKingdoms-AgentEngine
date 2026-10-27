# Engine Engineering Progress (PROGRESS.md)

## Current Status: Giai đoạn P0, P1, P2, P3 Hoàn Thành (100% Tests Passed)

---

### 1. Files Inspected & Modified
- `tools/sim-audit.js`:
  - **Refactored**: Switched from reading regex Markdown tables to directly querying SQLite (`saves/session.db`) as the primary single source of truth.
  - **Enhanced**: Added mathematical cashflow verification, SKU-level physical inventory conservation & non-negativity checks, double-entry journal balance ($\sum Dr = \sum Cr$), and strict projection synchronization.
  - **Fixed**: Removed silent false pass when `PROGRESS.md` is missing. Replaced hardcoded "100% Reconciled" text with exact count of verified invariants.
- `tools/schema.sql`:
  - **Enhanced**: Added `account_journal` table for double-entry bookkeeping (Chart of Accounts).
  - **Enhanced**: Added `action_log` table with `idempotency_key` and execution status for replay protection.
  - **Enhanced**: Added `random_seed` in `campaign_meta`.
- `tools/sim-checkpoint.js`:
  - **Fixed**: Removed hardcoded external workstation paths (`E:\Tools\SemanticBrain...`).
  - **Fixed**: Disabled unprompted git push to ensure compliance with User Rule #8.
- `engine/`:
  - `engine/rules.js`: Implemented deterministic formulas for skill checks, workshop capacity, defect rate calculation, and commodity benchmarks.
  - `engine/random.js`: Implemented seeded Mulberry32 PRNG for deterministic simulation replay.
  - `engine/projector.js`: Automated rendering of `game/PROGRESS.md` from SQLite state.
  - `engine/sim-core.js`: Implemented unified Simulation Core pipeline (`Validate -> Condition Check -> Rule Resolver -> Atomic SQLite -> Invariant Check`).
- `tests/`:
  - `tests/test-audit.js`: 5/5 tests passed (positive reconciliation, missing projection failure, corrupted cash failure, stock movement mismatch failure, SQLite CHECK constraint enforcement).
  - `tests/test-core-actions.js`: 6/6 tests passed (trade buy, insufficient funds rejection, trade sell, insufficient stock rejection, BOM production with defect rate, idempotency duplicate prevention).
  - `tests/test-reproducibility.js`: 3/3 tests passed (PRNG determinism, skill check reproducibility, multi-action replay parity across isolated databases).
  - `tests/run-all-tests.js`: Central runner verifying all 3 test suites.

---

### 2. Concrete Verification & Test Results
```text
====================================================
 🚀 RUNNING FULL THREE-KINGDOMS ENGINE TEST SUITE
====================================================
>>> Executing: test-audit.js...
  ✅ PASSED: Clean database verified with 0 discrepancies.
  ✅ PASSED: Missing PROGRESS.md correctly caused audit failure.
  ✅ PASSED: Auditor successfully detected mathematical cash corruption.
  ✅ PASSED: Auditor successfully detected stock movement discrepancy.
  ✅ PASSED: SQLite CHECK constraint actively blocks negative inventory.
  🟢 ALL AUDITOR TESTS PASSED (5/5)

>>> Executing: test-core-actions.js...
  ✅ PASSED: Buy trade succeeded with balanced double-entry accounting.
  ✅ PASSED: Insufficient funds rejected cleanly with zero state mutation.
  ✅ PASSED: Sell trade succeeded and updated cash & inventory atomically.
  ✅ PASSED: Insufficient stock rejected cleanly.
  ✅ PASSED: Produced 9 mats (Defect: 2.0%), materials deducted per BOM.
  ✅ PASSED: Idempotency strictly blocked duplicate state modification.
  🟢 ALL CORE ACTION TESTS PASSED (6/6)

>>> Executing: test-reproducibility.js...
  ✅ PASSED: 100 random rolls were 100% identical between runs.
  ✅ PASSED: Skill check scores and DC outcomes matched 100% across separate runs.
  ✅ PASSED: Replay across independent databases yielded 100% identical states and double-entry journals.
  🟢 ALL REPRODUCIBILITY TESTS PASSED (3/3)

====================================================
 🏆 ALL TEST SUITES PASSED (3/3)
====================================================
```

---

### 3. Production Database Invariant Audit
```text
====================================================
 ⚡ ThreeKingdoms-AgentEngine: Invariant & State Auditor
====================================================
[1] CASHFLOW LEDGER (SQLite Primary Truth):
    Transactions Verified : 17
    Closing Cash Balance  : 24,200 Qian
    ✅ Passed: Inflow/Outflow sequence balances exactly.
[2] PHYSICAL INVENTORY (SQLite Conservation):
    Tracked Items in Store: 12 SKUs
    Movement Records      : 2 entries
    Total Inventory Value : 47,577.5 Qian
    ✅ Passed: Quantity non-negativity and movement balances verified.
[3] DOUBLE-ENTRY JOURNAL (Dr/Cr Parity):
    Journal Sets Checked  : 17
    ✅ Passed: Every transaction debits == credits exactly.
[4] PROJECTION SYNCHRONIZATION (game/PROGRESS.md):
    ✅ Passed: PROGRESS.md matches SQLite state across all metrics.
====================================================
 🟢 AUDIT VERDICT: PASSED
    Total Invariants Verified: 52
    Discrepancies Detected   : 0
====================================================
```

---

### 4. Remaining Work / Next Steps
- **P4 (NPC & Enterprise Scaling)**: Add utility-based autonomous decision scoring for workshop retainers (Chen Bao `NPC-0007`) to simulate monthly background production without LLM token waste.
