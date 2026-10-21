export type SuccessSound = 'circle' | 'wordle' | 'vocab' | 'grammar' | 'pronunciation';
export type ErrorSound = 'vocab' | 'grammar';

const successNoteSets: Record<SuccessSound, number[]> = {
  circle: [523.25, 659.25, 783.99],
  wordle: [440, 659.25],
  vocab: [587.33, 783.99],
  grammar: [659.25, 830.61],
  pronunciation: [523.25, 659.25, 783.99, 1046.5]
};
const errorNoteSets: Record<ErrorSound, number[]> = {
  vocab: [329.63, 246.94],
  grammar: [329.63, 246.94]
};

function playNotes(enabled: boolean, notes: number[]) {
  if (!enabled || typeof window === 'undefined') return;
  const legacyWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextClass = window.AudioContext ?? legacyWindow.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    const context = new AudioContextClass();
    const start = context.currentTime;
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, start + index * 0.075);
      gain.gain.setValueAtTime(0.0001, start + index * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.07, start + index * 0.075 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.075 + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + index * 0.075);
      oscillator.stop(start + index * 0.075 + 0.18);
    });
    window.setTimeout(() => void context.close(), 430);
  } catch { /* Audio is optional and must never block play. */ }
}

export function playSuccessSound(enabled: boolean, kind: SuccessSound) {
  playNotes(enabled, successNoteSets[kind]);
}

export function playErrorSound(enabled: boolean, kind: ErrorSound) {
  playNotes(enabled, errorNoteSets[kind]);
}

/*
 * Story sound effects, synthesized with Web Audio so they need no asset downloads and work offline.
 * Kept deliberately soft: they colour a scene for learners, they should never startle.
 */
export type SoundEffect = 'purr' | 'meow' | 'glass' | 'brakes' | 'doorbell' | 'knock' | 'rain' | 'bark' | 'tweet' | 'moo' | 'neigh' | 'trumpet' | 'hiss' | 'hum' | 'airplane' | 'waves' | 'gong' | 'fuse';

let effectContext: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const legacyWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextClass = window.AudioContext ?? legacyWindow.webkitAudioContext;
  if (!AudioContextClass) return null;
  effectContext ??= new AudioContextClass();
  if (effectContext.state === 'suspended') void effectContext.resume();
  return effectContext;
}

function noise(context: AudioContext, seconds: number): AudioBufferSourceNode {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  return source;
}

function filter(context: AudioContext, type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode {
  const node = context.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  return node;
}

// A purr: low rumbling noise pulsing ~25 times a second, with a soft breath in the middle.
function purr(context: AudioContext, start: number) {
  const length = 2.4;
  const source = noise(context, length);
  const pulse = context.createGain();
  pulse.gain.value = 0.55;
  const lfo = context.createOscillator();
  lfo.frequency.value = 25;
  const depth = context.createGain();
  depth.gain.value = 0.45;
  lfo.connect(depth).connect(pulse.gain);
  const envelope = context.createGain();
  const peak = 0.55;
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.linearRampToValueAtTime(peak, start + 0.35);
  envelope.gain.linearRampToValueAtTime(peak * 0.8, start + 1.05);
  envelope.gain.linearRampToValueAtTime(peak * 0.35, start + 1.2);
  envelope.gain.linearRampToValueAtTime(peak, start + 1.45);
  envelope.gain.linearRampToValueAtTime(0.0001, start + length);
  source.connect(filter(context, 'lowpass', 170, 1.2)).connect(pulse).connect(envelope).connect(context.destination);
  source.start(start);
  lfo.start(start);
  source.stop(start + length);
  lfo.stop(start + length);
}

// Animal voices are shaped like speech: a buzzing voice (two slightly detuned sawtooths with
// vibrato) plus breath noise, sent through three formant filters whose frequencies glide from vowel
// to vowel, then through a "mouth" lowpass that opens and closes. Every call varies a little, so
// repeated meows and barks never sound copy-pasted.
type Keyframes = [seconds: number, value: number][];
type VoiceShape = { length: number; pitch: Keyframes; formants: [Keyframes, Keyframes, Keyframes]; mouth: Keyframes; loudness: Keyframes; breath: number; vibrato?: number; growl?: number };

function glide(param: AudioParam, start: number, frames: Keyframes, scale = 1) {
  param.setValueAtTime(frames[0][1] * scale, start + frames[0][0]);
  for (const [at, value] of frames.slice(1)) param.linearRampToValueAtTime(value * scale, start + at);
}

function vary(amount: number) {
  return 1 + (Math.random() * 2 - 1) * amount;
}

function animalVoice(context: AudioContext, start: number, shape: VoiceShape) {
  const end = start + shape.length;
  const pitchScale = vary(0.08);
  const formantScale = vary(0.05);
  const source = context.createGain();
  source.gain.value = 0.5;
  for (const detune of [-7, 6]) {
    const oscillator = context.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.detune.value = detune;
    glide(oscillator.frequency, start, shape.pitch, pitchScale);
    if (shape.vibrato) {
      const lfo = context.createOscillator();
      lfo.frequency.value = 5.5 * vary(0.15);
      const depth = context.createGain();
      depth.gain.value = shape.vibrato;
      lfo.connect(depth).connect(oscillator.frequency);
      lfo.start(start);
      lfo.stop(end);
    }
    oscillator.connect(source);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }
  // A growl is the voice fluttering roughly 70 times a second, as in a dog's throat.
  let voiced: AudioNode = source;
  if (shape.growl) {
    const flutter = context.createGain();
    flutter.gain.value = 1 - shape.growl / 2;
    const lfo = context.createOscillator();
    lfo.frequency.value = 70 * vary(0.2);
    const depth = context.createGain();
    depth.gain.value = shape.growl / 2;
    lfo.connect(depth).connect(flutter.gain);
    lfo.start(start);
    lfo.stop(end);
    source.connect(flutter);
    voiced = flutter;
  }
  const breath = noise(context, shape.length + 0.05);
  const breathGain = context.createGain();
  breathGain.gain.value = shape.breath;
  breath.connect(breathGain);
  breath.start(start);

  const mouth = filter(context, 'lowpass', 1000, 0.9);
  glide(mouth.frequency, start, shape.mouth, formantScale);
  const loudness = context.createGain();
  glide(loudness.gain, start, shape.loudness);
  mouth.connect(loudness).connect(context.destination);
  shape.formants.forEach((frames, index) => {
    const formant = filter(context, 'bandpass', 1000, [5, 7, 9][index]);
    glide(formant.frequency, start, frames, formantScale);
    const weight = context.createGain();
    weight.gain.value = [1, 0.7, 0.35][index];
    voiced.connect(formant);
    breathGain.connect(formant);
    formant.connect(weight).connect(mouth);
  });
}

// "Mi-a-u": the mouth opens from a hum to a bright "i", widens to "a" as the pitch peaks, then
// closes to "u" while the pitch falls away.
function meow(context: AudioContext, start: number) {
  const length = 0.72 * vary(0.12);
  const at = (share: number) => share * length;
  animalVoice(context, start, {
    length,
    pitch: [[0, 470], [at(0.25), 760], [at(0.5), 720], [at(1), 400]],
    formants: [
      [[0, 450], [at(0.2), 600], [at(0.45), 1000], [at(0.8), 650], [at(1), 450]],
      [[0, 1700], [at(0.2), 2300], [at(0.45), 1600], [at(0.8), 1050], [at(1), 850]],
      [[0, 2900], [at(0.45), 3100], [at(1), 2600]]
    ],
    mouth: [[0, 650], [at(0.15), 3800], [at(0.6), 3400], [at(1), 900]],
    loudness: [[0, 0.0001], [at(0.08), 0.2], [at(0.45), 0.25], [at(0.85), 0.15], [at(1), 0.0001]],
    breath: 0.12,
    vibrato: 9
  });
}

// Shattering glass: a bright crash of filtered noise followed by scattered high tinkles.
function glass(context: AudioContext, start: number) {
  const crash = noise(context, 0.5);
  const crashGain = context.createGain();
  crashGain.gain.setValueAtTime(0.22, start);
  crashGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
  crash.connect(filter(context, 'highpass', 2800)).connect(crashGain).connect(context.destination);
  crash.start(start);
  for (let index = 0; index < 16; index += 1) {
    const at = start + 0.02 + Math.pow(Math.random(), 1.6) * 0.75;
    const tinkle = context.createOscillator();
    tinkle.type = 'sine';
    tinkle.frequency.value = 2600 + Math.random() * 4200;
    const gain = context.createGain();
    const decay = 0.06 + Math.random() * 0.22;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.035 + Math.random() * 0.03, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    tinkle.connect(gain).connect(context.destination);
    tinkle.start(at);
    tinkle.stop(at + decay + 0.02);
  }
}

// A car braking hard: a wavering tyre squeal gliding down, over a band of road noise.
function brakes(context: AudioContext, start: number) {
  const length = 1.4;
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(1, start + 0.08);
  envelope.gain.setValueAtTime(1, start + length - 0.3);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
  envelope.connect(context.destination);
  const squeal = context.createGain();
  squeal.gain.value = 0.035;
  const band = filter(context, 'bandpass', 1900, 6);
  band.connect(squeal).connect(envelope);
  const vibrato = context.createOscillator();
  vibrato.frequency.value = 9;
  const vibratoDepth = context.createGain();
  vibratoDepth.gain.value = 45;
  vibrato.connect(vibratoDepth);
  for (const detune of [0, 23]) {
    const tyre = context.createOscillator();
    tyre.type = 'sawtooth';
    tyre.frequency.setValueAtTime(2000 + detune, start);
    tyre.frequency.linearRampToValueAtTime(1550 + detune, start + length);
    vibratoDepth.connect(tyre.frequency);
    tyre.connect(band);
    tyre.start(start);
    tyre.stop(start + length);
  }
  vibrato.start(start);
  vibrato.stop(start + length);
  const road = noise(context, length);
  const roadGain = context.createGain();
  roadGain.gain.value = 0.12;
  road.connect(filter(context, 'bandpass', 900, 1.5)).connect(roadGain).connect(envelope);
  road.start(start);
}

function bell(context: AudioContext, at: number, frequency: number) {
  for (const [ratio, level] of [[1, 0.12], [2.76, 0.03], [5.4, 0.012]] as const) {
    const tone = context.createOscillator();
    tone.frequency.value = frequency * ratio;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.3);
    tone.connect(gain).connect(context.destination);
    tone.start(at);
    tone.stop(at + 1.35);
  }
}

function knock(context: AudioContext, start: number) {
  [0, 0.22, 0.44].forEach((offset) => {
    const at = start + offset;
    const thump = context.createOscillator();
    thump.frequency.setValueAtTime(170, at);
    thump.frequency.exponentialRampToValueAtTime(90, at + 0.09);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.3, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
    thump.connect(gain).connect(context.destination);
    thump.start(at);
    thump.stop(at + 0.14);
  });
}

function rain(context: AudioContext, start: number) {
  const length = 3.6;
  const source = noise(context, length);
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(0.05, start + 0.9);
  gain.gain.setValueAtTime(0.05, start + length - 1.1);
  gain.gain.linearRampToValueAtTime(0.0001, start + length);
  source.connect(filter(context, 'highpass', 700)).connect(filter(context, 'lowpass', 5200)).connect(gain).connect(context.destination);
  source.start(start);
}

// A friendly "woof woof": each bark bursts out of an open "wo" with a rough, growly throat, the
// pitch jumping up and dropping away, plus a soft chest thump underneath. The second bark comes a
// little early or late and sounds slightly different, like a real dog.
function bark(context: AudioContext, start: number) {
  [0, 0.3 * vary(0.15)].forEach((offset, index) => {
    const at = start + offset;
    const length = (index ? 0.21 : 0.18) * vary(0.1);
    const time = (share: number) => share * length;
    animalVoice(context, at, {
      length,
      pitch: [[0, 300], [time(0.15), 470], [time(0.5), 360], [time(1), 210]],
      formants: [
        [[0, 450], [time(0.2), 750], [time(1), 480]],
        [[0, 900], [time(0.2), 1250], [time(1), 850]],
        [[0, 2400], [time(1), 2200]]
      ],
      mouth: [[0, 1200], [time(0.15), 3600], [time(1), 900]],
      loudness: [[0, 0.0001], [time(0.06), 0.45], [time(0.4), 0.3], [time(1), 0.0001]],
      breath: 0.35,
      growl: 0.7
    });
    const thump = context.createOscillator();
    thump.frequency.setValueAtTime(140, at);
    thump.frequency.exponentialRampToValueAtTime(70, at + 0.09);
    const thumpGain = context.createGain();
    thumpGain.gain.setValueAtTime(0.0001, at);
    thumpGain.gain.exponentialRampToValueAtTime(0.15, at + 0.01);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
    thump.connect(thumpGain).connect(context.destination);
    thump.start(at);
    thump.stop(at + 0.12);
  });
}

// The station gong before an announcement: three soft bell tones stepping down.
function gong(context: AudioContext, start: number) {
  [659.25, 523.25, 392].forEach((frequency, index) => bell(context, start + index * 0.42, frequency));
}

// A fuse tripping: a sharp electric snap, a short fizzing crackle, and the mains hum of the house
// sinking away as the power dies.
function fuse(context: AudioContext, start: number) {
  const snap = noise(context, 0.08);
  const snapGain = context.createGain();
  glide(snapGain.gain, start, [[0, 0.0001], [0.004, 0.55], [0.07, 0.0001]]);
  snap.connect(filter(context, 'highpass', 2200)).connect(snapGain).connect(context.destination);
  snap.start(start);
  const fizz = noise(context, 0.45);
  const fizzShape = filter(context, 'bandpass', 3200, 4);
  glide(fizzShape.frequency, start + 0.05, [[0, 3200], [0.4, 1700]]);
  const fizzGain = context.createGain();
  glide(fizzGain.gain, start + 0.05, [[0, 0.0001], [0.03, 0.14], [0.12, 0.05], [0.18, 0.11], [0.4, 0.0001]]);
  fizz.connect(fizzShape).connect(fizzGain).connect(context.destination);
  fizz.start(start + 0.05);
  const hum = context.createOscillator();
  hum.type = 'sawtooth';
  glide(hum.frequency, start, [[0, 100], [1.1, 38]]);
  const humGain = context.createGain();
  glide(humGain.gain, start, [[0, 0.05], [1.1, 0.0001]]);
  hum.connect(filter(context, 'lowpass', 420)).connect(humGain).connect(context.destination);
  hum.start(start);
  hum.stop(start + 1.15);
}

const effects: Record<SoundEffect, (context: AudioContext, start: number) => void> = {
  purr,
  meow,
  glass,
  brakes,
  doorbell: (context, start) => { bell(context, start, 659.25); bell(context, start + 0.45, 523.25); },
  knock,
  rain,
  bark,
  gong,
  fuse
};

// Roughly how long each effect stands out, so story speech can pause while one plays.
export const soundEffectSeconds: Record<SoundEffect, number> = { purr: 2.2, meow: 0.8, glass: 0.8, brakes: 1.3, doorbell: 1.4, knock: 0.6, rain: 1.2, bark: 0.6, gong: 1.7, fuse: 1.2 };

export function playSoundEffect(enabled: boolean, effect: SoundEffect) {
  if (!enabled) return;
  try {
    const context = audioContext();
    if (context) effects[effect](context, context.currentTime + 0.02);
  } catch { /* Audio is optional and must never block play. */ }
}

// Cuts off every sound effect still playing, e.g. a purr when the learner leaves a story. The next
// effect starts a fresh audio context.
export function stopSoundEffects() {
  const context = effectContext;
  effectContext = null;
  if (context) void context.close().catch(() => {});
}

// The hiss and crackle of a station loudspeaker, kept up while an announcement is read out:
// band-limited static with random pops and a faint mains hum. Returns a function that fades it out.
export function startCrackle(enabled: boolean): () => void {
  if (!enabled) return () => {};
  try {
    const context = audioContext();
    if (!context) return () => {};
    const start = context.currentTime + 0.02;
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      const pop = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 6 : 0;
      data[index] = (Math.random() * 2 - 1) * 0.35 + pop;
    }
    const hiss = context.createBufferSource();
    hiss.buffer = buffer;
    hiss.loop = true;
    const hum = context.createOscillator();
    hum.frequency.value = 100;
    const humGain = context.createGain();
    humGain.gain.value = 0.12;
    const level = context.createGain();
    level.gain.setValueAtTime(0.0001, start);
    level.gain.exponentialRampToValueAtTime(0.08, start + 0.08);
    hiss.connect(filter(context, 'bandpass', 2200, 0.9)).connect(level).connect(context.destination);
    hum.connect(humGain).connect(level);
    hiss.start(start);
    hum.start(start);
    return () => {
      try {
        const end = context.currentTime;
        level.gain.cancelScheduledValues(end);
        level.gain.setValueAtTime(Math.max(level.gain.value, 0.0001), end);
        level.gain.exponentialRampToValueAtTime(0.0001, end + 0.25);
        hiss.stop(end + 0.3);
        hum.stop(end + 0.3);
      } catch { /* The context is already closed. */ }
    };
  } catch {
    return () => {};
  }
}
