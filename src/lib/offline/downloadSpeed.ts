/*
 * The current download speed of a running download, for the loaders ("12.4 MB/s"). It looks at
 * the last few seconds only, so a connection that slows down shows it quickly, and it ignores the
 * jump when cached files arrive instantly at the start.
 */
import { formatNumber, learningContext, type FormatContext } from '#lib/format/format.js';
const WINDOW_MS = 4000;

export type SpeedMeter = {
  /** Records the bytes loaded so far; returns the current speed in bytes per second. */
  sample: (loadedBytes: number, now?: number) => number;
  reset: () => void;
};

export function createSpeedMeter(windowMs = WINDOW_MS): SpeedMeter {
  let samples: { at: number; bytes: number }[] = [];
  return {
    sample(loadedBytes, now = Date.now()) {
      // A smaller number than before means a new file started counting from zero.
      if (samples.length && loadedBytes < samples[samples.length - 1]!.bytes) samples = [];
      samples.push({ at: now, bytes: loadedBytes });
      while (samples.length > 2 && now - samples[0]!.at > windowMs) samples.shift();
      const first = samples[0]!;
      const seconds = (now - first.at) / 1000;
      return seconds >= 0.5 ? Math.max(0, (loadedBytes - first.bytes) / seconds) : 0;
    },
    reset() {
      samples = [];
    }
  };
}

/** "850 KB/s", "12.4 MB/s"; empty while nothing is measured yet. */
export function formatSpeed(bytesPerSecond: number, context: FormatContext = learningContext('en')): string {
  if (!bytesPerSecond || !Number.isFinite(bytesPerSecond)) return '';
  const format = (value: number, digits: number) => formatNumber(context, value, { maximumFractionDigits: digits });
  if (bytesPerSecond >= 1_000_000) return `${format(bytesPerSecond / 1_000_000, 1)} MB/s`;
  return `${format(bytesPerSecond / 1000, 0)} KB/s`;
}
