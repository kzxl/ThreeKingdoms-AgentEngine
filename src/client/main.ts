/**
 * ThreeKingdoms-AgentEngine: Modern Client Entry Point
 * (src/client/main.ts)
 *
 * Consolidates the modularized client architecture:
 * - Core: Standardized Modal Shell & Stack Manager
 * - Feature Slices: Lineage & Family, Spatial POIs
 * - Legacy Compatibility Bridge: Seamless interoperability with index.html
 */

import { setupLegacyBridge } from './features/legacy-bridge';

export * from './core/modal-shell';
export * from './core/api/client-api';
export * from './core/events/event-bus';
export * from './features/lineage-family';
export * from './features/spatial-poi';

// Auto-initialize legacy bridge upon module execution in browser
setupLegacyBridge();
