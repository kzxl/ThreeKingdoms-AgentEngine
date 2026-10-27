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
| **Current In-Game Date** | **Year 184 AD, Month 3, Day 10** (Late Spring) |
| **Active Turn** | **Turn 2 in progress (Procurement Complete $\rightarrow$ Production Ready)** |
| **Location** | Zhuo County (`LOC-0001`), Youzhou |
| **Liquid Capital** | **10,750 Qian** (Workshop safe, after 2,560 Qian material buy) |
| **Strategic Grain** | **9.60 Dan** (~288 kg, secured in workshop storeroom) |
| **Inventory Valuation** | **6,099 Qian** (95 bamboo, 20 hides, 15 twine, 5 timber, 19 mats, 9 baskets) |
| **Fixed Capital** | **19,400 Qian** (Workshop compound, tools, looms, handcart) |
| **Total Net Worth** | **36,249 Qian** |
| **Latest Snapshot** | [`saves/snapshots/SNAP-0001.md`](saves/snapshots/SNAP-0001.md) |
| **Audit Status** | **100% Reconciled (0 discrepancy)** |

---

## 2. Rolling Turn History & Key Milestones

### [Turn 2 (In Progress)] — Month 3, 184 AD
- **184-03-03 to 184-03-08**:
  - **Mentorship at Master Lu's Estate**: Liang Yan brought fine wine and tea (300 Qian, `TXN-01840303-0001`).
  - **Check Score 65 vs DC 45**: Unlocked `SKL-MGT-ENTERPRISE` at Tier 1 (18/20 EXP).
- **184-03-09 to 184-03-10**:
  - **Balanced Material Procurement (2,560 Qian total)**:
    - 80 bamboo bundles + 8 twine spools from Reed Guild (`TXN-01840309-0002`: 1,360 Qian).
    - 10 prime cured hides from Zhang Fei's butchery (`TXN-01840309-0003`: 1,000 Qian). Zhang Fei sentiment $\rightarrow$ **+24**.
    - 5 cured timber bundles from Master Lu (`TXN-01840309-0004`: 200 Qian). Master Lu sentiment $\rightarrow$ **+50**.
  - **Workshop Expansion**: Added Product Line C: `PROD-SHIELD-BAM` (Leather-Bound Bamboo Shield / Lao Thuẫn).
  - **Planned Production Run**:
    - 35 Military Pack Baskets (`PROD-BASK`).
    - 10 Prototype Leather-Bound Bamboo Shields (`PROD-SHIELD-BAM`).
    - 20 Standard Woven Mats (`PROD-MAT`).

### [Turn 1] — Month 2, 184 AD: Strategic Stockpiling & Outbreak
- Acquired 10 Dan grain hedge. Produced 49 mats & 29 baskets. Sold wholesale to Zhang Shiping and Yamen. Reconciled net worth 36,558 Qian.

### [Turn 0] — 184-02-01: Baseline Initialization
- Initialized core memory files, starting float (15,000 Qian), workshop `BIZ-0001`, verified clean state.

---

## 3. Immediate Crossroads & Tactical Dilemmas (Turn 2 / Month 3, 184 AD)

1. **Production & Delegation Execution**:
   - Kho xưởng đã đầy đủ vật tư (95 trúc, 20 da, 5 gỗ).
   - Triển khai quy chế phân đoạn và trả công theo định ngạch sẽ kích hoạt thăng cấp `SKL-MGT-ENTERPRISE` lên **Tier 2 (Thành thạo - Trao quyền SOP)**.
2. **Tiếp cận Đội quân Tình nguyện Lưu Bị**:
   - Khi 10 khiên tre bọc da và 35 giỏ lương hoàn thành, Lương Nhan có thể trực tiếp mang sản phẩm mẫu đến doanh trại cổng nam để Lưu Bị, Quan Vũ và Trương Phi kiểm định.
3. **Phòng vệ Trác Huyện**:
   - Tin thám mã báo về: Quân Khăn Vàng Trình Viễn Chí đã vượt qua biên giới Ký Châu, cách Trác Huyện chưa đầy 120 dặm (khoảng 3-4 ngày hành quân).
