/**
 * ThreeKingdoms-AgentEngine: Standardized Personal Journal Modal Component
 * (src/client/features/personal-journal/personal-journal.modal.ts)
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { personalJournalService } from './personal-journal.service';
import { CareerPathProgress, JournalMilestone, LifeStatusView } from './personal-journal.types';

export class PersonalJournalModal {
  private modal: ModalShellInstance;
  private paths: CareerPathProgress[] = [];
  private milestones: JournalMilestone[] = [];
  private life: LifeStatusView | null = null;

  constructor() {
    this.modal = createModalShell({
      id: 'personal-journal-modal',
      title: 'Sổ Tay Cá Nhân & Chí Hướng Cuộc Đời [J]',
      subtitle: 'Theo dõi tiến trình Ngũ Đại Phẩm Lộ, cột mốc huân công và lý tưởng nhân vật',
      seal: '志',
      size: 'xl',
      tabs: [
        { id: 'career', label: 'Ngũ Đại Phẩm Lộ', seal: '◆' },
        { id: 'life', label: 'Gia Đạo', seal: '家' },
        { id: 'milestones', label: 'Cột Mốc Huân Công', seal: '勳' }
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
      this.life = await personalJournalService.getLifeStatus('PLY-0001');
    } catch (e) {
      console.error('[PersonalJournalModal] Error refreshing data:', e);
    }
  }

  private async renderActiveTab(): Promise<void> {
    const tab = this.modal.activeTab || 'career';
    if (tab === 'career') {
      this.renderCareerTab();
    } else if (tab === 'life') {
      this.renderLifeTab();
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
                ◆ Đặc quyền: ${p.unlockedPerks.join(', ')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.modal.setContent(html);
  }

  private renderLifeTab(): void {
    const life = this.life;
    if (!life) {
      this.modal.setContent(`
        <div class="journal-modal-content">
          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 text-muted text-sm">
            Không tải được trạng thái Gia Đạo. Hãy kiểm tra kết nối máy chủ.
          </div>
        </div>
      `);
      return;
    }

    const bar = (label: string, value: number, tone: string) => `
      <div class="text-[11px]">
        <div class="flex justify-between mb-1"><span class="text-slate-300">${label}</span><span class="font-mono text-slate-200">${Math.round(value)}</span></div>
        <div class="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-700">
          <div class="${tone} h-2 rounded-full transition-all" style="width: ${Math.max(0, Math.min(100, value))}%"></div>
        </div>
      </div>
    `;

    const actions = life.actions.map(action => `
      <button
        class="ui-btn ${action.available ? 'ui-btn--primary' : 'ui-btn--ghost'} ui-btn--sm"
        data-life-action="${action.code}"
        ${action.available ? '' : 'disabled'}
        title="${action.reasonVi || action.labelEn}">
        ${action.labelVi}
      </button>
    `).join('');

    const skills = life.skills.length > 0
      ? life.skills.map(skill => `
        <div class="flex justify-between items-center text-[11px] border-b border-slate-800 py-1.5">
          <span class="text-slate-200">${skill.nameVi}</span>
          <span class="font-mono text-amber-300">Bậc ${skill.tier} · ${skill.currentExp}/${skill.maxExp}</span>
        </div>
      `).join('')
      : '<div class="text-muted text-xs">Chưa học kỹ năng đời sống nào. Hãy dùng bữa, uống trà hoặc luyện tập.</div>';

    const trainable = life.trainableSkills.filter(skill => skill.domain === 'LIFE');
    const skillOptions = trainable.map(skill =>
      `<option value="${skill.skillCode}">${skill.nameVi}</option>`
    ).join('');

    const html = `
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">家</div>
          <div class="lead-text">
            <h3>Gia Đạo & Sinh Hoạt</h3>
            <div class="text-muted text-sm">${life.date} · Buổi ${life.phaseLabel} · ${life.household.spouseName ? `Phu nhân ${life.household.spouseName} (${life.household.spouseRole})` : 'Chưa lập gia thất'} · ${life.household.children} con</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          ${bar('Thể lực', 100 - life.needs.fatigue, 'bg-green-400')}
          ${bar('Sĩ khí', life.needs.morale, 'bg-amber-400')}
          ${bar('Căng thẳng', life.needs.stress, 'bg-red-400')}
          ${bar('Khí huyết', life.needs.health, 'bg-sky-400')}
        </div>

        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 mb-3">
          <div class="text-xs font-bold text-amber-200 mb-2">Sinh Hoạt Trong Ngày</div>
          <div class="flex flex-wrap gap-2 mb-2">${actions}</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            <label class="text-muted">Người cùng uống trà
              <input id="life-npc-id" class="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="NPC-0002" />
            </label>
            <label class="text-muted">Kỹ năng để luyện
              <input id="life-skill-code" list="life-skill-list" class="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="SKL-LIF-COOK" />
              <datalist id="life-skill-list">
                ${skillOptions || '<option value="SKL-LIF-COOK">Trù Phòng & Gia Yến</option>'}
              </datalist>
            </label>
          </div>
        </div>

        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
          <div class="text-xs font-bold text-amber-200 mb-2">Kỹ Năng Đời Sống</div>
          ${skills}
        </div>
      </div>
    `;

    this.modal.setContent(html);
    this.bindLifeActions();
  }

  private bindLifeActions(): void {
    const body = this.modal.getBodyElement();
    if (!body) return;
    const npcInput = body.querySelector<HTMLInputElement>('#life-npc-id');
    const skillSelect = body.querySelector<HTMLInputElement>('#life-skill-code');

    body.querySelectorAll<HTMLButtonElement>('[data-life-action]').forEach(button => {
      button.addEventListener('click', async () => {
        const actionCode = button.dataset.lifeAction || '';
        button.disabled = true;
        try {
          const response = await personalJournalService.performLifeAction({
            characterId: 'PLY-0001',
            actionCode,
            npcId: actionCode === 'TEA_WITH_NPC' ? (npcInput?.value || 'NPC-0002') : undefined,
            skillCode: actionCode === 'STUDY_TRAIN' ? (skillSelect?.value || 'SKL-LIF-COOK') : undefined
          });
          const message = response?.result?.messageVi || 'Đã thực hiện sinh hoạt.';
          if (typeof (window as any).showToast === 'function') {
            (window as any).showToast(message);
          }
          this.life = await personalJournalService.getLifeStatus('PLY-0001');
          this.renderLifeTab();
        } catch (error: any) {
          button.disabled = false;
          if (typeof (window as any).showToast === 'function') {
            (window as any).showToast(error.message || 'Không thể thực hiện sinh hoạt.', true);
          }
        }
      });
    });
  }

  private renderMilestonesTab(): void {
    const html = `
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">勳</div>
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
