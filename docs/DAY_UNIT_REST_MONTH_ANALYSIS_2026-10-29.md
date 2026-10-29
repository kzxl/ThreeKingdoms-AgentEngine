# Phân tích: bỏ "lượt", lấy ngày làm đơn vị, nút cuối kỳ thành "Nghỉ 1 tháng"

Ngày 29/10/2026. Phân tích dựa trên code hiện tại sau khi đã có `time-manager`, `action-policy`,
`active_tasks` và mục Thời Gian. Mục tiêu: đánh giá phương án "bỏ lượt / ngày là đơn vị / nghỉ 1 tháng"
theo hướng ROTK, chỉ ra chỗ làm được ngay và chỗ sẽ vỡ nếu hiểu sai.

## 0. Kết luận điều hành

**Nên làm, nhưng "bỏ lượt" phải là bỏ ở tầng hiển thị và điều khiển, không phải xóa `active_turn` khỏi DB.**

- Ngày đã là đơn vị hành động thật: mỗi action tốn ngày, task chạy nhiều ngày, tháng chỉ chốt khi bấm nút.
- `active_turn` vẫn nên tồn tại như **month index nội bộ** vì nó là khóa của `turn_log`, `action_log`,
  `chat_chronicle`, NPC logs, faction events, caravan `created_turn` và seed deterministic.
- Nút cuối kỳ nên đổi thành **"Nghỉ 1 tháng"** (hoặc chính xác hơn: "Nghỉ đến tháng sau").
- Có hai cách hiểu "nghỉ 1 tháng"; chỉ một cách hợp với dữ liệu hiện tại: **nghỉ hết phần còn lại của tháng,
  chốt tháng, sang ngày 1 tháng kế**. Nếu hiểu là cộng đúng 30 ngày thì ngày tháng sẽ trôi và monthly tick
  rơi vào ngày bất kỳ, làm hỏng báo cáo tháng.
- Việc lớn nhất không phải đổi nhãn, mà là **hợp nhất day tick + month tick** để "nghỉ" chạy đúng 27–30 ngày
  bị bỏ qua (thể lực, lương, task, caravan, NPC, chính trị, sinh thái).

## 1. Hiện trạng đã có gì

| Thành phần | Hiện tại | Ý nghĩa |
|---|---|---|
| Đồng hồ | `campaign_meta.current_date`, `engine/time-manager.js` | Ngày là nguồn chân lý |
| Chi phí action | `engine/action-policy.js` | Mỗi action tốn ngày + thể lực |
| Task dài ngày | `active_tasks`, `engine/task-manager.js` | Tiến trình theo ngày, qua tháng |
| Chặn cuối tháng | `MONTH_END` tại ngày 30 | Action tốn ngày bị chặn, phải chốt tháng |
| Chốt tháng | `GameplayManager.advanceTurn()` | +1 tháng, chạy business/NPC/politics/ecology |
| Hồi phục tháng | `-35 fatigue`, `+10 morale`, `+15 health` | Đang gắn với chốt tháng |
| UI | Header `Ngày X/30 • Lượt N` | Lượt vẫn hiện khắp nơi |

Vì vậy đây không phải chuyện xây lại từ đầu. Đây là chuyện **đổi mô hình hiển thị và nghĩa của nút cuối kỳ**,
cộng với sửa các chỗ đang dùng "lượt" làm đơn vị hành động.

## 2. "Bỏ lượt" nghĩa là gì?

Có ba mức:

### Mức A — Bỏ nhãn "Lượt" khỏi UI (khuyến nghị)

- Header: `Ngày 3/30 • Tháng 1 • Năm 185` thay vì `... • Lượt 14`.
- Save list: `Ngày 185-01-03` thay vì `Lượt 14`.
- Report: `Báo cáo tháng 1/185` thay vì `Lượt 14`.
- NPC/faction logs: `Tháng 1/185` thay vì `Lượt 14`.
- `active_turn` vẫn nằm trong DB, chỉ là `monthIndex` nội bộ.

**Chi phí:** thấp, chủ yếu sửa text/format; khoảng 147 chỗ có chữ "Lượt/Turn" trong UI, nhưng phần lớn là label.

### Mức B — Bỏ `active_turn` khỏi schema và mọi bảng

**Không khuyến nghị.** `turn_number` đang xuất hiện ở 18 file và 9 bảng/chỉ mục, gồm:
`turn_log`, `action_log`, `chat_chronicle`, `npc_journey_logs`, `npc_episodic_memories`,
`faction_political_events`, `npc_career_shifts`, `family_lineage` logs, caravan `created_turn`.
Nó còn là seed deterministic:

- `src/modules/npc-lifecycle/npc-lifecycle.module.ts:14` — `getTurnDeterministicRoll(turnNumber, npcId, salt)`
- `src/modules/ecology-logistics/ecology-logistics.module.ts:22` — cùng hàm cho ambush/roll
- `src/modules/faction-politics/*` — event id/roll theo turn

Xóa `active_turn` sẽ đổi kết quả RNG, làm lệch replay/golden, và phải migrate hàng loạt bảng. Không đem lại
lợi ích gameplay nào so với Mức A.

### Mức C — Giữ `active_turn` nhưng đổi nghĩa thành "tháng đã trôi"

Đây là cách an toàn nhất nếu vẫn muốn nói "không còn lượt":
- `active_turn = (year - 184) * 12 + (month - 1)` hoặc giữ counter tăng mỗi lần chốt tháng.
- UI không hiện.
- API cũ vẫn trả `activeTurn` để tương thích, nhưng client không dùng để hiển thị.

**Khuyến nghị: Mức A + C.** Bỏ khái niệm lượt khỏi người chơi, giữ month index trong dữ liệu.

## 3. Nút "Nghỉ 1 tháng" nên hành xử thế nào?

Có ba biến thể:

### Biến thể 1 — Nghỉ hết phần còn lại của tháng (khuyến nghị)

Ví dụ đang `185-01-03`:
- Nghỉ 27 ngày còn lại.
- Ngày chuyển `185-02-01`.
- Chạy daily ticks cho 27 ngày, sau đó monthly tick.
- Task/caravan tiến 27 ngày; thể lực hồi theo ngày + hồi tháng; lương thảo trừ 27 ngày.

Ưu điểm:
- Khớp `advanceTurn()` hiện tại vì nó luôn đưa về ngày 1 tháng sau.
- Monthly report luôn có mốc đầu tháng, dễ so sánh.
- Không có ngày "lửng" như `185-02-03`.

Nhược điểm:
- "1 tháng" không đúng nghĩa đen; số ngày nghỉ thay đổi 1–30.
- Nếu đang ngày 1, nghỉ 29 ngày; nếu ngày 29, nghỉ 1 ngày.

### Biến thể 2 — Cộng đúng 30 ngày

Ví dụ `185-01-03` → `185-02-03`.
- Monthly tick xảy ra khi vượt ngày 30, tức ngày 1/2 trong lúc đang nghỉ; sau đó tiếp tục 2 ngày nữa.
- Phải xử lý tháng bị cắt giữa chừng, báo cáo tháng không còn cùng mốc.
- Dễ sinh lỗi "tháng 2 có 30 ngày" và date math phức tạp.

**Không khuyến nghị** trừ khi muốn mô phỏng lịch thật 365 ngày.

### Biến thể 3 — Chỉ cho nghỉ khi đã ngày 30

- Ngày 1–29 phải hành động; đến 30 mới được nghỉ.
- Cứng nhắc, không giống ROTK, và player có thể bị kẹt nếu không muốn làm gì.

**Không khuyến nghị.**

**Chốt:** dùng biến thể 1, nhưng label nên là **"Nghỉ đến tháng sau"**; nếu muốn giữ chữ "Nghỉ 1 tháng"
thì subtitle phải ghi rõ "bỏ qua phần còn lại của tháng".

## 4. Có nên bỏ chặn ngày 30?

Hiện tại `time-manager` chặn action tốn ngày khi `day >= 30` (`MONTH_END`). Đây là hệ quả của quy tắc
"chỉ nút cuối kỳ mới sang tháng".

Có hai lựa chọn:

### Lựa chọn A — Giữ chặn ngày 30 (an toàn, ít sửa)

- Ngày 30: không thể luyện/travel/mua tiếp; phải Nghỉ.
- Đơn giản, deterministic, không có month tick bất ngờ.
- Nhược điểm: cảm giác bị chặn ở cuối tháng; một chuyến đi 4 ngày bắt đầu ngày 28 sẽ bị cắt còn 2 ngày.

### Lựa chọn B — Cho action vượt tháng, tự chốt tháng khi đi qua ngày 30

- Action 4 ngày từ ngày 28 sẽ đi 28→29→30→1/2, chạy monthly tick tại biên.
- "Nghỉ 1 tháng" chỉ còn là fast-forward.
- Đúng chất ngày liên tục, nhưng phải hợp nhất day tick + month tick và bảo đảm monthly tick chỉ chạy một lần.
- Trái với yêu cầu trước đó "chỉ bấm Qua Tháng mới sang tháng".

**Khuyến nghị:** giữ **Lựa chọn A** trong đợt đầu để bảo toàn determinism; ghi nhận B là hướng nâng cấp
sau khi clock/tick đã hợp nhất. Nếu ưu tiên cảm giác ROTK hơn, chọn B nhưng phải làm cùng đợt với
single clock, không làm rời.

## 5. Tác động theo hệ thống

### 5.1. Database

Không xóa `active_turn`. Có thể thêm `month_index` view/derived:
```sql
-- chỉ là ví dụ, không chạy ngay
SELECT ((CAST(substr("current_date",1,4) AS INTEGER) - 184) * 12
      + CAST(substr("current_date",6,2) AS INTEGER) - 1) AS month_index;
```
Nhưng nên giữ counter hiện tại để không đổi seed RNG. Chỉ đổi nhãn.

### 5.2. API

- Giữ `POST /api/campaign/advance-turn`.
- Thêm alias `POST /api/campaign/rest-month` hoặc `advance-month`.
- Response giữ `nextTurn` (nội bộ), thêm `skippedDays`, `nextDate`, `recoveredFatigue`, `grainConsumed`,
  `tasksProgressed`, `caravansAdvanced`.
- Client không hiển thị `nextTurn`.

### 5.3. Event bus

"Nghỉ 1 tháng" phải chạy:
1. Daily tick cho từng ngày bị bỏ qua (`WORLD_DAY_TICK`).
2. Monthly tick một lần (`WORLD_MONTH_TICK`).
3. Task progress cho số ngày bị bỏ qua.
4. Caravan progress theo ngày.
5. Grain upkeep theo ngày.
6. Monthly business/NPC/politics/ecology.

Hiện `advanceTurn()` chỉ chạy monthly modules và progress task, **không chạy day tick**; `advanceDays()` có
day tick nhưng không có route. Đây là việc phải sửa trước khi đổi nút, nếu không "nghỉ 1 tháng" sẽ bỏ qua
daily systems.

### 5.4. UI

Các chỗ cần đổi nhãn:
- Header date chip (`app.js:205`).
- Title screen save list (`title-screen-ui.js:256`).
- Turn modal/report (`turn-advance.js:291-292,390`).
- Time panel (`turn-advance.js:522`).
- Save/game manager badges (`modals.js:492`).
- NPC/faction logs (`modals.js:961,1189,1434`).
- i18n `dateChip`, `btnTurnDock`, `btnAdvanceTurnTitle`.
- `transit-turn.modal.ts:64` title.

Không cần đổi `turn_number` trong DB; chỉ format khi hiển thị.

### 5.5. Báo cáo tháng

- Tiêu đề: `Báo cáo tháng 1/185` thay vì `Lượt 14`.
- Dòng ngày: `185-01-03 → 185-02-01`, kèm `Nghỉ 27 ngày`.
- KPI "Thao tác" vẫn là số action; thêm "Ngày nghỉ".
- Task/caravan hiển thị tiến trình sau 27 ngày.
- Không dùng "Lượt" trong phần thân báo cáo.

### 5.6. Cân bằng

- 30 action/tháng vẫn khá nhiều so với ROTK. Nếu bỏ lượt, cần giữ chi phí ngày + thể lực + lương thảo.
- Nên coi mỗi hành động là **phiên** (phiên chợ, ca làm, buổi luyện), không phải từng click.
- Nghỉ 1 tháng không nên vừa hồi `1/ngày` vừa cộng `+35/tháng`; chọn một:
  - Hoặc daily recovery 1/ngày, bỏ +35 tháng.
  - Hoặc monthly +35, không cộng daily trong ngày nghỉ.
- Đề xuất: khi nghỉ, dùng daily recovery 1/ngày cho các ngày bị bỏ qua, cộng thêm một lần nghỉ dài
  (ví dụ +10) thay vì +35, để tránh hồi đầy miễn phí.

### 5.7. Determinism

- `getTurnDeterministicRoll(turnNumber, ...)` phải giữ nguyên đầu vào. Nếu đổi turn thành ngày hoặc
  derived month index, kết quả RNG sẽ đổi và làm lệch replay/golden.
- Vì vậy "bỏ lượt" không được chạm vào seed. Giữ `active_turn` nội bộ.

## 6. Lộ trình triển khai đề xuất

### P0 — Đổi nhãn và nghĩa nút (1–2 ngày)

1. Đổi "Qua Tháng" → "Nghỉ 1 tháng" (hoặc "Nghỉ đến tháng sau").
2. Modal xác nhận hiển thị: ngày hiện tại, số ngày sẽ nghỉ, ngày kết thúc, task/caravan sẽ tiến bao nhiêu.
3. Ẩn "Lượt" khỏi header, save list, report, time panel; giữ `activeTurn` trong API.
4. Không đổi DB.

### P1 — Nghỉ đúng nghĩa (2–3 ngày)

1. `advanceTurn()` nhận `skippedDays = 30 - day + 1` (hoặc `30 - day` tùy biên).
2. Chạy day tick + daily upkeep + task/caravan progress cho từng ngày bị bỏ qua.
3. Chạy monthly tick một lần.
4. Trả `skippedDays`, `grainConsumed`, `tasksProgressed`, `caravansAdvanced`.
5. Test nghỉ từ ngày 1, 15, 29, 30.

### P2 — Hợp nhất clock (3–5 ngày)

1. Một `advanceDays(days)` duy nhất phát `WORLD_DAY_TICK`.
2. `time-manager` và `advanceTurn` dùng chung hàm này.
3. Xóa `GameplayManager.advanceDays` cũ hoặc biến nó thành wrapper.
4. Bảo đảm monthly tick chỉ chạy một lần.

### P3 — Nếu muốn bỏ chặn ngày 30 (5–7 ngày)

1. Cho action vượt tháng.
2. Khi vượt, chạy monthly tick tại biên.
3. `Nghỉ 1 tháng` chỉ còn là fast-forward.
4. Cần test kỹ double-tick và caravan/task.

### P4 — Dọn nhãn toàn bộ (1 ngày)

1. `turn_log` vẫn là bảng nội bộ; UI format `Tháng`.
2. Xóa các chuỗi "Lượt" còn lại trong i18n, modals, report.
3. Cập nhật tài liệu/kiểm thử.

## 7. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Xóa `active_turn` làm lệch RNG/replay | Cao | Giữ nội bộ, chỉ đổi UI |
| Nghỉ 1 tháng bỏ qua daily tick | Cao | Hợp nhất day tick trước |
| Double monthly tick khi action vượt tháng | Cao | Một orchestrator, guard DB |
| Ngày lẻ từ marchDays | Cao | Chuẩn hóa integer days |
| Hồi phục quá mạnh khi nghỉ | Trung bình | Chọn daily hoặc monthly, không cộng cả hai |
| Báo cáo tháng lệch mốc | Trung bình | Nghỉ về ngày 1 tháng sau |
| 30 action/tháng quá nhiều | Trung bình | Phiên hành động + fatigue + upkeep |
| Label "1 tháng" gây hiểu nhầm | Thấp | Subtitle "phần còn lại của tháng" |

## 8. Test chấp nhận

1. Từ `185-01-03`, bấm Nghỉ: kết quả `185-02-01`, `skippedDays = 27`.
2. Từ `185-01-01`, bấm Nghỉ: kết quả `185-02-01`, `skippedDays = 29` (hoặc 30 nếu tính cả ngày).
3. Từ `185-01-30`, bấm Nghỉ: kết quả `185-02-01`, `skippedDays = 1`.
4. Task 7 ngày đang `2/7`: sau nghỉ phải `COMPLETED`, reward chỉ một lần.
5. Caravan `EN_ROUTE`: sau nghỉ tiến đúng số ngày, không vượt quá 1.0.
6. `WORLD_DAY_TICK` phát đúng `skippedDays` lần; `WORLD_MONTH_TICK` đúng 1 lần.
7. Grain giảm đúng `0.02 * skippedDays` (hoặc policy), không trừ hai lần.
8. `active_turn` tăng 1; `current_date` đúng ngày 1 tháng sau.
9. Không còn chuỗi "Lượt" trong UI người chơi nhìn thấy.
10. Save cũ mở được, không migration phá dữ liệu.

## 9. Khuyến nghị cuối

- **Làm Mức A + C**: bỏ "Lượt" khỏi UI, giữ `active_turn` làm month index nội bộ.
- **Nút "Nghỉ 1 tháng"** nên nghỉ hết phần còn lại của tháng, về ngày 1 tháng sau; không cộng đúng 30 ngày.
- **Giữ chặn ngày 30** trong đợt đầu; chỉ bỏ khi đã hợp nhất day/month tick.
- **Đừng xóa `active_turn`**: 18 file và 9 bảng đang phụ thuộc, gồm seed deterministic. Đây là chi phí lớn
  nhất và rủi ro cao nhất, không đổi lại lợi ích gameplay.
- Nếu mục tiêu là "ROTK feel", ưu tiên: ngày liên tục + nghỉ tháng + báo cáo tháng, không phải xóa lượt khỏi DB.
