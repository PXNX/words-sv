/**
 * Pure word-bank helpers. Kept free of Svelte runes and browser APIs so the ordering can be
 * tested in Node like the other pure helpers.
 */

/** The whole level, but with the words of the current round generated first. */
export function orderWords(pool: readonly string[], priority: readonly string[] = []) {
	const available = new Set(pool);
	const seen = new Set<string>();
	const ordered: string[] = [];
	for (const word of priority) {
		if (!available.has(word) || seen.has(word)) continue;
		seen.add(word);
		ordered.push(word);
	}
	for (const word of pool) {
		if (seen.has(word)) continue;
		seen.add(word);
		ordered.push(word);
	}
	return ordered;
}
