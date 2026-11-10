import { describe, expect, expectTypeOf, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { appVersion, compareVersions, isAppVersion, nextCalVer, parseVersion, type AppVersion } from '../src/lib/app/version';
import { ChangelogError, highlightKey, parseChangelog, releaseAnchor, unseenReleases } from '../src/lib/app/changelog';
import { cutChangelog } from '../scripts/release';

describe('versions', () => {
  it('parses the baseline, CalVer and release candidates', () => {
    expect(parseVersion('1.0.0')).toEqual({ major: 1, minor: 0, patch: 0, rc: null });
    expect(parseVersion('v2026.11.2-rc.1')).toEqual({ major: 2026, minor: 11, patch: 2, rc: 1 });
    expect(parseVersion('2026.09.1')).toBeNull();
    expect(isAppVersion('2026.11.1')).toBe(true);
    expect(isAppVersion('v2026.11.1')).toBe(false);
    expectTypeOf(appVersion('v2026.11.1')).toEqualTypeOf<AppVersion>();
    expect(appVersion('v2026.11.1')).toBe('2026.11.1');
  });

  it('orders versions numerically, candidates before their release', () => {
    const sorted = ['2026.11.10', '1.0.0', '2026.11.2', '2026.12.1', '2026.11.2-rc.1'].sort(compareVersions);
    expect(sorted).toEqual(['1.0.0', '2026.11.2-rc.1', '2026.11.2', '2026.11.10', '2026.12.1']);
  });

  it('computes the next CalVer per month', () => {
    const november = new Date(Date.UTC(2026, 10, 10));
    expect(nextCalVer(november, ['v1.0.0'])).toBe('2026.11.1');
    expect(nextCalVer(november, ['v1.0.0', 'v2026.11.1', 'v2026.11.2', 'v2026.11.3-rc.1'])).toBe('2026.11.3');
    expect(nextCalVer(new Date(Date.UTC(2026, 11, 1)), ['v2026.11.4'])).toBe('2026.12.1');
    expect(nextCalVer(new Date(Date.UTC(2027, 0, 1)), ['v2026.12.7'])).toBe('2027.1.1');
  });
});

const SAMPLE = `# Changelog

## Unreleased

### New
- Work in progress

## v2026.11.1 - 2026-11-12

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
    expect(releases.map((release) => release.version)).toEqual(['2026.11.1', '1.0.0']);
    expect(releases[0]).toEqual({ version: '2026.11.1', date: '2026-11-12', summary: 'Formatting follows the learned language.', entries: { new: ['Format like setting'], fixed: ['Weekday names'] } });
  });

  it('rejects malformed entries', () => {
    expect(() => parseChangelog('## 2026.11 - 2026-11-12')).toThrow(ChangelogError);
    expect(() => parseChangelog('## v2026.11.1 - 2026-11-12\n### Stuff\n- x')).toThrow('unknown section');
    expect(() => parseChangelog('## v2026.11.1 - 2026-11-12\n- x')).toThrow('outside a section');
  });

  it('finds unseen releases and names anchors and highlights', () => {
    const releases = parseChangelog(SAMPLE);
    expect(unseenReleases(releases, null)).toHaveLength(2);
    expect(unseenReleases(releases, '1.0.0').map((release) => release.version)).toEqual(['2026.11.1']);
    expect(unseenReleases(releases, '2026.11.1')).toEqual([]);
    expect(releaseAnchor(appVersion('2026.11.1'))).toBe('v2026.11.1');
    expect(highlightKey(appVersion('2026.11.1'))).toBe('changelog_v2026_11_1');
  });

  it('keeps the real CHANGELOG.md valid', () => {
    const releases = parseChangelog(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'));
    expect(releases.at(-1)?.version).toBe('1.0.0');
  });

  it('cuts a release from the unreleased entries', () => {
    const { changelog, notes } = cutChangelog(SAMPLE, appVersion('2026.11.2'), '2026-11-20', 'Next one.');
    const releases = parseChangelog(changelog);
    expect(releases[0]).toMatchObject({ version: '2026.11.2', summary: 'Next one.', entries: { new: ['Work in progress'] } });
    expect(changelog).toMatch(/## Unreleased\n\n## v2026\.11\.2 - 2026-11-20/u);
    expect(notes).toContain('- Work in progress');
    expect(() => cutChangelog(changelog, appVersion('2026.11.3'), '2026-11-21', 'Empty')).toThrow('Nothing to release');
  });
});
