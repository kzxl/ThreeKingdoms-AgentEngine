/**
 * Business monthly economics — one pure settlement function shared by the month
 * close and its tests.
 *
 * A business earns only when staffed: output scales with the staff actually
 * assigned against the roster it says it operates. Wages and rent are real
 * costs, and a loss is carried as debt instead of being clamped to zero.
 *
 * `engine/workshop-engine.js` keeps the production-batch path (materials, BOM,
 * defect rate) and marks the month settled so this passive path never charges
 * the same wages twice.
 */

const TIER_BASE_REVENUE = 260;
const PER_WORKER_REVENUE = 25;

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

/**
 * Settles one business month.
 *
 * Inputs are plain rows from `businesses` and `npc_state` (assigned staff).
 * Output is deterministic and side-effect free; the caller writes the SQL.
 */
function settleBusinessMonth(business = {}, staff = []) {
  const workers = Array.isArray(staff) ? staff : [];
  const tier = Math.max(1, Math.round(toNumber(business.tier, 1)));
  const efficiency = Math.max(0, toNumber(business.efficiency_multiplier, 1));
  const staffCount = workers.length;
  const roster = Math.max(1, Math.round(toNumber(business.current_workforce, 1)));
  // No staff means the workshop is closed; understaffing scales output down.
  const staffingRatio = staffCount === 0 ? 0 : Math.min(1, staffCount / roster);

  const grossIncome = Math.round(
    (tier * TIER_BASE_REVENUE * efficiency + staffCount * PER_WORKER_REVENUE) * staffingRatio
  );
  const totalWages = workers.reduce((sum, worker) => sum + Math.max(0, toNumber(worker.monthly_wage)), 0);
  const rent = Math.max(0, toNumber(business.monthly_rent));
  const netProfit = grossIncome - totalWages - rent;

  const openingSafe = Math.max(0, toNumber(business.safe_cash));
  const openingDebt = Math.max(0, toNumber(business.debt));
  let safeCash = openingSafe;
  let debt = openingDebt;

  if (netProfit >= 0) {
    // Profit pays the debt first; only the remainder reaches the safe.
    const repayment = Math.min(debt, netProfit);
    debt -= repayment;
    safeCash += netProfit - repayment;
  } else {
    // Loss consumes the safe, then becomes debt. Nothing is forgiven.
    const loss = -netProfit;
    const absorbed = Math.min(safeCash, loss);
    safeCash -= absorbed;
    debt += loss - absorbed;
  }

  return {
    tier,
    staffCount,
    roster,
    staffingRatio: Number(staffingRatio.toFixed(3)),
    grossIncome,
    totalWages,
    rent,
    netProfit,
    safeCash,
    debt,
    insolvent: debt > 0
  };
}

/**
 * Coarse health label for reports and UI: a business in debt is distressed,
 * a zero-staff one is closed, otherwise it is operating.
 */
function businessHealth(settlement) {
  if (!settlement || settlement.staffCount === 0) return 'CLOSED';
  if (settlement.debt > 0) return 'DISTRESSED';
  if (settlement.netProfit < 0) return 'LOSS';
  return 'PROFITABLE';
}

module.exports = {
  TIER_BASE_REVENUE,
  PER_WORKER_REVENUE,
  settleBusinessMonth,
  businessHealth
};
