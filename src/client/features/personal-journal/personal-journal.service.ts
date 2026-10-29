/**
 * ThreeKingdoms-AgentEngine: Personal Journal & Career Service
 * (src/client/features/personal-journal/personal-journal.service.ts)
 */

import { apiClient } from '../../core/api/client-api';
import { CareerPathProgress, JournalMilestone } from './personal-journal.types';

export class PersonalJournalService {
  private static instance: PersonalJournalService;

  public static getInstance(): PersonalJournalService {
    if (!PersonalJournalService.instance) {
      PersonalJournalService.instance = new PersonalJournalService();
    }
    return PersonalJournalService.instance;
  }

  public async getCareerRoadmap(characterId = 'PLY-0001'): Promise<{
    paths: CareerPathProgress[];
    milestones: JournalMilestone[];
  }> {
    const res = await apiClient.get('/api/progression/career-paths', { characterId }).catch(() => ({}));
    const defaultPaths: CareerPathProgress[] = [
      {
        pathKey: 'ARTISAN',
        titleVi: 'Bách Nghệ / Thợ Cả',
        seal: '鍛',
        currentTier: 2,
        maxTier: 5,
        tierNameVi: 'Thợ Cả Trác Huyện',
        progressPercent: 45,
        nextMilestoneVi: 'Đúc 1 Thần Binh Bách Luyện độc bản',
        unlockedPerks: ['Giảm 15% hao hụt nguyên liệu xưởng']
      },
      {
        pathKey: 'MERCHANT',
        titleVi: 'Hành Thương / Cự Phú',
        seal: '錢',
        currentTier: 3,
        maxTier: 5,
        tierNameVi: 'Đại Lãnh Tiêu Xa',
        progressPercent: 60,
        nextMilestoneVi: 'Tích lũy ngân khố 20,000 Quan',
        unlockedPerks: ['Miễn 10% quan thuế trạm gác']
      },
      {
        pathKey: 'MARTIAL',
        titleVi: 'Võ Hiệp / Thống Soái',
        seal: '武',
        currentTier: 2,
        maxTier: 5,
        tierNameVi: 'Kiêu Dũng Hiệp Khách',
        progressPercent: 30,
        nextMilestoneVi: 'Thắng 3 trận lôi đài giáo trường',
        unlockedPerks: ['Khai mở Tuyệt Kỹ chiến trường']
      },
      {
        pathKey: 'SCHOLAR',
        titleVi: 'Sĩ Đồ / Mưu Sĩ',
        seal: '卷',
        currentTier: 1,
        maxTier: 5,
        tierNameVi: 'Thư Sinh Áo Vải',
        progressPercent: 20,
        nextMilestoneVi: 'Đạt Hảo Cảm 80 cùng Lư Thực',
        unlockedPerks: ['Mở đàm phán giảm giá tiêu xa']
      },
      {
        pathKey: 'LINEAGE',
        titleVi: 'Tông Tộc / Thế Gia',
        seal: '城',
        currentTier: 1,
        maxTier: 5,
        tierNameVi: 'Hàn Môn Lương Thị',
        progressPercent: 25,
        nextMilestoneVi: 'Thành gia lập thất nạp sính lễ',
        unlockedPerks: ['Khai sáng Phả Hệ Đời 1']
      }
    ];

    return {
      paths: res.paths || defaultPaths,
      milestones: res.milestones || []
    };
  }
}

export const personalJournalService = PersonalJournalService.getInstance();
