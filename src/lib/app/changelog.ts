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

/** A single bullet, tagged with the Conventional Commit scope it came from (null when unscoped). */
export interface ChangeEntry {
  text: string;
  scope: string | null;
}

/** Entries grouped by change type; within each type they are grouped again by scope. */
export type ChangeEntries = Partial<Record<ChangeType, ChangeEntry[]>>;

export interface ChangeScopeGroup {
  scope: string | null;
  entries: string[];
}

export interface ChangelogRelease {
  version: AppVersion;
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  /** One-line English summary, shown as the release's highlight. */
  summary: string;
  entries: ChangeEntries;
}

export class ChangelogError extends Error {}

const RELEASE_HEADING = /^## \[?v?([^\]\s]+)\]?\s+[-–—]\s+(\d{4}-\d{2}-\d{2})\s*$/u;

/** Consecutive entries that share a scope, in first-appearance order (unscoped entries first). */
export function groupByScope(entries: readonly ChangeEntry[]): ChangeScopeGroup[] {
  const groups = new Map<string, ChangeScopeGroup>();
  for (const { scope, text } of entries) {
    const key = scope ?? '';
    let group = groups.get(key);
    if (!group) {
      group = { scope, entries: [] };
      groups.set(key, group);
    }
    group.entries.push(text);
  }
  return [...groups.values()];
}

export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let current: ChangelogRelease | null = null;
  let section: ChangeType | null = null;
  let scope: string | null = null;
  let skipping = false;
  for (const [index, raw] of markdown.split(/\r?\n/u).entries()) {
    const line = raw.trimEnd();
    const at = `line ${index + 1}`;
    if (line.startsWith('## ')) {
      section = null;
      scope = null;
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
      scope = null;
    } else if (line.startsWith('#### ')) {
      if (!section) throw new ChangelogError(`${at}: scope outside a section`);
      const name = line.slice(5).trim();
      if (!name) throw new ChangelogError(`${at}: empty scope`);
      scope = name;
    } else if (/^[-*] /u.test(line)) {
      if (!section) throw new ChangelogError(`${at}: entry outside a section`);
      (current.entries[section] ??= []).push({ scope, text: line.slice(2).trim() });
    } else if (line.trim() && !section && !current.summary) {
      current.summary = line.trim();
    }
  }
  const versions = releases.map((release) => release.version);
  if (new Set(versions).size !== versions.length) throw new ChangelogError('duplicate release heading');
  return releases.sort((a, b) => compareVersions(b.version, a.version));
}

const COMMIT = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/u;

/**
 * Changelog entries from Conventional Commit subjects: `feat(scribble): …` keeps the scope so
 * entries can be grouped by it, `feat`: stays unscoped. `feat` → new, `fix` → fixed, a `!` marks a
 * breaking change (migration). docs, chore, refactor, test, ci, style and build stay internal.
 */
export function commitEntries(subjects: readonly string[]): ChangeEntries {
  const entries: ChangeEntries = {};
  for (const subject of subjects) {
    const match = COMMIT.exec(subject.trim());
    if (!match) continue;
    const [, kind, commitScope, breaking, text] = match;
    const type: ChangeType | null = breaking ? 'migration' : kind === 'feat' ? 'new' : kind === 'fix' ? 'fixed' : null;
    if (!type) continue;
    const scope = commitScope?.trim() || null;
    const entry: ChangeEntry = { scope, text: text!.charAt(0).toLocaleUpperCase('en') + text!.slice(1).replace(/\.$/u, '') };
    const list = (entries[type] ??= []);
    if (!list.some((existing) => existing.scope === entry.scope && existing.text === entry.text)) list.push(entry);
  }
  return entries;
}

/** Markdown sections (### New, #### scribble …) for entries, in the canonical order. */
export function entriesMarkdown(entries: ChangeEntries): string {
  const headings: Record<ChangeType, string> = { new: 'New', improved: 'Improved', fixed: 'Fixed', migration: 'Migration', known: 'Known issues' };
  return CHANGE_TYPES.filter((type) => entries[type]?.length)
    .map((type) => {
      const body = groupByScope(entries[type]!)
        .map(({ scope, entries: texts }) => `${scope ? `#### ${scope}\n` : ''}${texts.map((text) => `- ${text}`).join('\n')}`)
        .join('\n\n');
      return `### ${headings[type]}\n${body}`;
    })
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
