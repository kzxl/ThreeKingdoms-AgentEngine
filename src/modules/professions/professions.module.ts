/**
 * Feature Module: Ancient Professions, Gathering & Emergent Innovation System
 * Implements historical Three Kingdoms commoner professions (Mining, Herbalism, Smithing, Carpentry,
 * Medicine, Salt Boiling, Farming) and cross-disciplinary emergent breakthrough synthesis.
 *
 * Adheres to AgentOption Universe Modular Architecture v4.0.
 */

import path from 'path';
import { execSync } from 'child_process';
import { DatabaseService } from '../../core/database';
import {
  IFeatureModule,
  ModuleContext,
  CharacterId,
  SettlementId,
  CharacterProfessionState,
  GatheringNode,
  EmergentInnovation
} from '../../core/types';

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

    // 2. Seed Initial Professions for Player & Key NPCs if empty
    const profCount = this.db.queryOne<{ count: number }>(`SELECT count(*) as count FROM character_professions;`)?.count || 0;
    if (profCount === 0) {
      this.seedInitialProfessions();
    }
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
   * Retrieves all gathering spots on the map
   */
  public getGatheringNodes(settlementId?: string): GatheringNode[] {
    const filter = settlementId ? `WHERE settlement_id = ?` : '';
    const params = settlementId ? [settlementId] : [];
    const sql = `
      SELECT 
        node_id as nodeId,
        settlement_id as settlementId,
        name_vi as nameVi,
        name_en as nameEn,
        resource_type as resourceType,
        yield_item_code as yieldItemCode,
        yield_item_name_vi as yieldItemNameVi,
        yield_quantity_min as yieldQuantityMin,
        yield_quantity_max as yieldQuantityMax,
        fatigue_cost as fatigueCost,
        required_skill_code as requiredSkillCode,
        description_vi as descriptionVi
      FROM gathering_nodes
      ${filter}
      ORDER BY settlement_id, resource_type;
    `;
    return this.db.query<GatheringNode>(sql, params);
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
  public gatherResource(characterId: string, nodeId: string, turnNumber = 6, gameDate = '184-05-01'): any {
    const node = this.db.queryOne<any>(`SELECT * FROM gathering_nodes WHERE node_id = ?;`, [nodeId]);
    if (!node) {
      throw new Error(`Điểm thu thập ${nodeId} không tồn tại trên sa bàn.`);
    }

    // Check player fatigue if player
    if (characterId === 'PLY-0001') {
      const player = this.db.queryOne<any>(`SELECT fatigue, health FROM player_state WHERE player_id = 'PLY-0001';`);
      if (player && player.fatigue + node.fatigue_cost > 90) {
        throw new Error(`Khí lực kiệt quệ (${player.fatigue}/100)! Cần nghỉ ngơi ẩm trà hoặc dưỡng sức trước khi tiếp tục lên núi khai thác.`);
      }
      this.db.execute(`UPDATE player_state SET fatigue = MIN(100, fatigue + ?) WHERE player_id = 'PLY-0001';`, [node.fatigue_cost]);
    }

    // Determine corresponding profession category
    const profCodeMap: Record<string, string> = {
      MINERAL: 'PROF_MINER',
      HERB: 'PROF_HERBALIST',
      TIMBER: 'PROF_CARPENTER',
      SALT_WELL: 'PROF_SALT_MAKER'
    };
    const profCode = profCodeMap[node.resource_type] || 'PROF_MINER';

    // Get character profession tier
    const prof = this.db.queryOne<any>(
      `SELECT * FROM character_professions WHERE character_id = ? AND profession_code = ?;`,
      [characterId, profCode]
    );

    const tier = prof ? prof.tier : 1;
    const tierBonus = 1.0 + (tier - 1) * 0.25;

    // Calculate yield (conservation-safe integer or float)
    const baseYield = node.yield_quantity_min + Math.random() * (node.yield_quantity_max - node.yield_quantity_min);
    const totalYield = Math.round(baseYield * tierBonus * 10) / 10;

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
      PROF_SALT_MAKER: { vi: 'Chử Hải Chế Diêm', en: 'Salt Boiler' }
    };
    const names = profNameMap[profCode] || { vi: 'Bách Nghệ Khai Mở', en: 'Artisan' };
    if (!prof) {
      expMsg = `[NHẬP MÔN] Bắt đầu nhập môn nghề mới: ${names.vi}! (+${expGain} EXP)`;
    }

    const movId = `MOV-GATH-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;

    this.db.transaction(() => {
      // 1. Physically deposit into inventory_items (Safe conservation)
      this.db.execute(`
        INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
        VALUES (?, 'RAW_MATERIAL', ?, ?, 10, 'Zhuo Workshop')
        ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + excluded.quantity;
      `, [node.yield_item_code, node.yield_item_name_vi, totalYield]);

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
      `, [movId, gameDate, node.yield_item_code, totalYield, node.yield_item_code, nodeId]);

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

    // 4. Check for Emergent Breakthrough Synthesis
    const breakthrough = this.checkAndTriggerBreakthrough(characterId, turnNumber, gameDate);

    // 5. Synchronize projection to game/PROGRESS.md to maintain zero-drift audit invariant
    try {
      const rootDir = path.resolve(__dirname, '../../..');
      execSync(`node "${path.join(rootDir, 'tools', 'sim-db.js')}" export-progress`, { stdio: 'ignore' });
    } catch (e) {}

    return {
      success: true,
      nodeId,
      nodeName: node.name_vi,
      itemCode: node.yield_item_code,
      itemName: node.yield_item_name_vi,
      yieldQuantity: totalYield,
      fatigueCost: node.fatigue_cost,
      expGained: expGain,
      professionTier: upgradedTier,
      expMessage: expMsg,
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
        const innoId = `INNO-DAO-${Date.now()}`;
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
        const innoId = `INNO-SURG-${Date.now()}`;
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
