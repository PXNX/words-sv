export type CoopLanguage = 'de' | 'en';
export type CoopOrientation = 'across' | 'down';

export type CoopPlacement = {
  word: string;
  row: number;
  col: number;
  orientation: CoopOrientation;
  reversed?: boolean;
};

export type CoopRound = {
  language: CoopLanguage;
  words: string[];
  letters: string[];
  placements: CoopPlacement[];
};

export type CoopEvent = {
  version: number;
  kind: 'solved';
  word: string;
  actorId: string;
  createdAt: string;
};

export type CoopSnapshot = {
  token: string;
  round: CoopRound;
  solvedWords: string[];
  version: number;
  memberCount: number;
  expiresAt: string;
  events: CoopEvent[];
};

export const ROOM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;
export const PARTICIPANT_ID_PATTERN = /^[A-Za-z0-9_-]{20,80}$/;
const WORD_PATTERN = /^[A-ZÄÖÜẞ]+$/;

export function isRoomToken(value: unknown): value is string {
  return typeof value === 'string' && ROOM_TOKEN_PATTERN.test(value);
}

export function isParticipantId(value: unknown): value is string {
  return typeof value === 'string' && PARTICIPANT_ID_PATTERN.test(value);
}

export function isCoopRound(value: unknown): value is CoopRound {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CoopRound>;
  if (candidate.language !== 'de' && candidate.language !== 'en') return false;
  if (!Array.isArray(candidate.words) || candidate.words.length < 1 || candidate.words.length > 12) return false;
  if (!candidate.words.every((word) => typeof word === 'string' && WORD_PATTERN.test(word) && word.length >= 3 && word.length <= 8)) return false;
  if (new Set(candidate.words).size !== candidate.words.length) return false;
  if (!Array.isArray(candidate.letters) || candidate.letters.length < 3 || candidate.letters.length > 8) return false;
  if (!candidate.letters.every((letter) => typeof letter === 'string' && /^[A-ZÄÖÜẞ]$/.test(letter))) return false;
  if (!Array.isArray(candidate.placements) || candidate.placements.length !== candidate.words.length) return false;
  const uniquePlacements = new Set<string>();
  return candidate.placements.every((placement) => {
    if (!placement || typeof placement !== 'object') return false;
    const entry = placement as Partial<CoopPlacement>;
    if (!candidate.words?.includes(entry.word ?? '')) return false;
    if (!Number.isInteger(entry.row) || !Number.isInteger(entry.col)) return false;
    if (entry.orientation !== 'across' && entry.orientation !== 'down') return false;
    if (typeof entry.reversed !== 'undefined' && typeof entry.reversed !== 'boolean') return false;
    const placementKey = `${entry.word}:${entry.row}:${entry.col}:${entry.orientation}:${entry.reversed ? '1' : '0'}`;
    if (uniquePlacements.has(placementKey)) return false;
    uniquePlacements.add(placementKey);
    return true;
  });
}
