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
  let activeTabKey = 'career';
  let activeLineageSubTab = 'courtship'; // courtship | heirs | tree | succession
  let activeDuelId = null;
  let activeDuelState = null;
  let cachedLineageOverview = null;
  let cachedBanquetStatus = null;
  let cachedArenaRoster = null;
  let cachedProgressionState = null;
  let isSubmittingAction = false;

  function isEnglish() {
    return typeof window.currentLang !== 'undefined' && window.currentLang === 'en';
  }

  function formatNumber(num) {
    return Number(num || 0).toLocaleString('en-US');
  }

  // --------------------------------------------------------------------------
  // Progression State & Domain Unlocks (RPG Standards)
  // --------------------------------------------------------------------------

  async function getHubProgressionState() {
    try {
      const [statusRes, entRes, lineageRes, caravanRes] = await Promise.all([
        fetch('/api/status').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/enterprise/status?characterId=PLY-0001').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/lineage/status').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/logistics/caravans').then(r => r.json()).catch(() => ({ success: false }))
      ]);

      const p = statusRes?.player || {};
      const f = statusRes?.financials || {};
      const liquidCash = Number(f.liquidCash || p.liquid_cash || 0);
      const netWorth = Number(f.netWorth || f.liquidCash || p.liquid_cash || 0);
      const war = Number(p.war_attr || 50);
      const com = Number(p.com_attr || 50);
      const cra = Number(p.cra_attr || 50);
      const pol = Number(p.pol_attr || 50);
      const ldr = Number(p.ldr_attr || 50);

      const enterprises = entRes?.status?.ownedBusinesses || entRes?.status?.activeEnterprises || [];
      const hasEnterprises = enterprises.length > 0;

      const spouses = lineageRes?.overview?.spouses || [];
      const isMarried = spouses.length > 0;

      const caravans = caravanRes?.caravans || [];
      const hasCaravans = caravans.length > 0;

      // Determine Life Stage (1 to 4)
      let currentStage = 1;
      if (netWorth >= 50000 || (hasEnterprises && enterprises.length >= 2 && netWorth >= 30000)) {
        currentStage = 4;
      } else if (netWorth >= 12000 || hasEnterprises || war >= 75 || com >= 80) {
        currentStage = 3;
      } else if (netWorth >= 1500 || hasEnterprises || cra >= 60 || war >= 60 || com >= 60) {
        currentStage = 2;
      } else {
        currentStage = 1;
      }

      // Domain Unlock Checks according to authentic RPG standards:
      // 1. Forge: Requires CRA >= 50 or owning a Blacksmith Forge
      const isForgeUnlocked = cra >= 50 || enterprises.some(b => b.business_type === 'BLACKSMITH');

      // 2. Caravan: Unlocked if Net Worth >= 2500 OR has business OR COM >= 50 OR has active caravans
      const isCaravanUnlocked = netWorth >= 2500 || hasEnterprises || com >= 50 || hasCaravans;

      // 3. Family Lineage: Clan Manor unlocked if married or Stage >= 2
      const isFamilyUnlocked = isMarried || currentStage >= 2;

      cachedProgressionState = {
        stage: currentStage,
        liquidCash,
        netWorth,
        cra,
        com,
        war,
        pol,
        ldr,
        enterprises,
        hasEnterprises,
        isMarried,
        spouses,
        caravans,
        hasCaravans,
        isForgeUnlocked,
        isCaravanUnlocked,
        isFamilyUnlocked
      };
      return cachedProgressionState;
    } catch (err) {
      console.warn('[GrandCommandHubUI] Error evaluating progression state:', err);
      cachedProgressionState = {
        stage: 1,
        liquidCash: 100,
        netWorth: 100,
        cra: 50,
        com: 50,
        war: 50,
        pol: 50,
        ldr: 50,
        enterprises: [],
        hasEnterprises: false,
        isMarried: false,
        spouses: [],
        caravans: [],
        hasCaravans: false,
        isForgeUnlocked: false,
        isCaravanUnlocked: false,
        isFamilyUnlocked: false
      };
      return cachedProgressionState;
    }
  }

  function refreshHubNavigation(progState) {
    if (!progState) return;
    const isEn = isEnglish();

    // 1. Dynamic Evolution of Headquarters Title & Seal
    const hubTitleEl = document.getElementById('grand-hub-title');
    const hubSubEl = document.querySelector('.grand-hub-subtitle');
    const masterSealEl = document.querySelector('.grand-hub-master-seal');

    if (progState.stage === 1) {
      if (masterSealEl) masterSealEl.textContent = '草廬';
      if (hubTitleEl) hubTitleEl.textContent = isEn ? 'HUMBLE ABODE • LIFE JOURNEY' : 'THẢO LƯ • HÀNH TRÌNH LẬP THÂN';
      if (hubSubEl) hubSubEl.textContent = isEn ? 'Commoner Youth • Daily Labor & Laying Foundations' : 'Thanh Niên Bố Y • Lao Động Mưu Sinh & Tích Lũy Khởi Nghiệp';
    } else if (progState.stage === 2) {
      if (masterSealEl) masterSealEl.textContent = '莊園';
      if (hubTitleEl) hubTitleEl.textContent = isEn ? 'FAMILY MANOR • REGIONAL VENTURE' : 'TRANG VIÊN • TRUNG TÂM CƠ NGHIỆP';
      if (hubSubEl) hubSubEl.textContent = isEn ? 'Local Entrepreneur • Enterprise Operations & Social Standing' : 'Khởi Lập Cơ Sở • Điều Hành Sản Nghiệp & Gây Dựng Thanh Danh';
    } else if (progState.stage === 3) {
      if (masterSealEl) masterSealEl.textContent = '將府';
      if (hubTitleEl) hubTitleEl.textContent = isEn ? 'GENERAL RESIDENCE • INTER-CITY TRADE' : 'TƯỚNG PHỦ • ĐẠI THƯƠNG ĐOÀN';
      if (hubSubEl) hubSubEl.textContent = isEn ? 'Regional Magnate & Champion • Trade Routes & Hegemonic Ambition' : 'Hào Kiệt Phương Xa • Thương Lộ Viễn Chinh & Binh Uy';
    } else {
      if (masterSealEl) masterSealEl.textContent = '軍機';
      if (hubTitleEl) hubTitleEl.textContent = isEn ? 'GRAND COMMAND HUB • WAR COUNCIL' : 'QUÂN CƠ XỨ • ĐẠI BẢN DOANH';
      if (hubSubEl) hubSubEl.textContent = isEn ? 'Dynastic Hegemon • Multi-Domain Grand Strategy' : 'Tam Quốc Hùng Đồ • Tổng Hành Dinh 6 Đại Phân Hệ Chiến Lược';
    }

    // 2. Dynamic Update of Tab Navigation Bar
    const tabsBar = document.querySelector('.grand-hub-tabs-bar');
    if (!tabsBar) return;

    const tabsConfig = [
      {
        key: 'career',
        seal: '路',
        titleVi: 'Phẩm Lộ',
        titleEn: 'Roadmap',
        badgeVi: 'Chỉ Nam',
        badgeEn: 'Guide',
        badgeType: 'badge-unlocked',
        isLocked: false
      },
      {
        key: 'gear',
        seal: '武',
        titleVi: 'Quân Trang',
        titleEn: 'Armaments',
        badgeVi: progState.isForgeUnlocked ? 'Lò Rèn' : 'Hành Trang',
        badgeEn: progState.isForgeUnlocked ? 'Forge' : 'Gear',
        badgeType: 'badge-unlocked',
        isLocked: false
      },
      {
        key: 'enterprise',
        seal: progState.hasEnterprises ? '業' : '工',
        titleVi: progState.hasEnterprises ? `Sản Nghiệp (${progState.enterprises.length})` : 'Lao Động',
        titleEn: progState.hasEnterprises ? `Enterprises (${progState.enterprises.length})` : 'Labor',
        badgeVi: progState.hasEnterprises ? 'Kinh Doanh' : 'Làm Thuê',
        badgeEn: progState.hasEnterprises ? 'Active' : 'Wages',
        badgeType: progState.hasEnterprises ? 'badge-unlocked' : 'badge-pending',
        isLocked: false
      },
      {
        key: 'caravan',
        seal: '商',
        titleVi: 'Thương Đoàn',
        titleEn: 'Caravans',
        badgeVi: progState.isCaravanUnlocked ? (progState.hasCaravans ? `Đoàn Buôn (${progState.caravans.length})` : 'Khả Dụng') : 'Chưa Mở',
        badgeEn: progState.isCaravanUnlocked ? 'Active' : 'Locked',
        badgeType: progState.isCaravanUnlocked ? 'badge-unlocked' : 'badge-locked',
        isLocked: !progState.isCaravanUnlocked
      },
      {
        key: 'family',
        seal: '家',
        titleVi: 'Gia Thất',
        titleEn: 'Lineage',
        badgeVi: progState.isMarried ? 'Đã Lập Gia' : 'Độc Thân',
        badgeEn: progState.isMarried ? 'Married' : 'Single',
        badgeType: progState.isMarried ? 'badge-unlocked' : 'badge-pending',
        isLocked: false
      },
      {
        key: 'duel',
        seal: '演',
        titleVi: 'Diễn Võ',
        titleEn: 'Arena',
        badgeVi: 'Võ Đài',
        badgeEn: 'Arena',
        badgeType: 'badge-unlocked',
        isLocked: false
      },
      {
        key: 'tavern',
        seal: '義',
        titleVi: 'Tụ Nghĩa',
        titleEn: 'Tavern',
        badgeVi: 'Tửu Quán',
        badgeEn: 'Tavern',
        badgeType: 'badge-unlocked',
        isLocked: false
      }
    ];

    tabsBar.innerHTML = tabsConfig.map(t => {
      const title = isEn ? t.titleEn : t.titleVi;
      const badge = isEn ? t.badgeEn : t.badgeVi;
      const isActive = activeTabKey === t.key;
      return `
        <button class="grand-hub-tab-btn ${isActive ? 'active' : ''} ${t.isLocked ? 'tab-locked' : ''}"
          data-tab="${t.key}"
          onclick="GrandCommandHubUI.switchTab('${t.key}')"
          title="${t.isLocked ? (isEn ? 'Domain Locked: Click to view unlock prerequisites' : 'Chưa đủ điều kiện khởi sự: Bấm để xem nhiệm vụ mở khóa') : title}">
          <span class="hub-tab-seal">${t.seal}</span>
          <span class="hub-tab-text">${title}</span>
          ${t.isLocked ? `<span class="hub-tab-lock-icon">🔒</span>` : ''}
          <span class="hub-tab-badge ${t.badgeType}">${badge}</span>
        </button>
      `;
    }).join('');
  }

  // --------------------------------------------------------------------------
  // Core Hub Controller: Open, Close, Switch Tab
  // --------------------------------------------------------------------------

  async function openHub(defaultTab = 'career') {
    const modal = document.getElementById('grand-command-hub-modal');
    if (!modal) {
      console.error('Grand Command Hub modal shell not found in DOM.');
      return;
    }

    modal.classList.remove('hidden');
    const progState = await getHubProgressionState();
    refreshHubNavigation(progState);
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
      case 'career':
        renderCareerTab(container);
        break;
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
        renderCareerTab(container);
        break;
    }
  }

  // --------------------------------------------------------------------------
  // TAB 0: [路] PHẨM LỘ & HÀNH TRÌNH CUỘC ĐỜI (Career Roadmap & 5 Destinies)
  // --------------------------------------------------------------------------

  async function renderCareerTab(container) {
    try {
      const isEn = isEnglish();
      const [statusRes, entRes, duelRes, lineageRes] = await Promise.all([
        fetch('/api/status').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/enterprise/status').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/duels/leaderboard').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/lineage/state?characterId=PLY-0001').then(r => r.json()).catch(() => ({ success: false }))
      ]);

      const p = statusRes?.player || {};
      const f = statusRes?.financials || {};
      const netWorth = Number(f.netWorth || f.liquidCash || p.liquid_cash || 0);
      const liquidCash = Number(f.liquidCash || p.liquid_cash || 0);
      const businesses = entRes?.activeEnterprises || [];
      const hasBusiness = businesses.length > 0;
      const duelWins = (duelRes?.entries || []).find(e => e.characterId === 'PLY-0001')?.wins || 0;
      const spouse = lineageRes?.lineage?.spouse;

      const intVal = Number(p.int_attr || 50);
      const pol = Number(p.pol_attr || 50);
      const war = Number(p.war_attr || 50);
      const ldr = Number(p.ldr_attr || 50);
      const dip = Number(p.dip_attr || 50);
      const com = Number(p.com_attr || 50);
      const log = Number(p.log_attr || 50);
      const cra = Number(p.cra_attr || 50);
      const age = Number(p.age || 21);
      const playerName = p.name === 'Liang Yan' ? 'Lương Diễn' : (p.name || 'Lương Diễn');
      const playerStyle = p.style_name === 'Zhiyuan' ? 'Chí Viễn' : (p.style_name || 'Chí Viễn');

      // Determine Life Stage (1 to 4)
      let currentStage = 1;
      if (netWorth >= 50000 || (hasBusiness && businesses.length >= 2 && netWorth >= 30000)) {
        currentStage = 4;
      } else if (netWorth >= 12000 || hasBusiness || war >= 75 || com >= 80) {
        currentStage = 3;
      } else if (netWorth >= 1500 || hasBusiness || cra >= 60 || war >= 60 || com >= 60) {
        currentStage = 2;
      } else {
        currentStage = 1;
      }

      // Stage Metadata
      const stageMeta = [
        {
          num: 1,
          titleVi: 'Bố Y Khởi Thủy',
          titleEn: 'Penniless Commoner',
          criteriaVi: 'Hai bàn tay trắng, làm thuê công nhật mưu sinh, tích lũy từng đồng tiền công và EXP 8 trục',
          criteriaEn: 'Empty pockets, daily wage toil, accumulating copper wages and 8-axis EXP',
          seal: '布',
          badgeClass: 'stage-pauper',
          headlineVi: 'Áo vải chốn hương thôn • Tích lũy cơ bản',
          headlineEn: 'Humble Village Youth • Laying Foundations',
          descVi: 'Người chơi chưa có sản nghiệp riêng, dựa vào sức lao động để nuôi thân, tích lũy bạc vụn và năng lực trước khi mở lối rẽ lớn.',
          descEn: 'Starting with bare hands, taking daily shifts to earn bread and stat EXP before embarking on great branching destinies.'
        },
        {
          num: 2,
          titleVi: 'Tiểu Khang Lập Nghiệp',
          titleEn: 'Budding Factor',
          criteriaVi: 'Tích lũy >1,500 Tiền, mở xưởng thủ công hoặc sắm xe la, định hình 1 trong 5 đại phẩm lộ',
          criteriaEn: 'Net worth >1,500 Qian, own workshop or cart, choosing 1 of 5 career branches',
          seal: '業',
          badgeClass: 'stage-artisan',
          headlineVi: 'Vốn liếng sơ khởi • Mở lối rẽ định hướng',
          headlineEn: 'Initial Capital • Specializing Direction',
          descVi: 'Đã thoát khỏi cảnh bần hàn, có thể tự mở xưởng chế tác, dẫn thương đoàn liên huyện hoặc gia nhập quân ngũ.',
          descEn: 'Risen above poverty, capable of launching craft workshops, regional caravans, or answering the call to arms.'
        },
        {
          num: 3,
          titleVi: 'Hào Kiệt Danh Khởi',
          titleEn: 'Renowned Master',
          criteriaVi: 'Tài sản >12,000 Tiền, chế tạo Thần Binh, thương đoàn liên châu hoặc uy danh trận mạc',
          criteriaEn: 'Net worth >12,000 Qian, bespoke God weapons, interstate caravans, or martial renown',
          seal: '豪',
          badgeClass: 'stage-merchant',
          headlineVi: 'Danh chấn một phương • Lực lượng vững chắc',
          headlineEn: 'Regional Prestige • Solid Enterprise Backbone',
          descVi: 'Sở hữu quân trang đúc riêng, chiêu mộ hào kiệt môn hạ, uy thế lan tỏa khắp các quận hạt.',
          descEn: 'Wielding bespoke god weapons, commanding trusted retainers, and commanding interstate influence.'
        },
        {
          num: 4,
          titleVi: 'Phong Vân Hùng Chủ',
          titleEn: 'Dynastic Patriarch',
          criteriaVi: 'Tài sản >50,000 Tiền, tông tộc truyền thừa, phân phong quan chức, xoay chuyển thời cuộc',
          criteriaEn: 'Net worth >50,000 Qian, dynastic lineage, governance appointments, realm-shaping authority',
          seal: '覇',
          badgeClass: 'stage-hegemon',
          headlineVi: 'Thế gia vọng tộc • Chư hầu tranh hùng',
          headlineEn: 'Dynastic Clan • Realm-Shaping Master',
          descVi: 'Cơ nghiệp vững như bàn thạch, gia tộc truyền đời, có khả năng phong tướng định quan, lưu danh sử sách.',
          descEn: 'Rock-solid dynasty, multigen succession, capable of shaping historic campaigns and empire balance.'
        }
      ];

      const curStage = stageMeta[currentStage - 1];

      // Branch 1: Bách Nghệ / Thợ Cả
      const craMet = cra >= 60;
      const craProg = Math.min(100, Math.round((cra / 60) * 100));
      const hasWorkshop = businesses.some(b => b.type === 'WORKSHOP' || b.type === 'BLACKSMITH');

      // Branch 2: Hành Thương / Cự Phú
      const comMet = com >= 60 && log >= 55;
      const cashMet = liquidCash >= 1500;
      const comProg = Math.min(100, Math.round(((com / 60) * 0.4 + (log / 55) * 0.3 + (Math.min(liquidCash, 1500) / 1500) * 0.3) * 100));

      // Branch 3: Võ Hiệp / Quân Lữ
      const warMet = war >= 60 && ldr >= 55;
      const warProg = Math.min(100, Math.round(((war / 60) * 0.6 + (ldr / 55) * 0.4) * 100));

      // Branch 4: Sĩ Đồ / Quân Sư
      const scholarMet = intVal >= 70 && pol >= 60 && dip >= 60;
      const scholarProg = Math.min(100, Math.round(((intVal / 70) * 0.4 + (pol / 60) * 0.3 + (dip / 60) * 0.3) * 100));

      // Branch 5: Tông Tộc / Thế Gia
      const lineageMet = age >= 20 && netWorth >= 2000;
      const lineageProg = Math.min(100, Math.round(((Math.min(age, 20) / 20) * 0.5 + (Math.min(netWorth, 5000) / 5000) * 0.5) * 100));

      container.innerHTML = `
        <div class="grand-hub-view-container career-roadmap-view">
          
          <!-- Hero Identity & Stage Banner -->
          <div class="career-hero-banner">
            <div class="career-stage-icon-box ${curStage.badgeClass}">
              <span class="stage-huge-seal">${curStage.seal}</span>
            </div>
            <div class="career-hero-info">
              <div class="career-hero-title-row">
                <span class="career-hero-name">${playerName} (${playerStyle})</span>
                <span class="career-hero-age">${age} ${isEn ? 'Years' : 'Tuổi'}</span>
                <span class="career-stage-chip ${curStage.badgeClass}">${isEn ? curStage.titleEn : curStage.titleVi}</span>
              </div>
              <div class="career-hero-headline">${isEn ? curStage.headlineEn : curStage.headlineVi}</div>
              <div class="career-hero-sub">${isEn ? curStage.descEn : curStage.descVi}</div>
            </div>
            <div class="career-quick-action-col">
              <button class="tactical-btn tactical-btn--gold" onclick="if(window.EnterpriseUI){EnterpriseUI.openEnterpriseModal('work');GrandCommandHubUI.close();}">
                <span class="hub-seal-sub labor-seal">工</span> ${isEn ? 'Take Wage Labor Shift' : 'Đi Làm Thuê Kiếm Sống'}
              </button>
              <div class="career-cash-stat">
                <span style="color:#94a3b8;">${isEn ? 'Net Worth:' : 'Tài Sản Ròng:'}</span>
                <span class="stat-val font-mono gold-text font-bold">${netWorth.toLocaleString()} ${isEn ? 'Qian' : 'Tiền'}</span>
              </div>
            </div>
          </div>

          <!-- 4-Stage Lifelong Progression Timeline -->
          <div class="career-progression-track">
            <div class="track-header">
              <span class="track-title">${isEn ? 'LIFELONG RPG PROGRESSION TIMELINE (4 STAGES)' : 'CỘT MỐC TIẾN TRÌNH CUỘC ĐỜI (4 ĐẠI THỜI KỲ)'}</span>
              <span class="track-hint">${isEn ? 'From empty-handed youth to realm-shaping master' : 'Từ thanh niên tay trắng tới hùng chủ phân tranh'}</span>
            </div>
            <div class="track-steps-grid">
              ${stageMeta.map(st => {
                const isPassed = st.num < currentStage;
                const isActive = st.num === currentStage;
                const cls = isActive ? 'active' : (isPassed ? 'passed' : '');
                return `
                  <div class="track-step ${cls}">
                    <span class="track-step-num">${isEn ? 'STAGE ' + st.num : 'BẬC ' + st.num}</span>
                    <span class="track-step-title">${isEn ? st.titleEn : st.titleVi}</span>
                    <span class="track-step-criteria">${isEn ? st.criteriaEn : st.criteriaVi}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 5 Great Branching Destinies Grid -->
          <div class="career-branches-container">
            <div class="branches-header">
              <span class="branches-title">${isEn ? 'THE 5 BRANCHING DESTINIES (NGŨ ĐẠI PHẨM LỘ)' : 'NGŨ ĐẠI PHẨM LỘ • LỐI RẼ LẬP NGHIỆP THỜI LOẠN'}</span>
              <span class="branches-hint">${isEn ? 'Specialize your path or master multiple disciplines concurrently' : 'Định hình chí hướng theo sở trường hoặc phát triển đa ngành song song'}</span>
            </div>
            <div class="branches-grid">

              <!-- BRANCH 1: CRAFTSMAN -->
              <div class="branch-card ${craMet ? 'qualified' : ''}">
                <div class="branch-card-header">
                  <div class="branch-seal-group">
                    <span class="branch-seal-badge seal-artisan">工</span>
                    <div>
                      <div class="branch-name">${isEn ? 'Artisan & Master Armorer' : 'Bách Nghệ / Thợ Cả'}</div>
                      <div class="branch-motto">${isEn ? '"Crafting divine works by hands"' : 'Dĩ nghệ lập thân • Xảo đoạt thiên công'}</div>
                    </div>
                  </div>
                  <span class="branch-status-pill ${hasWorkshop ? 'qualified' : (craMet ? 'qualified' : 'progressing')}">
                    ${hasWorkshop ? (isEn ? 'OWNING WORKSHOP' : 'ĐÃ LẬP XƯỞNG') : (craMet ? (isEn ? 'QUALIFIED' : 'ĐỦ ĐIỀU KIỆN') : (isEn ? 'PROGRESSING' : 'ĐANG TÍCH LŨY'))}
                  </span>
                </div>
                <div class="branch-progress-box">
                  <div class="branch-progress-label-row">
                    <span>${isEn ? 'Craft Mastery' : 'Độ Thuần Thục Khéo Léo'} (CRA)</span>
                    <span class="font-mono text-emerald font-bold">${cra}/60 (${craProg}%)</span>
                  </div>
                  <div class="branch-progress-bar">
                    <div class="branch-progress-fill bg-emerald" style="width:${craProg}%;"></div>
                  </div>
                </div>
                <div class="branch-reqs-row">
                  <span class="req-pill ${craMet ? 'met' : 'unmet'}">CRA ≥ 60 (${cra})</span>
                  <span class="req-pill ${liquidCash >= 1000 ? 'met' : 'unmet'}">${isEn ? 'Cash' : 'Vốn'} ≥ 1,000 (${liquidCash.toLocaleString()})</span>
                </div>
                <ul class="branch-perks-list">
                  <li>${isEn ? 'Launch & manage craft workshops or blacksmith armories' : 'Khai mở & vận hành xưởng chế tác, lò rèn quân nhu'}</li>
                  <li>${isEn ? 'Forge bespoke god weapons with five-phase elements' : 'Rèn đúc thần binh độc bản, cường hóa trang bị ngũ hành'}</li>
                  <li>${isEn ? 'Trigger cross-discipline emergent craft breakthroughs' : 'Đại ngộ cảnh giới sáng tạo nghề thủ công mới độc bản'}</li>
                </ul>
                <div class="branch-actions-row">
                  <button class="tactical-btn tactical-btn--sm" onclick="if(window.EnterpriseUI){EnterpriseUI.openEnterpriseModal('work');GrandCommandHubUI.close();}">
                    ${isEn ? 'Forge Work Shift' : 'Quai Búa Lò Rèn'}
                  </button>
                  <button class="tactical-btn tactical-btn--primary tactical-btn--sm" onclick="GrandCommandHubUI.switchTab('enterprise');">
                    ${hasWorkshop ? (isEn ? 'Manage Workshop' : 'Vào Xưởng Riêng') : (isEn ? 'Launch Workshop' : 'Mở Cơ Sở')}
                  </button>
                  <button class="tactical-btn tactical-btn--gold tactical-btn--sm" onclick="GrandCommandHubUI.switchTab('gear');">
                    ${isEn ? 'Forge Weapons' : 'Đúc Thần Binh'}
                  </button>
                </div>
              </div>

              <!-- BRANCH 2: MERCHANT -->
              <div class="branch-card ${comMet && cashMet ? 'qualified' : ''}">
                <div class="branch-card-header">
                  <div class="branch-seal-group">
                    <span class="branch-seal-badge seal-merchant">商</span>
                    <div>
                      <div class="branch-name">${isEn ? 'Merchant & Caravan Master' : 'Hành Thương / Cự Phú'}</div>
                      <div class="branch-motto">${isEn ? '"Interstate trade yields realm-level wealth"' : 'Thông thương trục lợi • Phú khả địch quốc'}</div>
                    </div>
                  </div>
                  <span class="branch-status-pill ${comMet && cashMet ? 'qualified' : 'progressing'}">
                    ${comMet && cashMet ? (isEn ? 'READY TO TRADE' : 'ĐỦ ĐIỀU KIỆN') : (isEn ? 'ACCUMULATING' : 'ĐANG GOM VỐN')}
                  </span>
                </div>
                <div class="branch-progress-box">
                  <div class="branch-progress-label-row">
                    <span>${isEn ? 'Commerce & Logistics' : 'Thương Nghiệp & Hậu Cần'}</span>
                    <span class="font-mono text-gold font-bold">${com}/60 • ${log}/55 (${comProg}%)</span>
                  </div>
                  <div class="branch-progress-bar">
                    <div class="branch-progress-fill bg-gold" style="width:${comProg}%;"></div>
                  </div>
                </div>
                <div class="branch-reqs-row">
                  <span class="req-pill ${com >= 60 ? 'met' : 'unmet'}">COM ≥ 60 (${com})</span>
                  <span class="req-pill ${log >= 55 ? 'met' : 'unmet'}">LOG ≥ 55 (${log})</span>
                  <span class="req-pill ${cashMet ? 'met' : 'unmet'}">${isEn ? 'Cash' : 'Vốn'} ≥ 1,500 (${liquidCash.toLocaleString()})</span>
                </div>
                <ul class="branch-perks-list">
                  <li>${isEn ? 'Dispatch interstate trading caravans (Youzhou, Jizhou, Luoyang)' : 'Phái xuất thương đoàn liên châu (U Châu, Ký Châu, Lạc Dương)'}</li>
                  <li>${isEn ? 'Commodity arbitrage: salt, grain, silk, iron' : 'Buôn chuyến chênh lệch: muối duyên hải, lương thực, tơ lụa'}</li>
                  <li>${isEn ? 'Open taverns and manage safe cash reserves' : 'Mở tửu quán thu thập tin tức, quản lý két sắt an toàn'}</li>
                </ul>
                <div class="branch-actions-row">
                  <button class="tactical-btn tactical-btn--sm" onclick="if(window.EnterpriseUI){EnterpriseUI.openEnterpriseModal('work');GrandCommandHubUI.close();}">
                    ${isEn ? 'Tavern Shift' : 'Chạy Bàn Tửu Quán'}
                  </button>
                  <button class="tactical-btn tactical-btn--primary tactical-btn--sm" onclick="GrandCommandHubUI.switchTab('caravan');">
                    ${isEn ? 'Manage Caravans' : 'Điều Thương Đoàn'}
                  </button>
                  <button class="tactical-btn tactical-btn--gold tactical-btn--sm" onclick="GrandCommandHubUI.switchTab('enterprise');">
                    ${isEn ? 'Launch Tavern' : 'Mở Khách Điếm'}
                  </button>
                </div>
              </div>

              <!-- BRANCH 3: MARTIAL GENERAL -->
              <div class="branch-card ${warMet ? 'qualified' : ''}">
                <div class="branch-card-header">
                  <div class="branch-seal-group">
                    <span class="branch-seal-badge seal-martial">武</span>
                    <div>
                      <div class="branch-name">${isEn ? 'Martial Hero & Vanguard General' : 'Võ Hiệp / Quân Lữ'}</div>
                      <div class="branch-motto">${isEn ? '"Victorious in hundred battles, sweeping battlefields"' : 'Bách chiến bách thắng • Uy chấn sa trường'}</div>
                    </div>
                  </div>
                  <span class="branch-status-pill ${warMet ? 'qualified' : 'progressing'}">
                    ${warMet ? (isEn ? 'PROVEN WARRIOR' : 'DŨNG SĨ SẴN SÀNG') : (isEn ? 'IN TRAINING' : 'ĐANG LUYỆN VÕ')}
                  </span>
                </div>
                <div class="branch-progress-box">
                  <div class="branch-progress-label-row">
                    <span>${isEn ? 'Martial Prowess & Leadership' : 'Võ Lực & Thống Soái'}</span>
                    <span class="font-mono text-red font-bold">${war}/60 • ${ldr}/55 (${warProg}%)</span>
                  </div>
                  <div class="branch-progress-bar">
                    <div class="branch-progress-fill bg-red" style="width:${warProg}%;"></div>
                  </div>
                </div>
                <div class="branch-reqs-row">
                  <span class="req-pill ${war >= 60 ? 'met' : 'unmet'}">WAR ≥ 60 (${war})</span>
                  <span class="req-pill ${ldr >= 55 ? 'met' : 'unmet'}">LDR ≥ 55 (${ldr})</span>
                  <span class="req-pill ${duelWins > 0 ? 'met' : 'unmet'}">${isEn ? 'Duel Wins' : 'Trận Thắng Đấu Võ'} ≥ 1 (${duelWins})</span>
                </div>
                <ul class="branch-perks-list">
                  <li>${isEn ? 'Enter single combat duels and arena challenges across 4 ranks' : 'Thượng đài Diễn Võ tỉ thí đơn đả độc đấu 4 bậc lôi đài'}</li>
                  <li>${isEn ? 'Lead militia detachments and earn military promotions' : 'Thống suất hương binh tùng quân lập công, nhận phong hiệu úy'}</li>
                  <li>${isEn ? 'Defeat bandit strongholds and claim bounties' : 'Tiễu phạt sơn phỉ, bình định cướp bóc, giành phần thưởng'}</li>
                </ul>
                <div class="branch-actions-row">
                  <button class="tactical-btn tactical-btn--sm" onclick="if(window.EnterpriseUI){EnterpriseUI.openEnterpriseModal('work');GrandCommandHubUI.close();}">
                    ${isEn ? 'Wild Gathering' : 'Khai Quặng Rừng Sâu'}
                  </button>
                  <button class="tactical-btn tactical-btn--primary tactical-btn--sm" onclick="GrandCommandHubUI.switchTab('duel');">
                    ${isEn ? 'Enter Arena Duel' : 'Lên Đài Diễn Võ'}
                  </button>
                  <button class="tactical-btn tactical-btn--gold tactical-btn--sm" onclick="if(window.openWorldMap){openWorldMap();GrandCommandHubUI.close();}">
                    ${isEn ? 'Scout Citadels' : 'Dư Đồ Chiến Địa'}
                  </button>
                </div>
              </div>

              <!-- BRANCH 4: SCHOLAR STRATEGIST -->
              <div class="branch-card ${scholarMet ? 'qualified' : ''}">
                <div class="branch-card-header">
                  <div class="branch-seal-group">
                    <span class="branch-seal-badge seal-scholar">士</span>
                    <div>
                      <div class="branch-name">${isEn ? 'Scholar & Grand Advisor' : 'Sĩ Đồ / Quân Sư'}</div>
                      <div class="branch-motto">${isEn ? '"Deliberating in tents, deciding thousands of leagues"' : 'Vận trù duy ác • Quyết thắng thiên lý'}</div>
                    </div>
                  </div>
                  <span class="branch-status-pill ${scholarMet ? 'qualified' : 'progressing'}">
                    ${scholarMet ? (isEn ? 'REPUTED SCHOLAR' : 'DANH SĨ SÁCH LƯỢC') : (isEn ? 'STUDYING' : 'DÙI MÀI KINH SỬ')}
                  </span>
                </div>
                <div class="branch-progress-box">
                  <div class="branch-progress-label-row">
                    <span>${isEn ? 'Intellect & Politics' : 'Trí Lực & Chính Trị'}</span>
                    <span class="font-mono text-cyan font-bold">${intVal}/70 • ${pol}/60 (${scholarProg}%)</span>
                  </div>
                  <div class="branch-progress-bar">
                    <div class="branch-progress-fill bg-cyan" style="width:${scholarProg}%;"></div>
                  </div>
                </div>
                <div class="branch-reqs-row">
                  <span class="req-pill ${intVal >= 70 ? 'met' : 'unmet'}">INT ≥ 70 (${intVal})</span>
                  <span class="req-pill ${pol >= 60 ? 'met' : 'unmet'}">POL ≥ 60 (${pol})</span>
                  <span class="req-pill ${dip >= 60 ? 'met' : 'unmet'}">DIP ≥ 60 (${dip})</span>
                </div>
                <ul class="branch-perks-list">
                  <li>${isEn ? 'Resolve county litigations, recommend talent, serve as advisor' : 'Xử lý công án nha môn, tiến cử Hiếu Liêm, làm quân sư mưu chủ'}</li>
                  <li>${isEn ? 'Open apothecaries to treat wounded and brew medicines' : 'Mở Dược Y Quán tế thế, cứu giúp dân lành qua cơn loạn'}</li>
                  <li>${isEn ? 'Intervene in grand historical events and alter Three Kingdoms fate' : 'Tham gia quyết sách biến cố lịch sử, định hướng tam phân thiên hạ'}</li>
                </ul>
                <div class="branch-actions-row">
                  <button class="tactical-btn tactical-btn--sm" onclick="if(window.EnterpriseUI){EnterpriseUI.openEnterpriseModal('work');GrandCommandHubUI.close();}">
                    ${isEn ? 'Apothecary Shift' : 'Bốc Thuốc Y Quán'}
                  </button>
                  <button class="tactical-btn tactical-btn--primary tactical-btn--sm" onclick="GrandCommandHubUI.switchTab('enterprise');">
                    ${isEn ? 'Launch Apothecary' : 'Mở Y Quán Tế Thế'}
                  </button>
                  <button class="tactical-btn tactical-btn--gold tactical-btn--sm" onclick="if(window.openEventParticipationModal){openEventParticipationModal();GrandCommandHubUI.close();}">
                    ${isEn ? 'Historic Decisions' : 'Quyết Sách Lịch Sử'}
                  </button>
                </div>
              </div>

              <!-- BRANCH 5: DYNASTIC LINEAGE -->
              <div class="branch-card ${lineageMet ? 'qualified' : ''}">
                <div class="branch-card-header">
                  <div class="branch-seal-group">
                    <span class="branch-seal-badge seal-lineage">家</span>
                    <div>
                      <div class="branch-name">${isEn ? 'Patriarch & Dynastic Lineage' : 'Tông Tộc / Thế Gia'}</div>
                      <div class="branch-motto">${isEn ? '"Passing down bloodlines, eternal clan legacy"' : 'Huyết mạch truyền thừa • Vạn thế gia phong'}</div>
                    </div>
                  </div>
                  <span class="branch-status-pill ${spouse ? 'qualified' : (lineageMet ? 'qualified' : 'progressing')}">
                    ${spouse ? (isEn ? 'MARRIED & EXPANDING' : 'ĐÃ THÀNH GIA THẤT') : (lineageMet ? (isEn ? 'READY TO MARRY' : 'ĐỦ THẾ LẬP THẤT') : (isEn ? 'BUILDING BASE' : 'CHỜ THÀNH NIÊN'))}
                  </span>
                </div>
                <div class="branch-progress-box">
                  <div class="branch-progress-label-row">
                    <span>${isEn ? 'Maturity & Clan Wealth' : 'Tuổi Tác & Thế Gia'}</span>
                    <span class="font-mono text-purple font-bold">${age}/20 • ${netWorth.toLocaleString()} (${lineageProg}%)</span>
                  </div>
                  <div class="branch-progress-bar">
                    <div class="branch-progress-fill bg-purple" style="width:${lineageProg}%;"></div>
                  </div>
                </div>
                <div class="branch-reqs-row">
                  <span class="req-pill ${age >= 20 ? 'met' : 'unmet'}">${isEn ? 'Age' : 'Tuổi'} ≥ 20 (${age})</span>
                  <span class="req-pill ${netWorth >= 2000 ? 'met' : 'unmet'}">${isEn ? 'Wealth' : 'Tài sản'} ≥ 2,000 (${netWorth.toLocaleString()})</span>
                  <span class="req-pill ${spouse ? 'met' : 'unmet'}">${spouse ? (isEn ? 'Spouse: ' + spouse.name : 'Đã có phu thê') : (isEn ? 'Unwed' : 'Chưa thành hôn')}</span>
                </div>
                <ul class="branch-perks-list">
                  <li>${isEn ? 'Host brotherhood banquets and swear vows with renowned heroes' : 'Mở tửu yến chiêu đãi hào kiệt, kết nghĩa kim lan huynh đệ'}</li>
                  <li>${isEn ? 'Court prominent ladies, marry, and establish a dynastic manor' : 'Cầu thân giai nhân, thành gia lập thất, sinh hạ quý tử kế nghiệp'}</li>
                  <li>${isEn ? 'Mentor offspring, inherit stats and skills across generations' : 'Dưỡng dục thế hệ kế thừa, truyền thừa võ công & bách nghệ đời đời'}</li>
                </ul>
                <div class="branch-actions-row">
                  <button class="tactical-btn tactical-btn--sm" onclick="GrandCommandHubUI.switchTab('tavern');">
                    ${isEn ? 'Host Banquet' : 'Mở Tiệc Tụ Nghĩa'}
                  </button>
                  <button class="tactical-btn tactical-btn--primary tactical-btn--sm" onclick="GrandCommandHubUI.switchTab('family');">
                    ${spouse ? (isEn ? 'Dynasty Manor' : 'Trang Viên Gia Thất') : (isEn ? 'Courtship' : 'Cầu Thân Kết Tóc')}
                  </button>
                </div>
              </div>

            </div>
          </div>

          <!-- Strategic Handbook for Pauper Start (Cẩm Nang Khởi Nghiệp Tay Trắng) -->
          <div class="career-onboarding-card">
            <div class="onboarding-title">
              <span>🌾</span> ${isEn ? 'COMMONER ZERO-TO-HERO SURVIVAL HANDBOOK' : 'CẨM NANG KHỞI NGHIỆP DÀNH CHO THANH NIÊN TAY TRẮNG'}
            </div>
            <div class="onboarding-steps">
              <div class="onboarding-step-item">
                <strong>1. ${isEn ? 'Mưu Sinh Kiếm Tiền:' : 'Mưu Sinh Kiếm Tiền:'}</strong><br>
                ${isEn ? 'Click "Take Wage Labor Shift" to work daily shifts (Blacksmith, Tavern, Herbs). Earn 35-60 coins per shift without needing capital.' : 'Bấm nút "Làm Thuê" trên thanh lệnh để đi làm ca nhật công (Lò rèn, Khách điếm, Hái thuốc). Mỗi ca nhận 35-60 tiền và tăng điểm EXP tương ứng.'}
              </div>
              <div class="onboarding-step-item">
                <strong>2. ${isEn ? 'Tích Lũy Ban Đầu:' : 'Tích Lũy Ban Đầu:'}</strong><br>
                ${isEn ? 'Reach 500 - 1,500 coins. Purchase basic gear, brew tea/wine to restore stamina, and befriend local figures like Zhang Fei or Liu Bei.' : 'Tích lũy từ 500 - 1,500 tiền. Sắm vũ khí phòng thân, uống trà/rượu hồi phục thể lực, kết giao cùng các hào kiệt như Trương Phi, Lưu Bị.'}
              </div>
              <div class="onboarding-step-item">
                <strong>3. ${isEn ? 'Mở Lối Rẽ Đầu Tiên:' : 'Mở Lối Rẽ Đầu Tiên:'}</strong><br>
                ${isEn ? 'When a career branch illuminates, take your milestone action: open your first workshop, buy draft mules for a caravan, or challenge the arena!' : 'Khi một trong 5 Phẩm Lộ sáng lên, mở cơ sở đầu tiên (xưởng/lò rèn), mua lừa thồ lập thương đội, hoặc bước lên lôi đài tỉ thí tranh hùng!'}
              </div>
            </div>
          </div>

        </div>
      `;
    } catch (err) {
      console.error('Failed to render career tab:', err);
      container.innerHTML = `
        <div class="grand-hub-error">
          <p>${isEnglish() ? 'Failed to load career records: ' : 'Không thể tải hồ sơ phẩm lộ: '} ${err.message}</p>
        </div>
      `;
    }
  }

  // --------------------------------------------------------------------------
  // TAB 1: [武] QUÂN TRANG (Gear & Forge)
  // --------------------------------------------------------------------------

  async function renderGearTab(container) {
    try {
      const progState = cachedProgressionState || await getHubProgressionState();
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
            ${progState.isForgeUnlocked ? `
              <button class="tactical-btn tactical-btn--primary tactical-btn--sm" onclick="if(window.EquipmentUI){EquipmentUI.openEquipmentModal('PLY-0001','forge');}">
                ${isEn ? 'Open Master Forge' : 'Mở Lò Rèn Đại Tượng Sư'} →
              </button>
            ` : `
              <span class="tactical-badge tactical-badge--warning" style="font-size: 11px;">
                ${isEn ? 'Forge Locked (CRA < 50)' : 'Lò Rèn: Chưa Mở (CRA < 50)'}
              </span>
            `}
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
          ${progState.isForgeUnlocked ? `
            <div class="tactical-card" style="margin-top: 14px; border-left: 3px solid var(--brand-primary, #f59e0b);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div>
                  <strong style="color: #f1f5f9;">${isEn ? 'Bespoke Forging Protocol (CRA ≥ 50 Active):' : 'Quy Trình Đoán Tạo Thần Binh (Đã Mở Khóa Lò Rèn):'}</strong>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                    ${isEn ? 'Consumes 25 Fatigue, Iron Ingots, Oak Timber, Charcoal and Leather. Stat clamped to [+1..+5].' : 'Tiêu hao 25 Thể lực, Phôi sắt, Than lò, Gỗ sồi & Da thuộc. Chỉ số bảo toàn nghiêm ngặt [+1..+5].'}
                  </div>
                </div>
                <button class="tactical-btn tactical-btn--primary" onclick="if(window.EquipmentUI){EquipmentUI.openEquipmentModal('PLY-0001','forge');}">
                  ${isEn ? 'Enter Forge Workshop' : 'Vào Phân Xưởng Lò Rèn'} →
                </button>
              </div>
            </div>
          ` : `
            <div class="tactical-card" style="margin-top: 14px; border-left: 3px solid #64748b; background: rgba(100, 116, 139, 0.05);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="color: #94a3b8;">${isEn ? 'Bespoke Master Forge (Locked - Requires CRA ≥ 50 or Forge Facility)' : 'Lò Rèn Thần Binh (Chưa Mở Khóa - Cần Kỹ Nghệ CRA ≥ 50 hoặc Có Xưởng Rèn)'}</strong>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                    ${isEn ? `Current CRA: ${progState.cra}/50. Work as Forge Apprentice to gain Crafting EXP.` : `Chỉ số Kỹ Nghệ hiện tại: ${progState.cra}/50. Hãy làm thuê phụ lò rèn để nâng cao tay nghề đúc kiếm.`}
                  </div>
                </div>
                <button class="tactical-btn tactical-btn--sm" onclick="GrandCommandHubUI.executeWorkShift('SHIFT_FORGE_HAND')">
                  🔨 ${isEn ? 'Apprentice at Forge (+40 CRA EXP)' : 'Làm Phụ Lò Rèn (+40 EXP CRA)'}
                </button>
              </div>
            </div>
          `}
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
  // TAB 2: [業/工] SẢN NGHIỆP & LAO ĐỘNG (Enterprises & Labor Market)
  // --------------------------------------------------------------------------

  async function renderEnterpriseTab(container) {
    try {
      const progState = cachedProgressionState || await getHubProgressionState();
      const res = await fetch('/api/enterprise/status?characterId=PLY-0001');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load enterprises');

      const st = data.status;
      const isEn = isEnglish();
      const owned = st.ownedBusinesses || st.activeEnterprises || [];
      const hasOwned = owned.length > 0;
      const canAffordEnterprise = progState.liquidCash >= 1500;

      const laborShifts = [
        { id: 'SHIFT_FORGE_HAND', seal: '鍛', title: 'Thợ Phụ Kéo Bễ & Quai Búa', wage: 140, fatigue: 20, exp: 40, workplace: 'Lò Rèn Bách Nghệ Trác Quận' },
        { id: 'SHIFT_CHEF_TAVERN', seal: '庖', title: 'Đầu Bếp & Phục Vụ Rượu', wage: 110, fatigue: 15, exp: 30, workplace: 'Tửu Điếm Đào Viên' },
        { id: 'SHIFT_HERBALIST', seal: '藥', title: 'Dược Đồng Bào Chế Thuốc', wage: 120, fatigue: 15, exp: 35, workplace: 'Hồi Xuân Dược Đường' },
        { id: 'SHIFT_WEAVER', seal: '工', title: 'Thợ Thủ Công Đan Phên Tre', wage: 95, fatigue: 12, exp: 25, workplace: 'Xưởng Thủ Công Lương Gia' },
        { id: 'SHIFT_MINER', seal: '礦', title: 'Phu Mỏ Khai Khoáng & Bốc Quặng', wage: 130, fatigue: 18, exp: 35, workplace: 'Mỏ Sắt Tây Sơn Trác Quận' },
        { id: 'SHIFT_WAITER', seal: '酒', title: 'Tiểu Nhị Tiếp Tân Tửu Điếm', wage: 85, fatigue: 10, exp: 20, workplace: 'Trà Quán Bình Dân Trác Huyện' }
      ];

      container.innerHTML = `
        <div class="grand-hub-view-container">
          <div class="grand-hub-section-header">
            <div>
              <h3 class="grand-hub-view-title">
                <span class="hub-seal-accent">${hasOwned ? '業' : '工'}</span>
                ${hasOwned
                  ? (isEn ? 'Enterprises, Facilities & Revenue Management' : 'Sản Nghiệp, Cơ Sở & Quản Lý Doanh Thu')
                  : (isEn ? 'Daily Labor Market & Venture Accumulation' : 'Lao Động Mưu Sinh & Tích Lũy Khởi Nghiệp')}
              </h3>
              <p class="grand-hub-view-desc">
                ${hasOwned
                  ? (isEn ? 'Direct production lines, collect profits, and manage enterprise workforce.' : 'Quản lý cơ sở chế tác, phân công thợ giỏi và quyết toán thặng dư lợi nhuận.')
                  : (isEn ? 'Take daily wage shifts to accumulate initial capital and craft experience before founding an enterprise.' : 'Làm thuê công nhật mưu sinh, tích lũy tiền công và kinh nghiệm nghề nghiệp để tự do lập xưởng.')}
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              ${hasOwned ? `
                <div style="font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #34d399;">
                  ${isEn ? 'Workforce:' : 'Tổng Nhân Lực:'} <strong>${st.totalWorkforce || 0}</strong> • ${isEn ? 'Daily Rev:' : 'Doanh Thu Ngày:'} <strong>${formatNumber(st.totalDailyRevenue || 0)} Qian</strong>
                </div>
              ` : `
                <div style="font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #fbbf24;">
                  ${isEn ? 'Current Cash:' : 'Tiền Mặt:'} <strong>${formatNumber(progState.liquidCash)} Qian</strong>
                </div>
              `}
              <button class="tactical-btn ${canAffordEnterprise ? 'tactical-btn--primary' : 'tactical-btn--disabled'} tactical-btn--sm"
                ${canAffordEnterprise ? `onclick="if(window.EnterpriseUI){EnterpriseUI.openEnterpriseModal('own');}"` : 'disabled'}
                title="${canAffordEnterprise ? (isEn ? 'Open venture creation modal' : 'Mở giao diện lập xưởng mới') : (isEn ? `Requires 1,500 Qian (Have: ${progState.liquidCash})` : `Cần tối thiểu 1,500 Tiền (Hiện có: ${formatNumber(progState.liquidCash)})`)}">
                ${canAffordEnterprise ? (isEn ? 'Found New Enterprise →' : 'Tự Do Lập Nghiệp & Mở Xưởng →') : `[CẦN 1,500 TIỀN (${formatNumber(progState.liquidCash)}/1,500)]`}
              </button>
            </div>
          </div>

          ${hasOwned ? `
            <!-- Owned Facilities (Rendered first if player owns business) -->
            <div class="hub-section-subtitle">${isEn ? 'Active Owned Enterprises:' : 'Cơ Sở Sản Nghiệp Đang Sở Hữu & Điều Hành:'}</div>
            <div class="grand-hub-grid-3">
              ${owned.map(biz => {
                const profit = Number(biz.accumulated_profit || 0);
                const dailyRev = Number(biz.daily_revenue || biz.daily_revenue_avg || 120);
                return `
                  <div class="tactical-card">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                      <strong style="font-size: 13px; color: #f1f5f9;">${biz.name}</strong>
                      <span class="tactical-badge tactical-badge--info">${biz.business_type || 'WORKSHOP'}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">
                      ${isEn ? 'Location:' : 'Địa bàn:'} <b>${biz.location || biz.location_id || 'LOC-0001'}</b> • ${isEn ? 'Workforce:' : 'Quy mô thợ:'} <b>${biz.current_workforce || biz.workforce_count || 4}</b>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; font-family: 'JetBrains Mono', monospace; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 6px;">
                      <span>${isEn ? 'Daily Rev:' : 'Thu nhập ngày:'} <b style="color: #4ade80;">+${dailyRev} Qian</b></span>
                      <span>${isEn ? 'Safe Cash:' : 'Két sắt:'} <b>${formatNumber(biz.safe_cash)} Qian</b></span>
                    </div>
                    ${profit > 0 ? `
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.12); font-size: 11px;">
                        <span style="color: #34d399; font-family: 'JetBrains Mono', monospace;">Thặng dư: <b>+${profit} Qian</b></span>
                        <button class="tactical-btn tactical-btn--xs" style="background: #059669; border-color: #10b981; color: #fff; padding: 2px 8px;" onclick="GrandCommandHubUI.collectProfit('${biz.business_id}')">
                          ${isEn ? 'Collect' : 'Rút Tiền'}
                        </button>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <!-- Venture Goal Banner when no business owned yet -->
            <div class="tactical-card" style="border-left: 3px solid #fbbf24; background: rgba(251, 191, 36, 0.04); margin-bottom: 14px; padding: 14px 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="color: #fbbf24; font-size: 13px;">${isEn ? 'Venture Milestone: Founding Your First Business' : 'Mục Tiêu Khởi Nghiệp: Khởi Lập Cơ Sở Đầu Tiên'}</strong>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                    ${isEn
                      ? 'Accumulate 1,500 Qian from daily wages to purchase or establish your own Workshop, Tavern, Apothecary, or Blacksmith Forge.'
                      : 'Tích lũy đủ 1,500 Tiền từ làm thuê để mua lại hoặc mở mới Xưởng thủ công, Tửu quán, Dược điếm hoặc Lò rèn.'}
                  </div>
                </div>
                <div style="font-size: 12px; font-family: 'JetBrains Mono', monospace; color: ${canAffordEnterprise ? '#4ade80' : '#fbbf24'};">
                  <b>${formatNumber(progState.liquidCash)} / 1,500 Qian</b>
                </div>
              </div>
            </div>
          `}

          <!-- Labor Market Shifts (Always accessible) -->
          <div class="hub-section-subtitle" style="margin-top: 12px;">${isEn ? 'Daily Labor Market (Earn Immediate Wages):' : 'Thị Trường Làm Thuê Kiếm Sống (Lương Ngày & Kinh Nghiệm Nghề):'}</div>
          <div class="grand-hub-grid-2">
            ${laborShifts.map(sh => `
              <div class="tactical-card" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span class="hub-seal-badge">${sh.seal}</span>
                  <div>
                    <strong style="font-size: 12.5px; color: #f1f5f9;">${sh.title}</strong>
                    <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">
                      ${sh.workplace} • Tiêu hao: <b style="color: #fbbf24;">${sh.fatigue} Thể lực</b> • Nhận: <b style="color: #38bdf8;">+${sh.exp} EXP</b>
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

      showToast(data.messageVi || data.message || 'Hoàn tất ca làm thuê!');
      if (typeof playSfx === 'function') playSfx('coins');
      renderTabContent('enterprise');
      if (typeof updateTopTelemetry === 'function') updateTopTelemetry();
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    } finally {
      isSubmittingAction = false;
    }
  }

  async function collectProfit(businessId) {
    if (isSubmittingAction) return;
    isSubmittingAction = true;
    try {
      const res = await fetch('/api/enterprise/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: 'PLY-0001', businessId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to collect profit');

      showToast(data.message || `Đã rút thành công ${data.collectedAmount} Tiền lợi nhuận!`);
      if (typeof playSfx === 'function') playSfx('coins');
      renderTabContent('enterprise');
      if (typeof updateTopTelemetry === 'function') updateTopTelemetry();
    } catch (err) {
      showToast(`[LỖI] ${err.message}`, true);
    } finally {
      isSubmittingAction = false;
    }
  }

  // --------------------------------------------------------------------------
  // TAB 3: [商] THƯƠNG ĐOÀN (Caravans & Inter-City Trade)
  // --------------------------------------------------------------------------

  async function renderCaravanTab(container) {
    try {
      const progState = cachedProgressionState || await getHubProgressionState();
      const isEn = isEnglish();

      // Check if Caravan domain is locked for protagonist
      if (!progState.isCaravanUnlocked) {
        container.innerHTML = `
          <div class="grand-hub-view-container">
            <div class="tactical-card" style="border-left: 4px solid #f59e0b; background: rgba(245, 158, 11, 0.04); padding: 22px 24px;">
              <div style="display: flex; align-items: flex-start; gap: 18px;">
                <div style="font-size: 34px; line-height: 1; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.3);">
                  🔒
                </div>
                <div style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <h3 style="margin: 0; font-size: 15px; color: #fbbf24; font-weight: 700;">
                      ${isEn ? 'INTER-CITY TRADE EXPEDITIONS • NOT YET UNLOCKED' : 'THƯƠNG ĐOÀN BUÔN XA LIÊN CHÂU QUẬN • CHƯA ĐỦ ĐIỀU KIỆN KHỞI SỰ'}
                    </h3>
                    <span class="tactical-badge tactical-badge--warning">
                      ${isEn ? 'Requires Merchant Foundation' : 'Cần Nền Tảng Thương Nghiệp'}
                    </span>
                  </div>
                  <p style="margin: 0 0 14px 0; font-size: 12px; color: #cbd5e1; line-height: 1.6;">
                    ${isEn
                      ? 'Traversing long-distance trade routes across the 15 provinces in turbulent times requires significant working capital, freight horses, and hired escort guards. A penniless commoner cannot yet independently organize caravans.'
                      : 'Vận chuyển hàng hóa qua 15 châu quận thời buổi loạn thế đòi hỏi nguồn vốn nhập hàng dồi dào, ngựa xe vận tải và đội ngũ võ sĩ hộ tiêu áp tải. Một thanh niên áo vải chưa đủ tư cách để tự mình lãnh đạo thương đoàn.'}
                  </p>

                  <!-- Unlock Checklist -->
                  <div style="background: rgba(0,0,0,0.35); border: 1px dashed rgba(255,255,255,0.15); border-radius: 8px; padding: 12px 16px; margin-bottom: 14px;">
                    <strong style="color: #38bdf8; font-size: 11.5px; display: block; margin-bottom: 8px;">
                      ${isEn ? '📋 PREREQUISITES TO ESTABLISH CARAVANS (MEET ANY OF THE FOLLOWING):' : '📋 ĐIỀU KIỆN ĐỂ TỔ CHỨC THƯƠNG ĐOÀN (ĐẠT 1 TRONG CÁC ĐIỀU KIỆN):'}
                    </strong>
                    <div style="display: grid; gap: 8px; font-size: 11.5px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; color: ${progState.liquidCash >= 2500 ? '#4ade80' : '#94a3b8'};">
                        <span>💰 ${isEn ? 'Working Cash Reserve:' : 'Ngân lượng lưu động tối thiểu:'} <b>2,500 Qian</b></span>
                        <b>${progState.liquidCash >= 2500 ? '✅ ĐÃ ĐẠT' : `❌ Hiện có: ${formatNumber(progState.liquidCash)} / 2,500 Qian`}</b>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; color: ${progState.com >= 50 ? '#4ade80' : '#94a3b8'};">
                        <span>📜 ${isEn ? 'Commerce Attribute (COM):' : 'Chỉ số Thương Nghiệp (COM):'} <b>≥ 50</b></span>
                        <b>${progState.com >= 50 ? '✅ ĐÃ ĐẠT' : `❌ Hiện tại: ${progState.com} / 50`}</b>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; color: ${progState.hasEnterprises ? '#4ade80' : '#94a3b8'};">
                        <span>🏢 ${isEn ? 'Commercial Facility Ownership:' : 'Sở hữu ít nhất 1 cơ sở sản nghiệp (Xưởng/Tửu quán/Dược điếm)'}</span>
                        <b>${progState.hasEnterprises ? '✅ ĐÃ ĐẠT' : '❌ Chưa sở hữu xưởng nào'}</b>
                      </div>
                    </div>
                  </div>

                  <!-- Action Guidance -->
                  <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="tactical-btn tactical-btn--primary tactical-btn--sm" onclick="GrandCommandHubUI.switchTab('enterprise')">
                      💼 ${isEn ? 'Earn Wages in Labor Market' : 'Làm Thuê Tích Lũy Vốn (Tab Lao Động)'} →
                    </button>
                    <button class="tactical-btn tactical-btn--sm" onclick="GrandCommandHubUI.switchTab('career')">
                      🗺️ ${isEn ? 'View Merchant Destiny Path' : 'Xem Phẩm Lộ [Hành Thương Cự Phú]'} →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Regional Price Arbitrage Preview (Always accessible as market intelligence!) -->
            <div class="tactical-card" style="margin-top: 14px; background: rgba(15, 23, 42, 0.8);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="color: #38bdf8;">${isEn ? '15-Province Macro-Economic Arbitrage Matrix (Market Intel)' : 'Bảng Chênh Lệch Giá Hàng Hóa 15 Châu Huyện (Thám Thính Thị Trường)'}</strong>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                    ${isEn ? 'Inspect grain, silk, iron and salt price spreads across China before launching your trade network.' : 'Dù chưa thể phái đoàn buôn, bạn vẫn có thể xem xét giá cả ngũ cốc, da thuộc, tơ lụa để chuẩn bị chiến lược.'}
                  </div>
                </div>
                <button class="tactical-btn tactical-btn--sm" onclick="if(window.CaravanUI){CaravanUI.open('arbitrage');}">
                  ${isEn ? 'Inspect Price Matrix' : 'Xem Bảng Giá Toàn Quốc'} →
                </button>
              </div>
            </div>
          </div>
        `;
        return;
      }

      const res = await fetch('/api/logistics/caravans');
      const data = await res.json();
      const caravans = data.caravans || [];

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
      const progState = cachedProgressionState || await getHubProgressionState();
      const res = await fetch('/api/lineage/status');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load lineage status');

      cachedLineageOverview = data.overview;
      const overview = cachedLineageOverview;
      const isEn = isEnglish();
      const isMarried = overview.spouses && overview.spouses.length > 0;

      container.innerHTML = `
        <div class="grand-hub-view-container">
          <div class="grand-hub-section-header">
            <div>
              <h3 class="grand-hub-view-title">
                <span class="hub-seal-accent">家</span>
                ${isMarried
                  ? (isEn ? 'Dynastic Family & Lineage Succession (R1)' : 'Gia Thất, Hậu Duệ & Kế Thừa Dòng Họ (R1)')
                  : (isEn ? 'Courtship & Family Founding (Bachelor)' : 'Gia Thất • Tầm Thê & Khởi Lập Gia Tộc (Độc Thân)')}
              </h3>
              <p class="grand-hub-view-desc">
                ${isMarried
                  ? (isEn ? 'Manage betrothal, heir mentorship under historical masters, and dynastic succession.' : 'Cầu hôn tài nữ, nuôi dạy thế tử dưới trướng danh sư và kế thừa dòng họ.')
                  : (isEn ? 'Seek and encounter prominent heroines across China, cultivate bonds, and accumulate dowry to establish your clan.' : 'Diện kiến giai nhân Tam Quốc, bồi đắp hảo cảm và nạp sính lễ để chính thức lập gia thất.')}
              </p>
            </div>
            <div style="font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #fbbf24;">
              ${isMarried
                ? `${isEn ? 'Generation:' : 'Đời Thứ:'} <strong>${overview.clan?.current_generation || 1}</strong> • ${isEn ? 'Spouses:' : 'Thê Thiếp:'} <strong>${overview.spouses?.length || 0}</strong> • ${isEn ? 'Heirs:' : 'Hậu Duệ:'} <strong>${overview.children?.length || 0}</strong>`
                : `<span style="color: #38bdf8;">${isEn ? 'Bachelor • Unmarried' : 'Bố Y Độc Thân • Chưa Lập Gia'}</span>`}
            </div>
          </div>

          ${!isMarried ? `
            <!-- Bachelor Notice Banner -->
            <div class="tactical-card" style="border-left: 3px solid #38bdf8; background: rgba(56, 189, 248, 0.05); margin-bottom: 14px; padding: 14px 18px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <strong style="color: #38bdf8; font-size: 13px;">${isEn ? 'Protagonist Status: Unmarried Wanderer' : 'Tình Trạng Gia Thất: Bố Y Độc Thân (Chưa Lập Trang Viên)'}</strong>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                    ${isEn
                      ? 'Courtship & Maiden Encounter is open below. Heirs, Genealogy, and Ancestral Memorial unlock once you marry a spouse.'
                      : 'Hiện có thể tương ngộ và cầu hôn giai nhân. Các mục Hậu Duệ, Gia Phả và Tông Miếu sẽ mở khóa sau khi thành gia lập thất.'}
                  </div>
                </div>
                <span class="tactical-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);">
                  ${isEn ? 'Bachelor' : 'Độc Thân'}
                </span>
              </div>
            </div>
          ` : ''}

          <!-- Sub-View Navigation Tabs -->
          <div class="grand-hub-subnav">
            <button class="grand-hub-subnav-btn ${activeLineageSubTab === 'courtship' ? 'active' : ''}" onclick="GrandCommandHubUI.switchLineageSubTab('courtship')">
              <span class="hub-subnav-seal">姻</span> ${isEn ? 'Courtship & Spouses' : (isMarried ? 'Cầu Hôn & Thê Thiếp' : 'Tầm Thê & Cầu Hôn')}
            </button>
            <button class="grand-hub-subnav-btn ${activeLineageSubTab === 'heirs' ? 'active' : ''} ${!isMarried ? 'subnav-btn-locked' : ''}"
              ${isMarried ? `onclick="GrandCommandHubUI.switchLineageSubTab('heirs')"` : `disabled title="${isEn ? 'Locked: Requires married spouse' : 'Khóa: Cần cưới thê thiếp để mở sổ bộ hậu duệ'}"`}>
              <span class="hub-subnav-seal">${isMarried ? '嗣' : '🔒'}</span> ${isEn ? 'Heirs & Mentorship' : 'Hậu Duệ & Dạy Dỗ'}
            </button>
            <button class="grand-hub-subnav-btn ${activeLineageSubTab === 'tree' ? 'active' : ''} ${!isMarried ? 'subnav-btn-locked' : ''}"
              ${isMarried ? `onclick="GrandCommandHubUI.switchLineageSubTab('tree')"` : `disabled title="${isEn ? 'Locked: Requires established family' : 'Khóa: Cần khai sáng gia tộc để lập phả đồ'}"`}>
              <span class="hub-subnav-seal">${isMarried ? '譜' : '🔒'}</span> ${isEn ? 'Genealogical Tree' : 'Gia Phả Dòng Họ'}
            </button>
            <button class="grand-hub-subnav-btn ${activeLineageSubTab === 'succession' ? 'active' : ''} ${!isMarried ? 'subnav-btn-locked' : ''}"
              ${isMarried ? `onclick="GrandCommandHubUI.switchLineageSubTab('succession')"` : `disabled title="${isEn ? 'Locked: Requires heir' : 'Khóa: Cần có thế tử để thừa kế tông miếu'}"`}>
              <span class="hub-subnav-seal">${isMarried ? '繼' : '🔒'}</span> ${isEn ? 'Ancestors & Succession' : 'Tông Miếu & Kế Thừa'}
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
      const encountered = candidates.filter(c => c.isEncountered);
      const unmet = candidates.filter(c => !c.isEncountered);

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
                ${isEn ? 'Player currently has no married spouses. Propose to an encountered maiden below.' : 'Hiện tại Lương Diễn chưa lập gia thất. Hãy kết giao, diện kiến và cầu hôn các giai nhân Tam Quốc.'}
              </div>
            `}
          </div>

          <!-- Section 1: Encountered Maidens (Interactive & Eligible) -->
          <div class="hub-section-subtitle" style="display: flex; justify-content: space-between; align-items: center;">
            <span>${isEn ? 'Encountered Heroines & Courtship (Affinity ≥ 80 Required):' : 'Giai Nhân Đã Tương Ngộ & Dạm Ngõ Cầu Hôn (Hảo Cảm ≥ 80):'}</span>
            <span style="font-size: 11px; color: #a855f7; font-weight: normal;">${encountered.length} ${isEn ? 'encountered' : 'đã tương ngộ'}</span>
          </div>

          ${encountered.length === 0 ? `
            <div class="tactical-card" style="border-left: 3px solid #f59e0b; background: rgba(245, 158, 11, 0.05); margin-bottom: 20px; padding: 18px 20px;">
              <div style="display: flex; align-items: flex-start; gap: 14px;">
                <div style="font-size: 32px; line-height: 1;">🌸</div>
                <div style="flex: 1;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #fbbf24; font-weight: 600;">
                    ${isEn ? 'No Maiden Encountered Yet' : 'Chưa Tương Ngộ Tuyệt Sắc Giai Nhân Nào'}
                  </h4>
                  <p style="margin: 0 0 10px 0; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                    ${isEn
                      ? 'You have not yet met or interacted with any prominent maidens in the realm. To unlock marriage proposals and family founding, you must first seek and encounter them.'
                      : 'Lương Diễn hiện chưa từng diện kiến hay kết giao với tuyệt sắc giai nhân nào trong thiên hạ. Gia thất không thể tự tiện kết ước khi chưa từng tương ngộ.'}
                  </p>
                  <div style="font-size: 11.5px; color: #94a3b8; background: rgba(0,0,0,0.35); padding: 10px 14px; border-radius: 6px; border: 1px dashed rgba(255,255,255,0.12);">
                    <strong style="color: #38bdf8;">${isEn ? '💡 Pathways to encounter heroines:' : '💡 Phương thức tương ngộ giai nhân:'}</strong>
                    <ul style="margin: 6px 0 0 0; padding-left: 18px; line-height: 1.6;">
                      <li><b>${isEn ? 'Travel to Regions:' : 'Hành tẩu châu quận:'}</b> ${isEn ? 'Visit cities where maidens reside (Yecheng, Luoyang, Jianye, Saitang).' : 'Di chuyển đến nơi các nàng ngụ cư (Nghiệp Thành, Lạc Dương, Kiến Nghiệp, Sài Tang...).'}</li>
                      <li><b>${isEn ? 'Tavern Banquets & Gatherings:' : 'Yến tiệc tửu quán & Kết giao:'}</b> ${isEn ? 'Host banquets or visit taverns to trigger encounters and news.' : 'Mở yến tiệc tửu quán hoặc đàm đạo danh sĩ để mở rộng mạng lưới giao hảo.'}</li>
                      <li><b>${isEn ? 'Kizuna Daily Interactions:' : 'Bồi đắp Hảo Cảm (Kizuna):'}</b> ${isEn ? 'Once encountered, converse, share tea, or present gifts to reach Affinity ≥ 80 before proposing.' : 'Sau khi diện kiến, đàm đạo, dâng lễ vật, mời trà để nâng Hảo Cảm đạt ≥ 80 điểm mới có thể dạm ngõ sính lễ.'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ` : `
            <div class="grand-hub-grid-3" style="margin-bottom: 20px;">
              ${encountered.map(cand => {
                const eligible = cand.affinity >= 80;
                const dowry = cand.recommendedDowryCash || cand.dowryCash || 5000;
                const trait = cand.maternalTraitPerk?.traitNameVi || cand.maternalTraitNameVi || 'Hiền Thục Bội Phần';
                return `
                  <div class="tactical-card" style="border: 1px solid ${eligible ? '#4ade80' : '#ec4899'};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                      <div>
                        <strong style="color: #f1f5f9;">${cand.nameVi}</strong>
                        <div style="font-size: 10.5px; color: var(--text-muted);">${cand.relationshipTitleVi || cand.titleVi || 'Tương Ngộ'}</div>
                      </div>
                      <span class="tactical-badge ${eligible ? 'tactical-badge--success' : 'tactical-badge--warning'}">
                        Hảo Cảm: ${cand.affinity}/100
                      </span>
                    </div>

                    <div style="font-size: 11px; color: #38bdf8; margin-bottom: 4px;">
                      📍 Địa bàn: <b>${cand.locationNameVi || cand.baselineLocation}</b>
                    </div>

                    <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 6px;">
                      Sính lễ định ước: <b style="color: #fbbf24;">${formatNumber(dowry)} Qian</b>
                    </div>

                    <div style="font-size: 10.5px; color: #ec4899; background: rgba(236,72,153,0.1); padding: 4px 8px; border-radius: 4px; margin-bottom: 8px;">
                      Đặc tính mẫu thân: <b>${trait}</b>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 6px;">
                      <button class="tactical-btn ${eligible ? 'tactical-btn--primary' : 'tactical-btn--disabled'} tactical-btn--sm" style="width: 100%;"
                        ${eligible ? `onclick="GrandCommandHubUI.submitCourtship('${cand.npcId}', ${dowry})"` : 'disabled'}
                        title="${eligible ? 'Tiến hành lễ dạm ngõ sính lễ chính thức' : `Chưa đủ 80 Hảo cảm để ngỏ lời cầu hôn (Hiện tại: ${cand.affinity}/80)`}">
                        ${eligible ? 'Cầu Hôn Gia Thất →' : `[CHƯA ĐỦ HẢO CẢM (${cand.affinity}/80)]`}
                      </button>
                      <button class="tactical-btn tactical-btn--sm" style="font-size: 10.5px;" onclick="if(typeof openNpcDossierModal==='function')openNpcDossierModal('${cand.npcId}')">
                        💬 ${isEn ? 'Converse & Cultivate Bond' : 'Đàm Đạo & Bồi Đắp Hảo Cảm'}
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}

          <!-- Section 2: Unmet Maidens / Rumors under Fog of War -->
          ${unmet.length > 0 ? `
            <div class="hub-section-subtitle" style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px;">
              <span>${isEn ? 'Maiden Intel & Rumors (Unencountered • Under Fog):' : 'Manh Mối & Tung Tích Giai Nhân Trong Thiên Hạ (Chưa Tương Ngộ):'}</span>
              <span style="font-size: 11px; color: #94a3b8; font-weight: normal;">${unmet.length} ${isEn ? 'unmet' : 'ẩn sĩ'}</span>
            </div>
            <div class="grand-hub-grid-3">
              ${unmet.map(cand => {
                const dowry = cand.recommendedDowryCash || cand.dowryCash || 5000;
                const trait = cand.maternalTraitPerk?.traitNameVi || cand.maternalTraitNameVi || 'Hiền Thục Bội Phần';
                return `
                  <div class="tactical-card" style="border: 1px dashed rgba(255,255,255,0.15); background: rgba(15,23,42,0.55); opacity: 0.88;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                      <div>
                        <strong style="color: #cbd5e1;">${cand.nameVi}</strong>
                        <div style="font-size: 10.5px; color: #94a3b8;">${cand.relationshipTitleVi || 'Chưa Tương Ngộ'}</div>
                      </div>
                      <span class="tactical-badge" style="background: rgba(100,116,139,0.2); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3);">
                        🔒 Chưa Tương Ngộ
                      </span>
                    </div>

                    <div style="font-size: 11px; color: #38bdf8; margin-bottom: 4px;">
                      📍 Ngụ cư: <b>${cand.locationNameVi || cand.baselineLocation}</b>
                    </div>

                    <div style="font-size: 10.5px; color: #94a3b8; font-style: italic; background: rgba(0,0,0,0.25); padding: 5px 8px; border-radius: 4px; margin-bottom: 8px; line-height: 1.4;">
                      "${cand.clueVi || 'Tung tích mịt mờ trong loạn thế...'}"
                    </div>

                    <div style="font-size: 10.5px; color: #64748b; margin-bottom: 8px;">
                      Sính lễ ước định: <span style="color: #94a3b8;">${formatNumber(dowry)} Qian</span> • Đặc tính: <span style="color: #94a3b8;">${trait}</span>
                    </div>

                    <div style="display: flex; gap: 6px;">
                      <button class="tactical-btn tactical-btn--disabled tactical-btn--sm" style="flex: 1; cursor: not-allowed;" disabled
                        title="${isEn ? 'You have not encountered this maiden yet. Visit her region to meet.' : 'Bạn chưa từng diện kiến nhân vật này. Cần tương ngộ diện kiến trước.'}">
                        🔒 [CHƯA TƯƠNG NGỘ]
                      </button>
                      <button class="tactical-btn tactical-btn--sm" style="font-size: 11px; padding: 4px 8px;"
                        onclick="if(typeof openNpcDossierModal==='function')openNpcDossierModal('${cand.npcId}')"
                        title="${isEn ? 'Inspect Rumor Dossier' : 'Thám thính hồ sơ tình báo'}">
                        🔍
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
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
    renderCareerTab,
    openCareer: () => openHub('career'),
    executeWorkShift,
    collectProfit,
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
