/**
 * ThreeKingdoms-AgentEngine: Standardized Personal Journal Modal Component
 * (src/client/features/personal-journal/personal-journal.modal.ts)
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { personalJournalService } from './personal-journal.service';
import { CareerPathProgress, JournalMilestone } from './personal-journal.types';

export class PersonalJournalModal {
  private modal: ModalShellInstance;
  private paths: CareerPathProgress[] = [];
  private milestones: JournalMilestone[] = [];

  constructor() {
    this.modal = createModalShell({
      id: 'personal-journal-modal',
      title: 'Sổ Tay Cá Nhân & Chí Hướng Cuộc Đời [J]',
      subtitle: 'Theo dõi tiến trình Ngũ Đại Phẩm Lộ, cột mốc huân công và lý tưởng nhân vật',
      seal: '志',
      size: 'xl',
      tabs: [
        { id: 'career', label: 'Ngũ Đại Phẩm Lộ', seal: '🌟' },
        { id: 'milestones', label: 'Cột Mốc Huân Công', seal: '🎖️' }
      ],
      activeTabId: 'career',
      onOpen: async () => {
        await this.refreshData();
        await this.renderActiveTab();
      },
      onTabChange: async () => {
        await this.renderActiveTab();
      }
    });
  }

  public async open(initialTab = 'career'): Promise<void> {
    await this.modal.open(initialTab);
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private async refreshData(): Promise<void> {
    try {
      const data = await personalJournalService.getCareerRoadmap('PLY-0001');
      this.paths = data.paths;
      this.milestones = data.milestones;
    } catch (e) {
      console.error('[PersonalJournalModal] Error refreshing data:', e);
    }
  }

  private async renderActiveTab(): Promise<void> {
    const tab = this.modal.activeTab || 'career';
    if (tab === 'career') {
      this.renderCareerTab();
    } else {
      this.renderMilestonesTab();
    }
  }

  private renderCareerTab(): void {
    const html = `
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">志</div>
          <div class="lead-text">
            <h3>Ngũ Đại Phẩm Lộ Tiến Trình</h3>
            <div class="text-muted text-sm">Tự do phát triển theo 5 con đường: Thợ Cả, Đại Thương, Thống Soái, Danh Sĩ, Tông Tộc.</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${this.paths.map(p => `
            <div class="tactical-card p-3.5 bg-slate-900 rounded border border-slate-800">
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-xl">${p.seal}</span>
                  <div>
                    <h4 class="text-amber-200 font-bold m-0 text-sm">${p.titleVi}</h4>
                    <span class="text-xs text-amber-400 font-semibold">${p.tierNameVi} (Bậc ${p.currentTier}/${p.maxTier})</span>
                  </div>
                </div>
                <span class="text-xs font-mono font-bold text-slate-300">${p.progressPercent}%</span>
              </div>

              <!-- Progress Bar -->
              <div class="w-full bg-slate-950 rounded-full h-2 mb-2.5 overflow-hidden border border-slate-700">
                <div class="bg-amber-400 h-2 rounded-full transition-all" style="width: ${p.progressPercent}%"></div>
              </div>

              <div class="text-[11px] text-muted mb-2">
                <strong class="text-slate-300">Cột mốc kế tiếp:</strong> ${p.nextMilestoneVi}
              </div>

              <div class="text-[11px] text-green-400 font-mono bg-slate-950/60 p-1.5 rounded">
                ✦ Đặc quyền: ${p.unlockedPerks.join(', ')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.modal.setContent(html);
  }

  private renderMilestonesTab(): void {
    const html = `
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">🎖️</div>
          <div class="lead-text">
            <h3>Cột Mốc Lịch Sử & Huân Công Đã Đạt</h3>
            <div class="text-muted text-sm">Ghi nhận những dấu ấn quan trọng trong hành trình bình định Tam Quốc.</div>
          </div>
        </div>

        <div class="space-y-2">
          <div class="tactical-card p-3 bg-slate-900 rounded border border-amber-500/40 flex justify-between items-center text-xs">
            <div>
              <div class="font-bold text-amber-200">Khởi Đầu Tại Trác Huyện</div>
              <div class="text-muted">Hoàn tất giao dịch quân nhu ban đầu và thiết lập cân bằng sổ cái kép.</div>
            </div>
            <span class="badge badge-success">ĐÃ ĐẠT</span>
          </div>

          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 flex justify-between items-center text-xs">
            <div>
              <div class="font-bold text-slate-300">Đào Viên Tụ Nghĩa</div>
              <div class="text-muted">Gặp gỡ Lưu Bị, Quan Vũ, Trương Phi tại Tửu quán Trác Huyện.</div>
            </div>
            <span class="badge badge-neutral">ĐANG THỰC HIỆN</span>
          </div>
        </div>
      </div>
    `;

    this.modal.setContent(html);
  }
}

export const personalJournalModal = new PersonalJournalModal();
