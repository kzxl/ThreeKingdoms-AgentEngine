/**
 * SIMULATION API CLIENT MODULE
 * Centralized HTTP request layer for backend simulation services
 */

async function apiFetchStatus() {
  const res = await fetch(`${API_BASE}/api/status`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch status');
  return data;
}

async function apiFetchAudit() {
  const res = await fetch(`${API_BASE}/api/audit`);
  const data = await res.json();
  return data;
}

async function apiFetchScene(targetSubLoc = activeSubLocation) {
  const res = await fetch(`${API_BASE}/api/scene?subLocation=${encodeURIComponent(targetSubLoc)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch scene');
  return data;
}

async function apiFetchInventory() {
  const res = await fetch(`${API_BASE}/api/inventory`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch inventory');
  return data;
}

async function apiFetchNpcs() {
  const res = await fetch(`${API_BASE}/api/npcs`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch NPCs');
  return data;
}

async function apiFetchLedger() {
  const res = await fetch(`${API_BASE}/api/ledger`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch ledger');
  return data;
}

async function apiFetchAgentLogs() {
  const res = await fetch(`${API_BASE}/api/agent/logs`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch agent logs');
  return data;
}

async function apiDispatchPrompt(payload) {
  const res = await fetch(`${API_BASE}/api/agent/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return data;
}

async function apiDispatchAction(payload) {
  const res = await fetch(`${API_BASE}/api/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Action failed');
  return data;
}

async function apiFetchChatHistory() {
  const res = await fetch(`${API_BASE}/api/chat/history`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch chat history');
  return data.history || [];
}

async function apiSaveChatTurn(turn) {
  try {
    const res = await fetch(`${API_BASE}/api/chat/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(turn)
    });
    return await res.json();
  } catch (err) {
    console.warn('apiSaveChatTurn non-blocking error:', err);
    return { success: false };
  }
}

async function apiClearChatHistory() {
  const res = await fetch(`${API_BASE}/api/chat/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return await res.json();
}

async function apiFetchGameSummary() {
  const res = await fetch(`${API_BASE}/api/game/summary`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch game summary');
  return data;
}

async function apiStartNewGame(payload) {
  const res = await fetch(`${API_BASE}/api/game/new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to start new game');
  return data;
}

async function apiSaveSlot(slotName) {
  const res = await fetch(`${API_BASE}/api/game/save-slot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot: slotName })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to export save slot');
  return data;
}

async function apiLoadSlot(slotName) {
  const res = await fetch(`${API_BASE}/api/game/load-slot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot: slotName })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to load save slot');
  return data;
}

async function apiFetchMasterCatalog() {
  const res = await fetch(`${API_BASE}/api/master/catalog`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch master catalog');
  return data.catalog;
}

async function apiFetchActiveEvents() {
  const res = await fetch(`${API_BASE}/api/game/events/active`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch active events');
  return data;
}

async function apiParticipateInEvent(eventId, choiceId, customNarrative = null) {
  const res = await fetch(`${API_BASE}/api/game/events/participate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, choiceId, customNarrative })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to participate in event');
  return data;
}

async function apiFetchStrategyModules() {
  try {
    const res = await fetch(`${API_BASE}/api/strategy/modules`);
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, modularEngineActive: false };
  }
}

async function apiFetchNpcJourney(npcId = null, limit = 25) {
  const query = npcId ? `?npcId=${encodeURIComponent(npcId)}&limit=${limit}` : `?limit=${limit}`;
  const res = await fetch(`${API_BASE}/api/npcs/journey${query}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch NPC journey logs');
  return data;
}

async function apiFetchNpcProgression() {
  const res = await fetch(`${API_BASE}/api/npcs/progression`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch NPC progression');
  return data;
}

async function apiSimulateNpcJourney() {
  const res = await fetch(`${API_BASE}/api/npcs/simulate-journey`, { method: 'POST' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to simulate NPC journey');
  return data;
}

async function apiFetchCareerShifts() {
  const res = await fetch(`${API_BASE}/api/npcs/career-shifts`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch career shifts');
  return data;
}

async function apiFetchPeerRelations() {
  const res = await fetch(`${API_BASE}/api/npcs/peer-relations`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch peer relations');
  return data;
}

async function apiFetchFactions() {
  const res = await fetch(`${API_BASE}/api/factions`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch factions');
  return data;
}

async function apiFetchFactionOfficers(factionId = null) {
  const url = factionId ? `${API_BASE}/api/factions/officers?factionId=${encodeURIComponent(factionId)}` : `${API_BASE}/api/factions/officers`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch officers');
  return data;
}

async function apiFetchSettlements() {
  const res = await fetch(`${API_BASE}/api/factions/settlements`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch settlements');
  return data;
}

async function apiFetchFactionEvents(limit = 15) {
  const res = await fetch(`${API_BASE}/api/factions/events?limit=${limit}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch political events');
  return data;
}

async function apiAppointGovernor(settlementId, officerId, factionId) {
  const res = await fetch(`${API_BASE}/api/factions/appoint-governor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settlementId, officerId, factionId })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to appoint governor');
  return data;
}

async function apiInvestTitle(officerId, factionId, newRank) {
  const res = await fetch(`${API_BASE}/api/factions/invest-title`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officerId, factionId, newRank })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to invest title');
  return data;
}

async function apiGrantReward(officerId, factionId, amount = 300) {
  const res = await fetch(`${API_BASE}/api/factions/grant-reward`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officerId, factionId, amount })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to grant reward');
  return data;
}

async function apiSimulatePolitics() {
  const res = await fetch(`${API_BASE}/api/factions/simulate-politics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to simulate politics');
  return data;
}

// Global exposure
window.apiFetchStatus = apiFetchStatus;
window.apiFetchAudit = apiFetchAudit;
window.apiFetchScene = apiFetchScene;
window.apiFetchInventory = apiFetchInventory;
window.apiFetchNpcs = apiFetchNpcs;
window.apiFetchLedger = apiFetchLedger;
window.apiFetchAgentLogs = apiFetchAgentLogs;
window.apiDispatchPrompt = apiDispatchPrompt;
window.apiDispatchAction = apiDispatchAction;
window.apiFetchChatHistory = apiFetchChatHistory;
window.apiSaveChatTurn = apiSaveChatTurn;
window.apiClearChatHistory = apiClearChatHistory;
window.apiFetchGameSummary = apiFetchGameSummary;
window.apiStartNewGame = apiStartNewGame;
window.apiSaveSlot = apiSaveSlot;
window.apiLoadSlot = apiLoadSlot;
window.apiFetchMasterCatalog = apiFetchMasterCatalog;
window.apiFetchActiveEvents = apiFetchActiveEvents;
window.apiParticipateInEvent = apiParticipateInEvent;
window.apiFetchStrategyModules = apiFetchStrategyModules;
window.apiFetchNpcJourney = apiFetchNpcJourney;
window.apiFetchNpcProgression = apiFetchNpcProgression;
window.apiSimulateNpcJourney = apiSimulateNpcJourney;
window.apiFetchCareerShifts = apiFetchCareerShifts;
window.apiFetchPeerRelations = apiFetchPeerRelations;
window.apiFetchFactions = apiFetchFactions;
window.apiFetchFactionOfficers = apiFetchFactionOfficers;
window.apiFetchSettlements = apiFetchSettlements;
window.apiFetchFactionEvents = apiFetchFactionEvents;
window.apiAppointGovernor = apiAppointGovernor;
window.apiInvestTitle = apiInvestTitle;
window.apiGrantReward = apiGrantReward;
window.apiSimulatePolitics = apiSimulatePolitics;

