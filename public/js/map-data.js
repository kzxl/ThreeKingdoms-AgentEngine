/**
 * ThreeKingdoms-AgentEngine: Regional Geography & Tactical Map Data (public/js/map-data.js)
 */

const QUICK_CHIPS_DATA = {
  'Vườn Đào': {
    presenceVi: 'Trang Viên Vườn Đào (Trực diện: Trương Phi • Dực Đức)',
    presenceEn: 'Peach Garden Manor (In-person: Zhang Fei • Yide)',
    placeholderVi: 'Lương Diễn đối thoại với Trương Phi... (hoặc gõ: "Phi thư về xưởng đóng khiên...")',
    placeholderEn: 'Liang Yan talks to Zhang Fei... (or type: "Send courier to workshop...")',
    chips: [
      { type: 'local', icon: '武', labelVi: 'Đấu Thương Trương Phi', labelEn: 'Spar with Zhang Fei', promptVi: 'Thỉnh giáo Trương Phi đấu thương thực chiến đợt 2', promptEn: 'Spar with Zhang Fei in spear combat round 2' },
      { type: 'local', icon: '商', labelVi: 'Mua 8 Da Bò', labelEn: 'Buy 8 Leather', promptVi: 'Mua sỉ 8 tấm da thuộc của Trương Phi', promptEn: 'Buy 8 leather hides from Zhang Fei' },
      { type: 'local', icon: '飲', labelVi: 'Rượu Đào Viên', labelEn: 'Peach Wine', promptVi: 'Cùng Trương Phi uống rượu Đào Viên đàm đạo hào kiệt', promptEn: 'Drink wine with Zhang Fei discussing heroes' },
      { divider: true },
      { type: 'courier', icon: '信', labelVi: 'Phi thư về Xưởng', labelEn: 'Courier to Workshop', promptVi: 'Phái gia nhân phi thư về Xưởng Lương Thị lệnh đóng 5 khiên trúc', promptEn: 'Send courier to Workshop ordering 5 shields' },
      { type: 'courier', icon: '信', labelVi: 'Phái người ra Chợ', labelEn: 'Retainer to Market', promptVi: 'Sai gia đinh mang thư ra Chợ Đông Môn xuất bán 10 đấu muối', promptEn: 'Dispatch retainer to East Gate Market to sell 10 salt' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Đến Chợ Đông Môn', labelEn: 'Go to Market', promptVi: 'Rời Vườn Đào, rảo bước đi tới Chợ Đông Môn', promptEn: 'Leave Peach Garden and travel to East Gate Market' },
      { type: 'travel', icon: '行', labelVi: 'Đến Thiết Điếm', labelEn: 'To Smithy', promptVi: 'Rời Vườn Đào, đi tới Thiết Điếm Trác Huyện để rèn đao', promptEn: 'Travel to Town Smithy to forge weapons' },
      { type: 'travel', icon: '行', labelVi: 'Đến Tửu Quán', labelEn: 'To Tavern', promptVi: 'Rời Vườn Đào, đi tới Tửu Quán Trác Huyện', promptEn: 'Travel to Town Tavern' }
    ]
  },
  'Tư Trạch Vườn Đào': {
    presenceVi: 'Tư Trạch Vườn Đào • Lương Phủ (Trực diện: Thê Tử & Hậu Duệ)',
    presenceEn: 'Peach Garden Manor • Liang Residence (In-person: Spouse & Heirs)',
    placeholderVi: 'Lương Diễn tâm tình cùng thê thất, nghỉ ngơi tĩnh dưỡng...',
    placeholderEn: 'Liang Yan spends domestic moments with family and rests...',
    chips: [
      { type: 'local', icon: '休', labelVi: 'Nghỉ Ngơi Tĩnh Dưỡng', labelEn: 'Rest & Recover', promptVi: 'Nghỉ ngơi an giấc tại phòng trong, hồi phục thể lực và khí huyết', promptEn: 'Rest in private quarters to restore vitality' },
      { type: 'local', icon: '家', labelVi: 'Trò Chuyện Thê Tử', labelEn: 'Converse with Spouse', promptVi: 'Đàm đạo tâm tình cùng phu nhân, bồi đắp tình cảm gia đình', promptEn: 'Converse warmly with spouse to cultivate domestic harmony' },
      { type: 'local', icon: '嗣', labelVi: 'Chỉ Dạy Thế Tử', labelEn: 'Instruct Heirs', promptVi: 'Kiểm tra bài vở, truyền dạy võ nghệ và sách lược cho con cái', promptEn: 'Examine studies and tutor heirs in tactics and martial arts' },
      { type: 'local', icon: '書', labelVi: 'Kê Toán Tại Gia', labelEn: 'Review Home Desk', promptVi: 'Ngồi tại bàn làm việc tại gia duyệt sổ sách sản nghiệp và thu địa tô', promptEn: 'Review enterprise ledgers and tenant profits at home desk' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Đi Thiết Điếm', labelEn: 'To Smithy', promptVi: 'Rời tư trạch, đi tới Thiết Điếm Trác Huyện để rèn đao', promptEn: 'Leave residence and head to Town Smithy' },
      { type: 'travel', icon: '行', labelVi: 'Đi Tửu Quán', labelEn: 'To Tavern', promptVi: 'Rời tư trạch, đi tới Tửu Quán Trác Huyện', promptEn: 'Leave residence and head to Town Tavern' },
      { type: 'travel', icon: '行', labelVi: 'Ra Chợ Đông Môn', labelEn: 'To Market', promptVi: 'Rời tư trạch, đi ra Chợ Đông Môn & Sạp Trà', promptEn: 'Leave residence and head to East Gate Market' },
      { type: 'travel', icon: '行', labelVi: 'Tới Lôi Đài', labelEn: 'To Arena', promptVi: 'Rời tư trạch, đi sang Lôi Đài Giáo Trường tỉ võ', promptEn: 'Leave residence and head to Martial Arena' }
    ]
  },
  'Thiết Điếm Trác Huyện': {
    presenceVi: 'Thiết Điếm Lò Rèn Trác Huyện (Trực diện: Thợ Cả Trần Bảo)',
    presenceEn: 'Zhuo Town Smithy & Forge (In-person: Master Smith Chen Bao)',
    placeholderVi: 'Lương Diễn kéo bễ nung thép rèn đao... (hoặc gõ: "Thu mua sắt thỏi...")',
    placeholderEn: 'Liang Yan works the bellows forging blades... (or type: "Procure iron ingots...")',
    chips: [
      { type: 'local', icon: '工', labelVi: 'Kéo Bễ Rèn Đao', labelEn: 'Work Forge Bellows', promptVi: 'Đích thân kéo bễ, phụ việc rèn binh khí kiếm tiền công và tăng CRA EXP', promptEn: 'Work the forge bellows to earn wages and gain Crafting EXP' },
      { type: 'local', icon: '鍛', labelVi: 'Rèn Đúc Thần Binh', labelEn: 'Bespoke Forge', promptVi: 'Khai lò nung sắt, tự tay tôi luyện binh khí thần phẩm độc bản', promptEn: 'Operate master forge to craft bespoke unique weapons' },
      { type: 'local', icon: '商', labelVi: 'Mua 10 Thỏi Sắt', labelEn: 'Buy 10 Iron', promptVi: 'Thu mua 10 thỏi sắt tinh luyện từ thợ cả chuẩn bị đúc rèn', promptEn: 'Purchase 10 refined iron ingots from the master smith' },
      { type: 'local', icon: '師', labelVi: 'Thỉnh Giáo Thợ Cả', labelEn: 'Consult Master', promptVi: 'Đàm đạo cùng Thợ Cả Trần Bảo về thuật tôi thép và đúc kiếm bách luyện', promptEn: 'Discuss metallurgy with Master Smith Chen Bao' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Về Tư Trạch', labelEn: 'To Residence', promptVi: 'Rời thiết điếm, trở về Tư Trạch Vườn Đào nghỉ ngơi', promptEn: 'Leave smithy and return to Residence' },
      { type: 'travel', icon: '行', labelVi: 'Sang Tửu Quán', labelEn: 'To Tavern', promptVi: 'Rời thiết điếm, sang Tửu Quán Trác Huyện uống rượu', promptEn: 'Leave smithy and head to Tavern' },
      { type: 'travel', icon: '行', labelVi: 'Ra Chợ Đông Môn', labelEn: 'To Market', promptVi: 'Rời thiết điếm, ra Chợ Đông Môn giao dịch', promptEn: 'Leave smithy and head to East Gate Market' }
    ]
  },
  'Tửu Quán Trác Huyện': {
    presenceVi: 'Tửu Quán Trác Huyện (Trực diện: Chưởng Quỹ & Hào Kiệt Giang Hồ)',
    presenceEn: 'Zhuo Town Tavern (In-person: Tavernkeeper & Wandering Heroes)',
    placeholderVi: 'Lương Diễn nâng chén đàm đạo hào hiệp... (hoặc gõ: "Mở tiệc thết đãi...")',
    placeholderEn: 'Liang Yan drinks and converses with heroes... (or type: "Host banquet...")',
    chips: [
      { type: 'local', icon: '飲', labelVi: 'Uống Rượu Hồi Thể Lực', labelEn: 'Drink Vintage Wine', promptVi: 'Gọi vò Trác Thành Trán Nương uống rượu xua tan mệt mỏi và hồi thể lực', promptEn: 'Drink vintage wine to restore stamina' },
      { type: 'local', icon: '宴', labelVi: 'Mở Tiệc Hào Kiệt', labelEn: 'Host Hero Banquet', promptVi: 'Mở tiệc rượu linh đình thết đãi hào kiệt bốn phương, tăng hảo cảm danh sĩ', promptEn: 'Host banquet to treat visiting heroes and raise affinity' },
      { type: 'local', icon: '義', labelVi: 'Chiêu Mộ Hảo Hán', labelEn: 'Recruit Heroes', promptVi: 'Quan sát các bàn tiệc, tìm kiếm hảo hán giang hồ chiêu mộ làm môn khách', promptEn: 'Recruit talented wanderers as retainers' },
      { type: 'local', icon: '結', labelVi: 'Cắt Máu Kết Nghĩa', labelEn: 'Swear Brotherhood', promptVi: 'Mời hảo hữu tri kỷ cắt máu ăn thề, kết bái huynh đệ đồng sinh cộng tử', promptEn: 'Take blood oaths of brotherhood with trusted friends' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Về Tư Trạch', labelEn: 'To Residence', promptVi: 'Rời tửu quán, quay về Tư Trạch Vườn Đào an giấc', promptEn: 'Return to Residence to sleep' },
      { type: 'travel', icon: '行', labelVi: 'Sang Lôi Đài', labelEn: 'To Arena', promptVi: 'Rời tửu quán sang Lôi Đài Giáo Trường đọ sức', promptEn: 'Proceed to Arena for combat' },
      { type: 'travel', icon: '行', labelVi: 'Sang Dịch Trạm', labelEn: 'To Depot', promptVi: 'Rời tửu quán, sang Mã Xa Dịch Trạm bàn việc', promptEn: 'Proceed to Caravan Depot' }
    ]
  },
  'Lôi Đài Giáo Trường': {
    presenceVi: 'Lôi Đài Giáo Trường Bắc Môn (Trực diện: Trương Phi • Võ Sĩ Lôi Đài)',
    presenceEn: 'Northern Drill Grounds & Arena (In-person: Zhang Fei • Arena Champions)',
    placeholderVi: 'Lương Diễn thượng đài luận võ... (hoặc gõ: "Thách đấu lôi đài...")',
    placeholderEn: 'Liang Yan steps into the sparring ring... (or type: "Challenge arena...")',
    chips: [
      { type: 'local', icon: '武', labelVi: 'Đấu Thương Trương Phi', labelEn: 'Spar with Zhang Fei', promptVi: 'Lên võ đài thỉnh giáo Trương Phi giao lưu thương pháp thực chiến', promptEn: 'Spar in spear combat with Zhang Fei' },
      { type: 'local', icon: '武', labelVi: 'Luận Kiếm Quan Vũ', labelEn: 'Spar with Guan Yu', promptVi: 'Thỉnh giáo Thanh Long đao pháp của Quan Vân Trường tăng WAR EXP', promptEn: 'Spar with Guan Yu to study blade tactics' },
      { type: 'local', icon: '演', labelVi: 'Thách Đấu Lôi Đài', labelEn: 'Enter Tournament', promptVi: 'Đăng ký khiêu chiến các võ sĩ lôi đài 3 cấp độ tranh đoạt ngân lượng', promptEn: 'Enter 3-tiered arena tournament for prize purses' },
      { type: 'local', icon: '兵', labelVi: 'Luyện Binh Thao Diễn', labelEn: 'Drill Retainers', promptVi: 'Tập hợp dân binh, chỉ đạo thao diễn chiến trận tăng LDR EXP', promptEn: 'Drill garrison troops in battle formations' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Sang Tửu Quán', labelEn: 'To Tavern', promptVi: 'Rời võ đài, sang Tửu Quán Trác Huyện khao quân', promptEn: 'Celebrate victories at the Tavern' },
      { type: 'travel', icon: '行', labelVi: 'Về Tư Trạch', labelEn: 'To Residence', promptVi: 'Rời giáo trường, quay về Tư Trạch dưỡng thương', promptEn: 'Return to Residence to recuperate' }
    ]
  },
  'Mã Xa Dịch Trạm': {
    presenceVi: 'Mã Xa Dịch Trạm & Thương Hội (Trực diện: Dịch Quan & Tiêu Sư)',
    presenceEn: 'Caravan Guild & Depot (In-person: Post Master & Escort Guards)',
    placeholderVi: 'Lương Diễn điều phối xe hàng, khảo sát lộ tuyến...',
    placeholderEn: 'Liang Yan coordinates wagons and maps caravan routes...',
    chips: [
      { type: 'local', icon: '商', labelVi: 'Lập Thương Đoàn', labelEn: 'Form Caravan', promptVi: 'Khảo sát chênh lệch giá cả các châu, tổ chức thương đoàn viễn chinh', promptEn: 'Establish long-distance expedition trade caravan' },
      { type: 'local', icon: '車', labelVi: 'Mua 1 Xe Ngựa Kéo', labelEn: 'Buy Carriage', promptVi: 'Chi tiền mua thêm xe ngựa kéo gia cố để tăng tải trọng hàng hóa', promptEn: 'Procure reinforced heavy carriage' },
      { type: 'local', icon: '衛', labelVi: 'Thuê 5 Tiêu Sư', labelEn: 'Hire Guards', promptVi: 'Thuê 5 tay tiêu sư hộ tống tinh nhuệ phòng thủ sơn tặc cướp bóc', promptEn: 'Hire 5 veteran guards to protect cargo' },
      { type: 'local', icon: '報', labelVi: 'Nghe Ngóng Thương Lộ', labelEn: 'Survey Routes', promptVi: 'Hỏi thăm dịch quan về tình hình chiến sự và thổ phỉ trên các tuyến đường', promptEn: 'Consult post officials regarding bandits and war hazards' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Ra Chợ Đông Môn', labelEn: 'To Market', promptVi: 'Rời dịch trạm, đi ra Chợ Đông Môn thu mua hàng', promptEn: 'Proceed to East Gate Market' },
      { type: 'travel', icon: '行', labelVi: 'Về Tư Trạch', labelEn: 'To Residence', promptVi: 'Rời dịch trạm, quay về Tư Trạch Vườn Đào nghỉ ngơi', promptEn: 'Return to Peach Garden Residence' }
    ]
  },
  'Chợ Đông Môn & Sạp Trà': {
    presenceVi: 'Chợ Đông Môn & Sạp Trà (Trực diện: Quan Vũ • Vân Trường)',
    presenceEn: 'East Gate Market & Tea Stall (In-person: Guan Yu • Yunchang)',
    placeholderVi: 'Lương Diễn đàm đạo tại Chợ... (hoặc gõ: "Phái gia nhân sang Vườn Đào...")',
    placeholderEn: 'Liang Yan dialogues at Market... (or type: "Dispatch messenger to Peach Garden...")',
    chips: [
      { type: 'local', icon: '商', labelVi: 'Bán 10 Chiếu Trúc', labelEn: 'Sell 10 Mats', promptVi: 'Xuất bán 10 tấm Chiếu Trúc Lương Gia cho Thương đoàn Ký Châu', promptEn: 'Sell 10 bamboo mats to Jizhou merchant caravan' },
      { type: 'local', icon: '商', labelVi: 'Mua 5 Lương Thảo', labelEn: 'Buy 5 Grain', promptVi: 'Thu mua 5 thạch lương tiểu mạch dự trữ', promptEn: 'Purchase 5 piculs of strategic grain' },
      { type: 'local', icon: '茶', labelVi: 'Đàm Đạo Quan Vũ', labelEn: 'Tea with Guan Yu', promptVi: 'Mời Quan Vũ uống trà đàm đạo binh pháp Xuân Thu', promptEn: 'Invite Guan Yu for tea discussing strategy' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Về Tư Trạch', labelEn: 'To Residence', promptVi: 'Rời Chợ Đông Môn, về Tư Trạch Vườn Đào', promptEn: 'Return to Peach Garden Residence' },
      { type: 'travel', icon: '行', labelVi: 'Đến Thiết Điếm', labelEn: 'To Smithy', promptVi: 'Rời Chợ Đông Môn, đi sang Thiết Điếm Trác Huyện', promptEn: 'Head to Town Smithy' },
      { type: 'travel', icon: '行', labelVi: 'Đến Dịch Trạm', labelEn: 'To Depot', promptVi: 'Rời Chợ Đông Môn, đi sang Mã Xa Dịch Trạm', promptEn: 'Head to Caravan Depot' }
    ]
  },
  'Chợ Đông Môn': {
    presenceVi: 'Chợ Đông Môn & Sạp Trà (Trực diện: Quan Vũ • Vân Trường)',
    presenceEn: 'East Gate Market & Tea Stall (In-person: Guan Yu • Yunchang)',
    placeholderVi: 'Lương Diễn đàm đạo tại Chợ... (hoặc gõ: "Phái gia nhân sang Vườn Đào...")',
    placeholderEn: 'Liang Yan dialogues at Market... (or type: "Dispatch messenger to Peach Garden...")',
    chips: [
      { type: 'local', icon: '商', labelVi: 'Bán 10 Chiếu Trúc', labelEn: 'Sell 10 Mats', promptVi: 'Xuất bán 10 tấm Chiếu Trúc Lương Gia cho Thương đoàn Ký Châu', promptEn: 'Sell 10 bamboo mats to Jizhou merchant caravan' },
      { type: 'local', icon: '商', labelVi: 'Mua 5 Lương Thảo', labelEn: 'Buy 5 Grain', promptVi: 'Thu mua 5 thạch lương tiểu mạch dự trữ', promptEn: 'Purchase 5 piculs of strategic grain' },
      { type: 'local', icon: '茶', labelVi: 'Đàm Đạo Quan Vũ', labelEn: 'Tea with Guan Yu', promptVi: 'Mời Quan Vũ uống trà đàm đạo binh pháp Xuân Thu', promptEn: 'Invite Guan Yu for tea discussing strategy' },
      { divider: true },
      { type: 'courier', icon: '信', labelVi: 'Báo tin Trương Phi', labelEn: 'Courier to Zhang Fei', promptVi: 'Phái gia nhân sang Vườn Đào báo tin cho Trương Phi', promptEn: 'Send courier to Peach Garden to inform Zhang Fei' },
      { type: 'courier', icon: '信', labelVi: 'Lệnh nhập kho Xưởng', labelEn: 'Stock order to Workshop', promptVi: 'Viết thư lệnh vận chuyển nguyên liệu tre da về Xưởng Lương Thị', promptEn: 'Dispatch letter to transfer raw materials to Workshop' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Về Vườn Đào', labelEn: 'To Peach Garden', promptVi: 'Rời Chợ Đông Môn, tới Trang Viên Vườn Đào', promptEn: 'Return to Peach Garden Manor' },
      { type: 'travel', icon: '行', labelVi: 'Đến Xưởng Lương Thị', labelEn: 'To Workshop', promptVi: 'Rời Chợ Đông Môn, tới Lương Thị Chức Tác Phường', promptEn: 'Travel to Liang Craft Workshop' }
    ]
  },
  'Xưởng Lương Thị': {
    presenceVi: 'Lương Thị Chức Tác Phường (Trực diện: Thợ Cả Trần Bảo)',
    presenceEn: 'Liang Craft Workshop (In-person: Master Chen Bao)',
    placeholderVi: 'Lương Diễn chỉ đạo tại Xưởng... (hoặc gõ: "Phái xe hàng ra chợ bán...")',
    placeholderEn: 'Liang Yan manages Workshop... (or type: "Dispatch wagon to market...")',
    chips: [
      { type: 'local', icon: '工', labelVi: 'Đóng 5 Khiên Trúc', labelEn: 'Craft 5 Shields', promptVi: 'Chỉ đạo thợ cả Trần Bảo khởi động đóng 5 khiên trúc', promptEn: 'Direct Chen Bao to craft 5 bamboo shields' },
      { type: 'local', icon: '商', labelVi: 'Dệt 10 Chiếu Trúc', labelEn: 'Weave 10 Mats', promptVi: 'Khởi ca dệt 10 tấm Chiếu Trúc Lương Gia', promptEn: 'Start batch weaving 10 bamboo mats' },
      { type: 'local', icon: '賞', labelVi: 'Thưởng 100 Quan', labelEn: 'Reward 100 quan', promptVi: 'Khen thưởng 100 quan cho thợ cả Trần Bảo động viên thợ', promptEn: 'Reward 100 quan to master craftsman Chen Bao' },
      { divider: true },
      { type: 'courier', icon: '信', labelVi: 'Xe hàng ra Chợ', labelEn: 'Wagon to Market', promptVi: 'Phái gia nhân áp tải xe hàng chiếu trúc ra Chợ Đông Môn', promptEn: 'Dispatch retainer wagon with mats to East Gate Market' },
      { type: 'courier', icon: '信', labelVi: 'Báo Bắc Quân', labelEn: 'Report to Army', promptVi: 'Phi thư báo cho Bắc Quân Đại Doanh về tiến độ khiên giáp', promptEn: 'Send courier to Northern Army on shield readiness' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Ra Chợ Đông Môn', labelEn: 'To Market', promptVi: 'Rời xưởng Lương Thị, đi tới Chợ Đông Môn', promptEn: 'Leave workshop and head to East Gate Market' },
      { type: 'travel', icon: '行', labelVi: 'Về Vườn Đào', labelEn: 'To Peach Garden', promptVi: 'Rời xưởng Lương Thị, quay về Trang Viên Vườn Đào', promptEn: 'Return to Peach Garden Manor' }
    ]
  },
  'Bắc Bình Soái Phủ': {
    presenceVi: 'Bắc Bình Soái Phủ (Trực diện: Công Tôn Toản • Bạch Mã Tướng Quân)',
    presenceEn: 'Beiping Headquarters (In-person: Gongsun Zan • White Horse General)',
    placeholderVi: 'Lương Diễn đàm đạo cùng Công Tôn Toản... (hoặc gõ: "Mua ngựa chiến...")',
    placeholderEn: 'Liang Yan negotiates with Gongsun Zan... (or type: "Buy warhorses...")',
    chips: [
      { type: 'local', icon: '行', labelVi: 'Mua 3 Ngựa Chiến U Châu', labelEn: 'Buy 3 Horses', promptVi: 'Thu mua 3 tuấn mã U Châu của Bạch Mã Nghĩa Tòng', promptEn: 'Purchase 3 Youzhou warhorses from White Horse Cavalry' },
      { type: 'local', icon: '工', labelVi: 'Tiếp Tế 10 Khiên Trúc', labelEn: 'Supply 10 Shields', promptVi: 'Cung cấp 10 Khiên Trúc Lương Gia chi viện quân biên cương', promptEn: 'Deliver 10 Liang shields to garrison border forces' },
      { type: 'local', icon: '交', labelVi: 'Liên Minh Huyện Trác', labelEn: 'Alliance Pact', promptVi: 'Đàm phán hiệp ước tương trợ quân nhu Huyện Trác và Bắc Bình', promptEn: 'Negotiate mutual defense supply pact with Gongsun Zan' },
      { divider: true },
      { type: 'courier', icon: '信', labelVi: 'Báo tin Lưu Bị', labelEn: 'Courier to Liu Bei', promptVi: 'Phi thư về Huyện Trác báo cho Lưu Bị về tình hình Công Tôn Toản', promptEn: 'Dispatch courier to Liu Bei regarding Gongsun Zan alliance' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Về Huyện Trác', labelEn: 'To Zhuo County', promptVi: 'Rời Bắc Bình, xuôi quan đạo trở về Huyện Trác', promptEn: 'Return along post road back to Zhuo County' }
    ]
  },
  'Nghiệp Thành Đại Phủ': {
    presenceVi: 'Nghiệp Thành Phủ Đệ (Trực diện: Viên Thiệu • Ký Châu Mục)',
    presenceEn: 'Yecheng Grand Estate (In-person: Yuan Shao • Lord of Jizhou)',
    placeholderVi: 'Lương Diễn yết kiến Viên Bản Sơ... (hoặc gõ: "Ký kết thương ước gấm lụa...")',
    placeholderEn: 'Liang Yan confers with Yuan Shao... (or type: "Sign luxury textile pact...")',
    chips: [
      { type: 'local', icon: '政', labelVi: 'Bán 20 Tấm Chiếu Trúc', labelEn: 'Sell 20 Mats', promptVi: 'Xuất bán 20 tấm Chiếu Trúc Lương Gia cho các đại tộc Nghiệp Thành', promptEn: 'Sell 20 Liang bamboo mats to Jizhou patricians' },
      { type: 'local', icon: '商', labelVi: 'Mua 15 Thạch Lương Ký Châu', labelEn: 'Buy 15 Grain', promptVi: 'Gom mua 15 thạch lương Ký Châu giá sỉ từ đại thương nhân', promptEn: 'Wholesale purchase 15 piculs of prime Jizhou grain' },
      { type: 'local', icon: '飲', labelVi: 'Dự Yến Viên Bản Sơ', labelEn: 'Banquet Yuan Shao', promptVi: 'Tham gia dạ yến phủ Viên Thiệu đàm đạo thời thế', promptEn: 'Attend grand banquet at Yuan Shao estate discussing politics' },
      { divider: true },
      { type: 'courier', icon: '信', labelVi: 'Lệnh chuyển hàng về Xưởng', labelEn: 'Logistics Courier', promptVi: 'Phi thư lệnh chuyển nguyên liệu Ký Châu về Xưởng Huyện Trác', promptEn: 'Send logistical courier to route materials to Zhuo Workshop' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Đến Quảng Tông', labelEn: 'To Guangzong', promptVi: 'Tiến về phía Đông Bắc đến tiền tuyến Quảng Tông', promptEn: 'March northeast toward Guangzong front' },
      { type: 'travel', icon: '行', labelVi: 'Về Huyện Trác', labelEn: 'To Zhuo County', promptVi: 'Rời Nghiệp Thành, theo đường bắc tiến về Huyện Trác', promptEn: 'Return north back to Zhuo County' }
    ]
  },
  'Quảng Tông Quân Doanh': {
    presenceVi: 'Bắc Quân Soái Trướng (Trực diện: Trung Lang Tướng Lư Thực)',
    presenceEn: 'Northern Army Headquarters (In-person: General Lu Zhi)',
    placeholderVi: 'Lương Diễn tham vấn tại Quân Doanh... (hoặc gõ: "Phi thư về Trác Huyện...")',
    placeholderEn: 'Liang Yan confers with General... (or type: "Send courier to Zhuo County...")',
    chips: [
      { type: 'local', icon: '勳', labelVi: 'Yết Kiến Lư Thực', labelEn: 'Audience Lu Zhi', promptVi: 'Yết kiến Trung Lang Tướng Lư Thực nhận thưởng quân công', promptEn: 'Audience with General Lu Zhi to claim bounty' },
      { type: 'local', icon: '商', labelVi: 'Tiếp Tế Quân Lương', labelEn: 'Supply Grain', promptVi: 'Tiếp tế 5 thạch lương tiểu mạch cho Quân Nhu Cục', promptEn: 'Deliver 5 piculs of grain to supply depot' },
      { type: 'local', icon: '圖', labelVi: 'Tham Mưu Sa Bàn', labelEn: 'Strategy Map', promptVi: 'Cùng Lư Thực tham mưu sa bàn phá vỡ vòng vây Khăn Vàng', promptEn: 'Consult strategy battle map with Lu Zhi' },
      { divider: true },
      { type: 'courier', icon: '信', labelVi: 'Phi thư về Huyện Trác', labelEn: 'Courier to Zhuo County', promptVi: 'Phi thư hỏa tốc về Huyện Trác chuẩn bị thêm 20 xe quân lương', promptEn: 'Send urgent courier to Zhuo County for 20 grain wagons' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Sang Bình Nguyên', labelEn: 'To Pingyuan', promptVi: 'Hành quân sang Trọng Trấn Bình Nguyên hội quân', promptEn: 'March to Pingyuan stronghold' },
      { type: 'travel', icon: '行', labelVi: 'Về Lại Huyện Trác', labelEn: 'Return to Zhuo County', promptVi: 'Rời quân doanh Quảng Tông, quay trở về Huyện Trác', promptEn: 'Leave Guangzong and return to Zhuo County' }
    ]
  },
  'Bình Nguyên Trọng Trấn': {
    presenceVi: 'Bình Nguyên Trọng Trấn (Trực diện: Vương Triệt • Huyện Thừa)',
    presenceEn: 'Pingyuan Stronghold (In-person: Wang Che • Magistrate)',
    placeholderVi: 'Lương Diễn điều phối tại Bình Nguyên... (hoặc gõ: "Hành quân sang Quảng Tông...")',
    placeholderEn: 'Liang Yan coordinates in Pingyuan... (or type: "March to Guangzong...")',
    chips: [
      { type: 'local', icon: '工', labelVi: 'Bán 5 Khiên Trúc', labelEn: 'Sell 5 Shields', promptVi: 'Cung cấp 5 Khiên Trúc Lương Gia cho Dân Binh Xã Tắc', promptEn: 'Supply 5 Liang bamboo shields to local militia' },
      { type: 'local', icon: '商', labelVi: 'Mua Lương Thanh Châu', labelEn: 'Buy Grain', promptVi: 'Thu mua lương thảo ngô khoai Thanh Châu tiếp tế', promptEn: 'Purchase provisions from Qingzhou merchants' },
      { type: 'local', icon: '策', labelVi: 'Kế Hoạch Dịch Trạm', labelEn: 'Post Relay Plan', promptVi: 'Hiến kế thiết lập hệ thống phong hỏa đài cảnh giới liên hoàn', promptEn: 'Advise on border beacon signaling network' },
      { divider: true },
      { type: 'courier', icon: '信', labelVi: 'Phi thư về Xưởng', labelEn: 'Courier to Workshop', promptVi: 'Phi thư về Xưởng Lương Thị chỉ đạo chuẩn bị thêm 10 khiên trúc', promptEn: 'Dispatch courier to Workshop for 10 shields' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Sang Quảng Tông', labelEn: 'To Guangzong', promptVi: 'Hành quân sang đại doanh Quảng Tông hội quân cùng Lư Thực', promptEn: 'March to Guangzong army camp to rendezvous with Lu Zhi' },
      { type: 'travel', icon: '行', labelVi: 'Về Huyện Trác', labelEn: 'To Zhuo County', promptVi: 'Hành quân trở về Hậu Phương Trang Viên Vườn Đào Huyện Trác', promptEn: 'Return to Peach Garden Manor in Zhuo County' }
    ]
  },
  'Hứa Xương Tướng Phủ': {
    presenceVi: 'Hứa Xương Soái Phủ (Trực diện: Tào Tháo • Mạnh Đức)',
    presenceEn: 'Xuchang Headquarters (In-person: Cao Cao • Mengde)',
    placeholderVi: 'Lương Diễn đàm đạo cùng Tào Tháo... (hoặc gõ: "Tiếp tế quân bị...")',
    placeholderEn: 'Liang Yan confers with Cao Cao... (or type: "Supply armaments...")',
    chips: [
      { type: 'local', icon: '武', labelVi: 'Chi Viện Khí Giới', labelEn: 'Supply Arms', promptVi: 'Cung cấp 10 Khiên Trúc bọc da cho Hổ Báo Kỵ của Tào Tháo', promptEn: 'Supply 10 reinforced shields to Cao Cao Tiger-Leopard cavalry' },
      { type: 'local', icon: '商', labelVi: 'Bán 10 Thạch Lương', labelEn: 'Sell 10 Grain', promptVi: 'Xuất bán 10 thạch lương tiếp tế đồn điền Dự Châu', promptEn: 'Sell 10 grain piculs for Yuzhou agricultural military camps' },
      { type: 'local', icon: '策', labelVi: 'Đàm Luận Anh Hùng', labelEn: 'Discuss Heroes', promptVi: 'Cùng Tào Tháo luận đàm anh hùng thiên hạ và thế cuộc', promptEn: 'Discuss grand strategy and contemporary heroes with Cao Cao' },
      { divider: true },
      { type: 'courier', icon: '信', labelVi: 'Báo tiệp Huyện Trác', labelEn: 'Courier to Zhuo', promptVi: 'Phi thư về Huyện Trác thông báo quan hệ hợp tác với Tào Tháo', promptEn: 'Send courier to Zhuo County reporting ties with Cao Cao' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Tiến Vào Lạc Dương', labelEn: 'To Luoyang', promptVi: 'Vượt Hổ Lao Quan tiến về Kinh Sư Lạc Dương', promptEn: 'Pass Hulao Pass to Imperial Luoyang' },
      { type: 'travel', icon: '行', labelVi: 'Đến Hạ Phì', labelEn: 'To Xiapi', promptVi: 'Hành quân về phía đông sang Từ Châu Hạ Phì', promptEn: 'March east to Xiapi in Xuzhou' }
    ]
  },
  'Hạ Phì Thành Lũy': {
    presenceVi: 'Hạ Phì Thành Phủ (Trực diện: Đào Khiêm • Thứ Sử Từ Châu)',
    presenceEn: 'Xiapi Citadel (In-person: Tao Qian • Governor of Xuzhou)',
    placeholderVi: 'Lương Diễn yết kiến Thứ Sử Từ Châu... (hoặc gõ: "Giao thương muối cá...")',
    placeholderEn: 'Liang Yan negotiates in Xiapi... (or type: "Trade fishery & salt...")',
    chips: [
      { type: 'local', icon: '商', labelVi: 'Mua Muối & Thủy Sản', labelEn: 'Buy Salt & Fish', promptVi: 'Thu mua 15 đấu muối biển và hải sản Từ Châu', promptEn: 'Procure 15 sea salt and coastal rations from Xuzhou' },
      { type: 'local', icon: '工', labelVi: 'Hỗ Trợ Thành Phòng', labelEn: 'Citadel Defense', promptVi: 'Hiến kế củng cố tường lũy Hạ Phì phòng thủ giặc cướp', promptEn: 'Advise on fortification reinforcement against raiders' },
      { type: 'local', icon: '交', labelVi: 'Kết Giao Mi Trúc', labelEn: 'Meet Mi Zhu', promptVi: 'Tiếp xúc cự phú Mi Trúc bàn kế hoạch liên minh thương hội', promptEn: 'Meet merchant magnate Mi Zhu to establish trade confederation' },
      { divider: true },
      { type: 'courier', icon: '信', labelVi: 'Phi thư về Huyện Trác', labelEn: 'Courier to Zhuo', promptVi: 'Gửi thư báo tin tình hình hải thương Từ Châu về Huyện Trác', promptEn: 'Dispatch merchant report to Zhuo County' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Về Hứa Xương', labelEn: 'To Xuchang', promptVi: 'Rời Hạ Phì, hành quân về phía tây đến Hứa Xương', promptEn: 'March west back to Xuchang' }
    ]
  },
  'Kinh Đô Lạc Dương': {
    presenceVi: 'Kinh Đô Lạc Dương (Trực diện: Hà Tiến • Đại Tướng Quân)',
    presenceEn: 'Imperial Luoyang (In-person: General-in-Chief He Jin)',
    placeholderVi: 'Lương Diễn yết kiến triều đình Lạc Dương... (hoặc gõ: "Dâng biểu quân công...")',
    placeholderEn: 'Liang Yan at Imperial Court... (or type: "Submit memorial...")',
    chips: [
      { type: 'local', icon: '勳', labelVi: 'Nhận Sắc Phong Triều Đình', labelEn: 'Claim Imperial Bounty', promptVi: 'Nhận sắc phong Quân Nhu Tán Quan & Thưởng 2,500 Quan từ Triều Đình', promptEn: 'Claim imperial commission and 2,500 quan bounty' },
      { type: 'local', icon: '政', labelVi: 'Mở Phân Hiệu Kinh Đô', labelEn: 'Found Capital Branch', promptVi: 'Đăng ký môn bài chi nhánh Lương Gia Thương Hội tại Kinh Sư', promptEn: 'Register Liang Merchant Guild branch in the Capital' },
      { type: 'local', icon: '茶', labelVi: 'Gặp Binh Bộ Thượng Thư', labelEn: 'Court Networking', promptVi: 'Biếu lễ vật tiếp xúc Binh Bộ Thượng Thư nắm bắt thời cuộc', promptEn: 'Audience with Minister of War to discuss contracts' },
      { divider: true },
      { type: 'courier', icon: '信', labelVi: 'Chỉ đạo Xưởng Trác Huyện', labelEn: 'Direct Zhuo Workshop', promptVi: 'Phi thư về Huyện Trác chỉ đạo mở rộng quy mô xưởng dệt gấp đôi', promptEn: 'Dispatch instructions to Zhuo County to expand workshop' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Sang Trường An', labelEn: 'To Changan', promptVi: 'Vượt Đồng Quan tiến sang Tây Đô Trường An', promptEn: 'Cross Tong Pass to Western Capital Changan' },
      { type: 'travel', icon: '行', labelVi: 'Về Huyện Trác', labelEn: 'To Zhuo County', promptVi: 'Rời Kinh Sư Lạc Dương, cất bước trở về Trang Viên Vườn Đào Huyện Trác', promptEn: 'Depart Luoyang and return to Peach Garden Manor in Zhuo County' }
    ]
  },
  'Trường An Cung Phủ': {
    presenceVi: 'Trường An Phủ Đệ (Trực diện: Tư Đồ Vương Doãn / Đổng Trác)',
    presenceEn: 'Changan Palace Hall (In-person: Minister Wang Yun / Dong Zhuo)',
    placeholderVi: 'Lương Diễn thị sát Tây Đô Trường An... (hoặc gõ: "Mua chiến mã Tây Lương...")',
    placeholderEn: 'Liang Yan observes Changan... (or type: "Procure Xiliang steeds...")',
    chips: [
      { type: 'local', icon: '行', labelVi: 'Mua Ngựa Tây Lương', labelEn: 'Buy Xiliang Steeds', promptVi: 'Thu mua 5 tuấn mã Tây Lương dũng mãnh cho đoàn kỵ mã', promptEn: 'Procure 5 fierce Xiliang steeds for escort brigade' },
      { type: 'local', icon: '武', labelVi: 'Giao Tiếp Quan Trường', labelEn: 'Court Diplomacy', promptVi: 'Gặp gỡ Tư Đồ Vương Doãn tìm hiểu mật mưu triều chính', promptEn: 'Audience with Minister Wang Yun regarding court dynamics' },
      { type: 'local', icon: '商', labelVi: 'Bán Lương Quan Trung', labelEn: 'Sell Grain', promptVi: 'Xuất bán 8 thạch lương thực cho kho đồn trú Trường An', promptEn: 'Supply 8 grain piculs to Changan garrison storehouses' },
      { divider: true },
      { type: 'courier', icon: '信', labelVi: 'Mật báo Lạc Dương', labelEn: 'Dispatch to Luoyang', promptVi: 'Phi thư mật bảo tình hình Tây Vực và Quan Trung về Lạc Dương', promptEn: 'Send confidential courier report to Luoyang' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Qua Hán Trung', labelEn: 'To Hanzhong', promptVi: 'Vượt Tần Lĩnh sạn đạo tiến về phía nam đến Hán Trung', promptEn: 'Traverse Qinling mountain plank roads south to Hanzhong' },
      { type: 'travel', icon: '行', labelVi: 'Về Lạc Dương', labelEn: 'To Luoyang', promptVi: 'Qua ải Đồng Quan quay trở lại Đông Đô Lạc Dương', promptEn: 'Return east through Tong Pass to Luoyang' }
    ]
  },
  'Tương Dương Châu Phủ': {
    presenceVi: 'Tương Dương Châu Phủ (Trực diện: Lưu Biểu • Kinh Châu Mục)',
    presenceEn: 'Xiangyang Prefecture (In-person: Liu Biao • Governor of Jingzhou)',
    placeholderVi: 'Lương Diễn diện kiến Lưu Biểu... (hoặc gõ: "Mua gỗ đóng thuyền...")',
    placeholderEn: 'Liang Yan meets Liu Biao... (or type: "Procure shipbuilding timber...")',
    chips: [
      { type: 'local', icon: '木', labelVi: 'Mua Gỗ Đóng Thuyền', labelEn: 'Procure Timber', promptVi: 'Thu mua 10 khối gỗ Thiết Mộc Kinh Châu chuẩn bị đóng thuyền', promptEn: 'Purchase 10 bundles of Jingzhou ironwood for vessels' },
      { type: 'local', icon: '策', labelVi: 'Đàm Đạo Nho Sĩ', labelEn: 'Scholarly Discourse', promptVi: 'Đến Thủy Kính Trang đàm đạo cùng Tư Mã Huy về nhân tài', promptEn: 'Visit Water Mirror Manor to confer with Sima Hui on talents' },
      { type: 'local', icon: '商', labelVi: 'Bán Muối Biển', labelEn: 'Sell Salt', promptVi: 'Xuất bán 12 đấu muối biển cho các thương đoàn Tương Dương', promptEn: 'Sell 12 sea salt units to Xiangyang river merchants' },
      { divider: true },
      { type: 'courier', icon: '信', labelVi: 'Phi thư về Huyện Trác', labelEn: 'Courier to Zhuo', promptVi: 'Gửi thư tín đường sông về Huyện Trác báo tin Kinh Châu yên bình', promptEn: 'Dispatch river relay courier to Zhuo County' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Đến Giang Lăng', labelEn: 'To Jiangling', promptVi: 'Xuôi dòng Hán Thủy tiến về đại bản doanh Giang Lăng', promptEn: 'Travel down Han River toward Jiangling base' },
      { type: 'travel', icon: '行', labelVi: 'Về Hứa Xương', labelEn: 'To Xuchang', promptVi: 'Hành quân ngược bắc trở lại Hứa Xương', promptEn: 'March north back toward Xuchang' }
    ]
  },
  'Giang Lăng Thủy Doanh': {
    presenceVi: 'Giang Lăng Thủy Doanh (Trực diện: Thủy Sư Đô Đốc / Quan Vũ)',
    presenceEn: 'Jiangling Naval Base (In-person: Naval Commander / Guan Yu)',
    placeholderVi: 'Lương Diễn thị sát chiến thuyền Giang Lăng... (hoặc gõ: "Tiếp tế thủy quân...")',
    placeholderEn: 'Liang Yan inspects Jiangling naval dock... (or type: "Supply fleet...")',
    chips: [
      { type: 'local', icon: '行', labelVi: 'Đóng Thuyền Mông Xung', labelEn: 'Build War Galley', promptVi: 'Đầu tư đóng 1 thuyền lướt sóng Mông Xung tuần tra Trường Giang', promptEn: 'Commission fast Mengchong assault vessel on Yangtze' },
      { type: 'local', icon: '工', labelVi: 'Cung Cấp Khiên Chống Tên', labelEn: 'Archery Shields', promptVi: 'Cung cấp 10 Khiên Trúc bọc da chống tên lửa cho thủy binh', promptEn: 'Deliver 10 fire-resistant bamboo shields to marines' },
      { type: 'local', icon: '商', labelVi: 'Gom Lương Thảo Ngư Phẩm', labelEn: 'Naval Rations', promptVi: 'Thu mua 10 thạch cá khô và gạo dự trữ cho hạm đội', promptEn: 'Stockpile 10 dried fish and grain provisions for fleet' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Đến Xích Bích', labelEn: 'To Chibi', promptVi: 'Thuyền chiến xuôi dòng Trường Giang tiến tới Xích Bích', promptEn: 'Sail downriver along Yangtze to Chibi outpost' },
      { type: 'travel', icon: '行', labelVi: 'Về Tương Dương', labelEn: 'To Xiangyang', promptVi: 'Ngược dòng tiến về phủ Tương Dương', promptEn: 'Return north to Xiangyang' }
    ]
  },
  'Xích Bích Thủy Trại': {
    presenceVi: 'Xích Bích Soái Thuyền (Trực diện: Chu Du • Công Cẩn)',
    presenceEn: 'Chibi Flagship Command (In-person: Zhou Yu • Gongjin)',
    placeholderVi: 'Lương Diễn tham vấn cùng Chu Du... (hoặc gõ: "Chuẩn bị hỏa công...")',
    placeholderEn: 'Liang Yan confers with Zhou Yu... (or type: "Prepare fire ships...")',
    chips: [
      { type: 'local', icon: '陣', labelVi: 'Tiếp Tế Dầu Hỏa Công', labelEn: 'Supply Fire Oil', promptVi: 'Vận chuyển 20 thùng dầu hỏa và lau sậy phục vụ hỏa công', promptEn: 'Transport 20 barrels of flammable pitch and reeds' },
      { type: 'local', icon: '武', labelVi: 'Chế Tác Cung Nỏ', labelEn: 'Craft Crossbows', promptVi: 'Cung cấp vật liệu tre dẻo gia cố 10 bộ liên nỏ thủy chiến', promptEn: 'Supply high-grade bamboo for 10 repeating crossbows' },
      { type: 'local', icon: '風', labelVi: 'Quan Sát Hướng Gió', labelEn: 'Observe Wind', promptVi: 'Cùng mưu sĩ khảo sát thủy văn và quy luật gió đông Trường Giang', promptEn: 'Survey river hydrology and east wind patterns with tacticians' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Tiến Vào Kiến Nghiệp', labelEn: 'To Jianye', promptVi: 'Xuôi hạ lưu Trường Giang tiến về Kinh Đô Kiến Nghiệp', promptEn: 'Sail down Yangtze estuary to Jianye capital' },
      { type: 'travel', icon: '行', labelVi: 'Về Giang Lăng', labelEn: 'To Jiangling', promptVi: 'Ngược dòng Trường Giang trở lại Giang Lăng', promptEn: 'Sail upriver back to Jiangling' }
    ]
  },
  'Kiến Nghiệp Đô Thành': {
    presenceVi: 'Kiến Nghiệp Vương Phủ (Trực diện: Tôn Quyền • Trọng Mưu)',
    presenceEn: 'Jianye Royal Court (In-person: Sun Quan • Zhongmou)',
    placeholderVi: 'Lương Diễn yết kiến Giang Đông Chi Chủ... (hoặc gõ: "Mở thương hội Giang Đông...")',
    placeholderEn: 'Liang Yan confers with Sun Quan... (or type: "Open Eastern Wu guild...")',
    chips: [
      { type: 'local', icon: '茶', labelVi: 'Mua Trà & Gốm Sứ', labelEn: 'Buy Tea & Porcelain', promptVi: 'Thu mua 10 kiện Trà Giang Đông và gốm men xanh xuất sắc', promptEn: 'Procure 10 crates of Jiangnan tea and celadon porcelain' },
      { type: 'local', icon: '政', labelVi: 'Lập Hội Quán U - Ngô', labelEn: 'Found Trade Guild', promptVi: 'Thành lập phân hội thương gia kết nối giao thương Bắc Nam', promptEn: 'Establish North-South merchant lodge in Jianye' },
      { type: 'local', icon: '威', labelVi: 'Yết Kiến Tôn Trọng Mưu', labelEn: 'Audience Sun Quan', promptVi: 'Yết kiến Tôn Quyền đàm đạo thế chân vạc giang sơn', promptEn: 'Audience with Sun Quan debating the tripartite balance' },
      { divider: true },
      { type: 'courier', icon: '信', labelVi: 'Phi thư về Huyện Trác', labelEn: 'Courier to Zhuo', promptVi: 'Phái thuyền buôn mang bạc trắng và đặc sản về Huyện Trác', promptEn: 'Dispatch trading boat with silver and specialties to Zhuo' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Về Xích Bích', labelEn: 'To Chibi', promptVi: 'Ngược dòng Trường Giang tiến tới tiền đồn Xích Bích', promptEn: 'Sail up Yangtze to Chibi outpost' }
    ]
  },
  'Hán Trung Thiên Sư Phủ': {
    presenceVi: 'Hán Trung Đạo Phủ (Trực diện: Trương Lỗ • Thiên Sư Đạo)',
    presenceEn: 'Hanzhong Daoist Hall (In-person: Zhang Lu • Celestial Master)',
    placeholderVi: 'Lương Diễn đàm đạo tại Hán Trung... (hoặc gõ: "Thu mua dược liệu Tần Lĩnh...")',
    placeholderEn: 'Liang Yan in Hanzhong... (or type: "Procure mountain herbs...")',
    chips: [
      { type: 'local', icon: '草', labelVi: 'Thu Mua Thảo Dược', labelEn: 'Buy Rare Herbs', promptVi: 'Thu mua 10 vị thảo dược quý Tần Lĩnh trị thương cho quân sĩ', promptEn: 'Purchase 10 rare mountain herbal remedies for wounded soldiers' },
      { type: 'local', icon: '商', labelVi: 'Quyên Góp Nghĩa Mễ', labelEn: 'Donate Charity Rice', promptVi: 'Góp 5 thạch lương vào nghĩa xá tạo phúc đức và tăng danh vọng', promptEn: 'Contribute 5 grain piculs to communal charity lodges' },
      { type: 'local', icon: '山', labelVi: 'Khảo Sát Kiếm Các', labelEn: 'Scout Mountain Pass', promptVi: 'Khảo sát độ hiểm trở của hiểm quan Kiếm Các vào đất Thục', promptEn: 'Survey fortified mountain defile of Jiange pass into Shu' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Vào Thành Đô', labelEn: 'To Chengdu', promptVi: 'Vượt Kiếm Các hiểm trở tiến vào Thiên Phủ Thành Đô', promptEn: 'Traverse treacherous Jiange pass into Chengdu' },
      { type: 'travel', icon: '行', labelVi: 'Về Trường An', labelEn: 'To Changan', promptVi: 'Theo sạn đạo vượt Tần Lĩnh quay về Trường An', promptEn: 'Trek north across Qinling plank paths back to Changan' }
    ]
  },
  'Thành Đô Ích Châu Phủ': {
    presenceVi: 'Thành Đô Đại Phủ (Trực diện: Lưu Chương • Ích Châu Mục)',
    presenceEn: 'Chengdu Grand Manor (In-person: Liu Zhang • Lord of Yizhou)',
    placeholderVi: 'Lương Diễn chiêm ngưỡng Đất Thục... (hoặc gõ: "Mua Thục Cẩm thượng hạng...")',
    placeholderEn: 'Liang Yan at Chengdu... (or type: "Procure Shu Brocade...")',
    chips: [
      { type: 'local', icon: '商', labelVi: 'Mua Thục Cẩm Thượng Hạng', labelEn: 'Buy Shu Brocade', promptVi: 'Thu mua 10 sấp Thục Cẩm lừng danh thiên hạ từ phường dệt', promptEn: 'Procure 10 bolts of world-renowned Shu brocade silks' },
      { type: 'local', icon: '工', labelVi: 'Mua Quặng Sắt Tây Thục', labelEn: 'Buy Iron Ore', promptVi: 'Thu mua 15 khối quặng sắt tinh khiết rèn đao kiếm', promptEn: 'Procure 15 units of high-grade Shu mountain iron ore' },
      { type: 'local', icon: '飲', labelVi: 'Dự Tiệc Tây Thục', labelEn: 'Shu Banquet', promptVi: 'Thưởng thức mỹ tửu và hòa tấu nhạc thục tại phủ Lưu Chương', promptEn: 'Attend festive court banquet enjoying Shu music and wine' },
      { divider: true },
      { type: 'courier', icon: '信', labelVi: 'Phi thư về Huyện Trác', labelEn: 'Courier to Zhuo', promptVi: 'Gửi thư tín đường bộ báo tin đã mở rộng mạng lưới vào đất Thục', promptEn: 'Dispatch courier dispatch to Zhuo confirming western route' },
      { divider: true },
      { type: 'travel', icon: '行', labelVi: 'Về Hán Trung', labelEn: 'To Hanzhong', promptVi: 'Vượt Kiếm Các quan ải quay trở lại Hán Trung', promptEn: 'Trek back through Jiange pass toward Hanzhong' }
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
    defaultSubLoc: 'Tư Trạch Vườn Đào',
    military: {
      garrison: 1500,
      infantry: 800,
      cavalry: 200,
      archers: 500,
      defense: 70,
      rulerFaction: 'FAC-LIANG-CLAN',
      rulerNameVi: 'Lương Gia Tộc & Lưu Bị',
      rulerNameEn: 'Liang Clan & Liu Bei',
      colorHex: '#10b981',
      governorVi: 'Lưu Bị • Huyền Đức',
      governorEn: 'Liu Bei • Xuande'
    },
    economy: {
      grainReserves: 1200,
      treasury: 15000,
      primaryCommodityVi: 'Chiếu Trúc & Binh Khí',
      primaryCommodityEn: 'Bamboo Mats & Weapons',
      exportGoodVi: 'Chiếu Trúc Lương Gia',
      exportGoodEn: 'Liang Bamboo Mats',
      importNeedVi: 'Thép Thỏi & Da Bò',
      importNeedEn: 'Steel Ingots & Oxhide'
    },
    hireableNpcs: [
      'Vương Lão Thất (Chưởng Quỹ Tiệm Buôn)',
      'Lý Thiết Chùy (Thợ Rèn Bách Luyện)',
      'Triệu Dũng (Tiêu Đầu Hộ Vệ)',
      'Trương Điền Phụ (Lãnh Công Điền Trang)'
    ],
    subLocations: [
      'Tư Trạch Vườn Đào',
      'Chợ Đông Môn & Sạp Trà',
      'Thiết Điếm Trác Huyện',
      'Tửu Quán Trác Huyện',
      'Lôi Đài Giáo Trường',
      'Mã Xa Dịch Trạm',
      'Xưởng Lương Thị',
      'Vườn Đào',
      'Chợ Đông Môn'
    ],
    figuresVi: 'Lưu Bị (Huyền Đức), Trương Phi (Dực Đức), Quan Vũ (Vân Trường), Thợ cả Trần Bảo, Triệu An, Chân Cơ, Tôn Thượng Hương',
    figuresEn: 'Liu Bei, Zhang Fei, Guan Yu, Master Chen Bao, Zhao An, Lady Zhen, Sun Shangxiang',
    intelVi: 'Bản dinh và quê hương của Lương Diễn. Quy tụ đầy đủ các địa điểm: Tư Trạch (gia đạo), Thiết Điếm (rèn đao), Tửu Quán (tụ nghĩa), Lôi Đài (diễn võ), Dịch Trạm (thương đoàn) và Chợ Đông Môn.',
    intelEn: 'Home base of Liang Yan. Features all physical town POIs: Residence, Smithy, Tavern, Arena, Caravan Depot, and Market.'
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
    military: {
      garrison: 6000,
      infantry: 2000,
      cavalry: 3500,
      archers: 500,
      defense: 85,
      rulerFaction: 'FAC-GONGSUN-ZAN',
      rulerNameVi: 'Công Tôn Toản (Bạch Mã)',
      rulerNameEn: 'Gongsun Zan (White Horse)',
      colorHex: '#38bdf8',
      governorVi: 'Công Tôn Toản • Bá Khuê',
      governorEn: 'Gongsun Zan • Baigui'
    },
    economy: {
      grainReserves: 3500,
      treasury: 22000,
      primaryCommodityVi: 'Chiến Mã U Châu',
      primaryCommodityEn: 'Youzhou Warhorses',
      exportGoodVi: 'Tuấn Mã U Châu',
      exportGoodEn: 'Youzhou Steeds',
      importNeedVi: 'Quân Lương & Khiên Trúc',
      importNeedEn: 'Army Grain & Bamboo Shields'
    },
    hireableNpcs: [
      'Lão Mã Thương (Buôn Ngựa Bắc Bình)',
      'Hộ Vệ Biên Ải (Tiêu Sư)'
    ],
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
    military: {
      garrison: 9000,
      infantry: 5000,
      cavalry: 2000,
      archers: 2000,
      defense: 90,
      rulerFaction: 'FAC-YUAN-SHAO',
      rulerNameVi: 'Viên Thiệu (Ký Châu)',
      rulerNameEn: 'Yuan Shao (Jizhou)',
      colorHex: '#818cf8',
      governorVi: 'Viên Thiệu • Bản Sơ',
      governorEn: 'Yuan Shao • Benshu'
    },
    economy: {
      grainReserves: 8000,
      treasury: 45000,
      primaryCommodityVi: 'Lương Thảo & Gấm Vóc',
      primaryCommodityEn: 'Grain & Brocade',
      exportGoodVi: 'Lương Ký Châu',
      exportGoodEn: 'Jizhou Grain',
      importNeedVi: 'Chiến Mã & Thiết Bị',
      importNeedEn: 'Warhorses & Equipment'
    },
    hireableNpcs: [
      'Chân Phúc Đức (Thương Nhân Lương Thảo)',
      'Liễu Nương Chức (Trưởng Xưởng Dệt)',
      'Mã Dẫn Lộ (Lão Xa Phu Dẫn Tuyến)'
    ],
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
    military: {
      garrison: 8500,
      infantry: 6000,
      cavalry: 500,
      archers: 2000,
      defense: 65,
      rulerFaction: 'FAC-YELLOW-TURBAN',
      rulerNameVi: 'Khăn Vàng (Trương Giác)',
      rulerNameEn: 'Yellow Turbans (Zhang Jiao)',
      colorHex: '#ef4444',
      governorVi: 'Trương Giác • Đại Hiền Lương Sư',
      governorEn: 'Zhang Jiao • Great Worthiness Master'
    },
    economy: {
      grainReserves: 4000,
      treasury: 18000,
      primaryCommodityVi: 'Phù Lục & Dân Binh',
      primaryCommodityEn: 'Talismans & Militia',
      exportGoodVi: 'Bùa Thái Bình',
      exportGoodEn: 'Taiping Talismans',
      importNeedVi: 'Quân Lương Cứu Tế',
      importNeedEn: 'Relief Grain'
    },
    hireableNpcs: [
      'Đạo Nhân Cứu Tế (Phương Sĩ)',
      'Dân Binh Khăn Vàng (Giác Ngộ)'
    ],
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
    military: {
      garrison: 2500,
      infantry: 1500,
      cavalry: 300,
      archers: 700,
      defense: 72,
      rulerFaction: 'FAC-HAN',
      rulerNameVi: 'Đại Hán Triều Đình',
      rulerNameEn: 'Han Imperial Court',
      colorHex: '#06b6d4',
      governorVi: 'Vương Triệt (Huyện Thừa)',
      governorEn: 'Wang Jie (County Magistrate)'
    },
    economy: {
      grainReserves: 2000,
      treasury: 12000,
      primaryCommodityVi: 'Hải Sản & Ngũ Cốc Bột Hải',
      primaryCommodityEn: 'Seafood & Bohai Grain',
      exportGoodVi: 'Cá Khô Vịnh Bột Hải',
      exportGoodEn: 'Bohai Dried Fish',
      importNeedVi: 'Khiên Giáp & Dược Liệu',
      importNeedEn: 'Shields, Armor & Medicine'
    },
    hireableNpcs: [
      'Trần Ngư Hộ (Chủ Thuyền Đánh Cá)',
      'Nghĩa Quân Giáo Đầu (Luyện Binh)'
    ],
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
    military: {
      garrison: 15000,
      infantry: 8000,
      cavalry: 3000,
      archers: 4000,
      defense: 98,
      rulerFaction: 'FAC-HAN',
      rulerNameVi: 'Đại Hán Kinh Sư (Hà Tiến)',
      rulerNameEn: 'Han Imperial Capital (He Jin)',
      colorHex: '#f59e0b',
      governorVi: 'Hà Tiến • Đại Tướng Quân',
      governorEn: 'He Jin • Grand General'
    },
    economy: {
      grainReserves: 12000,
      treasury: 80000,
      primaryCommodityVi: 'Tiền Đồng & Lụa Cung Đình',
      primaryCommodityEn: 'Bronze Cash & Court Silk',
      exportGoodVi: 'Lụa Kinh Sư & Rượu Ngự',
      exportGoodEn: 'Capital Silk & Imperial Wine',
      importNeedVi: 'Lương Thảo & Thiết Quặng',
      importNeedEn: 'Grain & Iron Ore'
    },
    hireableNpcs: [
      'Tôn Diệu (Đại Chưởng Quỹ Tiền Trang)',
      'Âu Dương Phong Đúc (Đại Sư Lò Đúc)',
      'Hứa Hộ Uy (Tổng Tiêu Đầu Kinh Sư)'
    ],
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
    military: {
      garrison: 12000,
      infantry: 6000,
      cavalry: 4000,
      archers: 2000,
      defense: 95,
      rulerFaction: 'FAC-DONG-ZHUO',
      rulerNameVi: 'Đổng Trác (Tây Lương Quân)',
      rulerNameEn: 'Dong Zhuo (Xiliang Army)',
      colorHex: '#a855f7',
      governorVi: 'Đổng Trác • Trọng Dĩnh',
      governorEn: 'Dong Zhuo • Zhongying'
    },
    economy: {
      grainReserves: 9000,
      treasury: 60000,
      primaryCommodityVi: 'Ngựa Chiến & Bảo Vật Tây Vực',
      primaryCommodityEn: 'Warhorses & Western Treasures',
      exportGoodVi: 'Tuấn Mã & Cẩm Thạch',
      exportGoodEn: 'Steeds & Marble',
      importNeedVi: 'Lương Thảo Quan Trung',
      importNeedEn: 'Guanzhong Grain'
    },
    hireableNpcs: [
      'Lý Cổ Ngoạn (Thương Gia Tây Vực)',
      'Tây Lương Kỵ Vệ (Hộ Tống)'
    ],
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
    military: {
      garrison: 7500,
      infantry: 4500,
      cavalry: 1500,
      archers: 1500,
      defense: 88,
      rulerFaction: 'FAC-CAO-CAO',
      rulerNameVi: 'Tào Tháo (Mạnh Đức)',
      rulerNameEn: 'Cao Cao (Mengde)',
      colorHex: '#3b82f6',
      governorVi: 'Tào Tháo • Mạnh Đức',
      governorEn: 'Cao Cao • Mengde'
    },
    economy: {
      grainReserves: 6500,
      treasury: 38000,
      primaryCommodityVi: 'Đồn Điền Lương & Binh Khí',
      primaryCommodityEn: 'Garrison Grain & Weapons',
      exportGoodVi: 'Lúa Đồn Điền Dự Châu',
      exportGoodEn: 'Yuzhou Garrison Rice',
      importNeedVi: 'Chiến Mã & Thiết Quặng',
      importNeedEn: 'Warhorses & Iron Ore'
    },
    hireableNpcs: [
      'Tuân Thị Điền Quan (Đồn Điền Sứ)',
      'Kỳ Binh Tiêu Đầu (Hổ Báo Kỵ)'
    ],
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
    military: {
      garrison: 5000,
      infantry: 3000,
      cavalry: 800,
      archers: 1200,
      defense: 80,
      rulerFaction: 'FAC-TAO-QIAN',
      rulerNameVi: 'Đào Khiêm (Từ Châu)',
      rulerNameEn: 'Tao Qian (Xuzhou)',
      colorHex: '#14b8a6',
      governorVi: 'Đào Khiêm • Cung Tổ',
      governorEn: 'Tao Qian • Gongzu'
    },
    economy: {
      grainReserves: 4200,
      treasury: 28000,
      primaryCommodityVi: 'Muối Biển & Hải Sản',
      primaryCommodityEn: 'Sea Salt & Seafood',
      exportGoodVi: 'Muối Biển Tinh Luyện Từ Châu',
      exportGoodEn: 'Refined Xuzhou Sea Salt',
      importNeedVi: 'Binh Khí & Ngựa Chiến',
      importNeedEn: 'Weapons & Warhorses'
    },
    hireableNpcs: [
      'Hải Muối Tử (Đại Hộ Muối Biển)',
      'Thương Thuyền Hộ Vệ (Thủy Cước)'
    ],
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
    military: {
      garrison: 8500,
      infantry: 5000,
      cavalry: 1000,
      archers: 2500,
      defense: 90,
      rulerFaction: 'FAC-LIU-BIAO',
      rulerNameVi: 'Lưu Biểu (Kinh Châu)',
      rulerNameEn: 'Liu Biao (Jingzhou)',
      colorHex: '#0284c7',
      governorVi: 'Lưu Biểu • Cảnh Thăng',
      governorEn: 'Liu Biao • Jingsheng'
    },
    economy: {
      grainReserves: 7500,
      treasury: 40000,
      primaryCommodityVi: 'Gỗ Thiết Mộc & Thảo Dược',
      primaryCommodityEn: 'Ironwood & Herbs',
      exportGoodVi: 'Gỗ Đóng Thuyền Thiết Mộc',
      exportGoodEn: 'Ironwood Ship Timber',
      importNeedVi: 'Muối Biển & Ngựa Bắc',
      importNeedEn: 'Sea Salt & Northern Horses'
    },
    hireableNpcs: [
      'Bạch Dược Cư Sĩ (Dược Liệu Kinh Tương)',
      'Thiết Mộc Công (Đóng Thuyền)'
    ],
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
    military: {
      garrison: 6000,
      infantry: 3000,
      cavalry: 500,
      archers: 2500,
      defense: 82,
      rulerFaction: 'FAC-LIU-BIAO',
      rulerNameVi: 'Kinh Châu Thủy Quân',
      rulerNameEn: 'Jingzhou Navy',
      colorHex: '#06b6d4',
      governorVi: 'Sái Mạo • Đức Khuê',
      governorEn: 'Cai Mao • Dekui'
    },
    economy: {
      grainReserves: 5000,
      treasury: 32000,
      primaryCommodityVi: 'Chiến Thuyền & Cá Khô',
      primaryCommodityEn: 'Warships & Dried Fish',
      exportGoodVi: 'Thuyền Mông Xung & Cá Khô',
      exportGoodEn: 'Assault Boats & Dried Fish',
      importNeedVi: 'Dầu Hỏa & Cung Tên',
      importNeedEn: 'Fire Oil & Arrows'
    },
    hireableNpcs: [
      'Trường Giang Tiêu Sư (Hộ Vận)',
      'Lão Thuyền Công (Cầm Lái)'
    ],
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
    military: {
      garrison: 5500,
      infantry: 2000,
      cavalry: 500,
      archers: 3000,
      defense: 80,
      rulerFaction: 'FAC-SUN-JIAN',
      rulerNameVi: 'Tôn Kiên / Giang Đông Quân',
      rulerNameEn: 'Sun Jian / Jiangdong Army',
      colorHex: '#f97316',
      governorVi: 'Chu Du • Công Cẩn',
      governorEn: 'Zhou Yu • Gongjin'
    },
    economy: {
      grainReserves: 4800,
      treasury: 26000,
      primaryCommodityVi: 'Dầu Hỏa & Thủy Binh',
      primaryCommodityEn: 'Fire Oil & Marines',
      exportGoodVi: 'Hỏa Cụ & Dầu Hỏa Chiến',
      exportGoodEn: 'Incendiaries & War Oil',
      importNeedVi: 'Lương Thảo & Gỗ Cứng',
      importNeedEn: 'Grain & Hardwood'
    },
    hireableNpcs: [
      'Lục Thủy Thủ (Hoa Tiêu Thủy Đạo)',
      'Giang Đông Du Hiệp (Võ Biền)'
    ],
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
    military: {
      garrison: 7000,
      infantry: 3500,
      cavalry: 500,
      archers: 3000,
      defense: 84,
      rulerFaction: 'FAC-SUN-JIAN',
      rulerNameVi: 'Tôn Kiên / Tôn Quyền (Đông Ngô)',
      rulerNameEn: 'Sun Jian / Sun Quan (Eastern Wu)',
      colorHex: '#22c55e',
      governorVi: 'Tôn Kiên • Văn Đài',
      governorEn: 'Sun Jian • Wentai'
    },
    economy: {
      grainReserves: 6000,
      treasury: 42000,
      primaryCommodityVi: 'Trà Giang Nam & Gốm Sứ',
      primaryCommodityEn: 'Jiangnan Tea & Porcelain',
      exportGoodVi: 'Trà Thơm Giang Đông & Gốm Men',
      exportGoodEn: 'Jiangdong Scented Tea & Glazed Ware',
      importNeedVi: 'Chiến Mã & Thiết Quặng',
      importNeedEn: 'Warhorses & Iron Ore'
    },
    hireableNpcs: [
      'Cố Gia Định (Đại Quản Gia Lương Phủ)',
      'Hải Thượng Tiêu Đầu (Thuyền Buôn)'
    ],
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
    military: {
      garrison: 4500,
      infantry: 3000,
      cavalry: 500,
      archers: 1000,
      defense: 88,
      rulerFaction: 'FAC-ZHANG-LU',
      rulerNameVi: 'Trương Lỗ (Thiên Sư Đạo)',
      rulerNameEn: 'Zhang Lu (Way of the Celestial Masters)',
      colorHex: '#a8a29e',
      governorVi: 'Trương Lỗ • Công Kỳ',
      governorEn: 'Zhang Lu • Gongqi'
    },
    economy: {
      grainReserves: 4000,
      treasury: 20000,
      primaryCommodityVi: 'Dược Liệu Tần Lĩnh & Nghĩa Mễ',
      primaryCommodityEn: 'Qinling Herbs & Righteous Rice',
      exportGoodVi: 'Sâm Quy Tần Lĩnh & Nghĩa Mễ',
      exportGoodEn: 'Qinling Ginseng & Righteous Rice',
      importNeedVi: 'Muối & Binh Khí Sắt',
      importNeedEn: 'Salt & Iron Weapons'
    },
    hireableNpcs: [
      'Khương Hiểm (Tiêu Đầu Sạn Đạo)',
      'Thiên Sư Đạo Đồng (Thuốc Cứu Thương)'
    ],
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
    military: {
      garrison: 8000,
      infantry: 5000,
      cavalry: 1000,
      archers: 2000,
      defense: 86,
      rulerFaction: 'FAC-HAN',
      rulerNameVi: 'Lưu Yên (Ích Châu Mục)',
      rulerNameEn: 'Liu Yan (Governor of Yizhou)',
      colorHex: '#10b981',
      governorVi: 'Lưu Yên • Quân Lang',
      governorEn: 'Liu Yan • Junlang'
    },
    economy: {
      grainReserves: 10000,
      treasury: 50000,
      primaryCommodityVi: 'Thục Cẩm & Quặng Sắt Tây Thục',
      primaryCommodityEn: 'Shu Brocade & Western Shu Iron',
      exportGoodVi: 'Thục Cẩm Tuyệt Phẩm',
      exportGoodEn: 'Finest Shu Brocade',
      importNeedVi: 'Chiến Mã & Muối Biển',
      importNeedEn: 'Warhorses & Sea Salt'
    },
    hireableNpcs: [
      'Trịnh Uyển Nhi (Đại Sư Dệt Thục Cẩm)',
      'Trương Bách Thảo (Dược Sư Danh Y)'
    ],
    subLocations: ['Thành Đô Ích Châu Phủ'],
    figuresVi: 'Lưu Yên, Lưu Chương (sau là Lưu Bị, Gia Cát Lượng), Thợ dệt Thục Cẩm',
    figuresEn: 'Liu Yan, Liu Zhang (later Liu Bei, Zhuge Liang), Silk artisans',
    intelVi: 'Đô thành Tây Nam trù phú màu mỡ, bốn bề núi non trùng điệp ngăn cách, công trình thủy lợi Đô Giang Yển nuôi sống vạn dân thiên hạ vô ưu.',
    intelEn: 'Abundant basin of western China irrigated by Dujiangyan, self-sufficient in grain, iron, and famous Shu brocade silks.'
  },
  'wan_cheng': {
    id: 'wan_cheng',
    nameVi: 'Uyển Thành (Nam Dương)',
    nameEn: 'Wancheng (Nanyang)',
    provinceVi: 'Kinh Châu',
    provinceEn: 'Jingzhou',
    coords: { x: 300, y: 310 },
    statusVi: 'Bắc Môn Kinh Châu • Hiểm Địa',
    statusEn: 'Northern Gate to Jingzhou',
    threatVi: 'Trung bình (Biên ải Nam Dương)',
    threatEn: 'Moderate (Nanyang border garrison)',
    distanceFromZhuo: 550,
    daysRequired: 3.5,
    grainCost: 4.5,
    defaultSubLoc: 'Uyển Thành Nha Môn',
    military: {
      garrison: 5500,
      infantry: 3500,
      cavalry: 1000,
      archers: 1000,
      defense: 76,
      rulerFaction: 'FAC-DONG-ZHUO',
      rulerNameVi: 'Trương Tú (Nam Dương)',
      rulerNameEn: 'Zhang Xiu (Nanyang)',
      colorHex: '#e11d48',
      governorVi: 'Trương Tú • Nam Dương Thương Chủ',
      governorEn: 'Zhang Xiu • Nanyang Merchant Lord'
    },
    economy: {
      grainReserves: 3800,
      treasury: 25000,
      primaryCommodityVi: 'Binh Khí & Thảo Dược Nam Dương',
      primaryCommodityEn: 'Weapons & Nanyang Herbs',
      exportGoodVi: 'Đao Kiếm & Dược Thảo Nam Dương',
      exportGoodEn: 'Nanyang Blades & Medicinal Herbs',
      importNeedVi: 'Lương Thảo & Muối Biển',
      importNeedEn: 'Grain & Sea Salt'
    },
    hireableNpcs: [
      'Dục Thủy Tiêu Sư (Vận Chuyển)',
      'Nam Dương Y Sĩ (Trị Thương)'
    ],
    subLocations: ['Uyển Thành Nha Môn', 'Dục Thủy Cổ Bến', 'Nam Dương Thảo Dược Điếm', 'Uyển Thành Tửu Quán'],
    figuresVi: 'Trương Tú, Giả Hủ, Hồ Xa Nhi',
    figuresEn: 'Zhang Xiu, Jia Xu, Hu Che Er',
    intelVi: 'Cửa ngõ hiểm yếu nối liền Dự Châu và Kinh Châu, nơi Trương Tú cát cứ và Giả Hủ bày mưu.',
    intelEn: 'Strategic bastion between Yuzhou and Jingzhou, held by warlord Zhang Xiu and Jia Xu.'
  },
  'shou_chun': {
    id: 'shou_chun',
    nameVi: 'Thọ Xuân (Hoài Nam)',
    nameEn: 'Shouchun (Huainan)',
    provinceVi: 'Dương Châu',
    provinceEn: 'Yangzhou',
    coords: { x: 410, y: 315 },
    statusVi: 'Phồn Hoa Hoài Thủy • Đế Đô Tự Phong',
    statusEn: 'Huai River Metropolis • Self-proclaimed Capital',
    threatVi: 'Cao (Tranh đoạt khốc liệt)',
    threatEn: 'High (Severe conflict)',
    distanceFromZhuo: 620,
    daysRequired: 4.0,
    grainCost: 5.0,
    defaultSubLoc: 'Hoài Nam Ngụy Đế Cung',
    military: {
      garrison: 6500,
      infantry: 4000,
      cavalry: 1000,
      archers: 1500,
      defense: 78,
      rulerFaction: 'FAC-YUAN-SHU',
      rulerNameVi: 'Viên Thuật (Hoài Nam)',
      rulerNameEn: 'Yuan Shu (Huainan)',
      colorHex: '#f59e0b',
      governorVi: 'Viên Thuật • Công Lộ',
      governorEn: 'Yuan Shu • Gonglu'
    },
    economy: {
      grainReserves: 4500,
      treasury: 30000,
      primaryCommodityVi: 'Lúa Gạo Sông Hoài & Thủy Sản',
      primaryCommodityEn: 'Huai River Rice & Aquatic Goods',
      exportGoodVi: 'Lúa Gạo & Cá Tươi Sông Hoài',
      exportGoodEn: 'Huai River Rice & Fresh Fish',
      importNeedVi: 'Chiến Mã & Thiết Giáp',
      importNeedEn: 'Warhorses & Iron Armor'
    },
    hireableNpcs: [
      'Hoài Thủy Vận Tiêu (Thủy Lộ)',
      'Thọ Xuân Đúc Sư (Đúc Binh Khí)'
    ],
    subLocations: ['Hoài Nam Ngụy Đế Cung', 'Bến Sông Hoài Thủy', 'Thọ Xuân Binh Xưởng', 'Hoài Nam Tửu Điếm'],
    figuresVi: 'Viên Thuật, Kỷ Linh, Viên Dận',
    figuresEn: 'Yuan Shu, Ji Ling, Yuan Yin',
    intelVi: 'Thành lũy giàu có ven sông Hoài, nơi Viên Thuật tích trữ lương thảo xưng đế.',
    intelEn: 'Wealthy citadel along the Huai River where Yuan Shu declared himself emperor.'
  },
  'shang_dang': {
    id: 'shang_dang',
    nameVi: 'Thượng Đảng (Tịnh Châu)',
    nameEn: 'Shangdang (Bingzhou)',
    provinceVi: 'Tịnh Châu',
    provinceEn: 'Bingzhou',
    coords: { x: 280, y: 190 },
    statusVi: 'Sơn Thành Hiểm Trở • Mỏ Sắt Thái Hành',
    statusEn: 'Mountain Stronghold • Taihang Iron Mines',
    threatVi: 'Trung bình (Đường núi)',
    threatEn: 'Moderate (Mountain passes)',
    distanceFromZhuo: 420,
    daysRequired: 2.8,
    grainCost: 3.5,
    defaultSubLoc: 'Thượng Đảng Trọng Trấn',
    military: {
      garrison: 3500,
      infantry: 2000,
      cavalry: 500,
      archers: 1000,
      defense: 84,
      rulerFaction: 'FAC-HAN',
      rulerNameVi: 'Trương Dương (Tịnh Châu)',
      rulerNameEn: 'Zhang Yang (Bingzhou)',
      colorHex: '#64748b',
      governorVi: 'Trương Dương • Trĩ Thúc',
      governorEn: 'Zhang Yang • Zhishu'
    },
    economy: {
      grainReserves: 2800,
      treasury: 18000,
      primaryCommodityVi: 'Quặng Sắt Thái Hành & Than Đá',
      primaryCommodityEn: 'Taihang Iron Ore & Coal',
      exportGoodVi: 'Quặng Sắt Thái Hành Thượng Hạng',
      exportGoodEn: 'Prime Taihang Iron Ore',
      importNeedVi: 'Lương Thảo & Vải Vóc',
      importNeedEn: 'Grain & Textiles'
    },
    hireableNpcs: [
      'Thiết Đầu Khai (Giám Công Mỏ Quặng)',
      'Thái Hành Dẫn Tuyến (Thợ Săn Đường Núi)'
    ],
    subLocations: ['Thượng Đảng Trọng Trấn', 'Thái Hành Sơn Đạo', 'Thượng Đảng Mỏ Sắt'],
    figuresVi: 'Trương Dương, Mục Thuận',
    figuresEn: 'Zhang Yang, Mu Shun',
    intelVi: 'Thành trì trên núi Thái Hành, hiểm trở dễ thủ khó công, sở hữu mỏ sắt tinh khiết.',
    intelEn: 'Fortress high on Taihang mountains, possessing high quality iron mines.'
  },
  'xi_liang': {
    id: 'xi_liang',
    nameVi: 'Vũ Uy & Tây Lương',
    nameEn: 'Wuwei & Xiliang',
    provinceVi: 'Lương Châu',
    provinceEn: 'Liangzhou',
    coords: { x: 80, y: 200 },
    statusVi: 'Thiết Kỵ Tây Lương • Con Đường Tơ Lụa',
    statusEn: 'Xiliang Cavalry • Silk Road Bastion',
    threatVi: 'Cao (Biên thùy dũng mãnh)',
    threatEn: 'High (Rugged frontier)',
    distanceFromZhuo: 850,
    daysRequired: 5.5,
    grainCost: 7.0,
    defaultSubLoc: 'Tây Lương Tướng Phủ',
    military: {
      garrison: 6500,
      infantry: 1500,
      cavalry: 4000,
      archers: 1000,
      defense: 75,
      rulerFaction: 'FAC-DONG-ZHUO',
      rulerNameVi: 'Mã Đằng & Hàn Toại (Tây Lương)',
      rulerNameEn: 'Ma Teng & Han Sui (Xiliang)',
      colorHex: '#d97706',
      governorVi: 'Mã Đằng • Thọ Thành',
      governorEn: 'Ma Teng • Shoucheng'
    },
    economy: {
      grainReserves: 3200,
      treasury: 24000,
      primaryCommodityVi: 'Chiến Mã Tây Lương & Da Thuộc',
      primaryCommodityEn: 'Xiliang Warhorses & Leather',
      exportGoodVi: 'Chiến Mã Đại Uyển & Da Thú',
      exportGoodEn: 'Dayuan Warhorses & Hides',
      importNeedVi: 'Lương Thảo & Tơ Lụa',
      importNeedEn: 'Grain & Silk'
    },
    hireableNpcs: [
      'Mã Lương Mã (Thương Nhân Ngựa Chiến)',
      'Cáp Thần Hành (Hoa Tiêu Sa Mạc)'
    ],
    subLocations: ['Tây Lương Tướng Phủ', 'Vũ Uy Trại Ngựa', 'Sa Mạc Dịch Trạm Tơ Lụa'],
    figuresVi: 'Mã Đằng, Hàn Toại, Mã Siêu, Bàng Đức',
    figuresEn: 'Ma Teng, Han Sui, Ma Chao, Pang De',
    intelVi: 'Bờ cõi Tây Lương bạt ngàn, kỵ binh thiện chiến, yết hầu của Con Đường Tơ Lụa cổ xưa.',
    intelEn: 'Vast frontier of Xiliang, home to fierce cavalries and the ancient Silk Road.'
  },
  'jiao_zhi': {
    id: 'jiao_zhi',
    nameVi: 'Giao Chỉ (Phiên Ngung)',
    nameEn: 'Jiaozhi (Panyu)',
    provinceVi: 'Giao Châu',
    provinceEn: 'Jiaozhou',
    coords: { x: 340, y: 500 },
    statusVi: 'Lĩnh Nam Hải Cảng • Dạ Minh Châu',
    statusEn: 'Maritime Trade Port • Southern Pearls',
    threatVi: 'Thấp (Cõi Lĩnh Nam an bình)',
    threatEn: 'Low (Peaceful southern realm)',
    distanceFromZhuo: 1200,
    daysRequired: 8.0,
    grainCost: 10.0,
    defaultSubLoc: 'Giao Châu Thái Thú Phủ',
    military: {
      garrison: 3000,
      infantry: 2000,
      cavalry: 200,
      archers: 800,
      defense: 68,
      rulerFaction: 'FAC-SHI-XIE',
      rulerNameVi: 'Sĩ Nhiếp (Giao Châu)',
      rulerNameEn: 'Shi Xie (Jiaozhou)',
      colorHex: '#059669',
      governorVi: 'Sĩ Nhiếp • Uy Ngạn',
      governorEn: 'Shi Xie • Weiyan'
    },
    economy: {
      grainReserves: 3000,
      treasury: 19000,
      primaryCommodityVi: 'Trân Châu & Trầm Hương Lĩnh Nam',
      primaryCommodityEn: 'Lingnan Pearls & Agarwood',
      exportGoodVi: 'Dạ Minh Châu & Trầm Hương',
      exportGoodEn: 'Luminous Pearls & Agarwood',
      importNeedVi: 'Binh Khí Sắt & Ngũ Cốc',
      importNeedEn: 'Iron Weapons & Grain'
    },
    hireableNpcs: [
      'Lâm Trầm Hương (Đại Thương Trầm Hương)',
      'Lĩnh Nam Sơn Tiêu (Hộ Vệ Tinh Nhuệ)'
    ],
    subLocations: ['Giao Châu Thái Thú Phủ', 'Phiên Ngung Hải Cảng', 'Nam Hải Minh Châu Phố'],
    figuresVi: 'Sĩ Nhiếp, Thương gia Ba Tư',
    figuresEn: 'Shi Xie, Persian merchants',
    intelVi: 'Thương cảng biển phương nam giao lưu với hải trình Nam Dương, phong phú trân châu và hương liệu.',
    intelEn: 'Southern maritime haven under Shi Xie, peaceful sanctuary rich with pearls and spices.'
  }
};

// Aliases for flawless lookup
WORLD_MAP_NODES['wu_wei'] = WORLD_MAP_NODES['xi_liang'];

/**
 * 24 Inter-citadel connecting routes across the Three Kingdoms theater
 * Adhering to ROTK terrain profiles: HIGHWAY, WATERWAY, MOUNTAIN_PASS, PLANK_ROAD
 */
const WORLD_MAP_ROUTES = [
  { from: 'zhuo_xian', to: 'ji_cheng', terrainType: 'HIGHWAY', distanceLi: 120, marchDays: 0.5, grainCost: 0.8, ambushRisk: 'LOW', descVi: 'Quan đạo U Châu bằng phẳng, nối liền Trác Huyện và Kế Thành Bắc Bình.', descEn: 'The Youzhou highway links Zhuo County with Jicheng in Beiping.' },
  { from: 'zhuo_xian', to: 'guang_zong', terrainType: 'HIGHWAY', distanceLi: 280, marchDays: 1.0, grainCost: 1.5, ambushRisk: 'HIGH', descVi: 'Đường tiến quân nam hạ tiếp cận đại doanh bao vây quân Khăn Vàng.', descEn: 'Southern march corridor toward the Yellow Turban siege camp.' },
  { from: 'zhuo_xian', to: 'ping_yuan', terrainType: 'HIGHWAY', distanceLi: 360, marchDays: 1.5, grainCost: 2.0, ambushRisk: 'MODERATE', descVi: 'Quan đạo duyên hải nối Trác Huyện thẳng tới trọng trấn Bình Nguyên.', descEn: 'Coastal highway from Zhuo County to the Pingyuan stronghold.' },
  { from: 'ji_cheng', to: 'ping_yuan', terrainType: 'HIGHWAY', distanceLi: 340, marchDays: 1.4, grainCost: 1.8, ambushRisk: 'LOW', descVi: 'Tuyến tuần tra biên phòng U - Thanh Châu của thiết kỵ Bạch Mã.', descEn: 'White Horse cavalry border patrol between You and Qing provinces.' },
  { from: 'guang_zong', to: 'ye_cheng', terrainType: 'HIGHWAY', distanceLi: 150, marchDays: 0.8, grainCost: 1.0, ambushRisk: 'MODERATE', descVi: 'Đường tiếp vận nối tiền tuyến Cự Lộc với đại đô hội Nghiệp Thành.', descEn: 'Supply road from the Julu front to the great city of Ye.' },
  { from: 'guang_zong', to: 'ping_yuan', terrainType: 'HIGHWAY', distanceLi: 180, marchDays: 1.0, grainCost: 1.2, ambushRisk: 'MODERATE', descVi: 'Hành lang đông tiến từ Cự Lộc sang bình nguyên duyên hải.', descEn: 'Eastern corridor from Julu into the coastal plain.' },
  { from: 'ye_cheng', to: 'luo_yang', terrainType: 'HIGHWAY', distanceLi: 420, marchDays: 1.8, grainCost: 2.2, ambushRisk: 'LOW', descVi: 'Trục giao thương huyết mạch vượt sông Hoàng Hà tiến vào Kinh Sư Lạc Dương.', descEn: 'Main trade artery crossing the Yellow River into the imperial capital.' },
  { from: 'ye_cheng', to: 'shang_dang', terrainType: 'MOUNTAIN_PASS', distanceLi: 240, marchDays: 1.5, grainCost: 1.8, ambushRisk: 'MODERATE', descVi: 'Thái Hành sơn đạo quanh co hiểm trở dẫn lên trọng trấn Thượng Đảng.', descEn: 'Winding Taihang mountain road up to Shangdang.' },
  { from: 'ye_cheng', to: 'xu_chang', terrainType: 'HIGHWAY', distanceLi: 380, marchDays: 1.6, grainCost: 2.0, ambushRisk: 'LOW', descVi: 'Quan đạo Trung Nguyên nối liền hai trung tâm chính trị Hà Bắc và Dự Châu.', descEn: 'Central Plains highway linking Hebei and Yuzhou.' },
  { from: 'ping_yuan', to: 'xia_pi', terrainType: 'HIGHWAY', distanceLi: 400, marchDays: 1.8, grainCost: 2.4, ambushRisk: 'MODERATE', descVi: 'Thương lộ duyên hải phồn hoa kết nối Thanh Châu và kho muối biển Hạ Phì.', descEn: 'Rich coastal trade road to the Xiapi salt depots.' },
  { from: 'luo_yang', to: 'chang_an', terrainType: 'HIGHWAY', distanceLi: 380, marchDays: 1.8, grainCost: 2.2, ambushRisk: 'LOW', descVi: 'Đại đạo Đông Tây qua Đồng Quan và Hàm Cốc Quan nối liền hai đại kinh đô.', descEn: 'Imperial east-west road through Dongguan and Hangu Pass.' },
  { from: 'luo_yang', to: 'xu_chang', terrainType: 'HIGHWAY', distanceLi: 220, marchDays: 1.0, grainCost: 1.4, ambushRisk: 'LOW', descVi: 'Cửa ngõ Hổ Lao Quan tiến về vùng đồng bằng đồn điền trù phú Dĩnh Xuyên.', descEn: 'Hulao Pass gateway into the Yingchuan farmlands.' },
  { from: 'chang_an', to: 'xi_liang', terrainType: 'HIGHWAY', distanceLi: 520, marchDays: 4.2, grainCost: 2.6, ambushRisk: 'MODERATE', descVi: 'Hành lang Hà Tây mở ra Con Đường Tơ Lụa cổ xưa và đại mạc Tây Lương.', descEn: 'Hexi corridor opening onto the Silk Road and the western deserts.' },
  { from: 'chang_an', to: 'han_zhong', terrainType: 'PLANK_ROAD', distanceLi: 360, marchDays: 3.5, grainCost: 2.5, ambushRisk: 'HIGH', descVi: 'Sạn đạo Tí Ngọ và Thảng Lạc cheo leo vách núi hiểm trở vượt dãy Tần Lĩnh.', descEn: 'Cliffside plank roads over the Qinling range.' },
  { from: 'han_zhong', to: 'cheng_du', terrainType: 'PLANK_ROAD', distanceLi: 420, marchDays: 4.0, grainCost: 2.8, ambushRisk: 'HIGH', descVi: 'Thục Đạo nan xuyên qua đệ nhất hùng quan Kiếm Các vào bồn địa Thành Đô.', descEn: 'Treacherous Shu plank road through Jian Ge into the Chengdu basin.' },
  { from: 'xu_chang', to: 'wan_cheng', terrainType: 'HIGHWAY', distanceLi: 280, marchDays: 1.4, grainCost: 1.6, ambushRisk: 'MODERATE', descVi: 'Quan đạo huyết mạch nối Dự Châu xuống bồn địa chiến lược Nam Dương.', descEn: 'Key highway from Yuzhou down into the Nanyang basin.' },
  { from: 'xu_chang', to: 'xia_pi', terrainType: 'HIGHWAY', distanceLi: 350, marchDays: 1.6, grainCost: 2.0, ambushRisk: 'LOW', descVi: 'Tuyến giao thương trù phú giữa đất đồn điền và đại thương nhân Từ Châu.', descEn: 'Trade route between the farmlands and the great merchants of Xuzhou.' },
  { from: 'xu_chang', to: 'shou_chun', terrainType: 'HIGHWAY', distanceLi: 320, marchDays: 1.5, grainCost: 1.8, ambushRisk: 'LOW', descVi: 'Trục đường mậu dịch sông Hoài tiến vào căn cứ phồn vinh Thọ Xuân.', descEn: 'Huai River trade axis into prosperous Shouchun.' },
  { from: 'wan_cheng', to: 'xiang_yang', terrainType: 'WATERWAY', distanceLi: 220, marchDays: 1.2, grainCost: 1.4, ambushRisk: 'LOW', descVi: 'Thủy lộ Hán Thủy xuôi nam nối cửa ngõ Nam Dương với Châu Phủ Tương Dương.', descEn: 'Han River waterway south from Nanyang to Xiangyang.' },
  { from: 'shou_chun', to: 'jian_ye', terrainType: 'WATERWAY', distanceLi: 260, marchDays: 1.4, grainCost: 1.6, ambushRisk: 'LOW', descVi: 'Thủy lộ Trường Giang hạ lưu tiến thẳng vào đô thành Giang Đông Kiến Nghiệp.', descEn: 'Lower Yangtze waterway to the Wu capital of Jianye.' },
  { from: 'xiang_yang', to: 'jiang_ling', terrainType: 'WATERWAY', distanceLi: 260, marchDays: 1.3, grainCost: 1.5, ambushRisk: 'LOW', descVi: 'Trục giao thông Kinh Châu nối Tương Dương và Giang Lăng qua Trường Bản.', descEn: 'Jingzhou trunk route via Changban between Xiangyang and Jiangling.' },
  { from: 'jiang_ling', to: 'chi_bi', terrainType: 'WATERWAY', distanceLi: 280, marchDays: 1.5, grainCost: 1.8, ambushRisk: 'HIGH', descVi: 'Thủy lộ Trường Giang xuôi dòng qua vùng đá dựng đứng Xích Bích oai hùng.', descEn: 'Yangtze waterway past the cliffs of Red Cliff.' },
  { from: 'chi_bi', to: 'jian_ye', terrainType: 'WATERWAY', distanceLi: 450, marchDays: 2.2, grainCost: 2.5, ambushRisk: 'LOW', descVi: 'Đại thủy lộ Trường Giang xuôi về trung tâm phồn hoa đô hội Đông Ngô.', descEn: 'Great Yangtze waterway down to the prosperous Wu heartland.' },
  { from: 'xiang_yang', to: 'jiao_zhi', terrainType: 'MOUNTAIN_PASS', distanceLi: 980, marchDays: 6.0, grainCost: 5.0, ambushRisk: 'EXTREME', descVi: 'Nam chinh lộ nghìn dặm vượt đèo dốc sơn lâm tiến vào bờ biển Giao Chỉ.', descEn: 'Thousand-li southern march through mountain passes to the Jiaozhi coast.' }
];

function getPoiMeta(locName) {
  const dict = {
    // Zhuo County Physical POIs
    'Tư Trạch Vườn Đào': { vi: 'Tư Trạch Vườn Đào (Lương Phủ)', en: 'Peach Garden Manor (Residence)', icon: '府', distFromZhuo: '0 dặm' },
    'Thiết Điếm Trác Huyện': { vi: 'Thiết Điếm Lò Rèn Trác Huyện', en: 'Town Smithy & Forge', icon: '鍛', distFromZhuo: '1.2 dặm' },
    'Tửu Quán Trác Huyện': { vi: 'Tửu Quán Trác Huyện', en: 'Town Tavern', icon: '酒', distFromZhuo: '0.8 dặm' },
    'Lôi Đài Giáo Trường': { vi: 'Lôi Đài Giáo Trường Bắc Môn', en: 'Northern Drill Grounds & Arena', icon: '武', distFromZhuo: '1.5 dặm' },
    'Mã Xa Dịch Trạm': { vi: 'Mã Xa Dịch Trạm & Thương Hội', en: 'Caravan Guild & Depot', icon: '貨', distFromZhuo: '1.0 dặm' },
    'Chợ Đông Môn & Sạp Trà': { vi: 'Chợ Đông Môn & Sạp Trà', en: 'East Gate Market & Tea Stall', icon: '茶', distFromZhuo: '1 dặm' },
    'Vườn Đào': { vi: 'Trang Viên Vườn Đào Hạ Trạch', en: 'Peach Garden Manor', icon: '花', distFromZhuo: '0 dặm' },
    'Chợ Đông Môn': { vi: 'Chợ Đông Môn & Sạp Trà', en: 'East Gate Market & Tea Stall', icon: '市', distFromZhuo: '1 dặm' },
    'Xưởng Lương Thị': { vi: 'Lương Thị Chức Tác Phường', en: 'Liang Textile Workshop', icon: '坊', distFromZhuo: '2 dặm' },
    // 15 Historical Citadels
    'Bắc Bình Soái Phủ': { vi: 'Bắc Bình Soái Phủ (U Châu)', en: 'Beiping Headquarters', icon: '行', distFromZhuo: '120 dặm' },
    'Nghiệp Thành Đại Phủ': { vi: 'Nghiệp Thành Đại Phủ (Ký Châu)', en: 'Yecheng Grand Hall', icon: '政', distFromZhuo: '330 dặm' },
    'Quảng Tông Quân Doanh': { vi: 'Bắc Quân Đại Doanh (Quảng Tông)', en: 'Northern Army Headquarters', icon: '營', distFromZhuo: '280 dặm' },
    'Bình Nguyên Trọng Trấn': { vi: 'Bình Nguyên Trọng Trấn', en: 'Pingyuan Stronghold', icon: '工', distFromZhuo: '360 dặm' },
    'Hứa Xương Tướng Phủ': { vi: 'Hứa Xương Tướng Phủ (Dự Châu)', en: 'Xuchang Headquarters', icon: '武', distFromZhuo: '580 dặm' },
    'Hạ Phì Thành Lũy': { vi: 'Hạ Phì Thành Lũy (Từ Châu)', en: 'Xiapi Citadel', icon: '城', distFromZhuo: '640 dặm' },
    'Kinh Đô Lạc Dương': { vi: 'Kinh Đô Lạc Dương (Tư Lệ)', en: 'Imperial Capital Luoyang', icon: '朝', distFromZhuo: '750 dặm' },
    'Trường An Cung Phủ': { vi: 'Trường An Cung Phủ (Quan Trung)', en: 'Changan Palace Hall', icon: '府', distFromZhuo: '920 dặm' },
    'Tương Dương Châu Phủ': { vi: 'Tương Dương Châu Phủ (Kinh Châu)', en: 'Xiangyang Prefecture', icon: '津', distFromZhuo: '880 dặm' },
    'Giang Lăng Thủy Doanh': { vi: 'Giang Lăng Thủy Doanh (Nam Quận)', en: 'Jiangling Naval Base', icon: '行', distFromZhuo: '1050 dặm' },
    'Xích Bích Thủy Trại': { vi: 'Xích Bích Thủy Trại (Trường Giang)', en: 'Chibi Naval Base', icon: '陣', distFromZhuo: '1150 dặm' },
    'Kiến Nghiệp Đô Thành': { vi: 'Kiến Nghiệp Đô Thành (Giang Đông)', en: 'Jianye Capital of Wu', icon: '威', distFromZhuo: '1100 dặm' },
    'Hán Trung Thiên Sư Phủ': { vi: 'Hán Trung Thiên Sư Phủ (Hán Xuyên)', en: 'Hanzhong Daoist Hall', icon: '山', distFromZhuo: '1250 dặm' },
    'Thành Đô Ích Châu Phủ': { vi: 'Thành Đô Ích Châu Phủ (Ba Thục)', en: 'Chengdu Capital of Shu', icon: '商', distFromZhuo: '1550 dặm' },
    // 5 New Historical Citadels
    'Uyển Thành Nha Môn': { vi: 'Uyển Thành Nha Môn (Nam Dương)', en: 'Wancheng Headquarters', icon: '宛', distFromZhuo: '550 dặm' },
    'Hoài Nam Ngụy Đế Cung': { vi: 'Hoài Nam Ngụy Đế Cung (Thọ Xuân)', en: 'Shouchun Palace', icon: '淮', distFromZhuo: '620 dặm' },
    'Thượng Đảng Trọng Trấn': { vi: 'Thượng Đảng Trọng Trấn (Tịnh Châu)', en: 'Shangdang Stronghold', icon: '黨', distFromZhuo: '420 dặm' },
    'Tây Lương Tướng Phủ': { vi: 'Tây Lương Tướng Phủ (Vũ Uy)', en: 'Xiliang Headquarters', icon: '涼', distFromZhuo: '850 dặm' },
    'Giao Châu Thái Thú Phủ': { vi: 'Giao Châu Thái Thú Phủ (Phiên Ngung)', en: 'Jiaozhou Prefecture', icon: '交', distFromZhuo: '1200 dặm' },
    // Backwards Compatibility / Fallback
    'Trường Xã Tiền Tuyến': { vi: 'Hứa Xương & Trường Xã Tiền Tuyến', en: 'Changshe & Xuchang Frontline', icon: '陣', distFromZhuo: '580 dặm' }
  };
  return dict[locName] || { vi: locName, en: locName, icon: '鎮', distFromZhuo: '1 dặm' };
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

// Canonical, bilingual settlement labels and seals. This is the single source
// of truth for map labels, intel headers, route cards and tooltips; the long
// historical names stay in nameVi/nameEn for narrative and travel dialogs.
const SETTLEMENT_LABELS = {
  zhuo_xian: { vi: 'Trác Huyện', en: 'Zhuo County', seal: '涿' },
  ji_cheng: { vi: 'Kế Thành', en: 'Jicheng', seal: '薊' },
  ye_cheng: { vi: 'Nghiệp Thành', en: 'Ye City', seal: '鄴' },
  guang_zong: { vi: 'Quảng Tông', en: 'Guangzong', seal: '廣' },
  ping_yuan: { vi: 'Bình Nguyên', en: 'Pingyuan', seal: '平' },
  luo_yang: { vi: 'Lạc Dương', en: 'Luoyang', seal: '洛' },
  chang_an: { vi: 'Trường An', en: "Chang'an", seal: '長' },
  xu_chang: { vi: 'Hứa Xương', en: 'Xuchang', seal: '許' },
  xia_pi: { vi: 'Hạ Phì', en: 'Xiapi', seal: '邳' },
  xiang_yang: { vi: 'Tương Dương', en: 'Xiangyang', seal: '襄' },
  jiang_ling: { vi: 'Giang Lăng', en: 'Jiangling', seal: '陵' },
  chi_bi: { vi: 'Xích Bích', en: 'Chibi', seal: '壁' },
  jian_ye: { vi: 'Kiến Nghiệp', en: 'Jianye', seal: '建' },
  han_zhong: { vi: 'Hán Trung', en: 'Hanzhong', seal: '漢' },
  cheng_du: { vi: 'Thành Đô', en: 'Chengdu', seal: '成' },
  wan_cheng: { vi: 'Uyển Thành', en: 'Wancheng', seal: '宛' },
  shou_chun: { vi: 'Thọ Xuân', en: 'Shouchun', seal: '壽' },
  shang_dang: { vi: 'Thượng Đảng', en: 'Shangdang', seal: '黨' },
  xi_liang: { vi: 'Vũ Uy', en: 'Wuwei', seal: '威' },
  wu_wei: { vi: 'Vũ Uy', en: 'Wuwei', seal: '威' },
  jiao_zhi: { vi: 'Giao Chỉ', en: 'Jiaozhi', seal: '交' }
};

function getSettlementEntry(nodeOrId) {
  const key = typeof nodeOrId === 'string' ? nodeOrId : (nodeOrId && nodeOrId.id);
  return key ? SETTLEMENT_LABELS[key] : null;
}

function getSettlementLabel(nodeOrId, isEn = (typeof currentLang !== 'undefined' && currentLang === 'en')) {
  const entry = getSettlementEntry(nodeOrId);
  return entry ? (isEn ? entry.en : entry.vi) : '';
}

function getSettlementSeal(nodeOrId) {
  const entry = getSettlementEntry(nodeOrId);
  return entry ? entry.seal : '';
}

// English role labels for the hireable-specialist rows in the map intel panel.
// Proper names stay in their existing form; only the occupation is localized.
const MAP_ROLE_EN = {
  'Buôn Ngựa Bắc Bình': 'Beiping Horse Trader',
  'Chưởng Quỹ Tiệm Buôn': 'Shop Steward',
  'Chủ Thuyền Đánh Cá': 'Fishing Boat Owner',
  'Cầm Lái': 'Helmsman',
  'Dược Liệu Kinh Tương': 'Jingxiang Herbalist',
  'Dược Sư Danh Y': 'Renowned Physician',
  'Giác Ngộ': 'Awakened Adept',
  'Giám Công Mỏ Quặng': 'Mine Overseer',
  'Hoa Tiêu Sa Mạc': 'Desert Guide',
  'Hoa Tiêu Thủy Đạo': 'River Guide',
  'Hổ Báo Kỵ': 'Tiger-Leopard Cavalry',
  'Hộ Tống': 'Escort',
  'Hộ Vận': 'Supply Escort',
  'Hộ Vệ Tinh Nhuệ': 'Elite Guard',
  'Luyện Binh': 'Drill Instructor',
  'Lãnh Công Điền Trang': 'Manor Steward',
  'Lão Xa Phu Dẫn Tuyến': 'Veteran Carriage Guide',
  'Phương Sĩ': 'Alchemist',
  'Thuyền Buôn': 'Merchant Ship',
  'Thuốc Cứu Thương': 'Field Medic',
  'Thương Gia Tây Vực': 'Western Regions Trader',
  'Thương Nhân Lương Thảo': 'Grain Merchant',
  'Thương Nhân Ngựa Chiến': 'Warhorse Merchant',
  'Thợ Rèn Bách Luyện': 'Master Smith',
  'Thợ Săn Đường Núi': 'Mountain Hunter',
  'Thủy Cước': 'Dockworker',
  'Thủy Lộ': 'Waterway Broker',
  'Tiêu Sư': 'Escort Master',
  'Tiêu Đầu Hộ Vệ': 'Escort Captain',
  'Tiêu Đầu Sạn Đạo': 'Plank Road Escort',
  'Trưởng Xưởng Dệt': 'Weaving Foreman',
  'Trị Thương': 'Trade Agent',
  'Tổng Tiêu Đầu Kinh Sư': 'Capital Escort Chief',
  'Võ Biền': 'Martial Drillmaster',
  'Vận Chuyển': 'Transporter',
  'Đóng Thuyền': 'Shipwright',
  'Đúc Binh Khí': 'Weapons Caster',
  'Đại Chưởng Quỹ Tiền Trang': 'Chief Bank Steward',
  'Đại Hộ Muối Biển': 'Salt Magnate',
  'Đại Quản Gia Lương Phủ': 'Liang Manor Chief Steward',
  'Đại Sư Dệt Thục Cẩm': 'Master Shu Brocade Weaver',
  'Đại Sư Lò Đúc': 'Master Foundry Smith',
  'Đại Thương Trầm Hương': 'Agarwood Magnate',
  'Đồn Điền Sứ': 'Colonization Commissioner'
};

function getRoleLabel(role) {
  return MAP_ROLE_EN[role] || role;
}

function getShortNodeName(node, isEn = (typeof currentLang !== 'undefined' && currentLang === 'en')) {
  if (!node) return '';
  const canonical = getSettlementLabel(node, isEn);
  if (canonical) return canonical;
  if (isEn) {
    return (node.nameEn || '')
      .replace(/\s*\(.*?\)/g, '')
      .replace(/\s*&.*/g, '')
      .replace(/Imperial Capital\s*/gi, '')
      .trim();
  }
  return (node.nameVi || '')
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s*&.*/g, '')
    .replace(/Kinh Đô\s*/g, '')
    .replace(/Tây Đô\s*/g, '')
    .trim();
}

function getPoiIconName(name) {
  const s = String(name || '').toLowerCase();
  if (s.includes('chợ') || s.includes('sạp') || s.includes('thương thị')) return 'coin';
  if (s.includes('thiết điếm') || s.includes('lò rèn') || s.includes('rèn') || s.includes('đúc')) return 'hammer';
  if (s.includes('mã xa') || s.includes('dịch trạm') || s.includes('thương hội')) return 'cart';
  if (s.includes('lôi đài') || s.includes('giáo trường') || s.includes('võ')) return 'sword';
  if (s.includes('tửu') || s.includes('trà') || s.includes('quán') || s.includes('điếm')) return 'tea';
  if (s.includes('xưởng') || s.includes('phường') || s.includes('dệt')) return 'gear';
  if (s.includes('mỏ') || s.includes('quặng')) return 'pickaxe';
  if (s.includes('bến') || s.includes('cảng') || s.includes('sông') || s.includes('hồ')) return 'fish';
  if (s.includes('núi') || s.includes('sơn') || s.includes('đạo') || s.includes('quan')) return 'tree';
  if (s.includes('doanh') || s.includes('trại') || s.includes('quân')) return 'soldier';
  if (s.includes('vườn') || s.includes('rừng') || s.includes('thảo')) return 'sprout';
  if (s.includes('trạch') || s.includes('phủ') || s.includes('nha môn') || s.includes('cung')) return 'house';
  return 'route';
}

function renderLocalPoiNav(loc = activeSubLocation) {
  const regionBadge = document.getElementById('loc-region-badge');
  const breadcrumbText = document.getElementById('loc-breadcrumb-text');
  const picker = document.getElementById('local-poi-picker');
  const trigger = document.getElementById('local-poi-trigger');
  const triggerLabel = document.getElementById('txt-local-poi-trigger');
  const countEl = document.getElementById('local-poi-count');
  const menu = document.getElementById('local-poi-menu');
  if (!regionBadge || !breadcrumbText || !picker || !menu) return;

  const currentRegion = getCurrentRegionNode(loc);
  const isEn = (currentLang === 'en');

  // 1. Region Badge (Full name without single-word abbreviation)
  regionBadge.innerText = isEn 
    ? `${currentRegion.provinceEn} • ${getShortNodeName(currentRegion, true)}`
    : `${currentRegion.provinceVi} • ${getShortNodeName(currentRegion, false)}`;

  // 2. Breadcrumb Text
  const currentPoiMeta = getPoiMeta(loc);
  breadcrumbText.innerText = isEn ? currentPoiMeta.en : currentPoiMeta.vi;

  // 3. Local walking destinations live behind one picker instead of an inline
  //    chip row that wrapped onto a second line and crowded out the chronicle.
  //    The map data lists a couple of aliases for the same place; keep one row each.
  const seenDestinations = new Set();
  const localPois = (currentRegion.subLocations || [])
    .filter(sl => sl !== loc)
    .filter(sl => {
      const meta = getPoiMeta(sl);
      const key = (isEn ? meta.en : meta.vi).toLowerCase();
      if (seenDestinations.has(key)) return false;
      seenDestinations.add(key);
      return true;
    });
  closeLocalPoiMenu();

  if (localPois.length === 0) {
    picker.classList.add('hidden');
    return;
  }
  picker.classList.remove('hidden');

  if (triggerLabel) triggerLabel.innerText = isEn ? 'Inner Town' : 'Nội Thành';
  if (countEl) countEl.innerText = String(localPois.length);
  if (trigger) {
    trigger.title = isEn
      ? `Walk to another place inside ${getShortNodeName(currentRegion, true)}`
      : `Đi bộ tới địa điểm khác trong ${getShortNodeName(currentRegion, false)}`;
  }

  menu.innerHTML = localPois.map(targetLoc => {
    const meta = getPoiMeta(targetLoc);
    const name = isEn ? meta.en : meta.vi;
    const dist = getLocalPoiDistance(loc, targetLoc);
    const distLabel = isEn ? dist.replace('dặm', 'li') : dist;
    return `
      <button class="local-poi-item" type="button" role="menuitem" onclick="travelLocalPoi('${targetLoc}')" title="${isEn ? 'Walk to ' + name : 'Đi bộ tới ' + name}">
        <span class="local-poi-item-seal" aria-hidden="true">${typeof uiIcon === 'function' ? uiIcon(getPoiIconName(targetLoc)) : meta.icon}</span>
        <span class="local-poi-item-body">
          <span class="local-poi-item-name">${name}</span>
          <span class="local-poi-item-dist">${distLabel}</span>
        </span>
      </button>
    `;
  }).join('');
}

function closeLocalPoiMenu() {
  const picker = document.getElementById('local-poi-picker');
  const trigger = document.getElementById('local-poi-trigger');
  const menu = document.getElementById('local-poi-menu');
  if (!menu) return;
  menu.classList.add('hidden');
  if (picker) picker.classList.remove('is-open');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

function toggleLocalPoiMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('local-poi-menu');
  const trigger = document.getElementById('local-poi-trigger');
  const picker = document.getElementById('local-poi-picker');
  if (!menu || !trigger) return;

  if (!menu.classList.contains('hidden')) {
    closeLocalPoiMenu();
    return;
  }

  menu.classList.remove('hidden');
  if (picker) picker.classList.add('is-open');
  trigger.setAttribute('aria-expanded', 'true');

  const firstItem = menu.querySelector('.local-poi-item');
  if (firstItem) firstItem.focus({ preventScroll: true });
}

document.addEventListener('click', (event) => {
  if (!event.target.closest || !event.target.closest('#local-poi-picker')) {
    closeLocalPoiMenu();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeLocalPoiMenu();
});


async function travelLocalPoi(targetLoc) {
  closeLocalPoiMenu();
  if (isProcessingAction) {
    showToast(currentLang === 'en' ? '[警] Action in progress, please wait!' : '[警] Đang thực thi thao tác khác, vui lòng chờ!', true);
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

// Global exports
window.QUICK_CHIPS_DATA = QUICK_CHIPS_DATA;
window.WORLD_MAP_NODES = WORLD_MAP_NODES;
window.WORLD_MAP_ROUTES = WORLD_MAP_ROUTES;
window.getPoiMeta = getPoiMeta;
window.getPoiIconName = getPoiIconName;
window.getShortNodeName = getShortNodeName;
window.getSettlementLabel = getSettlementLabel;
window.getSettlementSeal = getSettlementSeal;
window.getRoleLabel = getRoleLabel;
window.SETTLEMENT_LABELS = SETTLEMENT_LABELS;
window.getLocalPoiDistance = getLocalPoiDistance;
window.getCurrentRegionNode = getCurrentRegionNode;
window.renderLocalPoiNav = renderLocalPoiNav;
window.travelLocalPoi = travelLocalPoi;
window.toggleLocalPoiMenu = toggleLocalPoiMenu;
window.closeLocalPoiMenu = closeLocalPoiMenu;
