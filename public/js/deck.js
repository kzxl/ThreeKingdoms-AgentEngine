/**
 * RIGHT DECK MODULE
 * Tab deck handling: Inventory, Retinue/NPCs, Financial Ledger, and Agent Activity Logs
 */

async function loadDeckInventory() {
  try {
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const dict = (typeof I18N_DICT !== 'undefined' && I18N_DICT[currentLang]) ? I18N_DICT[currentLang] : (I18N_DICT?.vi || {});

    const data = await apiFetchInventory();
    currentInventory = data.items || [];
    const tbody = document.getElementById('deck-inventory-tbody');
    if (!tbody) return;

    if (currentInventory.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 12px;">${dict.deckEmptyInv || 'Kho hàng trống'}</td></tr>`;
      return;
    }

    tbody.innerHTML = currentInventory.map(item => {
      const itemCodeEsc = item.item_code.replace(/'/g, "\\'");
      const estSellPrice = item.estimatedSellPrice || Math.max(1, Math.round(item.unit_cost_basis * 1.25));
      const desc = isEn ? (item.description_en || item.description) : item.description;
      return `
        <tr>
          <td><code class="mono" style="font-size: 11px; color: #cbd5e1;">${item.item_code}</code></td>
          <td><span title="${desc}" style="font-weight: 500;">${desc}</span></td>
          <td class="num-col font-bold">${item.quantity.toLocaleString()}</td>
          <td class="num-col">${item.unit_cost_basis.toLocaleString()} ${item.stockPressure === 'SCARCE' ? '<span class="market-shock market-shock--scarce">Khan</span>' : item.stockPressure === 'SURPLUS' ? '<span class="market-shock market-shock--surplus">Dư</span>' : ''}</td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="btn btn-sm btn-gold" onclick="openQuickTrade('SELL', '${itemCodeEsc}', ${Math.min(10, item.quantity)}, ${estSellPrice})">${dict.btnSell || 'Bán'}</button>
            <button class="btn btn-sm btn-outline" onclick="openQuickTrade('BUY', '${itemCodeEsc}', 10, ${item.estimatedBuyPrice || item.unit_cost_basis || 50})">${dict.btnBuy || 'Mua'}</button>
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
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const dict = (typeof I18N_DICT !== 'undefined' && I18N_DICT[currentLang]) ? I18N_DICT[currentLang] : (I18N_DICT?.vi || {});

    const data = await apiFetchNpcs();
    const list = document.getElementById('deck-npcs-list');
    if (!list) return;

    const npcs = data.npcs || [];
    if (npcs.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 12px;">${dict.deckEmptyNpc || 'Chưa có gia nhân trực thuộc'}</div>`;
      return;
    }

    list.innerHTML = npcs.map(npc => {
      const initial = npc.name ? npc.name.charAt(0) : '人';
      const name = isEn ? (npc.name_en || npc.name) : npc.name;
      const role = isEn ? (npc.assigned_role_en || npc.assigned_role || 'Member') : (npc.assigned_role || 'Thành viên');
      const inspectTitle = isEn ? 'Inspect Dossier & Fog of Information' : 'Xem Hồ Sơ & Sương Mù';
      const wageUnit = isEn ? 'quan/mo' : 'quan/tháng';

      return `
        <div class="deck-npc-item">
          <div class="deck-npc-header">
            <div class="deck-npc-title-row">
              <div class="deck-npc-avatar" style="cursor:pointer;" onclick="if(typeof openNpcDossierModal==='function')openNpcDossierModal('${npc.npc_id}')" title="${inspectTitle}">${initial}</div>
              <div>
                <div class="deck-npc-name" style="cursor:pointer; text-decoration: underline dotted;" onclick="if(typeof openNpcDossierModal==='function')openNpcDossierModal('${npc.npc_id}')" title="${inspectTitle}">${name} (${npc.npc_id})</div>
                <div class="deck-npc-role">${role} @ ${npc.assigned_business_id || 'Trác Quận'}</div>
              </div>
            </div>
            <span class="badge" style="font-size: 9px; font-family: var(--font-mono); color: #fbbf24; background: rgba(245, 158, 11, 0.15); border: 1px solid var(--border-gold-subtle); padding: 1px 5px; border-radius: 2px;">
              ${npc.monthly_wage} ${wageUnit}
            </span>
          </div>

          <div class="deck-npc-stats">
            <div class="deck-npc-stat-item">${dict.deckCraAttr || 'Khéo Léo:'} <span>${npc.cra_attr || 50}</span></div>
            <div class="deck-npc-stat-item">${dict.deckMorale || 'Sĩ khí:'} <span class="green-text">${npc.morale || 100}%</span></div>
            <div class="deck-npc-stat-item">${dict.deckLoyalty || 'Trung thành:'} <span class="gold-text">${npc.loyalty || 80}%</span></div>
          </div>

          <div class="deck-npc-footer">
            <span style="color: var(--text-muted); font-size: 11px;">${dict.deckPersonality || 'Tính cách:'} <strong>${npc.personality || 'Chăm chỉ'}</strong></span>
            <button class="btn btn-sm btn-gold" onclick="rewardNpc('${npc.npc_id}', 100)">
              ${dict.btnReward || 'Thưởng 100 Quan'}
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
    const dict = (typeof I18N_DICT !== 'undefined' && I18N_DICT[currentLang]) ? I18N_DICT[currentLang] : (I18N_DICT?.vi || {});
    const data = await apiFetchLedger();
    const list = document.getElementById('deck-transactions-list');
    if (!list) return;

    const cashflow = (data.cashflow || []).slice(0, 15);
    if (cashflow.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 12px;">${dict.deckEmptyLedger || 'Chưa có giao dịch sổ cái'}</div>`;
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
            <span class="deck-txn-amt ${amtColor}">${amtStr} quan</span>
          </div>
          <div class="deck-txn-desc">
            <strong>${txn.category}</strong>: ${txn.memo || txn.counterparty}
          </div>
          <div class="deck-txn-bal">
            ${dict.deckPostBal || 'Số dư sau TXN:'} <strong>${txn.balance.toLocaleString()} quan</strong>
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
    const dict = (typeof I18N_DICT !== 'undefined' && I18N_DICT[currentLang]) ? I18N_DICT[currentLang] : (I18N_DICT?.vi || {});
    const data = await apiFetchAgentLogs();
    const list = document.getElementById('deck-agent-log-list');
    if (!list) return;

    const logs = data.logs || [];
    if (logs.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 12px;">${dict.deckEmptyLogs || 'Chưa có dữ liệu mô phỏng từ Agent'}</div>`;
      return;
    }

    list.innerHTML = logs.map((l, idx) => `
      <div class="deck-agent-log-item ${idx === 0 ? 'highlight' : ''}">
        <div class="deck-agent-log-top">
          <span class="deck-agent-log-type">${l.type}</span>
          <span class="deck-agent-log-time">${l.timestamp}</span>
        </div>
        <div class="deck-agent-log-prompt"><strong>Chỉ thị:</strong> ${l.prompt}</div>
        <div class="deck-agent-log-reason"><strong>Luận cứ:</strong> ${l.reasoning}</div>
        ${l.delta && Object.keys(l.delta).length > 0 ? `
          <div class="deck-agent-log-delta">
            ${Object.entries(l.delta).map(([k, v]) => `${k}: ${v}`).join(' • ')}
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
