/**
 * ThreeKingdoms-AgentEngine: NPC Dossier & Fog of Information Modal
 * (public/js/npc-dossier-modal.js)
 *
 * Implements:
 * - Interactive Strategic Dossier Dialog for any NPC in the realm
 * - Visualizes the 5-Tier Fog of Information (Hidden stats, hobbies, dislikes, secrets)
 * - Direct execution of everyday socio-behavioral interactions with D20 feedback
 *
 * Adheres strictly to Anti-AI-Slop Standard (AS-01 to AS-12) & Grand Strategy UI Tokens.
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

  let activeNpcId = null;

  /**
   * Opens the tactical NPC Dossier Modal and loads intelligence from backend
   */
  async function openNpcDossierModal(npcId) {
    activeNpcId = npcId || 'NPC-0002';

    let modalEl = document.getElementById('npc-dossier-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'npc-dossier-modal';
      modalEl.className = 'modal-backdrop hidden';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-box modal-box--large">
        <div class="modal-header">
          <div class="modal-title">[HO SO CHIEN LUOC] DANG TRA CUU TINH BAO...</div>
          <button class="btn-modal-close" onclick="closeNpcDossierModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 24px; text-align: center; color: var(--text-muted);">
          Dang quet du lieu SQLite va giai ma suong mu thong tin nhan vat...
        </div>
      </div>
    `;
    modalEl.classList.remove('hidden');

    try {
      const res = await fetch(`/api/kizuna/dossier/${encodeURIComponent(activeNpcId)}`);
      const data = await res.json();
      if (!data.success || !data.dossier) {
        throw new Error(data.error || 'Khong tim thay ho so nhan vat');
      }
      renderDossierContent(data.dossier);
    } catch (err) {
      modalEl.innerHTML = `
        <div class="modal-box">
          <div class="modal-header">
            <div class="modal-title">[LOI TINH BAO] KHONG THE TAI HO SO</div>
            <button class="btn-modal-close" onclick="closeNpcDossierModal()">&times;</button>
          </div>
          <div class="modal-body" style="padding: 16px; color: var(--state-danger);">
            ${err.message}
          </div>
        </div>
      `;
    }
  }

  /**
   * Closes the NPC Dossier Modal
   */
  function closeNpcDossierModal() {
    const modalEl = document.getElementById('npc-dossier-modal');
    if (modalEl) modalEl.classList.add('hidden');
    activeNpcId = null;
  }

  /**
   * Renders the complete dossier view with Fog of Information cards
   */
  function renderDossierContent(dossier) {
    const modalEl = document.getElementById('npc-dossier-modal');
    if (!modalEl) return;

    const stats = dossier.stats || {};
    const affinityPct = Math.min(100, Math.max(0, dossier.affinity || 0));
    const respectPct = Math.min(100, Math.max(0, dossier.respect || 0));

    // Resolve Fog Tier Badge Class
    let tierBadgeClass = 'tactical-badge';
    if (dossier.intelLevel >= 4) tierBadgeClass = 'tactical-badge tactical-badge--primary';
    else if (dossier.intelLevel >= 3) tierBadgeClass = 'tactical-badge tactical-badge--success';
    else if (dossier.intelLevel >= 2) tierBadgeClass = 'tactical-badge';
    else tierBadgeClass = 'tactical-badge tactical-badge--warning';

    const hobbiesHtml = (dossier.hobbies || []).map(h => `
      <div class="tactical-stat-item" style="padding: 6px 10px; border-left: 2px solid ${h.isRevealed ? 'var(--brand-primary)' : 'var(--text-muted)'};">
        <span class="tactical-stat-label">${h.isRevealed ? '[SO THICH]' : '[SUONG MU]'}</span>
        <span class="tactical-stat-value" style="font-size: 11px; color: ${h.isRevealed ? 'var(--text-main)' : 'var(--text-muted)'};">
          ${h.labelVi}
        </span>
      </div>
    `).join('');

    const dislikesHtml = (dossier.dislikes || []).map(d => `
      <div class="tactical-stat-item" style="padding: 6px 10px; border-left: 2px solid ${d.isRevealed ? 'var(--state-danger)' : 'var(--text-muted)'};">
        <span class="tactical-stat-label" style="color: ${d.isRevealed ? 'var(--state-danger)' : 'var(--text-muted)'};">${d.isRevealed ? '[CAM KY]' : '[SUONG MU]'}</span>
        <span class="tactical-stat-value" style="font-size: 11px; color: ${d.isRevealed ? 'var(--text-main)' : 'var(--text-muted)'};">
          ${d.labelVi}
        </span>
      </div>
    `).join('');

    modalEl.innerHTML = `
      <div class="modal-box modal-box--large" style="max-width: 760px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="tactical-badge tactical-badge--primary">[HO SO NHAN VAT]</span>
            <div class="modal-title" style="letter-spacing: 0.05em;">${dossier.nameVi} (${dossier.styleNameVi})</div>
          </div>
          <button class="btn-modal-close" onclick="closeNpcDossierModal()">&times;</button>
        </div>

        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
          <!-- 1. Header Profile & Kizuna Overview -->
          <div style="display: grid; grid-template-columns: 80px 1fr 1fr; gap: 16px; background: var(--surface-panel); padding: 12px; border: 1px solid var(--border-neutral);">
            <div style="width: 80px; height: 80px; background: #1a1e2e; border: 1px solid var(--brand-primary); display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: var(--brand-primary); font-family: 'Cinzel', serif;">
              ${dossier.avatarChar}
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--text-main);">${dossier.nameVi}</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">${dossier.positionVi} • ${dossier.locationVi}</div>
              <span class="${tierBadgeClass}">${dossier.intelLevelLabelVi}</span>
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 6px;">Khi sac: <strong style="color: #60a5fa;">${dossier.currentMoodLabelVi}</strong></div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                  <span style="color: var(--text-muted);">Thien cam (Affinity):</span>
                  <span style="font-variant-numeric: tabular-nums; font-weight: bold; color: #34d399;">${affinityPct}/100</span>
                </div>
                <div class="tactical-progress-track">
                  <div class="tactical-progress-fill tactical-progress-fill--primary" style="width: ${affinityPct}%;"></div>
                </div>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                  <span style="color: var(--text-muted);">Kinh trong (Respect):</span>
                  <span style="font-variant-numeric: tabular-nums; font-weight: bold; color: var(--brand-primary);">${respectPct}/100</span>
                </div>
                <div class="tactical-progress-track">
                  <div class="tactical-progress-fill" style="width: ${respectPct}%; background: var(--brand-primary);"></div>
                </div>
              </div>
              <div style="font-size: 10px; color: var(--text-muted); text-align: right;">
                Quan he: <strong>${dossier.relationshipTitleVi}</strong>
              </div>
            </div>
          </div>

          <!-- 2. Six-Axis Attributes with Fog of Information -->
          <div>
            <div style="font-size: 11px; font-weight: bold; letter-spacing: 0.05em; color: var(--brand-primary); margin-bottom: 6px; text-transform: uppercase;">
              [LUC VI THUOC TINH] — SUONG MU TINH BAO:
            </div>
            <div class="tactical-stat-grid" style="grid-template-columns: repeat(6, 1fr);">
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Thong soai</span>
                <span class="tactical-stat-value" style="font-variant-numeric: tabular-nums;">${stats.ldr?.display || '???'}</span>
                <span style="font-size: 9px; color: var(--text-muted);">${stats.ldr?.rankVi || ''}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Vo luc</span>
                <span class="tactical-stat-value" style="font-variant-numeric: tabular-nums; color: #f87171;">${stats.war?.display || '???'}</span>
                <span style="font-size: 9px; color: var(--text-muted);">${stats.war?.rankVi || ''}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Tri luc</span>
                <span class="tactical-stat-value" style="font-variant-numeric: tabular-nums; color: #60a5fa;">${stats.int?.display || '???'}</span>
                <span style="font-size: 9px; color: var(--text-muted);">${stats.int?.rankVi || ''}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Chinh tri</span>
                <span class="tactical-stat-value" style="font-variant-numeric: tabular-nums;">${stats.pol?.display || '???'}</span>
                <span style="font-size: 9px; color: var(--text-muted);">${stats.pol?.rankVi || ''}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Ky nghe</span>
                <span class="tactical-stat-value" style="font-variant-numeric: tabular-nums; color: #34d399;">${stats.cra?.display || '???'}</span>
                <span style="font-size: 9px; color: var(--text-muted);">${stats.cra?.rankVi || ''}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">Thuong vu</span>
                <span class="tactical-stat-value" style="font-variant-numeric: tabular-nums; color: #fbbf24;">${stats.com?.display || '???'}</span>
                <span style="font-size: 9px; color: var(--text-muted);">${stats.com?.rankVi || ''}</span>
              </div>
            </div>
          </div>

          <!-- 3. Psychology, Hobbies & Dislikes -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <div style="font-size: 11px; font-weight: bold; color: var(--text-main); margin-bottom: 6px;">
                [SO THICH & DIEM DAM ME]:
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${hobbiesHtml}
              </div>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: bold; color: var(--state-danger); margin-bottom: 6px;">
                [DIEU CAM KY (DISLIKES)]:
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${dislikesHtml}
              </div>
            </div>
          </div>

          <!-- 4. Ambition & Secrets under Fog -->
          <div style="background: var(--surface-panel); border: 1px solid var(--border-neutral); padding: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: bold; color: var(--brand-primary);">[CHI HUONG & DA TAM THAM KIN]:</span>
              <span style="font-size: 10px; color: var(--text-muted);">${dossier.ambition?.isRevealed ? '[DA KHAI SANG]' : '[KHOA]'}</span>
            </div>
            <div style="font-size: 11px; color: ${dossier.ambition?.isRevealed ? 'var(--text-main)' : 'var(--text-muted)'}; margin-bottom: 8px;">
              ${dossier.ambition?.display || 'Chua ro chi huong'}
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: bold; color: #e879f9;">[BI MAT DOI TU]:</span>
              <span style="font-size: 10px; color: var(--text-muted);">${dossier.secretStory?.isRevealed ? '[DA KHAI SANG]' : '[KHOA]'}</span>
            </div>
            <div style="font-size: 11px; color: ${dossier.secretStory?.isRevealed ? 'var(--text-main)' : 'var(--text-muted)'};">
              ${dossier.secretStory?.display || 'Chua ro bi mat'}
            </div>
          </div>

          <!-- 5. Interactive Action Deck -->
          <div>
            <div style="font-size: 11px; font-weight: bold; color: var(--text-main); margin-bottom: 6px;">
              [HANH DONG GIAO TE DOI THUONG]:
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'TEA_CONVERSE')">
                [MOI TRA DAM DAO] (-5 Tien)
              </button>
              <button class="tactical-btn tactical-btn--primary" onclick="executeDossierAction('${dossier.npcId}', 'BANQUET_DRINK')">
                [ROT RUOU AM THUC] (-30 Tien)
              </button>
              <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'LEARN_MENTOR')">
                [THINH GIAO KY NGHE] (-25 Tien)
              </button>
              <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'SPAR_DEBATE')">
                [LUAN VO SO TAI] (D20 Roll)
              </button>
              <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'GIFT_TREASURE')">
                [TANG LE VAT] (-50 Tien)
              </button>
            </div>
          </div>

          <!-- Dynamic Interaction Feedback Box -->
          <div id="dossier-interaction-feedback" class="hidden" style="background: #111420; border: 1px solid var(--border-neutral); padding: 12px; margin-top: 4px;"></div>
        </div>
      </div>
    `;
  }

  /**
   * Triggers an everyday action directly from the Dossier dialog
   */
  async function executeDossierAction(npcId, actionType) {
    const feedbackEl = document.getElementById('dossier-interaction-feedback');
    if (feedbackEl) {
      feedbackEl.classList.remove('hidden');
      feedbackEl.innerHTML = `<span style="color: var(--brand-primary);">Dang do xuc xac giao te D20...</span>`;
    }

    try {
      const res = await fetch('/api/kizuna/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npcId, actionType })
      });
      const data = await res.json();
      if (!data.success || !data.result) {
        throw new Error(data.error || 'Giao te that bai');
      }

      const r = data.result;
      const dice = r.diceRoll || { total: 15, d20: 10 };
      const outcomeBadge = r.outcome === 'CRITICAL_SUCCESS' 
        ? '<span class="tactical-badge tactical-badge--primary">[DAI HAO]</span>'
        : (r.outcome === 'SUCCESS' ? '<span class="tactical-badge tactical-badge--success">[HOP Y]</span>' : '<span class="tactical-badge">[XA GIAO]</span>');

      if (feedbackEl) {
        feedbackEl.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; gap: 6px; align-items: center;">
              ${outcomeBadge}
              <span style="font-weight: bold; font-size: 12px; color: var(--text-main);">${r.actionTitleVi}</span>
            </div>
            <span style="font-family: monospace; font-size: 11px; color: var(--brand-primary); font-variant-numeric: tabular-nums;">
              [D20: ${dice.total}/20] (Goc: ${dice.d20} + Thuoc tinh: ${dice.statBonus} + So thich: ${dice.hobbyBonus})
            </span>
          </div>
          <div style="font-size: 11px; line-height: 1.5; color: #cbd5e1; margin-bottom: 8px;">
            "${r.dialogueNarrativeVi}"
          </div>
          <div style="font-size: 10px; color: #34d399; display: flex; gap: 12px; font-variant-numeric: tabular-nums;">
            <span>Hao cam: ${r.deltas.affinityChange > 0 ? '+' : ''}${r.deltas.affinityChange}</span>
            <span>Kinh trong: ${r.deltas.respectChange > 0 ? '+' : ''}${r.deltas.respectChange}</span>
            ${r.deltas.cashCost > 0 ? `<span style="color: #f87171;">Chi phi: -${r.deltas.cashCost} Tien</span>` : ''}
            ${r.deltas.newIntelUnlocked ? `<span style="color: var(--brand-primary); font-weight: bold;">Khai sang: ${r.deltas.newIntelUnlocked.join(', ')}</span>` : ''}
          </div>
        `;
      }

      // Re-render dossier with freshly revealed stats & Kizuna
      if (r.updatedDossier) {
        // Keep feedback box content, update the rest
        setTimeout(() => {
          renderDossierContent(r.updatedDossier);
          const newFeedbackEl = document.getElementById('dossier-interaction-feedback');
          if (newFeedbackEl && feedbackEl) {
            newFeedbackEl.innerHTML = feedbackEl.innerHTML;
            newFeedbackEl.classList.remove('hidden');
          }
        }, 1200);
      }

      // If loadAllData is present in app, trigger light status refresh
      if (typeof window.loadAllData === 'function') {
        window.loadAllData().catch(() => {});
      }
    } catch (err) {
      if (feedbackEl) {
        feedbackEl.innerHTML = `<span style="color: var(--state-danger); font-size: 11px;">[LOI]: ${err.message}</span>`;
      }
    }
  }

  // Global exposure
  return {
    openNpcDossierModal,
    closeNpcDossierModal,
    executeDossierAction
  };
});
