/**
 * ThreeKingdoms-AgentEngine: Standardized Caravan Logistics Modal Component
 * (src/client/features/caravan-logistics/caravan-logistics.modal.ts)
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { caravanLogisticsService } from './caravan-logistics.service';
import { ArbitrageRoute, CaravanRecord } from './caravan-logistics.types';

export class CaravanLogisticsModal {
  private modal: ModalShellInstance;
  private caravans: CaravanRecord[] = [];
  private routes: ArbitrageRoute[] = [];

  constructor() {
    this.modal = createModalShell({
      id: 'caravan-modal',
      title: 'Thương Đoàn Viễn Chinh & Trục Vận Chuyển',
      subtitle: 'Thiết lập tuyến buôn liên châu, kinh doanh chênh lệch giá và thuê hộ tiêu áp tải',
      seal: '商',
      size: 'xl',
      tabs: [
        { id: 'active', label: 'Thương Đoàn Đang Chạy', seal: '運' },
        { id: 'arbitrage', label: 'Thương Cơ & Chênh Lệch Giá', seal: '漲' },
        { id: 'dispatch', label: 'Xuất Tiêu Khai Tuyến', seal: '旗' }
      ],
      activeTabId: 'active',
      onOpen: async () => {
        await this.refreshData();
        await this.renderActiveTab();
      },
      onTabChange: async () => {
        await this.renderActiveTab();
      }
    });
  }

  public async open(initialTab = 'active'): Promise<void> {
    await this.modal.open(initialTab);
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private async refreshData(): Promise<void> {
    try {
      const [c, r] = await Promise.all([
        caravanLogisticsService.getCaravans().catch(() => []),
        caravanLogisticsService.getArbitrageOpportunities().catch(() => [])
      ]);
      this.caravans = c;
      this.routes = r;
      this.modal.updateTabBadge('active', c.length > 0 ? c.length : undefined);
    } catch (e) {
      console.error('[CaravanLogisticsModal] Error refreshing data:', e);
    }
  }

  private async renderActiveTab(): Promise<void> {
    const tab = this.modal.activeTab || 'active';
    switch (tab) {
      case 'active':
        this.renderActiveTabContent();
        break;
      case 'arbitrage':
        this.renderArbitrageTabContent();
        break;
      case 'dispatch':
        this.renderDispatchTabContent();
        break;
    }
  }

  private renderActiveTabContent(): void {
    const html = `
      <div class="caravan-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">運</div>
          <div class="lead-text">
            <h3>Đội Buôn Lưu Động (${this.caravans.length} Tiêu Xa)</h3>
            <div class="text-muted text-sm">Thương đoàn di chuyển liên thành theo lượt tháng, ứng biến trước thời tiết và thổ phỉ dọc quan đạo.</div>
          </div>
        </div>

        ${this.caravans.length === 0 ? `
          <div class="text-center py-10 text-muted">
            Hiện không có thương đoàn nào trên đường. Hãy vào mục "Xuất Tiêu Khai Tuyến" để phái chuyến buôn đầu tiên.
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${this.caravans.map(c => `
              <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
                <div class="flex justify-between items-start mb-2">
                  <h4 class="text-amber-200 font-bold m-0 text-sm">Hàng Hóa: ${c.commodity_code} (SL: ${c.cargo_qty})</h4>
                  <span class="badge ${c.status === 'IN_TRANSIT' ? 'badge-primary' : 'badge-success'} text-xs">${c.status}</span>
                </div>
                <div class="text-xs text-muted mb-2">Từ: ${c.origin_settlement_id} → Đến: ${c.dest_settlement_id}</div>
                <div class="text-xs text-slate-300 font-mono">Thời gian còn lại: ${c.days_remaining}/${c.total_days} ngày • Hộ vệ: ${c.escort_level}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    this.modal.setContent(html);
  }

  private renderArbitrageTabContent(): void {
    const html = `
      <div class="caravan-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">漲</div>
          <div class="lead-text">
            <h3>Bảng Chênh Lệch Giá Hàng Hóa Liên Châu</h3>
            <div class="text-muted text-sm">Phân tích giá mua tại Trác Huyện và giá bán tại các thành thị lớn (Lạc Dương, Nghiệp Thành, Kiến Nghiệp).</div>
          </div>
        </div>

        ${this.routes.length === 0 ? `
          <div class="text-center py-8 text-muted">Đang cập nhật tỷ giá liên thành...</div>
        ` : `
          <div class="grid grid-cols-1 gap-2">
            ${this.routes.map(r => `
              <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span class="font-bold text-amber-200">${r.commodityNameVi || r.commodityCode}</span>: 
                  ${r.originNameVi} (${r.buyPrice}đ) → ${r.destNameVi} (${r.sellPrice}đ)
                </div>
                <div class="text-right">
                  <span class="text-green-400 font-bold font-mono">+${r.profitPerUnit}đ/đơn vị</span>
                  <div class="text-muted text-[11px]">${r.distanceDays} ngày hành trình</div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    this.modal.setContent(html);
  }

  private renderDispatchTabContent(): void {
    const html = `
      <div class="caravan-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">旗</div>
          <div class="lead-text">
            <h3>Khởi Hành Tiêu Xa Thương Đoàn</h3>
            <div class="text-muted text-sm">Chọn điểm đến, loại hàng hóa trong kho và cấp bậc thuê tiêu sư bảo an.</div>
          </div>
        </div>

        <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Thành Thị Đích:</label>
              <select id="caravan-dest-id" class="modal-input w-full">
                <option value="ye_cheng">Nghiệp Thành (Hà Bắc - 5 ngày)</option>
                <option value="luo_yang">Lạc Dương (Kinh Đô - 12 ngày)</option>
                <option value="xu_chang">Hứa Xương (Trung Nguyên - 10 ngày)</option>
                <option value="jian_ye">Kiến Nghiệp (Giang Đông - 18 ngày)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Hàng Hóa Vận Chuyển:</label>
              <select id="caravan-commodity" class="modal-input w-full">
                <option value="PROD-MAT">Chiếu Trúc Lương Gia</option>
                <option value="PROD-BASK">Giỏ Thùng Đan Vận Chuyển</option>
                <option value="COM-SILK">Tơ Lụa Nguyên Tấm</option>
                <option value="COM-IRON">Sắt Thỏi Luyện Tinh</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Số Lượng Xuất Kho:</label>
              <input type="number" id="caravan-qty" class="modal-input w-full" value="20" min="5" max="100" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Cấp Hộ Tiêu Bảo An:</label>
              <select id="caravan-escort" class="modal-input w-full">
                <option value="NONE">Không Thuê (Rủi ro thổ phỉ cao)</option>
                <option value="MILITIA">Dân Binh Địa Phương (+100 Quan)</option>
                <option value="MERCENARY">Tiêu Sư Giang Hồ (+300 Quan, An Toàn 95%)</option>
              </select>
            </div>
          </div>

          <button class="ui-btn ui-btn--accent w-full py-2.5 font-bold" onclick="window.CaravanUI.executeDispatch()">
            Xuất Phát Thương Đoàn
          </button>
        </div>
      </div>
    `;

    this.modal.setContent(html);
  }

  public async executeDispatch(): Promise<void> {
    const destEl = document.getElementById('caravan-dest-id') as HTMLSelectElement;
    const commEl = document.getElementById('caravan-commodity') as HTMLSelectElement;
    const qtyEl = document.getElementById('caravan-qty') as HTMLInputElement;
    const escortEl = document.getElementById('caravan-escort') as HTMLSelectElement;

    const payload = {
      originSettlementId: 'zhuo_xian',
      destSettlementId: destEl?.value || 'ye_cheng',
      commodityCode: commEl?.value || 'PROD-MAT',
      quantity: parseInt(qtyEl?.value || '20', 10),
      escortLevel: escortEl?.value || 'MILITIA'
    };

    try {
      const res = await caravanLogisticsService.dispatchCaravan(payload);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(res.narrativeVi || 'Thương đoàn đã xuất phát!');
      }
      await this.refreshData();
      await this.modal.switchTab('active');
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Lỗi xuất thương đoàn!', true);
      }
    }
  }
}

export const caravanLogisticsModal = new CaravanLogisticsModal();
