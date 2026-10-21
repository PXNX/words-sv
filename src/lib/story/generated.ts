import { playableLanguages, vocabularyLevels, wordDefinitions, wordMetadata, wordPools, type Language, type VocabularyLevel } from '#lib/data/vocabulary.js';
import type { SoundEffect } from '#lib/sounds.js';
import { MASTERY_THRESHOLD, VOCABULARY_REVIEW_STORAGE_PREFIX, normalizeReviewProgress, prioritizeLearningWords, type ReviewProgress } from '#lib/vocab/spacedRepetition.js';
import { readMissedWords } from './missedWords';
import type { CharacterId, HeldItem, Mood, Story, StoryBeat, StoryProp, Text } from './stories';

/*
 * Stories built on the fly around the learner's own words: first the words they recently got wrong
 * in other modes, then words of their level they have not mastered yet. Mia, Tom and Lilith weave
 * each word into a small evening at home, so every generated story is grammatical in every
 * language: the words are always quoted, never inflected. Every part of the evening (title, opening,
 * greeting, the exercises and who asks them, Lilith's remark, what happens around the house, the
 * goodbye) is drawn at random, so no two evenings read alike. From B2 on, German evenings get a
 * guest: Hans from Bavaria, who mostly cares about beer and sausages, or Albert, a strict Prussian
 * from Berlin, each with a touch of their dialect.
 *
 * Who says what is fixed where a language marks the speaker's gender: Mia greets and explains,
 * Tom asks about a word he read and says goodbye; confirmations and listening tasks suit either.
 *
 * In German, what happens around the house changes the evening: everyone reacts, the learner calls
 * Lilith back or answers her, a crash or the doorbell makes Tom lose the word just practised so the
 * learner has to say it again, the neighbour's cake gets eaten at the end, and before saying
 * goodbye Mia asks what happened that evening. The guest asks one of the words, too.
 */
// A `wool` cue sends Lilith dashing off after the ball of wool; she is back for the next beat.
type Cue = { text: string; sfx?: SoundEffect; prop?: StoryProp };
type Guest = 'hans' | 'albert';
type Speaker = 'mia' | 'tom' | 'lilith';
// One step of an event: someone says something (handing out an item or walking back on stage), the
// learner answers someone, or the speaker has lost the word practised just before and asks for it.
type Step =
  | { speaker: Speaker; text: string; mood?: Mood; holds?: Partial<Record<CharacterId, HeldItem>>; enters?: true }
  | { replyTo: Speaker; options: string[] }
  | { retry: 'mia' | 'tom'; text: string };
// Something that happens around the house. A cue that `exits` sends Lilith off (one of the steps
// brings her back); `recap` is asked at the end of the evening and `later` comes up just before
// the goodbye.
type Event = { cue: Cue & { exits?: true }; steps?: Step[]; recap?: { prompt: string; options: string[] }; later?: Step[] };
type Templates = {
  titles: string[];
  openings: Cue[];
  introsMissed: string[];
  introsNew: string[];
  defAsks: string[];
  defAnswers: string[];
  defQuestion: string;
  wordQuestion: string;
  confirms: string[];
  hearAsks: string[];
  hearQuestion: string;
  lilithLines: string[];
  events: Event[];
  // Needed once an event has a `retry` step or a `recap`.
  retryQuestion?: string;
  recapIntro?: string;
  closings: string[];
  guests?: Record<Guest, { arrivals: Cue[]; greetings: string[]; remarks: string[] }>;
  closingNarrations: string[];
  articleAsk?: string;
};

const GUEST_LEVEL: VocabularyLevel = 'b2';

const templates: Record<Language, Templates> = {
  de: {
    titles: ['Wörterabend mit Lilith', 'Lilith lernt mit', 'Ein Abend voller Wörter'],
    openings: [
      { text: 'Mia, Tom und Lilith sitzen zusammen auf dem Sofa.', sfx: 'purr' },
      { text: 'Mia kocht Tee. Tom liest, und Lilith schläft auf dem Wörterbuch.', sfx: 'purr' },
      { text: 'Es klopft. {name} kommt zu Besuch, und Lilith läuft sofort zur Tür.', sfx: 'knock' },
      { text: 'Tom backt Kekse. Die ganze Wohnung riecht nach Zimt, und Lilith wartet in der Küche.' },
      { text: 'Ding-dong! {name} ist da. Mia öffnet die Tür, und Lilith sagt sofort Hallo.', sfx: 'doorbell' }
    ],
    introsMissed: [
      'Schön, dass du da bist, {name}! Heute üben wir ein paar schwierige Wörter. Keine Sorge, wir helfen dir.',
      'Hallo {name}! Ein paar Wörter waren letztes Mal knifflig. Die üben wir heute noch einmal.'
    ],
    introsNew: ['Schön, dass du da bist, {name}! Heute lernen wir zusammen neue Wörter.', 'Hallo {name}! Ich habe ein paar neue Wörter für dich mitgebracht.'],
    defAsks: ['Ich habe heute das Wort „{word}“ gelesen. Was bedeutet das?', 'Mia, was heißt eigentlich „{word}“?'],
    defAnswers: ['Das ist leicht: {definition}', 'Richtig! „{word}“ heißt: {definition}'],
    defQuestion: 'Was bedeutet „{word}“?',
    wordQuestion: 'Welches Wort passt: {definition}',
    confirms: ['Genau, „{word}“! Das merken wir uns.', 'Richtig! „{word}“ – das klingt gut.', 'Super, „{word}“ ist richtig!'],
    hearAsks: ['Hör mal, {name}: „{word}“. Kannst du dir das Wort merken?', 'Pass gut auf, {name}. Ich sage ein Wort: „{word}“.'],
    hearQuestion: 'Welches Wort hast du gehört?',
    lilithLines: ['Miau! Ich mag Wörter fast so gern wie Fisch.', 'Miau! Darf ich auch mitspielen?', 'Miau … Ich bin müde. Weckt mich, wenn es Fisch gibt.', 'Miau! Das hast du toll gemacht.'],
    events: [
      { cue: { text: 'Klirr! Tom hat seine rote Tasse fallen lassen. Lilith schaut ihn streng an.', sfx: 'glass' }, steps: [{ retry: 'tom', text: 'Oh nein, meine Lieblingstasse! Und vor Schreck habe ich das Wort von eben vergessen.' }], recap: { prompt: 'Was hat Tom fallen lassen?', options: ['Seine rote Tasse', 'Einen weißen Teller', 'Das Wörterbuch'] }, later: [{ speaker: 'mia', text: 'Und morgen kaufen wir Tom eine neue rote Tasse.' }] },
      { cue: { text: 'Draußen bremst ein Auto. Lilith erschrickt und versteckt sich unter dem Sofa.', sfx: 'brakes', exits: true }, steps: [{ speaker: 'mia', mood: 'worried', text: 'Arme Lilith! {name}, ruf sie doch mal. Dich mag sie am liebsten.' }, { replyTo: 'mia', options: ['Lilith, komm her! Alles ist gut.', 'Lilith, fahr bitte das Auto weg!', 'Gute Nacht, Sofa!'] }, { speaker: 'lilith', mood: 'happy', enters: true, text: 'Miau … Danke, {name}. Jetzt habe ich keine Angst mehr.' }], recap: { prompt: 'Warum hat sich Lilith versteckt?', options: ['Weil draußen ein Auto gebremst hat', 'Weil Tom gesungen hat', 'Weil sie baden sollte'] } },
      { cue: { text: 'Ding-dong! Um acht Uhr bringt der Nachbar noch ein großes blaues Paket vorbei.', sfx: 'doorbell' }, steps: [{ retry: 'tom', text: 'Oh, unser neues Wörterbuch ist da! Aber wo waren wir stehen geblieben?' }], recap: { prompt: 'Was war in dem Paket?', options: ['Ein neues Wörterbuch', 'Ein Spielzeug für Lilith', 'Ein Paar Schuhe'] }, later: [{ speaker: 'tom', text: 'Morgen lernen wir mit dem neuen Wörterbuch weiter.' }] },
      { cue: { text: 'Lilith kommt zu dir und schnurrt ganz leise.', sfx: 'purr' }, steps: [{ speaker: 'lilith', mood: 'curious', text: 'Miau! {name}, ich mag es, wenn du da bist. Hast du vielleicht Fisch für mich?' }, { replyTo: 'lilith', options: ['Ich nicht, aber Mia hat bestimmt Fisch für dich.', 'Nein, ich bin der Fisch.', 'Ja, ich trinke Fisch.'] }, { speaker: 'mia', mood: 'laughing', holds: { lilith: 'fish' }, text: 'Haha, na gut. Ein kleines Stück Fisch für Lilith – aber nur eins!' }], recap: { prompt: 'Was bekommt Lilith?', options: ['Ein Stück Fisch', 'Einen Keks', 'Eine Tasse Milch'] } },
      { cue: { text: 'Klopf, klopf! Frau Schulz aus Wohnung Nummer 3 bringt einen Apfelkuchen vorbei.', sfx: 'knock' }, steps: [{ speaker: 'mia', mood: 'happy', holds: { mia: 'cake' }, text: 'Danke! Den essen wir, wenn wir mit den Wörtern fertig sind. Tom, nicht naschen!' }, { speaker: 'tom', mood: 'sad', text: 'Schade. Dann lernen wir eben schneller!' }], recap: { prompt: 'Was bringt Frau Schulz vorbei?', options: ['Einen Apfelkuchen', 'Ein Paket', 'Eine Katze'] }, later: [{ speaker: 'tom', mood: 'happy', text: 'Geschafft! Jetzt gibt es endlich Kuchen. {name}, möchtest du ein Stück?' }, { replyTo: 'tom', options: ['Ja, gern! Danke.', 'Nein danke, ich esse lieber das Wörterbuch.', 'Ich bin ein Apfelkuchen.'] }] },
      { cue: { text: 'Lilith jagt ein gelbes Wollknäuel quer durchs Zimmer.', sfx: 'meow', prop: 'wool', exits: true }, steps: [{ retry: 'tom', text: 'Haha, Lilith! Jetzt ist nicht nur mein Wollknäuel weg, sondern auch das Wort von eben.' }, { speaker: 'lilith', mood: 'happy', enters: true, text: 'Miau! Ich habe das Wollknäuel gefangen!' }], recap: { prompt: 'Womit spielt Lilith?', options: ['Mit einem gelben Wollknäuel', 'Mit einem roten Ball', 'Mit Toms Schuh'] } }
    ],
    retryQuestion: 'Welches Wort haben wir gerade geübt?',
    recapIntro: 'Was für ein Abend! {name}, weißt du noch, was alles passiert ist?',
    closings: ['Super gemacht, {name}! Lilith ist stolz auf dich.', 'Toll, {name}! Diese Wörter vergisst du nicht so schnell.', 'Das war ein schöner Abend, {name}. Bis bald!'],
    guests: {
      hans: {
        arrivals: [{ text: 'Ding-dong! Hans aus München steht vor der Tür – mit einer Tüte Brezn und einem Sixpack Bier.', sfx: 'doorbell' }, { text: 'Es klopft. Nachbar Hans kommt herein und bringt den Duft von frischen Weißwürsten mit.', sfx: 'knock' }],
        greetings: ['Servus beinand! Griaß di, {name}! Lernt’s ihr wieder Wörter? Do bin i dabei – solang’s a Brotzeit gibt.', 'Griaß Gott miteinand! I hab Weißwürscht dabei. Wer mitlernt, kriagt oane.'],
        remarks: ['Ja mei, des Wort is schwer. Aber mit a Maß Bier geht’s glei leichter.', 'Lilith, des is mei Weißwurscht, ned deine!', 'I sag’s ja: Lernen macht hungrig. Wo is’n da Senf?']
      },
      albert: {
        arrivals: [{ text: 'Punkt sieben Uhr klingelt es. Natürlich ist es Albert aus Berlin – auf die Sekunde pünktlich.', sfx: 'doorbell' }, { text: 'Es klopft dreimal, kurz und präzise. Albert, der Gast aus Berlin, steht mit einem Notizbuch vor der Tür.', sfx: 'knock' }],
        greetings: ['Juten Abend. Wie ich höre, wird hier Vokabular geübt. Dann bitte mit System, {name}.', 'Guten Abend allerseits. {name}, ich erwarte heute präzise Antworten. Ordnung muss sein.'],
        remarks: ['Korrekt. So gehört sich das.', 'Na also, det war doch schon janz ordentlich.', 'Lilith, runter vom Tisch! Katzen haben auf dem Wörterbuch nichts zu suchen.']
      }
    },
    closingNarrations: ['Lilith rollt sich auf deinem Schoß zusammen und schnurrt.', 'Mia kocht noch einen Tee, und Lilith schläft auf dem Sofa ein.', 'Lilith gähnt, streckt sich und schnurrt zufrieden.'],
    articleAsk: '{name}, sagt man der, die oder das „{word}“?'
  },
  en: {
    titles: ['Word night with Lilith', 'Lilith joins in', 'An evening full of words'],
    openings: [
      { text: 'Mia, Tom and Lilith are sitting together on the sofa.', sfx: 'purr' },
      { text: 'Mia is making tea. Tom is reading, and Lilith is asleep on the dictionary.', sfx: 'purr' },
      { text: 'Knock, knock. {name} comes to visit, and Lilith runs straight to the door.', sfx: 'knock' },
      { text: 'Tom is baking biscuits. The whole flat smells of cinnamon, and Lilith is waiting in the kitchen.' },
      { text: 'Ding-dong! {name} is here. Mia opens the door, and Lilith says hello at once.', sfx: 'doorbell' }
    ],
    introsMissed: [
      'Great to see you, {name}! Today we’ll practise a few tricky words. Don’t worry, we’ll help you.',
      'Hi {name}! A few words were tricky last time. Let’s practise them again today.'
    ],
    introsNew: ['Great to see you, {name}! Today we’ll learn some new words together.', 'Hi {name}! I’ve brought a few new words for you.'],
    defAsks: ['Today I read the word “{word}”. What does it mean?', 'Mia, what does “{word}” actually mean?'],
    defAnswers: ['That’s easy: {definition}', 'Right! “{word}” means: {definition}'],
    defQuestion: 'What does “{word}” mean?',
    wordQuestion: 'Which word fits: {definition}',
    confirms: ['Exactly, “{word}”! Let’s remember that one.', 'Right! “{word}” – that sounds good.', 'Great, “{word}” is correct!'],
    hearAsks: ['Listen, {name}: “{word}”. Can you remember that word?', 'Listen carefully, {name}. I’ll say a word: “{word}”.'],
    hearQuestion: 'Which word did you hear?',
    lilithLines: ['Meow! I like words almost as much as fish.', 'Meow! Can I play too?', 'Meow… I’m sleepy. Wake me up when there’s fish.', 'Meow! You did that really well.'],
    events: [
      { cue: { text: 'Crash! Tom dropped a cup. Lilith gives him a stern look.', sfx: 'glass' } },
      { cue: { text: 'Outside, a car brakes. Lilith jumps off the sofa in fright.', sfx: 'brakes' } },
      { cue: { text: 'The doorbell rings. It’s only the neighbour with a parcel.', sfx: 'doorbell' } },
      { cue: { text: 'Lilith comes over to you and purrs very softly.', sfx: 'purr' } },
      { cue: { text: 'Knock, knock! The neighbour brings round a cake.', sfx: 'knock' } },
      { cue: { text: 'Lilith chases a ball of wool right across the room.', sfx: 'meow', prop: 'wool' } }
    ],
    closings: ['Well done, {name}! Lilith is proud of you.', 'Brilliant, {name}! You won’t forget these words so quickly.', 'That was a lovely evening, {name}. See you soon!'],
    closingNarrations: ['Lilith curls up in your lap and purrs.', 'Mia makes one more cup of tea, and Lilith falls asleep on the sofa.', 'Lilith yawns, stretches and purrs happily.']
  },
  fr: {
    titles: ['Soirée des mots avec Lilith', 'Lilith apprend aussi', 'Une soirée pleine de mots'],
    openings: [
      { text: 'Mia, Tom et Lilith sont assis ensemble sur le canapé.', sfx: 'purr' },
      { text: 'Mia prépare du thé. Tom lit, et Lilith dort sur le dictionnaire.', sfx: 'purr' },
      { text: 'Toc, toc ! {name} vient en visite, et Lilith court tout de suite à la porte.', sfx: 'knock' },
      { text: 'Tom fait des biscuits. Tout l’appartement sent la cannelle, et Lilith attend dans la cuisine.' },
      { text: 'Ding-dong ! {name} est là. Mia ouvre la porte, et Lilith dit tout de suite bonjour.', sfx: 'doorbell' }
    ],
    introsMissed: [
      'Contente de te voir, {name} ! Aujourd’hui, on révise quelques mots difficiles. Pas de souci, on t’aide.',
      'Salut {name} ! Quelques mots étaient difficiles la dernière fois. On les révise encore aujourd’hui.'
    ],
    introsNew: ['Contente de te voir, {name} ! Aujourd’hui, on apprend de nouveaux mots ensemble.', 'Salut {name} ! Je t’ai apporté quelques nouveaux mots.'],
    defAsks: ['Aujourd’hui, j’ai lu le mot « {word} ». Qu’est-ce que ça veut dire ?', 'Mia, ça veut dire quoi, « {word} » ?'],
    defAnswers: ['C’est facile : {definition}', 'Exact ! « {word} » veut dire : {definition}'],
    defQuestion: 'Que veut dire « {word} » ?',
    wordQuestion: 'Quel mot correspond : {definition}',
    confirms: ['Exactement, « {word} » ! On le retient.', 'Bien ! « {word} », ça sonne bien.', 'Super, « {word} », c’est juste !'],
    hearAsks: ['Écoute, {name} : « {word} ». Tu peux retenir ce mot ?', 'Écoute bien, {name}. Je dis un mot : « {word} ».'],
    hearQuestion: 'Quel mot as-tu entendu ?',
    lilithLines: ['Miaou ! J’aime les mots presque autant que le poisson.', 'Miaou ! Je peux jouer aussi ?', 'Miaou… J’ai sommeil. Réveillez-moi quand il y a du poisson.', 'Miaou ! Quelle belle réponse !'],
    events: [
      { cue: { text: 'Crac ! Tom a fait tomber une tasse. Lilith le regarde d’un air sévère.', sfx: 'glass' } },
      { cue: { text: 'Dehors, une voiture freine. Lilith saute du canapé, effrayée.', sfx: 'brakes' } },
      { cue: { text: 'On sonne à la porte. C’est juste le voisin avec un colis.', sfx: 'doorbell' } },
      { cue: { text: 'Lilith vient vers toi et ronronne tout doucement.', sfx: 'purr' } },
      { cue: { text: 'Toc, toc ! La voisine apporte un gâteau.', sfx: 'knock' } },
      { cue: { text: 'Lilith court après une pelote de laine à travers toute la pièce.', sfx: 'meow', prop: 'wool' } }
    ],
    closings: ['Bravo, {name} ! Lilith est fière de toi.', 'Génial, {name} ! Tu n’oublieras pas ces mots de sitôt.', 'C’était une belle soirée, {name}. À bientôt !'],
    closingNarrations: ['Lilith se roule en boule sur tes genoux et ronronne.', 'Mia prépare encore un thé, et Lilith s’endort sur le canapé.', 'Lilith bâille, s’étire et ronronne, contente.']
  },
  it: {
    titles: ['Serata di parole con Lilith', 'Anche Lilith impara', 'Una serata piena di parole'],
    openings: [
      { text: 'Mia, Tom e Lilith sono seduti insieme sul divano.', sfx: 'purr' },
      { text: 'Mia prepara il tè. Tom legge e Lilith dorme sul dizionario.', sfx: 'purr' },
      { text: 'Toc toc! {name} viene a trovarli e Lilith corre subito alla porta.', sfx: 'knock' },
      { text: 'Tom prepara dei biscotti. Tutta la casa profuma di cannella e Lilith aspetta in cucina.' },
      { text: 'Din don! Ecco {name}. Mia apre la porta e Lilith saluta subito.', sfx: 'doorbell' }
    ],
    introsMissed: [
      'Che bello vederti, {name}! Oggi ripassiamo alcune parole difficili. Niente paura, ti aiutiamo noi.',
      'Ciao {name}! L’ultima volta alcune parole erano difficili. Oggi le ripassiamo ancora.'
    ],
    introsNew: ['Che bello vederti, {name}! Oggi impariamo insieme parole nuove.', 'Ciao {name}! Ti ho portato qualche parola nuova.'],
    defAsks: ['Oggi ho letto la parola «{word}». Che cosa vuol dire?', 'Mia, che cosa significa «{word}»?'],
    defAnswers: ['È facile: {definition}', 'Giusto! «{word}» vuol dire: {definition}'],
    defQuestion: 'Che cosa vuol dire «{word}»?',
    wordQuestion: 'Quale parola corrisponde: {definition}',
    confirms: ['Esatto, «{word}»! Ce lo ricordiamo.', 'Giusto! «{word}»: suona bene.', 'Perfetto, «{word}» è giusto!'],
    hearAsks: ['Ascolta, {name}: «{word}». Riesci a ricordare questa parola?', 'Ascolta bene, {name}. Dico una parola: «{word}».'],
    hearQuestion: 'Quale parola hai sentito?',
    lilithLines: ['Miao! Mi piacciono le parole quasi quanto il pesce.', 'Miao! Posso giocare anch’io?', 'Miao… Ho sonno. Svegliatemi quando c’è il pesce.', 'Miao! Che bella risposta!'],
    events: [
      { cue: { text: 'Crash! A Tom è caduta una tazza. Lilith lo guarda severa.', sfx: 'glass' } },
      { cue: { text: 'Fuori una macchina frena. Lilith salta giù dal divano, spaventata.', sfx: 'brakes' } },
      { cue: { text: 'Suonano alla porta. È solo il vicino con un pacco.', sfx: 'doorbell' } },
      { cue: { text: 'Lilith viene da te e fa le fusa piano piano.', sfx: 'purr' } },
      { cue: { text: 'Toc toc! La vicina porta una torta.', sfx: 'knock' } },
      { cue: { text: 'Lilith rincorre un gomitolo di lana per tutta la stanza.', sfx: 'meow', prop: 'wool' } }
    ],
    closings: ['Ottimo lavoro, {name}! Lilith è fiera di te.', 'Fantastico, {name}! Queste parole non le dimentichi più.', 'È stata una bella serata, {name}. A presto!'],
    closingNarrations: ['Lilith si acciambella sulle tue ginocchia e fa le fusa.', 'Mia prepara ancora un tè e Lilith si addormenta sul divano.', 'Lilith sbadiglia, si stiracchia e fa le fusa contenta.']
  },
  es: {
    titles: ['Noche de palabras con Lilith', 'Lilith también aprende', 'Una noche llena de palabras'],
    openings: [
      { text: 'Mia, Tom y Lilith están sentados juntos en el sofá.', sfx: 'purr' },
      { text: 'Mia prepara té. Tom lee y Lilith duerme sobre el diccionario.', sfx: 'purr' },
      { text: 'Toc, toc. {name} viene de visita y Lilith corre enseguida a la puerta.', sfx: 'knock' },
      { text: 'Tom hace galletas. Todo el piso huele a canela y Lilith espera en la cocina.' },
      { text: '¡Din don! {name} ya está aquí. Mia abre la puerta y Lilith saluda enseguida.', sfx: 'doorbell' }
    ],
    introsMissed: [
      '¡Qué bien verte, {name}! Hoy practicamos algunas palabras difíciles. No te preocupes, te ayudamos.',
      '¡Hola, {name}! La última vez algunas palabras fueron difíciles. Hoy las practicamos otra vez.'
    ],
    introsNew: ['¡Qué bien verte, {name}! Hoy aprendemos palabras nuevas juntos.', '¡Hola, {name}! Te he traído algunas palabras nuevas.'],
    defAsks: ['Hoy he leído la palabra «{word}». ¿Qué significa?', 'Mia, ¿qué significa «{word}»?'],
    defAnswers: ['Es fácil: {definition}', '¡Correcto! «{word}» significa: {definition}'],
    defQuestion: '¿Qué significa «{word}»?',
    wordQuestion: '¿Qué palabra encaja?: {definition}',
    confirms: ['¡Exacto, «{word}»! Lo recordamos.', '¡Bien! «{word}»: suena bien.', '¡Genial, «{word}» es correcto!'],
    hearAsks: ['Escucha, {name}: «{word}». ¿Puedes recordar esta palabra?', 'Escucha bien, {name}. Digo una palabra: «{word}».'],
    hearQuestion: '¿Qué palabra has oído?',
    lilithLines: ['¡Miau! Me gustan las palabras casi tanto como el pescado.', '¡Miau! ¿Puedo jugar yo también?', 'Miau… Tengo sueño. Despertadme cuando haya pescado.', '¡Miau! ¡Qué bien lo has hecho!'],
    events: [
      { cue: { text: '¡Crac! A Tom se le ha caído una taza. Lilith lo mira muy seria.', sfx: 'glass' } },
      { cue: { text: 'Fuera, un coche frena. Lilith salta del sofá asustada.', sfx: 'brakes' } },
      { cue: { text: 'Llaman a la puerta. Es solo el vecino con un paquete.', sfx: 'doorbell' } },
      { cue: { text: 'Lilith se acerca a ti y ronronea muy bajito.', sfx: 'purr' } },
      { cue: { text: '¡Toc, toc! La vecina trae un pastel.', sfx: 'knock' } },
      { cue: { text: 'Lilith persigue un ovillo de lana por toda la habitación.', sfx: 'meow', prop: 'wool' } }
    ],
    closings: ['¡Muy bien, {name}! Lilith está orgullosa de ti.', '¡Genial, {name}! Estas palabras no las vas a olvidar tan pronto.', 'Ha sido una noche muy bonita, {name}. ¡Hasta pronto!'],
    closingNarrations: ['Lilith se acurruca en tu regazo y ronronea.', 'Mia prepara otro té y Lilith se duerme en el sofá.', 'Lilith bosteza, se estira y ronronea contenta.']
  },
  pt: {
    titles: ['Noite de palavras com a Lilith', 'A Lilith também aprende', 'Uma noite cheia de palavras'],
    openings: [
      { text: 'Mia, Tom e Lilith estão sentados juntos no sofá.', sfx: 'purr' },
      { text: 'A Mia está fazendo chá. O Tom está lendo, e a Lilith dorme em cima do dicionário.', sfx: 'purr' },
      { text: 'Toc, toc! {name} vem fazer uma visita, e a Lilith corre logo para a porta.', sfx: 'knock' },
      { text: 'O Tom está fazendo biscoitos. A casa toda cheira a canela, e a Lilith espera na cozinha.' },
      { text: 'Ding-dong! {name} chegou. A Mia abre a porta, e a Lilith diz oi na hora.', sfx: 'doorbell' }
    ],
    introsMissed: [
      'Que bom te ver, {name}! Hoje vamos praticar algumas palavras difíceis. Não se preocupe, a gente ajuda.',
      'Oi, {name}! Da última vez, algumas palavras foram difíceis. Hoje vamos praticar de novo.'
    ],
    introsNew: ['Que bom te ver, {name}! Hoje vamos aprender palavras novas juntos.', 'Oi, {name}! Eu trouxe algumas palavras novas para você.'],
    defAsks: ['Hoje eu li a palavra “{word}”. O que ela significa?', 'Mia, o que quer dizer “{word}”?'],
    defAnswers: ['É fácil: {definition}', 'Certo! “{word}” quer dizer: {definition}'],
    defQuestion: 'O que significa “{word}”?',
    wordQuestion: 'Qual palavra combina: {definition}',
    confirms: ['Isso mesmo, “{word}”! Vamos lembrar dessa.', 'Certo! “{word}”: soa bem.', 'Ótimo, “{word}” está certo!'],
    hearAsks: ['Escuta, {name}: “{word}”. Você consegue lembrar essa palavra?', 'Presta atenção, {name}. Vou dizer uma palavra: “{word}”.'],
    hearQuestion: 'Qual palavra você ouviu?',
    lilithLines: ['Miau! Eu gosto de palavras quase tanto quanto de peixe.', 'Miau! Posso brincar também?', 'Miau… Estou com sono. Me acordem quando tiver peixe.', 'Miau! Que resposta bonita!'],
    events: [
      { cue: { text: 'Crash! O Tom deixou uma xícara cair. A Lilith olha para ele bem séria.', sfx: 'glass' } },
      { cue: { text: 'Lá fora, um carro freia. A Lilith pula do sofá assustada.', sfx: 'brakes' } },
      { cue: { text: 'A campainha toca. É só o vizinho com um pacote.', sfx: 'doorbell' } },
      { cue: { text: 'A Lilith vem até você e ronrona bem baixinho.', sfx: 'purr' } },
      { cue: { text: 'Toc, toc! A vizinha traz um bolo.', sfx: 'knock' } },
      { cue: { text: 'A Lilith corre atrás de um novelo de lã pela sala inteira.', sfx: 'meow', prop: 'wool' } }
    ],
    closings: ['Muito bem, {name}! A Lilith está orgulhosa de você.', 'Demais, {name}! Você não vai esquecer essas palavras tão cedo.', 'Foi uma noite muito boa, {name}. Até logo!'],
    closingNarrations: ['A Lilith se enrola no seu colo e ronrona.', 'A Mia faz mais um chá, e a Lilith adormece no sofá.', 'A Lilith boceja, se espreguiça e ronrona contente.']
  },
  uk: {
    titles: ['Вечір слів з Ліліт', 'Ліліт теж вчиться', 'Вечір, повний слів'],
    openings: [
      { text: 'Мія, Том і Ліліт сидять разом на дивані.', sfx: 'purr' },
      { text: 'Мія заварює чай. Том читає, а Ліліт спить на словнику.', sfx: 'purr' },
      { text: 'Тук-тук! {name} приходить у гості, і Ліліт одразу біжить до дверей.', sfx: 'knock' },
      { text: 'Том пече печиво. Уся квартира пахне корицею, а Ліліт чекає на кухні.' },
      { text: 'Дзелень! {name} уже тут. Мія відчиняє двері, а Ліліт одразу вітається.', sfx: 'doorbell' }
    ],
    introsMissed: [
      'Як добре, що ти тут, {name}! Сьогодні повторимо кілька складних слів. Не хвилюйся, ми допоможемо.',
      'Привіт, {name}! Минулого разу кілька слів були складними. Сьогодні повторимо їх ще раз.'
    ],
    introsNew: ['Як добре, що ти тут, {name}! Сьогодні разом вивчимо нові слова.', 'Привіт, {name}! Я принесла тобі кілька нових слів.'],
    defAsks: ['Сьогодні я прочитав слово «{word}». Що воно означає?', 'Міє, а що означає «{word}»?'],
    defAnswers: ['Це просто: {definition}', 'Правильно! «{word}» означає: {definition}'],
    defQuestion: 'Що означає «{word}»?',
    wordQuestion: 'Яке слово підходить: {definition}',
    confirms: ['Саме так, «{word}»! Запам’ятаймо його.', 'Правильно! «{word}» — гарно звучить.', 'Чудово, «{word}» — правильно!'],
    hearAsks: ['Послухай, {name}: «{word}». Запам’ятаєш це слово?', 'Слухай уважно, {name}. Я скажу слово: «{word}».'],
    hearQuestion: 'Яке слово прозвучало?',
    lilithLines: ['Няв! Я люблю слова майже так само, як рибку.', 'Няв! Можна мені теж погратися?', 'Няв… Я хочу спати. Розбудіть мене, коли буде рибка.', 'Няв! Чудова відповідь!'],
    events: [
      { cue: { text: 'Дзень! Том упустив чашку. Ліліт суворо на нього дивиться.', sfx: 'glass' } },
      { cue: { text: 'Надворі гальмує машина. Ліліт злякано зістрибує з дивана.', sfx: 'brakes' } },
      { cue: { text: 'Дзвонять у двері. Це лише сусід із посилкою.', sfx: 'doorbell' } },
      { cue: { text: 'Ліліт підходить до тебе й тихенько муркоче.', sfx: 'purr' } },
      { cue: { text: 'Тук-тук! Сусідка приносить пиріг.', sfx: 'knock' } },
      { cue: { text: 'Ліліт ганяється за клубком вовни по всій кімнаті.', sfx: 'meow', prop: 'wool' } }
    ],
    closings: ['Чудова робота, {name}! Ліліт пишається тобою.', 'Супер, {name}! Ці слова ти так швидко не забудеш.', 'Це був чудовий вечір, {name}. До зустрічі!'],
    closingNarrations: ['Ліліт згортається клубочком у тебе на колінах і муркоче.', 'Мія робить ще один чай, а Ліліт засинає на дивані.', 'Ліліт позіхає, потягується й задоволено муркоче.']
  }
};

const WORDS_PER_STORY = 6;
const ARTICLES = ['der', 'die', 'das'];

function same(text: string): Text {
  return Object.fromEntries(playableLanguages.map(({ code }) => [code, text])) as Text;
}
function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(word|definition)\}/g, (match, key: string) => values[key] ?? match);
}
function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function levelsFor(level: VocabularyLevel, includeLower: boolean): VocabularyLevel[] {
  const rank = vocabularyLevels.indexOf(level);
  return includeLower ? vocabularyLevels.slice(0, rank + 1) : [level];
}

function readProgress(language: Language, level: VocabularyLevel): Record<string, ReviewProgress> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(`${VOCABULARY_REVIEW_STORAGE_PREFIX}:${language}:${level}`) ?? '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(Object.entries(parsed).map(([word, value]) => [word, normalizeReviewProgress(value)]));
  } catch {
    return {};
  }
}

// Missed words first (most recent first), then due or unmastered words of the learner's levels.
function focusWords(language: Language, level: VocabularyLevel, includeLower: boolean): { words: string[]; missed: number } {
  const known = wordMetadata[language] ?? {};
  const missed = readMissedWords(language).map((entry) => entry.word).filter((word) => known[word]).slice(0, WORDS_PER_STORY);
  const words = [...missed];
  if (words.length < WORDS_PER_STORY) {
    for (const candidateLevel of levelsFor(level, includeLower).reverse()) {
      const progress = readProgress(language, candidateLevel);
      const open = (wordPools[language]?.[candidateLevel] ?? []).filter((word) => known[word] && !words.includes(word) && normalizeReviewProgress(progress[word]).repetitions < MASTERY_THRESHOLD);
      words.push(...prioritizeLearningWords(shuffled(open), progress).slice(0, WORDS_PER_STORY - words.length));
      if (words.length >= WORDS_PER_STORY) break;
    }
  }
  return { words, missed: missed.length };
}

// Two other words of the same kind and similar length, so the right answer does not stand out.
function distractors(language: Language, level: VocabularyLevel, word: string, needsDefinition: boolean): string[] {
  const metadata = wordMetadata[language];
  const definitions = wordDefinitions[language] ?? {};
  const type = metadata[word]?.type;
  const pool = vocabularyLevels.slice(0, vocabularyLevels.indexOf(level) + 2).flatMap((candidateLevel) => wordPools[language]?.[candidateLevel] ?? []);
  const usable = pool.filter((candidate) => candidate !== word && metadata[candidate] && (!needsDefinition || (definitions[candidate] && definitions[candidate] !== definitions[word])));
  const close = usable.filter((candidate) => metadata[candidate].type === type && Math.abs(candidate.length - word.length) <= 2);
  const chosen = shuffled(close.length >= 2 ? close : usable).slice(0, 2);
  return [...new Set(chosen)];
}


// Each exercise brings the word up in a line and asks about it. Whoever asks pronounces the word
// when the learner gets it right (see `asker` and `word` on StoryBeat). A guest only asks for a word
// or reads one out; explaining and the article question belong to Mia and Tom.
function exerciseFor(language: Language, level: VocabularyLevel, word: string, text: Templates, speaker: 'mia' | 'tom' | Guest): StoryBeat[] {
  const metadata = wordMetadata[language][word];
  const spelling = metadata.spelling;
  const definition = wordDefinitions[language]?.[word];
  const article = metadata.type === 'noun' && metadata.article && ARTICLES.includes(metadata.article) ? metadata.article : null;
  const host = speaker === 'mia' || speaker === 'tom';
  const kinds: ('definition' | 'word' | 'article' | 'hear')[] = [];
  if (definition && distractors(language, level, word, true).length === 2) kinds.push(...(host ? ['definition', 'word'] as const : ['word'] as const));
  if (host && text.articleAsk && article) kinds.push('article');
  const kind = kinds.length ? pick(kinds) : 'hear';

  if (kind === 'definition') {
    const others = distractors(language, level, word, true);
    return [
      { kind: 'line', speaker: 'tom', word: spelling, text: same(fill(pick(text.defAsks), { word: spelling })) },
      { kind: 'question', focus: word, asker: 'tom', word: spelling, prompt: same(fill(text.defQuestion, { word: spelling })), options: [definition!, ...others.map((other) => wordDefinitions[language][other])].map(same) },
      { kind: 'line', speaker: 'mia', text: same(fill(pick(text.defAnswers), { word: spelling, definition: definition! })) }
    ];
  }
  if (kind === 'word') {
    const others = distractors(language, level, word, false);
    return [
      { kind: 'question', focus: word, asker: speaker, word: spelling, prompt: same(fill(text.wordQuestion, { definition: definition! })), options: [spelling, ...others.map((other) => wordMetadata[language][other].spelling)].map(same) },
      { kind: 'line', speaker, text: same(fill(pick(text.confirms), { word: spelling })) }
    ];
  }
  if (kind === 'article') {
    const correct = `${article} ${spelling}`;
    return [
      { kind: 'line', speaker: 'mia', word: spelling, text: same(fill(text.articleAsk!, { word: spelling })) },
      { kind: 'reply', to: 'mia', focus: word, word: correct, options: [correct, ...ARTICLES.filter((other) => other !== article).map((other) => `${other} ${spelling}`)].map(same) },
      { kind: 'line', speaker: 'tom', text: same(fill(pick(text.confirms), { word: correct })) }
    ];
  }
  const others = distractors(language, level, word, false);
  return [
    { kind: 'line', speaker, word: spelling, text: same(fill(pick(text.hearAsks), { word: spelling })) },
    { kind: 'question', focus: word, asker: speaker, word: spelling, prompt: same(text.hearQuestion), options: [spelling, ...others.map((other) => wordMetadata[language][other].spelling)].map(same) }
  ];
}

// The word practised just before an event, asked for again among two other words of the evening.
function recallFor(language: Language, level: VocabularyLevel, word: string, words: string[], text: Templates, asker: 'mia' | 'tom'): StoryBeat {
  const spelling = wordMetadata[language][word].spelling;
  const evening = words.filter((other) => other !== word);
  const others = evening.length >= 2 ? shuffled(evening).slice(0, 2) : distractors(language, level, word, false);
  return { kind: 'question', focus: word, asker, word: spelling, prompt: same(text.retryQuestion!), options: [spelling, ...others.map((other) => wordMetadata[language][other].spelling)].map(same) };
}

function stepBeats(steps: Step[], recall?: (asker: 'mia' | 'tom') => StoryBeat): StoryBeat[] {
  return steps.flatMap((step): StoryBeat[] => {
    if ('replyTo' in step) return [{ kind: 'reply', to: step.replyTo, options: step.options.map(same) }];
    if ('retry' in step) return [{ kind: 'line', speaker: step.retry, text: same(step.text) }, ...(recall ? [recall(step.retry)] : [])];
    return [{ kind: 'line', speaker: step.speaker, mood: step.mood, holds: step.holds, enters: step.enters ? [step.speaker] : undefined, text: same(step.text) }];
  });
}

export function hasMissedWords(language: Language) {
  const known = wordMetadata[language] ?? {};
  return readMissedWords(language).some((entry) => known[entry.word]);
}

export function generateStory(language: Language, level: VocabularyLevel, includeLower: boolean): Story | null {
  if (typeof localStorage === 'undefined') return null;
  const text = templates[language];
  const { words, missed } = focusWords(language, level, includeLower);
  if (words.length === 0) return null;
  const opening = pick(text.openings);
  const beats: StoryBeat[] = [
    { kind: 'narration', text: same(opening.text), sfx: opening.sfx },
    { kind: 'line', speaker: 'mia', text: same(pick(missed > 0 ? text.introsMissed : text.introsNew)) }
  ];
  const guest = text.guests && vocabularyLevels.indexOf(level) >= vocabularyLevels.indexOf(GUEST_LEVEL) ? pick<Guest>(['hans', 'albert']) : null;
  const visit = guest && text.guests ? text.guests[guest] : null;
  if (guest && visit) {
    const arrival = pick(visit.arrivals);
    // The guest only walks on stage once they have knocked or rung.
    beats.push({ kind: 'narration', text: same(arrival.text), sfx: arrival.sfx, enters: [guest] }, { kind: 'line', speaker: guest, text: same(pick(visit.greetings)) });
  }
  // Lilith speaks up after one word, the guest asks one word and comments on it, and something
  // happens around the house after one to three others, each at a random point of the evening.
  const lilithAfter = Math.floor(Math.random() * words.length);
  const guestAfter = Math.floor(Math.random() * words.length);
  const events = shuffled(text.events).slice(0, Math.min(3, Math.ceil(words.length / 2)));
  const eventAfter = shuffled(words.map((_, index) => index)).slice(0, events.length);
  // Where Lilith runs off and no step brings her back, she strolls back in with the next line or narration.
  const returns: number[] = [];
  words.forEach((word, index) => {
    const asker = guest && index === guestAfter ? guest : pick<'mia' | 'tom'>(['mia', 'tom']);
    beats.push(...exerciseFor(language, level, word, text, asker));
    if (index === lilithAfter) beats.push({ kind: 'line', speaker: 'lilith', text: same(pick(text.lilithLines)), sfx: 'meow' });
    if (guest && visit && index === guestAfter) beats.push({ kind: 'line', speaker: guest, text: same(pick(visit.remarks)) });
    const event = events[eventAfter.indexOf(index)];
    if (!event) return;
    const exits = event.cue.exits || event.cue.prop === 'wool';
    beats.push({ kind: 'narration', text: same(event.cue.text), sfx: event.cue.sfx, prop: event.cue.prop, exits: exits ? ['lilith'] : undefined });
    if (exits && !event.steps?.some((step) => 'enters' in step && step.enters)) returns.push(beats.length);
    beats.push(...stepBeats(event.steps ?? [], (who) => recallFor(language, level, word, words, text, who)));
  });
  // Before saying goodbye, Mia asks about what happened, then the evening's loose ends come up.
  const recaps = events.flatMap((event) => (event.recap ? [event.recap] : []));
  if (recaps.length && text.recapIntro) {
    beats.push({ kind: 'line', speaker: 'mia', text: same(text.recapIntro) }, ...recaps.map((recap): StoryBeat => ({ kind: 'question', asker: 'mia', prompt: same(recap.prompt), options: recap.options.map(same) })));
  }
  beats.push(...events.flatMap((event) => stepBeats(event.later ?? [])));
  beats.push({ kind: 'line', speaker: 'tom', text: same(pick(text.closings)) }, { kind: 'narration', text: same(pick(text.closingNarrations)), sfx: 'purr' });
  for (const from of returns) {
    const back = beats.findIndex((beat, index) => index >= from && (beat.kind === 'narration' || beat.kind === 'line'));
    if (back !== -1) beats[back] = { ...beats[back], enters: ['lilith'] } as StoryBeat;
  }
  return { id: `generated-${Date.now()}`, level, scene: 'home', cast: guest ? ['mia', 'tom', 'lilith', guest] : ['mia', 'tom', 'lilith'], title: same(pick(text.titles)), beats, generated: true };
}
