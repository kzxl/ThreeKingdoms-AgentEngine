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

async function apiFetchGatheringNodes(settlementId = null) {
  const url = settlementId ? `${API_BASE}/api/professions/nodes?settlementId=${encodeURIComponent(settlementId)}` : `${API_BASE}/api/professions/nodes`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch gathering nodes');
  return data;
}

async function apiFetchCharacterProfessions(characterId = 'PLY-0001') {
  const res = await fetch(`${API_BASE}/api/professions/character?characterId=${encodeURIComponent(characterId)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch character professions');
  return data;
}

async function apiFetchInnovations(characterId = null) {
  const url = characterId ? `${API_BASE}/api/professions/innovations?characterId=${encodeURIComponent(characterId)}` : `${API_BASE}/api/professions/innovations`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch innovations');
  return data;
}

async function apiGatherResource(characterId, nodeId) {
  const res = await fetch(`${API_BASE}/api/professions/gather`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, nodeId })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to gather resource');
  return data;
}

async function apiRestoreNode(characterId, nodeId) {
  const res = await fetch(`${API_BASE}/api/professions/nodes/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, nodeId })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to restore node');
  return data;
}

async function apiSynthesizeBreakthrough(characterId = 'PLY-0001') {
  const res = await fetch(`${API_BASE}/api/professions/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to synthesize breakthrough');
  return data;
}

async function apiFetchCrises() {
  const res = await fetch(`${API_BASE}/api/ecology/crises`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch ecological crises');
  return data;
}

async function apiFetchCaravans() {
  const res = await fetch(`${API_BASE}/api/logistics/caravans`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch caravans');
  return data;
}

async function apiFetchStrongholds() {
  const res = await fetch(`${API_BASE}/api/logistics/strongholds`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch bandit strongholds');
  return data;
}

async function apiDispatchRelief(settlementId, grainAmount = 5.0) {
  const res = await fetch(`${API_BASE}/api/ecology/relief`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settlementId, grainAmount })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to dispatch grain relief');
  return data;
}

async function apiAttackStronghold(strongholdId) {
  const res = await fetch(`${API_BASE}/api/logistics/attack-stronghold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strongholdId })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to attack stronghold');
  return data;
}

async function apiSimulateEcologyTurn() {
  const res = await fetch(`${API_BASE}/api/ecology/simulate-turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to simulate ecology turn');
  return data;
}

// ------------------------------------------------------------------
// Regional Market & Inter-City Caravan APIs
// ------------------------------------------------------------------
async function apiFetchRegionalPrices(settlementId, itemCode) {
  const q = new URLSearchParams();
  if (settlementId) q.append('settlement', settlementId);
  if (itemCode) q.append('itemCode', itemCode);
  const res = await fetch(`${API_BASE}/api/economy/regional-prices?${q.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch regional prices');
  return data;
}

async function apiFetchArbitrage(fromLoc) {
  const q = fromLoc ? `?from=${encodeURIComponent(fromLoc)}` : '';
  const res = await fetch(`${API_BASE}/api/economy/arbitrage${q}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch arbitrage opportunities');
  return data;
}

async function apiDispatchCaravan(payload) {
  const res = await fetch(`${API_BASE}/api/caravans/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to dispatch caravan');
  return data;
}

async function apiTickCaravanProgress() {
  const res = await fetch(`${API_BASE}/api/caravans/tick-progress`, { method: 'POST' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to tick caravan progress');
  return data;
}

async function apiClaimCaravan(caravanId) {
  const res = await fetch(`${API_BASE}/api/caravans/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caravanId })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to claim caravan');
  return data;
}

async function apiFetchPlayerCaravans() {
  const res = await fetch(`${API_BASE}/api/caravans/player`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch player caravans');
  return data;
}

// Global exposure
window.apiFetchStatus = apiFetchStatus;
window.apiFetchAudit = apiFetchAudit;
window.apiFetchScene = apiFetchScene;
window.apiFetchInventory = apiFetchInventory;
window.apiFetchNpcs = apiFetchNpcs;
window.apiFetchLedger = apiFetchLedger;
async function apiPlanTravel(fromNodeId, toNodeId) {
  const res = await fetch(`${API_BASE}/api/travel/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromNodeId, toNodeId })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to plan travel');
  return data.plan;
}

async function apiStartTravel(fromNodeId, toNodeId) {
  const res = await fetch(`${API_BASE}/api/travel/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromNodeId, toNodeId })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to start travel');
  return data.transit;
}

async function apiAdvanceDays(days = 1, notes = '') {
  const res = await fetch(`${API_BASE}/api/campaign/advance-day`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days, notes })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to advance day');
  return data.result || data;
}

async function apiAdvanceTurn(notes = '') {
  const res = await fetch(`${API_BASE}/api/campaign/advance-turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to advance turn');
  // The server wraps the report in { success, result }. Keep this accessor
  // stable so callers can read nextTurn/nextDate/bizReports directly.
  return data.result || data;
}

async function apiFetchClock() {
  const res = await fetch(`${API_BASE}/api/time/clock`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch clock');
  return data;
}

/**
 * Deprecated compatibility shim.
 *
 * The API endpoint that resolved the player's action already charged its days
 * on the server (`src/shared/action-time.ts`). Call sites keep their old shape,
 * but this function now only refreshes the clock so a second POST cannot
 * double-charge or advance the calendar.
 */
async function apiSpendActionTime(actionType, subType = null, reason = '', daysOverride = null) {
  void actionType;
  void subType;
  void reason;
  void daysOverride;
  const data = await apiFetchClock();
  return data.clock;
}

async function apiFetchTasks() {
  const res = await fetch(`${API_BASE}/api/tasks`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch tasks');
  return data;
}

async function apiStartTask(payload) {
  const res = await fetch(`${API_BASE}/api/tasks/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to start task');
  return data;
}

async function apiCancelTask(taskId) {
  const res = await fetch(`${API_BASE}/api/tasks/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to cancel task');
  return data;
}

async function apiFetchTravelEncounter(fromNode, toNode) {
  const res = await fetch(`${API_BASE}/api/travel/encounter?from=${encodeURIComponent(fromNode)}&to=${encodeURIComponent(toNode)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to generate travel encounter');
  return data.encounter;
}

async function apiResolveTravelEncounter(payload) {
  const res = await fetch(`${API_BASE}/api/travel/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to resolve travel encounter');
  return data.resolution;
}

async function apiCompleteTravelMarch(payload) {
  const res = await fetch(`${API_BASE}/api/travel/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to complete march');
  return data.result;
}

window.apiPlanTravel = apiPlanTravel;
window.apiStartTravel = apiStartTravel;
window.apiAdvanceDays = apiAdvanceDays;
window.apiAdvanceTurn = apiAdvanceTurn;
window.apiFetchClock = apiFetchClock;
window.apiSpendActionTime = apiSpendActionTime;
window.apiFetchTasks = apiFetchTasks;
window.apiStartTask = apiStartTask;
window.apiCancelTask = apiCancelTask;
window.apiFetchTravelEncounter = apiFetchTravelEncounter;
window.apiResolveTravelEncounter = apiResolveTravelEncounter;
window.apiCompleteTravelMarch = apiCompleteTravelMarch;

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
window.apiFetchGatheringNodes = apiFetchGatheringNodes;
window.apiFetchCharacterProfessions = apiFetchCharacterProfessions;
window.apiFetchInnovations = apiFetchInnovations;
window.apiGatherResource = apiGatherResource;
window.apiRestoreNode = apiRestoreNode;
window.apiSynthesizeBreakthrough = apiSynthesizeBreakthrough;
window.apiFetchCrises = apiFetchCrises;
window.apiFetchCaravans = apiFetchCaravans;
window.apiFetchStrongholds = apiFetchStrongholds;
window.apiDispatchRelief = apiDispatchRelief;
window.apiAttackStronghold = apiAttackStronghold;
window.apiSimulateEcologyTurn = apiSimulateEcologyTurn;
window.apiFetchRegionalPrices = apiFetchRegionalPrices;
window.apiFetchArbitrage = apiFetchArbitrage;
window.apiDispatchCaravan = apiDispatchCaravan;
window.apiTickCaravanProgress = apiTickCaravanProgress;
window.apiClaimCaravan = apiClaimCaravan;
window.apiFetchPlayerCaravans = apiFetchPlayerCaravans;

/**
 * SESSION CLIENT
 *
 * Every tab owns one campaign lease. The selected id/token live in
 * sessionStorage (not localStorage) so two tabs can intentionally play two
 * different campaigns, while a second tab on the same campaign is refused by
 * the server's 423 response.
 */
(function installSessionClient() {
  const SESSION_KEY = 'sim.sessionId';
  const TOKEN_KEY = 'sim.sessionToken';
  const VERSION_KEY = 'sim.sessionVersion';
  const OWNER_KEY = 'sim.clientId';
  const LEASE_MS = 60000;
  const HEARTBEAT_MS = 20000;
  let heartbeatTimer = null;

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function ownerId() {
    let id = sessionStorage.getItem(OWNER_KEY);
    if (!id) {
      id = makeId();
      sessionStorage.setItem(OWNER_KEY, id);
    }
    return id;
  }

  function getSession() {
    return {
      id: sessionStorage.getItem(SESSION_KEY) || '',
      token: sessionStorage.getItem(TOKEN_KEY) || '',
      version: Number(sessionStorage.getItem(VERSION_KEY) || 0)
    };
  }

  function setSession(id, token, version) {
    sessionStorage.setItem(SESSION_KEY, id);
    sessionStorage.setItem(TOKEN_KEY, token);
    if (version) sessionStorage.setItem(VERSION_KEY, String(version));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(VERSION_KEY);
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = function sessionAwareFetch(input, init) {
    const asString = typeof input === 'string' ? input : (input && input.url) || '';
    const isSessionAdmin = asString.startsWith('/api/sessions') || asString.startsWith('/api/instances');
    let nextInit = init;
    if (asString.startsWith('/api/') && !isSessionAdmin) {
      const session = getSession();
      if (session.id && session.token) {
        nextInit = nextInit || {};
        const headers = new Headers(nextInit.headers || {});
        headers.set('x-session-id', session.id);
        headers.set('x-session-token', session.token);
        const method = String(nextInit.method || 'GET').toUpperCase();
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
          headers.set('x-session-version', String(session.version || 0));
        }
        nextInit.headers = headers;
      }
    }
    return originalFetch(input, nextInit).then(response => {
      const version = response.headers.get('x-session-version');
      if (version) sessionStorage.setItem(VERSION_KEY, version);
      if (response.status === 423 && !isSessionAdmin) {
        const session = getSession();
        if (session.token) {
          clearSession();
          window.dispatchEvent(new CustomEvent('sim:session-lock-lost', {
            detail: { status: response.status }
          }));
        }
      } else if (response.status === 409 && !isSessionAdmin) {
        response.clone().json().then(data => {
          if (data && data.code === 'SESSION_VERSION_CONFLICT') {
            if (data.currentVersion) sessionStorage.setItem(VERSION_KEY, String(data.currentVersion));
            window.dispatchEvent(new CustomEvent('sim:session-version-conflict', {
              detail: { currentVersion: data.currentVersion }
            }));
          }
        }).catch(() => {});
      }
      return response;
    });
  };

  async function readJson(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.code = data.code;
      error.holder = data.holder;
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function acquire(sessionId, force = false) {
    const response = await fetch('/api/sessions/acquire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, ownerId: ownerId(), force: Boolean(force) })
    });
    const data = await readJson(response);
    setSession(data.sessionId, data.token, data.version);
    startHeartbeat();
    return data;
  }

  async function heartbeat() {
    const session = getSession();
    if (!session.id || !session.token) return false;
    try {
      const response = await fetch('/api/sessions/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, token: session.token })
      });
      if (!response.ok) {
        clearSession();
        window.dispatchEvent(new CustomEvent('sim:session-lock-lost', {
          detail: { status: response.status }
        }));
        return false;
      }
      const data = await response.json().catch(() => null);
      if (data && data.version) sessionStorage.setItem(VERSION_KEY, String(data.version));
      return true;
    } catch (error) {
      return false;
    }
  }

  function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
    if (heartbeatTimer.unref) heartbeatTimer.unref();
  }

  async function release() {
    const session = getSession();
    if (!session.id || !session.token) return true;
    try {
      await fetch('/api/sessions/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, token: session.token }),
        keepalive: true
      });
    } catch (error) {
      /* the lease expires on its own */
    } finally {
      clearSession();
    }
    return true;
  }

  window.addEventListener('pagehide', () => {
    const session = getSession();
    if (!session.id || !session.token) return;
    const body = JSON.stringify({ sessionId: session.id, token: session.token });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/sessions/release', new Blob([body], { type: 'application/json' }));
    }
  });

  window.SessionClient = {
    ownerId,
    getSession,
    setSession,
    clearSession,
    acquire,
    heartbeat,
    release,
    startHeartbeat,
    leaseMs: LEASE_MS
  };

  if (getSession().token) startHeartbeat();
})();



