# Agentic Three Kingdoms Simulation Engine

## Overview
The **Agentic Three Kingdoms Simulation Engine** is a deterministic, auditable, markdown-backed world simulation of the Three Kingdoms era (beginning 184 AD). It tracks characters, factions, businesses, economies, military forces, and historical events through strict causational rules rather than freeform narrative improvisation.

---

## Architecture: Core Rules vs. Dynamic State Separation

To prevent constant churn and accidental mutation of core system mechanics, the engine enforces strict separation:

1. **Immutable Core Engine Laws (Read-Only during gameplay)**:
   - `RULES.md`: Attribute formulas, skill checks, combat resolution, defect rates.
   - `ECONOMY.md`: Currency definitions, commodity price index, labor benchmarks.
   - `TECHNIQUES.md`: Catalog of skills, tiers, and progression paths.
   - `README.md`: System manual and operational pipeline.
2. **High-Frequency Gameplay Tracker**:
   - `PROGRESS.md`: **★ Live rolling operational journal** recording current status, milestone logs, active dilemmas, and turn choices.
   - `TURN_STATE.md`: Execution status of the 7-step turn pipeline.
   - `ledger/`: Verified cashflow, physical inventory movements, and discrepancy audits.
   - `saves/`: Complete state snapshots and rollback recovery points.

---

## Operating Protocol for Agents & Game Master

Every turn cycle must strictly adhere to the 7-step pipeline:

1. **Step 1: Read State**: Inspect `PROGRESS.md`, `TURN_STATE.md`, and relevant target entity dossiers.
2. **Step 2: Validate Prerequisites**: Check resource limits, time constraints, authority, tool availability, and conflict checks.
3. **Step 3: Plan Simulation**: Deconstruct user mandates into atomic sub-actions and predict NPC/faction reactive behaviors.
4. **Step 4: Resolve Outcomes**: Apply math formulas from `RULES.md` and `ECONOMY.md`. Explicitly separate deterministic outcomes, skill-check roll outcomes, and NPC independent decisions.
5. **Step 5: Write State**: Update `PROGRESS.md`, dossiers, ledger entries, and chronicles. Never write narrative without updating underlying ledger numbers.
6. **Step 6: Audit Consistency**:
   - `Cash_End = Cash_Start + Inflows - Outflows`
   - `Inventory_End = Inventory_Start + Produced + Purchased - Consumed - Sold - Spoilage`
   - Zero duplicated transaction IDs.
7. **Step 7: Checkpoint & Respond**: Output concise status summary, ledger reconciliation, world events, and next available actions.

---

## Entity ID Conventions
- Player: `player` (or `PLY-0001`)
- Non-Player Characters: `NPC-xxxx` (e.g. `NPC-0001` Liu Bei)
- Locations / Settlements: `LOC-xxxx` (e.g. `LOC-0001` Zhuo County)
- Factions / Warlord Clans: `FACTION-xxxx` (e.g. `FACTION-0001` Han Court)
- Organizations / Guilds: `ORG-xxxx` (e.g. `ORG-0001` Merchant Guild)
- Businesses / Workshops: `BIZ-xxxx` (e.g. `BIZ-0001` Liang Clan Workshop)
- Armies / Divisions: `ARMY-xxxx` (e.g. `ARMY-0001` Zhuo Garrison)
- Transactions: `TXN-YYYYMMDD-xxxx` (e.g. `TXN-01840201-0001`)
- Contracts: `CTR-xxxx` (e.g. `CTR-0001`)
- Stock Movements: `MOV-YYYYMMDD-xxxx` (e.g. `MOV-01840201-0001`)
- Snapshots: `SNAP-xxxx` (e.g. `SNAP-0001`)

*Rule:* IDs are immutable once assigned. Do not reassign IDs of fallen or dissolved entities.

---

## Player Playbook & Command Reference

Players interact with the engine using natural language commands:

### Simulation & Lifecycle Commands
- `mô phỏng 1 tháng` / `simulate 1 month`: Advance the world calendar by 1 month, resolving all business, agricultural, diplomatic, and military operations.
- `mô phỏng 1 kỳ`: Synonym for standard 1-month turn cycle.
- `tiếp tục`: Resume from current `saves/latest.md`.
- `kiểm toán`: Run complete double-entry balance check across cashflow, inventory, and cross-references.
- `lưu`: Create a verified snapshot in `saves/snapshots/` and update `saves/latest.md`.

### Inspection Commands
- `xem tiến trình`: View `PROGRESS.md` for live executive dashboard, active turn, and dilemma options.
- `xem trạng thái`: Display current character stats, cash on hand, grain reserves, enterprise P&L, and world crisis level.
- `xem BIZ-0001`: Inspect the operations, workers, bill of materials (BOM), and stock of Liang Clan Workshop.
- `xem NPC-xxxx`: View dossier for target character (e.g., `xem NPC-0001` for Liu Bei, `xem NPC-0002` for Zhang Fei).
- `xem thị trường`: Inspect the latest commodity price index in `ECONOMY.md`.

### Roleplay & Directive Commands
- `hành động [mô tả chi tiết]`: Direct the protagonist to negotiate, buy/sell, recruit, travel, or fight.
