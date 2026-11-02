/**
 * ThreeKingdoms-AgentEngine: Standardized Transit & Turn Advance Modals
 * (src/client/features/transit-turn/transit-turn.modal.ts)
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';

export class TransitTurnModals {
  private travelModal: ModalShellInstance;
  private turnModal: ModalShellInstance;

  constructor() {
    // 1. Travel Transit Modal
    this.travelModal = createModalShell({
      id: 'travel-transit-modal',
      title: 'Lộ Trình Viễn Chinh • Dặm Trường Phong Vân',
      subtitle: 'Hành quân liên châu, khảo sát địa hình và ứng biến trước hiểm họa dọc đường',
      seal: '行',
      size: 'md'
    });

    // 2. Turn Advance Modal
    this.turnModal = createModalShell({
      id: 'turn-advance-modal',
      title: 'Ngày Tiếp Theo • Dòng Thời Gian',
      subtitle: 'Tiến một ngày, chi dùng hằng ngày và tự động chốt tháng khi sang mùng 1',
      seal: '歲',
      size: 'md'
    });
  }

  public async showTravelTransit(origin: string, dest: string, days: number, logHtml?: string): Promise<void> {
    this.travelModal.setTitle(
      'Hành Trình Viễn Chinh',
      `Từ ${origin} → Đến ${dest} (${days} ngày đường)`
    );
    this.travelModal.setContent(`
      <div class="travel-transit-body p-2 space-y-3">
        <div class="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono">
          ${logHtml || '<div>Xe ngựa lăn bánh trên quan đạo phương bắc... An toàn đến nơi!</div>'}
        </div>
        <button class="ui-btn ui-btn--primary w-full py-2 font-bold" onclick="window.TravelTransitUI.close()">
          Nhập Thành
        </button>
      </div>
    `);
    await this.travelModal.open();
  }

  public async openTravelTransitModal(): Promise<void> {
    await this.travelModal.open();
  }

  public async closeTravelTransitModal(): Promise<void> {
    await this.travelModal.close();
  }

  public async closeTravel(): Promise<void> {
    await this.travelModal.close();
  }

  public async showTurnAdvance(turnNumber: number, gameDate: string, summaryHtml?: string): Promise<void> {
    this.turnModal.setTitle(
      `Ngày ${gameDate}`,
      `Nhịp thời gian: ngày ${turnNumber} • Chi dùng và tiến trình tự động`
    );
    this.turnModal.setContent(`
      <div class="turn-advance-body p-2 space-y-3">
        <div class="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono space-y-1">
          ${summaryHtml || `
            <div class="text-green-400">◆ Một ngày trôi qua: lương thảo tiêu hao, thể lực hồi phục.</div>
            <div class="text-amber-300">◆ Công việc dài ngày và thương đoàn tiếp tục tiến.</div>
            <div class="text-blue-300">◆ Sang mùng 1, tháng tự động kết toán sản nghiệp và thế giới.</div>
          `}
        </div>
        <button class="ui-btn ui-btn--accent w-full py-2 font-bold" onclick="window.TurnAdvanceUI.close()">
          Tiếp Tục Mô Phỏng
        </button>
      </div>
    `);
    await this.turnModal.open();
  }

  public async closeTurn(): Promise<void> {
    await this.turnModal.close();
  }

  public async openTurnAdvanceModal(): Promise<void> {
    await this.turnModal.open();
  }

  public async closeTurnAdvanceModal(): Promise<void> {
    await this.turnModal.close();
  }
}

export const transitTurnModals = new TransitTurnModals();
