/**
 * ThreeKingdoms-AgentEngine: Instance Management Constants
 * (src/modules/instances/instances.constants.ts)
 *
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import path from 'path';

export const INSTANCE_PATHS = {
  SAVES_DIR: path.resolve(process.cwd(), 'saves'),
  INSTANCES_DIR: path.resolve(process.cwd(), 'saves', 'instances'),
  DEFAULT_SESSION_FILE: 'session.db',
  TEMPLATE_FILE: 'session.db'
} as const;

export const DEFAULT_ARCHETYPE_ID = 'ARCH-COMMONER-YOUTH';

export interface ArchetypePreset {
  id: string;
  nameVi: string;
  nameEn: string;
  defaultName: string;
  defaultStyleName: string;
  startingAge: number;
  initialCash: number;
  initialSafeCash: number;
  startingLocation: string;
  seal: string;
  bioVi: string;
  startingAssetsVi: string[];
  attributes: {
    war: number;
    ldr: number;
    int: number;
    pol: number;
    dip: number;
    com: number;
    log: number;
    cra: number;
  };
}

export const ARCHETYPE_PRESETS: Record<string, ArchetypePreset> = {
  'ARCH-COMMONER-YOUTH': {
    id: 'ARCH-COMMONER-YOUTH',
    nameVi: 'Thanh Niên Bố Y (Hai Bàn Tay Trắng)',
    nameEn: 'The Penniless Commoner (Zero-to-Hero)',
    defaultName: 'Lương Diễn',
    defaultStyleName: 'Chí Viễn',
    startingAge: 18,
    initialCash: 100,
    initialSafeCash: 0,
    startingLocation: 'Huyện Trác (Thảo Lư)',
    seal: '布',
    bioVi: 'Thanh niên áo vải chốn hương thôn, hai bàn tay trắng lập thân. Dựa vào đôi tay quai búa và đan lát kiếm sống, nuôi chí lớn giữa thời tao loạn.',
    startingAssetsVi: ['Vải thô áo cộc', 'Đòn gánh tre', '100 Đồng tiền vụn'],
    attributes: {
      war: 55,
      ldr: 50,
      int: 60,
      pol: 45,
      dip: 50,
      com: 52,
      log: 52,
      cra: 58
    }
  },
  'ARCH-SCHOLAR-ARTISAN': {
    id: 'ARCH-SCHOLAR-ARTISAN',
    nameVi: 'Sĩ Tộc Thương Khách (Gia Thế Tiểu Thương)',
    nameEn: 'The Scholar-Artisan (Gentry Merchant Lineage)',
    defaultName: 'Lương Diễn',
    defaultStyleName: 'Chí Viễn',
    startingAge: 21,
    initialCash: 15000,
    initialSafeCash: 1000,
    startingLocation: 'Huyện Trác (Xưởng Lương Gia)',
    seal: '士',
    bioVi: 'Hậu duệ gia tộc tiểu thương U Châu, học rộng biết sâu, kết hợp xưởng thủ công dệt gai và cung ứng hậu cần quân nhu.',
    startingAssetsVi: ['Xưởng Dệt Lương Gia', '3 Khung cửi dệt gai', 'Bộ đồ nghề thợ mộc'],
    attributes: {
      war: 48,
      ldr: 62,
      int: 76,
      pol: 60,
      dip: 65,
      com: 75,
      log: 62,
      cra: 60
    }
  },
  'ARCH-FRONTIER-OFFICER': {
    id: 'ARCH-FRONTIER-OFFICER',
    nameVi: 'Đô Úy Tiền Đồn (Võ Quan Biên Cương)',
    nameEn: 'The Frontier Militia Officer (Du Wei)',
    defaultName: 'Hạ Hầu Thắng',
    defaultStyleName: 'Bá Viễn',
    startingAge: 25,
    initialCash: 8000,
    initialSafeCash: 500,
    startingLocation: 'Bắc Quân Tiền Doanh',
    seal: '武',
    bioVi: 'Tướng lĩnh đồn trú biên viễn U Châu, thông thạo trận pháp binh nhung và rèn giũa hương binh dũng sĩ bảo vệ bách tính.',
    startingAssetsVi: ['Giáp da khâu đinh tán', 'Hán trực thương', 'Chiến mã phương bắc'],
    attributes: {
      war: 78,
      ldr: 76,
      int: 55,
      pol: 45,
      dip: 50,
      com: 40,
      log: 65,
      cra: 35
    }
  },
  'ARCH-SILK-CARAVAN': {
    id: 'ARCH-SILK-CARAVAN',
    nameVi: 'Thương Đoàn Tổng Quản (Trùm Buôn Tơ Lụa)',
    nameEn: 'The Silk Caravan Factor',
    defaultName: 'Chân Hạo',
    defaultStyleName: 'Trọng Diệu',
    startingAge: 28,
    initialCash: 25000,
    initialSafeCash: 2000,
    startingLocation: 'Thương Hội U Châu',
    seal: '商',
    bioVi: 'Tổng quản thương đoàn cự phú vận chuyển hàng hóa tơ lụa và trà muối giữa Ký Châu, Lạc Dương và Từ Châu.',
    startingAssetsVi: ['2 Cỗ xe ngựa gia cố', '4 Lừa thồ hàng', 'Giấy thông hành Thương hội'],
    attributes: {
      war: 40,
      ldr: 52,
      int: 68,
      pol: 55,
      dip: 75,
      com: 84,
      log: 72,
      cra: 45
    }
  }
};
