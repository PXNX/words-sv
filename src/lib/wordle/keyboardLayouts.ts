export type KeyboardLayout = { rows: string[]; extras: string[] };

export const keyboardLayouts: Record<string, KeyboardLayout> = {
  de: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: ['Ä', 'Ö', 'Ü'] },
  en: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: [] },
  fr: { rows: ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'], extras: ['À', 'É', 'È', 'Ê', 'Ë', 'Î', 'Ï', 'Ô', 'Ù', 'Û', 'Ü', 'Ç', 'Œ'] },
  it: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: ['À', 'È', 'É', 'Ì', 'Ò', 'Ù'] },
  es: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: ['Á', 'É', 'Í', 'Ó', 'Ú', 'Ü', 'Ñ'] },
  pt: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: ['Á', 'À', 'Â', 'Ã', 'É', 'Ê', 'Í', 'Ó', 'Ô', 'Õ', 'Ú', 'Ç'] },
  uk: { rows: ['ЙЦУКЕНГШЩЗХ', 'ФІВАПРОЛДЖЄ', 'ЯЧСМИТЬБЮ'], extras: ['Ґ', 'Ї'] }
};

export function keyboardLayoutFor(language: string): KeyboardLayout {
  // Every supported interface language has a layout; unknown ones fall back to the English one.
  return keyboardLayouts[language] ?? keyboardLayouts.en!;
}

/** Every letter the on-screen keyboard can type. */
export function layoutLetters(layout: KeyboardLayout): Set<string> {
  return new Set([...layout.rows.join(''), ...layout.extras]);
}

/**
 * Keeps only words the keyboard can actually type, so a round can never ask for a letter that has
 * no key (e.g. CAFÉ on the German keys). German ß is uppercased to SS by the word normalisation,
 * which is why the German keys have no ẞ: it could never be part of a playable word.
 */
export function typeableWords(words: string[], letters: ReadonlySet<string>): string[] {
  return words.filter((word) => Array.from(word).every((letter) => letters.has(letter)));
}

export type PhysicalKey = { kind: 'letters'; value: string } | { kind: 'remove' } | { kind: 'enter' };

/**
 * Maps a physical keyboard's `KeyboardEvent.key` to a game action. Letters are uppercased the same
 * way as guesses (so ß types SS) and only accepted when the layout has keys for them.
 */
export function physicalKeyAction(key: string, letters: ReadonlySet<string>): PhysicalKey | null {
  if (key === 'Backspace') return { kind: 'remove' };
  if (key === 'Enter') return { kind: 'enter' };
  if (Array.from(key).length !== 1) return null;
  const value = key.normalize('NFC').toLocaleUpperCase();
  return Array.from(value).every((letter) => letters.has(letter)) ? { kind: 'letters', value } : null;
}

export type WordleMark = 'correct' | 'present' | 'absent';

/** Best mark seen so far per letter, so a key already used stays visibly "spent" (grey/orange/green) instead of looking untouched. */
export function keyboardMarksFrom(entries: ReadonlyArray<{ word: string; marks: WordleMark[] }>): Record<string, WordleMark> {
  const priority: Record<WordleMark, number> = { absent: 1, present: 2, correct: 3 };
  const marks: Record<string, WordleMark> = {};
  for (const entry of entries) {
    for (const [index, letter] of Array.from(entry.word).entries()) {
      const mark = entry.marks[index]!;
      if (!marks[letter] || priority[mark] > priority[marks[letter]!]) marks[letter] = mark;
    }
  }
  return marks;
}
