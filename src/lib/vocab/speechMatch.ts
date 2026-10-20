import type { Language } from '$lib/data/vocabulary';
import { transcribeToIpa } from '$lib/vocab/ipa';

// Compares a speech-recognition transcript against the word being practised. Recognisers return
// real dictionary words, so a different spelling almost always means a different word ("Maus" for
// "Haus") — orthographic edit-distance tolerance would accept those mispronunciations. Instead an
// attempt counts as correct when it is the same word (ignoring case and punctuation, but not
// diacritics: "schon" ≠ "schön") or when it *sounds* the same, i.e. its broad phonetic key equals
// the target's (homophones like "Seite"/"Saite", or final devoicing in "Rad"/"Rat").

function normalize(value: string): string {
	return value
		.normalize('NFC')
		.toLocaleLowerCase()
		.replace(/ß/g, 'ss')
		.replace(/[^\p{L}\p{M}\p{N}]/gu, '');
}

export function levenshteinDistance<T>(a: ArrayLike<T>, b: ArrayLike<T>): number {
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;
	let previousRow = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let i = 0; i < a.length; i++) {
		const currentRow = [i + 1];
		for (let j = 0; j < b.length; j++) {
			const cost = a[i] === b[j] ? 0 : 1;
			currentRow.push(Math.min(previousRow[j + 1] + 1, currentRow[j] + 1, previousRow[j] + cost));
		}
		previousRow = currentRow;
	}
	return previousRow[b.length];
}

// Splits an IPA string into sound units: a base symbol plus any combining marks, length mark or
// palatalisation that modify it, so "ɛ̃" or "aː" stay one unit instead of two codepoints.
export function ipaUnits(ipa: string): string[] {
	return ipa.normalize('NFC').match(/[^\p{M}ːʲ][\p{M}ːʲ]*/gu) ?? [];
}

// Collapses differences a listener wouldn't hear as a different word: vowel length, the various
// r sounds, and open/closed vowel pairs that the heuristic transcribers only separate by spelling.
const broadSound: Record<string, string> = { ɛ: 'e', ɪ: 'i', ɒ: 'o', ɔ: 'o', ʊ: 'u', ʁ: 'r', ɾ: 'r', ɐ: 'r', ʎ: 'j' };
function broadUnit(unit: string): string {
	const base = unit.replace(/ː/g, '');
	return broadSound[base] ?? base;
}
const finalDevoicing: Record<string, string> = { b: 'p', d: 't', g: 'k', v: 'f', z: 's' };
function phoneticKey(word: string, language: Language): string[] {
	const units = ipaUnits(transcribeToIpa(normalize(word), language)).map(broadUnit).filter(Boolean);
	if (language === 'de' && units.length > 0) units[units.length - 1] = finalDevoicing[units[units.length - 1]] ?? units[units.length - 1];
	// Doubled letters ("Bett", "Sonne") don't lengthen the consonant, so treat a repeat as one sound.
	return units.filter((unit, index) => unit !== units[index - 1]);
}

// Recognisers often write small numbers as digits ("3" for "drei"), which would never match.
const numberWords: Record<Language, string[]> = {
	de: ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'],
	en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'],
	fr: ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze'],
	it: ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci', 'undici', 'dodici'],
	es: ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'],
	pt: ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze'],
	uk: ['нуль', 'один', 'два', 'три', 'чотири', "п'ять", 'шість', 'сім', 'вісім', "дев'ять", 'десять', 'одинадцять', 'дванадцять']
};
function spellOutNumber(token: string, language: Language): string {
	return /^\d+$/.test(token) ? numberWords[language][Number(token)] ?? token : token;
}

// A transcript may contain the target among filler words ("the word is house") or split a compound
// ("Haus Tür"), so every token is a candidate, as is the whole phrase with spaces collapsed.
function candidatesFrom(transcript: string, language: Language): string[] {
	const tokens = transcript.split(/\s+/).filter(Boolean).map((token) => spellOutNumber(token.replace(/[^\p{L}\p{M}\p{N}'’-]/gu, ''), language));
	const candidates = tokens.length > 1 ? [...tokens, tokens.join(' ')] : tokens;
	return candidates.filter((candidate) => normalize(candidate));
}

function soundsLike(candidate: string, target: string, language: Language): boolean {
	if (normalize(candidate) === normalize(target)) return true;
	const candidateKey = phoneticKey(candidate, language);
	const targetKey = phoneticKey(target, language);
	if (candidateKey.length === 0) return false;
	// Long words leave room for one recogniser quirk; short words must sound exactly alike.
	return levenshteinDistance(candidateKey, targetKey) <= (targetKey.length >= 8 ? 1 : 0);
}

export type AttemptResult = { matched: boolean; heard: string };

// The recogniser returns several alternative transcripts, each possibly multi-word. The attempt is
// correct if any candidate from any alternative sounds like the target; otherwise the learner is
// shown the single candidate that sounds closest, so the correction compares like with like.
export function evaluateAttempt(transcripts: string[], target: string, language: Language): AttemptResult {
	const candidates = transcripts.flatMap((transcript) => candidatesFrom(transcript, language));
	const match = candidates.find((candidate) => soundsLike(candidate, target, language));
	if (match) return { matched: true, heard: match };
	const targetKey = phoneticKey(target, language);
	let heard = candidates[0] ?? '';
	let bestDistance = Infinity;
	for (const candidate of candidates) {
		const distance = levenshteinDistance(phoneticKey(candidate, language), targetKey);
		if (distance < bestDistance) {
			bestDistance = distance;
			heard = candidate;
		}
	}
	return { matched: false, heard };
}

export type CorrectionSegment = { char: string; status: 'match' | 'sub' | 'missing' | 'extra' };

// Aligns the learner's sounds against the target's with an edit-distance backtrace and returns the
// target annotated per sound unit: 'match' where the same sound (ignoring length) was heard, 'sub'
// where a different sound took its place, 'missing' where nothing lined up, plus 'extra' entries
// for sounds the learner added that the word doesn't have.
export function ipaDiff(spokenIpa: string, targetIpa: string): CorrectionSegment[] {
	const target = ipaUnits(targetIpa);
	const heard = ipaUnits(spokenIpa);
	const same = (a: string, b: string) => broadUnit(a) === broadUnit(b);
	const rows = target.length;
	const cols = heard.length;
	const dp: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(cols + 1).fill(0));
	for (let i = 0; i <= rows; i++) dp[i][0] = i;
	for (let j = 0; j <= cols; j++) dp[0][j] = j;
	for (let i = 1; i <= rows; i++) {
		for (let j = 1; j <= cols; j++) {
			dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (same(target[i - 1], heard[j - 1]) ? 0 : 1));
		}
	}
	const segments: CorrectionSegment[] = [];
	let i = rows;
	let j = cols;
	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (same(target[i - 1], heard[j - 1]) ? 0 : 1)) {
			segments.unshift({ char: target[i - 1], status: same(target[i - 1], heard[j - 1]) ? 'match' : 'sub' });
			i--;
			j--;
		} else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
			segments.unshift({ char: target[i - 1], status: 'missing' });
			i--;
		} else {
			segments.unshift({ char: heard[j - 1], status: 'extra' });
			j--;
		}
	}
	return segments;
}
