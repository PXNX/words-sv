import { describe, expect, it } from 'vitest';
import { avatarAllowed, cosmeticModes, cosmetics, earnedAchievementRewards, lockedIn, nextHangmanRun, nextRun, parseUnlocked, rewardFor, rewardIds } from '../src/lib/profile/cosmetics.js';
import { avatarChoices, defaultAvatar } from '../src/lib/profile/avatar.js';
import { buildAchievements } from '../src/lib/progress/achievements.js';

describe('cosmetic rewards', () => {
  it('has one distinct reward per mode, achievement and high score, each a real avatar choice', () => {
    const keys = rewardIds.map((id) => `${cosmetics[id].part}:${cosmetics[id].choice}`);
    expect(new Set(keys).size).toBe(rewardIds.length);
    for (const id of rewardIds) {
      const { part, choice } = cosmetics[id];
      expect(avatarChoices[part] as readonly string[]).toContain(choice);
    }
    expect(cosmeticModes).toHaveLength(12);
    // Every achievement brings an item.
    for (const achievement of buildAchievements({ activity: [], bestStreak: 0, masteredWords: 0 })) expect(rewardIds).toContain(`achievement_${achievement.id}`);
  });

  it('locks reward choices until they are unlocked', () => {
    expect(rewardFor('extra', 'monocle')).toBe('vocab');
    expect(rewardFor('extra', 'laurel')).toBe('achievement_all_rounder');
    expect(rewardFor('extra', 'glasses')).toBeNull();
    expect(lockedIn('extra', 'monocle', [])).toBe(true);
    expect(lockedIn('extra', 'monocle', ['vocab'])).toBe(false);
    expect(lockedIn('extra', 'glasses', [])).toBe(false);
    expect(avatarAllowed({ ...defaultAvatar, shirt: 'tracht' }, [])).toBe(false);
    expect(avatarAllowed({ ...defaultAvatar, shirt: 'tracht' }, ['grammar'])).toBe(true);
  });

  it('reads only known rewards from storage, old mode unlocks included', () => {
    expect(parseUnlocked('["vocab","nonsense","story","score_wordle_two"]')).toEqual(['vocab', 'story', 'score_wordle_two']);
    expect(parseUnlocked('not json')).toEqual([]);
    expect(parseUnlocked(null)).toEqual([]);
  });

  it('counts runs of first-try answers, with a high score further out, and resets on a miss', () => {
    let run = 0;
    for (let index = 0; index < 14; index += 1) ({ run } = nextRun('vocab', run, true));
    expect(nextRun('vocab', run, true)).toEqual({ run: 15, reached: true });
    expect(nextRun('vocab', run, false)).toEqual({ run: 0, reached: false });
    expect(nextRun('vocab', 39, true)).toEqual({ run: 40, reached: true, score: 'score_vocab_forty' });
    expect(nextRun('wordle', 100, true).reached).toBe(false);
  });

  it('counts Hangman wins in a row', () => {
    expect(nextHangmanRun(3, true)).toEqual({ run: 4, reached: false });
    expect(nextHangmanRun(4, true)).toEqual({ run: 5, reached: true });
    expect(nextHangmanRun(4, false)).toEqual({ run: 0, reached: false });
  });

  it('hands out the items of finished achievements once', () => {
    const achievements = buildAchievements({ activity: [{ kind: 'vocab', at: 1 }], bestStreak: 3, masteredWords: 0 });
    expect(earnedAchievementRewards(achievements, [])).toEqual(['achievement_first_step', 'achievement_streak_3']);
    expect(earnedAchievementRewards(achievements, ['achievement_first_step'])).toEqual(['achievement_streak_3']);
  });
});
