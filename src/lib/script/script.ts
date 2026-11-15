// The writing systems behind the playable languages. Latin-script languages have no entry, so a
// word is shown exactly as it is written; the others list their letters with the Latin sound each
// one stands for. The table drives two things: the script mode's letter cards, and the small
// transliteration that sits under a word wherever the app shows it.
import type { Language } from '#lib/data/vocabulary.js';

export type ScriptLetter = { letter: string; latin: string; name?: string };
export type ScriptInfo = { direction: 'ltr' | 'rtl'; letters: readonly ScriptLetter[] };

// The Ukrainian alphabet in its usual order, with the national romanisation. A letter's name is
// what it is called aloud ("be", not "b"), ready for the day the mode speaks the alphabet.
const UKRAINIAN: ScriptInfo = {
  direction: 'ltr',
  letters: [
    { letter: 'А', latin: 'a', name: 'а' },
    { letter: 'Б', latin: 'b', name: 'бе' },
    { letter: 'В', latin: 'v', name: 'ве' },
    { letter: 'Г', latin: 'h', name: 'ге' },
    { letter: 'Ґ', latin: 'g', name: 'ґе' },
    { letter: 'Д', latin: 'd', name: 'де' },
    { letter: 'Е', latin: 'e', name: 'е' },
    { letter: 'Є', latin: 'ie', name: 'є' },
    { letter: 'Ж', latin: 'zh', name: 'же' },
    { letter: 'З', latin: 'z', name: 'зе' },
    { letter: 'И', latin: 'y', name: 'и' },
    { letter: 'І', latin: 'i', name: 'і' },
    { letter: 'Ї', latin: 'yi', name: 'ї' },
    { letter: 'Й', latin: 'y', name: 'йот' },
    { letter: 'К', latin: 'k', name: 'ка' },
    { letter: 'Л', latin: 'l', name: 'ел' },
    { letter: 'М', latin: 'm', name: 'ем' },
    { letter: 'Н', latin: 'n', name: 'ен' },
    { letter: 'О', latin: 'o', name: 'о' },
    { letter: 'П', latin: 'p', name: 'пе' },
    { letter: 'Р', latin: 'r', name: 'ер' },
    { letter: 'С', latin: 's', name: 'ес' },
    { letter: 'Т', latin: 't', name: 'те' },
    { letter: 'У', latin: 'u', name: 'у' },
    { letter: 'Ф', latin: 'f', name: 'еф' },
    { letter: 'Х', latin: 'kh', name: 'ха' },
    { letter: 'Ц', latin: 'ts', name: 'це' },
    { letter: 'Ч', latin: 'ch', name: 'че' },
    { letter: 'Ш', latin: 'sh', name: 'ша' },
    { letter: 'Щ', latin: 'shch', name: 'ща' },
    { letter: 'Ь', latin: '’', name: 'м’який знак' },
    { letter: 'Ю', latin: 'iu', name: 'ю' },
    { letter: 'Я', latin: 'ia', name: 'я' }
  ]
};

const scripts: Partial<Record<Language, ScriptInfo>> = { uk: UKRAINIAN };

/** A language's writing system, or undefined when it is written in Latin letters. */
export function scriptFor(language: Language): ScriptInfo | undefined {
  return scripts[language];
}

/** The Latin reading of a word, letter by letter: "дім" reads "dim", "Щука" reads "Shchuka".
 * Letters the script does not know pass through, so a mixed word stays readable. */
export function transliterate(language: Language, word: string): string {
  const info = scripts[language];
  if (!info || !word) return '';
  const graphemes = [...info.letters].sort((a, b) => b.letter.length - a.letter.length);
  const chars = [...word];
  let out = '';
  for (let index = 0; index < chars.length; index += 1) {
    const rest = chars.slice(index).join('');
    const grapheme = graphemes.find((entry) => rest.toLowerCase().startsWith(entry.letter.toLowerCase()));
    if (grapheme) {
      out += grapheme.latin;
      index += [...grapheme.letter].length - 1;
    } else {
      out += chars[index]!;
    }
  }
  // Keep the word's shape: a shouted word stays shouted, a capitalised one keeps its cap.
  if (word === word.toUpperCase()) return out.toUpperCase();
  return word[0] === word[0]!.toUpperCase() ? out.charAt(0).toUpperCase() + out.slice(1) : out;
}
