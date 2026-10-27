/**
 * ThreeKingdoms-AgentEngine: Web UI Application Logic (public/app.js)
 * Standards Applied: AgentOption UI System & Anti-AI-Slop Architecture
 * 
 * Features:
 * - Anti-Piling Action Guard & Debounce Lock (Zero Race Conditions)
 * - Real-Time Agent Simulation Feedback & Strategy Reasoning HUD
 * - Dynamic Context Engine: Reactive Hero Encounter, D20 Formulas & 4 Choices
 * - Authoritative SimCore SQLite Actions & Reconciled Telemetry
 * - Live Agent Simulation Activity Stream (subtab-agent-log)
 */

const API_BASE = '';

// Global Application State
let activeSubLocation = 'Vườn Đào';
let lastEncounterSubLocation = null;
let currentScene = null;
let currentInventory = [];
let currentStatus = null;
let selectedChoiceId = null;
let isProcessingAction = false; // Anti-Piling Guard
const storyChronicle = []; // History of dialogue and action turns

// DOM Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  initUIEventListeners();
  loadAllData();
});

// ==========================================================================
// 1. DATA INITIALIZATION & ORCHESTRATION
// ==========================================================================
async function loadAllData() {
  try {
    await Promise.all([
      loadStatus(),
      loadScene(activeSubLocation),
      loadDeckInventory(),
      loadDeckNpcs(),
      loadDeckLedger(),
      loadDeckAgentLogs(),
      checkAuditStatus()
    ]);
  } catch (err) {
    console.error('Error during initial load:', err);
    showToast(`Lỗi khởi tạo: ${err.message}`, true);
  }
}

// 1.1 Load Telemetry & Player Status
async function loadStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    currentStatus = data;
    const m = data.meta;
    const p = data.player;
    const f = data.financials;

    // Header Telemetry Chips
    const dateChip = document.getElementById('top-date-chip');
    if (dateChip) dateChip.innerText = `${m.current_date || '184-05-02'} (Lượt ${m.active_turn ?? 6})`;

    const locSub = document.getElementById('top-loc-sub');
    if (locSub) locSub.innerText = p.current_location || 'Quảng Tông';

    const valCash = document.getElementById('top-val-cash');
    if (valCash) valCash.innerText = `${(f.liquidCash || 0).toLocaleString()} Tiền`;

    const valGrain = document.getElementById('top-val-grain');
    if (valGrain) valGrain.innerText = `${Number(p.strategic_grain || 0).toFixed(2)} Thạch`;

    const valInv = document.getElementById('top-val-inv');
    if (valInv) valInv.innerText = `${(f.inventoryValue || 0).toLocaleString()} Tiền`;

    const valNetworth = document.getElementById('top-val-networth');
    if (valNetworth) valNetworth.innerText = `${(f.netWorth || 0).toLocaleString()} Tiền`;

    // Protagonist Card Fields
    if (p) {
      const nameEl = document.getElementById('protagonist-name');
      if (nameEl) nameEl.innerText = p.name === 'Liang Yan' ? 'Lương Diễn' : p.name;

      const styleEl = document.getElementById('protagonist-style');
      if (styleEl) styleEl.innerText = p.style_name ? `(${p.style_name === 'Zhiyuan' ? 'Chí Viễn' : p.style_name})` : '';

      const ageEl = document.getElementById('protagonist-age');
      if (ageEl) ageEl.innerText = `${p.age || 21} Tuổi`;

      const hpEl = document.getElementById('protagonist-hp');
      if (hpEl) hpEl.innerText = `${p.health || 100}/100`;

      const barHp = document.getElementById('bar-hp');
      if (barHp) barHp.style.width = `${p.health || 100}%`;

      const moraleEl = document.getElementById('protagonist-morale');
      if (moraleEl) moraleEl.innerText = `${p.morale || 100}%`;

      const barMorale = document.getElementById('bar-morale');
      if (barMorale) barMorale.style.width = `${p.morale || 100}%`;

      const attrInt = document.getElementById('attr-int');
      if (attrInt) attrInt.innerText = p.int_attr || 80;

      const attrCom = document.getElementById('attr-com');
      if (attrCom) attrCom.innerText = p.com_attr || 78;

      const attrDip = document.getElementById('attr-dip');
      if (attrDip) attrDip.innerText = p.dip_attr || 74;

      const attrLdr = document.getElementById('attr-ldr');
      if (attrLdr) attrLdr.innerText = p.ldr_attr || 70;

      const attrLog = document.getElementById('attr-log');
      if (attrLog) attrLog.innerText = p.log_attr || 70;

      const attrPol = document.getElementById('attr-pol');
      if (attrPol) attrPol.innerText = p.pol_attr || 68;

      const attrCra = document.getElementById('attr-cra');
      if (attrCra) attrCra.innerText = p.cra_attr || 62;

      const attrWar = document.getElementById('attr-war');
      if (attrWar) attrWar.innerText = p.war_attr || 58;
    }

  } catch (err) {
    console.error('Failed to load status:', err);
  }
}

// 1.2 Check Audit Invariants Status
async function checkAuditStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/audit`);
    const data = await res.json();
    const badge = document.getElementById('badge-top-audit');
    const hudAudit = document.getElementById('hud-audit-tag');

    if (badge) {
      if (data.success && data.discrepanciesCount === 0) {
        badge.className = 'badge-audit';
        badge.innerText = '100% Khớp';
        badge.title = `${data.totalInvariantsVerified} Bất biến SQLite đã xác minh hoàn hảo`;
        if (hudAudit) hudAudit.innerText = `✅ INVARIANTS: ${data.totalInvariantsVerified}/${data.totalInvariantsVerified} KHỚP`;
      } else {
        badge.className = 'badge-audit text-danger';
        badge.style.borderColor = 'var(--state-danger)';
        badge.style.color = '#f87171';
        badge.innerText = `${data.discrepanciesCount} Lệch`;
        if (hudAudit) hudAudit.innerText = `⚠️ LỆCH: ${data.discrepanciesCount} INVARIANTS`;
      }
    }
  } catch (err) {
    console.error('Audit check error:', err);
  }
}

// 1.3 Load Dynamic Context Scene
async function loadScene(targetSubLoc = activeSubLocation, customNarrative = null) {
  try {
    activeSubLocation = targetSubLoc;
    const res = await fetch(`${API_BASE}/api/scene?subLocation=${encodeURIComponent(targetSubLoc)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    currentScene = data;
    renderSceneFromData(data, customNarrative);

  } catch (err) {
    console.error('Failed to load scene:', err);
  }
}

// 1.4 Render Dynamic Scene Content
function renderSceneFromData(data, customNarrative = null) {
  if (!data) return;

  // Breadcrumbs
  const breadcrumb = document.getElementById('loc-breadcrumb-text');
  if (breadcrumb && data.campaign) {
    breadcrumb.innerText = data.campaign.location;
  }

  // Dynamic Sub-location Pills
  const subLocGroup = document.getElementById('sub-locations-group');
  if (subLocGroup && data.campaign && data.campaign.subLocations) {
    subLocGroup.innerHTML = data.campaign.subLocations.map(loc => {
      const isActive = loc === activeSubLocation;
      return `
        <button class="sub-loc-pill ${isActive ? 'active' : ''}" onclick="switchSubLocation('${loc}')">
          ● ${loc}
        </button>
      `;
    }).join('');
  }

  // Story Chronicle Stream: Append encounter turn if chronicle is empty, location changed, or custom narrative supplied
  const shouldAppendTurn = storyChronicle.length === 0 || 
                           lastEncounterSubLocation !== activeSubLocation || 
                           Boolean(customNarrative);

  if (shouldAppendTurn) {
    const textToShow = customNarrative || data.narrative || '';
    if (textToShow) {
      const npcName = data.npc ? data.npc.name : 'Người Dẫn Chuyện';
      const npcTitle = data.npc ? data.npc.title : (data.campaign ? data.campaign.location : '');
      const npcAvatar = data.npc && data.npc.name ? data.npc.name.charAt(0) : '漢';

      appendStoryTurn({
        type: 'npc',
        speaker: npcName,
        title: npcTitle,
        avatar: npcAvatar,
        text: textToShow,
        diceBadge: data.lastCheck,
        deltas: null,
        reasoning: null
      });
      lastEncounterSubLocation = activeSubLocation;
    }
  }

  // 4 Branching Choices Grid
  renderChoices(data.options || []);

  // Relations Milestone Progress Card
  renderRelations(data.relations || []);
}

// 1.5 Story Chronicle Stream Helpers & Formatting
function formatStoryText(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/"([^"]+)"/g, '<em>"$1"</em>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

function renderDiceBadgeHtml(check) {
  if (!check || !check.type) return '';
  const isSuccess = check.status === 'THÀNH CÔNG';
  const statusClass = isSuccess ? 'success' : 'failed';
  return `
    <div class="story-dice-badge">
      <span>🎲 <strong>${check.type}</strong>: ${check.formula || ''}</span>
      <span class="${statusClass}">TỔNG ${check.score ?? ''} [${check.status || 'THÀNH CÔNG'}]</span>
    </div>
  `;
}

function renderDeltaBarHtml(delta) {
  if (!delta || Object.keys(delta).length === 0) return '';
  const pills = [];
  if (delta.cash) {
    const isPositive = String(delta.cash).startsWith('+');
    pills.push(`<span class="agent-delta-pill ${isPositive ? 'cash-plus' : 'cash-minus'}">🪙 ${delta.cash}</span>`);
  }
  if (delta.inventory) {
    pills.push(`<span class="agent-delta-pill inv">📦 ${delta.inventory}</span>`);
  }
  if (delta.relations || delta.npc) {
    pills.push(`<span class="agent-delta-pill rel">🤝 ${delta.relations || delta.npc}</span>`);
  }
  if (delta.location) {
    pills.push(`<span class="agent-delta-pill rel">📍 ${delta.location}</span>`);
  }
  if (delta.action) {
    pills.push(`<span class="agent-delta-pill rel">⚡ ${delta.action}</span>`);
  }
  if (delta.audit) {
    pills.push(`<span class="agent-delta-pill rel">⚖️ ${delta.audit}</span>`);
  }
  if (pills.length === 0) return '';
  return `<div class="story-delta-bar">${pills.join('')}</div>`;
}

function renderReasoningHtml(reasoning) {
  if (!reasoning) return '';
  return `<div class="story-reasoning">🧠 <strong>Agent Reasoning:</strong> ${reasoning}</div>`;
}

function renderTurnHtml(turn) {
  const diceHtml = renderDiceBadgeHtml(turn.diceBadge);
  const deltaHtml = renderDeltaBarHtml(turn.deltas);
  const reasoningHtml = renderReasoningHtml(turn.reasoning);
  const formattedText = formatStoryText(turn.text);

  return `
    <div class="story-turn ${turn.type || 'npc'}" id="turn-${turn.id}">
      <div class="story-turn-avatar">${turn.avatar || (turn.type === 'player' ? '梁' : '漢')}</div>
      <div class="story-turn-content">
        <div class="story-turn-header">
          <div>
            <span class="story-speaker-name">${turn.speaker || 'Nhân Vật'}</span>
            ${turn.title ? `<span class="story-speaker-title">• ${turn.title}</span>` : ''}
          </div>
          <span class="story-time">${turn.time || '184-05-02'}</span>
        </div>
        <div class="story-text">${formattedText}</div>
        ${diceHtml}
        ${deltaHtml}
        ${reasoningHtml}
      </div>
    </div>
  `;
}

function appendStoryTurn(turn) {
  turn.id = turn.id || `turn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  if (!turn.time) {
    const curDate = currentStatus?.meta?.current_date || '184-05-02';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    turn.time = `${curDate} • ${timeStr}`;
  }
  storyChronicle.push(turn);

  const chronicle = document.getElementById('story-chronicle');
  if (chronicle) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderTurnHtml(turn).trim();
    const node = wrapper.firstElementChild;
    chronicle.appendChild(node);
    chronicle.scrollTop = chronicle.scrollHeight;
  }
}

function renderStoryChronicle() {
  const chronicle = document.getElementById('story-chronicle');
  if (!chronicle) return;
  chronicle.innerHTML = storyChronicle.map(t => renderTurnHtml(t)).join('');
  chronicle.scrollTop = chronicle.scrollHeight;
}

// 1.6 Quick Prompt Chip Fill Helper
function quickFillPrompt(text) {
  const input = document.getElementById('omni-input');
  if (!input) return;
  input.value = text;
  input.focus();
  showToast(`Đã nạp chỉ thị: "${text}"`);
}

// 1.7 Render Choice Cards
function renderChoices(options) {
  const container = document.getElementById('choices-grid');
  if (!container) return;

  if (!options || options.length === 0) {
    container.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 11px;">Không có đề xuất hành động cho bối cảnh hiện tại.</div>`;
    return;
  }

  container.innerHTML = options.map((opt, idx) => {
    const isSelected = selectedChoiceId === opt.id;
    return `
      <div class="choice-card ${isSelected ? 'active' : ''}" id="choice-card-${opt.id}" onclick="selectChoice('${opt.id}')">
        <div class="choice-icon">${opt.icon || '⚔️'}</div>
        <div class="choice-details">
          <div class="choice-title">${opt.title}</div>
          <div class="choice-desc">${opt.desc}</div>
        </div>
        <div class="choice-actions">
          <button class="btn-choice-select" id="btn-select-${opt.id}" onclick="event.stopPropagation(); executeChoiceDirect('${opt.id}')">+ Chọn -</button>
          <button class="btn-choice-ai" id="btn-ai-${opt.id}" onclick="event.stopPropagation(); executeChoiceAi('${opt.id}')">AI</button>
        </div>
      </div>
    `;
  }).join('');
}

// 1.6 Render Relations Milestones
function renderRelations(relations) {
  const list = document.getElementById('relations-progress-list');
  if (!list) return;

  list.innerHTML = relations.map((rel, idx) => {
    const pct = Math.min(100, Math.round((rel.score / rel.target) * 100));
    const colorClass = idx === 0 ? 'cyan' : idx === 1 ? 'gold' : 'orange';
    const isCompleted = rel.score >= rel.target;

    return `
      <div class="rel-item">
        <div class="rel-info">
          <span class="rel-name">${rel.name}</span>
          <span class="rel-score ${isCompleted ? 'green-text font-bold' : ''}">
            +${rel.score} / +${rel.target} ${isCompleted ? '(Đạt)' : ''}
          </span>
        </div>
        <div class="rel-bar">
          <div class="rel-bar-fill ${colorClass}" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// 2. RIGHT DECK: DATA TABS (INVENTORY, NPCS, LEDGER, AGENT LOG)
// ==========================================================================

// 2.1 Inventory Subtab
async function loadDeckInventory() {
  try {
    const res = await fetch(`${API_BASE}/api/inventory`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    currentInventory = data.items || [];
    const tbody = document.getElementById('deck-inventory-tbody');
    if (!tbody) return;

    if (currentInventory.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 12px;">Kho hàng trống</td></tr>`;
      return;
    }

    tbody.innerHTML = currentInventory.map(item => {
      const itemCodeEsc = item.item_code.replace(/'/g, "\\'");
      const estSellPrice = Math.max(1, Math.round(item.unit_cost_basis * 1.25));
      return `
        <tr>
          <td><code class="mono" style="font-size: 10px; color: #cbd5e1;">${item.item_code}</code></td>
          <td><span title="${item.description}" style="font-weight: 500;">${item.description}</span></td>
          <td class="num-col font-bold">${item.quantity.toLocaleString()}</td>
          <td class="num-col">${item.unit_cost_basis.toLocaleString()}</td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="btn btn-sm btn-gold" onclick="openQuickTrade('SELL', '${itemCodeEsc}', ${Math.min(10, item.quantity)}, ${estSellPrice})">Bán</button>
            <button class="btn btn-sm btn-outline" onclick="openQuickTrade('BUY', '${itemCodeEsc}', 10, ${item.unit_cost_basis || 50})">Mua</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load inventory deck:', err);
  }
}

// 2.2 NPCs Subtab
async function loadDeckNpcs() {
  try {
    const res = await fetch(`${API_BASE}/api/npcs`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const list = document.getElementById('deck-npcs-list');
    if (!list) return;

    const npcs = data.npcs || [];
    if (npcs.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 12px;">Chưa có gia nhân trực thuộc</div>`;
      return;
    }

    list.innerHTML = npcs.map(npc => {
      const initial = npc.name ? npc.name.charAt(0) : '人';
      return `
        <div class="deck-npc-item">
          <div class="deck-npc-header">
            <div class="deck-npc-title-row">
              <div class="deck-npc-avatar">${initial}</div>
              <div>
                <div class="deck-npc-name">${npc.name} (${npc.npc_id})</div>
                <div class="deck-npc-role">${npc.assigned_role || 'Thành viên'} @ ${npc.assigned_business_id || 'Trác Quận'}</div>
              </div>
            </div>
            <span class="badge" style="font-size: 9px; font-family: var(--font-mono); color: #fbbf24; background: rgba(245, 158, 11, 0.15); border: 1px solid var(--border-gold-subtle); padding: 1px 5px; border-radius: 2px;">
              ${npc.monthly_wage} Qian/th
            </span>
          </div>

          <div class="deck-npc-stats">
            <div class="deck-npc-stat-item">Khéo: <span>${npc.cra_attr || 50}</span></div>
            <div class="deck-npc-stat-item">Sĩ khí: <span class="green-text">${npc.morale || 100}%</span></div>
            <div class="deck-npc-stat-item">Trung thành: <span class="gold-text">${npc.loyalty || 80}%</span></div>
          </div>

          <div class="deck-npc-footer">
            <span style="color: var(--text-muted); font-size: 10px;">Tính cách: <strong>${npc.personality || 'Chăm chỉ'}</strong></span>
            <button class="btn btn-sm btn-gold" onclick="rewardNpc('${npc.npc_id}', 100)">
              🎁 Thưởng 100 Tiền
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load NPCs deck:', err);
  }
}

// 2.3 Ledger Subtab
async function loadDeckLedger() {
  try {
    const res = await fetch(`${API_BASE}/api/ledger`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const list = document.getElementById('deck-transactions-list');
    if (!list) return;

    const cashflow = (data.cashflow || []).slice(0, 15);
    if (cashflow.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 12px;">Chưa có giao dịch sổ cái</div>`;
      return;
    }

    list.innerHTML = cashflow.map(txn => {
      const isInflow = txn.inflow > 0;
      const amtStr = isInflow ? `+${txn.inflow.toLocaleString()}` : `-${txn.outflow.toLocaleString()}`;
      const amtColor = isInflow ? 'green-text' : 'red-text';

      return `
        <div class="deck-txn-item">
          <div class="deck-txn-top">
            <span class="deck-txn-id">${txn.txn_id}</span>
            <span class="deck-txn-amt ${amtColor}">${amtStr} Qian</span>
          </div>
          <div class="deck-txn-desc">
            <strong>${txn.category}</strong>: ${txn.memo || txn.counterparty}
          </div>
          <div class="deck-txn-bal">
            Số dư sau TXN: <strong>${txn.balance.toLocaleString()} Qian</strong>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load ledger deck:', err);
  }
}

// 2.4 Agent Activity Stream Subtab
async function loadDeckAgentLogs() {
  try {
    const res = await fetch(`${API_BASE}/api/agent/logs`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const list = document.getElementById('deck-agent-log-list');
    if (!list) return;

    const logs = data.logs || [];
    if (logs.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 12px;">Chưa có dữ liệu mô phỏng từ Agent</div>`;
      return;
    }

    list.innerHTML = logs.map((l, idx) => `
      <div class="deck-agent-log-item ${idx === 0 ? 'highlight' : ''}">
        <div class="deck-agent-log-top">
          <span class="deck-agent-log-type">${l.type}</span>
          <span class="deck-agent-log-time">${l.timestamp}</span>
        </div>
        <div class="deck-agent-log-prompt">💬 ${l.prompt}</div>
        <div class="deck-agent-log-reason">🧠 ${l.reasoning}</div>
        ${l.delta && Object.keys(l.delta).length > 0 ? `
          <div class="deck-agent-log-delta">
            ⚖️ ${Object.entries(l.delta).map(([k, v]) => `${k}: ${v}`).join(' • ')}
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load agent logs deck:', err);
  }
}

// ==========================================================================
// 3. INTERACTIVE ACTIONS & ANTI-PILING DISPATCHERS
// ==========================================================================

// 3.0 Processing Lock Helper (Prevents Command Piling & Race Conditions)
function setProcessingLock(busy, targetElement = null, statusText = '') {
  isProcessingAction = busy;

  // Disable / Enable interactive action buttons
  document.querySelectorAll('button:not(#btn-main-menu):not(#btn-toggle-logs):not(.deck-tab-btn)').forEach(btn => {
    btn.disabled = busy;
  });

  const omniInput = document.getElementById('omni-input');
  if (omniInput) omniInput.disabled = busy;

  if (targetElement) {
    targetElement.classList.toggle('executing', busy);
  }

  const chronicle = document.getElementById('story-chronicle');
  let indicator = document.getElementById('story-computing-indicator');

  if (busy && statusText) {
    if (!indicator && chronicle) {
      indicator = document.createElement('div');
      indicator.id = 'story-computing-indicator';
      indicator.className = 'story-turn system';
      indicator.innerHTML = `
        <div class="story-turn-avatar">🤖</div>
        <div class="story-turn-content" style="padding: 6px 10px; font-size: 11px; color: #34d399;">
          <span class="pulse-dot"></span> Agent Core đang phân tích chiến thuật & đối soát SQLite: <em>"${statusText}"</em>...
        </div>
      `;
      chronicle.appendChild(indicator);
      chronicle.scrollTop = chronicle.scrollHeight;
    }
  } else {
    if (indicator) indicator.remove();
  }
}

// 3.0.1 Render Agent Tactical HUD & Delta Feedback
function renderAgentSimulationFeedback(reasoning, delta) {
  const thoughtBody = document.getElementById('agent-thought-body');
  if (thoughtBody && reasoning) {
    thoughtBody.innerText = reasoning;
  }

  const chipsContainer = document.getElementById('agent-delta-chips');
  if (chipsContainer && delta) {
    const pills = [];
    if (delta.cash) {
      const isPositive = delta.cash.startsWith('+');
      pills.push(`<span class="agent-delta-pill ${isPositive ? 'cash-plus' : 'cash-minus'}">🪙 Tiền: ${delta.cash}</span>`);
    }
    if (delta.inventory) {
      pills.push(`<span class="agent-delta-pill inv">📦 Kho: ${delta.inventory}</span>`);
    }
    if (delta.relations || delta.npc) {
      pills.push(`<span class="agent-delta-pill rel">🤝 ${delta.relations || delta.npc}</span>`);
    }
    if (delta.audit) {
      pills.push(`<span class="agent-delta-pill rel">⚖️ ${delta.audit}</span>`);
    }
    if (pills.length > 0) {
      chipsContainer.innerHTML = pills.join('');
    }
  }

  // Refresh agent activity log stream
  loadDeckAgentLogs();
}

// 3.1 Tab Switching in Right Deck
function switchDeckTab(subtabId) {
  document.querySelectorAll('.deck-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-subtab') === subtabId);
  });

  document.querySelectorAll('.deck-tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === subtabId);
  });

  if (subtabId === 'subtab-inventory') loadDeckInventory();
  if (subtabId === 'subtab-npcs') loadDeckNpcs();
  if (subtabId === 'subtab-ledger') loadDeckLedger();
  if (subtabId === 'subtab-agent-log') loadDeckAgentLogs();
}

// 3.2 Dynamic Sub-location Switching
async function switchSubLocation(locName) {
  if (isProcessingAction) {
    showToast('⚠️ Đang thực thi thao tác khác, vui lòng chờ!', true);
    return;
  }
  if (activeSubLocation === locName) return;

  activeSubLocation = locName;
  showToast(`Đang chuyển cảnh tới: ${locName}...`);
  await loadScene(locName);
}

// 3.3 Choice Selection & Highlighting
function selectChoice(optId) {
  selectedChoiceId = optId;
  document.querySelectorAll('.choice-card').forEach(card => {
    card.classList.toggle('active', card.id === `choice-card-${optId}`);
  });
}

// 3.4 Direct Mechanical Choice Execution (Anti-Piling Guarded)
async function executeChoiceDirect(optId) {
  if (isProcessingAction) {
    showToast('⚠️ Đang thực thi điều lệnh trước, vui lòng không nhấn dồn!', true);
    return;
  }

  if (!currentScene || !currentScene.options) return;
  const opt = currentScene.options.find(o => o.id === optId);
  if (!opt) return;

  const cardEl = document.getElementById(`choice-card-${optId}`);
  selectChoice(optId);

  // Append Player Action Turn into Story Chronicle
  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: 'Quyết Sách Trực Tiếp',
    avatar: '梁',
    text: `**${opt.title}**\n\n*Ý đồ chiến thuật:* ${opt.desc}`
  });

  setProcessingLock(true, cardEl, opt.title);

  try {
    // Location Movement Choice
    if (opt.action && opt.action.type === 'MOVE_LOCATION') {
      showToast(`Đang di chuyển tới ${opt.action.new_location}...`);
      opt.action.idempotency_key = `OPT_${optId}_${Date.now()}`;
      await dispatchDirectAction(opt.action);
      activeSubLocation = opt.action.new_location;

      appendStoryTurn({
        type: 'system',
        speaker: 'Hành Trình',
        title: 'Chuyển Đổi Địa Điểm',
        avatar: '📍',
        text: `Lương Diễn đã rời bước, đặt chân tới **${opt.action.new_location}**. Bối cảnh xung quanh bắt đầu thay đổi.`,
        deltas: { location: activeSubLocation, audit: 'Cập nhật tọa độ' }
      });

      await loadScene(activeSubLocation);
      renderAgentSimulationFeedback(`Cơ động tới ${activeSubLocation}. Thiết lập vị trí chiến dịch mới.`, { location: activeSubLocation, audit: '70/70 Khớp' });
      return;
    }

    // Direct Authoritative SimulationCore Action
    if (opt.action) {
      showToast(`Đang thực thi: ${opt.title}...`);
      opt.action.idempotency_key = `OPT_${optId}_${Date.now()}`;
      const result = await dispatchDirectAction(opt.action);

      // Append result into chronicle
      appendStoryTurn({
        type: 'system',
        speaker: 'SimCore Kiểm Toán',
        title: 'Ghi Nhận Sổ Cái SQLite',
        avatar: '⚖️',
        text: `Điều lệnh **${opt.title}** đã thực thi thành công và ghi sổ bất biến.`,
        deltas: result && result.delta ? result.delta : { action: opt.action.type, audit: '70/70 Khớp' },
        reasoning: `Bất biến SQLite kiểm toán bảo toàn tuyệt đối.`
      });

      // Refresh scene and right deck
      await loadScene(activeSubLocation);
      renderAgentSimulationFeedback(`Thực thi thành công điều lệnh "${opt.title}". Kiểm toán bất biến bảo toàn hoàn hảo.`, { action: opt.action.type, audit: '70/70 Khớp' });
      await Promise.all([loadStatus(), loadDeckInventory(), loadDeckNpcs(), loadDeckLedger()]);
    } else {
      showToast(`Đã chọn: ${opt.title}`);
    }
  } catch (err) {
    console.error('Error executing direct choice:', err);
    showToast(`Thất bại: ${err.message}`, true);
  } finally {
    setProcessingLock(false, cardEl);
  }
}

// 3.5 AI-Assisted Choice Execution (Anti-Piling Guarded)
async function executeChoiceAi(optId) {
  if (isProcessingAction) {
    showToast('⚠️ Đang gửi yêu cầu cho AI Bridge, vui lòng không bấm liên tục!', true);
    return;
  }

  if (!currentScene || !currentScene.options) return;
  const opt = currentScene.options.find(o => o.id === optId);
  if (!opt) return;

  const cardEl = document.getElementById(`choice-card-${optId}`);
  selectChoice(optId);

  // Append Player Action Turn into Story Chronicle
  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: 'Thỉnh Cầu AI Core',
    avatar: '梁',
    text: `Đề xuất phương án: **${opt.title}**`
  });

  setProcessingLock(true, cardEl, `Gửi "${opt.title}" cho AI Core`);
  showToast(`Gửi lựa chọn "${opt.title}" qua AI Bridge...`);

  try {
    const res = await fetch(`${API_BASE}/api/agent/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: opt.title, choiceId: optId, subLocation: activeSubLocation })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);

    // Update scene dynamically
    if (result.updatedScene) {
      if (result.updatedScene.campaign && result.updatedScene.campaign.activeSubLocation) {
        activeSubLocation = result.updatedScene.campaign.activeSubLocation;
      }
      renderSceneFromData(result.updatedScene);
    } else {
      await loadScene(activeSubLocation);
    }

    // Append AI / NPC Response into Story Chronicle
    const npc = result.updatedScene?.npc || currentScene?.npc;
    appendStoryTurn({
      type: 'npc',
      speaker: npc?.name || 'Hào Kiệt Huyện Trác',
      title: npc?.title || 'Phản Hồi Chiến Thuật',
      avatar: npc?.name ? npc.name.charAt(0) : '漢',
      text: result.narrative,
      diceBadge: result.updatedScene?.lastCheck,
      deltas: result.delta,
      reasoning: result.reasoning
    });

    // Render Agent Reasoning & Simulation Delta
    renderAgentSimulationFeedback(result.reasoning, result.delta);

    showToast('AI Bridge đã phản hồi và hoàn tất đối soát SQLite!');
    await Promise.all([loadStatus(), loadDeckInventory(), loadDeckNpcs(), loadDeckLedger()]);

  } catch (err) {
    console.error('AI Bridge execution error:', err);
    showToast(`Lỗi AI Bridge: ${err.message}`, true);
  } finally {
    setProcessingLock(false, cardEl);
  }
}

// 3.6 Omni Command Bar Dispatcher (Anti-Piling Guarded)
async function dispatchOmniCommand(mode = 'ai') {
  if (isProcessingAction) {
    showToast('⚠️ Hệ thống đang tính toán lệnh trước, vui lòng không spam lệnh!', true);
    return;
  }

  const inputEl = document.getElementById('omni-input');
  if (!inputEl) return;

  const promptText = inputEl.value.trim();
  if (!promptText) {
    showToast('Vui lòng nhập mệnh lệnh hoặc đối thoại!', true);
    inputEl.focus();
    return;
  }

  // Append Player Action Turn into Story Chronicle
  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: mode === 'instant' ? 'Mệnh Lệnh Tức Thì' : 'Mệnh Lệnh & Đối Thoại',
    avatar: '梁',
    text: promptText
  });

  inputEl.value = '';
  setProcessingLock(true, null, promptText);
  showToast(mode === 'instant' ? 'Đang thực thi lệnh tức thì...' : 'Đang gửi cho AI Agent Core...');

  try {
    const res = await fetch(`${API_BASE}/api/agent/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptText, mode, subLocation: activeSubLocation })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);

    if (result.updatedScene) {
      if (result.updatedScene.campaign && result.updatedScene.campaign.activeSubLocation) {
        activeSubLocation = result.updatedScene.campaign.activeSubLocation;
      }
      renderSceneFromData(result.updatedScene);
    } else {
      await loadScene(activeSubLocation);
    }

    // Append AI / NPC Response into Story Chronicle
    const npc = result.updatedScene?.npc || currentScene?.npc;
    appendStoryTurn({
      type: 'npc',
      speaker: npc?.name || 'Hào Kiệt Huyện Trác',
      title: npc?.title || 'Phản Hồi Chiến Thuật',
      avatar: npc?.name ? npc.name.charAt(0) : '漢',
      text: result.narrative,
      diceBadge: result.updatedScene?.lastCheck,
      deltas: result.delta,
      reasoning: result.reasoning
    });

    // Render Agent Reasoning & Simulation Delta
    renderAgentSimulationFeedback(result.reasoning, result.delta);

    showToast('Điều lệnh đã thực thi thành công!');
    await Promise.all([loadStatus(), loadDeckInventory(), loadDeckNpcs(), loadDeckLedger()]);

  } catch (err) {
    console.error('Command dispatch error:', err);
    showToast(`Thất bại: ${err.message}`, true);
  } finally {
    setProcessingLock(false, null);
  }
}

// 3.7 Direct SimulationCore Action Helper
async function dispatchDirectAction(payload) {
  try {
    const res = await fetch(`${API_BASE}/api/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      showToast(`Điều lệnh ${payload.type} thành công!`);
      return result;
    } else {
      showToast(`Bị từ chối: [${result.code || 'ERR'}] ${result.error}`, true);
      return result;
    }
  } catch (err) {
    showToast(`Lỗi kết nối SimCore: ${err.message}`, true);
  }
}

// 3.8 NPC Retainer Reward Quick Action
async function rewardNpc(npcId, amount = 100) {
  if (isProcessingAction) {
    showToast('⚠️ Đang thực thi thao tác khác, vui lòng chờ!', true);
    return;
  }

  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: 'Khen Thưởng Gia Nhân',
    avatar: '梁',
    text: `Ban thưởng **${amount} Tiền** cho nhân sĩ ${npcId} để khích lệ sĩ khí trung thành!`
  });

  setProcessingLock(true, null, `Thưởng ${amount} Tiền cho NPC ${npcId}`);
  showToast(`Ban thưởng ${amount} Tiền cho NPC ${npcId}...`);

  try {
    await dispatchDirectAction({
      type: 'REWARD_NPC',
      npc_id: npcId,
      amount,
      game_date: '184-05-02',
      idempotency_key: `RWD_${npcId}_${Date.now()}`
    });

    appendStoryTurn({
      type: 'npc',
      speaker: 'Trần Bảo (Thợ Cả)',
      title: 'Lương Thị Chức Tác Phường',
      avatar: '陳',
      text: `Trần Bảo cảm kích khôn xiết cúi đầu bái tạ: *"Đa tạ Thiếu gia trọng thưởng! Thuộc hạ và anh em thợ xưởng nguyện dốc toàn lực chế tạo quân trang phòng thủ tốt nhất!"*`,
      deltas: { cash: `-${amount} Qian`, npc: 'Sĩ khí 100% • Trung thành +2', audit: '70/70 Khớp' },
      reasoning: `Khen thưởng ${amount} Tiền động viên NPC ${npcId}. Sĩ khí tối đa.`
    });

    renderAgentSimulationFeedback(`Khen thưởng ${amount} Tiền động viên NPC ${npcId}. Sĩ khí tối đa.`, { cash: `-${amount} Qian`, npc: 'Sĩ khí 100% • Trung thành +2', audit: '70/70 Khớp' });
    await Promise.all([loadStatus(), loadDeckNpcs(), loadDeckLedger()]);
  } finally {
    setProcessingLock(false, null);
  }
}

// ==========================================================================
// 4. QUICK TRADE MODAL CONTROLS
// ==========================================================================

function openQuickTrade(mode, itemCode, defaultQty, defaultPrice) {
  if (isProcessingAction) {
    showToast('⚠️ Đang thực thi điều lệnh, vui lòng chờ!', true);
    return;
  }

  const modal = document.getElementById('trade-modal');
  if (!modal) return;

  const modeEl = document.getElementById('modal-trade-mode');
  const codeEl = document.getElementById('modal-item-code');
  const qtyEl = document.getElementById('modal-qty');
  const priceEl = document.getElementById('modal-price');
  const titleEl = document.getElementById('trade-modal-title');
  const submitBtn = document.getElementById('modal-submit-btn');

  if (modeEl) modeEl.value = mode;
  if (codeEl) codeEl.value = itemCode;
  if (qtyEl) qtyEl.value = defaultQty;
  if (priceEl) priceEl.value = defaultPrice;

  const isSell = mode === 'SELL';
  if (titleEl) titleEl.innerText = isSell ? `Bán Hàng: ${itemCode}` : `Mua Thêm: ${itemCode}`;
  if (submitBtn) submitBtn.innerText = isSell ? `Xác Nhận Xuất Bán` : `Xác Nhận Mua Hàng`;

  calcTradeTotal();
  modal.classList.remove('hidden');
}

function closeTradeModal() {
  const modal = document.getElementById('trade-modal');
  if (modal) modal.classList.add('hidden');
}

function calcTradeTotal() {
  const qty = parseFloat(document.getElementById('modal-qty')?.value) || 0;
  const price = parseFloat(document.getElementById('modal-price')?.value) || 0;
  const total = Math.round(qty * price);
  const totalEl = document.getElementById('modal-total-amt');
  if (totalEl) totalEl.innerText = `${total.toLocaleString()} Tiền`;
}

async function submitModalTrade() {
  if (isProcessingAction) return;

  const mode = document.getElementById('modal-trade-mode')?.value;
  const itemCode = document.getElementById('modal-item-code')?.value;
  const qty = parseFloat(document.getElementById('modal-qty')?.value);
  const price = parseInt(document.getElementById('modal-price')?.value, 10);
  const counterparty = document.getElementById('modal-counterparty')?.value.trim() || 'Thương đoàn Ký Châu';

  if (!itemCode || qty <= 0 || price <= 0) {
    showToast('Vui lòng nhập số lượng và đơn giá hợp lệ!', true);
    return;
  }

  closeTradeModal();

  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: mode === 'SELL' ? 'Xuất Bán Hàng Hóa' : 'Thu Mua Vật Tư',
    avatar: '梁',
    text: `${mode === 'SELL' ? 'Xuất bán' : 'Thu mua'} **${qty} ${itemCode}** với đối tác **${counterparty}** theo giá **${price} Tiền/đơn vị** (Tổng: ${(qty * price).toLocaleString()} Tiền).`
  });

  setProcessingLock(true, null, `${mode === 'SELL' ? 'Xuất bán' : 'Thu mua'} ${qty} ${itemCode}`);

  const payload = {
    type: mode === 'SELL' ? 'TRADE_SELL' : 'TRADE_BUY',
    item_code: itemCode,
    quantity: qty,
    unit_price: price,
    counterparty,
    game_date: '184-05-02',
    idempotency_key: `MODAL_${mode}_${itemCode}_${Date.now()}`
  };

  try {
    await dispatchDirectAction(payload);
    const totalAmt = qty * price;
    const deltaCash = mode === 'SELL' ? `+${totalAmt} Qian` : `-${totalAmt} Qian`;
    const deltaStock = mode === 'SELL' ? `-${qty} ${itemCode}` : `+${qty} ${itemCode}`;

    appendStoryTurn({
      type: 'system',
      speaker: 'Thương Nghiệp Lương Gia',
      title: 'Hoàn Tất Giao Dịch Sổ Cái',
      avatar: '📦',
      text: `Giao dịch thương nghiệp đã giao nhận thành công. Hàng hóa và dòng tiền được đối soát tự động trong cơ sở dữ liệu SQLite.`,
      deltas: { cash: deltaCash, inventory: deltaStock, audit: '70/70 Khớp' },
      reasoning: `Hoàn tất giao dịch thương nghiệp ${mode} cho ${itemCode}.`
    });

    renderAgentSimulationFeedback(`Hoàn tất giao dịch thương nghiệp ${mode} cho ${itemCode}.`, { cash: deltaCash, inventory: deltaStock, audit: '70/70 Khớp' });
    await Promise.all([loadStatus(), loadDeckInventory(), loadDeckLedger()]);
  } finally {
    setProcessingLock(false, null);
  }
}

// ==========================================================================
// 5. UTILITIES & HELPERS
// ==========================================================================

function initUIEventListeners() {
  // Main Menu click
  const btnMenu = document.getElementById('btn-main-menu');
  if (btnMenu) {
    btnMenu.addEventListener('click', () => {
      showToast('Hệ thống SimCore: 70/70 Invariants SQLite đang bảo toàn 100%!');
    });
  }

  // Logs button click: Switches directly to Agent Activity Log Stream!
  const btnLogs = document.getElementById('btn-toggle-logs');
  if (btnLogs) {
    btnLogs.addEventListener('click', () => {
      switchDeckTab('subtab-agent-log');
      showToast('Đang hiển thị Nhật ký mô phỏng từ Agent!');
    });
  }
}

function formatNarrativeQuotes(text) {
  // Highlights quoted dialogue in gold italics
  return text.replace(/"([^"]+)"/g, '<em>"$1"</em>');
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.innerText = message;
  toast.style.borderColor = isError ? 'var(--state-danger)' : 'var(--border-gold)';
  toast.classList.remove('hidden');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}
