/**
 * ThreeKingdoms-AgentEngine: Standardized Modal Shell Implementation
 * (src/client/core/modal-shell/modal-shell.ts)
 *
 * Provides a production-grade, reusable modal container with unified header,
 * tab bar, scrollable body, and footer action bar.
 */

import {
  ModalActionConfig,
  ModalShellInstance,
  ModalShellOptions,
  ModalSize,
  ModalTabConfig
} from './modal-shell.types';
import { modalStack } from './modal-stack';

/**
 * Modal ids that are still owned by a legacy IIFE in `public/js/*`.
 *
 * Two renderers must never share one id: the shell replaces the whole
 * `innerHTML` of the element, deleting the legacy mount points, and the legacy
 * renderer then finds its body id missing and renders nothing. Until those
 * surfaces are migrated, the shell must not mount them.
 */
export const LEGACY_OWNED_MODAL_IDS: ReadonlySet<string> = new Set([
  'spatial-tavern-modal',
  'spatial-arena-modal',
  'spatial-residence-modal',
  'grand-command-hub-modal',
  'personal-journal-modal',
  'caravan-modal'
]);

export function isLegacyOwnedModalId(id: string): boolean {
  return LEGACY_OWNED_MODAL_IDS.has(id);
}

export class ModalShell implements ModalShellInstance {
  public readonly id: string;
  private options: ModalShellOptions;
  private backdropEl: HTMLElement | null = null;
  private dialogEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private subtitleEl: HTMLElement | null = null;
  private sealEl: HTMLElement | null = null;
  private tabBarEl: HTMLElement | null = null;
  private bodyEl: HTMLElement | null = null;
  private footerEl: HTMLElement | null = null;

  private _isOpen = false;
  private _activeTab: string | null = null;

  constructor(options: ModalShellOptions) {
    this.id = options.id;
    this.options = {
      closeOnEsc: true,
      closeOnBackdrop: true,
      size: 'lg',
      ...options
    };
    this._activeTab = options.activeTabId || (options.tabs && options.tabs.length > 0 ? options.tabs[0].id : null);
    this.mountDom();
  }

  public get isOpen(): boolean {
    return this._isOpen;
  }

  public get activeTab(): string | null {
    return this._activeTab;
  }

  /**
   * Mounts or reuses modal DOM elements in the document.
   */
  private mountDom(): void {
    if (typeof document === 'undefined') return;

    if (isLegacyOwnedModalId(this.id)) {
      // The legacy module owns this id. Mounting would delete its body id and
      // leave the dialog empty; skip instead of clobbering another renderer.
      if (typeof console !== 'undefined') {
        console.warn(`[ModalShell] "${this.id}" is owned by a legacy renderer; shell not mounted.`);
      }
      return;
    }

    let existing = document.getElementById(this.id);
    if (!existing) {
      existing = document.createElement('div');
      existing.id = this.id;
      document.body.appendChild(existing);
    }

    this.backdropEl = existing;
    this.backdropEl.className = `modal-backdrop hidden ${this.options.customClass || ''}`.trim();

    // Map sizing classes
    const sizeMap: Record<ModalSize, string> = {
      sm: 'modal-sm',
      md: 'modal-md',
      lg: 'modal-lg spatial-poi-dialog',
      xl: 'modal-box--large spatial-poi-dialog',
      full: 'modal-full spatial-poi-dialog'
    };
    const sizeClass = sizeMap[this.options.size || 'lg'] || 'modal-lg';

    this.backdropEl.innerHTML = `
      <div class="modal-dialog ${sizeClass} ${this.options.dialogClass || ''}" role="dialog" aria-modal="true" aria-labelledby="${this.id}-title">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-title-seal" id="${this.id}-seal">${this.options.seal || '◈'}</span>
            <div>
              <h2 class="modal-title-text" id="${this.id}-title">${this.options.title}</h2>
              <div class="modal-subtitle" id="${this.id}-subtitle">${this.options.subtitle || ''}</div>
            </div>
          </div>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" id="${this.id}-btn-close" title="Đóng [Esc]" aria-label="Close">×</button>
        </div>
        ${this.options.tabs && this.options.tabs.length > 0 ? `<div class="modal-tab-bar" id="${this.id}-tab-bar"></div>` : ''}
        <div class="modal-body" id="${this.id}-body"></div>
        <div class="modal-footer hidden" id="${this.id}-footer"></div>
      </div>
    `;

    this.dialogEl = this.backdropEl.querySelector('.modal-dialog');
    this.titleEl = this.backdropEl.querySelector(`#${this.id}-title`);
    this.subtitleEl = this.backdropEl.querySelector(`#${this.id}-subtitle`);
    this.sealEl = this.backdropEl.querySelector(`#${this.id}-seal`);
    this.tabBarEl = this.backdropEl.querySelector(`#${this.id}-tab-bar`);
    this.bodyEl = this.backdropEl.querySelector(`#${this.id}-body`);
    this.footerEl = this.backdropEl.querySelector(`#${this.id}-footer`);

    // Attach close button
    const closeBtn = this.backdropEl.querySelector(`#${this.id}-btn-close`);
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
      });
    }

    // Attach backdrop click
    if (this.options.closeOnBackdrop) {
      this.backdropEl.addEventListener('click', (e) => {
        if (e.target === this.backdropEl) {
          this.close();
        }
      });
    }

    // Render initial tabs if configured
    if (this.options.tabs && this.options.tabs.length > 0) {
      this.renderTabs(this.options.tabs);
    }

    // Render initial actions if configured
    if (this.options.actions && this.options.actions.length > 0) {
      this.setFooter(this.options.actions);
    }
  }

  /**
   * Renders the tab buttons into the modal-tab-bar container.
   */
  private renderTabs(tabs: ModalTabConfig[]): void {
    if (!this.tabBarEl) return;
    this.tabBarEl.innerHTML = tabs
      .map(
        (t) => `
        <button class="modal-tab-btn ${t.id === this._activeTab ? 'active' : ''} ${t.disabled ? 'disabled' : ''}" 
                data-tab-id="${t.id}" 
                ${t.disabled ? 'disabled' : ''}>
          ${t.seal ? `<span class="tab-seal">${t.seal}</span>` : ''}
          <span class="tab-label">${t.label}</span>
          ${t.badge !== undefined ? `<span class="tab-badge">${t.badge}</span>` : ''}
        </button>
      `
      )
      .join('');

    this.tabBarEl.querySelectorAll('.modal-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = (btn as HTMLElement).getAttribute('data-tab-id');
        if (tabId && tabId !== this._activeTab) {
          this.switchTab(tabId);
        }
      });
    });
  }

  public async open(initialTab?: string): Promise<void> {
    if (!this.backdropEl) {
      this.mountDom();
    }
    if (!this.backdropEl) return;

    if (initialTab && initialTab !== this._activeTab) {
      this._activeTab = initialTab;
      this.updateActiveTabButton();
    }

    this.backdropEl.classList.remove('hidden');
    this._isOpen = true;
    modalStack.push(this, this.backdropEl);

    if (this.options.onOpen) {
      await this.options.onOpen(this);
    }
  }

  public async close(): Promise<void> {
    if (!this._isOpen || !this.backdropEl) return;

    this.backdropEl.classList.add('hidden');
    this._isOpen = false;
    modalStack.remove(this);

    if (this.options.onClose) {
      await this.options.onClose(this);
    }
  }

  public async toggle(): Promise<void> {
    if (this._isOpen) {
      await this.close();
    } else {
      await this.open();
    }
  }

  public setContent(content: string | HTMLElement): void {
    if (!this.bodyEl) return;
    if (typeof content === 'string') {
      this.bodyEl.innerHTML = content;
    } else {
      this.bodyEl.innerHTML = '';
      this.bodyEl.appendChild(content);
    }
  }

  public setTitle(title: string, subtitle?: string, seal?: string): void {
    if (this.titleEl) this.titleEl.textContent = title;
    if (subtitle !== undefined && this.subtitleEl) this.subtitleEl.textContent = subtitle;
    if (seal !== undefined && this.sealEl) this.sealEl.textContent = seal;
  }

  public async switchTab(tabId: string): Promise<void> {
    this._activeTab = tabId;
    this.updateActiveTabButton();
    if (this.options.onTabChange) {
      await this.options.onTabChange(tabId, this);
    }
  }

  private updateActiveTabButton(): void {
    if (!this.tabBarEl) return;
    this.tabBarEl.querySelectorAll('.modal-tab-btn').forEach((btn) => {
      const id = (btn as HTMLElement).getAttribute('data-tab-id');
      btn.classList.toggle('active', id === this._activeTab);
    });
  }

  public updateTabBadge(tabId: string, badge?: string | number): void {
    if (!this.tabBarEl) return;
    const btn = this.tabBarEl.querySelector(`[data-tab-id="${tabId}"]`);
    if (!btn) return;
    let badgeEl = btn.querySelector('.tab-badge');
    if (badge === undefined || badge === null || badge === '') {
      if (badgeEl) badgeEl.remove();
    } else {
      if (!badgeEl) {
        badgeEl = document.createElement('span');
        badgeEl.className = 'tab-badge';
        btn.appendChild(badgeEl);
      }
      badgeEl.textContent = String(badge);
    }
  }

  public setFooter(content: string | HTMLElement | ModalActionConfig[]): void {
    if (!this.footerEl) return;

    if (Array.isArray(content)) {
      this.footerEl.innerHTML = '';
      this.footerEl.className = 'modal-footer flex items-center justify-end gap-3';
      for (const action of content) {
        const btn = document.createElement('button');
        const variantClass =
          action.variant === 'ghost'
            ? 'ui-btn--ghost'
            : action.variant === 'danger'
              ? 'ui-btn--danger'
              : action.variant === 'gold'
                ? 'ui-btn--accent'
                : 'ui-btn--primary';
        btn.className = `ui-btn ${variantClass}`;
        btn.textContent = action.label;
        if (action.disabled) btn.disabled = true;
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          await action.onClick(this);
        });
        this.footerEl.appendChild(btn);
      }
      this.footerEl.classList.remove('hidden');
    } else if (typeof content === 'string') {
      this.footerEl.innerHTML = content;
      this.footerEl.classList.remove('hidden');
    } else {
      this.footerEl.innerHTML = '';
      this.footerEl.appendChild(content);
      this.footerEl.classList.remove('hidden');
    }
  }

  public getBodyElement(): HTMLElement | null {
    return this.bodyEl;
  }

  public getDialogElement(): HTMLElement | null {
    return this.dialogEl;
  }

  public destroy(): void {
    if (this._isOpen) {
      this.close();
    }
    if (this.options.onDestroy) {
      this.options.onDestroy(this);
    }
    if (this.backdropEl && this.backdropEl.parentNode) {
      this.backdropEl.parentNode.removeChild(this.backdropEl);
    }
    this.backdropEl = null;
    this.dialogEl = null;
    this.bodyEl = null;
    this.tabBarEl = null;
    this.footerEl = null;
  }
}

/**
 * Convenience factory function to create a ModalShell instance.
 */
export function createModalShell(options: ModalShellOptions): ModalShellInstance {
  return new ModalShell(options);
}
