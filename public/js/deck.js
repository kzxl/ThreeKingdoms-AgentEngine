/**
 * RIGHT DECK MODULE
 * Tab deck handling: Personal bag, retainers, and the ledger log.
 */

function deckDict() {
  return (typeof I18N_DICT !== 'undefined' && I18N_DICT[currentLang])
    ? I18N_DICT[currentLang]
    : (I18N_DICT?.vi || {});
}

function deckEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function deckBagLocation() {
  if (typeof activeSubLocation !== 'undefined' && activeSubLocation) return activeSubLocation;
  if (typeof window !== 'undefined' && window.activeSubLocation) return window.activeSubLocation;
  return (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'Current settlement' : 'Thành hiện tại';
}

async function loadDeckInventory() {
  try {
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const dict = deckDict();

    const data = await apiFetchInventory();
    currentInventory = data.items || [];
    const tbody = document.getElementById('deck-inventory-tbody');
    if (!tbody) return;

    const locationEl = document.getElementById('deck-bag-location');
    if (locationEl) {
      locationEl.innerText = `${dict.deckBagTitle || 'Túi cá nhân'} • ${deckBagLocation()}`;
    }
    const countEl = document.getElementById('deck-bag-count');
    if (countEl) {
      countEl.innerText = `${currentInventory.length} ${dict.deckBagCount || 'vật phẩm'}`;
    }

    if (currentInventory.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="deck-empty-cell">${dict.deckEmptyInv || 'Túi cá nhân trống'}</td></tr>`;
      return;
    }

    tbody.innerHTML = currentInventory.map(item => {
      const itemCodeEsc = String(item.item_code).replace(/'/g, "\\'");
      const sellPrice = Math.max(1, Math.round(Number(item.estimatedSellPrice || (item.unit_cost_basis * 1.25) || 1)));
      const buyPrice = Math.max(1, Math.round(Number(item.estimatedBuyPrice || item.unit_cost_basis || 50)));
      const name = isEn
        ? (item.name_en || item.description_en || item.description || item.item_code)
        : (item.name_vi || item.description || item.item_code);
      const localQty = Number(item.localQuantity ?? item.quantity ?? 0);
      const unitValue = Number(item.marketPrice || item.estimatedSellPrice || item.unit_cost_basis || 0);
      const totalValue = unitValue > 0 ? Math.round(unitValue * localQty) : 0;
      return `
        <tr>
          <td>
            <div class="deck-item-name" title="${deckEscape(name)}">${deckEscape(name)}</div>
            <div class="deck-item-code">${deckEscape(item.item_code)}</div>
          </td>
          <td class="num-col font-bold">${localQty.toLocaleString()}</td>
          <td class="num-col">${totalValue > 0 ? `${totalValue.toLocaleString()} <span class="deck-item-unit">Quan</span>` : '—'}</td>
          <td class="deck-action-col">
            <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="openQuickTrade('SELL', '${itemCodeEsc}', ${Math.min(10, localQty)}, ${sellPrice})">${dict.btnSell || 'Bán'}</button>
            <button class="ui-btn ui-btn--ghost ui-btn--sm" onclick="openQuickTrade('BUY', '${itemCodeEsc}', 10, ${buyPrice})">${dict.btnBuy || 'Mua'}</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load personal bag:', err);
  }
}

async function loadDeckNpcs() {
  try {
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const dict = deckDict();

    const data = await apiFetchNpcs();
    const list = document.getElementById('deck-npcs-list');
    if (!list) return;

    const npcs = data.npcs || [];
    if (npcs.length === 0) {
      list.innerHTML = `<div class="deck-empty-cell">${dict.deckEmptyNpc || 'Chưa có gia nhân trực thuộc'}</div>`;
      return;
    }

    const cards = npcs.map(npc => {
      const initial = npc.name ? npc.name.charAt(0) : '人';
      const name = isEn ? (npc.name_en || npc.name) : npc.name;
      const role = isEn ? (npc.assigned_role_en || npc.assigned_role || 'Member') : (npc.assigned_role || 'Thành viên');
      const roleText = npc.assigned_business_id
        ? `${role} @ ${npc.assigned_business_id}`
        : (isEn ? 'Unassigned retainer' : 'Gia nhân chưa bổ nhiệm');
      const inspectTitle = isEn ? 'Open dossier & fog of information' : 'Xem hồ sơ & sương mù';

      return `
        <div class="deck-npc-item">
          <div class="deck-npc-header">
            <div class="deck-npc-title-row">
              <div class="deck-npc-avatar" onclick="if(typeof openNpcDossierModal==='function')openNpcDossierModal('${npc.npc_id}')" title="${inspectTitle}">${initial}</div>
              <div class="deck-npc-meta">
                <div class="deck-npc-name" onclick="if(typeof openNpcDossierModal==='function')openNpcDossierModal('${npc.npc_id}')" title="${deckEscape(`${name} (${npc.npc_id})`)}">${deckEscape(name)}</div>
                <div class="deck-npc-role" title="${deckEscape(roleText)}">${deckEscape(roleText)}</div>
              </div>
            </div>
          </div>

          <div class="deck-npc-stats">
            <div class="deck-npc-stat-item">${dict.deckCraAttr || 'Khéo Léo:'} <span>${npc.cra_attr || 50}</span></div>
            <div class="deck-npc-stat-item">${dict.deckMorale || 'Sĩ khí:'} <span class="green-text">${npc.morale || 100}%</span></div>
            <div class="deck-npc-stat-item">${dict.deckLoyalty || 'Trung thành:'} <span class="gold-text">${npc.loyalty || 80}%</span></div>
          </div>

          <div class="deck-npc-footer">
            <span class="deck-npc-personality">${dict.deckPersonality || 'Tính cách:'} <strong>${deckEscape(npc.personality || 'Chăm chỉ')}</strong></span>
            <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="rewardNpc('${npc.npc_id}', 100)">
              ${dict.btnReward || 'Thưởng 100 Quan'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    list.innerHTML = `${cards}<div class="deck-hint">${dict.deckWageNote || 'Lương nhân công được hạch toán trong Sản Nghiệp.'}</div>`;
  } catch (err) {
    console.error('Failed to load retainers:', err);
  }
}

async function loadDeckLedger() {
  try {
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const dict = deckDict();
    const data = await apiFetchLedger();
    const list = document.getElementById('deck-transactions-list');
    if (!list) return;

    const summary = data.summary || {};
    const balanceEl = document.getElementById('deck-log-balance');
    if (balanceEl) balanceEl.innerText = `${Number(summary.balance || 0).toLocaleString()} Quan`;
    const inflowEl = document.getElementById('deck-log-inflow');
    if (inflowEl) inflowEl.innerText = `${dict.deckLogInflow || 'Thu'} +${Number(summary.totalInflow || 0).toLocaleString()}`;
    const outflowEl = document.getElementById('deck-log-outflow');
    if (outflowEl) outflowEl.innerText = `${dict.deckLogOutflow || 'Chi'} -${Number(summary.totalOutflow || 0).toLocaleString()}`;

    const cashflow = (data.cashflow || []).slice(0, 15);
    if (cashflow.length === 0) {
      list.innerHTML = `<div class="deck-empty-cell">${dict.deckEmptyLedger || 'Chưa có giao dịch sổ cái'}</div>`;
      return;
    }

    list.innerHTML = cashflow.map(txn => {
      const isInflow = Number(txn.inflow) > 0;
      const amount = Number(isInflow ? txn.inflow : txn.outflow) || 0;
      const amtStr = isInflow ? `+${amount.toLocaleString()}` : `-${amount.toLocaleString()}`;
      const amtColor = isInflow ? 'green-text' : 'red-text';

      return `
        <div class="deck-txn-item">
          <div class="deck-txn-top">
            <span class="deck-txn-id" title="${deckEscape(txn.txn_id || '')}">${deckEscape(txn.game_date || txn.txn_id || '')}</span>
            <span class="deck-txn-amt ${amtColor}">${amtStr} quan</span>
          </div>
          <div class="deck-txn-desc">
            <strong>${deckEscape(txn.category || '')}</strong>: ${deckEscape(txn.memo || txn.counterparty || '')}
          </div>
          <div class="deck-txn-bal">
            ${dict.deckPostBal || 'Số dư sau TXN:'} <strong>${Number(txn.balance || 0).toLocaleString()} quan</strong>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load ledger log:', err);
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
  if (subtabId === 'subtab-log') loadDeckLedger();
}

// Global exposure
window.currentInventory = currentInventory;
window.loadDeckInventory = loadDeckInventory;
window.loadDeckNpcs = loadDeckNpcs;
window.loadDeckLedger = loadDeckLedger;
window.loadDeckLog = loadDeckLedger;
window.switchDeckTab = switchDeckTab;
