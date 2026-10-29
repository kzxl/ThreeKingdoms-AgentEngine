/**
 * ThreeKingdoms-AgentEngine: Standardized Modal Shell Types
 * (src/client/core/modal-shell/modal-shell.types.ts)
 *
 * Defines the unified contract and lifecycle for all game modals,
 * adhering to AgentOption Universe Architecture v4.0 & Anti-AI-Slop standards.
 */

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalTabConfig {
  id: string;
  label: string;
  seal?: string;
  badge?: string | number;
  disabled?: boolean;
}

export interface ModalActionConfig {
  id: string;
  label: string;
  variant?: 'primary' | 'ghost' | 'danger' | 'gold';
  onClick: (modal: ModalShellInstance) => void | Promise<void>;
  disabled?: boolean;
}

export interface ModalShellOptions {
  /** Unique element ID for modal DOM identification */
  id: string;
  /** Primary title of the modal */
  title: string;
  /** Subtitle or historical context narrative */
  subtitle?: string;
  /** Koei ROTK authentic Hanzi seal or thematic symbol */
  seal?: string;
  /** Modal width preset (sm: 440px, md: 640px, lg: 900px, xl: 1100px, full: 96vw) */
  size?: ModalSize;
  /** Extra CSS class appended to modal-backdrop */
  customClass?: string;
  /** Extra CSS class appended to modal-dialog */
  dialogClass?: string;
  /** Optional tab definitions */
  tabs?: ModalTabConfig[];
  /** Default active tab ID */
  activeTabId?: string;
  /** Whether pressing Esc closes this modal (default: true) */
  closeOnEsc?: boolean;
  /** Whether clicking the backdrop closes this modal (default: true) */
  closeOnBackdrop?: boolean;
  /** Optional footer action buttons */
  actions?: ModalActionConfig[];
  /** Lifecycle hook triggered after modal opens */
  onOpen?: (modal: ModalShellInstance) => void | Promise<void>;
  /** Lifecycle hook triggered after modal closes */
  onClose?: (modal: ModalShellInstance) => void | Promise<void>;
  /** Lifecycle hook triggered on tab switch */
  onTabChange?: (tabId: string, modal: ModalShellInstance) => void | Promise<void>;
  /** Lifecycle hook triggered when modal is destroyed */
  onDestroy?: (modal: ModalShellInstance) => void;
}

export interface ModalShellInstance {
  readonly id: string;
  readonly isOpen: boolean;
  readonly activeTab: string | null;

  /** Opens the modal, optionally specifying active tab */
  open(initialTab?: string): Promise<void>;
  /** Closes the modal and triggers onClose hook */
  close(): Promise<void>;
  /** Toggles modal open/close state */
  toggle(): Promise<void>;

  /** Sets the dynamic body content via HTML string or HTMLElement */
  setContent(content: string | HTMLElement): void;
  /** Dynamically updates header titles */
  setTitle(title: string, subtitle?: string, seal?: string): void;
  /** Switches active tab and triggers onTabChange hook */
  switchTab(tabId: string): Promise<void>;
  /** Updates tab badge count or label dynamically */
  updateTabBadge(tabId: string, badge?: string | number): void;
  /** Dynamically sets footer actions */
  setFooter(content: string | HTMLElement | ModalActionConfig[]): void;

  /** Returns direct reference to scrollable modal-body element */
  getBodyElement(): HTMLElement | null;
  /** Returns direct reference to modal-dialog element */
  getDialogElement(): HTMLElement | null;
  /** Destroys the modal DOM and clears all listeners */
  destroy(): void;
}
