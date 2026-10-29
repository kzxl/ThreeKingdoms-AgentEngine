/**
 * TURN ADVANCEMENT & MONTHLY WORLD PROGRESSION MODULE
 * (public/js/turn-advance.js)
 *
 * Implements Turn Advance dialog, confirms progression to next calendar month,
 * triggers autonomous living world cycles (NPCs, Politics, Logistics, Business),
 * and presents the Monthly World Dispatch report.
 */

let activeTurnAdvanceResult = null;

function getTurnAdvanceContent() {
  let content = document.getElementById('turn-advance-content');
  if (content) return content;

  const body = document.getElementById('turn-advance-modal-body');
  if (!body) return null;

  content = document.createElement('div');
  content.id = 'turn-advance-content';
  content.className = 'turn-advance-content';
  body.classList.add('turn-advance-shell-body');
  body.appendChild(content);
  return content;
}

function openTurnAdvanceModalShell() {
  if (window.TurnAdvanceUI && typeof window.TurnAdvanceUI.openLegacy === 'function') {
    window.TurnAdvanceUI.openLegacy();
    return true;
  }
  const modal = document.getElementById('turn-advance-modal');
  if (!modal) return false;
  modal.classList.remove('hidden');
  return true;
}

function closeTurnAdvanceModalShell() {
  if (window.TurnAdvanceUI && typeof window.TurnAdvanceUI.closeLegacy === 'function') {
    window.TurnAdvanceUI.closeLegacy();
  }
  const modal = document.getElementById('turn-advance-modal');
  if (modal) modal.classList.add('hidden');
}

async function openTurnAdvanceModal() {
  const modal = document.getElementById('turn-advance-modal');
  if (!modal) {
    console.error('turn-advance-modal not found');
    return;
  }

  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  activeTurnAdvanceResult = null;

  openTurnAdvanceModalShell();
  getTurnAdvanceContent();
  renderTurnAdvanceConfirm();
}

function closeTurnAdvanceModal() {
  closeTurnAdvanceModalShell();
}

function renderTurnAdvanceConfirm() {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const container = getTurnAdvanceContent();
  if (!container) return;

  // Read current date chip or cache
  const dateChipEl = document.getElementById('top-date-chip');
  const rawText = dateChipEl ? dateChipEl.innerText : '184-05-02 (Lượt 6)';

  container.innerHTML = `
    <div class="turn-adv-confirm-box">
      <div class="turn-adv-header-icon">${uiIcon('hourglass')}</div>
      <h3 class="turn-adv-title">${isEn ? 'Close the Month & Advance the Calendar' : 'Kết Thúc Tháng & Chuyển Sang Tháng Mới'}</h3>
      <p class="turn-adv-subtitle">
        ${isEn 
          ? 'Advancing to the next strategic turn will simulate 1 full calendar month of living world events, enterprise cycles, and NPC actions across the realm.'
          : 'Kết thúc tháng hiện tại sẽ thúc đẩy bánh xe thời gian tiến thêm 1 tháng, kích hoạt mô phỏng thế giới sống động, thu chi sản nghiệp và hoạt động tự chủ của quần hùng khắp các châu quận.'}
      </p>

      <div class="turn-adv-changes-grid">
        <div class="turn-adv-card">
          <div class="turn-adv-card-icon">${uiIcon('calendar')}</div>
          <div class="turn-adv-card-title">${isEn ? 'Time Step (+1 Month)' : 'Thời Gian (+1 Tháng)'}</div>
          <div class="turn-adv-card-desc">${isEn ? 'World advances to next calendar month; seasonal prices update.' : 'Tiến trình lịch pháp chuyển sang tháng tiếp theo, giá thị trường biến động theo mùa.'}</div>
        </div>
        <div class="turn-adv-card">
          <div class="turn-adv-card-icon">${uiIcon('sprout')}</div>
          <div class="turn-adv-card-title">${isEn ? 'Stamina Recovery' : 'Hồi Phục Sinh Lực'}</div>
          <div class="turn-adv-card-desc">${isEn ? 'Recover +35 fatigue; morale stabilizes to optimal level.' : 'Hồi phục +35 điểm mệt mỏi; sĩ khí bản thân hồi phục trạng thái sung mãn.'}</div>
        </div>
        <div class="turn-adv-card">
          <div class="turn-adv-card-icon">${uiIcon('coin')}</div>
          <div class="turn-adv-card-title">${isEn ? 'Enterprise Operations' : 'Vận Hành Sản Nghiệp'}</div>
          <div class="turn-adv-card-desc">${isEn ? 'Workshops generate revenue; staff monthly wages disbursed from safe cash.' : 'Xưởng chức tác kết toán doanh thu, tự động thanh toán lương gia nhân từ két sắt.'}</div>
        </div>
        <div class="turn-adv-card">
          <div class="turn-adv-card-icon">${uiIcon('users')}</div>
          <div class="turn-adv-card-title">${isEn ? 'Living World Simulation' : 'Quần Hùng Tự Chủ'}</div>
          <div class="turn-adv-card-desc">${isEn ? 'Autonomous NPC training, faction politics, and regional logistic shifts.' : 'Các danh tướng rèn luyện võ nghệ, triều đình bổ nhiệm quan viên, nghĩa quân cơ động.'}</div>
        </div>
      </div>

      <div class="turn-adv-action-bar">
        <button class="btn btn-outline" onclick="closeTurnAdvanceModal()">
          ${isEn ? 'Return to Current Turn' : 'Quay Lại'}
        </button>
        <button class="btn btn-primary font-bold turn-adv-btn-exec" onclick="submitExecuteAdvanceTurn()">
          <span>${uiIcon('hourglass')} ${isEn ? 'Confirm Next Month' : 'Xác Nhận Qua Tháng'}</span>
        </button>
      </div>
    </div>
  `;
}

async function submitExecuteAdvanceTurn() {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const container = getTurnAdvanceContent();
  if (!container) return;

  container.innerHTML = `
    <div class="turn-adv-loading">
      <div class="turn-adv-spinner"></div>
      <h4>${isEn ? 'Simulating Living World Progression...' : 'Đang mô phỏng chuyển biến thế cuộc tháng mới...'}</h4>
      <p>${isEn ? 'Calculating workshop dividends, NPC career shifts, and faction politics across the Three Kingdoms...' : 'Đang tính toán lợi nhuận sản nghiệp, lương bổng gia nhân và diễn biến chính trị các châu...'}</p>
    </div>
  `;

  try {
    const result = await apiAdvanceTurn();
    activeTurnAdvanceResult = result;
    renderTurnAdvanceReport(result);

    // Refresh Background Status & Decks
    await Promise.all([
      loadStatus(),
      loadDeckInventory(),
      loadDeckNpcs(),
      loadDeckLedger()
    ]);

    // Refresh Chat Chronicle
    if (typeof loadChatHistory === 'function') loadChatHistory();

    // Let the map and other live surfaces refresh their campaign state.
    window.dispatchEvent(new CustomEvent('sim:turn-advanced', { detail: result }));

    showToast(isEn ? `Welcome to Turn ${result.nextTurn} (${result.nextDate})!` : `Đã chuyển sang Lượt ${result.nextTurn} (Ngày ${result.nextDate})!`);

  } catch (err) {
    console.error('Turn advance failed:', err);
    // The month close is transactional: the server rolled back, so the only
    // safe action is to show the failing module and let the player retry.
    renderTurnAdvanceError(err);
  }
}

function renderTurnAdvanceError(err) {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const container = getTurnAdvanceContent();
  if (!container) return;
  const message = String(err && err.message ? err.message : err || '');
  container.innerHTML = `
    <div class="turn-adv-card" role="alert">
      <div class="turn-adv-card-icon">${uiIcon('alert')}</div>
      <div class="turn-adv-card-title">${isEn ? 'Month Close Failed' : 'Chốt Tháng Thất Bại'}</div>
      <div class="turn-adv-card-desc">
        ${isEn
          ? 'The world simulation did not commit. No cash, stock or calendar change was saved; retrying is safe.'
          : 'Mô phỏng thế cuộc chưa ghi nhận. Tiền, kho và lịch chưa đổi; thử lại là an toàn.'}
      </div>
      <pre class="turn-adv-error-detail">${message.replace(/</g, '&lt;')}</pre>
      <div class="turn-adv-action-bar">
        <button class="btn btn-outline" onclick="closeTurnAdvanceModal()">
          ${isEn ? 'Close' : 'Đóng'}
        </button>
        <button class="btn btn-primary font-bold" onclick="submitExecuteAdvanceTurn()">
          ${isEn ? 'Retry Month Close' : 'Thử Lại Chốt Tháng'}
        </button>
      </div>
    </div>
  `;
}

const TURN_ACTION_LABELS = {
  TRADE_BUY: { vi: 'Thu mua vật tư', en: 'Procurement' },
  TRADE_SELL: { vi: 'Bán hàng hóa', en: 'Sale' },
  PRODUCTION_BATCH: { vi: 'Sản xuất lô hàng', en: 'Production batch' },
  PAY_WAGES: { vi: 'Chi trả lương', en: 'Wage payment' },
  RECORD_BOUNTY: { vi: 'Ghi nhận chiến lợi phẩm', en: 'Bounty recorded' },
  REWARD_NPC: { vi: 'Thưởng gia nhân', en: 'Retainer reward' },
  MOVE_LOCATION: { vi: 'Di chuyển', en: 'Travel' },
  PERSONAL_GROWTH: { vi: 'Tu dưỡng bản thân', en: 'Self-cultivation' },
  KIZUNA_INTERACT: { vi: 'Giao lưu hào kiệt', en: 'Social interaction' }
};

function turnReportEmpty(isEn, vi, en) {
  return `<div class="turn-rpt-empty">${isEn ? en : vi}</div>`;
}

function renderTurnAdvanceReport(res) {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const container = getTurnAdvanceContent();
  if (!container) return;

  const bizList = Array.isArray(res.bizReports) ? res.bizReports : [];
  const polList = Array.isArray(res.politicalEvents) ? res.politicalEvents : [];
  const npcList = Array.isArray(res.npcLogs) ? res.npcLogs : [];
  const actionList = Array.isArray(res.recentActions) ? res.recentActions : [];
  const crisisList = Array.isArray(res.activeCrises) ? res.activeCrises : [];
  const taskList = Array.isArray(res.activeTasks) ? res.activeTasks : [];
  const ecoEvents = Array.isArray(res.ecologyEvents)
    ? res.ecologyEvents
    : (Array.isArray(res.ecologyResults?.events) ? res.ecologyResults.events : []);
  const digest = res.worldDigest || {};
  const finance = res.financeSummary || { inflow: 0, outflow: 0, net: 0 };
  const status = res.playerStatus || {};
  const eco = res.ecologyResults || {};

  const bizHtml = bizList.length > 0 ? bizList.map(b => {
    const method = b.settlementMethod === 'WORKSHOP'
      ? (isEn ? 'Workshop cycle' : 'Xưởng tự vận hành')
      : (isEn ? 'Passive accrual' : 'Doanh thu thụ động');
    return `
    <div class="turn-rpt-item">
      <div class="turn-rpt-item-title">${uiIcon('coin')} ${b.businessName} <span class="turn-rpt-chip">${method}</span></div>
      <div class="turn-rpt-item-meta">
        <span>${isEn ? 'Gross:' : 'Tổng thu:'} <strong class="gold-text">+${b.grossIncome}</strong> Quan</span>
        <span>${isEn ? 'Wages:' : 'Lương:'} <strong class="danger-text">-${b.totalWages}</strong> Quan (${b.staffCount} ${isEn ? 'staff' : 'thợ'})</span>
        <span>${isEn ? 'Net:' : 'Lợi nhuận:'} <strong class="${b.netProfit >= 0 ? 'green-text' : 'danger-text'} font-bold">${b.netProfit >= 0 ? '+' : ''}${b.netProfit} Quan</strong></span>
      </div>
    </div>
  `;
  }).join('') : turnReportEmpty(isEn, 'Chưa có sản nghiệp xưởng thợ trực thuộc.', 'No family workshops established yet.');

  const actionHtml = actionList.length > 0 ? actionList.map(a => {
    const label = TURN_ACTION_LABELS[a.actionType] || { vi: a.actionType, en: a.actionType };
    return `
      <div class="turn-rpt-timeline-item">
        <span class="turn-rpt-chip">${a.gameDate || ''}</span>
        <div>
          <div class="turn-rpt-item-title">${isEn ? label.en : label.vi}${a.memo ? ` • ${a.memo}` : ''}</div>
          <div class="turn-rpt-item-meta">${a.status || 'SUCCESS'}</div>
        </div>
      </div>
    `;
  }).join('') : turnReportEmpty(isEn, 'Chưa ghi nhận thao tác nào trong tháng này.', 'No player actions recorded this month.');

  const taskHtml = taskList.length > 0 ? taskList.map(task => {
    const pct = Math.round((Number(task.progress) || 0) * 100);
    const title = isEn ? (task.title_en || task.title_vi) : task.title_vi;
    return `
      <div class="turn-rpt-item">
        <div class="turn-rpt-item-title">${uiIcon('hourglass')} ${title}</div>
        <div class="turn-rpt-item-meta">
          <span>${task.elapsed_days}/${task.duration_days} ${isEn ? 'days' : 'ngày'}</span>
          <span>${pct}%</span>
        </div>
        <div class="turn-rpt-task-progress"><span style="width:${pct}%"></span></div>
      </div>
    `;
  }).join('') : turnReportEmpty(isEn, 'Không có công việc dài ngày đang chạy.', 'No multi-day tasks in progress.');

  const polHtml = polList.length > 0 ? polList.map(p => `
    <div class="turn-rpt-item">
      <div class="turn-rpt-item-title">${uiIcon('scroll')} ${p.titleVi || p.title || (isEn ? 'Political event' : 'Biến động chính trị')}</div>
      <div class="turn-rpt-item-meta">${p.narrativeVi || p.narrative || p.description || ''}</div>
    </div>
  `).join('') : turnReportEmpty(isEn, 'Không có biến động chính trị nổi bật.', 'No major political developments.');

  const npcHtml = npcList.length > 0 ? npcList.map(n => `
    <div class="turn-rpt-item">
      <div class="turn-rpt-item-title">${uiIcon('users')} ${n.titleVi || n.action || n.text || n.npcId || 'Hào Kiệt'}</div>
      <div class="turn-rpt-item-meta">${n.narrativeVi || n.narrative || ''}</div>
    </div>
  `).join('') : turnReportEmpty(isEn, 'Quần hùng không có hoạt động nổi bật.', 'No notable hero activity.');

  const caravanHtml = (() => {
    const entries = Object.entries(res.caravanStatus || {});
    if (entries.length === 0) return turnReportEmpty(isEn, 'Không có thương đoàn đang vận hành.', 'No caravans in operation.');
    return entries.map(([statusKey, value]) => `
      <div class="turn-rpt-stat-row">
        <span>${statusKey}</span>
        <span>${value.count} ${isEn ? 'caravans' : 'đoàn'} • ${value.cargoValue} Quan</span>
      </div>
    `).join('');
  })();

  const ecoHtml = ecoEvents.length > 0 ? ecoEvents.map(text => `
    <div class="turn-rpt-item">
      <div class="turn-rpt-item-title">${uiIcon('grain')} ${text}</div>
    </div>
  `).join('') : turnReportEmpty(isEn, 'Mùa vụ và tuyến thương mại ổn định.', 'Season and trade routes stable.');

  const crisisHtml = crisisList.length > 0 ? crisisList.map(c => `
    <div class="turn-rpt-item">
      <div class="turn-rpt-item-title">${uiIcon('alert')} ${c.title_vi || c.crisis_type}</div>
      <div class="turn-rpt-item-meta">${c.narrative_vi || ''} • ${isEn ? 'remaining' : 'còn'} ${c.duration_turns_left} ${isEn ? 'turns' : 'lượt'}</div>
    </div>
  `).join('') : turnReportEmpty(isEn, 'Không có khủng hoảng sinh thái đang hoạt động.', 'No active ecological crises.');

  const kpiHtml = [
    ['calendar', isEn ? 'Player actions' : 'Thao tác', digest.playerActions ?? actionList.length],
    ['coin', isEn ? 'Businesses' : 'Sản nghiệp', digest.businesses ?? bizList.length],
    ['users', isEn ? 'Hero activities' : 'Hào kiệt', digest.npcActivities ?? npcList.length],
    ['scroll', isEn ? 'Political events' : 'Chính trị', digest.politicalEvents ?? polList.length],
    ['grain', isEn ? 'Ecology events' : 'Sinh thái', digest.ecologyEvents ?? ecoEvents.length],
    ['alert', isEn ? 'Active crises' : 'Khủng hoảng', digest.activeCrises ?? crisisList.length]
  ].map(([icon, label, value]) => `
    <div class="turn-rpt-kpi">
      <span class="turn-rpt-kpi-label">${uiIcon(icon)} ${label}</span>
      <strong class="turn-rpt-kpi-value">${value}</strong>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="turn-adv-report-box">
      <div class="turn-rpt-header">
        <div>
          <span class="turn-rpt-badge font-mono">${isEn ? 'MONTHLY WORLD DISPATCH' : 'BÁO CÁO THẾ CUỘC THÁNG MỚI'}</span>
          <h3 class="turn-rpt-title">${res.turnTitle || `Lượt ${res.nextTurn}`}</h3>
          <span class="turn-rpt-date font-mono">${res.prevDate} → <strong>${res.nextDate}</strong> (Lượt ${res.nextTurn})</span>
        </div>
      </div>
      <p class="turn-rpt-summary">${res.turnSummary || ''}</p>
      <div class="turn-rpt-kpi-grid">${kpiHtml}</div>

      <div class="turn-rpt-sections-grid">
        <div class="turn-rpt-card">
          <div class="turn-rpt-card-hdr">
            ${uiIcon('person')}
            <span class="title">${isEn ? 'Personal Status & Cash Flow' : 'Trạng Thái Cá Nhân & Dòng Tiền'}</span>
          </div>
          <div class="turn-rpt-card-body">
            <div class="turn-rpt-stat-row">
              <span>${isEn ? 'Fatigue recovered:' : 'Mệt mỏi hồi phục:'}</span>
              <strong class="green-text">+${res.recoveredFatigue || 0} → ${status.fatigue ?? '—'}/100</strong>
            </div>
            <div class="turn-rpt-stat-row">
              <span>${isEn ? 'Morale / Health:' : 'Sĩ khí / Sinh lực:'}</span>
              <strong class="amber-text">${status.morale ?? '—'}% / ${status.health ?? '—'}</strong>
            </div>
            <div class="turn-rpt-stat-row">
              <span>${isEn ? 'Location:' : 'Vị trí:'}</span>
              <span>${res.playerLocationName || activeSubLocation || '—'}</span>
            </div>
            <div class="turn-rpt-stat-row">
              <span>${isEn ? 'Skipped days / grain upkeep:' : 'Ngày bỏ qua / hao lương:'}</span>
              <strong class="${res.grainMissing ? 'danger-text' : 'amber-text'}">${res.skippedDays || 0} • -${Number(res.grainCost || 0).toFixed(2)} ${isEn ? 'piculs' : 'Thạch'}</strong>
            </div>
            <div class="turn-rpt-stat-row">
              <span>${isEn ? 'Cash in / out:' : 'Thu / Chi:'}</span>
              <strong class="${finance.net >= 0 ? 'green-text' : 'danger-text'}">+${finance.inflow} / -${finance.outflow} Quan</strong>
            </div>
          </div>
        </div>

        <div class="turn-rpt-card">
          <div class="turn-rpt-card-hdr">
            ${uiIcon('coin')}
            <span class="title">${isEn ? 'Commercial & Workshop Ledger' : 'Vận Hành Sản Nghiệp & Xưởng Thợ'}</span>
          </div>
          <div class="turn-rpt-card-body">${bizHtml}</div>
        </div>

        <div class="turn-rpt-card full-width">
          <div class="turn-rpt-card-hdr">
            ${uiIcon('calendar')}
            <span class="title">${isEn ? 'What You Did This Month' : 'Những Việc Bạn Đã Làm Trong Tháng'}</span>
          </div>
          <div class="turn-rpt-card-body turn-rpt-timeline">${actionHtml}</div>
        </div>

        <div class="turn-rpt-card full-width">
          <div class="turn-rpt-card-hdr">
            ${uiIcon('hourglass')}
            <span class="title">${isEn ? 'Multi-day Tasks' : 'Công Việc Dài Ngày'}</span>
          </div>
          <div class="turn-rpt-card-body">${taskHtml}</div>
        </div>

        <div class="turn-rpt-card full-width">
          <div class="turn-rpt-card-hdr">
            ${uiIcon('users')}
            <span class="title">${isEn ? 'Autonomous Heroes & Retainers' : 'Quần Hùng Thiên Hạ & Gia Nhân Tự Chủ'}</span>
          </div>
          <div class="turn-rpt-card-body">${npcHtml}</div>
        </div>

        <div class="turn-rpt-card full-width">
          <div class="turn-rpt-card-hdr">
            ${uiIcon('scroll')}
            <span class="title">${isEn ? 'Dynastic Politics & Court Events' : 'Chính Trường & Biến Động Triều Đình'}</span>
          </div>
          <div class="turn-rpt-card-body">${polHtml}</div>
        </div>

        <div class="turn-rpt-card">
          <div class="turn-rpt-card-hdr">
            ${uiIcon('grain')}
            <span class="title">${isEn ? 'Ecology & Caravans' : 'Sinh Thái & Thương Đoàn'}</span>
          </div>
          <div class="turn-rpt-card-body">
            <div class="turn-rpt-stat-row">
              <span>${isEn ? 'Caravans processed:' : 'Thương đoàn xử lý:'}</span>
              <strong>${eco.processedCaravans ?? 0}</strong>
            </div>
            ${caravanHtml}
            ${ecoHtml}
          </div>
        </div>

        <div class="turn-rpt-card">
          <div class="turn-rpt-card-hdr">
            ${uiIcon('alert')}
            <span class="title">${isEn ? 'Active Crises' : 'Khủng Hoảng Đang Hoạt Động'}</span>
          </div>
          <div class="turn-rpt-card-body">${crisisHtml}</div>
        </div>
      </div>

      <div class="turn-adv-action-bar">
        <button class="btn btn-primary font-bold turn-adv-btn-exec" onclick="finishTurnAdvance()">
          <span>${uiIcon('hourglass')} ${isEn ? `Enter Turn ${res.nextTurn}` : `Bắt Đầu Lượt ${res.nextTurn}`} →</span>
        </button>
      </div>
    </div>
  `;
}

function finishTurnAdvance() {
  closeTurnAdvanceModal();
}

// ---------------------------------------------------------------------------
// Time panel: campaign calendar, day budget, tasks and real-world comparison.
// ---------------------------------------------------------------------------
let timePanelTimer = null;

function escapeTimeText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRealDateTime(date = new Date()) {
  try {
    return date.toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'medium' });
  } catch (err) {
    return date.toISOString();
  }
}

function startTimePanelClock() {
  if (timePanelTimer) clearInterval(timePanelTimer);
  const tick = () => {
    const el = document.getElementById('time-real-clock');
    if (el) el.innerText = formatRealDateTime(new Date());
  };
  tick();
  timePanelTimer = setInterval(tick, 1000);
}

function stopTimePanelClock() {
  if (timePanelTimer) {
    clearInterval(timePanelTimer);
    timePanelTimer = null;
  }
}

async function openTimePanel() {
  const modal = document.getElementById('time-panel-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  await renderTimePanel();
  startTimePanelClock();
}

function closeTimePanel() {
  const modal = document.getElementById('time-panel-modal');
  if (modal) modal.classList.add('hidden');
  stopTimePanelClock();
}

async function renderTimePanel() {
  const container = document.getElementById('time-panel-content');
  if (!container) return;
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

  if (typeof apiFetchClock !== 'function') {
    container.innerHTML = `<div class="turn-rpt-empty">${isEn ? 'Clock API unavailable.' : 'Không tải được API thời gian.'}</div>`;
    return;
  }

  try {
    const data = await apiFetchClock();
    const clock = data.clock || {};
    const tasks = (data.tasks || []).filter(task => task.status === 'IN_PROGRESS');
    const recent = Array.isArray(data.recentActions) ? data.recentActions : [];
    const policy = data.policy || {};
    if (typeof setActionPolicy === 'function') setActionPolicy(policy);
    const dayPct = Math.max(0, Math.min(100, (Number(clock.dayOfMonth || 1) / Number(clock.daysPerMonth || 30)) * 100));

    const taskHtml = tasks.length > 0 ? tasks.map(task => {
      const elapsed = Number(task.elapsed_days || 0);
      const duration = Number(task.duration_days || 1);
      const pct = Math.round((elapsed / Math.max(1, duration)) * 100);
      const title = isEn ? (task.title_en || task.title_vi) : task.title_vi;
      return `
        <div class="turn-rpt-item">
          <div class="turn-rpt-item-title">${uiIcon('hourglass')} ${escapeTimeText(title)}</div>
          <div class="turn-rpt-item-meta">
            <span>${elapsed}/${duration} ${isEn ? 'days' : 'ngày'}</span>
            <span>${pct}%</span>
          </div>
          <div class="turn-rpt-task-progress"><span style="width:${pct}%"></span></div>
        </div>
      `;
    }).join('') : `<div class="turn-rpt-empty">${isEn ? 'No multi-day tasks.' : 'Không có công việc dài ngày.'}</div>`;

    const actionRows = [
      ['TRADE_BUY', isEn ? 'Market transaction' : 'Giao dịch chợ'],
      ['PERSONAL_GROWTH', isEn ? 'Training / rest' : 'Luyện tập / nghỉ'],
      ['KIZUNA_INTERACT', isEn ? 'Social interaction' : 'Giao lưu'],
      ['WORK_SHIFT', isEn ? 'Work shift' : 'Ca làm việc'],
      ['MOVE_LOCATION', isEn ? 'Local travel' : 'Di chuyển'],
      ['ENTERPRISE_MANAGE', isEn ? 'Enterprise / caravan' : 'Sản nghiệp / thương đoàn'],
      ['START_TASK', isEn ? 'Start long task' : 'Khởi công task']
    ].map(([type, label]) => {
      const cost = policy[type] || { days: 1, fatigue: 0 };
      return `
        <div class="turn-rpt-stat-row">
          <span>${label}</span>
          <strong>${cost.days} ${isEn ? 'day(s)' : 'ngày'} • ${cost.fatigue > 0 ? `-${cost.fatigue}` : '0'} ${isEn ? 'fatigue' : 'thể lực'}</strong>
        </div>
      `;
    }).join('');

    const recentHtml = recent.length > 0 ? recent.map(item => {
      const label = TURN_ACTION_LABELS[item.actionType] || { vi: item.actionType, en: item.actionType };
      return `
        <div class="time-timeline-row">
          <span class="turn-rpt-chip">${escapeTimeText(item.gameDate || '')}</span>
          <span class="time-timeline-title">${escapeTimeText(isEn ? label.en : label.vi)}${item.memo ? ` • ${escapeTimeText(item.memo)}` : ''}</span>
          <span class="time-timeline-real">${escapeTimeText(item.createdAt || '')}</span>
        </div>
      `;
    }).join('') : `<div class="turn-rpt-empty">${isEn ? 'No recorded actions yet.' : 'Chưa có thao tác nào được ghi nhận.'}</div>`;

    container.innerHTML = `
      <div class="time-hero">
        <div class="time-hero-date font-mono">${escapeTimeText(clock.currentDate || '—')}</div>
        <div class="time-hero-meta">
          ${isEn ? 'Day' : 'Ngày'} ${clock.dayOfMonth || 1}/${clock.daysPerMonth || 30} •
          ${isEn ? 'Turn' : 'Lượt'} ${clock.activeTurn || 1} •
          ${isEn ? 'Season' : 'Mùa'} ${escapeTimeText(clock.season || '—')}
        </div>
        <div class="time-progress"><span style="width:${dayPct}%"></span></div>
        <div class="time-progress-labels">
          <span>${isEn ? 'Day 1' : 'Ngày 1'}</span>
          <span>${isEn ? `${clock.daysLeft || 0} days left` : `Còn ${clock.daysLeft || 0} ngày`}</span>
          <span>${isEn ? 'Day 30' : 'Ngày 30'}</span>
        </div>
      </div>

      <div class="time-stat-grid">
        <div class="turn-rpt-kpi"><span class="turn-rpt-kpi-label">${uiIcon('sprout')} ${isEn ? 'Fatigue' : 'Thể lực'}</span><strong class="turn-rpt-kpi-value">${clock.fatigue ?? 0}/100</strong></div>
        <div class="turn-rpt-kpi"><span class="turn-rpt-kpi-label">${uiIcon('grain')} ${isEn ? 'Grain' : 'Lương thảo'}</span><strong class="turn-rpt-kpi-value">${Number(clock.grain || 0).toFixed(2)}</strong></div>
        <div class="turn-rpt-kpi"><span class="turn-rpt-kpi-label">${uiIcon('shield')} ${isEn ? 'Health / Morale' : 'Sinh lực / Sĩ khí'}</span><strong class="turn-rpt-kpi-value">${clock.health ?? 100} / ${clock.morale ?? 100}</strong></div>
        <div class="turn-rpt-kpi"><span class="turn-rpt-kpi-label">${uiIcon('hourglass')} ${isEn ? 'Active tasks' : 'Task đang chạy'}</span><strong class="turn-rpt-kpi-value">${tasks.length}</strong></div>
      </div>

      <div class="time-compare-grid">
        <div class="turn-rpt-card">
          <div class="turn-rpt-card-hdr">${uiIcon('calendar')}<span class="title">${isEn ? 'Real-World Comparison' : 'Đối Chiếu Thực Tế'}</span></div>
          <div class="turn-rpt-card-body">
            <div class="time-real-date" id="time-real-clock">${formatRealDateTime()}</div>
            <div class="turn-rpt-item-meta">${isEn ? '1 game day = 1 calendar day; a month is 30 game days. Only “Next Month” closes the month.' : '1 ngày game = 1 ngày lịch; tháng game 30 ngày. Chỉ “Qua Tháng” mới chốt tháng.'}</div>
            <div class="turn-rpt-stat-row"><span>${isEn ? 'Timezone' : 'Múi giờ'}</span><strong>UTC${(data.real?.timezoneOffsetMinutes || 0) <= 0 ? '+' : '-'}${Math.abs((data.real?.timezoneOffsetMinutes || 0) / 60)}</strong></div>
          </div>
        </div>
        <div class="turn-rpt-card">
          <div class="turn-rpt-card-hdr">${uiIcon('hourglass')}<span class="title">${isEn ? 'Action Time Budget' : 'Ngân Sách Hành Động'}</span></div>
          <div class="turn-rpt-card-body">${actionRows}</div>
        </div>
      </div>

      <div class="turn-rpt-card">
        <div class="turn-rpt-card-hdr">${uiIcon('hourglass')}<span class="title">${isEn ? 'Multi-day Tasks' : 'Công Việc Dài Ngày'}</span></div>
        <div class="turn-rpt-card-body">${taskHtml}</div>
      </div>

      <div class="turn-rpt-card">
        <div class="turn-rpt-card-hdr">${uiIcon('scroll')}<span class="title">${isEn ? 'Recent Time Log' : 'Dòng Thời Gian Gần Đây'}</span></div>
        <div class="turn-rpt-card-body">${recentHtml}</div>
      </div>

      <div class="turn-adv-action-bar">
        <button class="btn btn-outline" onclick="closeTimePanel()">${isEn ? 'Close' : 'Đóng'}</button>
        <button class="btn btn-primary font-bold" onclick="closeTimePanel(); openTurnAdvanceModal();">
          ${uiIcon('hourglass')} ${isEn ? 'Next Month' : 'Qua Tháng'}
        </button>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="turn-rpt-empty">${escapeTimeText(err.message)}</div>`;
  }
}

// Global exposure
window.openTimePanel = openTimePanel;
window.closeTimePanel = closeTimePanel;
window.renderTimePanel = renderTimePanel;
window.openTurnAdvanceModal = openTurnAdvanceModal;
window.closeTurnAdvanceModal = closeTurnAdvanceModal;
window.submitExecuteAdvanceTurn = submitExecuteAdvanceTurn;
window.finishTurnAdvance = finishTurnAdvance;
