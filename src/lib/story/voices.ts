import type { CharacterId } from './stories';

/*
 * Every story character gets its own voice. Browsers expose different voice lists, so each
 * character asks for a voice gender, spreads across the matching voices in a fixed order (so Mia
 * and Kim do not share a voice when two female voices exist), and adds its own pitch and pace.
 * Even with a single installed voice, the pitch/rate profile keeps the characters apart.
 */
type VoiceGender = 'female' | 'male';
type VoiceProfile = { gender?: VoiceGender; pitch: number; rate: number; volume: number };
export type Speaker = CharacterId | 'narrator';

const profiles: Record<Speaker, VoiceProfile> = {
  narrator: { pitch: 1, rate: 1, volume: 1 },
  mia: { gender: 'female', pitch: 1.1, rate: 1, volume: 1 },
  kim: { gender: 'female', pitch: 1.2, rate: 1.06, volume: 1 },
  oma: { gender: 'female', pitch: 0.88, rate: 0.86, volume: 1 },
  // Lilith speaks slowly, softly and a little low: calm, soothing, never shrill.
  lilith: { gender: 'female', pitch: 0.92, rate: 0.8, volume: 0.85 },
  tom: { gender: 'male', pitch: 0.95, rate: 1, volume: 1 },
  leo: { gender: 'male', pitch: 1.08, rate: 1.06, volume: 1 },
  paul: { gender: 'male', pitch: 0.75, rate: 0.9, volume: 1 },
  bello: { gender: 'male', pitch: 1.55, rate: 1.15, volume: 1 }
};

// Order in which characters of one gender claim voices; Lilith gets first pick of the soft voices.
const claimOrder: Record<VoiceGender, Speaker[]> = {
  female: ['mia', 'lilith', 'kim', 'oma'],
  male: ['tom', 'leo', 'paul', 'bello']
};

const FEMALE_NAMES = /female|woman|frau|anna|katja|hedda|marlene|vicki|petra|helena|amala|amelie|amélie|denise|elsa|seraphina|ingrid|isabella|elena|laura|lucia|lucía|paulina|monica|mónica|alice|federica|francisca|luciana|camila|vit[oó]ria|thalita|polina|lesya|zira|hazel|susan|libby|sonia|serena|kate|samantha|victoria|karen|moira|tessa|fiona|audrey|aur[ée]lie|julie|marie|eloise|ximena|elvira|dalia|raquel|fernanda|leila/i;
const MALE_NAMES = /\bmale|\bman\b|mann|stefan|markus|conrad|yannick|killian|florian|jonas|ralf|hans|daniel|george|ryan|thomas|guy|henri|claude|diego|pablo|jorge|ra[uú]l|alvaro|álvaro|cosimo|luca|giorgio|diego|antonio|duarte|ostap|alex|fred|oliver|james|david|mark|richard|arthur|reed|eddy|thiago|benigno|rocko|grandpa/i;

function genderOf(voice: SpeechSynthesisVoice): VoiceGender | null {
  if (FEMALE_NAMES.test(voice.name)) return 'female';
  if (MALE_NAMES.test(voice.name)) return 'male';
  return null;
}

// Natural/neural voices (Edge, newer Chrome/Android) sound far calmer than the classic ones.
function quality(voice: SpeechSynthesisVoice) {
  return /natural|neural|online|premium|enhanced/i.test(voice.name) ? 0 : 1;
}

export function voiceFor(speaker: Speaker, language: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const local = voices
    .filter((voice) => voice.lang.toLowerCase().startsWith(language))
    .sort((left, right) => quality(left) - quality(right) || left.name.localeCompare(right.name));
  if (local.length === 0) return null;
  const gender = profiles[speaker].gender;
  if (!gender) return local[0];
  const matching = local.filter((voice) => genderOf(voice) === gender);
  const pool = matching.length ? matching : local.filter((voice) => genderOf(voice) === null);
  if (pool.length === 0) return local[0];
  return pool[Math.max(0, claimOrder[gender].indexOf(speaker)) % pool.length];
}

export function applyVoice(utterance: SpeechSynthesisUtterance, speaker: Speaker, language: string, baseRate: number) {
  const profile = profiles[speaker];
  utterance.voice = voiceFor(speaker, language, window.speechSynthesis.getVoices());
  utterance.pitch = profile.pitch;
  utterance.rate = baseRate * profile.rate;
  utterance.volume = profile.volume;
}
