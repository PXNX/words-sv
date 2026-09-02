import type { Language } from '$lib/data/vocabulary';

// Approximate grapheme-to-phoneme transcription used only to give learners a rough
// pronunciation hint next to a word. These are heuristic rule sets, not a full
// phonological analyser, so they won't always match a dictionary's IPA exactly.

type Rule = [RegExp, string];

function applyRules(word: string, multiCharRules: Rule[], singleCharMap: Record<string, string>): string {
	let working = word;
	const placeholderIpa: string[] = [];
	multiCharRules.forEach(([pattern, ipa], index) => {
		const placeholder = String.fromCodePoint(0xe000 + index);
		working = working.replace(pattern, placeholder);
		placeholderIpa[index] = ipa;
	});
	const mapped = [...working]
		.map((char) => {
			const code = char.codePointAt(0) ?? 0;
			if (code >= 0xe000 && code < 0xe000 + placeholderIpa.length) return placeholderIpa[code - 0xe000];
			return singleCharMap[char] ?? char;
		})
		.join('');
	return mapped;
}

function germanIpa(word: string): string {
	const multiCharRules: Rule[] = [
		[/tsch/g, 'tʃ'],
		[/sch/g, 'ʃ'],
		[/chs/g, 'ks'],
		[/ck/g, 'k'],
		[/pf/g, 'pf'],
		[/ph/g, 'f'],
		[/th/g, 't'],
		[/qu/g, 'kv'],
		[/ng/g, 'ŋ'],
		[/nk/g, 'ŋk'],
		[/ie/g, 'iː'],
		[/ei/g, 'aɪ'],
		[/ai/g, 'aɪ'],
		[/äu/g, 'ɔʏ'],
		[/eu/g, 'ɔʏ'],
		[/au/g, 'aʊ'],
		[/aa/g, 'aː'],
		[/ee/g, 'eː'],
		[/oo/g, 'oː'],
		[/(?<=[aou])h/g, 'ː'],
		[/(?<=[aou])ch/g, 'x'],
		[/ch/g, 'ç'],
		[/ß/g, 's'],
		[/^s(?=[aeiouäöü])/g, 'z'],
		[/v/g, 'f'],
		[/w/g, 'v'],
		[/z/g, 'ts'],
		[/ä/g, 'ɛ'],
		[/ö/g, 'ø'],
		[/ü/g, 'y'],
		[/c(?=[eiäöü])/g, 'ts'],
		[/r$/g, 'ɐ'],
		[/r/g, 'ʁ']
	];
	const singleCharMap: Record<string, string> = { j: 'j', c: 'k', y: 'y' };
	return applyRules(word, multiCharRules, singleCharMap);
}

function englishIpa(word: string): string {
	const multiCharRules: Rule[] = [
		[/tion/g, 'ʃən'],
		[/sion/g, 'ʒən'],
		[/igh/g, 'aɪ'],
		[/ough/g, 'ʌf'],
		[/augh/g, 'ɔː'],
		[/eigh/g, 'eɪ'],
		[/ee/g, 'iː'],
		[/oo/g, 'uː'],
		[/ea/g, 'iː'],
		[/ay/g, 'eɪ'],
		[/ai/g, 'eɪ'],
		[/oa/g, 'oʊ'],
		[/ow/g, 'oʊ'],
		[/ou/g, 'aʊ'],
		[/wh/g, 'w'],
		[/th/g, 'θ'],
		[/sh/g, 'ʃ'],
		[/ch/g, 'tʃ'],
		[/ph/g, 'f'],
		[/ck/g, 'k'],
		[/ng/g, 'ŋ'],
		[/qu/g, 'kw'],
		[/g(?=[eiy])/g, 'dʒ'],
		[/c(?=[eiy])/g, 's'],
		[/j/g, 'dʒ'],
		[/x/g, 'ks'],
		[/a/g, 'æ'],
		[/e$/g, ''],
		[/e/g, 'ɛ'],
		[/i/g, 'ɪ'],
		[/o/g, 'ɒ'],
		[/u/g, 'ʌ'],
		[/y/g, 'ɪ']
	];
	return applyRules(word, multiCharRules, {});
}

function frenchIpa(word: string): string {
	const multiCharRules: Rule[] = [
		[/eau/g, 'o'],
		[/eu/g, 'ø'],
		[/ai|ei/g, 'ɛ'],
		[/au/g, 'o'],
		[/ou/g, 'u'],
		[/oi/g, 'wa'],
		[/ille/g, 'ij'],
		[/gn/g, 'ɲ'],
		[/ch/g, 'ʃ'],
		[/qu/g, 'k'],
		[/ain|ein/g, 'ɛ̃'],
		[/an|en/g, 'ɑ̃'],
		[/on/g, 'ɔ̃'],
		[/un/g, 'œ̃'],
		[/in/g, 'ɛ̃'],
		[/ç/g, 's'],
		[/é/g, 'e'],
		[/è|ê/g, 'ɛ'],
		[/ô/g, 'o'],
		[/h/g, ''],
		[/[sdtxz]$/g, ''],
		[/e$/g, ''],
		[/g(?=[eiy])/g, 'ʒ'],
		[/c(?=[eiy])/g, 's'],
		[/j/g, 'ʒ'],
		[/r/g, 'ʁ']
	];
	return applyRules(word, multiCharRules, {});
}

function italianIpa(word: string): string {
	const multiCharRules: Rule[] = [
		[/gli/g, 'ʎi'],
		[/gn/g, 'ɲ'],
		[/sch(?=[ei])/g, 'sk'],
		[/sc(?=[ei])/g, 'ʃ'],
		[/ch/g, 'k'],
		[/gh/g, 'g'],
		[/gi(?=[aeou])/g, 'dʒ'],
		[/g(?=[ei])/g, 'dʒ'],
		[/ci(?=[aeou])/g, 'tʃ'],
		[/c(?=[ei])/g, 'tʃ'],
		[/zz|z/g, 'ts'],
		[/qu/g, 'kw']
	];
	return applyRules(word, multiCharRules, {});
}

function spanishIpa(word: string): string {
	const multiCharRules: Rule[] = [
		[/ch/g, 'tʃ'],
		[/ll/g, 'ʎ'],
		[/rr/g, 'r'],
		[/ñ/g, 'ɲ'],
		[/gü/g, 'gw'],
		[/gu(?=[ei])/g, 'g'],
		[/qu/g, 'k'],
		[/j/g, 'x'],
		[/g(?=[ei])/g, 'x'],
		[/z/g, 'θ'],
		[/c(?=[ei])/g, 'θ'],
		[/v/g, 'b'],
		[/h/g, ''],
		[/^r/g, 'r'],
		[/r/g, 'ɾ']
	];
	return applyRules(word, multiCharRules, {});
}

function portugueseIpa(word: string): string {
	const multiCharRules: Rule[] = [
		[/lh/g, 'ʎ'],
		[/nh/g, 'ɲ'],
		[/ch/g, 'ʃ'],
		[/ão/g, 'ɐ̃w̃'],
		[/õe/g, 'õj'],
		[/qu(?=[ei])/g, 'k'],
		[/gu(?=[ei])/g, 'g'],
		[/ç/g, 's'],
		[/j/g, 'ʒ'],
		[/g(?=[ei])/g, 'ʒ'],
		[/rr/g, 'ʁ'],
		[/^r/g, 'ʁ'],
		[/s(?=[aeiouáéíóúâêîôû])/g, 'z']
	];
	return applyRules(word, multiCharRules, {});
}

function ukrainianIpa(word: string): string {
	const singleCharMap: Record<string, string> = {
		а: 'a', б: 'b', в: 'v', г: 'ɦ', ґ: 'g', д: 'd', е: 'e', є: 'je', ж: 'ʒ', з: 'z',
		и: 'ɪ', і: 'i', ї: 'ji', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
		р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'tʃ', ш: 'ʃ', ю: 'ju',
		я: 'ja', ь: 'ʲ', "'": ''
	};
	const multiCharRules: Rule[] = [[/щ/g, 'ʃtʃ']];
	return applyRules(word, multiCharRules, singleCharMap);
}

const transcribers: Record<Language, (word: string) => string> = {
	de: germanIpa,
	en: englishIpa,
	fr: frenchIpa,
	it: italianIpa,
	es: spanishIpa,
	pt: portugueseIpa,
	uk: ukrainianIpa
};

export function transcribeToIpa(word: string, language: Language): string {
	if (!word) return '';
	const transcriber = transcribers[language] ?? ((value: string) => value);
	return transcriber(word.toLocaleLowerCase());
}
