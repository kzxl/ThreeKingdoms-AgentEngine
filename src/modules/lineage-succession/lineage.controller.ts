/**
 * ThreeKingdoms-AgentEngine: Family Lineage & Dynastic Succession Controller
 * (src/modules/lineage-succession/lineage.controller.ts)
 *
 * Exposes REST APIs for:
 * - Family Overview & Genealogical Tree Status
 * - Courtship Candidates & Betrothal Dowry Proposals
 * - Household Cohabitation & Role Assignments
 * - Pregnancy Tick & Childbirth Simulation
 * - Historical Master Mentorship (Lu Zhi, Guan Yu, Zhang Fei, Zhang Shiping, Chen Bao)
 * - Dynastic Succession Execution & Identity Handover
 *
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import { Router, sendJson, RouteContext } from '../../server/router';
import {
  FamilyLineageService,
  ProposeMarriageParams,
  BirthChildParams,
  AssignMentorParams,
  HouseholdRole,
  ChildGrowthFocus
} from './family-lineage.service';

export function registerLineageRoutes(router: Router): void {
  const service = FamilyLineageService.getInstance();

  /**
   * 1. GET /api/lineage/overview & GET /api/lineage/status
   * Retrieves complete family overview: clan profile, spouses, children, tree, ancestors.
   */
  const handleGetOverview = (req: any, res: any, _ctx: RouteContext) => {
    try {
      const overview = service.getFamilyOverview();
      sendJson(res, 200, { success: true, overview });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/lineage/overview', handleGetOverview);
  router.get('/api/lineage/status', handleGetOverview);

  /**
   * 2. GET /api/lineage/courtship-candidates
   * Lists prominent heroines with intimacy, dowry requirements, and maternal traits.
   */
  const handleGetCourtshipCandidates = (req: any, res: any, _ctx: RouteContext) => {
    try {
      const candidates = service.getCourtshipCandidates();
      sendJson(res, 200, { success: true, count: candidates.length, candidates });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.get('/api/lineage/courtship-candidates', handleGetCourtshipCandidates);

  /**
   * 3. POST /api/lineage/courtship & POST /api/lineage/courtship/propose
   * Proposes marriage with cashflow and double-entry dowry accounting.
   */
  const handleProposeMarriage = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const params: ProposeMarriageParams = {
        playerId: body.playerId || 'PLY-0001',
        spouseNpcId: body.spouseNpcId || body.wifeNpcId,
        wifeNpcId: body.wifeNpcId || body.spouseNpcId,
        dowryCash: Number(body.dowryCash) || 0,
        dowryItems: body.dowryItems || []
      };

      const result = service.proposeMarriage(params);
      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/lineage/courtship', handleProposeMarriage);
  router.post('/api/lineage/courtship/propose', handleProposeMarriage);

  /**
   * 4. POST /api/lineage/household/set-role
   * Assigns household management role to spouse.
   */
  const handleSetRole = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const marriageId = body.marriageId;
      const role = body.role as HouseholdRole;

      if (!marriageId || !role) {
        sendJson(res, 400, { success: false, error: 'Thiếu marriageId hoặc role' });
        return;
      }

      service.assignHouseholdRole(marriageId, role);
      sendJson(res, 200, {
        success: true,
        message: `Đã phân bổ chức vụ [${role}] cho hôn phối ${marriageId}.`
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/lineage/household/set-role', handleSetRole);

  /**
   * 5. POST /api/lineage/household/rest
   * Cohabitation resting turn (recovers fatigue, rolls conception).
   */
  const handleRestWithSpouse = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const marriageId = body.marriageId;

      if (!marriageId) {
        sendJson(res, 400, { success: false, error: 'Thiếu marriageId' });
        return;
      }

      const result = service.restWithSpouse(marriageId);
      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/lineage/household/rest', handleRestWithSpouse);

  /**
   * 6. POST /api/lineage/pregnancy/tick
   * Advances gestation turn for pregnant spouses.
   */
  const handlePregnancyTick = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      service.advancePregnancyTick(body.turn, body.gameDate);
      sendJson(res, 200, { success: true, message: 'Đã tiến chuyển chu kỳ thai nghén.' });
    } catch (err: any) {
      sendJson(res, 500, { success: false, error: err.message });
    }
  };

  router.post('/api/lineage/pregnancy/tick', handlePregnancyTick);

  /**
   * 7. POST /api/lineage/children/birth
   * Triggers childbirth with genetic inheritance and maternal perks.
   */
  const handleBirthChild = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const motherId = body.motherId;

      if (!motherId) {
        sendJson(res, 400, { success: false, error: 'Thiếu motherId' });
        return;
      }

      const params: BirthChildParams = {
        motherId,
        customName: body.customName,
        gender: body.gender
      };

      const result = service.birthChild(params);
      sendJson(res, 200, { success: true, ...result });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/lineage/children/birth', handleBirthChild);

  /**
   * 8. POST /api/lineage/children/set-focus
   * Sets child upbringing growth focus (Warfare, Intellect, Commerce, Balanced).
   */
  const handleSetGrowthFocus = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const childId = body.childId;
      const focus = body.focus as ChildGrowthFocus;

      if (!childId || !focus) {
        sendJson(res, 400, { success: false, error: 'Thiếu childId hoặc focus' });
        return;
      }

      service.setChildGrowthFocus(childId, focus);
      sendJson(res, 200, {
        success: true,
        message: `Đã thiết lập định hướng tu dưỡng [${focus}] cho hài nhi.`
      });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/lineage/children/set-focus', handleSetGrowthFocus);

  /**
   * 9. POST /api/lineage/mentor & POST /api/lineage/children/assign-mentor
   * Assigns child to historical master mentor.
   */
  const handleAssignMentor = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const childId = body.childId;
      const mentorNpcId = body.mentorNpcId;

      if (!childId || !mentorNpcId) {
        sendJson(res, 400, { success: false, error: 'Thiếu childId hoặc mentorNpcId' });
        return;
      }

      const params: AssignMentorParams = { childId, mentorNpcId };
      const result = service.assignMasterMentor(params);
      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/lineage/mentor', handleAssignMentor);
  router.post('/api/lineage/children/assign-mentor', handleAssignMentor);

  /**
   * 10. POST /api/lineage/children/mentorship-turn
   * Executes a mentorship session granting stat and EXP growth.
   */
  const handleMentorshipTurn = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const childId = body.childId;

      if (!childId) {
        sendJson(res, 400, { success: false, error: 'Thiếu childId' });
        return;
      }

      const result = service.executeMentorshipTurn(childId);
      sendJson(res, 200, { success: true, ...result });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/lineage/children/mentorship-turn', handleMentorshipTurn);

  /**
   * 11. POST /api/lineage/children/designate-heir
   * Designates primary heir for succession.
   */
  const handleDesignateHeir = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const childId = body.childId;

      if (!childId) {
        sendJson(res, 400, { success: false, error: 'Thiếu childId' });
        return;
      }

      service.designateHeir(childId);
      sendJson(res, 200, { success: true, message: `Đã sắc phong Thế Tử kế thừa gia nghiệp.` });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/lineage/children/designate-heir', handleDesignateHeir);

  /**
   * 12. POST /api/lineage/children/age
   * Advances child age (supports developmental stage transitions).
   */
  const handleAgeChild = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const childId = body.childId;
      const years = Number(body.years) || 1;

      if (!childId) {
        sendJson(res, 400, { success: false, error: 'Thiếu childId' });
        return;
      }

      service.ageChild(childId, years);
      sendJson(res, 200, { success: true, message: `Đã tăng niên kỷ cho hài nhi thêm ${years} tuổi.` });
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/lineage/children/age', handleAgeChild);

  /**
   * 13. POST /api/lineage/succeed & POST /api/lineage/succession/execute
   * Executes dynastic succession with complete asset continuity and zero audit breakage.
   */
  const handleSuccession = (req: any, res: any, ctx: RouteContext) => {
    try {
      const body = ctx.body || {};
      const heirId = body.heirId || body.heirChildId;

      if (!heirId) {
        sendJson(res, 400, { success: false, error: 'Thiếu heirId / heirChildId' });
        return;
      }

      const result = service.executeSuccession({
        heirId,
        reason: body.reason || 'VOLUNTARY_RETIREMENT'
      });
      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, { success: false, error: err.message });
    }
  };

  router.post('/api/lineage/succeed', handleSuccession);
  router.post('/api/lineage/succession/execute', handleSuccession);
}
