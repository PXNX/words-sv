// Everything about stories that does not need the story corpus: character names, the learner's
// name in texts, faces, and the per-playthrough details and weather. Kept apart from stories.ts so
// pages that only draw or name a character do not load every story (see scripts/bundle-budget.ts).
import type { Language } from '#lib/data/vocabulary.js';
import type { SoundEffect } from '#lib/feedback/sounds.js';
import type { CharacterId, Mood, SceneId, Story, StoryBeat, Text, Weather } from './stories';
import { kumarStandIn } from './standIn';

// Kumar's name in every language, unless the learner's own character plays his part.
function playedByLearner(names: Text): Text {
  return new Proxy(names, { get: (target, key) => (typeof key === 'string' && key in target && kumarStandIn()) || Reflect.get(target, key) });
}

export const characterNames: Record<CharacterId, Text> = {
  mia: { de: 'Mia', en: 'Mia', fr: 'Mia', it: 'Mia', es: 'Mia', pt: 'Mia', uk: 'Мія' },
  leo: { de: 'Leo', en: 'Leo', fr: 'Léo', it: 'Leo', es: 'Leo', pt: 'Léo', uk: 'Лео' },
  oma: { de: 'Oma', en: 'Grandma', fr: 'Mamie', it: 'Nonna', es: 'Abuela', pt: 'Vovó', uk: 'Бабуся' },
  tom: { de: 'Tom', en: 'Tom', fr: 'Tom', it: 'Tom', es: 'Tom', pt: 'Tom', uk: 'Том' },
  kim: { de: 'Kim', en: 'Kim', fr: 'Kim', it: 'Kim', es: 'Kim', pt: 'Kim', uk: 'Кім' },
  paul: { de: 'Herr Paul', en: 'Mr Paul', fr: 'M. Paul', it: 'Sig. Paul', es: 'Sr. Paul', pt: 'Sr. Paul', uk: 'Пан Пауль' },
  bello: { de: 'Bello', en: 'Bello', fr: 'Bello', it: 'Bello', es: 'Bello', pt: 'Bello', uk: 'Белло' },
  lilith: { de: 'Lilith', en: 'Lilith', fr: 'Lilith', it: 'Lilith', es: 'Lilith', pt: 'Lilith', uk: 'Ліліт' },
  hans: { de: 'Hans', en: 'Hans', fr: 'Hans', it: 'Hans', es: 'Hans', pt: 'Hans', uk: 'Ганс' },
  albert: { de: 'Albert', en: 'Albert', fr: 'Albert', it: 'Albert', es: 'Albert', pt: 'Albert', uk: 'Альберт' },
  sabine: { de: 'Sabine', en: 'Sabine', fr: 'Sabine', it: 'Sabine', es: 'Sabine', pt: 'Sabine', uk: 'Сабіна' },
  enzo: { de: 'Enzo', en: 'Enzo', fr: 'Enzo', it: 'Enzo', es: 'Enzo', pt: 'Enzo', uk: 'Енцо' },
  jana: { de: 'Jana', en: 'Jana', fr: 'Jana', it: 'Jana', es: 'Jana', pt: 'Jana', uk: 'Яна' },
  becker: { de: 'Herr Becker', en: 'Mr Becker', fr: 'M. Becker', it: 'Sig. Becker', es: 'Sr. Becker', pt: 'Sr. Becker', uk: 'Пан Беккер' },
  bird: { de: 'Pieps', en: 'Pieps', fr: 'Pieps', it: 'Pieps', es: 'Pieps', pt: 'Pieps', uk: 'Піпс' },
  cow: { de: 'Berta', en: 'Berta', fr: 'Berta', it: 'Berta', es: 'Berta', pt: 'Berta', uk: 'Берта' },
  horse: { de: 'Blitz', en: 'Blitz', fr: 'Blitz', it: 'Blitz', es: 'Blitz', pt: 'Blitz', uk: 'Бліц' },
  giraffe: { de: 'Gisela', en: 'Gisela', fr: 'Gisela', it: 'Gisela', es: 'Gisela', pt: 'Gisela', uk: 'Гізела' },
  elephant: { de: 'Benno', en: 'Benno', fr: 'Benno', it: 'Benno', es: 'Benno', pt: 'Benno', uk: 'Бенно' },
  snake: { de: 'Zischi', en: 'Zischi', fr: 'Zischi', it: 'Zischi', es: 'Zischi', pt: 'Zischi', uk: 'Зіші' },
  deer: { de: 'Reh', en: 'Deer', fr: 'Chevreuil', it: 'Capriolo', es: 'Corzo', pt: 'Corço', uk: 'Козуля' },
  fox: { de: 'Fuchs', en: 'Fox', fr: 'Renard', it: 'Volpe', es: 'Zorro', pt: 'Raposa', uk: 'Лис' },
  seagull: { de: 'Möwe', en: 'Seagull', fr: 'Mouette', it: 'Gabbiano', es: 'Gaviota', pt: 'Gaivota', uk: 'Чайка' },
  crow: { de: 'Krähe', en: 'Crow', fr: 'Corneille', it: 'Cornacchia', es: 'Corneja', pt: 'Gralha', uk: 'Ворона' },
  // German-only characters (see the cast notes in germanStories.ts).
  ludwig: { de: 'König Ludwig', en: 'King Ludwig', fr: 'Le roi Louis', it: 'Re Ludovico', es: 'El rey Luis', pt: 'Rei Luís', uk: 'Король Людвіг' },
  ali: { de: 'Ali', en: 'Ali', fr: 'Ali', it: 'Ali', es: 'Ali', pt: 'Ali', uk: 'Алі' },
  robert: { de: 'Robert', en: 'Robert', fr: 'Robert', it: 'Robert', es: 'Robert', pt: 'Robert', uk: 'Роберт' },
  fritz: { de: 'Bauer Fritz', en: 'Farmer Fritz', fr: 'Fermier Fritz', it: 'Contadino Fritz', es: 'Granjero Fritz', pt: 'Fazendeiro Fritz', uk: 'Фермер Фріц' },
  tobias: { de: 'Tobias', en: 'Tobias', fr: 'Tobias', it: 'Tobias', es: 'Tobias', pt: 'Tobias', uk: 'Тобіас' },
  selma: { de: 'Selma', en: 'Selma', fr: 'Selma', it: 'Selma', es: 'Selma', pt: 'Selma', uk: 'Сельма' },
  kumar: playedByLearner({ de: 'Kumar', en: 'Kumar', fr: 'Kumar', it: 'Kumar', es: 'Kumar', pt: 'Kumar', uk: 'Кумар' }),
  simon: { de: 'Simon', en: 'Simon', fr: 'Simon', it: 'Simon', es: 'Simon', pt: 'Simon', uk: 'Сімон' },
  banker: { de: 'Herr Bäuerle', en: 'Mr Bäuerle', fr: 'M. Bäuerle', it: 'Sig. Bäuerle', es: 'Sr. Bäuerle', pt: 'Sr. Bäuerle', uk: 'Пан Баєрле' },
  wirt: { de: 'Der Wirt', en: 'The innkeeper', fr: "L'aubergiste", it: "L'oste", es: 'El tabernero', pt: 'O estalajadeiro', uk: 'Шинкар' }
};

/**
 * The face a character makes while saying a line. Every story has German text, so the German line is
 * read for cues: regret reads sad, exclamations of shock surprised, questions curious and friendly
 * exclamations happy. An explicit `mood` on the beat wins.
 */
export function moodFor(beat: Extract<StoryBeat, { kind: 'line' }>): Mood {
  if (beat.mood) return beat.mood;
  const text = beat.text.de;
  if (/haha|hihi|hehe/i.test(text)) return 'laughing';
  if (/müde|gähn|schlafen/i.test(text)) return 'sleepy';
  if (/inakzeptabel|unverschämt|frechheit|so ein ärger|runter vom tisch/i.test(text)) return 'angry';
  if (/hoffentlich|nervös|vorsicht|pass auf/i.test(text)) return 'worried';
  if (/oh nein|leider|schade|vergessen|tut mir leid|entschuldigung!/i.test(text)) return 'sad';
  if (/^(oh|ach)\b|plötzlich|meine güte|wow/i.test(text)) return 'surprised';
  if (/\?\s*$/.test(text)) return 'curious';
  if (/!|danke|super|gern|toll|schön|genau|glück|willkommen/i.test(text)) return 'happy';
  return 'neutral';
}

export function fillName(text: string, name: string) {
  const filled = text.replaceAll('{name}', name);
  const learner = kumarStandIn();
  return learner ? playKumar(filled, learner) : filled;
}
// The learner's own character takes Kumar's part: "Herr Kumar" and "Kumar" become their first name,
// "Kumars" its genitive (with an apostrophe after a final s, ß, x or z, as German writes it).
function playKumar(text: string, learner: string) {
  return text.replace(/(?:Herrn? )?(?:Kumar|Кумар)(s?)(?!\p{L})/gu, (_, genitive: string) => genitive ? `${learner}${/[sßxz]$/i.test(learner) ? '’' : 's'}` : learner);
}

const outdoorScenes: SceneId[] = ['frankfurt', 'cologne', 'munich', 'hamburg', 'berlin', 'cliffs', 'mainau', 'lindau', 'castle', 'alps', 'forest', 'park', 'station', 'square', 'beergarden', 'farm', 'zoo', 'beach', 'airport'];
const weathers: Weather[] = ['sunny', 'cloudy', 'rainy', 'snowy'];
const weatherLines: Record<Weather, { indoor: Text; outdoor: Text }> = {
  sunny: {
    indoor: { de: 'Draußen ist das Wetter schön und klar.', en: 'Outside, the weather is lovely and clear.', fr: 'Dehors, il fait beau.', it: 'Fuori il tempo è bello e sereno.', es: 'Fuera hace buen tiempo.', pt: 'Lá fora, o tempo está bonito.', uk: 'Надворі гарна ясна погода.' },
    outdoor: { de: 'Die Sonne scheint, und der Himmel ist blau.', en: 'The sun is shining, and the sky is blue.', fr: 'Le soleil brille et le ciel est bleu.', it: 'Il sole splende e il cielo è azzurro.', es: 'Hace sol y el cielo está azul.', pt: 'O sol está brilhando, e o céu está azul.', uk: 'Світить сонце, і небо блакитне.' }
  },
  cloudy: {
    indoor: { de: 'Draußen ist der Himmel grau.', en: 'Outside, the sky is grey.', fr: 'Dehors, le ciel est gris.', it: 'Fuori il cielo è grigio.', es: 'Fuera, el cielo está gris.', pt: 'Lá fora, o céu está cinzento.', uk: 'Надворі небо сіре.' },
    outdoor: { de: 'Es ist bewölkt, und ein kühler Wind weht.', en: 'It is cloudy, and a cool wind is blowing.', fr: 'Le ciel est nuageux et un vent frais souffle.', it: 'È nuvoloso e soffia un vento fresco.', es: 'Está nublado y sopla un viento fresco.', pt: 'Está nublado, e sopra um vento fresco.', uk: 'Хмарно, і дме прохолодний вітер.' }
  },
  rainy: {
    indoor: { de: 'Draußen regnet es.', en: 'Outside, it is raining.', fr: 'Dehors, il pleut.', it: 'Fuori piove.', es: 'Fuera está lloviendo.', pt: 'Lá fora está chovendo.', uk: 'Надворі йде дощ.' },
    outdoor: { de: 'Es regnet ein bisschen, aber das ist nicht schlimm.', en: 'It is raining a little, but that’s fine.', fr: 'Il pleut un peu, mais ce n’est pas grave.', it: 'Piove un po’, ma non importa.', es: 'Llueve un poco, pero no pasa nada.', pt: 'Está chovendo um pouco, mas tudo bem.', uk: 'Трохи накрапає дощ, але це не страшно.' }
  },
  snowy: {
    indoor: { de: 'Draußen schneit es. Alles ist weiß.', en: 'Outside, it is snowing. Everything is white.', fr: 'Dehors, il neige. Tout est blanc.', it: 'Fuori nevica. È tutto bianco.', es: 'Fuera está nevando. Todo está blanco.', pt: 'Lá fora está nevando. Tudo está branco.', uk: 'Надворі падає сніг. Усе біле.' },
    outdoor: { de: 'Es schneit, und es ist kalt.', en: 'It is snowing, and it is cold.', fr: 'Il neige et il fait froid.', it: 'Nevica e fa freddo.', es: 'Está nevando y hace frío.', pt: 'Está nevando, e faz frio.', uk: 'Падає сніг, і холодно.' }
  }
};

function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
}

/**
 * Every playthrough draws its own details (see Detail): the ball is red one time and blue the next,
 * the day a Sunday or a Tuesday, and the questions ask about whatever was drawn. A caller that
 * needs the same draw every time (the reading catalog) passes its own random source.
 */
export function withDetails(story: Story, random: () => number = Math.random): Story {
  if (!story.details?.length) return story;
  const values: Record<string, Text> = {};
  let ball: string | undefined;
  for (const detail of story.details) {
    const [chosen, ...others] = shuffled(detail, random);
    // A detail always lists at least one variant.
    if (!chosen) continue;
    ball = chosen.ball ?? ball;
    for (const [key, text] of Object.entries(chosen.words)) {
      values[key] = text;
      others.forEach((other, index) => (values[`${key}#${index + 1}`] = other.words[key]!));
    }
  }
  const fill = (text: Text): Text => Object.fromEntries(Object.entries(text).map(([language, value]) => [
    language,
    value.replace(/\{([^{}]+)\}/g, (match, key: string, at: number) => {
      const word = values[key]?.[language as Language];
      if (word === undefined) return match;
      return at === 0 ? word.charAt(0).toLocaleUpperCase(language) + word.slice(1) : word;
    })
  ])) as Text;
  const beats = story.beats.map((beat): StoryBeat => {
    if (beat.kind === 'narration' || beat.kind === 'line') return { ...beat, text: fill(beat.text) };
    if (beat.kind === 'question') return { ...beat, prompt: fill(beat.prompt), options: beat.options.map(fill) };
    return { ...beat, options: beat.options.map(fill) };
  });
  return { ...story, beats, ball };
}

/**
 * Every playthrough gets its own weather: the scene shows it and a line after the opening narration
 * describes it, so the same story reads a little differently each time.
 */
export function withWeather(story: Story): Story {
  const choices = story.weathers ?? weathers;
  const weather = choices[Math.floor(Math.random() * choices.length)]!;
  const lines = weatherLines[weather];
  const outdoor = outdoorScenes.includes(story.scene);
  // A blue sky carries birdsong. The beach always paints a sunset instead, so it stays quiet.
  const sfx: SoundEffect | undefined = weather === 'rainy' ? 'rain' : weather === 'sunny' && story.scene !== 'beach' ? 'tweet' : undefined;
  const beat: StoryBeat = { kind: 'narration', text: outdoor ? lines.outdoor : lines.indoor, sfx };
  const at = story.beats[0]?.kind === 'narration' ? 1 : 0;
  return { ...story, weather, beats: [...story.beats.slice(0, at), beat, ...story.beats.slice(at)] };
}
