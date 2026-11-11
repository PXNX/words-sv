import { describe, expect, it } from 'vitest';
import { CHANNELS, HOME_MODES, dailyMix, dayIndex, isLearningStyle, modesForChannel, modesForLanguage } from '../src/lib/today/homeModes';

describe('home mode catalogue', () => {
  it('has unique ids and links', () => {
    expect(new Set(HOME_MODES.map((mode) => mode.id)).size).toBe(HOME_MODES.length);
    expect(new Set(HOME_MODES.map((mode) => mode.href)).size).toBe(HOME_MODES.length);
  });

  it('offers something for every channel', () => {
    for (const channel of CHANNELS) expect(modesForChannel(channel, 'en').length).toBeGreaterThan(0);
  });

  it('keeps German-only modes out of other languages', () => {
    expect(modesForLanguage('de').some((mode) => mode.id === 'grammarForms')).toBe(true);
    expect(modesForLanguage('en').some((mode) => mode.id === 'grammarForms')).toBe(false);
  });

  it('puts a channel\'s main modes first', () => {
    const hear = modesForChannel('hear', 'de');
    expect(hear[0]!.channels[0]).toBe('hear');
    expect(hear.every((mode) => mode.channels.includes('hear'))).toBe(true);
    expect(modesForChannel('all', 'de')).toEqual(modesForLanguage('de'));
  });
});

describe('daily mix', () => {
  const base = { language: 'de', dateKey: '2026-11-11', dueWords: 0, isDone: () => false } as const;

  it('has one step each for ear, eye and hand', () => {
    const mix = dailyMix({ ...base, style: 'mixed' });
    expect(mix.map((entry) => entry.step).sort()).toEqual(['do', 'hear', 'see']);
    expect(mix.every((entry) => !entry.done)).toBe(true);
  });

  it('starts with the learner\'s preferred channel', () => {
    expect(dailyMix({ ...base, style: 'hear' })[0]!.step).toBe('hear');
    expect(dailyMix({ ...base, style: 'do' })[0]!.step).toBe('do');
    expect(dailyMix({ ...base, style: 'write' })[0]!.mode.channels).toContain('write');
  });

  it('sends due words to the word quiz', () => {
    const see = dailyMix({ ...base, style: 'mixed', dueWords: 4 }).find((entry) => entry.step === 'see');
    expect(see?.mode.id).toBe('vocab');
  });

  it('skips what already counted today and marks a step done only when nothing is left', () => {
    const mix = dailyMix({ ...base, style: 'mixed', isDone: (mode) => mode === 'listen' });
    expect(mix.find((entry) => entry.step === 'hear')?.mode.id).not.toBe('listen');
    const allDone = dailyMix({ ...base, style: 'mixed', isDone: () => true });
    expect(allDone.every((entry) => entry.done)).toBe(true);
  });

  it('never uses one streak counter for two steps', () => {
    for (let day = 1; day <= 28; day += 1) {
      const mix = dailyMix({ ...base, style: 'do', dateKey: `2026-02-${String(day).padStart(2, '0')}` });
      const streaks = mix.map((entry) => entry.mode.streak).filter(Boolean);
      expect(new Set(streaks).size).toBe(streaks.length);
    }
  });

  it('is stable within a day and changes across days', () => {
    expect(dailyMix({ ...base, style: 'mixed' })).toEqual(dailyMix({ ...base, style: 'mixed' }));
    const ids = new Set(['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'].map((dateKey) => dailyMix({ ...base, style: 'mixed', dateKey }).map((entry) => entry.mode.id).join()));
    expect(ids.size).toBeGreaterThan(1);
    expect(dayIndex('2026-11-11')).toBe(dayIndex('2026-11-11'));
  });

  it('recognises learning styles', () => {
    expect(isLearningStyle('hear')).toBe(true);
    expect(isLearningStyle('smell')).toBe(false);
  });
});
