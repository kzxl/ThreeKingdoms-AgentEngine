/**
 * Migration 072: alternate resource tools.
 *
 * A hunting ground accepts a trap or a bow, so the bow recipe/repair has a real
 * use without weakening the trap identity. Future nodes can add alternatives
 * as data.
 */

module.exports = {
  id: '072-alternate-tool',
  description: 'Add alternate tool support for resource nodes',
  up(db) {
    const has = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='resource_node_rules'"
    ).get();
    if (!has) return;
    const columns = db.prepare('PRAGMA table_info(resource_node_rules);').all().map(row => row.name);
    if (!columns.includes('alternate_tool_code')) {
      db.exec('ALTER TABLE resource_node_rules ADD COLUMN alternate_tool_code TEXT;');
    }
    db.exec("UPDATE resource_node_rules SET alternate_tool_code = 'TOOL-BOW' WHERE resource_type = 'GAME';");
  }
};
