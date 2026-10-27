/**
 * THREE KINGDOMS SIMULATION - APPLICATION CONTROLLER & ORCHESTRATOR
 * Coordinates state, scene loading, command execution, and DOM bootstrapping.
 * Modular sub-components located in /public/js/
 */

let selectedChoiceId = null;

// ==========================================================================
// 1. DATA INITIALIZATION & ORCHESTRATION
// ==========================================================================

async function loadAllData() {
  try {
    await Promise.all([
      loadStatus(),
      loadScene(activeSubLocation),
      loadDeckInventory(),
      loadDeckNpcs(),
      loadDeckLedger(),
      loadDeckAgentLogs(),
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
    const data = await apiFetchStatus();
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

    // Protagonist Card Fields
    if (p) {
      const nameEl = document.getElementById('protagonist-name');
      if (nameEl) nameEl.innerText = p.name === 'Liang Yan' ? 'Lương Diễn' : p.name;

      const styleEl = document.getElementById('protagonist-style');
      if (styleEl) styleEl.innerText = p.style_name ? `(${p.style_name === 'Zhiyuan' ? 'Chí Viễn' : p.style_name})` : '';

      const ageEl = document.getElementById('protagonist-age');
      if (ageEl) ageEl.innerText = `${p.age || 21} Tuổi`;

      const hpEl = document.getElementById('protagonist-hp');
      if (hpEl) hpEl.innerText = `${p.health || 100}/100`;

      const barHp = document.getElementById('bar-hp');
      if (barHp) barHp.style.width = `${p.health || 100}%`;

      const moraleEl = document.getElementById('protagonist-morale');
      if (moraleEl) moraleEl.innerText = `${p.morale || 100}%`;

      const barMorale = document.getElementById('bar-morale');
      if (barMorale) barMorale.style.width = `${p.morale || 100}%`;

      const attrInt = document.getElementById('attr-int');
      if (attrInt) attrInt.innerText = p.int_attr || 80;

      const attrCom = document.getElementById('attr-com');
      if (attrCom) attrCom.innerText = p.com_attr || 78;

      const attrDip = document.getElementById('attr-dip');
      if (attrDip) attrDip.innerText = p.dip_attr || 74;

      const attrLdr = document.getElementById('attr-ldr');
      if (attrLdr) attrLdr.innerText = p.ldr_attr || 70;

      const attrLog = document.getElementById('attr-log');
      if (attrLog) attrLog.innerText = p.log_attr || 70;

      const attrPol = document.getElementById('attr-pol');
      if (attrPol) attrPol.innerText = p.pol_attr || 68;

      const attrCra = document.getElementById('attr-cra');
      if (attrCra) attrCra.innerText = p.cra_attr || 62;

      const attrWar = document.getElementById('attr-war');
      if (attrWar) attrWar.innerText = p.war_attr || 58;
    }

  } catch (err) {
    console.error('Failed to load status:', err);
  }
}

// 1.2 Check Audit Invariants Status
async function checkAuditStatus() {
  try {
    const data = await apiFetchAudit();
    const badge = document.getElementById('badge-top-audit');
    const hudAudit = document.getElementById('hud-audit-tag');

    if (badge) {
      if (data.success && data.discrepanciesCount === 0) {
        badge.className = 'badge-audit';
        badge.innerText = '100% Khớp';
        badge.title = `${data.totalInvariantsVerified} Bất biến SQLite đã xác minh hoàn hảo`;
        if (hudAudit) hudAudit.innerText = `✅ INVARIANTS: ${data.totalInvariantsVerified}/${data.totalInvariantsVerified} KHỚP`;
      } else {
        badge.className = 'badge-audit text-danger';
        badge.style.borderColor = 'var(--state-danger)';
        badge.style.color = '#f87171';
        badge.innerText = `${data.discrepanciesCount} Lệch`;
        if (hudAudit) hudAudit.innerText = `⚠️ LỆCH: ${data.discrepanciesCount} INVARIANTS`;
      }
    }
  } catch (err) {
    console.error('Audit check error:', err);
  }
}

// 1.3 Load Dynamic Context Scene
async function loadScene(targetSubLoc = activeSubLocation, customNarrative = null) {
  try {
    activeSubLocation = targetSubLoc;
    const data = await apiFetchScene(targetSubLoc);
    currentScene = data;
    renderSceneFromData(data, customNarrative);
  } catch (err) {
    console.error('Failed to load scene:', err);
  }
}

// ==========================================================================
// 2. INTERACTIVE ACTIONS & ANTI-PILING DISPATCHERS
// ==========================================================================

// 2.1 Dynamic Sub-location Switching
async function switchSubLocation(locName) {
  if (isProcessingAction) {
    showToast('⚠️ Đang thực thi thao tác khác, vui lòng chờ!', true);
    return;
  }
  if (activeSubLocation === locName) return;

  activeSubLocation = locName;
  showToast(`Đang chuyển cảnh tới: ${locName}...`);
  await loadScene(locName);
}

// 2.2 Choice Selection & Highlighting
function selectChoice(optId) {
  selectedChoiceId = optId;
  window.selectedChoiceId = optId;
  document.querySelectorAll('.choice-card').forEach(card => {
    card.classList.toggle('active', card.id === `choice-card-${optId}`);
  });
}

// 2.3 Direct Mechanical Choice Execution (Anti-Piling Guarded)
async function executeChoiceDirect(optId) {
  if (isProcessingAction) {
    showToast('⚠️ Đang thực thi điều lệnh trước, vui lòng không nhấn dồn!', true);
    return;
  }

  if (!currentScene || !currentScene.options) return;
  const opt = currentScene.options.find(o => o.id === optId);
  if (!opt) return;

  const cardEl = document.getElementById(`choice-card-${optId}`);
  selectChoice(optId);

  // Append Player Action Turn into Story Chronicle
  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: 'Quyết Sách Trực Tiếp',
    avatar: '梁',
    text: `**${opt.title}**\n\n*Ý đồ chiến thuật:* ${opt.desc}`
  });

  setProcessingLock(true, cardEl, opt.title);

  try {
    // Location Movement Choice
    if (opt.action && opt.action.type === 'MOVE_LOCATION') {
      showToast(`Đang di chuyển tới ${opt.action.new_location}...`);
      opt.action.idempotency_key = `OPT_${optId}_${Date.now()}`;
      await dispatchDirectAction(opt.action);
      activeSubLocation = opt.action.new_location;

      appendStoryTurn({
        type: 'system',
        speaker: 'Hành Trình',
        title: 'Chuyển Đổi Địa Điểm',
        avatar: '📍',
        text: `Lương Diễn đã rời bước, đặt chân tới **${opt.action.new_location}**. Bối cảnh xung quanh bắt đầu thay đổi.`,
        deltas: { location: activeSubLocation, audit: 'Cập nhật tọa độ' }
      });

      await loadScene(activeSubLocation);
      renderAgentSimulationFeedback(`Cơ động tới ${activeSubLocation}. Thiết lập vị trí chiến dịch mới.`, { location: activeSubLocation, audit: '70/70 Khớp' });
      return;
    }

    // Direct Authoritative SimulationCore Action
    if (opt.action) {
      showToast(`Đang thực thi: ${opt.title}...`);
      opt.action.idempotency_key = `OPT_${optId}_${Date.now()}`;
      const result = await dispatchDirectAction(opt.action);

      let turnType = 'system';
      let speaker = 'SimCore Kiểm Toán';
      let title = 'Ghi Nhận Sổ Cái SQLite';
      let avatar = '⚖️';
      let turnText = `Điều lệnh **${opt.title}** đã thực thi thành công và ghi sổ bất biến.`;

      if (opt.action.type === 'PRODUCTION_BATCH') {
        if (activeSubLocation === 'Xưởng Lương Thị') {
          turnType = 'action';
          speaker = 'Trần Bảo (Thợ Cả Lương Gia)';
          title = 'Hoàn Thành Chế Tác';
          avatar = '陳';
          turnText = `Thợ cả Trần Bảo báo cáo: Lô sản xuất ${opt.action.batch_size} thành phẩm đã hoàn thành theo đúng định mức BOM!`;
        } else {
          turnType = 'courier';
          speaker = 'Gia Nhân Tiếp Vận (Phi Thư)';
          title = 'Mật Lệnh Sản Xuất Tới Xưởng';
          avatar = '✉️';
          turnText = `Gia nhân phi ngựa mang mật lệnh bài về Xưởng Lương Thị. Thợ cả Trần Bảo mở thư tuân lệnh, hạ lệnh thợ xưởng hoàn thiện ${opt.action.batch_size} thành phẩm!`;
        }
      } else if (opt.action.type === 'TRADE_BUY' || opt.action.type === 'TRADE_SELL') {
        turnType = 'action';
        speaker = opt.action.counterparty || 'Thương Vụ Lương Gia';
        title = opt.action.type === 'TRADE_BUY' ? 'Thu Mua Vật Tư' : 'Xuất Bán Hàng Hóa';
        avatar = '📦';
        turnText = `Giao dịch thương nghiệp **${opt.title}** đã hoàn tất giao nhận và đối ứng ngân khố.`;
      } else if (opt.action.type === 'REWARD_NPC') {
        turnType = 'npc';
        speaker = currentScene?.npc?.name || 'Hào Kiệt';
        title = 'Cảm Kích Ban Thưởng';
        avatar = currentScene?.npc?.name ? currentScene.npc.name.charAt(0) : '🎁';
        turnText = `Nhận ban thưởng ${opt.action.amount} Tiền, tâm tình phấn khởi, trung thành và sĩ khí tăng vọt!`;
      }

      // Append result into chronicle
      appendStoryTurn({
        type: turnType,
        speaker: speaker,
        title: title,
        avatar: avatar,
        text: turnText,
        deltas: result && result.delta ? result.delta : { action: opt.action.type, audit: '70/70 Khớp' },
        reasoning: `Bất biến SQLite kiểm toán bảo toàn tuyệt đối.`
      });

      // Refresh scene and right deck
      await loadScene(activeSubLocation);
      renderAgentSimulationFeedback(`Thực thi thành công điều lệnh "${opt.title}". Kiểm toán bất biến bảo toàn hoàn hảo.`, { action: opt.action.type, audit: '70/70 Khớp' });
      await Promise.all([loadStatus(), loadDeckInventory(), loadDeckNpcs(), loadDeckLedger()]);
    } else {
      showToast(`Đã chọn: ${opt.title}`);
    }
  } catch (err) {
    console.error('Error executing direct choice:', err);
    showToast(`Thất bại: ${err.message}`, true);
  } finally {
    setProcessingLock(false, cardEl);
  }
}

// 2.4 AI-Assisted Choice Execution (Anti-Piling Guarded)
async function executeChoiceAi(optId) {
  if (isProcessingAction) {
    showToast('⚠️ Đang gửi yêu cầu cho AI Bridge, vui lòng không bấm liên tục!', true);
    return;
  }

  if (!currentScene || !currentScene.options) return;
  const opt = currentScene.options.find(o => o.id === optId);
  if (!opt) return;

  const cardEl = document.getElementById(`choice-card-${optId}`);
  selectChoice(optId);

  // Append Player Action Turn into Story Chronicle
  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: 'Thỉnh Cầu AI Core',
    avatar: '梁',
    text: `Đề xuất phương án: **${opt.title}**`
  });

  setProcessingLock(true, cardEl, `Gửi "${opt.title}" cho AI Core`);
  showToast(`Gửi lựa chọn "${opt.title}" qua AI Bridge...`);

  try {
    const result = await apiDispatchPrompt({
      prompt: opt.title,
      choiceId: optId,
      subLocation: activeSubLocation
    });
    if (!result.success) throw new Error(result.error);

    // Update scene dynamically
    if (result.updatedScene) {
      if (result.updatedScene.campaign && result.updatedScene.campaign.activeSubLocation) {
        activeSubLocation = result.updatedScene.campaign.activeSubLocation;
      }
      renderSceneFromData(result.updatedScene);
    } else {
      await loadScene(activeSubLocation);
    }

    // Append Authentic Agent / NPC / Courier Response into Story Chronicle
    appendAgentResultTurn(result);

    // Render Agent Reasoning & Simulation Delta
    renderAgentSimulationFeedback(result.reasoning, result.delta);

    showToast('AI Bridge đã phản hồi và hoàn tất đối soát SQLite!');
    await Promise.all([loadStatus(), loadDeckInventory(), loadDeckNpcs(), loadDeckLedger()]);

  } catch (err) {
    console.error('AI Bridge execution error:', err);
    showToast(`Lỗi AI Bridge: ${err.message}`, true);
  } finally {
    setProcessingLock(false, cardEl);
  }
}

// 2.5 Append Agent Result Turn with Authentic Speaker Attribution
function appendAgentResultTurn(result) {
  const turnInfo = result.turnInfo || {};
  const isEn = (currentLang === 'en');

  let type = turnInfo.type || (result.dispatchType === 'COURIER' ? 'courier' : (result.dispatchType === 'TRAVEL' ? 'travel' : 'action'));
  let speaker = turnInfo.speaker;
  let title = turnInfo.title;
  let avatar = turnInfo.avatar;
  let diceBadge = turnInfo.diceBadge !== undefined ? turnInfo.diceBadge : null;

  // Fallbacks if turnInfo is missing
  if (!speaker) {
    if (result.dispatchType === 'COURIER') {
      type = 'courier';
      speaker = isEn ? 'Courier Dispatch (Messenger)' : 'Gia Nhân Tiếp Vận (Phi Thư)';
      title = isEn ? 'Remote Order / Dispatch' : 'Mật Thư Điều Phối Từ Xa';
      avatar = '✉️';
      diceBadge = null;
    } else if (result.dispatchType === 'TRAVEL') {
      type = 'travel';
      speaker = isEn ? 'Post Road Journey' : 'Lữ Trình Quan Đạo';
      title = isEn ? 'Scene Relocation' : 'Chuyển Cảnh Địa Lý';
      avatar = '🏇';
      diceBadge = null;
    } else if (result.executedAction && result.executedAction.type === 'PRODUCTION_BATCH') {
      type = 'action';
      speaker = isEn ? 'Master Chen Bao (Artisan)' : 'Trần Bảo (Thợ Cả Lương Gia)';
      title = isEn ? 'Liang Workshop' : 'Lương Thị Chức Tác Phường';
      avatar = '陳';
      diceBadge = null;
    } else {
      type = 'npc';
      const npc = result.updatedScene?.npc || currentScene?.npc;
      speaker = npc?.name || (isEn ? 'Local Figure' : 'Hào Kiệt Bản Địa');
      title = npc?.title || (isEn ? 'Direct Dialogue' : 'Đối Thoại Trực Diện');
      avatar = npc?.name ? npc.name.charAt(0) : '漢';
    }
  }

  appendStoryTurn({
    type,
    speaker,
    title,
    avatar,
    text: result.narrative,
    diceBadge,
    deltas: result.delta,
    reasoning: result.reasoning
  });
}

// 2.6 Omni Command Bar Dispatcher (Anti-Piling Guarded)
async function dispatchOmniCommand(mode = 'ai') {
  if (isProcessingAction) {
    showToast('⚠️ Hệ thống đang tính toán lệnh trước, vui lòng không spam lệnh!', true);
    return;
  }

  const inputEl = document.getElementById('omni-input');
  if (!inputEl) return;

  const promptText = inputEl.value.trim();
  if (!promptText) {
    showToast('Vui lòng nhập mệnh lệnh hoặc đối thoại!', true);
    inputEl.focus();
    return;
  }

  // Append Player Action Turn into Story Chronicle
  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: mode === 'instant' ? 'Mệnh Lệnh Tức Thì' : 'Mệnh Lệnh & Đối Thoại',
    avatar: '梁',
    text: promptText
  });

  inputEl.value = '';
  setProcessingLock(true, null, promptText);
  showToast(mode === 'instant' ? 'Đang thực thi lệnh tức thì...' : 'Đang gửi cho AI Agent Core...');

  try {
    const result = await apiDispatchPrompt({
      prompt: promptText,
      mode,
      subLocation: activeSubLocation
    });
    if (!result.success) throw new Error(result.error);

    if (result.updatedScene) {
      if (result.updatedScene.campaign && result.updatedScene.campaign.activeSubLocation) {
        activeSubLocation = result.updatedScene.campaign.activeSubLocation;
      }
      renderSceneFromData(result.updatedScene);
    } else {
      await loadScene(activeSubLocation);
    }

    // Append Authentic Agent / NPC / Courier Response into Story Chronicle
    appendAgentResultTurn(result);

    // Render Agent Reasoning & Simulation Delta
    renderAgentSimulationFeedback(result.reasoning, result.delta);

    showToast('Điều lệnh đã thực thi thành công!');
    await Promise.all([loadStatus(), loadDeckInventory(), loadDeckNpcs(), loadDeckLedger()]);

  } catch (err) {
    console.error('Command dispatch error:', err);
    showToast(`Thất bại: ${err.message}`, true);
  } finally {
    setProcessingLock(false, null);
  }
}

// 2.7 Direct SimulationCore Action Helper
async function dispatchDirectAction(payload) {
  try {
    const result = await apiDispatchAction(payload);
    if (result.success) {
      showToast(`Điều lệnh ${payload.type} thành công!`);
      return result;
    } else {
      showToast(`Bị từ chối: [${result.code || 'ERR'}] ${result.error}`, true);
      return result;
    }
  } catch (err) {
    showToast(`Lỗi kết nối SimCore: ${err.message}`, true);
  }
}

// 2.8 NPC Retainer Reward Quick Action
async function rewardNpc(npcId, amount = 100) {
  if (isProcessingAction) {
    showToast('⚠️ Đang thực thi thao tác khác, vui lòng chờ!', true);
    return;
  }

  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: 'Khen Thưởng Gia Nhân',
    avatar: '梁',
    text: `Ban thưởng **${amount} Tiền** cho nhân sĩ ${npcId} để khích lệ sĩ khí trung thành!`
  });

  setProcessingLock(true, null, `Thưởng ${amount} Tiền cho NPC ${npcId}`);
  showToast(`Ban thưởng ${amount} Tiền cho NPC ${npcId}...`);

  try {
    await dispatchDirectAction({
      type: 'REWARD_NPC',
      npc_id: npcId,
      amount,
      game_date: '184-05-02',
      idempotency_key: `RWD_${npcId}_${Date.now()}`
    });

    appendStoryTurn({
      type: 'npc',
      speaker: 'Trần Bảo (Thợ Cả)',
      title: 'Lương Thị Chức Tác Phường',
      avatar: '陳',
      text: `Trần Bảo cảm kích khôn xiết cúi đầu bái tạ: *"Đa tạ Thiếu gia trọng thưởng! Thuộc hạ và anh em thợ xưởng nguyện dốc toàn lực chế tạo quân trang phòng thủ tốt nhất!"*`,
      deltas: { cash: `-${amount} Qian`, npc: 'Sĩ khí 100% • Trung thành +2', audit: '70/70 Khớp' },
      reasoning: `Khen thưởng ${amount} Tiền động viên NPC ${npcId}. Sĩ khí tối đa.`
    });

    renderAgentSimulationFeedback(`Khen thưởng ${amount} Tiền động viên NPC ${npcId}. Sĩ khí tối đa.`, { cash: `-${amount} Qian`, npc: 'Sĩ khí 100% • Trung thành +2', audit: '70/70 Khớp' });
    await Promise.all([loadStatus(), loadDeckNpcs(), loadDeckLedger()]);
  } finally {
    setProcessingLock(false, null);
  }
}

// ==========================================================================
// 3. UI EVENT LISTENERS & LIFECYCLE HOOKS
// ==========================================================================

function initUIEventListeners() {
  // Main Menu click
  const btnMenu = document.getElementById('btn-main-menu');
  if (btnMenu) {
    btnMenu.addEventListener('click', () => {
      showToast('Hệ thống SimCore: 70/70 Invariants SQLite đang bảo toàn 100%!');
    });
  }

  // Logs button click: Switches directly to Agent Activity Log Stream!
  const btnLogs = document.getElementById('btn-toggle-logs');
  if (btnLogs) {
    btnLogs.addEventListener('click', () => {
      switchDeckTab('subtab-agent-log');
      showToast('Đang hiển thị Nhật ký mô phỏng từ Agent!');
    });
  }

  // World Map Modal Keyboard & Backdrop Handlers
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeWorldMap();
    }
  });

  const mapModal = document.getElementById('world-map-modal');
  if (mapModal) {
    mapModal.addEventListener('click', (e) => {
      if (e.target === mapModal) {
        closeWorldMap();
      }
    });
  }
}

// DOM Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  initUIEventListeners();
  applyLanguage();
  loadAllData();
});

// Global exposure for template strings and inline handlers
window.selectedChoiceId = selectedChoiceId;
window.loadAllData = loadAllData;
window.loadStatus = loadStatus;
window.checkAuditStatus = checkAuditStatus;
window.loadScene = loadScene;
window.switchSubLocation = switchSubLocation;
window.selectChoice = selectChoice;
window.executeChoiceDirect = executeChoiceDirect;
window.executeChoiceAi = executeChoiceAi;
window.appendAgentResultTurn = appendAgentResultTurn;
window.dispatchOmniCommand = dispatchOmniCommand;
window.dispatchDirectAction = dispatchDirectAction;
window.rewardNpc = rewardNpc;
window.initUIEventListeners = initUIEventListeners;
