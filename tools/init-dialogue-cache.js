/**
 * ThreeKingdoms-AgentEngine: Contextual Dialogue Cache Seeder & Table Initializer
 * (tools/init-dialogue-cache.js)
 *
 * Creates `master_context_dialogues` in saves/master.db and saves/session.db,
 * and seeds authentic canonical Three Kingdoms dialogues with multi-variant pools.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const MASTER_DB_PATH = path.resolve(__dirname, '../saves/master.db');
const SESSION_DB_PATH = path.resolve(__dirname, '../saves/session.db');

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS master_context_dialogues (
  id TEXT PRIMARY KEY,
  npc_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  outcome_tier TEXT NOT NULL,
  relationship_tier TEXT DEFAULT 'ANY',
  speaker_name_vi TEXT NOT NULL,
  speaker_name_en TEXT NOT NULL,
  dialogue_vi TEXT NOT NULL,
  dialogue_en TEXT NOT NULL,
  source TEXT DEFAULT 'MANUAL_SEED',
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dialogue_lookup 
ON master_context_dialogues(npc_id, action_type, outcome_tier, relationship_tier);
`;

const SEED_DIALOGUES = [
  // =========================================================================
  // NPC-0002: TRƯƠNG PHI (ZHANG FEI • DỰC ĐỨC)
  // Personality: Bộc trực, dũng mãnh, trọng tình nghĩa, thích rượu thịt
  // =========================================================================
  // BANQUET_DRINK - CRITICAL_SUCCESS (Variant 1)
  {
    id: 'DLG-ZF-DRINK-CRIT-1',
    npc_id: 'NPC-0002',
    action_type: 'BANQUET_DRINK',
    outcome_tier: 'CRITICAL_SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trương Phi',
    speaker_name_en: 'Zhang Fei',
    dialogue_vi: 'Trương Phi ngửa cổ nốc cạn một vò Trác Thành Trán Nương, đặt mạnh vò rượu xuống bàn rồi cười ha hả rung chuyển xà nhà: "Ha ha ha! Lương lão đệ mang rượu hảo hạng tới thật quá hợp ý ta! Thời buổi gian tà lộng hành, tìm được một tri kỷ uống say cùng trận thế này quý hơn vạn lượng hoàng kim!"',
    dialogue_en: 'Zhang Fei drains an entire jar of Zhuocheng wine in one long gulp, slamming the vessel down as his laughter shakes the rafters: "Hahaha! Brother Liang brings such superb wine, hitting the very spot! In times plagued by corrupt scoundrels, finding a kindred brother to drink deep with is worth more than ten thousand taels of gold!"',
    source: 'CANONICAL_SEED'
  },
  // BANQUET_DRINK - CRITICAL_SUCCESS (Variant 2)
  {
    id: 'DLG-ZF-DRINK-CRIT-2',
    npc_id: 'NPC-0002',
    action_type: 'BANQUET_DRINK',
    outcome_tier: 'CRITICAL_SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trương Phi',
    speaker_name_en: 'Zhang Fei',
    dialogue_vi: 'Dực Đức râu hùm dựng ngược, hào khí ngút trời vỗ vai Lương Diễn: "Rượu này uống vào khí huyết sục sôi! Lão Trương ta tuy thô kệch, nhưng nhìn người chưa bao giờ lầm. Lương đệ trượng nghĩa khảng khái, chén này ta cạn trước kính đệ!"',
    dialogue_en: 'Yide bristles his beard in soaring heroic spirit, clapping Liang Yan on the shoulder: "This wine sets the blood ablaze! Old Zhang may be uncouth, but I never misjudge a man. Brother Liang is noble and steadfast—I drain this bowl first to honor you!"',
    source: 'CANONICAL_SEED'
  },
  // BANQUET_DRINK - SUCCESS
  {
    id: 'DLG-ZF-DRINK-SUCC-1',
    npc_id: 'NPC-0002',
    action_type: 'BANQUET_DRINK',
    outcome_tier: 'SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trương Phi',
    speaker_name_en: 'Zhang Fei',
    dialogue_vi: 'Trương Phi hào sảng rót đầy hai bát lớn: "Rượu ngon thịt béo! Đàm đạo chuyện nghĩa dũng cùng Lương huynh quả nhiên sảng khoái, xua tan bao bực bội chuyện quan phủ nhũng nhiễu."',
    dialogue_en: 'Zhang Fei generously pours two brimming bowls: "Fine wine and rich meats! Discussing righteous valor with you truly lifts the spirits and sweeps away the annoyance of corrupt magistracies."',
    source: 'CANONICAL_SEED'
  },
  // BANQUET_DRINK - AWKWARD
  {
    id: 'DLG-ZF-DRINK-AWK-1',
    npc_id: 'NPC-0002',
    action_type: 'BANQUET_DRINK',
    outcome_tier: 'AWKWARD',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trương Phi',
    speaker_name_en: 'Zhang Fei',
    dialogue_vi: 'Trương Phi nhấp ngụm rượu nhíu mày, nhìn quanh hoa viên: "Rượu thì được đấy, nhưng chén đĩa kiểu cách quá khiến ta ngứa ngáy. Uống rượu là phải ừng ực cả vò chứ nhấp nháp thế này sao đã!"',
    dialogue_en: 'Zhang Fei sips the wine with a furrowed brow: "The wine is fine, but all this fussy etiquette makes me restless. Real drinking means tipping the jar, not nibbling at dainty cups!"',
    source: 'CANONICAL_SEED'
  },
  // BANQUET_DRINK - CRITICAL_FAILURE
  {
    id: 'DLG-ZF-DRINK-FAIL-1',
    npc_id: 'NPC-0002',
    action_type: 'BANQUET_DRINK',
    outcome_tier: 'CRITICAL_FAILURE',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trương Phi',
    speaker_name_en: 'Zhang Fei',
    dialogue_vi: 'Trương Phi đập tay xuống bàn, trợn mắt quát: "Lương huynh lời lẽ vòng vo khách khí quá đỗi! Ta ghét nhất phường nho gia dài dòng trên bàn tiệc. Mau cất thứ lễ nghi sáo rỗng đó đi!"',
    dialogue_en: 'Zhang Fei slams his hand on the table, glaring: "Brother Liang, your words are too convoluted and ceremonial! I despise pedantic flatterers at a banquet table. Put away those hollow pleasantries!"',
    source: 'CANONICAL_SEED'
  },

  // SPAR_DEBATE - CRITICAL_SUCCESS (Variant 1)
  {
    id: 'DLG-ZF-SPAR-CRIT-1',
    npc_id: 'NPC-0002',
    action_type: 'SPAR_DEBATE',
    outcome_tier: 'CRITICAL_SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trương Phi',
    speaker_name_en: 'Zhang Fei',
    dialogue_vi: 'Trương Phi xoay tít Xà Mâu xé gió rít gào, thu thế đứng sừng sững gật đầu tán thưởng: "Hảo thương pháp! Đòn đâm vừa rồi hiểm hóc và trầm ổn lắm, ép ta phải tung bảy phần kình lực mới gạt nổi! Lương đệ quả nhiên văn võ song toàn!"',
    dialogue_en: 'Zhang Fei whirls his Serpent Spear whistling through the air, planting his stance firmly with resounding praise: "Superb spear craft! That thrust was deadly sharp and grounded, forcing me to exert seventy percent of my vigor to parry! Brother Liang, you truly wield both brush and blade!"',
    source: 'CANONICAL_SEED'
  },
  // SPAR_DEBATE - SUCCESS
  {
    id: 'DLG-ZF-SPAR-SUCC-1',
    npc_id: 'NPC-0002',
    action_type: 'SPAR_DEBATE',
    outcome_tier: 'SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trương Phi',
    speaker_name_en: 'Zhang Fei',
    dialogue_vi: 'Hai bên giao phong hơn ba mươi hiệp mồ hôi ướt đẫm trường bào. Trương Phi cười lớn: "Đánh một trận đã tay thông suốt gân cốt! Đòn thế của đệ tiến bộ rất nhanh, có thêm gia đinh tinh nhuệ trợ chiến thì giặc cướp nào dám bén mảng!"',
    dialogue_en: 'Both sides clash for over thirty bouts until cloaks are drenched in sweat. Zhang Fei laughs heartily: "A splendid bout to loosen the sinews! Your technique improves swiftly; with your armed retainers, what bandit dare approach!"',
    source: 'CANONICAL_SEED'
  },

  // LEARN_MENTOR - CRITICAL_SUCCESS
  {
    id: 'DLG-ZF-MENTOR-CRIT-1',
    npc_id: 'NPC-0002',
    action_type: 'LEARN_MENTOR',
    outcome_tier: 'CRITICAL_SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trương Phi',
    speaker_name_en: 'Zhang Fei',
    dialogue_vi: 'Trương Phi đích thân cầm cán thương của Lương Diễn uốn nắn trục lực: "Nhớ kỹ yếu quyết này: Cầm thương như cầm long, kình phát từ gót chân truyền lên thắt lưng rồi dồn vào mũi thương! Đệ ngộ tính cao, một điểm là thông suốt!"',
    dialogue_en: 'Zhang Fei personally grasps Liang Yan\'s spear shaft to adjust force alignment: "Remember this vital essence: Hold the spear as gripping a coiling dragon; power springs from the heel, courses through the waist, and bursts from the tip! Your comprehension is exceptional!"',
    source: 'CANONICAL_SEED'
  },

  // TEA_CONVERSE - SUCCESS
  {
    id: 'DLG-ZF-TEA-SUCC-1',
    npc_id: 'NPC-0002',
    action_type: 'TEA_CONVERSE',
    outcome_tier: 'SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trương Phi',
    speaker_name_en: 'Zhang Fei',
    dialogue_vi: 'Trương Phi nâng bát trà lớn uống cạn một hơi rồi gật gù: "Lão Trương ta vốn quen uống rượu vò lớn, nay ngồi uống trà đàm đạo cùng Lương đệ mới thấy lòng dạ lắng lại đôi chút. Lời đệ nói rất có lý, thời loạn này muốn cứu dân thì không thể chỉ cậy sức mạnh mà phải có mưu lược!"',
    dialogue_en: 'Zhang Fei drains a large tea bowl in one draught, nodding: "Old Zhang is used to gulping wine from jars, yet sitting for tea with you brings peace to my restless spirit. Your words hold great truth—in chaotic times, saving the people requires strategy, not mere brute force!"',
    source: 'CANONICAL_SEED'
  },
  // TEA_CONVERSE - CRITICAL_SUCCESS
  {
    id: 'DLG-ZF-TEA-CRIT-1',
    npc_id: 'NPC-0002',
    action_type: 'TEA_CONVERSE',
    outcome_tier: 'CRITICAL_SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trương Phi',
    speaker_name_en: 'Zhang Fei',
    dialogue_vi: 'Trương Phi ánh mắt rực sáng, vỗ đùi đánh đét cười sảng khoái: "Hay! Rất hay! Chí Viễn nhìn nhận thời cuộc thấu đáo chẳng kém gì các bậc túc nho! Lão Trương ta tuy thô lỗ nhưng kính trọng kẻ có tài đức. Đàm đạo xong trận trà này, lát nữa nhất định phải cùng ta nâng chén rượu thịt ăn mừng!"',
    dialogue_en: 'Zhang Fei\'s eyes gleam brightly as he slaps his thigh in hearty laughter: "Splendid! Truly splendid! Zhiyuan perceives worldly currents as sharply as the grandest scholars! Old Zhang may be coarse, but I revere men of intellect and virtue. After this tea, you must join me in feasting with meat and wine!"',
    source: 'CANONICAL_SEED'
  },
  // SPAR_DEBATE - SUCCESS (Spear drills under Peach Blossoms)
  {
    id: 'DLG-ZF-SPAR-SUCC-2',
    npc_id: 'NPC-0002',
    action_type: 'SPAR_DEBATE',
    outcome_tier: 'SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trương Phi',
    speaker_name_en: 'Zhang Fei',
    dialogue_vi: 'Hai bên múa thương hoa đào rụng lả tả. Trương Phi hạ Xà Mâu xuống, vuốt râu khen ngợi: "Đòn thế Thương Pháp của Lương đệ ra đòn dứt khoát, kình lực dồn vào mũi thương đã có ba phần uy dũng! Cứ khổ luyện dưới gốc đào này mỗi ngày, ngày sau ra trận ắt khiến quân giặc khiếp vía!"',
    dialogue_en: 'Both wield spears as peach blossoms scatter in the wind. Zhang Fei lowers his Serpent Spear, praising with satisfaction: "Brother Liang\'s spear strokes are decisive and crisp; the vigor concentrated at the tip already bears formidable might! Keep drilling beneath these blossoms daily, and enemy vanguards will tremble before you on the field!"',
    source: 'CANONICAL_SEED'
  },
  // HEART_CONFESSION - CRITICAL_SUCCESS
  {
    id: 'DLG-ZF-HEART-CRIT-1',
    npc_id: 'NPC-0002',
    action_type: 'HEART_CONFESSION',
    outcome_tier: 'CRITICAL_SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trương Phi',
    speaker_name_en: 'Zhang Fei',
    dialogue_vi: 'Trương Phi nhìn rặng đào hạ trạch xao xác trong gió xuân, mắt ngời ngời nhiệt huyết: "Lão Trương ta mổ heo bán rượu ở đất Trác này bấy lâu, ruột gan lúc nào cũng nóng như lửa đốt trước cảnh giặc cướp bừa bãi. Nay có Lương đệ đồng lòng cứu khốn phò nguy, tính mạng này ta phó thác cho đại nghĩa!"',
    dialogue_en: 'Zhang Fei gazes across the peach orchard rustling in spring winds, his eyes burning with fervor: "Old Zhang has slaughtered pigs and vended wine in Zhuo for years, boiling with rage seeing commoners oppressed. Now standing shoulder-to-shoulder with you, Brother Liang, I stake my very life upon this noble path!"',
    source: 'CANONICAL_SEED'
  },
  // GIFT_TREASURE - SUCCESS
  {
    id: 'DLG-ZF-GIFT-SUCC-1',
    npc_id: 'NPC-0002',
    action_type: 'GIFT_TREASURE',
    outcome_tier: 'SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trương Phi',
    speaker_name_en: 'Zhang Fei',
    dialogue_vi: 'Trương Phi nhận lấy lễ vật từ tay Lương Diễn, cười to sảng khoái: "Ha ha! Lương đệ thật chu đáo! Bằng hữu kết giao cốt ở tấm lòng chân thật, món quà này ta xin nhận lấy, sau này đệ có việc gì cần cứ ới một tiếng, lão Trương ta quyết không chối từ!"',
    dialogue_en: 'Zhang Fei accepts the gift from Liang Yan, laughing with booming delight: "Haha! Brother Liang is truly considerate! Brotherhood is bound by genuine hearts; I gladly receive this token. Call upon me whenever you have need, and Old Zhang will never refuse!"',
    source: 'CANONICAL_SEED'
  },

  // =========================================================================
  // NPC-0003: QUAN VŨ (GUAN YU • VÂN TRƯỜNG)
  // Personality: Uy nghiêm, trọng đại nghĩa, điềm tĩnh, yêu chuộng sách Xuân Thu
  // =========================================================================
  // TEA_CONVERSE - CRITICAL_SUCCESS
  {
    id: 'DLG-GY-TEA-CRIT-1',
    npc_id: 'NPC-0003',
    action_type: 'TEA_CONVERSE',
    outcome_tier: 'CRITICAL_SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Quan Vũ',
    speaker_name_en: 'Guan Yu',
    dialogue_vi: 'Quan Vũ vuốt chòm râu dài năm tấc, khẽ gật đầu ánh mắt bộc lộ sự thấu suốt: "Chí Viễn luận về chữ \'Nghĩa\' và \'Tín\' trong Xuân Thu quả thật đắc đạo. Thương nhân trọng tín, hiệp sĩ trọng nghĩa; giữ được hai điều ấy thì dẫu bão táp can qua cũng không sợ thẹn với trời đất."',
    dialogue_en: 'Guan Yu strokes his magnificent beard, nodding with penetrating insight: "Zhiyuan, your discourse on \'Righteousness\' and \'Trust\' from the Spring and Autumn Annals strikes deep truth. Merchants value trust, heroes prize honor; holding both fast, one walks upright through storms and warfare without shame before Heaven."',
    source: 'CANONICAL_SEED'
  },
  // TEA_CONVERSE - SUCCESS
  {
    id: 'DLG-GY-TEA-SUCC-1',
    npc_id: 'NPC-0003',
    action_type: 'TEA_CONVERSE',
    outcome_tier: 'SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Quan Vũ',
    speaker_name_en: 'Guan Yu',
    dialogue_vi: 'Quan Vũ nâng chén trà mộc mạc, bình thản đáp: "U Châu gió cát mịt mù, giặc Khăn Vàng nổi dậy tứ phương. Có người như Lương huynh hết lòng vì sự an ổn bách tính Trác Huyện, Vân Trường ta xin lấy trà thay rượu kính một chén."',
    dialogue_en: 'Guan Yu raises his humble tea cup, replying serenely: "Youzhou winds howl with dust as Yellow Turbans ravage every prefecture. Knowing Brother Liang strives earnestly for the peace of Zhuo commoners, Yunchang honors you with this cup of tea in lieu of wine."',
    source: 'CANONICAL_SEED'
  },
  // SPAR_DEBATE - CRITICAL_SUCCESS
  {
    id: 'DLG-GY-SPAR-CRIT-1',
    npc_id: 'NPC-0003',
    action_type: 'SPAR_DEBATE',
    outcome_tier: 'CRITICAL_SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Quan Vũ',
    speaker_name_en: 'Guan Yu',
    dialogue_vi: 'Quan Vũ thu lại Thanh Long Uyển Nguyệt Đao, khí vũ hiên ngang khen ngợi: "Bộ pháp linh hoạt, đòn thế biến hóa khôn lường! Lương huynh rèn dũa thêm kình lực bản thân thì tương lai nơi sa trường tất có đất dụng võ."',
    dialogue_en: 'Guan Yu recovers his Green Dragon Crescent Blade, eyes gleaming with stately esteem: "Deft footwork and versatile maneuvers! If Brother Liang further tempers his inner power, the battlefield will surely offer you great renown."',
    source: 'CANONICAL_SEED'
  },

  // =========================================================================
  // NPC-0001: LƯU BỊ (LIU BEI • HUYỀN ĐỨC)
  // Personality: Nhân nghĩa, khoan hòa, có chí lớn, hòa ái với kẻ sĩ
  // =========================================================================
  // HEART_CONFESSION - CRITICAL_SUCCESS
  {
    id: 'DLG-LB-HEART-CRIT-1',
    npc_id: 'NPC-0001',
    action_type: 'HEART_CONFESSION',
    outcome_tier: 'CRITICAL_SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Lưu Bị',
    speaker_name_en: 'Liu Bei',
    dialogue_vi: 'Lưu Bị xúc động nắm chặt hai tay Lương Diễn, hốc mắt rưng rưng: "Bị ta vốn là dòng dõi Hán thất nhưng cảnh ngộ hàn vi, dệt chiếu đan giày mưu sinh, chí nguyện muốn dẹp yên loạn thế cứu bách tính mà ngặt vì lực mỏng. Nay gặp được Chí Viễn cùng chung hoài bão, dẫu thịt nát xương tan ta cũng quyết không phụ tấm chân tình này!"',
    dialogue_en: 'Liu Bei grasps Liang Yan\'s hands with profound emotion, eyes brimming with tears: "Though of imperial descent, Bei was impoverished, weaving mats and making sandals, longing to pacify chaos yet hindered by humble means. Meeting you, Zhiyuan, sharing the selfsame noble resolve—even were my body shattered to dust, I would never betray this brotherhood!"',
    source: 'CANONICAL_SEED'
  },
  // TEA_CONVERSE - SUCCESS
  {
    id: 'DLG-LB-TEA-SUCC-1',
    npc_id: 'NPC-0001',
    action_type: 'TEA_CONVERSE',
    outcome_tier: 'SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Lưu Bị',
    speaker_name_en: 'Liu Bei',
    dialogue_vi: 'Lưu Bị ôn tồn lắng nghe rồi khẽ thở dài đầy nhân ái: "Quân nhu, khí giới, lương thảo của Lương Gia chính là lá chắn che chở sinh linh trước vó ngựa man rợ. Huynh gánh vác việc lớn này, công đức vô lượng."',
    dialogue_en: 'Liu Bei listens attentively and sighs with gentle compassion: "Liang Clan\'s provisions, weapons, and grain are a shield protecting innocent lives against ruthless raids. In shouldering this great burden, Brother Liang earns boundless merit."',
    source: 'CANONICAL_SEED'
  },

  // =========================================================================
  // NPC-0007: TRẦN BẢO (CHEN BAO • THỢ CẢ LƯƠNG GIA)
  // Personality: Cần cù, trung thành, tinh thông nghề mộc và đan dệt
  // =========================================================================
  // LEARN_MENTOR - SUCCESS
  {
    id: 'DLG-CB-MENTOR-SUCC-1',
    npc_id: 'NPC-0007',
    action_type: 'LEARN_MENTOR',
    outcome_tier: 'SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trần Bảo',
    speaker_name_en: 'Chen Bao',
    dialogue_vi: 'Thợ cả Trần Bảo cẩn thận giải thích từng thớ tre và cách chuốt sợi: "Bẩm Thiếu chủ, đan khiên trúc phải chọn tre già ba năm, ngâm nước vôi khử ẩm thì khi gặp đao kiếm mới không vỡ vụn. Thiếu chủ học một hiểu mười thế này, xưởng ta ắt hưng thịnh!"',
    dialogue_en: 'Master Chen Bao meticulously explains bamboo fiber weaving: "Young Master, crafting bamboo shields requires three-year-old stalks, limewater-cured so blades cannot splinter them. With Young Master\'s sharp grasp, our craft workshop will surely flourish!"',
    source: 'CANONICAL_SEED'
  },
  // BANQUET_DRINK - SUCCESS
  {
    id: 'DLG-CB-DRINK-SUCC-1',
    npc_id: 'NPC-0007',
    action_type: 'BANQUET_DRINK',
    outcome_tier: 'SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Trần Bảo',
    speaker_name_en: 'Chen Bao',
    dialogue_vi: 'Trần Bảo cung kính nâng chén cảm kích: "Đa tạ Thiếu chủ hạ mình ban rượu thịt đãi thợ xưởng. Anh em thợ thuyền ai nấy đều phấn khởi, thề dốc lòng làm ngày làm đêm để kịp giao đủ đơn hàng khiên giáp!"',
    dialogue_en: 'Chen Bao respectfully raises his cup in deep gratitude: "Thank you, Young Master, for condescending to feast the workshop artisans. Every artisan is overjoyed and swears to work day and night to fulfill every armor and shield commission!"',
    source: 'CANONICAL_SEED'
  },

  // =========================================================================
  // NPC-0012: LƯ THỰC (LU ZHI • TRUNG LANG TƯỚNG BẮC QUÂN)
  // Personality: Nho tướng chính trực, thông tuệ kinh điển và binh pháp
  // =========================================================================
  // TEA_CONVERSE - CRITICAL_SUCCESS
  {
    id: 'DLG-LZ-TEA-CRIT-1',
    npc_id: 'NPC-0012',
    action_type: 'TEA_CONVERSE',
    outcome_tier: 'CRITICAL_SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Lư Thực',
    speaker_name_en: 'Lu Zhi',
    dialogue_vi: 'Trung Lang Tướng Lư Thực chỉ lên bản đồ trận địa Quảng Tông: "Chí Viễn kiến giải lương đạo sâu sắc lắm. \'Binh mã vị động, lương thảo tiên hành\'. Lương Gia cung ứng quân nhu nghiêm cẩn thế này, triều đình tất nên ghi nhận công lao đầu bảng!"',
    dialogue_en: 'General Lu Zhi points to the Guangzong battle map: "Zhiyuan, your logistical insights are profound indeed. \'Before soldiers march, grain must lead\'. With Liang Clan\'s rigorous supplies, the imperial court must place your merit at the head of the roll!"',
    source: 'CANONICAL_SEED'
  },

  // =========================================================================
  // NPC-0060: CÔNG TÔN TOẢN (GONGSUN ZAN • BẠCH MÃ TƯỚNG QUÂN)
  // Personality: Hiếu chiến, dũng cảm, tự tôn, thủ lĩnh kỵ binh
  // =========================================================================
  // BANQUET_DRINK - SUCCESS
  {
    id: 'DLG-GZ-DRINK-SUCC-1',
    npc_id: 'NPC-0060',
    action_type: 'BANQUET_DRINK',
    outcome_tier: 'SUCCESS',
    relationship_tier: 'ANY',
    speaker_name_vi: 'Công Tôn Toản',
    speaker_name_en: 'Gongsun Zan',
    dialogue_vi: 'Công Tôn Toản nâng chén rượu biên ải đục ngầu, cười sang sảng: "Biên cương U Châu chỉ trọng kẻ có gan cùng ngựa tốt! Lương huynh đem khiên giáp tiếp tế quân nhu cho Bạch Mã Nghĩa Tòng, chính là bằng hữu của ta!"',
    dialogue_en: 'Gongsun Zan raises a bowl of border wine, laughing boldly: "The Youzhou frontier honors only courageous souls and swift steeds! In supplying shields and gear to my White Horse Cavalry, Brother Liang is a true comrade of mine!"',
    source: 'CANONICAL_SEED'
  }
];

function initDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[InitDialogueCache] Skipping nonexistent DB: ${dbPath}`);
    return;
  }
  const db = new Database(dbPath);
  console.log(`[InitDialogueCache] Processing database: ${dbPath}`);

  // Create table & index
  db.exec(CREATE_TABLE_SQL);

  // Seed or upsert initial dialogues
  const insertStmt = db.prepare(`
    INSERT INTO master_context_dialogues (
      id, npc_id, action_type, outcome_tier, relationship_tier,
      speaker_name_vi, speaker_name_en, dialogue_vi, dialogue_en,
      source, usage_count
    ) VALUES (
      @id, @npc_id, @action_type, @outcome_tier, @relationship_tier,
      @speaker_name_vi, @speaker_name_en, @dialogue_vi, @dialogue_en,
      @source, 0
    )
    ON CONFLICT(id) DO UPDATE SET
      dialogue_vi = excluded.dialogue_vi,
      dialogue_en = excluded.dialogue_en,
      speaker_name_vi = excluded.speaker_name_vi,
      speaker_name_en = excluded.speaker_name_en,
      source = excluded.source;
  `);

  const tx = db.transaction((dialogues) => {
    let count = 0;
    for (const d of dialogues) {
      insertStmt.run(d);
      count++;
    }
    return count;
  });

  const inserted = tx(SEED_DIALOGUES);
  console.log(`[InitDialogueCache] Successfully seeded ${inserted} contextual dialogues into ${path.basename(dbPath)}.`);

  const total = db.prepare('SELECT COUNT(*) as cnt FROM master_context_dialogues').get().cnt;
  console.log(`[InitDialogueCache] Total dialogue records in ${path.basename(dbPath)}: ${total}`);
  db.close();
}

console.log('=== INITIALIZING THREE KINGDOMS CONTEXTUAL DIALOGUE CACHE ===');
initDatabase(MASTER_DB_PATH);
initDatabase(SESSION_DB_PATH);
console.log('=== DIALOGUE CACHE SEEDING COMPLETED ===');
