/**
 * Sentence composition prompts — each prompt gives a topic and expects a short
 * German text. The grader in `grading.ts` will score the user's answer.
 */
export type SentencePrompt = {
  id: string;
  topic: string;
  /** Optional hint to guide the learner toward the target structures. */
  hint?: string;
};

/** A small, curated set of A2/B1-ish topics. The topic is the key; the grader
 * will always evaluate against German regardless of the UI language. */
export const sentencePrompts: SentencePrompt[] = [
  {
    id: 'daily-routine',
    topic: 'Describe your typical morning routine',
    hint: 'Use time expressions (um 7 Uhr, dann, danach) and reflexive verbs (sich wecken, sich waschen)'
  },
  {
    id: 'weekend-plans',
    topic: 'What are your plans for the weekend?',
    hint: 'Future with werden or present tense (Ich werde ... / Ich gehe ...)'
  },
  {
    id: 'favorite-food',
    topic: 'Describe your favorite dish',
    hint: 'Use adjectives with correct endings (lecker, scharf, süß) and modal verbs (ich mag, ich esse gerne)'
  },
  {
    id: 'childhood-memory',
    topic: 'Tell a short memory from your childhood',
    hint: 'Past tense (Präteritum or Perfekt): war, hatte, spielte, ging'
  },
  {
    id: 'dream-job',
    topic: 'What would be your dream job and why?',
    hint: 'Konjunktur II (würde, könnte, möchte) and subordinate clauses with weil'
  },
  {
    id: 'recent-trip',
    topic: 'Describe a trip you took recently',
    hint: 'Perfekt with sein/haben, prepositions of place (nach, in, nach Hause)'
  },
  {
    id: 'learning-german',
    topic: 'Why are you learning German?',
    hint: 'Use weil, um ... zu, infinitive clauses (um Deutsch zu lernen)'
  },
  {
    id: 'apartment-house',
    topic: 'Describe your apartment or house',
    hint: 'Accusative/dative prepositions (in, auf, unter, neben), furniture vocab'
  },
  {
    id: 'shopping-dialog',
    topic: 'Write a short dialogue at a bakery',
    hint: 'Polite forms (ich hätte gerne, könnten Sie), numbers, articles'
  },
  {
    id: 'weather-today',
    topic: 'Describe today\'s weather and how you feel about it',
    hint: 'Es ist + adjective, es gibt + noun, mir ist kalt/warm'
  }
];

/** Returns a random prompt index for today (stable per day). */
export function todaysPromptIndex(): number {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash) + today.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % sentencePrompts.length;
}

/** The prompt index for the current day. */
export const promptIndex = todaysPromptIndex();