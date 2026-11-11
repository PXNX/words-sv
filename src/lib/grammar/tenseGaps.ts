/*
 * Hand-checked German gap sentences for the grammar that word-based prompts cannot generate: the
 * Perfekt (haben or sein, participles), the Präteritum, the Konjunktiv II, the passive and the
 * genitive. Each sentence has one right answer and wrong answers that are real forms a learner
 * mixes up (the other auxiliary, a regular participle for a strong verb, the indicative for the
 * subjunctive …), so every wrong choice teaches something. Levels follow the usual curricula:
 * Perfekt from A2, Präteritum of everyday verbs from A2/B1, Konjunktiv II and passive from B1,
 * genitive and Konjunktiv II past from B2.
 */
import type { Level } from '#lib/domain/types.js';
import { featureKey, type FeatureKey } from './taxonomy.js';
import type { GrammarPrompt } from './cases';

export interface TenseGap {
  id: string;
  level: Level;
  before: string;
  after: string;
  correct: string;
  wrong: readonly string[];
  features: readonly FeatureKey[];
}

const PERFEKT = featureKey('de', 'verb', 'tense', 'perfekt');
const PRAETERITUM = featureKey('de', 'verb', 'tense', 'praeteritum');
const PLUSQUAM = featureKey('de', 'verb', 'tense', 'plusquamperfekt');
const KONJ2 = featureKey('de', 'verb', 'mood', 'konjunktiv-ii');
const PARTIZIP = featureKey('de', 'verb', 'form', 'partizip-ii');
const STRONG = featureKey('de', 'verb', 'type', 'stark');
const PASSIVE = featureKey('de', 'verb', 'voice', 'vorgangspassiv');
const GENITIVE = featureKey('de', 'noun', 'case', 'genitiv');

export const TENSE_GAPS: readonly TenseGap[] = [
  // Perfekt: the auxiliary (sein for movement and change of state).
  { id: 'perf-aux-fahren', level: 'a2', before: 'Gestern ', after: 'ich mit dem Zug nach Köln gefahren.', correct: 'bin', wrong: ['habe', 'hat'], features: [PERFEKT] },
  { id: 'perf-aux-essen', level: 'a2', before: 'Wir ', after: 'schon zu Mittag gegessen.', correct: 'haben', wrong: ['sind', 'hat'], features: [PERFEKT] },
  { id: 'perf-aux-aufstehen', level: 'a2', before: 'Heute ', after: 'Tom sehr früh aufgestanden.', correct: 'ist', wrong: ['hat', 'wird'], features: [PERFEKT] },
  { id: 'perf-aux-schlafen', level: 'a2', before: 'Das Baby ', after: 'die ganze Nacht geschlafen.', correct: 'hat', wrong: ['ist', 'wird'], features: [PERFEKT] },
  { id: 'perf-aux-bleiben', level: 'a2', before: 'Am Sonntag ', after: 'wir zu Hause geblieben.', correct: 'sind', wrong: ['haben', 'hatten'], features: [PERFEKT] },
  { id: 'perf-aux-passieren', level: 'b1', before: 'Was ', after: 'denn passiert?', correct: 'ist', wrong: ['hat', 'wird'], features: [PERFEKT] },
  // Perfekt: the participle.
  { id: 'perf-part-schreiben', level: 'a2', before: 'Ich habe dir eine Nachricht ', after: '.', correct: 'geschrieben', wrong: ['geschreibt', 'schrieb'], features: [PERFEKT, PARTIZIP, STRONG] },
  { id: 'perf-part-kaufen', level: 'a2', before: 'Mia hat ein neues Fahrrad ', after: '.', correct: 'gekauft', wrong: ['gekaufen', 'kaufte'], features: [PERFEKT, PARTIZIP] },
  { id: 'perf-part-trinken', level: 'a2', before: 'Hast du schon deinen Kaffee ', after: '?', correct: 'getrunken', wrong: ['getrinkt', 'getrankt'], features: [PERFEKT, PARTIZIP, STRONG] },
  { id: 'perf-part-bringen', level: 'b1', before: 'Leo hat Blumen ', after: '.', correct: 'gebracht', wrong: ['gebringt', 'gebrungen'], features: [PERFEKT, PARTIZIP] },
  { id: 'perf-part-verstehen', level: 'b1', before: 'Ich habe die Frage nicht ', after: '.', correct: 'verstanden', wrong: ['geverstanden', 'verstehte'], features: [PERFEKT, PARTIZIP, STRONG] },
  { id: 'perf-part-studieren', level: 'b1', before: 'Kim hat in Leipzig ', after: '.', correct: 'studiert', wrong: ['gestudiert', 'studieren'], features: [PERFEKT, PARTIZIP] },
  { id: 'perf-part-anrufen', level: 'b1', before: 'Hast du Oma schon ', after: '?', correct: 'angerufen', wrong: ['geanrufen', 'angeruft'], features: [PERFEKT, PARTIZIP, STRONG] },
  // Präteritum.
  { id: 'prae-sein', level: 'a2', before: 'Letztes Jahr ', after: 'ich in Spanien.', correct: 'war', wrong: ['bin', 'werde'], features: [PRAETERITUM] },
  { id: 'prae-haben', level: 'a2', before: 'Als Kind ', after: 'Kim einen Hund.', correct: 'hatte', wrong: ['hat', 'habe'], features: [PRAETERITUM] },
  { id: 'prae-koennen', level: 'a2', before: 'Wir ', after: 'gestern nicht kommen.', correct: 'konnten', wrong: ['können', 'könnten'], features: [PRAETERITUM] },
  { id: 'prae-gehen', level: 'b1', before: 'Nach dem Essen ', after: 'sie spazieren.', correct: 'gingen', wrong: ['gehten', 'gangen'], features: [PRAETERITUM, STRONG] },
  { id: 'prae-sehen', level: 'b1', before: 'Plötzlich ', after: 'er einen Fuchs im Garten.', correct: 'sah', wrong: ['sehte', 'siehte'], features: [PRAETERITUM, STRONG] },
  { id: 'prae-denken', level: 'b1', before: 'Ich ', after: ', du kommst später.', correct: 'dachte', wrong: ['denkte', 'dachtete'], features: [PRAETERITUM] },
  { id: 'prae-wissen', level: 'b1', before: 'Niemand ', after: ', wo der Schlüssel war.', correct: 'wusste', wrong: ['wisste', 'weißte'], features: [PRAETERITUM] },
  { id: 'prae-du-kommen', level: 'b1', before: 'Warum ', after: 'du so spät nach Hause?', correct: 'kamst', wrong: ['kamt', 'kommtest'], features: [PRAETERITUM, STRONG] },
  // Konjunktiv II.
  { id: 'k2-haben', level: 'b1', before: 'Wenn ich mehr Zeit ', after: ', würde ich öfter lesen.', correct: 'hätte', wrong: ['hatte', 'habe'], features: [KONJ2] },
  { id: 'k2-sein', level: 'b1', before: 'Es ', after: 'schön, wenn du mitkommst.', correct: 'wäre', wrong: ['war', 'würde'], features: [KONJ2] },
  { id: 'k2-haette-gern', level: 'b1', before: 'Ich ', after: 'gern einen Kaffee, bitte.', correct: 'hätte', wrong: ['hatte', 'würde'], features: [KONJ2] },
  { id: 'k2-wuerde', level: 'b1', before: 'An deiner Stelle ', after: 'ich den Job nehmen.', correct: 'würde', wrong: ['wurde', 'werde'], features: [KONJ2] },
  { id: 'k2-muessen', level: 'b2', before: 'Eigentlich ', after: 'wir jetzt gehen, aber es ist so gemütlich.', correct: 'müssten', wrong: ['mussten', 'müsstet'], features: [KONJ2] },
  { id: 'k2-kommen', level: 'b2', before: 'Wenn er doch nur pünktlich ', after: '!', correct: 'käme', wrong: ['kam', 'kämen'], features: [KONJ2, STRONG] },
  { id: 'k2-past', level: 'b2', before: 'Wenn ich das gewusst ', after: ', wäre ich nicht gekommen.', correct: 'hätte', wrong: ['hatte', 'wäre'], features: [KONJ2, PLUSQUAM] },
  { id: 'k2-past-sein', level: 'b2', before: 'Ohne deine Hilfe ', after: 'ich zu spät gekommen.', correct: 'wäre', wrong: ['hätte', 'würde'], features: [KONJ2, PLUSQUAM] },
  // Plusquamperfekt.
  { id: 'plusq-nachdem', level: 'b1', before: 'Nachdem wir gegessen ', after: ', gingen wir ins Kino.', correct: 'hatten', wrong: ['haben', 'hätten'], features: [PLUSQUAM] },
  { id: 'plusq-sein', level: 'b2', before: 'Als ich ankam, ', after: 'der Zug schon abgefahren.', correct: 'war', wrong: ['hatte', 'ist'], features: [PLUSQUAM] },
  // Passive.
  { id: 'pass-werden', level: 'b1', before: 'Das Paket ', after: 'morgen geliefert.', correct: 'wird', wrong: ['wurde', 'hat'], features: [PASSIVE] },
  { id: 'pass-wurde', level: 'b1', before: 'Die Brücke ', after: '1890 gebaut.', correct: 'wurde', wrong: ['würde', 'wird'], features: [PASSIVE, PRAETERITUM] },
  { id: 'pass-perfekt', level: 'b2', before: 'Der Fehler ist inzwischen behoben ', after: '.', correct: 'worden', wrong: ['geworden', 'wurde'], features: [PASSIVE, PERFEKT] },
  // Genitive.
  { id: 'gen-masc', level: 'b2', before: 'Das ist das Auto ', after: 'Nachbarn.', correct: 'meines', wrong: ['meinem', 'meinen'], features: [GENITIVE] },
  { id: 'gen-fem', level: 'b2', before: 'Am Ende ', after: 'Woche fahren wir weg.', correct: 'der', wrong: ['die', 'den'], features: [GENITIVE] },
  { id: 'gen-wegen', level: 'b2', before: 'Wegen ', after: 'Regens fiel das Konzert aus.', correct: 'des', wrong: ['dem', 'den'], features: [GENITIVE] },
  { id: 'gen-trotz', level: 'b2', before: 'Trotz ', after: 'Verspätung erreichten wir den Anschluss.', correct: 'der', wrong: ['die', 'dem'], features: [GENITIVE] },
  { id: 'gen-neuter', level: 'c1', before: 'Die Lage ', after: 'Hotels ist ideal.', correct: 'des', wrong: ['dem', 'das'], features: [GENITIVE] }
];

const LEVELS: readonly Level[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

/** The sentences for a level: its own and, as at every level, all easier ones. */
export function tenseGapsFor(level: Level): TenseGap[] {
  const rank = LEVELS.indexOf(level);
  return TENSE_GAPS.filter((gap) => LEVELS.indexOf(gap.level) <= rank);
}

export function buildTenseGapPrompt(id: string, random: () => number, shuffle: <T>(values: T[], random: () => number) => T[]): GrammarPrompt | null {
  const gap = TENSE_GAPS.find((entry) => entry.id === id);
  if (!gap) return null;
  return { before: gap.before, after: gap.after, correct: gap.correct, choices: shuffle([gap.correct, ...gap.wrong], random), features: [...gap.features] };
}
