// Remembers the newest release the learner has opened the version history for (per device).
import { isAppVersion, type AppVersion } from './version.js';

const LAST_SEEN_KEY = 'wordcircle-changelog-seen-v1';

export function lastSeenVersion(): AppVersion | null {
  try {
    const value = localStorage.getItem(LAST_SEEN_KEY);
    return isAppVersion(value) ? value : null;
  } catch {
    return null;
  }
}

export function markVersionSeen(version: AppVersion) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, version);
  } catch {}
}
