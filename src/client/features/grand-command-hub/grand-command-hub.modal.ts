/**
 * ThreeKingdoms-AgentEngine: Standardized Grand Command Hub Modal Component
 * (src/client/features/grand-command-hub/grand-command-hub.modal.ts)
 *
 * Implements the Unified "Đại Bản Doanh / Quân Cơ Xứ" Grand Command Hub
 * consolidating the 6 Strategic Operational Pillars using ModalShell.
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { equipmentForgeModal } from '../equipment-forge';
import { enterpriseWorkshopModal } from '../enterprise-workshop';
import { caravanLogisticsModal } from '../caravan-logistics';
import { lineageFamilyModal } from '../lineage-family';
import { spatialPoiModals } from '../spatial-poi';

export class GrandCommandHubModal {
  private modal: ModalShellInstance;

  constructor() {
    this.modal = createModalShell({
      id: 'grand-command-hub-modal',
      title: 'Đại Bản Doanh • Quân Cơ Xứ',
      subtitle: 'Trung tâm điều hành Lục Đại Trụ Cột Chiến Lược (Quân Trang, Sản Nghiệp, Thương Đoàn, Gia Thất, Diễn Võ, Tụ Nghĩa)',
      seal: '帥',
      size: 'xl',
      tabs: [
        { id: 'overview', label: 'Tổng Quan Bản Doanh', seal: '帥' },
        { id: 'gear', label: 'Quân Trang & Lò Rèn', seal: '武' },
        { id: 'enterprise', label: 'Sản Nghiệp & Xưởng', seal: '業' },
        { id: 'caravan', label: 'Thương Đoàn & Tiêu Xa', seal: '商' },
        { id: 'family', label: 'Gia Thất & Dòng Tộc', seal: '家' },
        { id: 'duel', label: 'Diễn Võ & Lôi Đài', seal: '演' },
        { id: 'banquet', label: 'Tụ Nghĩa & Yến Tiệc', seal: '義' }
      ],
      activeTabId: 'overview',
      onOpen: async () => {
        await this.renderActiveTab();
      },
      onTabChange: async (tabId) => {
        await this.handleTabSwitch(tabId);
      }
    });
  }

  public async open(tabKey = 'overview'): Promise<void> {
    if (tabKey === 'career') tabKey = 'overview';
    await this.modal.open(tabKey);
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private async handleTabSwitch(tabId: string): Promise<void> {
    if (tabId === 'gear') {
      await this.modal.close();
      await equipmentForgeModal.open('PLY-0001', 'gear');
    } else if (tabId === 'enterprise') {
      await this.modal.close();
      await enterpriseWorkshopModal.open('owner');
    } else if (tabId === 'caravan') {
      await this.modal.close();
      await caravanLogisticsModal.open('active');
    } else if (tabId === 'family') {
      await this.modal.close();
      await lineageFamilyModal.open('courtship');
    } else if (tabId === 'duel') {
      await this.modal.close();
      await spatialPoiModals.openArena('spar');
    } else if (tabId === 'banquet') {
      await this.modal.close();
      await spatialPoiModals.openTavern('drink');
    } else {
      await this.renderOverviewTab();
    }
  }

  private async renderActiveTab(): Promise<void> {
    await this.renderOverviewTab();
  }

  private async renderOverviewTab(): Promise<void> {
    const html = `
      <div class="grand-hub-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">帥</div>
          <div class="lead-text">
            <h3>Tổng Quan Lục Đại Trụ Cột Chiến Lược</h3>
            <div class="text-muted text-sm">Chọn một trụ cột để đi sâu vào hệ thống quản lý chuyên biệt.</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 hover:border-amber-400 cursor-pointer transition-all"
               onclick="window.GrandCommandHubUI.open('gear')">
            <div class="text-2xl mb-2">武</div>
            <h4 class="text-amber-200 font-bold mb-1">Quân Trang & Lò Rèn</h4>
            <div class="text-xs text-muted">Trang bị vũ khí, giáp trụ, chiến mã và đúc thần binh độc bản.</div>
          </div>

          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 hover:border-amber-400 cursor-pointer transition-all"
               onclick="window.GrandCommandHubUI.open('enterprise')">
            <div class="text-2xl mb-2">業</div>
            <h4 class="text-amber-200 font-bold mb-1">Sản Nghiệp & Xưởng Nghề</h4>
            <div class="text-xs text-muted">Quản lý xưởng dệt, xưởng rèn và làm thuê công nhật.</div>
          </div>

          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 hover:border-amber-400 cursor-pointer transition-all"
               onclick="window.GrandCommandHubUI.open('caravan')">
            <div class="text-2xl mb-2">商</div>
            <h4 class="text-amber-200 font-bold mb-1">Thương Đoàn & Tiêu Xa</h4>
            <div class="text-xs text-muted">Vận chuyển liên thành, kinh doanh chênh lệch giá và thuê hộ tiêu.</div>
          </div>

          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 hover:border-amber-400 cursor-pointer transition-all"
               onclick="window.GrandCommandHubUI.open('family')">
            <div class="text-2xl mb-2">家</div>
            <h4 class="text-amber-200 font-bold mb-1">Gia Thất & Dòng Tộc</h4>
            <div class="text-xs text-muted">Cầu hôn giai nhân, bồi dưỡng thế tử và thừa kế tông miếu.</div>
          </div>

          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 hover:border-amber-400 cursor-pointer transition-all"
               onclick="window.GrandCommandHubUI.open('duel')">
            <div class="text-2xl mb-2">演</div>
            <h4 class="text-amber-200 font-bold mb-1">Diễn Võ & Lôi Đài</h4>
            <div class="text-xs text-muted">Luận kiếm cùng Quan Vũ, Trương Phi và quyết đấu 1v1.</div>
          </div>

          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 hover:border-amber-400 cursor-pointer transition-all"
               onclick="window.GrandCommandHubUI.open('banquet')">
            <div class="text-2xl mb-2">義</div>
            <h4 class="text-amber-200 font-bold mb-1">Tụ Nghĩa & Yến Tiệc</h4>
            <div class="text-xs text-muted">Ẩm tửu dưỡng thần, đại yến hào kiệt và kết bái huynh đệ.</div>
          </div>
        </div>
      </div>
    `;

    this.modal.setContent(html);
  }
}

export const grandCommandHubModal = new GrandCommandHubModal();
