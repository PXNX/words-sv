import { describe, expect, expectTypeOf, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { appVersion, compareVersions, isAppVersion, bumpVersion, latestVersion, parseVersion, type AppVersion } from '../src/lib/app/version';
import { ChangelogError, highlightKey, parseChangelog, releaseAnchor, unseenReleases } from '../src/lib/app/changelog';
import { cutChangelog } from '../scripts/release';

describe('versions', () => {
  it('parses versions and release candidates', () => {
    expect(parseVersion('1.0.0')).toEqual({ major: 1, minor: 0, patch: 0, rc: null });
    expect(parseVersion('v1.2.0-rc.1')).toEqual({ major: 1, minor: 2, patch: 0, rc: 1 });
    expect(parseVersion('1.02.0')).toBeNull();
    expect(isAppVersion('1.1.0')).toBe(true);
    expect(isAppVersion('v1.1.0')).toBe(false);
    expectTypeOf(appVersion('v1.1.0')).toEqualTypeOf<AppVersion>();
    expect(appVersion('v1.1.0')).toBe('1.1.0');
  });

  it('orders versions numerically, candidates before their release', () => {
    const sorted = ['1.10.0', '1.0.0', '1.2.0', '2.0.0', '1.2.0-rc.1'].sort(compareVersions);
    expect(sorted).toEqual(['1.0.0', '1.2.0-rc.1', '1.2.0', '1.10.0', '2.0.0']);
  });

  it('bumps semantic versions from the latest final tag', () => {
    expect(latestVersion([])).toBe('1.0.0');
    expect(latestVersion(['v1.0.0', 'v1.2.0', 'v1.10.1', 'v1.11.0-rc.1', 'nightly'])).toBe('1.10.1');
    expect(bumpVersion('1.10.1', 'minor')).toBe('1.11.0');
    expect(bumpVersion('1.10.1', 'patch')).toBe('1.10.2');
    expect(bumpVersion('1.10.1', 'major')).toBe('2.0.0');
    expect(bumpVersion('1.2.0-rc.2', 'patch')).toBe('1.2.1');
  });
});

const SAMPLE = `# Changelog

## Unreleased

### New
- Work in progress

## v1.1.0 - 2026-11-12

Formatting follows the learned language.

### New
- Format like setting
### Fixed
- Weekday names

## v1.0.0 - 2026-11-10

Baseline.

### New
- Everything
`;

describe('changelog', () => {
  it('lists tagged releases newest first and skips unreleased work', () => {
    const releases = parseChangelog(SAMPLE);
    expect(releases.map((release) => release.version)).toEqual(['1.1.0', '1.0.0']);
    expect(releases[0]).toEqual({ version: '1.1.0', date: '2026-11-12', summary: 'Formatting follows the learned language.', entries: { new: ['Format like setting'], fixed: ['Weekday names'] } });
  });

  it('rejects malformed entries', () => {
    expect(() => parseChangelog('## 2026.11 - 2026-11-12')).toThrow(ChangelogError);
    expect(() => parseChangelog('## v1.1.0 - 2026-11-12\n### Stuff\n- x')).toThrow('unknown section');
    expect(() => parseChangelog('## v1.1.0 - 2026-11-12\n- x')).toThrow('outside a section');
  });

  it('finds unseen releases and names anchors and highlights', () => {
    const releases = parseChangelog(SAMPLE);
    expect(unseenReleases(releases, null)).toHaveLength(2);
    expect(unseenReleases(releases, '1.0.0').map((release) => release.version)).toEqual(['1.1.0']);
    expect(unseenReleases(releases, '1.1.0')).toEqual([]);
    expect(releaseAnchor(appVersion('1.1.0'))).toBe('v1.1.0');
    expect(highlightKey(appVersion('1.1.0'))).toBe('changelog_v1_1_0');
  });

  it('keeps the real CHANGELOG.md valid', () => {
    const releases = parseChangelog(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'));
    expect(releases.at(-1)?.version).toBe('1.0.0');
  });

  it('cuts a release from the unreleased entries', () => {
    const { changelog, notes } = cutChangelog(SAMPLE, appVersion('1.2.0'), '2026-11-20', 'Next one.');
    const releases = parseChangelog(changelog);
    expect(releases[0]).toMatchObject({ version: '1.2.0', summary: 'Next one.', entries: { new: ['Work in progress'] } });
    expect(changelog).toMatch(/## Unreleased\n\n## v1\.2\.0 - 2026-11-20/u);
    expect(notes).toContain('- Work in progress');
    expect(() => cutChangelog(changelog, appVersion('1.3.0'), '2026-11-21', 'Empty')).toThrow('Nothing to release');
  });
});

describe('release notes from commits', () => {
  it('lists features and fixes, never docs or chore', async () => {
    const { commitEntries } = await import('../src/lib/app/changelog');
    expect(commitEntries([
      'feat(pwa): offer updates in a bottom sheet',
      'fix(data): restore the directory listing.',
      'docs(todo): track the plan',
      'chore(release): 1.1.0',
      'refactor(format): cache week info',
      'feat(api)!: drop the old sync endpoint',
      'Merge branch main'
    ])).toEqual({ new: ['Offer updates in a bottom sheet'], fixed: ['Restore the directory listing'], migration: ['Drop the old sync endpoint'] });
  });

  it('merges commit entries into the unreleased section as bullets', () => {
    const { changelog } = cutChangelog('# C\n\n## Unreleased\n\n## v1.0.0 - 2026-11-10\n\nBase.\n\n### New\n- X\n', appVersion('1.1.0'), '2026-11-11', 'Next.', ['feat(a): add a', 'fix(b): fix b', 'chore(c): bump']);
    expect(changelog).toContain('## v1.1.0 - 2026-11-11\n\nNext.\n\n### New\n- Add a\n\n### Fixed\n- Fix b\n');
    expect(changelog).not.toContain('bump');
  });
});
