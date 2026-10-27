/**
 * MODALS & SYSTEM FEEDBACK MODULE
 * Quick Trade Modal, Anti-piling Action Locks, and Toast Notifications
 */

let isProcessingAction = false;

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.innerText = message;
  toast.style.borderColor = isError ? 'var(--state-danger)' : 'var(--border-gold)';
  toast.classList.remove('hidden');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

function setProcessingLock(busy, targetElement = null, statusText = '') {
  isProcessingAction = busy;

  // Disable / Enable interactive action buttons
  document.querySelectorAll('button:not(#btn-main-menu):not(#btn-toggle-logs):not(.deck-tab-btn)').forEach(btn => {
    btn.disabled = busy;
  });

  const omniInput = document.getElementById('omni-input');
  if (omniInput) omniInput.disabled = busy;

  if (targetElement) {
    targetElement.classList.toggle('executing', busy);
  }

  const chronicle = document.getElementById('story-chronicle');
  let indicator = document.getElementById('story-computing-indicator');

  if (busy && statusText) {
    if (!indicator && chronicle) {
      indicator = document.createElement('div');
      indicator.id = 'story-computing-indicator';
      indicator.className = 'story-turn system';
      indicator.innerHTML = `
        <div class="story-turn-avatar">🤖</div>
        <div class="story-turn-content" style="padding: 6px 10px; font-size: 11px; color: #34d399;">
          <span class="pulse-dot"></span> Agent Core đang phân tích chiến thuật & đối soát SQLite: <em>"${statusText}"</em>...
        </div>
      `;
      chronicle.appendChild(indicator);
      chronicle.scrollTop = chronicle.scrollHeight;
    }
  } else {
    if (indicator) indicator.remove();
  }
}

function openQuickTrade(mode, itemCode, defaultQty, defaultPrice) {
  if (isProcessingAction) {
    showToast('⚠️ Đang thực thi điều lệnh, vui lòng chờ!', true);
    return;
  }

  const modal = document.getElementById('trade-modal');
  if (!modal) return;

  const modeEl = document.getElementById('modal-trade-mode');
  const codeEl = document.getElementById('modal-item-code');
  const qtyEl = document.getElementById('modal-qty');
  const priceEl = document.getElementById('modal-price');
  const titleEl = document.getElementById('trade-modal-title');
  const submitBtn = document.getElementById('modal-submit-btn');

  if (modeEl) modeEl.value = mode;
  if (codeEl) codeEl.value = itemCode;
  if (qtyEl) qtyEl.value = defaultQty;
  if (priceEl) priceEl.value = defaultPrice;

  const isSell = mode === 'SELL';
  if (titleEl) titleEl.innerText = isSell ? `Bán Hàng: ${itemCode}` : `Mua Thêm: ${itemCode}`;
  if (submitBtn) submitBtn.innerText = isSell ? `Xác Nhận Xuất Bán` : `Xác Nhận Mua Hàng`;

  calcTradeTotal();
  modal.classList.remove('hidden');
}

function closeTradeModal() {
  const modal = document.getElementById('trade-modal');
  if (modal) modal.classList.add('hidden');
}

function calcTradeTotal() {
  const qty = parseFloat(document.getElementById('modal-qty')?.value) || 0;
  const price = parseFloat(document.getElementById('modal-price')?.value) || 0;
  const total = Math.round(qty * price);
  const totalEl = document.getElementById('modal-total-amt');
  if (totalEl) totalEl.innerText = `${total.toLocaleString()} Tiền`;
}

async function submitModalTrade() {
  if (isProcessingAction) return;

  const mode = document.getElementById('modal-trade-mode')?.value;
  const itemCode = document.getElementById('modal-item-code')?.value;
  const qty = parseFloat(document.getElementById('modal-qty')?.value);
  const price = parseInt(document.getElementById('modal-price')?.value, 10);
  const counterparty = document.getElementById('modal-counterparty')?.value.trim() || 'Thương đoàn Ký Châu';

  if (!itemCode || qty <= 0 || price <= 0) {
    showToast('Vui lòng nhập số lượng và đơn giá hợp lệ!', true);
    return;
  }

  closeTradeModal();

  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: mode === 'SELL' ? 'Xuất Bán Hàng Hóa' : 'Thu Mua Vật Tư',
    avatar: '梁',
    text: `${mode === 'SELL' ? 'Xuất bán' : 'Thu mua'} **${qty} ${itemCode}** với đối tác **${counterparty}** theo giá **${price} Tiền/đơn vị** (Tổng: ${(qty * price).toLocaleString()} Tiền).`
  });

  setProcessingLock(true, null, `${mode === 'SELL' ? 'Xuất bán' : 'Thu mua'} ${qty} ${itemCode}`);

  const payload = {
    type: mode === 'SELL' ? 'TRADE_SELL' : 'TRADE_BUY',
    item_code: itemCode,
    quantity: qty,
    unit_price: price,
    counterparty,
    game_date: '184-05-02',
    idempotency_key: `MODAL_${mode}_${itemCode}_${Date.now()}`
  };

  try {
    if (typeof dispatchDirectAction === 'function') {
      await dispatchDirectAction(payload);
    } else {
      await apiDispatchAction(payload);
    }

    const totalAmt = qty * price;
    const deltaCash = mode === 'SELL' ? `+${totalAmt} Qian` : `-${totalAmt} Qian`;
    const deltaStock = mode === 'SELL' ? `-${qty} ${itemCode}` : `+${qty} ${itemCode}`;

    appendStoryTurn({
      type: 'system',
      speaker: 'Thương Nghiệp Lương Gia',
      title: 'Hoàn Tất Giao Dịch Sổ Cái',
      avatar: '📦',
      text: `Giao dịch thương nghiệp đã giao nhận thành công. Hàng hóa và dòng tiền được đối soát tự động trong cơ sở dữ liệu SQLite.`,
      deltas: { cash: deltaCash, inventory: deltaStock, audit: '70/70 Khớp' },
      reasoning: `Hoàn tất giao dịch thương nghiệp ${mode} cho ${itemCode}.`
    });

    renderAgentSimulationFeedback(`Hoàn tất giao dịch thương nghiệp ${mode} cho ${itemCode}.`, { cash: deltaCash, inventory: deltaStock, audit: '70/70 Khớp' });
    await Promise.all([loadStatus(), loadDeckInventory(), loadDeckLedger()]);
  } finally {
    setProcessingLock(false, null);
  }
}

// ==========================================================================
// GAMEPLAY PLAYTHROUGH & MASTER DATA MANAGER MODAL
// ==========================================================================

let currentGameSummary = null;
let activeGameModalTab = 'continue'; // 'continue' | 'new'

async function openGameManagerModal() {
  const modal = document.getElementById('game-manager-modal');
  if (!modal) return;

  try {
    const data = await apiFetchGameSummary();
    currentGameSummary = data;
    renderGameManagerModalContent(data);
    modal.classList.remove('hidden');
  } catch (err) {
    showToast(`Không thể tải thông tin màn chơi: ${err.message}`, true);
  }
}

function closeGameManagerModal() {
  const modal = document.getElementById('game-manager-modal');
  if (modal) modal.classList.add('hidden');
}

let cachedRotkEvents = [];

async function switchGameManagerTab(tabId) {
  activeGameModalTab = tabId;
  document.querySelectorAll('.gm-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.gm-tab-content').forEach(c => c.classList.add('hidden'));

  const activeBtn = document.getElementById(`gm-tab-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active');

  const activeContent = document.getElementById(`gm-view-${tabId}`);
  if (activeContent) activeContent.classList.remove('hidden');

  if (tabId === 'chronicles' && cachedRotkEvents.length === 0) {
    await loadAndRenderRotkEvents();
  }
}

async function loadAndRenderRotkEvents() {
  const container = document.getElementById('gm-events-timeline-container');
  const badge = document.getElementById('gm-events-count-badge');
  if (container) container.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;">Đang nạp dữ liệu biên niên sử từ Master Database...</div>';
  
  try {
    const res = await fetch('/api/game/events');
    const json = await res.json();
    if (json.success && json.events) {
      cachedRotkEvents = json.events;
      renderRotkEvents(cachedRotkEvents);
    } else {
      throw new Error(json.error || 'Lỗi tải sự kiện');
    }
  } catch (err) {
    if (container) container.innerHTML = `<div style="padding:20px;text-align:center;color:#ef4444;">Không thể tải sự kiện: ${err.message}</div>`;
  }
}

function renderRotkEvents(events) {
  const container = document.getElementById('gm-events-timeline-container');
  const badge = document.getElementById('gm-events-count-badge');
  if (!container) return;

  if (badge) {
    badge.innerText = `Hiển thị ${events.length} / ${cachedRotkEvents.length} thiên sự kiện ROTK`;
  }

  if (events.length === 0) {
    container.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8;">Không tìm thấy sự kiện phù hợp với bộ lọc.</div>';
    return;
  }

  const seasonMap = {
    'SPRING': 'Mùa Xuân',
    'SUMMER': 'Mùa Hạ',
    'AUTUMN': 'Mùa Thu',
    'WINTER': 'Mùa Đông'
  };

  container.innerHTML = events.map(ev => {
    let effectsStr = '';
    try {
      const eff = JSON.parse(ev.gameplay_effects || '{}');
      const effParts = [];
      if (eff.sentiment_boost) effParts.push(`Hảo cảm +${eff.sentiment_boost}`);
      if (eff.rep_gain) effParts.push(`Danh vọng +${eff.rep_gain}`);
      if (eff.exp) effParts.push(`Chiến công +${eff.exp}`);
      if (eff.item_reward) effParts.push(`Bảo vật: ${eff.item_reward}`);
      if (eff.arrows_acquired) effParts.push(`Mũi tên: +${eff.arrows_acquired.toLocaleString()}`);
      if (eff.treasury_boost) effParts.push(`Ngân khố +${eff.treasury_boost.toLocaleString()} Tiền`);
      if (effParts.length > 0) effectsStr = effParts.join(' • ');
    } catch (e) {}

    return `
      <div class="gm-event-card">
        <div class="gm-event-header">
          <div class="gm-event-title">📜 ${ev.name_vi}</div>
          <span class="gm-event-badge">${ev.historical_year} SCN • ${seasonMap[ev.season] || ev.season}</span>
        </div>
        <div class="gm-event-sub">${ev.name_en}</div>
        <div class="gm-event-summary">${ev.summary_vi}</div>
        <div class="gm-event-meta">
          <div class="gm-event-meta-item">📍 Địa điểm: <strong>${ev.location_id || 'Trung Nguyên'}</strong></div>
          <div class="gm-event-meta-item">👤 Nhân vật chính: <strong>${ev.primary_character_id || 'Chư Hầu'}</strong></div>
          ${effectsStr ? `<div class="gm-event-meta-item" style="color:#fbbf24;">⚡ Thưởng/Hiệu ứng: <strong>${effectsStr}</strong></div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function filterRotkEvents() {
  const query = (document.getElementById('gm-event-search')?.value || '').toLowerCase().trim();
  const era = document.getElementById('gm-event-era-filter')?.value || 'ALL';

  let filtered = cachedRotkEvents.filter(ev => {
    // Era filter
    if (era !== 'ALL') {
      const [start, end] = era.split('-').map(Number);
      if (ev.historical_year < start || ev.historical_year > end) return false;
    }

    // Query filter
    if (query) {
      const matchNameVi = (ev.name_vi || '').toLowerCase().includes(query);
      const matchNameEn = (ev.name_en || '').toLowerCase().includes(query);
      const matchSummary = (ev.summary_vi || '').toLowerCase().includes(query);
      const matchLoc = (ev.location_id || '').toLowerCase().includes(query);
      const matchChar = (ev.primary_character_id || '').toLowerCase().includes(query);
      if (!matchNameVi && !matchNameEn && !matchSummary && !matchLoc && !matchChar) {
        return false;
      }
    }
    return true;
  });

  renderRotkEvents(filtered);
}

function renderGameManagerModalContent(data) {
  const summary = data.summary || {};
  const scenarios = data.scenarios || [];
  const archetypes = data.archetypes || [];

  // 1. Continue Tab Render
  const statusContainer = document.getElementById('gm-continue-status');
  if (statusContainer) {
    if (summary.canContinue) {
      statusContainer.innerHTML = `
        <div class="gm-session-card">
          <div class="gm-card-header">
            <div>
              <div class="gm-card-title">${summary.campaignName || 'Chiến Dịch Đại Hán'}</div>
              <div class="gm-card-subtitle">Mã: ${summary.campaignId} • Ngày ${summary.currentDate}</div>
            </div>
            <span class="badge-audit">Lượt ${summary.activeTurn || 1}</span>
          </div>
          <div class="gm-stat-grid">
            <div class="gm-stat-item">
              <span class="label">Chủ Công:</span>
              <span class="val">${summary.playerName} (${summary.playerStyle || 'Tự'})</span>
            </div>
            <div class="gm-stat-item">
              <span class="label">Vị Trí Hiện Tại:</span>
              <span class="val">📍 ${summary.location || 'Huyện Trác'}</span>
            </div>
            <div class="gm-stat-item">
              <span class="label">Tiền Mặt:</span>
              <span class="val font-mono">🪙 ${(summary.liquidCash || 0).toLocaleString()} Tiền</span>
            </div>
            <div class="gm-stat-item">
              <span class="label">Lương Thảo:</span>
              <span class="val font-mono">🌾 ${Number(summary.strategicGrain || 0).toFixed(1)} Thạch</span>
            </div>
          </div>
          <div class="gm-actions-row">
            <button class="btn-primary" onclick="closeGameManagerModal(); showToast('Tiếp tục chiến dịch!')">
              ⚔️ Tiếp Tục Màn Chơi Này
            </button>
            <button class="btn-outline" onclick="submitSaveSlot('slot_manual')">
              💾 Lưu Slot Dự Phòng
            </button>
          </div>
        </div>
      `;
    } else {
      statusContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted);">
          Chưa có phiên chơi nào đang lưu trữ. Hãy bấm tab "Tạo Màn Chơi Mới" để bắt đầu!
        </div>
      `;
    }
  }

  // 2. New Game Tab Render (Scenarios & Archetypes)
  const scnContainer = document.getElementById('gm-scenario-selector');
  if (scnContainer) {
    scnContainer.innerHTML = scenarios.map((s, i) => `
      <label class="gm-scenario-card ${i === 0 ? 'selected' : ''}" onclick="selectGameScenario('${s.scenario_id}', this)">
        <input type="radio" name="gm_scenario" value="${s.scenario_id}" ${i === 0 ? 'checked' : ''} style="display:none">
        <div class="title">${s.name_vi}</div>
        <div class="epoch">${s.historical_epoch}</div>
        <div class="desc">${s.description_vi}</div>
      </label>
    `).join('');
  }

  const archContainer = document.getElementById('gm-archetype-selector');
  if (archContainer) {
    archContainer.innerHTML = archetypes.map((a, i) => `
      <label class="gm-archetype-card ${i === 0 ? 'selected' : ''}" onclick="selectGameArchetype('${a.archetype_id}', this)">
        <input type="radio" name="gm_archetype" value="${a.archetype_id}" ${i === 0 ? 'checked' : ''} style="display:none">
        <div class="name">${a.name_vi}</div>
        <div class="attrs">INT ${a.int_attr} • WAR ${a.war_attr} • COM ${a.com_attr} • CRA ${a.cra_attr}</div>
        <div class="desc">${a.bio_vi}</div>
      </label>
    `).join('');
  }
}

function selectGameScenario(id, el) {
  document.querySelectorAll('.gm-scenario-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const radio = el.querySelector('input');
  if (radio) radio.checked = true;
}

function selectGameArchetype(id, el) {
  document.querySelectorAll('.gm-archetype-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const radio = el.querySelector('input');
  if (radio) radio.checked = true;
}

async function submitStartNewGame() {
  const scnEl = document.querySelector('input[name="gm_scenario"]:checked');
  const archEl = document.querySelector('input[name="gm_archetype"]:checked');
  const nameEl = document.getElementById('gm-custom-player-name');

  const scenarioId = scnEl ? scnEl.value : 'SCN-184-ZHOU';
  const archetypeId = archEl ? archEl.value : 'ARCH-SCHOLAR-ARTISAN';
  const customPlayerName = nameEl && nameEl.value.trim() ? nameEl.value.trim() : null;

  const msg = currentLang === 'en'
    ? 'Are you sure you want to start a New Game? This will reset active session tables using the Master Blueprint templates.'
    : 'Bạn có chắc chắn muốn Khởi Tạo Màn Chơi Mới? Dữ liệu lượt chơi hiện tại sẽ được làm mới từ Master Blueprint gốc.';

  if (!window.confirm(msg)) return;

  try {
    showToast('Đang khởi tạo Màn Chơi Mới từ Master Database...');
    const res = await apiStartNewGame({
      scenarioId,
      archetypeId,
      customPlayerName
    });

    if (res.success) {
      if (typeof clearStoryChronicle === 'function') {
        localStorage.removeItem('sim_story_chronicle');
        localStorage.removeItem('sim_active_subloc');
        localStorage.removeItem('sim_last_encounter_subloc');
      }
      closeGameManagerModal();
      showToast('Khởi tạo Tân Du Hý thành công! Đang tải lại dữ liệu...');
      await loadAllData();
    }
  } catch (err) {
    showToast(`Không thể tạo game mới: ${err.message}`, true);
  }
}

async function submitSaveSlot(slotName = 'slot_manual') {
  try {
    showToast(`Đang lưu bản ghi vào slot "${slotName}"...`);
    const res = await apiSaveSlot(slotName);
    if (res.success) {
      showToast(`Đã lưu slot "${slotName}" thành công!`);
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    showToast(`Lưu slot thất bại: ${err.message}`, true);
  }
}

async function submitLoadSlot(slotName = 'slot_manual') {
  const msg = currentLang === 'en'
    ? `Restore playthrough from "${slotName}"?`
    : `Khôi phục màn chơi từ bản lưu "${slotName}"?`;
  if (!window.confirm(msg)) return;

  try {
    showToast(`Đang tải slot "${slotName}"...`);
    const res = await apiLoadSlot(slotName);
    if (res.success) {
      closeGameManagerModal();
      showToast(`Đã phục hồi màn chơi thành công!`);
      await loadAllData();
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    showToast(`Không thể tải slot: ${err.message}`, true);
  }
}

// Global exposure
window.isProcessingAction = isProcessingAction;
window.showToast = showToast;
window.setProcessingLock = setProcessingLock;
window.openQuickTrade = openQuickTrade;
window.closeTradeModal = closeTradeModal;
window.calcTradeTotal = calcTradeTotal;
window.submitModalTrade = submitModalTrade;
window.openGameManagerModal = openGameManagerModal;
window.closeGameManagerModal = closeGameManagerModal;
window.switchGameManagerTab = switchGameManagerTab;
window.selectGameScenario = selectGameScenario;
window.selectGameArchetype = selectGameArchetype;
window.submitStartNewGame = submitStartNewGame;
window.submitSaveSlot = submitSaveSlot;
window.submitLoadSlot = submitLoadSlot;
window.filterRotkEvents = filterRotkEvents;
