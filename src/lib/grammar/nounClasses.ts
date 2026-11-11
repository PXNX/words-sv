// Which sentences a German noun can stand in without sounding absurd. The drills build their
// sentences from the level's vocabulary, and "Ich helfe dem Prozent gern" or "ein junges Formular"
// teaches a wrong feel for the words even when the grammar is right. So nouns are sorted into
// people, things and everything else, each with sentences that fit, and adjectives say which of
// the two they describe naturally.
export type NounClass = 'person' | 'thing' | 'other';

const PERSON_NOUNS = new Set([
  'mann', 'frau', 'kind', 'junge', 'mädchen', 'freund', 'freundin', 'lehrer', 'lehrerin', 'arzt', 'ärztin', 'nachbar', 'nachbarin',
  'kollege', 'kollegin', 'chef', 'chefin', 'bruder', 'schwester', 'vater', 'mutter', 'sohn', 'tochter', 'onkel', 'tante',
  'großvater', 'großmutter', 'opa', 'oma', 'gast', 'kunde', 'kundin', 'student', 'studentin', 'schüler', 'schülerin',
  'verkäufer', 'verkäuferin', 'fahrer', 'polizist', 'sänger', 'sängerin', 'musiker', 'autor', 'tourist', 'partner', 'partnerin',
  'vermieter', 'ehemann', 'ehefrau', 'herr', 'dame', 'doktor', 'babysitter', 'kellner', 'kellnerin', 'bäcker', 'koch', 'köchin',
  'ingenieur', 'künstler', 'künstlerin', 'mitarbeiter', 'mitarbeiterin', 'besucher', 'spieler', 'trainer', 'reiseführer', 'cousin', 'cousine'
]);

const THING_NOUNS = new Set([
  'auto', 'tisch', 'stuhl', 'buch', 'lampe', 'fahrrad', 'tasche', 'haus', 'wohnung', 'zimmer', 'bett', 'sofa', 'schrank',
  'jacke', 'hose', 'hemd', 'kleid', 'mantel', 'rock', 'schuh', 'uhr', 'handy', 'computer', 'kamera', 'koffer', 'rucksack',
  'ball', 'bild', 'geschenk', 'tasse', 'flasche', 'glas', 'gitarre', 'klavier', 'garten', 'küche', 'tür', 'fenster', 'brücke',
  'gebäude', 'schiff', 'wagen', 'ring', 'kette', 'kalender', 'heft', 'paket', 'radio', 'drucker', 'kühlschrank', 'herd',
  'regenschirm', 'zelt', 'messer', 'gabel', 'löffel', 'teller', 'tablet', 'bleistift', 'kugelschreiber', 'anzug', 'pullover',
  'brille', 'hut', 'mütze', 'spiegel', 'teppich', 'regal', 'balkon', 'laden', 'hotel', 'restaurant', 'café', 'park', 'museum',
  'kino', 'theater', 'schloss', 'turm', 'kirche', 'schule', 'bahnhof', 'flughafen', 'markt', 'stadt', 'dorf', 'insel'
]);

const PERSON_ADJECTIVES = new Set([
  'alt', 'jung', 'nett', 'freundlich', 'klug', 'dumm', 'krank', 'gesund', 'müde', 'lustig', 'berühmt', 'bekannt', 'reich', 'arm',
  'fleißig', 'faul', 'glücklich', 'nervös', 'ruhig', 'böse', 'ledig', 'verheiratet', 'arbeitslos', 'fremd', 'blond', 'dick', 'dünn',
  'schlank', 'stark', 'schwach', 'streng', 'stolz', 'einsam', 'begabt', 'gebildet', 'fair', 'erwachsen', 'verliebt', 'verletzt',
  'zufrieden', 'pünktlich', 'selbstständig', 'ernst', 'lieb', 'klein', 'groß', 'neu', 'beliebt', 'höflich', 'ehrlich', 'schön',
  'sympathisch', 'aktiv', 'fit', 'laut', 'leise', 'wichtig', 'tot', 'schuldig', 'tätig', 'kräftig', 'lebendig', 'reif'
]);

const THING_ADJECTIVES = new Set([
  'alt', 'neu', 'klein', 'groß', 'schön', 'billig', 'teuer', 'günstig', 'kaputt', 'modern', 'rot', 'blau', 'grün', 'gelb',
  'schwarz', 'weiß', 'braun', 'bunt', 'hell', 'dunkel', 'schwer', 'leicht', 'breit', 'lang', 'kurz', 'sauber', 'leer', 'voll',
  'hässlich', 'bekannt', 'berühmt', 'wunderbar', 'riesig', 'nützlich', 'trocken', 'wertvoll', 'ideal', 'praktisch', 'hoch',
  'gut', 'schlecht', 'schnell', 'langsam', 'laut', 'leise', 'ruhig', 'wichtig', 'normal', 'einfach', 'typisch', 'beliebt',
  'populär', 'seltsam', 'eng', 'tief', 'nutzlos', 'wertlos', 'gewaltig', 'enorm'
]);

export function nounClass(noun: string): NounClass {
  const lower = noun.toLocaleLowerCase();
  return PERSON_NOUNS.has(lower) ? 'person' : THING_NOUNS.has(lower) ? 'thing' : 'other';
}

/** Whether the adjective describes that kind of noun naturally. Anything goes with `other`. */
export function adjectiveFits(adjective: string, kind: NounClass): boolean {
  const lower = adjective.toLocaleLowerCase();
  return kind === 'person' ? PERSON_ADJECTIVES.has(lower) : kind === 'thing' ? THING_ADJECTIVES.has(lower) : true;
}

/** Whether the adjective is one the drills know how to pair, so callers can prefer those. */
export function isDescriptive(adjective: string): boolean {
  const lower = adjective.toLocaleLowerCase();
  return PERSON_ADJECTIVES.has(lower) || THING_ADJECTIVES.has(lower);
}

/**
 * The nouns an adjective should be paired with: people and things it describes naturally. When the
 * list has none of those, the nouns that are neither (so the neutral sentences are used) and only
 * then everything.
 */
export function fittingNouns<T>(adjective: string, nouns: readonly T[], spelling: (noun: T) => string): T[] {
  const fitting = nouns.filter((noun) => {
    const kind = nounClass(spelling(noun));
    return kind !== 'other' && adjectiveFits(adjective, kind);
  });
  if (fitting.length) return fitting;
  const neutral = nouns.filter((noun) => nounClass(spelling(noun)) === 'other');
  return neutral.length ? neutral : [...nouns];
}
