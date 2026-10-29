/**
 * Migration 006: De-duplicate the story chronicle at the database boundary.
 *
 * Repeated event loops (wage labor, tavern banquets, Zhang Fei's greeting)
 * inserted the exact same line on the same turn/date again and again: the live
 * session reached 39 rows for 14 distinct texts. Collapsing at render time
 * hides the bad rows but leaves the ledger bloated and makes any count-based
 * report wrong, so the guard belongs at insert time.
 *
 * 1. Collapse existing rows, keeping the earliest occurrence per
 *    (game_date, turn_number, speaker, text).
 * 2. Install a BEFORE INSERT trigger that silently skips an identical row.
 */

module.exports = {
  id: '006-dedupe-chat-chronicle',
  description: 'Collapse duplicate chronicle rows and block identical re-inserts',
  up(db) {
    const table = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='chat_chronicle'")
      .get();
    if (!table) {
      console.log('      (chat_chronicle absent — nothing to dedupe)');
      return;
    }

    const before = db.prepare('SELECT COUNT(*) AS c FROM chat_chronicle').get().c;
    db.prepare(`
      DELETE FROM chat_chronicle
      WHERE rowid NOT IN (
        SELECT MIN(rowid)
        FROM chat_chronicle
        GROUP BY game_date, turn_number, IFNULL(speaker, ''), text
      );
    `).run();
    const after = db.prepare('SELECT COUNT(*) AS c FROM chat_chronicle').get().c;

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_chat_chronicle_dedupe
      BEFORE INSERT ON chat_chronicle
      FOR EACH ROW
      WHEN EXISTS (
        SELECT 1 FROM chat_chronicle existing
        WHERE existing.game_date = NEW.game_date
          AND existing.turn_number = NEW.turn_number
          AND IFNULL(existing.speaker, '') = IFNULL(NEW.speaker, '')
          AND existing.text = NEW.text
      )
      BEGIN
        SELECT RAISE(IGNORE);
      END;
    `);

    console.log(`      chronicle rows ${before} -> ${after}; duplicate-insert guard installed`);
  }
};
