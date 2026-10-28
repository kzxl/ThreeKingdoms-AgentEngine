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

  function isEnglish() {
    return typeof window.currentLang !== 'undefined' && window.currentLang === 'en';
  }

  function formatNumber(num) {
    return Number(num || 0).toLocaleString('en-US');
  }

  /**
   * Initializes the Title Screen module and handles first-load gate
   */
  async function init() {
    const savedId = localStorage.getItem('current_instance_id') || 'default';
    activeInstanceId = savedId;

    // Check URL parameters for explicit title screen requests
    const urlParams = new URLSearchParams(window.location.search);
    const forceTitle = urlParams.get('screen') === 'title' || urlParams.get('title') === 'true';

    // If first visit or explicit request, open title screen
    if (forceTitle || !localStorage.getItem('current_instance_id')) {
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
      const res = await fetch(`/api/instances?instanceId=${encodeURIComponent(activeInstanceId)}`, {
        headers: { 'x-instance-id': activeInstanceId }
      });
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
          <button id="title-screen-close-btn" class="modal-close-btn" onclick="TitleScreenUI.close()" title="Đóng cửa sổ">&times;</button>
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

    container.innerHTML = `
      <div class="title-screen-grid">
        <!-- COLUMN 1: NEW CAMPAIGN FACTORY -->
        <div class="title-panel title-panel--new">
          <div class="title-panel-header">
            <span class="title-panel-icon">⚔️</span>
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
                    <strong style="color: ${isSelected ? '#fbbf24' : '#f1f5f9'};">${a.nameVi}</strong>
                    <div style="font-size: 10.5px; color: #94a3b8;">${a.startingAge} Tuổi • Vốn: ${formatNumber(a.initialCash)} Tiền ${isPauper ? '<span class="tactical-badge tactical-badge--success" style="font-size:9px; padding:1px 4px; margin-left:4px;">Khuyên Dùng</span>' : ''}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Identity Fields -->
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

          <!-- Live Archetype Preview Box -->
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

          <!-- Start Action Button -->
          <button class="tactical-btn tactical-btn--primary title-launch-btn" onclick="TitleScreenUI.createInstance()">
            ${isEn ? '⚔️ Launch New Campaign & Enter World' : '⚔️ Khởi Lập Phiên Mới & Vào Bản Đồ'}
          </button>
        </div>

        <!-- COLUMN 2: LOAD EXISTING INSTANCES -->
        <div class="title-panel title-panel--load">
          <div class="title-panel-header">
            <span class="title-panel-icon">📜</span>
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
              const isCur = inst.id === activeInstanceId;
              const dateStr = new Date(inst.updatedAt).toLocaleDateString('vi-VN', {
                hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
              });
              return `
                <div class="title-inst-card ${isCur ? 'active-inst-card' : ''}">
                  <div class="title-inst-head">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="title-inst-seal">${inst.name.charAt(0) || '漢'}</span>
                      <div>
                        <strong style="color: #fff; font-size: 13.5px;">${inst.name} (${inst.styleName})</strong>
                        <div style="font-size: 11px; color: #94a3b8;">${inst.archetypeNameVi} • Tuổi: ${inst.age}</div>
                      </div>
                    </div>
                    ${isCur ? '<span class="tactical-badge tactical-badge--primary">Đang Chơi</span>' : ''}
                  </div>

                  <div class="title-inst-body">
                    <div class="title-inst-metric">
                      <span>Lượt: <b>${inst.turnNumber}</b> (${inst.gameDate})</span>
                      <span>Địa bàn: <b>${inst.location}</b></span>
                    </div>
                    <div class="title-inst-metric">
                      <span>Tiền mặt: <b style="color:#fbbf24;">${formatNumber(inst.liquidCash)} Qian</b></span>
                      <span>Lưu lần cuối: <span style="color:#94a3b8;">${dateStr}</span></span>
                    </div>
                  </div>

                  <div class="title-inst-actions">
                    <button class="tactical-btn tactical-btn--primary tactical-btn--sm" onclick="TitleScreenUI.selectInstance('${inst.id}')">
                      ${isCur ? '▶ Tiếp Tục' : 'Tiến Vào'}
                    </button>
                    <button class="tactical-btn tactical-btn--sm" onclick="TitleScreenUI.cloneInstance('${inst.id}')" title="Sao lưu hoặc phân nhánh phiên này">
                      Sao Lưu
                    </button>
                    ${!inst.isDefault ? `
                      <button class="tactical-btn tactical-btn--sm tactical-btn--danger" onclick="TitleScreenUI.deleteInstance('${inst.id}')" title="Xóa phiên chơi này">
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
        body: JSON.stringify({
          name,
          styleName,
          archetypeId: selectedArchetypeId
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create instance');

      showToast(data.messageVi || 'Khởi tạo thành công phiên chơi mới!');
      await selectInstance(data.instanceId);
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    }
  }

  /**
   * Activates an instance and refreshes the in-game state
   */
  async function selectInstance(instanceId) {
    try {
      const res = await fetch('/api/instances/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to select instance');

      activeInstanceId = instanceId;
      localStorage.setItem('current_instance_id', instanceId);

      showToast(data.messageVi || `Đã chuyển sang phiên chơi [${instanceId}]!`);
      closeTitleScreen();

      // Reload entire frontend state
      if (typeof window.loadAllData === 'function') {
        window.loadAllData();
      } else {
        window.location.reload();
      }
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    }
  }

  /**
   * Deletes a non-default instance
   */
  async function deleteInstance(instanceId) {
    if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn phiên chơi [${instanceId}] không? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
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

  // Intercept fetch to automatically append x-instance-id header
  const originalFetch = window.fetch;
  window.fetch = function (url, options = {}) {
    const instId = localStorage.getItem('current_instance_id') || 'default';
    options.headers = options.headers || {};
    if (options.headers instanceof Headers) {
      if (!options.headers.has('x-instance-id')) {
        options.headers.set('x-instance-id', instId);
      }
    } else if (Array.isArray(options.headers)) {
      options.headers.push(['x-instance-id', instId]);
    } else {
      options.headers['x-instance-id'] = instId;
    }
    return originalFetch(url, options);
  };

  // Public API Export
  window.TitleScreenUI = {
    init,
    open: openTitleScreen,
    close: closeTitleScreen,
    selectArchetype,
    createInstance,
    selectInstance,
    deleteInstance,
    cloneInstance,
    getActiveInstanceId: () => activeInstanceId
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
