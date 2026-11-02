/**
 * Migration 063: durable tool repair.
 *
 * Consumable nets/traps are bought again; axes, picks, hoes and bows can be
 * repaired instead of replaced. The cost and skill gate live on `tool_rules`.
 */

const REPAIRS = [
  { code: 'TOOL-AXE', cash: 15, skill: 'SKL-CRA-SMITH', tier: 1 },
  { code: 'TOOL-PICK', cash: 15, skill: 'SKL-CRA-SMITH', tier: 1 },
  { code: 'TOOL-HOE', cash: 10, skill: 'SKL-CRA-SMITH', tier: 1 },
  { code: 'TOOL-BOW', cash: 12, skill: 'SKL-CRA-WEAVE', tier: 1 }
];

module.exports = {
  id: '063-tool-repair',
  description: 'Add repair cost and skill gate for durable tools',
  up(db) {
    const hasRules = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='tool_rules'"
    ).get();
    if (!hasRules) return;
    const columns = db.prepare('PRAGMA table_info(tool_rules);').all().map(row => row.name);
    for (const [name, type] of [
      ['repair_cash', 'INTEGER NOT NULL DEFAULT 0'],
      ['repair_skill_code', 'TEXT'],
      ['repair_min_tier', 'INTEGER NOT NULL DEFAULT 0']
    ]) {
      if (!columns.includes(name)) db.exec(`ALTER TABLE tool_rules ADD COLUMN ${name} ${type};`);
    }
    const update = db.prepare(
      'UPDATE tool_rules SET repair_cash = ?, repair_skill_code = ?, repair_min_tier = ? WHERE item_code = ?;'
    );
    for (const row of REPAIRS) update.run(row.cash, row.skill, row.tier, row.code);
    console.log(`      ${REPAIRS.length} tool repair rules seeded`);
  }
};
