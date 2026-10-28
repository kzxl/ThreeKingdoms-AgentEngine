/**
 * ThreeKingdoms-AgentEngine: Bilingual i18n Dictionary & Manager (public/js/i18n.js)
 */

const I18N_DICT = {
  vi: {
    appTitle: 'TAM QUỐC CHÍ • LƯƠNG THỊ PHONG VÂN LỤC',
    mainMenu: 'Menu Chính',
    dateChip: 'Ngày 2 Tháng 5 Năm 184 SCN (Lượt 6)',
    cashLabel: 'Tiền Mặt:',
    grainLabel: 'Lương Thảo:',
    invLabel: 'Giá Trị Kho:',
    netWorthLabel: 'Tài Sản Ròng:',
    bridgeLive: 'AI Bridge: LIVE',
    auditPassed: '100% Khớp',
    logsBtn: 'Logs',
    langToggle: 'VI',
    // Action Console
    localityPresence: '📍 HIỆN DIỆN:',
    localityCourierHint: '✉️ <em>(Muốn điều phối nơi khác: Phái sứ giả / Phi thư tín)</em>',
    choiceHeader: 'QUYẾT SÁCH BỐI CẢNH (CHIẾN LƯỢC HÀNH TRÌNH):',
    choiceMode: 'Chế độ: <strong>Text-Based RPG + SimCore</strong>',
    btnSelect: '+ Chọn -',
    btnAi: 'AI',
    btnOmniAi: 'Gửi AI Core',
    btnOmniInstant: 'Tức Thì',
    // Protagonist Card
    protagSubtitle: 'Thế Gia Thương Nhân • Trác Huyện',
    ageUnit: 'Tuổi',
    hpLabel: '❤️ Sinh Lực',
    moraleLabel: '⚡ Sĩ Khí',
    attrInt: 'Trí',
    attrCom: 'Thương',
    attrDip: 'Ngoại',
    attrLdr: 'Soái',
    attrLog: 'Hậu',
    attrPol: 'Chính',
    attrCra: 'Khéo',
    attrWar: 'Võ',
    // Relations & Sentiment Network
    relationsTitle: 'Mạng Lưới Quan Hệ Hào Kiệt (RELATIONS.md)',
    relationsBadge: 'Tín Nhiệm / Hảo Cảm',
    relationsHint: 'Mức độ tín nhiệm & hảo cảm của các nhân sĩ trọng yếu đối với Lương Diễn (-100 đến +100).',
    completedTag: '(Đạt)',
    // Tabs
    tabInv: '📦 Kho Xưởng',
    tabNpc: '👥 Lương Nhân',
    tabLedger: '📜 Sổ Cái TXN',
    tabAiFeed: '🤖 AI Feed',
    // Table
    thSku: 'Mã SKU',
    thDesc: 'Mô tả',
    thQty: 'SL',
    thPrice: 'Đơn giá',
    thAction: 'Thao tác',
    btnSell: 'Bán',
    btnBuy: 'Mua',
    btnReward: '🎁 Thưởng 100 Tiền',
    // Modal
    modalTradeTitle: 'Giao Dịch Vật Phẩm',
    modalSkuLabel: 'Mã Mặt Hàng (SKU Code)',
    modalQtyLabel: 'Số Lượng Giao Dịch',
    modalPriceLabel: 'Đơn Giá (Qian / Đơn vị)',
    modalPartnerLabel: 'Đối Tác Giao Dịch (Counterparty)',
    modalTotalLabel: 'Tổng Giá Trị Giao Dịch:',
    btnCancel: 'Hủy Bỏ',
    btnConfirm: 'Xác Nhận Thực Thi',
    // Location & World Map
    btnWorldMap: 'Dư Đồ Tam Quốc',
    btnClearChat: 'Làm Mới Chat',
    worldMapTitle: '🗺️ Dư Đồ Tam Quốc • Chiến Tuyến Khởi Nghĩa Khăn Vàng (184 SCN)',
    worldMapSub: 'Khảo sát lộ trình hành quân, cự ly dịch trạm, an ninh và quân lương tiêu hao',
    lblDist: 'Cự Ly Hành Quân',
    lblDuration: 'Thời Gian Di Chuyển',
    lblGrainCost: 'Quân Lương Hao Phí',
    lblThreat: 'Tình Trạng An Ninh',
    lblIntel: 'Quân Tình & Bối Cảnh',
    lblFigures: 'Hào Kiệt & Quan Binh Hiện Diện',
    btnCurrentPos: '📍 Đang Ở Khu Vực Này',
    btnMarchTo: '🏇 Khởi Hành Hành Quân Đến',
    legendCurrent: 'Vị trí hiện tại',
    legendBattle: 'Chiến trường giao tranh',
    legendSafe: 'Trọng trấn an định',
    btnCloseMap: 'Đóng Dư Đồ',
    // Game Manager
    gmTitle: 'Tổng Hành Dinh & Quản Lý Chiến Dịch',
    gmSub: 'Tách biệt Master Blueprint (Bất biến) và Gameplay Session (Biến động)',
    gmTabContinue: 'Chiến Cục Hiện Tại',
    gmTabNew: 'Khởi Lập Điển Tích',
    gmTabChronicles: 'Biên Niên Sử',
    gmTabNpcLife: 'Vận Mệnh Quần Hùng',
    gmTabFactions: 'Chính Trị & Quân Doanh',
    gmTabProfessions: 'Bách Nghệ & Khai Khoáng',
    gmTabEcology: 'Thiên Tai & Vận Tải',
    // Deck Labels & Empty States
    deckEmptyInv: 'Kho hàng trống',
    deckEmptyNpc: 'Chưa có gia nhân trực thuộc',
    deckEmptyLedger: 'Chưa có giao dịch sổ cái',
    deckEmptyLogs: 'Chưa có dữ liệu mô phỏng từ Agent',
    deckPostBal: 'Số dư sau TXN:',
    deckPersonality: 'Tính cách:',
    deckCraAttr: 'Khéo:',
    deckMorale: 'Sĩ khí:',
    deckLoyalty: 'Trung thành:',
    // Dossier Modal
    dossierTitle: 'HỒ SƠ CHIẾN LƯỢC HÀO KIỆT',
    dossierClose: 'Đóng Hồ Sơ'
  },
  en: {
    appTitle: 'THREE KINGDOMS • LIANG CHRONICLES',
    mainMenu: 'Main Menu',
    dateChip: 'May 2, 184 AD (Turn 6)',
    cashLabel: 'Cash:',
    grainLabel: 'Grain:',
    invLabel: 'Warehouse:',
    netWorthLabel: 'Net Worth:',
    bridgeLive: 'AI Bridge: LIVE',
    auditPassed: '100% Match',
    logsBtn: 'Logs',
    langToggle: 'EN',
    // Action Console
    localityPresence: '📍 PRESENCE:',
    localityCourierHint: '✉️ <em>(To direct elsewhere: Dispatch courier / Send letter)</em>',
    choiceHeader: 'CONTEXTUAL STRATEGY DECISIONS:',
    choiceMode: 'Mode: <strong>Text-Based RPG + SimCore</strong>',
    btnSelect: '+ Select -',
    btnAi: 'AI',
    btnOmniAi: 'Send AI Core',
    btnOmniInstant: 'Instant',
    // Protagonist Card
    protagSubtitle: 'Merchant Gentry • Zhuo County',
    ageUnit: 'Y/O',
    hpLabel: '❤️ Health',
    moraleLabel: '⚡ Morale',
    attrInt: 'INT',
    attrCom: 'COM',
    attrDip: 'DIP',
    attrLdr: 'LDR',
    attrLog: 'LOG',
    attrPol: 'POL',
    attrCra: 'CRA',
    attrWar: 'WAR',
    // Relations & Sentiment Network
    relationsTitle: 'Key NPC Relationships (RELATIONS.md)',
    relationsBadge: 'Sentiment Rating',
    relationsHint: 'Trust & sentiment ratings of prominent figures toward Liang Yan (-100 to +100).',
    completedTag: '(Achieved)',
    // Tabs
    tabInv: '📦 Warehouse',
    tabNpc: '👥 Retainers',
    tabLedger: '📜 TXN Ledger',
    tabAiFeed: '🤖 AI Feed',
    // Table
    thSku: 'SKU Code',
    thDesc: 'Description',
    thQty: 'Qty',
    thPrice: 'Unit Price',
    thAction: 'Actions',
    btnSell: 'Sell',
    btnBuy: 'Buy',
    btnReward: '🎁 Reward 100 Qian',
    // Modal
    modalTradeTitle: 'Trade Commodities',
    modalSkuLabel: 'Item Code (SKU)',
    modalQtyLabel: 'Trade Quantity',
    modalPriceLabel: 'Unit Price (Qian / Unit)',
    modalPartnerLabel: 'Counterparty',
    modalTotalLabel: 'Total Transaction Value:',
    btnCancel: 'Cancel',
    btnConfirm: 'Confirm Execution',
    // Location & World Map
    btnWorldMap: 'Three Kingdoms Map',
    btnClearChat: 'Clear Chat',
    worldMapTitle: '🗺️ Three Kingdoms Cartography • Yellow Turban Frontlines (184 AD)',
    worldMapSub: 'Inspect march routes, relay station distances, threats, and grain provisions',
    lblDist: 'March Distance',
    lblDuration: 'March Duration',
    lblGrainCost: 'Grain & Provisions',
    lblThreat: 'Security & Threat',
    lblIntel: 'Strategic Intelligence',
    lblFigures: 'Key Figures Present',
    btnCurrentPos: '📍 Currently Located Here',
    btnMarchTo: '🏇 March Expedition to',
    legendCurrent: 'Current Location',
    legendBattle: 'Active Battlefield',
    legendSafe: 'Secured Stronghold',
    btnCloseMap: 'Close Map',
    // Game Manager
    gmTitle: 'Grand Headquarters & Campaign Management',
    gmSub: 'Decoupled Master Blueprint (Immutable) and Gameplay Session (Dynamic)',
    gmTabContinue: 'Current Campaign',
    gmTabNew: 'New Legend',
    gmTabChronicles: 'Chronicles',
    gmTabNpcLife: 'NPC Fate & Life',
    gmTabFactions: 'Politics & Camps',
    gmTabProfessions: 'Professions & Crafting',
    gmTabEcology: 'Crises & Logistics',
    // Deck Labels & Empty States
    deckEmptyInv: 'Empty warehouse',
    deckEmptyNpc: 'No assigned retainers',
    deckEmptyLedger: 'No ledger transactions recorded',
    deckEmptyLogs: 'No agent simulation logs recorded',
    deckPostBal: 'Post-TXN Balance:',
    deckPersonality: 'Personality:',
    deckCraAttr: 'CRA:',
    deckMorale: 'Morale:',
    deckLoyalty: 'Loyalty:',
    // Dossier Modal
    dossierTitle: 'STRATEGIC NPC DOSSIER',
    dossierClose: 'Close Dossier'
  }
};

function applyLanguage() {
  const dict = I18N_DICT[currentLang] || I18N_DICT.vi;

  // Header Title & Chips
  const titleEl = document.querySelector('.main-title');
  if (titleEl) titleEl.innerText = dict.appTitle;

  const btnMenu = document.getElementById('btn-main-menu');
  if (btnMenu) btnMenu.innerHTML = `<span class="icon">🏛️</span> ${dict.mainMenu}`;

  const langLabel = document.getElementById('lang-label');
  if (langLabel) langLabel.innerText = dict.langToggle;

  const txtBridge = document.getElementById('txt-bridge-status');
  if (txtBridge) txtBridge.innerText = dict.bridgeLive;

  const btnLogs = document.getElementById('btn-toggle-logs');
  if (btnLogs) btnLogs.innerText = dict.logsBtn;

  // Locality Banner
  const locTag = document.getElementById('locality-tag');
  if (locTag) locTag.innerText = dict.localityPresence;

  const locHint = document.getElementById('locality-courier-hint');
  if (locHint) locHint.innerHTML = dict.localityCourierHint;

  // Choices Header & Omni Buttons
  const choicesLabel = document.getElementById('choices-label');
  if (choicesLabel) choicesLabel.innerText = dict.choiceHeader;

  const choicesSub = document.getElementById('choices-sub');
  if (choicesSub) choicesSub.innerHTML = `${dict.choiceMode}`;

  const txtOmniAi = document.getElementById('txt-omni-ai');
  if (txtOmniAi) txtOmniAi.innerText = dict.btnOmniAi;

  const txtOmniInstant = document.getElementById('txt-omni-instant');
  if (txtOmniInstant) txtOmniInstant.innerText = dict.btnOmniInstant;

  // Protagonist Card
  const protagTitle = document.getElementById('protagonist-title');
  if (protagTitle) protagTitle.innerText = dict.protagSubtitle;

  const ageEl = document.getElementById('protagonist-age');
  if (ageEl && currentStatus?.player) ageEl.innerText = `${currentStatus.player.age || 21} ${dict.ageUnit}`;

  // Relations & Sentiment Network Card
  const relTitle = document.getElementById('relations-card-title');
  if (relTitle) relTitle.innerText = dict.relationsTitle;

  const relBadge = document.getElementById('relations-card-badge');
  if (relBadge) relBadge.innerText = dict.relationsBadge;

  const relHint = document.getElementById('relations-card-hint');
  if (relHint) relHint.innerText = dict.relationsHint;

  if (typeof renderRelations === 'function' && window.currentScene?.relations) {
    renderRelations(window.currentScene.relations);
  }

  // Tabs Header
  document.querySelectorAll('.deck-tab-btn').forEach(btn => {
    const tabId = btn.getAttribute('data-subtab');
    if (tabId === 'subtab-inventory') btn.innerText = dict.tabInv;
    if (tabId === 'subtab-npcs') btn.innerText = dict.tabNpc;
    if (tabId === 'subtab-ledger') btn.innerText = dict.tabLedger;
    if (tabId === 'subtab-agent-log') btn.innerText = dict.tabAiFeed;
  });

  // World Map Button & Modal
  const btnWorldMap = document.getElementById('txt-btn-worldmap');
  if (btnWorldMap) btnWorldMap.innerText = dict.btnWorldMap;

  const btnClearChat = document.getElementById('txt-btn-clear-chat');
  if (btnClearChat) btnClearChat.innerText = dict.btnClearChat;

  const mapTitle = document.getElementById('world-map-title');
  if (mapTitle) mapTitle.innerText = dict.worldMapTitle;

  const mapSub = document.getElementById('world-map-sub');
  if (mapSub) mapSub.innerText = dict.worldMapSub;

  const mapLegend = document.getElementById('world-map-legend');
  if (mapLegend) {
    mapLegend.innerHTML = `
      <span><span class="legend-dot current"></span> ${dict.legendCurrent}</span>
      <span><span class="legend-dot battle"></span> ${dict.legendBattle}</span>
      <span><span class="legend-dot safe"></span> ${dict.legendSafe}</span>
    `;
  }

  const btnCloseMap = document.querySelector('#world-map-modal .modal-footer .btn-outline');
  if (btnCloseMap) btnCloseMap.innerText = dict.btnCloseMap;

  // Re-render Dynamic Chips & Local POI Navigation if available
  if (typeof renderDynamicQuickChips === 'function') {
    renderDynamicQuickChips(activeSubLocation);
  }
  if (typeof renderLocalPoiNav === 'function') {
    renderLocalPoiNav(activeSubLocation);
  }

  // If World Map modal is open, re-render SVG & Intel
  const mapModal = document.getElementById('world-map-modal');
  if (mapModal && !mapModal.classList.contains('hidden')) {
    if (typeof renderWorldMapSvg === 'function') renderWorldMapSvg();
    if (typeof renderWorldMapIntel === 'function') renderWorldMapIntel(selectedMapNodeId);
  }

  // If scene is loaded, re-render choices
  if (currentScene && currentScene.options && typeof renderChoices === 'function') {
    renderChoices(currentScene.options);
  }

  // Game Manager Modal Headers & Tabs
  const gmTitle = document.querySelector('#game-manager-modal .modal-title');
  if (gmTitle) gmTitle.innerText = dict.gmTitle;
  const gmSub = document.querySelector('#game-manager-modal .gm-header-sub');
  if (gmSub) gmSub.innerText = dict.gmSub;

  const tabContinue = document.getElementById('gm-tab-continue');
  if (tabContinue) tabContinue.innerText = dict.gmTabContinue;
  const tabNew = document.getElementById('gm-tab-new');
  if (tabNew) tabNew.innerText = dict.gmTabNew;
  const tabChronicles = document.getElementById('gm-tab-chronicles');
  if (tabChronicles) tabChronicles.innerText = dict.gmTabChronicles;
  const tabNpcLife = document.getElementById('gm-tab-npc-life');
  if (tabNpcLife) tabNpcLife.innerText = dict.gmTabNpcLife;
  const tabFactions = document.getElementById('gm-tab-factions');
  if (tabFactions) tabFactions.innerText = dict.gmTabFactions;
  const tabProfessions = document.getElementById('gm-tab-professions');
  if (tabProfessions) tabProfessions.innerText = dict.gmTabProfessions;
  const tabEcology = document.getElementById('gm-tab-ecology');
  if (tabEcology) tabEcology.innerText = dict.gmTabEcology;

  // Re-render open NPC Dossier if visible
  if (typeof renderCurrentNpcDossier === 'function') {
    renderCurrentNpcDossier();
  }

  // Refresh active decks with new dictionary labels
  if (typeof loadDeckInventory === 'function') loadDeckInventory();
  if (typeof loadDeckNpcs === 'function') loadDeckNpcs();
  if (typeof loadDeckLedger === 'function') loadDeckLedger();
  if (typeof loadDeckAgentLogs === 'function') loadDeckAgentLogs();
}

function toggleLanguage() {
  currentLang = currentLang === 'vi' ? 'en' : 'vi';
  localStorage.setItem('sim_lang', currentLang);
  applyLanguage();
  if (typeof showToast === 'function') {
    showToast(currentLang === 'vi' ? 'Đã chuyển sang Tiếng Việt' : 'Switched to English');
  }
}

// Global exports
window.I18N_DICT = I18N_DICT;
window.applyLanguage = applyLanguage;
window.toggleLanguage = toggleLanguage;
