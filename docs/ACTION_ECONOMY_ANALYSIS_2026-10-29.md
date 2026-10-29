# Phân tích kinh tế hành động theo ngày

Ngày 29/10/2026. Tài liệu này phân tích hiện trạng thời gian/hành động của Simulation và đề xuất mô hình
"một thao tác = một ngày, task lớn chạy nhiều ngày, chỉ Qua Tháng mới chốt tháng" theo hướng ROTK.

## 0. Trạng thái triển khai (29/10/2026)

- **P0 — Đồng hồ + chi phí gateway: DONE.** `engine/action-policy.js`, `engine/time-manager.js`; mọi action
  đi qua `SimulationCore.executeAction()` tốn ngày/thể lực; ngày 30 chặn action tốn ngày và trả `MONTH_END`.
- **P1 — Chặn bypass: DONE (các tuyến người chơi chính).** Đã phủ trade, production, personal growth, move,
  social Kizuna, ca làm việc, viễn chinh, lập thương đoàn, chiêu mộ nhân lực, yến tiệc/kết nghĩa và lôi đài.
  Các endpoint quản trị nội bộ (tick, claim, status) được miễn vì không phải hành động người chơi.
- **P2 — Task nhiều ngày: DONE (baseline).** Bảng `active_tasks`, API `/api/tasks`, strip tiến trình trong
  command dock, task "Bế quan khổ luyện 7 ngày", reward EXP khi hoàn tất; task tiếp tục qua tháng.
- **P3 — Upkeep/hồi phục: DONE (baseline).** Tiêu hao 0.02 thạch/ngày, hồi phục thụ động 1 thể lực/ngày,
  cộng thêm hồi phục khi nghỉ; hồi +35/tháng vẫn giữ để tránh sốc cân bằng.
- **P4 — Cân bằng/báo cáo: PARTIAL.** Báo cáo tháng có khối task; **mục Thời Gian** có timeline hành động gần
  đây, đồng hồ thực tế, ngân sách ngày và tiến trình task. Diminishing returns cho luyện tập vẫn để sau.

## 1. Hiện trạng đã kiểm chứng

- `campaign_meta.current_date` là ngày duy nhất; `advanceTurn()` cộng thẳng 1 tháng và chạy toàn bộ vòng
  sản nghiệp/NPC/chính trị/sinh thái (`engine/gameplay-manager.js:263`).
- Đã có `advanceDays(dayCount)` trong engine (`engine/gameplay-manager.js:488`) và đã có subscriber
  `WORLD_DAY_TICK` ở military/utility AI, nhưng **chưa có route HTTP** và chưa được gọi từ thao tác nào.
- `SimulationCore.executeAction()` xử lý mua/bán/sản xuất/trả lương/di chuyển/tu dưỡng nhưng **không đổi
  `current_date`** (`engine/sim-core.js:96`).
- Các endpoint mua bán, xưởng, chiêu mộ, làm thuê gọi thẳng service/DB, không đi qua một cổng thời gian chung.
- `action_log` có `turn_number` và `game_date`, nhưng dữ liệu thực tế đang lệch: campaign ở lượt 13–14,
  trong khi log thao tác cũ vẫn là lượt 6/12 và ngày `184-05-02`.
- `fatigue` chỉ chặn một số lựa chọn khi đã rất cao (ví dụ ≥ 80), không chặn mua bán; mua và luyện tập
  vẫn lặp vô hạn trong cùng một ngày.
- `advanceTurn()` hồi +35 mệt mỏi, +10 sĩ khí, +15 sinh lực mỗi **tháng**, không có hồi phục theo ngày.

Kết luận: thời gian hiện là **theo tháng**, còn hành động là **tức thời và không có ngân sách**. Vì vậy
người chơi có thể mua/luyện không giới hạn trước khi bấm Qua Tháng.

## 2. Mục tiêu thiết kế

1. Mỗi hành động có chi phí thời gian, thể lực và đôi khi là lương thảo/tiền.
2. Hành động ngắn tốn 1 ngày; hành động lớn tạo tiến trình nhiều ngày.
3. Không tự động sang tháng khi hành động chạm ngày 30; chỉ nút **Qua Tháng** mới chạy vòng tháng.
4. Mọi nguồn thao tác (contextual choice, mua bán, xưởng, chiêu mộ, làm thuê, di chuyển) dùng chung một
   cổng chi phí, không thể bypass.
5. Báo cáo tháng phải giải thích được: đã làm gì, mất bao nhiêu ngày, hoàn thành task nào, thế giới đổi ra sao.

## 3. Mô hình đề xuất

### 3.1. Đồng hồ

- `campaign_meta.current_date` là nguồn chân lý, đơn vị ngày.
- Quy ước 30 ngày/tháng để khớp dữ liệu hiện tại.
- `day_index = day của current_date` (1..30).
- Chỉ `advanceMonth()` mới chạy vòng tháng; `advanceDays()` chỉ đẩy ngày, hồi phục, upkeep và task progress.

### 3.2. Ngân sách hành động

Dùng hai lớp, không dùng một con số AP trừu tượng:

- **Thời gian**: hành động tốn `durationDays`, mặc định 1.
- **Thể lực**: `fatigueCost`; nếu không đủ thì chặn trước khi ghi DB.
- **Slot trong ngày** (tùy chọn): 2 slot cho hành động tức thời/ngắn trong cùng ngày; hành động lớn chiếm
  cả ngày. Cách này tránh việc 10 cú click mua từng món biến thành 10 ngày.

Khuyến nghị: **1 phiên chợ = 1 ngày**, không phải 1 món = 1 ngày. Trong phiên chợ người chơi mua/bán
nhiều món miễn là đủ tiền/sức chứa. Đây là điểm quan trọng để không biến UI thành cực hình.

### 3.3. Bảng chi phí gợi ý

| Hành động | Thời gian | Thể lực | Ghi chú |
|---|---:|---:|---|
| Phiên chợ (mua/bán nhiều món) | 1 ngày | 5 | 1 phiên/ngày; chặn arbitrage trong ngày |
| Luyện tập cá nhân | 1 ngày | 10 | Giảm hiệu quả nếu lặp trong tháng |
| Giao lưu/tiệc trà | 1 ngày | 5 | 1 lần/NPC/ngày |
| Làm thuê | 1 ngày | 12 | Trả lương theo ngày |
| Quản lý xưởng | 1 ngày | 5 | Sản xuất theo lô |
| Đi bộ nội thành | 0,5 ngày | 3 | Làm tròn 1 ngày nếu qua 2 điểm |
| Viễn chinh | theo route `marchDays` | theo quân | Đã có `daysRequired` trong route |
| Nghỉ ngơi | 1 ngày | -35 | Hồi phục, không làm việc khác |
| Task lớn (xây dựng, tuyển mộ đợt, mở tuyến) | 3/7/15/30 ngày | theo ngày | Có progress bar |

### 3.4. Hồi phục và tiêu hao

- Mỗi ngày nghỉ: `fatigue -8`, `health +2`.
- Nghỉ trọn ngày: `fatigue -35`, `morale +5`.
- Mỗi ngày: tiêu hao lương thực theo số người/ngựa; hết lương → `fatigue +10`, `morale -5`.
- Cuối tháng: trả lương gia nhân, kết toán xưởng, chạy NPC/chính trị/sinh thái như hiện tại.
- Không hồi +35 mệt mỏi miễn phí mỗi tháng nữa; chuyển thành hồi theo ngày.

### 3.5. Task lớn và tiến trình

Bảng mới:

```sql
CREATE TABLE active_tasks (
  task_id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,
  title_vi TEXT NOT NULL,
  start_date TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  elapsed_days INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  payload_json TEXT,
  result_json TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- Mỗi `advanceDays(n)` cộng `elapsed_days`.
- Khi `elapsed_days >= duration_days` → `COMPLETED`, trả kết quả một lần.
- Task dài hơn tháng vẫn tiếp tục khi bấm Qua Tháng; không bị hủy.
- Người chơi có thể hủy, mất tiến trình hoặc chịu phạt tùy task.

## 4. Kiến trúc triển khai

### 4.1. Backend

- `src/modules/time/time.service.ts` (hoặc mở rộng `GameplayManager.advanceDays`):
  - `advanceDays(days, reason)` atomic: date, fatigue, upkeep, task progress, caravan progress.
  - `advanceMonth()`: chạy daily ticks cho các ngày còn lại, sau đó monthly tick đúng một lần.
- `src/shared/action-policy.ts`: bảng chi phí duy nhất dùng chung server/client.
- `POST /api/action` và mọi endpoint ghi dữ liệu phải gọi `consumeActionBudget(policy)` trước/sau giao dịch.
- `POST /api/campaign/advance-month`: thay cho `advance-turn`, chỉ dùng cho nút Qua Tháng.
- Ghi `action_log.game_date` sau khi đã đẩy ngày, để log phản ánh đúng ngày xảy ra.

### 4.2. Các điểm bypass cần chặn

Hiện tại các nhóm sau gọi thẳng DB/service, không qua `SimulationCore`:

- mua bán nhanh (`/api/trade`, `/api/action`);
- xưởng/sản xuất (`/api/workshop/*`, enterprise);
- chiêu mộ nhân lực (`WORKFORCE_HIRE`, guard tiers);
- làm thuê (`/api/workforce/*`, wage labor);
- di chuyển local/route;
- sự kiện hội thoại, tiệc, luyện tập.

Nếu chỉ sửa `executeAction()` thì vẫn còn đường bypass. Cần một helper `withActionCost()` bọc tất cả
endpoint ghi, hoặc chuyển toàn bộ về một action gateway.

### 4.3. Frontend

- Header: `Ngày 12/30 • 1 hành động còn lại • Thể lực 68/100`.
- Thẻ lựa chọn hiện chip: `1 ngày`, `-10 thể lực`, `Cần 0.5 thạch`; nút bị khóa kèm lý do.
- Panel `Đang thực hiện`: progress bar `3/7 ngày`, nút Hủy.
- Nút duy nhất `Qua Tháng` mở modal: ngày còn lại, task đang chạy, dự báo thu chi, cảnh báo thiếu lương.
- Báo cáo tháng giữ 6 KPI + 7 khối như bản vừa sửa, bổ sung cột thời gian của từng thao tác.

## 5. Lộ trình

### P0 — Đồng hồ và chi phí cho action gateway (1–2 ngày)

- Thêm `advanceDays` route nội bộ.
- Policy cho `PERSONAL_GROWTH`, `TRADE_BUY/SELL`, `PRODUCTION_BATCH`, `MOVE_LOCATION`.
- Ghi ngày sau thao tác; header hiển thị ngày.
- Chưa đụng endpoint phụ.

### P1 — Chặn bypass (2–3 ngày)

- Bọc trade/workshop/workforce/travel bằng `withActionCost`.
- Phiên chợ 1 ngày; 1 giao dịch lớn = 1 ngày.
- Disable UI khi thiếu thể lực/ngày.

### P2 — Task nhiều ngày (3–5 ngày)

- Bảng `active_tasks`, API start/progress/cancel.
- UI progress bar; task tiếp tục qua tháng.

### P3 — Upkeep và hồi phục theo ngày (2–3 ngày)

- Lương thực/ngày, hồi phục/ngày, phạt khi thiếu.
- Bỏ hồi +35/tháng.

### P4 — Cân bằng và báo cáo (2–3 ngày)

- Hệ số diminishing returns cho luyện tập.
- Báo cáo tháng có timeline ngày → việc đã làm → kết quả.
- Test determinism, save compatibility.

## 6. Rủi ro

- **Double tick**: action đẩy ngày, rồi Qua Tháng lại chạy thêm ngày cũ. Cần chốt `last_processed_date`.
- **Save cũ**: action_log lệch ngày; cần migration chuẩn hóa hoặc chỉ dùng log từ mốc migration.
- **Bypass**: chỉ sửa `/api/action` là chưa đủ; phải audit toàn bộ endpoint ghi.
- **UX nặng**: 1 món = 1 ngày sẽ khiến mua sắm cực hình; dùng phiên chợ/phiên làm việc.
- **Task dài qua tháng**: phải quyết định task tiếp tục hay tạm dừng; khuyến nghị tiếp tục.
- **Cân bằng kinh tế**: chi phí ngày làm giảm số thao tác/tháng, cần tăng thu nhập hoặc giảm giá để tránh soft-lock.

## 7. Khuyến nghị chốt

- Dùng **ngày** làm đơn vị, **tháng** là kỳ kế toán.
- Mỗi **phiên hành động** tốn 1 ngày, không phải mỗi cú click.
- Task lớn chạy theo `active_tasks` với progress bar.
- Chỉ nút **Qua Tháng** chạy monthly tick; action không bao giờ tự sang tháng.
- Triển khai P0 trước để có đồng hồ và chi phí thật, rồi mới mở rộng sang các endpoint phụ.
