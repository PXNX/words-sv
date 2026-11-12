// On-device A/B experiments. A device is assigned a variant once, from a random device id and the
// experiment's key, and keeps it; nothing is sent anywhere. Exposure travels with the learning
// events themselves (`presentation` on an event), so the comparison below needs no second log.
// What this can and cannot show is written down in docs/experiments.md. Pure; the device id and
// the URL override live in experiments.svelte.ts.
import type { LearningEvent } from '#lib/progress/events.js';

export type Experiment<V extends string = string> = {
  key: string;
  /** Variants with their weights; the first is the default when nothing can be assigned. */
  variants: readonly { id: V; weight: number }[];
  /** What the experiment is meant to find out, for the insights page. */
  question: string;
};

export const EXPERIMENTS = {
  // V7 of the visual layer: does the animated rule chain after a case answer help the rule stick?
  'teaching-animations': {
    key: 'teaching-animations',
    variants: [{ id: 'on', weight: 1 }, { id: 'off', weight: 1 }],
    question: 'Do animated explanations after an answer raise the share of right answers on the next meeting?'
  }
} as const satisfies Record<string, Experiment>;

export type ExperimentKey = keyof typeof EXPERIMENTS;
export type VariantOf<K extends ExperimentKey> = (typeof EXPERIMENTS)[K]['variants'][number]['id'];

/** FNV-1a, folded to 0..1: stable across sessions and evenly spread. */
export function bucket(deviceId: string, key: string): number {
  let hash = 0x811c9dc5;
  for (const char of `${key}:${deviceId}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 0x100000000;
}

export function assignVariant<V extends string>(experiment: Experiment<V>, deviceId: string): V {
  const total = experiment.variants.reduce((sum, variant) => sum + Math.max(0, variant.weight), 0);
  if (total <= 0) return experiment.variants[0]!.id;
  let point = bucket(deviceId, experiment.key) * total;
  for (const variant of experiment.variants) {
    point -= Math.max(0, variant.weight);
    if (point < 0) return variant.id;
  }
  return experiment.variants.at(-1)!.id;
}

/** `?exp=teaching-animations:off` (several separated by commas) forces a variant, for testing. */
export function parseOverrides(search: string): Partial<Record<ExperimentKey, string>> {
  const overrides: Partial<Record<ExperimentKey, string>> = {};
  for (const entry of (new URLSearchParams(search).get('exp') ?? '').split(',')) {
    const [key, variant] = entry.split(':');
    if (!key || !variant || !(key in EXPERIMENTS)) continue;
    const experiment = EXPERIMENTS[key as ExperimentKey];
    if (experiment.variants.some((candidate) => candidate.id === variant)) overrides[key as ExperimentKey] = variant;
  }
  return overrides;
}

export type ArmResult = { answers: number; correct: number; accuracy: number | null };
export type PresentationReport = { with: ArmResult; without: ArmResult; /** with − without, in points of accuracy; null until both arms have answers. */ lift: number | null };

const MIN_GAP_MS = 12 * 60 * 60 * 1000;
const arm = (answers: number, correct: number): ArmResult => ({ answers, correct, accuracy: answers ? correct / answers : null });

/**
 * Retention by presentation: for every item, each answer that comes at least half a day after
 * the previous one is credited to how that previous card was shown (with or without the picture
 * or animation). That is the delayed effect the experiment asks about, not the answer on the
 * card that carried the treatment.
 */
export function presentationReport(events: readonly LearningEvent[], treatment: 'image' | 'animation', minGapMs = MIN_GAP_MS): PresentationReport {
  const byItem = new Map<string, LearningEvent[]>();
  for (const event of events) {
    if (event.correct === null) continue;
    const list = byItem.get(event.itemId);
    if (list) list.push(event);
    else byItem.set(event.itemId, [event]);
  }
  const tally = { with: { answers: 0, correct: 0 }, without: { answers: 0, correct: 0 } };
  for (const list of byItem.values()) {
    list.sort((a, b) => a.ts - b.ts);
    for (let index = 1; index < list.length; index += 1) {
      const before = list[index - 1]!;
      const after = list[index]!;
      if (!before.presentation || after.ts - before.ts < minGapMs) continue;
      const side = before.presentation[treatment] ? tally.with : tally.without;
      side.answers += 1;
      if (after.correct) side.correct += 1;
    }
  }
  const withArm = arm(tally.with.answers, tally.with.correct);
  const withoutArm = arm(tally.without.answers, tally.without.correct);
  return { with: withArm, without: withoutArm, lift: withArm.accuracy !== null && withoutArm.accuracy !== null ? withArm.accuracy - withoutArm.accuracy : null };
}
