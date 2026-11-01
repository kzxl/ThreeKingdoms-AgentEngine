# ThreeKingdoms-AgentEngine: Master Test Infrastructure (TEST_INFRA.md)

## 1. Executive Overview

The **ThreeKingdoms-AgentEngine** test infrastructure provides an autonomous, multi-tier, opaque-box verification framework for simulating the Three Kingdoms era. The test harness strictly validates business logic, mathematical formulations, domain contracts, and database states while upholding **zero-drift accounting conservation** across the primary SQLite database (`saves/session.db`).

### Key Invariant Principles:
1. **Double-Entry Journal Parity**: Every financial transaction must satisfy $\sum \text{Debit} = \sum \text{Credit}$ with zero imbalance.
2. **Physical Stock Conservation**: Physical inventory quantities are non-negative and mathematically match stock movements: $\text{BalanceAfter} = \text{BalanceBefore} \pm \text{Quantity}$.
3. **Cashflow Ledger Balance Parity**: Running cash balance in `cashflow_ledger` must equal `player_state.liquid_cash + player_state.safe_cash`.
4. **Idempotence & Complete Teardown**: Verification suites must snapshot baseline state, execute adversarial tests, and completely restore primary truth without leaving orphaned records or inducing audit discrepancies.
5. **Anti-AI-Slop Compliance**: Battle chronicles, dialogue, and toasts must utilize authentic Hanzi typography and Sino-Vietnamese terminology, with zero juvenile emojis.

---

## 2. Multi-Tier Verification Architecture

```
+-------------------------------------------------------------------------+
|                  TIER 4: State & Audit Invariant Layer                  |
|          tools/sim-audit.js (1,546 invariants, 8 blocks)                 |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------+------------------------------------+
|               TIER 3: End-to-End Service Integration Suites             |
| tests/verify-marriage-lineage.ts | tests/verify-rotk-duels.ts           |
| tests/verify-tavern-banquets.ts  | tests/test-branch4-logistics.ts      |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------+------------------------------------+
|               TIER 2: Core Domain & Progression Services                |
| tools/verify-equipment-and-exp.ts | tools/verify-enterprise-labor.ts     |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------+------------------------------------+
|               TIER 1: Static Type & Schema Contracts                    |
|       npm run typecheck (tsc --noEmit) | tools/schema.sql DDL          |
+-------------------------------------------------------------------------+
```

### Tier 1: Static Contracts & Schema Integrity
- **TypeScript Typecheck**: Validates strict interface contracts, parameter DTOs, return types, and absence of `any` escapes across all modules (`tsc --noEmit`).
- **SQLite DDL & Constraints**: Enforces primary keys, foreign keys (`PRAGMA foreign_keys = ON`), `CHECK` constraints (e.g. `liquid_cash >= 0`, `pregnancy_stage BETWEEN 0 AND 3`), and index lookups.

### Tier 2: Core Domain & Progression Services
- **Diminishing Returns EXP Progression**: Validates threshold scalings (100 EXP for stat $\le 90$, 150 EXP for stat $91..99$, 250 EXP for stat $\ge 100$).
- **Equipment Clamping**: Strictly enforces that equipment attribute bonuses are clamped within `[+1..+5]` points per attribute.
- **Enterprise & Labor System**: Verifies owner mode revenue accrual and wage-worker shifts.

### Tier 3: End-to-End Sandbox Simulation Suites
- **Marriage & Lineage (`tests/verify-marriage-lineage.ts`)**: Validates courtship eligibility ($\text{Affinity} \ge 80$), dowry schedules, cohabitation, 3-stage gestation, genetic inheritance algorithms, master mentorship, and dynastic succession continuity.
- **Single Combat Duels (`tests/verify-rotk-duels.ts`)**: Validates 1v1 tactical duels, 4 asymmetric commands (`ATTACK`, `DEFEND`, `SPECIAL_STRIKE`, `FOCUS_SPIRIT`), gear bonus scaling, golden cap ($>100$ WAR), and contextual triggers (sparring, arena, caravan ambushes).
- **Tavern Banquets & Brotherhood (`tests/verify-tavern-banquets.ts`)**: Validates gourmet dishes and Dukang wine BOM, 3 banquet tiers, inventory deduction, Peach Garden sworn brotherhood oath ($\text{Affinity} \ge 80$), and retainer recruitment into `FAC-LIANG-CLAN`.
- **Action Time Authority (`tests/verify-action-time-authority.ts`)**: A spar consumes five days, a social interaction two, and a fatigued action is rejected without moving the clock.
- **Workshop Economy (`tests/verify-workshop-economy.ts`)**: Staffing scales output, rent/wages are charged, losses become debt, profit repays debt first.
- **Career Paths (`tests/verify-career-paths.ts`)**: Five scores, `outcome_type` duel wins, modifiers, and a real WAR EXP award.
- **Data Cleanup (`tests/verify-data-cleanup.ts`)**: Skill/item text is repaired, numeric legacy currency labels become Quan, prose is preserved, migration is idempotent.
- **Local Market (`tests/verify-local-market.ts`)**: Buying drains stock and raises the next quote, selling adds stock and lowers it, drift/history work, the bridge is keyed per database.
- **Obligations (`tests/verify-obligations.ts`)**: Monthly tax is issued once, payment goes through the ledger, an unpaid bill becomes overdue with a late fee and credibility loss, insufficient funds change nothing.
- **Contract Board (`tests/verify-contract-board.ts`)**: Three deterministic offers per month, accept/deliver consumes real stock and pays the reward, expiry creates a penalty obligation, month close rotates offers.
- **Combat Consequences (`tests/verify-combat-consequences.ts`)**: An injury reduces effective WAR, NPC death clears the business/faction roster, and one month of rest heals.
- **Intel Reports (`tests/verify-intel.ts`)**: Monthly reports are deterministic, verification reveals the truth, a report cannot be verified twice, and a 20%-off claim is flagged false.
- **Farmland (`tests/verify-farm.ts`)**: Rent reaches the landlord, out-of-season crops are rejected, early harvest is rejected, harvest adds real grain, double rent and insufficient cash fail, and leases expire.
- **Ledger Completeness (`tests/verify-ledger-completeness.ts`)**: Migration 049 backfills orphan cashflow rows and `postDoubleEntry` writes a balanced pair.
- **Core Time Coverage (`tests/verify-core-time-coverage.ts`)**: Trade costs 2 days, reinforcement 1, movement 1 through the real router.
- **Idempotency (`tests/verify-idempotency.ts`)**: Trade, reinforcement and farm rent replay without double cash, inventory, troops, lease or days.
- **Faction Ledger (`tests/verify-faction-ledger.ts`)**: Opening balances, a rent flow, drift detection and outflow clamping keep `opening + inflow − outflow = treasury_cash`.
- **Settlement Ledger (`tests/verify-settlement-ledger.ts`)**: Opening, a loot flow and drift detection keep every settlement treasury balanced.
- **World Atomicity (`tests/verify-world-atomic.ts`)**: A world module that throws rolls back its write and aborts the close; a successful module commits.
- **Day Phases (`tests/verify-day-phases.ts`)**: Three admin phases fill a day, a day action resets the phase, and quest accept spends one phase.
- **Schema Contract (`tests/verify-schema-contract.ts`)**: A fresh schema + migrations database has the 20 runtime tables and required business/NPC columns.

### Tier 4: Invariant & State Conservation Auditor (`tools/sim-audit.js`)
The auditor verifies **1,546 invariants across eight blocks** against SQLite as the
primary truth:
1. Cashflow ledger sequence and player cash parity.
2. Physical inventory non-negativity and movement balance.
3. Double-entry journal `Dr == Cr` parity per transaction set.
4. `game/PROGRESS.md` projection synchronization.
5. NPC and enterprise state (safe cash, debt, efficiency, vitals).
6. Grand-strategy factions, settlements, credit notes and diplomatic pacts.
7. Life-sim maidens, dowries and encounter rates.
8. Campaign clock plausibility and turn-history alignment.

---

## 3. Test Suites Directory & Registry

| Test File | Target Feature / Module | Test Count | Key Invariants Verified |
|---|---|---|---|
| `tests/verify-marriage-lineage.ts` | R1: Life-Sim, Marriage, Childbirth & Succession | 60 | Dowry cashflow parity, genetic inheritance $[-3, +5]$, master mentorship, dynastic asset continuity without breaking `PLY-0001` PK |
| `tests/verify-rotk-duels.ts` | R2: 1v1 Single Combat Dueling | 61 | Gear bonus clamp `[+1..+5]`, Golden Cap $>100$, 4-command clash matrix, knockout/rout/exhaustion, zero-emoji battle texts |
| `tests/verify-tavern-banquets.ts` | R3: Tavern Banquets, Brotherhood & Recruitment | 52 | Gourmet BOM consumption, stock movement conservation, sworn brotherhood ($\text{Affinity} \ge 80$), Tier 5 Fog, retainer loyalty |
| `tools/verify-equipment-and-exp.ts` | Core: Equipment System & EXP Progression | 58 | Diminishing returns scaling, gear slot constraints, effective stats calculation |
| `tools/verify-enterprise-labor.ts` | Core: Enterprise Management & Wage Labor | 12 | Master recipe BOM, owner profit accrual, wage labor shifts, fatigue exhaustion guard |
| `tests/test-branch4-logistics.ts` | Core: Inter-City Caravans & Arbitrage | 8 | 18 settlement profiles, distance matrix, crisis price multipliers, caravan dispatch/claim |
| `tests/verify-action-time-authority.ts` | P0: Server-authoritative action time | — | Day cost per mutation, fatigue rejection, no clock change on rejection |
| `tests/verify-workshop-economy.ts` | P0: Enterprise monthly P&L | — | Staffing, wages, rent, debt, debt-first repayment, zero-staff closure |
| `tests/verify-career-paths.ts` | P0: Career-path resolver | — | Five scores, `outcome_type` duel count, modifiers, WAR EXP application |
| `tests/verify-data-cleanup.ts` | P0: Text and currency repair | — | Skill/item repair, Quan labels, prose preservation, idempotency |
| `tests/verify-local-market.ts` | P1: Local settlement market | — | Buy/sell stock movement, price direction, drift/history, per-DB bridge cache |
| `tests/verify-obligations.ts` | P1: Periodic obligations | — | Issue/idempotency, payment, late fee/credibility, insufficiency, month close |
| `tests/verify-contract-board.ts` | P1: Contract board | — | Rotation, accept, delivery with stock, expiry penalty, month-close rotation |
| `tests/verify-combat-consequences.ts` | RPG: Injuries and NPC death | — | Injury penalty, effective WAR, NPC death clears roster, monthly recovery |
| `tests/verify-intel.ts` | RPG: Intel reports | — | Deterministic monthly reports, verification, double-verify rejection, false claim |
| `tests/verify-farm.ts` | RPG: Farmland and crops | — | Rent/landlord, seasonal planting, early-harvest rejection, real grain output, lease expiry |
| `tests/verify-ledger-completeness.ts` | Core: Ledger/journal completeness | — | Orphan backfill, balanced `postDoubleEntry` |
| `tests/verify-core-time-coverage.ts` | Core: Time authority coverage | — | Trade +2 days, reinforce +1, movement +1 |
| `tests/verify-idempotency.ts` | Core: Idempotent financial actions | — | Replay without double cash/inventory/troops/lease/days |
| `tests/verify-schema-contract.ts` | Core: Runtime schema contract | — | Fresh schema + migrations has runtime tables/columns |
| `tests/verify-faction-ledger.ts` | Core: World treasury ledger | — | Opening + flows = treasury, rent flow, drift detection, outflow clamp |
| `tests/verify-settlement-ledger.ts` | Core: Settlement treasury ledger | — | Opening + flows = treasury, loot flow, drift detection |
| `tests/verify-world-atomic.ts` | Core: Atomic world month close | — | Failed module rolls back, close aborts, successful module commits |
| `tests/verify-day-phases.ts` | Core: Three-phase day | — | Three admin phases fill a day, day action resets, route wiring |
| `tests/verify-loan-contracts.ts` | Extended: Loan contracts | — | Borrow/repay phase, replay, balanced journal |
| `tests/verify-ecology-contracts.ts` | Extended: Ecology contracts | — | Relief phase, assault day/loot ledger, transport stock and replay |
| `tests/verify-profession-contracts.ts` | Extended: Profession contracts | — | Gather/craft days, dividend replay, stock conservation |
| `tests/verify-social-contracts.ts` | Extended: Social contracts | — | Kizuna/banquet days, dish and cash replay |
| `tests/verify-progression-contracts.ts` | Extended: Progression contracts | — | Move day, quest phase/step, replay |
| `tests/verify-duel-contracts.ts` | Extended: Duel contracts | — | Initiation day, round replay, unchanged duel state |
| `tests/verify-lineage-contracts.ts` | Extended: Lineage contracts | — | Aging and mentorship replay, no duplicate growth |
| `tests/verify-life-wiring.ts` | Life: Wiring | — | Mentorship EXP, growth focus, spouse roles, virtue discount |
| `tests/verify-life-layer.ts` | Life: Daily loop | — | Needs, phases, six actions, skill EXP, upkeep ledger, replay |
| `tests/verify-livelihood-depth.ts` | Livelihood: Depth | — | Node stock/regrowth, tool penalty, skill yield, rent/soil/rotation |
| `tools/sim-audit.js` | System: Autonomous Invariant Auditor | 1,546 | Eight blocks: accounting, inventory, journal, projection, enterprise, strategy, life-sim, clock |

---

## 4. Execution Runbook

### Running Individual Test Suites
```bash
# Run one suite with an isolated database copy (pattern filter)
node tools/test-runner.js --only=duel

# Or run a suite directly with tsx against the active database
npx tsx tests/verify-rotk-duels.ts
```

### Full Verification Pipeline
```bash
# Single gate: typecheck → arch ratchet → 74 suites → API contract → write smoke
npm run verify

# Individually:
npm run typecheck      # strict TypeScript
npm run lint           # architecture ratchet (tools/arch-baseline.json)
npm run lint:client    # parse every classic client script (a SyntaxError kills the whole UI file)
npm run lint:ui        # UI debt ratchet (button classes, inline styles, native confirms)
npm run lint:slop      # anti-slop laws: emoji, gradients, glow shadows, font families
npm run lint:api       # client /api/* paths must exist or be allowlisted with a reason
npm run routes:shadow  # fails if a legacy route is already served by the Router
npm test               # 4 legacy + 70 verify-*.ts suites, isolated DB per suite
npm run golden:verify  # 28 read-only endpoint contracts
npm run smoke:write    # 8 HTTP write paths + post-write audit
npm run audit          # 1,546 SQLite invariants in eight blocks
```

### Per-Feature Refactor Protocol
For refactoring or fixing a single feature with proof that logic and performance are
unchanged, use the `refactor-feature-gate` skill. Its mechanical core:

```bash
npm run verify && npm run audit && npm run perf:record   # baseline, clean tree
# ...refactor one slice only...
npm run verify && npm run audit && npm run perf:compare  # same probes, compared
```

`perf:compare` fails on logic drift (body fingerprint changed for the same fixture)
and on p95 regression beyond tolerance. Add new routes to `tools/api-golden.js` and
`tools/perf-probe.js` before relying on them as gates.

### Data Migrations
```bash
npm run migrate:status  # list applied / pending migrations
npm run migrate         # apply pending, idempotent, transactional
```

---

## 5. Database Sandboxing & State Isolation Protocol

To guarantee that test execution never corrupts active session data or causes invariant drift in `saves/session.db`, all test suites must adhere to the **Four-Step Sandboxing Protocol**:

```
[1. SNAPSHOT]
  Record baseline player_state (liquid_cash, safe_cash, vitals),
  inventory quantities, relations, and ledger row counts.
       │
       ▼
[2. EXECUTE]
  Perform multi-tier tests inside transactional scopes or dedicated test IDs
  (e.g., TXN-TEST-*, MAR-TEST-*, DUEL-TEST-*).
       │
       ▼
[3. TEARDOWN (finally block)]
  Revert player_state to snapshot values.
  Delete all test rows from ledger, stock_movements, and child tables.
  Re-export markdown projections: node tools/sim-db.js export-progress.
       │
       ▼
[4. AUDIT GATE]
  Execute node tools/sim-audit.js.
  Assert 1,546 invariants verified with 0 discrepancies.
```

---

## 6. Defect Escalation & QA Protocol

The Test Writer authors opaque-box verification suites and validates them against specifications. If an implementation defect is discovered during test execution, it must be escalated rather than silently patched.

### Escalation Classification:
1. **Critical Defect (P0)**: Invariant violation causing `tools/sim-audit.js` to report discrepancies (unbalanced Dr/Cr, negative stock, cashflow drift).
2. **Major Defect (P1)**: Business rule violation (e.g. allowing sworn brotherhood when Affinity $< 80$, missing capacity limit check in banquets).
3. **Minor Defect (P2)**: Narrative typographical variance or missing localized fallback text.
