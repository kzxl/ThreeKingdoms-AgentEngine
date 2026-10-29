/**
 * ThreeKingdoms-AgentEngine: Standardized Character Dossiers Modal Component
 * (src/client/features/dossiers/dossiers.modal.ts)
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { dossiersService } from './dossiers.service';
import { CharacterDossier } from './dossiers.types';

export class DossiersModal {
  private protagonistModal: ModalShellInstance;
  private npcModal: ModalShellInstance;

  private currentProtagonist: CharacterDossier | null = null;
  private currentNpc: CharacterDossier | null = null;

  constructor() {
    // 1. Protagonist Dossier Modal
    this.protagonistModal = createModalShell({
      id: 'protagonist-dossier-modal',
      title: 'Hồ Sơ Nhân Vật Chính • Lương Diễn (Chí Viễn)',
      subtitle: 'Toàn bộ chỉ số năng lực 8 chiều, danh hiệu và thiên phú bản mệnh',
      seal: '主',
      size: 'lg',
      onOpen: async () => {
        await this.loadProtagonist();
      }
    });

    // 2. NPC Dossier Modal
    this.npcModal = createModalShell({
      id: 'npc-dossier-modal',
      title: 'Hồ Sơ Nhân Vật • Danh Tướng Tam Quốc',
      subtitle: 'Tình báo nhân vật, mức độ thân thiện và bí mật sương mù chiến tranh',
      seal: '将',
      size: 'lg'
    });
  }

  public async openProtagonist(): Promise<void> {
    await this.protagonistModal.open();
  }

  public async closeProtagonist(): Promise<void> {
    await this.protagonistModal.close();
  }

  public async openNpc(npcId: string): Promise<void> {
    try {
      this.currentNpc = await dossiersService.getNpcDossier(npcId);
      this.npcModal.setTitle(
        `Hồ Sơ Nhân Vật • ${this.currentNpc.nameVi}`,
        `Địa điểm: ${this.currentNpc.locationVi || 'U Châu'} • Thân phận: ${this.currentNpc.positionVi || 'Võ Tướng'}`
      );
      this.renderNpcContent();
      await this.npcModal.open();
    } catch (e) {
      console.error('[DossiersModal] Error loading NPC:', e);
    }
  }

  public async closeNpc(): Promise<void> {
    await this.npcModal.close();
  }

  private async loadProtagonist(): Promise<void> {
    try {
      this.currentProtagonist = await dossiersService.getProtagonistDossier();
      this.renderProtagonistContent();
    } catch (e) {
      console.error('[DossiersModal] Error loading protagonist:', e);
    }
  }

  private renderProtagonistContent(): void {
    const p = this.currentProtagonist;
    if (!p) return;
    const s = p.stats;

    const html = `
      <div class="dossier-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">主</div>
          <div class="lead-text">
            <h3>${p.nameVi} (${p.styleName || 'Chí Viễn'}) • Tuổi: ${p.age}</h3>
            <div class="text-muted text-sm">${p.positionVi} • Cư ngụ tại ${p.locationVi}</div>
          </div>
        </div>

        <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 mb-3">
          <h4 class="text-amber-300 font-bold text-xs uppercase mb-2">Bát Diện Năng Lực (Thuộc Tính Bản Thể):</h4>
          <div class="grid grid-cols-4 gap-2 font-mono text-xs text-center bg-slate-950 p-3 rounded">
            <div>VÕ LỰC: <strong class="text-red-400 font-bold">${s.war}</strong></div>
            <div>MƯU TRÍ: <strong class="text-blue-400 font-bold">${s.int}</strong></div>
            <div>THỐNG SOÁI: <strong class="text-amber-400 font-bold">${s.ldr}</strong></div>
            <div>CHÍNH TRỊ: <strong class="text-purple-400 font-bold">${s.pol}</strong></div>
            <div>THƯƠNG NGHIỆP: <strong class="text-yellow-400 font-bold">${s.com}</strong></div>
            <div>NGOẠI GIAO: <strong class="text-green-400 font-bold">${s.dip}</strong></div>
            <div>KỸ NGHỆ: <strong class="text-cyan-400 font-bold">${s.cra}</strong></div>
            <div>HẬU CẦN: <strong class="text-orange-400 font-bold">${s.log}</strong></div>
          </div>
        </div>

        <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
          <h4 class="text-amber-300 font-bold text-xs uppercase mb-1">Tiểu Sử & Chí Hướng:</h4>
          <p class="text-xs text-slate-300 leading-relaxed">${p.bioVi}</p>
        </div>
      </div>
    `;

    this.protagonistModal.setContent(html);
  }

  private renderNpcContent(): void {
    const n = this.currentNpc;
    if (!n) return;
    const s = n.stats || { war: 50, int: 50, ldr: 50, pol: 50, com: 50, dip: 50, cra: 50, log: 50 };

    const html = `
      <div class="dossier-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">将</div>
          <div class="lead-text">
            <h3>${n.nameVi} • Tính Cách: ${n.personality}</h3>
            <div class="text-muted text-sm">Động cơ: ${n.motivation} • Thân phận: ${n.positionVi}</div>
          </div>
        </div>

        <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 mb-3">
          <h4 class="text-amber-300 font-bold text-xs uppercase mb-2">Chỉ Số Năng Lực Nổi Trội:</h4>
          <div class="grid grid-cols-4 gap-2 font-mono text-xs text-center bg-slate-950 p-3 rounded">
            <div>VÕ: <strong class="text-red-400 font-bold">${s.war}</strong></div>
            <div>TRÍ: <strong class="text-blue-400 font-bold">${s.int}</strong></div>
            <div>SOÁI: <strong class="text-amber-400 font-bold">${s.ldr}</strong></div>
            <div>CHÍNH: <strong class="text-purple-400 font-bold">${s.pol}</strong></div>
          </div>
        </div>

        <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
          <h4 class="text-amber-300 font-bold text-xs uppercase mb-1">Hành Trạng Lịch Sử:</h4>
          <p class="text-xs text-slate-300 leading-relaxed">${n.bioVi || 'Nhân tài hào kiệt uy chấn phương bắc.'}</p>
        </div>
      </div>
    `;

    this.npcModal.setContent(html);
  }
}

export const dossiersModal = new DossiersModal();
