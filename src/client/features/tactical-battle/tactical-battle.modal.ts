/**
 * ThreeKingdoms-AgentEngine: Standardized Tactical Battle Modal Component
 * (src/client/features/tactical-battle/tactical-battle.modal.ts)
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { spatialPoiService } from '../spatial-poi';
import { DuelRoundState } from '../spatial-poi/spatial-poi.types';

export class TacticalBattleModal {
  private modal: ModalShellInstance;
  private currentDuelId: string | null = null;
  private duelState: DuelRoundState | null = null;

  constructor() {
    this.modal = createModalShell({
      id: 'tactical-battle-modal',
      title: 'Quyết Đấu Sa Trường • Đơn Đả Độc Đấu 1v1',
      subtitle: 'Tương tác chiến thuật 4 lệnh (Công Kích, Phòng Ngự, Tuyệt Kỹ, Tụ Khí)',
      seal: '斗',
      size: 'lg'
    });
  }

  public async startDuel(opponentId: string): Promise<void> {
    try {
      const res = await spatialPoiService.startDuel(opponentId);
      this.currentDuelId = res.duelId;
      this.duelState = res.state;
      this.renderDuel();
      await this.modal.open();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Lỗi khởi động giao đấu!', true);
      }
    }
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private renderDuel(): void {
    const s = this.duelState;
    if (!s) return;

    const html = `
      <div class="tactical-battle-content">
        <div class="p-3 bg-slate-950/80 rounded border border-amber-900/40 mb-3">
          <div class="flex justify-between items-center mb-3">
            <span class="font-bold text-amber-200">Hiệp Đấu Thứ ${s.round}</span>
            <span class="badge ${s.isConcluded ? 'badge-danger' : 'badge-primary'}">${s.isConcluded ? 'TRẬN ĐẤU KẾT THÚC' : 'ĐANG ĐỐI ĐẦU'}</span>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="p-3 bg-slate-900 rounded border border-slate-800">
              <div class="text-xs font-bold text-amber-300 mb-1">Người Chơi</div>
              <div class="text-xs space-y-0.5 font-mono">
                <div>Sinh Lực: <strong class="text-green-400">${s.playerHp}</strong></div>
                <div>Khí Lực: <strong class="text-blue-400">${s.playerSpirit}</strong></div>
                <div>Sĩ Khí: <strong class="text-amber-400">${s.playerMorale}</strong></div>
              </div>
            </div>
            <div class="p-3 bg-slate-900 rounded border border-slate-800">
              <div class="text-xs font-bold text-red-300 mb-1">Đối Thủ</div>
              <div class="text-xs space-y-0.5 font-mono">
                <div>Sinh Lực: <strong class="text-red-400">${s.oppHp}</strong></div>
                <div>Khí Lực: <strong class="text-blue-400">${s.oppSpirit}</strong></div>
                <div>Sĩ Khí: <strong class="text-amber-400">${s.oppMorale}</strong></div>
              </div>
            </div>
          </div>

          ${!s.isConcluded ? `
            <div class="grid grid-cols-4 gap-2">
              <button class="btn btn-xs btn-primary" onclick="window.TacticalBattleUI.executeAction('ATTACK')">Công Kích</button>
              <button class="btn btn-xs btn-action-ghost" onclick="window.TacticalBattleUI.executeAction('DEFEND')">Phòng Ngự</button>
              <button class="btn btn-xs btn-action-gold" onclick="window.TacticalBattleUI.executeAction('SPECIAL_STRIKE')">Tuyệt Kỹ</button>
              <button class="btn btn-xs btn-action-ghost" onclick="window.TacticalBattleUI.executeAction('FOCUS_SPIRIT')">Tụ Khí</button>
            </div>
          ` : `
            <div class="text-center font-bold text-amber-300 py-2">
              ${s.outcome || 'Quyết đấu hoàn tất!'}
            </div>
          `}
        </div>

        <div class="bg-black/60 p-3 rounded text-xs font-mono max-h-48 overflow-y-auto space-y-1">
          ${s.combatLogs.map(l => `<div>${l}</div>`).join('')}
        </div>
      </div>
    `;

    this.modal.setContent(html);
  }

  public async executeAction(action: string): Promise<void> {
    if (!this.currentDuelId) return;
    try {
      this.duelState = await spatialPoiService.executeDuelRound(this.currentDuelId, action);
      this.renderDuel();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Lỗi hiệp đấu!', true);
      }
    }
  }
}

export const tacticalBattleModal = new TacticalBattleModal();
