/**
 * ThreeKingdoms-AgentEngine: Shared Feedback Primitives
 * (src/client/core/ui/feedback.ts)
 *
 * Toast and confirmation flows shared by TS slices and legacy scripts. The
 * confirm dialog is built on the standard modal shell, so its chrome matches
 * every other modal instead of using window.confirm.
 */

import { createModalShell } from '../modal-shell';
import { buttonHTML } from './button';

export type ToastTone = 'info' | 'success' | 'warn' | 'danger';

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Shows a toast. Delegates to the legacy `showToast` when present so existing
 * screens keep their styling, otherwise uses the shared `#toast` element.
 */
export function toast(message: string, tone: ToastTone = 'info'): void {
  const w = window as any;
  if (typeof w.showToast === 'function') {
    try {
      w.showToast(message, tone === 'danger');
      return;
    } catch {
      // fall through to the local implementation
    }
  }

  const el = document.getElementById('toast');
  if (!el) {
    console.log(`[toast:${tone}] ${message}`);
    return;
  }
  el.textContent = message;
  el.dataset.tone = tone;
  el.classList.remove('hidden');
  window.setTimeout(() => el.classList.add('hidden'), 2800);
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

let confirmSequence = 0;

/** Promise-based confirmation modal using the shared modal shell. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const modal = createModalShell({
      id: `ui-confirm-${++confirmSequence}`,
      title: options.title || 'Xác nhận',
      seal: '問',
      size: 'sm',
      onClose: () => {
        finish(false);
        window.setTimeout(() => modal.destroy(), 0);
      }
    });

    modal.setContent(
      `<div class="ui-confirm">
         <div class="ui-confirm__message">${escapeHtml(options.message)}</div>
         <div class="ui-toolbar ui-confirm__actions">
           ${buttonHTML({ label: options.cancelLabel || 'Hủy', variant: 'ghost', size: 'sm' })}
           ${buttonHTML({
             label: options.confirmLabel || 'Xác nhận',
             variant: options.danger ? 'danger' : 'primary',
             size: 'sm'
           })}
         </div>
       </div>`
    );

    const actions = modal.getBodyElement()?.querySelectorAll('.ui-confirm__actions .ui-btn');
    if (actions && actions.length === 2) {
      actions[0].addEventListener('click', () => void modal.close());
      actions[1].addEventListener('click', () => {
        finish(true);
        void modal.close();
      });
    }

    void modal.open();
  });
}
