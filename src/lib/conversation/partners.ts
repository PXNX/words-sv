/*
 * Who the learner talks to in the conversation mode: a member of the story cast, met in one of
 * their stories. Every round draws a new partner at random, with a little background of their own
 * and a few lines of the story they come from, which the on-device model gets as shared memory.
 */
import type { Language, VocabularyLevel } from '#lib/data/vocabulary.js';
import { characterNames, fillName, storiesFor, withDetails, type CharacterId, type SceneId, type Story } from '#lib/story/stories.js';

// Written for the model (in English, whatever the learner's language); kept short for its 4k context.
export const backgrounds: Partial<Record<CharacterId, string>> = {
  mia: 'a cheerful student who cycles everywhere, loves cafés and always has a new plan for the weekend',
  leo: 'a sporty young man who plays football in the park and is always hungry',
  oma: 'a warm grandmother who bakes cakes, knits scarves and loves telling stories about the old days',
  tom: 'a relaxed young office worker who loves trains, travelling and trying new food',
  kim: 'an energetic young woman who takes photos of everything and knows every concert in town',
  paul: 'a calm older gentleman who reads the newspaper on a park bench and knows the history of the city',
  lilith: 'a playful, slightly vain cat who loves balls of wool, sunny windowsills and fish, and talks about herself a lot',
  hans: 'a jolly man from Bavaria who loves the mountains, beer gardens and brass music',
  albert: 'an old-fashioned Berlin gentleman with a monocle, a dry sense of humour and strong opinions',
  sabine: 'a friendly police officer who knows every street, gives directions and cares about safety',
  enzo: 'a pizza baker with Italian roots who talks about food with great passion',
  jana: 'a programmer who wears big headphones, drinks a lot of coffee and loves video games',
  becker: 'a patient teacher who loves books, explains things gladly and is proud of his students',
  ludwig: 'a tour guide at Neuschwanstein castle who dresses up as King Ludwig and stays in character',
  ali: 'the owner of the döner shop on the corner, who knows all the neighbours and their news',
  robert: 'a handyman with a pencil behind his ear who can fix anything and loves a good tool',
  fritz: 'a big, kind farmer with cows, a tractor and a lot to say about the weather',
  tobias: 'a lifeguard and gym fan who talks about training, the beach and protein',
  selma: 'a caring nurse who works night shifts and gives good advice about health',
  simon: 'a careful engineer with pens in his shirt pocket who loves to plan everything precisely',
  banker: 'a thrifty Swabian banker who likes to save money and gives advice about it',
  wirt: 'an innkeeper who runs a cosy restaurant and recommends the dish of the day'
};
// Only in German stories: they are not part of the other languages' cast.
const GERMAN_ONLY: CharacterId[] = ['ludwig', 'ali', 'robert', 'fritz', 'tobias', 'selma', 'simon', 'banker', 'wirt'];

export type Partner = {
  id: CharacterId;
  name: string;
  background: string;
  scene: SceneId;
  storyTitle: string;
  // A few lines from the story, in the learner's language: shared memory for the conversation.
  memory: string[];
};

function canTalk(id: CharacterId, language: Language) {
  return Boolean(backgrounds[id]) && (language === 'de' || !GERMAN_ONLY.includes(id));
}

function storyLines(story: Story, language: Language, learnerName: string, limit = 3): string[] {
  const lines: string[] = [];
  for (const beat of story.beats) {
    if (lines.length >= limit) break;
    if (beat.kind !== 'narration' && beat.kind !== 'line') continue;
    // Placeholders a playthrough fills in (the time, …) are left out rather than read as code.
    const text = fillName(beat.text[language] ?? '', learnerName).replace(/\s*\{[^}]+\}\.?/g, '').trim();
    if (/\p{L}/u.test(text)) lines.push(text);
  }
  return lines;
}

/** A random partner from a random story of the level, never the one just talked to. */
export function pickPartner(language: Language, level: VocabularyLevel, includeLower: boolean, learnerName: string, previous: CharacterId | null = null, random: () => number = Math.random): Partner | null {
  const options = storiesFor(language, level, includeLower).flatMap((story) =>
    story.cast.filter((id) => canTalk(id, language) && id !== previous).map((id) => ({ story, id }))
  );
  if (!options.length) return null;
  const { story: raw, id } = options[Math.floor(random() * options.length)];
  const story = withDetails(raw, random);
  return {
    id,
    name: characterNames[id][language],
    background: backgrounds[id]!,
    scene: story.scene,
    storyTitle: story.title[language],
    memory: storyLines(story, language, learnerName)
  };
}
