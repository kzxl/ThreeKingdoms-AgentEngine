# Agent Handoff Guide (HANDOFF.md)

## 1. Executive Summary
The `ThreeKingdoms-AgentEngine` has been upgraded to an industrial-grade, deterministic architecture:
- **Primary Source of Truth**: SQLite (`saves/session.db`).
- **Human & Agent View**: Auto-projected Markdown (`game/PROGRESS.md`).
- **Core Engine Skeleton**: Git tracks rules, master seed data (`game/master/`), tools, and tests. Playthrough data is completely isolated in local SQLite and excluded from Git by `.gitignore`.
- **Validation Pipeline**: Full Simulation Core (`engine/sim-core.js`) with condition checking, atomic SQLite transactions, and idempotency protection.
- **Independent Auditor**: `tools/sim-audit.js` verifies 52 invariants directly against SQLite.

---

## 2. Directory Layout & Key Modules
```text
ThreeKingdoms-AgentEngine/
├── engine/                     # Simulation Core Engine Layer
│   ├── rules.js                # Mathematical formulas (DCs, BOM, scrap rate, prices)
│   ├── random.js               # Seeded Mulberry32 PRNG for deterministic replay
│   ├── sim-core.js             # Action dispatcher, condition checks, atomic SQLite transactions
│   └── projector.js            # Auto-renders game/PROGRESS.md from SQLite
│
├── tools/                      # Tooling & Maintenance
│   ├── schema.sql              # Master DDL with double-entry journal & action log
│   ├── sim-audit.js            # Invariant & state auditor
│   ├── sim-checkpoint.js       # Local snapshot archiver
│   └── sim-db.js               # SQLite CLI query bridge
│
├── tests/                      # Automated Test Suite (100% Passing)
│   ├── test-audit.js           # Tests positive reconciliation & negative failure detections
│   ├── test-core-actions.js    # Tests trade, production BOM, insufficient funds, idempotency
│   ├── test-reproducibility.js # Tests seed determinism & replay across isolated databases
│   └── run-all-tests.js        # Central runner
│
├── game/
│   ├── master/                 # Strictly READ-ONLY 184 AD master seed world
│   ├── RULES.md                # Engine rule specifications
│   ├── ECONOMY.md              # 184 AD economic standards
│   └── PROGRESS.template.md    # Template for blank campaigns
│
└── [LOCAL ONLY - IGNORED BY GIT]
    ├── saves/session.db        # Active SQLite campaign database (ACID)
    └── game/PROGRESS.md        # Compiled live dashboard
```

---

## 3. Essential Verification Commands
```bash
# 1. Run full test suite across all modules (14 tests total)
node tests/run-all-tests.js

# 2. Run independent invariant audit on active database
node tools/sim-audit.js

# 3. Check active campaign status from SQLite
node tools/sim-db.js status

# 4. Re-compile projection view
node tools/sim-db.js export-progress
```

---

## 4. Current State & Next Steps
- **Active Campaign State (Liang Yan)**:
  - Turn 6 (Year 184 AD, Month 5, Day 2).
  - Location: Guangzong Citadel (`LOC-0003`).
  - Cash: **24,200 Qian** (21,200 mobile + 3,000 safe).
  - Inventory: **47,577.5 Qian** (12 SKUs).
  - Net Worth: **91,378 Qian**.
  - All 17 transactions verified for double-entry parity.
- **Next Phase (P4)**:
  - Implement utility-based autonomous dispatch for Foreman Chen Bao (`NPC-0007`) to manage monthly workshop cycles in Zhuo County without LLM inference overhead.
