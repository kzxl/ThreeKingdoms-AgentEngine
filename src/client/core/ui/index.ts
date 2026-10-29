/**
 * ThreeKingdoms-AgentEngine: Shared UI Primitives
 * (src/client/core/ui/index.ts)
 *
 * Single import surface for common components. Legacy scripts reach the same
 * contract through `window.UI` (set by the legacy bridge), so both layers render
 * the same button, badge and modal chrome.
 */

export * from './button';
export * from './badge';
export * from './feedback';

import { buttonHTML, createButton } from './button';
import { badgeHTML, createBadge } from './badge';
import { confirmDialog, toast } from './feedback';

export const UI = {
  version: '1.0.0',
  button: { html: buttonHTML, create: createButton },
  badge: { html: badgeHTML, create: createBadge },
  toast,
  confirm: confirmDialog
};
