/*
 * Hand-checked German gap sentences for the grammar that word-based prompts cannot generate: the
 * Perfekt (haben or sein, participles), the Präteritum, the Futur I and II, the Konjunktiv I and II,
 * the passive, the infinitive with zu, participles as adjectives and the genitive. Each sentence has one right answer and wrong answers that are real forms a learner
 * mixes up (the other auxiliary, a regular participle for a strong verb, the indicative for the
 * subjunctive …), so every wrong choice teaches something. Levels follow the usual curricula:
 * Perfekt and Futur I from A2, Präteritum of everyday verbs from A2/B1, Konjunktiv II and passive
 * from B1, genitive, Futur II, Konjunktiv I (reported speech) and Konjunktiv II past from B2,
 * participle constructions from C1, set phrases and literary forms at C2.
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
const FUTUR1 = featureKey('de', 'verb', 'tense', 'futur-i');
const FUTUR2 = featureKey('de', 'verb', 'tense', 'futur-ii');
const KONJ1 = featureKey('de', 'verb', 'mood', 'konjunktiv-i');
const ZUSTAND = featureKey('de', 'verb', 'voice', 'zustandspassiv');
const MODAL = featureKey('de', 'verb', 'type', 'modal');
const TRENNBAR = featureKey('de', 'verb', 'type', 'trennbar');
const UNTRENNBAR = featureKey('de', 'verb', 'type', 'untrennbar');
const INFINITIV = featureKey('de', 'verb', 'form', 'infinitiv');
const ZU_INF = featureKey('de', 'verb', 'form', 'zu-infinitiv');
const PARTIZIP1 = featureKey('de', 'verb', 'form', 'partizip-i');

export const TENSE_GAPS: readonly TenseGap[] = [
  // Perfekt: the auxiliary (sein for movement and change of state).
  { id: 'perf-aux-fahren', level: 'a2', before: 'Gestern ', after: 'ich mit dem Zug nach Köln gefahren.', correct: 'bin', wrong: ['habe', 'hat'], features: [PERFEKT] },
  { id: 'perf-aux-essen', level: 'a2', before: 'Wir ', after: 'schon zu Mittag gegessen.', correct: 'haben', wrong: ['sind', 'hat'], features: [PERFEKT] },
  { id: 'perf-aux-aufstehen', level: 'a2', before: 'Heute ', after: 'Tom sehr früh aufgestanden.', correct: 'ist', wrong: ['hat', 'wird'], features: [PERFEKT] },
  { id: 'perf-aux-schlafen', level: 'a2', before: 'Das Baby ', after: 'die ganze Nacht geschlafen.', correct: 'hat', wrong: ['ist', 'wird'], features: [PERFEKT] },
  { id: 'perf-aux-bleiben', level: 'a2', before: 'Am Sonntag ', after: 'wir zu Hause geblieben.', correct: 'sind', wrong: ['haben', 'hatten'], features: [PERFEKT] },
  { id: 'perf-aux-passieren', level: 'b1', before: 'Was ', after: 'denn passiert?', correct: 'ist', wrong: ['hat', 'wird'], features: [PERFEKT] },
  { id: 'perf-aux-kommen', level: 'a2', before: 'Wann ', after: 'du gestern nach Hause gekommen?', correct: 'bist', wrong: ['hast', 'wirst'], features: [PERFEKT] },
  { id: 'perf-aux-arbeiten', level: 'a2', before: 'Mein Vater ', after: 'lange in einer Bank gearbeitet.', correct: 'hat', wrong: ['ist', 'war'], features: [PERFEKT] },
  // Perfekt: the participle.
  { id: 'perf-part-schreiben', level: 'a2', before: 'Ich habe dir eine Nachricht ', after: '.', correct: 'geschrieben', wrong: ['geschreibt', 'schrieb'], features: [PERFEKT, PARTIZIP, STRONG] },
  { id: 'perf-part-kaufen', level: 'a2', before: 'Mia hat ein neues Fahrrad ', after: '.', correct: 'gekauft', wrong: ['gekaufen', 'kaufte'], features: [PERFEKT, PARTIZIP] },
  { id: 'perf-part-trinken', level: 'a2', before: 'Hast du schon deinen Kaffee ', after: '?', correct: 'getrunken', wrong: ['getrinkt', 'getrankt'], features: [PERFEKT, PARTIZIP, STRONG] },
  { id: 'perf-part-bringen', level: 'b1', before: 'Leo hat Blumen ', after: '.', correct: 'gebracht', wrong: ['gebringt', 'gebrungen'], features: [PERFEKT, PARTIZIP] },
  { id: 'perf-part-verstehen', level: 'b1', before: 'Ich habe die Frage nicht ', after: '.', correct: 'verstanden', wrong: ['geverstanden', 'verstehte'], features: [PERFEKT, PARTIZIP, STRONG] },
  { id: 'perf-part-studieren', level: 'b1', before: 'Kim hat in Leipzig ', after: '.', correct: 'studiert', wrong: ['gestudiert', 'studieren'], features: [PERFEKT, PARTIZIP] },
  { id: 'perf-part-anrufen', level: 'b1', before: 'Hast du Oma schon ', after: '?', correct: 'angerufen', wrong: ['geanrufen', 'angeruft'], features: [PERFEKT, PARTIZIP, STRONG] },
  { id: 'perf-part-machen', level: 'a2', before: 'Was hast du am Wochenende ', after: '?', correct: 'gemacht', wrong: ['gemachen', 'machte'], features: [PERFEKT, PARTIZIP] },
  { id: 'perf-part-sehen', level: 'a2', before: 'Wir haben gestern einen guten Film ', after: '.', correct: 'gesehen', wrong: ['geseht', 'sahen'], features: [PERFEKT, PARTIZIP, STRONG] },
  { id: 'perf-part-einkaufen', level: 'a2', before: 'Ich habe heute im Supermarkt ', after: '.', correct: 'eingekauft', wrong: ['geeinkauft', 'einkauft'], features: [PERFEKT, PARTIZIP, TRENNBAR] },
  { id: 'perf-part-besuchen', level: 'a2', before: 'Am Samstag haben wir unsere Großeltern ', after: '.', correct: 'besucht', wrong: ['gebesucht', 'besuchen'], features: [PERFEKT, PARTIZIP, UNTRENNBAR] },
  { id: 'perf-ersatzinfinitiv', level: 'c2', before: 'Sie hat gestern länger arbeiten ', after: '.', correct: 'müssen', wrong: ['gemusst', 'musste'], features: [PERFEKT, MODAL, INFINITIV] },
  // Präteritum.
  { id: 'prae-sein', level: 'a2', before: 'Letztes Jahr ', after: 'ich in Spanien.', correct: 'war', wrong: ['bin', 'werde'], features: [PRAETERITUM] },
  { id: 'prae-haben', level: 'a2', before: 'Als Kind ', after: 'Kim einen Hund.', correct: 'hatte', wrong: ['hat', 'habe'], features: [PRAETERITUM] },
  { id: 'prae-koennen', level: 'a2', before: 'Wir ', after: 'gestern nicht kommen.', correct: 'konnten', wrong: ['können', 'könnten'], features: [PRAETERITUM] },
  { id: 'prae-gehen', level: 'b1', before: 'Nach dem Essen ', after: 'sie spazieren.', correct: 'gingen', wrong: ['gehten', 'gangen'], features: [PRAETERITUM, STRONG] },
  { id: 'prae-sehen', level: 'b1', before: 'Plötzlich ', after: 'er einen Fuchs im Garten.', correct: 'sah', wrong: ['sehte', 'siehte'], features: [PRAETERITUM, STRONG] },
  { id: 'prae-denken', level: 'b1', before: 'Ich ', after: ', du kommst später.', correct: 'dachte', wrong: ['denkte', 'dachtete'], features: [PRAETERITUM] },
  { id: 'prae-wissen', level: 'b1', before: 'Niemand ', after: ', wo der Schlüssel war.', correct: 'wusste', wrong: ['wisste', 'weißte'], features: [PRAETERITUM] },
  { id: 'prae-du-kommen', level: 'b1', before: 'Warum ', after: 'du so spät nach Hause?', correct: 'kamst', wrong: ['kamt', 'kommtest'], features: [PRAETERITUM, STRONG] },
  { id: 'prae-wollen', level: 'a2', before: 'Als Kind ', after: 'ich Pilot werden.', correct: 'wollte', wrong: ['will', 'wolltet'], features: [PRAETERITUM, MODAL] },
  { id: 'prae-muessen', level: 'a2', before: 'Gestern ', after: 'Mia lange arbeiten.', correct: 'musste', wrong: ['muss', 'müsste'], features: [PRAETERITUM, MODAL] },
  { id: 'prae-es-gab', level: 'a2', before: 'Früher ', after: 'es hier ein Kino.', correct: 'gab', wrong: ['gibt', 'gebt'], features: [PRAETERITUM, STRONG] },
  { id: 'prae-abfahren', level: 'b1', before: 'Der Zug ', after: 'pünktlich um acht Uhr ab.', correct: 'fuhr', wrong: ['fahrte', 'fährte'], features: [PRAETERITUM, STRONG, TRENNBAR] },
  { id: 'prae-befehlen', level: 'c2', before: 'Sie ', after: 'ihm, sofort zu gehen.', correct: 'befahl', wrong: ['befehlte', 'befohl'], features: [PRAETERITUM, STRONG] },
  { id: 'prae-erklingen', level: 'c2', before: 'Die Glocken ', after: 'in der ganzen Stadt.', correct: 'erklangen', wrong: ['erklingten', 'erklungen'], features: [PRAETERITUM, STRONG] },
  { id: 'prae-stossen', level: 'c2', before: 'Der Vorschlag ', after: 'auf breite Zustimmung.', correct: 'stieß', wrong: ['stoßte', 'stoß'], features: [PRAETERITUM, STRONG] },
  // Futur I: werden with the infinitive, for plans, forecasts and guesses.
  { id: 'fut1-ich', level: 'a2', before: 'Morgen ', after: 'ich meine Oma besuchen.', correct: 'werde', wrong: ['wurde', 'bin'], features: [FUTUR1] },
  { id: 'fut1-es', level: 'a2', before: 'Nächste Woche ', after: 'es viel regnen.', correct: 'wird', wrong: ['wurde', 'ist'], features: [FUTUR1] },
  { id: 'fut1-du', level: 'b1', before: 'Keine Angst, du ', after: 'die Prüfung bestehen.', correct: 'wirst', wrong: ['wurdest', 'bist'], features: [FUTUR1] },
  { id: 'fut1-infinitiv', level: 'b1', before: 'Ich glaube, es wird morgen ', after: '.', correct: 'schneien', wrong: ['geschneit', 'schneit'], features: [FUTUR1, INFINITIV] },
  { id: 'fut1-vermutung', level: 'c2', before: 'Er ', after: 'wohl noch im Büro sein.', correct: 'wird', wrong: ['wurde', 'werde'], features: [FUTUR1] },
  // Futur II: something will be finished by then, or is assumed to have happened.
  { id: 'fut2-haben', level: 'b2', before: 'Bis nächsten Montag werde ich das Buch gelesen ', after: '.', correct: 'haben', wrong: ['sein', 'worden'], features: [FUTUR2] },
  { id: 'fut2-sein', level: 'b2', before: 'Bis du ankommst, wird der Zug schon abgefahren ', after: '.', correct: 'sein', wrong: ['haben', 'werden'], features: [FUTUR2] },
  { id: 'fut2-vermutung', level: 'b2', before: 'Er ist nicht gekommen. Er ', after: 'den Termin vergessen haben.', correct: 'wird', wrong: ['wurde', 'ist'], features: [FUTUR2] },
  { id: 'fut2-passiv', level: 'c1', before: 'Bis zum Sommer wird die Brücke fertiggestellt worden ', after: '.', correct: 'sein', wrong: ['haben', 'werden'], features: [FUTUR2, PASSIVE] },
  { id: 'fut2-einsteigen', level: 'c2', before: 'Die Einbrecher werden durch das Fenster eingestiegen ', after: '.', correct: 'sein', wrong: ['haben', 'worden'], features: [FUTUR2] },
  // Konjunktiv II.
  { id: 'k2-haben', level: 'b1', before: 'Wenn ich mehr Zeit ', after: ', würde ich öfter lesen.', correct: 'hätte', wrong: ['hatte', 'habe'], features: [KONJ2] },
  { id: 'k2-sein', level: 'b1', before: 'Es ', after: 'schön, wenn du mitkommst.', correct: 'wäre', wrong: ['war', 'würde'], features: [KONJ2] },
  { id: 'k2-haette-gern', level: 'b1', before: 'Ich ', after: 'gern einen Kaffee, bitte.', correct: 'hätte', wrong: ['hatte', 'würde'], features: [KONJ2] },
  { id: 'k2-wuerde', level: 'b1', before: 'An deiner Stelle ', after: 'ich den Job nehmen.', correct: 'würde', wrong: ['wurde', 'werde'], features: [KONJ2] },
  { id: 'k2-muessen', level: 'b2', before: 'Eigentlich ', after: 'wir jetzt gehen, aber es ist so gemütlich.', correct: 'müssten', wrong: ['mussten', 'müsstet'], features: [KONJ2] },
  { id: 'k2-kommen', level: 'b2', before: 'Wenn er doch nur pünktlich ', after: '!', correct: 'käme', wrong: ['kam', 'kämen'], features: [KONJ2, STRONG] },
  { id: 'k2-past', level: 'b2', before: 'Wenn ich das gewusst ', after: ', wäre ich nicht gekommen.', correct: 'hätte', wrong: ['hatte', 'wäre'], features: [KONJ2, PLUSQUAM] },
  { id: 'k2-past-sein', level: 'b2', before: 'Ohne deine Hilfe ', after: 'ich zu spät gekommen.', correct: 'wäre', wrong: ['hätte', 'würde'], features: [KONJ2, PLUSQUAM] },
  { id: 'k2-koennten', level: 'b1', before: '', after: 'Sie mir bitte helfen?', correct: 'Könnten', wrong: ['Konnten', 'Könntet'], features: [KONJ2, MODAL] },
  { id: 'k2-wenn-ich-du', level: 'b1', before: 'Wenn ich du ', after: ', würde ich mich entschuldigen.', correct: 'wäre', wrong: ['war', 'bin'], features: [KONJ2] },
  { id: 'k2-past-sollen', level: 'b2', before: 'Du ', after: 'mich früher anrufen sollen, dann wäre das nicht passiert.', correct: 'hättest', wrong: ['hattest', 'wärst'], features: [KONJ2, PLUSQUAM, MODAL] },
  { id: 'k2-als-ob', level: 'c1', before: 'Er tut so, als ob er alles ', after: '.', correct: 'wüsste', wrong: ['wusste', 'wissen'], features: [KONJ2] },
  { id: 'k2-als-verb', level: 'c1', before: 'Sie sah mich an, als ', after: 'sie mich noch nie gesehen.', correct: 'hätte', wrong: ['hatte', 'wäre'], features: [KONJ2, PLUSQUAM] },
  { id: 'k2-fallen', level: 'c1', before: 'Wenn er mehr Geduld hätte, ', after: 'ihm vieles leichter.', correct: 'fiele', wrong: ['fiel', 'fällt'], features: [KONJ2, STRONG] },
  { id: 'k2-geben', level: 'c1', before: 'Wenn es keine Zeitzonen ', after: ', wäre das Reisen einfacher.', correct: 'gäbe', wrong: ['gab', 'gebe'], features: [KONJ2, STRONG] },
  { id: 'k2-vorwurf', level: 'c1', before: 'Man warf uns vor, wir ', after: 'die Frist versäumt.', correct: 'hätten', wrong: ['habe', 'seien'], features: [KONJ2, PLUSQUAM] },
  { id: 'k2-past-passiv-modal', level: 'c1', before: 'Der Antrag hätte früher gestellt werden ', after: '.', correct: 'müssen', wrong: ['gemusst', 'müsste'], features: [KONJ2, PASSIVE, MODAL] },
  { id: 'k2-past-passiv', level: 'c1', before: 'Ohne das Eingreifen der Feuerwehr ', after: 'das ganze Haus zerstört worden.', correct: 'wäre', wrong: ['hätte', 'würde'], features: [KONJ2, PASSIVE, PLUSQUAM] },
  { id: 'k2-als-ginge', level: 'c2', before: 'Er rannte, als ', after: 'es um sein Leben.', correct: 'ginge', wrong: ['ging', 'gegangen'], features: [KONJ2, STRONG] },
  { id: 'k2-ersatzinfinitiv', level: 'c2', before: 'Ich wusste nicht, dass ich mich ', after: 'anmelden müssen.', correct: 'hätte', wrong: ['wäre', 'würde'], features: [KONJ2, PLUSQUAM, MODAL] },
  { id: 'k2-als-dass', level: 'c2', before: 'Das Angebot war zu gut, als dass man es ', after: 'ablehnen können.', correct: 'hätte', wrong: ['wäre', 'würde'], features: [KONJ2, PLUSQUAM, MODAL] },
  { id: 'k2-sollten', level: 'c2', before: '', after: 'Sie Fragen haben, wenden Sie sich bitte an uns.', correct: 'Sollten', wrong: ['Sollen', 'Solltet'], features: [KONJ2, MODAL] },
  // Konjunktiv I: reported speech and a few set phrases. The wrong answers are other persons or the
  // wrong auxiliary, never the indicative, which everyday German accepts in reported speech.
  { id: 'k1-sei', level: 'b2', before: 'Der Minister sagte, er ', after: 'mit dem Ergebnis zufrieden.', correct: 'sei', wrong: ['seien', 'seiest'], features: [KONJ1] },
  { id: 'k1-habe', level: 'b2', before: 'Die Sprecherin erklärte, die Firma ', after: 'keine Fehler gemacht.', correct: 'habe', wrong: ['sei', 'haben'], features: [KONJ1, PERFEKT] },
  { id: 'k1-komme', level: 'b2', before: 'Tom hat geschrieben, er ', after: 'erst am Montag zurück.', correct: 'komme', wrong: ['kommen', 'kämst'], features: [KONJ1] },
  { id: 'k1-duerfe', level: 'b2', before: 'Der Arzt sagte, ich ', after: 'bald wieder Sport treiben.', correct: 'dürfe', wrong: ['dürfen', 'dürftest'], features: [KONJ1, MODAL] },
  { id: 'k1-habe-gesehen', level: 'c1', before: 'Der Zeuge behauptete, er ', after: 'den Mann nie zuvor gesehen.', correct: 'habe', wrong: ['sei', 'haben'], features: [KONJ1, PERFEKT] },
  { id: 'k1-sei-gefahren', level: 'c1', before: 'Die Polizei teilte mit, der Fahrer ', after: 'zu schnell gefahren.', correct: 'sei', wrong: ['habe', 'seien'], features: [KONJ1, PERFEKT] },
  { id: 'k1-werde', level: 'c1', before: 'Die Regierung kündigte an, man ', after: 'die Steuern senken.', correct: 'werde', wrong: ['werden', 'wurde'], features: [KONJ1, FUTUR1] },
  { id: 'k1-wisse', level: 'c1', before: 'Er behauptet, er ', after: 'von nichts.', correct: 'wisse', wrong: ['weiße', 'wissen'], features: [KONJ1] },
  { id: 'k1-es-sei-denn', level: 'c2', before: 'Ich komme nicht mit, es ', after: 'denn, er entschuldigt sich.', correct: 'sei', wrong: ['wäre', 'ist'], features: [KONJ1] },
  { id: 'k1-gott-sei-dank', level: 'c2', before: 'Gott ', after: 'Dank ist niemand verletzt worden.', correct: 'sei', wrong: ['ist', 'wäre'], features: [KONJ1] },
  { id: 'k1-wie-dem-auch-sei', level: 'c2', before: 'Wie dem auch ', after: ', wir müssen eine Entscheidung treffen.', correct: 'sei', wrong: ['ist', 'wäre'], features: [KONJ1] },
  { id: 'k1-koste-es', level: 'c2', before: 'Koste es, was es ', after: '.', correct: 'wolle', wrong: ['will', 'wollte'], features: [KONJ1, MODAL] },
  { id: 'k1-passiv', level: 'c2', before: 'Der Sprecher dementierte, dass der Vertrag bereits unterzeichnet worden ', after: '.', correct: 'sei', wrong: ['habe', 'werde'], features: [KONJ1, PASSIVE, PERFEKT] },
  { id: 'k1-ob', level: 'c2', before: 'Sie fragte, ob er schon gegessen ', after: '.', correct: 'habe', wrong: ['sei', 'haben'], features: [KONJ1, PERFEKT] },
  { id: 'k1-solle', level: 'c2', before: 'Der Arzt sagte, ich ', after: 'mich schonen.', correct: 'solle', wrong: ['sollen', 'sollst'], features: [KONJ1, MODAL] },
  // Plusquamperfekt.
  { id: 'plusq-nachdem', level: 'b1', before: 'Nachdem wir gegessen ', after: ', gingen wir ins Kino.', correct: 'hatten', wrong: ['haben', 'hätten'], features: [PLUSQUAM] },
  { id: 'plusq-sein', level: 'b2', before: 'Als ich ankam, ', after: 'der Zug schon abgefahren.', correct: 'war', wrong: ['hatte', 'ist'], features: [PLUSQUAM] },
  { id: 'plusq-nachdem-sein', level: 'b1', before: 'Nachdem er angekommen ', after: ', rief er sofort seine Eltern an.', correct: 'war', wrong: ['hatte', 'ist'], features: [PLUSQUAM] },
  { id: 'plusq-vergessen', level: 'b2', before: 'Er konnte nicht bezahlen, weil er sein Portemonnaie zu Hause vergessen ', after: '.', correct: 'hatte', wrong: ['war', 'hätte'], features: [PLUSQUAM] },
  { id: 'plusq-kaum', level: 'c2', before: 'Kaum ', after: 'er das Haus verlassen, begann es zu regnen.', correct: 'hatte', wrong: ['war', 'hätte'], features: [PLUSQUAM] },
  // Passive.
  { id: 'pass-werden', level: 'b1', before: 'Das Paket ', after: 'morgen geliefert.', correct: 'wird', wrong: ['wurde', 'hat'], features: [PASSIVE] },
  { id: 'pass-wurde', level: 'b1', before: 'Die Brücke ', after: '1890 gebaut.', correct: 'wurde', wrong: ['würde', 'wird'], features: [PASSIVE, PRAETERITUM] },
  { id: 'pass-perfekt', level: 'b2', before: 'Der Fehler ist inzwischen behoben ', after: '.', correct: 'worden', wrong: ['geworden', 'wurde'], features: [PASSIVE, PERFEKT] },
  { id: 'pass-modal', level: 'b1', before: 'Das Formular muss bis Freitag ausgefüllt ', after: '.', correct: 'werden', wrong: ['worden', 'wird'], features: [PASSIVE, MODAL] },
  { id: 'pass-plural', level: 'b1', before: 'In der Schweiz ', after: 'vier Sprachen gesprochen.', correct: 'werden', wrong: ['wird', 'sind'], features: [PASSIVE] },
  { id: 'pass-wurden', level: 'b2', before: 'Die Verletzten ', after: 'sofort ins Krankenhaus gebracht.', correct: 'wurden', wrong: ['wurde', 'worden'], features: [PASSIVE, PRAETERITUM] },
  { id: 'pass-zustand', level: 'b2', before: 'Keine Sorge, der Tisch ', after: 'schon seit gestern reserviert.', correct: 'ist', wrong: ['wird', 'hat'], features: [ZUSTAND] },
  { id: 'pass-plusquam', level: 'c1', before: 'Nachdem das Gebäude renoviert worden ', after: ', zogen die ersten Mieter ein.', correct: 'war', wrong: ['hatte', 'wurde'], features: [PASSIVE, PLUSQUAM] },
  // Infinitive with zu and participles used as adjectives.
  { id: 'zu-abschliessen', level: 'b1', before: 'Ich habe vergessen, die Tür ', after: '.', correct: 'abzuschließen', wrong: ['zu abschließen', 'abschließen'], features: [ZU_INF, TRENNBAR] },
  { id: 'zu-sein-passiv', level: 'c1', before: 'Die Unterlagen ', after: 'bis Ende des Monats einzureichen.', correct: 'sind', wrong: ['werden', 'haben'], features: [ZU_INF] },
  { id: 'part1-sprechend', level: 'c1', before: 'Wir suchen eine gut Englisch ', after: 'Mitarbeiterin.', correct: 'sprechende', wrong: ['gesprochene', 'sprechend'], features: [PARTIZIP1] },
  { id: 'part2-geliefert', level: 'c1', before: 'Die gestern ', after: 'Ware ist beschädigt angekommen.', correct: 'gelieferte', wrong: ['liefernde', 'geliefert'], features: [PARTIZIP] },
  { id: 'part2-geplant', level: 'c2', before: 'Die Sitzung, ursprünglich für Montag ', after: ', wurde verschoben.', correct: 'geplant', wrong: ['planend', 'geplante'], features: [PARTIZIP] },
  { id: 'part1-gerundiv', level: 'c2', before: 'Die noch zu ', after: 'Aufgaben wurden verteilt.', correct: 'erledigenden', wrong: ['erledigten', 'erledigende'], features: [PARTIZIP1, ZU_INF] },
  { id: 'part1-weilend', level: 'c2', before: 'Die im Ausland ', after: 'Studierenden kehren nächste Woche zurück.', correct: 'weilenden', wrong: ['geweilten', 'weilende'], features: [PARTIZIP1] },
  // Genitive.
  { id: 'gen-masc', level: 'b2', before: 'Das ist das Auto ', after: 'Nachbarn.', correct: 'meines', wrong: ['meinem', 'meinen'], features: [GENITIVE] },
  { id: 'gen-fem', level: 'b2', before: 'Am Ende ', after: 'Woche fahren wir weg.', correct: 'der', wrong: ['die', 'den'], features: [GENITIVE] },
  { id: 'gen-wegen', level: 'b2', before: 'Wegen ', after: 'Regens fiel das Konzert aus.', correct: 'des', wrong: ['dem', 'den'], features: [GENITIVE] },
  { id: 'gen-trotz', level: 'b2', before: 'Trotz ', after: 'Verspätung erreichten wir den Anschluss.', correct: 'der', wrong: ['die', 'dem'], features: [GENITIVE] },
  { id: 'gen-plural', level: 'b2', before: 'Die Meinung ', after: 'Experten ist eindeutig.', correct: 'der', wrong: ['den', 'die'], features: [GENITIVE] },
  { id: 'gen-waehrend', level: 'b2', before: 'Während ', after: 'Essens sollte man nicht telefonieren.', correct: 'des', wrong: ['dem', 'der'], features: [GENITIVE] },
  { id: 'gen-neuter', level: 'c1', before: 'Die Lage ', after: 'Hotels ist ideal.', correct: 'des', wrong: ['dem', 'das'], features: [GENITIVE] },
  { id: 'gen-dessen', level: 'c1', before: 'Der Autor, ', after: 'Roman gerade verfilmt wird, lebt in Wien.', correct: 'dessen', wrong: ['deren', 'dem'], features: [GENITIVE] },
  { id: 'gen-deren', level: 'c1', before: 'Die Firma, ', after: 'Chef zurückgetreten ist, steckt in der Krise.', correct: 'deren', wrong: ['dessen', 'der'], features: [GENITIVE] },
  { id: 'gen-innerhalb', level: 'c1', before: 'Innerhalb ', after: 'Jahres hat sich der Umsatz verdoppelt.', correct: 'eines', wrong: ['einem', 'einen'], features: [GENITIVE] },
  { id: 'gen-aufgrund', level: 'c1', before: 'Aufgrund ', after: 'starken Nachfrage wurde die Produktion erhöht.', correct: 'der', wrong: ['die', 'den'], features: [GENITIVE] },
  { id: 'gen-verdaechtigt', level: 'c1', before: 'Er wurde ', after: 'Diebstahls verdächtigt.', correct: 'des', wrong: ['dem', 'den'], features: [GENITIVE] },
  { id: 'gen-bewusst', level: 'c2', before: 'Er ist sich ', after: 'Verantwortung durchaus bewusst.', correct: 'seiner', wrong: ['seine', 'seinen'], features: [GENITIVE] },
  { id: 'gen-beduerfen', level: 'c2', before: 'Das Vorhaben bedarf ', after: 'sorgfältigen Planung.', correct: 'einer', wrong: ['eine', 'einen'], features: [GENITIVE] },
  { id: 'gen-ungeachtet', level: 'c2', before: 'Ungeachtet ', after: 'Proteste hielt die Regierung an dem Plan fest.', correct: 'der', wrong: ['den', 'die'], features: [GENITIVE] },
  { id: 'gen-entheben', level: 'c2', before: 'Er wurde ', after: 'Amtes enthoben.', correct: 'seines', wrong: ['seinem', 'seinen'], features: [GENITIVE] },
  { id: 'gen-eines-tages', level: 'c2', before: 'Eines ', after: 'stand er plötzlich vor der Tür.', correct: 'Tages', wrong: ['Tag', 'Tage'], features: [GENITIVE] }
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
