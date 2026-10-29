# Phân tích thiết kế Dư Đồ Tam Quốc (World Map)

**Ngày:** 2026-10-29
**Vai trò:** Game Designer + UX/UI Designer
**Đối tượng:** modal `#world-map-modal` — `public/js/world-map.js`, `public/js/map-data.js`, `public/styles.css`
**Đo trên:** trình duyệt thật, viewport 1600×900, dialog 1120×792, vùng bản đồ 669×694

> **Trạng thái triển khai (2026-10-29): P0 và phần lớn P1 đã hoàn tất.**
> Đã làm: semantic zoom 3 tầng; marker 28px / nhãn 15px không đổi theo zoom; nét tuyến `non-scaling-stroke`; zoom neo con trỏ (đo drift 0px); clamp pan theo biên 20 thành; Fit/Focus/minimap; tooltip tuyến đủ 4 số liệu; route card + danh sách tuyến kết nối; legend theo chế độ; Quân Sự mã hoá theo rủi ro, Kinh Tế theo lương thảo; icon thành màu sáng (trước là đen trên nền tối); bàn phím/ARIA.
> Chưa làm: lãnh thổ phe dạng polygon, fog of war, token quân/thương đoàn động, waypoint nhiều chặng. Scale bar bị bỏ có chủ ý vì `distanceLi` không tuyến tính với toạ độ SVG.
> Các số đo bên dưới là **baseline trước nâng cấp**, giữ lại để đối chiếu.

---

## 0. Kết luận trong một đoạn

**Đây đang là một "bản đồ minh hoạ", chưa phải một "bản đồ ra quyết định".**

Zoom hiện tại chỉ phóng to hình vẽ, không mở ra thông tin mới. Ở 300%, một thành chiếm 93px và nhãn tên cao 42px, trong khi chỉ còn ~11% diện tích bản đồ nằm trong khung nhìn — thành to hơn, tuyến ngắn lại, nhãn bắc cầu qua đường đi. Ngược lại, ở 65% bản đồ co lại còn 434×398px giữa khung 669×694, thừa gần một nửa diện tích trống mà không cho thấy thêm vùng nào.

Về game design, bản đồ có đủ **20 thành, 24 tuyến, 3 chế độ xem**, nhưng:
- 24 tuyến chỉ là nét nối tâm-thành, không phải đối tượng người chơi chọn được;
- 5/8 trường dữ liệu tuyến (`distanceLi`, `marchDays`, `grainCost`, `ambushRisk`, `descVi`) **không hề được dùng trên bản đồ**;
- 3 chế độ chỉ thêm một badge nhỏ 7.5 đơn vị, không đổi cách mã hoá thông tin;
- không có lãnh thổ, địa hình, sương mù chiến tranh, hay bất kỳ chuyển động nào.

**Điểm tổng: 4.5 / 10.** Nhận diện mực-vàng son vẫn đẹp, dữ liệu nền rất giàu, nhưng trải nghiệm đọc bản đồ chưa xứng với dữ liệu đó.

| Góc nhìn | Điểm | Lý do |
|---|---:|---|
| Định vị ("tôi đang ở đâu") | 6.0 | Có vòng pulse "HIỆN TẠI", nhưng mở map lại chọn Quảng Tông thay vì vị trí hiện tại |
| Ra quyết định ("đi đâu, đường nào") | 3.0 | Tuyến không bấm/hover được; không so sánh được chi phí – rủi ro |
| Dự báo ("mất bao lâu, tốn gì") | 2.0 | Dữ liệu có sẵn nhưng không hiển thị trên bản đồ |
| Kể chuyện ("thế cục đang thế nào") | 4.0 | Không có lãnh thổ, mặt trận, quân đoàn, thương đoàn |
| Thẩm mỹ / độ phong phú | 5.0 | Nền phẳng, 20 vòng tròn giống nhau, không địa hình |
| Tương tác | 5.0 | Zoom/pan cơ bản; thiếu fit, minimap, hover, bàn phím |
| Tiếp cận | 2.0 | Node SVG không focus được, không aria, không legend |

---

## 1. Hiện trạng kỹ thuật

### 1.1. Cấu trúc render

Một SVG `viewBox="0 0 600 550"` (`world-map.js:377`) chứa:

```
<svg>
  <rect nền #070a12>              ← tĩnh, không scale
  <pattern grid 25×25>            ← tĩnh
  <khung viền + la bàn BẮC>       ← tĩnh
  <g id="world-map-viewport" transform="translate(pan) scale(zoom)" transform-origin="300 275">
      watermark 9 châu             ← scale theo zoom
      sông Hoàng Hà, Trường Giang  ← scale theo zoom
      3 đèo (Hổ Lao, Đồng Quan, Kiếm Các)
      24 tuyến <line>
      20 node <g class="map-node">
  </g>
</svg>
```

Toàn bộ nội dung nghiệp vụ nằm trong **một nhóm duy nhất** được scale. Đây là gốc rễ của vấn đề "zoom lên thành bự ra".

### 1.2. Dữ liệu đang có

| Nguồn | Số lượng | Trường |
|---|---:|---|
| `WORLD_MAP_NODES` | 21 key, **20 node render** (loại `wu_wei` trùng) | coords, military, economy, hireableNpcs, subLocations, threat, figures… |
| `WORLD_MAP_ROUTES` | **24 tuyến** | from, to, terrainType, `distanceLi`, `marchDays`, `grainCost`, `ambushRisk`, `descVi` |

**Trường bị bỏ phí:** ngoài `terrainType`, không trường tuyến nào được dùng để vẽ. `distanceLi`, `marchDays`, `grainCost`, `ambushRisk`, `descVi` chỉ tồn tại trong data, không xuất hiện trên bản đồ.

### 1.3. Tương tác hiện có

- Wheel zoom (`world-map.js:54`), kéo pan (`world-map.js:61`), pinch 2 ngón.
- Zoom 0.65–3.0, bước bánh xe 0.15, bước nút 0.25 (`world-map.js:25`).
- Click node → chọn → tô sáng các tuyến nối + render panel intel.
- 3 chế độ xem: Toàn Cảnh / Quân Sự / Kinh Tế.
- Không có: hover tuyến, tooltip, legend, fit-to-bounds, minimap, tìm kiếm, bàn phím, aria, fog of war.

---

## 2. Số liệu đo được (nguyên nhân của cảm giác "thành bự, mất đường")

Quy đổi: `px màn hình = đơn vị SVG × (668/600) × zoom ≈ đơn vị × 1.113 × zoom`.

| Zoom | Đường kính thành | Nhãn tên | Nhãn tỉnh | Badge quân sự | Nét tuyến | Vùng bản đồ nhìn thấy |
|---:|---:|---:|---:|---:|---:|---:|
| 65% | 20px | **6.9px** | 6.2px | 5.4px | 1.4px | 434×398px (thừa ~49% khung) |
| 100% | 31px | 10.6px | 9.5px | 8.3px | 2.2px | 668×612px (vừa khung) |
| 150% | 47px | 15.9px | 14.2px | 12.5px | 3.3px | ~67% chiều rộng |
| 200% | 62px | 21.1px | 18.9px | 16.7px | 4.5px | ~50% |
| 300% | **93px** | **31.7px** | 28.4px | 25.0px | 6.7px | **~30%×30% ≈ 11% diện tích** |

Đo thêm ở 100%:
- Khoảng cách tâm gần nhất giữa hai thành: **55px**.
- 20 nhãn tên luôn hiển thị; **1 cặp nhãn chồng nhau** (Nghiệp Thành / Quảng Tông, chồng 9×2px).
- 20 phụ đề tỉnh + 20 icon + badge + vòng chọn = **hơn 60 phần tử chữ** trên cùng một khung.
- Canvas 669×694 nhưng nội dung SVG cao 612px → **~82px letterbox dọc**.

**Diễn giải:** tuyến dày lên theo zoom (2.2 → 6.7px) nhưng nhãn cũng dày lên nhanh hơn về diện tích. Ở 300%, một nhãn tên dài ~200px bắc ngang qua khoảng cách 184px giữa hai thành — nó che đúng đoạn tuyến mà người chơi cần thấy. Cảm giác "không thấy tuyến" là hệ quả của **marker + label phình to**, không phải nét tuyến mỏng đi.

---

## 3. Vấn đề dưới góc Game Design

### D1. Zoom là phóng đại, không phải "semantic zoom"

Ở 300%, người chơi không nhận thêm thông tin gì: không có tên đường, chi phí, rủi ro, địa hình chi tiết, POI cấp huyện. Chỉ có 2–4 thành to hơn. Zoom không phục vụ một quyết định nào.

> **Nguyên tắc:** mỗi mức zoom phải trả lời một câu hỏi khác nhau.
> - Xa: "Phe nào đang giữ vùng nào?"
> - Vừa: "Tôi đi tới đâu được, mất bao lâu?"
> - Gần: "Đường này an toàn không, tốn bao nhiêu lương?"

### D2. Bản đồ chưa phải bàn cờ chiến lược

20 thành được vẽ cùng một kiểu: vòng tròn r=14, viền màu phe, icon Hán tự. Không có:
- **Lãnh thổ / vùng ảnh hưởng** — màu phe chỉ nằm ở viền 1.5px, không tạo khối.
- **Thứ bậc đô thị** — Lạc Dương, Trường An, Nghiệp Thành, Kiến Nghiệp, Thành Đô, Hứa Xương ngang hàng với trấn nhỏ.
- **Điểm nút thắt** — Hổ Lao, Đồng Quan, Kiếm Các được vẽ như hoa văn, không phải đối tượng chiến lược.
- **Mặt trận** — chiến sự Khăn Vàng chỉ nằm trong tiêu đề, không có lớp nào trên bản đồ.

### D3. Tuyến đường là trang trí, không phải lựa chọn

- Mỗi tuyến là một `<line>` nối thẳng tâm hai thành (`world-map.js:265`), không cong theo địa hình.
- Tuyến `WATERWAY` cắt chéo qua lục địa thay vì chạy dọc sông Trường Giang đã vẽ (`world-map.js:421`).
- Tuyến `MOUNTAIN_PASS` không đi qua 3 biểu tượng đèo đã vẽ.
- Không hover, không click, không tooltip, không so sánh.
- `ambushRisk: HIGH/EXTREME` có trong data nhưng không hề xuất hiện.

Người chơi không thể trả lời: "đi đường nào rẻ hơn, nhanh hơn, ít phục kích hơn?" — trong khi đây chính là câu hỏi chiến lược của một game Tam Quốc.

### D4. Ba chế độ xem không tạo ra ba lớp thông tin

`setMapViewMode()` chỉ đổi badge 42×13 đơn vị (≈47×14px ở 100%) và dòng phụ 7.5–8 đơn vị. Địa hình, tuyến, màu phe, kích thước node **không đổi**. Về mặt cảm nhận, ba chế độ gần như giống nhau.

### D5. Thiếu sương mù chiến tranh / khám phá

Game đã có `npc_intel_fog` nhưng bản đồ không dùng. Mọi thành đều biết từ đầu, mọi con số đều mở. Điều này vừa làm bản đồ rối, vừa bỏ mất vòng lặp "trinh sát → mở khoá thông tin".

### D6. Bản đồ không nối vào vòng lặp hành động

Luồng hiện tại: mở map → click thành → đọc panel → bấm "Hành quân tới đây". Không có:
- chọn tuyến (waypoint),
- xem trước ngày/đường/lương ngay trên tuyến,
- đặt thương đoàn/tiếp vận,
- chặn đường/đón địch,
- thấy quân đoàn hoặc thương đoàn đang di chuyển.

### D7. Đơn điệu thị giác

- Một nền phẳng `#070a12` + grid 3% opacity.
- 20 vòng tròn cùng kích thước, cùng bố cục (icon trên, tên dưới, tỉnh dưới nữa).
- 24 đường thẳng, không có phân cấp độ dày.
- Không có khối địa hình, không texture, không mùa, không ánh sáng, không chuyển động.
- Không có scale bar, không có legend, không có la bàn động.

---

## 4. Vấn đề dưới góc UX/UI

### U1. Marker và nhãn phình theo zoom

Số liệu ở mục 2. Hệ quả trực tiếp: ở 300%, thành 93px + nhãn 32px chiếm gần hết khoảng trống giữa hai thành; tuyến bị che.

### U2. Zoom neo vào tâm bản đồ, không neo con trỏ

`transform-origin="300 275"` và `scale(zoom)` cố định (`world-map.js:37-40`). Khi người chơi cuộn chuột vào một thành ở góc, thành đó **chạy ra khỏi khung nhìn** vì cả bản đồ phóng từ tâm. Đây là lỗi tương tác kinh điển của bản đồ.

### U3. Pan không giới hạn, không có "fit"

`worldMapPanX/Y` không bị clamp (`world-map.js:61-82`). Người chơi có thể kéo bản đồ ra ngoài hoàn toàn, chỉ còn nút "1:1" để cứu. Không có nút "về vị trí hiện tại", không có "fit toàn bản đồ".

### U4. Quá nhiều nhãn luôn hiện

20 tên + 20 tỉnh + 20 icon + badge chế độ + vòng "HIỆN TẠI" + vòng chọn. Ở 100% đã có 1 cặp chồng; ở 75% chồng nhiều hơn. Không có ưu tiên nhãn, không có collision avoidance.

### U5. Chữ quá nhỏ ở zoom thấp

- 65%: nhãn tên 6.9px, badge quân sự 5.4px — dưới ngưỡng đọc.
- 100%: nhãn 10.6px — vẫn dưới 12px khuyến nghị cho UI game.
- Nhãn tỉnh 9.5px và badge 8.3px gần như không đọc được.

### U6. Màu phe không có legend

15+ màu viền khác nhau (`themeMap`, `world-map.js:268-290`) nhưng không có bảng chú giải. Legend cũ nằm ở footer tĩnh và đã biến mất khi modal chuyển sang ModalShell (`hasLegend: false`). Người chơi không biết xanh/đỏ/tím là phe nào.

### U7. Không có hover/focus/ARIA

- Node là `<g onclick>` không `tabindex`, không `role` (đã kiểm tra: `tabindex: null`, `role: null`).
- Không thể chọn thành bằng bàn phím.
- Không có tooltip khi hover node hoặc tuyến.
- `touch-action: auto` trên canvas → pinch có thể zoom cả trang thay vì bản đồ trên mobile.

### U8. Mở bản đồ làm mất định hướng

`refreshWorldMapView()` tự đổi `selectedMapNodeId` sang `guang_zong` nếu đang ở `zhuo_xian` (`world-map.js:156-160`). Người chơi mở bản đồ để xem "tôi đang ở đâu" nhưng panel bên phải lại hiện Quảng Tông (Cự Lộc). Vị trí hiện tại chỉ có một vòng xanh nhỏ.

### U9. Khung nhìn bị letterbox

Canvas 669×694, viewBox 600×550 → nội dung cao 612px, thừa ~82px dọc. Bản đồ trông nhỏ hơn diện tích thực tế của modal.

### U10. Không có phản hồi trạng thái

- Không có "đang tải" khi render.
- Không có % hoặc thanh zoom trực quan (chỉ badge số).
- Không có minimap để biết mình đang ở đâu sau khi pan.
- Nút zoom +/− và 1:1 không có trạng thái disabled ở giới hạn.

---

## 5. Đề xuất thiết kế

### 5.1. Semantic zoom — 3 tầng, mỗi tầng một câu hỏi

| Tầng | Zoom | Hiển thị | Ẩn | Marker | Nhãn |
|---|---|---|---|---|---|
| **Thiên hạ** | 0.65–0.85 | Vùng ảnh hưởng phe, thủ phủ, trục đường chính, đèo hiểm, sông lớn | Thành nhỏ, badge, tỉnh lẻ | Thủ phủ 34px, trấn 18px chấm | 9 tên châu + 6 thủ phủ |
| **Châu quận** | 0.85–1.6 | Toàn bộ 20 thành, toàn bộ tuyến, nhãn tên | Badge số liệu | 28px | 20 tên, declutter, 12px |
| **Cận cảnh** | 1.6–3.0 | Badge binh lực/lương, chi phí tuyến, POI nội thành, token quân/thương đoàn | Nhãn tỉnh không liên quan | 32px + badge | Tên + 1 dòng số liệu |

Chuyển tầng bằng class trên container (`data-zoom-tier="world|region|local"`), không cần render lại toàn bộ SVG.

### 5.2. Marker và tuyến giữ kích thước màn hình cố định

Đây là thay đổi kỹ thuật quan trọng nhất, giải quyết trực tiếp lời phàn nàn.

**Tuyến:** thêm `vector-effect="non-scaling-stroke"` cho mọi `<line>`/`<path>` tuyến. Nét không dày lên khi zoom.

**Marker + nhãn:** bọc phần hình ảnh trong nhóm con và counter-scale:

```html
<g class="map-node" transform="translate(320,210)">
  <g class="node-visual" transform="scale(1.0)">  <!-- cập nhật = 1/zoom -->
    <circle r="14" .../>
    <text .../>
  </g>
</g>
```

Trong `applyWorldMapTransform()`:

```js
const inv = 1 / worldMapZoom;
document.querySelectorAll('.node-visual').forEach(g => {
  g.setAttribute('transform', `scale(${inv})`);
});
```

Kết quả: ở mọi zoom, thành luôn ~28px và nhãn ~12px; tuyến luôn 2–3px. Zoom chỉ thay đổi **khoảng cách và vùng nhìn**, đúng nghĩa bản đồ.

> Lưu ý: counter-scale làm nhãn có thể chồng nhau nhiều hơn. Phải đi kèm declutter (5.5).

### 5.3. Tuyến đường trở thành đối tượng hạng nhất

Dữ liệu đã có sẵn, chỉ cần mã hoá:

| Thuộc tính | Mã hoá đề xuất |
|---|---|
| Loại địa hình | Màu: HIGHWAY amber, WATERWAY cyan, MOUNTAIN đỏ, PLANK nâu cam |
| Tầm quan trọng | Độ dày: trục 3px, khu vực 2px, nhánh 1.25px |
| Rủi ro phục kích | `HIGH/EXTREME`: thêm viền đỏ mảnh hoặc icon ⚠ ở midpoint; chỉ hiện ở tầng Châu quận |
| Chi phí | Tooltip: `280 dặm · 1 ngày · 1.5 thạch · Rủi ro CAO` |
| Mô tả | Tooltip dùng `descVi` |
| Hover | Vùng bắt 12px trong suốt + tô sáng tuyến + panel preview |
| Chọn | Click tuyến → card "Hành quân theo tuyến / Lập thương đoàn" |
| Đang di chuyển | Nhân bản tuyến + animation `stroke-dashoffset` (chỉ tuyến active) |

Ví dụ hit-area:

```html
<line class="route-hit" x1="..." y1="..." x2="..." y2="..."
      stroke="transparent" stroke-width="12" style="pointer-events: stroke"
      onmouseenter="previewRoute('zhuo_xian','guang_zong')" />
```

### 5.4. Lãnh thổ, địa hình, điểm nút thắt

- **Vùng ảnh hưởng phe:** convex hull hoặc polygon thủ công quanh các thành cùng `rulerFaction`, fill 8–12% màu phe, không viền. Không dùng biên giới cứng để tránh tạo cảm giác chính xác giả.
- **Địa hình:** 9 vùng châu quận là polygon nền, tint rất nhẹ theo terrain; sông đã có, nhưng cho tuyến WATERWAY chạy dọc sông.
- **Đèo:** Hổ Lao, Đồng Quan, Kiếm Các trở thành icon chiến lược có tooltip ("kiểm soát = chặn tuyến"), không chỉ là hình tam giác trang trí.
- **Thủ phủ:** marker lớn hơn + vương miện/triện; trấn nhỏ dùng chấm.

### 5.5. Declutter nhãn

Ưu tiên: `selected 100 > current 95 > thủ phủ 80 > kết nối 60 > còn lại 40`.

Thuật toán đơn giản cho 20 node:
1. Sắp xếp theo ưu tiên.
2. Với mỗi nhãn, thử vị trí trên/dưới/trái/phải.
3. Bỏ qua nếu bounding box giao nhãn đã đặt.
4. Tầng Thiên hạ chỉ hiện ưu tiên ≥80.
5. Luôn có halo: `paint-order: stroke; stroke: #070a12; stroke-width: 3`.

### 5.6. Điều hướng

**Zoom neo con trỏ** (công thức trong toạ độ viewBox):

```js
function zoomAt(cursorX, cursorY, nextZoom) {
  const k = nextZoom / worldMapZoom;
  worldMapPanX = cursorX - (cursorX - worldMapPanX) * k;
  worldMapPanY = cursorY - (cursorY - worldMapPanY) * k;
  worldMapZoom = nextZoom;
  applyWorldMapTransform();
}
```

Bổ sung:
- **Clamp pan:** luôn giữ ≥25% diện tích bản đồ trong khung.
- **Fit:** tính bounding box của 20 node + padding, set zoom/pan.
- **Về vị trí hiện tại:** nút riêng, zoom 1.4 và center node hiện tại.
- **Minimap 140×120** ở góc dưới phải, có khung viewport; click để nhảy.
- **Double-click node:** zoom tới node đó.
- **Bàn phím:** Tab qua các node, Enter chọn, mũi tên pan, +/− zoom, Esc đóng.
- **`touch-action: none`** trên canvas + pinch theo tâm hai ngón.
- **Scale bar** ("100 dặm") + la bàn đã có.

### 5.7. Ba chế độ xem phải khác nhau thật

| Chế độ | Câu hỏi | Lớp dữ liệu |
|---|---|---|
| **Toàn cảnh** | Phe nào giữ vùng nào? | Vùng ảnh hưởng, thủ phủ, đèo, sông, trục chính |
| **Quân sự** | Nơi nào nguy hiểm, ai mạnh? | Heatmap threat, badge garrison/defense, mũi tên quân đoàn, supply line |
| **Kinh tế** | Tuyến nào sinh lời? | Độ dày = lưu lượng, icon lương/sắt/muối, giá chênh lệch, token thương đoàn |

Chuyển chế độ phải đổi **mã hoá**, không chỉ thêm badge 7.5px.

### 5.8. Chuyển động có kiểm soát

- Pulse vị trí hiện tại: giữ, nhưng nhẹ (2.5s, opacity 0.5→0.8).
- Token thương đoàn/quân đoàn chạy dọc tuyến: 8–12s/tuyến, dừng khi `prefers-reduced-motion`.
- Dash animation chỉ cho tuyến đang active, không chạy toàn bộ 24 tuyến.
- Hover: node ring +2px, tuyến sáng lên; không dùng glow màu.

### 5.9. Nối bản đồ – intel – hành động

- Chọn node: **giữ node trong khung nhìn** (auto-pan nếu sát biên), highlight tuyến, panel hiện 2–3 tuyến tốt nhất kèm chi phí.
- Hover tuyến: panel preview chi phí/ngày/rủi ro.
- Breadcrumb: `Trác Huyện → Quảng Tông · 280 dặm · 1 ngày`.
- CTA trên tuyến: "Hành quân" / "Lập thương đoàn" / "Trinh sát".

---

## 6. Wireframe đề xuất

### Tầng Thiên hạ (65–85%)

```
┌──────────────────────────────────────────────────────────────┐
│ Dư Đồ Tam Quốc        [Thiên hạ ●][Châu quận][Cận cảnh]      │
├──────────────────────────────────────────────────────────────┤
│   ~~~~~~ vùng xanh U Châu ~~~~~     vùng đỏ Khăn Vàng        │
│        ◆ Kế Thành        ◉ Trác Huyện (bạn)                  │
│          ╲                 │                                  │
│           ╲   trục chính   │        ◆ Nghiệp Thành           │
│            ╲               │                                  │
│      ĐÈO ĐỒNG QUAN ⚠       │                                  │
│                     ◉ Quảng Tông                             │
│  [minimap]                              [Fit] [Về vị trí]    │
└──────────────────────────────────────────────────────────────┘
```

### Tầng Cận cảnh (160–300%)

```
┌──────────────────────────────────────────────────────────────┐
│ Trác Huyện                                    [×]            │
│ ┌──────────────────────────────┐ ┌─────────────────────────┐ │
│ │  ◉ Trác Huyện                │ │ TUYẾN ĐÃ CHỌN           │ │
│ │   │  Quan đạo U Châu         │ │ Trác → Quảng Tông        │ │
│ │   │  120 dặm · 0.5 ngày      │ │ 280 dặm · 1 ngày         │ │
│ │   │  0.8 thạch · Rủi ro THẤP │ │ 1.5 thạch · Rủi ro CAO   │ │
│ │   ▼                          │ │ [Hành quân] [Trinh sát]  │ │
│ │  ◉ Kế Thành                  │ │                         │ │
│ │  (marker 28px cố định)       │ │                         │ │
│ └──────────────────────────────┘ └─────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Tiêu chí nghiệm thu

| # | Tiêu chí | Ngưỡng |
|---|---|---|
| 1 | Kích thước marker trên màn hình | 28 ± 2px ở mọi zoom 0.65–3.0 |
| 2 | Cỡ chữ nhãn | 11–13px ở mọi zoom |
| 3 | Độ dày tuyến | 1.5–3px, không đổi theo zoom |
| 4 | Zoom neo con trỏ | Điểm dưới con trỏ lệch < 4px sau mỗi bước zoom |
| 5 | Nhãn chồng nhau | 0 cặp ở tầng Châu quận; ≤ 8 nhãn ở tầng Thiên hạ |
| 6 | Pan | Không kéo bản đồ ra ngoài quá 25% khung |
| 7 | Tuyến | 100% tuyến hover/click được, tooltip có đủ 4 số liệu |
| 8 | Bàn phím | 20/20 node focus được, có focus ring, Enter chọn |
| 9 | Tương phản nhãn | ≥ 4.5:1 trên nền |
| 10 | Hiệu năng | Pan/zoom 60fps với 20 node / 24 tuyến |
| 11 | Định vị | Người dùng tìm ra vị trí hiện tại ≤ 2s (test 5 người) |

---

## 8. Roadmap

| Ưu tiên | Việc | Tác động | Công |
|---|---|---|---|
| **P0** | `vector-effect` cho tuyến + counter-scale marker/nhãn | Sửa đúng lời phàn nàn "thành bự, mất đường" | 0.5–1 ngày |
| **P0** | Zoom neo con trỏ + clamp pan + nút Fit/Về vị trí | Cảm giác điều khiển bản đồ | 0.5 ngày |
| **P0** | 3 tầng semantic zoom (ẩn/hiện nhãn, badge) | Hết rối ở cả 2 cực zoom | 1 ngày |
| **P1** | Tuyến hover/click + tooltip chi phí/rủi ro | Biến tuyến thành quyết định | 1–2 ngày |
| **P1** | Phân cấp độ dày/màu tuyến + legend phe | Đọc thế cục trong 3 giây | 1 ngày |
| **P1** | 3 chế độ xem đổi mã hoá thật | Loại bỏ "3 nút giống nhau" | 1–2 ngày |
| **P1** | Bàn phím + ARIA + `touch-action` | Tiếp cận cơ bản | 0.5 ngày |
| **P2** | Vùng ảnh hưởng phe + địa hình châu quận | Hết đơn điệu, có chiều sâu chiến lược | 3–5 ngày |
| **P2** | Fog of war / khám phá | Vòng lặp trinh sát, giảm rối | 2–3 ngày |
| **P2** | Token thương đoàn/quân đoàn + animation | Bản đồ "sống" | 2–3 ngày |
| **P2** | Minimap + fit + scale bar + double-click focus | Điều hướng chuyên nghiệp | 1–2 ngày |
| **P3** | Waypoint / chọn tuyến nhiều chặng | Chiều sâu chiến lược | 3–5 ngày |

**Không nên làm:** chuyển sang 3D/WebGL. Với 20 node và 24 tuyến, chi phí lớn mà độ rõ giảm. Hãy giữ SVG, đầu tư vào semantic zoom + lớp dữ liệu.

---

## 9. Phụ lục — cách đo

- Trình duyệt: Chromium qua ZCode Browser, viewport 1600×900.
- Map modal: 1120×792, canvas 669×694, SVG 668×694, `viewBox 0 0 600 550`.
- Đo bằng `getBoundingClientRect()` trên `circle.node-bg`, `text` nhãn, `line` tuyến; quy đổi scale = `nodeDiameter / 28`.
- Đếm chồng nhãn bằng giao bounding box của 20 thẻ `<text>` tên.
- Kiểm tra a11y: `tabindex`, `role`, `touch-action`, legend.
- Dữ liệu route: đọc trực tiếp `window.WORLD_MAP_ROUTES` (24 phần tử, 8 trường).
