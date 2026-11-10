// App versions: the one-off `1.0.0` baseline, then CalVer `YYYY.M.N` (N counts releases in a
// month, no leading zeros so it stays valid semver), with `-rc.N` for previews. Pure module.
import type { Brand } from '#lib/domain/types.js';

export type AppVersion = Brand<string, 'AppVersion'>;

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  /** Release-candidate number, or null for a final release. */
  rc: number | null;
}

const VERSION = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-rc\.([1-9]\d*))?$/u;

export function parseVersion(value: string): ParsedVersion | null {
  const match = VERSION.exec(value.trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), rc: match[4] ? Number(match[4]) : null };
}

export function isAppVersion(value: unknown): value is AppVersion {
  return typeof value === 'string' && parseVersion(value) !== null && !value.startsWith('v');
}

export function appVersion(value: string): AppVersion {
  const parsed = parseVersion(value);
  if (!parsed) throw new Error(`Not a version: ${value}`);
  return formatVersion(parsed);
}

export function formatVersion(version: ParsedVersion): AppVersion {
  return `${version.major}.${version.minor}.${version.patch}${version.rc ? `-rc.${version.rc}` : ''}` as AppVersion;
}

/** Negative when a < b, positive when a > b; a release candidate sorts before its release. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) throw new Error(`Cannot compare ${a} and ${b}`);
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch
    || (left.rc ?? Infinity) - (right.rc ?? Infinity) || 0;
}

/** The next CalVer for `now`: one more than the final releases already tagged in that month. */
export function nextCalVer(now: Date, tags: readonly string[]): AppVersion {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  let count = 0;
  for (const tag of tags) {
    const parsed = parseVersion(tag);
    if (parsed && parsed.rc === null && parsed.major === year && parsed.minor === month) count = Math.max(count, parsed.patch);
  }
  return formatVersion({ major: year, minor: month, patch: count + 1, rc: null });
}
