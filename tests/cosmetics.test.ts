import { describe, expect, it } from 'vitest';
import { avatarAllowed, cosmeticModeIds, cosmetics, earnedAchievementRewards, earnedLanguageRewards, LANGUAGE_REWARD_TARGET, lockedIn, nextHangmanRun, nextRun, parseUnlocked, rewardFor, rewardIds } from '../src/lib/profile/cosmetics.js';
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
    expect(cosmeticModeIds).toHaveLength(12);
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

  it('adds five noses, five eyes and three faces, all earned, some tied to a language', () => {
    const rewards = (part: 'nose' | 'eyes' | 'face') => rewardIds.filter((id) => cosmetics[id].part === part);
    expect(rewards('nose')).toHaveLength(5);
    expect(rewards('eyes')).toHaveLength(5);
    expect(rewards('face')).toHaveLength(3);
    // The basic choices stay free.
    for (const nose of ['curve', 'button', 'round']) expect(lockedIn('nose', nose, [])).toBe(false);
    expect(lockedIn('eyes', 'wink', [])).toBe(true);
    expect(cosmetics.language_en).toMatchObject({ part: 'eyes', choice: 'wink', source: { kind: 'language', language: 'en' } });
  });

  it('bundles several items into one achievement, unlocked together', () => {
    // A badge hands out more than its first item; all of them share the badge's reward id.
    for (const [part, choice, id] of [
      ['shirt', 'hoodie', 'achievement_streak_30'],
      ['shirt', 'blazer', 'achievement_streak_30'],
      ['nose', 'pointy', 'achievement_vocab_500'],
      ['hair', '#5b3a8a', 'achievement_mastered_200'],
      ['hairStyle', 'mohawk', 'achievement_mastered_200'],
      ['extra', 'crown', 'achievement_all_rounder'],
      ['top', '#172a45', 'achievement_mastered_50']
    ] as const) {
      expect(rewardFor(part, choice)).toBe(id);
      expect(lockedIn(part, choice, [])).toBe(true);
      expect(lockedIn(part, choice, [id])).toBe(false);
    }
  });

  it('leaves at least one free choice in every avatar part', () => {
    // randomAvatar and a fresh profile pick from the free choices only (avatar.ts).
    for (const [part, choices] of Object.entries(avatarChoices)) {
      expect(choices.filter((choice) => !lockedIn(part as keyof typeof avatarChoices, choice, []))).not.toHaveLength(0);
    }
  });

  it('unlocks a language item once enough words of that language are practised', () => {
    expect(earnedLanguageRewards({ fr: LANGUAGE_REWARD_TARGET - 1, it: LANGUAGE_REWARD_TARGET }, [])).toEqual(['language_it']);
    expect(earnedLanguageRewards({ it: 500, de: 80 }, ['language_it'])).toEqual(['language_de']);
  });
});

describe('invite reward', async () => {
  const { earnedInviteRewards, INVITE_REWARD_TARGET, cosmetics } = await import('../src/lib/profile/cosmetics');
  it('unlocks the Telegram-blue top at ten friends, once', () => {
    expect(earnedInviteRewards(INVITE_REWARD_TARGET - 1, [])).toEqual([]);
    expect(earnedInviteRewards(INVITE_REWARD_TARGET, [])).toEqual(['invite_ten']);
    expect(earnedInviteRewards(25, ['invite_ten'])).toEqual([]);
    expect(cosmetics.invite_ten).toMatchObject({ part: 'top', choice: '#2aabee' });
  });
});
