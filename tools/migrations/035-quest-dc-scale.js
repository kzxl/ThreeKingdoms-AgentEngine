/**
 * Migration 035: scale quest DCs to the d20 range.
 *
 * The first seed used DC 45/55/65, which is unreachable with d20 + a small stat
 * modifier. Step 1/2/3 now use 12/15/18.
 */

module.exports = {
  id: '035-quest-dc-scale',
  description: 'Rescale master_quest_steps DC to 12/15/18',
  up(db) {
    const table = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'master_quest_steps';`
    ).get();
    if (!table) {
      console.log('      master_quest_steps absent; nothing to scale');
      return;
    }
    db.exec('UPDATE master_quest_steps SET dc = 12 + step_index * 3;');
    console.log('      quest step DCs rescaled');
  }
};
