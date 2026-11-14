import { describe, expect, it } from 'vitest';
import { createSpeedMeter, formatSpeed } from '../src/lib/offline/downloadSpeed';

describe('download speed', () => {
  it('waits half a second before reporting a speed', () => {
    const meter = createSpeedMeter();
    expect(meter.sample(100_000, 1000)).toBe(0);
    expect(meter.sample(200_000, 1300)).toBe(0);
    expect(meter.sample(400_000, 1500)).toBeCloseTo(600_000, 0);
  });

  it('measures over the last seconds and forgets a file restart', () => {
    const meter = createSpeedMeter(4000);
    expect(meter.sample(400_000, 1000)).toBe(0);
    expect(meter.sample(800_000, 3000)).toBeCloseTo(200_000, 0);
    // A smaller count means the next file started over, so the old window is gone.
    expect(meter.sample(100_000, 4000)).toBe(0);
    expect(meter.sample(300_000, 5000)).toBeCloseTo(200_000, 0);
  });

  it('formats bytes per second as a short unit', () => {
    expect(formatSpeed(0)).toBe('');
    expect(formatSpeed(850_000)).toBe('850 KB/s');
    expect(formatSpeed(1_400_000)).toBe('1.4 MB/s');
    expect(formatSpeed(Number.NaN)).toBe('');
  });
});
