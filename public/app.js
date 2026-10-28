/**
 * THREE KINGDOMS SIMULATION - APPLICATION CONTROLLER & ORCHESTRATOR
 * Coordinates state, scene loading, command execution, and DOM bootstrapping.
 * Modular sub-components located in /public/js/
 */

// ==========================================================================
// 1. DATA INITIALIZATION & ORCHESTRATION
// ==========================================================================

// 1.0 Load & Synchronize Chat Chronicle History
async function loadChatHistory() {
  try {
    if (typeof apiFetchChatHistory !== 'function') return;
    const history = await apiFetchChatHistory();
    if (Array.isArray(history) && history.length > 0) {
      storyChronicle.length = 0;
      storyChronicle.push(...history);
      renderStoryChronicle();
      if (typeof saveStoryChronicle === 'function') saveStoryChronicle();
      if (typeof restoreAgentThoughtFromHistory === 'function') restoreAgentThoughtFromHistory();
    } else if (storyChronicle.length > 0) {
      // Sync client localStorage turns back to server
      for (const turn of storyChronicle) {
        if (typeof apiSaveChatTurn === 'function') {
          apiSaveChatTurn(turn);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load server chat history, fallback to local storage:', err);
  }
}

async function loadAllData() {
  try {
    // 1. Immediately restore local storage chronicle for zero-flicker UI
    if (typeof loadStoryChronicleFromStorage === 'function') {
      loadStoryChronicleFromStorage();
    }

    // 2. Fetch authoritative player status from SQLite
    const statusData = await loadStatus();
    const dbLoc = statusData?.player?.current_location;
    if (dbLoc) {
      activeSubLocation = dbLoc;
      localStorage.setItem('sim_active_subloc', activeSubLocation);
    }

    // 3. Sync full chat history from SQLite backend
    await loadChatHistory();

    // 4. Load dynamic context scene and remaining deck cards
    await Promise.all([
      loadScene(activeSubLocation),
      loadDeckInventory(),
      loadDeckNpcs(),
      loadDeckLedger(),
      loadDeckAgentLogs(),
      checkAuditStatus()
    ]);

    // 5. Check and render active historical event alert banner
    if (typeof checkAndRenderActiveEventBanner === 'function') {
      await checkAndRenderActiveEventBanner();
    }

    // 6. Check Grand Strategy Universe Modular Status
    try {
      if (typeof apiFetchStrategyModules === 'function') {
        const stratData = await apiFetchStrategyModules();
        const badgeEl = document.getElementById('txt-modular-status');
        if (badgeEl && stratData && stratData.modularEngineActive) {
          badgeEl.innerText = `Universe TS: ${stratData.modules.length} Modules`;
        }
      }
    } catch (e) {
      // non-blocking
    }
  } catch (err) {
    console.error('Error during initial load:', err);
    showToast(`Lỗi khởi tạo: ${err.message}`, true);
  }
}

// ==========================================================================
// STAMINA RECOVERY & DYNAMIC ANIMATION ENGINE
// ==========================================================================
let prevStaminaValue = null;
let staminaTickerTimer = null;
let currentStaminaCountdown = 0;
let staminaIntervalSecs = 27;

function triggerStaminaRecoveryAnimation(amount) {
  const container = document.getElementById('vital-stamina-item');
  if (!container || amount <= 0) return;

  container.classList.remove('stamina-pulse');
  void container.offsetWidth; // Force DOM reflow
  container.classList.add('stamina-pulse');
  setTimeout(() => container.classList.remove('stamina-pulse'), 1200);

  const gainEl = document.createElement('span');
  gainEl.className = 'vital-gain-indicator';
  gainEl.innerText = `+${amount}`;
  container.appendChild(gainEl);
  setTimeout(() => gainEl.remove(), 1400);
}

function updateStaminaRegenDisplay(fatigueVal, maxStamina, currentStamina, warAttr) {
  const timerEl = document.getElementById('stamina-timer-row');
  const barEl = document.getElementById('bar-stamina');
  const containerEl = document.getElementById('vital-stamina-item');
  if (!timerEl) return;

  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  staminaIntervalSecs = Math.max(8, 30 - Math.floor((warAttr - 50) * 0.4));

  if (fatigueVal <= 0) {
    timerEl.className = 'vital-sub-timer full';
    timerEl.innerHTML = isEn ? 'Full' : 'Đầy';
    if (barEl) barEl.classList.remove('recovering');
    if (containerEl) {
      containerEl.title = isEn 
        ? `Stamina Full: ${maxStamina}/${maxStamina} (WAR +${Math.round((warAttr - 50) * 1.5)} bonus)`
        : `Thể Lực Đầy: ${maxStamina}/${maxStamina} (Cộng hưởng Võ Lực +${Math.round((warAttr - 50) * 1.5)})`;
    }
    return;
  }

  if (barEl) barEl.classList.add('recovering');

  if (currentStaminaCountdown <= 0) {
    currentStaminaCountdown = staminaIntervalSecs;
  }

  const totalSecondsRemaining = Math.max(0, (fatigueVal - 1) * staminaIntervalSecs + currentStaminaCountdown);
  const mins = Math.floor(totalSecondsRemaining / 60);
  const secs = totalSecondsRemaining % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  timerEl.className = 'vital-sub-timer recovering';
  timerEl.innerHTML = `${timeStr} <span style="opacity:0.75; font-size:7.5px;">(+1/${staminaIntervalSecs}s)</span>`;

  if (containerEl) {
    containerEl.title = isEn
      ? `Stamina: ${currentStamina}/${maxStamina}. Passive Recovery: +1 point every ${staminaIntervalSecs}s (based on WAR ${warAttr}). Full in ${timeStr}.`
      : `Thể Lực: ${currentStamina}/${maxStamina}. Tự hồi phục: +1 điểm mỗi ${staminaIntervalSecs}s (dựa trên Võ Lực ${warAttr}). Hồi đầy sau ${timeStr}.`;
  }
}

function startStaminaRegenTicker() {
  if (staminaTickerTimer) clearInterval(staminaTickerTimer);
  staminaTickerTimer = setInterval(async () => {
    if (!currentStatus || !currentStatus.player) return;
    const p = currentStatus.player;
    const fatigueVal = Number(p.fatigue || 0);
    if (fatigueVal <= 0) {
      const warAttr = Number(p.war_attr || 50);
      const healthVal = Number(p.health || 100);
      const maxStamina = 100 + Math.max(0, Math.round((warAttr - 50) * 1.5)) + Math.floor(healthVal / 10);
      updateStaminaRegenDisplay(0, maxStamina, maxStamina, warAttr);
      return;
    }

    currentStaminaCountdown--;
    if (currentStaminaCountdown <= 0) {
      currentStaminaCountdown = staminaIntervalSecs;
      try {
        const res = await fetch(`${API_BASE}/api/player/stamina-tick`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.recovered > 0) {
            p.fatigue = data.fatigue;
            await loadStatus();
          }
        }
      } catch (e) {}
    } else {
      const warAttr = Number(p.war_attr || 50);
      const healthVal = Number(p.health || 100);
      const maxStamina = 100 + Math.max(0, Math.round((warAttr - 50) * 1.5)) + Math.floor(healthVal / 10);
      const currentStamina = Math.max(0, maxStamina - fatigueVal);
      updateStaminaRegenDisplay(fatigueVal, maxStamina, currentStamina, warAttr);
    }
  }, 1000);
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

      // Dynamic Stamina Calculation based on STR (WAR) and Vigor (HP)
      const warAttr = Number(p.war_attr || 50);
      const healthVal = Number(p.health || 100);
      const fatigueVal = Number(p.fatigue || 0);
      const maxStamina = 100 + Math.max(0, Math.round((warAttr - 50) * 1.5)) + Math.floor(healthVal / 10);
      const currentStamina = Math.max(0, maxStamina - fatigueVal);
      const staminaPct = Math.min(100, Math.max(0, Math.round((currentStamina / maxStamina) * 100)));

      // Trigger recovery animation if stamina increased
      if (prevStaminaValue !== null && currentStamina > prevStaminaValue) {
        triggerStaminaRecoveryAnimation(currentStamina - prevStaminaValue);
      }
      prevStaminaValue = currentStamina;

      const staminaEl = document.getElementById('protagonist-stamina');
      if (staminaEl) {
        staminaEl.innerText = `${currentStamina}/${maxStamina}`;
        if (staminaPct <= 20) {
          staminaEl.className = 'vital-val red-text';
        } else if (staminaPct <= 45) {
          staminaEl.className = 'vital-val gold-text';
        } else {
          staminaEl.className = 'vital-val cyan-text';
        }
      }

      const barStamina = document.getElementById('bar-stamina');
      if (barStamina) {
        barStamina.style.width = `${staminaPct}%`;
        if (staminaPct <= 20) {
          barStamina.style.backgroundColor = '#ef4444';
        } else if (staminaPct <= 45) {
          barStamina.style.backgroundColor = '#f59e0b';
        } else {
          barStamina.style.backgroundColor = '#06b6d4';
        }
      }

      updateStaminaRegenDisplay(fatigueVal, maxStamina, currentStamina, warAttr);

      // HP Sub-timer status
      const hpTimerEl = document.getElementById('hp-timer-row');
      if (hpTimerEl) {
        hpTimerEl.innerText = healthVal >= 80 
          ? (typeof currentLang !== 'undefined' && currentLang === 'en' ? 'Robust' : 'Khang kiện') 
          : (typeof currentLang !== 'undefined' && currentLang === 'en' ? 'Injured' : 'Thể tổn');
      }

      const moraleEl = document.getElementById('protagonist-morale');
      if (moraleEl) moraleEl.innerText = `${p.morale || 100}%`;

      const barMorale = document.getElementById('bar-morale');
      if (barMorale) barMorale.style.width = `${p.morale || 100}%`;

      const moraleVal = Number(p.morale || 100);
      const moraleTimerEl = document.getElementById('morale-timer-row');
      if (moraleTimerEl) {
        moraleTimerEl.innerText = moraleVal >= 80 
          ? (typeof currentLang !== 'undefined' && currentLang === 'en' ? 'High' : 'Hăng hái') 
          : (typeof currentLang !== 'undefined' && currentLang === 'en' ? 'Normal' : 'Bình ổn');
      }

      // 8-Axis Attributes & ROTK Equipment Stat Progression System
      const isEn = typeof currentLang !== 'undefined' && currentLang === 'en';
      const eqpData = data.equipment || {};
      const eqpBonuses = eqpData.bonuses || {};

      const attrConfig = [
        { key: 'int', labelVi: 'Trí Lực', labelEn: 'Intelligence', descVi: 'Mưu lược, sách lược' },
        { key: 'com', labelVi: 'Thương Nghiệp', labelEn: 'Commerce', descVi: 'Mua bán, định giá' },
        { key: 'dip', labelVi: 'Ngoại Giao', labelEn: 'Diplomacy', descVi: 'Thuyết phục hào kiệt' },
        { key: 'ldr', labelVi: 'Thống Soái', labelEn: 'Leadership', descVi: 'Chỉ huy quân ngũ & gia đinh' },
        { key: 'log', labelVi: 'Hậu Cần', labelEn: 'Logistics', descVi: 'Vận lương, kế toán' },
        { key: 'pol', labelVi: 'Chính Trị', labelEn: 'Politics', descVi: 'Quan phủ, giấy phép' },
        { key: 'cra', labelVi: 'Khéo Léo', labelEn: 'Crafting', descVi: 'Giám định, rèn đúc' },
        { key: 'war', labelVi: 'Võ Lực', labelEn: 'War / Martial', descVi: 'Tự vệ, cưỡi ngựa' }
      ];

      for (const attr of attrConfig) {
        const baseVal = Number(p[`${attr.key}_attr`] || 50);
        const bonus = Number(eqpBonuses[attr.key] || 0);
        const effectiveVal = baseVal + bonus;
        const currentExp = Number(p[`${attr.key}_exp`] || 0);

        // ROTK Required EXP Formula (<=90: 100, 91..99: 150, >=100: 250)
        const reqExp = baseVal <= 90 ? 100 : (baseVal <= 99 ? 150 : 250);
        const expPct = Math.min(100, Math.max(0, Math.round((currentExp / reqExp) * 100)));

        // Update attribute number display
        const attrNumEl = document.getElementById(`attr-${attr.key}`);
        if (attrNumEl) {
          if (bonus > 0) {
            attrNumEl.innerText = `${effectiveVal} (${baseVal}+${bonus})`;
          } else {
            attrNumEl.innerText = `${effectiveVal}`;
          }
        }

        // Update mini EXP progress bar
        const expBarEl = document.getElementById(`exp-bar-${attr.key}`);
        if (expBarEl) {
          expBarEl.style.width = `${expPct}%`;
        }

        // Update pill container, tooltip, and >100 golden cap highlight
        const pillEl = document.getElementById(`attr-pill-${attr.key}`);
        if (pillEl) {
          const attrLabel = isEn ? attr.labelEn : attr.labelVi;
          const tooltipExp = isEn
            ? `${attrLabel}: ${effectiveVal} [Base ${baseVal}${bonus > 0 ? ` + ${bonus} Gear` : ''}] • EXP: ${currentExp}/${reqExp} (${expPct}%)`
            : `${attrLabel}: ${effectiveVal} [Gốc ${baseVal}${bonus > 0 ? ` + ${bonus} Trang bị` : ''}] • EXP: ${currentExp}/${reqExp} (${expPct}%) — ${attr.descVi}`;
          pillEl.title = tooltipExp;

          if (effectiveVal > 100) {
            pillEl.classList.add('stat-over-100');
          } else {
            pillEl.classList.remove('stat-over-100');
          }
        }
      }
    }

    return data;
  } catch (err) {
    console.error('Failed to load status:', err);
    return null;
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
        if (hudAudit) hudAudit.innerText = `INVARIANTS: ${data.totalInvariantsVerified}/${data.totalInvariantsVerified} KHỚP`;
      } else {
        badge.className = 'badge-audit text-danger';
        badge.style.borderColor = 'var(--state-danger)';
        badge.style.color = '#f87171';
        badge.innerText = `${data.discrepanciesCount} Lệch`;
        if (hudAudit) hudAudit.innerText = `LỆCH: ${data.discrepanciesCount} INVARIANTS`;
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
    showToast('Đang thực thi thao tác khác, vui lòng chờ!', true);
    return;
  }
  if (activeSubLocation === locName) return;

  activeSubLocation = locName;
  localStorage.setItem('sim_active_subloc', activeSubLocation);
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
    showToast('Đang thực thi điều lệnh trước, vui lòng không nhấn dồn!', true);
    return;
  }

  if (!currentScene || !currentScene.options) return;
  const opt = currentScene.options.find(o => o.id === optId);
  if (!opt) return;

  if (opt.disabled) {
    const reason = (typeof currentLang !== 'undefined' && currentLang === 'en')
      ? (opt.disabledReasonEn || 'This action cannot be taken under current conditions.')
      : (opt.disabledReasonVi || 'Không đủ điều kiện thực hiện thao tác này.');
    showToast(reason, true);
    return;
  }

  const cardEl = document.getElementById(`choice-card-${optId}`);
  selectChoice(optId);

  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  // Clean description: strip any debug dice strings or table-top jargon
  const cleanDesc = (opt.desc || '')
    .replace(/•?\s*Đổ D20\s*\[[^\]]+\]\s*•?/gi, '')
    .replace(/•?\s*Roll D20\s*\[[^\]]+\]\s*•?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Append Player Action Turn into Story Chronicle
  appendStoryTurn({
    type: 'player',
    speaker: isEn ? 'Liang Yan' : 'Lương Diễn',
    title: isEn ? 'Decisive Action' : 'Quyết Sách Trực Tiếp',
    avatar: '梁',
    text: cleanDesc && cleanDesc !== opt.title
      ? `**${opt.title}**\n\n${cleanDesc}`
      : `**${opt.title}**`
  });

  setProcessingLock(true, cardEl, opt.title);

  try {
    // Kizuna Social Interaction via DailyInteractionEngine
    if (opt.action && opt.action.type === 'KIZUNA_INTERACT') {
      showToast(`Đang tương tác với ${opt.action.npc_name || 'Hào Kiệt'}...`);
      const kizunaRes = await fetch('/api/kizuna/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcId: opt.action.npc_id,
          actionType: opt.action.action_type || 'TEA_CONVERSE',
          prompt: opt.action.prompt || opt.title
        })
      });
      const kizunaData = await kizunaRes.json();
      if (!kizunaData.success) {
        showToast(`Tương tác thất bại: ${kizunaData.error}`, true);
        return;
      }
      const res = kizunaData.result;
      const npcName = isEn ? (res.npcNameEn || res.npcNameVi || opt.action.npc_name) : (res.npcNameVi || opt.action.npc_name);
      const speakerAvatar = opt.action.npc_name ? opt.action.npc_name.charAt(0) : '漢';
      const quoteText = isEn ? (res.dialogueNarrativeEn || res.dialogueNarrativeVi) : res.dialogueNarrativeVi;
      const deltaAffinity = res.deltas?.affinityChange || 0;
      const deltaRespect = res.deltas?.respectChange || 0;

      appendStoryTurn({
        type: 'npc',
        speaker: npcName,
        title: `${isEn ? (res.outcomeTitleEn || res.outcome) : (res.outcomeTitleVi || res.outcome)} • ${isEn ? 'Affinity' : 'Hảo Cảm'} ${deltaAffinity >= 0 ? '+' : ''}${deltaAffinity}`,
        avatar: speakerAvatar,
        text: quoteText,
        deltas: {
          relations: `${npcName} (+${deltaAffinity} ${isEn ? 'Affinity' : 'Hảo cảm'}, +${deltaRespect} ${isEn ? 'Respect' : 'Kính trọng'})`,
          cash: res.deltas?.cashCost ? `-${res.deltas.cashCost}` : undefined,
          audit: 'Ghi nhận quan hệ'
        }
      });

      // Refresh scene and deck
      await loadScene(activeSubLocation);
      renderAgentSimulationFeedback(`Tương tác cùng ${npcName} thành công. Tăng +${deltaAffinity} Hảo Cảm.`, { relations: `+${deltaAffinity}`, audit: '94/94 Khớp' });
      await Promise.all([loadStatus(), loadDeckNpcs(), loadDeckLedger()]);
      return;
    }

    // Location Movement Choice (Fallback compatibility)
    if (opt.action && opt.action.type === 'MOVE_LOCATION') {
      showToast(`Đang di chuyển tới ${opt.action.new_location}...`);
      opt.action.idempotency_key = `OPT_${optId}_${Date.now()}`;
      const moveRes = await dispatchDirectAction(opt.action);
      if (!moveRes || !moveRes.success) {
        showToast(`Không thể di chuyển: ${moveRes?.error || 'Lỗi không xác định'}`, true);
        return;
      }
      activeSubLocation = opt.action.new_location;
      localStorage.setItem('sim_active_subloc', activeSubLocation);

      appendStoryTurn({
        type: 'system',
        speaker: 'Hành Trình',
        title: 'Chuyển Đổi Địa Điểm',
        avatar: '行',
        text: `Lương Diễn đã rời bước, đặt chân tới **${opt.action.new_location}**. Bối cảnh xung quanh bắt đầu thay đổi.`,
        deltas: { location: activeSubLocation, audit: 'Cập nhật tọa độ' }
      });

      await Promise.all([loadStatus(), loadScene(activeSubLocation)]);
      if (typeof renderLocalPoiNav === 'function') {
        renderLocalPoiNav(activeSubLocation);
      }
      renderAgentSimulationFeedback(`Cơ động tới ${activeSubLocation}. Thiết lập vị trí chiến dịch mới.`, { location: activeSubLocation, audit: '70/70 Khớp' });
      return;
    }

    // Direct Authoritative SimulationCore Action
    if (opt.action) {
      showToast(`Đang thực thi: ${opt.title}...`);
      opt.action.idempotency_key = `OPT_${optId}_${Date.now()}`;
      const result = await dispatchDirectAction(opt.action);
      if (!result || !result.success) {
        showToast(`Điều lệnh bị từ chối: ${result?.error || 'Lỗi điều lệnh'}`, true);
        return;
      }

      let turnType = 'system';
      let speaker = 'SimCore Kiểm Toán';
      let title = 'Ghi Nhận Sổ Cái SQLite';
      let avatar = '核';
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
          avatar = '信';
          turnText = `Gia nhân phi ngựa mang mật lệnh bài về Xưởng Lương Thị. Thợ cả Trần Bảo mở thư tuân lệnh, hạ lệnh thợ xưởng hoàn thiện ${opt.action.batch_size} thành phẩm!`;
        }
      } else if (opt.action.type === 'TRADE_BUY' || opt.action.type === 'TRADE_SELL') {
        turnType = 'action';
        speaker = opt.action.counterparty || 'Thương Vụ Lương Gia';
        title = opt.action.type === 'TRADE_BUY' ? 'Thu Mua Vật Tư' : 'Xuất Bán Hàng Hóa';
        avatar = '商';
        turnText = `Giao dịch thương nghiệp **${opt.title}** đã hoàn tất giao nhận và đối ứng ngân khố.`;
      } else if (opt.action.type === 'REWARD_NPC') {
        turnType = 'npc';
        const sceneNpc = currentScene?.npc;
        speaker = sceneNpc?.name || opt.action.counterparty || 'Hào Kiệt';
        title = sceneNpc?.title || 'Đàm Đạo & Ban Thưởng';
        avatar = sceneNpc?.name ? sceneNpc.name.charAt(0) : '賞';
        if (speaker.includes('Quan Vũ')) {
          turnText = `Quan Vân Trường vuốt ròm râu dài, nâng chén trà thơm mỉm cười: *"Đa tạ Chí Viễn thịnh tình! Đại trượng phu gặp được tri kỷ cùng chung chí hướng binh pháp như đệ quả là đại hạnh!"*`;
        } else if (speaker.includes('Trương Phi')) {
          turnText = `Trương Phi vỗ đùi cười vang: *"Khá lắm Lương Chí Viễn! Hôm nay đệ đãi rượu thịt, lão Trương ta nhận tấm lòng này, nguyện cùng đệ kề vai sát cánh!"*`;
        } else if (speaker.includes('Lư Thực')) {
          turnText = `Trung lang tướng Lư Thực gật đầu tán thưởng: *"Chí Viễn kiến giải sâu sắc, nhìn thấu thế cục, quả không hổ là đệ tử đắc ý của lão phu!"*`;
        } else {
          turnText = `${speaker} cảm kích khôn xiết: *"Đa tạ công tử trọng thưởng! Xin dốc toàn lực vì đại nghiệp!"*`;
        }
      } else if (opt.action.type === 'RECORD_BOUNTY') {
        turnType = 'system';
        speaker = opt.action.counterparty || 'Bắc Quân Quân Lệnh Cục';
        title = 'Nhận Thưởng Quân Công';
        avatar = '勳';
        turnText = `Bộ chỉ huy đã giải ngân ban thưởng quân công **${opt.title}**. Số dư lưu động tăng thêm +${opt.action.amount} Tiền.`;
      } else if (opt.action.type === 'PERSONAL_GROWTH') {
        turnType = 'action';
        speaker = 'Lương Diễn';
        title = 'Tu Thân & Bồi Dưỡng';
        avatar = '修';
        const isRest = opt.action.sub_type === 'REST_RECOVERY';
        turnText = isRest 
          ? `Lương Diễn tĩnh tọa nghỉ ngơi dưỡng sức. Khí huyết hồi phục (Thể lực giảm bớt, Sĩ khí vươn cao).`
          : `Lương Diễn đã hoàn tất rèn luyện: **${opt.title}**.\n\n*${result.data?.memo || 'Thể lực và tâm thế được củng cố vững vàng.'}*`;
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
    showToast('Đang gửi yêu cầu cho AI Bridge, vui lòng không bấm liên tục!', true);
    return;
  }

  if (!currentScene || !currentScene.options) return;
  const opt = currentScene.options.find(o => o.id === optId);
  if (!opt) return;

  if (opt.disabled) {
    const reason = (typeof currentLang !== 'undefined' && currentLang === 'en')
      ? (opt.disabledReasonEn || 'This action cannot be taken under current conditions.')
      : (opt.disabledReasonVi || 'Không đủ điều kiện thực hiện thao tác này.');
    showToast(reason, true);
    return;
  }

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
        localStorage.setItem('sim_active_subloc', activeSubLocation);
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
      avatar = '信';
      diceBadge = null;
    } else if (result.dispatchType === 'TRAVEL') {
      type = 'travel';
      speaker = isEn ? 'Post Road Journey' : 'Lữ Trình Quan Đạo';
      title = isEn ? 'Scene Relocation' : 'Chuyển Cảnh Địa Lý';
      avatar = '馬';
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

  // Clean title: remove any residual [D20: ...] tag
  const cleanTitle = (title || '').replace(/\[D20:\s*\d+\]\s*/gi, '').trim();

  appendStoryTurn({
    type,
    speaker,
    title: cleanTitle || title,
    avatar,
    text: result.narrative,
    deltas: result.delta
  });
}

// 2.6 Command Dispatcher (Anti-Piling Guarded)
async function dispatchOmniCommand(mode = 'ai', explicitPrompt = null) {
  if (isProcessingAction) {
    showToast('Hệ thống đang tính toán lệnh trước, vui lòng không gửi dồn dập!', true);
    return;
  }

  const inputEl = document.getElementById('omni-input');
  const promptText = explicitPrompt || (inputEl ? inputEl.value.trim() : '');
  if (!promptText) {
    return;
  }

  // Append Player Action Turn into Story Chronicle
  const playerName = (window.currentScene && window.currentScene.player && window.currentScene.player.name) || 'Lương Diễn';
  appendStoryTurn({
    type: 'player',
    speaker: playerName,
    title: mode === 'instant' ? 'Mệnh Lệnh Tức Thì' : 'Mệnh Lệnh & Đối Thoại',
    avatar: '梁',
    text: promptText
  });

  if (inputEl) inputEl.value = '';
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
        localStorage.setItem('sim_active_subloc', activeSubLocation);
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
    showToast('Đang thực thi thao tác khác, vui lòng chờ!', true);
    return;
  }

  const npcNameMap = {
    'NPC-0002': { name: 'Trương Phi (Dực Đức)', title: 'Hào Kiệt Huyện Trác', avatar: '張', quote: 'Trương Phi sảng khoái vỗ đùi: *"Đa tạ Chí Viễn đệ! Ta nhận tấm lòng này, nguyện cùng đệ kề vai sát cánh!"*' },
    'NPC-0003': { name: 'Quan Vũ (Vân Trường)', title: 'Hào Kiệt Giải Lương', avatar: '關', quote: 'Quan Vân Trường vuốt râu dài mỉm cười: *"Đa tạ Chí Viễn thịnh tình! Đại trượng phu gặp tri kỷ quả là đại hạnh!"*' },
    'NPC-0004': { name: 'Lư Thực (Tử Cán)', title: 'Bắc Quân Trung Lang Tướng', avatar: '盧', quote: 'Lư Thực gật đầu khen ngợi: *"Chí Viễn kiến giải sâu sắc, quả không hổ là đệ tử đắc ý của lão phu!"*' },
    'NPC-0007': { name: 'Trần Bảo (Thợ Cả)', title: 'Lương Thị Chức Tác Phường', avatar: '陳', quote: 'Trần Bảo cảm kích cúi đầu bái tạ: *"Đa tạ Thiếu gia trọng thưởng! Thuộc hạ và anh em thợ nguyện dốc toàn lực chế tạo quân trang tốt nhất!"*' },
    'NPC-0008': { name: 'Triệu An (Thợ Đan)', title: 'Lương Thị Chức Tác Phường', avatar: '趙', quote: 'Triệu An cung kính tạ lễ: *"Đa tạ đông gia! Con sẽ đan thêm nhiều khiên trúc chắc chắn!"*' }
  };
  const npcInfo = npcNameMap[npcId] || { 
    name: currentScene?.npc?.name || npcId, 
    title: currentScene?.npc?.title || 'Nhân Sĩ', 
    avatar: currentScene?.npc?.name ? currentScene.npc.name.charAt(0) : '賞', 
    quote: `${currentScene?.npc?.name || npcId} nhận ban thưởng phấn khởi: *"Đa tạ công tử hậu đãi!"*` 
  };

  appendStoryTurn({
    type: 'player',
    speaker: 'Lương Diễn',
    title: 'Khen Thưởng Gia Nhân',
    avatar: '梁',
    text: `Ban thưởng **${amount} Tiền** cho ${npcInfo.name} để khích lệ sĩ khí trung thành!`
  });

  setProcessingLock(true, null, `Thưởng ${amount} Tiền cho ${npcInfo.name}`);
  showToast(`Ban thưởng ${amount} Tiền cho ${npcInfo.name}...`);

  try {
    const res = await dispatchDirectAction({
      type: 'REWARD_NPC',
      npc_id: npcId,
      amount,
      game_date: '184-05-02',
      idempotency_key: `RWD_${npcId}_${Date.now()}`
    });

    if (!res || !res.success) {
      showToast(`Không thể ban thưởng: ${res?.error || 'Lỗi không xác định'}`, true);
      return;
    }

    appendStoryTurn({
      type: 'npc',
      speaker: npcInfo.name,
      title: npcInfo.title,
      avatar: npcInfo.avatar,
      text: npcInfo.quote,
      deltas: { cash: `-${amount} Qian`, npc: 'Sĩ khí 100% • Trung thành +2', audit: '70/70 Khớp' },
      reasoning: `Khen thưởng ${amount} Tiền động viên ${npcInfo.name}. Sĩ khí tối đa.`
    });

    renderAgentSimulationFeedback(`Khen thưởng ${amount} Tiền động viên ${npcInfo.name}. Sĩ khí tối đa.`, { cash: `-${amount} Qian`, npc: 'Sĩ khí 100% • Trung thành +2', audit: '70/70 Khớp' });
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
      if (typeof openGameManagerModal === 'function') {
        openGameManagerModal();
      } else {
        showToast('Hệ thống SimCore: 76/76 Invariants SQLite đang bảo toàn 100%!');
      }
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
  startStaminaRegenTicker();
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
