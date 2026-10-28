/**
 * ThreeKingdoms-AgentEngine: Regional Travel & Expedition Journey Manager
 * (engine/travel-manager.js)
 *
 * Implements interactive road transit across the ROTK world map:
 * - Journey logistics (Distance in Li, transit days, strategic grain consumption)
 * - Procedural road events & encounters (Bandit skirmishes, trade caravans, displaced artisans, hazards)
 * - D20 attribute checks (War, Int, Com, Cra, Log) with branching narrative outcomes
 * - Zero-drift SQLite ACID state mutation & chronicle recording
 */

const fs = require('fs');
const path = require('path');
const { runSqlJson, runSqlBatch, escapeSql } = require('./db-adapter');
const {
  NODE_TO_LOC_MAP,
  LOC_TO_NODE_MAP,
  resolveLocationId,
  resolveNodeId,
  calculateDirectDistanceLi
} = require('./spatial-registry');

const ROOT_DIR = path.resolve(__dirname, '..');
const SAVES_DIR = path.join(ROOT_DIR, 'saves');
const DB_PATH = process.env.SIM_DB_PATH || path.join(SAVES_DIR, 'session.db');

const TRAVEL_EVENTS_POOL = [
  {
    id: 'TRV-YELLOW-TURBAN-SCOUTS',
    category: 'combat',
    titleVi: 'Toán Thám Báo Khăn Vàng Phục Kích',
    titleEn: 'Yellow Turban Scout Ambush',
    icon: '⚔️',
    threat: 'high',
    narrativeVi: 'Bên sườn dốc hẹp rậm rạp cỏ lau, tiếng còi hiệu sắc nhọn vang lên! Một toán thám mã Khăn Vàng tay lăm lăm trường thương và cung tên bất ngờ xuất hiện chặn đứng lộ trình.',
    narrativeEn: 'Amidst dense reed hills, sharp war horns echo! A patrol of Yellow Turban scouts brandishing lances and recurve bows blocks the mountain pass.',
    choices: [
      {
        id: 'charge',
        textVi: '[Võ Lực DC 12] Rút bội kiếm dẫn đầu toán thân binh đột kích chém tướng phá vây',
        textEn: '[Martial DC 12] Draw sword and lead bodyguards in a swift flanking charge',
        skillKey: 'war',
        attrNameVi: 'Võ Lực',
        targetDC: 12,
        successNarrativeVi: 'Lương Diễn vũ bão xung phong, một kiếm chém gục tên đầu sỏ! Quân Khăn Vàng tan tác chạy tháo thân, bỏ lại chiến lợi phẩm và ngựa thồ.',
        successNarrativeEn: 'Liang Yan strikes like lightning, cleaving the rebel squad leader! The scouts scatter in terror, abandoning pack supplies.',
        successDelta: { warExp: 25, morale: 5, lootQian: 120, narrative: '+25 EXP Võ Lực, +120 Tiền chiến lợi phẩm, Sĩ khí dâng cao' },
        failureNarrativeVi: 'Quân địch chiếm cứ địa hình hiểm yếu bắn tên xối xả. Dù phá được vây nhưng đoàn hành quân phải chịu một phen trầy trật.',
        failureNarrativeEn: 'Rebel archers hold high ground, showering arrows. You break through but suffer exhaustion.',
        failureDelta: { fatigue: 15, morale: -5, narrative: '+15 Điểm mệt mỏi, Sĩ khí sụt giảm' }
      },
      {
        id: 'feint',
        textVi: '[Trí Lực DC 12] Bày trận nghi binh, dương cờ giương trống khiến địch tưởng có đại quân mà rút lui',
        textEn: '[Intellect DC 12] Sound decoy drums and raise banners to bluff the scouts into retreating',
        skillKey: 'int',
        attrNameVi: 'Trí Lực',
        targetDC: 12,
        successNarrativeVi: 'Tiếng trống trận rền vang sấm sét kết hợp bụi cát mù mịt khiến toán giặc hoảng loạn ngỡ đại quân Quan quân phục kích, lập tức tháo chạy!',
        successNarrativeEn: 'Thunderous war drums and dust clouds convince the scouts an imperial legion approaches. They flee without engaging!',
        successDelta: { intExp: 30, morale: 5, narrative: '+30 EXP Trí Lực, hành quân an toàn không tổn thất' },
        failureNarrativeVi: 'Toán thám mã nhìn thấu mưu kế ít người, ùa vào quấy nhiễu buộc đoàn phải vội vã rút lui vòng qua ngọn núi khác.',
        failureNarrativeEn: 'The sharp scout leader spots your low numbers and harries your rear, forcing a lengthy detour.',
        failureDelta: { grainCost: 0.4, fatigue: 10, narrative: '-0.4 Thạch lương đi đường vòng, +10 Mệt mỏi' }
      },
      {
        id: 'detour',
        textVi: '[Hậu Cần] Bỏ lại 0.3 thạch lương thực dụ địch tranh đoạt, men theo sườn núi né tránh giao tranh',
        textEn: '[Logistics] Drop 0.3 grain piculs to distract the hungry scouts and slip away',
        skillKey: 'none',
        attrNameVi: 'Không kiểm tra',
        targetDC: 0,
        successNarrativeVi: 'Lũ thám mã đói khát chen nhau cướp bọc lương rơi vãi. Đoàn tùy tùng lặng lẽ men theo thung lũng an toàn vượt qua trắc trở.',
        successNarrativeEn: 'Starving scouts squabble over the scattered grain sacks while your column quietly slips away through the valley.',
        successDelta: { grainCost: 0.3, narrative: '-0.3 Thạch lương lộ phí, bảo toàn tính mạng đoàn quân' },
        failureNarrativeVi: '',
        failureDelta: {}
      }
    ]
  },
  {
    id: 'TRV-MERCHANT-CARAVAN',
    category: 'commerce',
    titleVi: 'Thương Đoàn Dịch Trạm Giao Lưu',
    titleEn: 'Wandering Merchant Caravan',
    icon: '🏪',
    threat: 'low',
    narrativeVi: 'Dưới rặng liễu bên cạnh trạm dịch công đường, một đoàn thương buôn phương xa với nhiều xe thồ hàng hóa đang dừng chân cho ngựa uống nước.',
    narrativeEn: 'Beneath weeping willows by a roadside relay post, a far-traveling caravan with laden pack mules rests near a freshwater spring.',
    choices: [
      {
        id: 'trade',
        textVi: '[Thương Nghiệp DC 11] Khảo giá thị trường, đàm phán mua lại vật liệu quý hiếm với giá sỉ',
        textEn: '[Commerce DC 11] Negotiate bulk procurement of regional trade wares at wholesale discounts',
        skillKey: 'com',
        attrNameVi: 'Thương Nghiệp',
        targetDC: 11,
        successNarrativeVi: 'Khẩu tài thương nghiệp bén nhạy! Chủ đoàn kính nể trao đổi hàng hóa giá vốn, tặng thêm lộ phí và chia sẻ mạng lưới buôn bán.',
        successNarrativeEn: 'Sharp commercial acuity! The factor respects your acumen, granting wholesale discounts and regional trade intel.',
        successDelta: { comExp: 30, lootQian: 150, narrative: '+30 EXP Thương Nghiệp, +150 Tiền lợi tức giao thương' },
        failureNarrativeVi: 'Thương nhân lão luyện giữ giá chặt chẽ, đôi bên chỉ đàm phán được vài món hàng tạp hóa thông thường.',
        failureNarrativeEn: 'The shrewd veteran factor holds firm on pricing; you manage only routine exchanges.',
        failureDelta: { comExp: 10, narrative: '+10 EXP Thương Nghiệp' }
      },
      {
        id: 'intel',
        textVi: '[Ngoại Giao DC 10] Mời rượu đàm đạo, thu thập tin tức thời sự các châu quận và giá lương thực',
        textEn: '[Diplomacy DC 10] Share wine and gather military rumors and commodity price trends',
        skillKey: 'dip',
        attrNameVi: 'Ngoại Giao',
        targetDC: 10,
        successNarrativeVi: 'Bên vò rượu cay nồng, thương đoàn nhiệt tình tiết lộ biến động cung cầu tại các thành trì lớn cùng động thái chư hầu!',
        successNarrativeEn: 'Over warm wine, the merchants gladly reveal lucrative arbitrage routes and troop concentrations in neighboring commanderies!',
        successDelta: { dipExp: 25, intExp: 15, narrative: '+25 EXP Ngoại Giao, +15 EXP Trí Lực, Nắm bắt tình báo chiến lược' },
        failureNarrativeVi: 'Thương nhân tỏ vẻ dè chừng cảnh giác thời loạn, chỉ nói vài câu xã giao qua loa rồi rời trạm.',
        failureNarrativeEn: 'The wary merchants remain tight-lipped, exchanging only polite platitudes before departing.',
        failureDelta: { dipExp: 10, narrative: '+10 EXP Ngoại Giao' }
      },
      {
        id: 'pass',
        textVi: 'Chào hỏi lễ phép rồi duy trì tốc độ tiếp tục hành quân',
        textEn: 'Exchange brief courtesies and maintain march pace',
        skillKey: 'none',
        attrNameVi: 'Không kiểm tra',
        targetDC: 0,
        successNarrativeVi: 'Đoàn quân gật đầu tương kiến trong hòa bình rồi tiếp tục sải bước trên con đường thiên lý.',
        successNarrativeEn: 'You nod courteously and press forward along the imperial highway without delay.',
        successDelta: { narrative: 'Hành trình thông suốt, không phát sinh biến cố' },
        failureNarrativeVi: '',
        failureDelta: {}
      }
    ]
  },
  {
    id: 'TRV-REFUGEE-ARTISAN',
    category: 'recruitment',
    titleVi: 'Gia Đình Thợ Thủ Công Bơ Vơ',
    titleEn: 'Displaced Artisan Family',
    icon: '🔨',
    threat: 'moderate',
    narrativeVi: 'Ven bìa rừng, một gia đình thợ thủ công mang theo đồ nghề đan lát và đồ rèn bị kiệt sức vì thiếu lương thực giữa dòng người chạy loạn.',
    narrativeEn: 'At the forest edge, a displaced family of skilled woodcutters and blacksmiths sits exhausted beside a broken handcart without food.',
    choices: [
      {
        id: 'recruit',
        textVi: '[Nhân Nghĩa] Cấp phát 0.3 thạch lương cứu đói, thu nạp họ làm thợ tại sản nghiệp gia tộc',
        textEn: '[Benevolence] Provide 0.3 grain piculs for relief and invite them into your family enterprise',
        skillKey: 'none',
        attrNameVi: 'Tiêu hao lương thảo',
        targetDC: 0,
        successNarrativeVi: 'Gia đình thợ quỳ sụp cảm tạ ân đức tái sinh! Lương Diễn có thêm những bàn tay lành nghề một lòng trung thành phụng sự xưởng chức tác.',
        successNarrativeEn: 'The tearful artisans bow in profound gratitude! Your enterprise gains loyal, capable hands dedicated to craftsmanship.',
        successDelta: { grainCost: 0.3, craExp: 25, morale: 10, narrative: '-0.3 Thạch lương, +25 EXP Chế Tác, +10 Sĩ Khí, Bổ sung thợ thủ công' },
        failureNarrativeVi: '',
        failureDelta: {}
      },
      {
        id: 'repair',
        textVi: '[Khéo Léo DC 11] Giúp họ sửa trục bánh xe bị gãy và hướng dẫn lộ trình tới trạm cứu tế gần nhất',
        textEn: '[Craft DC 11] Help repair their broken cart axle and guide them toward the nearest town',
        skillKey: 'cra',
        attrNameVi: 'Khéo Léo',
        targetDC: 11,
        successNarrativeVi: 'Đôi bàn tay khéo léo nhanh chóng gia cố trục xe vững chãi. Gia đình thợ kính tặng lại một bộ giũa thép tôi rèn tuyệt hảo làm kỷ niệm!',
        successNarrativeEn: 'Your masterly craft skills quickly mend the fractured axle. Grateful, they gift you a set of refined metal smithing tools!',
        successDelta: { craExp: 35, morale: 5, narrative: '+35 EXP Khéo Léo, Danh tiếng nhân ái lan xa' },
        failureNarrativeVi: 'Mất nhiều thì giờ sửa chữa nhưng đồ nghề dã chiến chưa đủ, chỉ giúp họ chống đỡ tạm để di chuyển chậm chạp.',
        failureNarrativeEn: 'Field tools prove insufficient for a complete repair, but you brace the wheel enough for them to limp onward.',
        failureDelta: { craExp: 15, fatigue: 10, narrative: '+15 EXP Khéo Léo, +10 Mệt mỏi' }
      },
      {
        id: 'ignore',
        textVi: 'Cảm thương thời loạn lạc nhưng vì quân vụ khẩn cấp đành phải tiếp bước',
        textEn: 'Lament the turmoil of war but press on due to urgent military expedition',
        skillKey: 'none',
        attrNameVi: 'Không kiểm tra',
        targetDC: 0,
        successNarrativeVi: 'Đoàn quân lặng lẽ đi qua, lòng dâng lên quyết tâm bình định thiên hạ để muôn dân thoát cảnh lầm than.',
        successNarrativeEn: 'You pass with a heavy heart, redoubling your resolve to pacify the realm and end the suffering of the people.',
        successDelta: { narrative: 'Đoàn quân tiếp tục tiến bước' },
        failureNarrativeVi: '',
        failureDelta: {}
      }
    ]
  },
  {
    id: 'TRV-MOUNTAIN-FLOOD',
    category: 'hazard',
    titleVi: 'Mưa Lũ Núi Đất Sạt Lở',
    titleEn: 'Mountain Torrent & Landslide',
    icon: '🌧️',
    threat: 'moderate',
    narrativeVi: 'Mưa giông mùa hạ bất ngờ trút xuống như thác đổ khiến nước suối khe dâng cuồn cuộn, chiếc cầu gỗ độc đạo đã bị đất đá cuốn trôi!',
    narrativeEn: 'A sudden summer cloudburst triggers flash floods and mudslides, washing away the narrow wooden bridge across the mountain gorge!',
    choices: [
      {
        id: 'bridge',
        textVi: '[Khéo Léo/Hậu Cần DC 12] Đốn tre rừng quanh vùng, kết bè cáp kéo xe hành lý vượt lũ an toàn',
        textEn: '[Craft/Logistics DC 12] Fell local bamboo and construct a suspension raft to haul baggage across',
        skillKey: 'cra',
        attrNameVi: 'Khéo Léo',
        targetDC: 12,
        successNarrativeVi: 'Tận dụng tre rừng dẻo dai và dây thừng, chiếc bè nổi hoàn thành chỉ trong nửa canh giờ! Cả người lẫn ngựa vượt qua an toàn tuyệt đối.',
        successNarrativeEn: 'Using resilient bamboo and climbing ropes, your improvised raft carries horses and wagons across the roaring torrent unharmed!',
        successDelta: { craExp: 25, logExp: 25, morale: 5, narrative: '+25 EXP Khéo Léo, +25 EXP Hậu Cần, Vượt sông an toàn' },
        failureNarrativeVi: 'Dòng nước xiết làm đứt một nhịp cáp, một xe quân lương nhỏ bị ngấm nước gây hao hụt.',
        failureNarrativeEn: 'Violent currents snap a mooring cable; one baggage wagon is soaked before being pulled ashore.',
        failureDelta: { grainCost: 0.3, fatigue: 15, narrative: '-0.3 Thạch lương tổn thất, +15 Mệt mỏi' }
      },
      {
        id: 'brave',
        textVi: '[Võ Lực DC 11] Tự thân lội qua dòng nước cuộn xiết đóng cọc neo dây dẫn đường đoàn tùy tùng',
        textEn: '[Martial DC 11] Wade into the rushing torrent to drive mooring stakes and secure safety lines',
        skillKey: 'war',
        attrNameVi: 'Võ Lực',
        targetDC: 11,
        successNarrativeVi: 'Thân hình tráng kiện như thạch trụ cản sóng, cọc sắt đóng sâu neo chặt dây thừng. Tùy tùng reo hò thán phục dũng khí chủ tướng!',
        successNarrativeEn: 'Standing like a pillar against the torrent, you anchor the heavy guide ropes. Your men cheer your courage and follow safely!',
        successDelta: { warExp: 30, morale: 10, narrative: '+30 EXP Võ Lực, +10 Sĩ Khí quân sĩ' },
        failureNarrativeVi: 'Sóng lớn đập vào ghềnh đá khiến chân trượt ngã, may mắn bám được rễ cây nhưng thể lực tiêu hao trầm trọng.',
        failureNarrativeEn: 'A heavy surge sweeps your footing against river rocks; you scramble ashore bruised and exhausted.',
        failureDelta: { fatigue: 20, health: -5, narrative: '+20 Mệt mỏi, -5 Sinh lực' }
      },
      {
        id: 'camp',
        textVi: '[Dịch Trạm] Hạ trại nghỉ ngơi chờ mưa tạnh nước rút trước khi qua đèo',
        textEn: '[Rest] Pitch camp under canopy and wait for floodwaters to subside',
        skillKey: 'none',
        attrNameVi: 'Không kiểm tra',
        targetDC: 0,
        successNarrativeVi: 'Tránh voi chẳng xấu mặt nào. Đoàn quân cắm trại nổi lửa nấu cháo nóng, giữ vững an toàn quân nhu.',
        successNarrativeEn: 'Prudence preserves the army. Campfires are lit under rocky overhangs, keeping supplies dry while the deluge passes.',
        successDelta: { grainCost: 0.2, fatigue: -10, narrative: '-0.2 Thạch lương, -10 Mệt mỏi (Hồi phục thể lực)' },
        failureNarrativeVi: '',
        failureDelta: {}
      }
    ]
  },
  {
    id: 'TRV-WANDERING-SWORDSMAN',
    category: 'martial',
    titleVi: 'Hiệp Khách Luận Kiếm Bên Đường',
    titleEn: 'Wandering Swordsman Encounter',
    icon: '🥋',
    threat: 'moderate',
    narrativeVi: 'Dưới gốc tùng cổ thụ bên triền núi cao, một tráng sĩ áo vải tay cầm trường kiếm thảnh thơi nhấm rượu, khí chất tiêu sái anh hùng.',
    narrativeEn: 'Under an ancient pine tree along the cliff path, an unkempt itinerant swordsman sips wine with nonchalant, fearsome martial composure.',
    choices: [
      {
        id: 'spar',
        textVi: '[Võ Lực DC 13] Tiến lên rút kiếm thi lễ, cùng hiệp sĩ tỷ thí vài chiêu thức võ công',
        textEn: '[Martial DC 13] Step forward with sword drawn in salute, requesting a chivalrous sparring duel',
        skillKey: 'war',
        attrNameVi: 'Võ Lực',
        targetDC: 13,
        successNarrativeVi: 'Kiếm khí tung hoành, ba mươi hiệp bất phân thắng bại! Hiệp khách cười vang sảng khoái, khen ngợi kiếm pháp Lương Diễn và chỉ điểm kiếm quyết.',
        successNarrativeEn: 'Swords flash like autumn frost! After thirty fierce bouts, the swordsman laughs heartily, praising your refined bladecraft!',
        successDelta: { warExp: 40, morale: 10, narrative: '+40 EXP Võ Lực, +10 Sĩ Khí, Lĩnh hội kiếm pháp cao minh' },
        failureNarrativeVi: 'Chiêu thức của hiệp khách xuất quỷ nhập thần, Lương Diễn chỉ đỡ được mười hiệp thì bị gạt rơi kiếm. Được học hỏi thêm kinh nghiệm thực chiến quý giá.',
        failureNarrativeEn: 'The swordsman disarms you on the tenth exchange with blinding speed, nodding in approval of your spirited effort.',
        failureDelta: { warExp: 20, fatigue: 10, narrative: '+20 EXP Võ Lực, +10 Mệt mỏi' }
      },
      {
        id: 'befriend',
        textVi: '[Ngoại Giao DC 11] Tặng bầu rượu ngon cùng lương khô kết giao bằng hữu giang hồ',
        textEn: '[Diplomacy DC 11] Offer fine wine and travel rations to forge a martial fellowship',
        skillKey: 'dip',
        attrNameVi: 'Ngoại Giao',
        targetDC: 11,
        successNarrativeVi: 'Gặp gỡ tri kỷ! Hiệp khách uống cạn bầu rượu, tặng lại một tín vật hộ thân và hứa hẹn sẽ tương trợ khi đại sự cần kíp.',
        successNarrativeEn: 'A kindred spirit! The swordsman downs the wine and gifts you a jade warrior token, pledging solidarity in your cause.',
        successDelta: { dipExp: 30, morale: 10, narrative: '+30 EXP Ngoại Giao, Kết giao hào hiệp giang hồ' },
        failureNarrativeVi: 'Hiệp khách nhận rượu đa tạ nhưng tính tình cô độc, chỉ đối ẩm vài chén rồi phi thân rời đi.',
        failureNarrativeEn: 'The aloof hermit accepts your wine with a nod, but prefers solitary wandering and departs into the mists.',
        failureDelta: { dipExp: 15, narrative: '+15 EXP Ngoại Giao' }
      },
      {
        id: 'pass',
        textVi: 'Cung kính chắp tay từ xa rồi tiếp tục chỉ huy đoàn quân hành tiến',
        textEn: 'Offer a respectful fist-salute from afar and keep the expedition marching',
        skillKey: 'none',
        attrNameVi: 'Không kiểm tra',
        targetDC: 0,
        successNarrativeVi: 'Đôi bên chào nhau bằng ánh mắt hào kiệt rồi đường ai nấy đi trong hòa bình.',
        successNarrativeEn: 'Two men of martial purpose exchange an understanding gaze as your column presses steadily onward.',
        successDelta: { narrative: 'Đoàn quân tiếp tục lộ trình bình an' },
        failureNarrativeVi: '',
        failureDelta: {}
      }
    ]
  }
];

class TravelManager {
  constructor(dbPath = DB_PATH) {
    this.dbPath = dbPath;
  }

  /**
   * Plans the road expedition between two nodes using master_routes from SQLite
   */
  planTravel(fromNodeId, toNodeId) {
    const srcLoc = NODE_TO_LOC_MAP[fromNodeId] || fromNodeId;
    const tgtLoc = NODE_TO_LOC_MAP[toNodeId] || toNodeId;

    // 1. Fetch route from master_routes
    const routes = runSqlJson(this.dbPath, `
      SELECT * FROM master_routes 
      WHERE (source_location_id = '${srcLoc}' AND target_location_id = '${tgtLoc}')
         OR (source_location_id = '${tgtLoc}' AND target_location_id = '${srcLoc}')
      LIMIT 1;
    `);
    const route = routes && routes.length > 0 ? routes[0] : null;

    // 2. Fetch target location info for fallback
    const locRows = runSqlJson(this.dbPath, `SELECT * FROM master_locations WHERE location_id = '${tgtLoc}' LIMIT 1;`);
    const tgtLocation = locRows && locRows.length > 0 ? locRows[0] : null;

    const distanceLi = route ? Number(route.distance_li) : (tgtLocation?.distance_from_zhuo || 300);
    const terrainType = route ? route.terrain_type : 'PLAINS';
    const marchDays = route ? Number(route.standard_march_days) : (tgtLocation?.march_days || 2.0);
    const grainCost = route ? Number(route.grain_provision_cost) : (tgtLocation?.grain_cost || 2.0);
    const riskLevel = route ? route.ambush_risk_level : (tgtLocation?.threat_level_vi || 'MODERATE');
    const routeDescVi = route?.description_vi || `Đại lộ quan đạo tiến về ${tgtLocation?.name_vi || toNodeId}.`;
    const routeDescEn = route?.description_en || `Imperial highway route heading toward ${toNodeId}.`;

    // 3. Fetch player state
    const player = runSqlJson(this.dbPath, `SELECT strategic_grain, fatigue, current_location FROM player_state LIMIT 1;`)[0] || {};
    const playerGrain = Number(player.strategic_grain || 0);
    const hasEnoughGrain = playerGrain >= grainCost;
    const playerFatigue = Number(player.fatigue || 0);

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
   * Starts travel expedition, evaluating encounter probability by route ambush_risk_level & terrain
   */
  startTravel(fromNodeId, toNodeId) {
    const plan = this.planTravel(fromNodeId, toNodeId);

    let encounterProb = 0.35;
    if (plan.riskLevel === 'EXTREME') encounterProb = 0.75;
    else if (plan.riskLevel === 'HIGH') encounterProb = 0.55;
    else if (plan.riskLevel === 'MODERATE') encounterProb = 0.35;
    else if (plan.riskLevel === 'LOW') encounterProb = 0.20;

    const roll = Math.random();
    const hasEncounter = roll <= encounterProb;

    let encounter = null;
    if (hasEncounter) {
      encounter = this.generateTravelEncounter(fromNodeId, toNodeId);
      // Annotate encounter with terrain
      encounter.terrainType = plan.terrainType;
    }

    return {
      plan,
      hasEncounter,
      encounter,
      narrative: hasEncounter ? null : 'Lộ trình quan đạo thông suốt, cờ xí phe ta thuận gió tiến quân an toàn.'
    };
  }

  /**
   * Generates a road event for transit between two map nodes
   */
  generateTravelEncounter(fromNodeId, toNodeId) {
    // Pick event based on random roll or specific route profile
    const randIdx = Math.floor(Math.random() * TRAVEL_EVENTS_POOL.length);
    const ev = TRAVEL_EVENTS_POOL[randIdx];

    // Fetch player attributes to calculate check modifiers
    const player = runSqlJson(this.dbPath, `SELECT * FROM player_state LIMIT 1;`)[0] || {};

    const choicesWithMods = ev.choices.map(c => {
      let mod = 0;
      if (c.skillKey !== 'none') {
        const attrVal = Number(player[`${c.skillKey}_attr`] || 50);
        mod = Math.floor((attrVal - 50) / 5);
      }
      return {
        ...c,
        playerAttrVal: Number(player[`${c.skillKey}_attr`] || 50),
        playerMod: mod
      };
    });

    return {
      ...ev,
      fromNodeId,
      toNodeId,
      choices: choicesWithMods,
      playerGrain: Number(player.strategic_grain || 0),
      playerCash: Number(player.liquid_cash || 0),
      playerFatigue: Number(player.fatigue || 0)
    };
  }

  /**
   * Resolves the selected choice for a travel event
   */
  resolveEncounterChoice({ eventId, choiceId, roll = null, fromNodeId, toNodeId, targetNodeNameVi = '' }) {
    const ev = TRAVEL_EVENTS_POOL.find(e => e.id === eventId);
    if (!ev) throw new Error(`Travel event not found: ${eventId}`);

    const choice = ev.choices.find(c => c.id === choiceId);
    if (!choice) throw new Error(`Choice not found: ${choiceId}`);

    const player = runSqlJson(this.dbPath, `SELECT * FROM player_state LIMIT 1;`)[0];
    if (!player) throw new Error('Player state not found');

    let mod = 0;
    if (choice.skillKey !== 'none') {
      const attrVal = Number(player[`${choice.skillKey}_attr`] || 50);
      mod = Math.floor((attrVal - 50) / 5);
    }

    const d20Roll = roll !== null ? Number(roll) : Math.floor(Math.random() * 20) + 1;
    const totalScore = d20Roll + mod;
    const isSuccess = choice.targetDC === 0 || totalScore >= choice.targetDC;

    const delta = isSuccess ? choice.successDelta : choice.failureDelta;
    const narrative = isSuccess ? choice.successNarrativeVi : choice.failureNarrativeVi;

    // Apply mutations to player_state
    const sqlUpdates = [];
    if (delta.warExp) sqlUpdates.push(`war_exp = war_exp + ${delta.warExp}`);
    if (delta.intExp) sqlUpdates.push(`int_exp = int_exp + ${delta.intExp}`);
    if (delta.comExp) sqlUpdates.push(`com_exp = com_exp + ${delta.comExp}`);
    if (delta.craExp) sqlUpdates.push(`cra_exp = cra_exp + ${delta.craExp}`);
    if (delta.dipExp) sqlUpdates.push(`dip_exp = dip_exp + ${delta.dipExp}`);
    if (delta.logExp) sqlUpdates.push(`log_exp = log_exp + ${delta.logExp}`);

    if (delta.morale) sqlUpdates.push(`morale = MAX(0, MIN(100, morale + ${delta.morale}))`);
    if (delta.fatigue) sqlUpdates.push(`fatigue = MAX(0, MIN(100, fatigue + ${delta.fatigue}))`);
    if (delta.health) sqlUpdates.push(`health = MAX(0, MIN(100, health + ${delta.health}))`);
    if (delta.grainCost) sqlUpdates.push(`strategic_grain = MAX(0.0, strategic_grain - ${delta.grainCost})`);

    let cashDelta = 0;
    if (delta.lootQian) {
      cashDelta = delta.lootQian;
      sqlUpdates.push(`liquid_cash = liquid_cash + ${cashDelta}`);
    }

    if (sqlUpdates.length > 0) {
      runSqlBatch(this.dbPath, `UPDATE player_state SET ${sqlUpdates.join(', ')} WHERE player_id = '${player.player_id}';`);
    }

    return {
      success: true,
      eventId,
      choiceId,
      d20Roll,
      mod,
      totalScore,
      targetDC: choice.targetDC,
      isSuccess,
      narrative,
      delta
    };
  }

  /**
   * Finalizes the march arrival:
   * Deducts march grain, updates player location in DB, syncs PROGRESS.md, appends chronicle.
   */
  completeMarch({ targetSubLoc, grainCost = 1.0, targetNameVi = 'Chiến Tuyến', targetNameEn = 'Destination', daysRequired = 2.0, distanceFromZhuo = 200 } = {}) {
    if (!targetSubLoc) throw new Error('targetSubLoc is required for march completion');

    const player = runSqlJson(this.dbPath, `SELECT * FROM player_state LIMIT 1;`)[0];
    if (!player) throw new Error('Player state not found');

    const meta = runSqlJson(this.dbPath, `SELECT * FROM campaign_meta LIMIT 1;`)[0] || { current_date: '184-05-02', active_turn: 6 };

    // Deduct march grain and update location
    const cost = Math.max(0, Number(grainCost) || 0);
    const newGrain = Math.max(0, Number((Number(player.strategic_grain || 0) - cost).toFixed(2)));

    runSqlBatch(this.dbPath, `
      UPDATE player_state 
      SET current_location = '${targetSubLoc.replace(/'/g, "''")}',
          strategic_grain = ${newGrain}
      WHERE player_id = '${player.player_id}';
    `);

    // Record Story Chronicle Turn
    const chronicleId = `march_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const marchNarrative = `Lương Diễn hoàn tất lộ trình viễn chinh ${distanceFromZhuo} dặm, mang theo tùy tùng tiêu hao ${cost} thạch quân lương, cờ lệnh tung bay uy nghi tiến nhập **${targetNameVi}**! Căn cứ tiền tuyến đã thiết lập an toàn.`;

    runSqlBatch(this.dbPath, `
      INSERT INTO chat_chronicle (id, turn_number, game_date, type, speaker, title, avatar, text, deltas, reasoning)
      VALUES (
        '${chronicleId}', ${meta.active_turn || 1}, '${meta.current_date || '184-05-02'}', 'player',
        'Lương Diễn (Hành Quân)', 'Chiến Tuyến Viễn Chinh', 'Diễn',
        '${marchNarrative.replace(/'/g, "''")}',
        '{"location": "${targetSubLoc.replace(/'/g, "''")}", "grainCost": "-${cost} Thạch", "distance": "${distanceFromZhuo} Dặm"}',
        'Hoàn tất hành quân viễn chinh và đồng bộ hóa tọa độ chiến trường.'
      );
    `);

    // Update PROGRESS.md Current Location and Strategic Grain
    const progressPath = path.join(ROOT_DIR, 'game', 'PROGRESS.md');
    if (fs.existsSync(progressPath)) {
      try {
        let pContent = fs.readFileSync(progressPath, 'utf8');
        pContent = pContent.replace(/\|\s*\*\*Current Location\*\*\s*\|\s*[^\n|]+\|/i, `| **Current Location** | ${targetSubLoc} |`);
        pContent = pContent.replace(/\|\s*\*\*Strategic Grain\*\*\s*\|\s*\*\*([^*]+)\*\*/i, `| **Strategic Grain** | **${newGrain.toFixed(2)} Dan**`);
        fs.writeFileSync(progressPath, pContent, 'utf8');
      } catch (e) {}
    }

    return {
      success: true,
      newLocation: targetSubLoc,
      newGrain,
      grainDeducted: cost,
      targetNameVi,
      targetNameEn
    };
  }
}

module.exports = {
  TravelManager
};
