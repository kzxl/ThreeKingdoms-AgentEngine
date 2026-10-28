/**
 * Tactical Battle UI Component
 * Three Kingdoms Military Simulation
 *
 * Provides client-side modal dialogs and tactical combat reports.
 * Adheres strictly to Anti-AI-Slop standards (AS-01 to AS-12):
 * - 0 emojis (Uses structured badges: [TIEN PHONG], [TRUNG QUAN], [HAU QUAN], [DAI THANG], [THAM BAI])
 * - Tabular figures for casualties, troop counts, and morale percentages
 * - Clean semantic .tactical-* classes and living slate surface tokens
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    Object.assign(root, exports);
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let currentModalCloseCallback = null;

  /**
   * Helper: Resolves badge CSS modifier based on battle outcome
   */
  function getOutcomeBadgeClass(outcome) {
    switch (outcome) {
      case 'DECISIVE_VICTORY':
      case 'TACTICAL_VICTORY':
        return 'tactical-badge--success';
      case 'MARGINAL_VICTORY':
        return 'tactical-badge--primary';
      case 'CRUSHING_DEFEAT':
      case 'TACTICAL_DEFEAT':
        return 'tactical-badge--danger';
      case 'STALEMATE':
      default:
        return 'tactical-badge--warning';
    }
  }

  /**
   * Helper: Formats plain text battle report for logs or console
   */
  function formatTacticalReportText(result) {
    if (!result) return 'Khong co du lieu chien bao.';

    const lines = [];
    lines.push('====================================================');
    lines.push(`CHIEN BAO QUAN SU: ${result.outcomeTitleVi}`);
    lines.push(`Chien dia: ${result.terrainNameVi} | Hiep dau: ${result.totalRounds}/5`);
    lines.push('----------------------------------------------------');
    lines.push(`Phe ta: ${result.attackerArmy?.commander?.name || 'Luc Luong Luong Thi'}`);
    lines.push(`  Xuat quan: ${result.attackerInitialTroops} | Con lai: ${result.attackerFinalTroops} | Ton that: ${result.attackerCasualties}`);
    lines.push(`  Si khi ket tran: ${result.attackerMoraleFinal}%`);
    lines.push(`Phe dich: ${result.defenderArmy?.commander?.name || 'Dich Quan'}`);
    lines.push(`  Xuat quan: ${result.defenderInitialTroops} | Con lai: ${result.defenderFinalTroops} | Ton that: ${result.defenderCasualties}`);
    lines.push(`  Si khi ket tran: ${result.defenderMoraleFinal}%`);
    lines.push('----------------------------------------------------');

    if (result.spoils && (result.spoils.lootCash > 0 || result.spoils.bountyReward > 0)) {
      lines.push('CHIEN LOI PHAM & QUAN CONG:');
      lines.push(`  Tien chien loi pham : +${result.spoils.lootCash.toLocaleString()} Tien`);
      lines.push(`  Tien thuong quan cong: +${result.spoils.bountyReward.toLocaleString()} Tien`);
      lines.push(`  Quan luong thu hoi   : +${result.spoils.capturedGrain} Thach`);
      lines.push('----------------------------------------------------');
    }

    lines.push(`TONG KET: ${result.narrativeSummaryVi}`);
    lines.push('====================================================');

    return lines.join('\n');
  }

  /**
   * Renders the tactical battle report inside a dedicated modal dialog
   */
  function renderTacticalBattleModal(result, onCloseCallback) {
    currentModalCloseCallback = onCloseCallback || null;

    let modalEl = document.getElementById('tactical-battle-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'tactical-battle-modal';
      modalEl.className = 'modal-backdrop hidden';
      document.body.appendChild(modalEl);
    }

    const badgeClass = getOutcomeBadgeClass(result.outcome);
    const spoils = result.spoils || {
      lootCash: 0,
      bountyReward: 0,
      capturedGrain: 0,
      capturedIron: 0,
      capturedEquipment: [],
      prestigeEarned: 0
    };
    const totalReward = spoils.lootCash + spoils.bountyReward;

    // Render Echelon Status Cards
    const renderEchelonColumn = (positionLabel, atkEch, defEch) => {
      const atkRouted = atkEch ? atkEch.isRouted : false;
      const defRouted = defEch ? defEch.isRouted : false;

      const atkBadge = atkRouted
        ? '<span class="tactical-badge tactical-badge--danger">[VO TRAN]</span>'
        : '<span class="tactical-badge tactical-badge--success">[VUNG VANG]</span>';

      const defBadge = defRouted
        ? '<span class="tactical-badge tactical-badge--danger">[VO TRAN]</span>'
        : '<span class="tactical-badge">[GIAO TRANH]</span>';

      return `
        <div class="tactical-card ${atkRouted ? 'tactical-card--danger' : 'tactical-card--accent'}">
          <div class="tactical-card-header">
            <span class="tactical-card-title">${positionLabel}</span>
            <div style="display: flex; gap: 4px;">
              ${atkBadge}
            </div>
          </div>
          <div class="tactical-stat-grid" style="grid-template-columns: 1fr;">
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">Quan ta (Bo/Ky/Cung)</span>
              <span class="tactical-stat-val tactical-stat-val--blue">${atkEch?.currentTotalTroops ?? 0}/${atkEch?.initialTotalTroops ?? 0} (${atkEch?.troops?.infantry ?? 0}/${atkEch?.troops?.cavalry ?? 0}/${atkEch?.troops?.archers ?? 0})</span>
            </div>
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">Si khi quan ta</span>
              <span class="tactical-stat-val ${atkEch?.morale < 30 ? 'tactical-stat-val--red' : 'tactical-stat-val--green'}">${atkEch?.morale ?? 0}%</span>
            </div>
            <div class="tactical-progress-track">
              <div class="tactical-progress-bar ${atkEch?.morale < 30 ? 'tactical-progress-bar--danger' : 'tactical-progress-bar--success'}" style="width: ${Math.max(0, Math.min(100, atkEch?.morale ?? 0))}%;"></div>
            </div>
            <div class="tactical-stat-item" style="border-top: 1px dashed var(--border-subtle); padding-top: 4px; margin-top: 2px;">
              <span class="tactical-stat-label">Dich quan (${defBadge})</span>
              <span class="tactical-stat-val tactical-stat-val--red">${defEch?.currentTotalTroops ?? 0}/${defEch?.initialTotalTroops ?? 0}</span>
            </div>
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">Si khi dich</span>
              <span class="tactical-stat-val">${defEch?.morale ?? 0}%</span>
            </div>
          </div>
        </div>
      `;
    };

    // Render Round Summaries
    const roundsHtml = (result.rounds || []).map((r) => {
      const tacticAttacker = r.attackerTacticTriggered
        ? `<div style="font-size: 11px; color: #fbbf24; margin-bottom: 4px;"><span class="tactical-badge tactical-badge--primary">[KE SACH TA]</span> ${r.attackerTacticTriggered}</div>`
        : '';
      const tacticDefender = r.defenderTacticTriggered
        ? `<div style="font-size: 11px; color: #f87171; margin-bottom: 4px;"><span class="tactical-badge tactical-badge--danger">[KE SACH DICH]</span> ${r.defenderTacticTriggered}</div>`
        : '';

      const clashLogs = (r.clashes || []).map((c) => {
        return `<div style="font-size: 11px; color: var(--text-secondary); padding: 2px 0;">- ${c.logVi}</div>`;
      }).join('');

      return `
        <div class="tactical-card" style="margin-bottom: 8px;">
          <div class="tactical-card-header">
            <span class="tactical-card-title" style="font-size: 12px;">${r.roundTitleVi}</span>
            <span class="tactical-badge">[TON THAT: TA -${r.attackerRoundLosses} | DICH -${r.defenderRoundLosses}]</span>
          </div>
          ${tacticAttacker}
          ${tacticDefender}
          <div style="margin-top: 4px;">
            ${clashLogs}
          </div>
        </div>
      `;
    }).join('');

    // Render Spoils Box
    let spoilsHtml = '';
    if (result.winner === 'ATTACKER' && totalReward > 0) {
      spoilsHtml = `
        <div class="tactical-card tactical-card--success" style="margin-bottom: 12px;">
          <div class="tactical-card-header">
            <span class="tactical-card-title">[CHIEN LOI PHAM & QUAN CONG TRIEU DINH]</span>
            <span class="tactical-badge tactical-badge--success">+${totalReward.toLocaleString()} TIEN</span>
          </div>
          <div class="tactical-stat-grid tactical-stat-grid--3col">
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">Thu hoi thuong doan</span>
              <span class="tactical-stat-val tactical-stat-val--gold">+${spoils.lootCash.toLocaleString()}</span>
            </div>
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">Tien thuong quan cong</span>
              <span class="tactical-stat-val tactical-stat-val--green">+${spoils.bountyReward.toLocaleString()}</span>
            </div>
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">Tich thu quan luong</span>
              <span class="tactical-stat-val tactical-stat-val--blue">+${spoils.capturedGrain} Thach</span>
            </div>
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">Thu giu quang sat</span>
              <span class="tactical-stat-val">+${spoils.capturedIron} Can</span>
            </div>
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">Uy danh quan ngu</span>
              <span class="tactical-stat-val tactical-stat-val--gold">+${spoils.prestigeEarned} Diem</span>
            </div>
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">Chien cu</span>
              <span class="tactical-stat-val">${(spoils.capturedEquipment || []).join(', ') || 'Kiem & Khien'}</span>
            </div>
          </div>
        </div>
      `;
    }

    modalEl.innerHTML = `
      <div class="modal-card" style="max-width: 780px; max-height: 90vh; display: flex; flex-direction: column;">
        <div class="modal-header">
          <div>
            <div class="modal-title">[CHIEN BAO QUAN SU] ${result.outcomeTitleVi}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
              Chien dia: ${result.terrainNameVi} | Hiep dau: ${result.totalRounds}/5 | Ngay: ${new Date(result.timestamp).toLocaleDateString()}
            </div>
          </div>
          <button class="modal-close-btn" onclick="closeTacticalBattleModal()" aria-label="Dong chien bao">[DONG]</button>
        </div>

        <div class="modal-body" style="overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
          <!-- Overall Overview Card -->
          <div class="tactical-card ${result.winner === 'ATTACKER' ? 'tactical-card--success' : 'tactical-card--danger'}">
            <div class="tactical-card-header">
              <span class="tactical-card-title">Ket Qua Chien Dinh</span>
              <span class="tactical-badge ${badgeClass}">${result.outcomeTitleVi}</span>
            </div>
            <div class="tactical-stat-grid tactical-stat-grid--3col">
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Chi huy quan ta</span>
                <span class="tactical-stat-val tactical-stat-val--gold">${result.attackerArmy?.commander?.name || 'Tuong Quan'}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Binh luc ban dau</span>
                <span class="tactical-stat-val">${result.attackerInitialTroops} Quan</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Thuong vong quan ta</span>
                <span class="tactical-stat-val tactical-stat-val--red">-${result.attackerCasualties} (${Math.round((result.attackerCasualties / Math.max(1, result.attackerInitialTroops)) * 100)}%)</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Chi huy dich</span>
                <span class="tactical-stat-val">${result.defenderArmy?.commander?.name || 'Dich Thuong'}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Binh luc dich</span>
                <span class="tactical-stat-val">${result.defenderInitialTroops} Quan</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Dich quan bi diet</span>
                <span class="tactical-stat-val tactical-stat-val--green">-${result.defenderCasualties} (${Math.round((result.defenderCasualties / Math.max(1, result.defenderInitialTroops)) * 100)}%)</span>
              </div>
            </div>
            <div class="tactical-narrative" style="margin-top: 8px;">
              ${result.narrativeSummaryVi}
            </div>
          </div>

          <!-- Spoils of War -->
          ${spoilsHtml}

          <!-- Three Echelons Layout -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
            ${renderEchelonColumn('[TIEN PHONG]', result.attackerArmy?.vanguard, result.defenderArmy?.vanguard)}
            ${renderEchelonColumn('[TRUNG QUAN]', result.attackerArmy?.center, result.defenderArmy?.center)}
            ${renderEchelonColumn('[HAU QUAN]', result.attackerArmy?.rearguard, result.defenderArmy?.rearguard)}
          </div>

          <!-- Round by Round Log -->
          <div style="margin-top: 6px;">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; font-family: var(--font-serif);">
              Dien Bien Cac Hiep Giao Tranh (${result.rounds?.length || 0} Hiep)
            </div>
            ${roundsHtml}
          </div>
        </div>

        <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="tactical-btn tactical-btn--primary" onclick="closeTacticalBattleModal()">
            Xac Nhan Thu Quan
          </button>
        </div>
      </div>
    `;

    modalEl.classList.remove('hidden');
  }

  /**
   * Opens the tactical battle modal for a given battle result
   */
  function openTacticalBattleModal(result, onCloseCallback) {
    if (!result) return;
    renderTacticalBattleModal(result, onCloseCallback);
  }

  /**
   * Closes the active tactical battle modal dialog
   */
  function closeTacticalBattleModal() {
    const modalEl = document.getElementById('tactical-battle-modal');
    if (modalEl) {
      modalEl.classList.add('hidden');
    }
    if (typeof currentModalCloseCallback === 'function') {
      const cb = currentModalCloseCallback;
      currentModalCloseCallback = null;
      cb();
    }
  }

  /**
   * Displays the assault result using tactical modal or falls back gracefully
   */
  function showTacticalAssaultResult(response, onComplete) {
    if (response && response.battleResult) {
      openTacticalBattleModal(response.battleResult, onComplete);
    } else if (response && response.message) {
      if (typeof window.showToast === 'function') {
        window.showToast(response.message, !response.success);
      }
      if (typeof onComplete === 'function') onComplete();
    }
  }

  return {
    renderTacticalBattleModal,
    openTacticalBattleModal,
    closeTacticalBattleModal,
    formatTacticalReportText,
    showTacticalAssaultResult
  };
});
