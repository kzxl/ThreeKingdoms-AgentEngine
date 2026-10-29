/**
 * ThreeKingdoms-AgentEngine: Legacy Compatibility Bridge
 * (src/client/features/legacy-bridge.ts)
 *
 * Exposes standardized ES module services and modal shells to window.*
 * ensuring 100% backward compatibility with legacy scripts, HTML onclick attributes,
 * and existing UI buttons without any breaking changes.
 */

import { createModalShell, modalStack } from '../core/modal-shell';
import { UI } from '../core/ui';
import { lineageFamilyModal } from './lineage-family';
import { equipmentForgeModal } from './equipment-forge';
import { enterpriseWorkshopModal } from './enterprise-workshop';
import { dossiersModal } from './dossiers';
import { quickTradeModal } from './trade-quick';
import { tacticalBattleModal } from './tactical-battle';
import { transitTurnModals } from './transit-turn';
import { worldMapModal } from './world-map';
import { mapLiveService } from './world-map/map-live.service';

export function setupLegacyBridge(): void {
  if (typeof window === 'undefined') return;

  const w = window as any;

  // 1. Core Modal Shell Framework
  w.ModalShellCore = {
    createModalShell,
    modalStack
  };

  // 1b. Shared UI primitives (buttons, badges, toast, confirm)
  w.UI = UI;

  // 2. Lineage & Family Feature Slice Bridge
  w.LineageFamilyUI = {
    open: (tabId?: string) => lineageFamilyModal.open(tabId),
    close: () => lineageFamilyModal.close(),
    setFilter: (stratum: string) => lineageFamilyModal.setFilter(stratum),
    proposeMarriage: (candidateId: string) => lineageFamilyModal.proposeMarriage(candidateId),
    restCohabit: (spouseId: string) => lineageFamilyModal.restCohabit(spouseId),
    assignRole: (marriageId: string, role: string) => lineageFamilyModal.assignRole(marriageId, role),
    designateHeir: (childId: string) => lineageFamilyModal.designateHeir(childId),
    assignMentorDialog: (childId: string) => lineageFamilyModal.assignMentorDialog(childId),
    executeSuccession: () => lineageFamilyModal.executeSuccession()
  };

  // 3. Spatial POI modals are provided by the legacy module
  // (public/js/spatial-poi-modals.js). The TS slice still targets endpoints
  // that do not exist (/api/arena/*, /api/banquet/drink, /api/character/rest),
  // so it must not replace the working legacy modals yet.

  // 4. Equipment & Bespoke Forge
  w.EquipmentUI = {
    openEquipmentModal: (charId?: string, tab?: string) => equipmentForgeModal.open(charId, tab),
    closeEquipmentModal: () => equipmentForgeModal.close(),
    switchTab: (tab: string) => (equipmentForgeModal as any).modal.switchTab(tab),
    equip: (charId: string, slot: string, itemCode: string) => equipmentForgeModal.equip(charId, slot, itemCode),
    unequip: (charId: string, slot: string) => equipmentForgeModal.unequip(charId, slot),
    executeForge: () => equipmentForgeModal.executeForge()
  };

  // 5. Enterprises & Workshops
  w.EnterpriseUI = {
    openEnterpriseModal: (tab?: string) => enterpriseWorkshopModal.open(tab),
    closeEnterpriseModal: () => enterpriseWorkshopModal.close(),
    depositSafeCash: (id: string) => enterpriseWorkshopModal.depositSafeCash(id),
    withdrawSafeCash: (id: string) => enterpriseWorkshopModal.withdrawSafeCash(id),
    executeWork: (shiftType: string) => enterpriseWorkshopModal.executeWork(shiftType)
  };

  // 6. Caravans & Logistics are provided by the legacy module
  // (public/js/caravan-ui.js), which owns the full inventory/cost/guard-tier
  // projection and is still the complete surface. The TS shell remains for a
  // later migration and must not replace it yet.

  // 7. Dossiers (Protagonist & NPC)
  w.ProtagonistDossierModal = {
    open: () => dossiersModal.openProtagonist(),
    close: () => dossiersModal.closeProtagonist()
  };
  w.NpcDossierModal = {
    open: (npcId: string) => dossiersModal.openNpc(npcId),
    close: () => dossiersModal.closeNpc()
  };

  // 8. Personal Journal & Roadmaps are provided by the legacy module
  // (public/js/personal-journal-ui.js) which owns the 4-tab journal DOM
  // (#grand-command-hub-modal). The TS journal shell is kept for a later
  // migration and must not replace the working legacy surface yet.

  // 9. Grand Command Hub is provided by the legacy journal module
  // (public/js/personal-journal-ui.js), which owns #grand-command-hub-modal and
  // the 4 tabs the static markup defines. The old 7-tab hub was removed.

  // 10. Quick Trade Modal
  w.QuickTradeModal = {
    open: (mode: 'BUY' | 'SELL', itemCode: string, qty?: number, price?: number) => quickTradeModal.open(mode, itemCode, qty, price),
    close: () => quickTradeModal.close(),
    updateTotal: () => quickTradeModal.updateTotal(),
    submit: () => quickTradeModal.submit()
  };

  // 11. Tactical Battle & Combat
  w.TacticalBattleUI = {
    startDuel: (opponentId: string) => tacticalBattleModal.startDuel(opponentId),
    close: () => tacticalBattleModal.close(),
    executeAction: (action: string) => tacticalBattleModal.executeAction(action)
  };

  // 13. Travel Transit & Turn Advance
  w.TravelTransitUI = {
    show: (origin: string, dest: string, days: number, logs?: string) => transitTurnModals.showTravelTransit(origin, dest, days, logs),
    close: () => transitTurnModals.closeTravel(),
    openLegacy: () => transitTurnModals.openTravelTransitModal(),
    closeLegacy: () => transitTurnModals.closeTravelTransitModal()
  };
  w.TurnAdvanceUI = {
    show: (turn: number, date: string, summary?: string) => transitTurnModals.showTurnAdvance(turn, date, summary),
    close: () => transitTurnModals.closeTurn(),
    openLegacy: () => transitTurnModals.openTurnAdvanceModal(),
    closeLegacy: () => transitTurnModals.closeTurnAdvanceModal()
  };

  // 14. World Map Modal & Live Settlement State
  w.WorldMapUI = {
    open: () => worldMapModal.open(),
    close: () => worldMapModal.close()
  };
  w.MapLiveService = {
    load: (force = false) => mapLiveService.load(force),
    getForMapNode: (nodeId: string) => mapLiveService.getForMapNode(nodeId),
    getStatusForMapNode: (nodeId: string) => mapLiveService.getStatusForMapNode(nodeId),
    getThreatForMapNode: (nodeId: string) => mapLiveService.getThreatForMapNode(nodeId),
    findNpcByName: (name: string) => mapLiveService.findNpcByName(name),
    findSpecialistByName: (name: string) => mapLiveService.findSpecialistByName(name),
    getSpecialistsForMapNode: (nodeId: string) => mapLiveService.getSpecialistsForMapNode(nodeId),
    getLocIdForNode: (nodeId: string) => mapLiveService.getLocIdForNode(nodeId),
    getRecruitRequirement: (name: string) => mapLiveService.getRecruitRequirement(name),
    getActionRequirements: () => mapLiveService.getActionRequirements(),
    getRoute: (from: string, to: string) => mapLiveService.getRoute(from, to),
    getLivingEntities: () => mapLiveService.getLivingEntities(),
    getResourceDistribution: () => mapLiveService.getResourceDistribution(),
    getResourceNodesForMapNode: (nodeId: string) => mapLiveService.getResourceNodesForMapNode(nodeId),
    resolveMapNodeId: (settlementId: string) => mapLiveService.resolveMapNodeId(settlementId),
    hasArmy: () => mapLiveService.hasArmy(),
    getState: () => mapLiveService.getState(),
    ALIASES: mapLiveService.ALIASES
  };

  console.log('[ThreeKingdoms-AgentEngine] All 14 client feature slices successfully bridged to window.*');
}
