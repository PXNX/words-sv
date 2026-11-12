// "Something is wrong here": a learner can flag a word, sentence or text. The flags stay on the
// device (there is no server to send them to) and the insights page lists them as text to copy
// and send to the developers. Pure list handling plus one localStorage key.
export type ContentFlag = {
  /** What was flagged: a stable id such as `de:HAUS` or `reading:a1-stadt:2`. */
  item: string;
  kind: 'word' | 'grammar' | 'reading' | 'story';
  language: string;
  /** What the learner saw, to make the report readable without the app. */
  text: string;
  note: string;
  ts: number;
};

export const CONTENT_FLAGS_KEY = 'wordcircle-content-flags-v1';
export const MAX_FLAGS = 200;

const KINDS: readonly ContentFlag['kind'][] = ['word', 'grammar', 'reading', 'story'];

export function normalizeFlags(value: unknown): ContentFlag[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw: unknown) => {
    if (!raw || typeof raw !== 'object') return [];
    const flag = raw as Record<string, unknown>;
    const ts = Number(flag.ts);
    if (typeof flag.item !== 'string' || !flag.item || typeof flag.language !== 'string' || !KINDS.includes(flag.kind as ContentFlag['kind']) || !Number.isFinite(ts)) return [];
    return [{ item: flag.item, kind: flag.kind as ContentFlag['kind'], language: flag.language, text: typeof flag.text === 'string' ? flag.text : '', note: typeof flag.note === 'string' ? flag.note.slice(0, 500) : '', ts }];
  });
}

/** Adds a flag or replaces the one already there for the same item; newest first, capped. */
export function addFlag(flags: readonly ContentFlag[], flag: ContentFlag): ContentFlag[] {
  return [{ ...flag, note: flag.note.trim().slice(0, 500) }, ...flags.filter((existing) => existing.item !== flag.item)].slice(0, MAX_FLAGS);
}

export function removeFlag(flags: readonly ContentFlag[], item: string): ContentFlag[] {
  return flags.filter((flag) => flag.item !== item);
}

/** The flags as plain text, one block per flag, for the learner to paste into a message. */
export function flagsAsText(flags: readonly ContentFlag[]): string {
  return flags.map((flag) => [`[${flag.kind} · ${flag.language}] ${flag.item}`, flag.text, flag.note ? `→ ${flag.note}` : ''].filter(Boolean).join('\n')).join('\n\n');
}

export function readFlags(): ContentFlag[] {
  if (typeof localStorage === 'undefined') return [];
  try { return normalizeFlags(JSON.parse(localStorage.getItem(CONTENT_FLAGS_KEY) ?? '[]')); } catch { return []; }
}

export function writeFlags(flags: readonly ContentFlag[]): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(CONTENT_FLAGS_KEY, JSON.stringify(flags)); } catch { /* storage full: the flag is lost, the round goes on */ }
}
