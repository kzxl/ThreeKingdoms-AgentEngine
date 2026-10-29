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
      title: 'Tuế Nguyệt Lưu Chuyển • Quyết Toán Nguyệt Kỳ',
      subtitle: 'Thời gian tiến tới 1 tháng, kết toán tài chính, nông vụ và dòng dõi gia tộc',
      seal: '歲',
      size: 'md'
    });
  }

  public async showTravelTransit(origin: string, dest: string, days: number, logHtml?: string): Promise<void> {
    this.travelModal.setTitle(
      'Hành Trình Viễn Chinh',
      `Từ ${origin} ➔ Đến ${dest} (${days} ngày đường)`
    );
    this.travelModal.setContent(`
      <div class="travel-transit-body p-2 space-y-3">
        <div class="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono">
          ${logHtml || '<div>Xe ngựa lăn bánh trên quan đạo phương bắc... An toàn đến nơi!</div>'}
        </div>
        <button class="btn btn-primary w-full py-2 font-bold" onclick="window.TravelTransitUI.close()">
          Nhập Thành
        </button>
      </div>
    `);
    await this.travelModal.open();
  }

  public async closeTravel(): Promise<void> {
    await this.travelModal.close();
  }

  public async showTurnAdvance(turnNumber: number, gameDate: string, summaryHtml?: string): Promise<void> {
    this.turnModal.setTitle(
      `Quyết Toán Lượt Thứ ${turnNumber}`,
      `Thời gian: ${gameDate} • Thiên thời địa lợi`
    );
    this.turnModal.setContent(`
      <div class="turn-advance-body p-2 space-y-3">
        <div class="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono space-y-1">
          ${summaryHtml || `
            <div class="text-green-400">✦ Hoàn tất chu kỳ sản xuất hàng tháng của các xưởng.</div>
            <div class="text-amber-300">✦ Kết toán sổ cái kép thu chi tài chính.</div>
            <div class="text-blue-300">✦ Cập nhật tiến độ thai kỳ và bồi dưỡng thế hệ gia tộc.</div>
          `}
        </div>
        <button class="btn btn-action-gold w-full py-2 font-bold" onclick="window.TurnAdvanceUI.close()">
          Tiếp Tục Mô Phỏng
        </button>
      </div>
    `);
    await this.turnModal.open();
  }

  public async closeTurn(): Promise<void> {
    await this.turnModal.close();
  }
}

export const transitTurnModals = new TransitTurnModals();
