/**
 * ThreeKingdoms-AgentEngine: Quest Log Modal
 * (src/client/features/quests/quest.modal.ts)
 *
 * Reads /api/quests (master_quests + player_quests). No quest text is
 * hardcoded in the UI.
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';

interface QuestStepView {
  index: number;
  titleVi: string;
  titleEn: string;
  stat: string;
  dc: number;
  daysCost: number;
}

interface QuestView {
  questId: string;
  titleVi: string;
  titleEn: string;
  pathCode: string;
  descriptionVi: string;
  descriptionEn: string;
  status: 'AVAILABLE' | 'ACTIVE' | 'COMPLETED';
  currentStep: number;
  attempts: number;
  steps: QuestStepView[];
}

interface ObligationView {
  obligationId: string;
  type: string;
  counterparty: string;
  amountCash: number;
  amountGrain: number;
  dueDate: string;
  status: 'DUE' | 'PAID' | 'OVERDUE' | 'WAIVED';
  daysRemaining: number;
  narrativeVi: string;
  narrativeEn: string;
  penalty?: Record<string, unknown>;
}

interface ObligationSummary {
  dueCount: number;
  overdueCount: number;
  totalCashDue: number;
  totalGrainDue: number;
  nextDueDate: string | null;
}

function isEn(): boolean {
  return (window as any).currentLang === 'en';
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rewardText(rewards: any): string {
  if (!rewards || typeof rewards !== 'object') return '';
  const parts: string[] = [];
  if (rewards.cash) parts.push(`+${rewards.cash} Quan`);
  if (rewards.fame) parts.push(`+${rewards.fame} ${isEn() ? 'fame' : 'danh vọng'}`);
  if (rewards.exp) {
    for (const [stat, amount] of Object.entries(rewards.exp)) {
      if (amount) parts.push(`+${amount} ${String(stat).toUpperCase()} EXP`);
    }
  }
  if (Array.isArray(rewards.items)) {
    for (const item of rewards.items) parts.push(`${item.quantity}× ${item.code}`);
  }
  return parts.join(' • ');
}

class QuestModal {
  private modal: ModalShellInstance;

  constructor() {
    this.modal = createModalShell({
      id: 'quest-modal',
      title: 'Nhật Ký Nhiệm Vụ',
      subtitle: 'Nhiệm vụ theo từng phẩm lộ, dữ liệu lấy từ DB',
      seal: '任',
      size: 'md'
    });
  }

  public async open(): Promise<void> {
    await this.modal.open();
    await this.refresh(null);
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private async load(): Promise<QuestView[]> {
    const res = await fetch('/api/quests');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Quest log failed');
    return data.quests || [];
  }

  private async loadObligations(): Promise<{ obligations: ObligationView[]; summary: ObligationSummary }> {
    const res = await fetch('/api/obligations');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Obligation log failed');
    return {
      obligations: data.obligations || [],
      summary: data.summary || { dueCount: 0, overdueCount: 0, totalCashDue: 0, totalGrainDue: 0, nextDueDate: null }
    };
  }

  public async refresh(result: any): Promise<void> {
    try {
      const [quests, dues] = await Promise.all([this.load(), this.loadObligations().catch(() => ({
        obligations: [] as ObligationView[],
        summary: { dueCount: 0, overdueCount: 0, totalCashDue: 0, totalGrainDue: 0, nextDueDate: null }
      }))]);
      this.modal.setContent(this.render(quests, dues.obligations, dues.summary, result));
    } catch (error: any) {
      this.modal.setContent(`<div class="quest-empty">${esc(error.message)}</div>`);
    }
  }

  public async accept(questId: string): Promise<void> {
    try {
      const res = await fetch('/api/quests/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Accept failed');
      await this.refresh(null);
    } catch (error: any) {
      (window as any).showToast?.(error.message, true);
    }
  }

  public async advance(questId: string): Promise<void> {
    try {
      const res = await fetch('/api/quests/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Advance failed');
      await this.refresh(data.result);
      (window as any).loadStatus?.();
    } catch (error: any) {
      (window as any).showToast?.(error.message, true);
    }
  }

  public async payObligation(obligationId: string): Promise<void> {
    try {
      const res = await fetch('/api/obligations/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obligationId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Payment failed');
      await this.refresh(null);
      (window as any).loadStatus?.();
    } catch (error: any) {
      (window as any).showToast?.(error.message, true);
    }
  }

  private renderObligations(
    obligations: ObligationView[],
    summary: ObligationSummary,
    en: boolean
  ): string {
    const active = obligations.filter(row => row.status === 'DUE' || row.status === 'OVERDUE');
    if (active.length === 0) {
      return `<div class="quest-empty">${en ? 'No obligations due.' : 'Không có nghĩa vụ đến hạn.'}</div>`;
    }
    const header = en
      ? `Obligations • ${summary.totalCashDue} quan due${summary.overdueCount ? ` • ${summary.overdueCount} overdue` : ''}`
      : `Nghĩa vụ • ${summary.totalCashDue} Quan đến hạn${summary.overdueCount ? ` • ${summary.overdueCount} quá hạn` : ''}`;
    const items = active.map(row => {
      const overdue = row.status === 'OVERDUE';
      const statusLabel = overdue
        ? (en ? 'Overdue' : 'Quá hạn')
        : (en ? 'Due' : 'Đến hạn');
      const timing = overdue
        ? (en ? `${Math.abs(row.daysRemaining)} days late` : `Trễ ${Math.abs(row.daysRemaining)} ngày`)
        : (en ? `${row.daysRemaining} days left` : `Còn ${row.daysRemaining} ngày`);
      const amount = row.amountGrain > 0
        ? `${row.amountCash} Quan + ${row.amountGrain} ${en ? 'piculs' : 'Thạch'}`
        : `${row.amountCash} Quan`;
      return `
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${esc((en ? row.narrativeEn : row.narrativeVi) || row.type)}</div>
              <div class="quest-path">${esc(row.type)} • ${esc(row.dueDate)} • ${esc(timing)}</div>
            </div>
            <button class="quest-action ${overdue ? 'is-primary' : ''}" onclick="QuestUI.payObligation('${esc(row.obligationId)}')">${en ? 'Pay' : 'Nộp'}</button>
          </div>
          <div class="quest-meta">${esc(amount)}</div>
          <div class="quest-path"><span class="quest-badge">${statusLabel}</span></div>
        </div>
      `;
    }).join('');
    return `
      <div class="quest-section">
        <div class="quest-section-title">${esc(header)}</div>
        ${items}
      </div>
    `;
  }

  private render(quests: QuestView[], obligations: ObligationView[], summary: ObligationSummary, result: any): string {
    const en = isEn();
    const resultHtml = result ? `
      <div class="quest-result ${result.success ? 'is-success' : 'is-failure'}">
        <strong>${result.success ? (en ? 'Step succeeded' : 'Bước thành công') : (en ? 'Step failed' : 'Bước thất bại')}</strong>
        <div>${esc(en ? result.narrativeEn : result.narrative)}</div>
        <div class="quest-meta">D20 ${result.roll} + ${result.mod} = ${result.total} / DC ${result.dc}</div>
        <div class="quest-meta">${esc(rewardText(result.rewards || {}))}</div>
      </div>
    ` : '';

    const items = quests.map(quest => {
      const statusLabel = quest.status === 'COMPLETED'
        ? (en ? 'Completed' : 'Đã hoàn thành')
        : quest.status === 'ACTIVE'
          ? (en ? 'Active' : 'Đang làm')
          : (en ? 'Available' : 'Có thể nhận');
      const steps = quest.steps.map(step => `
        <div class="quest-step ${step.index < quest.currentStep ? 'is-done' : step.index === quest.currentStep && quest.status === 'ACTIVE' ? 'is-current' : ''}">
          <span class="quest-step-index">${step.index + 1}</span>
          <span class="quest-step-title">${esc(en ? step.titleEn : step.titleVi)}</span>
          <span class="quest-step-check">${esc(String(step.stat).toUpperCase())} DC ${step.dc} • ${step.daysCost}${en ? 'd' : ' ngày'}</span>
        </div>
      `).join('');
      const action = quest.status === 'AVAILABLE'
        ? `<button class="quest-action" onclick="QuestUI.accept('${esc(quest.questId)}')">${en ? 'Accept' : 'Nhận nhiệm vụ'}</button>`
        : quest.status === 'ACTIVE'
          ? `<button class="quest-action is-primary" onclick="QuestUI.advance('${esc(quest.questId)}')">${en ? `Advance step ${quest.currentStep + 1}` : `Thực hiện bước ${quest.currentStep + 1}`}</button>`
          : `<span class="quest-badge">${en ? 'Completed' : 'Hoàn thành'}</span>`;
      return `
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${esc(en ? quest.titleEn : quest.titleVi)}</div>
              <div class="quest-path">${esc(quest.pathCode)} • ${statusLabel}</div>
            </div>
            ${action}
          </div>
          <div class="quest-desc">${esc(en ? quest.descriptionEn : quest.descriptionVi)}</div>
          <div class="quest-steps">${steps}</div>
        </div>
      `;
    }).join('');

    const obligationsHtml = this.renderObligations(obligations, summary, en);
    return `<div class="quest-body">${resultHtml}${obligationsHtml}${items || `<div class="quest-empty">${en ? 'No quests available.' : 'Chưa có nhiệm vụ.'}</div>`}</div>`;
  }
}

export const questModal = new QuestModal();
