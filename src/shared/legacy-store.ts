/**
 * ThreeKingdoms-AgentEngine: Profile Legacy Store
 * (src/shared/legacy-store.ts)
 *
 * `campaign_legacy` lives inside a session database, so a brand-new instance
 * cloned from the clean template would never see it. The profile file keeps the
 * best finished campaign at the machine level so NG+ carries across instances.
 */

import fs from 'fs';
import path from 'path';

export interface ProfileLegacy {
  campaignId: string;
  generation: number;
  fame: number;
  netWorth: number;
  settlements: number;
  outcome: 'VICTORIOUS' | 'DEFEATED';
  titleVi?: string;
  savedAt?: string;
}

function legacyPath(): string {
  return process.env.SIM_LEGACY_PATH
    || path.resolve(process.cwd(), 'saves', 'legacy.json');
}

export function readProfileLegacy(): ProfileLegacy | null {
  try {
    const file = legacyPath();
    if (!fs.existsSync(file)) return null;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      campaignId: String(parsed.campaignId || 'CMP-UNKNOWN'),
      generation: Number(parsed.generation || 1),
      fame: Number(parsed.fame || 0),
      netWorth: Number(parsed.netWorth || 0),
      settlements: Number(parsed.settlements || 0),
      outcome: parsed.outcome === 'DEFEATED' ? 'DEFEATED' : 'VICTORIOUS',
      titleVi: parsed.titleVi ? String(parsed.titleVi) : undefined,
      savedAt: parsed.savedAt ? String(parsed.savedAt) : undefined
    };
  } catch {
    return null;
  }
}

function isBetter(candidate: ProfileLegacy, current: ProfileLegacy | null): boolean {
  if (!current) return true;
  if (candidate.outcome === 'VICTORIOUS' && current.outcome !== 'VICTORIOUS') return true;
  if (candidate.outcome !== 'VICTORIOUS' && current.outcome === 'VICTORIOUS') return false;
  return candidate.netWorth > current.netWorth;
}

/** Keeps the strongest campaign; never downgrades a victory to a defeat. */
export function writeProfileLegacy(record: ProfileLegacy): void {
  try {
    if (!isBetter(record, readProfileLegacy())) return;
    const file = legacyPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ ...record, savedAt: new Date().toISOString() }, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  } catch (error) {
    console.warn('[legacy] profile write failed:', (error as Error).message);
  }
}
