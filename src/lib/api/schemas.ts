// What the server functions in `api/` answer, as Valibot schemas. Replies are checked before the
// app uses them, so a half-deployed server, a proxy's error page or an old cached reply becomes a
// clean "unavailable" instead of `undefined` deep inside the streak or sync code.
import * as v from 'valibot';

const count = v.pipe(v.number(), v.integer(), v.minValue(0));

export const TelegramStatusSchema = v.object({
  ok: v.literal(true),
  reminders: v.boolean(),
  linked: v.boolean(),
  connectUrl: v.nullable(v.string()),
  inviteUrl: v.nullable(v.string()),
  invited: count,
  inviteEmbers: count
});

export const PushKeySchema = v.object({ publicKey: v.pipe(v.string(), v.minLength(1)) });

/** The server's view of today's streak; fields it leaves out keep the device's values. */
export const ServerStreakSchema = v.object({
  dateKey: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/u)),
  vocabCorrect: v.optional(count),
  circleCompleted: v.optional(v.boolean()),
  definitionsCompleted: v.optional(v.boolean()),
  wordleCompleted: v.optional(v.boolean()),
  readingCompleted: v.optional(v.boolean()),
  storyCompleted: v.optional(v.boolean()),
  grammarCorrect: v.optional(count),
  listenCompleted: v.optional(v.boolean()),
  pronunciationAttempts: v.optional(count),
  hangmanCompleted: v.optional(v.boolean()),
  alltagCorrect: v.optional(count),
  sentenceCompleted: v.optional(v.boolean()),
  qualified: v.boolean(),
  streakCount: count,
  bestStreak: v.optional(count),
  lastQualifiedDay: v.nullable(v.string()),
  vocabularyGoal: v.optional(count),
  minutesRemaining: v.optional(count),
  freezes: v.optional(count),
  qualifiedDays: v.optional(count),
  rewardCollected: v.optional(v.boolean()),
  embers: v.optional(count)
});
export type ServerStreak = v.InferOutput<typeof ServerStreakSchema>;

export const StreakReplySchema = v.object({ ok: v.literal(true), streak: ServerStreakSchema });

export const SyncReplySchema = v.object({
  ok: v.boolean(),
  linked: v.optional(v.boolean()),
  revision: v.optional(v.number()),
  snapshot: v.optional(v.nullable(v.record(v.string(), v.string()))),
  error: v.optional(v.string())
});
export type SyncReply = v.InferOutput<typeof SyncReplySchema>;

/** A reply that came back but is not what the endpoint promises. */
export const OkSchema = v.object({ ok: v.optional(v.boolean()) });
