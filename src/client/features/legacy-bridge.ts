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
import { equipmentForgeModal } from './equipment-forge';
import { enterpriseWorkshopModal } from './enterprise-workshop';
import { caravanLogisticsModal } from './caravan-logistics';
import { dossiersModal } from './dossiers';
import { personalJournalModal } from './personal-journal';
import { grandCommandHubModal } from './grand-command-hub';
import { quickTradeModal } from './trade-quick';
import { tacticalBattleModal } from './tactical-battle';
import { titleScreenModal } from './title-screen';
import { transitTurnModals } from './transit-turn';
import { worldMapModal } from './world-map';

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

  // 6. Caravans & Logistics
  w.CaravanUI = {
    openCaravanModal: (tab?: string) => caravanLogisticsModal.open(tab),
    closeCaravanModal: () => caravanLogisticsModal.close(),
    executeDispatch: () => caravanLogisticsModal.executeDispatch()
  };

  // 7. Dossiers (Protagonist & NPC)
  w.ProtagonistDossierModal = {
    open: () => dossiersModal.openProtagonist(),
    close: () => dossiersModal.closeProtagonist()
  };
  w.NpcDossierModal = {
    open: (npcId: string) => dossiersModal.openNpc(npcId),
    close: () => dossiersModal.closeNpc()
  };

  // 8. Personal Journal & Roadmaps
  w.PersonalJournalUI = {
    open: (tab?: string) => personalJournalModal.open(tab),
    close: () => personalJournalModal.close()
  };

  // 9. Grand Command Hub
  w.GrandCommandHubUI = {
    open: (tab?: string) => grandCommandHubModal.open(tab),
    close: () => grandCommandHubModal.close()
  };

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

  // 12. Title Screen & Scenario Selector
  w.TitleScreenUI = {
    open: () => titleScreenModal.open(),
    close: () => titleScreenModal.close(),
    selectScenario: (scen: string) => titleScreenModal.selectScenario(scen),
    startCampaign: () => titleScreenModal.startCampaign()
  };

  // 13. Travel Transit & Turn Advance
  w.TravelTransitUI = {
    show: (origin: string, dest: string, days: number, logs?: string) => transitTurnModals.showTravelTransit(origin, dest, days, logs),
    close: () => transitTurnModals.closeTravel()
  };
  w.TurnAdvanceUI = {
    show: (turn: number, date: string, summary?: string) => transitTurnModals.showTurnAdvance(turn, date, summary),
    close: () => transitTurnModals.closeTurn()
  };

  // 14. World Map Modal
  w.WorldMapUI = {
    open: () => worldMapModal.open(),
    close: () => worldMapModal.close()
  };

  console.log('[ThreeKingdoms-AgentEngine] All 14 client feature slices successfully bridged to window.*');
}
