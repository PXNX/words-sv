import { playableLanguages } from '#lib/data/vocabulary.js';
import type { Story, Text } from './stories';

/*
 * Stories written for German learners only (see `languages` on Story): everyday errands, a day at the
 * farm and the zoo, an engineering office, the beach at sunset and a noisy airport. The animals
 * speak in sounds ("Muh!", "Törööö!"), which play in place of the word when the story is read aloud.
 */

/*
 * German-only characters who are drawn and voiced but have no stories yet:
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
 * - Simon is an engineer. Precise, a little nerdy, pens in his shirt pocket; plans everything, explains
 *   how things work in far too much detail and gets excited about well-built machines and bridges.
 */

// The same text in every language slot, for stories limited to German learners.
export function german(text: string): Text {
  return Object.fromEntries(playableLanguages.map(({ code }) => [code, text])) as Text;
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
      { kind: 'narration', text: german('Mia ist auf dem Bauernhof von ihrer Tante. Es ist Morgen.') },
      { kind: 'narration', text: german('Die Kuh Berta steht auf der Wiese. Sie frisst Gras.') },
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
      { kind: 'narration', enters: ['bird'], text: german('Auf dem Dach sitzt ein kleiner Vogel. Er heißt Pieps.') },
      { kind: 'line', speaker: 'bird', mood: 'happy', text: german('Piep, piep!') },
      { kind: 'line', speaker: 'mia', mood: 'happy', text: german('Pieps singt jeden Morgen. Er ist unser Wecker!') },
      { kind: 'question', prompt: german('Was gibt die Kuh Berta?'), options: [german('Milch'), german('Eier'), german('Wasser')] },
      { kind: 'question', prompt: german('Was frisst die Kuh?'), options: [german('Gras'), german('Fisch'), german('Kuchen')] },
      { kind: 'question', prompt: german('Welche Farbe hat das Pferd?'), options: [german('Braun'), german('Weiß'), german('Schwarz')] },
      { kind: 'question', prompt: german('Wo sitzt der Vogel?'), options: [german('Auf dem Dach'), german('Im Stall'), german('Auf der Kuh')] },
      { kind: 'question', prompt: german('Was macht Pieps jeden Morgen?'), options: [german('Er singt.'), german('Er schläft.'), german('Er frisst Gras.')] }
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
      { kind: 'narration', text: german('Am Samstag besucht Leo mit dir den Zoo. Zuerst geht ihr zu den Giraffen.') },
      { kind: 'line', speaker: 'leo', mood: 'happy', text: german('Schau mal, {name}! Das ist Gisela. Sie ist über fünf Meter groß.') },
      { kind: 'line', speaker: 'giraffe', mood: 'curious', text: german('Brummm …') },
      { kind: 'line', speaker: 'leo', text: german('Giraffen sind meistens still. Aber nachts summen sie ganz leise.') },
      { kind: 'narration', enters: ['elephant'], text: german('Neben dem Giraffengehege steht der Elefant Benno. Er spritzt mit seinem Rüssel Wasser in die Luft.') },
      { kind: 'line', speaker: 'elephant', mood: 'happy', text: german('Törööö!') },
      { kind: 'line', speaker: 'leo', mood: 'curious', text: german('Vorsicht, {name}, sonst wirst du nass! Hast du schon einmal einen Elefanten gesehen?') },
      { kind: 'reply', to: 'leo', options: [
        german('Ja, im Fernsehen, aber noch nie in echt.'),
        german('Ja, er wohnt in meinem Kühlschrank.'),
        german('Nein, ich bin ein Elefant.')
      ] },
      { kind: 'narration', enters: ['snake'], exits: ['giraffe', 'elephant'], text: german('Zum Schluss geht ihr ins Reptilienhaus. Hinter dem Glas liegt eine lange grüne Schlange.') },
      { kind: 'line', speaker: 'snake', text: german('Ssssss!') },
      { kind: 'line', speaker: 'leo', text: german('Keine Angst. Zischi ist harmlos – sie zischt nur, wenn sie Hunger hat.') },
      { kind: 'question', prompt: german('Wie groß ist die Giraffe?'), options: [german('Über fünf Meter'), german('Zwei Meter'), german('Zehn Zentimeter')] },
      { kind: 'question', prompt: german('Wann summen Giraffen?'), options: [german('Nachts'), german('Mittags'), german('Nur im Winter')] },
      { kind: 'question', prompt: german('Was macht der Elefant mit seinem Rüssel?'), options: [german('Er spritzt Wasser in die Luft.'), german('Er isst ein Eis.'), german('Er spielt Klavier.')] },
      { kind: 'question', prompt: german('Wo liegt die Schlange?'), options: [german('Im Reptilienhaus hinter dem Glas'), german('Im Giraffengehege'), german('Im Wasser beim Elefanten')] },
      { kind: 'question', prompt: german('Wann zischt Zischi?'), options: [german('Wenn sie Hunger hat'), german('Wenn es regnet'), german('Wenn Leo singt')] }
    ]
  },
  {
    id: 'a2-butcher',
    level: 'a2',
    scene: 'butcher',
    cast: ['paul', 'hans'],
    languages: ['de'],
    title: german('Beim Metzger'),
    beats: [
      { kind: 'narration', text: german('Samstagvormittag in der Metzgerei von Herrn Paul. Vor der Theke steht eine lange Schlange – und ganz vorne steht Hans.') },
      { kind: 'line', speaker: 'paul', mood: 'happy', text: german('Grüß Gott, Hans! Wie immer?') },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('Freilich! Sechs Weißwürste, zwei Paar Wiener und ein Pfund Leberkäs. Heut kommt mei ganze Familie.') },
      { kind: 'line', speaker: 'paul', text: german('Gern. Der Leberkäse ist ganz frisch, gerade aus dem Ofen. Darf es sonst noch etwas sein?') },
      { kind: 'line', speaker: 'hans', text: german('Ja mei, a bisserl Aufschnitt für die Kinder. Und was nimmst du, {name}?') },
      { kind: 'reply', to: 'hans', options: [
        german('Zweihundert Gramm Schinken, bitte.'),
        german('Einen Liter Schinken, bitte.'),
        german('Ich hätte gern ein Fahrrad.')
      ] },
      { kind: 'line', speaker: 'paul', mood: 'curious', text: german('Kommt sofort. Möchten Sie den Schinken in dünnen Scheiben?') },
      { kind: 'line', speaker: 'hans', mood: 'happy', text: german('Und a Wurstsemmel für glei, sonst halt i bis Mittag ned durch!') },
      { kind: 'line', speaker: 'paul', mood: 'happy', text: german('Für dich, Hans, geht die Wurstsemmel aufs Haus.') },
      { kind: 'question', prompt: german('Wo kauft Hans ein?'), options: [german('In der Metzgerei'), german('In der Bäckerei'), german('Im Supermarkt')] },
      { kind: 'question', prompt: german('Warum kauft Hans so viel?'), options: [german('Weil seine ganze Familie kommt'), german('Weil er eine Metzgerei eröffnet'), german('Weil er Hunger auf Kuchen hat')] },
      { kind: 'question', prompt: german('Wie viel Leberkäse kauft Hans?'), options: [german('Ein Pfund'), german('Ein Kilo'), german('Hundert Gramm')] },
      { kind: 'question', prompt: german('Wie ist der Leberkäse?'), options: [german('Ganz frisch aus dem Ofen'), german('Schon eine Woche alt'), german('Tiefgefroren')] },
      { kind: 'question', prompt: german('Was bekommt Hans umsonst?'), options: [german('Eine Wurstsemmel'), german('Den Leberkäse'), german('Zwei Weißwürste')] }
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
      { kind: 'narration', text: german('Leo braucht für die Hochzeit seiner Schwester einen Anzug. Im Modegeschäft hilft ihm die Verkäuferin Kim.') },
      { kind: 'line', speaker: 'kim', text: german('Guten Tag! Kann ich Ihnen helfen?') },
      { kind: 'line', speaker: 'leo', text: german('Ja, bitte. Ich suche einen dunklen Anzug. Ich trage Größe 50.') },
      { kind: 'line', speaker: 'kim', text: german('Hier haben wir einen in Dunkelblau. Die Umkleidekabine ist gleich da hinten.') },
      { kind: 'narration', text: german('Ein paar Minuten später kommt Leo aus der Kabine. Die Hose ist viel zu lang.') },
      { kind: 'line', speaker: 'leo', mood: 'curious', text: german('{name}, was meinst du? Passt mir der Anzug?') },
      { kind: 'reply', to: 'leo', options: [
        german('Die Jacke passt gut, aber die Hose ist zu lang.'),
        german('Perfekt, die Hose muss so lang sein.'),
        german('Ich glaube, das ist ein Fahrrad.')
      ] },
      { kind: 'line', speaker: 'kim', mood: 'happy', text: german('Kein Problem, wir kürzen die Hose kostenlos. Bis Freitag ist sie fertig.') },
      { kind: 'line', speaker: 'leo', mood: 'happy', text: german('Super! Und eine Krawatte brauche ich auch noch – vielleicht in Rot?') },
      { kind: 'question', prompt: german('Warum braucht Leo einen Anzug?'), options: [german('Für die Hochzeit seiner Schwester'), german('Für ein Vorstellungsgespräch'), german('Für eine Party im Büro')] },
      { kind: 'question', prompt: german('Welche Farbe hat der Anzug?'), options: [german('Dunkelblau'), german('Hellgrau'), german('Grün')] },
      { kind: 'question', prompt: german('Was ist das Problem mit dem Anzug?'), options: [german('Die Hose ist zu lang.'), german('Die Jacke ist zu klein.'), german('Der Anzug ist zu teuer.')] },
      { kind: 'question', prompt: german('Bis wann ist die Hose fertig?'), options: [german('Bis Freitag'), german('Bis morgen'), german('Bis nächsten Monat')] },
      { kind: 'question', prompt: german('Was möchte Leo noch kaufen?'), options: [german('Eine rote Krawatte'), german('Rote Schuhe'), german('Einen roten Hut')] }
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
      { kind: 'line', speaker: 'mia', text: german('Wir haben auch ein Geschenk: einen roten Ball und eine blaue Decke.') },
      { kind: 'line', speaker: 'tom', mood: 'laughing', text: german('Aber Lilith spielt mit dem Papier. Haha, typisch Katze!') },
      { kind: 'narration', holds: { lilith: null }, text: german('Um acht Uhr am Abend schläft Lilith auf der blauen Decke. Sie ist müde und glücklich.') },
      { kind: 'question', prompt: german('Wie alt ist Lilith jetzt?'), options: [german('Drei Jahre'), german('Zwei Jahre'), german('Zehn Jahre')] },
      { kind: 'question', prompt: german('Wann hat Lilith Geburtstag?'), options: [german('Am 12. Mai'), german('Am 3. Juni'), german('Am 24. Dezember')] },
      { kind: 'question', prompt: german('Woraus ist der Kuchen?'), options: [german('Aus Fisch'), german('Aus Schokolade'), german('Aus Äpfeln')] },
      { kind: 'question', prompt: german('Welche Farbe hat der Ball?'), options: [german('Rot'), german('Blau'), german('Grün')] },
      { kind: 'question', prompt: german('Womit spielt Lilith?'), options: [german('Mit dem Papier'), german('Mit dem Ball'), german('Mit der Decke')] },
      { kind: 'question', prompt: german('Wann schläft Lilith?'), options: [german('Um acht Uhr am Abend'), german('Um acht Uhr am Morgen'), german('Um drei Uhr am Mittag')] }
    ]
  }
];
