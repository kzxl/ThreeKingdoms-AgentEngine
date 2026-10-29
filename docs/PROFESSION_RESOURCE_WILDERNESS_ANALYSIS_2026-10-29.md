# Phân tích: Nghề nông – ngư – dược, ruộng đất và cảnh dã ngoại

**Ngày:** 2026-10-29
**Vai trò:** Game Designer + System Designer
**Phạm vi:** `src/modules/professions`, `src/modules/contextual-actions`, `src/modules/lineage-succession`, `public/js/map-data.js`, `public/js/modals.js`, `public/js/personal-journal-ui.js`, `saves/session.db`

> **Trạng thái Phase 0 (2026-10-29):** đã thêm 16 node FARM/FISH/GAME/MINERAL/HERB, thêm `PROF_FARMER`/`PROF_FISHER`/`PROF_HUNTER`, chặn gather từ xa theo `player_state.current_location`, lọc điểm thu thập theo thành hiện tại, và thêm mode **Tài Nguyên** trên map với vùng màu + bộ lọc 7 loại. Chưa làm ruộng đất/mùa vụ (Phase 1), cảnh dã ngoại (Phase 2), và kỹ năng mới (Phase 3).

---

## 0. Kết luận trong một đoạn

**Hệ thống nghề và tài nguyên đã có khoảng một nửa hạ tầng, nhưng bị ngắt khỏi không gian và thiếu hẳn nhóm sinh kế nông – ngư.**

- Đã có: bảng `gathering_nodes` (7 điểm), `character_professions` (10 dòng), `master_skills` (36), API `/api/professions/nodes` + `/api/professions/gather`, cơ chế thể lực, EXP nghề, tự mở nghề mới, tồn kho, stock movement.
- Chưa có: nghề **Nông dân**, **Ngư dân**, **Thợ săn**; loại tài nguyên **FARM**, **FISH**, **GAME**; bảng **ruộng đất/thuê đất**; mùa vụ; cảnh dã ngoại có hoạt động thật.
- Lỗi không gian nghiêm trọng: `gatherResource()` **không kiểm tra người chơi đang ở đâu**. Từ Vườn Đào vẫn khai thác được mỏ ở Lạc Dương hay hái thuốc ở Nga Mi; vật phẩm luôn nhập về `'Zhuo Workshop'`.
- Dữ liệu địa điểm đã có sẵn nhưng bị bỏ phí: `master_locations` có **133 sub-location** (bến sông, sơn đạo, cổ đạo, thủy lợi, hải cảng…), trong khi `map-data.js` chỉ có **40**, và **15/20 thành chỉ có đúng 1 sub-location**. Người chơi gần như không thể rời "căn phòng" mặc định của thành.

**Trả lời trực tiếp:**
- Nông dân **chưa thể** mua/thuê ruộng — không có bảng đất, không có nghề nông, không có mùa vụ.
- Ngư dân **chưa thể** câu cá — không có node FISH, không có nghề ngư, dù bến sông/hồ đã có tên trong dữ liệu.
- Dược sư **có thể** hái thuốc (2 node HERB), nhưng đang hái từ xa, không cần tới địa điểm, không có phẩm chất dược liệu.
- **Có cần layer tài nguyên?** Có — nhưng là **một overlay/mode trên bản đồ hiện tại**, không phải bản đồ thứ hai.
- **Có nên thêm cảnh dã ngoại?** Có, và nên dùng chính 133 sub-location đã có, bắt đầu với 8–12 điểm.

---

## 1. Hiện trạng codebase

### 1.1. Nghề nghiệp

`character_professions` hiện có 10 dòng. Nhân vật chính `PLY-0001` sở hữu:

| Nghề | Bậc | Nhóm |
|---|---:|---|
| Thợ Đan Dệt & Chế Tác Khí Giới | 2 | CRAFTING |
| Hành Thương Trù Vận | 3 | COMMERCE |
| Khai Khoáng & Luyện Quặng | 2 | GATHERING |
| Thái Dược & Biện Thảo | 3 | GATHERING |
| Chiến Địa Ngoại Khoa Sư | 1 | EMERGENT_INNOVATION |

**Không có** `PROF_FARMER`, `PROF_FISHER`, `PROF_HUNTER`.

`master_skills` có 36 kỹ năng, chia 8 domain: COMMERCE, CRAFT, DIPLOMACY, LEADERSHIP, LOGISTICS, MARTIAL, POLITICS, TACTICS. **Không có domain AGRICULTURE/FISHING/FORAGING**. Hai kỹ năng gần nhất là:

- `SKL-POL-TUNTIAN` — Đồn Điền Tích Cốc & Khuyến Nông (kỹ năng chính sách, không phải lao động cá nhân).
- `SKL-POL-IRRIG` — Khơi Kênh Dẫn Nước & Trị Thủy (chính sách thủy lợi).

Career Journal (`public/js/personal-journal-ui.js`) có 5 nhánh: **Thợ Cả, Thương Nhân, Võ Hiệp, Sĩ Đồ, Tông Tộc**. Không có nhánh nông/ngư/dược, dù nghề Dược sư đã tồn tại trong dữ liệu.

### 1.2. Điểm thu thập tài nguyên

`gathering_nodes` có 7 dòng:

| Node | Thành | Loại | Sản vật | Thể lực |
|---|---|---|---|---:|
| Mỏ Quặng Sắt Tây Sơn | Trác Huyện | MINERAL | Quặng sắt thô | 15 |
| Thung Lũng Dược Thảo Đào Viên | Trác Huyện | HERB | Thảo dược rừng | 12 |
| Rừng Thiết Mộc Kế Thành | Kế Thành | TIMBER | Gỗ sồi | 18 |
| Hang Khoáng Lưu Huỳnh Cự Lộc | Quảng Tông | MINERAL | Lưu huỳnh | 20 |
| Mỏ Chu Sa Mang Sơn | Lạc Dương | MINERAL | Chu sa | 25 |
| Bãi Nấu Muối Duyên Hải | Bình Nguyên | SALT_WELL | Muối biển | 14 |
| Dược Lĩnh Nga Mi Sơn | Thành Đô | HERB | Thảo dược rừng | 16 |

**Không có** FISH, FARM, GAME, CLAY, REED. Không có node nước nào dù dữ liệu địa điểm có rất nhiều bến sông/hồ.

`gatherResource()` (`src/modules/professions/professions.module.ts:139`):

- Chỉ kiểm tra `fatigue`, không kiểm tra vị trí, thời gian, công cụ, kỹ năng.
- `required_skill_code` có trong schema nhưng **không được đọc**.
- `profCodeMap` (`:155`) chỉ có MINERAL → MINER, HERB → HERBALIST, TIMBER → CARPENTER, SALT_WELL → SALT_MAKER.
- Vật phẩm luôn ghi vào `inventory_items.location = 'Zhuo Workshop'` (`:209`), bất kể đang ở Thành Đô hay Lạc Dương.
- Không có hao phí thời gian/lượt, không có respawn/cạn kiệt, không có phẩm chất, không có rủi ro.

### 1.3. UI hiện tại

- UI khai thác nằm trong **Game Manager** (`public/index.html:791`, `public/js/modals.js:1301`), không nằm trên map hay scene.
- Danh sách hiển thị **toàn bộ node của cả nước**, bấm "Tiến Vào Khai Thác" là gọi API trực tiếp (`public/js/modals.js:1406`, `:1445`).
- Không có khoảng cách, không có di chuyển, không có điều kiện tại chỗ.
- Không có màn hình ruộng, không có lịch mùa vụ, không có hợp đồng thuê đất.

### 1.4. Địa điểm và dã ngoại

`master_locations` có 20 thành, **133 sub-location**, gồm nhiều địa danh hoang dã/dã ngoại:

| Thành | Sub-location tiêu biểu |
|---|---|
| Lạc Dương | Bắc Mang Sơn Cổ Đạo |
| Kế Thành | Liêu Đông Cổ Lộ |
| Tương Dương | Lộc Môn Sơn Đạo Quán, Long Trung Ngọa Long Cương |
| Hán Trung | Định Quân Sơn Hiểm Ải, Kiếm Các Thiên Hiểm, Dương Bình Quan |
| Thượng Đảng | Thái Hành Sơn Đạo, Thượng Đảng Mỏ Sắt, Thảo Nguyên Kỵ Trại |
| Thành Đô | Đô Giang Yển Thủy Lợi |
| Kiến Nghiệp | Thái Hồ Thủy Trại, Giang Nam Thương Cảng |
| Hạ Phì | Nghi Thủy Bến Sông |
| Thọ Xuân | Bến Sông Hoài Thủy |
| Uyển Thành | Dục Thủy Cổ Bến |
| Giang Lăng | Bến Cảng Trường Giang |
| Xích Bích | Ô Lâm Thủy Trại, Thất Tinh Đàn Cầu Phong |
| Giao Chỉ | Rừng Trầm Hương Lĩnh Nam, Phiên Ngung Hải Cảng |

Nhưng `map-data.js` chỉ có **40 sub-location**, và **15/20 thành chỉ có 1 sub-location** (thường là phủ/nha môn). `renderLocalPoiNav()` và `travelLocalPoi()` chỉ cho đi tới các sub-location nằm trong `currentRegion.subLocations` (`public/js/map-data.js:1567`, `:1676`). Vì vậy phần lớn địa danh dã ngoại trong `master_locations` **không thể tới được**.

`context-action.engine.ts:118` chỉ có case riêng cho ~19 sub-location mặc định; mọi sub-location khác rơi vào `generateGenericChoices()` (`:170`), nghĩa là dù có tới được cũng chỉ nhận 4 lựa chọn chung, không có hoạt động đặc thù.

### 1.5. Ruộng đất

**Không có bảng đất/ruộng/hợp đồng thuê.** `businesses.monthly_rent` là tiền thuê mặt bằng xưởng/tửu điếm, không phải ruộng.

Tuy nhiên dữ liệu đã "mơ" tới nông nghiệp:

- `location_encounter_rates` có dòng `FARM_FIELD` / `FARM` / `PEASANT` (gặp nông gia thôn nữ khi canh tác). Hiện **không có caller nào** dùng `FARM_FIELD`; hệ encounter mới chỉ dùng cho xã giao.
- `regional_ecological_crises` đã có `agriculture_penalty`, `grain_price_multiplier`, `severity_level` — sẵn sàng cho mùa vụ/thiên tai.
- `SKL-POL-TUNTIAN`, `SKL-POL-IRRIG` đã có — sẵn sàng cho kỹ năng nông chính.
- `businesses` đã có mô hình rent/efficiency/workforce — có thể tái dùng cho nông trang.

### 1.6. Kinh tế và tồn kho

- `inventory_items` (15 dòng) và `stock_movements` (31) đã hỗ trợ nguyên liệu thô.
- `master_items` có commodity codes cho nông/ngư: gạo, muối, cá khô, da, gỗ, dược liệu…
- `apiFetchRegionalPrices` / `/api/economy/regional-prices` đã có giá theo thành.
- Chưa có kho theo thành: `inventory_items.location` là chuỗi tự do, gather hardcode `'Zhuo Workshop'`.

---

## 2. Bảng thiếu sót

| # | Thiếu sót | Mức | Bằng chứng |
|---|---|---|---|
| 1 | Khai thác từ xa, không kiểm tra vị trí | **Critical** | `professions.module.ts:139-230`; `modals.js:1445` |
| 2 | Vật phẩm luôn về `'Zhuo Workshop'` | Cao | `professions.module.ts:209` |
| 3 | Không có nghề Nông/Ngư/Thợ săn | Cao | `character_professions` 10 dòng; career 5 nhánh |
| 4 | Không có FISH/FARM/GAME resource type | Cao | `gathering_nodes` 7 dòng |
| 5 | Không có ruộng đất, mua/thuê, mùa vụ | Cao | Không có bảng `land_*`; `businesses.monthly_rent` chỉ là mặt bằng |
| 6 | 133 master sub-location vs 40 map sub-location | Cao | `master_locations` vs `map-data.js` |
| 7 | 15/20 thành chỉ có 1 sub-location | Cao | Đo trực tiếp từ `WORLD_MAP_NODES` |
| 8 | Dã ngoại chỉ có tên, không có hoạt động | Cao | `context-action.engine.ts:170` generic fallback |
| 9 | `required_skill_code` không được enforce | Trung bình | Schema có, `gatherResource` không đọc |
| 10 | Node vô hạn, không respawn/cạn kiệt/phẩm chất | Trung bình | Không có cột tương ứng |
| 11 | Không có công cụ (cần câu/lưới/cuốc/rìu) | Trung bình | Không có `required_tool_code` |
| 12 | Không có rủi ro dã ngoại (thú dữ, cướp, thời tiết) | Trung bình | Bandit/crisis có dữ liệu nhưng không nối vào gather |
| 13 | Không có layer tài nguyên trên map | Trung bình | Map chỉ có 3 mode overview/military/economy |
| 14 | Nghề nông/ngư không có trong Career Journal | Trung bình | `personal-journal-ui.js` 5 nhánh |
| 15 | Không có kỹ năng cá nhân cho nông/ngư/săn | Trung bình | `master_skills` 8 domain |
| 16 | Gather không tốn thời gian/lượt | Trung bình | Chỉ trừ fatigue |
| 17 | Không có kho địa phương | Trung bình | `inventory_items.location` hardcode |
| 18 | Không có thị trường tiêu thụ theo vùng cho nông/ngư | Thấp | Regional prices có, nhưng gather không dùng |
| 19 | Không có NPC tá điền/ngư hộ làm việc | Thấp | `workforce` chỉ cho xưởng |
| 20 | Dữ liệu địa điểm bị trùng 3 nguồn | Cao (kỹ thuật) | `master_locations`, `map-data.subLocations`, `gathering_nodes.settlement_id` |

---

## 3. Đề xuất kiến trúc

### 3.1. Nguyên tắc

1. **Một nguồn sự thật cho địa điểm.** `master_locations.sub_locations` là canonical; `map-data` chỉ là projection/alias, không tự viết tay danh sách thứ hai.
2. **Hoạt động phải có không gian.** Không gather nếu không đứng tại sub-location tương ứng.
3. **Tài nguyên là node có trạng thái**, không phải bảng yield tĩnh.
4. **Ruộng đất là tài sản**, không phải một nút "hái ruộng".
5. **Dã ngoại là scene type**, không phải thêm 100 node lên bản đồ chiến lược.

### 3.2. Mô hình địa điểm thống nhất

Tạo bảng `location_sublocations`:

```sql
CREATE TABLE location_sublocations (
  sub_location_id TEXT PRIMARY KEY,       -- SL-ZHUO-FARM-01
  settlement_id TEXT NOT NULL,            -- zhuo_xian
  name_vi TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category TEXT NOT NULL,                 -- URBAN | WILDERNESS | WATER | ROAD | RUINS
  node_type TEXT NOT NULL,                -- FARM_FIELD, FISHING_SPOT, HERB_PATCH, MINE, FOREST, HUNTING_GROUND, CAVE, PORT, PASS
  coord_x REAL, coord_y REAL,              -- toạ độ trên map nếu cần overlay
  travel_fatigue INTEGER DEFAULT 0,
  danger_level INTEGER DEFAULT 0,
  discovered INTEGER DEFAULT 1,
  active INTEGER DEFAULT 1
);
```

- Seed từ 133 sub-location hiện có, phân loại theo tên/ngữ nghĩa.
- `gathering_nodes` đổi thành `activity_nodes`, thêm `sub_location_id`.
- `map-data` sinh `subLocations` từ registry này (hoặc gọi API) thay vì viết tay.

### 3.3. Mô hình tài nguyên

```sql
CREATE TABLE activity_nodes (
  node_id TEXT PRIMARY KEY,
  sub_location_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,             -- FARM, FISH, HERB, MINERAL, TIMBER, GAME, SALT_WELL, CLAY
  yield_item_code TEXT NOT NULL,
  yield_quantity_min REAL NOT NULL,
  yield_quantity_max REAL NOT NULL,
  quality_tier INTEGER DEFAULT 1,
  fatigue_cost INTEGER NOT NULL,
  required_skill_code TEXT,
  required_tool_code TEXT,
  respawn_turns INTEGER DEFAULT 1,
  remaining_yield REAL,
  owner_faction_id TEXT,
  owner_character_id TEXT,
  season_mask TEXT,                        -- SPRING,SUMMER,AUTUMN,WINTER
  danger_level INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);
```

- Node nên có `remaining_yield` và respawn theo lượt.
- Cùng một sub-location có thể có nhiều node (ruộng + bờ kênh + bãi cá).
- `required_skill_code` phải được enforce; nếu thiếu kỹ năng → yield thấp hoặc không cho làm.

### 3.4. Mô hình ruộng đất

```sql
CREATE TABLE land_plots (
  plot_id TEXT PRIMARY KEY,
  settlement_id TEXT NOT NULL,
  sub_location_id TEXT,
  name_vi TEXT, name_en TEXT,
  area_mu REAL NOT NULL,
  soil_quality INTEGER DEFAULT 50,         -- 0-100
  irrigation INTEGER DEFAULT 50,           -- 0-100
  base_yield REAL NOT NULL,
  owner_type TEXT NOT NULL,                -- STATE | FACTION | NPC | PLAYER
  owner_id TEXT,
  sale_price_qian INTEGER,
  lease_price_qian INTEGER,
  status TEXT NOT NULL,                    -- FREE | LEASED | OWNED | FALLOW
  season_mask TEXT
);

CREATE TABLE land_contracts (
  contract_id TEXT PRIMARY KEY,
  plot_id TEXT NOT NULL,
  lessee_id TEXT NOT NULL,
  lessor_id TEXT NOT NULL,
  contract_type TEXT NOT NULL,             -- RENT | SHARE | TENANT
  rent_qian INTEGER,
  share_ratio REAL,
  start_turn INTEGER NOT NULL,
  end_turn INTEGER,
  status TEXT NOT NULL                     -- ACTIVE | ENDED | BREACHED
);

CREATE TABLE crop_cycles (
  cycle_id TEXT PRIMARY KEY,
  plot_id TEXT NOT NULL,
  crop_item_code TEXT NOT NULL,
  planted_turn INTEGER NOT NULL,
  harvest_turn INTEGER NOT NULL,
  expected_yield REAL NOT NULL,
  actual_yield REAL,
  risk REAL,
  status TEXT NOT NULL                     -- GROWING | HARVESTED | FAILED
);
```

- **Thuê ruộng**: trả `rent_qian` mỗi vụ/tháng; có thể chia sản lượng (`SHARE`) hoặc tá điền (`TENANT`).
- **Mua ruộng**: trả `sale_price_qian`; đổi `owner_type=PLAYER`; có thể cho NPC thuê lại.
- **Mùa vụ**: `planted_turn` → `harvest_turn`; `turn advance` cập nhật; crises/weather nhân yield.
- **Thuế**: dùng `account_journal` ghi thuế ruộng; `businesses` có thể là nông trang (`business_type='FARM'`) với rent/efficiency/workforce.

### 3.5. Nghề và kỹ năng

Thêm vào `character_professions` (tự mở khi hoạt động lần đầu):

- `PROF_FARMER` — Nông Phu / Farmer.
- `PROF_FISHER` — Ngư Hộ / Fisher.
- `PROF_HUNTER` — Sơn Tiêu / Hunter.
- `PROF_WOODCUTTER` — Tiều Phu / Woodcutter (hoặc dùng CARPENTER).
- `PROF_HERBALIST` đã có.

Mapping:

```js
FARM: 'PROF_FARMER'
FISH: 'PROF_FISHER'
GAME: 'PROF_HUNTER'
TIMBER: 'PROF_CARPENTER'
HERB: 'PROF_HERBALIST'
MINERAL: 'PROF_MINER'
SALT_WELL: 'PROF_SALT_MAKER'
```

Thêm kỹ năng cá nhân vào `master_skills`:

- `SKL-AGR-PLANT` — Canh Tác & Chọn Giống.
- `SKL-AGR-IRRIG` — Dẫn Thủy & Đắp Bờ.
- `SKL-FISH-NET` — Giăng Lưới & Đặt Lờ.
- `SKL-FISH-BOAT` — Chèo Thuyền & Đánh Cá Sông Lớn.
- `SKL-HERB-FORAGE` — Nhận Diện Dược Thảo.
- `SKL-HUNT-TRACK` — Lần Dấu & Bẫy Thú.

Career Journal thêm 3 nhánh mới (hoặc 1 nhánh "Sinh Kế Sơn Thủy" gồm nông/ngư/dược):

- **Nông Tang** (農) — ruộng, mùa vụ, thuê đất.
- **Ngư Tiều** (漁) — sông hồ, thuyền, cá.
- **Dược Nông** (藥) — hái thuốc, bào chế, y thuật.

Mỗi nhánh có POI thực địa và mốc tiến bộ, giống 5 nhánh hiện tại.

### 3.6. Cảnh dã ngoại

Dùng chính 133 sub-location đã có, chọn 8–12 điểm tiêu biểu:

| Địa điểm | Thành | Loại | Hoạt động |
|---|---|---|---|
| Bắc Mang Sơn Cổ Đạo | Lạc Dương | MOUNTAIN_PASS | Khai khoáng, hái thuốc, gặp sơn tặc |
| Thái Hành Sơn Đạo | Thượng Đảng | MOUNTAIN_PASS | Đốn gỗ, mỏ sắt, phục kích |
| Thượng Đảng Mỏ Sắt | Thượng Đảng | MINE | Khai khoáng |
| Kiếm Các Thiên Hiểm | Hán Trung | PASS | Du ngoạn, thám hiểm, cướp |
| Định Quân Sơn Hiểm Ải | Hán Trung | MOUNTAIN | Săn bắn, dược liệu |
| Đô Giang Yển Thủy Lợi | Thành Đô | WATER/FARM | Câu cá, ruộng, thủy lợi |
| Thái Hồ Thủy Trại | Kiến Nghiệp | WATER | Câu cá, thủy chiến |
| Bến Sông Hoài Thủy | Thọ Xuân | WATER | Câu cá, vận chuyển |
| Dục Thủy Cổ Bến | Uyển Thành | WATER | Câu cá, thương thuyền |
| Bến Cảng Trường Giang | Giang Lăng | PORT | Câu cá, thủy vận |
| Rừng Trầm Hương Lĩnh Nam | Giao Chỉ | FOREST | Hái trầm, săn bắn, dược liệu |
| Long Trung Ngọa Long Cương | Tương Dương | HILL | Dược liệu, ẩn sĩ, gặp Gia Cát |

Cơ chế scene dã ngoại:

- Entry từ local POI picker (nhóm "Dã Ngoại") hoặc resource overlay.
- Tốn thể lực + thời gian; có encounter table: bandit, thú dữ, thời tiết, lữ khách, di tích.
- Trong scene: 4 choice card theo loại node (khai thác, câu cá, hái thuốc, săn, nghỉ, quay về).
- `context-action.engine` thêm `generateWildernessChoices(nodeType)` thay vì fallback generic.
- Rời scene quay về thành gần nhất; có thể bị chặn nếu thời tiết/bandit.

### 3.7. Layer tài nguyên trên map

**Có, nhưng là overlay/mode thứ 4**, không phải bản đồ mới:

- Thêm mode **"Tài Nguyên"** cạnh Toàn Cảnh / Quân Sự / Kinh Tế.
- Ở tầng châu quận: icon theo loại (農 漁 藥 礦 木 獵 洞 渡), chỉ hiện node đã khám phá.
- Ở tầng cận cảnh: hiện tên node, sản vật, thể lực, độ nguy hiểm, chủ sở hữu.
- Filter theo nghề: Nông / Ngư / Dược / Khoáng / Mộc / Săn.
- Low zoom: cluster theo thành; high zoom: từng node.
- Click node → travel + mở scene hoạt động.
- Không hiện toàn bộ 133 node cùng lúc; chỉ node `discovered=1` hoặc thuộc thành đã biết.

### 3.8. Tích hợp turn advance

Mỗi lượt/tháng:

- Cây trồng tăng trưởng; harvest đến hạn.
- Node tài nguyên respawn/cạn kiệt.
- Hợp đồng thuê đất đến hạn/trả tiền.
- Thiên tai (`regional_ecological_crises`) nhân yield/giá lương.
- Bandit (`bandit_strongholds`) tăng danger ở node gần.
- NPC tá điền/ngư hộ sản xuất; nhập kho; báo cáo.
- Giá vùng cập nhật; caravan có thể bán nông/ngư sản.

---

## 4. API đề xuất

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/api/locations/sublocations?settlementId=` | Danh sách sub-location canonical |
| GET | `/api/activity/nodes?settlementId=&type=&discovered=` | Node tài nguyên kèm trạng thái |
| POST | `/api/activity/gather` | Gather, enforce vị trí/kỹ năng/công cụ/fatigue/respawn |
| GET | `/api/land/plots?settlementId=` | Danh sách ruộng, chủ, giá |
| POST | `/api/land/rent` | Thuê ruộng |
| POST | `/api/land/buy` | Mua ruộng |
| POST | `/api/land/plant` | Gieo trồng |
| POST | `/api/land/harvest` | Thu hoạch |
| POST | `/api/land/lease` | Cho NPC thuê lại |
| GET | `/api/map/activity-overlay` | Dữ liệu overlay tài nguyên cho map |
| POST | `/api/activity/encounter` | Xử lý encounter dã ngoại |

`/api/professions/gather` hiện tại nên được thay bằng `/api/activity/gather` hoặc siết lại: bắt buộc `characterId` đang ở đúng `sub_location_id`.

---

## 5. UI/UX đề xuất

### 5.1. Map

- Mode thứ 4 **Tài Nguyên**.
- Filter chip theo nghề.
- Tooltip node: loại, sản vật, yield, fatigue, danger, chủ, respawn.
- Nút "Đi tới" mở scene hoạt động.
- Local POI picker chia 2 nhóm: **Nội Thành** và **Dã Ngoại**.

### 5.2. Scene dã ngoại

- Card đầu scene: địa hình, thời tiết, nguy hiểm, tài nguyên.
- 4 choice card: Khai thác / Khảo sát / Nghỉ / Quay về.
- Nếu có encounter: chọn đối phó / bỏ chạy / thương lượng.
- Kết thúc: nhập kho địa phương, EXP nghề, fatigue.

### 5.3. Nông trang

- Danh sách thửa: diện tích, đất, thủy lợi, chủ, giá thuê/mua.
- Hợp đồng: thời hạn, tiền thuê, tỷ lệ chia.
- Lịch mùa vụ: đã gieo, còn bao nhiêu lượt, yield dự kiến.
- Nút: Thuê / Mua / Gieo / Thu hoạch / Cho thuê lại.
- Sổ cái: tiền thuê, thuế, doanh thu.

### 5.4. Career Journal

- Thêm 3 nhánh Nông Tang / Ngư Tiều / Dược Nông.
- Mỗi nhánh có POI thực địa, mốc tiến bộ, phần thưởng nghề.
- Hiển thị nghề hiện có (kể cả nghề tự mở) và EXP.

---

## 6. Cân bằng kinh tế

- **So sánh với làm thuê**: hiện một ca làm thuê cho ~95 Qian / 12 fatigue. Gather 2–8 nguyên liệu / 12–25 fatigue. Cần quy đổi giá trị nguyên liệu để nông/ngư không lỗ hơn làm thuê.
- **Thuê ruộng**: rent 20–40% gross hoặc fixed 1–2 thạch/vụ; mua ruộng hoàn vốn 8–15 vụ.
- **Mùa vụ**: năng suất theo mùa; đông giảm; lũ/lụt/hạn nhân yield.
- **Respawn**: node 3–7 lượt; yield giảm nếu khai thác liên tục.
- **Giới hạn**: mỗi lượt tối đa N hoạt động; fatigue; thời gian di chuyển.
- **Thị trường**: giá vùng giảm khi cung tăng; caravan để bán nơi khác.
- **Rủi ro**: bandit, thú dữ, thời tiết; mất một phần yield hoặc cargo.
- **Tập trung đất**: giới hạn số thửa; thuế; NPC tá điền; không cho chiếm hết ruộng một thành.

---

## 7. Lộ trình đề xuất

| Phase | Nội dung | Công | Giá trị |
|---|---|---:|---|
| **0** | Sửa spatial integrity: gather phải đứng đúng sub-location; nhập kho địa phương; thêm FISH/FARM nodes; thêm PROF_FARMER/FISHER; overlay tài nguyên read-only | 2–3 ngày | Chặn lỗi "hái thuốc từ xa", mở nông/ngư cơ bản |
| **1** | Ruộng đất: thuê/mua, hợp đồng, mùa vụ, UI nông trang, turn advance | 1 tuần | Trả lời trực tiếp "nông dân mua/thuê ruộng" |
| **2** | Cảnh dã ngoại: 8–12 điểm từ master_locations, scene type, encounter, local POI 2 nhóm | 1 tuần | Nhân vật hoạt động tự do hơn |
| **3** | Resource overlay đầy đủ: filter nghề, discovery, cluster, tooltip, click-to-travel | 1–2 tuần | Bản đồ tài nguyên |
| **4** | Kinh tế sâu: NPC tá điền/ngư hộ, thời tiết, giá vùng, thuế, đất market | 2–4 tuần | Vòng lặp sinh kế bền vững |

**Tổng Phase 0–3: ~4–5 tuần.** Phase 4 tùy độ sâu.

---

## 8. Tiêu chí nghiệm thu

- Không thể gather nếu không ở đúng `sub_location_id`; API trả lỗi rõ ràng.
- Vật phẩm nhập vào kho thành hiện tại, không phải `'Zhuo Workshop'`.
- Nông dân thuê/mua được thửa ruộng; gieo trồng; thu hoạch; thấy tiền thuê/thuế trong sổ cái.
- Ngư dân câu được cá ở node nước; có catch table, fatigue, risk.
- Dược sư hái thuốc ở node HERB; có phẩm chất/EXP; dùng được trong chế thuốc.
- 8–12 cảnh dã ngoại truy cập được từ map; có encounter; quay về thành.
- Resource overlay chỉ hiện node đã khám phá; filter theo nghề hoạt động.
- Turn advance cập nhật mùa vụ, respawn, hợp đồng, crisis.
- 0 orphan: mọi node/plot/sub-location resolve được.
- `npm run verify` xanh, có test contract cho activity/land.

---

## 9. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Trùng nguồn địa điểm (3 nơi) | Cao | Registry canonical + test contract |
| Nội dung phình to (133 sub-location) | Cao | Bắt đầu 8–12; seed theo phase |
| Chi phí/gọi AI cho scene dã ngoại | Trung bình | Template + generic choices, LLM chỉ cho flavor |
| Lạm phát kinh tế do gather vô hạn | Cao | Respawn, giới hạn lượt, giá vùng giảm |
| Save migration | Trung bình | Migration có version, backfill |
| Scope creep | Cao | Phase gate, không làm hết trong một lần |
| Trùng lặp với `businesses` | Trung bình | Tái dùng rent/efficiency/workforce cho nông trang |

---

## 10. Khuyến nghị cuối

1. **Đừng xây bản đồ mới.** Hạ tầng địa điểm đã có 133 sub-location; việc cần làm là **nối chúng vào map-data và scene**, không phải vẽ thêm bản đồ.
2. **Sửa spatial integrity trước.** Gather từ xa và kho hardcode là lỗi nền; nếu không sửa, mọi tính năng nông/ngư sau này đều sai.
3. **Làm nông trước, ngư sau.** Nông có sẵn crisis/giá lương/kỹ năng chính sách; ngư cần thêm catch table/công cụ nhưng ít phức tạp hơn đất đai.
4. **Resource layer là overlay, không phải map mới.** Thêm mode thứ 4, filter theo nghề, chỉ hiện node đã khám phá.
5. **Cảnh dã ngoại dùng 8–12 địa danh có sẵn**: Bắc Mang Sơn, Thái Hành Sơn Đạo, Kiếm Các, Đô Giang Yển, Thái Hồ, Hoài Thủy, Dục Thủy, Trường Giang, Rừng Trầm Hương, Long Trung.

Nếu chỉ chọn một việc: **Phase 0** — sửa gather theo vị trí + thêm FISH/FARM + nghề nông/ngư + overlay đọc-only. Đó là nền bắt buộc cho mọi thứ sau.

---

## 11. Phân tích mở rộng kỹ năng

### 11.1. Hiện trạng

`master_skills` có **36 kỹ năng / 8 domain**: COMMERCE (5), CRAFT (4), DIPLOMACY (4), LEADERSHIP (4), LOGISTICS (1), MARTIAL (7), POLITICS (5), TACTICS (6).

Không có domain/kỹ năng cá nhân cho:
- Canh tác, thủy lợi, luân canh.
- Đánh bắt, chèo thuyền, nghề cá.
- Hái thuốc, nhận diện dược thảo, bào chế.
- Săn bắn, lần dấu, thuộc da.
- Sinh tồn dã ngoại.

Các kỹ năng gần nhất là **chính sách**, không phải lao động:
- `SKL-POL-TUNTIAN` — Đồn Điền Tích Cốc & Khuyến Nông.
- `SKL-POL-IRRIG` — Khơi Kênh Dẫn Nước & Trị Thủy.
- `SKL-MED-HEAL` — Diệu Thủ Hồi Xuân (y thuật).

Hiện gather chỉ dùng **profession tier** (`tierBonus = 1 + (tier-1)*0.25`), không dùng `player_skills`; vì vậy kỹ năng cá nhân chưa có tác dụng lên nông/ngư/dược.

### 11.2. Đề xuất 12 kỹ năng mới

| Mã | Tên | Domain | Thuộc tính | Tác dụng chính |
|---|---|---|---|---|
| `SKL-AGR-PLANT` | Canh Tác & Chọn Giống | AGRICULTURE | POL + LOG | +8/16/24/32/40% sản lượng ruộng; giảm rủi ro sâu bệnh |
| `SKL-AGR-IRRIG` | Dẫn Thủy & Đắp Bờ | AGRICULTURE | LOG + POL | Giảm thiệt hại hạn/lũ; +5–25% yield khi thủy lợi cao |
| `SKL-AGR-SOIL` | Luân Canh & Phì Nhiêu | AGRICULTURE | INT + POL | Giảm suy giảm đất; mở cây trồng chất lượng cao |
| `SKL-FISH-NET` | Giăng Lưới & Đặt Lờ | FISHING | CRA + LOG | +catch size; giảm bycatch; mở node nước nông |
| `SKL-FISH-BOAT` | Chèo Thuyền & Ra Khơi | FISHING | LOG + LDR | Mở node nước sâu; giảm rủi ro bão |
| `SKL-HERB-FORAGE` | Nhận Diện Dược Thảo | FORAGING | INT + CRA | Tăng phẩm chất dược liệu; mở rare herb |
| `SKL-HERB-PREP` | Bào Chế Dược Liệu | FORAGING / CRAFT | CRA + INT | Tăng hiệu lực thuốc; giảm hao nguyên liệu |
| `SKL-HUNT-TRACK` | Lần Dấu & Bẫy Thú | SURVIVAL | WAR + INT | Phát hiện thú/ổ phỉ; mở rare game |
| `SKL-HUNT-SKIN` | Lột Da & Thuộc Da | SURVIVAL / CRAFT | CRA + WAR | +hide yield/phẩm chất; giảm hư da |
| `SKL-LAND-LEASE` | Điền Sản & Khế Ước | COMMERCE | COM + POL | Giảm tiền thuê, giảm rủi ro hợp đồng |
| `SKL-FARM-LABOR` | Quản Lý Tá Điền | LEADERSHIP | LDR + LOG | Tăng hiệu suất NPC tá điền; giảm thất thoát |
| `SKL-WILD-SURVIVAL` | Sinh Tồn Dã Ngoại | SURVIVAL | LOG + WAR | Giảm fatigue di chuyển; tăng cơ hội thoát encounter |

### 11.3. Domain

Đề xuất **thêm 3 domain** thay vì nhồi vào domain cũ:

- `AGRICULTURE` — 3 kỹ năng nông.
- `FISHING` — 2 kỹ năng ngư.
- `SURVIVAL` — 3 kỹ năng săn/sinh tồn; `FORAGING` có thể gộp vào đây hoặc tách riêng.

Nếu muốn giữ 8 domain hiện tại: gộp `AGRICULTURE` vào POLITICS, `FISHING` vào LOGISTICS, `SURVIVAL` vào MARTIAL/CRAFT. Cách này ít migration nhưng làm mất ngữ nghĩa “kỹ năng sinh kế”.

### 11.4. Công thức áp dụng

Gather/farm/fish hiện tại:

```
yield = random(min,max) * (1 + (professionTier-1)*0.25)
```

Đề xuất:

```
yield = random(min,max)
      * professionBonus        (1 + (tier-1)*0.15, giảm từ 25% để tránh lạm phát)
      * skillBonus             (1 + skillTier*0.06, tối đa +30%)
      * qualityBonus           (0.8–1.4 theo phẩm chất đất/nước/dược liệu)
      * seasonBonus            (0.7–1.3)
      * crisisPenalty          (0.5–1.0)
```

Fatigue:

```
fatigue = baseFatigue
        * (1 - survivalSkill*0.05)   // tối đa -25%
        * toolModifier
```

Giới hạn:
- Tổng yield multiplier ≤ 2.2.
- Fatigue reduction ≤ 40%.
- Rare node chỉ mở khi skill ≥ tier 3.
- Không cho cùng một kỹ năng vừa tăng yield vừa giảm fatigue quá mạnh.

### 11.5. Cách học kỹ năng

1. **Practice-based**: mỗi lần gather/farm/fish thành công → +EXP vào đúng skill; tier up theo ngưỡng.
2. **Trainer**: NPC thợ cả/lão nông/ngư trưởng tại thành dạy tier 1–2, thu phí.
3. **Master-apprentice**: NPC tá điền/ngư hộ có skill cao truyền cho player theo thời gian.
4. **Sách/bí kíp**: vật phẩm trong `master_items` mở tier 3–5.
5. **Emergent breakthrough**: kết hợp 2 nghề (đã có `checkAndTriggerBreakthrough`) để mở skill lai, ví dụ Nông + Dược → `SKL-HERB-CULTIVATE` (trồng dược liệu).

### 11.6. UI

- Career Journal thêm tab **Kỹ Năng Sinh Kế** hoặc mở rộng tab Chí Hướng.
- Activity sheet hiển thị: kỹ năng liên quan, tier, bonus dự kiến, fatigue sau giảm.
- Map resource tooltip hiển thị “Cần `SKL-FISH-BOAT` để ra khơi”.
- Trainer NPC có nút “Học nghề” khi gặp tại đúng địa điểm.

### 11.7. Lộ trình kỹ năng

| Phase | Việc | Công |
|---|---|---:|
| S1 | Seed 12 skill vào `master_skills`, chưa áp dụng | 1 ngày |
| S2 | Áp dụng skillBonus vào gather; hiển thị trong activity sheet | 2 ngày |
| S3 | Practice-based skill EXP + trainer tại thành | 3–4 ngày |
| S4 | Farm/fish/hunt skill checks, rare node, tool requirement | 1 tuần |
| S5 | Master-apprentice, sách bí kíp, breakthrough synergy | 1–2 tuần |

### 11.8. Tiêu chí nghiệm thu kỹ năng

- Mỗi hành động gather/farm/fish ghi EXP vào đúng skill.
- Yield hiển thị breakdown: base × profession × skill × quality × season.
- Không có multiplier vượt cap 2.2.
- Trainer chỉ dạy khi ở đúng thành và đủ tiền.
- Rare node yêu cầu skill tier đúng như mô tả.
- `npm run verify` có test cho công thức yield và skill gate.
