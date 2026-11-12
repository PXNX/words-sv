import { describe, expect, it } from 'vitest';
import { germanStories } from '../src/lib/story/germanStories.js';

describe('german stories', () => {
  it('gives every story a real title instead of a placeholder like "Extra A2 1"', () => {
    const placeholders = germanStories.filter((story) => /^Extra /.test(story.title.de)).map((story) => story.id);
    expect(placeholders).toEqual([]);
  });

  it('keeps the correct answer (the first option) apart from the wrong ones', () => {
    const clashes = germanStories.flatMap((story) =>
      story.beats.flatMap((beat, index) => {
        if (beat.kind !== 'question' && beat.kind !== 'reply') return [];
        const [correct, ...wrong] = beat.options.map((option) => option.de.trim());
        return wrong.includes(correct ?? '') ? [`${story.id} #${index}: ${correct}`] : [];
      })
    );
    expect(clashes).toEqual([]);
  });

  it('addresses every reply to the character who spoke just before it', () => {
    const misaddressed = germanStories.flatMap((story) => {
      let lastSpeaker: string | null = null;
      return story.beats.flatMap((beat, index) => {
        if (beat.kind === 'line') lastSpeaker = beat.speaker;
        return beat.kind === 'reply' && beat.to !== lastSpeaker ? [`${story.id} #${index}: to ${beat.to}, last spoke ${lastSpeaker}`] : [];
      });
    });
    expect(misaddressed).toEqual([]);
  });

  it('tells a story instead of stringing level words together', () => {
    // The old filler stories had six or nine beats and sentences like "Ich habe einen Absatz und einen
    // Ausdruck." – nothing but two nouns from the word list.
    const wordList = /\b(?:habe|haben|sehe|sehen|über) (?:einen|eine|ein) \p{Lu}\p{L}* und (?:einen|eine|ein) \p{Lu}\p{L}*\.$/u;
    const fillers = germanStories.flatMap((story) => {
      if (story.beats.length < 10) return [`${story.id}: only ${story.beats.length} beats`];
      return story.beats.flatMap((beat, index) =>
        (beat.kind === 'line' || beat.kind === 'narration') && beat.text.de.split(/(?<=[.!?])\s+/).some((sentence) => wordList.test(sentence))
          ? [`${story.id} #${index}: ${beat.text.de}`]
          : []
      );
    });
    expect(fillers).toEqual([]);
  });

  it('only lets the story’s cast speak and be replied to', () => {
    const strangers = germanStories.flatMap((story) =>
      story.beats.flatMap((beat, index) => {
        const who = beat.kind === 'line' ? beat.speaker : beat.kind === 'reply' ? beat.to : null;
        return who && !story.cast.includes(who) ? [`${story.id} #${index}: ${who}`] : [];
      })
    );
    expect(strangers).toEqual([]);
  });

  it('has no two stories with the same title or the same text', () => {
    const titles = new Map<string, string>();
    const bodies = new Map<string, string>();
    for (const story of germanStories) {
      expect(titles.get(story.title.de), `${story.id} repeats the title of ${titles.get(story.title.de)}`).toBeUndefined();
      titles.set(story.title.de, story.id);
      const body = story.beats.map((beat) => (beat.kind === 'line' || beat.kind === 'narration' ? beat.text.de : '')).join(' ').slice(0, 160);
      expect(bodies.get(body), `${story.id} starts like ${bodies.get(body)}`).toBeUndefined();
      bodies.set(body, story.id);
    }
  });

  // An id is the key under which progress and generated audio are stored, so it never changes once
  // released. These three were written in Bavarian dialect and later moved up a level; their ids stay.
  const LEGACY_IDS: Record<string, string> = { 'a2-butcher': 'b1', 'a2-alps': 'b1', 'a2-munich': 'b1' };
  it('names every story after its level', () => {
    for (const story of germanStories) {
      const prefix = /^([abc][12])-/u.exec(story.id)?.[1];
      if (!prefix) continue;
      expect(LEGACY_IDS[story.id] ?? prefix, story.id).toBe(story.level);
    }
  });
});
