# Agent Handoff Guide (HANDOFF.md)

## 1. Executive Summary
The `ThreeKingdoms-AgentEngine` has been upgraded to an industrial-grade, deterministic architecture with a modern tactical Web UI:
- **Primary Source of Truth**: SQLite (`saves/session.db`).
- **Human & Agent View**: Auto-projected Markdown (`game/PROGRESS.md`) & Live Tactical Web UI (`http://localhost:3300`).
- **Core Engine Skeleton**: Git tracks rules, master seed data (`game/master/`), tools, and tests. Playthrough data is completely isolated in local SQLite and excluded from Git by `.gitignore`.
- **Validation Pipeline**: Full Simulation Core (`engine/sim-core.js`) with condition checking, atomic SQLite transactions, and idempotency protection.
- **Independent Auditor**: `tools/sim-audit.js` verifies 70 invariants directly against SQLite.
- **Autonomous NPC & Workshop Engine**: `engine/workshop-engine.js` simulates monthly background operations using zero-token utility AI with full BOM material consumption, payroll disbursements, double-entry accounting, and NPC skill leveling.
- **Live Agent Bridge & Tactical Web UI**: `public/` and `tools/sim-web.js` feature a 2-column layout (70% Left narrative, hero encounter, D20 dice checks, branching choices, Omni Command Bar; 30% Right relations milestone, inventory mini-table, NPC retainers, real-time ledger) adhering to Anti-AI-Slop standards.

---

## 2. Directory Layout & Key Modules
```text
ThreeKingdoms-AgentEngine/
├── engine/                     # Simulation Core Engine Layer
│   ├── rules.js                # Mathematical formulas (DCs, BOM, scrap rate, prices)
│   ├── random.js               # Seeded Mulberry32 PRNG for deterministic replay
│   ├── sim-core.js             # Action dispatcher, condition checks, atomic SQLite transactions
│   ├── workshop-engine.js      # Zero-token utility AI for autonomous workshop operations & NPC progression
│   └── projector.js            # Auto-renders game/PROGRESS.md from SQLite
│
├── tools/                      # Tooling & Maintenance
│   ├── schema.sql              # Master DDL with double-entry journal, action log, NPC state, skills, businesses
│   ├── sim-audit.js            # Invariant & state auditor (63 checks)
│   ├── sim-checkpoint.js       # Local snapshot archiver
│   ├── sim-db.js               # SQLite CLI query bridge & management console
│   └── sim-web.js              # Zero-dependency Web UI HTTP Server & REST API
│
├── public/                     # Modern Dark-Theme Web UI Dashboard
│   ├── index.html              # Single Page Application
│   ├── styles.css              # Han martial strategy & imperial ledger aesthetic
│   └── app.js                  # Reactive state, charts, action dispatchers, live audit
│
├── tests/                      # Automated Test Suite (100% Passing - 20/20 Tests)
│   ├── test-audit.js           # Tests positive reconciliation & negative failure detections
│   ├── test-core-actions.js    # Tests trade, production BOM, insufficient funds, idempotency
│   ├── test-reproducibility.js # Tests seed determinism & replay across isolated databases
│   ├── test-npc-ai.js          # Tests autonomous workshop cycle, BOM, payroll, promotions, solvency guard
│   └── run-all-tests.js        # Central runner (executes all 4 suites)
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
# 1. Run full test suite across all modules (20 tests total)
node tests/run-all-tests.js

# 2. Run independent invariant audit on active database (63 invariants)
node tools/sim-audit.js

# 3. Check active campaign status from SQLite
node tools/sim-db.js status

# 4. View active NPCs and their skill tiers
node tools/sim-db.js list-npcs

# 5. Inspect autonomous enterprise facility
node tools/sim-db.js show-business BIZ-0001

# 6. Run autonomous monthly workshop simulation (test cycle)
node tools/sim-db.js simulate-workshop BIZ-0001 184-05-30 1840501

# 8. Start interactive Web UI server (Default port: 3300)
node tools/sim-web.js 3300
# Open in browser: http://localhost:3300
```

---

## 4. Current State & Next Steps
- **Active Campaign State (Liang Yan)**:
  - Turn 6 (Year 184 AD, Month 5, Day 2).
  - Location: Guangzong Citadel (`LOC-0003`).
  - Cash: **24,200 Qian** (21,200 mobile + 3,000 safe).
  - Inventory: **47,577.5 Qian** (12 SKUs).
  - Fixed Capital: **19,600 Qian**.
  - Net Worth: **91,378 Qian**.
  - All 17 transactions verified for double-entry parity.
- **Autonomous Retainers & Workshop**:
  - `BIZ-0001` (Liang Clan Workshop) in Zhuo County actively managed by Foreman Chen Bao (`NPC-0007`).
  - 4 active retainers assigned (`NPC-0007` to `NPC-0010`).
  - Safe cash float: 3,000 Qian dedicated to Zhuo Workshop safe.
- **Engine Evolution**:
  - Phases P0, P1, P2, P3, and P4 are complete and mathematically verified.
  - The engine is fully primed for high-agency narrative gameplay, strategic salt trading, and military campaign maneuvers.
