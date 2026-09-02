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

// The recogniser returns several alternative transcripts, each possibly multi-word. Rather than
// concatenating all of them (which produced garbled feedback like "haus haus house"), pick the
// single token — from any alternative — that is closest to the target word, so the learner sees
// one clean guess to compare against.
export function bestGuess(transcripts: string[], target: string): string {
	const normalizedTarget = normalize(target);
	let best = transcripts.find(Boolean) ?? '';
	let bestDistance = Infinity;
	for (const transcript of transcripts) {
		const tokens = transcript.split(/\s+/).filter(Boolean);
		for (const candidate of [...tokens, transcript]) {
			if (!candidate) continue;
			const distance = levenshteinDistance(normalize(candidate), normalizedTarget);
			if (distance < bestDistance) {
				bestDistance = distance;
				best = candidate;
			}
		}
	}
	return best;
}

export type CorrectionSegment = { char: string; status: 'match' | 'sub' | 'missing' };

// Shared edit-distance backtrace: aligns `heardChars` against `targetChars` under an arbitrary
// equality test and returns the target sequence annotated per unit — 'match' where a heard unit
// lined up exactly, 'sub' where a different unit was heard in that slot, and 'missing' where
// nothing in the heard sequence lined up at all. Units the learner added that aren't part of the
// target aren't emitted — they're implied by showing the raw "heard" transcript alongside.
function alignSegments(targetChars: string[], heardChars: string[], sameUnit: (a: string, b: string) => boolean): CorrectionSegment[] {
	const rows = targetChars.length;
	const cols = heardChars.length;
	const dp: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(cols + 1).fill(0));
	for (let i = 0; i <= rows; i++) dp[i][0] = i;
	for (let j = 0; j <= cols; j++) dp[0][j] = j;
	for (let i = 1; i <= rows; i++) {
		for (let j = 1; j <= cols; j++) {
			const cost = sameUnit(targetChars[i - 1], heardChars[j - 1]) ? 0 : 1;
			dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
		}
	}
	const segments: CorrectionSegment[] = [];
	let i = rows;
	let j = cols;
	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (sameUnit(targetChars[i - 1], heardChars[j - 1]) ? 0 : 1)) {
			segments.unshift({ char: targetChars[i - 1], status: sameUnit(targetChars[i - 1], heardChars[j - 1]) ? 'match' : 'sub' });
			i--;
			j--;
		} else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
			segments.unshift({ char: targetChars[i - 1], status: 'missing' });
			i--;
		} else {
			j--;
		}
	}
	return segments;
}

// Compares the IPA transcription of what the learner said against the IPA transcription of the
// target word, symbol by symbol, so the UI can show exactly which sounds were wrong or missing.
// Unlike an orthographic diff this compares raw IPA codepoints without stripping combining marks —
// a nasalisation tilde (e.g. French "ɛ̃") changes the sound, so it must not be normalised away.
export function ipaDiff(spokenIpa: string, targetIpa: string): CorrectionSegment[] {
	return alignSegments([...targetIpa], [...spokenIpa], (a, b) => a === b);
}
