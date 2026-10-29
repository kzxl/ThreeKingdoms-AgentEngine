# Dư Đồ Tam Quốc — Kế hoạch nâng cấp sâu (Level 2 → 5)

**Ngày:** 2026-10-29
**Vai trò:** Game Designer + UX/UI Designer
**Trạng thái hiện tại:** bản đồ đã có semantic zoom, route interaction, 3 chế độ xem, minimap, song ngữ và 20 ấn triện chuẩn.
**Câu hỏi:** nâng cấp sâu hơn nữa thì làm gì?

> **Trạng thái triển khai (2026-10-29): Level 2, A6/A7 và Level 3 token đã xong.**
> Đã làm: `map-live.service.ts` (23→20 registry), bind 15 endpoint live; chip LIVE/BLUEPRINT/LỖI; trạng thái/threat live; gate chiêu mộ & thương đoàn theo tiền/hàng/giá hộ vệ thật; merge 41 master_routes qua `/api/locations`; token thương đoàn/quân đoàn/ổ phỉ/khủng hoảng + toggle layer + click action; danh sách nhân tài theo vị trí thực (baseline/business); sửa modal di chuyển và modal chuyển lượt rỗng.
> Chưa làm: hành động sâu trên ổ phỉ/khủng hoảng (đánh dẹp/cứu tế), tiến độ quân đoàn thật (cần cột departure/arrival), fog of war, waypoint, ngoại giao, địa hình/mùa.

---

## 0. Kết luận trong một đoạn

**Nâng cấp sâu tiếp theo không phải là vẽ đẹp hơn, mà là làm bản đồ đọc đúng dữ liệu mô phỏng và trở thành bàn chỉ huy.**

Hiện tại bản đồ vẽ từ `WORLD_MAP_NODES` — dữ liệu blueprint tĩnh. Trong khi phiên chơi đã có trạng thái sống trong `session_settlements`, `session_factions`, `trade_caravans`, `military_expeditions`, `bandit_strongholds`, `faction_diplomacy`. Khoảng cách này tạo ra các con số sai lệch ngay trên màn hình:

| Thành | Blueprint (map đang hiện) | Live (session.db) |
|---|---:|---:|
| Nghiệp Thành | 9,000 quân | **285 quân**, lương 0 |
| Trác Huyện | 1,500 quân | **1,875 quân**, lương 639 |
| Lạc Dương | 12,000 quân (blueprint) | **15,000 quân**, lương 7,996 |
| Hứa Xương | 8,000 quân (blueprint) | **7,500 quân**, lương 4,446 |

Người chơi đang ra quyết định hành quân dựa trên số liệu không còn đúng. Đây là vấn đề lớn hơn mọi chi tiết mỹ thuật.

**Thứ tự nâng cấp đề xuất:**
1. **Level 2 — Live Map:** bind bản đồ vào trạng thái phiên chơi (1–1.5 tuần).
2. **Level 3 — Living Layer:** thương đoàn/quân đoàn/ổ phỉ/khủng hoảng di chuyển trên bản đồ (1–1.5 tuần).
3. **Level 4 — Command Layer:** chọn tuyến nhiều chặng, tiếp vận, chặn đường, ngoại giao, sương mù (2–3 tuần).
4. **Level 5 — Cartographic Depth:** địa hình, mùa, dòng thời gian, replay (3–5 tuần).

---

## 1. Khoảng cách hiện tại: map tĩnh vs simulation sống

### 1.1. Dữ liệu đã có, chưa dùng trên bản đồ

| Nguồn | Số lượng hiện tại | API/ bảng | Có thể dùng cho |
|---|---:|---|---|
| Thương đoàn | **18** (12 ARRIVED, 6 SUCCESS_TRADED) | `/api/economy/caravans`, `trade_caravans` | Token di chuyển theo `route_progress` |
| Quân đoàn | **0** hiện tại, schema sẵn | `/api/expeditions`, `military_expeditions` | Token từ `origin → target`, số quân, lương |
| Phe phái | **17** | `/api/factions`, `session_factions` | Màu lãnh thổ, thủ phủ, uy tín, quân lực |
| Quan hệ ngoại giao | **136** dòng | `faction_diplomacy` (chưa có route) | WAR / NEUTRAL / ALLIANCE, thiện chí, triều cống |
| Ổ phỉ | **5 active** | `/api/logistics/strongholds`, `bandit_strongholds` | Icon ổ phỉ, bounty, đánh dẹp |
| Khủng hoảng sinh thái | 2 tổng, **0 active** | `/api/ecology/crises` | Icon thiên tai, cứu tế |
| Trạng thái thành | **23** | `/api/garrisons`, `session_settlements` | Quân, phòng thủ, lương, tiền, trật tự |
| Sự kiện chính trị | **11** | `/api/factions/events` | Ghim sự kiện lên bản đồ |

### 1.2. Ba lỗi dữ liệu chặn nâng cấp

1. **23 settlement trong DB vs 20 node trên map.** Thừa `he_fei` (Hợp Phì), `pu_yang` (Bộc Dương), `wu_ling` (Vũ Lăng); `wu_wei` trong DB ánh xạ sang `xi_liang` trên map. Mọi token/thông tin gắn với 3 thành thừa sẽ biến mất.
2. **Tên không đồng nhất giữa DB và map.** `session_settlements.name_vi` dùng "Kế Thành & Bắc Bình", "Kinh Đô Lạc Dương"; map đã chuẩn hoá "Kế Thành", "Lạc Dương". Phải có registry trung gian.
3. **Quân đoàn không có tiến độ.** `military_expeditions` chỉ có origin/target/status; muốn token chạy phải thêm `departure_turn`/`arrival_turn` hoặc suy ra từ `game_date`.

---

## 2. Level 2 — Live Map (khuyến nghị làm ngay)

### 2.1. Mục tiêu

Bản đồ trở thành **gương phản chiếu trạng thái chiến dịch**, không còn là hình minh hoạ blueprint.

### 2.2. Việc phải làm

1. **`SETTLEMENT_REGISTRY`** trong `map-data.js`:
   ```js
   {
     id: 'ye_cheng',
     mapNodeId: 'ye_cheng',
     aliases: ['Ye', 'Nghiệp Thành'],
     coords: { x: 320, y: 155 }
   }
   ```
   - 23 settlement DB → 20 node map.
   - `he_fei`, `pu_yang`, `wu_ling`: giai đoạn 1 snap về node gần nhất (`shou_chun`, `ye_cheng`, `jiang_ling`), giai đoạn 2 có thể nâng thành node phụ.
   - `wu_wei → xi_liang`.
   - Hàm `resolveMapNode(id)` dùng chung cho mọi layer.

2. **`MapViewModel`** gộp static + live:
   - Static: coords, routes, seals, subLocations, lore.
   - Live: `/api/garrisons` (quân, phòng thủ, lương, tiền), `/api/factions/settlements` (phe, thống đốc, trật tự), `/api/factions` (màu, uy tín).
   - Mỗi node có `{ static, live, stale }`.
   - Khi thiếu live: hiện blueprint kèm nhãn "Blueprint" mờ, không giả vờ là số thật.

3. **Intel panel đọc live**:
   - Quân đồn trú, phòng thủ, lương, tiền, trật tự lấy từ `/api/garrisons`.
   - Màu phe và tên phe lấy từ `ruler_faction_id` live.
   - Hiện delta nếu lệch blueprint: `9,000 → 285` với mũi tên giảm.
   - Nút "Hành quân" dùng chi phí tuyến + trạng thái live (thành địch/đồng minh/trung lập).

4. **Refresh theo lượt**:
   - Gọi `refreshMapLiveState()` khi mở map và sau `turn-advance`.
   - `Promise.allSettled` để một API lỗi không làm trắng bản đồ.
   - Cache theo `active_turn`; không gọi lại nếu cùng lượt.

### 2.3. Tác động

- Số liệu trên map khớp simulation.
- Chế độ Quân Sự/Kinh Tế phản ánh đúng tình hình.
- Người chơi tin bản đồ để ra quyết định.
- Là nền bắt buộc cho Level 3.

### 2.4. Công & rủi ro

- **1–1.5 tuần.**
- Rủi ro: API thiếu trường (grain/treasury đã có trong `/api/garrisons`), registry sai sót, dữ liệu blueprint dùng làm fallback quá lâu.
- Nghiệm thu: 100% node có live data hoặc nhãn "blueprint"; số quân map = DB; 0 orphan ID.

---

## 3. Level 3 — Living Layer (bản đồ sống)

### 3.1. Mục tiêu

Nhìn vào bản đồ thấy **thế giới đang chạy**, không phải bảng số.

### 3.2. Các lớp động

| Lớp | Nguồn | Cách vẽ | Hành động |
|---|---|---|---|
| Thương đoàn | `trade_caravans` status EN_ROUTE | Token 16px, icon 貨, màu phe, chạy dọc tuyến theo `route_progress` | Hộ tống / cướp / đánh thuế |
| Quân đoàn | `military_expeditions` status MARCHING | Token 22px, icon 兵, số quân | Đón đánh / tiếp viện / rút lui |
| Ổ phỉ | `bandit_strongholds` ACTIVE | Icon 賊 + bounty | Đánh dẹp / chiêu an |
| Khủng hoảng | `regional_ecological_crises` active | Icon theo loại + vòng đỏ | Cứu tế / sơ tán |
| Sự kiện | `faction_political_events` | Ghim 卷 tại thành liên quan | Mở dossier sự kiện |
| Giao tranh | `session_duels`/expeditions | Vòng chớp đỏ tại target | Tham chiến |

### 3.3. Kỹ thuật token

- Token nằm trong layer riêng, không bị counter-scale như node.
- Vị trí = điểm trên cùng đường cong `routePath()` tại `t`:
  ```js
  const p = quadraticPoint(from, control, to, t);
  ```
- `t = caravan.route_progress` (0–1). Với expedition chưa có progress: suy ra từ `(currentTurn - departureTurn) / totalTurns` hoặc pulse tại target.
- Cập nhật mỗi 1–2s hoặc khi turn advance, không cần 60fps liên tục.
- `prefers-reduced-motion`: token nhảy theo bước, không animate.

### 3.4. Bộ lọc & legend

- Toggle layer: Quân sự / Thương mại / An ninh / Sự kiện.
- Legend đổi theo layer.
- Badge số lượng trên toggle.

### 3.5. Công & nghiệm thu

- **1–1.5 tuần.**
- Nghiệm thu: token nằm đúng tuyến ±1%; click token mở đúng modal; 30 token vẫn 60fps; 0 token mồ côi.

---

## 4. Level 4 — Command Layer (bản đồ ra quyết định)

### 4.1. Chọn tuyến nhiều chặng

- Click lần lượt các thành → waypoint list.
- Tính tổng dặm/ngày/lương/rủi ro theo từng chặng.
- Cảnh báo nếu vượt lương hoặc đi qua vùng địch.
- Cho phép lưu tuyến, đặt tên, chia sẻ qua chronicle.
- Thực thi từng chặng qua `openTravelTransit`, dừng giữa chặng nếu gặp sự kiện.

### 4.2. Tiếp vận & phục kích

- Tuyến có `ambushRisk`; hiện xác suất và loại sự kiện.
- Có thể cử đội hộ tống hoặc đặt trạm tiếp vận.
- Quân đoàn hết lương → tốc độ giảm, mất quân.

### 4.3. Ngoại giao trên bản đồ

- Thêm endpoint `/api/factions/diplomacy` (method `getDiplomacyRelations()` đã có).
- Chế độ Ngoại Giao: đường WAR đỏ, ALLIANCE xanh, NEUTRAL xám; độ dày theo thiện chí.
- Click một thành → xem quan hệ với phe mình, đề xuất đình chiến/liên minh.

### 4.4. Sương mù & trinh sát

- Cần bảng mới `settlement_intel` (`settlement_id`, `intel_level 0–2`, `last_scouted_turn`).
- Cấp 0: chỉ thấy tên + hình mờ; cấp 1: biết phe/quân ước lượng; cấp 2: đầy đủ.
- Hành động "Trinh sát" tiêu thể lực/tiền, mở dần thông tin.
- `npc_intel_fog` hiện là theo NPC, không dùng lại trực tiếp.

### 4.5. Công

- **2–3 tuần** cho waypoint + diplomacy + fog.
- Nghiệm thu: tổng chi phí nhiều chặng khớp server ±2%; fog không rò rỉ số liệu; diplomacy đọc đúng 136 dòng.

---

## 5. Level 5 — Cartographic Depth

- **Địa hình thật:** polygon 9 châu, dãy núi, sông; tuyến WATERWAY chạy dọc sông.
- **Mùa & thời tiết:** xuân/hạ/thu/đông; mưa lũ chặn đường, tuyết làm chậm, mùa màng ảnh hưởng lương.
- **Timeline scrubber:** tua lại các lượt, xem bản đồ tại bất kỳ mốc nào (replay).
- **Biên niên sử trên bản đồ:** ghim sự kiện lịch sử, trận đánh, thay đổi chủ thành.
- **Thủ công mỹ thuật:** parchment/ink texture, contour lines, không gradient/emoji theo AS-06/AS-05.

**3–5 tuần.** Chỉ nên làm sau khi Level 2–4 ổn định, vì địa hình đẹp mà số liệu sai càng làm mất niềm tin.

---

## 6. Kiến trúc kỹ thuật cho nâng cấp sâu

`world-map.js` hiện **1,629 dòng, 34 hàm**. Không nên nhồi thêm layer vào đây.

### 6.1. Tách module

```
public/js/map/
  map-state.js        // zoom, pan, selection, mode, filters
  map-registry.js     // SETTLEMENT_REGISTRY, aliases, resolveMapNode
  map-projection.js   // clientToMapPoint, routePath, quadraticPoint
  map-live-service.js // fetch /api/garrisons, factions, caravans, ...
  map-layers/
    layer-terrain.js
    layer-routes.js
    layer-nodes.js
    layer-tokens.js
    layer-fog.js
  map-intel.js        // panel render
  map-actions.js      // march, caravan, scout, intercept
  map-ui.js           // toolbars, legend, minimap
```

### 6.2. Layer registry

```js
{
  id: 'caravans',
  zIndex: 40,
  visible: true,
  render(ctx) {},
  update(dt) {},
  hitTest(x, y) {}
}
```

Chỉ re-render layer “dirty”; pan/zoom chỉ cập nhật transform, không dựng lại DOM.

### 6.3. Map store

```js
state = {
  static: { nodes, routes, seals },
  live: { settlements, factions, caravans, expeditions, strongholds, crises, diplomacy },
  ui: { zoom, pan, mode, filters, selection, route }
}
```

### 6.4. Data integrity

- Hàm `assertMapEntity(id, source)` log cảnh báo nếu API trả id không resolve được.
- Test tự động: mọi `from_settlement_id`/`to_settlement_id`/`location_near` phải resolve.
- CI gate: `npm run verify` thêm test `verify-map-live-contracts.ts`.

### 6.5. Hiệu năng

- 20 node + 24 tuyến + 30 token: SVG quá đủ, không cần canvas/WebGL.
- Không dùng SVG filter blur (đã bỏ); token dùng circle + text.
- `requestAnimationFrame` cho token; dừng khi modal đóng.
- Cache API theo `active_turn`; invalidate sau turn advance.

---

## 7. Rủi ro chính

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| 23 settlement vs 20 node | Cao | Registry + alias + test CI |
| API thiếu trường live | Trung bình | `/api/garrisons` đã có grain/treasury; fallback blueprint có nhãn |
| Không có caravan EN_ROUTE / expedition hiện tại | Trung bình | Seed demo hoặc dispatch thử để test token |
| Expedition không có progress | Trung bình | Thêm cột `departure_turn`/`arrival_turn` hoặc suy ra |
| Fog cần schema mới | Trung bình | Bảng `settlement_intel` + endpoint |
| Lãnh thổ phe không có polygon | Trung bình | Dùng vùng ảnh hưởng mờ, không vẽ biên giới giả |
| Animation gây rối | Thấp | Chỉ token đang hoạt động; reduced motion |
| Vi phạm anti-slop | Thấp | Không gradient/emoji/shadow màu; dùng seal + flat fill |

---

## 8. Lộ trình đề xuất

| Sprint | Nội dung | Công | Giá trị |
|---|---|---:|---|
| 1 | Registry 23→20 + live binding `/api/garrisons` + intel live | 1–1.5 tuần | Sửa số liệu sai, nền tảng cho mọi thứ |
| 2 | Living layer: token thương đoàn/quân đoàn/ổ phỉ + legend/filter | 1–1.5 tuần | Bản đồ "sống" |
| 3 | Hành động trên token: hộ tống/cướp/đánh dẹp/cứu tế | 1 tuần | Vòng lặp chiến lược |
| 4 | Ngoại giao + chế độ phe phái | 1–1.5 tuần | ROTK political map |
| 5 | Waypoint + tiếp vận + phục kích | 1.5–2 tuần | Chiều sâu quyết định |
| 6 | Fog of war + trinh sát | 1–1.5 tuần | Khám phá |
| 7 | Địa hình/mùa/timeline | 3–5 tuần | Chiều sâu thị giác |

**Tổng Level 2–4: ~6–8 tuần; Level 5 thêm 3–5 tuần.**

---

## 9. Nếu chỉ chọn một việc

**Level 2 — Live Map.** Vì:
- Sửa được lỗi niềm tin lớn nhất (số liệu sai).
- Không cần schema mới, API đã có.
- Là nền bắt buộc cho token, fog, ngoại giao.
- 1–1.5 tuần, rủi ro thấp, tác động ngay.

Nếu chọn hai việc: **Level 2 + Level 3** — bản đồ vừa đúng vừa sống.

---

## 10. Tiêu chí nghiệm thu tổng

- 100% entity động resolve được về node map (0 orphan).
- Số liệu quân/lương/tiền trên intel khớp `session_settlements` tại cùng lượt.
- Token nằm đúng tuyến ±1%, cập nhật sau mỗi lượt.
- Tổng chi phí tuyến nhiều chặng khớp server ±2%.
- Fog: node cấp 0 không lộ bất kỳ số liệu nào.
- 60fps với 20 node + 24 tuyến + 30 token.
- VI/EN đầy đủ cho mọi nhãn mới.
- `npm run verify` xanh, có test contract cho map live data.
