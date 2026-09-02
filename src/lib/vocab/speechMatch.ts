// Compares a speech-recognition transcript against the word being practised. Recognisers
// often return slightly different casing, diacritics or trailing punctuation, so an exact
// string comparison would reject many correct attempts — a small edit-distance tolerance
// (scaled to word length) keeps the check forgiving without accepting unrelated words.

function normalize(value: string): string {
	return value
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/[^\p{L}\p{N}]/gu, '')
		.toLocaleLowerCase();
}

export function levenshteinDistance(a: string, b: string): number {
	if (a === b) return 0;
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

export function wordsMatch(spokenPhrase: string, target: string): boolean {
	const normalizedTarget = normalize(target);
	if (!normalizedTarget) return false;
	// A spoken phrase may contain the target word among filler words ("the word is house"),
	// so check each individual token as well as the whole phrase with spaces collapsed.
	const tokens = spokenPhrase.split(/\s+/).filter(Boolean).map(normalize);
	const candidates = [...tokens, normalize(spokenPhrase)].filter(Boolean);
	const tolerance = normalizedTarget.length <= 3 ? 0 : normalizedTarget.length <= 6 ? 1 : 2;
	return candidates.some((candidate) => levenshteinDistance(candidate, normalizedTarget) <= tolerance);
}
