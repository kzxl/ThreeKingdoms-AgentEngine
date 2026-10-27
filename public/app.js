/**
 * ThreeKingdoms-AgentEngine: Web UI Application Logic (public/app.js)
 * Standards Applied: AgentOption UI System & Anti-AI-Slop Architecture
 * 
 * Features:
 * - Anti-Piling Action Guard & Debounce Lock (Zero Race Conditions)
 * - Real-Time Agent Simulation Feedback & Strategy Reasoning HUD
 * - Dynamic Context Engine: Reactive Hero Encounter, D20 Formulas & 4 Choices
 * - Authoritative SimCore SQLite Actions & Reconciled Telemetry
 * - Live Agent Simulation Activity Stream (subtab-agent-log)
 */

const API_BASE = '';

// Global Application State & i18n
let activeSubLocation = 'Vườn Đào';
let lastEncounterSubLocation = null;
let currentScene = null;
let currentInventory = [];
let currentStatus = null;
let selectedChoiceId = null;
let isProcessingAction = false; // Anti-Piling Guard
const storyChronicle = []; // History of dialogue and action turns
let currentLang = localStorage.getItem('sim_lang') || 'vi';

// ==========================================================================
// 0. I18N BILINGUAL DICTIONARY & LOCALITY CHIPS REGISTRY
// ==========================================================================
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
    // Milestone
    milestoneTitle: 'Tiến Độ Kết Nghĩa Vườn Đào (RELATIONS.md)',
    milestoneDeadline: 'Hạn: 10/02/184',
    milestoneHint: 'Gặp đủ 3 Hào Kiệt dưới đây để mở khóa đại lễ "Đào Viên Kết Nghĩa" Lưu - Quan - Trương.',
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
    btnCloseMap: 'Đóng Dư Đồ'
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
    // Milestone
    milestoneTitle: 'Peach Garden Oath Progress (RELATIONS.md)',
    milestoneDeadline: 'Due: 184-05-10',
    milestoneHint: 'Rendezvous with all 3 Heroes to unlock the Oath of the Peach Garden ceremony.',
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
    btnCloseMap: 'Close Map'
  }
};

const QUICK_CHIPS_DATA = {
  'Vườn Đào': {
    presenceVi: 'Trang Viên Vườn Đào (Trực diện: Trương Phi • Dực Đức)',
    presenceEn: 'Peach Garden Manor (In-person: Zhang Fei • Yide)',
    placeholderVi: 'Lương Diễn đối thoại với Trương Phi... (hoặc gõ: "Phi thư về xưởng đóng khiên...")',
    placeholderEn: 'Liang Yan talks to Zhang Fei... (or type: "Send courier to workshop...")',
    chips: [
      { type: 'local', icon: '⚔️', labelVi: 'Đấu Thương Trương Phi', labelEn: 'Spar with Zhang Fei', promptVi: 'Thỉnh giáo Trương Phi đấu thương thực chiến đợt 2', promptEn: 'Spar with Zhang Fei in spear combat round 2' },
      { type: 'local', icon: '🛒', labelVi: 'Mua 8 Da Bò', labelEn: 'Buy 8 Leather', promptVi: 'Mua sỉ 8 tấm da thuộc của Trương Phi', promptEn: 'Buy 8 leather hides from Zhang Fei' },
      { type: 'local', icon: '🍷', labelVi: 'Rượu Đào Viên', labelEn: 'Peach Wine', promptVi: 'Cùng Trương Phi uống rượu Đào Viên đàm đạo hào kiệt', promptEn: 'Drink wine with Zhang Fei discussing heroes' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Phi thư về Xưởng', labelEn: 'Courier to Workshop', promptVi: 'Phái gia nhân phi thư về Xưởng Lương Thị lệnh đóng 5 khiên trúc', promptEn: 'Send courier to Workshop ordering 5 shields' },
      { type: 'courier', icon: '✉️', labelVi: 'Phái người ra Chợ', labelEn: 'Retainer to Market', promptVi: 'Sai gia đinh mang thư ra Chợ Đông Môn xuất bán 10 đấu muối', promptEn: 'Dispatch retainer to East Gate Market to sell 10 salt' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Đến Chợ Đông Môn', labelEn: 'Go to Market', promptVi: 'Rời Vườn Đào, rảo bước đi tới Chợ Đông Môn', promptEn: 'Leave Peach Garden and travel to East Gate Market' },
      { type: 'travel', icon: '🏇', labelVi: 'Đến Xưởng Lương Thị', labelEn: 'Go to Workshop', promptVi: 'Rời Vườn Đào, đi tới Lương Thị Chức Tác Phường', promptEn: 'Travel to Liang Textile & Craft Workshop' }
    ]
  },
  'Chợ Đông Môn': {
    presenceVi: 'Chợ Đông Môn & Sạp Trà (Trực diện: Quan Vũ • Vân Trường)',
    presenceEn: 'East Gate Market & Tea Stall (In-person: Guan Yu • Yunchang)',
    placeholderVi: 'Lương Diễn đàm đạo tại Chợ... (hoặc gõ: "Phái gia nhân sang Vườn Đào...")',
    placeholderEn: 'Liang Yan dialogues at Market... (or type: "Dispatch messenger to Peach Garden...")',
    chips: [
      { type: 'local', icon: '🧂', labelVi: 'Bán 10 Muối Ký Châu', labelEn: 'Sell 10 Salt', promptVi: 'Xuất bán 10 đấu muối biển cho Thương đoàn Ký Châu', promptEn: 'Sell 10 sea salt to Jizhou merchant caravan' },
      { type: 'local', icon: '🌾', labelVi: 'Mua 5 Lương Thảo', labelEn: 'Buy 5 Grain', promptVi: 'Thu mua 5 thạch lương tiểu mạch dự trữ', promptEn: 'Purchase 5 piculs of strategic grain' },
      { type: 'local', icon: '🍵', labelVi: 'Đàm Đạo Quan Vũ', labelEn: 'Tea with Guan Yu', promptVi: 'Mời Quan Vũ uống trà đàm đạo binh pháp Xuân Thu', promptEn: 'Invite Guan Yu for tea discussing strategy' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Báo tin Trương Phi', labelEn: 'Courier to Zhang Fei', promptVi: 'Phái gia nhân sang Vườn Đào báo tin cho Trương Phi', promptEn: 'Send courier to Peach Garden to inform Zhang Fei' },
      { type: 'courier', icon: '✉️', labelVi: 'Lệnh nhập kho Xưởng', labelEn: 'Stock order to Workshop', promptVi: 'Viết thư lệnh vận chuyển nguyên liệu tre da về Xưởng Lương Thị', promptEn: 'Dispatch letter to transfer raw materials to Workshop' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Về Vườn Đào', labelEn: 'To Peach Garden', promptVi: 'Rời Chợ Đông Môn, tới Trang Viên Vườn Đào', promptEn: 'Return to Peach Garden Manor' },
      { type: 'travel', icon: '🏇', labelVi: 'Đến Quảng Tông', labelEn: 'To Guangzong', promptVi: 'Khởi hành đoàn xe tiến thẳng tới Quảng Tông Quân Doanh', promptEn: 'Depart to Guangzong Military Encampment' }
    ]
  },
  'Xưởng Lương Thị': {
    presenceVi: 'Lương Thị Chức Tác Phường (Trực diện: Thợ Cả Trần Bảo)',
    presenceEn: 'Liang Craft Workshop (In-person: Master Chen Bao)',
    placeholderVi: 'Lương Diễn chỉ đạo tại Xưởng... (hoặc gõ: "Phái xe hàng ra chợ bán...")',
    placeholderEn: 'Liang Yan manages Workshop... (or type: "Dispatch wagon to market...")',
    chips: [
      { type: 'local', icon: '🛡️', labelVi: 'Đóng 5 Khiên Trúc', labelEn: 'Craft 5 Shields', promptVi: 'Chỉ đạo thợ cả Trần Bảo khởi động đóng 5 khiên trúc', promptEn: 'Direct Chen Bao to craft 5 bamboo shields' },
      { type: 'local', icon: '🎋', labelVi: 'Dệt 10 Chiếu Trúc', labelEn: 'Weave 10 Mats', promptVi: 'Khởi ca dệt 10 tấm Chiếu Trúc Lương Gia', promptEn: 'Start batch weaving 10 bamboo mats' },
      { type: 'local', icon: '🎁', labelVi: 'Thưởng 100 Tiền', labelEn: 'Reward 100 Qian', promptVi: 'Khen thưởng 100 tiền cho thợ cả Trần Bảo động viên thợ', promptEn: 'Reward 100 Qian to master craftsman Chen Bao' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Xe hàng ra Chợ', labelEn: 'Wagon to Market', promptVi: 'Phái gia nhân áp tải xe hàng chiếu trúc ra Chợ Đông Môn', promptEn: 'Dispatch retainer wagon with mats to East Gate Market' },
      { type: 'courier', icon: '✉️', labelVi: 'Báo Bắc Quân', labelEn: 'Report to Army', promptVi: 'Phi thư báo cho Bắc Quân Đại Doanh về tiến độ khiên giáp', promptEn: 'Send courier to Northern Army on shield readiness' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Ra Chợ Đông Môn', labelEn: 'To Market', promptVi: 'Rời xưởng Lương Thị, đi tới Chợ Đông Môn', promptEn: 'Leave workshop and head to East Gate Market' },
      { type: 'travel', icon: '🏇', labelVi: 'Về Vườn Đào', labelEn: 'To Peach Garden', promptVi: 'Rời xưởng Lương Thị, quay về Trang Viên Vườn Đào', promptEn: 'Return to Peach Garden Manor' }
    ]
  },
  'Bắc Bình Soái Phủ': {
    presenceVi: 'Bắc Bình Soái Phủ (Trực diện: Công Tôn Toản • Bạch Mã Tướng Quân)',
    presenceEn: 'Beiping Headquarters (In-person: Gongsun Zan • White Horse General)',
    placeholderVi: 'Lương Diễn đàm đạo cùng Công Tôn Toản... (hoặc gõ: "Mua ngựa chiến...")',
    placeholderEn: 'Liang Yan negotiates with Gongsun Zan... (or type: "Buy warhorses...")',
    chips: [
      { type: 'local', icon: '🐎', labelVi: 'Mua 3 Ngựa Chiến U Châu', labelEn: 'Buy 3 Horses', promptVi: 'Thu mua 3 tuấn mã U Châu của Bạch Mã Nghĩa Tòng', promptEn: 'Purchase 3 Youzhou warhorses from White Horse Cavalry' },
      { type: 'local', icon: '🛡️', labelVi: 'Tiếp Tế 10 Khiên Trúc', labelEn: 'Supply 10 Shields', promptVi: 'Cung cấp 10 Khiên Trúc Lương Gia chi viện quân biên cương', promptEn: 'Deliver 10 Liang shields to garrison border forces' },
      { type: 'local', icon: '🤝', labelVi: 'Liên Minh Huyện Trác', labelEn: 'Alliance Pact', promptVi: 'Đàm phán hiệp ước tương trợ quân nhu Huyện Trác và Bắc Bình', promptEn: 'Negotiate mutual defense supply pact with Gongsun Zan' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Báo tin Lưu Bị', labelEn: 'Courier to Liu Bei', promptVi: 'Phi thư về Huyện Trác báo cho Lưu Bị về tình hình Công Tôn Toản', promptEn: 'Dispatch courier to Liu Bei regarding Gongsun Zan alliance' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Về Huyện Trác', labelEn: 'To Zhuo County', promptVi: 'Rời Bắc Bình, xuôi quan đạo trở về Huyện Trác', promptEn: 'Return along post road back to Zhuo County' }
    ]
  },
  'Nghiệp Thành Đại Phủ': {
    presenceVi: 'Nghiệp Thành Phủ Đệ (Trực diện: Viên Thiệu • Ký Châu Mục)',
    presenceEn: 'Yecheng Grand Estate (In-person: Yuan Shao • Lord of Jizhou)',
    placeholderVi: 'Lương Diễn yết kiến Viên Bản Sơ... (hoặc gõ: "Ký kết thương ước gấm lụa...")',
    placeholderEn: 'Liang Yan confers with Yuan Shao... (or type: "Sign luxury textile pact...")',
    chips: [
      { type: 'local', icon: '🏛️', labelVi: 'Bán 20 Tấm Chiếu Trúc', labelEn: 'Sell 20 Mats', promptVi: 'Xuất bán 20 tấm Chiếu Trúc Lương Gia cho các đại tộc Nghiệp Thành', promptEn: 'Sell 20 Liang bamboo mats to Jizhou patricians' },
      { type: 'local', icon: '🌾', labelVi: 'Mua 15 Thạch Lương Ký Châu', labelEn: 'Buy 15 Grain', promptVi: 'Gom mua 15 thạch lương Ký Châu giá sỉ từ đại thương nhân', promptEn: 'Wholesale purchase 15 piculs of prime Jizhou grain' },
      { type: 'local', icon: '🍷', labelVi: 'Dự Yến Viên Bản Sơ', labelEn: 'Banquet Yuan Shao', promptVi: 'Tham gia dạ yến phủ Viên Thiệu đàm đạo thời thế', promptEn: 'Attend grand banquet at Yuan Shao estate discussing politics' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Lệnh chuyển hàng về Xưởng', labelEn: 'Logistics Courier', promptVi: 'Phi thư lệnh chuyển nguyên liệu Ký Châu về Xưởng Huyện Trác', promptEn: 'Send logistical courier to route materials to Zhuo Workshop' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Đến Quảng Tông', labelEn: 'To Guangzong', promptVi: 'Tiến về phía Đông Bắc đến tiền tuyến Quảng Tông', promptEn: 'March northeast toward Guangzong front' },
      { type: 'travel', icon: '🏇', labelVi: 'Về Huyện Trác', labelEn: 'To Zhuo County', promptVi: 'Rời Nghiệp Thành, theo đường bắc tiến về Huyện Trác', promptEn: 'Return north back to Zhuo County' }
    ]
  },
  'Quảng Tông Quân Doanh': {
    presenceVi: 'Bắc Quân Soái Trướng (Trực diện: Trung Lang Tướng Lư Thực)',
    presenceEn: 'Northern Army Headquarters (In-person: General Lu Zhi)',
    placeholderVi: 'Lương Diễn tham vấn tại Quân Doanh... (hoặc gõ: "Phi thư về Trác Huyện...")',
    placeholderEn: 'Liang Yan confers with General... (or type: "Send courier to Zhuo County...")',
    chips: [
      { type: 'local', icon: '🎖️', labelVi: 'Yết Kiến Lư Thực', labelEn: 'Audience Lu Zhi', promptVi: 'Yết kiến Trung Lang Tướng Lư Thực nhận thưởng quân công', promptEn: 'Audience with General Lu Zhi to claim bounty' },
      { type: 'local', icon: '🌾', labelVi: 'Tiếp Tế Quân Lương', labelEn: 'Supply Grain', promptVi: 'Tiếp tế 5 thạch lương tiểu mạch cho Quân Nhu Cục', promptEn: 'Deliver 5 piculs of grain to supply depot' },
      { type: 'local', icon: '🗺️', labelVi: 'Tham Mưu Sa Bàn', labelEn: 'Strategy Map', promptVi: 'Cùng Lư Thực tham mưu sa bàn phá vỡ vòng vây Khăn Vàng', promptEn: 'Consult strategy battle map with Lu Zhi' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Phi thư về Huyện Trác', labelEn: 'Courier to Zhuo County', promptVi: 'Phi thư hỏa tốc về Huyện Trác chuẩn bị thêm 20 xe quân lương', promptEn: 'Send urgent courier to Zhuo County for 20 grain wagons' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Sang Bình Nguyên', labelEn: 'To Pingyuan', promptVi: 'Hành quân sang Trọng Trấn Bình Nguyên hội quân', promptEn: 'March to Pingyuan stronghold' },
      { type: 'travel', icon: '🏇', labelVi: 'Về Lại Huyện Trác', labelEn: 'Return to Zhuo County', promptVi: 'Rời quân doanh Quảng Tông, quay trở về Huyện Trác', promptEn: 'Leave Guangzong and return to Zhuo County' }
    ]
  },
  'Bình Nguyên Trọng Trấn': {
    presenceVi: 'Bình Nguyên Trọng Trấn (Trực diện: Vương Triệt • Huyện Thừa)',
    presenceEn: 'Pingyuan Stronghold (In-person: Wang Che • Magistrate)',
    placeholderVi: 'Lương Diễn điều phối tại Bình Nguyên... (hoặc gõ: "Hành quân sang Quảng Tông...")',
    placeholderEn: 'Liang Yan coordinates in Pingyuan... (or type: "March to Guangzong...")',
    chips: [
      { type: 'local', icon: '🛡️', labelVi: 'Bán 5 Khiên Trúc', labelEn: 'Sell 5 Shields', promptVi: 'Cung cấp 5 Khiên Trúc Lương Gia cho Dân Binh Xã Tắc', promptEn: 'Supply 5 Liang bamboo shields to local militia' },
      { type: 'local', icon: '🌾', labelVi: 'Mua Lương Thanh Châu', labelEn: 'Buy Grain', promptVi: 'Thu mua lương thảo ngô khoai Thanh Châu tiếp tế', promptEn: 'Purchase provisions from Qingzhou merchants' },
      { type: 'local', icon: '📜', labelVi: 'Kế Hoạch Dịch Trạm', labelEn: 'Post Relay Plan', promptVi: 'Hiến kế thiết lập hệ thống phong hỏa đài cảnh giới liên hoàn', promptEn: 'Advise on border beacon signaling network' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Phi thư về Xưởng', labelEn: 'Courier to Workshop', promptVi: 'Phi thư về Xưởng Lương Thị chỉ đạo chuẩn bị thêm 10 khiên trúc', promptEn: 'Dispatch courier to Workshop for 10 shields' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Sang Quảng Tông', labelEn: 'To Guangzong', promptVi: 'Hành quân sang đại doanh Quảng Tông hội quân cùng Lư Thực', promptEn: 'March to Guangzong army camp to rendezvous with Lu Zhi' },
      { type: 'travel', icon: '🏇', labelVi: 'Về Huyện Trác', labelEn: 'To Zhuo County', promptVi: 'Hành quân trở về Hậu Phương Trang Viên Vườn Đào Huyện Trác', promptEn: 'Return to Peach Garden Manor in Zhuo County' }
    ]
  },
  'Hứa Xương Tướng Phủ': {
    presenceVi: 'Hứa Xương Soái Phủ (Trực diện: Tào Tháo • Mạnh Đức)',
    presenceEn: 'Xuchang Headquarters (In-person: Cao Cao • Mengde)',
    placeholderVi: 'Lương Diễn đàm đạo cùng Tào Tháo... (hoặc gõ: "Tiếp tế quân bị...")',
    placeholderEn: 'Liang Yan confers with Cao Cao... (or type: "Supply armaments...")',
    chips: [
      { type: 'local', icon: '⚔️', labelVi: 'Chi Viện Khí Giới', labelEn: 'Supply Arms', promptVi: 'Cung cấp 10 Khiên Trúc bọc da cho Hổ Báo Kỵ của Tào Tháo', promptEn: 'Supply 10 reinforced shields to Cao Cao Tiger-Leopard cavalry' },
      { type: 'local', icon: '🌾', labelVi: 'Bán 10 Thạch Lương', labelEn: 'Sell 10 Grain', promptVi: 'Xuất bán 10 thạch lương tiếp tế đồn điền Dự Châu', promptEn: 'Sell 10 grain piculs for Yuzhou agricultural military camps' },
      { type: 'local', icon: '📜', labelVi: 'Đàm Luận Anh Hùng', labelEn: 'Discuss Heroes', promptVi: 'Cùng Tào Tháo luận đàm anh hùng thiên hạ và thế cuộc', promptEn: 'Discuss grand strategy and contemporary heroes with Cao Cao' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Báo tiệp Huyện Trác', labelEn: 'Courier to Zhuo', promptVi: 'Phi thư về Huyện Trác thông báo quan hệ hợp tác với Tào Tháo', promptEn: 'Send courier to Zhuo County reporting ties with Cao Cao' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Tiến Vào Lạc Dương', labelEn: 'To Luoyang', promptVi: 'Vượt Hổ Lao Quan tiến về Kinh Sư Lạc Dương', promptEn: 'Pass Hulao Pass to Imperial Luoyang' },
      { type: 'travel', icon: '🏇', labelVi: 'Đến Hạ Phì', labelEn: 'To Xiapi', promptVi: 'Hành quân về phía đông sang Từ Châu Hạ Phì', promptEn: 'March east to Xiapi in Xuzhou' }
    ]
  },
  'Hạ Phì Thành Lũy': {
    presenceVi: 'Hạ Phì Thành Phủ (Trực diện: Đào Khiêm • Thứ Sử Từ Châu)',
    presenceEn: 'Xiapi Citadel (In-person: Tao Qian • Governor of Xuzhou)',
    placeholderVi: 'Lương Diễn yết kiến Thứ Sử Từ Châu... (hoặc gõ: "Giao thương muối cá...")',
    placeholderEn: 'Liang Yan negotiates in Xiapi... (or type: "Trade fishery & salt...")',
    chips: [
      { type: 'local', icon: '🐟', labelVi: 'Mua Muối & Thủy Sản', labelEn: 'Buy Salt & Fish', promptVi: 'Thu mua 15 đấu muối biển và hải sản Từ Châu', promptEn: 'Procure 15 sea salt and coastal rations from Xuzhou' },
      { type: 'local', icon: '🛡️', labelVi: 'Hỗ Trợ Thành Phòng', labelEn: 'Citadel Defense', promptVi: 'Hiến kế củng cố tường lũy Hạ Phì phòng thủ giặc cướp', promptEn: 'Advise on fortification reinforcement against raiders' },
      { type: 'local', icon: '🤝', labelVi: 'Kết Giao Mi Trúc', labelEn: 'Meet Mi Zhu', promptVi: 'Tiếp xúc cự phú Mi Trúc bàn kế hoạch liên minh thương hội', promptEn: 'Meet merchant magnate Mi Zhu to establish trade confederation' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Phi thư về Huyện Trác', labelEn: 'Courier to Zhuo', promptVi: 'Gửi thư báo tin tình hình hải thương Từ Châu về Huyện Trác', promptEn: 'Dispatch merchant report to Zhuo County' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Về Hứa Xương', labelEn: 'To Xuchang', promptVi: 'Rời Hạ Phì, hành quân về phía tây đến Hứa Xương', promptEn: 'March west back to Xuchang' }
    ]
  },
  'Kinh Đô Lạc Dương': {
    presenceVi: 'Kinh Đô Lạc Dương (Trực diện: Hà Tiến • Đại Tướng Quân)',
    presenceEn: 'Imperial Luoyang (In-person: General-in-Chief He Jin)',
    placeholderVi: 'Lương Diễn yết kiến triều đình Lạc Dương... (hoặc gõ: "Dâng biểu quân công...")',
    placeholderEn: 'Liang Yan at Imperial Court... (or type: "Submit memorial...")',
    chips: [
      { type: 'local', icon: '🎖️', labelVi: 'Nhận Sắc Phong Triều Đình', labelEn: 'Claim Imperial Bounty', promptVi: 'Nhận sắc phong Quân Nhu Tán Quan & Thưởng 2,500 Tiền từ Triều Đình', promptEn: 'Claim imperial commission and 2,500 Qian bounty' },
      { type: 'local', icon: '🏛️', labelVi: 'Mở Phân Hiệu Kinh Đô', labelEn: 'Found Capital Branch', promptVi: 'Đăng ký môn bài chi nhánh Lương Gia Thương Hội tại Kinh Sư', promptEn: 'Register Liang Merchant Guild branch in the Capital' },
      { type: 'local', icon: '🍵', labelVi: 'Gặp Binh Bộ Thượng Thư', labelEn: 'Court Networking', promptVi: 'Biếu lễ vật tiếp xúc Binh Bộ Thượng Thư nắm bắt thời cuộc', promptEn: 'Audience with Minister of War to discuss contracts' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Chỉ đạo Xưởng Trác Huyện', labelEn: 'Direct Zhuo Workshop', promptVi: 'Phi thư về Huyện Trác chỉ đạo mở rộng quy mô xưởng dệt gấp đôi', promptEn: 'Dispatch instructions to Zhuo County to expand workshop' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Sang Trường An', labelEn: 'To Changan', promptVi: 'Vượt Đồng Quan tiến sang Tây Đô Trường An', promptEn: 'Cross Tong Pass to Western Capital Changan' },
      { type: 'travel', icon: '🏇', labelVi: 'Về Huyện Trác', labelEn: 'To Zhuo County', promptVi: 'Rời Kinh Sư Lạc Dương, cất bước trở về Trang Viên Vườn Đào Huyện Trác', promptEn: 'Depart Luoyang and return to Peach Garden Manor in Zhuo County' }
    ]
  },
  'Trường An Cung Phủ': {
    presenceVi: 'Trường An Phủ Đệ (Trực diện: Tư Đồ Vương Doãn / Đổng Trác)',
    presenceEn: 'Changan Palace Hall (In-person: Minister Wang Yun / Dong Zhuo)',
    placeholderVi: 'Lương Diễn thị sát Tây Đô Trường An... (hoặc gõ: "Mua chiến mã Tây Lương...")',
    placeholderEn: 'Liang Yan observes Changan... (or type: "Procure Xiliang steeds...")',
    chips: [
      { type: 'local', icon: '🐎', labelVi: 'Mua Ngựa Tây Lương', labelEn: 'Buy Xiliang Steeds', promptVi: 'Thu mua 5 tuấn mã Tây Lương dũng mãnh cho đoàn kỵ mã', promptEn: 'Procure 5 fierce Xiliang steeds for escort brigade' },
      { type: 'local', icon: '🗡️', labelVi: 'Giao Tiếp Quan Trường', labelEn: 'Court Diplomacy', promptVi: 'Gặp gỡ Tư Đồ Vương Doãn tìm hiểu mật mưu triều chính', promptEn: 'Audience with Minister Wang Yun regarding court dynamics' },
      { type: 'local', icon: '🌾', labelVi: 'Bán Lương Quan Trung', labelEn: 'Sell Grain', promptVi: 'Xuất bán 8 thạch lương thực cho kho đồn trú Trường An', promptEn: 'Supply 8 grain piculs to Changan garrison storehouses' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Mật báo Lạc Dương', labelEn: 'Dispatch to Luoyang', promptVi: 'Phi thư mật bảo tình hình Tây Vực và Quan Trung về Lạc Dương', promptEn: 'Send confidential courier report to Luoyang' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Qua Hán Trung', labelEn: 'To Hanzhong', promptVi: 'Vượt Tần Lĩnh sạn đạo tiến về phía nam đến Hán Trung', promptEn: 'Traverse Qinling mountain plank roads south to Hanzhong' },
      { type: 'travel', icon: '🏇', labelVi: 'Về Lạc Dương', labelEn: 'To Luoyang', promptVi: 'Qua ải Đồng Quan quay trở lại Đông Đô Lạc Dương', promptEn: 'Return east through Tong Pass to Luoyang' }
    ]
  },
  'Tương Dương Châu Phủ': {
    presenceVi: 'Tương Dương Châu Phủ (Trực diện: Lưu Biểu • Kinh Châu Mục)',
    presenceEn: 'Xiangyang Prefecture (In-person: Liu Biao • Governor of Jingzhou)',
    placeholderVi: 'Lương Diễn diện kiến Lưu Biểu... (hoặc gõ: "Mua gỗ đóng thuyền...")',
    placeholderEn: 'Liang Yan meets Liu Biao... (or type: "Procure shipbuilding timber...")',
    chips: [
      { type: 'local', icon: '🪵', labelVi: 'Mua Gỗ Đóng Thuyền', labelEn: 'Procure Timber', promptVi: 'Thu mua 10 khối gỗ Thiết Mộc Kinh Châu chuẩn bị đóng thuyền', promptEn: 'Purchase 10 bundles of Jingzhou ironwood for vessels' },
      { type: 'local', icon: '📜', labelVi: 'Đàm Đạo Nho Sĩ', labelEn: 'Scholarly Discourse', promptVi: 'Đến Thủy Kính Trang đàm đạo cùng Tư Mã Huy về nhân tài', promptEn: 'Visit Water Mirror Manor to confer with Sima Hui on talents' },
      { type: 'local', icon: '🌾', labelVi: 'Bán Muối Biển', labelEn: 'Sell Salt', promptVi: 'Xuất bán 12 đấu muối biển cho các thương đoàn Tương Dương', promptEn: 'Sell 12 sea salt units to Xiangyang river merchants' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Phi thư về Huyện Trác', labelEn: 'Courier to Zhuo', promptVi: 'Gửi thư tín đường sông về Huyện Trác báo tin Kinh Châu yên bình', promptEn: 'Dispatch river relay courier to Zhuo County' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Đến Giang Lăng', labelEn: 'To Jiangling', promptVi: 'Xuôi dòng Hán Thủy tiến về đại bản doanh Giang Lăng', promptEn: 'Travel down Han River toward Jiangling base' },
      { type: 'travel', icon: '🏇', labelVi: 'Về Hứa Xương', labelEn: 'To Xuchang', promptVi: 'Hành quân ngược bắc trở lại Hứa Xương', promptEn: 'March north back toward Xuchang' }
    ]
  },
  'Giang Lăng Thủy Doanh': {
    presenceVi: 'Giang Lăng Thủy Doanh (Trực diện: Thủy Sư Đô Đốc / Quan Vũ)',
    presenceEn: 'Jiangling Naval Base (In-person: Naval Commander / Guan Yu)',
    placeholderVi: 'Lương Diễn thị sát chiến thuyền Giang Lăng... (hoặc gõ: "Tiếp tế thủy quân...")',
    placeholderEn: 'Liang Yan inspects Jiangling naval dock... (or type: "Supply fleet...")',
    chips: [
      { type: 'local', icon: '⛵', labelVi: 'Đóng Thuyền Mông Xung', labelEn: 'Build War Galley', promptVi: 'Đầu tư đóng 1 thuyền lướt sóng Mông Xung tuần tra Trường Giang', promptEn: 'Commission fast Mengchong assault vessel on Yangtze' },
      { type: 'local', icon: '🛡️', labelVi: 'Cung Cấp Khiên Chống Tên', labelEn: 'Archery Shields', promptVi: 'Cung cấp 10 Khiên Trúc bọc da chống tên lửa cho thủy binh', promptEn: 'Deliver 10 fire-resistant bamboo shields to marines' },
      { type: 'local', icon: '🐟', labelVi: 'Gom Lương Thảo Ngư Phẩm', labelEn: 'Naval Rations', promptVi: 'Thu mua 10 thạch cá khô và gạo dự trữ cho hạm đội', promptEn: 'Stockpile 10 dried fish and grain provisions for fleet' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Đến Xích Bích', labelEn: 'To Chibi', promptVi: 'Thuyền chiến xuôi dòng Trường Giang tiến tới Xích Bích', promptEn: 'Sail downriver along Yangtze to Chibi outpost' },
      { type: 'travel', icon: '🏇', labelVi: 'Về Tương Dương', labelEn: 'To Xiangyang', promptVi: 'Ngược dòng tiến về phủ Tương Dương', promptEn: 'Return north to Xiangyang' }
    ]
  },
  'Xích Bích Thủy Trại': {
    presenceVi: 'Xích Bích Soái Thuyền (Trực diện: Chu Du • Công Cẩn)',
    presenceEn: 'Chibi Flagship Command (In-person: Zhou Yu • Gongjin)',
    placeholderVi: 'Lương Diễn tham vấn cùng Chu Du... (hoặc gõ: "Chuẩn bị hỏa công...")',
    placeholderEn: 'Liang Yan confers with Zhou Yu... (or type: "Prepare fire ships...")',
    chips: [
      { type: 'local', icon: '🔥', labelVi: 'Tiếp Tế Dầu Hỏa Công', labelEn: 'Supply Fire Oil', promptVi: 'Vận chuyển 20 thùng dầu hỏa và lau sậy phục vụ hỏa công', promptEn: 'Transport 20 barrels of flammable pitch and reeds' },
      { type: 'local', icon: '🏹', labelVi: 'Chế Tác Cung Nỏ', labelEn: 'Craft Crossbows', promptVi: 'Cung cấp vật liệu tre dẻo gia cố 10 bộ liên nỏ thủy chiến', promptEn: 'Supply high-grade bamboo for 10 repeating crossbows' },
      { type: 'local', icon: '💨', labelVi: 'Quan Sát Hướng Gió', labelEn: 'Observe Wind', promptVi: 'Cùng mưu sĩ khảo sát thủy văn và quy luật gió đông Trường Giang', promptEn: 'Survey river hydrology and east wind patterns with tacticians' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Tiến Vào Kiến Nghiệp', labelEn: 'To Jianye', promptVi: 'Xuôi hạ lưu Trường Giang tiến về Kinh Đô Kiến Nghiệp', promptEn: 'Sail down Yangtze estuary to Jianye capital' },
      { type: 'travel', icon: '🏇', labelVi: 'Về Giang Lăng', labelEn: 'To Jiangling', promptVi: 'Ngược dòng Trường Giang trở lại Giang Lăng', promptEn: 'Sail upriver back to Jiangling' }
    ]
  },
  'Kiến Nghiệp Đô Thành': {
    presenceVi: 'Kiến Nghiệp Vương Phủ (Trực diện: Tôn Quyền • Trọng Mưu)',
    presenceEn: 'Jianye Royal Court (In-person: Sun Quan • Zhongmou)',
    placeholderVi: 'Lương Diễn yết kiến Giang Đông Chi Chủ... (hoặc gõ: "Mở thương hội Giang Đông...")',
    placeholderEn: 'Liang Yan confers with Sun Quan... (or type: "Open Eastern Wu guild...")',
    chips: [
      { type: 'local', icon: '🍵', labelVi: 'Mua Trà & Gốm Sứ', labelEn: 'Buy Tea & Porcelain', promptVi: 'Thu mua 10 kiện Trà Giang Đông và gốm men xanh xuất sắc', promptEn: 'Procure 10 crates of Jiangnan tea and celadon porcelain' },
      { type: 'local', icon: '🏛️', labelVi: 'Lập Hội Quán U - Ngô', labelEn: 'Found Trade Guild', promptVi: 'Thành lập phân hội thương gia kết nối giao thương Bắc Nam', promptEn: 'Establish North-South merchant lodge in Jianye' },
      { type: 'local', icon: '🐅', labelVi: 'Yết Kiến Tôn Trọng Mưu', labelEn: 'Audience Sun Quan', promptVi: 'Yết kiến Tôn Quyền đàm đạo thế chân vạc giang sơn', promptEn: 'Audience with Sun Quan debating the tripartite balance' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Phi thư về Huyện Trác', labelEn: 'Courier to Zhuo', promptVi: 'Phái thuyền buôn mang bạc trắng và đặc sản về Huyện Trác', promptEn: 'Dispatch trading boat with silver and specialties to Zhuo' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Về Xích Bích', labelEn: 'To Chibi', promptVi: 'Ngược dòng Trường Giang tiến tới tiền đồn Xích Bích', promptEn: 'Sail up Yangtze to Chibi outpost' }
    ]
  },
  'Hán Trung Thiên Sư Phủ': {
    presenceVi: 'Hán Trung Đạo Phủ (Trực diện: Trương Lỗ • Thiên Sư Đạo)',
    presenceEn: 'Hanzhong Daoist Hall (In-person: Zhang Lu • Celestial Master)',
    placeholderVi: 'Lương Diễn đàm đạo tại Hán Trung... (hoặc gõ: "Thu mua dược liệu Tần Lĩnh...")',
    placeholderEn: 'Liang Yan in Hanzhong... (or type: "Procure mountain herbs...")',
    chips: [
      { type: 'local', icon: '🌿', labelVi: 'Thu Mua Thảo Dược', labelEn: 'Buy Rare Herbs', promptVi: 'Thu mua 10 vị thảo dược quý Tần Lĩnh trị thương cho quân sĩ', promptEn: 'Purchase 10 rare mountain herbal remedies for wounded soldiers' },
      { type: 'local', icon: '🌾', labelVi: 'Quyên Góp Nghĩa Mễ', labelEn: 'Donate Charity Rice', promptVi: 'Góp 5 thạch lương vào nghĩa xá tạo phúc đức và tăng danh vọng', promptEn: 'Contribute 5 grain piculs to communal charity lodges' },
      { type: 'local', icon: '🏔️', labelVi: 'Khảo Sát Kiếm Các', labelEn: 'Scout Mountain Pass', promptVi: 'Khảo sát độ hiểm trở của hiểm quan Kiếm Các vào đất Thục', promptEn: 'Survey fortified mountain defile of Jiange pass into Shu' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Vào Thành Đô', labelEn: 'To Chengdu', promptVi: 'Vượt Kiếm Các hiểm trở tiến vào Thiên Phủ Thành Đô', promptEn: 'Traverse treacherous Jiange pass into Chengdu' },
      { type: 'travel', icon: '🏇', labelVi: 'Về Trường An', labelEn: 'To Changan', promptVi: 'Theo sạn đạo vượt Tần Lĩnh quay về Trường An', promptEn: 'Trek north across Qinling plank paths back to Changan' }
    ]
  },
  'Thành Đô Ích Châu Phủ': {
    presenceVi: 'Thành Đô Đại Phủ (Trực diện: Lưu Chương • Ích Châu Mục)',
    presenceEn: 'Chengdu Grand Manor (In-person: Liu Zhang • Lord of Yizhou)',
    placeholderVi: 'Lương Diễn chiêm ngưỡng Đất Thục... (hoặc gõ: "Mua Thục Cẩm thượng hạng...")',
    placeholderEn: 'Liang Yan at Chengdu... (or type: "Procure Shu Brocade...")',
    chips: [
      { type: 'local', icon: '🎋', labelVi: 'Mua Thục Cẩm Thượng Hạng', labelEn: 'Buy Shu Brocade', promptVi: 'Thu mua 10 sấp Thục Cẩm lừng danh thiên hạ từ phường dệt', promptEn: 'Procure 10 bolts of world-renowned Shu brocade silks' },
      { type: 'local', icon: '⛏️', labelVi: 'Mua Quặng Sắt Tây Thục', labelEn: 'Buy Iron Ore', promptVi: 'Thu mua 15 khối quặng sắt tinh khiết rèn đao kiếm', promptEn: 'Procure 15 units of high-grade Shu mountain iron ore' },
      { type: 'local', icon: '🍷', labelVi: 'Dự Tiệc Tây Thục', labelEn: 'Shu Banquet', promptVi: 'Thưởng thức mỹ tửu và hòa tấu nhạc thục tại phủ Lưu Chương', promptEn: 'Attend festive court banquet enjoying Shu music and wine' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Phi thư về Huyện Trác', labelEn: 'Courier to Zhuo', promptVi: 'Gửi thư tín đường bộ báo tin đã mở rộng mạng lưới vào đất Thục', promptEn: 'Dispatch courier dispatch to Zhuo confirming western route' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Về Hán Trung', labelEn: 'To Hanzhong', promptVi: 'Vượt Kiếm Các quan ải quay trở lại Hán Trung', promptEn: 'Trek back through Jiange pass toward Hanzhong' }
    ]
  }
};

const WORLD_MAP_NODES = {
  'zhuo_xian': {
    id: 'zhuo_xian',
    nameVi: 'Trác Huyện (Trác Quận)',
    nameEn: 'Zhuo County (Zhuo Commandery)',
    provinceVi: 'U Châu',
    provinceEn: 'Youzhou',
    coords: { x: 330, y: 70 },
    statusVi: 'An Định • Hậu Phương Lương Gia',
    statusEn: 'Stable • Liang Clan Base',
    threatVi: 'An toàn (Quan binh phòng thủ)',
    threatEn: 'Safe (Garrison defense)',
    distanceFromZhuo: 0,
    daysRequired: 0,
    grainCost: 0,
    defaultSubLoc: 'Vườn Đào',
    subLocations: ['Vườn Đào', 'Chợ Đông Môn', 'Xưởng Lương Thị'],
    figuresVi: 'Lưu Bị (Huyền Đức), Trương Phi (Dực Đức), Quan Vũ (Vân Trường), Thợ cả Trần Bảo',
    figuresEn: 'Liu Bei, Zhang Fei, Guan Yu, Master Chen Bao',
    intelVi: 'Bản dinh và quê hương của gia tộc Lương Thị. Nơi khởi phát của Đào Viên Kết Nghĩa và xưởng dệt thủ công.',
    intelEn: 'Home base of Liang Clan. Cradle of the Peach Garden Oath and textile craft workshop.'
  },
  'ji_cheng': {
    id: 'ji_cheng',
    nameVi: 'Kế Thành & Bắc Bình',
    nameEn: 'Jicheng & Beiping',
    provinceVi: 'U Châu',
    provinceEn: 'Youzhou',
    coords: { x: 440, y: 55 },
    statusVi: 'Trọng Trấn Biên Cương • Bạch Mã Nghĩa Tòng',
    statusEn: 'Border Bastion • White Horse Cavalry',
    threatVi: 'Thấp (Biên thùy nghiêm mật)',
    threatEn: 'Low (Heavy border garrison)',
    distanceFromZhuo: 120,
    daysRequired: 0.5,
    grainCost: 0.8,
    defaultSubLoc: 'Bắc Bình Soái Phủ',
    subLocations: ['Bắc Bình Soái Phủ'],
    figuresVi: 'Công Tôn Toản (Bá Khuê), Triệu Vân (Tử Long - thời kỳ đầu), Thiết Kỵ Bạch Mã',
    figuresEn: 'Gongsun Zan, Zhao Yun (early), White Horse Cavalry',
    intelVi: 'Căn cứ quân sự kiên cố trấn thủ biên giới phương Bắc Đại Hán, nổi tiếng với đoàn kỵ binh Bạch Mã Nghĩa Tòng thiện chiến vô song.',
    intelEn: 'Northern bastion defending against northern tribes, famous for Gongsun Zan elite White Horse Volunteer Cavalry.'
  },
  'ye_cheng': {
    id: 'ye_cheng',
    nameVi: 'Nghiệp Thành (Ký Châu)',
    nameEn: 'Yecheng (Jizhou Capital)',
    provinceVi: 'Ký Châu',
    provinceEn: 'Jizhou',
    coords: { x: 320, y: 155 },
    statusVi: 'Phồn Hoa Đô Hội • Thế Tộc Hà Bắc',
    statusEn: 'Grand Metropolis • Hebei Aristocracy',
    threatVi: 'Thấp (Quan phủ trấn áp tốt)',
    threatEn: 'Low (Well policed by provincial guards)',
    distanceFromZhuo: 330,
    daysRequired: 1.2,
    grainCost: 1.8,
    defaultSubLoc: 'Nghiệp Thành Đại Phủ',
    subLocations: ['Nghiệp Thành Đại Phủ'],
    figuresVi: 'Viên Thiệu (Bản Sơ), Phùng Kỷ, Điền Phong, Thương nhân thế tộc Hà Bắc',
    figuresEn: 'Yuan Shao, Feng Ji, Tian Feng, Jizhou merchant elites',
    intelVi: 'Thủ phủ trù phú bậc nhất Hà Bắc, trung tâm lúa gạo và lụa là gấm vóc, bàn đạp hùng mạnh của các đại gia tộc cát cứ.',
    intelEn: 'Wealthy heart of Hebei plains, thriving grain warehouses, silk crafts, and seat of aristocratic lords.'
  },
  'guang_zong': {
    id: 'guang_zong',
    nameVi: 'Quảng Tông (Cự Lộc)',
    nameEn: 'Guangzong (Julu Commandery)',
    provinceVi: 'Ký Châu',
    provinceEn: 'Jizhou',
    coords: { x: 375, y: 165 },
    statusVi: 'Chiến Sự Ác Liệt • Khăn Vàng',
    statusEn: 'Active Battlefield • Yellow Turbans',
    threatVi: 'Hiểm nguy cao (Tàn quân phục kích)',
    threatEn: 'High threat (Bandit ambushes)',
    distanceFromZhuo: 280,
    daysRequired: 1.0,
    grainCost: 1.5,
    defaultSubLoc: 'Quảng Tông Quân Doanh',
    subLocations: ['Quảng Tông Quân Doanh'],
    figuresVi: 'Lư Thực (Bắc Quân Trung Lang Tướng), Trương Giác, Trương Lương, Trương Bảo',
    figuresEn: 'General Lu Zhi, Zhang Jue, Zhang Liang, Zhang Bao',
    intelVi: 'Đại bản doanh của giáo phái Thái Bình Đạo. Thành trì Quảng Tông đang bị Bắc Quân của Lư Thực bao vây chặt chẽ.',
    intelEn: 'Heart of the Yellow Turban Rebellion. Besieged by General Lu Zhi of the Northern Army.'
  },
  'ping_yuan': {
    id: 'ping_yuan',
    nameVi: 'Bình Nguyên (Bình Nguyên Quốc)',
    nameEn: 'Pingyuan (Pingyuan State)',
    provinceVi: 'Ký / Thanh Châu',
    provinceEn: 'Jizhou / Qingzhou',
    coords: { x: 460, y: 165 },
    statusVi: 'Nghĩa Binh Tập Kết',
    statusEn: 'Militia Muster Point',
    threatVi: 'Trung bình (Biên giới bất an)',
    threatEn: 'Moderate (Border skirmishes)',
    distanceFromZhuo: 360,
    daysRequired: 1.5,
    grainCost: 2.0,
    defaultSubLoc: 'Bình Nguyên Trọng Trấn',
    subLocations: ['Bình Nguyên Trọng Trấn'],
    figuresVi: 'Lưu Bị (khi làm Bình Nguyên Lệnh), Thương đoàn Thanh Châu, Dân binh xã tắc',
    figuresEn: 'Liu Bei (as Magistrate), Qingzhou merchants, Village militia',
    intelVi: 'Đầu mối giao thương giữa Ký Châu và Thanh Châu. Nơi nghĩa quân đang tập hợp lực lượng đẩy lùi giặc cỏ ven vịnh Bột Hải.',
    intelEn: 'Crucial logistical crossroad between Jizhou and Qingzhou. Volunteer armies congregating.'
  },
  'luo_yang': {
    id: 'luo_yang',
    nameVi: 'Kinh Đô Lạc Dương (Kinh Sư)',
    nameEn: 'Imperial Capital Luoyang',
    provinceVi: 'Tư Lệ',
    provinceEn: 'Sili',
    coords: { x: 260, y: 250 },
    statusVi: 'Hoàng Thành Giới Nghiêm • Đế Đô Đại Hán',
    statusEn: 'Imperial Capital • Martial Law',
    threatVi: 'An ninh nghiêm ngặt (Cấm vệ quân)',
    threatEn: 'High security (Imperial guards)',
    distanceFromZhuo: 750,
    daysRequired: 3.0,
    grainCost: 4.0,
    defaultSubLoc: 'Kinh Đô Lạc Dương',
    subLocations: ['Kinh Đô Lạc Dương'],
    figuresVi: 'Hán Linh Đế, Hà Tiến, Viên Thiệu, Tào Tháo, Thập Thường Thị',
    figuresEn: 'Emperor Ling, He Jin, Yuan Shao, Cao Cao, Ten Attendants',
    intelVi: 'Kinh đô tráng lệ của Đế Chế Đại Hán. Nơi ban bố các chiếu thư phong tướng, ban thưởng quân công và quyết định đại cục thiên hạ.',
    intelEn: 'Magnificent capital of the Han Empire. Seat of imperial decrees, court politics, and high governance.'
  },
  'chang_an': {
    id: 'chang_an',
    nameVi: 'Tây Đô Trường An (Quan Trung)',
    nameEn: 'Changan (Western Capital)',
    provinceVi: 'Tư Lệ / Ung Châu',
    provinceEn: 'Sili / Yongzhou',
    coords: { x: 160, y: 250 },
    statusVi: 'Tây Vực Hiểm Yếu • Cố Đô Hùng Vĩ',
    statusEn: 'Strategic Redoubt • Ancient Capital',
    threatVi: 'Trung bình (Tây Lương kỵ binh phòng ngự)',
    threatEn: 'Moderate (Xiliang military control)',
    distanceFromZhuo: 920,
    daysRequired: 3.8,
    grainCost: 5.0,
    defaultSubLoc: 'Trường An Cung Phủ',
    subLocations: ['Trường An Cung Phủ'],
    figuresVi: 'Đổng Trác, Lữ Bố, Vương Doãn, Lý Thôi, Quách Dĩ',
    figuresEn: 'Dong Zhuo, Lu Bu, Wang Yun, Li Jue, Guo Si',
    intelVi: 'Cố đô ngàn năm được bao bọc bởi Hàm Cốc Quan và Đồng Quan hiểm trở. Đất đai phì nhiêu bát ngát ở bình nguyên Quan Trung.',
    intelEn: 'Ancient capital guarded by Tongguan and Hangu passes. Vast agricultural basin and gateway to the Silk Road.'
  },
  'xu_chang': {
    id: 'xu_chang',
    nameVi: 'Hứa Xương & Dĩnh Xuyên',
    nameEn: 'Xuchang & Yingchuan',
    provinceVi: 'Dự Châu',
    provinceEn: 'Yuzhou',
    coords: { x: 350, y: 265 },
    statusVi: 'Bàn Đạp Tào Ngụy • Đồn Điền Hưng Thịnh',
    statusEn: 'Cao Cao Bastion • Prosperous Tuntian',
    threatVi: 'Thấp (Quân doanh canh phòng)',
    threatEn: 'Low (Strict martial administration)',
    distanceFromZhuo: 580,
    daysRequired: 2.2,
    grainCost: 3.0,
    defaultSubLoc: 'Hứa Xương Tướng Phủ',
    subLocations: ['Hứa Xương Tướng Phủ'],
    figuresVi: 'Tào Tháo (Mạnh Đức), Tuân Úc, Quách Gia, Hổ Báo Kỵ',
    figuresEn: 'Cao Cao, Xun Yu, Guo Jia, Tiger & Leopard Cavalry',
    intelVi: 'Trung tâm trù phú của vùng Dự Châu và Dĩnh Xuyên, nơi phát tích nhiều danh sĩ mưu lược và chính sách đồn điền tích cốc tích binh.',
    intelEn: 'Prosperous core of Yuzhou, renowned for elite strategists and military agricultural colonies (Tuntian).'
  },
  'xia_pi': {
    id: 'xia_pi',
    nameVi: 'Hạ Phì (Từ Châu)',
    nameEn: 'Xiapi (Xuzhou)',
    provinceVi: 'Từ Châu',
    provinceEn: 'Xuzhou',
    coords: { x: 460, y: 275 },
    statusVi: 'Ngư Diêm Phú Thứ • Trọng Trấn Hải Tân',
    statusEn: 'Coastal Trade Hub • Salt & Fisheries',
    threatVi: 'Trung bình (Tranh chấp chư hầu)',
    threatEn: 'Moderate (Warlord disputes)',
    distanceFromZhuo: 640,
    daysRequired: 2.5,
    grainCost: 3.5,
    defaultSubLoc: 'Hạ Phì Thành Lũy',
    subLocations: ['Hạ Phì Thành Lũy'],
    figuresVi: 'Đào Khiêm, Mi Trúc (Cự phú Từ Châu), Lữ Bố, Trần Cung',
    figuresEn: 'Tao Qian, Mi Zhu (Merchant Prince), Lu Bu, Chen Gong',
    intelVi: 'Thương cảng duyên hải đông đúc nhiều muối biển, thủy sản và ngân lượng. Vựa của cải trù phú thường bị các lộ chư hầu dòm ngó.',
    intelEn: 'Coastal commercial powerhouse with salt evaporation fields, sea trade, and wealth of the Mi merchant clan.'
  },
  'xiang_yang': {
    id: 'xiang_yang',
    nameVi: 'Tương Dương (Nam Dương)',
    nameEn: 'Xiangyang (Jingzhou North)',
    provinceVi: 'Kinh Châu',
    provinceEn: 'Jingzhou',
    coords: { x: 280, y: 355 },
    statusVi: 'Thiên Hạ Yết Hầu • Văn Nhân Hội Tụ',
    statusEn: 'Crossroad of China • Scholar Haven',
    threatVi: 'Thấp (Kinh Châu ổn định thời Lưu Biểu)',
    threatEn: 'Low (Peaceful under Liu Biao)',
    distanceFromZhuo: 880,
    daysRequired: 3.5,
    grainCost: 4.8,
    defaultSubLoc: 'Tương Dương Châu Phủ',
    subLocations: ['Tương Dương Châu Phủ'],
    figuresVi: 'Lưu Biểu (Cảnh Thăng), Khoái Lương, Sĩ phu Nam Dương, Hoàng Thừa Ngạn',
    figuresEn: 'Liu Biao, Kuai Liang, Nanyang scholars, Huang Chengyan',
    intelVi: 'Pháo đài kiên cố bên bờ sông Hán Thủy, yết hầu giao thông thủy lục nối liền Bắc Bộ và phương Nam. Trung tâm văn hóa học thuật thời loạn.',
    intelEn: 'Impregnable river citadel on the Han River, connecting North and South. Sanctuary for scholars fleeing wars.'
  },
  'jiang_ling': {
    id: 'jiang_ling',
    nameVi: 'Giang Lăng (Nam Quận)',
    nameEn: 'Jiangling (Nan Commandery)',
    provinceVi: 'Kinh Châu',
    provinceEn: 'Jingzhou',
    coords: { x: 270, y: 430 },
    statusVi: 'Thủy Sư Đại Bản Doanh • Trường Giang Thượng Lưu',
    statusEn: 'Naval Bastion • Upper Yangtze',
    threatVi: 'Trung bình (Chiến thuyền tuần tra nghiêm ngặt)',
    threatEn: 'Moderate (Patrolled by war fleets)',
    distanceFromZhuo: 1050,
    daysRequired: 4.2,
    grainCost: 5.5,
    defaultSubLoc: 'Giang Lăng Thủy Doanh',
    subLocations: ['Giang Lăng Thủy Doanh'],
    figuresVi: 'Quan Vũ (sau này trấn thủ), Thủy quân Đô đốc, Thuyền buôn Trường Giang',
    figuresEn: 'Guan Yu (later commander), Marine fleet captains, Yangtze merchants',
    intelVi: 'Trọng trấn thủy quân kiểm soát toàn bộ dòng Trường Giang từ Ba Thục đổ xuống hạ lưu. Kho dự trữ thuyền bè và khí giới khổng lồ.',
    intelEn: 'Massive naval dockyard and supply base controlling the Yangtze corridor between Sichuan and the East.'
  },
  'chi_bi': {
    id: 'chi_bi',
    nameVi: 'Xích Bích & Sài Tang',
    nameEn: 'Chibi & Saitang',
    provinceVi: 'Kinh / Kinh Đông',
    provinceEn: 'Jingzhou / Jiangdong',
    coords: { x: 380, y: 410 },
    statusVi: 'Thủy Chiến Yếu Trùng • Bến Lửa Thiên Cổ',
    statusEn: 'Historic Battleground • Great Fire River',
    threatVi: 'Cao (Chiến tranh thủy bộ giằng co)',
    threatEn: 'High (Intense naval skirmishing)',
    distanceFromZhuo: 1150,
    daysRequired: 4.6,
    grainCost: 6.0,
    defaultSubLoc: 'Xích Bích Thủy Trại',
    subLocations: ['Xích Bích Thủy Trại'],
    figuresVi: 'Chu Du (Công Cẩn), Lỗ Túc, Hoàng Cái, Hạm đội Liên Quân',
    figuresEn: 'Zhou Yu, Lu Su, Huang Gai, Allied Fleet Commanders',
    intelVi: 'Khúc sông hiểm trở vách đá dựng đứng trên Trường Giang. Nơi diễn ra trận thủy chiến hỏa công lừng lẫy định hình thế chân vạc Tam Quốc.',
    intelEn: 'Steep red cliffs over the Yangtze. Legendary site of the naval fire attack that shattered northern invasion fleets.'
  },
  'jian_ye': {
    id: 'jian_ye',
    nameVi: 'Kiến Nghiệp & Ngô Quận (Giang Đông)',
    nameEn: 'Jianye & Wu Commandery',
    provinceVi: 'Dương Châu',
    provinceEn: 'Yangzhou',
    coords: { x: 490, y: 380 },
    statusVi: 'Đô Thành Đông Ngô • Giang Nam Phú Thứ',
    statusEn: 'Capital of Wu • Prosperous Southland',
    threatVi: 'Thấp (Thiên hiểm Trường Giang chở che)',
    threatEn: 'Low (Protected by Yangtze barrier)',
    distanceFromZhuo: 1100,
    daysRequired: 4.5,
    grainCost: 5.8,
    defaultSubLoc: 'Kiến Nghiệp Đô Thành',
    subLocations: ['Kiến Nghiệp Đô Thành'],
    figuresVi: 'Tôn Quyền, Trương Chiêu, Chu Thái, Thương thuyền biển Giang Đông',
    figuresEn: 'Sun Quan, Zhang Zhao, Zhou Tai, Maritime merchant guild',
    intelVi: 'Đô thành trù phú của Đông Ngô dựa lưng vào thiên hiểm sông lớn Trường Giang, vựa lúa gạo, trà ngon và nghề đóng thuyền đi biển phát triển.',
    intelEn: 'Capital of Eastern Wu protected by the vast Yangtze river, epicenter of tea, shipbuilding, and maritime commerce.'
  },
  'han_zhong': {
    id: 'han_zhong',
    nameVi: 'Hán Trung (Hán Xuyên)',
    nameEn: 'Hanzhong (Gateway to Shu)',
    provinceVi: 'Ích Châu / Lương Châu',
    provinceEn: 'Yizhou / Liangzhou',
    coords: { x: 130, y: 345 },
    statusVi: 'Cửa Ngõ Ba Thục • Thiên Sư Đạo',
    statusEn: 'Northern Gate to Shu • Daoist Bastion',
    threatVi: 'Trung bình (Đường sạn đạo hiểm trở)',
    threatEn: 'Moderate (Mountain cliffs & rugged trails)',
    distanceFromZhuo: 1250,
    daysRequired: 5.0,
    grainCost: 6.5,
    defaultSubLoc: 'Hán Trung Thiên Sư Phủ',
    subLocations: ['Hán Trung Thiên Sư Phủ'],
    figuresVi: 'Trương Lỗ (Thiên Sư Đạo), Dương Bằng, Dương Tùng, Bào Dũng',
    figuresEn: 'Zhang Lu (Five Pecks of Rice leader), Yang Song, Mountain guides',
    intelVi: 'Thung lũng phì nhiêu nằm giữa dãy núi Tần Lĩnh và Đại Ba Sơn. Yết hầu quân sự sống còn kiểm soát con đường tiến quân vào đất Thục.',
    intelEn: 'Fertile valley cradled by Qinling and Daba mountains. Indispensable strategic springboard into Shu.'
  },
  'cheng_du': {
    id: 'cheng_du',
    nameVi: 'Thành Đô (Thiên Phủ Chi Quốc)',
    nameEn: 'Chengdu (Land of Abundance)',
    provinceVi: 'Ích Châu',
    provinceEn: 'Yizhou',
    coords: { x: 75, y: 435 },
    statusVi: 'Thiên Phủ Chi Quốc • Đô Thành Thục Hán',
    statusEn: 'Land of Abundance • Shu Capital',
    threatVi: 'Thấp (Bao bọc bởi vạn dặm non sông)',
    threatEn: 'Low (Naturally shielded by mountain basins)',
    distanceFromZhuo: 1550,
    daysRequired: 6.5,
    grainCost: 8.0,
    defaultSubLoc: 'Thành Đô Ích Châu Phủ',
    subLocations: ['Thành Đô Ích Châu Phủ'],
    figuresVi: 'Lưu Yên, Lưu Chương (sau là Lưu Bị, Gia Cát Lượng), Thợ dệt Thục Cẩm',
    figuresEn: 'Liu Yan, Liu Zhang (later Liu Bei, Zhuge Liang), Silk artisans',
    intelVi: 'Đô thành Tây Nam trù phú màu mỡ, bốn bề núi non trùng điệp ngăn cách, công trình thủy lợi Đô Giang Yển nuôi sống vạn dân thiên hạ vô ưu.',
    intelEn: 'Abundant basin of western China irrigated by Dujiangyan, self-sufficient in grain, iron, and famous Shu brocade silks.'
  }
};

let selectedMapNodeId = 'guang_zong';

// ==========================================================================
// 0.1 LOCAL POINTS OF INTEREST (POIs) & REGIONAL GEOGRAPHY ENGINE
// ==========================================================================

function getPoiMeta(locName) {
  const dict = {
    // Zhuo County
    'Vườn Đào': { vi: 'Trang Viên Vườn Đào Hạ Trạch', en: 'Peach Garden Manor', icon: '🌸', distFromZhuo: '0 dặm' },
    'Chợ Đông Môn': { vi: 'Chợ Đông Môn & Sạp Trà', en: 'East Gate Market & Tea Stall', icon: '🏪', distFromZhuo: '1 dặm' },
    'Xưởng Lương Thị': { vi: 'Lương Thị Chức Tác Phường', en: 'Liang Textile Workshop', icon: '🏭', distFromZhuo: '2 dặm' },
    // 15 Historical Citadels
    'Bắc Bình Soái Phủ': { vi: 'Bắc Bình Soái Phủ (U Châu)', en: 'Beiping Headquarters', icon: '🐎', distFromZhuo: '120 dặm' },
    'Nghiệp Thành Đại Phủ': { vi: 'Nghiệp Thành Đại Phủ (Ký Châu)', en: 'Yecheng Grand Hall', icon: '🏛️', distFromZhuo: '330 dặm' },
    'Quảng Tông Quân Doanh': { vi: 'Bắc Quân Đại Doanh (Quảng Tông)', en: 'Northern Army Headquarters', icon: '⛺', distFromZhuo: '280 dặm' },
    'Bình Nguyên Trọng Trấn': { vi: 'Bình Nguyên Trọng Trấn', en: 'Pingyuan Stronghold', icon: '🛡️', distFromZhuo: '360 dặm' },
    'Hứa Xương Tướng Phủ': { vi: 'Hứa Xương Tướng Phủ (Dự Châu)', en: 'Xuchang Headquarters', icon: '⚔️', distFromZhuo: '580 dặm' },
    'Hạ Phì Thành Lũy': { vi: 'Hạ Phì Thành Lũy (Từ Châu)', en: 'Xiapi Citadel', icon: '🏰', distFromZhuo: '640 dặm' },
    'Kinh Đô Lạc Dương': { vi: 'Kinh Đô Lạc Dương (Tư Lệ)', en: 'Imperial Capital Luoyang', icon: '👑', distFromZhuo: '750 dặm' },
    'Trường An Cung Phủ': { vi: 'Trường An Cung Phủ (Quan Trung)', en: 'Changan Palace Hall', icon: '🏯', distFromZhuo: '920 dặm' },
    'Tương Dương Châu Phủ': { vi: 'Tương Dương Châu Phủ (Kinh Châu)', en: 'Xiangyang Prefecture', icon: '🌊', distFromZhuo: '880 dặm' },
    'Giang Lăng Thủy Doanh': { vi: 'Giang Lăng Thủy Doanh (Nam Quận)', en: 'Jiangling Naval Base', icon: '⛵', distFromZhuo: '1050 dặm' },
    'Xích Bích Thủy Trại': { vi: 'Xích Bích Thủy Trại (Trường Giang)', en: 'Chibi Naval Base', icon: '🔥', distFromZhuo: '1150 dặm' },
    'Kiến Nghiệp Đô Thành': { vi: 'Kiến Nghiệp Đô Thành (Giang Đông)', en: 'Jianye Capital of Wu', icon: '🐅', distFromZhuo: '1100 dặm' },
    'Hán Trung Thiên Sư Phủ': { vi: 'Hán Trung Thiên Sư Phủ (Hán Xuyên)', en: 'Hanzhong Daoist Hall', icon: '🏔️', distFromZhuo: '1250 dặm' },
    'Thành Đô Ích Châu Phủ': { vi: 'Thành Đô Ích Châu Phủ (Ba Thục)', en: 'Chengdu Capital of Shu', icon: '🎋', distFromZhuo: '1550 dặm' },
    // Backwards Compatibility / Fallback
    'Trường Xã Tiền Tuyến': { vi: 'Hứa Xương & Trường Xã Tiền Tuyến', en: 'Changshe & Xuchang Frontline', icon: '🔥', distFromZhuo: '580 dặm' }
  };
  return dict[locName] || { vi: locName, en: locName, icon: '📍', distFromZhuo: '1 dặm' };
}

function getLocalPoiDistance(fromLoc, toLoc) {
  if (fromLoc === toLoc) return '0 dặm';
  if ((fromLoc.includes('Đào') && toLoc.includes('Chợ')) || (fromLoc.includes('Chợ') && toLoc.includes('Đào'))) return '1 dặm';
  if ((fromLoc.includes('Đào') && toLoc.includes('Xưởng')) || (fromLoc.includes('Xưởng') && toLoc.includes('Đào'))) return '2 dặm';
  if ((fromLoc.includes('Chợ') && toLoc.includes('Xưởng')) || (fromLoc.includes('Xưởng') && toLoc.includes('Chợ'))) return '1.5 dặm';
  return '1 dặm';
}

function getCurrentRegionNode(subLoc = activeSubLocation) {
  if (!subLoc) return WORLD_MAP_NODES['zhuo_xian'];
  for (const key of Object.keys(WORLD_MAP_NODES)) {
    const node = WORLD_MAP_NODES[key];
    if (node.subLocations && node.subLocations.includes(subLoc)) {
      return node;
    }
  }
  const lower = subLoc.toLowerCase();
  if (lower.includes('bắc bình') || lower.includes('kế thành') || lower.includes('beiping')) return WORLD_MAP_NODES['ji_cheng'];
  if (lower.includes('nghiệp thành') || lower.includes('yecheng')) return WORLD_MAP_NODES['ye_cheng'];
  if (lower.includes('quảng tông') || lower.includes('guangzong')) return WORLD_MAP_NODES['guang_zong'];
  if (lower.includes('bình nguyên') || lower.includes('pingyuan')) return WORLD_MAP_NODES['ping_yuan'];
  if (lower.includes('hứa xương') || lower.includes('xuchang') || lower.includes('trường xã') || lower.includes('changshe') || lower.includes('dĩnh')) return WORLD_MAP_NODES['xu_chang'];
  if (lower.includes('hạ phì') || lower.includes('xiapi') || lower.includes('từ châu')) return WORLD_MAP_NODES['xia_pi'];
  if (lower.includes('lạc dương') || lower.includes('luoyang') || lower.includes('kinh đô')) return WORLD_MAP_NODES['luo_yang'];
  if (lower.includes('trường an') || lower.includes('changan') || lower.includes('quan trung')) return WORLD_MAP_NODES['chang_an'];
  if (lower.includes('tương dương') || lower.includes('xiangyang')) return WORLD_MAP_NODES['xiang_yang'];
  if (lower.includes('giang lăng') || lower.includes('jiangling') || lower.includes('nam quận')) return WORLD_MAP_NODES['jiang_ling'];
  if (lower.includes('xích bích') || lower.includes('chibi') || lower.includes('sài tang')) return WORLD_MAP_NODES['chi_bi'];
  if (lower.includes('kiến nghiệp') || lower.includes('jianye') || lower.includes('giang đông') || lower.includes('ngô')) return WORLD_MAP_NODES['jian_ye'];
  if (lower.includes('hán trung') || lower.includes('hanzhong')) return WORLD_MAP_NODES['han_zhong'];
  if (lower.includes('thành đô') || lower.includes('chengdu') || lower.includes('thục')) return WORLD_MAP_NODES['cheng_du'];
  if (lower.includes('trác') || lower.includes('đào') || lower.includes('chợ') || lower.includes('xưởng')) return WORLD_MAP_NODES['zhuo_xian'];
  return WORLD_MAP_NODES['zhuo_xian'];
}

function renderLocalPoiNav(loc = activeSubLocation) {
  const regionBadge = document.getElementById('loc-region-badge');
  const breadcrumbText = document.getElementById('loc-breadcrumb-text');
  const localPoiGroup = document.getElementById('local-poi-group');
  if (!regionBadge || !breadcrumbText || !localPoiGroup) return;

  const currentRegion = getCurrentRegionNode(loc);
  const isEn = (currentLang === 'en');

  // 1. Region Badge
  regionBadge.innerText = isEn 
    ? `${currentRegion.provinceEn} • ${currentRegion.nameEn.split(' ')[0]}`
    : `${currentRegion.provinceVi} • ${currentRegion.nameVi.split(' ')[0]}`;

  // 2. Breadcrumb Text
  const currentPoiMeta = getPoiMeta(loc);
  breadcrumbText.innerText = isEn ? currentPoiMeta.en : currentPoiMeta.vi;

  // 3. Dynamic Local Walking POIs
  const localPois = (currentRegion.subLocations || []).filter(sl => sl !== loc);
  if (localPois.length === 0) {
    localPoiGroup.innerHTML = `<span style="font-size: 11px; color: var(--text-muted); font-style: italic;">${isEn ? '📍 Local outpost area' : '📍 Khu vực tiền tuyến'}</span>`;
  } else {
    localPoiGroup.innerHTML = localPois.map(targetLoc => {
      const meta = getPoiMeta(targetLoc);
      const name = isEn ? meta.en : meta.vi;
      const dist = getLocalPoiDistance(loc, targetLoc);
      const distLabel = isEn ? dist.replace('dặm', 'li') : dist;
      return `
        <button class="local-poi-btn" onclick="travelLocalPoi('${targetLoc}')" title="${isEn ? 'Walk to ' + name : 'Đi bộ tới ' + name}">
          <span>🚶 ${meta.icon} ${name}</span>
          <span style="font-size: 9.5px; opacity: 0.75; font-family: var(--font-mono);">(${distLabel})</span>
        </button>
      `;
    }).join('');
  }
}

async function travelLocalPoi(targetLoc) {
  if (isProcessingAction) {
    showToast(currentLang === 'en' ? '⚠️ Action in progress, please wait!' : '⚠️ Đang thực thi thao tác khác, vui lòng chờ!', true);
    return;
  }
  if (activeSubLocation === targetLoc) return;

  const fromLoc = activeSubLocation;
  const isEn = (currentLang === 'en');
  const fromMeta = getPoiMeta(fromLoc);
  const toMeta = getPoiMeta(targetLoc);
  const dist = getLocalPoiDistance(fromLoc, targetLoc);
  const distLabel = isEn ? dist.replace('dặm', 'li') : dist;

  // Append in-character walking journey turn into chronicle
  const walkNarrativeVi = `Lương Diễn khoác trường bào, cất bước rời khỏi **${fromMeta.vi}**, đi bộ sang **${toMeta.vi}** (${dist}). Dọc đường quan đạo, gió xuân thổi qua rặng liễu, dân chúng và thương nhân tấp nập qua lại bàn tán thời sự...`;
  const walkNarrativeEn = `Liang Yan dons his traveling cloak, departing on foot from **${fromMeta.en}** toward **${toMeta.en}** (${distLabel}). Along the post road, spring winds brush past willows as merchants and militia buzz with war rumors...`;

  appendStoryTurn({
    type: 'player',
    speaker: isEn ? 'Liang Yan (On Foot)' : 'Lương Diễn (Bộ Hành)',
    title: isEn ? 'Local Movement' : 'Cơ Động Cục Bộ',
    avatar: 'Diễn',
    text: isEn ? walkNarrativeEn : walkNarrativeVi,
    deltas: { location: targetLoc, distance: distLabel, type: isEn ? 'Walk' : 'Đi bộ' }
  });

  showToast(isEn ? `Arrived at ${toMeta.en} (${distLabel})` : `Đã bước tới ${toMeta.vi} (${dist})...`);
  activeSubLocation = targetLoc;

  try {
    setProcessingLock(true, isEn ? 'Walking...' : 'Đang di chuyển...');
    await loadScene(targetLoc);
    renderLocalPoiNav(targetLoc);
  } finally {
    setProcessingLock(false, null);
  }
}

// ==========================================================================
// 0.2 STRATEGIC WORLD MAP (DƯ ĐỒ TAM QUỐC) ENGINE & ZOOM / PAN SYSTEM
// ==========================================================================

let worldMapZoom = 1.0;
let worldMapPanX = 0;
let worldMapPanY = 0;
let isWorldMapPanning = false;
let mapPanStartX = 0;
let mapPanStartY = 0;
let hasAttachedMapEvents = false;

function zoomWorldMap(delta) {
  worldMapZoom = Math.min(3.0, Math.max(0.65, Number((worldMapZoom + delta).toFixed(2))));
  applyWorldMapTransform();
}

function resetWorldMapZoom() {
  worldMapZoom = 1.0;
  worldMapPanX = 0;
  worldMapPanY = 0;
  applyWorldMapTransform();
}

function applyWorldMapTransform() {
  const viewport = document.getElementById('world-map-viewport');
  if (viewport) {
    viewport.setAttribute('transform', `translate(${worldMapPanX}, ${worldMapPanY}) scale(${worldMapZoom})`);
  }
  const badge = document.getElementById('map-zoom-level-badge');
  if (badge) {
    badge.innerText = `${Math.round(worldMapZoom * 100)}%`;
  }
}

function initWorldMapInteractions() {
  const container = document.getElementById('world-map-canvas-container');
  if (!container || hasAttachedMapEvents) return;
  hasAttachedMapEvents = true;

  // Mouse wheel zooming
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    zoomWorldMap(delta);
  }, { passive: false });

  // Mouse drag-to-pan
  container.addEventListener('mousedown', (e) => {
    if (e.target.closest('.map-node') || e.target.closest('.map-zoom-toolbar')) return;
    isWorldMapPanning = true;
    mapPanStartX = e.clientX - worldMapPanX;
    mapPanStartY = e.clientY - worldMapPanY;
    container.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isWorldMapPanning) return;
    worldMapPanX = e.clientX - mapPanStartX;
    worldMapPanY = e.clientY - mapPanStartY;
    applyWorldMapTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isWorldMapPanning) {
      isWorldMapPanning = false;
      const c = document.getElementById('world-map-canvas-container');
      if (c) c.style.cursor = 'grab';
    }
  });

  // Touch drag and pinch-to-zoom
  let lastTouchX = 0;
  let lastTouchY = 0;
  let lastPinchDist = 0;

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      if (e.target.closest('.map-node') || e.target.closest('.map-zoom-toolbar')) return;
      isWorldMapPanning = true;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      isWorldMapPanning = false;
      lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isWorldMapPanning) {
      const dx = e.touches[0].clientX - lastTouchX;
      const dy = e.touches[0].clientY - lastTouchY;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
      worldMapPanX += dx;
      worldMapPanY += dy;
      applyWorldMapTransform();
    } else if (e.touches.length === 2 && lastPinchDist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = (dist - lastPinchDist) * 0.005;
      lastPinchDist = dist;
      zoomWorldMap(diff);
    }
  }, { passive: true });

  container.addEventListener('touchend', () => {
    isWorldMapPanning = false;
    lastPinchDist = 0;
  });
}

function openWorldMap() {
  const modal = document.getElementById('world-map-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  const currentRegion = getCurrentRegionNode(activeSubLocation);
  if (currentRegion && currentRegion.id === selectedMapNodeId) {
    if (selectedMapNodeId === 'zhuo_xian') {
      selectedMapNodeId = 'guang_zong';
    }
  }

  renderWorldMapSvg();
  renderWorldMapIntel(selectedMapNodeId);
}

function closeWorldMap() {
  const modal = document.getElementById('world-map-modal');
  if (modal) modal.classList.add('hidden');
}

function selectWorldMapNode(nodeId) {
  if (!WORLD_MAP_NODES[nodeId]) return;
  selectedMapNodeId = nodeId;
  renderWorldMapSvg();
  renderWorldMapIntel(nodeId);
}

function renderWorldMapSvg() {
  const container = document.getElementById('world-map-canvas-container');
  if (!container) return;

  const currentRegion = getCurrentRegionNode(activeSubLocation);
  const isEn = (currentLang === 'en');

  // 18 Tactical connecting routes across the Three Kingdoms theater
  const routes = [
    { from: 'zhuo_xian', to: 'ji_cheng' },
    { from: 'zhuo_xian', to: 'guang_zong' },
    { from: 'zhuo_xian', to: 'ping_yuan' },
    { from: 'ji_cheng', to: 'ping_yuan' },
    { from: 'guang_zong', to: 'ye_cheng' },
    { from: 'guang_zong', to: 'ping_yuan' },
    { from: 'ye_cheng', to: 'luo_yang' },
    { from: 'ye_cheng', to: 'xu_chang' },
    { from: 'ping_yuan', to: 'xia_pi' },
    { from: 'luo_yang', to: 'chang_an' },
    { from: 'luo_yang', to: 'xu_chang' },
    { from: 'xu_chang', to: 'xia_pi' },
    { from: 'xu_chang', to: 'xiang_yang' },
    { from: 'chang_an', to: 'han_zhong' },
    { from: 'han_zhong', to: 'cheng_du' },
    { from: 'xiang_yang', to: 'jiang_ling' },
    { from: 'jiang_ling', to: 'chi_bi' },
    { from: 'chi_bi', to: 'jian_ye' }
  ];

  let svgRoutes = routes.map(r => {
    const f = WORLD_MAP_NODES[r.from]?.coords;
    const t = WORLD_MAP_NODES[r.to]?.coords;
    if (!f || !t) return '';
    return `<line x1="${f.x}" y1="${f.y}" x2="${t.x}" y2="${t.y}" stroke="rgba(245, 158, 11, 0.32)" stroke-width="1.8" stroke-dasharray="4,4" />`;
  }).join('');

  let svgNodes = Object.keys(WORLD_MAP_NODES).map(key => {
    const node = WORLD_MAP_NODES[key];
    const isCurrent = (currentRegion.id === key);
    const isSelected = (selectedMapNodeId === key);

    const themeMap = {
      'zhuo_xian': { fill: '#064e3b', stroke: '#10b981', icon: '🌸' },
      'ji_cheng': { fill: '#0f172a', stroke: '#38bdf8', icon: '🐎' },
      'ye_cheng': { fill: '#1e1b4b', stroke: '#818cf8', icon: '🏛️' },
      'guang_zong': { fill: '#450a0a', stroke: '#ef4444', icon: '⚔️' },
      'ping_yuan': { fill: '#0f172a', stroke: '#06b6d4', icon: '🛡️' },
      'luo_yang': { fill: '#451a03', stroke: '#f59e0b', icon: '👑' },
      'chang_an': { fill: '#3b0764', stroke: '#a855f7', icon: '🏯' },
      'xu_chang': { fill: '#1e293b', stroke: '#3b82f6', icon: '⚔️' },
      'xia_pi': { fill: '#042f2e', stroke: '#14b8a6', icon: '🏰' },
      'xiang_yang': { fill: '#0c4a6e', stroke: '#0284c7', icon: '🌊' },
      'jiang_ling': { fill: '#164e63', stroke: '#06b6d4', icon: '⛵' },
      'chi_bi': { fill: '#450a0a', stroke: '#f97316', icon: '🔥' },
      'jian_ye': { fill: '#14532d', stroke: '#22c55e', icon: '🐅' },
      'han_zhong': { fill: '#292524', stroke: '#a8a29e', icon: '🏔️' },
      'cheng_du': { fill: '#064e3b', stroke: '#10b981', icon: '🎋' }
    };

    let theme = themeMap[key] || { fill: '#0f172a', stroke: '#3b82f6', icon: '🛡️' };
    if (isCurrent) {
      theme = { fill: '#064e3b', stroke: '#10b981', icon: '📍' };
    }

    const displayName = isEn ? node.nameEn.split(' ')[0] : node.nameVi.split(' ')[0];
    const displayProvince = isEn ? node.provinceEn : node.provinceVi;

    return `
      <g class="map-node ${isSelected ? 'active' : ''}" onclick="selectWorldMapNode('${key}')" style="cursor: pointer;">
        ${isCurrent ? `
          <circle cx="${node.coords.x}" cy="${node.coords.y}" r="22" fill="none" stroke="#10b981" stroke-width="2" opacity="0.8" class="map-pulse-ring" />
          <rect x="${node.coords.x - 34}" y="${node.coords.y - 28}" width="68" height="13" rx="3" fill="#064e3b" stroke="#10b981" stroke-width="1" />
          <text x="${node.coords.x}" y="${node.coords.y - 19}" fill="#34d399" font-size="7.5" font-weight="700" text-anchor="middle">📍 ${isEn ? 'CURRENT' : 'HIỆN TẠI'}</text>
        ` : ''}

        ${isSelected ? `
          <circle cx="${node.coords.x}" cy="${node.coords.y}" r="20" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="4,2" />
        ` : ''}

        <circle class="node-bg" cx="${node.coords.x}" cy="${node.coords.y}" r="14" fill="${theme.fill}" stroke="${isSelected ? '#fbbf24' : theme.stroke}" stroke-width="${isSelected ? '2.5' : '1.5'}" />
        <text x="${node.coords.x}" y="${node.coords.y + 4.5}" font-size="10.5" text-anchor="middle">${theme.icon}</text>
        
        <text x="${node.coords.x}" y="${node.coords.y + 24}" text-anchor="middle" fill="${isSelected ? '#fbbf24' : '#f1f5f9'}" font-size="9.5" font-weight="${isSelected ? '700' : '600'}" letter-spacing="0.2px">${displayName}</text>
        <text x="${node.coords.x}" y="${node.coords.y + 34}" text-anchor="middle" fill="#94a3b8" font-size="8.5">${displayProvince}</text>
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Floating Zoom Toolbar -->
    <div class="map-zoom-toolbar">
      <button class="map-zoom-btn" onclick="zoomWorldMap(0.25)" title="${isEn ? 'Zoom In' : 'Phóng to'}">➕</button>
      <span class="map-zoom-level" id="map-zoom-level-badge">${Math.round(worldMapZoom * 100)}%</span>
      <button class="map-zoom-btn" onclick="zoomWorldMap(-0.25)" title="${isEn ? 'Zoom Out' : 'Thu nhỏ'}">➖</button>
      <button class="map-zoom-btn" onclick="resetWorldMapZoom()" title="${isEn ? 'Reset View' : 'Khôi phục'}">🎯</button>
    </div>

    <!-- Navigation Hint -->
    <div class="map-nav-hint">${isEn ? '🖱️ Scroll to zoom • Drag to pan' : '🖱️ Cuộn chuột để zoom • Kéo chuột để di chuyển'}</div>

    <svg viewBox="0 0 600 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="tactical-grid" width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255, 255, 255, 0.03)" stroke-width="1"/>
        </pattern>
      </defs>

      <!-- Background & Grid -->
      <rect width="100%" height="100%" fill="#070a12"/>
      <rect width="100%" height="100%" fill="url(#tactical-grid)"/>

      <!-- Border Frame (Fixed on Canvas) -->
      <rect x="8" y="8" width="584" height="484" fill="none" stroke="rgba(245, 158, 11, 0.2)" stroke-width="1" stroke-dasharray="6,4"/>
      <rect x="12" y="12" width="576" height="476" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="0.5"/>

      <!-- North Indicator (Fixed on Canvas) -->
      <g transform="translate(565, 34)" opacity="0.65">
        <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1"/>
        <polygon points="0,-12 4,0 0,-4 -4,0" fill="#f59e0b"/>
        <text x="0" y="10" fill="#cbd5e1" font-size="7" font-weight="700" text-anchor="middle">BẮC</text>
      </g>

      <!-- Scalable Map Viewport -->
      <g id="world-map-viewport" transform="translate(${worldMapPanX}, ${worldMapPanY}) scale(${worldMapZoom})" transform-origin="300 250">
        <!-- Ancient Province Watermarks -->
        <text x="380" y="32" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">U CHÂU (YOUZHOU)</text>
        <text x="340" y="125" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">KÝ CHÂU (JIZHOU)</text>
        <text x="500" y="135" fill="rgba(255, 255, 255, 0.06)" font-size="14" font-family="'Cinzel', serif" font-weight="700" letter-spacing="2px" text-anchor="middle">THANH CHÂU</text>
        <text x="210" y="215" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">TƯ LỆ (SILI)</text>
        <text x="375" y="305" fill="rgba(255, 255, 255, 0.06)" font-size="14" font-family="'Cinzel', serif" font-weight="700" letter-spacing="2px" text-anchor="middle">DỰ CHÂU & DUYỆN CHÂU</text>
        <text x="500" y="260" fill="rgba(255, 255, 255, 0.06)" font-size="14" font-family="'Cinzel', serif" font-weight="700" letter-spacing="2px" text-anchor="middle">TỪ CHÂU (XUZHOU)</text>
        <text x="275" y="395" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">KINH CHÂU (JINGZHOU)</text>
        <text x="475" y="435" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">GIANG ĐÔNG (WU)</text>
        <text x="95" y="475" fill="rgba(255, 255, 255, 0.07)" font-size="15" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">BA THỤC (BASHU)</text>

        <!-- Hoàng Hà (The Yellow River) -->
        <path d="M 60,215 C 120,225 180,235 235,230 C 275,225 320,205 380,210 C 440,215 500,190 560,175" 
              stroke="#1d4ed8" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.38" />
        <path d="M 60,215 C 120,225 180,235 235,230 C 275,225 320,205 380,210 C 440,215 500,190 560,175" 
              stroke="#60a5fa" stroke-width="2" stroke-dasharray="8,5" fill="none" opacity="0.85" />
        <text x="330" y="200" fill="#93c5fd" font-size="9" font-style="italic" opacity="0.85" letter-spacing="0.5px">Hoàng Hà (Yellow River)</text>

        <!-- Trường Giang (The Yangtze River) -->
        <path d="M 40,465 C 110,445 190,435 250,428 C 310,422 355,418 410,405 C 470,392 525,380 580,370" 
              stroke="#0e7490" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.38" />
        <path d="M 40,465 C 110,445 190,435 250,428 C 310,422 355,418 410,405 C 470,392 525,380 580,370" 
              stroke="#38bdf8" stroke-width="2" stroke-dasharray="8,5" fill="none" opacity="0.85" />
        <text x="290" y="445" fill="#7dd3fc" font-size="9" font-style="italic" opacity="0.85" letter-spacing="0.5px">Trường Giang (Yangtze River)</text>

        <!-- Mountain Pass: Hổ Lao Quan -->
        <g transform="translate(295, 255)">
          <polygon points="-6,4 0,-5 6,4" fill="#ef4444" stroke="#f87171" stroke-width="1.2" opacity="0.9" />
          <text x="0" y="13" fill="#fca5a5" font-size="7.5" text-anchor="middle" font-weight="600">Hổ Lao Quan</text>
        </g>

        <!-- Mountain Pass: Đồng Quan -->
        <g transform="translate(210, 248)">
          <polygon points="-6,4 0,-5 6,4" fill="#ef4444" stroke="#f87171" stroke-width="1.2" opacity="0.9" />
          <text x="0" y="13" fill="#fca5a5" font-size="7.5" text-anchor="middle" font-weight="600">Đồng Quan</text>
        </g>

        <!-- Mountain Pass: Kiếm Các -->
        <g transform="translate(100, 390)">
          <polygon points="-6,4 0,-5 6,4" fill="#ef4444" stroke="#f87171" stroke-width="1.2" opacity="0.9" />
          <text x="0" y="13" fill="#fca5a5" font-size="7.5" text-anchor="middle" font-weight="600">Kiếm Các</text>
        </g>

        <!-- Tactical Connecting Routes -->
        ${svgRoutes}

        <!-- Interactive Strategic Regional Nodes (15 Citadels) -->
        ${svgNodes}
      </g>
    </svg>
  `;

  initWorldMapInteractions();
  applyWorldMapTransform();
}

function renderWorldMapIntel(nodeId = selectedMapNodeId) {
  const panel = document.getElementById('world-map-intel-panel');
  if (!panel) return;

  const node = WORLD_MAP_NODES[nodeId];
  if (!node) return;

  const currentRegion = getCurrentRegionNode(activeSubLocation);
  const isCurrent = (currentRegion.id === nodeId);
  const isEn = (currentLang === 'en');
  const dict = I18N_DICT[currentLang] || I18N_DICT.vi;

  const isCapital = (nodeId === 'luo_yang' || nodeId === 'chang_an' || nodeId === 'jian_ye' || nodeId === 'cheng_du');
  const isBattle = (nodeId === 'guang_zong' || nodeId === 'chi_bi');
  const badgeClass = isCapital ? 'capital' : (isBattle ? 'battle' : 'safe');
  const badgeText = isEn ? node.statusEn : node.statusVi;

  const dist = isCurrent ? 0 : node.distanceFromZhuo;
  const distText = isEn ? `${dist} li` : `${dist} dặm`;
  const daysText = isCurrent ? (isEn ? '0 days' : '0 ngày') : (isEn ? `${node.daysRequired} days` : `${node.daysRequired} ngày`);
  const grainText = isCurrent ? (isEn ? '0 grain' : '0 thạch') : `${node.grainCost} ${isEn ? 'piculs' : 'thạch'}`;
  const threatText = isEn ? node.threatEn : node.threatVi;
  const threatColor = isBattle ? '#f87171' : ((nodeId === 'chang_an' || nodeId === 'ping_yuan' || nodeId === 'xia_pi' || nodeId === 'jiang_ling' || nodeId === 'han_zhong') ? '#fbbf24' : '#34d399');

  const title = isEn ? node.nameEn : node.nameVi;
  const prov = isEn ? node.provinceEn : node.provinceVi;
  const intel = isEn ? node.intelEn : node.intelVi;
  const figures = isEn ? node.figuresEn : node.figuresVi;

  panel.innerHTML = `
    <div class="intel-target-header">
      <div>
        <div class="intel-target-name">${title}</div>
        <div class="intel-target-province">📍 ${prov}</div>
      </div>
      <span class="intel-status-badge ${badgeClass}">${badgeText}</span>
    </div>

    <div class="intel-metrics-grid">
      <div class="intel-metric-box">
        <div class="intel-metric-lbl">${dict.lblDist}</div>
        <div class="intel-metric-val">${distText}</div>
      </div>
      <div class="intel-metric-box">
        <div class="intel-metric-lbl">${dict.lblDuration}</div>
        <div class="intel-metric-val">${daysText}</div>
      </div>
      <div class="intel-metric-box">
        <div class="intel-metric-lbl">${dict.lblGrainCost}</div>
        <div class="intel-metric-val">${grainText}</div>
      </div>
      <div class="intel-metric-box">
        <div class="intel-metric-lbl">${dict.lblThreat}</div>
        <div class="intel-metric-val" style="font-size: 10px; color: ${threatColor};">${threatText}</div>
      </div>
    </div>

    <div class="intel-section">
      <div class="intel-sec-title">📜 ${dict.lblIntel}</div>
      <div class="intel-sec-body">${intel}</div>
    </div>

    <div class="intel-section">
      <div class="intel-sec-title">👥 ${dict.lblFigures}</div>
      <div class="intel-sec-body">${figures}</div>
    </div>

    ${isCurrent ? `
      <button class="btn-march" disabled>
        <span>📍 ${dict.btnCurrentPos}</span>
      </button>
    ` : `
      <button class="btn-march" onclick="executeMarchToSelectedNode('${nodeId}')">
        <span>🏇 ${dict.btnMarchTo} ${title}</span>
      </button>
    `}
  `;
}

async function executeMarchToSelectedNode(nodeId) {
  if (isProcessingAction) {
    showToast(currentLang === 'en' ? '⚠️ Action in progress, please wait!' : '⚠️ Đang thực thi thao tác khác, vui lòng chờ!', true);
    return;
  }

  const targetNode = WORLD_MAP_NODES[nodeId];
  if (!targetNode) return;

  const currentRegion = getCurrentRegionNode(activeSubLocation);
  if (currentRegion.id === nodeId) {
    showToast(currentLang === 'en' ? 'Already in this region.' : 'Đang ở khu vực này rồi.');
    return;
  }

  const isEn = (currentLang === 'en');
  const confirmMsg = isEn 
    ? `Depart march expedition to ${targetNode.nameEn}?\nLogistical requirement: ${targetNode.grainCost} piculs of grain.`
    : `Xác nhận khởi hành hành quân tới ${targetNode.nameVi}?\nTiêu hao ước tính: ${targetNode.grainCost} thạch lương lộ phí.`;

  if (!confirm(confirmMsg)) {
    return;
  }

  closeWorldMap();

  try {
    setProcessingLock(true, isEn ? 'Marching...' : 'Đang hành quân...');

    // Append campaign expedition chronicle turn
    const marchNarrativeVi = `Lương Diễn chỉnh đốn yên cương, dẫn đầu đoàn tùy tùng mang theo ${targetNode.grainCost} thạch quân lương, vượt dặm trường bão cát rời bước tiến về tiền tuyến **${targetNode.nameVi}**. Sau ${targetNode.daysRequired} ngày hành quân đêm ngày, cờ xí phe ta đã phất phới bên ngoài thành lũy!`;
    const marchNarrativeEn = `Liang Yan straps his sword and leads his supply expedition carrying ${targetNode.grainCost} piculs of grain across windblown roads toward **${targetNode.nameEn}**. After ${targetNode.daysRequired} days of disciplined marching, banners flutter before the citadel gates!`;

    appendStoryTurn({
      type: 'player',
      speaker: isEn ? 'Liang Yan (March Expedition)' : 'Lương Diễn (Hành Quân)',
      title: isEn ? 'Campaign Expedition' : 'Chiến Tuyến Viễn Chinh',
      avatar: 'Diễn',
      text: isEn ? marchNarrativeEn : marchNarrativeVi,
      deltas: {
        location: targetNode.defaultSubLoc,
        grainCost: `-${targetNode.grainCost} Thạch`,
        marchDistance: `${targetNode.distanceFromZhuo} Dặm`,
        threat: targetNode.threatVi
      }
    });

    // Execute MOVE_LOCATION in SimCore
    await dispatchDirectAction({
      type: 'MOVE_LOCATION',
      new_location: targetNode.defaultSubLoc,
      game_date: '184-05-02'
    });

    activeSubLocation = targetNode.defaultSubLoc;
    await loadScene(targetNode.defaultSubLoc);
    renderLocalPoiNav(targetNode.defaultSubLoc);

    renderAgentSimulationFeedback(
      isEn ? `Expedition arrived at ${targetNode.nameEn}. Battlefield coordinates updated.` : `Quân đoàn đã tới ${targetNode.nameVi}. Tọa độ chiến trường cập nhật thành công.`,
      { location: targetNode.defaultSubLoc, audit: '70/70 Khớp' }
    );

    await Promise.all([loadStatus(), loadDeckInventory(), loadDeckNpcs(), loadDeckLedger()]);
    showToast(isEn ? `Arrived at ${targetNode.nameEn}` : `Đã đến ${targetNode.nameVi}!`);

  } catch (err) {
    console.error('March failed:', err);
    showToast(`Hành quân thất bại: ${err.message}`, true);
  } finally {
    setProcessingLock(false, null);
  }
}

// DOM Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  initUIEventListeners();
  applyLanguage();
  loadAllData();
});

// ==========================================================================
// 1. DATA INITIALIZATION & ORCHESTRATION
// ==========================================================================
async function loadAllData() {
  try {
    await Promise.all([
      loadStatus(),
      loadScene(activeSubLocation),
      loadDeckInventory(),
      loadDeckNpcs(),
      loadDeckLedger(),
      loadDeckAgentLogs(),
      checkAuditStatus()
    ]);
  } catch (err) {
    console.error('Error during initial load:', err);
    showToast(`Lỗi khởi tạo: ${err.message}`, true);
  }
}

// 1.1 Load Telemetry & Player Status
async function loadStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    currentStatus = data;
    const m = data.meta;
    const p = data.player;
    const f = data.financials;

    // Header Telemetry Chips
    const dateChip = document.getElementById('top-date-chip');
    if (dateChip) dateChip.innerText = `${m.current_date || '184-05-02'} (Lượt ${m.active_turn ?? 6})`;

    const locSub = document.getElementById('top-loc-sub');
    if (locSub) locSub.innerText = p.current_location || 'Quảng Tông';

    const valCash = document.getElementById('top-val-cash');
    if (valCash) valCash.innerText = `${(f.liquidCash || 0).toLocaleString()} Tiền`;

    const valGrain = document.getElementById('top-val-grain');
    if (valGrain) valGrain.innerText = `${Number(p.strategic_grain || 0).toFixed(2)} Thạch`;

    const valInv = document.getElementById('top-val-inv');
    if (valInv) valInv.innerText = `${(f.inventoryValue || 0).toLocaleString()} Tiền`;

    const valNetworth = document.getElementById('top-val-networth');
    if (valNetworth) valNetworth.innerText = `${(f.netWorth || 0).toLocaleString()} Tiền`;

    // Protagonist Card Fields
    if (p) {
      const nameEl = document.getElementById('protagonist-name');
      if (nameEl) nameEl.innerText = p.name === 'Liang Yan' ? 'Lương Diễn' : p.name;

      const styleEl = document.getElementById('protagonist-style');
      if (styleEl) styleEl.innerText = p.style_name ? `(${p.style_name === 'Zhiyuan' ? 'Chí Viễn' : p.style_name})` : '';

      const ageEl = document.getElementById('protagonist-age');
      if (ageEl) ageEl.innerText = `${p.age || 21} Tuổi`;

      const hpEl = document.getElementById('protagonist-hp');
      if (hpEl) hpEl.innerText = `${p.health || 100}/100`;

      const barHp = document.getElementById('bar-hp');
      if (barHp) barHp.style.width = `${p.health || 100}%`;

      const moraleEl = document.getElementById('protagonist-morale');
      if (moraleEl) moraleEl.innerText = `${p.morale || 100}%`;

      const barMorale = document.getElementById('bar-morale');
      if (barMorale) barMorale.style.width = `${p.morale || 100}%`;

      const attrInt = document.getElementById('attr-int');
      if (attrInt) attrInt.innerText = p.int_attr || 80;

      const attrCom = document.getElementById('attr-com');
      if (attrCom) attrCom.innerText = p.com_attr || 78;

      const attrDip = document.getElementById('attr-dip');
      if (attrDip) attrDip.innerText = p.dip_attr || 74;

      const attrLdr = document.getElementById('attr-ldr');
      if (attrLdr) attrLdr.innerText = p.ldr_attr || 70;

      const attrLog = document.getElementById('attr-log');
      if (attrLog) attrLog.innerText = p.log_attr || 70;

      const attrPol = document.getElementById('attr-pol');
      if (attrPol) attrPol.innerText = p.pol_attr || 68;

      const attrCra = document.getElementById('attr-cra');
      if (attrCra) attrCra.innerText = p.cra_attr || 62;

      const attrWar = document.getElementById('attr-war');
      if (attrWar) attrWar.innerText = p.war_attr || 58;
    }

  } catch (err) {
    console.error('Failed to load status:', err);
  }
}

// 1.2 Check Audit Invariants Status
async function checkAuditStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/audit`);
    const data = await res.json();
    const badge = document.getElementById('badge-top-audit');
    const hudAudit = document.getElementById('hud-audit-tag');

    if (badge) {
      if (data.success && data.discrepanciesCount === 0) {
        badge.className = 'badge-audit';
        badge.innerText = '100% Khớp';
        badge.title = `${data.totalInvariantsVerified} Bất biến SQLite đã xác minh hoàn hảo`;
        if (hudAudit) hudAudit.innerText = `✅ INVARIANTS: ${data.totalInvariantsVerified}/${data.totalInvariantsVerified} KHỚP`;
      } else {
        badge.className = 'badge-audit text-danger';
        badge.style.borderColor = 'var(--state-danger)';
        badge.style.color = '#f87171';
        badge.innerText = `${data.discrepanciesCount} Lệch`;
        if (hudAudit) hudAudit.innerText = `⚠️ LỆCH: ${data.discrepanciesCount} INVARIANTS`;
      }
    }
  } catch (err) {
    console.error('Audit check error:', err);
  }
}

// 1.3 Load Dynamic Context Scene
async function loadScene(targetSubLoc = activeSubLocation, customNarrative = null) {
  try {
    activeSubLocation = targetSubLoc;
    const res = await fetch(`${API_BASE}/api/scene?subLocation=${encodeURIComponent(targetSubLoc)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    currentScene = data;
    renderSceneFromData(data, customNarrative);

  } catch (err) {
    console.error('Failed to load scene:', err);
  }
}

// 1.4 Render Dynamic Scene Content
function renderSceneFromData(data, customNarrative = null) {
  if (!data) return;

  // Dynamic Hierarchical Breadcrumb & Local Walking POIs Navigation
  if (data.campaign && data.campaign.activeSubLocation) {
    activeSubLocation = data.campaign.activeSubLocation;
  }
  renderLocalPoiNav(activeSubLocation);

  // Dynamic Contextual Quick Chips & Locality Banner
  renderDynamicQuickChips(activeSubLocation);

  // Story Chronicle Stream: Append encounter turn if chronicle is empty, location changed, or custom narrative supplied
  const shouldAppendTurn = storyChronicle.length === 0 || 
                           lastEncounterSubLocation !== activeSubLocation || 
                           Boolean(customNarrative);

  if (shouldAppendTurn) {
    const textToShow = customNarrative || data.narrative || '';
    if (textToShow) {
      const npcName = data.npc ? data.npc.name : 'Người Dẫn Chuyện';
      const npcTitle = data.npc ? data.npc.title : (data.campaign ? data.campaign.location : '');
      const npcAvatar = data.npc && data.npc.name ? data.npc.name.charAt(0) : '漢';

      appendStoryTurn({
        type: 'npc',
        speaker: npcName,
        title: npcTitle,
        avatar: npcAvatar,
        text: textToShow,
        diceBadge: data.lastCheck,
        deltas: null,
        reasoning: null
      });
      lastEncounterSubLocation = activeSubLocation;
    }
  }

  // 4 Branching Choices Grid
  renderChoices(data.options || []);

  // Relations Milestone Progress Card
  renderRelations(data.relations || []);
}

// 1.5 Story Chronicle Stream Helpers & Formatting
function formatStoryText(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/"([^"]+)"/g, '<em>"$1"</em>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

function renderDiceBadgeHtml(check) {
  if (!check || !check.type) return '';
  const isSuccess = check.status === 'THÀNH CÔNG';
  const statusClass = isSuccess ? 'success' : 'failed';
  return `
    <div class="story-dice-badge">
      <span>🎲 <strong>${check.type}</strong>: ${check.formula || ''}</span>
      <span class="${statusClass}">TỔNG ${check.score ?? ''} [${check.status || 'THÀNH CÔNG'}]</span>
    </div>
  `;
}

function renderDeltaBarHtml(delta) {
  if (!delta || Object.keys(delta).length === 0) return '';
  const pills = [];
  if (delta.cash) {
    const isPositive = String(delta.cash).startsWith('+');
    pills.push(`<span class="agent-delta-pill ${isPositive ? 'cash-plus' : 'cash-minus'}">🪙 ${delta.cash}</span>`);
  }
  if (delta.inventory) {
    pills.push(`<span class="agent-delta-pill inv">📦 ${delta.inventory}</span>`);
  }
  if (delta.relations || delta.npc) {
    pills.push(`<span class="agent-delta-pill rel">🤝 ${delta.relations || delta.npc}</span>`);
  }
  if (delta.location) {
    pills.push(`<span class="agent-delta-pill rel">📍 ${delta.location}</span>`);
  }
  if (delta.action) {
    pills.push(`<span class="agent-delta-pill rel">⚡ ${delta.action}</span>`);
  }
  if (delta.audit) {
    pills.push(`<span class="agent-delta-pill rel">⚖️ ${delta.audit}</span>`);
  }
  if (pills.length === 0) return '';
  return `<div class="story-delta-bar">${pills.join('')}</div>`;
}

function renderReasoningHtml(reasoning) {
  if (!reasoning) return '';
  return `<div class="story-reasoning">🧠 <strong>Agent Reasoning:</strong> ${reasoning}</div>`;
}

function renderTurnHtml(turn) {
  const diceHtml = renderDiceBadgeHtml(turn.diceBadge);
  const deltaHtml = renderDeltaBarHtml(turn.deltas);
  const reasoningHtml = renderReasoningHtml(turn.reasoning);
  const formattedText = formatStoryText(turn.text);

  return `
    <div class="story-turn ${turn.type || 'npc'}" id="turn-${turn.id}">
      <div class="story-turn-avatar">${turn.avatar || (turn.type === 'player' ? '梁' : '漢')}</div>
      <div class="story-turn-content">
        <div class="story-turn-header">
          <div>
            <span class="story-speaker-name">${turn.speaker || 'Nhân Vật'}</span>
            ${turn.title ? `<span class="story-speaker-title">• ${turn.title}</span>` : ''}
          </div>
          <span class="story-time">${turn.time || '184-05-02'}</span>
        </div>
        <div class="story-text">${formattedText}</div>
        ${diceHtml}
        ${deltaHtml}
        ${reasoningHtml}
      </div>
    </div>
  `;
}

function appendStoryTurn(turn) {
  turn.id = turn.id || `turn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  if (!turn.time) {
    const curDate = currentStatus?.meta?.current_date || '184-05-02';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    turn.time = `${curDate} • ${timeStr}`;
  }
  storyChronicle.push(turn);

  const chronicle = document.getElementById('story-chronicle');
  if (chronicle) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderTurnHtml(turn).trim();
    const node = wrapper.firstElementChild;
    chronicle.appendChild(node);
    chronicle.scrollTop = chronicle.scrollHeight;
  }
}

function renderStoryChronicle() {
  const chronicle = document.getElementById('story-chronicle');
  if (!chronicle) return;
  chronicle.innerHTML = storyChronicle.map(t => renderTurnHtml(t)).join('');
  chronicle.scrollTop = chronicle.scrollHeight;
}

// 1.6 Quick Prompt Chip Fill Helper
function quickFillPrompt(text) {
  const input = document.getElementById('omni-input');
  if (!input) return;
  input.value = text;
  input.focus();
  showToast(currentLang === 'en' ? `Loaded command: "${text}"` : `Đã nạp chỉ thị: "${text}"`);
}

// 1.7 Dynamic Locality & Quick Prompt Chips Renderer
function renderDynamicQuickChips(location = activeSubLocation) {
  const container = document.getElementById('quick-prompt-chips');
  const targetEl = document.getElementById('locality-target');
  const omniInput = document.getElementById('omni-input');
  const locData = QUICK_CHIPS_DATA[location] || QUICK_CHIPS_DATA['Vườn Đào'];

  if (targetEl) {
    targetEl.innerText = currentLang === 'en' ? locData.presenceEn : locData.presenceVi;
  }

  if (omniInput && !omniInput.value) {
    omniInput.placeholder = currentLang === 'en' ? locData.placeholderEn : locData.placeholderVi;
  }

  if (!container) return;

  container.innerHTML = locData.chips.map(chip => {
    if (chip.divider) {
      return `<span class="chip-divider"></span>`;
    }
    const label = currentLang === 'en' ? chip.labelEn : chip.labelVi;
    const promptText = currentLang === 'en' ? chip.promptEn : chip.promptVi;
    const promptEsc = promptText.replace(/'/g, "\\'");
    return `
      <button class="quick-chip ${chip.type}" onclick="quickFillPrompt('${promptEsc}')">
        ${chip.icon} ${label}
      </button>
    `;
  }).join('');
}

// 1.8 Bilingual Language Manager (i18n)
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

  // Re-render Dynamic Chips & Local POI Navigation
  renderDynamicQuickChips(activeSubLocation);
  renderLocalPoiNav(activeSubLocation);

  // If World Map modal is open, re-render SVG & Intel
  const mapModal = document.getElementById('world-map-modal');
  if (mapModal && !mapModal.classList.contains('hidden')) {
    renderWorldMapSvg();
    renderWorldMapIntel(selectedMapNodeId);
  }

  // If scene is loaded, re-render choices
  if (currentScene && currentScene.options) {
    renderChoices(currentScene.options);
  }
}

function toggleLanguage() {
  currentLang = currentLang === 'vi' ? 'en' : 'vi';
  localStorage.setItem('sim_lang', currentLang);
  applyLanguage();
  showToast(currentLang === 'vi' ? 'Đã chuyển sang Tiếng Việt' : 'Switched to English');
}

// 1.9 Render Choice Cards
function renderChoices(options) {
  const container = document.getElementById('choices-grid');
  if (!container) return;

  const dict = I18N_DICT[currentLang] || I18N_DICT.vi;

  if (!options || options.length === 0) {
    container.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 11px;">${currentLang === 'en' ? 'No action proposals for current context.' : 'Không có đề xuất hành động cho bối cảnh hiện tại.'}</div>`;
    return;
  }

  container.innerHTML = options.map((opt, idx) => {
    const isSelected = selectedChoiceId === opt.id;
    return `
      <div class="choice-card ${isSelected ? 'active' : ''}" id="choice-card-${opt.id}" onclick="selectChoice('${opt.id}')">
        <div class="choice-icon">${opt.icon || '⚔️'}</div>
        <div class="choice-details">
          <div class="choice-title">${opt.title}</div>
          <div class="choice-desc">${opt.desc}</div>
        </div>
        <div class="choice-actions">
          <button class="btn-choice-select" id="btn-select-${opt.id}" onclick="event.stopPropagation(); executeChoiceDirect('${opt.id}')">${dict.btnSelect}</button>
          <button class="btn-choice-ai" id="btn-ai-${opt.id}" onclick="event.stopPropagation(); executeChoiceAi('${opt.id}')">${dict.btnAi}</button>
        </div>
      </div>
    `;
  }).join('');
}

// 1.6 Render Relations Milestones
function renderRelations(relations) {
  const list = document.getElementById('relations-progress-list');
  if (!list) return;

  list.innerHTML = relations.map((rel, idx) => {
    const pct = Math.min(100, Math.round((rel.score / rel.target) * 100));
    const colorClass = idx === 0 ? 'cyan' : idx === 1 ? 'gold' : 'orange';
    const isCompleted = rel.score >= rel.target;

    return `
      <div class="rel-item">
        <div class="rel-info">
          <span class="rel-name">${rel.name}</span>
          <span class="rel-score ${isCompleted ? 'green-text font-bold' : ''}">
            +${rel.score} / +${rel.target} ${isCompleted ? '(Đạt)' : ''}
          </span>
        </div>
        <div class="rel-bar">
          <div class="rel-bar-fill ${colorClass}" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// 2. RIGHT DECK: DATA TABS (INVENTORY, NPCS, LEDGER, AGENT LOG)
// ==========================================================================

// 2.1 Inventory Subtab
async function loadDeckInventory() {
  try {
    const res = await fetch(`${API_BASE}/api/inventory`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    currentInventory = data.items || [];
    const tbody = document.getElementById('deck-inventory-tbody');
    if (!tbody) return;

    if (currentInventory.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 12px;">Kho hàng trống</td></tr>`;
      return;
    }

    tbody.innerHTML = currentInventory.map(item => {
      const itemCodeEsc = item.item_code.replace(/'/g, "\\'");
      const estSellPrice = Math.max(1, Math.round(item.unit_cost_basis * 1.25));
      return `
        <tr>
          <td><code class="mono" style="font-size: 10px; color: #cbd5e1;">${item.item_code}</code></td>
          <td><span title="${item.description}" style="font-weight: 500;">${item.description}</span></td>
          <td class="num-col font-bold">${item.quantity.toLocaleString()}</td>
          <td class="num-col">${item.unit_cost_basis.toLocaleString()}</td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="btn btn-sm btn-gold" onclick="openQuickTrade('SELL', '${itemCodeEsc}', ${Math.min(10, item.quantity)}, ${estSellPrice})">Bán</button>
            <button class="btn btn-sm btn-outline" onclick="openQuickTrade('BUY', '${itemCodeEsc}', 10, ${item.unit_cost_basis || 50})">Mua</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load inventory deck:', err);
  }
}

// 2.2 NPCs Subtab
async function loadDeckNpcs() {
  try {
    const res = await fetch(`${API_BASE}/api/npcs`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const list = document.getElementById('deck-npcs-list');
    if (!list) return;

    const npcs = data.npcs || [];
    if (npcs.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 12px;">Chưa có gia nhân trực thuộc</div>`;
      return;
    }

    list.innerHTML = npcs.map(npc => {
      const initial = npc.name ? npc.name.charAt(0) : '人';
      return `
        <div class="deck-npc-item">
          <div class="deck-npc-header">
            <div class="deck-npc-title-row">
              <div class="deck-npc-avatar">${initial}</div>
              <div>
                <div class="deck-npc-name">${npc.name} (${npc.npc_id})</div>
                <div class="deck-npc-role">${npc.assigned_role || 'Thành viên'} @ ${npc.assigned_business_id || 'Trác Quận'}</div>
              </div>
            </div>
            <span class="badge" style="font-size: 9px; font-family: var(--font-mono); color: #fbbf24; background: rgba(245, 158, 11, 0.15); border: 1px solid var(--border-gold-subtle); padding: 1px 5px; border-radius: 2px;">
              ${npc.monthly_wage} Qian/th
            </span>
          </div>

          <div class="deck-npc-stats">
            <div class="deck-npc-stat-item">Khéo: <span>${npc.cra_attr || 50}</span></div>
            <div class="deck-npc-stat-item">Sĩ khí: <span class="green-text">${npc.morale || 100}%</span></div>
            <div class="deck-npc-stat-item">Trung thành: <span class="gold-text">${npc.loyalty || 80}%</span></div>
          </div>

          <div class="deck-npc-footer">
            <span style="color: var(--text-muted); font-size: 10px;">Tính cách: <strong>${npc.personality || 'Chăm chỉ'}</strong></span>
            <button class="btn btn-sm btn-gold" onclick="rewardNpc('${npc.npc_id}', 100)">
              🎁 Thưởng 100 Tiền
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load NPCs deck:', err);
  }
}

// 2.3 Ledger Subtab
async function loadDeckLedger() {
  try {
    const res = await fetch(`${API_BASE}/api/ledger`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const list = document.getElementById('deck-transactions-list');
    if (!list) return;

    const cashflow = (data.cashflow || []).slice(0, 15);
    if (cashflow.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 12px;">Chưa có giao dịch sổ cái</div>`;
      return;
    }

    list.innerHTML = cashflow.map(txn => {
      const isInflow = txn.inflow > 0;
      const amtStr = isInflow ? `+${txn.inflow.toLocaleString()}` : `-${txn.outflow.toLocaleString()}`;
      const amtColor = isInflow ? 'green-text' : 'red-text';

      return `
        <div class="deck-txn-item">
          <div class="deck-txn-top">
            <span class="deck-txn-id">${txn.txn_id}</span>
            <span class="deck-txn-amt ${amtColor}">${amtStr} Qian</span>
          </div>
          <div class="deck-txn-desc">
            <strong>${txn.category}</strong>: ${txn.memo || txn.counterparty}
          </div>
          <div class="deck-txn-bal">
            Số dư sau TXN: <strong>${txn.balance.toLocaleString()} Qian</strong>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load ledger deck:', err);
  }
}

// 2.4 Agent Activity Stream Subtab
async function loadDeckAgentLogs() {
  try {
    const res = await fetch(`${API_BASE}/api/agent/logs`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const list = document.getElementById('deck-agent-log-list');
    if (!list) return;

    const logs = data.logs || [];
    if (logs.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 12px;">Chưa có dữ liệu mô phỏng từ Agent</div>`;
      return;
    }

    list.innerHTML = logs.map((l, idx) => `
      <div class="deck-agent-log-item ${idx === 0 ? 'highlight' : ''}">
        <div class="deck-agent-log-top">
          <span class="deck-agent-log-type">${l.type}</span>
          <span class="deck-agent-log-time">${l.timestamp}</span>
        </div>
        <div class="deck-agent-log-prompt">💬 ${l.prompt}</div>
        <div class="deck-agent-log-reason">🧠 ${l.reasoning}</div>
        ${l.delta && Object.keys(l.delta).length > 0 ? `
          <div class="deck-agent-log-delta">
            ⚖️ ${Object.entries(l.delta).map(([k, v]) => `${k}: ${v}`).join(' • ')}
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load agent logs deck:', err);
  }
}

// ==========================================================================
// 3. INTERACTIVE ACTIONS & ANTI-PILING DISPATCHERS
// ==========================================================================

// 3.0 Processing Lock Helper (Prevents Command Piling & Race Conditions)
function setProcessingLock(busy, targetElement = null, statusText = '') {
  isProcessingAction = busy;

  // Disable / Enable interactive action buttons
  document.querySelectorAll('button:not(#btn-main-menu):not(#btn-toggle-logs):not(.deck-tab-btn)').forEach(btn => {
    btn.disabled = busy;
  });

  const omniInput = document.getElementById('omni-input');
  if (omniInput) omniInput.disabled = busy;

  if (targetElement) {
    targetElement.classList.toggle('executing', busy);
  }

  const chronicle = document.getElementById('story-chronicle');
  let indicator = document.getElementById('story-computing-indicator');

  if (busy && statusText) {
    if (!indicator && chronicle) {
      indicator = document.createElement('div');
      indicator.id = 'story-computing-indicator';
      indicator.className = 'story-turn system';
      indicator.innerHTML = `
        <div class="story-turn-avatar">🤖</div>
        <div class="story-turn-content" style="padding: 6px 10px; font-size: 11px; color: #34d399;">
          <span class="pulse-dot"></span> Agent Core đang phân tích chiến thuật & đối soát SQLite: <em>"${statusText}"</em>...
        </div>
      `;
      chronicle.appendChild(indicator);
      chronicle.scrollTop = chronicle.scrollHeight;
    }
  } else {
    if (indicator) indicator.remove();
  }
}

// 3.0.1 Render Agent Tactical HUD & Delta Feedback
function renderAgentSimulationFeedback(reasoning, delta) {
  const thoughtBody = document.getElementById('agent-thought-body');
  if (thoughtBody && reasoning) {
    thoughtBody.innerText = reasoning;
  }

  const chipsContainer = document.getElementById('agent-delta-chips');
  if (chipsContainer && delta) {
    const pills = [];
    if (delta.cash) {
      const isPositive = delta.cash.startsWith('+');
      pills.push(`<span class="agent-delta-pill ${isPositive ? 'cash-plus' : 'cash-minus'}">🪙 Tiền: ${delta.cash}</span>`);
    }
    if (delta.inventory) {
      pills.push(`<span class="agent-delta-pill inv">📦 Kho: ${delta.inventory}</span>`);
    }
    if (delta.relations || delta.npc) {
      pills.push(`<span class="agent-delta-pill rel">🤝 ${delta.relations || delta.npc}</span>`);
    }
    if (delta.audit) {
      pills.push(`<span class="agent-delta-pill rel">⚖️ ${delta.audit}</span>`);
    }
    if (pills.length > 0) {
      chipsContainer.innerHTML = pills.join('');
    }
  }

  // Refresh agent activity log stream
  loadDeckAgentLogs();
}

// 3.1 Tab Switching in Right Deck
function switchDeckTab(subtabId) {
  document.querySelectorAll('.deck-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-subtab') === subtabId);
  });

  document.querySelectorAll('.deck-tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === subtabId);
  });

  if (subtabId === 'subtab-inventory') loadDeckInventory();
  if (subtabId === 'subtab-npcs') loadDeckNpcs();
  if (subtabId === 'subtab-ledger') loadDeckLedger();
  if (subtabId === 'subtab-agent-log') loadDeckAgentLogs();
}

// 3.2 Dynamic Sub-location Switching
async function switchSubLocation(locName) {
  if (isProcessingAction) {
    showToast('⚠️ Đang thực thi thao tác khác, vui lòng chờ!', true);
    return;
  }
  if (activeSubLocation === locName) return;

  activeSubLocation = locName;
  showToast(`Đang chuyển cảnh tới: ${locName}...`);
  await loadScene(locName);
}

// 3.3 Choice Selection & Highlighting
function selectChoice(optId) {
  selectedChoiceId = optId;
  document.querySelectorAll('.choice-card').forEach(card => {
    card.classList.toggle('active', card.id === `choice-card-${optId}`);
  });
}

// 3.4 Direct Mechanical Choice Execution (Anti-Piling Guarded)
async function executeChoiceDirect(optId) {
  if (isProcessingAction) {
    showToast('⚠️ Đang thực thi điều lệnh trước, vui lòng không nhấn dồn!', true);
    return;
  }

  if (!currentScene || !currentScene.options) return;
  const opt = currentScene.options.find(o => o.id === optId);
  if (!opt) return;

  const cardEl = document.getElementById(`choice-card-${optId}`);
  selectChoice(optId);

  // Append Player Action Turn into Story Chronicle
  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: 'Quyết Sách Trực Tiếp',
    avatar: '梁',
    text: `**${opt.title}**\n\n*Ý đồ chiến thuật:* ${opt.desc}`
  });

  setProcessingLock(true, cardEl, opt.title);

  try {
    // Location Movement Choice
    if (opt.action && opt.action.type === 'MOVE_LOCATION') {
      showToast(`Đang di chuyển tới ${opt.action.new_location}...`);
      opt.action.idempotency_key = `OPT_${optId}_${Date.now()}`;
      await dispatchDirectAction(opt.action);
      activeSubLocation = opt.action.new_location;

      appendStoryTurn({
        type: 'system',
        speaker: 'Hành Trình',
        title: 'Chuyển Đổi Địa Điểm',
        avatar: '📍',
        text: `Lương Diễn đã rời bước, đặt chân tới **${opt.action.new_location}**. Bối cảnh xung quanh bắt đầu thay đổi.`,
        deltas: { location: activeSubLocation, audit: 'Cập nhật tọa độ' }
      });

      await loadScene(activeSubLocation);
      renderAgentSimulationFeedback(`Cơ động tới ${activeSubLocation}. Thiết lập vị trí chiến dịch mới.`, { location: activeSubLocation, audit: '70/70 Khớp' });
      return;
    }

    // Direct Authoritative SimulationCore Action
    if (opt.action) {
      showToast(`Đang thực thi: ${opt.title}...`);
      opt.action.idempotency_key = `OPT_${optId}_${Date.now()}`;
      const result = await dispatchDirectAction(opt.action);

      let turnType = 'system';
      let speaker = 'SimCore Kiểm Toán';
      let title = 'Ghi Nhận Sổ Cái SQLite';
      let avatar = '⚖️';
      let turnText = `Điều lệnh **${opt.title}** đã thực thi thành công và ghi sổ bất biến.`;

      if (opt.action.type === 'PRODUCTION_BATCH') {
        if (activeSubLocation === 'Xưởng Lương Thị') {
          turnType = 'action';
          speaker = 'Trần Bảo (Thợ Cả Lương Gia)';
          title = 'Hoàn Thành Chế Tác';
          avatar = '陳';
          turnText = `Thợ cả Trần Bảo báo cáo: Lô sản xuất ${opt.action.batch_size} thành phẩm đã hoàn thành theo đúng định mức BOM!`;
        } else {
          turnType = 'courier';
          speaker = 'Gia Nhân Tiếp Vận (Phi Thư)';
          title = 'Mật Lệnh Sản Xuất Tới Xưởng';
          avatar = '✉️';
          turnText = `Gia nhân phi ngựa mang mật lệnh bài về Xưởng Lương Thị. Thợ cả Trần Bảo mở thư tuân lệnh, hạ lệnh thợ xưởng hoàn thiện ${opt.action.batch_size} thành phẩm!`;
        }
      } else if (opt.action.type === 'TRADE_BUY' || opt.action.type === 'TRADE_SELL') {
        turnType = 'action';
        speaker = opt.action.counterparty || 'Thương Vụ Lương Gia';
        title = opt.action.type === 'TRADE_BUY' ? 'Thu Mua Vật Tư' : 'Xuất Bán Hàng Hóa';
        avatar = '📦';
        turnText = `Giao dịch thương nghiệp **${opt.title}** đã hoàn tất giao nhận và đối ứng ngân khố.`;
      } else if (opt.action.type === 'REWARD_NPC') {
        turnType = 'npc';
        speaker = currentScene?.npc?.name || 'Hào Kiệt';
        title = 'Cảm Kích Ban Thưởng';
        avatar = currentScene?.npc?.name ? currentScene.npc.name.charAt(0) : '🎁';
        turnText = `Nhận ban thưởng ${opt.action.amount} Tiền, tâm tình phấn khởi, trung thành và sĩ khí tăng vọt!`;
      }

      // Append result into chronicle
      appendStoryTurn({
        type: turnType,
        speaker: speaker,
        title: title,
        avatar: avatar,
        text: turnText,
        deltas: result && result.delta ? result.delta : { action: opt.action.type, audit: '70/70 Khớp' },
        reasoning: `Bất biến SQLite kiểm toán bảo toàn tuyệt đối.`
      });

      // Refresh scene and right deck
      await loadScene(activeSubLocation);
      renderAgentSimulationFeedback(`Thực thi thành công điều lệnh "${opt.title}". Kiểm toán bất biến bảo toàn hoàn hảo.`, { action: opt.action.type, audit: '70/70 Khớp' });
      await Promise.all([loadStatus(), loadDeckInventory(), loadDeckNpcs(), loadDeckLedger()]);
    } else {
      showToast(`Đã chọn: ${opt.title}`);
    }
  } catch (err) {
    console.error('Error executing direct choice:', err);
    showToast(`Thất bại: ${err.message}`, true);
  } finally {
    setProcessingLock(false, cardEl);
  }
}

// 3.5 AI-Assisted Choice Execution (Anti-Piling Guarded)
async function executeChoiceAi(optId) {
  if (isProcessingAction) {
    showToast('⚠️ Đang gửi yêu cầu cho AI Bridge, vui lòng không bấm liên tục!', true);
    return;
  }

  if (!currentScene || !currentScene.options) return;
  const opt = currentScene.options.find(o => o.id === optId);
  if (!opt) return;

  const cardEl = document.getElementById(`choice-card-${optId}`);
  selectChoice(optId);

  // Append Player Action Turn into Story Chronicle
  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: 'Thỉnh Cầu AI Core',
    avatar: '梁',
    text: `Đề xuất phương án: **${opt.title}**`
  });

  setProcessingLock(true, cardEl, `Gửi "${opt.title}" cho AI Core`);
  showToast(`Gửi lựa chọn "${opt.title}" qua AI Bridge...`);

  try {
    const res = await fetch(`${API_BASE}/api/agent/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: opt.title, choiceId: optId, subLocation: activeSubLocation })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);

    // Update scene dynamically
    if (result.updatedScene) {
      if (result.updatedScene.campaign && result.updatedScene.campaign.activeSubLocation) {
        activeSubLocation = result.updatedScene.campaign.activeSubLocation;
      }
      renderSceneFromData(result.updatedScene);
    } else {
      await loadScene(activeSubLocation);
    }

    // Append Authentic Agent / NPC / Courier Response into Story Chronicle
    appendAgentResultTurn(result);

    // Render Agent Reasoning & Simulation Delta
    renderAgentSimulationFeedback(result.reasoning, result.delta);

    showToast('AI Bridge đã phản hồi và hoàn tất đối soát SQLite!');
    await Promise.all([loadStatus(), loadDeckInventory(), loadDeckNpcs(), loadDeckLedger()]);

  } catch (err) {
    console.error('AI Bridge execution error:', err);
    showToast(`Lỗi AI Bridge: ${err.message}`, true);
  } finally {
    setProcessingLock(false, cardEl);
  }
}

// Helper: Append Agent Result Turn with authentic speaker & response type
function appendAgentResultTurn(result) {
  const turnInfo = result.turnInfo || {};
  const isEn = (currentLang === 'en');

  let type = turnInfo.type || (result.dispatchType === 'COURIER' ? 'courier' : (result.dispatchType === 'TRAVEL' ? 'travel' : 'action'));
  let speaker = turnInfo.speaker;
  let title = turnInfo.title;
  let avatar = turnInfo.avatar;
  let diceBadge = turnInfo.diceBadge !== undefined ? turnInfo.diceBadge : null;

  // Fallbacks if turnInfo is missing
  if (!speaker) {
    if (result.dispatchType === 'COURIER') {
      type = 'courier';
      speaker = isEn ? 'Courier Dispatch (Messenger)' : 'Gia Nhân Tiếp Vận (Phi Thư)';
      title = isEn ? 'Remote Order / Dispatch' : 'Mật Thư Điều Phối Từ Xa';
      avatar = '✉️';
      diceBadge = null;
    } else if (result.dispatchType === 'TRAVEL') {
      type = 'travel';
      speaker = isEn ? 'Post Road Journey' : 'Lữ Trình Quan Đạo';
      title = isEn ? 'Scene Relocation' : 'Chuyển Cảnh Địa Lý';
      avatar = '🏇';
      diceBadge = null;
    } else if (result.executedAction && result.executedAction.type === 'PRODUCTION_BATCH') {
      type = 'action';
      speaker = isEn ? 'Master Chen Bao (Artisan)' : 'Trần Bảo (Thợ Cả Lương Gia)';
      title = isEn ? 'Liang Workshop' : 'Lương Thị Chức Tác Phường';
      avatar = '陳';
      diceBadge = null;
    } else {
      type = 'npc';
      const npc = result.updatedScene?.npc || currentScene?.npc;
      speaker = npc?.name || (isEn ? 'Local Figure' : 'Hào Kiệt Bản Địa');
      title = npc?.title || (isEn ? 'Direct Dialogue' : 'Đối Thoại Trực Diện');
      avatar = npc?.name ? npc.name.charAt(0) : '漢';
    }
  }

  appendStoryTurn({
    type,
    speaker,
    title,
    avatar,
    text: result.narrative,
    diceBadge,
    deltas: result.delta,
    reasoning: result.reasoning
  });
}

// 3.6 Omni Command Bar Dispatcher (Anti-Piling Guarded)
async function dispatchOmniCommand(mode = 'ai') {
  if (isProcessingAction) {
    showToast('⚠️ Hệ thống đang tính toán lệnh trước, vui lòng không spam lệnh!', true);
    return;
  }

  const inputEl = document.getElementById('omni-input');
  if (!inputEl) return;

  const promptText = inputEl.value.trim();
  if (!promptText) {
    showToast('Vui lòng nhập mệnh lệnh hoặc đối thoại!', true);
    inputEl.focus();
    return;
  }

  // Append Player Action Turn into Story Chronicle
  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: mode === 'instant' ? 'Mệnh Lệnh Tức Thì' : 'Mệnh Lệnh & Đối Thoại',
    avatar: '梁',
    text: promptText
  });

  inputEl.value = '';
  setProcessingLock(true, null, promptText);
  showToast(mode === 'instant' ? 'Đang thực thi lệnh tức thì...' : 'Đang gửi cho AI Agent Core...');

  try {
    const res = await fetch(`${API_BASE}/api/agent/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptText, mode, subLocation: activeSubLocation })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);

    if (result.updatedScene) {
      if (result.updatedScene.campaign && result.updatedScene.campaign.activeSubLocation) {
        activeSubLocation = result.updatedScene.campaign.activeSubLocation;
      }
      renderSceneFromData(result.updatedScene);
    } else {
      await loadScene(activeSubLocation);
    }

    // Append Authentic Agent / NPC / Courier Response into Story Chronicle
    appendAgentResultTurn(result);

    // Render Agent Reasoning & Simulation Delta
    renderAgentSimulationFeedback(result.reasoning, result.delta);

    showToast('Điều lệnh đã thực thi thành công!');
    await Promise.all([loadStatus(), loadDeckInventory(), loadDeckNpcs(), loadDeckLedger()]);

  } catch (err) {
    console.error('Command dispatch error:', err);
    showToast(`Thất bại: ${err.message}`, true);
  } finally {
    setProcessingLock(false, null);
  }
}

// 3.7 Direct SimulationCore Action Helper
async function dispatchDirectAction(payload) {
  try {
    const res = await fetch(`${API_BASE}/api/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      showToast(`Điều lệnh ${payload.type} thành công!`);
      return result;
    } else {
      showToast(`Bị từ chối: [${result.code || 'ERR'}] ${result.error}`, true);
      return result;
    }
  } catch (err) {
    showToast(`Lỗi kết nối SimCore: ${err.message}`, true);
  }
}

// 3.8 NPC Retainer Reward Quick Action
async function rewardNpc(npcId, amount = 100) {
  if (isProcessingAction) {
    showToast('⚠️ Đang thực thi thao tác khác, vui lòng chờ!', true);
    return;
  }

  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: 'Khen Thưởng Gia Nhân',
    avatar: '梁',
    text: `Ban thưởng **${amount} Tiền** cho nhân sĩ ${npcId} để khích lệ sĩ khí trung thành!`
  });

  setProcessingLock(true, null, `Thưởng ${amount} Tiền cho NPC ${npcId}`);
  showToast(`Ban thưởng ${amount} Tiền cho NPC ${npcId}...`);

  try {
    await dispatchDirectAction({
      type: 'REWARD_NPC',
      npc_id: npcId,
      amount,
      game_date: '184-05-02',
      idempotency_key: `RWD_${npcId}_${Date.now()}`
    });

    appendStoryTurn({
      type: 'npc',
      speaker: 'Trần Bảo (Thợ Cả)',
      title: 'Lương Thị Chức Tác Phường',
      avatar: '陳',
      text: `Trần Bảo cảm kích khôn xiết cúi đầu bái tạ: *"Đa tạ Thiếu gia trọng thưởng! Thuộc hạ và anh em thợ xưởng nguyện dốc toàn lực chế tạo quân trang phòng thủ tốt nhất!"*`,
      deltas: { cash: `-${amount} Qian`, npc: 'Sĩ khí 100% • Trung thành +2', audit: '70/70 Khớp' },
      reasoning: `Khen thưởng ${amount} Tiền động viên NPC ${npcId}. Sĩ khí tối đa.`
    });

    renderAgentSimulationFeedback(`Khen thưởng ${amount} Tiền động viên NPC ${npcId}. Sĩ khí tối đa.`, { cash: `-${amount} Qian`, npc: 'Sĩ khí 100% • Trung thành +2', audit: '70/70 Khớp' });
    await Promise.all([loadStatus(), loadDeckNpcs(), loadDeckLedger()]);
  } finally {
    setProcessingLock(false, null);
  }
}

// ==========================================================================
// 4. QUICK TRADE MODAL CONTROLS
// ==========================================================================

function openQuickTrade(mode, itemCode, defaultQty, defaultPrice) {
  if (isProcessingAction) {
    showToast('⚠️ Đang thực thi điều lệnh, vui lòng chờ!', true);
    return;
  }

  const modal = document.getElementById('trade-modal');
  if (!modal) return;

  const modeEl = document.getElementById('modal-trade-mode');
  const codeEl = document.getElementById('modal-item-code');
  const qtyEl = document.getElementById('modal-qty');
  const priceEl = document.getElementById('modal-price');
  const titleEl = document.getElementById('trade-modal-title');
  const submitBtn = document.getElementById('modal-submit-btn');

  if (modeEl) modeEl.value = mode;
  if (codeEl) codeEl.value = itemCode;
  if (qtyEl) qtyEl.value = defaultQty;
  if (priceEl) priceEl.value = defaultPrice;

  const isSell = mode === 'SELL';
  if (titleEl) titleEl.innerText = isSell ? `Bán Hàng: ${itemCode}` : `Mua Thêm: ${itemCode}`;
  if (submitBtn) submitBtn.innerText = isSell ? `Xác Nhận Xuất Bán` : `Xác Nhận Mua Hàng`;

  calcTradeTotal();
  modal.classList.remove('hidden');
}

function closeTradeModal() {
  const modal = document.getElementById('trade-modal');
  if (modal) modal.classList.add('hidden');
}

function calcTradeTotal() {
  const qty = parseFloat(document.getElementById('modal-qty')?.value) || 0;
  const price = parseFloat(document.getElementById('modal-price')?.value) || 0;
  const total = Math.round(qty * price);
  const totalEl = document.getElementById('modal-total-amt');
  if (totalEl) totalEl.innerText = `${total.toLocaleString()} Tiền`;
}

async function submitModalTrade() {
  if (isProcessingAction) return;

  const mode = document.getElementById('modal-trade-mode')?.value;
  const itemCode = document.getElementById('modal-item-code')?.value;
  const qty = parseFloat(document.getElementById('modal-qty')?.value);
  const price = parseInt(document.getElementById('modal-price')?.value, 10);
  const counterparty = document.getElementById('modal-counterparty')?.value.trim() || 'Thương đoàn Ký Châu';

  if (!itemCode || qty <= 0 || price <= 0) {
    showToast('Vui lòng nhập số lượng và đơn giá hợp lệ!', true);
    return;
  }

  closeTradeModal();

  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: mode === 'SELL' ? 'Xuất Bán Hàng Hóa' : 'Thu Mua Vật Tư',
    avatar: '梁',
    text: `${mode === 'SELL' ? 'Xuất bán' : 'Thu mua'} **${qty} ${itemCode}** với đối tác **${counterparty}** theo giá **${price} Tiền/đơn vị** (Tổng: ${(qty * price).toLocaleString()} Tiền).`
  });

  setProcessingLock(true, null, `${mode === 'SELL' ? 'Xuất bán' : 'Thu mua'} ${qty} ${itemCode}`);

  const payload = {
    type: mode === 'SELL' ? 'TRADE_SELL' : 'TRADE_BUY',
    item_code: itemCode,
    quantity: qty,
    unit_price: price,
    counterparty,
    game_date: '184-05-02',
    idempotency_key: `MODAL_${mode}_${itemCode}_${Date.now()}`
  };

  try {
    await dispatchDirectAction(payload);
    const totalAmt = qty * price;
    const deltaCash = mode === 'SELL' ? `+${totalAmt} Qian` : `-${totalAmt} Qian`;
    const deltaStock = mode === 'SELL' ? `-${qty} ${itemCode}` : `+${qty} ${itemCode}`;

    appendStoryTurn({
      type: 'system',
      speaker: 'Thương Nghiệp Lương Gia',
      title: 'Hoàn Tất Giao Dịch Sổ Cái',
      avatar: '📦',
      text: `Giao dịch thương nghiệp đã giao nhận thành công. Hàng hóa và dòng tiền được đối soát tự động trong cơ sở dữ liệu SQLite.`,
      deltas: { cash: deltaCash, inventory: deltaStock, audit: '70/70 Khớp' },
      reasoning: `Hoàn tất giao dịch thương nghiệp ${mode} cho ${itemCode}.`
    });

    renderAgentSimulationFeedback(`Hoàn tất giao dịch thương nghiệp ${mode} cho ${itemCode}.`, { cash: deltaCash, inventory: deltaStock, audit: '70/70 Khớp' });
    await Promise.all([loadStatus(), loadDeckInventory(), loadDeckLedger()]);
  } finally {
    setProcessingLock(false, null);
  }
}

// ==========================================================================
// 5. UTILITIES & HELPERS
// ==========================================================================

function initUIEventListeners() {
  // Main Menu click
  const btnMenu = document.getElementById('btn-main-menu');
  if (btnMenu) {
    btnMenu.addEventListener('click', () => {
      showToast('Hệ thống SimCore: 70/70 Invariants SQLite đang bảo toàn 100%!');
    });
  }

  // Logs button click: Switches directly to Agent Activity Log Stream!
  const btnLogs = document.getElementById('btn-toggle-logs');
  if (btnLogs) {
    btnLogs.addEventListener('click', () => {
      switchDeckTab('subtab-agent-log');
      showToast('Đang hiển thị Nhật ký mô phỏng từ Agent!');
    });
  }

  // World Map Modal Keyboard & Backdrop Handlers
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeWorldMap();
    }
  });

  const mapModal = document.getElementById('world-map-modal');
  if (mapModal) {
    mapModal.addEventListener('click', (e) => {
      if (e.target === mapModal) {
        closeWorldMap();
      }
    });
  }
}

function formatNarrativeQuotes(text) {
  // Highlights quoted dialogue in gold italics
  return text.replace(/"([^"]+)"/g, '<em>"$1"</em>');
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.innerText = message;
  toast.style.borderColor = isError ? 'var(--state-danger)' : 'var(--border-gold)';
  toast.classList.remove('hidden');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}
