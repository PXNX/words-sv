import { playableLanguages, vocabularyLevels, wordDefinitions, wordMetadata, wordPools, type Language, type VocabularyLevel } from '#lib/data/vocabulary.js';
import type { SoundEffect } from '#lib/sounds.js';
import { MASTERY_THRESHOLD, VOCABULARY_REVIEW_STORAGE_PREFIX, normalizeReviewProgress, prioritizeLearningWords, type ReviewProgress } from '#lib/vocab/spacedRepetition.js';
import { readMissedWords } from './missedWords';
import type { Story, StoryBeat, Text } from './stories';

/*
 * Stories built on the fly around the learner's own words: first the words they recently got wrong
 * in other modes, then words of their level they have not mastered yet. Mia, Tom and Lilith weave
 * each word into a small evening at home, so every generated story is grammatical in every
 * language: the words are always quoted, never inflected.
 */
type Cue = { text: string; sfx?: SoundEffect };
type Templates = {
  title: string;
  openings: Cue[];
  introMissed: string;
  introNew: string;
  defAsk: string;
  defAnswer: string;
  defQuestion: string;
  wordQuestion: string;
  confirm: string;
  hearAsk: string;
  hearQuestion: string;
  lilithLine: string;
  interludes: Cue[];
  closing: string;
  closingNarration: string;
  articleAsk?: string;
};

const templates: Record<Language, Templates> = {
  de: {
    title: 'Wörterabend mit Lilith',
    openings: [
      { text: 'Es regnet. Mia, Tom und Lilith sitzen zusammen auf dem Sofa.', sfx: 'rain' },
      { text: 'Mia kocht Tee. Tom liest, und Lilith schläft auf dem Wörterbuch.', sfx: 'purr' },
      { text: 'Es klopft. {name} kommt zu Besuch, und Lilith läuft sofort zur Tür.', sfx: 'knock' }
    ],
    introMissed: 'Schön, dass du da bist, {name}! Heute üben wir ein paar schwierige Wörter. Keine Sorge, wir helfen dir.',
    introNew: 'Schön, dass du da bist, {name}! Heute lernen wir zusammen neue Wörter.',
    defAsk: 'Ich habe heute das Wort „{word}“ gelesen. Was bedeutet das?',
    defAnswer: 'Das ist leicht: {definition}',
    defQuestion: 'Was bedeutet „{word}“?',
    wordQuestion: 'Welches Wort passt: {definition}',
    confirm: 'Genau, „{word}“! Das merken wir uns.',
    hearAsk: 'Hör mal, {name}: „{word}“. Kannst du dir das Wort merken?',
    hearQuestion: 'Welches Wort hast du gehört?',
    lilithLine: 'Miau! Ich mag Wörter fast so gern wie Fisch.',
    interludes: [
      { text: 'Klirr! Tom hat eine Tasse fallen lassen. Lilith schaut ihn streng an.', sfx: 'glass' },
      { text: 'Draußen bremst ein Auto. Lilith springt erschrocken vom Sofa.', sfx: 'brakes' },
      { text: 'Es klingelt an der Tür. Es ist nur der Nachbar mit einem Paket.', sfx: 'doorbell' },
      { text: 'Lilith kommt zu dir und schnurrt ganz leise.', sfx: 'purr' }
    ],
    closing: 'Super gemacht, {name}! Lilith ist stolz auf dich.',
    closingNarration: 'Lilith rollt sich auf deinem Schoß zusammen und schnurrt.',
    articleAsk: '{name}, sagt man der, die oder das „{word}“?'
  },
  en: {
    title: 'Word night with Lilith',
    openings: [
      { text: 'It is raining. Mia, Tom and Lilith are sitting together on the sofa.', sfx: 'rain' },
      { text: 'Mia is making tea. Tom is reading, and Lilith is asleep on the dictionary.', sfx: 'purr' },
      { text: 'Knock, knock. {name} comes to visit, and Lilith runs straight to the door.', sfx: 'knock' }
    ],
    introMissed: 'Great to see you, {name}! Today we’ll practise a few tricky words. Don’t worry, we’ll help you.',
    introNew: 'Great to see you, {name}! Today we’ll learn some new words together.',
    defAsk: 'Today I read the word “{word}”. What does it mean?',
    defAnswer: 'That’s easy: {definition}',
    defQuestion: 'What does “{word}” mean?',
    wordQuestion: 'Which word fits: {definition}',
    confirm: 'Exactly, “{word}”! Let’s remember that one.',
    hearAsk: 'Listen, {name}: “{word}”. Can you remember that word?',
    hearQuestion: 'Which word did you hear?',
    lilithLine: 'Meow! I like words almost as much as fish.',
    interludes: [
      { text: 'Crash! Tom dropped a cup. Lilith gives him a stern look.', sfx: 'glass' },
      { text: 'Outside, a car brakes. Lilith jumps off the sofa in fright.', sfx: 'brakes' },
      { text: 'The doorbell rings. It’s only the neighbour with a parcel.', sfx: 'doorbell' },
      { text: 'Lilith comes over to you and purrs very softly.', sfx: 'purr' }
    ],
    closing: 'Well done, {name}! Lilith is proud of you.',
    closingNarration: 'Lilith curls up in your lap and purrs.'
  },
  fr: {
    title: 'Soirée des mots avec Lilith',
    openings: [
      { text: 'Il pleut. Mia, Tom et Lilith sont assis ensemble sur le canapé.', sfx: 'rain' },
      { text: 'Mia prépare du thé. Tom lit, et Lilith dort sur le dictionnaire.', sfx: 'purr' },
      { text: 'Toc, toc ! {name} vient en visite, et Lilith court tout de suite à la porte.', sfx: 'knock' }
    ],
    introMissed: 'Contente de te voir, {name} ! Aujourd’hui, on révise quelques mots difficiles. Pas de souci, on t’aide.',
    introNew: 'Contente de te voir, {name} ! Aujourd’hui, on apprend de nouveaux mots ensemble.',
    defAsk: 'Aujourd’hui, j’ai lu le mot « {word} ». Qu’est-ce que ça veut dire ?',
    defAnswer: 'C’est facile : {definition}',
    defQuestion: 'Que veut dire « {word} » ?',
    wordQuestion: 'Quel mot correspond : {definition}',
    confirm: 'Exactement, « {word} » ! On le retient.',
    hearAsk: 'Écoute, {name} : « {word} ». Tu peux retenir ce mot ?',
    hearQuestion: 'Quel mot as-tu entendu ?',
    lilithLine: 'Miaou ! J’aime les mots presque autant que le poisson.',
    interludes: [
      { text: 'Crac ! Tom a fait tomber une tasse. Lilith le regarde d’un air sévère.', sfx: 'glass' },
      { text: 'Dehors, une voiture freine. Lilith saute du canapé, effrayée.', sfx: 'brakes' },
      { text: 'On sonne à la porte. C’est juste le voisin avec un colis.', sfx: 'doorbell' },
      { text: 'Lilith vient vers toi et ronronne tout doucement.', sfx: 'purr' }
    ],
    closing: 'Bravo, {name} ! Lilith est fière de toi.',
    closingNarration: 'Lilith se roule en boule sur tes genoux et ronronne.'
  },
  it: {
    title: 'Serata di parole con Lilith',
    openings: [
      { text: 'Piove. Mia, Tom e Lilith sono seduti insieme sul divano.', sfx: 'rain' },
      { text: 'Mia prepara il tè. Tom legge e Lilith dorme sul dizionario.', sfx: 'purr' },
      { text: 'Toc toc! {name} viene a trovarli e Lilith corre subito alla porta.', sfx: 'knock' }
    ],
    introMissed: 'Che bello vederti, {name}! Oggi ripassiamo alcune parole difficili. Niente paura, ti aiutiamo noi.',
    introNew: 'Che bello vederti, {name}! Oggi impariamo insieme parole nuove.',
    defAsk: 'Oggi ho letto la parola «{word}». Che cosa vuol dire?',
    defAnswer: 'È facile: {definition}',
    defQuestion: 'Che cosa vuol dire «{word}»?',
    wordQuestion: 'Quale parola corrisponde: {definition}',
    confirm: 'Esatto, «{word}»! Ce lo ricordiamo.',
    hearAsk: 'Ascolta, {name}: «{word}». Riesci a ricordare questa parola?',
    hearQuestion: 'Quale parola hai sentito?',
    lilithLine: 'Miao! Mi piacciono le parole quasi quanto il pesce.',
    interludes: [
      { text: 'Crash! A Tom è caduta una tazza. Lilith lo guarda severa.', sfx: 'glass' },
      { text: 'Fuori una macchina frena. Lilith salta giù dal divano, spaventata.', sfx: 'brakes' },
      { text: 'Suonano alla porta. È solo il vicino con un pacco.', sfx: 'doorbell' },
      { text: 'Lilith viene da te e fa le fusa piano piano.', sfx: 'purr' }
    ],
    closing: 'Ottimo lavoro, {name}! Lilith è fiera di te.',
    closingNarration: 'Lilith si acciambella sulle tue ginocchia e fa le fusa.'
  },
  es: {
    title: 'Noche de palabras con Lilith',
    openings: [
      { text: 'Llueve. Mia, Tom y Lilith están sentados juntos en el sofá.', sfx: 'rain' },
      { text: 'Mia prepara té. Tom lee y Lilith duerme sobre el diccionario.', sfx: 'purr' },
      { text: 'Toc, toc. {name} viene de visita y Lilith corre enseguida a la puerta.', sfx: 'knock' }
    ],
    introMissed: '¡Qué bien verte, {name}! Hoy practicamos algunas palabras difíciles. No te preocupes, te ayudamos.',
    introNew: '¡Qué bien verte, {name}! Hoy aprendemos palabras nuevas juntos.',
    defAsk: 'Hoy he leído la palabra «{word}». ¿Qué significa?',
    defAnswer: 'Es fácil: {definition}',
    defQuestion: '¿Qué significa «{word}»?',
    wordQuestion: '¿Qué palabra encaja?: {definition}',
    confirm: '¡Exacto, «{word}»! Lo recordamos.',
    hearAsk: 'Escucha, {name}: «{word}». ¿Puedes recordar esta palabra?',
    hearQuestion: '¿Qué palabra has oído?',
    lilithLine: '¡Miau! Me gustan las palabras casi tanto como el pescado.',
    interludes: [
      { text: '¡Crac! A Tom se le ha caído una taza. Lilith lo mira muy seria.', sfx: 'glass' },
      { text: 'Fuera, un coche frena. Lilith salta del sofá asustada.', sfx: 'brakes' },
      { text: 'Llaman a la puerta. Es solo el vecino con un paquete.', sfx: 'doorbell' },
      { text: 'Lilith se acerca a ti y ronronea muy bajito.', sfx: 'purr' }
    ],
    closing: '¡Muy bien, {name}! Lilith está orgullosa de ti.',
    closingNarration: 'Lilith se acurruca en tu regazo y ronronea.'
  },
  pt: {
    title: 'Noite de palavras com a Lilith',
    openings: [
      { text: 'Está chovendo. Mia, Tom e Lilith estão sentados juntos no sofá.', sfx: 'rain' },
      { text: 'A Mia está fazendo chá. O Tom está lendo, e a Lilith dorme em cima do dicionário.', sfx: 'purr' },
      { text: 'Toc, toc! {name} vem fazer uma visita, e a Lilith corre logo para a porta.', sfx: 'knock' }
    ],
    introMissed: 'Que bom te ver, {name}! Hoje vamos praticar algumas palavras difíceis. Não se preocupe, a gente ajuda.',
    introNew: 'Que bom te ver, {name}! Hoje vamos aprender palavras novas juntos.',
    defAsk: 'Hoje eu li a palavra “{word}”. O que ela significa?',
    defAnswer: 'É fácil: {definition}',
    defQuestion: 'O que significa “{word}”?',
    wordQuestion: 'Qual palavra combina: {definition}',
    confirm: 'Isso mesmo, “{word}”! Vamos lembrar dessa.',
    hearAsk: 'Escuta, {name}: “{word}”. Você consegue lembrar essa palavra?',
    hearQuestion: 'Qual palavra você ouviu?',
    lilithLine: 'Miau! Eu gosto de palavras quase tanto quanto de peixe.',
    interludes: [
      { text: 'Crash! O Tom deixou uma xícara cair. A Lilith olha para ele bem séria.', sfx: 'glass' },
      { text: 'Lá fora, um carro freia. A Lilith pula do sofá assustada.', sfx: 'brakes' },
      { text: 'A campainha toca. É só o vizinho com um pacote.', sfx: 'doorbell' },
      { text: 'A Lilith vem até você e ronrona bem baixinho.', sfx: 'purr' }
    ],
    closing: 'Muito bem, {name}! A Lilith está orgulhosa de você.',
    closingNarration: 'A Lilith se enrola no seu colo e ronrona.'
  },
  uk: {
    title: 'Вечір слів з Ліліт',
    openings: [
      { text: 'Іде дощ. Мія, Том і Ліліт сидять разом на дивані.', sfx: 'rain' },
      { text: 'Мія заварює чай. Том читає, а Ліліт спить на словнику.', sfx: 'purr' },
      { text: 'Тук-тук! {name} приходить у гості, і Ліліт одразу біжить до дверей.', sfx: 'knock' }
    ],
    introMissed: 'Як добре, що ти тут, {name}! Сьогодні повторимо кілька складних слів. Не хвилюйся, ми допоможемо.',
    introNew: 'Як добре, що ти тут, {name}! Сьогодні разом вивчимо нові слова.',
    defAsk: 'Сьогодні я прочитав слово «{word}». Що воно означає?',
    defAnswer: 'Це просто: {definition}',
    defQuestion: 'Що означає «{word}»?',
    wordQuestion: 'Яке слово підходить: {definition}',
    confirm: 'Саме так, «{word}»! Запам’ятаймо його.',
    hearAsk: 'Послухай, {name}: «{word}». Запам’ятаєш це слово?',
    hearQuestion: 'Яке слово прозвучало?',
    lilithLine: 'Няв! Я люблю слова майже так само, як рибку.',
    interludes: [
      { text: 'Дзень! Том упустив чашку. Ліліт суворо на нього дивиться.', sfx: 'glass' },
      { text: 'Надворі гальмує машина. Ліліт злякано зістрибує з дивана.', sfx: 'brakes' },
      { text: 'Дзвонять у двері. Це лише сусід із посилкою.', sfx: 'doorbell' },
      { text: 'Ліліт підходить до тебе й тихенько муркоче.', sfx: 'purr' }
    ],
    closing: 'Чудова робота, {name}! Ліліт пишається тобою.',
    closingNarration: 'Ліліт згортається клубочком у тебе на колінах і муркоче.'
  }
};

const WORDS_PER_STORY = 3;
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

function exerciseFor(language: Language, level: VocabularyLevel, word: string, text: Templates, speaker: 'mia' | 'tom'): StoryBeat[] {
  const metadata = wordMetadata[language][word];
  const spelling = metadata.spelling;
  const definition = wordDefinitions[language]?.[word];
  const article = metadata.type === 'noun' && metadata.article && ARTICLES.includes(metadata.article) ? metadata.article : null;
  const kinds: ('definition' | 'word' | 'article' | 'hear')[] = [];
  if (definition && distractors(language, level, word, true).length === 2) kinds.push('definition', 'word');
  if (text.articleAsk && article) kinds.push('article');
  const kind = kinds.length ? pick(kinds) : 'hear';

  if (kind === 'definition') {
    const others = distractors(language, level, word, true);
    return [
      { kind: 'line', speaker: 'tom', text: same(fill(text.defAsk, { word: spelling })) },
      { kind: 'question', focus: word, prompt: same(fill(text.defQuestion, { word: spelling })), options: [definition!, ...others.map((other) => wordDefinitions[language][other])].map(same) },
      { kind: 'line', speaker: 'mia', text: same(fill(text.defAnswer, { definition: definition! })) }
    ];
  }
  if (kind === 'word') {
    const others = distractors(language, level, word, false);
    return [
      { kind: 'question', focus: word, prompt: same(fill(text.wordQuestion, { definition: definition! })), options: [spelling, ...others.map((other) => wordMetadata[language][other].spelling)].map(same) },
      { kind: 'line', speaker, text: same(fill(text.confirm, { word: spelling })) }
    ];
  }
  if (kind === 'article') {
    const correct = `${article} ${spelling}`;
    return [
      { kind: 'line', speaker: 'mia', text: same(fill(text.articleAsk!, { word: spelling })) },
      { kind: 'reply', to: 'mia', focus: word, options: [correct, ...ARTICLES.filter((other) => other !== article).map((other) => `${other} ${spelling}`)].map(same) },
      { kind: 'line', speaker: 'tom', text: same(fill(text.confirm, { word: correct })) }
    ];
  }
  const others = distractors(language, level, word, false);
  return [
    { kind: 'line', speaker, text: same(fill(text.hearAsk, { word: spelling })) },
    { kind: 'question', focus: word, prompt: same(text.hearQuestion), options: [spelling, ...others.map((other) => wordMetadata[language][other].spelling)].map(same) }
  ];
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
  const interlude = pick(text.interludes);
  const beats: StoryBeat[] = [
    { kind: 'narration', text: same(opening.text), sfx: opening.sfx },
    { kind: 'line', speaker: 'mia', text: same(missed > 0 ? text.introMissed : text.introNew) }
  ];
  words.forEach((word, index) => {
    beats.push(...exerciseFor(language, level, word, text, index % 2 === 0 ? 'tom' : 'mia'));
    if (index === 0) beats.push({ kind: 'line', speaker: 'lilith', text: same(text.lilithLine), sfx: 'meow' });
    if (index === 1) beats.push({ kind: 'narration', text: same(interlude.text), sfx: interlude.sfx });
  });
  beats.push({ kind: 'line', speaker: 'tom', text: same(text.closing) }, { kind: 'narration', text: same(text.closingNarration), sfx: 'purr' });
  return { id: `generated-${Date.now()}`, level, scene: 'home', cast: ['mia', 'tom', 'lilith'], title: same(text.title), beats, generated: true };
}
