/**
 * ThreeKingdoms-AgentEngine: Inter-City Caravan & Regional Market Arbitrage UI (public/js/caravan-ui.js)
 * Adheres to AgentOption Universe Architecture v4.0 & Anti-AI-Slop Standards (AS-05, AS-11, AS-12).
 */

(function () {
  let activeTab = 'arbitrage'; // 'arbitrage' | 'dispatch' | 'tracking'
  let cachedSettlements = [];
  let cachedArbitrageData = [];
  let cachedPlayerCaravans = [];
  let cachedWarehouseInventory = [];
  let selectedFromSettlement = 'zhuo_xian';
  let selectedToSettlement = 'ye_cheng';
  let selectedItemCode = '';
  let selectedGuardTier = 'VETERAN';

  const GUARD_TIERS = {
    MILITIA: { code: 'MILITIA', nameVi: 'Dân Binh Địa Phương', troops: 10, cost: 100, desc: 'Phòng thủ sơ cấp, dễ bị cướp nếu qua hẻm núi' },
    VETERAN: { code: 'VETERAN', nameVi: 'Bảo Tiêu Tinh Nhuệ', troops: 25, cost: 250, desc: 'Bảo tiêu chuyên nghiệp, đẩy lui sơn tặc quy mô vừa' },
    ELITE_RETINUE: { code: 'ELITE_RETINUE', nameVi: 'Gia Hào Thân Vệ Đội', troops: 40, cost: 500, desc: 'Vũ trang hạng nặng, bảo toàn 100% hàng hóa lộ trình dài' }
  };

  function openCaravanModal(defaultTab = 'arbitrage') {
    activeTab = defaultTab;
    ensureModalDom();
    const modal = document.getElementById('caravan-trade-modal');
    if (modal) {
      modal.classList.remove('hidden');
      loadCaravanData();
    }
  }

  function closeCaravanModal() {
    const modal = document.getElementById('caravan-trade-modal');
    if (modal) modal.classList.add('hidden');
  }

  function ensureModalDom() {
    if (document.getElementById('caravan-trade-modal')) return;

    const modalDiv = document.createElement('div');
    modalDiv.id = 'caravan-trade-modal';
    modalDiv.className = 'modal-backdrop hidden';
    modalDiv.innerHTML = `
      <div class="modal-card" style="max-width: 960px; width: 95vw; max-height: 90vh; display: flex; flex-direction: column;">
        <!-- Header -->
        <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding: 14px 20px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="poi-seal" style="background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); font-weight: 700; padding: 2px 7px; border-radius: 4px; font-size: 13px;">商</span>
              <h3 class="modal-title" style="margin: 0; font-size: 16px; font-weight: 700; color: #f1f5f9;">Dư Đồ Thương Tuyến & Mậu Dịch Liên Thành</h3>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
              Phân tích chênh lệch cung cầu 15 châu quận, điều phái thương đoàn và bảo tiêu áp tải quân lương hàng hóa
            </div>
          </div>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" onclick="CaravanUI.close()">&times;</button>
        </div>

        <!-- Navigation Tabs -->
        <div style="display: flex; gap: 8px; padding: 10px 20px; background: rgba(15, 23, 42, 0.6); border-bottom: 1px solid rgba(255,255,255,0.06);">
          <button class="ui-btn ${activeTab === 'arbitrage' ? 'ui-btn--primary' : ''}" id="caravan-tab-arbitrage" onclick="CaravanUI.switchTab('arbitrage')">
            <span>[商] Thị Trường & Chênh Lệch Giá</span>
          </button>
          <button class="ui-btn ${activeTab === 'dispatch' ? 'ui-btn--primary' : ''}" id="caravan-tab-dispatch" onclick="CaravanUI.switchTab('dispatch')">
            <span>[隊] Thiết Lập Thương Đoàn</span>
          </button>
          <button class="ui-btn ${activeTab === 'tracking' ? 'ui-btn--primary' : ''}" id="caravan-tab-tracking" onclick="CaravanUI.switchTab('tracking')">
            <span>[行] Thương Đội Vận Tuyến (<span id="caravan-active-count">0</span>)</span>
          </button>
        </div>

        <!-- Body Content -->
        <div class="modal-body" id="caravan-modal-body" style="padding: 16px 20px; overflow-y: auto; flex: 1;">
          <div style="text-align: center; color: var(--text-muted); padding: 40px;">Đang khảo sát tuyến vận tải thương nghiệp...</div>
        </div>

        <!-- Footer -->
        <div class="modal-footer" style="border-top: 1px solid rgba(255,255,255,0.08); padding: 10px 20px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; color: var(--text-muted);">
            Thương Nghiệp: <strong style="color: #fbbf24;" id="caravan-hud-com">78</strong> • Thống Soái: <strong style="color: #38bdf8;" id="caravan-hud-ldr">70</strong>
          </div>
          <button class="btn btn-outline" onclick="CaravanUI.close()">Đóng Cửa Sổ</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalDiv);
  }

  function switchTab(tabName) {
    activeTab = tabName;
    const tabs = ['arbitrage', 'dispatch', 'tracking'];
    tabs.forEach(t => {
      const btn = document.getElementById(`caravan-tab-${t}`);
      if (btn) {
        if (t === tabName) {
          btn.classList.add('ui-btn--primary');
        } else {
          btn.classList.remove('ui-btn--primary');
        }
      }
    });
    renderCurrentTab();
  }

  async function loadCaravanData() {
    try {
      // 1. Fetch Inventory & Player Status
      const [invRes, playerCaravansRes, statusRes] = await Promise.all([
        fetch('/api/inventory').then(r => r.json()).catch(() => ({ items: [] })),
        fetch('/api/caravans/player').then(r => r.json()).catch(() => ({ caravans: [] })),
        fetch('/api/status').then(r => r.json()).catch(() => ({ player: {} }))
      ]);

      cachedWarehouseInventory = (invRes.items || []).filter(i => (i.quantity || 0) > 0);
      cachedPlayerCaravans = playerCaravansRes.caravans || [];

      // Update active caravans count badge
      const activeCount = cachedPlayerCaravans.filter(c => c.status === 'EN_ROUTE' || c.status === 'ARRIVED').length;
      const countEl = document.getElementById('caravan-active-count');
      if (countEl) countEl.innerText = activeCount;

      // Update HUD stats
      if (statusRes.player) {
        const comEl = document.getElementById('caravan-hud-com');
        const ldrEl = document.getElementById('caravan-hud-ldr');
        if (comEl) comEl.innerText = statusRes.player.com_attr || 78;
        if (ldrEl) ldrEl.innerText = statusRes.player.ldr_attr || 70;
      }

      // Fetch Arbitrage data for selected settlement
      await fetchArbitrageData(selectedFromSettlement);

      renderCurrentTab();
    } catch (err) {
      console.error('Failed to load caravan data:', err);
      const body = document.getElementById('caravan-modal-body');
      if (body) {
        body.innerHTML = `<div class="tactical-empty" style="color: #f87171;">Lỗi tải dữ liệu thương nghiệp: ${err.message}</div>`;
      }
    }
  }

  async function fetchArbitrageData(fromLoc) {
    try {
      const res = await fetch(`/api/economy/arbitrage?from=${encodeURIComponent(fromLoc)}`);
      const data = await res.json();
      if (data.success) {
        cachedArbitrageData = data.opportunities || [];
        cachedSettlements = data.settlements || [];
      }
    } catch (e) {
      console.warn('Fallback arbitrage fetch:', e);
    }
  }

  function renderCurrentTab() {
    const body = document.getElementById('caravan-modal-body');
    if (!body) return;

    if (activeTab === 'arbitrage') {
      renderArbitrageTab(body);
    } else if (activeTab === 'dispatch') {
      renderDispatchTab(body);
    } else if (activeTab === 'tracking') {
      renderTrackingTab(body);
    }
  }

  // --- TAB 1: ARBITRAGE MATRIX ---
  function renderArbitrageTab(container) {
    const settlementOptions = [
      { id: 'zhuo_xian', nameVi: 'Trác Huyện (U Châu)' },
      { id: 'ji_cheng', nameVi: 'Kế Thành (U Châu)' },
      { id: 'ye_cheng', nameVi: 'Nghiệp Thành (Ký Châu)' },
      { id: 'guang_zong', nameVi: 'Quảng Tông (Ký Châu)' },
      { id: 'ping_yuan', nameVi: 'Bình Nguyên (Thanh Châu)' },
      { id: 'luo_yang', nameVi: 'Lạc Dương (Tư Lệ)' },
      { id: 'xu_chang', nameVi: 'Hứa Xương (Dự Châu)' },
      { id: 'changan', nameVi: 'Trường An (Kinh Triệu)' },
      { id: 'cheng_du', nameVi: 'Thành Đô (Ích Châu)' },
      { id: 'jian_ye', nameVi: 'Kiến Nghiệp (Dương Châu)' },
      { id: 'xiang_yang', nameVi: 'Tương Dương (Kinh Châu)' }
    ];

    container.innerHTML = `
      <div style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.5); padding: 10px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 11.5px; color: var(--text-muted); font-weight: 600;">Căn Cứ Thu Mua Khởi Điểm:</span>
          <select class="form-input" id="sel-arbitrage-origin" onchange="CaravanUI.changeOriginSettlement(this.value)" style="padding: 4px 8px; font-size: 12px; background: #0f172a; border-color: rgba(255,255,255,0.15); color: #fbbf24;">
            ${settlementOptions.map(s => `
              <option value="${s.id}" ${s.id === selectedFromSettlement ? 'selected' : ''}>${s.nameVi}</option>
            `).join('')}
          </select>
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">
          Cơ hội sinh lời được tính toán sau khi khấu trừ suy hao cự ly
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px;">
        ${cachedArbitrageData.length === 0 ? `
          <div class="tactical-empty" style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted);">
            Đang phân tích tuyến buôn có tỷ suất lợi nhuận cao nhất...
          </div>
        ` : cachedArbitrageData.map(opp => {
          const isHighProfit = opp.marginPercent >= 50;
          return `
            <div class="tactical-card" style="display: flex; flex-direction: column; justify-content: space-between; background: rgba(30, 41, 59, 0.7); border: 1px solid ${isHighProfit ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.06)'}; padding: 12px; border-radius: 6px;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <div>
                    <span style="font-size: 13px; font-weight: 700; color: #f1f5f9;">${opp.itemNameVi || opp.itemCode}</span>
                    <div style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono);">${opp.itemCode}</div>
                  </div>
                  <span class="tactical-badge ${isHighProfit ? 'tactical-badge--warning' : 'tactical-badge--info'}" style="font-size: 10px; font-weight: 700;">
                    +${opp.marginPercent}% Lãi
                  </span>
                </div>

                <div class="tactical-stat-grid" style="grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; background: rgba(15,23,42,0.4); padding: 8px; border-radius: 4px;">
                  <div>
                    <div style="font-size: 9.5px; color: var(--text-muted);">Giá Mua Khởi Điểm:</div>
                    <div style="font-size: 12px; font-weight: 700; color: #94a3b8;">${opp.buyPrice} quan</div>
                  </div>
                  <div>
                    <div style="font-size: 9.5px; color: var(--text-muted);">Giá Bán Đích Đến:</div>
                    <div style="font-size: 12px; font-weight: 700; color: #4ade80;">${opp.sellPrice} quan</div>
                  </div>
                </div>

                <div style="font-size: 10.5px; color: var(--text-muted); margin-bottom: 8px;">
                  Đích đến tối ưu: <strong style="color: #fbbf24;">${opp.bestDestinationNameVi}</strong>
                  <span style="font-size: 9.5px; opacity: 0.75;">(${opp.distanceLi} dặm)</span>
                </div>
              </div>

              <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="CaravanUI.prefillDispatch('${opp.itemCode}', '${selectedFromSettlement}', '${opp.bestDestination}')" style="width: 100%; margin-top: 6px;">
                Thiết Lập Tuyến Này →
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // --- TAB 2: DISPATCH CARAVAN ---
  function renderDispatchTab(container) {
    const settlementOptions = [
      { id: 'zhuo_xian', nameVi: 'Trác Huyện (U Châu)' },
      { id: 'ji_cheng', nameVi: 'Kế Thành (U Châu)' },
      { id: 'ye_cheng', nameVi: 'Nghiệp Thành (Ký Châu)' },
      { id: 'guang_zong', nameVi: 'Quảng Tông (Ký Châu)' },
      { id: 'ping_yuan', nameVi: 'Bình Nguyên (Thanh Châu)' },
      { id: 'luo_yang', nameVi: 'Lạc Dương (Tư Lệ)' },
      { id: 'xu_chang', nameVi: 'Hứa Xương (Dự Châu)' },
      { id: 'changan', nameVi: 'Trường An (Kinh Triệu)' },
      { id: 'cheng_du', nameVi: 'Thành Đô (Ích Châu)' },
      { id: 'jian_ye', nameVi: 'Kiến Nghiệp (Dương Châu)' },
      { id: 'xiang_yang', nameVi: 'Tương Dương (Kinh Châu)' }
    ];

    if (!selectedItemCode && cachedWarehouseInventory.length > 0) {
      selectedItemCode = cachedWarehouseInventory[0].item_code;
    }

    const currentSelectedItem = cachedWarehouseInventory.find(i => i.item_code === selectedItemCode);
    const availableQty = currentSelectedItem ? currentSelectedItem.quantity : 0;

    container.innerHTML = `
      <div style="max-width: 680px; margin: 0 auto; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.08); padding: 18px 24px; border-radius: 8px;">
        <h4 style="margin: 0 0 14px 0; font-size: 14px; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.5px;">
          Lệnh Phái Thương Đoàn Xuất Tuyến
        </h4>

        <!-- Form Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
          <div>
            <label style="display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Xuất Phát (Căn Cứ):</label>
            <select class="form-input" id="dispatch-from" onchange="CaravanUI.onDispatchOriginChange(this.value)" style="width: 100%; padding: 6px 10px; font-size: 12px; background: #0f172a; border-color: rgba(255,255,255,0.15); color: #f1f5f9;">
              ${settlementOptions.map(s => `
                <option value="${s.id}" ${s.id === selectedFromSettlement ? 'selected' : ''}>${s.nameVi}</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Đích Đến (Thị Trường Tiêu Thụ):</label>
            <select class="form-input" id="dispatch-to" onchange="CaravanUI.onDispatchTargetChange(this.value)" style="width: 100%; padding: 6px 10px; font-size: 12px; background: #0f172a; border-color: rgba(255,255,255,0.15); color: #f1f5f9;">
              ${settlementOptions.filter(s => s.id !== selectedFromSettlement).map(s => `
                <option value="${s.id}" ${s.id === selectedToSettlement ? 'selected' : ''}>${s.nameVi}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Cargo Select -->
        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Hàng Hóa Chuyên Chở (Kho Lương Gia):</label>
          ${cachedWarehouseInventory.length === 0 ? `
            <div style="font-size: 11px; color: #f87171; font-style: italic;">Kho hàng trống! Hãy mua thêm hàng tại chợ hoặc chế tác quân trang trước.</div>
          ` : `
            <select class="form-input" id="dispatch-item" onchange="CaravanUI.onCargoChange(this.value)" style="width: 100%; padding: 6px 10px; font-size: 12px; background: #0f172a; border-color: rgba(255,255,255,0.15); color: #f1f5f9; margin-bottom: 8px;">
              ${cachedWarehouseInventory.map(item => `
                <option value="${item.item_code}" ${item.item_code === selectedItemCode ? 'selected' : ''}>
                  ${item.description || item.item_code} (Hiện có: ${item.quantity} | Giá gốc: ${item.unit_cost_basis || 0} quan)
                </option>
              `).join('')}
            </select>
          `}
        </div>

        <!-- Quantity Slider / Input -->
        <div style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
            <span>Số Lượng Vận Chuyển:</span>
            <span>Tối đa: <strong style="color: #fbbf24;">${availableQty}</strong></span>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="range" id="dispatch-qty-range" min="1" max="${Math.max(1, availableQty)}" value="${Math.min(10, availableQty)}" oninput="document.getElementById('dispatch-qty-num').value = this.value; CaravanUI.updateProjection();" style="flex: 1;">
            <input type="number" id="dispatch-qty-num" min="1" max="${Math.max(1, availableQty)}" value="${Math.min(10, availableQty)}" oninput="document.getElementById('dispatch-qty-range').value = this.value; CaravanUI.updateProjection();" style="width: 70px; padding: 4px 8px; font-size: 12px; background: #0f172a; border: 1px solid rgba(255,255,255,0.15); color: #f1f5f9; text-align: center;">
          </div>
        </div>

        <!-- Guard Escort Tiers -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">Bảo Tiêu & Hộ Vệ Đoàn:</label>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
            ${Object.values(GUARD_TIERS).map(g => `
              <div class="tactical-card ${selectedGuardTier === g.code ? 'tactical-card--accent' : ''}" onclick="CaravanUI.selectGuardTier('${g.code}')" style="cursor: pointer; padding: 10px; text-align: center; border-radius: 4px; background: ${selectedGuardTier === g.code ? 'rgba(245,158,11,0.12)' : 'rgba(15,23,42,0.4)'}; border: 1px solid ${selectedGuardTier === g.code ? '#fbbf24' : 'rgba(255,255,255,0.06)'};">
                <div style="font-size: 11.5px; font-weight: 700; color: #f1f5f9;">${g.nameVi}</div>
                <div style="font-size: 11px; color: #fbbf24; font-weight: 600; margin: 2px 0;">${g.cost} quan</div>
                <div style="font-size: 9.5px; color: var(--text-muted);">${g.troops} Quân sĩ</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Projection Box -->
        <div id="dispatch-projection-box" style="background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.06); padding: 12px 14px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 10.5px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 700;">Dự Toán Kinh Doanh Tuyến Này:</div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
            <div>
              <div style="font-size: 9.5px; color: var(--text-muted);">Phí Bảo Tiêu:</div>
              <div style="font-size: 12px; font-weight: 700; color: #f87171;" id="proj-guard-cost">250 quan</div>
            </div>
            <div>
              <div style="font-size: 9.5px; color: var(--text-muted);">Doanh Thu Dự Kiến:</div>
              <div style="font-size: 12px; font-weight: 700; color: #4ade80;" id="proj-gross-rev">0 quan</div>
            </div>
            <div>
              <div style="font-size: 9.5px; color: var(--text-muted);">Lãi Ròng Ước Tính:</div>
              <div style="font-size: 13px; font-weight: 800; color: #fbbf24;" id="proj-net-profit">0 quan</div>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <button class="ui-btn ui-btn--primary" id="btn-submit-caravan" onclick="CaravanUI.submitDispatch()" style="width: 100%; padding: 10px; font-size: 13px; font-weight: 700;">
          Ký Lệnh Xuất Phát Thương Đội
        </button>
      </div>
    `;

    updateProjection();
  }

  // --- TAB 3: TRACKING ACTIVE CARAVANS ---
  function renderTrackingTab(container) {
    if (cachedPlayerCaravans.length === 0) {
      container.innerHTML = `
        <div class="tactical-empty" style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 24px; font-weight: 700; color: #64748b; margin-bottom: 10px;">[無]</div>
          <div style="font-size: 13px; font-weight: 600; color: #f1f5f9; margin-bottom: 4px;">Chưa Có Thương Đoàn Nào Đang Lưu Thông</div>
          <div style="font-size: 11px;">Hãy chuyển sang mục "Thiết Lập Thương Đoàn" để phái chuyến hàng đầu tiên đi các châu quận.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; background: rgba(30, 41, 59, 0.5); padding: 8px 14px; border-radius: 6px;">
        <span style="font-size: 11.5px; color: var(--text-muted);">Tiến độ lưu thông trên các quan đạo liên tỉnh:</span>
        <button class="ui-btn ui-btn--sm" onclick="CaravanUI.tickProgress()" title="Chờ 1 ngày (tốn 1 ngày hành trình) để thương đoàn tiến bước">
          Chờ 1 Ngày Trên Dịch Đạo →
        </button>
      </div>

      <div style="display: grid; gap: 12px;">
        ${cachedPlayerCaravans.map(car => {
          const isArrived = car.status === 'ARRIVED';
          const isCompleted = car.status === 'COMPLETED' || car.status === 'SUCCESS_TRADED';
          const isPlayerOwned = Number(car.dispatched_by_player ?? car.dispatchedByPlayer) === 1;
          const canClaim = isArrived && isPlayerOwned;
          const caravanId = car.caravan_id || car.caravanId;
          const progressPercent = Math.min(100, Math.round((car.route_progress || car.routeProgress || 0) * 100));

          return `
            <div class="tactical-card" style="background: rgba(30, 41, 59, 0.7); border: 1px solid ${isArrived ? '#4ade80' : 'rgba(255,255,255,0.08)'}; padding: 14px; border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="poi-seal" style="background: #1e293b; color: #38bdf8; font-size: 11px; padding: 1px 5px; border-radius: 3px;">隊</span>
                    <strong style="font-size: 13px; color: #f1f5f9;">${car.caravan_name}</strong>
                  </div>
                  <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">
                    Chở: <strong>${car.cargo_quantity} đơn vị</strong> (${car.cargo_item_code}) • Bảo tiêu: <strong>${car.guard_troops} quân</strong>
                  </div>
                </div>

                <span class="tactical-badge ${isCompleted ? 'tactical-badge--info' : isArrived ? 'tactical-badge--success' : 'tactical-badge--warning'}">
                  ${isCompleted ? 'Đã Quyết Toán' : isArrived ? 'Đã Cập Bến' : `Đang Lưu Thông (${progressPercent}%)`}
                </span>
              </div>

              <!-- Progress Bar -->
              <div class="tactical-progress-track" style="height: 7px; background: rgba(15,23,42,0.8); border-radius: 4px; overflow: hidden; margin-bottom: 10px;">
                <div class="tactical-progress-bar ${isArrived ? 'tactical-progress-bar--success' : ''}" style="width: ${progressPercent}%; height: 100%; background: ${isArrived ? '#22c55e' : '#f59e0b'}; transition: width 0.3s ease;"></div>
              </div>

              ${car.encounter_log ? `
                <div style="font-size: 10.5px; color: #fbbf24; background: rgba(245,158,11,0.08); padding: 6px 10px; border-radius: 4px; margin-bottom: 10px; border-left: 3px solid #f59e0b;">
                  ${car.encounter_log}
                </div>
              ` : ''}

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 11px; color: var(--text-muted);">
                  Trị giá dự toán: <strong style="color: #4ade80;">${car.cargo_value_qian || 0} quan</strong>
                </div>

                ${canClaim ? `
                  <button class="ui-btn ui-btn--success ui-btn--sm" onclick="CaravanUI.claimCaravan('${caravanId}')">
                    Quyết Toán & Nhận Quan →
                  </button>
                ` : isArrived && !isPlayerOwned ? `
                  <span style="font-size: 10px; color: var(--text-muted); font-style: italic;">Phe phái đã tự quyết toán</span>
                ` : isCompleted ? `
                  <span style="font-size: 10px; color: var(--text-muted); font-style: italic;">Đã hoàn thành</span>
                ` : `
                  <span style="font-size: 10px; color: #38bdf8; font-style: italic;">Đang trên dịch đạo...</span>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Helper Actions
  function prefillDispatch(itemCode, fromLoc, toLoc) {
    selectedItemCode = itemCode;
    selectedFromSettlement = fromLoc;
    selectedToSettlement = toLoc;
    switchTab('dispatch');
  }

  function changeOriginSettlement(val) {
    selectedFromSettlement = val;
    fetchArbitrageData(val).then(() => renderArbitrageTab(document.getElementById('caravan-modal-body')));
  }

  function onDispatchOriginChange(val) {
    selectedFromSettlement = val;
    updateProjection();
  }

  function onDispatchTargetChange(val) {
    selectedToSettlement = val;
    updateProjection();
  }

  function onCargoChange(val) {
    selectedItemCode = val;
    const item = cachedWarehouseInventory.find(i => i.item_code === val);
    const available = item ? item.quantity : 0;
    const numEl = document.getElementById('dispatch-qty-num');
    const rangeEl = document.getElementById('dispatch-qty-range');
    if (numEl) {
      numEl.max = available;
      numEl.value = Math.min(10, available);
    }
    if (rangeEl) {
      rangeEl.max = available;
      rangeEl.value = Math.min(10, available);
    }
    updateProjection();
  }

  function selectGuardTier(code) {
    selectedGuardTier = code;
    const container = document.getElementById('caravan-modal-body');
    if (container) renderDispatchTab(container);
  }

  async function updateProjection() {
    const qtyEl = document.getElementById('dispatch-qty-num');
    const qty = parseFloat(qtyEl ? qtyEl.value : 10) || 10;
    const guard = GUARD_TIERS[selectedGuardTier] || GUARD_TIERS.VETERAN;

    const guardEl = document.getElementById('proj-guard-cost');
    const grossEl = document.getElementById('proj-gross-rev');
    const netEl = document.getElementById('proj-net-profit');

    if (guardEl) guardEl.innerText = `${guard.cost} quan`;

    try {
      const res = await fetch(`/api/economy/regional-prices?settlement=${encodeURIComponent(selectedToSettlement)}&itemCode=${encodeURIComponent(selectedItemCode)}`);
      const data = await res.json();
      if (data.success && data.price) {
        const destPrice = data.price;
        const gross = Math.round(destPrice * qty);
        const item = cachedWarehouseInventory.find(i => i.item_code === selectedItemCode);
        const costBasis = (item ? item.unit_cost_basis || 0 : 0) * qty;
        const net = gross - guard.cost - costBasis;

        if (grossEl) grossEl.innerText = `${gross} quan`;
        if (netEl) {
          netEl.innerText = `${net >= 0 ? '+' : ''}${net} quan`;
          netEl.style.color = net >= 0 ? '#4ade80' : '#f87171';
        }
      }
    } catch (e) {
      if (grossEl) grossEl.innerText = 'Đang tính...';
    }
  }

  async function submitDispatch() {
    const qtyEl = document.getElementById('dispatch-qty-num');
    const qty = parseFloat(qtyEl ? qtyEl.value : 10) || 10;
    const btn = document.getElementById('btn-submit-caravan');

    if (btn) btn.disabled = true;

    try {
      const res = await fetch('/api/caravans/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromSettlementId: selectedFromSettlement,
          toSettlementId: selectedToSettlement,
          cargoItemCode: selectedItemCode,
          cargoQuantity: qty,
          guardTier: selectedGuardTier
        })
      });

      const data = await res.json();
      if (!data.success) {
        alert(`Không thể phái thương đoàn: ${data.error}`);
        return;
      }

      if (typeof window.apiSpendActionTime === 'function') {
        try {
          await window.apiSpendActionTime('ENTERPRISE_MANAGE', null, 'Lập thương đoàn');
        } catch (timeErr) {
          if (typeof showToast === 'function') showToast(timeErr.message, true);
        }
      }
      if (typeof showToast === 'function') {
        showToast(`Thương đoàn "${data.caravanName || 'Tiêu Xa'}" đã lên đường tới ${selectedToSettlement}!`);
      }

      // Reload data and jump to tracking tab
      await loadCaravanData();
      switchTab('tracking');

      // Refresh protagonist HUD / inventory if available
      if (typeof updateStatsHUD === 'function') updateStatsHUD();
      if (typeof loadDeckInventory === 'function') loadDeckInventory();
    } catch (err) {
      alert(`Lỗi kết nối khi phái thương đoàn: ${err.message}`);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function tickProgress() {
    try {
      const res = await fetch('/api/caravans/tick-progress', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (typeof showToast === 'function') {
          const dateLabel = data.time && data.time.nextDate ? ` (${data.time.nextDate})` : '';
          showToast(`Một ngày trôi qua${dateLabel}: các thương đoàn đã tiến bước trên dịch đạo!`);
        }
        await loadCaravanData();
        renderCurrentTab();
      } else if (typeof showToast === 'function') {
        showToast(data.error || 'Không thể cho thời gian trôi qua lúc này.', true);
      }
    } catch (e) {
      console.error('Tick progress failed:', e);
    }
  }

  async function claimCaravan(caravanId) {
    try {
      const res = await fetch('/api/caravans/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caravanId })
      });

      const data = await res.json();
      if (!data.success) {
        alert(`Quyết toán thất bại: ${data.error}`);
        return;
      }

      if (typeof showToast === 'function') {
        showToast(`Quyết toán thành công: Thu về ${data.grossRevenue} quan (Lãi: +${data.netProfit} quan, +${data.expGained || 25} EXP Thương Nghiệp)!`);
      }

      await loadCaravanData();
      renderCurrentTab();

      // Refresh protagonist HUD
      if (typeof updateStatsHUD === 'function') updateStatsHUD();
      if (typeof loadDeckInventory === 'function') loadDeckInventory();
      if (typeof loadDeckLedger === 'function') loadDeckLedger();
    } catch (err) {
      alert(`Lỗi khi quyết toán thương đoàn: ${err.message}`);
    }
  }

  // Public Interface
  window.CaravanUI = {
    open: openCaravanModal,
    close: closeCaravanModal,
    switchTab,
    changeOriginSettlement,
    prefillDispatch,
    onDispatchOriginChange,
    onDispatchTargetChange,
    onCargoChange,
    selectGuardTier,
    updateProjection,
    submitDispatch,
    tickProgress,
    claimCaravan
  };
})();
