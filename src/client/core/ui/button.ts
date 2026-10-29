/**
 * ThreeKingdoms-AgentEngine: Shared Button Primitive
 * (src/client/core/ui/button.ts)
 *
 * One button contract for every surface (legacy scripts and TS slices). It maps
 * to the `.ui-btn` styles in public/styles.css, which use the existing design
 * tokens, so variants stay consistent instead of growing per-screen classes.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonOptions {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  title?: string;
  disabled?: boolean;
  /** Inline handler name, e.g. "TitleScreenUI.open()". Prefer createButton + addEventListener. */
  onClick?: string;
  className?: string;
  id?: string;
  type?: 'button' | 'submit';
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buttonClass(options: ButtonOptions = {} as ButtonOptions): string {
  const variant = options.variant || 'secondary';
  const classes = ['ui-btn', `ui-btn--${variant}`];
  if (options.size === 'sm') classes.push('ui-btn--sm');
  if (options.size === 'lg') classes.push('ui-btn--lg');
  if (options.className) classes.push(options.className);
  return classes.join(' ');
}

export function buttonHTML(options: ButtonOptions): string {
  const label = escapeHtml(options.label);
  const icon = options.icon ? `<span class="ui-btn__icon" aria-hidden="true">${escapeHtml(options.icon)}</span>` : '';
  const attrs = [
    `class="${escapeHtml(buttonClass(options))}"`,
    options.id ? `id="${escapeHtml(options.id)}"` : '',
    options.title ? `title="${escapeHtml(options.title)}"` : '',
    options.disabled ? 'disabled' : '',
    `type="${options.type || 'button'}"`,
    options.onClick ? `onclick="${escapeHtml(options.onClick)}"` : ''
  ]
    .filter(Boolean)
    .join(' ');
  return `<button ${attrs}>${icon}<span class="ui-btn__label">${label}</span></button>`;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = buttonClass(options);
  button.type = options.type || 'button';
  if (options.id) button.id = options.id;
  if (options.title) button.title = options.title;
  button.disabled = Boolean(options.disabled);
  button.innerHTML = `${options.icon ? `<span class="ui-btn__icon" aria-hidden="true">${escapeHtml(options.icon)}</span>` : ''}<span class="ui-btn__label">${escapeHtml(options.label)}</span>`;
  return button;
}
