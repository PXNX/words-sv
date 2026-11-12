// Parses CHANGELOG.md (maintained by scripts/release.ts) into typed releases for the version
// history sheet (app/ChangelogSheet.svelte). Only tagged versions are returned; the "Unreleased"
// section is skipped.
import { compareVersions, isAppVersion, type AppVersion } from './version.js';

export const CHANGE_TYPES = ['new', 'improved', 'fixed', 'migration', 'known'] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

const HEADINGS: Record<string, ChangeType> = {
  new: 'new', added: 'new', neu: 'new',
  improved: 'improved', changed: 'improved', verbessert: 'improved',
  fixed: 'fixed', behoben: 'fixed',
  migration: 'migration', breaking: 'migration', 'migration / breaking': 'migration',
  'known issues': 'known', 'bekannte probleme': 'known'
};

export interface ChangelogRelease {
  version: AppVersion;
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  /** One-line English summary; the localised highlight lives in the message files. */
  summary: string;
  entries: Partial<Record<ChangeType, string[]>>;
}

export class ChangelogError extends Error {}

const RELEASE_HEADING = /^## \[?v?([^\]\s]+)\]?\s+[-–—]\s+(\d{4}-\d{2}-\d{2})\s*$/u;

export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let current: ChangelogRelease | null = null;
  let section: ChangeType | null = null;
  let skipping = false;
  for (const [index, raw] of markdown.split(/\r?\n/u).entries()) {
    const line = raw.trimEnd();
    const at = `line ${index + 1}`;
    if (line.startsWith('## ')) {
      section = null;
      if (/^## \[?unreleased\]?/iu.test(line)) {
        current = null;
        skipping = true;
        continue;
      }
      const match = RELEASE_HEADING.exec(line);
      if (!match || !isAppVersion(match[1]) || Number.isNaN(Date.parse(match[2]!))) throw new ChangelogError(`${at}: expected "## vMAJOR.MINOR.PATCH - YYYY-MM-DD", got "${line}"`);
      skipping = false;
      current = { version: match[1], date: match[2]!, summary: '', entries: {} };
      releases.push(current);
    } else if (skipping || !current) {
      continue;
    } else if (line.startsWith('### ')) {
      const type = HEADINGS[line.slice(4).trim().toLowerCase()];
      if (!type) throw new ChangelogError(`${at}: unknown section "${line.slice(4).trim()}"`);
      section = type;
    } else if (/^[-*] /u.test(line)) {
      if (!section) throw new ChangelogError(`${at}: entry outside a section`);
      (current.entries[section] ??= []).push(line.slice(2).trim());
    } else if (line.trim() && !section && !current.summary) {
      current.summary = line.trim();
    }
  }
  const versions = releases.map((release) => release.version);
  if (new Set(versions).size !== versions.length) throw new ChangelogError('duplicate release heading');
  return releases.sort((a, b) => compareVersions(b.version, a.version));
}

const COMMIT = /^(\w+)(?:\([^)]*\))?(!)?:\s*(.+)$/u;

/**
 * Changelog entries from Conventional Commit subjects: `feat` → new, `fix` → fixed, a `!` marks a
 * breaking change (migration). docs, chore, refactor, test, ci, style and build stay internal.
 */
export function commitEntries(subjects: readonly string[]): Partial<Record<ChangeType, string[]>> {
  const entries: Partial<Record<ChangeType, string[]>> = {};
  for (const subject of subjects) {
    const match = COMMIT.exec(subject.trim());
    if (!match) continue;
    const [, kind, breaking, text] = match;
    const type: ChangeType | null = breaking ? 'migration' : kind === 'feat' ? 'new' : kind === 'fix' ? 'fixed' : null;
    if (!type) continue;
    const entry = text!.charAt(0).toLocaleUpperCase('en') + text!.slice(1).replace(/\.$/u, '');
    if (!entries[type]?.includes(entry)) (entries[type] ??= []).push(entry);
  }
  return entries;
}

/** Markdown sections (### New, ### Fixed …) for entries, in the canonical order. */
export function entriesMarkdown(entries: Partial<Record<ChangeType, string[]>>): string {
  const headings: Record<ChangeType, string> = { new: 'New', improved: 'Improved', fixed: 'Fixed', migration: 'Migration', known: 'Known issues' };
  return CHANGE_TYPES.filter((type) => entries[type]?.length)
    .map((type) => `### ${headings[type]}\n${entries[type]!.map((entry) => `- ${entry}`).join('\n')}`)
    .join('\n\n');
}

/** Releases newer than the last one the learner has opened the page for. */
export function unseenReleases(releases: readonly ChangelogRelease[], lastSeen: string | null): ChangelogRelease[] {
  if (!lastSeen || !isAppVersion(lastSeen)) return [...releases];
  return releases.filter((release) => compareVersions(release.version, lastSeen) > 0);
}

/** Anchor id for a release, e.g. `v1.2.0`. */
export function releaseAnchor(version: AppVersion): string {
  return `v${version}`;
}

/** Message key of a release's localised highlight, e.g. `changelog_v1_2_0`. */
export function highlightKey(version: AppVersion): string {
  return `changelog_v${version.replace(/[^0-9a-z]+/gu, '_')}`;
}
