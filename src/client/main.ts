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
export * from './features/equipment-forge';
export * from './features/enterprise-workshop';
export * from './features/caravan-logistics';
export * from './features/dossiers';
export * from './features/trade-quick';
export * from './features/tactical-battle';
export * from './features/title-screen';
export * from './features/transit-turn';
export * from './features/world-map';

// Auto-initialize legacy bridge upon module execution in browser
setupLegacyBridge();
