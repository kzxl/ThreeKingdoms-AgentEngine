/**
 * STORY & NARRATIVE CHRONICLE MODULE
 * Renders dialogue turns, narrative markdown, dynamic quick chips, dice badges, delta pills, and relations
 */

let lastEncounterSubLocation = null;

function formatNarrativeQuotes(text) {
  if (!text) return '';
  return text.replace(/"([^"]+)"/g, '<em>"$1"</em>');
}

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

function quickFillPrompt(text) {
  const input = document.getElementById('omni-input');
  if (!input) return;
  input.value = text;
  input.focus();
  showToast(currentLang === 'en' ? `Loaded command: "${text}"` : `Đã nạp chỉ thị: "${text}"`);
}

function renderDynamicQuickChips(location = activeSubLocation) {
  const container = document.getElementById('quick-prompt-chips');
  const targetEl = document.getElementById('locality-target');
  const omniInput = document.getElementById('omni-input');
  const locData = QUICK_CHIPS_DATA[location] || QUICK_CHIPS_DATA['Vườn Đào'];

  if (targetEl) {
    targetEl.innerText = currentLang === 'en' ? locData.presenceEn : locData.presenceVi;
  }

  if (omniInput && !omniInput.value) {
    omniInput.placeholder = currentLang === 'en' ? locData.placeholderEn : locData.placeholderVi;
  }

  if (!container) return;

  container.innerHTML = locData.chips.map(chip => {
    if (chip.divider) {
      return `<span class="chip-divider"></span>`;
    }
    const label = currentLang === 'en' ? chip.labelEn : chip.labelVi;
    const promptText = currentLang === 'en' ? chip.promptEn : chip.promptVi;
    const promptEsc = promptText.replace(/'/g, "\\'");
    return `
      <button class="quick-chip ${chip.type}" onclick="quickFillPrompt('${promptEsc}')">
        ${chip.icon} ${label}
      </button>
    `;
  }).join('');
}

function renderChoices(options) {
  const container = document.getElementById('choices-grid');
  if (!container) return;

  const dict = I18N_DICT[currentLang] || I18N_DICT.vi;

  if (!options || options.length === 0) {
    container.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 11px;">${currentLang === 'en' ? 'No action proposals for current context.' : 'Không có đề xuất hành động cho bối cảnh hiện tại.'}</div>`;
    return;
  }

  container.innerHTML = options.map((opt) => {
    const isSelected = (window.selectedChoiceId === opt.id);
    return `
      <div class="choice-card ${isSelected ? 'active' : ''}" id="choice-card-${opt.id}" onclick="selectChoice('${opt.id}')">
        <div class="choice-icon">${opt.icon || '⚔️'}</div>
        <div class="choice-details">
          <div class="choice-title">${opt.title}</div>
          <div class="choice-desc">${opt.desc}</div>
        </div>
        <div class="choice-actions">
          <button class="btn-choice-select" id="btn-select-${opt.id}" onclick="event.stopPropagation(); executeChoiceDirect('${opt.id}')">${dict.btnSelect}</button>
          <button class="btn-choice-ai" id="btn-ai-${opt.id}" onclick="event.stopPropagation(); executeChoiceAi('${opt.id}')">${dict.btnAi}</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderRelations(relations) {
  const list = document.getElementById('relations-progress-list');
  if (!list) return;

  list.innerHTML = (relations || []).map((rel, idx) => {
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

function renderSceneFromData(data, customNarrative = null) {
  if (!data) return;

  // Dynamic Hierarchical Breadcrumb & Local Walking POIs Navigation
  if (data.campaign && data.campaign.activeSubLocation) {
    activeSubLocation = data.campaign.activeSubLocation;
  }
  renderLocalPoiNav(activeSubLocation);

  // Dynamic Contextual Quick Chips & Locality Banner
  renderDynamicQuickChips(activeSubLocation);

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

function renderAgentSimulationFeedback(reasoning, delta) {
  const thoughtBody = document.getElementById('agent-thought-body');
  if (thoughtBody && reasoning) {
    thoughtBody.innerText = reasoning;
  }

  const chipsContainer = document.getElementById('agent-delta-chips');
  if (chipsContainer && delta) {
    const pills = [];
    if (delta.cash) {
      const isPositive = String(delta.cash).startsWith('+');
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
  if (typeof loadDeckAgentLogs === 'function') {
    loadDeckAgentLogs();
  }
}

// Global exposure
window.lastEncounterSubLocation = lastEncounterSubLocation;
window.formatNarrativeQuotes = formatNarrativeQuotes;
window.formatStoryText = formatStoryText;
window.renderDiceBadgeHtml = renderDiceBadgeHtml;
window.renderDeltaBarHtml = renderDeltaBarHtml;
window.renderReasoningHtml = renderReasoningHtml;
window.renderTurnHtml = renderTurnHtml;
window.appendStoryTurn = appendStoryTurn;
window.renderStoryChronicle = renderStoryChronicle;
window.quickFillPrompt = quickFillPrompt;
window.renderDynamicQuickChips = renderDynamicQuickChips;
window.renderChoices = renderChoices;
window.renderRelations = renderRelations;
window.renderSceneFromData = renderSceneFromData;
window.renderAgentSimulationFeedback = renderAgentSimulationFeedback;
