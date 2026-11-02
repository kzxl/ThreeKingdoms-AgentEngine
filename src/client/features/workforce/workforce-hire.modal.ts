/**
 * Specialist hire modal: shows the server quote, standing gates and refusal
 * retry date before the player signs a retainer contract.
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';
import { HireQuote, workforceHireService } from './workforce-hire.service';

function esc(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(message: string, danger = false): void {
  if (typeof (window as any).showToast === 'function') (window as any).showToast(message, danger);
}

const ROLE_LABELS: Record<string, string> = {
  ACCOUNTANT_MANAGER: 'Chưởng Quỹ',
  MASTER_BLACKSMITH: 'Thợ Cả Lò Rèn',
  CARAVAN_ESCORT_CHIEF: 'Tiêu Đầu Hộ Vệ',
  MASTER_WEAVER: 'Thợ Dệt Cả',
  ASSISTANT_WORKER: 'Phụ Việc'
};

export class WorkforceHireModal {
  private modal: ModalShellInstance;
  private candidateName = '';
  private quote: HireQuote | null = null;
  private error = '';
  private submitting = false;

  constructor() {
    this.modal = createModalShell({
      id: 'workforce-hire-modal',
      title: 'Chiêu Mộ Nhân Sĩ',
      subtitle: 'Giá ký khế ước do máy chủ quyết định từ danh vọng, đức độ và thiện cảm',
      seal: '聘',
      size: 'lg',
      onOpen: async () => {
        await this.load();
        this.render();
      }
    });
  }

  public async open(candidateName: string): Promise<void> {
    this.candidateName = candidateName;
    this.quote = null;
    this.error = '';
    await this.modal.open();
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private async load(): Promise<void> {
    try {
      this.quote = await workforceHireService.quote(this.candidateName);
      this.error = '';
    } catch (error: any) {
      this.quote = null;
      this.error = error.message || 'Không lấy được báo giá chiêu mộ.';
    }
  }

  private render(): void {
    if (this.error) {
      this.modal.setContent(`
        <div class="journal-modal-content">
          <div class="text-sm text-red-300">${esc(this.error)}</div>
          <button class="ui-btn ui-btn--ghost ui-btn--sm mt-3" data-hire-cancel>Đóng</button>
        </div>
      `);
      this.bind();
      return;
    }
    if (!this.quote) {
      this.modal.setContent('<div class="journal-modal-content"><div class="text-muted text-sm">Đang lấy báo giá...</div></div>');
      return;
    }

    const quote = this.quote;
    const role = ROLE_LABELS[quote.recommendedRole] || quote.recommendedRole;
    const discountPct = Math.round((quote.fameDiscount + quote.virtueDiscount) * 100);
    const refusal = !quote.canHire
      ? `<div class="hire-refusal">
          <div class="hire-refusal-title">${quote.alreadyHired ? 'Đã có chủ' : 'Lời mời bị từ chối'}</div>
          <div class="text-sm">${esc(quote.refusalReasonVi || 'Chưa đủ điều kiện chiêu mộ.')}</div>
          ${quote.retryAfterDate ? `<div class="text-sm mt-1">Có thể thử lại sau ngày <strong>${esc(quote.retryAfterDate)}</strong>.</div>` : ''}
          ${!quote.alreadyHired ? '<div class="text-[11px] text-muted mt-1">Gợi ý: giao tiếp, tặng quà hoặc hoàn thành nhiệm vụ để tăng thiện cảm; danh vọng tăng qua chiến công và uy tín.</div>' : ''}
        </div>`
      : '';

    this.modal.setContent(`
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">聘</div>
          <div class="lead-text">
            <h3>${esc(quote.candidateName)}</h3>
            <div class="text-muted text-sm">${esc(role)} • về ${esc(quote.businessName)}</div>
          </div>
        </div>

        <div class="hire-quote-grid">
          <div class="hire-quote-cell"><span>Danh vọng</span><strong>${quote.fame}/${quote.minFame}</strong></div>
          <div class="hire-quote-cell"><span>Đức độ</span><strong>${quote.virtue}</strong></div>
          <div class="hire-quote-cell"><span>Thiện cảm</span><strong>${quote.affinity}/100</strong></div>
          <div class="hire-quote-cell"><span>Ký quỹ</span><strong>${quote.signingBonus} Quan</strong></div>
        </div>

        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 mt-3">
          <div class="text-xs text-muted mb-1">Báo giá máy chủ</div>
          <div class="text-sm text-slate-200">Ký quỹ gốc ${quote.baseSigningBonus} Quan${discountPct > 0 ? ` • giảm ${discountPct}% nhờ danh vọng/đức độ` : ''}</div>
          <div class="text-sm text-slate-200">Lương tháng ${quote.monthlyWage} Quan • hiệu suất +${Math.round(quote.efficiencyBonus * 100)}%</div>
        </div>

        ${refusal}

        <div class="flex justify-end gap-2 mt-4">
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-hire-cancel>Hủy</button>
          <button class="ui-btn ui-btn--primary ui-btn--sm" data-hire-confirm ${quote.canHire && !this.submitting ? '' : 'disabled'}>
            ${this.submitting ? 'Đang ký...' : `Ký Khế Ước (${quote.signingBonus} Quan)`}
          </button>
        </div>
      </div>
    `);
    this.bind();
  }

  private bind(): void {
    const body = this.modal.getBodyElement();
    if (!body) return;

    body.querySelectorAll<HTMLElement>('[data-hire-cancel]').forEach(button => {
      button.addEventListener('click', () => { void this.close(); });
    });

    body.querySelectorAll<HTMLElement>('[data-hire-confirm]').forEach(button => {
      button.addEventListener('click', async () => {
        if (this.submitting) return;
        this.submitting = true;
        this.render();
        try {
          const result = await workforceHireService.hire(this.candidateName);
          toast(`Đã chiêu mộ ${result?.nameVi || this.candidateName} vào ${result?.businessName || 'sản nghiệp'}.`);
          await this.close();
          if (typeof (window as any).refreshWorldMapLive === 'function') {
            (window as any).refreshWorldMapLive();
          }
        } catch (error: any) {
          this.submitting = false;
          this.error = error.message || 'Chiêu mộ thất bại.';
          await this.load();
          this.render();
          toast(this.error, true);
        }
      });
    });
  }
}

export const workforceHireModal = new WorkforceHireModal();
