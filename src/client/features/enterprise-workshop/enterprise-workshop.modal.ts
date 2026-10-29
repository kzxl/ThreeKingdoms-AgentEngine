/**
 * ThreeKingdoms-AgentEngine: Standardized Enterprise & Workshop Modal Component
 * (src/client/features/enterprise-workshop/enterprise-workshop.modal.ts)
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { enterpriseWorkshopService } from './enterprise-workshop.service';
import { EnterpriseRecord } from './enterprise-workshop.types';

export class EnterpriseWorkshopModal {
  private modal: ModalShellInstance;
  private enterprises: EnterpriseRecord[] = [];
  private laborOptions: any[] = [];

  constructor() {
    this.modal = createModalShell({
      id: 'enterprise-modal',
      title: 'Sản Nghiệp & Phường Xưởng Bách Nghệ',
      subtitle: 'Quản lý xưởng dệt, xưởng rèn, đi làm thuê công nhật tích lũy ngân lượng',
      seal: '業',
      size: 'xl',
      tabs: [
        { id: 'owner', label: 'Sản Nghiệp Gia Tộc', seal: '坊' },
        { id: 'work', label: 'Đi Làm Thuê Thời Vụ', seal: '工' }
      ],
      activeTabId: 'owner',
      onOpen: async () => {
        await this.refreshData();
        await this.renderActiveTab();
      },
      onTabChange: async () => {
        await this.renderActiveTab();
      }
    });
  }

  public async open(initialTab = 'owner'): Promise<void> {
    await this.modal.open(initialTab);
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private async refreshData(): Promise<void> {
    try {
      const data = await enterpriseWorkshopService.getStatus('PLY-0001');
      this.enterprises = (data as any)?.ownedBusinesses || (data as any)?.activeEnterprises || [];
      this.laborOptions = (data as any)?.laborOptions || [];
    } catch (e) {
      console.error('[EnterpriseWorkshopModal] Error refreshing data:', e);
    }
  }

  private async renderActiveTab(): Promise<void> {
    const tab = this.modal.activeTab || 'owner';
    if (tab === 'owner') {
      this.renderOwnerTab();
    } else {
      this.renderWorkTab();
    }
  }

  private renderOwnerTab(): void {
    const html = `
      <div class="enterprise-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">業</div>
          <div class="lead-text">
            <h3>Sản Nghiệp Sở Hữu (${this.enterprises.length} Cơ Sở)</h3>
            <div class="text-muted text-sm">Các xưởng chế tác tự động vận hành chu kỳ sản xuất hàng tháng và tích lũy doanh thu vào Quỹ an toàn.</div>
          </div>
        </div>

        ${this.enterprises.length === 0 ? `
          <div class="text-center py-10 text-muted">
            Hiện tại bạn chưa sở hữu sản nghiệp nào. Hãy tích lũy tiền tệ hoặc làm thuê để mua lại xưởng mộc, xưởng rèn tại Trác Huyện.
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${this.enterprises.map(e => `
              <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
                <div class="flex justify-between items-start mb-2">
                  <h4 class="text-amber-200 font-bold m-0 text-base">${e.name_vi}</h4>
                  <span class="badge badge-success text-xs">${e.status || 'VẬN HÀNH'}</span>
                </div>
                <div class="text-xs text-muted mb-3">Địa điểm: ${e.settlement_id} • Thợ xưởng: ${e.worker_count || 1}/${e.max_workers || 5}</div>

                <div class="bg-slate-950/70 p-2.5 rounded font-mono text-xs mb-3 space-y-1">
                  <div class="flex justify-between">
                    <span class="text-muted">Quỹ An Toàn:</span>
                    <span class="text-amber-400 font-bold">${Number(e.safe_cash || 0).toLocaleString()} Quan</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted">Chi Phí Tháng:</span>
                    <span class="text-red-400 font-bold">${Number(e.monthly_overhead || 0).toLocaleString()} Quan</span>
                  </div>
                </div>

                <div class="flex gap-2">
                  <button class="ui-btn ui-btn--primary ui-btn--sm flex-1" onclick="window.EnterpriseUI.depositSafeCash('${e.enterprise_id}')">Nạp Quỹ</button>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm flex-1" onclick="window.EnterpriseUI.withdrawSafeCash('${e.enterprise_id}')">Rút Quan</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    this.modal.setContent(html);
  }

  private renderWorkTab(): void {
    const html = `
      <div class="enterprise-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">工</div>
          <div class="lead-text">
            <h3>Lao Động Làm Thuê Thời Vụ</h3>
            <div class="text-muted text-sm">Đi làm thuê tại các xưởng nghề, đồn điền nông nghiệp để kiếm tiền trang trải và rèn luyện kỹ năng.</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 text-center">
            <h4 class="text-amber-300 font-bold text-sm mb-1">Đốn Củi & Tiêu Xa</h4>
            <div class="text-xs text-muted mb-2">Tiêu hao 15 Thể lực • Kiếm 40 Quan • Tăng EXP Võ/Thống</div>
            <button class="ui-btn ui-btn--primary ui-btn--sm w-full" onclick="window.EnterpriseUI.executeWork('WOODCUT')">Nhận Việc</button>
          </div>
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 text-center">
            <h4 class="text-amber-300 font-bold text-sm mb-1">Đan Lát Chiếu Trúc</h4>
            <div class="text-xs text-muted mb-2">Tiêu hao 12 Thể lực • Kiếm 50 Quan • Tăng EXP Kỹ Nghệ</div>
            <button class="ui-btn ui-btn--primary ui-btn--sm w-full" onclick="window.EnterpriseUI.executeWork('WEAVE_MAT')">Nhận Việc</button>
          </div>
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 text-center">
            <h4 class="text-amber-300 font-bold text-sm mb-1">Phụ Lò Rèn Thiết Điếm</h4>
            <div class="text-xs text-muted mb-2">Tiêu hao 20 Thể lực • Kiếm 65 Quan • Tăng EXP Kỹ Nghệ/Võ</div>
            <button class="ui-btn ui-btn--accent ui-btn--sm w-full" onclick="window.EnterpriseUI.executeWork('SMITH_ASSIST')">Nhận Việc</button>
          </div>
        </div>
      </div>
    `;

    this.modal.setContent(html);
  }

  public async depositSafeCash(enterpriseId: string): Promise<void> {
    const amtStr = prompt('Nhập số tiền muốn nạp vào quỹ an toàn:', '500');
    if (!amtStr) return;
    const amt = parseInt(amtStr, 10);
    if (isNaN(amt) || amt <= 0) return;

    try {
      await enterpriseWorkshopService.manageSafeCash(enterpriseId, 'DEPOSIT', amt);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast('Đã nạp tiền vào Quỹ an toàn!');
      }
      await this.refreshData();
      await this.renderActiveTab();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Lỗi nạp tiền!', true);
      }
    }
  }

  public async withdrawSafeCash(enterpriseId: string): Promise<void> {
    const amtStr = prompt('Nhập số tiền muốn rút từ quỹ an toàn:', '500');
    if (!amtStr) return;
    const amt = parseInt(amtStr, 10);
    if (isNaN(amt) || amt <= 0) return;

    try {
      await enterpriseWorkshopService.manageSafeCash(enterpriseId, 'WITHDRAW', amt);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast('Đã rút tiền từ Quỹ an toàn về ngân khố!');
      }
      await this.refreshData();
      await this.renderActiveTab();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Lỗi rút tiền!', true);
      }
    }
  }

  public async executeWork(shiftType: string): Promise<void> {
    try {
      const res = await enterpriseWorkshopService.executeLaborShift(shiftType);
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(res.narrativeVi || 'Lao động hoàn tất, nhận tiền công!');
      }
      await this.refreshData();
      await this.renderActiveTab();
    } catch (e: any) {
      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast(e.message || 'Không thể làm việc lúc này!', true);
      }
    }
  }
}

export const enterpriseWorkshopModal = new EnterpriseWorkshopModal();
