/**
 * RIGHT DECK MODULE
 * Tab deck handling: Inventory, Retinue/NPCs, Financial Ledger, and Agent Activity Logs
 */

async function loadDeckInventory() {
  try {
    const data = await apiFetchInventory();
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

async function loadDeckNpcs() {
  try {
    const data = await apiFetchNpcs();
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
              <div class="deck-npc-avatar" style="cursor:pointer;" onclick="if(typeof openNpcDossierModal==='function')openNpcDossierModal('${npc.npc_id}')" title="Xem Hồ Sơ & Sương Mù">${initial}</div>
              <div>
                <div class="deck-npc-name" style="cursor:pointer; text-decoration: underline dotted;" onclick="if(typeof openNpcDossierModal==='function')openNpcDossierModal('${npc.npc_id}')" title="Xem Hồ Sơ & Sương Mù">${npc.name} (${npc.npc_id})</div>
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

async function loadDeckLedger() {
  try {
    const data = await apiFetchLedger();
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

async function loadDeckAgentLogs() {
  try {
    const data = await apiFetchAgentLogs();
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

// Global exposure
window.currentInventory = currentInventory;
window.loadDeckInventory = loadDeckInventory;
window.loadDeckNpcs = loadDeckNpcs;
window.loadDeckLedger = loadDeckLedger;
window.loadDeckAgentLogs = loadDeckAgentLogs;
window.switchDeckTab = switchDeckTab;
