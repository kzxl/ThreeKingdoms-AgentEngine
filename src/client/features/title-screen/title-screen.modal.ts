/**
 * ThreeKingdoms-AgentEngine: Standardized Title Screen Modal Component
 * (src/client/features/title-screen/title-screen.modal.ts)
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { apiClient } from '../../core/api/client-api';

export class TitleScreenModal {
  private modal: ModalShellInstance;
  private selectedScenario = '184_YELLOW_TURBAN';

  constructor() {
    this.modal = createModalShell({
      id: 'title-screen-modal',
      title: 'Tam Quốc Diễn Nghĩa • Khởi Tạo Niên Đại & Nhân Vật',
      subtitle: 'Chọn niên đại lịch sử và thiết lập danh tính nhân vật chính',
      seal: '國',
      size: 'lg',
      onOpen: async () => {
        this.renderContent();
      }
    });
  }

  public async open(): Promise<void> {
    await this.modal.open();
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private renderContent(): void {
    const html = `
      <div class="title-screen-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">國</div>
          <div class="lead-text">
            <h3>Chọn Khởi Điểm Chiến Dịch</h3>
            <div class="text-muted text-sm">Mỗi niên đại có cục diện chư hầu, kinh tế và thế lực hoàn toàn khác biệt.</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario === '184_YELLOW_TURBAN' ? 'border-amber-400 bg-amber-950/20' : 'border-slate-800'} cursor-pointer"
               onclick="window.TitleScreenUI.selectScenario('184_YELLOW_TURBAN')">
            <h4 class="text-amber-200 font-bold text-sm mb-1">184 SCN: Khởi Nghĩa Khăn Vàng</h4>
            <div class="text-xs text-muted">Trương Giác dấy binh, triều đình suy vi, anh hùng thảo mộc bắt đầu khởi nghiệp.</div>
          </div>

          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario === '190_DONG_ZHUO' ? 'border-amber-400 bg-amber-950/20' : 'border-slate-800'} cursor-pointer"
               onclick="window.TitleScreenUI.selectScenario('190_DONG_ZHUO')">
            <h4 class="text-amber-200 font-bold text-sm mb-1">190 SCN: Thảo Phạt Đổng Trác</h4>
            <div class="text-xs text-muted">Mười tám lộ chư hầu hội minh Quan Đông, Lạc Dương biển lửa.</div>
          </div>

          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario === '200_GUANDU' ? 'border-amber-400 bg-amber-950/20' : 'border-slate-800'} cursor-pointer"
               onclick="window.TitleScreenUI.selectScenario('200_GUANDU')">
            <h4 class="text-amber-200 font-bold text-sm mb-1">200 SCN: Quan Độ Chi Chiến</h4>
            <div class="text-xs text-muted">Tào Tháo đối đầu Viên Thiệu tranh đoạt bá chủ phương bắc.</div>
          </div>

          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario === '208_CHIBI' ? 'border-amber-400 bg-amber-950/20' : 'border-slate-800'} cursor-pointer"
               onclick="window.TitleScreenUI.selectScenario('208_CHIBI')">
            <h4 class="text-amber-200 font-bold text-sm mb-1">208 SCN: Xích Bích Đại Chiến</h4>
            <div class="text-xs text-muted">Tôn Lưu liên minh, đại chiến thủy quân Trường Giang định hình Tam Quốc.</div>
          </div>
        </div>

        <div class="tactical-card p-3.5 bg-slate-900 rounded border border-slate-800">
          <h4 class="text-amber-300 font-bold text-xs uppercase mb-2">Thông Tin Nhân Vật Khởi Tạo:</h4>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Họ & Tên:</label>
              <input type="text" id="ts-player-name" class="modal-input w-full" value="Lương Diễn" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Tên Chữ (Tự):</label>
              <input type="text" id="ts-player-style" class="modal-input w-full" value="Chí Viễn" />
            </div>
          </div>
          <button class="btn btn-action-gold w-full py-2.5 font-bold" onclick="window.TitleScreenUI.startCampaign()">
            Khởi Sự Chiến Dịch Lịch Sử
          </button>
        </div>
      </div>
    `;

    this.modal.setContent(html);
  }

  public selectScenario(scen: string): void {
    this.selectedScenario = scen;
    this.renderContent();
  }

  public async startCampaign(): Promise<void> {
    const nameEl = document.getElementById('ts-player-name') as HTMLInputElement;
    const styleEl = document.getElementById('ts-player-style') as HTMLInputElement;

    try {
      await apiClient.post('/api/session/new-game', {
        scenario: this.selectedScenario,
        playerName: nameEl?.value || 'Lương Diễn',
        playerStyle: styleEl?.value || 'Chí Viễn'
      });
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast('Khởi tạo chiến dịch thành công!');
      }
      await this.modal.close();
      window.location.reload();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Lỗi khởi tạo chiến dịch!', true);
      }
    }
  }
}

export const titleScreenModal = new TitleScreenModal();
