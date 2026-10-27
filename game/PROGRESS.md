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
| **Current In-Game Date** | **Year 184 AD, Month 4, Day 24** (Late Summer) |
| **Active Turn** | **Turn 4 (Northern March & Salt Trade Completed $\rightarrow$ The Guangzong Extortion Crisis)** |
| **Current Location** | Guangzong Siege Camp (`LOC-0003`), Julu Commandery, Jizhou |
| **Permanent Base** | Liang Clan Workshop (`BIZ-0001`), Zhuo County (Fully Autonomous) |
| **Liquid Capital** | **17,700 Qian** (14,700 Qian mobile coffer + 3,000 Qian Zhuo safe) |
| **Accounts Receivable (AR)**| **0 Qian** (Clean ledgers) |
| **Strategic Grain** | **9.60 Dan** (~288 kg, secured at Zhuo workshop) |
| **Inventory Valuation** | **21,578 Qian** (Includes 10 Dou sea salt, weapons, mules, materials) |
| **Fixed Capital** | **19,600 Qian** (Workshop compound, 3 looms, tools, handcart) |
| **Total Net Worth** | **58,878 Qian** (Up from 57,248 Qian — +58.2% total capital gain over baseline) |
| **Latest Snapshot** | [`saves/snapshots/SNAP-0004.md`](saves/snapshots/SNAP-0004.md) |
| **Audit Status** | **100% Reconciled (0 discrepancy)** |

---

## 2. Rolling Turn History & Key Milestones

### [Turn 4 (Current)] — Month 4, 184 AD: Northern Expedition & Salt Trade at Guangzong
- **184-04-09**:
  - Exercised Qingzhou Sea Salt Permit: Purchased 70 Dou sea salt @ 52 Qian/Dou (-3,640 Qian, `TXN-01840409-0011`).
  - Appointed Chief Quartermaster for Liu Bei's 500 volunteer troops marching north toward Guangzong (`LOC-0003`).
- **184-04-16**:
  - Reached Pingyuan Commandery border: Executed wholesale salt arbitrage, selling 40 Dou @ 85 Qian (+3,400 Qian, `TXN-01840416-0012`). Net profit: **+1,190 Qian**.
- **184-04-24**:
  - Arrived at Guangzong siege camp outside Zhang Jue's rebel citadel.
  - Supplied 25 Dou sea salt to Commander Lu Zhi's imperial army quartermaster @ 80 Qian (+2,000 Qian, `TXN-01840424-0013`).
  - Presented 5 Dou of pure white sea salt as ceremonial tribute to Supreme Commander Lu Zhi (`NPC-0012`).
  - Retained 10 Dou sea salt in baggage reserve for Liu Bei's 500 troops.
  - Liquid cash surged to **17,700 Qian**; Net worth rose to **58,878 Qian**.
  - **Skill Masteries Unlocked**:
    - `SKL-COM-APPRAISE` promoted to **Tier 3 (Proficient)**.
    - `SKL-TAC-STRAT` promoted to **Tier 3 (Proficient)**.
    - Attributes increased: `LOG` 68 $\rightarrow$ **70** (+2), `COM` 76 $\rightarrow$ **78** (+2), `DIP` 68 $\rightarrow$ **70** (+2).

### [Turn 3] — Month 4, 184 AD: The Relief of Qingzhou
- Executed Stratagem 1 (Three-Way Pincer). Check score: **100 vs DC 65**.
- Routed 30,000 rebels; awarded 2,000 Qian bounty and Qingzhou Sea Salt Purchase Permit.

### [Turn 2] — Month 3, 184 AD: Daxing Mountain Triumph & Contract Settlement
- Reconciled net worth 54,398 Qian; contract with Liu Bei fully settled.

### [Turn 1] — Month 2, 184 AD: Strategic Stockpiling & Outbreak
- Acquired 10 Dan grain hedge. Produced 49 mats & 29 baskets. Reconciled net worth 36,558 Qian.

---

## 3. Active Dilemma: The Extortion Crisis of Eunuch Zuo Feng (Tả Phong Tống Tiền & Luân Lạc Ngục Xa)

Court Inspector **Zuo Feng (`NPC-0013`)** arrived from Luoyang with an Imperial yellow canopy carriage. Finding Lu Zhi's siege entrenched without an immediate bloody breach, Zuo Feng secretly demanded an extortionate bribe of **1,000 Gold (or 5,000+ Qian)**.

Master **Lu Zhi (`NPC-0012`)** indignantly rebuked him:
> *"Quân lương còn chưa đầy đủ, sĩ tốt dãi nắng dầm sương nơi chiến trường, ta lấy đâu ra vàng ngọc đút lót cho lũ yêm hoạn trong cung!"*

Zuo Feng retreated to his carriage trembling with fury, swearing to file a treasonous memorial to Emperor Ling accusing Lu Zhi of cowardice and stalling operations. Historically, this causes Lu Zhi to be recalled in chains in a prisoner cart (*Ngục xa hồi kinh*), and the incompetent courtier Dong Zhuo (Đổng Trác) is appointed in his place, suffering disastrous defeats.

Zhang Fei is currently brandishing his blade in rage, while Liu Bei is torn between filial piety to his teacher and imperial law.

Liang Yan stands inside the command tent with **14,700 Qian** cash on hand and high strategic acumen.
