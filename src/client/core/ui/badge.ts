/**
 * ThreeKingdoms-AgentEngine: Shared Badge Primitive
 * (src/client/core/ui/badge.ts)
 *
 * Status chips (live/offline, audit pass/fail, risk tiers) previously used a
 * different class per screen. `.ui-badge` centralises the shape; tones carry the
 * meaning.
 */

export type BadgeTone = 'success' | 'warn' | 'danger' | 'info' | 'neutral';

export interface BadgeOptions {
  label: string;
  tone?: BadgeTone;
  title?: string;
  className?: string;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function badgeHTML(options: BadgeOptions): string {
  const tone = options.tone || 'neutral';
  const classes = ['ui-badge', `ui-badge--${tone}`, options.className || ''].filter(Boolean).join(' ');
  const title = options.title ? ` title="${escapeHtml(options.title)}"` : '';
  return `<span class="${escapeHtml(classes)}"${title}>${escapeHtml(options.label)}</span>`;
}

export function createBadge(options: BadgeOptions): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = ['ui-badge', `ui-badge--${options.tone || 'neutral'}`, options.className || '']
    .filter(Boolean)
    .join(' ');
  if (options.title) el.title = options.title;
  el.textContent = options.label;
  return el;
}
