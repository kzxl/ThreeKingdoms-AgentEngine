# ThreeKingdoms-AgentEngine

An autonomous, deterministic simulation engine modeling the Three Kingdoms era (beginning 184 AD). Powered by agentic workflows, an embedded ACID-compliant SQLite session database, immutable master seed data, and causational event propagation.

For comprehensive technical specifications, data flows, and state machine diagrams, refer to [**ARCHITECTURE.md**](ARCHITECTURE.md).

---

## Table of Contents
1. [Core Philosophy](#core-philosophy)
2. [Player Guide & Career Paths](#player-guide--career-paths)
3. [Command Syntax & How to Play](#command-syntax--how-to-play)
4. [Engine Framework vs. Playthrough Decoupling](#engine-framework-vs-playthrough-decoupling)
5. [Storage Architecture & SQLite Session Engine](#storage-architecture--sqlite-session-engine)
6. [CLI Verification & Database Tools](#cli-verification--database-tools)
7. [Economic, Production & Military Formulas](#economic-production--military-formulas)
8. [Starting a New Campaign or Resuming](#starting-a-new-campaign-or-resuming)

---

## Core Philosophy

- **Engine Skeleton on Git**: The Git repository contains strictly the immutable rules, mathematical formulas, master world seeds (Year 184 AD initial state), and verification tools. Active player saves and database files are isolated locally and ignored by Git.
- **Zero Ephemeral Hallucination**: No wealth, weapon, army, relationship, or historical event exists unless it is substantiated in the database/ledger and verified via deterministic formulas.
- **Immutable Master Canvas**: Master NPC and world dossiers (`game/master/`) are strictly read-only. All character development, sentiment changes, and territorial conquests are recorded as session deltas.
- **Auditable Double-Entry Bookkeeping**: Money and inventory are strictly conserved. Every copper coin (`Qian`) and bundle of grain (`Dan`) is tracked via unique transaction IDs (`TXN-`) and stock movements (`MOV-`).

---

## Player Guide & Career Paths

You begin in Year 184 AD (Month 2 / Early Spring) during the outbreak of the Yellow Turban Rebellion. Your default character is **Liang Yan** (Lương Nhan / 梁彦, styled *Zhiyuan*), a 21-year-old scholar-artisan owning a small workshop in Zhuo County, Youzhou.

You can pursue any lifestyle or strategy:
- **The Merchant Tycoon**: Procure materials, manage workshop SOPs, execute inter-provincial arbitrage (e.g. coastal salt trade), amass grain and gold.
- **The Frontier Warlord**: Fund volunteer militia, secure iron weapons, drill infantry, suppress warlords, gain imperial rank.
- **The Imperial Courtier**: Pass imperial exams, navigate court politics (Eunuchs vs. Scholar-Gentry), secure provincial governorships.
- **The Clan Patriarch**: Build fortified manors (Ô bảo), educate kinsmen, maintain private security forces.

---

## Command Syntax & How to Play

You can command the engine using natural language (Vietnamese or English):

### General & Simulation Commands
| Command (VN) | Command (EN) | Effect |
|---|---|---|
| `mô phỏng 1 tháng` | `simulate 1 month` | Executes 1 standard monthly business, production, payroll, and geopolitical cycle. |
| `mô phỏng 1 ngày` | `simulate 1 day` | Resolves micro-actions, local meetings, or tactical negotiations. |
| `kiểm toán` | `audit` | Performs a full mathematical reconciliation of cash, inventory, and invariants. |
| `xem trạng thái` | `status` | Displays character dashboard, liquid cash, grain reserve, net worth, and location. |
| `xuất tiến trình` | `export progress` | Compiles active SQLite state to `game/PROGRESS.md` for human viewing. |

---

## Engine Framework vs. Playthrough Decoupling

The repository is strictly decoupled between the **Engine Framework** (versioned in Git) and **Playthrough Sessions** (local only):

```text
ThreeKingdoms-AgentEngine/
├── ARCHITECTURE.md             # Complete technical architecture specification
├── README.md                   # Operational manual & gameplay guide
├── .gitignore                  # Prevents playthrough databases & saves from touching Git
│
├── tools/                      # Deterministic CLI Verification & SQLite Layer
│   ├── sim-db.js               # SQLite CLI session manager & query bridge
│   ├── schema.sql              # Database DDL schema (ACID tables & invariants)
│   ├── sim-audit.js            # Independent double-entry accounting auditor
│   └── sim-checkpoint.js       # Snapshot creator & local archiver
│
└── game/
    ├── RULES.md                # [IMMUTABLE] Dice check DCs, combat & production formulas
    ├── ECONOMY.md              # [IMMUTABLE] Currency standards, 184 AD commodity price index
    ├── TECHNIQUES.md           # [IMMUTABLE] 5-tier skill progression trees
    ├── FACTIONS.md             # [IMMUTABLE] Realm factions baseline
    ├── WORLD_STATE.md          # [IMMUTABLE] Year 184 AD macro indicators
    ├── PROGRESS.template.md    # Blank template blueprint for new campaigns
    │
    ├── master/                 # [IMMUTABLE MASTER SEED WORLD]
    │   ├── characters/         # Pristine 184 AD character sheets (Liu Bei, Guan Yu, etc.)
    │   ├── locations/          # Pristine commandery dossiers (Zhuo, Luoyang, Julu, Qingzhou)
    │   ├── businesses/         # Starting workshop baseline (BIZ-0001)
    │   └── organizations/      # Guilds & magistrate bureaus
    │
    └── [LOCAL PLAYTHROUGH ONLY - IGNORED BY GIT]
        ├── saves/session.db    # Live SQLite database for active campaign
        └── game/PROGRESS.md    # Auto-projected hot buffer for player & AI agent
```

---

## CLI Verification & Database Tools

The engine provides native Node.js tools in `tools/` that guarantee mathematical integrity and enable rapid querying:

### 1. Session Database Manager (`tools/sim-db.js`)
```bash
# Initialize a new game campaign
node tools/sim-db.js init CMP-0001 "Liang Yan"

# Check campaign summary and total net worth
node tools/sim-db.js status

# Query state via SQL (sub-millisecond, zero token waste)
node tools/sim-db.js query "SELECT * FROM inventory_items WHERE quantity > 0;"

# Re-compile and export game/PROGRESS.md
node tools/sim-db.js export-progress
```

### 2. Invariant Auditor (`tools/sim-audit.js`)
Audits all double-entry cashflow transactions, physical inventory movements, and hot buffer synchronization.
```bash
node tools/sim-audit.js
```
- Validates that $Cash_{\text{End}} = Cash_{\text{Start}} + \sum Inflow - \sum Outflow$.
- Verifies physical stock conservation (materials purchased/produced = materials consumed/stored).
- Exits with code `0` on 100% reconciliation; fails loudly if any balance discrepancy is detected.

---

## Economic, Production & Military Formulas

All actions are resolved deterministically using clear formulas defined in `game/RULES.md`:

### 1. Skill Check Resolution
$$\text{Check Score} = (\text{Attribute} \times 0.5) + (\text{Skill Level} \times 0.5) + \text{Modifiers} + d20$$
- **DC 30**: Routine | **DC 45**: Moderate | **DC 60**: Challenging | **DC 75**: Formidable | **DC 90**: Masterstroke / Legendary.

### 2. Workshop Production & Defect Rate
$$\text{Max Capacity} = \frac{\text{Craftsmen} \times \text{Hours/Day} \times \text{Days/Month}}{\text{Labor Hours per Unit}}$$
$$\text{Defect Rate (\%)} = \max\left(2\%,\; \text{Base Defect} - (\text{Lead Artisan CRA} \times 0.15\%) + \text{Fatigue Penalty}\right)$$

### 3. Military Provisioning
- 1 Soldier consumes **0.1 Dan of grain per month** (~3 kg/day).
- 1,000 Soldiers require **100 Dan of grain/month**.
- War horses consume **0.3 Dan of grain and fodder per month**.

---

## Starting a New Campaign or Resuming

1. **To Start a New Campaign**:
   ```bash
   node tools/sim-db.js init CMP-184-CUSTOM "Your Character Name"
   node tools/sim-db.js export-progress
   ```
2. **To Resume Playing**:
   Instruct the AI Agent:
   > *"Read `game/PROGRESS.md` and check `node tools/sim-db.js status`. Act as the Three Kingdoms Engine and await my command."*
