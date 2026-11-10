import { describe, expect, it } from 'vitest';
import { dialogues } from '../src/lib/conversation/dialogues.js';
import { checkAnswer, choicesOpen, fill, replyChoices, respond, startScript, wordChoices, yesOrNo, type ScriptSetup, type ScriptState } from '../src/lib/conversation/scripted.js';
import type { Language } from '../src/lib/data/vocabulary.js';

const first = () => 0;

function setup(overrides: Partial<ScriptSetup> = {}): ScriptSetup {
  return {
    language: 'de', level: 'a1', partnerId: 'enzo', partnerName: 'Enzo', learnerName: 'Felix', storyTitle: 'In der Pizzeria',
    words: [{ word: 'Hund', type: 'noun', article: 'der', definition: 'Ein Haustier, das bellt.' }, { word: 'schwimmen', type: 'verb' }],
    ...overrides
  };
}

/** Answers every question with its first suggestion until the dialogue is over. */
function playThrough(state: ScriptState, limit = 40) {
  const lines: string[] = [];
  let current = state;
  for (let turn = 0; turn < limit && !current.done; turn += 1) {
    const reply = replyChoices(current)[0] ?? 'Ja.';
    const next = respond(current, reply, first);
    lines.push(next.line);
    current = next.state;
  }
  return { state: current, lines };
}

describe('scripted conversation', () => {
  it('greets by name, recalls the story and asks the partner’s topic first', () => {
    const { line, state } = startScript(setup(), first);
    expect(line).toContain('Felix');
    expect(line).toContain('Enzo');
    expect(line).toContain('„In der Pizzeria“');
    // Enzo only talks about food.
    expect(state.topic).toBe('food');
    expect(line).toContain('Was isst du gern?');
  });

  it('greets without a name when the learner has none', () => {
    const { line } = startScript(setup({ learnerName: '' }), first);
    expect(line).not.toMatch(/,\s*!/);
    expect(line).toContain('Enzo');
  });

  it('praises a fitting answer and models the full sentence for a one-word reply', () => {
    const { state } = startScript(setup(), first);
    const turn = respond(state, 'Pizza', first);
    expect(turn.verdict).toBe('good');
    expect(turn.line).toContain('„Ich esse gern Pizza.“');
    // Then the first target word, with its meaning.
    expect(turn.line).toContain('„Hund“');
    expect(turn.line).toContain('Ein Haustier, das bellt.');
  });

  it('does not model a sentence the learner already said in full', () => {
    const { state } = startScript(setup(), first);
    const turn = respond(state, 'Ich esse gern Nudeln.', first);
    expect(turn.verdict).toBe('good');
    expect(turn.line).not.toContain('Als ganzer Satz');
  });

  it('helps with an example after a miss and moves on after the second', () => {
    const { state } = startScript(setup(), first);
    const retry = respond(state, 'Hm', first);
    expect(retry.verdict).toBe('retry');
    expect(retry.line).toContain('„Ich esse gern Pizza.“');
    expect(retry.line).toContain('Was isst du gern?');
    expect(retry.state.index).toBe(state.index);
    const skip = respond(retry.state, 'Hm', first);
    expect(skip.verdict).toBe('skip');
    expect(skip.state.index).toBeGreaterThan(state.index);
  });

  it('accepts an unexpected full sentence without asking again', () => {
    const { state } = startScript(setup(), first);
    const turn = respond(state, 'Das weiß ich wirklich nicht so genau', first);
    expect(turn.verdict).toBe('ok');
    expect(turn.state.index).toBe(state.index + 1);
  });

  it('asks for a sentence with each target word and tracks the words used', () => {
    const { state } = startScript(setup(), first);
    const onWord = respond(state, 'Pizza', first).state;
    const miss = respond(onWord, 'Ich weiß nicht', first);
    expect(miss.verdict).toBe('retry');
    expect(miss.line).toContain('Hund');
    const hit = respond(miss.state, 'Mein Hund ist groß.', first);
    expect(hit.verdict).toBe('good');
    expect(hit.line).toContain('„Hund“');
    expect(hit.state.used).toEqual(['Hund']);
  });

  it('skips the question about a word the learner already used', () => {
    const { state } = startScript(setup(), first);
    // Uses "schwimmen" (the second word) early, inflected.
    const turn = respond(state, 'Pizza, und ich schwimme gern', first);
    expect(turn.state.used).toEqual(['schwimmen']);
    expect(turn.line).toContain('„schwimmen“');
    const { lines } = playThrough(turn.state);
    expect(lines.join(' ')).not.toContain('Satz mit „schwimmen“');
  });

  it('branches on yes and no', () => {
    const { state } = startScript(setup(), first);
    // Food: what you eat → word → cooking (yes/no).
    const atCooking = respond(respond(state, 'Pizza', first).state, 'Der Hund ist hier.', first).state;
    expect(respond(atCooking, 'Ja, sehr gern!', first).line).toContain('Was kochst du am liebsten?');
    expect(respond(atCooking, 'Nein, ich koche nicht gern.', first).line).toContain('Wer kocht denn bei dir zu Hause?');
  });

  it('ends with a goodbye, and the praise for all words when they were used', () => {
    const { state } = startScript(setup(), first);
    const { state: end, lines } = playThrough(state);
    expect(end.done).toBe(true);
    expect(end.used).toEqual(['Hund', 'schwimmen']);
    expect(lines.at(-1)).toContain('alle deine Wörter');
    expect(replyChoices(end)).toEqual([]);
    expect(respond(end, 'Hallo', first).verdict).toBe('done');
  });

  it('builds word suggestions from the word type and elides French articles', () => {
    const lexicon = dialogues.de.lexicon;
    expect(wordChoices({ word: 'Hund', type: 'noun', article: 'der' }, lexicon, 'de')).toContain('Der Hund ist hier.');
    expect(wordChoices({ word: 'schwimmen', type: 'verb' }, lexicon, 'de')[0]).toBe('Ich möchte heute schwimmen.');
    expect(wordChoices({ word: 'Haus' }, lexicon, 'de')[0]).toBe('Ich kenne das Wort Haus.');
    expect(wordChoices({ word: 'dog' }, dialogues.en.lexicon, 'en')).toContain('Dog is a useful word.');
    expect(wordChoices({ word: 'arbre', type: 'noun', article: 'l’' }, dialogues.fr.lexicon, 'fr')[0]).toBe('Où est l’arbre ?');
  });

  it('reads yes and no, whichever comes first', () => {
    const { lexicon } = dialogues.de;
    expect(yesOrNo('Ja, klar', lexicon, 'de')).toBe('yes');
    expect(yesOrNo('Nein, nicht gern', lexicon, 'de')).toBe('no');
    expect(yesOrNo('Ich habe keine Geschwister', lexicon, 'de')).toBe('no');
    expect(yesOrNo('Vielleicht', lexicon, 'de')).toBeNull();
    expect(yesOrNo('I don’t love it', dialogues.en.lexicon, 'en')).toBe('no');
    expect(yesOrNo('Je n’aime pas ça', dialogues.fr.lexicon, 'fr')).toBe('no');
  });

  it('checks numbers, keywords and free answers', () => {
    const { lexicon } = dialogues.en;
    expect(checkAnswer('8', { kind: 'keywords', words: [], numbers: true }, lexicon, 'en')).toBe('match');
    expect(checkAnswer('about seven', { kind: 'keywords', words: [], numbers: true }, lexicon, 'en')).toBe('match');
    expect(checkAnswer('I love pizzas', { kind: 'keywords', words: ['pizza'] }, lexicon, 'en')).toBe('match');
    expect(checkAnswer('hmm', { kind: 'keywords', words: ['pizza'] }, lexicon, 'en')).toBe('miss');
    expect(checkAnswer('Anna', { kind: 'free', minWords: 1 }, lexicon, 'en')).toBe('match');
  });

  it('models a bare number into a sentence', () => {
    const state = startScript(setup({ language: 'en', partnerId: 'tobias', words: [] }), first).state;
    // Tobias: free time first (no words, so the questions follow one another).
    const sleep = state.plan.findIndex((item) => item.kind === 'topic' && item.step.ask.startsWith('How many hours'));
    const turn = respond({ ...state, index: sleep }, '8', first);
    expect(turn.line).toContain('“I sleep 8 hours.”');
  });

  it('hides the suggestions from B1 on until a miss', () => {
    const { state } = startScript(setup({ level: 'b1' }), first);
    expect(choicesOpen(state)).toBe(false);
    expect(replyChoices(state).length).toBeGreaterThan(0);
    expect(choicesOpen(respond(state, 'Hm', first).state)).toBe(true);
    expect(choicesOpen(startScript(setup({ level: 'a2' }), first).state)).toBe(true);
  });

  it('fills placeholders and capitalises {Art}', () => {
    expect(fill('{Art} {word} ist hier.', { art: 'die', word: 'Katze' }, 'de')).toBe('Die Katze ist hier.');
    expect(fill('Hallo {missing}!', {})).toBe('Hallo !');
  });

  it('plays through every topic of every language with the suggestions alone', () => {
    for (const language of Object.keys(dialogues) as Language[]) {
      for (const topic of dialogues[language].topics) {
        const base = startScript(setup({ language, partnerId: 'none', words: [{ word: 'test' }] }), first).state;
        const plan = [...topic.steps.map((step) => ({ kind: 'topic' as const, step })), { kind: 'word' as const, word: { word: 'test' } }];
        const { state } = playThrough({ ...base, topic: topic.id, plan, index: 0 });
        expect(state.done, `${language} ${topic.id}`).toBe(true);
        expect(state.used, `${language} ${topic.id}`).toEqual(['test']);
      }
    }
  });

  it('accepts every suggestion of every question as a fitting answer', () => {
    for (const language of Object.keys(dialogues) as Language[]) {
      const { lexicon, topics } = dialogues[language];
      const steps = topics.flatMap((topic) => topic.steps).flatMap((step) => [step, step.yes, step.no].filter((entry) => entry !== undefined));
      for (const step of steps) {
        for (const choice of step.choices) {
          expect(checkAnswer(choice, step.expect, lexicon, language), `${language}: ${step.ask} → ${choice}`).not.toBe('miss');
          if (step.expect.kind === 'yesno') expect(['yes', 'no'], `${language}: ${choice}`).toContain(checkAnswer(choice, step.expect, lexicon, language));
        }
      }
    }
  });
});
