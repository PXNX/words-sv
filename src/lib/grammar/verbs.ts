import type { GrammarPrompt } from './cases';

// Present-tense conjugation, hand-checked per verb: [ich, du, er/sie/es, wir, ihr, sie/Sie].
// German stem-changing ("strong") verbs only ever deviate from the regular pattern in the
// du- and er-forms, so a hardcoded table is the only way to stay correct — deriving it from
// the infinitive algorithmically would silently mis-conjugate verbs like "sehen" -> "siehst"
// or "nehmen" -> "nimmt". Keyed uppercase to match `wordPools`/`wordMetadata`.
export type VerbForms = [string, string, string, string, string, string];
type VerbEntry = { forms: VerbForms; after: string };

export const VERB_PRONOUNS = ['Ich', 'Du', 'Er', 'Wir', 'Ihr', 'Sie'];

export const verbConjugations: Record<string, VerbEntry> = {
  SEIN: { forms: ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'], after: 'müde.' },
  HABEN: { forms: ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'], after: 'heute keine Zeit.' },
  WERDEN: { forms: ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'], after: 'langsam müde.' },
  WISSEN: { forms: ['weiß', 'weißt', 'weiß', 'wissen', 'wisst', 'wissen'], after: 'die Antwort nicht.' },
  TUN: { forms: ['tue', 'tust', 'tut', 'tun', 'tut', 'tun'], after: 'das gern für dich.' },

  KÖNNEN: { forms: ['kann', 'kannst', 'kann', 'können', 'könnt', 'können'], after: 'gut schwimmen.' },
  MÜSSEN: { forms: ['muss', 'musst', 'muss', 'müssen', 'müsst', 'müssen'], after: 'jetzt gehen.' },
  DÜRFEN: { forms: ['darf', 'darfst', 'darf', 'dürfen', 'dürft', 'dürfen'], after: 'hier bleiben.' },
  SOLLEN: { forms: ['soll', 'sollst', 'soll', 'sollen', 'sollt', 'sollen'], after: 'pünktlich kommen.' },
  WOLLEN: { forms: ['will', 'willst', 'will', 'wollen', 'wollt', 'wollen'], after: 'nach Hause fahren.' },
  MÖGEN: { forms: ['mag', 'magst', 'mag', 'mögen', 'mögt', 'mögen'], after: 'diesen Film sehr.' },
  MÖCHTEN: { forms: ['möchte', 'möchtest', 'möchte', 'möchten', 'möchtet', 'möchten'], after: 'einen Kaffee, bitte.' },

  GEBEN: { forms: ['gebe', 'gibst', 'gibt', 'geben', 'gebt', 'geben'], after: 'mir bitte das Buch.' },
  NEHMEN: { forms: ['nehme', 'nimmst', 'nimmt', 'nehmen', 'nehmt', 'nehmen'], after: 'jeden Tag den Bus.' },
  SPRECHEN: { forms: ['spreche', 'sprichst', 'spricht', 'sprechen', 'sprecht', 'sprechen'], after: 'sehr gut Deutsch.' },
  ESSEN: { forms: ['esse', 'isst', 'isst', 'essen', 'esst', 'essen'], after: 'gern frisches Obst.' },
  VERGESSEN: { forms: ['vergesse', 'vergisst', 'vergisst', 'vergessen', 'vergesst', 'vergessen'], after: 'den Termin schon wieder.' },
  HELFEN: { forms: ['helfe', 'hilfst', 'hilft', 'helfen', 'helft', 'helfen'], after: 'oft in der Küche.' },
  TREFFEN: { forms: ['treffe', 'triffst', 'trifft', 'treffen', 'trefft', 'treffen'], after: 'sich am Bahnhof.' },
  WERFEN: { forms: ['werfe', 'wirfst', 'wirft', 'werfen', 'werft', 'werfen'], after: 'den Ball sehr weit.' },
  BRECHEN: { forms: ['breche', 'brichst', 'bricht', 'brechen', 'brecht', 'brechen'], after: 'das frische Brot.' },
  MESSEN: { forms: ['messe', 'misst', 'misst', 'messen', 'messt', 'messen'], after: 'die Temperatur genau.' },
  STERBEN: { forms: ['sterbe', 'stirbst', 'stirbt', 'sterben', 'sterbt', 'sterben'], after: 'fast vor Langeweile.' },

  SEHEN: { forms: ['sehe', 'siehst', 'sieht', 'sehen', 'seht', 'sehen'], after: 'heute Abend einen Film.' },
  LESEN: { forms: ['lese', 'liest', 'liest', 'lesen', 'lest', 'lesen'], after: 'jeden Abend ein Buch.' },
  EMPFEHLEN: { forms: ['empfehle', 'empfiehlst', 'empfiehlt', 'empfehlen', 'empfehlt', 'empfehlen'], after: 'dieses Restaurant.' },
  STEHLEN: { forms: ['stehle', 'stiehlst', 'stiehlt', 'stehlen', 'stehlt', 'stehlen'], after: 'nichts, das versprochen ist.' },

  FAHREN: { forms: ['fahre', 'fährst', 'fährt', 'fahren', 'fahrt', 'fahren'], after: 'morgen nach Berlin.' },
  SCHLAFEN: { forms: ['schlafe', 'schläfst', 'schläft', 'schlafen', 'schlaft', 'schlafen'], after: 'acht Stunden pro Nacht.' },
  TRAGEN: { forms: ['trage', 'trägst', 'trägt', 'tragen', 'tragt', 'tragen'], after: 'eine schwere Tasche.' },
  WASCHEN: { forms: ['wasche', 'wäschst', 'wäscht', 'waschen', 'wascht', 'waschen'], after: 'jeden Sonntag die Wäsche.' },
  FANGEN: { forms: ['fange', 'fängst', 'fängt', 'fangen', 'fangt', 'fangen'], after: 'den Ball geschickt.' },
  FALLEN: { forms: ['falle', 'fällst', 'fällt', 'fallen', 'fallt', 'fallen'], after: 'leider ziemlich oft hin.' },
  HALTEN: { forms: ['halte', 'hältst', 'hält', 'halten', 'haltet', 'halten'], after: 'morgen einen Vortrag.' },
  LASSEN: { forms: ['lasse', 'lässt', 'lässt', 'lassen', 'lasst', 'lassen'], after: 'das Auto reparieren.' },
  LAUFEN: { forms: ['laufe', 'läufst', 'läuft', 'laufen', 'lauft', 'laufen'], after: 'jeden Morgen im Park.' },
  SCHLAGEN: { forms: ['schlage', 'schlägst', 'schlägt', 'schlagen', 'schlagt', 'schlagen'], after: 'im Takt die Trommel.' },
  BACKEN: { forms: ['backe', 'bäckst', 'bäckt', 'backen', 'backt', 'backen'], after: 'am Wochenende einen Kuchen.' },
  RATEN: { forms: ['rate', 'rätst', 'rät', 'raten', 'ratet', 'raten'], after: 'ihr zu mehr Geduld.' },

  MACHEN: { forms: ['mache', 'machst', 'macht', 'machen', 'macht', 'machen'], after: 'jetzt die Hausaufgaben.' },
  SAGEN: { forms: ['sage', 'sagst', 'sagt', 'sagen', 'sagt', 'sagen'], after: 'immer die Wahrheit.' },
  FRAGEN: { forms: ['frage', 'fragst', 'fragt', 'fragen', 'fragt', 'fragen'], after: 'den Lehrer nach den Hausaufgaben.' },
  ANTWORTEN: { forms: ['antworte', 'antwortest', 'antwortet', 'antworten', 'antwortet', 'antworten'], after: 'schnell auf die Frage.' },
  ARBEITEN: { forms: ['arbeite', 'arbeitest', 'arbeitet', 'arbeiten', 'arbeitet', 'arbeiten'], after: 'jeden Tag bis siebzehn Uhr.' },
  WOHNEN: { forms: ['wohne', 'wohnst', 'wohnt', 'wohnen', 'wohnt', 'wohnen'], after: 'seit Jahren in Berlin.' },
  LERNEN: { forms: ['lerne', 'lernst', 'lernt', 'lernen', 'lernt', 'lernen'], after: 'jeden Tag etwas Deutsch.' },
  SPIELEN: { forms: ['spiele', 'spielst', 'spielt', 'spielen', 'spielt', 'spielen'], after: 'am Nachmittag Fußball.' },
  KAUFEN: { forms: ['kaufe', 'kaufst', 'kauft', 'kaufen', 'kauft', 'kaufen'], after: 'jeden Morgen frisches Brot.' },
  BRAUCHEN: { forms: ['brauche', 'brauchst', 'braucht', 'brauchen', 'braucht', 'brauchen'], after: 'dringend mehr Zeit.' },
  SUCHEN: { forms: ['suche', 'suchst', 'sucht', 'suchen', 'sucht', 'suchen'], after: 'schon den ganzen Tag die Schlüssel.' },
  HÖREN: { forms: ['höre', 'hörst', 'hört', 'hören', 'hört', 'hören'], after: 'am liebsten klassische Musik.' },
  LACHEN: { forms: ['lache', 'lachst', 'lacht', 'lachen', 'lacht', 'lachen'], after: 'über den lustigen Witz.' },
  KOCHEN: { forms: ['koche', 'kochst', 'kocht', 'kochen', 'kocht', 'kochen'], after: 'heute Abend Nudeln.' },
  PUTZEN: { forms: ['putze', 'putzt', 'putzt', 'putzen', 'putzt', 'putzen'], after: 'samstags die ganze Wohnung.' },
  ZEIGEN: { forms: ['zeige', 'zeigst', 'zeigt', 'zeigen', 'zeigt', 'zeigen'], after: 'mir bitte den Weg.' },
  GLAUBEN: { forms: ['glaube', 'glaubst', 'glaubt', 'glauben', 'glaubt', 'glauben'], after: 'das nicht wirklich.' },
  MEINEN: { forms: ['meine', 'meinst', 'meint', 'meinen', 'meint', 'meinen'], after: 'das durchaus ernst.' },
  HOLEN: { forms: ['hole', 'holst', 'holt', 'holen', 'holt', 'holen'], after: 'schnell noch die Post.' },
  PACKEN: { forms: ['packe', 'packst', 'packt', 'packen', 'packt', 'packen'], after: 'schon heute den Koffer.' },
  SCHENKEN: { forms: ['schenke', 'schenkst', 'schenkt', 'schenken', 'schenkt', 'schenken'], after: 'ihr zum Geburtstag Blumen.' },
  FEIERN: { forms: ['feiere', 'feierst', 'feiert', 'feiern', 'feiert', 'feiern'], after: 'heute Abend ausgelassen.' },
  TANZEN: { forms: ['tanze', 'tanzt', 'tanzt', 'tanzen', 'tanzt', 'tanzen'], after: 'jeden Freitag sehr gern.' },
  REISEN: { forms: ['reise', 'reist', 'reist', 'reisen', 'reist', 'reisen'], after: 'im Sommer oft nach Italien.' },
  TRÄUMEN: { forms: ['träume', 'träumst', 'träumt', 'träumen', 'träumt', 'träumen'], after: 'nachts oft von Ferien.' },
  DANKEN: { forms: ['danke', 'dankst', 'dankt', 'danken', 'dankt', 'danken'], after: 'dir sehr für die Hilfe.' },
  WANDERN: { forms: ['wandere', 'wanderst', 'wandert', 'wandern', 'wandert', 'wandern'], after: 'am Wochenende gern im Wald.' },
  SAMMELN: { forms: ['sammle', 'sammelst', 'sammelt', 'sammeln', 'sammelt', 'sammeln'], after: 'seit Jahren alte Briefmarken.' },
  KLETTERN: { forms: ['klettere', 'kletterst', 'klettert', 'klettern', 'klettert', 'klettern'], after: 'jedes Jahr auf einen Berg.' },
  RECHNEN: { forms: ['rechne', 'rechnest', 'rechnet', 'rechnen', 'rechnet', 'rechnen'], after: 'sehr schnell im Kopf.' },
  ÖFFNEN: { forms: ['öffne', 'öffnest', 'öffnet', 'öffnen', 'öffnet', 'öffnen'], after: 'bitte kurz das Fenster.' },
  ATMEN: { forms: ['atme', 'atmest', 'atmet', 'atmen', 'atmet', 'atmen'], after: 'nach dem Lauf ganz ruhig.' },
  BADEN: { forms: ['bade', 'badest', 'badet', 'baden', 'badet', 'baden'], after: 'jeden Abend sehr lange.' },
  REDEN: { forms: ['rede', 'redest', 'redet', 'reden', 'redet', 'reden'], after: 'heute wieder viel zu viel.' },
  LEBEN: { forms: ['lebe', 'lebst', 'lebt', 'leben', 'lebt', 'leben'], after: 'schon lange in Hamburg.' },
  LIEBEN: { forms: ['liebe', 'liebst', 'liebt', 'lieben', 'liebt', 'lieben'], after: 'diese Stadt sehr.' },
  WÜNSCHEN: { forms: ['wünsche', 'wünschst', 'wünscht', 'wünschen', 'wünscht', 'wünschen'], after: 'dir alles Gute.' },
  ZAHLEN: { forms: ['zahle', 'zahlst', 'zahlt', 'zahlen', 'zahlt', 'zahlen'], after: 'lieber immer bar.' },
  BEZAHLEN: { forms: ['bezahle', 'bezahlst', 'bezahlt', 'bezahlen', 'bezahlt', 'bezahlen'], after: 'sofort die Rechnung.' },
  RIECHEN: { forms: ['rieche', 'riechst', 'riecht', 'riechen', 'riecht', 'riechen'], after: 'gern an frischen Blumen.' },
  FÜHLEN: { forms: ['fühle', 'fühlst', 'fühlt', 'fühlen', 'fühlt', 'fühlen'], after: 'mich heute ziemlich müde.' },
  FOLGEN: { forms: ['folge', 'folgst', 'folgt', 'folgen', 'folgt', 'folgen'], after: 'mir bitte langsam.' },
  STÖREN: { forms: ['störe', 'störst', 'stört', 'stören', 'stört', 'stören'], after: 'dich hoffentlich nicht.' },
  WECKEN: { forms: ['wecke', 'weckst', 'weckt', 'wecken', 'weckt', 'wecken'], after: 'die Kinder um sieben Uhr.' },
  FÜHREN: { forms: ['führe', 'führst', 'führt', 'führen', 'führt', 'führen'], after: 'heute die ganze Gruppe.' },
  ERZÄHLEN: { forms: ['erzähle', 'erzählst', 'erzählt', 'erzählen', 'erzählt', 'erzählen'], after: 'den Kindern eine Geschichte.' },
  ERKLÄREN: { forms: ['erkläre', 'erklärst', 'erklärt', 'erklären', 'erklärt', 'erklären'], after: 'die Regel noch einmal.' },
  VERKAUFEN: { forms: ['verkaufe', 'verkaufst', 'verkauft', 'verkaufen', 'verkauft', 'verkaufen'], after: 'bald das alte Auto.' },
  VERDIENEN: { forms: ['verdiene', 'verdienst', 'verdient', 'verdienen', 'verdient', 'verdienen'], after: 'in diesem Job gutes Geld.' },
  VERLIEREN: { forms: ['verliere', 'verlierst', 'verliert', 'verlieren', 'verliert', 'verlieren'], after: 'ständig den Schlüssel.' },
  KENNEN: { forms: ['kenne', 'kennst', 'kennt', 'kennen', 'kennt', 'kennen'], after: 'diese Stadt schon sehr gut.' },
  BRINGEN: { forms: ['bringe', 'bringst', 'bringt', 'bringen', 'bringt', 'bringen'], after: 'dir gleich das Paket.' },
  DENKEN: { forms: ['denke', 'denkst', 'denkt', 'denken', 'denkt', 'denken'], after: 'oft an die letzten Ferien.' },
  BLEIBEN: { forms: ['bleibe', 'bleibst', 'bleibt', 'bleiben', 'bleibt', 'bleiben'], after: 'heute lieber zu Hause.' },
  SCHREIBEN: { forms: ['schreibe', 'schreibst', 'schreibt', 'schreiben', 'schreibt', 'schreiben'], after: 'gerade einen langen Brief.' },
  KOMMEN: { forms: ['komme', 'kommst', 'kommt', 'kommen', 'kommt', 'kommen'], after: 'morgen früh vorbei.' },
  GEHEN: { forms: ['gehe', 'gehst', 'geht', 'gehen', 'geht', 'gehen'], after: 'jetzt langsam nach Hause.' },
  STEHEN: { forms: ['stehe', 'stehst', 'steht', 'stehen', 'steht', 'stehen'], after: 'schon lange vor der Tür.' },
  LIEGEN: { forms: ['liege', 'liegst', 'liegt', 'liegen', 'liegt', 'liegen'], after: 'noch müde im Bett.' },
  SITZEN: { forms: ['sitze', 'sitzt', 'sitzt', 'sitzen', 'sitzt', 'sitzen'], after: 'gemütlich auf dem Stuhl.' },
  FINDEN: { forms: ['finde', 'findest', 'findet', 'finden', 'findet', 'finden'], after: 'den richtigen Weg einfach nicht.' },
  SINGEN: { forms: ['singe', 'singst', 'singt', 'singen', 'singt', 'singen'], after: 'heute Abend ein schönes Lied.' },
  TRINKEN: { forms: ['trinke', 'trinkst', 'trinkt', 'trinken', 'trinkt', 'trinken'], after: 'am Morgen ein Glas Wasser.' },
  SCHWIMMEN: { forms: ['schwimme', 'schwimmst', 'schwimmt', 'schwimmen', 'schwimmt', 'schwimmen'], after: 'im Sommer gern im See.' },
  WARTEN: { forms: ['warte', 'wartest', 'wartet', 'warten', 'wartet', 'warten'], after: 'schon seit einer Stunde auf den Bus.' }
};

export function buildVerbPrompt(infinitive: string, random: () => number, shuffle: <T>(values: T[], random: () => number) => T[]): GrammarPrompt | null {
  const entry = verbConjugations[infinitive];
  if (!entry) return null;
  const personIndex = Math.floor(random() * entry.forms.length);
  const forms = [...new Set(entry.forms)];
  return {
    before: `${VERB_PRONOUNS[personIndex]} `,
    after: entry.after,
    correct: entry.forms[personIndex],
    choices: shuffle(forms, random)
  };
}

/** Identify person and tense together from a conjugated verb in context. */
export function buildVerbPropertyPrompt(infinitive: string, random: () => number, shuffle: <T>(values: T[], random: () => number) => T[]): GrammarPrompt | null {
  const entry = verbConjugations[infinitive];
  if (!entry) return null;
  const personIndex = Math.floor(random() * entry.forms.length);
  const persons = ['1. Person Singular', '2. Person Singular', '3. Person Singular', '1. Person Plural', '2. Person Plural', '3. Person Plural'];
  const tenses = ['Präsens', 'Präteritum', 'Perfekt'];
  const tense = 'Präsens';
  const correct = `${persons[personIndex]} · ${tense}`;
  const choices = shuffle([
    correct,
    `${persons[(personIndex + 1) % persons.length]} · ${tense}`,
    `${persons[personIndex]} · ${tenses[(tenses.indexOf(tense) + 1) % tenses.length]}`,
    `${persons[(personIndex + 3) % persons.length]} · ${tenses[(tenses.indexOf(tense) + 2) % tenses.length]}`
  ], random);
  return { before: `${VERB_PRONOUNS[personIndex]} `, after: `${entry.forms[personIndex]} ${entry.after}`, correct, choices, question: 'Bestimme Person und Tempus.', highlight: entry.forms[personIndex] };
}
