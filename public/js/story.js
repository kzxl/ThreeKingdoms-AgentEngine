/**
 * STORY & NARRATIVE CHRONICLE MODULE
 * Renders dialogue turns, narrative markdown, dynamic quick chips, dice badges, delta pills, and relations
 */

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
  // Suppress intrusive dice formulas and roll metrics per user roleplay focus
  return '';
}

function renderDeltaBarHtml(delta) {
  if (!delta || Object.keys(delta).length === 0) return '';
  const pills = [];
  if (delta.cash) {
    const isPositive = String(delta.cash).startsWith('+');
    pills.push(`<span class="agent-delta-pill ${isPositive ? 'cash-plus' : 'cash-minus'}">Tiền: ${delta.cash}</span>`);
  }
  if (delta.inventory) {
    pills.push(`<span class="agent-delta-pill inv">Kho: ${delta.inventory}</span>`);
  }
  if (delta.relations || delta.npc) {
    pills.push(`<span class="agent-delta-pill rel">Hảo cảm: ${delta.relations || delta.npc}</span>`);
  }
  if (delta.location) {
    pills.push(`<span class="agent-delta-pill rel">Địa điểm: ${delta.location}</span>`);
  }
  if (delta.action) {
    pills.push(`<span class="agent-delta-pill rel">Hành động: ${delta.action}</span>`);
  }
  if (delta.audit) {
    pills.push(`<span class="agent-delta-pill rel">Khớp: ${delta.audit}</span>`);
  }
  if (pills.length === 0) return '';
  return `<div class="story-delta-bar">${pills.join('')}</div>`;
}

function renderReasoningHtml(reasoning) {
  // Suppress internal agent reasoning from story view
  return '';
}

function resolveNpcIdFromName(name) {
  if (!name) return 'NPC-0002';
  const n = name.toLowerCase();
  if (n.includes('phi') || n.includes('dực đức') || n.includes('zhang fei') || n.includes('yide')) return 'NPC-0002';
  if (n.includes('vũ') || n.includes('vân trường') || n.includes('guan yu') || n.includes('yunchang')) return 'NPC-0003';
  if (n.includes('bị') || n.includes('huyền đức') || n.includes('liu bei') || n.includes('xuande')) return 'NPC-0001';
  if (n.includes('thực') || n.includes('tử cán') || n.includes('lu zhi') || n.includes('zigan')) return 'NPC-0012';
  if (n.includes('bảo') || n.includes('trần bảo') || n.includes('chen bao')) return 'NPC-0007';
  if (n.includes('toản') || n.includes('bá khuê') || n.includes('gongsun zan')) return 'NPC-0060';
  if (n.includes('cảnh') || n.includes('cung cảnh') || n.includes('gong jing')) return 'NPC-0011';
  if (n.includes('vân') || n.includes('tử long') || n.includes('zhao yun') || n.includes('zilong')) return 'NPC-0024';
  if (n.includes('lượng') || n.includes('khổng minh') || n.includes('zhuge') || n.includes('kongming')) return 'NPC-0025';
  if (n.includes('thống') || n.includes('sĩ nguyên') || n.includes('pang tong')) return 'NPC-0026';
  return 'NPC-0002';
}

function handleSpeakerClick(speaker) {
  if (typeof openNpcDossierModal === 'function') {
    const npcId = resolveNpcIdFromName(speaker);
    openNpcDossierModal(npcId);
  }
}

function renderTurnHtml(turn) {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const inspectTitle = isEn ? 'Inspect Dossier & Fog of Information' : 'Xem Hồ Sơ & Sương Mù';
  const diceHtml = renderDiceBadgeHtml(turn.diceBadge);
  const deltaHtml = renderDeltaBarHtml(turn.deltas);
  const reasoningHtml = renderReasoningHtml(turn.reasoning);
  const formattedText = formatStoryText(turn.text);
  const speakerEsc = (turn.speaker || '').replace(/'/g, "\\'");

  return `
    <div class="story-turn ${turn.type || 'npc'}" id="turn-${turn.id}">
      <div class="story-turn-avatar" onclick="handleSpeakerClick('${speakerEsc}')" style="cursor: pointer;" title="${inspectTitle}">${turn.avatar || (turn.type === 'player' ? '梁' : '漢')}</div>
      <div class="story-turn-content">
        <div class="story-turn-header">
          <div>
            <span class="story-speaker-name" onclick="handleSpeakerClick('${speakerEsc}')" style="cursor: pointer;" title="${inspectTitle}">${turn.speaker || (isEn ? 'Figure' : 'Nhân Vật')}</span>
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

function saveStoryChronicle() {
  try {
    const toSave = storyChronicle.slice(-100);
    localStorage.setItem('sim_story_chronicle', JSON.stringify(toSave));
    localStorage.setItem('sim_active_subloc', activeSubLocation);
    if (lastEncounterSubLocation) {
      localStorage.setItem('sim_last_encounter_subloc', lastEncounterSubLocation);
    }
  } catch (e) {
    console.warn('Failed to save story chronicle to localStorage:', e);
  }
}

function restoreAgentThoughtFromHistory() {
  for (let i = storyChronicle.length - 1; i >= 0; i--) {
    const t = storyChronicle[i];
    if (t.reasoning || t.deltas) {
      renderAgentSimulationFeedback(t.reasoning, t.deltas);
      break;
    }
  }
}

function loadStoryChronicleFromStorage() {
  try {
    const raw = localStorage.getItem('sim_story_chronicle');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        storyChronicle.length = 0;
        storyChronicle.push(...list);
        renderStoryChronicle();
        restoreAgentThoughtFromHistory();
        return true;
      }
    }
  } catch (e) {
    console.warn('Failed to load sim_story_chronicle from localStorage:', e);
  }
  return false;
}

async function clearStoryChronicle() {
  storyChronicle.length = 0;
  localStorage.removeItem('sim_story_chronicle');
  localStorage.removeItem('sim_last_encounter_subloc');
  lastEncounterSubLocation = null;
  const chronicle = document.getElementById('story-chronicle');
  if (chronicle) chronicle.innerHTML = '';

  const thoughtBody = document.getElementById('agent-thought-body');
  if (thoughtBody) {
    thoughtBody.innerText = currentLang === 'en' ? 'Awaiting commander orders...' : 'Đang chờ chỉ thị từ chủ công...';
  }
  const chipsContainer = document.getElementById('agent-delta-chips');
  if (chipsContainer) chipsContainer.innerHTML = '';

  try {
    if (typeof apiClearChatHistory === 'function') {
      await apiClearChatHistory();
    }
  } catch (e) {
    console.warn('Failed to clear backend chat history:', e);
  }

  // Re-append encounter turn for current scene if available
  if (window.currentScene) {
    renderSceneFromData(window.currentScene);
  }
  showToast(currentLang === 'en' ? 'Chat chronicle cleared.' : 'Đã làm mới dòng đối thoại.');
}

function confirmClearChat() {
  const msg = currentLang === 'en' 
    ? 'Do you want to clear the entire chat chronicle and start fresh?' 
    : 'Bạn có muốn làm mới và xóa toàn bộ lịch sử đối thoại chat không?';
  if (window.confirm(msg)) {
    clearStoryChronicle();
  }
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

  // Persist to localStorage immediately
  saveStoryChronicle();

  // Async sync to SQLite backend
  if (typeof apiSaveChatTurn === 'function') {
    apiSaveChatTurn(turn);
  }
}

function renderStoryChronicle() {
  const chronicle = document.getElementById('story-chronicle');
  if (!chronicle) return;
  chronicle.innerHTML = storyChronicle.map(t => renderTurnHtml(t)).join('');
  chronicle.scrollTop = chronicle.scrollHeight;
}

const LOCATION_NPC_MAP = {
  'Vườn Đào': { id: 'NPC-0002', nameVi: 'Trương Phi', nameEn: 'Zhang Fei', titleVi: 'Dực Đức • Trác Huyện', titleEn: 'Yide • Champion' },
  'Tư Trạch Vườn Đào': { id: 'NPC-0088', nameVi: 'Chân Cơ', nameEn: 'Lady Zhen', titleVi: 'Chánh Thê Lương Gia', titleEn: 'Liang First Lady' },
  'Thiết Điếm Trác Huyện': { id: 'NPC-0005', nameVi: 'Trần Bảo', nameEn: 'Chen Bao', titleVi: 'Đại Tượng Sư Lò Rèn', titleEn: 'Master Smith' },
  'Tửu Quán Trác Huyện': { id: 'NPC-0002', nameVi: 'Trương Phi', nameEn: 'Zhang Fei', titleVi: 'Dực Đức • Tửu Hào', titleEn: 'Yide • Tavern Champion' },
  'Lôi Đài Giáo Trường': { id: 'NPC-0033', nameVi: 'Hoa Hùng', nameEn: 'Hua Xiong', titleVi: 'Võ Sĩ Lôi Đài • Kiêu Tướng', titleEn: 'Arena Champion' },
  'Mã Xa Dịch Trạm': { id: 'NPC-0011', nameVi: 'Dịch Quan Trác Huyện', nameEn: 'Zhuo Post Master', titleVi: 'Đốc Vận Sứ • Thương Hội', titleEn: 'Trade Caravan Master' },
  'Chợ Đông Môn & Sạp Trà': { id: 'NPC-0003', nameVi: 'Quan Vũ', nameEn: 'Guan Yu', titleVi: 'Vân Trường • Nghĩa Sĩ', titleEn: 'Yunchang • Heroic Knight' },
  'Chợ Đông Môn': { id: 'NPC-0003', nameVi: 'Quan Vũ', nameEn: 'Guan Yu', titleVi: 'Vân Trường • Nghĩa Sĩ', titleEn: 'Yunchang • Heroic Knight' },
  'Xưởng Lương Thị': { id: 'NPC-0007', nameVi: 'Trần Bảo', nameEn: 'Chen Bao', titleVi: 'Thợ Cả Lương Gia', titleEn: 'Master Craftsman' },
  'Bắc Bình Soái Phủ': { id: 'NPC-0060', nameVi: 'Công Tôn Toản', nameEn: 'Gongsun Zan', titleVi: 'Bạch Mã Tướng Quân', titleEn: 'White Horse General' },
  'Quảng Tông Quân Doanh': { id: 'NPC-0012', nameVi: 'Lư Thực', nameEn: 'Lu Zhi', titleVi: 'Bắc Quân Trung Lang Tướng', titleEn: 'General of Household' },
  'Bình Nguyên Trọng Trấn': { id: 'NPC-0001', nameVi: 'Lưu Bị', nameEn: 'Liu Bei', titleVi: 'Huyền Đức • Bình Nguyên Lệnh', titleEn: 'Xuande • Magistrate' },
  'Hứa Xương Tướng Phủ': { id: 'NPC-0022', nameVi: 'Tào Tháo', nameEn: 'Cao Cao', titleVi: 'Mạnh Đức • Kiêu Hùng', titleEn: 'Mengde • Hero of Chaos' },
  'Trường Xã Tiền Tuyến': { id: 'NPC-0022', nameVi: 'Tào Tháo', nameEn: 'Cao Cao', titleVi: 'Mạnh Đức • Kỵ Đô Úy', titleEn: 'Mengde • Cavalry Commandant' },
  'Kinh Đô Lạc Dương': { id: 'NPC-0010', nameVi: 'Hà Tiến', nameEn: 'He Jin', titleVi: 'Đại Tướng Quân • Lục Thượng Thư Sự', titleEn: 'General-in-Chief' },
  'Nghiệp Thành Đại Phủ': { id: 'NPC-0018', nameVi: 'Viên Thiệu', nameEn: 'Yuan Shao', titleVi: 'Bản Sơ • Ký Châu Mục', titleEn: 'Benchu • Lord of Jizhou' },
  'Hạ Phì Thành Lũy': { id: 'NPC-0057', nameVi: 'Lữ Bố', nameEn: 'Lu Bu', titleVi: 'Phụng Tiên • Chiến Thần', titleEn: 'Fengxian • Peerless Warrior' },
  'Trường An Cung Phủ': { id: 'NPC-0023', nameVi: 'Đổng Trác', nameEn: 'Dong Zhuo', titleVi: 'Trọng Dĩnh • Thái Sư', titleEn: 'Zhongying • Grand Preceptor' },
  'Tương Dương Châu Phủ': { id: 'NPC-0016', nameVi: 'Lưu Biểu', nameEn: 'Liu Biao', titleVi: 'Cảnh Thăng • Kinh Châu Thứ Sử', titleEn: 'Jingsheng • Jingzhou Governor' },
  'Giang Lăng Thủy Doanh': { id: 'NPC-0017', nameVi: 'Chu Du', nameEn: 'Zhou Yu', titleVi: 'Công Cẩn • Đại Đô Đốc', titleEn: 'Gongjin • Grand Commander' },
  'Xích Bích Thủy Trại': { id: 'NPC-0052', nameVi: 'Hoàng Cái', nameEn: 'Huang Gai', titleVi: 'Công Phúc • Giang Đông Lão Tướng', titleEn: 'Gongfu • Veteran General' },
  'Kiến Nghiệp Đô Thành': { id: 'NPC-0019', nameVi: 'Tôn Quyền', nameEn: 'Sun Quan', titleVi: 'Trọng Mưu • Ngô Chủ', titleEn: 'Zhongmou • Lord of Wu' },
  'Hán Trung Thiên Sư Phủ': { id: 'NPC-0020', nameVi: 'Trương Lỗ', nameEn: 'Zhang Lu', titleVi: 'Công Kỳ • Thiên Sư Đạo', titleEn: 'Gongqi • Celestial Master' },
  'Thành Đô Ích Châu Phủ': { id: 'NPC-0021', nameVi: 'Lưu Chương', nameEn: 'Liu Zhang', titleVi: 'Quý Ngọc • Ích Châu Mục', titleEn: 'Guiyu • Yizhou Governor' },
  'Huyện Nha': { id: 'NPC-0001', nameVi: 'Lưu Bị', nameEn: 'Liu Bei', titleVi: 'Huyền Đức • Tôn Thất', titleEn: 'Xuande • Han Scion' },
  'Quân Doanh': { id: 'NPC-0003', nameVi: 'Quan Vũ', nameEn: 'Guan Yu', titleVi: 'Vân Trường • Đô Đốc', titleEn: 'Yunchang • General' }
};

function getLocalNpcForLocation(location) {
  if (LOCATION_NPC_MAP[location]) {
    return LOCATION_NPC_MAP[location].id;
  }
  if (window.currentScene && window.currentScene.npc && window.currentScene.npc.id) {
    return window.currentScene.npc.id;
  }
  return 'NPC-0002';
}

function updateLocalNpcButtonLabel(location = activeSubLocation) {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const npcInfo = LOCATION_NPC_MAP[location] || (window.currentScene?.npc ? {
    nameVi: window.currentScene.npc.name,
    nameEn: window.currentScene.npc.name,
  } : { nameVi: 'Trương Phi', nameEn: 'Zhang Fei' });

  const name = isEn ? (npcInfo.nameEn || npcInfo.nameVi) : npcInfo.nameVi;
  const avatarChar = name ? name.charAt(0) : '漢';

  const avatarEl = document.getElementById('cmd-hero-avatar');
  if (avatarEl) avatarEl.innerText = avatarChar;

  const nameEl = document.getElementById('cmd-hero-name');
  if (nameEl) nameEl.innerText = name;

  const sentimentEl = document.getElementById('cmd-hero-sentiment');
  if (sentimentEl) {
    const rels = window.currentScene?.relations || [];
    const rel = rels.find(r => r.name === name || r.nameVi === name || r.nameEn === name);
    const score = rel ? rel.score : 5;
    const status = rel ? (isEn ? (rel.statusEn || rel.status) : rel.status) : (isEn ? 'Friendly' : 'Thân Thiện');
    sentimentEl.innerText = `${score >= 0 ? '+' : ''}${score} ${status}`;
  }

  const btnText = document.getElementById('txt-btn-local-npc');
  if (btnText) {
    btnText.innerText = isEn ? 'Dossier' : 'Hồ Sơ';
  }
}

function openCurrentLocationNpcDossier() {
  const npcId = getLocalNpcForLocation(activeSubLocation);
  if (typeof openNpcDossierModal === 'function') {
    openNpcDossierModal(npcId);
  }
}

function toggleCourierDrawer() {
  const drawer = document.getElementById('courier-drawer');
  if (!drawer) return;
  drawer.classList.toggle('hidden');
}

async function dispatchCourierAction(promptText) {
  toggleCourierDrawer();
  await dispatchQuickAction(promptText);
}

function handleChoiceCardClick(optId) {
  if (typeof isProcessingAction !== 'undefined' && isProcessingAction) return;
  if (typeof selectChoice === 'function') selectChoice(optId);
  if (typeof executeChoiceDirect === 'function') executeChoiceDirect(optId);
}

function parseImpactsFromDesc(desc, pillar) {
  if (!desc) return { badges: [], note: '' };
  const parts = desc.split('•').map(s => s.trim()).filter(Boolean);
  const badges = [];
  const notes = [];

  for (const p of parts) {
    const pLower = p.toLowerCase();
    if (p.includes('D20') || pLower.includes('check') || pLower.includes('kiểm định')) {
      badges.push({ text: p, type: 'dice' });
    } else if ((p.includes('+') || pLower.includes('tăng ')) && (pLower.includes('hảo cảm') || pLower.includes('affinity') || pLower.includes('kính trọng'))) {
      badges.push({ text: p, type: 'positive' });
    } else if (pLower.includes('tiền') && (p.includes('-') || pLower.includes('chi ') || pLower.includes('cost'))) {
      badges.push({ text: p, type: 'cost' });
    } else if ((p.includes('+') || pLower.includes('tăng ')) && (pLower.includes('exp') || pLower.includes('võ') || pLower.includes('trí') || pLower.includes('thể lực'))) {
      badges.push({ text: p, type: 'stat' });
    } else if ((p.includes('+') || pLower.includes('nhập ')) && (pLower.includes('kho') || p.includes('COM-') || p.includes('PROD-') || pLower.includes('da ') || pLower.includes('lương'))) {
      badges.push({ text: p, type: 'gain' });
    } else {
      notes.push(p);
    }
  }

  // Fallback badge if none detected
  if (badges.length === 0) {
    if (pillar === 'KIZUNA_SOCIAL') badges.push({ text: 'Hảo Cảm', type: 'positive' });
    else if (pillar === 'FACILITY_OPERATION') badges.push({ text: 'Cơ Sở', type: 'gain' });
    else if (pillar === 'OPPORTUNITY_INCIDENT') badges.push({ text: 'Cơ Duyên', type: 'dice' });
    else if (pillar === 'PERSONAL_GROWTH') badges.push({ text: 'Bồi Dưỡng', type: 'stat' });
  }

  return { badges, note: notes.join(' • ') || desc };
}

async function dispatchQuickAction(promptText) {
  if (typeof isProcessingAction !== 'undefined' && isProcessingAction) {
    showToast(currentLang === 'en' ? 'System is calculating, please wait...' : 'Hệ thống đang tính toán lệnh trước, vui lòng chờ!', true);
    return;
  }
  if (!promptText) return;

  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const playerName = (window.currentScene && window.currentScene.player && window.currentScene.player.name) || 'Lương Diễn';

  appendStoryTurn({
    type: 'player',
    speaker: playerName,
    title: isEn ? 'Tactical Action' : 'Mệnh Lệnh Chiến Lược',
    avatar: '梁',
    text: promptText
  });

  if (typeof setProcessingLock === 'function') {
    setProcessingLock(true, null, promptText);
  }
  showToast(isEn ? 'Executing tactical action...' : 'Đang thi hành mệnh lệnh chiến lược...');

  try {
    const result = await apiDispatchPrompt({
      prompt: promptText,
      mode: 'instant',
      subLocation: activeSubLocation
    });
    if (!result.success) throw new Error(result.error);
    if (result.updatedScene && typeof applySceneUpdates === 'function') {
      applySceneUpdates(result.updatedScene);
    }
  } catch (err) {
    showToast(err.message, true);
  } finally {
    if (typeof setProcessingLock === 'function') {
      setProcessingLock(false);
    }
  }
}

function renderDynamicQuickChips(location = activeSubLocation) {
  const targetEl = document.getElementById('locality-target');
  const locData = QUICK_CHIPS_DATA[location] || QUICK_CHIPS_DATA['Vườn Đào'];
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

  if (targetEl) {
    const poiMeta = (typeof getPoiMeta === 'function') ? getPoiMeta(location) : null;
    const cleanLocName = poiMeta ? (isEn ? poiMeta.en : poiMeta.vi) : location;
    targetEl.innerText = cleanLocName;
  }

  // Update dynamic hero interaction pill & label
  updateLocalNpcButtonLabel(location);

  // Populate Courier Dispatch Drawer
  const courierContainer = document.getElementById('courier-chips-list');
  const badgeCount = document.getElementById('courier-badge-count');
  const courierChips = (locData.chips || []).filter(c => c.type === 'courier');

  if (badgeCount) {
    badgeCount.innerText = courierChips.length;
    badgeCount.style.display = courierChips.length > 0 ? 'inline-block' : 'none';
  }

  if (courierContainer) {
    if (courierChips.length === 0) {
      courierContainer.innerHTML = `<div style="font-size: 10px; color: var(--text-muted); font-style: italic; padding: 4px;">${isEn ? 'No courier routes established from this outpost.' : 'Chưa có tuyến phi thư viễn trình nào từ cứ điểm này.'}</div>`;
    } else {
      courierContainer.innerHTML = courierChips.map(chip => {
        const label = isEn ? chip.labelEn : chip.labelVi;
        const promptText = isEn ? chip.promptEn : chip.promptVi;
        const promptEsc = promptText.replace(/'/g, "\\'");
        return `
          <button class="courier-action-card" onclick="dispatchCourierAction('${promptEsc}')">
            <div class="courier-action-left">
              <span class="courier-action-icon">${chip.icon || '信'}</span>
              <div>
                <div class="courier-action-name">${label}</div>
                <div class="courier-action-prompt">${promptText}</div>
              </div>
            </div>
            <span class="courier-action-arrow">${isEn ? 'Dispatch →' : 'Phái Đi →'}</span>
          </button>
        `;
      }).join('');
    }
  }
}

function renderChoices(options) {
  const container = document.getElementById('choices-grid');
  if (!container) return;

  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

  if (!options || options.length === 0) {
    container.innerHTML = `<div style="grid-column: span 2; padding: 16px; text-align: center; color: var(--text-muted); font-size: 11px;">${isEn ? 'No action proposals for current context.' : 'Không có đề xuất hành động cho bối cảnh hiện tại.'}</div>`;
    return;
  }

  container.innerHTML = options.map((opt) => {
    const isSelected = (window.selectedChoiceId === opt.id);
    const isDisabled = Boolean(opt.disabled);
    const pillarLabel = isEn ? (opt.pillarLabelEn || opt.pillar) : (opt.pillarLabelVi || opt.pillar);
    const titleText = isEn ? (opt.titleEn || opt.title) : opt.title;
    const descText = isEn ? (opt.descEn || opt.desc) : opt.desc;
    const disabledReason = isEn ? (opt.disabledReasonEn || opt.disabledReasonVi) : opt.disabledReasonVi;

    // Strip ugly internal IDs like "OPT_1 [XÃ GIAO HÀO KIỆT]" from title
    const cleanTitle = titleText.replace(/^OPT_\d+\s*(\[.*?\])?\s*/i, '').trim();

    const badgeClass = opt.badgeClass || (
      opt.pillar === 'KIZUNA_SOCIAL' ? 'pillar-kizuna' :
      opt.pillar === 'FACILITY_OPERATION' ? 'pillar-facility' :
      opt.pillar === 'OPPORTUNITY_INCIDENT' ? 'pillar-opportunity' : 'pillar-growth'
    );

    const { badges, note } = parseImpactsFromDesc(descText, opt.pillar);
    const impactChipsHtml = badges.map(b => `<span class="impact-chip ${b.type}">${b.text}</span>`).join('');
    const pillarSealMap = {
      'KIZUNA_SOCIAL': '交',
      'FACILITY_OPERATION': '業',
      'OPPORTUNITY_INCIDENT': '機',
      'PERSONAL_GROWTH': '修'
    };
    const choiceSeal = pillarSealMap[opt.pillar] || '策';

    return `
      <div class="choice-card ${isSelected ? 'active' : ''} ${isDisabled ? 'choice-card--disabled' : ''} ${badgeClass}-card" 
           id="choice-card-${opt.id}" 
           onclick="handleChoiceCardClick('${opt.id}')"
           title="${isDisabled && disabledReason ? disabledReason : cleanTitle}">
        
        <!-- Card Top: Pillar Tag & AI Secondary Action -->
        <div class="choice-card-top">
          <div class="choice-pillar-group">
            <span class="choice-icon-badge">${choiceSeal}</span>
            ${pillarLabel ? `<span class="choice-pillar-badge ${badgeClass}">${pillarLabel}</span>` : ''}
          </div>
          <div class="choice-top-actions">
            <button class="btn-choice-ai-icon ${isDisabled ? 'btn-disabled' : ''}" 
                    id="btn-ai-${opt.id}" 
                    ${isDisabled ? 'disabled' : ''} 
                    onclick="event.stopPropagation(); executeChoiceAi('${opt.id}')"
                    title="${isEn ? 'Execute with AI Storyteller Bridge' : 'Thi hành kèm AI Dẫn Chuyện & Cốt Truyện'}">
              <span>AI</span>
            </button>
          </div>
        </div>

        <!-- Card Body: Clean Title, Impact Chips & Note -->
        <div class="choice-card-body">
          <div class="choice-title" style="${isDisabled ? 'color: var(--text-muted);' : ''}">${cleanTitle}</div>
          <div class="choice-impact-chips">${impactChipsHtml}</div>
          ${note ? `<div class="choice-note">${note}</div>` : ''}
          ${isDisabled && disabledReason ? `<div class="choice-disabled-banner"><span class="lock-icon">[Khóa]</span> ${disabledReason}</div>` : ''}
        </div>

        <!-- Card Footer: Direct Execution -->
        <div class="choice-card-footer">
          <button class="btn-choice-execute ${isDisabled ? 'btn-disabled' : ''}" 
                  id="btn-select-${opt.id}" 
                  ${isDisabled ? 'disabled' : ''} 
                  onclick="event.stopPropagation(); executeChoiceDirect('${opt.id}')">
            <span>${isEn ? 'Execute' : 'Thi Hành'}</span>
            <span class="btn-arrow">→</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderRelations(relations) {
  const list = document.getElementById('relations-progress-list');
  if (!list) return;

  const isEn = (currentLang === 'en');
  const rels = relations || window.currentScene?.relations || [];

  if (rels.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 8px; font-size: 10px;">${isEn ? 'No sentiment data available' : 'Chưa có dữ liệu hảo cảm'}</div>`;
    return;
  }

  list.innerHTML = rels.map((rel) => {
    const target = rel.target || 100;
    const score = rel.score || 0;
    const pct = Math.max(0, Math.min(100, Math.round((score / target) * 100)));
    const colorClass = pct >= 70 ? 'emerald' : pct >= 60 ? 'cyan' : pct >= 50 ? 'gold' : 'orange';
    const isHigh = pct >= 70;

    const name = isEn ? (rel.nameEn || rel.name) : rel.name;
    const status = isEn ? (rel.statusEn || rel.status) : rel.status;

    return `
      <div class="rel-item" style="cursor: pointer;" onclick="handleSpeakerClick('${name}')" title="Nhấn để xem Hồ Sơ & Sương Mù Thông Tin">
        <div class="rel-info">
          <div class="rel-name-group">
            <span class="rel-name">${name}</span>
            ${status ? `<span class="rel-status-badge">${status}</span>` : ''}
          </div>
          <span class="rel-score ${isHigh ? 'green-text font-bold' : ''}">
            ${score >= 0 ? '+' : ''}${score} / +${target}
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

  // Dynamic Contextual Action Dock for Physical POI
  if (window.SpatialPoiController && typeof window.SpatialPoiController.updateActionDock === 'function') {
    window.SpatialPoiController.updateActionDock(activeSubLocation);
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
      pills.push(`<span class="agent-delta-pill ${isPositive ? 'cash-plus' : 'cash-minus'}">Tiền: ${delta.cash}</span>`);
    }
    if (delta.inventory) {
      pills.push(`<span class="agent-delta-pill inv">Kho: ${delta.inventory}</span>`);
    }
    if (delta.relations || delta.npc) {
      pills.push(`<span class="agent-delta-pill rel">Hảo cảm: ${delta.relations || delta.npc}</span>`);
    }
    if (delta.audit) {
      pills.push(`<span class="agent-delta-pill rel">Khớp: ${delta.audit}</span>`);
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
window.saveStoryChronicle = saveStoryChronicle;
window.loadStoryChronicleFromStorage = loadStoryChronicleFromStorage;
window.restoreAgentThoughtFromHistory = restoreAgentThoughtFromHistory;
window.clearStoryChronicle = clearStoryChronicle;
window.confirmClearChat = confirmClearChat;
window.formatNarrativeQuotes = formatNarrativeQuotes;
window.formatStoryText = formatStoryText;
window.renderDiceBadgeHtml = renderDiceBadgeHtml;
window.renderDeltaBarHtml = renderDeltaBarHtml;
window.renderReasoningHtml = renderReasoningHtml;
window.renderTurnHtml = renderTurnHtml;
window.appendStoryTurn = appendStoryTurn;
window.renderStoryChronicle = renderStoryChronicle;
window.dispatchQuickAction = dispatchQuickAction;
window.openCurrentLocationNpcDossier = openCurrentLocationNpcDossier;
window.updateLocalNpcButtonLabel = updateLocalNpcButtonLabel;
window.getLocalNpcForLocation = getLocalNpcForLocation;
window.quickFillPrompt = dispatchQuickAction; // Backward compatibility fallback
window.renderDynamicQuickChips = renderDynamicQuickChips;
window.renderChoices = renderChoices;
window.renderRelations = renderRelations;
window.renderSceneFromData = renderSceneFromData;
window.renderAgentSimulationFeedback = renderAgentSimulationFeedback;
window.toggleCourierDrawer = toggleCourierDrawer;
window.dispatchCourierAction = dispatchCourierAction;
window.handleChoiceCardClick = handleChoiceCardClick;
window.parseImpactsFromDesc = parseImpactsFromDesc;
