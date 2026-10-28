/**
 * ThreeKingdoms-AgentEngine: Wage Labor Constants
 * (src/modules/professions/features/wage-labor/wage-labor.constants.ts)
 *
 * Defines wage labor shifts, stamina rules, and error messages following
 * AgentOption Universe Architecture v4.0 (Folder-per-Feature).
 */

export const WAGE_LABOR_RULES = {
  BASE_MAX_STAMINA: 100,
  WAR_SCALE_THRESHOLD: 50,
  WAR_SCALE_FACTOR: 1.5,
  VIGOR_HEALTH_DIVISOR: 10,
  MAX_FATIGUE_LIMIT: 100
} as const;

export interface ShiftTemplate {
  shiftId: string;
  jobType: string;
  titleVi: string;
  titleEn: string;
  workplaceVi: string;
  workplaceEn: string;
  wage: number;
  staminaCost: number;
  fatigueCost: number;
  professionCode: string;
  professionNameVi: string;
  professionCategory: string;
  expGain: number;
  attributeTarget: 'cra' | 'com' | 'log' | 'int';
  attributeExp: number;
  narrativeVi: string;
  narrativeEn: string;
  icon: string;
}

export const CANONICAL_LABOR_SHIFTS: ShiftTemplate[] = [
  {
    shiftId: 'SHIFT_FORGE_HAND',
    jobType: 'JOB_FORGE_HAND',
    titleVi: 'Thợ Phụ Kéo Bễ & Đập Búa Lò Rèn',
    titleEn: 'Blacksmith Forge Hand',
    workplaceVi: 'Lò Rèn Bách Nghệ Trác Quận',
    workplaceEn: 'Zhuo Artisan Blacksmith',
    wage: 140,
    staminaCost: 20,
    fatigueCost: 20,
    professionCode: 'PROF_BLACKSMITH',
    professionNameVi: 'Rèn Đúc Binh Khí',
    professionCategory: 'CRAFTING',
    expGain: 40,
    attributeTarget: 'cra',
    attributeExp: 15,
    narrativeVi: 'Kéo bễ thổi than hồng rực lửa, quai búa tạ đập phôi sắt tôi luyện cùng sư phụ thợ rèn. Nâng cao tay nghề cơ khí và thể lực.',
    narrativeEn: 'Pumped the forge bellows and swung heavy sledgehammers shaping wrought iron alongside the master armorer.',
    icon: '鍛'
  },
  {
    shiftId: 'SHIFT_CHEF_TAVERN',
    jobType: 'JOB_TAVERN_COOK',
    titleVi: 'Đầu Bếp & Điều Rượu Tại Tửu Điếm',
    titleEn: 'Tavern Chef & Cellar Master',
    workplaceVi: 'Tửu Điếm Đào Viên',
    workplaceEn: 'Peach Orchard Tavern',
    wage: 110,
    staminaCost: 15,
    fatigueCost: 15,
    professionCode: 'PROF_CHEF',
    professionNameVi: 'Trù Nghệ & Ẩm Thực',
    professionCategory: 'CRAFTING',
    expGain: 30,
    attributeTarget: 'com',
    attributeExp: 10,
    narrativeVi: 'Đứng bếp làm bánh bao thịt, nấu lẩu thịt rừng và pha chế rượu mơ thết đãi hào kiệt bốn phương.',
    narrativeEn: 'Prepared hearty steamed buns, roasted venison, and spiced wine for wandering warriors and patrons.',
    icon: '酒'
  },
  {
    shiftId: 'SHIFT_HERBALIST',
    jobType: 'JOB_APOTHECARY_COMPOUNDER',
    titleVi: 'Dược Đồng Bào Chế Thuốc Tại Hiệu Dược',
    titleEn: 'Apothecary Medicine Compounder',
    workplaceVi: 'Hồi Xuân Dược Đường',
    workplaceEn: 'Spring Rejuvenation Apothecary',
    wage: 120,
    staminaCost: 15,
    fatigueCost: 15,
    professionCode: 'PROF_MEDICINE',
    professionNameVi: 'Y Đạo & Dược Lý',
    professionCategory: 'CRAFTING',
    expGain: 35,
    attributeTarget: 'int',
    attributeExp: 12,
    narrativeVi: 'Dùng cối đồng tán thảo dược khô, sắc cao dán kim sang cứu trị quan binh và lê dân Trác Quận.',
    narrativeEn: 'Crushed dried herbs with bronze mortars and concocted healing salves for wounded militia.',
    icon: '藥'
  },
  {
    shiftId: 'SHIFT_WEAVER',
    jobType: 'JOB_WEAVER',
    titleVi: 'Thợ Thủ Công Đan Phên Tre & Bện Sọt',
    titleEn: 'Artisan Bamboo Basket Weaver',
    workplaceVi: 'Xưởng Thủ Công Lương Gia',
    workplaceEn: 'Liang Workshop',
    wage: 95,
    staminaCost: 12,
    fatigueCost: 12,
    professionCode: 'PROF_CRAFTSMAN',
    professionNameVi: 'Dệt & Đan Mây Tre',
    professionCategory: 'CRAFTING',
    expGain: 25,
    attributeTarget: 'cra',
    attributeExp: 10,
    narrativeVi: 'Vót nan tre sắc bén bện sọt quân nhu và đan chiếu cói. Tích lũy kỹ nghệ thủ công gia truyền Lương Thị.',
    narrativeEn: 'Pared bamboo splints into military grain hampers and woven mats, honing ancestral handicraft skills.',
    icon: '工'
  },
  {
    shiftId: 'SHIFT_MINER',
    jobType: 'JOB_MINER_CARRIER',
    titleVi: 'Phu Mỏ Khai Khoáng & Bốc Vác Quặng Sắt',
    titleEn: 'Iron Mine Carrier & Sledge Striker',
    workplaceVi: 'Mỏ Sắt Tây Sơn Trác Quận',
    workplaceEn: 'West Mountain Iron Mines',
    wage: 130,
    staminaCost: 18,
    fatigueCost: 18,
    professionCode: 'PROF_MINER',
    professionNameVi: 'Khai Khoáng & Luyện Quặng',
    professionCategory: 'GATHERING',
    expGain: 35,
    attributeTarget: 'log',
    attributeExp: 12,
    narrativeVi: 'Gánh quặng sắt thô từ vách núi đá hiểm trở về bến sông tập kết. Rèn luyện gân cốt và sức bền dẻo dai.',
    narrativeEn: 'Excavated hematite ore and hauled heavy loads down treacherous mountain paths.',
    icon: '礦'
  },
  {
    shiftId: 'SHIFT_WAITER',
    jobType: 'JOB_TAVERN_STAFF',
    titleVi: 'Tiểu Nhị Tiếp Tân Tửu Điếm & Trà Quán',
    titleEn: 'Tavern Runner & Guest Concierge',
    workplaceVi: 'Trà Quán Bình Dân Trác Huyện',
    workplaceEn: 'Zhuo County Tea House',
    wage: 85,
    staminaCost: 10,
    fatigueCost: 10,
    professionCode: 'PROF_MERCHANT',
    professionNameVi: 'Hành Thương & Giao Dịch',
    professionCategory: 'COMMERCE',
    expGain: 20,
    attributeTarget: 'com',
    attributeExp: 8,
    narrativeVi: 'Bưng trà rót nước, dọn dẹp bàn tiệc, lắng nghe tin đồn binh biến các quận huyện.',
    narrativeEn: 'Poured tea and greeted travelers from the Central Plains.',
    icon: '酒'
  }
];
