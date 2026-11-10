// What the "What's new" sheet shows after an update: the releases since the last one the learner
// saw, their new features first and the fixes as a count. Pure, so it can be tested.
import { unseenReleases, type ChangelogRelease } from './changelog.js';

export const WHATS_NEW_MAX_FEATURES = 6;

export interface WhatsNew {
  releases: ChangelogRelease[];
  features: string[];
  moreFeatures: number;
  fixes: number;
}

/**
 * null when there is nothing to show: a fresh install (nothing seen, no earlier use) or no newer
 * release. A returning learner who never saw the sheet gets the newest release only.
 */
export function whatsNew(releases: readonly ChangelogRelease[], lastSeen: string | null, returning: boolean): WhatsNew | null {
  const shown = lastSeen ? unseenReleases(releases, lastSeen) : returning ? releases.slice(0, 1) : [];
  if (!shown.length) return null;
  const features = shown.flatMap((release) => release.entries.new ?? []);
  const fixes = shown.reduce((sum, release) => sum + (release.entries.fixed?.length ?? 0), 0);
  if (!features.length && !fixes) return null;
  return { releases: shown, features: features.slice(0, WHATS_NEW_MAX_FEATURES), moreFeatures: Math.max(0, features.length - WHATS_NEW_MAX_FEATURES), fixes };
}
