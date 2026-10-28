/**
 * ThreeKingdoms-AgentEngine: Free Enterprise & Labor Modal UI
 * (public/js/enterprise-ui.js)
 *
 * Implements:
 * 1. Tab 1: "Làm Chủ Sản Nghiệp" (Manage Owned Enterprises & Launch New Businesses):
 *    - Lists active businesses (Workshop, Tavern, Apothecary, Blacksmith Forge).
 *    - Real-time revenue tracking, safe cash reserves, monthly rent, and accumulated profits.
 *    - 1-Click Profit Withdrawal ("Rút Lợi Nhuận") with instant ledger reflection.
 *    - In-modal Establishment Drawer for launching new enterprises (Non-blocking, zero prompt()).
 *    - Automatic material check with optional turnkey procurement ("Ủy thác thu mua vật liệu còn thiếu").
 * 2. Tab 2: "Đi Làm Thuê Kiếm Sống" (Work Shifts for Immediate Wages & RPG Progression):
 *    - 6 distinct historical shifts across all disciplines (Craft, Culinary, Herbal, Textile, Mining, Hospitality).
 *    - Real-time stamina meter and fatigue exhaustion guard (cap at 100).
 *    - Sound and toast feedback with immediate top telemetry bar synchronization.
 *
 * Adheres strictly to Universe Architecture v4.0 & Anti-AI-Slop standards.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    root.EnterpriseUI = exports;
    root.openEnterpriseModal = exports.openEnterpriseModal;
    Object.assign(root, exports);
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let currentCharacterId = 'PLY-0001';
  let activeTab = 'work'; // 'work' | 'own'
  let cachedStatus = null;
  let isWorking = false;
  let isSubmitting = false;
  let activeCreationTypeId = null; // typeId currently in establishment panel

  function isEnglish() {
    return (typeof currentLang !== 'undefined' && currentLang === 'en');
  }

  function playUiSound(type = 'click') {
    if (typeof playSfx === 'function') {
      try { playSfx(type); } catch (e) {}
    }
  }

  /**
   * Injects modal styles dynamically into head if not already present
   */
  function ensureStyles() {
    if (document.getElementById('enterprise-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'enterprise-ui-styles';
    style.textContent = `
      #enterprise-manager-modal {
        z-index: 1200;
      }
      .ent-modal-card {
        max-width: 960px;
        width: 95vw;
        max-height: 92vh;
        display: flex;
        flex-direction: column;
        background: #0f172a;
        border: 1px solid var(--border-gold, #b45309);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
        border-radius: 6px;
        overflow: hidden;
      }
      .ent-tabs-bar {
        display: flex;
        background: #090d16;
        border-bottom: 1px solid rgba(217, 119, 6, 0.3);
        padding: 4px 12px 0 12px;
        gap: 6px;
      }
      .ent-tab-btn {
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: #94a3b8;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
      }
      .ent-tab-btn:hover {
        color: #fde68a;
      }
      .ent-tab-btn.active {
        color: #fbbf24;
        border-bottom-color: #fbbf24;
        background: rgba(251, 191, 36, 0.06);
      }
      .ent-fatigue-bar-track {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 3px;
        overflow: hidden;
        margin-top: 6px;
      }
      .ent-fatigue-bar-fill {
        height: 100%;
        transition: width 0.3s ease, background 0.3s ease;
        border-radius: 3px;
      }
      .ent-grid-shifts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 14px;
        margin-bottom: 16px;
      }
      .ent-shift-card {
        background: #1e293b;
        border: 1px solid rgba(148, 163, 184, 0.15);
        border-radius: 6px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: all 0.2s ease;
      }
      .ent-shift-card:hover {
        border-color: rgba(245, 158, 11, 0.4);
        background: #172033;
      }
      .ent-shift-header {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 10px;
      }
      .ent-shift-icon {
        font-size: 14px;
        font-weight: 700;
        font-family: 'Cinzel', serif;
        background: rgba(217, 119, 6, 0.15);
        color: #fbbf24;
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid rgba(217, 119, 6, 0.3);
      }
      .ent-shift-title-block {
        flex: 1;
      }
      .ent-shift-title {
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 2px;
      }
      .ent-shift-workplace {
        font-size: 11px;
        color: #fbbf24;
      }
      .ent-shift-desc {
        font-size: 11px;
        color: #94a3b8;
        line-height: 1.4;
        margin-bottom: 12px;
      }
      .ent-metrics-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }
      .ent-metric-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 4px;
        font-family: 'JetBrains Mono', monospace;
      }
      .ent-metric-pill--wage {
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.35);
        color: #34d399;
        font-weight: 700;
      }
      .ent-metric-pill--fatigue {
        background: rgba(245, 158, 11, 0.15);
        border: 1px solid rgba(245, 158, 11, 0.35);
        color: #fbbf24;
      }
      .ent-metric-pill--exp {
        background: rgba(168, 85, 247, 0.15);
        border: 1px solid rgba(168, 85, 247, 0.35);
        color: #c084fc;
      }
      .ent-metric-pill--attr {
        background: rgba(56, 189, 248, 0.15);
        border: 1px solid rgba(56, 189, 248, 0.35);
        color: #38bdf8;
      }
      .ent-btn {
        background: var(--brand-primary, #b45309);
        border: 1px solid #d97706;
        color: #fff;
        font-weight: 600;
        font-size: 12px;
        padding: 8px 14px;
        border-radius: 4px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.15s ease;
      }
      .ent-btn:hover:not(:disabled) {
        background: #d97706;
        box-shadow: 0 0 10px rgba(217, 119, 6, 0.4);
      }
      .ent-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .ent-btn--outline {
        background: transparent;
        border-color: rgba(148, 163, 184, 0.3);
        color: #94a3b8;
      }
      .ent-btn--outline:hover:not(:disabled) {
        background: rgba(148, 163, 184, 0.1);
        color: #fff;
      }
      .ent-btn--success {
        background: #059669;
        border-color: #10b981;
        color: #fff;
      }
      .ent-btn--success:hover:not(:disabled) {
        background: #10b981;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
      }
      .ent-biz-card {
        background: #1e293b;
        border: 1px solid rgba(217, 119, 6, 0.25);
        border-radius: 6px;
        padding: 14px;
        margin-bottom: 12px;
      }
      .ent-creation-box {
        background: #0b1120;
        border: 1px solid #f59e0b;
        border-radius: 6px;
        padding: 16px;
        margin-bottom: 18px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.6);
      }
      .ent-mat-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11px;
        margin: 2px 4px 2px 0;
      }
      .ent-mat-badge--ok {
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.4);
        color: #34d399;
      }
      .ent-mat-badge--warn {
        background: rgba(245, 158, 11, 0.15);
        border: 1px solid rgba(245, 158, 11, 0.4);
        color: #fbbf24;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Fetches enterprise status from backend or generates robust live fallback
   */
  async function fetchEnterpriseStatus(characterId = currentCharacterId) {
    try {
      const res = await fetch(`/api/enterprise/status?characterId=${encodeURIComponent(characterId)}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.status) {
          cachedStatus = data.status;
          return cachedStatus;
        }
      }
    } catch (err) {
      console.warn('[EnterpriseUI] Backend status notice, generating live status:', err);
    }

    // Fallback: Read player status from /api/status if endpoint unreachable
    try {
      const statusRes = await fetch('/api/status').then(r => r.json());
      const p = statusRes.player || {};
      if (!cachedStatus) {
        cachedStatus = {
          characterId,
          playerCash: Number(p.liquid_cash || 15000),
          playerSafeCash: Number(p.safe_cash || 3000),
          playerFatigue: Number(p.fatigue || 0),
          ownedBusinesses: [],
          activeEnterprises: [],
          totalDailyRevenue: 0,
          totalWorkforce: 0,
          totalAccumulatedProfit: 0,
          openableTypes: [],
          laborShifts: []
        };
      } else {
        cachedStatus.playerCash = Number(p.liquid_cash || cachedStatus.playerCash);
        cachedStatus.playerFatigue = Number(p.fatigue || cachedStatus.playerFatigue);
      }
      return cachedStatus;
    } catch (e) {
      console.error('[EnterpriseUI] Failed to generate status:', e);
      return cachedStatus;
    }
  }

  /**
   * Opens the Enterprise & Labor Modal
   */
  async function openEnterpriseModal(initialTab = 'work') {
    ensureStyles();
    activeTab = initialTab;
    activeCreationTypeId = null;

    let modalEl = document.getElementById('enterprise-manager-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'enterprise-manager-modal';
      modalEl.className = 'modal-backdrop hidden';
      document.body.appendChild(modalEl);
    }

    modalEl.classList.remove('hidden');
    renderEnterpriseLoading();

    await fetchEnterpriseStatus();
    renderModalContent();
  }

  /**
   * Closes the Enterprise modal
   */
  function closeEnterpriseModal() {
    const modalEl = document.getElementById('enterprise-manager-modal');
    if (modalEl) modalEl.classList.add('hidden');
    activeCreationTypeId = null;
  }

  /**
   * Switches tabs (work / own)
   */
  function switchEnterpriseTab(tabKey) {
    activeTab = tabKey;
    renderModalContent();
  }

  /**
   * Renders loading skeleton
   */
  function renderEnterpriseLoading() {
    const modalEl = document.getElementById('enterprise-manager-modal');
    if (!modalEl) return;
    const isEn = isEnglish();
    modalEl.innerHTML = `
      <div class="modal-card ent-modal-card">
        <div class="modal-header" style="background:#090d16; border-bottom:1px solid rgba(217, 119, 6, 0.4); padding: 12px 16px;">
          <h3 class="modal-title" style="color:#fbbf24; font-size:15px; margin:0;">${isEn ? 'Enterprise & Labor Market' : 'Sản Nghiệp & Thị Trường Lao Động'}</h3>
          <button class="modal-close-btn" onclick="EnterpriseUI.closeEnterpriseModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 40px; text-align: center; color: #94a3b8;">
          <span class="pulse-dot"></span> ${isEn ? 'Loading enterprise registries from SQLite...' : 'Đang tải sổ sách sản nghiệp & ca làm từ SQLite...'}
        </div>
      </div>
    `;
  }

  /**
   * Main render function
   */
  function renderModalContent() {
    const modalEl = document.getElementById('enterprise-manager-modal');
    if (!modalEl) return;

    const isEn = isEnglish();
    const st = cachedStatus || {};
    const cash = Number(st.playerCash || 0);
    const p = window.currentScene?.player || {};
    const stamina = st.stamina || (typeof calculateStamina === 'function' ? calculateStamina(p) : {
      maxStamina: 100,
      currentStamina: Math.max(0, 100 - Number(st.playerFatigue || 0)),
      fatigue: Number(st.playerFatigue || 0),
      staminaPct: Math.max(0, 100 - Number(st.playerFatigue || 0))
    });
    const staminaColor = stamina.staminaPct <= 20 ? '#ef4444' : stamina.staminaPct <= 45 ? '#fbbf24' : '#06b6d4';

    modalEl.innerHTML = `
      <div class="modal-card ent-modal-card">
        <!-- MODAL HEADER -->
        <div class="modal-header" style="background:#090d16; border-bottom:1px solid rgba(217, 119, 6, 0.4); padding: 12px 16px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 class="modal-title" style="color:#fbbf24; font-size:15px; margin:0; letter-spacing:0.5px;">
              ${isEn ? 'FREE ENTERPRISE & LABOR MARKET' : 'TỰ DO LẬP NGHIỆP & THỊ TRƯỜNG LAO ĐỘNG'}
            </h3>
            <span style="font-size:11px; color:#94a3b8;">
              ${isEn ? 'Campaign Region: Zhuo County & North Frontier' : 'Địa bàn: Trác Quận • U Châu'} • 
              <strong style="color:#34d399; font-family:'JetBrains Mono',monospace;">${cash.toLocaleString()} Tiền</strong> • 
              <strong style="color:${staminaColor}; font-family:'JetBrains Mono',monospace;" title="Thể Lực khả dụng: ${stamina.currentStamina}/${stamina.maxStamina} | Độ mệt mỏi: ${stamina.fatigue}/100">
                ${stamina.currentStamina}/${stamina.maxStamina} Thể Lực (${stamina.fatigue}/100 Mệt)
              </strong>
            </span>
          </div>
          <button class="modal-close-btn" onclick="EnterpriseUI.closeEnterpriseModal()">&times;</button>
        </div>

        <!-- TABS BAR -->
        <div class="ent-tabs-bar">
          <button class="ent-tab-btn ${activeTab === 'work' ? 'active' : ''}" onclick="EnterpriseUI.switchEnterpriseTab('work')">
            <span>🛠️</span> ${isEn ? 'Daily Labor Shifts' : 'Đi làm thuê kiếm sống'}
          </button>
          <button class="ent-tab-btn ${activeTab === 'own' ? 'active' : ''}" onclick="EnterpriseUI.switchEnterpriseTab('own')">
            <span>🏛️</span> ${isEn ? 'Manage Enterprises' : 'Làm chủ sản nghiệp'}
          </button>
        </div>

        <!-- MODAL BODY -->
        <div class="modal-body" style="overflow-y:auto; padding:16px; max-height:calc(92vh - 120px);">
          ${activeTab === 'work' ? renderLaborTab() : renderEnterpriseTab()}
        </div>

        <!-- MODAL FOOTER -->
        <div class="modal-footer" style="background:#090d16; border-top:1px solid rgba(217, 119, 6, 0.2); padding:10px 16px; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:11px; color:#64748b;">
            ${isEn ? 'Double-entry cashflow ledger ensures 100% financial integrity' : 'Sổ cái kép tự động hạch toán tiền lương và hao mòn thể lực chuẩn xác'}
          </div>
          <button class="ent-btn ent-btn--outline" onclick="EnterpriseUI.closeEnterpriseModal()">
            ${isEn ? 'Close Window' : 'Đóng Cửa Sổ'}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renders Tab 2: Work Shifts ("Đi Làm Thuê Kiếm Sống")
   */
  function renderLaborTab() {
    const isEn = isEnglish();
    const st = cachedStatus || {};
    const shifts = st.laborShifts || [];
    const p = window.currentScene?.player || {};
    const stamina = st.stamina || (typeof calculateStamina === 'function' ? calculateStamina(p) : {
      maxStamina: 100,
      currentStamina: Math.max(0, 100 - Number(st.playerFatigue || 0)),
      fatigue: Number(st.playerFatigue || 0),
      staminaPct: Math.max(0, 100 - Number(st.playerFatigue || 0))
    });
    const staminaColor = stamina.staminaPct <= 20 ? '#ef4444' : stamina.staminaPct <= 45 ? '#fbbf24' : '#06b6d4';

    return `
      <!-- STAMINA METRIC HEADER -->
      <div style="margin-bottom:14px; background:#090d16; border:1px solid rgba(217,119,6,0.25); border-radius:6px; padding:12px 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <h4 style="margin:0; font-size:13px; color:#fbbf24;">
            ${isEn ? 'Daily Labor Market Opportunities in Zhuo County:' : 'Cơ Hội Lao Động Kiếm Sống Hàng Ngày Tại Trác Quận:'}
          </h4>
          <span style="font-size:11.5px; font-family:'JetBrains Mono',monospace;">
            Thể Lực: <strong style="color:${staminaColor};">${stamina.currentStamina}/${stamina.maxStamina}</strong> 
            (Mệt mỏi: <strong style="color:${stamina.fatigue > 80 ? '#ef4444' : '#94a3b8'};">${stamina.fatigue}/100</strong>)
          </span>
        </div>
        <p style="margin:0 0 6px 0; font-size:11px; color:#94a3b8;">
          ${isEn
            ? 'Earn immediate cash wages and increase profession & attribute EXP through physical crafts. Each shift consumes Stamina and accumulates Fatigue.'
            : 'Đem sức lực và tài nghệ đổi lấy tiền công cầm tay, đồng thời rèn luyện tăng điểm EXP nghề nghiệp. Mỗi ca làm tiêu hao Thể Lực và tích lũy Mệt Mỏi.'}
        </p>
        <div class="ent-fatigue-bar-track" title="Thể Lực khả dụng: ${stamina.currentStamina}/${stamina.maxStamina} (${stamina.staminaPct}%)">
          <div class="ent-fatigue-bar-fill" style="width: ${stamina.staminaPct}%; background: ${staminaColor};"></div>
        </div>
      </div>

      <!-- SHIFTS GRID -->
      <div class="ent-grid-shifts">
        ${shifts.map(shift => {
          const reqStamina = shift.staminaCost || shift.fatigueCost || 15;
          const reqFatigue = shift.fatigueCost || shift.staminaCost || 15;
          const wouldExceed = (shift.canPerform !== undefined && !shift.canPerform) ||
            stamina.currentStamina < reqStamina ||
            (stamina.fatigue + reqFatigue > 100);

          return `
            <div class="ent-shift-card">
              <div>
                <div class="ent-shift-header">
                  <span class="ent-shift-icon">${shift.icon || '工'}</span>
                  <div class="ent-shift-title-block">
                    <div class="ent-shift-title">${isEn ? (shift.titleEn || shift.titleVi) : shift.titleVi}</div>
                    <div class="ent-shift-workplace">${isEn ? (shift.workplaceEn || shift.workplaceVi) : shift.workplaceVi}</div>
                  </div>
                </div>

                <div class="ent-shift-desc">
                  ${isEn ? (shift.narrativeEn || shift.narrativeVi) : shift.narrativeVi}
                </div>

                <div class="ent-metrics-row">
                  <span class="ent-metric-pill ent-metric-pill--wage">
                    +${shift.wage} Tiền
                  </span>
                  <span class="ent-metric-pill ent-metric-pill--fatigue" title="Tiêu hao ${reqStamina} Thể Lực, tăng ${reqFatigue} Mệt Mỏi">
                    -${reqStamina} Thể lực (+${reqFatigue} Mệt)
                  </span>
                  <span class="ent-metric-pill ent-metric-pill--exp">
                    +${shift.expGain} EXP Nghề
                  </span>
                  ${shift.attributeTarget ? `
                    <span class="ent-metric-pill ent-metric-pill--attr">
                      +${shift.attributeExp || 10} ${shift.attributeTarget.toUpperCase()}
                    </span>
                  ` : ''}
                </div>
              </div>

              <div style="margin-top:12px;">
                <button class="ent-btn" style="width:100%;" ${wouldExceed || isWorking ? 'disabled' : ''} onclick="EnterpriseUI.takeWorkShift('${shift.shiftId}')">
                  ${isWorking
                    ? (isEn ? 'Working...' : 'Đang làm việc...')
                    : wouldExceed
                    ? (isEn ? 'Exhausted (Rest Needed)' : 'Khí Lực Kiệt Quệ (Cần Nghỉ)')
                    : (isEn ? 'Take Shift' : 'Nhận việc')}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Renders Tab 1: Manage & Open Enterprises ("Làm Chủ Sản Nghiệp")
   */
  function renderEnterpriseTab() {
    const isEn = isEnglish();
    const st = cachedStatus || {};
    const owned = st.ownedBusinesses || st.activeEnterprises || [];
    const openable = st.openableTypes || [];
    const playerCash = Number(st.playerCash || 0);

    return `
      <!-- CURRENTLY OWNED BUSINESSES -->
      <div style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h4 style="margin:0; font-size:13.5px; color:#fbbf24;">
            ${isEn ? 'Currently Managed Enterprises:' : 'Sản nghiệp đang sở hữu & vận hành:'}
          </h4>
          <span style="font-size:11px; color:#94a3b8; font-family:'JetBrains Mono',monospace;">
            ${isEn ? 'Total Daily Revenue:' : 'Tổng Thu Ngày:'} <b style="color:#34d399;">+${(st.totalDailyRevenue || 0).toLocaleString()} Tiền</b>
          </span>
        </div>

        ${owned.length === 0 ? `
          <div style="padding:16px; background:#1e293b; border-radius:6px; color:#94a3b8; font-size:12px; font-style:italic;">
            ${isEn ? 'You currently do not own any enterprises.' : 'Hiện tại bạn chưa làm chủ sản nghiệp nào. Hãy đầu tư mở xưởng mới bên dưới.'}
          </div>
        ` : owned.map(biz => {
          const profit = Number(biz.accumulated_profit || 0);
          const dailyRev = Number(biz.daily_revenue || biz.daily_revenue_avg || 120);

          return `
            <div class="ent-biz-card">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div>
                  <strong style="color:#fff; font-size:14px;">${biz.name}</strong>
                  <div style="font-size:11px; color:#34d399; margin-top:2px;">
                    Mã quản lý: [${biz.business_id}] • Loại hình: ${biz.business_type || 'WORKSHOP'} • Trạng thái: ${biz.status || 'ACTIVE'}
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:11px; color:#fbbf24; background:rgba(251,191,36,0.1); padding:3px 8px; border-radius:4px; border:1px solid rgba(251,191,36,0.3);">
                    Ủy quyền: Bậc ${biz.delegation_level || 2}
                  </span>
                  <button class="ent-btn ent-btn--success" style="padding:4px 10px; font-size:11px;" ${profit <= 0 || isSubmitting ? 'disabled' : ''} onclick="EnterpriseUI.collectEnterpriseProfit('${biz.business_id}')">
                    ${profit > 0 ? `Rút Lợi Nhuận (+${profit.toLocaleString()} Tiền)` : 'Không có thặng dư'}
                  </button>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; font-size:11px; color:#94a3b8; font-family:'JetBrains Mono',monospace; background:rgba(0,0,0,0.25); padding:8px 10px; border-radius:4px;">
                <div>Nhân công: <strong style="color:#fff;">${biz.current_workforce || biz.workforce_count || 4} thợ</strong></div>
                <div>Thu nhập ngày: <strong style="color:#34d399;">+${dailyRev.toLocaleString()} Tiền</strong></div>
                <div>Mặt bằng: <strong style="color:#f59e0b;">${biz.monthly_rent || 200} Tiền/tháng</strong></div>
                <div>Két sắt dự phòng: <strong style="color:#38bdf8;">${(biz.safe_cash || 0).toLocaleString()} Tiền</strong></div>
                <div>Thặng dư tích lũy: <strong style="color:#4ade80;">+${profit.toLocaleString()} Tiền</strong></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- IN-MODAL ESTABLISHMENT FORM (IF OPENED) -->
      ${renderEstablishmentBox()}

      <!-- OPEN NEW ENTERPRISE CATALOG -->
      <div>
        <h4 style="margin:0 0 4px 0; font-size:13.5px; color:#fbbf24;">
          ${isEn ? 'Establish New Commercial & Artisan Enterprises:' : 'Khai trương cơ sở sản nghiệp mới:'}
        </h4>
        <p style="margin:0 0 12px 0; font-size:11px; color:#94a3b8;">
          ${isEn
            ? 'Invest startup capital and raw building materials to establish permanent enterprises in Zhuo County.'
            : 'Đầu tư vốn liếng và vật liệu xây dựng để thiết lập cơ sở sản xuất, tạo thu nhập thụ động mỗi ngày.'}
        </p>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(310px, 1fr)); gap:14px;">
          ${openable.map(bType => {
            const hasCash = playerCash >= bType.startupCash;
            const canAfford = bType.canAffordTurnkey || hasCash;
            const matList = (bType.requiredMaterials || []).map(m => {
              const ok = m.hasEnough || m.available >= m.quantity;
              return `<span class="ent-mat-badge ent-mat-badge--${ok ? 'ok' : 'warn'}">${m.itemNameVi}: ${m.available}/${m.quantity} ${ok ? '[Đủ]' : `(Thiếu ${m.missing})`}</span>`;
            }).join(' ');

            const isSelected = activeCreationTypeId === bType.typeId;

            return `
              <div style="background:#1e293b; border:1px solid ${isSelected ? '#f59e0b' : 'rgba(148,163,184,0.15)'}; border-radius:6px; padding:14px; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                  <div style="margin-bottom:6px; display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                      <strong style="color:#fff; font-size:13px;">${isEn ? bType.titleEn : bType.titleVi}</strong>
                      <div style="font-size:10.5px; color:#fbbf24; margin-top:2px;">
                        Doanh thu ước tính: +${bType.projectedDailyRevenueMin || 100}-${bType.projectedDailyRevenueMax || 200} Tiền/ngày
                      </div>
                    </div>
                    <span style="font-size:12px; font-weight:700; color:#fbbf24; background:rgba(251,191,36,0.1); padding:2px 6px; border-radius:3px;">
                      ${bType.icon || '業'}
                    </span>
                  </div>

                  <p style="font-size:11px; color:#94a3b8; margin:0 0 10px 0; line-height:1.4;">
                    ${bType.descriptionVi}
                  </p>

                  <div style="font-size:11px; background:#090d16; border-radius:4px; padding:8px 10px; margin-bottom:12px; border:1px solid rgba(148,163,184,0.1);">
                    <div style="color:${hasCash ? '#34d399' : '#ef4444'}; margin-bottom:4px;">
                      <strong>Vốn ban đầu:</strong> ${bType.startupCash.toLocaleString()} Tiền (${hasCash ? 'Đủ' : 'Thiếu'})
                    </div>
                    <div style="margin-bottom:4px;">
                      <div style="color:#94a3b8; font-size:10.5px; margin-bottom:2px;">Vật liệu xây dựng:</div>
                      <div>${matList}</div>
                    </div>
                    <div style="color:#94a3b8; font-size:10.5px; margin-top:4px;">
                      Mặt bằng: ${bType.monthlyRent} Tiền/tháng • Tuyển dụng: ${bType.baseWorkforce} thợ
                    </div>
                  </div>
                </div>

                <div>
                  <button class="ent-btn" style="width:100%;" ${canAfford ? '' : 'disabled'} onclick="EnterpriseUI.startOpenBusiness('${bType.typeId}')">
                    ${isSelected ? 'Đang chọn thiết lập ↑' : (isEn ? 'Establish Enterprise' : 'Mở Cơ Sở Này')}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Renders the integrated in-modal establishment drawer/panel
   */
  function renderEstablishmentBox() {
    if (!activeCreationTypeId) return '';
    const st = cachedStatus || {};
    const bType = (st.openableTypes || []).find(t => t.typeId === activeCreationTypeId);
    if (!bType) return '';

    const isEn = isEnglish();
    const playerCash = Number(st.playerCash || 0);
    const hasCash = playerCash >= bType.startupCash;
    const turnkeyCost = bType.effectiveTurnkeyCost || 0;
    const totalCost = bType.hasAllMaterials ? bType.startupCash : (bType.startupCash + turnkeyCost);
    const canAfford = playerCash >= totalCost;

    return `
      <div class="ent-creation-box" id="ent-creation-panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h4 style="margin:0; font-size:14px; color:#fbbf24;">
            ${isEn ? 'Establish Enterprise:' : 'Thiết Lập Khai Trương Sản Nghiệp:'} ${bType.titleVi}
          </h4>
          <button class="ent-btn ent-btn--outline" style="padding:2px 8px; font-size:11px;" onclick="EnterpriseUI.cancelOpenBusiness()">&times; Đóng</button>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px; margin-bottom:12px;">
          <div>
            <label style="display:block; font-size:11px; color:#cbd5e1; margin-bottom:4px;">
              ${isEn ? 'Enterprise Brand Name:' : 'Tên hiệu thương mại cơ sở mới:'}
            </label>
            <input type="text" id="ent-custom-name-input" value="${bType.titleVi} Lương Gia" style="width:100%; box-sizing:border-box; background:#1e293b; border:1px solid #d97706; color:#fff; padding:8px 10px; border-radius:4px; font-size:12px;" />
          </div>

          <div style="font-size:11px; color:#94a3b8; background:rgba(0,0,0,0.3); padding:8px 10px; border-radius:4px;">
            <div style="margin-bottom:4px;">
              Vốn cố định: <strong style="color:#fff;">${bType.startupCash.toLocaleString()} Tiền</strong>
            </div>
            ${!bType.hasAllMaterials ? `
              <div style="color:#f59e0b; margin-bottom:4px;">
                Thiếu vật liệu kho: <strong style="color:#fbbf24;">+${turnkeyCost.toLocaleString()} Tiền</strong> (Ủy thác quan phủ thu mua trọn gói)
              </div>
            ` : `
              <div style="color:#34d399; margin-bottom:4px;">
                Vật liệu kho: <strong>Đầy đủ 100%</strong> (Không mất phụ phí thu mua)
              </div>
            `}
            <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:4px; font-weight:700; color:${canAfford ? '#34d399' : '#ef4444'};">
              Tổng ngân quỹ cần: ${totalCost.toLocaleString()} Tiền (Ví có: ${playerCash.toLocaleString()})
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="ent-btn ent-btn--outline" onclick="EnterpriseUI.cancelOpenBusiness()">
            ${isEn ? 'Cancel' : 'Hủy Bỏ'}
          </button>
          <button class="ent-btn" ${canAfford && !isSubmitting ? '' : 'disabled'} onclick="EnterpriseUI.confirmOpenBusiness()">
            ${isSubmitting ? 'Đang khai trương...' : (isEn ? 'Confirm & Establish' : 'Xác Nhận Khai Trương Ngay')}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Begins business establishment drawer
   */
  function startOpenBusiness(typeId) {
    playUiSound('click');
    activeCreationTypeId = typeId;
    renderModalContent();

    setTimeout(() => {
      const panel = document.getElementById('ent-creation-panel');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const input = document.getElementById('ent-custom-name-input');
      if (input) input.focus();
    }, 50);
  }

  /**
   * Cancels business establishment drawer
   */
  function cancelOpenBusiness() {
    activeCreationTypeId = null;
    renderModalContent();
  }

  /**
   * Confirms opening a business
   */
  async function confirmOpenBusiness() {
    if (isSubmitting || !activeCreationTypeId) return;
    isSubmitting = true;
    playUiSound('click');

    const input = document.getElementById('ent-custom-name-input');
    const customName = input ? input.value.trim() : '';

    try {
      const res = await fetch('/api/enterprise/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: currentCharacterId,
          businessType: activeCreationTypeId,
          customName,
          turnkey: true
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          if (typeof showToast === 'function') {
            showToast(data.messageVi || data.message || 'Khai trương thành công!', false);
          }
          activeCreationTypeId = null;
          if (data.status) {
            cachedStatus = data.status;
          } else {
            await fetchEnterpriseStatus(currentCharacterId);
          }
          activeTab = 'own';
          renderModalContent();
          if (typeof updateTopTelemetry === 'function') updateTopTelemetry();
          return;
        } else {
          if (typeof showToast === 'function') {
            showToast(data.error || 'Khai trương thất bại!', true);
          }
        }
      } else {
        if (typeof showToast === 'function') showToast('Máy chủ phản hồi không hợp lệ!', true);
      }
    } catch (e) {
      console.warn('[EnterpriseUI] Server open business error:', e);
      if (typeof showToast === 'function') showToast(`Lỗi: ${e.message}`, true);
    } finally {
      isSubmitting = false;
      renderModalContent();
    }
  }

  /**
   * Backward compatibility alias
   */
  function openBusinessDialog(typeId, defaultName) {
    startOpenBusiness(typeId);
  }

  /**
   * Collects profit from an owned enterprise
   */
  async function collectEnterpriseProfit(businessId) {
    if (isSubmitting) return;
    isSubmitting = true;
    playUiSound('coins');

    try {
      const res = await fetch('/api/enterprise/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: currentCharacterId,
          businessId
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          if (typeof showToast === 'function') {
            showToast(data.message || `Đã rút +${data.collectedAmount} Tiền lợi nhuận!`, false);
          }
          if (data.status) {
            cachedStatus = data.status;
          } else {
            await fetchEnterpriseStatus(currentCharacterId);
          }
          renderModalContent();
          if (typeof updateTopTelemetry === 'function') updateTopTelemetry();
          return;
        } else {
          if (typeof showToast === 'function') showToast(data.error || 'Rút lợi nhuận thất bại!', true);
        }
      }
    } catch (e) {
      console.warn('[EnterpriseUI] Profit collection notice:', e);
      if (typeof showToast === 'function') showToast(`Lỗi rút lợi nhuận: ${e.message}`, true);
    } finally {
      isSubmitting = false;
      renderModalContent();
    }
  }

  /**
   * Executes a work shift
   */
  async function takeWorkShift(shiftId) {
    if (isWorking) return;
    isWorking = true;
    playUiSound('click');
    const isEn = isEnglish();

    try {
      const res = await fetch('/api/enterprise/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: currentCharacterId,
          shiftId
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          playUiSound('coins');
          if (typeof showToast === 'function') {
            showToast(data.messageVi || data.message || 'Hoàn tất ca làm!', false);
          }
          if (data.status) {
            cachedStatus = data.status;
          } else {
            await fetchEnterpriseStatus(currentCharacterId);
          }
          renderModalContent();
          if (typeof updateTopTelemetry === 'function') updateTopTelemetry();
          return;
        } else {
          if (typeof showToast === 'function') {
            showToast(data.error || 'Ca làm việc thất bại!', true);
          }
          return;
        }
      } else {
        if (typeof showToast === 'function') showToast('Phản hồi máy chủ không hợp lệ!', true);
        return;
      }
    } catch (e) {
      console.warn('[EnterpriseUI] Server labor shift notice:', e);
      if (typeof showToast === 'function') showToast(`Lỗi ca làm: ${e.message}`, true);
    } finally {
      isWorking = false;
      renderModalContent();
    }
  }

  // Auto-init styles on load
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        ensureStyles();
      });
    } else {
      ensureStyles();
    }
  }

  return {
    openEnterpriseModal,
    closeEnterpriseModal,
    switchEnterpriseTab,
    takeWorkShift,
    startOpenBusiness,
    cancelOpenBusiness,
    confirmOpenBusiness,
    openBusinessDialog,
    collectEnterpriseProfit
  };
});
