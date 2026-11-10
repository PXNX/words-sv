import type { GrammarPrompt } from './cases';

/*
 * False friends: a word in the language being learned that looks like a word of a language the
 * learner already speaks, but means something else. Each set belongs to one learned language
 * (German or English) and one "source" language, and its meanings are written in that source
 * language, so a Russian speaker learning German reads "консервная банка" and the trap "доза".
 *
 * The source is the interface language; when there is no set for it, German falls back to the
 * English set (English is the most common bridge language) and English to the German one.
 */
export type FalseFriendPair = {
	/** The word in the learned language. */
	word: string;
	/** What it really means, in the source language. */
	correctMeaning: string;
	/** What the look-alike in the source language means. */
	trapMeaning: string;
};

export type FalseFriendTarget = 'de' | 'en';
export type FalseFriendSource = 'en' | 'de' | 'ru' | 'uk' | 'pt';

const pair = (word: string, correctMeaning: string, trapMeaning: string): FalseFriendPair => ({ word, correctMeaning, trapMeaning });

export const falseFriendSets: Record<FalseFriendTarget, Partial<Record<FalseFriendSource, FalseFriendPair[]>>> = {
	de: {
		en: [
			pair('Gift', 'poison', 'gift / present'),
			pair('also', 'so / therefore', 'also / too'),
			pair('bekommen', 'to get / receive', 'to become'),
			pair('Rat', 'advice', 'rat (the animal)'),
			pair('Chef', 'boss', 'chef (cook)'),
			pair('eventuell', 'possibly', 'eventually'),
			pair('Fabrik', 'factory', 'fabric (cloth)'),
			pair('Handy', 'mobile phone', 'handy (useful)'),
			pair('Hut', 'hat', 'hut (small cabin)'),
			pair('Kind', 'child', 'kind (nice)'),
			pair('Mist', 'manure / dung', 'mist (fog)'),
			pair('Rock', 'skirt', 'rock (stone / music)'),
			pair('See', 'lake', 'sea (the ocean)'),
			pair('sensibel', 'sensitive', 'sensible (reasonable)'),
			pair('spenden', 'to donate', 'to spend (money)'),
			pair('Art', 'kind / type', 'art'),
			pair('Brief', 'letter (mail)', 'brief (short)'),
			pair('Dom', 'cathedral', 'dome'),
			pair('fast', 'almost', 'fast (quick)'),
			pair('genial', 'brilliant', 'genial (friendly)'),
			pair('irritieren', 'to confuse', 'to irritate'),
			pair('Konkurs', 'bankruptcy', 'contest / competition'),
			pair('Kraft', 'strength / power', 'craft'),
			pair('bald', 'soon', 'bald (no hair)'),
			pair('brav', 'well-behaved', 'brave'),
			pair('aktuell', 'current / up to date', 'actual (real)'),
			pair('Billion', 'trillion', 'billion'),
			pair('Gymnasium', 'secondary school', 'gym'),
			pair('Mappe', 'folder', 'map'),
			pair('wer', 'who', 'where'),
			pair('Menü', 'set meal', 'menu (the list)'),
			pair('Pickel', 'pimple', 'pickle'),
			pair('Igel', 'hedgehog', 'eagle'),
			pair('Stadium', 'stage / phase', 'stadium'),
			pair('Note', 'mark / grade', 'note (a short message)')
		],
		ru: [
			pair('Magazin', 'журнал; склад', 'магазин'),
			pair('Termin', 'назначенная встреча, приём', 'термин'),
			pair('Bank', 'скамейка; банк', 'банка'),
			pair('Dose', 'консервная банка', 'доза'),
			pair('Artist', 'цирковой артист, акробат', 'актёр'),
			pair('Kabinett', 'кабинет министров', 'рабочий кабинет'),
			pair('Akademiker', 'человек с высшим образованием', 'академик'),
			pair('Kur', 'курс лечения на курорте', 'курица'),
			pair('Dach', 'крыша', 'дача'),
			pair('Familie', 'семья', 'фамилия'),
			pair('Kompott', 'компот (из варёных фруктов, как десерт)', 'напиток'),
			pair('Datum', 'дата', 'данные'),
			pair('Kanzlei', 'адвокатская контора', 'канцелярия, канцтовары')
		],
		uk: [
			pair('Magazin', 'журнал; склад', 'магазин'),
			pair('Termin', 'призначена зустріч, запис', 'термін'),
			pair('Bank', 'лавка; банк', 'банка'),
			pair('Dose', 'консервна банка', 'доза'),
			pair('Artist', 'цирковий артист, акробат', 'актор'),
			pair('Kabinett', 'кабінет міністрів', 'робочий кабінет'),
			pair('Akademiker', 'людина з вищою освітою', 'академік'),
			pair('Dach', 'дах', 'дача'),
			pair('Familie', 'родина', 'прізвище'),
			pair('Datum', 'дата', 'дані'),
			pair('Kanzlei', 'адвокатська контора', 'канцелярія, канцтовари'),
			pair('Kur', 'курс лікування на курорті', 'курка')
		],
		pt: [
			pair('Mais', 'milho', 'mais (quantidade)'),
			pair('Mappe', 'pasta (para papéis)', 'mapa'),
			pair('Gymnasium', 'escola secundária', 'ginásio'),
			pair('Konto', 'conta bancária', 'conto (história)'),
			pair('Novelle', 'novela literária curta', 'novela (de televisão)'),
			pair('Tablett', 'tabuleiro, bandeja', 'tablet'),
			pair('Rente', 'reforma, pensão', 'renda'),
			pair('Tor', 'portão; golo', 'torre')
		]
	},
	en: {
		de: [
			pair('become', 'werden', 'bekommen'),
			pair('gift', 'Geschenk', 'Gift'),
			pair('chef', 'Koch', 'Chef'),
			pair('eventually', 'schließlich, irgendwann', 'eventuell'),
			pair('sensible', 'vernünftig', 'sensibel'),
			pair('brave', 'mutig', 'brav'),
			pair('actual', 'tatsächlich', 'aktuell'),
			pair('art', 'Kunst', 'Art'),
			pair('fabric', 'Stoff', 'Fabrik'),
			pair('handy', 'praktisch', 'Handy'),
			pair('kind', 'freundlich', 'Kind'),
			pair('map', 'Landkarte', 'Mappe'),
			pair('mist', 'Nebel', 'Mist'),
			pair('spend', 'ausgeben (Geld)', 'spenden'),
			pair('also', 'auch', 'also'),
			pair('bald', 'kahl, glatzköpfig', 'bald'),
			pair('billion', 'Milliarde', 'Billion'),
			pair('gymnasium', 'Turnhalle', 'Gymnasium'),
			pair('rock', 'Fels', 'Rock'),
			pair('sea', 'Meer', 'See'),
			pair('where', 'wo', 'wer'),
			pair('will', 'werden (Zukunft)', 'will (wollen)'),
			pair('undertaker', 'Bestatter', 'Unternehmer'),
			pair('confession', 'Geständnis', 'Konfession'),
			pair('consequent', 'daraus folgend', 'konsequent')
		],
		ru: [
			pair('magazine', 'журнал', 'магазин'),
			pair('artist', 'художник', 'артист'),
			pair('accurate', 'точный', 'аккуратный'),
			pair('fabric', 'ткань', 'фабрика'),
			pair('decade', 'десятилетие', 'декада (десять дней)'),
			pair('family', 'семья', 'фамилия'),
			pair('data', 'данные', 'дата'),
			pair('sympathetic', 'сочувствующий', 'симпатичный'),
			pair('prospect', 'перспектива', 'проспект'),
			pair('list', 'список', 'лист'),
			pair('angina', 'стенокардия', 'ангина'),
			pair('complexion', 'цвет лица', 'комплекция'),
			pair('replica', 'точная копия', 'реплика'),
			pair('genial', 'добродушный', 'гениальный')
		],
		uk: [
			pair('magazine', 'журнал', 'магазин'),
			pair('artist', 'художник', 'артист'),
			pair('accurate', 'точний', 'акуратний'),
			pair('fabric', 'тканина', 'фабрика'),
			pair('decade', 'десятиліття', 'декада (десять днів)'),
			pair('data', 'дані', 'дата'),
			pair('sympathetic', 'співчутливий', 'симпатичний'),
			pair('prospect', 'перспектива', 'проспект'),
			pair('list', 'список', 'лист'),
			pair('angina', 'стенокардія', 'ангіна'),
			pair('complexion', 'колір обличчя', 'комплекція'),
			pair('replica', 'точна копія', 'репліка')
		],
		pt: [
			pair('actually', 'na verdade', 'atualmente'),
			pair('pretend', 'fingir', 'pretender'),
			pair('push', 'empurrar', 'puxar'),
			pair('library', 'biblioteca', 'livraria'),
			pair('exquisite', 'requintado', 'esquisito'),
			pair('parents', 'pais', 'parentes'),
			pair('lunch', 'almoço', 'lanche'),
			pair('college', 'faculdade', 'colégio'),
			pair('fabric', 'tecido', 'fábrica'),
			pair('novel', 'romance', 'novela'),
			pair('costume', 'fantasia, disfarce', 'costume (hábito)'),
			pair('injury', 'lesão, ferimento', 'injúria'),
			pair('comprehensive', 'abrangente', 'compreensivo'),
			pair('assist', 'ajudar', 'assistir (ver)'),
			pair('realize', 'perceber', 'realizar')
		]
	}
};

const FALLBACK: Record<FalseFriendTarget, FalseFriendSource> = { de: 'en', en: 'de' };

/** The set for a learned language as seen from the interface language, or null without one. */
export function falseFriendsFor(target: string, interfaceLocale: string): { source: FalseFriendSource; pairs: FalseFriendPair[] } | null {
	if (target !== 'de' && target !== 'en') return null;
	const sets = falseFriendSets[target];
	const spoken = interfaceLocale.split('-')[0] as FalseFriendSource;
	const source = spoken !== target && sets[spoken]?.length ? spoken : FALLBACK[target];
	const pairs = sets[source];
	return pairs?.length ? { source, pairs } : null;
}

export function buildFalseFriendPrompt(pair: FalseFriendPair, pool: FalseFriendPair[], random: () => number, shuffle: <T>(values: T[], random: () => number) => T[], question: string): GrammarPrompt {
	const others = pool.filter((candidate) => candidate.word !== pair.word && candidate.correctMeaning !== pair.correctMeaning && candidate.correctMeaning !== pair.trapMeaning);
	const distractor = others.length > 0 ? (others[Math.floor(random() * others.length)]!.correctMeaning) : pair.trapMeaning;
	const choices = shuffle([...new Set([pair.correctMeaning, pair.trapMeaning, distractor])], random);
	return { before: '', after: pair.word, correct: pair.correctMeaning, choices, question };
}
