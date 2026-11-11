/*
 * Partial credit for typed word forms (the "Formen" exercise): the exact form is full credit; the
 * right form with a slip a reader would still understand earns part of it.
 *
 *   exact    1     "gibt"
 *   case     0.9   "Gibt" (only capitalisation differs)
 *   spelling 0.75  "gibt " / "weiss" for "weiß" / "fahrt" for "fährt" (umlaut or ß written plain)
 *   typo     0.5   one letter off in a longer word ("gibr")
 *   wrong    0     anything else, including a different form ("gebt")
 *
 * A typo only counts when the typed word is not itself another form of the same word (`forms`),
 * so "gebt" for "gibt" is a real grammar error, not a slip. Pure, so it can be tested.
 */

export type FormVerdict = 'exact' | 'case' | 'spelling' | 'typo' | 'wrong';

export interface FormScore {
  verdict: FormVerdict;
  credit: number;
}

const CREDIT: Record<FormVerdict, number> = { exact: 1, case: 0.9, spelling: 0.75, typo: 0.5, wrong: 0 };

const tidy = (text: string) => text.trim().replace(/\s+/gu, ' ');
/** Umlauts and ß as typed on a keyboard without them. */
const plain = (text: string) => text.toLocaleLowerCase('de').replace(/ä/gu, 'a').replace(/ö/gu, 'o').replace(/ü/gu, 'u').replace(/ß/gu, 'ss').replace(/ae/gu, 'a').replace(/oe/gu, 'o').replace(/ue/gu, 'u');

/** Levenshtein distance, stopping early once it exceeds `limit`. */
export function editDistance(a: string, b: string, limit = 2): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    let best = row;
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      const value = Math.min(previous[column]! + 1, current[column - 1]! + 1, previous[column - 1]! + cost);
      current.push(value);
      best = Math.min(best, value);
    }
    if (best > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length]!;
}

/** Scores a typed form against the correct one; `forms` are the word's other forms (they never count as typos). */
export function scoreForm(typed: string, correct: string, forms: readonly string[] = []): FormScore {
  const given = tidy(typed);
  const target = tidy(correct);
  const verdict = ((): FormVerdict => {
    if (!given) return 'wrong';
    if (given === target) return 'exact';
    if (given.toLocaleLowerCase('de') === target.toLocaleLowerCase('de')) return 'case';
    const lowerGiven = given.toLocaleLowerCase('de');
    const otherForm = forms.some((form) => tidy(form).toLocaleLowerCase('de') === lowerGiven && tidy(form).toLocaleLowerCase('de') !== target.toLocaleLowerCase('de'));
    if (otherForm) return 'wrong';
    if (plain(given) === plain(target)) return 'spelling';
    if (target.length >= 5 && editDistance(lowerGiven, target.toLocaleLowerCase('de'), 1) <= 1) return 'typo';
    return 'wrong';
  })();
  return { verdict, credit: CREDIT[verdict] };
}

/** Whether the answer counts as right for the review schedule (it may still be graded "hard"). */
export const formCountsAsRight = (score: FormScore) => score.credit >= 0.75;
