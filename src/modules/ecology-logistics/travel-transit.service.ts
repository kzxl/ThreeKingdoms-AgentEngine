/**
 * ThreeKingdoms-AgentEngine: Regional Travel & Expedition Transit Service
 * (src/modules/ecology-logistics/travel-transit.service.ts)
 *
 * Implements road journey logistics, route planning against SQLite master_routes,
 * terrain-specific encounters with D20 skill checks, and destination arrival.
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { DatabaseService } from '../../core/database';

export const NODE_TO_LOC_MAP: Record<string, string> = {
  'zhuo_xian': 'LOC-0001',
  'luo_yang': 'LOC-0002',
  'guang_zong': 'LOC-0003',
  'ping_yuan': 'LOC-0004',
  'chang_an': 'LOC-0005',
  'ye_cheng': 'LOC-0006',
  'xu_chang': 'LOC-0007',
  'ji_cheng': 'LOC-0008',
  'xia_pi': 'LOC-0009',
  'xiang_yang': 'LOC-0010',
  'chi_bi': 'LOC-0011',
  'jiang_ling': 'LOC-0012',
  'jian_ye': 'LOC-0013',
  'han_zhong': 'LOC-0014',
  'cheng_du': 'LOC-0015'
};

export interface MasterRouteRow {
  route_id: string;
  source_location_id: string;
  target_location_id: string;
  distance_li: number;
  terrain_type: string;
  standard_march_days: number;
  grain_provision_cost: number;
  ambush_risk_level: string;
  description_vi: string | null;
  description_en: string | null;
}

export interface TravelPlan {
  fromNodeId: string;
  toNodeId: string;
  sourceLocationId: string;
  targetLocationId: string;
  routeId: string;
  distanceLi: number;
  terrainType: string;
  marchDays: number;
  grainCost: number;
  riskLevel: string;
  routeDescriptionVi: string;
  routeDescriptionEn: string;
  playerGrain: number;
  hasEnoughGrain: boolean;
  playerFatigue: number;
}

export interface TravelEncounterChoice {
  id: string;
  textVi: string;
  textEn: string;
  skillKey: 'war' | 'int' | 'com' | 'cra' | 'dip' | 'log' | 'none';
  attrNameVi: string;
  targetDC: number;
  playerAttrVal: number;
  playerMod: number;
  successNarrativeVi: string;
  successNarrativeEn: string;
  successDelta: Record<string, any>;
  failureNarrativeVi: string;
  failureNarrativeEn: string;
  failureDelta: Record<string, any>;
}

export interface TravelEncounter {
  id: string;
  category: string;
  titleVi: string;
  titleEn: string;
  icon: string;
  threat: string;
  terrainType: string;
  narrativeVi: string;
  narrativeEn: string;
  choices: TravelEncounterChoice[];
}

export class TravelTransitService {
  private db: DatabaseService;

  constructor(db?: DatabaseService) {
    this.db = db || DatabaseService.getInstance();
  }

  /**
   * Plans the road expedition between two nodes using master_routes
   */
  public planTravel(fromNodeId: string, toNodeId: string): TravelPlan {
    const srcLoc = NODE_TO_LOC_MAP[fromNodeId] || fromNodeId;
    const tgtLoc = NODE_TO_LOC_MAP[toNodeId] || toNodeId;

    // 1. Fetch route from master_routes
    const route = this.db.queryOne<MasterRouteRow>(
      `SELECT * FROM master_routes 
       WHERE (source_location_id = ? AND target_location_id = ?)
          OR (source_location_id = ? AND target_location_id = ?)
       LIMIT 1;`,
      [srcLoc, tgtLoc, tgtLoc, srcLoc]
    );

    // 2. Fetch target location info for fallbacks
    const tgtLocation = this.db.queryOne<{
      name_vi: string;
      distance_from_zhuo: number;
      march_days: number;
      grain_cost: number;
      threat_level_vi: string;
    }>(`SELECT * FROM master_locations WHERE location_id = ? LIMIT 1;`, [tgtLoc]);

    // 3. Fallback calculation if route not directly connected
    const distanceLi = route ? route.distance_li : (tgtLocation?.distance_from_zhuo || 300);
    const terrainType = route ? route.terrain_type : 'PLAINS';
    const marchDays = route ? route.standard_march_days : (tgtLocation?.march_days || 2.0);
    const grainCost = route ? route.grain_provision_cost : (tgtLocation?.grain_cost || 2.0);
    const riskLevel = route ? route.ambush_risk_level : (tgtLocation?.threat_level_vi || 'MODERATE');
    const routeDescVi = route?.description_vi || `Đại lộ quan đạo tiến về ${tgtLocation?.name_vi || toNodeId}.`;
    const routeDescEn = route?.description_en || `Imperial highway route heading toward ${toNodeId}.`;

    // 4. Fetch player state
    const player = this.db.queryOne<{ strategic_grain: number; fatigue: number; current_location: string }>(
      `SELECT strategic_grain, fatigue, current_location FROM player_state LIMIT 1;`
    );

    const playerGrain = Number(player?.strategic_grain || 0);
    const hasEnoughGrain = playerGrain >= grainCost;
    const playerFatigue = Number(player?.fatigue || 0);

    return {
      fromNodeId,
      toNodeId,
      sourceLocationId: srcLoc,
      targetLocationId: tgtLoc,
      routeId: route?.route_id || `RT-${fromNodeId.toUpperCase()}-${toNodeId.toUpperCase()}`,
      distanceLi,
      terrainType,
      marchDays,
      grainCost,
      riskLevel,
      routeDescriptionVi: routeDescVi,
      routeDescriptionEn: routeDescEn,
      playerGrain,
      hasEnoughGrain,
      playerFatigue
    };
  }

  /**
   * Begins the journey: checks if an encounter triggers based on route risk level & terrain
   */
  public startTravel(fromNodeId: string, toNodeId: string): {
    plan: TravelPlan;
    hasEncounter: boolean;
    encounter: TravelEncounter | null;
  } {
    const plan = this.planTravel(fromNodeId, toNodeId);

    // Probability of encounter by risk level
    let encounterProb = 0.35;
    if (plan.riskLevel === 'EXTREME') encounterProb = 0.75;
    else if (plan.riskLevel === 'HIGH') encounterProb = 0.55;
    else if (plan.riskLevel === 'MODERATE') encounterProb = 0.35;
    else if (plan.riskLevel === 'LOW') encounterProb = 0.20;

    const roll = Math.random();
    const hasEncounter = roll <= encounterProb;

    let encounter: TravelEncounter | null = null;
    if (hasEncounter) {
      encounter = this.generateEncounterForTerrain(plan.terrainType, fromNodeId, toNodeId);
    }

    return {
      plan,
      hasEncounter,
      encounter
    };
  }

  /**
   * Generates a contextual road encounter based on terrain type and player attributes
   */
  private generateEncounterForTerrain(terrainType: string, fromNodeId: string, toNodeId: string): TravelEncounter {
    const player = this.db.queryOne<any>(`SELECT * FROM player_state LIMIT 1;`) || {};

    const calcMod = (skillKey: string) => {
      if (skillKey === 'none') return { val: 50, mod: 0 };
      const val = Number(player[`${skillKey}_attr`] || 50);
      return { val, mod: Math.floor((val - 50) / 5) };
    };

    // Encounter variant matching terrain
    if (terrainType === 'PLANK_ROAD' || terrainType === 'MOUNTAIN_PASS') {
      const warStat = calcMod('war');
      const craStat = calcMod('cra');
      return {
        id: 'TRV-MOUNTAIN-GORGE',
        category: 'hazard',
        titleVi: 'Sạn Đạo Sạt Lở & Vách Đá Hiểm Trở',
        titleEn: 'Treacherous Plank Path & Rockslide',
        icon: '⛰️',
        threat: 'high',
        terrainType,
        narrativeVi: 'Lộ trình vắt ngang vách núi Tần Lĩnh hiểm trở. Một đợt đất đá từ đỉnh núi vừa sạt lở làm gãy nhịp cầu sạn đạo bắc qua vực sâu vạn trượng!',
        narrativeEn: 'The narrow plank road hangs over abyssal mountain cliffs. Recent rockslides have smashed wooden bridges across the chasm!',
        choices: [
          {
            id: 'build_bridge',
            textVi: '[Khéo Léo DC 12] Dùng gỗ rừng và xà ngang dựng cầu tạm vượt vực sâu',
            textEn: '[Craft DC 12] Fell pine timber to bridge the abyss with temporary beams',
            skillKey: 'cra',
            attrNameVi: 'Khéo Léo',
            targetDC: 12,
            playerAttrVal: craStat.val,
            playerMod: craStat.mod,
            successNarrativeVi: 'Đôi bàn tay khéo léo kết hợp đòn bẩy vững chắc! Đoàn quân đưa xe hàng qua vực an toàn không hề trầy xước.',
            successNarrativeEn: 'Expert engineering secures the crossing! Supplies and mounts traverse the chasm without loss.',
            successDelta: { craExp: 35, logExp: 20, morale: 5, narrative: '+35 EXP Khéo Léo, +20 EXP Hậu Cần, Vượt quan an toàn' },
            failureNarrativeVi: 'Cầu tạm bị tròng trành, một xe hành lý nhỏ rơi xuống vực gây tổn thất lương thảo.',
            failureNarrativeEn: 'The temporary bridge wobbles violently; a small baggage wagon is lost down the gorge.',
            failureDelta: { grainCost: 0.4, fatigue: 15, narrative: '-0.4 Thạch lương tổn thất, +15 Mệt mỏi' }
          },
          {
            id: 'scout_path',
            textVi: '[Võ Lực/Thể Lực DC 11] Men theo gờ đá hiểm tìm lối mòn vòng qua đỉnh núi',
            textEn: '[Martial DC 11] Scale the steep mountain ridges to bypass the fracture zone',
            skillKey: 'war',
            attrNameVi: 'Võ Lực',
            targetDC: 11,
            playerAttrVal: warStat.val,
            playerMod: warStat.mod,
            successNarrativeVi: 'Dũng khí và thể lực phi thường! Lương Diễn dẫn đầu toán tùy tùng vượt qua đỉnh đá nhọn hoắt an toàn.',
            successNarrativeEn: 'Superb physical vigor! You lead your pack train over the crags safely.',
            successDelta: { warExp: 30, morale: 5, narrative: '+30 EXP Võ Lực, Rèn luyện thể lực trên núi cao' },
            failureNarrativeVi: 'Đường núi trơn trượt khiến người và ngựa trầy vi tróc vảy, tiêu hao nhiều thể lực.',
            failureNarrativeEn: 'Loose scree causes painful slips and bruises, draining stamina.',
            failureDelta: { fatigue: 20, narrative: '+20 Mệt mỏi' }
          },
          {
            id: 'wait_pass',
            textVi: '[Dịch Trạm] Hạ trại nghỉ ngơi tại hang đá, chờ toán sơn phu địa phương sang sửa',
            textEn: '[Patience] Camp under the cave shelf until local mountain porters clear the path',
            skillKey: 'none',
            attrNameVi: 'Không kiểm tra',
            targetDC: 0,
            playerAttrVal: 50,
            playerMod: 0,
            successNarrativeVi: 'Đoàn quân bình tĩnh nổi lửa sưởi ấm, giữ trọn an toàn quân nhu.',
            successNarrativeEn: 'Patience preserves the expedition. You rest comfortably until passage is restored.',
            successDelta: { grainCost: 0.2, fatigue: -10, narrative: '-0.2 Thạch lương, -10 Mệt mỏi' },
            failureNarrativeVi: '',
            failureNarrativeEn: '',
            failureDelta: {}
          }
        ]
      };
    }

    if (terrainType === 'RIVER_WATERWAY' || terrainType === 'RIVER_CROSSING') {
      const intStat = calcMod('int');
      const dipStat = calcMod('dip');
      return {
        id: 'TRV-RIVER-PIRATES',
        category: 'combat',
        titleVi: 'Thủy Tặc Vọng Giang & Trạm Kiểm Soát Bến Sông',
        titleEn: 'River Guerrillas & Ferry Chokepoint',
        icon: '⛵',
        threat: 'high',
        terrainType,
        narrativeVi: 'Khúc sông Hoàng Hà sóng cuộn trập trùng. Một toán lâu la thủy trại áp sát thuyền buôn bến đò, đòi nộp mãi lộ mới cho phép vượt sông!',
        narrativeEn: 'River waters churn violently. Guerrilla rivermen in swift rowboats encircle the ferry crossing, demanding toll fees!',
        choices: [
          {
            id: 'intimidate',
            textVi: '[Trí Lực DC 11] Dương cờ Bắc Quân Lư Thực, răn đe uy danh triều đình dẹp loạn',
            textEn: '[Intellect DC 11] Wave Imperial Command banners, bluffing with military prestige',
            skillKey: 'int',
            attrNameVi: 'Trí Lực',
            targetDC: 11,
            playerAttrVal: intStat.val,
            playerMod: intStat.mod,
            successNarrativeVi: 'Lũ thủy tặc nhìn thấy cờ tướng quân Lư Thực và khí thế lẫm liệt liền hoảng sợ chắp tay lui thuyền!',
            successNarrativeEn: 'The bandits recognize the imperial banners of General Lu Zhi and promptly row back in awe!',
            successDelta: { intExp: 30, morale: 10, narrative: '+30 EXP Trí Lực, +10 Sĩ Khí, Qua sông uy nghiêm' },
            failureNarrativeVi: 'Thủy tặc không tin, áp mạn thuyền cướp mất một số bao tải muối vụn.',
            failureNarrativeEn: 'Unconvinced, the rivermen harass your boat and snatch minor cargo sacks.',
            failureDelta: { grainCost: 0.3, narrative: '-0.3 Thạch lương tổn thất' }
          },
          {
            id: 'negotiate',
            textVi: '[Ngoại Giao DC 10] Tặng vò rượu cay đàm phán kết bạn với chúa trại',
            textEn: '[Diplomacy DC 10] Offer fine wine to parley with the river chieftain',
            skillKey: 'dip',
            attrNameVi: 'Ngoại Giao',
            targetDC: 10,
            playerAttrVal: dipStat.val,
            playerMod: dipStat.mod,
            successNarrativeVi: 'Chúa trại kính nể phong thái hào hiệp, tự tay lái thuyền hoa tiêu dẫn đoàn vượt bến an toàn!',
            successNarrativeEn: 'The chieftain respects your courtesy, personally piloting your ferry across the shallows!',
            successDelta: { dipExp: 25, narrative: '+25 EXP Ngoại Giao, Kết giao hào kiệt đường sông' },
            failureNarrativeVi: 'Mất thì giờ giằng co đàm phán, phải tốn thêm chút tiền mãi lộ nhỏ.',
            failureNarrativeEn: 'Negotiations stall, costing a small transit fee of coppers.',
            failureDelta: { lootQian: -50, narrative: '-50 Tiền mãi lộ' }
          },
          {
            id: 'pass_toll',
            textVi: 'Nộp 30 Tiền hoa tiêu để qua bến nhanh chóng',
            textEn: 'Pay 30 Qian ferry fee to cross without friction',
            skillKey: 'none',
            attrNameVi: 'Không kiểm tra',
            targetDC: 0,
            playerAttrVal: 50,
            playerMod: 0,
            successNarrativeVi: 'Đoàn quân qua sông an toàn thuận buồm xuôi gió.',
            successNarrativeEn: 'The ferry glides smoothly across the river to the far bank.',
            successDelta: { lootQian: -30, narrative: '-30 Tiền phí đò' },
            failureNarrativeVi: '',
            failureNarrativeEn: '',
            failureDelta: {}
          }
        ]
      };
    }

    // Default Plains: Yellow Turban Ambush or Traveling Merchant
    const warStat = calcMod('war');
    const comStat = calcMod('com');
    return {
      id: 'TRV-PLAINS-SCOUTS',
      category: 'combat',
      titleVi: 'Toán Thám Báo Khăn Vàng Phục Kích',
      titleEn: 'Yellow Turban Scout Ambush',
      icon: '⚔️',
      threat: 'moderate',
      terrainType,
      narrativeVi: 'Bên rặng liễu triền đê, tiếng tù và man rợ vang lên! Một toán thám mã Khăn Vàng tay giương cung thương chặn đường hành quân.',
      narrativeEn: 'Behind riverbank willows, crude horns blare! Yellow Turban scouts with spears and recurve bows block your march path.',
      choices: [
        {
          id: 'charge',
          textVi: '[Võ Lực DC 12] Rút bội kiếm dẫn đầu toán thân binh đột kích chém tướng phá vây',
          textEn: '[Martial DC 12] Draw sword and lead bodyguards in a swift flanking charge',
          skillKey: 'war',
          attrNameVi: 'Võ Lực',
          targetDC: 12,
          playerAttrVal: warStat.val,
          playerMod: warStat.mod,
          successNarrativeVi: 'Lương Diễn vũ bão xung phong chém gục tên đầu sỏ! Toán giặc tan tác bỏ lại 150 Tiền và chiến mã.',
          successNarrativeEn: 'You cleave the squad leader with decisive fury! The scouts flee, leaving 150 Qian loot.',
          successDelta: { warExp: 30, lootQian: 150, morale: 5, narrative: '+30 EXP Võ Lực, +150 Tiền chiến lợi phẩm, Sĩ khí cao' },
          failureNarrativeVi: 'Địch chiếm gò cao bắn tên xối xả, đoàn phải vất vả phá vây làm hao tổn thể lực.',
          failureNarrativeEn: 'Hostile archers inflict exhaustion before your men break through.',
          failureDelta: { fatigue: 15, narrative: '+15 Mệt mỏi' }
        },
        {
          id: 'trade_wares',
          textVi: '[Thương Nghiệp DC 11] Tận dụng hàng hóa trà muối trao đổi hòa hoãn',
          textEn: '[Commerce DC 11] Use coarse salt and tea rations to defuse tension and trade',
          skillKey: 'com',
          attrNameVi: 'Thương Nghiệp',
          targetDC: 11,
          playerAttrVal: comStat.val,
          playerMod: comStat.mod,
          successNarrativeVi: 'Lời lẽ doanh thương thuyết phục khiến lũ giặc đói khát chịu đổi vũ khí lấy muối ăn!',
          successNarrativeEn: 'Persuasive trading turns hungry rebels into peaceful barterers, trading weapons for salt!',
          successDelta: { comExp: 30, narrative: '+30 EXP Thương Nghiệp, Thu thập vũ khí thô' },
          failureNarrativeVi: 'Thương thảo thất bại, mất một ít lương thảo để rút lui êm đẹp.',
          failureNarrativeEn: 'Barter stalls, forcing a minor grain handout to retreat peacefully.',
          failureDelta: { grainCost: 0.3, narrative: '-0.3 Thạch lương' }
        },
        {
          id: 'detour',
          textVi: 'Bỏ lại 0.3 thạch lương dụ địch tranh đoạt, men theo đường vòng an toàn',
          textEn: 'Drop 0.3 grain piculs to distract rebels and take the outer detour',
          skillKey: 'none',
          attrNameVi: 'Không kiểm tra',
          targetDC: 0,
          playerAttrVal: 50,
          playerMod: 0,
          successNarrativeVi: 'Đoàn quân bảo toàn nhân sự, lặng lẽ vòng qua cứ điểm an toàn.',
          successNarrativeEn: 'Your column preserves strength and slips quietly past the checkpoint.',
          successDelta: { grainCost: 0.3, narrative: '-0.3 Thạch lương' },
          failureNarrativeVi: '',
          failureNarrativeEn: '',
          failureDelta: {}
        }
      ]
    };
  }

  /**
   * Resolves choice and mutates player state with SQLite ACID guarantees
   */
  public resolveChoice(payload: {
    eventId: string;
    choiceId: string;
    roll?: number;
    plan: TravelPlan;
  }): {
    success: boolean;
    d20Roll: number;
    mod: number;
    totalScore: number;
    targetDC: number;
    isSuccess: boolean;
    narrative: string;
    delta: Record<string, any>;
  } {
    const { eventId, choiceId, roll, plan } = payload;
    const encounter = this.generateEncounterForTerrain(plan.terrainType, plan.fromNodeId, plan.toNodeId);
    const choice = encounter.choices.find(c => c.id === choiceId) || encounter.choices[0];

    const d20Roll = roll !== undefined ? Number(roll) : Math.floor(Math.random() * 20) + 1;
    const totalScore = d20Roll + choice.playerMod;
    const isSuccess = choice.targetDC === 0 || totalScore >= choice.targetDC;

    const delta = isSuccess ? choice.successDelta : choice.failureDelta;
    const narrative = isSuccess ? choice.successNarrativeVi : choice.failureNarrativeVi;

    // Mutate SQLite player state
    const sqlUpdates: string[] = [];
    if (delta.warExp) sqlUpdates.push(`war_exp = war_exp + ${delta.warExp}`);
    if (delta.intExp) sqlUpdates.push(`int_exp = int_exp + ${delta.intExp}`);
    if (delta.comExp) sqlUpdates.push(`com_exp = com_exp + ${delta.comExp}`);
    if (delta.craExp) sqlUpdates.push(`cra_exp = cra_exp + ${delta.craExp}`);
    if (delta.dipExp) sqlUpdates.push(`dip_exp = dip_exp + ${delta.dipExp}`);
    if (delta.logExp) sqlUpdates.push(`log_exp = log_exp + ${delta.logExp}`);

    if (delta.morale) sqlUpdates.push(`morale = MAX(0, MIN(100, morale + ${delta.morale}))`);
    if (delta.fatigue) sqlUpdates.push(`fatigue = MAX(0, MIN(100, fatigue + ${delta.fatigue}))`);
    if (delta.grainCost) sqlUpdates.push(`strategic_grain = MAX(0.0, strategic_grain - ${delta.grainCost})`);
    if (delta.lootQian) sqlUpdates.push(`liquid_cash = liquid_cash + ${delta.lootQian}`);

    if (sqlUpdates.length > 0) {
      this.db.execute(`UPDATE player_state SET ${sqlUpdates.join(', ')} WHERE player_id = 'PLY-0001';`);
    }

    return {
      success: true,
      d20Roll,
      mod: choice.playerMod,
      totalScore,
      targetDC: choice.targetDC,
      isSuccess,
      narrative,
      delta
    };
  }

  /**
   * Completes arrival: updates location, deducts grain, writes chronicle
   */
  public completeArrival(payload: {
    targetSubLoc: string;
    targetNameVi: string;
    grainCost: number;
    distanceLi: number;
    marchDays: number;
    terrainType: string;
  }) {
    const { targetSubLoc, targetNameVi, grainCost, distanceLi, marchDays, terrainType } = payload;
    const player = this.db.queryOne<{ strategic_grain: number; fatigue: number }>(
      `SELECT strategic_grain, fatigue FROM player_state LIMIT 1;`
    );

    const cost = Math.max(0, Number(grainCost) || 0);
    const newGrain = Math.max(0, Number((Number(player?.strategic_grain || 0) - cost).toFixed(2)));
    const addedFatigue = Math.round(Number(marchDays || 1) * 3);
    const newFatigue = Math.min(100, (player?.fatigue || 0) + addedFatigue);

    this.db.execute(`
      UPDATE player_state 
      SET current_location = ?,
          strategic_grain = ?,
          fatigue = ?
      WHERE player_id = 'PLY-0001';
    `, [targetSubLoc, newGrain, newFatigue]);

    const meta = this.db.queryOne<{ active_turn: number; current_date: string }>(
      `SELECT active_turn, current_date FROM campaign_meta LIMIT 1;`
    ) || { active_turn: 7, current_date: '184-06-01' };

    const chronicleId = `march_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const marchNarrative = `Lương Diễn dẫn đầu đoàn quân viễn chinh vượt ${distanceLi} dặm quan đạo (${terrainType}), tiêu hao ${cost} thạch quân lương, cờ xí rợp trời tiến nhập **${targetNameVi}**! Đại bản doanh tiền phương đã an bài.`;

    this.db.execute(`
      INSERT INTO chat_chronicle (id, turn_number, game_date, type, speaker, title, avatar, text, deltas, reasoning)
      VALUES (?, ?, ?, 'player', 'Lương Diễn (Hành Quân)', 'Chiến Tuyến Viễn Chinh', 'Diễn', ?, ?, 'Hoàn tất hành trình dặm trường và đồng bộ tọa độ.');
    `, [
      chronicleId,
      meta.active_turn,
      meta.current_date,
      marchNarrative,
      JSON.stringify({ location: targetSubLoc, grainCost: `-${cost} Thạch`, distance: `${distanceLi} Dặm` })
    ]);

    return {
      success: true,
      newLocation: targetSubLoc,
      newGrain,
      newFatigue,
      marchDays,
      distanceLi
    };
  }
}
