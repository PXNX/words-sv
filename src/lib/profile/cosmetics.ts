/*
 * Cosmetic rewards for the learner's character: the catalog and the rules, without any state.
 * Rewards come from three places:
 *   - modes: every mode has one item, unlocked by playing it really well (a flawless round, a long
 *     run of first-try answers, …; see each mode's call to unlockCosmetic);
 *   - achievements: every badge on the progress page brings an item (progress/achievements.ts);
 *   - high scores: a few standout results (Wordle in two tries, five Hangman wins in a row, forty
 *     first-try words in a row);
 *   - languages: practising 50 words of a learning language brings an item tied to it;
 *   - invites: ten friends who joined through the learner's invite link bring a Telegram-blue top;
 *   - the store: items and sets bought with Telegram Stars (src/lib/store/catalog.ts).
 * The unlocked list itself lives in cosmetics.svelte.ts.
 */
import type { Avatar, AvatarPart } from './avatar.js';
import type { Achievement, AchievementId } from '#lib/progress/achievements.js';
import type { Language } from '#lib/data/vocabulary.js';
import { SHOP_ITEMS, type ShopItemId } from '#lib/store/catalog.js';

export type CosmeticMode =
  | 'vocab' | 'circle' | 'definitions' | 'wordle' | 'hangman' | 'pronunciation' | 'alltag'
  | 'grammar' | 'story' | 'reading' | 'listen' | 'conversation';
export type ScoreId = 'wordle_two' | 'hangman_five' | 'vocab_forty';
export type AchievementReward = `achievement_${AchievementId}`;
export type ScoreReward = `score_${ScoreId}`;
export type LanguageReward = `language_${Language}`;
export type InviteReward = 'invite_ten';
// Mode rewards keep their plain mode id, so what was unlocked before stays unlocked.
export type RewardId = CosmeticMode | AchievementReward | ScoreReward | LanguageReward | InviteReward | ShopItemId;

export type RewardSource = { kind: 'mode'; mode: CosmeticMode } | { kind: 'achievement'; achievement: AchievementId } | { kind: 'score'; score: ScoreId } | { kind: 'language'; language: Language; target: number } | { kind: 'invite'; target: number } | { kind: 'shop' };
export type Cosmetic = { id: RewardId; part: AvatarPart; choice: string; source: RewardSource };

// One reward may hand out several items at once (a bundle). The first reward wins a choice,
// so the catalog keeps one record per part:choice but every reward id maps to its own list.
export type Bundle = Record<RewardId, Cosmetic[]>;

const mode = (id: CosmeticMode, part: AvatarPart, choice: string): Cosmetic => ({ id, part, choice, source: { kind: 'mode', mode: id } });
const badge = (achievement: AchievementId, part: AvatarPart, choice: string): Cosmetic => ({ id: `achievement_${achievement}`, part, choice, source: { kind: 'achievement', achievement } });
const score = (id: ScoreId, part: AvatarPart, choice: string): Cosmetic => ({ id: `score_${id}`, part, choice, source: { kind: 'score', score: id } });
// Words practised in one learning language that unlock its item.
export const LANGUAGE_REWARD_TARGET = 50;
const language = (code: Language, part: AvatarPart, choice: string): Cosmetic => ({ id: `language_${code}`, part, choice, source: { kind: 'language', language: code, target: LANGUAGE_REWARD_TARGET } });

// Friends who joined through the invite link (counted by the server) that unlock the invite item.
export const INVITE_REWARD_TARGET = 10;

// Every reward is a distinct avatar choice that StoryCharacter can draw. A badge may hand out
// several items at once (a bundle): the entries below then repeat the reward id with a different
// choice, and unlocking the reward unlocks all of its bundled choices together.
const catalog: Cosmetic[] = [
  // Modes: one item each, earned by playing really well.
  mode('vocab', 'extra', 'monocle'),
  mode('circle', 'extra', 'tyrolean'),
  mode('definitions', 'extra', 'pencil'),
  mode('wordle', 'shirt', 'waistcoat'),
  mode('hangman', 'extra', 'kaiser'),
  mode('pronunciation', 'extra', 'toque'),
  mode('alltag', 'extra', 'straw'),
  mode('grammar', 'shirt', 'tracht'),
  mode('story', 'shirt', 'overalls'),
  mode('reading', 'shirt', 'tie'),
  mode('listen', 'hair', '#9fc6e8'),
  mode('conversation', 'top', '#d4af37'),
  // Achievements: one badge brings its item, some bring a second (the long road).
  badge('first_step', 'top', '#7fc8a9'),
  badge('streak_3', 'hair', '#2fae8f'),
  badge('vocab_100', 'shirt', 'sweater'),
  badge('story_5', 'extra', 'wizard'),
  badge('reading_5', 'extra', 'beret'),
  badge('perfect_10', 'extra', 'star'),
  badge('streak_7', 'extra', 'party'),
  badge('grammar_50', 'shirt', 'bowtie'),
  badge('mastered_50', 'top', '#7a2e4f'),
  badge('all_rounder', 'extra', 'laurel'),
  score('wordle_two', 'top', '#c0c6cf'),
  score('hangman_five', 'hair', '#ff7a3d'),
  score('vocab_forty', 'extra', 'mortarboard'),
  badge('streak_14', 'eyes', 'sparkle'),
  badge('vocab_500', 'eyes', 'sleepy'),
  badge('perfect_30', 'eyes', 'almond'),
  badge('reading_15', 'nose', 'wide'),
  badge('grammar_200', 'nose', 'long'),
  badge('story_15', 'face', 'pear'),
  badge('mastered_200', 'face', 'long'),
  badge('streak_30', 'face', 'heart'),
  // Languages, invites, shop: single items so far.
  language('de', 'nose', 'snub'),
  language('en', 'eyes', 'wink'),
  language('fr', 'nose', 'heart'),
  language('it', 'eyes', 'starry'),
  language('es', 'nose', 'freckles'),
  { id: 'invite_ten', part: 'top', choice: '#2aabee', source: { kind: 'invite', target: INVITE_REWARD_TARGET } },
  ...SHOP_ITEMS.map((item): Cosmetic => ({ id: item.id, part: item.part, choice: item.choice, source: { kind: 'shop' } })),
  // Bundles: one reward id hands out several items. The badge rewards repeat
  // their achievement id with the extra choices of the long road.
  badge('streak_30', 'shirt', 'hoodie'),
  badge('streak_30', 'shirt', 'blazer'),
  badge('streak_30', 'shirt', 'cardigan'),
  badge('streak_30', 'shirt', 'tshirt'),
  badge('vocab_500', 'nose', 'pointy'),
  badge('mastered_200', 'hair', '#5b3a8a'),
  badge('mastered_200', 'hair', '#3d6fd1'),
  badge('mastered_200', 'hairStyle', 'spiky'),
  badge('mastered_200', 'hairStyle', 'mohawk'),
  badge('all_rounder', 'extra', 'crown'),
  badge('mastered_50', 'top', '#172a45'),
];

// `cosmetics` keeps the FIRST Cosmetic entry for each RewardId so a bundle's many
// choices all resolve to the same id (the first one wins).
const cosmeticsMap = new Map<string, Cosmetic>();
for (const item of catalog) {
  if (!cosmeticsMap.has(item.id)) cosmeticsMap.set(item.id, item);
}
export const cosmetics = Object.fromEntries(cosmeticsMap.entries()) as Record<RewardId, Cosmetic>;
// Unique reward ids, preserving catalog order.
export const rewardIds = [...cosmeticsMap.keys()] as RewardId[];
// Every mode that appears in a bundle (first occurrence per mode).
export const cosmeticModes = catalog
  .map((item): CosmeticMode | undefined => (item.source.kind === 'mode' ? item.source.mode : undefined))
  .filter((m): m is CosmeticMode => m !== undefined);
export const cosmeticModeIds = [...new Set(cosmeticModes)];

// Runs of first-try answers that count as "really well" in the answer-by-answer modes. The other
// modes unlock from a single flawless round (see each mode's call to unlockCosmetic).
export const RUN_TARGETS: Partial<Record<CosmeticMode, number>> = { vocab: 15, grammar: 15, alltag: 20, pronunciation: 10 };
// Longer runs that count as a high score, with the reward they bring.
export const SCORE_RUNS: Partial<Record<CosmeticMode, { target: number; reward: ScoreReward }>> = { vocab: { target: 40, reward: 'score_vocab_forty' } };
// Full listening sessions, since listening has no wrong answers to avoid.
export const LISTEN_TARGET = 3;
// Wordle solved in this many tries or fewer; Hangman words won in a row.
export const WORDLE_TOP_TRIES = 2;
export const HANGMAN_WIN_RUN = 5;

export const COSMETICS_KEY = 'wordcircle-cosmetics-v1';

/** The stored unlocked list; anything unknown is dropped. */
export function parseUnlocked(raw: string | null): RewardId[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? rewardIds.filter((id) => value.includes(id)) : [];
  } catch {
    return [];
  }
}

/** The reward this choice is, if it is a reward at all. */
export function rewardFor(part: AvatarPart, choice: string): RewardId | null {
  return catalog.find((item) => item.part === part && item.choice === choice)?.id ?? null;
}

/** The reward an achievement brings. */
export function achievementReward(achievement: AchievementId): AchievementReward {
  return `achievement_${achievement}`;
}

/** Rewards of achievements that are done but not unlocked yet. */
export function earnedAchievementRewards(achievements: readonly Achievement[], unlocked: readonly RewardId[]): AchievementReward[] {
  return achievements.filter((achievement) => achievement.done).map((achievement) => achievementReward(achievement.id)).filter((id) => id in cosmetics && !unlocked.includes(id));
}

/** Language rewards whose language has reached its practice target but are not unlocked yet. */
export function earnedLanguageRewards(wordsPracticed: Partial<Record<Language, number>>, unlocked: readonly RewardId[]): LanguageReward[] {
  return catalog.flatMap((item) => item.source.kind === 'language' && (wordsPracticed[item.source.language] ?? 0) >= item.source.target && !unlocked.includes(item.id) ? [item.id as LanguageReward] : []);
}

/** The invite reward once enough friends joined, unless it is unlocked already. */
export function earnedInviteRewards(invited: number, unlocked: readonly RewardId[]): InviteReward[] {
  return invited >= INVITE_REWARD_TARGET && !unlocked.includes('invite_ten') ? ['invite_ten'] : [];
}

export function lockedIn(part: AvatarPart, choice: string, unlocked: readonly RewardId[]): boolean {
  const reward = rewardFor(part, choice);
  return reward !== null && !unlocked.includes(reward);
}

/** Whether every part of `avatar` is either a basic choice or an unlocked reward. */
export function avatarAllowed(avatar: Avatar, unlocked: readonly RewardId[]): boolean {
  return (Object.keys(avatar) as AvatarPart[]).every((part) => !lockedIn(part, String(avatar[part]), unlocked));
}

/** The next length of a run of first-try answers, and which rewards it reaches. */
export function nextRun(mode: CosmeticMode, run: number, correctFirstTry: boolean): { run: number; reached: boolean; score?: ScoreReward } {
  const target = RUN_TARGETS[mode];
  const next = correctFirstTry ? run + 1 : 0;
  const high = SCORE_RUNS[mode];
  return { run: next, reached: Boolean(target) && next >= (target ?? Infinity), ...(high && next >= high.target ? { score: high.reward } : {}) };
}

/** The next count of Hangman words won in a row, and whether it is a high score. */
export function nextHangmanRun(run: number, won: boolean): { run: number; reached: boolean } {
  const next = won ? run + 1 : 0;
  return { run: next, reached: next >= HANGMAN_WIN_RUN };
}
