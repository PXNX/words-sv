import type { Language, VocabularyLevel } from '#lib/data/vocabulary.js';
import type { CharacterId, SceneId } from './stories';

// How a line is introduced when a story is turned into flowing prose.
export type SpeechStyle = 'say' | 'shout' | 'whisper' | 'ask' | 'answer' | 'laugh' | 'sigh' | 'murmur' | 'call';

export type ReadingBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'quote'; speaker: CharacterId | 'you'; text: string; speech?: SpeechStyle };

export type ReadingQuestion = { prompt: string; options: string[] };

export type ReadingText = {
  id: string;
  level: VocabularyLevel;
  scene: SceneId;
  cast: CharacterId[];
  title: string;
  subtitle: string;
  languages?: Language[];
  blocks: ReadingBlock[];
  questions: ReadingQuestion[];
  // Base forms of the level words the text practises, shown as a small word list under the text.
  keyWords?: string[];
};

/*
 * One written text per level, deliberately dense: everyday vocabulary at A1 and A2, work and
 * civic life at B1 and B2, and essayistic prose at C1 and C2. Dialogue is part of the prose and
 * carries an explicit speech style (says, shouts, whispers, asks, ...), so the reader always knows
 * who is speaking and how.
 */
export const readingTexts: ReadingText[] = [
  {
    id: 'reading-a1-city-day',
    level: 'a1',
    scene: 'frankfurt',
    cast: ['mia', 'tom', 'lilith', 'paul'],
    languages: ['de'],
    title: 'Ein Tag in der Stadt',
    subtitle: 'Mia wohnt in Frankfurt. Vom Frühstück bis zum Abend ist ihr Tag voller kleiner Geschichten.',
    keyWords: [
      'Wohnung', 'Frühstück', 'Küche', 'Kaffee', 'Milch', 'Brot', 'Butter', 'Käse', 'Apfel', 'Supermarkt',
      'Tomate', 'Kartoffel', 'Fisch', 'Kasse', 'bezahlen', 'Haltestelle', 'Bus', 'Bahnhof', 'Büro', 'Kollege',
      'Mittagspause', 'Salat', 'kochen', 'Gemüse', 'Schlüssel', 'Jacke', 'Telefon', 'Bett', 'schlafen', 'müde'
    ],
    blocks: [
      { kind: 'heading', text: 'Der Morgen' },
      { kind: 'paragraph', text: 'Mia wohnt in Frankfurt. Ihre Wohnung ist klein, aber hell. Am Morgen steht sie um sieben Uhr auf. Sie duscht, zieht sich an und macht das Frühstück. Es gibt Brot mit Butter und Käse, dazu einen Apfel und Kaffee mit Milch. Tom kommt in die Küche.' },
      { kind: 'quote', speaker: 'tom', text: 'Guten Morgen! Der Kaffee riecht gut.', speech: 'say' },
      { kind: 'quote', speaker: 'mia', text: 'Guten Morgen! Möchtest du auch ein Ei?', speech: 'ask' },
      { kind: 'quote', speaker: 'tom', text: 'Ja, gern! Ich habe Hunger.', speech: 'shout' },
      { kind: 'paragraph', text: 'Nach dem Frühstück geht Mia einkaufen. Der Supermarkt ist nicht weit. Sie braucht Milch, Brot, Tomaten, Kartoffeln und Fisch. Die Tomaten sind heute billig, aber der Fisch ist teuer. An der Kasse bezahlt sie mit Karte. Die Verkäuferin sagt: „Danke, schönen Tag noch!“ Mia antwortet: „Danke, Ihnen auch!“' },
      { kind: 'heading', text: 'Mit dem Bus ins Büro' },
      { kind: 'paragraph', text: 'Dann wartet Mia an der Haltestelle. Der Bus kommt leider zehn Minuten zu spät. Eine Frau mit einem Hund fragt: „Fährt dieser Bus zum Bahnhof?“ Im Bus ist es voll. Mia steht neben der Tür und hört Musik.' },
      { kind: 'quote', speaker: 'mia', text: 'Ja, der Bus fährt zum Bahnhof.', speech: 'answer' },
      { kind: 'paragraph', text: 'Um zwölf Uhr ist Mia im Büro. Sie arbeitet mit ihrem Kollegen Paul. In der Mittagspause essen sie Suppe und Salat. Paul hat eine Idee für den Abend.' },
      { kind: 'quote', speaker: 'paul', text: 'Gehen wir heute Abend ins Kino?', speech: 'ask' },
      { kind: 'quote', speaker: 'mia', text: 'Gute Idee! Aber ich muss zuerst kochen.', speech: 'say' },
      { kind: 'heading', text: 'Der Abend' },
      { kind: 'paragraph', text: 'Am Abend ist Mia zu Hause. Sie kocht Nudeln mit Gemüse. Tom deckt den Tisch. Lilith sitzt auf dem Sofa und schläft. Plötzlich hört Mia Tom aus der Küche.' },
      { kind: 'quote', speaker: 'tom', text: 'Wo ist mein Schlüssel?', speech: 'shout' },
      { kind: 'quote', speaker: 'mia', text: 'Er ist in deiner Jacke!', speech: 'laugh' },
      { kind: 'quote', speaker: 'tom', text: 'Ah, danke! Ich bin so müde.', speech: 'sigh' },
      { kind: 'paragraph', text: 'Nach dem Abendessen ruft Mia ihre Schwester an. Sie spricht lange am Telefon. Um zehn Uhr ist Mia im Bett. Sie liest noch ein Buch und schläft dann ein. Morgen ist auch ein Tag.' }
    ],
    questions: [
      { prompt: 'Wann steht Mia auf?', options: ['Um sieben Uhr', 'Um neun Uhr', 'Um fünf Uhr'] },
      { prompt: 'Was isst Mia zum Frühstück?', options: ['Brot mit Butter und Käse', 'Nudeln mit Gemüse', 'Suppe und Salat'] },
      { prompt: 'Was kauft Mia im Supermarkt?', options: ['Milch, Brot, Tomaten, Kartoffeln und Fisch', 'Kaffee, Kuchen und Eis', 'Blumen und Zeitungen'] },
      { prompt: 'Wie kommt Mia ins Büro?', options: ['Mit dem Bus', 'Mit dem Fahrrad', 'Zu Fuß'] },
      { prompt: 'Was macht Mia am Abend?', options: ['Sie kocht Nudeln mit Gemüse.', 'Sie geht ins Kino.', 'Sie arbeitet im Büro.'] },
      { prompt: 'Wo ist Toms Schlüssel?', options: ['In seiner Jacke', 'Auf dem Sofa', 'Im Supermarkt'] }
    ]
  },
  {
    id: 'reading-a2-weekend-lake',
    level: 'a2',
    scene: 'lindau',
    cast: ['leo', 'mia', 'oma', 'bello'],
    languages: ['de'],
    title: 'Ein Wochenende am See',
    subtitle: 'Ein Ausflug mit dem Fahrrad, ein plötzlicher Regen und ein Besuch bei Oma.',
    keyWords: [
      'Wochenende', 'Ausflug', 'Wetter', 'Fahrrad', 'See', 'Decke', 'Picknick', 'schwimmen', 'Boot', 'rudern',
      'Steg', 'Insel', 'Brücke', 'fotografieren', 'Wolke', 'Regen', 'Jacke', 'vergessen', 'leihen', 'Ausstellung',
      'Museum', 'Eintritt', 'Führung', 'Geschichte', 'Markt', 'Kuchen', 'backen', 'erzählen', 'müde', 'glücklich'
    ],
    blocks: [
      { kind: 'paragraph', text: 'Am Samstag fahren Leo und Mia mit dem Fahrrad zum See. Das Wetter ist schön: Die Sonne scheint, und der Himmel ist blau. Sie nehmen eine Decke, Brot, Käse, Obst und Wasser mit. Bello läuft neben ihnen und wedelt mit dem Schwanz.' },
      { kind: 'paragraph', text: 'Am See ist es noch ruhig. Ein paar Leute schwimmen, andere sitzen im Gras und lesen. Leo breitet die Decke aus.' },
      { kind: 'quote', speaker: 'leo', text: 'Hier ist es perfekt!', speech: 'shout' },
      { kind: 'quote', speaker: 'mia', text: 'Ja, aber das Wasser ist sicher kalt.', speech: 'laugh' },
      { kind: 'paragraph', text: 'Bello bellt: „Wuff! Wuff!“ Dann springt er ins Wasser und kommt mit nassen Pfoten zurück.' },
      { kind: 'heading', text: 'Auf dem See' },
      { kind: 'paragraph', text: 'Nach dem Picknick mieten sie ein kleines Boot. Der Mann am Steg fragt, ob sie schon einmal gerudert haben. Sie fahren zur kleinen Insel in der Mitte des Sees. Auf der Insel steht eine alte Brücke. Mia fotografiert die Blumen und die Enten.' },
      { kind: 'quote', speaker: 'leo', text: 'Ja, aber das ist lange her.', speech: 'answer' },
      { kind: 'paragraph', text: 'Plötzlich werden die Wolken dunkel. Es beginnt zu regnen.' },
      { kind: 'quote', speaker: 'mia', text: 'Schnell zurück!', speech: 'shout' },
      { kind: 'paragraph', text: 'Leo zieht seine Jacke an, aber Mia hat ihre Jacke im Auto vergessen.' },
      { kind: 'quote', speaker: 'leo', text: 'Nimm meine Jacke.', speech: 'say' },
      { kind: 'quote', speaker: 'mia', text: 'Danke.', speech: 'whisper' },
      { kind: 'heading', text: 'Bei Oma' },
      { kind: 'paragraph', text: 'Am Abend besuchen sie Oma. Sie wohnt in einem kleinen Haus am Markt. Oma hat Kuchen gebacken.' },
      { kind: 'quote', speaker: 'oma', text: 'Wie war es am See?', speech: 'ask' },
      { kind: 'quote', speaker: 'leo', text: 'Sehr schön, bis der Regen kam.', speech: 'say' },
      { kind: 'quote', speaker: 'oma', text: 'Im April macht das Wetter, was es will.', speech: 'laugh' },
      { kind: 'paragraph', text: 'Später sehen sie im Museum eine Ausstellung über das alte Dorf. Der Eintritt ist nicht teuer. Eine Führerin erklärt: „Vor hundert Jahren gab es hier keine Brücke.“ Mia findet die alten Fotos interessant. Leo kauft ein Buch über die Geschichte der Stadt. Müde, aber glücklich fahren sie nach Hause.' }
    ],
    questions: [
      { prompt: 'Wohin fahren Leo und Mia am Samstag?', options: ['Zum See', 'In die Berge', 'Zum Bahnhof'] },
      { prompt: 'Was nehmen sie mit?', options: ['Eine Decke, Brot, Käse, Obst und Wasser', 'Nur ein Buch', 'Einen Fernseher'] },
      { prompt: 'Was macht Bello am See?', options: ['Er springt ins Wasser.', 'Er schläft im Auto.', 'Er rudert das Boot.'] },
      { prompt: 'Warum müssen sie schnell zurück?', options: ['Weil es regnet', 'Weil es dunkel wird', 'Weil Oma anruft'] },
      { prompt: 'Wer leiht Mia die Jacke?', options: ['Leo', 'Oma', 'Der Mann am Steg'] },
      { prompt: 'Was sehen sie im Museum?', options: ['Eine Ausstellung über das alte Dorf', 'Einen neuen Film', 'Ein Konzert'] }
    ]
  },
  {
    id: 'reading-b1-first-day',
    level: 'b1',
    scene: 'office',
    cast: ['mia', 'kim', 'paul', 'tom'],
    languages: ['de'],
    title: 'Der erste Tag im neuen Job',
    subtitle: 'Mia beginnt eine neue Arbeitsstelle in Hamburg – mit einem Laptop, einer Besprechung und vielen neuen Namen.',
    keyWords: [
      'Arbeitsstelle', 'Firma', 'Abteilung', 'Besprechung', 'Kantine', 'Laptop', 'Ausweis', 'Schrank', 'Aufgabe',
      'Planung', 'Projekt', 'Erfahrung', 'Termin', 'Kollege', 'Chef', 'Überstunden', 'Ausgleich', 'Aufgabenbereich',
      'Zusammenfassung', 'Entscheidung', 'kritisieren', 'gerecht', 'streng', 'anstrengend', 'passt', 'Gefühl'
    ],
    blocks: [
      { kind: 'paragraph', text: 'Mia hat eine neue Arbeitsstelle. Sie arbeitet in einer großen Firma in Hamburg. Am ersten Tag steht sie früh auf, frühstückt und fährt mit der U-Bahn ins Büro. Sie ist ein bisschen nervös, denn alles ist neu.' },
      { kind: 'heading', text: 'Willkommen im Team' },
      { kind: 'paragraph', text: 'Im Büro begrüßt Kim sie herzlich.' },
      { kind: 'quote', speaker: 'kim', text: 'Willkommen im Team! Ich zeige dir alles.', speech: 'say' },
      { kind: 'paragraph', text: 'Sie erklärt Mia die Abteilung, den Kopierer, die Besprechungsräume und die Kantine. Mia bekommt einen Laptop, einen Ausweis und einen Schlüssel für den Schrank.' },
      { kind: 'quote', speaker: 'kim', text: 'Dein Arbeitsplatz ist neben mir. Bei Fragen kannst du dich jederzeit melden.', speech: 'say' },
      { kind: 'paragraph', text: 'Um zehn Uhr ist eine Besprechung. Paul, der Chef der Abteilung, stellt das neue Projekt vor. Es geht um eine App für Kunden.' },
      { kind: 'quote', speaker: 'paul', text: 'Wir haben nur sechs Wochen Zeit. Die wichtigste Aufgabe ist die Planung.', speech: 'say' },
      { kind: 'paragraph', text: 'Mia hört zu und macht Notizen. Sie hat schon Erfahrung mit solchen Projekten. Nach der Besprechung kommt Kim zu ihr.' },
      { kind: 'quote', speaker: 'kim', text: 'Hast du alles verstanden?', speech: 'ask' },
      { kind: 'quote', speaker: 'mia', text: 'Fast. Ich habe noch eine Frage zum Termin.', speech: 'answer' },
      { kind: 'heading', text: 'Mittagspause' },
      { kind: 'paragraph', text: 'In der Mittagspause gehen sie in die Kantine. Das Essen ist günstig, aber nicht besonders gut. Kim erzählt von ihren Kollegen.' },
      { kind: 'quote', speaker: 'kim', text: 'Paul ist streng, aber gerecht. Er kritisiert viel, aber er hilft auch.', speech: 'say' },
      { kind: 'quote', speaker: 'mia', text: 'Und die Überstunden?', speech: 'ask' },
      { kind: 'quote', speaker: 'kim', text: 'Im Moment leider oft. Aber wir bekommen einen Ausgleich.', speech: 'sigh' },
      { kind: 'heading', text: 'Der erste Auftrag' },
      { kind: 'paragraph', text: 'Am Nachmittag arbeitet Mia an ihrem ersten Aufgabenbereich. Sie prüft Daten, schreibt eine kurze Zusammenfassung und schickt sie an Paul. Eine Stunde später kommt eine E-Mail: „Gute Arbeit! Wir sprechen morgen darüber.“ Mia freut sich. Sie merkt, dass sie Entscheidungen selbst treffen darf.' },
      { kind: 'paragraph', text: 'Um sechs Uhr geht Mia nach Hause. Tom kocht schon.' },
      { kind: 'quote', speaker: 'tom', text: 'Wie war dein erster Tag?', speech: 'ask' },
      { kind: 'quote', speaker: 'mia', text: 'Anstrengend, aber schön. Ich glaube, die Stelle passt zu mir.', speech: 'say' },
      { kind: 'quote', speaker: 'tom', text: 'Das klingt gut. Und jetzt: Abendessen und keine E-Mails mehr.', speech: 'laugh' }
    ],
    questions: [
      { prompt: 'Wo arbeitet Mia?', options: ['In einer großen Firma in Hamburg', 'In einem Café in Frankfurt', 'In einer Schule in München'] },
      { prompt: 'Wer zeigt Mia das Büro?', options: ['Kim', 'Paul', 'Tom'] },
      { prompt: 'Worum geht es im neuen Projekt?', options: ['Um eine App für Kunden', 'Um ein neues Auto', 'Um einen Kuchen'] },
      { prompt: 'Wie viel Zeit hat das Team?', options: ['Sechs Wochen', 'Sechs Monate', 'Sechs Tage'] },
      { prompt: 'Wie beschreibt Kim den Chef?', options: ['Streng, aber gerecht', 'Freundlich, aber faul', 'Ruhig und schüchtern'] },
      { prompt: 'Was macht Mia am Nachmittag?', options: ['Sie prüft Daten und schreibt eine Zusammenfassung.', 'Sie kauft einen Laptop.', 'Sie fährt nach Hause.'] },
      { prompt: 'Was macht Mia nach der Arbeit?', options: ['Sie isst mit Tom zu Abend.', 'Sie geht ins Kino.', 'Sie arbeitet weiter.'] }
    ]
  },
  {
    id: 'reading-b2-city-debate',
    level: 'b2',
    scene: 'square',
    cast: ['kim', 'paul', 'robert', 'mia'],
    languages: ['de'],
    title: 'Die Debatte um die Innenstadt',
    subtitle: 'Eine Straße soll autofrei werden. Geschäfte, Anwohner und Stadtplanung streiten über Lärm, Umsatz und die Frage, wem die Stadt gehört.',
    keyWords: [
      'Innenstadt', 'Stadtrat', 'Verkehrskonzept', 'Verwaltung', 'Hauptstraße', 'Fußgänger', 'Anwohner', 'Sitzung',
      'Stadtplanung', 'Analyse', 'Lärm', 'Luftverschmutzung', 'Umsatz', 'Fußgängerzone', 'Einkaufszentrum',
      'Übergangslösung', 'Parkplatz', 'Lieferzeit', 'Gerechtigkeit', 'Fahrradweg', 'Pilotprojekt', 'Kompromiss',
      'Abstimmung', 'Mehrheit', 'Kosten', 'investieren', 'argumentieren', 'widersprechen', 'fordern'
    ],
    blocks: [
      { kind: 'paragraph', text: 'In der Innenstadt von Freiburg diskutiert der Stadtrat über ein neues Verkehrskonzept. Die Verwaltung schlägt vor, die Hauptstraße für Autos zu sperren. Fußgänger, Fahrräder und Busse sollen mehr Platz bekommen. Die Anwohner sind geteilter Meinung.' },
      { kind: 'heading', text: 'Argumente im Rathaus' },
      { kind: 'paragraph', text: 'Auf einer Sitzung im Rathaus erklärt Kim, eine Vertreterin der Stadtplanung, die Argumente.' },
      { kind: 'quote', speaker: 'kim', text: 'Eine Analyse der letzten fünf Jahre zeigt, dass der Lärm und die Luftverschmutzung deutlich zugenommen haben. Gleichzeitig sinkt der Umsatz der Geschäfte nicht, wie viele befürchten. In anderen Städten ist die Fußgängerzone ein Erfolg.', speech: 'say' },
      { kind: 'paragraph', text: 'Paul, der ein Bekleidungsgeschäft in der Hauptstraße besitzt, widerspricht.' },
      { kind: 'quote', speaker: 'paul', text: 'Für meine Kunden ist der Parkplatz wichtig. Viele kommen mit dem Auto und kaufen mehr als nur ein Hemd. Wenn sie nicht mehr parken können, gehen sie ins Einkaufszentrum am Stadtrand.', speech: 'shout' },
      { kind: 'paragraph', text: 'Er fordert eine Übergangslösung.' },
      { kind: 'quote', speaker: 'paul', text: 'Wir brauchen zuerst mehr Parkplätze am Rand und einen zuverlässigen Busverkehr.', speech: 'say' },
      { kind: 'heading', text: 'Stimmen aus der Nachbarschaft' },
      { kind: 'paragraph', text: 'Robert, ein Anwohner, meldet sich zu Wort.' },
      { kind: 'quote', speaker: 'robert', text: 'Ich wohne seit dreißig Jahren hier. Der Verkehr ist unerträglich geworden. Aber ich verstehe auch die Sorge der Geschäfte. Vielleicht sollten wir die Straße nur am Wochenende sperren und die Lieferzeiten morgens erlauben.', speech: 'say' },
      { kind: 'paragraph', text: 'Mia, eine Studentin, unterstützt den Vorschlag.' },
      { kind: 'quote', speaker: 'mia', text: 'Die Stadt muss sich verändern. Wir investieren viel Geld in Straßen, aber fast nichts in Fahrradwege. Das ist eine Frage der Gerechtigkeit. Kinder, alte Menschen und Menschen ohne Auto brauchen sichere Wege.', speech: 'say' },
      { kind: 'heading', text: 'Ein Kompromiss' },
      { kind: 'paragraph', text: 'Die Diskussion wird heftig. Ein Mitglied des Stadtrats warnt vor zu hohen Kosten. Eine andere Stimme fordert eine Abstimmung. Am Ende beschließt die Mehrheit, zunächst ein Pilotprojekt für sechs Monate zu starten. Die Hauptstraße wird samstags gesperrt.' },
      { kind: 'quote', speaker: 'kim', text: 'Das ist ein Kompromiss, aber ein wichtiger Anfang.', speech: 'say' },
      { kind: 'quote', speaker: 'paul', text: 'Wir werden sehen, ob die Kunden wiederkommen.', speech: 'murmur' }
    ],
    questions: [
      { prompt: 'Was schlägt die Verwaltung vor?', options: ['Die Hauptstraße für Autos zu sperren', 'Ein neues Einkaufszentrum zu bauen', 'Die Busse abzuschaffen'] },
      { prompt: 'Welche Folgen hatte der Verkehr laut Analyse?', options: ['Lärm und Luftverschmutzung haben zugenommen.', 'Die Geschäfte haben mehr Umsatz.', 'Es gibt mehr Parkplätze.'] },
      { prompt: 'Warum ist Paul gegen die Sperrung?', options: ['Er fürchtet um seine Kunden und den Umsatz.', 'Er wohnt nicht in der Stadt.', 'Er fährt kein Auto.'] },
      { prompt: 'Was schlägt Robert vor?', options: ['Die Straße nur am Wochenende sperren', 'Die Straße sofort ganz sperren', 'Mehr Autos in die Innenstadt lassen'] },
      { prompt: 'Wie argumentiert Mia?', options: ['Sie fordert mehr Gerechtigkeit und sichere Wege.', 'Sie will höhere Parkgebühren.', 'Sie will die Fußgängerzone abschaffen.'] },
      { prompt: 'Was beschließt die Mehrheit?', options: ['Ein Pilotprojekt für sechs Monate', 'Den sofortigen Bau einer Brücke', 'Die Schließung aller Geschäfte'] }
    ]
  },
  {
    id: 'reading-c1-ai-ethics',
    level: 'c1',
    scene: 'library',
    cast: ['simon', 'jana', 'selma', 'becker'],
    languages: ['de'],
    title: 'Die Verantwortung der künstlichen Intelligenz',
    subtitle: 'Zwischen Fortschritt und Kontrolle: Eine Tagung über Algorithmen, Macht und die Frage, wer haftet, wenn Maschinen entscheiden.',
    keyWords: [
      'künstliche Intelligenz', 'Algorithmus', 'Verantwortung', 'Transparenz', 'Kontrolle', 'Überwachung',
      'Menschenwürde', 'Gerechtigkeit', 'Aufklärung', 'Regulierung', 'Haftung', 'Prüfung', 'Entscheidung',
      'Vorurteil', 'Empfehlung', 'Paradox', 'Prinzip', 'Kriterium', 'Instanz', 'Betroffene', 'Wohlstand',
      'Entmündigung', 'unverantwortlich', 'unabhängig', 'notwendig', 'entscheidend', 'aushandeln'
    ],
    blocks: [
      { kind: 'paragraph', text: 'Künstliche Intelligenz ist längst keine Zukunftsvision mehr. Sie sortiert Bewerbungen, stellt Diagnosen, empfiehlt Kredite und entscheidet darüber, welche Inhalte wir sehen. Diese Entwicklung verspricht Effizienz und Fortschritt, erzeugt aber zugleich eine neue Art von Macht. Wer die Algorithmen kontrolliert, beeinflusst Chancen, ohne dass die Betroffenen den Entscheidungsprozess nachvollziehen können.' },
      { kind: 'heading', text: 'Nutzen und Risiko' },
      { kind: 'paragraph', text: 'Auf einer Tagung an der Universität diskutieren Simon, Jana und Selma über die ethischen Grenzen. Simon, ein Ingenieur, verteidigt den Nutzen.' },
      { kind: 'quote', speaker: 'simon', text: 'Systeme erkennen Muster, die Menschen übersehen. In der Medizin können sie Leben retten. Wer diese Möglichkeit aus Angst vor Risiken ablehnt, handelt unverantwortlich.', speech: 'say' },
      { kind: 'paragraph', text: 'Jana, eine Juristin, widerspricht.' },
      { kind: 'quote', speaker: 'jana', text: 'Es geht nicht um Angst, sondern um Kontrolle. Ein Algorithmus ist kein neutrales Werkzeug. Er lernt aus Daten, die von menschlichen Entscheidungen geprägt sind. Wenn diese Daten Vorurteile enthalten, wiederholt das System sie – nur schneller und schwerer zu erkennen.', speech: 'say' },
      { kind: 'paragraph', text: 'Sie fordert Transparenz und eine unabhängige Prüfung. Selma, eine Pflegekraft, erzählt von ihrem Alltag.' },
      { kind: 'quote', speaker: 'selma', text: 'Bei uns entscheidet nicht der Computer, sondern der Mensch. Aber die Zeit wird immer knapper. Wenn ein Programm sagt, welcher Patient zuerst drankommt, dann folgen viele Kollegen dieser Empfehlung, ohne sie zu hinterfragen.', speech: 'say' },
      { kind: 'quote', speaker: 'selma', text: 'So entsteht eine Verantwortung, die niemand mehr übernimmt.', speech: 'whisper' },
      { kind: 'heading', text: 'Wer gestaltet die Regeln?' },
      { kind: 'paragraph', text: 'Simon räumt ein, dass Regulierung notwendig ist.' },
      { kind: 'quote', speaker: 'simon', text: 'Aber wir dürfen die Entwicklung nicht allein den großen Unternehmen überlassen. Der Staat muss forschen, fördern und klare Regeln schaffen.', speech: 'say' },
      { kind: 'quote', speaker: 'jana', text: 'Und die Betroffenen müssen wissen, wann eine Maschine entscheidet und nach welchen Kriterien. Ohne Transparenz gibt es kein Vertrauen.', speech: 'answer' },
      { kind: 'paragraph', text: 'Am Ende der Tagung steht kein endgültiges Ergebnis. Es bleibt ein Paradox: Dieselbe Technologie, die Freiheit und Wohlstand ermöglichen kann, birgt das Risiko der Überwachung und der Entmündigung. Die entscheidende Frage ist nicht, ob wir künstliche Intelligenz nutzen, sondern nach welchen Prinzipien wir sie gestalten. Menschenwürde, Gerechtigkeit und Aufklärung sind keine technischen Parameter – sie müssen politisch ausgehandelt werden.' },
      { kind: 'paragraph', text: 'Herr Becker, ein Banker im Publikum, sagt trocken: „Wir brauchen klare Haftungsregeln. Sonst trägt am Ende niemand die Verantwortung.“ Jana nickt: „Genau darum geht es. Verantwortung braucht einen Namen, ein Gesetz und eine Instanz, die prüft.“ Der Applaus ist verhalten, aber die Diskussion beginnt erst.' }
    ],
    questions: [
      { prompt: 'Wofür wird künstliche Intelligenz laut Text eingesetzt?', options: ['Für Bewerbungen, Diagnosen, Kredite und Inhalte', 'Nur für Computerspiele', 'Ausschließlich für Werbung'] },
      { prompt: 'Warum hält Simon die Technologie für nützlich?', options: ['Sie erkennt Muster und kann in der Medizin Leben retten.', 'Sie ersetzt alle Ärzte.', 'Sie macht Gesetze überflüssig.'] },
      { prompt: 'Was befürchtet Jana?', options: ['Dass Algorithmen Vorurteile wiederholen und unkontrolliert entscheiden', 'Dass zu wenige Daten gesammelt werden', 'Dass die Universität die Forschung stoppt'] },
      { prompt: 'Welche Erfahrung schildert Selma?', options: ['Kollegen folgen Empfehlungen, ohne sie zu hinterfragen.', 'Computer entscheiden besser als Menschen.', 'Pflegekräfte haben zu viel Zeit.'] },
      { prompt: 'Was fordert Simon von der Politik?', options: ['Forschung, Förderung und klare Regeln', 'Den sofortigen Verzicht auf Technik', 'Mehr Macht für große Unternehmen'] },
      { prompt: 'Wieso nennt der Text die Lage paradox?', options: ['Weil dieselbe Technik Freiheit und Überwachung ermöglichen kann', 'Weil niemand mehr arbeitet', 'Weil es keine Daten gibt'] },
      { prompt: 'Was verlangt Herr Becker?', options: ['Klare Haftungsregeln', 'Ein neues Museum', 'Mehr Werbung für Banken'] }
    ]
  },
  {
    id: 'reading-c2-leisure',
    level: 'c2',
    scene: 'cafe',
    cast: ['albert', 'jana', 'robert', 'sabine'],
    languages: ['de'],
    title: 'Der Wert der Muße',
    subtitle: 'Warum eine Gesellschaft, die alles optimiert, gerade das verliert, was sie braucht: zweckfreie Zeit, Stille und die Fähigkeit, bei sich selbst zu bleiben.',
    keyWords: [
      'Muße', 'Müßiggang', 'Selbstoptimierung', 'Effizienz', 'Beschleunigung', 'Erschöpfung', 'Entfremdung',
      'Aufmerksamkeit', 'Zerstreuung', 'Langeweile', 'Kreativität', 'Zeitwohlstand', 'Verzicht', 'Achtsamkeit',
      'Resonanz', 'Entschleunigung', 'Produktivität', 'Leistungsdruck', 'Digitalisierung', 'Zweckfreiheit',
      'Subjekt', 'Identität', 'Paradox', 'Diskurs', 'Reflexion', 'existenzielle', 'unverfügbar', 'widerständig'
    ],
    blocks: [
      { kind: 'paragraph', text: 'Die moderne Gesellschaft hat die Muße fast vollständig aus ihrem Selbstverständnis verdrängt. Zeit gilt als Ressource, die optimiert, vermessen und verwertet werden muss. Wer nichts produziert, scheint nichts zu leisten; wer innehält, gerät unter Rechtfertigungsdruck. Selbst die Erholung wird zur Aufgabe, zur Selbstoptimierung, zur nächsten Effizienzsteigerung.' },
      { kind: 'heading', text: 'Was Muße einmal war' },
      { kind: 'paragraph', text: 'Dabei war Muße nie bloß Abwesenheit von Arbeit. Sie bedeutete zweckfreie Zeit, Aufmerksamkeit ohne Ziel, ein Verweilen bei den Dingen, das sich der Verwertung entzieht. In der Antike galt sie als Voraussetzung für Erkenntnis und politische Urteilskraft. Heute wird sie misstrauisch beobachtet, als Luxus oder als Müßiggang, der die wirtschaftliche Ordnung stört.' },
      { kind: 'paragraph', text: 'Albert, ein pensionierter Lehrer, sitzt im Café und beobachtet die Straße.' },
      { kind: 'quote', speaker: 'albert', text: 'Früher hatte ich immer das Gefühl, etwas zu verpassen. Heute weiß ich: Ich habe vor allem mich selbst verpasst. Die Stille war unerträglich, weil ich sie nicht mehr gewohnt war.', speech: 'say' },
      { kind: 'paragraph', text: 'Jana, eine Journalistin, lacht leise.' },
      { kind: 'quote', speaker: 'jana', text: 'Bei mir ist es das Telefon. Kaum ist eine Lücke im Tag, greife ich danach. Als könnte ich die Leere damit füllen.', speech: 'laugh' },
      { kind: 'heading', text: 'Die Zerstreuung als Norm' },
      { kind: 'paragraph', text: 'Die Digitalisierung hat diese Flucht vor der Leere beschleunigt. Benachrichtigungen zerlegen die Aufmerksamkeit in kleine Stücke; jede Pause wird gefüllt, jeder Moment verwertet. Was dabei verloren geht, ist nicht nur Ruhe, sondern die Fähigkeit, Zusammenhänge zu erkennen. Kreativität braucht Umwege, Irrwege und Langeweile. Wer ständig reagiert, kann nicht denken.' },
      { kind: 'paragraph', text: 'Robert, ein Unternehmer, hält dagegen.' },
      { kind: 'quote', speaker: 'robert', text: 'Muße ist ein Privileg. Wer Miete zahlen muss, kann sich Zweckfreiheit nicht leisten. Wir sollten nicht die Sehnsucht nach Stille romantisieren, sondern die Bedingungen ändern, unter denen Menschen arbeiten.', speech: 'say' },
      { kind: 'quote', speaker: 'jana', text: 'Das ist der entscheidende Punkt. Es geht nicht um Verzicht auf Leistung, sondern um Zeitwohlstand für alle.', speech: 'answer' },
      { kind: 'heading', text: 'Räume, die sich der Effizienz entziehen' },
      { kind: 'paragraph', text: 'Vielleicht liegt die Antwort in einer paradoxen Bewegung: Gerade weil die Gesellschaft auf Effizienz drängt, muss sie Räume schützen, die sich der Effizienz entziehen. Bibliotheken, Parks, Gespräche ohne Ziel, Tage ohne Plan. Nicht als Rückzug aus der Welt, sondern als Bedingung dafür, dass Menschen sich als Subjekte erfahren und nicht nur als Funktionen.' },
      { kind: 'paragraph', text: 'Sabine, eine Ärztin, sagt zum Abschied: „Ich verschreibe meinen Patienten längst keine Ruhe mehr. Ich frage sie, wann sie zuletzt etwas getan haben, das keinen Nutzen hatte.“ Albert lächelt: „Und? Wissen sie es?“ Sabine schüttelt den Kopf. „Fast nie.“ Draußen beginnt es zu dämmern. Niemand steht auf. Für einen Augenblick ist das Café ein Ort der Muße – zweckfrei, gelassen und still.' }
    ],
    questions: [
      { prompt: 'Wie verhält sich die Gesellschaft laut Text zur Muße?', options: ['Sie verdrängt sie und macht selbst Erholung zur Aufgabe.', 'Sie fördert sie stärker als früher.', 'Sie hat sie gesetzlich verboten.'] },
      { prompt: 'Was bedeutete Muße ursprünglich?', options: ['Zweckfreie Zeit und Aufmerksamkeit ohne Ziel', 'Möglichst schnelle Arbeit', 'Urlaub am Meer'] },
      { prompt: 'Welche Erfahrung schildert Albert?', options: ['Er hat sich selbst verpasst und musste Stille wieder lernen.', 'Er vermisst seinen Beruf.', 'Er liest keine Bücher mehr.'] },
      { prompt: 'Warum ist Kreativität auf Langeweile angewiesen?', options: ['Weil sie Umwege und Irrwege braucht', 'Weil sie Zeit spart', 'Weil sie sich planen lässt'] },
      { prompt: 'Welchen Einwand formuliert Robert?', options: ['Muße sei ein Privileg, das sich nicht jeder leisten kann.', 'Muße sei die wichtigste Tugend.', 'Alle sollten sofort aufhören zu arbeiten.'] },
      { prompt: 'Was fordert Jana statt Verzicht?', options: ['Zeitwohlstand für alle', 'Höhere Löhne für Manager', 'Mehr Werbung für Freizeit'] },
      { prompt: 'Was verschreibt Sabine ihren Patienten nicht mehr?', options: ['Ruhe', 'Medikamente', 'Sport'] }
    ]
  }
];

export function readingTextsFor(language: Language, level: VocabularyLevel, includeLower: boolean): ReadingText[] {
  const available = readingTexts.filter((text) => !text.languages || text.languages.includes(language));
  const levels: VocabularyLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
  const rank = levels.indexOf(level);
  const exact = available.filter((text) => text.level === level);
  const lower = includeLower
    ? available
        .filter((text) => levels.indexOf(text.level) < rank)
        .sort((a, b) => levels.indexOf(b.level) - levels.indexOf(a.level))
    : [];
  return [...exact, ...lower];
}
