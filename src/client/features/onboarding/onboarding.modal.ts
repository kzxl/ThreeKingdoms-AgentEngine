/**
 * First-run onboarding card: day loop, action cost, local market and save/load.
 * Rendered through ModalShell; the legacy header button opens the same instance.
 */

import { createModalShell, ModalShellInstance } from '../../core/modal-shell';

const STORAGE_KEY = 'sim_onboarding_v1_done';

interface OnboardingStep {
  seal: string;
  titleVi: string;
  titleEn: string;
  bodyVi: string;
  bodyEn: string;
}

const STEPS: OnboardingStep[] = [
  {
    seal: '日',
    titleVi: 'Vòng ngày và tháng',
    titleEn: 'Day and month loop',
    bodyVi: 'Mỗi hành động tiêu hao ngày. Khi sang mùng 1, tháng cũ tự chốt: lương, thuế, hao hụt và hồi phục vết thương.',
    bodyEn: 'Every action spends days. On the first of the month the previous month closes: wages, rent, spoilage and injury recovery.'
  },
  {
    seal: '時',
    titleVi: 'Chi phí hành động',
    titleEn: 'Action cost',
    bodyVi: 'Chip thời gian cạnh nút xác nhận cho biết hành động tốn bao nhiêu ngày và thể lực trước khi bạn cam kết.',
    bodyEn: 'The time chip beside a confirm button shows the days and stamina an action costs before you commit.'
  },
  {
    seal: '市',
    titleVi: 'Chợ địa phương',
    titleEn: 'Local market',
    bodyVi: 'Giá mua bán theo cung cầu từng thành. Muốn lời, hãy chở hàng tới nơi khan hiếm hoặc mở thương lộ tự động.',
    bodyEn: 'Prices follow local supply and demand. Profit comes from moving goods to scarce markets or running automated trade routes.'
  },
  {
    seal: '存',
    titleVi: 'Lưu và tải',
    titleEn: 'Save and load',
    bodyVi: 'Mở menu hệ thống để lưu phiên chơi. Dữ liệu nằm trong SQLite; mỗi phiên chơi là một tệp riêng.',
    bodyEn: 'Open the system menu to save. Data lives in SQLite, and each campaign is its own file.'
  }
];

export class OnboardingModal {
  private modal: ModalShellInstance;

  constructor() {
    this.modal = createModalShell({
      id: 'onboarding-modal',
      title: 'Hướng Dẫn Nhập Môn',
      subtitle: 'Ba mươi ngày đầu của một thương nhân',
      seal: '導',
      size: 'lg',
      onOpen: () => this.render(),
      onClose: () => this.markDone()
    });
  }

  public async open(force = false): Promise<void> {
    if (!force && this.isDone()) return;
    await this.modal.open();
  }

  public async close(): Promise<void> {
    await this.modal.close();
  }

  private isEnglish(): boolean {
    return (window as any).currentLang === 'en';
  }

  private isDone(): boolean {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private markDone(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Private mode: nothing to persist.
    }
  }

  private render(): void {
    const isEn = this.isEnglish();
    this.modal.setContent(`
      <div class="onboarding-grid">
        ${STEPS.map(step => `
          <div class="onboarding-step">
            <span class="onboarding-seal">${step.seal}</span>
            <div>
              <div class="onboarding-step-title">${isEn ? step.titleEn : step.titleVi}</div>
              <div class="onboarding-step-body">${isEn ? step.bodyEn : step.bodyVi}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="onboarding-foot">
        <span class="onboarding-hint">${isEn ? 'Press ? in the header to reopen this guide.' : 'Bấm nút ? trên thanh công cụ để mở lại hướng dẫn.'}</span>
        <button class="ui-btn ui-btn--primary" data-onboarding-done>${isEn ? 'Begin' : 'Bắt đầu'}</button>
      </div>
    `);

    const body = this.modal.getBodyElement();
    body?.querySelectorAll<HTMLElement>('[data-onboarding-done]').forEach(button => {
      button.addEventListener('click', () => { void this.close(); });
    });
  }
}

export const onboardingModal = new OnboardingModal();

if (typeof window !== 'undefined') {
  window.setTimeout(() => { void onboardingModal.open(false); }, 900);
}
