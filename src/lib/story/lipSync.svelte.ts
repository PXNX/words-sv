/*
 * Moves a character's mouth along with the speech synthesis reading their line. Speech engines
 * report where each word starts (boundary events); from there every syllable of the upcoming words
 * gets an open-close pulse whose height depends on its vowel (wide for "a"/"o", narrow for "i"/"u").
 * Engines without boundary events still get the estimated timeline scheduled when speech starts;
 * engines with them re-sync on every word, so the mouth never drifts away from the audio.
 */
type Keyframe = { at: number; open: number };

const VOWELS = /[aeiouyäöüàâáãéèêíìîóòôõúùûœæ]+|[аеєиіїоуюяыэё]+/giu;
const SYLLABLE_MS = 190;
const WORD_GAP_MS = 60;
const PUNCTUATION_PAUSE_MS = 260;

function openingFor(vowels: string) {
  const vowel = vowels[0]?.toLowerCase() ?? '';
  if (/[aáàâãäoóòôõоая]/u.test(vowel)) return 1;
  if (/[eéèêëöœæеєэё]/u.test(vowel)) return 0.72;
  if (/[uúùûüую]/u.test(vowel)) return 0.55;
  return 0.5;
}

export class LipSync {
  /** Who is being read aloud right now, and which story beat. */
  speaker = $state<string | null>(null);
  beat = $state<number | null>(null);
  /** Mouth opening from 0 (closed) to 1 (wide open). */
  open = $state(0);

  #frames: Keyframe[] = [];
  #frame = 0;
  #token = 0;

  attach(utterance: SpeechSynthesisUtterance, text: string, speaker: string, beat: number | null) {
    const token = ++this.#token;
    const rate = utterance.rate || 1;
    utterance.addEventListener('start', () => {
      if (token !== this.#token) return;
      this.speaker = speaker;
      this.beat = beat;
      this.#schedule(text, 0, rate);
    });
    utterance.addEventListener('boundary', (event) => {
      if (token !== this.#token || (event.name && event.name !== 'word')) return;
      this.#schedule(text, event.charIndex, rate);
    });
    const finish = () => {
      if (token === this.#token) this.stop();
    };
    utterance.addEventListener('end', finish);
    utterance.addEventListener('error', finish);
  }

  stop() {
    this.#token += 1;
    this.#frames = [];
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.speaker = null;
    this.beat = null;
    this.open = 0;
  }

  #schedule(text: string, fromChar: number, rate: number) {
    const now = performance.now();
    const syllable = SYLLABLE_MS / rate;
    const frames: Keyframe[] = [{ at: now, open: this.open }];
    let at = now;
    for (const word of text.slice(fromChar).match(/\S+/g) ?? []) {
      const syllables = word.match(VOWELS) ?? [word];
      for (const vowels of syllables) {
        frames.push({ at: at + syllable * 0.3, open: openingFor(vowels) }, { at: at + syllable * 0.8, open: 0.1 });
        at += syllable;
      }
      at += WORD_GAP_MS / rate;
      if (/[.,!?;:…]$/.test(word)) {
        frames.push({ at: at, open: 0 });
        at += PUNCTUATION_PAUSE_MS / rate;
      }
    }
    frames.push({ at: at + 80, open: 0 });
    this.#frames = frames;
    if (!this.#frame) this.#frame = requestAnimationFrame(this.#tick);
  }

  #tick = (now: number) => {
    const frames = this.#frames;
    const next = frames.findIndex((frame) => frame.at >= now);
    if (next === -1) {
      this.open = 0;
    } else if (next === 0) {
      this.open = frames[0].open;
    } else {
      const from = frames[next - 1];
      const to = frames[next];
      const progress = (now - from.at) / Math.max(1, to.at - from.at);
      this.open = from.open + (to.open - from.open) * progress;
    }
    this.#frame = this.speaker ? requestAnimationFrame(this.#tick) : 0;
  };
}
