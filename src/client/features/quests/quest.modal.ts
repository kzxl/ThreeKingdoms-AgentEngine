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

  public async refresh(result: any): Promise<void> {
    try {
      const quests = await this.load();
      this.modal.setContent(this.render(quests, result));
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

  private render(quests: QuestView[], result: any): string {
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

    return `<div class="quest-body">${resultHtml}${items || `<div class="quest-empty">${en ? 'No quests available.' : 'Chưa có nhiệm vụ.'}</div>`}</div>`;
  }
}

export const questModal = new QuestModal();
