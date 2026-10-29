/**
 * ThreeKingdoms-AgentEngine: Spatial POI Modals Module (public/js/spatial-poi-modals.js)
 * Implements physically-grounded interactive modals for Points of Interest (POIs):
 * 1. Tavern Modal (Tửu Quán Trác Huyện): Wine drinking, Hero banquets, Brotherhood, Retainers
 * 2. Martial Arena Modal (Lôi Đài Giáo Trường): Sparring with Zhang Fei/Guan Yu, 3-Tier Arena Challenges, Interactive Clash
 * 3. Residence Modal (Tư Trạch Vườn Đào): Rest & recovery, Spouse courtship & dialogue, Heir mentorship
 *
 * Adheres strictly to AgentOption Universe Architecture v4.0 & Anti-AI-Slop standards.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SpatialPoiModals = factory();
    Object.assign(root, root.SpatialPoiModals);
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let activeTavernTab = 'drink';
  let activeArenaTab = 'spar';
  let activeResidenceTab = 'rest';

  let currentActiveDuelId = null;
  let cachedArenaRoster = null;
  let cachedBanquetTiers = null;
  let cachedFamilyOverview = null;

  function showNotification(msg, isError = false) {
    if (typeof showToast === 'function') {
      showToast(msg, isError);
    } else {
      console.log(`[SpatialPoiModals] ${msg}`);
    }
  }

  // =========================================================================
  // 1. TAVERN & HERO BANQUET MODAL (Tửu Quán Trác Huyện)
  // =========================================================================

  function ensureTavernModalDom() {
    const existing = document.getElementById('spatial-tavern-modal');
    // Only the legacy markup (with its own body id) is ours. A foreign shell
    // may own the same id; replace it instead of leaving an empty dialog.
    if (existing && existing.querySelector('#tavern-modal-body')) return;
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'spatial-tavern-modal';
    modal.className = 'modal-backdrop hidden';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg spatial-poi-dialog">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-title-seal">酒</span>
            <div>
              <h2 class="modal-title-text" id="tavern-modal-title">Tửu Quán Trác Huyện • Ẩm Tửu & Tụ Nghĩa Hào Kiệt</h2>
              <div class="modal-subtitle">Gặp gỡ anh hùng bốn phương, mở tiệc rượu kết giao và chiêu mộ môn khách</div>
            </div>
          </div>
          <button class="btn-close-modal" onclick="SpatialPoiModals.closeTavernModal()" title="Đóng [Esc]">×</button>
        </div>

        <div class="modal-tab-bar" id="tavern-tab-bar">
          <button class="modal-tab-btn active" data-tab="drink" onclick="SpatialPoiModals.switchTavernTab('drink')">
            <span class="tab-seal">酒</span> Ẩm Tửu Dưỡng Thần
          </button>
          <button class="modal-tab-btn" data-tab="banquet" onclick="SpatialPoiModals.switchTavernTab('banquet')">
            <span class="tab-seal">膳</span> Đại Yến Hào Kiệt
          </button>
          <button class="modal-tab-btn" data-tab="brotherhood" onclick="SpatialPoiModals.switchTavernTab('brotherhood')">
            <span class="tab-seal">盟</span> Kết Bái Huynh Đệ
          </button>
          <button class="modal-tab-btn" data-tab="recruit" onclick="SpatialPoiModals.switchTavernTab('recruit')">
            <span class="tab-seal">旗</span> Chiêu Mộ Môn Khách
          </button>
        </div>

        <div class="modal-body" id="tavern-modal-body">
          <!-- Dynamic Content Rendered Here -->
        </div>

        <div class="modal-footer">
          <div class="spatial-status-bar" id="tavern-status-bar">
            <span>Vị trí: <strong>Tửu Quán Trác Huyện</strong> (LOC-0004)</span>
            <span id="tavern-cash-display">Ngân khố: --</span>
          </div>
          <button class="btn-action-ghost" onclick="SpatialPoiModals.closeTavernModal()">Đóng</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async function openTavernModal(initialTab = 'drink') {
    ensureTavernModalDom();
    activeTavernTab = initialTab;
    const modal = document.getElementById('spatial-tavern-modal');
    if (modal) modal.classList.remove('hidden');

    updateTavernCashDisplay();
    await renderTavernTabContent(activeTavernTab);
  }

  function closeTavernModal() {
    const modal = document.getElementById('spatial-tavern-modal');
    if (modal) modal.classList.add('hidden');
  }

  function switchTavernTab(tab) {
    activeTavernTab = tab;
    const bar = document.getElementById('tavern-tab-bar');
    if (bar) {
      bar.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
      });
    }
    renderTavernTabContent(tab);
  }

  async function updateTavernCashDisplay() {
    const el = document.getElementById('tavern-cash-display');
    if (!el) return;
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      const cash = data?.financials?.liquidCash || data?.player?.liquid_cash || 0;
      el.innerHTML = `Ngân khố: <strong style="color: #fbbf24;">${cash.toLocaleString()}</strong> Quan`;
    } catch {
      el.innerText = 'Ngân khố: --';
    }
  }

  async function renderTavernTabContent(tab) {
    const body = document.getElementById('tavern-modal-body');
    if (!body) return;

    if (tab === 'drink') {
      body.innerHTML = `
        <div class="spatial-section">
          <div class="spatial-banner-lead">
            <div class="lead-seal">酒</div>
            <div class="lead-text">
              <h3>Tửu Phường Nức Tiếng Cổ Trấn</h3>
              <p>Hương rượu nếp cái hoa vàng và Đỗ Khang mỹ tửu xộc thẳng vào cánh mũi. Tĩnh tọa thưởng rượu bên cửa sổ giúp xua tan mỏi mệt sa trường, hồi phục thể lực và tăng cao sĩ khí.</p>
            </div>
          </div>

          <div class="spatial-card-grid">
            <div class="spatial-action-card">
              <div class="card-badge">BÌNH DÂN</div>
              <div class="card-header-icon">酒</div>
              <h4 class="card-title">Tiểu Ẩm Rượu Nếp Hương</h4>
              <p class="card-desc">Uống một bát rượu nếp nóng kèm đĩa đậu phộng rang giòn.</p>
              <div class="card-perks">
                <span class="perk-tag green">+25 Thể Lực</span>
                <span class="perk-tag cyan">-15 Mệt Mỏi</span>
                <span class="perk-tag gold">+3 Sĩ Khí</span>
              </div>
              <div class="card-cost">Chi phí: <strong>30</strong> Quan</div>
              <button class="btn-card-execute" onclick="SpatialPoiModals.executeDrinkWine('RƯỢU_NẾP', 30, 25, 15, 3)">
                Nâng Bát Uống Cạn →
              </button>
            </div>

            <div class="spatial-action-card highlight">
              <div class="card-badge gold">DANH TỬU</div>
              <div class="card-header-icon">器</div>
              <h4 class="card-title">Đỗ Khang Mỹ Tửu Trác Huyện</h4>
              <p class="card-desc">Danh tửu ủ chum sành thượng hạng, hương nồng đượm, sảng khoái gân cốt.</p>
              <div class="card-perks">
                <span class="perk-tag green">+55 Thể Lực</span>
                <span class="perk-tag cyan">-35 Mệt Mỏi</span>
                <span class="perk-tag gold">+10 Sĩ Khí</span>
              </div>
              <div class="card-cost">Chi phí: <strong>80</strong> Quan</div>
              <button class="btn-card-execute gold" onclick="SpatialPoiModals.executeDrinkWine('ĐỖ_KHANG', 80, 55, 35, 10)">
                Uống Vò Mỹ Tửu →
              </button>
            </div>
          </div>
        </div>
      `;
    } else if (tab === 'banquet') {
      body.innerHTML = `
        <div class="spatial-section">
          <div class="spatial-banner-lead">
            <div class="lead-seal">宴</div>
            <div class="lead-text">
              <h3>Khởi Xướng Yến Tiệc Hào Kiệt</h3>
              <p>Mở tiệc chiêu đãi tân khách khắp chốn U Châu. Rượu ngon thịt béo khiến các hào kiệt thổ lộ tâm can, bồi đắp hảo cảm vượt bậc.</p>
            </div>
          </div>

          <div class="spatial-form-group">
            <label class="form-label">Chọn Quy Mô Yến Tiệc:</label>
            <div class="banquet-tier-select-grid">
              <div class="tier-card active" id="tier-card-TIET_KIEM" onclick="SpatialPoiModals.selectBanquetTier('TIET_KIEM')">
                <div class="tier-name">Tiểu Yến Tri Kỷ</div>
                <div class="tier-cost">Chi phí: ~95 Quan</div>
                <div class="tier-perk">+15 Hảo cảm • 2 Tân khách</div>
              </div>
              <div class="tier-card" id="tier-card-HAO_HIEP" onclick="SpatialPoiModals.selectBanquetTier('HAO_HIEP')">
                <div class="tier-name">Hào Hiệp Tụ Nghĩa Yến</div>
                <div class="tier-cost">Chi phí: ~350 Quan</div>
                <div class="tier-perk">+35 Hảo cảm • 4 Tân khách</div>
              </div>
              <div class="tier-card" id="tier-card-DAO_VIEN" onclick="SpatialPoiModals.selectBanquetTier('DAO_VIEN')">
                <div class="tier-name">Đào Viên Anh Hùng Yến</div>
                <div class="tier-cost">Chi phí: ~1,200 Quan</div>
                <div class="tier-perk">+60 Hảo cảm • 6 Tân khách</div>
              </div>
            </div>
          </div>

          <div class="spatial-form-group" style="margin-top: 14px;">
            <label class="form-label">Chọn Hào Kiệt Mời Dự Tiệc:</label>
            <div class="guest-selection-list">
              <label class="guest-item">
                <input type="checkbox" name="banquet-guest" value="NPC-0002" checked>
                <span class="guest-avatar">張</span>
                <span class="guest-name">Trương Phi (Dực Đức)</span>
                <span class="guest-badge">Võ Thánh</span>
              </label>
              <label class="guest-item">
                <input type="checkbox" name="banquet-guest" value="NPC-0003" checked>
                <span class="guest-avatar">關</span>
                <span class="guest-name">Quan Vũ (Vân Trường)</span>
                <span class="guest-badge">Nghĩa Hiệp</span>
              </label>
              <label class="guest-item">
                <input type="checkbox" name="banquet-guest" value="NPC-0001">
                <span class="guest-avatar">劉</span>
                <span class="guest-name">Lưu Bị (Huyền Đức)</span>
                <span class="guest-badge">Hoàng Thúc</span>
              </label>
              <label class="guest-item">
                <input type="checkbox" name="banquet-guest" value="NPC-0005">
                <span class="guest-avatar">陳</span>
                <span class="guest-name">Trần Bảo (Thợ Cả Lò Rèn)</span>
                <span class="guest-badge">Đại Tượng Sư</span>
              </label>
            </div>
          </div>

          <div class="spatial-btn-row">
            <button class="btn-action-primary" onclick="SpatialPoiModals.executeHostBanquet()">
              Khởi Xướng Yến Tiệc Ngay →
            </button>
          </div>
        </div>
      `;
    } else if (tab === 'brotherhood') {
      body.innerHTML = '<div class="loading-spinner">Đang tải danh sách kết nghĩa kim lan...</div>';
      try {
        const res = await fetch('/api/banquet/status?playerId=PLY-0001');
        const data = await res.json();
        const sworn = data?.status?.swornBrothers || [];
        const eligible = (data?.status?.candidates || []).filter(c => (c.affinity || 0) >= 75);

        body.innerHTML = `
          <div class="spatial-section">
            <div class="spatial-banner-lead">
              <div class="lead-seal">義</div>
              <div class="lead-text">
                <h3>Đào Viên Kết Nghĩa • Đồng Sinh Cộng Tử</h3>
                <p>Nâng chén ăn thề dưới gốc đào hoa nở rộ, tuy khác họ nhưng nguyện cùng lòng kề vai sát cánh tranh hùng thiên hạ. Yêu cầu Hảo cảm đạt từ 80 trở lên.</p>
              </div>
            </div>

            <h4 class="subhead">Huynh Đệ Kết Nghĩa Hiện Tại (${sworn.length})</h4>
            <div class="brother-list">
              ${sworn.length === 0 ? '<div class="empty-hint">Chưa có huynh đệ kết nghĩa kim lan nào. Hãy mời rượu tăng hảo cảm!</div>' : 
                sworn.map(b => `
                  <div class="brother-card">
                    <span class="brother-avatar">${(b.nameVi || '兄').charAt(0)}</span>
                    <div class="brother-info">
                      <div class="brother-name">${b.nameVi || b.npcId}</div>
                      <div class="brother-status">Kim Lan Huynh Đệ • Tuyệt Đối Trung Thành</div>
                    </div>
                  </div>
                `).join('')
              }
            </div>

            <h4 class="subhead" style="margin-top: 16px;">Hào Kiệt Đủ Điều Kiện Kết Bái</h4>
            <div class="brother-list">
              <div class="brother-card eligible">
                <span class="brother-avatar">張</span>
                <div class="brother-info">
                  <div class="brother-name">Trương Phi (Dực Đức)</div>
                  <div class="brother-status">Hảo Cảm: 85% • Thân thiết tri kỷ</div>
                </div>
                <button class="btn-action-gold-sm" onclick="SpatialPoiModals.executeSwearBrotherhood('NPC-0002')">
                  Cắt Máu Ăn Thề →
                </button>
              </div>
              <div class="brother-card eligible">
                <span class="brother-avatar">關</span>
                <div class="brother-info">
                  <div class="brother-name">Quan Vũ (Vân Trường)</div>
                  <div class="brother-status">Hảo Cảm: 80% • Thân thiết tri kỷ</div>
                </div>
                <button class="btn-action-gold-sm" onclick="SpatialPoiModals.executeSwearBrotherhood('NPC-0003')">
                  Cắt Máu Ăn Thề →
                </button>
              </div>
            </div>
          </div>
        `;
      } catch (e) {
        body.innerHTML = `<div class="error-hint">Không thể tải dữ liệu: ${e.message}</div>`;
      }
    } else if (tab === 'recruit') {
      body.innerHTML = `
        <div class="spatial-section">
          <div class="spatial-banner-lead">
            <div class="lead-seal">旗</div>
            <div class="lead-text">
              <h3>Chiêu Hiền Đãi Sĩ • Tụ Nghĩa Môn Khách</h3>
              <p>Mời gọi các võ tướng, văn thần và hiệp khách gia nhập Lương Gia để thống lĩnh thương đoàn, tuần tra trạch viện hoặc tham gia quân doanh.</p>
            </div>
          </div>

          <div class="spatial-card-grid">
            <div class="spatial-action-card">
              <div class="card-badge">VÕ TƯỚNG</div>
              <div class="card-header-icon">張</div>
              <h4 class="card-title">Trương Phi (Dực Đức)</h4>
              <p class="card-desc">Chiến thần 98 WAR. Thích hợp giữ chức Thống Lĩnh Quân Doanh.</p>
              <div class="card-perks">
                <span class="perk-tag green">WAR 98</span>
                <span class="perk-tag cyan">LDR 85</span>
              </div>
              <button class="btn-card-execute" onclick="SpatialPoiModals.executeRecruitHero('NPC-0002', 'COMMANDER')">
                Chiêu Mộ Thống Lĩnh →
              </button>
            </div>

            <div class="spatial-action-card">
              <div class="card-badge">VÕ THÁNH</div>
              <div class="card-header-icon">關</div>
              <h4 class="card-title">Quan Vũ (Vân Trường)</h4>
              <p class="card-desc">Đại hiệp 97 WAR. Thích hợp giữ chức Tổng Tiêu Sư Hộ Vệ Thương Đoàn.</p>
              <div class="card-perks">
                <span class="perk-tag green">WAR 97</span>
                <span class="perk-tag gold">DIP 72</span>
              </div>
              <button class="btn-card-execute" onclick="SpatialPoiModals.executeRecruitHero('NPC-0003', 'CARAVAN_ESCORT')">
                Chiêu Mộ Tổng Tiêu Sư →
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  let selectedBanquetTier = 'TIET_KIEM';
  function selectBanquetTier(tier) {
    selectedBanquetTier = tier;
    ['TIET_KIEM', 'HAO_HIEP', 'DAO_VIEN'].forEach(t => {
      const el = document.getElementById(`tier-card-${t}`);
      if (el) el.classList.toggle('active', t === tier);
    });
  }

  async function executeDrinkWine(wineName, cost, stamGain, fatigueLoss, moraleGain) {
    try {
      showNotification(`Đang thưởng thức ${wineName}...`);
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PERSONAL_GROWTH',
          sub_type: 'REST_RECOVERY',
          fatigue_delta: fatigueLoss || 25,
          morale_delta: moraleGain || 5,
          memo: `Thưởng thức ${wineName} tại Tửu Quán Trác Huyện`
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Uống rượu thất bại');

      showNotification(`Đã thưởng thức chén rượu ấm nồng! Hồi phục thể lực, Sĩ khí +${moraleGain}.`);
      updateTavernCashDisplay();
      if (typeof loadStatus === 'function') await loadStatus();
      if (typeof loadScene === 'function') await loadScene(window.activeSubLocation);
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, true);
    }
  }

  async function executeHostBanquet() {
    try {
      const selectedGuests = Array.from(document.querySelectorAll('input[name="banquet-guest"]:checked')).map(cb => cb.value);
      if (selectedGuests.length === 0) {
        showNotification('Vui lòng chọn ít nhất một tân khách mời dự tiệc!', true);
        return;
      }

      showNotification('Đang chuẩn bị yến tiệc hào kiệt...');
      const res = await fetch('/api/banquet/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'PLY-0001',
          tier: selectedBanquetTier,
          guestNpcIds: selectedGuests,
          allowAutoProcure: true
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Không thể tổ chức yến tiệc');

      if (typeof window.apiSpendActionTime === 'function') {
        try { await window.apiSpendActionTime('KIZUNA_INTERACT', null, 'Tổ chức yến tiệc'); }
        catch (timeErr) { showNotification(timeErr.message, true); }
      }

      const r = data.result || {};
      showNotification(`Yến tiệc đã khai màn thành công! Hảo cảm tân khách tăng vọt.`);
      closeTavernModal();
      if (typeof loadStatus === 'function') await loadStatus();
      if (typeof loadScene === 'function') await loadScene(window.activeSubLocation);
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, true);
    }
  }

  async function executeSwearBrotherhood(npcId) {
    try {
      showNotification('Đang thực hiện nghi lễ cắt máu ăn thề...');
      const res = await fetch('/api/banquet/brotherhood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'PLY-0001', npcId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Nghi lễ không thành');

      if (typeof window.apiSpendActionTime === 'function') {
        try { await window.apiSpendActionTime('KIZUNA_INTERACT', null, 'Kết nghĩa kim lan'); }
        catch (timeErr) { showNotification(timeErr.message, true); }
      }

      showNotification('Thiên địa chứng giám! Hai người đã chính thức kết nghĩa kim lan huynh đệ!');
      renderTavernTabContent('brotherhood');
      if (typeof loadStatus === 'function') await loadStatus();
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, true);
    }
  }

  async function executeRecruitHero(heroNpcId, role) {
    try {
      showNotification('Đang gửi thư mời hào kiệt gia nhập...');
      const res = await fetch('/api/banquet/recruit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'PLY-0001', heroNpcId, assignedRole: role })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Không thể chiêu mộ');

      if (typeof window.apiSpendActionTime === 'function') {
        try { await window.apiSpendActionTime('WORKFORCE_HIRE', null, 'Chiêu mộ hào kiệt'); }
        catch (timeErr) { showNotification(timeErr.message, true); }
      }

      showNotification('Hào kiệt đã cảm kích thuận lòng gia nhập Lương Gia!');
      closeTavernModal();
      if (typeof loadStatus === 'function') await loadStatus();
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, true);
    }
  }

  // =========================================================================
  // 2. MARTIAL ARENA & SINGLE COMBAT MODAL (Lôi Đài Giáo Trường)
  // =========================================================================

  function ensureArenaModalDom() {
    const existing = document.getElementById('spatial-arena-modal');
    if (existing && existing.querySelector('#arena-modal-body')) return;
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'spatial-arena-modal';
    modal.className = 'modal-backdrop hidden';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg spatial-poi-dialog">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-title-seal">武</span>
            <div>
              <h2 class="modal-title-text" id="arena-modal-title">Lôi Đài Giáo Trường • Tỉ Võ Diễn Võ & Tranh Hùng</h2>
              <div class="modal-subtitle">Giao lưu võ lược cùng danh tướng, lôi đài tỉ thí 3 cấp độ và đấu võ 1v1</div>
            </div>
          </div>
          <button class="btn-close-modal" onclick="SpatialPoiModals.closeArenaModal()" title="Đóng [Esc]">×</button>
        </div>

        <div class="modal-tab-bar" id="arena-tab-bar">
          <button class="modal-tab-btn active" data-tab="spar" onclick="SpatialPoiModals.switchArenaTab('spar')">
            <span class="tab-seal">藝</span> Giao Lưu Võ Nghệ
          </button>
          <button class="modal-tab-btn" data-tab="tournament" onclick="SpatialPoiModals.switchArenaTab('tournament')">
            <span class="tab-seal">勳</span> Lôi Đài Huyện Trác
          </button>
          <button class="modal-tab-btn" data-tab="clash" onclick="SpatialPoiModals.switchArenaTab('clash')">
            <span class="tab-seal">武</span> Đối Quyết 1v1
          </button>
        </div>

        <div class="modal-body" id="arena-modal-body">
          <!-- Dynamic Content Rendered Here -->
        </div>

        <div class="modal-footer">
          <div class="spatial-status-bar">
            <span>Địa điểm: <strong>Lôi Đài Giáo Trường</strong> (LOC-0005)</span>
            <span id="arena-stamina-display">Thể lực: --</span>
          </div>
          <button class="btn-action-ghost" onclick="SpatialPoiModals.closeArenaModal()">Rời Võ Đài</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async function openArenaModal(initialTab = 'spar') {
    ensureArenaModalDom();
    activeArenaTab = initialTab;
    const modal = document.getElementById('spatial-arena-modal');
    if (modal) modal.classList.remove('hidden');

    updateArenaStaminaDisplay();
    await renderArenaTabContent(activeArenaTab);
  }

  function closeArenaModal() {
    const modal = document.getElementById('spatial-arena-modal');
    if (modal) modal.classList.add('hidden');
  }

  function switchArenaTab(tab) {
    activeArenaTab = tab;
    const bar = document.getElementById('arena-tab-bar');
    if (bar) {
      bar.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
      });
    }
    renderArenaTabContent(tab);
  }

  async function updateArenaStaminaDisplay() {
    const el = document.getElementById('arena-stamina-display');
    if (!el) return;
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      const p = data?.player || {};
      el.innerHTML = `Thể lực: <strong style="color: #38bdf8;">${p.fatigue !== undefined ? 100 - p.fatigue : 100}</strong>/100 • Võ Lực: <strong style="color: #f87171;">${p.war_attr || 50}</strong> WAR`;
    } catch {
      el.innerText = 'Thể lực: --';
    }
  }

  async function renderArenaTabContent(tab) {
    const body = document.getElementById('arena-modal-body');
    if (!body) return;

    if (tab === 'spar') {
      body.innerHTML = `
        <div class="spatial-section">
          <div class="spatial-banner-lead">
            <div class="lead-seal">武</div>
            <div class="lead-text">
              <h3>Bình Trực Luận Võ • Giao Lưu Danh Tướng</h3>
              <p>Mài giũa đao thương cùng những đệ nhất dũng sĩ. Giao lưu võ nghệ giúp tăng EXP Võ Lực nhanh chóng, tôi rèn phản xạ cận chiến mà không gây sát thương chí mạng.</p>
            </div>
          </div>

          <div class="spatial-card-grid">
            <div class="spatial-action-card highlight">
              <div class="card-badge red">XÀ MÂU HÀO KIỆT</div>
              <div class="card-header-icon">張</div>
              <h4 class="card-title">Tỉ Thí Cùng Trương Phi (Dực Đức)</h4>
              <p class="card-desc">Bát Xà Mâu xuất quỷ nhập thần, dũng mãnh vô song (WAR 98).</p>
              <div class="card-perks">
                <span class="perk-tag green">+35 WAR EXP</span>
                <span class="perk-tag gold">+5 Sĩ Khí</span>
                <span class="perk-tag cyan">Hảo Cảm +4</span>
              </div>
              <div class="card-cost">Tiêu hao: <strong>20</strong> Thể lực</div>
              <div class="btn-group-row">
                <button class="btn-card-execute" onclick="SpatialPoiModals.executeSparWithHero('NPC-0002', true)">
                  Tỉ Thí Luyện Võ (Auto) →
                </button>
                <button class="btn-card-execute gold" onclick="SpatialPoiModals.startInteractiveDuel('NPC-0002')">
                  Vào Trận 1v1 →
                </button>
              </div>
            </div>

            <div class="spatial-action-card">
              <div class="card-badge emerald">THANH LONG NGHĨA SĨ</div>
              <div class="card-header-icon">關</div>
              <h4 class="card-title">Đàm Đạo Võ Học Cùng Quan Vũ</h4>
              <p class="card-desc">Thanh Long Yển Nguyệt Đao uy trấn thiên hạ, thế công trầm hùng (WAR 97).</p>
              <div class="card-perks">
                <span class="perk-tag green">+40 WAR EXP</span>
                <span class="perk-tag gold">+15 LDR EXP</span>
                <span class="perk-tag cyan">Hảo Cảm +4</span>
              </div>
              <div class="card-cost">Tiêu hao: <strong>25</strong> Thể lực</div>
              <div class="btn-group-row">
                <button class="btn-card-execute" onclick="SpatialPoiModals.executeSparWithHero('NPC-0003', true)">
                  Tỉ Thí Luyện Võ (Auto) →
                </button>
                <button class="btn-card-execute gold" onclick="SpatialPoiModals.startInteractiveDuel('NPC-0003')">
                  Vào Trận 1v1 →
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (tab === 'tournament') {
      body.innerHTML = `
        <div class="spatial-section">
          <div class="spatial-banner-lead">
            <div class="lead-seal">冠</div>
            <div class="lead-text">
              <h3>Đại Hội Lôi Đài 3 Cấp Độ</h3>
              <p>Bước lên đài cao, gióng trống khiêu chiến hảo thủ giang hồ để đoạt giải thưởng tiền thưởng lớn và vang danh chư hầu.</p>
            </div>
          </div>

          <div class="spatial-card-grid">
            <div class="spatial-action-card">
              <div class="card-badge">CẤP 1 • ĐỊA PHƯƠNG</div>
              <div class="card-header-icon">勳</div>
              <h4 class="card-title">Võ Sĩ Bản Địa Huyện Trác</h4>
              <p class="card-desc">Thủ đài võ quán, quyền cước thành thạo (DC 55 WAR).</p>
              <div class="card-perks">
                <span class="perk-tag green">+300 Quan Thưởng</span>
                <span class="perk-tag gold">+30 WAR EXP</span>
              </div>
              <div class="card-cost">Phí ghi danh: <strong>50</strong> Quan</div>
              <button class="btn-card-execute" onclick="SpatialPoiModals.executeArenaChallenge(1)">
                Lên Đài Khiêu Chiến →
              </button>
            </div>

            <div class="spatial-action-card highlight">
              <div class="card-badge gold">CẤP 2 • KIÊU TƯỚNG</div>
              <div class="card-header-icon">勳</div>
              <h4 class="card-title">Hoa Hùng (Tây Lương Kiêu Tướng)</h4>
              <p class="card-desc">Đại tướng Tây Lương chém trảm tướng quân như rơm rác (WAR 88).</p>
              <div class="card-perks">
                <span class="perk-tag green">+1,000 Quan Thưởng</span>
                <span class="perk-tag gold">+60 WAR EXP</span>
                <span class="perk-tag cyan">Chiến Bào Tướng Quân</span>
              </div>
              <div class="card-cost">Phí ghi danh: <strong>200</strong> Quan</div>
              <button class="btn-card-execute gold" onclick="SpatialPoiModals.executeArenaChallenge(2)">
                Lên Đài Khiêu Chiến →
              </button>
            </div>

            <div class="spatial-action-card red-border">
              <div class="card-badge red">CẤP 3 • CHIẾN THẦN</div>
              <div class="card-header-icon">勳</div>
              <h4 class="card-title">Lữ Bố (Phụng Tiên • Vô Song)</h4>
              <p class="card-desc">Chiến thần thiên hạ, Phương Thiên Họa Kích vô địch cõi trần (WAR 100).</p>
              <div class="card-perks">
                <span class="perk-tag green">+3,000 Quan Thưởng</span>
                <span class="perk-tag gold">+150 WAR EXP</span>
                <span class="perk-tag purple">Danh Hiệu Đệ Nhất</span>
              </div>
              <div class="card-cost">Phí ghi danh: <strong>500</strong> Quan</div>
              <button class="btn-card-execute red" onclick="SpatialPoiModals.executeArenaChallenge(3)">
                Tử Chiến Đỉnh Phong →
              </button>
            </div>
          </div>
        </div>
      `;
    } else if (tab === 'clash') {
      if (!currentActiveDuelId) {
        body.innerHTML = `
          <div class="spatial-empty-state">
            <div class="empty-seal">武</div>
            <h3>Chưa Có Trận Đối Quyết Nào Đang Diễn Ra</h3>
            <p>Vui lòng chọn <strong>Giao Lưu Võ Nghệ</strong> hoặc <strong>Lên Đài Khiêu Chiến</strong> để bắt đầu hiệp đấu 1v1 đối kháng trực tiếp.</p>
            <button class="btn-action-primary" onclick="SpatialPoiModals.switchArenaTab('spar')">Tới Võ Đài Chọn Đối Thủ →</button>
          </div>
        `;
        return;
      }

      body.innerHTML = '<div class="loading-spinner">Đang đồng bộ tình hình chiến trường...</div>';
      try {
        const res = await fetch(`/api/duels/active?duelId=${currentActiveDuelId}`);
        const data = await res.json();
        const duel = data?.duel;
        if (!duel) {
          currentActiveDuelId = null;
          renderArenaTabContent('clash');
          return;
        }

        renderClashArenaView(duel);
      } catch (e) {
        body.innerHTML = `<div class="error-hint">Lỗi kết nối chiến trường: ${e.message}</div>`;
      }
    }
  }

  function renderClashArenaView(duel) {
    const body = document.getElementById('arena-modal-body');
    if (!body) return;

    const p = duel.player;
    const opp = duel.opponent;
    const roundNum = duel.currentRound || 1;
    const isOver = duel.isConcluded;

    body.innerHTML = `
      <div class="arena-clash-box">
        <div class="clash-hud-header">
          <span>HIỆP ĐẤU: <strong>${roundNum}/${duel.maxRounds || 5}</strong></span>
          <span>BỐI CẢNH: <strong>${duel.context || 'LÔI ĐÀI GIÁO TRƯỜNG'}</strong></span>
          <span class="clash-status-pill ${isOver ? 'gold' : 'green'}">${isOver ? 'KẾT THÚC' : 'ĐANG ĐỐI ĐẦU'}</span>
        </div>

        <div class="clash-fighters-grid">
          <!-- Player Side -->
          <div class="fighter-card player">
            <div class="fighter-avatar">梁</div>
            <div class="fighter-info">
              <div class="fighter-name">${p.nameVi} <span class="stat-badge">${p.effectiveWar} WAR</span></div>
              <div class="fighter-vitals">
                <div class="vital-label">Sinh Lực (HP): ${p.currentHp}/${p.maxHp}</div>
                <div class="vital-bar"><div class="vital-fill green" style="width: ${(p.currentHp / p.maxHp) * 100}%"></div></div>
                <div class="vital-label">Khí Thế (Spirit): ${p.spirit || 50}/100</div>
                <div class="vital-bar"><div class="vital-fill cyan" style="width: ${p.spirit || 50}%"></div></div>
              </div>
            </div>
          </div>

          <div class="clash-vs-badge">VS</div>

          <!-- Opponent Side -->
          <div class="fighter-card opponent">
            <div class="fighter-avatar">${(opp.nameVi || '敵').charAt(0)}</div>
            <div class="fighter-info">
              <div class="fighter-name">${opp.nameVi} <span class="stat-badge red">${opp.effectiveWar} WAR</span></div>
              <div class="fighter-vitals">
                <div class="vital-label">Sinh Lực (HP): ${opp.currentHp}/${opp.maxHp}</div>
                <div class="vital-bar"><div class="vital-fill green" style="width: ${(opp.currentHp / opp.maxHp) * 100}%"></div></div>
                <div class="vital-label">Khí Thế (Spirit): ${opp.spirit || 50}/100</div>
                <div class="vital-bar"><div class="vital-fill red" style="width: ${opp.spirit || 50}%"></div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Combat Log -->
        <div class="clash-log-stream" id="clash-log-stream">
          ${(duel.roundHistory || []).map(r => `
            <div class="log-entry">
              <div class="log-round">Hiệp ${r.round}: [${p.nameVi}: ${r.playerCommand}] vs [${opp.nameVi}: ${r.opponentCommand}]</div>
              <div class="log-narrative">${r.narrativeVi || r.roundNarrativeVi || 'Hai bên giao phong kịch liệt!'}</div>
              <div class="log-delta">Sát thương: Lương Diễn chịu ${r.playerDamageTaken || 0} • Đối thủ chịu ${r.opponentDamageTaken || 0}</div>
            </div>
          `).join('')}
        </div>

        <!-- Tactical Commands Deck -->
        ${!isOver ? `
          <div class="clash-command-dock">
            <button class="btn-tactical-cmd attack" onclick="SpatialPoiModals.executeClashRound('ATTACK')">
              <span class="cmd-icon">劍</span>
              <div class="cmd-text">
                <span class="cmd-title">TẤN CÔNG QUYẾT LIỆT</span>
                <span class="cmd-desc">Dốc sức công kích bạt mạng</span>
              </div>
            </button>
            <button class="btn-tactical-cmd defend" onclick="SpatialPoiModals.executeClashRound('DEFEND')">
              <span class="cmd-icon">盾</span>
              <div class="cmd-text">
                <span class="cmd-title">THỦ THẾ PHẢN ĐÒN</span>
                <span class="cmd-desc">Chắn đỡ giảm hại, hồi phục khí thế</span>
              </div>
            </button>
            <button class="btn-tactical-cmd special" onclick="SpatialPoiModals.executeClashRound('SPECIAL_STRIKE')">
              <span class="cmd-icon">爆</span>
              <div class="cmd-text">
                <span class="cmd-title">TUYỆT KỸ BẠT TỤY</span>
                <span class="cmd-desc">Tung chiêu sát chiêu sát thương lớn</span>
              </div>
            </button>
            <button class="btn-tactical-cmd focus" onclick="SpatialPoiModals.executeClashRound('FOCUS_SPIRIT')">
              <span class="cmd-icon">靜</span>
              <div class="cmd-text">
                <span class="cmd-title">TỤ KHÍ NGƯNG THẦN</span>
                <span class="cmd-desc">Điều hòa hơi thở, sẵn sàng phản kích</span>
              </div>
            </button>
          </div>
        ` : `
          <div class="clash-concluded-banner">
            <h3>Trận Đấu Đã Kết Thúc: ${duel.result?.outcomeVi || 'Phân Định Thắng Bại!'}</h3>
            <p>${duel.result?.summaryNarrativeVi || 'Hai bên thu đao cúi chào tương kính.'}</p>
            <button class="btn-action-primary" onclick="SpatialPoiModals.finishDuelSession()">Thu Đao Rời Đài →</button>
          </div>
        `}
      </div>
    `;

    const logEl = document.getElementById('clash-log-stream');
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
  }

  async function executeSparWithHero(heroNpcId, autoResolve = true) {
    try {
      showNotification('Đang chuẩn bị vào trường tỉ thí...');
      const res = await fetch('/api/duels/spar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'PLY-0001', heroNpcId, autoResolve })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Tỉ thí thất bại');

      if (typeof window.apiSpendActionTime === 'function') {
        try { await window.apiSpendActionTime('PERSONAL_GROWTH', 'TRAIN_MARTIAL', 'Tỉ thí võ nghệ'); }
        catch (timeErr) { showNotification(timeErr.message, true); }
      }

      const r = data.result || {};
      showNotification(`Trận tỉ thí hoàn tất! ${r.summaryNarrativeVi || 'Hai bên thu hoạch lớn về võ lược.'}`);
      updateArenaStaminaDisplay();
      if (typeof loadStatus === 'function') await loadStatus();
      if (typeof loadScene === 'function') await loadScene(window.activeSubLocation);
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, true);
    }
  }

  async function startInteractiveDuel(opponentId) {
    try {
      showNotification('Đang khởi tranh trận đấu võ 1v1...');
      const res = await fetch('/api/duels/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'PLY-0001',
          opponentId,
          context: 'MARTIAL_ARENA',
          maxRounds: 5
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Không thể bắt đầu đối quyết');

      currentActiveDuelId = data.duel.duelId;
      switchArenaTab('clash');
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, true);
    }
  }

  async function executeArenaChallenge(tier) {
    try {
      showNotification(`Đang ghi danh lôi đài cấp ${tier}...`);
      const res = await fetch('/api/duels/arena/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'PLY-0001',
          tier,
          autoResolve: false
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Không thể thách đấu lôi đài');

      if (typeof window.apiSpendActionTime === 'function') {
        try { await window.apiSpendActionTime('PERSONAL_GROWTH', 'TRAIN_MARTIAL', 'Thách đấu lôi đài'); }
        catch (timeErr) { showNotification(timeErr.message, true); }
      }

      if (data.result && data.result.duelId) {
        currentActiveDuelId = data.result.duelId;
        switchArenaTab('clash');
      } else {
        showNotification(data.message || 'Thách đấu hoàn tất!');
        if (typeof loadStatus === 'function') await loadStatus();
      }
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, true);
    }
  }

  async function executeClashRound(command) {
    if (!currentActiveDuelId) return;
    try {
      const res = await fetch('/api/duels/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId: currentActiveDuelId,
          command
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ra đòn thất bại');

      renderClashArenaView(data.duel);
      if (data.isConcluded && typeof loadStatus === 'function') {
        loadStatus();
      }
    } catch (err) {
      showNotification(`Lỗi ra chiêu: ${err.message}`, true);
    }
  }

  function finishDuelSession() {
    currentActiveDuelId = null;
    switchArenaTab('spar');
    if (typeof loadStatus === 'function') loadStatus();
    if (typeof loadScene === 'function') loadScene(window.activeSubLocation);
  }

  // =========================================================================
  // 3. RESIDENCE & LINEAGE MODAL (Tư Trạch Vườn Đào)
  // =========================================================================

  function ensureResidenceModalDom() {
    const existing = document.getElementById('spatial-residence-modal');
    if (existing && existing.querySelector('#residence-modal-body')) return;
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'spatial-residence-modal';
    modal.className = 'modal-backdrop hidden';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg spatial-poi-dialog">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-title-seal">府</span>
            <div>
              <h2 class="modal-title-text" id="residence-modal-title">Tư Trạch Vườn Đào • Lương Phủ Gia Thất</h2>
              <div class="modal-subtitle">Nghỉ ngơi phòng trong, đàm đạo thê thất, nuôi dạy thế tử và quản lý cơ nghiệp</div>
            </div>
          </div>
          <button class="btn-close-modal" onclick="SpatialPoiModals.closeResidenceModal()" title="Đóng [Esc]">×</button>
        </div>

        <div class="modal-tab-bar" id="residence-tab-bar">
          <button class="modal-tab-btn active" data-tab="rest" onclick="SpatialPoiModals.switchResidenceTab('rest')">
            <span class="tab-seal">息</span> An Tĩnh Nghỉ Ngơi
          </button>
          <button class="modal-tab-btn" data-tab="spouse" onclick="SpatialPoiModals.switchResidenceTab('spouse')">
            <span class="tab-seal">衣</span> Phu Nhân & Hôn Phối
          </button>
          <button class="modal-tab-btn" data-tab="heir" onclick="SpatialPoiModals.switchResidenceTab('heir')">
            <span class="tab-seal">子</span> Dạy Dỗ Thế Tử
          </button>
          <button class="modal-tab-btn" data-tab="desk" onclick="SpatialPoiModals.switchResidenceTab('desk')">
            <span class="tab-seal">商</span> Bàn Làm Việc Gia Tộc
          </button>
        </div>

        <div class="modal-body" id="residence-modal-body">
          <!-- Dynamic Content Rendered Here -->
        </div>

        <div class="modal-footer">
          <div class="spatial-status-bar">
            <span>Địa điểm: <strong>Tư Trạch Vườn Đào</strong> (LOC-0001)</span>
            <span id="residence-vital-display">Thể lực: -- • HP: --</span>
          </div>
          <button class="btn-action-ghost" onclick="SpatialPoiModals.closeResidenceModal()">Rời Nội Viện</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async function openResidenceModal(initialTab = 'rest') {
    ensureResidenceModalDom();
    activeResidenceTab = initialTab;
    const modal = document.getElementById('spatial-residence-modal');
    if (modal) modal.classList.remove('hidden');

    updateResidenceVitalDisplay();
    await renderResidenceTabContent(activeResidenceTab);
  }

  function closeResidenceModal() {
    const modal = document.getElementById('spatial-residence-modal');
    if (modal) modal.classList.add('hidden');
  }

  function switchResidenceTab(tab) {
    activeResidenceTab = tab;
    const bar = document.getElementById('residence-tab-bar');
    if (bar) {
      bar.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
      });
    }
    renderResidenceTabContent(tab);
  }

  async function updateResidenceVitalDisplay() {
    const el = document.getElementById('residence-vital-display');
    if (!el) return;
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      const p = data?.player || {};
      el.innerHTML = `Thể lực: <strong style="color: #38bdf8;">${p.fatigue !== undefined ? 100 - p.fatigue : 100}</strong>/100 • Sinh Lực: <strong style="color: #34d399;">${p.health || 100}</strong>/100`;
    } catch {
      el.innerText = 'Thể lực: --';
    }
  }

  async function renderResidenceTabContent(tab) {
    const body = document.getElementById('residence-modal-body');
    if (!body) return;

    if (tab === 'rest') {
      body.innerHTML = `
        <div class="spatial-section">
          <div class="spatial-banner-lead">
            <div class="lead-seal">休</div>
            <div class="lead-text">
              <h3>Tĩnh Tọa An Dưỡng • Nội Viện Thanh Tịnh</h3>
              <p>Khép lại cổng rào, gác kiếm bên án thư. Giấc ngủ an lành tại tư trạch giúp phục hồi toàn diện thể lực, chữa lành thương tổn và giải trừ trạng thái kiệt sức.</p>
            </div>
          </div>

          <div class="spatial-card-grid">
            <div class="spatial-action-card highlight">
              <div class="card-badge emerald">HỒI PHỤC TOÀN DIỆN</div>
              <div class="card-header-icon">息</div>
              <h4 class="card-title">An Giấc Phòng Trong Cùng Phu Nhân</h4>
              <p class="card-desc">Tĩnh dưỡng sâu trong trạch viện, có người nâng khăn sửa túi, bồi bổ canh thang sâm nhung.</p>
              <div class="card-perks">
                <span class="perk-tag green">+35 Thể Lực</span>
                <span class="perk-tag cyan">+20 Sinh Lực (HP)</span>
                <span class="perk-tag gold">+15 Sĩ Khí</span>
                <span class="perk-tag purple">Cơ Duyên Sinh Nở</span>
              </div>
              <div class="card-cost">Chi phí: <strong>0</strong> Quan (Tư gia)</div>
              <button class="btn-card-execute gold" onclick="SpatialPoiModals.executeResidenceRest()">
                Nghỉ Ngơi An Giấc Ngay →
              </button>
            </div>
          </div>
        </div>
      `;
    } else if (tab === 'spouse') {
      body.innerHTML = '<div class="loading-spinner">Đang kiểm tra hồ sơ gia thất...</div>';
      try {
        const res = await fetch('/api/lineage/status');
        const data = await res.json();
        const overview = data?.overview || {};
        const spouses = overview.spouses || [];

        if (spouses.length > 0) {
          const s = spouses[0];
          body.innerHTML = `
            <div class="spatial-section">
              <div class="spatial-banner-lead">
                <div class="lead-seal">琴</div>
                <div class="lead-text">
                  <h3>Cầm Sắt Hòa Minh • Chánh Thê Nội Trợ</h3>
                  <p>Phu thê hòa thuận thì gia phong hưng thịnh. Phân công vai trò nội trợ giúp tăng sản lượng trang viên và dạy dỗ thế tử.</p>
                </div>
              </div>

              <div class="spouse-profile-card">
                <div class="spouse-avatar">${(s.spouse_name_vi || '妻').charAt(0)}</div>
                <div class="spouse-details">
                  <div class="spouse-name">${s.spouse_name_vi || 'Chân Cơ'} <span class="role-badge">${s.role || 'CHÁNH_THÊ'}</span></div>
                  <div class="spouse-metrics">
                    <span>Hảo Cảm: <strong style="color: #f472b6;">95%</strong></span>
                    <span>Sức Khỏe: <strong style="color: #34d399;">100/100</strong></span>
                    <span>Tình Trạng: <strong style="color: #fbbf24;">${s.pregnancy_stage > 0 ? `Mang thai tháng thứ ${s.pregnancy_stage}` : 'Khỏe mạnh'}</strong></span>
                  </div>
                  <div class="spouse-motto">"Nguyện vì phu quân nâng khăn sửa túi, giữ gìn giềng mối gia môn muôn đời bình an."</div>
                </div>
              </div>

              <div class="spatial-action-grid-sm" style="margin-top: 14px;">
                <button class="btn-action-outline" onclick="SpatialPoiModals.executeSpouseRoleChange('${s.marriage_id}', 'HOUSEKEEPER')">
                  宅 Phân Công: Quản Gia Trạch Viện
                </button>
                <button class="btn-action-outline" onclick="SpatialPoiModals.executeSpouseRoleChange('${s.marriage_id}', 'ENTERPRISE_MANAGER')">
                  貨 Phân Công: Chưởng Quản Xưởng Nghề
                </button>
                <button class="btn-action-outline" onclick="SpatialPoiModals.executeSpouseRoleChange('${s.marriage_id}', 'TUTOR')">
                  書 Phân Công: Đôn Đốc Dạy Con
                </button>
              </div>
            </div>
          `;
        } else {
          // List courtship candidates
          const candRes = await fetch('/api/lineage/courtship-candidates');
          const candData = await candRes.json();
          const candidates = candData.candidates || [];

          body.innerHTML = `
            <div class="spatial-section">
              <div class="spatial-banner-lead">
                <div class="lead-seal">媒</div>
                <div class="lead-text">
                  <h3>Cầu Hôn Giai Nhân • Danh Gia Vọng Tộc</h3>
                  <p>Chưa lập thê thất. Hãy lựa chọn danh viện khuê các để gửi sính lễ kết duyên trăm năm, sinh con kế tục gia nghiệp.</p>
                </div>
              </div>

              <div class="spatial-card-grid">
                ${candidates.map(c => `
                  <div class="spatial-action-card">
                    <div class="card-badge gold">DANH VIỆN</div>
                    <div class="card-header-icon">${(c.nameVi || '女').charAt(0)}</div>
                    <h4 class="card-title">${c.nameVi}</h4>
                    <p class="card-desc">${c.titleVi || 'Tiểu thư thế gia vọng tộc'}</p>
                    <div class="card-perks">
                      <span class="perk-tag green">Độ Thân: ${c.intimacy || 50}%</span>
                      <span class="perk-tag purple">Sính Lễ: ${c.dowryCashRequired || 1000} Quan</span>
                    </div>
                    <button class="btn-card-execute gold" onclick="SpatialPoiModals.executeProposeMarriage('${c.npcId}', ${c.dowryCashRequired || 1000})">
                      Sai Mối Cầu Hôn →
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
      } catch (e) {
        body.innerHTML = `<div class="error-hint">Không thể tải thông tin gia thất: ${e.message}</div>`;
      }
    } else if (tab === 'heir') {
      body.innerHTML = '<div class="loading-spinner">Đang kiểm tra phả hệ thế tử...</div>';
      try {
        const res = await fetch('/api/lineage/status');
        const data = await res.json();
        const overview = data?.overview || {};
        const children = overview.children || [];

        body.innerHTML = `
          <div class="spatial-section">
            <div class="spatial-banner-lead">
              <div class="lead-seal">嗣</div>
              <div class="lead-text">
                <h3>Kế Vãng Khai Lai • Bồi Dưỡng Thế Tử</h3>
                <p>Mời danh sư chỉ dạy kinh sử binh thư cho con cái. Khi chủ công thoái ẩn hoặc trăm tuổi, thế tử sẽ thừa kế toàn bộ sản nghiệp và danh vọng gia tộc.</p>
              </div>
            </div>

            <div class="heir-list">
              ${children.length === 0 ? `
                <div class="empty-hint">
                  Gia tộc chưa có hậu duệ nào. Hãy an giấc cùng thê thất để thụ thai sinh quý tử tiếp nối dòng dõi!
                </div>
              ` : children.map(c => `
                <div class="heir-card">
                  <div class="heir-avatar">${(c.name_vi || '兒').charAt(0)}</div>
                  <div class="heir-info">
                    <div class="heir-name">${c.name_vi || 'Lương Hạo'} <span class="age-badge">${c.age || 0} Tuổi</span></div>
                    <div class="heir-stats">
                      <span>WAR: <strong>${c.war_attr || 40}</strong></span>
                      <span>INT: <strong>${c.int_attr || 40}</strong></span>
                      <span>POL: <strong>${c.pol_attr || 40}</strong></span>
                      <span>CRA: <strong>${c.cra_attr || 40}</strong></span>
                    </div>
                    <div class="heir-mentor">Danh sư hướng đạo: <strong>${c.mentor_name_vi || 'Chưa chỉ định'}</strong></div>
                  </div>
                  <div class="heir-actions">
                    <button class="btn-action-primary-sm" onclick="SpatialPoiModals.promptAssignMentor('${c.child_id}')">
                      Chỉ Định Danh Sư →
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } catch (e) {
        body.innerHTML = `<div class="error-hint">Lỗi: ${e.message}</div>`;
      }
    } else if (tab === 'desk') {
      body.innerHTML = `
        <div class="spatial-section">
          <div class="spatial-banner-lead">
            <div class="lead-seal">案</div>
            <div class="lead-text">
              <h3>Án Thư Gia Tộc • Thống Kê Sản Nghiệp</h3>
              <p>Xem xét sổ sách thu chi xưởng nghề, các trang viên nông trại và điều phối tá điền ngay tại thư phòng gia trạch.</p>
            </div>
          </div>

          <div class="spatial-card-grid">
            <div class="spatial-action-card highlight">
              <div class="card-badge emerald">SẢN NGHIỆP</div>
              <div class="card-header-icon">工</div>
              <h4 class="card-title">Xưởng Nghề & Điền Trang Lương Gia</h4>
              <p class="card-desc">Kiểm tra năng suất thợ cả, nâng cấp quy mô xưởng sản xuất và thu hoa lợi định kỳ.</p>
              <button class="btn-card-execute" onclick="SpatialPoiModals.closeResidenceModal(); if(window.EnterpriseUI) window.EnterpriseUI.openEnterpriseModal('owner');">
                Mở Quản Lý Sản Nghiệp →
              </button>
            </div>

            <div class="spatial-action-card">
              <div class="card-badge gold">SỔ TAY</div>
              <div class="card-header-icon">卷</div>
              <h4 class="card-title">Sổ Tay Hành Trình & Chí Hướng [J]</h4>
              <p class="card-desc">Xem lại tháp tham vọng phẩm lộ, quân trang cá nhân và nhật ký hành trình.</p>
              <button class="btn-card-execute gold" onclick="SpatialPoiModals.closeResidenceModal(); if(window.PersonalJournalUI) window.PersonalJournalUI.open('career');">
                Mở Sổ Tay Cá Nhân →
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  async function executeResidenceRest() {
    try {
      showNotification('Đang tĩnh tâm nghỉ ngơi phòng trong...');
      const res = await fetch('/api/lineage/household/rest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marriageId: 'MAR-0001' })
      });
      const data = await res.json();
      if (!data.success) {
        // Fallback: regular resting
        await fetch('/api/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action_type: 'PERSONAL_GROWTH', sub_type: 'REST_RECOVERY' })
        });
      }

      showNotification('Giấc ngủ thanh tịnh! Thể lực phục hồi 35 điểm, Sinh lực +20 HP.');
      updateResidenceVitalDisplay();
      if (typeof loadStatus === 'function') await loadStatus();
      if (typeof loadScene === 'function') await loadScene(window.activeSubLocation);
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, true);
    }
  }

  async function executeSpouseRoleChange(marriageId, role) {
    try {
      const res = await fetch('/api/lineage/household/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marriageId, role })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showNotification(`Đã phân công vai trò [${role}] cho phu nhân!`);
      renderResidenceTabContent('spouse');
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, true);
    }
  }

  async function executeProposeMarriage(spouseNpcId, dowryCash) {
    try {
      showNotification('Đang chuẩn bị sính lễ cầu hôn...');
      const res = await fetch('/api/lineage/courtship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'PLY-0001', spouseNpcId, dowryCash })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Cầu hôn không thành');

      showNotification('Hôn lễ đại cát thành công! Phu nhân đã chính thức về chung một nhà.');
      renderResidenceTabContent('spouse');
      if (typeof loadStatus === 'function') await loadStatus();
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, true);
    }
  }

  async function promptAssignMentor(childId) {
    const mentorId = window.prompt('Nhập mã danh sư (VD: NPC-0012 Lư Thực, NPC-0003 Quan Vũ, NPC-0002 Trương Phi):', 'NPC-0012');
    if (!mentorId) return;

    try {
      const res = await fetch('/api/lineage/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, mentorNpcId: mentorId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showNotification('Đã bái danh sư chỉ dẫn kinh thư thành công!');
      renderResidenceTabContent('heir');
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, true);
    }
  }

  // Quick action helpers
  function quickRestResidence() {
    executeResidenceRest();
  }

  function quickSpar(npcId = 'NPC-0002') {
    executeSparWithHero(npcId, true);
  }

  function quickDrinkWine() {
    executeDrinkWine('RƯỢU_NẾP', 30, 25, 15, 3);
  }

  return {
    // Tavern
    openTavernModal,
    closeTavernModal,
    switchTavernTab,
    selectBanquetTier,
    executeDrinkWine,
    executeHostBanquet,
    executeSwearBrotherhood,
    executeRecruitHero,
    quickDrinkWine,

    // Arena
    openArenaModal,
    closeArenaModal,
    switchArenaTab,
    executeSparWithHero,
    startInteractiveDuel,
    executeArenaChallenge,
    executeClashRound,
    finishDuelSession,
    quickSpar,

    // Residence
    openResidenceModal,
    closeResidenceModal,
    switchResidenceTab,
    executeResidenceRest,
    executeSpouseRoleChange,
    executeProposeMarriage,
    promptAssignMentor,
    quickRestResidence
  };
});
