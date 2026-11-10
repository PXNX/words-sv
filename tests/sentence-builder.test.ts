import { describe, expect, it } from 'vitest';
import { definiteArticlesByCase, indefiniteArticlesByCase } from '../src/lib/grammar/cases';
import { verbConjugations } from '../src/lib/grammar/verbs';
import {
  composeSentence,
  curatedExercises,
  englishIndefiniteArticle,
  englishNounPhrase,
  englishThirdPerson,
  germanNounPhrase,
  matchOrder,
  orderExercisePool,
  sentenceTokens,
  shuffleTiles,
  type OrderExercise
} from '../src/lib/grammar/sentenceBuilder';
import { shuffled } from '../src/lib/grammar/learning';
import { vocabularyLevels } from '../src/lib/data/vocabulary';

const sentence = (exercise: OrderExercise | null) => exercise?.answers[0];

describe('German noun phrases', () => {
  it('takes the article and adjective ending of the case and gender', () => {
    expect(germanNounPhrase({ word: 'Apfel', gender: 'masculine' }, 'accusative', 'indefinite', 'rot')).toEqual(['einen', 'roten', 'Apfel']);
    expect(germanNounPhrase({ word: 'Apfel', gender: 'masculine' }, 'nominative', 'indefinite', 'rot')).toEqual(['ein', 'roter', 'Apfel']);
    expect(germanNounPhrase({ word: 'Auto', gender: 'neuter' }, 'accusative', 'indefinite', 'neu')).toEqual(['ein', 'neues', 'Auto']);
    expect(germanNounPhrase({ word: 'Tasche', gender: 'feminine' }, 'dative', 'definite', 'schwer')).toEqual(['der', 'schweren', 'Tasche']);
    expect(germanNounPhrase({ word: 'Frau', gender: 'feminine' }, 'nominative', 'definite', 'jung')).toEqual(['die', 'junge', 'Frau']);
  });

  it('declines weak masculine nouns and uses kein for negation', () => {
    expect(germanNounPhrase({ word: 'Junge', gender: 'masculine' }, 'dative', 'definite')).toEqual(['dem', 'Jungen']);
    expect(germanNounPhrase({ word: 'Nachbar', gender: 'masculine' }, 'dative', 'definite')).toEqual(['dem', 'Nachbarn']);
    expect(germanNounPhrase({ word: 'Apfel', gender: 'masculine' }, 'accusative', 'indefinite', 'grün', true)).toEqual(['keinen', 'grünen', 'Apfel']);
    expect(germanNounPhrase({ word: 'Milch', gender: 'feminine', mass: true }, 'accusative', 'indefinite', undefined, true)).toEqual(['keine', 'Milch']);
  });

  it('drops the article of a mass noun and takes strong endings', () => {
    expect(germanNounPhrase({ word: 'Kaffee', gender: 'masculine', mass: true }, 'accusative', 'indefinite', 'heiß')).toEqual(['heißen', 'Kaffee']);
    expect(germanNounPhrase({ word: 'Wasser', gender: 'neuter', mass: true }, 'accusative', 'indefinite', 'kalt')).toEqual(['kaltes', 'Wasser']);
    expect(germanNounPhrase({ word: 'Milch', gender: 'feminine', mass: true }, 'accusative', 'indefinite', 'kalt')).toEqual(['kalte', 'Milch']);
  });
});

describe('English forms', () => {
  it('adds the third-person -s by the spelling rules', () => {
    expect(englishThirdPerson('buy')).toBe('buys');
    expect(englishThirdPerson('carry')).toBe('carries');
    expect(englishThirdPerson('wash')).toBe('washes');
    expect(englishThirdPerson('watch')).toBe('watches');
    expect(englishThirdPerson('go')).toBe('goes');
    expect(englishThirdPerson('have')).toBe('has');
    expect(englishThirdPerson('read')).toBe('reads');
  });

  it('picks a or an by sound', () => {
    expect(englishIndefiniteArticle('apple')).toBe('an');
    expect(englishIndefiniteArticle('old')).toBe('an');
    expect(englishIndefiniteArticle('red')).toBe('a');
    expect(englishIndefiniteArticle('university')).toBe('a');
    expect(englishIndefiniteArticle('hour')).toBe('an');
    expect(englishIndefiniteArticle('umbrella')).toBe('an');
  });

  it('puts no article before an uncountable noun', () => {
    expect(englishNounPhrase({ word: 'milk', mass: true }, 'indefinite', 'cold')).toEqual(['cold', 'milk']);
    expect(englishNounPhrase({ word: 'apple' }, 'indefinite', 'red')).toEqual(['a', 'red', 'apple']);
    expect(englishNounPhrase({ word: 'car' }, 'indefinite', 'expensive')).toEqual(['an', 'expensive', 'car']);
  });
});

describe('composed German sentences', () => {
  it('puts the verb second and inverts after a time adverb', () => {
    const inversion = composeSentence('de', { structure: 'inversion', subject: { noun: 'woman' }, verb: 'buy', object: { noun: 'apple', determiner: 'indefinite', adjective: 'red' }, time: 'today' });
    expect(sentence(inversion)).toBe('Heute kauft die Frau einen roten Apfel.');
    expect(inversion!.answers).toContain('Die Frau kauft heute einen roten Apfel.');
    expect(inversion!.answers).toContain('Einen roten Apfel kauft die Frau heute.');
    // The time adverb doesn't follow an indefinite object.
    expect(inversion!.answers).not.toContain('Die Frau kauft einen roten Apfel heute.');
    expect(sentence(composeSentence('de', { structure: 'statement', subject: { noun: 'woman' }, verb: 'buy', object: { noun: 'apple', determiner: 'indefinite', adjective: 'red' }, time: 'today' }))).toBe('Die Frau kauft heute einen roten Apfel.');
  });

  it('conjugates for the pronoun and keeps a pronoun subject next to the verb', () => {
    const exercise = composeSentence('de', { structure: 'inversion', subject: { pronoun: 'you' }, verb: 'read', object: { noun: 'book', determiner: 'definite' }, time: 'evening' });
    expect(sentence(exercise)).toBe('Am Abend liest du das Buch.');
    expect(exercise!.answers).toContain('Du liest das Buch am Abend.');
    expect(exercise!.answers).not.toContain('Das Buch liest am Abend du.');
  });

  it('builds questions with the verb first', () => {
    expect(sentence(composeSentence('de', { structure: 'question', subject: { noun: 'child' }, verb: 'drink', object: { noun: 'milk', determiner: 'indefinite', adjective: 'warm' } }))).toBe('Trinkt das Kind warme Milch?');
    expect(sentence(composeSentence('de', { structure: 'wquestion', subject: { noun: 'man' }, verb: 'read', time: 'today' }))).toBe('Was liest der Mann heute?');
  });

  it('negates with kein or nicht', () => {
    expect(sentence(composeSentence('de', { structure: 'negation', subject: { noun: 'man' }, verb: 'drink', object: { noun: 'coffee', determiner: 'indefinite' } }))).toBe('Der Mann trinkt keinen Kaffee.');
    expect(sentence(composeSentence('de', { structure: 'negation', subject: { noun: 'girl' }, verb: 'like', object: { noun: 'cake', determiner: 'definite' } }))).toBe('Das Mädchen mag den Kuchen nicht.');
  });

  it('sends the infinitive to the end after a modal', () => {
    expect(sentence(composeSentence('de', { structure: 'modal', subject: { noun: 'boy' }, verb: 'eat', modal: 'wouldLike', object: { noun: 'cake', determiner: 'indefinite', adjective: 'sweet' }, time: 'today' }))).toBe('Der Junge möchte heute einen süßen Kuchen essen.');
  });

  it('puts the person in the dative before the thing', () => {
    expect(sentence(composeSentence('de', { structure: 'dative', subject: { noun: 'woman' }, verb: 'give', recipient: { noun: 'boy', determiner: 'definite' }, object: { noun: 'apple', determiner: 'indefinite', adjective: 'green' } }))).toBe('Die Frau gibt dem Jungen einen grünen Apfel.');
  });

  it('puts the verb last after dass and weil', () => {
    expect(sentence(composeSentence('de', { structure: 'dass', frame: 'think', subject: { noun: 'man' }, verb: 'buy', object: { noun: 'bread', determiner: 'indefinite', adjective: 'fresh' }, time: 'everyDay' }))).toBe('Ich glaube, dass der Mann jeden Tag ein frisches Brot kauft.');
    expect(sentence(composeSentence('de', { structure: 'weil', subject: { noun: 'girl' }, verb: 'read', object: { noun: 'book', determiner: 'indefinite', adjective: 'new' } }))).toBe('Das Mädchen ist glücklich, weil es ein neues Buch liest.');
  });

  it('refuses words that do not go together', () => {
    expect(composeSentence('de', { structure: 'statement', subject: { noun: 'dog' }, verb: 'eat', object: { noun: 'apple', determiner: 'definite' } })).toBeNull();
    expect(composeSentence('de', { structure: 'statement', subject: { noun: 'man' }, verb: 'read', object: { noun: 'apple', determiner: 'definite' } })).toBeNull();
    expect(composeSentence('de', { structure: 'statement', subject: { noun: 'man' }, verb: 'buy', object: { noun: 'apple', determiner: 'definite', adjective: 'blue' } })).toBeNull();
    expect(composeSentence('de', { structure: 'modal', modal: 'can', subject: { noun: 'man' }, verb: 'like', object: { noun: 'cake', determiner: 'definite' } })).toBeNull();
  });
});

describe('composed English sentences', () => {
  it('agrees the verb with the subject', () => {
    expect(sentence(composeSentence('en', { structure: 'statement', subject: { noun: 'woman' }, verb: 'buy', object: { noun: 'apple', determiner: 'indefinite', adjective: 'red' }, time: 'everyDay' }))).toBe('The woman buys a red apple every day.');
    expect(sentence(composeSentence('en', { structure: 'statement', subject: { pronoun: 'they' }, verb: 'carry', object: { noun: 'bag', determiner: 'indefinite', adjective: 'heavy' } }))).toBe('They carry a heavy bag.');
    expect(sentence(composeSentence('en', { structure: 'statement', subject: { pronoun: 'she' }, verb: 'carry', object: { noun: 'umbrella', determiner: 'indefinite' } }))).toBe('She carries an umbrella.');
    expect(sentence(composeSentence('en', { structure: 'statement', subject: { noun: 'man' }, verb: 'have', object: { noun: 'dog', determiner: 'indefinite' } }))).toBe('The man has a dog.');
  });

  it('accepts a fronted time phrase', () => {
    const exercise = composeSentence('en', { structure: 'inversion', subject: { noun: 'child' }, verb: 'read', object: { noun: 'book', determiner: 'indefinite', adjective: 'old' }, time: 'evening' });
    expect(exercise!.answers).toEqual(['In the evening, the child reads an old book.', 'The child reads an old book in the evening.']);
  });

  it('uses do-support in questions and negation', () => {
    expect(sentence(composeSentence('en', { structure: 'question', subject: { noun: 'man' }, verb: 'drink', object: { noun: 'coffee', determiner: 'indefinite', adjective: 'black' } }))).toBe('Does the man drink black coffee?');
    expect(sentence(composeSentence('en', { structure: 'question', subject: { pronoun: 'you' }, verb: 'search', object: { noun: 'key', determiner: 'definite' } }))).toBe('Do you look for the key?');
    expect(sentence(composeSentence('en', { structure: 'negation', subject: { noun: 'girl' }, verb: 'like', object: { noun: 'cake', determiner: 'definite' } }))).toBe('The girl does not like the cake.');
    expect(sentence(composeSentence('en', { structure: 'wquestion', subject: { noun: 'woman' }, verb: 'eat', time: 'everyMorning' }))).toBe('What does the woman eat every morning?');
  });

  it('keeps the bare infinitive after a modal and builds that/because clauses', () => {
    expect(sentence(composeSentence('en', { structure: 'modal', modal: 'can', subject: { noun: 'boy' }, verb: 'carry', object: { noun: 'bag', determiner: 'definite' } }))).toBe('The boy can carry the bag.');
    expect(sentence(composeSentence('en', { structure: 'dass', frame: 'know', subject: { noun: 'woman' }, verb: 'wash', object: { noun: 'car', determiner: 'definite' } }))).toBe('I know that the woman washes the car.');
    expect(sentence(composeSentence('en', { structure: 'weil', subject: { noun: 'dog' }, verb: 'find', object: { noun: 'ball', determiner: 'definite' } }))).toBe('The dog is happy because it finds the ball.');
    expect(sentence(composeSentence('en', { structure: 'dative', subject: { noun: 'man' }, verb: 'give', recipient: { noun: 'child', determiner: 'definite' }, object: { noun: 'apple', determiner: 'indefinite' } }))).toBe('The man gives the child an apple.');
  });

  it('leaves out German-only time words and modals', () => {
    expect(composeSentence('en', { structure: 'inversion', subject: { noun: 'man' }, verb: 'buy', object: { noun: 'bread', determiner: 'indefinite' }, time: 'today' })).toBeNull();
    expect(composeSentence('en', { structure: 'modal', modal: 'wouldLike', subject: { noun: 'man' }, verb: 'eat', object: { noun: 'apple', determiner: 'indefinite' } })).toBeNull();
  });
});

describe('the word-order pool', () => {
  for (const language of ['de', 'en'] as const) {
    for (const level of vocabularyLevels) {
      it(`builds well-formed ${language.toUpperCase()} ${level.toUpperCase()} exercises`, () => {
        const pool = orderExercisePool(language, level);
        expect(pool.length).toBeGreaterThanOrEqual(10);
        expect(new Set(pool.map((exercise) => exercise.id)).size).toBe(pool.length);
        for (const exercise of pool) {
          const sorted = [...exercise.tokens].map((token) => token.toLocaleLowerCase()).sort();
          for (const answer of exercise.answers) {
            // Every answer uses exactly the tiles, starts with a capital and ends with punctuation.
            expect([...sentenceTokens(answer)].map((token) => token.toLocaleLowerCase()).sort(), answer).toEqual(sorted);
            expect(answer).toMatch(/^\p{Lu}.*[.?]$/u);
            expect(matchOrder(exercise, sentenceTokens(answer))).toBe(answer);
          }
          expect(new Set(exercise.answers).size).toBe(exercise.answers.length);
        }
      });
    }
  }

  it('keeps the German finite verb second in main clauses and last after dass/weil', () => {
    for (const level of vocabularyLevels) {
      for (const exercise of orderExercisePool('de', level)) {
        const roles = exercise.parts.map((item) => item.role);
        if (['statement', 'inversion', 'negation', 'modal', 'dative', 'wquestion'].includes(exercise.structure)) expect(roles[1], exercise.id).toBe('verb');
        if (exercise.structure === 'question') expect(roles[0], exercise.id).toBe('verb');
        if (exercise.structure === 'dass' || exercise.structure === 'weil') expect(roles.at(-1), exercise.id).toBe('verb');
        if (exercise.structure === 'modal') expect(roles.at(-1), exercise.id).toBe('infinitive');
      }
    }
  });

  it('matches every German article to the gender and case of its noun', () => {
    for (const level of vocabularyLevels) {
      for (const exercise of orderExercisePool('de', level)) {
        for (const item of exercise.parts) {
          if (!item.grammarCase || !item.gender) continue;
          const first = item.tokens[0]!;
          const allowed = [definiteArticlesByCase[item.grammarCase][item.gender], indefiniteArticlesByCase[item.grammarCase][item.gender], `k${indefiniteArticlesByCase[item.grammarCase][item.gender]}`];
          // Mass nouns without an article open with their adjective or the noun itself.
          if (/^\p{Ll}/u.test(first) && !/^(der|die|das|den|dem|ein|eine|einen|einem|einer|kein|keine|keinen|keinem|keiner)$/u.test(first)) continue;
          if (/^\p{Lu}/u.test(first)) continue;
          expect(allowed, exercise.id).toContain(first);
        }
      }
    }
  });

  it('uses the conjugation table for the German verb', () => {
    const forms = new Set(Object.values(verbConjugations).flatMap((entry) => entry.forms));
    for (const exercise of orderExercisePool('de', 'a2')) {
      const verb = exercise.parts.find((item) => item.role === 'verb');
      if (verb) expect(forms.has(verb.tokens[0]!), exercise.id).toBe(true);
    }
  });

  it('agrees English verbs: -s after he, she, it and singular nouns, do/does in questions', () => {
    for (const exercise of orderExercisePool('en', 'a2')) {
      const subject = exercise.parts.find((item) => item.role === 'subject');
      const verb = exercise.parts.find((item) => item.role === 'verb');
      if (!subject || !verb) continue;
      const singular = !['I', 'you', 'we', 'they'].includes(subject.tokens[0]!);
      if (exercise.structure === 'question' || exercise.structure === 'wquestion' || exercise.structure === 'negation') expect(verb.tokens[0], exercise.id).toBe(singular ? 'does' : 'do');
      else if (exercise.structure === 'statement' || exercise.structure === 'inversion') expect(verb.tokens[0]!.endsWith('s'), exercise.id).toBe(singular);
    }
  });

  it('stays the same between visits, so review progress keeps its keys', () => {
    expect(orderExercisePool('de', 'a1').map((exercise) => exercise.id)).toEqual(orderExercisePool('de', 'a1').map((exercise) => exercise.id));
  });

  it('leaves out a German noun whose vocabulary entry names another gender', () => {
    const metadata = { APFEL: { spelling: 'Apfel', type: 'noun', gender: 'feminine' as const } };
    const pool = orderExercisePool('de', 'a1', { metadata, count: 60 });
    expect(pool.some((exercise) => exercise.tokens.includes('Apfel'))).toBe(false);
    expect(orderExercisePool('de', 'a1', { count: 60 }).some((exercise) => exercise.tokens.includes('Apfel'))).toBe(true);
  });
});

describe('hand-checked sentences and checking an order', () => {
  it('lowercases the first tile unless it is always capitalised', () => {
    const [first] = curatedExercises('de', 'a1');
    expect(first!.tokens).toEqual(['ich', 'lerne', 'jeden', 'Tag', 'Deutsch']);
    const english = curatedExercises('en', 'a1')[0]!;
    expect(english.tokens[0]).toBe('I');
  });

  it('accepts every listed order and nothing else', () => {
    const exercise = curatedExercises('de', 'a1')[0]!;
    expect(matchOrder(exercise, ['jeden', 'Tag', 'lerne', 'ich', 'Deutsch'])).toBe('Jeden Tag lerne ich Deutsch.');
    expect(matchOrder(exercise, ['ich', 'jeden', 'Tag', 'lerne', 'Deutsch'])).toBeNull();
  });

  it('shuffles tiles away from a correct order', () => {
    const exercise = curatedExercises('de', 'a1')[2]!;
    let calls = 0;
    const tiles = shuffleTiles(exercise, (values) => (calls++ === 0 ? [...values] : [...values].reverse()), Math.random);
    expect(matchOrder(exercise, tiles)).toBeNull();
    expect(shuffled(tiles, Math.random).length).toBe(exercise.tokens.length);
  });
});
