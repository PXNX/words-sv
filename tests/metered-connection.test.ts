import { describe, expect, it } from 'vitest';
import { meteredReason } from '../src/lib/offline/meteredConnection';

describe('metered connection', () => {
  it('warns on mobile data, data saver and slow unknown links', () => {
    expect(meteredReason({ type: 'cellular' })).toBe('cellular');
    expect(meteredReason({ type: 'wifi', saveData: true })).toBe('save-data');
    expect(meteredReason({ effectiveType: '3g' })).toBe('slow');
  });

  it('stays quiet on Wi-Fi and when the browser cannot tell', () => {
    expect(meteredReason({ type: 'wifi', effectiveType: '4g' })).toBeNull();
    expect(meteredReason({ type: 'wifi', effectiveType: '3g' })).toBeNull();
    expect(meteredReason(null)).toBeNull();
  });
});
