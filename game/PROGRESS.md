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
| **Current In-Game Date** | **Year 184 AD, Month 4, Day 8** (Early Summer) |
| **Active Turn** | **Turn 3 in progress (Qingzhou Liberated $\rightarrow$ Grand Strategic Crossroads)** |
| **Current Location** | Qingzhou City (`LOC-0004`), Governor's Palace |
| **Permanent Base** | Liang Clan Workshop (`BIZ-0001`), Zhuo County (Fully Autonomous) |
| **Liquid Capital** | **15,940 Qian** (12,940 Qian mobile coffer + 3,000 Qian Zhuo safe) |
| **Accounts Receivable (AR)**| **0 Qian** (Clean ledgers) |
| **Strategic Grain** | **9.60 Dan** (~288 kg, secured at Zhuo workshop) |
| **Inventory Valuation** | **21,708 Qian** (Includes 10 Dou sea salt, weapons, mules, materials) |
| **Fixed Capital** | **19,600 Qian** (Workshop compound, 3 looms, tools, handcart) |
| **Total Net Worth** | **57,248 Qian** (Surged from 37,220 Qian baseline — +53.8% total capital gain) |
| **Latest Snapshot** | [`saves/snapshots/SNAP-0004.md`](saves/snapshots/SNAP-0004.md) |
| **Audit Status** | **100% Reconciled (0 discrepancy)** |

---

## 2. Rolling Turn History & Key Milestones

### [Turn 3 (In Progress)] — Month 4, 184 AD: The Relief of Qingzhou
- **184-03-25 to 184-04-05**:
  - Delegated Zhuo workshop to Foreman Chen Bao; hired 2 apprentices (capacity 800 hrs/mo).
  - Martial & Strategy Training on march: Spear Tier 3 (WAR 58), Tactical Stratagems Tier 2 (INT 76).
- **184-04-06 to 184-04-08 (The Battle of Qingzhou)**:
  - Executed Liang Yan's **Stratagem 1 (Feint & Three-Way Pincer Attack)**. Strategic check score: **100 vs DC 65** (Flawless Masterpiece).
  - 30,000 Yellow Turban rebels routed: 5,000 slain, 10,000 captured. Governor Gong Jing rescued.
  - Liang Yan captured rebel sub-commander Zhang Bo in single spear combat.
  - Governor Gong Jing awarded Liang Yan **2,000 Qian cash bounty** (`TXN-01840408-0010`) and an official **Imperial Qingzhou Sea Salt Purchase Permit** (20% wholesale discount).
  - Net Worth climbed to **57,248 Qian**. Sentiments soared: Liu Bei $\rightarrow$ **+65**, Zhang Fei $\rightarrow$ **+60**, Guan Yu $\rightarrow$ **+55**, Gong Jing $\rightarrow$ **+60**.

### [Turn 2] — Month 3, 184 AD: Daxing Mountain Triumph & Contract Settlement
- Reconciled net worth 54,398 Qian; contract with Liu Bei fully settled.

### [Turn 1] — Month 2, 184 AD: Strategic Stockpiling & Outbreak
- Acquired 10 Dan grain hedge. Produced 49 mats & 29 baskets. Reconciled net worth 36,558 Qian.

### [Turn 0] — 184-02-01: Baseline Initialization
- Initialized core memory files, starting float (15,000 Qian), verified clean state.

---

## 3. Grand Strategic Crossroads (Month 4, 184 AD)

With Qingzhou completely liberated, military couriers from the capital Luoyang and northern Jizhou bring critical intelligence:

1. **The Guangzong Epicenter (Quảng Tông Đại Chiến)**:
   - Supreme Imperial Commander **Lu Zhi (Lư Thực)**, Liu Bei's former teacher, is besieging the main rebel stronghold of **Zhang Jue (`NPC-0004`)** at Guangzong, Jizhou with 50,000 Northern Army regulars.
   - Liu Bei is determined to lead his 500 volunteer veterans north to reinforce his revered mentor Master Lu Zhi.
2. **The Qingzhou Sea Salt Commercial Arbitrage Opportunity**:
   - Liang Yan holds the exclusive 20% discount salt permit from Governor Gong Jing.
   - Salt sells in Qingzhou for 52 Qian/Dou (with 20% discount), but fetches **75 - 90 Qian/Dou** in war-torn Jizhou and northern Youzhou!
   - Liang Yan can purchase 50 - 100 Dou of sea salt, load it onto pack mules and hired wagons, and travel with Liu Bei's army north — simultaneously serving as army quartermaster and conducting lucrative interstate salt arbitrage!
3. **Colonel Zou Jing's Return to Youzhou**:
   - Colonel Zou Jing is marching his 1,000 regular troops back to Ji County / Zhuo County to report victory to Governor Liu Yan. Liang Yan could return home now to personally supervise workshop expansion, or push onward to Guangzong.
