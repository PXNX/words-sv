import type { Language } from '#lib/data/vocabulary.js';

/*
 * What the partner says in a conversation without AI (scripted.ts): per learning language, a few
 * stock phrases (greeting, praise, help, goodbye) and topics, each a short run of questions with
 * reply suggestions and the rule that checks the learner's answer. German and English have six
 * topics of four questions, the other languages three of three. Everything stays at A1/A2 level,
 * since the questions do not change with the learner's level (the round's words do).
 *
 * Placeholders: {learner}, {partner}, {story}, {word}, {art} (a noun's article), {definition},
 * {answer} (the learner's own words), {example}, {model}; capitalised ({Word}, {Art}) for the
 * start of a sentence. The word frames stay unquoted, since the partner quotes them as examples.
 */

export type TopicId = 'food' | 'freetime' | 'home' | 'travel' | 'work' | 'weather';

/** How an answer is checked. Keywords match at the start of a word, so inflected forms count. */
export type Expect =
  | { kind: 'yesno' }
  | { kind: 'keywords'; words: readonly string[]; numbers?: boolean }
  | { kind: 'free'; minWords?: number };

export type DialogueStep = {
  ask: string;
  expect: Expect;
  // Reply suggestions the learner can tap; the first is also the example after a miss.
  choices: readonly string[];
  // The partner's own remark after a fitting answer.
  react?: string;
  // A full sentence to model when the learner answered with a word or two ('short') or with a
  // bare number ('number'); {answer} is what they said.
  model?: string;
  modelWhen?: 'short' | 'number';
  // Follow-up questions for a yes/no question.
  yes?: DialogueStep;
  no?: DialogueStep;
};

export type Topic = { id: TopicId; intro: string; steps: readonly DialogueStep[] };

export type Lexicon = {
  yes: readonly string[];
  no: readonly string[];
  numbers: readonly string[];
  hello: readonly string[];
  helloAnon: readonly string[];
  story: string;
  praise: readonly string[];
  ack: readonly string[];
  retry: readonly string[];
  model: string;
  moveOn: readonly string[];
  wordIntro: readonly string[];
  wordMeaning: string;
  wordAsk: readonly string[];
  wordPraise: readonly string[];
  wordRetry: string;
  // Sentence frames for the word questions' suggestions, by word type; `any` fits every word.
  wordChoices: { any: readonly string[]; noun?: readonly string[]; verb?: readonly string[]; adjective?: readonly string[] };
  closing: readonly string[];
  allWords: string;
};

export type DialogueContent = { lexicon: Lexicon; topics: readonly Topic[] };

const de: DialogueContent = {
  lexicon: {
    yes: ['ja', 'jaa', 'jep', 'klar', 'genau', 'natürlich', 'doch', 'gern', 'gerne', 'sicher'],
    no: ['nein', 'nö', 'nee', 'nicht', 'kein', 'keine', 'keinen', 'nie', 'niemals'],
    numbers: ['null', 'eins', 'ein', 'eine', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'zwanzig', 'dreißig', 'hundert', 'halb'],
    hello: ['Hallo, {learner}! Schön, dich zu sehen. Ich bin {partner}.', 'Hi, {learner}! Ich bin {partner}. Wie schön, dass du da bist.', 'Guten Tag, {learner}! Hier ist {partner}.'],
    helloAnon: ['Hallo! Schön, dich zu sehen. Ich bin {partner}.', 'Hi! Ich bin {partner}. Wie schön, dass du da bist.'],
    story: 'Wir kennen uns aus „{story}“.',
    praise: ['Sehr gut!', 'Super!', 'Toll!', 'Prima!', 'Genau!', 'Klasse!'],
    ack: ['Aha, verstehe.', 'Interessant!', 'Ach so!', 'Okay, danke!'],
    retry: ['Hm, das habe ich nicht ganz verstanden. Du kannst zum Beispiel sagen: „{example}“', 'Kein Problem, versuch es noch einmal. Zum Beispiel: „{example}“'],
    model: 'Als ganzer Satz: „{model}“',
    moveOn: ['Macht nichts, weiter geht’s!', 'Kein Problem, wir machen weiter.', 'Alles gut, dann frage ich etwas anderes.'],
    wordIntro: ['Ich habe ein Wort für dich: „{word}“.', 'Hör mal, ein neues Wort: „{word}“.', 'Jetzt ein Wort aus deiner Liste: „{word}“.'],
    wordMeaning: 'Das heißt: {definition}',
    wordAsk: ['Kannst du einen Satz mit „{word}“ sagen?', 'Sag mir einen Satz mit „{word}“.', 'Benutze „{word}“ in einem Satz.'],
    wordPraise: ['Und du hast „{word}“ benutzt – stark!', 'Super, „{word}“ war dabei!', 'Toll, mit „{word}“!'],
    wordRetry: 'Fast! Benutze das Wort „{word}“, zum Beispiel so: „{example}“',
    wordChoices: {
      any: ['Ich kenne das Wort {word}.', 'Heute lerne ich das Wort {word}.'],
      noun: ['Wo ist {art} {word}?', '{Art} {word} ist hier.'],
      verb: ['Ich möchte heute {word}.', 'Kannst du gut {word}?'],
      adjective: ['Das ist sehr {word}.', 'Ich finde das {word}.']
    },
    closing: ['Das war ein schönes Gespräch! Bis bald!', 'Danke für das Gespräch! Tschüss und bis zum nächsten Mal!', 'Es hat Spaß gemacht, mit dir zu reden. Mach’s gut!'],
    allWords: 'Und du hast alle deine Wörter benutzt. Bravo!'
  },
  topics: [
    {
      id: 'food', intro: 'Lass uns übers Essen reden!', steps: [
        {
          ask: 'Was isst du gern?',
          expect: { kind: 'keywords', words: ['Pizza', 'Brot', 'Kuchen', 'Nudeln', 'Pasta', 'Salat', 'Suppe', 'Fleisch', 'Fisch', 'Käse', 'Obst', 'Apfel', 'Reis', 'Kartoffel', 'Pommes', 'Schokolade', 'Eis', 'Gemüse', 'Döner', 'Burger', 'esse', 'mag', 'liebe'] },
          choices: ['Ich esse gern Pizza.', 'Ich mag Brot mit Käse.', 'Am liebsten esse ich Nudeln.'],
          react: 'Lecker! Das esse ich auch gern.',
          model: 'Ich esse gern {answer}.', modelWhen: 'short'
        },
        {
          ask: 'Kochst du gern?',
          expect: { kind: 'yesno' },
          choices: ['Ja, ich koche gern.', 'Nein, ich koche nicht gern.'],
          yes: {
            ask: 'Was kochst du am liebsten?',
            expect: { kind: 'keywords', words: ['Nudeln', 'Pasta', 'Suppe', 'Pizza', 'Reis', 'Gemüse', 'Kuchen', 'Salat', 'Fleisch', 'Fisch', 'Curry', 'koche', 'mache', 'backe'] },
            choices: ['Ich koche gern Nudeln.', 'Ich mache oft Suppe.', 'Ich backe gern Kuchen.'],
            react: 'Das klingt gut. Das probiere ich auch mal!',
            model: 'Ich koche gern {answer}.', modelWhen: 'short'
          },
          no: {
            ask: 'Wer kocht denn bei dir zu Hause?',
            expect: { kind: 'keywords', words: ['Mutter', 'Vater', 'Mama', 'Papa', 'Partner', 'Partnerin', 'Freund', 'Freundin', 'Frau', 'Mann', 'Oma', 'niemand', 'ich', 'kocht', 'bestelle'] },
            choices: ['Meine Mutter kocht.', 'Mein Partner kocht oft.', 'Niemand, ich bestelle Essen.'],
            react: 'Schön, wenn jemand für dich kocht!'
          }
        },
        {
          ask: 'Was trinkst du zum Frühstück?',
          expect: { kind: 'keywords', words: ['Kaffee', 'Tee', 'Milch', 'Saft', 'Orangensaft', 'Wasser', 'Kakao', 'trinke', 'nichts'] },
          choices: ['Ich trinke Kaffee.', 'Ich trinke Tee mit Milch.', 'Ich trinke Orangensaft.'],
          react: 'Ah, morgens trinke ich auch gern etwas Warmes.',
          model: 'Ich trinke {answer}.', modelWhen: 'short'
        },
        {
          ask: 'Gehst du gern ins Restaurant?',
          expect: { kind: 'yesno' },
          choices: ['Ja, sehr gern.', 'Nein, ich esse lieber zu Hause.'],
          yes: {
            ask: 'Was bestellst du dort meistens?',
            expect: { kind: 'keywords', words: ['Pizza', 'Pasta', 'Nudeln', 'Salat', 'Suppe', 'Fleisch', 'Fisch', 'Schnitzel', 'Burger', 'Steak', 'Sushi', 'Curry', 'bestelle', 'nehme', 'esse'] },
            choices: ['Ich bestelle meistens Pizza.', 'Ich nehme gern Fisch.', 'Oft esse ich ein Schnitzel.'],
            react: 'Mmh, jetzt habe ich Hunger!',
            model: 'Ich bestelle meistens {answer}.', modelWhen: 'short'
          },
          no: {
            ask: 'Und was isst du heute Abend?',
            expect: { kind: 'keywords', words: ['Pizza', 'Brot', 'Nudeln', 'Salat', 'Suppe', 'Reis', 'Gemüse', 'Käse', 'esse', 'koche', 'nichts', 'weiß'] },
            choices: ['Heute Abend esse ich Salat.', 'Ich koche Suppe.', 'Ich weiß es noch nicht.'],
            react: 'Das klingt nach einem schönen Abend.',
            model: 'Heute Abend esse ich {answer}.', modelWhen: 'short'
          }
        }
      ]
    },
    {
      id: 'freetime', intro: 'Erzähl mal, was machst du in deiner Freizeit?', steps: [
        {
          ask: 'Was machst du gern, wenn du frei hast?',
          expect: { kind: 'keywords', words: ['lese', 'lesen', 'Buch', 'Bücher', 'Sport', 'Fußball', 'schwimme', 'spiele', 'Spiele', 'Musik', 'höre', 'tanze', 'koche', 'wandere', 'Rad', 'fahre', 'male', 'Freunde', 'Film', 'Filme', 'schaue', 'gehe', 'treffe'] },
          choices: ['Ich lese gern Bücher.', 'Ich spiele Fußball.', 'Ich höre gern Musik.'],
          react: 'Schön! Das mache ich auch manchmal.'
        },
        {
          ask: 'Machst du gern Sport?',
          expect: { kind: 'yesno' },
          choices: ['Ja, ich laufe gern.', 'Nein, ich bin lieber gemütlich.'],
          yes: {
            ask: 'Welchen Sport machst du?',
            expect: { kind: 'keywords', words: ['Fußball', 'Tennis', 'Yoga', 'schwimme', 'Schwimmen', 'laufe', 'Laufen', 'Rad', 'Basketball', 'tanze', 'Fitness', 'wandere', 'jogge', 'Volleyball', 'spiele'] },
            choices: ['Ich spiele Tennis.', 'Ich gehe schwimmen.', 'Ich mache Yoga.'],
            react: 'Super, das hält fit!',
            model: 'Ich mache gern {answer}.', modelWhen: 'short'
          },
          no: {
            ask: 'Was machst du dann lieber?',
            expect: { kind: 'free', minWords: 2 },
            choices: ['Ich lese lieber.', 'Ich schaue lieber Filme.', 'Ich koche lieber.'],
            react: 'Das ist auch schön. Ausruhen ist wichtig!'
          }
        },
        {
          ask: 'Was hast du am Wochenende vor?',
          expect: { kind: 'keywords', words: ['Freunde', 'Familie', 'besuche', 'fahre', 'gehe', 'Kino', 'Park', 'schlafe', 'arbeite', 'koche', 'treffe', 'Party', 'Ausflug', 'nichts', 'lerne', 'spiele'] },
          choices: ['Ich treffe Freunde.', 'Ich gehe ins Kino.', 'Ich schlafe lange.'],
          react: 'Klingt nach einem guten Plan!'
        },
        {
          ask: 'Wie viele Stunden schläfst du in der Nacht?',
          expect: { kind: 'keywords', words: ['Stunden', 'wenig', 'viel', 'lange'], numbers: true },
          choices: ['Ich schlafe acht Stunden.', 'Ungefähr sieben Stunden.', 'Leider zu wenig.'],
          react: 'Schlaf ist so wichtig. Ich mache gern ein Nickerchen.',
          model: 'Ich schlafe {answer} Stunden.', modelWhen: 'number'
        }
      ]
    },
    {
      id: 'home', intro: 'Ich möchte etwas über dein Zuhause wissen.', steps: [
        {
          ask: 'Wohnst du in einer Wohnung oder in einem Haus?',
          expect: { kind: 'keywords', words: ['Wohnung', 'Haus', 'WG', 'Zimmer', 'wohne', 'Eltern'] },
          choices: ['Ich wohne in einer Wohnung.', 'Ich wohne in einem Haus.', 'Ich wohne in einer WG.'],
          react: 'Schön! Ich mag mein Zuhause auch sehr.'
        },
        {
          ask: 'Hast du Geschwister?',
          expect: { kind: 'yesno' },
          choices: ['Ja, ich habe einen Bruder.', 'Ja, ich habe eine Schwester.', 'Nein, ich habe keine Geschwister.'],
          yes: {
            ask: 'Wie heißt dein Bruder oder deine Schwester?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['Er heißt Max.', 'Sie heißt Anna.', 'Mein Bruder heißt Jonas.'],
            react: 'Ein schöner Name!'
          },
          no: {
            ask: 'Hast du viele Freunde?',
            expect: { kind: 'yesno' },
            choices: ['Ja, ich habe viele Freunde.', 'Nicht viele, aber gute Freunde.'],
            react: 'Gute Freunde sind wie Familie.'
          }
        },
        {
          ask: 'Hast du ein Haustier?',
          expect: { kind: 'yesno' },
          choices: ['Ja, ich habe eine Katze.', 'Ja, ich habe einen Hund.', 'Nein, ich habe kein Haustier.'],
          yes: {
            ask: 'Wie heißt dein Tier?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['Meine Katze heißt Mimi.', 'Mein Hund heißt Bello.'],
            react: 'Wie süß!'
          },
          no: {
            ask: 'Welches Tier möchtest du gern haben?',
            expect: { kind: 'keywords', words: ['Hund', 'Katze', 'Vogel', 'Fisch', 'Pferd', 'Hase', 'Kaninchen', 'Hamster', 'keins', 'keines'] },
            choices: ['Ich möchte einen Hund.', 'Eine Katze wäre schön.', 'Ein Pferd!'],
            react: 'Gute Wahl!'
          }
        },
        {
          ask: 'Welches Zimmer magst du am liebsten?',
          expect: { kind: 'keywords', words: ['Küche', 'Wohnzimmer', 'Schlafzimmer', 'Bad', 'Balkon', 'Garten', 'Zimmer', 'Arbeitszimmer', 'Bett'] },
          choices: ['Ich mag meine Küche.', 'Das Wohnzimmer.', 'Mein Balkon ist am schönsten.'],
          react: 'Da ist es bestimmt gemütlich.'
        }
      ]
    },
    {
      id: 'travel', intro: 'Lass uns übers Reisen sprechen!', steps: [
        {
          ask: 'Reist du gern?',
          expect: { kind: 'yesno' },
          choices: ['Ja, ich reise sehr gern.', 'Nein, ich bleibe lieber zu Hause.'],
          yes: {
            ask: 'Wohin möchtest du gern einmal reisen?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['Ich möchte nach Italien reisen.', 'Nach Berlin!', 'Ich möchte ans Meer.'],
            react: 'Oh, das klingt toll!'
          },
          no: {
            ask: 'Was magst du an deiner Stadt?',
            expect: { kind: 'free', minWords: 2 },
            choices: ['Ich mag die Parks.', 'Es gibt gute Cafés.', 'Meine Freunde wohnen hier.'],
            react: 'Das klingt schön.'
          }
        },
        {
          ask: 'Wie fährst du zur Arbeit oder zur Schule?',
          expect: { kind: 'keywords', words: ['Bus', 'Bahn', 'Zug', 'Auto', 'Fahrrad', 'Rad', 'Fuß', 'U-Bahn', 'Straßenbahn', 'Tram', 'fahre', 'gehe', 'laufe', 'Hause'] },
          choices: ['Ich fahre mit dem Bus.', 'Ich fahre Fahrrad.', 'Ich gehe zu Fuß.'],
          react: 'Praktisch! Ich fahre am liebsten mit dem Zug.'
        },
        {
          ask: 'Was nimmst du immer mit auf eine Reise?',
          expect: { kind: 'keywords', words: ['Buch', 'Handy', 'Kamera', 'Pass', 'Koffer', 'Rucksack', 'Musik', 'Kopfhörer', 'Snacks', 'Wasser', 'Ticket', 'Kissen', 'nehme'] },
          choices: ['Ich nehme immer ein Buch mit.', 'Mein Handy und Kopfhörer.', 'Eine Kamera.'],
          react: 'Gute Idee, das ist wichtig.'
        },
        {
          ask: 'Wo warst du im letzten Urlaub?',
          expect: { kind: 'free', minWords: 1 },
          choices: ['Ich war in Spanien.', 'Ich war am Meer.', 'Ich war zu Hause.'],
          react: 'Wie schön! Erzähl mir ein anderes Mal mehr davon.'
        }
      ]
    },
    {
      id: 'work', intro: 'Erzähl mir von deinem Alltag!', steps: [
        {
          ask: 'Arbeitest du, oder gehst du zur Schule?',
          expect: { kind: 'keywords', words: ['arbeite', 'Arbeit', 'Schule', 'studiere', 'Uni', 'Universität', 'Student', 'Studentin', 'Schüler', 'Schülerin', 'Rente', 'beides', 'Büro'] },
          choices: ['Ich arbeite.', 'Ich gehe zur Schule.', 'Ich studiere.'],
          react: 'Interessant! Das ist bestimmt manchmal anstrengend.'
        },
        {
          ask: 'Was machst du dort am liebsten?',
          expect: { kind: 'free', minWords: 2 },
          choices: ['Ich spreche gern mit Kollegen.', 'Ich lerne gern neue Dinge.', 'Die Pausen!'],
          react: 'Das verstehe ich gut.'
        },
        {
          ask: 'Wann stehst du morgens auf?',
          expect: { kind: 'keywords', words: ['Uhr', 'früh', 'spät', 'halb', 'Viertel'], numbers: true },
          choices: ['Um sieben Uhr.', 'Ich stehe um sechs Uhr auf.', 'Sehr spät!'],
          react: 'Ich brauche morgens erst einmal einen Kaffee.',
          model: 'Ich stehe um {answer} Uhr auf.', modelWhen: 'number'
        },
        {
          ask: 'Was möchtest du gern noch lernen?',
          expect: { kind: 'free', minWords: 2 },
          choices: ['Ich möchte Gitarre lernen.', 'Ich möchte besser Deutsch sprechen.', 'Ich möchte kochen lernen.'],
          react: 'Das schaffst du bestimmt!'
        }
      ]
    },
    {
      id: 'weather', intro: 'Wie ist das Wetter bei dir? Lass uns darüber reden.', steps: [
        {
          ask: 'Wie ist das Wetter heute?',
          expect: { kind: 'keywords', words: ['Sonne', 'sonnig', 'scheint', 'Regen', 'regnet', 'warm', 'kalt', 'heiß', 'Wind', 'windig', 'Schnee', 'schneit', 'Wolken', 'bewölkt', 'schön', 'grau', 'nass', 'kühl', 'neblig'] },
          choices: ['Die Sonne scheint.', 'Es regnet.', 'Es ist kalt und windig.'],
          react: 'Bei mir ist es ganz ähnlich.'
        },
        {
          ask: 'Magst du lieber den Sommer oder den Winter?',
          expect: { kind: 'keywords', words: ['Sommer', 'Winter', 'Frühling', 'Herbst', 'beide', 'beides'] },
          choices: ['Ich mag lieber den Sommer.', 'Ich liebe den Winter.', 'Am liebsten den Frühling.'],
          react: 'Jede Jahreszeit hat etwas Schönes.'
        },
        {
          ask: 'Was machst du gern, wenn es regnet?',
          expect: { kind: 'free', minWords: 2 },
          choices: ['Ich lese ein Buch.', 'Ich trinke Tee und schaue Filme.', 'Ich gehe trotzdem raus.'],
          react: 'Gemütlich!'
        },
        {
          ask: 'Wie viel Grad sind es heute ungefähr?',
          expect: { kind: 'keywords', words: ['Grad', 'weiß', 'warm', 'kalt'], numbers: true },
          choices: ['Ungefähr zwanzig Grad.', 'Es sind fünf Grad.', 'Ich weiß es nicht.'],
          react: 'Danke! Dann ziehe ich die passende Jacke an.',
          model: 'Heute sind es {answer} Grad.', modelWhen: 'number'
        }
      ]
    }
  ]
};

const en: DialogueContent = {
  lexicon: {
    yes: ['yes', 'yeah', 'yep', 'sure', 'of course', 'definitely', 'absolutely', 'i do', 'love'],
    no: ['no', 'nope', 'not', "don't", 'dont', 'never', 'none', "haven't", "i'm not"],
    numbers: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'twenty', 'thirty', 'half'],
    hello: ['Hello, {learner}! Nice to see you. I’m {partner}.', 'Hi, {learner}! It’s {partner}. I’m glad you’re here.', 'Good to see you, {learner}! This is {partner}.'],
    helloAnon: ['Hello! Nice to see you. I’m {partner}.', 'Hi! It’s {partner}. I’m glad you’re here.'],
    story: 'We know each other from “{story}”.',
    praise: ['Very good!', 'Great!', 'Lovely!', 'Brilliant!', 'Exactly!', 'Well done!'],
    ack: ['I see.', 'Interesting!', 'Oh, okay!', 'Right, thanks!'],
    retry: ['Hmm, I didn’t quite get that. You could say: “{example}”', 'No problem, try again. For example: “{example}”'],
    model: 'As a full sentence: “{model}”',
    moveOn: ['Never mind, let’s go on!', 'No problem, let’s keep going.', 'That’s fine, let me ask you something else.'],
    wordIntro: ['I have a word for you: “{word}”.', 'Listen, a new word: “{word}”.', 'Now a word from your list: “{word}”.'],
    wordMeaning: 'It means: {definition}',
    wordAsk: ['Can you say a sentence with “{word}”?', 'Tell me a sentence with “{word}”.', 'Use “{word}” in a sentence.'],
    wordPraise: ['And you used “{word}” – great job!', 'Super, “{word}” was in there!', 'Nice, with “{word}”!'],
    wordRetry: 'Almost! Use the word “{word}”, for example like this: “{example}”',
    wordChoices: {
      any: ['I know the word {word}.', 'Today I am learning the word {word}.', '{Word} is a useful word.']
    },
    closing: ['That was a lovely chat! See you soon!', 'Thanks for talking with me! Bye for now!', 'I really enjoyed talking to you. Take care!'],
    allWords: 'And you used all your words. Bravo!'
  },
  topics: [
    {
      id: 'food', intro: 'Let’s talk about food!', steps: [
        {
          ask: 'What do you like to eat?',
          expect: { kind: 'keywords', words: ['pizza', 'bread', 'cake', 'pasta', 'noodles', 'salad', 'soup', 'meat', 'fish', 'cheese', 'fruit', 'apple', 'rice', 'potato', 'chips', 'chocolate', 'ice cream', 'vegetables', 'burger', 'curry', 'eat', 'like', 'love'] },
          choices: ['I like pizza.', 'I love bread with cheese.', 'My favourite food is pasta.'],
          react: 'Yummy! I like that too.',
          model: 'I like to eat {answer}.', modelWhen: 'short'
        },
        {
          ask: 'Do you like cooking?',
          expect: { kind: 'yesno' },
          choices: ['Yes, I love cooking.', 'No, I don’t like cooking.'],
          yes: {
            ask: 'What do you cook most often?',
            expect: { kind: 'keywords', words: ['pasta', 'soup', 'pizza', 'rice', 'vegetables', 'cake', 'salad', 'meat', 'fish', 'curry', 'eggs', 'cook', 'make', 'bake'] },
            choices: ['I often cook pasta.', 'I make soup.', 'I like baking cakes.'],
            react: 'That sounds good. I should try it!',
            model: 'I often cook {answer}.', modelWhen: 'short'
          },
          no: {
            ask: 'So who cooks at your home?',
            expect: { kind: 'keywords', words: ['mother', 'mum', 'mom', 'father', 'dad', 'partner', 'friend', 'wife', 'husband', 'grandma', 'nobody', 'no one', 'cooks', 'order', 'i'] },
            choices: ['My mother cooks.', 'My partner cooks a lot.', 'Nobody, I order food.'],
            react: 'It’s nice when someone cooks for you!'
          }
        },
        {
          ask: 'What do you drink for breakfast?',
          expect: { kind: 'keywords', words: ['coffee', 'tea', 'milk', 'juice', 'water', 'cocoa', 'chocolate', 'drink', 'nothing'] },
          choices: ['I drink coffee.', 'I have tea with milk.', 'I drink orange juice.'],
          react: 'Ah, I like something warm in the morning too.',
          model: 'I drink {answer}.', modelWhen: 'short'
        },
        {
          ask: 'Do you like going to restaurants?',
          expect: { kind: 'yesno' },
          choices: ['Yes, very much.', 'No, I prefer eating at home.'],
          yes: {
            ask: 'What do you usually order there?',
            expect: { kind: 'keywords', words: ['pizza', 'pasta', 'salad', 'soup', 'meat', 'fish', 'steak', 'burger', 'sushi', 'curry', 'chips', 'order', 'have', 'get'] },
            choices: ['I usually order pizza.', 'I like to have fish.', 'I often get a burger.'],
            react: 'Mmm, now I’m hungry!',
            model: 'I usually order {answer}.', modelWhen: 'short'
          },
          no: {
            ask: 'And what are you eating tonight?',
            expect: { kind: 'keywords', words: ['pizza', 'bread', 'pasta', 'salad', 'soup', 'rice', 'vegetables', 'cheese', 'eat', 'cook', 'having', 'nothing', 'know'] },
            choices: ['Tonight I’m eating salad.', 'I’m cooking soup.', 'I don’t know yet.'],
            react: 'That sounds like a nice evening.',
            model: 'Tonight I’m eating {answer}.', modelWhen: 'short'
          }
        }
      ]
    },
    {
      id: 'freetime', intro: 'Tell me, what do you do in your free time?', steps: [
        {
          ask: 'What do you like doing when you are free?',
          expect: { kind: 'keywords', words: ['read', 'book', 'sport', 'football', 'soccer', 'swim', 'play', 'games', 'music', 'listen', 'dance', 'cook', 'walk', 'hike', 'bike', 'cycle', 'paint', 'draw', 'friends', 'film', 'movie', 'watch', 'go', 'meet'] },
          choices: ['I like reading books.', 'I play football.', 'I listen to music.'],
          react: 'Nice! I do that sometimes too.'
        },
        {
          ask: 'Do you like sport?',
          expect: { kind: 'yesno' },
          choices: ['Yes, I like running.', 'No, I prefer to relax.'],
          yes: {
            ask: 'Which sport do you do?',
            expect: { kind: 'keywords', words: ['football', 'soccer', 'tennis', 'yoga', 'swim', 'run', 'jog', 'cycling', 'bike', 'basketball', 'dance', 'gym', 'hike', 'volleyball', 'play'] },
            choices: ['I play tennis.', 'I go swimming.', 'I do yoga.'],
            react: 'Great, that keeps you fit!',
            model: 'I like {answer}.', modelWhen: 'short'
          },
          no: {
            ask: 'What do you prefer to do, then?',
            expect: { kind: 'free', minWords: 2 },
            choices: ['I prefer reading.', 'I like watching films.', 'I’d rather cook.'],
            react: 'That’s nice too. Resting is important!'
          }
        },
        {
          ask: 'What are your plans for the weekend?',
          expect: { kind: 'keywords', words: ['friends', 'family', 'visit', 'go', 'cinema', 'park', 'sleep', 'work', 'cook', 'meet', 'party', 'trip', 'nothing', 'study', 'play', 'relax'] },
          choices: ['I’m meeting friends.', 'I’m going to the cinema.', 'I’m going to sleep a lot.'],
          react: 'Sounds like a good plan!'
        },
        {
          ask: 'How many hours do you sleep at night?',
          expect: { kind: 'keywords', words: ['hours', 'little', 'lot', 'enough'], numbers: true },
          choices: ['I sleep eight hours.', 'About seven hours.', 'Not enough!'],
          react: 'Sleep is so important. I love a little nap.',
          model: 'I sleep {answer} hours.', modelWhen: 'number'
        }
      ]
    },
    {
      id: 'home', intro: 'I’d like to know about your home.', steps: [
        {
          ask: 'Do you live in a flat or in a house?',
          expect: { kind: 'keywords', words: ['flat', 'apartment', 'house', 'room', 'live', 'parents', 'share'] },
          choices: ['I live in a flat.', 'I live in a house.', 'I share a flat with friends.'],
          react: 'Nice! I love my home too.'
        },
        {
          ask: 'Do you have any brothers or sisters?',
          expect: { kind: 'yesno' },
          choices: ['Yes, I have a brother.', 'Yes, I have a sister.', 'No, I don’t have any.'],
          yes: {
            ask: 'What is your brother’s or sister’s name?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['His name is Max.', 'Her name is Anna.', 'My sister is called Emma.'],
            react: 'What a nice name!'
          },
          no: {
            ask: 'Do you have a lot of friends?',
            expect: { kind: 'yesno' },
            choices: ['Yes, I have lots of friends.', 'Not many, but good ones.'],
            react: 'Good friends are like family.'
          }
        },
        {
          ask: 'Do you have a pet?',
          expect: { kind: 'yesno' },
          choices: ['Yes, I have a cat.', 'Yes, I have a dog.', 'No, I don’t have a pet.'],
          yes: {
            ask: 'What is your pet’s name?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['My cat is called Mimi.', 'My dog’s name is Buddy.'],
            react: 'How sweet!'
          },
          no: {
            ask: 'Which animal would you like to have?',
            expect: { kind: 'keywords', words: ['dog', 'cat', 'bird', 'fish', 'horse', 'rabbit', 'hamster', 'none'] },
            choices: ['I’d like a dog.', 'A cat would be nice.', 'A horse!'],
            react: 'Good choice!'
          }
        },
        {
          ask: 'Which room do you like best?',
          expect: { kind: 'keywords', words: ['kitchen', 'living room', 'living', 'bedroom', 'bathroom', 'balcony', 'garden', 'room', 'office', 'bed'] },
          choices: ['I like my kitchen.', 'The living room.', 'My balcony is the best.'],
          react: 'I bet it’s cosy there.'
        }
      ]
    },
    {
      id: 'travel', intro: 'Let’s talk about travelling!', steps: [
        {
          ask: 'Do you like travelling?',
          expect: { kind: 'yesno' },
          choices: ['Yes, I love travelling.', 'No, I prefer staying at home.'],
          yes: {
            ask: 'Where would you like to go one day?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['I’d like to go to Italy.', 'To Berlin!', 'I want to go to the sea.'],
            react: 'Oh, that sounds wonderful!'
          },
          no: {
            ask: 'What do you like about your town?',
            expect: { kind: 'free', minWords: 2 },
            choices: ['I like the parks.', 'There are good cafés.', 'My friends live here.'],
            react: 'That sounds lovely.'
          }
        },
        {
          ask: 'How do you get to work or school?',
          expect: { kind: 'keywords', words: ['bus', 'train', 'tram', 'underground', 'tube', 'metro', 'car', 'bike', 'bicycle', 'cycle', 'foot', 'walk', 'drive', 'go', 'home'] },
          choices: ['I go by bus.', 'I ride my bike.', 'I walk.'],
          react: 'Practical! I like going by train best.'
        },
        {
          ask: 'What do you always take on a trip?',
          expect: { kind: 'keywords', words: ['book', 'phone', 'camera', 'passport', 'suitcase', 'backpack', 'music', 'headphones', 'snacks', 'water', 'ticket', 'pillow', 'take'] },
          choices: ['I always take a book.', 'My phone and headphones.', 'A camera.'],
          react: 'Good idea, that’s important.'
        },
        {
          ask: 'Where did you go on your last holiday?',
          expect: { kind: 'free', minWords: 1 },
          choices: ['I went to Spain.', 'I was at the seaside.', 'I stayed at home.'],
          react: 'How nice! Tell me more about it another time.'
        }
      ]
    },
    {
      id: 'work', intro: 'Tell me about your everyday life!', steps: [
        {
          ask: 'Do you work, or do you go to school?',
          expect: { kind: 'keywords', words: ['work', 'job', 'school', 'study', 'university', 'uni', 'student', 'college', 'retired', 'both', 'office'] },
          choices: ['I work.', 'I go to school.', 'I study at university.'],
          react: 'Interesting! I bet it’s tiring sometimes.'
        },
        {
          ask: 'What do you like most about it?',
          expect: { kind: 'free', minWords: 2 },
          choices: ['I like talking to my colleagues.', 'I like learning new things.', 'The breaks!'],
          react: 'I understand that well.'
        },
        {
          ask: 'When do you get up in the morning?',
          expect: { kind: 'keywords', words: ['o’clock', "o'clock", 'clock', 'early', 'late', 'half', 'quarter', 'am'], numbers: true },
          choices: ['At seven o’clock.', 'I get up at six.', 'Very late!'],
          react: 'I need a coffee first thing in the morning.',
          model: 'I get up at {answer} o’clock.', modelWhen: 'number'
        },
        {
          ask: 'What would you like to learn next?',
          expect: { kind: 'free', minWords: 2 },
          choices: ['I want to learn the guitar.', 'I want to speak better English.', 'I’d like to learn to cook.'],
          react: 'I’m sure you can do it!'
        }
      ]
    },
    {
      id: 'weather', intro: 'How’s the weather where you are? Let’s talk about it.', steps: [
        {
          ask: 'What’s the weather like today?',
          expect: { kind: 'keywords', words: ['sun', 'sunny', 'shining', 'rain', 'raining', 'rainy', 'warm', 'cold', 'hot', 'wind', 'windy', 'snow', 'snowing', 'cloud', 'cloudy', 'nice', 'grey', 'gray', 'wet', 'cool', 'foggy'] },
          choices: ['The sun is shining.', 'It’s raining.', 'It’s cold and windy.'],
          react: 'It’s quite similar here.'
        },
        {
          ask: 'Do you prefer summer or winter?',
          expect: { kind: 'keywords', words: ['summer', 'winter', 'spring', 'autumn', 'fall', 'both'] },
          choices: ['I prefer summer.', 'I love winter.', 'Spring is my favourite.'],
          react: 'Every season has something nice.'
        },
        {
          ask: 'What do you like doing when it rains?',
          expect: { kind: 'free', minWords: 2 },
          choices: ['I read a book.', 'I drink tea and watch films.', 'I still go outside.'],
          react: 'How cosy!'
        },
        {
          ask: 'How warm is it today, roughly?',
          expect: { kind: 'keywords', words: ['degrees', 'know', 'warm', 'cold', 'hot'], numbers: true },
          choices: ['About twenty degrees.', 'It’s five degrees.', 'I don’t know.'],
          react: 'Thanks! Then I’ll take the right jacket.',
          model: 'It’s {answer} degrees today.', modelWhen: 'number'
        }
      ]
    }
  ]
};

const fr: DialogueContent = {
  lexicon: {
    yes: ['oui', 'ouais', 'bien sûr', 'sûr', 'exactement', 'si', 'adore', 'aime'],
    no: ['non', 'pas', 'jamais', 'aucun', 'aucune', 'rien'],
    numbers: ['zéro', 'un', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'vingt', 'trente', 'demie'],
    hello: ['Bonjour, {learner} ! Ça me fait plaisir de te voir. Je suis {partner}.', 'Salut, {learner} ! C’est {partner}. Je suis content de te parler.'],
    helloAnon: ['Bonjour ! Ça me fait plaisir de te voir. Je suis {partner}.', 'Salut ! C’est {partner}.'],
    story: 'On se connaît grâce à « {story} ».',
    praise: ['Très bien !', 'Super !', 'Génial !', 'Parfait !', 'Exactement !', 'Bravo !'],
    ack: ['Ah, je vois.', 'Intéressant !', 'D’accord, merci !'],
    retry: ['Hum, je n’ai pas bien compris. Tu peux dire par exemple : « {example} »', 'Pas de problème, essaie encore. Par exemple : « {example} »'],
    model: 'En phrase complète : « {model} »',
    moveOn: ['Ce n’est pas grave, on continue !', 'Pas de problème, continuons.'],
    wordIntro: ['J’ai un mot pour toi : « {word} ».', 'Écoute, un nouveau mot : « {word} ».'],
    wordMeaning: 'Ça veut dire : {definition}',
    wordAsk: ['Tu peux dire une phrase avec « {word} » ?', 'Dis-moi une phrase avec « {word} ».'],
    wordPraise: ['Et tu as utilisé « {word} » – bravo !', 'Super, avec « {word} » !'],
    wordRetry: 'Presque ! Utilise le mot « {word} », par exemple : « {example} »',
    wordChoices: {
      any: ['Je connais le mot {word}.', 'Aujourd’hui, j’apprends le mot {word}.'],
      noun: ['Où est {art} {word} ?', 'Voilà {art} {word}.']
    },
    closing: ['C’était une belle conversation ! À bientôt !', 'Merci pour la discussion ! Salut et à la prochaine !'],
    allWords: 'Et tu as utilisé tous tes mots. Bravo !'
  },
  topics: [
    {
      id: 'food', intro: 'Parlons de la cuisine !', steps: [
        {
          ask: 'Qu’est-ce que tu aimes manger ?',
          expect: { kind: 'keywords', words: ['pizza', 'pain', 'gâteau', 'pâtes', 'salade', 'soupe', 'viande', 'poisson', 'fromage', 'fruits', 'pomme', 'riz', 'frites', 'chocolat', 'glace', 'légumes', 'mange', 'aime', 'adore'] },
          choices: ['J’aime la pizza.', 'J’adore le pain avec du fromage.', 'Je mange souvent des pâtes.'],
          react: 'Miam ! Moi aussi, j’aime ça.',
          model: 'J’aime manger {answer}.', modelWhen: 'short'
        },
        {
          ask: 'Tu aimes cuisiner ?',
          expect: { kind: 'yesno' },
          choices: ['Oui, j’aime cuisiner.', 'Non, je n’aime pas cuisiner.'],
          yes: {
            ask: 'Qu’est-ce que tu cuisines le plus souvent ?',
            expect: { kind: 'keywords', words: ['pâtes', 'soupe', 'pizza', 'riz', 'légumes', 'gâteau', 'salade', 'viande', 'poisson', 'œufs', 'cuisine', 'fais', 'prépare'] },
            choices: ['Je cuisine souvent des pâtes.', 'Je fais de la soupe.', 'Je prépare des gâteaux.'],
            react: 'Ça a l’air bon !'
          },
          no: {
            ask: 'Alors, qui cuisine chez toi ?',
            expect: { kind: 'keywords', words: ['mère', 'maman', 'père', 'papa', 'partenaire', 'ami', 'amie', 'femme', 'mari', 'grand-mère', 'personne', 'moi', 'cuisine', 'commande'] },
            choices: ['Ma mère cuisine.', 'Mon mari cuisine souvent.', 'Personne, je commande.'],
            react: 'C’est agréable quand quelqu’un cuisine pour toi !'
          }
        },
        {
          ask: 'Qu’est-ce que tu bois au petit-déjeuner ?',
          expect: { kind: 'keywords', words: ['café', 'thé', 'lait', 'jus', 'eau', 'chocolat', 'bois', 'rien'] },
          choices: ['Je bois du café.', 'Je bois du thé au lait.', 'Je bois du jus d’orange.'],
          react: 'Ah, moi aussi j’aime boire quelque chose de chaud le matin.'
        }
      ]
    },
    {
      id: 'freetime', intro: 'Dis-moi, qu’est-ce que tu fais pendant ton temps libre ?', steps: [
        {
          ask: 'Qu’est-ce que tu aimes faire quand tu es libre ?',
          expect: { kind: 'keywords', words: ['lis', 'lire', 'livre', 'sport', 'foot', 'football', 'nage', 'joue', 'jeux', 'musique', 'écoute', 'danse', 'cuisine', 'marche', 'vélo', 'dessine', 'amis', 'film', 'films', 'regarde', 'sors'] },
          choices: ['J’aime lire des livres.', 'Je joue au foot.', 'J’écoute de la musique.'],
          react: 'Sympa ! Je fais ça aussi parfois.'
        },
        {
          ask: 'Tu aimes le sport ?',
          expect: { kind: 'yesno' },
          choices: ['Oui, j’aime courir.', 'Non, je préfère me reposer.'],
          yes: {
            ask: 'Quel sport est-ce que tu fais ?',
            expect: { kind: 'keywords', words: ['foot', 'football', 'tennis', 'yoga', 'natation', 'nage', 'cours', 'course', 'vélo', 'basket', 'danse', 'joue', 'fais'] },
            choices: ['Je joue au tennis.', 'Je fais de la natation.', 'Je fais du yoga.'],
            react: 'Super, ça garde en forme !'
          },
          no: {
            ask: 'Qu’est-ce que tu préfères faire, alors ?',
            expect: { kind: 'free', minWords: 2 },
            choices: ['Je préfère lire.', 'J’aime regarder des films.'],
            react: 'C’est bien aussi. Se reposer, c’est important !'
          }
        },
        {
          ask: 'Qu’est-ce que tu fais ce week-end ?',
          expect: { kind: 'keywords', words: ['amis', 'famille', 'visite', 'vais', 'cinéma', 'parc', 'dors', 'travaille', 'cuisine', 'vois', 'fête', 'rien', 'joue', 'repose'] },
          choices: ['Je vois des amis.', 'Je vais au cinéma.', 'Je dors beaucoup.'],
          react: 'C’est un bon programme !'
        }
      ]
    },
    {
      id: 'home', intro: 'J’aimerais savoir comment tu vis.', steps: [
        {
          ask: 'Tu habites dans un appartement ou dans une maison ?',
          expect: { kind: 'keywords', words: ['appartement', 'maison', 'colocation', 'chambre', 'habite', 'parents'] },
          choices: ['J’habite dans un appartement.', 'J’habite dans une maison.', 'J’habite en colocation.'],
          react: 'Super ! Moi aussi, j’aime beaucoup mon chez-moi.'
        },
        {
          ask: 'Tu as des frères et sœurs ?',
          expect: { kind: 'yesno' },
          choices: ['Oui, j’ai un frère.', 'Oui, j’ai une sœur.', 'Non, je n’ai pas de frères et sœurs.'],
          yes: {
            ask: 'Comment il s’appelle, ou comment elle s’appelle ?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['Il s’appelle Max.', 'Elle s’appelle Anna.'],
            react: 'C’est un joli prénom !'
          }
        },
        {
          ask: 'Tu as un animal ?',
          expect: { kind: 'yesno' },
          choices: ['Oui, j’ai un chat.', 'Oui, j’ai un chien.', 'Non, je n’ai pas d’animal.'],
          yes: {
            ask: 'Comment s’appelle ton animal ?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['Mon chat s’appelle Mimi.', 'Mon chien s’appelle Rex.'],
            react: 'Trop mignon !'
          },
          no: {
            ask: 'Quel animal est-ce que tu aimerais avoir ?',
            expect: { kind: 'keywords', words: ['chien', 'chat', 'oiseau', 'poisson', 'cheval', 'lapin', 'hamster', 'aucun'] },
            choices: ['J’aimerais un chien.', 'Un chat, ce serait bien.'],
            react: 'Bon choix !'
          }
        }
      ]
    }
  ]
};

const it: DialogueContent = {
  lexicon: {
    yes: ['sì', 'si', 'certo', 'certamente', 'esatto', 'volentieri', 'adoro'],
    no: ['no', 'non', 'mai', 'nessuno', 'niente'],
    numbers: ['zero', 'uno', 'una', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci', 'undici', 'dodici', 'venti', 'trenta', 'mezza'],
    hello: ['Ciao, {learner}! Che bello vederti. Sono {partner}.', 'Buongiorno, {learner}! Sono {partner}. Sono contento di parlare con te.'],
    helloAnon: ['Ciao! Che bello vederti. Sono {partner}.', 'Buongiorno! Sono {partner}.'],
    story: 'Ci conosciamo da «{story}».',
    praise: ['Molto bene!', 'Ottimo!', 'Bravo!', 'Perfetto!', 'Esatto!', 'Fantastico!'],
    ack: ['Ah, capisco.', 'Interessante!', 'Va bene, grazie!'],
    retry: ['Mmh, non ho capito bene. Puoi dire per esempio: «{example}»', 'Nessun problema, prova ancora. Per esempio: «{example}»'],
    model: 'Come frase intera: «{model}»',
    moveOn: ['Non fa niente, andiamo avanti!', 'Nessun problema, continuiamo.'],
    wordIntro: ['Ho una parola per te: «{word}».', 'Ascolta, una parola nuova: «{word}».'],
    wordMeaning: 'Vuol dire: {definition}',
    wordAsk: ['Puoi dire una frase con «{word}»?', 'Dimmi una frase con «{word}».'],
    wordPraise: ['E hai usato «{word}» – bravo!', 'Ottimo, con «{word}»!'],
    wordRetry: 'Quasi! Usa la parola «{word}», per esempio: «{example}»',
    wordChoices: { any: ['Conosco la parola {word}.', 'Oggi imparo la parola {word}.'] },
    closing: ['È stata una bella chiacchierata! A presto!', 'Grazie per la conversazione! Ciao, alla prossima!'],
    allWords: 'E hai usato tutte le tue parole. Bravo!'
  },
  topics: [
    {
      id: 'food', intro: 'Parliamo di cibo!', steps: [
        {
          ask: 'Che cosa ti piace mangiare?',
          expect: { kind: 'keywords', words: ['pizza', 'pane', 'torta', 'pasta', 'insalata', 'zuppa', 'carne', 'pesce', 'formaggio', 'frutta', 'mela', 'riso', 'patate', 'cioccolato', 'gelato', 'verdura', 'mangio', 'piace', 'adoro'] },
          choices: ['Mi piace la pizza.', 'Adoro il pane con il formaggio.', 'Mangio spesso la pasta.'],
          react: 'Buonissimo! Piace anche a me.'
        },
        {
          ask: 'Ti piace cucinare?',
          expect: { kind: 'yesno' },
          choices: ['Sì, mi piace cucinare.', 'No, non mi piace cucinare.'],
          yes: {
            ask: 'Che cosa cucini più spesso?',
            expect: { kind: 'keywords', words: ['pasta', 'zuppa', 'pizza', 'riso', 'risotto', 'verdura', 'torta', 'insalata', 'carne', 'pesce', 'cucino', 'faccio', 'preparo'] },
            choices: ['Cucino spesso la pasta.', 'Faccio il risotto.', 'Preparo le torte.'],
            react: 'Sembra buono!'
          },
          no: {
            ask: 'Allora chi cucina a casa tua?',
            expect: { kind: 'keywords', words: ['madre', 'mamma', 'padre', 'papà', 'partner', 'amico', 'amica', 'moglie', 'marito', 'nonna', 'nessuno', 'io', 'cucina', 'ordino'] },
            choices: ['Cucina mia madre.', 'Mio marito cucina spesso.', 'Nessuno, ordino.'],
            react: 'È bello quando qualcuno cucina per te!'
          }
        },
        {
          ask: 'Che cosa bevi a colazione?',
          expect: { kind: 'keywords', words: ['caffè', 'cappuccino', 'tè', 'latte', 'succo', 'acqua', 'cioccolata', 'bevo', 'niente'] },
          choices: ['Bevo un caffè.', 'Bevo un cappuccino.', 'Bevo il succo d’arancia.'],
          react: 'Ah, anche a me piace bere qualcosa di caldo la mattina.'
        }
      ]
    },
    {
      id: 'freetime', intro: 'Dimmi, che cosa fai nel tempo libero?', steps: [
        {
          ask: 'Che cosa ti piace fare quando sei libero?',
          expect: { kind: 'keywords', words: ['leggo', 'leggere', 'libro', 'libri', 'sport', 'calcio', 'nuoto', 'gioco', 'giochi', 'musica', 'ascolto', 'ballo', 'cucino', 'cammino', 'bici', 'disegno', 'amici', 'film', 'guardo', 'esco'] },
          choices: ['Mi piace leggere libri.', 'Gioco a calcio.', 'Ascolto la musica.'],
          react: 'Bello! Lo faccio anch’io a volte.'
        },
        {
          ask: 'Ti piace lo sport?',
          expect: { kind: 'yesno' },
          choices: ['Sì, mi piace correre.', 'No, preferisco riposare.'],
          yes: {
            ask: 'Quale sport fai?',
            expect: { kind: 'keywords', words: ['calcio', 'tennis', 'yoga', 'nuoto', 'corro', 'corsa', 'bici', 'basket', 'pallavolo', 'ballo', 'palestra', 'gioco', 'faccio'] },
            choices: ['Gioco a tennis.', 'Faccio nuoto.', 'Faccio yoga.'],
            react: 'Ottimo, così resti in forma!'
          },
          no: {
            ask: 'Allora che cosa preferisci fare?',
            expect: { kind: 'free', minWords: 2 },
            choices: ['Preferisco leggere.', 'Mi piace guardare i film.'],
            react: 'Anche questo è bello. Riposare è importante!'
          }
        },
        {
          ask: 'Che cosa fai questo fine settimana?',
          expect: { kind: 'keywords', words: ['amici', 'famiglia', 'visito', 'vado', 'cinema', 'parco', 'dormo', 'lavoro', 'cucino', 'vedo', 'festa', 'niente', 'gioco', 'riposo'] },
          choices: ['Vedo gli amici.', 'Vado al cinema.', 'Dormo tanto.'],
          react: 'Mi sembra un buon programma!'
        }
      ]
    },
    {
      id: 'home', intro: 'Vorrei sapere qualcosa della tua casa.', steps: [
        {
          ask: 'Abiti in un appartamento o in una casa?',
          expect: { kind: 'keywords', words: ['appartamento', 'casa', 'stanza', 'abito', 'vivo', 'genitori'] },
          choices: ['Abito in un appartamento.', 'Abito in una casa.', 'Vivo con i miei genitori.'],
          react: 'Bello! Anch’io amo molto casa mia.'
        },
        {
          ask: 'Hai fratelli o sorelle?',
          expect: { kind: 'yesno' },
          choices: ['Sì, ho un fratello.', 'Sì, ho una sorella.', 'No, non ho fratelli.'],
          yes: {
            ask: 'Come si chiama?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['Si chiama Marco.', 'Si chiama Anna.'],
            react: 'Che bel nome!'
          }
        },
        {
          ask: 'Hai un animale?',
          expect: { kind: 'yesno' },
          choices: ['Sì, ho un gatto.', 'Sì, ho un cane.', 'No, non ho animali.'],
          yes: {
            ask: 'Come si chiama il tuo animale?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['Il mio gatto si chiama Mimì.', 'Il mio cane si chiama Fido.'],
            react: 'Che carino!'
          },
          no: {
            ask: 'Quale animale vorresti avere?',
            expect: { kind: 'keywords', words: ['cane', 'gatto', 'uccello', 'pesce', 'cavallo', 'coniglio', 'criceto', 'nessuno'] },
            choices: ['Vorrei un cane.', 'Un gatto sarebbe bello.'],
            react: 'Bella scelta!'
          }
        }
      ]
    }
  ]
};

const es: DialogueContent = {
  lexicon: {
    yes: ['sí', 'si', 'claro', 'vale', 'exacto', 'mucho', 'encanta'],
    no: ['no', 'nunca', 'nada', 'ninguno', 'ninguna', 'tampoco'],
    numbers: ['cero', 'uno', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'veinte', 'treinta', 'media'],
    hello: ['¡Hola, {learner}! Qué bien verte. Soy {partner}.', '¡Buenos días, {learner}! Soy {partner}. Me alegra hablar contigo.'],
    helloAnon: ['¡Hola! Qué bien verte. Soy {partner}.', '¡Buenos días! Soy {partner}.'],
    story: 'Nos conocemos de «{story}».',
    praise: ['¡Muy bien!', '¡Genial!', '¡Estupendo!', '¡Perfecto!', '¡Exacto!', '¡Bravo!'],
    ack: ['Ah, ya veo.', '¡Interesante!', '¡Vale, gracias!'],
    retry: ['Mmm, no te he entendido bien. Puedes decir, por ejemplo: «{example}»', 'No pasa nada, inténtalo otra vez. Por ejemplo: «{example}»'],
    model: 'Como frase completa: «{model}»',
    moveOn: ['¡No importa, seguimos!', 'No pasa nada, continuamos.'],
    wordIntro: ['Tengo una palabra para ti: «{word}».', 'Escucha, una palabra nueva: «{word}».'],
    wordMeaning: 'Significa: {definition}',
    wordAsk: ['¿Puedes decir una frase con «{word}»?', 'Dime una frase con «{word}».'],
    wordPraise: ['¡Y has usado «{word}»! ¡Muy bien!', '¡Genial, con «{word}»!'],
    wordRetry: '¡Casi! Usa la palabra «{word}», por ejemplo: «{example}»',
    wordChoices: { any: ['Conozco la palabra {word}.', 'Hoy aprendo la palabra {word}.'] },
    closing: ['¡Ha sido una conversación muy bonita! ¡Hasta pronto!', '¡Gracias por la charla! ¡Adiós y hasta la próxima!'],
    allWords: 'Y has usado todas tus palabras. ¡Bravo!'
  },
  topics: [
    {
      id: 'food', intro: '¡Hablemos de comida!', steps: [
        {
          ask: '¿Qué te gusta comer?',
          expect: { kind: 'keywords', words: ['pizza', 'pan', 'tarta', 'pasta', 'ensalada', 'sopa', 'carne', 'pescado', 'queso', 'fruta', 'manzana', 'arroz', 'paella', 'patatas', 'chocolate', 'helado', 'verduras', 'como', 'gusta', 'encanta'] },
          choices: ['Me gusta la pizza.', 'Me encanta el pan con queso.', 'Como mucha pasta.'],
          react: '¡Qué rico! A mí también me gusta.'
        },
        {
          ask: '¿Te gusta cocinar?',
          expect: { kind: 'yesno' },
          choices: ['Sí, me gusta cocinar.', 'No, no me gusta cocinar.'],
          yes: {
            ask: '¿Qué cocinas más a menudo?',
            expect: { kind: 'keywords', words: ['pasta', 'sopa', 'pizza', 'arroz', 'paella', 'verduras', 'tarta', 'ensalada', 'carne', 'pescado', 'tortilla', 'cocino', 'hago', 'preparo'] },
            choices: ['Cocino pasta a menudo.', 'Hago tortilla.', 'Preparo sopa.'],
            react: '¡Suena muy bien!'
          },
          no: {
            ask: 'Entonces, ¿quién cocina en tu casa?',
            expect: { kind: 'keywords', words: ['madre', 'mamá', 'padre', 'papá', 'pareja', 'amigo', 'amiga', 'mujer', 'marido', 'abuela', 'nadie', 'yo', 'cocina', 'pido'] },
            choices: ['Cocina mi madre.', 'Mi pareja cocina mucho.', 'Nadie, pido comida.'],
            react: '¡Qué bien que alguien cocine para ti!'
          }
        },
        {
          ask: '¿Qué bebes en el desayuno?',
          expect: { kind: 'keywords', words: ['café', 'té', 'leche', 'zumo', 'jugo', 'agua', 'chocolate', 'bebo', 'tomo', 'nada'] },
          choices: ['Bebo café.', 'Tomo té con leche.', 'Bebo zumo de naranja.'],
          react: 'Ah, a mí también me gusta tomar algo caliente por la mañana.'
        }
      ]
    },
    {
      id: 'freetime', intro: 'Cuéntame, ¿qué haces en tu tiempo libre?', steps: [
        {
          ask: '¿Qué te gusta hacer cuando tienes tiempo libre?',
          expect: { kind: 'keywords', words: ['leo', 'leer', 'libro', 'libros', 'deporte', 'fútbol', 'nado', 'juego', 'juegos', 'música', 'escucho', 'bailo', 'cocino', 'camino', 'bici', 'dibujo', 'amigos', 'película', 'películas', 'veo', 'salgo'] },
          choices: ['Me gusta leer libros.', 'Juego al fútbol.', 'Escucho música.'],
          react: '¡Qué bien! Yo también lo hago a veces.'
        },
        {
          ask: '¿Te gusta el deporte?',
          expect: { kind: 'yesno' },
          choices: ['Sí, me gusta correr.', 'No, prefiero descansar.'],
          yes: {
            ask: '¿Qué deporte haces?',
            expect: { kind: 'keywords', words: ['fútbol', 'tenis', 'yoga', 'natación', 'nado', 'corro', 'bici', 'baloncesto', 'bailo', 'gimnasio', 'juego', 'hago'] },
            choices: ['Juego al tenis.', 'Hago natación.', 'Hago yoga.'],
            react: '¡Genial, así te mantienes en forma!'
          },
          no: {
            ask: 'Entonces, ¿qué prefieres hacer?',
            expect: { kind: 'free', minWords: 2 },
            choices: ['Prefiero leer.', 'Me gusta ver películas.'],
            react: 'Eso también está bien. ¡Descansar es importante!'
          }
        },
        {
          ask: '¿Qué vas a hacer este fin de semana?',
          expect: { kind: 'keywords', words: ['amigos', 'familia', 'visitar', 'voy', 'cine', 'parque', 'dormir', 'trabajar', 'cocinar', 'ver', 'fiesta', 'nada', 'jugar', 'descansar'] },
          choices: ['Voy a ver a mis amigos.', 'Voy al cine.', 'Voy a dormir mucho.'],
          react: '¡Es un buen plan!'
        }
      ]
    },
    {
      id: 'home', intro: 'Me gustaría saber algo de tu casa.', steps: [
        {
          ask: '¿Vives en un piso o en una casa?',
          expect: { kind: 'keywords', words: ['piso', 'apartamento', 'casa', 'habitación', 'vivo', 'padres', 'comparto'] },
          choices: ['Vivo en un piso.', 'Vivo en una casa.', 'Comparto piso con amigos.'],
          react: '¡Qué bien! A mí también me encanta mi casa.'
        },
        {
          ask: '¿Tienes hermanos?',
          expect: { kind: 'yesno' },
          choices: ['Sí, tengo un hermano.', 'Sí, tengo una hermana.', 'No, no tengo hermanos.'],
          yes: {
            ask: '¿Cómo se llama?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['Se llama Pablo.', 'Se llama Ana.'],
            react: '¡Qué nombre tan bonito!'
          }
        },
        {
          ask: '¿Tienes una mascota?',
          expect: { kind: 'yesno' },
          choices: ['Sí, tengo un gato.', 'Sí, tengo un perro.', 'No, no tengo mascota.'],
          yes: {
            ask: '¿Cómo se llama tu mascota?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['Mi gato se llama Misi.', 'Mi perro se llama Toby.'],
            react: '¡Qué mono!'
          },
          no: {
            ask: '¿Qué animal te gustaría tener?',
            expect: { kind: 'keywords', words: ['perro', 'gato', 'pájaro', 'pez', 'caballo', 'conejo', 'hámster', 'ninguno'] },
            choices: ['Me gustaría un perro.', 'Un gato estaría bien.'],
            react: '¡Buena elección!'
          }
        }
      ]
    }
  ]
};

const pt: DialogueContent = {
  lexicon: {
    yes: ['sim', 'claro', 'exato', 'exatamente', 'muito', 'adoro', 'gosto'],
    no: ['não', 'nao', 'nunca', 'nada', 'nenhum', 'nenhuma'],
    numbers: ['zero', 'um', 'uma', 'dois', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'vinte', 'trinta', 'meia'],
    hello: ['Olá, {learner}! Que bom ver-te. Sou {partner}.', 'Bom dia, {learner}! Sou {partner}. Fico contente por falar contigo.'],
    helloAnon: ['Olá! Que bom ver-te. Sou {partner}.', 'Bom dia! Sou {partner}.'],
    story: 'Conhecemo-nos de «{story}».',
    praise: ['Muito bem!', 'Ótimo!', 'Fantástico!', 'Perfeito!', 'Exatamente!', 'Boa!'],
    ack: ['Ah, estou a ver.', 'Interessante!', 'Está bem, obrigado!'],
    retry: ['Hum, não percebi bem. Podes dizer, por exemplo: «{example}»', 'Não faz mal, tenta outra vez. Por exemplo: «{example}»'],
    model: 'Numa frase completa: «{model}»',
    moveOn: ['Não faz mal, vamos continuar!', 'Sem problema, continuamos.'],
    wordIntro: ['Tenho uma palavra para ti: «{word}».', 'Ouve, uma palavra nova: «{word}».'],
    wordMeaning: 'Quer dizer: {definition}',
    wordAsk: ['Consegues dizer uma frase com «{word}»?', 'Diz-me uma frase com «{word}».'],
    wordPraise: ['E usaste «{word}» – muito bem!', 'Ótimo, com «{word}»!'],
    wordRetry: 'Quase! Usa a palavra «{word}», por exemplo: «{example}»',
    wordChoices: { any: ['Conheço a palavra {word}.', 'Hoje aprendo a palavra {word}.'] },
    closing: ['Foi uma conversa muito boa! Até breve!', 'Obrigado pela conversa! Adeus e até à próxima!'],
    allWords: 'E usaste todas as tuas palavras. Parabéns!'
  },
  topics: [
    {
      id: 'food', intro: 'Vamos falar de comida!', steps: [
        {
          ask: 'O que é que gostas de comer?',
          expect: { kind: 'keywords', words: ['pizza', 'pão', 'bolo', 'massa', 'salada', 'sopa', 'carne', 'peixe', 'queijo', 'fruta', 'maçã', 'arroz', 'batatas', 'chocolate', 'gelado', 'legumes', 'bacalhau', 'como', 'gosto', 'adoro'] },
          choices: ['Gosto de pizza.', 'Adoro pão com queijo.', 'Como muita sopa.'],
          react: 'Que bom! Eu também gosto.'
        },
        {
          ask: 'Gostas de cozinhar?',
          expect: { kind: 'yesno' },
          choices: ['Sim, gosto de cozinhar.', 'Não, não gosto de cozinhar.'],
          yes: {
            ask: 'O que é que cozinhas mais vezes?',
            expect: { kind: 'keywords', words: ['massa', 'sopa', 'pizza', 'arroz', 'legumes', 'bolo', 'salada', 'carne', 'peixe', 'bacalhau', 'cozinho', 'faço', 'preparo'] },
            choices: ['Cozinho muita massa.', 'Faço sopa.', 'Faço bolos.'],
            react: 'Parece ótimo!'
          },
          no: {
            ask: 'Então, quem cozinha em tua casa?',
            expect: { kind: 'keywords', words: ['mãe', 'pai', 'namorado', 'namorada', 'amigo', 'amiga', 'mulher', 'marido', 'avó', 'ninguém', 'eu', 'cozinha', 'peço'] },
            choices: ['A minha mãe cozinha.', 'O meu marido cozinha muito.', 'Ninguém, peço comida.'],
            react: 'É bom quando alguém cozinha para ti!'
          }
        },
        {
          ask: 'O que é que bebes ao pequeno-almoço?',
          expect: { kind: 'keywords', words: ['café', 'chá', 'leite', 'sumo', 'água', 'chocolate', 'galão', 'bebo', 'nada'] },
          choices: ['Bebo café.', 'Bebo chá com leite.', 'Bebo sumo de laranja.'],
          react: 'Ah, eu também gosto de beber algo quente de manhã.'
        }
      ]
    },
    {
      id: 'freetime', intro: 'Conta-me, o que fazes no teu tempo livre?', steps: [
        {
          ask: 'O que é que gostas de fazer quando estás livre?',
          expect: { kind: 'keywords', words: ['leio', 'ler', 'livro', 'livros', 'desporto', 'futebol', 'nado', 'jogo', 'jogos', 'música', 'ouço', 'danço', 'cozinho', 'caminho', 'bicicleta', 'desenho', 'amigos', 'filme', 'filmes', 'vejo', 'saio'] },
          choices: ['Gosto de ler livros.', 'Jogo futebol.', 'Ouço música.'],
          react: 'Que giro! Eu também faço isso às vezes.'
        },
        {
          ask: 'Gostas de desporto?',
          expect: { kind: 'yesno' },
          choices: ['Sim, gosto de correr.', 'Não, prefiro descansar.'],
          yes: {
            ask: 'Que desporto fazes?',
            expect: { kind: 'keywords', words: ['futebol', 'ténis', 'ioga', 'yoga', 'natação', 'nado', 'corro', 'bicicleta', 'basquetebol', 'danço', 'ginásio', 'jogo', 'faço'] },
            choices: ['Jogo ténis.', 'Faço natação.', 'Faço ioga.'],
            react: 'Ótimo, assim ficas em forma!'
          },
          no: {
            ask: 'Então, o que preferes fazer?',
            expect: { kind: 'free', minWords: 2 },
            choices: ['Prefiro ler.', 'Gosto de ver filmes.'],
            react: 'Isso também é bom. Descansar é importante!'
          }
        },
        {
          ask: 'O que vais fazer este fim de semana?',
          expect: { kind: 'keywords', words: ['amigos', 'família', 'visitar', 'vou', 'cinema', 'parque', 'dormir', 'trabalhar', 'cozinhar', 'ver', 'festa', 'nada', 'jogar', 'descansar', 'praia'] },
          choices: ['Vou estar com amigos.', 'Vou ao cinema.', 'Vou à praia.'],
          react: 'É um bom plano!'
        }
      ]
    },
    {
      id: 'home', intro: 'Gostava de saber algo sobre a tua casa.', steps: [
        {
          ask: 'Vives num apartamento ou numa casa?',
          expect: { kind: 'keywords', words: ['apartamento', 'casa', 'quarto', 'vivo', 'moro', 'pais'] },
          choices: ['Vivo num apartamento.', 'Vivo numa casa.', 'Moro com os meus pais.'],
          react: 'Que bom! Eu também gosto muito da minha casa.'
        },
        {
          ask: 'Tens irmãos?',
          expect: { kind: 'yesno' },
          choices: ['Sim, tenho um irmão.', 'Sim, tenho uma irmã.', 'Não, não tenho irmãos.'],
          yes: {
            ask: 'Como se chama?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['Chama-se João.', 'Chama-se Ana.'],
            react: 'Que nome bonito!'
          }
        },
        {
          ask: 'Tens um animal de estimação?',
          expect: { kind: 'yesno' },
          choices: ['Sim, tenho um gato.', 'Sim, tenho um cão.', 'Não, não tenho.'],
          yes: {
            ask: 'Como se chama o teu animal?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['O meu gato chama-se Mimi.', 'O meu cão chama-se Bobi.'],
            react: 'Que fofo!'
          },
          no: {
            ask: 'Que animal gostavas de ter?',
            expect: { kind: 'keywords', words: ['cão', 'gato', 'pássaro', 'peixe', 'cavalo', 'coelho', 'hamster', 'nenhum'] },
            choices: ['Gostava de ter um cão.', 'Um gato seria bom.'],
            react: 'Boa escolha!'
          }
        }
      ]
    }
  ]
};

const uk: DialogueContent = {
  lexicon: {
    yes: ['так', 'звісно', 'звичайно', 'авжеж', 'люблю', 'дуже'],
    no: ['ні', 'не', 'ніколи', 'нічого', 'немає', 'нема'],
    numbers: ['нуль', 'один', 'одна', 'два', 'дві', 'три', 'чотири', "п'ять", 'пʼять', 'шість', 'сім', 'вісім', "дев'ять", 'девʼять', 'десять', 'одинадцять', 'дванадцять', 'двадцять', 'тридцять', 'пів'],
    hello: ['Привіт, {learner}! Радий тебе бачити. Я {partner}.', 'Добрий день, {learner}! Це {partner}. Приємно з тобою поговорити.'],
    helloAnon: ['Привіт! Радий тебе бачити. Я {partner}.', 'Добрий день! Це {partner}.'],
    story: 'Ми знайомі з історії «{story}».',
    praise: ['Дуже добре!', 'Чудово!', 'Супер!', 'Ідеально!', 'Саме так!', 'Молодець!'],
    ack: ['А, зрозуміло.', 'Цікаво!', 'Добре, дякую!'],
    retry: ['Гм, я не зовсім зрозумів. Можна сказати, наприклад: «{example}»', 'Нічого страшного, спробуй ще раз. Наприклад: «{example}»'],
    model: 'Повним реченням: «{model}»',
    moveOn: ['Нічого, йдемо далі!', 'Без проблем, продовжуймо.'],
    wordIntro: ['У мене є слово для тебе: «{word}».', 'Послухай нове слово: «{word}».'],
    wordMeaning: 'Це означає: {definition}',
    wordAsk: ['Можеш сказати речення зі словом «{word}»?', 'Скажи мені речення зі словом «{word}».'],
    wordPraise: ['І ти вжив слово «{word}» – молодець!', 'Чудово, зі словом «{word}»!'],
    wordRetry: 'Майже! Вживи слово «{word}», наприклад: «{example}»',
    wordChoices: { any: ['Я знаю слово {word}.', 'Сьогодні я вчу слово {word}.'] },
    closing: ['Це була чудова розмова! До зустрічі!', 'Дякую за розмову! Бувай, до наступного разу!'],
    allWords: 'І ти вжив усі свої слова. Браво!'
  },
  topics: [
    {
      id: 'food', intro: 'Поговорімо про їжу!', steps: [
        {
          ask: 'Що ти любиш їсти?',
          expect: { kind: 'keywords', words: ['піца', 'піцу', 'хліб', 'торт', 'макарони', 'салат', 'суп', 'борщ', 'вареники', 'мʼясо', "м'ясо", 'рибу', 'риба', 'сир', 'фрукти', 'яблука', 'рис', 'картоплю', 'шоколад', 'морозиво', 'овочі', 'їм', 'люблю'] },
          choices: ['Я люблю піцу.', 'Я люблю хліб із сиром.', 'Я часто їм борщ.'],
          react: 'Смачно! Я теж це люблю.'
        },
        {
          ask: 'Ти любиш готувати?',
          expect: { kind: 'yesno' },
          choices: ['Так, я люблю готувати.', 'Ні, я не люблю готувати.'],
          yes: {
            ask: 'Що ти готуєш найчастіше?',
            expect: { kind: 'keywords', words: ['макарони', 'суп', 'борщ', 'вареники', 'піцу', 'рис', 'овочі', 'торт', 'салат', 'мʼясо', "м'ясо", 'рибу', 'готую', 'роблю', 'печу'] },
            choices: ['Я часто готую борщ.', 'Я роблю вареники.', 'Я печу торти.'],
            react: 'Звучить смачно!'
          },
          no: {
            ask: 'А хто готує у тебе вдома?',
            expect: { kind: 'keywords', words: ['мама', 'тато', 'батько', 'мати', 'партнер', 'друг', 'подруга', 'дружина', 'чоловік', 'бабуся', 'ніхто', 'я', 'готує', 'замовляю'] },
            choices: ['Моя мама готує.', 'Мій чоловік часто готує.', 'Ніхто, я замовляю їжу.'],
            react: 'Як добре, коли хтось готує для тебе!'
          }
        },
        {
          ask: 'Що ти п’єш на сніданок?',
          expect: { kind: 'keywords', words: ['каву', 'кава', 'чай', 'молоко', 'сік', 'воду', 'вода', 'какао', 'пʼю', "п'ю", 'п’ю', 'нічого'] },
          choices: ['Я п’ю каву.', 'Я п’ю чай із молоком.', 'Я п’ю апельсиновий сік.'],
          react: 'О, я теж люблю вранці випити щось тепле.'
        }
      ]
    },
    {
      id: 'freetime', intro: 'Розкажи, що ти робиш у вільний час?', steps: [
        {
          ask: 'Що ти любиш робити, коли маєш вільний час?',
          expect: { kind: 'keywords', words: ['читаю', 'читати', 'книжки', 'книги', 'спорт', 'футбол', 'плаваю', 'граю', 'ігри', 'музику', 'слухаю', 'танцюю', 'готую', 'гуляю', 'велосипед', 'малюю', 'друзями', 'фільми', 'дивлюся', 'зустрічаюся'] },
          choices: ['Я люблю читати книжки.', 'Я граю у футбол.', 'Я слухаю музику.'],
          react: 'Класно! Я теж іноді так роблю.'
        },
        {
          ask: 'Ти любиш спорт?',
          expect: { kind: 'yesno' },
          choices: ['Так, я люблю бігати.', 'Ні, я краще відпочиваю.'],
          yes: {
            ask: 'Яким спортом ти займаєшся?',
            expect: { kind: 'keywords', words: ['футбол', 'теніс', 'йога', 'йогою', 'плавання', 'плаваю', 'бігаю', 'велосипед', 'баскетбол', 'танцюю', 'спортзал', 'граю', 'займаюся'] },
            choices: ['Я граю в теніс.', 'Я плаваю.', 'Я займаюся йогою.'],
            react: 'Чудово, це тримає у формі!'
          },
          no: {
            ask: 'А що ти любиш робити замість цього?',
            expect: { kind: 'free', minWords: 2 },
            choices: ['Я краще читаю.', 'Я люблю дивитися фільми.'],
            react: 'Це теж добре. Відпочинок – це важливо!'
          }
        },
        {
          ask: 'Що ти робиш цими вихідними?',
          expect: { kind: 'keywords', words: ['друзями', 'друзів', 'родиною', 'сімʼєю', "сім'єю", 'їду', 'йду', 'кіно', 'парк', 'сплю', 'працюю', 'готую', 'зустрічаюся', 'вечірку', 'нічого', 'відпочиваю'] },
          choices: ['Я зустрічаюся з друзями.', 'Я йду в кіно.', 'Я довго сплю.'],
          react: 'Гарний план!'
        }
      ]
    },
    {
      id: 'home', intro: 'Я хочу дізнатися про твій дім.', steps: [
        {
          ask: 'Ти живеш у квартирі чи в будинку?',
          expect: { kind: 'keywords', words: ['квартирі', 'квартира', 'будинку', 'будинок', 'кімнаті', 'живу', 'батьками'] },
          choices: ['Я живу у квартирі.', 'Я живу в будинку.', 'Я живу з батьками.'],
          react: 'Чудово! Я теж дуже люблю свій дім.'
        },
        {
          ask: 'У тебе є брати чи сестри?',
          expect: { kind: 'yesno' },
          choices: ['Так, у мене є брат.', 'Так, у мене є сестра.', 'Ні, у мене немає.'],
          yes: {
            ask: 'Як його або її звати?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['Його звати Андрій.', 'Її звати Оля.'],
            react: 'Гарне ім’я!'
          }
        },
        {
          ask: 'У тебе є домашня тварина?',
          expect: { kind: 'yesno' },
          choices: ['Так, у мене є кіт.', 'Так, у мене є собака.', 'Ні, у мене немає тварини.'],
          yes: {
            ask: 'Як звати твою тварину?',
            expect: { kind: 'free', minWords: 1 },
            choices: ['Мого кота звати Мурчик.', 'Мою собаку звати Бім.'],
            react: 'Як мило!'
          },
          no: {
            ask: 'Яку тварину ти хотів би мати?',
            expect: { kind: 'keywords', words: ['собаку', 'собака', 'кота', 'кішку', 'пташку', 'рибку', 'коня', 'кролика', 'хомʼяка', "хом'яка", 'жодну'] },
            choices: ['Я хотів би собаку.', 'Кота було б чудово.'],
            react: 'Гарний вибір!'
          }
        }
      ]
    }
  ]
};

export const dialogues: Record<Language, DialogueContent> = { de, en, fr, it, es, pt, uk };

/** Topics each partner likes to talk about (see partners.ts); the others get any topic. */
export const partnerTopics: Record<string, readonly TopicId[]> = {
  mia: ['freetime', 'food', 'travel'],
  leo: ['freetime', 'food'],
  oma: ['food', 'home'],
  tom: ['travel', 'food'],
  kim: ['freetime', 'travel'],
  paul: ['weather', 'travel', 'home'],
  lilith: ['home', 'food'],
  hans: ['weather', 'travel', 'food'],
  albert: ['travel', 'weather'],
  sabine: ['travel', 'work'],
  enzo: ['food'],
  jana: ['work', 'freetime'],
  becker: ['work', 'freetime'],
  ludwig: ['travel'],
  ali: ['food', 'home'],
  robert: ['home', 'work'],
  fritz: ['weather', 'home'],
  tobias: ['freetime', 'food'],
  selma: ['work', 'home'],
  simon: ['work', 'travel'],
  banker: ['work', 'home'],
  wirt: ['food']
};
