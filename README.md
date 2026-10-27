# ThreeKingdoms-AgentEngine

An autonomous, deterministic, markdown-backed simulation engine modeling the Three Kingdoms era (beginning 184 AD). Powered by agentic workflows, strict accounting ledgers, and causational event propagation.

For comprehensive technical specifications, data flows, and state machine diagrams, refer to [**ARCHITECTURE.md**](ARCHITECTURE.md).

---

## Table of Contents
1. [Core Philosophy](#core-philosophy)
2. [Player Guide & Career Paths](#player-guide--career-paths)
3. [Command Syntax & How to Play](#command-syntax--how-to-play)
4. [3-Tier Memory Architecture & Storage Schema](#3-tier-memory-architecture--storage-schema)
5. [Deterministic Verification Tools & CLI](#deterministic-verification-tools--cli)
6. [Economic, Production & Military Formulas](#economic-production--military-formulas)
7. [Resuming Across Sessions & Multi-Agent Collaboration](#resuming-across-sessions--multi-agent-collaboration)

---

## Core Philosophy

- **Zero Ephemeral Hallucination**: No wealth, weapon, army, relationship, or historical event exists unless it is substantiated in the `game/` markdown files or generated via verified simulation formulas.
- **Auditable Double-Entry Bookkeeping**: Money and inventory are strictly conserved. Every copper coin (`Qian`) and bundle of grain (`Dan`) is tracked via unique transaction IDs (`TXN-`) and stock movements (`MOV-`).
- **Autonomous NPC Ecosystem**: Every notable figure (e.g. Liu Bei, Guan Yu, Zhang Fei, local magistrates, merchants) possesses independent attributes (8 core attributes), acquired skills (5 tiers), innate talents, psychological profiles, and evolving sentiment scores.
- **Causal Historical Divergence**: Historical events serve as starting baselines. Player actions and NPC decisions produce butterfly effects, organically altering history without narrative railroading.

---

## Player Guide & Career Paths

You begin in Year 184 AD (Month 2 / Early Spring) during the outbreak of the Yellow Turban Rebellion. Your default character is **Liang Yan** (Lương Nhan / 梁彦, styled *Zhiyuan*), a 21-year-old scholar-artisan owning a small workshop in Zhuo County, Youzhou.

You are completely free to pursue any lifestyle, strategy, or ambition:

### 1. The Merchant Tycoon (Thương Nghiệp Cự Phách)
- **Core Loop**: Procure raw materials (bamboo, timber, iron, leather) -> Supervise workshop production -> Optimize Bill of Materials (BOM) & reduce defect rates -> Form distribution partnerships with caravan traders -> Establish branch workshops across commanderies -> Amass grain and gold.
- **Winning Strategy**: Exploit regional price discrepancies during wartime, secure army supply contracts, and fund private transport guards.

### 2. The Frontier Warlord (Chư Hầu Quân Phiệt)
- **Core Loop**: Spend commercial profits or estate grain to recruit volunteer militia (Nghĩa binh) -> Appoint officers and drill infantry -> Acquire horses from northern traders (Zhang Shiping) -> Secure blacksmith supply contracts for weapons -> Suppress local banditry or Yellow Turban contingents -> Gain official rank from the Imperial Court.
- **Winning Strategy**: High Leadership (`LDR`) and Logistics (`LOG`) keep troop morale high and avoid starvation routs during prolonged sieges.

### 3. The Imperial Courtier & Bureaucrat (Chính Khách Quan Trường)
- **Core Loop**: Pass imperial examinations or secure recommendation from local elders (Master Lu) -> Enter county administration under Magistrate Liu Xuan -> Administer land surveys, tax grain collection, and civil order -> Navigate court factionalism (Eunuchs vs. Scholar-Gentry).
- **Winning Strategy**: High Politics (`POL`) and Diplomacy (`DIP`) unlock provincial appointments and royal favor.

### 4. The Clan Patriarch (Gia Tộc Thế Lực)
- **Core Loop**: Purchase fertile agricultural estates -> Build fortified manors (Ô bảo) -> Educate younger kinsmen in martial arts and classics -> Form marriage alliances with local gentry -> Maintain private security forces to safeguard family heritage amidst realm-wide anarchy.

---

## Command Syntax & How to Play

You can command the engine using natural language (Vietnamese or English). Below are standard command templates:

### General & Time Simulation Commands
| Command (VN) | Command (EN) | Effect |
|---|---|---|
| `mô phỏng 1 tháng` | `simulate 1 month` | Executes 1 standard monthly business, production, payroll, and geopolitical cycle. |
| `mô phỏng 1 ngày` | `simulate 1 day` | Resolves micro-actions, local meetings, or tactical negotiations. |
| `tiếp tục` | `continue` | Reads `saves/latest.md` and resumes the game from the current checkpoint. |
| `kiểm toán` | `audit` | Performs a full mathematical reconciliation of cash, inventory, and cross-references. |
| `lưu` | `save` | Writes a verified snapshot to `saves/snapshots/SNAP-xxxx.md` and updates `saves/latest.md`. |

### Inspection & Query Commands
| Command (VN) | Command (EN) | Effect |
|---|---|---|
| `xem tiến trình` | `view progress` | Inspects `game/PROGRESS.md` for live executive dashboard, active turn, and dilemma options. |
| `xem trạng thái` | `status` | Displays player summary, liquid cash, grain reserve, net worth, and macro indicators. |
| `xem BIZ-0001` | `view BIZ-0001` | Inspects workshop P&L, stock, labor hours, and product lines. |
| `xem NPC-0001` | `view NPC-0001` | Reads full dossier of Liu Bei (attributes, skills, morale, sentiment toward player). |
| `xem thị trường` | `view market` | Displays current commodity price index in `ECONOMY.md`. |

### Action & Roleplay Commands
You can issue customized tactical, commercial, diplomatic, or personal directives:
- *“Gặp Lưu Bị và Trương Phi tại quán rượu, chúc mừng lễ kết nghĩa và bàn về việc cung ứng giỏ lương cho đội quân tình nguyện.”*
- *“Chi 2.000 tiền mua thêm tre nứa và da thuộc để tăng gấp đôi sản lượng giỏ bọc da trong tháng tới.”*
- *“Thuê thêm 2 thợ phụ từ hội thợ mộc của Lư lão bá để mở rộng công suất xưởng.”*
- *“Tổ chức đội tuần tra tự vệ 5 người bảo vệ kho hàng xưởng Lương thị tại khu Đông Môn.”*

---

## 3-Tier Memory Architecture & Storage Schema

To avoid context explosion and arithmetic drift, the engine operates on a decoupled 3-tier memory model (detailed in [**ARCHITECTURE.md**](ARCHITECTURE.md)):

```text
ThreeKingdoms-AgentEngine/
├── ARCHITECTURE.md             # Complete technical architecture specification
├── README.md                   # Operational manual & gameplay guide
│
├── tools/                      # Deterministic CLI Verification & Checkpoint Layer
│   ├── sim-audit.js            # Independent double-entry accounting auditor
│   └── sim-checkpoint.js       # State archiver, validator & safe commit orchestrator
│
└── game/
    ├── PROGRESS.md             # [L1 HOT] Rolling Campaign Progress Journal (Primary high-frequency state)
    ├── TURN_STATE.md           # Step-by-step turn execution pipeline
    ├── WORLD_STATE.md          # Macro indicators, calendar & global crises
    ├── PLAYER.md               # Player dashboard & active objectives
    │
    ├── ledger/                 # [L2 LEDGER] Append-only financial & inventory transactions
    │   ├── cashflow.md         # Double-entry cash movements (TXN-xxxx)
    │   ├── inventory.md        # Physical stock movements & scrap records (MOV-xxxx)
    │   ├── contracts.md        # Commercial supply contracts & fulfillment (CTR-xxxx)
    │   └── audit.md            # Reconciled balance sheet snapshots
    │
    ├── [L3 COLD ARCHIVES]      # Low-frequency reference entities & rules
    │   ├── RULES.md            # (Read-Only) Dice check DCs, combat & production formulas
    │   ├── ECONOMY.md          # (Read-Only) Currency standards, 184 AD commodity price index
    │   ├── TECHNIQUES.md       # (Read-Only) 5-tier skill progression trees
    │   ├── chronicle/          # Yearly realm chronicle (0184.md, ...)
    │   ├── characters/         # Entity dossiers (player.md, NPC-xxxx.md)
    │   ├── factions/           # Faction cards (FACTION-xxxx.md)
    │   ├── locations/          # Geographical dossiers (LOC-xxxx.md)
    │   ├── organizations/      # Guilds & magistrate bureaus (ORG-xxxx.md)
    │   ├── businesses/         # Enterprise operating sheets (BIZ-xxxx.md)
    │   ├── military/           # Armies & campaigns (armies.md, campaigns.md)
    │   └── events/             # Crisis cards (active.md, archive.md)
    │
    └── saves/                  # Immutable state checkpoints
        ├── latest.md           # Latest verified checkpoint pointer
        └── snapshots/          # Timestamped state snapshots (SNAP-0000.md ...)
```

---

## Deterministic Verification Tools & CLI

The engine includes native Node.js tools in `tools/` that guarantee mathematical integrity without burning LLM inference tokens:

### 1. Invariant Auditor (`tools/sim-audit.js`)
Audits all double-entry cashflow transactions, physical inventory movements, and hot buffer synchronization.
```bash
node tools/sim-audit.js
```
- Validates that $Cash_{\text{End}} = Cash_{\text{Start}} + \sum Inflow - \sum Outflow$.
- Verifies physical stock conservation (materials purchased/produced = materials consumed/stored).
- Exits with code `0` on 100% reconciliation; fails loudly if any balance discrepancy is detected.

### 2. State Checkpointer (`tools/sim-checkpoint.js`)
Runs pre-save audits, parses active progress headers, archives state snapshots, and performs atomic git commits.
```bash
# Verify integrity, increment snapshot SNAP-xxxx.md, and update latest.md
node tools/sim-checkpoint.js "Turn 3 Victory at Qingzhou"

# Verify integrity and automatically commit & push to GitHub
node tools/sim-checkpoint.js --commit --push "Turn 3 Victory at Qingzhou"
```

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

## Resuming Across Sessions & Multi-Agent Collaboration

To continue a campaign in a new AI conversation or with another agent:
1. Provide the agent with the repository or clone this workspace.
2. Instruct the agent:
   > *"Read `game/PROGRESS.md`, `game/saves/latest.md`, and `game/TURN_STATE.md`. Act as the Simulation Engine and await my command."*
3. The agent will read the verified state and continue the world seamlessly with zero context loss.
