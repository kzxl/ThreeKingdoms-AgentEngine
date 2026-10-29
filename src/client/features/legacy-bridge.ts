/**
 * ThreeKingdoms-AgentEngine: Legacy Compatibility Bridge
 * (src/client/features/legacy-bridge.ts)
 *
 * Exposes standardized ES module services and modal shells to window.*
 * ensuring 100% backward compatibility with legacy scripts, HTML onclick attributes,
 * and existing UI buttons without any breaking changes.
 */

import { createModalShell, modalStack } from '../core/modal-shell';
import { lineageFamilyModal } from './lineage-family';
import { spatialPoiModals } from './spatial-poi';

export function setupLegacyBridge(): void {
  if (typeof window === 'undefined') return;

  const w = window as any;

  // 1. Core Modal Shell Framework
  w.ModalShellCore = {
    createModalShell,
    modalStack
  };

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

  // 3. Spatial POI Feature Slice Bridge (Tavern, Arena, Residence)
  w.SpatialPoiModals = {
    openTavernModal: (tab?: string) => spatialPoiModals.openTavern(tab),
    closeTavernModal: () => spatialPoiModals.closeTavern(),
    openArenaModal: (tab?: string) => spatialPoiModals.openArena(tab),
    closeArenaModal: () => spatialPoiModals.closeArena(),
    openResidenceModal: (tab?: string) => spatialPoiModals.openResidence(tab),
    closeResidenceModal: () => spatialPoiModals.closeResidence(),

    executeDrinkWine: () => spatialPoiModals.executeDrinkWine(),
    hostBanquet: (tierId: string) => spatialPoiModals.hostBanquet(tierId),
    swearBrotherhood: (targetNpcId: string) => spatialPoiModals.swearBrotherhood(targetNpcId),
    startDuel: (opponentId: string) => spatialPoiModals.startDuel(opponentId),
    executeDuelRound: (action: string) => spatialPoiModals.executeDuelRound(action),
    executeRestAtResidence: () => spatialPoiModals.executeRestAtResidence()
  };

  console.log('[ThreeKingdoms-AgentEngine] Modern ES Module Client & ModalShell successfully initialized.');
}
