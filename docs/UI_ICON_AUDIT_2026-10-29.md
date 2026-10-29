# UI Icon Audit — Hán tự dùng làm icon

**Ngày:** 2026-10-29
**Phạm vi:** `public/index.html`, `public/app.js`, `public/js/*`, `public/styles.css`
**Nguyên tắc:** Hán tự chỉ giữ vai trò **ấn triện trang trí** khi luôn đi kèm chữ giải thích. Mọi **icon chức năng** (nút, tab, badge, stat, action, filter, avatar) dùng SVG line icon dùng chung.

---

## 0. Kết luận

Trước pass: **593 lần xuất hiện Hán tự** trong UI source.
Sau pass: **452 lần**, trong đó phần lớn còn lại là **dữ liệu ấn triện thành trì**, **tiêu đề modal** và **avatar chữ cái** — không phải icon chức năng.

Đã thay trong pass này:

- Thẻ nhân vật: avatar, nút xem hồ sơ, stage badge, 5 path indicator.
- Header + thanh lệnh: Tiến Lượt, Nội Thành, hero avatar, Gia Thất, Làm Thuê, Sổ Tay, Phi Thư, Qua Lượt, drawer Phi Thư.
- Grand Command Hub: 7 tab, 4 stage, 6 loại ca làm, 5 nhánh phẩm lộ, 4 sub-nav gia tộc, lock/filter.
- Sổ Tay Cá Nhân: tiêu đề tab, quy tắc không gian, sub-nav, 4 slot trang bị.
- Bản đồ: 4 view mode, 4 layer toggle, 4 token sống, 7 loại tài nguyên (filter/zone/legend), các nút intel (Điều Binh, Công Thành, Lập Thương Đoàn, Tuyến Kết Nối, Quân sự, Kinh tế, Nhân lực, Sử liệu), prefix nhân tài.
- Local POI picker: icon theo loại địa điểm thay vì ấn triện.
- Spatial action dock: Lò Rèn, Tửu Quán, Lôi Đài, Dịch Trạm, Gia Thất, Xưởng, Sạp Trà.

---

## 1. Hạ tầng icon

- **Sprite** đặt đầu `public/index.html`: 34 symbol SVG 24×24, stroke `currentColor`, không phụ thuộc thư viện ngoài.
- **Helper** `uiIcon(name, className)` trong `public/js/config.js`:
  ```js
  uiIcon('sword') // <svg class="ui-icon"><use href="#icon-sword"></use></svg>
  ```
- **CSS** `.ui-icon { width:1em; height:1em; }` — icon tự theo cỡ chữ của ngữ cảnh (10px badge, 11px path, 18px avatar, 34px empty-state).
- **Không dùng emoji** (AS-05). SVG là đường duy nhất để vừa có icon dễ hiểu vừa không vi phạm anti-slop.
- **Lỗi đã sửa:** `.world-map-canvas-container svg { width:100%; height:100% }` từng áp lên cả icon trong filter/legend, làm icon phóng to bằng khung bản đồ. Đã đổi selector thành `#world-map-svg`; minimap giữ rule riêng.

Danh sách icon hiện có:

```
person eye crown sprout house castle hammer coin sword scroll book mail
hourglass map grain layers cart soldier mask alert shield flame fish leaf
pickaxe tree paw salt route flag users calendar gear ledger tea lock filter
```

---

## 2. Phân loại còn lại

### 2.1. Giữ — ấn triện trang trí (có chữ giải thích)

| Vị trí | Ví dụ | Lý do giữ |
|---|---|---|
| 20 thành trên bản đồ | 涿 薊 鄴 廣 許 … | Là “con dấu” định danh thành, luôn đi kèm tên thành; đổi sang icon sẽ mất bản sắc bản đồ |
| Tiêu đề modal | 圖 Dư Đồ, 行 Lộ Trình, 歲 Tuế Nguyệt | Trang trí, tiêu đề tiếng Việt ngay bên cạnh |
| Avatar tin nhắn | 梁, 張, 關, 陳 | Chữ cái đại diện người nói, tên đầy đủ nằm cùng dòng |
| Lore / flavor text | 三國, 軍機, 草廬 | Nội dung lịch sử, không phải điều khiển |

### 2.2. Cần thay tiếp — icon chức năng (P1)

| File | Số lần | Ví dụ | Đề xuất |
|---|---:|---|---|
| `spatial-poi-modals.js` | 57 | Tiêu đề 酒/武, tab 膳/盟/旗, lead seal 宴/義/冠 | `tea`, `sword`, `users`, `flag`, `crown`, `trophy` |
| `grand-command-hub-ui.js` | 68 | Bullet 錄/錢/卷/樓/成/否, master 草廬/莊園/將府/軍機 | `ledger`, `coin`, `scroll`, `house`, `castle`, `flag`; đã thay tab/stage/shift |
| `app.js` | 23 | Avatar tin nhắn 梁/漢/核/陳/信/商/賞/勳/修/馬 | Đổi sang chữ cái Latin đầu tên hoặc `person` |
| `protagonist-dossier-modal.js` | 19 | Vital 血/雷/火/息, subnav 八/武/業/家, slot 兵/甲/馬/策 | `heart`, `bolt`, `flame`, `battery`, `layers`, `sword`, `shield`, `paw`, `coin` |
| `turn-advance.js` | 14 | Section report 曆/業/家/庫 | `calendar`, `gear`, `users`, `ledger` |
| `story.js` | 11 | Avatar/placeholder 漢/梁 | Chữ Latin hoặc `person` |
| `title-screen-ui.js` | 8 | Archetype seals 布/士/武/商 | `sprout`, `scroll`, `sword`, `coin` |
| `travel-transit.js` | 7 | Terrain/risk 山/水/路 | `tree`, `fish`, `route`, `alert` |
| `caravan-ui.js` | 6 | Tab 運/漲/旗, guard 盾 | `cart`, `coin`, `flag`, `shield` |
| `enterprise-ui.js` | 4 | Workshop/labor seals | `gear`, `hammer` |
| `world-map.js` | 22 | Chủ yếu ấn triện thành + data theme | Giữ; badge quân/lương đã đổi sang “Binh/Thủ/Lương” |

---

## 3. Mapping Hán tự → icon đã dùng

| Hán tự | Icon | Ngữ cảnh |
|---|---|---|
| 府 宅 | `house` | Gia Thất, tư trạch |
| 工 鍛 | `hammer` | Làm thuê, lò rèn |
| 志 卷 | `book` / `scroll` | Sổ tay, sử liệu |
| 信 | `mail` | Phi thư |
| 時 | `hourglass` | Tiến lượt, qua lượt |
| 察 | `eye` | Xem hồ sơ |
| 王 覇 | `crown` | Hùng chủ |
| 布 花 | `sprout` | Khởi thủy, nông sản |
| 城 府 | `castle` | Hào kiệt, thành trì |
| 錢 商 | `coin` | Thương nhân, chợ |
| 武 兵 | `sword` | Quân sự, võ |
| 家 嗣 姻 | `users` | Gia tộc, hậu duệ |
| 曆 | `calendar` | Nhật ký |
| 貨 | `cart` | Thương đoàn |
| 賊 | `mask` | Ổ phỉ |
| 災 | `alert` | Khủng hoảng |
| 火 | `flame` | Công thành |
| 盾 | `shield` | Phòng thủ |
| 農 | `sprout` | Nông sản |
| 漁 | `fish` | Ngư sản |
| 藥 | `leaf` | Dược liệu |
| 礦 | `pickaxe` | Khoáng sản |
| 木 | `tree` | Lâm sản |
| 獵 | `paw` | Săn bắn |
| 鹽 | `salt` | Muối |
| 鎖 | `lock` | Chưa mở khóa |

---

## 4. Đề xuất triển khai tiếp

### P1 — Modal surfaces (1–2 ngày)

- `spatial-poi-modals.js`: thay title/tab/lead seal bằng icon, giữ avatar nhân vật là chữ Latin.
- `protagonist-dossier-modal.js`: thêm icon `heart`, `bolt`, `battery` vào sprite; thay vital/subnav/slot.
- `turn-advance.js`, `travel-transit.js`, `caravan-ui.js`, `enterprise-ui.js`: thay icon tab/button.
- `title-screen-ui.js`: thay seal archetype bằng icon.

### P2 — Chat avatars (0.5 ngày)

- Đổi avatar tin nhắn sang chữ cái Latin đầu tên (`L`, `T`, `Q`, `C`) hoặc `person` icon.
- Với system/event message, dùng `book`/`calendar`/`alert`.

### P3 — Kiểm soát về sau

- Thêm lint rule: cấm Hán tự trong `onclick`, `<button>`, `<tab>` trừ khi có `data-seal="decorative"`.
- Review mọi seal mới: nếu đứng một mình không có text → phải là SVG icon.
- Giữ ấn triện thành trì và tiêu đề modal; chúng là bản sắc, không phải icon.

---

## 5. Tiêu chí nghiệm thu

- Mọi nút/tab/badge/action có thể hiểu mà không cần biết Hán tự.
- Icon-only button có `title` và `aria-label`.
- Icon không bị phóng to quá 1em trong mọi container (đã sửa rule map).
- Không có emoji; `lint:slop` xanh.
- `npm run verify` xanh.
- Danh sách Hán tự còn lại chỉ thuộc nhóm “trang trí” hoặc “dữ liệu ấn triện”.
