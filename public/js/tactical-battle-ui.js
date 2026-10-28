/**
 * Tactical Battle UI Component
 * Three Kingdoms Military Simulation
 *
 * Provides client-side modal dialogs and tactical combat reports with full bilingual support.
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

  function isEnglish() {
    return (typeof currentLang !== 'undefined' && currentLang === 'en');
  }

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
    const isEn = isEnglish();

    const outcomeTitle = isEn ? (result.outcomeTitleEn || result.outcomeTitleVi) : result.outcomeTitleVi;
    const terrainName = isEn ? (result.terrainNameEn || result.terrainNameVi) : result.terrainNameVi;
    const summary = isEn ? (result.narrativeSummaryEn || result.narrativeSummaryVi) : result.narrativeSummaryVi;

    const lines = [];
    lines.push('====================================================');
    lines.push(isEn ? `MILITARY BATTLE REPORT: ${outcomeTitle}` : `CHIEN BAO QUAN SU: ${outcomeTitle}`);
    lines.push(isEn ? `Terrain: ${terrainName} | Rounds: ${result.totalRounds}/5` : `Chien dia: ${terrainName} | Hiep dau: ${result.totalRounds}/5`);
    lines.push('----------------------------------------------------');
    lines.push(isEn ? `Allied Army: ${result.attackerArmy?.commander?.name || 'Liang Clan Forces'}` : `Phe ta: ${result.attackerArmy?.commander?.name || 'Luc Luong Luong Thi'}`);
    lines.push(isEn 
      ? `  Deployed: ${result.attackerInitialTroops} | Surviving: ${result.attackerFinalTroops} | Casualties: ${result.attackerCasualties}`
      : `  Xuat quan: ${result.attackerInitialTroops} | Con lai: ${result.attackerFinalTroops} | Ton that: ${result.attackerCasualties}`);
    lines.push(isEn ? `  Final Morale: ${result.attackerMoraleFinal}%` : `  Si khi ket tran: ${result.attackerMoraleFinal}%`);
    lines.push(isEn ? `Enemy Army: ${result.defenderArmy?.commander?.name || 'Enemy Forces'}` : `Phe dich: ${result.defenderArmy?.commander?.name || 'Dich Quan'}`);
    lines.push(isEn 
      ? `  Deployed: ${result.defenderInitialTroops} | Surviving: ${result.defenderFinalTroops} | Casualties: ${result.defenderCasualties}`
      : `  Xuat quan: ${result.defenderInitialTroops} | Con lai: ${result.defenderFinalTroops} | Ton that: ${result.defenderCasualties}`);
    lines.push(isEn ? `  Final Morale: ${result.defenderMoraleFinal}%` : `  Si khi ket tran: ${result.defenderMoraleFinal}%`);
    lines.push('----------------------------------------------------');

    if (result.spoils && (result.spoils.lootCash > 0 || result.spoils.bountyReward > 0)) {
      lines.push(isEn ? 'WAR SPOILS & REWARDS:' : 'CHIEN LOI PHAM & QUAN CONG:');
      lines.push(isEn ? `  Convoy Loot : +${result.spoils.lootCash.toLocaleString()} Qian` : `  Tien chien loi pham : +${result.spoils.lootCash.toLocaleString()} Tien`);
      lines.push(isEn ? `  Court Bounty: +${result.spoils.bountyReward.toLocaleString()} Qian` : `  Tien thuong quan cong: +${result.spoils.bountyReward.toLocaleString()} Tien`);
      lines.push(isEn ? `  Captured Grain: +${result.spoils.capturedGrain} Piculs` : `  Quan luong thu hoi   : +${result.spoils.capturedGrain} Thach`);
      lines.push('----------------------------------------------------');
    }

    lines.push(isEn ? `SUMMARY: ${summary}` : `TONG KET: ${summary}`);
    lines.push('====================================================');

    return lines.join('\n');
  }

  /**
   * Renders the tactical battle report inside a dedicated modal dialog
   */
  function renderTacticalBattleModal(result, onCloseCallback) {
    currentModalCloseCallback = onCloseCallback || null;
    const isEn = isEnglish();

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
        ? `<span class="tactical-badge tactical-badge--danger">${isEn ? '[ROUTED]' : '[VO TRAN]'}</span>`
        : `<span class="tactical-badge tactical-badge--success">${isEn ? '[STEADY]' : '[VUNG VANG]'}</span>`;

      const defBadge = defRouted
        ? `<span class="tactical-badge tactical-badge--danger">${isEn ? '[ROUTED]' : '[VO TRAN]'}</span>`
        : `<span class="tactical-badge">${isEn ? '[ENGAGED]' : '[GIAO TRANH]'}</span>`;

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
              <span class="tactical-stat-label">${isEn ? 'Allied (Inf/Cav/Arc)' : 'Quan ta (Bo/Ky/Cung)'}</span>
              <span class="tactical-stat-val tactical-stat-val--blue">${atkEch?.currentTotalTroops ?? 0}/${atkEch?.initialTotalTroops ?? 0} (${atkEch?.troops?.infantry ?? 0}/${atkEch?.troops?.cavalry ?? 0}/${atkEch?.troops?.archers ?? 0})</span>
            </div>
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">${isEn ? 'Allied Morale' : 'Si khi quan ta'}</span>
              <span class="tactical-stat-val ${atkEch?.morale < 30 ? 'tactical-stat-val--red' : 'tactical-stat-val--green'}">${atkEch?.morale ?? 0}%</span>
            </div>
            <div class="tactical-progress-track">
              <div class="tactical-progress-bar ${atkEch?.morale < 30 ? 'tactical-progress-bar--danger' : 'tactical-progress-bar--success'}" style="width: ${Math.max(0, Math.min(100, atkEch?.morale ?? 0))}%;"></div>
            </div>
            <div class="tactical-stat-item" style="border-top: 1px dashed var(--border-subtle); padding-top: 4px; margin-top: 2px;">
              <span class="tactical-stat-label">${isEn ? 'Enemy Force' : 'Dich quan'} (${defBadge})</span>
              <span class="tactical-stat-val tactical-stat-val--red">${defEch?.currentTotalTroops ?? 0}/${defEch?.initialTotalTroops ?? 0}</span>
            </div>
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">${isEn ? 'Enemy Morale' : 'Si khi dich'}</span>
              <span class="tactical-stat-val">${defEch?.morale ?? 0}%</span>
            </div>
          </div>
        </div>
      `;
    };

    // Render Round Summaries
    const roundsHtml = (result.rounds || []).map((r) => {
      const tacticAttacker = r.attackerTacticTriggered
        ? `<div style="font-size: 11px; color: #fbbf24; margin-bottom: 4px;"><span class="tactical-badge tactical-badge--primary">${isEn ? '[ALLIED TACTIC]' : '[KE SACH TA]'}</span> ${r.attackerTacticTriggered}</div>`
        : '';
      const tacticDefender = r.defenderTacticTriggered
        ? `<div style="font-size: 11px; color: #f87171; margin-bottom: 4px;"><span class="tactical-badge tactical-badge--danger">${isEn ? '[ENEMY TACTIC]' : '[KE SACH DICH]'}</span> ${r.defenderTacticTriggered}</div>`
        : '';

      const clashLogs = (r.clashes || []).map((c) => {
        const text = isEn ? (c.logEn || c.logVi) : c.logVi;
        return `<div style="font-size: 11px; color: var(--text-secondary); padding: 2px 0;">- ${text}</div>`;
      }).join('');

      const roundTitle = isEn ? (r.roundTitleEn || `Round ${r.round}`) : r.roundTitleVi;
      const lossesBadge = isEn
        ? `[LOSSES: ALLY -${r.attackerRoundLosses} | ENEMY -${r.defenderRoundLosses}]`
        : `[TON THAT: TA -${r.attackerRoundLosses} | DICH -${r.defenderRoundLosses}]`;

      return `
        <div class="tactical-card" style="margin-bottom: 8px;">
          <div class="tactical-card-header">
            <span class="tactical-card-title" style="font-size: 12px;">${roundTitle}</span>
            <span class="tactical-badge">${lossesBadge}</span>
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
            <span class="tactical-card-title">${isEn ? '[WAR SPOILS & IMPERIAL REWARD]' : '[CHIEN LOI PHAM & QUAN CONG TRIEU DINH]'}</span>
            <span class="tactical-badge tactical-badge--success">+${totalReward.toLocaleString()} ${isEn ? 'QIAN' : 'TIEN'}</span>
          </div>
          <div class="tactical-stat-grid tactical-stat-grid--3col">
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">${isEn ? 'Recovered convoy funds' : 'Thu hoi thuong doan'}</span>
              <span class="tactical-stat-val tactical-stat-val--gold">+${spoils.lootCash.toLocaleString()}</span>
            </div>
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">${isEn ? 'Imperial bounty merit' : 'Tien thuong quan cong'}</span>
              <span class="tactical-stat-val tactical-stat-val--green">+${spoils.bountyReward.toLocaleString()}</span>
            </div>
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">${isEn ? 'Captured provisions' : 'Tich thu quan luong'}</span>
              <span class="tactical-stat-val tactical-stat-val--blue">+${spoils.capturedGrain} ${isEn ? 'Piculs' : 'Thach'}</span>
            </div>
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">${isEn ? 'Captured iron ore' : 'Thu giu quang sat'}</span>
              <span class="tactical-stat-val">+${spoils.capturedIron} ${isEn ? 'Kin' : 'Can'}</span>
            </div>
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">${isEn ? 'Military prestige' : 'Uy danh quan ngu'}</span>
              <span class="tactical-stat-val tactical-stat-val--gold">+${spoils.prestigeEarned} ${isEn ? 'Pts' : 'Diem'}</span>
            </div>
            <div class="tactical-stat-item">
              <span class="tactical-stat-label">${isEn ? 'Equipment salvaged' : 'Chien cu'}</span>
              <span class="tactical-stat-val">${(spoils.capturedEquipment || []).join(', ') || (isEn ? 'Swords & Shields' : 'Kiem & Khien')}</span>
            </div>
          </div>
        </div>
      `;
    }

    const reportTitle = isEn
      ? `[MILITARY BATTLE REPORT] ${result.outcomeTitleEn || result.outcomeTitleVi}`
      : `[CHIEN BAO QUAN SU] ${result.outcomeTitleVi}`;
    const terrainLabel = isEn ? (result.terrainNameEn || result.terrainNameVi) : result.terrainNameVi;
    const summaryNarrative = isEn ? (result.narrativeSummaryEn || result.narrativeSummaryVi) : result.narrativeSummaryVi;
    const outcomeTitle = isEn ? (result.outcomeTitleEn || result.outcomeTitleVi) : result.outcomeTitleVi;

    modalEl.innerHTML = `
      <div class="modal-card" style="max-width: 780px; max-height: 90vh; display: flex; flex-direction: column;">
        <div class="modal-header">
          <div>
            <div class="modal-title">${reportTitle}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
              ${isEn ? 'Terrain' : 'Chien dia'}: ${terrainLabel} | ${isEn ? 'Rounds' : 'Hiep dau'}: ${result.totalRounds}/5 | ${isEn ? 'Date' : 'Ngay'}: ${new Date(result.timestamp).toLocaleDateString()}
            </div>
          </div>
          <button class="modal-close-btn" onclick="closeTacticalBattleModal()" aria-label="Dong chien bao">${isEn ? '[CLOSE]' : '[DONG]'}</button>
        </div>

        <div class="modal-body" style="overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
          <!-- Overall Overview Card -->
          <div class="tactical-card ${result.winner === 'ATTACKER' ? 'tactical-card--success' : 'tactical-card--danger'}">
            <div class="tactical-card-header">
              <span class="tactical-card-title">${isEn ? 'Battlefield Resolution' : 'Ket Qua Chien Dinh'}</span>
              <span class="tactical-badge ${badgeClass}">${outcomeTitle}</span>
            </div>
            <div class="tactical-stat-grid tactical-stat-grid--3col">
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">${isEn ? 'Allied Commander' : 'Chi huy quan ta'}</span>
                <span class="tactical-stat-val tactical-stat-val--gold">${result.attackerArmy?.commander?.name || (isEn ? 'General' : 'Tuong Quan')}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">${isEn ? 'Allied Force' : 'Binh luc ban dau'}</span>
                <span class="tactical-stat-val">${result.attackerInitialTroops} ${isEn ? 'Troops' : 'Quan'}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">${isEn ? 'Allied Casualties' : 'Thuong vong quan ta'}</span>
                <span class="tactical-stat-val tactical-stat-val--red">-${result.attackerCasualties} (${Math.round((result.attackerCasualties / Math.max(1, result.attackerInitialTroops)) * 100)}%)</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">${isEn ? 'Enemy Commander' : 'Chi huy dich'}</span>
                <span class="tactical-stat-val">${result.defenderArmy?.commander?.name || (isEn ? 'Enemy Leader' : 'Dich Thuong')}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">${isEn ? 'Enemy Force' : 'Binh luc dich'}</span>
                <span class="tactical-stat-val">${result.defenderInitialTroops} ${isEn ? 'Troops' : 'Quan'}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">${isEn ? 'Enemy Neutralized' : 'Dich quan bi diet'}</span>
                <span class="tactical-stat-val tactical-stat-val--green">-${result.defenderCasualties} (${Math.round((result.defenderCasualties / Math.max(1, result.defenderInitialTroops)) * 100)}%)</span>
              </div>
            </div>
            <div class="tactical-narrative" style="margin-top: 8px;">
              ${summaryNarrative}
            </div>
          </div>

          <!-- Spoils of War -->
          ${spoilsHtml}

          <!-- Three Echelons Layout -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
            ${renderEchelonColumn(isEn ? '[VANGUARD]' : '[TIEN PHONG]', result.attackerArmy?.vanguard, result.defenderArmy?.vanguard)}
            ${renderEchelonColumn(isEn ? '[CENTER ARMY]' : '[TRUNG QUAN]', result.attackerArmy?.center, result.defenderArmy?.center)}
            ${renderEchelonColumn(isEn ? '[REARGUARD]' : '[HAU QUAN]', result.attackerArmy?.rearguard, result.defenderArmy?.rearguard)}
          </div>

          <!-- Round by Round Log -->
          <div style="margin-top: 6px;">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; font-family: var(--font-serif);">
              ${isEn ? `Engagement Rounds Progression (${result.rounds?.length || 0} Rounds)` : `Dien Bien Cac Hiep Giao Tranh (${result.rounds?.length || 0} Hiep)`}
            </div>
            ${roundsHtml}
          </div>
        </div>

        <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="tactical-btn tactical-btn--primary" onclick="closeTacticalBattleModal()">
            ${isEn ? 'Confirm & Rally Troops' : 'Xac Nhan Thu Quan'}
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
