import { describe, expect, it } from 'vitest';
import { avatarAllowed, cosmeticModes, cosmetics, lockedIn, nextRun, parseUnlocked, rewardFor } from '../src/lib/profile/cosmetics.js';
import { avatarChoices, defaultAvatar } from '../src/lib/profile/avatar.js';

describe('cosmetic rewards', () => {
  it('has one distinct reward per mode, each a real avatar choice', () => {
    const keys = cosmeticModes.map((mode) => `${cosmetics[mode].part}:${cosmetics[mode].choice}`);
    expect(new Set(keys).size).toBe(cosmeticModes.length);
    for (const mode of cosmeticModes) {
      const { part, choice } = cosmetics[mode];
      expect(avatarChoices[part] as readonly string[]).toContain(choice);
    }
  });

  it('locks reward choices until their mode is unlocked', () => {
    expect(rewardFor('extra', 'monocle')).toBe('vocab');
    expect(rewardFor('extra', 'glasses')).toBeNull();
    expect(lockedIn('extra', 'monocle', [])).toBe(true);
    expect(lockedIn('extra', 'monocle', ['vocab'])).toBe(false);
    expect(lockedIn('extra', 'glasses', [])).toBe(false);
    expect(avatarAllowed({ ...defaultAvatar, shirt: 'tracht' }, [])).toBe(false);
    expect(avatarAllowed({ ...defaultAvatar, shirt: 'tracht' }, ['grammar'])).toBe(true);
  });

  it('reads only known modes from storage', () => {
    expect(parseUnlocked('["vocab","nonsense","story"]')).toEqual(['vocab', 'story']);
    expect(parseUnlocked('not json')).toEqual([]);
    expect(parseUnlocked(null)).toEqual([]);
  });

  it('counts runs of first-try answers and resets on a miss', () => {
    let run = 0;
    for (let index = 0; index < 14; index += 1) ({ run } = nextRun('vocab', run, true));
    expect(nextRun('vocab', run, true)).toEqual({ run: 15, reached: true });
    expect(nextRun('vocab', run, false)).toEqual({ run: 0, reached: false });
    expect(nextRun('wordle', 100, true).reached).toBe(false);
  });
});
