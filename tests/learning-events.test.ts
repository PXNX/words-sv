import { describe, expect, it } from 'vitest';
import { accuracyBySkill, aggregateEvents, compactEvents, featureErrorProfile, normalizeLearningEvent, RAW_RETENTION_MS, skillForMode, EVENT_MODES, type LearningEvent } from '../src/lib/progress/events';
import { createEvent, currentSession, logAnswer, readEvents } from '../src/lib/progress/eventLog';
import { itemId, type SessionId } from '../src/lib/domain/types';
import { featureKey } from '../src/lib/grammar/taxonomy';

const NOW = Date.UTC(2026, 10, 10, 9);
const event = (overrides: Partial<LearningEvent> = {}): LearningEvent => ({
  id: Math.random().toString(36), ts: NOW, lang: 'de', mode: 'vocab', skill: 'vocab', itemId: itemId('de', 'Tisch'),
  correct: true, sessionId: 's1' as SessionId, level: 'a1', ...overrides
});

describe('learning events', () => {
  it('validates stored events and drops unknown fields', () => {
    const stored = { ...event(), score: 2, rating: 'meh', featureErrors: ['de:noun:case:dativ', 'bogus'], extra: 1 };
    const normalized = normalizeLearningEvent(stored)!;
    expect(normalized.featureErrors).toEqual(['de:noun:case:dativ']);
    expect('score' in normalized).toBe(false);
    expect('rating' in normalized).toBe(false);
    expect(normalizeLearningEvent({ ...event(), lang: 'xx' })).toBeNull();
    expect(normalizeLearningEvent({ ...event(), itemId: 'Tisch' })).toBeNull();
  });

  it('maps every mode to a skill', () => {
    for (const mode of EVENT_MODES) expect(skillForMode(mode)).toBeTruthy();
    expect(skillForMode('speak')).toBe('speaking');
  });

  it('aggregates per day, skill and level and compacts events older than a year', () => {
    const old = event({ ts: NOW - RAW_RETENTION_MS - 1, correct: false });
    const { keep, expired, aggregates } = compactEvents([old, event()], new Map(), NOW);
    expect(keep).toHaveLength(1);
    expect(expired).toEqual([old]);
    expect([...aggregates.values()]).toEqual([{ day: '2025-11-10', lang: 'de', skill: 'vocab', level: 'a1', attempts: 1, correct: 0, scored: 0, scoreSum: 0 }]);
    const twice = aggregateEvents([event({ score: 0.5 })], aggregateEvents([event()]));
    expect([...twice.values()][0]).toMatchObject({ attempts: 2, correct: 2, scored: 1, scoreSum: 0.5 });
  });

  it('computes accuracy per skill and the error profile', () => {
    const dativ = featureKey('de', 'noun', 'case', 'dativ');
    const events = [event(), event({ correct: false }), event({ skill: 'grammar', correct: false, featureErrors: [dativ] }), event({ skill: 'reading', correct: null }), event({ ts: NOW - 10, featureErrors: [dativ] })];
    expect(accuracyBySkill(events, NOW - 1)).toEqual({ vocab: { attempts: 2, correct: 1 }, grammar: { attempts: 1, correct: 0 } });
    expect(featureErrorProfile(events)).toEqual([{ feature: dativ, count: 2 }]);
  });

  it('fills ids, timestamps and sessions, and logs without IndexedDB as a no-op', async () => {
    const created = createEvent({ lang: 'de', mode: 'vocab', skill: 'vocab', itemId: itemId('de', 'Hund'), correct: true }, NOW);
    expect(created.ts).toBe(NOW);
    expect(created.id).toBeTruthy();
    expect(currentSession(NOW + 60_000)).toBe(created.sessionId);
    expect(currentSession(NOW + 60 * 60_000)).not.toBe(created.sessionId);
    const logged = logAnswer('de', 'reading', 'READING:x:0', false, { level: 'b1' });
    expect(logged).toMatchObject({ skill: 'reading', level: 'b1', itemId: 'de:READING:X:0' });
    expect(await readEvents()).toEqual([]);
  });
});
