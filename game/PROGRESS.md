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
| **Current In-Game Date** | **Year 184 AD, Month 3, Day 17** (Late Spring) |
| **Active Turn** | **Turn 2 in progress (Contract Delivered $\rightarrow$ Battle of Daxing Mountain Imminent)** |
| **Location** | Zhuo County (`LOC-0001`), Youzhou |
| **Liquid Capital** | **11,690 Qian** (Workshop iron safe, post-incentives) |
| **Accounts Receivable (AR)**| **1,950 Qian** (Payable by Liu Bei upon victory bounty under `CTR-01840311-0001`) |
| **Strategic Grain** | **9.60 Dan** (~288 kg, secured in workshop storeroom) |
| **Inventory Valuation** | **3,870 Qian** (35 bamboo, 14 hides, 12 twine, 2.5 timber, 1 basket, 2 mats) |
| **Fixed Capital** | **19,400 Qian** (Workshop compound, tools, looms, handcart) |
| **Total Net Worth** | **36,910 Qian** (Reflects +740 Qian net contract operating margin realized) |
| **Latest Snapshot** | [`saves/snapshots/SNAP-0001.md`](saves/snapshots/SNAP-0001.md) |
| **Audit Status** | **100% Reconciled (0 discrepancy)** |

---

## 2. Rolling Turn History & Key Milestones

### [Turn 2 (In Progress)] — Month 3, 184 AD
- **184-03-03 to 184-03-08**:
  - Mentorship at Master Lu's Estate: Unlocked `SKL-MGT-ENTERPRISE` Tier 1. Master Lu sentiment reaches +48.
- **184-03-09 to 184-03-10**:
  - Balanced Procurement (2,560 Qian): 80 bamboo, 10 prime hides from Zhang Fei, 8 twine, 5 timber from Master Lu.
- **184-03-11**:
  - Milestone Contract `CTR-01840311-0001` sealed with Liu Bei (2,950 Qian). Collected 1,000 Qian cash advance.
- **184-03-12 to 184-03-16**:
  - **Production Surge (Batch `BATCH-018403-01`)**: Produced 10 bamboo shields, 22 baskets, 3 mats. Paid 60 Qian incentives.
  - **Skill Breakthrough**:
    - `SKL-MGT-ENTERPRISE` advanced to **Tier 2 (Competent — Delegation SOP)**. Chen Bao promoted to Foreman; workshop can now produce autonomously!
    - `SKL-WAR-SPEAR` advanced to **Tier 2 (Competent — Brace against Charge unlocked)**.
    - Researched Daxing Mountain topography; pinpointed narrow gorge as prime ambush sector.
- **184-03-17**:
  - **Full Delivery of Contract `CTR-01840311-0001`**:
    - Delivered 10 shields, 30 baskets, 20 mats to Liu Bei's militia camp.
    - Volunteer militia morale surged to 85/100; vanguard equipped with shields.

### [Turn 1] — Month 2, 184 AD: Strategic Stockpiling & Outbreak
- Acquired 10 Dan grain hedge. Produced 49 mats & 29 baskets. Sold wholesale to Zhang Shiping and Yamen. Reconciled net worth 36,558 Qian.

### [Turn 0] — 184-02-01: Baseline Initialization
- Initialized core memory files, starting float (15,000 Qian), workshop `BIZ-0001`, verified clean state.

---

## 3. Immediate Crossroads & Tactical Dilemmas (Turn 2 / Month 3, 184 AD)

1. **Battle of Daxing Mountain (Trận Núi Đại Hưng)**:
   - Rebel vanguard of 50,000 under Cheng Yuanzhi and Deng Mao is entering the Daxing Mountain pass.
   - Colonel Zou Jing and Liu Bei's volunteer force (~300 men + 500 government troops) are deploying to meet them!
2. **Liang Yan's Tactical Choice**:
   - **Lựa chọn 1 (Tham chiến / Quân nhu Tiền tuyến)**: Theo đoàn quân làm Quân nhu quan / Hậu cần, mang bản đồ khe núi hiến kế phục kích cho Lưu Bị và Quan Vũ. Trực tiếp lập chiến công quân sự.
   - **Lựa chọn 2 (Ở lại Trác Huyện điều phối phòng vệ)**: Gửi bản đồ địa hình cho Lưu Bị, còn Lương Nhan ở lại Trác Huyện cùng Lư lão bá và Thương hội tổ chức đội dân binh bảo vệ kho bãi và cửa ngõ thành thị.
   - **Lựa chọn 3 (Khai thác Thương cơ Hậu phương)**: Tận dụng quyền tự chủ của Trần Bảo để xưởng tự sản xuất thêm khiên tre và bao tải lương bán cho huyện nha với giá cao trong lúc chiến trận nổ ra.
