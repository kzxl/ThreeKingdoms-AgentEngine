# ThreeKingdoms-AgentEngine

An autonomous, deterministic, markdown-backed simulation engine modeling the Three Kingdoms era (beginning 184 AD). Powered by agentic workflows, strict accounting ledgers, and causational event propagation.

---

## Highlights

- **Markdown Memory Architecture**: Zero hidden state or ephemeral context reliance. All game states, balances, relationships, and history persist in transparent, version-controlled Markdown files under `game/`.
- **Auditable Economic & Supply Ledger**: Double-entry cashflow tracking, inventory tracking with material bill-of-materials (BOM), scrap rates, and discrepancy audits.
- **Autonomous NPC Ecosystem**: Every significant figure features independent attributes (8 core attributes), acquired skills (5 tiers), innate talents, psychological profiles, and evolving sentiment scores.
- **Deep Geopolitical & Military Simulation**: Factions, armies, logistics consumption (grain per 1,000 soldiers), morale thresholds, and causal historical divergence.

---

## Directory Architecture

```text
.
├── README.md               # Repository documentation
├── .gitignore
└── game/                   # Persistent Simulation Engine Core
    ├── README.md           # Operational manual & agent pipeline
    ├── RULES.md            # Formulas, DCs, combat & production resolution
    ├── WORLD_STATE.md      # Macro indicators, calendar & global crises
    ├── PLAYER.md           # Player dashboard & active objectives
    ├── ECONOMY.md          # Currency benchmarks, commodity price index
    ├── TECHNIQUES.md       # Skill ladders & progression trees
    ├── FACTIONS.md         # Major & regional warlords registry
    ├── RELATIONS.md        # Diplomatic matrix & NPC sentiment tracker
    ├── TURN_STATE.md       # Turn execution pipeline tracker
    ├── TASKS.md            # Active project & operation queues
    ├── CHANGELOG.md        # Version history & simulation logs
    ├── chronicle/          # Chronological realm history by year
    ├── characters/         # Character dossiers (Player & NPCs)
    ├── factions/           # Detailed faction sheets
    ├── locations/          # Settlement, county & commandery sheets
    ├── organizations/      # Guilds, sects & merchant fraternities
    ├── businesses/         # Enterprise dossiers (P&L, BOM, labor)
    ├── military/           # Divisions, garrisons & active campaigns
    ├── events/             # Active crisis cards & archived events
    ├── ledger/             # Cashflow, inventory, contracts & audits
    └── saves/              # State snapshots & recovery points
```

---

## Quick Start & Interaction

Interact with the simulation engine via natural language prompts:
- `mô phỏng 1 tháng` / `simulate 1 month`: Advance the world by one standard monthly business & geopolitical cycle.
- `xem trạng thái` / `status`: View current character, enterprise, and geopolitical overview.
- `kiểm toán` / `audit`: Execute a full financial, inventory, and cross-reference consistency check.
- `xem NPC-0001` / `view NPC-0001`: Inspect dossier for Liu Bei (or any registered entity).
- `hành động [mô tả]` / `action [description]`: Propose tactical, commercial, diplomatic, or martial actions.
