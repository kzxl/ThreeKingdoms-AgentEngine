# Active Campaign Progress Journal (game/PROGRESS.md)

> **ARCHITECTURAL BOUNDARY RULE**:
> This file is the primary high-frequency operational tracker for live gameplay.
> Core definition files (`RULES.md`, `ECONOMY.md`, `TECHNIQUES.md`) are strictly **READ-ONLY** during standard gameplay turns and must never be altered unless the user explicitly requests an engine rule upgrade.

---

## 1. Live Campaign Header & Executive Dashboard

| Dimension | Active Value |
|---|---|
| **Campaign ID** | `CMP-184-ZHOU-01` |
| **Protagonist** | Liang Yan (`player` / `PLY-0001`), Age 21 |
| **Current In-Game Date** | **Year 184 AD, Month 3, Day 1** (Late Spring) |
| **Active Turn** | **Turn 1 Completed $\rightarrow$ Awaiting Directives for Turn 2** |
| **Location** | Zhuo County (`LOC-0001`), Youzhou |
| **Liquid Capital** | **13,610 Qian** (Copper Cash in workshop safe) |
| **Strategic Grain** | **9.60 Dan** (~288 kg, secured in workshop storeroom) |
| **Inventory Valuation** | **3,548 Qian** (Raw materials & finished goods) |
| **Fixed Capital** | **19,400 Qian** (Workshop compound, tools, looms, handcart) |
| **Total Net Worth** | **36,558 Qian** |
| **Latest Snapshot** | [`saves/snapshots/SNAP-0001.md`](saves/snapshots/SNAP-0001.md) |
| **Audit Status** | **100% Reconciled (0 discrepancy)** |

---

## 2. Rolling Turn History & Key Milestones

### [Turn 1] — Month 2, 184 AD: Strategic Stockpiling & Outbreak
- **Date**: 184-02-01 to 184-02-28
- **Player Actions**:
  - Acquired 10 Dan grain @ 160 Qian (`TXN-01840205-0001`) as famine/war hedge.
  - Acquired 50 bamboo bundles and 8 cured hides from Zhang Fei's butchery.
  - Produced 49 mats and 29 leather-reinforced baskets at `BIZ-0001` (2 scrap units accounted).
  - Wholesale sold 35 baskets to horse trader Zhang Shiping (`NPC-0005`) for 1,750 Qian.
  - Sold 50 mats retail (1,250 Qian) and 20 mats to county yamen barracks (440 Qian).
  - Paid retainers Chen Bao & Zhao An wages (1,500 Qian) and grain rations (0.25 Dan).
- **World Shift**:
  - Yellow Turban rebellion erupts under Zhang Jue.
  - Liu Bei, Guan Yu, and Zhang Fei complete the Peach Garden Oath in Zhuo County and raise ~300 volunteer militia.
  - Zhang Shiping sentiment climbs to +40; Zhang Fei to +20.
- **Turn 1 Closing Audit**: Net cash -1,390 Qian (reinvested into stock); Net worth 36,558 Qian. Passed.

### [Turn 0] — 184-02-01: Baseline Initialization
- Initialized core memory files, starting float (15,000 Qian), workshop `BIZ-0001`, and verified clean state.

---

## 3. Immediate Crossroads & Tactical Dilemmas (Turn 2 / Month 3, 184 AD)

1. **Military Threat Approaching**:
   - Taiping rebel general Cheng Yuanzhi is advancing north with 50,000 insurgent levies toward the Youzhou commandery border.
   - Zhuo County is bracing for defense; panic is driving weapon and food prices up.
2. **Commercial Opportunity**:
   - Stock of bamboo is low (15 bundles). We need raw materials to keep workshop retainers productive.
   - Liu Bei's newly raised volunteer force (~300 men) lacks adequate supply pack gear and camp bedding.
3. **Open Action Directives**:
   - *Option A*: Secure exclusive logistics supply arrangement with Liu Bei's volunteer force.
   - *Option B*: Form armed neighborhood watch with local guild elder Master Lu Zhirong (`NPC-0006`).
   - *Option C*: Expand procurement of hides and bamboo before transit routes are severed by rebel scouts.
