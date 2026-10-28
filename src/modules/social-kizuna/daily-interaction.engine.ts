/**
 * ThreeKingdoms-AgentEngine: Everyday Socio-Behavioral & Fog of Information Engine
 * (src/modules/social-kizuna/daily-interaction.engine.ts)
 *
 * Implements:
 * 1. Progressive Fog of Information (5 Kizuna Tiers: Stranger -> Acquaintance -> Familiar -> Confidant -> Sworn Bond)
 * 2. Probabilistic D20 Social Resolution with Attribute, Hobby, Dislike, and Mood Modifiers
 * 3. Daily Life Universal Interaction Taxonomies (Converse, Drink/Banquet, Learn/Mentor, Spar, Gift, Confess)
 * 4. Archetype Persona Dialogue Generation (Martial, Scholar, Artisan, Merchant, Loyal Hero)
 *
 * Adheres strictly to AgentOption Universe Architecture v4.0.
 */

import { DatabaseService } from '../../core/database';
import path from 'path';
import { execSync } from 'child_process';

export type FogTier = 1 | 2 | 3 | 4 | 5;

export type NpcMood = 'CHEERFUL' | 'NORMAL' | 'TIRED' | 'ANNOYED' | 'DRUNK' | 'MELANCHOLY';

export type EverydayActionType =
  | 'TEA_CONVERSE'      // Chuyện phiếm làng xã, mời trà, thăm dò khí sắc
  | 'BANQUET_DRINK'     // Mời rượu, đồng bàn ẩm thực, giải tỏa mỏi mệt
  | 'LEARN_MENTOR'      // Thỉnh giáo võ nghệ, mưu lược, hoặc kỹ nghệ chế tác
  | 'SPAR_DEBATE'       // Tỉ thí võ nghệ hoặc đàm đạo biện luận
  | 'GIFT_TREASURE'     // Tặng bảo vật, tiền bạc, quà cáp đời thường
  | 'HEART_CONFESSION'; // Tâm sự đêm khuya, thăm dò hoài bão

export type InteractionOutcome =
  | 'CRITICAL_SUCCESS'  // Đại Hảo / Thấu Cảm Tuyệt Đối (Roll >= 23 or Perfect Hobby Match)
  | 'SUCCESS'           // Hợp Ý / Thuận Lợi (Roll >= 15)
  | 'NEUTRAL'           // Khách Sáo / Xã Giao (Roll >= 10)
  | 'AWKWARD'           // Lạc Quẻ / Lệch Pha (Roll >= 6)
  | 'CRITICAL_FAILURE'; // Phạm Húy / Xung Đột (Roll < 6 or Struck Dislike when annoyed)

export interface NpcProfile {
  npcId: string;
  nameVi: string;
  nameEn: string;
  nameHan?: string;
  styleNameVi?: string;
  styleNameEn?: string;
  baselineLocation?: string;
  locationVi?: string;
  locationEn?: string;
  positionVi?: string;
  positionEn?: string;
  war: number;
  int: number;
  ldr: number;
  pol: number;
  cra: number;
  com: number;
  personality: string;
  motivation: string;
  bioVi: string;
  bioEn: string;
  hobbies: string[];
  dislikes: string[];
  ambitionVi?: string;
  ambitionEn?: string;
  secretStoryVi: string;
  secretStoryEn: string;
}

export interface NpcIntelFogState {
  npcId: string;
  intelLevel: FogTier;
  revealedHobbies: string[];
  revealedDislikes: string[];
  revealedStats: string[];
  revealedAmbition: boolean;
  revealedSecrets: boolean;
  interactionCount: number;
  lastTopic?: string;
  lastOutcome?: InteractionOutcome;
  currentMood: NpcMood;
  affinity: number;
  respect: number;
  relationshipTitleVi: string;
  relationshipTitleEn: string;
}

export interface NpcDossierView {
  npcId: string;
  nameVi: string;
  nameEn: string;
  styleNameVi: string;
  styleNameEn: string;
  positionVi: string;
  positionEn: string;
  locationVi: string;
  locationEn: string;
  avatarChar: string;
  bioVi: string;
  bioEn: string;
  intelLevel: FogTier;
  intelLevelLabelVi: string;
  intelLevelLabelEn: string;
  affinity: number;
  respect: number;
  relationshipTitleVi: string;
  relationshipTitleEn: string;
  currentMood: NpcMood;
  currentMoodLabelVi: string;
  currentMoodLabelEn: string;
  // Attributes under Fog
  stats: {
    war: { display: string; displayVi: string; displayEn: string; value?: number; rankVi: string; rankEn: string };
    int: { display: string; displayVi: string; displayEn: string; value?: number; rankVi: string; rankEn: string };
    ldr: { display: string; displayVi: string; displayEn: string; value?: number; rankVi: string; rankEn: string };
    pol: { display: string; displayVi: string; displayEn: string; value?: number; rankVi: string; rankEn: string };
    cra: { display: string; displayVi: string; displayEn: string; value?: number; rankVi: string; rankEn: string };
    com: { display: string; displayVi: string; displayEn: string; value?: number; rankVi: string; rankEn: string };
  };
  // Hobbies & Dislikes under Fog
  hobbies: { code: string; labelVi: string; labelEn: string; isRevealed: boolean }[];
  dislikes: { code: string; labelVi: string; labelEn: string; isRevealed: boolean }[];
  // Ambition & Secrets under Fog
  ambition: { displayVi: string; displayEn: string; isRevealed: boolean };
  secretStory: { displayVi: string; displayEn: string; isRevealed: boolean };
  interactionCount: number;
}

export interface DailyInteractionResult {
  actionType: EverydayActionType;
  actionTitleVi: string;
  actionTitleEn: string;
  npcId: string;
  npcNameVi: string;
  npcNameEn: string;
  outcome: InteractionOutcome;
  outcomeTitleVi: string;
  outcomeTitleEn: string;
  diceRoll: {
    d20: number;
    statBonus: number;
    hobbyBonus: number;
    moodBonus: number;
    total: number;
  };
  dialogueNarrativeVi: string;
  dialogueNarrativeEn: string;
  deltas: {
    affinityChange: number;
    respectChange: number;
    cashCost: number;
    itemConsumed?: string;
    expGained?: { skill: string; amount: number };
    newIntelUnlocked?: string[];
  };
  updatedDossier: NpcDossierView;
}

// -------------------------------------------------------------
// HISTORICAL PROFILES & ARCHETYPE DEFINITIONS
// -------------------------------------------------------------
const HOBBY_LABELS: Record<string, { vi: string; en: string }> = {
  FINE_WINE: { vi: 'Mỹ Tửu & Thịt Quay', en: 'Fine Wine & Roasted Meats' },
  WEAPONS: { vi: 'Binh Khí & Đao Thương', en: 'Weapons & Swordsmanship' },
  SPRING_AUTUMN_ANNALS: { vi: 'Kinh Xuân Thu & Lịch Sử', en: 'Spring & Autumn Annals & History' },
  WAR_HORSE: { vi: 'Chiến Mã & Yên Cương', en: 'Warhorses & Horsemanship' },
  BENEVOLENCE: { vi: 'Đại Nghĩa & Trợ Dân', en: 'Benevolence & People Welfare' },
  CLASSICS_PHILOSOPHY: { vi: 'Kinh Học & Binh Pháp', en: 'Confucian Classics & Strategy' },
  CRAFT_ENGINEERING: { vi: 'Kỹ Nghệ Gỗ Đá & Cơ Quan', en: 'Crafts, Woodwork & Engineering' },
  TEA: { vi: 'Trà Đạo & Đàm Luận', en: 'Tea Ceremony & High Discourse' },
  CHESS_STRATEGY: { vi: 'Cờ Vây & Trận Đồ', en: 'Weiqi (Go) & Formation Tactics' },
  WEALTH: { vi: 'Kim Ngân & Khế Ước Giao Thương', en: 'Wealth, Coinage & Commerce' },
  LOCAL_GOSSIP: { vi: 'Chuyện Phiếm Làng Xã & Tin Đồn', en: 'Local Gossip & Folk News' }
};

const DISLIKE_LABELS: Record<string, { vi: string; en: string }> = {
  FLATTERY_AND_PEDANTRY: { vi: 'Lời Xu Nịnh Vòng Vo', en: 'Sycophancy & Empty Pedantry' },
  BASE_OPPORTUNISM: { vi: 'Kẻ Bất Nghĩa Tráo Trở', en: 'Treacherous Opportunism' },
  CRUELTY_TO_PEOPLE: { vi: 'Bạo Ngược Hại Dân', en: 'Cruelty Toward Commoners' },
  WASTEFULNESS: { vi: 'Lãng Phí Vật Tư & Coi Khinh Thợ', en: 'Wastefulness & Disdain for Artisans' },
  EUNUCH_CORRUPTION: { vi: 'Hoạn Quan Lộng Quyền', en: 'Corrupt Eunuch Factions' },
  COWARDICE: { vi: 'Hèn Nhát Khi Ra Trận', en: 'Cowardice in Battle' },
  ARROGANCE: { vi: 'Kiêu Ngạo Hống Hách', en: 'Haughty Arrogance' },
  BAD_DEBT: { vi: 'Quỵt Nợ & Lừa Gạt', en: 'Defaulting Debts & Deceit' }
};

const MOOD_LABELS: Record<NpcMood, { vi: string; en: string }> = {
  CHEERFUL: { vi: 'Hào Hứng • Sảng Khoái', en: 'Cheerful • Exuberant' },
  NORMAL: { vi: 'Bình Thản • Ung Dung', en: 'Calm • Composed' },
  TIRED: { vi: 'Mệt Mỏi • Cần Nghỉ Ngơi', en: 'Fatigued • In Need of Rest' },
  ANNOYED: { vi: 'Bực Bội • Trĩu Nặng Ưu Tư', en: 'Annoyed • Distressed' },
  DRUNK: { vi: 'Hơi Men Bừng Bừng • Khát Rượu', en: 'Tipsy • Thirsting for Wine' },
  MELANCHOLY: { vi: 'Trầm Ngâm • U Uất Thế Sự', en: 'Melancholy • Pensive' }
};

export class DailyInteractionEngine {
  private static instance: DailyInteractionEngine | null = null;
  private readonly db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.ensureTables();
  }

  public static getInstance(): DailyInteractionEngine {
    if (!DailyInteractionEngine.instance) {
      DailyInteractionEngine.instance = new DailyInteractionEngine();
    }
    return DailyInteractionEngine.instance;
  }

  private ensureTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS npc_intel_fog (
        npc_id TEXT PRIMARY KEY,
        intel_level INTEGER DEFAULT 1,
        revealed_hobbies TEXT DEFAULT '[]',
        revealed_dislikes TEXT DEFAULT '[]',
        revealed_stats TEXT DEFAULT '[]',
        revealed_ambition INTEGER DEFAULT 0,
        revealed_secrets INTEGER DEFAULT 0,
        interaction_count INTEGER DEFAULT 0,
        last_topic TEXT,
        last_outcome TEXT,
        current_mood TEXT DEFAULT 'NORMAL',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Retrieves or builds the rich master profile for any NPC
   */
  public getNpcMasterProfile(npcId: string): NpcProfile {
    // 1. Try master_characters table
    const char = this.db.queryOne<any>(
      `SELECT * FROM master_characters WHERE npc_id = ? LIMIT 1;`,
      [npcId]
    );

    // 2. Try workshop npc_state table as fallback
    const state = this.db.queryOne<any>(
      `SELECT * FROM npc_state WHERE npc_id = ? LIMIT 1;`,
      [npcId]
    );

    const nameVi = char?.name_vi || state?.name || 'Nhân Sĩ Tam Quốc';
    const nameEn = char?.name_en || state?.name || 'Han Dynasty Figure';
    const styleNameVi = char?.style_name_vi || '';
    const styleNameEn = char?.style_name_en || char?.style_name_vi || '';
    const bioVi = char?.bio_vi || 'Hào kiệt thời loạn thế Tam Quốc, chí hướng phi phàm.';
    const bioEn = char?.bio_en || 'Prominent historical figure of the Three Kingdoms era, of extraordinary caliber.';

    const war = Number(char?.war_attr || state?.war_attr || 50);
    const int = Number(char?.int_attr || state?.int_attr || 50);
    const ldr = Number(char?.ldr_attr || state?.ldr_attr || 50);
    const pol = Number(char?.pol_attr || state?.pol_attr || 50);
    const cra = Number(char?.cra_attr || state?.cra_attr || (npcId === 'NPC-0007' ? 71 : 40));
    const com = Number(char?.com_attr || state?.com_attr || 45);

    let personality = char?.personality || state?.personality || 'STOIC';
    let motivation = char?.motivation || state?.motivation || 'PEACE_AND_ORDER';

    // Tailor specific iconic characters
    let hobbies: string[] = ['LOCAL_GOSSIP', 'TEA'];
    let dislikes: string[] = ['ARROGANCE'];
    let ambitionVi = 'An Cư Lạc Nghiệp • Tích Đức Hành Thiện';
    let ambitionEn = 'Peaceful Livelihood • Virtue & Good Deeds';
    let secretStoryVi = 'Xuất thân bình dị, luôn ấp ủ giấc mộng an cư lạc nghiệp thời loạn thế.';
    let secretStoryEn = 'Humble origins; quietly cherishes the aspiration of secure living in a fractured realm.';

    if (npcId === 'NPC-0001') {
      // Lưu Bị
      hobbies = ['BENEVOLENCE', 'WEAPONS'];
      dislikes = ['CRUELTY_TO_PEOPLE'];
      personality = 'BENEVOLENT_RULER';
      motivation = 'REPUBLIC_RESTORATION';
      ambitionVi = 'Phục Hưng Hán Thất • Tế Thế An Dân';
      ambitionEn = 'Han Dynasty Restoration • Relief of the Commoners';
      secretStoryVi = 'Thực chất ôm ấp đại chí làm đế vương, luôn dùng đức hạnh và giọt nước mắt để chiêu hiền đãi sĩ.';
      secretStoryEn = 'Harbors imperial aspirations; skillfully employs benevolence and genuine tears to win hero hearts.';
    } else if (npcId === 'NPC-0002') {
      // Trương Phi
      hobbies = ['FINE_WINE', 'WEAPONS'];
      dislikes = ['FLATTERY_AND_PEDANTRY'];
      personality = 'FIERY_MARTIAL';
      motivation = 'LOYAL_BROTHERHOOD';
      ambitionVi = 'Huynh Đệ Đồng Lòng • Trảm Tướng Đoạt Cờ';
      ambitionEn = 'Brotherly Devotion • Slaying Champions & Seizing Banners';
      secretStoryVi = 'Trọng người quân tử nho nhã nhưng hay say xỉn đánh đập tiểu tốt, là mầm mống họa sát thân về sau.';
      secretStoryEn = 'Venerates gentle scholars yet lashes common footmen while drunk—a fateful tragic flaw.';
    } else if (npcId === 'NPC-0003') {
      // Quan Vũ
      hobbies = ['SPRING_AUTUMN_ANNALS', 'WAR_HORSE'];
      dislikes = ['BASE_OPPORTUNISM'];
      personality = 'STERN_RIGHTEOUS';
      motivation = 'RIGHTEOUS_LOYALTY';
      ambitionVi = 'Đại Nghĩa Trung Quân • Lưu Danh Thiên Cổ';
      ambitionEn = 'Righteous Loyalty • Immortalized in Historical Annals';
      secretStoryVi = 'Lòng kiêu ngạo tột đỉnh, mắt nhìn chư hầu như cỏ rác, chỉ kính phục bậc trung nghĩa cái thế.';
      secretStoryEn = 'Proud beyond measure, viewing squabbling warlords as mere weeds; reveres only transcendent virtue.';
    } else if (npcId === 'NPC-0007') {
      // Trần Bảo
      hobbies = ['CRAFT_ENGINEERING', 'TEA'];
      dislikes = ['WASTEFULNESS'];
      personality = 'DILIGENT_ARTISAN';
      motivation = 'CRAFT_MASTERY';
      ambitionVi = 'Bách Nghệ Tinh Thông • Chấn Hưng Lương Thị';
      ambitionEn = 'Mastery of All Crafts • Flourishing Liang Enterprise';
      secretStoryVi = 'Từng giấu một bản vẽ nỏ liên châu thời Tiên Hán nhưng chưa dám rèn vì sợ liên lụy gia tộc.';
      secretStoryEn = 'Secretly preserves blueprints of a Western Han repeating crossbow, waiting for a worthy master.';
    } else if (npcId === 'NPC-0012') {
      // Lư Thực
      hobbies = ['CLASSICS_PHILOSOPHY', 'CHESS_STRATEGY'];
      dislikes = ['EUNUCH_CORRUPTION'];
      personality = 'HONORABLE_SCHOLAR';
      motivation = 'PROTECT_DYNASTY';
      ambitionVi = 'Phò Trợ Giang Sơn • Dẹp Loạn Khăn Vàng';
      ambitionEn = 'Upholding the State • Crushing Yellow Turban Rebellion';
      secretStoryVi = 'Đã chuẩn bị tâm lý tuẫn tiết hoặc bị cách chức vì kiên quyết từ chối hối lộ giám quân Tả Phong.';
      secretStoryEn = 'Fully prepared for dismissal or martyrdom for refusing to bribe corrupt court eunuch Zuo Feng.';
    } else {
      // Dynamic fallback based on stats
      if (war >= 75) {
        hobbies = ['WEAPONS', 'FINE_WINE'];
        dislikes = ['COWARDICE'];
        ambitionVi = 'Lập Công Chiến Trường • Phong Hầu Đới Ấn';
        ambitionEn = 'Martial Valor • Enfeoffed as Lord with Official Seals';
      } else if (int >= 75) {
        hobbies = ['CLASSICS_PHILOSOPHY', 'CHESS_STRATEGY'];
        dislikes = ['FLATTERY_AND_PEDANTRY'];
        ambitionVi = 'Vận Trù Trướng Mạc • Quyết Thắng Ngàn Dặm';
        ambitionEn = 'Strategic Counsel • Decisive Victory Across a Thousand Leagues';
      } else if (cra >= 60) {
        hobbies = ['CRAFT_ENGINEERING', 'TEA'];
        dislikes = ['WASTEFULNESS'];
        ambitionVi = 'Thần Công Xảo Thủ • Thợ Đầu Thiên Hạ';
        ambitionEn = 'Sublime Craftsmanship • Foremost Artisan Under Heaven';
      } else if (com >= 60) {
        hobbies = ['WEALTH', 'FINE_WINE'];
        dislikes = ['BAD_DEBT'];
        ambitionVi = 'Kinh Luân Phú Gia • Phú Khả Địch Quốc';
        ambitionEn = 'Commercial Hegemony • Wealth Rivaling Dynasties';
      }
    }

    const baselineLocation = char?.baseline_location || 'LOC-0001';
    const LOCATION_LOOKUP: Record<string, { vi: string; en: string }> = {
      'LOC-0001': { vi: 'Vườn Đào (Trác Huyện)', en: 'Peach Garden (Zhuo County)' },
      'LOC-0002': { vi: 'Chợ Đông Môn (Trác Huyện)', en: 'East Gate Market (Zhuo County)' },
      'LOC-0003': { vi: 'Quảng Tông Quân Doanh', en: 'Guangzong Military Camp' },
      'LOC-0007': { vi: 'Xưởng Lương Thị (Trác Huyện)', en: 'Liang Clan Workshop' }
    };
    const locInfo = LOCATION_LOOKUP[baselineLocation] || { vi: baselineLocation, en: baselineLocation };

    const POSITION_EN_MAP: Record<string, string> = {
      'Chiêu Liệt Hoàng Đế • Nhân Nghĩa Chi Quân': 'Emperor Zhaolie • Benevolent Sovereign',
      'Ngũ Hổ Thượng Tướng • Vạn Nhân Địch': 'Tiger General • Peerless Champion',
      'Thái Bình Đạo Giáo Tổ • Hoàng Cân Đại Khởi Nghĩa': 'Way of Peace Founder • Yellow Turban Leader',
      'Thợ Cả Lương Gia': 'Master Artisan of Liang Enterprise',
      'Bắc Quân Trung Lang Tướng': 'General of the Household (Northern Army)',
      'Hào Kiệt Bản Địa': 'Local Champion'
    };
    const positionVi = char?.baseline_position_vi || state?.assigned_role || 'Hào Kiệt Bản Địa';
    const positionEn = POSITION_EN_MAP[positionVi] || char?.baseline_position_en || positionVi;

    return {
      npcId,
      nameVi,
      nameEn,
      nameHan: char?.name_han,
      styleNameVi,
      styleNameEn,
      baselineLocation,
      locationVi: locInfo.vi,
      locationEn: locInfo.en,
      positionVi,
      positionEn,
      war,
      int,
      ldr,
      pol,
      cra,
      com,
      personality,
      motivation,
      bioVi,
      bioEn,
      hobbies,
      dislikes,
      ambitionVi,
      ambitionEn,
      secretStoryVi,
      secretStoryEn
    };
  }

  /**
   * Retrieves active Kizuna sentiment & respect scores
   */
  public getNpcSentiment(npcId: string): { affinity: number; respect: number; titleVi: string; titleEn: string } {
    const base = this.db.queryOne<any>(
      `SELECT baseline_sentiment, relationship_type_vi, relationship_type_en FROM master_relations_baseline WHERE source_entity_id = ? LIMIT 1;`,
      [npcId]
    );

    const deltaRow = this.db.queryOne<any>(
      `SELECT SUM(sentiment_delta) as total_delta FROM npc_relationship_deltas WHERE npc_id = ?;`,
      [npcId]
    );

    const initialSentiment = base ? Number(base.baseline_sentiment) : 25;
    const addedDelta = deltaRow?.total_delta ? Number(deltaRow.total_delta) : 0;
    const affinity = Math.max(0, Math.min(100, initialSentiment + addedDelta));

    // Respect scales with affinity and NPC's perception of player prestige
    const respect = Math.max(10, Math.min(100, Math.floor(affinity * 0.85) + 10));

    let titleVi = 'Người Xa Lạ';
    let titleEn = 'Stranger';
    if (affinity >= 80) {
      titleVi = 'Kim Lan Sinh Tử (Sworn Brother)';
      titleEn = 'Sworn Brother (Life & Death)';
    } else if (affinity >= 60) {
      titleVi = 'Tâm Phúc Tri Kỷ (Confidant)';
      titleEn = 'Trusted Confidant';
    } else if (affinity >= 40) {
      titleVi = 'Bằng Hữu Thân Quen (Familiar)';
      titleEn = 'Familiar Companion';
    } else if (affinity >= 20) {
      titleVi = 'Sơ Giao Đồng Hương (Acquaintance)';
      titleEn = 'Acquaintance';
    }

    if (base?.relationship_type_vi && affinity >= 60) {
      titleVi = `${base.relationship_type_vi} (${titleVi})`;
    }
    if (base?.relationship_type_en && affinity >= 60) {
      titleEn = `${base.relationship_type_en} (${titleEn})`;
    }

    return { affinity, respect, titleVi, titleEn };
  }

  /**
   * Resolves effective Fog Level from Kizuna sentiment
   */
  public calculateFogTier(affinity: number): FogTier {
    if (affinity >= 80) return 5; // Sworn Bond
    if (affinity >= 60) return 4; // Confidant
    if (affinity >= 40) return 3; // Familiar
    if (affinity >= 20) return 2; // Acquaintance
    return 1;                     // Stranger
  }

  /**
   * Loads or initializes Fog State for an NPC
   */
  public getOrCreateFogState(npcId: string): NpcIntelFogState {
    const sentiment = this.getNpcSentiment(npcId);
    const calculatedTier = this.calculateFogTier(sentiment.affinity);

    let row = this.db.queryOne<any>(
      `SELECT * FROM npc_intel_fog WHERE npc_id = ?;`,
      [npcId]
    );

    if (!row) {
      this.db.execute(
        `INSERT INTO npc_intel_fog (npc_id, intel_level, current_mood) VALUES (?, ?, 'NORMAL');`,
        [npcId, calculatedTier]
      );
      row = {
        npc_id: npcId,
        intel_level: calculatedTier,
        revealed_hobbies: '[]',
        revealed_dislikes: '[]',
        revealed_stats: '[]',
        revealed_ambition: 0,
        revealed_secrets: 0,
        interaction_count: 0,
        current_mood: 'NORMAL'
      };
    }

    // Auto-advance intel_level if affinity naturally crossed tier
    const effectiveTier = Math.max(row.intel_level, calculatedTier) as FogTier;
    if (effectiveTier > row.intel_level) {
      this.db.execute(`UPDATE npc_intel_fog SET intel_level = ? WHERE npc_id = ?;`, [effectiveTier, npcId]);
    }

    let revealedHobbies: string[] = [];
    let revealedDislikes: string[] = [];
    let revealedStats: string[] = [];

    try { revealedHobbies = JSON.parse(row.revealed_hobbies || '[]'); } catch (e) {}
    try { revealedDislikes = JSON.parse(row.revealed_dislikes || '[]'); } catch (e) {}
    try { revealedStats = JSON.parse(row.revealed_stats || '[]'); } catch (e) {}

    return {
      npcId,
      intelLevel: effectiveTier,
      revealedHobbies,
      revealedDislikes,
      revealedStats,
      revealedAmbition: Boolean(row.revealed_ambition || effectiveTier >= 4),
      revealedSecrets: Boolean(row.revealed_secrets || effectiveTier >= 5),
      interactionCount: Number(row.interaction_count || 0),
      lastTopic: row.last_topic,
      lastOutcome: row.last_outcome,
      currentMood: (row.current_mood as NpcMood) || 'NORMAL',
      affinity: sentiment.affinity,
      respect: sentiment.respect,
      relationshipTitleVi: sentiment.titleVi,
      relationshipTitleEn: sentiment.titleEn
    };
  }

  /**
   * Produces the sanitized Dossier View respecting Fog of Information
   */
  public getNpcDossier(npcId: string): NpcDossierView {
    const profile = this.getNpcMasterProfile(npcId);
    const fog = this.getOrCreateFogState(npcId);
    const tier = fog.intelLevel;

    const resolveRank = (val: number): { rankVi: string; rankEn: string } => {
      if (val >= 90) return { rankVi: 'Tuyệt Thế (90+)', rankEn: 'Peerless (90+)' };
      if (val >= 75) return { rankVi: 'Kiệt Xuất (75-89)', rankEn: 'Exceptional (75-89)' };
      if (val >= 60) return { rankVi: 'Khá Tốt (60-74)', rankEn: 'Proficient (60-74)' };
      if (val >= 45) return { rankVi: 'Bình Thường (45-59)', rankEn: 'Average (45-59)' };
      return { rankVi: 'Yếu Kém (<45)', rankEn: 'Deficient (<45)' };
    };

    // Attribute visibility under fog
    const makeStatView = (attrName: string, val: number) => {
      const r = resolveRank(val);
      if (tier >= 3 || fog.revealedStats.includes(attrName)) {
        // Tier 3+ : 100% exact numerical value
        return { display: `${val}`, displayVi: `${val}`, displayEn: `${val}`, value: val, rankVi: r.rankVi, rankEn: r.rankEn };
      } else if (tier === 2) {
        // Tier 2 : Approximate rank
        return { display: r.rankVi, displayVi: r.rankVi, displayEn: r.rankEn, rankVi: r.rankVi, rankEn: r.rankEn };
      } else {
        // Tier 1 : Complete fog
        return { display: '???', displayVi: '???', displayEn: '???', rankVi: 'Sương Mù Che Phủ', rankEn: 'Veiled in Fog' };
      }
    };

    // Hobbies visibility
    const hobbiesView = profile.hobbies.map((h, idx) => {
      // First hobby reveals at Tier 2+, second at Tier 3+
      const isRevealed = tier >= (idx === 0 ? 2 : 3) || fog.revealedHobbies.includes(h);
      const info = HOBBY_LABELS[h] || { vi: h, en: h };
      return {
        code: h,
        labelVi: isRevealed ? info.vi : '??? (Cần tiếp xúc)',
        labelEn: isRevealed ? info.en : '??? (Requires rapport)',
        isRevealed
      };
    });

    // Dislikes visibility
    const dislikesView = profile.dislikes.map((d) => {
      const isRevealed = tier >= 3 || fog.revealedDislikes.includes(d);
      const info = DISLIKE_LABELS[d] || { vi: d, en: d };
      return {
        code: d,
        labelVi: isRevealed ? info.vi : '??? (Chưa rõ cấm kỵ)',
        labelEn: isRevealed ? info.en : '??? (Taboo unrevealed)',
        isRevealed
      };
    });

    const ambitionView = {
      displayVi: (tier >= 4 || fog.revealedAmbition) ? (profile.ambitionVi || profile.motivation) : '🔒 Khóa [Cần Hảo Cảm ≥ 60 để mở]',
      displayEn: (tier >= 4 || fog.revealedAmbition) ? (profile.ambitionEn || profile.motivation) : '🔒 Locked [Requires Affinity ≥ 60]',
      isRevealed: tier >= 4 || fog.revealedAmbition
    };

    const secretView = {
      displayVi: (tier >= 5 || fog.revealedSecrets) ? profile.secretStoryVi : '🔒 Khóa [Cần Kết Bái Huynh Đệ để mở]',
      displayEn: (tier >= 5 || fog.revealedSecrets) ? profile.secretStoryEn : '🔒 Locked [Requires Sworn Bond]',
      isRevealed: tier >= 5 || fog.revealedSecrets
    };

    const tierLabelsVi: Record<FogTier, string> = {
      1: 'Tầng 1: Xa Lạ (Stranger)',
      2: 'Tầng 2: Sơ Giao (Acquaintance)',
      3: 'Tầng 3: Thân Quen (Familiar)',
      4: 'Tầng 4: Tri Kỷ (Confidant)',
      5: 'Tầng 5: Kim Lan Sinh Tử (Sworn Bond)'
    };

    const tierLabelsEn: Record<FogTier, string> = {
      1: 'Tier 1: Stranger',
      2: 'Tier 2: Acquaintance',
      3: 'Tier 3: Familiar',
      4: 'Tier 4: Confidant',
      5: 'Tier 5: Sworn Bond'
    };

    return {
      npcId: profile.npcId,
      nameVi: profile.nameVi,
      nameEn: profile.nameEn,
      styleNameVi: profile.styleNameVi || 'Chưa rõ tự',
      styleNameEn: profile.styleNameEn || profile.styleNameVi || 'Style unrecorded',
      positionVi: profile.positionVi || 'Hào Kiệt Bản Địa',
      positionEn: profile.positionEn || 'Local Champion',
      locationVi: profile.locationVi || 'LOC-0001',
      locationEn: profile.locationEn || profile.baselineLocation || 'LOC-0001',
      avatarChar: profile.nameVi.charAt(0),
      bioVi: profile.bioVi,
      bioEn: profile.bioEn,
      intelLevel: tier,
      intelLevelLabelVi: tierLabelsVi[tier],
      intelLevelLabelEn: tierLabelsEn[tier],
      affinity: fog.affinity,
      respect: fog.respect,
      relationshipTitleVi: fog.relationshipTitleVi,
      relationshipTitleEn: fog.relationshipTitleEn,
      currentMood: fog.currentMood,
      currentMoodLabelVi: MOOD_LABELS[fog.currentMood]?.vi || 'Bình thản',
      currentMoodLabelEn: MOOD_LABELS[fog.currentMood]?.en || 'Calm',
      stats: {
        war: makeStatView('war', profile.war),
        int: makeStatView('int', profile.int),
        ldr: makeStatView('ldr', profile.ldr),
        pol: makeStatView('pol', profile.pol),
        cra: makeStatView('cra', profile.cra),
        com: makeStatView('com', profile.com)
      },
      hobbies: hobbiesView,
      dislikes: dislikesView,
      ambition: ambitionView,
      secretStory: secretView,
      interactionCount: fog.interactionCount
    };
  }

  /**
   * Executes a probabilistic daily interaction with full D20 mechanics and Fog updates
   */
  public executeDailyInteraction(
    npcId: string,
    actionType: EverydayActionType,
    customPrompt = '',
    offeredItemCode?: string
  ): DailyInteractionResult {
    const profile = this.getNpcMasterProfile(npcId);
    const fog = this.getOrCreateFogState(npcId);

    // 1. Calculate D20 Social Roll
    const d20 = Math.floor(Math.random() * 20) + 1; // 1 to 20

    // Attribute modifier
    let statBonus = 0;
    if (actionType === 'SPAR_DEBATE') {
      statBonus = Math.floor(profile.war / 25);
    } else if (actionType === 'LEARN_MENTOR') {
      statBonus = Math.floor(profile.int / 25);
    } else {
      statBonus = Math.floor(fog.respect / 25);
    }

    // Hobby Bonus / Dislike Penalty
    let hobbyBonus = 0;
    let newIntelUnlocked: string[] = [];

    if (actionType === 'BANQUET_DRINK') {
      if (profile.hobbies.includes('FINE_WINE')) {
        hobbyBonus += 5;
        if (!fog.revealedHobbies.includes('FINE_WINE')) {
          newIntelUnlocked.push('Sở Thích: Mỹ Tửu & Thịt Nướng');
          fog.revealedHobbies.push('FINE_WINE');
        }
      }
    } else if (actionType === 'TEA_CONVERSE') {
      if (profile.hobbies.includes('TEA') || profile.hobbies.includes('CLASSICS_PHILOSOPHY')) {
        hobbyBonus += 3;
      }
    } else if (actionType === 'GIFT_TREASURE') {
      if (offeredItemCode === 'COM-LEATH' && profile.hobbies.includes('WEAPONS')) {
        hobbyBonus += 4;
      } else {
        hobbyBonus += 3; // General gift appreciation
      }
    }

    // Mood modifier
    let moodBonus = 0;
    if (fog.currentMood === 'CHEERFUL') moodBonus = 2;
    else if (fog.currentMood === 'TIRED' || fog.currentMood === 'ANNOYED') moodBonus = -3;
    else if (fog.currentMood === 'DRUNK') moodBonus = 1;

    const totalRoll = d20 + statBonus + hobbyBonus + moodBonus;

    // 2. Resolve Outcome
    let outcome: InteractionOutcome = 'SUCCESS';
    let affinityDelta = 5;
    let respectDelta = 2;
    let cashCost = 0;
    let expGained: { skill: string; amount: number } | undefined = undefined;

    if (totalRoll >= 22 || (d20 === 20 && hobbyBonus > 0)) {
      outcome = 'CRITICAL_SUCCESS';
      affinityDelta = 18;
      respectDelta = 8;
    } else if (totalRoll >= 14) {
      outcome = 'SUCCESS';
      affinityDelta = 8;
      respectDelta = 4;
    } else if (totalRoll >= 9) {
      outcome = 'NEUTRAL';
      affinityDelta = 2;
      respectDelta = 1;
    } else if (totalRoll >= 5) {
      outcome = 'AWKWARD';
      affinityDelta = -1;
      respectDelta = 0;
    } else {
      outcome = 'CRITICAL_FAILURE';
      affinityDelta = -6;
      respectDelta = -3;
    }

    // 3. Costs and Rewards by Action Type
    if (actionType === 'BANQUET_DRINK') {
      cashCost = 30; // 30 Qian for fine wine and meats
    } else if (actionType === 'TEA_CONVERSE') {
      cashCost = 5;  // 5 Qian tea table fee
    } else if (actionType === 'LEARN_MENTOR') {
      cashCost = 25; // Mentorship tribute
      if (outcome === 'SUCCESS' || outcome === 'CRITICAL_SUCCESS') {
        const skillName = profile.war >= profile.int ? 'Võ Thuật (Warfare)' : 'Mưu Lược (Tactics)';
        expGained = { skill: skillName, amount: outcome === 'CRITICAL_SUCCESS' ? 25 : 12 };
      }
    } else if (actionType === 'GIFT_TREASURE') {
      cashCost = 50; // Cash gift
    }

    // 4. Generate Narrative according to Archetype & Outcome
    let dialogueNarrativeVi = '';
    let dialogueNarrativeEn = '';
    const heroName = profile.nameVi;
    const heroNameEn = profile.nameEn || profile.nameVi;

    if (actionType === 'BANQUET_DRINK') {
      if (outcome === 'CRITICAL_SUCCESS') {
        dialogueNarrativeVi = `${heroName} nâng bát rượu đầy sóng sánh, uống cạn trong một hơi rồi cười vang hào sảng: "Ha ha ha! Lương huynh mang tới rượu ngon thế này thật hợp ý ta! Thời buổi loạn lạc, tìm được tri âm cùng say một trận khó hơn ngàn vàng!"`;
        dialogueNarrativeEn = `${heroNameEn} raises a brimming bowl of fine wine, drains it in a single draught, and roars with hearty laughter: "Hahaha! Brother Liang brings such exquisite wine, truly hitting the spot! In this turbulent age, finding a kindred spirit to share drinks with is worth more than a thousand bars of gold!"`;
      } else if (outcome === 'SUCCESS') {
        dialogueNarrativeVi = `${heroName} vui vẻ chạm chén cùng Lương Diễn: "Rượu ấm lòng người! Đàm đạo chuyện thế sự cùng huynh quả thật khiến người ta giải tỏa bao nỗi nhọc nhằn."`;
        dialogueNarrativeEn = `${heroNameEn} warmly clinks bowls with Liang Yan: "Warm wine comforts the soul! Discussing worldly affairs with you truly banishes all worldly weariness."`;
      } else if (outcome === 'AWKWARD') {
        dialogueNarrativeVi = `${heroName} nhấp nhẹ ngụm rượu, nhìn sang hướng khác trầm ngâm: "Rượu tuy có, nhưng tâm trạng ta hôm nay không được thanh thản cho lắm..."`;
        dialogueNarrativeEn = `${heroNameEn} takes a brief sip of wine, looking aside pensively: "The wine is present, but my heart is heavy with concerns today..."`;
      } else {
        dialogueNarrativeVi = `${heroName} buông chén rượu xuống bàn vẻ không vui: "Lương huynh lời lẽ có phần khách sáo gượng gạo, lão huynh ta tính vốn bộc trực, không thích kiểu tiệc tùng hình thức này!"`;
        dialogueNarrativeEn = `${heroNameEn} sets down the wine bowl with displeasure: "Your words feel stilted and forced, Brother Liang. I am a blunt soul and have no patience for empty ceremonial banquets!"`;
      }
    } else if (actionType === 'LEARN_MENTOR') {
      if (outcome === 'CRITICAL_SUCCESS') {
        dialogueNarrativeVi = `${heroName} đích thân cầm binh khí thị phạm từng thế đánh tinh vi, ánh mắt đầy tán thưởng: "Hảo kiếm pháp! Lương đệ ngộ tính trác tuyệt, chỉ cần điểm xuyết vài yếu lĩnh trận địa này là đủ xưng hùng một phương!"`;
        dialogueNarrativeEn = `${heroNameEn} personally demonstrates intricate maneuvers, eyes gleaming with admiration: "Superb execution! Brother Liang possesses extraordinary talent; mastering these few tactical principles is enough to hold your own anywhere!"`;
      } else if (outcome === 'SUCCESS') {
        dialogueNarrativeVi = `${heroName} kiên nhẫn chỉ dẫn các thế tấn và bí quyết vận khí: "Võ nghệ hay mưu lược đều cần công phu tích lũy từng ngày. Đệ nắm bắt thế này là rất có căn cơ!"`;
        dialogueNarrativeEn = `${heroNameEn} patiently instructs stances and timing: "Martial arts and strategy require diligent daily mastery. You grasp the fundamentals remarkably well!"`;
      } else {
        dialogueNarrativeVi = `${heroName} lắc đầu thở dài: "Tâm chưa tịnh thì luyện võ mưu đồ chỉ tổ chuốc họa. Hôm nay tạm dừng ở đây thôi."`;
        dialogueNarrativeEn = `${heroNameEn} shakes his head with a sigh: "Without a calm spirit, training in arms or strategy will only invite folly. Let us conclude for today."`;
      }
    } else if (actionType === 'SPAR_DEBATE') {
      if (outcome === 'CRITICAL_SUCCESS') {
        dialogueNarrativeVi = `Hai bên giao tranh kịch liệt hơn 30 hiệp! ${heroName} thu thế thủ, vuốt râu khen ngợi: "Tuyệt diệu! Đòn công vừa rồi của Lương đệ quả là sắc bén kinh người, khiến ta cũng phải dốc bảy phần thực lực mới hóa giải nổi!"`;
        dialogueNarrativeEn = `Both sides clash fiercely for over thirty exchanges! ${heroNameEn} lowers his guard and praises warmly: "Magnificent! That offensive stroke was razor-sharp, compelling me to exert seventy percent of my might to parry it!"`;
      } else {
        dialogueNarrativeVi = `Hai bên trao đổi chiêu thức chừng mươi hiệp. ${heroName} mỉm cười gật đầu: "Giao lưu võ nghệ giúp thông suốt gân cốt, nhuệ khí đôi bên đều tăng tiến rõ rệt!"`;
        dialogueNarrativeEn = `Both sides exchange martial blows across a dozen passes. ${heroNameEn} nods in approval: "Sparring clears the mind and invigorates the limbs; our fighting spirit is noticeably heightened!"`;
      }
    } else if (actionType === 'GIFT_TREASURE') {
      if (outcome === 'CRITICAL_SUCCESS') {
        dialogueNarrativeVi = `${heroName} đón nhận lễ vật, cảm kích muôn phần: "Món quà này thật đúng ý ta! Tấm chân tình của Lương huynh, đời này ta quyết không quên!"`;
        dialogueNarrativeEn = `${heroNameEn} accepts the gift with deep gratitude: "This gift matches my heart precisely! Brother Liang's sincere friendship will never be forgotten!"`;
      } else {
        dialogueNarrativeVi = `${heroName} mỉm cười nhận lễ: "Đa tạ Lương huynh đã có lòng nhớ đến ta."`;
        dialogueNarrativeEn = `${heroNameEn} smiles and receives the gift: "Many thanks, Brother Liang, for keeping me in your thoughts."`;
      }
    } else if (actionType === 'HEART_CONFESSION') {
      if (outcome === 'CRITICAL_SUCCESS') {
        dialogueNarrativeVi = `${heroName} xúc động nắm chặt tay Lương Diễn, dốc bầu tâm sự: "Gặp được tri âm thời loạn, cùng chung chí hướng cứu độ lê dân, quả là phúc lớn ba đời!"`;
        dialogueNarrativeEn = `${heroNameEn} grasps Liang Yan's hands with profound emotion: "Finding a kindred spirit amidst chaotic times who shares the ambition to succor the people is truly a blessing of a lifetime!"`;
      } else {
        dialogueNarrativeVi = `${heroName} lắng nghe tâm sự, gật đầu tán thưởng chí khí trác tuyệt: "Chí hướng của Lương huynh rất đáng trân trọng."`;
        dialogueNarrativeEn = `${heroNameEn} listens intently to the aspirations, nodding in respect: "Your ambitions, Brother Liang, are truly worthy of respect."`;
      }
    } else {
      // General Converse / Tea
      if (outcome === 'CRITICAL_SUCCESS') {
        dialogueNarrativeVi = `${heroName} gật đầu liên hồi, ánh mắt rực sáng: "Chí Viễn kiến giải thâm sâu, nhìn thấu thời cuộc như lòng bàn tay! Được đàm đạo cùng đệ thật chẳng khác nào uống một chén trà giải hạn giữa mùa hè đỏ lửa!"`;
        dialogueNarrativeEn = `${heroNameEn} nods repeatedly with glowing eyes: "Zhiyuan, your insights cut straight to the heart of current affairs! Conversing with you is like sipping spring tea that quenches a blazing summer drought!"`;
      } else {
        dialogueNarrativeVi = `${heroName} ôn tồn thưởng trà cùng Lương Diễn: "${customPrompt || 'Đàm đạo thế cuộc'}. Lời của huynh chí lý lắm, bách tính thời này quả thực cần những người có thực lực và tấm lòng như huynh."`;
        dialogueNarrativeEn = `${heroNameEn} serenely sips tea with Liang Yan: "${customPrompt || 'Discussing the realm'}. Your words hold great truth; commoners in these troubled times truly need individuals of both strength and compassion."`;
      }
    }

    // 5. Commit to SQLite (ACID Transaction)
    this.db.transaction(() => {
      // 5.1 Deduct cash if any and balance with ledger & journal
      if (cashCost > 0) {
        const player = this.db.queryOne<any>(`SELECT liquid_cash, safe_cash FROM player_state LIMIT 1;`);
        const currentLiquid = Number(player?.liquid_cash || 0);
        const safeCash = Number(player?.safe_cash || 0);
        const currentTotal = currentLiquid + safeCash;
        if (currentLiquid >= cashCost) {
          const newLiquid = currentLiquid - cashCost;
          const newTotalBalance = currentTotal - cashCost;
          this.db.execute(`UPDATE player_state SET liquid_cash = ?;`, [newLiquid]);
          const txnId = `TXN-SOC-${Date.now().toString(36).toUpperCase()}`;
          const memo = `Chi phí giao tế & ẩm thực cùng ${heroName}`;

          this.db.execute(`
            INSERT INTO cashflow_ledger (
              txn_id, game_date, counterparty, category,
              inflow, outflow, balance, memo, status
            ) VALUES (?, '184-05-02', ?, 'ENTERTAINMENT_LIVING', 0, ?, ?, ?, 'Confirmed');
          `, [txnId, heroName, cashCost, newTotalBalance, memo]);

          // Double-Entry Parity
          this.db.execute(`
            INSERT INTO account_journal (
              txn_id, campaign_id, game_date, account_code, debit, credit, memo
            ) VALUES (?, 'CMP-184-ZHOU-01', '184-05-02', 'EXP-OPERATING', ?, 0, ?);
          `, [txnId, cashCost, memo]);

          this.db.execute(`
            INSERT INTO account_journal (
              txn_id, campaign_id, game_date, account_code, debit, credit, memo
            ) VALUES (?, 'CMP-184-ZHOU-01', '184-05-02', 'CASH-ON-HAND', 0, ?, 'Xuất tiền mặt chi tiêu giao tế');
          `, [txnId, cashCost]);
        }
      }

      // 5.2 Record Relationship Delta
      this.db.execute(`
        INSERT INTO npc_relationship_deltas (
          npc_id, game_date, sentiment_delta, sentiment_total, relationship_type, notes
        ) VALUES (?, '184-05-02', ?, ?, ?, ?);
      `, [
        npcId,
        affinityDelta,
        Math.max(0, Math.min(100, fog.affinity + affinityDelta)),
        fog.relationshipTitleVi,
        `${actionType}: ${outcome} (${dialogueNarrativeVi.slice(0, 60)}...)`
      ]);

      // 5.3 Update Fog Table
      const updatedHobbiesJson = JSON.stringify(fog.revealedHobbies);
      const updatedDislikesJson = JSON.stringify(fog.revealedDislikes);
      const updatedStatsJson = JSON.stringify(fog.revealedStats);
      const newInteractions = fog.interactionCount + 1;

      this.db.execute(`
        UPDATE npc_intel_fog
        SET interaction_count = ?,
            revealed_hobbies = ?,
            revealed_dislikes = ?,
            revealed_stats = ?,
            last_topic = ?,
            last_outcome = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE npc_id = ?;
      `, [newInteractions, updatedHobbiesJson, updatedDislikesJson, updatedStatsJson, actionType, outcome, npcId]);
    });

    if (cashCost > 0) {
      try {
        const simDbPath = path.resolve(__dirname, '../../../tools/sim-db.js');
        execSync(`node "${simDbPath}" export-progress`, { stdio: 'ignore' });
      } catch (e) {}
    }

    const updatedDossier = this.getNpcDossier(npcId);

    const actionTitlesVi: Record<EverydayActionType, string> = {
      TEA_CONVERSE: 'Mời Trà Đàm Đạo',
      BANQUET_DRINK: 'Rót Rượu Ẩm Thực',
      LEARN_MENTOR: 'Thỉnh Giáo Kỹ Nghệ',
      SPAR_DEBATE: 'Luận Võ So Tài',
      GIFT_TREASURE: 'Tặng Quà Kết Giao',
      HEART_CONFESSION: 'Tâm Sự Hoài Bão'
    };

    const actionTitlesEn: Record<EverydayActionType, string> = {
      TEA_CONVERSE: 'Offer Tea & Converse',
      BANQUET_DRINK: 'Host Wine Banquet',
      LEARN_MENTOR: 'Seek Mentorship',
      SPAR_DEBATE: 'Spar & Debate',
      GIFT_TREASURE: 'Present Gift',
      HEART_CONFESSION: 'Confide Ambition'
    };

    const outcomeTitlesVi: Record<InteractionOutcome, string> = {
      CRITICAL_SUCCESS: 'Đại Hảo (Thấu Cảm Tuyệt Đối)',
      SUCCESS: 'Hợp Ý (Thuận Lợi)',
      NEUTRAL: 'Khách Sáo (Xã Giao)',
      AWKWARD: 'Lạc Quẻ (Gượng Gạo)',
      CRITICAL_FAILURE: 'Phạm Húy (Xung Đột)'
    };

    const outcomeTitlesEn: Record<InteractionOutcome, string> = {
      CRITICAL_SUCCESS: 'Resounding Success (Kindred Empathy)',
      SUCCESS: 'Favorable Harmony (Success)',
      NEUTRAL: 'Polite Courtesy (Neutral)',
      AWKWARD: 'Strained Discord (Awkward)',
      CRITICAL_FAILURE: 'Grave Taboo (Conflict)'
    };

    return {
      actionType,
      actionTitleVi: actionTitlesVi[actionType],
      actionTitleEn: actionTitlesEn[actionType],
      npcId,
      npcNameVi: profile.nameVi,
      npcNameEn: profile.nameEn || profile.nameVi,
      outcome,
      outcomeTitleVi: outcomeTitlesVi[outcome],
      outcomeTitleEn: outcomeTitlesEn[outcome],
      diceRoll: {
        d20,
        statBonus,
        hobbyBonus,
        moodBonus,
        total: totalRoll
      },
      dialogueNarrativeVi,
      dialogueNarrativeEn,
      deltas: {
        affinityChange: affinityDelta,
        respectChange: respectDelta,
        cashCost,
        itemConsumed: offeredItemCode,
        expGained,
        newIntelUnlocked: newIntelUnlocked.length > 0 ? newIntelUnlocked : undefined
      },
      updatedDossier
    };
  }
}
