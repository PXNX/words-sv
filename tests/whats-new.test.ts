import { describe, expect, it } from 'vitest';
import { parseChangelog } from '../src/lib/app/changelog';
import { updateNotice, whatsNew, WHATS_NEW_MAX_FEATURES } from '../src/lib/app/whatsNew';

const releases = parseChangelog(`## v1.2.0 - 2026-11-12

Two.

### New
${Array.from({ length: 8 }, (_, index) => `- Feature ${index + 1}`).join('\n')}
### Fixed
- Bug a
- Bug b

## v1.1.0 - 2026-11-10

One.

### New
- Older feature
### Fixed
- Older bug
`);

describe("what's new after an update", () => {
  it('shows features of every unseen release and counts the fixes', () => {
    const news = whatsNew(releases, '1.0.0', true)!;
    expect(news.releases.map((release) => release.version)).toEqual(['1.2.0', '1.1.0']);
    expect(news.features).toHaveLength(WHATS_NEW_MAX_FEATURES);
    expect(news.moreFeatures).toBe(9 - WHATS_NEW_MAX_FEATURES);
    expect(news.fixes).toBe(3);
  });

  it('stays quiet on a fresh install and when everything was seen', () => {
    expect(whatsNew(releases, null, false)).toBeNull();
    expect(whatsNew(releases, '1.2.0', true)).toBeNull();
  });

  it('shows only the newest release to a returning learner who never saw the sheet', () => {
    expect(whatsNew(releases, null, true)!.releases.map((release) => release.version)).toEqual(['1.2.0']);
  });
});

describe('update notice', () => {
  const quiet = parseChangelog(`## v1.3.0 - 2026-11-14

Polish.

### Improved
- Faster start

${'## v1.2.0 - 2026-11-12\n\nTwo.\n\n### New\n- Feature\n'}`);

  it('uses the sheet when there is something new', () => {
    expect(updateNotice(releases, '1.1.0', true)?.kind).toBe('sheet');
  });

  it('falls back to a snackbar for a release without features or fixes', () => {
    expect(updateNotice(quiet, '1.2.0', true)).toEqual({ kind: 'snackbar', version: '1.3.0' });
  });

  it('shows nothing on a fresh install or an unchanged version', () => {
    expect(updateNotice(quiet, null, false)).toBeNull();
    expect(updateNotice(quiet, '1.3.0', true)).toBeNull();
  });
});
