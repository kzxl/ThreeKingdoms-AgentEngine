/**
 * ThreeKingdoms-AgentEngine: Personal Journal & Ambition UI (public/js/personal-journal-ui.js)
 *
 * Implements Step 1 of RPG Spatial Grounding:
 * - Refactors "Grand Command Hub" into "Sổ Tay Cá Nhân / Chí Hướng [J]".
 * - Purely introspective & character-grounded (No remote god-view commands).
 * - 4 Introspective Tabs:
 *     1. [志] Chí Hướng & Phẩm Lộ (Ambition Tower, Life Stages & Spatial Guidance)
 *     2. [武] Quân Trang & Sở Hữu (Personal Possessions, 8-Axis Stats, Equip/Unequip)
 *     3. [家] Gia Tộc & Phả Hệ (Lineage, Spouses, Heirs & Family Tree - Read-Only)
 *     4. [曆] Nhật Ký & Ngân Sách (Financial Ledger, Vitals, Recent Cashflow & Current Location)
 * - Hotkey: Press 'J' to toggle Journal.
 * - Adheres strictly to Anti-AI-Slop Standards: Zero emojis in battle text, authentic Hanzi seals, JetBrains Mono numbers.
 */

(function () {
  'use strict';

  let activeTabKey = 'career';
  let activeLineageSubTab = 'courtship';
  let cachedLineageOverview = null;
  let cachedProgressionState = null;
  let isSubmitting = false;

  function isEnglish() {
    return typeof window.currentLang !== 'undefined' && window.currentLang === 'en';
  }

  function formatNumber(num) {
    return Number(num || 0).toLocaleString('en-US');
  }

  function formatMods(mods) {
    if (!mods) return '-';
    let parsed = mods;
    if (typeof mods === 'string') {
      try { parsed = JSON.parse(mods); } catch { return mods; }
    }
    const entries = Object.entries(parsed).filter(([_, v]) => Number(v) > 0);
    if (entries.length === 0) return '-';
    return entries.map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ');
  }

  // --------------------------------------------------------------------------
  // Progression State & Character Evaluation
  // --------------------------------------------------------------------------

  async function getCharacterJournalState() {
    try {
      const [statusRes, entRes, lineageRes, equipRes, progRes] = await Promise.all([
        fetch('/api/status').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/enterprise/status?characterId=PLY-0001').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/lineage/status').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/equipment?characterId=PLY-0001').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/progression/status?playerId=PLY-0001').then(r => r.json()).catch(() => ({ success: false }))
      ]);

      const p = statusRes?.player || {};
      const f = statusRes?.financials || {};
      const liquidCash = Number(f.liquidCash || p.liquid_cash || 0);
      const safeCash = Number(p.safe_cash || 0);
      const netWorth = Number(f.netWorth || liquidCash + safeCash);
      const war = Number(p.war_attr || 50);
      const com = Number(p.com_attr || 50);
      const cra = Number(p.cra_attr || 50);
      const pol = Number(p.pol_attr || 50);
      const ldr = Number(p.ldr_attr || 50);
      const intVal = Number(p.int_attr || 50);

      const enterprises = entRes?.status?.ownedBusinesses || entRes?.status?.activeEnterprises || [];
      const hasEnterprises = enterprises.length > 0;

      const spouses = lineageRes?.overview?.spouses || [];
      const isMarried = spouses.length > 0;

      // Authoritative progression from backend if available
      let currentStage = 1;
      let unlockedCapabilities = null;
      let criteriaForNextStageVi = '';

      if (progRes && progRes.success) {
        currentStage = progRes.currentStage || 1;
        unlockedCapabilities = progRes.unlockedCapabilities;
        criteriaForNextStageVi = progRes.criteriaForNextStageVi || '';
      } else {
        // Fallback calculation
        if (netWorth >= 50000 || (hasEnterprises && enterprises.length >= 2 && netWorth >= 30000)) {
          currentStage = 4;
        } else if (netWorth >= 10000 || hasEnterprises || war >= 75 || com >= 80) {
          currentStage = 3;
        } else if (netWorth >= 2000 || hasEnterprises || cra >= 60 || war >= 60 || com >= 60) {
          currentStage = 2;
        } else {
          currentStage = 1;
        }
        unlockedCapabilities = {
          allowLocalWork: true,
          allowHomeDesk: currentStage >= 2,
          allowRemoteCourier: currentStage >= 3,
          allowWarRoom: currentStage >= 4
        };
      }

      cachedProgressionState = {
        player: p,
        financials: f,
        liquidCash,
        safeCash,
        netWorth,
        war,
        com,
        cra,
        pol,
        ldr,
        intVal,
        currentStage,
        unlockedCapabilities,
        criteriaForNextStageVi,
        enterprises,
        hasEnterprises,
        isMarried,
        spouses,
        equipmentOverview: equipRes?.overview || null,
        recentLedger: statusRes?.recentLedger || []
      };

      return cachedProgressionState;
    } catch (err) {
      console.warn('[PersonalJournalUI] Error evaluating character state:', err);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Core Journal Controller: Open, Close, Switch Tab
  // --------------------------------------------------------------------------

  async function openJournal(defaultTab = 'career') {
    const modal = document.getElementById('grand-command-hub-modal');
    if (!modal) {
      console.error('Personal Journal modal shell not found in DOM.');
      return;
    }

    modal.classList.remove('hidden');
    updateHeaderDisplay();
    await getCharacterJournalState();
    switchTab(defaultTab);
  }

  function closeJournal() {
    const modal = document.getElementById('grand-command-hub-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  function updateHeaderDisplay() {
    const title = document.getElementById('grand-hub-title');
    const masterSeal = document.querySelector('.grand-hub-master-seal');
    const subtitle = document.querySelector('.grand-hub-subtitle');
    const isEn = isEnglish();

    if (masterSeal) masterSeal.textContent = '志';
    if (title) title.textContent = isEn ? 'PERSONAL JOURNAL • AMBITION & INTROSPECTION [J]' : 'SỔ TAY CÁ NHÂN • CHÍ HƯỚNG CUỘC ĐỜI [J]';
    if (subtitle) {
      subtitle.textContent = isEn
        ? 'Character Introspection: Ambition, Armaments, Lineage & Daily Chronicle'
        : 'Lương Diễn • Nội Tại Tu Thân, Quân Trang, Gia Tộc & Nhật Ký Hành Trình';
    }
  }

  function switchTab(tabKey) {
    activeTabKey = tabKey;
    const tabBtns = document.querySelectorAll('.grand-hub-tab-btn');
    tabBtns.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    renderTabContent(tabKey);
  }

  // --------------------------------------------------------------------------
  // Main Tab Router
  // --------------------------------------------------------------------------

  async function renderTabContent(tabKey) {
    const container = document.getElementById('grand-hub-tab-content');
    if (!container) return;

    container.innerHTML = `
      <div class="grand-hub-loading">
        <div class="pulse-dot"></div>
        <span>${isEnglish() ? 'Reflecting upon chronicle...' : 'Đang mở trang thư tịch...'}</span>
      </div>
    `;

    try {
      switch (tabKey) {
        case 'career':
          await renderCareerTab(container);
          break;
        case 'gear':
          await renderGearTab(container);
          break;
        case 'family':
          await renderFamilyTab(container);
          break;
        case 'chronicle':
          await renderChronicleTab(container);
          break;
        default:
          await renderCareerTab(container);
          break;
      }
    } catch (err) {
      console.error('[PersonalJournalUI] Render error:', err);
      container.innerHTML = `<div class="grand-hub-error">[LỖI] ${err.message}</div>`;
    }
  }

  // ==========================================================================
  // TAB 1: [志] CHÍ HƯỚNG & PHẨM LỘ (Ambition Tower & Spatial Orientation)
  // ==========================================================================

  async function renderCareerTab(container) {
    const state = cachedProgressionState || await getCharacterJournalState();
    const isEn = isEnglish();
    const p = state?.player || {};
    const f = state?.financials || {};
    const netWorth = state?.netWorth || 0;
    const currentStage = state?.currentStage || 1;

    const stageMeta = [
      {
        num: 1,
        titleVi: 'Bố Y Khởi Thủy',
        titleEn: 'Penniless Commoner',
        criteriaVi: 'Hai bàn tay trắng, làm thuê công nhật mưu sinh, tích lũy từng đồng bạc lẻ và bồi đắp 8 trục thuộc tính',
        criteriaEn: 'Empty pockets, daily wage toil, accumulating copper wages and 8-axis attributes',
        seal: '布',
        badgeClass: 'stage-pauper',
        descVi: 'Chưa có sản nghiệp riêng, dựa vào sức lao động nuôi thân. Mọi việc đều phải tự mình đi bộ tới từng góc chợ, lò rèn.',
        descEn: 'Starting with bare hands, taking daily shifts to earn bread before embarking on greater destinies.'
      },
      {
        num: 2,
        titleVi: 'Tiểu Khang Lập Nghiệp',
        titleEn: 'Budding Factor',
        criteriaVi: 'Tích lũy >1,500 Tiền, mở xưởng thủ công hoặc sắm xe la, định hình 1 trong 5 đại phẩm lộ',
        criteriaEn: 'Net worth >1,500 Qian, own workshop or cart, choosing 1 of 5 career branches',
        seal: '業',
        badgeClass: 'stage-artisan',
        descVi: 'Đã thoát cảnh cơ hàn, có thể tự mở xưởng chế tác hoặc trang bị xe ngựa. Có bàn làm việc quản lý tại gia.',
        descEn: 'Risen above poverty, capable of launching craft workshops or cart operations with home desk.'
      },
      {
        num: 3,
        titleVi: 'Hào Kiệt Danh Khởi',
        titleEn: 'Renowned Master',
        criteriaVi: 'Tài sản >12,000 Tiền, chế tạo Thần Binh, phái thương đoàn liên châu hoặc uy danh trận mạc',
        criteriaEn: 'Net worth >12,000 Qian, bespoke God weapons, interstate caravans, or martial renown',
        seal: '豪',
        badgeClass: 'stage-merchant',
        descVi: 'Sở hữu bảo khí đúc riêng, chiêu mộ môn hạ, bồ câu đưa thư điều phối thương đoàn viễn trình.',
        descEn: 'Wielding bespoke god weapons, commanding retainers, and directing caravans via courier.'
      },
      {
        num: 4,
        titleVi: 'Phong Vân Hùng Chủ',
        titleEn: 'Dynastic Patriarch',
        criteriaVi: 'Tài sản >50,000 Tiền, tông tộc truyền thừa, phân phong tướng lĩnh, khai mở Quân Cơ Xứ',
        criteriaEn: 'Net worth >50,000 Qian, dynastic lineage, governance appointments, Grand Command War Room',
        seal: '覇',
        badgeClass: 'stage-hegemon',
        descVi: 'Cơ nghiệp vững như bàn thạch, gia tộc truyền đời, chính thức mở Quân Cơ Xứ với sa bàn chiến lược vĩ mô.',
        descEn: 'Rock-solid dynasty, multigen succession, full strategic war room commanding armies.'
      }
    ];

    const curStage = stageMeta[currentStage - 1];

    // Branch Progressions
    const branches = [
      {
        key: 'artisan',
        nameVi: 'Bách Nghệ / Thợ Cả',
        nameEn: 'Master Artisan',
        seal: '工',
        icon: '🔨',
        statLabel: `CRA: ${state.cra}/60`,
        prog: Math.min(100, Math.round((state.cra / 60) * 100)),
        met: state.cra >= 60,
        poiVi: 'Thiết Điếm Lò Rèn [LOC-0003]',
        poiEn: 'Blacksmith Forge [LOC-0003]',
        guideVi: 'Hãy đích thân tới Thiết Điếm Trác Huyện để kéo bễ rèn thần binh, tôi luyện khoáng thạch.',
        guideEn: 'Visit the Town Smithy in person to operate bellows and forge bespoke masterworks.'
      },
      {
        key: 'merchant',
        nameVi: 'Hành Thương / Cự Phú',
        nameEn: 'Merchant Magnate',
        seal: '商',
        icon: '💰',
        statLabel: `COM: ${state.com}/60 • Bạc: ${formatNumber(state.liquidCash)}/1,500`,
        prog: Math.min(100, Math.round(((state.com / 60) * 0.5 + (Math.min(state.liquidCash, 1500) / 1500) * 0.5) * 100)),
        met: state.com >= 60 && state.liquidCash >= 1500,
        poiVi: 'Thương Hội & Bến Xe [LOC-0006]',
        poiEn: 'Caravan Guild & Depot [LOC-0006]',
        guideVi: 'Hãy tới Thương Hội Đông Môn để mua sắm xe ngựa, thuê mướn xa phu và xuất phát thương đoàn.',
        guideEn: 'Head to the East Gate Guild Depot to procure carriages, hire drivers, and dispatch caravans.'
      },
      {
        key: 'martial',
        nameVi: 'Võ Hiệp / Quân Lữ',
        nameEn: 'Martial Champion',
        seal: '武',
        icon: '⚔️',
        statLabel: `WAR: ${state.war}/60 • LDR: ${state.ldr}/55`,
        prog: Math.min(100, Math.round(((state.war / 60) * 0.6 + (state.ldr / 55) * 0.4) * 100)),
        met: state.war >= 60 && state.ldr >= 55,
        poiVi: 'Doanh Trại / Lôi Đài [LOC-0005]',
        poiEn: 'Barracks & Arena [LOC-0005]',
        guideVi: 'Hãy tới Giáo Trường Bắc Môn để luận kiếm cùng Quan Vũ, Trương Phi hoặc đăng đài tỉ võ nhận thưởng.',
        guideEn: 'Proceed to the Northern Drill Grounds to spar with Guan Yu and Zhang Fei or enter arena duels.'
      },
      {
        key: 'scholar',
        nameVi: 'Sĩ Đồ / Quân Sư',
        nameEn: 'Scholar Strategist',
        seal: '士',
        icon: '📜',
        statLabel: `INT: ${state.intVal}/70 • POL: ${state.pol}/60`,
        prog: Math.min(100, Math.round(((state.intVal / 70) * 0.5 + (state.pol / 60) * 0.5) * 100)),
        met: state.intVal >= 70 && state.pol >= 60,
        poiVi: 'Sạp Trà & Văn Phủ [LOC-0002]',
        poiEn: 'Tea Pavilion & Academy [LOC-0002]',
        guideVi: 'Hãy tới Sạp Trà Chợ Đông Môn để đàm đạo binh pháp Xuân Thu, giao lưu cùng danh sĩ kinh thành.',
        guideEn: 'Visit East Gate Tea Pavilion to debate historical tactics with scholars and officials.'
      },
      {
        key: 'lineage',
        nameVi: 'Tông Tộc / Thế Gia',
        nameEn: 'Dynastic Clan',
        seal: '家',
        icon: '🏯',
        statLabel: state.isMarried ? 'Đã Lập Gia Thất' : 'Bố Y Độc Thân',
        prog: state.isMarried ? 100 : Math.min(90, Math.round((netWorth / 6000) * 90)),
        met: state.isMarried,
        poiVi: 'Tư Trạch Vườn Đào [LOC-0001]',
        poiEn: 'Peach Garden Manor [LOC-0001]',
        guideVi: 'Hãy quay về Tư Trạch để trò chuyện cùng thê thiếp, dưỡng dục thế tử và chăm lo gia phong.',
        guideEn: 'Return to your Residence to spend time with spouse, tutor heirs, and nurture family prestige.'
      }
    ];

    container.innerHTML = `
      <div class="grand-hub-view-container">
        <!-- Life Stage Hero Card -->
        <div class="tactical-card" style="border-left: 4px solid var(--border-gold, #b45309); background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(30, 41, 59, 0.6) 100%); margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="hub-seal" style="font-size: 13px;">${curStage.seal}</span>
                <span style="font-size: 16px; font-weight: 700; color: #fde68a;">
                  ${isEn ? `STAGE ${curStage.num}: ${curStage.titleEn.toUpperCase()}` : `GIAI ĐOẠN ${curStage.num}: ${curStage.titleVi.toUpperCase()}`}
                </span>
                <span class="tactical-badge ${curStage.badgeClass}">
                  ${isEn ? `Tier ${curStage.num}` : `Bậc ${curStage.num}`}
                </span>
              </div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px; line-height: 1.5;">
                ${isEn ? curStage.descEn : curStage.descVi}
              </div>
              <div style="font-size: 11px; color: #fbbf24; margin-top: 6px; font-family: 'JetBrains Mono', monospace;">
                <strong>${isEn ? 'Ascension Criteria:' : 'Tiêu Chuẩn Đột Phá:'}</strong> ${isEn ? curStage.criteriaEn : curStage.criteriaVi}
              </div>
            </div>
            <div style="text-align: right; min-width: 140px;">
              <div style="font-size: 11px; color: var(--text-muted);">${isEn ? 'Net Worth' : 'Tài Sản Ròng'}</div>
              <div style="font-size: 18px; font-weight: 700; color: #fde68a; font-family: 'JetBrains Mono', monospace;">
                ${formatNumber(netWorth)} <span style="font-size: 11px; font-weight: 400; color: #94a3b8;">Tiền</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Spatial Grounding Rules Notice -->
        <div class="tactical-card" style="border-left: 3px solid #10b981; background: rgba(16, 185, 129, 0.05); margin-bottom: 16px; padding: 10px 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 14px;">📍</span>
            <strong style="color: #34d399; font-size: 12px;">
              ${isEn ? 'SPATIAL GROUNDING PRINCIPLE (RPG CORE):' : 'QUY TẮC HIỆN DIỆN KHÔNG GIAN (RPG CỐT LÕI):'}
            </strong>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; line-height: 1.5;">
            ${isEn
              ? 'To engage in crafting, duels, market trade or family life, the protagonist must physically travel to the designated town POI. The personal journal records aspirations and status, not remote divine intervention.'
              : 'Muốn rèn đao, tỉ võ, gửi thương đoàn hay sinh hoạt gia đình, Lương Diễn phải đích thân cất bước đi tới Địa điểm (POI) trên bản đồ. Sổ tay chỉ dùng để kiểm điểm chí hướng và ghi chép nội tại, không điều khiển từ xa.'}
          </div>
        </div>

        <!-- 5 Career Branches with Spatial Compass -->
        <div class="hub-section-subtitle" style="margin-bottom: 10px;">
          ${isEn ? 'Five Aspirational Paths & Town Spatial Compass:' : 'Ngũ Đại Phẩm Lộ & La Bàn Thực Địa Huyện Trác:'}
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${branches.map(b => `
            <div class="tactical-card" style="padding: 12px 14px; border: 1px solid rgba(255, 255, 255, 0.08);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="hub-seal-sub" style="font-size: 11px;">${b.seal}</span>
                  <strong style="font-size: 13px; color: #f1f5f9;">${isEn ? b.nameEn : b.nameVi}</strong>
                  ${b.met
                    ? `<span class="tactical-badge tactical-badge--legendary" style="font-size: 10px;">${isEn ? 'Attained' : 'Đắc Đạo'}</span>`
                    : `<span class="tactical-badge" style="background: rgba(255,255,255,0.05); font-size: 10px;">${b.statLabel}</span>`}
                </div>
                <div style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #fbbf24;">
                  ${b.prog}%
                </div>
              </div>

              <!-- Progress bar -->
              <div class="vital-bar" style="height: 4px; margin-bottom: 8px; background: rgba(0,0,0,0.3);">
                <div class="vital-bar-fill" style="width: ${b.prog}%; background: ${b.met ? '#10b981' : '#f59e0b'};"></div>
              </div>

              <!-- Spatial Guide Row -->
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8; background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 4px;">
                <div>
                  <span style="color: #38bdf8; font-weight: 600;">${isEn ? 'POI Destination:' : 'Điểm Đến Thực Địa:'}</span>
                  <span style="color: #f8fafc;"> ${isEn ? b.poiEn : b.poiVi}</span>
                </div>
                <div style="color: #cbd5e1; font-style: italic;">
                  ${isEn ? b.guideEn : b.guideVi}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // TAB 2: [武] QUÂN TRANG & SỞ HỮU (Personal Equipment & Effective Stats)
  // ==========================================================================

  async function renderGearTab(container) {
    const isEn = isEnglish();
    const res = await fetch('/api/equipment?characterId=PLY-0001');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load equipment');

    const overview = data.overview;
    const items = overview.items || [];

    container.innerHTML = `
      <div class="grand-hub-view-container">
        <div class="grand-hub-section-header">
          <div>
            <h3 class="grand-hub-view-title"><span class="hub-seal-accent">武</span> ${isEn ? 'Personal Armaments & Effective Attributes' : 'Quân Trang Cá Nhân & Bát Hướng Thuộc Tính'}</h3>
            <p class="grand-hub-view-desc">${isEn ? 'Inspect equipped armaments, equip/unequip gear, and observe 8-axis effective stats.' : 'Xem xét trang bị hộ thân, mặc hoặc tháo vũ khí bảo vật, kiểm tra thuộc tính thực chiến.'}</p>
          </div>
          <div style="font-size: 11px; color: #94a3b8; font-family: 'JetBrains Mono', monospace;">
            ${isEn ? 'Equipped Slots: 4' : 'Số Khí Giới: 4 Khắc Vị'}
          </div>
        </div>

        <!-- Grounding notice: No remote forge -->
        <div class="tactical-card" style="border-left: 3px solid #f59e0b; background: rgba(245, 158, 11, 0.05); margin-bottom: 14px; padding: 10px 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="font-size: 11px; color: #fde68a;">
              <strong>🔨 ${isEn ? 'Smithy Rule:' : 'Quy Tắc Thiết Điếm:'}</strong>
              ${isEn
                ? 'To forge bespoke weapons or commission master smiths, travel to Town Smithy [LOC-0003]. Gear can be equipped or put away here.'
                : 'Muốn đúc rèn thần binh hoặc tôi luyện đao kiếm, hãy cất bước tới Thiết Điếm [LOC-0003] tìm Thợ Cả. Tại sổ tay này, ngài chỉ có thể trang bị hoặc tháo đồ đang mang.'}
            </div>
          </div>
        </div>

        <!-- Equipped 4 Slots Grid -->
        <div class="grand-hub-grid-4">
          ${['WEAPON', 'ARMOR', 'STEED', 'TREASURE'].map(slot => {
            const item = overview.slots[slot];
            const slotSeal = slot === 'WEAPON' ? '兵' : slot === 'ARMOR' ? '甲' : slot === 'STEED' ? '馬' : '策';
            const slotLabel = slot === 'WEAPON' ? (isEn ? 'Weapon' : 'Binh Khí')
                            : slot === 'ARMOR' ? (isEn ? 'Armor' : 'Khôi Giáp')
                            : slot === 'STEED' ? (isEn ? 'Steed' : 'Chiến Mã')
                            : (isEn ? 'Treasure' : 'Bảo Vật');
            return `
              <div class="tactical-card hub-slot-card ${item ? 'has-item' : 'empty-slot'}">
                <div class="hub-slot-header">
                  <span class="hub-seal-badge">${slotSeal}</span>
                  <span class="hub-slot-label">${slotLabel}</span>
                </div>
                <div class="hub-slot-body">
                  ${item ? `
                    <div class="hub-item-name" style="font-weight: 700; color: #fde68a;">${item.customName || item.nameVi || item.itemCode}</div>
                    <div class="hub-item-buffs" style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #34d399; margin: 4px 0;">
                      ${formatMods(item.statModifiers)}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                      <span class="tactical-badge tactical-badge--${String(item.category || '').toLowerCase()}">${item.category || 'GEAR'}</span>
                      <button class="tactical-btn tactical-btn--xs" style="padding: 2px 8px; font-size: 10px;" onclick="PersonalJournalUI.executeUnequip('${slot}')">
                        ${isEn ? 'Unequip' : 'Tháo Ra'}
                      </button>
                    </div>
                  ` : `
                    <div class="hub-empty-label" style="color: var(--text-muted); font-size: 11px; padding: 12px 0;">
                      ${isEn ? 'Empty Slot' : 'Chưa Mang Theo'}
                    </div>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Effective RPG Attributes Table (Base + Stacking) -->
        <div class="tactical-card" style="margin-top: 14px;">
          <div class="hub-section-subtitle" style="margin-bottom: 8px;">
            ${isEn ? 'Effective RPG Attributes (Base + Armaments):' : 'Bát Hướng Thuộc Tính Thực Chiến (Căn Bản + Trang Bị):'}
          </div>
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

        <!-- Inventory of Possessions / Unassigned Gear -->
        <div class="tactical-card" style="margin-top: 14px;">
          <div class="hub-section-subtitle" style="margin-bottom: 8px;">
            ${isEn ? 'Possessions & Armaments in Pack:' : 'Hành Trang & Quân Khí Sở Hữu:'}
          </div>
          ${items.length === 0 ? `
            <div style="color: var(--text-muted); font-size: 11px; padding: 8px 0;">
              ${isEn ? 'No armaments in inventory. Visit the smithy or trade caravans to acquire gear.' : 'Trong tay nải hiện không có khí giới dự phòng. Hãy tới Thiết Điếm hoặc giao thương để tích lũy.'}
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${items.map(it => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 6px 12px; border-radius: 4px;">
                  <div>
                    <strong style="color: #f8fafc; font-size: 12px;">${it.customName || it.nameVi || it.itemCode}</strong>
                    <span style="font-size: 11px; color: #34d399; margin-left: 8px; font-family: 'JetBrains Mono', monospace;">
                      ${formatMods(it.statModifiers)}
                    </span>
                    <span style="font-size: 10px; color: var(--text-muted); margin-left: 8px;">[${it.slotType}]</span>
                  </div>
                  <button class="tactical-btn tactical-btn--xs tactical-btn--primary" style="padding: 2px 8px; font-size: 10px;" onclick="PersonalJournalUI.executeEquip('${it.itemCode}', '${it.slotType}')">
                    ${isEn ? 'Equip' : 'Trang Bị'}
                  </button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  async function executeEquip(itemCode, slotType) {
    if (isSubmitting) return;
    isSubmitting = true;
    try {
      const res = await fetch('/api/equipment/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: 'PLY-0001', itemCode, slotType })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to equip');
      if (window.showToast) window.showToast(isEnglish() ? 'Equipped item successfully.' : 'Đã trang bị khí giới.');
      renderTabContent('gear');
      if (window.loadStatus) window.loadStatus();
    } catch (err) {
      alert(`[LỖI] ${err.message}`);
    } finally {
      isSubmitting = false;
    }
  }

  async function executeUnequip(slotType) {
    if (isSubmitting) return;
    isSubmitting = true;
    try {
      const res = await fetch('/api/equipment/unequip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: 'PLY-0001', slotType })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to unequip');
      if (window.showToast) window.showToast(isEnglish() ? 'Unequipped item.' : 'Đã tháo khí giới.');
      renderTabContent('gear');
      if (window.loadStatus) window.loadStatus();
    } catch (err) {
      alert(`[LỖI] ${err.message}`);
    } finally {
      isSubmitting = false;
    }
  }

  // ==========================================================================
  // TAB 3: [家] GIA TỘC & PHẢ HỆ (Lineage & Kinship - Read-Only Introspection)
  // ==========================================================================

  async function renderFamilyTab(container) {
    const isEn = isEnglish();
    const res = await fetch('/api/lineage/status');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load lineage status');

    cachedLineageOverview = data.overview;
    const overview = cachedLineageOverview;
    const isMarried = overview.spouses && overview.spouses.length > 0;

    container.innerHTML = `
      <div class="grand-hub-view-container">
        <div class="grand-hub-section-header">
          <div>
            <h3 class="grand-hub-view-title"><span class="hub-seal-accent">家</span> ${isEn ? 'Dynastic Lineage & Genealogy Record' : 'Gia Thất • Phả Hệ Tông Tộc & Hậu Duệ'}</h3>
            <p class="grand-hub-view-desc">${isEn ? 'Inspect family records, spouse status, heir development, and genealogical tree.' : 'Tra cứu sổ bộ gia phả, tình trạng thê thất, thế tử và bia ký tiền nhân.'}</p>
          </div>
          <div style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #fbbf24;">
            ${isMarried
              ? `${isEn ? 'Generation:' : 'Đời Thứ:'} <strong>${overview.clan?.current_generation || 1}</strong> • ${isEn ? 'Spouses:' : 'Thê Thiếp:'} <strong>${overview.spouses?.length || 0}</strong> • ${isEn ? 'Heirs:' : 'Hậu Duệ:'} <strong>${overview.children?.length || 0}</strong>`
              : `<span style="color: #38bdf8;">${isEn ? 'Bachelor • Unmarried' : 'Bố Y Độc Thân • Chưa Lập Gia'}</span>`}
          </div>
        </div>

        <!-- Grounding Rule Notice -->
        <div class="tactical-card" style="border-left: 3px solid #38bdf8; background: rgba(56, 189, 248, 0.05); margin-bottom: 14px; padding: 10px 14px;">
          <div style="font-size: 11px; color: #bae6fd;">
            <strong>🏛️ ${isEn ? 'Residence Grounding Rule:' : 'Quy Chế Tư Trạch:'}</strong>
            ${isEn
              ? 'Courtship, spending time with spouses, and instructing heirs must occur in person at your Residence [LOC-0001]. This journal serves as an ancestral record.'
              : 'Việc cầu hôn giai nhân, trò chuyện tâm tình với phu nhân và dạy bảo con cái chỉ diễn ra khi ngài trở về Tư Trạch [LOC-0001]. Sổ tay này là thư tịch ghi chép gia phả lưu truyền.'}
          </div>
        </div>

        <!-- Sub-View Navigation Tabs -->
        <div class="grand-hub-subnav">
          <button class="grand-hub-subnav-btn ${activeLineageSubTab === 'courtship' ? 'active' : ''}" onclick="PersonalJournalUI.switchLineageSubTab('courtship')">
            <span class="hub-subnav-seal">姻</span> ${isEn ? 'Spouses & Courtship' : 'Thê Thiếp & Giai Nhân'}
          </button>
          <button class="grand-hub-subnav-btn ${activeLineageSubTab === 'heirs' ? 'active' : ''} ${!isMarried ? 'subnav-btn-locked' : ''}"
            ${isMarried ? `onclick="PersonalJournalUI.switchLineageSubTab('heirs')"` : `disabled title="${isEn ? 'Locked: Requires married spouse' : 'Khóa: Cần cưới thê thiếp'}"`}>
            <span class="hub-subnav-seal">${isMarried ? '嗣' : '🔒'}</span> ${isEn ? 'Heirs & Mentorship' : 'Hậu Duệ & Dạy Dỗ'}
          </button>
          <button class="grand-hub-subnav-btn ${activeLineageSubTab === 'tree' ? 'active' : ''} ${!isMarried ? 'subnav-btn-locked' : ''}"
            ${isMarried ? `onclick="PersonalJournalUI.switchLineageSubTab('tree')"` : `disabled title="${isEn ? 'Locked: Requires established family' : 'Khóa: Cần lập gia tộc'}"`}>
            <span class="hub-subnav-seal">${isMarried ? '譜' : '🔒'}</span> ${isEn ? 'Genealogy Tree' : 'Gia Phả Dòng Họ'}
          </button>
          <button class="grand-hub-subnav-btn ${activeLineageSubTab === 'succession' ? 'active' : ''} ${!isMarried ? 'subnav-btn-locked' : ''}"
            ${isMarried ? `onclick="PersonalJournalUI.switchLineageSubTab('succession')"` : `disabled title="${isEn ? 'Locked: Requires heir' : 'Khóa: Cần có thế tử'}"`}>
            <span class="hub-subnav-seal">${isMarried ? '繼' : '🔒'}</span> ${isEn ? 'Ancestral Memorial' : 'Tông Miếu & Kế Thừa'}
          </button>
        </div>

        <div id="lineage-subview-content" style="margin-top: 14px;"></div>
      </div>
    `;

    renderLineageSubView();
  }

  function switchLineageSubTab(subTabKey) {
    activeLineageSubTab = subTabKey;
    const subnavBtns = document.querySelectorAll('.grand-hub-subnav-btn');
    subnavBtns.forEach(btn => {
      if (btn.textContent.includes(subTabKey === 'courtship' ? 'Thê Thiếp' : subTabKey === 'heirs' ? 'Hậu Duệ' : subTabKey === 'tree' ? 'Gia Phả' : 'Tông Miếu')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    renderLineageSubView();
  }

  function renderLineageSubView() {
    const subview = document.getElementById('lineage-subview-content');
    if (!subview || !cachedLineageOverview) return;
    const isEn = isEnglish();
    const overview = cachedLineageOverview;

    if (activeLineageSubTab === 'courtship') {
      const spouses = overview.spouses || [];
      subview.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${spouses.length === 0 ? `
            <div class="tactical-card" style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 12px;">
              ${isEn
                ? 'Protagonist has not yet wed. Encounter heroines across town tea stalls and banquets to build affinity.'
                : 'Lương Diễn hiện vẫn là bố y độc thân. Hãy diện kiến các trang tuyệt sắc giai nhân tại tửu quán, sạp trà để kết giao tri kỷ.'}
            </div>
          ` : spouses.map(s => `
            <div class="tactical-card" style="border-left: 3px solid #ec4899; padding: 12px 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="color: #fbcfe8; font-size: 14px;">${s.name_vi || s.name_en || s.heroine_npc_id}</strong>
                  <span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">(${s.role || 'Chánh Thê'})</span>
                  <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                    ${isEn ? 'Affinity:' : 'Hảo Cảm:'} <strong style="color: #ec4899;">${s.affinity || 100}</strong> •
                    ${isEn ? 'Pregnancy:' : 'Thai Nghén:'} <strong style="color: #fbbf24;">${s.pregnancy_stage > 0 ? `Giai Đoạn ${s.pregnancy_stage}/3` : (isEn ? 'None' : 'Chưa Có')}</strong>
                  </div>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); font-style: italic;">
                  ${isEn ? 'Interact at Residence [LOC-0001]' : 'Trò chuyện tại Tư Trạch [LOC-0001]'}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (activeLineageSubTab === 'heirs') {
      const children = overview.children || [];
      subview.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${children.length === 0 ? `
            <div class="tactical-card" style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 12px;">
              ${isEn ? 'No heirs recorded in lineage book.' : 'Chưa có hậu duệ ghi danh trong sổ bộ.'}
            </div>
          ` : children.map(c => `
            <div class="tactical-card" style="border-left: 3px solid #38bdf8; padding: 12px 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="color: #bae6fd; font-size: 13px;">${c.name_vi || c.name || 'Thế Tử'}</strong>
                  <span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">(${c.age || 0} Tuổi • ${c.status || 'INFANT'})</span>
                  <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; font-family: 'JetBrains Mono', monospace;">
                    WAR: ${c.war_attr || 25} | INT: ${c.int_attr || 25} | LDR: ${c.ldr_attr || 25}
                  </div>
                </div>
                <div style="font-size: 11px; color: #38bdf8;">
                  ${c.mentor_name_vi ? `Danh Sư: ${c.mentor_name_vi}` : 'Chưa Cầu Danh Sư'}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (activeLineageSubTab === 'tree') {
      subview.innerHTML = `
        <div class="tactical-card" style="padding: 16px;">
          <div style="font-size: 13px; font-weight: 700; color: #fbbf24; margin-bottom: 8px;">
            ${overview.clan?.family_name_vi || 'Lương Thị Gia Tộc'} • Đời Thứ ${overview.clan?.current_generation || 1}
          </div>
          <div style="font-size: 11px; color: var(--text-muted); line-height: 1.6;">
            Gia Huấn: <em>"${overview.clan?.family_motto_vi || 'Đôn Bản Khởi Gia • Trạch Bị Thiên Hạ'}"</em><br>
            Khởi thủy niên hiệu: Trung Bình nguyên niên (184 SCN) • Trác Huyện.
          </div>
        </div>
      `;
    } else if (activeLineageSubTab === 'succession') {
      subview.innerHTML = `
        <div class="tactical-card" style="padding: 16px;">
          <div style="font-size: 13px; font-weight: 700; color: #f59e0b; margin-bottom: 8px;">
            Tông Miếu Tiền Nhân & Kế Thừa Gia Nghiệp
          </div>
          <div style="font-size: 11px; color: var(--text-muted); line-height: 1.5;">
            Khi đương gia chủ niên cao lực kiệt (trên 55 tuổi) hoặc quy thiên, đại lễ kế thừa sẽ được cử hành tại Tông Miếu để chuyển giao toàn bộ cơ nghiệp cho thế tử trưởng thành (đủ 18 tuổi).
          </div>
        </div>
      `;
    }
  }

  // ==========================================================================
  // TAB 4: [曆] NHẬT KÝ & NGÂN SÁCH (Chronicle, Ledger & Vitals)
  // ==========================================================================

  async function renderChronicleTab(container) {
    const isEn = isEnglish();
    const res = await fetch('/api/status');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load status');

    const p = data.player || {};
    const f = data.financials || {};
    const ledger = data.recentTransactions || [];
    const location = data.location || {};
    const locName = location.locationName || location.currentLocation || 'Trang Viên Vườn Đào';
    const regionName = location.regionName || 'U Châu • Trác Huyện';

    const liquidCash = Number(f.liquidCash || p.liquid_cash || 0);
    const safeCash = Number(p.safe_cash || 0);
    const grainReserves = Number(p.grain_reserves || 0);
    const invValue = Number(f.inventoryValue || 0);
    const netWorth = Number(f.netWorth || liquidCash + safeCash + invValue);

    const war = Number(p.war_attr || 50);
    const recoveryInterval = Math.max(8, 30 - Math.floor((war - 50) * 0.4));
    const fatigue = Number(p.fatigue || 0);
    const health = Number(p.health || 100);
    const maxStamina = 100 + Math.max(0, Math.round((war - 50) * 1.5)) + Math.floor(health / 10);
    const currentStamina = Math.max(0, maxStamina - fatigue);

    container.innerHTML = `
      <div class="grand-hub-view-container">
        <div class="grand-hub-section-header">
          <div>
            <h3 class="grand-hub-view-title"><span class="hub-seal-accent">曆</span> ${isEn ? 'Chronicle, Financial Balance & Vitality' : 'Nhật Ký Hành Trình, Sổ Cái Ngân Sách & Thể Trạng'}</h3>
            <p class="grand-hub-view-desc">${isEn ? 'Review assets, recent cash movements, physical stamina recovery, and active undertakings.' : 'Xem xét tài sản, biến động thu chi gần nhất, nhịp độ hồi phục thể lực và việc cần làm.'}</p>
          </div>
          <div style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #38bdf8;">
            📍 ${regionName} / ${locName}
          </div>
        </div>

        <!-- 4-Grid Balance Sheet -->
        <div class="grand-hub-grid-4">
          <div class="tactical-card" style="padding: 10px 14px;">
            <div style="font-size: 11px; color: var(--text-muted);">${isEn ? 'Liquid Cash' : 'Tiền Mặt Trong Túi'}</div>
            <div style="font-size: 16px; font-weight: 700; color: #fde68a; font-family: 'JetBrains Mono', monospace; margin-top: 4px;">
              ${formatNumber(liquidCash)} <span style="font-size: 10px; font-weight: 400; color: #94a3b8;">Tiền</span>
            </div>
          </div>
          <div class="tactical-card" style="padding: 10px 14px;">
            <div style="font-size: 11px; color: var(--text-muted);">${isEn ? 'Safe Cash' : 'Bạc Trữ Trong Rương'}</div>
            <div style="font-size: 16px; font-weight: 700; color: #38bdf8; font-family: 'JetBrains Mono', monospace; margin-top: 4px;">
              ${formatNumber(safeCash)} <span style="font-size: 10px; font-weight: 400; color: #94a3b8;">Tiền</span>
            </div>
          </div>
          <div class="tactical-card" style="padding: 10px 14px;">
            <div style="font-size: 11px; color: var(--text-muted);">${isEn ? 'Grain Reserves' : 'Lương Thảo Dự Trữ'}</div>
            <div style="font-size: 16px; font-weight: 700; color: #34d399; font-family: 'JetBrains Mono', monospace; margin-top: 4px;">
              ${grainReserves.toFixed(2)} <span style="font-size: 10px; font-weight: 400; color: #94a3b8;">Thạch</span>
            </div>
          </div>
          <div class="tactical-card" style="padding: 10px 14px; border-left: 3px solid #b45309;">
            <div style="font-size: 11px; color: var(--text-muted);">${isEn ? 'Total Net Worth' : 'Tổng Tài Sản Ròng'}</div>
            <div style="font-size: 16px; font-weight: 700; color: #fbbf24; font-family: 'JetBrains Mono', monospace; margin-top: 4px;">
              ${formatNumber(netWorth)} <span style="font-size: 10px; font-weight: 400; color: #94a3b8;">Tiền</span>
            </div>
          </div>
        </div>

        <!-- Vitality & Physiological State -->
        <div class="tactical-card" style="margin-top: 14px; padding: 12px 16px;">
          <div class="hub-section-subtitle" style="margin-bottom: 8px;">
            ${isEn ? 'Vitality & Passive Recovery Rate:' : 'Thể Trạng Nội Tại & Nhịp Hồi Phục Thể Lực:'}
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 12px;">
            <div>
              <span style="color: var(--text-muted);">${isEn ? 'Current Stamina:' : 'Thể Lực Hiện Tại:'}</span>
              <strong style="color: #38bdf8; font-family: 'JetBrains Mono', monospace;"> ${currentStamina} / ${maxStamina}</strong>
              <span style="color: var(--text-muted); font-size: 10px;"> (Mệt Mỏi: ${fatigue})</span>
            </div>
            <div>
              <span style="color: var(--text-muted);">${isEn ? 'Passive Recovery:' : 'Hồi Phục Nội Tại:'}</span>
              <strong style="color: #34d399; font-family: 'JetBrains Mono', monospace;"> +1 điểm / mỗi ${recoveryInterval}s</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">${isEn ? 'Physical State:' : 'Tình Trạng Cơ Thể:'}</span>
              <span class="tactical-badge ${fatigue >= 95 ? 'tactical-badge--critical' : 'tactical-badge--normal'}">
                ${fatigue >= 95 ? 'Kiệt Sức' : fatigue >= 60 ? 'Mệt Mỏi' : 'Khang Kiện'}
              </span>
            </div>
          </div>
        </div>

        <!-- Recent Cashflow Ledger Table -->
        <div class="tactical-card" style="margin-top: 14px; padding: 12px 16px;">
          <div class="hub-section-subtitle" style="margin-bottom: 8px;">
            ${isEn ? 'Recent Cashflow Ledger (Double-Entry Invariants):' : 'Sổ Cái Thu Chi Gần Nhất (Kế Toán Kép Bất Biến):'}
          </div>
          ${ledger.length === 0 ? `
            <div style="color: var(--text-muted); font-size: 11px; padding: 8px 0;">
              ${isEn ? 'No recent transactions recorded.' : 'Chưa có biến động ngân khố ghi nhận trong lượt này.'}
            </div>
          ` : `
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px; font-family: 'JetBrains Mono', monospace;">
                <thead>
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); text-align: left;">
                    <th style="padding: 4px 8px;">${isEn ? 'Time' : 'Thời Điểm'}</th>
                    <th style="padding: 4px 8px;">${isEn ? 'Description' : 'Nội Dung Giao Dịch'}</th>
                    <th style="padding: 4px 8px; text-align: right;">${isEn ? 'Amount' : 'Số Tiền'}</th>
                    <th style="padding: 4px 8px; text-align: right;">${isEn ? 'Balance' : 'Số Dư'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${ledger.slice(0, 5).map(tx => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                      <td style="padding: 6px 8px; color: var(--text-muted);">${tx.created_at || tx.timestamp || '-'}</td>
                      <td style="padding: 6px 8px; color: #f1f5f9;">${tx.description || tx.reason || 'Biến động quỹ'}</td>
                      <td style="padding: 6px 8px; text-align: right; color: ${Number(tx.amount || 0) >= 0 ? '#34d399' : '#f87171'};">
                        ${Number(tx.amount || 0) >= 0 ? `+${formatNumber(tx.amount)}` : formatNumber(tx.amount)}
                      </td>
                      <td style="padding: 6px 8px; text-align: right; color: #fbbf24;">
                        ${formatNumber(tx.balance_after || tx.balance || 0)}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // Public API Export (and Backward Compatibility Aliases)
  // --------------------------------------------------------------------------

  const PersonalJournalUI = {
    open: openJournal,
    close: closeJournal,
    switchTab,
    renderTabContent,
    renderCareerTab,
    executeEquip,
    executeUnequip,
    switchLineageSubTab,

    // Legacy Fallback Handlers (Directing to local POIs if called)
    openCareer: () => openJournal('career'),
    executeWorkShift: () => {
      if (window.EnterpriseUI) window.EnterpriseUI.openEnterpriseModal('work');
    },
    collectProfit: (bizId) => {
      if (window.EnterpriseUI) window.EnterpriseUI.openEnterpriseModal('owner');
    }
  };

  window.PersonalJournalUI = PersonalJournalUI;
  // 100% Backward compatibility so existing callers don't break
  window.GrandCommandHubUI = PersonalJournalUI;

  // Global Keyboard Listener: 'J' to toggle Journal, 'Escape' to close
  document.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      const modal = document.getElementById('grand-command-hub-modal');
      if (modal && !modal.classList.contains('hidden')) {
        closeJournal();
      } else {
        openJournal('career');
      }
    } else if (e.key === 'Escape') {
      const modal = document.getElementById('grand-command-hub-modal');
      if (modal && !modal.classList.contains('hidden')) {
        closeJournal();
      }
    }
  });

})();
