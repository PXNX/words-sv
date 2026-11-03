/*
 * Haptic feedback, one vocabulary for the whole app: a light tick for taps, a double pulse for a
 * right answer, a firm buzz for a wrong one, a little rhythm for wins and rewards. It follows the
 * "Haptic feedback" switch in the settings (settings.vibration).
 *
 * Three ways to reach the phone's motor, best first: Telegram's own haptics inside the Mini App,
 * the Vibration API (Android and most browsers), and on iOS Safari, which has no Vibration API, a
 * hidden native switch whose toggle plays the system haptic tick (iOS 18+).
 */
import { settings } from '#lib/state/settings.svelte.js';

export type Haptic = 'tap' | 'select' | 'success' | 'error' | 'win' | 'unlock';

// Vibration API patterns in milliseconds: buzz, pause, buzz, …
export const hapticPatterns: Record<Haptic, number | number[]> = {
  tap: 8,
  select: 14,
  success: [16, 40, 22],
  error: [55, 30, 35],
  win: [24, 28, 40, 28, 70],
  unlock: [18, 30, 18, 30, 18, 60, 90]
};
// How many system ticks iOS plays for each, since its switch only has one strength.
const iosTicks: Record<Haptic, number> = { tap: 1, select: 1, success: 2, error: 2, win: 3, unlock: 4 };

type TelegramHaptics = {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
};

function telegramHaptics(): TelegramHaptics | null {
  if (typeof window === 'undefined') return null;
  return (window as { Telegram?: { WebApp?: { HapticFeedback?: TelegramHaptics } } }).Telegram?.WebApp?.HapticFeedback ?? null;
}

let iosSwitch: HTMLLabelElement | null = null;
function iosTick() {
  if (!iosSwitch) {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.append(input);
    document.body.append(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}

function isIos() {
  return typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
}

/** Plays a haptic, if the learner has haptic feedback on and the device can do it. */
export function haptic(kind: Haptic, enabled = settings.vibration) {
  if (!enabled || typeof window === 'undefined') return;
  const telegram = telegramHaptics();
  if (telegram) {
    if (kind === 'success' || kind === 'win' || kind === 'unlock') telegram.notificationOccurred('success');
    else if (kind === 'error') telegram.notificationOccurred('error');
    else if (kind === 'select') telegram.selectionChanged();
    else telegram.impactOccurred('light');
    return;
  }
  if ('vibrate' in navigator && !isIos()) {
    navigator.vibrate(hapticPatterns[kind]);
    return;
  }
  if (isIos()) {
    for (let tick = 0; tick < iosTicks[kind]; tick += 1) window.setTimeout(iosTick, tick * 90);
  }
}
