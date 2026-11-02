/**
 * ThreeKingdoms-AgentEngine: Title Screen & Single-Session Launcher
 * (public/js/title-screen-ui.js)
 *
 * One active database per server: `saves/session.db` (or SIM_DB_PATH).
 * Creating a new campaign resets that database in place after an automatic
 * backup, so the modular engine keeps the same connection and the browser only
 * needs a refresh. There is no instance list, worker process or restart step.
 */

(function () {
  'use strict';

  let cachedArchetypes = [];
  let currentSummary = null;
  let selectedArchetypeId = 'ARCH-COMMONER-YOUTH';
  let isSubmitting = false;

  const FALLBACK_ARCHETYPE = {
    id: 'ARCH-COMMONER-YOUTH',
    nameVi: 'Thanh Niên Bố Y (Hai Bàn Tay Trắng)',
    defaultName: 'Lương Diễn',
    defaultStyleName: 'Chí Viễn',
    startingAge: 18,
    initialCash: 100,
    startingLocation: 'Huyện Trác (Thảo Lư)',
    bioVi: 'Thanh niên áo vải chốn hương thôn, hai bàn tay trắng lập thân.',
    startingAssetsVi: ['Vải thô áo cộc', 'Đòn gánh tre', '100 Đồng tiền vụn'],
    attributes: { war: 55, ldr: 50, int: 60, pol: 45, dip: 50, com: 52, log: 52, cra: 58 }
  };

  function isEnglish() {
    return typeof window.currentLang !== 'undefined' && window.currentLang === 'en';
  }

  function formatNumber(num) {
    return Number(num || 0).toLocaleString('en-US');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function init() {
    await openTitleScreen(true);
  }

  /**
   * Opens the single-session launcher. The first gate hides the close button so
   * the player explicitly continues or creates a campaign.
   */
  async function openTitleScreen(isFirstGate = false) {
    let modal = document.getElementById('title-screen-modal');
    if (!modal) {
      createTitleScreenModalDOM();
      modal = document.getElementById('title-screen-modal');
    }
    modal.classList.remove('hidden');

    const closeBtn = document.getElementById('title-screen-close-btn');
    if (closeBtn) closeBtn.style.display = isFirstGate ? 'none' : 'block';

    await fetchTitleData();
    renderTitleScreenContent();
  }

  function closeTitleScreen() {
    const modal = document.getElementById('title-screen-modal');
    if (modal) modal.classList.add('hidden');
  }

  async function fetchTitleData() {
    try {
      const [instRes, summaryRes] = await Promise.all([
        fetch('/api/game/archetypes'),
        fetch('/api/game/summary')
      ]);
      const instData = await instRes.json();
      if (instData.success && Array.isArray(instData.archetypes) && instData.archetypes.length > 0) {
        cachedArchetypes = instData.archetypes;
      }
      const summaryData = await summaryRes.json();
      if (summaryData.success) currentSummary = summaryData.summary || null;
    } catch (err) {
      console.warn('[TitleScreenUI] Failed to load title data:', err);
    }
    if (cachedArchetypes.length === 0) cachedArchetypes = [FALLBACK_ARCHETYPE];
  }

  /**
   * Creates the modal markup shell in the DOM if absent.
   */
  function createTitleScreenModalDOM() {
    const modal = document.createElement('div');
    modal.id = 'title-screen-modal';
    modal.className = 'modal-backdrop title-screen-backdrop hidden';
    modal.innerHTML = `
      <div class="modal-card title-screen-card">
        <div class="title-screen-header">
          <div class="title-screen-branding">
            <span class="title-screen-seal">三国</span>
            <div>
              <h2 class="title-screen-main-title">TAM QUỐC THƯƠNG ĐỒ • CHÍ LẬP NGHIỆP</h2>
              <div class="title-screen-subtitle">Three Kingdoms Tactical Simulation • Một Phiên Chơi / Single-Session Campaign</div>
            </div>
          </div>
          <button id="title-screen-close-btn" class="ui-btn ui-btn--ghost ui-btn--icon" onclick="TitleScreenUI.close()" title="Đóng cửa sổ">&times;</button>
        </div>
        <div class="modal-body title-screen-body" id="title-screen-body">
          <!-- Populated dynamically via renderTitleScreenContent() -->
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  /**
   * Renders the two-column launcher: new campaign vs the one current session.
   */
  function renderTitleScreenContent() {
    const container = document.getElementById('title-screen-body');
    if (!container) return;

    const isEn = isEnglish();
    const currArch = cachedArchetypes.find(a => a.id === selectedArchetypeId) || cachedArchetypes[0] || FALLBACK_ARCHETYPE;
    const summary = currentSummary || {};
    const canContinue = summary.canContinue === true;
    const cashText = typeof window.formatMoney === 'function'
      ? window.formatMoney(summary.liquidCash || 0)
      : `${formatNumber(summary.liquidCash || 0)} Quan`;
    const grainText = typeof window.formatGrain === 'function'
      ? window.formatGrain(summary.strategicGrain || 0)
      : `${Number(summary.strategicGrain || 0).toFixed(2)} Thạch`;
    const initial = summary.playerName ? String(summary.playerName).charAt(0) : '漢';

    const currentCard = canContinue ? `
      <div class="title-inst-card active-inst-card">
        <div class="title-inst-head">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="title-inst-seal">${escapeHtml(initial)}</span>
            <div>
              <strong style="color: #fff; font-size: 13.5px;">${escapeHtml(summary.playerName)} (${escapeHtml(summary.playerStyle)})</strong>
              <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(summary.campaignName || '')}</div>
            </div>
          </div>
          <span class="tactical-badge tactical-badge--primary">${isEn ? 'Current' : 'Đang Chơi'}</span>
        </div>

        <div class="title-inst-body">
          <div class="title-inst-metric">
            <span>${isEn ? 'Turn' : 'Lượt'}: <b>${formatNumber(summary.activeTurn || 1)}</b> (${escapeHtml(summary.currentDate || '')})</span>
            <span>${isEn ? 'Location' : 'Địa bàn'}: <b>${escapeHtml(summary.location || '')}</b></span>
          </div>
          <div class="title-inst-metric">
            <span>${isEn ? 'Cash' : 'Tiền mặt'}: <b style="color: #fbbf24;">${escapeHtml(cashText)}</b></span>
            <span>${isEn ? 'Grain' : 'Lương thảo'}: <b>${escapeHtml(grainText)}</b></span>
          </div>
        </div>

        <div class="title-inst-actions">
          <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="TitleScreenUI.continueCurrentSession()">
            ▶ ${isEn ? 'Continue current session' : 'Tiếp Tục Phiên Hiện Tại'}
          </button>
        </div>
      </div>
    ` : `
      <div class="title-empty-state">
        <p>${isEn ? 'No current session yet. Create one on the left.' : 'Chưa có phiên hiện tại. Hãy tạo mới ở cột bên trái.'}</p>
      </div>
    `;

    container.innerHTML = `
      <div class="title-screen-grid">
        <!-- COLUMN 1: NEW CAMPAIGN FACTORY -->
        <div class="title-panel title-panel--new">
          <div class="title-panel-header">
            <span class="title-panel-icon">武</span>
            <div>
              <h3 class="title-panel-title">${isEn ? '1. START NEW CAMPAIGN' : '1. KHỞI LẬP CƠ NGHIỆP MỚI'}</h3>
              <div class="title-panel-sub">${isEn ? 'Replace the active session with a fresh campaign' : 'Thay thế phiên hiện tại bằng một chiến dịch mới'}</div>
            </div>
          </div>

          <div class="title-section-label">${isEn ? 'Starting Archetype (Default: Penniless Commoner):' : 'Thân Phận Khởi Đầu (Mặc định: Thanh Niên Tay Trắng):'}</div>
          <div class="title-archetype-selector">
            ${cachedArchetypes.map(a => {
              const isSelected = a.id === selectedArchetypeId;
              const isPauper = a.id === 'ARCH-COMMONER-YOUTH';
              return `
                <div class="title-arch-btn ${isSelected ? 'active' : ''}" onclick="TitleScreenUI.selectArchetype('${a.id}')">
                  <span class="title-arch-seal">${a.seal || '士'}</span>
                  <div class="title-arch-text">
                    <strong style="color: ${isSelected ? '#fbbf24' : '#f1f5f9'};">${a.nameVi}</strong>
                    <div style="font-size: 10.5px; color: #94a3b8;">${a.startingAge} Tuổi • Vốn: ${formatNumber(a.initialCash)} Quan ${isPauper ? '<span class="tactical-badge tactical-badge--success" style="font-size: 9px; padding: 1px 4px; margin-left: 4px;">Khuyên Dùng</span>' : ''}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px;">
            <div class="form-group">
              <label class="form-label">${isEn ? 'Character Name:' : 'Họ Tên Nhân Vật:'}</label>
              <input type="text" id="title-char-name" class="modal-input" value="${currArch.defaultName || 'Lương Diễn'}" />
            </div>
            <div class="form-group">
              <label class="form-label">${isEn ? 'Style Name (Biểu Tự):' : 'Tên Biểu Tự:'}</label>
              <input type="text" id="title-char-style" class="modal-input" value="${currArch.defaultStyleName || 'Chí Viễn'}" />
            </div>
          </div>

          <div class="title-preview-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: #fde68a; font-size: 12px;">${currArch.nameVi}</strong>
              <span class="tactical-badge tactical-badge--primary">${currArch.startingLocation}</span>
            </div>
            <p style="font-size: 11.5px; color: #cbd5e1; margin: 0 0 8px 0; line-height: 1.5;">${currArch.bioVi}</p>
            <div style="font-size: 11px; color: #38bdf8; margin-bottom: 8px;">
              <b>Hành Trang:</b> ${currArch.startingAssetsVi ? currArch.startingAssetsVi.join(' • ') : 'Không có'}
            </div>
            <div class="title-stat-pills">
              <span>WAR <b>${currArch.attributes?.war || 50}</b></span>
              <span>LDR <b>${currArch.attributes?.ldr || 50}</b></span>
              <span>INT <b>${currArch.attributes?.int || 50}</b></span>
              <span>POL <b>${currArch.attributes?.pol || 50}</b></span>
              <span>COM <b>${currArch.attributes?.com || 50}</b></span>
              <span>CRA <b>${currArch.attributes?.cra || 50}</b></span>
            </div>
          </div>

          <div class="title-single-db-warning">
            ${isEn
              ? 'This replaces the current session. The old save is backed up automatically under saves/backups/.'
              : 'Tạo mới sẽ thay thế phiên hiện tại. Bản cũ được sao lưu tự động trong saves/backups/.'}
          </div>

          <button class="ui-btn ui-btn--primary ui-btn--lg title-launch-btn" onclick="TitleScreenUI.createInstance()" ${isSubmitting ? 'disabled' : ''}>
            ${isEn ? '武 Create New Session & Enter' : '武 Tạo Mới & Vào Game'}
          </button>
        </div>

        <!-- COLUMN 2: THE SINGLE CURRENT SESSION -->
        <div class="title-panel title-panel--load">
          <div class="title-panel-header">
            <span class="title-panel-icon">卷</span>
            <div>
              <h3 class="title-panel-title">${isEn ? '2. CURRENT SESSION' : '2. PHIÊN HIỆN TẠI'}</h3>
              <div class="title-panel-sub">${isEn ? 'One database: saves/session.db' : 'Một database duy nhất: saves/session.db'}</div>
            </div>
          </div>

          ${currentCard}

          <div class="title-single-db-note">
            ${isEn
              ? 'Single-session mode. Creating a new campaign resets the active database in place and reloads the page; no server restart is needed.'
              : 'Chế độ một phiên. Tạo chiến dịch mới sẽ reset database đang chạy tại chỗ rồi tải lại trang; không cần khởi động lại server.'}
          </div>
        </div>
      </div>
    `;
  }

  function selectArchetype(archId) {
    selectedArchetypeId = archId;
    renderTitleScreenContent();
  }

  async function confirmReplaceSession() {
    if (!window.UI || typeof window.UI.confirm !== 'function') return false;
    return window.UI.confirm({
      title: isEnglish() ? 'Start a new campaign' : 'Tạo phiên mới',
      message: isEnglish()
        ? 'This replaces the current session. A backup will be saved to saves/backups/ first.'
        : 'Thao tác này sẽ thay thế phiên hiện tại. Hệ thống sẽ sao lưu bản cũ vào saves/backups/ trước.',
      confirmLabel: isEnglish() ? 'Create & replace' : 'Tạo mới & thay thế',
      danger: true
    });
  }

  async function createInstance() {
    if (isSubmitting) return;
    const nameInput = document.getElementById('title-char-name');
    const styleInput = document.getElementById('title-char-style');
    const name = nameInput ? nameInput.value.trim() : 'Lương Diễn';
    const styleName = styleInput ? styleInput.value.trim() : 'Chí Viễn';

    const confirmed = await confirmReplaceSession();
    if (!confirmed) return;

    isSubmitting = true;
    renderTitleScreenContent();
    try {
      const res = await fetch('/api/game/new-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          styleName,
          archetypeId: selectedArchetypeId
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create session');

      showToast(data.messageVi || 'Đã tạo phiên mới!');
      setTimeout(() => window.location.reload(), 650);
    } catch (err) {
      isSubmitting = false;
      renderTitleScreenContent();
      showToast(`[LỖI] ${err.message}`, true);
    }
  }

  function continueCurrentSession() {
    closeTitleScreen();
    if (typeof window.loadAllData === 'function') {
      window.loadAllData();
    } else {
      window.location.reload();
    }
  }

  function showToast(message, isError = false) {
    if (typeof window.showToast === 'function') {
      window.showToast(message, isError);
    } else {
      console.log(`[TitleScreenUI] ${message}`);
    }
  }

  window.TitleScreenUI = {
    init,
    open: openTitleScreen,
    close: closeTitleScreen,
    selectArchetype,
    createInstance,
    continueCurrentSession
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
