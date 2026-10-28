/**
 * MODALS & SYSTEM FEEDBACK MODULE
 * Quick Trade Modal, Anti-piling Action Locks, and Toast Notifications
 */

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
        <div class="story-turn-avatar">Cơ</div>
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
    showToast('Đang thực thi điều lệnh, vui lòng chờ!', true);
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
      avatar: 'Hóa',
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

  if (tabId === 'npc-life') {
    await loadAndRenderNpcLife();
  }

  if (tabId === 'factions') {
    await loadAndRenderFactions();
  }

  if (tabId === 'professions') {
    await loadAndRenderProfessions();
  }

  if (tabId === 'ecology') {
    await loadAndRenderEcology();
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

    let actionBtn = '';
    if (ev.sessionStatus === 'RESOLVED') {
      const isAlt = ev.outcomeType === 'ALTERNATE';
      actionBtn = `<span class="event-choice-badge ${isAlt ? 'alternate' : 'canon'}">Đã Tham Gia (${isAlt ? 'Dị Bản What-If' : 'Chính Sử'})</span>`;
    } else if (ev.isLocal) {
      actionBtn = `<button class="btn-select-choice" onclick="openEventParticipationModal('${ev.event_id}')">Tham Gia Ngay</button>`;
    }

    return `
      <div class="gm-event-card">
        <div class="gm-event-header">
          <div class="gm-event-title">${ev.name_vi}</div>
          <div style="display:flex;align-items:center;gap:6px;">
            ${actionBtn}
            <span class="gm-event-badge">${ev.historical_year} SCN • ${seasonMap[ev.season] || ev.season}</span>
          </div>
        </div>
        <div class="gm-event-sub">${ev.name_en}</div>
        <div class="gm-event-summary">${ev.summary_vi}</div>
        <div class="gm-event-meta">
          <div class="gm-event-meta-item">Địa bàn: <strong>${ev.location_id || 'Trung Nguyên'}</strong></div>
          <div class="gm-event-meta-item">Nhân vật chính: <strong>${ev.primary_character_id || 'Chư Hầu'}</strong></div>
          ${effectsStr ? `<div class="gm-event-meta-item" style="color:#fbbf24;">Thưởng/Hiệu ứng: <strong>${effectsStr}</strong></div>` : ''}
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
              <span class="val">${summary.location || 'Huyện Trác'}</span>
            </div>
            <div class="gm-stat-item">
              <span class="label">Tiền Mặt:</span>
              <span class="val font-mono">${(summary.liquidCash || 0).toLocaleString()} Tiền</span>
            </div>
            <div class="gm-stat-item">
              <span class="label">Lương Thảo:</span>
              <span class="val font-mono">${Number(summary.strategicGrain || 0).toFixed(1)} Thạch</span>
            </div>
          </div>
          <div class="gm-actions-row">
            <button class="btn-primary" onclick="closeGameManagerModal(); showToast('Tiếp tục chiến dịch!')">
              Tiếp Tục Màn Chơi Này
            </button>
            <button class="btn-outline" onclick="submitSaveSlot('slot_manual')">
              Lưu Bản Sao Dự Phòng
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

let currentActiveLocalEvent = null;

async function checkAndRenderActiveEventBanner() {
  const banner = document.getElementById('historical-event-banner');
  if (!banner) return;

  try {
    const data = await apiFetchActiveEvents();
    if (!data.success || !data.events) {
      banner.classList.add('hidden');
      return;
    }

    // Find local event that has not yet been resolved
    const localActive = data.events.find(e => e.isLocal && !e.isResolved);
    if (localActive) {
      currentActiveLocalEvent = localActive;
      const titleEl = document.getElementById('event-banner-title');
      const descEl = document.getElementById('event-banner-desc');
      if (titleEl) titleEl.innerText = `${localActive.name_vi} (${localActive.historical_year} SCN)`;
      if (descEl) descEl.innerText = localActive.summary_vi;
      banner.classList.remove('hidden');
    } else {
      currentActiveLocalEvent = null;
      banner.classList.add('hidden');
    }
  } catch (err) {
    banner.classList.add('hidden');
  }
}

function openEventParticipationModal(eventId = null) {
  let targetEvent = currentActiveLocalEvent;
  if (eventId && cachedRotkEvents.length > 0) {
    const found = cachedRotkEvents.find(e => e.event_id === eventId);
    if (found) targetEvent = found;
  }

  if (!targetEvent) {
    showToast('Không có biến cố lịch sử khả dụng tại địa bàn hiện tại.', true);
    return;
  }

  const modal = document.getElementById('event-participation-modal');
  if (!modal) return;

  document.getElementById('ep-modal-title').innerText = `Biến Cố Lịch Sử: ${targetEvent.name_vi}`;
  document.getElementById('ep-modal-subtitle').innerText = `${targetEvent.historical_year} SCN • ${targetEvent.location_id || 'Trung Nguyên'} • ${targetEvent.name_en}`;
  document.getElementById('ep-modal-summary').innerText = targetEvent.summary_vi;
  
  const metaEl = document.getElementById('ep-modal-meta');
  if (metaEl) {
    metaEl.innerHTML = `
      <div>Địa bàn: <strong>${targetEvent.location_id || 'Trung Nguyên'}</strong></div>
      <div>Nhân vật then chốt: <strong>${targetEvent.primary_character_id || 'Chư Hầu'}</strong></div>
      <div>Diễn biến lịch sử: <em>${targetEvent.historical_outcome_vi || 'Đang diễn ra'}</em></div>
    `;
  }

  const choicesContainer = document.getElementById('ep-modal-choices');
  const resultBox = document.getElementById('ep-modal-result');
  if (resultBox) resultBox.classList.add('hidden');

  if (choicesContainer) {
    const choices = targetEvent.choices || [];
    if (choices.length === 0) {
      choicesContainer.innerHTML = '<div style="color:#94a3b8;padding:10px;">Không có quyết sách tương tác nào cho sự kiện này.</div>';
    } else {
      choicesContainer.innerHTML = choices.map(c => {
        let costStr = '';
        if (c.required_cost && c.required_cost.cash) {
          costStr += `Chi phí: <strong>${c.required_cost.cash.toLocaleString()} Tiền</strong> `;
        }
        if (c.required_stat) {
          const statKey = Object.keys(c.required_stat)[0];
          costStr += `Yêu cầu chỉ số: <strong>${statKey.toUpperCase()} ≥ ${c.required_stat[statKey]}</strong>`;
        }

        const isAlternate = c.outcome_type === 'ALTERNATE';
        const badgeClass = isAlternate ? 'alternate' : 'canon';
        const badgeText = isAlternate ? 'Dị Bản (What-If)' : 'Chính Sử (Canon)';

        return `
          <div class="event-choice-card">
            <div class="event-choice-header">
              <span class="event-choice-title">${c.title_vi}</span>
              <span class="event-choice-badge ${badgeClass}">${badgeText}</span>
            </div>
            <div class="event-choice-narrative">${c.narrative_vi}</div>
            <div class="event-choice-footer">
              <span class="event-choice-cost">${costStr || 'Không đòi hỏi tài nguyên'}</span>
              <button class="btn-select-choice" onclick="submitEventChoice('${targetEvent.event_id}', '${c.choice_id}')">
                Quyết Định Hành Động
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  modal.classList.remove('hidden');
}

function closeEventParticipationModal() {
  const modal = document.getElementById('event-participation-modal');
  if (modal) modal.classList.add('hidden');
}

async function submitEventChoice(eventId, choiceId) {
  try {
    showToast('Đang thực thi quyết sách lịch sử...');
    const result = await apiParticipateInEvent(eventId, choiceId);
    if (!result.success) throw new Error(result.error);

    const resultBox = document.getElementById('ep-modal-result');
    if (resultBox) {
      resultBox.innerHTML = `
        <div style="font-weight:700;margin-bottom:4px;color:#34d399;">ĐÃ HOÀN TẤT THAM GIA BIẾN CỐ LỊCH SỬ</div>
        <div style="margin-bottom:6px;"><strong>Quyết Sách:</strong> ${result.choiceTitleVi} (${result.outcomeType === 'ALTERNATE' ? 'Dị Bản What-If' : 'Chính Sử'})</div>
        <div style="margin-bottom:6px;">${result.resolutionNarrative}</div>
        <div style="font-size:11px;color:#94a3b8;">${result.netCashDelta !== 0 ? `Biến động ngân lượng: ${result.netCashDelta > 0 ? '+' : ''}${result.netCashDelta.toLocaleString()} Tiền (Đã hạch toán vào Sổ cái kép)` : 'Không thay đổi số dư tiền mặt.'}</div>
      `;
      resultBox.classList.remove('hidden');
    }

    showToast(`Đã tham gia sự kiện thành công!`);
    await checkAndRenderActiveEventBanner();
    if (typeof loadAllData === 'function') {
      await loadAllData();
    }
  } catch (err) {
    showToast(`Lỗi tham gia sự kiện: ${err.message}`, true);
  }
}

// 7. Living World NPC Progression & Chronicles Renderer
async function loadAndRenderNpcLife() {
  const grid = document.getElementById('gm-npc-progression-grid');
  const shiftsContainer = document.getElementById('gm-npc-career-shifts-container');
  const peersContainer = document.getElementById('gm-npc-peer-relations-container');
  const timeline = document.getElementById('gm-npc-journey-timeline');

  if (grid) grid.innerHTML = '<div style="color:#94a3b8; padding:10px;">Đang nạp dữ liệu chí hướng nhân vật...</div>';
  if (shiftsContainer) shiftsContainer.innerHTML = '<div style="color:#94a3b8; padding:10px;">Đang kiểm tra các bước ngoặt thân phận...</div>';
  if (peersContainer) peersContainer.innerHTML = '<div style="color:#94a3b8; padding:10px;">Đang nạp mạng lưới quan hệ chéo...</div>';
  if (timeline) timeline.innerHTML = '<div style="color:#94a3b8; padding:10px;">Đang nạp nhật ký hành trình...</div>';

  try {
    const [progRes, shiftsRes, peersRes, logsRes] = await Promise.all([
      apiFetchNpcProgression(),
      apiFetchCareerShifts(),
      apiFetchPeerRelations(),
      apiFetchNpcJourney(null, 30)
    ]);

    const progs = progRes.progressions || [];
    const shifts = shiftsRes.shifts || [];
    const peers = peersRes.relations || [];
    const logs = logsRes.logs || [];

    // 1. Render Progression Grid
    if (grid) {
      if (progs.length === 0) {
        grid.innerHTML = '<div style="color:#64748b;">Chưa có dữ liệu tiến trình tự thân. Hãy bấm nút Vận Hành để kích hoạt.</div>';
      } else {
        grid.innerHTML = progs.map(p => {
          const ambitionMap = {
            HEGEMON_UNIFIER: { label: 'Tranh Bá Đồ Vương', color: '#f59e0b' },
            RIGHTEOUS_VANGUARD: { label: 'Chiến Thần Cái Thế', color: '#ef4444' },
            LOYAL_BROTHERHOOD: { label: 'Vạn Nhân Địch', color: '#3b82f6' },
            MASTER_ARTISAN: { label: 'Thần Tượng Đúc Khí', color: '#10b981' },
            COMMERCE_TYCOON: { label: 'Phú Khả Địch Quốc', color: '#eab308' },
            DEVOTED_RETAINER: { label: 'Tận Tụy Chức Trách', color: '#8b5cf6' }
          };
          const amb = ambitionMap[p.life_ambition] || { label: p.life_ambition, color: '#94a3b8' };

          return `
            <div class="tactical-card">
              <div class="tactical-card-header">
                <div>
                  <h4 class="tactical-card-title">${p.npc_name}</h4>
                  <div class="tactical-card-subtitle" style="color:${amb.color}; font-weight:600;">${amb.label}</div>
                </div>
                <span class="tactical-badge">${p.milestone_title || 'Hào Hiệp'}</span>
              </div>
              <div class="tactical-narrative" style="font-style:italic;">
                Đang chú tâm: "${p.current_focus}"
              </div>
              <div class="tactical-stat-grid tactical-stat-grid--3col">
                <div class="tactical-stat-item">
                  <span class="tactical-stat-label">Tiền Riêng</span>
                  <span class="tactical-stat-val tactical-stat-val--gold">${(p.personal_cash || 0).toLocaleString()} Đ</span>
                </div>
                <div class="tactical-stat-item">
                  <span class="tactical-stat-label">Danh Vọng</span>
                  <span class="tactical-stat-val tactical-stat-val--blue">${p.prestige || 0}</span>
                </div>
                <div class="tactical-stat-item">
                  <span class="tactical-stat-label">Quân Tư</span>
                  <span class="tactical-stat-val tactical-stat-val--red">${p.personal_troops || 0}</span>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 2. Render Career Paradigm Shifts
    if (shiftsContainer) {
      if (shifts.length === 0) {
        shiftsContainer.innerHTML = '<div class="tactical-empty">Chưa có bước ngoặt thân phận nào diễn ra. Khi NPC đạt đủ danh vọng và tích lũy thực lực, họ sẽ đột phá thân phận.</div>';
      } else {
        shiftsContainer.innerHTML = shifts.map(s => `
          <div class="tactical-card tactical-card--accent">
            <div class="tactical-card-header">
              <div>
                <h4 class="tactical-card-title">${s.title_vi}</h4>
                <div class="tactical-card-subtitle">Đột Phá Thân Phận • Lượt ${s.turn_number}</div>
              </div>
              <span class="tactical-badge tactical-badge--primary">${s.old_tier} ➔ ${s.new_tier}</span>
            </div>
            <p class="tactical-narrative">${s.narrative_vi}</p>
          </div>
        `).join('');
      }
    }

    // 3. Render Cross-NPC Peer Relations
    if (peersContainer) {
      if (peers.length === 0) {
        peersContainer.innerHTML = '<div class="tactical-empty">Chưa có dữ liệu quan hệ chéo giữa các NPC.</div>';
      } else {
        peersContainer.innerHTML = peers.map(rel => {
          const typeBadgeMap = {
            SWORN_BROTHERS: { label: 'Sinh Tử Kết Nghĩa', badgeClass: 'tactical-badge--danger' },
            COMRADES: { label: 'Tri Kỷ Đồng Liêu', badgeClass: 'tactical-badge--info' },
            INTERNAL_RIVAL: { label: 'Đối Thủ Cạnh Tranh', badgeClass: 'tactical-badge--warning' },
            MASTER_DISCIPLE: { label: 'Sư Đồ Chân Truyền', badgeClass: 'tactical-badge--success' },
            DEBTOR_CREDITOR: { label: 'Ân Nghĩa Vay Mượn', badgeClass: 'tactical-badge--primary' }
          };
          const tb = typeBadgeMap[rel.relation_type] || { label: rel.relation_type, badgeClass: '' };

          let notes = '';
          try {
            const hist = JSON.parse(rel.interaction_history_json || '[]');
            if (hist.length > 0) notes = hist[hist.length - 1].notes || '';
          } catch (e) {}

          return `
            <div class="tactical-card">
              <div class="tactical-card-header">
                <h4 class="tactical-card-title">${rel.name_a} ⟷ ${rel.name_b}</h4>
                <span class="tactical-badge ${tb.badgeClass}">${tb.label}</span>
              </div>
              <div class="tactical-stat-grid">
                <div class="tactical-stat-item">
                  <span class="tactical-stat-label">Thiện Cảm</span>
                  <span class="tactical-stat-val ${rel.affinity >= 0 ? 'tactical-stat-val--green' : 'tactical-stat-val--red'}">${rel.affinity > 0 ? '+' : ''}${rel.affinity}</span>
                </div>
                <div class="tactical-stat-item">
                  <span class="tactical-stat-label">Tôn Kính</span>
                  <span class="tactical-stat-val tactical-stat-val--blue">${rel.respect}/100</span>
                </div>
              </div>
              ${notes ? `<div class="tactical-narrative" style="font-style:italic; border-top:1px dashed var(--border-subtle); padding-top:4px;">"${notes}"</div>` : ''}
            </div>
          `;
        }).join('');
      }
    }

    // 4. Render Journey Timeline
    if (timeline) {
      if (logs.length === 0) {
        timeline.innerHTML = '<div class="tactical-empty">Chưa có nhật ký hành trình. Bấm "Vận Hành 1 Lượt Tự Thân" để NPC bắt đầu chuỗi sự kiện.</div>';
      } else {
        timeline.innerHTML = logs.map(l => {
          const actionNames = {
            MARTIAL_DRILL: 'Khổ Luyện Võ Nghệ',
            STRATEGY_STUDY: 'Nghiên Cứu Binh Thư',
            COMMERCE_ARBITRAGE: 'Giao Thương Tích Lũy',
            BANDIT_EXPEDITION: 'Tiễu Phỉ Dẹp Cướp',
            BANQUET_NETWORKING: 'Hội Ngộ Bằng Hữu',
            CRAFT_BREAKTHROUGH: 'Đột Phá Kỹ Nghệ'
          };
          const actionLabel = actionNames[l.actionType] || l.actionType;

          let badgeHtml = '';
          if (l.statChanges && Object.keys(l.statChanges).length > 0) {
            badgeHtml = Object.entries(l.statChanges).map(([k, v]) => `
              <span style="font-size:11px; padding:2px 6px; border-radius:3px; background:rgba(34,197,94,0.15); color:#4ade80; border:1px solid rgba(34,197,94,0.3);">
                ${v}
              </span>
            `).join(' ');
          }

          return `
            <div class="event-card" style="border-left-color: #8b5cf6;">
              <div class="event-header">
                <span class="event-year-badge" style="background:#8b5cf6;">Lượt ${l.turnNumber} • ${l.gameDate}</span>
                <span class="event-loc-badge">${l.npcName}</span>
                <span style="font-size:12px; color:#cbd5e1; margin-left:auto;">${iconLabel}</span>
              </div>
              <h4 class="event-title" style="color:#c084fc;">${l.titleVi}</h4>
              <p class="event-narrative">${l.narrativeVi}</p>
              ${badgeHtml ? `<div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">${badgeHtml}</div>` : ''}
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('loadAndRenderNpcLife error:', err);
    if (grid) grid.innerHTML = `<div style="color:#ef4444;">Lỗi nạp tiến trình: ${err.message}</div>`;
  }
}

async function triggerSimulateNpcJourney() {
  try {
    showToast('Đang mô phỏng chu trình tăng trưởng tự thân của các hào kiệt...', false);
    const res = await apiSimulateNpcJourney();
    if (res.success) {
      showToast(`Hoàn tất! ${res.generatedLogsCount} nhân vật đã hoàn thành mục tiêu tháng.`, false);
      await loadAndRenderNpcLife();
    }
  } catch (err) {
    showToast(`Lỗi vận hành: ${err.message}`, true);
  }
}

// -------------------------------------------------------------
// Faction Politics & Dynastic Lineage Functions (Phase 1)
// -------------------------------------------------------------
async function loadAndRenderFactions() {
  const factionsContainer = document.getElementById('gm-factions-cards-container');
  const officersContainer = document.getElementById('gm-officers-tension-container');
  const settlementsContainer = document.getElementById('gm-settlements-container');
  const eventsTimeline = document.getElementById('gm-political-events-timeline');

  if (factionsContainer) {
    factionsContainer.innerHTML = '<div style="color:#94a3b8; padding:15px; text-align:center;">Đang tải danh sách thế lực cát cứ...</div>';
  }

  try {
    const [factionsRes, officersRes, settlementsRes, eventsRes] = await Promise.all([
      apiFetchFactions(),
      apiFetchFactionOfficers(),
      apiFetchSettlements(),
      apiFetchFactionEvents()
    ]);

    const factions = factionsRes.factions || [];
    const officers = officersRes.officers || [];
    const settlements = settlementsRes.settlements || [];
    const events = eventsRes.events || [];

    // 1. Render Factions Overview Cards
    if (factionsContainer) {
      if (factions.length === 0) {
        factionsContainer.innerHTML = '<div style="color:#94a3b8;">Chưa có dữ liệu thế lực.</div>';
      } else {
        const ideologyLabels = {
          ROYALIST: 'Phò Hán Tôn Thất',
          REBEL: 'Khăn Vàng Khởi Nghĩa',
          WARLORD: 'Quân Phiệt Cát Cứ',
          MERCHANT_GUILD: 'Thương Bang Nghiệp Hộ'
        };

        factionsContainer.innerHTML = factions.map(f => `
          <div class="tactical-card" style="border-top: 3px solid ${f.colorHex};">
            <div class="tactical-card-header">
              <div>
                <h4 class="tactical-card-title">${f.nameVi}</h4>
                <div class="tactical-card-subtitle">${f.nameEn}</div>
              </div>
              <span class="tactical-badge tactical-badge--primary">
                ${ideologyLabels[f.ideology] || f.ideology}
              </span>
            </div>

            <div class="tactical-stat-grid tactical-stat-grid--3col">
              <div class="tactical-stat-item"><span class="tactical-stat-label">Uy Thế</span><span class="tactical-stat-val tactical-stat-val--gold">${f.prestige}</span></div>
              <div class="tactical-stat-item"><span class="tactical-stat-label">Binh Lực</span><span class="tactical-stat-val tactical-stat-val--blue">${f.militaryPower?.toLocaleString()}</span></div>
              <div class="tactical-stat-item"><span class="tactical-stat-label">Quân Khố</span><span class="tactical-stat-val tactical-stat-val--green">${f.treasuryCash?.toLocaleString()} Đ</span></div>
              <div class="tactical-stat-item"><span class="tactical-stat-label">Lương Thảo</span><span class="tactical-stat-val tactical-stat-val--gold">${f.granaryGrain} Thạch</span></div>
              <div class="tactical-stat-item"><span class="tactical-stat-label">Thành Trì</span><span class="tactical-stat-val">${f.settlementCount || 0}</span></div>
              <div class="tactical-stat-item"><span class="tactical-stat-label">Tướng Soái</span><span class="tactical-stat-val tactical-stat-val--purple">${f.officerCount || 0}</span></div>
            </div>
          </div>
        `).join('');
      }
    }

    // 2. Render Officers Tension & Betrayal Risk
    if (officersContainer) {
      if (officers.length === 0) {
        officersContainer.innerHTML = '<div class="tactical-empty">Chưa có danh sách tướng lĩnh.</div>';
      } else {
        const rankLabels = {
          RULER: 'Chúa Công (Lãnh Tụ)',
          CHIEF_COMMANDER: 'Đại Đô Đốc',
          CHIEF_ADVISOR: 'Quân Sư',
          GOVERNOR: 'Thái Thú',
          GENERAL: 'Tiền Phong',
          OFFICER: 'Hiệu Úy',
          RETAINER: 'Môn Khách'
        };

        officersContainer.innerHTML = officers.map(off => {
          const riskPercent = Math.round((off.betrayalRisk || 0) * 100);
          let riskBadge = '';
          let cardModifier = '';
          if (off.courtRank === 'RULER') {
            riskBadge = `<span class="tactical-badge tactical-badge--info">Lãnh Tụ Thế Lực</span>`;
          } else if (riskPercent >= 65) {
            riskBadge = `<span class="tactical-badge tactical-badge--danger">Nguy Cơ Phản Nghịch: ${riskPercent}%</span>`;
            cardModifier = 'tactical-card--danger';
          } else if (riskPercent >= 40) {
            riskBadge = `<span class="tactical-badge tactical-badge--warning">Tâm Ý Dao Động: ${riskPercent}%</span>`;
            cardModifier = 'tactical-card--warning';
          } else {
            riskBadge = `<span class="tactical-badge tactical-badge--success">Trung Thành: ${riskPercent}%</span>`;
            cardModifier = 'tactical-card--success';
          }

          const isGovernor = !!off.appointedSettlementName;

          return `
            <div class="tactical-card ${cardModifier}">
              <div class="tactical-card-header">
                <div>
                  <h4 class="tactical-card-title">${off.officerName}</h4>
                  <div class="tactical-card-subtitle">${off.factionNameVi} • ${rankLabels[off.courtRank] || off.courtRank}</div>
                </div>
                ${riskBadge}
              </div>

              ${isGovernor ? `
                <div style="font-size:11px; color:#38bdf8; background:rgba(56,189,248,0.08); padding:4px 8px; border-radius:var(--radius-xs); border:1px solid rgba(56,189,248,0.2);">
                  Trấn Thủ: <b>${off.appointedSettlementName}</b>
                </div>
              ` : ''}

              <!-- Dual Tension Bars: Loyalty vs Ambition -->
              <div style="display:flex; flex-direction:column; gap:6px; font-size:11px;">
                <div>
                  <div style="display:flex; justify-content:space-between; color:var(--text-muted); margin-bottom:2px;">
                    <span>Lòng Trung Thành</span>
                    <span class="tactical-stat-val tactical-stat-val--green">${off.loyalty}/100</span>
                  </div>
                  <div class="tactical-progress-track">
                    <div class="tactical-progress-bar tactical-progress-bar--success" style="width:${off.loyalty}%;"></div>
                  </div>
                </div>

                <div>
                  <div style="display:flex; justify-content:space-between; color:var(--text-muted); margin-bottom:2px;">
                    <span>Dã Tâm / Tham Vọng</span>
                    <span class="tactical-stat-val tactical-stat-val--gold">${off.ambition}/100</span>
                  </div>
                  <div class="tactical-progress-track">
                    <div class="tactical-progress-bar" style="width:${off.ambition}%;"></div>
                  </div>
                </div>
              </div>

              <!-- Action buttons -->
              ${off.courtRank !== 'RULER' ? `
                <div style="display:flex; gap:6px; margin-top:4px; border-top:1px solid var(--border-subtle); padding-top:8px;">
                  <button class="tactical-btn tactical-btn--sm" style="flex:1;" onclick="handleGrantReward('${off.officerId}', '${off.factionId}')">
                    Thưởng 300 Tiền
                  </button>
                  <button class="tactical-btn tactical-btn--sm" style="flex:1;" onclick="handleInvestTitle('${off.officerId}', '${off.factionId}')">
                    Phong Tước Vị
                  </button>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
      }
    }

    // 3. Render Settlements Control
    if (settlementsContainer) {
      if (settlements.length === 0) {
        settlementsContainer.innerHTML = '<div class="tactical-empty">Chưa có dữ liệu thành trì.</div>';
      } else {
        settlementsContainer.innerHTML = settlements.map(s => `
          <div class="tactical-card">
            <div class="tactical-card-header">
              <h4 class="tactical-card-title">${s.nameVi}</h4>
              <span class="tactical-badge" style="border-color:${s.factionColor}66; color:${s.factionColor};">
                ${s.factionNameVi}
              </span>
            </div>
            <div class="tactical-stat-grid">
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Thái Thú</span>
                <span class="tactical-stat-val">${s.governorName}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Trị An</span>
                <span class="tactical-stat-val tactical-stat-val--green">${s.publicOrder}%</span>
              </div>
              <div class="tactical-stat-item" style="grid-column: span 2;">
                <span class="tactical-stat-label">Binh Lực Đồn Trú</span>
                <span class="tactical-stat-val tactical-stat-val--blue">${s.garrisonTroops?.toLocaleString()} Quân Sĩ</span>
              </div>
            </div>
            <button class="tactical-btn tactical-btn--sm" style="width:100%; margin-top:2px;" onclick="handleAppointGovernor('${s.settlementId}', '${s.rulerFactionId}')">
              Bổ Nhiệm Thái Thú Mới
            </button>
          </div>
        `).join('');
      }
    }

    // 4. Render Political Events Timeline
    if (eventsTimeline) {
      if (events.length === 0) {
        eventsTimeline.innerHTML = '<div style="color:#64748b; padding:15px; text-align:center;">Chưa có biến cố chính trị nội bộ. Bấm "Mô Phỏng Chính Trị Nội Bộ" để kiểm tra dã tâm của các tướng lĩnh.</div>';
      } else {
        eventsTimeline.innerHTML = events.map(e => `
          <div class="event-card" style="border-left-color: ${e.eventType === 'SECESSION_WARLORD' ? '#ef4444' : '#eab308'};">
            <div class="event-header">
              <span class="event-year-badge" style="background:${e.eventType === 'SECESSION_WARLORD' ? '#ef4444' : '#d97706'};">
                Lượt ${e.turnNumber} • ${e.gameDate}
              </span>
              <span class="event-loc-badge">Thế Lực: ${e.sourceFactionId}</span>
              <span style="font-size:11px; color:#cbd5e1; margin-left:auto;">${e.eventType}</span>
            </div>
            <h4 class="event-title" style="color:${e.eventType === 'SECESSION_WARLORD' ? '#f87171' : '#facc15'};">
              ${e.titleVi}
            </h4>
            <p class="event-narrative">${e.narrativeVi}</p>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('loadAndRenderFactions error:', err);
    if (factionsContainer) factionsContainer.innerHTML = `<div style="color:#ef4444;">Lỗi: ${err.message}</div>`;
  }
}

async function triggerSimulatePolitics() {
  try {
    showToast('Đang phân tích dã tâm và nguy cơ phản trắc của các tướng lĩnh...', false);
    const res = await apiSimulatePolitics();
    if (res.success) {
      showToast(`Hoàn tất chu trình chính trị! Đã sinh ra ${res.count || 0} biến cố nội bộ.`, false);
      await loadAndRenderFactions();
    }
  } catch (err) {
    showToast(`Lỗi: ${err.message}`, true);
  }
}

async function handleGrantReward(officerId, factionId) {
  try {
    showToast(`Đang xuất 300 tiền từ quân khố ban thưởng...`, false);
    const res = await apiGrantReward(officerId, factionId, 300);
    if (res.success) {
      showToast(res.result?.message || 'Ban thưởng thành công!', false);
      await loadAndRenderFactions();
    }
  } catch (err) {
    showToast(`Lỗi ban thưởng: ${err.message}`, true);
  }
}

async function handleInvestTitle(officerId, factionId) {
  const ranks = [
    { code: 'CHIEF_COMMANDER', label: 'Đại Đô Đốc / Thống Soái' },
    { code: 'CHIEF_ADVISOR', label: 'Quân Sư / Đại Quân Mưu' },
    { code: 'GOVERNOR', label: 'Thái Thú / Thứ Sử' },
    { code: 'GENERAL', label: 'Tiền Phong Tướng Quân' }
  ];

  const choiceStr = ranks.map((r, i) => `${i + 1}. ${r.label}`).join('\n');
  const input = prompt(`Chọn tước hàm muốn tấn phong cho tướng lĩnh:\n${choiceStr}\nNhập số 1-${ranks.length}:`, '1');
  if (!input) return;

  const idx = parseInt(input.trim(), 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= ranks.length) {
    showToast('Lựa chọn không hợp lệ.', true);
    return;
  }

  const selectedRank = ranks[idx].code;
  try {
    showToast(`Đang ban chiếu sắc phong...`, false);
    const res = await apiInvestTitle(officerId, factionId, selectedRank);
    if (res.success) {
      showToast(res.result?.message || 'Sắc phong thành công!', false);
      await loadAndRenderFactions();
    }
  } catch (err) {
    showToast(`Lỗi phong tước: ${err.message}`, true);
  }
}

async function handleAppointGovernor(settlementId, factionId) {
  try {
    const officersRes = await apiFetchFactionOfficers(factionId);
    const officers = (officersRes.officers || []).filter(o => o.courtRank !== 'RULER');
    if (officers.length === 0) {
      showToast('Thế lực chưa có tướng lĩnh nào khả dụng để bổ nhiệm.', true);
      return;
    }

    const choiceStr = officers.map((o, i) => `${i + 1}. ${o.officerName} (Trung thành: ${o.loyalty}, Dã tâm: ${o.ambition})`).join('\n');
    const input = prompt(`Chọn tướng lĩnh bổ nhiệm làm Thái thú trấn thủ:\n${choiceStr}\nNhập số 1-${officers.length}:`, '1');
    if (!input) return;

    const idx = parseInt(input.trim(), 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= officers.length) {
      showToast('Lựa chọn không hợp lệ.', true);
      return;
    }

    const selectedOfficerId = officers[idx].officerId;
    showToast(`Đang ban cờ tiết bổ nhiệm Thái thú...`, false);
    const res = await apiAppointGovernor(settlementId, selectedOfficerId, factionId);
    if (res.success) {
      showToast(res.result?.message || 'Bổ nhiệm thành công!', false);
      await loadAndRenderFactions();
    }
  } catch (err) {
    showToast(`Lỗi bổ nhiệm: ${err.message}`, true);
  }
}

// -------------------------------------------------------------
// Ancient Professions, Gathering & Emergent Innovations (Phase 2)
// -------------------------------------------------------------
async function loadAndRenderProfessions() {
  const profsContainer = document.getElementById('gm-professions-list-container');
  const nodesContainer = document.getElementById('gm-gathering-nodes-container');
  const innoTimeline = document.getElementById('gm-innovations-timeline');

  if (profsContainer) {
    profsContainer.innerHTML = '<div style="color:#94a3b8; padding:15px; text-align:center;">Đang nạp bách nghệ và điểm khai khoáng...</div>';
  }

  try {
    const [profsRes, nodesRes, innoRes] = await Promise.all([
      apiFetchCharacterProfessions('PLY-0001'),
      apiFetchGatheringNodes(),
      apiFetchInnovations()
    ]);

    const profs = profsRes.professions || [];
    const nodes = nodesRes.nodes || [];
    const innovations = innoRes.innovations || [];

    // 1. Render Learned Professions
    if (profsContainer) {
      if (profs.length === 0) {
        profsContainer.innerHTML = '<div class="tactical-empty">Chưa nhập môn nghề nghiệp nào. Hãy lên núi khai thác để bắt đầu tích lũy kinh nghiệm!</div>';
      } else {
        const tierNames = [
          '',
          'Bậc 1: Tập Sự',
          'Bậc 2: Thợ Nghề',
          'Bậc 3: Thợ Cả',
          'Bậc 4: Đại Sư',
          'Bậc 5: Tông Sư'
        ];

        profsContainer.innerHTML = profs.map(p => {
          const isEmergent = p.category === 'EMERGENT_INNOVATION';
          const progressPercent = Math.min(100, Math.round((p.currentExp / p.maxExp) * 100));

          return `
            <div class="tactical-card ${isEmergent ? 'tactical-card--accent' : 'tactical-card--success'}">
              <div class="tactical-card-header">
                <div>
                  <h4 class="tactical-card-title">${p.professionNameVi}</h4>
                  <div class="tactical-card-subtitle">${p.professionNameEn}</div>
                </div>
                <span class="tactical-badge ${isEmergent ? 'tactical-badge--primary' : 'tactical-badge--success'}">
                  ${p.category === 'EMERGENT_INNOVATION' ? 'Nghề Đột Phá' : 'Chính Đạo'}
                </span>
              </div>

              <div style="font-size:11.5px; color:#cbd5e1; font-weight:600;">
                ${tierNames[p.tier] || `Bậc ${p.tier}`}
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:10.5px; color:var(--text-muted); margin-bottom:3px;">
                  <span>Độ Thuần Thục</span>
                  <span class="tactical-stat-val">${p.currentExp} / ${p.maxExp} EXP (${progressPercent}%)</span>
                </div>
                <div class="tactical-progress-track">
                  <div class="tactical-progress-bar ${isEmergent ? '' : 'tactical-progress-bar--success'}" style="width:${progressPercent}%;"></div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 2. Render Gathering Nodes
    if (nodesContainer) {
      if (nodes.length === 0) {
        nodesContainer.innerHTML = '<div class="tactical-empty">Chưa có điểm thu thập trên bản đồ.</div>';
      } else {
        const typeNames = {
          MINERAL: 'Khai Khoáng Mỏ Đá',
          HERB: 'Dược Thảo Rừng Núi',
          TIMBER: 'Đốn Gỗ Sơn Lâm',
          SALT_WELL: 'Chưng Cất Nấu Muối'
        };

        nodesContainer.innerHTML = nodes.map(n => `
          <div class="tactical-card tactical-card--info">
            <div class="tactical-card-header">
              <div>
                <h4 class="tactical-card-title">${n.nameVi}</h4>
                <div class="tactical-card-subtitle">${n.settlementId} • ${typeNames[n.resourceType] || n.resourceType}</div>
              </div>
              <span class="tactical-badge tactical-badge--danger">-${n.fatigueCost} Thể Lực</span>
            </div>

            <p class="tactical-narrative">
              ${n.descriptionVi || ''}
            </p>

            <div class="tactical-stat-grid">
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Sản Vật Thu Hoạch</span>
                <span class="tactical-stat-val">${n.yieldItemNameVi}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Sản Lượng Ước Tính</span>
                <span class="tactical-stat-val tactical-stat-val--gold">~${n.yieldQuantityMin}-${n.yieldQuantityMax} Đơn Vị</span>
              </div>
            </div>

            <div style="margin-top:4px;">
              <button class="tactical-btn tactical-btn--success" style="width:100%;" onclick="handleGatherResource('${n.nodeId}')">
                Tiến Vào Khai Thác
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    // 3. Render Emergent Innovations
    if (innoTimeline) {
      if (innovations.length === 0) {
        innoTimeline.innerHTML = '<div class="tactical-empty">Chưa có sáng tạo nghề mới. Hãy nâng cấp nhiều nghề lên Bậc 2 trở lên và bấm "Đột Phá Sáng Tạo Nghề Mới"!</div>';
      } else {
        innoTimeline.innerHTML = innovations.map(inno => `
          <div class="tactical-card tactical-card--accent">
            <div class="tactical-card-header">
              <div>
                <h4 class="tactical-card-title">${inno.titleVi}</h4>
                <div class="tactical-card-subtitle">Lượt ${inno.turnNumber} • ${inno.gameDate}</div>
              </div>
              <span class="tactical-badge tactical-badge--primary">Nghề Mới: ${inno.professionCode}</span>
            </div>
            <p class="tactical-narrative">${inno.narrativeVi}</p>
            ${inno.unlockedRecipes && inno.unlockedRecipes.length > 0 ? `
              <div style="font-size:11px; color:#4ade80; margin-top:4px; background:rgba(34,197,94,0.08); padding:5px 8px; border-radius:3px; border:1px solid rgba(34,197,94,0.2);">
                Công Thức Khai Mở: <b>${inno.unlockedRecipes.join(', ')}</b>
              </div>
            ` : ''}
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('loadAndRenderProfessions error:', err);
    if (profsContainer) profsContainer.innerHTML = `<div style="color:#ef4444;">Lỗi: ${err.message}</div>`;
  }
}

async function handleGatherResource(nodeId) {
  try {
    showToast('Đang tiến vào sơn mạch khai thác tài nguyên...', false);
    const res = await apiGatherResource('PLY-0001', nodeId);
    if (res.success) {
      const data = res.result;
      showToast(`Thu hoạch thành công +${data.yieldQuantity} ${data.itemName}! (${data.expMessage})`, false);
      if (data.breakthrough) {
        setTimeout(() => {
          alert(`CHÚC MỪNG ĐỘT PHÁ NGHỀ MỚI!\n\n${data.breakthrough.titleVi}\n\n${data.breakthrough.narrativeVi}`);
        }, 500);
      }
      await loadAndRenderProfessions();
    }
  } catch (err) {
    showToast(`Khai thác thất bại: ${err.message}`, true);
  }
}

async function triggerSynthesizeBreakthrough() {
  try {
    showToast('Đang kiểm tra khả năng dung hợp bách nghệ và điều kiện đột phá...', false);
    const res = await apiSynthesizeBreakthrough('PLY-0001');
    if (res.success && res.innovation) {
      alert(`ĐỘT PHÁ THÀNH CÔNG NGHỀ MỚI!\n\n${res.innovation.titleVi}\n\n${res.innovation.narrativeVi}`);
      await loadAndRenderProfessions();
    } else {
      showToast('Chưa hội đủ điều kiện giao thoa! Hãy nâng cấp ít nhất 2 nhánh nghề lên Bậc 2 (ví dụ: Khai Khoáng Bậc 2 + Thái Dược Bậc 2) rồi thử lại.', true);
    }
  } catch (err) {
    showToast(`Lỗi dung hợp: ${err.message}`, true);
  }
}

async function loadAndRenderEcology() {
  const crisesContainer = document.getElementById('gm-crises-container');
  const caravansContainer = document.getElementById('gm-caravans-container');
  const strongholdsContainer = document.getElementById('gm-strongholds-container');

  if (crisesContainer) crisesContainer.innerHTML = '<div class="tactical-empty">Đang kiểm kê hiện trạng thiên tai sinh thái...</div>';
  if (caravansContainer) caravansContainer.innerHTML = '<div class="tactical-empty">Đang kiểm kê tuyến vận tải thương đoàn...</div>';
  if (strongholdsContainer) strongholdsContainer.innerHTML = '<div class="tactical-empty">Đang trinh sát cứ điểm đạo phỉ...</div>';

  try {
    const [crisesRes, caravansRes, strongholdsRes] = await Promise.all([
      apiFetchCrises(),
      apiFetchCaravans(),
      apiFetchStrongholds()
    ]);

    const crises = crisesRes.crises || [];
    const caravans = caravansRes.caravans || [];
    const strongholds = strongholdsRes.strongholds || [];

    // 1. Render Crises
    if (crisesContainer) {
      if (crises.length === 0) {
        crisesContainer.innerHTML = '<div class="tactical-empty" style="color:var(--state-success);">Mưa thuận gió hòa, thiên hạ thái bình, không có biến cố thiên tai nạn đói.</div>';
      } else {
        const crisisNames = {
          GREAT_DROUGHT: 'Đại Hạn Hán',
          LOCUST_SWARM: 'Dịch Châu Chấu',
          MAJOR_FLOOD: 'Đại Hồng Thủy',
          PESTILENCE: 'Ôn Dịch Hoành Hành',
          PEASANT_REBELLION: 'Khởi Nghĩa Nông Dân'
        };

        crisesContainer.innerHTML = crises.map(c => `
          <div class="tactical-card tactical-card--danger">
            <div class="tactical-card-header">
              <div>
                <h4 class="tactical-card-title">${c.titleVi}</h4>
                <div class="tactical-card-subtitle">Quận Huyện: <b>${c.settlementId}</b> • ${crisisNames[c.crisisType] || c.crisisType}</div>
              </div>
              <span class="tactical-badge tactical-badge--danger">Còn ${c.durationTurnsLeft} Lượt</span>
            </div>
            <p class="tactical-narrative">${c.narrativeVi}</p>
            <div class="tactical-stat-grid">
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Sản Lượng Nông Nghiệp</span>
                <span class="tactical-stat-val tactical-stat-val--red">-${Math.round(c.agriculturePenalty * 100)}%</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Tổn Hại Trị An</span>
                <span class="tactical-stat-val tactical-stat-val--red">-${c.publicOrderPenalty}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Bội Số Giá Lương</span>
                <span class="tactical-stat-val tactical-stat-val--gold">x${c.grainPriceMultiplier}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Mức Độ Thiệt Hại</span>
                <span class="tactical-stat-val">Cấp ${c.severityLevel}</span>
              </div>
            </div>
            <div style="text-align:right; margin-top:4px;">
              <button class="tactical-btn tactical-btn--success" onclick="handleDispatchRelief('${c.settlementId}')">
                Mở Kho Phát Chẩn (5 Thạch)
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    // 2. Render Caravans
    if (caravansContainer) {
      if (caravans.length === 0) {
        caravansContainer.innerHTML = '<div class="tactical-empty">Hiện tại không có thương đoàn nào đang lưu thông trên các dịch đạo.</div>';
      } else {
        const statusMap = {
          EN_ROUTE: { label: 'Đang Vận Chuyển', badgeClass: 'tactical-badge--info' },
          PLUNDERED: { label: 'Bị Cướp Phá', badgeClass: 'tactical-badge--danger' },
          SUCCESS_TRADED: { label: 'Cập Bến Hoàn Tất', badgeClass: 'tactical-badge--success' }
        };

        caravansContainer.innerHTML = caravans.map(car => {
          const st = statusMap[car.status] || { label: car.status, badgeClass: '' };
          const progressPercent = Math.round((car.routeProgress || 0) * 100);
          const isPlundered = car.status === 'PLUNDERED';

          return `
            <div class="tactical-card ${isPlundered ? 'tactical-card--danger' : 'tactical-card--info'}">
              <div class="tactical-card-header">
                <div>
                  <h4 class="tactical-card-title">${car.caravanName}</h4>
                  <div class="tactical-card-subtitle">Chủ Quản: <b>${car.ownerFactionName || car.ownerFactionId}</b></div>
                </div>
                <span class="tactical-badge ${st.badgeClass}">${st.label}</span>
              </div>
              <div style="font-size:11.5px; color:#cbd5e1;">
                Lộ Trình: <b>${car.fromSettlementName || car.fromSettlementId}</b> ➔ <b>${car.toSettlementName || car.toSettlementId}</b>
              </div>
              <div class="tactical-progress-track">
                <div class="tactical-progress-bar ${isPlundered ? 'tactical-progress-bar--danger' : ''}" style="width:${progressPercent}%;"></div>
              </div>
              <div class="tactical-stat-grid">
                <div class="tactical-stat-item">
                  <span class="tactical-stat-label">Tiến Độ Dịch Lộ</span>
                  <span class="tactical-stat-val tactical-stat-val--blue">${progressPercent}%</span>
                </div>
                <div class="tactical-stat-item">
                  <span class="tactical-stat-label">Võ Sĩ Hộ Vệ</span>
                  <span class="tactical-stat-val tactical-stat-val--purple">${car.guardTroops} Tiêu Sư</span>
                </div>
                <div class="tactical-stat-item">
                  <span class="tactical-stat-label">Hàng Hóa</span>
                  <span class="tactical-stat-val">${car.cargoQuantity} ${car.cargoItemName || car.cargoItemCode}</span>
                </div>
                <div class="tactical-stat-item">
                  <span class="tactical-stat-label">Trị Giá Lô Hàng</span>
                  <span class="tactical-stat-val tactical-stat-val--gold">${car.cargoValueQian?.toLocaleString()} Tiền</span>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 3. Render Bandit Strongholds
    if (strongholdsContainer) {
      if (strongholds.length === 0) {
        strongholdsContainer.innerHTML = '<div class="tactical-empty">Không phát hiện sơn trại đạo phỉ nào gần khu vực.</div>';
      } else {
        strongholdsContainer.innerHTML = strongholds.map(s => {
          const isSubdued = s.status === 'SUBDUED';
          return `
            <div class="tactical-card ${isSubdued ? 'tactical-card--subdued' : 'tactical-card--warning'}">
              <div class="tactical-card-header">
                <div>
                  <h4 class="tactical-card-title">${s.nameVi}</h4>
                  <div class="tactical-card-subtitle">Yết Hầu: <b>${s.locationNear}</b> • Trại Chủ: <b>${s.banditChiefName}</b></div>
                </div>
                <span class="tactical-badge ${isSubdued ? '' : 'tactical-badge--warning'}">
                  ${isSubdued ? 'Đã Tiễu Phạt' : 'Hoạt Động Khởi Nghĩa'}
                </span>
              </div>
              <div class="tactical-stat-grid">
                <div class="tactical-stat-item">
                  <span class="tactical-stat-label">Vũ Lực Tặc Đảng</span>
                  <span class="tactical-stat-val tactical-stat-val--red">${s.banditPower}</span>
                </div>
                <div class="tactical-stat-item">
                  <span class="tactical-stat-label">Tài Vật Cướp Bóc</span>
                  <span class="tactical-stat-val tactical-stat-val--gold">${s.plunderedWealth?.toLocaleString()} Tiền</span>
                </div>
                <div class="tactical-stat-item" style="grid-column: span 2;">
                  <span class="tactical-stat-label">Tiền Thưởng Quân Công Triều Đình</span>
                  <span class="tactical-stat-val tactical-stat-val--green">+${s.bountyReward?.toLocaleString()} Tiền</span>
                </div>
              </div>
              ${!isSubdued ? `
                <div style="text-align:right; margin-top:4px;">
                  <button class="tactical-btn tactical-btn--danger" onclick="handleAttackStronghold('${s.strongholdId}')">
                    Công Kích Tiễu Phạt
                  </button>
                </div>
              ` : `
                <div class="tactical-empty" style="padding:6px; font-size:10.5px;">
                  Sơn trại đã bị dẹp tan, trật tự dịch lộ được vãn hồi.
                </div>
              `}
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('loadAndRenderEcology error:', err);
    if (crisesContainer) crisesContainer.innerHTML = `<div class="tactical-empty" style="color:var(--state-danger);">Lỗi: ${err.message}</div>`;
  }
}

async function handleDispatchRelief(settlementId) {
  try {
    showToast(`Đang vận chuyển 5 thạch lương thảo mở kho phát chẩn tại ${settlementId}...`, false);
    const res = await apiDispatchRelief(settlementId, 5.0);
    if (res.success) {
      showToast(res.message, false);
      await loadAndRenderEcology();
    }
  } catch (err) {
    showToast(`Phát chẩn thất bại: ${err.message}`, true);
  }
}

async function handleAttackStronghold(strongholdId) {
  try {
    showToast('Đang thống lĩnh dũng sĩ Lương Thị tiến công sơn trại phỉ khấu...', false);
    const res = await apiAttackStronghold(strongholdId);
    if (res.success) {
      alert(`ĐẠI THẮNG SƠN TRẠI!\n\n${res.message}\n\nThu hồi: ${res.lootCash} tiền\nTiền thưởng tiễu phỉ: ${res.bounty} tiền\nTổng thu: +${res.totalReward} tiền!`);
      await loadAndRenderEcology();
    } else {
      alert(`CÔNG TRẠI THẤT BẠI!\n\n${res.message}`);
      await loadAndRenderEcology();
    }
  } catch (err) {
    showToast(`Lỗi tấn công sơn trại: ${err.message}`, true);
  }
}

async function triggerSimulateEcology() {
  try {
    showToast('Đang mô phỏng chu kỳ biến thiên sinh thái & hành trình thương đoàn...', false);
    const res = await apiSimulateEcologyTurn();
    if (res.success) {
      const logs = (res.events || []).join('\n') || 'Không có biến cố phục kích hay thiên tai mới.';
      alert(`HOÀN TẤT CHU KỲ SINH THÁI & THƯƠNG ĐOÀN\n\n${logs}`);
      await loadAndRenderEcology();
    }
  } catch (err) {
    showToast(`Lỗi mô phỏng: ${err.message}`, true);
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
window.checkAndRenderActiveEventBanner = checkAndRenderActiveEventBanner;
window.openEventParticipationModal = openEventParticipationModal;
window.closeEventParticipationModal = closeEventParticipationModal;
window.submitEventChoice = submitEventChoice;
window.loadAndRenderNpcLife = loadAndRenderNpcLife;
window.triggerSimulateNpcJourney = triggerSimulateNpcJourney;
window.loadAndRenderFactions = loadAndRenderFactions;
window.triggerSimulatePolitics = triggerSimulatePolitics;
window.handleGrantReward = handleGrantReward;
window.handleInvestTitle = handleInvestTitle;
window.handleAppointGovernor = handleAppointGovernor;
window.loadAndRenderProfessions = loadAndRenderProfessions;
window.handleGatherResource = handleGatherResource;
window.triggerSynthesizeBreakthrough = triggerSynthesizeBreakthrough;
window.loadAndRenderEcology = loadAndRenderEcology;
window.handleDispatchRelief = handleDispatchRelief;
window.handleAttackStronghold = handleAttackStronghold;
window.triggerSimulateEcology = triggerSimulateEcology;


