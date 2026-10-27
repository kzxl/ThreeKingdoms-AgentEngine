# Agentic Three Kingdoms Simulation Engine

## Overview
The **Agentic Three Kingdoms Simulation Engine** is a deterministic, auditable, markdown-backed world simulation of the Three Kingdoms era (beginning 184 AD). It tracks characters, factions, businesses, economies, military forces, and historical events through strict causational rules rather than freeform narrative improvisation.

---

## Directory Structure & Memory Architecture

```text
game/
├── README.md               # Engine operations, startup & command reference
├── RULES.md                # System mechanics, formulas, DC thresholds & resolution rules
├── WORLD_STATE.md          # Global calendar, era status, weather & macro indicators
├── PLAYER.md               # Primary player dashboard, assets & active mandates
├── ECONOMY.md              # Currency standards, baseline prices & macro indexes
├── TECHNIQUES.md           # Skills, martial arts, crafts, tiers & progression trees
├── FACTIONS.md             # Registry of regional and national factions
├── RELATIONS.md            # Inter-character & inter-faction diplomacy/sentiment matrix
├── TURN_STATE.md           # Active turn execution tracker & step-by-step pipeline
├── TASKS.md                # Ongoing operations, background projects & work queues
├── CHANGELOG.md            # Engine versioning, schema adjustments & rule revisions
├── chronicle/              # Year-by-year historical event logs
│   └── 0184.md
├── characters/             # Character dossiers (Player & NPCs)
│   ├── player.md
│   ├── NPC-0001.md
│   └── ...
├── factions/               # Detailed faction dossiers
│   └── FACTION-0001.md
├── locations/              # Settlement, county & commandery dossiers
│   └── LOC-0001.md
├── organizations/          # Guilds, sects, clans & associations
│   └── ORG-0001.md
├── businesses/             # Enterprise dossiers (P&L, production, staff, BOM)
│   └── BIZ-0001.md
├── military/               # Armies, garrisons & military campaigns
│   ├── armies.md
│   └── campaigns.md
├── events/                 # Active crisis/event cards and completed archive
│   ├── active.md
│   └── archive.md
├── ledger/                 # Auditable financial & supply logs
│   ├── cashflow.md
│   ├── inventory.md
│   ├── contracts.md
│   └── audit.md
└── saves/                  # Checkpoints and state snapshots
    ├── latest.md
    └── snapshots/
```

---

## Operating Protocol for Agents & Game Master

Every turn cycle must strictly adhere to the 7-step pipeline:

1. **Step 1: Read State**: Inspect `WORLD_STATE.md`, `TURN_STATE.md`, `PLAYER.md`, and relevant target entity dossiers.
2. **Step 2: Validate Prerequisite**: Check resource limits, time constraints, authority, tool availability, and conflict checks.
3. **Step 3: Plan Simulation**: Deconstruct user mandates into atomic sub-actions and predict NPC/faction reactive behaviors.
4. **Step 4: Resolve Outcomes**: Apply math formulas from `RULES.md` and `ECONOMY.md`. Explicitly separate deterministic outcomes, skill-check roll outcomes, and NPC independent decisions.
5. **Step 5: Write State**: Update dossiers, ledger entries, and chronicles. Never write narrative without updating underlying ledger numbers.
6. **Step 6: Audit Consistency**:
   - `Cash_End = Cash_Start + Inflows - Outflows`
   - `Inventory_End = Inventory_Start + Produced + Purchased - Consumed - Sold - Spoilage`
   - Zero duplicated transaction IDs.
7. **Step 7: Checkpoint & Respond**: Output concise status summary, ledger reconciliation, world events, and next available actions.

---

## Entity ID Conventions
- Player: `player` (or `PLY-0001`)
- Non-Player Characters: `NPC-xxxx` (e.g. `NPC-0001`)
- Locations / Settlements: `LOC-xxxx` (e.g. `LOC-0001`)
- Factions / Warlord Clans: `FACTION-xxxx` (e.g. `FACTION-0001`)
- Organizations / Guilds: `ORG-xxxx` (e.g. `ORG-0001`)
- Businesses / Workshops: `BIZ-xxxx` (e.g. `BIZ-0001`)
- Armies / Divisions: `ARMY-xxxx` (e.g. `ARMY-0001`)
- Transactions: `TXN-YYYYMMDD-xxxx` (e.g. `TXN-01840201-0001`)
- Contracts: `CTR-xxxx` (e.g. `CTR-0001`)
- Snapshots: `SNAP-xxxx` (e.g. `SNAP-0001`)

*Rule:* IDs are immutable once assigned. Do not reassign IDs of fallen or dissolved entities.

---

## User Interaction Guide
Players may issue natural language commands such as:
- `mô phỏng 1 tháng` / `mô phỏng 1 kỳ`: Run 1 standard monthly business & geopolitical cycle.
- `tiếp tục`: Resume from current `saves/latest.md`.
- `kiểm toán`: Execute a full financial, inventory, and cross-reference consistency audit.
- `xem trạng thái`: Display current character, enterprise, and geopolitical overview.
- `xem NPC-xxxx`: View complete dossier for target character.
- `xem doanh nghiệp BIZ-xxxx`: View operations, finances, stock, and staff of an enterprise.
- `hành động [mô tả]`: Issue custom tactical, diplomatic, or commercial actions.
- `lưu`: Create a verified snapshot in `saves/snapshots/`.
