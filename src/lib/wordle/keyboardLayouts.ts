export type KeyboardLayout = { rows: string[]; extras: string[] };

export const keyboardLayouts: Record<string, KeyboardLayout> = {
  de: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: ['Ä', 'Ö', 'Ü', 'ẞ'] },
  en: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: [] },
  fr: { rows: ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'], extras: ['À', 'É', 'È', 'Ê', 'Ë', 'Î', 'Ï', 'Ô', 'Ù', 'Û', 'Ü', 'Ç', 'Œ'] },
  it: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: ['À', 'È', 'É', 'Ì', 'Ò', 'Ù'] },
  es: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: ['Á', 'É', 'Í', 'Ó', 'Ú', 'Ü', 'Ñ'] },
  pt: { rows: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], extras: ['Á', 'À', 'Â', 'Ã', 'É', 'Ê', 'Í', 'Ó', 'Ô', 'Õ', 'Ú', 'Ç'] },
  uk: { rows: ['ЙЦУКЕНГШЩЗХ', 'ФІВАПРОЛДЖЄ', 'ЯЧСМИТЬБЮ'], extras: ['Ґ', 'Ї'] }
};

export function keyboardLayoutFor(language: string): KeyboardLayout {
  return keyboardLayouts[language] ?? keyboardLayouts.en;
}

export type WordleMark = 'correct' | 'present' | 'absent';

/** Best mark seen so far per letter, so a key already used stays visibly "spent" (grey/orange/green) instead of looking untouched. */
export function keyboardMarksFrom(entries: ReadonlyArray<{ word: string; marks: WordleMark[] }>): Record<string, WordleMark> {
  const priority: Record<WordleMark, number> = { absent: 1, present: 2, correct: 3 };
  const marks: Record<string, WordleMark> = {};
  for (const entry of entries) {
    for (const [index, letter] of Array.from(entry.word).entries()) {
      const mark = entry.marks[index];
      if (!marks[letter] || priority[mark] > priority[marks[letter]]) marks[letter] = mark;
    }
  }
  return marks;
}
