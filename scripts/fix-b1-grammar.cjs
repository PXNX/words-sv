const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'lib', 'data', 'de.b1.json');

const NOUNS = {
  abitur: 'neuter', absicht: 'feminine', alltag: 'masculine', änderung: 'feminine', anfang: 'masculine',
  anlage: 'feminine', anzeige: 'feminine', arbeiter: 'masculine', aufnahme: 'feminine', ausland: 'neuter',
  auswahl: 'feminine', autobahn: 'feminine', bauer: 'masculine', bedarf: 'masculine', betrieb: 'masculine',
  bild: 'neuter', blick: 'masculine', chance: 'feminine', datum: 'neuter', deutsche: null, dorf: 'neuter',
  droge: 'feminine', druck: 'masculine', eindruck: 'masculine', erhöhung: 'feminine', europäer: 'masculine',
  experte: 'masculine', fabrik: 'feminine', faktor: 'masculine', fehler: 'masculine', fest: 'neuter',
  folge: 'feminine', gebrauch: 'masculine', gebühr: 'feminine', gefahr: 'feminine', gerät: 'neuter',
  gewicht: 'neuter', gewinn: 'masculine', grund: 'masculine', handel: 'masculine', heimat: 'feminine',
  held: 'masculine', institut: 'neuter', job: 'masculine', jugend: 'feminine', kandidat: 'masculine',
  kauf: 'masculine', kontakt: 'masculine', kraft: 'feminine', kredit: 'masculine', kreis: 'masculine',
  kultur: 'feminine', land: 'neuter', luft: 'feminine', macht: 'feminine', mama: 'feminine', mangel: 'masculine',
  maschine: 'feminine', material: 'neuter', mehrheit: 'feminine', meister: 'masculine', menge: 'feminine',
  methode: 'feminine', minister: 'masculine', mittel: 'neuter', modell: 'neuter', moment: 'masculine',
  netz: 'neuter', netzwerk: 'neuter', nomen: 'neuter', note: 'feminine', pflicht: 'feminine', pfund: 'neuter',
  plan: 'masculine', politik: 'feminine', punkt: 'masculine', reaktion: 'feminine', religion: 'feminine',
  rente: 'feminine', risiko: 'neuter', rolle: 'feminine', rundfunk: 'masculine', schrift: 'feminine',
  schuld: 'feminine', schüler: 'masculine', schutz: 'masculine', seite: 'feminine', sekunde: 'feminine',
  semester: 'neuter', service: 'masculine', software: 'feminine', sorge: 'feminine', star: 'masculine',
  stau: 'masculine', steuer: 'feminine', stil: 'masculine', stimmung: 'feminine', stoff: 'masculine',
  studie: 'feminine', sucht: 'feminine', system: 'neuter', tabelle: 'feminine', talent: 'neuter',
  tatsache: 'feminine', teil: 'masculine', test: 'masculine', trend: 'masculine', umfrage: 'feminine',
  umgebung: 'feminine', uni: 'feminine', urteil: 'neuter', verein: 'masculine', vertrag: 'masculine',
  visum: 'neuter', wäsche: 'feminine', website: 'feminine', weise: 'feminine', werbung: 'feminine',
  werkzeug: 'neuter', wirkung: 'feminine', wort: 'neuter', wunder: 'neuter', zeugnis: 'neuter',
  zugang: 'masculine', zutaten: 'feminine'
};

const VERBS = [
  'abnehmen', 'anbieten', 'anmelden', 'auflösen', 'ausruhen', 'aussehen', 'bauen', 'bedanken', 'bedeuten',
  'bemerken', 'benutzen', 'besetzen', 'besitzen', 'beweisen', 'bleiben', 'dauern', 'drücken', 'erhöhen',
  'erkennen', 'erlauben', 'ersetzen', 'fehlen', 'fördern', 'fühlen', 'führen', 'füllen', 'gelingen', 'geraten',
  'gucken', 'halten', 'handeln', 'klappen', 'klingen', 'kopieren', 'kosten', 'kümmern', 'leiten', 'liefern',
  'lösen', 'merken', 'mischen', 'nutzen', 'pflegen', 'prüfen', 'rechnen', 'reichen', 'sammeln', 'schützen',
  'sichern', 'sinken', 'sorgen', 'stimmen', 'stoppen', 'stoßen', 'sterben', 'tauchen', 'üben', 'wählen', 'wirken'
];

const ADJECTIVES = [
  'abhängig', 'aktuell', 'beliebt', 'doppelt', 'einig', 'englisch', 'entfernt', 'falsch', 'flexibel',
  'fließend', 'folgende', 'ganze', 'gleiche', 'gleichen', 'halb', 'häufig', 'kürzlich', 'logisch', 'lokal',
  'modern', 'nötig', 'nützlich', 'offen', 'peinlich', 'populär', 'positiv', 'privat', 'reich', 'riesig',
  'schlank', 'schlimm', 'schwach', 'seltsam', 'spanisch', 'stark', 'streng', 'total', 'vertraut', 'wahr',
  'weltweit'
];

const ARTICLE_FOR = { masculine: 'der', feminine: 'die', neuter: 'das' };

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const out = {};
let nounCount = 0, verbCount = 0, adjCount = 0;
for (const key of Object.keys(data)) {
  const entry = data[key];
  const lower = key.toLowerCase();
  if (!entry.type && Object.prototype.hasOwnProperty.call(NOUNS, lower)) {
    const genus = NOUNS[lower];
    const spelling = lower.slice(0, 1).toUpperCase() + lower.slice(1);
    const value = { ...entry, type: 'noun' };
    if (genus) { value.genus = genus; value.article = ARTICLE_FOR[genus]; }
    out[spelling] = value;
    nounCount += 1;
    continue;
  }
  if (!entry.type && VERBS.includes(lower)) {
    out[key] = { ...entry, type: 'verb' };
    verbCount += 1;
    continue;
  }
  if (!entry.type && ADJECTIVES.includes(lower)) {
    out[key] = { ...entry, type: 'adjective' };
    adjCount += 1;
    continue;
  }
  out[key] = entry;
}

const sorted = Object.fromEntries(Object.keys(out).sort((a, b) => a.localeCompare(b, 'de')).map((key) => [key, out[key]]));
fs.writeFileSync(FILE, JSON.stringify(sorted, null, 2) + '\n');
console.log('nouns', nounCount, 'verbs', verbCount, 'adjectives', adjCount, 'total', Object.keys(sorted).length);
