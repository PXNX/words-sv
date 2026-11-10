// Spoken forms of numbers, ordinals and clock times for German and English, used where the
// voice reads a figure aloud and in listening exercises ("1.234,5" → "eintausendzweihundert…").

export type SpokenLanguage = 'de' | 'en';

const DE_ONES = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const DE_TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
const EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

// German compounds below one million are written as one word; "eins" becomes "ein" inside them.
function deBelowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let text = hundreds ? `${hundreds === 1 ? 'ein' : DE_ONES[hundreds]!}hundert` : '';
  if (rest) {
    if (rest < 20) text += rest === 1 ? 'eins' : DE_ONES[rest]!;
    else {
      const ones = rest % 10;
      text += `${ones ? `${ones === 1 ? 'ein' : DE_ONES[ones]!}und` : ''}${DE_TENS[Math.floor(rest / 10)]!}`;
    }
  }
  return text;
}

function deInteger(n: number): string {
  if (n === 0) return 'null';
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions) parts.push(millions === 1 ? 'eine Million' : `${deBelowThousand(millions)} Millionen`);
  let tail = '';
  if (thousands) tail += `${thousands === 1 ? 'ein' : deBelowThousand(thousands)}tausend`;
  if (rest) tail += deBelowThousand(rest);
  if (tail) parts.push(tail);
  return parts.join(' ');
}

function enBelowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${EN_ONES[hundreds]!} hundred`);
  if (rest) {
    const words = rest < 20 ? EN_ONES[rest]! : `${EN_TENS[Math.floor(rest / 10)]!}${rest % 10 ? `-${EN_ONES[rest % 10]!}` : ''}`;
    parts.push(hundreds ? `and ${words}` : words);
  }
  return parts.join(' ');
}

function enInteger(n: number): string {
  if (n === 0) return 'zero';
  const groups: Array<[number, string]> = [[1_000_000_000, 'billion'], [1_000_000, 'million'], [1000, 'thousand']];
  const parts: string[] = [];
  let rest = n;
  for (const [size, name] of groups) {
    const count = Math.floor(rest / size);
    if (count) parts.push(`${enBelowThousand(count)} ${name}`);
    rest %= size;
  }
  if (rest) parts.push(rest < 100 && parts.length ? `and ${enBelowThousand(rest)}` : enBelowThousand(rest));
  return parts.join(' ');
}

/** Whole and decimal numbers; decimals are read digit by digit ("Komma fünf", "point five"). */
export function numberToWords(value: number, language: SpokenLanguage): string {
  if (!Number.isFinite(value)) throw new RangeError(`Cannot speak ${value}`);
  const negative = value < 0;
  const [whole, fraction] = Math.abs(value).toString().split('.');
  const integer = Number(whole);
  if (integer >= 1e12) throw new RangeError(`Number too large to speak: ${value}`);
  const ones = language === 'de' ? DE_ONES : EN_ONES;
  let text = language === 'de' ? deInteger(integer) : enInteger(integer);
  if (fraction) text += ` ${language === 'de' ? 'Komma' : 'point'} ${[...fraction].map((digit) => ones[Number(digit)]!).join(' ')}`;
  return negative ? `minus ${text}` : text;
}

const EN_ORDINAL_WORDS: Record<string, string> = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };

/** "sechste" (de, nominative after "der"), "sixth" (en). */
export function ordinalToWords(value: number, language: SpokenLanguage): string {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`Ordinals start at 1: ${value}`);
  if (language === 'de') {
    // 1–19 take "-te" (with a few irregular stems), everything else "-ste"; "101." ends like "1.".
    const special: Record<number, string> = { 1: 'erste', 3: 'dritte', 7: 'siebte', 8: 'achte' };
    const rest = value % 100;
    if (rest >= 1 && rest < 20) {
      const head = value - rest ? deInteger(value - rest) : '';
      return head + (special[rest] ?? `${DE_ONES[rest]!}te`);
    }
    return `${deInteger(value)}ste`;
  }
  const cardinal = enInteger(value);
  const match = /([a-z]+)$/u.exec(cardinal)!;
  const last = match[1]!;
  const ordinal = EN_ORDINAL_WORDS[last] ?? (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`);
  return cardinal.slice(0, match.index) + ordinal;
}

/** Colloquial clock time: "halb drei", "Viertel nach zwei", "kurz vor drei"; "half past two". */
export function timeToWords(hours: number, minutes: number, language: SpokenLanguage): string {
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) throw new RangeError(`Invalid time ${hours}:${minutes}`);
  const hour12 = (h: number) => ((h + 11) % 12) + 1;
  const name = (h: number) => (language === 'de' ? (hour12(h) === 1 ? 'eins' : DE_ONES[hour12(h)]!) : EN_ONES[hour12(h)]!);
  const next = name(hours + 1);
  const current = name(hours);
  if (language === 'de') {
    if (minutes === 0) return `${hour12(hours) === 1 ? 'ein' : current} Uhr`;
    if (minutes === 15) return `Viertel nach ${current}`;
    if (minutes === 30) return `halb ${next}`;
    if (minutes === 45) return `Viertel vor ${next}`;
    if (minutes < 30) return `${deInteger(minutes)} nach ${current}`;
    return `${deInteger(60 - minutes)} vor ${next}`;
  }
  if (minutes === 0) return `${current} o'clock`;
  if (minutes === 15) return `quarter past ${current}`;
  if (minutes === 30) return `half past ${current}`;
  if (minutes === 45) return `quarter to ${next}`;
  if (minutes < 30) return `${enInteger(minutes)} past ${current}`;
  return `${enInteger(60 - minutes)} to ${next}`;
}
