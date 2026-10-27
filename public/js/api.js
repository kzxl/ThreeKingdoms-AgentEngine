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
