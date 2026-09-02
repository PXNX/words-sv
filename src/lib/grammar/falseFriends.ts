import type { GrammarPrompt } from './cases';

// Classic German words that look like an English word but mean something else.
// This dataset only covers German (the only target language with a hand-checked
// false-friends list); other target languages fall back to the "unsupported" message.
export type FalseFriendPair = { word: string; correctMeaning: string; trapMeaning: string };

export const falseFriendPairs: FalseFriendPair[] = [
	{ word: 'Gift', correctMeaning: 'poison', trapMeaning: 'gift / present' },
	{ word: 'also', correctMeaning: 'so / therefore', trapMeaning: 'also / too' },
	{ word: 'bekommen', correctMeaning: 'to get / receive', trapMeaning: 'to become' },
	{ word: 'Rat', correctMeaning: 'advice', trapMeaning: 'rat (the animal)' },
	{ word: 'Chef', correctMeaning: 'boss', trapMeaning: 'chef (cook)' },
	{ word: 'eventuell', correctMeaning: 'possibly', trapMeaning: 'eventually' },
	{ word: 'Fabrik', correctMeaning: 'factory', trapMeaning: 'fabric (cloth)' },
	{ word: 'Handy', correctMeaning: 'mobile phone', trapMeaning: 'handy (useful)' },
	{ word: 'Hut', correctMeaning: 'hat', trapMeaning: 'hut (small cabin)' },
	{ word: 'Kind', correctMeaning: 'child', trapMeaning: 'kind (nice)' },
	{ word: 'Mist', correctMeaning: 'manure / dung', trapMeaning: 'mist (fog)' },
	{ word: 'Rock', correctMeaning: 'skirt', trapMeaning: 'rock (stone / music)' },
	{ word: 'See', correctMeaning: 'lake', trapMeaning: 'sea (the ocean)' },
	{ word: 'sensibel', correctMeaning: 'sensitive', trapMeaning: 'sensible (reasonable)' },
	{ word: 'spenden', correctMeaning: 'to donate', trapMeaning: 'to spend (money)' },
	{ word: 'Art', correctMeaning: 'kind / type', trapMeaning: 'art' },
	{ word: 'Brief', correctMeaning: 'letter (mail)', trapMeaning: 'brief (short)' },
	{ word: 'Dom', correctMeaning: 'cathedral', trapMeaning: 'dome' },
	{ word: 'fast', correctMeaning: 'almost', trapMeaning: 'fast (quick)' },
	{ word: 'genial', correctMeaning: 'brilliant', trapMeaning: 'genial (friendly)' },
	{ word: 'irritieren', correctMeaning: 'to confuse', trapMeaning: 'to irritate' },
	{ word: 'Konkurs', correctMeaning: 'bankruptcy', trapMeaning: 'contest / competition' },
	{ word: 'Kraft', correctMeaning: 'strength / power', trapMeaning: 'craft' }
];

export function buildFalseFriendPrompt(pair: FalseFriendPair, pool: FalseFriendPair[], random: () => number, shuffle: <T>(values: T[], random: () => number) => T[]): GrammarPrompt {
	const others = pool.filter((candidate) => candidate.word !== pair.word && candidate.correctMeaning !== pair.correctMeaning && candidate.correctMeaning !== pair.trapMeaning);
	const distractor = others.length > 0 ? others[Math.floor(random() * others.length)].correctMeaning : pair.trapMeaning;
	const choices = shuffle([...new Set([pair.correctMeaning, pair.trapMeaning, distractor])], random);
	return { before: '', after: pair.word, correct: pair.correctMeaning, choices, question: 'Was bedeutet dieses Wort wirklich?' };
}
