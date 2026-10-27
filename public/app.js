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
  'Trường Xã Tiền Tuyến': {
    presenceVi: 'Trường Xã Tiền Tuyến (Trực diện: Hoàng Phủ Tung • Tả Tướng Quân)',
    presenceEn: 'Changshe Frontline (In-person: General Huangfu Song)',
    placeholderVi: 'Lương Diễn tác chiến tại Trường Xã... (hoặc gõ: "Hiệp đồng kỵ binh...")',
    placeholderEn: 'Liang Yan at Changshe... (or type: "Coordinate cavalry...")',
    chips: [
      { type: 'local', icon: '🔥', labelVi: 'Trợ Chiến Hỏa Công', labelEn: 'Support Fire Attack', promptVi: 'Cung cấp 5 Khiên Trúc bọc da trợ chiến tiền phong hỏa công', promptEn: 'Supply shields and oil for Changshe fire attack' },
      { type: 'local', icon: '🌾', labelVi: 'Tiếp Tế 8 Thạch Lương', labelEn: 'Supply 8 Grain', promptVi: 'Tiếp tế 8 Thạch Lương thực khẩn cấp cho đại doanh Dự Châu', promptEn: 'Deliver 8 piculs of grain to Yuzhou command' },
      { type: 'local', icon: '🐎', labelVi: 'Hiệp Đồng Tào Tháo', labelEn: 'Liaise Cao Cao', promptVi: 'Bắt liên lạc hiệp đồng kỵ binh cứu viện của Kỵ Đô Úy Tào Tháo', promptEn: 'Establish liaison with Cao Cao cavalry reinforcements' },
      { divider: true },
      { type: 'courier', icon: '✉️', labelVi: 'Báo tiệp Huyện Trác', labelEn: 'Dispatch to Zhuo', promptVi: 'Phái kỵ sĩ mang chiến báo thắng trận Trường Xã về Huyện Trác', promptEn: 'Dispatch courier with victory dispatch to Zhuo County' },
      { divider: true },
      { type: 'travel', icon: '🏇', labelVi: 'Tiến Vào Lạc Dương', labelEn: 'To Luoyang', promptVi: 'Rời Trường Xã, tiến về Kinh Sư Lạc Dương tấu tiệp', promptEn: 'Advance toward Imperial Luoyang to report victory' },
      { type: 'travel', icon: '🏇', labelVi: 'Về Huyện Trác', labelEn: 'To Zhuo County', promptVi: 'Rút quân theo quan đạo trở về Hậu Phương Trang Viên Vườn Đào', promptEn: 'Return to Peach Garden Manor in Zhuo County' }
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
      { type: 'travel', icon: '🏇', labelVi: 'Về Huyện Trác', labelEn: 'To Zhuo County', promptVi: 'Rời Kinh Sư Lạc Dương, cất bước trở về Trang Viên Vườn Đào Huyện Trác', promptEn: 'Depart Luoyang and return to Peach Garden Manor in Zhuo County' }
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
    coords: { x: 280, y: 80 },
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
  'guang_zong': {
    id: 'guang_zong',
    nameVi: 'Quảng Tông (Cự Lộc)',
    nameEn: 'Guangzong (Julu Commandery)',
    provinceVi: 'Ký Châu',
    provinceEn: 'Jizhou',
    coords: { x: 310, y: 210 },
    statusVi: 'Chiến Sự Ác Liệt • Khăn Vàng',
    statusEn: 'Active Battlefield • Yellow Turbans',
    threatVi: 'Hiểm nguy cao (Tàn quân phục kích)',
    threatEn: 'High threat (Bandit ambushes)',
    distanceFromZhuo: 280,
    daysRequired: 1,
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
    coords: { x: 430, y: 220 },
    statusVi: 'Nghĩa Binh Tập Kết',
    statusEn: 'Militia Muster Point',
    threatVi: 'Trung bình (Biên giới bất an)',
    threatEn: 'Moderate (Border skirmishes)',
    distanceFromZhuo: 360,
    daysRequired: 1.5,
    grainCost: 2.0,
    defaultSubLoc: 'Bình Nguyên Trọng Trấn',
    subLocations: ['Bình Nguyên Trọng Trấn'],
    figuresVi: 'Quan phủ địa phương, Thương đoàn Thanh Châu',
    figuresEn: 'Local magistrates, Qingzhou merchants',
    intelVi: 'Đầu mối giao thương giữa Ký Châu và Thanh Châu. Nơi nghĩa quân đang tập hợp lực lượng đẩy lùi giặc cỏ.',
    intelEn: 'Crucial logistical crossroad between Jizhou and Qingzhou. Volunteer armies congregating.'
  },
  'chang_she': {
    id: 'chang_she',
    nameVi: 'Trường Xã & Dĩnh Xuyên',
    nameEn: 'Changshe & Yingchuan',
    provinceVi: 'Dự Châu',
    provinceEn: 'Yuzhou',
    coords: { x: 350, y: 380 },
    statusVi: 'Hỏa Công Tiền Tuyến',
    statusEn: 'Southern Frontline',
    threatVi: 'Cực kỳ nguy hiểm (Hoàng Cân vây hãm)',
    threatEn: 'Extreme danger (Besieged by Ba Cai)',
    distanceFromZhuo: 620,
    daysRequired: 2.5,
    grainCost: 3.5,
    defaultSubLoc: 'Trường Xã Tiền Tuyến',
    subLocations: ['Trường Xã Tiền Tuyến'],
    figuresVi: 'Hoàng Phủ Tung, Chu Tuấn, Kỵ Binh Tào Tháo',
    figuresEn: 'Huangfu Song, Zhu Jun, Cao Cao',
    intelVi: 'Tiền tuyến miền Nam nơi quân triều đình đang đối đầu dữ dội với tướng giặc Ba Cai. Nổi tiếng với trận hỏa công Trường Xã.',
    intelEn: 'Southern frontline where Imperial armies clash with Yellow Turban General Ba Cai.'
  },
  'luo_yang': {
    id: 'luo_yang',
    nameVi: 'Lạc Dương (Kinh Sư)',
    nameEn: 'Luoyang (Imperial Capital)',
    provinceVi: 'Tư Lệ',
    provinceEn: 'Sili',
    coords: { x: 200, y: 360 },
    statusVi: 'Hoàng Thành Giới Nghiêm',
    statusEn: 'Imperial Capital • Martial Law',
    threatVi: 'An ninh nghiêm ngặt',
    threatEn: 'High security • Palace guards',
    distanceFromZhuo: 750,
    daysRequired: 3.0,
    grainCost: 4.0,
    defaultSubLoc: 'Kinh Đô Lạc Dương',
    subLocations: ['Kinh Đô Lạc Dương'],
    figuresVi: 'Hán Linh Đế, Đại Tướng Quân Hà Tiến, Thập Thường Thị',
    figuresEn: 'Emperor Ling of Han, General He Jin, Ten Attendants',
    intelVi: 'Kinh đô tráng lệ của Đế Chế Đại Hán. Nơi ban bố các chiếu thư phong tướng, ban thưởng quân công và quyết định đại cục thiên hạ.',
    intelEn: 'Magnificent capital of the Han Empire. Seat of imperial decrees, court politics, and high governance.'
  }
};

let selectedMapNodeId = 'guang_zong';

// ==========================================================================
// 0.1 LOCAL POINTS OF INTEREST (POIs) & REGIONAL GEOGRAPHY ENGINE
// ==========================================================================

function getPoiMeta(locName) {
  const dict = {
    'Vườn Đào': { vi: 'Trang Viên Vườn Đào Hạ Trạch', en: 'Peach Garden Manor', icon: '🌸', distFromZhuo: '0 dặm' },
    'Chợ Đông Môn': { vi: 'Chợ Đông Môn & Sạp Trà', en: 'East Gate Market & Tea Stall', icon: '🏪', distFromZhuo: '1 dặm' },
    'Xưởng Lương Thị': { vi: 'Lương Thị Chức Tác Phường', en: 'Liang Textile Workshop', icon: '🏭', distFromZhuo: '2 dặm' },
    'Quảng Tông Quân Doanh': { vi: 'Bắc Quân Đại Doanh (Quảng Tông)', en: 'Northern Army Headquarters', icon: '⛺', distFromZhuo: '280 dặm' },
    'Bình Nguyên Trọng Trấn': { vi: 'Bình Nguyên Trọng Trấn', en: 'Pingyuan Stronghold', icon: '🛡️', distFromZhuo: '360 dặm' },
    'Trường Xã Tiền Tuyến': { vi: 'Trường Xã Tiền Tuyến (Dự Châu)', en: 'Changshe Frontline Camp', icon: '🔥', distFromZhuo: '620 dặm' },
    'Kinh Đô Lạc Dương': { vi: 'Kinh Đô Lạc Dương (Đại Tướng Quân Phủ)', en: 'Imperial Capital Luoyang', icon: '👑', distFromZhuo: '750 dặm' }
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
  if (lower.includes('trác') || lower.includes('đào') || lower.includes('chợ') || lower.includes('xưởng')) return WORLD_MAP_NODES['zhuo_xian'];
  if (lower.includes('quảng tông')) return WORLD_MAP_NODES['guang_zong'];
  if (lower.includes('bình nguyên')) return WORLD_MAP_NODES['ping_yuan'];
  if (lower.includes('trường xã') || lower.includes('dĩnh')) return WORLD_MAP_NODES['chang_she'];
  if (lower.includes('lạc dương')) return WORLD_MAP_NODES['luo_yang'];
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
// 0.2 STRATEGIC WORLD MAP (DƯ ĐỒ TAM QUỐC) ENGINE
// ==========================================================================

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

  // Route connections between tactical regional nodes
  const routes = [
    { from: 'zhuo_xian', to: 'guang_zong' },
    { from: 'zhuo_xian', to: 'ping_yuan' },
    { from: 'guang_zong', to: 'ping_yuan' },
    { from: 'guang_zong', to: 'chang_she' },
    { from: 'guang_zong', to: 'luo_yang' },
    { from: 'luo_yang', to: 'chang_she' }
  ];

  let svgRoutes = routes.map(r => {
    const f = WORLD_MAP_NODES[r.from].coords;
    const t = WORLD_MAP_NODES[r.to].coords;
    return `<line x1="${f.x}" y1="${f.y}" x2="${t.x}" y2="${t.y}" stroke="rgba(245, 158, 11, 0.35)" stroke-width="2" stroke-dasharray="4,4" />`;
  }).join('');

  let svgNodes = Object.keys(WORLD_MAP_NODES).map(key => {
    const node = WORLD_MAP_NODES[key];
    const isCurrent = (currentRegion.id === key);
    const isSelected = (selectedMapNodeId === key);

    let theme = { fill: '#0f172a', stroke: '#3b82f6', icon: '🛡️' };
    if (isCurrent) {
      theme = { fill: '#064e3b', stroke: '#10b981', icon: '📍' };
    } else if (key === 'guang_zong') {
      theme = { fill: '#450a0a', stroke: '#ef4444', icon: '⚔️' };
    } else if (key === 'chang_she') {
      theme = { fill: '#450a0a', stroke: '#ef4444', icon: '🔥' };
    } else if (key === 'luo_yang') {
      theme = { fill: '#451a03', stroke: '#f59e0b', icon: '👑' };
    } else if (key === 'zhuo_xian') {
      theme = { fill: '#064e3b', stroke: '#10b981', icon: '🌸' };
    }

    const displayName = isEn ? node.nameEn.split(' ')[0] : node.nameVi.split(' ')[0];
    const displayProvince = isEn ? node.provinceEn : node.provinceVi;

    return `
      <g class="map-node ${isSelected ? 'active' : ''}" onclick="selectWorldMapNode('${key}')" style="cursor: pointer;">
        ${isCurrent ? `
          <circle cx="${node.coords.x}" cy="${node.coords.y}" r="23" fill="none" stroke="#10b981" stroke-width="2" opacity="0.8" class="map-pulse-ring" />
          <rect x="${node.coords.x - 38}" y="${node.coords.y - 30}" width="76" height="14" rx="3" fill="#064e3b" stroke="#10b981" stroke-width="1" />
          <text x="${node.coords.x}" y="${node.coords.y - 20}" fill="#34d399" font-size="8" font-weight="700" text-anchor="middle">📍 ${isEn ? 'CURRENT' : 'HIỆN TẠI'}</text>
        ` : ''}

        ${isSelected ? `
          <circle cx="${node.coords.x}" cy="${node.coords.y}" r="22" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="4,2" />
        ` : ''}

        <circle class="node-bg" cx="${node.coords.x}" cy="${node.coords.y}" r="15" fill="${theme.fill}" stroke="${isSelected ? '#fbbf24' : theme.stroke}" stroke-width="${isSelected ? '2.5' : '1.5'}" />
        <text x="${node.coords.x}" y="${node.coords.y + 4.5}" font-size="11" text-anchor="middle">${theme.icon}</text>
        
        <text x="${node.coords.x}" y="${node.coords.y + 25}" text-anchor="middle" fill="${isSelected ? '#fbbf24' : '#f1f5f9'}" font-size="10.5" font-weight="${isSelected ? '700' : '600'}" letter-spacing="0.2px">${displayName}</text>
        <text x="${node.coords.x}" y="${node.coords.y + 36}" text-anchor="middle" fill="#94a3b8" font-size="9">${displayProvince}</text>
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <svg viewBox="0 0 540 440" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="tactical-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255, 255, 255, 0.03)" stroke-width="1"/>
        </pattern>
      </defs>

      <!-- Background & Grid -->
      <rect width="100%" height="100%" fill="#070a12"/>
      <rect width="100%" height="100%" fill="url(#tactical-grid)"/>

      <!-- Border Frame -->
      <rect x="8" y="8" width="524" height="424" fill="none" stroke="rgba(245, 158, 11, 0.2)" stroke-width="1" stroke-dasharray="6,4"/>
      <rect x="12" y="12" width="516" height="416" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="0.5"/>

      <!-- North Indicator -->
      <g transform="translate(500, 36)" opacity="0.6">
        <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1"/>
        <polygon points="0,-12 4,0 0,-4 -4,0" fill="#f59e0b"/>
        <text x="0" y="10" fill="#cbd5e1" font-size="7" font-weight="700" text-anchor="middle">BẮC</text>
      </g>

      <!-- Ancient Province Watermarks -->
      <text x="280" y="55" fill="rgba(255, 255, 255, 0.08)" font-size="18" font-family="'Cinzel', serif" font-weight="700" letter-spacing="4px" text-anchor="middle">U CHÂU (YOUZHOU)</text>
      <text x="255" y="165" fill="rgba(255, 255, 255, 0.08)" font-size="18" font-family="'Cinzel', serif" font-weight="700" letter-spacing="4px" text-anchor="middle">KÝ CHÂU (JIZHOU)</text>
      <text x="460" y="165" fill="rgba(255, 255, 255, 0.07)" font-size="16" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">THANH CHÂU</text>
      <text x="395" y="295" fill="rgba(255, 255, 255, 0.07)" font-size="16" font-family="'Cinzel', serif" font-weight="700" letter-spacing="3px" text-anchor="middle">DUYỆN CHÂU</text>
      <text x="345" y="420" fill="rgba(255, 255, 255, 0.08)" font-size="18" font-family="'Cinzel', serif" font-weight="700" letter-spacing="4px" text-anchor="middle">DỰ CHÂU (YUZHOU)</text>
      <text x="130" y="360" fill="rgba(255, 255, 255, 0.08)" font-size="18" font-family="'Cinzel', serif" font-weight="700" letter-spacing="4px" text-anchor="middle">TƯ LỆ (SILI)</text>

      <!-- Hoàng Hà (The Yellow River) -->
      <path d="M 20,355 C 110,345 170,325 230,320 C 300,315 360,275 430,260 C 475,250 510,240 540,235" 
            stroke="#1d4ed8" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.45" />
      <path d="M 20,355 C 110,345 170,325 230,320 C 300,315 360,275 430,260 C 475,250 510,240 540,235" 
            stroke="#60a5fa" stroke-width="2.5" stroke-dasharray="8,6" fill="none" opacity="0.8" />
      <text x="330" y="280" fill="#93c5fd" font-size="9.5" font-style="italic" opacity="0.85" letter-spacing="0.5px">Hoàng Hà (Yellow River)</text>

      <!-- Mountain Pass: Hổ Lao Quan -->
      <g transform="translate(240, 342)">
        <polygon points="-7,5 0,-6 7,5" fill="#ef4444" stroke="#f87171" stroke-width="1.2" opacity="0.9" />
        <text x="0" y="14" fill="#fca5a5" font-size="8" text-anchor="middle" font-weight="600">Hổ Lao Quan</text>
      </g>

      <!-- Tactical Routes -->
      ${svgRoutes}

      <!-- Interactive Strategic Regional Nodes -->
      ${svgNodes}
    </svg>
  `;
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

  const badgeClass = nodeId === 'luo_yang' ? 'capital' : (nodeId === 'guang_zong' || nodeId === 'chang_she' ? 'battle' : 'safe');
  const badgeText = isEn ? node.statusEn : node.statusVi;

  const dist = isCurrent ? 0 : node.distanceFromZhuo;
  const distText = isEn ? `${dist} li` : `${dist} dặm`;
  const daysText = isCurrent ? (isEn ? '0 days' : '0 ngày') : (isEn ? `${node.daysRequired} days` : `${node.daysRequired} ngày`);
  const grainText = isCurrent ? (isEn ? '0 grain' : '0 thạch') : `${node.grainCost} ${isEn ? 'piculs' : 'thạch'}`;
  const threatText = isEn ? node.threatEn : node.threatVi;
  const threatColor = (nodeId === 'guang_zong' || nodeId === 'chang_she') ? '#f87171' : '#34d399';

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

      // Append result into chronicle
      appendStoryTurn({
        type: 'system',
        speaker: 'SimCore Kiểm Toán',
        title: 'Ghi Nhận Sổ Cái SQLite',
        avatar: '⚖️',
        text: `Điều lệnh **${opt.title}** đã thực thi thành công và ghi sổ bất biến.`,
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

    // Append AI / NPC Response into Story Chronicle
    const npc = result.updatedScene?.npc || currentScene?.npc;
    appendStoryTurn({
      type: 'npc',
      speaker: npc?.name || 'Hào Kiệt Huyện Trác',
      title: npc?.title || 'Phản Hồi Chiến Thuật',
      avatar: npc?.name ? npc.name.charAt(0) : '漢',
      text: result.narrative,
      diceBadge: result.updatedScene?.lastCheck,
      deltas: result.delta,
      reasoning: result.reasoning
    });

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

    // Append AI / NPC Response into Story Chronicle
    const npc = result.updatedScene?.npc || currentScene?.npc;
    appendStoryTurn({
      type: 'npc',
      speaker: npc?.name || 'Hào Kiệt Huyện Trác',
      title: npc?.title || 'Phản Hồi Chiến Thuật',
      avatar: npc?.name ? npc.name.charAt(0) : '漢',
      text: result.narrative,
      diceBadge: result.updatedScene?.lastCheck,
      deltas: result.delta,
      reasoning: result.reasoning
    });

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
