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
      { type: 'local', icon: '賞', labelVi: 'Thưởng 100 Tiền', labelEn: 'Reward 100 Qian', promptVi: 'Khen thưởng 100 tiền cho thợ cả Trần Bảo động viên thợ', promptEn: 'Reward 100 Qian to master craftsman Chen Bao' },
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
      { type: 'local', icon: '勳', labelVi: 'Nhận Sắc Phong Triều Đình', labelEn: 'Claim Imperial Bounty', promptVi: 'Nhận sắc phong Quân Nhu Tán Quan & Thưởng 2,500 Tiền từ Triều Đình', promptEn: 'Claim imperial commission and 2,500 Qian bounty' },
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

function getPoiMeta(locName) {
  const dict = {
    // Zhuo County Physical POIs
    'Tư Trạch Vườn Đào': { vi: 'Tư Trạch Vườn Đào (Lương Phủ)', en: 'Peach Garden Manor (Residence)', icon: '🏛️', distFromZhuo: '0 dặm' },
    'Thiết Điếm Trác Huyện': { vi: 'Thiết Điếm Lò Rèn Trác Huyện', en: 'Town Smithy & Forge', icon: '🔨', distFromZhuo: '1.2 dặm' },
    'Tửu Quán Trác Huyện': { vi: 'Tửu Quán Trác Huyện', en: 'Town Tavern', icon: '🍺', distFromZhuo: '0.8 dặm' },
    'Lôi Đài Giáo Trường': { vi: 'Lôi Đài Giáo Trường Bắc Môn', en: 'Northern Drill Grounds & Arena', icon: '⚔️', distFromZhuo: '1.5 dặm' },
    'Mã Xa Dịch Trạm': { vi: 'Mã Xa Dịch Trạm & Thương Hội', en: 'Caravan Guild & Depot', icon: '📦', distFromZhuo: '1.0 dặm' },
    'Chợ Đông Môn & Sạp Trà': { vi: 'Chợ Đông Môn & Sạp Trà', en: 'East Gate Market & Tea Stall', icon: '🍵', distFromZhuo: '1 dặm' },
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

function getShortNodeName(node, isEn = (typeof currentLang !== 'undefined' && currentLang === 'en')) {
  if (!node) return '';
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

function renderLocalPoiNav(loc = activeSubLocation) {
  const regionBadge = document.getElementById('loc-region-badge');
  const breadcrumbText = document.getElementById('loc-breadcrumb-text');
  const localPoiGroup = document.getElementById('local-poi-group');
  if (!regionBadge || !breadcrumbText || !localPoiGroup) return;

  const currentRegion = getCurrentRegionNode(loc);
  const isEn = (currentLang === 'en');

  // 1. Region Badge (Full name without single-word abbreviation)
  regionBadge.innerText = isEn 
    ? `${currentRegion.provinceEn} • ${getShortNodeName(currentRegion, true)}`
    : `${currentRegion.provinceVi} • ${getShortNodeName(currentRegion, false)}`;

  // 2. Breadcrumb Text
  const currentPoiMeta = getPoiMeta(loc);
  breadcrumbText.innerText = isEn ? currentPoiMeta.en : currentPoiMeta.vi;

  // 3. Dynamic Local Walking POIs
  const localPois = (currentRegion.subLocations || []).filter(sl => sl !== loc);
  if (localPois.length === 0) {
    localPoiGroup.innerHTML = `<span style="font-size: 11px; color: var(--text-muted); font-style: italic;">${isEn ? '鎮 Local outpost area' : '鎮 Khu vực tiền tuyến'}</span>`;
  } else {
    localPoiGroup.innerHTML = localPois.map(targetLoc => {
      const meta = getPoiMeta(targetLoc);
      const name = isEn ? meta.en : meta.vi;
      const dist = getLocalPoiDistance(loc, targetLoc);
      const distLabel = isEn ? dist.replace('dặm', 'li') : dist;
      return `
        <button class="local-poi-btn" onclick="travelLocalPoi('${targetLoc}')" title="${isEn ? 'Walk to ' + name : 'Đi bộ tới ' + name}">
          <span>行 ${meta.icon} ${name}</span>
          <span style="font-size: 9.5px; opacity: 0.75; font-family: var(--font-mono);">(${distLabel})</span>
        </button>
      `;
    }).join('');
  }
}

async function travelLocalPoi(targetLoc) {
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
window.getPoiMeta = getPoiMeta;
window.getShortNodeName = getShortNodeName;
window.getLocalPoiDistance = getLocalPoiDistance;
window.getCurrentRegionNode = getCurrentRegionNode;
window.renderLocalPoiNav = renderLocalPoiNav;
window.travelLocalPoi = travelLocalPoi;
