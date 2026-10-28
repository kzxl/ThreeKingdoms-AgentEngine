/**
 * TURN ADVANCEMENT & MONTHLY WORLD PROGRESSION MODULE
 * (public/js/turn-advance.js)
 *
 * Implements Turn Advance dialog, confirms progression to next calendar month,
 * triggers autonomous living world cycles (NPCs, Politics, Logistics, Business),
 * and presents the Monthly World Dispatch report.
 */

let activeTurnAdvanceResult = null;

async function openTurnAdvanceModal() {
  const modal = document.getElementById('turn-advance-modal');
  if (!modal) {
    console.error('turn-advance-modal not found');
    return;
  }

  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  activeTurnAdvanceResult = null;

  modal.classList.remove('hidden');
  renderTurnAdvanceConfirm();
}

function closeTurnAdvanceModal() {
  const modal = document.getElementById('turn-advance-modal');
  if (modal) modal.classList.add('hidden');
}

function renderTurnAdvanceConfirm() {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const container = document.getElementById('turn-advance-content');
  if (!container) return;

  // Read current date chip or cache
  const dateChipEl = document.getElementById('top-date-chip');
  const rawText = dateChipEl ? dateChipEl.innerText : '184-05-02 (Lượt 6)';

  container.innerHTML = `
    <div class="turn-adv-confirm-box">
      <div class="turn-adv-header-icon">⏳</div>
      <h3 class="turn-adv-title">${isEn ? 'Campaign Turn Progression' : 'Kết Thúc Lượt & Chuyển Sang Tháng Mới'}</h3>
      <p class="turn-adv-subtitle">
        ${isEn 
          ? 'Advancing to the next strategic turn will simulate 1 full calendar month of living world events, enterprise cycles, and NPC actions across the realm.'
          : 'Kết thúc lượt hiện tại sẽ thúc đẩy bánh xe thời gian tiến thêm 1 tháng, kích hoạt mô phỏng thế giới sống động, thu chi sản nghiệp và hoạt động tự chủ của quần hùng khắp các châu quận.'}
      </p>

      <div class="turn-adv-changes-grid">
        <div class="turn-adv-card">
          <div class="turn-adv-card-icon">📅</div>
          <div class="turn-adv-card-title">${isEn ? 'Time Step (+1 Month)' : 'Thời Gian (+1 Tháng)'}</div>
          <div class="turn-adv-card-desc">${isEn ? 'World advances to next calendar month; seasonal prices update.' : 'Tiến trình lịch pháp chuyển sang tháng tiếp theo, giá thị trường biến động theo mùa.'}</div>
        </div>
        <div class="turn-adv-card">
          <div class="turn-adv-card-icon">⚡</div>
          <div class="turn-adv-card-title">${isEn ? 'Stamina Recovery' : 'Hồi Phục Sinh Lực'}</div>
          <div class="turn-adv-card-desc">${isEn ? 'Recover +35 fatigue; morale stabilizes to optimal level.' : 'Hồi phục +35 điểm mệt mỏi; sĩ khí bản thân hồi phục trạng thái sung mãn.'}</div>
        </div>
        <div class="turn-adv-card">
          <div class="turn-adv-card-icon">🏪</div>
          <div class="turn-adv-card-title">${isEn ? 'Enterprise Operations' : 'Vận Hành Sản Nghiệp'}</div>
          <div class="turn-adv-card-desc">${isEn ? 'Workshops generate revenue; staff monthly wages disbursed from safe cash.' : 'Xưởng chức tác kết toán doanh thu, tự động thanh toán lương gia nhân từ két sắt.'}</div>
        </div>
        <div class="turn-adv-card">
          <div class="turn-adv-card-icon">👥</div>
          <div class="turn-adv-card-title">${isEn ? 'Living World Simulation' : 'Quần Hùng Tự Chủ'}</div>
          <div class="turn-adv-card-desc">${isEn ? 'Autonomous NPC training, faction politics, and regional logistic shifts.' : 'Các danh tướng rèn luyện võ nghệ, triều đình bổ nhiệm quan viên, nghĩa quân cơ động.'}</div>
        </div>
      </div>

      <div class="turn-adv-action-bar">
        <button class="btn btn-outline" onclick="closeTurnAdvanceModal()">
          ${isEn ? 'Return to Current Turn' : 'Quay Lại'}
        </button>
        <button class="btn btn-primary font-bold turn-adv-btn-exec" onclick="submitExecuteAdvanceTurn()">
          <span>⏳ ${isEn ? 'Confirm Advance Turn' : 'Xác Nhận Sang Lượt Mới'}</span>
        </button>
      </div>
    </div>
  `;
}

async function submitExecuteAdvanceTurn() {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const container = document.getElementById('turn-advance-content');
  if (!container) return;

  container.innerHTML = `
    <div class="turn-adv-loading">
      <div class="turn-adv-spinner"></div>
      <h4>${isEn ? 'Simulating Living World Progression...' : 'Đang mô phỏng chuyển biến thế cuộc tháng mới...'}</h4>
      <p>${isEn ? 'Calculating workshop dividends, NPC career shifts, and faction politics across the Three Kingdoms...' : 'Đang tính toán lợi nhuận sản nghiệp, lương bổng gia nhân và diễn biến chính trị các châu...'}</p>
    </div>
  `;

  try {
    const result = await apiAdvanceTurn();
    activeTurnAdvanceResult = result;
    renderTurnAdvanceReport(result);

    // Refresh Background Status & Decks
    await Promise.all([
      loadStatus(),
      loadDeckInventory(),
      loadDeckNpcs(),
      loadDeckLedger()
    ]);

    // Refresh Chat Chronicle
    if (typeof loadChatHistory === 'function') loadChatHistory();

    showToast(isEn ? `Welcome to Turn ${result.nextTurn} (${result.nextDate})!` : `Đã chuyển sang Lượt ${result.nextTurn} (Ngày ${result.nextDate})!`);

  } catch (err) {
    console.error('Turn advance failed:', err);
    showToast(`Chuyển lượt thất bại: ${err.message}`, true);
    renderTurnAdvanceConfirm();
  }
}

function renderTurnAdvanceReport(res) {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const container = document.getElementById('turn-advance-content');
  if (!container) return;

  const bizList = res.bizReports || [];
  const bizHtml = bizList.length > 0 ? bizList.map(b => `
    <div class="turn-rpt-item">
      <div class="turn-rpt-item-title">🏪 ${b.businessName}</div>
      <div class="turn-rpt-item-meta">
        <span>${isEn ? 'Gross Revenue:' : 'Tổng Thu:'} <strong class="gold-text">+${b.grossIncome}</strong> Tiền</span>
        <span>${isEn ? 'Staff Wages:' : 'Tiền Lương:'} <strong class="danger-text">-${b.totalWages}</strong> Tiền (${b.staffCount} thợ)</span>
        <span>${isEn ? 'Net Profit:' : 'Lợi Nhuận Két Sắt:'} <strong class="${b.netProfit >= 0 ? 'green-text' : 'danger-text'} font-bold">${b.netProfit >= 0 ? '+' : ''}${b.netProfit} Tiền</strong></span>
      </div>
    </div>
  `).join('') : `<div class="turn-rpt-empty">${isEn ? 'No family workshops established yet.' : 'Chưa có sản nghiệp xưởng thợ trực thuộc.'}</div>`;

  const polList = res.politicalEvents || [];
  const polHtml = polList.length > 0 ? polList.map(p => `
    <div class="turn-rpt-item">
      <div class="turn-rpt-item-title">🏛️ ${p.title || 'Biến Động Chính Trị'}</div>
      <div class="turn-rpt-item-meta">${p.description || p.narrative || ''}</div>
    </div>
  `).join('') : `
    <div class="turn-rpt-item">
      <div class="turn-rpt-item-title">🏛️ Triều Đình Lạc Dương & Bắc Cương</div>
      <div class="turn-rpt-item-meta">Hán Linh Đế ban chiếu úy lạo ba quân. Tướng quân Lư Thực và Thứ sử U Châu Lưu U nắm quyền tiết chế, răn đe các thế lực biên cương.</div>
    </div>
  `;

  const npcList = res.npcLogs || [];
  const npcHtml = npcList.length > 0 ? npcList.map(n => `
    <div class="turn-rpt-item">
      <div class="turn-rpt-item-title">⚔️ ${n.name || 'Hào Kiệt'}</div>
      <div class="turn-rpt-item-meta">${n.action || n.text || ''}</div>
    </div>
  `).join('') : `<div class="turn-rpt-empty">${isEn ? 'NPCs quietly maintaining active duties.' : 'Quần hùng duy trì huấn luyện và thường trực quân vụ.'}</div>`;

  const eco = res.ecologyResults || {};
  const ecoHtml = `
    <div class="turn-rpt-stat-row">
      <span>${isEn ? 'Season:' : 'Thời Tiết & Khí Hậu:'}</span>
      <strong class="cyan-text">${eco.season || 'Hạ Khởi'} • ${eco.weather || 'Quang đãng, thuận lợi giao thương'}</strong>
    </div>
    <div class="turn-rpt-stat-row">
      <span>${isEn ? 'Market Outlook:' : 'Xu Hướng Thị Trường:'}</span>
      <span class="gold-text">${eco.marketTrend || 'Nhu cầu muối và kim khí ổn định'}</span>
    </div>
  `;

  container.innerHTML = `
    <div class="turn-adv-report-box">
      <div class="turn-rpt-header">
        <div>
          <span class="turn-rpt-badge font-mono">${isEn ? 'MONTHLY WORLD DISPATCH' : 'BÁO CÁO THẾ CUỘC THÁNG MỚI'}</span>
          <h3 class="turn-rpt-title">${res.turnTitle || `Lượt ${res.nextTurn}`}</h3>
          <span class="turn-rpt-date font-mono">${res.prevDate} ➔ <strong>${res.nextDate}</strong> (Lượt ${res.nextTurn})</span>
        </div>
      </div>

      <div class="turn-rpt-sections-grid">
        <!-- Protagonist Status -->
        <div class="turn-rpt-card">
          <div class="turn-rpt-card-hdr">
            <span class="icon">👤</span>
            <span class="title">${isEn ? 'Personal Vitality & Morale' : 'Thể Lực & Tinh Thần Lương Diễn'}</span>
          </div>
          <div class="turn-rpt-card-body">
            <div class="turn-rpt-stat-row">
              <span>${isEn ? 'Fatigue Restored:' : 'Hồi Phục Mệt Mỏi:'}</span>
              <strong class="green-text">+${res.recoveredFatigue} Điểm (Sẵn sàng hành sự)</strong>
            </div>
            <div class="turn-rpt-stat-row">
              <span>${isEn ? 'Morale Standing:' : 'Sĩ Khí:'}</span>
              <strong class="amber-text">Kiên Định • Hăng Hái</strong>
            </div>
            <div class="turn-rpt-stat-row">
              <span>${isEn ? 'Current Command Base:' : 'Đại Bản Doanh:'}</span>
              <span>${activeSubLocation || 'Trác Huyện'}</span>
            </div>
          </div>
        </div>

        <!-- Enterprise Report -->
        <div class="turn-rpt-card">
          <div class="turn-rpt-card-hdr">
            <span class="icon">🏪</span>
            <span class="title">${isEn ? 'Commercial & Workshop Ledger' : 'Vận Hành Sản Nghiệp & Xưởng Thợ'}</span>
          </div>
          <div class="turn-rpt-card-body">
            ${bizHtml}
          </div>
        </div>

        <!-- Living World Heroes -->
        <div class="turn-rpt-card full-width">
          <div class="turn-rpt-card-hdr">
            <span class="icon">👥</span>
            <span class="title">${isEn ? 'Autonomous Heroes & Retainers' : 'Quần Hùng Thiên Hạ & Gia Nhân Tự Chủ'}</span>
          </div>
          <div class="turn-rpt-card-body">
            ${npcHtml}
          </div>
        </div>

        <!-- Realm & Politics -->
        <div class="turn-rpt-card full-width">
          <div class="turn-rpt-card-hdr">
            <span class="icon">📜</span>
            <span class="title">${isEn ? 'Dynastic Intrigues & Seasonal Outlook' : 'Thời Cuộc Thiên Hạ & Khí Hậu Mùa Vụ'}</span>
          </div>
          <div class="turn-rpt-card-body">
            ${ecoHtml}
            ${polHtml}
          </div>
        </div>
      </div>

      <div class="turn-adv-action-bar">
        <button class="btn btn-primary font-bold turn-adv-btn-exec" onclick="finishTurnAdvance()">
          <span>${isEn ? `Enter Turn ${res.nextTurn}` : `Bắt Đầu Lượt ${res.nextTurn}`} ➔</span>
        </button>
      </div>
    </div>
  `;
}

function finishTurnAdvance() {
  closeTurnAdvanceModal();
}

// Global exposure
window.openTurnAdvanceModal = openTurnAdvanceModal;
window.closeTurnAdvanceModal = closeTurnAdvanceModal;
window.submitExecuteAdvanceTurn = submitExecuteAdvanceTurn;
window.finishTurnAdvance = finishTurnAdvance;
