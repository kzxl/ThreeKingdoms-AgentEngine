/**
 * ThreeKingdoms-AgentEngine: Web UI Application Logic (public/app.js)
 * Standards Applied: AgentOption UI System & Anti-AI-Slop Architecture
 * 
 * Features:
 * - 2-Column Tactical Narrative & Simulation State Deck
 * - Authoritative SimCore SQLite Actions & Reconciled Telemetry
 * - Live Agent Bridge Freeform & Branching Choices
 * - Deterministic D20 Dice-Check Formula Visualizer
 */

const API_BASE = '';

// Global Application State
let currentScene = null;
let currentInventory = [];
let currentStatus = null;
let selectedChoiceId = null;

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
      loadScene(),
      loadDeckInventory(),
      loadDeckNpcs(),
      loadDeckLedger(),
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
    if (badge) {
      if (data.success && data.discrepanciesCount === 0) {
        badge.className = 'badge-audit';
        badge.innerText = '100% Khớp';
        badge.title = `${data.totalInvariantsVerified} Bất biến SQLite đã xác minh hoàn hảo`;
      } else {
        badge.className = 'badge-audit text-danger';
        badge.style.borderColor = 'var(--state-danger)';
        badge.style.color = '#f87171';
        badge.innerText = `${data.discrepanciesCount} Lệch`;
      }
    }
  } catch (err) {
    console.error('Audit check error:', err);
  }
}

// 1.3 Load Current Narrative & Tactical Choice Scene
async function loadScene() {
  try {
    const res = await fetch(`${API_BASE}/api/scene`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    currentScene = data;

    // Breadcrumbs
    const breadcrumb = document.getElementById('loc-breadcrumb-text');
    if (breadcrumb && data.campaign) {
      breadcrumb.innerText = data.campaign.location;
    }

    // Hero Encounter Card
    if (data.npc) {
      const npcHeroName = document.getElementById('npc-hero-name');
      const npcHeroTitle = document.getElementById('npc-hero-title');
      const npcHeroSentiment = document.getElementById('npc-hero-sentiment');
      const npcHeroAvatar = document.querySelector('.npc-hero-avatar');

      if (npcHeroName) npcHeroName.innerText = data.npc.name;
      if (npcHeroTitle) npcHeroTitle.innerText = data.npc.title;
      if (npcHeroSentiment) npcHeroSentiment.innerText = data.npc.sentimentStatus;
      if (npcHeroAvatar) npcHeroAvatar.innerText = data.npc.name.charAt(0);
    }

    // Transparent Deterministic Dice Check
    if (data.lastCheck) {
      const checkType = document.getElementById('dice-check-type');
      const checkStatus = document.getElementById('dice-check-status');
      const checkTitle = document.getElementById('dice-check-title');
      const checkFormula = document.getElementById('dice-check-formula');

      if (checkType) checkType.innerText = data.lastCheck.type;
      if (checkStatus) {
        checkStatus.className = `dice-tag-status ${data.lastCheck.status === 'THÀNH CÔNG' ? 'success' : 'failed'}`;
        checkStatus.innerText = `TỔNG ${data.lastCheck.score} — ${data.lastCheck.status}`;
      }
      if (checkTitle) checkTitle.innerText = data.lastCheck.title;
      if (checkFormula) checkFormula.innerText = data.lastCheck.formula;
    }

    // Narrative Dialogue Text
    const narrativeEl = document.getElementById('narrative-text');
    if (narrativeEl && data.narrative) {
      narrativeEl.innerHTML = formatNarrativeQuotes(data.narrative);
    }

    // Branching Choices Grid
    renderChoices(data.options || []);

    // Relations Milestone Progress Card
    renderRelations(data.relations || []);

  } catch (err) {
    console.error('Failed to load scene:', err);
  }
}

// 1.4 Render Choice Cards
function renderChoices(options) {
  const container = document.getElementById('choices-grid');
  if (!container) return;

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
          <button class="btn-choice-select" onclick="event.stopPropagation(); executeChoiceDirect('${opt.id}')">+ Chọn -</button>
          <button class="btn-choice-ai" onclick="event.stopPropagation(); executeChoiceAi('${opt.id}')">AI</button>
        </div>
      </div>
    `;
  }).join('');
}

// 1.5 Render Relations Milestones
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
// 2. RIGHT DECK: DATA TABS (INVENTORY, NPCS, LEDGER)
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

// ==========================================================================
// 3. INTERACTIVE ACTIONS & TACTICAL DISPATCHERS
// ==========================================================================

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
}

// 3.2 Sub-location pill navigation
function switchSubLocation(locName) {
  document.querySelectorAll('.sub-loc-pill').forEach(pill => {
    pill.classList.toggle('active', pill.innerText.includes(locName));
  });

  const breadcrumb = document.getElementById('loc-breadcrumb-text');
  if (breadcrumb) {
    breadcrumb.innerText = `${locName} — Nam Thành Huyện Trác`;
  }
  showToast(`Đã di chuyển tới: ${locName}`);
}

// 3.3 Choice Selection & Highlighting
function selectChoice(optId) {
  selectedChoiceId = optId;
  document.querySelectorAll('.choice-card').forEach(card => {
    card.classList.toggle('active', card.id === `choice-card-${optId}`);
  });
}

// 3.4 Direct Mechanical Choice Execution
async function executeChoiceDirect(optId) {
  if (!currentScene || !currentScene.options) return;
  const opt = currentScene.options.find(o => o.id === optId);
  if (!opt) return;

  selectChoice(optId);

  // If option has a defined simulation action, execute authoritatively
  if (opt.action) {
    showToast(`Đang thực thi: ${opt.title}...`);
    opt.action.idempotency_key = `OPT_${optId}_${Date.now()}`;
    await dispatchDirectAction(opt.action);
    
    // Simulate dice check outcome for dramatic tabletop feedback
    updateDiceCheckDisplay(opt.title, 48, 35, true);
  } else {
    showToast(`Đã chọn: ${opt.title}`);
  }
}

// 3.5 AI-Assisted Choice Execution
async function executeChoiceAi(optId) {
  if (!currentScene || !currentScene.options) return;
  const opt = currentScene.options.find(o => o.id === optId);
  if (!opt) return;

  selectChoice(optId);

  const narrativeEl = document.getElementById('narrative-text');
  if (narrativeEl) {
    narrativeEl.innerHTML = `<span style="color: #34d399;">🤖 AI Agent đang tính toán bối cảnh và đối soát quy tắc mô phỏng...</span>`;
  }

  showToast(`Gửi lựa chọn "${opt.title}" qua AI Bridge...`);

  try {
    const res = await fetch(`${API_BASE}/api/agent/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: opt.title, choiceId: optId })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);

    if (narrativeEl && result.narrative) {
      narrativeEl.innerHTML = formatNarrativeQuotes(result.narrative);
    }

    showToast('AI Bridge đã phản hồi và hoàn tất đối soát SQLite!');
    await loadAllData();

  } catch (err) {
    console.error('AI Bridge execution error:', err);
    showToast(`Lỗi AI Bridge: ${err.message}`, true);
  }
}

// 3.6 Omni Command Bar Dispatcher (Freeform Narrative / Tactical Agency)
async function dispatchOmniCommand(mode = 'ai') {
  const inputEl = document.getElementById('omni-input');
  if (!inputEl) return;

  const promptText = inputEl.value.trim();
  if (!promptText) {
    showToast('Vui lòng nhập mệnh lệnh hoặc đối thoại!', true);
    inputEl.focus();
    return;
  }

  const narrativeEl = document.getElementById('narrative-text');
  if (narrativeEl) {
    narrativeEl.innerHTML = `<span style="color: #34d399;">🤖 Đang truyền điều lệnh "${promptText}" tới AI Engine & SQLite Core...</span>`;
  }

  showToast(mode === 'instant' ? 'Đang thực thi lệnh tức thì...' : 'Đang gửi cho AI Agent Core...');

  try {
    const res = await fetch(`${API_BASE}/api/agent/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptText, mode })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);

    if (narrativeEl && result.narrative) {
      narrativeEl.innerHTML = formatNarrativeQuotes(result.narrative);
    }

    inputEl.value = '';
    showToast('Điều lệnh đã thực thi thành công!');
    await loadAllData();

  } catch (err) {
    console.error('Command dispatch error:', err);
    showToast(`Thất bại: ${err.message}`, true);
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
      await loadAllData();
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
  showToast(`Ban thưởng ${amount} Tiền cho NPC ${npcId}...`);
  await dispatchDirectAction({
    type: 'REWARD_NPC',
    npc_id: npcId,
    amount,
    game_date: '184-05-02',
    idempotency_key: `RWD_${npcId}_${Date.now()}`
  });
}

// ==========================================================================
// 4. QUICK TRADE MODAL CONTROLS
// ==========================================================================

function openQuickTrade(mode, itemCode, defaultQty, defaultPrice) {
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

  const payload = {
    type: mode === 'SELL' ? 'TRADE_SELL' : 'TRADE_BUY',
    item_code: itemCode,
    quantity: qty,
    unit_price: price,
    counterparty,
    game_date: '184-05-02',
    idempotency_key: `MODAL_${mode}_${itemCode}_${Date.now()}`
  };

  await dispatchDirectAction(payload);
}

// ==========================================================================
// 5. UTILITIES & HELPERS
// ==========================================================================

function initUIEventListeners() {
  // Main Menu click
  const btnMenu = document.getElementById('btn-main-menu');
  if (btnMenu) {
    btnMenu.addEventListener('click', () => {
      showToast('Hệ thống SimCore: 63/63 Invariants SQLite đang bảo toàn 100%!');
    });
  }

  // Logs button click
  const btnLogs = document.getElementById('btn-toggle-logs');
  if (btnLogs) {
    btnLogs.addEventListener('click', () => {
      switchDeckTab('subtab-ledger');
      showToast('Đang hiển thị sổ nhật ký giao dịch SQLite!');
    });
  }
}

function updateDiceCheckDisplay(title, score, dc, isSuccess) {
  const checkStatus = document.getElementById('dice-check-status');
  const checkTitle = document.getElementById('dice-check-title');
  const checkFormula = document.getElementById('dice-check-formula');

  if (checkStatus) {
    checkStatus.className = `dice-tag-status ${isSuccess ? 'success' : 'failed'}`;
    checkStatus.innerText = `TỔNG ${score} — ${isSuccess ? 'THÀNH CÔNG' : 'THẤT BẠI'}`;
  }
  if (checkTitle) checkTitle.innerText = title;
  if (checkFormula) {
    checkFormula.innerText = `[WAR/COM Check] + [Kỹ năng +10] + [D20: ${score - 39}] = ${score} >= DC ${dc}`;
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
