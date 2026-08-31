export type SuccessSound = 'circle' | 'wordle' | 'vocab' | 'grammar';
export type ErrorSound = 'vocab' | 'grammar';

const successNoteSets: Record<SuccessSound, number[]> = {
  circle: [523.25, 659.25, 783.99],
  wordle: [440, 659.25],
  vocab: [587.33, 783.99],
  grammar: [659.25, 830.61]
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
