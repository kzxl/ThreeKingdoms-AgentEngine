/**
 * Feature Module: Ancient Professions, Gathering & Emergent Innovation System
 * Implements historical Three Kingdoms commoner professions (Mining, Herbalism, Smithing, Carpentry,
 * Medicine, Salt Boiling, Farming) and cross-disciplinary emergent breakthrough synthesis.
 *
 * Adheres to AgentOption Universe Modular Architecture v4.0.
 */

import { DatabaseService } from '../../core/database';
import { syncProgressProjection } from '../../shared/projection-sync';
import { RngService } from '../../core/rng';
import { nextId } from '../../shared/id-generator';
import { getGameDate } from '../../shared/game-clock';
import { SkillService } from '../progression/skill.service';
import { ResourceNodeService } from './resource-node.service';
import {
  IFeatureModule,
  ModuleContext,
  CharacterId,
  SettlementId,
  CharacterProfessionState,
  GatheringNode,
  EmergentInnovation
} from '../../core/types';

const PROFESSION_SKILL: Record<string, string> = {
  PROF_MINER: 'SKL-CRA-SMITH',
  PROF_HERBALIST: 'SKL-MED-HEAL',
  PROF_CARPENTER: 'SKL-CRA-WEAVE',
  PROF_SALT_MAKER: 'SKL-COM-SPECULATE',
  PROF_FARMER: 'SKL-LOG-PROV',
  PROF_FISHER: 'SKL-LOG-PROV',
  PROF_HUNTER: 'SKL-WAR-ARCH'
};

export class ProfessionsModule implements IFeatureModule {
  public readonly id = 'module.professions';
  public readonly name = 'Ancient Professions, Gathering & Emergent Innovation System';
  public readonly version = '1.0.0';

  private ctx!: ModuleContext;
  private db!: DatabaseService;

  public async init(ctx: ModuleContext): Promise<void> {
    this.ctx = ctx;
    this.db = DatabaseService.getInstance(ctx.dbPath);
    this.ensureTablesAndSeedData();
  }

  private ensureTablesAndSeedData(): void {
    // 1. Seed Gathering Nodes if empty
    const nodeCount = this.db.queryOne<{ count: number }>(`SELECT count(*) as count FROM gathering_nodes;`)?.count || 0;
    if (nodeCount === 0) {
      this.seedGatheringNodes();
    }
    this.ensureResourceExpansionNodes();

    // 2. Seed Initial Professions for Player & Key NPCs if empty
    const profCount = this.db.queryOne<{ count: number }>(`SELECT count(*) as count FROM character_professions;`)?.count || 0;
    if (profCount === 0) {
      this.seedInitialProfessions();
    }
  }

  /**
   * Adds the farming / fishing / hunting resource families introduced by the
   * profession-resource expansion. Idempotent so existing saves receive them.
   */
  private ensureResourceExpansionNodes(): void {
    this.db.execute(`
      INSERT OR IGNORE INTO master_items
        (item_code, name_vi, name_en, category, unit_vi, unit_en, baseline_peace_price,
         current_market_price, volatility_index, weight_kg, is_contraband,
         production_source_vi, description_vi, description_en, stat_modifiers)
      VALUES
        ('COM-FISH-FRESH', 'Cá Tươi Sông Hồ', 'Fresh River Fish', 'FOOD_STUFF', 'con', 'fish',
         22, 22, 0.15, 1.0, 0, 'Đánh bắt sông hồ',
         'Cá tươi đánh bắt từ sông hồ, nguồn thực phẩm giàu đạm cho dân chúng và quân đội.',
         'Fresh fish from rivers and lakes.', '{}'),
        ('COM-GAME-MEAT', 'Thịt Thú Rừng', 'Wild Game Meat', 'FOOD_STUFF', 'cân', 'jin',
         38, 38, 0.20, 1.0, 0, 'Săn bắn sơn lâm',
         'Thịt thú rừng săn bắt, món ăn quý cho hào kiệt và binh sĩ.',
         'Wild game meat from mountain forests.', '{}'),
        ('RAW-HIDE', 'Da Thú Săn Bắn', 'Raw Game Hide', 'RAW_MATERIAL', 'tấm', 'hide',
         18, 18, 0.18, 1.0, 0, 'Săn bắn sơn lâm',
         'Da thú chưa thuộc, nguyên liệu chế giáp nhẹ và bao da.',
         'Raw game hide for light armour and leather goods.', '{}');
    `);

    this.db.execute(`
      INSERT OR IGNORE INTO gathering_nodes
        (node_id, settlement_id, name_vi, name_en, resource_type, yield_item_code,
         yield_item_name_vi, yield_quantity_min, yield_quantity_max, fatigue_cost, description_vi)
      VALUES
        ('NODE-ZHUO-FARM', 'zhuo_xian', 'Ruộng Lúa Đông Môn', 'East Gate Rice Fields', 'FARM', 'COM-GRAIN', 'Lúa Gạo Đông Môn', 3, 6, 14, 'Ruộng lúa tưới tiêu ven cổng đông Trác Huyện, dân phu cày cấy theo mùa và nộp tô cho chủ điền.'),
        ('NODE-PINGYUAN-FARM', 'ping_yuan', 'Đồng Ruộng Bình Nguyên', 'Pingyuan Farmland', 'FARM', 'COM-GRAIN', 'Lúa Gạo Bình Nguyên', 4, 8, 16, 'Cánh đồng phù sa ven sông, vựa lương của Thanh Châu và nơi nghĩa quân trưng thu quân lương.'),
        ('NODE-XUCHANG-FARM', 'xu_chang', 'Đồn Điền Dĩnh Xuyên', 'Yingchuan Tuntian Fields', 'FARM', 'COM-GRAIN', 'Lúa Đồn Điền Dĩnh Xuyên', 5, 9, 16, 'Khu đồn điền Dĩnh Xuyên do quân phủ tổ chức, trồng lúa và đậu để nuôi binh sĩ.'),
        ('NODE-CHENGDU-FARM', 'cheng_du', 'Ruộng Lúa Đô Giang Yển', 'Dujiangyan Rice Fields', 'FARM', 'COM-GRAIN', 'Lúa Gạo Thục Trung', 6, 10, 18, 'Đồng bằng Ba Thục được Đô Giang Yển tưới tiêu, năng suất cao nhất thiên hạ.'),
        ('NODE-PINGYUAN-FISH', 'ping_yuan', 'Bãi Cá Vịnh Bột Hải', 'Bohai Fishing Grounds', 'FISH', 'COM-FISH-FRESH', 'Cá Tươi Bột Hải', 2, 5, 14, 'Bãi cá ven vịnh Bột Hải, ngư dân dùng lưới và thuyền nhỏ đánh bắt quanh năm.'),
        ('NODE-XIAPI-FISH', 'xia_pi', 'Bến Cá Nghi Thủy', 'Yishui Fishing Bank', 'FISH', 'COM-FISH-FRESH', 'Cá Tươi Nghi Thủy', 3, 6, 16, 'Bến sông Nghi Thủy đông ngư hộ, cá tươi và tôm được bán ở chợ Từ Châu.'),
        ('NODE-SHOUCHUN-FISH', 'shou_chun', 'Bãi Cá Sông Hoài', 'Huai River Fishing Grounds', 'FISH', 'COM-FISH-FRESH', 'Cá Tươi Sông Hoài', 3, 7, 16, 'Vùng nước sông Hoài trù phú, ngư dân và thương thuyền cùng khai thác.'),
        ('NODE-WAN-FISH', 'wan_cheng', 'Dục Thủy Ngư Trường', 'Yushui Fishing Grounds', 'FISH', 'COM-FISH-FRESH', 'Cá Tươi Dục Thủy', 2, 5, 14, 'Khúc sông Dục Thủy chảy qua Nam Dương, nơi ngư hộ địa phương đặt lờ và lưới.'),
        ('NODE-JIANGLING-FISH', 'jiang_ling', 'Trường Giang Ngư Bãi', 'Yangtze Fishing Bank', 'FISH', 'COM-FISH-FRESH', 'Cá Tươi Trường Giang', 3, 6, 15, 'Bãi cá trên dòng Trường Giang, nguồn thủy sản nuôi sống thủy quân và dân cảng.'),
        ('NODE-JIANYE-FISH', 'jian_ye', 'Thái Hồ Ngư Trường', 'Taihu Fishing Grounds', 'FISH', 'COM-FISH-FRESH', 'Cá Tươi Thái Hồ', 4, 7, 15, 'Thái Hồ mênh mông, ngư dân Giang Đông đánh bắt cá và tôm nổi tiếng.'),
        ('NODE-CHIBI-FISH', 'chi_bi', 'Ba Khâu Ngư Trại', 'Baqiu Fishing Camp', 'FISH', 'COM-FISH-FRESH', 'Cá Tươi Ba Khâu', 2, 5, 14, 'Bến cá dưới chân vách đá Xích Bích, nơi thủy quân và ngư dân cùng neo đậu.'),
        ('NODE-JIAOZHI-FISH', 'jiao_zhi', 'Hải Cảng Phiên Ngung', 'Panyu Fishing Harbour', 'FISH', 'COM-FISH-FRESH', 'Hải Sản Lĩnh Nam', 2, 5, 14, 'Hải cảng Phiên Ngung, ngư dân Lĩnh Nam đánh bắt cá và hải sản ven bờ.'),
        ('NODE-JICHENG-GAME', 'ji_cheng', 'Săn Trường Bạch Mã', 'White Horse Hunting Grounds', 'GAME', 'COM-GAME-MEAT', 'Thịt Thú Bắc Cương', 2, 4, 18, 'Rừng núi biên cương phương Bắc, nơi kỵ binh Bạch Mã luyện săn và thu da thú.'),
        ('NODE-HANZHONG-GAME', 'han_zhong', 'Săn Trường Tần Lĩnh', 'Qinling Hunting Grounds', 'GAME', 'COM-GAME-MEAT', 'Thịt Thú Tần Lĩnh', 2, 5, 18, 'Sườn núi Tần Lĩnh hiểm trở, thú rừng và dược liệu quý cùng sinh sống.'),
        ('NODE-SHANGDANG-MINE', 'shang_dang', 'Mỏ Sắt Thái Hành', 'Taihang Iron Mine', 'MINERAL', 'RAW-IRON-ORE', 'Quặng Sắt Thái Hành', 3, 6, 20, 'Mỏ sắt trong dãy Thái Hành, nguồn quặng cho binh khí Tịnh Châu.'),
        ('NODE-JIAOZHI-HERB', 'jiao_zhi', 'Rừng Trầm Hương Lĩnh Nam', 'Lingnan Agarwood Forest', 'HERB', 'RAW-HERB-WILD', 'Dược Liệu Lĩnh Nam', 2, 5, 16, 'Rừng nhiệt đới Lĩnh Nam, nơi có trầm hương và nhiều loại thảo dược quý.');
    `);
  }

  private seedGatheringNodes(): void {
    const seedSql = `
      INSERT OR REPLACE INTO gathering_nodes (node_id, settlement_id, name_vi, name_en, resource_type, yield_item_code, yield_item_name_vi, yield_quantity_min, yield_quantity_max, fatigue_cost, description_vi) VALUES
      ('NODE-ZHUO-MINE', 'zhuo_xian', 'Mỏ Quặng Sắt Tây Sơn', 'Zhuo Iron Mine', 'MINERAL', 'RAW-IRON-ORE', 'Quặng Sắt Thô Sơn Mạch', 2.0, 5.0, 15, 'Mạch đá lộ thiên chân núi Tây Sơn thuộc Trác Quận, nguồn quặng sắt dồi dào để luyện thép đúc đao thương.'),
      ('NODE-ZHUO-HERB', 'zhuo_xian', 'Thung Lũng Dược Thảo Đào Viên', 'Peach Garden Herb Vale', 'HERB', 'RAW-HERB-WILD', 'Thảo Dược Rừng Tươi', 3.0, 6.0, 12, 'Khu rừng rậm ẩm ướt phía sau trang viên Vườn Đào, mọc nhiều tam thất hoang, xuyên khung và ngải thảo cầm máu.'),
      ('NODE-JICHENG-WOOD', 'ji_cheng', 'Rừng Thiết Mộc Kế Thành', 'Jicheng Ironwood Forest', 'TIMBER', 'RAW-TIMBER-OAK', 'Gỗ Sồi Cổ Thụ Quân Nhu', 2.0, 4.0, 18, 'Rừng già biên cương phương Bắc, thân cây cứng chắc ngâm nước không mục, dùng chế tác khung xe và cán thương dài.'),
      ('NODE-GUANGZONG-SULFUR', 'guang_zong', 'Hang Khoáng Lưu Huỳnh Cự Lộc', 'Guangzong Sulfur Cavern', 'MINERAL', 'RAW-SULFUR', 'Lưu Huỳnh Mạch Đá', 1.0, 3.0, 20, 'Hang động đá vôi hiểm trở, đọng nhiều lưu huỳnh màu vàng rực, nguyên liệu luyện đan và làm hỏa công của Hoàng Cân.'),
      ('NODE-LUOYANG-CINNABAR', 'luo_yang', 'Mỏ Chu Sa Mang Sơn Đế Đô', 'Luoyang Cinnabar Vein', 'MINERAL', 'RAW-CINNABAR', 'Chu Sa Đỏ Luyện Đan', 1.0, 2.0, 25, 'Vỉa đá đỏ son quý giá trên núi Mang Sơn, các phương sĩ Lạc Dương thường tìm kiếm để luyện kim đơn diên thọ.'),
      ('NODE-PINGYUAN-SALT', 'ping_yuan', 'Bãi Nấu Muối Duyên Hải', 'Pingyuan Coastal Salt Flats', 'SALT_WELL', 'COM-SALT-SEA', 'Muối Hạt Biển Từ Châu', 3.0, 8.0, 14, 'Ruộng muối duyên hải Thanh Châu, dân phu dùng chảo lớn chưng cất nước biển lấy muối hạt trắng tinh khiết.'),
      ('NODE-CHENGDU-HERB', 'cheng_du', 'Dược Lĩnh Nga Mi Sơn', 'Emei Mountain Medicine Ridge', 'HERB', 'RAW-HERB-WILD', 'Thảo Dược Rừng Tươi', 4.0, 8.0, 16, 'Địa linh Ba Thục quanh năm mây mù, sinh trưởng vô số kỳ hoa dị thảo quý giá bậc nhất thiên hạ.');
    `;
    this.db.execute(seedSql);
  }

  private seedInitialProfessions(): void {
    const seedSql = `
      INSERT OR REPLACE INTO character_professions (character_id, profession_code, profession_name_vi, profession_name_en, category, tier, current_exp, max_exp, is_primary) VALUES
      ('PLY-0001', 'PROF_CRAFTSMAN', 'Thợ Đan Dệt & Chế Tác Khí Giới', 'Textile & Shield Craftsman', 'CRAFTING', 2, 45, 100, 1),
      ('PLY-0001', 'PROF_MERCHANT', 'Hành Thương Trù Vận', 'Caravan Merchant', 'COMMERCE', 2, 60, 100, 0),
      ('PLY-0001', 'PROF_MINER', 'Khai Khoáng & Luyện Quặng', 'Miner & Smelter', 'GATHERING', 1, 30, 80, 0),
      ('PLY-0001', 'PROF_HERBALIST', 'Thái Dược & Biện Thảo', 'Herbalist & Forager', 'GATHERING', 1, 35, 80, 0),
      ('NPC-0007', 'PROF_BLACKSMITH', 'Đại Sư Rèn Đúc & Luyện Cương', 'Master Blacksmith', 'CRAFTING', 3, 85, 150, 1),
      ('NPC-0007', 'PROF_MINER', 'Khai Khoáng Đãi Quặng', 'Quarry & Miner', 'GATHERING', 2, 40, 100, 0),
      ('NPC-0008', 'PROF_CARPENTER', 'Đại Quản Lý Mộc Công', 'Master Carpenter', 'CRAFTING', 3, 70, 150, 1),
      ('NPC-0009', 'PROF_HERBALIST', 'Thái Dược Thảo Dân', 'Herbal Forager', 'GATHERING', 2, 50, 100, 1),
      ('NPC-0010', 'PROF_CARPENTER', 'Thợ Mộc Khí Giới', 'Woodcraft Artisan', 'CRAFTING', 2, 40, 100, 1);
    `;
    this.db.execute(seedSql);
  }

  /**
   * Retrieves all gathering spots on the map with their live stock and rule.
   */
  public getGatheringNodes(settlementId?: string): GatheringNode[] {
    const resources = ResourceNodeService.forDatabase(this.db);
    const today = getGameDate(this.db);
    return resources.listNodes(settlementId).map(row => {
      const rule = resources.getRule(row.resource_type);
      const stock = rule ? resources.getStock(row.node_id, rule, today) : null;
      return {
        nodeId: row.node_id,
        settlementId: row.settlement_id,
        nameVi: row.name_vi,
        nameEn: row.name_en,
        resourceType: row.resource_type,
        yieldItemCode: row.yield_item_code,
        yieldItemNameVi: row.yield_item_name_vi,
        yieldQuantityMin: Number(row.yield_quantity_min),
        yieldQuantityMax: Number(row.yield_quantity_max),
        fatigueCost: Number(row.fatigue_cost),
        requiredSkillCode: row.required_skill_code || null,
        descriptionVi: row.description_vi,
        stock: stock?.stock ?? null,
        maxStock: stock?.maxStock ?? null,
        skillCode: row.rule_skill_code || null,
        requiredToolCode: row.rule_tool_code || null,
        alternateToolCode: row.rule_alt_tool_code || null,
        minSkillTier: Number(row.min_skill_tier || 0),
        restoreItemCode: rule?.restoreItemCode || null,
        restoreCash: rule?.restoreCash || 0,
        restoreStock: rule?.restoreStock || 0,
        restoreSkillCode: rule?.restoreSkillCode || null
      } as GatheringNode;
    });
  }

  /**
   * Retrieves all professions learned by a character
   */
  public getCharacterProfessions(characterId: string): CharacterProfessionState[] {
    const sql = `
      SELECT 
        character_id as characterId,
        profession_code as professionCode,
        profession_name_vi as professionNameVi,
        profession_name_en as professionNameEn,
        category,
        tier,
        current_exp as currentExp,
        max_exp as maxExp,
        is_primary as isPrimary,
        unlocked_at as unlockedAt
      FROM character_professions
      WHERE character_id = ?
      ORDER BY is_primary DESC, tier DESC;
    `;
    const rows = this.db.query<any>(sql, [characterId]);
    return rows.map(r => ({
      ...r,
      isPrimary: Boolean(r.isPrimary)
    }));
  }

  /**
   * Action: Gather resources at a specific node (Khai Mỏ, Hái Thuốc, Đốn Củi...)
   */
  private normalizeLocationName(name: string): string {
    return name
      .replace(/\s*\(.*?\)/g, '')
      .replace(/\s*&.*/g, '')
      .replace(/Kinh Đô\s*/g, '')
      .replace(/Tây Đô\s*/g, '')
      .trim()
      .toLowerCase();
  }

  private resolvePlayerSettlementId(): string | null {
    const player = this.db.queryOne<{ current_location: string }>(
      `SELECT current_location FROM player_state WHERE player_id = 'PLY-0001';`
    );
    const location = player && player.current_location;
    if (!location) return null;

    const aliases: Record<string, string> = {
      'Vườn Đào': 'zhuo_xian',
      'Chợ Đông Môn': 'zhuo_xian',
      'Chợ Đông Môn & Sạp Trà': 'zhuo_xian',
      'Thiết Điếm Trác Huyện': 'zhuo_xian',
      'Tửu Quán Trác Huyện': 'zhuo_xian',
      'Lôi Đài Giáo Trường': 'zhuo_xian',
      'Mã Xa Dịch Trạm': 'zhuo_xian',
      'Xưởng Lương Thị': 'zhuo_xian'
    };
    if (aliases[location]) return aliases[location];

    const masterRows = this.db.query<{ name_vi: string; sub_locations: string }>(
      `SELECT name_vi, sub_locations FROM master_locations;`
    );
    const master = masterRows.find(row => {
      if (row.name_vi === location) return true;
      try {
        const subLocations = JSON.parse(row.sub_locations || '[]');
        return Array.isArray(subLocations) && subLocations.includes(location);
      } catch {
        return false;
      }
    });
    if (!master) return null;

    const targetName = this.normalizeLocationName(master.name_vi);
    const settlements = this.db.query<{ settlement_id: string; name_vi: string }>(
      `SELECT settlement_id, name_vi FROM session_settlements;`
    );
    const match = settlements.find(settlement => this.normalizeLocationName(settlement.name_vi) === targetName);
    return match ? match.settlement_id : null;
  }

  public gatherResource(characterId: string, nodeId: string, turnNumber = 6, gameDate = '184-05-01'): any {
    const node = this.db.queryOne<any>(`SELECT * FROM gathering_nodes WHERE node_id = ?;`, [nodeId]);
    if (!node) {
      throw new Error(`Điểm thu thập ${nodeId} không tồn tại trên sa bàn.`);
    }

    // Spatial grounding: a character can only work resources in the settlement
    // they are currently standing in.
    if (characterId === 'PLY-0001') {
      const currentSettlement = this.resolvePlayerSettlementId();
      if (currentSettlement && node.settlement_id !== currentSettlement) {
        const currentName = this.db.queryOne<{ name_vi: string }>(
          'SELECT name_vi FROM session_settlements WHERE settlement_id = ?;',
          [currentSettlement]
        )?.name_vi || currentSettlement;
        const nodeName = this.db.queryOne<{ name_vi: string }>(
          'SELECT name_vi FROM session_settlements WHERE settlement_id = ?;',
          [node.settlement_id]
        )?.name_vi || node.settlement_id;
        throw new Error(`Bạn đang ở ${currentName}, không thể khai thác ${node.name_vi} tại ${nodeName}. Hãy đi tới đúng địa phương trước.`);
      }
    }

    // Determine corresponding profession category
    const profCodeMap: Record<string, string> = {
      MINERAL: 'PROF_MINER',
      HERB: 'PROF_HERBALIST',
      TIMBER: 'PROF_CARPENTER',
      SALT_WELL: 'PROF_SALT_MAKER',
      FARM: 'PROF_FARMER',
      FISH: 'PROF_FISHER',
      GAME: 'PROF_HUNTER'
    };
    const profCode = profCodeMap[node.resource_type] || 'PROF_MINER';

    // Get character profession tier
    const prof = this.db.queryOne<any>(
      `SELECT * FROM character_professions WHERE character_id = ? AND profession_code = ?;`,
      [characterId, profCode]
    );

    const tier = prof ? prof.tier : 1;
    const resources = ResourceNodeService.forDatabase(this.db);
    const rule = resources.getRule(node.resource_type);
    const requiredSkill = node.required_skill_code || rule?.skillCode || PROFESSION_SKILL[profCode] || 'SKL-LOG-PROV';
    const skillTier = resources.skillTier(requiredSkill);
    const minSkillTier = Math.max(Number(rule?.minSkillTier || 0), node.required_skill_code ? 1 : 0);
    if (minSkillTier > 0 && skillTier < minSkillTier) {
      throw new Error(
        `Cần kỹ năng ${requiredSkill} bậc ${minSkillTier} để khai thác ${node.name_vi} (hiện tại bậc ${skillTier}).`
      );
    }

    // Tools are not consumed by the check; the successful gather consumes one
    // use (nets/traps are consumed, axes/picks/hoes/bows wear down).
    let chosenTool = rule?.requiredToolCode || null;
    let toolStatus = chosenTool ? resources.toolStatus(characterId, chosenTool) : null;
    if (chosenTool && toolStatus && !toolStatus.available && rule?.alternateToolCode) {
      const alternate = resources.toolStatus(characterId, rule.alternateToolCode);
      if (alternate?.available) {
        chosenTool = rule.alternateToolCode;
        toolStatus = alternate;
      }
    }
    const hasRequiredTool = toolStatus ? toolStatus.available : true;
    const toolMultiplier = hasRequiredTool ? 1 : 0.7;

    // Profession tier is the broad ladder; the specialised skill is the
    // personal ladder. Both are capped so a single resource cannot run away.
    const professionBonus = 1.0 + (tier - 1) * 0.15;
    const skillBonus = 1.0 + Math.min(0.30, skillTier * 0.06);

    // Calculate yield (conservation-safe integer or float)
    const stockBefore = rule
      ? resources.getStock(nodeId, rule, gameDate)
      : null;
    if (stockBefore && stockBefore.stock < 1) {
      const error: any = new Error('Điểm khai thác đã cạn kiệt; hãy đợi vài ngày để tài nguyên tái sinh.');
      error.code = 'NODE_EXHAUSTED';
      throw error;
    }

    // Check player fatigue only after the node is known to be available, so a
    // failed gather never spends stamina.
    if (characterId === 'PLY-0001') {
      const player = this.db.queryOne<any>(`SELECT fatigue, health FROM player_state WHERE player_id = 'PLY-0001';`);
      if (player && player.fatigue + node.fatigue_cost > 90) {
        throw new Error(`Khí lực kiệt quệ (${player.fatigue}/100)! Cần nghỉ ngơi ẩm trà hoặc dưỡng sức trước khi tiếp tục lên núi khai thác.`);
      }
      this.db.execute(`UPDATE player_state SET fatigue = MIN(100, fatigue + ?) WHERE player_id = 'PLY-0001';`, [node.fatigue_cost]);
    }

    const baseYield = node.yield_quantity_min + RngService.forDomain(this.db, 'gathering').nextFloat() * (node.yield_quantity_max - node.yield_quantity_min);
    const rawYield = baseYield * professionBonus * skillBonus * toolMultiplier;
    const totalYield = Math.round(Math.min(rawYield, baseYield * 2.2) * 10) / 10;
    const variant = resources.pickVariant(node.resource_type, skillTier, gameDate);
    const requestedYield = Math.round(totalYield * Number(variant?.quantityMultiplier || 1) * 10) / 10;
    const yieldItemCode = variant?.itemCode || node.yield_item_code;
    const yieldItem = this.db.queryOne<any>(
      'SELECT name_vi, category FROM master_items WHERE item_code = ? LIMIT 1;',
      [yieldItemCode]
    );
    const byproductCode = variant?.byproductItemCode || null;
    const byproductItem = byproductCode
      ? this.db.queryOne<any>('SELECT name_vi, category FROM master_items WHERE item_code = ? LIMIT 1;', [byproductCode])
      : null;

    const expGain = 25;
    let upgradedTier = tier;
    let expMsg = `+${expGain} EXP nghề ${node.resource_type}`;

    let newExp = 0;
    let newMaxExp = 0;
    if (prof) {
      newExp = prof.current_exp + expGain;
      newMaxExp = prof.max_exp;
      if (newExp >= prof.max_exp && prof.tier < 5) {
        newExp = newExp - prof.max_exp;
        upgradedTier = prof.tier + 1;
        newMaxExp = Math.round(prof.max_exp * 1.5);
        expMsg = `[ĐỘT PHÁ] Đột phá cảnh giới nghề lên Bậc ${upgradedTier}! (${newExp}/${newMaxExp} EXP)`;
      }
    }

    const profNameMap: Record<string, { vi: string; en: string }> = {
      PROF_MINER: { vi: 'Khai Khoáng & Luyện Quặng', en: 'Miner & Smelter' },
      PROF_HERBALIST: { vi: 'Thái Dược & Biện Thảo', en: 'Herbalist & Forager' },
      PROF_CARPENTER: { vi: 'Mộc Công Khí Cụ', en: 'Woodcraft Artisan' },
      PROF_SALT_MAKER: { vi: 'Chử Hải Chế Diêm', en: 'Salt Boiler' },
      PROF_FARMER: { vi: 'Nông Phu Canh Tác', en: 'Farmer' },
      PROF_FISHER: { vi: 'Ngư Hộ Đánh Bắt', en: 'Fisher' },
      PROF_HUNTER: { vi: 'Sơn Tiêu Săn Bắn', en: 'Hunter' }
    };
    const names = profNameMap[profCode] || { vi: 'Bách Nghệ Khai Mở', en: 'Artisan' };
    if (!prof) {
      expMsg = `[NHẬP MÔN] Bắt đầu nhập môn nghề mới: ${names.vi}! (+${expGain} EXP)`;
    }

    const movId = nextId(this.db, 'stock-movements', 'MOV-GATH', getGameDate(this.db));
    let actualYield = requestedYield;
    let byproductYield = 0;
    let stockRemaining = stockBefore ? stockBefore.stock : null;
    let toolUse: any = null;

    this.db.transaction(() => {
      // 0. Consume node stock first so an exhausted node cannot add inventory.
      if (rule) {
        const consumed = resources.consume(nodeId, rule, requestedYield, gameDate);
        actualYield = consumed.taken;
        stockRemaining = consumed.stock;
      }
      if (actualYield <= 0) {
        const error: any = new Error('Điểm khai thác đã cạn kiệt; hãy đợi vài ngày để tài nguyên tái sinh.');
        error.code = 'NODE_EXHAUSTED';
        throw error;
      }

      // 0b. A successful gather consumes one tool use.
      if (chosenTool && hasRequiredTool) {
        toolUse = resources.consumeTool(characterId, chosenTool, gameDate);
      }

      // 1. Physically deposit into inventory_items (Safe conservation)
      const category = yieldItem?.category || 'RAW_MATERIAL';
      const itemName = yieldItem?.name_vi || yieldItemCode;
      this.db.execute(`
        INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
        VALUES (?, ?, ?, ?, 10, ?)
        ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + excluded.quantity;
      `, [yieldItemCode, category, itemName, actualYield, `Kho ${node.settlement_id}`]);

      // 2. Log stock movement
      this.db.execute(`
        INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
        VALUES (
          ?, 
          ?, 
          ?, 
          'GATHERING_HARVEST', 
          ?, 
          10, 
          (SELECT quantity FROM inventory_items WHERE item_code = ?), 
          ?
        );
      `, [movId, gameDate, yieldItemCode, actualYield, yieldItemCode, nodeId]);

      // 2b. Byproduct (hide, roe, antler) scales with the actual harvest.
      if (byproductCode && Number(variant?.byproductQuantity || 0) > 0) {
        byproductYield = Math.round(
          Number(variant?.byproductQuantity || 0) * (actualYield / Math.max(0.1, requestedYield)) * 10
        ) / 10;
        if (byproductYield > 0) {
          const byproductMovementId = nextId(this.db, 'stock-movements', 'MOV-GATH', getGameDate(this.db));
          this.db.execute(`
            INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
            VALUES (?, ?, ?, ?, 5, ?)
            ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + excluded.quantity;
          `, [
            byproductCode,
            byproductItem?.category || 'RAW_MATERIAL',
            byproductItem?.name_vi || byproductCode,
            byproductYield,
            `Kho ${node.settlement_id}`
          ]);
          this.db.execute(`
            INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
            VALUES (?, ?, ?, 'GATHERING_BYPRODUCT', ?, 5,
                    (SELECT quantity FROM inventory_items WHERE item_code = ?), ?);
          `, [byproductMovementId, gameDate, byproductCode, byproductYield, byproductCode, nodeId]);
        }
      }

      // 3. Award Profession EXP and check tier upgrade
      if (prof) {
        this.db.execute(`
          UPDATE character_professions 
          SET tier = ?, current_exp = ?, max_exp = ?
          WHERE character_id = ? AND profession_code = ?;
        `, [upgradedTier, newExp, newMaxExp, characterId, profCode]);
      } else {
        this.db.execute(`
          INSERT INTO character_professions (character_id, profession_code, profession_name_vi, profession_name_en, category, tier, current_exp, max_exp, is_primary)
          VALUES (?, ?, ?, ?, 'GATHERING', 1, ?, 80, 0);
        `, [characterId, profCode, names.vi, names.en, expGain]);
      }
    });

    // Profession work also feeds the specialised livelihood skill.
    try {
      SkillService.forDatabase(this.db).awardExp(requiredSkill, expGain);
    } catch {
      // A missing master skill must not roll back the harvest.
    }

    // 4. Check for Emergent Breakthrough Synthesis
    const breakthrough = this.checkAndTriggerBreakthrough(characterId, turnNumber, gameDate);

    // 5. Synchronize projection to game/PROGRESS.md to maintain zero-drift audit invariant
    syncProgressProjection(this.db);

    return {
      success: true,
      nodeId,
      nodeName: node.name_vi,
      itemCode: yieldItemCode,
      itemName: yieldItem?.name_vi || yieldItemCode,
      yieldQuantity: actualYield,
      variant: variant
        ? {
          variantId: variant.variantId,
          quality: variant.quality,
          quantityMultiplier: variant.quantityMultiplier
        }
        : null,
      byproductItemCode: byproductCode,
      byproductQuantity: byproductYield,
      fatigueCost: node.fatigue_cost,
      expGained: expGain,
      professionTier: upgradedTier,
      expMessage: expMsg,
      skillCode: requiredSkill,
      skillTier,
      professionBonus: Number(professionBonus.toFixed(2)),
      skillBonus: Number(skillBonus.toFixed(2)),
      toolMultiplier,
      toolCode: chosenTool,
      toolMissing: !hasRequiredTool,
      toolKind: toolStatus?.kind || null,
      toolUsesLeft: toolUse?.usesLeft ?? toolStatus?.usesLeft ?? null,
      toolBroke: Boolean(toolUse?.broke),
      stockRemaining,
      breakthrough: breakthrough || null
    };
  }

  /**
   * Checks cross-disciplinary conditions to synthesize and invent novel professions
   */
  public checkAndTriggerBreakthrough(characterId: string, turnNumber = 6, gameDate = '184-05-01'): EmergentInnovation | null {
    const profs = this.getCharacterProfessions(characterId);
    const profMap = new Map<string, number>();
    profs.forEach(p => profMap.set(p.professionCode, p.tier));

    const existingRows = this.db.query<{ profession_code: string }>(
      `SELECT profession_code FROM emergent_innovations WHERE character_id = ?;`,
      [characterId]
    );
    const existingInnovations = new Set<string>(existingRows.map(r => r.profession_code));

    // Breakthrough Condition 1: Daoist Alchemist & Pyrotechnic Artisan
    // Condition: Miner Tier >= 2 AND Herbalist >= 2
    if (!existingInnovations.has('EMERGENT_DAOIST_ALCHEMIST')) {
      const minerTier = profMap.get('PROF_MINER') || 0;
      const herbTier = profMap.get('PROF_HERBALIST') || 0;

      if (minerTier >= 2 && herbTier >= 2) {
        const innoId = nextId(this.db, 'innovation', 'INNO-DAO', getGameDate(this.db));
        const titleVi = `Đột Phá Bí Truyền: Sáng Tạo Nghề Phương Thuật Đan Dược Sư!`;
        const narrativeVi = `Nhờ am hiểu sâu sắc về khoáng thạch lưu huỳnh, chu sa và dược tính thảo mộc sơn lâm, bạn đã dung hòa hai đạo lý Khai Khoáng và Thái Dược, sáng tạo ra Đạo Dược Luyện Đan phái. Mở khóa bí kíp điều chế "Hồi Nguyên Hoàn" và hỏa công chiến trường!`;
        const recipes = ['REC-REVIVE-PILL'];
        const statBoosts = { int: 15, dip: 10 };

        this.db.transaction(() => {
          this.db.execute(`
            INSERT INTO character_professions (character_id, profession_code, profession_name_vi, profession_name_en, category, tier, current_exp, max_exp, is_primary)
            VALUES (?, 'EMERGENT_DAOIST_ALCHEMIST', 'Phương Thuật Đan Dược Sư', 'Daoist Pyrotechnic Alchemist', 'EMERGENT_INNOVATION', 1, 0, 200, 0);
          `, [characterId]);

          this.db.execute(`
            INSERT INTO emergent_innovations (innovation_id, character_id, turn_number, game_date, profession_code, title_vi, narrative_vi, unlocked_recipes_json, stat_boosts_json)
            VALUES (?, ?, ?, ?, 'EMERGENT_DAOIST_ALCHEMIST', ?, ?, ?, ?);
          `, [innoId, characterId, turnNumber, gameDate, titleVi, narrativeVi, JSON.stringify(recipes), JSON.stringify(statBoosts)]);
        });

        return {
          innovationId: innoId,
          characterId,
          turnNumber,
          gameDate,
          professionCode: 'EMERGENT_DAOIST_ALCHEMIST',
          titleVi,
          narrativeVi,
          unlockedRecipes: recipes,
          statBoosts
        };
      }
    }

    // Breakthrough Condition 2: Military Trauma Surgeon (Hoa Đà Y Đạo Phái)
    // Condition: Herbalist >= 2 AND Craftsman/Weaving >= 2
    if (!existingInnovations.has('EMERGENT_MILITARY_SURGEON')) {
      const herbTier = profMap.get('PROF_HERBALIST') || 0;
      const craftTier = profMap.get('PROF_CRAFTSMAN') || 0;

      if (herbTier >= 2 && craftTier >= 2) {
        const innoId = nextId(this.db, 'innovation', 'INNO-SURG', getGameDate(this.db));
        const titleVi = `Đột Phá Quân Y: Khai Sáng Nghề Chiến Địa Ngoại Khoa Sư!`;
        const narrativeVi = `Kết hợp sự khéo léo của tay nghề thêu dệt và dược lý cầm máu thảo dược, bạn sáng tạo nên phương pháp khâu vá vết đao thương chiến trận và cao dán trị độc. Binh sĩ dưới trướng giảm thiểu $75\\%$ nguy cơ tử vong do nhiễm trùng!`;
        const recipes = ['REC-TRAUMA-SALVE'];
        const statBoosts = { int: 10, war: 10 };

        this.db.transaction(() => {
          this.db.execute(`
            INSERT INTO character_professions (character_id, profession_code, profession_name_vi, profession_name_en, category, tier, current_exp, max_exp, is_primary)
            VALUES (?, 'EMERGENT_MILITARY_SURGEON', 'Chiến Địa Ngoại Khoa Sư', 'Military Trauma Surgeon', 'EMERGENT_INNOVATION', 1, 0, 200, 0);
          `, [characterId]);

          this.db.execute(`
            INSERT INTO emergent_innovations (innovation_id, character_id, turn_number, game_date, profession_code, title_vi, narrative_vi, unlocked_recipes_json, stat_boosts_json)
            VALUES (?, ?, ?, ?, 'EMERGENT_MILITARY_SURGEON', ?, ?, ?, ?);
          `, [innoId, characterId, turnNumber, gameDate, titleVi, narrativeVi, JSON.stringify(recipes), JSON.stringify(statBoosts)]);
        });

        return {
          innovationId: innoId,
          characterId,
          turnNumber,
          gameDate,
          professionCode: 'EMERGENT_MILITARY_SURGEON',
          titleVi,
          narrativeVi,
          unlockedRecipes: recipes,
          statBoosts
        };
      }
    }

    return null;
  }

  /**
   * Retrieves all historical emergent innovations discovered in session
   */
  public getInnovations(characterId?: string): EmergentInnovation[] {
    const filter = characterId ? `WHERE character_id = ?` : '';
    const params = characterId ? [characterId] : [];
    const sql = `
      SELECT 
        innovation_id as innovationId,
        character_id as characterId,
        turn_number as turnNumber,
        game_date as gameDate,
        profession_code as professionCode,
        title_vi as titleVi,
        narrative_vi as narrativeVi,
        unlocked_recipes_json as unlockedRecipes,
        stat_boosts_json as statBoosts
      FROM emergent_innovations
      ${filter}
      ORDER BY created_at DESC;
    `;
    const rows = this.db.query<any>(sql, params);
    return rows.map(r => ({
      ...r,
      unlockedRecipes: typeof r.unlockedRecipes === 'string' ? JSON.parse(r.unlockedRecipes || '[]') : r.unlockedRecipes,
      statBoosts: typeof r.statBoosts === 'string' ? JSON.parse(r.statBoosts || '{}') : r.statBoosts
    }));
  }
}
