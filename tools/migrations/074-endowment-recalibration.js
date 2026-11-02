/**
 * Migration 074: recalibrate endowments.
 *
 * Migration 073 used garrison-heavy demand that pushed every fish price to the
 * same cap. This pass scales resource supply per node and tames demand so a
 * fishing town is visibly cheaper than an inland city.
 */

module.exports = {
  id: '074-endowment-recalibration',
  description: 'Recalibrate regional supply/demand scores',
  up(db) {
    const has = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='settlement_item_endowment'"
    ).get();
    if (!has) return;
    const settlements = db.prepare(
      'SELECT settlement_id, garrison_troops, agriculture FROM session_settlements;'
    ).all();
    const nodeCounts = new Map();
    for (const row of db.prepare(
      'SELECT settlement_id, resource_type, COUNT(*) AS c FROM gathering_nodes GROUP BY settlement_id, resource_type;'
    ).all()) {
      nodeCounts.set(`${row.settlement_id}:${row.resource_type}`, Number(row.c || 0));
    }
    const countFor = (id, type) => nodeCounts.get(`${id}:${type}`) || 0;
    const update = db.prepare(`
      UPDATE settlement_item_endowment
      SET supply_score = ?, demand_score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE settlement_id = ? AND item_code = ?;
    `);

    for (const settlement of settlements) {
      const garrison = Number(settlement.garrison_troops || 0);
      const agriculture = Number(settlement.agriculture || 50);
      const baseDemand = 40 + garrison * 0.02;
      const rows = [
        ['COM-GRAIN', agriculture * 3 + countFor(settlement.settlement_id, 'FARM') * 40, baseDemand + 60 - agriculture * 0.4],
        ['COM-FISH-FRESH', countFor(settlement.settlement_id, 'FISH') * 100, baseDemand + 30],
        ['COM-GAME-MEAT', countFor(settlement.settlement_id, 'GAME') * 100, baseDemand + 10],
        ['COM-MEAT', countFor(settlement.settlement_id, 'GAME') * 40 + countFor(settlement.settlement_id, 'FARM') * 10, baseDemand + 15],
        ['COM-SALT', countFor(settlement.settlement_id, 'SALT_WELL') * 100 + countFor(settlement.settlement_id, 'FISH') * 5, baseDemand + 10],
        ['RAW-TIMBER-OAK', countFor(settlement.settlement_id, 'TIMBER') * 100, baseDemand + 5]
      ];
      for (const [itemCode, supply, demand] of rows) {
        update.run(Math.max(0, supply), Math.max(20, demand), settlement.settlement_id, itemCode);
      }
    }
  }
};
