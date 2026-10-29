/**
 * Migration 002: Repair campaign clock drift.
 *
 * Campaign playthroughs were previously mutated by verification suites that
 * bypassed `SIM_DB_PATH`, and some write paths accepted wall-clock dates
 * (`2026-10-29`) as the in-game date. A clock outside the historical era, or a
 * clock behind the latest completed turn, breaks travel, aging and turn math.
 *
 * This migration snaps `campaign_meta.current_date` to the newest turn_log date
 * when the current value is implausible or behind.
 */

module.exports = {
  id: '002-repair-campaign-clock',
  description: 'Snap campaign_meta.current_date to the latest turn_log date when implausible or behind',
  up(db) {
    const hasMeta = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='campaign_meta'")
      .get();
    if (!hasMeta) {
      console.log('      (campaign_meta table absent — nothing to repair)');
      return;
    }

    const meta = db.prepare('SELECT campaign_id, "current_date", active_turn FROM campaign_meta LIMIT 1').get();
    if (!meta) {
      console.log('      (campaign_meta row absent — nothing to repair)');
      return;
    }

    const hasTurnLog = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='turn_log'")
      .get();
    const lastTurn = hasTurnLog
      ? db.prepare('SELECT game_date FROM turn_log ORDER BY turn_number DESC LIMIT 1').get()
      : null;

    const ordinal = value => {
      const [year, month, day] = String(value || '').split('-').map(Number);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
      if (month < 1 || month > 12 || day < 1 || day > 30) return null;
      return year * 360 + (month - 1) * 30 + (day - 1);
    };

    const currentOrdinal = ordinal(meta.current_date);
    const currentYear = Number(String(meta.current_date || '').split('-')[0]);
    const target = lastTurn && lastTurn.game_date ? lastTurn.game_date : '184-02-01';
    const targetOrdinal = ordinal(target);

    const implausible = currentOrdinal === null || currentYear < 180 || currentYear > 300;
    const behind = currentOrdinal !== null && targetOrdinal !== null && currentOrdinal < targetOrdinal;

    if (!implausible && !behind) {
      console.log(`      (campaign clock ${meta.current_date} is already consistent with turn ${meta.active_turn})`);
      return;
    }

    db.prepare('UPDATE campaign_meta SET current_date = ? WHERE campaign_id = ?').run(target, meta.campaign_id);
    console.log(`      • campaign clock ${meta.current_date} → ${target} (turn ${meta.active_turn})`);
  }
};
