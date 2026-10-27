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
| **Current In-Game Date** | **Year 184 AD, Month 3, Day 24** (Late Spring) |
| **Active Turn** | **Turn 2 in progress (Battle of Daxing Mountain Won $\rightarrow$ Turn 2 Wrap-up)** |
| **Location** | Zhuo County (`LOC-0001`), Youzhou |
| **Liquid Capital** | **13,940 Qian** (Workshop safe, 100% AR collected + 500 cash bounty) |
| **Accounts Receivable (AR)**| **0 Qian** (Contract `CTR-01840311-0001` 100% settled) |
| **Strategic Grain** | **9.60 Dan** (~288 kg, secured in workshop storeroom) |
| **Inventory Valuation** | **21,058 Qian** (Includes 15 spears, 5 swords, 2 pack mules, finished goods, raw materials) |
| **Fixed Capital** | **19,400 Qian** (Workshop compound, tools, looms, handcart) |
| **Total Net Worth** | **54,398 Qian** (Dramatic expansion via manufacturing margins, AR settlement & military spoils) |
| **Latest Snapshot** | [`saves/snapshots/SNAP-0001.md`](saves/snapshots/SNAP-0001.md) |
| **Audit Status** | **100% Reconciled (0 discrepancy)** |

---

## 2. Rolling Turn History & Key Milestones

### [Turn 2 (In Progress)] — Month 3, 184 AD
- **184-03-03 to 184-03-11**:
  - Mentorship with Master Lu: Unlocked `SKL-MGT-ENTERPRISE` Tier 1.
  - Balanced Procurement (2,560 Qian): 80 bamboo, 10 hides, 5 timber.
  - Sealed milestone supply contract `CTR-01840311-0001` with Liu Bei (2,950 Qian; 1,000 cash deposit).
- **184-03-12 to 184-03-17**:
  - Production run delivered 10 bamboo shields, 22 baskets, 3 mats. Defect < 2%. Paid 60 Qian incentives.
  - `SKL-MGT-ENTERPRISE` advanced to **Tier 2 (Delegation SOP)**. Chen Bao promoted to Foreman.
  - `SKL-WAR-SPEAR` advanced to **Tier 2 (Brace technique)**.
  - Delivered 10 shields, 30 baskets, 20 mats to South Gate camp on March 17.
- **184-03-18 to 184-03-24 (The Combined Dual Strategy)**:
  - *Rear Defense*: Liang Yan & Master Lu funded and deployed East Gate Municipal Watch (-200 Qian). Foreman Chen Bao ran autonomous production safely inside the town, crafting 15 baskets and 10 mats.
  - *Frontline Expedition*: Liang Yan marched with Liu Bei and Zou Jing to Daxing Mountain as Staff Advisor & Quartermaster.
  - *The Decapitation Victory*: Strategic check score **95 vs DC 60**. Ambushed Cheng Yuanzhi in the narrow defile. Guan Yu severed Cheng Yuanzhi; Zhang Fei impaled Deng Mao. Rebel army of 50,000 routed. Liang Yan personally defended baggage train, repelling flankers and gaining +10 WAR EXP / +15 LDR EXP.
  - *Settlement & Triumphant Return*: Liu Bei settled remaining 1,950 Qian AR. Zou Jing & Liu Bei awarded Liang Yan 500 Qian merit cash + 20 weapons + 2 pack mules.
  - *Net Worth*: Reached **54,398 Qian**.

### [Turn 1] — Month 2, 184 AD: Strategic Stockpiling & Outbreak
- Acquired 10 Dan grain hedge. Produced 49 mats & 29 baskets. Reconciled net worth 36,558 Qian.

### [Turn 0] — 184-02-01: Baseline Initialization
- Initialized core memory files, starting float (15,000 Qian), workshop `BIZ-0001`, verified clean state.

---

## 3. Immediate Crossroads & Tactical Dilemmas (Turn 2 Wrap-up / Month 4 Preview)

1. **Strategic Utilization of Military Spoils**:
   - We possess 15 iron spears, 5 standard Dao swords, and 2 northern pack mules.
   - *Option 1*: Form a private **Liang Clan Armed Guard (Lương Thị Hộ Vệ Đội)** of 5-10 men to escort future trade caravans and protect the workshop compound.
   - *Option 2*: Sell captured weapons to the County Yamen or Merchant Guild for instant cash liquidity (~8,000 - 10,000 Qian profit).
2. **Urgent Plea from Qingzhou (Thanh Châu Thỉnh Viện)**:
   - Courier arrives from Qingzhou Governor Gong Jing: Yellow Turban rebels have besieged Qingzhou capital!
   - Governor Liu Yan orders Colonel Zou Jing and Liu Bei's victorious militia to march south to relieve Qingzhou.
   - Liu Bei formally invites Liang Yan: *"Lương huynh, nếu có huynh đi cùng lo liệu quân nhu cơ mật, quân ta ắt trăm trận trăm thắng. Huynh có muốn cùng ta xuôi nam cứu viện Thanh Châu?"*
3. **Closing Turn 2**:
   - Ready to disburse end-of-month wages (March 28), calculate monthly P&L, reconcile audit, and advance calendar to Month 4, 184 AD.
