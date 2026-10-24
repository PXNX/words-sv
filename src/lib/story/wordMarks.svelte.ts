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
  #frame = 0;

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
    const weights = this.#weights(words, sentence);
    const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    let elapsed = 0;
    for (const [index, word] of words.entries()) {
      this.#timers.push(window.setTimeout(() => this.#show(beat, offset, word), (elapsed / total) * milliseconds));
      elapsed += weights[index];
    }
  }

  /**
   * Follows audio whose real playback position is known, so the highlight uses the audio clock
   * instead of drifting timers. The word lengths only decide where inside the clip each word starts.
   */
  follow(beat: number, offset: number, sentence: string, seconds: number, position: () => number) {
    this.#cancel();
    const words = wordsOf(sentence);
    if (!words.length) return;
    if (!Number.isFinite(seconds) || seconds <= 0) {
      this.pace(beat, offset, sentence, words.length * 260);
      return;
    }
    const weights = this.#weights(words, sentence);
    const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    const ends: number[] = [];
    let cumulative = 0;
    for (const weight of weights) {
      cumulative += weight;
      ends.push(cumulative / total);
    }
    let shown = -1;
    const tick = () => {
      const elapsed = Math.max(0, Math.min(seconds, position()));
      const progress = elapsed / seconds;
      const end = ends.findIndex((candidate) => progress < candidate);
      const index = end === -1 ? words.length - 1 : end;
      if (index !== shown) {
        shown = index;
        this.#show(beat, offset, words[index]);
      }
      if (elapsed < seconds) this.#frame = requestAnimationFrame(tick);
    };
    if (typeof requestAnimationFrame === 'undefined') tick();
    else this.#frame = requestAnimationFrame(tick);
  }

  clear() {
    this.#cancel();
    this.current = null;
  }

  #weights(words: Word[], sentence: string) {
    return words.map((word, index) => word.end - word.start + 1 + (/[.,!?;:…–—]/u.test(sentence.slice(word.end, words[index + 1]?.start ?? sentence.length)) ? PAUSE_WEIGHT : 0));
  }

  #show(beat: number, offset: number, word: Word) {
    this.current = { beat, start: offset + word.start, end: offset + word.end };
  }

  #cancel() {
    for (const timer of this.#timers) clearTimeout(timer);
    this.#timers = [];
    if (this.#frame && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }
}
