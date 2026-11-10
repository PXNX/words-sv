import { describe, expect, it } from 'vitest';
import { pronounceable } from '../src/lib/story/speech';

describe('spoken forms in German listening texts', () => {
  it('says clock times and prices the way people do', () => {
    expect(pronounceable('Der Zug fährt um 14:30 Uhr.', 'de').text).toBe('Der Zug fährt um vierzehn Uhr dreißig.');
    expect(pronounceable('Um 1:00 Uhr ist es dunkel.', 'de').text).toBe('Um ein Uhr ist es dunkel.');
    expect(pronounceable('Das kostet 3,50 € und 1 €.', 'de').text).toBe('Das kostet drei Euro fünfzig und ein Euro.');
    expect(pronounceable('240.000 Leute', 'de').text).toBe('zweihundertvierzigtausend Leute');
  });

  it('maps spoken positions back to the written text for highlighting', () => {
    const { text, written } = pronounceable('Um 14:30 Uhr los.', 'de');
    expect(written(text.indexOf('los'))).toBe('Um 14:30 Uhr los.'.indexOf('los'));
  });
});
