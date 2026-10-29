/**
 * ThreeKingdoms-AgentEngine: Character Dossiers Service
 * (src/client/features/dossiers/dossiers.service.ts)
 */

import { apiClient } from '../../core/api/client-api';
import { CharacterDossier } from './dossiers.types';

export class DossiersService {
  private static instance: DossiersService;

  public static getInstance(): DossiersService {
    if (!DossiersService.instance) {
      DossiersService.instance = new DossiersService();
    }
    return DossiersService.instance;
  }

  public async getProtagonistDossier(): Promise<CharacterDossier> {
    const res = await apiClient.get('/api/status');
    const p = res.player || {};
    return {
      characterId: p.character_id || 'PLY-0001',
      nameVi: p.name_vi || 'Lương Diễn',
      nameEn: p.name_en || 'Liang Yan',
      styleName: p.style_name || 'Chí Viễn',
      age: p.age || 20,
      locationVi: res.settlement?.nameVi || 'Trác Huyện',
      positionVi: p.position_vi || 'Thương Gia Tự Do',
      personality: 'PRAGMATIC',
      motivation: 'HEGEMONY',
      bioVi: 'Hậu nhân Lương thị U Châu, thông tuệ thương đạo, ôm chí lớn bình định loạn thế Tam Quốc.',
      stats: {
        war: p.war_attr || 50,
        int: p.int_attr || 50,
        ldr: p.ldr_attr || 50,
        pol: p.pol_attr || 50,
        com: p.com_attr || 60,
        dip: p.dip_attr || 50,
        cra: p.cra_attr || 55,
        log: p.log_attr || 50
      },
      talents: p.talents ? (typeof p.talents === 'string' ? JSON.parse(p.talents) : p.talents) : ['THƯƠNG_TRÍ', 'KỸ_XẢO']
    };
  }

  public async getNpcDossier(npcId: string): Promise<CharacterDossier> {
    const res = await apiClient.get('/api/npcs/dossier', { npcId });
    return res.dossier || res;
  }
}

export const dossiersService = DossiersService.getInstance();
