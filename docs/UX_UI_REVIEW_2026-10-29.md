# Đánh giá UX/UI — Tam Quốc Chí: Lương Thị Phong Vân Lục

**Ngày:** 2026-10-29
**Vai trò:** Game Designer / UX-UI Designer
**Phạm vi:** màn hình chơi chính (desktop), đo ở 1920×1000, 1440×900, 1366×768, 1280×720
**Nguồn bằng chứng:** ảnh chụp phiên chơi thật (Lượt 12), DOM/CSS tại `public/index.html`, `public/styles.css`, `public/js/*`, dữ liệu `saves/session.db`

---

## 0. Kết luận trong một câu

**Bản sắc hình ảnh rất tốt, nhưng thứ bậc thông tin đang bị đảo: phần "buồng lái máy mô phỏng" (thanh lệnh, bảng số liệu, log kỹ thuật) chiếm nhiều không gian và sự chú ý hơn phần "truyện" — trong khi đây là một game nhập vai tường thuật.**

Điểm tổng: **5.5 / 10** — chơi được, có cá tính, nhưng người chơi mới sẽ bị quá tải trong 30 giây đầu.

---

## 1. Bảng điểm

| Tiêu chí | Điểm | Ghi chú |
|---|---:|---|
| Bản sắc & không khí (art direction) | 8.5 | Nền mực tối + vàng son + ấn triện Hán tự rất đẹp, đúng chất Tam Quốc. |
| Thứ bậc thông tin | 5.5 | Dock hành động chiếm ~53% chiều cao, chat chỉ còn 214–308px. |
| Kiến trúc điều hướng | 5.0 | 7 điểm vào khác nhau, 3 từ vựng chồng lấn (Hành Dinh / Quân Cơ / Sổ Tay). |
| Tải nhận thức | 4.5 | Header 13 phần tử; 4 chỉ số kinh tế; 2 chip telemetry kỹ thuật. |
| Phản hồi & trạng thái | 6.0 | Có focus ring, toast, badge; nhưng thiếu "còn làm được gì" trong lượt. |
| Nhất quán ngôn ngữ & định dạng | 4.0 | Việt + Hán + khóa kỹ thuật tiếng Anh; "Tiền/Qian"; "6,586" cạnh "9.60". |
| Khả năng đọc & tiếp cận | 5.0 | 107 khai báo `font-size` ≤ 10px; panel phải 9–10px. |
| Độ tin cậy dữ liệu hiển thị | 3.0 | 75% bản ghi chat bị trùng; ngày trong chat lệch ngày hiện tại. |

---

## 2. Những gì đang làm tốt (giữ nguyên)

1. **Nhận diện thị giác mạnh.** Nền `#0b0f17`-ish, chữ vàng son, ấn triện 府 / 工 / 志 / 時. Đây là tài sản thương hiệu, đừng phá.
2. **CTA chính có màu riêng.** Nút "Qua Lượt" và "Thi Hành" dùng amber, tách hẳn khỏi nút phụ. Đúng nguyên tắc một hành động chính.
3. **Card anatomy nhất quán.** Mọi card trong cột phải cùng cấu trúc: tiêu đề + badge + nội dung + hành động.
4. **Không tràn ngang.** Đo tại 1280/1366/1440/1920: `scrollWidth - clientWidth = 0`.
5. **Có focus ring toàn cục** và hỗ trợ song ngữ Việt/Anh.

---

## 3. Vấn đề ưu tiên

### P0-1 — Chat Chronicle bị nhân bản: 75% bản ghi là trùng lặp

**Bằng chứng (DB phiên đang chơi):**

```
chat_chronicle: 32 bản ghi / 8 nội dung khác nhau
17 bản ghi giống hệt nhau của cùng một câu thoại Trương Phi
 9 bản ghi giống hệt nhau của cùng một báo cáo "Làm Thuê"
```

Trong ảnh chụp, ba card Trương Phi giống nhau nằm liền nhau, cùng mốc `184-05-02 • 07:22`, cùng một đoạn văn.

**Tác động:** người chơi mất niềm tin vào dòng thời gian; không biết sự kiện nào thật sự mới. Đây là lỗi UX nghiêm trọng hơn mọi lỗi thẩm mỹ.

**Đề xuất:**
- Thêm khóa idempotency khi ghi chronicle (`session_id + turn + scene_id + hash(text)`), ghi trùng thì bỏ.
- Ở tầng render, gộp các sự kiện cùng loại trong cùng một giờ thành một card có bộ đếm ("× 9") thay vì 9 card.
- Với hành động lặp ("Làm Thuê"), hiển thị một dòng tổng kết theo ngày.

---

### P0-2 — Hai mốc thời gian khác nhau trên cùng một màn hình

Header ghi `184-11-08 (Lượt 12)`, nhưng toàn bộ message của lượt 12 lại ghi `184-05-02`. Trong DB, các bản ghi `turn_number = 12` có `game_date = '184-05-02'`.

**Tác động:** người chơi không biết "hôm nay" là ngày nào; mọi cảm giác về nhịp thời gian (mùa, lương thảo, lịch sử) bị vô hiệu.

**Đề xuất:** một nguồn ngày duy nhất từ `campaign_meta.current_date`; message chỉ lưu `turn_number` và suy ra ngày khi render. Định dạng lại theo thiết kế có sẵn trong `public/js/i18n.js:9` — "Ngày 2 Tháng 5 Năm 184 SCN (Lượt 6)" — thay vì chuỗi ISO `184-11-08` do `public/app.js:202` ghi đè.

---

### P0-3 — Telemetry kỹ thuật và mã nội bộ nằm trong UI người chơi

**Header** (`public/index.html:51-57`) hiển thị:

- `AI Bridge: LIVE`
- `Universe TS: 9 Modules`
- `100% Khớp` (tooltip: "1356 Bất biến SQLite đã xác minh hoàn hảo")

**Sổ Cái TXN** (tab mặc định của panel phải, `public/index.html:379`) hiển thị mã thô:

- `MILITARY_REINFORCE` (`src/modules/military/military.controller.ts:255`)
- `WORKFORCE_HIRE` (`src/modules/professions/features/workforce/specialist-workforce.service.ts:253`)
- `Logistics/GuardFee` (`src/modules/ecology-logistics/caravan-logistics.service.ts:238`)

**Tác động:** phá vỡ immersion ngay ở vùng đắt giá nhất (góc trên phải) và ở tab được chọn mặc định.

**Đề xuất:**
- Chuyển 3 chip telemetry vào drawer "Nhật Ký" (đã có nút sẵn ở header).
- Thêm bảng ánh xạ `category → nhãn tiếng Việt` trước khi render sổ cái: `MILITARY_REINFORCE → "Chiêu Mộ Đồn Trú"`, v.v.
- Đổi tab mặc định của panel phải sang "Quan Hệ" hoặc "Tổng Quan"; sổ cái là công cụ kế toán, không phải màn hình chính.

---

### P1-1 — Thứ bậc bị đảo: dock hành động lớn hơn phần truyện

Đo thực tế sau khi bỏ hàng chip:

| Khổ màn hình | Chiều cao chat | Chiều cao dock | Dock / vùng chơi |
|---|---:|---:|---:|
| 1440×900 | 308px | 432px | 52% |
| 1366×768 | 239px | 369px | 53% |
| 1280×720 | 214px | 346px | 53% |

Ở 1366×768, người chơi chỉ thấy **~3 lượt thoại** cùng lúc. Trong một game tường thuật, nội dung chính đang là vùng nhỏ nhất.

**Đề xuất:**
- Thu dock về **một hàng** (~56px): hero pill + 5 nút phụ + "Qua Lượt".
- 4 card quyết sách chuyển thành **carousel ngang 1 hàng** hoặc accordion "Quyết Sách (4)" mở khi cần.
- Đặt `min-height: 42%` cho `.story-chronicle` để chat không bao giờ bị bóp dưới 300px.
- Cho phép thu gọn dock (nút ˅), nhớ trạng thái trong `localStorage`.

---

### P1-2 — Hai nút cùng một hành động, hai nhãn khác nhau

`public/index.html:27-30` (header) và `public/index.html:163-166` (dock) đều gọi `openTurnAdvanceModal()`, nhưng nhãn lần lượt là **"Tiến Lượt / Kết Thúc Lượt"** và **"Qua Lượt Mới"**.

**Tác động:** người chơi phải học hai tên cho một khái niệm; nhãn dài ở header còn chiếm chỗ.

**Đề xuất:** giữ **một** CTA duy nhất ở dock với nhãn thống nhất "Qua Lượt"; header chỉ hiển thị `Lượt 12` như trạng thái, không phải nút.

---

### P1-3 — Bảy điểm vào điều hướng, ba mô hình tư duy

Hiện tại người chơi thấy: `Hành Dinh`, `Đổi Phiên`, `Dư Đồ Tam Quốc`, `Nội Thành`, `Quân Cơ`, `Sổ Tay [J]`, `Phi Thư`, `Nhật Ký`.

Vấn đề không phải số lượng, mà là **không rõ cái nào chứa cái gì**: "Hành Dinh" và "Quân Cơ" đều nghe như nơi quản lý; "Sổ Tay" và "Quân Cơ" từng là cùng một modal trong lịch sử code.

**Đề xuất:**
- Nhóm theo 3 ý niệm: **Đi lại** (Nội Thành, Dư Đồ) · **Quản trị** (Quân Cơ, Sổ Tay, Phi Thư) · **Phiên chơi** (Hành Dinh, Đổi Phiên).
- Thêm command palette `Ctrl/Cmd + K` liệt kê toàn bộ đích đến; giữ nút trên header cho 3 mục dùng nhiều nhất.
- Đổi "Hành Dinh" thành "Menu" hoặc icon ☰ thuần, vì hiện tại nó là nút mở menu chứ không phải một địa điểm.

---

### P1-4 — Panel phải mặc định mở sổ kế toán

Tab đang active là `Sổ Cái TXN` (`public/index.html:379`), nội dung là các dòng `TXN-MVSUZXMC-805` và mã sự kiện thô.

**Tác động:** vùng 360px đắt nhất trên màn hình đang dành cho dữ liệu mà 90% người chơi không cần lúc ra quyết định.

**Đề xuất:** mặc định "Quan Hệ Hào Kiệt" (đã có sẵn ngay trên) hoặc một tab "Tổng Quan" 3 dòng: thể lực · tiền · lượt còn lại. Sổ cái chuyển vào Sổ Tay.

---

### P2-1 — Chỉ số cá nhân không có trên header

Header luôn hiển thị 4 chỉ số tiền (Tiền mặt, Lương thảo, Giá trị kho, Tài sản ròng) nhưng **không có Thể lực** — trong khi Thể lực là "tiền tệ hành động" thật của game (mỗi hành động tiêu hao). Thể lực chỉ nằm trong panel phải.

**Đề xuất:** thay "Giá Trị Kho" + "Tài Sản Ròng" bằng `Thể lực 123/123` + `Lượt 12`; gộp 3 chỉ số tiền thành một chip mở rộng khi hover.

---

### P2-2 — Legend lặp lại thông tin của card

`public/index.html:186-191` có hàng legend `Xã Giao | Sản Nghiệp | Cơ Duyên | Tu Thân`, trong khi mỗi card đã có đúng tag đó ở góc trên. Một hàng cao ~24px chỉ để lặp lại.

**Đề xuất:** bỏ legend, hoặc biến nó thành **filter** thật (bấm để lọc 4 card) — khi đó nó mới đáng tồn tại.

---

### P2-3 — Chữ quá nhỏ và quá nhiều cỡ

Có **107 khai báo `font-size` ≤ 10px**. Trong panel phải, chữ mô tả quan hệ và số liệu ở mức 8.5–10px; ở 1366×768 đây là dưới ngưỡng đọc thoải mái.

**Đề xuất:** sàn 11px cho mọi văn bản người chơi phải đọc; 9–10px chỉ dùng cho nhãn phụ không bắt buộc. Rút scale còn 5 bậc: 11 / 12 / 13.5 / 16 / 20.

---

### P2-4 — Định dạng số và tiền không nhất quán

`6,586 Tiền`, `47,159 Tiền` (dấu phẩy ngăn nghìn) cạnh `9.60 Thạch` (dấu chấm thập phân) và `Qian` trong log. Với người Việt, `6,586` đọc là "sáu phẩy năm trăm tám mươi sáu".

**Đề xuất:** dùng `Intl.NumberFormat('vi-VN')` cho mọi số; chọn một đơn vị duy nhất (`Tiền`, bỏ `Qian`).

---

### P2-5 — "Làm Mới Chat" đặt cạnh điều hướng

Nút hủy nội dung nằm ngay cạnh "Dư Đồ Tam Quốc" và "Nội Thành". Dù có confirm, khoảng cách 8px giữa hành động không thể hoàn tác và hành động điều hướng là rủi ro misclick.

**Đề xuất:** đưa vào menu `⋯` của header hoặc cuối panel Nhật Ký.

---

### P3 — Điểm vặt

- Nhãn "Sinh Lực" và "Thể Lực" đặt cạnh nhau nhưng khó phân biệt vai trò (HP vs stamina).
- Chat không gộp các sự kiện liên tiếp cùng loại; 9 lần "Làm Thuê" là 9 card.
- Badge "AI" trên mỗi card quyết sách không mang thông tin cho người chơi.
- Menu "Nội Thành" hiện dùng phím Tab; nên thêm ↑/↓ để đi trong menu.

---

## 4. Xử lý khung đỏ (đã triển khai)

### 4.1. Chẩn đoán

Khung đỏ là `.location-banner` (`public/index.html:74`). Bên trong, `renderLocalPoiNav()` (`public/js/map-data.js:1370`) đổ **7–8 nút đi bộ** vào `.local-poi-group`. Vì `.local-poi-group` không wrap nhưng banner có `flex-wrap: wrap`, các nút xuống thành **hàng thứ hai**, làm banner cao gấp đôi và đẩy phần truyện xuống.

Điểm quan trọng: **không thể xóa hẳn các nút này**, vì "Dư Đồ Tam Quốc" chỉ quản lý các cứ điểm cấp thành/trấn (`public/js/world-map.js` không hề đọc `subLocations`), còn đi bộ trong nội thành chỉ tồn tại ở thanh này. Xóa sẽ mất chức năng.

### 4.2. Cách xử lý

Gộp 7 nút thành **một picker** "行 Nội Thành (7) ▾":

- Một nút duy nhất trên banner, badge đếm số điểm đến.
- Menu popover liệt kê từng điểm: ấn triện, tên đầy đủ, khoảng cách.
- Lọc trùng theo tên hiển thị: dữ liệu có cả `Chợ Đông Môn & Sạp Trà` và `Chợ Đông Môn` (cùng một nơi) → 8 mục còn 7.
- Đóng khi bấm ra ngoài, `Escape`, hoặc chọn đích.
- `aria-haspopup`, `aria-expanded`, `aria-controls`, `role="menu"`, focus vào mục đầu khi mở.

### 4.3. Trước / sau

| Chỉ số | Trước | Sau |
|---|---:|---:|
| Số nút trên banner | 8 | 1 trigger + menu 7 mục |
| Chiều cao banner | ~72px (2 hàng, theo ảnh gốc) | **36px** (1 hàng) |
| Chiều cao trả lại cho chat | — | **+36px** |
| Tràn ngang @1280–1920 | 0 | 0 |
| Chiều cao banner @1280/1366/1440 | — | 36px ở cả ba |

**File thay đổi:**

- `public/index.html:81-96` — thay `.local-poi-group` bằng `.local-poi-picker` + trigger + menu.
- `public/js/map-data.js:1370-1450` — render menu, lọc trùng, đóng/mở, ARIA.
- `public/styles.css:858-975` — thay style chip hàng ngang bằng style picker/popover.
- `tools/ui-baseline.json` — khóa mức nợ UI mới (inline styles 1018 → 1016).

**Kiểm chứng:** `npm run verify` xanh — typecheck, arch guard, 19/19 suite, 28 contract, 8/8 write smoke, UI/slop/route gate.

---

## 5. Wireframe đề xuất cho màn hình chính

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ☰   LƯƠNG THỊ PHONG VÂN LỤC        Lượt 12 · 184-11-08    體 123/123 錢 6,586 │  ← 1 hàng, 4 nhóm
├──────────────────────────────────────────────┬─────────────────────────────┤
│ U Châu • Trác Huyện / Vườn Đào Hạ Trạch      │  LƯƠNG DIỄN                 │
│ 行 Nội Thành 7 ▾    卷 Dư Đồ                │  Thể lực ▓▓▓▓▓░░ 123/123    │
├──────────────────────────────────────────────┤  Quan hệ: Trương Phi +5     │
│                                              │  ─────────────────────      │
│  TRUYỆN (≥ 45% chiều cao)                    │  Tab: Quan Hệ | Tài Sản     │
│  ...                                         │  (Sổ Cái chuyển vào Sổ Tay) │
│                                              │                             │
├──────────────────────────────────────────────┤                             │
│ [Trương Phi +5] [Nội Thành] [Sổ Tay] [Phi Thư] [Qua Lượt ▶]  ← 1 hàng       │
│ ▸ Quyết Sách hôm nay (4)  ← accordion, mở khi cần                            │
└──────────────────────────────────────────────┴─────────────────────────────┘
```

---

## 6. Backlog đề xuất

| Ưu tiên | Việc | Tác động | Công |
|---|---|---|---|
| P0 | Chống trùng chronicle + gộp sự kiện lặp | Rất cao | 1–2 ngày |
| P0 | Thống nhất nguồn ngày, bỏ ngày sai trong message | Cao | 0.5 ngày |
| P0 | Ẩn telemetry, map nhãn tiếng Việt cho category sổ cái | Cao | 0.5 ngày |
| P1 | Thu dock còn 1 hàng + accordion quyết sách | Rất cao | 1–2 ngày |
| P1 | Bỏ CTA lượt trùng ở header | Trung bình | 0.5 giờ |
| P1 | Đổi tab mặc định panel phải | Trung bình | 0.5 giờ |
| P1 | Gộp điều hướng thành 3 nhóm + Ctrl+K | Cao | 2 ngày |
| P2 | Thể lực lên header, gộp chỉ số tiền | Cao | 0.5 ngày |
| P2 | Bỏ/đổi legend thành filter | Thấp | 0.5 giờ |
| P2 | Sàn chữ 11px, rút scale 5 bậc | Trung bình | 1 ngày |
| P2 | `Intl.NumberFormat('vi-VN')` toàn cục | Trung bình | 0.5 ngày |
| P3 | Thêm ↑/↓ cho menu Nội Thành | Thấp | 0.5 giờ |

---

## 7. Phụ lục — số liệu đo

```
Viewport      Chat    Dock   Dock/Stage   Right panel   Banner   OverflowX
1440×900      308px   432px      52%          360px        36px       0
1366×768      239px   369px      53%          360px        36px       0
1280×720      214px   346px      53%          360px        36px       0
1920×1000     —       —          —            360px        36px       0
```

- Header cao 68px ở mọi khổ.
- `font-size ≤ 10px`: 107 khai báo trong `public/styles.css`.
- `chat_chronicle`: 32 bản ghi, 8 nội dung khác nhau, 24 bản ghi trùng (75%).
- Panel phải chiếm 25% chiều rộng ở 1440 và 28% ở 1280.
