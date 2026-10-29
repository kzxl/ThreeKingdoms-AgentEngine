/**
 * TRAVEL TRANSIT & ROAD ENCOUNTER INTERACTION MODULE
 * (public/js/travel-transit.js)
 *
 * Implements interactive travel modal, road progress visualization against SQLite master_routes,
 * procedural ROTK travel encounters, D20 skill checks, and destination arrival.
 */

let currentTransitState = {
  originNode: null,
  targetNode: null,
  plan: null,
  stage: 1, // 1: Departure, 2: Encounter/Road, 3: Arrival
  hasEncounter: false,
  encounter: null,
  selectedChoice: null,
  resolution: null,
  isRolling: false
};

function getTravelTransitContent() {
  let content = document.getElementById('travel-transit-content');
  if (content) return content;

  const body = document.getElementById('travel-transit-modal-body');
  if (!body) return null;

  content = document.createElement('div');
  content.id = 'travel-transit-content';
  content.className = 'travel-transit-content';
  body.classList.add('travel-transit-shell-body');
  body.appendChild(content);
  return content;
}

function openTravelTransitModalShell() {
  if (window.TravelTransitUI && typeof window.TravelTransitUI.openLegacy === 'function') {
    window.TravelTransitUI.openLegacy();
    return true;
  }
  const modal = document.getElementById('travel-transit-modal');
  if (!modal) return false;
  modal.classList.remove('hidden');
  return true;
}

function closeTravelTransitModalShell() {
  if (window.TravelTransitUI && typeof window.TravelTransitUI.closeLegacy === 'function') {
    window.TravelTransitUI.closeLegacy();
  }
  const modal = document.getElementById('travel-transit-modal');
  if (modal) modal.classList.add('hidden');
}

async function openTravelTransit(targetNodeId) {
  const targetNode = WORLD_MAP_NODES[targetNodeId];
  if (!targetNode) {
    showToast(currentLang === 'en' ? 'Destination not found.' : 'Không tìm thấy địa điểm đích.', true);
    return;
  }

  const originNode = getCurrentRegionNode(activeSubLocation) || WORLD_MAP_NODES['zhuo_xian'];
  if (originNode.id === targetNodeId) {
    showToast(currentLang === 'en' ? 'Already in this region.' : 'Đang ở khu vực này rồi.');
    return;
  }

  // Close World Map Modal
  closeWorldMap();

  if (!openTravelTransitModalShell()) {
    showToast(currentLang === 'en' ? 'Travel dialog is unavailable.' : 'Không mở được hộp thoại hành trình.', true);
    return;
  }
  getTravelTransitContent();

  currentTransitState = {
    originNode,
    targetNode,
    plan: null,
    stage: 1,
    hasEncounter: false,
    encounter: null,
    selectedChoice: null,
    resolution: null,
    isRolling: false
  };

  renderTravelTransitLoading();

  try {
    // Query route logistics & master_routes from backend
    const plan = await apiPlanTravel(originNode.id, targetNodeId);
    currentTransitState.plan = plan;
  } catch (err) {
    console.warn('Fallback to local map data for transit plan:', err);
    currentTransitState.plan = {
      fromNodeId: originNode.id,
      toNodeId: targetNodeId,
      distanceLi: targetNode.distanceFromZhuo,
      terrainType: 'PLAINS',
      marchDays: targetNode.daysRequired,
      grainCost: targetNode.grainCost,
      riskLevel: targetNode.threatVi,
      routeDescriptionVi: `Đại lộ quan đạo tiến về ${targetNode.nameVi}.`,
      routeDescriptionEn: `Imperial highway route heading toward ${targetNode.nameEn}.`,
      playerGrain: 9.60,
      hasEnoughGrain: true,
      playerFatigue: 0
    };
  }

  renderTravelTransitStage();
}

function closeTravelTransit() {
  closeTravelTransitModalShell();
}

function renderTravelTransitLoading() {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const container = getTravelTransitContent();
  if (!container) return;
  container.innerHTML = `
    <div class="trv-stage-box text-center" style="padding: 40px 10px;">
      <div class="turn-adv-spinner"></div>
      <h4 style="color: #fde68a; margin-bottom: 6px;">${isEn ? 'Surveying Imperial Highway...' : 'Đang khảo sát lộ trình quan đạo...'}</h4>
      <p style="font-size: 11px; color: #94a3b8;">${isEn ? 'Calculating distance, march days, terrain risks from master archives...' : 'Tra cứu cự ly, địa hình và nguy cơ phục kích từ cơ sở dữ liệu master_routes...'}</p>
    </div>
  `;
}

function renderTravelTransitStage() {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const { originNode, targetNode, plan, stage, hasEncounter, encounter, resolution, isRolling } = currentTransitState;
  const container = getTravelTransitContent();
  if (!container || !plan) return;

  const originName = typeof getShortNodeName === 'function'
    ? getShortNodeName(originNode, isEn)
    : (isEn ? originNode.nameEn : originNode.nameVi);
  const targetName = typeof getShortNodeName === 'function'
    ? getShortNodeName(targetNode, isEn)
    : (isEn ? targetNode.nameEn : targetNode.nameVi);

  // Header Route Banner
  let progressPercent = 10;
  if (stage === 2) progressPercent = 55;
  if (stage === 3) progressPercent = 100;

  let stageLabelVi = 'Giai đoạn 1: Khảo Sát Lộ Trình & Khởi Hành';
  let stageLabelEn = 'Stage 1: Route Survey & Departure';
  if (stage === 2) {
    stageLabelVi = hasEncounter ? 'Giai đoạn 2: Dặm Đường Biến Cố & Giao Tranh' : 'Giai đoạn 2: Thuận Gió Tiến Quân';
    stageLabelEn = hasEncounter ? 'Stage 2: Road Encounter & Hazard' : 'Stage 2: Clear Road Marching';
  } else if (stage === 3) {
    stageLabelVi = 'Giai đoạn 3: Nhập Thành & Điểm Binh';
    stageLabelEn = 'Stage 3: Arrival & Base Establishment';
  }

  let bodyHtml = '';

  // STAGE 1: DEPARTURE INSPECTION
  if (stage === 1) {
    const terrainBadgeMap = {
      'PLAINS': { vi: 'Đồng Bằng (Dễ đi)', en: 'Plains (Smooth)', color: '#34d399' },
      'RIVER_CROSSING': { vi: 'Bến Đò Vượt Sông', en: 'River Crossing', color: '#38bdf8' },
      'RIVER_WATERWAY': { vi: 'Đường Thủy / Sông Lớn', en: 'Waterway', color: '#06b6d4' },
      'MOUNTAIN_PASS': { vi: 'Đèo Núi Hiểm Trở', en: 'Mountain Pass', color: '#fbbf24' },
      'PLANK_ROAD': { vi: 'Sạn Đạo Vực Sâu (Rất Nguy Hiểm)', en: 'Plank Road (Extreme)', color: '#f87171' }
    };
    const tBadge = terrainBadgeMap[plan.terrainType] || { vi: plan.terrainType, en: plan.terrainType, color: '#fbbf24' };

    bodyHtml = `
      <div class="trv-stage-box">
        <div class="trv-briefing-grid">
          <div class="trv-brief-card">
            <span class="trv-brief-lbl">${isEn ? 'Distance (master_routes)' : 'Cự Ly Quan Đạo'}</span>
            <span class="trv-brief-val font-mono">${plan.distanceLi} ${isEn ? 'Li' : 'Dặm'}</span>
          </div>
          <div class="trv-brief-card">
            <span class="trv-brief-lbl">${isEn ? 'March Duration' : 'Thời Gian Hành Quân'}</span>
            <span class="trv-brief-val font-mono">${plan.marchDays} ${isEn ? 'Days' : 'Ngày'}</span>
          </div>
          <div class="trv-brief-card">
            <span class="trv-brief-lbl">${isEn ? 'Grain Cost' : 'Lương Thảo Tiêu Hao'}</span>
            <span class="trv-brief-val font-mono cyan-text">${plan.grainCost} / ${plan.playerGrain} ${isEn ? 'Piculs' : 'Thạch'}</span>
          </div>
          <div class="trv-brief-card">
            <span class="trv-brief-lbl">${isEn ? 'Terrain & Threat' : 'Địa Hình & Nguy Cơ'}</span>
            <span class="trv-brief-val font-mono" style="color: ${tBadge.color}; font-size: 11px;">
              ${isEn ? tBadge.en : tBadge.vi} (${plan.riskLevel})
            </span>
          </div>
        </div>

        <div class="trv-narrative-panel">
          <p class="trv-desc-text">
            <strong>${isEn ? 'Route Logistics' : 'Khảo Sát Tuyến Đường'}:</strong> ${isEn ? plan.routeDescriptionEn : plan.routeDescriptionVi}<br>
            ${isEn
              ? `The march expedition prepares to traverse from <strong>${originName}</strong> to <strong>${targetName}</strong>. Baggage wagons are strapped, mounts watered, and scouts deployed along the flanks.`
              : `Quân đoàn viễn chinh chuẩn bị xuất quân từ <strong>${originName}</strong> vượt dặm trường tới <strong>${targetName}</strong>. Xe ngựa thồ hàng, lương thảo đã chằng buộc kỹ lưỡng.`}
          </p>
          ${!plan.hasEnoughGrain ? `
            <div class="trv-grain-warning" style="margin-top: 10px; color: #f87171; font-size: 11px; font-weight: 700;">
              警 ${isEn ? `Insufficient strategic grain! You need ${plan.grainCost} piculs but have only ${plan.playerGrain} piculs.` : `Không đủ quân lương hành quân! Cần có ít nhất ${plan.grainCost} thạch lương nhưng hiện chỉ có ${plan.playerGrain} thạch.`}
            </div>
          ` : ''}
        </div>

        <div class="trv-action-bar">
          <button class="btn btn-outline" onclick="closeTravelTransit()">
            ${isEn ? 'Cancel March' : 'Hủy Hành Quân'}
          </button>
          <button class="btn btn-primary font-bold trv-btn-start" onclick="startTravelExpedition()" ${!plan.hasEnoughGrain ? 'disabled' : ''}>
            <span>騎 ${isEn ? 'Begin Road Journey' : 'Khởi Hành Lên Đường'}</span>
          </button>
        </div>
      </div>
    `;
  }

  // STAGE 2: ROAD ENCOUNTER OR CLEAR MARCH
  else if (stage === 2) {
    if (hasEncounter && encounter) {
      const encTitle = isEn ? encounter.titleEn : encounter.titleVi;
      const encDesc = isEn ? encounter.narrativeEn : encounter.narrativeVi;

      bodyHtml = `
        <div class="trv-stage-box">
          <!-- Encounter Banner -->
          <div class="trv-encounter-card">
            <div class="trv-enc-header">
              <span class="trv-enc-icon">${encounter.icon || '警'}</span>
              <div>
                <div class="trv-enc-title">${encTitle}</div>
                <div class="trv-enc-badge">${isEn ? 'Road Transit Incident' : 'Biến Cố Dọc Đường'} • ${plan.terrainType}</div>
              </div>
            </div>
            <div class="trv-enc-body">
              <p>${encDesc}</p>
            </div>
          </div>

          <!-- Choices or Resolution -->
          ${!resolution ? `
            <div class="trv-choices-list">
              <div class="trv-choice-prompt">${isEn ? 'Select Tactical Course of Action:' : 'Lựa chọn phương án ứng đối:'}</div>
              ${encounter.choices.map((c, idx) => {
                const text = isEn ? c.textEn : c.textVi;
                const hasCheck = c.skillKey !== 'none';
                const dcBadge = hasCheck ? `<span class="trv-dc-badge font-mono">DC ${c.targetDC} (${c.attrNameVi}: ${c.playerAttrVal} [${c.playerMod >= 0 ? '+' : ''}${c.playerMod}])</span>` : `<span class="trv-dc-badge safe">${isEn ? 'Certain' : 'Chắc chắn'}</span>`;
                return `
                  <button class="trv-choice-btn" onclick="executeTravelEncounterChoice(${idx})" ${isRolling ? 'disabled' : ''}>
                    <div class="trv-choice-text">${text}</div>
                    ${dcBadge}
                  </button>
                `;
              }).join('')}
            </div>
          ` : `
            <!-- Resolution Display -->
            <div class="trv-resolution-card ${resolution.isSuccess ? 'success' : 'failure'}">
              <div class="trv-res-header">
                <span class="trv-res-dice font-mono">骰 D20: [${resolution.d20Roll}] ${resolution.mod >= 0 ? '+' : ''}${resolution.mod} = <strong>${resolution.totalScore}</strong> vs DC ${resolution.targetDC}</span>
                <span class="trv-res-verdict font-bold ${resolution.isSuccess ? 'success-text' : 'danger-text'}">
                  ${resolution.isSuccess ? (isEn ? '◆ SUCCESS' : '◆ THÀNH CÔNG') : (isEn ? '× CHALLENGE' : '× TRẮC TRỞ')}
                </span>
              </div>
              <div class="trv-res-narrative">
                <p>${resolution.narrative}</p>
              </div>
              ${resolution.delta && resolution.delta.narrative ? `
                <div class="trv-res-delta">
                  <span class="font-bold">${isEn ? 'Outcome Delta:' : 'Biến Động:'}</span> ${resolution.delta.narrative}
                </div>
              ` : ''}
            </div>

            <div class="trv-action-bar">
              <button class="btn btn-primary font-bold" onclick="advanceToTravelArrival()">
                <span>${isEn ? 'Continue March to Destination' : 'Tiếp Tục Tiến Về Đích Đến'} →</span>
              </button>
            </div>
          `}
        </div>
      `;
    } else {
      // Clear Road
      bodyHtml = `
        <div class="trv-stage-box">
          <div class="trv-encounter-card" style="border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.06);">
            <div class="trv-enc-header">
              <span class="trv-enc-icon">旗</span>
              <div>
                <div class="trv-enc-title" style="color: #34d399;">${isEn ? 'Clear Road • Disciplined March' : 'Quan Đạo An Định • Thuận Buồm Xuôi Gió'}</div>
                <div class="trv-enc-badge font-mono">${isEn ? 'SAFE PASSAGE' : 'LỘ TRÌNH THÔNG SUỐT'} • ${plan.terrainType}</div>
              </div>
            </div>
            <div class="trv-enc-body">
              <p>
                ${isEn 
                  ? `Your marching column maintains rigorous discipline along the imperial highway. The weather remains clear, river crossings serene, and scouts report zero bandit activity along this stretch.`
                  : `Đoàn quân duy trì quân kỷ nghiêm minh dọc theo trục quan đạo. Thời tiết quang đãng, bến đò thuận tiện và toán thám mã tiền phương báo về không có bóng dáng sơn tặc hay trở ngại.`}
              </p>
            </div>
          </div>

          <div class="trv-action-bar">
            <button class="btn btn-primary font-bold" onclick="advanceToTravelArrival()">
              <span>${isEn ? 'Advance to Destination' : 'Tiến Về Cổng Thành Đích'} →</span>
            </button>
          </div>
        </div>
      `;
    }
  }

  // STAGE 3: ARRIVAL AT DESTINATION
  else if (stage === 3) {
    bodyHtml = `
      <div class="trv-stage-box trv-arrival-box">
        <div class="trv-arrival-icon">旗</div>
        <h4 class="trv-arrival-title">${isEn ? 'Expedition Arrived at' : 'Đoàn Quân Đã Tới'} ${targetName}!</h4>
        <p class="trv-arrival-desc">
          ${isEn
            ? `Your standard banners flutter over the fortress gates of <strong>${targetName}</strong>. Logistics supplies have been safely offloaded, mount stables secured, and battlefield coordinates established.`
            : `Cờ xí phe ta đã tung bay trước cổng thành <strong>${targetName}</strong>. Đoàn tùy tùng đã dỡ hàng quân nhu an toàn, chiến mã được chăm sóc chu đáo, tọa độ tác chiến tiền phương đã được thiết lập vững vàng.`}
        </p>

        <div class="trv-arrival-metrics">
          <div class="trv-metric-pill">
            <span class="lbl">${isEn ? 'Grain Consumed' : 'Lương Thảo Hao Hụt'}</span>
            <span class="val cyan-text">-${plan.grainCost} ${isEn ? 'Piculs' : 'Thạch'}</span>
          </div>
          <div class="trv-metric-pill">
            <span class="lbl">${isEn ? 'Distance Covered' : 'Quãng Đường Vượt Qua'}</span>
            <span class="val amber-text">${plan.distanceLi} ${isEn ? 'Li' : 'Dặm'}</span>
          </div>
          <div class="trv-metric-pill">
            <span class="lbl">${isEn ? 'Base Status' : 'Tình Trạng'}</span>
            <span class="val green-text">${isEn ? 'SECURED' : 'AN TOÀN'}</span>
          </div>
        </div>

        <div class="trv-action-bar">
          <button class="btn btn-primary font-bold trv-btn-enter" onclick="finalizeMarchArrival()">
            <span>${isEn ? 'Enter Citadel / Command Post' : 'Tiến Vào Thành Trì & Thiết Lập Doanh'}</span>
          </button>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- Route Visualization & Stepper -->
    <div class="trv-route-banner">
      <div class="trv-route-nodes">
        <div class="trv-node origin">
          <span class="trv-node-dot"></span>
          <span class="trv-node-name">${originName}</span>
        </div>
        <div class="trv-route-line-wrap">
          <div class="trv-progress-bar">
            <div class="trv-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <span class="trv-marker-icon" style="left: ${progressPercent}%;">騎</span>
        </div>
        <div class="trv-node destination">
          <span class="trv-node-dot active"></span>
          <span class="trv-node-name">${targetName}</span>
        </div>
      </div>
      <div class="trv-stage-label font-mono">${isEn ? stageLabelEn : stageLabelVi}</div>
    </div>

    <!-- Body Stage Content -->
    ${bodyHtml}
  `;
}

async function startTravelExpedition() {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const { originNode, targetNode } = currentTransitState;

  try {
    showToast(isEn ? 'Expedition marching on the road...' : 'Đoàn quân đang hành tiến trên lộ trình...');
    currentTransitState.stage = 2;
    renderTravelTransitStage();

    // Call start travel API to roll encounter based on master_routes risk
    const transit = await apiStartTravel(originNode.id, targetNode.id);
    currentTransitState.plan = transit.plan || currentTransitState.plan;
    currentTransitState.hasEncounter = transit.hasEncounter;
    currentTransitState.encounter = transit.encounter;
    renderTravelTransitStage();
  } catch (err) {
    console.error('Failed to start travel:', err);
    showToast(err.message, true);
    currentTransitState.stage = 1;
    renderTravelTransitStage();
  }
}

async function executeTravelEncounterChoice(choiceIndex) {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const { encounter, originNode, targetNode, plan } = currentTransitState;
  if (!encounter || !encounter.choices[choiceIndex]) return;

  const choice = encounter.choices[choiceIndex];
  currentTransitState.selectedChoice = choice;
  currentTransitState.isRolling = true;
  renderTravelTransitStage();

  // Animated Dice Rolling
  const roll = Math.floor(Math.random() * 20) + 1;

  try {
    // Call backend resolver to mutate player state with ACID safety
    const resolution = await apiResolveTravelEncounter({
      eventId: encounter.id,
      choiceId: choice.id,
      roll,
      plan,
      fromNodeId: originNode.id,
      toNodeId: targetNode.id,
      targetNodeNameVi: targetNode.nameVi
    });

    currentTransitState.resolution = resolution;
    currentTransitState.isRolling = false;
    renderTravelTransitStage();

    // Reload status metrics in background
    if (typeof loadStatus === 'function') loadStatus();

  } catch (err) {
    console.error('Resolve travel choice failed:', err);
    showToast(err.message, true);
    currentTransitState.isRolling = false;
    renderTravelTransitStage();
  }
}

function advanceToTravelArrival() {
  currentTransitState.stage = 3;
  renderTravelTransitStage();
}

async function finalizeMarchArrival() {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const { targetNode, plan } = currentTransitState;
  if (!targetNode || !plan) return;

  try {
    setProcessingLock(true, isEn ? 'Establishing Command Base...' : 'Đang thiết lập bản doanh...');

    // The server completes the march atomically: it charges route grain once
    // and advances the campaign clock by the same whole days, so the client
    // must not spend action time (or grain) a second time here.
    const marchResult = await apiCompleteTravelMarch({
      targetSubLoc: targetNode.defaultSubLoc,
      grainCost: plan.grainCost,
      distanceLi: plan.distanceLi,
      marchDays: plan.marchDays,
      terrainType: plan.terrainType,
      targetNameVi: targetNode.nameVi,
      targetNameEn: targetNode.nameEn
    });

    if (marchResult?.time?.missingGrain) {
      showToast(isEn ? 'Grain reserves ran dry on the march.' : 'Lương thảo cạn kiệt trên đường hành quân.', true);
    }

    // Close Transit Modal
    closeTravelTransit();

    // Update active sublocation & scene
    activeSubLocation = targetNode.defaultSubLoc;
    localStorage.setItem('sim_active_subloc', activeSubLocation);
    await loadScene(targetNode.defaultSubLoc);
    renderLocalPoiNav(targetNode.defaultSubLoc);

    // Refresh All Core Decks
    await Promise.all([
      loadStatus(),
      loadDeckInventory(),
      loadDeckNpcs(),
      loadDeckLedger()
    ]);

    showToast(isEn ? `Arrived at ${targetNode.nameEn}!` : `Đã đến ${targetNode.nameVi}!`);

  } catch (err) {
    console.error('Finalize march failed:', err);
    showToast(`Hành quân thất bại: ${err.message}`, true);
  } finally {
    setProcessingLock(false, null);
  }
}

// Global exposure
window.openTravelTransit = openTravelTransit;
window.closeTravelTransit = closeTravelTransit;
window.startTravelExpedition = startTravelExpedition;
window.executeTravelEncounterChoice = executeTravelEncounterChoice;
window.advanceToTravelArrival = advanceToTravelArrival;
window.finalizeMarchArrival = finalizeMarchArrival;
