/*
 * English text to the IPA phonemes Kokoro and Kitten TTS read (both StyleTTS 2 models, see
 * styleTts.worker.ts). eSpeak NG (the `phonemizer` package) does the conversion but drops
 * punctuation, which the models need for pauses and intonation, so the text is split at punctuation
 * first and only the words in between are phonemized. The fix-ups after it are the ones kokoro-js
 * applies (github.com/hexgrad/kokoro, Apache 2.0). Pure: the phonemizer is passed in, so this file
 * stays testable without the 2.6 MB eSpeak build.
 */

/** eSpeak's American or British English. */
export type EnglishAccent = 'en-us' | 'en-gb';
export type Phonemize = (text: string, language: string) => Promise<string[]>;

// The eSpeak voice for each accent. phonemizer's "en-gb" still reads American English; "en" is
// British (Received Pronunciation), which is also what kokoro-js passes for its British voices.
const ESPEAK_VOICE: Record<EnglishAccent, string> = { 'en-us': 'en-us', 'en-gb': 'en' };

const PUNCTUATION = ';:,.!?¡¿—…"«»“”(){}[]';
const escaped = PUNCTUATION.replace(/[\]\\[^-]/g, '\\$&');
const PUNCTUATION_RUN = new RegExp(`(\\s*[${escaped}]+\\s*)+`, 'g');

/** Splits text into alternating word and punctuation sections, keeping both. */
export function splitPunctuation(text: string): { punctuation: boolean; text: string }[] {
  const sections: { punctuation: boolean; text: string }[] = [];
  let at = 0;
  for (const match of text.matchAll(PUNCTUATION_RUN)) {
    if (match.index > at) sections.push({ punctuation: false, text: text.slice(at, match.index) });
    sections.push({ punctuation: true, text: match[0] });
    at = match.index + match[0].length;
  }
  if (at < text.length) sections.push({ punctuation: false, text: text.slice(at) });
  return sections;
}

/** Typographic quotes and dashes the phonemizer would read out or drop, as the plain marks the models know. */
export function normalizeEnglish(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[„‟]/g, '"')
    .replace(/[–]/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

/** kokoro-js's corrections of eSpeak's output to Kokoro's phoneme set. */
export function fixPhonemes(phonemes: string, accent: EnglishAccent): string {
  let fixed = phonemes
    .replace(/kəkˈoːɹoʊ/g, 'kˈoʊkəɹoʊ')
    .replace(/kəkˈɔːɹəʊ/g, 'kˈəʊkəɹəʊ')
    .replace(/ʲ/g, 'j')
    .replace(/r/g, 'ɹ')
    .replace(/x/g, 'k')
    .replace(/ɬ/g, 'l')
    .replace(/(?<=[a-zɹː])(?=hˈʌndɹɪd)/g, ' ')
    .replace(/ z(?=[;:,.!?¡¿—…"«»“” ]|$)/g, 'z');
  if (accent === 'en-us') fixed = fixed.replace(/(?<=nˈaɪn)ti(?!ː)/g, 'di');
  return fixed.trim();
}

/** The phonemes of `text` in the given accent, punctuation kept in place. */
export async function englishPhonemes(text: string, accent: EnglishAccent, phonemize: Phonemize): Promise<string> {
  const sections = splitPunctuation(normalizeEnglish(text));
  const parts = await Promise.all(sections.map(async (section) => (section.punctuation ? section.text : (await phonemize(section.text, ESPEAK_VOICE[accent])).join(' '))));
  return fixPhonemes(parts.join(''), accent);
}
