/**
 * ThreeKingdoms-AgentEngine: Global Modal Stack Manager
 * (src/client/core/modal-shell/modal-stack.ts)
 *
 * Provides centralized z-index ordering, Esc key routing, and scroll locking
 * across all modularized UI dialogs.
 */

import { ModalShellInstance } from './modal-shell.types';

class ModalStackManager {
  private stack: ModalShellInstance[] = [];
  private isEscListenerAttached = false;
  private readonly BASE_Z_INDEX = 1000;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Pushes a newly opened modal onto the stack and manages focus/z-index.
   */
  public push(modal: ModalShellInstance, backdropEl: HTMLElement): void {
    const index = this.stack.indexOf(modal);
    if (index > -1) {
      this.stack.splice(index, 1);
    }
    this.stack.push(modal);

    // Calculate layered z-index
    const zIndex = this.BASE_Z_INDEX + this.stack.length * 10;
    backdropEl.style.zIndex = zIndex.toString();

    this.ensureEscListener();
    this.updateBodyScrollLock();
  }

  /**
   * Removes a closed modal from the stack.
   */
  public remove(modal: ModalShellInstance): void {
    const index = this.stack.indexOf(modal);
    if (index > -1) {
      this.stack.splice(index, 1);
    }
    this.updateBodyScrollLock();
  }

  /**
   * Returns the topmost active modal on the stack.
   */
  public getTop(): ModalShellInstance | null {
    if (this.stack.length === 0) return null;
    return this.stack[this.stack.length - 1];
  }

  /**
   * Closes the topmost modal on Esc keypress.
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' || e.keyCode === 27) {
      const top = this.getTop();
      if (top) {
        e.preventDefault();
        e.stopPropagation();
        top.close();
      }
    }
  }

  private ensureEscListener(): void {
    if (typeof window === 'undefined') return;
    if (!this.isEscListenerAttached) {
      window.addEventListener('keydown', this.handleKeyDown, true);
      this.isEscListenerAttached = true;
    }
  }

  private updateBodyScrollLock(): void {
    if (typeof document === 'undefined') return;
    if (this.stack.length > 0) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }
}

export const modalStack = new ModalStackManager();
