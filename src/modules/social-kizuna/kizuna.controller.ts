/**
 * ThreeKingdoms-AgentEngine: Social Kizuna & Fog of Information Controller
 * (src/modules/social-kizuna/kizuna.controller.ts)
 *
 * Exposes REST APIs for:
 * - NPC Strategic Dossier with Progressive Fog of Information
 * - Daily Life Social Interactions (Drink, Converse, Spar, Learn, Gift)
 * - D20 Probabilistic Attribute Check and Relationship Deltas
 *
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import { DailyInteractionEngine, EverydayActionType } from './daily-interaction.engine';
import { DatabaseService } from '../../core/database';

export function registerKizunaRoutes(router: Router): void {
  const engine = DailyInteractionEngine.getInstance();
  const db = DatabaseService.getInstance();

  /**
   * 1. GET /api/kizuna/dossier/:npcId
   * Retrieves full strategic dossier under Fog of Information
   */
  const handleGetDossier = (req: any, res: any, ctx: RouteContext) => {
    try {
      const npcId = ctx.params.npcId;
      if (!npcId) {
        sendJson(res, 400, { success: false, error: 'Missing npcId parameter' });
        return;
      }

      const dossier = engine.getNpcDossier(npcId);
      sendJson(res, 200, { success: true, dossier });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/kizuna/dossier/:npcId', handleGetDossier);
  router.get('/api/npc/dossier/:npcId', handleGetDossier);

  /**
   * 2. GET /api/kizuna/characters
   * Lists prominent characters in current campaign with fog level and sentiment
   */
  const handleGetCharacters = (req: any, res: any, ctx: RouteContext) => {
    try {
      // Fetch characters with active presence
      const chars = db.query<any>(`
        SELECT 
          mc.npc_id as npcId,
          mc.name_vi as nameVi,
          mc.name_en as nameEn,
          mc.style_name_vi as styleNameVi,
          mc.baseline_location as baselineLocation,
          mc.baseline_position_vi as positionVi,
          COALESCE(mrb.baseline_sentiment, 25) as baseSentiment
        FROM master_characters mc
        LEFT JOIN master_relations_baseline mrb ON mc.npc_id = mrb.source_entity_id
        ORDER BY baseSentiment DESC, mc.war_attr DESC
        LIMIT 25;
      `);

      const characterList = chars.map((c: any) => {
        const sentiment = engine.getNpcSentiment(c.npcId);
        const fogTier = engine.calculateFogTier(sentiment.affinity);
        return {
          npcId: c.npcId,
          nameVi: c.nameVi,
          nameEn: c.nameEn,
          styleNameVi: c.styleNameVi,
          positionVi: c.positionVi,
          locationId: c.baselineLocation,
          affinity: sentiment.affinity,
          respect: sentiment.respect,
          relationshipTitleVi: sentiment.titleVi,
          relationshipTitleEn: sentiment.titleEn,
          fogTier,
          avatarChar: c.nameVi.charAt(0)
        };
      });

      sendJson(res, 200, { success: true, count: characterList.length, characters: characterList });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/kizuna/characters', handleGetCharacters);
  router.get('/api/npcs/overview', handleGetCharacters);

  /**
   * 3. POST /api/kizuna/interact
   * Executes a daily socio-behavioral interaction with D20 dice roll
   */
  const handleInteract = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const npcId = body.npcId;
      const actionType = (body.actionType || 'TEA_CONVERSE') as EverydayActionType;
      const customPrompt = body.prompt || '';
      const itemCode = body.itemCode;

      if (!npcId) {
        sendJson(res, 400, { success: false, error: 'Missing npcId in request body' });
        return;
      }

      const result = engine.executeDailyInteraction(npcId, actionType, customPrompt, itemCode);
      sendJson(res, 200, { success: true, result });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.post('/api/kizuna/interact', handleInteract);

  /**
   * 4. POST /api/kizuna/natural-chat
   * Classifies free-form user chat into everyday action and resolves against target NPC
   */
  const handleNaturalChat = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const npcId = body.npcId || 'NPC-0002'; // Default to Zhang Fei if in Tao Garden
      const prompt = (body.prompt || '').trim();
      const pLower = prompt.toLowerCase();

      let actionType: EverydayActionType = 'TEA_CONVERSE';

      if (
        pLower.includes('rượu') || pLower.includes('uống') || pLower.includes('say') ||
        pLower.includes('chén') || pLower.includes('nhậu') || pLower.includes('ẩm') ||
        pLower.includes('wine') || pLower.includes('drink') || pLower.includes('ale') ||
        pLower.includes('banquet') || pLower.includes('cheers') || pLower.includes('feast') ||
        pLower.includes('toast') || pLower.includes('tavern')
      ) {
        actionType = 'BANQUET_DRINK';
      } else if (
        pLower.includes('so tài') || pLower.includes('tỉ thí') || pLower.includes('đấu') ||
        pLower.includes('mâu') || pLower.includes('kiếm') || pLower.includes('võ') ||
        pLower.includes('thương') || pLower.includes('luyện') || pLower.includes('tập') ||
        pLower.includes('thực chiến') || pLower.includes('binh khí') || pLower.includes('đao') ||
        pLower.includes('cung') || pLower.includes('kích') ||
        pLower.includes('spar') || pLower.includes('duel') || pLower.includes('fight') ||
        pLower.includes('clash') || pLower.includes('martial') || pLower.includes('combat') ||
        pLower.includes('debate') || pLower.includes('challenge') || pLower.includes('train') ||
        pLower.includes('practice')
      ) {
        actionType = 'SPAR_DEBATE';
      } else if (
        pLower.includes('thỉnh giáo') || pLower.includes('chỉ giáo') || pLower.includes('dạy') ||
        pLower.includes('học') || pLower.includes('bái sư') || pLower.includes('mưu') ||
        pLower.includes('mentor') || pLower.includes('teach') || pLower.includes('advice') ||
        pLower.includes('learn') || pLower.includes('guide') || pLower.includes('strategy') ||
        pLower.includes('tactics') || pLower.includes('counsel') || pLower.includes('instruct')
      ) {
        actionType = 'LEARN_MENTOR';
      } else if (
        pLower.includes('tặng') || pLower.includes('biếu') || pLower.includes('gửi ít') ||
        pLower.includes('thưởng') || pLower.includes('quà') ||
        pLower.includes('gift') || pLower.includes('present') || pLower.includes('reward') ||
        pLower.includes('treasure') || pLower.includes('offer') || pLower.includes('tribute')
      ) {
        actionType = 'GIFT_TREASURE';
      } else if (
        pLower.includes('tâm sự') || pLower.includes('chí hướng') || pLower.includes('hoài bão') ||
        pLower.includes('ước nguyện') || pLower.includes('bí mật') ||
        pLower.includes('confide') || pLower.includes('ambition') || pLower.includes('dream') ||
        pLower.includes('aspiration') || pLower.includes('secret') || pLower.includes('heart')
      ) {
        actionType = 'HEART_CONFESSION';
      }

      const result = engine.executeDailyInteraction(npcId, actionType, prompt);
      sendJson(res, 200, { success: true, actionType, result });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.post('/api/kizuna/natural-chat', handleNaturalChat);

  /**
   * 4. GET /api/kizuna/dialogue-stats
   * Telemetry for Dialogue Cache (Hits, Misses, Total Cached)
   */
  router.get('/api/kizuna/dialogue-stats', (req: any, res: any) => {
    try {
      const { ContextDialogueService } = require('./context-dialogue.service');
      const stats = ContextDialogueService.getInstance().getStats();
      sendJson(res, 200, { success: true, stats });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  });
}
