import { describe, expect, it } from 'vitest';
import { isCoopRound, isParticipantId, isRoomToken } from './coop';

describe('co-op request validation', () => {
  const validRound = {
    language: 'de' as const,
    words: ['GARTEN', 'GAS', 'TEE'],
    letters: ['G', 'A', 'R', 'T', 'E', 'N'],
    placements: [
      { word: 'GARTEN', row: 0, col: 0, orientation: 'across' as const },
      { word: 'GAS', row: 0, col: 0, orientation: 'down' as const },
      { word: 'TEE', row: 0, col: 3, orientation: 'down' as const }
    ]
  };

  it('accepts a complete German or English shared-board snapshot', () => {
    expect(isCoopRound(validRound)).toBe(true);
    expect(isCoopRound({ ...validRound, language: 'en' })).toBe(true);
  });

  it('rejects unsupported game languages, malformed letters, and mismatched placements', () => {
    expect(isCoopRound({ ...validRound, language: 'ru' })).toBe(false);
    expect(isCoopRound({ ...validRound, letters: ['G', 'A', '1'] })).toBe(false);
    expect(isCoopRound({ ...validRound, placements: validRound.placements.slice(0, 2) })).toBe(false);
    expect(isCoopRound({ ...validRound, words: ['GARTEN', 'GARTEN', 'TEE'] })).toBe(false);
  });

  it('accepts only high-entropy URL-safe room and participant identifiers', () => {
    expect(isRoomToken('a5trW5HQszVw0qBqzZ_Vj8dKUOQqK8wU')).toBe(true);
    expect(isRoomToken('../room')).toBe(false);
    expect(isRoomToken('too-short')).toBe(false);
    expect(isParticipantId('18e59a6d-1c29-42e3-8e91-0b4f3d48b7d8')).toBe(true);
    expect(isParticipantId('guest')).toBe(false);
  });
});
