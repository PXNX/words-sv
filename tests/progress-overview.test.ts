import { describe, expect, it } from 'vitest';
import { buildOverview } from '../src/lib/progress/overview';
import { itemId, type SessionId } from '../src/lib/domain/types';
import type { LearningEvent } from '../src/lib/progress/events';

const NOW = Date.UTC(2026, 10, 10);
const DAY = 86_400_000;
const known = { repetitions: 6, dueAt: NOW + 30 * DAY, lapses: 0, stability: 40, difficulty: 4, lastReviewAt: NOW - DAY };
const answer = (skill: LearningEvent['skill'], correct: boolean): LearningEvent => ({ id: Math.random().toString(), ts: NOW - DAY, lang: 'de', mode: 'vocab', skill, itemId: itemId('de', 'x'), correct, sessionId: 's' as SessionId });

describe('progress overview', () => {
  it('builds the ladder, skill readiness and readiness for the level', () => {
    const overview = buildOverview({
      levels: { a1: { states: [known, known, undefined, undefined], total: 4 }, b1: { states: [known], total: 10 }, c2: { states: [], total: 0 } },
      events: [answer('vocab', true), answer('vocab', true), answer('reading', false)],
      level: 'a1',
      now: NOW
    });
    expect(overview.ladder.map((rung) => [rung.level, rung.coverage, rung.mastery])).toEqual([['a1', 0.5, 0.5], ['b1', 0.1, 0.1]]);
    expect(overview.knownWords).toBe(3);
    expect(overview.skills.vocab.point).toBeCloseTo(0.5);
    expect(overview.skills.reading.point).toBe(0);
    expect(overview.skills.writing.attempts).toBe(0);
    // The mean of the six skills: above the untested ones, below vocabulary.
    const points = Object.values(overview.skills).map((skill) => skill.point);
    expect(overview.readiness.point).toBeCloseTo(points.reduce((sum, point) => sum + point, 0) / points.length);
  });
});
