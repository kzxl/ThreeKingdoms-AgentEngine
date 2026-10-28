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
    // Action Console & Tactical Decisions
    choiceHeader: 'QUYẾT SÁCH BỐI CẢNH',
    choiceSub: '4 Trụ Cột Chiến Lược',
    btnExecuteDirect: 'Thi Hành',
    btnExecuteAi: 'AI',
    btnInspectDossier: 'Hồ Sơ',
    btnCourierToggle: 'Phi Thư / Sứ Giả',
    courierDrawerTitle: 'Phi Thư & Sứ Giả Viễn Trình',
    courierDrawerDesc: 'Truyền đạt mật lệnh, điều phối nhân lực hoặc luân chuyển quân nhu tới các cứ điểm khác mà không cần rời vị trí hiện tại.',
    btnSelect: 'Thi Hành',
    btnAi: 'AI',
    btnOmniAi: 'Gửi AI Core',
    btnOmniInstant: 'Tức Thì',
    // Protagonist Card
    protagSubtitle: 'Thế Gia Thương Nhân • Trác Huyện',
    ageUnit: 'Tuổi',
    hpLabel: 'Sinh Lực',
    moraleLabel: 'Sĩ Khí',
    attrInt: 'Trí Lực',
    attrCom: 'Thương Nghiệp',
    attrDip: 'Ngoại Giao',
    attrLdr: 'Thống Soái',
    attrLog: 'Hậu Cần',
    attrPol: 'Chính Trị',
    attrCra: 'Khéo Léo',
    attrWar: 'Võ Lực',
    // Relations & Sentiment Network
    relationsTitle: 'Mạng Lưới Quan Hệ Hào Kiệt (RELATIONS.md)',
    relationsBadge: 'Tín Nhiệm / Hảo Cảm',
    relationsHint: 'Mức độ tín nhiệm & hảo cảm của các nhân sĩ trọng yếu đối với Lương Diễn (-100 đến +100).',
    completedTag: '(Đạt)',
    // Tabs
    tabInv: 'Kho Xưởng',
    tabNpc: 'Lương Nhân',
    tabLedger: 'Sổ Cái TXN',
    tabAiFeed: 'AI Feed',
    // Table
    thSku: 'Mã SKU',
    thDesc: 'Mô tả',
    thQty: 'Số Lượng',
    thPrice: 'Đơn giá',
    thAction: 'Thao tác',
    btnSell: 'Bán',
    btnBuy: 'Mua',
    btnReward: 'Thưởng 100 Tiền',
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
    worldMapTitle: 'Dư Đồ Tam Quốc • Chiến Tuyến Khởi Nghĩa Khăn Vàng (184 SCN)',
    worldMapSub: 'Khảo sát lộ trình hành quân, cự ly dịch trạm, an ninh và quân lương tiêu hao',
    lblDist: 'Cự Ly Hành Quân',
    lblDuration: 'Thời Gian Di Chuyển',
    lblGrainCost: 'Quân Lương Hao Phí',
    lblThreat: 'Tình Trạng An Ninh',
    lblIntel: 'Quân Tình & Bối Cảnh',
    lblFigures: 'Hào Kiệt & Quan Binh Hiện Diện',
    btnCurrentPos: 'Đang Ở Khu Vực Này',
    btnMarchTo: 'Khởi Hành Đến',
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
    deckCraAttr: 'Khéo Léo:',
    deckMorale: 'Sĩ khí:',
    deckLoyalty: 'Trung thành:',
    // Dossier Modal
    dossierTitle: 'HỒ SƠ CHIẾN LƯỢC HÀO KIỆT',
    dossierClose: 'Đóng Hồ Sơ',
    // Local NPC Quick Action & Character Creation
    btnLocalNpcPrefix: 'Giao Tiếp Hào Kiệt:',
    btnLocalNpcDefault: 'Giao Tiếp Hào Kiệt (Hồ Sơ & Hành Động)',
    gmSecScenarioTitle: '1. Chọn Niên Đại & Bối Cảnh Lịch Sử (Master Scenarios):',
    gmSecScenarioHint: '4 Niên Biểu Tam Quốc',
    gmSecArchetypeTitle: '2. Chọn Thân Phận Khởi Đầu (Player Archetypes):',
    gmSecArchetypeHint: 'Định hình năng lực & thế lực ban đầu',
    gmPreviewAttrsTitle: 'Bản Đồ Năng Lực 8 Trục (RPG Attributes):',
    gmPreviewAssetsTitle: 'Tài Sản & Đặc Quyền Khởi Điểm:',
    gmPreviewTalentsTitle: 'Thiên Phú Bẩm Sinh:',
    gmLabelPlayerName: 'Tên Nhân Vật:',
    gmLabelPlayerStyle: 'Biểu Tự:',
    gmAlertNote: 'Bảo đảm toàn vẹn: Khởi tạo màn chơi mới sẽ tái lập sổ sách theo chuẩn mực kế toán kép SQLite (Dr = Cr).',
    gmBtnStartGame: 'Khởi Lập Điển Tích Mới'
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
    // Action Console & Tactical Decisions
    choiceHeader: 'TACTICAL DECISIONS',
    choiceSub: '4 Strategic Pillars',
    btnExecuteDirect: 'Execute',
    btnExecuteAi: 'AI',
    btnInspectDossier: 'Dossier',
    btnCourierToggle: 'Courier / Envoy',
    courierDrawerTitle: 'Remote Courier & Dispatch',
    courierDrawerDesc: 'Dispatch confidential missives, order logistics, or mobilize retainers without leaving current base.',
    btnSelect: 'Execute',
    btnAi: 'AI',
    btnOmniAi: 'Send AI Core',
    btnOmniInstant: 'Instant',
    // Protagonist Card
    protagSubtitle: 'Merchant Gentry • Zhuo County',
    ageUnit: 'Y/O',
    hpLabel: 'Health',
    moraleLabel: 'Morale',
    attrInt: 'Intellect',
    attrCom: 'Commerce',
    attrDip: 'Diplomacy',
    attrLdr: 'Command',
    attrLog: 'Logistics',
    attrPol: 'Politics',
    attrCra: 'Craft',
    attrWar: 'Warfare',
    // Relations & Sentiment Network
    relationsTitle: 'Key NPC Relationships (RELATIONS.md)',
    relationsBadge: 'Sentiment Rating',
    relationsHint: 'Trust & sentiment ratings of prominent figures toward Liang Yan (-100 to +100).',
    completedTag: '(Achieved)',
    // Tabs
    tabInv: 'Warehouse',
    tabNpc: 'Retainers',
    tabLedger: 'TXN Ledger',
    tabAiFeed: 'AI Feed',
    // Table
    thSku: 'SKU Code',
    thDesc: 'Description',
    thQty: 'Quantity',
    thPrice: 'Unit Price',
    thAction: 'Actions',
    btnSell: 'Sell',
    btnBuy: 'Buy',
    btnReward: 'Reward 100 Qian',
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
    worldMapTitle: 'Three Kingdoms Cartography • Yellow Turban Frontlines (184 AD)',
    worldMapSub: 'Inspect march routes, relay station distances, threats, and grain provisions',
    lblDist: 'March Distance',
    lblDuration: 'March Duration',
    lblGrainCost: 'Grain & Provisions',
    lblThreat: 'Security & Threat',
    lblIntel: 'Strategic Intelligence',
    lblFigures: 'Key Figures Present',
    btnCurrentPos: 'Currently Located Here',
    btnMarchTo: 'March Expedition to',
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
    deckCraAttr: 'Craft:',
    deckMorale: 'Morale:',
    deckLoyalty: 'Loyalty:',
    // Dossier Modal
    dossierTitle: 'STRATEGIC NPC DOSSIER',
    dossierClose: 'Close Dossier',
    // Local NPC Quick Action & Character Creation
    btnLocalNpcPrefix: 'Converse with Hero:',
    btnLocalNpcDefault: 'Converse with Hero (Dossier & Actions)',
    gmSecScenarioTitle: '1. Select Historical Era & Scenario (Master Scenarios):',
    gmSecScenarioHint: '4 Three Kingdoms Epochs',
    gmSecArchetypeTitle: '2. Select Starting Archetype (Player Archetypes):',
    gmSecArchetypeHint: 'Defines abilities & initial realm presence',
    gmPreviewAttrsTitle: '8-Axis Capability Matrix (RPG Attributes):',
    gmPreviewAssetsTitle: 'Starting Assets & Perks:',
    gmPreviewTalentsTitle: 'Innate Talents:',
    gmLabelPlayerName: 'Character Name:',
    gmLabelPlayerStyle: 'Style Name:',
    gmAlertNote: 'Integrity Guaranteed: Starting a new game safely resets session tables while strictly preserving 100% SQLite double-entry ledger balance.',
    gmBtnStartGame: 'Launch Historical Campaign'
  }
};

function applyLanguage() {
  const dict = I18N_DICT[currentLang] || I18N_DICT.vi;

  // Header Title & Chips
  const titleEl = document.querySelector('.main-title');
  if (titleEl) titleEl.innerText = dict.appTitle;

  const btnMenu = document.getElementById('btn-main-menu');
  if (btnMenu) btnMenu.innerText = dict.mainMenu;

  const langLabel = document.getElementById('lang-label');
  if (langLabel) langLabel.innerText = dict.langToggle;

  const txtBridge = document.getElementById('txt-bridge-status');
  if (txtBridge) txtBridge.innerText = dict.bridgeLive;

  const btnLogs = document.getElementById('btn-toggle-logs');
  if (btnLogs) btnLogs.innerText = dict.logsBtn;

  // Tactical Command Bar & Choices Header
  const choicesLabel = document.getElementById('choices-label');
  if (choicesLabel) choicesLabel.innerText = dict.choiceHeader;

  const choicesSub = document.getElementById('choices-sub');
  if (choicesSub) choicesSub.innerText = dict.choiceSub;

  const btnCourierText = document.getElementById('txt-btn-courier');
  if (btnCourierText) btnCourierText.innerText = dict.btnCourierToggle;

  const courierTitle = document.getElementById('courier-drawer-title');
  if (courierTitle) courierTitle.innerText = dict.courierDrawerTitle;

  const courierDesc = document.getElementById('courier-drawer-desc');
  if (courierDesc) courierDesc.innerText = dict.courierDrawerDesc;

  const txtBtnNpc = document.getElementById('txt-btn-local-npc');
  if (txtBtnNpc) txtBtnNpc.innerText = dict.btnInspectDossier;

  const txtOmniAi = document.getElementById('txt-omni-ai');
  if (txtOmniAi) txtOmniAi.innerText = dict.btnOmniAi;

  const txtOmniInstant = document.getElementById('txt-omni-instant');
  if (txtOmniInstant) txtOmniInstant.innerText = dict.btnOmniInstant;

  // Protagonist Card
  const protagTitle = document.getElementById('protagonist-title');
  if (protagTitle) protagTitle.innerText = dict.protagSubtitle;

  const ageEl = document.getElementById('protagonist-age');
  if (ageEl && currentStatus?.player) ageEl.innerText = `${currentStatus.player.age || 21} ${dict.ageUnit}`;

  const attrNameInt = document.getElementById('attr-name-int');
  if (attrNameInt) attrNameInt.innerText = dict.attrInt;
  const attrNameCom = document.getElementById('attr-name-com');
  if (attrNameCom) attrNameCom.innerText = dict.attrCom;
  const attrNameDip = document.getElementById('attr-name-dip');
  if (attrNameDip) attrNameDip.innerText = dict.attrDip;
  const attrNameLdr = document.getElementById('attr-name-ldr');
  if (attrNameLdr) attrNameLdr.innerText = dict.attrLdr;
  const attrNameLog = document.getElementById('attr-name-log');
  if (attrNameLog) attrNameLog.innerText = dict.attrLog;
  const attrNamePol = document.getElementById('attr-name-pol');
  if (attrNamePol) attrNamePol.innerText = dict.attrPol;
  const attrNameCra = document.getElementById('attr-name-cra');
  if (attrNameCra) attrNameCra.innerText = dict.attrCra;
  const attrNameWar = document.getElementById('attr-name-war');
  if (attrNameWar) attrNameWar.innerText = dict.attrWar;

  const thQty = document.getElementById('th-qty');
  if (thQty) thQty.innerText = dict.thQty;

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

  // New Game Creation Section Labels
  const gmSecScn = document.getElementById('gm-sec-scenario-title');
  if (gmSecScn) gmSecScn.innerText = dict.gmSecScenarioTitle;
  const gmSecScnHint = document.getElementById('gm-sec-scenario-hint');
  if (gmSecScnHint) gmSecScnHint.innerText = dict.gmSecScenarioHint;

  const gmSecArch = document.getElementById('gm-sec-archetype-title');
  if (gmSecArch) gmSecArch.innerText = dict.gmSecArchetypeTitle;
  const gmSecArchHint = document.getElementById('gm-sec-archetype-hint');
  if (gmSecArchHint) gmSecArchHint.innerText = dict.gmSecArchetypeHint;

  const gmTitleAttrs = document.getElementById('gm-title-preview-attrs');
  if (gmTitleAttrs) gmTitleAttrs.innerText = dict.gmPreviewAttrsTitle;
  const gmTitleAssets = document.getElementById('gm-title-preview-assets');
  if (gmTitleAssets) gmTitleAssets.innerText = dict.gmPreviewAssetsTitle;
  const gmTitleTalents = document.getElementById('gm-title-preview-talents');
  if (gmTitleTalents) gmTitleTalents.innerText = dict.gmPreviewTalentsTitle;

  const gmLabelName = document.getElementById('gm-label-player-name');
  if (gmLabelName) gmLabelName.innerText = dict.gmLabelPlayerName;
  const gmLabelStyle = document.getElementById('gm-label-player-style');
  if (gmLabelStyle) gmLabelStyle.innerText = dict.gmLabelPlayerStyle;

  const gmAlert = document.getElementById('gm-newgame-alert');
  if (gmAlert) gmAlert.innerHTML = `<strong>${currentLang === 'en' ? 'Integrity Guaranteed:' : 'Bảo đảm toàn vẹn:'}</strong> ${dict.gmAlertNote}`;

  const gmBtnLaunch = document.getElementById('gm-btn-start-game');
  if (gmBtnLaunch) gmBtnLaunch.innerText = dict.gmBtnStartGame;

  // Local Hero Button in Locality Banner
  const btnLocalNpc = document.getElementById('txt-btn-local-npc');
  if (btnLocalNpc && typeof updateLocalNpcButtonLabel === 'function') {
    updateLocalNpcButtonLabel();
  }

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
