// Plays a short, fixed learner history through an old release's modules and prints the
// localStorage it leaves behind, as the fixture for migration tests:
//
//   git worktree add --detach ../words-v1.0.0 v1.0.0
//   bun scripts/snapshot-local-data.ts ../words-v1.0.0 > tests/fixtures/v1.0.0/local-storage.json
//   git worktree remove ../words-v1.0.0
//
// The worktree needs the dependencies (a symlinked node_modules is enough). Only plain storage is
// captured; IndexedDB (word audio, the learning event log) did not hold learner state in v1.0.0.
/* eslint-disable @typescript-eslint/no-explicit-any */
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
const root = process.argv[2]!;
const ledger = await import(`${root}/src/lib/review/ledger.ts`);
const activity = await import(`${root}/src/lib/progress/activity.ts`);
const streak = await import(`${root}/src/lib/streak/clientStreak.ts`);
const srs = await import(`${root}/src/lib/vocab/spacedRepetition.ts`);
const missed = await import(`${root}/src/lib/story/missedWords.ts`);
const avatar = await import(`${root}/src/lib/profile/avatar.ts`);

const day = Date.parse('2026-10-28T09:00:00.000Z');
const at = (d: number, minutes = 0) => day + d * 86_400_000 + minutes * 60_000;
localStorage.setItem('wordcircle-language-v1', 'de');
localStorage.setItem('wordcircle-interface-locale-v1', 'en');
localStorage.setItem('wordcircle-first-name-v1', 'Alex');
localStorage.setItem('wordcircle-daily-goal-v1', '8');
const chosen = Object.fromEntries(avatar.avatarParts.map((part: string) => [part, avatar.avatarChoices[part][1] ?? avatar.avatarChoices[part][0]]));
localStorage.setItem('wordcircle-avatar-v1', JSON.stringify(chosen));
const parsedAvatar = avatar.parseAvatar(localStorage.getItem('wordcircle-avatar-v1')); if (Object.entries(chosen).some(([part, choice]) => parsedAvatar[part] !== choice)) throw new Error('avatar changed by v1.0.0');

let progress: Record<string, unknown> = {};
const words = ['HAUS', 'BAUM', 'KATZE', 'HUND', 'WASSER', 'BROT'];
for (let d = 0; d < 4; d += 1) {
  for (const [index, word] of words.entries()) {
    const correct = (index + d) % 4 !== 0;
    progress = srs.updateReviewProgress(progress, word, correct, at(d, index));
    ledger.recordReview('de', word, correct, 'vocab', at(d, index));
    activity.recordActivity('vocab', {}, at(d, index));
  }
}
localStorage.setItem('wordcircle-vocabulary-review-v2:de:a1', JSON.stringify(progress));
ledger.markReviewItem('de', 'Fenster', 'reading', at(2, 30));
srs.markWordForRepeat('de', 'FENSTER', at(2, 30));
activity.recordActivity('reading', { id: 'de-a1-cafe' }, at(2, 31));
activity.recordActivity('story', { id: 'de-a1-market' }, at(3, 10));
activity.recordActivity('pronunciation', { perfect: true }, at(3, 20));
const realNow = Date.now;
Date.now = () => at(2, 32);
missed.recordMissedWord('de', 'Fenster');
missed.recordMissedWord('de', 'Tür');
Date.now = realNow;

let state = streak.readStreak(new Date(at(3)));
for (let i = 0; i < 8; i += 1) state = streak.applyLocalEvent(state, 'vocab_correct', new Date(at(3, 40 + i)));
streak.writeStreak({ ...state, streakCount: 4, bestStreak: 9, lastQualifiedDay: state.dateKey });

const keep = [...store.keys()].filter((key) => !/device|reminder|auto-update/u.test(key)).sort();
console.log(JSON.stringify(Object.fromEntries(keep.map((key) => [key, store.get(key)])), null, 2));
