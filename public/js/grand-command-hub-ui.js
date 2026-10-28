/**
 * ThreeKingdoms-AgentEngine: Grand Command Hub UI Component (public/js/grand-command-hub-ui.js)
 *
 * Implements R4: Unified "Đại Bản Doanh / Quân Cơ Xứ" Grand Command Hub.
 * Consolidates the 6 Strategic Operational Pillars:
 *   Tab 1: [武] Quân Trang (Gear & Forge)
 *   Tab 2: [業] Sản Nghiệp (Enterprises & Labor)
 *   Tab 3: [商] Thương Đoàn (Inter-City Caravans & Arbitrage)
 *   Tab 4: [家] Gia Thất (Marriage, Family & Dynastic Lineage)
 *   Tab 5: [演] Diễn Võ (1v1 Single Combat Martial Duels & Arena)
 *   Tab 6: [義] Tụ Nghĩa (Tavern Hero Banquets, Brotherhood & Recruitment)
 *
 * Adheres strictly to Anti-AI-Slop Standards:
 *   - AS-05: 100% authentic Koei ROTK Hanzi seals & structured badges (Zero juvenile emojis)
 *   - AS-07: Tabular numeric alignment with JetBrains Mono font
 *   - AS-11: Action-oriented imperative Vietnamese verbs
 *   - AS-12: Thematic Koei ROTK historical notices for empty/loading states
 */

(function () {
  'use strict';

  // Active state cache
  let activeTabKey = 'gear';
  let activeLineageSubTab = 'courtship'; // courtship | heirs | tree | succession
  let activeDuelId = null;
  let activeDuelState = null;
  let cachedLineageOverview = null;
  let cachedBanquetStatus = null;
  let cachedArenaRoster = null;
  let isSubmittingAction = false;

  function isEnglish() {
    return typeof window.currentLang !== 'undefined' && window.currentLang === 'en';
  }

  function formatNumber(num) {
    return Number(num || 0).toLocaleString('en-US');
  }

  // --------------------------------------------------------------------------
  // Core Hub Controller: Open, Close, Switch Tab
  // --------------------------------------------------------------------------

  function openHub(defaultTab = 'gear') {
    const modal = document.getElementById('grand-command-hub-modal');
    if (!modal) {
      console.error('Grand Command Hub modal shell not found in DOM.');
      return;
    }

    modal.classList.remove('hidden');
    switchTab(defaultTab);
  }

  function closeHub() {
    const modal = document.getElementById('grand-command-hub-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  function switchTab(tabKey) {
    activeTabKey = tabKey;

    // Update active tab button
    const tabBtns = document.querySelectorAll('.grand-hub-tab-btn');
    tabBtns.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Render tab content
    renderTabContent(tabKey);
  }

  function renderTabContent(tabKey) {
    const container = document.getElementById('grand-hub-tab-content');
    if (!container) return;

    container.innerHTML = `
      <div class="grand-hub-loading">
        <span class="hub-seal-spin">軍機</span>
        <p>${isEnglish() ? 'Loading tactical operational records...' : 'Đang tải hồ sơ quân cơ chiến lược...'}</p>
      </div>
    `;

    switch (tabKey) {
      case 'gear':
        renderGearTab(container);
        break;
      case 'enterprise':
        renderEnterpriseTab(container);
        break;
      case 'caravan':
        renderCaravanTab(container);
        break;
      case 'family':
        renderFamilyTab(container);
        break;
      case 'duel':
        renderDuelTab(container);
        break;
      case 'tavern':
        renderTavernTab(container);
        break;
      default:
        renderGearTab(container);
        break;
    }
  }

  // --------------------------------------------------------------------------
  // TAB 1: [武] QUÂN TRANG (Gear & Forge)
  // --------------------------------------------------------------------------

  async function renderGearTab(container) {
    try {
      const res = await fetch('/api/equipment?characterId=PLY-0001');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load equipment');

      const overview = data.overview;
      const isEn = isEnglish();

      container.innerHTML = `
        <div class="grand-hub-view-container">
          <div class="grand-hub-section-header">
            <div>
              <h3 class="grand-hub-view-title"><span class="hub-seal-accent">武</span> ${isEn ? 'Armaments & Bespoke Blacksmith Forge' : 'Quân Trang Binh Khí & Lò Rèn Thần Binh'}</h3>
              <p class="grand-hub-view-desc">${isEn ? 'Manage equipped armaments and forge legendary bespoke masterworks.' : 'Quản lý bảo vật, binh khí hộ thân và đúc rèn thần binh độc bản.'}</p>
            </div>
            <button class="tactical-btn tactical-btn--primary tactical-btn--sm" onclick="if(window.EquipmentUI){EquipmentUI.openEquipmentModal('PLY-0001','forge');}">
              ${isEn ? 'Open Master Forge' : 'Mở Lò Rèn Đại Tượng Sư'} →
            </button>
          </div>

          <!-- Equipped Armaments Grid -->
          <div class="grand-hub-grid-4">
            ${['WEAPON', 'ARMOR', 'STEED', 'TREASURE'].map(slot => {
              const item = overview.slots[slot];
              const slotSeal = slot === 'WEAPON' ? '兵' : slot === 'ARMOR' ? '甲' : slot === 'STEED' ? '馬' : '策';
              const slotLabel = slot === 'WEAPON' ? 'Binh Khí' : slot === 'ARMOR' ? 'Khôi Giáp' : slot === 'STEED' ? 'Chiến Mã' : 'Bảo Vật';
              return `
                <div class="tactical-card hub-slot-card ${item ? 'has-item' : 'empty-slot'}">
                  <div class="hub-slot-header">
                    <span class="hub-seal-badge">${slotSeal}</span>
                    <span class="hub-slot-label">${slotLabel}</span>
                  </div>
                  <div class="hub-slot-body">
                    ${item ? `
                      <div class="hub-item-name">${item.customName || item.nameVi}</div>
                      <div class="hub-item-buffs">${formatMods(item.statModifiers)}</div>
                      <span class="tactical-badge tactical-badge--${item.quality.toLowerCase()}">${item.quality}</span>
                    ` : `
                      <div class="hub-empty-label">${isEn ? 'Empty Slot' : 'Chưa Trang Bị'}</div>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Effective Attributes Breakdown -->
          <div class="tactical-card" style="margin-top: 14px;">
            <div class="hub-section-subtitle">${isEn ? 'Effective RPG Attributes (Base + Armament Stacking):' : 'Thuộc Tính Thực Chiến (Căn Bản + Binh Khí Tích Hợp):'}</div>
            <div class="hub-attrs-grid">
              ${Object.entries(overview.effectiveAttributes).map(([stat, val]) => {
                const isOver100 = Number(val) > 100;
                const buff = overview.equipmentBuffs[stat] || 0;
                return `
                  <div class="hub-attr-cell ${isOver100 ? 'stat-over-100' : ''}">
                    <span class="hub-attr-name">${stat.toUpperCase()}</span>
                    <span class="hub-attr-val">${val}${isOver100 ? ' [極]' : ''}</span>
                    <span class="hub-attr-buff">${buff > 0 ? `(+${buff})` : '+0'}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Bespoke Blacksmith Mini-Workbench -->
          <div class="tactical-card" style="margin-top: 14px; border-left: 3px solid var(--brand-primary, #f59e0b);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div>
                <strong style="color: #f1f5f9;">${isEn ? 'Bespoke Forging Protocol (CRA ≥ 60 Required):' : 'Quy Trình Đoán Tạo Thần Binh (Yêu Cầu CRA ≥ 60):'}</strong>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  ${isEn ? 'Consumes 25 Fatigue, Iron Ingots, Oak Timber, Charcoal and Leather. Stat clamped to [+1..+5].' : 'Tiêu hao 25 Thể lực, Phôi sắt, Than lò, Gỗ sồi & Da thuộc. Chỉ số bảo toàn nghiêm ngặt [+1..+5].'}
                </div>
              </div>
              <button class="tactical-btn tactical-btn--primary" onclick="if(window.EquipmentUI){EquipmentUI.openEquipmentModal('PLY-0001','forge');}">
                ${isEn ? 'Enter Forge Workshop' : 'Vào Phân Xưởng Lò Rèn'} →
              </button>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="grand-hub-error">[LỖI] ${err.message}</div>`;
    }
  }

  function formatMods(mods) {
    if (!mods || Object.keys(mods).length === 0) return 'Không có thuộc tính gia tăng';
    return Object.entries(mods)
      .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
      .join(' • ');
  }

  // --------------------------------------------------------------------------
  // TAB 2: [業] SẢN NGHIỆP (Enterprises & Labor)
  // --------------------------------------------------------------------------

  async function renderEnterpriseTab(container) {
    try {
      const res = await fetch('/api/enterprise/status?characterId=PLY-0001');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load enterprises');

      const st = data.status;
      const isEn = isEnglish();

      const laborShifts = [
        { id: 'SHIFT_FORGE_HAND', seal: '鍛', title: 'Thợ Phụ Kéo Bễ & Quai Búa', wage: 140, fatigue: 20, exp: 40, workplace: 'Lò Rèn Bách Nghệ Trác Quận' },
        { id: 'SHIFT_CHEF_TAVERN', seal: '庖', title: 'Đầu Bếp & Phục Vụ Rượu', wage: 110, fatigue: 15, exp: 30, workplace: 'Tửu Điếm Đào Viên' },
        { id: 'SHIFT_HERBALIST', seal: '藥', title: 'Dược Đồng Bào Chế Thuốc', wage: 120, fatigue: 15, exp: 35, workplace: 'Hồi Xuân Dược Đường' },
        { id: 'SHIFT_WEAVER', seal: '工', title: 'Thợ Thủ Công Đan Phên Tre', wage: 95, fatigue: 12, exp: 25, workplace: 'Xưởng Thủ Công Lương Gia' }
      ];

      container.innerHTML = `
        <div class="grand-hub-view-container">
          <div class="grand-hub-section-header">
            <div>
              <h3 class="grand-hub-view-title"><span class="hub-seal-accent">業</span> ${isEn ? 'Enterprises, Facilities & Labor Market' : 'Sản Nghiệp, Cơ Sở & Thị Trường Làm Thuê'}</h3>
              <p class="grand-hub-view-desc">${isEn ? 'Direct production lines, assign artisans, or earn wages via manual labor.' : 'Quản lý cơ sở chế tác, phân công thợ giỏi và tham gia lao động nhật khóa.'}</p>
            </div>
            <div style="font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #34d399;">
              ${isEn ? 'Workforce:' : 'Tổng Nhân Lực:'} <strong>${st.totalWorkforce || 0}</strong> • ${isEn ? 'Daily Rev:' : 'Doanh Thu Ngày:'} <strong>${formatNumber(st.totalDailyRevenue || 0)} Qian</strong>
            </div>
          </div>

          <!-- Owned Facilities -->
          <div class="hub-section-subtitle">${isEn ? 'Active Owned Enterprises:' : 'Cơ Sở Sản Nghiệp Đang Sở Hữu & Điều Hành:'}</div>
          <div class="grand-hub-grid-3">
            ${st.activeEnterprises && st.activeEnterprises.length > 0 ? st.activeEnterprises.map(biz => `
              <div class="tactical-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                  <strong style="font-size: 13px; color: #f1f5f9;">${biz.name}</strong>
                  <span class="tactical-badge tactical-badge--info">${biz.business_type}</span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">
                  ${isEn ? 'Location:' : 'Địa bàn:'} <b>${biz.location}</b> • ${isEn ? 'Workforce:' : 'Quy mô thợ:'} <b>${biz.workforce_count}</b>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; font-family: 'JetBrains Mono', monospace; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 6px;">
                  <span>${isEn ? 'Daily Rev:' : 'Thu nhập ngày:'} <b style="color: #4ade80;">+${biz.daily_revenue_avg} Qian</b></span>
                  <span>${isEn ? 'Safe Cash:' : 'Két sắt:'} <b>${formatNumber(biz.safe_cash)} Qian</b></span>
                </div>
              </div>
            `).join('') : `
              <div class="tactical-card" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 20px;">
                ${isEn ? 'No commercial enterprises currently established in this jurisdiction.' : 'Chưa khai trương cơ sở sản nghiệp nào. Hãy đầu tư mở xưởng mới.'}
              </div>
            `}
          </div>

          <!-- Labor Market Shifts -->
          <div class="hub-section-subtitle" style="margin-top: 16px;">${isEn ? 'Daily Labor Market (Earn Immediate Wages):' : 'Thị Trường Làm Thuê Kiếm Sống (Lương Ngày & Kinh Nghiệm Nghề):'}</div>
          <div class="grand-hub-grid-2">
            ${laborShifts.map(sh => `
              <div class="tactical-card" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span class="hub-seal-badge">${sh.seal}</span>
                  <div>
                    <strong style="font-size: 12.5px; color: #f1f5f9;">${sh.title}</strong>
                    <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">
                      ${sh.workplace} • Tiêu hao: <b style="color: #fbbf24;">${sh.fatigue} Thể lực</b>
                    </div>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 12px; font-weight: 700; color: #34d399; font-family: 'JetBrains Mono', monospace; margin-bottom: 4px;">
                    +${sh.wage} Qian
                  </div>
                  <button class="tactical-btn tactical-btn--sm" onclick="GrandCommandHubUI.executeWorkShift('${sh.id}')">
                    ${isEn ? 'Work Shift' : 'Làm Ca Này'}
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="grand-hub-error">[LỖI] ${err.message}</div>`;
    }
  }

  async function executeWorkShift(shiftId) {
    if (isSubmittingAction) return;
    isSubmittingAction = true;
    try {
      const res = await fetch('/api/enterprise/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: 'PLY-0001', shiftId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to complete work shift');

      showToast(data.message || 'Hoàn tất ca làm thuê!');
      renderTabContent('enterprise');
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    } finally {
      isSubmittingAction = false;
    }
  }

  // --------------------------------------------------------------------------
  // TAB 3: [商] THƯƠNG ĐOÀN (Caravans & Trade)
  // --------------------------------------------------------------------------

  async function renderCaravanTab(container) {
    try {
      const res = await fetch('/api/logistics/caravans');
      const data = await res.json();
      const caravans = data.caravans || [];
      const isEn = isEnglish();

      container.innerHTML = `
        <div class="grand-hub-view-container">
          <div class="grand-hub-section-header">
            <div>
              <h3 class="grand-hub-view-title"><span class="hub-seal-accent">商</span> ${isEn ? 'Inter-City Caravans & Regional Arbitrage' : 'Thương Đoàn Buôn Chuyến & Chênh Lệch Giá Liên Tỉnh'}</h3>
              <p class="grand-hub-view-desc">${isEn ? 'Dispatch regional trade expeditions across 15 provinces and monitor transit progress.' : 'Thiết lập các tuyến buôn chuyến liên tỉnh, áp tải hàng hóa và quyết toán lợi nhuận.'}</p>
            </div>
            <button class="tactical-btn tactical-btn--primary tactical-btn--sm" onclick="if(window.CaravanUI){CaravanUI.open('dispatch');}">
              ${isEn ? 'Dispatch New Caravan' : 'Điều Phái Thương Đoàn Mới'} →
            </button>
          </div>

          <!-- Active Caravans -->
          <div class="hub-section-subtitle">${isEn ? 'Active Caravans En-Route:' : 'Thương Đoàn Đang Lưu Thông Trên Dịch Đạo:'}</div>
          <div style="display: grid; gap: 10px;">
            ${caravans && caravans.length > 0 ? caravans.map(car => {
              const progress = Math.min(100, Math.round((car.route_progress || 0) * 100));
              const isArrived = car.status === 'ARRIVED';
              const isCompleted = car.status === 'COMPLETED';
              return `
                <div class="tactical-card" style="border-left: 3px solid ${isArrived ? '#22c55e' : '#f59e0b'};">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div>
                      <strong style="color: #f1f5f9;">${car.caravan_name}</strong>
                      <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                        Tuyến: <b>${car.from_settlement_id}</b> → <b>${car.to_settlement_id}</b> • Hàng: <b>${car.cargo_quantity} đơn vị</b> (${car.cargo_item_code})
                      </div>
                    </div>
                    <span class="tactical-badge ${isArrived ? 'tactical-badge--success' : 'tactical-badge--warning'}">
                      ${isCompleted ? 'Đã Quyết Toán' : isArrived ? 'Đã Cập Bến' : `Đang Đi (${progress}%)`}
                    </span>
                  </div>

                  <div class="tactical-progress-track" style="margin: 8px 0;">
                    <div class="tactical-progress-bar" style="width: ${progress}%; background: ${isArrived ? '#22c55e' : '#f59e0b'};"></div>
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 11px; color: var(--text-muted);">
                      Trị giá dự kiến: <strong style="color: #4ade80;">${formatNumber(car.cargo_value_qian)} Qian</strong>
                    </span>
                    ${isArrived ? `
                      <button class="tactical-btn tactical-btn--success tactical-btn--sm" onclick="if(window.CaravanUI){CaravanUI.claimCaravan('${car.caravan_id}');}">
                        Quyết Toán & Thu Tiền →
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('') : `
              <div class="tactical-card" style="text-align: center; color: var(--text-muted); padding: 24px;">
                ${isEn ? 'No caravans currently traversing the trade routes. Open Dispatcher to launch one.' : 'Chưa có thương đoàn nào đang lưu thông. Bấm nút phía trên để phái thương đoàn mới.'}
              </div>
            `}
          </div>

          <!-- Regional Price Arbitrage Quick Access -->
          <div class="tactical-card" style="margin-top: 14px; background: rgba(15, 23, 42, 0.8);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: #38bdf8;">${isEn ? '15-Province Macro-Economic Arbitrage Matrix' : 'Bảng Chênh Lệch Giá Hàng Hóa 15 Châu Huyện'}</strong>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  So sánh mức giá Lương Thảo, Muối Biển, Da Thuộc, Thục Cẩm để tối ưu hóa tỷ suất lợi nhuận.
                </div>
              </div>
              <button class="tactical-btn tactical-btn--sm" onclick="if(window.CaravanUI){CaravanUI.open('arbitrage');}">
                ${isEn ? 'View Price Matrix' : 'Xem Bảng Giá Toàn Quốc'} →
              </button>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="grand-hub-error">[LỖI] ${err.message}</div>`;
    }
  }

  // --------------------------------------------------------------------------
  // TAB 4: [家] GIA THẤT (Marriage, Family & Lineage)
  // --------------------------------------------------------------------------

  async function renderFamilyTab(container) {
    try {
      const res = await fetch('/api/lineage/status');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load lineage status');

      cachedLineageOverview = data.overview;
      const overview = cachedLineageOverview;
      const isEn = isEnglish();

      container.innerHTML = `
        <div class="grand-hub-view-container">
          <div class="grand-hub-section-header">
            <div>
              <h3 class="grand-hub-view-title"><span class="hub-seal-accent">家</span> ${isEn ? 'Dynastic Family & Lineage Succession (R1)' : 'Gia Thất, Hậu Duệ & Kế Thừa Dòng Họ (R1)'}</h3>
              <p class="grand-hub-view-desc">${isEn ? 'Manage betrothal, heir mentorship under historical masters, and dynastic succession.' : 'Cầu hôn tài nữ, nuôi dạy thế tử dưới trướng danh sư và kế thừa dòng họ.'}</p>
            </div>
            <div style="font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #fbbf24;">
              ${isEn ? 'Generation:' : 'Đời Thứ:'} <strong>${overview.clan?.current_generation || 1}</strong> • ${isEn ? 'Spouses:' : 'Thê Thiếp:'} <strong>${overview.spouses?.length || 0}</strong> • ${isEn ? 'Heirs:' : 'Hậu Duệ:'} <strong>${overview.children?.length || 0}</strong>
            </div>
          </div>

          <!-- Sub-View Navigation Tabs -->
          <div class="grand-hub-subnav">
            <button class="grand-hub-subnav-btn ${activeLineageSubTab === 'courtship' ? 'active' : ''}" onclick="GrandCommandHubUI.switchLineageSubTab('courtship')">
              <span class="hub-subnav-seal">姻</span> ${isEn ? 'Courtship & Spouses' : 'Cầu Hôn & Thê Thiếp'}
            </button>
            <button class="grand-hub-subnav-btn ${activeLineageSubTab === 'heirs' ? 'active' : ''}" onclick="GrandCommandHubUI.switchLineageSubTab('heirs')">
              <span class="hub-subnav-seal">嗣</span> ${isEn ? 'Heirs & Mentorship' : 'Hậu Duệ & Dạy Dỗ'}
            </button>
            <button class="grand-hub-subnav-btn ${activeLineageSubTab === 'tree' ? 'active' : ''}" onclick="GrandCommandHubUI.switchLineageSubTab('tree')">
              <span class="hub-subnav-seal">譜</span> ${isEn ? 'Genealogical Tree' : 'Gia Phả Dòng Họ'}
            </button>
            <button class="grand-hub-subnav-btn ${activeLineageSubTab === 'succession' ? 'active' : ''}" onclick="GrandCommandHubUI.switchLineageSubTab('succession')">
              <span class="hub-subnav-seal">繼</span> ${isEn ? 'Ancestors & Succession' : 'Tông Miếu & Kế Thừa'}
            </button>
          </div>

          <div id="lineage-subview-content" style="margin-top: 14px;"></div>
        </div>
      `;

      renderLineageSubView();
    } catch (err) {
      container.innerHTML = `<div class="grand-hub-error">[LỖI] ${err.message}</div>`;
    }
  }

  function switchLineageSubTab(subTabKey) {
    activeLineageSubTab = subTabKey;
    const subnavBtns = document.querySelectorAll('.grand-hub-subnav-btn');
    subnavBtns.forEach(btn => {
      if (btn.textContent.includes(subTabKey === 'courtship' ? 'Cầu Hôn' : subTabKey === 'heirs' ? 'Hậu Duệ' : subTabKey === 'tree' ? 'Gia Phả' : 'Tông Miếu')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    renderLineageSubView();
  }

  async function renderLineageSubView() {
    const subview = document.getElementById('lineage-subview-content');
    if (!subview || !cachedLineageOverview) return;

    const overview = cachedLineageOverview;
    const isEn = isEnglish();

    if (activeLineageSubTab === 'courtship') {
      // Fetch courtship candidates
      const candRes = await fetch('/api/lineage/courtship-candidates');
      const candData = await candRes.json();
      const candidates = candData.candidates || [];

      subview.innerHTML = `
        <div>
          <!-- Current Spouses -->
          <div class="hub-section-subtitle">${isEn ? 'Current Lawful Spouses & Household Management:' : 'Chính Thê & Thê Thiếp Hiện Tại:'}</div>
          <div class="grand-hub-grid-2" style="margin-bottom: 16px;">
            ${overview.spouses && overview.spouses.length > 0 ? overview.spouses.map(sp => `
              <div class="tactical-card" style="border-left: 3px solid #ec4899;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <strong style="font-size: 13px; color: #f1f5f9;">${sp.spouse_name_vi || sp.spouse_npc_id}</strong>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                      Vai trò: <b style="color: #fbbf24;">${sp.household_role || 'HOUSEKEEPER'}</b> • Thai kỳ: <b>Giai đoạn ${sp.gestation_stage || 0}/3</b>
                    </div>
                  </div>
                  <span class="tactical-badge tactical-badge--primary">${sp.status}</span>
                </div>
                <div style="margin-top: 10px; display: flex; gap: 8px;">
                  <button class="tactical-btn tactical-btn--sm" onclick="GrandCommandHubUI.executeHouseholdRest('${sp.marriage_id}')">
                    ${isEn ? 'Rest & Cohabit' : 'Đồng Phòng Dưỡng Tức'}
                  </button>
                </div>
              </div>
            `).join('') : `
              <div class="tactical-card" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 18px;">
                ${isEn ? 'Player currently has no married spouses. Propose to a courtship candidate below.' : 'Hiện tại Lương Diễn chưa lập gia thất. Hãy kết giao và cầu hôn các giai nhân Tam Quốc.'}
              </div>
            `}
          </div>

          <!-- Eligible Courtship Candidates -->
          <div class="hub-section-subtitle">${isEn ? 'Eligible Courtship Candidates (Affinity ≥ 80 Required):' : 'Danh Sách Tài Nữ Tam Quốc Có Thể Cầu Hôn (Hảo Cảm ≥ 80):'}</div>
          <div class="grand-hub-grid-3">
            ${candidates.map(cand => {
              const eligible = cand.affinity >= 80;
              return `
                <div class="tactical-card" style="border: 1px solid ${eligible ? '#4ade80' : 'rgba(255,255,255,0.08)'};">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div>
                      <strong style="color: #f1f5f9;">${cand.nameVi}</strong>
                      <div style="font-size: 10.5px; color: var(--text-muted);">${cand.titleVi}</div>
                    </div>
                    <span class="tactical-badge ${eligible ? 'tactical-badge--success' : 'tactical-badge--warning'}">
                      Hảo Cảm: ${cand.affinity}/100
                    </span>
                  </div>

                  <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 6px;">
                    Sính lễ định ước: <b style="color: #fbbf24;">${formatNumber(cand.dowryCash)} Qian</b>
                  </div>

                  <div style="font-size: 10.5px; color: #38bdf8; background: rgba(56,189,248,0.1); padding: 4px 8px; border-radius: 4px; margin-bottom: 8px;">
                    Đặc tính mẫu thân: <b>${cand.maternalTraitNameVi || 'Hiền Thục Bội Phần'}</b>
                  </div>

                  <button class="tactical-btn ${eligible ? 'tactical-btn--primary' : 'tactical-btn--disabled'} tactical-btn--sm" style="width: 100%;"
                    ${eligible ? `onclick="GrandCommandHubUI.submitCourtship('${cand.npcId}', ${cand.dowryCash})"` : 'disabled'}
                    title="${eligible ? 'Tiến hành lễ dạm ngõ sính lễ chính thức' : 'Chưa đủ 80 Hảo cảm để ngỏ lời cầu hôn'}">
                    ${eligible ? 'Cầu Hôn Gia Thất →' : '[CHƯA ĐỦ HẢO CẢM]'}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else if (activeLineageSubTab === 'heirs') {
      // Heirs view
      subview.innerHTML = `
        <div>
          <div class="hub-section-subtitle">${isEn ? 'Offspring & Heir Upbringing:' : 'Thế Tử, Con Cái & Huấn Luyện Danh Sư:'}</div>
          <div class="grand-hub-grid-2">
            ${overview.children && overview.children.length > 0 ? overview.children.map(ch => `
              <div class="tactical-card" style="border-left: 3px solid ${ch.is_heir ? '#fbbf24' : '#38bdf8'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <strong style="font-size: 13px; color: #f1f5f9;">${ch.child_name_vi}</strong>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                      Tuổi: <b>${ch.age}</b> • Giai đoạn: <b>${ch.development_stage}</b> ${ch.is_heir ? '• <span style="color:#fbbf24;">[ĐÍCH TÔN THỪA KẾ]</span>' : ''}
                    </div>
                  </div>
                  <span class="tactical-badge tactical-badge--info">${ch.growth_focus}</span>
                </div>

                <!-- Attributes -->
                <div class="hub-attrs-grid" style="margin: 8px 0;">
                  <div class="hub-attr-cell"><span class="hub-attr-name">WAR</span><span class="hub-attr-val">${ch.war_attr}</span></div>
                  <div class="hub-attr-cell"><span class="hub-attr-name">INT</span><span class="hub-attr-val">${ch.int_attr}</span></div>
                  <div class="hub-attr-cell"><span class="hub-attr-name">POL</span><span class="hub-attr-val">${ch.pol_attr}</span></div>
                  <div class="hub-attr-cell"><span class="hub-attr-name">COM</span><span class="hub-attr-val">${ch.com_attr}</span></div>
                </div>

                <!-- Actions -->
                <div style="display: flex; gap: 6px; margin-top: 8px;">
                  <button class="tactical-btn tactical-btn--sm" onclick="GrandCommandHubUI.assignMasterDialog('${ch.child_id}')">
                    Bái Danh Sư (Lu Zhi / Guan Yu) →
                  </button>
                  ${!ch.is_heir ? `
                    <button class="tactical-btn tactical-btn--primary tactical-btn--sm" onclick="GrandCommandHubUI.designateHeir('${ch.child_id}')">
                      Lập Làm Thế Tử
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('') : `
              <div class="tactical-card" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 24px;">
                ${isEn ? 'No children born yet. Spend cohabitation turns with your spouse to conceive.' : 'Chưa có hậu duệ sinh hạ. Hãy nghỉ ngơi đồng phòng cùng phu nhân để thụ thai.'}
              </div>
            `}
          </div>
        </div>
      `;
    } else if (activeLineageSubTab === 'tree') {
      // Family tree view
      subview.innerHTML = `
        <div class="tactical-card" style="background: rgba(15, 23, 42, 0.9);">
          <div class="hub-section-subtitle">${isEn ? 'Genealogical Clan Records:' : 'Phả Đồ Gia Tộc Lương Thị:'}</div>
          <div style="padding: 12px; border-left: 2px solid #fbbf24; margin-bottom: 12px;">
            <strong style="color: #fbbf24; font-size: 14px;">Thủy Tổ: Lương Diễn (Chí Viễn) • Đời Thứ 1</strong>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
              Quê quán: U Châu Trác Quận • Chức vị: Nghĩa Quân Lương Doanh Chủ Quản
            </div>
          </div>
          <div style="display: grid; gap: 8px; margin-left: 20px;">
            ${overview.spouses && overview.spouses.length > 0 ? overview.spouses.map(s => `
              <div style="font-size: 12px; color: #cbd5e1;">
                ├─ Phối Ngẫu: <b style="color: #f472b6;">${s.spouse_name_vi || s.spouse_npc_id}</b>
                ${overview.children && overview.children.filter(c => c.mother_npc_id === s.spouse_npc_id).map(c => `
                  <div style="margin-left: 20px; font-size: 11px; color: #94a3b8;">
                    └─ Thế Tử: <b>${c.child_name_vi}</b> (${c.age} tuổi)
                  </div>
                `).join('')}
              </div>
            `).join('') : '<div style="font-size: 11px; color: var(--text-muted);">Chưa có chi nhánh hôn nhân ghi nhận.</div>'}
          </div>
        </div>
      `;
    } else if (activeLineageSubTab === 'succession') {
      // Dynastic succession
      subview.innerHTML = `
        <div class="tactical-card" style="border-left: 3px solid #fbbf24;">
          <h4 style="color: #fbbf24; margin-top: 0;">${isEn ? 'Dynastic Succession Council' : 'Hội Đồng Tông Tộc & Chuyển Giao Quyền Lực Kế Thừa'}</h4>
          <p style="font-size: 12px; color: #cbd5e1; line-height: 1.5;">
            Khi Lương Diễn tuổi cao hoặc quy ẩn, quyền kiểm soát toàn bộ đại nghiệp sẽ được chuyển giao liền mạch cho Thế Tử trưởng thành (≥ 18 tuổi).
            Toàn bộ két sắt, cơ sở sản nghiệp, kho hàng, binh khí thần binh được bảo toàn 100%, Thủy Tổ được lưu vào Tông Miếu Anh Danh.
          </p>

          <div style="margin: 16px 0;">
            <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 6px;">Chọn Thế Tử Kế Vị:</label>
            <select id="sel-succession-heir" style="background: #1e293b; color: #f1f5f9; padding: 6px 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); width: 100%; max-width: 320px;">
              ${overview.children && overview.children.length > 0 ? overview.children.map(c => `
                <option value="${c.child_id}">${c.child_name_vi} (${c.age} tuổi • WAR ${c.war_attr} / INT ${c.int_attr}) ${c.is_heir ? '[Đích Tôn]' : ''}</option>
              `).join('') : '<option value="">Chưa có hậu duệ nào</option>'}
            </select>
          </div>

          <button class="tactical-btn tactical-btn--primary" onclick="GrandCommandHubUI.executeSuccession()"
            ${(!overview.children || overview.children.length === 0) ? 'disabled' : ''}>
            ${isEn ? 'Execute Dynastic Succession Protocol' : 'Khai Mở Đại Điển Kế Thừa Dòng Họ'} →
          </button>
        </div>
      `;
    }
  }

  async function submitCourtship(npcId, dowryCash) {
    if (isSubmittingAction) return;
    isSubmittingAction = true;
    try {
      const res = await fetch('/api/lineage/courtship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'PLY-0001', spouseNpcId: npcId, dowryCash })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Cầu hôn không thành công');

      showToast(data.message || 'Hôn sự đã thành công viên mãn!');
      renderTabContent('family');
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    } finally {
      isSubmittingAction = false;
    }
  }

  async function executeHouseholdRest(marriageId) {
    if (isSubmittingAction) return;
    isSubmittingAction = true;
    try {
      const res = await fetch('/api/lineage/household/rest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marriageId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Thao tác không thành công');

      showToast(data.message || 'Đồng phòng dưỡng tức thành công!');
      renderTabContent('family');
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    } finally {
      isSubmittingAction = false;
    }
  }

  async function assignMasterDialog(childId) {
    const mentorId = prompt('Chọn mã danh sư bái phỏng:\n- NPC-0012: Lư Thực (Trí Tuệ / Chính Trị)\n- NPC-0003: Quan Vũ (Võ Dũng / Thống Soái)\n- NPC-0002: Trương Phi (Võ Lực)\n- NPC-0005: Trương Thế Bình (Kinh Thương)', 'NPC-0012');
    if (!mentorId) return;

    try {
      const res = await fetch('/api/lineage/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, mentorNpcId: mentorId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Bái sư không thành công');

      showToast(data.message || 'Thế tử bái sư thành công, chỉ số tăng trưởng!');
      renderTabContent('family');
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    }
  }

  async function designateHeir(childId) {
    try {
      const res = await fetch('/api/lineage/children/designate-heir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Không thể lập thế tử');

      showToast('Đã sắc phong đích tôn thế tử!');
      renderTabContent('family');
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    }
  }

  async function executeSuccession() {
    const sel = document.getElementById('sel-succession-heir');
    const childId = sel ? sel.value : null;
    if (!childId) {
      showToast('Chưa chọn thế tử kế vị', true);
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn tiến hành chuyển giao thế hệ dòng họ không? Thủy tổ sẽ quy ẩn và thế tử sẽ trở thành gia chủ kế tiếp.')) {
      return;
    }

    try {
      const res = await fetch('/api/lineage/succeed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heirChildId: childId, retirementReason: 'VOLUNTARY' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Kế thừa không thành công');

      showToast(data.message || 'Đại nghiệp chuyển giao thành công viên mãn!');
      renderTabContent('family');
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    }
  }

  // --------------------------------------------------------------------------
  // TAB 5: [演] DIỄN VÕ (1v1 Single Combat Martial Duels & Arena)
  // --------------------------------------------------------------------------

  async function renderDuelTab(container) {
    try {
      // Check active duel
      const activeRes = await fetch('/api/duel/active');
      const activeData = await activeRes.json();

      const rosterRes = await fetch('/api/duel/arena/roster');
      const rosterData = await rosterRes.json();
      cachedArenaRoster = rosterData.roster || [];

      const isEn = isEnglish();

      if (activeData.success && activeData.duel && !activeData.duel.isConcluded) {
        // Duel is active! Render interactive combat console
        activeDuelId = activeData.duel.duelId;
        activeDuelState = activeData.duel;
        renderActiveDuelConsole(container, activeDuelState);
      } else {
        // No active duel. Render sparring grounds & arena challenge board
        renderArenaMatchmaker(container, cachedArenaRoster);
      }
    } catch (err) {
      container.innerHTML = `<div class="grand-hub-error">[LỖI] ${err.message}</div>`;
    }
  }

  function renderArenaMatchmaker(container, roster) {
    const isEn = isEnglish();
    container.innerHTML = `
      <div class="grand-hub-view-container">
        <div class="grand-hub-section-header">
          <div>
            <h3 class="grand-hub-view-title"><span class="hub-seal-accent">演</span> ${isEn ? 'ROTK 1v1 Single Combat Arena & Sparring (R2)' : 'Diễn Võ Trường • Tỷ Thí Đơn Đả Độc Đấu 1v1 (R2)'}</h3>
            <p class="grand-hub-view-desc">${isEn ? 'Turn-based tactical 3-5 round duels with 4 tactical commands (Attack, Defend, Special Strike, Focus Spirit).' : 'Đấu võ hiệp định 3-5 hiệp với 4 thế công thủ (Công, Thủ, Sát, Khí). Võ lực cộng hưởng binh khí thần binh.'}</p>
          </div>
        </div>

        <!-- Friendly Sparring Matches -->
        <div class="hub-section-subtitle">${isEn ? 'Friendly Martial Sparring (Build Kizuna & Combat EXP):' : 'Đàm Đạo Diễn Võ Huynh Đệ (Tăng Hảo Cảm & EXP Võ Lực):'}</div>
        <div class="grand-hub-grid-2" style="margin-bottom: 16px;">
          <div class="tactical-card" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="hub-seal-badge" style="background:#dc2626;">張</span>
              <div>
                <strong style="font-size: 13px; color: #f1f5f9;">Trương Phi (Dực Đức)</strong>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  Bát Xà Mâu • WAR 98 (Cực Dũng) • Đấu thương hữu nghị
                </div>
              </div>
            </div>
            <button class="tactical-btn tactical-btn--primary tactical-btn--sm" onclick="GrandCommandHubUI.initiateSparring('NPC-0002')">
              ${isEn ? 'Challenge Sparring' : 'Luận Kiếm Tỷ Thí'} →
            </button>
          </div>

          <div class="tactical-card" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="hub-seal-badge" style="background:#16a34a;">關</span>
              <div>
                <strong style="font-size: 13px; color: #f1f5f9;">Quan Vũ (Vân Trường)</strong>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  Thanh Long Yển Nguyệt • WAR 103 (Thần Uy)
                </div>
              </div>
            </div>
            <button class="tactical-btn tactical-btn--primary tactical-btn--sm" onclick="GrandCommandHubUI.initiateSparring('NPC-0003')">
              ${isEn ? 'Challenge Sparring' : 'Luận Kiếm Tỷ Thí'} →
            </button>
          </div>
        </div>

        <!-- Martial Arena Championship Tiers -->
        <div class="hub-section-subtitle">${isEn ? 'Diễn Võ Đài Martial Tournaments (Cash Prize & Prestige):' : 'Lôi Đài Diễn Võ Toàn Quốc (Tiền Thưởng & Uy Vọng Quân Sự):'}</div>
        <div class="grand-hub-grid-3">
          ${roster && roster.length > 0 ? roster.map(arena => `
            <div class="tactical-card" style="border: 1px solid rgba(255,255,255,0.1);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                <strong style="font-size: 13px; color: #f1f5f9;">${arena.titleVi}</strong>
                <span class="tactical-badge tactical-badge--warning">Bậc ${arena.tier}</span>
              </div>
              <div style="font-size: 11px; color: #38bdf8; margin-bottom: 4px;">
                Võ tướng giữ lôi đài: <b>${arena.championNameVi}</b> (WAR ${arena.championWar})
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">
                Tiền thưởng quán quân: <b style="color: #4ade80;">${formatNumber(arena.prizeMoneyQian)} Qian</b>
              </div>
              <button class="tactical-btn tactical-btn--primary tactical-btn--sm" style="width: 100%;" onclick="GrandCommandHubUI.initiateArenaChallenge(${arena.tier})">
                ${isEn ? 'Mount Stage & Fight' : 'Thượng Đài Tranh Hùng'} →
              </button>
            </div>
          `).join('') : ''}
        </div>
      </div>
    `;
  }

  function renderActiveDuelConsole(container, duel) {
    const isEn = isEnglish();
    const p = duel.player;
    const opp = duel.opponent;

    const playerHpPct = Math.max(0, Math.min(100, Math.round((p.currentHp / p.maxHp) * 100)));
    const opponentHpPct = Math.max(0, Math.min(100, Math.round((opp.currentHp / opp.maxHp) * 100)));

    container.innerHTML = `
      <div class="grand-hub-view-container">
        <!-- Duel Header & Round Counter -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: rgba(15,23,42,0.8); padding: 8px 14px; border-radius: 6px;">
          <div>
            <span class="hub-seal-accent">演</span>
            <strong style="color: #fbbf24; font-size: 13px;">${duel.titleVi || 'Tỷ Thí Đơn Đả 1v1'}</strong>
          </div>
          <span class="tactical-badge tactical-badge--primary">
            ${isEn ? 'Round' : 'Hiệp Đấu'}: ${duel.currentRound} / ${duel.maxRounds}
          </span>
        </div>

        <!-- Combatant Clash HUD -->
        <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center; margin-bottom: 16px;">
          <!-- Player Card -->
          <div class="tactical-card" style="border-left: 3px solid #38bdf8;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <strong style="font-size: 13px; color: #f1f5f9;">${p.nameVi}</strong>
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #38bdf8;">WAR ${p.effectiveWar}</span>
            </div>
            <!-- HP Bar -->
            <div style="font-size: 10px; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span>Khí Huyết</span><span>${p.currentHp}/${p.maxHp}</span>
            </div>
            <div class="tactical-progress-track" style="height: 6px; margin: 2px 0 6px 0;">
              <div class="tactical-progress-bar" style="width: ${playerHpPct}%; background: #22c55e;"></div>
            </div>
            <!-- Spirit Bar -->
            <div style="font-size: 10px; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span>Khí Phách (Tuyệt Kỹ ≥ 30)</span><span>${p.spirit}/100</span>
            </div>
            <div class="tactical-progress-track" style="height: 6px; margin: 2px 0;">
              <div class="tactical-progress-bar" style="width: ${p.spirit}%; background: #38bdf8;"></div>
            </div>
          </div>

          <!-- VS Badge -->
          <div style="text-align: center;">
            <span style="font-family: 'Cinzel', serif; font-size: 20px; font-weight: 800; color: #ef4444; letter-spacing: 2px;">VS</span>
          </div>

          <!-- Opponent Card -->
          <div class="tactical-card" style="border-right: 3px solid #ef4444; text-align: right;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #ef4444;">WAR ${opp.effectiveWar}</span>
              <strong style="font-size: 13px; color: #f1f5f9;">${opp.nameVi}</strong>
            </div>
            <!-- HP Bar -->
            <div style="font-size: 10px; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span>${opp.currentHp}/${opp.maxHp}</span><span>Khí Huyết</span>
            </div>
            <div class="tactical-progress-track" style="height: 6px; margin: 2px 0 6px 0;">
              <div class="tactical-progress-bar" style="width: ${opponentHpPct}%; background: #ef4444; margin-left: auto;"></div>
            </div>
            <!-- Spirit Bar -->
            <div style="font-size: 10px; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span>${opp.spirit}/100</span><span>Khí Phách</span>
            </div>
            <div class="tactical-progress-track" style="height: 6px; margin: 2px 0;">
              <div class="tactical-progress-bar" style="width: ${opp.spirit}%; background: #f59e0b; margin-left: auto;"></div>
            </div>
          </div>
        </div>

        <!-- Combat Chronicle Log -->
        <div class="tactical-card" style="max-height: 180px; overflow-y: auto; background: #090d16; margin-bottom: 16px; font-size: 11.5px; line-height: 1.6;">
          <div class="hub-section-subtitle" style="margin-bottom: 6px;">Diễn Biến Giao Tranh Các Hiệp:</div>
          ${duel.rounds && duel.rounds.length > 0 ? duel.rounds.map(r => `
            <div style="padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <span class="hub-seal-badge" style="font-size: 9px; padding: 1px 4px;">Hiệp ${r.roundNumber}</span>
              ${r.narrativeVi}
            </div>
          `).join('') : '<div style="color: var(--text-muted); font-style: italic;">Hai bên vào thế thủ, chờ lệnh khởi động hiệp đầu...</div>'}
        </div>

        <!-- 4 Tactical Command Buttons -->
        ${!duel.isConcluded ? `
          <div class="grand-hub-grid-4">
            <button class="tactical-btn tactical-btn--primary" onclick="GrandCommandHubUI.submitDuelCommand('ATTACK')">
              <span class="hub-seal-accent">攻</span> <b>Công</b> (Tấn Công)
            </button>
            <button class="tactical-btn" onclick="GrandCommandHubUI.submitDuelCommand('DEFEND')">
              <span class="hub-seal-accent">防</span> <b>Thủ</b> (Phòng Ngự)
            </button>
            <button class="tactical-btn ${p.spirit >= 30 ? 'tactical-btn--danger' : 'tactical-btn--disabled'}"
              ${p.spirit >= 30 ? 'onclick="GrandCommandHubUI.submitDuelCommand(\'SPECIAL_STRIKE\')"' : 'disabled'}>
              <span class="hub-seal-accent">殺</span> <b>Sát</b> (Tuyệt Kỹ)
            </button>
            <button class="tactical-btn" onclick="GrandCommandHubUI.submitDuelCommand('FOCUS_SPIRIT')">
              <span class="hub-seal-accent">氣</span> <b>Khí</b> (Tụ Khí)
            </button>
          </div>
        ` : `
          <!-- Concluded Result -->
          <div class="tactical-card" style="text-align: center; border: 1px solid #fbbf24; padding: 16px;">
            <h4 style="color: #fbbf24; margin: 0 0 6px 0;">${duel.conclusionNarrativeVi || 'Trận Tỷ Thí Đã Kết Thúc!'}</h4>
            <button class="tactical-btn tactical-btn--primary" onclick="GrandCommandHubUI.renderTabContent('duel')">
              Hoàn Tất & Trở Về Diễn Võ Trường →
            </button>
          </div>
        `}
      </div>
    `;
  }

  async function initiateSparring(opponentId) {
    if (isSubmittingAction) return;
    isSubmittingAction = true;
    try {
      const res = await fetch('/api/duel/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'PLY-0001', opponentId, context: 'FRIENDLY_SPARRING' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Khởi động tỷ thí thất bại');

      renderTabContent('duel');
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    } finally {
      isSubmittingAction = false;
    }
  }

  async function initiateArenaChallenge(tier) {
    if (isSubmittingAction) return;
    isSubmittingAction = true;
    try {
      const res = await fetch('/api/duel/arena/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'PLY-0001', tier })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Thượng đài thất bại');

      renderTabContent('duel');
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    } finally {
      isSubmittingAction = false;
    }
  }

  async function submitDuelCommand(command) {
    if (isSubmittingAction || !activeDuelId) return;
    isSubmittingAction = true;
    try {
      const res = await fetch('/api/duel/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duelId: activeDuelId, command })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Lỗi hiệp giao tranh');

      renderTabContent('duel');
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    } finally {
      isSubmittingAction = false;
    }
  }

  // --------------------------------------------------------------------------
  // TAB 6: [義] TỤ NGHĨA (Tavern Hero Banquets, Brotherhood & Recruitment)
  // --------------------------------------------------------------------------

  async function renderTavernTab(container) {
    try {
      const res = await fetch('/api/banquet/status?playerId=PLY-0001');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load tavern status');

      cachedBanquetStatus = data.status;
      const st = cachedBanquetStatus;
      const isEn = isEnglish();

      container.innerHTML = `
        <div class="grand-hub-view-container">
          <div class="grand-hub-section-header">
            <div>
              <h3 class="grand-hub-view-title"><span class="hub-seal-accent">義</span> ${isEn ? 'Tavern Banquets, Brotherhood & Retainers (R3)' : 'Tụ Nghĩa • Yến Tiệc Tửu Quán, Kết Bái & Chiêu Mộ (R3)'}</h3>
              <p class="grand-hub-view-desc">${isEn ? 'Host themed banquets using Dukang wine, swear Peach Garden brotherhood oaths, and recruit commanders.' : 'Thiết yến Đỗ Khang đãi hào kiệt, cắt máu ăn thề Đào Viên và chiêu mộ tướng soái vào gia tộc.'}</p>
            </div>
            <div style="font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #fbbf24;">
              ${isEn ? 'Wine:' : 'Mỹ Tửu:'} <strong>${st.availableWine || 0} vò</strong> • ${isEn ? 'Venison:' : 'Thịt Rừng:'} <strong>${st.availableVenison || 0} đĩa</strong> • ${isEn ? 'Bao:' : 'Bánh Bao:'} <strong>${st.availableBao || 0}</strong>
            </div>
          </div>

          <!-- Banquet Tier Selection -->
          <div class="hub-section-subtitle">${isEn ? 'Select Banquet Tier to Host:' : 'Lựa Chọn Quy Mô Thiết Đãi Yến Tiệc:'}</div>
          <div class="grand-hub-grid-3" style="margin-bottom: 16px;">
            ${[
              { tier: 'TIET_KIEM', seal: '酌', title: 'Tiểu Yến Tri Kỷ', cap: 2, menu: '1 Đỗ Khang + 1 Bánh Bao', bonus: 'Hảo cảm +12..18 • Thể lực +25' },
              { tier: 'HAO_HIEP', seal: '宴', title: 'Hào Hiệp Yến Khách', cap: 4, menu: '2 Đỗ Khang + 2 Thịt Rừng + 2 Bánh Bao', bonus: 'Hảo cảm +20..28 • Thể lực +45' },
              { tier: 'DAO_VIEN', seal: '義', title: 'Đào Viên Anh Hùng Yến', cap: 8, menu: '5 Đỗ Khang + 4 Thịt Rừng + 4 Bánh Bao', bonus: 'Hảo cảm +35..45 • Thể lực +70' }
            ].map((b, idx) => `
              <div class="tactical-card hub-banquet-card ${idx === 0 ? 'selected' : ''}" id="card-banquet-${b.tier}" onclick="GrandCommandHubUI.selectBanquetTier('${b.tier}')">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                  <strong style="font-size: 13px; color: #f1f5f9;">${b.title}</strong>
                  <span class="hub-seal-badge">${b.seal}</span>
                </div>
                <div style="font-size: 11px; color: #38bdf8; margin-bottom: 4px;">
                  Sức chứa tối đa: <b>${b.cap} vị hào kiệt</b>
                </div>
                <div style="font-size: 10.5px; color: var(--text-muted); margin-bottom: 6px;">
                  Món dùng: ${b.menu}
                </div>
                <div style="font-size: 10.5px; color: #4ade80;">
                  ${b.bonus}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Guest Invitee Selection -->
          <div class="hub-section-subtitle">${isEn ? 'Select Visiting Hero Guests to Invite:' : 'Chọn Danh Sách Hào Kiệt Mời Dự Yến:'}</div>
          <div class="grand-hub-grid-3" style="margin-bottom: 16px;">
            ${st.guests && st.guests.length > 0 ? st.guests.map(g => `
              <div class="tactical-card" style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <strong style="color: #f1f5f9;">${g.nameVi}</strong>
                  <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">
                    Hảo Cảm: <b style="color: #fbbf24;">${g.affinity}/100</b> • Thân phận: ${g.titleVi || 'Hào Kiệt'}
                  </div>
                </div>
                <input type="checkbox" class="chk-banquet-guest" value="${g.npcId}" checked style="width: 18px; height: 18px; accent-color: var(--brand-primary, #f59e0b);">
              </div>
            `).join('') : '<div style="color: var(--text-muted);">Không có hào kiệt nào đang lưu trú tại tửu quán.</div>'}
          </div>

          <!-- Host Banquet Action -->
          <div style="margin-bottom: 20px;">
            <button class="tactical-btn tactical-btn--primary" onclick="GrandCommandHubUI.executeHostBanquet()">
              <span class="hub-seal-accent">酒</span> ${isEn ? 'Host Grand Tavern Feast' : 'Khai Tiệc Đãi Hào Kiệt'} →
            </button>
          </div>

          <!-- Sworn Brotherhood & Retainer Recruitment Section -->
          <div class="hub-section-subtitle">${isEn ? 'Peach Garden Sworn Brotherhood & Retainer Recruitment (FAC-LIANG-CLAN):' : 'Kết Bái Huynh Đệ & Chiêu Mộ Tướng Soái Vào Gia Tộc:'}</div>
          <div class="grand-hub-grid-2">
            ${st.guests && st.guests.length > 0 ? st.guests.map(g => {
              const canBrother = g.affinity >= 80;
              const canRecruit = g.affinity >= 70 || g.isSwornBrother;
              return `
                <div class="tactical-card" style="border-left: 3px solid ${g.isSwornBrother ? '#a855f7' : canBrother ? '#fbbf24' : 'rgba(255,255,255,0.1)'};">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div>
                      <strong style="color: #f1f5f9;">${g.nameVi}</strong>
                      <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                        ${g.isSwornBrother ? '<span style="color:#a855f7;">[TỬ SINH HUYNH ĐỆ • FOG TIER 5]</span>' : `Hảo Cảm: ${g.affinity}/100`}
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; gap: 8px; margin-top: 8px;">
                    ${!g.isSwornBrother ? `
                      <button class="tactical-btn ${canBrother ? 'tactical-btn--primary' : 'tactical-btn--disabled'} tactical-btn--sm"
                        ${canBrother ? `onclick="GrandCommandHubUI.swearBrotherhood('${g.npcId}')"` : 'disabled'}
                        title="${canBrother ? 'Cắt máu ăn thề Đào Viên' : 'Cần tối thiểu 80 Hảo Cảm để kết nghĩa'}">
                        Kết Bái Huynh Đệ
                      </button>
                    ` : ''}
                    <button class="tactical-btn ${canRecruit ? 'tactical-btn--success' : 'tactical-btn--disabled'} tactical-btn--sm"
                      ${canRecruit ? `onclick="GrandCommandHubUI.recruitRetainer('${g.npcId}')"` : 'disabled'}
                      title="${canRecruit ? 'Chiêu mộ vào FAC-LIANG-CLAN' : 'Cần kết bái hoặc Hảo cảm ≥ 70'}">
                      Chiêu Mộ Tướng Soái
                    </button>
                  </div>
                </div>
              `;
            }).join('') : ''}
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="grand-hub-error">[LỖI] ${err.message}</div>`;
    }
  }

  let selectedBanquetTier = 'TIET_KIEM';

  function selectBanquetTier(tier) {
    selectedBanquetTier = tier;
    document.querySelectorAll('.hub-banquet-card').forEach(c => c.classList.remove('selected'));
    const target = document.getElementById(`card-banquet-${tier}`);
    if (target) target.classList.add('selected');
  }

  async function executeHostBanquet() {
    if (isSubmittingAction) return;
    isSubmittingAction = true;
    try {
      const chks = document.querySelectorAll('.chk-banquet-guest:checked');
      const guestIds = Array.from(chks).map(c => c.value);

      if (guestIds.length === 0) {
        showToast('Vui lòng chọn ít nhất 1 vị hào kiệt làm khách mời', true);
        isSubmittingAction = false;
        return;
      }

      const tierCaps = { TIET_KIEM: 2, HAO_HIEP: 4, DAO_VIEN: 8 };
      const maxCap = tierCaps[selectedBanquetTier] || 2;
      if (guestIds.length > maxCap) {
        showToast(`Số lượng khách mời (${guestIds.length}) vượt quá sức chứa tối đa của yến tiệc (${maxCap} vị)`, true);
        isSubmittingAction = false;
        return;
      }

      const res = await fetch('/api/banquet/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'PLY-0001',
          tier: selectedBanquetTier,
          guestNpcIds: guestIds,
          allowAutoProcure: true
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Thiết yến thất bại');

      showToast('Yến tiệc hoàn tất! Hảo cảm và sĩ khí toàn bộ khách quý tăng vọt!');
      renderTabContent('tavern');
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    } finally {
      isSubmittingAction = false;
    }
  }

  async function swearBrotherhood(npcId) {
    if (isSubmittingAction) return;
    isSubmittingAction = true;
    try {
      const res = await fetch('/api/banquet/brotherhood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'PLY-0001', npcId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Kết nghĩa thất bại');

      showToast(data.result?.ceremonyNarrativeVi || 'Kết bái Đào Viên thành công! Mở khóa trọn vẹn thông tin Fog Tier 5!');
      renderTabContent('tavern');
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    } finally {
      isSubmittingAction = false;
    }
  }

  async function recruitRetainer(heroNpcId) {
    if (isSubmittingAction) return;
    isSubmittingAction = true;
    try {
      const res = await fetch('/api/banquet/recruit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'PLY-0001', heroNpcId, assignedRole: 'COMMANDER' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Chiêu mộ thất bại');

      showToast(data.result?.narrativeVi || 'Đã chính thức chiêu mộ danh tướng vào gia tộc Lương Thị!');
      renderTabContent('tavern');
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    } finally {
      isSubmittingAction = false;
    }
  }

  function showToast(msg, isError = false) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, isError);
    } else {
      const t = document.getElementById('toast');
      if (t) {
        t.textContent = msg;
        t.className = `toast ${isError ? 'toast--error' : 'toast--success'}`;
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3500);
      } else {
        alert(msg);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Public Export
  // --------------------------------------------------------------------------

  window.GrandCommandHubUI = {
    open: openHub,
    close: closeHub,
    switchTab,
    renderTabContent,
    executeWorkShift,
    switchLineageSubTab,
    submitCourtship,
    executeHouseholdRest,
    assignMasterDialog,
    designateHeir,
    executeSuccession,
    initiateSparring,
    initiateArenaChallenge,
    submitDuelCommand,
    selectBanquetTier,
    executeHostBanquet,
    swearBrotherhood,
    recruitRetainer
  };

  // Keyboard shortcut: Press Escape to close hub
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('grand-command-hub-modal');
      if (modal && !modal.classList.contains('hidden')) {
        closeHub();
      }
    }
  });

})();
