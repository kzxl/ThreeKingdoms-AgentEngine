# Rà soát logic trùng lặp & chồng chéo tính năng

Ngày 29/10/2026. Phạm vi: `engine/`, `src/`, `public/js`, `public/index.html`, `tools/sim-web.js`.
Phương pháp: đọc code + đối chiếu call graph + mở thử UI trên trình duyệt. Các kết luận dưới đây là
hiện trạng tại thời điểm rà soát, không phải giả thuyết từ tên file.

## 0. Kết luận điều hành

Game vẫn chạy được happy path và `npm run verify` xanh, nhưng đang có **5 lỗi P0/P1 có thể làm sai dữ liệu
hoặc làm hỏng một tính năng đang mở**:

1. **Quán rượu / lôi đài / nhà ở đang mở modal rỗng** vì ModalShell và legacy cùng sở hữu một ID nhưng
   render vào hai body ID khác nhau. Đã tái hiện trên trình duyệt.
2. **Đi đường có thể ghi ngày lẻ vào `campaign_meta`** (`184-05-2.5`) và bị trừ lương ở hai nơi.
3. **Đồng hồ ngày mới không phát `WORLD_DAY_TICK`**, nên các hệ thống daily không bao giờ chạy.
4. **Caravan có hai state machine và hai kiểu quyết toán**, có thể tiến hai lần/tháng và trả tiền hai nơi.
5. **Sản nghiệp có ba công thức lợi nhuận khác nhau**, trong đó một công thức ghi đè `player_state.safe_cash`.

Ngoài ra còn 6 nhóm trùng lặp P1 và nhiều điểm P2/P3. Chi tiết ở dưới.

## 1. Bảng tổng hợp

| # | Mức | Cụm | Bằng chứng chính | Tác động |
|---|---|---|---|---|
| 1 | P0 | Modal POI | `modal-shell.ts:79`, `spatial-poi-modals.js:45,78,134`, `spatial-poi.modal.ts:24` | Quán rượu/lôi đài/nhà ở mở khung rỗng, không bấm được hành động |
| 2 | P0 | Thời gian + du hành | `time-manager.js:19-21,89-91`, `travel-transit.js:459-477`, `travel-manager.js:485-494` | Ngày lẻ, sai lịch, trừ lương hai lần |
| 3 | P0 | Day tick | `time-manager.js:75-131`, `gameplay-manager.js:594-653` | Daily NPC/quân sự/logistics không chạy |
| 4 | P1 | Caravan | `ecology-logistics.module.ts:331-399`, `caravan-logistics.service.ts:325-470` | Tiến trình/quyết toán chồng, mất hoặc nhân đôi tiền |
| 5 | P1 | Sản nghiệp | `gameplay-manager.js:313-343`, `workshop-engine.js:112-452`, `enterprise-labor.service.ts:534-551` | Ba công thức lợi nhuận, lệch két và sổ cái |
| 6 | P1 | World simulation | `gameplay-manager.js:350-358,526-540` | Module commit ngoài transaction, retry bị skip |
| 7 | P1 | Thể lực | `app.js:656`, `enterprise-ui.js:908`, `daily-interaction.engine.ts:777-792`, `enterprise-labor.service.ts:1125` | Cùng hành động bị trừ thể lực hai tầng |
| 8 | P1 | Sổ cái | `sim-core.js:43-46`, `economy.controller.ts:261-263`, `workshop-engine.js:253-308` | `cashflow_ledger.balance` không còn một nghĩa |
| 9 | P1 | Hub/Journal | `personal-journal-ui.js:944`, `grand-command-hub-ui.js:2305` | 7-tab hub bị override bởi 4-tab journal |
| 10 | P1 | Bản đồ | `map-data.js:368,1352,1426`, `spatial-registry.ts:9,46`, `map-live.service.ts:80,408` | 20 node vs 23 settlement, 4 nguồn route/coord |
| 11 | P2 | Bảng chi phí | `config.js:31-55`, `action-policy.js:7-30` | UI và server có thể lệch ngày/thể lực |
| 12 | P2 | Ngày cứng | `modals.js:141`, `app.js:1097`, `spatial-poi-modals.js:379`, `economy.controller.ts:250` | Ghi sổ sai ngày; kinh tế tin ngày client |
| 13 | P2 | Trade/modal | `index.html:467`, `trade-quick.modal.ts:17,87`, `modals.js:57,135` | Hai modal, hai payload, hai đường ghi sổ |
| 14 | P2 | Event bus | `TURN_ADVANCED` chỉ có subscriber; `LOD1_WEEKLY_TICK`/`AUTUMN_HARVEST_CYCLE` chỉ có publisher | Wiring chết, test tạo cảm giác đã chạy |
| 15 | P3 | Date helpers | `date-utils.js:22-84`, `gameplay-manager.js:599-631`, `sim-core.js:60-64` | Nhiều cách tính ngày/ordinal, dễ lệch |
| 16 | P3 | Lương/giá | `enterprise-labor.service.ts:97-194,968-1077`, `wage-labor.constants.ts:38-159`, `rules.js:7-22` | Cùng nghề trả lương/giá khác nhau |

## 2. Chi tiết các lỗi P0

### P0-1. Modal POI bị hai hệ thống cùng sở hữu

**Hiện tượng đã tái hiện:** mở `SpatialPoiModals.openTavernModal('drink')` trên trình duyệt:
- `#spatial-tavern-modal` mở, header và 4 tab hiện.
- `#tavern-modal-body` **không tồn tại**.
- `#spatial-tavern-modal-body` tồn tại nhưng **rỗng**.

**Nguyên nhân:**
- Bundle TS tạo shell `id: 'spatial-tavern-modal'` (`src/client/features/spatial-poi/spatial-poi.modal.ts:24`).
- `ModalShell.mountDom()` tìm phần tử cùng ID và **ghi đè toàn bộ `innerHTML`**, tạo body
  `#spatial-tavern-modal-body` (`src/client/core/modal-shell/modal-shell.ts:59-92`).
- Legacy `ensureTavernModalDom()` thấy ID đã tồn tại nên return sớm (`public/js/spatial-poi-modals.js:44-49`).
- Legacy renderer lại tìm `#tavern-modal-body` cố định (`public/js/spatial-poi-modals.js:78,134`), nên
  `if (!body) return;` và không render gì.

Cùng pattern ở `arena-modal-body` (`spatial-poi-modals.js:514,570,722`) và
`residence-modal-body` (`:976,1032`).

**Tác động:** quán rượu, lôi đài, nhà ở mất toàn bộ nội dung; người chơi chỉ thấy khung và tab.
Đây là lỗi đang hoạt động, không phải latent.

**Hướng sửa:** một chủ sở hữu cho mỗi ID. Ưu tiên legacy cho POI (vì service TS còn gọi endpoint không tồn tại),
hoặc xóa hẳn legacy và sửa TS service. Thêm test boot kiểm tra mọi modal ID có đúng một renderer và body không rỗng.

### P0-2. Ngày lẻ + trừ lương hai lần khi du hành

**Đường đi:**
1. `apiCompleteTravelMarch()` gọi `/api/travel/complete` (`public/js/travel-transit.js:459`).
2. `TravelManager.completeMarch()` trừ `grainCost` của route và đổi vị trí
   (`engine/travel-manager.js:485-494`).
3. Client gọi tiếp `apiSpendActionTime('MOVE_LOCATION', ..., plan.marchDays)`
   (`public/js/travel-transit.js:470-477`).
4. `time-manager` nhận `daysOverride`, cộng ngày và trừ thêm `0.02 × days` thạch
   (`engine/time-manager.js:89-98`).

**Lỗi dữ liệu:**
- `map-data.js` có nhiều `marchDays` lẻ: `0.5`, `0.8`, `1.4`, `1.5`, `1.2`…
  (`public/js/map-data.js:1353-1372`).
- `time-manager` không làm tròn: `nextDay = date.day + advancedDays` (`:89`),
  `formatDate()` chỉ `padStart` (`:19-21`).
- Kết quả có thể là `184-05-2.5` hoặc `184-05-5.5`, làm hỏng mọi parse ngày, sort ledger và `/api/time/clock`.

**Tác động:** sai lịch, sai báo cáo tháng, trừ thêm lương ngày sau khi route đã trừ lương.

**Hướng sửa:** route day phải là số nguyên (`ceil`/`round` tại biên), chỉ một nơi trừ grain;
`advanceDays` phải từ chối hoặc chuẩn hóa số lẻ; test case `marchDays=0.5` và `1.4`.

### P0-3. Đồng hồ ngày không phát tick ngày

- Đồng hồ thật của action là `time-manager.applyActionTime()` (`engine/time-manager.js:75-131`), được gọi từ
  `SimulationCore.executeAction()` (`engine/sim-core.js:173-175`) và `/api/time/spend`.
- Hàm này **không publish `WORLD_DAY_TICK`**.
- Publisher duy nhất là `GameplayManager.advanceDays()` (`engine/gameplay-manager.js:594-631`), nhưng hàm này
  **không có route HTTP và không có caller UI**; chỉ test gọi.
- Subscriber tồn tại: `military.module.ts:135` (handler rỗng) và `utility-ai.module.ts:88` (publish LOD event
  không có subscriber).

**Tác động:** mọi hành động tốn ngày đều bỏ qua daily military/utility/logistics. Thế giới chỉ nhảy theo tháng,
trong khi UI nói "1 ngày".

**Hướng sửa:** `time-manager` phát tick cho từng ngày đã đi, hoặc gọi một `advanceDays` duy nhất;
xóa implementation còn lại.

## 3. Các lỗi P1

### P1-4. Caravan có hai state machine

- `simulateEcologyAndLogisticsTurn()` cộng thẳng `+0.35`, xử lý ambush, đặt `SUCCESS_TRADED` và trả tiền cho
  **faction treasury** (`src/modules/ecology-logistics/ecology-logistics.module.ts:331-399`).
- `tickCaravans()` tiến theo `speed`/distance, ambush khác, đặt `ARRIVED` (`caravan-logistics.service.ts:325-444`).
- `advanceDays()` cộng `route_progress + 0.02 × days`, không đổi status (`gameplay-manager.js:635-643`).
- `claimCaravan()` chấp nhận cả `ARRIVED` và `SUCCESS_TRADED`, rồi trả tiền cho player
  (`caravan-logistics.service.ts:470-505`).
- UI chỉ hiện nút Claim khi `ARRIVED` (`public/js/caravan-ui.js:392`, `grand-command-hub-ui.js:1241`).

**Tác động:** caravan có thể tiến hai lần trong một tháng; caravan đã được ecology trả cho faction thành
`SUCCESS_TRADED` thì UI không claim được, hoặc API claim lại trả thêm cho player. Hai định nghĩa lợi nhuận:
`gross - cargo_value` vs `cargo_value × 1.35`.

**Hướng sửa:** một `CaravanService` duy nhất, một enum trạng thái, một hàm settlement; xóa payout faction
hoặc biến nó thành nguồn duy nhất.

### P1-5. Ba công thức sản nghiệp

- `GameplayManager.advanceTurn()`: `gross = tier*260*eff + workforce*25`, trừ `npc_state.monthly_wage`,
  ghi `businesses.safe_cash` (`gameplay-manager.js:313-343`).
- `WorkshopEngine.simulateMonth()`: sản xuất theo BOM, giá bán cứng `25/50/140`, ghi cả
  `businesses.safe_cash` và **`player_state.safe_cash`** (`workshop-engine.js:112-452`).
- `EnterpriseLaborService.accrueProfits()`: `dailyRevenue - rent/30 - workforce*15`
  (`enterprise-labor.service.ts:534-551`).

Đường tự động hiện tại là `advanceTurn`; `simulateMonth` chỉ có qua API/tool; `accrueProfits` hiện chỉ test gọi.
Nhưng cả ba cùng ghi vào cùng bảng business/profit, nên nếu UI/API gọi thêm sẽ lệch hoặc nhân đôi.

**Hướng sửa:** một `BusinessSimulationService.runMonth(businessId, gameDate)` có idempotency key
`(businessId, month)`; cấm engine business ghi đè `player_state.safe_cash`.

### P1-6. World simulation commit ngoài transaction

- `advanceTurn()` gọi NPC/politics/ecology trước (`gameplay-manager.js:350-358`), rồi mới chạy batch
  `player/meta/business/turn_log/chronicle` (`:526-540`).
- Guard `lastSimulatedTurn` được set trước khi commit (`npc-lifecycle.module.ts:552-555`,
  `faction-politics.module.ts:314-317`, `ecology-logistics.module.ts:332-335`).
- Nếu batch sau fail, world modules đã commit riêng; retry cùng turn sẽ bị guard skip.
- NPC còn bị gọi hai lần: explicit call + `WORLD_MONTH_TICK` subscriber (`npc-lifecycle.module.ts:77-81`).
- `TURN_ADVANCED` chỉ có subscriber, **không có publisher** (`faction-politics.module.ts:38`,
  `ecology-logistics.module.ts:45`).

**Tác động:** partial month commit, report không khớp state, retry không phục hồi.

**Hướng sửa:** một orchestrator duy nhất, world modules chạy trong cùng transaction/savepoint; guard lưu
trong DB theo `(campaignId, turn)`, set sau commit.

### P1-7. Thể lực bị trừ hai tầng

- Social: `DailyInteractionEngine` áp `fatigueDelta` (`daily-interaction.engine.ts:777-792`); client sau đó
  gọi `apiSpendActionTime('KIZUNA_INTERACT')` cộng thêm `+5` (`app.js:656-659`, `action-policy.js:18`).
- Work: `EnterpriseLaborService.performLaborShift` cộng `12–20` (`enterprise-labor.service.ts:1125-1134`);
  `enterprise-ui.js:908-911` gọi thêm `WORK_SHIFT` +12.
- `action-policy` server có `fatigue`, nhưng client `ACTION_DAY_COSTS` chỉ có ngày, nên UI không thấy phần
  thể lực bị trừ lần hai.

**Tác động:** người chơi bị khóa thể lực sớm, nhất là ca làm và yến tiệc.

**Hướng sửa:** chỉ server action/service được trừ thể lực; client chỉ hiển thị cost. Hoặc ngược lại, bỏ
fatigue khỏi service và để time-manager làm nguồn duy nhất.

### P1-8. Sổ cái có nhiều định nghĩa balance

- `sim-core._getLastBalance()` lấy balance cuối ledger, trừ từ `liquid_cash`
  (`sim-core.js:43-46`, dùng ở `:232-233,330-331,485,530,585`).
- `economy.controller` định nghĩa balance = `liquid + safe` (`economy.controller.ts:261-263`).
- `workshop-engine` ghi đè `player_state.safe_cash` bằng safe cash của business
  (`workshop-engine.js:307-308`).
- Chart of accounts không thống nhất: `6001_OPERATING_EXPENSE`/`1001_CASH_MOBILE` vs
  `EXP-OPERATING`/`CASH-ON-HAND`; status `POSTED` vs `Confirmed`.
- Nhiều nơi tự `INSERT INTO cashflow_ledger` thay vì dùng `recordFinancialTransaction`.

**Tác động:** running balance sai dần; audit/golden có thể không bắt vì mỗi module nhìn một nghĩa.

**Hướng sửa:** một ledger writer duy nhất, một định nghĩa balance, một chart of accounts.

### P1-9. Hai UI Hub/Journal tranh nhau global

- `grand-command-hub-ui.js` export hub 7 tab (`:2305`), có `enterprise/caravan/duel/tavern` (`:358-370`).
- `personal-journal-ui.js` load sau và gán `window.GrandCommandHubUI = PersonalJournalUI` (`:944`).
- `PersonalJournalUI` chỉ có 4 tab `career/gear/family/chronicle` (`:202-216`).
- Static HTML cũng chỉ có 4 tab.

**Tác động:** các tab enterprise/caravan/duel/tavern của hub không thể mở qua `GrandCommandHubUI.open(...)`;
code 7 tab gần như không được gọi. Hai router tab và hai bộ render career/gear/family cùng tồn tại.

**Hướng sửa:** chọn một owner. Nếu giữ journal 4 tab, xóa phần 7 tab không dùng và các nút gọi nó; nếu giữ
hub 7 tab, bỏ override.

### P1-10. Bản đồ có 4 nguồn dữ liệu

- `map-data.js`: `WORLD_MAP_NODES` (`:368`), `WORLD_MAP_ROUTES` 24 tuyến (`:1352`), resolver theo substring
  (`:1426`), `SETTLEMENT_LABELS` (`:1456`).
- `spatial-registry.ts`: `NODE_TO_LOC_MAP` (`:9`), `NODE_COORDINATES` trùng toạ độ (`:46`).
- `map-live.service.ts`: `SETTLEMENT_ALIASES` (`:80`), `labelToNode`/`locToMapNode` (`:408-424`).
- DB: `master_locations` 23 settlements và `master_routes`, expose qua `/api/locations`
  (`military.controller.ts:218`) và `/api/military/routes`.
- `world-map.js` còn fallback route array riêng (`:723`).

**Tác động:** 20 node render vs 23 settlement; alias `he_fei`, `pu_yang`, `wu_ling` không có label tĩnh nên
route/live intel bị bỏ; sửa toạ độ/tên phải sửa 3-4 nơi.

**Hướng sửa:** DB là nguồn duy nhất; client chỉ giữ một alias map; xóa fallback routes/coords.

## 4. Các lỗi P2/P3 đáng chú ý

### P2-11. Bảng chi phí client/server trùng
`public/js/config.js:31-55` có `ACTION_DAY_COSTS` chỉ ngày; `engine/action-policy.js:7-30` có cả ngày + thể lực.
`/api/time/clock` đã trả `policy`, nhưng UI vẫn dùng bảng local. Mọi thay đổi policy có thể lệch UI/enforcement.

### P2-12. Ngày cứng và kinh tế tin ngày client
- Payload còn gửi `game_date: '184-05-02'`: `modals.js:141`, `app.js:1097`, `spatial-poi-modals.js:379`,
  `world-map.js:1776`.
- `economy.controller.ts:250` dùng `gameDate || meta.currentDate`, nên trade qua `/api/trade` có thể ghi lùi ngày.
- `daily-interaction.engine.ts:885` hardcode `184-05-02` vào `npc_relationship_deltas`.
- `SimulationCore` đã normalize cho `/api/action`, nhưng các đường khác chưa.

### P2-13. Hai trade modal, hai payload
`public/index.html:467` (`trade-modal`, legacy `modals.js:135`) vs `standard-trade-modal`
(`trade-quick.modal.ts:17,87`). TS gửi `{action,item,qty,price}`, legacy gửi
`{type,item_code,quantity,unit_price,counterparty,game_date,idempotency_key}`. `deck.js:32-33` vẫn gọi legacy
`openQuickTrade`; TS modal có bridge nhưng ít/không được dùng.

### P2-14. Event bus có dây chết
- `TURN_ADVANCED`: chỉ subscriber, không publisher.
- `LOD1_WEEKLY_TICK`: chỉ publisher, không subscriber.
- `AUTUMN_HARVEST_CYCLE`: chỉ publisher, không subscriber.
- `WORLD_DAY_TICK`: publisher nằm trong `advanceDays` không route; subscriber military rỗng.

### P2-15. Báo cáo/task render trùng
`turn-advance.js:176-231` (month report) và `:453-487` (time panel) có hai đoạn render task/action gần giống;
`TURN_ACTION_LABELS` dùng chung nhưng escape/i18n khác nhau.

### P3-16. Nhiều date helper và fallback khác nhau
`date-utils.js`, `time-manager.js`, `gameplay-manager.js`, `sim-core._dateOrdinal`, migration ordinal,
`economy.oneYearLater`, `single-combat-duel` date read. Fallback "hôm nay" khác nhau: `184-05-01`,
`184-05-02`, `184-02-01`.

### P3-17. Lương/giá trùng
- `JOB_FORGE_HAND` trả 75 (`enterprise-labor.service.ts:163-167`) nhưng `SHIFT_FORGE_HAND` trả 140
  (`:968-1077`, `wage-labor.constants.ts:40-41`, UI `grand-command-hub-ui.js:963`).
- Giá có 4 nguồn: `rules.js` index, `master_items` + regional market, `market-elasticity`, giá cứng workshop.

## 5. Ma trận "một tính năng, mấy nguồn sự thật"

| Tính năng | Nguồn hiện tại | Nguồn nên có |
|---|---|---|
| Ngày/giờ | time-manager, gameplay advanceDays, date-utils, game-clock, economy | một `GameClock` |
| Chi phí hành động | action-policy server, config client, từng service | một `ActionPolicy` server trả qua API |
| Thể lực | time-manager, sim-core, kizuna, enterprise, travel, client stamina | một `StaminaPolicy` |
| Caravan | ecology module, caravan service, advanceDays | một `CaravanService` |
| Sản nghiệp tháng | gameplay inline, workshop engine, accrueProfits | một `BusinessSimulationService` |
| Sổ cái | sim-core, economy, workshop, event, caravan, shared | một `recordFinancialTransaction` |
| Bản đồ | map-data, spatial-registry, map-live, DB | DB `master_locations/routes` |
| Modal | static HTML, legacy JS, ModalShell | một owner cho mỗi ID |
| Hub/Journal | grand-command-hub, personal-journal, TS shells | một UI slice |
| Trade | `/api/action`, `/api/trade`, QuickTrade TS | một trade gateway |

## 6. Thứ tự sửa đề xuất

### Đợt 1 — chặn lỗi đang hoạt động (P0)
1. Chọn owner cho `spatial-tavern-modal`, `spatial-arena-modal`, `spatial-residence-modal`; thêm test body
   không rỗng.
2. Chuẩn hóa `marchDays` thành số nguyên và chỉ trừ grain một lần.
3. Cho `time-manager` phát `WORLD_DAY_TICK` hoặc gọi duy nhất `advanceDays`.
4. Bỏ double fatigue ở client time-spend cho Kizuna/Work.

### Đợt 2 — dữ liệu (P1)
5. Một `GameClock`/`DateService` duy nhất.
6. Một `CaravanService`, một status enum, một settlement.
7. Một `BusinessSimulationService` idempotent theo `(businessId, month)`.
8. World modules chạy trong cùng transaction; guard lưu DB.
9. Một ledger writer/balance/chart of accounts.

### Đợt 3 — UI và dọn dẹp (P2/P3)
10. Một modal owner cho mỗi ID; xóa wrapper legacy hoặc xóa TS shell.
11. Chọn Hub 7 tab hoặc Journal 4 tab, xóa phần còn lại.
12. Map lấy DB làm nguồn duy nhất.
13. Xóa event/endpoint/catalog chết; dùng `/api/time/clock.policy` thay `ACTION_DAY_COSTS`.

## 7. Test/invariant nên thêm

1. Mở tất cả modal ID: mỗi modal có đúng một `.modal-body`, body không rỗng sau render.
2. `advanceActionTime(days)` chỉ nhận số nguyên; ngày luôn khớp regex `^\d{3}-\d{2}-\d{2}$`.
3. Một action chỉ tạo đúng một ledger row và một `game_date` bằng `campaign_meta.current_date`.
4. `WORLD_DAY_TICK` phát đúng số ngày, đúng một lần mỗi ngày.
5. Caravan: một tháng chỉ một lần settlement; status chuyển một chiều.
6. Business: `runMonth` gọi hai lần cùng `(businessId, month)` không đổi số dư.
7. Map: mọi settlement trong DB đều resolve được node hoặc có alias tường minh.
8. Không còn `184-05-02` trong payload client.

## 8. Điểm tích cực

- `SimulationCore` vẫn giữ double-entry và idempotency; test core action/reproducibility xanh.
- `npm run verify` hiện xanh 21/21 suite, 28/28 contract, 8/8 write smoke.
- Arch guard đã chặn SQL interpolation, silent catch, unquoted `current_date`.
- Các feature slice TS có ranh giới khá rõ; vấn đề chính là **ownership** giữa legacy và TS, không phải thiếu kiến trúc.

## 9. Kết luận

Đây không phải lỗi "code xấu" đơn thuần. Đây là các **ranh giới sở hữu bị chồng**: hai modal cùng ID, hai
đồng hồ cùng ngày, hai caravan cùng status, ba công thức cùng business, nhiều writer cùng ledger. Chỉ cần
một nơi ghi sai là các báo cáo và số dư phía sau sai dây chuyền.

Ưu tiên tuyệt đối là Đợt 1: sửa modal POI, chặn ngày lẻ/trừ lương hai lần, phát day tick, bỏ double fatigue.
Sau đó mới nên làm migration lớn về GameClock/Caravan/Business/Ledger.

## 10. Trạng thái xử lý (cập nhật cuối ngày 29/10/2026)

Đợt 1 đã xong, mỗi mục đều có test/invariant hồi quy trong `tests/verify-logic-ownership.ts`:

| # | Trạng thái | Bằng chứng sau sửa |
|---|---|---|
| 1 Modal POI | ✅ Đã sửa | Bundle không còn `SpatialPoiModalsManager`; shell từ chối id legacy; `ensure*ModalDom` dựng lại body. DOM repro: body tavern 2.215 ký tự, arena 2.742, residence 1.485. |
| 2 Ngày lẻ / lương hai lần | ✅ Đã sửa | `completeMarch` tự tiến đồng hồ và chỉ trừ grain route một lần; `ceil` ngày; E2E `1.4` ngày → `185-01-03 → 185-01-05`, grain 9.56 → 7.56, 2 tick. |
| 3 Day tick | ✅ Đã sửa | `time-manager` là writer duy nhất của `current_date` và phát `WORLD_DAY_TICK` mỗi ngày; `advanceDays()` gọi cùng helper; 7 ngày → 7 tick. |
| 4 Double fatigue | ✅ Đã sửa | `KIZUNA_INTERACT`, `WORK_SHIFT`, `PRODUCTION_BATCH` = 0 fatigue trong `action-policy`; service sở hữu hiệu ứng thể lực. |
| 5 Equip/unequip | ✅ Đã sửa | Cả hai đường dùng `consumeInventoryItem`/`restoreInventoryItem`; smoke `equip conserves inventory` + `unequip restores inventory` xanh. |
| 8 Đồng hồ chiến dịch | ✅ Đã siết | Auditor bắt buộc `YYYY-MM-DD` ngày nguyên, tháng 1–12/ngày 1–30, và `active_turn` khớp `turn_log`. Live DB: `185-01-03` / turn 14. |
| 9 Sổ cái nhiều định nghĩa | ✅ Đã gộp (đường người chơi) | Một định nghĩa `balance = liquid + safe` (`src/shared/ledger.ts`); sửa `collectProfits` và `military.module` (trước đó lấy balance cũ → cộng đôi safe); workshop không còn ghi `cashflow_ledger`/`player_state.safe_cash` cho dòng tiền nội bộ doanh nghiệp. |
| 10 Caravan hai state machine | ✅ Đã sửa | `advanceByDays(days)` là implementation duy nhất, đồng hồ ngày và tháng đều gọi; caravan người chơi dừng ở `ARRIVED` và claim một lần, caravan phe phái quyết toán một lần vào treasury; claim `SUCCESS_TRADED`/caravan phe khác bị từ chối. Migration 007 (`dispatched_by_player`). |
| 11 Ba công thức sản nghiệp | ✅ Đã gộp | Key `BIZ_CYCLE_<biz>_<YYYYMM>` dùng chung bởi workshop và `advanceTurn`; chạy hai lần cùng tháng chỉ trả một lần; workshop không ghi đè `player_state.safe_cash`. |
| 12 World sim ngoài transaction | ✅ Đã siết | `world_turn_ledger` (campaign, turn, module) set **sau** khi module commit; mỗi module chạy trong một transaction; module lỗi → `advanceTurn` throw trước khi chốt tháng, retry an toàn. |
| 13 Hub/Journal tranh global | ✅ Đã chọn owner | `personal-journal-ui.js` (4 tab, khớp static markup + test) sở hữu `#grand-command-hub-modal`; `grand-command-hub-ui.js` (7 tab) đã xoá khỏi repo (1.6.1). |
| 14 Bản đồ 4 nguồn dữ liệu | ⏳ Còn | Chưa lấy DB làm nguồn duy nhất. |
| 15–17 P2/P3 | ✅ Gần xong (1.6.1) | Bỏ 4 payload `game_date`; `/api/trade` dùng clock server; `npc_relationship_deltas` dùng ngày chiến dịch; client đọc `policy`; gỡ event chết. Thêm: `postCashflowEntry` + 5 writer chuyển sang (ratchet `cashflow-direct-insert` còn 18), `time-manager` dùng `date-utils`, du hành seeded (hết `Math.random`), equip gộp về forge, ca làm dùng `CANONICAL_LABOR_SHIFTS`, trade UI một owner. Còn: 18 INSERT cashflow, 2 bộ mã tài khoản, 4 nguồn giá, map DB-only. |

Ghi chú phát hiện thêm: `GET /api/audit` trước đây bị cho là chỉ trả 270 invariant, nhưng ở HEAD cả HTTP
lẫn CLI cùng gọi 8 hàm audit và cùng trả **1.358** — con số 270 đã lỗi thời. `chat_chronicle` 39 dòng/15 văn
bản sau migration 006; trigger chặn mọi lần chèn trùng y hệt.

Cổng hiện tại: `npm run verify` 22/22 suite, 28/28 contract, 8/8 write smoke; `npm run audit` 1.358
invariant, 0 lệch. E2E caravan trên server sandbox: dispatch → `tick-progress` (1 ngày/lần, có phát tick) →
`ARRIVED` sau 2 ngày → claim 105 Qian một lần → claim lần hai và claim caravan phe phái đều bị từ chối.

