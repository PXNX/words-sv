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
export type SoundEffect = 'purr' | 'meow' | 'glass' | 'brakes' | 'doorbell' | 'knock' | 'rain';

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

function meow(context: AudioContext, start: number) {
  const oscillator = context.createOscillator();
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(480, start);
  oscillator.frequency.linearRampToValueAtTime(720, start + 0.16);
  oscillator.frequency.exponentialRampToValueAtTime(380, start + 0.62);
  const formant = filter(context, 'bandpass', 900, 3);
  formant.frequency.setValueAtTime(800, start);
  formant.frequency.linearRampToValueAtTime(1500, start + 0.2);
  formant.frequency.linearRampToValueAtTime(950, start + 0.62);
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.16, start + 0.06);
  gain.gain.setValueAtTime(0.16, start + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.68);
  oscillator.connect(formant).connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.7);
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

const effects: Record<SoundEffect, (context: AudioContext, start: number) => void> = {
  purr,
  meow,
  glass,
  brakes,
  doorbell: (context, start) => { bell(context, start, 659.25); bell(context, start + 0.45, 523.25); },
  knock,
  rain
};

export function playSoundEffect(enabled: boolean, effect: SoundEffect) {
  if (!enabled) return;
  try {
    const context = audioContext();
    if (context) effects[effect](context, context.currentTime + 0.02);
  } catch { /* Audio is optional and must never block play. */ }
}
