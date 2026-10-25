import { playableLanguages } from '#lib/data/vocabulary.js';
import type { Detail, Story, Text } from './stories';

/*
 * Stories written for German learners only (see `languages` on Story): everyday errands, a day at the
 * farm and the zoo, an engineering office, the beach at sunset and a noisy airport; Lilith's birthday,
 * Christmas, New Year's resolutions, fitness goals and saying goodbye to Opa. From B1 on, characters
 * also discuss and argue (beer, pets, music, food, wine, the Ausländerbehörde, social media, project
 * management, a court hearing, a language app), with deeper reasons and more statistics the higher
 * the level. The animals speak in sounds ("Muh!", "Törööö!"), which play in place of the word when
 * the story is read aloud.
 */

/*
 * German-only characters, drawn and voiced:
 * - Ali runs the döner shop on the corner. Warm, quick-witted and always busy; knows everyone in the
 *   street, calls regulars "Chef" or "mein Freund" and never forgets how they take their sauce.
 * - Robert is a handyman (Handwerker). Gruff, practical, few words; pencil behind his ear, a folding
 *   rule in his overalls. Fixes anything, sighs at how it was installed and always needs one more part.
 * - Bauer Fritz is a big, round farmer with a straw hat and a checked shirt. Slow, jovial and deeply
 *   rooted; loves a hearty meal, talks to his animals (Berta, Blitz) like to old friends, and knows
 *   the weather better than any app.
 * - Tobias is a lifeguard at the lake and the beach and a hardcore gym bro: huge shoulders, protein
 *   shakes, counts reps and calories and turns everything into a workout. Loud but kind-hearted and
 *   the first one in the water when someone needs help.
 * - Selma is a nurse. Calm, caring and unflappable after years of night shifts; explains things
 *   patiently, takes no nonsense about medicine and always has a plaster and good advice.
 * - Kumar from India is Mia and Tom's new flatmate. Cheerful, chaotic and messy: dishes pile up,
 *   socks turn up everywhere and his curry smells through the whole flat. Learning German with lots
 *   of enthusiasm and the occasional mix-up; Lilith adores him because he drops food.
 * - Simon is an engineer from Hamburg. Precise, a little nerdy, pens in his shirt pocket; plans everything,
 *   explains how things work in far too much detail and gets excited about well-built machines and bridges.
 *   A true northerner: says Moin at any time of day, nö for nein, schnacken for reden, Schietwetter for
 *   bad weather, and slips in the odd dat, wat, büschen and kiek mal.
 * - König Ludwig is a guide at Neuschwanstein who gives his tours in costume as Ludwig II, the Fairy-Tale
 *   King: crown, dark coat and moustache, grand gestures, a dry sense of humour and a melancholy streak.
 */

// The same text in every language slot, for stories limited to German learners.
export function german(text: string): Text {
  return Object.fromEntries(playableLanguages.map(({ code }) => [code, text])) as Text;
}

// One choice of a detail that varies between playthroughs (see Detail), in German.
function choice(words: Record<string, string>, ball?: string): Detail[number] {
  return { words: Object.fromEntries(Object.entries(words).map(([key, text]) => [key, german(text)])), ball };
}

export const germanStories: Story[] = [
  {
    id: 'a1-farm',
    level: 'a1',
    scene: 'farm',
    cast: ['mia', 'cow', 'horse', 'bird'],
    languages: ['de'],
    weathers: ['sunny', 'cloudy'],
    title: german('Auf dem Bauernhof'),
    beats: [
      { kind: 'narration', text: german('Mia ist auf dem Bauernhof von ihrer Tante. Es ist sechs Uhr morgens.') },
      { kind: 'narration', text: german('Die Kuh Berta ist schwarz und weiß. Sie steht auf der Wiese und frisst Gras.') },
      { kind: 'line', speaker: 'cow', mood: 'happy', text: german('Muh!') },
      { kind: 'line', speaker: 'mia', text: german('Guten Morgen, Berta! Du gibst uns jeden Tag Milch. Danke!') },
      { kind: 'narration', enters: ['horse'], text: german('Neben dem Stall wartet das Pferd Blitz. Es ist braun und sehr schnell.') },
      { kind: 'line', speaker: 'horse', mood: 'happy', text: german('Wieher!') },
      { kind: 'line', speaker: 'mia', text: german('Hallo {name}! Möchtest du Blitz eine Karotte geben?') },
      { kind: 'reply', to: 'mia', options: [
        german('Ja, gern!'),
        german('Ich bin eine Karotte.'),
        german('Gute Nacht, Blitz!')
      ] },
      { kind: 'narration', enters: ['bird'], text: german('Auf dem Dach sitzt ein kleiner gelber Vogel. Er heißt Pieps.') },
      { kind: 'line', speaker: 'bird', mood: 'happy', text: german('Piep, piep!') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Pieps singt jeden Morgen. Er ist unser Wecker!') },
      { kind: 'question', prompt: german('Was gibt die Kuh Berta?'), options: [german('Milch'), german('Eier'), german('Wasser')] },
      { kind: 'question', prompt: german('Was frisst die Kuh?'), options: [german('Gras'), german('Fisch'), german('Kuchen')] },
      { kind: 'question', prompt: german('Welche Farbe hat das Pferd?'), options: [german('Braun'), german('Weiß'), german('Schwarz')] },
      { kind: 'question', prompt: german('Wo sitzt der Vogel?'), options: [german('Auf dem Dach'), german('Im Stall'), german('Auf der Kuh')] },
      { kind: 'question', prompt: german('Was macht Pieps jeden Morgen?'), options: [german('Er singt.'), german('Er schläft.'), german('Er frisst Gras.')] },
      { kind: 'question', prompt: german('Wie spät ist es, als Mia auf dem Bauernhof ist?'), options: [german('Sechs Uhr morgens'), german('Zwölf Uhr mittags'), german('Neun Uhr abends')] },
      { kind: 'question', prompt: german('Welche Farbe hat die Kuh?'), options: [german('Schwarz und weiß'), german('Braun'), german('Gelb')] },
      { kind: 'question', prompt: german('Welche Farbe hat der Vogel?'), options: [german('Gelb'), german('Rot'), german('Schwarz')] }
    ]
  },
  {
    id: 'a1-bakery',
    level: 'a1',
    scene: 'bakery',
    cast: ['tom', 'mia'],
    languages: ['de'],
    title: german('In der Bäckerei'),
    beats: [
      { kind: 'narration', text: german('Es ist sieben Uhr morgens. Tom arbeitet in einer Bäckerei. Es riecht nach frischem Brot.') },
      { kind: 'line', speaker: 'mia', text: german('Guten Morgen! Ich hätte gern vier Brötchen, bitte.') },
      { kind: 'line', speaker: 'tom', text: german('Gern. Möchtest du auch eine Brezel? Sie ist noch warm.') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Ja, eine Brezel, bitte. Und ein Stück Apfelkuchen für meine Oma.') },
      { kind: 'line', speaker: 'tom', text: german('Hallo {name}! Und was möchtest du?') },
      { kind: 'reply', to: 'tom', options: [
        german('Ein Vollkornbrot, bitte.'),
        german('Ein Kilo Schrauben, bitte.'),
        german('Ich möchte schwimmen.')
      ] },
      { kind: 'line', speaker: 'tom', text: german('Das macht zusammen zehn Euro fünfzig.') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Hier, bitte. Einen schönen Tag noch!') },
      { kind: 'question', prompt: german('Wo arbeitet Tom?'), options: [german('In einer Bäckerei'), german('Im Zoo'), german('Am Flughafen')] },
      { kind: 'question', prompt: german('Wie viele Brötchen kauft Mia?'), options: [german('Vier'), german('Zwei'), german('Zehn')] },
      { kind: 'question', prompt: german('Wie ist die Brezel?'), options: [german('Noch warm'), german('Sehr alt'), german('Kalt')] },
      { kind: 'question', prompt: german('Für wen ist der Apfelkuchen?'), options: [german('Für Mias Oma'), german('Für Tom'), german('Für Lilith')] },
      { kind: 'question', prompt: german('Wie viel kostet alles zusammen?'), options: [german('Zehn Euro fünfzig'), german('Fünf Euro'), german('Zwanzig Euro')] }
    ]
  },
  {
    id: 'a2-zoo',
    level: 'a2',
    scene: 'zoo',
    cast: ['leo', 'giraffe', 'elephant', 'snake'],
    languages: ['de'],
    weathers: ['sunny', 'cloudy'],
    title: german('Im Zoo'),
    beats: [
      { kind: 'narration', text: german('Am Samstag um zehn Uhr besucht Leo mit dir den Zoo. Der Eintritt kostet zwölf Euro. Zuerst geht ihr zu den Giraffen.') },
      { kind: 'line', speaker: 'leo', mood: 'happy', text: german('Schau mal, {name}! Das ist Gisela. Sie ist über fünf Meter groß und hat braune Flecken.') },
      { kind: 'line', speaker: 'giraffe', mood: 'curious', text: german('Brummm …') },
      { kind: 'line', speaker: 'leo', text: german('Giraffen sind meistens still. Aber nachts summen sie ganz leise.') },
      { kind: 'narration', enters: ['elephant'], text: german('Neben dem Giraffengehege steht der Elefant Benno. Er ist grau, wiegt fast sechs Tonnen und spritzt mit seinem Rüssel Wasser in die Luft.') },
      { kind: 'line', speaker: 'elephant', mood: 'happy', text: german('Törööö!') },
      { kind: 'line', speaker: 'leo', mood: 'curious', text: german('Vorsicht, {name}, sonst wirst du nass! Hast du schon einmal einen Elefanten gesehen?') },
      { kind: 'reply', to: 'leo', options: [
        german('Ja, im Fernsehen, aber noch nie in echt.'),
        german('Ja, er wohnt in meinem Kühlschrank.'),
        german('Nein, ich bin ein Elefant.')
      ] },
      { kind: 'narration', enters: ['snake'], exits: ['giraffe', 'elephant'], text: german('Zum Schluss geht ihr ins Reptilienhaus. Hinter dem Glas liegt eine grüne Schlange. Sie ist drei Meter lang.') },
      { kind: 'line', speaker: 'snake', text: german('Ssssss!') },
      { kind: 'line', speaker: 'leo', text: german('Keine Angst. Zischi ist harmlos – sie zischt nur, wenn sie Hunger hat. Ihr Futter bekommt sie erst um drei Uhr.') },
      { kind: 'question', prompt: german('Wie groß ist die Giraffe?'), options: [german('Über fünf Meter'), german('Zwei Meter'), german('Zehn Zentimeter')] },
      { kind: 'question', prompt: german('Wann summen Giraffen?'), options: [german('Nachts'), german('Mittags'), german('Nur im Winter')] },
      { kind: 'question', prompt: german('Was macht der Elefant mit seinem Rüssel?'), options: [german('Er spritzt Wasser in die Luft.'), german('Er isst ein Eis.'), german('Er spielt Klavier.')] },
      { kind: 'question', prompt: german('Wo liegt die Schlange?'), options: [german('Im Reptilienhaus hinter dem Glas'), german('Im Giraffengehege'), german('Im Wasser beim Elefanten')] },
      { kind: 'question', prompt: german('Wann zischt Zischi?'), options: [german('Wenn sie Hunger hat'), german('Wenn es regnet'), german('Wenn Leo singt')] },
      { kind: 'question', prompt: german('Wie viel kostet der Eintritt?'), options: [german('Zwölf Euro'), german('Zwei Euro'), german('Zwanzig Euro')] },
      { kind: 'question', prompt: german('Welche Farbe hat der Elefant?'), options: [german('Grau'), german('Braun'), german('Grün')] },
      { kind: 'question', prompt: german('Wie lang ist die Schlange?'), options: [german('Drei Meter'), german('Dreißig Zentimeter'), german('Zehn Meter')] },
      { kind: 'question', prompt: german('Um wie viel Uhr bekommt Zischi ihr Futter?'), options: [german('Um drei Uhr'), german('Um zehn Uhr'), german('Um Mitternacht')] }
    ]
  },
  {
    id: 'a2-butcher',
    level: 'b1',
    scene: 'butcher',
    cast: ['paul', 'hans'],
    languages: ['de'],
    title: german('Beim Metzger'),
    beats: [
      { kind: 'narration', text: german('Samstag, kurz nach neun Uhr, in der Metzgerei von Herrn Paul. Vor der Theke steht eine lange Schlange – und ganz vorne steht Hans.') },
      { kind: 'line', speaker: 'paul', mood: 'happy', text: german('Grüß Gott, Hans! Wie immer?') },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('Freilich! Sechs Weißwürste, zwei Paar Wiener und ein Pfund Leberkäs. Heut kommt mei ganze Familie.') },
      { kind: 'line', speaker: 'paul', text: german('Gern. Der Leberkäse ist ganz frisch und schön braun, gerade aus dem Ofen. Darf es sonst noch etwas sein?') },
      { kind: 'line', speaker: 'hans', text: german('Ja mei, a bisserl Aufschnitt für die Kinder. Und was nimmst du, {name}?') },
      { kind: 'reply', to: 'hans', options: [
        german('Zweihundert Gramm Schinken, bitte.'),
        german('Einen Liter Schinken, bitte.'),
        german('Ich hätte gern ein Fahrrad.')
      ] },
      { kind: 'line', speaker: 'paul', mood: 'curious', text: german('Kommt sofort. Möchten Sie den Schinken in dünnen Scheiben?') },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('Und a Wurstsemmel für glei, sonst halt i bis Mittag ned durch!') },
      { kind: 'line', speaker: 'paul', mood: 'happy', text: german('Für dich, Hans, geht die Wurstsemmel aufs Haus. Der Rest macht achtzehn Euro vierzig.') },
      { kind: 'question', prompt: german('Wo kauft Hans ein?'), options: [german('In der Metzgerei'), german('In der Bäckerei'), german('Im Supermarkt')] },
      { kind: 'question', prompt: german('Warum kauft Hans so viel?'), options: [german('Weil seine ganze Familie kommt'), german('Weil er eine Metzgerei eröffnet'), german('Weil er Hunger auf Kuchen hat')] },
      { kind: 'question', prompt: german('Wie viel Leberkäse kauft Hans?'), options: [german('Ein Pfund'), german('Ein Kilo'), german('Hundert Gramm')] },
      { kind: 'question', prompt: german('Wie ist der Leberkäse?'), options: [german('Ganz frisch aus dem Ofen'), german('Schon eine Woche alt'), german('Tiefgefroren')] },
      { kind: 'question', prompt: german('Was bekommt Hans umsonst?'), options: [german('Eine Wurstsemmel'), german('Den Leberkäse'), german('Zwei Weißwürste')] },
      { kind: 'question', prompt: german('Wie viele Weißwürste kauft Hans?'), options: [german('Sechs'), german('Zwei'), german('Zehn')] },
      { kind: 'question', prompt: german('Wie viel muss Hans bezahlen?'), options: [german('Achtzehn Euro vierzig'), german('Acht Euro vierzehn'), german('Achtzig Euro')] },
      { kind: 'question', prompt: german('Wann ist Hans in der Metzgerei?'), options: [german('Am Samstag kurz nach neun Uhr'), german('Am Sonntagabend'), german('Am Freitag um Mitternacht')] }
    ]
  },
  {
    id: 'a2-boutique',
    level: 'a2',
    scene: 'boutique',
    cast: ['leo', 'kim'],
    languages: ['de'],
    title: german('Im Modegeschäft'),
    beats: [
      { kind: 'narration', text: german('In zwei Wochen heiratet Leos Schwester, und Leo braucht noch einen Anzug. Im Modegeschäft hilft ihm die Verkäuferin Kim.') },
      { kind: 'line', speaker: 'kim', text: german('Guten Tag! Kann ich Ihnen helfen?') },
      { kind: 'line', speaker: 'leo', text: german('Ja, bitte. Ich suche einen dunklen Anzug. Ich trage Größe 50.') },
      { kind: 'line', speaker: 'kim', text: german('Hier haben wir einen in Dunkelblau für zweihundertfünfzig Euro. Die Umkleidekabine ist gleich da hinten.') },
      { kind: 'narration', text: german('Ein paar Minuten später kommt Leo aus der Kabine. Die Hose ist viel zu lang.') },
      { kind: 'line', speaker: 'leo', mood: 'curious', text: german('{name}, was meinst du? Passt mir der Anzug?') },
      { kind: 'reply', to: 'leo', options: [
        german('Die Jacke passt gut, aber die Hose ist zu lang.'),
        german('Perfekt, die Hose muss so lang sein.'),
        german('Ich glaube, das ist ein Fahrrad.')
      ] },
      { kind: 'line', speaker: 'kim', mood: 'happy', text: german('Kein Problem, wir kürzen die Hose kostenlos. Bis Freitag um zwölf Uhr ist sie fertig.') },
      { kind: 'line', speaker: 'leo', mood: 'happy', text: german('Super! Und eine Krawatte brauche ich auch noch – vielleicht in Rot mit weißen Punkten?') },
      { kind: 'question', prompt: german('Warum braucht Leo einen Anzug?'), options: [german('Für die Hochzeit seiner Schwester'), german('Für ein Vorstellungsgespräch'), german('Für eine Party im Büro')] },
      { kind: 'question', prompt: german('Welche Farbe hat der Anzug?'), options: [german('Dunkelblau'), german('Hellgrau'), german('Grün')] },
      { kind: 'question', prompt: german('Was ist das Problem mit dem Anzug?'), options: [german('Die Hose ist zu lang.'), german('Die Jacke ist zu klein.'), german('Der Anzug ist zu teuer.')] },
      { kind: 'question', prompt: german('Bis wann ist die Hose fertig?'), options: [german('Bis Freitag um zwölf Uhr'), german('Bis morgen früh'), german('Bis nächsten Monat')] },
      { kind: 'question', prompt: german('Was möchte Leo noch kaufen?'), options: [german('Eine rote Krawatte mit weißen Punkten'), german('Rote Schuhe'), german('Einen roten Hut')] },
      { kind: 'question', prompt: german('Wann heiratet Leos Schwester?'), options: [german('In zwei Wochen'), german('Morgen'), german('Nächstes Jahr')] },
      { kind: 'question', prompt: german('Welche Größe trägt Leo?'), options: [german('Größe 50'), german('Größe 40'), german('Größe 60')] },
      { kind: 'question', prompt: german('Wie viel kostet der Anzug?'), options: [german('Zweihundertfünfzig Euro'), german('Fünfundzwanzig Euro'), german('Zweitausend Euro')] }
    ]
  },
  {
    id: 'a2-kumar',
    level: 'a2',
    scene: 'home',
    cast: ['kumar', 'mia', 'lilith', 'tom'],
    languages: ['de'],
    title: german('Kumar lernt Deutsch'),
    details: [
      [choice({ test: 'Donnerstag' }), choice({ test: 'Freitag' }), choice({ test: 'Montag' })],
      [
        choice({ book: 'blaues', colour: 'Blau' }),
        choice({ book: 'grünes', colour: 'Grün' }),
        choice({ book: 'gelbes', colour: 'Gelb' }),
        choice({ book: 'rotes', colour: 'Rot' })
      ]
    ],
    beats: [
      { kind: 'narration', text: german('Dienstagabend, halb acht. Kumar sitzt seit zwei Stunden am Küchentisch und lernt für seinen Deutschtest am {test}. Um ihn herum liegen drei Bücher, fünf bunte Stifte und eine Socke.') },
      { kind: 'line', speaker: 'kumar', mood: 'sad', text: german('Der, die, das … Warum braucht ein Tisch einen Artikel? In meiner Sprache ist ein Tisch einfach ein Tisch!') },
      { kind: 'narration', enters: ['mia'], text: german('Mia kommt in die Küche, um Tee zu kochen.') },
      { kind: 'line', speaker: 'mia', text: german('Na, Kumar, wie läuft es mit dem Deutsch?') },
      { kind: 'line', speaker: 'kumar', mood: 'worried', text: german('Schlecht. Heute Morgen war ich beim Bäcker. Ich wollte sagen: „Ich hätte gern zwei Brötchen.“ Aber ich habe gesagt: „Ich bin zwei Brötchen.“') },
      { kind: 'line', speaker: 'mia', mood: 'laughing', text: german('Haha! Und was hat der Bäcker gemacht?') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Er hat gelacht und mir drei Brötchen gegeben. Eins war gratis.') },
      { kind: 'narration', enters: ['lilith'], sfx: 'meow', text: german('Plötzlich springt Lilith auf den Tisch und setzt sich genau auf Kumars {book} Heft.') },
      { kind: 'line', speaker: 'kumar', mood: 'surprised', text: german('Lilith, nein! Das ist meine Hausaufgabe! … Moment. Heißt es der Katze, die Katze oder das Katze?') },
      { kind: 'line', speaker: 'mia', mood: 'curious', text: german('{name}, hilf Kumar doch mal. Wie heißt es richtig?') },
      { kind: 'reply', to: 'mia', options: [german('die Katze'), german('der Katze'), german('das Katze')] },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Die Katze! Danke, {name}. Also: Die Katze sitzt auf meinem Heft – und die Katze hat Hunger, glaube ich.') },
      { kind: 'narration', enters: ['tom'], text: german('Um acht Uhr kommt Tom nach Hause. Er trägt eine rote Tüte vom Supermarkt.') },
      { kind: 'line', speaker: 'tom', mood: 'curious', text: german('Hallo zusammen! Kumar, du siehst aber traurig aus. Was ist los?') },
      { kind: 'line', speaker: 'kumar', mood: 'sad', text: german('Deutsch ist so schwer. Gestern war es so warm, und ich habe zu unserer Nachbarin gesagt: „Ich bin heiß.“ Sie hat mich sehr komisch angeschaut.') },
      { kind: 'line', speaker: 'tom', mood: 'laughing', text: german('Haha, oh nein! Man sagt: „Mir ist heiß.“ Aber keine Sorge, mir ging es genauso. In London wollte ich ein Steak bestellen und habe gesagt: „I want to become a steak.“') },
      { kind: 'line', speaker: 'kumar', mood: 'laughing', text: german('Haha! Du wolltest ein Steak werden?') },
      { kind: 'question', prompt: german('Was wollte Tom in London eigentlich?'), options: [german('Ein Steak bestellen'), german('Ein Steak werden'), german('Koch werden')] },
      { kind: 'line', speaker: 'kumar', mood: 'curious', text: german('{name}, du lernst doch auch Deutsch. Wie lernst du neue Wörter?') },
      { kind: 'reply', to: 'kumar', options: [
        german('Jeden Tag ein bisschen, zum Beispiel zehn Minuten am Morgen.'),
        german('Nur einmal im Jahr, aber dann zehn Stunden lang.'),
        german('Ich lege das Wörterbuch unter mein Kissen.')
      ] },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Zehn Minuten jeden Tag – das schaffe ich! Ab morgen lerne ich jeden Morgen um sieben Uhr. Mit Tee und ohne Socke auf dem Tisch.') },
      { kind: 'narration', sfx: 'purr', holds: { lilith: 'fish' }, text: german('Kumar holt sein Fischcurry aus dem Kühlschrank. Dabei fällt ein Stück Fisch auf den Boden – und Lilith ist sofort da.') },
      { kind: 'line', speaker: 'lilith', mood: 'happy', text: german('Miau! Kumar ist mein Lieblingsmensch.') },
      { kind: 'line', speaker: 'mia', mood: 'laughing', text: german('Siehst du, Kumar? Lilith versteht dich perfekt.') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Dann übe ich ab jetzt mit Lilith. Sie lacht nie über meine Artikel.') },
      { kind: 'question', prompt: german('Wann hat Kumar seinen Deutschtest?'), options: [german('Am {test}'), german('Am Dienstag'), german('Morgen früh')] },
      { kind: 'question', prompt: german('Wie lange lernt Kumar schon am Küchentisch?'), options: [german('Seit zwei Stunden'), german('Seit zehn Minuten'), german('Seit fünf Tagen')] },
      { kind: 'question', prompt: german('Wie viele Brötchen hat Kumar beim Bäcker bekommen?'), options: [german('Drei'), german('Zwei'), german('Eins')] },
      { kind: 'question', prompt: german('Welche Farbe hat Kumars Heft?'), options: [german('{colour}'), german('{colour#1}'), german('{colour#2}')] },
      { kind: 'question', prompt: german('Um wie viel Uhr kommt Tom nach Hause?'), options: [german('Um acht Uhr'), german('Um halb acht'), german('Um sieben Uhr')] },
      { kind: 'question', prompt: german('Was sagt man richtig, wenn es sehr warm ist?'), options: [german('Mir ist heiß.'), german('Ich bin heiß.'), german('Ich habe heiß.')] },
      { kind: 'question', prompt: german('Wann will Kumar ab morgen lernen?'), options: [german('Jeden Morgen um sieben Uhr'), german('Jeden Abend um zehn Uhr'), german('Nur am Wochenende')] },
      { kind: 'question', prompt: german('Warum mag Lilith Kumar so gern?'), options: [german('Weil er Essen fallen lässt'), german('Weil er mit ihr Deutsch lernt'), german('Weil er sie jeden Tag bürstet')] }
    ]
  },
  {
    id: 'b1-perfumery',
    level: 'b1',
    scene: 'perfumery',
    cast: ['oma', 'mia'],
    languages: ['de'],
    title: german('In der Parfümerie'),
    beats: [
      { kind: 'narration', text: german('Oma hat bald Hochzeitstag. Sie sucht ein neues Parfüm und hat Mia gebeten, sie in die Parfümerie zu begleiten.') },
      { kind: 'line', speaker: 'oma', mood: 'sad', text: german('Seit vierzig Jahren benutze ich dasselbe Parfüm. Aber leider wird es nicht mehr hergestellt.') },
      { kind: 'line', speaker: 'mia', text: german('Dann probieren wir einfach ein paar neue Düfte aus. Wie wäre es mit diesem hier? Es riecht nach Rosen und Vanille.') },
      { kind: 'line', speaker: 'oma', text: german('Hm, das ist mir ein bisschen zu süß. Ich mag eher frische, leichte Düfte.') },
      { kind: 'line', speaker: 'mia', mood: 'curious', text: german('{name}, du hast doch eine gute Nase. Welchen Duft würdest du Oma empfehlen?') },
      { kind: 'reply', to: 'mia', options: [
        german('Vielleicht etwas Frisches mit Zitrone und Lavendel?'),
        german('Am besten etwas, das nach Benzin riecht.'),
        german('Ich empfehle ein Paar Wanderschuhe.')
      ] },
      { kind: 'line', speaker: 'oma', mood: 'happy', text: german('Zitrone und Lavendel – das klingt wunderbar! Genau wie der Garten, in dem Opa mir damals den Heiratsantrag gemacht hat.') },
      { kind: 'narration', text: german('Die Verkäuferin sprüht den Duft auf einen Papierstreifen. Oma schließt die Augen und lächelt.') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Den nehmen wir! Und eine kleine Probe für Opa gibt es gratis dazu.') },
      { kind: 'question', prompt: german('Warum braucht Oma ein neues Parfüm?'), options: [german('Weil ihr altes nicht mehr hergestellt wird'), german('Weil sie ihr altes verloren hat'), german('Weil Opa es nicht mag')] },
      { kind: 'question', prompt: german('Was gefällt Oma an dem ersten Duft nicht?'), options: [german('Er ist ihr zu süß.'), german('Er ist zu teuer.'), german('Er riecht nach Zitrone.')] },
      { kind: 'question', prompt: german('Welche Düfte mag Oma?'), options: [german('Frische, leichte Düfte'), german('Schwere, süße Düfte'), german('Düfte nach Holz und Rauch')] },
      { kind: 'question', prompt: german('Woran erinnert Oma der neue Duft?'), options: [german('An den Garten, in dem Opa ihr den Antrag gemacht hat'), german('An ihre erste Wohnung'), german('An eine Reise nach Paris')] },
      { kind: 'question', prompt: german('Was gibt es gratis dazu?'), options: [german('Eine kleine Probe für Opa'), german('Eine Tasche'), german('Einen Lippenstift')] }
    ]
  },
  {
    id: 'b1-beach',
    level: 'b1',
    scene: 'beach',
    cast: ['mia', 'leo', 'hans'],
    languages: ['de'],
    weathers: ['sunny'],
    title: german('Sonnenuntergang am Strand'),
    beats: [
      { kind: 'narration', sfx: 'waves', text: german('Mia und Leo machen Urlaub an der Ostsee. Am Abend treffen sie sich am Strand, um den Sonnenuntergang anzuschauen.') },
      { kind: 'line', speaker: 'leo', text: german('Schau mal, wie die Sonne langsam im Meer versinkt. Der Himmel ist ganz orange und rosa.') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Wunderschön! Jetzt fehlt eigentlich nur noch ein kühles Getränk.') },
      { kind: 'narration', enters: ['hans'], text: german('In diesem Moment stapft Hans mit einer Kühltasche über den Sand.') },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('Servus, ihr zwoa! I hab mir dacht, a Sonnenuntergang ohne Bier is wia a Brezn ohne Salz. Wer mag a Helles?') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Du bist ein Schatz, Hans! {name}, magst du auch eins?') },
      { kind: 'reply', to: 'mia', options: [
        german('Gern, aber für mich bitte ein alkoholfreies.'),
        german('Nein danke, ich trinke lieber Sand.'),
        german('Ja, aber nur, wenn die Sonne aufgeht.')
      ] },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('Freilich, alkoholfrei hab i aa dabei. Also dann: Prost auf den Urlaub!') },
      { kind: 'narration', sfx: 'waves', text: german('Die drei stoßen an. Die Wellen rauschen, und die letzten Sonnenstrahlen verschwinden hinter dem Horizont.') },
      { kind: 'line', speaker: 'leo', mood: 'happy', text: german('Wisst ihr was? Das machen wir ab jetzt jeden Abend.') },
      { kind: 'question', prompt: german('Wo machen Mia und Leo Urlaub?'), options: [german('An der Ostsee'), german('In den Alpen'), german('In Berlin')] },
      { kind: 'question', prompt: german('Welche Farben hat der Himmel?'), options: [german('Orange und Rosa'), german('Grau und Schwarz'), german('Grün und Blau')] },
      { kind: 'question', prompt: german('Was bringt Hans mit?'), options: [german('Eine Kühltasche mit Bier'), german('Einen Sonnenschirm'), german('Eine Gitarre')] },
      { kind: 'question', prompt: german('Womit vergleicht Hans einen Sonnenuntergang ohne Bier?'), options: [german('Mit einer Brezel ohne Salz'), german('Mit einem Strand ohne Sand'), german('Mit einem Winter ohne Schnee')] },
      { kind: 'question', prompt: german('Was wollen die drei ab jetzt jeden Abend machen?'), options: [german('Den Sonnenuntergang zusammen anschauen'), german('Früh ins Bett gehen'), german('Im Meer schwimmen')] }
    ]
  },
  {
    id: 'b2-airport',
    level: 'b2',
    scene: 'airport',
    cast: ['tom', 'oma', 'sabine'],
    languages: ['de'],
    title: german('Am Flughafen'),
    beats: [
      { kind: 'narration', sfx: 'airplane', text: german('Frankfurter Flughafen, Terminal 1. Tom holt seine Oma ab, die aus Lissabon zurückkommt. Draußen auf dem Vorfeld starten und landen ununterbrochen Flugzeuge.') },
      { kind: 'line', speaker: 'oma', mood: 'happy', text: german('Tom, mein Junge! Da bist du ja. Der Flug war herrlich, nur das Essen war eine Katastrophe.') },
      { kind: 'line', speaker: 'tom', mood: 'curious', text: german('Schön, dass du wieder da bist! Hast du dein ganzes Gepäck?') },
      { kind: 'line', speaker: 'oma', mood: 'sad', noisy: true, sfx: 'airplane', text: german('Leider nicht. Mein grüner Koffer ist nicht angekommen. Am Schalter hieß es, er sei vermutlich noch in Lissabon.') },
      { kind: 'line', speaker: 'tom', mood: 'curious', text: german('Wie bitte? Bei dem Lärm verstehe ich kein Wort! Was ist mit deinem Koffer?') },
      { kind: 'line', speaker: 'oma', text: german('Mein grüner Koffer ist noch in Lissabon! Ich habe schon eine Verlustmeldung ausgefüllt.') },
      { kind: 'question', prompt: german('Was ist mit Omas Koffer passiert?'), options: [german('Er ist vermutlich noch in Lissabon.'), german('Er wurde gestohlen.'), german('Er ist ins Meer gefallen.')] },
      { kind: 'narration', enters: ['sabine'], text: german('Eine Bundespolizistin kommt auf die beiden zu. Es ist Sabine, die heute am Flughafen Dienst hat.') },
      { kind: 'line', speaker: 'sabine', noisy: true, sfx: 'airplane', text: german('Entschuldigung, gehört Ihnen der Rollkoffer dort drüben neben der Säule? Unbeaufsichtigtes Gepäck müssen wir aus Sicherheitsgründen sofort entfernen.') },
      { kind: 'line', speaker: 'tom', mood: 'curious', text: german('Verzeihung, könnten Sie das bitte wiederholen? Das Flugzeug war so laut.') },
      { kind: 'line', speaker: 'sabine', text: german('Natürlich. Gehört Ihnen der Koffer neben der Säule? Unbeaufsichtigtes Gepäck dürfen wir nicht stehen lassen.') },
      { kind: 'reply', to: 'sabine', options: [
        german('Nein, der gehört uns nicht – Omas Koffer ist ja noch in Lissabon.'),
        german('Ja, aber er darf gern allein spazieren gehen.'),
        german('Wir sind leider auch Gepäck.')
      ] },
      { kind: 'line', speaker: 'sabine', mood: 'happy', text: german('Alles klar, dann kümmern wir uns darum. Ihr Koffer kommt bestimmt mit dem nächsten Flug. Gute Heimfahrt!') },
      { kind: 'line', speaker: 'oma', mood: 'happy', text: german('Na, dann trinken wir jetzt erst einmal einen Kaffee. Den habe ich mir verdient.') },
      { kind: 'question', prompt: german('Warum versteht Tom seine Oma zuerst nicht?'), options: [german('Weil gerade ein Flugzeug startet und es sehr laut ist'), german('Weil Oma Portugiesisch spricht'), german('Weil Tom Kopfhörer trägt')] },
      { kind: 'question', prompt: german('Was hat Oma wegen des Koffers schon gemacht?'), options: [german('Eine Verlustmeldung ausgefüllt'), german('Einen neuen Koffer gekauft'), german('Die Polizei angerufen')] },
      { kind: 'question', prompt: german('Warum spricht Sabine die beiden an?'), options: [german('Wegen eines unbeaufsichtigten Koffers'), german('Weil Tom falsch geparkt hat'), german('Weil Oma ihren Pass verloren hat')] },
      { kind: 'question', prompt: german('Wie fand Oma das Essen im Flugzeug?'), options: [german('Katastrophal'), german('Herrlich'), german('Zu scharf')] }
    ]
  },
  {
    id: 'c1-workshop',
    level: 'c1',
    scene: 'workshop',
    cast: ['albert', 'jana', 'kim'],
    languages: ['de'],
    title: german('Der Prototyp'),
    beats: [
      { kind: 'narration', text: german('In einem Ingenieurbüro in Stuttgart soll morgen ein neuer Lieferroboter vorgeführt werden. Doch beim letzten Test bleibt der Prototyp nach drei Metern einfach stehen.') },
      { kind: 'line', speaker: 'albert', mood: 'angry', text: german('Das ist inakzeptabel. Die Mechanik habe ich dreimal überprüft – jede Schraube sitzt exakt nach Zeichnung.') },
      { kind: 'line', speaker: 'jana', text: german('Die Mechanik ist auch nicht das Problem. Laut Protokoll verliert die Steuerung die Verbindung zum Sensor, sobald der Motor mehr Strom zieht.') },
      { kind: 'line', speaker: 'kim', mood: 'curious', text: german('Sie meinen also, es handelt sich um eine Störung in der Stromversorgung und nicht um einen Softwarefehler?') },
      { kind: 'line', speaker: 'jana', text: german('Vermutlich um beides: Die Spannung bricht kurz ein, und die Software ist nicht darauf ausgelegt, die Verbindung danach wiederherzustellen.') },
      { kind: 'question', prompt: german('Was passiert beim letzten Test?'), options: [german('Der Roboter bleibt nach drei Metern stehen.'), german('Der Roboter fährt gegen eine Wand.'), german('Der Roboter fängt Feuer.')] },
      { kind: 'line', speaker: 'albert', mood: 'curious', text: german('{name}, Sie haben die Messdaten gesehen. Wie würden Sie bis morgen vorgehen?') },
      { kind: 'reply', to: 'albert', options: [
        german('Kurzfristig würde ich die Software so anpassen, dass sie die Verbindung automatisch wiederherstellt, und langfristig die Stromversorgung stabilisieren.'),
        german('Ich würde die Vorführung absagen und den Roboter verkaufen.'),
        german('Ich würde alle Schrauben noch ein viertes Mal überprüfen.')
      ] },
      { kind: 'line', speaker: 'kim', mood: 'happy', text: german('Ein pragmatischer Ansatz. Für die Präsentation reicht die Softwarelösung, und für die Serienfertigung planen wir ein neues Netzteil ein.') },
      { kind: 'line', speaker: 'albert', text: german('Na schön. Aber ich bestehe darauf, dass jede Änderung lückenlos dokumentiert wird. Ordnung muss sein.') },
      { kind: 'narration', text: german('Um Mitternacht fährt der Roboter zum ersten Mal fehlerfrei durch die ganze Halle. Albert notiert die Uhrzeit – auf die Sekunde genau.') },
      { kind: 'question', prompt: german('Wo liegt laut Jana die Ursache des Problems?'), options: [german('In einem Spannungseinbruch, den die Software nicht abfängt'), german('In einer locker sitzenden Schraube'), german('In einem falsch berechneten Getriebe')] },
      { kind: 'question', prompt: german('Welche Lösung wird für die Präsentation gewählt?'), options: [german('Eine Anpassung der Software'), german('Ein komplett neuer Roboter'), german('Ein stärkerer Motor')] },
      { kind: 'question', prompt: german('Was plant Kim für die Serienfertigung?'), options: [german('Ein neues Netzteil'), german('Einen neuen Sensor'), german('Eine andere Fabrik')] },
      { kind: 'question', prompt: german('Worauf besteht Albert?'), options: [german('Dass jede Änderung dokumentiert wird'), german('Dass die Präsentation verschoben wird'), german('Dass Jana die Mechanik prüft')] }
    ]
  },
  {
    id: 'a1-lilith-birthday',
    level: 'a1',
    scene: 'home',
    cast: ['mia', 'tom', 'lilith'],
    languages: ['de'],
    title: german('Liliths Geburtstag'),
    // The blanket stays blue, so "Blau" is always there to catch a careless reader.
    details: [[
      choice({ ball: 'einen roten Ball', colour: 'Rot' }),
      choice({ ball: 'einen gelben Ball', colour: 'Gelb' }),
      choice({ ball: 'einen grünen Ball', colour: 'Grün' }),
      choice({ ball: 'einen orangen Ball', colour: 'Orange' })
    ]],
    beats: [
      { kind: 'narration', text: german('Heute ist der 12. Mai. Lilith hat Geburtstag. Sie ist jetzt drei Jahre alt.') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Alles Gute zum Geburtstag, Lilith! Du bist jetzt drei!') },
      { kind: 'line', speaker: 'lilith', sfx: 'meow', mood: 'happy', text: german('Miau!') },
      { kind: 'line', speaker: 'tom', holds: { tom: 'cake' }, text: german('Ich habe einen Kuchen für Lilith. Er ist aus Fisch! Und er hat drei Kerzen.') },
      { kind: 'line', speaker: 'mia', mood: 'laughing', text: german('Ein Fischkuchen? Haha! Toll, Tom!') },
      { kind: 'line', speaker: 'tom', text: german('Hallo {name}! Wie viele Kerzen hat der Kuchen?') },
      { kind: 'reply', to: 'tom', options: [
        german('Drei Kerzen.'),
        german('Zehn Katzen.'),
        german('Es ist Montag.')
      ] },
      { kind: 'narration', holds: { tom: null, lilith: 'cake' }, sfx: 'purr', text: german('Tom stellt den Kuchen auf den Boden. Lilith frisst und schnurrt.') },
      { kind: 'line', speaker: 'mia', text: german('Wir haben auch ein Geschenk: {ball} und eine blaue Decke.') },
      { kind: 'line', speaker: 'tom', mood: 'laughing', text: german('Aber Lilith spielt mit dem Papier. Haha, typisch Katze!') },
      { kind: 'narration', holds: { lilith: null }, text: german('Um acht Uhr am Abend schläft Lilith auf der blauen Decke. Sie ist müde und glücklich.') },
      { kind: 'question', prompt: german('Wie alt ist Lilith jetzt?'), options: [german('Drei Jahre'), german('Zwei Jahre'), german('Zehn Jahre')] },
      { kind: 'question', prompt: german('Wann hat Lilith Geburtstag?'), options: [german('Am 12. Mai'), german('Am 3. Juni'), german('Am 24. Dezember')] },
      { kind: 'question', prompt: german('Woraus ist der Kuchen?'), options: [german('Aus Fisch'), german('Aus Schokolade'), german('Aus Äpfeln')] },
      { kind: 'question', prompt: german('Welche Farbe hat der Ball?'), options: [german('{colour}'), german('Blau'), german('{colour#1}')] },
      { kind: 'question', prompt: german('Womit spielt Lilith?'), options: [german('Mit dem Papier'), german('Mit dem Ball'), german('Mit der Decke')] },
      { kind: 'question', prompt: german('Wann schläft Lilith?'), options: [german('Um acht Uhr am Abend'), german('Um acht Uhr am Morgen'), german('Um drei Uhr am Mittag')] }
    ]
  },
  {
    id: 'a2-christmas',
    level: 'a2',
    scene: 'home',
    cast: ['oma', 'mia', 'tom', 'leo', 'lilith'],
    languages: ['de'],
    weathers: ['snowy'],
    title: german('Heiligabend bei Oma'),
    details: [[
      choice({ baubles: 'roten', colour: 'Rot' }),
      choice({ baubles: 'blauen', colour: 'Blau' }),
      choice({ baubles: 'silbernen', colour: 'Silber' })
    ]],
    beats: [
      { kind: 'narration', text: german('Es ist der 24. Dezember, Heiligabend. Um vier Uhr nachmittags kommen Mia und Tom zu Oma. Im Wohnzimmer steht ein großer grüner Tannenbaum.') },
      { kind: 'line', speaker: 'oma', mood: 'happy', text: german('Frohe Weihnachten, ihr zwei! Kommt rein, draußen ist es so kalt. Es sind minus fünf Grad!') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Frohe Weihnachten, Oma! Der Baum ist wunderschön. Die {baubles} Kugeln, die goldenen Sterne und oben der weiße Engel!') },
      { kind: 'line', speaker: 'oma', text: german('Den Baum habe ich gestern geschmückt. Drei Stunden hat das gedauert! Aber wo ist denn Leo?') },
      { kind: 'line', speaker: 'tom', text: german('Er hat geschrieben: Sein Zug hat zwanzig Minuten Verspätung. Er kommt um halb fünf.') },
      { kind: 'narration', sfx: 'doorbell', enters: ['leo'], text: german('Um fünf nach halb fünf klingelt es an der Tür. Leo steht draußen, mit Schnee auf der Mütze und vier Geschenken im Arm.') },
      { kind: 'line', speaker: 'leo', mood: 'happy', text: german('Frohe Weihnachten! Entschuldigung, die Bahn … Aber ich habe Geschenke für alle!') },
      { kind: 'line', speaker: 'oma', text: german('Zuerst essen wir. Es gibt Kartoffelsalat mit Würstchen, wie jedes Jahr. Und danach singen wir zwei Lieder. {name}, du isst doch mit uns, oder?') },
      { kind: 'reply', to: 'oma', options: [
        german('Ja, sehr gern! Kartoffelsalat mag ich sehr.'),
        german('Nein, ich esse nur im Sommer.'),
        german('Ja, ich bin ein Tannenbaum.')
      ] },
      { kind: 'narration', text: german('Nach dem Essen packen alle die Geschenke aus. Oma bekommt einen lila Schal, Mia ein Buch und Tom eine gelbe Tasse.') },
      { kind: 'line', speaker: 'lilith', sfx: 'meow', mood: 'happy', text: german('Miau!') },
      { kind: 'line', speaker: 'leo', mood: 'laughing', text: german('Und das vierte Geschenk ist für Lilith: eine Maus aus Stoff. Haha, sie liebt das Geschenkpapier mehr!') },
      { kind: 'line', speaker: 'oma', mood: 'happy', text: german('Das ist der schönste Abend im Jahr. Danke, dass ihr alle da seid.') },
      { kind: 'question', prompt: german('An welchem Tag ist Heiligabend?'), options: [german('Am 24. Dezember'), german('Am 31. Dezember'), german('Am 1. Januar')] },
      { kind: 'question', prompt: german('Welche Farbe haben die Kugeln am Baum?'), options: [german('{colour}'), german('{colour#1}'), german('{colour#2}')] },
      { kind: 'question', prompt: german('Wie lange hat Oma den Baum geschmückt?'), options: [german('Drei Stunden'), german('Eine Stunde'), german('Zwei Tage')] },
      { kind: 'question', prompt: german('Wie kalt ist es draußen?'), options: [german('Minus fünf Grad'), german('Null Grad'), german('Plus fünf Grad')] },
      { kind: 'question', prompt: german('Um wie viel Uhr kommt Leo wirklich an?'), options: [german('Um fünf nach halb fünf'), german('Um vier Uhr'), german('Um sechs Uhr')] },
      { kind: 'question', prompt: german('Was essen sie an Heiligabend?'), options: [german('Kartoffelsalat mit Würstchen'), german('Pizza mit Salami'), german('Fisch mit Reis')] },
      { kind: 'question', prompt: german('Was bekommt Oma?'), options: [german('Einen lila Schal'), german('Eine gelbe Tasse'), german('Ein Buch')] }
    ]
  },
  {
    id: 'a2-new-year',
    level: 'a2',
    scene: 'flat',
    cast: ['mia', 'tom', 'kumar'],
    languages: ['de'],
    weathers: ['snowy', 'cloudy'],
    title: german('Gute Vorsätze an Silvester'),
    beats: [
      { kind: 'narration', text: german('Es ist der 31. Dezember, Silvester. Es ist schon Viertel vor zwölf. Mia, Tom und ihr Mitbewohner Kumar sitzen in der Küche und trinken Tee.') },
      { kind: 'line', speaker: 'mia', text: german('Noch fünfzehn Minuten bis zum neuen Jahr! Was sind eure guten Vorsätze?') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Ich habe drei Vorsätze! Erstens: Ich lerne jeden Tag zwanzig Minuten Deutsch. Zweitens: Ich spüle jeden Abend mein Geschirr.') },
      { kind: 'line', speaker: 'tom', mood: 'laughing', text: german('Jeden Abend? Haha! Im Moment stehen sieben Teller und vier Töpfe in der Spüle.') },
      { kind: 'line', speaker: 'kumar', mood: 'sad', text: german('Ja, leider … Und drittens: Ich suche meine grünen Socken. Seit Oktober habe ich nur noch eine!') },
      { kind: 'line', speaker: 'mia', text: german('Mein Vorsatz: Im Juni will ich zehn Kilometer laufen. Ich trainiere dreimal pro Woche, immer um sieben Uhr morgens.') },
      { kind: 'line', speaker: 'tom', text: german('Ich will weniger am Handy sein. Höchstens eine Stunde am Tag. Und ich will im Sommer nach Portugal reisen.') },
      { kind: 'line', speaker: 'mia', mood: 'curious', text: german('Und du, {name}? Was ist dein Vorsatz für das neue Jahr?') },
      { kind: 'reply', to: 'mia', options: [
        german('Ich möchte jeden Tag ein bisschen Deutsch lernen.'),
        german('Ich möchte gestern schwimmen.'),
        german('Mein Vorsatz ist grün und hat vier Beine.')
      ] },
      { kind: 'narration', text: german('Es ist eine Minute vor zwölf. Alle stehen am Fenster und zählen laut.') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Zehn, neun, acht, sieben, sechs, fünf, vier, drei, zwei, eins … Frohes neues Jahr!') },
      { kind: 'narration', text: german('Draußen ist der Himmel plötzlich bunt: rotes, gelbes, grünes und blaues Feuerwerk. Kumar zeigt auf etwas Grünes auf dem Schrank.') },
      { kind: 'line', speaker: 'kumar', mood: 'surprised', text: german('Wow! Meine grüne Socke! Ein Vorsatz ist schon fertig!') },
      { kind: 'question', prompt: german('Wie spät ist es am Anfang der Geschichte?'), options: [german('Viertel vor zwölf'), german('Halb zwölf'), german('Zwölf Uhr')] },
      { kind: 'question', prompt: german('Wie lange will Kumar jeden Tag Deutsch lernen?'), options: [german('Zwanzig Minuten'), german('Zwei Stunden'), german('Fünf Minuten')] },
      { kind: 'question', prompt: german('Wie viele Teller stehen in der Spüle?'), options: [german('Sieben'), german('Vier'), german('Drei')] },
      { kind: 'question', prompt: german('Wie oft will Mia trainieren?'), options: [german('Dreimal pro Woche'), german('Jeden Tag'), german('Einmal im Monat')] },
      { kind: 'question', prompt: german('Wohin will Tom im Sommer reisen?'), options: [german('Nach Portugal'), german('Nach Indien'), german('Nach Italien')] },
      { kind: 'question', prompt: german('Welche Farbe hat Kumars Socke?'), options: [german('Grün'), german('Rot'), german('Gelb')] }
    ]
  },
  {
    id: 'b1-fitness',
    level: 'b1',
    scene: 'park',
    cast: ['leo', 'tobias', 'mia'],
    languages: ['de'],
    weathers: ['sunny', 'cloudy'],
    title: german('Ziele und Fitness'),
    beats: [
      { kind: 'narration', text: german('Anfang Januar, Samstagmorgen, halb neun. Leo hat sich vorgenommen, in diesem Jahr endlich fit zu werden. Mia hat ihm ihren Bekannten Tobias empfohlen – Rettungsschwimmer und Fitnessfan.') },
      { kind: 'line', speaker: 'tobias', mood: 'happy', text: german('Moin, Leo! Bereit für die erste Einheit? Zuerst will ich wissen: Was genau ist dein Ziel?') },
      { kind: 'line', speaker: 'leo', text: german('Na ja … fitter werden. Und vielleicht ein bisschen abnehmen.') },
      { kind: 'line', speaker: 'tobias', text: german('„Fitter werden“ ist kein Ziel, sondern ein Wunsch. Ein gutes Ziel ist konkret, messbar und hat einen Termin. Zum Beispiel: Bis Ende Mai läufst du fünf Kilometer ohne Pause.') },
      { kind: 'line', speaker: 'mia', mood: 'curious', text: german('Und warum ist das so wichtig? Hauptsache, man bewegt sich, oder?') },
      { kind: 'line', speaker: 'tobias', text: german('Weil man sonst nach drei Wochen aufgibt. Wenn du siehst, dass du von einem auf zwei und dann auf drei Kilometer kommst, bleibst du motiviert. Fortschritt, den man messen kann, macht süchtig!') },
      { kind: 'line', speaker: 'leo', mood: 'worried', text: german('Und wie oft muss ich trainieren? Ich arbeite ja auch noch vierzig Stunden pro Woche.') },
      { kind: 'line', speaker: 'tobias', text: german('Die Weltgesundheitsorganisation empfiehlt mindestens 150 Minuten Bewegung pro Woche. Das sind fünfmal dreißig Minuten. Dazu zweimal Krafttraining, genug Eiweiß und sieben bis acht Stunden Schlaf. Muskeln wachsen nämlich beim Ausruhen!') },
      { kind: 'line', speaker: 'tobias', mood: 'curious', text: german('{name}, du machst doch auch mit. Was ist dein Ziel?') },
      { kind: 'reply', to: 'tobias', options: [
        german('Ich möchte bis zum Sommer dreimal pro Woche joggen gehen und zehn Liegestütze am Stück schaffen.'),
        german('Ich möchte irgendwann vielleicht mal etwas machen.'),
        german('Mein Ziel ist es, möglichst viel auf dem Sofa zu liegen.')
      ] },
      { kind: 'line', speaker: 'tobias', mood: 'happy', text: german('Stark! Konkret, messbar, mit Termin. So geht das! Und jetzt: zehn Minuten locker aufwärmen, dann zwei Runden um den Teich.') },
      { kind: 'narration', text: german('Nach zwanzig Minuten ist Leos Gesicht knallrot. Er setzt sich schwer atmend auf eine grüne Parkbank.') },
      { kind: 'line', speaker: 'leo', mood: 'sad', text: german('Zwei Runden … ich glaube, ich sterbe.') },
      { kind: 'line', speaker: 'tobias', mood: 'laughing', text: german('Haha, das sagen alle am ersten Tag! Schreib dir die Zeit auf. In vier Wochen lachst du darüber.') },
      { kind: 'question', prompt: german('Warum ist „fitter werden“ laut Tobias kein gutes Ziel?'), options: [german('Weil es nicht konkret und nicht messbar ist'), german('Weil es zu schwer ist'), german('Weil Leo schon fit ist')] },
      { kind: 'question', prompt: german('Was soll Leo bis Ende Mai schaffen?'), options: [german('Fünf Kilometer ohne Pause laufen'), german('Zehn Kilo abnehmen'), german('Einen Marathon laufen')] },
      { kind: 'question', prompt: german('Wie viele Minuten Bewegung pro Woche empfiehlt die Weltgesundheitsorganisation mindestens?'), options: [german('150 Minuten'), german('30 Minuten'), german('500 Minuten')] },
      { kind: 'question', prompt: german('Wann wachsen Muskeln laut Tobias?'), options: [german('Beim Ausruhen'), german('Beim Essen'), german('Beim Laufen')] },
      { kind: 'question', prompt: german('Warum geben viele Leute laut Tobias nach drei Wochen auf?'), options: [german('Weil sie ihren Fortschritt nicht sehen können'), german('Weil das Wetter schlecht ist'), german('Weil Training zu teuer ist')] },
      { kind: 'question', prompt: german('Welche Farbe hat Leos Gesicht nach zwanzig Minuten?'), options: [german('Knallrot'), german('Ganz blass'), german('Grün')] }
    ]
  },
  {
    id: 'b1-grandpa',
    level: 'b1',
    scene: 'home',
    cast: ['oma', 'mia', 'selma'],
    languages: ['de'],
    weathers: ['rainy', 'cloudy'],
    title: german('Abschied von Opa'),
    details: [
      [
        choice({ bike: 'blauen', colour: 'Blau' }),
        choice({ bike: 'roten', colour: 'Rot' }),
        choice({ bike: 'schwarzen', colour: 'Schwarz' }),
        choice({ bike: 'grünen', colour: 'Grün' })
      ],
      [
        choice({ funeral: 'am Freitag um elf Uhr' }),
        choice({ funeral: 'am Montag um zehn Uhr' }),
        choice({ funeral: 'am Donnerstag um vierzehn Uhr' })
      ]
    ],
    beats: [
      { kind: 'narration', text: german('Opa ist seit Wochen schwer krank. Er wollte nicht im Krankenhaus bleiben, sondern zu Hause sein, in seinem eigenen Bett. Jeden Tag kommt die Pflegerin Selma vorbei.') },
      { kind: 'line', speaker: 'selma', mood: 'sad', text: german('Frau Wagner, ich muss ehrlich mit Ihnen sein. Sein Atem ist heute viel schwächer. Ich glaube, er hat nicht mehr viel Zeit.') },
      { kind: 'line', speaker: 'oma', mood: 'sad', text: german('Ich habe es geahnt. Heute Morgen hat er nur noch geflüstert. Mia, ruf bitte deine Mutter an. Sie soll kommen.') },
      { kind: 'line', speaker: 'mia', mood: 'worried', text: german('Hat er Schmerzen, Selma?') },
      { kind: 'line', speaker: 'selma', text: german('Nein, die Medikamente wirken gut. Er ist ruhig. Das Wichtigste ist jetzt, dass ihr bei ihm seid. Haltet seine Hand und redet mit ihm – das Gehör bleibt oft bis zum Schluss.') },
      { kind: 'narration', text: german('Am Abend sitzt die ganze Familie an Opas Bett. Oma erzählt, wie sie sich vor zweiundfünfzig Jahren bei einem Tanzabend kennengelernt haben. Kurz nach Mitternacht schläft Opa friedlich ein.') },
      { kind: 'narration', text: german('Drei Tage später. Draußen regnet es. Oma und Mia sitzen am Küchentisch und schauen alte Fotos an.') },
      { kind: 'line', speaker: 'oma', mood: 'sad', text: german('Schau, hier ist er mit dreißig, mit seinem {bike} Motorrad. Er war so stolz darauf. Ich vermisse ihn so sehr.') },
      { kind: 'line', speaker: 'mia', mood: 'sad', text: german('Ich auch, Oma. Er hat mir das Fahrradfahren beigebracht und mir immer Geschichten erzählt.') },
      { kind: 'line', speaker: 'oma', text: german('{name}, du kanntest ihn ja auch. Was ist deine schönste Erinnerung an ihn?') },
      { kind: 'reply', to: 'oma', options: [
        german('Ich erinnere mich gern daran, wie er immer gelacht hat, wenn er Geschichten erzählt hat.'),
        german('Ich erinnere mich an morgen.'),
        german('Er war ein sehr schnelles Fahrrad.')
      ] },
      { kind: 'line', speaker: 'oma', mood: 'happy', text: german('Ja, sein Lachen. Das war das Schönste an ihm. Danke, dass du da bist.') },
      { kind: 'line', speaker: 'mia', text: german('Die Beerdigung ist {funeral}. Wir wollen sein Lieblingslied spielen und statt Blumen um Spenden für den Pflegedienst bitten.') },
      { kind: 'line', speaker: 'oma', text: german('Das hätte ihm gefallen. Er hat immer gesagt: Trauert nicht zu lange, feiert lieber das Leben.') },
      { kind: 'question', prompt: german('Warum ist Opa nicht im Krankenhaus?'), options: [german('Weil er zu Hause in seinem eigenen Bett sein wollte'), german('Weil das Krankenhaus voll war'), german('Weil er wieder gesund war')] },
      { kind: 'question', prompt: german('Was ist laut Selma jetzt das Wichtigste?'), options: [german('Dass die Familie bei ihm ist'), german('Dass er mehr isst'), german('Dass ein Arzt kommt')] },
      { kind: 'question', prompt: german('Wie lange kannten sich Oma und Opa?'), options: [german('Zweiundfünfzig Jahre'), german('Dreißig Jahre'), german('Zwölf Jahre')] },
      { kind: 'question', prompt: german('Welche Farbe hatte Opas Motorrad?'), options: [german('{colour}'), german('{colour#1}'), german('{colour#2}')] },
      { kind: 'question', prompt: german('Wann ist die Beerdigung?'), options: [german('{funeral}'), german('{funeral#1}'), german('{funeral#2}')] },
      { kind: 'question', prompt: german('Worum bittet die Familie statt Blumen?'), options: [german('Um Spenden für den Pflegedienst'), german('Um Briefe'), german('Um Kerzen')] }
    ]
  },
  {
    id: 'b1-beer',
    level: 'b1',
    scene: 'beergarden',
    cast: ['hans', 'albert', 'leo'],
    languages: ['de'],
    weathers: ['sunny', 'cloudy'],
    title: german('Welches Bier ist das beste?'),
    beats: [
      { kind: 'narration', text: german('Ein Sommerabend im Biergarten. Leo sitzt mit Hans aus Bayern und Albert aus Berlin am Tisch. Schon nach fünf Minuten streiten die beiden über Bier.') },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('A Helles, des is des einzig Wahre! Mild, a bissl malzig, goldgelb. Do kannst a ganze Maß trinken, ohne dass dir fad wird.') },
      { kind: 'line', speaker: 'albert', text: german('Ein ganzer Liter? Unzivilisiert. Ein ordentliches Pils ist herber, weil mehr Hopfen drin ist. Das erfrischt und regt den Appetit an.') },
      { kind: 'line', speaker: 'leo', mood: 'curious', text: german('Und was ist mit Weißbier? Das trinkt man doch auch in Bayern, oder?') },
      { kind: 'line', speaker: 'hans', text: german('Freilich! Weißbier wird mit Weizenmalz gebraut. Durch die besondere Hefe schmeckt’s a bissl nach Banane und Nelke. Am besten zur Weißwurst, und zwar vor zwölf Uhr mittags.') },
      { kind: 'line', speaker: 'albert', text: german('In Berlin haben wir die Berliner Weiße: leicht, sauer und wenig Alkohol. Man trinkt sie mit Schuss – rot mit Himbeersirup oder grün mit Waldmeister.') },
      { kind: 'line', speaker: 'hans', mood: 'laughing', text: german('A grünes Bier mit Strohhalm! Haha, des is ka Bier, des is a Limo!') },
      { kind: 'line', speaker: 'leo', text: german('In Köln trinkt man Kölsch aus kleinen Gläsern mit nur 0,2 Litern, und in Düsseldorf dunkles Altbier. Die beiden Städte streiten darüber genauso wie ihr.') },
      { kind: 'line', speaker: 'albert', text: german('Immerhin halten sich alle an das Reinheitsgebot von 1516: nur Wasser, Malz und Hopfen – die Hefe kam erst später dazu. Deutschland hat übrigens rund 1 500 Brauereien.') },
      { kind: 'line', speaker: 'leo', mood: 'curious', text: german('{name}, du bist unser Schiedsrichter. Welches Bier würdest du an einem heißen Tag wählen und warum?') },
      { kind: 'reply', to: 'leo', options: [
        german('Ich würde ein Pils nehmen, weil es herb und erfrischend ist – oder ein alkoholfreies Weißbier.'),
        german('Ich würde ein Bier aus Wasser, Zucker und Ketchup brauen.'),
        german('Ich trinke Bier nur aus Schuhen.')
      ] },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('Passt scho. Hauptsach, mir trinken zamm. Prost!') },
      { kind: 'question', prompt: german('Warum schmeckt Pils laut Albert herber?'), options: [german('Weil mehr Hopfen drin ist'), german('Weil es länger gelagert wird'), german('Weil es aus Weizen gebraut wird')] },
      { kind: 'question', prompt: german('Wonach schmeckt Weißbier ein bisschen?'), options: [german('Nach Banane und Nelke'), german('Nach Himbeere und Waldmeister'), german('Nach Kaffee und Schokolade')] },
      { kind: 'question', prompt: german('Welche Farbe hat die Berliner Weiße mit Waldmeister?'), options: [german('Grün'), german('Rot'), german('Goldgelb')] },
      { kind: 'question', prompt: german('Wie viel passt in ein Kölschglas?'), options: [german('0,2 Liter'), german('Ein Liter'), german('0,5 Liter')] },
      { kind: 'question', prompt: german('Aus welchem Jahr ist das Reinheitsgebot?'), options: [german('1516'), german('1871'), german('1989')] },
      { kind: 'question', prompt: german('Wie viele Brauereien gibt es ungefähr in Deutschland?'), options: [german('Rund 1 500'), german('Rund 150'), german('Rund 15 000')] }
    ]
  },
  {
    id: 'b1-pets',
    level: 'b1',
    scene: 'park',
    cast: ['kumar', 'fritz', 'bello'],
    languages: ['de'],
    weathers: ['sunny', 'cloudy'],
    title: german('Welches Haustier passt zu mir?'),
    beats: [
      { kind: 'narration', text: german('Kumar möchte ein eigenes Haustier, denn Lilith gehört ja Mia und Tom. Im Park trifft er Bauer Fritz, der mit dem Hund Bello spazieren geht.') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Herr Fritz, Sie kennen sich doch mit Tieren aus! Ich will einen Hund. So einen wie Bello!') },
      { kind: 'line', speaker: 'bello', sfx: 'bark', mood: 'happy', text: german('Wuff!') },
      { kind: 'line', speaker: 'fritz', text: german('Langsam, junger Mann. Ein Hund ist wunderbar, aber er braucht viel Zeit. Zwei- bis dreimal am Tag Gassi gehen, bei jedem Wetter, auch um sechs Uhr morgens im Januar.') },
      { kind: 'line', speaker: 'kumar', mood: 'worried', text: german('Um sechs Uhr? Oh nein, da schlafe ich noch. Und ich arbeite oft zehn Stunden am Tag.') },
      { kind: 'line', speaker: 'fritz', text: german('Siehst du. Dann wäre eine Katze vielleicht besser. Katzen sind unabhängiger und können ein paar Stunden allein bleiben. Nicht ohne Grund sind sie das beliebteste Haustier in Deutschland: Es gibt rund fünfzehn Millionen Katzen und etwa zehn Millionen Hunde.') },
      { kind: 'line', speaker: 'kumar', mood: 'curious', text: german('Und Kaninchen? Die sind klein und süß.') },
      { kind: 'line', speaker: 'fritz', text: german('Viele denken, Kaninchen sind einfach. Aber sie brauchen viel Platz und mindestens einen Partner, denn allein werden sie krank vor Einsamkeit. Ein Kaninchen allein im kleinen Käfig ist Tierquälerei.') },
      { kind: 'line', speaker: 'kumar', text: german('Und Fische? Die machen keinen Lärm und keinen Dreck.') },
      { kind: 'line', speaker: 'fritz', mood: 'laughing', text: german('Haha, keinen Dreck! Ein Aquarium muss jede Woche geputzt werden. Und bei dir zu Hause stapelt sich ja schon das Geschirr, hab ich gehört.') },
      { kind: 'line', speaker: 'fritz', mood: 'curious', text: german('{name}, was meinst du: Welches Tier passt zu jemandem, der viel arbeitet und in einer kleinen Wohnung lebt?') },
      { kind: 'reply', to: 'fritz', options: [
        german('Vielleicht zwei Katzen, weil sie gut allein bleiben können und sich gegenseitig Gesellschaft leisten.'),
        german('Ein Pferd, weil es gut in die Badewanne passt.'),
        german('Gar keins, weil Tiere im Winter nicht schlafen.')
      ] },
      { kind: 'line', speaker: 'fritz', text: german('Genau. Und frag vorher deinen Vermieter und denk an die Kosten: Futter, Tierarzt, Versicherung. Ein Tier ist kein Spielzeug, sondern ein Familienmitglied – oft für fünfzehn Jahre.') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Zwei Katzen! Aber zuerst spüle ich mein Geschirr. Versprochen.') },
      { kind: 'question', prompt: german('Warum passt ein Hund nicht gut zu Kumar?'), options: [german('Weil er viel arbeitet und morgens lange schläft'), german('Weil er Angst vor Hunden hat'), german('Weil Hunde in seiner Stadt verboten sind')] },
      { kind: 'question', prompt: german('Welches Haustier ist in Deutschland am beliebtesten?'), options: [german('Die Katze'), german('Der Hund'), german('Das Kaninchen')] },
      { kind: 'question', prompt: german('Wie viele Hunde gibt es ungefähr in Deutschland?'), options: [german('Etwa zehn Millionen'), german('Etwa eine Million'), german('Etwa fünfzig Millionen')] },
      { kind: 'question', prompt: german('Was brauchen Kaninchen unbedingt?'), options: [german('Viel Platz und mindestens einen Partner'), german('Einen warmen Käfig für sich allein'), german('Jeden Tag einen langen Spaziergang')] },
      { kind: 'question', prompt: german('Was muss man bei einem Aquarium jede Woche machen?'), options: [german('Es putzen'), german('Die Fische baden'), german('Das Wasser wärmen')] },
      { kind: 'question', prompt: german('Wen soll Kumar vorher fragen?'), options: [german('Seinen Vermieter'), german('Seine Eltern'), german('Seinen Chef')] }
    ]
  },
  {
    id: 'b1-music',
    level: 'b1',
    scene: 'home',
    cast: ['jana', 'leo', 'oma'],
    languages: ['de'],
    title: german('Dubstep, Metal oder Schlager?'),
    beats: [
      { kind: 'narration', text: german('Sonntagnachmittag bei Oma. Leo und Jana sind zum Kaffee da. Oma will Musik auflegen, und schon beginnt eine Diskussion.') },
      { kind: 'line', speaker: 'oma', mood: 'happy', text: german('Ich mache uns ein bisschen Schlager an. Da kann man mitsingen, und die Texte versteht man sofort. Liebe, Sonne, Sommer – das macht gute Laune!') },
      { kind: 'line', speaker: 'leo', mood: 'laughing', text: german('Haha, Oma, Schlager ist doch immer dasselbe: vier Akkorde und ein Herz aus Gold. Ich höre lieber Metal. Schnelle Gitarren, Doublebass am Schlagzeug, ehrliche Wut.') },
      { kind: 'line', speaker: 'oma', mood: 'surprised', text: german('Ach, Junge, das ist doch nur Lärm! Da schreit einer, als hätte er Zahnschmerzen.') },
      { kind: 'line', speaker: 'leo', text: german('Das klingt nur aggressiv. Eine Studie aus Australien hat gezeigt, dass Metal-Fans nach dem Hören ruhiger und entspannter sind. Die Musik hilft, Stress und Ärger zu verarbeiten. Und Metal-Fans sind sehr friedlich – in Wacken feiern jedes Jahr ungefähr 85 000 Leute zusammen.') },
      { kind: 'line', speaker: 'jana', text: german('Ihr seid beide altmodisch. Dubstep ist die Zukunft! 140 Schläge pro Minute, und dann kommt der Drop – dieser tiefe, wackelnde Bass. Den spürt man im ganzen Körper.') },
      { kind: 'line', speaker: 'oma', mood: 'curious', text: german('Ein Bass, der wackelt? Kind, und wo ist da die Melodie?') },
      { kind: 'line', speaker: 'jana', text: german('Die Melodie ist nicht das Wichtigste. Beim Dubstep geht es um den Klang selbst. Ich programmiere die Sounds übrigens am Computer – das ist ein bisschen wie Code schreiben.') },
      { kind: 'line', speaker: 'leo', mood: 'curious', text: german('{name}, sag du mal: Welche Musik ist die beste?') },
      { kind: 'reply', to: 'leo', options: [
        german('Ich finde, jede Musik hat ihre Berechtigung. Es kommt auf die Stimmung und den Moment an.'),
        german('Die beste Musik ist eine Waschmaschine im Schleudergang.'),
        german('Ich höre Musik nur mit den Füßen.')
      ] },
      { kind: 'line', speaker: 'oma', mood: 'happy', text: german('Sehr diplomatisch! Also gut: jeder ein Lied. Erst mein Schlager, dann Leos Metal und zum Schluss Janas Wackelbass.') },
      { kind: 'narration', text: german('Eine Stunde später tanzt Oma zu Janas Dubstep, Leo summt den Schlager mit, und Jana gibt zu, dass das Gitarrensolo gar nicht so schlecht war.') },
      { kind: 'question', prompt: german('Warum mag Oma Schlager?'), options: [german('Weil man mitsingen kann und die Texte sofort versteht'), german('Weil die Musik besonders laut ist'), german('Weil Schlager sehr kompliziert ist')] },
      { kind: 'question', prompt: german('Was hat eine Studie über Metal-Fans gezeigt?'), options: [german('Dass sie nach dem Hören ruhiger sind'), german('Dass sie öfter streiten'), german('Dass sie schlechter schlafen')] },
      { kind: 'question', prompt: german('Wie viele Leute feiern ungefähr jedes Jahr in Wacken?'), options: [german('Etwa 85 000'), german('Etwa 8 500'), german('Etwa 850 000')] },
      { kind: 'question', prompt: german('Wie schnell ist Dubstep laut Jana?'), options: [german('140 Schläge pro Minute'), german('40 Schläge pro Minute'), german('400 Schläge pro Minute')] },
      { kind: 'question', prompt: german('Womit vergleicht Jana das Produzieren von Dubstep?'), options: [german('Mit Code schreiben'), german('Mit Kochen'), german('Mit Autofahren')] },
      { kind: 'question', prompt: german('Wie endet der Nachmittag?'), options: [german('Oma tanzt zu Dubstep, und alle sind zufrieden.'), german('Alle gehen wütend nach Hause.'), german('Oma verbietet jede Musik.')] }
    ]
  },
  {
    id: 'b2-favourite-food',
    level: 'b2',
    scene: 'square',
    cast: ['ali', 'fritz', 'mia'],
    languages: ['de'],
    weathers: ['sunny', 'cloudy'],
    title: german('Das Lieblingsessen der Deutschen'),
    beats: [
      { kind: 'narration', text: german('Mittagspause auf dem Marktplatz. Mia schreibt für ihre Lokalzeitung einen Artikel über das Lieblingsessen der Deutschen und befragt zwei Experten: Ali vom Dönerladen an der Ecke und Bauer Fritz, der am Marktstand Kartoffeln verkauft.') },
      { kind: 'line', speaker: 'ali', mood: 'happy', text: german('Ganz klar: der Döner! Mein Freund, schau dir die Schlange vor meinem Laden an. Schätzungen zufolge gibt es in Deutschland über 16 000 Dönerläden – mehr als Filialen aller großen Burgerketten zusammen.') },
      { kind: 'line', speaker: 'fritz', text: german('Ach was. Das Lieblingsessen der Deutschen ist und bleibt der Schweinebraten mit Knödeln. Oder ein ordentliches Schnitzel. Das hat schon mein Großvater gegessen.') },
      { kind: 'line', speaker: 'mia', text: german('Interessanterweise sagen die Umfragen etwas anderes. Bei der Frage nach dem Lieblingsgericht landen seit Jahren Spaghetti Bolognese auf Platz eins, knapp vor Schnitzel und Rouladen. Und in Kantinen ist die Currywurst seit Jahrzehnten ganz vorne dabei.') },
      { kind: 'line', speaker: 'fritz', mood: 'surprised', text: german('Spaghetti? Ein italienisches Gericht? Meine Güte, wo soll das noch hinführen.') },
      { kind: 'line', speaker: 'ali', mood: 'laughing', text: german('Haha, Fritz, das ist doch das Schöne! Der Döner im Brot, wie man ihn hier kennt, wurde in den Siebzigerjahren in Berlin erfunden. Er ist so deutsch wie dein Braten.') },
      { kind: 'line', speaker: 'mia', mood: 'curious', text: german('Woran liegt es eurer Meinung nach, dass gerade solche Gerichte so beliebt sind?') },
      { kind: 'line', speaker: 'ali', text: german('Schnell, satt, bezahlbar. Die Leute haben eine halbe Stunde Pause und wollen etwas Warmes. Allerdings ist der Preis in den letzten Jahren von dreieinhalb auf fast acht Euro gestiegen: Fleisch, Energie, Miete – alles teurer.') },
      { kind: 'line', speaker: 'fritz', text: german('Und bei Nudeln mit Soße weiß jedes Kind, was es bekommt. Vertrautheit, verstehst du? Was man als Kind gegessen hat, isst man ein Leben lang am liebsten.') },
      { kind: 'line', speaker: 'mia', mood: 'curious', text: german('{name}, für meinen Artikel brauche ich noch eine dritte Stimme. Was ist deiner Meinung nach das typischste Gericht in Deutschland – und warum?') },
      { kind: 'reply', to: 'mia', options: [
        german('Ich glaube, es gibt kein einzelnes typisches Gericht mehr. Die deutsche Küche ist durch Migration vielfältig geworden – der Döner gehört genauso dazu wie das Schnitzel.'),
        german('Das typischste Gericht ist ein Fahrrad mit Senf, weil es so schnell ist.'),
        german('In Deutschland isst man grundsätzlich nur dienstags.')
      ] },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Perfekt, das wird mein Schlusssatz. Und jetzt habe ich Hunger. Ali, einmal mit allem – und Fritz, ein Kilo Kartoffeln für heute Abend.') },
      { kind: 'question', prompt: german('Wie viele Dönerläden gibt es Schätzungen zufolge in Deutschland?'), options: [german('Über 16 000'), german('Rund 1 600'), german('Über 160 000')] },
      { kind: 'question', prompt: german('Welches Gericht landet laut Umfragen auf Platz eins?'), options: [german('Spaghetti Bolognese'), german('Schweinebraten mit Knödeln'), german('Currywurst')] },
      { kind: 'question', prompt: german('Wo und wann wurde der Döner im Brot erfunden?'), options: [german('In den Siebzigerjahren in Berlin'), german('In den Fünfzigerjahren in Istanbul'), german('In den Neunzigerjahren in München')] },
      { kind: 'question', prompt: german('Warum ist der Dönerpreis laut Ali gestiegen?'), options: [german('Weil Fleisch, Energie und Miete teurer geworden sind'), german('Weil die Portionen doppelt so groß sind'), german('Weil weniger Leute Döner essen')] },
      { kind: 'question', prompt: german('Wie erklärt Fritz die Beliebtheit einfacher Gerichte?'), options: [german('Mit Vertrautheit aus der Kindheit'), german('Mit Werbung im Fernsehen'), german('Mit niedrigen Preisen im Supermarkt')] },
      { kind: 'question', prompt: german('Welches Gericht ist in Kantinen seit Jahrzehnten ganz vorne dabei?'), options: [german('Die Currywurst'), german('Die Rouladen'), german('Der Döner')] }
    ]
  },
  {
    id: 'b2-wine',
    level: 'b2',
    scene: 'cafe',
    cast: ['enzo', 'oma', 'albert'],
    languages: ['de'],
    title: german('Welcher Wein passt dazu?'),
    beats: [
      { kind: 'narration', text: german('Oma feiert nächste Woche ihren achtzigsten Geburtstag mit einem Abendessen für zwölf Gäste. Enzo, der Pizzabäcker, hat in seiner Familie in der Toskana viel über Wein gelernt und berät sie gemeinsam mit Albert.') },
      { kind: 'line', speaker: 'oma', text: german('Es gibt drei Gänge: zuerst Spargel mit Sauce hollandaise, dann Entenbrust mit Rotkohl und zum Nachtisch Käse und Apfelstrudel. Und welchen Wein soll ich dazu servieren?') },
      { kind: 'line', speaker: 'enzo', mood: 'happy', text: german('Che bello! Die wichtigste Regel: Wein und Essen sollen sich nicht gegenseitig erschlagen. Leichte Gerichte, leichte Weine. Kräftige Gerichte, kräftige Weine.') },
      { kind: 'line', speaker: 'albert', text: german('Zum Spargel empfehle ich einen trockenen Silvaner oder Weißburgunder. Spargel ist heikel: Er lässt viele Weine metallisch schmecken, vor allem solche mit viel Gerbstoff.') },
      { kind: 'line', speaker: 'oma', mood: 'curious', text: german('Gerbstoff? Was ist das denn genau?') },
      { kind: 'line', speaker: 'enzo', text: german('Die Tannine, Signora! Sie kommen aus den Schalen der roten Trauben und machen den Mund trocken, ein bisschen wie schwarzer Tee. Bei fettem Fleisch ist das perfekt, denn Fett macht die Tannine weich. Deshalb passt zur Ente ein Spätburgunder: fruchtig, nicht zu schwer.') },
      { kind: 'line', speaker: 'albert', text: german('Und beim Nachtisch gilt eine Regel, die viele nicht kennen: Der Wein muss süßer sein als das Dessert. Sonst schmeckt er plötzlich sauer und dünn.') },
      { kind: 'line', speaker: 'enzo', text: german('Zum Blauschimmelkäse ein edelsüßer Wein, eine Riesling-Auslese zum Beispiel. Salz und Süße – das ist wie ein Tanz.') },
      { kind: 'line', speaker: 'oma', mood: 'curious', text: german('{name}, du hast doch auch gut zugehört. Was würdest du servieren, wenn einer der Gäste ein scharfes Thai-Curry möchte?') },
      { kind: 'reply', to: 'oma', options: [
        german('Am besten einen halbtrockenen Riesling: Die leichte Süße und die Säure mildern die Schärfe, und er hat wenig Alkohol.'),
        german('Einen sehr schweren Rotwein mit 15 Prozent Alkohol, damit es richtig brennt.'),
        german('Zum Curry serviert man grundsätzlich nur Spülwasser.')
      ] },
      { kind: 'line', speaker: 'albert', text: german('Korrekt. Alkohol verstärkt die Schärfe, Süße dämpft sie. Das ist schlicht Chemie.') },
      { kind: 'line', speaker: 'oma', mood: 'happy', text: german('Gut. Dann brauche ich für zwölf Leute sechs Flaschen Weißwein, sechs Flaschen Rotwein und zwei Flaschen Süßwein. Und eine Kiste Wasser für den Albert.') },
      { kind: 'question', prompt: german('Was ist laut Enzo die wichtigste Regel?'), options: [german('Wein und Essen sollen sich nicht gegenseitig überdecken.'), german('Zu Fleisch immer Weißwein.'), german('Je teurer der Wein, desto besser.')] },
      { kind: 'question', prompt: german('Warum ist Spargel beim Wein heikel?'), options: [german('Er lässt viele Weine metallisch schmecken.'), german('Er macht jeden Wein süßer.'), german('Er verträgt nur Rotwein.')] },
      { kind: 'question', prompt: german('Warum passt ein Rotwein mit Tanninen gut zu fettem Fleisch?'), options: [german('Weil das Fett die Tannine weich macht'), german('Weil die Tannine das Fleisch zarter machen'), german('Weil Fett den Alkohol verstärkt')] },
      { kind: 'question', prompt: german('Was gilt beim Dessertwein?'), options: [german('Der Wein muss süßer sein als das Dessert.'), german('Der Wein muss trockener sein als das Dessert.'), german('Zum Dessert trinkt man keinen Wein.')] },
      { kind: 'question', prompt: german('Wie alt wird Oma?'), options: [german('Achtzig'), german('Siebzig'), german('Neunzig')] },
      { kind: 'question', prompt: german('Wie viele Flaschen Wein braucht Oma insgesamt?'), options: [german('Vierzehn'), german('Zwölf'), german('Sechs')] }
    ]
  },
  {
    id: 'b2-immigration-office',
    level: 'b2',
    scene: 'office',
    cast: ['kumar', 'mia', 'kim'],
    languages: ['de'],
    title: german('Auf der Ausländerbehörde'),
    beats: [
      { kind: 'narration', text: german('Kumars Visum läuft in drei Wochen ab. Nach vier Monaten Wartezeit hat er endlich einen Termin bei der Ausländerbehörde bekommen: Dienstag, 8:15 Uhr, Zimmer 214. Mia begleitet ihn zur Unterstützung.') },
      { kind: 'line', speaker: 'kumar', mood: 'worried', text: german('Ich bin so nervös, Mia. Was ist, wenn ein Dokument fehlt? Dann muss ich wieder vier Monate warten!') },
      { kind: 'line', speaker: 'mia', text: german('Wir haben gestern Abend alles zweimal kontrolliert. Reisepass, biometrisches Foto, Arbeitsvertrag, Mietvertrag, Meldebescheinigung, Nachweis der Krankenversicherung. Das passt.') },
      { kind: 'narration', text: german('Um 8:40 Uhr wird Kumars Wartenummer aufgerufen: 147. Frau Kim, die Sachbearbeiterin, blättert in seiner Akte.') },
      { kind: 'line', speaker: 'kim', text: german('Guten Morgen. Sie beantragen eine Blaue Karte EU. Ihr Bruttojahresgehalt liegt laut Arbeitsvertrag bei 52 000 Euro – damit erfüllen Sie die Gehaltsgrenze für IT-Fachkräfte. Haben Sie einen Nachweis über Ihren Hochschulabschluss?') },
      { kind: 'line', speaker: 'kumar', mood: 'surprised', text: german('Oh nein. Mein Bachelorzeugnis aus Bangalore … das liegt zu Hause im blauen Ordner.') },
      { kind: 'line', speaker: 'kim', text: german('Das ist kein Problem, solange Ihr Abschluss bereits als gleichwertig anerkannt ist. Sie können das Zeugnis innerhalb von zwei Wochen per E-Mail nachreichen.') },
      { kind: 'line', speaker: 'mia', mood: 'curious', text: german('Und was passiert, wenn das Visum abläuft, bevor die Karte fertig ist? Die Produktion dauert ja oft mehrere Wochen.') },
      { kind: 'line', speaker: 'kim', text: german('Dann stelle ich ihm eine Fiktionsbescheinigung aus. Damit gilt sein bisheriger Aufenthalt als fortbestehend, und er darf weiterarbeiten und auch reisen – mit gewissen Einschränkungen.') },
      { kind: 'line', speaker: 'kim', mood: 'curious', text: german('{name}, Sie sind als Begleitung hier. Haben Sie noch eine Frage zum Verfahren?') },
      { kind: 'reply', to: 'kim', options: [
        german('Ja: Wie erfährt Herr Kumar, wann er die fertige Karte abholen kann?'),
        german('Ja: Darf ich die Blaue Karte auch in Grün bekommen?'),
        german('Nein, ich warte nur auf den Bus nach Bangalore.')
      ] },
      { kind: 'line', speaker: 'kim', mood: 'happy', text: german('Er bekommt einen Brief von der Bundesdruckerei mit einem PIN-Brief und einem Abholtermin. Die Gebühr beträgt 100 Euro, Sie können vorne am Automaten mit Karte zahlen.') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Danke! Mia, heute Abend koche ich für dich. Mein bestes Curry. Und danach spüle ich sogar.') },
      { kind: 'question', prompt: german('Wann und wo ist Kumars Termin?'), options: [german('Am Dienstag um 8:15 Uhr in Zimmer 214'), german('Am Montag um 8:40 Uhr in Zimmer 147'), german('Am Freitag um 14 Uhr in Zimmer 241')] },
      { kind: 'question', prompt: german('Wie lange hat Kumar auf den Termin gewartet?'), options: [german('Vier Monate'), german('Drei Wochen'), german('Zwei Wochen')] },
      { kind: 'question', prompt: german('Welches Dokument hat Kumar vergessen?'), options: [german('Sein Bachelorzeugnis'), german('Seinen Reisepass'), german('Seinen Mietvertrag')] },
      { kind: 'question', prompt: german('Bis wann kann er das fehlende Dokument nachreichen?'), options: [german('Innerhalb von zwei Wochen'), german('Bis morgen früh'), german('Innerhalb von vier Monaten')] },
      { kind: 'question', prompt: german('Wozu dient die Fiktionsbescheinigung?'), options: [german('Sein Aufenthalt gilt als fortbestehend, bis die Karte fertig ist.'), german('Sie ersetzt seinen Reisepass dauerhaft.'), german('Sie erlaubt ihm, den Arbeitgeber zu wechseln.')] },
      { kind: 'question', prompt: german('Wie hoch ist die Gebühr?'), options: [german('100 Euro'), german('52 Euro'), german('214 Euro')] }
    ]
  },
  {
    id: 'c1-social-media',
    level: 'c1',
    scene: 'flat',
    cast: ['becker', 'jana', 'selma'],
    languages: ['de'],
    title: german('Fluch oder Segen? Soziale Medien'),
    beats: [
      { kind: 'narration', text: german('Herr Becker hat für seine Schule eine Podiumsdiskussion zum Thema „Soziale Medien – Fluch oder Segen?“ organisiert. Zur Vorbereitung trifft er sich mit Jana, die als Entwicklerin selbst an Apps arbeitet, und Selma, die als Krankenschwester in der Kinder- und Jugendpsychiatrie gearbeitet hat.') },
      { kind: 'line', speaker: 'becker', text: german('In meiner zehnten Klasse schauen die Schüler im Schnitt über drei Stunden täglich aufs Handy. Wer morgens müde ist, war meist bis zwei Uhr nachts auf TikTok. Ich halte das für eine Entwicklung mit gravierenden Folgen.') },
      { kind: 'line', speaker: 'selma', text: german('Die Zahlen geben Ihnen recht. Einer Studie einer großen Krankenkasse zufolge nutzt etwa ein Viertel der Zehn- bis Siebzehnjährigen soziale Medien auf riskante Weise, ein kleiner Teil sogar krankhaft. In der Klinik habe ich Jugendliche erlebt, deren Selbstwertgefühl am Ende nur noch von Likes abhing.') },
      { kind: 'line', speaker: 'jana', text: german('Wobei man vorsichtig sein muss: Dass Jugendliche, die viel online sind, häufiger depressiv sind, beweist noch keine Ursache. Es könnte ebenso gut sein, dass einsame oder bedrückte Jugendliche sich ins Netz zurückziehen. Korrelation ist nicht Kausalität.') },
      { kind: 'line', speaker: 'becker', mood: 'curious', text: german('Aber Sie bestreiten doch nicht, dass die Plattformen bewusst so gebaut sind, dass man nicht aufhören kann?') },
      { kind: 'line', speaker: 'jana', text: german('Nein, das bestreite ich nicht. Endloses Scrollen, Push-Nachrichten, variable Belohnungen wie beim Spielautomaten – das Geschäftsmodell basiert auf Aufmerksamkeit, weil sich Werbung nach Verweildauer verkauft. Und Algorithmen, die auf Interaktion optimiert sind, bevorzugen nun einmal Inhalte, die empören. Das polarisiert die ganze Gesellschaft.') },
      { kind: 'line', speaker: 'selma', text: german('Gleichzeitig darf man die Vorteile nicht unterschlagen. Jugendliche mit seltenen Krankheiten finden online Menschen, denen es genauso geht. Queere Jugendliche auf dem Land finden dort oft zum ersten Mal Anerkennung. Und bei Hochwasser oder anderen Katastrophen verbreiten sich Warnungen in Minuten.') },
      { kind: 'line', speaker: 'becker', text: german('Australien hat soziale Medien für unter Sechzehnjährige inzwischen verboten. Wäre das auch für Deutschland ein gangbarer Weg?') },
      { kind: 'line', speaker: 'jana', mood: 'curious', text: german('Ein Verbot klingt entschlossen, ist aber kaum durchsetzbar, ohne alle Nutzer zur Altersverifikation zu zwingen – mit erheblichen Folgen für den Datenschutz. {name}, wie würden Sie das Problem angehen?') },
      { kind: 'reply', to: 'jana', options: [
        german('Ich würde eher bei den Plattformen ansetzen, etwa mit Auflagen für suchtfördernde Funktionen, und gleichzeitig Medienkompetenz in der Schule fest verankern, statt pauschal zu verbieten.'),
        german('Ich würde das Internet einfach jeden Abend um acht Uhr für alle abschalten.'),
        german('Das Problem löst sich von selbst, sobald alle Handys gleichzeitig herunterfallen.')
      ] },
      { kind: 'line', speaker: 'selma', text: german('Das sehe ich ähnlich. Wer Jugendlichen nur das Handy wegnimmt, nimmt ihnen nicht das Bedürfnis nach Zugehörigkeit. Sie müssen lernen, warum ihnen der Feed so zusetzt.') },
      { kind: 'line', speaker: 'becker', mood: 'happy', text: german('Dann haben wir unsere These für die Diskussion: Nicht die Technik an sich ist das Problem, sondern ein Geschäftsmodell, das von unserer Aufmerksamkeit lebt. Vielen Dank – und jetzt lege ich mein Handy demonstrativ in die Schublade.') },
      { kind: 'question', prompt: german('Wie viel Zeit verbringen Herrn Beckers Schüler im Schnitt täglich am Handy?'), options: [german('Über drei Stunden'), german('Etwa eine halbe Stunde'), german('Rund zehn Stunden')] },
      { kind: 'question', prompt: german('Welchen Anteil der Zehn- bis Siebzehnjährigen nennt Selma als riskante Nutzer?'), options: [german('Etwa ein Viertel'), german('Etwa die Hälfte'), german('Fast alle')] },
      { kind: 'question', prompt: german('Was meint Jana mit „Korrelation ist nicht Kausalität“?'), options: [german('Ein Zusammenhang beweist nicht, was Ursache und was Wirkung ist.'), german('Statistiken über soziale Medien sind grundsätzlich gefälscht.'), german('Depressionen haben nichts mit Jugendlichen zu tun.')] },
      { kind: 'question', prompt: german('Warum bevorzugen Algorithmen laut Jana empörende Inhalte?'), options: [german('Weil sie auf Interaktion optimiert sind und Empörung viel Interaktion erzeugt'), german('Weil die Entwickler selbst gern empört sind'), german('Weil empörende Inhalte weniger Speicher brauchen')] },
      { kind: 'question', prompt: german('Welchen Nachteil eines Verbots nennt Jana?'), options: [german('Es wäre nur mit einer Altersverifikation für alle durchsetzbar, was den Datenschutz gefährdet.'), german('Es würde die Schulen zu viel Geld kosten.'), german('Es würde nur für Erwachsene gelten.')] },
      { kind: 'question', prompt: german('Welche These formuliert Herr Becker am Ende?'), options: [german('Das Problem ist ein Geschäftsmodell, das von Aufmerksamkeit lebt.'), german('Soziale Medien sollten sofort verboten werden.'), german('Die Technik selbst ist das eigentliche Übel.')] }
    ]
  },
  {
    id: 'c1-project',
    level: 'c1',
    scene: 'office',
    cast: ['kim', 'simon', 'jana'],
    languages: ['de'],
    title: german('Das Projekt gerät ins Wanken'),
    beats: [
      { kind: 'narration', text: german('Montag, 9:00 Uhr, Krisensitzung. Das Team soll für einen Kunden ein Buchungssystem entwickeln, das am 1. März live gehen muss. Es ist Mitte Januar, das Projekt hängt sechs Wochen hinterher, und von den 240 000 Euro Budget sind bereits 180 000 verbraucht.') },
      { kind: 'line', speaker: 'kim', text: german('Ich will ehrlich sein: So kann ich das dem Kunden nicht präsentieren. Wie konnte es passieren, dass wir drei Viertel des Budgets ausgegeben, aber erst die Hälfte der Funktionen fertig haben?') },
      { kind: 'line', speaker: 'simon', text: german('Ganz einfach: Der Kunde hat seit dem Projektstart vierzehn zusätzliche Anforderungen nachgeschoben. Jede für sich war klein, aber zusammen haben sie den Umfang um ein Drittel vergrößert. Ein klassischer Fall von schleichender Ausweitung des Projektumfangs.') },
      { kind: 'line', speaker: 'jana', text: german('Und wir haben zu allem Ja gesagt, ohne den Zeitplan anzupassen. Das Problem ist nicht der Kunde, sondern dass wir kein sauberes Änderungsmanagement hatten.') },
      { kind: 'line', speaker: 'kim', mood: 'curious', text: german('Was ist mit zusätzlichen Entwicklern? Ich könnte zwei Leute aus einem anderen Team abziehen.') },
      { kind: 'line', speaker: 'simon', mood: 'worried', text: german('Davor muss ich warnen. Schon in den Siebzigern hat Fred Brooks beschrieben, dass zusätzliches Personal ein verspätetes Projekt meist noch weiter verzögert: Die Neuen müssen eingearbeitet werden, und mit jeder Person wächst der Abstimmungsaufwand überproportional.') },
      { kind: 'line', speaker: 'jana', text: german('Damit stehen wir ja nicht allein da. Einer viel zitierten Studie zufolge wird nur etwa ein Drittel aller IT-Projekte in Zeit, Budget und vollem Umfang abgeschlossen. Rund die Hälfte überzieht, und knapp ein Fünftel scheitert ganz.') },
      { kind: 'line', speaker: 'kim', text: german('Statistik tröstet den Kunden wenig. Also: Wir können Zeit, Budget oder Umfang verändern. Den Termin hat der Kunde vertraglich festgelegt, und mehr Geld gibt es nicht. {name}, Sie haben die Unterlagen gelesen – wie würden Sie vorgehen?') },
      { kind: 'reply', to: 'kim', options: [
        german('Ich würde mit dem Kunden priorisieren, welche Funktionen zum 1. März unverzichtbar sind, diese als erste Version ausliefern und den Rest in einer zweiten Phase nachreichen.'),
        german('Ich würde sechs neue Entwickler einstellen und hoffen, dass es schneller geht.'),
        german('Ich würde den Kalender verstecken, damit niemand merkt, dass schon März ist.')
      ] },
      { kind: 'line', speaker: 'simon', text: german('Einverstanden. Ich erstelle bis Mittwoch eine Liste aller Funktionen mit Aufwandsschätzung, sortiert nach „muss“, „sollte“ und „kann“. Und ab sofort geht jede Änderung über eine schriftliche Freigabe mit Folgenabschätzung.') },
      { kind: 'line', speaker: 'jana', text: german('Und wir arbeiten in Sprints von zwei Wochen, mit einer Vorführung beim Kunden am Ende jedes Sprints. Dann sieht er früh, was wir liefern, und Überraschungen gibt es nicht erst im Februar.') },
      { kind: 'line', speaker: 'kim', mood: 'happy', text: german('Gut. Dann telefoniere ich heute um 14 Uhr mit dem Kunden. Wer das Gespräch vorbereitet, bekommt meinen Respekt – und einen Kaffee.') },
      { kind: 'question', prompt: german('Wie viel vom Budget ist bereits verbraucht?'), options: [german('180 000 von 240 000 Euro'), german('120 000 von 240 000 Euro'), german('240 000 von 180 000 Euro')] },
      { kind: 'question', prompt: german('Was ist laut Simon die Hauptursache der Verzögerung?'), options: [german('Vierzehn nachträgliche Anforderungen des Kunden'), german('Krankheitsfälle im Team'), german('Ein Serverausfall im Dezember')] },
      { kind: 'question', prompt: german('Warum rät Simon von zusätzlichen Entwicklern ab?'), options: [german('Weil Einarbeitung und Abstimmungsaufwand das Projekt weiter verzögern'), german('Weil die anderen Teams keine Zeit haben'), german('Weil der Kunde keine neuen Gesichter möchte')] },
      { kind: 'question', prompt: german('Welcher Anteil der IT-Projekte wird laut der Studie vollständig erfolgreich abgeschlossen?'), options: [german('Etwa ein Drittel'), german('Etwa die Hälfte'), german('Knapp ein Fünftel')] },
      { kind: 'question', prompt: german('Welche der drei Größen will das Team verändern?'), options: [german('Den Umfang'), german('Den Termin'), german('Das Budget')] },
      { kind: 'question', prompt: german('Wie lange dauert ein Sprint nach Janas Vorschlag?'), options: [german('Zwei Wochen'), german('Zwei Monate'), german('Zwei Tage')] }
    ]
  },
  {
    id: 'c2-court',
    level: 'c2',
    scene: 'office',
    cast: ['paul', 'robert', 'albert'],
    languages: ['de'],
    title: german('Die Verhandlung'),
    beats: [
      { kind: 'narration', text: german('Amtsgericht, Sitzungssaal 3, Donnerstag, 10:30 Uhr. Richter Paul verhandelt eine Zivilsache: Der Handwerker Robert verklagt Albert auf Zahlung des restlichen Werklohns von 3 800 Euro für ein neu gefliestes Badezimmer. Albert verweigert die Zahlung wegen angeblicher Mängel.') },
      { kind: 'line', speaker: 'paul', text: german('Ich eröffne die Sitzung. Herr Robert, Sie sind der Kläger. Fassen Sie Ihren Standpunkt bitte kurz zusammen.') },
      { kind: 'line', speaker: 'robert', text: german('Bad ist seit August fertig. Fliesen, Dusche, Armaturen – alles nach Auftrag. Herr Albert hat zwei Drittel bezahlt, den Rest nicht. Seit drei Monaten keine Reaktion auf meine Rechnungen.') },
      { kind: 'line', speaker: 'albert', mood: 'angry', text: german('Weil die Arbeit mangelhaft ist! In der Dusche bleibt das Wasser stehen, weil das Gefälle zum Abfluss falsch berechnet wurde. Ich habe das Herrn Robert schriftlich mitgeteilt und ihm eine Frist zur Nachbesserung gesetzt. Er hat sie verstreichen lassen.') },
      { kind: 'line', speaker: 'robert', text: german('Frist? Ich hab einen Brief bekommen, in dem stand, dass die Fugen „farblich unbefriedigend“ seien. Von der Dusche stand da nichts.') },
      { kind: 'line', speaker: 'paul', text: german('Damit wären wir bei der entscheidenden Frage. Herr Albert, Sie nutzen das Badezimmer seit August täglich, ohne die Leistung je ausdrücklich zurückgewiesen zu haben. Das kann als Abnahme gewertet werden. Nach der Abnahme liegt die Beweislast für behauptete Mängel bei Ihnen, nicht beim Handwerker.') },
      { kind: 'line', speaker: 'albert', mood: 'surprised', text: german('Bei mir? Das Wasser steht doch für jedermann sichtbar in der Duschwanne!') },
      { kind: 'line', speaker: 'paul', text: german('Wir haben heute jemanden als Zeugen geladen, der Herrn Albert in der fraglichen Zeit besucht hat. {name}, Sie sind zur Wahrheit verpflichtet. Was haben Sie im Bad beobachtet?') },
      { kind: 'reply', to: 'paul', options: [
        german('Nach dem Duschen stand tatsächlich ein, zwei Zentimeter Wasser in der Ecke gegenüber dem Abfluss. Ob das an der Neigung oder an einem verstopften Abfluss lag, kann ich allerdings nicht beurteilen.'),
        german('Ich habe nichts gesehen, aber ich bin mir sicher, dass Herr Robert schuld ist, weil er so grimmig schaut.'),
        german('Im Bad stand ein Pferd, das hat das ganze Wasser getrunken.')
      ] },
      { kind: 'line', speaker: 'paul', text: german('Danke, das war eine sachliche Aussage, die zwischen Beobachtung und Bewertung unterscheidet. Für die Ursache bräuchten wir ein Sachverständigengutachten. Das würde etwa 2 000 Euro kosten und mehrere Monate dauern – bei einem Streitwert von 3 800 Euro ein ziemliches Missverhältnis.') },
      { kind: 'line', speaker: 'paul', text: german('Ich schlage den Parteien deshalb einen Vergleich vor: Herr Robert prüft und behebt den Abfluss binnen vierzehn Tagen auf eigene Kosten. Herr Albert zahlt sofort 3 000 Euro und die restlichen 800 Euro nach erfolgreicher Nachbesserung. Die Kosten des Rechtsstreits werden gegeneinander aufgehoben.') },
      { kind: 'line', speaker: 'robert', text: german('Hm. Wenn’s nur der Abfluss ist – einverstanden. Mach ich nächsten Dienstag.') },
      { kind: 'line', speaker: 'albert', text: german('Na schön. Ich bestehe allerdings auf einer Widerrufsfrist, um das mit meinem Anwalt zu besprechen. Und auf einer Abnahme in schriftlicher Form. Ordnung muss sein.') },
      { kind: 'question', prompt: german('Worum geht es in dem Verfahren?'), options: [german('Um den restlichen Werklohn für ein gefliestes Bad'), german('Um einen Wasserschaden in der Nachbarwohnung'), german('Um eine fristlose Kündigung')] },
      { kind: 'question', prompt: german('Warum liegt die Beweislast laut Richter Paul bei Albert?'), options: [german('Weil er das Bad seit August nutzt, was als Abnahme gewertet werden kann'), german('Weil er der Kläger ist'), german('Weil er die Rechnung schon vollständig bezahlt hat')] },
      { kind: 'question', prompt: german('Was stand laut Robert in Alberts Brief?'), options: [german('Dass die Fugen farblich unbefriedigend seien'), german('Dass das Wasser in der Dusche stehe'), german('Dass die Armaturen fehlten')] },
      { kind: 'question', prompt: german('Warum hält der Richter ein Gutachten für unverhältnismäßig?'), options: [german('Weil es teuer und langwierig wäre im Verhältnis zum Streitwert'), german('Weil die Ursache schon eindeutig feststeht'), german('Weil Gutachten im Zivilprozess unzulässig sind')] },
      { kind: 'question', prompt: german('Was sieht der Vergleich vor?'), options: [german('3 000 Euro sofort und 800 Euro nach der Nachbesserung'), german('Den vollen Betrag sofort ohne Nachbesserung'), german('Eine Halbierung des Werklohns')] },
      { kind: 'question', prompt: german('Was bedeutet es, dass die Kosten des Rechtsstreits gegeneinander aufgehoben werden?'), options: [german('Jede Partei trägt ihre eigenen Kosten, die Gerichtskosten werden geteilt.'), german('Der Verlierer zahlt alles.'), german('Das Gericht übernimmt sämtliche Kosten.')] }
    ]
  },
  {
    id: 'c2-language-app',
    level: 'c2',
    scene: 'cafe',
    cast: ['jana', 'simon', 'kumar'],
    languages: ['de'],
    title: german('Eine App zum Sprachenlernen'),
    beats: [
      { kind: 'narration', text: german('Jana und Simon wollen mit einer eigenen App Menschen beim Sprachenlernen helfen. Im Café besprechen sie das Konzept mit Kumar, der seit einem Jahr Deutsch lernt und schon ein halbes Dutzend Apps ausprobiert – und wieder gelöscht – hat.') },
      { kind: 'line', speaker: 'kumar', text: german('Ehrlich gesagt: Alle Apps funktionieren die ersten zwei Wochen. Dann vergisst man einen Tag, die Serie ist weg, und man hat keine Lust mehr. Nach einem Monat habe ich jede wieder gelöscht.') },
      { kind: 'line', speaker: 'jana', text: german('Damit bist du branchentypisch. Bei Lern-Apps nutzen nach dreißig Tagen oft nur noch wenige Prozent der Leute die App regelmäßig. Das Problem ist nicht der Einstieg, sondern das Durchhalten.') },
      { kind: 'line', speaker: 'simon', text: german('Und genau da setzt die Lernpsychologie an. Ebbinghaus hat schon im 19. Jahrhundert die Vergessenskurve beschrieben: Ohne Wiederholung ist nach einem Tag deutlich mehr als die Hälfte neuer Wörter wieder weg. Wiederholt man in wachsenden Abständen – nach einem Tag, drei Tagen, einer Woche –, festigt sich das Wissen mit einem Bruchteil des Aufwands.') },
      { kind: 'line', speaker: 'kumar', mood: 'curious', text: german('Und die Serien und Punkte? Die sollen doch motivieren.') },
      { kind: 'line', speaker: 'jana', text: german('Spielelemente sind ein zweischneidiges Schwert. Sie erzeugen äußere Motivation, und die kann die innere geradezu verdrängen: Irgendwann lernst du nicht mehr, um Deutsch zu können, sondern um die Serie nicht zu verlieren. Wer dann einmal reißt, hat keinen Grund mehr weiterzumachen.') },
      { kind: 'line', speaker: 'simon', text: german('Deshalb schlage ich vor, Fortschritt an dem zu messen, was man tatsächlich kann: Wie viele Wörter sitzen dauerhaft, welche Gespräche bewältigt man schon? Und eine verpasste Woche darf nicht bestraft werden, sondern sollte einen sanften Wiedereinstieg auslösen.') },
      { kind: 'line', speaker: 'kumar', text: german('Was mir am meisten fehlt, sind Geschichten. Einzelne Wörter vergesse ich, aber wenn ich ein Wort in einer witzigen Situation gelernt habe, mit Figuren, die ich mag, bleibt es hängen.') },
      { kind: 'line', speaker: 'jana', text: german('Technisch ist das machbar: Geschichten, in die gezielt die Wörter eingebaut werden, die jemand zuletzt falsch hatte. Allerdings speichern wir dann sehr detaillierte Lerndaten. Nach der Datenschutz-Grundverordnung brauchen wir dafür eine klare Rechtsgrundlage, Datensparsamkeit und am besten eine Verarbeitung direkt auf dem Gerät.') },
      { kind: 'line', speaker: 'simon', mood: 'curious', text: german('{name}, Sie sind unser zweiter Testnutzer. Wenn Sie eine einzige Funktion priorisieren müssten – welche wäre das und warum?') },
      { kind: 'reply', to: 'simon', options: [
        german('Ich würde mit kurzen Geschichten beginnen, die gezielt meine Fehler wiederholen, weil Kontext und Wiederholung zusammen am meisten bewirken – und erst danach Spielelemente ergänzen.'),
        german('Ich hätte am liebsten eine Funktion, die mir die Sprache über Nacht ins Gehirn lädt.'),
        german('Das Wichtigste ist, dass die App möglichst viele Benachrichtigungen pro Stunde schickt.')
      ] },
      { kind: 'line', speaker: 'jana', mood: 'happy', text: german('Dann ist das unser minimal funktionsfähiges Produkt: Geschichten plus Wiederholung in Abständen. In acht Wochen testen wir eine erste Version mit fünfzig Nutzern und vergleichen, wer nach dreißig Tagen noch dabei ist.') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Und ich will eine Katze in der App. Eine, die Fisch mag und schnurrt, wenn man etwas richtig macht.') },
      { kind: 'question', prompt: german('Warum hat Kumar bisher jede App gelöscht?'), options: [german('Weil er nach einer verlorenen Serie die Motivation verloren hat'), german('Weil die Apps zu teuer waren'), german('Weil sein Handy keinen Speicherplatz mehr hatte')] },
      { kind: 'question', prompt: german('Was beschreibt die Vergessenskurve von Ebbinghaus?'), options: [german('Dass man ohne Wiederholung schon nach einem Tag mehr als die Hälfte vergisst'), german('Dass man im Alter schneller lernt'), german('Dass man morgens besser lernt als abends')] },
      { kind: 'question', prompt: german('Welche Gefahr sieht Jana bei Spielelementen?'), options: [german('Äußere Motivation kann die innere verdrängen.'), german('Sie machen die App zu langsam.'), german('Sie sind datenschutzrechtlich verboten.')] },
      { kind: 'question', prompt: german('Wie soll die App laut Simon mit einer verpassten Woche umgehen?'), options: [german('Mit einem sanften Wiedereinstieg statt einer Strafe'), german('Mit dem Löschen des Fortschritts'), german('Mit einer Erinnerung jede Stunde')] },
      { kind: 'question', prompt: german('Was fordert die Datenschutz-Grundverordnung laut Jana unter anderem?'), options: [german('Eine Rechtsgrundlage und Datensparsamkeit'), german('Dass alle Daten öffentlich sind'), german('Dass Apps nur offline funktionieren dürfen')] },
      { kind: 'question', prompt: german('Wie soll die erste Version getestet werden?'), options: [german('In acht Wochen mit fünfzig Nutzern'), german('In fünfzig Wochen mit acht Nutzern'), german('Sofort mit allen Kunden')] }
    ]
  },
  {
    id: 'b2-police',
    level: 'b2',
    scene: 'office',
    cast: ['sabine', 'tom'],
    languages: ['de'],
    title: german('Auf dem Polizeirevier'),
    beats: [
      { kind: 'narration', text: german('Heute Morgen um 7:40 Uhr ist an der Kreuzung Goethestraße und Bahnhofstraße etwas passiert, das man kaum beschreiben kann: {name} fuhr mit dem Fahrrad zur Arbeit, als ein weißer Lieferwagen ohne zu blinken rechts abbog. {name} machte eine Vollbremsung. Ein E-Roller-Fahrer, der dicht dahinter fuhr, wich aus, streifte ein parkendes rotes Auto und riss dabei den Außenspiegel ab. Berührt hat {name} niemanden.') },
      { kind: 'narration', text: german('Zwei Stunden später sitzt {name} auf dem Polizeirevier. Polizeiobermeisterin Sabine nimmt die Aussage auf.') },
      { kind: 'line', speaker: 'sabine', text: german('Guten Tag. Sie sind hier, weil Sie an einem Unfall beteiligt waren. Noch wirft Ihnen niemand etwas vor. Erzählen Sie mir bitte in Ruhe, was an der Kreuzung passiert ist.') },
      { kind: 'reply', to: 'sabine', options: [
        german('Also … ein Lieferwagen ist abgebogen, ohne zu blinken, und ich musste sehr stark bremsen. Hinter mir ist dann ein Roller gegen ein Auto gefahren.'),
        german('Ich bin mit dem Auto gegen einen Lieferwagen gefahren.'),
        german('Ich war heute Morgen gar nicht an der Kreuzung.')
      ] },
      { kind: 'line', speaker: 'sabine', mood: 'curious', text: german('Hm. Und welche Farbe hatte Ihre Ampel, als Sie in die Kreuzung gefahren sind?') },
      { kind: 'reply', to: 'sabine', options: [
        german('Sie war grün.'),
        german('Sie war rot, aber nur ein bisschen.'),
        german('Daran erinnere ich mich nicht, ich habe auf mein Handy geschaut.')
      ] },
      { kind: 'line', speaker: 'sabine', mood: 'neutral', text: german('Seltsam. Der Fahrer des E-Rollers sagt etwas ganz anderes. Er behauptet, Sie seien bei Rot gefahren und hätten dann ohne Grund mitten auf der Kreuzung gebremst.') },
      { kind: 'narration', lights: 'lamp', sfx: 'hum', faces: { sabine: 'angry' }, text: german('Sabine steht auf und lässt die Jalousien herunter. Das Deckenlicht geht aus, nur die Lampe über dem Tisch brennt noch. Sie setzt sich wieder, legt einen dicken Ordner auf den Tisch und schaut {name} lange schweigend an.') },
      { kind: 'line', speaker: 'sabine', mood: 'angry', text: german('Ich frage Sie jetzt noch einmal, und ich rate Ihnen, genau zu überlegen. Eine falsche Aussage ist kein Kavaliersdelikt. Um wie viel Uhr waren Sie an der Kreuzung?') },
      { kind: 'reply', to: 'sabine', options: [
        german('Um 7:40 Uhr, wie ich gesagt habe. Ich war auf dem Weg zur Arbeit.'),
        german('Ungefähr um zehn Uhr abends, glaube ich.'),
        german('Das sage ich nur, wenn Sie das Licht wieder anmachen.')
      ] },
      { kind: 'line', speaker: 'sabine', mood: 'angry', text: german('Der Mann auf dem Roller hat ein gebrochenes Handgelenk. Der Spiegel an dem roten Auto kostet 600 Euro. Wenn Sie bei Rot gefahren sind, ist das Ihr Problem. Also: Warum haben Sie gebremst?') },
      { kind: 'reply', to: 'sabine', options: [
        german('Weil der Lieferwagen plötzlich vor mir abgebogen ist. Sonst wäre ich direkt in ihn hineingefahren.'),
        german('Einfach so. Ich bremse gern auf Kreuzungen.'),
        german('Weil meine Ampel rot war, wie der Rollerfahrer sagt.')
      ] },
      { kind: 'line', speaker: 'sabine', mood: 'angry', text: german('Das sagen Sie. Aber einen Zeugen haben Sie nicht, oder? Wer soll Ihnen das glauben?') },
      { kind: 'narration', sfx: 'knock', enters: ['tom'], text: german('In diesem Moment klopft es. Ein Kollege öffnet die Tür, und Tom kommt herein, noch in seiner Bäckerschürze, mit einem Handy in der Hand.') },
      { kind: 'line', speaker: 'tom', text: german('Entschuldigung, ich bin Tom. Ich arbeite in der Bäckerei direkt an der Kreuzung und habe alles gesehen. Darf ich meine Aussage machen?') },
      { kind: 'line', speaker: 'sabine', mood: 'surprised', text: german('Sie waren Zeuge? Bitte, setzen Sie sich.') },
      { kind: 'line', speaker: 'tom', text: german('Ich stand um 7:40 Uhr hinter der Theke am Fenster. Die Ampel für die Bahnhofstraße war grün, für Fahrräder und für den Lieferwagen. Der Lieferwagen ist rechts abgebogen, ohne zu blinken und ohne in den Spiegel zu schauen, und hat dem Fahrrad die Vorfahrt genommen. Wer geradeaus fährt, hat dort Vorrang.') },
      { kind: 'line', speaker: 'tom', text: german('Der E-Roller ist viel zu dicht hinter dem Fahrrad gefahren, mit höchstens einem Meter Abstand. Als vorne gebremst wurde, konnte er nicht mehr anhalten, ist nach links ausgewichen und hat das rote Auto gestreift. Den Lieferwagen hat er gar nicht gesehen, weil er auf sein Handy geschaut hat.') },
      { kind: 'line', speaker: 'tom', mood: 'happy', text: german('Und unsere Bäckerei hat eine Kamera über dem Eingang. Mein Chef hat Ihnen das Video schon per E-Mail geschickt.') },
      { kind: 'narration', lights: 'on', faces: { sabine: 'neutral' }, text: german('Sabine schaut auf ihren Bildschirm, dann zieht sie die Jalousien wieder hoch. Das Licht geht an, und plötzlich wirkt der Raum gar nicht mehr so bedrohlich.') },
      { kind: 'line', speaker: 'sabine', text: german('Das Video bestätigt Ihre Aussage. Entschuldigen Sie bitte meinen Ton vorhin. Wenn zwei Aussagen sich widersprechen, muss ich prüfen, ob jemand lügt – und manchmal geht das nur mit etwas Druck. Sie können gehen. Gegen den Fahrer des Lieferwagens wird ermittelt.') },
      { kind: 'line', speaker: 'tom', mood: 'happy', text: german('Komm, {name}. Nach so einem Morgen brauchst du erst einmal einen Kaffee und eine Brezel. Geht aufs Haus.') },
      { kind: 'question', prompt: german('Warum musste {name} an der Kreuzung so stark bremsen?'), options: [german('Weil ein Lieferwagen ohne zu blinken rechts abgebogen ist'), german('Weil die Ampel plötzlich rot wurde'), german('Weil ein Hund auf die Straße gelaufen ist')] },
      { kind: 'question', prompt: german('Was behauptet der Fahrer des E-Rollers?'), options: [german('Dass {name} bei Rot gefahren ist und ohne Grund gebremst hat'), german('Dass der Lieferwagen zu schnell war'), german('Dass er selbst bei Rot gefahren ist')] },
      { kind: 'question', prompt: german('Was verändert sich, als Sabine ernster wird?'), options: [german('Sie lässt die Jalousien herunter, und nur noch die Lampe über dem Tisch brennt.'), german('Sie ruft ihren Chef an.'), german('Sie öffnet das Fenster.')] },
      { kind: 'question', prompt: german('Warum konnte der E-Roller nicht rechtzeitig anhalten?'), options: [german('Weil er zu dicht hinter dem Fahrrad fuhr und auf sein Handy schaute'), german('Weil seine Bremsen kaputt waren'), german('Weil die Straße nass war')] },
      { kind: 'question', prompt: german('Wie viel kostet der Außenspiegel des roten Autos?'), options: [german('600 Euro'), german('60 Euro'), german('6 000 Euro')] },
      { kind: 'question', prompt: german('Was beweist schließlich, dass {name} die Wahrheit sagt?'), options: [german('Das Video der Kamera über dem Eingang der Bäckerei'), german('Ein Foto des Rollerfahrers'), german('Die Aussage des Lieferwagenfahrers')] },
      { kind: 'question', prompt: german('Wie erklärt Sabine ihr strenges Verhalten?'), options: [german('Bei widersprüchlichen Aussagen muss sie prüfen, ob jemand lügt.'), german('Sie hatte einen schlechten Tag.'), german('Sie kennt {name} schon von früher.')] }
    ]
  },
  {
    id: 'b1-fuse',
    level: 'b1',
    scene: 'flat',
    cast: ['mia', 'kumar', 'robert'],
    languages: ['de'],
    title: german('Die Sicherung ist raus'),
    beats: [
      { kind: 'narration', text: german('Dienstagabend, 19:45 Uhr. Kumar kocht in der WG-Küche ein Curry. Der Wasserkocher läuft, die Mikrowelle taut Reis auf, und im Bad wäscht die Waschmaschine gerade bei 60 Grad. Mia föhnt sich im Flur die Haare.') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('In zehn Minuten ist das Essen fertig! Heute nicht so scharf, versprochen.') },
      { kind: 'narration', sfx: 'fuse', lights: 'off', text: german('Plötzlich knallt es leise im Flur. Mit einem Schlag ist alles still: kein Licht, kein Föhn, keine Waschmaschine. Die ganze Wohnung ist dunkel.') },
      { kind: 'line', speaker: 'mia', mood: 'surprised', text: german('Hey! Was ist denn jetzt passiert? Ich sehe gar nichts mehr!') },
      { kind: 'line', speaker: 'kumar', mood: 'worried', text: german('Ich war das nicht! Ich habe nur den Wasserkocher angemacht … und die Mikrowelle … Ist das ein Stromausfall in der ganzen Stadt?') },
      { kind: 'line', speaker: 'mia', text: german('Nein, bei den Nachbarn gegenüber brennt Licht. Ich glaube, die Sicherung ist rausgeflogen. Mach mal die Taschenlampe an deinem Handy an. Der Sicherungskasten ist im Flur neben der Tür.') },
      { kind: 'narration', text: german('Im grauen Sicherungskasten sind zwölf kleine schwarze Schalter. Einer zeigt nach unten, alle anderen nach oben. Darauf steht in kleiner Schrift: Küche.') },
      { kind: 'line', speaker: 'mia', mood: 'curious', text: german('{name}, du kennst dich doch ein bisschen aus. Was sollen wir zuerst machen?') },
      { kind: 'reply', to: 'mia', options: [
        german('Zuerst ein paar Geräte ausschalten und dann den Schalter wieder nach oben drücken.'),
        german('Wir sollten den Sicherungskasten mit Wasser putzen.'),
        german('Am besten machen wir alle Geräte gleichzeitig noch einmal an.')
      ] },
      { kind: 'narration', lights: 'on', text: german('Kumar schaltet nur den Föhn aus und drückt den Schalter nach oben. Das Licht geht wieder an.') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Ja! Ich bin ein Elektriker! Dann mache ich schnell den Wasserkocher wieder an …') },
      { kind: 'narration', sfx: 'fuse', lights: 'off', text: german('Klick. Nach drei Sekunden ist es wieder dunkel.') },
      { kind: 'line', speaker: 'mia', mood: 'angry', text: german('Kumar! Okay, jetzt reicht es. Ich rufe den Handwerker an. Robert hat letztes Jahr auch unsere Heizung repariert.') },
      { kind: 'line', speaker: 'mia', text: german('Hallo Robert, hier ist Mia. Entschuldige die späte Störung. Bei uns fliegt in der Küche immer wieder die Sicherung raus. Kannst du heute noch vorbeikommen?') },
      { kind: 'narration', text: german('Robert sagt, er kann um halb neun da sein. Der Notdienst am Abend kostet 60 Euro Anfahrt und 45 Euro pro Stunde. Mia seufzt und sagt ja.') },
      { kind: 'narration', sfx: 'knock', enters: ['robert'], text: german('Um 20:35 Uhr klopft es. Robert steht mit seiner Werkzeugtasche und einer großen Stirnlampe vor der Tür.') },
      { kind: 'line', speaker: 'robert', text: german('’n Abend. Wo ist der Kasten? … Aha. Was lief alles, als es geknallt hat?') },
      { kind: 'line', speaker: 'kumar', mood: 'sad', text: german('Der Wasserkocher, die Mikrowelle, die Waschmaschine und der Föhn. Leider alles gleichzeitig.') },
      { kind: 'line', speaker: 'robert', text: german('Na also. Alles auf einem Stromkreis. Eine Sicherung hat 16 Ampere, das sind höchstens 3 600 Watt. Wasserkocher 2 000, Waschmaschine beim Heizen auch 2 000, Mikrowelle 900. Zu viel. Die Sicherung macht genau, was sie soll: Sie schützt die Kabel, damit nichts brennt.') },
      { kind: 'narration', lights: 'on', text: german('Robert zieht den Stecker der Waschmaschine, drückt den Schalter nach oben, und das Licht bleibt an. Er schreibt eine Rechnung über 82,50 Euro.') },
      { kind: 'line', speaker: 'robert', text: german('Waschmaschine nur, wenn in der Küche nichts Großes läuft. Oder ich lege euch einen eigenen Stromkreis fürs Bad. Kostet aber. Überlegt’s euch.') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Danke, Robert! Möchtest du ein bisschen Curry? Es ist jetzt kalt, aber die Mikrowelle … ach nein, lieber nicht.') },
      { kind: 'question', prompt: german('Welche Geräte liefen, als die Sicherung rausflog?'), options: [german('Wasserkocher, Mikrowelle, Waschmaschine und Föhn'), german('Nur der Fernseher und der Computer'), german('Der Kühlschrank und der Herd')] },
      { kind: 'question', prompt: german('Woran erkennt Mia, dass es kein Stromausfall in der ganzen Stadt ist?'), options: [german('Bei den Nachbarn gegenüber brennt Licht.'), german('Das Radio meldet es nicht.'), german('Ihr Handy funktioniert noch.')] },
      { kind: 'question', prompt: german('Welche Farbe haben die Schalter im Sicherungskasten?'), options: [german('Schwarz'), german('Rot'), german('Grau')] },
      { kind: 'question', prompt: german('Warum fliegt die Sicherung beim zweiten Mal wieder raus?'), options: [german('Weil Kumar den Wasserkocher wieder anmacht'), german('Weil Mia den Föhn anmacht'), german('Weil Robert am Kasten arbeitet')] },
      { kind: 'question', prompt: german('Wie viel Watt hält eine Sicherung mit 16 Ampere laut Robert höchstens aus?'), options: [german('3 600 Watt'), german('900 Watt'), german('16 000 Watt')] },
      { kind: 'question', prompt: german('Wozu ist die Sicherung laut Robert da?'), options: [german('Sie schützt die Kabel, damit nichts brennt.'), german('Sie spart Strom in der Nacht.'), german('Sie macht das Licht heller.')] },
      { kind: 'question', prompt: german('Wann kommt Robert an?'), options: [german('Um 20:35 Uhr'), german('Um 19:45 Uhr'), german('Um 22:00 Uhr')] }
    ]
  },
  {
    id: 'a2-forest',
    level: 'a2',
    scene: 'forest',
    cast: ['leo', 'bello', 'bird', 'deer', 'fox'],
    languages: ['de'],
    weathers: ['sunny', 'cloudy'],
    title: german('Psst! Ein Morgen im Wald'),
    beats: [
      { kind: 'narration', text: german('Es ist halb sechs am Morgen. Leo geht mit Bello und dir in den Wald. Es ist noch kühl, und über dem Weg liegt weißer Nebel.') },
      { kind: 'narration', enters: ['bird'], sfx: 'tweet', text: german('In den Bäumen singen schon die ersten Vögel.') },
      { kind: 'line', speaker: 'bird', mood: 'happy', text: german('Piep, piep, piep!') },
      { kind: 'line', speaker: 'leo', text: german('Hörst du das, {name}? Die Vögel singen jeden Morgen um diese Zeit. So sagen sie: Das ist mein Baum!') },
      { kind: 'line', speaker: 'bello', mood: 'happy', text: german('Wuff! Wuff!') },
      { kind: 'line', speaker: 'leo', mood: 'worried', text: german('Psst, Bello! Leise! Wenn wir laut sind, sehen wir heute kein einziges Tier.') },
      { kind: 'narration', enters: ['deer'], faces: { deer: 'curious' }, text: german('Plötzlich steht zwischen den Bäumen ein Reh. Es ist braun und hat große, dunkle Augen.') },
      { kind: 'line', speaker: 'leo', mood: 'curious', text: german('Psst … Ganz leise, {name}. Was machen wir jetzt?') },
      { kind: 'reply', to: 'leo', options: [
        german('Wir bleiben ganz still stehen und schauen nur.'),
        german('Wir rufen laut Hallo!'),
        german('Wir werfen Bello einen Ball zu.')
      ] },
      { kind: 'narration', exits: ['deer'], text: german('Ihr bleibt still stehen. Das Reh frisst ein paar grüne Blätter, dann springt es mit drei großen Sprüngen davon.') },
      { kind: 'line', speaker: 'bello', mood: 'sad', text: german('Wuff …') },
      { kind: 'narration', enters: ['fox'], faces: { fox: 'curious' }, text: german('Fünf Minuten später kommt ein Fuchs aus dem Gebüsch. Sein Fell ist orange, und sein Schwanz hat eine weiße Spitze.') },
      { kind: 'line', speaker: 'leo', mood: 'surprised', text: german('Ein Fuchs! Den sieht man fast nur ganz früh am Morgen oder am Abend.') },
      { kind: 'line', speaker: 'bello', mood: 'surprised', text: german('Wuff! Wuff! Wuff!') },
      { kind: 'narration', exits: ['fox'], text: german('Der Fuchs schaut euch eine Sekunde lang an – und weg ist er.') },
      { kind: 'line', speaker: 'leo', mood: 'laughing', text: german('Ach, Bello! Psst heißt leise, nicht dreimal bellen. Aber egal: zwei wilde Tiere vor sieben Uhr – was für ein Morgen!') },
      { kind: 'question', prompt: german('Um wie viel Uhr geht ihr in den Wald?'), options: [german('Um halb sechs'), german('Um halb zehn'), german('Um sechs Uhr abends')] },
      { kind: 'question', prompt: german('Welche Farbe hat der Nebel?'), options: [german('Weiß'), german('Grün'), german('Schwarz')] },
      { kind: 'question', prompt: german('Warum soll Bello leise sein?'), options: [german('Sonst sehen sie keine Tiere.'), german('Sonst wachen die Nachbarn auf.'), german('Sonst wird Leo müde.')] },
      { kind: 'question', prompt: german('Wie viele Sprünge braucht das Reh?'), options: [german('Drei'), german('Zehn'), german('Einen')] },
      { kind: 'question', prompt: german('Woran erkennt man den Fuchs?'), options: [german('Am orangen Fell und an der weißen Schwanzspitze'), german('An den langen grauen Ohren'), german('An den schwarzen Streifen')] },
      { kind: 'question', prompt: german('Wann sieht man Füchse am ehesten?'), options: [german('Ganz früh am Morgen oder am Abend'), german('Mittags um zwölf'), german('Nur im Winter')] },
      { kind: 'question', prompt: german('Warum ist der Fuchs so schnell weg?'), options: [german('Weil Bello bellt'), german('Weil es regnet'), german('Weil Leo singt')] }
    ]
  },
  {
    id: 'a2-alps',
    level: 'b1',
    scene: 'alps',
    cast: ['mia', 'fritz', 'cow'],
    languages: ['de'],
    weathers: ['sunny', 'cloudy'],
    title: german('Auf der Alm'),
    beats: [
      { kind: 'narration', text: german('Es ist ein Tag im Juni. Mia wandert mit dir in den Alpen. Um sieben Uhr morgens seid ihr losgegangen, jetzt seid ihr schon auf tausendachthundert Metern Höhe.') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Schau mal, {name}! Da oben ist die Alm von Bauer Fritz – die braune Hütte mit den roten Blumen.') },
      { kind: 'narration', enters: ['fritz'], text: german('Vor der Hütte sitzt Bauer Fritz auf einer Bank und schneidet Käse.') },
      { kind: 'line', speaker: 'fritz', mood: 'happy', text: german('Grüß Gott, ihr zwei! Ihr kommt genau richtig zur Brotzeit. Im Sommer wohne ich hier oben mit meinen zwölf Kühen.') },
      { kind: 'narration', enters: ['cow'], sfx: 'moo', text: german('Eine schwarz-weiße Kuh mit einer großen goldenen Glocke kommt langsam näher.') },
      { kind: 'line', speaker: 'fritz', text: german('Das ist Berta, meine Lieblingskuh. Sie gibt jeden Tag zwanzig Liter Milch.') },
      { kind: 'line', speaker: 'cow', mood: 'happy', text: german('Muh!') },
      { kind: 'line', speaker: 'fritz', mood: 'curious', text: german('{name}, magst du ein Stück Bergkäse? Der ist aus Bertas Milch.') },
      { kind: 'reply', to: 'fritz', options: [
        german('Ja, gern! Er riecht sehr gut.'),
        german('Nein danke, ich trinke lieber Käse.'),
        german('Ich bin eine Kuh.')
      ] },
      { kind: 'narration', prop: 'eagle', text: german('Plötzlich zeigt Mia nach oben. Hoch über dem Gipfel kreist ein großer brauner Vogel.') },
      { kind: 'line', speaker: 'mia', mood: 'surprised', text: german('Schau mal! Ist das ein Adler?') },
      { kind: 'line', speaker: 'fritz', text: german('Ja, das ist ein Steinadler. Er wohnt hier schon seit Jahren. Seine Flügel sind über zwei Meter breit – von einer Spitze bis zur anderen.') },
      { kind: 'line', speaker: 'fritz', mood: 'curious', text: german('Und was glaubst du, {name}: Wo baut der Adler sein Nest?') },
      { kind: 'reply', to: 'fritz', options: [
        german('Hoch oben in einer Felswand.'),
        german('Unten im Kuhstall bei Berta.'),
        german('Im Kühlschrank von Fritz.')
      ] },
      { kind: 'line', speaker: 'fritz', mood: 'happy', text: german('Genau! Das Nest heißt Horst. Es kann bis zu zwei Meter breit werden – so groß wie ein Bett.') },
      { kind: 'line', speaker: 'cow', mood: 'worried', text: german('Muh …') },
      { kind: 'line', speaker: 'fritz', mood: 'laughing', text: german('Haha, keine Angst, Berta. Für den Adler bist du viel zu schwer.') },
      { kind: 'line', speaker: 'mia', mood: 'curious', text: german('Wie lange bleiben die Kühe hier oben?') },
      { kind: 'line', speaker: 'fritz', text: german('Von Juni bis September, ungefähr hundert Tage. Im Herbst gehen wir alle zusammen ins Tal, und die Kühe tragen bunte Blumen auf dem Kopf. Das ist der Almabtrieb.') },
      { kind: 'narration', text: german('Am Nachmittag ziehen über dem Gipfel dunkle Wolken auf.') },
      { kind: 'line', speaker: 'fritz', mood: 'worried', text: german('Oha. Um drei Uhr kommt ein Gewitter, das spüre ich in meinem Knie. Ihr solltet um zwei wieder unten im Tal sein.') },
      { kind: 'line', speaker: 'mia', text: german('Dann gehen wir gleich los. Danke für den Käse, Fritz – und tschüss, Berta!') },
      { kind: 'line', speaker: 'cow', mood: 'happy', text: german('Muh!') },
      { kind: 'question', prompt: german('Um wie viel Uhr seid ihr losgegangen?'), options: [german('Um sieben Uhr morgens'), german('Um zwölf Uhr mittags'), german('Um drei Uhr nachmittags')] },
      { kind: 'question', prompt: german('Wie viele Kühe hat Bauer Fritz?'), options: [german('Zwölf'), german('Zwei'), german('Zwanzig')] },
      { kind: 'question', prompt: german('Welche Farbe haben die Blumen an der Hütte?'), options: [german('Rot'), german('Blau'), german('Gelb')] },
      { kind: 'question', prompt: german('Wie viel Milch gibt Berta jeden Tag?'), options: [german('Zwanzig Liter'), german('Zwei Liter'), german('Hundert Liter')] },
      { kind: 'question', prompt: german('Wie breit sind die Flügel des Steinadlers?'), options: [german('Über zwei Meter'), german('Zwanzig Zentimeter'), german('Zehn Meter')] },
      { kind: 'question', prompt: german('Wo baut der Adler sein Nest?'), options: [german('Hoch oben in einer Felswand'), german('Im Kuhstall'), german('Auf dem Dach der Hütte')] },
      { kind: 'question', prompt: german('Wie lange bleiben die Kühe auf der Alm?'), options: [german('Von Juni bis September'), german('Das ganze Jahr'), german('Nur im Winter')] },
      { kind: 'question', prompt: german('Um wie viel Uhr kommt laut Fritz das Gewitter?'), options: [german('Um drei Uhr'), german('Um sieben Uhr'), german('Um Mitternacht')] }
    ]
  },
  {
    id: 'b1-neuschwanstein',
    level: 'b1',
    scene: 'castle',
    cast: ['oma', 'leo', 'ludwig'],
    languages: ['de'],
    title: german('Beim Märchenkönig'),
    beats: [
      { kind: 'narration', text: german('Oma wollte schon immer einmal nach Neuschwanstein. Heute fährt Leo mit ihr und mit dir ins Allgäu. Schon vom Parkplatz aus sieht man das weiße Schloss mit seinen blauen Türmen über dem Wald.') },
      { kind: 'line', speaker: 'oma', mood: 'happy', text: german('Wie im Märchen! Wusstet ihr, dass Walt Disney sein Dornröschenschloss nach diesem Vorbild gebaut hat?') },
      { kind: 'line', speaker: 'leo', text: german('Unsere Führung beginnt um halb drei. Wir haben also noch eine halbe Stunde für den Weg nach oben.') },
      { kind: 'narration', enters: ['ludwig'], text: german('Am Eingang wartet ein großer Mann mit Krone, dunkelblauem Mantel und Schnurrbart. Er verbeugt sich tief.') },
      { kind: 'line', speaker: 'ludwig', text: german('Willkommen in meinem Schloss! Ich bin Ludwig der Zweite, König von Bayern. Na ja – eigentlich bin ich Schlossführer, aber auf meinen Führungen spiele ich den König.') },
      { kind: 'line', speaker: 'oma', mood: 'laughing', text: german('Hihi, Majestät, Sie sehen sehr echt aus!') },
      { kind: 'line', speaker: 'ludwig', mood: 'happy', text: german('Danke, gnädige Frau. Mit dem Bau habe ich 1869 begonnen. Fertig wurde das Schloss nie, und gewohnt habe ich hier nur 172 Tage.') },
      { kind: 'line', speaker: 'leo', mood: 'curious', text: german('Warum hat er – also, warum haben Sie das Schloss überhaupt gebaut?') },
      { kind: 'line', speaker: 'ludwig', text: german('Ich liebte die Opern von Richard Wagner. Ich wollte mir eine Welt aus Sagen und Rittern bauen, weit weg von der Politik in München. Meine Minister fanden das allerdings viel zu teuer.') },
      { kind: 'line', speaker: 'ludwig', mood: 'curious', text: german('Und Sie, {name}? Was hätten Sie an meiner Stelle mit so viel Geld gemacht?') },
      { kind: 'reply', to: 'ludwig', options: [
        german('Ich hätte vielleicht ein kleineres Schloss gebaut und den Rest gespart.'),
        german('Ich hätte die Alpen gekauft und sie nach Berlin gebracht.'),
        german('Ich hätte ein Schloss aus Käse gebaut, damit man es essen kann.')
      ] },
      { kind: 'line', speaker: 'ludwig', mood: 'laughing', text: german('Weise gesprochen! Meine Minister hätten Sie geliebt.') },
      { kind: 'narration', text: german('Im Sängersaal bleibt Oma lange stehen. An den Wänden hängen Bilder aus der Sage von Parzival, und durch die Fenster sieht man tief unten den blauen Alpsee.') },
      { kind: 'line', speaker: 'oma', mood: 'curious', text: german('Und wie ist Ihre Geschichte ausgegangen, Majestät?') },
      { kind: 'line', speaker: 'ludwig', mood: 'sad', text: german('Leider traurig. 1886 hat man mich für verrückt erklärt, und wenige Tage später fand man mich tot im Starnberger See. Was genau passiert ist, weiß bis heute niemand.') },
      { kind: 'line', speaker: 'leo', text: german('Ein echtes Rätsel. Kein Wunder, dass ihn die Leute bis heute den Märchenkönig nennen.') },
      { kind: 'question', prompt: german('Welches berühmte Schloss hatte Neuschwanstein als Vorbild?'), options: [german('Das Dornröschenschloss von Walt Disney'), german('Das Schloss Versailles'), german('Der Buckingham-Palast')] },
      { kind: 'question', prompt: german('Wann beginnt die Führung?'), options: [german('Um halb drei'), german('Um zwölf Uhr'), german('Um halb neun')] },
      { kind: 'question', prompt: german('Wer ist der Mann mit der Krone wirklich?'), options: [german('Ein Schlossführer im Kostüm'), german('Ein echter König'), german('Ein Opernsänger')] },
      { kind: 'question', prompt: german('Wie viele Tage hat Ludwig im Schloss gewohnt?'), options: [german('172'), german('1869'), german('17')] },
      { kind: 'question', prompt: german('Warum hat Ludwig das Schloss gebaut?'), options: [german('Er liebte Wagners Opern und alte Sagen.'), german('Er brauchte mehr Platz für seine Familie.'), german('Er wollte dort ein Hotel eröffnen.')] },
      { kind: 'question', prompt: german('Was sieht man durch die Fenster des Sängersaals?'), options: [german('Den blauen Alpsee'), german('Das Meer'), german('Die Stadt München')] },
      { kind: 'question', prompt: german('Warum nennt man Ludwig den Märchenkönig?'), options: [german('Wegen seiner Schlösser und seines rätselhaften Todes'), german('Weil er Märchenbücher geschrieben hat'), german('Weil er nie gelebt hat')] }
    ]
  },
  {
    id: 'a2-lindau',
    level: 'a2',
    scene: 'lindau',
    cast: ['kim', 'mia'],
    languages: ['de'],
    weathers: ['sunny', 'cloudy'],
    title: german('Am Hafen von Lindau'),
    beats: [
      { kind: 'narration', text: german('Samstagmorgen, halb zehn, in Lindau am Bodensee. Kim und Mia stehen mit dir am Hafen. Das Wasser ist hellblau, und am anderen Ufer sieht man die Berge der Schweiz und Österreichs.') },
      { kind: 'line', speaker: 'kim', mood: 'happy', text: german('Schau mal, {name}: Links an der Hafeneinfahrt sitzt der bayerische Löwe. Er ist sechs Meter groß und aus Stein.') },
      { kind: 'line', speaker: 'mia', text: german('Und rechts steht der Leuchtturm. Er ist dreiunddreißig Meter hoch und hat sogar eine Uhr.') },
      { kind: 'line', speaker: 'kim', mood: 'curious', text: german('Wusstest du, dass der Bodensee an drei Länder grenzt? An Deutschland, Österreich und die Schweiz.') },
      { kind: 'line', speaker: 'mia', text: german('Um zehn Uhr fährt unser Schiff zur Insel Mainau. Die Fahrt dauert fast drei Stunden.') },
      { kind: 'narration', text: german('Das weiße Schiff liegt schon am Steg. Es hat einen roten Schornstein und einen blauen Streifen.') },
      { kind: 'line', speaker: 'kim', mood: 'curious', text: german('{name}, möchtest du lieber drinnen sitzen oder oben an Deck?') },
      { kind: 'reply', to: 'kim', options: [
        german('Oben an Deck, da ist die Aussicht schöner.'),
        german('Im Wasser neben dem Schiff.'),
        german('Oben im Leuchtturm, bitte.')
      ] },
      { kind: 'narration', text: german('Auf dem Deck weht ein kühler Wind. Mia kauft drei Becher heiße Schokolade für je drei Euro fünfzig.') },
      { kind: 'line', speaker: 'mia', mood: 'laughing', text: german('Das macht zehn Euro fünfzig. Dafür ist die Aussicht gratis!') },
      { kind: 'narration', text: german('Pünktlich um zehn Uhr legt das Schiff ab. Der Löwe und der Leuchtturm werden langsam immer kleiner.') },
      { kind: 'line', speaker: 'kim', mood: 'happy', text: german('Tschüss, Lindau! Hallo, Mainau!') },
      { kind: 'question', prompt: german('Um wie viel Uhr seid ihr am Hafen?'), options: [german('Um halb zehn'), german('Um halb drei'), german('Um Mitternacht')] },
      { kind: 'question', prompt: german('Wie groß ist der Löwe?'), options: [german('Sechs Meter'), german('Sechzig Zentimeter'), german('Sechzig Meter')] },
      { kind: 'question', prompt: german('Wie hoch ist der Leuchtturm?'), options: [german('Dreiunddreißig Meter'), german('Dreizehn Meter'), german('Dreihundert Meter')] },
      { kind: 'question', prompt: german('An wie viele Länder grenzt der Bodensee?'), options: [german('An drei'), german('An zwei'), german('An fünf')] },
      { kind: 'question', prompt: german('Welche Farbe hat der Schornstein des Schiffs?'), options: [german('Rot'), german('Blau'), german('Gelb')] },
      { kind: 'question', prompt: german('Wie viel kosten die drei heißen Schokoladen zusammen?'), options: [german('Zehn Euro fünfzig'), german('Drei Euro fünfzig'), german('Zwanzig Euro')] },
      { kind: 'question', prompt: german('Wohin fährt das Schiff?'), options: [german('Zur Insel Mainau'), german('Nach München'), german('In die Schweizer Berge')] }
    ]
  },
  {
    id: 'a2-mainau',
    level: 'a2',
    scene: 'mainau',
    cast: ['kim', 'mia'],
    languages: ['de'],
    weathers: ['sunny', 'cloudy'],
    title: german('Die Blumeninsel Mainau'),
    beats: [
      { kind: 'narration', text: german('Kurz vor ein Uhr legt euer Schiff an der Insel Mainau an. Schon vom Steg aus riecht es nach Blumen.') },
      { kind: 'line', speaker: 'kim', mood: 'surprised', text: german('Wow! So viele Farben habe ich noch nie auf einmal gesehen!') },
      { kind: 'narration', text: german('Überall blühen rote Rosen, orange Dahlien und lila Lavendel. Zwischen den Beeten stehen hohe Palmen.') },
      { kind: 'line', speaker: 'mia', text: german('Auf der Mainau wachsen über tausend verschiedene Rosensorten. Und im Frühling blühen hier über eine Million Tulpen.') },
      { kind: 'line', speaker: 'kim', mood: 'curious', text: german('Und wem gehört die Insel?') },
      { kind: 'line', speaker: 'mia', text: german('Seit 1932 kümmert sich die Familie Bernadotte um die Insel. Das gelbe Barockschloss mit dem dunklen Dach ist fast dreihundert Jahre alt.') },
      { kind: 'line', speaker: 'kim', mood: 'curious', text: german('{name}, welche Blumen gefallen dir am besten?') },
      { kind: 'reply', to: 'kim', options: [
        german('Die orangen Dahlien – manche sind so groß wie ein Teller!'),
        german('Die Plastikblumen aus dem Supermarkt.'),
        german('Ich mag gar keine Farben.')
      ] },
      { kind: 'line', speaker: 'kim', mood: 'happy', text: german('Mir gefallen die Rosen am besten. Ich mache gleich hundert Fotos.') },
      { kind: 'narration', text: german('Später setzt ihr euch auf eine Bank und esst ein Eis. Mia schaut auf die Uhr.') },
      { kind: 'line', speaker: 'mia', text: german('Um halb fünf fährt unser Schiff zurück nach Lindau. Wir haben also noch dreieinhalb Stunden Zeit.') },
      { kind: 'line', speaker: 'kim', mood: 'laughing', text: german('Haha, dreieinhalb Stunden für eine Million Blumen? Das wird knapp!') },
      { kind: 'question', prompt: german('Wann legt das Schiff an der Mainau an?'), options: [german('Kurz vor ein Uhr'), german('Um zehn Uhr'), german('Um halb fünf')] },
      { kind: 'question', prompt: german('Welche Farbe haben die Dahlien?'), options: [german('Orange'), german('Blau'), german('Weiß')] },
      { kind: 'question', prompt: german('Wie viele Rosensorten wachsen auf der Mainau?'), options: [german('Über tausend'), german('Zehn'), german('Genau hundert')] },
      { kind: 'question', prompt: german('Wie viele Tulpen blühen dort im Frühling?'), options: [german('Über eine Million'), german('Hundert'), german('Tausend')] },
      { kind: 'question', prompt: german('Welche Farbe hat das Schloss?'), options: [german('Gelb'), german('Weiß'), german('Grün')] },
      { kind: 'question', prompt: german('Wie alt ist das Schloss ungefähr?'), options: [german('Fast dreihundert Jahre'), german('Dreißig Jahre'), german('Tausend Jahre')] },
      { kind: 'question', prompt: german('Wann fährt das Schiff zurück nach Lindau?'), options: [german('Um halb fünf'), german('Um ein Uhr'), german('Um Mitternacht')] }
    ]
  },
  {
    id: 'b1-ruegen',
    level: 'b1',
    scene: 'cliffs',
    cast: ['mia', 'tobias', 'seagull'],
    languages: ['de'],
    weathers: ['sunny', 'cloudy'],
    title: german('Kreidefelsen und Fischbrötchen'),
    beats: [
      { kind: 'narration', sfx: 'waves', text: german('Mia macht mit dir Urlaub auf Rügen, der größten Insel Deutschlands. Vom Königsstuhl aus schaut ihr auf die weißen Kreidefelsen und das türkisblaue Meer.') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Der Königsstuhl ist hundertachtzehn Meter hoch. Caspar David Friedrich hat diese Felsen schon vor über zweihundert Jahren gemalt.') },
      { kind: 'narration', enters: ['tobias'], text: german('Unten am Strand winkt euch ein Rettungsschwimmer zu. Es ist Tobias, der hier den ganzen Sommer über arbeitet.') },
      { kind: 'line', speaker: 'tobias', mood: 'happy', text: german('Moin, ihr zwei! Seid ihr die ganzen Stufen runtergekommen? Über vierhundert Stück – starkes Beintraining! Und wer Treppen läuft, braucht Protein. Das beste Protein gibt es da vorne am Kiosk.') },
      { kind: 'line', speaker: 'mia', mood: 'laughing', text: german('Haha, du meinst Fischbrötchen?') },
      { kind: 'line', speaker: 'tobias', text: german('Genau! Mit Bismarckhering, Zwiebeln und Gurke. Ein gutes Fischbrötchen hat mehr Protein als mancher Shake, und schmecken tut es auch noch.') },
      { kind: 'line', speaker: 'tobias', mood: 'curious', text: german('{name}, welches nimmst du?') },
      { kind: 'reply', to: 'tobias', options: [
        german('Eins mit Matjes, bitte – aber ohne Zwiebeln.'),
        german('Eins mit Schokolade und Sahne, bitte.'),
        german('Ich nehme lieber ein Stück vom Kreidefelsen.')
      ] },
      { kind: 'narration', enters: ['seagull'], faces: { seagull: 'curious' }, text: german('Ihr setzt euch auf einen großen Stein. Gerade als Mia abbeißen will, landet eine große Möwe direkt neben ihr.') },
      { kind: 'line', speaker: 'seagull', mood: 'curious', text: german('Kiau! Kiau!') },
      { kind: 'line', speaker: 'tobias', mood: 'worried', text: german('Vorsicht, Mia! Die Möwen hier sind echte Profis. Halt dein Brötchen gut fest!') },
      { kind: 'narration', exits: ['seagull'], text: german('Zu spät: Mit einem schnellen Sprung schnappt sich die Möwe die Hälfte von Mias Fischbrötchen und fliegt damit über die Klippen davon.') },
      { kind: 'line', speaker: 'mia', mood: 'surprised', text: german('Hey! Das war mein Hering!') },
      { kind: 'line', speaker: 'tobias', mood: 'laughing', text: german('Haha, die hat bessere Reflexe als ich. Komm, ich lade dich auf ein neues ein. Aber diesmal essen wir hinter dem Kiosk, wo die Möwen uns nicht sehen.') },
      { kind: 'question', prompt: german('Was ist Rügen?'), options: [german('Die größte Insel Deutschlands'), german('Ein Berg in den Alpen'), german('Ein See in Bayern')] },
      { kind: 'question', prompt: german('Wie hoch ist der Königsstuhl?'), options: [german('Hundertachtzehn Meter'), german('Achtzehn Meter'), german('Elfhundert Meter')] },
      { kind: 'question', prompt: german('Welche Farbe haben die Felsen?'), options: [german('Weiß'), german('Rot'), german('Schwarz')] },
      { kind: 'question', prompt: german('Wer hat die Felsen vor über zweihundert Jahren gemalt?'), options: [german('Caspar David Friedrich'), german('Tobias'), german('Albrecht Dürer')] },
      { kind: 'question', prompt: german('Warum empfiehlt Tobias Fischbrötchen?'), options: [german('Wegen des vielen Proteins'), german('Weil sie sehr billig sind'), german('Weil er im Kiosk arbeitet')] },
      { kind: 'question', prompt: german('Was macht die Möwe?'), options: [german('Sie klaut ein halbes Fischbrötchen.'), german('Sie singt ein Lied.'), german('Sie setzt sich auf Tobias’ Kopf.')] },
      { kind: 'question', prompt: german('Wo wollen sie das nächste Fischbrötchen essen?'), options: [german('Hinter dem Kiosk'), german('Oben auf dem Felsen'), german('Im Wasser')] }
    ]
  },
  {
    id: 'b1-berlin',
    level: 'b1',
    scene: 'berlin',
    cast: ['albert', 'kumar'],
    languages: ['de'],
    title: german('Berlin mit Albert'),
    beats: [
      { kind: 'narration', text: german('Kumar ist zum ersten Mal in Berlin. Albert, der hier geboren ist, hat ihm und dir eine Stadtführung versprochen – Treffpunkt um neun Uhr am Brandenburger Tor.') },
      { kind: 'line', speaker: 'albert', text: german('Guten Morgen, {name}. Es ist neun Uhr und zwölf Sekunden. Und von Kumar fehlt jede Spur.') },
      { kind: 'narration', enters: ['kumar'], text: german('Um zwölf nach neun kommt Kumar angerannt, mit einem Kaffee in der Hand und ganz außer Atem.') },
      { kind: 'line', speaker: 'kumar', mood: 'worried', text: german('Entschuldigung! Ich bin mit der U-Bahn in die falsche Richtung gefahren. Zweimal.') },
      { kind: 'line', speaker: 'albert', text: german('Nun gut. Willkommen in Berlin. Das Brandenburger Tor wurde 1791 fertiggestellt. Oben steht die Quadriga: eine Göttin auf einem Wagen mit vier Pferden. Fast dreißig Jahre lang stand das Tor direkt an der Mauer.') },
      { kind: 'line', speaker: 'kumar', mood: 'curious', text: german('Die Mauer? Und wo ist sie jetzt?') },
      { kind: 'line', speaker: 'albert', text: german('Größtenteils abgerissen, seit 1989. Das längste Stück steht noch an der Spree: die East Side Gallery, über einen Kilometer lang und ganz bunt bemalt.') },
      { kind: 'narration', text: german('Mittags stehen die drei vor einer Currywurstbude am Alexanderplatz. Über ihnen ragt der Fernsehturm in den Himmel: dreihundertachtundsechzig Meter hoch, das höchste Bauwerk Deutschlands.') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Currywurst! Endlich etwas mit Curry. {name}, nimmst du deine mit oder ohne Darm?') },
      { kind: 'reply', to: 'kumar', options: [
        german('Ohne Darm, bitte, und dazu Pommes.'),
        german('Mit Darm, aber bitte ohne Wurst.'),
        german('Ich nehme lieber den Fernsehturm, bitte.')
      ] },
      { kind: 'line', speaker: 'kumar', mood: 'laughing', text: german('Hm … lecker! Aber in Indien wäre das eine sehr milde Soße. Ist das wirklich Curry?') },
      { kind: 'line', speaker: 'albert', text: german('Det is Berliner Curry. Darüber wird nicht diskutiert.') },
      { kind: 'narration', text: german('Am Abend fahrt ihr auf die gläserne Kuppel des Reichstags. Von oben seht ihr die ganze Stadt im goldenen Licht, und Kumar macht ungefähr zweihundert Fotos.') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Danke, Albert! Und morgen bin ich pünktlich. Versprochen!') },
      { kind: 'line', speaker: 'albert', text: german('Das glaube ich, wenn ich es sehe. Treffpunkt neun Uhr. Neun Uhr null null.') },
      { kind: 'question', prompt: german('Um wie viel Uhr ist der Treffpunkt?'), options: [german('Um neun Uhr'), german('Um zwölf Uhr'), german('Um halb zehn')] },
      { kind: 'question', prompt: german('Warum kommt Kumar zu spät?'), options: [german('Er ist zweimal in die falsche Richtung gefahren.'), german('Er hat verschlafen.'), german('Er hat seinen Kaffee verloren.')] },
      { kind: 'question', prompt: german('Was steht oben auf dem Brandenburger Tor?'), options: [german('Eine Göttin auf einem Wagen mit vier Pferden'), german('Ein großer Bär'), german('Eine Uhr')] },
      { kind: 'question', prompt: german('Was ist die East Side Gallery?'), options: [german('Das längste erhaltene Stück der Mauer'), german('Ein Museum für Currywurst'), german('Ein großes Kaufhaus')] },
      { kind: 'question', prompt: german('Wie hoch ist der Fernsehturm?'), options: [german('Dreihundertachtundsechzig Meter'), german('Achtunddreißig Meter'), german('Tausend Meter')] },
      { kind: 'question', prompt: german('Wie findet Kumar die Currysoße?'), options: [german('Lecker, aber sehr mild'), german('Viel zu scharf'), german('Zu süß')] },
      { kind: 'question', prompt: german('Wo sind sie am Abend?'), options: [german('Auf der Kuppel des Reichstags'), german('Auf dem Fernsehturm'), german('An der Spree beim Baden')] }
    ]
  },
  {
    id: 'a2-hamburg',
    level: 'a2',
    scene: 'hamburg',
    cast: ['tom', 'simon'],
    languages: ['de'],
    title: german('Ein Tag in Hamburg'),
    beats: [
      { kind: 'narration', text: german('Sonntag, fünf Uhr morgens in Hamburg. Tom und Simon sind mit dir auf dem Fischmarkt. Es ist noch dunkel, aber überall rufen die Händler laut.') },
      { kind: 'line', speaker: 'simon', mood: 'happy', text: german('Moin, {name}! Um fünf is dat hier schon proppenvoll. Wir schnacken gleich, erst mal brauch ich Kaffee.') },
      { kind: 'line', speaker: 'tom', mood: 'laughing', text: german('Simon sagt immer Moin – morgens, mittags und abends. Das ist typisch für Hamburg und Norddeutschland.') },
      { kind: 'line', speaker: 'tom', mood: 'happy', text: german('Hier ist jeden Sonntag Markt, von fünf bis halb zehn. Hör mal, der Obsthändler ruft: „Ein ganzer Korb Bananen für zehn Euro!“') },
      { kind: 'line', speaker: 'tom', mood: 'curious', text: german('{name}, was kaufen wir zum Frühstück?') },
      { kind: 'reply', to: 'tom', options: [
        german('Drei Fischbrötchen und drei heiße Kaffee.'),
        german('Einen Kran und zwei Schiffe.'),
        german('Ich kaufe den ganzen Hafen.')
      ] },
      { kind: 'narration', text: german('Um neun Uhr geht ihr zur Elbphilharmonie. Unten steht ein altes Haus aus roten Ziegeln, oben ein Dach aus Glas, das aussieht wie Wellen.') },
      { kind: 'line', speaker: 'simon', mood: 'happy', text: german('Moin, Elphi! Na, is dat nich schön? Das Gebäude ist hundertzehn Meter hoch, und die Glasfassade hat über tausend einzelne Fenster. Jedes ist ’n büschen anders gebogen.') },
      { kind: 'line', speaker: 'tom', mood: 'laughing', text: german('Haha, Simon, du redest über Fenster wie andere Leute über Fußball.') },
      { kind: 'line', speaker: 'simon', text: german('Nö, Fenster sind spannender als Fußball. Und kiek mal da drüben: die großen roten Kräne. Hamburg hat den größten Hafen Deutschlands.') },
      { kind: 'narration', text: german('Mittags macht ihr eine Hafenrundfahrt. Das Boot fährt an roten, blauen und gelben Containern vorbei und durch die Speicherstadt mit ihren alten Backsteinhäusern. Die Fahrt dauert eine Stunde und kostet zwanzig Euro.') },
      { kind: 'line', speaker: 'tom', mood: 'curious', text: german('Und, {name}? Wie gefällt dir Hamburg?') },
      { kind: 'reply', to: 'tom', options: [
        german('Sehr gut! Besonders der Hafen und die Elbphilharmonie.'),
        german('Gar nicht, hier gibt es zu viel Wasser zum Trinken.'),
        german('Ich bin ein Container.')
      ] },
      { kind: 'line', speaker: 'simon', text: german('Dat freut mich. Und wenn’s regnet, sagen wir hier Schietwetter. Aber eigentlich gibt es kein schlechtes Wetter, nur falsche Kleidung.') },
      { kind: 'question', prompt: german('Wann sagt man in Hamburg „Moin“?'), options: [german('Morgens, mittags und abends'), german('Nur am frühen Morgen'), german('Nur am Sonntag')] },
      { kind: 'question', prompt: german('Was sagt man in Hamburg zu Regenwetter?'), options: [german('Schietwetter'), german('Sonnenwetter'), german('Fischwetter')] },
      { kind: 'question', prompt: german('Wann ist der Fischmarkt?'), options: [german('Jeden Sonntag von fünf bis halb zehn'), german('Jeden Montagabend'), german('Nur im Dezember')] },
      { kind: 'question', prompt: german('Wie viel kostet der Korb Bananen?'), options: [german('Zehn Euro'), german('Ein Euro'), german('Hundert Euro')] },
      { kind: 'question', prompt: german('Wie hoch ist die Elbphilharmonie?'), options: [german('Hundertzehn Meter'), german('Elf Meter'), german('Tausend Meter')] },
      { kind: 'question', prompt: german('Woraus ist der untere Teil der Elbphilharmonie?'), options: [german('Aus roten Ziegeln'), german('Aus Holz'), german('Aus Glas')] },
      { kind: 'question', prompt: german('Welche Farben haben die Container?'), options: [german('Rot, blau und gelb'), german('Nur weiß'), german('Schwarz und grün')] },
      { kind: 'question', prompt: german('Wie lange dauert die Hafenrundfahrt?'), options: [german('Eine Stunde'), german('Zehn Minuten'), german('Einen ganzen Tag')] },
      { kind: 'question', prompt: german('Worüber redet Simon so gern?'), options: [german('Über Fenster und Gebäude'), german('Über Fußball'), german('Über Fisch')] }
    ]
  },
  {
    id: 'a2-munich',
    level: 'b1',
    scene: 'munich',
    cast: ['hans', 'kim'],
    languages: ['de'],
    title: german('München mit Hans'),
    beats: [
      { kind: 'narration', text: german('Kim ist für ein Wochenende in München. Hans zeigt ihr und dir seine Stadt. Um Viertel vor elf steht ihr zu dritt auf dem Marienplatz.') },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('Servus, {name}! Gleich is elf, dann fangt des Glockenspiel o. Schaut’s nach oben, zum Rathausturm!') },
      { kind: 'narration', text: german('Pünktlich um elf Uhr beginnt die Musik. Im Turm tanzen bunte Figuren – rote, blaue und goldene. Das Spiel dauert ungefähr fünfzehn Minuten.') },
      { kind: 'line', speaker: 'kim', mood: 'happy', text: german('Wie schön! Und was sind die zwei Türme mit den grünen Kuppeln dort hinten?') },
      { kind: 'line', speaker: 'hans', text: german('Des is die Frauenkirche. Die Türm san neunundneunzig Meter hoch. In der Innenstadt soll koa Haus höher sein als die Frauenkirch.') },
      { kind: 'narration', text: german('Dann geht ihr zum Viktualienmarkt. Dort gibt es Obst, Käse, Blumen und an jeder Ecke Weißwürste.') },
      { kind: 'line', speaker: 'hans', mood: 'curious', text: german('Weißwürst gibt’s nur bis zwölf Uhr mittags, des is a Regel! {name}, magst a Weißwurst mit süßem Senf und a Brezn?') },
      { kind: 'reply', to: 'hans', options: [
        german('Ja, gern! Aber schnell, es ist schon Viertel vor zwölf.'),
        german('Nein, ich esse Weißwürste nur um Mitternacht.'),
        german('Ich hätte gern eine Weißwurst mit Schokolade.')
      ] },
      { kind: 'narration', text: german('Am Nachmittag geht ihr in den Englischen Garten. Am Eisbach stehen Surfer in schwarzen Anzügen und reiten auf einer Welle, mitten in der Stadt.') },
      { kind: 'line', speaker: 'kim', mood: 'surprised', text: german('Surfen in München? Das ist ja verrückt!') },
      { kind: 'line', speaker: 'hans', mood: 'laughing', text: german('Haha, freilich! Und danach gemma in an Biergarten. Mit oana Maß – des is a ganzer Liter Bier.') },
      { kind: 'line', speaker: 'kim', mood: 'laughing', text: german('Ein ganzer Liter? Für mich bitte eine kleine Apfelschorle, Hans.') },
      { kind: 'question', prompt: german('Um wie viel Uhr beginnt das Glockenspiel?'), options: [german('Um elf Uhr'), german('Um neun Uhr'), german('Um drei Uhr')] },
      { kind: 'question', prompt: german('Wie lange dauert das Glockenspiel?'), options: [german('Ungefähr fünfzehn Minuten'), german('Eine Stunde'), german('Zwei Minuten')] },
      { kind: 'question', prompt: german('Welche Farbe haben die Kuppeln der Frauenkirche?'), options: [german('Grün'), german('Rot'), german('Gelb')] },
      { kind: 'question', prompt: german('Wie hoch sind die Türme der Frauenkirche?'), options: [german('Neunundneunzig Meter'), german('Neunzehn Meter'), german('Neunhundert Meter')] },
      { kind: 'question', prompt: german('Bis wann isst man Weißwürste?'), options: [german('Bis zwölf Uhr mittags'), german('Bis Mitternacht'), german('Nur am Abend')] },
      { kind: 'question', prompt: german('Was machen die Leute am Eisbach?'), options: [german('Sie surfen.'), german('Sie fahren Ski.'), german('Sie spielen Fußball.')] },
      { kind: 'question', prompt: german('Wie viel Bier ist eine Maß?'), options: [german('Ein Liter'), german('Ein halber Liter'), german('Zwei Liter')] }
    ]
  },
  {
    id: 'b1-cologne',
    level: 'b1',
    scene: 'cologne',
    cast: ['leo', 'mia', 'crow'],
    languages: ['de'],
    title: german('Ein Tag in Köln'),
    beats: [
      { kind: 'narration', text: german('Leo und Mia zeigen dir Köln. Schon wenn ihr aus dem Hauptbahnhof kommt, steht ihr direkt vor dem Dom – zwei riesige dunkle Türme, die bis in die Wolken zu reichen scheinen.') },
      { kind: 'line', speaker: 'leo', mood: 'happy', text: german('Der Kölner Dom ist hundertsiebenundfünfzig Meter hoch. Gebaut hat man über sechshundert Jahre lang, von 1248 bis 1880.') },
      { kind: 'line', speaker: 'mia', text: german('Wer will, kann auf den Südturm steigen. Es sind genau fünfhundertdreiunddreißig Stufen – und es gibt keinen Aufzug.') },
      { kind: 'line', speaker: 'leo', mood: 'curious', text: german('{name}, schaffst du das?') },
      { kind: 'reply', to: 'leo', options: [
        german('Klar, aber oben brauche ich erst mal eine Pause.'),
        german('Nein, ich fahre lieber mit dem Fahrrad die Treppe hoch.'),
        german('Ich schwimme lieber durch den Rhein nach oben.')
      ] },
      { kind: 'narration', enters: ['crow'], faces: { crow: 'curious' }, text: german('Oben auf der Plattform weht ein kräftiger Wind. Auf dem Geländer sitzt eine große schwarze Krähe und schaut euch neugierig an.') },
      { kind: 'line', speaker: 'crow', mood: 'curious', text: german('Krah!') },
      { kind: 'line', speaker: 'mia', mood: 'laughing', text: german('Haha, sie sieht aus, als würde sie hier arbeiten. Bestimmt ist sie die Domführerin.') },
      { kind: 'line', speaker: 'leo', text: german('Krähen sind übrigens unglaublich klug. Sie erkennen Gesichter und merken sich, wer ihnen etwas zu essen gibt.') },
      { kind: 'line', speaker: 'crow', mood: 'happy', text: german('Krah! Krah!') },
      { kind: 'narration', exits: ['crow'], text: german('Dann breitet die Krähe ihre Flügel aus und segelt hinunter Richtung Rhein.') },
      { kind: 'narration', text: german('Am Nachmittag geht ihr über die Hohenzollernbrücke. Am Geländer hängen Hunderttausende bunte Liebesschlösser.') },
      { kind: 'line', speaker: 'leo', text: german('Paare schreiben ihre Namen auf ein Schloss, hängen es hier auf und werfen den Schlüssel in den Rhein. Inzwischen wiegen die Schlösser viele Tonnen.') },
      { kind: 'narration', text: german('Am Abend sitzt ihr in einem alten Brauhaus. Der Kellner – in Köln heißt er „Köbes“ – stellt euch ungefragt kleine Gläser Kölsch hin. In jedes passen nur 0,2 Liter.') },
      { kind: 'line', speaker: 'mia', text: german('Wichtig: Wenn du kein Kölsch mehr willst, legst du deinen Bierdeckel auf das Glas. Sonst bringt der Köbes einfach immer weiter neue.') },
      { kind: 'line', speaker: 'leo', mood: 'laughing', text: german('Das wusste ich bei meinem ersten Besuch nicht. Nach acht Gläsern habe ich es dann verstanden.') },
      { kind: 'question', prompt: german('Wie hoch ist der Kölner Dom?'), options: [german('Hundertsiebenundfünfzig Meter'), german('Siebenundfünfzig Meter'), german('Fünfhundertdreiunddreißig Meter')] },
      { kind: 'question', prompt: german('Wie lange hat man am Dom gebaut?'), options: [german('Über sechshundert Jahre'), german('Zehn Jahre'), german('Fünfzig Jahre')] },
      { kind: 'question', prompt: german('Wie viele Stufen hat der Südturm?'), options: [german('Fünfhundertdreiunddreißig'), german('Hundertsiebenundfünfzig'), german('Achtundvierzig')] },
      { kind: 'question', prompt: german('Wen trefft ihr oben auf dem Turm?'), options: [german('Eine Krähe'), german('Einen Domführer'), german('Eine Möwe')] },
      { kind: 'question', prompt: german('Was erzählt Leo über Krähen?'), options: [german('Sie erkennen Gesichter und merken sich, wer sie füttert.'), german('Sie können sprechen wie Menschen.'), german('Sie schlafen den ganzen Winter.')] },
      { kind: 'question', prompt: german('Was hängt an der Hohenzollernbrücke?'), options: [german('Bunte Liebesschlösser'), german('Fahrräder'), german('Weihnachtssterne')] },
      { kind: 'question', prompt: german('Wie zeigt man dem Köbes, dass man kein Kölsch mehr möchte?'), options: [german('Man legt den Bierdeckel auf das Glas.'), german('Man ruft laut „Stopp!“'), german('Man dreht das Glas um.')] }
    ]
  },
  {
    id: 'b2-frankfurt',
    level: 'b2',
    scene: 'frankfurt',
    cast: ['kim', 'jana', 'wirt'],
    languages: ['de'],
    title: german('Mainhattan'),
    beats: [
      { kind: 'narration', text: german('Freitagabend, kurz nach sechs. Kim kommt aus dem Bankturm, in dem sie seit drei Jahren arbeitet – im zweiundvierzigsten Stock, mit Blick über die ganze Stadt. Jana ist übers Wochenende zu Besuch, und du bist mitgekommen.') },
      { kind: 'line', speaker: 'jana', mood: 'surprised', text: german('Kim! Du siehst ja richtig seriös aus in deinem Blazer. Arbeitest du wirklich jeden Tag da oben?') },
      { kind: 'line', speaker: 'kim', mood: 'laughing', text: german('Haha, jeden Tag – und der Aufzug braucht nur fünfundvierzig Sekunden. Wegen der vielen Hochhäuser nennt man Frankfurt übrigens auch „Mainhattan“.') },
      { kind: 'line', speaker: 'kim', text: german('Der Commerzbank-Tower dort drüben ist mit Antenne fast dreihundert Meter hoch und war lange das höchste Bürogebäude Europas. Und ein paar Straßen weiter sitzt die Europäische Zentralbank, die über den Euro wacht.') },
      { kind: 'line', speaker: 'jana', mood: 'curious', text: german('Und was genau machst du in deiner Bank? Ich stelle mir immer Leute vor, die den ganzen Tag Geld zählen.') },
      { kind: 'line', speaker: 'kim', text: german('Ich prüfe Kredite für mittelständische Unternehmen. Das klingt trocken, aber man lernt unglaublich viele Firmen kennen – vom Autozulieferer bis zur Bäckereikette.') },
      { kind: 'line', speaker: 'kim', mood: 'curious', text: german('{name}, könntest du dir vorstellen, in so einem Turm zu arbeiten?') },
      { kind: 'reply', to: 'kim', options: [
        german('Für eine Weile bestimmt, schon wegen der Aussicht – auf Dauer wäre mir ein kleineres Büro aber lieber.'),
        german('Nur wenn ich abends mit dem Fallschirm nach Hause fliegen darf.'),
        german('Ja, aber nur, wenn das Hochhaus aus Lebkuchen gebaut ist.')
      ] },
      { kind: 'narration', text: german('Zu Fuß geht ihr zum Römerberg. Zwischen den gläsernen Türmen stehen plötzlich bunte Fachwerkhäuser mit spitzen Giebeln.') },
      { kind: 'line', speaker: 'kim', text: german('Der Römer ist seit über sechshundert Jahren das Rathaus der Stadt. Früher feierte man hier nach der Kaiserkrönung die großen Festbankette.') },
      { kind: 'line', speaker: 'jana', mood: 'curious', text: german('Die Häuser gegenüber sehen aber ziemlich neu aus. Sind die wirklich so alt?') },
      { kind: 'line', speaker: 'kim', text: german('Gut beobachtet. Im Zweiten Weltkrieg wurde die Altstadt fast vollständig zerstört. Viele Häuser wurden erst in den letzten Jahren originalgetreu rekonstruiert – die neue Altstadt wurde 2018 eröffnet.') },
      { kind: 'narration', text: german('Am Abend fahrt ihr über den Main nach Sachsenhausen. In einer Apfelweinwirtschaft empfängt euch der Wirt an einem langen Holztisch.') },
      { kind: 'line', speaker: 'wirt', mood: 'happy', enters: ['wirt'], text: german('Ei gude! Setzt eich runner, ihr drei. Ich bring eich gleich ä Bembel Äppelwoi un die Grüne Soß – die is heut frisch gemacht, wie bei de Omma.') },
      { kind: 'narration', text: german('Kurz darauf steht auf dem Tisch ein grauer Steinkrug mit blauem Muster: der Bembel.') },
      { kind: 'line', speaker: 'kim', mood: 'happy', text: german('Dazu gibt es Grüne Soße: sieben Kräuter, gekochte Eier und Kartoffeln. Goethe, der in Frankfurt geboren wurde, soll sie geliebt haben.') },
      { kind: 'line', speaker: 'jana', mood: 'laughing', text: german('Hihi, der Apfelwein ist ganz schön sauer. Aber nach dem zweiten Glas gewöhnt man sich dran.') },
      { kind: 'line', speaker: 'kim', mood: 'happy', text: german('So geht es allen. Am Montag sitze ich wieder im zweiundvierzigsten Stock – aber heute Abend bin ich einfach nur Frankfurterin.') },
      { kind: 'question', prompt: german('Seit wann arbeitet Kim in der Bank?'), options: [german('Seit drei Jahren'), german('Seit drei Monaten'), german('Seit dreißig Jahren')] },
      { kind: 'question', prompt: german('In welchem Stock arbeitet Kim?'), options: [german('Im zweiundvierzigsten'), german('Im vierten'), german('Im Erdgeschoss')] },
      { kind: 'question', prompt: german('Warum nennt man Frankfurt „Mainhattan“?'), options: [german('Wegen der vielen Hochhäuser'), german('Weil dort viele Amerikaner wohnen'), german('Wegen des großen Hafens')] },
      { kind: 'question', prompt: german('Was macht Kim in der Bank?'), options: [german('Sie prüft Kredite für mittelständische Unternehmen.'), german('Sie zählt den ganzen Tag Bargeld.'), german('Sie wartet die Aufzüge.')] },
      { kind: 'question', prompt: german('Wie lange ist der Römer schon das Rathaus?'), options: [german('Seit über sechshundert Jahren'), german('Seit 2018'), german('Seit fünfzig Jahren')] },
      { kind: 'question', prompt: german('Warum sehen viele Häuser in der Altstadt so neu aus?'), options: [german('Sie wurden nach der Zerstörung im Krieg rekonstruiert.'), german('Sie werden jedes Jahr neu gestrichen.'), german('Sie sind nur Kulissen aus Holz.')] },
      { kind: 'question', prompt: german('Was ist ein Bembel?'), options: [german('Ein grauer Steinkrug mit blauem Muster'), german('Eine Frankfurter Wurst'), german('Ein Hochhaus am Main')] },
      { kind: 'question', prompt: german('Wie viele Kräuter gehören in die Grüne Soße?'), options: [german('Sieben'), german('Drei'), german('Zwölf')] }
    ]
  },
  {
    id: 'a1-tea',
    level: 'a1',
    scene: 'home',
    cast: ['mia', 'tom', 'lilith'],
    languages: ['de'],
    title: german('Mia kocht Tee'),
    beats: [
      { kind: 'narration', text: german('Mia ist zu Hause. Sie kocht Tee in der Küche.') },
      { kind: 'narration', text: german('Tom kommt in die Küche. Er hat Hunger.') },
      { kind: 'line', speaker: 'tom', text: german('Mia, gibt es auch Kuchen?') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Ja, der Kuchen ist auf dem Tisch.') },
      { kind: 'narration', text: german('Tom isst ein Stück Kuchen. Der Kuchen ist süß.') },
      { kind: 'narration', text: german('Lilith sitzt auf dem Sofa. Sie möchte Fisch.') },
      { kind: 'line', speaker: 'lilith', sfx: 'meow', text: german('Miau!') },
      { kind: 'narration', text: german('Mia gibt Lilith ein kleines Stück Fisch.') },
      { kind: 'line', speaker: 'lilith', mood: 'happy', text: german('Miau! Danke!') },
      { kind: 'narration', text: german('Der Tee ist fertig. Mia und Tom trinken Tee.') },
      { kind: 'line', speaker: 'tom', text: german('Der Tee ist heiß. Aber er schmeckt gut.') },
      { kind: 'narration', text: german('Lilith ist müde. Sie schläft auf dem Sofa ein.') },
      { kind: 'line', speaker: 'mia', text: german('Gute Nacht, Lilith.') },
      { kind: 'narration', text: german('Mia und Tom sitzen still am Tisch. Es ist ein schöner Abend.') },
      { kind: 'question', prompt: german('Wo ist Mia?'), options: [german('In der Küche'), german('Im Garten'), german('Im Bad')] },
      { kind: 'question', prompt: german('Was kocht Mia?'), options: [german('Tee'), german('Suppe'), german('Kaffee')] },
      { kind: 'question', prompt: german('Was isst Tom?'), options: [german('Kuchen'), german('Brot'), german('Fisch')] },
      { kind: 'question', prompt: german('Was möchte Lilith?'), options: [german('Fisch'), german('Milch'), german('Kuchen')] },
      { kind: 'question', prompt: german('Wo schläft Lilith?'), options: [german('Auf dem Sofa'), german('In der Küche'), german('Im Bett')] }
    ]
  },
  {
    id: 'a1-bus',
    level: 'a1',
    scene: 'station',
    cast: ['mia'],
    languages: ['de'],
    title: german('Mit dem Bus zum Bahnhof'),
    beats: [
      { kind: 'narration', text: german('Mia steht an der Haltestelle. Sie wartet auf den Bus.') },
      { kind: 'narration', text: german('Der Bus kommt. Mia steigt ein.') },
      { kind: 'line', speaker: 'mia', text: german('Guten Tag! Fährt dieser Bus zum Bahnhof?') },
      { kind: 'narration', text: german('Der Busfahrer nickt. Er sagt: Ja, in zehn Minuten.') },
      { kind: 'narration', text: german('Mia setzt sich ans Fenster. Sie liest ein Buch.') },
      { kind: 'narration', text: german('Der Bus fährt durch die Stadt. Es regnet.') },
      { kind: 'narration', text: german('Nach zehn Minuten hält der Bus. Mia steigt aus.') },
      { kind: 'narration', text: german('Mia ist am Bahnhof. Ihr Zug kommt in fünf Minuten.') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Ich habe es geschafft!') },
      { kind: 'narration', text: german('Mia kauft eine Flasche Wasser. Dann geht sie zum Zug.') },
      { kind: 'narration', text: german('Der Zug kommt. Mia steigt ein und setzt sich.') },
      { kind: 'narration', text: german('Der Zug fährt los. Mia schaut aus dem Fenster und lächelt.') },
      { kind: 'question', prompt: german('Worauf wartet Mia?'), options: [german('Auf den Bus'), german('Auf den Zug'), german('Auf ein Taxi')] },
      { kind: 'question', prompt: german('Wohin fährt der Bus?'), options: [german('Zum Bahnhof'), german('Zum Flughafen'), german('Zum Strand')] },
      { kind: 'question', prompt: german('Was macht Mia im Bus?'), options: [german('Sie liest ein Buch'), german('Sie schläft'), german('Sie telefoniert')] },
      { kind: 'question', prompt: german('Wie ist das Wetter?'), options: [german('Es regnet'), german('Es schneit'), german('Die Sonne scheint')] },
      { kind: 'question', prompt: german('Wann kommt der Zug?'), options: [german('In fünf Minuten'), german('In einer Stunde'), german('Morgen')] }
    ]
  },
  {
    id: 'a2-package',
    level: 'a2',
    scene: 'flat',
    cast: ['mia', 'kumar'],
    languages: ['de'],
    title: german('Das Paket'),
    beats: [
      { kind: 'narration', text: german('Kumar wartet auf ein Paket. Er sitzt im Wohnzimmer und schaut auf die Uhr.') },
      { kind: 'narration', sfx: 'doorbell', text: german('Es klingelt an der Tür.') },
      { kind: 'narration', text: german('Kumar steht auf und öffnet die Tür. Der Bote gibt ihm ein großes Paket.') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Danke! Endlich ist es da.') },
      { kind: 'narration', text: german('Kumar stellt das Paket auf den Tisch. Mia kommt ins Zimmer.') },
      { kind: 'line', speaker: 'mia', mood: 'curious', text: german('Was ist in dem Paket?') },
      { kind: 'line', speaker: 'kumar', text: german('Ein neues Handy. Mein altes Handy ist kaputt.') },
      { kind: 'narration', text: german('Kumar öffnet das Paket. Das Handy ist weiß und liegt in einer kleinen Box.') },
      { kind: 'line', speaker: 'mia', text: german('Es sieht schön aus. Probier es gleich aus.') },
      { kind: 'narration', text: german('Kumar macht das Handy an. Es funktioniert.') },
      { kind: 'line', speaker: 'kumar', mood: 'happy', text: german('Super! Jetzt kann ich meine Mutter in Indien anrufen.') },
      { kind: 'narration', text: german('Kumar spricht eine Stunde mit seiner Mutter. Danach ist der Akku leer.') },
      { kind: 'line', speaker: 'mia', mood: 'laughing', text: german('Ein neues Handy und schon kein Akku mehr!') },
      { kind: 'line', speaker: 'kumar', mood: 'laughing', text: german('Ich muss wohl öfter aufladen.') },
      { kind: 'question', prompt: german('Worauf wartet Kumar?'), options: [german('Auf ein Paket'), german('Auf Mia'), german('Auf einen Bus')] },
      { kind: 'question', prompt: german('Was ist in dem Paket?'), options: [german('Ein Handy'), german('Ein Buch'), german('Ein Pullover')] },
      { kind: 'question', prompt: german('Warum braucht Kumar ein neues Handy?'), options: [german('Sein altes Handy ist kaputt'), german('Er hat es verloren'), german('Er möchte ein größeres')] },
      { kind: 'question', prompt: german('Mit wem spricht Kumar?'), options: [german('Mit seiner Mutter'), german('Mit seinem Chef'), german('Mit Mia')] },
      { kind: 'question', prompt: german('Warum ist der Akku leer?'), options: [german('Kumar hat eine Stunde telefoniert'), german('Das Handy ist alt'), german('Mia hat damit gespielt')] }
    ]
  },
  {
    id: 'a2-flea-market',
    level: 'a2',
    scene: 'square',
    cast: ['mia', 'oma', 'ali'],
    languages: ['de'],
    title: german('Auf dem Flohmarkt'),
    beats: [
      { kind: 'narration', text: german('Am Samstagmorgen gehen Mia und Oma zum Flohmarkt. Der Platz ist voller Menschen.') },
      { kind: 'narration', text: german('Oma verkauft alte Bücher. Mia sucht eine Lampe für ihr Zimmer.') },
      { kind: 'line', speaker: 'oma', text: german('Schau mal, Mia. Dort drüben steht eine blaue Lampe.') },
      { kind: 'line', speaker: 'mia', mood: 'curious', text: german('Die ist schön! Was kostet sie?') },
      { kind: 'line', speaker: 'ali', text: german('Die Lampe kostet zehn Euro.') },
      { kind: 'line', speaker: 'mia', text: german('Acht Euro?') },
      { kind: 'line', speaker: 'ali', mood: 'laughing', text: german('Neun Euro. Und weil du es bist, bekommst du noch ein Buch dazu.') },
      { kind: 'narration', text: german('Mia kauft die Lampe und das Buch. Sie ist zufrieden.') },
      { kind: 'narration', text: german('Oma verkauft drei Bücher. Danach trinken sie zusammen Kaffee.') },
      { kind: 'line', speaker: 'oma', mood: 'happy', text: german('Der Flohmarkt macht immer Spaß.') },
      { kind: 'line', speaker: 'mia', text: german('Nächstes Jahr kommen wir wieder. Dann verkaufe ich meine alten Sachen.') },
      { kind: 'line', speaker: 'ali', text: german('Und ich reserviere euch den besten Platz!') },
      { kind: 'narration', text: german('Am Nachmittag gehen Mia und Oma nach Hause. Die blaue Lampe leuchtet schon bald in Mias Zimmer.') },
      { kind: 'question', prompt: german('Wohin gehen Mia und Oma?'), options: [german('Zum Flohmarkt'), german('Zum Bahnhof'), german('In den Zoo')] },
      { kind: 'question', prompt: german('Was verkauft Oma?'), options: [german('Alte Bücher'), german('Blumen'), german('Kleidung')] },
      { kind: 'question', prompt: german('Was sucht Mia?'), options: [german('Eine Lampe'), german('Einen Tisch'), german('Ein Fahrrad')] },
      { kind: 'question', prompt: german('Wie viel kostet die Lampe am Ende?'), options: [german('Neun Euro'), german('Zehn Euro'), german('Acht Euro')] },
      { kind: 'question', prompt: german('Was bekommt Mia dazu?'), options: [german('Ein Buch'), german('Eine Tasse'), german('Einen Kuchen')] },
      { kind: 'question', prompt: german('Was trinken Mia und Oma?'), options: [german('Kaffee'), german('Tee'), german('Wasser')] }
    ]
  },
  {
    id: 'b1-banker',
    level: 'b1',
    scene: 'office',
    cast: ['mia', 'banker'],
    languages: ['de'],
    title: german('Der schwäbische Banker'),
    beats: [
      { kind: 'narration', text: german('Mia hat einen Termin bei der Bank in Stuttgart. Sie möchte ein eigenes Konto eröffnen.') },
      { kind: 'line', speaker: 'banker', mood: 'happy', text: german('Grüß Gott! Bäuerle, mein Name. Was kann ich für Sie tun?') },
      { kind: 'line', speaker: 'mia', text: german('Ich möchte ein Konto eröffnen. Ich brauche es für die Miete und für meine Deutschkurse.') },
      { kind: 'line', speaker: 'banker', text: german('Des isch kein Problem. Dafür brauchen wir Ihren Ausweis und eine Meldebescheinigung.') },
      { kind: 'narration', text: german('Herr Bäuerle tippt die Daten in den Computer. Dabei erzählt er von seinem Vater.') },
      { kind: 'line', speaker: 'banker', text: german('Mein Vater ist in den Siebzigerjahren nach Stuttgart gekommen. Am Anfang hat er Hilfe vom Sozialamt bekommen.') },
      { kind: 'line', speaker: 'mia', mood: 'surprised', text: german('Wirklich? Das wusste ich nicht.') },
      { kind: 'line', speaker: 'banker', text: german('Ja, gell. Das war keine Schande. Wenn das Geld nicht reicht, kann man einen Antrag stellen.') },
      { kind: 'line', speaker: 'banker', text: german('Das Sozialamt prüft zum Beispiel, ob jemand Unterstützung für die Miete braucht. Bürgergeld beantragt man beim Jobcenter.') },
      { kind: 'line', speaker: 'mia', mood: 'curious', text: german('Und wie lange dauert so ein Antrag?') },
      { kind: 'line', speaker: 'banker', text: german('Manchmal ein paar Wochen. Wichtig ist, dass alle Papiere vollständig sind. Sonst dauert es länger.') },
      { kind: 'line', speaker: 'mia', text: german('Mein Nachbar sagt, das Deutschlandticket wird auch jedes Jahr teurer.') },
      { kind: 'line', speaker: 'banker', text: german('Leider ja. Erst waren es neun Euro, dann neunundvierzig, jetzt achtundfünfzig Euro im Monat.') },
      { kind: 'line', speaker: 'banker', text: german('Mit dem Ticket kann man in ganz Deutschland Bus und Bahn fahren. Aber nicht mit dem ICE.') },
      { kind: 'line', speaker: 'mia', text: german('Ich fahre jeden Tag mit dem Bus zur Arbeit. Dann lohnt es sich für mich.') },
      { kind: 'line', speaker: 'banker', text: german('Auf jeden Fall. Und wenn Sie sparen möchten, können Sie jeden Monat einen kleinen Betrag auf ein Sparkonto legen.') },
      { kind: 'reply', to: 'banker', options: [german('Das mache ich. Zwanzig Euro im Monat sind ein Anfang.'), german('Ich lege lieber alles unter mein Kopfkissen.'), german('Ein Sparkonto aus Schokolade wäre mir am liebsten.')] },
      { kind: 'line', speaker: 'banker', mood: 'laughing', text: german('Haha, zwanzig Euro sind ein guter Anfang. Kleine Schritte sind besser als keine.') },
      { kind: 'narration', text: german('Herr Bäuerle legt Mia die letzten Papiere hin. Mia unterschreibt.') },
      { kind: 'line', speaker: 'banker', text: german('So, das Konto ist fertig. Sie bekommen eine Karte und können sofort Geld abheben.') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Danke, Herr Bäuerle. Jetzt fühle ich mich in Stuttgart ein Stück mehr zu Hause.') },
      { kind: 'line', speaker: 'banker', text: german('Des freut mich. Und wenn Sie Fragen haben, rufen Sie einfach an. Auch bei wenig Geld muss man sich nicht schämen.') },
      { kind: 'narration', text: german('Mia steckt die Karte in ihre Tasche. Auf dem Weg nach draußen lächelt sie.') },
      { kind: 'question', prompt: german('Warum ist Mia bei der Bank?'), options: [german('Sie möchte ein Konto eröffnen'), german('Sie braucht einen Kredit'), german('Sie möchte Geld wechseln')] },
      { kind: 'question', prompt: german('Welche Papiere braucht Mia?'), options: [german('Ihren Ausweis und eine Meldebescheinigung'), german('Ihren Führerschein und ein Foto'), german('Nur ihre Bankkarte')] },
      { kind: 'question', prompt: german('Woher bekam der Vater von Herrn Bäuerle am Anfang Hilfe?'), options: [german('Vom Sozialamt'), german('Vom Finanzamt'), german('Von der Feuerwehr')] },
      { kind: 'question', prompt: german('Wo beantragt man Bürgergeld?'), options: [german('Beim Jobcenter'), german('Beim Sozialamt'), german('Bei der Bank')] },
      { kind: 'question', prompt: german('Wie viel kostet das Deutschlandticket in der Geschichte?'), options: [german('Achtundfünfzig Euro'), german('Neun Euro'), german('Neunundvierzig Euro')] },
      { kind: 'question', prompt: german('Womit darf man mit dem Deutschlandticket nicht fahren?'), options: [german('Mit dem ICE'), german('Mit dem Bus'), german('Mit der Regionalbahn')] },
      { kind: 'question', prompt: german('Was bekommt Mia am Ende?'), options: [german('Eine Bankkarte'), german('Ein Fahrrad'), german('Ein neues Handy')] }
    ]
  },
  {
    id: 'b1-tagesschau',
    level: 'b1',
    scene: 'home',
    cast: ['mia', 'tom'],
    languages: ['de'],
    title: german('Die Tagesschau'),
    beats: [
      { kind: 'narration', text: german('Es ist zwanzig Uhr. Mia und Tom sitzen auf dem Sofa. Der Fernseher läuft.') },
      { kind: 'narration', announcement: true, text: german('Guten Abend, meine Damen und Herren. Hier ist die Tagesschau.') },
      { kind: 'narration', announcement: true, text: german('Im Süden Deutschlands hat es stark geregnet. Viele Straßen sind überflutet. Die Feuerwehr ist im Einsatz.') },
      { kind: 'line', speaker: 'mia', mood: 'worried', text: german('Oh nein. Meine Tante wohnt bei Ulm. Hoffentlich geht es ihr gut.') },
      { kind: 'line', speaker: 'tom', text: german('Ruf sie später an. Bei solchen Unwettern sind die Leitungen oft überlastet.') },
      { kind: 'narration', announcement: true, text: german('Bei der Bahn kommt es morgen zu Verspätungen. Einige Züge fallen aus.') },
      { kind: 'line', speaker: 'tom', text: german('Ich muss morgen nach Hamburg. Dann nehme ich den früheren Zug.') },
      { kind: 'line', speaker: 'mia', text: german('Gute Idee. Informier dich vorher im Internet.') },
      { kind: 'narration', announcement: true, text: german('Die Energiepreise sind im letzten Jahr gestiegen. Besonders das Heizen ist teurer geworden.') },
      { kind: 'line', speaker: 'mia', text: german('Das merken wir auch. Wir heizen nur noch abends.') },
      { kind: 'line', speaker: 'tom', text: german('Dann ziehen wir am Abend einen Pullover an. Das spart Geld.') },
      { kind: 'narration', text: german('Nach den Nachrichten kommt das Wetter. Für morgen soll es sonnig werden.') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Endlich! Dann gehen wir am Wochenende in den Park.') },
      { kind: 'line', speaker: 'tom', text: german('Von mir aus gern. Aber erst mache ich uns einen Tee.') },
      { kind: 'line', speaker: 'mia', mood: 'laughing', text: german('Gute Idee. Die Nachrichten sind immer so ernst.') },
      { kind: 'narration', text: german('Tom geht in die Küche. Mia schaltet den Fernseher aus.') },
      { kind: 'question', prompt: german('Wann beginnt die Tagesschau?'), options: [german('Um zwanzig Uhr'), german('Um achtzehn Uhr'), german('Um zweiundzwanzig Uhr')] },
      { kind: 'question', prompt: german('Wo hat es stark geregnet?'), options: [german('Im Süden Deutschlands'), german('Im Norden Deutschlands'), german('In Hamburg')] },
      { kind: 'question', prompt: german('Was macht die Feuerwehr?'), options: [german('Sie ist im Einsatz'), german('Sie streikt'), german('Sie macht Urlaub')] },
      { kind: 'question', prompt: german('Warum will Mia ihre Tante später anrufen?'), options: [german('Weil die Leitungen überlastet sind'), german('Weil ihre Tante keine Zeit hat'), german('Weil Mia keinen Empfang hat')] },
      { kind: 'question', prompt: german('Wie fährt Tom nach Hamburg?'), options: [german('Mit dem früheren Zug'), german('Mit dem Auto'), german('Mit dem Flugzeug')] },
      { kind: 'question', prompt: german('Was ist teurer geworden?'), options: [german('Das Heizen'), german('Das Fernsehen'), german('Der Park')] },
      { kind: 'question', prompt: german('Wie wird das Wetter morgen?'), options: [german('Sonnig'), german('Regnerisch'), german('Schneit es')] }
    ]
  },
  {
    id: 'a1-restaurant',
    level: 'a1',
    scene: 'cafe',
    cast: ['mia', 'tom'],
    languages: ['de'],
    title: german('Im Restaurant'),
    beats: [
      { kind: 'narration', text: german('Mia und Tom sind im Restaurant. Es ist zwölf Uhr mittags.') },
      { kind: 'line', speaker: 'mia', text: german('Ich hätte gern ein Glas Wasser, bitte.') },
      { kind: 'line', speaker: 'tom', text: german('Gern. Und ich nehme ein Bier.') },
      { kind: 'line', speaker: 'mia', text: german('Was essen wir? Die Speisekarte ist groß.') },
      { kind: 'line', speaker: 'tom', text: german('Ich nehme die Suppe und dann das Fleisch mit Kartoffeln.') },
      { kind: 'line', speaker: 'mia', text: german('Ich nehme den Salat. Und einen Kaffee danach.') },
      { kind: 'line', speaker: 'tom', text: german('Hallo {name}! Was möchtest du essen?') },
      { kind: 'reply', to: 'tom', options: [
        german('Ich nehme die Pizza.'),
        german('Ich esse ein Auto.'),
        german('Ich trinke den Teller.')
      ] },
      { kind: 'line', speaker: 'mia', text: german('Der Kellner kommt. Wir können bestellen.') },
      { kind: 'narration', text: german('Der Kellner nimmt die Bestellung auf und bringt die Getränke.') },
      { kind: 'line', speaker: 'tom', text: german('Das Essen schmeckt sehr gut. Danke!') },
      { kind: 'line', speaker: 'mia', text: german('Die Rechnung, bitte. Wie viel kostet alles?') },
      { kind: 'line', speaker: 'tom', text: german('Zwölf Euro achtzig. Wir bezahlen zusammen.') },
      { kind: 'question', prompt: german('Wo sind Mia und Tom?'), options: [german('Im Restaurant'), german('Im Kino'), german('Im Park')] },
      { kind: 'question', prompt: german('Was isst Tom?'), options: [german('Suppe und Fleisch mit Kartoffeln'), german('Salat und Kaffee'), german('Pizza und Bier')] },
      { kind: 'question', prompt: german('Was trinkt Mia?'), options: [german('Ein Glas Wasser'), german('Ein Bier'), german('Ein Tee')] },
      { kind: 'question', prompt: german('Was kostet alles zusammen?'), options: [german('Zwölf Euro achtzig'), german('Zwanzig Euro'), german('Fünf Euro')] }
    ]
  },
  {
    id: 'a1-supermarket',
    level: 'a1',
    scene: 'home',
    cast: ['mia', 'tom'],
    languages: ['de'],
    title: german('Im Supermarkt'),
    beats: [
      { kind: 'narration', text: german('Mia und Tom sind im Supermarkt. Sie kaufen Lebensmittel.') },
      { kind: 'line', speaker: 'mia', text: german('Wir brauchen Brot, Milch und Eier.') },
      { kind: 'line', speaker: 'tom', text: german('Und Käse, Butter und ein Apfel.') },
      { kind: 'line', speaker: 'mia', text: german('Noch etwas Obst? Ich nehme Bananen und Tomaten.') },
      { kind: 'line', speaker: 'tom', text: german('Gut. Und Salz, Zucker und Mehl für den Kuchen.') },
      { kind: 'line', speaker: 'mia', text: german('Hallo {name}! Hilfst du uns beim Einkaufen?') },
      { kind: 'reply', to: 'mia', options: [
        german('Ja, gern! Was brauchen wir noch?'),
        german('Ich kaufe ein Auto.'),
        german('Ich esse den ganzen Käse.')
      ] },
      { kind: 'line', speaker: 'tom', text: german('Jetzt gehen wir zur Kasse.') },
      { kind: 'narration', text: german('An der Kasse bezahlt Mia. Das Geld reicht.') },
      { kind: 'line', speaker: 'mia', text: german('Das macht fünfzehn Euro vierzig.') },
      { kind: 'line', speaker: 'tom', text: german('Hier, bitte. Einen schönen Tag noch!') },
      { kind: 'question', prompt: german('Wo sind Mia und Tom?'), options: [german('Im Supermarkt'), german('Im Schwimmbad'), german('In der Schule')] },
      { kind: 'question', prompt: german('Was kaufen sie nicht?'), options: [german('Ein Auto'), german('Brot'), german('Milch')] },
      { kind: 'question', prompt: german('Was bezahlt Mia an der Kasse?'), options: [german('Lebensmittel'), german('Kleidung'), german('Ein Buch')] },
      { kind: 'question', prompt: german('Was kosten die Sachen zusammen?'), options: [german('Fünfzehn Euro vierzig'), german('Zwanzig Euro'), german('Fünf Euro')] }
    ]
  },
  {
    id: 'a1-doctor',
    level: 'a1',
    scene: 'home',
    cast: ['mia', 'tom'],
    languages: ['de'],
    title: german('Beim Arzt'),
    beats: [
      { kind: 'narration', text: german('Tom ist krank. Er hat Fieber und Kopfschmerzen.') },
      { kind: 'line', speaker: 'tom', text: german('Mia, ich fühle mich nicht gut. Mein Bauch tut weh.') },
      { kind: 'line', speaker: 'mia', text: german('Dann gehen wir zum Arzt. Ich rufe an und mache einen Termin.') },
      { kind: 'narration', text: german('In der Praxis wartet Tom im Wartezimmer.') },
      { kind: 'line', speaker: 'mia', text: german('Hallo {name}! Tom wartet auf den Arzt.') },
      { kind: 'reply', to: 'mia', options: [
        german('Gute Besserung, Tom!'),
        german('Ich bin der Arzt.'),
        german('Ich gehe jetzt schwimmen.')
      ] },
      { kind: 'narration', text: german('Der Arzt untersucht Tom. Er sagt: Alles wird gut.') },
      { kind: 'line', speaker: 'tom', text: german('Ich muss Medikamente nehmen und viel schlafen.') },
      { kind: 'line', speaker: 'mia', text: german('Die Apotheke ist direkt neben der Praxis.') },
      { kind: 'narration', text: german('Tom kauft die Medikamente und geht nach Hause.') },
      { kind: 'line', speaker: 'tom', text: german('Morgen gehe ich wieder zur Arbeit.') },
      { kind: 'question', prompt: german('Warum geht Tom zum Arzt?'), options: [german('Er ist krank und hat Fieber'), german('Er möchte einen Termin machen'), german('Er will Medikamente kaufen')] },
      { kind: 'question', prompt: german('Was tut weh?'), options: [german('Sein Bauch'), german('Sein Arm'), german('Sein Bein')] },
      { kind: 'question', prompt: german('Wo wartet Tom?'), options: [german('Im Wartezimmer'), german('In der Küche'), german('Im Bett')] },
      { kind: 'question', prompt: german('Wo liegt die Apotheke?'), options: [german('Neben der Praxis'), german('Im Supermarkt'), german('Im Park')] }
    ]
  },
  {
    id: 'a1-hotel',
    level: 'a1',
    scene: 'home',
    cast: ['mia', 'tom'],
    languages: ['de'],
    title: german('Im Hotel'),
    beats: [
      { kind: 'narration', text: german('Mia und Tom kommen im Hotel an. Sie haben ein Zimmer reserviert.') },
      { kind: 'line', speaker: 'mia', text: german('Guten Tag! Wir haben ein Zimmer für zwei Nächte.') },
      { kind: 'line', speaker: 'tom', text: german('Mein Name ist Tom. Und das ist Mia.') },
      { kind: 'line', speaker: 'mia', text: german('Hallo {name}! Hast du auch einen Ausweis dabei?') },
      { kind: 'reply', to: 'mia', options: [
        german('Ja, meinen Personalausweis.'),
        german('Nein, ich habe meinen Hund dabei.'),
        german('Ich wohne schon hier.')
      ] },
      { kind: 'narration', text: german('Der Rezeptionist gibt Mia den Schlüssel für Zimmer zehn.') },
      { kind: 'line', speaker: 'tom', text: german('Das Frühstück ist von sieben bis zehn Uhr.') },
      { kind: 'line', speaker: 'mia', text: german('Der Aufzug ist rechts. Wir können unser Gepäck hochbringen.') },
      { kind: 'line', speaker: 'tom', text: german('Morgen schauen wir uns die Stadt an.') },
      { kind: 'question', prompt: german('Wo sind Mia und Tom?'), options: [german('Im Hotel'), german('Im Bahnhof'), german('Im Supermarkt')] },
      { kind: 'question', prompt: german('Welche Nummer hat ihr Zimmer?'), options: [german('Zimmer zehn'), german('Zimmer eins'), german('Zimmer hundert')] },
      { kind: 'question', prompt: german('Wann gibt es Frühstück?'), options: [german('Von sieben bis zehn Uhr'), german('Nur am Abend'), german('Um Mitternacht')] },
      { kind: 'question', prompt: german('Wo ist der Aufzug?'), options: [german('Rechts'), german('Links'), german('Im Garten')] }
    ]
  },
  {
    id: 'a2-haircut',
    level: 'a2',
    scene: 'home',
    cast: ['mia', 'kim'],
    languages: ['de'],
    title: german('Beim Friseur'),
    beats: [
      { kind: 'narration', text: german('Mia hat einen Termin beim Friseur. Sie möchte ihre langen Haare schneiden lassen.') },
      { kind: 'line', speaker: 'kim', text: german('Guten Tag, Mia! Setzen Sie sich bitte. Was darf es heute sein?') },
      { kind: 'line', speaker: 'mia', text: german('Ich möchte meine Haare kürzer haben. Vielleicht schulterlang.') },
      { kind: 'line', speaker: 'kim', text: german('Gerne. Ich wasche sie zuerst, dann schneide und föhne ich sie.') },
      { kind: 'line', speaker: 'mia', text: german('Hallo {name}! Findest du, dass mir kurze Haare stehen?') },
      { kind: 'reply', to: 'mia', options: [
        german('Ja, sehr gut! Kurz steht dir ausgezeichnet.'),
        german('Nein, du siehst aus wie ein Topf.'),
        german('Ich kaufe mir eine Perücke.')
      ] },
      { kind: 'narration', text: german('Kim schneidet Mias Haare. Es dauert etwa eine halbe Stunde.') },
      { kind: 'line', speaker: 'mia', text: german('Das sieht toll aus! Vielen Dank, Kim.') },
      { kind: 'line', speaker: 'kim', text: german('Gerne. Das macht achtundvierzig Euro.') },
      { kind: 'line', speaker: 'mia', text: german('Hier, bitte. Bis zum nächsten Mal!') },
      { kind: 'question', prompt: german('Wo ist Mia?'), options: [german('Beim Friseur'), german('Im Supermarkt'), german('Im Fitnessstudio')] },
      { kind: 'question', prompt: german('Was möchte Mia machen lassen?'), options: [german('Ihre Haare schneiden lassen'), german('Sich die Nägel machen lassen'), german('Eine Massage bekommen')] },
      { kind: 'question', prompt: german('Wie viel kostet der Friseurbesuch?'), options: [german('Achtundvierzig Euro'), german('Acht Euro'), german('Vierzig Euro')] },
      { kind: 'question', prompt: german('Wie lange dauert der Haarschnitt?'), options: [german('Eine halbe Stunde'), german('Eine Stunde'), german('Zwei Stunden')] }
    ]
  },
  {
    id: 'a2-library',
    level: 'a2',
    scene: 'home',
    cast: ['mia', 'leo'],
    languages: ['de'],
    title: german('In der Bibliothek'),
    beats: [
      { kind: 'narration', text: german('Leo und Mia sind in der Bibliothek. Sie suchen Bücher für die Schule.') },
      { kind: 'line', speaker: 'leo', text: german('Guten Tag! Wir suchen ein Buch über Geschichte. Können Sie uns helfen?') },
      { kind: 'line', speaker: 'mia', text: german('Und ich brauche ein Wörterbuch für Deutsch.') },
      { kind: 'line', speaker: 'leo', text: german('Hallo {name}! Weißt du, wo die Geschichtsbücher stehen?') },
      { kind: 'reply', to: 'leo', options: [
        german('Ja, in der dritten Regalreihe links.'),
        german('Die Bücher fliegen im Kreis.'),
        german('Ich lese nur Comics im Bett.')
      ] },
      { kind: 'narration', text: german('Mia leiht sich ein Buch aus und leiht einen Ausweis vor.') },
      { kind: 'line', speaker: 'mia', text: german('Ich kann das Buch vier Wochen behalten. Dann muss ich es zurückgeben.') },
      { kind: 'line', speaker: 'leo', text: german('Und ich nehme noch einen Roman mit. Lesen macht Spaß!') },
      { kind: 'question', prompt: german('Wo sind Leo und Mia?'), options: [german('In der Bibliothek'), german('Im Kino'), german('Im Schwimmbad')] },
      { kind: 'question', prompt: german('Was sucht Mia?'), options: [german('Ein Wörterbuch für Deutsch'), german('Ein Kochbuch'), german('Ein Bilderbuch')] },
      { kind: 'question', prompt: german('Wie lange kann Mia das Buch behalten?'), options: [german('Vier Wochen'), german('Ein Tag'), german('Ein Jahr')] },
      { kind: 'question', prompt: german('Wo stehen die Geschichtsbücher?'), options: [german('In der dritten Regalreihe links'), german('Im Keller'), german('Auf dem Dach')] }
    ]
  }
];
