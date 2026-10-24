import { wordsOf, type Word } from './speech';

/*
 * Highlights the word being read aloud in the transcript. A line is read sentence by sentence;
 * each sentence is a stretch of the beat's text starting at `offset`. Speech engines that report
 * word boundaries move the highlight exactly; for the others (and for natural voices, whose length
 * is known up front) the words are spread over the time the sentence takes, longer words and
 * punctuation taking longer.
 */
const PAUSE_WEIGHT = 3;

export class WordMarks {
  /** The beat and the stretch of its text being spoken right now. */
  current = $state<{ beat: number; start: number; end: number } | null>(null);

  #timers: number[] = [];

  /** Highlights the word at (or right after) `at` in the sentence. */
  mark(beat: number, offset: number, sentence: string, at: number) {
    this.#cancel();
    const word = wordsOf(sentence).findLast((candidate) => candidate.start <= at) ?? wordsOf(sentence)[0];
    if (word) this.#show(beat, offset, word);
  }

  /** Walks the highlight through the sentence over `milliseconds`. */
  pace(beat: number, offset: number, sentence: string, milliseconds: number) {
    this.#cancel();
    const words = wordsOf(sentence);
    const weights = words.map((word, index) => word.end - word.start + 1 + (/[.,!?;:…–—]/u.test(sentence.slice(word.end, words[index + 1]?.start ?? sentence.length)) ? PAUSE_WEIGHT : 0));
    const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    let elapsed = 0;
    for (const [index, word] of words.entries()) {
      this.#timers.push(window.setTimeout(() => this.#show(beat, offset, word), (elapsed / total) * milliseconds));
      elapsed += weights[index];
    }
  }

  clear() {
    this.#cancel();
    this.current = null;
  }

  #show(beat: number, offset: number, word: Word) {
    this.current = { beat, start: offset + word.start, end: offset + word.end };
  }

  #cancel() {
    for (const timer of this.#timers) clearTimeout(timer);
    this.#timers = [];
  }
}
