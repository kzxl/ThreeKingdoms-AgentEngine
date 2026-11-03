/**
 * ThreeKingdoms-AgentEngine: Title Screen & Multi-Instance Landing Modal
 * (public/js/title-screen-ui.js)
 *
 * Implements:
 * 1. Title Screen Launcher on web access (Start Screen Gate)
 * 2. New Campaign Creation with Archetype selection (Default: Thanh Niên Bố Y)
 * 3. Instance Switcher & Save Slot Management (Load, Fork/Clone, Delete)
 * 4. Transparent local storage session persistence
 */

(function () {
  'use strict';

  let cachedInstances = [];
  let cachedArchetypes = [];
  let selectedArchetypeId = 'ARCH-COMMONER-YOUTH';
  let activeInstanceId = 'default';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // SessionClient (public/js/api.js) owns /api/sessions/acquire, heartbeat and
  // release. The title screen only decides which campaign to enter.
  function getClientId() {
    return window.SessionClient ? window.SessionClient.ownerId() : '';
  }

  function getClientLabel() {
    const id = getClientId();
    return id ? `Khách-${id.replace(/-/g, '').slice(0, 4)}` : 'Khách';
  }

  function handleLeaseLost(message) {
    showToast(message || 'Phiên đã bị client khác tiếp quản.', true);
    setTimeout(() => {
      if (window.TitleScreenUI && typeof window.TitleScreenUI.open === 'function') {
        window.TitleScreenUI.open();
      }
    }, 700);
  }

  window.addEventListener('sim:session-lock-lost', () => handleLeaseLost('Phiên đã bị client khác tiếp quản.'));
  window.addEventListener('sim:session-version-conflict', () => {
    showToast('Dữ liệu phiên đã thay đổi, hãy tải lại trạng thái.', true);
  });

  function isEnglish() {
    return typeof window.currentLang !== 'undefined' && window.currentLang === 'en';
  }

  function formatNumber(num) {
    return Number(num || 0).toLocaleString('en-US');
  }

  /**
   * Initializes the Title Screen module and handles first-load gate
   */
  /**
   * Product default: every load of the game address starts at instance
   * selection, so the player explicitly chooses which playthrough to enter.
   * Flip to false to restore "skip the gate for a returning session".
   */
  const ALWAYS_SHOW_INSTANCE_GATE = true;

  async function init() {
    const savedId = localStorage.getItem('current_instance_id') || 'default';
    activeInstanceId = savedId;

    // Check URL parameters for explicit title screen requests
    const urlParams = new URLSearchParams(window.location.search);
    const forceTitle = urlParams.get('screen') === 'title' || urlParams.get('title') === 'true';

    if (ALWAYS_SHOW_INSTANCE_GATE || forceTitle || !localStorage.getItem('current_instance_id')) {
      // The gate is not dismissible on entry: an instance must be selected.
      await openTitleScreen(true);
    }
  }

  /**
   * Opens the Title Screen modal
   */
  async function openTitleScreen(isFirstGate = false) {
    let modal = document.getElementById('title-screen-modal');
    if (!modal) {
      createTitleScreenModalDOM();
      modal = document.getElementById('title-screen-modal');
    }

    modal.classList.remove('hidden');

    // Hide close button if user hasn't selected any instance yet
    const closeBtn = document.getElementById('title-screen-close-btn');
    if (closeBtn) {
      closeBtn.style.display = isFirstGate ? 'none' : 'block';
    }

    await fetchInstancesAndArchetypes();
    renderTitleScreenContent();
  }

  /**
   * Closes the Title Screen modal
   */
  function closeTitleScreen() {
    const modal = document.getElementById('title-screen-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /**
   * Fetches all instances and archetype presets from the backend
   */
  async function fetchInstancesAndArchetypes() {
    try {
      const res = await fetch('/api/instances');
      const data = await res.json();
      if (data.success) {
        cachedInstances = data.instances || [];
        cachedArchetypes = data.archetypes || [];
        if (data.currentInstanceId) {
          activeInstanceId = data.currentInstanceId;
        }
      }
    } catch (err) {
      console.warn('[TitleScreenUI] Failed to fetch instances:', err);
    }
  }

  /**
   * Creates the modal markup shell in the DOM if absent
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
              <div class="title-screen-subtitle">Three Kingdoms Tactical Simulation • Quản Lý Đa Phiên Chơi (Multi-Instance Engine)</div>
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
   * Renders the 2-column layout: [1. New Campaign] vs [2. Load Instance]
   */
  function renderTitleScreenContent() {
    const container = document.getElementById('title-screen-body');
    if (!container) return;

    const isEn = isEnglish();
    const currArch = cachedArchetypes.find(a => a.id === selectedArchetypeId) || cachedArchetypes[0] || {
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

    const restartNotice = '';

    container.innerHTML = `
      <div class="title-screen-grid">
        ${restartNotice}
        <!-- COLUMN 1: NEW CAMPAIGN FACTORY -->
        <div class="title-panel title-panel--new">
          <div class="title-panel-header">
            <span class="title-panel-icon">武</span>
            <div>
              <h3 class="title-panel-title">${isEn ? '1. START NEW CAMPAIGN' : '1. KHỞI LẬP CƠ NGHIỆP MỚI'}</h3>
              <div class="title-panel-sub">${isEn ? 'Create a fresh isolated playthrough instance' : 'Khởi tạo một phiên chơi độc lập mới từ đầu'}</div>
            </div>
          </div>

          <!-- Archetype Selection Cards -->
          <div class="title-section-label">${isEn ? 'Starting Archetype (Default: Penniless Commoner):' : 'Thân Phận Khởi Đầu (Mặc định: Thanh Niên Tay Trắng):'}</div>
          <div class="title-archetype-selector">
            ${cachedArchetypes.map(a => {
              const isSelected = a.id === selectedArchetypeId;
              const isPauper = a.id === 'ARCH-COMMONER-YOUTH';
              return `
                <div class="title-arch-btn ${isSelected ? 'active' : ''}" onclick="TitleScreenUI.selectArchetype('${a.id}')">
                  <span class="title-arch-seal">${a.seal || '士'}</span>
                  <div class="title-arch-text">
                    <strong class="title-arch-name ${isSelected ? 'is-selected' : ''}">${a.nameVi}</strong>
                    <div class="title-arch-meta">${a.startingAge} Tuổi • Vốn: ${formatNumber(a.initialCash)} Quan ${isPauper ? '<span class="tactical-badge tactical-badge--success title-badge-recommend">Khuyên Dùng</span>' : ''}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Identity Fields -->
          <div class="title-identity-grid">
            <div class="form-group">
              <label class="form-label">${isEn ? 'Character Name:' : 'Họ Tên Nhân Vật:'}</label>
              <input type="text" id="title-char-name" class="modal-input" value="${currArch.defaultName || 'Lương Diễn'}" />
            </div>
            <div class="form-group">
              <label class="form-label">${isEn ? 'Style Name (Biểu Tự):' : 'Tên Biểu Tự:'}</label>
              <input type="text" id="title-char-style" class="modal-input" value="${currArch.defaultStyleName || 'Chí Viễn'}" />
            </div>
          </div>

          <!-- Live Archetype Preview Box -->
          <div class="title-preview-box">
            <div class="title-preview-head">
              <strong class="title-preview-name">${currArch.nameVi}</strong>
              <span class="tactical-badge tactical-badge--primary">${currArch.startingLocation}</span>
            </div>
            <p class="title-preview-bio">${currArch.bioVi}</p>
            <div class="title-preview-assets">
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

          <!-- Start Action Button -->
          <button class="ui-btn ui-btn--primary ui-btn--lg title-launch-btn" onclick="TitleScreenUI.createInstance()">
            ${isEn ? '武 Launch New Campaign & Enter World' : '武 Khởi Lập Phiên Mới & Vào Bản Đồ'}
          </button>
        </div>

        <!-- COLUMN 2: LOAD EXISTING INSTANCES -->
        <div class="title-panel title-panel--load">
          <div class="title-panel-header">
            <span class="title-panel-icon">卷</span>
            <div>
              <h3 class="title-panel-title">${isEn ? '2. LOAD EXISTING INSTANCES' : '2. CHỌN LẠI CÁC PHIÊN ĐÃ LƯU'}</h3>
              <div class="title-panel-sub">${isEn ? `${cachedInstances.length} Saved Playthrough Slots Available` : `Hiện có ${cachedInstances.length} phiên chơi độc lập đã lưu`}</div>
            </div>
          </div>

          <div class="title-instances-list">
            ${cachedInstances.length === 0 ? `
              <div class="title-empty-state">
                <p>${isEn ? 'No saved instances found. Start a new campaign on the left!' : 'Chưa có phiên lưu nào. Hãy bắt đầu chiến dịch mới ở cột bên trái!'}</p>
              </div>
            ` : cachedInstances.map(inst => {
              const lease = inst.lease || null;
              const leaseActive = Boolean(lease && lease.active);
              const mine = leaseActive && lease.clientId === getClientId();
              const holder = leaseActive ? (lease.clientLabel || lease.clientId || 'client khác') : '';
              const dateStr = new Date(inst.updatedAt).toLocaleDateString('vi-VN', {
                hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
              });
              return `
                <div class="title-inst-card ${leaseActive ? 'active-inst-card' : ''}">
                  <div class="title-inst-head">
                    <div class="title-inst-name-row">
                      <span class="title-inst-seal">${inst.name.charAt(0) || '漢'}</span>
                      <div>
                        <strong class="title-inst-name">${inst.name} (${inst.styleName})</strong>
                        <div class="title-inst-meta">${inst.archetypeNameVi} • Tuổi: ${inst.age}</div>
                        ${inst.ownerLabel ? `<div class="title-inst-owner">Chủ: ${escapeHtml(inst.ownerLabel)}</div>` : ''}
                      </div>
                    </div>
                    ${leaseActive
                      ? `<span class="tactical-badge tactical-badge--primary" title="Lease hết hạn lúc ${escapeHtml(lease.expiresAt)}">${mine ? 'Bạn đang giữ' : `Đang chơi: ${escapeHtml(holder)}`}</span>`
                      : '<span class="tactical-badge">Trống</span>'}
                  </div>

                  <div class="title-inst-body">
                    <div class="title-inst-metric">
                      <span>Lượt: <b>${inst.turnNumber}</b> (${inst.gameDate})</span>
                      <span>Địa bàn: <b>${inst.location}</b></span>
                    </div>
                    <div class="title-inst-metric">
                      <span>Tiền mặt: <b class="title-inst-cash">${formatNumber(inst.liquidCash)} quan</b></span>
                      <span>Lưu lần cuối: <span class="title-inst-date">${dateStr}</span></span>
                    </div>
                  </div>

                  <div class="title-inst-actions">
                    <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="TitleScreenUI.selectInstance('${inst.id}')">
                      ${leaseActive && !mine ? 'Tiếp Quản' : (mine ? '▶ Tiếp Tục' : 'Tiến Vào')}
                    </button>
                    <button class="ui-btn ui-btn--secondary ui-btn--sm" onclick="TitleScreenUI.cloneInstance('${inst.id}')" title="Sao lưu hoặc phân nhánh phiên này">
                      Sao Lưu
                    </button>
                    ${!inst.isDefault ? `
                      <button class="ui-btn ui-btn--danger ui-btn--sm" onclick="TitleScreenUI.deleteInstance('${inst.id}')" title="Xóa phiên chơi này">
                        Xóa
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Updates selected archetype and refreshes preview
   */
  function selectArchetype(archId) {
    selectedArchetypeId = archId;
    renderTitleScreenContent();
  }

  /**
   * Creates a new instance from the configured archetype
   */
  async function createInstance() {
    const nameInput = document.getElementById('title-char-name');
    const styleInput = document.getElementById('title-char-style');
    const name = nameInput ? nameInput.value.trim() : 'Lương Diễn';
    const styleName = styleInput ? styleInput.value.trim() : 'Chí Viễn';

    try {
      const res = await fetch('/api/instances/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, styleName, archetypeId: selectedArchetypeId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create instance');

      showToast(data.messageVi || 'Khởi tạo thành công phiên chơi mới!');
      await selectInstance(data.instanceId);
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    }
  }

  async function enterSession(lease) {
    activeInstanceId = lease.sessionId;
    localStorage.setItem('current_instance_id', lease.sessionId);
    showToast(`Đã vào phiên [${lease.name || lease.sessionId}]!`);
    closeTitleScreen();

    if (typeof window.loadAllData === 'function') {
      window.loadAllData();
    } else {
      window.location.reload();
    }
  }

  /**
   * Acquires the play lease through SessionClient. A held lease requires an
   * explicit take-over; there is no auth yet, so the holder is only a label.
   */
  async function selectInstance(instanceId, force = false) {
    if (!window.SessionClient) {
      showToast('SessionClient chưa sẵn sàng, hãy tải lại trang.', true);
      return;
    }
    try {
      const data = await window.SessionClient.acquire(instanceId, force);
      const known = cachedInstances.find(inst => inst.id === instanceId);
      await enterSession({ ...data, sessionId: instanceId, name: known?.name });
    } catch (err) {
      if (err.code === 'SESSION_LOCKED') {
        const holderId = err.holder?.ownerId || '';
        const holder = holderId ? `Khách-${String(holderId).replace(/-/g, '').slice(0, 4)}` : 'client khác';
        if (!window.UI || typeof window.UI.confirm !== 'function') {
          showToast(`Phiên đang được chơi bởi ${holder}.`, true);
          return;
        }
        const confirmed = await window.UI.confirm({
          title: isEnglish() ? 'Session in use' : 'Phiên đang được chơi',
          message: isEnglish()
            ? `${holder} is holding this save. Taking over will disconnect them.`
            : `${holder} đang giữ phiên này. Tiếp quản sẽ ngắt phiên của họ.`,
          confirmLabel: isEnglish() ? 'Take over' : 'Tiếp quản',
          danger: true
        });
        if (confirmed) return selectInstance(instanceId, true);
        return;
      }
      showToast(`[LỖI] ${err.message}`, true);
    }
  }

  /**
   * Deletes a non-default instance
   */
  async function deleteInstance(instanceId) {
    const message = `Bạn có chắc chắn muốn xóa vĩnh viễn phiên chơi [${instanceId}] không? Hành động này không thể hoàn tác.`;
    if (!window.UI || typeof window.UI.confirm !== 'function') return;
    const confirmed = await window.UI.confirm({
      title: 'Xóa phiên chơi',
      message,
      confirmLabel: 'Xóa vĩnh viễn',
      danger: true
    });
    if (!confirmed) {
      return;
    }

    try {
      if (window.SessionClient && window.SessionClient.getSession().id === instanceId) {
        await window.SessionClient.release();
      }
      const res = await fetch(`/api/instances/${encodeURIComponent(instanceId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete instance');

      showToast(data.messageVi || 'Đã xóa phiên chơi thành công!');

      // If active instance was deleted, reset to default
      if (activeInstanceId === instanceId) {
        activeInstanceId = 'default';
        localStorage.setItem('current_instance_id', 'default');
      }

      await fetchInstancesAndArchetypes();
      renderTitleScreenContent();
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    }
  }

  /**
   * Clones an existing instance into a new save slot
   */
  async function cloneInstance(sourceId) {
    const label = prompt('Nhập nhãn ghi chú cho nhánh sao lưu mới (tùy chọn):', 'Nhánh thử nghiệm');
    if (label === null) return; // cancelled

    try {
      const res = await fetch('/api/instances/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, newLabel: label })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to clone instance');

      showToast(data.messageVi || 'Đã nhân bản nhánh chơi thành công!');
      await fetchInstancesAndArchetypes();
      renderTitleScreenContent();
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    }
  }

  function showToast(msg, isError = false) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, isError);
    } else {
      alert(msg);
    }
  }

  // SessionClient (api.js) owns the fetch headers, heartbeat and release.


  // Public API Export
  window.TitleScreenUI = {
    init,
    open: openTitleScreen,
    close: closeTitleScreen,
    selectArchetype,
    createInstance,
    selectInstance,
    enterSession,
    deleteInstance,
    cloneInstance,
    getActiveInstanceId: () => activeInstanceId,
    getClientId,
    getClientLabel
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
