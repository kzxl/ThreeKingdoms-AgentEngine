/**
 * ThreeKingdoms-AgentEngine: NPC Dossier & Fog of Information Modal
 * (public/js/npc-dossier-modal.js)
 *
 * Implements:
 * - Interactive Strategic Dossier Dialog for any NPC in the realm
 * - Full bilingual support (VI / EN) dynamically reflecting currentLang
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
  let currentDossierData = null;

  /**
   * Helper: Resolves active language safely
   */
  function isEnglish() {
    return (typeof currentLang !== 'undefined' && currentLang === 'en');
  }

  /**
   * Opens the tactical NPC Dossier Modal and loads intelligence from backend
   */
  async function openNpcDossierModal(npcId) {
    activeNpcId = npcId || 'NPC-0002';
    const isEn = isEnglish();

    let modalEl = document.getElementById('npc-dossier-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'npc-dossier-modal';
      modalEl.className = 'modal-backdrop hidden';
      document.body.appendChild(modalEl);
    }

    const loadingTitle = isEn
      ? '[STRATEGIC DOSSIER] RETRIEVING INTELLIGENCE...'
      : '[HỒ SƠ CHIẾN LƯỢC] ĐANG TRA CỨU TÌNH BÁO...';
    const loadingBody = isEn
      ? 'Scanning SQLite database records and decrypting persona fog of information...'
      : 'Đang quét dữ liệu SQLite và giải mã sương mù thông tin nhân vật...';

    modalEl.innerHTML = `
      <div class="modal-box modal-box--large">
        <div class="modal-header">
          <div class="modal-title">${loadingTitle}</div>
          <button class="btn-modal-close" onclick="closeNpcDossierModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 24px; text-align: center; color: var(--text-muted);">
          ${loadingBody}
        </div>
      </div>
    `;
    modalEl.classList.remove('hidden');

    try {
      const res = await fetch(`/api/kizuna/dossier/${encodeURIComponent(activeNpcId)}`);
      const data = await res.json();
      if (!data.success || !data.dossier) {
        throw new Error(data.error || (isEn ? 'Character dossier not found' : 'Không tìm thấy hồ sơ nhân vật'));
      }
      currentDossierData = data.dossier;
      renderDossierContent(currentDossierData);
    } catch (err) {
      const errTitle = isEn ? '[INTEL ERROR] FAILED TO LOAD DOSSIER' : '[LỖI TÌNH BÁO] KHÔNG THỂ TẢI HỒ SƠ';
      modalEl.innerHTML = `
        <div class="modal-box">
          <div class="modal-header">
            <div class="modal-title">${errTitle}</div>
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
    currentDossierData = null;
  }

  /**
   * Renders the complete dossier view with Fog of Information cards
   */
  function renderDossierContent(dossier) {
    if (!dossier) return;
    currentDossierData = dossier;

    const modalEl = document.getElementById('npc-dossier-modal');
    if (!modalEl) return;

    const isEn = isEnglish();
    const stats = dossier.stats || {};
    const affinityPct = Math.min(100, Math.max(0, dossier.affinity || 0));
    const respectPct = Math.min(100, Math.max(0, dossier.respect || 0));

    // Resolve Fog Tier Badge Class
    let tierBadgeClass = 'tactical-badge';
    if (dossier.intelLevel >= 4) tierBadgeClass = 'tactical-badge tactical-badge--primary';
    else if (dossier.intelLevel >= 3) tierBadgeClass = 'tactical-badge tactical-badge--success';
    else if (dossier.intelLevel >= 2) tierBadgeClass = 'tactical-badge';
    else tierBadgeClass = 'tactical-badge tactical-badge--warning';

    const charName = isEn ? (dossier.nameEn || dossier.nameVi) : dossier.nameVi;
    const styleName = isEn ? (dossier.styleNameEn || dossier.styleNameVi || 'Style unrecorded') : (dossier.styleNameVi || 'Chưa rõ tự');
    const position = isEn ? (dossier.positionEn || dossier.positionVi || 'Local Champion') : (dossier.positionVi || 'Hào Kiệt Bản Địa');
    const location = isEn ? (dossier.locationEn || dossier.locationVi || 'LOC-0001') : (dossier.locationVi || 'LOC-0001');
    const tierLabel = isEn ? (dossier.intelLevelLabelEn || dossier.intelLevelLabelVi) : dossier.intelLevelLabelVi;
    const moodLabel = isEn ? (dossier.currentMoodLabelEn || dossier.currentMoodLabelVi) : dossier.currentMoodLabelVi;
    const relTitle = isEn ? (dossier.relationshipTitleEn || dossier.relationshipTitleVi) : dossier.relationshipTitleVi;

    const hobbiesHtml = (dossier.hobbies || []).map(h => {
      const tagText = isEn ? (h.isRevealed ? '[PASSION]' : '[FOG]') : (h.isRevealed ? '[SỞ THÍCH]' : '[SƯƠNG MÙ]');
      const labelText = isEn ? (h.labelEn || h.labelVi) : h.labelVi;
      return `
        <div class="tactical-stat-item" style="padding: 6px 10px; border-left: 2px solid ${h.isRevealed ? 'var(--brand-primary)' : 'var(--text-muted)'};">
          <span class="tactical-stat-label">${tagText}</span>
          <span class="tactical-stat-value" style="font-size: 11px; color: ${h.isRevealed ? 'var(--text-main)' : 'var(--text-muted)'};">
            ${labelText}
          </span>
        </div>
      `;
    }).join('');

    const dislikesHtml = (dossier.dislikes || []).map(d => {
      const tagText = isEn ? (d.isRevealed ? '[TABOO]' : '[FOG]') : (d.isRevealed ? '[CẤM KỴ]' : '[SƯƠNG MÙ]');
      const labelText = isEn ? (d.labelEn || d.labelVi) : d.labelVi;
      return `
        <div class="tactical-stat-item" style="padding: 6px 10px; border-left: 2px solid ${d.isRevealed ? 'var(--state-danger)' : 'var(--text-muted)'};">
          <span class="tactical-stat-label" style="color: ${d.isRevealed ? 'var(--state-danger)' : 'var(--text-muted)'};">${tagText}</span>
          <span class="tactical-stat-value" style="font-size: 11px; color: ${d.isRevealed ? 'var(--text-main)' : 'var(--text-muted)'};">
            ${labelText}
          </span>
        </div>
      `;
    }).join('');

    const ambitionStatus = isEn
      ? (dossier.ambition?.isRevealed ? '[UNVEILED]' : '[LOCKED]')
      : (dossier.ambition?.isRevealed ? '[ĐÃ KHAI SÁNG]' : '[KHÓA]');
    const ambitionText = isEn
      ? (dossier.ambition?.displayEn || dossier.ambition?.display || 'Aspiration unrevealed')
      : (dossier.ambition?.displayVi || dossier.ambition?.display || 'Chưa rõ chí hướng');

    const secretsStatus = isEn
      ? (dossier.secretStory?.isRevealed ? '[UNVEILED]' : '[LOCKED]')
      : (dossier.secretStory?.isRevealed ? '[ĐÃ KHAI SÁNG]' : '[KHÓA]');
    const secretText = isEn
      ? (dossier.secretStory?.displayEn || dossier.secretStory?.display || 'Private secrets unrevealed')
      : (dossier.secretStory?.displayVi || dossier.secretStory?.display || 'Chưa rõ bí mật');

    const modalTitleBadge = isEn ? '[NPC DOSSIER]' : '[HỒ SƠ NHÂN VẬT]';
    const ldrRank = isEn ? (stats.ldr?.rankEn || stats.ldr?.rankVi || '') : (stats.ldr?.rankVi || '');
    const warRank = isEn ? (stats.war?.rankEn || stats.war?.rankVi || '') : (stats.war?.rankVi || '');
    const intRank = isEn ? (stats.int?.rankEn || stats.int?.rankVi || '') : (stats.int?.rankVi || '');
    const polRank = isEn ? (stats.pol?.rankEn || stats.pol?.rankVi || '') : (stats.pol?.rankVi || '');
    const craRank = isEn ? (stats.cra?.rankEn || stats.cra?.rankVi || '') : (stats.cra?.rankVi || '');
    const comRank = isEn ? (stats.com?.rankEn || stats.com?.rankVi || '') : (stats.com?.rankVi || '');

    const ldrDisp = isEn ? (stats.ldr?.displayEn || stats.ldr?.display || '???') : (stats.ldr?.displayVi || stats.ldr?.display || '???');
    const warDisp = isEn ? (stats.war?.displayEn || stats.war?.display || '???') : (stats.war?.displayVi || stats.war?.display || '???');
    const intDisp = isEn ? (stats.int?.displayEn || stats.int?.display || '???') : (stats.int?.displayVi || stats.int?.display || '???');
    const polDisp = isEn ? (stats.pol?.displayEn || stats.pol?.display || '???') : (stats.pol?.displayVi || stats.pol?.display || '???');
    const craDisp = isEn ? (stats.cra?.displayEn || stats.cra?.display || '???') : (stats.cra?.displayVi || stats.cra?.display || '???');
    const comDisp = isEn ? (stats.com?.displayEn || stats.com?.display || '???') : (stats.com?.displayVi || stats.com?.display || '???');

    modalEl.innerHTML = `
      <div class="modal-box modal-box--large" style="max-width: 760px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="tactical-badge tactical-badge--primary">${modalTitleBadge}</span>
            <div class="modal-title" style="letter-spacing: 0.05em;">${charName} (${styleName})</div>
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
              <div style="font-size: 14px; font-weight: 600; color: var(--text-main);">${charName}</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">${position} • ${location}</div>
              <span class="${tierBadgeClass}">${tierLabel}</span>
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 6px;">
                ${isEn ? 'Mood:' : 'Khí sắc:'} <strong style="color: #60a5fa;">${moodLabel}</strong>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                  <span style="color: var(--text-muted);">${isEn ? 'Affinity:' : 'Thiện cảm:'}</span>
                  <span style="font-variant-numeric: tabular-nums; font-weight: bold; color: #34d399;">${affinityPct}/100</span>
                </div>
                <div class="tactical-progress-track">
                  <div class="tactical-progress-fill tactical-progress-fill--primary" style="width: ${affinityPct}%;"></div>
                </div>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                  <span style="color: var(--text-muted);">${isEn ? 'Respect:' : 'Kính trọng:'}</span>
                  <span style="font-variant-numeric: tabular-nums; font-weight: bold; color: var(--brand-primary);">${respectPct}/100</span>
                </div>
                <div class="tactical-progress-track">
                  <div class="tactical-progress-fill" style="width: ${respectPct}%; background: var(--brand-primary);"></div>
                </div>
              </div>
              <div style="font-size: 10px; color: var(--text-muted); text-align: right;">
                ${isEn ? 'Relationship:' : 'Quan hệ:'} <strong>${relTitle}</strong>
              </div>
            </div>
          </div>

          <!-- 2. Six-Axis Attributes with Fog of Information -->
          <div>
            <div style="font-size: 11px; font-weight: bold; letter-spacing: 0.05em; color: var(--brand-primary); margin-bottom: 6px; text-transform: uppercase;">
              ${isEn ? '[HEXAGONAL ATTRIBUTES] — FOG OF INFORMATION:' : '[LỤC VỊ THUỘC TÍNH] — SƯƠNG MÙ TÌNH BÁO:'}
            </div>
            <div class="tactical-stat-grid" style="grid-template-columns: repeat(6, 1fr);">
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">${isEn ? 'Command' : 'Thống soái'}</span>
                <span class="tactical-stat-value" style="font-variant-numeric: tabular-nums;">${ldrDisp}</span>
                <span style="font-size: 9px; color: var(--text-muted);">${ldrRank}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">${isEn ? 'Warfare' : 'Võ lực'}</span>
                <span class="tactical-stat-value" style="font-variant-numeric: tabular-nums; color: #f87171;">${warDisp}</span>
                <span style="font-size: 9px; color: var(--text-muted);">${warRank}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">${isEn ? 'Strategy' : 'Trí lực'}</span>
                <span class="tactical-stat-value" style="font-variant-numeric: tabular-nums; color: #60a5fa;">${intDisp}</span>
                <span style="font-size: 9px; color: var(--text-muted);">${intRank}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">${isEn ? 'Politics' : 'Chính trị'}</span>
                <span class="tactical-stat-value" style="font-variant-numeric: tabular-nums;">${polDisp}</span>
                <span style="font-size: 9px; color: var(--text-muted);">${polRank}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">${isEn ? 'Craft' : 'Kỹ nghệ'}</span>
                <span class="tactical-stat-value" style="font-variant-numeric: tabular-nums; color: #34d399;">${craDisp}</span>
                <span style="font-size: 9px; color: var(--text-muted);">${craRank}</span>
              </div>
              <div class="tactical-stat-item">
                <span class="tactical-stat-label">${isEn ? 'Commerce' : 'Thương vụ'}</span>
                <span class="tactical-stat-value" style="font-variant-numeric: tabular-nums; color: #fbbf24;">${comDisp}</span>
                <span style="font-size: 9px; color: var(--text-muted);">${comRank}</span>
              </div>
            </div>
          </div>

          <!-- 3. Psychology, Hobbies & Dislikes -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <div style="font-size: 11px; font-weight: bold; color: var(--text-main); margin-bottom: 6px;">
                ${isEn ? '[HOBBIES & PASSIONS]:' : '[SỞ THÍCH & ĐIỂM ĐAM MÊ]:'}
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${hobbiesHtml}
              </div>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: bold; color: var(--state-danger); margin-bottom: 6px;">
                ${isEn ? '[TABOOS & DISLIKES]:' : '[ĐIỀU CẤM KỴ (DISLIKES)]: '}
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${dislikesHtml}
              </div>
            </div>
          </div>

          <!-- 4. Ambition & Secrets under Fog -->
          <div style="background: var(--surface-panel); border: 1px solid var(--border-neutral); padding: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: bold; color: var(--brand-primary);">
                ${isEn ? '[AMBITION & HIDDEN ASPIRATION]:' : '[CHÍ HƯỚNG & DÃ TÂM THẦM KÍN]:'}
              </span>
              <span style="font-size: 10px; color: var(--text-muted);">${ambitionStatus}</span>
            </div>
            <div style="font-size: 11px; color: ${dossier.ambition?.isRevealed ? 'var(--text-main)' : 'var(--text-muted)'}; margin-bottom: 8px;">
              ${ambitionText}
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: bold; color: #e879f9;">
                ${isEn ? '[PRIVATE SECRETS]:' : '[BÍ MẬT ĐỜI TƯ]:'}
              </span>
              <span style="font-size: 10px; color: var(--text-muted);">${secretsStatus}</span>
            </div>
            <div style="font-size: 11px; color: ${dossier.secretStory?.isRevealed ? 'var(--text-main)' : 'var(--text-muted)'};">
              ${secretText}
            </div>
          </div>

          <!-- 5. Interactive Action Deck -->
          <div>
            <div style="font-size: 11px; font-weight: bold; color: var(--text-main); margin-bottom: 6px;">
              ${isEn ? '[DAILY SOCIAL INTERACTIONS]:' : '[HÀNH ĐỘNG GIAO TẾ ĐỜI THƯỜNG]:'}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'TEA_CONVERSE')">
                ${isEn ? '[OFFER TEA & CONVERSE] (-5 Qian)' : '[MỜI TRÀ ĐÀM ĐẠO] (-5 Tiền)'}
              </button>
              <button class="tactical-btn tactical-btn--primary" onclick="executeDossierAction('${dossier.npcId}', 'BANQUET_DRINK')">
                ${isEn ? '[HOST WINE BANQUET] (-30 Qian)' : '[RÓT RƯỢU ẨM THỰC] (-30 Tiền)'}
              </button>
              <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'LEARN_MENTOR')">
                ${isEn ? '[SEEK MENTORSHIP] (-25 Qian)' : '[THỈNH GIÁO KỸ NGHỆ] (-25 Tiền)'}
              </button>
              <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'SPAR_DEBATE')">
                ${isEn ? '[SPAR & DEBATE] (D20 Check)' : '[LUẬN VÕ SO TÀI] (Kiểm tra D20)'}
              </button>
              <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'GIFT_TREASURE')">
                ${isEn ? '[PRESENT GIFT] (-50 Qian)' : '[TẶNG LỄ VẬT] (-50 Tiền)'}
              </button>
              <button class="tactical-btn" onclick="executeDossierAction('${dossier.npcId}', 'HEART_CONFESSION')">
                ${isEn ? '[CONFIDE AMBITION]' : '[TÂM SỰ HOÀI BÃO]'}
              </button>
            </div>
          </div>

          <!-- Dynamic Interaction Feedback Box -->
          <div id="dossier-interaction-feedback" class="hidden" style="background: #111420; border: 1px solid var(--border-neutral); padding: 12px; margin-top: 4px;"></div>

          <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
            <button class="tactical-btn" onclick="closeNpcDossierModal()">
              ${isEn ? 'Close Dossier' : 'Đóng Hồ Sơ'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Triggers an everyday action directly from the Dossier dialog
   */
  async function executeDossierAction(npcId, actionType) {
    const isEn = isEnglish();
    const feedbackEl = document.getElementById('dossier-interaction-feedback');
    if (feedbackEl) {
      feedbackEl.classList.remove('hidden');
      feedbackEl.innerHTML = `<span style="color: var(--brand-primary);">${isEn ? 'Rolling D20 social check...' : 'Đang đổ xúc xắc giao tế D20...'}</span>`;
    }

    try {
      const res = await fetch('/api/kizuna/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npcId, actionType })
      });
      const data = await res.json();
      if (!data.success || !data.result) {
        throw new Error(data.error || (isEn ? 'Interaction failed' : 'Giao tế thất bại'));
      }

      const r = data.result;
      const dice = r.diceRoll || { total: 15, d20: 10, statBonus: 2, hobbyBonus: 3 };

      let outcomeBadge = '<span class="tactical-badge">[COURTESY]</span>';
      if (r.outcome === 'CRITICAL_SUCCESS') {
        outcomeBadge = `<span class="tactical-badge tactical-badge--primary">${isEn ? '[RESOUNDING SUCCESS]' : '[ĐẠI HẢO]'}</span>`;
      } else if (r.outcome === 'SUCCESS') {
        outcomeBadge = `<span class="tactical-badge tactical-badge--success">${isEn ? '[HARMONY]' : '[HỢP Ý]'}</span>`;
      } else if (r.outcome === 'AWKWARD') {
        outcomeBadge = `<span class="tactical-badge tactical-badge--warning">${isEn ? '[DISCORD]' : '[LẠC QUẺ]'}</span>`;
      } else if (r.outcome === 'CRITICAL_FAILURE') {
        outcomeBadge = `<span class="tactical-badge tactical-badge--danger">${isEn ? '[GRAVE TABOO]' : '[PHẠM HÚY]'}</span>`;
      } else {
        outcomeBadge = `<span class="tactical-badge">${isEn ? '[COURTESY]' : '[XÃ GIAO]'}</span>`;
      }

      const actionTitle = isEn ? (r.actionTitleEn || r.actionTitleVi) : r.actionTitleVi;
      const dialogueText = isEn ? (r.dialogueNarrativeEn || r.dialogueNarrativeVi) : r.dialogueNarrativeVi;
      const formulaStr = isEn
        ? `[D20: ${dice.total}/20] (Base: ${dice.d20} + Stat: ${dice.statBonus} + Hobby: ${dice.hobbyBonus})`
        : `[D20: ${dice.total}/20] (Gốc: ${dice.d20} + Thuộc tính: ${dice.statBonus} + Sở thích: ${dice.hobbyBonus})`;

      const affinityLabel = isEn ? 'Affinity:' : 'Hảo cảm:';
      const respectLabel = isEn ? 'Respect:' : 'Kính trọng:';
      const costStr = r.deltas.cashCost > 0
        ? `<span style="color: #f87171;">${isEn ? 'Cost:' : 'Chi phí:'} -${r.deltas.cashCost} ${isEn ? 'Qian' : 'Tiền'}</span>`
        : '';
      const intelStr = r.deltas.newIntelUnlocked
        ? `<span style="color: var(--brand-primary); font-weight: bold;">${isEn ? 'Unveiled:' : 'Khai sáng:'} ${r.deltas.newIntelUnlocked.join(', ')}</span>`
        : '';

      if (feedbackEl) {
        feedbackEl.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; gap: 6px; align-items: center;">
              ${outcomeBadge}
              <span style="font-weight: bold; font-size: 12px; color: var(--text-main);">${actionTitle}</span>
            </div>
            <span style="font-family: monospace; font-size: 11px; color: var(--brand-primary); font-variant-numeric: tabular-nums;">
              ${formulaStr}
            </span>
          </div>
          <div style="font-size: 11px; line-height: 1.5; color: #cbd5e1; margin-bottom: 8px;">
            "${dialogueText}"
          </div>
          <div style="font-size: 10px; color: #34d399; display: flex; gap: 12px; font-variant-numeric: tabular-nums;">
            <span>${affinityLabel} ${r.deltas.affinityChange > 0 ? '+' : ''}${r.deltas.affinityChange}</span>
            <span>${respectLabel} ${r.deltas.respectChange > 0 ? '+' : ''}${r.deltas.respectChange}</span>
            ${costStr}
            ${intelStr}
          </div>
        `;
      }

      // Re-render dossier with freshly revealed stats & Kizuna
      if (r.updatedDossier) {
        currentDossierData = r.updatedDossier;
        setTimeout(() => {
          renderDossierContent(currentDossierData);
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
        feedbackEl.innerHTML = `<span style="color: var(--state-danger); font-size: 11px;">[${isEn ? 'ERROR' : 'LỖI'}]: ${err.message}</span>`;
      }
    }
  }

  /**
   * Re-renders active dossier modal when language toggles
   */
  function renderCurrentNpcDossier() {
    const modalEl = document.getElementById('npc-dossier-modal');
    if (modalEl && !modalEl.classList.contains('hidden') && currentDossierData) {
      renderDossierContent(currentDossierData);
    }
  }

  // Global exposure
  return {
    openNpcDossierModal,
    closeNpcDossierModal,
    executeDossierAction,
    renderCurrentNpcDossier
  };
});
