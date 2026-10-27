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
| **Current In-Game Date** | **Year 184 AD, Month 3, Day 11** (Late Spring) |
| **Active Turn** | **Turn 2 in progress (Contract Signed $\rightarrow$ Production Fulfillment Next)** |
| **Location** | Zhuo County (`LOC-0001`), Youzhou |
| **Liquid Capital** | **11,750 Qian** (Workshop safe, includes +1,000 Qian deposit from Liu Bei) |
| **Accounts Receivable (AR)**| **1,950 Qian** (Payable by Liu Bei upon victory under `CTR-01840311-0001`) |
| **Strategic Grain** | **9.60 Dan** (~288 kg, secured in workshop storeroom) |
| **Inventory Valuation** | **6,099 Qian** (95 bamboo, 20 hides, 15 twine, 5 timber, 19 mats, 9 baskets) |
| **Fixed Capital** | **19,400 Qian** (Workshop compound, tools, looms, handcart) |
| **Total Net Worth** | **39,199 Qian** (Assets: 11,750 cash + 1,950 AR + 6,099 stock + 19,400 fixed) |
| **Latest Snapshot** | [`saves/snapshots/SNAP-0001.md`](saves/snapshots/SNAP-0001.md) |
| **Audit Status** | **100% Reconciled (0 discrepancy)** |

---

## 2. Rolling Turn History & Key Milestones

### [Turn 2 (In Progress)] — Month 3, 184 AD
- **184-03-03 to 184-03-08**:
  - Mentorship at Master Lu's Estate: Check Score 65 vs DC 45. Unlocked `SKL-MGT-ENTERPRISE` Tier 1 (18/20 EXP).
- **184-03-09 to 184-03-10**:
  - Balanced Procurement (2,560 Qian): 80 bamboo, 10 prime hides from Zhang Fei, 8 twine, 5 timber from Master Lu.
  - Formalized Product Line C: `PROD-SHIELD-BAM` (Leather-Bound Bamboo Shield).
- **184-03-11**:
  - **Milestone Military Supply Contract Sealed (`CTR-01840311-0001`)**:
    - Liang Yan met Liu Bei, Guan Yu, and Zhang Fei at South Gate camp.
    - Negotiation Check Score: **91 vs DC 60** (Formidable Acclaim).
    - Deliverables: 30 pack baskets (`PROD-BASK`), 10 bamboo shields (`PROD-SHIELD-BAM`), 20 mats (`PROD-MAT`) for total 2,950 Qian.
    - Payment: 1,000 Qian cash advance (`TXN-01840311-0005`) received; 1,950 Qian deferred as AR backed by victory spoils.
    - Sentiments: Liu Bei $\rightarrow$ **+38**, Zhang Fei $\rightarrow$ **+35**, Guan Yu $\rightarrow$ **+26**.

### [Turn 1] — Month 2, 184 AD: Strategic Stockpiling & Outbreak
- Acquired 10 Dan grain hedge. Produced 49 mats & 29 baskets. Sold wholesale to Zhang Shiping and Yamen. Reconciled net worth 36,558 Qian.

### [Turn 0] — 184-02-01: Baseline Initialization
- Initialized core memory files, starting float (15,000 Qian), workshop `BIZ-0001`, verified clean state.

---

## 3. Immediate Crossroads & Tactical Dilemmas (Turn 2 / Month 3, 184 AD)

1. **Fulfill Contract `CTR-01840311-0001`**:
   - Deadline: 184-03-18 (7 days to deliver).
   - Workshop stock already has: 9 baskets, 19 mats.
   - Net production required to fulfill order:
     - Produce 21 more baskets (to reach 30).
     - Produce 10 bamboo shields.
     - Produce 1 more mat (to reach 20).
     - Material needed: ~52 bamboo bundles, 5.1 hides, 2 timber bundles, twine.
     - Materials on hand: 95 bamboo, 20 hides, 5 timber. **(Plenty of excess material!)**
2. **Rebel Threat Imminent**:
   - Cheng Yuanzhi's vanguard (~50,000 insurgents) is estimated to collide with Youzhou defenses near Daxing Mountain (Đại Hưng Sơn) within 5-7 days!
   - Delivering shields on time will directly boost the combat effectiveness and survival rate of Liu Bei's militia in this battle!
