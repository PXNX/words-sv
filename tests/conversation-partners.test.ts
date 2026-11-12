import { describe, expect, it } from 'vitest';
import { backgrounds, pickPartner } from '../src/lib/conversation/partners.js';
import { storiesFor } from '../src/lib/story/stories.js';

describe('conversation partners', () => {
  it('picks a cast member with a background from a story of the level, never the previous one', () => {
    const partner = pickPartner(storiesFor('en', 'a1', true), 'en', 'Felix', null, () => 0);
    expect(partner).not.toBeNull();
    expect(backgrounds[partner!.id]).toBeTruthy();
    expect(partner!.memory.length).toBeGreaterThan(0);
    expect(partner!.memory.join(' ')).not.toMatch(/[{}]/);
    const next = pickPartner(storiesFor('en', 'a1', true), 'en', 'Felix', partner!.id, () => 0);
    expect(next?.id).not.toBe(partner!.id);
  });

  it('keeps the German-only cast out of other languages', () => {
    for (let index = 0; index < 20; index += 1) {
      const partner = pickPartner(storiesFor('en', 'b1', true), 'en', '', null, () => index / 20);
      expect(['ludwig', 'ali', 'robert', 'fritz', 'tobias', 'selma', 'simon', 'banker', 'wirt']).not.toContain(partner?.id);
    }
  });
});
