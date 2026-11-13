// Word → picture. A picture next to a word gives memory a second hook (dual coding), which helps
// most with concrete words at A1 and A2. The pictures are emoji: they are on every device, need no
// download and no licence, and look like the learner's own keyboard. One table holds the concepts
// with their German and English words; `pictureFor` looks a word up by language.
// `scripts/picture-coverage.ts` reports how much of each level has a picture.

type Concept = readonly [emoji: string, de: string, en?: string];

// Several words may share a row: separate them with "|".
const CONCEPTS: readonly Concept[] = [
  // Food and drink
  ['🍎', 'Apfel', 'apple'], ['🍌', 'Banane', 'banana'], ['🍐', 'Birne'], ['🍊', 'Orange', 'orange'], ['🍇', 'Traube', 'grape'], ['🍓', 'Erdbeere'], ['🍋', 'Zitrone'],
  ['🍅', 'Tomate', 'tomato'], ['🥔', 'Kartoffel', 'potato'], ['🥕', 'Karotte|Möhre'], ['🥗', 'Salat', 'salad'], ['🥦', 'Gemüse'], ['🍉', 'Obst', 'fruit'], ['🌽', 'Mais', 'corn'],
  ['🍞', 'Brot', 'bread'], ['🥐', 'Brötchen'], ['🧈', 'Butter', 'butter'], ['🧀', 'Käse', 'cheese'], ['🥚', 'Ei', 'egg'], ['🥛', 'Milch', 'milk'], ['🍚', 'Reis', 'rice'],
  ['🥩', 'Fleisch|Rind', 'meat|beef'], ['🍗', 'Hähnchen', 'chicken'], ['🐟', 'Fisch', 'fish'], ['🌭', 'Wurst'], ['🥓', 'Schinken'], ['🍟', 'Pommes'], ['🍕', 'Pizza', 'pizza'],
  ['🍔', 'Hamburger', 'burger'], ['🥪', 'Sandwich', 'sandwich'], ['🍲', 'Suppe', 'soup'], ['🍰', 'Kuchen', 'cake'], ['🍪', 'Keks', 'cookie|biscuit'], ['🍫', 'Schokolade'], ['🍬', 'Süßigkeiten', 'candy|sweet'],
  ['🍦', 'Eis', 'ice'], ['🧂', 'Salz'], ['🍯', 'Honig'], ['🫒', 'Öl'], ['🍽️', 'Essen|Speisekarte|Restaurant', 'meal|dinner|dish|lunch|food'], ['🥣', 'Frühstück', 'bowl'], ['🫘', 'Bohne', 'bean'],
  ['☕', 'Kaffee|Café', 'coffee'], ['🍵', 'Tee|Tasse', 'tea|cup'], ['🧃', 'Saft', 'juice'], ['💧', 'Wasser', 'water'], ['🥤', 'Getränk|Mineralwasser', 'drink|coke'], ['🍺', 'Bier'], ['🍷', 'Wein'],
  ['🍾', 'Flasche', 'bottle'], ['🥛', 'Glas', 'glass'], ['🍴', 'Gabel'], ['🔪', 'Messer', 'knife'], ['🥄', 'Löffel'], ['🧁', 'Zucker', 'sugar'], ['🛒', 'Lebensmittel|einkaufen', 'shopping'],
  // People and family
  ['👶', 'Baby', 'baby'], ['🧒', 'Kind', 'child|kid'], ['👦', 'Junge', 'boy'], ['👧', 'Mädchen', 'girl'], ['👨', 'Mann|Herr', 'man|guy'], ['👩', 'Frau|Dame', 'woman|lady'],
  ['👪', 'Familie|Eltern', 'family|parent'], ['👵', 'Großmutter|Oma', 'grandma'], ['👴', 'Großvater|Opa', 'grandpa'], ['👫', 'Geschwister|Paar|Partner', 'pair|partner'], ['🧑‍🤝‍🧑', 'Freund|Freundin|Leute', 'friend|people'],
  ['👰', 'Hochzeit|Ehefrau', 'wife'], ['🤵', 'Ehemann', 'husband'], ['🧑‍🏫', 'Lehrer', 'teacher'], ['🧑‍🎓', 'Student|Schüler', 'student'], ['🧑‍⚕️', 'Arzt|Doktor', 'nurse'], ['👮', 'Polizist|Polizei', 'officer|cop'],
  ['🧑‍🍳', 'Koch', 'cook'], ['🧑‍🌾', 'Bauer', 'farmer'], ['🧑‍💼', 'Chef|Chefin|Kollege', 'business'], ['🧑‍🎤', 'Sänger', 'singer'], ['🧑‍🎨', 'Künstler', 'art'], ['🤴', 'König', 'king|prince'], ['👸', 'Königin|Prinzessin', 'princess'],
  ['🧑‍✈️', 'Pilot'], ['🧑‍🔧', 'Reparatur', 'engineer|worker'], ['🧳', 'Tourist|Gepäck|Koffer|Reise|Urlaub', 'trip|travel|vacation|holiday'], ['🙋', 'Gast', 'guest'], ['👻', 'Geist', 'ghost'],
  // Body
  ['👁️', 'Auge', 'eye'], ['👂', 'Ohr', 'ear'], ['👃', 'Nase', 'nose'], ['👄', 'Mund', 'mouth'], ['🦷', 'Zahn', 'tooth'], ['✋', 'Hand', 'hand'], ['💪', 'Arm', 'arm|strong'],
  ['🦵', 'Bein', 'leg|knee'], ['🦶', 'Fuß'], ['🧠', 'Kopf', 'brain|head|mind'], ['💇', 'Haar', 'hair|haircut'], ['🙂', 'Gesicht', 'face|smile'], ['❤️', 'Liebe|Herz', 'heart|love'], ['🤒', 'Fieber|krank', 'fever|sick'],
  ['🦴', 'Knochen', 'bone'], ['🤕', 'Schmerz|Unfall', 'headache|hurt'], ['💊', 'Medikament|Mittel', 'medicine'],
  // Animals and nature
  ['🐕', 'Hund', 'dog'], ['🐈', 'Katze', 'cat'], ['🐎', 'Pferd', 'horse'], ['🐄', 'Kuh', 'cow'], ['🐖', 'Schwein', 'pig'], ['🐑', 'Schaf', 'sheep'], ['🐦', 'Vogel', 'bird'],
  ['🐭', 'Maus', 'mouse|rat'], ['🐇', 'Kaninchen|Hase', 'rabbit'], ['🐻', 'Bär', 'bear'], ['🦁', 'Löwe', 'lion'], ['🐯', 'Tiger', 'tiger'], ['🐒', 'Affe', 'monkey'], ['🐍', 'Schlange', 'snake'],
  ['🐸', 'Frosch', 'frog'], ['🐝', 'Biene', 'bee'], ['🦃', 'Truthahn', 'turkey'], ['🦇', 'Fledermaus', 'bat'], ['🐾', 'Tier', 'animal|pet'], ['🌳', 'Baum', 'tree'], ['🌲', 'Wald'],
  ['🌸', 'Blume', 'flower'], ['🌹', 'Rose', 'rose'], ['🍃', 'Blatt', 'leaf'], ['🌱', 'Natur|pflanzen', 'grass|grow'], ['⛰️', 'Berg', 'mountain|hill'], ['🏝️', 'Insel', 'island'], ['🌊', 'Meer|See', 'sea'],
  ['🏞️', 'Fluss', 'river'], ['🏖️', 'Strand', 'beach'], ['☀️', 'Sonne|sonnig', 'sun|sunny|sunshine'], ['🌙', 'Mond|Nacht', 'moon|night'], ['⭐', 'Stern', 'star'], ['☁️', 'Wolke', 'cloud|cloudy'],
  ['🌧️', 'Regen|regnen', 'rain|rainy'], ['❄️', 'Schnee|schneien|Winter', 'snow|snowy|winter'], ['💨', 'Wind|windig', 'wind'], ['🌈', 'Himmel|bunt', 'sky'], ['🔥', 'Feuer', 'fire'], ['🌍', 'Welt|Land|Ausland', 'world'],
  ['🌷', 'Frühling', 'spring'], ['🏖️', 'Sommer', 'summer'], ['🍂', 'Herbst', 'autumn'], ['🌡️', 'Wetter|Grad', 'weather'], ['🪨', 'Stein', 'stone'], ['🌫️', 'Nebel', 'foggy'],
  // Home
  ['🏠', 'Haus|Wohnung|Heimat', 'house|home|flat'], ['🚪', 'Tür|Eingang|Ausgang', 'door'], ['🪟', 'Fenster', 'window'], ['🛏️', 'Bett|Zimmer|Einzelzimmer|Doppelzimmer', 'bed|bedroom'],
  ['🛋️', 'Sofa|Möbel', 'sofa|couch'], ['🪑', 'Stuhl', 'chair|seat'], ['🍳', 'Küche|Herd', 'kitchen'], ['🛁', 'Bad|baden', 'bath|bathroom'], ['🚿', 'Dusche|duschen', 'shower'], ['🚽', 'Toilette', 'toilet'],
  ['🧊', 'Kühlschrank'], ['💡', 'Lampe|Licht|Idee', 'light|idea'], ['🗄️', 'Schrank', 'shelf'], ['🪜', 'Treppe', 'step'], ['🛗', 'Aufzug'], ['🌻', 'Garten', 'garden|yard'], ['🔑', 'Schlüssel', 'key'],
  ['🧼', 'Seife'], ['🗑️', 'Müll', 'garbage'], ['🧹', 'putzen|Reinigung', 'clean'], ['🏢', 'Gebäude|Büro|Firma', 'building|office'], ['🧱', 'Boden|bauen', 'floor|wall|build'], ['🕯️', 'Kerze'], ['🧺', 'Haushalt'],
  ['🪞', 'Spiegel'], ['🛎️', 'Rezeption|Hotel', 'hotel|bell'], ['⛺', 'Zelt', 'camp'], ['🏰', 'Schloss', 'palace'], ['🧴', 'Parfüm'], ['🪥', 'Bürste', 'brush'], ['🪣', 'Eimer', 'bucket'],
  // Clothes
  ['🧥', 'Jacke|Mantel', 'jacket|coat'], ['👖', 'Jeans|Hose', 'jeans|trousers|pants'], ['👕', 'Hemd|Kleidung', 'shirt|clothes'], ['👗', 'Kleid|Mode', 'dress'], ['👞', 'Schuh|Schuhe', 'shoe'],
  ['🧢', 'Mütze', 'cap'], ['🎩', 'Hut', 'hat'], ['👓', 'Brille', 'glasses'], ['💍', 'Ring', 'ring'], ['📿', 'Kette'], ['👜', 'Tasche', 'bag'], ['🎒', 'Rucksack'], ['☂️', 'Regenschirm', 'umbrella'],
  ['👔', 'Anzug'], ['🩳', 'Rock', 'skirt'], ['🧦', 'Socke'], ['🧣', 'Schal'],
  // Town and travel
  ['🏙️', 'Stadt|Zentrum', 'city|town'], ['🏡', 'Dorf|Ort|Wohnort', 'hometown'], ['🛣️', 'Straße|Autobahn|Weg', 'street|way'], ['🏫', 'Schule|Klasse|Unterricht', 'school|class|college|lesson'],
  ['🏥', 'Krankenhaus|Praxis', 'hospital'], ['🏦', 'Bank|Konto', 'bank'], ['🏤', 'Post', 'post'], ['🏪', 'Geschäft|Laden|Kiosk', 'shop|store'], ['🛍️', 'Einkaufszentrum|Markt', 'sale'],
  ['🥖', 'Bäckerei'], ['🎬', 'Kino|Film', 'cinema|movie'], ['🎭', 'Theater', 'drama|stage|opera'], ['🖼️', 'Museum|Bild|Kunst', 'picture|painting'], ['⛪', 'Kirche', 'church'], ['🏛️', 'Rathaus', 'temple'],
  ['🏊', 'Schwimmbad|schwimmen', 'pool|swim|swimming'], ['🏞️', 'Park', 'park'], ['🦒', 'Zoo', 'zoo'], ['🌉', 'Brücke', 'bridge'], ['🗼', 'Turm|Sehenswürdigkeit', 'tower|sight'], ['🚦', 'Ampel|Verkehr'],
  ['🚗', 'Auto|Wagen|fahren', 'car|drive'], ['🚌', 'Bus', 'bus|coach'], ['🚆', 'Zug|Bahn', 'train'], ['🚇', 'S-Bahn|U-Bahn', 'subway|tube'], ['🚋', 'Straßenbahn'], ['🚕', 'Taxi', 'taxi'],
  ['🚲', 'Fahrrad|Rad', 'bicycle|bike|ride'], ['✈️', 'Flugzeug|Flug|fliegen', 'plane|jet|fly'], ['🛫', 'Flughafen|Abflug|abfliegen', 'airport'], ['🚢', 'Schiff', 'ship|boat'], ['🚚', 'Lkw', 'truck'],
  ['🚉', 'Bahnhof|Bahnsteig|Gleis|Haltestelle', 'station'], ['🎫', 'Fahrkarte|Ticket|Eintritt', 'ticket'], ['🗺️', 'Karte|Plan|Reiseführer', 'map'], ['🛂', 'Pass|Ausweis|Zoll'], ['🅿️', 'parken'],
  ['⛽', 'Tankstelle'], ['🧭', 'Norden|Süden|Osten|Westen'], ['🚧', 'Vorsicht|Achtung'], ['🛞', 'Reifen', 'wheel'], ['🏭', 'Fabrik', 'factory'], ['🚜', 'Bauernhof', 'farm'],
  // School, work and things
  ['📖', 'Buch|lesen', 'book|read|reading'], ['📓', 'Heft', 'notebook'], ['✏️', 'Bleistift', 'pencil'], ['🖊️', 'Kugelschreiber', 'pen'], ['📄', 'Papier|Formular|Zettel|Text', 'paper|page|form'],
  ['✉️', 'Brief|Nachricht', 'letter|message'], ['📧', 'E-Mail|Mail', 'mail'], ['📮', 'Briefmarke'], ['📦', 'Paket', 'box'], ['📰', 'Zeitung', 'news|magazine|article'], ['💻', 'Computer', 'computer'],
  ['🖨️', 'Drucker|drucken'], ['📱', 'Handy|Mobiltelefon|Tablet', 'mobile|phone'], ['☎️', 'Telefon|Anruf|anrufen|telefonieren', 'call'], ['📺', 'Fernsehen|Sendung', 'video|cartoon'], ['📻', 'Radio', 'radio'],
  ['📷', 'Foto|Kamera|fotografieren', 'photo|camera'], ['⏰', 'Uhr|wecken', 'clock|watch'], ['📅', 'Kalender|Datum|Termin', 'date'], ['💶', 'Geld|Euro', 'money'], ['💵', 'Dollar', 'dollar'], ['💳', 'Kredit', 'card'],
  ['🧾', 'Rechnung|Quittung', 'check'], ['🏷️', 'Preis|Angebot', 'price'], ['🎁', 'Geschenk', 'gift|present'], ['🧸', 'Spielzeug', 'toy|doll'], ['🔧', 'Werkzeug|reparieren', 'tool'], ['✂️', 'schneiden', 'cut'],
  ['🧰', 'Maschine|Apparat', 'machine'], ['🪙', 'Taschengeld', 'gold'], ['🔒', 'Passwort|abschließen|geschlossen', 'closed'], ['🪧', 'Schild|Plakat', 'sign|poster'], ['🎓', 'Studium|Prüfung|studieren', 'grade|study'],
  ['🧪', 'Biologie', 'science'], ['🔢', 'Zahl|Nummer', 'number|sum'], ['🔤', 'Buchstabe|Wort|buchstabieren', 'word|spell'], ['💼', 'Arbeit|Beruf|Job', 'job|work'], ['📋', 'Liste|Aufgabe|Test', 'list|test|survey'],
  ['🏺', 'Vase', 'vase'], ['🎀', 'Band', 'ribbon'], ['📏', 'Lineal', 'ruler'], ['🚩', 'Fahne', 'flag'], ['🪁', 'Drachen', 'kite'], ['🧻', 'Handtuch', 'towel'],
  // Free time
  ['⚽', 'Fußball', 'football|soccer'], ['🎾', 'Tennis', 'tennis'], ['🏐', 'Volleyball|Ball', 'ball'], ['⚾', 'Baseball', 'baseball'], ['🎿', 'Ski'], ['🏃', 'laufen|Sport', 'run|sport|exercise'],
  ['🥾', 'wandern|Spaziergang|Ausflug', 'walk'], ['💃', 'tanzen|Disco|Disko', 'dance|dancing'], ['🎵', 'Musik|Lied', 'music|song'], ['🎸', 'Gitarre', 'guitar'], ['🎹', 'Klavier', 'piano'], ['🥁', 'Trommel', 'drum'],
  ['🎤', 'singen|Konzert', 'sing|concert'], ['🎨', 'malen|zeichnen', 'paint|draw'], ['🎲', 'Spiel|spielen', 'game|play'], ['🎉', 'Party|Feier|Fest|feiern', 'party|festival'], ['🎂', 'Geburtstag', 'birthday'],
  ['🎈', 'Glückwunsch|gratulieren'], ['🍀', 'Glück', 'luck|lucky'], ['🏆', 'gewinnen|Erfolg', 'win'], ['🎯', 'Ziel', 'goal'], ['🎣', 'angeln', 'fishing'], ['🧺', 'Picknick', 'picnic'], ['🏇', 'reiten'],
  ['🏄', 'surfen', 'surf'], ['🎻', 'Musiker', 'musician|band'], ['📚', 'Bibliothek', 'library'], ['🧗', 'klettern', 'climb'],
  // Verbs and feelings that draw well
  ['😴', 'schlafen|müde', 'sleep|tired'], ['🍴', 'essen', 'eat'], ['🥤', 'trinken'], ['🧑‍🍳', 'kochen'], ['✍️', 'schreiben|unterschreiben', 'write'], ['👂', 'hören|zuhören', 'hear|listen'],
  ['👀', 'sehen|ansehen', 'see|look'], ['🗣️', 'sprechen|sagen|reden', 'speak|say|talk'], ['🚶', 'gehen', 'go'], ['🧍', 'stehen', 'stand'], ['🪑', 'sitzen', 'sit'], ['😂', 'lachen|lustig', 'laugh|funny'],
  ['😢', 'weinen', 'cry|sad'], ['😊', 'glücklich|zufrieden|freuen', 'happy|glad'], ['😠', 'böse|ärgern', 'angry'], ['😨', 'Angst', 'afraid'], ['🤔', 'denken|glauben', 'think|guess'], ['😍', 'lieben|verliebt'],
  ['🙏', 'bitten|Bitte|danke|danken', 'thank|thanks|pray'], ['👋', 'hallo|tschüss', 'hello|bye'], ['🤝', 'treffen|helfen|Hilfe', 'meet|help'], ['🧼', 'waschen', 'wash'], ['🛒', 'kaufen', 'buy'],
  ['💤', 'Traum|träumen', 'dream'], ['🤧', 'husten'], ['🚭', 'rauchen|Zigarette', 'smoke|smoking'], ['💋', 'küssen', 'kiss'], ['🤫', 'leise|ruhig', 'quiet'], ['📣', 'laut|rufen', 'noise'],
  // Qualities
  ['🔴', 'rot', 'red'], ['🔵', 'blau', 'blue'], ['🟢', 'grün', 'green'], ['🟡', 'gelb', 'yellow'], ['⚫', 'schwarz', 'black'], ['⚪', 'weiß', 'white'], ['🟤', 'braun', 'brown'], ['🟣', 'lila', 'purple'],
  ['🥵', 'heiß', 'hot'], ['🥶', 'kalt', 'cold'], ['🐢', 'langsam', 'slow'], ['🐇', 'schnell', 'fast'], ['💰', 'reich|teuer', 'rich'], ['✅', 'richtig', 'correct|right|true'], ['❌', 'falsch|Fehler', 'wrong|false'],
  ['🆕', 'neu', 'new'], ['💔', 'kaputt', 'broken'], ['🌑', 'dunkel', 'dark'], ['🔆', 'hell', 'bright'], ['🚫', 'verboten|verbieten'],
  // Time and numbers
  ['🌅', 'Morgen|früh', 'morning'], ['🌆', 'Abend', 'evening'], ['📆', 'Woche|Monat|Jahr', 'week|month|year'], ['⏳', 'Zeit|Stunde|Minute|warten', 'time|hour|minute|wait'],
  ['3️⃣', 'drei'], ['5️⃣', 'fünf'], ['8️⃣', 'acht']
];

function buildIndex(column: 1 | 2): Map<string, string> {
  const index = new Map<string, string>();
  for (const concept of CONCEPTS) {
    for (const word of (concept[column] ?? '').split('|')) {
      const key = word.trim().toLocaleUpperCase();
      // The first row that names a word wins, so the more specific rows stand further up.
      if (key && !index.has(key)) index.set(key, concept[0]);
    }
  }
  return index;
}

const INDEX: Record<string, Map<string, string> | undefined> = { de: buildIndex(1), en: buildIndex(2) };

/** The picture for a word of the given learning language, or `null` when there is none. Case does not matter. */
export function pictureFor(language: string, word: string): string | null {
  return INDEX[language]?.get(word.trim().toLocaleUpperCase()) ?? null;
}

/** Languages that have pictures at all. */
export function hasPictures(language: string): boolean {
  return (INDEX[language]?.size ?? 0) > 0;
}

/** Every word with a picture in a language (uppercased), for the coverage report and tests. */
export function picturedWords(language: string): string[] {
  return [...(INDEX[language]?.keys() ?? [])];
}

/** The other language's words on the same picture row(s) as `word`: "Apfel" → ["apple"]. Only German and English. */
export function pictureTranslations(language: string, word: string): string[] {
  const column = language === 'de' ? 1 : language === 'en' ? 2 : 0;
  if (!column) return [];
  const key = word.trim().toLocaleUpperCase();
  const other = column === 1 ? 2 : 1;
  return CONCEPTS.filter((concept) => (concept[column] ?? '').split('|').some((entry) => entry.trim().toLocaleUpperCase() === key)).flatMap((concept) => (concept[other] ?? '').split('|').map((entry) => entry.trim()).filter(Boolean));
}
