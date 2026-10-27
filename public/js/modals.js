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

  if (tabId === 'npc-life') {
    await loadAndRenderNpcLife();
  }

  if (tabId === 'factions') {
    await loadAndRenderFactions();
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
      actionBtn = `<span class="event-choice-badge ${isAlt ? 'alternate' : 'canon'}">✅ Đã Tham Gia (${isAlt ? 'Dị Bản What-If' : 'Chính Sử'})</span>`;
    } else if (ev.isLocal) {
      actionBtn = `<button class="btn-select-choice" onclick="openEventParticipationModal('${ev.event_id}')">⚡ Tham Gia Ngay</button>`;
    }

    return `
      <div class="gm-event-card">
        <div class="gm-event-header">
          <div class="gm-event-title">📜 ${ev.name_vi}</div>
          <div style="display:flex;align-items:center;gap:6px;">
            ${actionBtn}
            <span class="gm-event-badge">${ev.historical_year} SCN • ${seasonMap[ev.season] || ev.season}</span>
          </div>
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

  document.getElementById('ep-modal-title').innerText = `📜 Biến Cố Lịch Sử: ${targetEvent.name_vi}`;
  document.getElementById('ep-modal-subtitle').innerText = `${targetEvent.historical_year} SCN • ${targetEvent.location_id || 'Trung Nguyên'} • ${targetEvent.name_en}`;
  document.getElementById('ep-modal-summary').innerText = targetEvent.summary_vi;
  
  const metaEl = document.getElementById('ep-modal-meta');
  if (metaEl) {
    metaEl.innerHTML = `
      <div>📍 Địa bàn: <strong>${targetEvent.location_id || 'Trung Nguyên'}</strong></div>
      <div>👤 Nhân vật then chốt: <strong>${targetEvent.primary_character_id || 'Chư Hầu'}</strong></div>
      <div>⚖️ Diễn biến lịch sử: <em>${targetEvent.historical_outcome_vi || 'Đang diễn ra'}</em></div>
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
              <span class="event-choice-title">👉 ${c.title_vi}</span>
              <span class="event-choice-badge ${badgeClass}">${badgeText}</span>
            </div>
            <div class="event-choice-narrative">${c.narrative_vi}</div>
            <div class="event-choice-footer">
              <span class="event-choice-cost">${costStr || 'Không đòi hỏi tài nguyên'}</span>
              <button class="btn-select-choice" onclick="submitEventChoice('${targetEvent.event_id}', '${c.choice_id}')">
                ⚔️ Quyết Định Hành Động
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
        <div style="font-weight:700;margin-bottom:4px;color:#34d399;">✅ ĐÃ HOÀN TẤT THAM GIA BIẾN CỐ LỊCH SỬ!</div>
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
            HEGEMON_UNIFIER: { label: '👑 Tranh Bá Đồ Vương', color: '#f59e0b' },
            RIGHTEOUS_VANGUARD: { label: '⚔️ Chiến Thần Cái Thế', color: '#ef4444' },
            LOYAL_BROTHERHOOD: { label: '🛡️ Vạn Nhân Địch', color: '#3b82f6' },
            MASTER_ARTISAN: { label: '🔨 Thần Tượng Đúc Khí', color: '#10b981' },
            COMMERCE_TYCOON: { label: '💰 Phú Khả Địch Quốc', color: '#eab308' },
            DEVOTED_RETAINER: { label: '🤝 Tận Tụy Chức Trách', color: '#8b5cf6' }
          };
          const amb = ambitionMap[p.life_ambition] || { label: p.life_ambition, color: '#94a3b8' };

          return `
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <span style="font-weight: 700; color: #f8fafc; font-size: 15px;">${p.npc_name}</span>
                <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.05); color: #cbd5e1;">${p.milestone_title || 'Hào Hiệp'}</span>
              </div>
              <div style="display: inline-block; font-size: 12px; font-weight: 600; color: ${amb.color};">
                ${amb.label}
              </div>
              <div style="font-size: 12px; color: #94a3b8; font-style: italic;">
                Đang chú tâm: "${p.current_focus}"
              </div>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 11px; text-align: center;">
                <div>
                  <div style="color: #64748b;">Tiền riêng</div>
                  <div style="color: #facc15; font-weight: 600;">${(p.personal_cash || 0).toLocaleString()} Tiền</div>
                </div>
                <div>
                  <div style="color: #64748b;">Danh vọng</div>
                  <div style="color: #38bdf8; font-weight: 600;">${p.prestige || 0} Điểm</div>
                </div>
                <div>
                  <div style="color: #64748b;">Quân tư</div>
                  <div style="color: #f43f5e; font-weight: 600;">${p.personal_troops || 0} Dũng sĩ</div>
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
        shiftsContainer.innerHTML = '<div style="color:#64748b; padding:10px; background:rgba(15,23,42,0.4); border-radius:6px;">Chưa có bước ngoặt thân phận nào diễn ra. Khi NPC đạt đủ danh vọng và tích lũy thực lực, họ sẽ đột phá thân phận.</div>';
      } else {
        shiftsContainer.innerHTML = shifts.map(s => `
          <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.8)); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 12px 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-size:12px; font-weight:700; color:#fbbf24; text-transform:uppercase; letter-spacing:0.5px;">⚡ ĐỘT PHÁ THÂN PHẬN • LƯỢT ${s.turn_number}</span>
              <span style="font-size:11px; color:#94a3b8; background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:4px;">${s.old_tier} ➔ <strong style="color:#38bdf8;">${s.new_tier}</strong></span>
            </div>
            <h4 style="margin:0 0 6px 0; color:#f8fafc; font-size:15px; font-weight:700;">${s.title_vi}</h4>
            <p style="margin:0; font-size:13px; color:#cbd5e1; line-height:1.5;">${s.narrative_vi}</p>
          </div>
        `).join('');
      }
    }

    // 3. Render Cross-NPC Peer Relations
    if (peersContainer) {
      if (peers.length === 0) {
        peersContainer.innerHTML = '<div style="color:#64748b; padding:10px;">Chưa có dữ liệu quan hệ chéo giữa các NPC.</div>';
      } else {
        peersContainer.innerHTML = peers.map(rel => {
          const typeBadgeMap = {
            SWORN_BROTHERS: { label: '🤝 Sinh Tử Kết Nghĩa', color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
            COMRADES: { label: '🛡️ Tri Kỷ Đồng Liêu', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
            INTERNAL_RIVAL: { label: '⚔️ Đối Thủ Cạnh Tranh', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
            MASTER_DISCIPLE: { label: '📜 Sư Đồ Chân Truyền', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
            DEBTOR_CREDITOR: { label: '💰 Ân Nghĩa Vay Mượn', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' }
          };
          const tb = typeBadgeMap[rel.relation_type] || { label: rel.relation_type, color: '#94a3b8', bg: 'rgba(255,255,255,0.05)' };

          let notes = '';
          try {
            const hist = JSON.parse(rel.interaction_history_json || '[]');
            if (hist.length > 0) notes = hist[hist.length - 1].notes || '';
          } catch (e) {}

          return `
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px; display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; color:#f8fafc; font-size:14px;">${rel.name_a} ⟷ ${rel.name_b}</span>
                <span style="font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px; color:${tb.color}; background:${tb.bg};">${tb.label}</span>
              </div>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:12px;">
                <div>
                  <div style="display:flex; justify-content:space-between; color:#94a3b8; margin-bottom:2px;">
                    <span>Thiện cảm</span>
                    <span style="color:#f43f5e; font-weight:600;">${rel.affinity > 0 ? '+' : ''}${rel.affinity}</span>
                  </div>
                  <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden;">
                    <div style="height:100%; width:${Math.max(0, Math.min(100, (rel.affinity + 100) / 2))}%; background:#f43f5e;"></div>
                  </div>
                </div>
                <div>
                  <div style="display:flex; justify-content:space-between; color:#94a3b8; margin-bottom:2px;">
                    <span>Tôn kính</span>
                    <span style="color:#38bdf8; font-weight:600;">${rel.respect}/100</span>
                  </div>
                  <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden;">
                    <div style="height:100%; width:${rel.respect}%; background:#38bdf8;"></div>
                  </div>
                </div>
              </div>
              ${notes ? `<div style="font-size:12px; color:#cbd5e1; font-style:italic; border-top:1px solid rgba(255,255,255,0.05); padding-top:6px;">"${notes}"</div>` : ''}
            </div>
          `;
        }).join('');
      }
    }

    // 4. Render Journey Timeline
    if (timeline) {
      if (logs.length === 0) {
        timeline.innerHTML = '<div style="color:#64748b; padding:15px; text-align:center;">Chưa có nhật ký hành trình. Bấm "Vận Hành 1 Lượt Tự Thân" để NPC bắt đầu chuỗi sự kiện.</div>';
      } else {
        timeline.innerHTML = logs.map(l => {
          const actionIcons = {
            MARTIAL_DRILL: '🗡️ Khổ Luyện Võ Nghệ',
            STRATEGY_STUDY: '📜 Nghiên Cứu Binh Thư',
            COMMERCE_ARBITRAGE: '💰 Giao Thương Tích Lũy',
            BANDIT_EXPEDITION: '⚔️ Tiễu Phỉ Dẹp Cướp',
            BANQUET_NETWORKING: '🍷 Hội Ngộ Bằng Hữu',
            CRAFT_BREAKTHROUGH: '🔨 Đột Phá Kỹ Nghệ'
          };
          const iconLabel = actionIcons[l.actionType] || l.actionType;

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
                <span class="event-loc-badge">👤 ${l.npcName}</span>
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
          ROYALIST: '👑 Phò Hán',
          REBEL: '⚡ Khăn Vàng Khởi Nghĩa',
          WARLORD: '⚔️ Quân Phiệt Cát Cứ',
          MERCHANT_GUILD: '💎 Thương Bang Nghiệp Hộ'
        };

        factionsContainer.innerHTML = factions.map(f => `
          <div class="gm-npc-card" style="border-top: 3px solid ${f.colorHex};">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
              <div>
                <h4 style="color:#f8fafc; font-size:15px; font-weight:700; margin:0;">${f.nameVi}</h4>
                <span style="font-size:11px; color:#94a3b8;">${f.nameEn}</span>
              </div>
              <span style="font-size:11px; padding:2px 8px; border-radius:10px; background:rgba(255,255,255,0.08); color:#facc15; border:1px solid rgba(250,204,21,0.3);">
                ${ideologyLabels[f.ideology] || f.ideology}
              </span>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:12px; margin-bottom:10px; background:rgba(0,0,0,0.25); padding:8px; border-radius:4px;">
              <div><span style="color:#94a3b8;">Uy thế:</span> <b style="color:#e2e8f0;">${f.prestige}</b></div>
              <div><span style="color:#94a3b8;">Binh lực:</span> <b style="color:#38bdf8;">${f.militaryPower?.toLocaleString()}</b></div>
              <div><span style="color:#94a3b8;">Quân khố:</span> <b style="color:#4ade80;">${f.treasuryCash?.toLocaleString()}</b> đ</div>
              <div><span style="color:#94a3b8;">Lương thảo:</span> <b style="color:#fbbf24;">${f.granaryGrain}</b> thạch</div>
              <div><span style="color:#94a3b8;">Trọng trấn:</span> <b style="color:#e2e8f0;">${f.settlementCount || 0} thành</b></div>
              <div><span style="color:#94a3b8;">Tướng soái:</span> <b style="color:#c084fc;">${f.officerCount || 0} người</b></div>
            </div>
          </div>
        `).join('');
      }
    }

    // 2. Render Officers Tension & Betrayal Risk
    if (officersContainer) {
      if (officers.length === 0) {
        officersContainer.innerHTML = '<div style="color:#94a3b8;">Chưa có danh sách tướng lĩnh.</div>';
      } else {
        const rankLabels = {
          RULER: '👑 Chúa Công',
          CHIEF_COMMANDER: '🎖️ Đại Đô Đốc',
          CHIEF_ADVISOR: '📜 Quân Sư',
          GOVERNOR: '🏛️ Thái Thú',
          GENERAL: '⚔️ Tiền Phong',
          OFFICER: '🛡️ Hiệu Úy',
          RETAINER: '👤 Môn Khách'
        };

        officersContainer.innerHTML = officers.map(off => {
          const riskPercent = Math.round((off.betrayalRisk || 0) * 100);
          let riskBadge = '';
          if (off.courtRank === 'RULER') {
            riskBadge = `<span style="font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(59,130,246,0.2); color:#60a5fa; border:1px solid #3b82f6;">👑 Lãnh Tụ Thế Lực</span>`;
          } else if (riskPercent >= 65) {
            riskBadge = `<span style="font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(239,68,68,0.25); color:#f87171; border:1px solid #ef4444; animation:pulse 1.5s infinite;">⚠️ Nguy Cơ Phản Nghịch: ${riskPercent}%</span>`;
          } else if (riskPercent >= 40) {
            riskBadge = `<span style="font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(234,179,8,0.2); color:#facc15; border:1px solid #eab308;">⚡ Dao Động: ${riskPercent}%</span>`;
          } else {
            riskBadge = `<span style="font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(34,197,94,0.15); color:#4ade80; border:1px solid rgba(34,197,94,0.3);">🛡️ Trung Thành: ${riskPercent}%</span>`;
          }

          const isGovernor = !!off.appointedSettlementName;

          return `
            <div class="gm-npc-card" style="border-left: 3px solid ${riskPercent >= 65 ? '#ef4444' : '#6366f1'};">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <div>
                  <h4 style="color:#f8fafc; font-size:14px; font-weight:700; margin:0;">${off.officerName}</h4>
                  <span style="font-size:11px; color:#cbd5e1;">${off.factionNameVi} • ${rankLabels[off.courtRank] || off.courtRank}</span>
                </div>
                ${riskBadge}
              </div>

              ${isGovernor ? `
                <div style="font-size:11px; color:#38bdf8; margin-bottom:6px; background:rgba(56,189,248,0.1); padding:3px 6px; border-radius:3px;">
                  🏛️ Trấn thủ: <b>${off.appointedSettlementName}</b>
                </div>
              ` : ''}

              <!-- Dual Tension Bars: Loyalty vs Ambition -->
              <div style="display:flex; flex-direction:column; gap:5px; margin-bottom:10px; font-size:11px;">
                <div>
                  <div style="display:flex; justify-content:space-between; color:#94a3b8; margin-bottom:2px;">
                    <span>Lòng Trung Thành:</span>
                    <span style="color:#4ade80; font-weight:600;">${off.loyalty}/100</span>
                  </div>
                  <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden;">
                    <div style="height:100%; width:${off.loyalty}%; background:#22c55e;"></div>
                  </div>
                </div>

                <div>
                  <div style="display:flex; justify-content:space-between; color:#94a3b8; margin-bottom:2px;">
                    <span>Dã Tâm / Tham Vọng:</span>
                    <span style="color:#f59e0b; font-weight:600;">${off.ambition}/100</span>
                  </div>
                  <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden;">
                    <div style="height:100%; width:${off.ambition}%; background:#f59e0b;"></div>
                  </div>
                </div>
              </div>

              <!-- Action buttons -->
              ${off.courtRank !== 'RULER' ? `
                <div style="display:flex; gap:6px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
                  <button class="btn btn-outline" style="font-size:11px; padding:4px 8px; flex:1;" onclick="handleGrantReward('${off.officerId}', '${off.factionId}')">
                    💰 Thưởng 300 Tiền
                  </button>
                  <button class="btn btn-outline" style="font-size:11px; padding:4px 8px; flex:1;" onclick="handleInvestTitle('${off.officerId}', '${off.factionId}')">
                    🎖️ Phong Tước
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
        settlementsContainer.innerHTML = '<div style="color:#94a3b8;">Chưa có dữ liệu thành trì.</div>';
      } else {
        settlementsContainer.innerHTML = settlements.map(s => `
          <div class="gm-npc-card" style="padding:10px; font-size:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <b style="color:#f8fafc; font-size:13px;">${s.nameVi}</b>
              <span style="font-size:11px; padding:1px 6px; border-radius:3px; background:${s.factionColor}33; color:${s.factionColor}; border:1px solid ${s.factionColor}66;">
                ${s.factionNameVi}
              </span>
            </div>
            <div style="color:#94a3b8; font-size:11px; margin-bottom:4px;">
              Thái thú: <b style="color:#e2e8f0;">${s.governorName}</b>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:11px; color:#cbd5e1; margin-bottom:8px;">
              <span>Trị an: ${s.publicOrder}%</span>
              <span>Đồn trú: ${s.garrisonTroops?.toLocaleString()} binh</span>
            </div>
            <button class="btn btn-outline" style="width:100%; font-size:11px; padding:3px 6px;" onclick="handleAppointGovernor('${s.settlementId}', '${s.rulerFactionId}')">
              🏛️ Bổ Nhiệm Thái Thú Mới
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
    { code: 'CHIEF_COMMANDER', label: '🎖️ Đại Đô Đốc / Thống Soái' },
    { code: 'CHIEF_ADVISOR', label: '📜 Quân Sư / Đại Quân Mưu' },
    { code: 'GOVERNOR', label: '🏛️ Thái Thú / Thứ Sử' },
    { code: 'GENERAL', label: '⚔️ Tiền Phong Tướng Quân' }
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

