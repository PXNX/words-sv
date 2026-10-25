import type { CharacterId, Mood } from './stories';
import { intonationOf, type Intonation } from './speech';

/*
 * Every story character gets a voice of their own. Instead of pitching one voice up and down, the
 * cast of a story is spread over genuinely different installed voices: all regional variants of the
 * language count (de-DE, de-AT, de-CH, en-GB, en-US, en-AU, …), natural/neural voices come first,
 * and no two speakers share a voice while unused ones are left. Real voices keep their natural pitch,
 * since pitch shifts are what makes synthetic speech sound robotic; only when the browser has too
 * few voices and two speakers have to share one does the character's pitch profile kick in, and even
 * then only a little. Mood and sentence melody mostly change the pace and loudness, barely the
 * pitch. Animals are the exception: they are meant to sound like cartoon animals.
 */
export type VoiceGender = 'female' | 'male';
// Where a character's way of speaking comes from. Speech engines have no Bavarian or Berlin voices,
// so a dialect picks the closest thing installed: an Austrian or Swiss voice for the south, a voice
// from Germany for Berlin and the north, and a matching regional accent where the natural English
// voices have one (Scottish for the Bavarians, Irish for the mountain farmer, London for Berlin,
// northern English for Hamburg).
export type Dialect = 'bavarian' | 'alpine' | 'berlin' | 'northern';
// Natural voices usually keep their own pitch; an older character can ask for a small, deliberate
// lowering and slowdown on top of the selected speaker.
export type VoiceAge = { pitch?: number; rate?: number };
export type VoiceProfile = { gender: VoiceGender; pitch: number; rate: number; volume: number; dialect?: Dialect; natural?: VoiceAge };
// The regional locales a dialect prefers among the system voices of the language, best first.
// Berlin and the north need nothing special: voices from Germany come first anyway.
const dialectLocales: Record<Dialect, string[]> = { bavarian: ['de-at', 'de-ch'], alpine: ['de-ch', 'de-at'], berlin: [], northern: [] };
export type Speaker = CharacterId | 'narrator' | 'announcer';

export const profiles: Record<Speaker, VoiceProfile> = {
  // The storyteller reads the narration in a deep, calm, unhurried male voice.
  narrator: { gender: 'male', pitch: 0.8, rate: 0.9, volume: 0.95 },
  // Station announcements: a brisk, even, slightly flat female voice, as over a loudspeaker.
  announcer: { gender: 'female', pitch: 0.92, rate: 1.04, volume: 0.8 },
  mia: { gender: 'female', pitch: 1.08, rate: 1, volume: 1 },
  kim: { gender: 'female', pitch: 1.2, rate: 1.08, volume: 1 },
  // Oma is deliberately older: a little lower, slower and softer than the other women, even when
  // the natural model gives her a younger reader's voice.
  oma: { gender: 'female', pitch: 0.84, rate: 0.8, volume: 0.95, natural: { pitch: 0.94, rate: 0.8 } },
  // Lilith speaks slowly, softly and a little low: calm, soothing, never shrill.
  lilith: { gender: 'female', pitch: 0.94, rate: 0.82, volume: 0.85 },
  tom: { gender: 'male', pitch: 1, rate: 1, volume: 1 },
  leo: { gender: 'male', pitch: 1.12, rate: 1.07, volume: 1 },
  paul: { gender: 'male', pitch: 0.78, rate: 0.9, volume: 1 },
  bello: { gender: 'male', pitch: 1.5, rate: 1.14, volume: 1 },
  // Hans takes his time and speaks low and warm, a Bavarian through and through.
  hans: { gender: 'male', pitch: 0.86, rate: 0.9, volume: 1, dialect: 'bavarian' },
  // Albert speaks crisply and a little quicker than the others, with no time to waste.
  albert: { gender: 'male', pitch: 0.95, rate: 1.06, volume: 1, dialect: 'berlin' },
  sabine: { gender: 'female', pitch: 1, rate: 1.02, volume: 1 },
  // Enzo the pizza baker talks fast and lively; Jana rattles off her sentences like code.
  enzo: { gender: 'male', pitch: 1.06, rate: 1.08, volume: 1 },
  jana: { gender: 'female', pitch: 1.12, rate: 1.1, volume: 1 },
  // Herr Becker speaks like a teacher: measured and clear.
  becker: { gender: 'male', pitch: 0.92, rate: 0.94, volume: 1 },
  // Ali talks quick and warm over the noise of his döner shop; Robert the handyman is gruff and short-spoken.
  ali: { gender: 'male', pitch: 0.92, rate: 1.08, volume: 1 },
  robert: { gender: 'male', pitch: 0.84, rate: 0.94, volume: 1 },
  // Bauer Fritz rumbles deep and slow, in a southern voice where there is one.
  fritz: { gender: 'male', pitch: 0.74, rate: 0.84, volume: 1, dialect: 'alpine' },
  // Tobias is loud and pumped; Selma the nurse speaks calmly and reassuringly.
  tobias: { gender: 'male', pitch: 1.04, rate: 1.1, volume: 1 },
  selma: { gender: 'female', pitch: 1, rate: 0.94, volume: 0.95 },
  // Kumar chatters fast and cheerfully; Simon the engineer is precise and even.
  kumar: { gender: 'male', pitch: 1.1, rate: 1.14, volume: 1 },
  simon: { gender: 'male', pitch: 0.98, rate: 0.98, volume: 1, dialect: 'northern' },
  // Herr Bäuerle speaks calmly and a little slowly, with the friendly certainty of a bank adviser.
  banker: { gender: 'male', pitch: 0.9, rate: 0.92, volume: 1 },
  // König Ludwig speaks slowly and grandly, as befits a king on a stage.
  ludwig: { gender: 'male', pitch: 0.9, rate: 0.88, volume: 1, dialect: 'bavarian' },
  // The animals mostly speak in sounds; when they do talk, their voices match their size.
  crow: { gender: 'male', pitch: 0.9, rate: 1.08, volume: 1 },
  seagull: { gender: 'female', pitch: 1.24, rate: 1.12, volume: 1 },
  deer: { gender: 'female', pitch: 1.28, rate: 0.94, volume: 0.85 },
  fox: { gender: 'male', pitch: 1.16, rate: 1.1, volume: 0.95 },
  bird: { gender: 'female', pitch: 1.7, rate: 1.18, volume: 0.9 },
  cow: { gender: 'female', pitch: 0.78, rate: 0.82, volume: 1 },
  horse: { gender: 'male', pitch: 0.95, rate: 1.04, volume: 1 },
  giraffe: { gender: 'female', pitch: 1.12, rate: 0.86, volume: 0.9 },
  elephant: { gender: 'male', pitch: 0.68, rate: 0.84, volume: 1 },
  snake: { gender: 'female', pitch: 0.98, rate: 0.86, volume: 0.85 }
};

// Who picks first when voices are scarce: the narrator talks most, then the main characters.
// A speaker whose regional voice is installed jumps the queue, so nobody else takes it.
export const priority: Speaker[] = ['narrator', 'announcer', 'mia', 'tom', 'lilith', 'oma', 'paul', 'kim', 'leo', 'hans', 'albert', 'sabine', 'enzo', 'jana', 'becker', 'ali', 'robert', 'fritz', 'tobias', 'selma', 'kumar', 'simon', 'banker', 'ludwig', 'bello', 'bird', 'cow', 'horse', 'giraffe', 'elephant', 'snake', 'deer', 'fox', 'seagull', 'crow'];
export const animals: Speaker[] = ['bello', 'crow', 'seagull', 'deer', 'fox', 'bird', 'cow', 'horse', 'giraffe', 'elephant', 'snake'];

function accentRank(speaker: Speaker, voice: SpeechSynthesisVoice, dialects = true) {
  const dialect = dialects ? profiles[speaker].dialect : undefined;
  const accent = dialect ? dialectLocales[dialect] : [];
  const rank = accent.findIndex((locale) => voice.lang.toLowerCase().startsWith(locale));
  return rank === -1 ? accent.length : rank;
}

// How a line's mood changes the delivery: sad lines slow down and drop, excited ones speed up.
export const moodShape: Record<Mood, { pitch: number; rate: number; volume: number }> = {
  neutral: { pitch: 1, rate: 1, volume: 1 },
  happy: { pitch: 1.03, rate: 1.04, volume: 1 },
  sad: { pitch: 0.97, rate: 0.9, volume: 0.85 },
  surprised: { pitch: 1.04, rate: 1.06, volume: 1 },
  curious: { pitch: 1.02, rate: 0.98, volume: 1 },
  angry: { pitch: 0.98, rate: 1.06, volume: 1 },
  worried: { pitch: 1.02, rate: 1.04, volume: 0.9 },
  laughing: { pitch: 1.04, rate: 1.05, volume: 1 },
  sleepy: { pitch: 0.96, rate: 0.85, volume: 0.8 }
};

// Speech engines take one pitch per utterance, so lines are spoken sentence by sentence and each
// sentence is nudged as a whole: a question a touch higher and slower, an exclamation quicker and
// louder, a trailing "…" slower and softer. The voices already raise questions on their own.
const intonationShape: Record<Intonation, { pitch: number; rate: number; volume: number }> = {
  statement: { pitch: 1, rate: 1, volume: 0.92 },
  question: { pitch: 1.03, rate: 0.97, volume: 1 },
  exclamation: { pitch: 1.04, rate: 1.06, volume: 1.1 },
  trailing: { pitch: 0.98, rate: 0.88, volume: 0.85 }
};

const FEMALE_NAMES = /female|woman|frau|anna|katja|hedda|marlene|vicki|petra|helena|amala|amelie|amélie|denise|elsa|seraphina|ingrid|isabella|elena|laura|lucia|lucía|paulina|monica|mónica|alice|federica|francisca|luciana|camila|vit[oó]ria|thalita|polina|lesya|zira|hazel|susan|libby|sonia|serena|kate|samantha|victoria|karen|moira|tessa|fiona|audrey|aur[ée]lie|julie|marie|eloise|ximena|elvira|dalia|raquel|fernanda|leila|aria|jenny|michelle|ana\b|emma|ava|natasha|clara|sylvie|ariane|vivienne|brigitte|leni|louisa|giselle|irma|elke|joanna|nancy|sara|jane|emily|maisie|bella|abbie|hollie|olivia|mia\b|neerja|imani|leah|molly|annette|amanda|nanami|heloisa|brenda|giovanna|leticia|manuela|yolanda|beatriz|estrella|irene|isidora|paloma|salome|teresa|larissa|catarina|raquel|fabiola|giuseppina|isabella|palmira|pierina|elsa|imelda|valeria|jacqueline|coralie|josephine|yvette|celeste|gisela|klarissa|maja|tanja/i;
const MALE_NAMES = /\bmale|\bman\b|mann|stefan|markus|conrad|yannick|killian|florian|jonas|ralf|hans|daniel|george|ryan|thomas|guy|henri|claude|diego|pablo|jorge|ra[uú]l|alvaro|álvaro|cosimo|luca|giorgio|antonio|duarte|ostap|alex|fred|oliver|james|david|mark|richard|arthur|reed|eddy|thiago|benigno|rocko|grandpa|andrew|brian|christopher|eric|guy|roger|steffan|william|liam|connor|elliot|noah|ethan|alfie|prabhat|kai|klaus|kasper|bernd|christoph|georg|jan\b|ralf|gerard|maurice|remy|rémy|jean|alain|antoine|fabrice|jerome|jérôme|thierry|alessio|benigno|calimero|diego|gianni|giuseppe|lisandro|rinaldo|alvaro|arnau|dario|elias|gerardo|jorge|liberto|nil\b|saul|tomas|tomás|vicente|antonio|donato|fabio|humberto|julio|leandro|nicolau|valerio|cristiano/i;

function genderOf(voice: SpeechSynthesisVoice): VoiceGender | null {
  if (FEMALE_NAMES.test(voice.name)) return 'female';
  if (MALE_NAMES.test(voice.name)) return 'male';
  return null;
}

// Natural/neural voices (Edge, newer Chrome/Android) sound far more human than the classic ones.
function quality(voice: SpeechSynthesisVoice) {
  return /natural|neural|online|premium|enhanced/i.test(voice.name) ? 0 : 1;
}

// Voices for the language, best first; the learner's main locale comes before regional variants.
function voicesFor(language: string, locale: string, voices: SpeechSynthesisVoice[]) {
  const main = locale.toLowerCase();
  return voices
    .filter((voice) => voice.lang.toLowerCase().startsWith(language))
    .sort((left, right) =>
      quality(left) - quality(right)
      || Number(!left.lang.toLowerCase().startsWith(main)) - Number(!right.lang.toLowerCase().startsWith(main))
      || left.name.localeCompare(right.name));
}

type Casting = Map<Speaker, { voice: SpeechSynthesisVoice | null; shared: boolean }>;
let cached: { key: string; casting: Casting } | null = null;

// Gives every speaker of the story a voice: an unused voice of their gender, else an unused voice
// of unknown gender, else the least used voice of their gender (which then counts as shared).
function castVoices(cast: Speaker[], language: string, locale: string, dialects: boolean): Casting {
  const voices = voicesFor(language, locale, window.speechSynthesis.getVoices());
  const hasAccentVoice = (speaker: Speaker) => dialects && voices.some((voice) => accentRank(speaker, voice) < (profiles[speaker].dialect ? dialectLocales[profiles[speaker].dialect!].length : 0));
  const speakers = priority.filter((speaker) => speaker === 'narrator' || cast.includes(speaker))
    // The narrator always casts first, so the storyteller keeps the same male voice across stories;
    // characters with a regional voice only choose after them.
    .sort((left, right) => {
      if (left === 'narrator') return -1;
      if (right === 'narrator') return 1;
      return Number(!hasAccentVoice(left)) - Number(!hasAccentVoice(right));
    });
  const key = `${language}|${locale}|${dialects ? 'dialects' : 'plain'}|${speakers.join()}|${voices.map((voice) => voice.voiceURI).join()}`;
  if (cached?.key === key) return cached.casting;

  const uses = new Map<SpeechSynthesisVoice, number>();
  const picks = new Map<Speaker, SpeechSynthesisVoice | null>();
  for (const speaker of speakers) {
    const gender = profiles[speaker].gender;
    const unused = (voice: SpeechSynthesisVoice) => !uses.has(voice);
    const ofGender = voices.filter((voice) => genderOf(voice) === gender).sort((left, right) => accentRank(speaker, left, dialects) - accentRank(speaker, right, dialects));
    const pool = ofGender.length ? ofGender : voices.filter((voice) => genderOf(voice) === null);
    const voice = ofGender.find(unused)
      ?? voices.find((voice) => genderOf(voice) === null && unused(voice))
      ?? [...(pool.length ? pool : voices)].sort((left, right) => (uses.get(left) ?? 0) - (uses.get(right) ?? 0))[0]
      ?? null;
    if (voice) uses.set(voice, (uses.get(voice) ?? 0) + 1);
    picks.set(speaker, voice);
  }
  // Oma and Leo trade the voices they would get, which suit each of them better.
  if (picks.has('oma') && picks.has('leo')) {
    const oma = picks.get('oma') ?? null;
    picks.set('oma', picks.get('leo') ?? null);
    picks.set('leo', oma);
  }
  const casting: Casting = new Map([...picks].map(([speaker, voice]) => [speaker, { voice, shared: !voice || (uses.get(voice) ?? 0) > 1 }]));
  cached = { key, casting };
  return casting;
}

// A human sharing a voice moves at most about a semitone and a half away from it.
export function sharedPitch(pitch: number) {
  return Math.min(1.1, Math.max(0.9, 1 + (pitch - 1) * 0.5));
}

function wobble(amount: number) {
  return 1 + (Math.random() * 2 - 1) * amount;
}

export function applyVoice(utterance: SpeechSynthesisUtterance, speaker: Speaker, language: string, locale: string, cast: Speaker[], baseRate: number, mood: Mood = 'neutral', dialects = true) {
  const profile = profiles[speaker];
  const { voice, shared } = castVoices(cast, language, locale, dialects).get(speaker) ?? { voice: null, shared: true };
  const shape = moodShape[mood];
  // With a voice of their own, characters keep its natural pitch; a shared voice is shifted just
  // enough to tell the speakers apart. Animals keep their full profile either way.
  const ownPitch = animals.includes(speaker) ? profile.pitch : shared ? sharedPitch(profile.pitch) : 1;
  const tone = intonationShape[intonationOf(utterance.text)];
  utterance.voice = voice;
  if (voice) utterance.lang = voice.lang;
  utterance.pitch = Math.min(2, Math.max(0.1, ownPitch * shape.pitch * tone.pitch * wobble(0.015)));
  utterance.rate = Math.min(10, Math.max(0.1, baseRate * profile.rate * shape.rate * tone.rate * wobble(0.04)));
  utterance.volume = Math.min(1, profile.volume * shape.volume * tone.volume);
}
