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
| **Current In-Game Date** | **Year 184 AD, Month 4, Day 5** (Early Summer) |
| **Active Turn** | **Turn 3 in progress (Relief Expedition to Qingzhou Encamped)** |
| **Current Theater** | Outskirts of Qingzhou City (`LOC-0004`) |
| **Permanent Base** | Liang Clan Workshop (`BIZ-0001`), Zhuo County (Autonomously Active) |
| **Liquid Capital** | **13,940 Qian** (10,940 Qian in mobile war chest + 3,000 Qian in Zhuo safe) |
| **Accounts Receivable (AR)**| **0 Qian** (All contracts settled) |
| **Strategic Grain** | **9.60 Dan** (Secured at Zhuo workshop storeroom) |
| **Inventory Valuation** | **21,058 Qian** (Weapons, mules, materials, finished stock) |
| **Fixed Capital** | **19,600 Qian** (Compound, 3 looms, tools, handcart) |
| **Total Net Worth** | **54,598 Qian** |
| **Latest Snapshot** | [`saves/snapshots/SNAP-0003.md`](saves/snapshots/SNAP-0003.md) |
| **Audit Status** | **100% Reconciled (0 discrepancy)** |

---

## 2. Rolling Turn History & Key Milestones

### [Turn 3 (In Progress)] — Month 4, 184 AD
- **184-03-25 to 184-04-01**:
  - **Workshop Autonomous Expansion in Zhuo County**:
    - Liang Yan left 3,000 Qian operating float; Foreman Chen Bao assumed autonomous daily leadership with Master Lu serving as external advisor.
    - Hired 2 apprentices (`NPC-0009` Shen Fu, `NPC-0010` He Da), boosting capacity to 800 hrs/mo.
  - **Martial & Strategic Breakthroughs on the March**:
    - Sparring with Zhang Fei: Unlocked `SKL-WAR-SPEAR` Tier 3 (Proficient, 45/60 EXP) & "Coiled Serpent Counter". WAR $\rightarrow$ **58**.
    - Strategy discourse with Guan Yu & Liu Bei: Unlocked `SKL-TAC-STRAT` Tier 2 (Competent, 26/40 EXP). INT $\rightarrow$ **76**.
- **184-04-05**:
  - Relief army (1,500 allied troops) arrives 20 Li from Qingzhou. 30,000 Yellow Turban rebels besieging the city prepare to crush the relief force.

### [Turn 2] — Month 3, 184 AD: Daxing Mountain Triumph & Contract Settlement
- Mentored by Master Lu (MGT Tier 1). Procured materials (2,560 Qian). Sealed contract with Liu Bei (2,950 Qian). Unlocked MGT Tier 2 SOP. Executed dual rear-guard & frontline ambush at Daxing Mountain; Guan Yu slew Cheng Yuanzhi, Zhang Fei impaled Deng Mao. Collected 1,950 Qian AR + 500 bounty + 20 weapons + 2 pack mules. Net worth reached 54,398 Qian.

### [Turn 1] — Month 2, 184 AD: Strategic Stockpiling & Outbreak
- Acquired 10 Dan grain hedge. Produced 49 mats & 29 baskets. Reconciled net worth 36,558 Qian.

### [Turn 0] — 184-02-01: Baseline Initialization
- Initialized core memory files, starting float (15,000 Qian), workshop `BIZ-0001`, verified clean state.

---

## 3. Immediate Crossroads: The Battle for Qingzhou (Trận Quyết Chiến Giải Vây Thanh Châu)

The 30,000 Yellow Turban rebels under regional commander Zhang Mancheng's splinter force have spotted the relief banners of Zou Jing and Liu Bei.

**Allied Force**:
- 1,000 Youzhou regular infantry & archers (Colonel Zou Jing)
- 500 Hardened volunteer shock infantry with bamboo shields (Liu Bei, Guan Yu, Zhang Fei)
- Baggage train, rations & reserve guards (Liang Yan)
- 1,500 Besieged garrison troops inside Qingzhou City (Governor Gong Jing)

**Liang Yan's Tactical Stratagem Options (`SKL-TAC-STRAT` Tier 2 Active)**:

1. **Kế sách 1 (Dương Đông Kích Tây / Lừa Địch Rút Khỏi Thành)**:
   - Cho Zou Jing phô trương cờ xí làm nghi binh khiêu chiến chính diện nhử đại quân giặc rời khỏi chân thành.
   - Lưu Bị, Quan Vũ, Trương Phi dẫn 500 dũng sĩ tinh nhuệ luồn sườn núi đánh úp lưng trại địch.
   - Bắn pháo hiệu để Thái thú Cung Cảnh mở toang cổng thành dốc toàn lực 1.500 quân đánh kẹp từ trong ra (Thế gọng kìm trong ngoài giáp công).
2. **Kế sách 2 (Hỏa công Thiêu Hủy Doanh trại Lương thảo Giặc)**:
   - Lợi dụng gió đầu mùa hè, cho toán kỵ mã thám thính luồn đêm phóng hỏa đốt sạch kho cỏ và rào trại phía sau của quân Khăn Vàng, gây hoảng loạn rồi mới tổng tấn công.
3. **Kế sách 3 (Lập Trận Địa Kiên Cố Tiêu Hao Sinh Lực)**:
   - Dùng xe chở khiên tre bọc da và chông gỗ lập thành thế trận mai rùa phòng thủ vững chắc, dụ giặc lao vào để cung tiễn bắn hạ hàng loạt, sau đó Quan - Trương mới tung kỵ binh truy quét.
