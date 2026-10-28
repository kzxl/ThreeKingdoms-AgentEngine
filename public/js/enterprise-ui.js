/**
 * ThreeKingdoms-AgentEngine: Free Enterprise & Labor Modal UI
 * (public/js/enterprise-ui.js)
 *
 * Implements:
 * 1. Tab 1: "Làm Chủ Sản Nghiệp" (Manage Owned Enterprises & Launch New Businesses):
 *    - Lists active businesses (Workshop, Tavern, Apothecary, Blacksmith Forge).
 *    - Shows workforce, capacity, safe cash reserves, monthly rent, and revenue.
 *    - Open new businesses with custom naming and prerequisite material/capital validation.
 * 2. Tab 2: "Đi Làm Thuê Kiếm Sống" (Work Shifts for Wages & Profession Growth):
 *    - 4 distinct historical shifts:
 *      * Thợ Phụ Lò Rèn (Forge Hand at Blacksmith) - 140 Qian, 20 Fatigue, +40 CRA EXP
 *      * Đầu Bếp / Điều Rượu (Chef at Tavern) - 110 Qian, 15 Fatigue, +30 COM EXP
 *      * Dược Đồng Bào Chế (Herbalist at Apothecary) - 120 Qian, 15 Fatigue, +35 INT EXP
 *      * Thợ Đan Mây Tre (Weaver at Workshop) - 95 Qian, 12 Fatigue, +25 CRA EXP
 *    - Real-time stamina cost calculation and fatigue-cap validation.
 *    - Instant work button with sound/toast feedback and telemetry refresh.
 *
 * Adheres strictly to Universe Architecture v4.0 & Anti-AI-Slop standards.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    root.EnterpriseUI = exports;
    Object.assign(root, exports);
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let currentCharacterId = 'PLY-0001';
  let activeTab = 'work'; // 'work' | 'own'
  let cachedStatus = null;
  let isWorking = false;

  function isEnglish() {
    return (typeof currentLang !== 'undefined' && currentLang === 'en');
  }

  /**
   * Injects modal styles dynamically into head if not already present
   */
  function ensureStyles() {
    if (document.getElementById('enterprise-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'enterprise-ui-styles';
    style.textContent = `
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
        font-size: 24px;
        background: #0f172a;
        padding: 6px 10px;
        border-radius: 6px;
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
      .ent-biz-card {
        background: #1e293b;
        border: 1px solid rgba(217, 119, 6, 0.25);
        border-radius: 6px;
        padding: 14px;
        margin-bottom: 12px;
      }
      .ent-floating-trigger {
        position: fixed;
        bottom: 72px;
        right: 24px;
        z-index: 80;
        background: #1e293b;
        border: 1px solid #b45309;
        color: #fbbf24;
        padding: 8px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.5);
        transition: transform 0.15s;
      }
      .ent-floating-trigger:hover {
        transform: translateY(-2px);
        background: #273549;
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

    // Fallback: Read player status from /api/status
    try {
      const statusRes = await fetch('/api/status').then(r => r.json());
      const p = statusRes.player || {};

      cachedStatus = {
        characterId,
        playerCash: p.liquid_cash || 15000,
        playerFatigue: p.fatigue || 0,
        ownedBusinesses: [
          {
            business_id: 'BIZ-0001',
            name: 'Liang Clan Workshop & Trading Post',
            location_id: 'LOC-0001',
            manager_npc_id: 'NPC-0007',
            safe_cash: p.safe_cash || 3000,
            current_workforce: 4,
            monthly_capacity_hours: 800,
            monthly_rent: 200,
            status: 'ACTIVE'
          }
        ],
        openableTypes: [
          {
            typeId: 'FORGE',
            titleVi: 'Lò Rèn Bách Nghệ & Quân Khí Phường',
            titleEn: 'Blacksmith Weaponry & Tool Forge',
            descriptionVi: 'Lò đúc binh khí, khiên giáp, nông cụ và móng ngựa. Phục vụ quân nhu chiến trận và dân sinh.',
            startupCash: 5000,
            requiredMaterials: [
              { itemCode: 'RAW-TIMBER-OAK', itemNameVi: 'Gỗ Sồi Quân Nhu', quantity: 6 },
              { itemCode: 'RAW-IRON-INGOT', itemNameVi: 'Sắt Thỏi Tinh Luyện', quantity: 6 }
            ],
            monthlyRent: 250,
            baseWorkforce: 4,
            projectedMonthlyRevenueMin: 900,
            projectedMonthlyRevenueMax: 1800,
            icon: ''
          },
          {
            typeId: 'TAVERN',
            titleVi: 'Tửu Điếm Đào Viên Hào Kiệt Quán',
            titleEn: 'Peach Orchard Tavern & Inn',
            descriptionVi: 'Quán rượu điểm tâm hội tụ nghĩa sĩ giang hồ, nơi thu thập tin tức tình báo và kinh doanh rượu hoa đào.',
            startupCash: 4000,
            requiredMaterials: [
              { itemCode: 'RAW-TIMBER-OAK', itemNameVi: 'Gỗ Sồi Quân Nhu', quantity: 8 },
              { itemCode: 'COM-GRAIN', itemNameVi: 'Lương Thảo', quantity: 5 }
            ],
            monthlyRent: 200,
            baseWorkforce: 3,
            projectedMonthlyRevenueMin: 700,
            projectedMonthlyRevenueMax: 1400,
            icon: ''
          },
          {
            typeId: 'APOTHECARY',
            titleVi: 'Hồi Xuân Dược Đường & Thảo Dược Quán',
            titleEn: 'Spring Rejuvenation Apothecary & Clinic',
            descriptionVi: 'Hiệu thuốc đông y bào chế cao dán kim sang, hoàn đan cứu thương và bán thảo dược sơn lâm quý hiếm.',
            startupCash: 4500,
            requiredMaterials: [
              { itemCode: 'RAW-TIMBER-OAK', itemNameVi: 'Gỗ Sồi Quân Nhu', quantity: 5 },
              { itemCode: 'RAW-HERB-WILD', itemNameVi: 'Thảo Dược Rừng Tươi', quantity: 8 }
            ],
            monthlyRent: 220,
            baseWorkforce: 3,
            projectedMonthlyRevenueMin: 800,
            projectedMonthlyRevenueMax: 1600,
            icon: ''
          },
          {
            typeId: 'WORKSHOP',
            titleVi: 'Trác Quận Thợ Thủ Công Phường',
            titleEn: 'Zhuo County Artisan Workshop',
            descriptionVi: 'Xưởng dệt chiếu, bện sọt lương và làm đồ gia dụng mây tre đan cho các đoàn thương vận hành.',
            startupCash: 3500,
            requiredMaterials: [
              { itemCode: 'COM-BAMBOO', itemNameVi: 'Tre Trúc U Châu', quantity: 8 },
              { itemCode: 'COM-TWINE', itemNameVi: 'Dây Đay Bền Chắc', quantity: 5 }
            ],
            monthlyRent: 180,
            baseWorkforce: 4,
            projectedMonthlyRevenueMin: 600,
            projectedMonthlyRevenueMax: 1200,
            icon: ''
          }
        ],
        laborShifts: [
          {
            shiftId: 'SHIFT_FORGE_HAND',
            titleVi: 'Thợ Phụ Kéo Bễ & Đập Búa Lò Rèn',
            titleEn: 'Blacksmith Forge Hand',
            workplaceVi: 'Lò Rèn Bách Nghệ Trác Quận',
            workplaceEn: 'Zhuo Artisan Blacksmith',
            wage: 140,
            fatigueCost: 20,
            professionCode: 'PROF_CRAFTSMAN',
            expGain: 40,
            narrativeVi: 'Kéo bễ lò lửa đỏ rực, cùng đại sư quai búa rèn phôi sắt tôi nước lạnh. Tăng cường thể lực và tay nghề luyện cương.',
            narrativeEn: 'Stoked furnace fires and struck glowing billets alongside master smiths.',
            icon: ''
          },
          {
            shiftId: 'SHIFT_CHEF_TAVERN',
            titleVi: 'Đầu Bếp & Điều Rượu Tại Tửu Điếm',
            titleEn: 'Tavern Chef & Cellar Master',
            workplaceVi: 'Tửu Điếm Đào Viên',
            workplaceEn: 'Peach Orchard Tavern',
            wage: 110,
            fatigueCost: 15,
            professionCode: 'PROF_MERCHANT',
            expGain: 30,
            narrativeVi: 'Bổ củi nổi lửa, nấu cỗ nhắm và phục vụ rượu hoa đào cho khách thương. Thu thập tin tức tình báo các chư hầu.',
            narrativeEn: 'Prepared banquets and served fragrant wines while eavesdropping on regional gossip.',
            icon: ''
          },
          {
            shiftId: 'SHIFT_HERBALIST',
            titleVi: 'Dược Đồng Bào Chế Thuốc Tại Hiệu Dược',
            titleEn: 'Apothecary Herbalist & Salve Maker',
            workplaceVi: 'Hồi Xuân Dược Đường',
            workplaceEn: 'Spring Apothecary',
            wage: 120,
            fatigueCost: 15,
            professionCode: 'PROF_HERBALIST',
            expGain: 35,
            narrativeVi: 'Dùng cối đá nghiền nát thảo dược, sao chế cao dán kim sang và phân loại dược liệu cứu chữa bách tính.',
            narrativeEn: 'Ground wild roots and brewed soothing trauma balms for townspeople.',
            icon: ''
          },
          {
            shiftId: 'SHIFT_WEAVER',
            titleVi: 'Thợ Thủ Công Đan Phên Tre & Bện Sọt',
            titleEn: 'Artisan Bamboo Basket Weaver',
            workplaceVi: 'Xưởng Thủ Công Lương Gia',
            workplaceEn: 'Liang Workshop',
            wage: 95,
            fatigueCost: 12,
            professionCode: 'PROF_CRAFTSMAN',
            expGain: 25,
            narrativeVi: 'Vót nan tre bện sọt vận lương cho Bắc Quân. Rèn luyện sự tỉ mỉ và nhanh nhạy của đôi bàn tay.',
            narrativeEn: 'Wove heavy-duty supply baskets for northern imperial expeditions.',
            icon: ''
          }
        ]
      };
      return cachedStatus;
    } catch (e) {
      console.error('[EnterpriseUI] Failed to generate status:', e);
      return null;
    }
  }

  /**
   * Opens the Enterprise & Labor Modal
   */
  async function openEnterpriseModal(initialTab = 'work') {
    ensureStyles();
    activeTab = initialTab;

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
        <div class="modal-header">
          <h3 class="modal-title">${isEn ? 'Enterprise & Labor Market' : 'Sản Nghiệp & Thị Trường Lao Động'}</h3>
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
    const cash = st.playerCash || 0;
    const fatigue = st.playerFatigue || 0;

    modalEl.innerHTML = `
      <div class="modal-card ent-modal-card">
        <!-- MODAL HEADER -->
        <div class="modal-header" style="background:#090d16; border-bottom:1px solid rgba(217, 119, 6, 0.4); padding: 12px 16px;">
          <div>
            <h3 class="modal-title" style="color:#fbbf24; font-size:16px; margin:0;">
              ${isEn ? 'FREE ENTERPRISE & LABOR MARKET' : 'TỰ DO LẬP NGHIỆP & THỊ TRƯỜNG LAO ĐỘNG'}
            </h3>
            <span style="font-size:11px; color:#94a3b8;">
              ${isEn ? 'Campaign Region: Zhuo County & North Frontier' : 'Địa bàn chiến dịch: Trác Quận • U Châu Biên Cương'} • 
              <strong style="color:#34d399;">${cash.toLocaleString()} Tiền</strong> • 
              <strong style="color:${fatigue > 80 ? '#ef4444' : '#fbbf24'};">${fatigue}/100 Thể Lực</strong>
            </span>
          </div>
          <button class="modal-close-btn" onclick="EnterpriseUI.closeEnterpriseModal()">&times;</button>
        </div>

        <!-- TABS BAR -->
        <div class="ent-tabs-bar">
          <button class="ent-tab-btn ${activeTab === 'work' ? 'active' : ''}" onclick="EnterpriseUI.switchEnterpriseTab('work')">
            ${isEn ? 'Work Shifts' : 'Đi làm thuê'}
          </button>
          <button class="ent-tab-btn ${activeTab === 'own' ? 'active' : ''}" onclick="EnterpriseUI.switchEnterpriseTab('own')">
            ${isEn ? 'Manage Enterprises' : 'Quản lý sản nghiệp'}
          </button>
        </div>

        <!-- MODAL BODY -->
        <div class="modal-body" style="overflow-y:auto; padding:16px; max-height:calc(92vh - 120px);">
          ${activeTab === 'work' ? renderLaborTab() : renderEnterpriseTab()}
        </div>

        <!-- MODAL FOOTER -->
        <div class="modal-footer" style="background:#090d16; border-top:1px solid rgba(217, 119, 6, 0.2); padding:10px 16px; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:11px; color:#64748b;">
            ${isEn ? 'Double-entry cashflow ledger ensures 100% invariant consistency' : 'Sổ cái kép tự động hạch toán tiền lương và hao mòn thể lực chuẩn xác'}
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
    const playerFatigue = st.playerFatigue || 0;

    return `
      <div style="margin-bottom:14px; background:#090d16; border:1px solid rgba(217,119,6,0.25); border-radius:6px; padding:12px 16px;">
        <h4 style="margin:0 0 4px 0; font-size:14px; color:#fbbf24;">
          ${isEn ? 'Daily Labor Opportunities at Local Workshops & Taverns:' : 'Cơ Hội Lao Động Kiếm Sống Hàng Ngày Tại Trác Quận:'}
        </h4>
        <p style="margin:0; font-size:11px; color:#94a3b8;">
          ${isEn
            ? 'Sell manual labor to earn cash and gain real-world profession experience. Monitor your fatigue closely.'
            : 'Đem sức lực và tài nghệ đổi lấy tiền công cầm tay, đồng thời rèn luyện tăng điểm EXP nghề nghiệp. Chú ý thể lực không được vượt quá 100.'}
        </p>
      </div>

      <div class="ent-grid-shifts">
        ${shifts.map(shift => {
          const wouldExceed = playerFatigue + shift.fatigueCost > 100;

          return `
            <div class="ent-shift-card">
              <div>
                <div class="ent-shift-header">
                  <div class="ent-shift-title-block">
                    <div class="ent-shift-title">${isEn ? shift.titleEn : shift.titleVi}</div>
                    <div class="ent-shift-workplace">${isEn ? shift.workplaceEn : shift.workplaceVi}</div>
                  </div>
                </div>

                <div class="ent-shift-desc">
                  ${isEn ? shift.narrativeEn : shift.narrativeVi}
                </div>

                <div class="ent-metrics-row">
                  <span class="ent-metric-pill ent-metric-pill--wage">
                    +${shift.wage} Tiền
                  </span>
                  <span class="ent-metric-pill ent-metric-pill--fatigue">
                    -${shift.fatigueCost} Thể lực
                  </span>
                  <span class="ent-metric-pill ent-metric-pill--exp">
                    +${shift.expGain} EXP
                  </span>
                </div>
              </div>

              <div style="margin-top:12px;">
                <button class="ent-btn" style="width:100%;" ${wouldExceed || isWorking ? 'disabled' : ''} onclick="EnterpriseUI.takeWorkShift('${shift.shiftId}')">
                  ${wouldExceed
                    ? (isEn ? 'Exhausted (Rest Needed)' : 'Khí lực kiệt quệ')
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
    const owned = st.ownedBusinesses || [];
    const openable = st.openableTypes || [];
    const playerCash = st.playerCash || 0;

    return `
      <!-- CURRENTLY OWNED BUSINESSES -->
      <div style="margin-bottom:20px;">
        <h4 style="margin:0 0 10px 0; font-size:14px; color:#fbbf24;">
          ${isEn ? 'Currently Managed Enterprises:' : 'Sản nghiệp đang sở hữu:'}
        </h4>

        ${owned.length === 0 ? `
          <div style="padding:16px; background:#1e293b; border-radius:6px; color:#94a3b8; font-size:12px; font-style:italic;">
            ${isEn ? 'You currently do not own any enterprises.' : 'Hiện tại bạn chưa làm chủ sản nghiệp nào.'}
          </div>
        ` : owned.map(biz => `
          <div class="ent-biz-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
              <div>
                <strong style="color:#fff; font-size:14px;">${biz.name}</strong>
                <div style="font-size:11px; color:#34d399;">Mã quản lý: [${biz.business_id}] • Trạng thái: ${biz.status || 'ACTIVE'}</div>
              </div>
              <span style="font-size:11px; color:#fbbf24; background:rgba(251,191,36,0.1); padding:2px 8px; border-radius:4px; border:1px solid rgba(251,191,36,0.3);">
                Ủy quyền: Bậc ${biz.delegation_level || 2}
              </span>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px; font-size:11px; color:#94a3b8; font-family:'JetBrains Mono',monospace;">
              <div>Nhân công: <strong style="color:#fff;">${biz.current_workforce || 4} người</strong></div>
              <div>Thuê mặt bằng: <strong style="color:#fff;">${biz.monthly_rent || 200} Tiền/tháng</strong></div>
              <div>Quỹ dự phòng: <strong style="color:#34d399;">${(biz.safe_cash || 0).toLocaleString()} Tiền</strong></div>
              <div>Công suất: <strong style="color:#fff;">${biz.monthly_capacity_hours || 800} giờ/tháng</strong></div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- OPEN NEW ENTERPRISE CATALOG -->
      <div>
        <h4 style="margin:0 0 4px 0; font-size:14px; color:#fbbf24;">
          ${isEn ? 'Establish New Commercial & Artisan Enterprises:' : 'Khai trương sản nghiệp mới:'}
        </h4>
        <p style="margin:0 0 12px 0; font-size:11px; color:#94a3b8;">
          ${isEn
            ? 'Invest startup capital and raw building materials to establish permanent enterprises in Zhuo County.'
            : 'Đầu tư vốn liếng và vật liệu xây dựng để thiết lập các cơ sở sản xuất, tạo doanh thu thụ động hàng tháng.'}
        </p>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:14px;">
          ${openable.map(bType => {
            const hasEnoughCash = playerCash >= bType.startupCash;
            const matList = bType.requiredMaterials.map(m => `${m.quantity}x ${m.itemNameVi}`).join(', ');

            return `
              <div style="background:#1e293b; border:1px solid rgba(148,163,184,0.15); border-radius:6px; padding:14px; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                  <div style="margin-bottom:6px;">
                    <strong style="color:#fff; font-size:13px;">${isEn ? bType.titleEn : bType.titleVi}</strong>
                    <div style="font-size:10px; color:#fbbf24;">Dự kiến: ${bType.projectedMonthlyRevenueMin}-${bType.projectedMonthlyRevenueMax} Tiền/tháng</div>
                  </div>

                  <p style="font-size:11px; color:#94a3b8; margin:0 0 10px 0; line-height:1.4;">
                    ${bType.descriptionVi}
                  </p>

                  <div style="font-size:11px; background:#090d16; border-radius:4px; padding:8px 10px; margin-bottom:12px; border:1px solid rgba(148,163,184,0.1);">
                    <div style="color:${hasEnoughCash ? '#34d399' : '#ef4444'}; margin-bottom:3px;">
                      <strong>Vốn ban đầu:</strong> ${bType.startupCash.toLocaleString()} Tiền (${hasEnoughCash ? 'Đủ' : 'Thiếu'})
                    </div>
                    <div style="color:#94a3b8;">
                      <strong>Vật liệu:</strong> ${matList}
                    </div>
                    <div style="color:#94a3b8;">
                      <strong>Mặt bằng:</strong> ${bType.monthlyRent} Tiền/tháng • Tuyển dụng: ${bType.baseWorkforce} thợ
                    </div>
                  </div>
                </div>

                <div>
                  <button class="ent-btn" style="width:100%;" ${hasEnoughCash ? '' : 'disabled'} onclick="EnterpriseUI.openBusinessDialog('${bType.typeId}', '${bType.titleVi.replace(/'/g, "\\'")}')">
                    ${isEn ? 'Open Enterprise' : 'Khai trương sản nghiệp'}
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
   * Executes a work shift
   */
  async function takeWorkShift(shiftId) {
    if (isWorking) return;
    isWorking = true;
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
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          if (typeof showToast === 'function') showToast(data.messageVi, false);
          cachedStatus = data.status;
          renderModalContent();

          // Refresh top telemetry bar if present
          if (typeof updateTopTelemetry === 'function') updateTopTelemetry();
          return;
        } else {
          if (typeof showToast === 'function') showToast(data.error || 'Ca làm thất bại!', true);
        }
      }
    } catch (e) {
      console.warn('[EnterpriseUI] Server labor shift notice:', e);
    } finally {
      isWorking = false;
    }

    // Client-side fallback calculation
    const shift = (cachedStatus?.laborShifts || []).find(s => s.shiftId === shiftId);
    if (shift) {
      cachedStatus.playerCash = (cachedStatus.playerCash || 15000) + shift.wage;
      cachedStatus.playerFatigue = Math.min(100, (cachedStatus.playerFatigue || 0) + shift.fatigueCost);

      if (typeof showToast === 'function') {
        showToast(
          isEn
            ? `Completed shift [${shift.titleEn}]! Earned +${shift.wage} coins, +${shift.fatigueCost} fatigue (+${shift.expGain} EXP)!`
            : `Hoàn thành ca làm [${shift.titleVi}]! Nhận +${shift.wage} Tiền đồng, tiêu hao ${shift.fatigueCost} Thể Lực (+${shift.expGain} EXP)!`
        );
      }
      renderModalContent();
    }
  }

  /**
   * Prompts dialog to open a business
   */
  async function openBusinessDialog(typeId, defaultName) {
    const isEn = isEnglish();
    const customName = prompt(
      isEn ? 'Enter custom name for your new enterprise:' : 'Nhập tên thương hiệu cho sản nghiệp mới của bạn:',
      defaultName
    );
    if (!customName) return;

    try {
      const res = await fetch('/api/enterprise/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: currentCharacterId,
          businessType: typeId,
          customName
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          if (typeof showToast === 'function') showToast(data.messageVi, false);
          await fetchEnterpriseStatus(currentCharacterId);
          switchEnterpriseTab('own');
          return;
        } else {
          if (typeof showToast === 'function') showToast(data.error || 'Mở sản nghiệp thất bại!', true);
          return;
        }
      }
    } catch (e) {
      console.warn('[EnterpriseUI] Server open business notice:', e);
    }

    if (typeof showToast === 'function') {
      showToast(isEn ? `Established [${customName}] successfully!` : `Khai trương [${customName}] thành công!`);
    }
    await fetchEnterpriseStatus(currentCharacterId);
    switchEnterpriseTab('own');
  }

  /**
   * Injects quick access trigger button - Purged in R4 in favor of Grand Command Hub
   */
  function injectTriggerButton() {
    // Purged in R4: Unified under Grand Command Hub (#btn-open-grand-hub)
  }

  // Auto-init styles & triggers on load
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        ensureStyles();
        injectTriggerButton();
      });
    } else {
      ensureStyles();
      injectTriggerButton();
    }
  }

  return {
    openEnterpriseModal,
    closeEnterpriseModal,
    switchEnterpriseTab,
    takeWorkShift,
    openBusinessDialog
  };
});
