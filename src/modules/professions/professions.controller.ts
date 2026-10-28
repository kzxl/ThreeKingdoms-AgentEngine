/**
 * ThreeKingdoms-AgentEngine: Professions Controller (src/modules/professions/professions.controller.ts)
 * Exposes REST APIs for ancient crafts, resource gathering, recipe manufacturing,
 * and emergent cross-disciplinary paradigm-shift breakthroughs.
 *
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import { DatabaseService } from '../../core/database';
import { ModuleRegistry } from '../../core/module-registry';
import { ProfessionsModule } from './professions.module';

function getProfessionsModule(): ProfessionsModule | undefined {
  const gsm = (globalThis as any).__GRAND_STRATEGY_MODULES__;
  if (gsm?.professions) return gsm.professions as ProfessionsModule;
  return ModuleRegistry.getInstance().get<ProfessionsModule>('module.professions');
}

function getDb(): DatabaseService {
  return DatabaseService.getInstance();
}

function getCampaignMeta(db: DatabaseService): { activeTurn: number; currentDate: string } {
  try {
    const row = db.queryOne<{ active_turn: number; current_date: string }>(
      'SELECT active_turn, current_date FROM campaign_meta LIMIT 1;'
    );
    if (row) return { activeTurn: row.active_turn, currentDate: row.current_date };
  } catch {
    // fallback
  }
  return { activeTurn: 6, currentDate: '184-05-01' };
}

/**
 * Registers all Professions module routes into the provided Router instance.
 */
export function registerProfessionsRoutes(router: Router): void {
  const db = getDb();

  // -------------------------------------------------------------
  // 1. GET /api/professions & /api/professions/character
  // -------------------------------------------------------------
  const handleGetProfessions = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = (ctx.query.characterId as string) || 'PLY-0001';
      const professionsMod = getProfessionsModule();

      const professions = professionsMod
        ? professionsMod.getCharacterProfessions(characterId)
        : db.query<any>(
            `SELECT 
              character_id as characterId,
              profession_code as professionCode,
              profession_name_vi as professionNameVi,
              profession_name_en as professionNameEn,
              category,
              tier,
              current_exp as currentExp,
              max_exp as maxExp,
              is_primary as isPrimary
            FROM character_professions 
            WHERE character_id = ? 
            ORDER BY is_primary DESC, tier DESC;`,
            [characterId]
          );

      const player = db.queryOne<any>(
        'SELECT cra_attr, fatigue, health FROM player_state WHERE player_id = ?;',
        [characterId]
      );

      const innovations = professionsMod
        ? professionsMod.getInnovations(characterId)
        : db.query<any>('SELECT * FROM emergent_innovations WHERE character_id = ?;', [characterId]);

      sendJson(res, 200, {
        success: true,
        characterId,
        craftProwess: player?.cra_attr || 50,
        fatigue: player?.fatigue || 0,
        health: player?.health || 100,
        professions,
        innovations
      });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/professions', handleGetProfessions);
  router.get('/api/professions/character', handleGetProfessions);

  // -------------------------------------------------------------
  // 2. GET /api/professions/nodes
  // -------------------------------------------------------------
  const handleGetNodes = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const settlementId = ctx.query.settlementId as string | undefined;
      const professionsMod = getProfessionsModule();

      const nodes = professionsMod
        ? professionsMod.getGatheringNodes(settlementId)
        : db.query<any>(
            `SELECT 
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
              description_vi as descriptionVi
            FROM gathering_nodes 
            ${settlementId ? 'WHERE settlement_id = ?' : ''} 
            ORDER BY settlement_id, resource_type;`,
            settlementId ? [settlementId] : []
          );

      sendJson(res, 200, { success: true, count: nodes.length, nodes });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/professions/nodes', handleGetNodes);

  // -------------------------------------------------------------
  // 3. POST /api/professions/gather
  // -------------------------------------------------------------
  const handleGather = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const { characterId = 'PLY-0001', nodeId } = ctx.body || {};

      if (!nodeId) {
        sendJson(res, 400, { success: false, error: 'nodeId is required.' });
        return;
      }

      const professionsMod = getProfessionsModule();
      if (!professionsMod) {
        sendJson(res, 500, { success: false, error: 'ProfessionsModule not initialized.' });
        return;
      }

      const meta = getCampaignMeta(db);
      const result = professionsMod.gatherResource(characterId, nodeId, meta.activeTurn, meta.currentDate);

      sendJson(res, 200, { success: true, result });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/professions/gather', handleGather);

  // -------------------------------------------------------------
  // 4. POST /api/professions/craft
  // -------------------------------------------------------------
  const handleCraft = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const { characterId = 'PLY-0001', recipeCode, quantity = 1 } = ctx.body || {};

      if (!recipeCode) {
        sendJson(res, 400, { success: false, error: 'recipeCode is required.' });
        return;
      }

      const craftQty = Math.max(1, parseInt(quantity, 10));
      const meta = getCampaignMeta(db);

      const craftResult = db.transaction(() => {
        const recipe = db.queryOne<any>('SELECT * FROM master_recipes WHERE recipe_code = ?;', [recipeCode]);
        if (!recipe) {
          throw new Error(`Recipe ${recipeCode} not found in master catalog.`);
        }

        const player = db.queryOne<any>('SELECT fatigue, cra_attr FROM player_state WHERE player_id = ?;', [characterId]);
        if (player && player.fatigue + 15 * craftQty > 95) {
          throw new Error(`Khí lực kiệt quệ (${player.fatigue}/100)! Không đủ sức đứng lò chế tác khí giới.`);
        }

        // Parse Bill of Materials
        let bomInputs: Array<{ item_code: string; quantity: number }> = [];
        try {
          bomInputs = typeof recipe.bom_inputs === 'string' ? JSON.parse(recipe.bom_inputs) : recipe.bom_inputs;
        } catch {
          bomInputs = [];
        }

        // Validate material sufficiency
        for (const input of bomInputs) {
          const reqQty = input.quantity * craftQty;
          const stock = db.queryOne<any>('SELECT quantity FROM inventory_items WHERE item_code = ?;', [input.item_code]);
          if (!stock || stock.quantity < reqQty) {
            throw new Error(`Thiếu nguyên liệu [${input.item_code}]: cần ${reqQty}, hiện có ${stock?.quantity || 0}.`);
          }
        }

        // Deduct materials
        for (const input of bomInputs) {
          const reqQty = input.quantity * craftQty;
          db.execute('UPDATE inventory_items SET quantity = quantity - ? WHERE item_code = ?;', [reqQty, input.item_code]);
          db.execute(
            `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
             VALUES (?, ?, ?, 'PRODUCTION_CONSUME', ?, 10, (SELECT quantity FROM inventory_items WHERE item_code = ?), ?);`,
            [`MOV-CRAFT-${Date.now()}`, meta.currentDate, input.item_code, reqQty, input.item_code, recipeCode]
          );
        }

        // Defect calculation based on Craft attribute
        const defectChance = Math.max(0.02, recipe.base_defect_rate - ((player?.cra_attr || 50) / 1000));
        const defects = Math.random() < defectChance ? 1 : 0;
        const finalYield = Math.max(1, craftQty - defects);

        // Add crafted product to inventory
        db.execute(
          `INSERT INTO inventory_items (item_code, category, description, quantity, unit_cost_basis, location)
           VALUES (?, ?, ?, ?, 35, 'Zhuo Workshop')
           ON CONFLICT(item_code) DO UPDATE SET quantity = quantity + ?;`,
          [recipe.product_item_code, recipe.category, recipe.product_name_vi, finalYield, finalYield]
        );

        db.execute(
          `INSERT INTO stock_movements (mov_id, game_date, item_code, movement_type, quantity, unit_cost, balance_after, ref_txn)
           VALUES (?, ?, ?, 'PRODUCTION_OUTPUT', ?, 35, (SELECT quantity FROM inventory_items WHERE item_code = ?), ?);`,
          [`MOV-CRAFT-OUT-${Date.now()}`, meta.currentDate, recipe.product_item_code, finalYield, recipe.product_item_code, recipeCode]
        );

        // Update fatigue
        const fatigueCost = 15 * craftQty;
        db.execute('UPDATE player_state SET fatigue = MIN(100, fatigue + ?) WHERE player_id = ?;', [fatigueCost, characterId]);

        // Award EXP to Crafting profession
        const expGain = 30 * craftQty;
        db.execute(
          `UPDATE character_professions 
           SET current_exp = current_exp + ? 
           WHERE character_id = ? AND category = 'CRAFTING';`,
          [expGain, characterId]
        );

        return {
          recipeCode,
          productItemCode: recipe.product_item_code,
          productNameVi: recipe.product_name_vi,
          productNameEn: recipe.product_name_en,
          orderedQuantity: craftQty,
          yieldQuantity: finalYield,
          defects,
          fatigueCost,
          expGained: expGain,
          materialsConsumed: bomInputs.map((b) => ({ itemCode: b.item_code, quantity: b.quantity * craftQty }))
        };
      });

      // Check for Emergent Innovation trigger
      const professionsMod = getProfessionsModule();
      const breakthrough = professionsMod ? professionsMod.checkAndTriggerBreakthrough(characterId, meta.activeTurn, meta.currentDate) : null;

      sendJson(res, 200, {
        success: true,
        ...craftResult,
        breakthrough,
        message: `Chế tác thành công ${craftResult.yieldQuantity} ${craftResult.productNameVi} (+${craftResult.expGained} EXP Nghề rèn dệt)!`
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/professions/craft', handleCraft);

  // -------------------------------------------------------------
  // 5. POST /api/professions/paradigm-shift & /api/professions/synthesize
  // -------------------------------------------------------------
  const handleParadigmShift = async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const { characterId = 'PLY-0001' } = ctx.body || {};
      const professionsMod = getProfessionsModule();
      if (!professionsMod) {
        sendJson(res, 500, { success: false, error: 'ProfessionsModule not initialized.' });
        return;
      }

      const meta = getCampaignMeta(db);
      const innovation = professionsMod.checkAndTriggerBreakthrough(characterId, meta.activeTurn, meta.currentDate);

      sendJson(res, 200, {
        success: true,
        characterId,
        breakthrough: innovation || null,
        message: innovation
          ? `🌟 Đại ngộ cảnh giới! Bạn đã sáng tạo thành công nghề mới: ${innovation.titleVi}!`
          : 'Chưa đủ điều kiện giác ngộ đột phá đa ngành (Cần tối thiểu 2 nghề khác nhau đạt Bậc 2 trở lên).'
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/professions/paradigm-shift', handleParadigmShift);
  router.post('/api/professions/synthesize', handleParadigmShift);

  // -------------------------------------------------------------
  // 6. GET /api/professions/innovations
  // -------------------------------------------------------------
  router.get('/api/professions/innovations', async (_req: any, res: any, ctx: RouteContext) => {
    try {
      const characterId = ctx.query.characterId as string | undefined;
      const professionsMod = getProfessionsModule();

      const innovations = professionsMod
        ? professionsMod.getInnovations(characterId)
        : db.query<any>(
            `SELECT * FROM emergent_innovations ${characterId ? 'WHERE character_id = ?' : ''} ORDER BY created_at DESC;`,
            characterId ? [characterId] : []
          );

      sendJson(res, 200, { success: true, count: innovations.length, innovations });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });
}
