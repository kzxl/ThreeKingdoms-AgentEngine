/**
 * Migration 007: Distinguish player-dispatched caravans from faction caravans.
 *
 * Arrival used to settle every caravan to its owner faction (`SUCCESS_TRADED`)
 * while `claimCaravan()` also accepted that status and paid the player, so the
 * same cargo could pay twice. Claim must be limited to caravans the player
 * actually dispatched; those are the only ones that stop at `ARRIVED`.
 *
 * Existing dispatched rows use the `CRV-*` identifier produced by
 * `nextId(db, 'caravan', 'CRV', ...)`. Seed caravans use `CARAVAN-*`.
 */

module.exports = {
  id: '007-caravan-player-ownership',
  description: 'Add dispatched_by_player, backfill player caravans, keep settled rows terminal',
  up(db) {
    const table = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='trade_caravans'")
      .get();
    if (!table) {
      console.log('      (trade_caravans absent — nothing to migrate)');
      return;
    }

    const columns = db.prepare('PRAGMA table_info(trade_caravans)').all().map(c => c.name);
    if (!columns.includes('dispatched_by_player')) {
      db.exec('ALTER TABLE trade_caravans ADD COLUMN dispatched_by_player INTEGER NOT NULL DEFAULT 0;');
    }

    const backfilled = db
      .prepare("UPDATE trade_caravans SET dispatched_by_player = 1 WHERE caravan_id LIKE 'CRV-%'")
      .run().changes;

    // Already-settled rows stay terminal: converting them to ARRIVED would let
    // the player claim cargo the faction treasury already paid for.
    const settled = db
      .prepare("SELECT COUNT(*) AS c FROM trade_caravans WHERE status = 'SUCCESS_TRADED'")
      .get().c;

    console.log(
      `      dispatched_by_player added; ${backfilled} player caravans backfilled; ` +
      `${settled} SUCCESS_TRADED rows remain terminal (faction-settled)`
    );
  }
};
