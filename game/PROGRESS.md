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
| **Current In-Game Date** | **Year 184 AD, Month 3, Day 8** (Late Spring) |
| **Active Turn** | **Turn 2 in progress (Mentorship Action Resolved)** |
| **Location** | Zhuo County (`LOC-0001`), Youzhou |
| **Liquid Capital** | **13,310 Qian** (Workshop iron chest) |
| **Strategic Grain** | **9.60 Dan** (~288 kg, secured in workshop storeroom) |
| **Inventory Valuation** | **3,548 Qian** (Raw materials & finished goods) |
| **Fixed Capital** | **19,400 Qian** (Workshop compound, tools, looms, handcart) |
| **Total Net Worth** | **36,258 Qian** |
| **Latest Snapshot** | [`saves/snapshots/SNAP-0001.md`](saves/snapshots/SNAP-0001.md) |
| **Audit Status** | **100% Reconciled (0 discrepancy)** |

---

## 2. Rolling Turn History & Key Milestones

### [Turn 2 (In Progress)] — Month 3, 184 AD
- **184-03-03 to 184-03-08**:
  - **Mentorship at Master Lu's Estate**: Liang Yan brought fine wine and tea (300 Qian, `TXN-01840303-0001`) to consult Elder Lu Zhirong (`NPC-0006`).
  - **Check Score**: INT 72 + COM 76 + LDR 64 + POL 60 basis + Mentor Bonus (+15) + d20 roll (16) = **Score 65 vs DC 45** (Resounding Success).
  - **Outcome**: Unlocked `SKL-MGT-ENTERPRISE` at Tier 1 (18/20 EXP). Master Lu sentiment reached **+48**.
  - **Next Step in Management**: Applying these principles in the workshop (piece-rate reward system for Chen Bao & Zhao An) will instantly advance the skill to **Tier 2 (Competent - Delegation SOP)**, enabling the workshop to run without full-time player presence!

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

1. **Procurement vs. Supply Depletion**:
   - Kho trúc cói chỉ còn 15 bó. Cần nhập vật tư (tre nứa, da bò) để triển khai quy chế sản xuất mới cho thợ cả Trần Bảo.
2. **Nghĩa binh Lưu Bị chuẩn bị xuất trận**:
   - Lưu Bị, Quan Vũ, Trương Phi đang tập luyện 300 nghĩa dũng ngoài cổng nam, thiếu hụt giỏ đựng lương cơ động và lều bạt.
3. **Thương hội Trác Huyện lập đội tuần tra**:
   - Lư lão bá ngỏ ý muốn Lương Nhan cùng Thương hội đóng góp và điều phối đội dân binh tuần phòng khu phố Đông Môn.
