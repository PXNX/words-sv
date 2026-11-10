import { describe, expect, it } from 'vitest';
import { activityFor, normalizeActivityEvent, recordActivity } from '../src/lib/progress/activity';

describe('activity per learning language', () => {
  it('tags new events with their language and keeps valid tags only', () => {
    const [event] = recordActivity('vocab', { lang: 'fr' }, 1000, []);
    expect(event).toEqual({ kind: 'vocab', at: 1000, lang: 'fr' });
    expect(normalizeActivityEvent({ kind: 'vocab', at: 1, lang: 'xx' })).toEqual({ kind: 'vocab', at: 1 });
  });

  it('shows one language and keeps untagged older events everywhere', () => {
    const events = [{ kind: 'vocab' as const, at: 1 }, { kind: 'vocab' as const, at: 2, lang: 'de' as const }, { kind: 'story' as const, at: 3, lang: 'en' as const }];
    expect(activityFor(events, 'de').map((event) => event.at)).toEqual([1, 2]);
    expect(activityFor(events, 'en').map((event) => event.at)).toEqual([1, 3]);
  });
});
